# DSH Lifecycle · DeepSeek 生命周期管理

为单用户 DeepSeek Harness 提供锁屏、登录验证和服务电源管理。

- Windows 风格锁屏与首次设置引导，支持自定义壁纸。
- 密码、OTP、Passkey，支持单步或两步验证；已完成的登录可跨服务重启保留。
- 侧边栏「电源」菜单：锁定、重启、关机，以及检测到新版时的更新并重启。
- DSH 内的「登录与安全」页面，分区管理密码、验证方式、壁纸和登录会话。

## 安装

需要 Node.js **≥ 22.18** 和 DSH Web。当前验证版本为 **DSH 0.2.1-rc.5**；电源操作还需要 Linux、systemd 和本仓库提供的电源控制服务。

```bash
dsh plugin --profile web add dsh-lifecycle
```

请使用运行 Harness 的账户，以及相同的 HOME / DSH_HOME 安装。

安装后按[部署说明](docs/DEPLOYMENT.md)配置 HTTPS，并安装本仓库提供的电源控制服务，再重启 Harness。

## 使用

1. 首次访问时，从 Harness 服务日志取得初始密码，完成改密和验证方式设置。
2. 点击锁屏或按 Enter 进入登录。登录后，从侧边栏或「电源 → 登录与安全」进入设置。
3. 在「锁屏壁纸」上传、选择或删除背景；支持 PNG、JPEG、WebP，每张最多 **5 MB**，最多 **12 张**，可随时恢复内置壁纸。
4. 「锁定」只退出当前浏览器；「关机」停止 Harness 服务，之后需在服务器启动，**不会关闭操作系统**。

```bash
# 以下服务名按实际部署替换
sudo journalctl -u deepseek-harness.service -n 100 --no-pager
sudo systemctl start deepseek-harness.service
```

## 注意事项

- **公网部署使用 HTTPS。** 网关放在反向代理之后，内部 Harness 端口仅监听回环地址；会话 Cookie 启用 Secure。
- **Passkey 需要稳定的 HTTPS 域名，公网 IP 不支持。** 可先用密码或 OTP，之后在 Passkey 标签页保存域名，从该域名访问后绑定。
- **两步验证必须先验证密码，再验证 OTP / Passkey。** 忘记密码时，第二因素不能跳过第一步；保留服务器管理入口和 OTP 备份代码。
- **登录默认有效期 30 天。** 锁定、改密、变更验证策略或绑定／移除因素会撤销相应登录。
- **定期备份插件数据**，备份文件不要上传到 Git。
- **当前壁纸对未登录访客可见**，图库管理需要登录。不要用包含隐私信息的图片作为锁屏背景。
- 中国内地服务器使用域名前，需完成所需的备案及接入手续。

详细配置、密码恢复与卸载见[部署说明](docs/DEPLOYMENT.md)。

## 许可

[MIT](LICENSE)。
