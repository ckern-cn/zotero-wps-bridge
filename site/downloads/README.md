# 下载目录

此目录由 `scripts/build-site.js` 生成：

- `zotero-wps-bridge-<version>.xpi`
- `zotero-wps-bridge-latest.xpi`
- `zotero-wps-bridge-addon-<version>.zip`
- `zotero-wps-bridge-addon-latest.zip`
- `SHA256SUMS.txt`

二进制文件不会提交到 git。部署前运行：

```bash
UPDATE_URL='https://zw.ckern.cn/updates.json' \
UPDATE_LINK_BASE='https://zw.ckern.cn/downloads/' \
npm run build

npm run build:site
```

`build-site.js` 会检查 XPI 内的 `update_url` 是否已经是
`https://zw.ckern.cn/updates.json`，避免把本地 `.invalid` 占位包发布出去。
