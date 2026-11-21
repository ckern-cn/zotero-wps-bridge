# HTTP citing protocol 实现说明

Zotero 的协议文档：

- https://www.zotero.org/support/dev/client_coding/http_integration_protocol
- https://github.com/zotero/zotero/blob/master/chrome/content/zotero/xpcom/httpIntegrationClient.js

## 事务

```
WPS                                   Zotero
 |  POST /wps/execCommand              |
 |  {token, command, docId}  --------> |
 |                                    |  Zotero.Integration.execCommand('http', ...)
 |  {command:"Application.getActiveDocument"}
 |  <-------------------------------- |
 |  POST /wps/respond                 |
 |  {token, payload:{documentID,...}} |
 |  ...                               |
 |  {command:"Document.complete"}     |
 |  <-------------------------------- |
 |  （不回复，事务结束）                |
```

- 每条命令都必须回复，除了 `Document.complete`。
- 回复的 `payload` 就是命令的返回值；出错时回复：

  ```json
  { "error": "Error", "message": "...", "stack": "..." }
  ```

  用户可见的错误使用 `"error": "Alert"`，Zotero 会把它当作 `Zotero.Exception.Alert`。
- Zotero 默认 23119 端口；测试环境可以通过 `extensions.zotero.httpServer.port` 修改。

## 已实现的文字处理器命令

| 命令 | WPS 实现 |
| --- | --- |
| `Application.getActiveDocument` | 返回文档 ID、`outputFormat: "html"`、`supportedNotes: ["footnotes", "endnotes"]`、`supportsImportExport: true`、`processorName: "WPS Writer"` |
| `Document.displayAlert` | `alert` / `confirm`；三按钮对话框拆成两步 |
| `Document.activate` | `doc.Activate()` |
| `Document.canInsertField` | 光标不在超链接中时允许 |
| `Document.setDocumentData` / `getDocumentData` | 自定义文档属性 `ZOTERO_PREF_*` |
| `Document.cursorInField` | 光标所在/前一个 Zotero 域 |
| `Document.insertField` | `range.Fields.Add(range, 81)`；noteType 1/2 会先创建脚注/尾注 |
| `Document.insertText` | HTML → WPS 富文本 |
| `Document.getFields` | 按文档顺序收集正文/脚注/尾注中的 Zotero 域 |
| `Document.convert` | 正文 ↔ 脚注 ↔ 尾注 |
| `Document.convertPlaceholdersToFields` | 把 `https://www.zotero.org/?id` 超链接转成域 |
| `Document.setBibliographyStyle` | 保存到 `_ZOTERO_BIBSTYLE_*` |
| `Document.exportDocument` / `importDocument` | 导出为标记 + 超链接；导入时恢复域与文档数据 |
| `Document.complete` | 结束事务，清理临时域 |
| `Field.delete` / `select` / `removeCode` | `Delete` / `Select` / `Unlink` |
| `Field.setText` / `getText` / `setCode` | 域结果/域代码读写 |

已实现导出/导入文档和尾注。未实现书签（Bookmarks）存储模式。

## 域代码

Zotero 期望的 HTTP 引文域代码：

```
ITEM CSL_CITATION {"citationID":"...","properties":{...},"citationItems":[...]}
BIBL {"bibliography":[...]} CSL_BIBLIOGRAPHY
TEMP
```

WPS 文档中保存为 Word 兼容格式：

```
 ADDIN ZOTERO_ITEM CSL_CITATION {"citationID":"...","properties":{...},"citationItems":[...]}
 ADDIN ZOTERO_BIBL {"bibliography":[...]} CSL_BIBLIOGRAPHY
TEMP
```

转换逻辑在 `src/shared/protocol.js`：

- `toHTTPFieldCode()`：去掉 `ADDIN ZOTERO_` 前缀；
- `toWPSFieldCode()`：添加 `ADDIN ZOTERO_` 前缀和首尾空格；
- `{}` 与 `TEMP` 都视为临时域。

## 文档数据

Zotero 通过 `Document.getDocumentData` / `setDocumentData` 读写一段字符串：

- 新建文档为 `<data data-version="3">...</data>`；
- 插件把它按 255 字符分段写入 `ZOTERO_PREF_1`、`ZOTERO_PREF_2`…；
- 读回时按属性顺序拼接；
- `value="Http"`（HTTP 客户端）与 `value="Field"`（Word）互相转换；
- 如果收到 JSON 格式的文档数据，会按 Google Docs 客户端的习惯做一次字符串编码。

## 域 ID

Zotero 只要求域 ID 在一次事务内稳定。实现使用 WPS `Field.Index` 作为内部索引，并分配短 ID：

- 事务开始时扫描全文，登记所有 Zotero 域；
- 新建域时分配随机 ID；
- `convertPlaceholdersToFields` 使用占位符 ID 作为域 ID；
- 事务结束后丢弃映射（WPS 的 Field 对象不能长期持有）。

## 富文本

Zotero 的 `outputFormat` 为 `html`，因此 `Field.setText` 收到的是 HTML，例如：

```html
<span style="font-style: italic">Doe</span> (2020)
```

`js/richtext.js` 解析 HTML 并逐段插入 WPS：

- 文本节点：`Range.InsertAfter()`，然后对插入的区间设置字体；
- 支持 `b/strong`、`i/em`、`u`、`s/del`、`sup/sub`、`span` 的 `font-weight/font-style/text-decoration/color/vertical-align`；
- 支持 `a` 超链接（包括 Zotero 笔记占位符）；
- 支持 `p/div/br`、标题、引用块、列表、表格的简单降级；
- 参考文献表会识别 `.csl-entry`、`.csl-left-margin`、`.csl-right-inline`，并用 `\t` 和段落格式还原悬挂缩进。

## 为什么使用同步 XHR

WPS 的 JS API 对象生命周期不可靠，且引文对话框打开期间用户仍可能切换文档。同步 XHR 会让 WPS 的加载项页面在整个事务期间保持阻塞，避免用户在事务中途编辑文档导致域索引失效。

代价是事务期间 WPS 界面无响应。如果长时间无响应，可以在 Zotero 设置中使用“强制重置卡住的事务”，然后重启 WPS。
