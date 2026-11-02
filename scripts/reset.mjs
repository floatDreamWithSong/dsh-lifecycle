#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { renameSync, existsSync } from 'node:fs';
import { credentialDir } from '../lib/paths.js';
import { lifecyclePath, readLifecyclePolicy, saveLifecyclePolicy } from '../lib/lifecycle-policy.js';
import path from 'node:path';
const { values } = parseArgs({ options: { confirm: { type: 'boolean' }, 'all-factors': { type: 'boolean' } } });
if (!values.confirm) throw new Error('Stop Harness first, then run with --confirm. Use --all-factors only if all verification methods are lost.');
const files = [path.join(credentialDir(), 'password.json'), lifecyclePath('sessions.json')];
if (values['all-factors']) files.push(path.join(credentialDir(), 'otp.json'), lifecyclePath('passkeys.json'));
const suffix = '.reset-backup-' + Date.now();
for (const file of files) if (existsSync(file)) renameSync(file, file + suffix);
if (values['all-factors']) saveLifecyclePolicy({ ...readLifecyclePolicy(), twoFactor: false });
console.log('Credentials moved to owner-only backup files. Start Harness, read its new initial password from the local log, and complete setup.');
