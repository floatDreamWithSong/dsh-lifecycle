import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LoginGateway } from '../../lib/gateway.js';
import { setPassword } from '../../lib/store.js';
import { generateTOTP } from '../../lib/totp.js';
import { _resetMasterKeyCache } from '../../lib/otp-crypto.js';

let home, upstream, gateway, jar, csrf, port, upgradedSockets;
const password = 'Admin-Test-Password!';
async function start() {
  gateway = new LoginGateway({ listenHost: '127.0.0.1', listenPort: 0, upstreamHost: '127.0.0.1', upstreamPort: upstream.address().port });
  gateway.onError = error => console.error(error);
  await gateway.start();port = gateway.address().port;
}
async function request(endpoint, body, headers = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${endpoint}`, { redirect: 'manual', method: body ? 'POST' : 'GET', headers: {
    Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), ...(body ? { 'Content-Type': 'application/json', 'X-Lifecycle-CSRF': csrf } : {}), ...headers,
  }, body: body ? JSON.stringify(body) : undefined });
  for (const cookie of response.headers.getSetCookie()) { const [key, value] = cookie.split(';')[0].split('=');if (value) jar.set(key, value);else jar.delete(key); }
  const text = await response.text();
  const data = response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : text;
  return { status: response.status, data, headers: response.headers };
}
beforeEach(async () => {
  home = mkdtempSync(path.join(os.tmpdir(), 'lifecycle-http-'));process.env.DSH_HOME = home;_resetMasterKeyCache();
  await setPassword(password);
  upstream = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' });res.end('{"workspace":true}'); });
  upgradedSockets = new Set();
  upstream.on('upgrade', (req, socket) => {
    upgradedSockets.add(socket);socket.once('close', () => upgradedSockets.delete(socket));
    socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');
  });
  upstream.listen(0, '127.0.0.1');await once(upstream, 'listening');
  jar = new Map();await start();csrf = (await request('/lifecycle/state')).data.csrf;
});
afterEach(async () => { await gateway.close();for (const socket of upgradedSockets) socket.destroy();upstream.closeAllConnections();await new Promise(resolve => upstream.close(resolve));delete process.env.DSH_HOME;rmSync(home, { recursive: true, force: true }); });

test('normal restart keeps the same browser authenticated; locking revokes it across restart', async () => {
  assert.equal((await request('/api/private')).status, 401);
  assert.equal((await request('/lifecycle/login', { method: 'password', password })).status, 200);
  const bearer = jar.get('dsh_auth');await gateway.close();await start();
  assert.equal((await request('/api/private')).status, 200);assert.equal(jar.get('dsh_auth'), bearer);
  csrf = (await request('/lifecycle/state')).data.csrf;
  assert.equal((await request('/lifecycle/lock', {})).status, 200);
  await gateway.close();await start();jar.set('dsh_auth', bearer);
  assert.equal((await request('/api/private')).status, 401);
});
test('single OTP login works only in single mode; two-step login requires password first', async () => {
  await request('/lifecycle/login', { method: 'password', password });
  const setup = await request('/otp/enable', { password }), secret = setup.data.secret;
  const code = generateTOTP(secret);
  const enabled = await request('/otp/verify-setup', { otp: code });assert.equal(enabled.status, 200);assert.equal(enabled.data.backupCodes.length, 10);
  assert.equal((await request('/lifecycle/login', { method: 'otp', code })).status, 200);
  assert.equal((await request('/api/private')).status, 200);
  assert.equal((await request('/lifecycle/security/policy', { password, twoFactor: true, publicOrigin: '' })).status, 200);
  assert.equal((await request('/lifecycle/login', { method: 'backup', code: enabled.data.backupCodes[0] })).status, 401);
  const pending = await request('/lifecycle/login', { method: 'password', password });assert.equal(pending.data.stage, 'factor');
  assert.equal((await request('/api/private')).status, 401);
  assert.equal((await request('/lifecycle/login', { method: 'backup', code: enabled.data.backupCodes[0] })).status, 200);
  assert.equal((await request('/api/private')).status, 200);
  await gateway.close();await start();assert.equal((await request('/api/private')).status, 200);
});
test('partial password verification is lost on restart, not promoted into a full session', async () => {
  await request('/lifecycle/login', { method: 'password', password });
  const setup = await request('/otp/enable', { password });
  await request('/otp/verify-setup', { otp: generateTOTP(setup.data.secret) });
  await request('/lifecycle/login', { method: 'password', password });
  await request('/lifecycle/security/policy', { password, twoFactor: true, publicOrigin: '' });
  await request('/lifecycle/login', { method: 'password', password });
  await gateway.close();await start();assert.equal((await request('/api/private')).status, 401);
  assert.equal((await request('/lifecycle/state')).data.pendingFactor, false);
});
test('rejects CSRF, cross-site logins, wrong passwords and unauthenticated WebSockets', async () => {
  assert.equal((await request('/lifecycle/login', { method: 'password', password }, { 'X-Lifecycle-CSRF': 'wrong' })).status, 403);
  assert.equal((await request('/lifecycle/login', { method: 'password', password }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await request('/lifecycle/login', { method: 'password', password: 'wrong' })).status, 401);
  const socket = net.connect(port, '127.0.0.1');socket.write('GET /ws HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');await once(socket, 'close');
});
test('locking immediately disconnects an already authenticated WebSocket', async () => {
  await request('/lifecycle/login', { method: 'password', password });
  const socket = net.connect(port, '127.0.0.1');
  const cookies = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  socket.write(`GET /ws HTTP/1.1\r\nHost: localhost\r\nCookie: ${cookies}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`);
  const [data] = await once(socket, 'data', { signal: AbortSignal.timeout(2000) });
  assert.match(data.toString(), /101 Switching Protocols/);
  const closed = once(socket, 'close', { signal: AbortSignal.timeout(2000) });
  await request('/lifecycle/lock', {});await closed;
});
test('fresh setup forces a new password before upstream access', async () => {
  await gateway.close();await setPassword(password, { initial: true });await start();csrf = (await request('/lifecycle/state')).data.csrf;
  const login = await request('/lifecycle/login', { method: 'password', password });assert.equal(login.data.stage, 'setup');
  assert.equal((await request('/api/private')).status, 401);
  assert.equal((await request('/lifecycle/password', { password, newPassword: 'Personal-Password-456!' })).status, 200);
  assert.equal((await request('/api/private')).status, 200);
});

test('wallpaper library requires Admin, persists selection across restart, and restores built-in on deletion', async () => {
  assert.equal((await request('/lifecycle/wallpapers')).status, 401);
  await request('/lifecycle/login', { method: 'password', password });
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPioAAAAASUVORK5CYII=', 'base64');
  const upload = () => fetch(`http://127.0.0.1:${port}/lifecycle/wallpapers/upload?name=Custom.png`, { method: 'POST', headers: { Cookie: [...jar].map(([k,v])=>`${k}=${v}`).join('; '), 'Content-Type':'image/png', 'X-Lifecycle-CSRF':csrf }, body:image });
  let res = await upload();assert.equal(res.status,201);const item=(await res.json()).item;
  assert.equal((await request('/lifecycle/wallpapers')).data.items.length,1);
  assert.equal((await request('/lifecycle/wallpapers/select',{id:item.id})).status,200);
  await gateway.close();await start();csrf=(await request('/lifecycle/state')).data.csrf;
  assert.equal((await request('/lifecycle/wallpapers')).data.selected,item.id);
  res=await fetch(`http://127.0.0.1:${port}/lifecycle/wallpaper/current`);assert.equal(res.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await res.arrayBuffer()),image);
  assert.equal((await request('/lifecycle/wallpapers/delete',{id:'../../password.json'})).status,400);
  assert.equal((await request('/lifecycle/wallpapers/delete',{id:item.id})).status,200);
  assert.equal((await request('/lifecycle/wallpapers')).data.selected,null);
  await request('/lifecycle/lock',{});
  assert.equal((await upload()).status,401);
  assert.equal((await request('/lifecycle/wallpapers')).status,401);
  assert.equal((await fetch(`http://127.0.0.1:${port}/lifecycle/wallpaper/current`)).status,200);
});

test('wallpaper uploads enforce authentication, CSRF, raster formats and streaming size limits', async()=>{
  const upload=(bytes,type='image/png',token=csrf)=>fetch(`http://127.0.0.1:${port}/lifecycle/wallpapers/upload?name=test`,{method:'POST',headers:{Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),'Content-Type':type,'X-Lifecycle-CSRF':token},body:bytes});
  assert.equal((await upload(Buffer.from('no'))).status,401);
  await request('/lifecycle/login',{method:'password',password});
  assert.equal((await upload(Buffer.from('no'),'image/png','wrong')).status,403);
  assert.equal((await upload(Buffer.from('<svg onload="alert(1)"/>'),'image/svg+xml')).status,400);
  assert.equal((await upload(Buffer.alloc(5*1024*1024+1))).status,413);
  assert.equal((await request('/lifecycle/wallpapers')).data.items.length,0);
});
