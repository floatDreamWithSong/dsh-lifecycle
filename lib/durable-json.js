import { mkdirSync, chmodSync, writeFileSync, openSync, fsyncSync, closeSync, renameSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/** Atomically replace owner-only state, flushing both file and rename before returning. */
export function writeDurableJson(file, value) {
  writeDurableFile(file, JSON.stringify(value) + '\n');
}

/** Atomically persist owner-only binary assets with the same durability as credentials. */
export function writeDurableFile(file, value) {
  const dir = path.dirname(file);
  mkdirSync(dir, { recursive: true, mode: 0o700 });chmodSync(dir, 0o700);
  const temp = file + '.' + process.pid + '.' + randomUUID() + '.tmp';
  writeFileSync(temp, value, { mode: 0o600, flag: 'wx' });
  const fd = openSync(temp, 'r');try { fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temp, file);chmodSync(file, 0o600);
  const directory = openSync(dir, 'r');try { fsyncSync(directory); } finally { closeSync(directory); }
}

/** Missing state is distinct from corrupt state: malformed JSON always throws. */
export function readDurableJson(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}
