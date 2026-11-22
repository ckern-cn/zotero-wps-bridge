# 架构说明

## 为什么需要 Zotero 侧插件

Zotero 的本地 HTTP 服务默认会拒绝来自“浏览器”的请求（WPS 的 JS 引擎基于 CEF，User-Agent 以 `Mozilla/` 开头），并且不会为普通网页来源返回 CORS 头。社区早期的 WPS 集成因此需要运行一个 Python 代理。

本方案把代理逻辑放进 Zotero 插件：

1. 在 `/wps/*` 路径上提供专用接口；
2. 仅对这些路径、仅对本机文件/回环来源返回 CORS 头；
3. 通过随机令牌保护所有会触发 Zotero 操作的请求；
4. 直接复用 Zotero 内部的 `Zotero.Integration` 与 `Zotero.HTTPIntegrationClient`。

因此运行时不依赖 Python，也不会修改 Zotero 自带的 `/connector/*` 接口。

## 组件

```
┌──────────────────────┐        HTTP/JSON         ┌─────────────────────────┐
│ WPS 文字              │  http://127.0.0.1:23119  │ Zotero                  │
│                      │ ───────────────────────> │                         │
│ WPS 加载项            │                          │ Zotero 插件             │
│  - ribbon.xml        │ <─────────────────────── │  - /wps/* 接口          │
│  - js/zotero.js      │   command / response     │  - CORS 白名单          │
│  - js/doc.js         │                          │  - WPS 加载项安装器     │
│  - js/richtext.js    │                          │  - 设置面板             │
└──────────────────────┘                          └───────────┬─────────────┘
                                                              │
                                                   Zotero.Integration
                                                   Zotero.HTTPIntegrationClient
                                                              │
                                                   Zotero 引文对话框 / CSL
```

- **WPS 加载项**运行在 WPS 的内置 CEF 页面中，页面通过 `file://` 加载。
- **Zotero 插件**运行在 Zotero 主进程，拥有完整的本地文件权限，可以把 WPS 加载项写入 WPS 的 `jsaddons` 目录。

## 请求流程

以“刷新”为例：

1. WPS 点击“刷新”。
2. 加载项生成文档 ID，调用 `POST /wps/execCommand`：

   ```json
   { "token": "...", "command": "refresh", "docId": "..." }
   ```

3. Zotero 插件校验令牌，设置 `Zotero.HTTPIntegrationClient.sendResponse`，然后调用：

   ```js
   Zotero.Integration.execCommand('http', 'refresh', docId);
   ```

4. Zotero 把下一条“要由文字处理器执行的命令”作为 HTTP 响应返回，例如：

   ```json
   { "command": "Document.getFields", "arguments": ["...", "Http"] }
   ```

5. 加载项执行命令，把结果发送到 `POST /wps/respond`：

   ```json
   { "token": "...", "payload": [ ... ] }
   ```

6. 重复 4–5，直到 `Document.complete`。加载项不回复 `Document.complete`，事务结束。

## 接口

| 路径 | 方法 | 令牌 | 说明 |
| --- | --- | --- | --- |
| `/wps/ping` | GET/POST | 否 | 健康检查、版本、端口 |
| `/wps/status` | GET/POST | 否 | 是否有事务进行中 |
| `/wps/execCommand` | POST | 是 | 开始一个引用事务 |
| `/wps/respond` | POST | 是 | 回复 Zotero 的文字处理器命令 |
| `/wps/reset` | POST | 是 | 强制清理卡住的事务 |

## CORS

Zotero 的 `RequestHandler` 默认只对 `https://www.zotero.org` 返回 CORS 头。插件在启动时包装 `_generateResponse`：

- 仅对 `/wps/` 路径生效；
- 允许的来源：`Origin: file://`（WPS CEF）、`Origin: null`、`http://127.0.0.1[:port]`、`http://localhost[:port]`；
- 增加 `Access-Control-Allow-Headers: Content-Type, X-Zotero-WPS-Token`；
- 处理 `OPTIONS` 预检。

接口本身通过 `allowRequestsFromUnsafeWebContent: true` 跳过 Zotero 的浏览器请求拦截。

## 令牌

- Zotero 插件启动时生成 64 字符随机令牌，保存在 `extensions.zotero.zotero-wps.token`。
- 安装 WPS 加载项时写入 `js/config.js`：

  ```js
  window.ZOTERO_WPS_CONFIG = {
      port: 23119,
      token: "...",
      locale: "zh-CN",
      addonVersion: "0.2.2"
  };
  ```

- 所有 `/wps/execCommand`、`/wps/respond`、`/wps/reset` 请求都在 JSON 体中携带令牌。
- 令牌只防止其他本地网页/进程误用桥接接口，不能防御已经能读取用户文件的恶意软件。

## 文档迁移

`supportsImportExport` 为 `true`。导出时把 Zotero 域转换为带域代码的超链接，并在文末写入文档数据；在另一个文字处理器中打开后点击刷新，Zotero 会识别 `ZOTERO_TRANSFER_DOCUMENT` 标记并调用 `Document.importDocument` 恢复域。

## 界面语言

支持 `en-US`、`zh-CN`、`zh-TW`。

- Zotero 插件在 `extensions.zotero.zotero-wps.locale` 中保存语言设置（`auto` 或显式语言）。
- 安装/更新 WPS 加载项时，Zotero 会把 `ribbon.xml` 的 `label` / `supertip` 属性替换为当前语言的文本，因为 WPS 对运行时 `getLabel` 的支持不可靠。
- WPS 加载项从 `js/config.js` 读取语言；界面字符串由 `src/shared/i18n.js` 提供。
- 语言设置变化后需要重启 WPS 才能重新加载功能区。

## 安装器

Zotero 插件内嵌了 WPS 加载项文件（`content/wps-addon-files.js`，构建时生成）。安装时：

1. 定位 WPS 的 `jsaddons` 目录；
2. 删除旧的 `zotero-wps_*` 目录；
3. 写入 `zotero-wps_<version>/`；
4. 生成 `js/config.js`（当前端口 + 令牌）；
5. 幂等更新 `publish.xml`、`jsplugins.xml`、`authwebsite.xml`。

WPS 支持离线加载项目录（`url="zotero-wps_<version>"`），因此不需要本地 Web 服务器来提供加载项文件。

## 文档数据

- 引文/参考文献以 **域**（`wdFieldAddin`）保存，而不是书签，便于 Word 兼容。
- 文档级设置（样式、引文位置等）保存在自定义文档属性 `ZOTERO_PREF_*` 中，每 255 字符一段。
- 参考文献表格式参数保存在 `_ZOTERO_BIBSTYLE_*` 中。
- 对 Zotero 报告字段代码时使用 Google Docs 风格（`ITEM CSL_CITATION` / `BIBL`），写入文档时转换为 Word 风格（`ADDIN ZOTERO_ITEM` / `ADDIN ZOTERO_BIBL`）。
- 文档数据中的 `fieldType` 在 `Http`（Zotero HTTP 客户端）与 `Field`（Word）之间转换。
