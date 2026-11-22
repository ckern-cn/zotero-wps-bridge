'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const I = require(path.join(ROOT, 'src', 'shared', 'i18n.js'));

function loadPlugin(globals) {
    const source = fs.readFileSync(
        path.join(ROOT, 'src', 'zotero-plugin', 'content', 'zotero-wps.js'), 'utf8');
    const context = vm.createContext(Object.assign({ console }, globals || {}));
    vm.runInContext(source, context, {
        filename: 'zotero-wps.js'
    });
    return context.ZoteroWPS;
}

test('plugin object loads without Zotero globals and keeps ribbon UI text in sync', () => {
    const plugin = loadPlugin();
    assert.ok(plugin);
    plugin.i18n = I;
    plugin.translator = I.createTranslator('zh-CN', 'zh-CN');

    assert.equal(plugin.getLocale(), 'zh-CN');
    assert.equal(plugin.getRibbonText('addEditCitation', 'label', 'current'),
        '插入/编辑引文');
    assert.equal(plugin.getRibbonText('addEditCitation', 'label', 'endnote'),
        '插入引文');
    assert.equal(plugin.getRibbonText('addEditCitation', 'tip', 'endnote'),
        '在光标处插入引文。');
    assert.equal(plugin.getRibbonText('about', 'tip', 'endnote'),
        I.messages['zh-CN']['wps.ribbon.about.tip']);
});

test('automatic locale prefers the visible Chinese UI over a reported en-US locale', () => {
    const plugin = loadPlugin({
        Zotero: {
            locale: 'en-US',
            Prefs: { get: () => 'zh-CN, en-US' }
        },
        Services: { locale: { appLocaleAsBCP47: 'en-US' } },
        navigator: { languages: ['zh-CN', 'en-US'], language: 'zh-CN' }
    });
    plugin.i18n = I;
    plugin.localeOverride = 'auto';
    assert.equal(plugin.getZoteroLocale(), 'zh-CN');

    plugin.localeOverride = 'en-US';
    assert.equal(plugin.getZoteroLocale(), 'en-US');
});

test('ribbon localization replaces labels and supertips only for mapped IDs', () => {
    const plugin = loadPlugin();
    plugin.i18n = I;
    plugin.translator = I.createTranslator('zh-CN', 'zh-CN');
    const xml = [
        '<tab id="zoteroTab" label="Zotero">',
        '<button id="btnAddEditCitation" label="Add/Edit Citation"',
        ' supertip="Insert a citation."/>',
        '<button id="unknownButton" label="Keep me" supertip="Keep tip"/>',
        '</tab>'
    ].join('');
    const localized = plugin.localizeRibbonXml(xml, 'current');
    assert.match(localized, /id="zoteroTab" label="Zotero"/);
    assert.match(localized, /id="btnAddEditCitation" label="插入\/编辑引文"/);
    assert.match(localized, /supertip="在光标处插入引文，或编辑光标所在位置的引文。"/);
    assert.match(localized, /id="unknownButton" label="Keep me"/);
});

test('required file list covers the complete standalone add-on', () => {
    const plugin = loadPlugin();
    const files = plugin.getRequiredAddonFiles();
    assert.equal(new Set(files).size, files.length);
    for (const name of ['manifest.xml', 'index.html', 'main.js', 'dialog.html',
        'ribbon.xml', 'ribbon-endnote.xml', 'ribbon-zotero.xml',
        'images/citation.svg', 'js/app.js', 'js/config.js', 'js/doc.js',
        'js/i18n.js', 'js/protocol.js', 'js/richtext.js', 'js/util.js',
        'js/zotero.js']) {
        assert.ok(files.includes(name), name + ' should be required');
    }

    plugin.addonFiles = { 'ribbon.xml': '', 'js/config.js': '', 'a.txt': '' };
    assert.equal(plugin.getRequiredAddonFiles().sort().join(','),
        'a.txt,js/config.js,ribbon.xml');
});

test('version comparison orders numeric segments', () => {
    const plugin = loadPlugin();
    assert.ok(plugin.compareVersions('0.2.10', '0.2.9') > 0);
    assert.ok(plugin.compareVersions('0.2.9', '0.2.10') < 0);
    assert.equal(plugin.compareVersions('1.0', '1.0.0'), 0);
});

test('uninstalling the Zotero plugin also cleans up the WPS add-in', () => {
    const bootstrap = fs.readFileSync(
        path.join(ROOT, 'src', 'zotero-plugin', 'bootstrap.js'), 'utf8');
    assert.match(bootstrap, /reason === ADDON_UNINSTALL/);
    assert.match(bootstrap, /ZoteroWPS\.uninstall\(\)/);
});
