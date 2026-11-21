# Zotero WPS Bridge 图标

主文件：[`zotero-wps-bridge-icon.svg`](zotero-wps-bridge-icon.svg)

## 设计概念

- **手写感 Z + W 单字组合**：Z 与 W 使用圆润、略带弧度的笔画，不再是纯几何直线。
- **珊瑚红 Z + 青绿 W**：区分 Zotero 与 WPS，同时在深色底板上保持高对比。
- **反转渐变弧形桥**：桥面从左到右为“青绿 → 白 → 珊瑚红”，只保留弧线，不放竖线或桥墩。
- **视觉平衡**：
  - Z 的上下横线略微弯折，视觉重量更接近 W；
  - W 收窄并下移，底部与 Z 的基线接近；
  - 左右留白基本对称，桥面宽度与字母整体宽度匹配。
- **无官方 Logo、无文字**：避免商标问题，小尺寸下仍保持清晰的 ZW 轮廓。

## 导出文件

```text
zotero-wps-bridge-icon-512.png
zotero-wps-bridge-icon-256.png
zotero-wps-bridge-icon-128.png
zotero-wps-bridge-icon-96.png
zotero-wps-bridge-icon-64.png
zotero-wps-bridge-icon-48.png
zotero-wps-bridge-icon-32.png
zotero-wps-bridge-icon-16.png
```

## 颜色

| 用途 | 颜色 |
| --- | --- |
| 深色背景 | `#0A1B2C` → `#102E45` |
| Z | `#FF8A7E` → `#E84F45` |
| W | `#1FA99B` → `#35D8C6` |
| 弧形桥面 | 青绿 → 白色 → 珊瑚红，约 55% 透明度 |
| 高光 | `#F7FBFF` |

## 使用建议

- 插件页、README、Release 封面：512 或 256。
- Zotero 插件图标：96 或 48。
- WPS 功能区：32px；优先保证 Z/W 轮廓，桥面会自然弱化。
- favicon：32/16。
- 不要拉伸、加文字或改成官方 Zotero/WPS Logo 风格。
- 浅色背景下建议保留深色圆角底板。

## 项目中的图标

- **Zotero 插件图标**：`src/zotero-plugin/content/wps.svg`，已替换为 ZW 主图标。
- **WPS 功能区图标**：`src/wps-addon/images/*.svg`，32×32 配套图标集；预览见 [`wps-ribbon-icons-preview.png`](wps-ribbon-icons-preview.png)。
- 功能区图标沿用主图标的深色圆角底板，使用白色线性符号，并以珊瑚红/青绿色做少量强调；共 11 个：
  `citation`、`bibliography`、`refresh`、`settings`、`note`、`annotation`、`explorer`、`export`、`unlink`、`link`、`info`。

修改图标后重新运行：

```bash
npm run build
```

然后重新安装 XPI，或在 Zotero 的 WPS 设置中点击“安装 / 修复 WPS 加载项”并重启 WPS。

> 本项目与 Zotero、Kingsoft WPS 均无官方隶属关系；图标不使用其官方 Logo。

## 品牌素材

本目录中的名称、图标和导出图用于标识官方项目，不随 AGPL-3.0-or-later 授予商标或品牌使用权。Fork 必须使用自己的名称和图标，不能继续使用官方图标或暗示官方身份。详见 [`../TRADEMARK.md`](../TRADEMARK.md)。
