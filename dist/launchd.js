// src/supervisor/launchd.js
function launchAgentPlist({ label, command, cwd, environment, log, keepAlive = false }) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(label) || !Array.isArray(command) || !command[0]?.startsWith("/")) throw new Error("Invalid LaunchAgent target");
  const xml = (value) => String(value).replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${xml(label)}</string>
<key>ProgramArguments</key><array>${command.map((arg) => `<string>${xml(arg)}</string>`).join("")}</array>
<key>WorkingDirectory</key><string>${xml(cwd)}</string>
<key>EnvironmentVariables</key><dict>${Object.entries(environment).map(([key, value]) => `<key>${xml(key)}</key><string>${xml(value)}</string>`).join("")}</dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><${keepAlive ? "true" : "false"}/>
<key>Umask</key><integer>63</integer>
<key>ExitTimeOut</key><integer>30</integer>
<key>StandardOutPath</key><string>${xml(log)}</string>
<key>StandardErrorPath</key><string>${xml(log)}</string>
</dict></plist>
`;
}
export {
  launchAgentPlist
};
