'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const DOMAIN = 'https://zw.ckern.cn';
const PAGES = [
    { file: 'index.html', dir: SITE, lang: 'zh-CN' },
    { file: 'en/index.html', dir: path.join(SITE, 'en'), lang: 'en' }
];

function read(relative) {
    return fs.readFileSync(path.join(SITE, relative), 'utf8');
}

function localTargets(html) {
    const targets = [];
    const re = /(?:src|href)="([^"]+)"/g;
    let match;
    while ((match = re.exec(html))) {
        const target = match[1].split('#')[0].split('?')[0];
        if (!target || /^(https?:|mailto:|\/)/i.test(target)
                || target.startsWith('data:')) {
            continue;
        }
        targets.push(target);
    }
    return targets;
}

test('both landing pages declare the canonical domain and language alternates', () => {
    for (const page of PAGES) {
        const html = read(page.file);
        assert.match(html, new RegExp('<html lang="' + page.lang + '">'));
        const canonical = page.lang === 'en'
            ? 'https://zw\\.ckern\\.cn/en/'
            : 'https://zw\\.ckern\\.cn/';
        assert.match(html, new RegExp('<link rel="canonical" href="' + canonical + '">'));
        assert.match(html, /hreflang="zh-CN" href="https:\/\/zw\.ckern\.cn\/"/);
        assert.match(html, /hreflang="en" href="https:\/\/zw\.ckern\.cn\/en\/"/);
        assert.match(html, /hreflang="x-default"/);
        assert.match(html, /<meta name="description" content="[^"]+"/);
    }
    assert.equal(fs.readFileSync(path.join(SITE, 'CNAME'), 'utf8').trim(), 'zw.ckern.cn');
});

test('both landing pages contain the key sections and download hooks', () => {
    for (const page of PAGES) {
        const html = read(page.file);
        for (const id of ['features', 'install', 'compatibility', 'faq',
            'open-source', 'community', 'donate', 'download']) {
            assert.match(html, new RegExp('id="' + id + '"'),
                page.file + ' missing #' + id);
        }
        for (const key of ['xpi', 'zip', 'checksums']) {
            assert.match(html, new RegExp('data-download="' + key + '"'),
                page.file + ' missing download hook ' + key);
        }
        assert.match(html, /data-version/);
        assert.match(html, /data-link="repo"/);
        assert.match(html, /data-link="github"/);
    }
});

test('both landing pages have the donation copy and GitHub/Gitee links', () => {
    const zh = read('index.html');
    const en = read('en/index.html');
    assert.match(zh, /欢迎请作者喝杯茶，或给作者加一点 Token。/);
    assert.match(en, /consider buying the author a cup of tea—or topping up a few tokens/i);
    assert.match(zh, /https:\/\/gitee\.com\/ckern\/zotero-wps-bridge/);
    assert.match(en, /https:\/\/gitee\.com\/ckern\/zotero-wps-bridge/);
    assert.match(zh, /https:\/\/github\.com\/ckern-cn\/zotero-wps-bridge/);
    assert.match(en, /https:\/\/github\.com\/ckern-cn\/zotero-wps-bridge/);
});

test('all local page assets exist on both landing pages', () => {
    const missing = [];
    for (const page of PAGES) {
        for (const target of localTargets(read(page.file))) {
            if (!fs.existsSync(path.resolve(page.dir, target))) {
                missing.push(page.file + ' -> ' + target);
            }
        }
    }
    assert.deepEqual(missing, []);
});

test('pages only load first-party assets and the self-hosted analytics script', () => {
    const analytics = 'https://ats.ckern.cn/rv.js/298511030001733';
    for (const page of PAGES) {
        const html = read(page.file);
        assert.doesNotMatch(html,
            /<(?:script|link|img|source)[^>]+(?:src|href)="http:\/\//i);
        const remote = Array.from(
            html.matchAll(/<(?:script|link|img|source)[^>]+(?:src|href)="(https?:\/\/[^"]+)"/gi),
            (match) => match[1])
            .filter((url) => !url.startsWith(DOMAIN));
        assert.deepEqual(remote, [analytics],
            page.file + ' should only load the self-hosted analytics script');
    }
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
    assert.match(config, /repo:\s*'https:\/\/gitee\.com\/ckern\/zotero-wps-bridge'/);
    assert.match(config, /issues:\s*'https:\/\/gitee\.com\/ckern\/zotero-wps-bridge\/issues'/);
    assert.match(config, /github:\s*'https:\/\/github\.com\/ckern-cn\/zotero-wps-bridge'/);
    assert.match(config, /xpi:\s*'\/downloads\/zotero-wps-bridge-latest\.xpi'/);
    assert.match(config, /zip:\s*'\/downloads\/zotero-wps-bridge-addon-latest\.zip'/);
    assert.match(config, /updates:\s*'\/updates\.json'/);

    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const escaped = pkg.version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const page of PAGES) {
        const html = read(page.file);
        for (const asset of ['styles.css', 'config.js', 'app.js']) {
            assert.match(html,
                new RegExp(asset.replace('.', '\\.') + '\\?v=' + escaped + '-[0-9a-f-]+'),
                page.file + ' should cache-bust ' + asset);
        }
    }
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

test('site build script enforces the real update URL', () => {
    const script = fs.readFileSync(path.join(ROOT, 'scripts', 'build-site.js'), 'utf8');
    assert.match(script, /https:\/\/zw\.ckern\.cn/);
    assert.match(script, /UPDATE_URL/);
    assert.match(script, /update_url/);
    assert.match(script, /fail\(/);
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts['build:site'], 'node scripts/build-site.js');
});

test('robots, sitemap, headers, and generated download notes are present', () => {
    assert.match(read('robots.txt'), /Sitemap: https:\/\/zw\.ckern\.cn\/sitemap\.xml/);
    assert.match(read('sitemap.xml'), /<loc>https:\/\/zw\.ckern\.cn\/<\/loc>/);
    assert.match(read('sitemap.xml'), /<loc>https:\/\/zw\.ckern\.cn\/en\/<\/loc>/);
    assert.match(read('_headers'), /X-Content-Type-Options: nosniff/);
    assert.match(read('downloads/README.md'), /build-site\.js/);
});

test('navigation returns to top without a sticky-header anchor', () => {
    const styles = read('styles.css');
    assert.doesNotMatch(styles,
        /\.ribbon-group\.secondary\s*\{[^}]*display:\s*none/);
    for (const page of PAGES) {
        const html = read(page.file);
        assert.match(html, /<span id="top" class="top-anchor"/);
        assert.doesNotMatch(html, /<header[^>]+id="top"/);
        assert.match(html, /data-back-to-top/);
        assert.match(html, /a[^>]+href="#top"/);
    }
    const js = read('app.js');
    assert.match(js, /a\[href="#top"\]/);
    assert.match(js, /scrollToTop/);
});

test('the analytics tag sits before </body> and referrers are allowed', () => {
    const tag = '<script async src="https://ats.ckern.cn/rv.js/298511030001733"></script>';
    for (const page of PAGES) {
        const html = read(page.file);
        assert.ok(html.includes(tag), page.file + ' is missing the analytics tag');
        assert.match(html, new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*</body>'));
    }
    assert.match(read('_headers'), /Referrer-Policy: strict-origin-when-cross-origin/);
    assert.doesNotMatch(read('_headers'), /Referrer-Policy:\s*no-referrer/i);
    const nginx = fs.readFileSync(
        path.join(ROOT, 'deploy', 'nginx-zw.ckern.cn.conf'), 'utf8');
    assert.doesNotMatch(nginx, /Referrer-Policy\s+no-referrer/i);
});

test('navigation keeps a consistent link style and marks the active section', () => {
    for (const page of PAGES) {
        const html = read(page.file);
        assert.doesNotMatch(html, /class="nav-cta"/);
        assert.match(html,
            /<nav class="site-nav"[^>]*>\s*<a href="#top">(?:首页|Home)<\/a>\s*<a href="#features">/);
        assert.match(html, /<a href="#download">/);
        const repo = html.match(/<a class="repo-pill"[\s\S]*?<\/a>/);
        assert.ok(repo, page.file + ' should contain a Gitee repository link');
        assert.match(repo[0], /class="gitee-icon"[\s\S]*?viewBox="0 0 100 100"/);
        assert.match(repo[0], /aria-label="Gitee (?:主仓库|repository)"/);
        assert.doesNotMatch(repo[0], />\s*Gitee\s*</);
    }
    const styles = read('styles.css');
    assert.doesNotMatch(styles, /\.nav-cta/);
    assert.match(styles, /\.site-nav > a\.is-active::after/);
    assert.match(styles, /\.gitee-icon \{/);
    const js = read('app.js');
    assert.match(js, /updateActiveSection/);
    assert.match(js, /aria-current/);
});

test('both landing pages expose the QQ group and email support channels', () => {
    for (const page of PAGES) {
        const html = read(page.file);
        assert.match(html, /id="community"/);
        assert.match(html, /<a href="#community">(?:交流|Community)<\/a>/);
        assert.match(html, /1091139987/);
        assert.match(html, /ckern@qq\.com/);
        assert.match(html, /data-copy="1091139987"/);
        assert.match(html, /mailto:ckern@qq\.com/);
        assert.match(html, /data-link="issues"/);
    }
    assert.match(read('app.js'), /navigator\.clipboard/);
});
