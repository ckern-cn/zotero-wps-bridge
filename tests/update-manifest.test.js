'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createUpdateManifest } = require(path.join(__dirname, '..', 'scripts', 'update-manifest.js'));

const HASH = 'a'.repeat(64);
const pkg = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'package.json'), 'utf8'));
const pluginManifest = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'src', 'zotero-plugin', 'manifest.json'), 'utf8'));
const zoteroApp = pluginManifest.applications.zotero;
const xpiName = pkg.name + '-' + pkg.version + '.xpi';
const updateLink = 'https://example.com/' + pkg.name + '/' + xpiName;

test('creates a Zotero update manifest for the current plugin', () => {
    assert.equal(pluginManifest.version, pkg.version,
        'manifest.json and package.json versions must stay in sync');
    assert.ok(zoteroApp.update_url,
        'manifest.json must provide applications.zotero.update_url for Zotero 10');
    const manifest = createUpdateManifest({
        id: zoteroApp.id,
        version: pkg.version,
        strictMin: zoteroApp.strict_min_version,
        strictMax: zoteroApp.strict_max_version,
        updateLink,
        updateHash: HASH
    });
    const addon = manifest.addons[zoteroApp.id];
    assert.equal(addon.updates.length, 1);
    assert.equal(addon.updates[0].version, pkg.version);
    assert.equal(addon.updates[0].update_link, updateLink);
    assert.equal(addon.updates[0].update_hash, 'sha256:' + HASH);
    assert.equal(addon.updates[0].applications.zotero.strict_min_version,
        zoteroApp.strict_min_version);
    assert.equal(addon.updates[0].applications.zotero.strict_max_version,
        zoteroApp.strict_max_version);
});

test('normalizes upper-case hashes', () => {
    const manifest = createUpdateManifest({
        id: 'x@y',
        version: '1.0',
        strictMin: '6.999',
        updateLink: 'https://example.com/x.xpi',
        updateHash: HASH.toUpperCase()
    });
    assert.equal(manifest.addons['x@y'].updates[0].update_hash, 'sha256:' + HASH);
});

test('rejects missing fields and malformed hashes', () => {
    assert.throws(() => createUpdateManifest({}), /requires/);
    assert.throws(() => createUpdateManifest({
        id: 'x@y',
        version: '1.0',
        strictMin: '6.999',
        updateLink: 'https://example.com/x.xpi',
        updateHash: 'not-a-hash'
    }), /SHA-256/);
});
