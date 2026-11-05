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
import { readFile } from "node:fs/promises";

// src/utils/windows-control.js
function windowsControlTarget(config) {
  if (config.backend !== "windows" || !/^\\\\\.\\pipe\\dsh-lifecycle-[0-9a-f-]{36}$/.test(config.socket) || !/^[0-9a-f]{64}$/.test(config.controlToken)) throw new Error("Invalid Windows controller pipe configuration");
  return { socketPath: config.socket, headers: { "X-DSH-Controller-Token": config.controlToken } };
}

// src/host/index.js
var name = "dsh-lifecycle-power";
var inject = ["webServer"];
var BASE = "/api/dsh-lifecycle/power";
async function controlRequest(method, path2, body) {
  const target = process.platform === "win32" ? windowsControlTarget(JSON.parse(await readFile(process.env.DSH_LIFECYCLE_CONFIG || powerPaths().config, "utf8"))) : { socketPath: process.env.DSH_LIFECYCLE_SOCKET || powerPaths().socket, headers: {} };
  return new Promise((resolve, reject) => {
    const req = http.request({
      ...target,
      path: path2,
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
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: BASE,
    handler: async (req, res) => {
      try {
        if (!trustedTransport(req)) return json(res, 403, { error: "Untrusted transport" });
        const path2 = new URL(req.url, "http://localhost").pathname;
        if (path2 === BASE + "/session" && req.method === "GET") {
          return json(res, 200, { instanceId, csrf });
        }
        if (path2 === BASE + "/health" && req.method === "GET") {
          const health = await controlRequest("GET", "/health");
          return json(res, 200, { ...health, instanceId });
        }
        if (path2 === BASE + "/status" && req.method === "GET") {
          const status = await controlRequest("GET", "/status");
          return json(res, 200, { ...status, instanceId, csrf });
        }
        if (path2 === BASE + "/refresh" && req.method === "POST") {
          if (!authorizedAction(req, csrf)) return json(res, 403, { error: "Invalid CSRF token" });
          const status = await controlRequest("POST", "/refresh", {});
          return json(res, 200, { ...status, instanceId, csrf });
        }
        if (path2 === BASE + "/action" && req.method === "POST") {
          if (!authorizedAction(req, csrf)) return json(res, 403, { error: "Invalid CSRF token" });
          const body = await readJson(req);
          if (!["restart", "shutdown", "update"].includes(body.action)) return json(res, 400, { error: "Unknown power action" });
          if (body.action === "shutdown" && body.confirm !== "shutdown") return json(res, 400, { error: "Shutdown confirmation required" });
          const operation = await controlRequest("POST", "/action", { action: body.action, target: body.target });
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
