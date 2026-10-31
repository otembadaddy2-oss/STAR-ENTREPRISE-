// KOMYO — Service Worker : rend l'application installable, garde un écran de secours
// hors connexion, et porte aussi les notifications du staff (sw-staff.js).
importScripts('/starvibe/sw-staff.js');

var CACHE = 'komyo-v7';
var ASSETS = 'komyo-assets-v7';   // images et polices : servies tout de suite depuis le téléphone, mises à jour en arrière-plan
var SHELL = ['/starvibe/index.html', '/starvibe/assets/img/icons/komyo-192-v2.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).catch(function(){}));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k.indexOf('komyo-') === 0 && k !== CACHE && k !== ASSETS; }).map(function(k){ return caches.delete(k); }));
  }));
});
// Réseau d'abord ; si la connexion tombe, on sert la dernière page connue (ou l'accueil).
// Les appels /api/ ne sont jamais mis en cache.
self.addEventListener('fetch', function(e){
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.indexOf('/api/') === 0) return;
  // Images et polices : d'abord la copie du téléphone (affichage immédiat, même réseau lent), puis mise à jour discrète.
  if (/^\/starvibe\/assets\/(img|fonts)\//.test(url.pathname) && /\.(webp|png|jpe?g|svg|woff2|css)$/i.test(url.pathname)) {
    e.respondWith(caches.open(ASSETS).then(function(c){
      return c.match(req).then(function(hit){
        var net = fetch(req).then(function(r){ if (r && r.ok) c.put(req, r.clone()).catch(function(){}); return r; }).catch(function(){ return hit; });
        if (hit) e.waitUntil(net.catch(function(){}));   // la mise à jour continue même après l'affichage de la copie
        return hit || net;
      });
    }));
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function(r){
      var copy = r.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
      return r;
    }).catch(function(){ return caches.match(req).then(function(m){ return m || caches.match('/starvibe/index.html'); }); }));
  }
});
