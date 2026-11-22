# 部署到阿里云香港轻量服务器

目标域名：`https://zw.ckern.cn/`  
当前 DNS：`zw.ckern.cn -> 47.243.7.75`

## 当前部署状态

2026-11-22 已完成部署：

- SSH：`ssh -p 12306 -l root ckern.cn`（密钥登录）
- Web 根目录：`/webapps/zw.ckern.cn`
- Nginx 配置：`/etc/nginx/apps/zw.ckern.cn.conf`
- 启动链接：`/etc/nginx/apps.enabled/zw.ckern.cn.conf`
- 证书：`/etc/nginx/ssl/ckern.cn/cert.pem`（SAN 包含 `*.ckern.cn`）
- `https://zw.ckern.cn/`、`/en/`、`/updates.json` 和安装包均已验证返回 200
- HTTP/2 正常，`updates.json` 的 SHA-256 与实际 XPI 一致

当前 `80/tcp` 在服务器 firewalld 中已放行，但从外网访问仍超时，需要在阿里云轻量服务器控制台的安全组中放行 80，才能完成 HTTP → HTTPS 跳转和部分 ACME 校验。

## 一键部署（拿到 SSH 后）

```bash
DEPLOY_HOST=47.243.7.75 \
DEPLOY_USER=root \
DEPLOY_PORT=12306 \
DEPLOY_PATH=/webapps/zw.ckern.cn \
npm run deploy:site
```

脚本会：

1. 使用真实 `UPDATE_URL` / `UPDATE_LINK_BASE` 构建 XPI
2. 执行 `npm run build:site`
3. 用 `rsync` 上传 `site/`（包含 `downloads/`）
4. 在服务器执行 `nginx -t && systemctl reload nginx`

如果不使用 root：

```bash
DEPLOY_USER=deploy \
DEPLOY_RELOAD='sudo nginx -t && sudo systemctl reload nginx' \
npm run deploy:site
```

## Nginx

示例配置：`deploy/nginx-zw.ckern.cn.conf`

```bash
sudo cp deploy/nginx-zw.ckern.cn.conf /etc/nginx/apps/zw.ckern.cn.conf
sudo ln -sf ../apps/zw.ckern.cn.conf /etc/nginx/apps.enabled/zw.ckern.cn.conf
sudo mkdir -p /webapps/zw.ckern.cn
sudo nginx -t
sudo systemctl reload nginx
```

如果使用宝塔面板，把 `site/` 上传到站点根目录，并确保：

- `.xpi` 返回 `application/x-xpinstall`
- `.zip` 返回 `application/zip`
- `/updates.json` 和 `/version.json` 不缓存
- `/downloads/` 可直接访问
- 不要开启目录列表

## 验证

```bash
curl -I https://zw.ckern.cn/
curl -I https://zw.ckern.cn/en/
curl -I https://zw.ckern.cn/updates.json
curl -I https://zw.ckern.cn/downloads/zotero-wps-bridge-latest.xpi
```

然后检查：

- `https://zw.ckern.cn/` 中文页正常
- `https://zw.ckern.cn/en/` 英文页正常
- 语言切换链接正确
- `updates.json` 的 `update_link` 和 `update_hash` 正确
- 从旧版本安装一次，确认 Zotero 能检测到更新
