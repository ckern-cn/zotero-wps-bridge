# 官方网站（zw.ckern.cn）

这是 `Zotero WPS Bridge` 的静态单页站点。纯 HTML/CSS/JS，没有后端、账号、数据库或第三方统计。

## 发布前必须修改

1. `config.js` 中的仓库地址：
   - `repo`
   - `releases`
   - `issues`
   - `changelog`
   - `license`
   - `security`
   - `donate`
2. 如域名有变化，同时修改：
   - `index.html` 的 canonical / Open Graph / Twitter 地址
   - `robots.txt`
   - `sitemap.xml`
   - `CNAME`
   - `scripts/build-site.js` 中的默认 `SITE_URL`

当前 `config.js` 使用 `https://github.com/ckernstudio/zotero-wps-bridge` 作为占位仓库地址，公开前请替换为真实地址。

## 构建与预览

站点本身不需要构建，直接打开 `index.html` 即可预览。下载文件和更新清单由脚本生成：

```bash
# 1. 生成带真实 update_url 的发布包
UPDATE_URL='https://zw.ckern.cn/updates.json' \
UPDATE_LINK_BASE='https://zw.ckern.cn/downloads/' \
npm run build

# 2. 复制安装包、生成 version.json / updates.json
npm run build:site

# 3. 本地预览
python3 -m http.server 8080 --directory site
# 浏览器打开 http://127.0.0.1:8080/
```

`build-site.js` 会检查 XPI 内的 `update_url`，如果仍是 `.invalid` 占位地址会直接报错，防止把不能自动更新的包发出去。

## 部署到 Cloudflare Pages

推荐方式：

1. 在 Cloudflare Pages 创建项目，连接仓库。
2. Build command：

   ```bash
   npm run build && npm run build:site
   ```

3. Build output directory：`site`
4. 环境变量：

   ```text
   UPDATE_URL=https://zw.ckern.cn/updates.json
   UPDATE_LINK_BASE=https://zw.ckern.cn/downloads/
   ```

5. 在 Pages 的 Custom domains 中添加 `zw.ckern.cn`。
6. DNS 按 Cloudflare 提示添加 CNAME：

   ```text
   zw  CNAME  <project>.pages.dev
   ```

   如果域名已经托管在 Cloudflare，通常会自动添加。

`site/CNAME` 主要给 GitHub Pages 使用；Cloudflare Pages 以控制台配置为准。

## 部署到 GitHub Pages

1. 把 `site/` 作为 Pages 发布目录，或使用 `gh-pages` 分支。
2. `site/CNAME` 已写入 `zw.ckern.cn`。
3. 在域名 DNS 中添加：

   ```text
   zw  CNAME  <user>.github.io
   ```

4. Pages 设置中启用 HTTPS。

## 更新文件

`build-site.js` 会生成：

```text
site/downloads/zotero-wps-bridge-<version>.xpi
site/downloads/zotero-wps-bridge-latest.xpi
site/downloads/zotero-wps-bridge-addon-<version>.zip
site/downloads/zotero-wps-bridge-addon-latest.zip
site/downloads/SHA256SUMS.txt
site/updates.json
site/version.json
```

`updates.json` 必须部署在：

```text
https://zw.ckern.cn/updates.json
```

Zotero 会自动从这里检查新版本。`version.json` 只用于页面显示最新版本号和下载链接。

## 文件说明

```text
site/
  index.html          首页
  404.html            404 页面
  styles.css          样式
  app.js              导航、版本号、下载链接
  config.js           仓库/下载地址配置
  CNAME               GitHub Pages 自定义域名
  _headers            Cloudflare Pages 安全与缓存头
  manifest.webmanifest
  robots.txt
  sitemap.xml
  assets/             图标、功能区图标、捐赠二维码
  downloads/          构建生成的安装包（不提交二进制）
```

## 捐赠二维码

`assets/donate/` 中的二维码是从 `pay/` 原始收款截图裁剪而来：

- 只保留二维码和四周白色静区；
- 移除手机截图中的横幅、Logo、说明文字和收款人名称；
- 保留原始分辨率，网页显示时再缩小；
- 原始截图在 `.gitignore` 中忽略，不提交到仓库。

更换收款码后，重新裁剪并替换 `assets/donate/alipay-qr.png`、
`assets/donate/wechat-qr.png`，然后用手机分别扫码验证。

## 注意

- 不要在这个目录放 token、用户数据或私有日志。
- 不要引入第三方统计脚本；项目以“本地优先、无遥测”为卖点。
- 修改版本号后重新运行 `npm run build:site`，不要手改 `downloads/` 或 `updates.json`。
- 站点文案里的“已验证”目前只适用于 Linux + WPS 12.1.2 + Zotero 10.0.8；Windows/macOS 保持 Beta 表述。
