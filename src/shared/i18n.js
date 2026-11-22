/*
 * Shared translations for the Zotero plugin and the WPS add-in.
 *
 * Supported UI languages: en-US, zh-CN, zh-TW.
 * Loaded as a plain script in WPS/Zotero and requireable from Node tests.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ZoteroWPSI18n = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SUPPORTED = ['en-US', 'zh-CN', 'zh-TW'];

    // Some WPS builds report a Windows LCID instead of a BCP 47 tag.
    const WINDOWS_LCID = {
        1028: 'zh-TW',
        2052: 'zh-CN',
        3076: 'zh-TW',
        4100: 'zh-CN',
        5124: 'zh-TW',
        1033: 'en-US',
        2057: 'en-US',
        3081: 'en-US',
        16393: 'en-US'
    };

    const messages = {
        'en-US': {
            'wps.ribbon.tab.zotero.label': 'Zotero',
            'wps.ribbon.group.citations.label': 'Citations',
            'wps.ribbon.group.notes.label': 'Notes',
            'wps.ribbon.group.tools.label': 'Tools',

            'wps.ribbon.addEditCitation.label': 'Add/Edit Citation',
            'wps.ribbon.addEditCitation.tip': 'Insert a citation at the cursor, or edit the citation at the cursor.',
            'wps.ribbon.addEditBibliography.label': 'Add/Edit Bibliography',
            'wps.ribbon.addEditBibliography.tip': 'Insert a bibliography at the cursor, or edit the existing bibliography.',
            'wps.ribbon.refresh.label': 'Refresh',
            'wps.ribbon.refresh.tip': 'Update all citations and the bibliography from your Zotero library.',
            'wps.ribbon.setDocPrefs.label': 'Document Preferences',
            'wps.ribbon.setDocPrefs.tip': 'Change the citation style, language, and note position.',
            'wps.ribbon.addNote.label': 'Add Note',
            'wps.ribbon.addNote.tip': 'Insert a note from Zotero.',
            'wps.ribbon.addAnnotation.label': 'Add Annotation Citation',
            'wps.ribbon.addAnnotation.tip': 'Insert an annotation or highlight from Zotero as a citation.',
            'wps.ribbon.removeCodes.label': 'Unlink Citations',
            'wps.ribbon.removeCodes.tip': 'Remove all Zotero field codes and keep the current text.',
            'wps.ribbon.citationExplorer.label': 'Citation Explorer',
            'wps.ribbon.citationExplorer.tip': 'Open Zotero Citation Explorer to review and locate citations in this document.',
            'wps.ribbon.export.label': 'Export Document',
            'wps.ribbon.export.tip': 'Export this document for use in another word processor.',
            'wps.ribbon.checkConnection.label': 'Check Connection',
            'wps.ribbon.checkConnection.tip': 'Check whether WPS can reach the running Zotero.',
            'wps.ribbon.about.label': 'Help',
            'wps.ribbon.about.tip': 'About the Zotero WPS Bridge add-in.',

            'wps.alert.busy': 'Zotero is still processing the previous request. Please wait.',
            'wps.alert.incomplete': 'The operation did not complete. Check the prompt in Zotero.',
            'wps.alert.failed': 'Operation failed: {message}\n\nIf Zotero keeps saying that another transaction is in progress, restart Zotero.',
            'wps.alert.envMissing': 'This page is not running in the WPS add-in environment.',
            'wps.alert.appMissing': 'Unable to get the WPS Writer application object.',
            'wps.alert.noDocument': 'Please open a WPS Writer document first.',
            'wps.alert.network': 'Cannot connect to Zotero.\n\nCheck these items:\n• Zotero is running.\n• “Zotero WPS Bridge” is enabled in Zotero → Plugins.\n• In Zotero → Settings → WPS, click “Install / Repair WPS Add-in”.\n• Restart WPS Writer after the repair.\n\nThen click “Check Connection” again.',
            'wps.alert.cannotConnect': 'Cannot connect to Zotero.\n\n1. Start Zotero.\n2. Enable “Zotero WPS Bridge” in Zotero → Plugins.\n3. In Zotero → Settings → WPS, click “Install / Repair WPS Add-in”.\n4. Restart WPS Writer.\n\nThen try again.',
            'wps.alert.unlinkNeedsZotero': 'Unlinking citations requires Zotero.\n\nStart Zotero and make sure “Zotero WPS Bridge” is enabled, then click “Check Connection”.\n\nThe document will not be changed.',
            'wps.alert.unlinkNoToken': 'The WPS add-in has no access token.\n\nIn Zotero → Settings → WPS, click “Install / Repair WPS Add-in”, then restart WPS Writer.\n\nThe document will not be changed.',
            'wps.alert.bridgeNotReady': 'Zotero is running, but the WPS bridge is not ready (HTTP {status}).\n\n1. Open Zotero → Settings → WPS.\n2. Click “Install / Repair WPS Add-in”.\n3. Restart WPS Writer.',
            'wps.alert.connected': 'Zotero connection is working.\n\nZotero: {zoteroVersion}\nBridge: {bridgeVersion}\nPort: {port}\nToken: {token}\n\nYou can insert citations in WPS Writer.',
            'wps.alert.tokenConfigured': 'configured',
            'wps.alert.tokenMissing': 'not configured',
            'wps.alert.about': 'Zotero WPS Bridge {version}\n\nInsert and manage Zotero citations in WPS Writer.\n\nQuick start\n1. Keep Zotero running.\n2. Open the Zotero tab in WPS Writer.\n3. Click “Add/Edit Citation”.\n\nTips\n• “Check Connection” diagnoses connection problems.\n• After updating, reinstall the add-in from Zotero → Settings → WPS.\n• Restart WPS Writer after installing or updating the add-in.',
            'wps.dialog.helpTitle': 'Help',
            'wps.dialog.connectionOkTitle': 'Connection OK',
            'wps.dialog.connectionFailedTitle': 'Cannot connect to Zotero',
            'wps.dialog.unlinkTitle': 'Cannot unlink citations',
            'wps.dialog.close': 'Close',
            'wps.confirm.removeCodes': 'Remove all Zotero citations from this document?\n\nThe field codes will be deleted, but the displayed text will remain. This cannot be undone.\n\nZotero must remain running until the operation completes.',

            'wps.error.busyOtherDoc': 'Zotero is processing a citation transaction for another document. Finish or cancel it in Zotero first.',
            'wps.error.invalidToken': 'The access token is invalid.\n\nIn Zotero → Settings → WPS, click “Install / Repair WPS Add-in”, then restart WPS Writer.',
            'wps.error.http': 'Zotero returned an error (HTTP {status}): {text}',
            'wps.error.unexpectedEnd': 'The Zotero transaction ended unexpectedly.',
            'wps.error.unsupportedCommand': 'Zotero requested an unsupported WPS command: {command}',
            'wps.error.docIdMismatch': 'The Zotero document ID does not match.',
            'wps.error.unsupportedNoteType': 'Unsupported note type: {type}',
            'wps.error.cannotCreateField': 'Unable to create a Zotero field.',
            'wps.error.cannotCreateNote': 'Unable to create a footnote or endnote here.',
            'wps.error.cannotRegisterField': 'Unable to register the new Zotero field.',
            'wps.error.fieldNotFound': 'Field not found: {id}',

            'wps.dialog.yesNoCancel1': 'Choose OK for Yes, or Cancel to continue to No/Cancel.',
            'wps.dialog.yesNoCancel2': 'Choose OK for No, or Cancel for Cancel.',

            'zotero.menu.tools': 'Zotero WPS Bridge Integration…',
            'zotero.prefs.title': 'WPS Writer Integration',
            'zotero.prefs.intro': 'After installation, WPS Writer shows a Zotero tab. Citation data comes from the running Zotero instance; the WPS add-in only reads and writes Zotero fields in the document.',
            'zotero.prefs.statusLabel': 'Status',
            'zotero.prefs.portLabel': 'Zotero port',
            'zotero.prefs.tokenLabel': 'Access token',
            'zotero.prefs.pathsLabel': 'Add-in directories',
            'zotero.prefs.ok': 'OK',
            'zotero.prefs.cancel': 'Cancel',
            'zotero.prefs.remove': 'Remove',
            'zotero.prefs.reset': 'Reset',
            'zotero.prefs.forceResetButton': 'Force Reset',
            'zotero.prefs.install': 'Install / Repair WPS Add-in',
            'zotero.prefs.uninstall': 'Uninstall WPS Add-in',
            'zotero.prefs.uninstallHint': 'Uninstalling removes only the WPS add-in. Citations already in documents are not changed.',
            'zotero.prefs.refresh': 'Refresh Status',
            'zotero.prefs.openDir': 'Open Folder',
            'zotero.prefs.forceReset': 'Force Reset Stuck Transaction',
            'zotero.prefs.autoInstall': 'Check for and update the WPS add-in when Zotero starts',
            'zotero.prefs.keepDialogRaised': 'Keep the Zotero citation dialog above WPS',
            'zotero.prefs.language': 'Interface language',
            'zotero.prefs.languageAuto': 'Automatic',
            'zotero.prefs.languageEn': 'English (United States)',
            'zotero.prefs.languageZhCN': '简体中文',
            'zotero.prefs.languageZhTW': '繁體中文',
            'zotero.prefs.helpTitle': 'Instructions',
            'zotero.prefs.help1': 'Keep Zotero running and click “Install / Repair WPS Add-in”.',
            'zotero.prefs.help2': 'If WPS is running, fully quit and restart WPS Writer.',
            'zotero.prefs.help3': 'Open the Zotero tab in WPS Writer and click “Add/Edit Citation”.',
            'zotero.prefs.help4': 'If WPS says it cannot connect to Zotero, refresh the status here and reinstall the add-in.',
            'zotero.prefs.note': 'The WPS add-in directory is normally created the first time WPS Writer starts. If no directory is found, start WPS Writer once and click “Refresh Status”.',
            'zotero.prefs.resetToken': 'Reset Access Token',
            'zotero.prefs.resetHint': 'After resetting, reinstall the add-in and restart WPS.',
            'zotero.prefs.reading': 'Reading…',
            'zotero.prefs.working': 'Working…',
            'zotero.prefs.pluginNotLoaded': 'Zotero WPS Bridge plugin is not loaded',
            'zotero.prefs.readFailed': 'Failed to read status: {message}',
            'zotero.prefs.noDirsStatus': 'WPS add-in directory not found',
            'zotero.prefs.noDirsWarning': 'Start WPS Writer once (you can close it immediately) so WPS creates the add-in directory, then click “Refresh Status”.',
            'zotero.prefs.installedStatus': 'Installed {version}; ready to use',
            'zotero.prefs.updateStatus': 'Update required: {version}',
            'zotero.prefs.notInstalledStatus': 'Not installed',
            'zotero.prefs.partialStatus': 'Update required: {version}',
            'zotero.prefs.updateWarning': 'An older or incomplete installation was found. Click “Install / Repair WPS Add-in”, then restart WPS Writer.',
            'zotero.prefs.notInstalledWarning': 'Click “Install / Repair WPS Add-in” to write the add-in into WPS. Restart WPS Writer after installation.',
            'zotero.prefs.inProgressWarning': 'Zotero is waiting for a WPS citation transaction. If WPS was closed or is stuck, click “Force Reset Stuck Transaction”.',
            'zotero.prefs.processing': 'Processing citation transaction…',
            'zotero.prefs.pathsNotFound': 'Not found (start WPS Writer once)',
            'zotero.prefs.pathInstalled': '{path} — installed {version}',
            'zotero.prefs.pathPartial': '{path} — incomplete installation (found {version})',
            'zotero.prefs.pathNotInstalled': '{path} — not installed',
            'zotero.prefs.pathExpected': 'expected {version}',
            'zotero.prefs.notSet': 'Not set',
            'zotero.prefs.notStarted': 'Not started',
            'zotero.prefs.installDone': 'WPS add-in installed.\n\nFully quit and restart WPS Writer.\n\nInstalled at:\n{dirs}',
            'zotero.prefs.uninstallConfirm': 'Remove the Zotero add-in from WPS? Citations in documents will not be changed.',
            'zotero.prefs.uninstallDone': 'The WPS add-in was removed. Restart WPS Writer.',
            'zotero.prefs.forceResetConfirm': 'Use this only when a citation operation is stuck or WPS has crashed. Force reset cancels the transaction Zotero is waiting for. Continue?',
            'zotero.prefs.forceResetDone': 'The citation transaction was reset.',
            'zotero.prefs.resetConfirm': 'After resetting the access token, the WPS add-in must be reinstalled and WPS restarted. Continue?',
            'zotero.prefs.resetDone': 'The access token was reset. Restart WPS Writer.',
            'zotero.prefs.openDirNoDir': 'The WPS add-in directory was not found yet.',
            'zotero.prefs.installFailed': 'Installation failed: {message}',
            'zotero.prefs.uninstallFailed': 'Uninstall failed: {message}',
            'zotero.prefs.resetFailed': 'Token reset failed: {message}',
            'zotero.prefs.languageChanged': 'Interface language changed. Restart WPS Writer so the add-in reloads its ribbon.',

            'zotero.error.noWpsDir': 'WPS add-in directory not found. Start WPS Writer once, then try again in Zotero.',
            'zotero.error.missingBundle': 'The Zotero plugin package is missing the WPS add-in files.',
            'zotero.error.invalidConfig': 'Unrecognized WPS configuration file: {path}'
        },

        'zh-CN': {
            'wps.ribbon.tab.zotero.label': 'Zotero',
            'wps.ribbon.group.citations.label': '引文',
            'wps.ribbon.group.notes.label': '笔记',
            'wps.ribbon.group.tools.label': '工具',

            'wps.ribbon.addEditCitation.label': '插入/编辑引文',
            'wps.ribbon.addEditCitation.tip': '在光标处插入引文，或编辑光标所在位置的引文。',
            'wps.ribbon.addEditBibliography.label': '插入/编辑参考文献',
            'wps.ribbon.addEditBibliography.tip': '在光标处插入参考文献表，或编辑已有参考文献表。',
            'wps.ribbon.refresh.label': '刷新',
            'wps.ribbon.refresh.tip': '根据 Zotero 资料库更新文档中的全部引文和参考文献。',
            'wps.ribbon.setDocPrefs.label': '文档设置',
            'wps.ribbon.setDocPrefs.tip': '更改引文样式、语言和引文位置（正文/脚注/尾注）。',
            'wps.ribbon.addNote.label': '插入笔记',
            'wps.ribbon.addNote.tip': '从 Zotero 插入一条笔记。',
            'wps.ribbon.addAnnotation.label': '插入批注引文',
            'wps.ribbon.addAnnotation.tip': '把 Zotero 中的批注/高亮作为引文插入文档。',
            'wps.ribbon.removeCodes.label': '解除链接',
            'wps.ribbon.removeCodes.tip': '删除所有 Zotero 域代码，保留当前文字。',
            'wps.ribbon.citationExplorer.label': '引文浏览器',
            'wps.ribbon.citationExplorer.tip': '打开 Zotero 引文浏览器，查看并定位文档中的引文。',
            'wps.ribbon.export.label': '导出文档',
            'wps.ribbon.export.tip': '把当前文档导出为可在其他文字处理器中导入的格式。',
            'wps.ribbon.checkConnection.label': '检查连接',
            'wps.ribbon.checkConnection.tip': '检查 WPS 是否能连接正在运行的 Zotero。',
            'wps.ribbon.about.label': '帮助',
            'wps.ribbon.about.tip': '关于 Zotero WPS Bridge 加载项。',

            'wps.alert.busy': 'Zotero 正在处理上一个请求，请稍候。',
            'wps.alert.incomplete': '操作未完成。请检查 Zotero 中的提示。',
            'wps.alert.failed': '操作失败：{message}\n\n如果 Zotero 一直提示“已有事务在进行”，请重启 Zotero。',
            'wps.alert.envMissing': '当前页面不在 WPS 加载项环境中运行。',
            'wps.alert.appMissing': '无法获取 WPS 文字应用程序对象。',
            'wps.alert.noDocument': '请先打开一个 WPS 文字文档。',
            'wps.alert.network': '无法连接 Zotero。\n\n请检查：\n• Zotero 正在运行；\n• “Zotero WPS Bridge” 插件已在 Zotero → 插件 中启用；\n• 已在 Zotero → 设置 → WPS 中点击“安装 / 修复 WPS 加载项”；\n• 修复后已重启 WPS 文字。\n\n然后再次点击“检查连接”。',
            'wps.alert.cannotConnect': '无法连接 Zotero。\n\n1. 启动 Zotero；\n2. 在 Zotero → 插件 中启用“Zotero WPS Bridge”；\n3. 在 Zotero → 设置 → WPS 中点击“安装 / 修复 WPS 加载项”；\n4. 重启 WPS 文字。\n\n然后重试。',
            'wps.alert.unlinkNeedsZotero': '解除链接需要 Zotero 正在运行并已连接。\n\n请先启动 Zotero，确认“Zotero WPS Bridge”已启用，然后点击“检查连接”。\n\n文档不会被修改。',
            'wps.alert.unlinkNoToken': 'WPS 加载项没有访问令牌。\n\n请在 Zotero → 设置 → WPS 中点击“安装 / 修复 WPS 加载项”，然后重启 WPS 文字。\n\n文档不会被修改。',
            'wps.alert.bridgeNotReady': 'Zotero 正在运行，但 WPS 桥接尚未就绪（HTTP {status}）。\n\n1. 打开 Zotero → 设置 → WPS；\n2. 点击“安装 / 修复 WPS 加载项”；\n3. 重启 WPS 文字。',
            'wps.alert.connected': 'Zotero 连接正常。\n\nZotero：{zoteroVersion}\n桥接：{bridgeVersion}\n端口：{port}\n令牌：{token}\n\n现在可以在 WPS 文字中插入引文。',
            'wps.alert.tokenConfigured': '已配置',
            'wps.alert.tokenMissing': '未配置',
            'wps.alert.about': 'Zotero WPS Bridge {version}\n\n在 WPS 文字中使用 Zotero 插入和管理引文。\n\n快速开始\n1. 保持 Zotero 运行；\n2. 打开 WPS 文字中的 Zotero 选项卡；\n3. 点击“插入/编辑引文”。\n\n提示\n• 连接异常时先点击“检查连接”。\n• 更新后请在 Zotero → 设置 → WPS 中重新安装加载项。\n• 安装或更新加载项后需要重启 WPS 文字。',
            'wps.dialog.helpTitle': '帮助',
            'wps.dialog.connectionOkTitle': '连接正常',
            'wps.dialog.connectionFailedTitle': '无法连接 Zotero',
            'wps.dialog.unlinkTitle': '无法解除链接',
            'wps.dialog.close': '关闭',
            'wps.confirm.removeCodes': '确定要解除文档中的所有 Zotero 引用吗？\n\n此操作会删除域代码，但保留当前显示的文字，且不可撤销。\n\n操作完成前需要保持 Zotero 运行。',

            'wps.error.busyOtherDoc': 'Zotero 正在处理另一个文档的引用事务。请先在 Zotero 中完成或取消当前操作。',
            'wps.error.invalidToken': '访问令牌无效。\n\n请在 Zotero → 设置 → WPS 中点击“安装 / 修复 WPS 加载项”，然后重启 WPS 文字。',
            'wps.error.http': 'Zotero 返回错误（HTTP {status}）：{text}',
            'wps.error.unexpectedEnd': 'Zotero 事务意外结束。',
            'wps.error.unsupportedCommand': 'Zotero 请求了不支持的 WPS 命令：{command}',
            'wps.error.docIdMismatch': 'Zotero 文档 ID 不匹配。',
            'wps.error.unsupportedNoteType': '不支持的注释类型：{type}',
            'wps.error.cannotCreateField': '无法创建 Zotero 域。',
            'wps.error.cannotCreateNote': '无法在此处创建脚注或尾注。',
            'wps.error.cannotRegisterField': '无法注册新创建的 Zotero 域。',
            'wps.error.fieldNotFound': '找不到域：{id}',

            'wps.dialog.yesNoCancel1': '选择“确定”=是，选择“取消”继续选择“否/取消”。',
            'wps.dialog.yesNoCancel2': '选择“确定”=否，选择“取消”=取消。',

            'zotero.menu.tools': 'Zotero WPS Bridge 集成…',
            'zotero.prefs.title': 'WPS 文字集成',
            'zotero.prefs.intro': '安装后，WPS 文字的功能区会出现一个 Zotero 选项卡。引文数据由正在运行的 Zotero 提供，WPS 加载项只负责在文档中读写 Zotero 域。',
            'zotero.prefs.statusLabel': '状态',
            'zotero.prefs.portLabel': 'Zotero 端口',
            'zotero.prefs.tokenLabel': '访问令牌',
            'zotero.prefs.pathsLabel': '加载项目录',
            'zotero.prefs.ok': '确定',
            'zotero.prefs.cancel': '取消',
            'zotero.prefs.remove': '移除',
            'zotero.prefs.reset': '重置',
            'zotero.prefs.forceResetButton': '强制重置',
            'zotero.prefs.install': '安装 / 修复 WPS 加载项',
            'zotero.prefs.uninstall': '卸载 WPS 加载项',
            'zotero.prefs.uninstallHint': '卸载只会移除 WPS 加载项，不会修改文档中已有的引文。',
            'zotero.prefs.refresh': '刷新状态',
            'zotero.prefs.openDir': '打开目录',
            'zotero.prefs.forceReset': '强制重置卡住的事务',
            'zotero.prefs.autoInstall': '启动 Zotero 时自动检查并更新 WPS 加载项',
            'zotero.prefs.keepDialogRaised': '让 Zotero 引文对话框保持在 WPS 上方',
            'zotero.prefs.language': '界面语言',
            'zotero.prefs.languageAuto': '自动',
            'zotero.prefs.languageEn': 'English (United States)',
            'zotero.prefs.languageZhCN': '简体中文',
            'zotero.prefs.languageZhTW': '繁體中文',
            'zotero.prefs.helpTitle': '使用说明',
            'zotero.prefs.help1': '保持 Zotero 运行，并在本页点击“安装 / 修复 WPS 加载项”。',
            'zotero.prefs.help2': '如果 WPS 正在运行，请完全退出并重新启动 WPS 文字。',
            'zotero.prefs.help3': '在 WPS 文字的 Zotero 选项卡中点击“插入/编辑引文”即可开始。',
            'zotero.prefs.help4': '如果在 WPS 中提示无法连接 Zotero，请回到本页点击“刷新状态”，并重新安装加载项。',
            'zotero.prefs.note': 'WPS 加载项目录通常在首次启动 WPS 文字后才会创建。若上方显示“未找到目录”，请先启动一次 WPS 文字，再点击“刷新状态”。',
            'zotero.prefs.resetToken': '重置访问令牌',
            'zotero.prefs.resetHint': '重置后需要重新安装加载项并重启 WPS。',
            'zotero.prefs.reading': '正在读取…',
            'zotero.prefs.working': '处理中…',
            'zotero.prefs.pluginNotLoaded': 'Zotero WPS Bridge 插件未加载',
            'zotero.prefs.readFailed': '读取状态失败：{message}',
            'zotero.prefs.noDirsStatus': '未找到 WPS 加载项目录',
            'zotero.prefs.noDirsWarning': '请先启动一次 WPS 文字（可以马上关闭），让 WPS 创建加载项目录，然后点击“刷新状态”。',
            'zotero.prefs.installedStatus': '已安装 {version}，可以使用',
            'zotero.prefs.updateStatus': '需要更新到 {version}',
            'zotero.prefs.notInstalledStatus': '尚未安装',
            'zotero.prefs.partialStatus': '需要更新到 {version}',
            'zotero.prefs.updateWarning': '检测到旧版本或不完整的安装。请点击“安装 / 修复 WPS 加载项”，然后重启 WPS 文字。',
            'zotero.prefs.notInstalledWarning': '点击“安装 / 修复 WPS 加载项”将加载项写入 WPS。安装后请重启 WPS 文字。',
            'zotero.prefs.inProgressWarning': 'Zotero 正在等待一个 WPS 引用事务。如果 WPS 已经关闭或卡住，请点击“强制重置卡住的事务”。',
            'zotero.prefs.processing': '正在处理引用事务…',
            'zotero.prefs.pathsNotFound': '未找到（请先启动一次 WPS 文字）',
            'zotero.prefs.pathInstalled': '{path} — 已安装 {version}',
            'zotero.prefs.pathPartial': '{path} — 安装不完整（发现 {version}）',
            'zotero.prefs.pathNotInstalled': '{path} — 未安装',
            'zotero.prefs.pathExpected': '应为 {version}',
            'zotero.prefs.notSet': '未设置',
            'zotero.prefs.notStarted': '未启动',
            'zotero.prefs.installDone': 'WPS 加载项已安装。\n\n请完全退出并重新启动 WPS 文字。\n\n安装位置：\n{dirs}',
            'zotero.prefs.uninstallConfirm': '确定要从 WPS 中移除 Zotero 加载项吗？文档中的引文不会被修改。',
            'zotero.prefs.uninstallDone': '已移除 WPS 加载项。请重启 WPS 文字。',
            'zotero.prefs.forceResetConfirm': '仅当引用操作卡住或 WPS 已崩溃时使用。强制重置会取消 Zotero 当前等待的引用事务。继续吗？',
            'zotero.prefs.forceResetDone': '已重置引用事务。',
            'zotero.prefs.resetConfirm': '重置访问令牌后，WPS 加载项需要重新安装并重启 WPS。继续吗？',
            'zotero.prefs.resetDone': '访问令牌已重置。请重启 WPS 文字。',
            'zotero.prefs.openDirNoDir': '尚未找到 WPS 加载项目录。',
            'zotero.prefs.installFailed': '安装失败：{message}',
            'zotero.prefs.uninstallFailed': '卸载失败：{message}',
            'zotero.prefs.resetFailed': '重置令牌失败：{message}',
            'zotero.prefs.languageChanged': '界面语言已更改。请重启 WPS 文字，让加载项重新加载功能区。',

            'zotero.error.noWpsDir': '未找到 WPS 加载项目录。请先启动一次 WPS 文字，再回到 Zotero 重试。',
            'zotero.error.missingBundle': 'Zotero 插件包中缺少 WPS 加载项文件。',
            'zotero.error.invalidConfig': '无法识别的 WPS 配置文件：{path}'
        },

        'zh-TW': {
            'wps.ribbon.tab.zotero.label': 'Zotero',
            'wps.ribbon.group.citations.label': '引文',
            'wps.ribbon.group.notes.label': '筆記',
            'wps.ribbon.group.tools.label': '工具',

            'wps.ribbon.addEditCitation.label': '插入/編輯引文',
            'wps.ribbon.addEditCitation.tip': '在游標處插入引文，或編輯游標所在位置的引文。',
            'wps.ribbon.addEditBibliography.label': '插入/編輯參考文獻',
            'wps.ribbon.addEditBibliography.tip': '在游標處插入參考文獻表，或編輯既有參考文獻表。',
            'wps.ribbon.refresh.label': '重新整理',
            'wps.ribbon.refresh.tip': '依 Zotero 資料庫更新文件中的全部引文與參考文獻。',
            'wps.ribbon.setDocPrefs.label': '文件設定',
            'wps.ribbon.setDocPrefs.tip': '變更引文樣式、語言與引文位置（正文/註腳/尾註）。',
            'wps.ribbon.addNote.label': '插入筆記',
            'wps.ribbon.addNote.tip': '從 Zotero 插入一則筆記。',
            'wps.ribbon.addAnnotation.label': '插入註解引文',
            'wps.ribbon.addAnnotation.tip': '將 Zotero 中的註解/螢光標示作為引文插入文件。',
            'wps.ribbon.removeCodes.label': '解除連結',
            'wps.ribbon.removeCodes.tip': '刪除所有 Zotero 功能變數代碼，保留目前文字。',
            'wps.ribbon.citationExplorer.label': '引文瀏覽器',
            'wps.ribbon.citationExplorer.tip': '開啟 Zotero 引文瀏覽器，檢視並定位文件中的引文。',
            'wps.ribbon.export.label': '匯出文件',
            'wps.ribbon.export.tip': '將目前文件匯出為可在其他文書處理器匯入的格式。',
            'wps.ribbon.checkConnection.label': '檢查連線',
            'wps.ribbon.checkConnection.tip': '檢查 WPS 是否能連線到正在執行的 Zotero。',
            'wps.ribbon.about.label': '說明',
            'wps.ribbon.about.tip': '關於 Zotero WPS Bridge 增益集。',

            'wps.alert.busy': 'Zotero 正在處理上一個要求，請稍候。',
            'wps.alert.incomplete': '操作未完成。請檢查 Zotero 中的提示。',
            'wps.alert.failed': '操作失敗：{message}\n\n如果 Zotero 一直提示「已有交易正在進行」，請重新啟動 Zotero。',
            'wps.alert.envMissing': '目前頁面不在 WPS 增益集環境中執行。',
            'wps.alert.appMissing': '無法取得 WPS 文字應用程式物件。',
            'wps.alert.noDocument': '請先開啟一份 WPS 文字文件。',
            'wps.alert.network': '無法連線到 Zotero。\n\n請檢查：\n• Zotero 正在執行；\n• 「Zotero WPS Bridge」增益集已在 Zotero → 增益集 中啟用；\n• 已在 Zotero → 設定 → WPS 中點擊「安裝 / 修復 WPS 增益集」；\n• 修復後已重新啟動 WPS 文字。\n\n然後再次點擊「檢查連線」。',
            'wps.alert.cannotConnect': '無法連線到 Zotero。\n\n1. 啟動 Zotero；\n2. 在 Zotero → 增益集 中啟用「Zotero WPS Bridge」；\n3. 在 Zotero → 設定 → WPS 中點擊「安裝 / 修復 WPS 增益集」；\n4. 重新啟動 WPS 文字。\n\n然後重試。',
            'wps.alert.unlinkNeedsZotero': '解除連結需要 Zotero 正在執行並已連線。\n\n請先啟動 Zotero，確認「Zotero WPS Bridge」已啟用，然後點擊「檢查連線」。\n\n文件不會被修改。',
            'wps.alert.unlinkNoToken': 'WPS 增益集沒有存取權杖。\n\n請在 Zotero → 設定 → WPS 中點擊「安裝 / 修復 WPS 增益集」，然後重新啟動 WPS 文字。\n\n文件不會被修改。',
            'wps.alert.bridgeNotReady': 'Zotero 正在執行，但 WPS 橋接尚未就緒（HTTP {status}）。\n\n1. 開啟 Zotero → 設定 → WPS；\n2. 點擊「安裝 / 修復 WPS 增益集」；\n3. 重新啟動 WPS 文字。',
            'wps.alert.connected': 'Zotero 連線正常。\n\nZotero：{zoteroVersion}\n橋接：{bridgeVersion}\n連接埠：{port}\n權杖：{token}\n\n現在可以在 WPS 文字中插入引文。',
            'wps.alert.tokenConfigured': '已設定',
            'wps.alert.tokenMissing': '未設定',
            'wps.alert.about': 'Zotero WPS Bridge {version}\n\n在 WPS 文字中使用 Zotero 插入與管理引文。\n\n快速開始\n1. 保持 Zotero 執行；\n2. 開啟 WPS 文字中的 Zotero 索引標籤；\n3. 點擊「插入/編輯引文」。\n\n提示\n• 連線異常時先點擊「檢查連線」。\n• 更新後請在 Zotero → 設定 → WPS 中重新安裝增益集。\n• 安裝或更新增益集後需要重新啟動 WPS 文字。',
            'wps.dialog.helpTitle': '說明',
            'wps.dialog.connectionOkTitle': '連線正常',
            'wps.dialog.connectionFailedTitle': '無法連線到 Zotero',
            'wps.dialog.unlinkTitle': '無法解除連結',
            'wps.dialog.close': '關閉',
            'wps.confirm.removeCodes': '確定要解除文件中的所有 Zotero 引用嗎？\n\n此操作會刪除功能變數代碼，但保留目前顯示的文字，且無法復原。\n\n操作完成前需要保持 Zotero 執行。',

            'wps.error.busyOtherDoc': 'Zotero 正在處理另一份文件的引用交易。請先在 Zotero 中完成或取消目前操作。',
            'wps.error.invalidToken': '存取權杖無效。\n\n請在 Zotero → 設定 → WPS 中點擊「安裝 / 修復 WPS 增益集」，然後重新啟動 WPS 文字。',
            'wps.error.http': 'Zotero 傳回錯誤（HTTP {status}）：{text}',
            'wps.error.unexpectedEnd': 'Zotero 交易意外結束。',
            'wps.error.unsupportedCommand': 'Zotero 要求了不支援的 WPS 命令：{command}',
            'wps.error.docIdMismatch': 'Zotero 文件 ID 不相符。',
            'wps.error.unsupportedNoteType': '不支援的註釋類型：{type}',
            'wps.error.cannotCreateField': '無法建立 Zotero 功能變數。',
            'wps.error.cannotCreateNote': '無法在此處建立註腳或尾註。',
            'wps.error.cannotRegisterField': '無法註冊新建立的 Zotero 功能變數。',
            'wps.error.fieldNotFound': '找不到功能變數：{id}',

            'wps.dialog.yesNoCancel1': '選擇「確定」=是，選擇「取消」繼續選擇「否/取消」。',
            'wps.dialog.yesNoCancel2': '選擇「確定」=否，選擇「取消」=取消。',

            'zotero.menu.tools': 'Zotero WPS Bridge 整合…',
            'zotero.prefs.title': 'WPS 文字整合',
            'zotero.prefs.intro': '安裝後，WPS 文字的功能區會出現一個 Zotero 索引標籤。引文資料由正在執行的 Zotero 提供，WPS 增益集只負責在文件中讀寫 Zotero 功能變數。',
            'zotero.prefs.statusLabel': '狀態',
            'zotero.prefs.portLabel': 'Zotero 連接埠',
            'zotero.prefs.tokenLabel': '存取權杖',
            'zotero.prefs.pathsLabel': '增益集目錄',
            'zotero.prefs.ok': '確定',
            'zotero.prefs.cancel': '取消',
            'zotero.prefs.remove': '移除',
            'zotero.prefs.reset': '重設',
            'zotero.prefs.forceResetButton': '強制重設',
            'zotero.prefs.install': '安裝 / 修復 WPS 增益集',
            'zotero.prefs.uninstall': '解除安裝 WPS 增益集',
            'zotero.prefs.uninstallHint': '解除安裝只會移除 WPS 增益集，不會修改文件中既有的引文。',
            'zotero.prefs.refresh': '重新整理狀態',
            'zotero.prefs.openDir': '開啟目錄',
            'zotero.prefs.forceReset': '強制重設卡住的交易',
            'zotero.prefs.autoInstall': 'Zotero 啟動時自動檢查並更新 WPS 增益集',
            'zotero.prefs.keepDialogRaised': '讓 Zotero 引文對話框保持在 WPS 上方',
            'zotero.prefs.language': '介面語言',
            'zotero.prefs.languageAuto': '自動',
            'zotero.prefs.languageEn': 'English (United States)',
            'zotero.prefs.languageZhCN': '簡體中文',
            'zotero.prefs.languageZhTW': '繁體中文',
            'zotero.prefs.helpTitle': '使用說明',
            'zotero.prefs.help1': '保持 Zotero 執行，並在本頁點擊「安裝 / 修復 WPS 增益集」。',
            'zotero.prefs.help2': '如果 WPS 正在執行，請完全結束並重新啟動 WPS 文字。',
            'zotero.prefs.help3': '在 WPS 文字的 Zotero 索引標籤中點擊「插入/編輯引文」即可開始。',
            'zotero.prefs.help4': '如果在 WPS 中提示無法連線到 Zotero，請回到本頁點擊「重新整理狀態」，並重新安裝增益集。',
            'zotero.prefs.note': 'WPS 增益集目錄通常在第一次啟動 WPS 文字後才會建立。若上方顯示「找不到目錄」，請先啟動一次 WPS 文字，再點擊「重新整理狀態」。',
            'zotero.prefs.resetToken': '重設存取權杖',
            'zotero.prefs.resetHint': '重設後需要重新安裝增益集並重新啟動 WPS。',
            'zotero.prefs.reading': '正在讀取…',
            'zotero.prefs.working': '處理中…',
            'zotero.prefs.pluginNotLoaded': 'Zotero WPS Bridge 外掛未載入',
            'zotero.prefs.readFailed': '讀取狀態失敗：{message}',
            'zotero.prefs.noDirsStatus': '找不到 WPS 增益集目錄',
            'zotero.prefs.noDirsWarning': '請先啟動一次 WPS 文字（可以立即關閉），讓 WPS 建立增益集目錄，然後點擊「重新整理狀態」。',
            'zotero.prefs.installedStatus': '已安裝 {version}，可以使用',
            'zotero.prefs.updateStatus': '需要更新至 {version}',
            'zotero.prefs.notInstalledStatus': '尚未安裝',
            'zotero.prefs.partialStatus': '需要更新至 {version}',
            'zotero.prefs.updateWarning': '偵測到舊版或不完整的安裝。請點擊「安裝 / 修復 WPS 增益集」，然後重新啟動 WPS 文字。',
            'zotero.prefs.notInstalledWarning': '點擊「安裝 / 修復 WPS 增益集」將增益集寫入 WPS。安裝後請重新啟動 WPS 文字。',
            'zotero.prefs.inProgressWarning': 'Zotero 正在等待一個 WPS 引用交易。如果 WPS 已關閉或卡住，請點擊「強制重設卡住的交易」。',
            'zotero.prefs.processing': '正在處理引用交易…',
            'zotero.prefs.pathsNotFound': '找不到（請先啟動一次 WPS 文字）',
            'zotero.prefs.pathInstalled': '{path} — 已安裝 {version}',
            'zotero.prefs.pathPartial': '{path} — 安裝不完整（發現 {version}）',
            'zotero.prefs.pathNotInstalled': '{path} — 未安裝',
            'zotero.prefs.pathExpected': '應為 {version}',
            'zotero.prefs.notSet': '未設定',
            'zotero.prefs.notStarted': '未啟動',
            'zotero.prefs.installDone': 'WPS 增益集已安裝。\n\n請完全結束並重新啟動 WPS 文字。\n\n安裝位置：\n{dirs}',
            'zotero.prefs.uninstallConfirm': '確定要從 WPS 移除 Zotero 增益集嗎？文件中的引文不會被修改。',
            'zotero.prefs.uninstallDone': '已移除 WPS 增益集。請重新啟動 WPS 文字。',
            'zotero.prefs.forceResetConfirm': '僅當引用操作卡住或 WPS 已當機時使用。強制重設會取消 Zotero 目前等待的引用交易。繼續嗎？',
            'zotero.prefs.forceResetDone': '已重設引用交易。',
            'zotero.prefs.resetConfirm': '重設存取權杖後，WPS 增益集需要重新安裝並重新啟動 WPS。繼續嗎？',
            'zotero.prefs.resetDone': '存取權杖已重設。請重新啟動 WPS 文字。',
            'zotero.prefs.openDirNoDir': '尚未找到 WPS 增益集目錄。',
            'zotero.prefs.installFailed': '安裝失敗：{message}',
            'zotero.prefs.uninstallFailed': '解除安裝失敗：{message}',
            'zotero.prefs.resetFailed': '重設權杖失敗：{message}',
            'zotero.prefs.languageChanged': '介面語言已變更。請重新啟動 WPS 文字，讓增益集重新載入功能區。',

            'zotero.error.noWpsDir': '找不到 WPS 增益集目錄。請先啟動一次 WPS 文字，再回到 Zotero 重試。',
            'zotero.error.missingBundle': 'Zotero 外掛套件中缺少 WPS 增益集檔案。',
            'zotero.error.invalidConfig': '無法辨識的 WPS 設定檔：{path}'
        }
    };

    function normalizeLocale(input) {
        let value = String(input || '').trim();
        if (/^\d+$/.test(value)) {
            return WINDOWS_LCID[value] || null;
        }
        value = value.toLowerCase().replace(/_/g, '-');
        if (!value || value === 'auto') {
            return null;
        }
        if (value.indexOf('zh') === 0) {
            if (/(tw|hk|mo|hant|cht)/.test(value)) {
                return 'zh-TW';
            }
            if (/(cn|sg|hans|chs)/.test(value)) {
                return 'zh-CN';
            }
            return 'zh-CN';
        }
        if (value.indexOf('en') === 0) {
            return 'en-US';
        }
        return null;
    }

    function detectLocale() {
        try {
            const nav = typeof navigator !== 'undefined' ? navigator : null;
            const languages = nav && nav.languages && nav.languages.length
                ? nav.languages
                : [nav && nav.language];
            for (let language of languages) {
                const normalized = normalizeLocale(language);
                if (normalized) {
                    return normalized;
                }
            }
        }
        catch (e) {}
        return 'en-US';
    }

    function resolveLocale(preferred, fallback) {
        return normalizeLocale(preferred)
            || normalizeLocale(fallback)
            || detectLocale()
            || 'en-US';
    }

    function interpolate(template, params) {
        if (!params) {
            return template;
        }
        return String(template).replace(/\{([^}]+)\}/g, function (match, key) {
            if (Object.prototype.hasOwnProperty.call(params, key)) {
                return String(params[key]);
            }
            return match;
        });
    }

    function createTranslator(preferred, fallback) {
        const locale = resolveLocale(preferred, fallback);
        const table = messages[locale] || messages['en-US'];
        const fallbackTable = messages['en-US'];
        return {
            locale: locale,
            t: function (key, params) {
                let value = table[key];
                if (value == null) {
                    value = fallbackTable[key];
                }
                if (value == null) {
                    value = key;
                }
                return interpolate(value, params);
            }
        };
    }

    return {
        SUPPORTED,
        messages,
        normalizeLocale,
        detectLocale,
        resolveLocale,
        createTranslator
    };
});
