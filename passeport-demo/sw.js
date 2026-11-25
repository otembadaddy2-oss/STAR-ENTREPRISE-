/* Hors connexion : tout le nécessaire est gardé sur l'appareil après la première visite. */
const V = 'passeport-sur-v8';
const FICHIERS = ['./', 'index.html', 'app.js', 'app-suite.js', 'sync.js', 'ecran.html', 'lib/jsqr.js', 'logo.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'img/brazzaville-esplanade.webp', 'img/brazzaville-ville.webp', 'img/batiment-rond.webp', 'img/passeport-visas.webp', 'img/empreinte.webp', 'img/aeroport.webp', 'img/star-entreprise.webp', 'lib/chart.umd.js', 'lib/xlsx.full.min.js', 'lib/qrcode.js',
  'polices/inter-display-300.woff2', 'polices/inter-display-600.woff2', 'polices/inter-display-800.woff2', 'polices/playfair-display-latin-800-normal.woff2', 'polices/playfair-display-latin-700-italic.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return; const u = new URL(e.request.url); if (u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))); });
