const CACHE_NAME = 'spasi-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/spasi-logo.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan intercept: non-GET, API routes, Next.js internals, atau cross-origin
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/__nextjs') ||
    url.origin !== self.location.origin
  ) {
    return; // biarkan browser handle normal
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Simpan ke cache jika sukses
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback ke cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Jika tidak ada di cache, kembalikan response kosong (jangan undefined)
          return new Response('Offline — koneksi tidak tersedia.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
  );
});
