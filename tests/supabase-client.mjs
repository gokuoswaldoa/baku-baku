import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

function moduleUrl(source) {
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
  return 'data:text/javascript;base64,' + Buffer.from(output).toString('base64');
}
const configUrl = moduleUrl(await readFile('src/lib/supabase-config.ts', 'utf8'));
const { readSupabaseConfig } = await import(configUrl);
const fixture = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_offline_fixture' };
assert.equal(readSupabaseConfig(fixture).url, fixture.VITE_SUPABASE_URL);
for (const env of [
  {}, { ...fixture, VITE_SUPABASE_URL: '' },
  { ...fixture, VITE_SUPABASE_URL: 'http://remote.example.test' },
  { ...fixture, VITE_SUPABASE_URL: 'https://user:password@example.test' },
  { ...fixture, VITE_SUPABASE_URL: 'https://example.test/rest/v1' },
  { ...fixture, VITE_SUPABASE_URL: 'https://example.test?token=fixture' },
  { ...fixture, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_offline_fixture' },
  { ...fixture, VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJ-legacy-key-fixture' },
]) {
  assert.throws(() => readSupabaseConfig(env));
}
assert.equal(readSupabaseConfig({ ...fixture, VITE_SUPABASE_URL: 'http://127.0.0.1:54321' }).url, 'http://127.0.0.1:54321');
const source = (await readFile('src/lib/supabase.ts', 'utf8'))
  .replace("'@supabase/supabase-js'", JSON.stringify(import.meta.resolve('@supabase/supabase-js')))
  .replace("'./supabase-config'", JSON.stringify(configUrl))
  .replace('import.meta.env', JSON.stringify(fixture));
let requests = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { requests++; throw Error('Network blocked in test'); };
try {
  const { getSupabaseClient } = await import(moduleUrl(source));
  assert.equal(requests, 0);
  const client = getSupabaseClient();
  assert.equal(getSupabaseClient(), client);
  assert.equal((await client.auth.getSession()).data.session, null);
  assert.equal(requests, 0);
} finally { globalThis.fetch = originalFetch; }

for (const file of ['.env.local', '.env.production', 'supabase/functions/submit-order/.env.local',
  'supabase/.temp/project-ref', 'credentials.json', 'server.key']) {
  execFileSync('git', ['check-ignore', '--quiet', file]);
}
assert.throws(() => execFileSync('git', ['check-ignore', '--quiet', '.env.example']));
console.log('PASS: environment validation, rejection of server credentials, lazy singleton, zero network requests and ignored local credentials.');
