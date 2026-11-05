import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { launchPlan } from '../../src/host/windows-setup.js';

test('source startup preserves node options, profile and port, suppressing browser auto-open', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dsh-launch-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version: '0.2.2' }));
  const entry = path.join(root, 'src/bin.ts');
  const plan = await launchPlan({ argv: ['C:\\node.exe', entry, '--profile', 'web', '--port', '3080'], execArgv: ['--import', 'tsx/esm'], cwd: root });
  assert.deepEqual(plan.args, ['--import', 'tsx/esm', entry, '--profile', 'web', '--port', '3080', '--no-open']);
  assert.equal(plan.manifest, path.join(root, 'package.json'));
  assert.match(plan.updateReason, /源码/);
});

test('an unrelated executable cannot be adopted as the Harness service', async () => {
  await assert.rejects(launchPlan({ argv: ['node.exe', import.meta.filename], execArgv: [], cwd: process.cwd() }), /Harness/);
});

test('npm CLI startup retains power controls without offering to replace a shared install', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dsh-npm-launch-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cliRoot = path.join(root, 'node_modules/@deepseek-ai/dsh');
  await mkdir(path.join(cliRoot, 'lib'), { recursive: true });
  await writeFile(path.join(cliRoot, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version: '0.2.2' }));
  const entry = path.join(cliRoot, 'lib/bin.js');
  const plan = await launchPlan({ argv: ['node.exe', entry, 'web', '--no-open'], execArgv: [], cwd: root });
  assert.deepEqual(plan.args, [entry, 'web', '--no-open']);
  assert.equal(plan.manifest, path.join(cliRoot, 'package.json'));
  assert.match(plan.updateReason, /原包管理器/);
});
