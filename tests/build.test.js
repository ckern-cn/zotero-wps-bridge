'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

test('build produces the XPI, WPS add-on ZIP, and checksums', () => {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build.js')], {
        cwd: ROOT,
        stdio: 'pipe'
    });

    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const expected = [
        pkg.name + '-' + pkg.version + '.xpi',
        pkg.name + '-addon-' + pkg.version + '.zip',
        'SHA256SUMS.txt'
    ];

    for (const name of expected) {
        const file = path.join(ROOT, 'dist', name);
        assert.ok(fs.existsSync(file), name + ' should exist');
        assert.ok(fs.statSync(file).size > 0, name + ' should not be empty');
    }

    const sums = fs.readFileSync(path.join(ROOT, 'dist', 'SHA256SUMS.txt'), 'utf8');
    assert.match(sums, new RegExp(expected[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(sums, new RegExp(expected[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
