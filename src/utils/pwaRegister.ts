export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (import.meta.env.DEV) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          const scriptUrl =
            registration.active?.scriptURL ||
            registration.waiting?.scriptURL ||
            registration.installing?.scriptURL ||
            '';
          if (scriptUrl.includes('dev-sw.js')) {
            registration.unregister().catch(() => {});
          }
        }
      }).catch(() => {});
    }
    return;
  }
  try {
    import('virtual:pwa-register').then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            updateSW(true);
          }
        },
        onOfflineReady() {
          console.log('[PWA] Smart Control 0.1 cached locally for offline use');
        },
        onRegisterError(err) {
          console.warn('[PWA] Service worker registration info:', err);
        },
      });
    }).catch(() => {});
  } catch {
    // ignore
  }
}
