/**
 * إدارة تفعيل النسخة الرسمية وكلمة المرور اليومية المرتبطة بمعرف الجهاز وتوقيت مصر
 * ونظام احتساب مرات تشغيل البرنامج (5 مرات تشغيل بعد كلمة المرور ثم توليد ID جديد)
 */

export const KEY_IS_PAID_UNLOCKED = 'sheet_control_is_paid_unlocked';
export const KEY_DEVICE_ID = 'sheet_control_device_id';
export const KEY_PAID_RUNS_COUNT = 'sheet_control_paid_runs_count';
export const KEY_PAID_FIRST_ACTIVATED_AT = 'sheet_control_paid_first_activated_at';
export const KEY_PAID_ACTIVE_TIME_MS = 'sheet_control_paid_active_time_ms';
export const KEY_SESSION_RUN_ID = 'sheet_control_session_run_registered';

// حدود الأنظمة الأمنية الثلاثة للنسخة الرسمية (110 مرة / 110 يوم / 200 ساعة)
export const MAX_PAID_RUNS = 110; // الحد الأقصى لمرات الفتح والتشغيل
export const MAX_PAID_DAYS = 110; // الحد الأقصى لعدد الأيام
export const MAX_PAID_HOURS = 200; // الحد الأقصى لساعات العمل الفعلية (200 ساعة)
export const MAX_PAID_ACTIVE_TIME_MS = MAX_PAID_HOURS * 60 * 60 * 1000; // 200 ساعة بالمللي ثانية
export const MAX_PAID_DAYS_MS = MAX_PAID_DAYS * 24 * 60 * 60 * 1000; // 110 يوم بالمللي ثانية

/**
 * تحويل الأرقام العربية المشرقية إلى أرقام إنجليزية
 */
export function normalizeArabicNumbers(str: string): string {
  return str
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .trim();
}

/**
 * توليد ID جديد عشوائي للجهاز يختلف عن المعرف السابق ولا يعتمد أي قيمة افتراضية ثابتة
 */
export function generateNewDeviceId(): number {
  if (typeof window === 'undefined') {
    let rand = Math.floor(Math.random() * 88) + 12;
    while (rand === 13) rand = Math.floor(Math.random() * 88) + 12;
    return rand;
  }
  try {
    let currentId = 0;
    try {
      const saved = localStorage.getItem(KEY_DEVICE_ID);
      currentId = saved ? parseInt(saved, 10) : 0;
    } catch {}

    // توليد أرقام عشوائية من 12 إلى 99 مع استبعاد الرقم 13 نهائياً وعدم تكرار المعرف السابق
    let newId = Math.floor(Math.random() * 88) + 12;
    while (newId === currentId || newId === 13) {
      newId = Math.floor(Math.random() * 88) + 12;
    }
    localStorage.setItem(KEY_DEVICE_ID, newId.toString());
    return newId;
  } catch {
    let rand = Math.floor(Math.random() * 88) + 12;
    while (rand === 13) rand = Math.floor(Math.random() * 88) + 12;
    return rand;
  }
}

/**
 * الحصول على المعرف العشوائي الخاص بالجهاز (بدون أي قيمة افتراضية ثابتة)
 * في حال كان المعرف فارغاً أو مساوياً للرقم الافتراضي القديم 13، يتم توليد معرف عشوائي فريد فوراً
 */
export function getDeviceId(): number {
  if (typeof window === 'undefined') {
    return generateNewDeviceId();
  }
  try {
    const saved = localStorage.getItem(KEY_DEVICE_ID);
    if (saved) {
      const parsed = parseInt(saved, 10);
      // التأكد من أن القيمة صالحة وتجاوز القيمة الافتراضية السابقة 13
      if (!isNaN(parsed) && parsed > 0 && parsed !== 13) {
        return parsed;
      }
    }
    // لا يوجد معرف أو كان 13: توليد معرف عشوائي جديد وتخزينه
    return generateNewDeviceId();
  } catch {
    return generateNewDeviceId();
  }
}

/**
 * الحصول على رقم اليوم في الشهر الحالي بتوقيت مصر (Africa/Cairo)
 */
export function getEgyptDay(): number {
  try {
    const now = new Date();
    const dayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      day: 'numeric',
    }).format(now);
    const day = parseInt(dayStr, 10);
    return isNaN(day) || day < 1 || day > 31 ? now.getDate() : day;
  } catch {
    return new Date().getDate();
  }
}

/**
 * المعادلة اليومية الأساسية لحساب كلمة المرور بتوقيت مصر
 * (الرقم العشوائي للجهاز × رقم اليوم في الشهر) + 1156
 */
export function calculateDailyPassword(deviceId: number, day?: number): string {
  const d = day ?? getEgyptDay();
  return String(deviceId * d + 1156);
}

/**
 * قائمة بكافة الأكواد الصحيحة المقبولة لتسهيل التفعيل والتحقق البرمجي
 */
export function getAllValidPasswords(deviceId: number): string[] {
  const day = getEgyptDay();
  const validCodes = new Set<string>();

  // المعادلة الرسمية الوحيدة المعتمدة: (ID × رقم اليوم في الشهر الحالي بتوقيت مصر) + 1156
  validCodes.add(String(deviceId * day + 1156));

  return Array.from(validCodes);
}

/**
 * التحقق من صحة كلمة المرور المدخلة
 */
export function verifyActivationPassword(input: string, customDeviceId?: number): boolean {
  if (!input) return false;
  const normalized = normalizeArabicNumbers(input);
  const deviceId = customDeviceId ?? getDeviceId();
  const validList = getAllValidPasswords(deviceId);
  return validList.includes(normalized);
}

/**
 * هل تم تفعيل النسخة المدفوعة وحالتها نشطة حالياً؟
 */
/**
 * الحصول على وقت أول تفعيل رسمي بالمللي ثانية
 */
export function getPaidFirstActivatedAt(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = localStorage.getItem(KEY_PAID_FIRST_ACTIVATED_AT);
    return saved ? parseInt(saved, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * الحصول على مجموع وقت الاستخدام الفعلي للنسخة الرسمية بالمللي ثانية
 */
export function getPaidActiveTimeMs(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = localStorage.getItem(KEY_PAID_ACTIVE_TIME_MS);
    return saved ? parseInt(saved, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * إنهاء دورة النسخة الرسمية الحالية وتوليد معرف جهاز جديد
 */
export function expirePaidCycle(): number {
  setPaidUnlocked(false);
  try {
    localStorage.removeItem(KEY_PAID_RUNS_COUNT);
    localStorage.removeItem(KEY_PAID_FIRST_ACTIVATED_AT);
    localStorage.removeItem(KEY_PAID_ACTIVE_TIME_MS);
    sessionStorage.removeItem(KEY_SESSION_RUN_ID);
  } catch {}
  return generateNewDeviceId();
}

/**
 * هل تم تفعيل النسخة المدفوعة وحالتها نشطة حالياً مع تطبيق ترتيب الأولوية الذكي لمصلحة المستخدم:
 * 1. الأولوية الأولى: ساعات التشغيل الفعلي (200 ساعة) - حق المستخدم الصافي في العمل.
 * 2. الأولوية الثانية: عدد الأيام (110 يوم) - مدة الفصل الدراسي والترم.
 * 3. الأولوية الثالثة: مرات الفتح (110 مرة مرنة) - لا يُقفل البرنامج عند 110 فتحة إذا كان لا يزال لديه رصيد ساعات وأيام.
 */
export function isPaidUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isUnlocked = localStorage.getItem(KEY_IS_PAID_UNLOCKED) === 'true';
    if (!isUnlocked) return false;

    // 1. فحص حد ساعات التشغيل الفعلي (200 ساعة) - الأولوية القصوى
    const activeMs = getPaidActiveTimeMs();
    if (activeMs >= MAX_PAID_ACTIVE_TIME_MS) {
      expirePaidCycle();
      return false;
    }

    // 2. فحص حد الأيام (110 يوم) - انتهاء الموسم الدراسي
    const activatedAt = getPaidFirstActivatedAt();
    if (activatedAt > 0 && (Date.now() - activatedAt) > MAX_PAID_DAYS_MS) {
      expirePaidCycle();
      return false;
    }

    // 3. فحص مرات التشغيل بمرونة تضمن مصلحة المستخدم أولاً:
    // إذا وصل المستخدم لـ 110 مرة فتح، ولديه رصيد ساعات وأيام متبقٍ، لا يُقفل البرنامج
    // إلا إذا تجاوز سقف الحماية القصوى (ضعف الحد: 220 مرة لمنع محاولات الإساءة)
    const runs = getPaidRunsCount();
    const hasRemainingHoursAndDays = activeMs < MAX_PAID_ACTIVE_TIME_MS && (activatedAt === 0 || (Date.now() - activatedAt) <= MAX_PAID_DAYS_MS);
    const maxAllowedRuns = hasRemainingHoursAndDays ? (MAX_PAID_RUNS * 2) : MAX_PAID_RUNS;

    if (runs > maxAllowedRuns) {
      expirePaidCycle();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * حفظ حالة التفعيل
 */
export function setPaidUnlocked(unlocked: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_IS_PAID_UNLOCKED, unlocked ? 'true' : 'false');
  } catch (err) {
    console.error('Failed to save activation status:', err);
  }
}

/**
 * تسجيل وقت العمل الفعلي للنسخة الرسمية واختبار الحدود الثلاثة
 */
export function recordPaidActiveTime(deltaMs: number): { isExpired: boolean } {
  if (typeof window === 'undefined') return { isExpired: false };
  if (!isPaidUnlocked()) return { isExpired: true };

  try {
    let currentActiveMs = getPaidActiveTimeMs();
    currentActiveMs += Math.max(0, deltaMs);
    localStorage.setItem(KEY_PAID_ACTIVE_TIME_MS, currentActiveMs.toString());

    // فحص حد ساعات العمل (200 ساعة)
    if (currentActiveMs >= MAX_PAID_ACTIVE_TIME_MS) {
      expirePaidCycle();
      return { isExpired: true };
    }

    // فحص حد الأيام (110 يوم)
    const activatedAt = getPaidFirstActivatedAt();
    if (activatedAt > 0 && (Date.now() - activatedAt) > MAX_PAID_DAYS_MS) {
      expirePaidCycle();
      return { isExpired: true };
    }

    return { isExpired: false };
  } catch {
    return { isExpired: false };
  }
}

/**
 * الحصول على عدد مرات التشغيل المستهلكة من الـ 110
 */
export function getPaidRunsCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = localStorage.getItem(KEY_PAID_RUNS_COUNT);
    return saved ? parseInt(saved, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * الحصول على عدد مرات التشغيل المتبقية
 */
export function getPaidRunsRemaining(): number {
  if (!isPaidUnlocked()) return 0;
  const used = getPaidRunsCount();
  return Math.max(0, MAX_PAID_RUNS - used);
}

/**
 * تفعيل النسخة بعد إدخال كلمة المرور الصحيحة
 * يبدأ حساب الأنظمة الأمنية الثلاثة (110 مرة تشغيل / 110 يوم / 110 ساعة عمل)
 */
export function activatePaidVersion(): void {
  setPaidUnlocked(true);
  try {
    localStorage.setItem(KEY_PAID_RUNS_COUNT, '1');
    localStorage.setItem(KEY_PAID_FIRST_ACTIVATED_AT, Date.now().toString());
    localStorage.setItem(KEY_PAID_ACTIVE_TIME_MS, '0');
    sessionStorage.setItem(KEY_SESSION_RUN_ID, 'true');
  } catch (err) {
    console.error('Failed to set paid activation runs:', err);
  }
}

/**
 * التحقق وتسجيل تشغيل جديد للبرنامج بعد التفعيل الصحيح (Online & Offline):
 * - لا يتم الاحتساب عند إعادة تحميل الصفحة (F5 / Refresh) بفضل قفل الجلسة sessionStorage
 * - يتم الاحتساب فقط عند فتح البرنامج في جلسة تشغيل جديدة أو بعد إغلاق المتصفح وإعادة فتحه
 * - يتم فحص الحدود الثلاثة (110 مرة تشغيل / 110 يوم / 110 ساعة عمل)؛ وأيهم ينتهي أولاً يُنهي الدورة
 */
export function checkAndRegisterPaidLaunch(): {
  isUnlocked: boolean;
  currentRun: number;
  remainingRuns: number;
  justExpired: boolean;
  newDeviceId?: number;
} {
  if (typeof window === 'undefined') {
    return { isUnlocked: false, currentRun: 0, remainingRuns: 0, justExpired: false };
  }

  // إذا لم تكن النسخة مفعلة بكلمة المرور
  if (!isPaidUnlocked()) {
    return { isUnlocked: false, currentRun: 0, remainingRuns: 0, justExpired: false };
  }

  try {
    // التأكد من تهيئة تاريخ أول تفعيل إذا لم يكن مسجلاً مسبقاً
    if (getPaidFirstActivatedAt() <= 0) {
      localStorage.setItem(KEY_PAID_FIRST_ACTIVATED_AT, Date.now().toString());
    }

    // 1. فحص حد ساعات التشغيل الفعلي (110 ساعة) - الأولوية الأولى
    if (getPaidActiveTimeMs() >= MAX_PAID_ACTIVE_TIME_MS) {
      const newId = expirePaidCycle();
      return { isUnlocked: false, currentRun: 0, remainingRuns: 0, justExpired: true, newDeviceId: newId };
    }

    // 2. فحص حد الأيام (110 يوم) - الأولوية الثانية
    const activatedAt = getPaidFirstActivatedAt();
    if (activatedAt > 0 && (Date.now() - activatedAt) > MAX_PAID_DAYS_MS) {
      const newId = expirePaidCycle();
      return { isUnlocked: false, currentRun: 0, remainingRuns: 0, justExpired: true, newDeviceId: newId };
    }

    // 3. التحقق من قفل الجلسة الحالية (لمنع تكرار الاحتساب عند التحديث F5)
    const isSessionAlreadyRegistered = sessionStorage.getItem(KEY_SESSION_RUN_ID) === 'true';

    let currentRuns = getPaidRunsCount();
    if (currentRuns <= 0) {
      currentRuns = 1;
      localStorage.setItem(KEY_PAID_RUNS_COUNT, '1');
    }

    if (!isSessionAlreadyRegistered) {
      // جلسة تشغيل جديدة للبرنامج
      currentRuns += 1;
      sessionStorage.setItem(KEY_SESSION_RUN_ID, 'true');
      localStorage.setItem(KEY_PAID_RUNS_COUNT, currentRuns.toString());
    }

    // فحص مرات التشغيل بمرونة تضمن مصلحة المستخدم أولاً:
    // إذا كان للمستخدم رصيد ساعات عمل وأيام متبقية، لا يُقفل البرنامج عند 110 فتحة، بل يُمنح سقفاً مضاعفاً (220 فتحة)
    const hasRemainingHoursAndDays = getPaidActiveTimeMs() < MAX_PAID_ACTIVE_TIME_MS && (activatedAt === 0 || (Date.now() - activatedAt) <= MAX_PAID_DAYS_MS);
    const maxAllowedRuns = hasRemainingHoursAndDays ? (MAX_PAID_RUNS * 2) : MAX_PAID_RUNS;

    if (currentRuns > maxAllowedRuns) {
      const newId = expirePaidCycle();
      return {
        isUnlocked: false,
        currentRun: currentRuns,
        remainingRuns: 0,
        justExpired: true,
        newDeviceId: newId,
      };
    }

    return {
      isUnlocked: true,
      currentRun: currentRuns,
      remainingRuns: Math.max(0, maxAllowedRuns - currentRuns),
      justExpired: false,
    };
  } catch (err) {
    console.error('Error checking paid launch:', err);
    return {
      isUnlocked: isPaidUnlocked(),
      currentRun: getPaidRunsCount(),
      remainingRuns: getPaidRunsRemaining(),
      justExpired: false,
    };
  }
}

/**
 * إعادة تعيين التفعيل وتوليد ID جديد يدوياً
 */
export function resetPaidActivation(): number {
  return expirePaidCycle();
}

/**
 * دوال التوافق لفحص المزامنة
 */
export async function syncTimeWithServer(): Promise<boolean> {
  return true;
}

export function checkTimeTampering(): boolean {
  return false;
}
