# Zotero WPS Bridge

在 **WPS 文字** 中使用 **Zotero** 插入、编辑和刷新引文与参考文献。

这是一个“原生”集成方案，不需要安装 Python、Node 或其他本地代理进程：

- **Zotero 插件**（`.xpi`）：在 Zotero 的本地 HTTP 服务上提供 `/wps/*` 桥接接口，并自动把 WPS 加载项安装到 WPS 的 `jsaddons` 目录。
- **WPS 加载项**：使用 WPS 官方 JavaScript API（`wps.WpsApplication()`）读写文档域，通过 Zotero 的 [HTTP citing protocol](https://www.zotero.org/support/dev/client_coding/http_integration_protocol) 与 Zotero 通信。

## 项目原则

- **功能免费**：所有已发布功能免费使用，不设付费版、订阅、功能锁或使用次数限制。
- **捐赠自愿**：捐赠完全自愿，不换取功能、优先支持、路线图投票或品牌使用权。
- **贡献低门槛**：使用 DCO，不需要 CLA 或版权转让；文档、翻译、测试和小修复都欢迎。
- **品牌与发布受控**：官方名称、图标、安装包和更新渠道由项目所有者统一管理；fork 必须改名换标，不能冒充官方版本。

## 功能

- 插入 / 编辑引文（`addEditCitation`）
- 插入 / 编辑参考文献表（`addEditBibliography`）
- 刷新文档中的全部引文与参考文献（`refresh`）
- 文档设置：切换 CSL 样式、正文/脚注/尾注引文（`setDocPrefs`）
- 插入 Zotero 笔记（`addNote`）
- 插入批注引文（`addAnnotation`）
- 引文浏览器（Citation Explorer）
- 导出/导入文档（与其他文字处理器互相迁移）
- 解除链接：删除域代码并保留文字（`removeCodes`）
- 引文保存在 Word 兼容的 `ADDIN ZOTERO_*` 域中，因此 WPS 与 Microsoft Word 可以互相打开、继续编辑
- 支持正文引文、脚注引文与尾注
- 界面支持 **English (United States)**、**简体中文**、**繁體中文**
- 不依赖 Python/Node 代理，Zotero 插件直接提供本地桥接接口

## 安装

Linux 完整安装说明（含 deb/rpm、Flatpak/Snap、Wayland、手动安装与故障排查）见 [`docs/install-linux.md`](docs/install-linux.md)。

### 1. 安装 Zotero 插件

1. 下载或构建 `dist/zotero-wps-bridge-<version>.xpi`。
2. 打开 Zotero → **工具 → 插件**。
3. 点击右上角齿轮 → **Install Plugin From File…**，选择 `.xpi`。
4. 重启 Zotero（或按提示启用插件）。

### 2. 让 WPS 创建加载项目录

先启动一次 WPS 文字（可以马上关闭），让 WPS 创建：

- Windows：`%APPDATA%\kingsoft\wps\jsaddons`
- Linux：`~/.local/share/Kingsoft/wps/jsaddons`
- macOS：`~/Library/Containers/com.kingsoft.wpsoffice.mac/Data/.local/share/Kingsoft/wps/jsaddons`

### 3. 在 Zotero 中安装 WPS 加载项

1. 打开 Zotero → **编辑 → 设置 → WPS**（macOS 为 **Zotero → Settings → WPS**）。
2. 点击 **安装 / 修复 WPS 加载项**。
3. 如果 WPS 正在运行，请**完全退出** WPS（包括托盘/后台进程），再重新打开 WPS 文字。
4. 在 WPS 功能区应该出现 **Zotero** 选项卡。
5. 界面语言可在同一页的 **界面语言** 中选择“自动 / English / 简体中文 / 繁體中文”。切换后会自动重写功能区，**重启 WPS 文字**即可生效。
6. **菜单布局** 可在同一页选择“当前分组布局 / EndNote 风格 / Zotero 风格”，也可以直接在 WPS 的 Zotero 选项卡中点击 **切换布局**。切换后需要重启 WPS 文字。

> Zotero 每次启动时会自动检查并更新 WPS 加载项。若 WPS 在退出时重写了 `publish.xml`，重新打开 Zotero 或点击一次“安装 / 修复”即可恢复。

## 使用

1. 保持 Zotero 运行。
2. 在 WPS 文字中把光标放到要插入引文的位置。
3. 点击 **Zotero → 插入/编辑引文**。
4. 在 Zotero 弹出的引文窗口中选择条目并确认。
5. 需要参考文献表时，把光标放到文末，点击 **插入/编辑参考文献**。
6. 修改样式或增删引文后，点击 **刷新**。

第一次插入引文时，Zotero 会要求选择引文样式和引文位置（正文/脚注/尾注）。之后可以在 **文档设置** 中修改。

其他功能：

- **插入批注引文**：把 Zotero 条目中的批注/高亮作为引文插入。
- **引文浏览器**：打开 Zotero 的 Citation Explorer，查看文档中的引文并定位到条目。
- **导出文档**：把当前文档转换为可在 Word/LibreOffice 中继续编辑的格式；导出后请另存为新文档，在目标软件中打开并点击 **刷新** 完成导入。
- **解除链接**：删除所有 Zotero 域，保留当前显示文字。此操作不可逆，建议只对最终稿使用。

## 常见问题

### WPS 中没有 Zotero 选项卡

- 确认已经在 Zotero 设置中点击过“安装 / 修复 WPS 加载项”。
- 确认 WPS 已完全退出并重新启动。
- 打开 Zotero 设置 → WPS，确认状态为“已安装”，并检查加载项目录。
- 某些 WPS 版本会限制 `jsplugins.xml` 模式，本项目同时写入 `publish.xml`、`jsplugins.xml` 和 `authwebsite.xml`；仍无效时请升级 WPS 后重新安装。

### 提示“无法连接 Zotero”

- 确认 Zotero 正在运行。
- 确认 Zotero 的“设置 → WPS”中端口显示正常（默认 23119）。
- 重新点击“安装 / 修复 WPS 加载项”，然后重启 WPS。
- 检查本机防火墙是否阻止 `127.0.0.1` 本地回环连接。

### 提示“Zotero 正在处理另一个引用事务”

通常是上一次操作被中断（例如强制关闭了 WPS）。可以：

- 在 Zotero 设置 → WPS 中点击 **强制重置卡住的事务**；或
- 重启 Zotero（最可靠）。

### 引文显示 `{Updating}` 或 `TEMP`

说明事务没有完成。重新点击“刷新”；若仍无效，重启 Zotero 和 WPS 后重试。

### 与 Word 文档的兼容性

WPS 中保存的域代码格式为：

```
 ADDIN ZOTERO_ITEM CSL_CITATION {...}
 ADDIN ZOTERO_BIBL {...} CSL_BIBLIOGRAPHY
```

这与 Zotero 的 Microsoft Word 插件兼容。用 Word 打开后可以继续用 Word 的 Zotero 插件刷新；反向亦然。WPS 侧可通过“导出文档”生成可迁移文档，在目标文字处理器中刷新即可导入。

## 安全说明

- 桥接接口只监听 `127.0.0.1`。
- `/wps/*` 接口仅对 `file://`、`null` 和本机回环来源开放 CORS。
- 所有会修改文档或触发 Zotero 操作的接口都要求随机访问令牌；令牌由 Zotero 插件生成并写入 WPS 加载项的 `js/config.js`。
- 令牌文件 `js/config.js` 在支持 POSIX 权限的平台上会设置为 `0600`。
- Zotero 调试日志在高级日志级别下可能包含请求体中的令牌；分享日志前请先重置令牌或删除敏感内容。
- 令牌可以在 Zotero 设置中重置；重置后需要重新安装加载项并重启 WPS。

## 构建

需要 Node.js 18+。构建脚本不依赖第三方 npm 包。

```bash
npm run build
npm test
```

产物：

- `dist/zotero-wps-bridge-<version>.xpi`：Zotero 插件（已内嵌 WPS 加载项）
- `dist/zotero-wps-bridge-addon-<version>.zip`：独立 WPS 加载项（手动安装/开发调试用）
- `dist/SHA256SUMS.txt`

### 自动更新

> 源码中的 `update_url` 是 `.invalid` 占位地址，仅用于让本地构建可以通过 Zotero 10 的安装校验。正式发布必须设置 `UPDATE_URL`，否则不会产生可用的自动更新。

不需要自己的服务器，静态 HTTPS 托管即可（GitHub Pages、GitHub Releases、Cloudflare Pages、对象存储或现有 Nginx）：

```bash
UPDATE_URL='https://example.com/zotero-wps-bridge/updates.json' \
UPDATE_LINK_BASE='https://example.com/zotero-wps-bridge/' \
npm run build
```

构建脚本会写入 `update_url` 并生成 `dist/updates.json`。完整的更新清单格式、托管方案和发版检查清单见 [`docs/updates.md`](docs/updates.md)。

### 手动安装独立 WPS 加载项

一般不需要。若需要手动安装：

1. 解压 `zotero-wps-bridge-addon-<version>.zip` 到 `<jsaddons>/zotero-wps_<version>/`。
2. 在 `<jsaddons>/publish.xml` 的 `<jsplugins>` 中加入：

   ```xml
   <jsplugin name="zotero-wps" type="wps" url="zotero-wps_<version>"
             version="<version>" enable="enable_dev" install="null" customDomain=""/>
   ```

   `zotero-wps_<version>` 和 `name="zotero-wps"` 是 WPS 的内部标识，保持不变，与仓库名、安装包文件名无关。

3. 从 Zotero 设置中复制访问令牌，填入 `js/config.js` 的 `token`，并把 `port` 改为 Zotero 实际端口。
4. 重启 WPS。

## 项目结构

```
src/
  shared/protocol.js        # 域代码/文档数据转换（WPS 与测试共用）
  shared/i18n.js            # 三语言界面文案（Zotero 与 WPS 共用）
  zotero-plugin/            # Zotero 7+ 启动式插件
    bootstrap.js
    content/zotero-wps.js   # /wps/* 接口、CORS、安装器
    content/preferences.*   # Zotero 设置面板
  wps-addon/                # WPS 文字加载项
    main.js
    ribbon.xml
    js/zotero.js            # HTTP citing protocol 客户端
    js/doc.js               # WPS 文档/域操作
    js/richtext.js          # HTML → WPS 富文本
scripts/build.js            # 打包 .xpi / .zip
tests/                      # Node 单元测试
docs/                       # 架构、协议、安装、更新、GUI 测试
artwork/                    # 图标源文件与导出图
.github/                    # issue/PR 模板与捐赠配置
CHANGELOG.md                # 版本变更记录
CONTRIBUTING.md             # 贡献指南（DCO）
GOVERNANCE.md               # 治理、维护者与发布权
TRADEMARK.md                # 品牌、名称与 fork 规则
SECURITY.md                 # 私密漏洞报告
DONATE.md                   # 捐赠说明
SUPPORT.md                  # 支持范围
CODE_OF_CONDUCT.md          # 行为准则
```

更多设计说明见 [`docs/architecture.md`](docs/architecture.md)、[`docs/protocol.md`](docs/protocol.md)；人工回归请使用 [`docs/gui-test-checklist.md`](docs/gui-test-checklist.md)。

## 非目标（当前阶段）

- **不实现书签（Bookmarks）存储模式**。当前仅使用域（Fields）；Zotero 官方也建议优先 Fields。
- 暂不做 CI 与正式发布流程（自动上传 XPI、静态源托管、真实自动更新演练）。
- Windows/macOS 实机回归、协同编辑、多用户并发暂不在当前交付范围。

## 已知限制

- 不支持“书签（Bookmarks）”存储模式；当前仅使用域（Fields）。
- 富文本输出使用 HTML → WPS 转换，复杂 CSS、部分背景/字体样式与 Word 的 RTF 输出不完全一致。
- WPS JavaScript API 在不同平台/版本上存在差异；本项目在 WPS 12.1.2（Linux）与 Zotero 10.0.8 上做过端到端验证，Windows/macOS 仍需实机验证。
- 大文档（数百至上千条引文）下，域索引查找可能变慢。
- 撤销/重做、修订模式、受保护文档、页眉页脚/文本框中的域尚未专项验证。
- “自动”语言模式以 Zotero 的界面语言为准（这样 Zotero 设置面板与 WPS 功能区保持一致）；如需 WPS 使用不同语言，请显式选择。
- 手动安装独立 WPS 加载项时，`ribbon.xml` 默认为英文；需要本地化功能区时请使用 Zotero 的“安装 / 修复 WPS 加载项”。
- WPS 运行时会占用加载项目录；安装/更新后总是需要重启 WPS 才能生效。

## 参与贡献

欢迎报告 bug、改进文档、补充翻译、增加测试或提交代码。小修复可以直接开 PR；较大的改动建议先开 issue。

- 贡献指南：[`CONTRIBUTING.md`](CONTRIBUTING.md)
- 行为准则：[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- 安全报告：[`SECURITY.md`](SECURITY.md)
- 治理与发布权：[`GOVERNANCE.md`](GOVERNANCE.md)

本项目使用 DCO，不需要 CLA，也不要求版权转让。

## 捐赠与支持

项目不设付费版，捐赠不解锁功能。若项目对你有帮助且有余力，可以自愿捐赠；不捐赠也完全不影响使用、issue 处理或功能完整性。

- 捐赠说明：[`DONATE.md`](DONATE.md)
- 支持范围：[`SUPPORT.md`](SUPPORT.md)

捐赠不购买优先支持、定制开发或路线图控制权。

## 品牌与发布

官方版本只通过本仓库 README 公布的渠道发布。代码按 AGPL-3.0-or-later 开放，允许 fork 和修改，但项目名称、图标和官方发布渠道由项目所有者管理；fork 必须使用自己的名称、图标、插件 ID 和更新地址。

详见 [`TRADEMARK.md`](TRADEMARK.md) 和 [`GOVERNANCE.md`](GOVERNANCE.md)。

## 致谢与许可证

本项目的协议实现参考了 Zotero 官方的 HTTP citing protocol、Google Docs 集成以及社区的 WPS 集成项目：

- [tankwyn/WPS-Zotero](https://github.com/tankwyn/WPS-Zotero)
- [l0o0/Zotero-WPS](https://github.com/l0o0/Zotero-WPS)
- [Zotero HTTP citing protocol](https://www.zotero.org/support/dev/client_coding/http_integration_protocol)

本项目代码以 **AGPL-3.0-or-later** 发布，详见 [`LICENSE`](LICENSE)。

项目名称、图标和品牌素材用于标识官方项目，不随代码许可授予商标或品牌使用权；详见 [`TRADEMARK.md`](TRADEMARK.md)。

Zotero 是 Corporation for Digital Scholarship 的商标，WPS 是 Kingsoft Office Software 的商标；本项目与二者均无官方隶属关系。
