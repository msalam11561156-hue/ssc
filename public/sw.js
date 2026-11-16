// Smart Control - Ultra Reliable Offline Service Worker
const CACHE_NAME = 'smart-control-offline-v4';
const STATIC_CACHE_NAME = 'smart-control-static-v4';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/brand_shield.png',
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

const IMAGE_EXT_REGEX = /\.(png|jpg|jpeg|gif|svg|webp|jfif|ico)$/i;
const SCRIPT_EXT_REGEX = /\.(js|mjs)$/i;
const STYLE_EXT_REGEX = /\.css$/i;

function isValidStaticResponse(request, url, response) {
  if (!response || response.status !== 200) return false;
  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  // Never cache or serve HTML documents for non-HTML static assets
  if (contentType.includes('text/html')) {
    return false;
  }

  if (request.destination === 'image' || IMAGE_EXT_REGEX.test(url.pathname)) {
    return contentType === '' || contentType.startsWith('image/');
  }
  if (request.destination === 'script' || SCRIPT_EXT_REGEX.test(url.pathname)) {
    return contentType === '' || contentType.includes('javascript') || contentType.includes('ecmascript');
  }
  if (request.destination === 'style' || STYLE_EXT_REGEX.test(url.pathname)) {
    return contentType === '' || contentType.includes('text/css');
  }
  return true;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of CORE_ASSETS) {
        try {
          const response = await fetch(asset, { cache: 'no-cache' });
          if (response && response.status === 200) {
            await cache.put(asset, response);
          }
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

  // Ignore non-GET and non-http(s) requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Bypass API calls and Vite dev server internal routes
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/@id/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // 1. Navigation requests (HTML documents)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const networkResponse = await fetch(request, {
            signal: controller.signal,
            cache: 'no-cache',
          });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            const ct = (networkResponse.headers.get('content-type') || '').toLowerCase();
            if (ct.includes('text/html')) {
              const cache = await caches.open(CACHE_NAME);
              cache.put('/', networkResponse.clone());
              cache.put('/index.html', networkResponse.clone());
            }
            return networkResponse;
          }
        } catch (err) {
          // Offline or network timeout - proceed to offline cache
        }

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
      const staticCache = await caches.open(STATIC_CACHE_NAME);
      const cached = await caches.match(request);

      if (cached) {
        if (isValidStaticResponse(request, url, cached)) {
          // Background revalidate scripts, styles, and unhashed root images when online
          const isUnhashedRootImage = url.pathname === '/brand_shield.png';
          if (
            navigator.onLine &&
            (request.destination === 'script' || request.destination === 'style' || isUnhashedRootImage)
          ) {
            fetch(request)
              .then(async (fresh) => {
                if (isValidStaticResponse(request, url, fresh)) {
                  await staticCache.put(request, fresh);
                }
              })
              .catch(() => {});
          }
          return cached;
        } else {
          // Purge poisoned cached entry (e.g., HTML cached under image URL)
          await staticCache.delete(request).catch(() => {});
        }
      }

      // Not in cache: fetch from network and store only valid responses
      try {
        const response = await fetch(request);
        if (isValidStaticResponse(request, url, response)) {
          staticCache.put(request, response.clone()).catch(() => {});
          return response;
        }
        // If server returned HTML or 404 for an image (e.g. stale hashed asset URL), try brand_shield fallback
        if (request.destination === 'image' || IMAGE_EXT_REGEX.test(url.pathname)) {
          if (url.pathname.includes('brand_shield')) {
            const shieldFallback = (await caches.match('/brand_shield.png')) || (await fetch('/brand_shield.png').catch(() => null));
            if (shieldFallback && shieldFallback.status === 200) {
              return shieldFallback;
            }
          }
        }
        return response;
      } catch (err) {
        if (request.destination === 'image' || IMAGE_EXT_REGEX.test(url.pathname)) {
          if (url.pathname.includes('brand_shield')) {
            const shieldCached = await caches.match('/brand_shield.png');
            if (shieldCached) return shieldCached;
          }
          const fallbackIcon = await caches.match('/pwa-192x192.png');
          if (fallbackIcon) return fallbackIcon;
        }
        throw err;
      }
    })()
  );
});
