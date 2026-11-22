'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const QQ = '1091139987';
const EMAIL = 'ckern@qq.com';

function read(relative) {
    return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

test('QQ group and email are present in the public documentation', () => {
    for (const file of ['README.md', 'SUPPORT.md',
        '.github/ISSUE_TEMPLATE/config.yml',
        '.github/ISSUE_TEMPLATE/bug_report.yml',
        '.github/ISSUE_TEMPLATE/feature_request.yml',
        '.gitee/ISSUE_TEMPLATE/bug.yml',
        '.gitee/ISSUE_TEMPLATE/feature.yml']) {
        const text = read(file);
        assert.ok(text.includes(QQ), file + ' should include the QQ group');
        assert.ok(text.includes(EMAIL), file + ' should include the support email');
    }
});

test('WPS help dialog renders the QQ group and email', () => {
    const dialog = read('src/wps-addon/dialog.html');
    assert.match(dialog, /id="contact"/);
    assert.match(dialog, /id="contact-qq"/);
    assert.match(dialog, /id="contact-email"/);
    assert.match(dialog, /data\.contact/);

    const app = read('src/wps-addon/js/app.js');
    assert.match(app, /contact:\s*\{/);
    assert.ok(app.includes(QQ), 'WPS app should include the QQ group');
    assert.ok(app.includes(EMAIL), 'WPS app should include the support email');
});

test('Zotero preference pane renders the QQ group and email', () => {
    const xhtml = read('src/zotero-plugin/content/preferences.xhtml');
    assert.match(xhtml, /zwps-contact-card/);
    assert.match(xhtml, /zwps-contact-qq/);
    assert.match(xhtml, /zwps-contact-email/);

    const js = read('src/zotero-plugin/content/preferences.js');
    assert.ok(js.includes(QQ));
    assert.ok(js.includes(EMAIL));
});
