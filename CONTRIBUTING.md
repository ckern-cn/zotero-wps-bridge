# 参与贡献

感谢你愿意改进 **Zotero WPS Bridge**。本项目希望把贡献门槛尽量压低：不需要 CLA，不需要版权转让，也不要求你先成为“核心成员”。

## 仓库与提交位置

- **主仓库：Gitee** <https://gitee.com/ckern/zotero-wps-bridge>
- **GitHub 只读镜像** <https://github.com/ckern-cn/zotero-wps-bridge>

请在 **Gitee** 提交 Issue 和 Pull Request。GitHub 镜像不接受独立贡献，避免两个仓库的讨论、DCO 记录和发布状态分裂。不要在两个仓库重复提交同一个 Issue / PR。

## 可以贡献什么

- 复现并报告 bug
- 改进文档、安装说明和错误提示
- 翻译界面（English / 简体中文 / 繁體中文）
- 增加或修正测试
- 修复小问题、改进界面
- 提出新功能想法（较大的改动建议先开 issue）
- 在真实设备上验证 Windows / macOS / 不同 WPS 版本

## 开始之前

- **小修复、文档、翻译**：可以直接在 Gitee 提交 Pull Request。
- **较大的功能、协议变更、安装器/权限/更新机制改动**：请先在 Gitee 开 issue 说明目标和方案，避免重复劳动。
- **安全漏洞**：不要在任一仓库公开开 issue，请按 [`SECURITY.md`](SECURITY.md) 私密报告。

## 开发环境

需要 Node.js 18+。本项目没有第三方 npm 依赖。

```bash
npm test
npm run build
```

构建产物：

```text
dist/zotero-wps-bridge-<version>.xpi
dist/zotero-wps-bridge-addon-<version>.zip
dist/SHA256SUMS.txt
```

更多开发说明见 [`docs/development.md`](docs/development.md)，Linux 安装与调试见 [`docs/install-linux.md`](docs/install-linux.md)，人工回归清单见 [`docs/gui-test-checklist.md`](docs/gui-test-checklist.md)。

## 代码风格

- 使用 4 个空格缩进，保持与现有文件一致。
- 兼容 Zotero 7+ 的启动式插件环境，以及 WPS 的 JavaScript API。
- 不引入新的运行时依赖；如确有必要，请先在 issue 中讨论。
- 修改共享协议（`src/shared/`）时，同步更新 `tests/`。
- 修改界面文案时，同时更新 `en-US`、`zh-CN`、`zh-TW` 三种语言。
- 涉及 WPS 文档行为的改动，请说明在哪些平台/版本上验证过。

## 提交与 DCO

本项目使用 **Developer Certificate of Origin 1.1（DCO）**，不使用 CLA，不要求版权转让。

每次提交都需要签名：

```bash
git commit -s -m "fix: ..."
```

`-s` 会添加：

```text
Signed-off-by: Your Name <you@example.com>
```

签名表示你有权将该贡献按 **AGPL-3.0-or-later** 授权给本项目使用。完整文本见 [`DCO`](DCO)。

如果忘记签名，可以补上：

```bash
git commit --amend -s --no-edit
```

## Pull Request 要求

- 一个 PR 尽量只做一件事。
- 说明改了什么、为什么改、如何测试。
- 界面改动请附截图或录屏。
- 新功能请补测试；无法自动测试的部分，请写清手工验证步骤。
- 不要把品牌改名、插件 ID、更新地址等发布相关改动混在普通 PR 中；这些需要维护者确认，见 [`GOVERNANCE.md`](GOVERNANCE.md) 和 [`TRADEMARK.md`](TRADEMARK.md)。

## 评审与合并

维护者会尽量及时回复，但不承诺固定响应时间。是否合并、何时发布由维护者决定。低门槛不等于降低安全、兼容性或可维护性要求。

## AI 辅助

允许使用 AI 工具辅助编写代码或文档，但提交者需要理解改动、完成验证，并对提交内容负责。

## 贡献者权益

你保留自己贡献的版权，并授权本项目按 AGPL-3.0-or-later 使用该贡献。贡献本身不会自动获得品牌、发布或治理权；这些权利由项目所有者统一管理。
