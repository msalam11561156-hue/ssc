import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initButtonSoundEffect} from './utils/sound';
import { registerSW } from 'virtual:pwa-register';
import { preloadAndCacheOfflineAssets } from './utils/offlineAssetCache';

registerSW({ immediate: true });

initButtonSoundEffect();
preloadAndCacheOfflineAssets();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
