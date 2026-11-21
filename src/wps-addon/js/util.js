/* Small helpers shared by the WPS add-in. */
(function () {
    'use strict';

    let translator = null;

    const WPS_ENUM_FALLBACK = {
        wdCollapseEnd: 0,
        wdCollapseStart: 1,
        wdCharacter: 1,
        wdParagraph: 4,
        wdLineBreak: 6,
        wdFieldAddin: 81,
        msoPropertyTypeString: 4,
        wdAlignTabLeft: 0,
        wdStyleHeading1: -2,
        wdStyleHeading2: -3,
        wdStyleHeading3: -4,
        wdStyleHeading4: -5,
        wdYellow: 7,
        wdBlue: 2,
        wdPink: 5,
        wdViolet: 12,
        wdGreen: 11,
        wdDarkYellow: 14,
        wdRed: 6,
        wdGray50: 15
    };

    function ensureWpsEnvironment() {
        if (typeof wps === 'undefined') {
            throw new Error(t('wps.alert.envMissing'));
        }
        if (!wps.Enum) {
            wps.Enum = WPS_ENUM_FALLBACK;
        }
    }

    function getSystemLocale() {
        try {
            if (typeof wps !== 'undefined' && wps.Env) {
                const names = [
                    'GetLanguage', 'GetUILanguage', 'GetApplicationLanguage',
                    'GetLocale', 'GetLanguageName'
                ];
                for (let name of names) {
                    if (typeof wps.Env[name] === 'function') {
                        const value = wps.Env[name]();
                        if (value) {
                            return value;
                        }
                    }
                }
            }
        }
        catch (e) {}
        try {
            if (typeof navigator !== 'undefined') {
                return (navigator.languages && navigator.languages[0])
                    || navigator.language || '';
            }
        }
        catch (e) {}
        return 'en-US';
    }

    function initI18n() {
        const i18n = window.ZoteroWPSI18n;
        if (!i18n) {
            translator = {
                locale: 'en-US',
                t: function (key) { return key; }
            };
            return;
        }
        const config = getConfig();
        const detected = getSystemLocale();
        const preferred = config.locale && config.locale !== 'auto'
            ? config.locale
            : detected;
        translator = i18n.createTranslator(preferred, detected);
    }

    function t(key, params) {
        if (!translator) {
            initI18n();
        }
        return translator.t(key, params);
    }

    function getLocale() {
        if (!translator) {
            initI18n();
        }
        return translator.locale;
    }

    function getApp() {
        ensureWpsEnvironment();
        if (typeof Application !== 'undefined' && Application && Application.ActiveDocument) {
            return Application;
        }
        if (wps.WpsApplication) {
            return wps.WpsApplication();
        }
        throw new Error(t('wps.alert.appMissing'));
    }

    function getActiveDocument() {
        const app = getApp();
        const doc = app.ActiveDocument;
        if (!doc) {
            throw new Error(t('wps.alert.noDocument'));
        }
        return doc;
    }

    function alertUser(message, title) {
        alert((title ? title + '\n\n' : '') + message);
    }

    function confirmUser(message, title) {
        return confirm((title ? title + '\n\n' : '') + message);
    }

    function parseXML(text) {
        if (!text) {
            return null;
        }
        try {
            const doc = new DOMParser().parseFromString(text, 'text/xml');
            if (doc.getElementsByTagName('parsererror').length) {
                return null;
            }
            return doc;
        }
        catch (e) {
            return null;
        }
    }

    function parseHTML(text) {
        if (!text) {
            return null;
        }
        try {
            return new DOMParser().parseFromString(text, 'text/html');
        }
        catch (e) {
            return null;
        }
    }

    function escapeHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function parseColor(value) {
        if (!value) {
            return null;
        }
        const text = String(value).trim();
        let match = /^#([0-9a-f]{6})$/i.exec(text);
        if (match) {
            return parseInt(match[1], 16);
        }
        match = /^#([0-9a-f]{3})$/i.exec(text);
        if (match) {
            const c = match[1];
            return parseInt(c.charAt(0) + c.charAt(0)
                + c.charAt(1) + c.charAt(1)
                + c.charAt(2) + c.charAt(2), 16);
        }
        match = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(text);
        if (match) {
            return (parseInt(match[1], 10) << 16)
                | (parseInt(match[2], 10) << 8)
                | parseInt(match[3], 10);
        }
        match = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\)$/i.exec(text);
        if (match) {
            return (parseInt(match[1], 10) << 16)
                | (parseInt(match[2], 10) << 8)
                | parseInt(match[3], 10);
        }
        return null;
    }

    function rgbToBgr(rgb) {
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = rgb & 0xff;
        return (b << 16) | (g << 8) | r;
    }

    function twip2pt(twip) {
        return Number(twip || 0) * 0.05;
    }

    function pt2twip(pt) {
        return Math.round(Number(pt || 0) * 20);
    }

    function cm2pt(cm) {
        return Number(cm || 0) * 28.3464567;
    }

    function assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    /**
     * Simple JSON POST. Synchronous by default because the WPS object model is
     * not safe to drive from multiple event-loop turns while a citation dialog
     * is open.
     */
    function postJSON(url, payload, options) {
        options = options || {};
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, options.async ? true : false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        if (options.token) {
            xhr.setRequestHeader('X-Zotero-WPS-Token', options.token);
        }
        try {
            xhr.send(JSON.stringify(payload));
        }
        catch (e) {
            const error = new Error(t('wps.alert.network'));
            error.cause = e;
            error.isNetworkError = true;
            throw error;
        }
        let json = null;
        try {
            json = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        }
        catch (e) {
            json = null;
        }
        return { status: xhr.status, text: xhr.responseText, json: json };
    }

    function getURLBase() {
        const cfg = (typeof window !== 'undefined' && window.ZOTERO_WPS_CONFIG) || {};
        const port = Number(cfg.port) || 23119;
        return 'http://127.0.0.1:' + port;
    }

    function getConfig() {
        return (typeof window !== 'undefined' && window.ZOTERO_WPS_CONFIG) || {};
    }

    function debug() {
        try {
            const args = Array.prototype.slice.call(arguments);
            console.log.apply(console, ['[Zotero WPS Bridge]'].concat(args));
        }
        catch (e) {}
    }

    initI18n();

    window.ZoteroWPSUtil = {
        WPS_ENUM_FALLBACK,
        t,
        getLocale,
        initI18n,
        getSystemLocale,
        ensureWpsEnvironment,
        getApp,
        getActiveDocument,
        alertUser,
        confirmUser,
        parseXML,
        parseHTML,
        escapeHtml,
        parseColor,
        rgbToBgr,
        twip2pt,
        pt2twip,
        cm2pt,
        assert,
        sleep,
        postJSON,
        getURLBase,
        getConfig,
        debug
    };
})();
