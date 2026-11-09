# Creates an encrypted, private backup and restores it only into a disposable local container.
# No application data or policies are changed remotely. Never print captured CLI output.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$OutputEncoding = [Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Security
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Invoke-Checked([string]$Program, [string[]]$Arguments, [string]$Stage) {
    $captured = & $Program @Arguments 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw "$Stage failed (exit $LASTEXITCODE). Output withheld for privacy." }
    return $captured
}
function Read-CliJson([string]$Sql) {
    $captured = Invoke-Checked 'npx' @('--offline', '--yes', 'supabase@2', 'db', 'query', '--linked', '--output', 'json', $Sql) 'Read-only metadata query'
    $start = $captured.IndexOf('{')
    $end = $captured.LastIndexOf('}')
    if ($start -lt 0 -or $end -lt $start) { throw 'Metadata response could not be parsed.' }
    return ($captured.Substring($start, $end - $start + 1) | ConvertFrom-Json).rows[0].audit
}
function Hash-Bytes([byte[]]$Bytes) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($sha.ComputeHash($Bytes)).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}
function Invoke-LocalSql([string]$Sql, [string]$Container) {
    $captured = $Sql | & docker exec -i $Container psql -X -qAt -v ON_ERROR_STOP=1 -U postgres 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'Local restore/query failed. Output withheld for privacy.' }
    return $captured.Trim()
}

# Every SELECT below reads only counts, hashes and metadata.
$auditSql = "select jsonb_build_object('row_count',(select count(*) from public.leads),'row_hash',(select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(l) order by l.id),'[]'::jsonb)::text,'UTF8')),'hex') from public.leads l),'public_table_count',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')),'rls',(select relrowsecurity from pg_class where oid='public.leads'::regclass),'policies',(select coalesce(jsonb_agg(jsonb_build_object('name',polname,'cmd',polcmd,'permissive',polpermissive,'roles',(select jsonb_agg(case when r=0 then 'public' else r::regrole::text end order by r::regrole::text) from unnest(polroles) r),'using',pg_get_expr(polqual,polrelid),'check',pg_get_expr(polwithcheck,polrelid)) order by polname),'[]'::jsonb) from pg_policy where polrelid='public.leads'::regclass),'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid='public.leads'::regclass and a.attnum>0 and not a.attisdropped),'constraints',(select jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid)) order by conname) from pg_constraint where conrelid='public.leads'::regclass),'indexes',(select jsonb_agg(pg_get_indexdef(indexrelid) order by indexrelid::regclass::text) from pg_index where indrelid='public.leads'::regclass),'grants',(select jsonb_agg(jsonb_build_object('role',case when x.grantee=0 then 'public' else x.grantee::regrole::text end,'privilege',x.privilege_type,'grantable',x.is_grantable) order by x.grantee::regrole::text,x.privilege_type) from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x where c.oid='public.leads'::regclass),'roles',(select jsonb_agg(rolname order by rolname) from pg_roles where rolname !~ '^pg_' and rolname<>'postgres')) as audit;"
$auditSql = "select audit || jsonb_build_object('metadata_hash',encode(sha256(convert_to((audit - 'roles' - 'row_hash' - 'row_count' - 'public_table_count')::text,'UTF8')),'hex')) as audit from (" + $auditSql.TrimEnd(';') + ') snapshot;'
$source = Read-CliJson $auditSql
if ($source.row_count -ne 16) { throw "Expected 16 survey rows; found $($source.row_count). Review before proceeding." }
if ($source.public_table_count -ne 1) { throw 'Unexpected additional public tables. Review backup scope before proceeding.' }

$privateRoot = Join-Path $env:LOCALAPPDATA 'BAKU-BAKU\private-backups'
$folder = Join-Path $privateRoot ('survey-20261106-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$folder = (Resolve-Path -LiteralPath $folder).Path
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true, $false)
$userSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl.SetOwner($userSid)
foreach ($sid in @($userSid, (New-Object Security.Principal.SecurityIdentifier('S-1-5-18')))) {
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $folder -AclObject $acl
$schemaPath = Join-Path $folder 'schema.sql'
$dataPath = Join-Path $folder 'data.sql'
$encryptedPath = Join-Path $folder 'leads-backup.dpapi'
$manifestPath = Join-Path $folder 'manifest.json'
$container = 'baku-survey-restore-' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$encryptedVerified = $false
$containerCreated = $false
try {
    Write-Output 'Stage: private backup export.'
    $null = Invoke-Checked 'npx' @('--offline', '--yes', 'supabase@2', 'db', 'dump', '--linked', '--schema', 'public', '--file', $schemaPath) 'Schema export'
    $null = Invoke-Checked 'npx' @('--offline', '--yes', 'supabase@2', 'db', 'dump', '--linked', '--schema', 'public', '--data-only', '--use-copy', '--file', $dataPath) 'Data export'
    $after = Read-CliJson $auditSql
    if ($source.row_count -ne $after.row_count -or $source.row_hash -ne $after.row_hash) { throw 'Remote survey changed during backup. Review before proceeding.' }

    $metadata = [Text.Encoding]::UTF8.GetBytes(($source | ConvertTo-Json -Depth 15))
    $stream = New-Object IO.MemoryStream
    $zip = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Create, $true)
    try {
        foreach ($name in @('schema.sql', 'data.sql', 'metadata.json')) {
            $entry = $zip.CreateEntry($name)
            $entryStream = $entry.Open()
            try {
                if ($name -eq 'metadata.json') { $bytes = $metadata }
                else { $bytes = [IO.File]::ReadAllBytes((Join-Path $folder $name)) }
                $entryStream.Write($bytes, 0, $bytes.Length)
            } finally { $entryStream.Dispose() }
        }
    } finally { $zip.Dispose() }
    $archiveBytes = $stream.ToArray()
    $stream.Dispose()
    $encrypted = [Security.Cryptography.ProtectedData]::Protect($archiveBytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
    [IO.File]::WriteAllBytes($encryptedPath, $encrypted)
    $decrypted = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($encryptedPath), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
    if ((Hash-Bytes $archiveBytes) -ne (Hash-Bytes $decrypted)) { throw 'Encrypted backup verification failed.' }
    $encryptedVerified = $true
    $manifest = [ordered]@{
        format = 'zip-protected-with-windows-dpapi-currentuser'
        row_count = $source.row_count
        row_hash = $source.row_hash
        metadata_hash = $source.metadata_hash
        archive_sha256 = (Hash-Bytes $archiveBytes)
        encrypted_sha256 = (Hash-Bytes $encrypted)
        restore_verified = $false
        private_path = $folder
        requires_original_windows_profile = $true
    }
    [IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 10))
    Write-Output 'Stage: encrypted archive verified; preparing disposable local restore.'

    # PostgreSQL 17 matches the remote major version. No ports or persistent data volumes.
    $null = Invoke-Checked 'docker' @('pull', 'postgres:17') 'PostgreSQL restore image'
    $null = Invoke-Checked 'docker' @('run', '-d', '--name', $container, '--network', 'none', '--tmpfs', '/var/lib/postgresql/data:rw', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'PGTZ=UTC', 'postgres:17') 'Disposable restore container'
    $containerCreated = $true
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        $processName = & docker exec $container cat /proc/1/comm 2>&1 | Out-String
        $null = & docker exec $container pg_isready -U postgres 2>&1
        if ($LASTEXITCODE -eq 0 -and $processName.Trim() -eq 'postgres') { $ready = $true; break }
        Start-Sleep -Milliseconds 500
    }
    if (!$ready) { throw 'Local restore database did not become ready.' }

    foreach ($role in $source.roles) {
        $quotedRole = '"' + $role.Replace('"', '""') + '"'
        $null = Invoke-LocalSql ("create role " + $quotedRole + " nologin;") $container
    }
    $archiveStream = New-Object IO.MemoryStream(,$decrypted)
    $restoredZip = New-Object IO.Compression.ZipArchive($archiveStream, [IO.Compression.ZipArchiveMode]::Read)
    try {
        foreach ($name in @('schema.sql', 'data.sql')) {
            $reader = New-Object IO.StreamReader($restoredZip.GetEntry($name).Open())
            try { $sql = $reader.ReadToEnd() } finally { $reader.Dispose() }
            $null = Invoke-LocalSql $sql $container
        }
    } finally { $restoredZip.Dispose(); $archiveStream.Dispose() }
    $local = (Invoke-LocalSql $auditSql $container) | ConvertFrom-Json
    if ($local.row_count -ne 16 -or $local.row_hash -ne $source.row_hash) { throw 'Restored data does not match source.' }
    if ($local.metadata_hash -ne $source.metadata_hash) { throw 'Restored schema, RLS or permissions differ from source.' }
    $manifest.restore_verified = $true
    [IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 10))
    Write-Output 'PASS: 16 records, all row fields, encrypted archive, local PostgreSQL restore and original RLS/policies verified.'
    Write-Output ('PrivateBackupFolder=' + $folder)
} catch {
    Write-Output 'Backup operation stopped; diagnostic output withheld for privacy.'
    if ($encryptedVerified) { Write-Output ('EncryptedBackupFolder=' + $folder) }
    exit 1
} finally {
    if ($containerCreated) {
        $null = & docker rm -f $container 2>&1
    }
    if ($encryptedVerified) {
        # Delete only known plaintext intermediates inside the verified private backup folder.
        $resolvedRoot = [IO.Path]::GetFullPath($privateRoot).TrimEnd('\') + '\'
        foreach ($file in @($schemaPath, $dataPath)) {
            $absolute = [IO.Path]::GetFullPath($file)
            if (!$absolute.StartsWith($resolvedRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe cleanup target rejected.' }
            if (Test-Path -LiteralPath $absolute) { Remove-Item -LiteralPath $absolute -Force }
        }
    }
}
