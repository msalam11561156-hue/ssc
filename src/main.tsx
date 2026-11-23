import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

const scheduleIdle = (cb: () => void, timeout = 1500) => {
  if (typeof window === 'undefined') return;
  const ric = (window as Window & { requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(cb, { timeout });
  } else {
    window.setTimeout(cb, Math.min(timeout, 300));
  }
};

// Initialize sound listener shortly after first paint without blocking LCP
scheduleIdle(() => {
  import('./utils/sound').then((m) => m.initButtonSoundEffect()).catch(() => {});
}, 200);

// Run upgrade checks, deleted-subject hydration, and offline asset precaching after page load/idle
const runDeferredBootstrap = () => {
  scheduleIdle(() => {
    import('./utils/upgradeManager').then((m) => m.checkAndPerformInPlaceUpgrade()).catch(() => {});
    import('./utils/deletedSubjects').then((m) => m.hydrateDeletedSubjectsFromStorage()).catch(() => {});
  }, 1500);

  scheduleIdle(() => {
    import('./utils/offlineAssetCache').then((m) => m.preloadAndCacheOfflineAssets()).catch(() => {});
  }, 3500);
};

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    runDeferredBootstrap();
  } else {
    window.addEventListener('load', runDeferredBootstrap, { once: true });
  }
}

// التحديث في المكان (In-Place Upgrade) التلقائي وتسجيل الخدمة في وضع الإنتاج فقط لتجنب تعارض الكاش مع معاينة التطوير
if (import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
    onOfflineReady() {
      console.log('[PWA] Smart Control 0.1 ready to work offline');
    },
    onRegisterError(err) {
      console.warn('[PWA] Service worker registration error:', err);
    },
  });

  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Active Service Worker registered:', registration.scope);
          registration.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration info:', err);
        });
    });
  }
} else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // إزالة أي Service Worker قديم في بيئة التطوير لمنع ظهور شاشة بيضاء أو ملفات مخزنة قديمة
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister().catch(() => {}));
  }).catch(() => {});
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        if (key.startsWith('smart-control') || key.startsWith('workbox')) {
          caches.delete(key).catch(() => {});
        }
      });
    }).catch(() => {});
  }
}
