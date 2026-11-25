import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    assetsInclude: ['**/*.jfif'],
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: [
          'favicon.ico', 
          'appicon.ico', 
          'apple-touch-icon.png', 
          'favicon.svg', 
          'pwa-32x32.png',
          'pwa-48x48.png',
          'pwa-96x96.png',
          'pwa-192x192.png', 
          'pwa-256x256.png',
          'pwa-512x512.png', 
          'pwa-maskable-512x512.png', 
          'brand_shield.png',
          'assets/aistudio/Screenshot_1_33782f4f.jpg',
          'assets/aistudio/1234_fe7474fc.jpg',
          'assets/aistudio/Screenshot_39_f29a76cd.jpg',
          'assets/aistudio/Screenshot_17_c02a8e5f.jpg',
          'docs/control-work-guide.pdf',
          'sounds/click.wav'
        ],
        manifest: {
          id: '/',
          name: 'Smart Control',
          short_name: 'SmartControl',
          description: 'نظام متكامل لإدارة شيتات الكنترول المدرسي، درجات الطلاب، والنسخ الاحتياطية يعمل بالكامل حتى بدون إنترنت.',
          theme_color: '#059669',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-48x48.png',
              sizes: '48x48',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-96x96.png',
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-256x256.png',
              sizes: '256x256',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,jpg,jpeg,gif,webp,jfif,wav}'],
          globIgnores: ['assets/aistudio/**'],
          maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
          runtimeCaching: [
            {
              // Local static scripts, CSS stylesheets and workers (including dev modules & dynamic screen chunks)
              urlPattern: ({ url, request }) =>
                url.origin === self.location.origin &&
                !url.pathname.startsWith('/api/') &&
                (request.destination === 'script' ||
                  request.destination === 'style' ||
                  request.destination === 'worker'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'app-static-assets',
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Images and Media (including sounds and local assets)
              urlPattern: ({ url, request }) =>
                url.origin === self.location.origin &&
                (request.destination === 'image' ||
                  request.destination === 'audio'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'app-media-cache',
                expiration: {
                  maxEntries: 160,
                  maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Google Fonts Stylesheets
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Google Fonts Webfonts
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 15,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'vendor-motion': ['motion'],
            'vendor-xlsx': ['xlsx'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: false,
      // Disable file watching to save CPU and speed up cold startup when HMR is disabled.
      watch: null,
    },
  };
});
