// KINDIMBOU — Service Worker (installation & fonctionnement hors-ligne)
const CACHE = "kindimbou-v1";
const CORE_ASSETS = [
  "./",
  "index.html",
  "confidentialite.html",
  "manifest.json",
  "assets/css/guichet.css",
  "assets/js/guichet.js",
  "assets/img/kindimbou-emblem.png",
  "assets/img/kindimbou-wordmark.png",
  "assets/img/icons/icon-192.png",
  "assets/img/icons/icon-512.png",
  "assets/img/icons/icon-192-maskable.png",
  "assets/img/icons/icon-512-maskable.png",
  "assets/img/icons/favicon-96.png",
  "assets/img/icons/apple-touch-icon.png"
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
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return; // never cache API calls
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && event.request.url.startsWith(self.location.origin)) {
            const clone = networkResponse.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
