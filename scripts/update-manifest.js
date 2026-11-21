'use strict';

/**
 * Build the Zotero/Firefox JSON update manifest for one release.
 *
 * @param {Object} options
 * @param {string} options.id Add-on ID
 * @param {string} options.version New version
 * @param {string} options.strictMin Minimum Zotero version
 * @param {string} options.strictMax Maximum Zotero version
 * @param {string} options.updateLink Public XPI URL
 * @param {string} options.updateHash sha256 hex digest
 * @returns {Object}
 */
function createUpdateManifest(options) {
    const {
        id,
        version,
        strictMin,
        strictMax,
        updateLink,
        updateHash
    } = options || {};
    if (!id || !version || !strictMin || !updateLink || !updateHash) {
        throw new Error('createUpdateManifest requires id, version, strictMin, updateLink, and updateHash');
    }
    if (!/^[a-f0-9]{64}$/i.test(updateHash)) {
        throw new Error('updateHash must be a 64-character SHA-256 hex digest');
    }
    return {
        addons: {
            [id]: {
                updates: [
                    {
                        version,
                        update_link: updateLink,
                        update_hash: 'sha256:' + updateHash.toLowerCase(),
                        applications: {
                            zotero: {
                                strict_min_version: strictMin,
                                ...(strictMax ? { strict_max_version: strictMax } : {})
                            }
                        }
                    }
                ]
            }
        }
    };
}

module.exports = { createUpdateManifest };
