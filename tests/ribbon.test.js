'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const I = require(path.join(__dirname, '..', 'src', 'shared', 'i18n.js'));

const ROOT = path.join(__dirname, '..');
const LAYOUTS = {
    current: 'ribbon.xml',
    endnote: 'ribbon-endnote.xml',
    zotero: 'ribbon-zotero.xml'
};

function read(name) {
    return fs.readFileSync(path.join(ROOT, 'src', 'wps-addon', name), 'utf8');
}

function attrs(text) {
    const result = {};
    const re = /\b([A-Za-z][\w-]*)="([^"]*)"/g;
    let match;
    while ((match = re.exec(text))) {
        result[match[1]] = match[2];
    }
    return result;
}

function elements(xml) {
    const result = [];
    const re = /<(tab|group|button)\b([^>]*)>/g;
    let match;
    while ((match = re.exec(xml))) {
        const values = attrs(match[2]);
        result.push({
            type: match[1],
            id: values.id,
            label: values.label,
            supertip: values.supertip,
            onAction: values.onAction,
            image: values.getImage !== undefined,
            enabled: values.getEnabled !== undefined,
            size: values.size
        });
    }
    return result;
}

function extractMap(source, name) {
    const re = new RegExp(name + '\\s*[:=]\\s*\\{');
    const match = re.exec(source);
    assert.ok(match, name + ' should exist');
    const start = match.index;
    const closing = /\n\s*}[,;]/.exec(source.slice(start));
    assert.ok(closing, name + ' should be a complete object');
    const body = source.slice(start, start + closing.index);
    const map = {};
    const entryRe = /(\w+):\s*'([^']+)'/g;
    let entry;
    while ((entry = entryRe.exec(body))) {
        map[entry[1]] = entry[2];
    }
    return map;
}

const pluginSource = fs.readFileSync(
    path.join(ROOT, 'src', 'zotero-plugin', 'content', 'zotero-wps.js'), 'utf8');
const addonSource = fs.readFileSync(
    path.join(ROOT, 'src', 'wps-addon', 'js', 'app.js'), 'utf8');
const pluginKeys = extractMap(pluginSource, 'ribbonKeys');
const addonKeys = extractMap(addonSource, 'RIBBON_KEYS');

test('plugin and add-in ribbon key maps are identical', () => {
    assert.deepEqual(addonKeys, pluginKeys);
});

for (const [layout, file] of Object.entries(LAYOUTS)) {
    test(layout + ' ribbon is internally consistent with i18n and key maps', () => {
        const xml = read(file);
        const nodes = elements(xml);

        const ids = nodes.map(node => node.id).filter(Boolean);
        assert.equal(new Set(ids).size, ids.length, 'duplicate ribbon IDs');
        assert.ok(ids.includes('zoteroTab'));

        for (const node of nodes) {
            assert.ok(node.id, node.type + ' must have an id');
            const key = pluginKeys[node.id];
            assert.ok(key, node.id + ' must have a ribbonKeys entry');
            assert.ok(node.label, node.id + ' must have a static label');
            assert.ok(node.image || node.type !== 'button',
                node.id + ' must use getImage');
            const documentIndependent = [
                'btnAbout', 'btnCheckConnection', 'btnLayout'
            ].includes(node.id);
            assert.ok(node.enabled || node.type !== 'button' || documentIndependent,
                node.id + ' must use getEnabled');
            if (node.type === 'button') {
                assert.equal(node.onAction, 'OnAction',
                    node.id + ' must dispatch through OnAction');
            }

            const labelKeys = [
                'wps.ribbon.' + key + '.' + layout + '.label',
                'wps.ribbon.' + key + '.label'
            ];
            const labelKey = labelKeys.find(candidate => I.messages['en-US'][candidate]);
            assert.ok(labelKey, 'missing label translation for ' + node.id);
            assert.equal(node.label, I.messages['en-US'][labelKey],
                node.id + ' static label must match en-US translation');

            if (node.type === 'button') {
                assert.ok(node.supertip, node.id + ' must have a static supertip');
                const tipKeys = [
                    'wps.ribbon.' + key + '.' + layout + '.tip',
                    'wps.ribbon.' + key + '.tip'
                ];
                const tipKey = tipKeys.find(candidate => I.messages['en-US'][candidate]);
                assert.ok(tipKey, 'missing supertip translation for ' + node.id);
                assert.equal(node.supertip, I.messages['en-US'][tipKey],
                    node.id + ' static supertip must match en-US translation');
            }
        }
    });
}

test('every layout exposes the same complete button set', () => {
    const expected = [
        'btnAddEditBibliography',
        'btnAddEditCitation',
        'btnAddNote',
        'btnAddAnnotation',
        'btnAbout',
        'btnCheckConnection',
        'btnCitationExplorer',
        'btnExport',
        'btnLayout',
        'btnRefresh',
        'btnRemoveCodes',
        'btnSetDocPrefs'
    ].sort();
    for (const file of Object.values(LAYOUTS)) {
        const ids = elements(read(file))
            .filter(node => node.type === 'button')
            .map(node => node.id)
            .sort();
        assert.deepEqual(ids, expected, file + ' button set changed');
    }
});

test('every ribbon button is dispatched by OnAction', () => {
    const start = addonSource.indexOf('function OnAction(control)');
    const end = addonSource.indexOf('function OnGetEnabled', start);
    assert.ok(start >= 0 && end > start, 'OnAction should exist');
    const block = addonSource.slice(start, end);
    const buttons = elements(read('ribbon.xml'))
        .filter(node => node.type === 'button');
    for (const button of buttons) {
        assert.ok(block.includes("case '" + button.id + "':"),
            'OnAction is missing ' + button.id);
    }
});

test('every ribbon button has an existing icon', () => {
    const imageBlock = addonSource.slice(
        addonSource.indexOf('const images = {'),
        addonSource.indexOf('};', addonSource.indexOf('const images = {')));
    const images = {};
    const re = /(\w+):\s*'([^']+)'/g;
    let match;
    while ((match = re.exec(imageBlock))) {
        images[match[1]] = match[2];
    }
    const buttons = elements(read('ribbon.xml'))
        .filter(node => node.type === 'button');
    for (const button of buttons) {
        assert.ok(images[button.id], 'missing GetImage mapping for ' + button.id);
        assert.ok(fs.existsSync(path.join(ROOT, 'src', 'wps-addon', images[button.id])),
            'missing icon file for ' + button.id + ': ' + images[button.id]);
    }
});
