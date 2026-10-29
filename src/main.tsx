import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initButtonSoundEffect} from './utils/sound';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

initButtonSoundEffect();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
