import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Controller } from '../../src/supervisor/controller.js';

async function fixture(t, execute = async () => ({ stdout: '' }), getPublished = async () => '0.2.1-rc.5') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dpm-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const installRoot = path.join(root, 'install');
  await mkdir(path.join(installRoot, 'node_modules/@deepseek-ai/dsh'), { recursive: true });
  await writeFile(path.join(installRoot, 'node_modules/@deepseek-ai/dsh/package.json'), '{"version":"0.2.1-rc.5"}');
  return new Controller({ installRoot, service: 'example.service', channel: 'latest' }, execute, getPublished);
}

test('a null target cannot turn no-update into an update operation', async t => {
  const c = await fixture(t);
  await assert.rejects(c.accept('update', null), /update/i);
});
test('normal status uses cached metadata but explicit refresh bypasses it', async t => {
  let calls = 0;
  const c = await fixture(t, undefined, async () => ++calls === 1 ? '0.2.1-rc.5' : '0.2.1');
  assert.equal((await c.status()).update, null);
  assert.equal((await c.status()).update, null);assert.equal(calls, 1);
  assert.equal((await c.status(true)).update, '0.2.1');assert.equal(calls, 2);
});
test('rejects concurrent update requests before registry IO completes', async t => {
  let release;
  const c = await fixture(t, undefined, () => new Promise(resolve => { release = resolve; }));
  const first = c.accept('update', '0.2.1');
  await assert.rejects(c.accept('restart'), /Another/);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  release('0.2.1');
  await first;
});
test('restart delegates to the service manager and waits for HTTP readiness', async t => {
  const calls = [];
  const c = await fixture(t, async (...args) => { calls.push(args); return { stdout: '' }; });
  c.waitReady = async () => calls.push('ready');
  await c.accept('restart'); await c.run();
  assert.deepEqual(calls[0].slice(0, 2), ['/usr/bin/systemctl', ['restart', 'example.service']]);
  assert.equal(calls[1], 'ready'); assert.equal(c.operation.phase, 'done');
});
test('shutdown stops only Harness, and never shuts down the OS or launches a helper', async t => {
  const calls = [];
  const c = await fixture(t, async (...args) => { calls.push(args); return { stdout: '' }; });
  await c.accept('shutdown'); await c.run();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 2), ['/usr/bin/systemctl', ['stop', 'example.service']]);
});

test('failed update readiness restores the prior install and starts it again', async t => {
  const calls = [];
  let c;
  c = await fixture(t, async (command, args) => {
    calls.push([command, args]);
    if (command.endsWith('/id')) return { stdout: String(args[0] === '-u' ? process.getuid() : process.getgid()) };
    if (args.includes('install')) {
      const stage = args[args.indexOf('--prefix') + 1];
      await mkdir(path.join(stage, 'node_modules/@deepseek-ai/dsh'), { recursive: true });
      await writeFile(path.join(stage, 'node_modules/@deepseek-ai/dsh/package.json'), '{"version":"0.2.1"}');
    }
    return { stdout: '0.2.1' };
  }, async () => '0.2.1');
  Object.assign(c.config, { user: 'example', home: os.tmpdir(), node: '/node', npm: '/npm' });
  let checks = 0;
  c.waitReady = async () => { if (++checks === 1) throw new Error('incompatible plugin'); };
  await c.accept('update', '0.2.1'); await c.run();
  assert.equal(c.operation.phase, 'failed');assert.match(c.operation.error, /previous install restored/);
  assert.equal(await c.installedVersion(), '0.2.1-rc.5');
  assert.deepEqual(calls.filter(([cmd]) => cmd.endsWith('/systemctl')).map(([, args]) => args[0]), ['stop', 'start', 'stop', 'start']);
  assert.equal(checks, 2);
});
