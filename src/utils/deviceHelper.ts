import { useState, useEffect } from 'react';

/**
 * Checks whether the current device is a mobile phone (narrow screen or mobile UA, excluding tablets).
 */
export function isMobilePhoneDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTabletUA = /iPad|Tablet|PlayBook|Silk/i.test(ua);

  // Tablets typically have viewports >= 768px (iPad, Android tablets, etc.)
  const isNarrow = window.innerWidth < 768;

  // If user is on a tablet with width >= 768px, it is considered tablet
  if (isTabletUA && window.innerWidth >= 768) {
    return false;
  }

  return isNarrow || (isMobileUA && !isTabletUA);
}

/**
 * React hook to reactively track whether the device is a mobile phone.
 */
export function useIsMobilePhone(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobilePhoneDevice());

  useEffect(() => {
    const handleCheck = () => {
      setIsMobile(isMobilePhoneDevice());
    };

    window.addEventListener('resize', handleCheck);
    window.addEventListener('orientationchange', handleCheck);

    return () => {
      window.removeEventListener('resize', handleCheck);
      window.removeEventListener('orientationchange', handleCheck);
    };
  }, []);

  return isMobile;
}

/**
 * Determines whether the app is currently running inside the developer preview
 * (AI Studio `ais-dev-*` host or local dev server) rather than the end-user / shared (`ais-pre-*` or production) environment.
 */
export function isDeveloperPreviewMode(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.startsWith('ais-pre-')) return false;
  if (
    hostname.startsWith('ais-dev-') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  ) {
    return true;
  }
  return Boolean(import.meta.env.DEV);
}

