import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initButtonSoundEffect} from './utils/sound';
import { registerSW } from 'virtual:pwa-register';
import { preloadAndCacheOfflineAssets } from './utils/offlineAssetCache';
import { checkAndPerformInPlaceUpgrade } from './utils/upgradeManager';

// التحديث في المكان (In-Place Upgrade) التلقائي وتسجيل الخدمة لضمان العمل بدون إنترنت
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

// ضمان تسجيل /sw.js للعمل فورياً بدون اتصال بالإنترنت
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

// فحص وحماية ترقية البيانات بدون أي فقدان
checkAndPerformInPlaceUpgrade().catch(() => {});

initButtonSoundEffect();
preloadAndCacheOfflineAssets();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
