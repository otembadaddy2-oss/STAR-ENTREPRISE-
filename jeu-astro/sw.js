/* ASTRO QUEST — service worker : le jeu s'installe sur le téléphone et fonctionne SANS connexion (tout est en cache). */
var VERSION = 'astro-v2';
var FICHIERS = ['./', './index.html', './game.js', './premium.js', './polices/inter-display-300.woff2', './polices/inter-display-600.woff2', './polices/inter-display-800.woff2', './polices/jbmono-500.woff2', './polices/jbmono-700.woff2', './questions.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FICHIERS); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('astro-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
// Réseau d'abord (le jeu se met à jour tout seul), sinon la copie du téléphone.
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(function (rep) { var copie = rep.clone(); caches.open(VERSION).then(function (c) { c.put(r, copie); }); return rep; }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('./index.html'); }); }));
});
