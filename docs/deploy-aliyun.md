# 部署到阿里云香港轻量服务器

目标域名：`https://zw.ckern.cn/`  
当前 DNS：`zw.ckern.cn -> 47.243.7.75`

## 当前服务器检查结果

- 443 端口可建立 TLS 连接，证书为 `CN=ckern.cn`（Let's Encrypt）
- HTTP/1.1、HTTP/2 请求均返回空响应
- 22 / 2222 / 22022 等 SSH 端口当前不可达
- 需要先在阿里云轻量服务器控制台确认：
  - SSH 端口和防火墙/安全组
  - Nginx 是否已配置 `zw.ckern.cn` 的 server block
  - Web 根目录，例如 `/webapps/zw.ckern.cn`

在拿到 SSH 访问前，无法安全地直接上传。

## 一键部署（拿到 SSH 后）

```bash
DEPLOY_HOST=47.243.7.75 \
DEPLOY_USER=root \
DEPLOY_PORT=22 \
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
