'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'zw-build-test-'));
const TEMP_BUILD = path.join(TEMP, 'build');
const TEMP_DIST = path.join(TEMP, 'dist');

after(() => {
    fs.rmSync(TEMP, { recursive: true, force: true });
});

function walk(dir, base = dir, result = []) {
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) {
            walk(full, base, result);
        }
        else {
            result.push(path.relative(base, full).split(path.sep).join('/'));
        }
    }
    return result;
}

test('build produces the XPI, WPS add-on ZIP, and checksums', () => {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build.js')], {
        cwd: ROOT,
        stdio: 'pipe',
        env: Object.assign({}, process.env, {
            UPDATE_URL: '',
            UPDATE_LINK: '',
            UPDATE_LINK_BASE: '',
            BUILD_DIR: TEMP_BUILD,
            DIST_DIR: TEMP_DIST
        })
    });

    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const expected = [
        pkg.name + '-' + pkg.version + '.xpi',
        pkg.name + '-addon-' + pkg.version + '.zip',
        'SHA256SUMS.txt'
    ];

    for (const name of expected) {
        const file = path.join(TEMP_DIST, name);
        assert.ok(fs.existsSync(file), name + ' should exist');
        assert.ok(fs.statSync(file).size > 0, name + ' should not be empty');
    }

    const sums = fs.readFileSync(path.join(TEMP_DIST, 'SHA256SUMS.txt'), 'utf8');
    assert.match(sums, new RegExp(expected[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(sums, new RegExp(expected[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('build embeds every WPS add-in file except the generated config', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const addonDir = path.join(TEMP_BUILD, 'wps-addon');
    const pluginDir = path.join(TEMP_BUILD, 'zotero-plugin');
    const bundlePath = path.join(pluginDir, 'content', 'wps-addon-files.js');
    const source = fs.readFileSync(bundlePath, 'utf8');
    const context = {};
    vm.runInNewContext(source, context);

    assert.equal(context.ZOTERO_WPS_ADDON_VERSION, pkg.version);
    const embedded = Object.keys(context.ZOTERO_WPS_ADDON_FILES).sort();
    const onDisk = walk(addonDir)
        .filter(name => name !== 'js/config.js')
        .sort();
    assert.deepEqual(embedded, onDisk);
    assert.ok(!embedded.includes('js/config.js'));
    for (const name of ['manifest.xml', 'index.html', 'main.js', 'dialog.html',
        'ribbon.xml', 'ribbon-endnote.xml', 'ribbon-zotero.xml',
        'images/citation.svg', 'images/donate-alipay.png',
        'images/donate-wechat.png', 'js/app.js', 'js/doc.js', 'js/i18n.js',
        'js/protocol.js', 'js/richtext.js', 'js/util.js', 'js/zotero.js']) {
        assert.ok(embedded.includes(name), name + ' should be embedded');
    }

    for (const name of ['bootstrap.js', 'manifest.json', 'content/i18n.js',
        'content/preferences.js', 'content/preferences.xhtml',
        'content/preferences.css', 'content/zotero-wps.js']) {
        assert.ok(fs.existsSync(path.join(pluginDir, name)),
            name + ' should be part of the XPI');
    }
});
