/* Zotero bootstrap entry point. */
var ZoteroWPS = null;

function install() {}

function startup(data) {
    if (!ZoteroWPS) {
        const url = data.rootURI + 'content/zotero-wps.js';
        if (Services.scriptloader.loadSubScriptWithOptions) {
            Services.scriptloader.loadSubScriptWithOptions(url, {
                target: this,
                ignoreCache: true
            });
        }
        else {
            Services.scriptloader.loadSubScript(url, this);
        }
    }
    if (ZoteroWPS) {
        ZoteroWPS.startup(data);
    }
}

function shutdown(data, reason) {
    if (reason === APP_SHUTDOWN) {
        return;
    }
    if (ZoteroWPS) {
        ZoteroWPS.shutdown();
        ZoteroWPS = null;
    }
}

function uninstall() {}

function onMainWindowLoad(data) {
    if (ZoteroWPS) {
        ZoteroWPS.onMainWindowLoad(data && data.window);
    }
}

function onMainWindowUnload(data) {
    if (ZoteroWPS) {
        ZoteroWPS.onMainWindowUnload(data && data.window);
    }
}
