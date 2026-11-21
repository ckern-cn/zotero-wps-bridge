# Changelog

## Unreleased

- 将 Zotero 插件图标替换为 ZW 品牌图标。
- 为 WPS 功能区制作配套的 32px 图标集，统一使用深色底板与珊瑚红/青绿色强调。
- 修复自定义文档属性删除范围过宽的问题，避免误删无关属性。
- 支持 WPS 返回的 Windows LCID 语言代码（如 2052、1028、1033）。
- WPS 事务结束后恢复 Zotero 的 `sendResponse` 和引文对话框置顶设置，减少对其他 HTTP 集成的影响。
- 并发事务请求直接返回 503，不再重复调用 `Zotero.Integration.execCommand`。
- WPS 注册表更新兼容自闭合与非自闭合 `<jsplugin>` 条目。
- 增加构建冒烟测试，并让更新清单测试读取真实的插件元数据。
- 修正 Zotero 兼容版本范围，改为 `7.0`–`10.9.9`，避免部分 Zotero 10 版本拒绝安装。
- 补充必需的 `update_url`（本地构建使用 `.invalid` 占位地址；正式发布必须通过 `UPDATE_URL` 覆盖）。

## 0.2.1

- 当前版本：在 WPS 文字中插入、编辑和刷新 Zotero 引文与参考文献。
- 支持引用、参考文献表、文档设置、笔记、批注引文、Citation Explorer、导出和解除链接。
- 支持正文、脚注和尾注引文，以及 English / 简体中文 / 繁體中文界面。
- 使用 Word 兼容的 `ADDIN ZOTERO_*` 域，可与 Microsoft Word 互相打开和继续编辑。
