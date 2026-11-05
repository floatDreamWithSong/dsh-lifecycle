import { mkdirSync, chmodSync, writeFileSync, openSync, fsyncSync, closeSync, renameSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/** Atomically replace state, flushing file data and, on Unix, the directory entry. */
export function writeDurableJson(file, value) {
  writeDurableFile(file, JSON.stringify(value) + '\n');
}

/** Atomically persist binary assets; Windows requires a writable handle for FlushFileBuffers. */
export function writeDurableFile(file, value) {
  const dir = path.dirname(file);
  mkdirSync(dir, { recursive: true, mode: 0o700 });chmodSync(dir, 0o700);
  const temp = file + '.' + process.pid + '.' + randomUUID() + '.tmp';
  const fd = openSync(temp, 'wx', 0o600);
  try { writeFileSync(fd, value);fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temp, file);chmodSync(file, 0o600);
  // Node cannot open/flush directory handles on Windows; do not suppress file IO failures.
  if (process.platform !== 'win32') {
    const directory = openSync(dir, 'r');try { fsyncSync(directory); } finally { closeSync(directory); }
  }
}

/** Missing state is distinct from corrupt state: malformed JSON always throws. */
export function readDurableJson(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}
