/* X SAPHIR ARENA — service worker : le jeu fonctionne hors connexion après la première visite. */
const V = 'xs-arena-v1';
const FILES = ['./', 'index.html', 'css/arena.css?v=1', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/data.js?v=1', 'js/core.js?v=1', 'js/ai.js?v=1', 'js/stage.js?v=1', 'js/draw.js?v=1', 'js/fx.js?v=1', 'js/render.js?v=1', 'js/audio.js?v=1', 'js/input.js?v=1', 'js/main.js?v=1',
  'img/calpros-portrait.jpg', 'img/nia-portrait.jpg', 'img/ayanda-portrait.jpg', 'img/kormal-portrait.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k.startsWith('xs-arena')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith('/arena/')) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
