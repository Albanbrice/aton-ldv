// Service worker minimal — requis pour l'installabilité PWA (Chrome Android / Quest)
// Pas de mise en cache : toutes les requêtes passent par le réseau.

const SW_VERSION = "1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));
self.addEventListener("fetch", () => {});
