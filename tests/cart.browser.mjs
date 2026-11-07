import { spawn } from 'node:child_process';
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
  await evaluate("window.open = url => { window.sentMessage = new URL(url).searchParams.get('text'); }");
  await click('.cart-checkout button[type=submit]');
  await check("window.sentMessage.includes('3 × Bola de Fuego XL') && window.sentMessage.includes('1 × Bola de Fuego XL') && window.sentMessage.includes('Sin salsa encima') && window.sentMessage.includes('Con salsa de anguila') && window.sentMessage.includes('Mayo chipotle') && window.sentMessage.includes('$380 MXN') && window.sentMessage.includes('Total de bolas: 4') && window.sentMessage.includes('Rubén Jaramillo, Temixco')");
  await evaluate("const mode = document.querySelector('.cart-checkout select'); mode.value = 'entrega'; mode.dispatchEvent(new Event('change', {bubbles:true})); window.sentMessage = ''");
  await wait();
  await click('.cart-checkout button[type=submit]');
  await check("window.sentMessage === ''");
  await evaluate("const input = document.querySelector('input[name=colonia]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Colonia de prueba'); input.dispatchEvent(new Event('input', {bubbles:true}))");
  await wait();
  await click('.cart-checkout button[type=submit]');
  await check("window.sentMessage.includes('Colonia de prueba') && window.sentMessage.includes('$35 MXN cerca') && window.sentMessage.includes('$55 MXN lejos') && window.sentMessage.includes('$380 MXN') && window.sentMessage.includes('pendientes de confirmación')");
  for (const width of [360,390,430,768,1024,1440]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height:900, deviceScaleFactor:1, mobile:false });
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
  console.log('PASS: different personalizations, three identical units, double click, editing, quantities, deletion, persistence, subtotal, WhatsApp, delivery, obsolete and malformed storage.');
} finally {
  ws?.close();
  edge.kill();
  server.close();
}
