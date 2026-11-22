'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const DOMAIN = 'https://zw.ckern.cn';

function read(relative) {
    return fs.readFileSync(path.join(SITE, relative), 'utf8');
}

test('landing page declares the canonical domain and metadata', () => {
    const html = read('index.html');
    assert.match(html, /<html lang="zh-CN">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/zw\.ckern\.cn\/">/);
    assert.match(html, /<meta property="og:url" content="https:\/\/zw\.ckern\.cn\/">/);
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.match(html, /Zotero WPS Bridge/);
    assert.equal(fs.readFileSync(path.join(SITE, 'CNAME'), 'utf8').trim(), 'zw.ckern.cn');
});

test('landing page contains the key sections and download hooks', () => {
    const html = read('index.html');
    for (const id of ['features', 'install', 'compatibility', 'faq', 'open-source', 'donate', 'download']) {
        assert.match(html, new RegExp('id="' + id + '"'), 'missing #' + id);
    }
    for (const key of ['xpi', 'zip', 'checksums']) {
        assert.match(html, new RegExp('data-download="' + key + '"'),
            'missing download hook ' + key);
    }
    assert.match(html, /data-version/);
    assert.match(html, /data-link="repo"/);
});

test('all local page assets exist', () => {
    const html = read('index.html');
    const missing = [];
    const re = /(?:src|href)="([^"]+)"/g;
    let match;
    while ((match = re.exec(html))) {
        const target = match[1].split('#')[0].split('?')[0];
        if (!target || /^(https?:|mailto:|\/)/i.test(target)
                || target.startsWith('data:')) {
            continue;
        }
        if (!fs.existsSync(path.join(SITE, target))) {
            missing.push(target);
        }
    }
    assert.deepEqual(missing, []);
});

test('page does not load remote scripts, styles, or image sources', () => {
    const html = read('index.html');
    assert.doesNotMatch(html, /<(?:script|link|img|source)[^>]+(?:src|href)="http:\/\//i);
    assert.doesNotMatch(read('styles.css'), /url\(\s*['"]?http:\/\//i);
});

test('donation QR images are bundled with the site', () => {
    for (const name of ['alipay-qr.png', 'wechat-qr.png']) {
        const file = path.join(SITE, 'assets', 'donate', name);
        assert.ok(fs.existsSync(file), name + ' should exist');
        assert.ok(fs.statSync(file).size > 10 * 1024, name + ' should be high resolution');
    }
});

test('site configuration points at the official domain and downloadable files', () => {
    const config = read('config.js');
    assert.match(config, /domain:\s*'https:\/\/zw\.ckern\.cn'/);
    assert.match(config, /xpi:\s*'\/downloads\/zotero-wps-bridge-latest\.xpi'/);
    assert.match(config, /zip:\s*'\/downloads\/zotero-wps-bridge-addon-latest\.zip'/);
    assert.match(config, /updates:\s*'\/updates\.json'/);
});

test('site build script enforces the real update URL', () => {
    const script = fs.readFileSync(path.join(ROOT, 'scripts', 'build-site.js'), 'utf8');
    assert.match(script, /https:\/\/zw\.ckern\.cn/);
    assert.match(script, /UPDATE_URL/);
    assert.match(script, /update_url/);
    assert.match(script, /fail\(/);
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['build:site'], 'node scripts/build-site.js');
});

test('generated version and update manifests match the current release', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const version = JSON.parse(read('version.json'));
    const updates = JSON.parse(read('updates.json'));
    assert.equal(version.version, pkg.version);
    assert.equal(version.xpi, '/downloads/zotero-wps-bridge-latest.xpi');
    assert.match(version.sha256, /^sha256:[a-f0-9]{64}$/);

    const entry = updates.addons['zotero-wps@wps-zotero'].updates[0];
    assert.equal(entry.version, pkg.version);
    assert.match(entry.update_link,
        /^https:\/\/zw\.ckern\.cn\/downloads\/zotero-wps-bridge-/);
    assert.match(entry.update_hash, /^sha256:[a-f0-9]{64}$/);
});

test('robots, sitemap, headers, and generated download notes are present', () => {
    assert.match(read('robots.txt'), /Sitemap: https:\/\/zw\.ckern\.cn\/sitemap\.xml/);
    assert.match(read('sitemap.xml'), /<loc>https:\/\/zw\.ckern\.cn\/<\/loc>/);
    assert.match(read('_headers'), /X-Content-Type-Options: nosniff/);
    assert.match(read('downloads/README.md'), /build-site\.js/);
});
