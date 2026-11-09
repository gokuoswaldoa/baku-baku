import { CheckoutLimits } from '../../server/checkout-worker.ts';

export const origin = 'https://checkout-5b.example.test';
export const folio = '12345678-0000-4000-8000-000000000001';
export const fakeJwt = (ref = 'izogjwztgkrvlpjyxjhq', role = 'anon') =>
  'fixture.' + Buffer.from(JSON.stringify({ ref, role, exp: 4102444800 })).toString('base64url') + '.unsigned';
export const fakeToken = 'only-for-offline-5c-tests-fake-token';

export function fixtureEnv(site = origin) {
  const data = new Map();
  const state = { storage: {
    kv: { get: key => data.get(key), put: (key, value) => data.set(key, value) },
    transactionSync: fn => fn(),
  } };
  const limiter = new CheckoutLimits(state);
  return {
    CHECKOUT_ENABLED: 'true', CHECKOUT_ORIGIN: site,
    CHECKOUT_5B_ANON_JWT: fakeJwt(), CHECKOUT_5B_INTAKE_TOKEN: fakeToken,
    CHECKOUT_LIMITS: { idFromName: name => name, get: () => limiter },
  };
}
