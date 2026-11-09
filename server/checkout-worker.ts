export const CHECKOUT_PATH = '/api/checkout/submit-order';
const project = 'izogjwztgkrvlpjyxjhq';
export const UPSTREAM = `https://${project}.supabase.co/functions/v1/submit-order`;
const maxBody = 65536;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const windowMs = 60_000;
const limits = { client: 8, global: 60 };

type Fetcher = { fetch(request: Request): Promise<Response> };
type Window = { start: number; total: number; clients: Record<string, number> };
type Storage = {
  get(key: string): Window | undefined;
  put(key: string, value: Window): void;
};
type State = { storage: { kv: Storage; transactionSync<T>(callback: () => T): T } };
type Env = {
  ASSETS: Fetcher;
  CHECKOUT_LIMITS: { idFromName(name: string): unknown; get(id: unknown): Fetcher };
  CHECKOUT_ENABLED?: string;
  CHECKOUT_ORIGIN?: string;
  CHECKOUT_5B_ANON_JWT?: string;
  CHECKOUT_5B_INTAKE_TOKEN?: string;
};

function reply(status: number, body: object, extra: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
  });
}
const unavailable = () => reply(503, { error: 'checkout_unavailable' });

function is5bAnonJwt(value: string) {
  try {
    if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(value)) return false;
    const payload = JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.ref === project && payload.role === 'anon'
      && Number.isSafeInteger(payload.exp) && payload.exp > Date.now() / 1000;
  } catch { return false; }
}

async function readBytes(body: ReadableStream<Uint8Array> | null, maximum: number, signal: AbortSignal) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const buffer = new Uint8Array(maximum);
  let size = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) return buffer.slice(0, size);
      if (size + value.byteLength > maximum) {
        cancel();
        return null;
      }
      buffer.set(value, size);
      size += value.byteLength;
    }
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

async function clientBucket(ip: string, token: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(token), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const day = Math.floor(Date.now() / 86_400_000);
  const hash = await crypto.subtle.sign('HMAC', key, encoder.encode(`baku-checkout:${day}:${ip}`));
  return Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('');
}

// One SQLite-backed Durable Object shares the budget between edge locations.
export class CheckoutLimits {
  private readonly state: State;
  constructor(state: State) { this.state = state; }

  async fetch(request: Request) {
    const bucket = request.headers.get('X-Checkout-Bucket') ?? '';
    if (request.method !== 'POST' || !/^[a-f0-9]{64}$/.test(bucket)) return reply(400, { error: 'invalid_bucket' });
    const { storage } = this.state;
    const retryAfter = storage.transactionSync(() => {
      const now = Date.now();
      const start = Math.floor(now / windowMs) * windowMs;
      const saved = storage.kv.get('window');
      const current = saved?.start === start ? saved : { start, total: 0, clients: {} };
      const hits = current.clients[bucket] ?? 0;
      if (hits >= limits.client || current.total >= limits.global) return Math.ceil((start + windowMs - now) / 1000);
      current.clients[bucket] = hits + 1;
      current.total++;
      storage.kv.put('window', current);
      return 0;
    });
    return retryAfter
      ? reply(429, { error: 'rate_limited' }, { 'Retry-After': String(retryAfter) })
      : new Response(null, { status: 204 });
  }
}

export async function handleCheckout(
  request: Request,
  env: Env,
  { fetchUpstream = fetch, loopbackTest = false }: { fetchUpstream?: typeof fetch; loopbackTest?: boolean } = {},
) {
  if (env.CHECKOUT_ENABLED !== 'true') return unavailable();
  const site = new URL(request.url);
  if (site.pathname !== CHECKOUT_PATH || site.search) return reply(404, { error: 'not_found' });
  if ((site.protocol !== 'https:' && !(loopbackTest && site.hostname === '127.0.0.1' && site.protocol === 'http:'))
    || site.origin !== env.CHECKOUT_ORIGIN || request.headers.get('Origin') !== site.origin
    || (request.headers.has('Sec-Fetch-Site') && request.headers.get('Sec-Fetch-Site') !== 'same-origin')) {
    return reply(403, { error: 'origin_not_allowed' });
  }
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' }, { Allow: 'POST' });
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
    || request.headers.has('Content-Encoding')) return reply(415, { error: 'json_required' });
  const length = request.headers.get('Content-Length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBody)) return reply(413, { error: 'payload_too_large' });
  const key = request.headers.get('Idempotency-Key') ?? '';
  if (!uuid.test(key)) return reply(400, { error: 'invalid_request' });

  const { CHECKOUT_5B_ANON_JWT: jwt, CHECKOUT_5B_INTAKE_TOKEN: token } = env;
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!jwt || !is5bAnonJwt(jwt) || !token || !/^[A-Za-z0-9_-]{32,128}$/.test(token)
    || !/^(?:[0-9.]{7,15}|[a-f0-9:.]{2,45})$/i.test(ip) || !env.CHECKOUT_LIMITS) return unavailable();
  try {
    const limiter = env.CHECKOUT_LIMITS.get(env.CHECKOUT_LIMITS.idFromName('checkout-5b'));
    const budget = await limiter.fetch(new Request('https://limits.internal/checkout', {
      method: 'POST',
      headers: { 'X-Checkout-Bucket': await clientBucket(ip, token) },
      signal: AbortSignal.timeout(2000),
    }));
    if (budget.status === 429) {
      const retry = Number(budget.headers.get('Retry-After'));
      return reply(429, { error: 'rate_limited' }, { 'Retry-After': String(retry > 0 && retry <= 60 ? retry : 60) });
    }
    if (budget.status !== 204) return unavailable();
  } catch { return unavailable(); }

  let bytes;
  try {
    bytes = await readBytes(request.body, maxBody, AbortSignal.timeout(2000));
    if (!bytes) return reply(413, { error: 'payload_too_large' });
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return reply(400, { error: 'invalid_request' });
  } catch { return reply(400, { error: 'invalid_request' }); }

  try {
    const signal = AbortSignal.timeout(11_000);
    const upstream = await fetchUpstream(UPSTREAM, {
      method: 'POST', redirect: 'error', signal,
      headers: {
        Authorization: 'Bearer ' + jwt, 'X-Intake-Token': token,
        'Content-Type': 'application/json', 'Idempotency-Key': key,
      },
      body: bytes,
    });
    if (upstream.status !== 200) {
      void upstream.body?.cancel().catch(() => {});
      if (upstream.status === 409) return reply(409, { error: 'idempotency_conflict' });
      if (upstream.status === 400 || upstream.status === 422) return reply(upstream.status, { error: 'invalid_request' });
      return unavailable();
    }
    const receiptBytes = await readBytes(upstream.body, 2048, signal);
    if (!receiptBytes) return unavailable();
    const { id, subtotal_cents } = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(receiptBytes));
    if (typeof id !== 'string' || !uuid.test(id) || !Number.isSafeInteger(subtotal_cents) || subtotal_cents <= 0) return unavailable();
    return reply(200, { id, subtotal_cents });
  } catch { return unavailable(); }
}

export default {
  fetch(request: Request, env: Env) {
    const path = new URL(request.url).pathname;
    if (path === CHECKOUT_PATH) return handleCheckout(request, env);
    if (path.startsWith('/api/')) return reply(404, { error: 'not_found' });
    return env.ASSETS.fetch(request);
  },
};
