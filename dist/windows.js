// src/supervisor/windows.js
import path from "node:path";
import net from "node:net";
function windowsArguments(args) {
  return args.map((value) => {
    if (typeof value !== "string" || /[\0\r\n]/.test(value)) throw new Error("Invalid Windows argument");
    return '"' + value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, "$1$1") + '"';
  }).join(" ");
}
function windowsSystemTool(name, root = process.env.SystemRoot) {
  if (!["schtasks.exe", "icacls.exe", "whoami.exe", "powershell.exe"].includes(name) || !root || !/^[A-Za-z]:\\/.test(root)) throw new Error("Invalid Windows system tool");
  if (name === "powershell.exe") return path.win32.join(root, "System32", "WindowsPowerShell", "v1.0", name);
  return path.win32.join(root, "System32", name);
}
function windowsTaskXml({ sid, command, cwd, keepAlive = false }) {
  if (!/^S-1-\d+(?:-\d+)+$/.test(sid) || !path.win32.isAbsolute(command?.[0] || "") || !path.win32.isAbsolute(cwd)) throw new Error("Invalid Windows task target");
  const xml = (value) => String(value).replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]);
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.3" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
<RegistrationInfo><Description>DSH Lifecycle per-user background service.</Description></RegistrationInfo>
<Triggers><LogonTrigger><Enabled>true</Enabled><UserId>${xml(sid)}</UserId></LogonTrigger></Triggers>
<Principals><Principal id="Owner"><UserId>${xml(sid)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
<Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><AllowHardTerminate>true</AllowHardTerminate><StartWhenAvailable>false</StartWhenAvailable><AllowStartOnDemand>true</AllowStartOnDemand><Enabled>true</Enabled><ExecutionTimeLimit>PT0S</ExecutionTimeLimit>${keepAlive ? "<RestartOnFailure><Interval>PT1M</Interval><Count>3</Count></RestartOnFailure>" : ""}</Settings>
<Actions Context="Owner"><Exec><Command>${xml(command[0])}</Command><Arguments>${xml(windowsArguments(command.slice(1)))}</Arguments><WorkingDirectory>${xml(cwd)}</WorkingDirectory></Exec></Actions>
</Task>
`;
}
async function windowsPortsClosed(healthUrl) {
  const url = new URL(healthUrl);
  const port = Number(url.port);
  if (url.hostname !== "127.0.0.1" || url.protocol !== "http:" || port < 1 || port > 65534) throw new Error("Invalid Windows Harness health URL");
  const closed = await Promise.all([port, port + 1].map((candidate) => new Promise((resolve, reject) => {
    const socket = net.connect({ host: "127.0.0.1", port: candidate });
    socket.setTimeout(1500, () => {
      socket.destroy();
      reject(new Error("Windows Harness stop probe timed out"));
    });
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", (error) => {
      if (error.code === "ECONNREFUSED") resolve(true);
      else reject(error);
    });
  })));
  return closed.every(Boolean);
}
export {
  windowsArguments,
  windowsPortsClosed,
  windowsSystemTool,
  windowsTaskXml
};
