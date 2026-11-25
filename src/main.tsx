import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { registerServiceWorker } from './utils/pwaRegister';
import { preloadAndCacheOfflineAssets } from './utils/offlineAssetCache';

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

// تحميل الشاشات والأصول محلياً في الخلفية فور انتهاء الرسم الأول لضمان العمل الكامل بدون إنترنت
const runDeferredBootstrap = () => {
  scheduleIdle(() => {
    import('./utils/upgradeManager').then((m) => m.checkAndPerformInPlaceUpgrade()).catch(() => {});
    import('./utils/deletedSubjects').then((m) => m.hydrateDeletedSubjectsFromStorage()).catch(() => {});
  }, 1200);

  scheduleIdle(() => {
    preloadAndCacheOfflineAssets();
    import('./utils/prefetchScreens').then((m) => m.prefetchAllScreensForOffline()).catch(() => {});
  }, 1800);
};

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    runDeferredBootstrap();
  } else {
    window.addEventListener('load', runDeferredBootstrap, { once: true });
  }
}

// تسجيل Service Worker في وضع الإنتاج بأمان
registerServiceWorker();
