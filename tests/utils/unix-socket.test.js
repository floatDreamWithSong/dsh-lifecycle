import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { once } from 'node:events';
import { prepareSocket } from '../../src/utils/unix-socket.js';

test('controller startup never deletes an active socket or a regular file', { skip: process.platform === 'win32' && 'Unix-domain filesystem sockets are not the Windows named-pipe backend' }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dsh-sock-'));
  const socketPath = path.join(root, 's');
  t.after(() => rm(root, { recursive: true, force: true }));
  await prepareSocket(socketPath);
  await writeFile(socketPath, 'keep');
  await assert.rejects(prepareSocket(socketPath), /non-socket/);
  assert.equal(await readFile(socketPath, 'utf8'), 'keep');
  await rm(socketPath);
  const server = net.createServer();
  server.listen(socketPath);await once(server, 'listening');
  t.after(() => server.close());
  await assert.rejects(prepareSocket(socketPath), /already running/);
});
