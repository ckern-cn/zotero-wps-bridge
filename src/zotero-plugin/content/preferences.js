/* Zotero preference pane for the WPS integration. */
(function () {
    'use strict';

    let lastStatus = null;

    function plugin() {
        return Zotero.ZoteroWPS;
    }

    function T(key, params) {
        const p = plugin();
        return p ? p.t(key, params) : key;
    }

    function el(id) {
        return document.getElementById(id);
    }

    function setText(id, text, className) {
        const node = el(id);
        if (!node) {
            return;
        }
        node.textContent = text;
        if (className) {
            node.className = className;
        }
    }

    function showWarning(text) {
        const node = el('zwps-warning');
        if (!node) {
            return;
        }
        if (text) {
            node.textContent = text;
            node.removeAttribute('hidden');
        }
        else {
            node.setAttribute('hidden', 'hidden');
        }
    }

    function applyStaticText() {
        const p = plugin();
        if (!p) {
            return;
        }
        setText('zwps-title', T('zotero.prefs.title'));
        setText('zwps-intro', T('zotero.prefs.intro'));
        setText('zwps-status-label', T('zotero.prefs.statusLabel'));
        setText('zwps-port-label', T('zotero.prefs.portLabel'));
        setText('zwps-token-label', T('zotero.prefs.tokenLabel'));
        setText('zwps-paths-label', T('zotero.prefs.pathsLabel'));
        setText('zwps-install', T('zotero.prefs.install'));
        setText('zwps-uninstall', T('zotero.prefs.uninstall'));
        setText('zwps-refresh', T('zotero.prefs.refresh'));
        setText('zwps-open-dir', T('zotero.prefs.openDir'));
        setText('zwps-force-reset', T('zotero.prefs.forceReset'));
        setText('zwps-autoinstall-text', T('zotero.prefs.autoInstall'));
        setText('zwps-keep-raised-text', T('zotero.prefs.keepDialogRaised'));
        setText('zwps-language-label', T('zotero.prefs.language'));
        setText('zwps-help-title', T('zotero.prefs.helpTitle'));
        setText('zwps-help-1', T('zotero.prefs.help1'));
        setText('zwps-help-2', T('zotero.prefs.help2'));
        setText('zwps-help-3', T('zotero.prefs.help3'));
        setText('zwps-help-4', T('zotero.prefs.help4'));
        setText('zwps-note', T('zotero.prefs.note'));
        setText('zwps-reset-token', T('zotero.prefs.resetToken'));
        setText('zwps-reset-hint', T('zotero.prefs.resetHint'));

        const labels = {
            auto: T('zotero.prefs.languageAuto'),
            'en-US': T('zotero.prefs.languageEn'),
            'zh-CN': T('zotero.prefs.languageZhCN'),
            'zh-TW': T('zotero.prefs.languageZhTW')
        };
        const language = el('zwps-language');
        const options = language ? language.getElementsByTagName('option') : [];
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const value = option.getAttribute('value');
            if (labels[value]) {
                option.textContent = labels[value];
            }
        }
    }

    function renderPaths(dirs) {
        const container = el('zwps-paths');
        if (!container) {
            return;
        }
        container.textContent = '';
        if (!dirs.length) {
            container.textContent = T('zotero.prefs.pathsNotFound');
            return;
        }
        const list = document.createElementNS('http://www.w3.org/1999/xhtml', 'ul');
        for (const dir of dirs) {
            const item = document.createElementNS('http://www.w3.org/1999/xhtml', 'li');
            if (dir.installedVersion) {
                item.textContent = T('zotero.prefs.pathInstalled', {
                    path: dir.path,
                    version: dir.installedVersion
                });
                if (dir.installedVersion !== dir.expectedVersion) {
                    item.textContent += ' (' + T('zotero.prefs.pathExpected', {
                        version: dir.expectedVersion
                    }) + ')';
                    item.className = 'zwps-warn';
                }
            }
            else if (dir.partialVersion) {
                item.textContent = T('zotero.prefs.pathPartial', {
                    path: dir.path,
                    version: dir.partialVersion
                });
                item.className = 'zwps-warn';
            }
            else {
                item.textContent = T('zotero.prefs.pathNotInstalled', { path: dir.path });
            }
            list.appendChild(item);
        }
        container.appendChild(list);
    }

    async function refresh() {
        const p = plugin();
        if (!p) {
            setText('zwps-status', 'Zotero WPS Bridge plugin is not loaded', 'zwps-bad');
            return;
        }
        try {
            const status = await p.getStatus();
            lastStatus = status;
            const dirs = status.dirs || [];
            const allInstalled = dirs.length > 0
                && dirs.every(function (dir) {
                    return dir.installedVersion === status.version;
                });
            const someInstalled = dirs.some(function (dir) {
                return !!dir.installedVersion || !!dir.partialVersion;
            });

            if (!dirs.length) {
                setText('zwps-status', T('zotero.prefs.noDirsStatus'), 'zwps-warn');
                showWarning(T('zotero.prefs.noDirsWarning'));
            }
            else if (allInstalled) {
                setText('zwps-status', T('zotero.prefs.installedStatus', {
                    version: status.version
                }), 'zwps-ok');
                showWarning('');
            }
            else if (someInstalled) {
                setText('zwps-status', T('zotero.prefs.updateStatus', {
                    version: status.version
                }), 'zwps-warn');
                showWarning(T('zotero.prefs.updateWarning'));
            }
            else {
                setText('zwps-status', T('zotero.prefs.notInstalledStatus'), 'zwps-warn');
                showWarning(T('zotero.prefs.notInstalledWarning'));
            }
            if (status.inProgress) {
                showWarning(T('zotero.prefs.inProgressWarning'));
                setText('zwps-status', T('zotero.prefs.processing'), 'zwps-warn');
            }

            setText('zwps-port', status.port ? String(status.port) : T('zotero.prefs.notStarted'));
            setText('zwps-token', status.tokenMasked || T('zotero.prefs.notSet'));
            renderPaths(dirs);

            const checkbox = el('zwps-autoinstall');
            if (checkbox) {
                checkbox.checked = !!status.autoInstall;
            }
            const keepRaised = el('zwps-keep-raised');
            if (keepRaised) {
                keepRaised.checked = status.keepDialogRaised !== false;
            }
            const language = el('zwps-language');
            if (language) {
                language.value = status.locale || 'auto';
            }
        }
        catch (e) {
            Zotero.logError(e);
            setText('zwps-status', T('zotero.prefs.readFailed', { message: e.message }), 'zwps-bad');
        }
    }

    async function withBusy(button, task, failureKey) {
        if (!button) {
            return;
        }
        const oldLabel = button.textContent;
        button.disabled = true;
        button.textContent = T('zotero.prefs.working');
        try {
            await task();
        }
        catch (e) {
            Zotero.logError(e);
            Zotero.alert(null, 'Zotero WPS Bridge', T(failureKey, { message: e.message || String(e) }));
        }
        finally {
            button.disabled = false;
            button.textContent = oldLabel;
            await refresh();
        }
    }

    function confirmDialog(text, button0) {
        return Zotero.Prompt.confirm({
            title: 'Zotero WPS Bridge',
            text: text,
            button0: button0,
            button1: T('zotero.prefs.cancel')
        }) === 0;
    }

    function bind() {
        const p = plugin();
        if (!p) {
            return;
        }

        const install = el('zwps-install');
        if (install) {
            install.addEventListener('click', function () {
                withBusy(install, async function () {
                    const dirs = await p.install();
                    Zotero.alert(null, 'Zotero WPS Bridge', T('zotero.prefs.installDone', {
                        dirs: dirs.join('\n')
                    }));
                }, 'zotero.prefs.installFailed');
            });
        }

        const uninstall = el('zwps-uninstall');
        if (uninstall) {
            uninstall.addEventListener('click', function () {
                if (!confirmDialog(T('zotero.prefs.uninstallConfirm'), T('zotero.prefs.remove'))) {
                    return;
                }
                withBusy(uninstall, async function () {
                    await p.uninstall();
                    Zotero.alert(null, 'Zotero WPS Bridge', T('zotero.prefs.uninstallDone'));
                }, 'zotero.prefs.uninstallFailed');
            });
        }

        const refreshButton = el('zwps-refresh');
        if (refreshButton) {
            refreshButton.addEventListener('click', refresh);
        }

        const openDir = el('zwps-open-dir');
        if (openDir) {
            openDir.addEventListener('click', function () {
                if (!lastStatus || !lastStatus.dirs || !lastStatus.dirs.length) {
                    Zotero.alert(null, 'Zotero WPS Bridge', T('zotero.prefs.openDirNoDir'));
                    return;
                }
                try {
                    Zotero.launchFile(Zotero.File.pathToFile(lastStatus.dirs[0].path));
                }
                catch (e) {
                    Zotero.logError(e);
                }
            });
        }

        const autoInstall = el('zwps-autoinstall');
        if (autoInstall) {
            autoInstall.addEventListener('change', function () {
                Zotero.Prefs.set('zotero-wps.autoInstall', !!autoInstall.checked);
            });
        }

        const keepRaised = el('zwps-keep-raised');
        if (keepRaised) {
            keepRaised.addEventListener('change', function () {
                Zotero.Prefs.set('zotero-wps.keepDialogRaised', !!keepRaised.checked);
            });
        }

        const language = el('zwps-language');
        if (language) {
            language.addEventListener('change', async function () {
                language.disabled = true;
                try {
                    await p.setLocale(language.value);
                    applyStaticText();
                    await refresh();
                    Zotero.alert(null, 'Zotero WPS Bridge', T('zotero.prefs.languageChanged'));
                }
                finally {
                    language.disabled = false;
                }
            });
        }

        const forceReset = el('zwps-force-reset');
        if (forceReset) {
            forceReset.addEventListener('click', function () {
                if (!confirmDialog(T('zotero.prefs.forceResetConfirm'), T('zotero.prefs.forceResetButton'))) {
                    return;
                }
                p.forceReset();
                Zotero.alert(null, 'Zotero WPS Bridge', T('zotero.prefs.forceResetDone'));
                refresh();
            });
        }

        const reset = el('zwps-reset-token');
        if (reset) {
            reset.addEventListener('click', function () {
                if (!confirmDialog(T('zotero.prefs.resetConfirm'), T('zotero.prefs.reset'))) {
                    return;
                }
                withBusy(reset, async function () {
                    p.resetToken();
                    try {
                        await p.install();
                    }
                    catch (e) {
                        // The token will be written on the next install if no WPS directory exists.
                    }
                    Zotero.alert(null, 'Zotero WPS Bridge', T('zotero.prefs.resetDone'));
                }, 'zotero.prefs.resetFailed');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            applyStaticText();
            bind();
            refresh();
        });
    }
    else {
        applyStaticText();
        bind();
        refresh();
    }
})();
