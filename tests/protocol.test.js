'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const P = require(path.join(__dirname, '..', 'src', 'shared', 'protocol.js'));

test('recognizes Zotero field codes', () => {
    assert.equal(P.isZoteroFieldCode('ITEM CSL_CITATION {"citationID":"a"}'), true);
    assert.equal(P.isZoteroFieldCode(' ADDIN ZOTERO_ITEM CSL_CITATION {"citationID":"a"} '), true);
    assert.equal(P.isZoteroFieldCode('BIBL {"bibliography":[]}'), true);
    assert.equal(P.isZoteroFieldCode(' ADDIN ZOTERO_BIBL {"bibliography":[]} '), true);
    assert.equal(P.isZoteroFieldCode('TEMP'), true);
    assert.equal(P.isZoteroFieldCode(' ADDIN ZOTERO_TEMP '), true);
    assert.equal(P.isZoteroFieldCode('HYPERLINK "https://example.com"'), false);
    assert.equal(P.isZoteroFieldCode('TEMPLATE "Normal.dotm"'), false);
    assert.equal(P.isZoteroFieldCode('TEMPERATURE 20'), false);
});

test('converts between WPS/Word and HTTP field codes', () => {
    const http = 'ITEM CSL_CITATION {"citationID":"a","properties":{"noteIndex":0}}';
    const word = P.toWPSFieldCode(http);
    assert.equal(word, ' ADDIN ZOTERO_ITEM CSL_CITATION {"citationID":"a","properties":{"noteIndex":0}} ');
    assert.equal(P.toHTTPFieldCode(word), http);

    const bib = 'BIBL {"bibliography":[]} CSL_BIBLIOGRAPHY';
    assert.equal(P.toWPSFieldCode(bib), ' ADDIN ZOTERO_BIBL {"bibliography":[]} CSL_BIBLIOGRAPHY ');
    assert.equal(P.toHTTPFieldCode(P.toWPSFieldCode(bib)), bib);
});

test('keeps temporary fields temporary', () => {
    assert.equal(P.toWPSFieldCode('{}'), 'TEMP');
    assert.equal(P.toWPSFieldCode('TEMP'), 'TEMP');
    assert.equal(P.parseFieldCode('TEMP').type, 'temp');
});

test('reads and writes noteIndex', () => {
    const code = 'ITEM CSL_CITATION {"citationID":"a","properties":{"noteIndex":0},"citationItems":[]}';
    assert.equal(P.getNoteIndex(code, 0), 0);
    const footnote = P.setNoteIndex(code, 1);
    assert.equal(P.getNoteIndex(footnote, 0), 1);
    assert.match(footnote, /"noteIndex":1/);
});

test('translates document data between Http and Field', () => {
    const httpData = '<data data-version="3"><prefs><pref name="fieldType" value="Http"/></prefs></data>';
    const wpsData = P.docDataForWPS(httpData);
    assert.match(wpsData, /value="Field"/);
    assert.match(P.docDataForZotero(wpsData), /value="Http"/);
});

test('converts JSON document data without double encoding', () => {
    const httpData = '{"dataVersion":4,"prefs":{"fieldType":"Http"}}';
    const wpsData = P.docDataForWPS(httpData);
    assert.deepEqual(JSON.parse(wpsData), {
        dataVersion: 4,
        prefs: { fieldType: 'Field' }
    });
    assert.deepEqual(JSON.parse(P.docDataForZotero(wpsData)), {
        dataVersion: 4,
        prefs: { fieldType: 'Http' }
    });

    const legacy = JSON.stringify('{"dataVersion":4,"prefs":{"fieldType":"Field"}}');
    assert.deepEqual(JSON.parse(P.docDataForZotero(legacy)), {
        dataVersion: 4,
        prefs: { fieldType: 'Http' }
    });
});

test('parses bibliography JSON with the CSL suffix and keeps it when editing', () => {
    const code = 'BIBL {"bibliography":[{"id":"x"}],"properties":{"noteIndex":0}} CSL_BIBLIOGRAPHY';
    const parsed = P.parseFieldCode(code);
    assert.equal(parsed.type, 'bibliography');
    assert.equal(parsed.json.bibliography[0].id, 'x');
    assert.equal(P.setNoteIndex(code, 0),
        'BIBL {"bibliography":[{"id":"x"}],"properties":{"noteIndex":0}} CSL_BIBLIOGRAPHY');
});

test('splits long document properties into 255-character chunks', () => {
    const value = 'x'.repeat(600);
    const chunks = P.splitProperty(value);
    assert.equal(chunks.length, 3);
    assert.equal(chunks.join(''), value);
    assert.ok(chunks.every(chunk => chunk.length <= P.CHUNK_SIZE));
});

test('generates readable ids', () => {
    const id = P.randomId(36);
    assert.equal(id.length, 36);
    assert.match(id, /^[A-Za-z0-9]+$/);
});
