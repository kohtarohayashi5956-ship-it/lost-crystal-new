const CACHE_NAME = 'lost-crystal-v5.2.2-offline-silent-20260722';
const CORE_FILES = [
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

const scopeUrl = new URL('./', self.registration.scope);
const indexUrl = new URL('index.html', scopeUrl).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // index.html is mandatory. Fail install only when the game itself cannot be cached.
    const indexResponse = await fetch(indexUrl, {cache: 'reload'});
    if (!indexResponse.ok) throw new Error('index.html cache failed: ' + indexResponse.status);
    await cache.put(indexUrl, indexResponse.clone());
    await cache.put(scopeUrl.href, indexResponse.clone());

    // Optional shell files are cached independently so one missing icon does not disable offline mode.
    await Promise.allSettled(CORE_FILES.slice(1).map(async path => {
      const url = new URL(path, scopeUrl).href;
      const response = await fetch(url, {cache: 'reload'});
      if (response.ok) await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const exact = await cache.match(event.request, {ignoreSearch: true});
      if (exact) return exact;
      const fallback = await cache.match(indexUrl);
      if (fallback) return fallback;
      return fetch(event.request);
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request, {ignoreSearch: true});
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      return new Response('', {status: 503, statusText: 'Offline'});
    }
  })());
});

self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'CHECK_OFFLINE_READY') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const ready = !!(await cache.match(indexUrl));
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ready, cacheName: CACHE_NAME});
    }
  })());
});
