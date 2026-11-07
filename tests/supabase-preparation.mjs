// Offline checks using the existing TypeScript dependency. No network or database required.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const folder = 'supabase/functions/submit-order/';
const payloadPath = path.resolve(folder + 'payload.ts');
const indexPath = path.resolve(folder + 'index.ts');
const virtualPath = path.resolve('supabase/deno-runtime-check.d.ts');
const declaration = 'declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Response | Promise<Response>): unknown };';
const compilerOptions = {
  strict: true, noEmit: true, target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowImportingTsExtensions: true, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
};
const host = ts.createCompilerHost(compilerOptions);
const originalRead = host.readFile;
const originalExists = host.fileExists;
host.readFile = file => path.resolve(file) === virtualPath ? declaration : originalRead(file);
host.fileExists = file => path.resolve(file) === virtualPath || originalExists(file);
const program = ts.createProgram([payloadPath, indexPath, virtualPath], compilerOptions, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
}));

const asModuleUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText).toString('base64');
const payloadUrl = asModuleUrl(await readFile(payloadPath, 'utf8'));
const { validatePayload, validateIdempotencyKey } = await import(payloadUrl);
const line = { product_id: 'bola-fuego-xl', quantity: 3, finish_id: 'anguila', topping_ids: ['cebollin', 'ajonjoli'], dip_id: 'sin-dip', expected_unit_price_cents: 9500 };
const pickupContact = { name: 'Contacto de prueba', phone: '0000000001' };
const contact = { ...pickupContact, address: 'Dirección ficticia S/N', latitude: 18.8, longitude: -99.2,
  recipient_name: 'Destinatario de prueba', recipient_phone: '0000000002' };
const order = { modality: 'entrega', neighborhood: ' Colonia de prueba ', contact,
  items: [line, { ...line, quantity: 1, dip_id: 'valentina' }] };
assert.equal(validatePayload(order).neighborhood, 'Colonia de prueba');
assert.deepEqual(validatePayload(order).contact, contact);
assert.deepEqual(validatePayload({ modality: 'recogida', contact: pickupContact, items: [line] }).contact, pickupContact);
assert.throws(() => validatePayload({ modality: 'recogida', contact, items: [line] }));
assert.throws(() => validatePayload({ ...order, contact: undefined }));
for (const field of ['recipient_name', 'recipient_phone', 'address', 'latitude', 'longitude']) {
  assert.throws(() => validatePayload({ ...order, contact: { ...contact, [field]: undefined } }));
}
assert.throws(() => validatePayload({ ...order, contact: { ...contact, name: 'a\nb' } }));
assert.throws(() => validatePayload({ ...order, contact: { ...contact, phone: '+520000000001' } }));
assert.deepEqual(validatePayload(order).items[0].topping_ids, ['ajonjoli', 'cebollin']);
for (const quantity of [0, -1, 1.5, 100, '3', null]) {
  assert.throws(() => validatePayload({ ...order, items: [{ ...line, quantity }] }));
}
for (const topping_ids of [['ajonjoli', 'ajonjoli'], ['a', 'b', 'c'], null]) {
  assert.throws(() => validatePayload({ ...order, items: [{ ...line, topping_ids }] }));
}
assert.throws(() => validatePayload({ ...order, items: [{ ...line, dip_id: '' }] }));
assert.throws(() => validatePayload({ ...order, neighborhood: ' ' }));
assert.throws(() => validatePayload({ ...order, status: 'confirmado' }));
assert.throws(() => validatePayload({ ...order, contact: { latitude: 20 } }));
assert.throws(() => validatePayload({ ...order, contact: { latitude: Infinity, longitude: 10 } }));
assert.throws(() => validatePayload({ ...order, items: Array(51).fill(line) }));
assert.throws(() => validatePayload({ ...order, items: [] }));
assert.throws(() => validatePayload({ ...order, items: [{ ...line, expected_unit_price_cents: 95.5 }] }));
assert.throws(() => validateIdempotencyKey('not-a-uuid'));

const env = new Map();
globalThis.Deno = { env: { get: name => env.get(name) }, serve: () => {} };
const indexSource = (await readFile(indexPath, 'utf8')).replace("'./payload.ts'", JSON.stringify(payloadUrl));
const { handler } = await import(asModuleUrl(indexSource));
const request = (overrides = {}) => new Request('http://local.test/submit-order', {
  method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': '00000000-0000-4000-8000-000000000002', 'x-intake-token': 'offline-test-token' },
  body: JSON.stringify(order), ...overrides,
});
assert.equal((await handler(request())).status, 503);
env.set('ORDER_INTAKE_ENABLED', 'true');
assert.equal((await handler(request())).status, 403);
env.set('ORDER_INTAKE_TOKEN', 'offline-test-token');
assert.equal((await handler(request({ headers: { origin: 'https://untrusted.test' } }))).status, 403);
assert.equal((await handler(request({ headers: { 'x-intake-token': 'offline-test-token', 'content-type': 'application/jsonp' } }))).status, 415);
assert.equal((await handler(request({ body: 'invalid-json' }))).status, 400);
assert.equal((await handler(request({ body: ' '.repeat(65537) }))).status, 400);
assert.equal((await handler(request())).status, 503);
env.set('SUPABASE_URL', 'http://offline.test');
env.set('SUPABASE_SERVICE_ROLE_KEY', 'offline-fixture-only');
const originalFetch = globalThis.fetch;
let calls = 0;
const id = '00000000-0000-4000-8000-000000000001';
try {
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'http://offline.test/rest/v1/rpc/submit_checkout_request');
    assert.equal(options.redirect, 'error');
    const forwarded = JSON.parse(options.body);
    assert.equal(forwarded.p_payload.items.length, 2);
    assert.deepEqual(forwarded.p_payload.contact, contact);
    assert.equal(forwarded.p_idempotency_key, '00000000-0000-4000-8000-000000000002');
    return Response.json({ id, status: 'pendiente', subtotal_cents: 38000, replayed: calls > 1, contact });
  };
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { id, subtotal_cents: 38000 });
  assert.deepEqual(await (await handler(request())).json(), { id, subtotal_cents: 38000 });
  assert.equal(calls, 2);
  globalThis.fetch = async () => Response.json({ id, subtotal_cents: '38000', replayed: false });
  assert.equal((await handler(request())).status, 503);
  globalThis.fetch = async () => Response.json({ code: '23505', message: 'do not expose private error' }, { status: 409 });
  const conflict = await handler(request());
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { error: 'idempotency_conflict' });
  globalThis.fetch = async () => Response.json({ code: '22023' }, { status: 400 });
  assert.equal((await handler(request())).status, 422);
  globalThis.fetch = async () => { throw Error('offline timeout'); };
  assert.equal((await handler(request())).status, 503);
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.Deno;
}

const migrationNames = (await readdir('supabase/migrations')).filter(name => name.endsWith('.sql')).sort();
assert.ok(migrationNames.includes('202611060006_delivery_recipient.sql'));
assert.ok(migrationNames.includes('202611060007_checkout_submission.sql'));
assert.equal(new Set(migrationNames.map(name => name.split('_')[0])).size, migrationNames.length);
for (const name of migrationNames) {
  const sql = await readFile('supabase/migrations/' + name, 'utf8');
  assert.match(sql, /^begin;/);
  assert.match(sql, /commit;\s*$/);
  assert.equal((sql.match(/\$\$/g) || []).length % 2, 0, 'Unbalanced function delimiters');
}
console.log('PASS: strict Edge TypeScript, payload validation, guarded handler, size limits, normalized payload, RPC errors and migration file structure.');
