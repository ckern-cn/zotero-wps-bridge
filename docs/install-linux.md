# Linux 版完整安装说明

适用版本：**Zotero WPS Bridge 0.2.5**

适用平台：Linux x86_64（deb/rpm 官方包优先；Flatpak/Snap/AppImage 见特殊说明）

---

## 1. 系统要求

| 组件 | 要求 |
| --- | --- |
| WPS Office | WPS 文字 12.x（本项目在 12.1.2 上验证；2019/较早版本见兼容性说明） |
| Zotero | Zotero 7 或更高（本项目在 10.0.8 上验证） |
| 桌面 | X11 或 Wayland 均可；Wayland 下请确认 Zotero 引文窗口能正常获得焦点 |
| 权限 | 使用普通用户安装，**不要用 root 运行 WPS/Zotero** |
| 目录 | 当前用户 home 可写；WPS 需要能创建 `jsaddons` 目录 |

不需要安装 Python、Node、代理进程或额外运行时。Node 只在从源码构建时需要。

---

## 2. 安装前检查

### 2.1 确认 Zotero 与 WPS 已安装

```bash
# Debian/Ubuntu
dpkg -l | grep -E 'zotero|wps-office'

# Fedora/RHEL
rpm -qa | grep -E 'zotero|wps'
```

也可以在应用菜单中分别启动一次 Zotero 和 WPS 文字，确认都能正常打开。

### 2.2 让 WPS 创建 jsaddons 目录

先启动一次 WPS 文字，然后完全退出。正常情况下会创建：

```text
~/.local/share/Kingsoft/wps/jsaddons/
```

检查：

```bash
ls -la ~/.local/share/Kingsoft/wps/jsaddons/
```

如果目录不存在：

- 确认 WPS 是以当前用户启动的，不是 `sudo wps`；
- 如果你设置了 `XDG_DATA_HOME`，路径可能是：

  ```text
  $XDG_DATA_HOME/Kingsoft/wps/jsaddons
  ```

- Flatpak/Snap/AppImage 可能使用沙箱内路径，见第 7 节。

### 2.3 确认 Zotero 本地 HTTP 服务

Zotero 默认监听 `127.0.0.1:23119`。启动 Zotero 后检查：

```bash
curl http://127.0.0.1:23119/connector/ping
```

应返回类似：

```html
<!DOCTYPE html><html><body>Zotero is running</body></html>
```

如果连接失败：

- 确认 Zotero 正在运行；
- 检查 Zotero 设置 → 高级 → 是否启用了本地 HTTP 服务；
- 检查是否有防火墙/安全软件阻止 localhost；
- 确认 23119 没有被其他程序占用：

  ```bash
  ss -ltnp | grep 23119
  ```

---

## 3. 推荐安装方式：由 Zotero 自动安装 WPS 加载项

这是推荐方式。Zotero 插件会把 WPS 加载项写入 `jsaddons`，自动生成本地令牌和语言配置，并按当前语言生成本地化 `ribbon.xml`。

### 3.1 安装 Zotero 插件

1. 下载 `zotero-wps-bridge-0.2.5.xpi`。
2. 打开 Zotero。
3. 菜单 **编辑 → 设置**（Zotero 英文界面为 **Edit → Settings**）。
4. 进入 **插件 / Plugins**。
5. 点击右上角齿轮 → **Install Plugin From File…**。
6. 选择 `zotero-wps-bridge-0.2.5.xpi`。
7. 安装完成后重启 Zotero。

安装成功后，设置中会出现 **WPS** 面板。

### 3.2 安装 WPS 加载项

1. 打开 Zotero → **设置 → WPS**。
2. 确认“加载项目录”能检测到：

   ```text
   /home/<user>/.local/share/Kingsoft/wps/jsaddons
   ```

3. 点击 **安装 / 修复 WPS 加载项**。
4. 看到安装成功提示后，**完全退出 WPS 文字**。
   - 关闭所有文档窗口；
   - 如果 WPS 有托盘/后台进程，也一并退出。
5. 重新启动 WPS 文字。

### 3.3 确认安装结果

WPS 功能区应出现 **Zotero** 选项卡，包含：

- 插入/编辑引文
- 插入/编辑参考文献
- 刷新
- 文档设置
- 插入笔记
- 插入批注引文
- 解除链接
- 引文浏览器
- 导出文档
- 检查连接
- 帮助

在 WPS 中点击 **Zotero → 检查连接**，应提示已连接到 Zotero。

也可以直接检查文件：

```bash
ls -la ~/.local/share/Kingsoft/wps/jsaddons/zotero-wps_0.2.5/
cat ~/.local/share/Kingsoft/wps/jsaddons/publish.xml
```

`publish.xml` 中应包含：

```xml
<jsplugin name="zotero-wps" type="wps" url="zotero-wps_0.2.5"
          version="0.2.5" enable="enable_dev" install="null" customDomain=""/>
```

---

## 4. 首次使用

1. 保持 Zotero 运行。
2. 在 WPS 中新建或打开一个 `.docx`。
3. 把光标放到要插入引文的位置。
4. 点击 **Zotero → 插入/编辑引文**。
5. 在 Zotero 引文窗口中选择条目并确认。
6. 需要参考文献表时，把光标放到文末，点击 **插入/编辑参考文献**。
7. 修改条目或样式后，点击 **刷新**。

首次插入时会要求选择引文样式和位置（正文/脚注/尾注）。

---

## 5. 升级

### 5.1 升级 Zotero 插件

1. 下载新版 `zotero-wps-bridge-<version>.xpi`。
2. Zotero → 设置 → 插件 → 齿轮 → Install Plugin From File。
3. 选择新 XPI，重启 Zotero。
4. 打开 Zotero → 设置 → WPS，点击 **安装 / 修复 WPS 加载项**。
5. 完全退出并重新启动 WPS。

Zotero 启动时也会自动检查 WPS 加载项版本；若版本不一致会自动重装。自动更新源当前未配置，需手动下载新版 XPI。

### 5.2 升级 WPS 加载项（不升级 Zotero 插件）

删除旧目录后，在 Zotero 设置中重新点击“安装 / 修复”：

```bash
rm -rf ~/.local/share/Kingsoft/wps/jsaddons/zotero-wps_*
```

然后重启 WPS。

---

## 6. 卸载

### 6.1 推荐方式

1. Zotero → 设置 → WPS → **卸载**。
2. 完全退出并重新启动 WPS。
3. 如果不再需要 Zotero 插件：Zotero → 设置 → 插件 → 卸载 “Zotero WPS Bridge”。

文档中的引文不会被删除；只是不能再刷新。

### 6.2 手动清理

```bash
rm -rf ~/.local/share/Kingsoft/wps/jsaddons/zotero-wps_*
```

编辑 `~/.local/share/Kingsoft/wps/jsaddons/publish.xml`，删除包含 `name="zotero-wps"` 的 `<jsplugin .../>` 行。

如果存在以下文件，也删除其中对应条目：

```text
~/.local/share/Kingsoft/wps/jsaddons/jsplugins.xml
~/.local/share/Kingsoft/wps/jsaddons/authwebsite.xml
~/.local/share/Kingsoft/wps/jsaddons/authaddin.json
```

然后重启 WPS。

---

## 7. Linux 特殊环境

### 7.1 XDG_DATA_HOME 非默认

如果你设置了：

```bash
export XDG_DATA_HOME="$HOME/.local/share"
```

WPS 可能使用：

```text
$XDG_DATA_HOME/Kingsoft/wps/jsaddons
```

Zotero 插件会检测 `XDG_DATA_HOME` 和默认路径。若没有检测到，请在 Zotero 设置中查看“加载项目录”，或手动安装。

### 7.2 Flatpak / Snap / AppImage

这些打包方式可能把 WPS 放在沙箱中，`jsaddons` 路径可能不是默认路径。

先查找实际目录：

```bash
find "$HOME" -type d -name jsaddons 2>/dev/null
```

可能的位置包括（取决于打包方式）：

```text
~/.var/app/<wps-app-id>/data/Kingsoft/wps/jsaddons
~/snap/<wps-snap-name>/current/.local/share/Kingsoft/wps/jsaddons
~/.local/share/Kingsoft/wps/jsaddons
```

如果 Zotero 自动安装检测不到沙箱路径，有两种选择：

1. **推荐**：改用官方 deb/rpm 版 WPS；
2. 按第 9 节手动把加载项安装到实际 `jsaddons` 路径。

同时确认 WPS 沙箱允许访问 `127.0.0.1:23119`。如果 WPS 无法访问本地回环，桥接会失败，需要调整沙箱网络权限或改用非沙箱版本。

### 7.3 Wayland

Zotero 引文窗口可能被 WPS 抢焦点。可在 Zotero 设置 → WPS 中勾选：

> 让 Zotero 引文对话框保持在 WPS 上方

如果仍然异常，可尝试切换到 X11/XWayland 会话复测。

### 7.4 文件权限

加载项目录属于当前用户即可，不要用 root 创建：

```bash
ls -ld ~/.local/share/Kingsoft/wps/jsaddons
ls -l ~/.local/share/Kingsoft/wps/jsaddons/zotero-wps_0.2.5/js/config.js
```

正常情况下 `config.js` 权限为 `600`：

```bash
stat -c '%a %U %n' ~/.local/share/Kingsoft/wps/jsaddons/zotero-wps_0.2.5/js/config.js
```

如果权限不对：

```bash
chmod 600 ~/.local/share/Kingsoft/wps/jsaddons/zotero-wps_0.2.5/js/config.js
```

### 7.5 语言

界面支持：

- English (United States)
- 简体中文
- 繁體中文

在 Zotero 设置 → WPS → **界面语言** 中选择。切换后需要重新安装加载项并重启 WPS。

---

## 8. 故障排查

### 8.1 WPS 中没有 Zotero 选项卡

按顺序检查：

1. Zotero 设置 → WPS 是否显示“已安装 0.2.5”。
2. WPS 是否**完全退出**后重新启动。
3. `publish.xml` 是否包含 `zotero-wps` 条目。
4. 加载项目录是否存在 `zotero-wps_0.2.5/`。
5. WPS 是否禁用了 JS 加载项（WPS 设置/安全中心）。
6. 是否有多个 WPS 安装（deb + Flatpak + Snap），Zotero 装到了另一个目录。

快速检查：

```bash
find "$HOME" -type f -name publish.xml 2>/dev/null
find "$HOME" -type d -name 'zotero-wps_*' 2>/dev/null
```

### 8.2 提示“无法连接 Zotero”

```bash
curl http://127.0.0.1:23119/wps/ping
```

- 无响应：Zotero 未启动、HTTP 服务被禁用、端口被占用或防火墙拦截。
- 返回 404：Zotero 插件未加载或版本不匹配。
- 返回 403：令牌无效，重新安装 WPS 加载项。
- 正常返回 JSON：桥接正常。

### 8.3 提示“令牌无效”

1. Zotero 设置 → WPS → **重置访问令牌**。
2. 重新点击“安装 / 修复 WPS 加载项”。
3. 完全退出并重启 WPS。

### 8.4 提示“Zotero 正在处理另一个事务”

1. Zotero 设置 → WPS → **强制重置卡住的事务**。
2. 如果仍无效，重启 Zotero。
3. 再重启 WPS。

### 8.5 安装时报权限错误

确认不要使用 root：

```bash
whoami
ls -ld ~/.local/share/Kingsoft/wps/jsaddons
```

如果目录被 root 创建过：

```bash
sudo chown -R "$USER":"$USER" ~/.local/share/Kingsoft/wps/jsaddons
```

然后重新安装。

### 8.6 WPS 退出后插件消失

某些 WPS 版本会在退出时重写 `publish.xml`。重新启动 Zotero 会自动恢复，或在 Zotero 设置中再点一次“安装 / 修复”。

### 8.7 调试日志

- Zotero：设置 → 高级 → 调试输出；日志中可能包含令牌，分享前请重置令牌或删除敏感内容。
- WPS：在 WPS 文字中按 `Alt + F12` 打开加载项调试器，查看 Console。

---

## 9. 手动安装 WPS 加载项（高级）

一般不需要。仅在 Zotero 自动安装无法检测目录（例如 Flatpak/Snap）时使用。

### 9.1 解压

```bash
mkdir -p ~/.local/share/Kingsoft/wps/jsaddons/zotero-wps_0.2.5
unzip zotero-wps-bridge-addon-0.2.5.zip \
  -d ~/.local/share/Kingsoft/wps/jsaddons/zotero-wps_0.2.5
```

### 9.2 写入配置

需要 Zotero 的访问令牌。可以从已自动安装的 `js/config.js` 读取，或在 Zotero 配置编辑器中查看：

```text
extensions.zotero.zotero-wps.token
```

创建/修改：

```text
~/.local/share/Kingsoft/wps/jsaddons/zotero-wps_0.2.5/js/config.js
```

内容示例：

```js
window.ZOTERO_WPS_CONFIG = {
    port: 23119,
    token: "把这里替换成你的令牌",
    locale: "zh-CN",
    addonVersion: "0.2.5"
};
```

设置权限：

```bash
chmod 600 ~/.local/share/Kingsoft/wps/jsaddons/zotero-wps_0.2.5/js/config.js
```

> 手动安装包中的 `ribbon.xml` 默认是英文。需要本地化功能区时，优先使用 Zotero 自动安装。

### 9.3 注册加载项

编辑：

```text
~/.local/share/Kingsoft/wps/jsaddons/publish.xml
```

在 `</jsplugins>` 前加入：

```xml
<jsplugin name="zotero-wps" type="wps" url="zotero-wps_0.2.5"
          version="0.2.5" enable="enable_dev" install="null" customDomain=""/>
```

如果存在 `jsplugins.xml`，可同样加入兼容条目：

```xml
<jsplugin name="zotero-wps" type="wps"
          url="zotero-wps_0.2.5" version="0.2.5"/>
```

如果存在 `authwebsite.xml`，可加入：

```xml
<website origin="null" name="zotero-wps" status="enable"/>
```

然后完全退出并重启 WPS。

### 9.4 手动卸载

```bash
rm -rf ~/.local/share/Kingsoft/wps/jsaddons/zotero-wps_0.2.5
```

并从 `publish.xml`、`jsplugins.xml`、`authwebsite.xml` 删除对应条目。

---

## 10. 从源码构建（可选）

需要 Node.js 18+。

```bash
cd zotero-wps-bridge
npm test
npm run build
```

生成：

```text
dist/zotero-wps-bridge-0.2.5.xpi
dist/zotero-wps-bridge-addon-0.2.5.zip
dist/SHA256SUMS.txt
```

然后在 Zotero 中安装 XPI。

---

## 11. 安装检查清单

- [ ] WPS 文字和 Zotero 都能以普通用户正常启动
- [ ] `~/.local/share/Kingsoft/wps/jsaddons` 存在
- [ ] Zotero 插件已安装并启用
- [ ] Zotero 设置 → WPS 显示“已安装 0.2.5”
- [ ] WPS 功能区出现 Zotero 选项卡
- [ ] WPS 中“检查连接”成功
- [ ] 能插入一条引文
- [ ] 能插入参考文献表
- [ ] 保存、重开、刷新正常
- [ ] 语言设置符合预期
- [ ] `config.js` 权限为 600

---

## 12. 已知限制

- 不支持书签（Bookmarks）存储模式，仅支持 Fields。
- Windows/macOS 实机回归尚未执行，本说明仅针对 Linux。
- 自动更新源当前未配置；升级需手动安装新版 XPI。
- Flatpak/Snap 沙箱可能导致 Zotero 自动安装检测不到 jsaddons，需按第 9 节手动安装或改用 deb/rpm 版 WPS。
