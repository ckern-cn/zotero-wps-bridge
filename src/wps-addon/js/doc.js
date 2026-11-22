/*
 * WPS document abstraction for the Zotero HTTP integration protocol.
 *
 * WPS JS objects are short-lived wrappers around the native document. Don't
 * keep references to Field/Range objects between calls; keep the numeric
 * field Index instead.
 */
(function () {
    'use strict';

    const U = window.ZoteroWPSUtil;
    const P = window.ZoteroWPSProtocol;
    const RT = window.ZoteroWPSRichText;

    let ctx = null;

    function E() {
        return Object.assign({}, U.WPS_ENUM_FALLBACK, wps.Enum || {});
    }

    function isFootnoteField(field) {
        try {
            return field.Result.Footnotes.Count > 0;
        }
        catch (e) {
            return false;
        }
    }

    function isEndnoteField(field) {
        try {
            return field.Result.Endnotes && field.Result.Endnotes.Count > 0;
        }
        catch (e) {
            return false;
        }
    }

    function getFieldIndex(field) {
        return field ? field.Index : null;
    }

    function collectFieldRefs(doc) {
        const refs = [];

        for (let i = 1; i <= doc.Fields.Count; i++) {
            const field = doc.Fields.Item(i);
            if (isFootnoteField(field) || isEndnoteField(field)) {
                continue;
            }
            let key = i;
            try { key = field.Result.Start; } catch (e) {}
            refs.push({
                field: field,
                index: field.Index,
                story: 'main',
                position: i,
                key: key
            });
        }

        for (let i = 1; i <= doc.Footnotes.Count; i++) {
            const footnote = doc.Footnotes.Item(i);
            let base = i * 1000000000;
            try { base = footnote.Reference.Start; } catch (e) {}
            const range = footnote.Range;
            for (let j = 1; j <= range.Fields.Count; j++) {
                const field = range.Fields.Item(j);
                refs.push({
                    field: field,
                    index: field.Index,
                    story: 'footnote',
                    noteIndex: i,
                    position: j,
                    key: base + j / 1000
                });
            }
        }

        if (doc.Endnotes) {
            for (let i = 1; i <= doc.Endnotes.Count; i++) {
                const endnote = doc.Endnotes.Item(i);
                let base = i * 1000000000 + 500000000;
                try { base = endnote.Reference.Start; } catch (e) {}
                const range = endnote.Range;
                for (let j = 1; j <= range.Fields.Count; j++) {
                    const field = range.Fields.Item(j);
                    refs.push({
                        field: field,
                        index: field.Index,
                        story: 'endnote',
                        noteIndex: i,
                        position: j,
                        key: base + j / 1000
                    });
                }
            }
        }

        refs.sort(function (a, b) { return a.key - b.key; });
        return refs;
    }

    function getAllFields(doc) {
        return collectFieldRefs(doc).map(function (ref) { return ref.field; });
    }

    function getFieldAtLocator(doc, locator) {
        try {
            if (locator.story === 'main') {
                return doc.Fields.Item(locator.position);
            }
            if (locator.story === 'footnote') {
                return doc.Footnotes.Item(locator.noteIndex).Range.Fields.Item(locator.position);
            }
            if (locator.story === 'endnote') {
                return doc.Endnotes.Item(locator.noteIndex).Range.Fields.Item(locator.position);
            }
        }
        catch (e) {}
        return null;
    }

    function rebuildLocators() {
        if (!ctx) {
            return;
        }
        ctx.locators.clear();
        const refs = collectFieldRefs(ctx.doc);
        for (let ref of refs) {
            if (ctx.byIndex.has(ref.index)) {
                ctx.locators.set(ref.index, ref);
            }
        }
    }

    function findFieldByIndex(doc, index) {
        if (index == null) {
            return null;
        }
        const refs = collectFieldRefs(doc);
        for (let ref of refs) {
            if (ref.index === index) {
                return ref.field;
            }
        }
        return null;
    }

    function registerField(field, forcedId, locator) {
        const index = getFieldIndex(field);
        if (index == null) {
            return null;
        }
        if (ctx.byIndex.has(index)) {
            if (locator) {
                ctx.locators.set(index, locator);
            }
            return ctx.byIndex.get(index);
        }
        if (!forcedId && !P.isZoteroFieldCode(field.Code.Text)) {
            return null;
        }
        let id = forcedId || ('f' + P.randomId(12));
        while (ctx.byId.has(id)) {
            id = 'f' + P.randomId(12);
        }
        ctx.byIndex.set(index, id);
        ctx.byId.set(id, index);
        if (locator) {
            ctx.locators.set(index, locator);
        }
        return id;
    }

    function unregisterByIndex(index) {
        if (ctx.byIndex.has(index)) {
            const id = ctx.byIndex.get(index);
            ctx.byIndex.delete(index);
            ctx.byId.delete(id);
        }
    }

    function unregisterById(id) {
        if (ctx.byId.has(id)) {
            const index = ctx.byId.get(id);
            ctx.byId.delete(id);
            ctx.byIndex.delete(index);
        }
    }

    function getFieldById(id) {
        if (!ctx || !ctx.byId.has(id)) {
            return null;
        }
        const index = ctx.byId.get(id);
        const locator = ctx.locators.get(index);
        if (locator) {
            const field = getFieldAtLocator(ctx.doc, locator);
            if (field && field.Index === index) {
                return field;
            }
            ctx.locators.delete(index);
        }
        const field = findFieldByIndex(ctx.doc, index);
        if (!field) {
            unregisterById(id);
            return null;
        }
        const refs = collectFieldRefs(ctx.doc);
        for (let ref of refs) {
            if (ref.index === index) {
                ctx.locators.set(index, ref);
                break;
            }
        }
        return field;
    }

    function isAdjacent(field) {
        try {
            const prev = field.Previous;
            if (prev && P.isZoteroFieldCode(prev.Code.Text)
                    && prev.Result.End === field.Result.Start) {
                return true;
            }
            const next = field.Next;
            if (next && P.isZoteroFieldCode(next.Code.Text)
                    && next.Result.Start === field.Result.End) {
                return true;
            }
        }
        catch (e) {}
        return false;
    }

    function getFieldData(field, fallbackNoteIndex) {
        const index = getFieldIndex(field);
        let id = ctx.byIndex.get(index);
        if (!id) {
            id = registerField(field);
        }
        if (!id) {
            return null;
        }
        const code = P.toHTTPFieldCode(field.Code.Text);
        // The actual location is authoritative. This also repairs documents
        // written by older versions that stored the note type (1/2) instead
        // of the real note number in properties.noteIndex.
        const noteIndex = typeof fallbackNoteIndex === 'number'
            ? fallbackNoteIndex
            : P.getNoteIndex(
                code,
                isFootnoteField(field) ? 1 : (isEndnoteField(field) ? 2 : 0)
            );
        return {
            id: id,
            code: code,
            text: field.Result.Text,
            adjacent: isAdjacent(field),
            noteIndex: noteIndex
        };
    }

    function begin(docId, doc) {
        ctx = {
            docId: docId,
            doc: doc,
            byIndex: new Map(),
            byId: new Map(),
            locators: new Map()
        };
        const refs = collectFieldRefs(doc);
        for (let ref of refs) {
            registerField(ref.field, null, ref);
        }
        return ctx;
    }

    function end() {
        ctx = null;
    }

    function cleanup() {
        if (!ctx) {
            return;
        }
        const doc = ctx.doc;
        const fields = getAllFields(doc);
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            try {
                if (P.toHTTPFieldCode(field.Code.Text) === P.TEMP
                        && field.Result.Text === P.TEMP_TEXT) {
                    unregisterByIndex(field.Index);
                    field.Delete();
                }
            }
            catch (e) {
                U.debug('cleanup temp field failed', e);
            }
        }
    }

    function getDocProperty(doc, name) {
        const props = doc.CustomDocumentProperties;
        const chunks = [];
        const prefix = name + '_';
        for (let i = 1; i <= props.Count; i++) {
            const prop = props.Item(i);
            const propName = String(prop.Name || '');
            let index = null;
            if (propName === name) {
                index = 0;
            }
            else if (propName.indexOf(prefix) === 0) {
                const suffix = propName.substring(prefix.length);
                if (/^\d+$/.test(suffix)) {
                    index = parseInt(suffix, 10);
                }
            }
            if (index != null) {
                chunks.push({ index: index, value: prop.Value });
            }
        }
        chunks.sort(function (a, b) { return a.index - b.index; });
        return chunks.map(function (chunk) { return chunk.value; }).join('');
    }

    function setDocProperty(doc, name, value) {
        const props = doc.CustomDocumentProperties;
        const prefix = name + '_';
        for (let i = props.Count; i > 0; i--) {
            const prop = props.Item(i);
            const propName = String(prop.Name || '');
            if (propName === name || (propName.indexOf(prefix) === 0
                    && /^\d+$/.test(propName.substring(prefix.length)))) {
                prop.Delete();
            }
        }
        const chunks = P.splitProperty(value);
        for (let i = 0; i < chunks.length; i++) {
            props.Add(name + '_' + (i + 1), false, E().msoPropertyTypeString, chunks[i]);
        }
    }

    function removeDocProperty(doc, name) {
        const props = doc.CustomDocumentProperties;
        const prefix = name + '_';
        for (let i = props.Count; i > 0; i--) {
            const prop = props.Item(i);
            const propName = String(prop.Name || '');
            if (propName === name || (propName.indexOf(prefix) === 0
                    && /^\d+$/.test(propName.substring(prefix.length)))) {
                prop.Delete();
            }
        }
    }

    function isExportedDocument(doc) {
        try {
            const marker = P.EXPORTED_DOCUMENT_MARKER;
            return doc.Range(0, marker.length).Text === marker;
        }
        catch (e) {
            return false;
        }
    }

    function getDocData(doc) {
        if (isExportedDocument(doc)) {
            return P.EXPORTED_DOCUMENT_MARKER;
        }
        const raw = getDocProperty(doc, P.DOC_DATA_PROP);
        return P.docDataForZotero(raw);
    }

    function setDocData(doc, data) {
        setDocProperty(doc, P.DOC_DATA_PROP, P.docDataForWPS(data));
    }

    function getBibStyle(doc) {
        const raw = getDocProperty(doc, P.BIB_STYLE_PROP);
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw);
        }
        catch (e) {
            return null;
        }
    }

    function setBibStyle(doc, firstLineIndent, indent, lineSpacing, entrySpacing, tabStops, tabStopsCount) {
        const style = {
            firstLineIndent: Number(firstLineIndent) || 0,
            indent: Number(indent) || 0,
            lineSpacing: Number(lineSpacing) || 0,
            entrySpacing: Number(entrySpacing) || 0,
            tabStops: tabStops ? Array.prototype.slice.call(tabStops) : [],
            tabStopsCount: Number(tabStopsCount) || 0
        };
        setDocProperty(doc, P.BIB_STYLE_PROP, JSON.stringify(style));
        return style;
    }

    function createFieldAt(range) {
        const doc = range.Document;
        const field = range.Fields.Add(range, E().wdFieldAddin);
        U.assert(field, U.t('wps.error.cannotCreateField'));
        field.Code.Text = P.TEMP;
        field.Result.Text = P.TEMP_TEXT;
        return field;
    }

    function getNoteForField(field) {
        if (ctx) {
            const locator = ctx.locators.get(getFieldIndex(field));
            if (locator && locator.story !== 'main') {
                try {
                    const notes = locator.story === 'footnote'
                        ? ctx.doc.Footnotes : ctx.doc.Endnotes;
                    const note = notes.Item(locator.noteIndex);
                    const noteRange = note.Range;
                    if (field.Result.Start >= noteRange.Start
                            && field.Result.End <= noteRange.End) {
                        return {
                            type: locator.story === 'footnote' ? 1 : 2,
                            note: note
                        };
                    }
                }
                catch (e) {}
            }
        }
        try {
            if (field.Result.Footnotes && field.Result.Footnotes.Count > 0) {
                return { type: 1, note: field.Result.Footnotes.Item(1) };
            }
        }
        catch (e) {}
        try {
            if (field.Result.Endnotes && field.Result.Endnotes.Count > 0) {
                return { type: 2, note: field.Result.Endnotes.Item(1) };
            }
        }
        catch (e) {}
        return null;
    }

    function addNote(doc, noteType, range) {
        if (noteType === 1) {
            return doc.Footnotes.Add(range);
        }
        if (noteType === 2) {
            if (!doc.Endnotes || !doc.Endnotes.Add) {
                throw new Error(U.t('wps.error.unsupportedNoteType', { type: noteType }));
            }
            return doc.Endnotes.Add(range);
        }
        throw new Error(U.t('wps.error.unsupportedNoteType', { type: noteType }));
    }

    function isInNoteStory(range, noteType) {
        try {
            const story = range.StoryType;
            if (noteType === 1) {
                return story === (E().wdFootnotesStory || 2);
            }
            if (noteType === 2) {
                return story === (E().wdEndnotesStory || 3);
            }
        }
        catch (e) {}
        return false;
    }

    function findNoteIndex(doc, range, noteType) {
        try {
            const notes = noteType === 1 ? doc.Footnotes
                : noteType === 2 ? doc.Endnotes : null;
            if (!notes || !range) {
                return 0;
            }
            for (let i = 1; i <= notes.Count; i++) {
                const noteRange = notes.Item(i).Range;
                if (range.Start >= noteRange.Start && range.End <= noteRange.End) {
                    return i;
                }
            }
        }
        catch (e) {}
        return 0;
    }

    function insertField(docId, noteType, insertRange) {
        const doc = ctx.doc;
        noteType = Number(noteType) || 0;
        if (noteType !== 0 && noteType !== 1 && noteType !== 2) {
            throw new Error(U.t('wps.error.unsupportedNoteType', { type: noteType }));
        }
        let range = insertRange || doc.ActiveWindow.Selection.Range;
        let note = null;
        if (noteType === 1 || noteType === 2) {
            range.Collapse(E().wdCollapseEnd);
            if (!isInNoteStory(range, noteType)) {
                note = addNote(doc, noteType, range);
                U.assert(note, U.t('wps.error.cannotCreateNote'));
                range = note.Range;
            }
        }
        const field = createFieldAt(range);
        const id = registerField(field);
        U.assert(id, U.t('wps.error.cannotRegisterField'));
        rebuildLocators();
        if (noteType === 0) {
            try {
                field.Select();
                doc.ActiveWindow.Selection.Collapse(E().wdCollapseEnd);
            }
            catch (e) {}
        }
        const noteIndex = (note && Number(note.Index))
            || findNoteIndex(doc, field.Result, noteType);
        return getFieldData(field, noteIndex);
    }

    function setFieldCode(docId, fieldId, code) {
        const field = getFieldById(fieldId);
        U.assert(field, U.t('wps.error.fieldNotFound', { id: fieldId }));
        field.Code.Text = P.toWPSFieldCode(code);
    }

    function setFieldText(docId, fieldId, text, isRich) {
        const field = getFieldById(fieldId);
        U.assert(field, U.t('wps.error.fieldNotFound', { id: fieldId }));
        const isBib = (field.Code.Text || '').indexOf('ZOTERO_BIBL') >= 0
            || (field.Code.Text || '').indexOf('BIBL ') === 0;
        if (isRich) {
            RT.setFieldResult(field, text, { bibliography: isBib });
        }
        else {
            field.Result.Text = String(text == null ? '' : text);
        }
    }

    function getFieldText(docId, fieldId) {
        const field = getFieldById(fieldId);
        return field ? field.Result.Text : '';
    }

    function deleteField(docId, fieldId) {
        const field = getFieldById(fieldId);
        if (!field) {
            return false;
        }
        unregisterById(fieldId);
        field.Delete();
        rebuildLocators();
        return true;
    }

    function selectField(docId, fieldId) {
        const field = getFieldById(fieldId);
        if (!field) {
            return false;
        }
        field.Select();
        return true;
    }

    function removeFieldCode(docId, fieldId) {
        const field = getFieldById(fieldId);
        if (!field) {
            return false;
        }
        unregisterById(fieldId);
        field.Unlink();
        rebuildLocators();
        return true;
    }

    function getFields(docId) {
        const doc = ctx.doc;
        const refs = collectFieldRefs(doc).filter(function (ref) {
            return P.isZoteroFieldCode(ref.field.Code.Text);
        });
        const result = [];
        for (let i = 0; i < refs.length; i++) {
            const data = getFieldData(refs[i].field,
                refs[i].story === 'main' ? 0 : refs[i].noteIndex);
            if (data) {
                result.push(data);
            }
        }
        return result;
    }

    function getFieldsNearCursor(docId) {
        const doc = ctx.doc;
        const selection = doc.ActiveWindow.Selection;
        let range = selection.Range;
        range.Collapse(E().wdCollapseEnd);
        let fields = [];
        for (let i = 1; i <= range.Fields.Count; i++) {
            fields.push(range.Fields.Item(i));
        }
        if (!fields.length) {
            try {
                range.MoveStart(E().wdCharacter, -1);
                for (let i = 1; i <= range.Fields.Count; i++) {
                    fields.push(range.Fields.Item(i));
                }
            }
            catch (e) {}
        }
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            if (registerField(field)) {
                return getFieldData(field);
            }
        }
        return null;
    }

    function canInsertField(docId) {
        try {
            const doc = ctx.doc;
            const range = doc.ActiveWindow.Selection.Range;
            return !(range.Hyperlinks && range.Hyperlinks.Count > 0);
        }
        catch (e) {
            return true;
        }
    }

    function isInLink(docId) {
        return !canInsertField(docId);
    }

    function insertRich(docId, html) {
        const doc = ctx.doc;
        const range = doc.ActiveWindow.Selection.Range;
        range.Collapse(E().wdCollapseEnd);
        RT.insertHTML(range, html, {});
    }

    function activate(docId) {
        if (ctx && ctx.doc) {
            try { ctx.doc.Activate(); } catch (e) {}
        }
    }

    function displayDialog(docId, message, icon, buttons) {
        const text = String(message == null ? '' : message);
        if (buttons === 0) {
            alert(text);
            return 1;
        }
        if (buttons === 1) {
            return confirm(text) ? 1 : 0;
        }
        if (buttons === 2) {
            return confirm(text) ? 1 : 0;
        }
        // Yes / No / Cancel: two-step fallback because WPS JS only exposes
        // confirm() reliably across platforms.
        if (confirm(text + '\n\n' + U.t('wps.dialog.yesNoCancel1'))) {
            return 2;
        }
        return confirm(text + '\n\n' + U.t('wps.dialog.yesNoCancel2')) ? 1 : 0;
    }

    function noteContainsOnlyField(field, note) {
        try {
            const range = note.Range;
            if (range.Fields.Count > 1) {
                return false;
            }
            const noteText = String(range.Text || '').replace(/[\s\u00a0]/g, '');
            const fieldText = String(field.Result.Text || '').replace(/[\s\u00a0]/g, '');
            return noteText === fieldText;
        }
        catch (e) {
            return false;
        }
    }

    function moveFieldToNote(field, id, targetType) {
        const doc = ctx.doc;
        const current = getNoteForField(field);
        const httpCode = P.toHTTPFieldCode(field.Code.Text);
        const onlyField = current
            ? noteContainsOnlyField(field, current.note)
            : false;
        let position;
        if (current) {
            position = current.note.Reference;
            position.Collapse(E().wdCollapseStart);
        }
        else {
            position = field.Result;
            position.Collapse(E().wdCollapseStart);
        }
        field.Delete();
        if (current && onlyField) {
            current.note.Delete();
        }

        let targetRange = position;
        let note = null;
        if ((targetType === 1 || targetType === 2)
                && !isInNoteStory(position, targetType)) {
            note = addNote(doc, targetType, position);
            U.assert(note, U.t('wps.error.cannotCreateNote'));
            targetRange = note.Range;
        }
        const newField = createFieldAt(targetRange);
        const noteIndex = (note && Number(note.Index))
            || findNoteIndex(doc, newField.Result, targetType);
        newField.Code.Text = P.toWPSFieldCode(P.setNoteIndex(httpCode, noteIndex));

        unregisterById(id);
        const newIndex = newField.Index;
        ctx.byIndex.set(newIndex, id);
        ctx.byId.set(id, newIndex);
        rebuildLocators();
    }

    function convertToNoteType(docId, fieldIds, noteTypes) {
        for (let i = 0; i < fieldIds.length; i++) {
            const id = fieldIds[i];
            const target = Number(noteTypes[i]);
            if (target !== 0 && target !== 1 && target !== 2) {
                U.debug('unsupported note type', target);
                continue;
            }
            const field = getFieldById(id);
            if (!field) {
                continue;
            }
            const note = getNoteForField(field);
            const current = note ? note.type : 0;
            if (current === target) {
                continue;
            }
            moveFieldToNote(field, id, target);
        }
    }

    function convertPlaceholdersToFields(docId, placeholderIds, noteType) {
        const doc = ctx.doc;
        noteType = Number(noteType) || 0;
        if (noteType !== 0 && noteType !== 1 && noteType !== 2) {
            throw new Error(U.t('wps.error.unsupportedNoteType', { type: noteType }));
        }
        const ids = new Set(placeholderIds);
        const links = [];
        for (let i = 1; i <= doc.Hyperlinks.Count; i++) {
            links.push(doc.Hyperlinks.Item(i));
        }
        for (let i = 1; i <= doc.Footnotes.Count; i++) {
            const range = doc.Footnotes.Item(i).Range;
            for (let j = 1; j <= range.Hyperlinks.Count; j++) {
                links.push(range.Hyperlinks.Item(j));
            }
        }
        if (doc.Endnotes) {
            for (let i = 1; i <= doc.Endnotes.Count; i++) {
                const range = doc.Endnotes.Item(i).Range;
                for (let j = 1; j <= range.Hyperlinks.Count; j++) {
                    links.push(range.Hyperlinks.Item(j));
                }
            }
        }
        const result = [];
        for (let i = links.length - 1; i >= 0; i--) {
            const link = links[i];
            const address = link.Address || '';
            if (address.indexOf('https://www.zotero.org/?') !== 0) {
                continue;
            }
            const placeholderId = address.substring('https://www.zotero.org/?'.length);
            if (!ids.has(placeholderId)) {
                continue;
            }
            const linkDoc = link.Range.Document;
            const text = link.TextToDisplay;
            link.Range.Select();
            const selection = linkDoc.ActiveWindow.Selection;
            link.Delete();
            selection.TypeBackspace();
            selection.Collapse(E().wdCollapseStart);
            let targetRange = selection.Range;
            let note = null;
            if ((noteType === 1 || noteType === 2)
                    && !isInNoteStory(targetRange, noteType)) {
                note = addNote(linkDoc, noteType, targetRange);
                U.assert(note, U.t('wps.error.cannotCreateNote'));
                targetRange = note.Range;
            }
            const field = createFieldAt(targetRange);
            if (text) {
                try {
                    field.Result.Text = text;
                }
                catch (e) {}
            }
            unregisterById(placeholderId);
            ctx.byIndex.set(field.Index, placeholderId);
            ctx.byId.set(placeholderId, field.Index);
            const noteIndex = (note && Number(note.Index))
                || findNoteIndex(linkDoc, field.Result, noteType);
            const data = getFieldData(field, noteIndex);
            if (data) {
                result.push(data);
            }
        }
        result.reverse();
        rebuildLocators();
        return result;
    }

    function forEachStoryField(doc, callback) {
        for (let i = doc.Fields.Count; i > 0; i--) {
            const field = doc.Fields.Item(i);
            if (isFootnoteField(field) || isEndnoteField(field)) {
                continue;
            }
            callback(field);
        }
        for (let i = doc.Footnotes.Count; i > 0; i--) {
            const range = doc.Footnotes.Item(i).Range;
            for (let j = range.Fields.Count; j > 0; j--) {
                callback(range.Fields.Item(j));
            }
        }
        if (doc.Endnotes) {
            for (let i = doc.Endnotes.Count; i > 0; i--) {
                const range = doc.Endnotes.Item(i).Range;
                for (let j = range.Fields.Count; j > 0; j--) {
                    callback(range.Fields.Item(j));
                }
            }
        }
    }

    function convertFieldToHyperlink(field) {
        if (!P.isZoteroFieldCode(field.Code.Text)) {
            return false;
        }
        if (P.toHTTPFieldCode(field.Code.Text) === P.TEMP) {
            return false;
        }
        const range = field.Result;
        range.Collapse(E().wdCollapseStart);
        const code = P.toHTTPFieldCode(field.Code.Text);
        field.Delete();
        range.InsertAfter(code);
        try {
            range.Hyperlinks.Add(range, P.ZOTERO_LINK);
        }
        catch (e) {
            U.debug('failed to add export hyperlink', e);
        }
        return true;
    }

    function convertHyperlinkToField(link) {
        try {
            if (!link || link.Address !== P.ZOTERO_LINK) {
                return false;
            }
            const code = link.TextToDisplay || '';
            if (code.indexOf('ITEM ') !== 0 && code.indexOf('BIBL ') !== 0) {
                return false;
            }
            link.Range.Select();
            const selection = link.Range.Document.ActiveWindow.Selection;
            link.Delete();
            selection.TypeBackspace();
            selection.Collapse(E().wdCollapseStart);
            const field = createFieldAt(selection.Range);
            field.Code.Text = P.toWPSFieldCode(code);
            field.Result.Text = P.TEMP_TEXT;
            return true;
        }
        catch (e) {
            U.debug('failed to import hyperlink', e);
            return false;
        }
    }

    function exportDocument(docId, fieldType, instructions) {
        const doc = ctx.doc;
        cleanup();
        let range = doc.Range(0, 0);
        range.InsertAfter(P.EXPORTED_DOCUMENT_MARKER);
        range.Collapse(E().wdCollapseEnd);
        range.InsertParagraph();
        range.Collapse(E().wdCollapseEnd);
        range.InsertParagraph();
        range.Collapse(E().wdCollapseEnd);
        if (instructions) {
            range.InsertAfter(String(instructions));
            range.Collapse(E().wdCollapseEnd);
        }
        range.InsertParagraph();
        range.Collapse(E().wdCollapseEnd);
        range.InsertParagraph();
        range.Collapse(E().wdCollapseEnd);

        // Record where the original document body starts so import can remove
        // the marker/instructions without relying on a fixed paragraph count.
        try {
            setDocProperty(doc, P.TRANSFER_BODY_START_PROP, String(range.Start));
        }
        catch (e) {
            U.debug('failed to record transfer body start', e);
        }

        forEachStoryField(doc, convertFieldToHyperlink);

        const data = getDocProperty(doc, P.DOC_DATA_PROP);
        const endRange = doc.Range(doc.Content.End, doc.Content.End);
        endRange.InsertAfter(P.EXPORTED_PREF_HEAD + data);
        try {
            endRange.Hyperlinks.Add(endRange, P.ZOTERO_LINK);
        }
        catch (e) {
            U.debug('failed to add exported data hyperlink', e);
        }
    }

    function importDocument(docId, fieldType) {
        const doc = ctx.doc;
        if (!isExportedDocument(doc)) {
            return false;
        }

        // The custom document property is less likely to be truncated than
        // the trailing hyperlink, so prefer it and only fall back to the link.
        let data = getDocProperty(doc, P.DOC_DATA_PROP) || null;
        for (let i = doc.Hyperlinks.Count; i > 0; i--) {
            const link = doc.Hyperlinks.Item(i);
            const text = link.TextToDisplay || '';
            if (text.indexOf(P.EXPORTED_PREF_HEAD) === 0) {
                if (data == null) {
                    data = text.substring(P.EXPORTED_PREF_HEAD.length);
                }
                try {
                    link.Range.Select();
                    const selection = doc.ActiveWindow.Selection;
                    link.Delete();
                    selection.TypeBackspace();
                }
                catch (e) {
                    U.debug('failed to remove exported data link', e);
                }
                break;
            }
        }
        if (data != null) {
            setDocProperty(doc, P.DOC_DATA_PROP, data);
        }

        let bodyStart = 0;
        try {
            bodyStart = Number(getDocProperty(doc, P.TRANSFER_BODY_START_PROP));
        }
        catch (e) {
            bodyStart = 0;
        }
        try {
            const selection = doc.ActiveWindow.Selection;
            selection.Start = 0;
            selection.End = 0;
            let validStart = false;
            if (bodyStart > 0 && bodyStart <= doc.Content.End) {
                try {
                    const header = doc.Range(0, bodyStart).Text || '';
                    validStart = header.indexOf(P.EXPORTED_DOCUMENT_MARKER) === 0;
                }
                catch (e) {}
            }
            if (validStart) {
                selection.End = bodyStart;
            }
            else {
                // Older exports did not record the body start.
                selection.MoveEnd(E().wdParagraph, 4);
            }
            selection.TypeBackspace();
        }
        catch (e) {
            U.debug('failed to remove export header', e);
        }
        removeDocProperty(doc, P.TRANSFER_BODY_START_PROP);

        for (let i = doc.Hyperlinks.Count; i > 0; i--) {
            convertHyperlinkToField(doc.Hyperlinks.Item(i));
        }
        for (let i = doc.Footnotes.Count; i > 0; i--) {
            const range = doc.Footnotes.Item(i).Range;
            for (let j = range.Hyperlinks.Count; j > 0; j--) {
                convertHyperlinkToField(range.Hyperlinks.Item(j));
            }
        }
        if (doc.Endnotes) {
            for (let i = doc.Endnotes.Count; i > 0; i--) {
                const range = doc.Endnotes.Item(i).Range;
                for (let j = range.Hyperlinks.Count; j > 0; j--) {
                    convertHyperlinkToField(range.Hyperlinks.Item(j));
                }
            }
        }
        rebuildLocators();
        return true;
    }

    function getStatus() {
        return ctx ? {
            docId: ctx.docId,
            fields: ctx.byIndex.size
        } : null;
    }

    window.ZoteroWPSDoc = {
        begin,
        end,
        cleanup,
        getStatus,
        getDocData,
        setDocData,
        getBibStyle,
        setBibStyle,
        getDocProperty,
        setDocProperty,
        insertField,
        getFields,
        getFieldsNearCursor,
        canInsertField,
        isInLink,
        insertRich,
        setFieldCode,
        setFieldText,
        getFieldText,
        deleteField,
        selectField,
        removeFieldCode,
        activate,
        displayDialog,
        convertToNoteType,
        convertPlaceholdersToFields,
        exportDocument,
        importDocument
    };
})();
