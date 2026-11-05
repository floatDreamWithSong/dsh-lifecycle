import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import { windowsPortsClosed } from '../../src/supervisor/windows.js';

const configPath = process.env.DSH_LIFECYCLE_TEST_CONFIG;

test('real Windows scheduled Harness supports authentication, lock, restart, stop and manual start', {
  skip: process.platform !== 'win32' || !configPath,
  timeout: 180000,
}, async t => {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  assert.equal(config.backend, 'windows');
  assert.ok(config.sourceManifest, 'Use a disposable source-build profile for this destructive lifecycle smoke');
  const base = new URL(config.healthUrl).origin;
  const password = process.env.DSH_LIFECYCLE_TEST_PASSWORD;
  assert.ok(password, 'Provide the disposable profile password in DSH_LIFECYCLE_TEST_PASSWORD');
  const pipe = (route, token = config.controlToken) => new Promise((resolve, reject) => {
    const req = http.get({ socketPath: config.socket, path: route, headers: { 'X-DSH-Controller-Token': token } }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
    req.on('error', reject);
  });
  assert.equal((await pipe('/health', 'wrong-token')).status, 403);
  assert.equal((await pipe('/health')).status, 200);
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true });
  const page = await browser.newPage();
  t.after(async () => { await page.screenshot({ path: 'test-results/windows-host.png' });await browser.close(); });
  // A keyless, fresh Harness may show its own preview/account onboarding over the workspace.
  await page.addLocatorHandler(page.getByRole('button', { name: '继续', exact: true }), button => button.click());
  await page.addLocatorHandler(page.getByRole('heading', { name: '开始使用', exact: true }), () => page.getByRole('button', { name: '关闭', exact: true }).click());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const login = async () => {
    await page.goto(base + '/login');
    await page.getByRole('button', { name: '唤醒并登录 Admin' }).click();
    await page.getByRole('textbox', { name: '输入密码', exact: true }).fill(password);
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.getByRole('button', { name: '电源', exact: true }).waitFor();
    await page.getByRole('button', { name: '电源', exact: true }).click({ trial: true });
  };
  const api = endpoint => page.evaluate(async endpoint => {
    const response = await fetch(endpoint);
    return { status: response.status, data: response.ok ? await response.json() : null };
  }, endpoint);
  await expect.poll(async () => {
    try { return (await page.request.get(base + '/api/dsh-lifecycle/power/session')).status(); }
    catch { return 0; }
  }, { timeout: 60000, intervals: [1000] }).toBe(401);
  await login();
  const before = await api('/api/dsh-lifecycle/power/status');
  assert.equal(before.status, 200);
  assert.equal(before.data.updateSupported, false);
  assert.ok(before.data.current);
  await page.getByRole('button', { name: '电源', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: /更新并重启/ })).toHaveCount(0);
  await page.getByRole('menuitem', { name: /重新启动/ }).click();
  await expect.poll(async () => {
    try {
      const result = await api('/api/dsh-lifecycle/power/session');
      return result.status === 200 && result.data.instanceId !== before.data.instanceId;
    } catch { return false; }
  }, { timeout: 90000, intervals: [1000] }).toBe(true);
  await expect.poll(async () => (await pipe('/health')).data.operation?.phase, { timeout: 15000 }).toBe('done');
  await page.reload();
  await page.getByRole('button', { name: '电源', exact: true }).click({ trial: true });
  await page.getByRole('button', { name: '电源', exact: true }).click();
  await page.getByRole('menuitem', { name: /锁定/ }).click();
  await expect(page.getByRole('button', { name: '唤醒并登录 Admin' })).toBeVisible();
  assert.equal((await page.request.get(base + '/api/dsh-lifecycle/power/session')).status(), 401);
  await login();
  await page.getByRole('button', { name: '电源', exact: true }).click();
  await page.getByRole('menuitem', { name: /关机/ }).click();
  await page.getByRole('button', { name: '确认关机', exact: true }).click();
  // The controller must survive while both Harness listeners (and their task tree) stop.
  await expect.poll(() => windowsPortsClosed(config.healthUrl), { timeout: 30000 }).toBe(true);
  await expect.poll(async () => (await pipe('/health')).data.operation?.phase, { timeout: 15000 }).toBe('done');
  execFileSync(config.taskTool, ['/Run', '/TN', config.service], { windowsHide: true });
  await expect.poll(async () => {
    try { return (await page.request.get(base + '/login')).status(); }
    catch { return 0; }
  }, { timeout: 90000, intervals: [1000] }).toBe(200);
  await page.goto(base);
  await expect(page.getByRole('button', { name: '电源', exact: true })).toBeVisible();
  assert.equal((await api('/api/dsh-lifecycle/power/status')).status, 200);
  assert.deepEqual(errors, []);
});
