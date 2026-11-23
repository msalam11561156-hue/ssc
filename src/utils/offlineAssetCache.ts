import { idbGet, idbSet } from './idbStorage';
import topTenCertTemplateUrl from '../assets/images/top_ten_cert_template.webp';
import royalCertTemplateUrl from '../assets/images/top_ten_cert_royal.jpg';
import splashBlueShieldUrl from '../assets/images/blue_shield_bg.jpg';
import splashIllustrationUrl from '../assets/images/control_illustration_1786475473814.jpg';
import splashBrandBgUrl from '../assets/images/splash_brand_bg.jpg';
import splashModernControlUrl from '../assets/images/smart_control_room_modern.jpg';
import splashGoldShieldUrl from '../assets/images/smart_control_gold_shield.jpg';
import splashCloudDashboardUrl from '../assets/images/smart_control_cloud_dashboard.jpg';
import splashScreenshotUrl from '../assets/images/meeting_room_smart.jpg';
import adPrivilegeExampleUrl from '../assets/images/ad_privilege_seat_number_example.jpg';
import brandShieldUrl from '../assets/images/brand_shield.png';
import sponsorAdBannerUrl from '../assets/images/sponsor_ad_banner.jpg';
import privateSchoolExamsUrl from '../assets/images/private_school_exams_1795389408308.jpg';
import newsMicIconUrl from '../assets/images/news_mic_icon.png';

const memoryCache = new Map<string, string>();
const BRAND_SHIELD_CACHE_KEY = 'offline_brand_shield_v2';
const SPONSOR_AD_BANNER_CACHE_KEY = 'offline_sponsor_ad_banner_v1';
const LOGIN_PORTRAIT_CACHE_KEY = 'offline_login_portrait_v1';
const LOGIN_PORTRAIT_URL = '/assets/aistudio/Screenshot_12_bc36452f.jpg';
const LOGIN_EXAM_PORTRAIT_CACHE_KEY = 'offline_login_exam_portrait_v1';
const NEWS_MIC_ICON_CACHE_KEY = 'offline_news_mic_icon_v1';

async function detectImageMimeFromBlob(blob: Blob, url: string): Promise<string | null> {
  if (blob.type && blob.type.toLowerCase().startsWith('image/')) {
    return blob.type.toLowerCase();
  }
  try {
    const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    if (header.length >= 2 && header[0] === 0xff && header[1] === 0xd8) {
      return 'image/jpeg';
    }
    if (header.length >= 4 && header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
      return 'image/png';
    }
    if (
      header.length >= 12 &&
      header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
      header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
    ) {
      return 'image/webp';
    }
    if (header.length >= 4 && header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
      return 'image/gif';
    }
  } catch {
    // Fallback to extension check
  }
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.jfif') || cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  return null;
}

/**
 * تحويل رابط أو Blob إلى Data URL مشفر بصيغة Base64 مع التحقق من صحة نوع الصورة
 */
async function fetchToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:image/')) {
    return url;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status}): ${url}`);
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const isJfif = url.split('?')[0].toLowerCase().endsWith('.jfif');
  if (contentType.includes('text/html')) {
    throw new Error(`Unexpected HTML response instead of image for: ${url}`);
  }
  if (contentType && !contentType.startsWith('image/') && !(isJfif && contentType.includes('application/octet-stream'))) {
    throw new Error(`Invalid image MIME type (${contentType}) for: ${url}`);
  }
  const rawBlob = await res.blob();
  if (!rawBlob.size) {
    throw new Error(`Empty image blob for: ${url}`);
  }
  const detectedMime = await detectImageMimeFromBlob(rawBlob, url);
  if (!detectedMime) {
    throw new Error(`Invalid image blob for: ${url}`);
  }
  const typedBlob = rawBlob.type.toLowerCase().startsWith('image/')
    ? rawBlob
    : new Blob([rawBlob], { type: detectedMime });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (typeof result === 'string' && result.startsWith('data:image/')) {
        resolve(result);
      } else {
        reject(new Error(`Invalid data URL generated for: ${url}`));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(typedBlob);
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

export type SplashType = 'blue_shield' | 'illustration' | 'brand' | 'modern_control' | 'gold_shield' | 'cloud_dashboard' | 'screenshot';

/**
 * جلب وحفظ خلفيات شاشة البداية الافتتاحية محلياً على جهاز العميل (IndexedDB)
 * لضمان التحميل الفوري وعدم فقدانها أبداً في وضع عدم الاتصال
 */
export async function getCachedSplashBackground(type: SplashType): Promise<string> {
  const cacheKey = `offline_splash_bg_${type}_v19`;

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
      ? splashScreenshotUrl
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

export function getBrandShieldSync(): string {
  return memoryCache.get(BRAND_SHIELD_CACHE_KEY) || brandShieldUrl;
}

export function getLoginPortraitSync(): string {
  return memoryCache.get(LOGIN_PORTRAIT_CACHE_KEY) || LOGIN_PORTRAIT_URL;
}

export function getLoginExamPortraitSync(): string {
  return memoryCache.get(LOGIN_EXAM_PORTRAIT_CACHE_KEY) || privateSchoolExamsUrl;
}

export function getSponsorAdBannerSync(): string {
  return memoryCache.get(SPONSOR_AD_BANNER_CACHE_KEY) || sponsorAdBannerUrl;
}

export function getNewsMicIconSync(): string {
  return memoryCache.get(NEWS_MIC_ICON_CACHE_KEY) || newsMicIconUrl;
}

export async function getCachedLoginPortrait(): Promise<string> {
  if (memoryCache.has(LOGIN_PORTRAIT_CACHE_KEY)) {
    return memoryCache.get(LOGIN_PORTRAIT_CACHE_KEY)!;
  }

  try {
    const idbData = await idbGet(LOGIN_PORTRAIT_CACHE_KEY);
    if (idbData && typeof idbData === 'string' && idbData.startsWith('data:image/')) {
      memoryCache.set(LOGIN_PORTRAIT_CACHE_KEY, idbData);
      return idbData;
    }
  } catch (e) {
    console.warn('IDB read warning for login portrait:', e);
  }

  try {
    const dataUrl = await fetchToDataUrl(LOGIN_PORTRAIT_URL);
    memoryCache.set(LOGIN_PORTRAIT_CACHE_KEY, dataUrl);
    idbSet(LOGIN_PORTRAIT_CACHE_KEY, dataUrl).catch(() => {});
    return dataUrl;
  } catch {
    return LOGIN_PORTRAIT_URL;
  }
}

export async function getCachedLoginExamPortrait(): Promise<string> {
  if (memoryCache.has(LOGIN_EXAM_PORTRAIT_CACHE_KEY)) {
    return memoryCache.get(LOGIN_EXAM_PORTRAIT_CACHE_KEY)!;
  }

  try {
    const idbData = await idbGet(LOGIN_EXAM_PORTRAIT_CACHE_KEY);
    if (idbData && typeof idbData === 'string' && idbData.startsWith('data:image/')) {
      memoryCache.set(LOGIN_EXAM_PORTRAIT_CACHE_KEY, idbData);
      return idbData;
    }
  } catch (e) {
    console.warn('IDB read warning for login exam portrait:', e);
  }

  try {
    const dataUrl = await fetchToDataUrl(privateSchoolExamsUrl);
    memoryCache.set(LOGIN_EXAM_PORTRAIT_CACHE_KEY, dataUrl);
    idbSet(LOGIN_EXAM_PORTRAIT_CACHE_KEY, dataUrl).catch(() => {});
    return dataUrl;
  } catch {
    return privateSchoolExamsUrl;
  }
}

/**
 * جلب وحفظ صورة إعلان نافذة (هذا البرنامج برعاية) محلياً على جهاز العميل في IndexedDB
 * لضمان التحميل الفوري والعمل بالكامل بدون اتصال بالإنترنت مثل صور معرض الصور
 */
export async function getCachedSponsorAdBanner(): Promise<string> {
  if (memoryCache.has(SPONSOR_AD_BANNER_CACHE_KEY)) {
    return memoryCache.get(SPONSOR_AD_BANNER_CACHE_KEY)!;
  }

  try {
    const idbData = await idbGet(SPONSOR_AD_BANNER_CACHE_KEY);
    if (idbData && typeof idbData === 'string' && idbData.startsWith('data:image/')) {
      memoryCache.set(SPONSOR_AD_BANNER_CACHE_KEY, idbData);
      return idbData;
    }
  } catch (e) {
    console.warn('IDB read warning for sponsor ad banner:', e);
  }

  try {
    const dataUrl = await fetchToDataUrl(sponsorAdBannerUrl);
    memoryCache.set(SPONSOR_AD_BANNER_CACHE_KEY, dataUrl);
    idbSet(SPONSOR_AD_BANNER_CACHE_KEY, dataUrl).catch(() => {});
    return dataUrl;
  } catch (err) {
    return sponsorAdBannerUrl;
  }
}

/**
 * جلب وحفظ شعار الدرع الذهبي (Brand Shield) محلياً على جهاز العميل في IndexedDB
 * مع الرجوع التلقائي لمسار /brand_shield.png لضمان ظهوره الدائم في كافة القوائم
 */
export async function getCachedBrandShield(): Promise<string> {
  if (memoryCache.has(BRAND_SHIELD_CACHE_KEY)) {
    return memoryCache.get(BRAND_SHIELD_CACHE_KEY)!;
  }

  try {
    const idbData = await idbGet(BRAND_SHIELD_CACHE_KEY);
    if (idbData && typeof idbData === 'string' && idbData.startsWith('data:image/')) {
      memoryCache.set(BRAND_SHIELD_CACHE_KEY, idbData);
      return idbData;
    }
  } catch (e) {
    console.warn('IDB read warning for brand shield:', e);
  }

  for (const candidateUrl of [brandShieldUrl, '/brand_shield.png']) {
    try {
      const dataUrl = await fetchToDataUrl(candidateUrl);
      memoryCache.set(BRAND_SHIELD_CACHE_KEY, dataUrl);
      idbSet(BRAND_SHIELD_CACHE_KEY, dataUrl).catch(() => {});
      return dataUrl;
    } catch {
      // Try next candidate
    }
  }

  return '/brand_shield.png';
}

/**
 * جلب وحفظ أيقونة أخبار الشريط السفلي (PNG) محلياً على جهاز المستخدم في IndexedDB
 * مع الرجوع التلقائي لمسار /assets/images/news_mic_icon.png لضمان عرضها بدون اتصال
 */
export async function getCachedNewsMicIcon(): Promise<string> {
  if (memoryCache.has(NEWS_MIC_ICON_CACHE_KEY)) {
    return memoryCache.get(NEWS_MIC_ICON_CACHE_KEY)!;
  }

  try {
    const idbData = await idbGet(NEWS_MIC_ICON_CACHE_KEY);
    if (idbData && typeof idbData === 'string' && idbData.startsWith('data:image/')) {
      memoryCache.set(NEWS_MIC_ICON_CACHE_KEY, idbData);
      return idbData;
    }
  } catch (e) {
    console.warn('IDB read warning for news mic icon:', e);
  }

  for (const candidateUrl of [newsMicIconUrl, '/assets/images/news_mic_icon.png']) {
    try {
      const dataUrl = await fetchToDataUrl(candidateUrl);
      memoryCache.set(NEWS_MIC_ICON_CACHE_KEY, dataUrl);
      idbSet(NEWS_MIC_ICON_CACHE_KEY, dataUrl).catch(() => {});
      return dataUrl;
    } catch {
      // Try next candidate
    }
  }

  return '/assets/images/news_mic_icon.png';
}

/**
 * حفظ وتخزين جميع قوالب الشهادات، صور وخلفيات شاشة البداية، والأيقونات على جهاز العميل مسبقاً (Pre-cache)
 * يتم استدعاؤها فور تشغيل التطبيق لضمان الأداء الفائق وعدم فقدان أي ملف
 */
export async function preloadAndCacheOfflineAssets(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    // 0. إعطاء الأولوية القصوى لصور نافذة تسجيل الدخول (الشعار + صورتا الفصل والامتحانات) قبل تنزيل الخلفيات الكبيرة
    await Promise.allSettled([
      getCachedBrandShield().catch(() => {}),
      getCachedLoginPortrait().catch(() => {}),
      getCachedLoginExamPortrait().catch(() => {}),
      getCachedNewsMicIcon().catch(() => {}),
    ]);

    // 1. حفظ قوالب الشهادات في IndexedDB
    const certsPromise = Promise.allSettled([
      getCachedCertificateTemplate('royal'),
      getCachedCertificateTemplate('classic'),
    ]);

    // 2. حفظ صور الشاشة الافتتاحية السبع في IndexedDB
    const splashPromise = Promise.allSettled([
      getCachedSplashBackground('blue_shield'),
      getCachedSplashBackground('illustration'),
      getCachedSplashBackground('brand'),
      getCachedSplashBackground('modern_control'),
      getCachedSplashBackground('gold_shield'),
      getCachedSplashBackground('cloud_dashboard'),
      getCachedSplashBackground('screenshot'),
    ]);

    // 3. حفظ نموذج الامتياز الإعلاني وصورة نافذة (هذا البرنامج برعاية) في IndexedDB
    const adExamplePromise = getCachedAdPrivilegeExample().catch(() => {});
    const sponsorBannerPromise = getCachedSponsorAdBanner().catch(() => {});

    // 4. تخزين الأيقونات وصفحة البداية وملف المانيفست محلياً في ذاكرة التخزين الدائم للمتصفح (Cache Storage)
    if ('caches' in window) {
      caches.open('smart-control-offline-assets').then(async (cache) => {
        const shellAssets = [
          '/',
          '/index.html',
          '/manifest.webmanifest',
          '/brand_shield.png',
          '/assets/images/news_mic_icon.png',
          '/appicon.ico',
          '/favicon.ico',
          '/favicon.svg',
          '/pwa-192x192.png',
          '/pwa-512x512.png',
          '/pwa-maskable-512x512.png',
          '/apple-touch-icon.png',
          '/sounds/click.wav',
        ];
        for (const asset of shellAssets) {
          try {
            await cache.add(asset);
          } catch {
            // تجاهل أي فشل فردي عند عدم توفر اتصال
          }
        }
      }).catch(() => {});
    }

    await Promise.allSettled([certsPromise, splashPromise, adExamplePromise, sponsorBannerPromise]);
  } catch (e) {
    console.warn('Preload offline assets warning:', e);
  }
}
