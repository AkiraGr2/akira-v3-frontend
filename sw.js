// AKIRA ULTRA V2.4 - SW AUTO-BORRADO - 102/100 - Nunca se queda pegado en vieja
const CACHE_NAME = 'akira-v24-102-100-20260927';
const OLD_CACHES = ['akira-v22', 'akira-v2', 'akira-ultra', 'akira-cache', 'workbox-precache'];

self.addEventListener('install', (event) => {
  console.log('🔥 SW V2.4 instalando -', CACHE_NAME);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🚀 SW V2.4 activando - borrando caches viejas V2.2');
  event.waitUntil((async () => {
    const keys = await caches.keys();
    for (let key of keys) {
      if (key !== CACHE_NAME) {
        console.log('🗑️ Borrando cache vieja:', key);
        await caches.delete(key);
      }
      for (let old of OLD_CACHES) {
        if (key.includes(old)) {
          await caches.delete(key);
        }
      }
    }
    await self.clients.claim();
    console.log('✅ SW V2.4 activo, cache vieja borrada');
    const clients = await self.clients.matchAll({type: 'window'});
    for (let client of clients) {
      client.postMessage({type: 'AKIRA_UPDATED', version: 'V2.4 102/100'});
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('.html') || url.pathname.includes('akira_brain.js') || url.pathname.includes('hybrid_sync.js') || url.pathname.includes('obsidian_membrane.js')) {
    event.respondWith(
      fetch(event.request, {cache: 'no-store', headers: {'Cache-Control': 'no-cache'}})
        .then(response => { return response; })
        .catch(() => { return caches.match(event.request); })
    );
    return;
  }
  event.respondWith(
    fetch(event.request, {cache: 'no-store'}).catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_CACHE') caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
});
