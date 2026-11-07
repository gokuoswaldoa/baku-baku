// Run against a disposable Supabase CLI stack with migration 007 and the local Edge gate enabled.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const origin = 'http://127.0.0.1:5173';
const base = 'http://127.0.0.1:54321';
const jwt = process.env.ORDER_LOCAL_GATEWAY_JWT;
const token = process.env.ORDER_LOCAL_INTAKE_TOKEN;
if (process.env.BAKU_DISPOSABLE_SUPABASE !== 'yes' || !jwt || !token) {
  throw Error('This test requires explicit opt-in and the credentials of a disposable local Supabase stack.');
}
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
const send = (key, body, intakeToken = token) => fetch(base + '/functions/v1/submit-order', {
  method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
  headers: { ...authorization, Origin: origin, 'X-Intake-Token': intakeToken, 'Idempotency-Key': key },
  body: JSON.stringify(body),
});

assert.equal((await send(randomUUID(), payload, '')).status, 403);
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
assert.equal((await send(key, { ...payload, neighborhood: 'Otra colonia' })).status, 409);
const wrongPrice = { ...payload, items: [{ ...payload.items[0], expected_unit_price_cents: 1 }] };
assert.equal((await send(randomUUID(), wrongPrice)).status, 422);
const pickup = await send(randomUUID(), { modality: 'recogida', items: payload.items,
  contact: { name: payload.contact.name, phone: payload.contact.phone } });
assert.equal(pickup.status, 200);
assert.ok((await pickup.json()).id !== receipts[0].id, 'Pickup must have a different folio');
console.log('PASS: local JWT and REST denial, Edge gate, concurrent idempotency, conflict, price validation, and pickup.');
