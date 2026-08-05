// STAR ENTREPRISE — Service Worker (mise en cache pour installation & hors-ligne)
const CACHE = "star-entreprise-v5";
const CORE_ASSETS = [
  "./",
  "index.html",
  "services.html",
  "realisations.html",
  "business-plan.html",
  "apropos.html",
  "contact.html",
  "application.html",
  "manifest.json",
  "assets/css/style.css",
  "assets/js/main.js",
  "assets/js/jardissa.js",
  "assets/js/pwa.js",
  "assets/img/icons/favicon.svg",
  "assets/img/icons/icon-192.png",
  "assets/img/icons/icon-512.png",
  "assets/img/jardissa-avatar.webp",
  "assets/img/jardissa-hero.webp",
  "assets/img/nyc-skyline.webp",
  "assets/img/diamond-real.webp",
  "assets/img/diamond-real-small.webp"
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
