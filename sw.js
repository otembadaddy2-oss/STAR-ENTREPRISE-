// STAR ENTREPRISE — Service Worker (mise en cache pour installation & hors-ligne)
const CACHE = "star-entreprise-v18";
const CORE_ASSETS = [
  "./",
  "index.html",
  "services.html",
  "realisations.html",
  "business-plan.html",
  "apropos.html",
  "contact.html",
  "application.html",
  "devis.html",
  "manifest.json",
  "assets/css/style-v5.css",
  "assets/js/main-v2.js",
  "assets/js/jardissa-v6.js",
  "assets/js/pwa-v2.js",
  "assets/js/i18n-v3.js",
  "assets/js/devis-v1.js",
  "assets/vendor/qrcode-v1.min.js",
  "assets/img/icons/favicon-star-v2.png",
  "assets/img/icons/icon-192-v3.png",
  "assets/img/icons/icon-512-v3.png",
  "assets/img/icons/icon-192-maskable-v3.png",
  "assets/img/icons/icon-512-maskable-v3.png",
  "assets/img/jardissa-avatar-v2.webp",
  "assets/img/jardissa-hero-v2.webp",
  "assets/img/nyc-skyline.webp",
  "assets/img/diamond-real-v2.webp",
  "assets/img/logo-star-mark-v2.webp"
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
  if (event.request.url.indexOf("/api/") !== -1) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") return caches.match("index.html");
        });
    })
  );
});
