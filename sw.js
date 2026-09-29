// AKIRA ULTRA V2.5 - SW SIN INTERCEPTAR BACKEND
// V8-Fase9-fix: el SW SOLO cachea assets del mismo origen (HTML, JS, CSS, imagenes).
// Deja pasar sin tocar cualquier peticion al backend (akira-empresa.onrender.com)
// o a APIs externas. Antes interceptaba TODO y rompia el header Authorization.

const CACHE_NAME = 'akira-v25-20260929';
const OLD_CACHES = ['akira-v22', 'akira-v2', 'akira-ultra', 'akira-cache', 'workbox-precache', 'akira-v24-102-100-20260927'];

// Rutas que SI podemos cachear (mismo origen, assets estaticos)
const CACHEABLE_EXTENSIONS = ['.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ico', '.json', '.webmanifest'];

self.addEventListener('install', (event) => {
  console.log('🔥 SW V2.5 instalando -', CACHE_NAME);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🚀 SW V2.5 activando - borrando caches viejas');
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
    console.log('✅ SW V2.5 activo');
  })());
});

function _isSameOrigin(url){
  try { return new URL(url).origin === self.location.origin; } catch(e){ return false; }
}

function _isCacheableAsset(url){
  try {
    const u = new URL(url);
    if (u.origin !== self.location.origin) return false;
    const path = u.pathname.toLowerCase();
    // No cachear el propio sw.js
    if (path.endsWith('/sw.js')) return false;
    return CACHEABLE_EXTENSIONS.some(ext => path.endsWith(ext));
  } catch(e){ return false; }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // V8-Fase9-fix: NO interceptar nada que no sea GET (POST/PATCH/OPTIONS/etc pasan directo)
  if (req.method !== 'GET') {
    return; // dejar pasar sin interceptar
  }

  // V8-Fase9-fix: NO interceptar peticiones a otro origen (backend, APIs externas)
  if (!_isSameOrigin(req.url)) {
    return; // dejar pasar sin interceptar
  }

  // V8-Fase9-fix: NO interceptar si no es un asset cacheable
  if (!_isCacheableAsset(req.url)) {
    return;
  }

  // Para assets del mismo origen: red primero, cache si falla
  event.respondWith(
    fetch(req, {cache: 'no-store'})
      .then(response => response)
      .catch(() => caches.match(req))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_CACHE') caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
});
