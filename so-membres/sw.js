// S.O — Gestion des membres — Service Worker (installation & fonctionnement hors-ligne)
const CACHE = "so-membres-v2";
const CORE_ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "assets/css/so-membres.css",
  "assets/js/so-membres.js",
  "assets/vendor/xlsx.core.min.js",
  "assets/img/logo-so.jpg",
  "assets/img/icons/favicon-96.png",
  "assets/img/icons/icon-192.png",
  "assets/img/icons/icon-512.png",
  "../assets/css/effects-v1.css",
  "../assets/js/effects-v1.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;
  // Réseau en priorité pour rester à jour (l'app évolue) ; le cache ne sert
  // que de secours hors-ligne, jamais comme réponse par défaut.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") return caches.match("index.html");
        })
      )
  );
});
