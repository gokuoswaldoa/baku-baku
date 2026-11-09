import { execFileSync } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ref = 'izogjwztgkrvlpjyxjhq';
const base = 'https://' + ref + '.supabase.co';
const {
  BAKU_5B_REF, BAKU_5B_URL, BAKU_5B_AUTH_RUN, BAKU_5B_PUBLIC_KEY: publicKey,
  BAKU_5B_PROVISIONING_KEY: provisioningKey, BAKU_5B_NPX_JS: npx, BAKU_5B_WORKDIR: workdir,
} = process.env;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
class ProbeError extends Error {}

function claimsOf(token) {
  if (typeof token !== 'string' || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) {
    throw new ProbeError('Expected a JWT.');
  }
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    throw new ProbeError('Malformed JWT claims.');
  }
}

function check(condition, label) {
  if (!condition) throw new ProbeError(label);
}

check(BAKU_5B_REF === ref && BAKU_5B_URL === base && BAKU_5B_AUTH_RUN === 'yes'
  && publicKey?.startsWith('sb_publishable_') && provisioningKey && npx && workdir,
'Auth test requires the exact 5B project and explicit opt-in.');
const provisionClaims = claimsOf(provisioningKey);
check(provisionClaims.ref === ref && provisionClaims.role === 'service_role',
  'Provisioning key does not belong to 5B.');

function fetch5b(input, init) {
  const url = new URL(input instanceof Request ? input.url : input);
  check(url.origin === base && !url.username && !url.password, 'Request blocked outside 5B.');
  return fetch(input, { ...init, redirect: 'error', signal: AbortSignal.timeout(15000) });
}

function client(key = publicKey) {
  return createClient(base, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: fetch5b },
  });
}

async function request(path, jwt, body) {
  const headers = { apikey: publicKey };
  if (jwt) headers.Authorization = 'Bearer ' + jwt;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch5b(base + path, {
    method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}

function sql(statement) {
  const { BAKU_5B_PROVISIONING_KEY: removed, ...env } = process.env;
  let output;
  try {
    output = execFileSync(process.execPath, [
      npx, '--offline', '--yes', 'supabase@2', 'db', 'query', '--linked',
      '--project-ref', ref, '--workdir', workdir, '-o', 'json', statement.replace(/\r?\n/g, ' '),
    ], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 45000 });
    return JSON.parse(output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1)).rows;
  } catch {
    throw new ProbeError('Isolated 5B SQL operation could not be verified.');
  }
}

function totp(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = [];
  let value = 0, bits = 0;
  for (const letter of secret.replace(/=+$/, '').toUpperCase()) {
    const digit = alphabet.indexOf(letter);
    check(digit >= 0, 'Unexpected TOTP secret encoding.');
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push(value >>> bits);
      value &= (1 << bits) - 1;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const mac = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = mac.at(-1) & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
}

async function createIdentity(label, provisioner) {
  const email = 'baku5b-' + label + '-' + randomUUID() + '@example.com';
  const password = '5bA!' + randomBytes(24).toString('base64url');
  const { data, error } = await provisioner.auth.admin.createUser({ email, password, email_confirm: true });
  check(!error && uuid.test(data?.user?.id) && data.user.email === email,
    'Could not create fictional ' + label + ' identity (HTTP ' + (error?.status ?? 'unknown') + ').');
  console.log('Created fictional ' + label + ' identity.');
  return { id: data.user.id, email, password };
}

async function verifyJwt(jwt, identity, aal) {
  const claims = claimsOf(jwt);
  check(claims.iss === base + '/auth/v1' && claims.sub === identity.id && claims.role === 'authenticated'
    && [claims.aud].flat().includes('authenticated') && claims.aal === aal && claims.exp > Date.now() / 1000,
  'Unexpected identity, audience, issuer or assurance level.');
  const validation = await request('/auth/v1/user', jwt);
  check(validation.status === 200 && validation.data?.id === identity.id, 'Auth rejected the session JWT.');
}

async function signIn(identity) {
  const sdk = client();
  const { data, error } = await sdk.auth.signInWithPassword({
    email: identity.email, password: identity.password,
  });
  check(!error && data?.session?.access_token, 'Password sign-in did not return a session.');
  const jwt = data.session.access_token;
  await verifyJwt(jwt, identity, 'aal1');
  return { sdk, jwt };
}

const privatePaths = [
  '/rest/v1/leads?select=id,coupon_code&limit=16',
  ...['order_requests', 'order_items', 'order_contacts', 'order_delivery', 'order_events', 'admin_users']
    .map(table => '/rest/v1/' + table + '?select=*&limit=1'),
];
const missingOrder = randomUUID();
const ordersMode = process.argv.includes('--orders');

function administrativeCommands(orderId) {
  return {
    prepare_driver_message: { p_order_id: orderId },
    confirm_delivery: { p_order_id: orderId, p_fee_cents: 3500 },
    transition_order: { p_order_id: orderId, p_expected_status: 'pendiente', p_status: 'confirmado' },
  };
}

function checkPersistedOrders() {
  const rows = sql(`select r.id, r.modality,
    r.subtotal_cents=38000 and r.status='pendiente'
      and c.customer_name='Contacto ficticio' and c.phone='0000000001'
      and (select count(*)=2 and sum(quantity)=4 and sum(quantity*unit_price_cents)=38000
        and bool_and(unit_price_cents=9500) from public.order_items where order_id=r.id)
      and case when r.modality='entrega' then
        d.recipient_name='Destinatario ficticio' and d.recipient_phone='0000000002'
        and c.written_address='Calle ficticia S/N, Col. Colonia ficticia, Temixco'
        and c.address_references='Puerta ficticia'
        and c.pin_latitude=18.85 and c.pin_longitude=-99.23
        and d.neighborhood='Colonia ficticia' and not d.coverage_confirmed and d.confirmed_fee_cents is null
      else d.order_id is null and c.written_address is null and c.pin_latitude is null end as matches
    from public.order_requests r join public.order_contacts c on c.order_id=r.id
    left join public.order_delivery d on d.order_id=r.id`);
  const delivery = rows.find(row => row.modality === 'entrega');
  check(rows.length === 2 && rows.every(row => uuid.test(row.id) && row.matches === true)
    && rows.some(row => row.modality === 'recogida') && delivery,
  'Persisted orders did not match the synthetic checkout fixtures.');
  console.log('PASS: exactly two orders, server totals, address, contact and pin match synthetic fixtures.');
  return delivery.id;
}

async function checkRestricted(label, jwt, commands) {
  const catalog = await request('/rest/v1/products?select=id&limit=1', jwt);
  check(catalog.status === 200 && catalog.data?.[0]?.id === 'bola-fuego-xl', label + ' catalog check failed.');
  for (const path of privatePaths) {
    const { status, data } = await request(path, jwt);
    check((status === 200 && Array.isArray(data) && data.length === 0)
      || ([401, 403].includes(status) && data?.code === '42501'),
    label + ' unexpected private REST response (HTTP ' + status + ').');
  }
  for (const [name, params] of Object.entries(commands)) {
    const { status, data } = await request('/rest/v1/rpc/' + name, jwt, params);
    check([401, 403].includes(status) && data?.code === '42501',
      label + ' administrative RPC ' + name + ' was not denied (HTTP ' + status + ').');
  }
  console.log('PASS: ' + label + ' catalog, seven private REST reads and three administrative RPC denials.');
}

async function run() {
  const settings = await request('/auth/v1/settings');
  check(settings.status === 200 && settings.data?.external?.email === true, '5B email/password provider unavailable.');
  console.log('Auth settings: email provider active; signup disabled=' + (settings.data.disable_signup === true) + '.');
  const before = sql('select (select count(*) from auth.users) as users, (select count(*) from public.admin_users) as admins, (select count(*) from public.order_requests) as orders')[0];
  check(before?.users === (ordersMode ? 2 : 0) && before?.admins === 0 && before?.orders === (ordersMode ? 2 : 0),
    'Unexpected initial users, memberships or orders for the selected 5B test.');
  const orderId = ordersMode ? checkPersistedOrders() : missingOrder;
  const commands = administrativeCommands(orderId);
  await checkRestricted('anon', undefined, commands);

  const provisioner = client(provisioningKey);
  const ordinary = await createIdentity('ordinary', provisioner);
  const admin = await createIdentity('admin', provisioner);
  const ordinarySession = await signIn(ordinary);
  const adminSession = await signIn(admin);
  console.log('PASS: both real AAL1 JWTs validated by Auth with the 5B issuer.');

  try {
    const allow = sql("insert into public.admin_users(user_id) values ('" + admin.id + "'::uuid) returning user_id");
    check(allow?.[0]?.user_id === admin.id, 'Could not verify the temporary admin membership.');
    await checkRestricted('authenticated ordinary AAL1', ordinarySession.jwt, commands);
    await checkRestricted('allowlisted admin AAL1', adminSession.jwt, commands);

    const { data: factor, error: enrollError } = await adminSession.sdk.auth.mfa.enroll({
      factorType: 'totp', friendlyName: 'BAKU 5B Auth test',
    });
    check(!enrollError && factor?.id && factor?.totp?.secret, 'TOTP enrollment failed.');
    if (Date.now() % 30000 > 26000) await new Promise(resolve => setTimeout(resolve, 4200));
    const { data: verified, error: verifyError } = await adminSession.sdk.auth.mfa.challengeAndVerify({
      factorId: factor.id, code: totp(factor.totp.secret),
    });
    check(!verifyError && verified?.access_token, 'Real TOTP challenge failed.');
    const jwt = verified.access_token;
    await verifyJwt(jwt, admin, 'aal2');

    const leads = await request('/rest/v1/leads?select=id', jwt);
    check(leads.status === 200 && Array.isArray(leads.data) && leads.data.length === 16,
      'AAL2 admin could not read the isolated fixture.');
    const rpc = name => request('/rest/v1/rpc/' + name, jwt, commands[name]);
    const pending = await rpc('prepare_driver_message');
    check(pending.status === 400 && pending.data?.code === '22023',
      'AAL2 admin did not reach the dispatch readiness check.');
    if (ordersMode) {
      const fee = await rpc('confirm_delivery');
      check([200, 204].includes(fee.status), 'AAL2 could not confirm synthetic delivery coverage and fee.');
      const confirmation = await rpc('transition_order');
      check([200, 204].includes(confirmation.status), 'AAL2 could not confirm the synthetic order.');
      const dispatch = await rpc('prepare_driver_message');
      const expected = [
        'Folio: ' + orderId,
        'Recibe: Destinatario ficticio',
        'Teléfono: 0000000002',
        'Dirección: Calle ficticia S/N, Col. Colonia ficticia, Temixco',
        'Referencias: Puerta ficticia',
        'Navegación: https://www.google.com/maps/dir/?api=1&destination=18.850000%2C-99.230000',
      ].join('\n');
      check(dispatch.status === 200 && dispatch.data === expected, 'Dispatch message does not match its allowed fields.');
      console.log('PASS: real TOTP/AAL2, approved dispatch fields only, with no message sent.');
    } else {
      console.log('PASS: real TOTP/AAL2, fixture visible to admin, and dispatch reached its missing-order check.');
    }
  } finally {
    const removed = sql("delete from public.admin_users where user_id = '" + admin.id + "'::uuid returning user_id");
    check(removed.length <= 1 && (removed.length === 0 || removed[0].user_id === admin.id),
      'Temporary admin membership cleanup could not be verified.');
    const after = sql('select (select count(*) from auth.users) as users, (select count(*) from public.admin_users) as admins, (select count(*) from public.order_requests) as orders')[0];
    check(after?.users === before.users + 2 && after?.admins === 0 && after?.orders === before.orders,
      'Unexpected final Auth or order counts.');
    console.log('PASS: temporary admin membership removed and order count unchanged.');
  }
}

try {
  await run();
} catch (error) {
  // Only explicit test labels and status codes belong in output. SDK responses may contain credentials.
  if (error instanceof ProbeError) console.error(error.message);
  else console.error('5B Auth integration did not complete.');
  process.exitCode = 1;
}
