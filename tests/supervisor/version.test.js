import { test } from 'node:test';
import assert from 'node:assert/strict';
import { availableUpdate, publishedVersion } from '../../src/supervisor/version.js';

test('orders prereleases numerically and never offers a downgrade', () => {
  assert.equal(availableUpdate('0.2.1-rc.5', '0.2.1-rc.10'), '0.2.1-rc.10');
  assert.equal(availableUpdate('0.2.2-alpha.2', '0.2.1'), null);
  assert.equal(availableUpdate('0.2.1-rc.5', '0.2.1-rc.5'), null);
  assert.equal(availableUpdate('0.2.1-rc.5', '0.2.1'), '0.2.1');
});
test('checks only the configured official npm channel and validates identity', async () => {
  let url;
  assert.equal(await publishedVersion('latest', async input => { url = input; return { ok: true, json: async () => ({ name: '@deepseek-ai/dsh', version: '0.2.1' }) }; }), '0.2.1');
  assert.equal(url, 'https://registry.npmjs.org/@deepseek-ai%2Fdsh/latest');
  await assert.rejects(publishedVersion('evil', async () => {}), /Unsupported/);
  await assert.rejects(publishedVersion('latest', async () => ({ ok: true, json: async () => ({ name: 'other', version: '0.2.1' }) })), /Unexpected/);
});
