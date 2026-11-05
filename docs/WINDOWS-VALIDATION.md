# Windows 实测记录

验证日期：2026-11-05。验证对象为 dsh-lifecycle 0.1.7，使用 Windows 11 x64、Node.js 24.16.0、Windows 自带的任务计划程序及 Windows PowerShell。浏览器自动化使用本机 Chrome，无需真实模型 API Key。

## 实际 Harness 验证

| 安装方式 | 版本 | 结果 |
| --- | --- | --- |
| `deepseek-harness` 源码构建 | `fcc0ad4621`，`0.2.2-rc.1` | 真实页面首次设置、登录、锁屏、重启、停止、手动重新启动通过 |
| 独立 npm 安装 | `0.2.1-rc.4` → `0.2.2-rc.1` | 页面「更新并重启」通过，更新后原登录仍有效 |
| 独立 npm 安装故障注入 | 下载并验证真实新版本后，仅让暂存 CLI 启动失败 | 等待就绪超时后恢复旧目录、重新启动旧版本，原登录仍有效 |

两个控制服务和 Harness 均由真实任务计划程序启动，不是模拟 `schtasks.exe`。验证了中文及空格控制目录、命名管道令牌鉴权、两个监听端口释放、关闭 Harness 后独立控制服务继续运行。所有数据均放在隔离的 `DSH_HOME`，未修改日常 profile，也未修改 Harness 源码。

## 修复的问题

- 状态文件通过只读句柄执行 `fsync`，Windows 报 `EPERM`，导致首次设置和持久登录无法使用。现改用写句柄写入并刷新；仅 Unix 额外刷新目录，文件写入错误仍向上抛出。
- 交互式任务直接启动控制台进程会出现窗口，关闭控制台会结束服务。现使用隐藏启动器，日志直接写入受保护的文件，包括原始标准输出和错误输出。
- 仅隐藏包装进程仍不够：结束任务可能留下 Node 子进程继续占用端口。现将挂起创建的 Node 加入 kill-on-close Job Object 后再恢复执行，结束启动器时清理全部子孙进程。真实重启测试曾因此失败，修复后通过；另有独立子孙进程清理回归测试。
- AppData 在打包应用内可能被虚拟化，任务计划程序无法访问。增加 `--controller-root`，启动器从相邻文件读取配置，控制服务接收明确的配置路径。安装器现在检查实际就绪，不只检查任务注册成功。
- 未打开端口不代表任务已经停止。Windows 停止操作始终调用幂等的 `/End`，再检查端口，避免遗漏仍在启动的进程。
- 修复 CRLF、Unix 权限断言及平台路径导致的 Windows 测试误报；锁文件不再依赖内部 npm 镜像。

## 检查结果

| 命令 | 结果 |
| --- | --- |
| 插件 `npm test` | 104 通过，2 个仅适用于 Unix 的测试明确跳过 |
| 插件 `npm run test:ui` | 10 通过，覆盖密码、OTP、虚拟 WebAuthn、移动端、壁纸与安全面板 |
| 插件 `npm run test:windows` | 真实源码 Harness 生命周期回归通过 |
| 插件 `npm run test:windows-update` | 真实 npm 更新及故障回滚回归通过 |
| Harness `pnpm run build:artifacts` | 8 个构建检查通过 |
| Harness `pnpm run build:check` | Host、Client 聚合检查通过 |

## 复测

以下测试需在插件源码仓库安装开发依赖后执行。请使用可停止、可替换的独立测试实例，不能把日常实例直接用于更新故障注入。先完成首次密码设置。源码实例启动时，在 `web` 后、应用参数之前加入 `--patch <插件目录>/tests/integration/windows.patch.yml`，关闭无模型账户时的非相关引导；源码 Harness 的目录选择器覆盖见其 `apps/web/tests/pin-browse-picker.overlay.yml`。

```powershell
$env:DSH_LIFECYCLE_TEST_CONFIG = 'D:\DSH\test-controller\config.json'
$env:DSH_LIFECYCLE_TEST_PASSWORD = '<测试实例密码>'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:windows
```

npm 更新测试改用 `DSH_LIFECYCLE_UPDATE_TEST_CONFIG` 指向独立 npm 测试实例的控制配置，并执行 `npm run test:windows-update`。实例当前版本必须低于配置通道的发布版本。测试会真实下载安装包、停止服务、修改暂存 CLI 以制造启动失败、执行回滚，再从真实页面更新；允许最长十分钟。测试密码及本地控制令牌不会写入公开测试记录。

## 边界

Windows 停止是强制结束托管进程树，不是优雅退出；正在运行的工具、模型请求和未完成写入会中断。已完成登录的重启持久性已经验证，但不保证断电时未提交写入的恢复。Windows 目录持久性不承诺与 Unix 目录 `fsync` 等价。

Windows 10、组织策略限制环境、真实硬件 Passkey、用户退出登录后的持续运行未验证。Passkey 自动化使用虚拟认证器，不能代替 Windows Hello 硬件验证。现有 Windows 0.1.6 安装必须按[部署说明](DEPLOYMENT.md)重装独立控制服务，而不只是更新插件包。
