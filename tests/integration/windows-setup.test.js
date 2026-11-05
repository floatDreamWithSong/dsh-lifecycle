import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { windowsPortsClosed } from '../../src/supervisor/windows.js';

test('a normal Windows Web launch enables its own background services from the page', {
  skip: process.platform !== 'win32' || !process.env.DSH_LIFECYCLE_HARNESS_ROOT,
  timeout: 240000,
}, async t => {
  const cwd = process.env.DSH_LIFECYCLE_HARNESS_ROOT;
  const home = await mkdtemp(path.resolve('.dsh/自动安装 proof-'));
  const configPath = path.join(home, 'lifecycle/windows-32984/config.json');
  const env = { ...process.env, DSH_HOME: home, npm_config_registry: 'https://registry.npmjs.org' };
  delete env.DSH_LIFECYCLE_CONFIG;
  // Seed credentials in a separate process so async work can never escape into the user's real home.
  const store = new URL('../../lib/store.js', import.meta.url).href;
  execFileSync(process.execPath, ['--input-type=module', '-e', `import {setPassword} from ${JSON.stringify(store)};await setPassword('Oneclick-Proof-456!');`], { env, windowsHide: true });
  const cli = process.env.DSH_LIFECYCLE_HARNESS_CLI ? [process.env.DSH_LIFECYCLE_HARNESS_CLI] : ['--import', 'tsx/esm', 'apps/cli/src/bin.ts'];
  const packed = process.env.DSH_LIFECYCLE_PACKAGE || path.resolve('dsh-lifecycle-0.1.10.tgz');
  execFileSync(process.execPath, [...cli, 'plugin', '--profile', 'web', 'add', packed], { cwd, env, timeout: 120000, windowsHide: true, stdio: 'pipe' });
  const host = spawn(process.execPath, [...cli, 'web', '--patch', path.resolve('tests/integration/windows.patch.yml'), '--no-open', '--port', '32984'], { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  host.stdout.on('data', data => { log += data; });host.stderr.on('data', data => { log += data; });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true });
  const page = await browser.newPage();
  t.after(async () => {
    await page.screenshot({ path: 'test-results/windows-setup.png' });
    await browser.close();
    let config;
    try { config = JSON.parse(await readFile(configPath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (config) {
      assert.match(config.service, /^DSH-Lifecycle-[a-f0-9]+\.Harness$/);
      for (const task of [config.service, config.controllerTask]) {
        execFileSync(config.taskTool, ['/End', '/TN', task], { windowsHide: true, stdio: 'ignore' });
        execFileSync(config.taskTool, ['/Delete', '/TN', task, '/F'], { windowsHide: true, stdio: 'ignore' });
      }
    }
    if (host.exitCode === null && host.signalCode === null) { const exited = once(host, 'exit');host.kill();await exited; }
    console.log('Isolated profile:', home);
  });
  const base = 'http://127.0.0.1:32984';
  await expect.poll(async () => { try { return (await fetch(base + '/login')).status; } catch { return log.includes('failed to boot') ? log : 0; } }, { timeout: 60000 }).toBe(200);
  await page.addLocatorHandler(page.getByRole('button', { name: '继续', exact: true }), button => button.click());
  await page.addLocatorHandler(page.getByRole('heading', { name: '开始使用', exact: true }), () => page.getByRole('button', { name: '关闭', exact: true }).click());
  await page.goto(base + '/login');
  await page.getByRole('button', { name: '唤醒并登录 Admin' }).click();
  await page.getByRole('textbox', { name: '输入密码', exact: true }).fill('Oneclick-Proof-456!');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByRole('button', { name: '电源', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: /重新启动/ })).toBeDisabled();
  await page.getByRole('menuitem', { name: /启用电源控制/ }).click();
  await expect(page.getByRole('heading', { name: '启用电源控制？' })).toBeVisible();
  const rejected = await page.evaluate(async () => {
    const res = await fetch('/api/dsh-lifecycle/power/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"confirm":"enable-and-restart"}' });
    return res.status;
  });
  assert.equal(rejected, 403);
  const before = await page.evaluate(async () => (await (await fetch('/api/dsh-lifecycle/power/session')).json()).instanceId);
  const setup = page.waitForResponse(response => response.url().endsWith('/power/setup') && response.request().method() === 'POST');
  await page.getByRole('button', { name: '启用并重启', exact: true }).click();
  const response = await setup;
  if (response.status() !== 202) assert.fail(await response.text());
  await expect.poll(async () => {
    try {
      const res = await page.request.get(base + '/api/dsh-lifecycle/power/status');
      if (res.status() !== 200) return false;
      const state = await res.json();return state.installed && state.instanceId !== before;
    } catch { return false; }
  }, { timeout: 90000, intervals: [1000] }).toBe(true);
  assert.equal(host.exitCode, 0, log);
  await expect(page.locator('.dpm-overlay')).toHaveCount(0, { timeout: 15000 });
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const managedId = await page.evaluate(async () => (await (await fetch('/api/dsh-lifecycle/power/session')).json()).instanceId);
  execFileSync(config.taskTool, ['/End', '/TN', config.controllerTask], { windowsHide: true, stdio: 'ignore' });
  await expect.poll(async () => (await (await page.request.get(base + '/api/dsh-lifecycle/power/status')).json()).installed, { timeout: 15000 }).toBe(false);
  await page.reload();
  await page.getByRole('button', { name: '电源', exact: true }).click();
  await page.getByRole('menuitem', { name: /启用电源控制/ }).click();
  const repair = page.waitForResponse(response => response.url().endsWith('/power/setup') && response.request().method() === 'POST');
  await page.getByRole('button', { name: '启用并重启', exact: true }).click();
  const repaired = await repair;
  if (repaired.status() !== 200) assert.fail(await repaired.text());
  await expect(page.locator('.dpm-overlay')).toHaveCount(0, { timeout: 15000 });
  assert.equal(await page.evaluate(async () => (await (await fetch('/api/dsh-lifecycle/power/session')).json()).instanceId), managedId, 'Repairing only the controller must not restart Harness');
  await page.getByRole('button', { name: '电源', exact: true }).click({ trial: true });
  await page.getByRole('button', { name: '电源', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: /启用电源控制/ })).toHaveCount(0);
  await page.getByRole('menuitem', { name: /重新启动/ }).click();
  await expect.poll(async () => {
    try {
      const state = await (await page.request.get(base + '/api/dsh-lifecycle/power/status')).json();
      return state.operation?.action === 'restart' && state.operation?.phase === 'done';
    } catch { return false; }
  }, { timeout: 90000, intervals: [1000] }).toBe(true);
  await expect(page.locator('.dpm-overlay')).toHaveCount(0, { timeout: 15000 });
  await page.getByRole('button', { name: '电源', exact: true }).click({ trial: true });
  await page.getByRole('button', { name: '电源', exact: true }).click();
  await page.getByRole('menuitem', { name: /关机/ }).click();
  await page.getByRole('button', { name: '确认关机', exact: true }).click();
  await expect.poll(() => windowsPortsClosed(base + '/login'), { timeout: 30000 }).toBe(true);
});
