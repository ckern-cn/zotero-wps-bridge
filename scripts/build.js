#!/usr/bin/env node
/*
 * Build the Zotero plugin (.xpi) and a standalone WPS add-in (.zip).
 *
 * Only Node.js built-ins are required. ZIP files are written by a small
 * built-in writer so the build works on Windows without the `zip` command.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { createUpdateManifest } = require('./update-manifest');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;
const BUILD = path.join(ROOT, 'build');
const DIST = path.join(ROOT, 'dist');
const PLUGIN_SRC = path.join(ROOT, 'src', 'zotero-plugin');
const ADDON_SRC = path.join(ROOT, 'src', 'wps-addon');
const SHARED_SRC = path.join(ROOT, 'src', 'shared');

function log(...args) {
    console.log('[build]', ...args);
}

function rmrf(target) {
    fs.rmSync(target, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const name of fs.readdirSync(src)) {
            if (name === '.DS_Store') continue;
            copyRecursive(path.join(src, name), path.join(dest, name));
        }
    }
    else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
    }
}

function walk(dir, base = dir, result = []) {
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            walk(full, base, result);
        }
        else {
            result.push(path.relative(base, full).split(path.sep).join('/'));
        }
    }
    return result.sort();
}

/* -------------------------------------------------------------------------
 * Minimal ZIP writer (store/deflate, UTF-8 names)
 * ---------------------------------------------------------------------- */

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(buffer) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buffer.length; i++) {
        crc = CRC_TABLE[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { dosTime, dosDate };
}

function makeZip(entries) {
    const chunks = [];
    const central = [];
    const { dosTime, dosDate } = dosDateTime();
    let offset = 0;

    for (const entry of entries) {
        const name = Buffer.from(entry.name, 'utf8');
        const data = entry.data;
        const crc = crc32(data);
        let method = 0;
        let compressed = data;
        if (data.length > 0) {
            const deflated = zlib.deflateRawSync(data, { level: 9 });
            if (deflated.length < data.length) {
                method = 8;
                compressed = deflated;
            }
        }

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x0800, 6);
        local.writeUInt16LE(method, 8);
        local.writeUInt16LE(dosTime, 10);
        local.writeUInt16LE(dosDate, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(name.length, 26);
        local.writeUInt16LE(0, 28);
        chunks.push(local, name, compressed);

        const cd = Buffer.alloc(46);
        cd.writeUInt32LE(0x02014b50, 0);
        cd.writeUInt16LE(20, 4);
        cd.writeUInt16LE(20, 6);
        cd.writeUInt16LE(0x0800, 8);
        cd.writeUInt16LE(method, 10);
        cd.writeUInt16LE(dosTime, 12);
        cd.writeUInt16LE(dosDate, 14);
        cd.writeUInt32LE(crc, 16);
        cd.writeUInt32LE(compressed.length, 20);
        cd.writeUInt32LE(data.length, 24);
        cd.writeUInt16LE(name.length, 28);
        cd.writeUInt16LE(0, 30);
        cd.writeUInt16LE(0, 32);
        cd.writeUInt16LE(0, 34);
        cd.writeUInt16LE(0, 36);
        cd.writeUInt32LE((0o100644 << 16) >>> 0, 38);
        cd.writeUInt32LE(offset, 42);
        central.push(cd, name);

        offset += local.length + name.length + compressed.length;
    }

    const centralBuffer = Buffer.concat(central);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(entries.length, 8);
    eocd.writeUInt16LE(entries.length, 10);
    eocd.writeUInt32LE(centralBuffer.length, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...chunks, centralBuffer, eocd]);
}

function zipDirectory(srcDir, outFile, options = {}) {
    const files = walk(srcDir);
    const entries = [];
    for (const relative of files) {
        if (options.exclude && options.exclude.includes(relative)) {
            continue;
        }
        entries.push({
            name: relative,
            data: fs.readFileSync(path.join(srcDir, relative))
        });
    }
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, makeZip(entries));
    log('wrote', path.relative(ROOT, outFile), '(' + entries.length + ' files)');
}

/* -------------------------------------------------------------------------
 * Build
 * ---------------------------------------------------------------------- */

function build() {
    rmrf(BUILD);
    rmrf(DIST);
    fs.mkdirSync(BUILD, { recursive: true });
    fs.mkdirSync(DIST, { recursive: true });

    const pluginDir = path.join(BUILD, 'zotero-plugin');
    const addonDir = path.join(BUILD, 'wps-addon');

    copyRecursive(PLUGIN_SRC, pluginDir);
    copyRecursive(ADDON_SRC, addonDir);

    // Shared helpers are also loaded by the WPS add-in / Zotero plugin.
    fs.copyFileSync(path.join(SHARED_SRC, 'protocol.js'), path.join(addonDir, 'js', 'protocol.js'));
    fs.copyFileSync(path.join(SHARED_SRC, 'i18n.js'), path.join(addonDir, 'js', 'i18n.js'));
    fs.copyFileSync(path.join(SHARED_SRC, 'i18n.js'), path.join(pluginDir, 'content', 'i18n.js'));

    // Keep the manifest version in sync with package.json.
    const manifestPath = path.join(pluginDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = VERSION;

    // Optional Zotero auto-update support. Set UPDATE_URL (and either
    // UPDATE_LINK_BASE or UPDATE_LINK) when building a release.
    const updateUrl = process.env.UPDATE_URL || '';
    if (updateUrl) {
        let parsed;
        try {
            parsed = new URL(updateUrl);
        }
        catch (e) {
            throw new Error('UPDATE_URL is not a valid URL: ' + updateUrl);
        }
        if (parsed.protocol !== 'https:') {
            throw new Error('UPDATE_URL must use https://: ' + updateUrl);
        }
        manifest.applications.zotero.update_url = updateUrl;
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

    // Keep the manually-installable add-on's default config in sync too.
    const configPath = path.join(addonDir, 'js', 'config.js');
    fs.writeFileSync(configPath, fs.readFileSync(configPath, 'utf8')
        .replace(/addonVersion:\s*'[^']*'/, "addonVersion: '" + VERSION + "'"));

    // Embed the WPS add-in into the Zotero plugin. The installer writes these
    // files to the WPS jsaddons directory and generates config.js itself.
    const addonFiles = {};
    for (const relative of walk(addonDir)) {
        if (relative === 'js/config.js') {
            continue;
        }
        addonFiles[relative] = fs.readFileSync(path.join(addonDir, relative)).toString('base64');
    }
    const bundle = '/* Generated by scripts/build.js. Do not edit. */\n'
        + 'var ZOTERO_WPS_ADDON_VERSION = ' + JSON.stringify(VERSION) + ';\n'
        + 'var ZOTERO_WPS_ADDON_FILES = ' + JSON.stringify(addonFiles, null, 2) + ';\n';
    fs.writeFileSync(path.join(pluginDir, 'content', 'wps-addon-files.js'), bundle);
    log('embedded', Object.keys(addonFiles).length, 'WPS add-in files');

    const xpi = path.join(DIST, pkg.name + '-' + VERSION + '.xpi');
    zipDirectory(pluginDir, xpi);

    const addonZip = path.join(DIST, pkg.name + '-addon-' + VERSION + '.zip');
    zipDirectory(addonDir, addonZip);

    const hashValues = {};
    const hashes = [xpi, addonZip].map(file => {
        const data = fs.readFileSync(file);
        const hash = crypto.createHash('sha256').update(data).digest('hex');
        hashValues[path.basename(file)] = hash;
        return hash + '  ' + path.basename(file);
    });
    fs.writeFileSync(path.join(DIST, 'SHA256SUMS.txt'), hashes.join('\n') + '\n');

    if (updateUrl) {
        const linkBase = process.env.UPDATE_LINK_BASE || '';
        const updateLink = process.env.UPDATE_LINK
            || (linkBase ? linkBase.replace(/\/?$/, '/') + path.basename(xpi) : '');
        if (!updateLink) {
            throw new Error('UPDATE_URL is set, but neither UPDATE_LINK_BASE nor UPDATE_LINK is provided');
        }
        let parsedLink;
        try {
            parsedLink = new URL(updateLink);
        }
        catch (e) {
            throw new Error('Update download URL is invalid: ' + updateLink);
        }
        if (parsedLink.protocol !== 'https:') {
            throw new Error('Update download URL must use https://: ' + updateLink);
        }
        const updateManifest = createUpdateManifest({
            id: manifest.applications.zotero.id,
            version: VERSION,
            strictMin: manifest.applications.zotero.strict_min_version,
            strictMax: manifest.applications.zotero.strict_max_version,
            updateLink,
            updateHash: hashValues[path.basename(xpi)]
        });
        fs.writeFileSync(
            path.join(DIST, 'updates.json'),
            JSON.stringify(updateManifest, null, 2) + '\n'
        );
        log('wrote', path.relative(ROOT, path.join(DIST, 'updates.json')));
    }

    log('done. version', VERSION);
}

build();
