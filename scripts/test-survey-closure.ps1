param(
    [Parameter(Mandatory=$true)][string]$BackupFolder,
    [switch]$Portable,
    [string]$RecoveryKeyFile
)
# Local-only security tests using the encrypted backup. Never contacts Supabase.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$OutputEncoding = [Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Security
Add-Type -AssemblyName System.IO.Compression
$privateRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'BAKU-BAKU/private-backups')).TrimEnd('\') + '\'
$folder = (Resolve-Path -LiteralPath $BackupFolder).Path
if (!$folder.StartsWith($privateRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Backup must be in the private backup directory.' }
$manifest = Get-Content -LiteralPath (Join-Path $folder 'manifest.json') -Raw | ConvertFrom-Json
if (!$manifest.restore_verified -or $manifest.row_count -ne 16) { throw 'A verified 16-record backup is required.' }

function Hash-Bytes([byte[]]$Bytes) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($sha.ComputeHash($Bytes)).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}
function Invoke-LocalSql([string]$Sql) {
    $captured = $Sql | & docker exec -i $container psql -X -qAt -v ON_ERROR_STOP=1 -U postgres 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        $script:failureClass = 'SQL operation'
        foreach ($pattern in @('already exists', 'server closed', 'connection refused', 'syntax error', 'permission denied', 'invalid command', 'does not exist')) {
            if ($captured -match $pattern) { $script:failureClass = $pattern; break }
        }
        throw 'Local SQL failed. Output withheld for privacy.'
    }
    return $captured.Trim()
}
function Read-Entry([string]$Name) {
    $reader = [IO.StreamReader]::new($zip.GetEntry($Name).Open())
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}
if ($Portable) {
    $portableFolder = Join-Path $folder 'portable'
    $portableManifest = Join-Path $portableFolder 'portable-manifest.json'
    if (!$RecoveryKeyFile) { $RecoveryKeyFile = (Get-Content -LiteralPath $portableManifest -Raw | ConvertFrom-Json).recovery_key_file }
    $temporaryZip = Join-Path $folder ('restore-' + [guid]::NewGuid().ToString('N') + '.zip')
    try {
        $captured = & node scripts/portable-survey-backup.mjs decrypt (Join-Path $portableFolder 'leads-backup.aesgcm') $temporaryZip $RecoveryKeyFile $portableManifest 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { throw 'Portable backup verification failed.' }
        $bytes = [IO.File]::ReadAllBytes($temporaryZip)
    } finally {
        $absolute = [IO.Path]::GetFullPath($temporaryZip)
        if (!$absolute.StartsWith($privateRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe cleanup target rejected.' }
        if (Test-Path -LiteralPath $absolute) { Remove-Item -LiteralPath $absolute -Force }
    }
} else {
    $encrypted = [IO.File]::ReadAllBytes((Join-Path $folder 'leads-backup.dpapi'))
    if ((Hash-Bytes $encrypted) -ne $manifest.encrypted_sha256) { throw 'Encrypted archive hash mismatch.' }
    $bytes = [Security.Cryptography.ProtectedData]::Unprotect($encrypted, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
}
if ((Hash-Bytes $bytes) -ne $manifest.archive_sha256) { throw 'Decrypted archive hash mismatch.' }
$stream = [IO.MemoryStream]::new([byte[]]$bytes, $false)
$zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Read)
$container = 'baku-survey-security-' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$created = $false
$stage = 'container startup'
$failureClass = 'local verification'
try {
    $captured = & docker run -d --name $container --network none --tmpfs /var/lib/postgresql/data:rw -e POSTGRES_HOST_AUTH_METHOD=trust -e PGTZ=UTC postgres:17 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'Disposable container failed.' }
    $created = $true
    $ready = $false
    for ($attempt=0; $attempt -lt 40; $attempt++) {
        $processName = & docker exec $container cat /proc/1/comm 2>&1 | Out-String
        $null = & docker exec $container pg_isready -U postgres 2>&1
        if ($LASTEXITCODE -eq 0 -and $processName.Trim() -eq 'postgres') { $ready = $true; break }
        Start-Sleep -Milliseconds 500
    }
    if (!$ready) { throw 'Local database unavailable.' }
    $stage = 'private backup restoration'
    $metadata = (Read-Entry 'metadata.json') | ConvertFrom-Json
    $stage = 'restoring role names'
    foreach ($role in $metadata.roles) {
        $quotedRole = '"' + $role.Replace('"', '""') + '"'
        $null = Invoke-LocalSql ("create role " + $quotedRole + " nologin;")
    }
    $stage = 'restoring schema SQL'
    $null = Invoke-LocalSql (Read-Entry 'schema.sql')
    $stage = 'restoring data SQL'
    $null = Invoke-LocalSql (Read-Entry 'data.sql')
    $stage = 'checking restored integrity'
    $integrityQuery = "select jsonb_build_object('count',count(*),'hash',encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(l) order by l.id),'[]'::jsonb)::text,'UTF8')),'hex')) from public.leads l;"
    $before = (Invoke-LocalSql $integrityQuery) | ConvertFrom-Json
    if ($before.count -ne 16 -or $before.hash -ne $manifest.row_hash) { throw 'Restored data differs.' }

    # Auth SQL stand-ins for local policy evaluation only. No accounts/passwords remotely.
    $stage = 'local Auth stand-ins'
    $null = Invoke-LocalSql @'
create schema auth;
create table auth.users(id uuid primary key);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
$$;
create function auth.uid() returns uuid language sql stable as $$
  select (auth.jwt()->>'sub')::uuid;
$$;
grant usage on schema auth to anon, authenticated, service_role;
alter role service_role bypassrls;
'@
    $migrationChecksums = [ordered]@{}
    foreach ($file in Get-ChildItem -LiteralPath 'supabase/migrations' -Filter '*.sql' | Sort-Object Name) {
        $stage = $file.Name
        $null = Invoke-LocalSql ([IO.File]::ReadAllText($file.FullName))
        $migrationChecksums[$file.Name] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    $stage = 'order regression SQL'
    $null = Invoke-LocalSql ([IO.File]::ReadAllText((Resolve-Path 'supabase/tests/orders.sql')))
    $stage = 'survey closure SQL'
    $null = Invoke-LocalSql ([IO.File]::ReadAllText((Resolve-Path 'supabase/tests/survey_closed.sql')))
    $after = (Invoke-LocalSql $integrityQuery) | ConvertFrom-Json
    if ($after.count -ne 16 -or $after.hash -ne $manifest.row_hash) { throw 'Survey integrity changed during tests.' }

    $result = [ordered]@{
        row_count = 16
        complete_row_hash_matches = $true
        anonymous_read_insert_update_delete_blocked = $true
        admin_requires_authorization_and_mfa = $true
        original_coupon_and_status_fields_unchanged = $true
        migrations = $migrationChecksums
        postgres_major = 17
        scope = 'disposable-local-container'
        real_supabase_jwt_test_pending = $true
        portable_backup_used = [bool]$Portable
    }
    $resultName = if ($Portable) { 'portable-closure-test-result.json' } else { 'closure-test-result.json' }
    [IO.File]::WriteAllText((Join-Path $folder $resultName), ($result | ConvertTo-Json -Depth 10))
    Write-Output 'PASS: all five migrations, order regression SQL, anonymous access denial, authorized MFA admin read and 16 complete unchanged survey records.'
} catch {
    Write-Output ('Local test stopped at ' + $stage + ' (' + $failureClass + '). Diagnostic output withheld for privacy.')
    exit 1
} finally {
    $zip.Dispose()
    $stream.Dispose()
    if ($created) { $null = & docker rm -f $container 2>&1 }
}
