// Portable AES-256-GCM backup tooling. Never logs key material, archives or SQL.
import { readFile, writeFile, access, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

const magic = Buffer.from('BAKU-SURVEY-AESGCM-V1\n', 'ascii');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function privateDestination(file) {
  let folder = path.dirname(path.resolve(file));
  if (!(await stat(folder)).isDirectory()) throw Error('private_directory_required');
  for (;;) {
    try { await access(path.join(folder, '.git')); throw Error('repository_destination_forbidden'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = path.dirname(folder);
    if (parent === folder) break;
    folder = parent;
  }
}

async function decrypt(archivePath, keyPath, manifestPath) {
  const [encrypted, key, rawManifest] = await Promise.all([
    readFile(archivePath), readFile(keyPath), readFile(manifestPath, 'utf8'),
  ]);
  const manifest = JSON.parse(rawManifest);
  if (key.length !== 32 || !encrypted.subarray(0, magic.length).equals(magic)
    || encrypted.length < magic.length + 28 || digest(encrypted) !== manifest.encrypted_sha256) throw Error('invalid_archive');
  const nonce = encrypted.subarray(magic.length, magic.length + 12);
  const tag = encrypted.subarray(magic.length + 12, magic.length + 28);
  const decipher = createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAAD(magic);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(encrypted.subarray(magic.length + 28)), decipher.final()]);
  if (digest(plaintext) !== manifest.archive_sha256) throw Error('archive_hash_mismatch');
  return plaintext;
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (!['create', 'verify', 'decrypt'].includes(mode) || args.length !== (mode === 'verify' ? 3 : 4)) throw Error('invalid_arguments');
  let [source, destination, keyPath, manifestPath] = args;
  if (mode === 'verify') [source, keyPath, manifestPath] = args;
  if (mode === 'create') {
    // source is a ZIP in an ACL-protected temporary directory; destination is the ciphertext.
    for (const file of [destination, keyPath, manifestPath]) await privateDestination(file);
    if (path.dirname(path.resolve(destination)) === path.dirname(path.resolve(keyPath))) throw Error('store_key_separately');
    const sourceManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const plaintext = await readFile(source);
    if (digest(plaintext) !== sourceManifest.archive_sha256) throw Error('source_hash_mismatch');
    const key = randomBytes(32);
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    cipher.setAAD(magic);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const encrypted = Buffer.concat([magic, nonce, cipher.getAuthTag(), ciphertext]);
    await writeFile(keyPath, key, { flag: 'wx', mode: 0o600 });
    await writeFile(destination, encrypted, { flag: 'wx', mode: 0o600 });
    const portableManifest = {
      format: 'BAKU-SURVEY-AESGCM-V1', algorithm: 'AES-256-GCM',
      archive_sha256: digest(plaintext), encrypted_sha256: digest(encrypted),
      row_count: sourceManifest.row_count, original_row_hash: sourceManifest.row_hash,
      recovery_key_file: path.resolve(keyPath), requires_windows_profile: false,
    };
    await writeFile(manifestPath, JSON.stringify(portableManifest, null, 2), { mode: 0o600 });
    const recovered = await decrypt(destination, keyPath, manifestPath);
    if (!recovered.equals(plaintext)) throw Error('verification_failed');
    console.log('PASS: portable encrypted copy and archive hash verified; recovery key stored separately.');
    return;
  }
  if (mode === 'verify' || mode === 'decrypt') {
    // source is ciphertext; destination is used only for explicit private extraction.
    const plaintext = await decrypt(source, keyPath, manifestPath);
    if (mode === 'decrypt') {
      await privateDestination(destination);
      await writeFile(destination, plaintext, { flag: 'wx', mode: 0o600 });
    }
    console.log('PASS: portable backup authentication and archive hash verified.');
    return;
  }
  throw Error('unsupported_mode');
}

try { await main(); }
catch { console.error('Portable backup operation failed; diagnostic details withheld for privacy.'); process.exitCode = 1; }
