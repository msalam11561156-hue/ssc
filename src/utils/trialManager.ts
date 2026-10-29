import { getDeviceFingerprint } from './deviceFingerprint';

// حدود النسخة التجريبية: 4 ساعات على مدار 4 أيام (ساعة كل يوم)
export const DAILY_TRIAL_HOURS = 1;
export const DAILY_TRIAL_MS = DAILY_TRIAL_HOURS * 60 * 60 * 1000; // 3,600,000 مللي ثانية (ساعة يومياً)
export const MAX_TRIAL_DAYS = 4; // 4 أيام بحد أقصى
export const TOTAL_TRIAL_MS = MAX_TRIAL_DAYS * DAILY_TRIAL_MS; // 4 ساعات إجمالية (14,400,000 مللي ثانية)

export const KEY_TRIAL_DAYS_LIST = 'sheet_control_trial_days_list';
export const KEY_TRIAL_DAILY_USAGE = 'sheet_control_trial_daily_usage';
export const KEY_TRIAL_EXPIRED = 'sheet_control_trial_expired';
export const KEY_TRIAL_IS_ACTIVE = 'sheet_control_is_trial';

export interface TrialInfo {
  hasStarted: boolean;
  isExpired: boolean; // هل انتهت فترة التجربة بالكامل (4 أيام / 4 ساعات)
  isDayExpired: boolean; // هل انتهت حصة اليوم الحالي (ساعة واحدة)
  currentDayNumber: number; // رقم اليوم الحالي من التجربة (1 إلى 4)
  totalDaysAllowed: number; // 4 أيام
  remainingDayMs: number; // الوقت المتبقي لحصة اليوم (من أصل ساعة)
  remainingTotalMs: number; // الوقت المتبقي الإجمالي (من أصل 4 ساعات)
  remainingSeconds: number; // ثواني اليوم المتبقية
  remainingDaysCount: number; // عدد الأيام المتبقية بعد اليوم الحالي
  usedDays: string[]; // قائمة تواريخ الأيام المستخدمة
}

/**
 * الحصول على تاريخ اليوم بتوقيت جمهورية مصر العربية بصيغة YYYY-MM-DD
 */
export function getEgyptDateKey(): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

/**
 * قراءة قائمة الأيام المسجلة من التخزين المحلي
 */
export function getSavedUsedDays(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_TRIAL_DAYS_LIST);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * قراءة سجل الاستهلاك اليومي (بالمللي ثانية) من التخزين المحلي
 */
export function getSavedDailyUsage(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY_TRIAL_DAILY_USAGE);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * تقييم حالة النسخة التجريبية الحالية
 */
export function getTrialInfo(): TrialInfo {
  if (typeof window === 'undefined') {
    return {
      hasStarted: false,
      isExpired: false,
      isDayExpired: false,
      currentDayNumber: 1,
      totalDaysAllowed: MAX_TRIAL_DAYS,
      remainingDayMs: DAILY_TRIAL_MS,
      remainingTotalMs: TOTAL_TRIAL_MS,
      remainingSeconds: 3600,
      remainingDaysCount: MAX_TRIAL_DAYS,
      usedDays: [],
    };
  }

  const isExplicitlyExpired = localStorage.getItem(KEY_TRIAL_EXPIRED) === 'true';
  const usedDays = getSavedUsedDays();
  const dailyUsage = getSavedDailyUsage();
  const todayKey = getEgyptDateKey();

  if (usedDays.length === 0) {
    // إذا لم تبدأ تجربة الـ 4 أيام بعد، يتم تنظيف أي قفل قديم من نظام الـ 30 دقيقة السابق
    if (isExplicitlyExpired) {
      try {
        localStorage.removeItem(KEY_TRIAL_EXPIRED);
      } catch {}
    }
    return {
      hasStarted: false,
      isExpired: false,
      isDayExpired: false,
      currentDayNumber: 1,
      totalDaysAllowed: MAX_TRIAL_DAYS,
      remainingDayMs: DAILY_TRIAL_MS,
      remainingTotalMs: TOTAL_TRIAL_MS,
      remainingSeconds: 3600,
      remainingDaysCount: MAX_TRIAL_DAYS,
      usedDays: [],
    };
  }

  // حساب إجمالي الاستخدام عبر كافة الأيام
  let totalUsageMs = 0;
  for (const day of usedDays) {
    totalUsageMs += Number(dailyUsage[day]) || 0;
  }

  const isTodayIncluded = usedDays.includes(todayKey);
  let effectiveDayNumber = usedDays.indexOf(todayKey) + 1;
  if (effectiveDayNumber <= 0) {
    // اليوم ليس ضمن الأيام المستخدمة بعد
    effectiveDayNumber = usedDays.length + 1;
  }

  // إذا تجاوز المستخدم 4 أيام أو 4 ساعات
  if (isExplicitlyExpired || totalUsageMs >= TOTAL_TRIAL_MS || (!isTodayIncluded && usedDays.length >= MAX_TRIAL_DAYS)) {
    setTrialExpired();
    return {
      hasStarted: true,
      isExpired: true,
      isDayExpired: true,
      currentDayNumber: Math.min(MAX_TRIAL_DAYS, usedDays.length || 1),
      totalDaysAllowed: MAX_TRIAL_DAYS,
      remainingDayMs: 0,
      remainingTotalMs: 0,
      remainingSeconds: 0,
      remainingDaysCount: 0,
      usedDays,
    };
  }

  // استهلاك اليوم الحالي
  const todayConsumedMs = Number(dailyUsage[todayKey]) || 0;
  const remainingDayMs = Math.max(0, DAILY_TRIAL_MS - todayConsumedMs);
  const remainingTotalMs = Math.max(0, TOTAL_TRIAL_MS - totalUsageMs);
  const isDayExpired = remainingDayMs <= 0;

  // إذا انتهى اليوم الرابع وساعته انتهت
  if (effectiveDayNumber >= MAX_TRIAL_DAYS && isDayExpired) {
    setTrialExpired();
    return {
      hasStarted: true,
      isExpired: true,
      isDayExpired: true,
      currentDayNumber: MAX_TRIAL_DAYS,
      totalDaysAllowed: MAX_TRIAL_DAYS,
      remainingDayMs: 0,
      remainingTotalMs: 0,
      remainingSeconds: 0,
      remainingDaysCount: 0,
      usedDays,
    };
  }

  const remainingDaysCount = Math.max(0, MAX_TRIAL_DAYS - (isTodayIncluded ? usedDays.length : (usedDays.length + 1)));

  return {
    hasStarted: true,
    isExpired: false,
    isDayExpired,
    currentDayNumber: Math.min(MAX_TRIAL_DAYS, effectiveDayNumber),
    totalDaysAllowed: MAX_TRIAL_DAYS,
    remainingDayMs,
    remainingTotalMs,
    remainingSeconds: Math.ceil(remainingDayMs / 1000),
    remainingDaysCount,
    usedDays,
  };
}

/**
 * بدء أو تسجيل جلسة اليوم في النسخة التجريبية
 */
export function startTrial(): { success: boolean; isDayExpired?: boolean; isExpired?: boolean } {
  if (typeof window === 'undefined') return { success: false };

  const current = getTrialInfo();
  if (current.isExpired) {
    return { success: false, isExpired: true };
  }

  const todayKey = getEgyptDateKey();
  const usedDays = getSavedUsedDays();
  const dailyUsage = getSavedDailyUsage();

  if (!usedDays.includes(todayKey)) {
    if (usedDays.length >= MAX_TRIAL_DAYS) {
      setTrialExpired();
      return { success: false, isExpired: true };
    }
    usedDays.push(todayKey);
    localStorage.setItem(KEY_TRIAL_DAYS_LIST, JSON.stringify(usedDays));
    if (dailyUsage[todayKey] === undefined) {
      dailyUsage[todayKey] = 0;
      localStorage.setItem(KEY_TRIAL_DAILY_USAGE, JSON.stringify(dailyUsage));
    }
  }

  const todayUsage = dailyUsage[todayKey] || 0;
  if (todayUsage >= DAILY_TRIAL_MS) {
    return { success: false, isDayExpired: true };
  }

  localStorage.setItem(KEY_TRIAL_IS_ACTIVE, 'true');

  // مزامنة مع الخادم
  try {
    const fp = getDeviceFingerprint();
    fetch('/api/trial/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fp, todayKey, todayUsage }),
    }).catch(() => {});
  } catch {}

  return { success: true };
}

/**
 * استهلاك وقت العمل الفعلي للنسخة التجريبية (ساعة يومياً كحد أقصى)
 */
export function consumeTrialTime(deltaMs: number): TrialInfo {
  if (typeof window === 'undefined') return getTrialInfo();

  const todayKey = getEgyptDateKey();
  const usedDays = getSavedUsedDays();
  const dailyUsage = getSavedDailyUsage();

  // التأكد من تسجيل اليوم
  if (!usedDays.includes(todayKey)) {
    if (usedDays.length >= MAX_TRIAL_DAYS) {
      setTrialExpired();
      return getTrialInfo();
    }
    usedDays.push(todayKey);
    localStorage.setItem(KEY_TRIAL_DAYS_LIST, JSON.stringify(usedDays));
  }

  let todayConsumed = (dailyUsage[todayKey] || 0) + Math.max(0, deltaMs);
  dailyUsage[todayKey] = todayConsumed;
  localStorage.setItem(KEY_TRIAL_DAILY_USAGE, JSON.stringify(dailyUsage));

  // مزامنة متقطعة مع الخادم
  if (Math.random() < 0.1) {
    try {
      const fp = getDeviceFingerprint();
      fetch('/api/trial/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fp, todayKey, deltaMs }),
      }).catch(() => {});
    } catch {}
  }

  return getTrialInfo();
}

/**
 * مزامنة حالة الحصة التجريبية مع الخادم للتعرف على نفس الجهاز عبر أي متصفح
 */
export async function syncTrialWithServer(): Promise<TrialInfo> {
  if (typeof window === 'undefined') return getTrialInfo();

  try {
    const fp = getDeviceFingerprint();
    const todayKey = getEgyptDateKey();
    const res = await fetch(`/api/trial/status?fp=${encodeURIComponent(fp)}&todayKey=${todayKey}`);
    if (res.ok) {
      const data = await res.json();
      if (data.isExpired) {
        setTrialExpired();
        return getTrialInfo();
      }

      if (Array.isArray(data.usedDays) && data.usedDays.length > 0) {
        const localDays = getSavedUsedDays();
        const mergedDays = Array.from(new Set([...localDays, ...data.usedDays]));
        localStorage.setItem(KEY_TRIAL_DAYS_LIST, JSON.stringify(mergedDays));
      }

      if (data.dailyUsage && typeof data.dailyUsage === 'object') {
        const localUsage = getSavedDailyUsage();
        const mergedUsage: Record<string, number> = { ...localUsage };
        for (const [d, ms] of Object.entries(data.dailyUsage)) {
          mergedUsage[d] = Math.max(mergedUsage[d] || 0, Number(ms) || 0);
        }
        localStorage.setItem(KEY_TRIAL_DAILY_USAGE, JSON.stringify(mergedUsage));
      }
    }
  } catch (err) {
    console.debug('Trial sync offline or pending:', err);
  }

  return getTrialInfo();
}

export function resetTrial(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY_TRIAL_DAYS_LIST);
  localStorage.removeItem(KEY_TRIAL_DAILY_USAGE);
  localStorage.removeItem(KEY_TRIAL_EXPIRED);
  localStorage.removeItem(KEY_TRIAL_IS_ACTIVE);
}

export function setTrialExpired(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_TRIAL_EXPIRED, 'true');
  localStorage.setItem(KEY_TRIAL_IS_ACTIVE, 'false');

  try {
    const fp = getDeviceFingerprint();
    fetch('/api/trial/expire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fp }),
    }).catch(() => {});
  } catch {}
}

export function isTrialActive(): boolean {
  if (typeof window === 'undefined') return false;
  const info = getTrialInfo();
  if (info.isExpired || info.isDayExpired) {
    localStorage.setItem(KEY_TRIAL_IS_ACTIVE, 'false');
    return false;
  }
  return localStorage.getItem(KEY_TRIAL_IS_ACTIVE) === 'true';
}

export function endTrialSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_TRIAL_IS_ACTIVE, 'false');
}

/**
 * تنسيق الوقت المتبقي بالدقائق والثواني (مثل 59:45)
 */
export function formatTrialTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
