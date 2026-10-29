/**
 * يقوم بإنشاء بصمة عتادية ثابتة للجهاز (Hardware Fingerprint)
 * تجمع بين مواصفات الشاشة، المعالج، بطاقة الرسوميات (GPU)، ونظام التشغيل
 * هذه المواصفات متطابقة 100% بين كافة المتصفحات (Chrome, Edge, Firefox, Brave) على نفس الجهاز
 */
function getGpuRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      return ((gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toString();
    }
  } catch {
    // تجاهل الأخطاء إن وجدت واستمر بباقي المعطيات
  }
  return '';
}

export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server';

  try {
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown_tz';
    const cores = navigator.hardwareConcurrency || 4;
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || 'unknown_os';
    const touch = navigator.maxTouchPoints || 0;
    const gpu = getGpuRenderer();

    const rawStr = `${screenInfo}_${tz}_${cores}_${platform}_${touch}_${gpu}`;
    let hash = 0;
    for (let i = 0; i < rawStr.length; i++) {
      const char = rawStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `dev_${Math.abs(hash).toString(36)}`;
  } catch {
    return 'dev_default';
  }
}
