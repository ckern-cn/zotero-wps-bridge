'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

function trackedFiles() {
    try {
        return execFileSync('git', ['ls-files', '-z'], {
            cwd: ROOT,
            encoding: 'utf8',
            maxBuffer: 4 * 1024 * 1024
        }).split('\0').filter(Boolean);
    }
    catch (e) {
        return null;
    }
}

test('repository does not track local caches, binaries, or secrets', () => {
    const files = trackedFiles();
    if (!files) {
        return;
    }
    const forbidden = files.filter(function (file) {
        return /^(pay|ref|dist|build)\//.test(file)
            || /^site\/downloads\/(?!README\.md$|\.gitkeep$)/.test(file)
            || /(^|\/)\.env(\.|$)/.test(file)
            || /\.(xpi|zip|log|pem|key|p12|pfx|jks|keystore|sqlite|sqlite3|db)$/i.test(file);
    });
    assert.deepEqual(forbidden, []);
});

test('tracked text has no personal paths or private key material', () => {
    const files = trackedFiles();
    if (!files) {
        return;
    }
    const textExtensions = /\.(md|txt|js|json|xml|xhtml|css|html|yml|yaml|svg|toml|ini|sh|ps1)$/i;
    const patterns = [
        /lameisoft@qq\.com/i,
        /\/home\/ywliu\b/,
        /\/data\/life\//,
        /BEGIN (RSA|OPENSSH|EC) PRIVATE KEY/
    ];
    for (const file of files) {
        if (!textExtensions.test(file) && path.basename(file) !== 'DCO'
                && path.basename(file) !== 'LICENSE') {
            continue;
        }
        const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
        for (const pattern of patterns) {
            assert.doesNotMatch(text, pattern, file + ' contains ' + pattern);
        }
    }
});

test('the manual WPS config contains no access token', () => {
    const config = fs.readFileSync(
        path.join(ROOT, 'src', 'wps-addon', 'js', 'config.js'), 'utf8');
    assert.match(config, /token:\s*''/);
    assert.doesNotMatch(config, /token:\s*'[A-Za-z0-9+/=_-]{16,}'/);
});
