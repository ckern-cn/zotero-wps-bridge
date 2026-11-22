# XPI 自动更新

> 只有项目所有者，或由项目所有者明确授权的维护者，可以发布官方版本。发布权与品牌规则见 [`../GOVERNANCE.md`](../GOVERNANCE.md) 和 [`../TRADEMARK.md`](../TRADEMARK.md)。

## 结论

**不需要自己的服务器。** Zotero 的插件更新使用 Firefox AddonManager 的静态更新清单机制，只需要：

1. 一个**公开、稳定、HTTPS** 的 `updates.json` 地址；
2. `updates.json` 里指向新版本 `.xpi` 的**公开 URL**；
3. XPI 的 `manifest.json` 中写入 `applications.zotero.update_url`。

任何静态托管都可以，不需要后端逻辑。只有当你需要私有分发、访问控制、统计或内网部署时，才需要自己维护服务器。

## 三个必需的 URL

```text
update_url  -> https://example.com/zotero-wps-bridge/updates.json
update_link -> https://example.com/zotero-wps-bridge/zotero-wps-bridge-0.2.6.xpi
XPI 下载页  -> 用户首次安装时使用（可选）
```

`update_url` 必须写进 XPI 的 `manifest.json`：

```json
{
  "applications": {
    "zotero": {
      "id": "zotero-wps@wps-zotero",
      "update_url": "https://example.com/zotero-wps-bridge/updates.json",
      "strict_min_version": "7.0",
      "strict_max_version": "10.9.9"
    }
  }
}
```

> Zotero 10 要求 `applications.zotero.update_url` 必须存在，否则插件会被判定为损坏并拒绝安装。仓库中的 `.invalid` 地址只是本地构建占位符；正式发布必须通过 `UPDATE_URL` 覆盖。
>
> 插件 ID 保持 `zotero-wps@wps-zotero` 不变。Zotero 以 ID 识别插件，修改 ID 会导致已安装版本无法自动升级；仓库名、显示名和 XPI 文件名可以独立修改。

## updates.json 格式

Zotero 7+ 使用 JSON 更新清单（替代旧版 `update.rdf`）：

```json
{
  "addons": {
    "zotero-wps@wps-zotero": {
      "updates": [
        {
          "version": "0.2.6",
          "update_link": "https://example.com/zotero-wps-bridge/zotero-wps-bridge-0.2.6.xpi",
          "update_hash": "sha256:<xpi-sha256>",
          "applications": {
            "zotero": {
              "strict_min_version": "6.999",
              "strict_max_version": "10.*"
            }
          }
        }
      ]
    }
  }
}
```

- `version` 必须大于用户当前版本。
- `update_link` 必须是可直接下载的 `.xpi`。
- `update_hash` 建议提供，格式为 `sha256:<hex>`；浏览器会校验 XPI 完整性。
- `applications.zotero.strict_min_version` / `strict_max_version` 必须包含目标 Zotero 版本，否则更新会被跳过。

## 本项目已内置生成支持

```bash
UPDATE_URL='https://example.com/zotero-wps-bridge/updates.json' \
UPDATE_LINK_BASE='https://example.com/zotero-wps-bridge/' \
npm run build
```

构建会：

- 把 `update_url` 写入 XPI 的 `manifest.json`
- 生成 `dist/updates.json`
- 生成 `dist/SHA256SUMS.txt`

也可以直接指定完整下载地址：

```bash
UPDATE_URL='https://example.com/zotero-wps-bridge/updates.json' \
UPDATE_LINK='https://example.com/zotero-wps-bridge/releases/zotero-wps-bridge-0.2.6.xpi' \
npm run build
```

不设置这些环境变量时，构建产物**不包含** `update_url`，也不会生成 `updates.json`，只能手动更新。

## 托管方案

| 方案 | 是否需要自己的服务器 | 适用场景 | 注意 |
| --- | --- | --- | --- |
| **GitHub Pages** | 否 | 开源项目，最推荐 | 静态 HTTPS，URL 稳定，适合放 `updates.json` + XPI |
| **GitHub Releases** | 否 | 已有 GitHub 发布流程 | `updates.json` 也要作为 release asset 上传；`update_link` 指向版本化 XPI |
| **Cloudflare Pages / R2** | 否 | 免费/低成本 CDN | 需要自定义域名更稳 |
| **S3 / 阿里云 OSS / 腾讯云 COS** | 否（对象存储） | 国内访问、企业分发 | 配置公开读、HTTPS、正确的 `application/json` |
| **Netlify / Vercel** | 否 | 已有前端部署 | 静态文件即可 |
| **自己的 Nginx/Apache** | 是（如果已有服务器则不需要新买） | 内网、企业、需要访问日志 | 只需静态文件，不需要后端代码 |
| **无托管** | 否 | 不想维护更新 | 删除 `update_url`，用户手动装新 XPI |

### GitHub Pages 示例

把以下文件放到 Pages 根目录：

```text
updates.json
zotero-wps-bridge-0.2.6.xpi
```

构建：

```bash
UPDATE_URL='https://<user>.github.io/zotero-wps-bridge/updates.json' \
UPDATE_LINK_BASE='https://<user>.github.io/zotero-wps-bridge/' \
npm run build
```

然后把 `dist/updates.json` 和 `dist/zotero-wps-bridge-0.2.6.xpi` 发布到 Pages。

### GitHub Releases 示例

1. 创建 release `v0.2.6`，上传 `zotero-wps-bridge-0.2.6.xpi` 和 `updates.json`。
2. 构建时使用：

```bash
UPDATE_URL='https://github.com/<user>/zotero-wps-bridge/releases/latest/download/updates.json' \
UPDATE_LINK_BASE='https://github.com/<user>/zotero-wps-bridge/releases/download/v0.2.6/' \
npm run build
```

注意：`releases/latest/download/updates.json` 只有在**最新 release**包含 `updates.json` 时才有效；每次发版都要上传它。

### 自己的服务器示例

Nginx 只需要静态文件：

```nginx
location /zotero-wps/ {
    alias /var/www/zotero-wps/;
    add_header Cache-Control "no-cache";
    types { application/json json; }
}
```

把 `updates.json` 和 XPI 放在目录中即可，不需要 CGI、数据库或反向代理。

## Zotero 如何检查更新

- Zotero 使用 Firefox AddonManager 的插件更新机制，启动时和定期检查 `update_url`。
- 用户也可以在 Zotero 的插件管理页面手动检查更新（具体菜单项取决于 Zotero 版本）。
- 自动下载/安装行为受 Zotero/Firefox 的插件更新偏好影响；企业环境可能通过策略禁用自动更新。
- 更新后可能需要重启 Zotero；WPS 加载项会在 Zotero 下次启动时自动同步到 WPS 目录。

## 发版检查清单

1. 修改 `package.json` 的 `version`（必须大于旧版本）。
2. `npm test && npm run build`。
3. 用 `UPDATE_URL` / `UPDATE_LINK_BASE` 构建发布包。
4. 上传：
   - `zotero-wps-bridge-<version>.xpi`
   - `updates.json`
   - `SHA256SUMS.txt`（可选）
5. 确认 `updates.json` 中的 `version`、`update_link`、`update_hash` 正确。
6. 用旧版本 XPI 安装一次，等待/触发更新检查，验证能升级到新版本。
7. 在 Zotero 插件页面确认新版本已加载，并重启 WPS 确认加载项已更新。

## 常见问题

### 必须 HTTPS 吗？

公网分发强烈建议 HTTPS。Zotero/Firefox 对更新源的安全性有要求；HTTP 或自签名证书可能导致更新失败。

### 可以用 GitHub Raw 吗？

可以尝试，但 `raw.githubusercontent.com` 的 Content-Type 和缓存行为不如 GitHub Pages/Releases 稳定。推荐 GitHub Pages、Cloudflare Pages 或对象存储。

### 内网/私有分发怎么办？

自动更新接口本身没有认证机制。内网用户可以通过 HTTPS 内网地址访问更新源；如果必须登录才能下载，自动更新通常无法工作，建议手动分发 XPI。

### 不配置 update_url 会怎样？

插件仍可正常安装和使用，但不会自动检查新版本，用户必须手动下载并安装新 XPI。

### 更新失败会不会破坏现有插件？

更新是替换 XPI 的过程；如果新 XPI 损坏或签名/兼容性不通过，AddonManager 会拒绝更新，旧版本继续保留。建议提供 `update_hash` 并在发版前用旧版本实测一次。
