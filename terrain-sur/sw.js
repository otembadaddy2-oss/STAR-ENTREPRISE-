// TERRAIN SÛR : fonctionne sans connexion une fois ouvert une première fois. Aucune donnée n'est envoyée en ligne.
const V = 'terrain-sur-v1', FICHIERS = ['./', 'index.html', 'app.js', 'analyse.js', 'regles.js', 'journal.js', 'donnees-demo.js', 'pdf.js', 'lib/qrcode.js', 'lib/jsqr.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'img/eau.jpg', 'img/piste.jpg', 'img/boue.jpg', 'img/sable.jpg', 'img/chantier.jpg', 'img/sol-brun.jpg', 'img/terrassement.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k.startsWith('terrain-sur')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return; e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
