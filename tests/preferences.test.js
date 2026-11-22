'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const I = require(path.join(ROOT, 'src', 'shared', 'i18n.js'));

const js = fs.readFileSync(
    path.join(ROOT, 'src', 'zotero-plugin', 'content', 'preferences.js'), 'utf8');
const xhtml = fs.readFileSync(
    path.join(ROOT, 'src', 'zotero-plugin', 'content', 'preferences.xhtml'), 'utf8');

function matchAll(re, text) {
    const values = [];
    let match;
    while ((match = re.exec(text))) {
        values.push(match[1]);
    }
    return values;
}

test('preference pane translation keys exist in every locale', () => {
    const keys = matchAll(/\bT\('([^']+)'/g, js);
    assert.ok(keys.length > 0);
    for (const key of keys) {
        for (const locale of I.SUPPORTED) {
            assert.ok(I.messages[locale][key],
                locale + ' is missing preference key ' + key);
        }
    }
});

test('preference script only references IDs that exist in the fragment', () => {
    const ids = new Set(matchAll(/\bid="([^"]+)"/g, xhtml));
    const referenced = new Set([
        ...matchAll(/\bel\('([^']+)'\)/g, js),
        ...matchAll(/\bsetText\('([^']+)'/g, js)
    ]);
    for (const id of referenced) {
        assert.ok(ids.has(id), 'preferences.js references missing ID ' + id);
    }
});

test('language and ribbon layout choices match the plugin values', () => {
    const optionValues = block => {
        const start = xhtml.indexOf('id="' + block + '"');
        assert.ok(start >= 0, block + ' should exist');
        const end = xhtml.indexOf('</html:select>', start);
        return matchAll(/<html:option value="([^"]+)"/g,
            xhtml.slice(start, end));
    };
    assert.deepEqual(optionValues('zwps-language'),
        ['auto', 'en-US', 'zh-CN', 'zh-TW']);
    assert.deepEqual(optionValues('zwps-ribbon-layout'),
        ['current', 'endnote', 'zotero']);
});

test('explicit language choice is not overridden by automatic locale detection', () => {
    assert.match(js, /const explicit = p\.localeOverride && p\.localeOverride !== 'auto'/);
    assert.match(js, /if \(!explicit\) \{/);
});

test('preference script initializes after both DOM and plugin are ready', () => {
    assert.match(js, /const hasDom = !!el\('zwps-title'\)/);
    assert.match(js, /if \(\(!hasDom \|\| !plugin\(\)\) && initAttempts\+\+ < 100\)/);
    assert.match(js, /setTimeout\(init, 100\)/);
});

test('destructive preference actions use a confirmation', () => {
    for (const id of ['zwps-uninstall', 'zwps-force-reset', 'zwps-reset-token']) {
        const start = js.indexOf("el('" + id + "')");
        assert.ok(start >= 0, id + ' handler should exist');
        const next = js.indexOf('const ', start + 10);
        const block = js.slice(start, next > 0 ? next : js.length);
        assert.match(block, /confirmDialog\(/, id + ' should ask for confirmation');
    }
});
