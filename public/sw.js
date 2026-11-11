// Smart Control - Ultra Reliable Offline Service Worker
const CACHE_NAME = 'smart-control-offline-v3';
const STATIC_CACHE_NAME = 'smart-control-static-v3';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/appicon.ico',
  '/favicon.ico',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/sounds/click.wav',
  '/assets/images/splash_brand_bg.jpg',
  '/assets/images/splash_control_illustration.jpg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of CORE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          // Skip if missing or optional
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME && key !== STATIC_CACHE_NAME && key.startsWith('smart-control')) {
              return caches.delete(key);
            }
          })
        );
      }),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET and chrome extension requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Bypass API calls to server
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 1. Navigation requests (Opening the app, launching from home screen / desktop icon, reloading)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          // Attempt network first with a 2-second timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const networkResponse = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('/', networkResponse.clone());
            cache.put('/index.html', networkResponse.clone());
            return networkResponse;
          }
        } catch (err) {
          // Offline or network timeout - proceed to offline cache
        }

        // Offline fallback: serve cached index.html or root
        const cachedHtml = (await caches.match('/index.html')) || (await caches.match('/'));
        if (cachedHtml) {
          return cachedHtml;
        }

        const anyCached = await caches.match(request);
        if (anyCached) return anyCached;

        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })()
    );
    return;
  }

  // 2. Static Resources (Scripts, Stylesheets, Images, Fonts, Media)
  event.respondWith(
    (async () => {
      // Check cache first
      const cached = await caches.match(request);
      if (cached) {
        // Background revalidate for scripts and styles when online
        if (navigator.onLine && (request.destination === 'script' || request.destination === 'style')) {
          fetch(request)
            .then(async (fresh) => {
              if (fresh && fresh.status === 200) {
                const cache = await caches.open(STATIC_CACHE_NAME);
                cache.put(request, fresh);
              }
            })
            .catch(() => {});
        }
        return cached;
      }

      // Not in cache: fetch from network and store in cache
      try {
        const response = await fetch(request);
        if (response && (response.status === 200 || response.status === 0)) {
          const cache = await caches.open(STATIC_CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (err) {
        // Fallback for missing images/icons when offline
        if (request.destination === 'image') {
          const fallbackIcon = await caches.match('/pwa-192x192.png');
          if (fallbackIcon) return fallbackIcon;
        }
        throw err;
      }
    })()
  );
});
