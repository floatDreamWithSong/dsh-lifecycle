import { readFileSync, createWriteStream } from 'node:fs';
import { Console } from 'node:console';
import { powerPaths } from '../utils/power-paths.js';

// Loaded by Node --import before the configured CLI; the task owns the DSH process directly.
if (process.platform !== 'win32') throw new Error('Windows task environment can only run on Windows');
const config = JSON.parse(readFileSync(powerPaths().config, 'utf8'));
if (config.backend !== 'windows') throw new Error('Invalid Windows task configuration');
Object.assign(process.env, config.environment, { DSH_LIFECYCLE_CONFIG: powerPaths().config });
const log = createWriteStream(config.harnessLog, { flags: 'a' });
globalThis.console = new Console({ stdout: log, stderr: log });
