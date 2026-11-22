'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const source = fs.readFileSync(
    path.join(ROOT, 'src', 'wps-addon', 'js', 'zotero.js'), 'utf8');

function loadClient(docOverrides) {
    const context = { window: {}, console };
    context.window.ZoteroWPSUtil = {
        getURLBase: () => 'http://127.0.0.1:23119',
        getConfig: () => ({ token: 'token' }),
        getActiveDocument: () => ({}),
        t: key => key,
        debug: () => {}
    };
    context.window.ZoteroWPSProtocol = {};
    context.window.ZoteroWPSDoc = Object.assign({
        begin: () => {},
        cleanup: () => {},
        end: () => {}
    }, docOverrides || {});
    vm.runInNewContext(source, context, { filename: 'zotero.js' });

    const client = new context.window.ZoteroWPSClient.Client('doc-1');
    let resets = 0;
    client.reset = () => { resets++; };
    return {
        client,
        resets: () => resets
    };
}

test('does not reset another document transaction on HTTP 503', () => {
    const { client, resets } = loadClient();
    client.request = () => ({ status: 503, text: '' });
    assert.throws(() => client.transact('refresh'), /wps\.error\.busyOtherDoc/);
    assert.equal(resets(), 0);
});

test('does not reset on invalid-token and other pre-transaction errors', () => {
    for (const status of [403, 500]) {
        const { client, resets } = loadClient();
        client.request = () => ({ status, text: 'error' });
        assert.throws(() => client.transact('refresh'));
        assert.equal(resets(), 0, 'status ' + status + ' must not reset');
    }
});

test('does not reset when the document cannot be opened', () => {
    const { client, resets } = loadClient({
        begin: () => { throw new Error('no document'); }
    });
    assert.throws(() => client.transact('refresh'), /no document/);
    assert.equal(resets(), 0);
});

test('resets a transaction that this client actually started', () => {
    const { client, resets } = loadClient();
    client.request = () => ({
        status: 200,
        json: { command: 'Application.getActiveDocument' }
    });
    client.respond = () => { throw new Error('network down'); };
    assert.throws(() => client.transact('refresh'), /network down/);
    assert.equal(resets(), 1);
});

test('completed transactions do not trigger a reset', () => {
    const { client, resets } = loadClient();
    client.request = () => ({
        status: 200,
        json: { command: 'Document.complete' }
    });
    assert.equal(client.transact('refresh'), true);
    assert.equal(resets(), 0);
});
