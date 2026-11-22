/* WPS ribbon entry points and command dispatch. */
(function () {
    'use strict';

    const U = window.ZoteroWPSUtil;
    const P = window.ZoteroWPSProtocol;
    let busy = false;
    let ribbonUI = null;

    function version() {
        const cfg = U.getConfig();
        return cfg.addonVersion || '0.2.10';
    }

    function docId() {
        return P.randomId(36);
    }

    function runTransaction(command) {
        if (busy) {
            U.alertUser(U.t('wps.alert.busy'));
            return false;
        }
        let doc;
        try {
            U.ensureWpsEnvironment();
            doc = U.getActiveDocument();
        }
        catch (e) {
            U.alertUser(e.message);
            return false;
        }

        busy = true;
        const client = window.ZoteroWPSClient.create(docId());
        try {
            const ok = client.transact(command);
            if (!ok) {
                U.alertUser(U.t('wps.alert.incomplete'));
            }
        }
        catch (e) {
            U.debug('transaction failed', command, e);
            if (e.isNetworkError) {
                showMessageDialog(
                    U.t('wps.dialog.connectionFailedTitle'),
                    U.t('wps.alert.network'),
                    'error'
                );
            }
            else if (e.userFacing) {
                U.alertUser(e.message);
            }
            else {
                U.alertUser(U.t('wps.alert.failed', { message: e.message }));
            }
        }
        finally {
            busy = false;
            try {
                if (doc) {
                    doc.Activate();
                }
            }
            catch (e) {}
        }
        return true;
    }

    function checkConnection() {
        try {
            const response = window.ZoteroWPSClient.create('ping').ping();
            if (response.status === 200 && response.json && response.json.ok) {
                const info = response.json;
                showMessageDialog(
                    U.t('wps.dialog.connectionOkTitle'),
                    U.t('wps.alert.connected', {
                        zoteroVersion: info.zoteroVersion || U.t('wps.alert.unknown'),
                        bridgeVersion: info.version || U.t('wps.alert.unknown'),
                        port: info.port || U.getURLBase().replace(/^.*:/, ''),
                        token: U.getConfig().token
                            ? U.t('wps.alert.tokenConfigured')
                            : U.t('wps.alert.tokenMissing')
                    }),
                    'success'
                );
            }
            else {
                showMessageDialog(
                    U.t('wps.dialog.connectionFailedTitle'),
                    U.t('wps.alert.bridgeNotReady', { status: response.status }),
                    'warning'
                );
            }
        }
        catch (e) {
            showMessageDialog(
                U.t('wps.dialog.connectionFailedTitle'),
                U.t('wps.alert.cannotConnect'),
                'error'
            );
        }
    }

    // Approximate the wrapped line count. CJK glyphs are twice as wide as
    // Latin characters at the same font size, so counting characters alone
    // underestimates the height of Chinese/Taiwanese dialogs.
    function displayWidth(text) {
        let width = 0;
        for (const ch of String(text || '')) {
            width += /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/.test(ch)
                ? 2
                : 1;
        }
        return width;
    }

    function estimateDialogHeight(body) {
        // 560 logical px leaves about 500 px for text after padding; at 14 px
        // this fits roughly 68 half-width characters per line.
        const lines = String(body || '').replace(/\r\n?/g, '\n')
            .split('\n').reduce(function (sum, line) {
            return sum + Math.max(1, Math.ceil(displayWidth(line) / 68));
        }, 0);
        return Math.min(640, Math.max(240, 168 + lines * 24));
    }

    function showMessageDialog(title, body, type) {
        const heading = title || U.t('wps.dialog.noticeTitle');
        const data = {
            title: heading,
            body: body || '',
            type: type || 'info',
            closeLabel: U.t('wps.dialog.close')
        };
        try {
            const app = typeof wps !== 'undefined'
                    && typeof wps.ShowDialog === 'function'
                ? wps
                : window.Application;
            // WPS exposes PluginStorage on both the application and the wps
            // add-in object, depending on version. The dialog page may not get
            // a wps object, so also pass the payload in the URL as a fallback.
            const storage = (typeof wps !== 'undefined' && wps.PluginStorage)
                || (app && app.PluginStorage);
            if (app && typeof app.ShowDialog === 'function' && storage) {
                const key = 'zwps-dialog-' + Date.now() + '-'
                    + Math.random().toString(36).slice(2);
                storage.setItem(key, JSON.stringify(data));
                const page = new URL('dialog.html', window.location.href);
                page.searchParams.set('key', key);
                const encoded = JSON.stringify(data);
                if (encoded.length <= 3000) {
                    page.searchParams.set('payload', encoded);
                }
                const scale = Number(window.devicePixelRatio) || 1;
                const shown = app.ShowDialog(
                    page.href,
                    heading,
                    Math.round(560 * scale),
                    Math.round(estimateDialogHeight(body) * scale),
                    true,
                    false,
                    2
                );
                if (shown !== false) {
                    return true;
                }
                try { storage.removeItem(key); } catch (err) {}
            }
        }
        catch (e) {
            U.debug('custom dialog failed', e);
        }
        alert((heading ? heading + '\n\n' : '') + (body || ''));
        return false;
    }

    window.zwpsShowMessage = showMessageDialog;

    function showAbout() {
        showMessageDialog(
            U.t('wps.dialog.helpTitle'),
            U.t('wps.alert.about', { version: version() }),
            'info'
        );
    }

    function isBridgeReachable() {
        try {
            const response = window.ZoteroWPSClient.create('connection-check').ping();
            return response.status === 200
                && response.json
                && response.json.ok;
        }
        catch (e) {
            U.debug('bridge check failed', e);
            return false;
        }
    }

    function switchLayout() {
        const order = ['current', 'endnote', 'zotero'];
        const current = U.getConfig().ribbonLayout || 'current';
        const index = Math.max(0, order.indexOf(current));
        const next = order[(index + 1) % order.length];
        const labels = {
            current: 'zotero.prefs.ribbonLayoutCurrent',
            endnote: 'zotero.prefs.ribbonLayoutEndnote',
            zotero: 'zotero.prefs.ribbonLayoutZotero'
        };
        try {
            const response = window.ZoteroWPSClient.create('layout').setLayout(next);
            if (response.status === 200 && response.json && response.json.ok) {
                U.getConfig().ribbonLayout = next;
                showMessageDialog(
                    U.t('wps.dialog.layoutTitle'),
                    U.t('wps.alert.layoutChanged', {
                        layout: U.t(labels[next])
                    }),
                    'success'
                );
                return;
            }
            U.alertUser(U.t('wps.error.http', {
                status: response.status,
                text: response.text || ''
            }));
        }
        catch (e) {
            U.alertUser(U.t('wps.alert.cannotConnect'));
        }
    }

    function confirmUnlink() {
        if (!U.getConfig().token) {
            showMessageDialog(
                U.t('wps.dialog.unlinkTitle'),
                U.t('wps.alert.unlinkNoToken'),
                'warning'
            );
            return;
        }
        if (!isBridgeReachable()) {
            showMessageDialog(
                U.t('wps.dialog.unlinkTitle'),
                U.t('wps.alert.unlinkNeedsZotero'),
                'error'
            );
            return;
        }
        if (confirm(U.t('wps.confirm.removeCodes'))) {
            runTransaction('removeCodes');
        }
    }

    function OnAddinLoad(ui) {
        ribbonUI = ui;
        try {
            U.ensureWpsEnvironment();
            wps.ribbonUI = ui;
        }
        catch (e) {
            // Don't block WPS startup; actions will show a useful error.
            U.debug('WPS environment not ready', e);
        }
        // Check the bridge after the document window is ready, without
        // interrupting the user.
        setTimeout(function () {
            try {
                const response = window.ZoteroWPSClient.create('startup').ping();
                U.debug('bridge status', response.status, response.text);
            }
            catch (e) {
                U.debug('bridge not available at startup', e);
            }
        }, 1500);
        return true;
    }

    const RIBBON_KEYS = {
        zoteroTab: 'tab.zotero',
        zoteroCitations: 'group.citations',
        zoteroBibliography: 'group.bibliography',
        zoteroNotes: 'group.notes',
        zoteroTools: 'group.tools',
        zoteroMain: 'group.zotero',
        btnAddEditCitation: 'addEditCitation',
        btnAddEditBibliography: 'addEditBibliography',
        btnRefresh: 'refresh',
        btnSetDocPrefs: 'setDocPrefs',
        btnAddNote: 'addNote',
        btnAddAnnotation: 'addAnnotation',
        btnRemoveCodes: 'removeCodes',
        btnCitationExplorer: 'citationExplorer',
        btnExport: 'export',
        btnCheckConnection: 'checkConnection',
        btnLayout: 'layout',
        btnAbout: 'about'
    };

    function GetLabel(control) {
        const key = RIBBON_KEYS[control && (control.Id || control.id)];
        return key ? U.t('wps.ribbon.' + key + '.label') : '';
    }

    function GetSupertip(control) {
        const key = RIBBON_KEYS[control && (control.Id || control.id)];
        return key ? U.t('wps.ribbon.' + key + '.tip') : '';
    }

    function OnAction(control) {
        const id = control && (control.Id || control.id);
        switch (id) {
            case 'btnAddEditCitation':
                runTransaction('addEditCitation');
                break;
            case 'btnAddEditBibliography':
                runTransaction('addEditBibliography');
                break;
            case 'btnRefresh':
                runTransaction('refresh');
                break;
            case 'btnSetDocPrefs':
                runTransaction('setDocPrefs');
                break;
            case 'btnAddNote':
                runTransaction('addNote');
                break;
            case 'btnAddAnnotation':
                runTransaction('addAnnotation');
                break;
            case 'btnCitationExplorer':
                runTransaction('citationExplorer');
                break;
            case 'btnExport':
                // Zotero shows its own confirmation and explains the workflow.
                runTransaction('exportDocument');
                break;
            case 'btnRemoveCodes':
                confirmUnlink();
                break;
            case 'btnCheckConnection':
                checkConnection();
                break;
            case 'btnLayout':
                switchLayout();
                break;
            case 'btnAbout':
                showAbout();
                break;
            default:
                break;
        }
        return true;
    }

    function OnGetEnabled(control) {
        const id = control && (control.Id || control.id);
        // Help, connection diagnostics and layout switching do not touch the
        // document and must stay available when WPS has no open document.
        // If WPS does not pass the control object, keep everything enabled and
        // let the command itself report the missing document.
        if (!id || id === 'btnAbout' || id === 'btnCheckConnection' || id === 'btnLayout') {
            return true;
        }
        try {
            return wps.WpsApplication().Documents.Count > 0;
        }
        catch (e) {
            return true;
        }
    }

    function GetImage(control) {
        const id = control && (control.Id || control.id);
        const images = {
            btnAddEditCitation: 'images/citation.svg',
            btnAddEditBibliography: 'images/bibliography.svg',
            btnRefresh: 'images/refresh.svg',
            btnSetDocPrefs: 'images/settings.svg',
            btnAddNote: 'images/note.svg',
            btnAddAnnotation: 'images/annotation.svg',
            btnCitationExplorer: 'images/explorer.svg',
            btnExport: 'images/export.svg',
            btnRemoveCodes: 'images/unlink.svg',
            btnCheckConnection: 'images/link.svg',
            btnLayout: 'images/settings.svg',
            btnAbout: 'images/info.svg'
        };
        return images[id] || 'images/info.svg';
    }

    window.OnAddinLoad = OnAddinLoad;
    window.GetLabel = GetLabel;
    window.GetSupertip = GetSupertip;
    window.OnAction = OnAction;
    window.OnGetEnabled = OnGetEnabled;
    window.GetImage = GetImage;
    window.zwpsRun = runTransaction;
})();
