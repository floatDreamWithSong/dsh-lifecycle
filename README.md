# DSH Lifecycle · DeepSeek 生命周期管理

为单用户 DeepSeek Harness 提供锁屏、登录验证和服务电源管理。

- Windows 风格锁屏与首次设置引导，支持自定义壁纸。
- 密码、OTP、Passkey，支持单步或两步验证；已完成的登录可跨服务重启保留。
- 侧边栏「电源」菜单：锁定、重启、关机，以及检测到新版时的更新并重启。
- DSH 内的「登录与安全」页面，分区管理密码、验证方式、壁纸和登录会话。

## 安装

需要 Node.js **≥ 22.18** 和 DSH Web。当前验证版本为 **DSH 0.2.1-rc.5**；电源操作还需要 Linux、systemd 和独立控制服务。

```bash
git clone https://github.com/floatDreamWithSong/dsh-lifecycle.git
cd dsh-lifecycle
npm ci
npm pack

# 使用运行 Harness 的账户，以及相同的 HOME / DSH_HOME 安装
dsh plugin --profile web add "$PWD/dsh-lifecycle-0.1.2.tgz"
```

`npm pack` 会自动构建并生成安装包。这里采用源码安装，未发布到 npm。

安装后按[部署说明](docs/DEPLOYMENT.md)配置反向代理与独立电源服务，再重启 Harness。替换已有 `dsh-auth-gateway` 或 `dsh-power-menu` 时，先按部署说明迁移，避免重复加载。

## 使用

1. 首次访问时，从 Harness 服务日志取得初始密码，完成改密和验证方式设置。已有认证数据的用户沿用原密码。
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
- **登录默认有效期 30 天。** 锁定、改密、变更验证策略或绑定／移除因素会撤销相应登录。旧认证插件内存中的会话无法迁移，首次切换需重新登录。
- **备份数据目录。** 密码与 OTP 位于 `$DSH_HOME/auth-gateway/`，会话、策略、Passkey 公钥和壁纸位于 `$DSH_HOME/lifecycle/`。这些目录及其备份不要上传到 Git。
- **当前壁纸对未登录访客可见**，图库管理需要登录。不要用包含隐私信息的图片作为锁屏背景。
- 中国内地服务器使用域名前，应完成所需的[备案及接入手续](https://help.aliyun.com/zh/icp-filing/what-scenarios-need-to-be-filed-in-aliyun)。DNS 和证书配置成功，不代表公网访问一定可用。

详细配置、迁移、密码恢复与卸载见[部署说明](docs/DEPLOYMENT.md)。这是早期版本，尚未经过独立安全审计。

## 开发

```bash
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:ui
```

目录：`src/` 为界面、电源接口与控制服务，`lib/` 为认证和代理内核，`tests/` 为测试，`scripts/` 为构建、安装与恢复工具，`dist/` 由构建生成。

## 许可与来源

[MIT](LICENSE)。认证与代理内核基于 [xbzbing/dsh-auth-gateway 0.8.7](https://github.com/xbzbing/dsh-auth-gateway)，电源控制沿用同作者的 dsh-power-menu，代码已包含在本仓库。保留[上游许可](UPSTREAM-LICENSE)与[第三方依赖声明](THIRD-PARTY-NOTICES.md)。内置壁纸为项目生成素材，不含 Windows 原版壁纸。
