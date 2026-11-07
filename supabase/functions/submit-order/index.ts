import { validateIdempotencyKey, validatePayload } from './payload.ts';

const maxBodyBytes = 65536;

async function readBody(request: Request): Promise<unknown> {
  if (!request.body) throw new Error('invalid_payload');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) { await reader.cancel(); throw new Error('payload_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const allowedOrigin = Deno.env.get('ORDER_ALLOWED_ORIGIN');
  const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin' });
  const reply = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers });
  if (origin && origin !== allowedOrigin) return reply(403, { error: 'origin_not_allowed' });
  if (origin) headers.set('Access-Control-Allow-Origin', origin);
  if (Deno.env.get('ORDER_INTAKE_ENABLED') !== 'true') return reply(503, { error: 'intake_disabled' });
  // Temporary server-only gate for approved integration tests. Never ship this token to a browser.
  const intakeToken = Deno.env.get('ORDER_INTAKE_TOKEN');
  if (!intakeToken || request.headers.get('x-intake-token') !== intakeToken) return reply(403, { error: 'intake_not_authorized' });
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') return reply(415, { error: 'json_required' });

  let payload;
  let idempotencyKey;
  try {
    idempotencyKey = validateIdempotencyKey(request.headers.get('idempotency-key'));
    payload = validatePayload(await readBody(request));
  } catch {
    return reply(400, { error: 'invalid_request' });
  }
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reply(503, { error: 'server_not_configured' });
  try {
    // The RPC locks current catalog rows, validates availability and recalculates every price.
    // The expected price is compared, never accepted as the authoritative price.
    const response = await fetch(url + '/rest/v1/rpc/submit_checkout_request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: 'Bearer ' + serviceKey },
      body: JSON.stringify({ p_idempotency_key: idempotencyKey, p_payload: payload }),
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({})) as { code?: string };
      if (failure.code === '23505') return reply(409, { error: 'idempotency_conflict' });
      if (failure.code === '22023' || failure.code?.startsWith('23')) return reply(422, { error: 'catalog_or_request_changed' });
      return reply(503, { error: 'retry_same_idempotency_key' });
    }
    const receipt = await response.json();
    const id = validateIdempotencyKey(receipt.id);
    if (typeof receipt.replayed !== 'boolean' || !Number.isSafeInteger(receipt.subtotal_cents) || receipt.subtotal_cents < 0) {
      return reply(503, { error: 'retry_same_idempotency_key' });
    }
    return reply(200, { id, subtotal_cents: receipt.subtotal_cents });
  } catch {
    // A timeout may occur after a commit. Retry the same key and payload.
    return reply(503, { error: 'retry_same_idempotency_key' });
  }
}

Deno.serve(handler);
