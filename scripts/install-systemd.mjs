#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (process.getuid?.() !== 0) throw new Error('Run this installer as root on the systemd host');
const { values: v } = parseArgs({ options: {
  service: { type: 'string' }, user: { type: 'string' }, home: { type: 'string' }, 'install-root': { type: 'string' },
  node: { type: 'string', default: process.execPath }, npm: { type: 'string' },
  'health-url': { type: 'string', default: 'http://127.0.0.1:3080/login' }, channel: { type: 'string', default: 'latest' },
} });
for (const key of ['service', 'user', 'home', 'install-root', 'npm']) if (!v[key]) throw new Error('--' + key + ' is required');
if (!/^[a-zA-Z0-9_.@-]+\.service$/.test(v.service) || !/^[a-zA-Z0-9_-]+$/.test(v.user)) throw new Error('Invalid service or user');
for (const key of ['home', 'install-root', 'node', 'npm']) if (!/^\/[a-zA-Z0-9_./-]+$/.test(v[key]) || !existsSync(v[key])) throw new Error('Invalid or missing path: ' + key);
if (!['latest', 'next', 'alpha'].includes(v.channel)) throw new Error('Invalid release channel');
execFileSync('/usr/bin/systemctl', ['cat', v.service], { stdio: 'ignore' });
const dest = '/opt/dsh-lifecycle';
mkdirSync(dest, { recursive: true, mode: 0o755 });
mkdirSync('/etc/dsh-lifecycle', { recursive: true, mode: 0o755 });
copyFileSync(fileURLToPath(new URL('../dist/supervisor.js', import.meta.url)), dest + '/supervisor.js');
writeFileSync(dest + '/package.json', '{"type":"module"}\n');
const group = execFileSync('/usr/bin/id', ['-gn', v.user], { encoding: 'utf8' }).trim();
const config = { service: v.service, user: v.user, home: v.home, installRoot: v['install-root'], node: v.node, npm: v.npm,
  healthUrl: v['health-url'], channel: v.channel, socket: '/run/dsh-lifecycle/control.sock' };
const configFile = '/etc/dsh-lifecycle/config.json';
if (existsSync(configFile)) writeFileSync(configFile + '.backup-' + Date.now(), readFileSync(configFile), { mode: 0o600 });
writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
writeFileSync('/etc/systemd/system/dsh-lifecycle.service', `[Unit]
Description=DeepSeek Lifecycle independent controller
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=${group}
ExecStart=${v.node} /opt/dsh-lifecycle/supervisor.js
Restart=on-failure
RestartSec=3
RuntimeDirectory=dsh-lifecycle
RuntimeDirectoryMode=0750
UMask=0007
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
`);
execFileSync('/usr/bin/systemctl', ['daemon-reload']);
execFileSync('/usr/bin/systemctl', ['enable', '--now', 'dsh-lifecycle.service'], { stdio: 'inherit' });
console.log('Installed independent supervisor. Install the plugin in the web profile and restart Harness.');
