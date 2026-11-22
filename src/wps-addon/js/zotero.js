/* Zotero HTTP integration client for WPS. */
(function () {
    'use strict';

    const U = window.ZoteroWPSUtil;
    const P = window.ZoteroWPSProtocol;
    const Doc = window.ZoteroWPSDoc;

    function Client(docId) {
        this.docId = docId;
        this.base = U.getURLBase();
        this.config = U.getConfig();
        this.token = this.config.token || '';
        this.done = false;
        this.failed = false;
    }

    Client.prototype.request = function (path, payload) {
        const response = U.postJSON(this.base + path, Object.assign({
            token: this.token
        }, payload), {
            sync: true,
            token: this.token
        });
        return response;
    };

    Client.prototype.ping = function () {
        const response = U.postJSON(this.base + '/wps/ping', {}, { sync: true });
        return response;
    };

    Client.prototype.reset = function () {
        try {
            this.request('/wps/reset', {});
        }
        catch (e) {
            U.debug('reset failed', e);
        }
    };

    Client.prototype.setLayout = function (layout) {
        return this.request('/wps/layout', { layout: layout });
    };

    Client.prototype.respond = function (payload) {
        return this.request('/wps/respond', { payload: payload });
    };

    Client.prototype.errorPayload = function (error) {
        return {
            error: error && error.userFacing ? 'Alert' : (error && error.name) || 'Error',
            message: (error && error.message) || String(error),
            stack: (error && error.stack) || ''
        };
    };

    Client.prototype.handleCommand = function (payload) {
        const method = String(payload.command || '').split('.')[1];
        const args = Array.prototype.slice.call(payload.arguments || []);
        const handler = this.responders[method];
        if (!handler) {
            throw new Error(U.t('wps.error.unsupportedCommand', { command: payload.command }));
        }
        if (args.length > 0 && args[0] !== this.docId && method !== 'getActiveDocument') {
            throw new Error(U.t('wps.error.docIdMismatch'));
        }
        return handler.call(this, args);
    };

    Client.prototype.transact = function (command) {
        let indexStarted = false;
        let txStarted = false;
        try {
            Doc.begin(this.docId, U.getActiveDocument());
            indexStarted = true;
            let response = this.request('/wps/execCommand', {
                command: command,
                docId: this.docId
            });
            if (response.status === 503) {
                throw this.makeError(U.t('wps.error.busyOtherDoc'));
            }
            if (response.status === 403) {
                throw this.makeError(U.t('wps.error.invalidToken'));
            }
            if (response.status !== 200) {
                throw this.makeError(U.t('wps.error.http', {
                    status: response.status,
                    text: response.text || ''
                }));
            }
            txStarted = true;

            while (response && response.status === 200 && response.json
                    && response.json.command) {
                const payload = response.json;
                if (payload.command === 'Document.complete') {
                    this.done = true;
                    return !this.failed;
                }
                let result;
                try {
                    result = this.handleCommand(payload);
                }
                catch (e) {
                    this.failed = true;
                    U.debug('command failed', payload.command, e);
                    result = this.errorPayload(e);
                }
                response = this.respond(result);
            }
            if (!this.done) {
                throw this.makeError(U.t('wps.error.unexpectedEnd'));
            }
            return !this.failed;
        }
        catch (e) {
            // Only reset a transaction this client actually started. Resetting
            // after a 503 busy response would abort the other document's
            // transaction instead of just reporting the conflict.
            if (txStarted) {
                this.reset();
            }
            throw e;
        }
        finally {
            if (indexStarted) {
                try { Doc.cleanup(); } catch (e) { U.debug('cleanup failed', e); }
                Doc.end();
            }
        }
    };

    Client.prototype.makeError = function (message, userFacing) {
        const error = new Error(message);
        error.userFacing = userFacing !== false;
        return error;
    };

    Client.prototype.responders = {
        getActiveDocument: function () {
            return {
                documentID: this.docId,
                outputFormat: 'html',
                supportedNotes: ['footnotes', 'endnotes'],
                supportsImportExport: true,
                supportsTextInsertion: true,
                supportsCitationMerging: true,
                processorName: 'WPS Writer'
            };
        },

        displayAlert: function (args) {
            return Doc.displayDialog(this.docId, args[1], args[2], args[3]);
        },

        activate: function () {
            Doc.activate(this.docId);
            return null;
        },

        canInsertField: function () {
            return Doc.canInsertField(this.docId);
        },

        setDocumentData: function (args) {
            Doc.setDocData(U.getActiveDocument(), args[1]);
            return null;
        },

        getDocumentData: function () {
            return Doc.getDocData(U.getActiveDocument());
        },

        cursorInField: function () {
            return Doc.getFieldsNearCursor(this.docId);
        },

        insertField: function (args) {
            const noteType = Number(args[2]) || 0;
            return Doc.insertField(this.docId, noteType);
        },

        insertText: function (args) {
            Doc.insertRich(this.docId, args[1]);
            return null;
        },

        getFields: function () {
            return Doc.getFields(this.docId);
        },

        convert: function (args) {
            Doc.convertToNoteType(this.docId, args[1], args[3]);
            return null;
        },

        convertPlaceholdersToFields: function (args) {
            return Doc.convertPlaceholdersToFields(this.docId, args[1], args[2]);
        },

        setBibliographyStyle: function (args) {
            Doc.setBibStyle(U.getActiveDocument(), args[1], args[2], args[3],
                args[4], args[5], args[6]);
            return null;
        },

        complete: function () {
            this.done = true;
            return undefined;
        },

        delete: function (args) {
            Doc.deleteField(this.docId, args[1]);
            return null;
        },

        select: function (args) {
            Doc.selectField(this.docId, args[1]);
            return null;
        },

        removeCode: function (args) {
            Doc.removeFieldCode(this.docId, args[1]);
            return null;
        },

        setText: function (args) {
            Doc.setFieldText(this.docId, args[1], args[2], args[3] !== false);
            return null;
        },

        getText: function (args) {
            return Doc.getFieldText(this.docId, args[1]);
        },

        setCode: function (args) {
            Doc.setFieldCode(this.docId, args[1], args[2]);
            return null;
        },

        exportDocument: function (args) {
            Doc.exportDocument(this.docId, args[1], args[2]);
            return null;
        },

        importDocument: function (args) {
            return Doc.importDocument(this.docId, args[1]);
        }
    };

    function create(docId) {
        return new Client(docId);
    }

    window.ZoteroWPSClient = {
        create: create,
        Client: Client
    };
})();
