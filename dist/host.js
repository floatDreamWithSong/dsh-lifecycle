// src/host/index.js
import { randomUUID } from "node:crypto";
import http from "node:http";

// src/host/security.js
import { timingSafeEqual } from "node:crypto";
function trustedTransport(req) {
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)) return false;
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
function authorizedAction(req, token) {
  if (!trustedTransport(req) || !req.headers["content-type"]?.startsWith("application/json")) return false;
  const supplied = req.headers["x-dsh-power-token"];
  return typeof supplied === "string" && Buffer.byteLength(supplied) === Buffer.byteLength(token) && timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
}

// src/utils/http.js
function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}
async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 4096) throw new Error("Request exceeds 4 KiB");
  }
  return JSON.parse(body);
}

// src/utils/power-paths.js
import os from "node:os";
import path from "node:path";
function powerPaths(platform = process.platform, home = os.homedir(), localAppData = process.platform === "win32" ? process.env.LOCALAPPDATA : void 0) {
  if (platform === "win32") {
    const local = localAppData || path.win32.join(home, "AppData", "Local");
    const root2 = path.win32.join(local, "dsh-lifecycle");
    return { root: root2, config: path.win32.join(root2, "config.json") };
  }
  const root = platform === "darwin" ? path.posix.join(home, "Library/Application Support/dsh-lifecycle") : "/etc/dsh-lifecycle";
  return { root, config: path.posix.join(root, "config.json"), socket: platform === "darwin" ? path.posix.join(root, "control.sock") : "/run/dsh-lifecycle/control.sock" };
}

// src/host/index.js
import { readFile as readFile2 } from "node:fs/promises";

// src/utils/windows-control.js
function windowsControlTarget(config) {
  if (config.backend !== "windows" || !/^\\\\\.\\pipe\\dsh-lifecycle-[0-9a-f-]{36}$/.test(config.socket) || !/^[0-9a-f]{64}$/.test(config.controlToken)) throw new Error("Invalid Windows controller pipe configuration");
  return { socketPath: config.socket, headers: { "X-DSH-Controller-Token": config.controlToken } };
}

// src/host/windows-setup.js
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path2 from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// lib/paths.js
import { join } from "node:path";
import os2 from "node:os";
function dshHome() {
  return process.env.DSH_HOME || join(os2.homedir(), ".dsh");
}

// src/host/windows-setup.js
var execute = promisify(execFile);
async function packageAt(entry, name2) {
  for (let dir = path2.dirname(entry); ; dir = path2.dirname(dir)) {
    const manifest = path2.join(dir, "package.json");
    if (existsSync(manifest) && JSON.parse(await readFile(manifest, "utf8")).name === name2) return manifest;
    if (dir === path2.dirname(dir)) throw new Error("Cannot identify the Harness CLI package");
  }
}
async function launchPlan({ argv = process.argv, execArgv = process.execArgv, cwd = process.cwd() } = {}) {
  if (!argv[1] || !/[/\\](?:src[/\\]bin\.ts|lib[/\\]bin\.js)$/.test(argv[1])) throw new Error("Cannot identify the Harness CLI entry");
  const manifest = await packageAt(argv[1], "@deepseek-ai/dsh");
  const ownPreload = process.env.DSH_LIFECYCLE_CONFIG && pathToFileURL(path2.join(path2.dirname(process.env.DSH_LIFECYCLE_CONFIG), "windows-env.mjs")).href;
  const nodeArgs = execArgv.filter((arg, index) => !(arg === "--import" && execArgv[index + 1] === ownPreload) && !(arg === ownPreload && execArgv[index - 1] === "--import"));
  const args = [...nodeArgs, path2.resolve(argv[1]), ...argv.slice(2).filter((arg) => arg !== "--open")];
  if (!args.includes("--no-open")) args.push("--no-open");
  const updateReason = argv[1].endsWith(".ts") ? "\u6E90\u7801\u6784\u5EFA\uFF1A\u8BF7\u901A\u8FC7\u6E90\u7801\u5DE5\u4F5C\u6D41\u66F4\u65B0" : "\u5F53\u524D\u5B89\u88C5\u7531\u539F\u5305\u7BA1\u7406\u5668\u7EF4\u62A4\uFF0C\u8BF7\u901A\u8FC7\u539F\u65B9\u5F0F\u66F4\u65B0\uFF1B\u7535\u6E90\u63A7\u5236\u4E0D\u53D7\u5F71\u54CD";
  return { args, cwd, manifest, updateReason };
}
function automaticConfig(port) {
  return path2.resolve(dshHome(), "lifecycle", "windows-" + port, "config.json");
}
function controllerConfig(port) {
  if (process.env.DSH_LIFECYCLE_CONFIG) return process.env.DSH_LIFECYCLE_CONFIG;
  const automatic = automaticConfig(port);
  if (existsSync(automatic)) return automatic;
  const legacy = powerPaths().config;
  if (existsSync(legacy)) {
    const config = JSON.parse(readFileSync(legacy, "utf8"));
    if (config.healthUrl === "http://127.0.0.1:" + port + "/login" && path2.resolve(config.environment?.DSH_HOME || path2.join(config.home, ".dsh")) === path2.resolve(dshHome())) return legacy;
  }
  return automatic;
}
async function installWindowsControl(port, configFile) {
  const plan = await launchPlan();
  const pluginManifest = await packageAt(fileURLToPath(import.meta.url), "dsh-lifecycle");
  const installer = path2.join(path2.dirname(pluginManifest), "scripts/install-windows.mjs");
  await execute(process.execPath, [
    installer,
    "--cwd",
    plan.cwd,
    "--controller-root",
    path2.dirname(configFile),
    "--source-manifest",
    plan.manifest,
    "--update-reason",
    plan.updateReason,
    "--port",
    String(port),
    "--defer-harness",
    "--",
    process.execPath,
    ...plan.args
  ], { windowsHide: true, timeout: 9e4, maxBuffer: 1024 * 1024 });
}

// src/host/index.js
var name = "dsh-lifecycle-power";
var inject = ["webServer"];
var BASE = "/api/dsh-lifecycle/power";
async function controlRequest(method, path3, body, configFile) {
  const target = process.platform === "win32" ? windowsControlTarget(JSON.parse(await readFile2(configFile || process.env.DSH_LIFECYCLE_CONFIG || powerPaths().config, "utf8"))) : { socketPath: process.env.DSH_LIFECYCLE_SOCKET || powerPaths().socket, headers: {} };
  return new Promise((resolve, reject) => {
    const req = http.request({
      ...target,
      path: path3,
      method,
      headers: { "Content-Type": "application/json", ...target.headers },
      timeout: 12e3
    }, async (res) => {
      try {
        const data = await readJson(res);
        if (res.statusCode >= 400) throw new Error(data.error || `Supervisor HTTP ${res.statusCode}`);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Power supervisor timed out")));
    req.end(body ? JSON.stringify(body) : void 0);
  });
}
function apply(ctx) {
  const instanceId = randomUUID();
  const csrf = randomUUID();
  const port = ctx.webServer.port - 1;
  const configFile = process.platform === "win32" ? controllerConfig(port) : void 0;
  const control = (method, path3, body) => controlRequest(method, path3, body, configFile);
  const exit = ctx.get?.("appExit");
  const setupAvailable = process.platform === "win32" && typeof exit === "function" && Number.isInteger(port) && port > 0;
  let installing = false;
  let handoff = false;
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: BASE,
    handler: async (req, res) => {
      try {
        if (!trustedTransport(req)) return json(res, 403, { error: "Untrusted transport" });
        const path3 = new URL(req.url, "http://localhost").pathname;
        if (path3 === BASE + "/session" && req.method === "GET") {
          return json(res, 200, { instanceId, csrf });
        }
        if (path3 === BASE + "/health" && req.method === "GET") {
          const health = await control("GET", "/health");
          return json(res, 200, { ...health, instanceId });
        }
        if (path3 === BASE + "/status" && req.method === "GET") {
          try {
            const status = await control("GET", "/status");
            return json(res, 200, { ...status, installed: true, instanceId, csrf });
          } catch (error) {
            if (!["ENOENT", "ECONNREFUSED"].includes(error.code) || process.platform !== "win32") throw error;
            return json(res, 200, {
              installed: false,
              setupAvailable,
              instanceId,
              csrf,
              setupReason: setupAvailable ? "\u542F\u7528\u540E\u4F1A\u81EA\u52A8\u914D\u7F6E\u5F53\u524D\u7528\u6237\u7684\u540E\u53F0\u670D\u52A1\uFF0C\u5E76\u91CD\u65B0\u542F\u52A8\u4E00\u6B21\u3002\u6B63\u5728\u8FD0\u884C\u7684\u4EFB\u52A1\u4F1A\u4E2D\u65AD\u3002" : "\u5F53\u524D\u542F\u52A8\u5668\u4E0D\u652F\u6301\u81EA\u52A8\u6258\u7BA1\uFF0C\u8BF7\u4F7F\u7528 Windows Web CLI \u542F\u52A8\u3002"
            });
          }
        }
        if (path3 === BASE + "/setup" && req.method === "POST") {
          if (!authorizedAction(req, csrf)) return json(res, 403, { error: "Invalid CSRF token" });
          const body = await readJson(req);
          if (body.confirm !== "enable-and-restart") return json(res, 400, { error: "\u8BF7\u786E\u8BA4\u542F\u7528\u670D\u52A1\u5E76\u91CD\u65B0\u542F\u52A8" });
          if (!setupAvailable) return json(res, 409, { error: "\u5F53\u524D\u542F\u52A8\u5668\u4E0D\u652F\u6301\u81EA\u52A8\u6258\u7BA1" });
          if (installing) return json(res, 409, { error: "\u6B63\u5728\u542F\u7528\u7535\u6E90\u63A7\u5236\uFF0C\u8BF7\u52FF\u91CD\u590D\u64CD\u4F5C" });
          installing = true;
          try {
            await installWindowsControl(port, configFile);
            if (process.env.DSH_LIFECYCLE_CONFIG) {
              return json(res, 200, { installed: true, restartRequired: false });
            }
            const operation = await control("POST", "/action", { action: "takeover" });
            handoff = true;
            res.once("finish", () => {
              setTimeout(() => exit(0), 1200);
            });
            return json(res, 202, { ...operation, restartRequired: true });
          } finally {
            if (!handoff) installing = false;
          }
        }
        if (path3 === BASE + "/refresh" && req.method === "POST") {
          if (!authorizedAction(req, csrf)) return json(res, 403, { error: "Invalid CSRF token" });
          const status = await control("POST", "/refresh", {});
          return json(res, 200, { ...status, instanceId, csrf });
        }
        if (path3 === BASE + "/action" && req.method === "POST") {
          if (!authorizedAction(req, csrf)) return json(res, 403, { error: "Invalid CSRF token" });
          const body = await readJson(req);
          if (!["restart", "shutdown", "update"].includes(body.action)) return json(res, 400, { error: "Unknown power action" });
          if (body.action === "shutdown" && body.confirm !== "shutdown") return json(res, 400, { error: "Shutdown confirmation required" });
          const operation = await control("POST", "/action", { action: body.action, target: body.target });
          return json(res, 202, operation);
        }
        json(res, 404, { error: "Unknown endpoint" });
      } catch (error) {
        ctx.logger?.warn("Power request failed: %s", error.message);
        json(res, 503, { error: error.message });
      }
    }
  }));
}
export {
  apply,
  controlRequest,
  inject,
  name
};
