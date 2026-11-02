import { build } from 'esbuild';
import http from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { LoginGateway } from '../lib/gateway.js';
import { setPassword } from '../lib/store.js';
import { _resetMasterKeyCache } from '../lib/otp-crypto.js';

const fixture=(await build({entryPoints:['tests/fixtures/native.jsx'],bundle:true,write:false,format:'iife',loader:{'.css':'text'}})).outputFiles[0].text;
let home, gateway;
const upstream = http.createServer((req, res) => {
  if(req.url==='/fixture.js'){res.setHeader('Content-Type','application/javascript');res.end(fixture);return;}
  if (req.url.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' });res.end('{"ok":true}');return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<html lang="zh"><meta name="viewport" content="width=device-width, initial-scale=1"><title>测试工作空间</title><body style="margin:0"><div id="fixture-root"></div><script src="/fixture.js"></script></body></html>');
});
upstream.listen(54623, '127.0.0.1');await once(upstream, 'listening');
async function start() {
  gateway = new LoginGateway({ listenHost: '127.0.0.1', listenPort: 54621, upstreamHost: '127.0.0.1', upstreamPort: 54623 });
  gateway.onError = error => console.error(error);await gateway.start();
}
async function reset(initial = false) {
  if (gateway) await gateway.close();if (home) rmSync(home, { recursive: true, force: true });
  home = mkdtempSync(path.join(os.tmpdir(), 'lifecycle-preview-'));process.env.DSH_HOME = home;_resetMasterKeyCache();
  await setPassword('Preview-Admin-123!', { initial });await start();
}
await reset();
// This control port belongs only to the test/preview fixture, never to the shipped plugin.
http.createServer(async (req, res) => {
  if (req.url.startsWith('/reset')) await reset(req.url.includes('initial=1'));
  else if (req.url === '/restart') { await gateway.close();await start(); }
  else { res.writeHead(404);res.end();return; }
  res.writeHead(200, { 'Content-Type': 'application/json' });res.end('{"ok":true}');
}).listen(54622, '127.0.0.1');
console.log('Lifecycle preview http://localhost:54621 — local fixture only, password Preview-Admin-123!');
