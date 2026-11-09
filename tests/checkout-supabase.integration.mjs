// Run against a disposable Supabase stack with migration 007 and the Edge gate enabled.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

function integrationTarget() {
  if (process.argv.includes('--cloud-5b')) {
    const ref = 'izogjwztgkrvlpjyxjhq';
    const base = 'https://' + ref + '.supabase.co';
    const origin = 'http://127.0.0.1:5174';
    const { BAKU_5B_ANON_JWT: jwt, BAKU_5B_INTAKE_TOKEN: token } = process.env;
    if (process.env.BAKU_5B_REF !== ref || process.env.BAKU_5B_URL !== base
      || process.env.BAKU_5B_ORIGIN !== origin || process.env.BAKU_5B_ALLOW_WRITE !== 'yes' || !jwt || !token) {
      throw Error('Cloud tests require the exact 5B project, isolated credentials and explicit write opt-in.');
    }
    try {
      if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(jwt)) throw Error();
      const claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
      if (claims.ref !== ref || claims.role !== 'anon') throw Error();
    } catch {
      throw Error('Cloud tests require a legacy anon JWT issued for the 5B project.');
    }
    return { base, origin, jwt, token };
  }

  const { ORDER_LOCAL_GATEWAY_JWT: jwt, ORDER_LOCAL_INTAKE_TOKEN: token } = process.env;
  if (process.env.BAKU_DISPOSABLE_SUPABASE !== 'yes' || !jwt || !token) {
    throw Error('This test requires explicit opt-in and the credentials of a disposable local Supabase stack.');
  }
  return { base: 'http://127.0.0.1:54321', origin: 'http://127.0.0.1:5173', jwt, token };
}

const { base, origin, jwt, token } = integrationTarget();
const authorization = { apikey: jwt, Authorization: 'Bearer ' + jwt, 'Content-Type': 'application/json' };
const payload = {
  modality: 'entrega',
  neighborhood: 'Colonia ficticia',
  items: [
    { product_id: 'bola-fuego-xl', quantity: 3, finish_id: 'anguila', topping_ids: ['ajonjoli', 'cebollin'], dip_id: 'sin-dip', expected_unit_price_cents: 9500 },
    { product_id: 'bola-fuego-xl', quantity: 1, finish_id: 'sin-salsa', topping_ids: [], dip_id: 'mayo-chipotle', expected_unit_price_cents: 9500 },
  ],
  contact: {
    name: 'Contacto ficticio', phone: '0000000001', recipient_name: 'Destinatario ficticio', recipient_phone: '0000000002',
    address: 'Calle ficticia S/N, Col. Colonia ficticia, Temixco', references: 'Puerta ficticia', latitude: 18.85, longitude: -99.23,
  },
};
const send = (key, body, intakeToken = token, requestOrigin = origin) => fetch(base + '/functions/v1/submit-order', {
  method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
  headers: { ...authorization, Origin: requestOrigin, 'X-Intake-Token': intakeToken, 'Idempotency-Key': key },
  body: JSON.stringify(body),
});

assert.equal((await send(randomUUID(), payload, '')).status, 403);
if (process.argv.includes('--cloud-5b')) {
  assert.equal((await send(randomUUID(), payload, token, 'https://example.com')).status, 403);
  const invalid = [
    [{ product_id: 'producto-inexistente' }, 422],
    [{ quantity: 0 }, 400],
    [{ dip_id: 'opcion-inexistente' }, 422],
  ];
  for (const [patch, status] of invalid) {
    const body = { ...payload, items: [{ ...payload.items[0], ...patch }] };
    assert.equal((await send(randomUUID(), body)).status, status);
  }
}
const direct = await fetch(base + '/rest/v1/rpc/submit_checkout_request', {
  method: 'POST', headers: authorization, redirect: 'error', signal: AbortSignal.timeout(15000),
  body: JSON.stringify({ p_idempotency_key: randomUUID(), p_payload: {} }),
});
assert.ok([401, 403, 404].includes(direct.status), 'Anonymous REST RPC must be denied');
const key = randomUUID();
const concurrent = await Promise.all([send(key, payload), send(key, payload)]);
assert.deepEqual(concurrent.map(response => response.status), [200, 200]);
const receipts = await Promise.all(concurrent.map(response => response.json()));
assert.ok(receipts.every(receipt => typeof receipt.id === 'string'
  && receipt.id === receipts[0].id && receipt.subtotal_cents === 38000
  && Object.keys(receipt).length === 2), 'Expected one folio and a minimal receipt');
if (process.argv.includes('--cloud-5b')) {
  const retry = await send(key, payload);
  assert.equal(retry.status, 200);
  const receipt = await retry.json();
  assert.ok(receipt.id === receipts[0].id && receipt.subtotal_cents === 38000, 'Retry changed the receipt');
}
assert.equal((await send(key, { ...payload, neighborhood: 'Otra colonia' })).status, 409);
const wrongPrice = { ...payload, items: [{ ...payload.items[0], expected_unit_price_cents: 1 }] };
assert.equal((await send(randomUUID(), wrongPrice)).status, 422);
const pickup = await send(randomUUID(), { modality: 'recogida', items: payload.items,
  contact: { name: payload.contact.name, phone: payload.contact.phone } });
assert.equal(pickup.status, 200);
const pickupReceipt = await pickup.json();
assert.ok(typeof pickupReceipt.id === 'string' && pickupReceipt.id !== receipts[0].id
  && pickupReceipt.subtotal_cents === 38000, 'Pickup must have its own folio and server subtotal');
console.log('PASS: JWT and REST denial, Edge gate, concurrent idempotency, conflict, price validation, and pickup.');
