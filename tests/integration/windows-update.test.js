import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { Controller } from '../../src/supervisor/controller.js';
import { publishedVersion } from '../../src/supervisor/version.js';
import { controlRequest } from '../../src/host/index.js';

const configPath = process.env.DSH_LIFECYCLE_UPDATE_TEST_CONFIG;

test('real Windows npm update restores an unbootable release, then upgrades through the power menu', {
  skip: process.platform !== 'win32' || !configPath,
  timeout: 600000,
}, async t => {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  assert.equal(config.backend, 'windows');
  assert.ok(config.installRoot && !config.sourceManifest, 'Use a disposable npm-managed Harness');
  process.env.DSH_LIFECYCLE_CONFIG = configPath;
  const base = new URL(config.healthUrl).origin;
  const password = process.env.DSH_LIFECYCLE_TEST_PASSWORD;
  assert.ok(password);
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, headless: true });
  const page = await browser.newPage();
  t.after(async () => { await page.screenshot({ path: 'test-results/windows-update.png' });await browser.close(); });
  await page.addLocatorHandler(page.getByRole('button', { name: '继续', exact: true }), button => button.click());
  await page.addLocatorHandler(page.getByRole('heading', { name: '开始使用', exact: true }), () => page.getByRole('button', { name: '关闭', exact: true }).click());
  await expect.poll(async () => {
    try { return (await fetch(config.healthUrl)).status; }
    catch { return 0; }
  }, { timeout: 60000, intervals: [1000] }).toBe(200);
  await page.goto(base + '/login');
  // First-run credentials are displayed by the setup page, never read from terminal logs.
  if (await page.getByLabel('初始密码', { exact: true }).isVisible()) {
    await expect(page.getByLabel('初始密码', { exact: true })).not.toHaveValue('');
    await page.getByRole('button', { name: '下一步 →' }).click();
    await page.getByLabel('新密码', { exact: true }).fill(password);
    await page.getByLabel('确认密码', { exact: true }).fill(password);
    await page.getByRole('button', { name: '下一步 →' }).click();
    await page.getByRole('button', { name: '下一步 →' }).click();
    await page.getByRole('button', { name: '进入工作空间 →' }).click();
  } else {
    await page.getByRole('button', { name: '唤醒并登录 Admin' }).click();
    await page.getByRole('textbox', { name: '输入密码', exact: true }).fill(password);
    await page.getByRole('button', { name: '登录', exact: true }).click();
  }
  await page.getByRole('button', { name: '电源', exact: true }).click({ trial: true });
  const current = (await controlRequest('GET', '/status')).current;
  const target = await publishedVersion(config.channel);
  assert.notEqual(current, target, 'Install an older release before running the update smoke');
  const execute = promisify(execFile);
  const fault = new Controller(config, async (command, args, options) => {
    const result = await execute(command, args, options);
    if (args.at(-1) === '--version') {
      const stagedCli = args[0];
      assert.ok(stagedCli.startsWith(config.installRoot + '.staged-'));
      assert.equal(path.basename(stagedCli), 'bin.js');
      // Fault injection only in the disposable staged tree, after actual npm/version validation.
      writeFileSync(stagedCli, 'process.exit(42);\n');
    }
    return result;
  });
  await fault.accept('update', target);await fault.run();
  assert.equal(fault.operation.phase, 'failed');
  assert.match(fault.operation.error, /previous install restored/);
  assert.equal(await fault.installedVersion(), current);
  assert.equal((await page.request.get(base + '/api/dsh-lifecycle/power/session')).status(), 200);
  await page.goto(base);
  await page.getByRole('button', { name: '电源', exact: true }).click();
  await page.getByRole('menuitem', { name: /更新并重启/ }).click();
  await expect.poll(async () => {
    const health = await controlRequest('GET', '/health');
    assert.notEqual(health.operation?.phase, 'failed', health.operation?.error);
    return health.operation?.phase;
  }, { timeout: 300000, intervals: [1000] }).toBe('done');
  assert.equal(await fault.installedVersion(), target);
  assert.equal((await controlRequest('GET', '/status')).current, target);
  await page.goto(base);
  await expect(page.getByRole('button', { name: '电源', exact: true })).toBeVisible();
  assert.equal((await page.request.get(base + '/api/dsh-lifecycle/power/session')).status(), 200);
});
