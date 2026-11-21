'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const I = require(path.join(__dirname, '..', 'src', 'shared', 'i18n.js'));

test('normalizes supported locales', () => {
    assert.equal(I.normalizeLocale('en-US'), 'en-US');
    assert.equal(I.normalizeLocale('en_GB'), 'en-US');
    assert.equal(I.normalizeLocale('zh_CN'), 'zh-CN');
    assert.equal(I.normalizeLocale('zh-Hans'), 'zh-CN');
    assert.equal(I.normalizeLocale('zh_TW'), 'zh-TW');
    assert.equal(I.normalizeLocale('zh-HK'), 'zh-TW');
    assert.equal(I.normalizeLocale('zh-Hant'), 'zh-TW');
    assert.equal(I.normalizeLocale('fr-FR'), null);
});

test('normalizes Windows LCID values reported by some WPS builds', () => {
    assert.equal(I.normalizeLocale(2052), 'zh-CN');
    assert.equal(I.normalizeLocale('1028'), 'zh-TW');
    assert.equal(I.normalizeLocale('1033'), 'en-US');
    assert.equal(I.normalizeLocale('9999'), null);
});

test('resolves unsupported locales to a supported fallback', () => {
    assert.equal(I.resolveLocale('fr-FR', 'zh-TW'), 'zh-TW');
    assert.equal(I.resolveLocale('auto', 'en-US'), 'en-US');
});

test('translates all supported languages', () => {
    const expected = {
        'en-US': 'Add/Edit Citation',
        'zh-CN': '插入/编辑引文',
        'zh-TW': '插入/編輯引文'
    };
    for (const locale of I.SUPPORTED) {
        const t = I.createTranslator(locale);
        assert.equal(t.t('wps.ribbon.addEditCitation.label'), expected[locale]);
    }
});

test('interpolates parameters and falls back to English', () => {
    const t = I.createTranslator('zh-CN');
    assert.equal(t.t('wps.error.http', { status: 500, text: 'boom' }),
        'Zotero 返回错误（HTTP 500）：boom');
    assert.equal(t.t('not.a.real.key'), 'not.a.real.key');
});

test('has all three locales for every message key', () => {
    const en = Object.keys(I.messages['en-US']);
    for (const locale of ['zh-CN', 'zh-TW']) {
        const keys = Object.keys(I.messages[locale]);
        assert.deepEqual(keys.sort(), en.sort());
    }
});
