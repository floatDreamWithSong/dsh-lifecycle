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

test('macOS restart unloads gracefully and bootstraps only its configured LaunchAgent', async t => {
  const calls = [];
  const c = await fixture(t, async (command, args) => { calls.push([command, args]); return { stdout: '' }; });
  Object.assign(c.config, { backend: 'launchd', domain: 'gui/501', service: 'net.example.harness', plist: '/Users/example/Library/LaunchAgents/net.example.harness.plist' });
  c.waitReady = async () => calls.push('ready');
  await c.accept('restart'); await c.run();
  assert.deepEqual(calls, [
    ['/bin/launchctl', ['bootout', '--wait', 'gui/501/net.example.harness']],
    ['/bin/launchctl', ['bootstrap', 'gui/501', c.config.plist]], 'ready',
  ]);
  assert.equal(c.operation.phase, 'done');
});

test('macOS source builds retain power controls without querying or replacing the checkout', async t => {
  const calls = [];
  const c = await fixture(t, async (command, args) => { calls.push([command, args]); return { stdout: '' }; }, async () => { throw Error('Registry must not run for source builds'); });
  Object.assign(c.config, { backend: 'launchd', domain: 'gui/501', service: 'net.example.harness', sourceManifest: path.join(c.config.installRoot, 'node_modules/@deepseek-ai/dsh/package.json') });
  assert.equal((await c.status()).updateSupported, false);
  await assert.rejects(c.accept('update', '0.2.1'), /source workflow/);
  await c.accept('shutdown'); await c.run();
  assert.deepEqual(calls, [['/bin/launchctl', ['bootout', '--wait', 'gui/501/net.example.harness']]]);
  assert.equal(c.operation.phase, 'done');
});

test('Windows restarts only its fixed scheduled task and waits for stop and start readiness', async t => {
  const calls = [];
  const c = await fixture(t, async (command, args) => { calls.push([command, args]); return { stdout: '' }; });
  Object.assign(c.config, { backend: 'windows', service: 'DSH-Lifecycle-Example.Harness', taskTool: 'C:\\Windows\\System32\\schtasks.exe' });
  c.windowsStopped = async () => false;
  c.waitStopped = async () => calls.push('stopped');
  c.waitReady = async () => calls.push('ready');
  await c.accept('restart');await c.run();
  assert.deepEqual(calls, [
    [c.config.taskTool, ['/End', '/TN', c.config.service]], 'stopped',
    [c.config.taskTool, ['/Run', '/TN', c.config.service]], 'ready',
  ]);
  assert.equal(c.operation.phase, 'done');
  const info = await c.status();assert.match(info.platformNotice, /暂未实机验证/);
});

test('Windows does not start a replacement if stopping the managed task fails', async t => {
  const calls = [];
  const c = await fixture(t, async (command, args) => { calls.push(args); throw new Error('Task stop denied'); });
  Object.assign(c.config, { backend: 'windows', service: 'DSH-Lifecycle-Example.Harness', taskTool: 'C:\\Windows\\System32\\schtasks.exe' });
  c.windowsStopped = async () => false;
  await c.accept('restart');await c.run();
  assert.equal(c.operation.phase, 'failed');
  assert.equal(calls.length, 1);assert.equal(calls[0][0], '/End');
});

test('Windows npm updates use node plus npm-cli.js and restore the old tree on startup failure', async t => {
  const calls = [];
  let starts = 0;
  const c = await fixture(t, async (command, args) => {
    calls.push([command, args]);
    if (args.includes('install')) {
      const stage = args[args.indexOf('--prefix') + 1];
      await mkdir(path.join(stage, 'node_modules/@deepseek-ai/dsh'), { recursive: true });
      await writeFile(path.join(stage, 'node_modules/@deepseek-ai/dsh/package.json'), '{"version":"0.2.1"}');
    }
    if (args[0] === '/Run' && ++starts === 1) throw new Error('new task failed');
    return { stdout: '0.2.1' };
  }, async () => '0.2.1');
  Object.assign(c.config, { backend: 'windows', node: 'C:\\node.exe', npmCli: 'C:\\npm\\npm-cli.js', taskTool: 'C:\\Windows\\System32\\schtasks.exe', service: 'DSH-Lifecycle-Example.Harness', home: os.tmpdir() });
  c.windowsStopped = async () => false;c.waitStopped = async () => {};c.waitReady = async () => {};
  await c.accept('update', '0.2.1');await c.run();
  assert.equal(c.operation.phase, 'failed');assert.match(c.operation.error, /previous install restored/);
  assert.equal(await c.installedVersion(), '0.2.1-rc.5');
  assert.equal(calls[0][0], c.config.node);assert.equal(calls[0][1][0], c.config.npmCli);
  assert.equal(starts, 2);assert.equal(calls.some(([cmd]) => /\.cmd$|runuser|systemctl/.test(cmd)), false);
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

test('macOS npm updates stage as the desktop user and switch only the configured install', async t => {
  const calls = [];
  const c = await fixture(t, async (command, args) => {
    calls.push([command, args]);
    if (args.includes('install')) {
      const stage = args[args.indexOf('--prefix') + 1];
      await mkdir(path.join(stage, 'node_modules/@deepseek-ai/dsh'), { recursive: true });
      await writeFile(path.join(stage, 'node_modules/@deepseek-ai/dsh/package.json'), '{"version":"0.2.1"}');
    }
    return { stdout: '0.2.1' };
  }, async () => '0.2.1');
  Object.assign(c.config, { backend: 'launchd', domain: 'gui/501', service: 'net.example.harness', plist: '/Users/example/service.plist', node: '/node', npm: '/npm', home: os.tmpdir() });
  c.waitReady = async () => {};
  await c.accept('update', '0.2.1');await c.run();
  assert.equal(c.operation.phase, 'done');
  assert.equal(await c.installedVersion(), '0.2.1');
  assert.equal(calls[0][0], '/npm');
  assert.deepEqual(calls[1][1].slice(-1), ['--version']);
  assert.deepEqual(calls.filter(([cmd]) => cmd === '/bin/launchctl').map(([, args]) => args[0]), ['bootout', 'bootstrap']);
  assert.equal(calls.some(([cmd]) => cmd.includes('runuser') || cmd.includes('systemctl')), false);
});

test('macOS restores the old npm installation when the replacement job cannot bootstrap', async t => {
  let starts = 0, stops = 0;
  const c = await fixture(t, async (command, args) => {
    if (args.includes('install')) {
      const stage = args[args.indexOf('--prefix') + 1];
      await mkdir(path.join(stage, 'node_modules/@deepseek-ai/dsh'), { recursive: true });
      await writeFile(path.join(stage, 'node_modules/@deepseek-ai/dsh/package.json'), '{"version":"0.2.1"}');
    }
    if (command === '/bin/launchctl' && args[0] === 'bootstrap' && ++starts === 1) throw new Error('new launch target rejected');
    if (command === '/bin/launchctl' && args[0] === 'bootout' && ++stops === 2) throw Object.assign(new Error('job not loaded'), { code: 113 });
    return { stdout: '0.2.1' };
  }, async () => '0.2.1');
  Object.assign(c.config, { backend: 'launchd', domain: 'gui/501', service: 'net.example.harness', plist: '/Users/example/service.plist', node: '/node', npm: '/npm', home: os.tmpdir() });
  c.waitReady = async () => {};
  await c.accept('update', '0.2.1');await c.run();
  assert.equal(c.operation.phase, 'failed');
  assert.match(c.operation.error, /previous install restored/);
  assert.equal(await c.installedVersion(), '0.2.1-rc.5');
  assert.equal(starts, 2);
});
