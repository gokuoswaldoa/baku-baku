import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const profile = resolve('.validacion-baku/edge-profile-' + process.pid);
const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const file = resolve(root, '.' + decodeURIComponent(req.url === '/' ? '/index.html' : req.url));
    if (!file.startsWith(root + sep)) throw Error('Invalid path');
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--disable-gpu', '--disable-background-networking', '--no-first-run',
  '--remote-debugging-port=0', '--user-data-dir=' + profile,
  'about:blank',
], { windowsHide: true, stdio: 'ignore' });
let ws;
let tileFailure = false;
let vite;
let intake;
try {
  let port;
  for (let attempt = 0; attempt < 80; attempt++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0].trim(); if (port) break; } catch {}
    await new Promise(done => setTimeout(done, 250));
  }
  if (!port) throw Error('Edge did not expose its debugging port');
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, fail) => { ws.onopen = done; ws.onerror = fail; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.method === 'Fetch.requestPaused') {
      const requestId = msg.params.requestId;
      const tile = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVnUAAAAASUVORK5CYII=';
      void (tileFailure
        ? call('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' })
        : call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/png' }, { name: 'Cache-Control', value: 'no-store' }], body: tile }));
      return;
    }
    if (msg.id && pending.has(msg.id)) {
      const { done, fail } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) fail(Error(msg.error.message)); else done(msg.result);
    }
  };
  const call = (method, params = {}) => new Promise((done, fail) => {
    pending.set(++id, { done, fail });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await call('Page.enable');
  await call('Network.enable');
  await call('Network.setCacheDisabled', {cacheDisabled: true});
  await call('Fetch.enable', {patterns: [{urlPattern: 'https://tile.openstreetmap.org/*'}]});
  await call('Page.navigate', { url: 'http://127.0.0.1:' + server.address().port });
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await evaluate("Boolean(document.querySelector('.order')) && [...document.images].every(img => img.complete)")) break;
    await new Promise(done => setTimeout(done, 200));
  }

  const check = async expression => {
    const result = await evaluate(expression);
    if (result !== true) throw Error('Check failed: ' + expression + ' -> ' + JSON.stringify(result));
  };
  const wait = () => new Promise(done => setTimeout(done, 80));
  const click = async selector => { await evaluate('document.querySelector(' + JSON.stringify(selector) + ').click()'); await wait(); };
  const reload = async () => {
    await call('Page.reload');
    await wait();
    for (let attempt = 0; attempt < 50; attempt++) {
      if (await evaluate("Boolean(document.querySelector('.cart-section'))")) break;
      await new Promise(done => setTimeout(done, 100));
    }
  };
  await check("document.querySelectorAll('.cart-item').length === 0");
  await click('.order-panel button[type=submit]');
  await check("document.querySelectorAll('.cart-item').length === 0");
  await click('input[name=salsa]');
  await evaluate("document.querySelector('.order-panel button[type=submit]').click(); document.querySelector('.order-panel button[type=submit]').click()");
  await wait();
  await check("document.querySelectorAll('.cart-item').length === 1 && document.querySelector('.cart-controls select').value === '1'");
  await new Promise(done => setTimeout(done, 650));
  await click('.order-panel button[type=submit]');
  await new Promise(done => setTimeout(done, 650));
  await click('.order-panel button[type=submit]');
  await check("document.querySelectorAll('.cart-item').length === 1 && document.querySelector('.cart-controls select').value === '3'");
  await new Promise(done => setTimeout(done, 650));
  await evaluate("document.querySelectorAll('input[name=salsa]')[1].click()");
  await click('.order-panel button[type=submit]');
  await check("document.querySelectorAll('.cart-item').length === 2");
  await evaluate("const select = document.querySelector('.cart-controls select'); select.value = '3'; select.dispatchEvent(new Event('change', {bubbles:true}))");
  await wait();
  await check("document.querySelector('.cart-subtotal').textContent.includes('4 bolas') && document.querySelector('.cart-subtotal').textContent.includes('$380')");
  await click('[aria-label="Editar bola 1"]');
  await click('input[name=acabado]:not(:checked)');
  await new Promise(done => setTimeout(done, 650));
  await click('.order-panel button[type=submit]');
  await check("document.querySelectorAll('.cart-item')[0].textContent.includes('Sin salsa encima') && document.querySelectorAll('.cart-item')[1].textContent.includes('Con salsa de anguila')");
  await click('[aria-label="Aumentar cantidad de bola 2"]');
  await click('[aria-label="Reducir cantidad de bola 2"]');
  await evaluate("window.savedCart = localStorage.getItem('baku-cart-v1')");
  const saved = await evaluate("window.savedCart");
  await reload();
  await check("document.querySelectorAll('.cart-item').length === 2 && document.querySelector('.cart-controls select').value === '3' && document.querySelector('.cart-subtotal').textContent.includes('$380')");

  const enter = async (name, value) => {
    await evaluate(`(() => {
      const field = document.querySelector('input[name=' + ${JSON.stringify(name)} + ']');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, ${JSON.stringify(value)});
      field.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await wait();
  };
  const ready = async expression => {
    for (let attempt = 0; attempt < 35; attempt++) {
      if (await evaluate(expression)) return;
      await wait();
    }
    throw Error('Checkout condition did not become ready: ' + expression);
  };
  const review = '.cart-checkout button[type=submit]';
  await click(review);
  await check("!document.querySelector('.checkout-preview') && !document.querySelector('input[name=street]')");
  await enter('customerName', 'Contacto ficticio');
  await enter('customerPhone', '0000000001');
  await click(review);
  await check("document.querySelector('.checkout-preview textarea').value.includes('3 × Bola de Fuego XL') && document.querySelector('.checkout-preview textarea').value.includes('Mayo chipotle') && document.querySelector('.checkout-preview textarea').value.includes('$380 MXN') && document.querySelector('.checkout-preview textarea').value.includes('Rubén Jaramillo, Temixco') && !document.querySelector('.checkout-preview textarea').value.includes('Dirección:')");
  await check("new URL(document.querySelector('.checkout-preview a.action').href).search === ''");
  await evaluate("const mode = document.querySelector('.cart-checkout select'); mode.value = 'entrega'; mode.dispatchEvent(new Event('change', {bubbles:true}));");
  await wait();
  await click(review);
  await check("!document.querySelector('.checkout-preview') && !document.querySelector('.delivery-map')");
  for (const [name, value] of Object.entries({
    recipientName: 'Destinatario ficticio', recipientPhone: '0000000002',
    street: 'Calle ficticia', exterior: 'S/N', interior: 'B', colonia: 'Colonia ficticia',
    municipality: 'Temixco', postalCode: '00000', references: 'Puerta ficticia',
  })) await enter(name, value);
  await click(review);
  await check("!document.querySelector('.checkout-preview')");
  await enter('latitude', '91');
  await enter('longitude', '-99.23');
  await click(review);
  await check("!document.querySelector('.checkout-preview')");

  await evaluate("window.geoRequests = 0; Object.defineProperty(navigator.geolocation, 'getCurrentPosition', {value: callback => { window.geoRequests++; callback({coords:{latitude:18.85,longitude:-99.23}}); }});");
  await check('window.geoRequests === 0');
  await click('.checkout-map-actions button:nth-child(2)');
  await check("window.geoRequests === 1 && document.querySelector('input[name=latitude]').value === '18.850000'");
  await click('.checkout-map-actions button:first-child');
  await ready("Boolean(document.querySelector('.leaflet-tile-loaded') && document.querySelector('.delivery-pin-marker'))");
  await check("document.querySelector('.leaflet-control-attribution a[href*=openstreetmap]') !== null");
  await evaluate(`(() => {
    const map = document.querySelector('.delivery-map');
    const rect = map.getBoundingClientRect();
    map.dispatchEvent(new MouseEvent('click', {bubbles:true,clientX:rect.left+rect.width/3,clientY:rect.top+rect.height/3}));
  })()`);
  await ready("document.querySelector('input[name=latitude]').value !== '18.850000'");
  const previousPin = await evaluate("document.querySelector('input[name=latitude]').value");
  const markerPoint = await evaluate(`(() => {
    const marker = document.querySelector('.delivery-pin-marker');
    marker.scrollIntoView({block:'center'});
    const rect = marker.getBoundingClientRect();
    return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
  })()`);
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...markerPoint, button: 'left', buttons: 1, clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: markerPoint.x + 20, y: markerPoint.y + 22, button: 'left', buttons: 1 });
  await wait();
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: markerPoint.x + 20, y: markerPoint.y + 22, button: 'left', clickCount: 1 });
  await ready("document.querySelector('input[name=latitude]').value !== " + JSON.stringify(previousPin));

  await click('.checkout-map-actions button:first-child');
  tileFailure = true;
  await click('.checkout-map-actions button:first-child');
  // Move to uncached tiles so the browser cannot reuse the earlier decoded images.
  await enter('latitude', '18.90');
  await ready("document.querySelector('.checkout-location').textContent.includes('El mapa no pudo cargar')");
  await enter('latitude', '18,85');
  await enter('longitude', '-99.23');
  await click(review);
  await check(`(() => {
    const message = document.querySelector('.checkout-preview textarea').value;
    return ['Contacto ficticio','0000000001','Destinatario ficticio','0000000002','Calle ficticia S/N, interior B','Colonia ficticia','C. P. 00000','Puerta ficticia','Pin: 18.85, -99.23','$35 MXN cerca','$55 MXN lejos','$380 MXN','pendientes de confirmación'].every(value => message.includes(value))
      && !message.includes('google.com/maps') && !new URL(document.querySelector('.checkout-preview a.action').href).search;
  })()`);
  await evaluate("Object.defineProperty(navigator.clipboard, 'writeText', {value: async text => {window.copiedOrder = text;}})");
  await click('.checkout-preview button');
  await check("window.copiedOrder === document.querySelector('.checkout-preview textarea').value && !JSON.stringify(localStorage).includes('ficticio') && !JSON.stringify(localStorage).includes('0000000001')");
  for (const width of [360,390,430,768,1024,1440]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height:900, deviceScaleFactor:1, mobile:width < 600 });
    const stats = await evaluate("({ width:innerWidth, client:document.documentElement.clientWidth, scroll:document.documentElement.scrollWidth })");
    if (stats.scroll > stats.client) throw Error(JSON.stringify(stats));
    console.log(JSON.stringify(stats));
    if (width === 390 || width === 1440) {
      const { cssContentSize: size } = await call('Page.getLayoutMetrics');
      const { data } = await call('Page.captureScreenshot', { captureBeyondViewport:true, clip:{x:0,y:0,width,height:Math.ceil(size.height),scale:1} });
      await writeFile('.validacion-baku/cart-' + width + '.png', Buffer.from(data,'base64'));
    }
  }
  await click('[aria-label="Eliminar bola 2"]');
  await check("document.querySelectorAll('.cart-item').length === 1 && document.querySelector('.cart-subtotal').textContent.includes('$285')");
  await evaluate("const quantity = document.querySelector('.cart-controls select'); quantity.value = '0'; quantity.dispatchEvent(new Event('change', {bubbles:true}))");
  await wait();
  await check("document.querySelector('.cart-subtotal').textContent.includes('$285')");
  // An obsolete option, invalid quantity, and a duplicate identifier must all be discarded.
  await evaluate("const saved = JSON.parse(localStorage.getItem('baku-cart-v1')); const good = saved.items[0]; saved.items.push({...good, id:'obsolete', dip:'Dip retirado'}, {...good, id:'negative', quantity:-2}, {...good, id:'fraction', quantity:1.5}, {...good}); localStorage.setItem('baku-cart-v1',JSON.stringify(saved))");
  await reload();
  await check("document.querySelectorAll('.cart-item').length === 1 && Boolean(document.querySelector('.cart-warning')) && document.querySelector('.cart-checkout button[type=submit]').disabled");
  await click('.cart-warning button');
  await check("!document.querySelector('.cart-checkout button[type=submit]').disabled");
  await evaluate("localStorage.setItem('baku-cart-v1', '{broken')");
  await reload();
  await check("document.querySelectorAll('.cart-item').length === 0 && Boolean(document.querySelector('.cart-warning'))");
  console.log('PASS: different personalizations, three identical units, double click, editing, quantities, deletion, persistence, subtotal, pickup, contact validation, pin click/drag, explicit geolocation, map failure, private WhatsApp copy, delivery, obsolete and malformed storage.');

  const requests = [];
  const folio = '12345678-0000-4000-8000-000000000001';
  const localJwt = 'test-gateway-jwt';
  const localToken = 'test-intake-token';
  intake = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({ url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() });
    // Simulate a lost success response, then replay and a catalog rejection.
    const status = [503, 200, 422, 200][requests.length - 1] ?? 500;
    const payload = status === 200 ? { id: folio, subtotal_cents: 38000 } : { error: 'test_error' };
    res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(payload));
  });
  await new Promise(done => intake.listen(0, '127.0.0.1', done));
  process.env.VITE_ORDER_INTAKE_LOCAL = 'true';
  process.env.ORDER_LOCAL_SUPABASE_URL = 'http://127.0.0.1:' + intake.address().port;
  process.env.ORDER_LOCAL_GATEWAY_JWT = localJwt;
  process.env.ORDER_LOCAL_INTAKE_TOKEN = localToken;
  const { createServer: createVite } = await import('vite');
  vite = await createVite();
  await vite.listen();
  const localOrigin = 'http://127.0.0.1:5173';
  const route = localOrigin + '/api/checkout/submit-order';
  assert.equal((await fetch(route, { method: 'POST', headers: { origin: 'https://untrusted.test' } })).status, 403);
  assert.equal((await fetch(route)).status, 403);
  assert.equal(requests.length, 0);
  const clientModule = await (await fetch(localOrigin + '/src/checkout-submission.ts')).text();
  assert.equal(clientModule.includes(localToken) || clientModule.includes(localJwt), false);
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
  await call('Page.navigate', { url: localOrigin });
  await ready("Boolean(document.querySelector('.order-panel'))");
  await evaluate('localStorage.setItem("baku-cart-v1", ' + JSON.stringify(saved) + ')');
  await reload();
  await check("document.querySelector('.cart-checkout button[type=submit]').textContent.includes('Registrar solicitud')");
  await click(review);
  assert.equal(requests.length, 0);
  await evaluate("const mode = document.querySelector('.cart-checkout select'); mode.value = 'entrega'; mode.dispatchEvent(new Event('change', {bubbles:true}));");
  await ready("Boolean(document.querySelector('input[name=street]'))");
  for (const [name, value] of Object.entries({
    customerName: 'Contacto ficticio', customerPhone: '0000000001', recipientName: 'Destinatario ficticio',
    recipientPhone: '0000000002', street: 'Calle ficticia', exterior: 'S/N', colonia: 'Colonia ficticia',
    municipality: 'Temixco', references: 'Puerta ficticia',
  })) await enter(name, value);
  await click('.checkout-map-actions button:nth-child(2)');
  await enter('latitude', '18.85');
  await enter('longitude', '-99.23');
  await evaluate(`document.querySelector('${review}').click(); document.querySelector('${review}').click()`);
  await ready("document.querySelector('.cart-checkout > div:last-child > [role=status]').textContent.includes('Reintenta')");
  assert.equal(requests.length, 1);
  await check("!document.querySelector('.checkout-preview')");
  await enter('street', 'Calle editada');
  await click('.cart-checkout > div:last-child > .cart-text-button');
  await ready("Boolean(document.querySelector('.checkout-preview textarea'))");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].body, requests[1].body);
  assert.equal(requests[0].headers['idempotency-key'], requests[1].headers['idempotency-key']);
  assert.equal(requests[0].url, '/functions/v1/submit-order');
  assert.equal(requests[0].headers['x-intake-token'], localToken);
  assert.equal(requests[0].headers.authorization, 'Bearer ' + localJwt);
  const deliveryPayload = JSON.parse(requests[0].body);
  assert.equal(deliveryPayload.items.length, 2);
  assert.equal(deliveryPayload.contact.recipient_phone, '0000000002');
  assert.equal(deliveryPayload.contact.latitude, 18.85);
  assert.equal(deliveryPayload.contact.longitude, -99.23);
  assert.equal(deliveryPayload.contact.address, 'Calle ficticia S/N, Col. Colonia ficticia, Temixco');
  await check(`(() => {
    const message = document.querySelector('.checkout-preview textarea').value;
    return message.includes('${folio}') && message.includes('Calle ficticia') && !message.includes('Calle editada')
      && message.includes('$380 MXN') && message.includes('pendientes de confirmación')
      && new URL(document.querySelector('.checkout-preview a.action').href).search === ''
      && !JSON.stringify(localStorage).includes('ficticio') && !JSON.stringify(sessionStorage).includes('0000000001')
      && document.documentElement.scrollWidth === document.documentElement.clientWidth;
  })()`);
  await evaluate("(() => { const mode = document.querySelector('.cart-checkout select'); mode.value = 'recogida'; mode.dispatchEvent(new Event('change', {bubbles:true})); })()");
  await click(review);
  await ready("document.querySelector('.cart-checkout > div:last-child > [role=status]').textContent.includes('disponibilidad')");
  await check("!document.querySelector('.checkout-preview')");
  assert.deepEqual(JSON.parse(requests[2].body).contact, { name: 'Contacto ficticio', phone: '0000000001' });
  await click(review);
  await ready("Boolean(document.querySelector('.checkout-preview textarea'))");
  await click(review);
  assert.equal(requests.length, 4);
  await check("!document.querySelector('.checkout-preview textarea').value.includes('Dirección:')");
  console.log('PASS: 390 px controlled Vite gateway, origin gate, contact-only pickup, delivery payload, duplicate clicks, stable retries, catalog rejection, folio, and no PII persistence.');
} finally {
  ws?.close();
  edge.kill();
  server.close();
  await vite?.close();
  intake?.close();
}
