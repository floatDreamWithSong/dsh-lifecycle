import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const patch = readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8');
// Execute the shipped !!js scalars against CLI startup values. The consumer
// needs an external URL even though webServer.getOrigin() is the internal port.
const runtime = patch.split('- id: web-runtime\n')[1].split('\n- insert:')[0];
const evaluate = (key, webStartup) => {
  const expression = runtime.match(new RegExp(`^    ${key}: !!js (.+)$`, 'm'))?.[1];
  assert.ok(expression, `Missing web-runtime ${key} expression`);
  return vm.runInNewContext(expression, { ctx: { webStartup } });
};

test('browser handoff defaults to the login gateway rather than the internal listener', () => {
  assert.equal(evaluate('publicUrl', {}), 'http://127.0.0.1:3080');
});

test('browser handoff follows a custom CLI gateway port', () => {
  assert.equal(evaluate('publicUrl', { port: 4310 }), 'http://127.0.0.1:4310');
});

test('an explicit public URL keeps its HTTPS origin and path', () => {
  assert.equal(evaluate('publicUrl', { port: 4310, publicUrl: 'https://dsh.example.com/work/' }), 'https://dsh.example.com/work/');
});

test('the CLI no-open preference remains effective', () => {
  assert.equal(evaluate('openBrowser', { openBrowser: false }), false);
  assert.equal(evaluate('openBrowser', { openBrowser: true }), true);
});
