#!/usr/bin/env node
/*
 * Prepare the static site for deployment.
 *
 * This script does not build the plugin. It expects `npm run build` to have
 * been executed with a real UPDATE_URL first, so the XPI inside the site can
 * actually auto-update.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BUILD = path.join(ROOT, 'build');
const SITE = path.join(ROOT, 'site');
const DOWNLOADS = path.join(SITE, 'downloads');
const SITE_URL = (process.env.SITE_URL || 'https://zw.ckern.cn').replace(/\/+$/, '');
const UPDATE_URL = SITE_URL + '/updates.json';

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;
const xpiName = pkg.name + '-' + version + '.xpi';
const zipName = pkg.name + '-addon-' + version + '.zip';
const latestXpi = pkg.name + '-latest.xpi';
const latestZip = pkg.name + '-addon-latest.zip';

function fail(message) {
    console.error('[build-site] ' + message);
    process.exit(1);
}

function requireFile(file, hint) {
    if (!fs.existsSync(file)) {
        fail('missing ' + path.relative(ROOT, file) + (hint ? '\n' + hint : ''));
    }
    return file;
}

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

if (!fs.existsSync(SITE)) {
    fail('site/ does not exist');
}
fs.mkdirSync(DOWNLOADS, { recursive: true });

const xpi = requireFile(path.join(DIST, xpiName),
    'Run a release build first:\n' +
    "UPDATE_URL='https://zw.ckern.cn/updates.json' " +
    "UPDATE_LINK_BASE='https://zw.ckern.cn/downloads/' npm run build");
const zip = requireFile(path.join(DIST, zipName));
const sums = requireFile(path.join(DIST, 'SHA256SUMS.txt'));
const updates = requireFile(path.join(DIST, 'updates.json'),
    'The release build must use UPDATE_URL/UPDATE_LINK_BASE.');

const buildManifest = requireFile(path.join(BUILD, 'zotero-plugin', 'manifest.json'));
const manifest = readJson(buildManifest);
const zotero = manifest.applications && manifest.applications.zotero;
if (!zotero) {
    fail('build manifest has no applications.zotero block');
}
if (zotero.update_url !== UPDATE_URL) {
    fail('XPI update_url is ' + JSON.stringify(zotero.update_url) +
        ', expected ' + JSON.stringify(UPDATE_URL) +
        '\nRebuild with:\n' +
        '  UPDATE_URL=' + UPDATE_URL + ' \\\n' +
        '  UPDATE_LINK_BASE=' + SITE_URL + '/downloads/ npm run build');
}

const updateManifest = readJson(updates);
const entry = updateManifest.addons
    && updateManifest.addons[zotero.id]
    && updateManifest.addons[zotero.id].updates
    && updateManifest.addons[zotero.id].updates[0];
if (!entry) {
    fail('dist/updates.json has no update entry for ' + zotero.id);
}
if (entry.version !== version) {
    fail('dist/updates.json version is ' + entry.version + ', expected ' + version);
}
if (!String(entry.update_link || '').startsWith(SITE_URL + '/')) {
    fail('updates.json update_link must point to ' + SITE_URL);
}

fs.copyFileSync(xpi, path.join(DOWNLOADS, xpiName));
fs.copyFileSync(xpi, path.join(DOWNLOADS, latestXpi));
fs.copyFileSync(zip, path.join(DOWNLOADS, zipName));
fs.copyFileSync(zip, path.join(DOWNLOADS, latestZip));
fs.copyFileSync(sums, path.join(DOWNLOADS, 'SHA256SUMS.txt'));
fs.copyFileSync(updates, path.join(SITE, 'updates.json'));

const digest = sha256(xpi);
const versionInfo = {
    version: version,
    date: new Date().toISOString().slice(0, 10),
    xpi: '/downloads/' + latestXpi,
    zip: '/downloads/' + latestZip,
    xpiVersioned: '/downloads/' + xpiName,
    zipVersioned: '/downloads/' + zipName,
    sha256: 'sha256:' + digest,
    checksums: '/downloads/SHA256SUMS.txt'
};
fs.writeFileSync(path.join(SITE, 'version.json'),
    JSON.stringify(versionInfo, null, 2) + '\n');

console.log('[build-site] site:', path.relative(ROOT, SITE));
console.log('[build-site] version:', version);
console.log('[build-site] xpi sha256:', digest);
console.log('[build-site] update url:', UPDATE_URL);
console.log('[build-site] files:',
    [xpiName, latestXpi, zipName, latestZip, 'SHA256SUMS.txt',
        'updates.json', 'version.json'].join(', '));
