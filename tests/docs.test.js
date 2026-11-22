'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function markdownFiles(dir = ROOT, result = []) {
    for (const name of fs.readdirSync(dir)) {
        if (name === '.git' || name === 'build' || name === 'dist'
                || name === 'node_modules') {
            continue;
        }
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            markdownFiles(full, result);
        }
        else if (/\.md$/i.test(name)) {
            result.push(full);
        }
    }
    return result;
}

test('relative Markdown links point to existing files', () => {
    const missing = [];
    for (const file of markdownFiles()) {
        const text = fs.readFileSync(file, 'utf8');
        const re = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
        let match;
        while ((match = re.exec(text))) {
            const target = decodeURIComponent(match[1].split('#')[0]);
            if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) {
                continue;
            }
            const resolved = path.resolve(path.dirname(file), target);
            if (!fs.existsSync(resolved)) {
                missing.push(path.relative(ROOT, file) + ' -> ' + target);
            }
        }
    }
    assert.deepEqual(missing, []);
});

test('community and release documents are present', () => {
    for (const name of ['README.md', 'CHANGELOG.md', 'LICENSE', 'DCO',
        'CONTRIBUTING.md', 'GOVERNANCE.md', 'TRADEMARK.md', 'SECURITY.md',
        'SUPPORT.md', 'DONATE.md', 'CODE_OF_CONDUCT.md']) {
        assert.ok(fs.existsSync(path.join(ROOT, name)), name + ' should exist');
    }
});
