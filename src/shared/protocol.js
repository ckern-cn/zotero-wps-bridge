/*
 * Zotero <-> WPS field-code helpers.
 *
 * This file is loaded as a plain script by the WPS add-in and can also be
 * required from Node for unit tests. Keep it dependency-free.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.ZoteroWPSProtocol = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const CITATION = 'ITEM CSL_CITATION ';
    const BIBLIOGRAPHY = 'BIBL ';

    const WORD_CITATION = ' ADDIN ZOTERO_ITEM CSL_CITATION ';
    const WORD_BIBLIOGRAPHY = ' ADDIN ZOTERO_BIBL ';

    const TEMP = 'TEMP';
    const TEMP_TEXT = '{Updating}';

    const DOC_DATA_PROP = 'ZOTERO_PREF';
    const BIB_STYLE_PROP = '_ZOTERO_BIBSTYLE';
    const CHUNK_SIZE = 255;
    const EXPORTED_DOCUMENT_MARKER = 'ZOTERO_TRANSFER_DOCUMENT';
    const EXPORTED_PREF_HEAD = 'DOCUMENT_PREFERENCES ';
    const TRANSFER_BODY_START_PROP = 'ZOTERO_TRANSFER_BODY_START';
    const ZOTERO_LINK = 'https://www.zotero.org/';

    function ltrim(value) {
        return String(value == null ? '' : value).replace(/^\s+/, '');
    }

    function isZoteroFieldCode(code) {
        const value = toHTTPFieldCode(code);
        return value.indexOf(CITATION) === 0
            || value.indexOf(BIBLIOGRAPHY) === 0
            || value === TEMP;
    }

    function parseFieldCode(code) {
        const value = toHTTPFieldCode(code);
        let type = null;
        let json = null;
        let offset = 0;

        if (value.indexOf(CITATION) === 0) {
            type = 'citation';
            offset = CITATION.length;
        }
        else if (value.indexOf(BIBLIOGRAPHY) === 0) {
            type = 'bibliography';
            offset = BIBLIOGRAPHY.length;
        }
        else if (value === TEMP) {
            return { type: 'temp', json: null, offset: TEMP.length, raw: value };
        }
        else {
            return null;
        }

        const body = value.substring(offset).trim();
        if (body) {
            try {
                json = JSON.parse(body);
            }
            catch (e) {
                json = null;
            }
        }
        return { type, json, offset, raw: value };
    }

    /**
     * Convert a WPS/Word field code into the format used by the Zotero HTTP
     * integration protocol (the format used by the Google Docs connector).
     */
    function toHTTPFieldCode(code) {
        let value = String(code == null ? '' : code).trim();
        if (value.indexOf('ADDIN ZOTERO_BIBL') === 0) {
            value = value.substring('ADDIN ZOTERO_'.length);
        }
        else if (value.indexOf('ADDIN ZOTERO_ITEM CSL_CITATION') === 0) {
            value = value.substring('ADDIN ZOTERO_'.length);
        }
        return value;
    }

    /**
     * Convert a field code received from Zotero into the format stored in a
     * .docx file by the Microsoft Word integration. Keeping this format makes
     * documents editable by both WPS and Word.
     */
    function toWPSFieldCode(code) {
        let value = String(code == null ? '' : code).trim();
        if (value === TEMP || value === '{}') {
            return TEMP;
        }
        if (value.indexOf(CITATION) === 0) {
            value = 'ADDIN ZOTERO_' + value;
        }
        else if (value.indexOf(BIBLIOGRAPHY) === 0) {
            value = 'ADDIN ZOTERO_' + value;
        }
        return ' ' + value + ' ';
    }

    function getNoteIndex(code, fallback) {
        const parsed = parseFieldCode(code);
        if (parsed && parsed.json && parsed.json.properties
                && typeof parsed.json.properties.noteIndex === 'number') {
            return parsed.json.properties.noteIndex;
        }
        return typeof fallback === 'number' ? fallback : 0;
    }

    function setNoteIndex(code, noteIndex) {
        const parsed = parseFieldCode(code);
        if (!parsed || !parsed.json || !parsed.json.properties) {
            return code;
        }
        parsed.json.properties.noteIndex = noteIndex;
        const head = parsed.type === 'citation' ? CITATION : BIBLIOGRAPHY;
        return head + JSON.stringify(parsed.json);
    }

    /**
     * Zotero's HTTP client identifies itself as "Http", while Word stores
     * "Field" in document preferences. Translate between the two.
     */
    function docDataForZotero(data) {
        if (!data) {
            return data;
        }
        let value = String(data);
        value = value.replace(/value="Field"/g, 'value="Http"');
        // Zotero 5/6 accepted a JSON-encoded document-data string. If we get
        // JSON, double-encode it to match what Google Docs returns.
        const trimmed = value.trim();
        if (trimmed.charAt(0) === '{') {
            return JSON.stringify(value);
        }
        return value;
    }

    function docDataForWPS(data) {
        if (!data) {
            return data;
        }
        return String(data).replace(/value="Http"/g, 'value="Field"');
    }

    function splitProperty(value) {
        const text = String(value == null ? '' : value);
        const chunks = [];
        for (let i = 0; i < text.length; i += CHUNK_SIZE) {
            chunks.push(text.substring(i, Math.min(i + CHUNK_SIZE, text.length)));
        }
        return chunks.length ? chunks : [''];
    }

    function escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function randomId(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    return {
        CITATION,
        BIBLIOGRAPHY,
        WORD_CITATION,
        WORD_BIBLIOGRAPHY,
        TEMP,
        TEMP_TEXT,
        DOC_DATA_PROP,
        BIB_STYLE_PROP,
        CHUNK_SIZE,
        EXPORTED_DOCUMENT_MARKER,
        EXPORTED_PREF_HEAD,
        TRANSFER_BODY_START_PROP,
        ZOTERO_LINK,
        isZoteroFieldCode,
        parseFieldCode,
        toHTTPFieldCode,
        toWPSFieldCode,
        getNoteIndex,
        setNoteIndex,
        docDataForZotero,
        docDataForWPS,
        splitProperty,
        escapeRegExp,
        randomId
    };
});
