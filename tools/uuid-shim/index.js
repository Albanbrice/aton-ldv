"use strict";
/**
 * Shim CJS pour uuid — implémente v4() avec crypto Node.js natif.
 */
const { randomUUID } = require("crypto");

module.exports = {
    v4: () => randomUUID(),
    v1: () => randomUUID(), // fallback acceptable pour l'usage ATON
};
