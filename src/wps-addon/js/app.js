/* WPS ribbon entry points and command dispatch. */
(function () {
    'use strict';

    const U = window.ZoteroWPSUtil;
    const P = window.ZoteroWPSProtocol;
    let busy = false;
    let ribbonUI = null;

    function version() {
        const cfg = U.getConfig();
        return cfg.addonVersion || '0.2.4';
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
                        zoteroVersion: info.zoteroVersion || U.t('wps.alert.tokenMissing'),
                        bridgeVersion: info.version || U.t('wps.alert.tokenMissing'),
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

    function showMessageDialog(title, body, type) {
        try {
            const app = typeof wps !== 'undefined' ? wps : window.Application;
            if (app && typeof app.ShowDialog === 'function' && app.PluginStorage) {
                const key = 'zwps-dialog-' + Date.now() + '-'
                    + Math.random().toString(36).slice(2);
                app.PluginStorage.setItem(key, JSON.stringify({
                    title: title || 'Zotero WPS Bridge',
                    body: body || '',
                    type: type || 'info',
                    closeLabel: U.t('wps.dialog.close')
                }));
                const page = new URL('dialog.html', window.location.href);
                page.searchParams.set('key', key);
                const scale = Number(window.devicePixelRatio) || 1;
                const shown = app.ShowDialog(
                    page.href,
                    title || 'Zotero WPS Bridge',
                    Math.round(560 * scale),
                    Math.round(500 * scale),
                    true,
                    false,
                    2
                );
                if (shown !== false) {
                    return true;
                }
            }
        }
        catch (e) {
            U.debug('custom dialog failed', e);
        }
        U.alertUser(body, title);
        return false;
    }

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
        const id = control && control.Id;
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
            case 'btnAbout':
                showAbout();
                break;
            default:
                break;
        }
        return true;
    }

    function OnGetEnabled() {
        try {
            return wps.WpsApplication().Documents.Count > 0;
        }
        catch (e) {
            return true;
        }
    }

    function GetImage(control) {
        const id = control && control.Id;
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
