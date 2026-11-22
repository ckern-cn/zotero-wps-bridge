'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'src', 'zotero-plugin', 'manifest.json'), 'utf8'));
const zoteroApp = manifest.applications.zotero;

function read(...parts) {
    return fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
}

test('version is synchronized across build metadata and runtime fallbacks', () => {
    assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
    assert.equal(manifest.version, pkg.version);

    assert.match(read('src', 'zotero-plugin', 'content', 'zotero-wps.js'),
        new RegExp("version:\\s*'" + pkg.version.replace(/\./g, '\\.') + "'"));
    assert.match(read('src', 'wps-addon', 'js', 'config.js'),
        new RegExp("addonVersion:\\s*'" + pkg.version.replace(/\./g, '\\.') + "'"));
    assert.match(read('src', 'wps-addon', 'js', 'app.js'),
        new RegExp("cfg\\.addonVersion\\s*\\|\\|\\s*'" + pkg.version.replace(/\./g, '\\.') + "'"));

    const changelog = read('CHANGELOG.md');
    const firstHeading = /^##\s+(\S+)/m.exec(changelog);
    assert.ok(firstHeading, 'CHANGELOG must contain a version heading');
    assert.equal(firstHeading[1], pkg.version,
        'the newest CHANGELOG entry must match package.json');
});

test('plugin identity and Zotero compatibility range stay stable', () => {
    assert.equal(zoteroApp.id, 'zotero-wps@wps-zotero');
    assert.match(zoteroApp.strict_min_version, /^\d+\.\d+(\.\d+)?$/);
    assert.match(zoteroApp.strict_max_version, /^\d+\.\d+(\.\d+)?$/);

    const numeric = value => value.split('.').map(Number);
    const min = numeric(zoteroApp.strict_min_version);
    const max = numeric(zoteroApp.strict_max_version);
    assert.ok(min[0] <= 7, 'plugin should still support Zotero 7');
    assert.ok(max[0] >= 7, 'plugin must declare a usable maximum version');
});

test('update_url is an HTTPS JSON manifest URL', () => {
    assert.ok(zoteroApp.update_url, 'Zotero 10 requires update_url');
    const url = new URL(zoteroApp.update_url);
    assert.equal(url.protocol, 'https:');
    assert.ok(url.hostname, 'update_url must include a host');
    assert.match(url.pathname, /\.json$/);
});

test('user-facing documentation references the current version', () => {
    const version = pkg.version;
    const files = {
        'docs/install-linux.md': ['Zotero WPS Bridge ' + version,
            'zotero-wps_' + version],
        'docs/gui-test-checklist.md': [version],
        'docs/updates.md': [version],
        'docs/architecture.md': ['addonVersion: "' + version + '"']
    };
    for (const [file, needles] of Object.entries(files)) {
        const text = read(file);
        for (const needle of needles) {
            assert.ok(text.includes(needle), file + ' should mention ' + needle);
        }
    }
});
