// AKIRA SERVICE-WORKER KILL SWITCH
// This project no longer uses a service worker. Keep this file at the same URL
// so previously installed registrations can update to this inert worker,
// activate once, clear old caches, and unregister themselves.

const KILL_VERSION = "akira-sw-kill-2026-10-06";

self.addEventListener("install", (event) => {
  console.log("[AKIRA SW] kill switch installing", KILL_VERSION);
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (_) {}

    try {
      await self.registration.unregister();
    } catch (_) {}

    try {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        try {
          client.postMessage({ type: "AKIRA_SW_DISABLED", version: KILL_VERSION });
        } catch (_) {}
      }
    } catch (_) {}
  })());
});
