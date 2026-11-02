# 部署与恢复

本文面向管理员。示例假设 Harness 由 `deepseek-harness` 账户运行，systemd 服务为 `deepseek-harness.service`，安装在 `/opt/deepseek-harness`。请按实际环境替换，操作前备份 profile 和数据目录。

## 反向代理

当前面向 Web 根路径部署。在 `$DSH_HOME/profiles/web/cordis.patch.yml` 中设置：

```yaml
- id: dsh-lifecycle
  config:
    listenHost: 127.0.0.1
    listenPort: 3080
    upstreamHost: 127.0.0.1
    upstreamPort: 3081
    cookieSecure: true
```

插件会把真实 Harness Web 服务移到内部端口（CLI 端口 + 1）。HTTPS 反向代理指向网关 3080，不能直接转发到 3081。

Nginx 的 HTTPS `server` 内可使用以下位置配置；域名、证书与自动续期需另行配置：

```nginx
location / {
    proxy_pass http://127.0.0.1:3080;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_buffering off;
    proxy_read_timeout 3600s;
    client_max_body_size 6m;
}
```

启动 DSH 时设置实际的 `--public-url https://dsh.example.com/` 和 `--trusted-host dsh.example.com`。

## 安装电源服务

电源操作由本仓库提供的 root systemd 服务执行，DSH 重启时它会继续运行。控制端仅使用 Unix socket，不开放公网端口。它可以停止、启动或升级配置中的固定服务；仅应让可信用户访问这个单用户 Harness。

先完成源码构建和插件安装，再在仓库根目录执行：

```bash
sudo node scripts/install-systemd.mjs \
  --service deepseek-harness.service \
  --user deepseek-harness \
  --home /var/lib/deepseek-harness \
  --install-root /opt/deepseek-harness \
  --node /usr/local/bin/node \
  --npm /usr/local/bin/npm \
  --health-url http://127.0.0.1:3080/login \
  --channel latest
sudo systemctl restart dsh-lifecycle.service
sudo systemctl restart deepseek-harness.service
```

路径必须已存在。`--install-root` 指包含 `node_modules/@deepseek-ai/dsh` 的目录，不是本插件源码目录。该安装方式针对 npm 管理的 Harness 安装；其他包管理器、只读镜像或自定义启动方式需先验证兼容性。

| 位置 | 用途 |
| --- | --- |
| `/opt/dsh-lifecycle/supervisor.js` | 独立控制服务 |
| `/etc/dsh-lifecycle/config.json` | 固定目标服务与路径配置 |
| `/run/dsh-lifecycle/control.sock` | 本地控制 socket，服务所属组可访问 |

默认检查 npm `latest`，也支持 `next`、`alpha`。检测到更高版本才显示更新操作。更新先暂存安装、验证 CLI，再切换并重启；启动失败会尝试恢复旧安装。管理员应保留可用备份，并定期清理暂存与旧安装目录。

## 数据和登录恢复

| `$DSH_HOME` 下的路径 | 内容 |
| --- | --- |
| `auth-gateway/password.json` | scrypt 密码散列 |
| `auth-gateway/otp.json`、`otp-master.key` | 加密 OTP、备份代码记录与主密钥 |
| `auth-gateway/log/audit.log` | 认证审计 |
| `lifecycle/policy.json` | 验证方式与 Passkey 域名 |
| `lifecycle/passkeys.json` | Passkey 公钥、标识与计数器 |
| `lifecycle/sessions.json` | 会话令牌摘要、到期时间与凭据指纹 |
| `lifecycle/wallpapers.json`、`wallpapers/` | 图库索引与图片 |

浏览器 Cookie 使用 HttpOnly、SameSite=Strict；HTTPS 配置启用 Secure。服务端只持久化完整登录的令牌摘要，不保存原始 Cookie，也不恢复只完成第一步的临时会话。恢复时校验凭据指纹；损坏的状态文件会报错，不会自动放行。

忘记密码时，单步模式可用已绑定的 OTP、Passkey 或备份代码登录；刚通过这些方式验证的会话可在五分钟内重设密码。两步模式下丢失密码，需从服务器恢复。

先停止 Harness，再以运行账户执行恢复脚本，确保 HOME 和 DSH_HOME 指向实际数据：

```bash
sudo systemctl stop deepseek-harness.service
sudo -u deepseek-harness env \
  HOME=/var/lib/deepseek-harness \
  DSH_HOME=/var/lib/deepseek-harness/.dsh \
  node /absolute/path/dsh-lifecycle/scripts/reset.mjs --confirm
sudo systemctl start deepseek-harness.service
```

默认只重置密码和会话，保留第二因素。仅在密码和全部第二因素都丢失时，再加 `--all-factors`。工具将受影响文件移为同目录备份；随后从服务日志获取新初始密码。备份同样需要妥善保护。不要在服务运行时手工替换凭据文件。

## Passkey 域名

在「登录与安全 → Passkey」保存 HTTPS 公开地址，例如 `https://dsh.example.com`，再从同一域名访问并绑定。公网 IP 不支持；本地测试允许 `http://localhost`。已有 Passkey 绑定到旧域名时，需先移除旧凭据才能更换域名。

保存域名或变更验证策略会撤销现有登录，需要按新规则重新登录。DNS 解析、证书校验、浏览器支持和云厂商的域名访问要求都需满足。

## 卸载

停止 Harness，先从 profile 移除本插件 bundle 与专属 patch，并恢复需要的原始 Web 端口配置，再启动。若原服务使用密码网关保护，移除网关后应先检查反向代理和访问范围。

独立控制服务可用 `sudo systemctl disable --now dsh-lifecycle.service` 停用。卸载插件不等于删除凭据；数据目录由管理员备份、保留或手工清理，本仓库不提供一键清空凭据的卸载脚本。
