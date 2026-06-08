"use strict";
/**
 * Shim CJS pour del — permet à Core.js (require/deleteSync) de fonctionner
 * sans modifier le code ATON. Installé via "overrides" dans package.json.
 */
const fs = require("fs");

// glob@13 est présent dans node_modules et expose .sync()
let _globSync = null;
try {
    const g = require("glob");
    _globSync = g.sync || g.globSync;
} catch (_) {}

function deleteSync(patterns, options) {
    [].concat(patterns).forEach((pattern) => {
        // Si glob disponible et le pattern contient des caractères spéciaux
        const files = (_globSync && /[*?{}[\]!]/.test(pattern))
            ? _globSync(pattern, options || {})
            : [pattern];

        files.forEach((f) => {
            try { fs.rmSync(f, { recursive: true, force: true }); } catch (_) {}
        });
    });
}

module.exports = { deleteSync };
