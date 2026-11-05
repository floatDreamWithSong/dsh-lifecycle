import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeDurableFile, writeDurableJson, readDurableJson } from '../../lib/durable-json.js';

test('durable state and binary assets can be created and replaced on the host filesystem', t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'lifecycle-durable-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'state.json');
  assert.equal(readDurableJson(file), null);
  writeDurableJson(file, { version: 1 });
  writeDurableJson(file, { version: 2 });
  assert.deepEqual(readDurableJson(file), { version: 2 });
  const asset = path.join(root, 'image.bin');
  writeDurableFile(asset, Buffer.from([0, 255, 12]));
  assert.deepEqual(readFileSync(asset), Buffer.from([0, 255, 12]));
  assert.deepEqual(readdirSync(root).sort(), ['image.bin', 'state.json']);
  writeFileSync(file, '{broken');
  assert.throws(() => readDurableJson(file), SyntaxError);
});
