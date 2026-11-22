# 开发与调试

贡献流程、代码风格和 DCO 要求见 [`../CONTRIBUTING.md`](../CONTRIBUTING.md)。

## 环境

- Node.js 18+
- Zotero 7+（本项目在 Zotero 10.0.8 上验证）
- WPS Office 12+（本项目在 WPS 12.1.2 Linux 版上验证）
- Linux / Windows / macOS

## 构建

```bash
npm run build
npm test
```

构建脚本只使用 Node 内置模块，内置了一个最小的 ZIP writer，因此 Windows 上不需要 `zip.exe`。

产物：

```
dist/zotero-wps-bridge-<version>.xpi
dist/zotero-wps-bridge-addon-<version>.zip
dist/SHA256SUMS.txt
```

Zotero 插件中内嵌了 WPS 加载项文件（`content/wps-addon-files.js`）。修改 `src/wps-addon/` 后必须重新构建并重新安装 XPI，或者删除 WPS 目录中的 `zotero-wps_*` 后让 Zotero 自动重装。

## 调试 Zotero 插件

1. Zotero → 设置 → 高级 → 打开“调试输出日志”。
2. 查看日志：
   - Linux：`~/.zotero/zotero/<profile>/debug.log` 或启动终端输出
   - Windows：`%APPDATA%\Zotero\Zotero\Profiles\<profile>\debug.log`
3. 过滤关键词：`Zotero WPS Bridge`、`Integration: http`、`/wps/`。

Zotero 的“运行 JavaScript”工具（工具 → 开发者 → 运行 JavaScript）也可以直接调用：

```js
await Zotero.ZoteroWPS.getStatus();
await Zotero.ZoteroWPS.install();
Zotero.ZoteroWPS.forceReset();
```

## 调试 WPS 加载项

1. 在 WPS 文字中按 `Alt + F12` 打开加载项调试器。
2. 在 Console 中可以直接访问 `Application`、`wps`、`ZoteroWPSDoc`、`ZoteroWPSClient`。
3. 常用命令：

```js
ZoteroWPSClient.create('test').ping();
ZoteroWPSDoc.begin('x', Application.ActiveDocument);
ZoteroWPSDoc.getFields('x');
ZoteroWPSDoc.end();
```

WPS 的加载项页面由 WPS 自动生成的 `index.html` 打开；本项目显式提供 `index.html`，避免不同 WPS 版本对 `js/main.js` 与 `main.js` 路径的差异。

## 本地快速迭代

如果不想每次重启 Zotero：

1. 构建一次 XPI 并安装，让 Zotero 生成 WPS 目录和 `config.js`。
2. 修改 `src/wps-addon/` 后，手工复制到 `<jsaddons>/zotero-wps_<version>/`（保留 `js/config.js`）。
3. 完全退出并重新启动 WPS。
4. Zotero 插件本身修改后需要重启 Zotero。

Zotero 插件在启动时会自动重装同版本的 WPS 文件；如果正在做加载项热调试，可以暂时在 Zotero 设置中取消“启动 Zotero 时自动检查并更新”。

## 静态官网

官网源码在 [`../site/`](../site/)，域名 `https://zw.ckern.cn/`。发布包和更新清单由脚本生成：

```bash
UPDATE_URL='https://zw.ckern.cn/updates.json' \
UPDATE_LINK_BASE='https://zw.ckern.cn/downloads/' \
npm run build

npm run build:site
```

详细部署方式（Cloudflare Pages / GitHub Pages、DNS、`updates.json`）见 [`../site/README.md`](../site/README.md)。阿里云香港服务器使用 [`deploy-aliyun.md`](deploy-aliyun.md) 和 `npm run deploy:site`。

## 单元测试

```bash
npm test
```

当前测试覆盖：

- 域代码识别与 WPS/Word ↔ HTTP 转换
- `noteIndex` 读写
- 文档数据 `Http`/`Field` 转换
- JSON 文档数据编码
- 长文档属性分段
- 随机 ID
- 三语言词条完整性、语言代码归一化与参数插值
- 三套 Ribbon 的按钮/分组 ID、文案、图标与 `ribbonKeys` 一致性
- 设置页翻译键、元素 ID、语言/布局选项与危险操作确认
- 版本号、插件 ID、兼容版本范围与 `update_url` 元数据
- 文档中的相对链接与当前版本号
- 静态官网的域名、下载挂钩、资源引用和更新地址检查

人工 GUI 回归请使用 [`gui-test-checklist.md`](gui-test-checklist.md)。当前阶段不配置 CI/自动发布流程。

端到端验证建议：

1. 新建文档，插入一条引文。
2. 插入参考文献表。
3. 切换样式（正文 ↔ 脚注 ↔ 尾注）。
4. 修改 Zotero 条目元数据后点击刷新。
5. 插入笔记、批注引文，检查占位符转换后的标点。
6. 导出文档，在另一个文档中刷新以触发导入。
7. 解除链接，确认文字保留、域消失。
8. 用 Microsoft Word 打开同一 `.docx`，确认 Word 的 Zotero 插件可以刷新。

## 仓库与镜像

- **主仓库：Gitee** <https://gitee.com/ckern/zotero-wps-bridge>
- **GitHub 只读镜像** <https://github.com/ckern-cn/zotero-wps-bridge>
- Issue、PR、Tag、Release 均以 Gitee 为准；不要在两个仓库重复提交。

本地 remote 约定：

```text
origin  -> Gitee（主仓库）
github  -> GitHub（只读镜像）
```

同步命令：

```bash
git push origin main
git push github main
```

## 发布

1. 修改 `package.json` 的 `version`，并同步 `manifest.json`、`zotero-wps.js`、`config.js`、`app.js` 回退值、文档版本号和 `CHANGELOG.md`。
2. `npm test && npm run build`；版本测试会检查所有位置一致。
3. 上传 `dist/zotero-wps-bridge-<version>.xpi` 和 `dist/SHA256SUMS.txt`。
4. Zotero 插件更新时，`ensureInstalled()` 会检测版本并替换 WPS 加载项目录。

## 不要提交的内容

以下内容只应留在本地，远程仓库已通过 `.gitignore` 排除：

- `pay/`：支付 App 原始截图，可能包含手机界面、收款人名称等个人信息；只提交裁剪后的公开二维码。
- `ref/`：菜单参考图，仅供本地设计参考。
- `dist/`、`build/`：构建产物；XPI/ZIP 通过 Release 或官网分发。
- `site/downloads/`：安装包和校验和；部署前由 `npm run build:site` 生成。
- `*.log`、`.env*`、`*.pem`、`*.key`、`*.p12`、数据库文件：日志、凭据和本地状态。
- 任何真实 token、密码、API key、个人邮箱或本机绝对路径。

捐赠二维码是**公开资产**，会随官网和插件分发，因此提交在
`site/assets/donate/`、`src/wps-addon/images/donate-*.png` 和
`src/zotero-plugin/content/donate/`。Fork 必须替换为自己的收款码，或移除捐赠入口。

`src/wps-addon/js/config.js` 中的 token 必须保持空字符串；真实 token 只由 Zotero
在安装时写入本地加载项目录。

发布前建议检查：

```bash
git status --ignored
git grep -nE '/home/|/Users/|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY'
npm test
```

## 注意事项

- 不要在 WPS 运行时删除/覆盖加载项目录后继续使用当前 WPS 会话；需要重启 WPS。
- WPS 退出时可能重写 `publish.xml`；Zotero 启动时会重新写入。
- 修改 `src/shared/protocol.js` 后，构建会把它复制到 WPS 加载项，不要直接编辑 `src/wps-addon/js/protocol.js`（构建产物）。
- `src/zotero-plugin/content/wps-addon-files.js` 是构建生成文件，不应手工编辑。
