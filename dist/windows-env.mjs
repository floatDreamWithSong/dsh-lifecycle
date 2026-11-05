// src/supervisor/windows-env.js
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
if (process.platform !== "win32") throw new Error("Windows task environment can only run on Windows");
var configPath = process.env.DSH_LIFECYCLE_CONFIG || path.join(path.dirname(fileURLToPath(import.meta.url)), "config.json");
var config = JSON.parse(readFileSync(configPath, "utf8"));
if (config.backend !== "windows") throw new Error("Invalid Windows task configuration");
Object.assign(process.env, config.environment, { DSH_LIFECYCLE_CONFIG: configPath });
