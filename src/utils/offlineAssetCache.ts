import { idbGet, idbSet } from './idbStorage';
import topTenCertTemplateUrl from '../assets/images/top_ten_cert_template.webp';
import royalCertTemplateUrl from '../assets/images/top_ten_cert_royal.jpg';
import splashBlueShieldUrl from '../assets/images/blue_shield_bg.jfif';
import splashIllustrationUrl from '../assets/images/control_illustration_1786475473814.jpg';
import splashBrandBgUrl from '../assets/images/splash_brand_bg.jpg';
import splashModernControlUrl from '../assets/images/smart_control_room_modern.jpg';
import splashGoldShieldUrl from '../assets/images/smart_control_gold_shield.jfif';
import splashCloudDashboardUrl from '../assets/images/smart_control_cloud_dashboard.jfif';
import adPrivilegeExampleUrl from '../assets/images/ad_privilege_seat_number_example.jpg';

const memoryCache = new Map<string, string>();

/**
 * تحويل رابط أو Blob إلى Data URL مشفر بصيغة Base64
 */
async function fetchToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * جلب قالب شهادة التقدير المخزن محلياً على جهاز العميل في IndexedDB
 * في حالة عدم وجوده، يتم حفظه محلياً لعدم استدعائه من السيرفر مجدداً
 */
export async function getCachedCertificateTemplate(design: 'classic' | 'royal'): Promise<string> {
  const cacheKey = `offline_cert_template_${design}`;

  // 1. فحص الذاكرة المؤقتة (Memory Cache)
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. فحص التخزين المحلي الدائم IndexedDB على جهاز العميل
  try {
    const idbData = await idbGet(cacheKey);
    if (idbData && typeof idbData === 'string' && idbData.startsWith('data:image/')) {
      memoryCache.set(cacheKey, idbData);
      return idbData;
    }
  } catch (e) {
    console.warn('IDB read warning for certificate template:', e);
  }

  // 3. التحميل الأولي من ملفات الحزمة وحفظه في IndexedDB لجهاز العميل
  const targetUrl = design === 'royal' ? royalCertTemplateUrl : topTenCertTemplateUrl;
  try {
    const dataUrl = await fetchToDataUrl(targetUrl);
    memoryCache.set(cacheKey, dataUrl);
    // حفظ دائم في قاعدة بيانات المتصفح بجهاز العميل
    idbSet(cacheKey, dataUrl).catch(() => {});
    return dataUrl;
  } catch (err) {
    console.warn('Failed to convert certificate template to data URL, falling back to asset URL:', err);
    return targetUrl;
  }
}

export type SplashType = 'blue_shield' | 'illustration' | 'brand' | 'modern_control' | 'gold_shield' | 'cloud_dashboard' | 'screenshot' | 'screenshot2';

/**
 * جلب وحفظ خلفيات شاشة البداية الافتتاحية محلياً على جهاز العميل (IndexedDB)
 * لضمان التحميل الفوري وعدم فقدانها أبداً في وضع عدم الاتصال
 */
export async function getCachedSplashBackground(type: SplashType): Promise<string> {
  const cacheKey = `offline_splash_bg_${type}_v13`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  try {
    const idbData = await idbGet(cacheKey);
    if (idbData && typeof idbData === 'string' && idbData.startsWith('data:image/')) {
      memoryCache.set(cacheKey, idbData);
      return idbData;
    }
  } catch (e) {
    console.warn('IDB read warning for splash background:', e);
  }

  const targetUrl = 
    type === 'blue_shield' 
      ? splashBlueShieldUrl 
      : type === 'illustration' 
      ? splashIllustrationUrl 
      : type === 'brand' 
      ? splashBrandBgUrl 
      : type === 'modern_control'
      ? splashModernControlUrl
      : type === 'gold_shield'
      ? splashGoldShieldUrl
      : type === 'screenshot'
      ? '/assets/aistudio/ASD56565_2b16dafd.jfif'
      : type === 'screenshot2'
      ? '/assets/aistudio/dfsfdsf_0cbe4c45.jfif'
      : splashCloudDashboardUrl;

  try {
    const dataUrl = await fetchToDataUrl(targetUrl);
    memoryCache.set(cacheKey, dataUrl);
    idbSet(cacheKey, dataUrl).catch(() => {});
    return dataUrl;
  } catch (err) {
    return targetUrl;
  }
}

/**
 * جلب وحفظ نموذج الامتياز الإعلاني (بطاقة رقم الجلوس) محلياً على جهاز العميل في IndexedDB
 * لضمان العرض الفوري والعمل بدون اتصال بالإنترنت
 */
export async function getCachedAdPrivilegeExample(): Promise<string> {
  const cacheKey = 'offline_ad_privilege_example_v1';

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  try {
    const idbData = await idbGet(cacheKey);
    if (idbData && typeof idbData === 'string' && idbData.startsWith('data:image/')) {
      memoryCache.set(cacheKey, idbData);
      return idbData;
    }
  } catch (e) {
    console.warn('IDB read warning for ad privilege example:', e);
  }

  try {
    const dataUrl = await fetchToDataUrl(adPrivilegeExampleUrl);
    memoryCache.set(cacheKey, dataUrl);
    idbSet(cacheKey, dataUrl).catch(() => {});
    return dataUrl;
  } catch (err) {
    return adPrivilegeExampleUrl;
  }
}

/**
 * حفظ وتخزين جميع قوالب الشهادات، صور وخلفيات شاشة البداية، والأيقونات على جهاز العميل مسبقاً (Pre-cache)
 * يتم استدعاؤها فور تشغيل التطبيق لضمان الأداء الفائق وعدم فقدان أي ملف
 */
export async function preloadAndCacheOfflineAssets(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    // 1. حفظ قوالب الشهادات في IndexedDB
    const certsPromise = Promise.allSettled([
      getCachedCertificateTemplate('royal'),
      getCachedCertificateTemplate('classic'),
    ]);

    // 2. حفظ صور الشاشة الافتتاحية الست في IndexedDB
    const splashPromise = Promise.allSettled([
      getCachedSplashBackground('blue_shield'),
      getCachedSplashBackground('illustration'),
      getCachedSplashBackground('brand'),
      getCachedSplashBackground('modern_control'),
      getCachedSplashBackground('gold_shield'),
      getCachedSplashBackground('cloud_dashboard'),
      getCachedSplashBackground('screenshot'),
      getCachedSplashBackground('screenshot2'),
    ]);

    // 3. حفظ نموذج الامتياز الإعلاني في IndexedDB
    const adExamplePromise = getCachedAdPrivilegeExample().catch(() => {});

    // 4. تخزين الأيقونات محلياً في ذاكرة التخزين الدائم للمتصفح
    if ('caches' in window) {
      caches.open('smart-control-offline-assets').then((cache) => {
        cache.addAll([
          '/appicon.ico',
          '/favicon.ico',
          '/favicon.svg',
          '/pwa-192x192.png',
          '/pwa-512x512.png',
          '/pwa-maskable-512x512.png',
          '/apple-touch-icon.png'
        ]).catch(() => {});
      }).catch(() => {});
    }

    await Promise.allSettled([certsPromise, splashPromise, adExamplePromise]);
  } catch (e) {
    console.warn('Preload offline assets warning:', e);
  }
}
