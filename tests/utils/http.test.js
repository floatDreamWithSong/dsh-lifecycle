import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readJson } from '../../src/utils/http.js';
test('rejects malformed and oversized bodies', async () => {
  await assert.rejects(readJson(Readable.from(['{broken'])), SyntaxError);
  await assert.rejects(readJson(Readable.from(['x'.repeat(4097)])), /4 KiB/);
  assert.deepEqual(await readJson(Readable.from(['{"action":"restart"}'])), { action: 'restart' });
});
