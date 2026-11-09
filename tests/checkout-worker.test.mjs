import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHECKOUT_PATH, UPSTREAM, handleCheckout } from '../server/checkout-worker.ts';
import { fakeJwt, fakeToken, fixtureEnv, folio, origin } from './fixtures/checkout-worker.mjs';

const headers = { Origin: origin, 'Sec-Fetch-Site': 'same-origin', 'CF-Connecting-IP': '192.0.2.12',
  'Content-Type': 'application/json', 'Idempotency-Key': folio };
function req(options = {}) {
  const { url = origin + CHECKOUT_PATH, body = '{}', method = 'POST', headers: override } = options;
  const combined = new Headers(headers);
  for (const [key, value] of Object.entries(override ?? {})) {
    if (value === null) combined.delete(key);
    else combined.set(key, value);
  }
  return new Request(url, { method, headers: combined, ...(method === 'POST' && { body, duplex: 'half' }) });
}
let unexpectedCalls = 0;
const noCall = () => { unexpectedCalls++; throw Error('Unexpected upstream call'); };

test('closed, wrong host, CSRF, method, content and key checks', async () => {
  const env = fixtureEnv();
  const check = async (request, status, config = env) => {
    assert.equal((await handleCheckout(request, config, { fetchUpstream: noCall })).status, status);
  };
  await check(req(), 503, { ...env, CHECKOUT_ENABLED: 'false' });
  await check(req({ headers: { Origin: 'https://attacker.test' } }), 403);
  await check(req({ headers: { Origin: null } }), 403);
  await check(req({ headers: { 'Sec-Fetch-Site': 'same-site' } }), 403);
  await check(req({ url: 'https://attacker.test' + CHECKOUT_PATH }), 403);
  await check(req({ url: origin + CHECKOUT_PATH + '?phone=fixture' }), 404);
  await check(req({ method: 'GET' }), 405);
  await check(req({ headers: { 'Content-Type': 'text/plain' } }), 415);
  await check(req({ headers: { 'Content-Encoding': 'gzip' } }), 415);
  await check(req({ headers: { 'Idempotency-Key': 'bad' } }), 400);
  await check(req({ headers: { 'CF-Connecting-IP': null, 'X-Forwarded-For': '192.0.2.1' } }), 503);
  await check(req(), 503, { ...env, CHECKOUT_5B_ANON_JWT: fakeJwt('ifpisoajqtvbsykcftrn') });
  await check(req(), 503, { ...env, CHECKOUT_5B_ANON_JWT: fakeJwt(undefined, 'service_role') });
  await check(req(), 503, { ...env, CHECKOUT_LIMITS: undefined });
  assert.equal(unexpectedCalls, 0);
});

test('enforces streaming size, valid UTF-8 JSON and body read deadline', async () => {
  const env = fixtureEnv();
  const check = async (options, status) =>
    assert.equal((await handleCheckout(req(options), env, { fetchUpstream: noCall })).status, status);
  await check({ headers: { 'Content-Length': '65537' } }, 413);
  await check({ body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array(65537)); c.close(); } }) }, 413);
  await check({ body: 'not json' }, 400);
  await check({ body: '[]' }, 400);
  await check({ body: new Uint8Array([255]) }, 400);
  const keepAlive = setTimeout(() => {}, 3000);
  try { await check({ body: new ReadableStream() }, 400); } finally { clearTimeout(keepAlive); }
  assert.equal(unexpectedCalls, 0);
});

test('fixed 5B target, clean headers and stable idempotency key across retry', async () => {
  const env = fixtureEnv();
  let calls = 0;
  const fetchUpstream = async (url, init) => {
    assert.equal(url, UPSTREAM);
    assert.equal(new URL(url).hostname, 'izogjwztgkrvlpjyxjhq.supabase.co');
    assert.equal(init.redirect, 'error');
    assert.deepEqual(Object.keys(init.headers).sort(), ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Intake-Token']);
    assert.equal(init.headers.Authorization, 'Bearer ' + fakeJwt());
    assert.equal(init.headers['X-Intake-Token'], fakeToken);
    assert.equal(init.headers['Idempotency-Key'], folio);
    assert.equal(new TextDecoder().decode(init.body), '{"modality":"recogida"}');
    if (++calls === 1) throw Error('fixture private detail');
    return Response.json({ id: folio, subtotal_cents: 9500, hidden: 'fixture private detail' },
      { headers: { 'Set-Cookie': 'internal=only' } });
  };
  const attempt = () => handleCheckout(req({ body: '{"modality":"recogida"}',
    headers: { Cookie: 'ignored', Authorization: 'ignored', 'X-Intake-Token': 'ignored' } }), env, { fetchUpstream });
  const failed = await attempt();
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { error: 'checkout_unavailable' });
  const ok = await attempt();
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('Set-Cookie'), null);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(ok.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await ok.json(), { id: folio, subtotal_cents: 9500 });
});

test('upstream errors and malformed receipts expose no raw content', async () => {
  const env = fixtureEnv();
  for (const [upstreamStatus, publicStatus] of [[400, 400], [409, 409], [422, 422], [403, 503], [500, 503], [200, 503]]) {
    const response = await handleCheckout(req(), env, {
      fetchUpstream: async () => Response.json({ private: 'fixture private detail' }, { status: upstreamStatus }),
    });
    assert.equal(response.status, publicStatus);
    assert.equal((await response.text()).includes('fixture'), false);
  }
});

test('rate limit uses trusted IP across requests, plus a shared global cap', async () => {
  // Fixed clock avoids a wall-clock minute transition during burst assertions.
  const realNow = Date.now;
  Date.now = () => 1_800_000_010_000;
  try {
    const env = fixtureEnv();
    let forwarded = 0;
    const fetchUpstream = async () => { forwarded++; return Response.json({ id: folio, subtotal_cents: 9500 }); };
    const send = (ip = '192.0.2.12') => handleCheckout(req({ headers: { 'CF-Connecting-IP': ip,
      'X-Forwarded-For': crypto.randomUUID() } }), env, { fetchUpstream });
    const burst = await Promise.all(Array.from({ length: 16 }, () => send()));
    assert.equal(burst.filter(r => r.status === 200).length, 8);
    assert.equal(burst.filter(r => r.status === 429).length, 8);
    assert.match(burst.find(r => r.status === 429).headers.get('Retry-After'), /^\d+$/);
    const distributed = await Promise.all(Array.from({ length: 60 }, (_, i) => send('198.51.100.' + i)));
    assert.equal(distributed.filter(r => r.status === 200).length, 52);
    assert.equal(distributed.filter(r => r.status === 429).length, 8);
    assert.equal(forwarded, 60);
    Date.now = () => 1_800_000_070_000;
    assert.equal((await send()).status, 200);
  } finally { Date.now = realNow; }
});
