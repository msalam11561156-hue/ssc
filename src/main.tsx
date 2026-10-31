import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initButtonSoundEffect} from './utils/sound';
import { registerSW } from 'virtual:pwa-register';
import { preloadAndCacheOfflineAssets } from './utils/offlineAssetCache';
import { checkAndPerformInPlaceUpgrade } from './utils/upgradeManager';

// التحديث في المكان (In-Place Upgrade) التلقائي وتسجيل الخدمة
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
});

// فحص وحماية ترقية البيانات بدون أي فقدان
checkAndPerformInPlaceUpgrade().catch(() => {});

initButtonSoundEffect();
preloadAndCacheOfflineAssets();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
