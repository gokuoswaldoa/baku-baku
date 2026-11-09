import assert from 'node:assert/strict';
import { CHECKOUT_PATH, UPSTREAM, handleCheckout } from '../server/checkout-worker.ts';
import { fakeToken, fixtureEnv, origin } from './fixtures/checkout-worker.mjs';

const closedProbe = process.argv.includes('--closed');
const ref = 'izogjwztgkrvlpjyxjhq';
const jwt = process.env.BAKU_5B_ANON_JWT;
const token = closedProbe ? fakeToken : process.env.BAKU_5B_INTAKE_TOKEN;
if (process.env.BAKU_5B_REF !== ref || process.env.BAKU_5B_URL !== 'https://' + ref + '.supabase.co'
  || new URL(UPSTREAM).hostname !== ref + '.supabase.co'
  || (!closedProbe && process.env.BAKU_5B_ALLOW_WRITE !== 'yes') || !jwt || !token) {
  throw Error('Exact 5B target, isolated credentials and explicit write opt-in (except --closed) are required.');
}
const env = { ...fixtureEnv(origin), CHECKOUT_5B_ANON_JWT: jwt, CHECKOUT_5B_INTAKE_TOKEN: token };
let upstreamClosed = false;
const fetchUpstream = async (url, init) => {
  if (url !== UPSTREAM) throw Error('Unexpected upstream');
  const result = await fetch(url, init);
  if (closedProbe && result.status === 503) {
    upstreamClosed = (await result.clone().json().catch(() => ({}))).error === 'intake_disabled';
  }
  return result;
};
const send = (payload, key = crypto.randomUUID()) => handleCheckout(new Request(origin + CHECKOUT_PATH, {
  method: 'POST', body: JSON.stringify(payload),
  headers: { Origin: origin, 'Sec-Fetch-Site': 'same-origin', 'CF-Connecting-IP': '192.0.2.12',
    'Content-Type': 'application/json', 'Idempotency-Key': key },
}), env, { fetchUpstream });

if (closedProbe) {
  assert.equal((await send({})).status, 503);
  assert.equal(upstreamClosed, true, '5B did not explicitly confirm intake_disabled');
  console.log('PASS: real 5B through the gateway confirms intake_disabled; no valid order sent.');
} else {
  const contact = { name: 'Contacto ficticio 5C', phone: '0000000001' };
  const item = { product_id: 'bola-fuego-xl', quantity: 2, finish_id: 'anguila',
    topping_ids: ['ajonjoli'], dip_id: 'sin-dip', expected_unit_price_cents: 9500 };
  const pickup = { modality: 'recogida', items: [item], contact };
  const delivery = { ...pickup, modality: 'entrega', neighborhood: 'Colonia ficticia 5C',
    contact: { ...contact, recipient_name: 'Destinatario ficticio 5C', recipient_phone: '0000000002',
      address: 'Calle ficticia S/N, Col. Colonia ficticia 5C, Temixco',
      references: 'Referencia ficticia', latitude: 18.85, longitude: -99.23 } };
  const receipt = async response => {
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(Object.keys(data).sort(), ['id', 'subtotal_cents']);
    assert.equal(data.subtotal_cents, 19000);
    return data.id;
  };
  const key = crypto.randomUUID();
  const double = await Promise.all([send(delivery, key), send(delivery, key)]);
  const deliveryFolio = await receipt(double[0]);
  assert.equal(await receipt(double[1]), deliveryFolio);
  assert.equal(await receipt(await send(delivery, key)), deliveryFolio);
  assert.equal((await send({ ...delivery, neighborhood: 'Otra colonia ficticia' }, key)).status, 409);
  assert.equal((await send({ ...pickup, items: [{ ...item, expected_unit_price_cents: 1 }] })).status, 422);
  assert.equal((await send({ ...pickup, items: [{ ...item, quantity: 0 }] })).status, 400);
  assert.notEqual(await receipt(await send(pickup)), deliveryFolio);
  console.log('PASS: real 5B pickup and delivery, server subtotal, stable folio, conflict, and invalid price and quantity.');
}
