/*
 * Zotero WPS Bridge.
 *
 * This plugin:
 *   1. exposes a small same-origin-safe HTTP API under /wps/ for the WPS
 *      add-in (the WPS add-in runs from file://, so CORS is enabled only for
 *      /wps/ paths and only for file/local origins);
 *   2. installs/updates the WPS add-in into the WPS jsaddons directory;
 *   3. lets the WPS add-in drive Zotero's existing HTTP citation protocol.
 */
"use strict";

var ZoteroWPSGlobal = this;

var ZoteroWPS = {
    id: null,
    version: '0.2.9',
    rootURI: null,
    token: null,
    addonFiles: null,
    addonVersion: null,
    prefPaneID: null,
    i18n: null,
    translator: null,
    localeOverride: 'auto',
    ribbonKeys: {
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
    },
    _origGenerateResponse: null,
    _endpoints: [],
    _txTimer: null,
    _pendingSendResponse: null,
    _origSendResponse: undefined,
    _sendResponsePatched: false,
    _origKeepRaised: undefined,
    _keepRaisedApplied: false,
    _installTimer: null,
    _prefPaneRetry: null,
    _prefPaneRetries: 0,
    _windows: new WeakSet(),

    startup: function (data) {
        this.id = data.id;
        this.version = data.version;
        this.rootURI = data.rootURI;
        Zotero.ZoteroWPS = this;

        this.token = this.getOrCreateToken();
        this.localeOverride = Zotero.Prefs.get('zotero-wps.locale') || 'auto';
        this.loadI18n();
        this.translator = this.i18n
            ? this.i18n.createTranslator(this.getZoteroLocale(), this.getZoteroLocale())
            : null;

        this.loadAddonBundle();
        this.patchServer();
        this.registerEndpoints();
        this.registerPrefPane().catch(function (e) {
            Zotero.logError(e);
        });

        // Repair/update the WPS side after Zotero has finished starting.
        this._installTimer = setTimeout(function () {
            ZoteroWPS._installTimer = null;
            ZoteroWPS.ensureInstalled().catch(function (e) {
                Zotero.logError(e);
            });
        }, 2500);
    },

    shutdown: function () {
        this.clearTxTimer();
        this.restoreKeepDialogRaised();
        this.restoreSendResponse();
        try { Zotero.HTTPIntegrationClient.inProgress = false; } catch (e) {}
        if (this._installTimer) {
            clearTimeout(this._installTimer);
            this._installTimer = null;
        }
        if (this._prefPaneRetry) {
            clearTimeout(this._prefPaneRetry);
            this._prefPaneRetry = null;
        }
        try {
            if (Zotero.getMainWindows) {
                for (let win of Zotero.getMainWindows()) {
                    this.onMainWindowUnload(win);
                }
            }
        }
        catch (e) {}
        this.unregisterEndpoints();
        this.unpatchServer();
        if (this.prefPaneID && Zotero.PreferencePanes) {
            try { Zotero.PreferencePanes.unregister(this.prefPaneID); } catch (e) {}
        }
        if (Zotero.ZoteroWPS === this) {
            delete Zotero.ZoteroWPS;
        }
    },

    getOrCreateToken: function () {
        let token = Zotero.Prefs.get('zotero-wps.token');
        if (typeof token !== 'string' || token.length < 32) {
            token = Zotero.Utilities.randomString(32) + Zotero.Utilities.randomString(32);
            Zotero.Prefs.set('zotero-wps.token', token);
        }
        return token;
    },

    loadI18n: function () {
        try {
            const url = this.rootURI + 'content/i18n.js';
            if (Services.scriptloader.loadSubScriptWithOptions) {
                Services.scriptloader.loadSubScriptWithOptions(url, {
                    target: ZoteroWPSGlobal,
                    ignoreCache: true
                });
            }
            else {
                Services.scriptloader.loadSubScript(url, ZoteroWPSGlobal);
            }
            this.i18n = ZoteroWPSGlobal.ZoteroWPSI18n || null;
        }
        catch (e) {
            Zotero.logError(e);
            this.i18n = null;
        }
    },

    getZoteroLocale: function () {
        if (this.localeOverride && this.localeOverride !== 'auto') {
            return this.localeOverride;
        }
        const candidates = [];
        try {
            if (Services.locale && Services.locale.appLocaleAsBCP47) {
                candidates.push(Services.locale.appLocaleAsBCP47);
            }
        }
        catch (e) {}
        try {
            if (Zotero.locale) {
                candidates.push(Zotero.locale);
            }
        }
        catch (e) {}
        try {
            candidates.push(Zotero.Prefs.get('intl.accept_languages'));
        }
        catch (e) {}
        try {
            if (navigator.languages) {
                candidates.push.apply(candidates, navigator.languages);
            }
            else if (navigator.language) {
                candidates.push(navigator.language);
            }
        }
        catch (e) {}

        let fallback = null;
        for (let candidate of candidates) {
            const normalized = this.i18n && this.i18n.normalizeLocale(candidate);
            if (!normalized) {
                continue;
            }
            if (normalized === 'zh-CN' || normalized === 'zh-TW') {
                return normalized;
            }
            if (!fallback) {
                fallback = normalized;
            }
        }
        return fallback || 'en-US';
    },

    t: function (key, params) {
        if (!this.translator && this.i18n) {
            this.translator = this.i18n.createTranslator(
                this.getZoteroLocale(), this.getZoteroLocale());
        }
        return this.translator ? this.translator.t(key, params) : key;
    },

    getLocale: function () {
        return this.translator ? this.translator.locale : 'en-US';
    },

    setLocale: async function (locale) {
        this.localeOverride = locale || 'auto';
        Zotero.Prefs.set('zotero-wps.locale', this.localeOverride);
        if (this.i18n) {
            this.translator = this.i18n.createTranslator(
                this.getZoteroLocale(), this.getZoteroLocale());
        }
        this.updateMenuLabels();
        try {
            await this.ensureInstalled(true);
        }
        catch (e) {
            Zotero.logError(e);
        }
        return this.getLocale();
    },

    updateMenuLabels: function () {
        try {
            if (!Zotero.getMainWindows) {
                return;
            }
            for (let win of Zotero.getMainWindows()) {
                const item = win.document
                    && win.document.getElementById('zotero-wps-tools-menu');
                if (item) {
                    item.setAttribute('label', this.t('zotero.menu.tools'));
                }
            }
        }
        catch (e) {}
    },

    resetToken: function () {
        const token = Zotero.Utilities.randomString(32) + Zotero.Utilities.randomString(32);
        Zotero.Prefs.set('zotero-wps.token', token);
        this.token = token;
        return token;
    },

    validToken: function (token) {
        if (typeof token !== 'string' || !this.token || token.length !== this.token.length) {
            return false;
        }
        let diff = 0;
        for (let i = 0; i < token.length; i++) {
            diff |= token.charCodeAt(i) ^ this.token.charCodeAt(i);
        }
        return diff === 0;
    },

    loadAddonBundle: function () {
        try {
            const url = this.rootURI + 'content/wps-addon-files.js';
            if (Services.scriptloader.loadSubScriptWithOptions) {
                Services.scriptloader.loadSubScriptWithOptions(url, {
                    target: ZoteroWPSGlobal,
                    ignoreCache: true
                });
            }
            else {
                Services.scriptloader.loadSubScript(url, ZoteroWPSGlobal);
            }
        }
        catch (e) {
            Zotero.logError(e);
        }
        if (!this.addonFiles && ZoteroWPSGlobal.ZOTERO_WPS_ADDON_FILES) {
            this.addonFiles = ZoteroWPSGlobal.ZOTERO_WPS_ADDON_FILES;
        }
        if (!this.addonVersion && ZoteroWPSGlobal.ZOTERO_WPS_ADDON_VERSION) {
            this.addonVersion = ZoteroWPSGlobal.ZOTERO_WPS_ADDON_VERSION;
        }
        if (this.addonFiles && !this.addonVersion) {
            this.addonVersion = this.version;
        }
    },

    /* ---------------------------------------------------------------------
     * HTTP server integration
     * ------------------------------------------------------------------ */

    patchServer: function () {
        if (!Zotero.Server || !Zotero.Server.RequestHandler) {
            return;
        }
        if (this._origGenerateResponse) {
            return;
        }
        const self = this;
        const proto = Zotero.Server.RequestHandler.prototype;
        this._origGenerateResponse = proto._generateResponse;
        proto._generateResponse = function (status, contentTypeOrHeaders, body) {
            let response = self._origGenerateResponse.apply(this, arguments);
            try {
                if (self.isWpsPath(this.pathname) && self.isAllowedOrigin(this.origin)) {
                    if (!/Access-Control-Allow-Origin:/i.test(response)) {
                        const headers = [
                            'Access-Control-Allow-Origin: ' + this.origin,
                            'Access-Control-Allow-Methods: GET, POST, OPTIONS',
                            'Access-Control-Allow-Headers: Content-Type, X-Zotero-WPS-Token',
                            'Access-Control-Allow-Private-Network: true',
                            'Access-Control-Max-Age: 86400',
                            'Vary: Origin'
                        ].join('\r\n');
                        response = response.replace('\r\n\r\n', '\r\n' + headers + '\r\n\r\n');
                    }
                }
            }
            catch (e) {
                Zotero.logError(e);
            }
            return response;
        };
    },

    unpatchServer: function () {
        if (this._origGenerateResponse && Zotero.Server && Zotero.Server.RequestHandler) {
            Zotero.Server.RequestHandler.prototype._generateResponse = this._origGenerateResponse;
        }
        this._origGenerateResponse = null;
    },

    isWpsPath: function (pathname) {
        return typeof pathname === 'string' && pathname.indexOf('/wps/') === 0;
    },

    isAllowedOrigin: function (origin) {
        if (!origin) {
            return false;
        }
        if (origin === 'file://' || origin === 'null') {
            return true;
        }
        return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
    },

    registerEndpoints: function () {
        const self = this;
        this.unregisterEndpoints();

        function Reg(path, definition) {
            Zotero.Server.Endpoints[path] = definition;
            self._endpoints.push([path, definition]);
        }

        Reg('/wps/ping', function () {});
        Zotero.Server.Endpoints['/wps/ping'].prototype = {
            supportedMethods: ['GET', 'POST'],
            supportedDataTypes: '*',
            allowRequestsFromUnsafeWebContent: true,
            init(data, sendResponse) {
                let port = null;
                try { port = Zotero.Server.port; } catch (e) {}
                sendResponse(200, { 'Content-Type': 'application/json' }, JSON.stringify({
                    ok: true,
                    name: 'zotero-wps',
                    version: ZoteroWPS.version,
                    addonVersion: ZoteroWPS.addonVersion || ZoteroWPS.version,
                    zoteroVersion: Zotero.version,
                    port: port,
                    uiLocale: ZoteroWPS.getLocale(),
                    zoteroLocale: ZoteroWPS.getZoteroLocale(),
                    tokenRequired: true
                }));
            }
        };

        Reg('/wps/status', function () {});
        Zotero.Server.Endpoints['/wps/status'].prototype = {
            supportedMethods: ['GET', 'POST'],
            supportedDataTypes: '*',
            allowRequestsFromUnsafeWebContent: true,
            init(data, sendResponse) {
                let port = null;
                try { port = Zotero.Server.port; } catch (e) {}
                sendResponse(200, { 'Content-Type': 'application/json' }, JSON.stringify({
                    inProgress: !!Zotero.HTTPIntegrationClient.inProgress,
                    port: port,
                    version: ZoteroWPS.version
                }));
            }
        };

        Reg('/wps/execCommand', function () {});
        Zotero.Server.Endpoints['/wps/execCommand'].prototype = {
            supportedMethods: ['POST'],
            supportedDataTypes: ['application/json'],
            allowRequestsFromUnsafeWebContent: true,
            init(data, sendResponse) {
                data = ZoteroWPS.parseBody(data);
                if (!ZoteroWPS.validToken(data && data.token)) {
                    sendResponse(403, 'text/plain', 'Invalid token');
                    return;
                }
                if (!data.command || !data.docId) {
                    sendResponse(400, 'text/plain', 'Missing command or docId');
                    return;
                }
                if (Zotero.HTTPIntegrationClient.inProgress) {
                    sendResponse(503, 'text/plain', 'Integration transaction is already in progress');
                    return;
                }

                ZoteroWPS.applyKeepDialogRaised();
                Zotero.HTTPIntegrationClient.inProgress = true;
                ZoteroWPS.setSendResponse(sendResponse);

                try {
                    const result = Zotero.Integration.execCommand('http', data.command, data.docId);
                    if (result && result.catch) {
                        result.catch(function (e) {
                            Zotero.logError(e);
                            Zotero.HTTPIntegrationClient.inProgress = false;
                            ZoteroWPS.clearTxTimer();
                            ZoteroWPS.restoreKeepDialogRaised();
                            ZoteroWPS.restoreSendResponse();
                            try {
                                sendResponse(500, 'text/plain', 'Zotero integration error: ' + e.message);
                            }
                            catch (err) {}
                        });
                    }
                }
                catch (e) {
                    Zotero.logError(e);
                    Zotero.HTTPIntegrationClient.inProgress = false;
                    ZoteroWPS.restoreKeepDialogRaised();
                    ZoteroWPS.restoreSendResponse();
                    sendResponse(500, 'text/plain', 'Zotero integration error: ' + e.message);
                }
            }
        };

        Reg('/wps/respond', function () {});
        Zotero.Server.Endpoints['/wps/respond'].prototype = {
            supportedMethods: ['POST'],
            supportedDataTypes: ['application/json'],
            allowRequestsFromUnsafeWebContent: true,
            init(data, sendResponse) {
                data = ZoteroWPS.parseBody(data);
                if (!ZoteroWPS.validToken(data && data.token)) {
                    sendResponse(403, 'text/plain', 'Invalid token');
                    return;
                }
                if (!Zotero.HTTPIntegrationClient.inProgress
                        || !Zotero.HTTPIntegrationClient.deferredResponse) {
                    sendResponse(409, 'text/plain', 'No integration transaction in progress');
                    return;
                }

                const payload = data.payload;
                ZoteroWPS.setSendResponse(sendResponse);
                try {
                    if (payload && payload.error) {
                        let error;
                        if (payload.error === 'Alert') {
                            error = new Zotero.Exception.Alert(payload.message || '');
                        }
                        else {
                            error = new Error(payload.message || payload.error);
                        }
                        error.stack = payload.stack || '';
                        Zotero.HTTPIntegrationClient.deferredResponse.reject(error);
                    }
                    else {
                        Zotero.HTTPIntegrationClient.deferredResponse.resolve(payload);
                    }
                }
                catch (e) {
                    Zotero.logError(e);
                    try {
                        sendResponse(500, 'text/plain', 'Failed to process response: ' + e.message);
                    }
                    catch (err) {}
                }
            }
        };

        Reg('/wps/layout', function () {});
        Zotero.Server.Endpoints['/wps/layout'].prototype = {
            supportedMethods: ['POST'],
            supportedDataTypes: ['application/json'],
            allowRequestsFromUnsafeWebContent: true,
            init(data, sendResponse) {
                data = ZoteroWPS.parseBody(data);
                if (!ZoteroWPS.validToken(data && data.token)) {
                    sendResponse(403, 'text/plain', 'Invalid token');
                    return;
                }
                const layout = data && data.layout;
                if (!['current', 'endnote', 'zotero'].includes(layout)) {
                    sendResponse(400, 'text/plain', 'Invalid layout');
                    return;
                }
                ZoteroWPS.setRibbonLayout(layout).then(function () {
                    sendResponse(200, 'application/json', JSON.stringify({
                        ok: true,
                        layout: layout
                    }));
                }).catch(function (e) {
                    Zotero.logError(e);
                    try {
                        sendResponse(500, 'text/plain', 'Failed to change layout: ' + e.message);
                    }
                    catch (err) {}
                });
            }
        };

        Reg('/wps/reset', function () {});
        Zotero.Server.Endpoints['/wps/reset'].prototype = {
            supportedMethods: ['POST'],
            supportedDataTypes: ['application/json'],
            allowRequestsFromUnsafeWebContent: true,
            init(data, sendResponse) {
                data = ZoteroWPS.parseBody(data);
                if (!ZoteroWPS.validToken(data && data.token)) {
                    sendResponse(403, 'text/plain', 'Invalid token');
                    return;
                }
                ZoteroWPS.forceReset();
                sendResponse(200, 'application/json', JSON.stringify({ ok: true }));
            }
        };
    },

    unregisterEndpoints: function () {
        for (let entry of this._endpoints) {
            if (Zotero.Server.Endpoints[entry[0]] === entry[1]) {
                delete Zotero.Server.Endpoints[entry[0]];
            }
        }
        this._endpoints = [];
    },

    parseBody: function (data) {
        if (typeof data === 'string') {
            try { return JSON.parse(data); } catch (e) { return null; }
        }
        return data;
    },

    applyKeepDialogRaised: function () {
        if (this._keepRaisedApplied) {
            return;
        }
        try {
            this._origKeepRaised = Zotero.Prefs.get('integration.keepAddCitationDialogRaised');
            const value = Zotero.Prefs.get('zotero-wps.keepDialogRaised') !== false;
            Zotero.Prefs.set('integration.keepAddCitationDialogRaised', value);
            this._keepRaisedApplied = true;
        }
        catch (e) {
            Zotero.logError(e);
        }
    },

    restoreKeepDialogRaised: function () {
        if (!this._keepRaisedApplied) {
            return;
        }
        try {
            if (typeof this._origKeepRaised === 'undefined') {
                Zotero.Prefs.clear('integration.keepAddCitationDialogRaised');
            }
            else {
                Zotero.Prefs.set('integration.keepAddCitationDialogRaised', this._origKeepRaised);
            }
        }
        catch (e) {
            Zotero.logError(e);
        }
        this._keepRaisedApplied = false;
        this._origKeepRaised = undefined;
    },

    restoreSendResponse: function () {
        if (!this._sendResponsePatched) {
            return;
        }
        try {
            if (typeof this._origSendResponse === 'undefined') {
                delete Zotero.HTTPIntegrationClient.sendResponse;
            }
            else {
                Zotero.HTTPIntegrationClient.sendResponse = this._origSendResponse;
            }
        }
        catch (e) {
            Zotero.logError(e);
        }
        this._origSendResponse = undefined;
        this._sendResponsePatched = false;
    },

    setSendResponse: function (sendResponse) {
        if (!this._sendResponsePatched) {
            this._origSendResponse = Zotero.HTTPIntegrationClient.sendResponse;
            this._sendResponsePatched = true;
        }
        this._pendingSendResponse = sendResponse;
        Zotero.HTTPIntegrationClient.sendResponse = function () {
            ZoteroWPS._pendingSendResponse = null;
            const result = sendResponse.apply(null, arguments);
            let body = arguments[2];
            if (typeof body === 'string' && body.indexOf('"Document.complete"') >= 0) {
                ZoteroWPS.clearTxTimer();
                ZoteroWPS.restoreKeepDialogRaised();
                ZoteroWPS.restoreSendResponse();
            }
            else {
                // Keep a watchdog running while Zotero waits for WPS to
                // process a command. Without this, a WPS crash between
                // receiving a command and sending /wps/respond would leave
                // the integration transaction stuck indefinitely.
                ZoteroWPS.startTxTimer();
            }
            return result;
        };
        this.startTxTimer();
    },

    startTxTimer: function () {
        this.clearTxTimer();
        // A citation dialog can stay open for a long time, but a stuck
        // transaction should eventually release the HTTP client and unblock
        // WPS with a real response instead of leaving its XHR hanging.
        this._txTimer = setTimeout(function () {
            ZoteroWPS.forceReset('Zotero WPS Bridge transaction timed out');
            try { Zotero.debug('Zotero WPS Bridge: transaction timed out'); } catch (e) {}
        }, 2 * 60 * 60 * 1000);
    },

    forceReset: function (message) {
        this.clearTxTimer();
        const pending = this._pendingSendResponse;
        this._pendingSendResponse = null;
        if (pending) {
            try {
                pending(504, 'text/plain', message || 'Zotero WPS Bridge transaction reset');
            }
            catch (e) {}
        }
        Zotero.HTTPIntegrationClient.inProgress = false;
        Zotero.HTTPIntegrationClient.deferredResponse = null;
        this.restoreKeepDialogRaised();
        this.restoreSendResponse();
        // Recover from a WPS process that disappeared while Zotero was waiting
        // for a response. Without this, every subsequent command is rejected
        // as "already in progress".
        try {
            if (Zotero.Integration.currentWindow
                    && !Zotero.Integration.currentWindow.closed) {
                Zotero.Integration.currentWindow.close();
            }
            Zotero.Integration.currentDoc = false;
            Zotero.Integration.currentWindow = false;
            Zotero.Integration.currentSession = null;
            Zotero.Integration.currentCommandPromise = Promise.resolve();
        }
        catch (e) {
            Zotero.logError(e);
        }
    },

    clearTxTimer: function () {
        if (this._txTimer) {
            clearTimeout(this._txTimer);
            this._txTimer = null;
        }
    },

    /* ---------------------------------------------------------------------
     * Preferences / menu
     * ------------------------------------------------------------------ */

    registerPrefPane: async function () {
        if (!Zotero.PreferencePanes) {
            this.schedulePrefPaneRetry();
            return;
        }
        try {
            this.prefPaneID = await Zotero.PreferencePanes.register({
                pluginID: this.id,
                src: this.rootURI + 'content/preferences.xhtml',
                id: 'zotero-prefpane-zotero-wps',
                label: 'WPS',
                image: this.rootURI + 'content/wps.svg',
                scripts: [
                    this.rootURI + 'content/i18n.js',
                    this.rootURI + 'content/preferences.js'
                ],
                stylesheets: [this.rootURI + 'content/preferences.css']
            });
            this._prefPaneRetries = 0;
        }
        catch (e) {
            Zotero.logError(e);
            this.schedulePrefPaneRetry();
        }
    },

    schedulePrefPaneRetry: function () {
        if (this._prefPaneRetry || this._prefPaneRetries >= 3) {
            return;
        }
        this._prefPaneRetries++;
        this._prefPaneRetry = setTimeout(function () {
            ZoteroWPS._prefPaneRetry = null;
            ZoteroWPS.registerPrefPane().catch(function (e) {
                Zotero.logError(e);
            });
        }, 2500);
    },

    openPreferences: function () {
        try {
            Zotero.Utilities.Internal.openPreferences(this.prefPaneID || 'zotero-prefpane-zotero-wps');
        }
        catch (e) {
            Zotero.logError(e);
        }
    },

    onMainWindowLoad: function (win) {
        if (!win || !win.document || this._windows.has(win)) {
            return;
        }
        const doc = win.document;
        const menu = doc.getElementById('menu_ToolsPopup');
        if (!menu) {
            return;
        }
        let item = doc.getElementById('zotero-wps-tools-menu');
        if (!item) {
            item = doc.createXULElement('menuitem');
            item.id = 'zotero-wps-tools-menu';
            item.setAttribute('label', this.t('zotero.menu.tools'));
            item.addEventListener('command', function () {
                ZoteroWPS.openPreferences();
            });
            menu.appendChild(item);
            this._windows.add(win);
        }
    },

    onMainWindowUnload: function (win) {
        if (!win || !win.document) {
            return;
        }
        const item = win.document.getElementById('zotero-wps-tools-menu');
        if (item && item.parentNode) {
            item.parentNode.removeChild(item);
        }
        this._windows.delete(win);
    },

    /* ---------------------------------------------------------------------
     * WPS add-in installation
     * ------------------------------------------------------------------ */

    getHome: function () {
        return PathUtils.homeDir || Services.dirsvc.get('Home', Components.interfaces.nsIFile).path;
    },

    getEnv: function (name) {
        try {
            return Services.env.get(name) || '';
        }
        catch (e) {
            return '';
        }
    },

    getAddonDirs: async function () {
        const home = this.getHome();
        const candidates = [];
        if (Zotero.isWin) {
            const appData = this.getEnv('APPDATA');
            if (appData) {
                candidates.push(PathUtils.join(appData, 'kingsoft', 'wps', 'jsaddons'));
                candidates.push(PathUtils.join(appData, 'Kingsoft', 'wps', 'jsaddons'));
            }
        }
        else if (Zotero.isMac) {
            candidates.push(PathUtils.join(home, 'Library', 'Containers',
                'com.kingsoft.wpsoffice.mac', 'Data', '.local', 'share', 'Kingsoft', 'wps', 'jsaddons'));
            candidates.push(PathUtils.join(home, 'Library', 'Containers',
                'com.kingsoft.wpsoffice.mac', 'Data', '.kingsoft', 'wps', 'jsaddons'));
            candidates.push(PathUtils.join(home, '.local', 'share', 'Kingsoft', 'wps', 'jsaddons'));
            candidates.push(PathUtils.join(home, '.kingsoft', 'wps', 'jsaddons'));
        }
        else {
            const xdg = this.getEnv('XDG_DATA_HOME');
            if (xdg) {
                candidates.push(PathUtils.join(xdg, 'Kingsoft', 'wps', 'jsaddons'));
            }
            candidates.push(PathUtils.join(home, '.local', 'share', 'Kingsoft', 'wps', 'jsaddons'));
            candidates.push(PathUtils.join(home, '.kingsoft', 'wps', 'jsaddons'));
        }

        const result = [];
        const seen = new Set();
        for (let dir of candidates) {
            if (seen.has(dir)) {
                continue;
            }
            seen.add(dir);
            try {
                if (await IOUtils.exists(dir)) {
                    result.push(dir);
                }
            }
            catch (e) {}
        }
        return result;
    },

    readText: async function (path) {
        try {
            if (!(await IOUtils.exists(path))) {
                return null;
            }
            return await IOUtils.readUTF8(path);
        }
        catch (e) {
            return null;
        }
    },

    getInstalledVersion: async function (dir) {
        try {
            const names = await IOUtils.getChildren(dir);
            let best = null;
            for (let name of names) {
                const base = PathUtils.filename(name);
                const match = /^zotero-wps_(.+)$/.exec(base);
                if (!match) {
                    continue;
                }
                if (!best || this.compareVersions(match[1], best) > 0) {
                    best = match[1];
                }
            }
            return best;
        }
        catch (e) {
            return null;
        }
    },

    isInstalledComplete: async function (dir, version) {
        if (!version) {
            return false;
        }
        const target = PathUtils.join(dir, 'zotero-wps_' + version);
        const required = [
            'manifest.xml',
            'ribbon.xml',
            'dialog.html',
            'js/app.js',
            'js/config.js',
            'js/i18n.js',
            'js/protocol.js',
            'js/util.js',
            'js/richtext.js',
            'js/doc.js',
            'js/zotero.js'
        ];
        try {
            for (let relative of required) {
                const full = PathUtils.join.apply(
                    PathUtils, [target].concat(relative.split('/')));
                if (!(await IOUtils.exists(full))) {
                    return false;
                }
            }
            return true;
        }
        catch (e) {
            return false;
        }
    },

    compareVersions: function (a, b) {
        const left = String(a).split('.').map(Number);
        const right = String(b).split('.').map(Number);
        for (let i = 0; i < Math.max(left.length, right.length); i++) {
            const x = left[i] || 0;
            const y = right[i] || 0;
            if (x !== y) {
                return x - y;
            }
        }
        return 0;
    },

    b64ToBytes: function (base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    },

    install: async function () {
        const dirs = await this.getAddonDirs();
        if (!dirs.length) {
            throw new Error(this.t('zotero.error.noWpsDir'));
        }
        const installed = [];
        for (let dir of dirs) {
            installed.push(await this.installToDir(dir));
        }
        return installed;
    },

    installToDir: async function (dir) {
        if (!this.addonFiles) {
            this.loadAddonBundle();
        }
        if (!this.addonFiles) {
            throw new Error(this.t('zotero.error.missingBundle'));
        }
        const version = this.version;
        const target = PathUtils.join(dir, 'zotero-wps_' + version);

        const names = await IOUtils.getChildren(dir).catch(function () { return []; });
        for (let name of names) {
            const base = PathUtils.filename(name);
            if (/^zotero-wps_/.test(base) && base !== 'zotero-wps_' + version) {
                try {
                    await IOUtils.remove(PathUtils.join(dir, base), {
                        recursive: true,
                        ignoreAbsent: true
                    });
                }
                catch (e) {
                    Zotero.logError(e);
                }
            }
        }
        try {
            await IOUtils.remove(target, { recursive: true, ignoreAbsent: true });
        }
        catch (e) {}

        await IOUtils.makeDirectory(target, { createAncestors: true, ignoreExisting: true });
        for (let relativePath of Object.keys(this.addonFiles)) {
            if (relativePath === 'js/config.js' || relativePath === 'ribbon.xml') {
                continue;
            }
            const fullPath = PathUtils.join.apply(PathUtils, [target].concat(relativePath.split('/')));
            await IOUtils.makeDirectory(PathUtils.parent(fullPath), {
                createAncestors: true,
                ignoreExisting: true
            });
            await IOUtils.write(fullPath, this.b64ToBytes(this.addonFiles[relativePath]));
        }

        await this.writeRibbon(target);
        await this.writeConfig(target);
        await this.updateRegistries(dir);

        Zotero.debug('Zotero WPS Bridge: installed WPS add-in to ' + target);
        return target;
    },

    escapeXml: function (value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    },

    getRibbonLayout: function () {
        const layout = Zotero.Prefs.get('zotero-wps.ribbonLayout') || 'current';
        return ['current', 'endnote', 'zotero'].includes(layout) ? layout : 'current';
    },

    setRibbonLayout: async function (layout) {
        if (!['current', 'endnote', 'zotero'].includes(layout)) {
            layout = 'current';
        }
        Zotero.Prefs.set('zotero-wps.ribbonLayout', layout);
        await this.ensureInstalled(true);
        return layout;
    },

    getRibbonText: function (key, field, layout) {
        if (layout && layout !== 'current') {
            const layoutKey = 'wps.ribbon.' + key + '.' + layout + '.' + field;
            const value = this.t(layoutKey);
            if (value && value.indexOf('wps.ribbon.') !== 0) {
                return value;
            }
        }
        return this.t('wps.ribbon.' + key + '.' + field);
    },

    localizeRibbonXml: function (xml, layout) {
        if (!xml || !this.i18n) {
            return xml;
        }
        for (let id of Object.keys(this.ribbonKeys)) {
            const key = this.ribbonKeys[id];
            const label = this.escapeXml(this.getRibbonText(key, 'label', layout));
            const labelRe = new RegExp(
                '(<(?:tab|group|button)\\b[^>]*\\bid="' + id + '"[^>]*?)label="[^"]*"'
            );
            xml = xml.replace(labelRe, '$1label="' + label + '"');

            const tip = this.getRibbonText(key, 'tip', layout);
            if (tip && tip.indexOf('wps.ribbon.') !== 0) {
                const tipRe = new RegExp(
                    '(<button\\b[^>]*\\bid="' + id + '"[^>]*?)supertip="[^"]*"'
                );
                xml = xml.replace(tipRe, '$1supertip="' + this.escapeXml(tip) + '"');
            }
        }
        return xml;
    },

    writeRibbon: async function (target) {
        const layout = this.getRibbonLayout();
        const file = layout === 'endnote'
            ? 'ribbon-endnote.xml'
            : layout === 'zotero'
                ? 'ribbon-zotero.xml'
                : 'ribbon.xml';
        if (!this.addonFiles || !this.addonFiles[file]) {
            return;
        }
        const bytes = this.b64ToBytes(this.addonFiles[file]);
        let xml;
        try {
            xml = new TextDecoder('utf-8').decode(bytes);
        }
        catch (e) {
            try {
                xml = decodeURIComponent(escape(atob(this.addonFiles[file])));
            }
            catch (err) {
                return;
            }
        }
        const localized = this.localizeRibbonXml(xml, layout);
        await IOUtils.writeUTF8(PathUtils.join(target, 'ribbon.xml'), localized);
    },

    writeConfig: async function (target) {
        let port = 23119;
        try { port = Zotero.Server.port || port; } catch (e) {}
        const config = '/* Generated by Zotero WPS Bridge. Do not edit. */\n'
            + 'window.ZOTERO_WPS_CONFIG = '
            + JSON.stringify({
                port: port,
                token: this.token,
                locale: this.getLocale(),
                ribbonLayout: this.getRibbonLayout(),
                addonVersion: this.version
            }, null, 4)
            + ';\n';
        const path = PathUtils.join(target, 'js', 'config.js');
        await IOUtils.makeDirectory(PathUtils.parent(path), {
            createAncestors: true,
            ignoreExisting: true
        });
        await IOUtils.writeUTF8(path, config);
        try {
            // Keep the access token readable only by the current user.
            await IOUtils.setPermissions(path, 0o600);
        }
        catch (e) {
            // Windows and some filesystems don't support POSIX modes.
        }
    },

    updateRegistries: async function (dir) {
        const version = this.version;
        await this.updateRegistryFile(
            PathUtils.join(dir, 'publish.xml'),
            'jsplugins',
            'jsplugin',
            '<jsplugin name="zotero-wps" type="wps" url="zotero-wps_' + version
                + '" version="' + version + '" enable="enable_dev" install="null" customDomain=""/>',
            'zotero-wps'
        );
        await this.updateRegistryFile(
            PathUtils.join(dir, 'jsplugins.xml'),
            'jsplugins',
            'jsplugin',
            '<jsplugin name="zotero-wps" type="wps" url="zotero-wps_' + version
                + '" version="' + version + '"/>',
            'zotero-wps'
        );
        await this.updateRegistryFile(
            PathUtils.join(dir, 'authwebsite.xml'),
            'websites',
            'website',
            '<website origin="null" name="zotero-wps" status="enable"/>',
            'zotero-wps'
        );
    },

    updateRegistryFile: async function (path, rootTag, itemTag, itemXml, nameValue) {
        let xml = await this.readText(path);
        if (xml == null || !xml.trim()) {
            xml = '<?xml version="1.0" encoding="UTF-8"?>\n<' + rootTag + '>\n</' + rootTag + '>\n';
        }
        const rootOpen = '<' + rootTag;
        const rootClose = '</' + rootTag + '>';
        if (xml.indexOf(rootOpen) < 0 || xml.lastIndexOf(rootClose) < 0) {
            throw new Error(this.t('zotero.error.invalidConfig', { path: path }));
        }
        const escaped = String(nameValue).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const entryRe = new RegExp(
            '\\s*<' + itemTag + '\\b[^>]*\\bname\\s*=\\s*["\\\']' + escaped
                + '["\\\'][^>]*(?:/>|>[\\s\\S]*?</' + itemTag + '>)',
            'g'
        );
        xml = xml.replace(entryRe, '');
        const closeIndex = xml.lastIndexOf(rootClose);
        xml = xml.slice(0, closeIndex)
            + '    ' + itemXml + '\n'
            + xml.slice(closeIndex);
        await IOUtils.writeUTF8(path, xml);
    },

    removeRegistryEntry: async function (path, rootTag, itemTag, nameValue) {
        let xml = await this.readText(path);
        if (xml == null) {
            return;
        }
        const escaped = String(nameValue).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const entryRe = new RegExp(
            '\\s*<' + itemTag + '\\b[^>]*\\bname\\s*=\\s*["\\\']' + escaped
                + '["\\\'][^>]*(?:/>|>[\\s\\S]*?</' + itemTag + '>)',
            'g'
        );
        const updated = xml.replace(entryRe, '');
        if (updated !== xml) {
            await IOUtils.writeUTF8(path, updated);
        }
    },

    ensureInstalled: async function (force) {
        if (!force && Zotero.Prefs.get('zotero-wps.autoInstall') === false) {
            return;
        }
        const dirs = await this.getAddonDirs();
        if (!dirs.length) {
            return;
        }
        for (let dir of dirs) {
            const installedVersion = await this.getInstalledVersion(dir);
            const complete = await this.isInstalledComplete(dir, installedVersion);
            if (installedVersion !== this.version || !complete) {
                await this.installToDir(dir);
            }
            else {
                const target = PathUtils.join(dir, 'zotero-wps_' + this.version);
                await this.writeRibbon(target);
                await this.writeConfig(target);
                await this.updateRegistries(dir);
            }
        }
    },

    uninstall: async function () {
        const dirs = await this.getAddonDirs();
        for (let dir of dirs) {
            const names = await IOUtils.getChildren(dir).catch(function () { return []; });
            for (let name of names) {
                const base = PathUtils.filename(name);
                if (/^zotero-wps_/.test(base)) {
                    await IOUtils.remove(PathUtils.join(dir, base), {
                        recursive: true,
                        ignoreAbsent: true
                    });
                }
            }
            await this.removeRegistryEntry(
                PathUtils.join(dir, 'publish.xml'), 'jsplugins', 'jsplugin', 'zotero-wps');
            await this.removeRegistryEntry(
                PathUtils.join(dir, 'jsplugins.xml'), 'jsplugins', 'jsplugin', 'zotero-wps');
            await this.removeRegistryEntry(
                PathUtils.join(dir, 'authwebsite.xml'), 'websites', 'website', 'zotero-wps');
            await this.cleanupAuthAddin(dir);
        }
    },

    cleanupAuthAddin: async function (dir) {
        const path = PathUtils.join(dir, 'authaddin.json');
        const raw = await this.readText(path);
        if (!raw) {
            return;
        }
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch (e) {
            return;
        }
        for (let section of ['wps', 'wpp', 'et']) {
            const group = data[section];
            if (!group || typeof group !== 'object') {
                continue;
            }
            const keep = [];
            for (let key of Object.keys(group)) {
                if (key === 'namelist') {
                    continue;
                }
                const item = group[key];
                const name = item && item.name;
                const itemPath = item && item.path;
                if (name === 'zotero-wps'
                        || (typeof itemPath === 'string' && itemPath.indexOf('zotero-wps_') >= 0)) {
                    delete group[key];
                }
                else {
                    keep.push(key);
                }
            }
            group.namelist = keep.join(';');
        }
        try {
            await IOUtils.writeUTF8(path, JSON.stringify(data, null, 4) + '\n');
        }
        catch (e) {
            Zotero.logError(e);
        }
    },

    getStatus: async function () {
        const dirs = await this.getAddonDirs();
        const details = [];
        for (let dir of dirs) {
            const foundVersion = await this.getInstalledVersion(dir);
            const complete = await this.isInstalledComplete(dir, foundVersion);
            details.push({
                path: dir,
                installedVersion: complete ? foundVersion : null,
                partialVersion: !complete ? foundVersion : null,
                expectedVersion: this.version
            });
        }
        let port = null;
        try { port = Zotero.Server.port; } catch (e) {}
        const token = this.token || '';
        return {
            version: this.version,
            addonVersion: this.addonVersion || this.version,
            port: port,
            dirs: details,
            autoInstall: Zotero.Prefs.get('zotero-wps.autoInstall') !== false,
            keepDialogRaised: Zotero.Prefs.get('zotero-wps.keepDialogRaised') !== false,
            ribbonLayout: this.getRibbonLayout(),
            tokenMasked: token ? token.substring(0, 6) + '…' + token.substring(token.length - 4) : '',
            locale: this.localeOverride || 'auto',
            uiLocale: this.getLocale(),
            inProgress: !!Zotero.HTTPIntegrationClient.inProgress
        };
    }
};
