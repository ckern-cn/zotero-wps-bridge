/* HTML -> WPS rich text conversion. */
(function () {
    'use strict';

    const U = window.ZoteroWPSUtil;
    const E = function () { return wps.Enum || U.WPS_ENUM_FALLBACK; };

    function isBlockElement(name) {
        return ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'li', 'tr'].indexOf(name) >= 0;
    }

    function hasBlockChildren(element) {
        if (!element || !element.childNodes) {
            return false;
        }
        for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes[i];
            if (child.nodeType === 1 && isBlockElement(child.nodeName.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    function parseStyleAttribute(style, inherited) {
        const result = Object.assign({}, inherited || {});
        if (!style) {
            return result;
        }
        const parts = String(style).split(';');
        for (let part of parts) {
            const idx = part.indexOf(':');
            if (idx < 0) {
                continue;
            }
            const name = part.substring(0, idx).trim().toLowerCase();
            const value = part.substring(idx + 1).trim().toLowerCase();
            if (!value) {
                continue;
            }
            switch (name) {
                case 'font-weight':
                    result.bold = value === 'bold' || value === 'bolder'
                        || parseInt(value, 10) >= 600;
                    break;
                case 'font-style':
                    result.italic = value === 'italic' || value === 'oblique';
                    break;
                case 'text-decoration':
                case 'text-decoration-line':
                    if (value.indexOf('underline') >= 0) {
                        result.underline = true;
                    }
                    if (value.indexOf('line-through') >= 0) {
                        result.strike = true;
                    }
                    break;
                case 'color':
                    result.color = U.parseColor(value);
                    break;
                case 'background-color':
                    result.background = U.parseColor(value);
                    break;
                case 'vertical-align':
                    if (value === 'super') {
                        result.superscript = true;
                    }
                    else if (value === 'sub') {
                        result.subscript = true;
                    }
                    break;
                case 'font-variant':
                case 'font-variant-caps':
                    if (value.indexOf('small-caps') >= 0) {
                        result.smallCaps = true;
                    }
                    break;
                case 'text-transform':
                    result.textTransform = value;
                    break;
                default:
                    break;
            }
        }
        return result;
    }

    function styleForElement(element, inherited) {
        const name = element.nodeName.toLowerCase();
        const result = Object.assign({}, inherited || {});
        if (name === 'b' || name === 'strong') {
            result.bold = true;
        }
        else if (name === 'i' || name === 'em') {
            result.italic = true;
        }
        else if (name === 'u') {
            result.underline = true;
        }
        else if (name === 's' || name === 'strike' || name === 'del') {
            result.strike = true;
        }
        else if (name === 'sup') {
            result.superscript = true;
        }
        else if (name === 'sub') {
            result.subscript = true;
        }
        else if (name === 'a') {
            result.href = element.getAttribute('href') || '';
        }
        return parseStyleAttribute(element.getAttribute('style'), result);
    }

    function highlightColorIndex(rgb) {
        if (!rgb) {
            return null;
        }
        const en = E();
        const colors = [
            [0xaaaaaa, en.wdGray50],
            [0x2ea8e5, en.wdBlue],
            [0xe56eee, en.wdPink],
            [0xa28ae5, en.wdViolet],
            [0x5fb236, en.wdGreen],
            [0xf19837, en.wdDarkYellow],
            [0xff6666, en.wdRed],
            [0xffd400, en.wdYellow]
        ].filter(function (item) { return item[1] != null; });
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = rgb & 0xff;
        let best = null;
        let bestDistance = Infinity;
        for (let item of colors) {
            const cr = (item[0] >> 16) & 0xff;
            const cg = (item[0] >> 8) & 0xff;
            const cb = item[0] & 0xff;
            const distance = (r - cr) * (r - cr) + (g - cg) * (g - cg) + (b - cb) * (b - cb);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = item[1];
            }
        }
        return best;
    }

    function applyFontStyle(range, style) {
        if (!style || !range) {
            return;
        }
        try {
            const font = range.Font;
            if (style.bold) font.Bold = true;
            if (style.italic) font.Italic = true;
            if (style.underline) font.Underline = true;
            if (style.strike) font.StrikeThrough = true;
            if (style.smallCaps) font.SmallCaps = true;
            if (style.superscript) font.Superscript = true;
            if (style.subscript) font.Subscript = true;
            if (style.color) {
                font.TextColor.RGB = U.rgbToBgr(style.color);
            }
            if (style.background) {
                const index = highlightColorIndex(style.background);
                if (index != null) {
                    range.HighlightColorIndex = index;
                }
            }
            if (style.textTransform === 'uppercase') {
                font.AllCaps = true;
            }
        }
        catch (e) {
            U.debug('applyFontStyle failed', e);
        }
    }

    function applyParagraphStyle(range, element) {
        const name = element.nodeName.toLowerCase();
        try {
            if (name === 'h1' || name === 'h2' || name === 'h3' || name === 'h4') {
                const styleName = 'Heading ' + name.charAt(1);
                try {
                    range.Style = styleName;
                }
                catch (e) {
                    range.Style = E()['wdStyleHeading' + name.charAt(1)];
                }
            }
            else if (name === 'blockquote') {
                range.Paragraphs.Format.LeftIndent = U.cm2pt(0.5);
            }
        }
        catch (e) {
            U.debug('applyParagraphStyle failed', e);
        }
    }

    function appendText(range, text, style, ctx) {
        if (!text) {
            return;
        }
        if (style && style.textTransform === 'uppercase') {
            text = String(text).toUpperCase();
        }
        else if (style && style.textTransform === 'lowercase') {
            text = String(text).toLowerCase();
        }
        const doc = range.Document;
        const start = range.End;
        range.InsertAfter(text);
        const end = range.End;
        if (end > start) {
            const textRange = doc.Range(start, end);
            applyFontStyle(textRange, style);
            if (style && style.href) {
                // Add hyperlinks after all text has been inserted. WPS can
                // otherwise extend a hyperlink to include text inserted at its
                // end (e.g. the punctuation after a Zotero note citation).
                ctx.hyperlinks.push({ start: start, end: end, href: style.href });
            }
        }
        range.Collapse(E().wdCollapseEnd);
        ctx.lastWasText = true;
    }

    function insertBreak(range) {
        range.InsertBreak(E().wdLineBreak);
        range.Collapse(E().wdCollapseEnd);
    }

    function insertParagraph(range) {
        range.InsertParagraph();
        range.Collapse(E().wdCollapseEnd);
    }

    function insertList(range, element, style, ctx) {
        const doc = range.Document;
        const ordered = element.nodeName.toLowerCase() === 'ol';
        for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes[i];
            if (child.nodeType !== 1 || child.nodeName.toLowerCase() !== 'li') {
                continue;
            }
            if (i > 0) {
                insertParagraph(range);
            }
            const start = range.End;
            walkChildren(range, child, style, ctx);
            const end = range.End;
            if (end > start) {
                const itemRange = doc.Range(start, end);
                try {
                    if (ordered) {
                        itemRange.ListFormat.ApplyNumberDefault();
                    }
                    else {
                        itemRange.ListFormat.ApplyBulletDefault();
                    }
                }
                catch (e) {
                    U.debug('list formatting failed', e);
                }
            }
        }
    }

    function insertBlock(element, range, style, ctx) {
        const name = element.nodeName.toLowerCase();
        const blockStyle = styleForElement(element, style);
        const start = range.End;
        if (name === 'ul' || name === 'ol') {
            insertList(range, element, style, ctx);
        }
        else if (name === 'table' || name === 'tbody' || name === 'thead') {
            walkChildren(range, element, blockStyle, ctx);
        }
        else if (name === 'tr') {
            walkChildren(range, element, blockStyle, ctx);
            insertParagraph(range);
        }
        else if (name === 'td' || name === 'th') {
            walkChildren(range, element, blockStyle, ctx);
            if (name === 'th' || element.nextSibling) {
                range.InsertAfter('\t');
            }
        }
        else {
            walkChildren(range, element, blockStyle, ctx);
        }
        const end = range.End;
        if (end > start && (name === 'h1' || name === 'h2' || name === 'h3'
                || name === 'h4' || name === 'blockquote' || name === 'pre')) {
            applyParagraphStyle(docRange(range, start, end), element);
        }
    }

    function docRange(range, start, end) {
        return range.Document.Range(start, end);
    }

    function walkChildren(range, element, style, ctx) {
        for (let i = 0; i < element.childNodes.length; i++) {
            walkNode(range, element.childNodes[i], style, ctx);
        }
    }

    function walkNode(range, node, style, ctx) {
        if (!node) {
            return;
        }
        if (node.nodeType === 3) {
            appendText(range, node.nodeValue, style, ctx);
            return;
        }
        if (node.nodeType !== 1) {
            return;
        }
        const name = node.nodeName.toLowerCase();
        if (name === 'br') {
            insertBreak(range);
            return;
        }
        if (name === 'script' || name === 'style') {
            return;
        }
        if (name === 'img') {
            const alt = node.getAttribute('alt');
            if (alt) {
                appendText(range, alt, style, ctx);
            }
            return;
        }
        const childStyle = styleForElement(node, style);
        if (name === 'p' || name === 'div') {
            if (hasBlockChildren(node)) {
                walkChildren(range, node, childStyle, ctx);
                return;
            }
            if (ctx.insertedBlock) {
                insertParagraph(range);
            }
            walkChildren(range, node, childStyle, ctx);
            ctx.insertedBlock = true;
            return;
        }
        if (name === 'ul' || name === 'ol' || name === 'table' || name === 'tr') {
            if (ctx.insertedBlock) {
                insertParagraph(range);
            }
            insertBlock(node, range, style, ctx);
            ctx.insertedBlock = true;
            return;
        }
        if (name === 'li') {
            walkChildren(range, node, childStyle, ctx);
            return;
        }
        if (name === 'h1' || name === 'h2' || name === 'h3' || name === 'h4'
                || name === 'blockquote' || name === 'pre') {
            if (ctx.insertedBlock) {
                insertParagraph(range);
            }
            insertBlock(node, range, style, ctx);
            ctx.insertedBlock = true;
            return;
        }
        walkChildren(range, node, childStyle, ctx);
    }

    function insertHTML(range, html, options) {
        options = options || {};
        const source = String(html == null ? '' : html).replace(/\r/g, '').replace(/\n/g, '');
        const parsed = U.parseHTML('<div>' + source + '</div>');
        if (!parsed || !parsed.body) {
            range.InsertAfter(String(html == null ? '' : html));
            range.Collapse(E().wdCollapseEnd);
            return false;
        }
        const container = parsed.body.firstChild;
        const ctx = {
            insertedBlock: !!options.leadingBlock,
            hyperlinks: []
        };
        if (container) {
            walkChildren(range, container, options.style || {}, ctx);
        }
        for (let link of ctx.hyperlinks) {
            try {
                range.Document.Hyperlinks.Add(
                    range.Document.Range(link.start, link.end), link.href);
            }
            catch (e) {
                U.debug('failed to add hyperlink', link.href, e);
            }
        }
        return true;
    }

    function getBibStyle(doc, field) {
        let value = null;
        try {
            const prop = window.ZoteroWPSDoc.getDocProperty(doc, window.ZoteroWPSProtocol.BIB_STYLE_PROP);
            if (prop) {
                value = JSON.parse(prop);
            }
        }
        catch (e) {
            value = null;
        }
        if (value) {
            return value;
        }
        // Best-effort fallback: derive the tab count from the current result
        // and prefer sane defaults for the rest.
        try {
            const text = field && field.Result ? field.Result.Text : '';
            const match = text.match(/\t+/);
            return {
                firstLineIndent: 0,
                indent: 0,
                lineSpacing: 0,
                entrySpacing: 0,
                tabStops: [],
                tabStopsCount: match ? match[0].length : 0
            };
        }
        catch (e) {
            return null;
        }
    }

    function insertBibliography(range, html, bibStyle) {
        const source = String(html || '').replace(/\r/g, '').replace(/\n/g, '');
        const parsed = U.parseHTML(source);
        if (!parsed || !parsed.body) {
            range.InsertAfter(String(html || ''));
            return 0;
        }
        let entries = Array.prototype.slice.call(parsed.getElementsByClassName('csl-entry'));
        if (!entries.length) {
            entries = Array.prototype.slice.call(parsed.body.children);
        }
        const start = range.End;
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (i > 0) {
                insertParagraph(range);
            }
            const left = entry.getElementsByClassName('csl-left-margin')[0];
            const right = entry.getElementsByClassName('csl-right-inline')[0];
            if (left) {
                walkChildren(range, left, {}, { insertedBlock: false, hyperlinks: [] });
                range.Collapse(E().wdCollapseEnd);
                const tabs = Math.max(1, Number(bibStyle && bibStyle.tabStopsCount) || 1);
                range.InsertAfter('\t'.repeat(tabs));
                range.Collapse(E().wdCollapseEnd);
                if (right) {
                    walkChildren(range, right, {}, { insertedBlock: false, hyperlinks: [] });
                }
            }
            else if (right) {
                walkChildren(range, right, {}, { insertedBlock: false, hyperlinks: [] });
            }
            else {
                walkChildren(range, entry, {}, { insertedBlock: false, hyperlinks: [] });
            }
        }
        const end = range.End;
        if (end > start && bibStyle) {
            try {
                const fmt = range.Document.Range(start, end).Paragraphs.Format;
                fmt.FirstLineIndent = U.twip2pt(bibStyle.firstLineIndent);
                fmt.LeftIndent = U.twip2pt(bibStyle.indent);
                if (bibStyle.lineSpacing) {
                    fmt.LineSpacing = U.twip2pt(bibStyle.lineSpacing);
                }
                fmt.SpaceAfter = U.twip2pt(bibStyle.entrySpacing);
                if (fmt.TabStops) {
                    fmt.TabStops.ClearAll();
                    const tabStops = bibStyle.tabStops || [];
                    for (let j = 0; j < tabStops.length; j++) {
                        fmt.TabStops.Add(U.twip2pt(tabStops[j]), E().wdAlignTabLeft);
                    }
                }
            }
            catch (e) {
                U.debug('bibliography paragraph formatting failed', e);
            }
        }
        return entries.length;
    }

    function setFieldResult(field, html, options) {
        if (!field) {
            return false;
        }
        options = options || {};
        const doc = field.Result.Document;
        const isBib = options.bibliography
            || (field.Code.Text || '').indexOf('ZOTERO_BIBL') >= 0
            || (field.Code.Text || '').indexOf('BIBL ') === 0;
        field.Result.Text = '!';
        let range = field.Result;
        range.Collapse(E().wdCollapseStart);
        try {
            range.MoveStartUntil('!');
            range.MoveStart(E().wdCharacter, 1);
        }
        catch (e) {
            range = field.Result;
            range.Collapse(E().wdCollapseStart);
        }
        let ok = true;
        if (isBib) {
            const style = options.bibStyle || getBibStyle(doc, field);
            insertBibliography(range, html, style);
        }
        else {
            ok = insertHTML(range, html, {});
            if (!ok) {
                range.InsertAfter(String(html || ''));
            }
        }
        try {
            if (field.Result.Text.length > 1) {
                const guard = field.Result;
                guard.Collapse(E().wdCollapseStart);
                guard.Delete(E().wdCharacter, 1);
            }
        }
        catch (e) {
            U.debug('failed to remove field guard', e);
        }
        return ok;
    }

    window.ZoteroWPSRichText = {
        insertHTML,
        insertBibliography,
        setFieldResult,
        getBibStyle
    };
})();
