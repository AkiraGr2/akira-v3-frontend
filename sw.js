// AKIRA V3.5 BESTIAL PWA - Service Worker - 100% Gratis - Sin tocar nombres viejos
const CACHE_NAME = "akira-v3-5-bestial-v2";
const URLS_TO_CACHE = [
  "/a/",
  "/a/index.html",
  "/a/js/akira_brain.js",
  "/a/js/hybrid_sync.js",
  "/a/js/obsidian_membrane.js",
  "/a/manifest.json"
];

self.addEventListener("install", event => {
  console.log("🔧 SW Install V3.5 BESTIAL");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE).catch(e => console.log("Cache addAll error", e));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  console.log("🚀 SW Activate V3.5 BESTIAL");
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  // No cachear API calls ni auth
  if (event.request.url.includes("/api/") || event.request.url.includes("google") || event.request.url.includes("gstatic")) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).then(fetchRes => {
        // Cachear solo GET exitosos de nuestro dominio
        if (event.request.method === "GET" && fetchRes.status === 200 && event.request.url.includes("akiragr2.github.io")) {
          const clone = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return fetchRes;
      }).catch(() => {
        // Fallback offline
        if (event.request.destination === "document") {
          return caches.match("/a/");
        }
      });
    })
  );
});
