import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { initButtonSoundEffect } from './utils/sound';
import { registerSW } from 'virtual:pwa-register';
import { preloadAndCacheOfflineAssets } from './utils/offlineAssetCache';
import { checkAndPerformInPlaceUpgrade } from './utils/upgradeManager';
import { hydrateDeletedSubjectsFromStorage } from './utils/deletedSubjects';

// التحديث في المكان (In-Place Upgrade) التلقائي وتسجيل الخدمة في وضع الإنتاج فقط لتجنب تعارض الكاش مع معاينة التطوير
if (import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
    onOfflineReady() {
      console.log('[PWA] Smart Control ready to work offline');
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

// فحص وحماية ترقية البيانات بدون أي فقدان
checkAndPerformInPlaceUpgrade().catch(() => {});
hydrateDeletedSubjectsFromStorage().catch(() => {});

initButtonSoundEffect();
preloadAndCacheOfflineAssets();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
