import { SchoolData, ControlData, StudentData } from '../types';
import { idbSetStrict, idbSet, idbRemove } from './idbStorage';

// مفاتيح البيانات الضخمة أو المكررة التي لا يجب تكرار تخزينها في localStorage أو داخل كائن storage بالنسخة الاحتياطية
const BULKY_STUDENT_STORAGE_KEYS = new Set([
  'sheet_control_students_data',
  'sheet_control_official_students_data',
  'sheet_control_trial_students_data',
]);

const LOGO_STORAGE_KEYS = new Set([
  'sheet_control_school_logo',
  'sheet_control_official_school_logo',
  'sheet_control_trial_school_logo',
]);

// الحد الأقصى الآمن لحجم النص المسموح بتخزينه اختيارياً في localStorage لبيانات الطلاب (~800 كيلوحرف)
export const MAX_LOCAL_STORAGE_STUDENTS_CHARS = 800_000;

export const safeLocalStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const cleanupExcessStorageKeys = (): void => {
  try {
    BULKY_STUDENT_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    });
    LOGO_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    });
  } catch {}
};

export interface BackupMetadata {
  appName: string;
  version: string;
  exportDate: string;
  formattedDate: string;
  schoolName: string;
  administration: string;
  stage: string;
  educationType: string;
  totalStudents: number;
  stagesCount: number;
  keysCount: number;
}

export interface BackupPayload {
  version: string;
  appName: string;
  exportDate: string;
  metadata: BackupMetadata;
  schoolData: SchoolData;
  controlDataByStage: Record<string, ControlData>;
  studentsDataByStage: Record<string, StudentData[]>;
  storage: Record<string, string>;
}

export const countTotalStudents = (studentsData: Record<string, StudentData[]>): number => {
  if (!studentsData || typeof studentsData !== 'object') return 0;
  return Object.values(studentsData).reduce((sum, list) => {
    return sum + (Array.isArray(list) ? list.length : 0);
  }, 0);
};

export const createBackupPayload = (
  schoolData: SchoolData,
  controlDataByStage: Record<string, ControlData>,
  studentsDataByStage: Record<string, StudentData[]>
): BackupPayload => {
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(now);

  // التقاط الإعدادات الخفيفة من localStorage مع استبعاد مفاتيح بيانات الطلاب الضخمة والمكررة
  // لأن studentsDataByStage موجودة بالفعل في الحقل الرئيسي للنسخة الاحتياطية
  const storage: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || BULKY_STUDENT_STORAGE_KEYS.has(key)) continue;
      if (schoolData?.schoolLogo && LOGO_STORAGE_KEYS.has(key)) continue;
      const value = localStorage.getItem(key);
      if (value !== null) {
        storage[key] = value;
      }
    }
  } catch (e) {
    console.warn('Failed to read some localStorage items:', e);
  }

  const totalStudents = countTotalStudents(studentsDataByStage);
  const stagesCount = Object.keys(studentsDataByStage || {}).length;

  const metadata: BackupMetadata = {
    appName: 'نظام الكنترول المدرسي الذكي 2026-2027',
    version: '2026.1',
    exportDate: now.toISOString(),
    formattedDate,
    schoolName: schoolData.schoolName || 'المدرسة',
    administration: schoolData.administration || '',
    stage: schoolData.stage || '',
    educationType: schoolData.educationType || '',
    totalStudents,
    stagesCount,
    keysCount: Object.keys(storage).length,
  };

  return {
    version: '2026.1',
    appName: 'smart-school-control',
    exportDate: now.toISOString(),
    metadata,
    schoolData,
    controlDataByStage,
    studentsDataByStage,
    storage,
  };
};

export const saveBackupToFile = async (
  payload: BackupPayload
): Promise<{ success: boolean; cancelled?: boolean; error?: string }> => {
  const cleanSchool = (payload.schoolData.schoolName || 'الكنترول').replace(/[/\\?%*:|"<>]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `نسخة_احتياطية_كنترول_${cleanSchool}_${dateStr}.json`;
  const jsonContent = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });

  // 1. Try modern File System Access API (showSaveFilePicker)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'ملف نسخة احتياطية لكنترول المدرسة (JSON)',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { success: true };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User deliberately cancelled the file picker dialog
        return { success: false, cancelled: true };
      }
      // SecurityError or restricted iframe sandbox: fall through to standard download
      console.info('showSaveFilePicker not permitted or failed, falling back to download link:', err);
    }
  }

  // 2. Fallback: Trigger standard browser save/download dialog
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to trigger download:', err);
    return { success: false, error: err?.message || 'حدث خطأ أثناء تنزيل الملف' };
  }
};

export interface ParsedBackupResult {
  valid: boolean;
  error?: string;
  payload?: BackupPayload;
  summary?: {
    schoolName: string;
    administration: string;
    exportDateFormatted: string;
    stageLabel: string;
    totalStudents: number;
    stagesCount: number;
    settingsCount: number;
  };
}

export const parseAndValidateBackup = (jsonString: string): ParsedBackupResult => {
  try {
    const data = JSON.parse(jsonString);

    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'الملف لا يحتوي على كائن بيانات JSON صالح.' };
    }

    // Verify it is a valid backup from this app or contains core control data
    const hasCoreData =
      data.studentsDataByStage ||
      data.schoolData ||
      (data.storage && Object.keys(data.storage).length > 0);

    if (!hasCoreData) {
      return {
        valid: false,
        error: 'الملف المحدد لا يحتوي على بيانات أو إعدادات كنترول متوافقة مع هذا النظام.',
      };
    }

    const storage: Record<string, string> = data.storage || {};
    const schoolData: SchoolData = data.schoolData || {};
    const controlDataByStage = data.controlDataByStage || {};

    let studentsDataByStage: Record<string, StudentData[]> = data.studentsDataByStage || {};
    if (
      (!studentsDataByStage || Object.keys(studentsDataByStage).length === 0) &&
      (storage['sheet_control_official_students_data'] || storage['sheet_control_students_data'])
    ) {
      try {
        const legacyRaw =
          storage['sheet_control_official_students_data'] || storage['sheet_control_students_data'];
        const parsedLegacy = JSON.parse(legacyRaw);
        if (parsedLegacy && typeof parsedLegacy === 'object') {
          studentsDataByStage = parsedLegacy;
        }
      } catch {}
    }

    const totalStudents = countTotalStudents(studentsDataByStage);
    const stagesCount = Object.keys(studentsDataByStage).length;

    let exportDateFormatted = data.metadata?.formattedDate;
    if (!exportDateFormatted && data.exportDate) {
      try {
        exportDateFormatted = new Intl.DateTimeFormat('ar-EG', {
          dateStyle: 'full',
          timeStyle: 'medium',
        }).format(new Date(data.exportDate));
      } catch {
        exportDateFormatted = data.exportDate;
      }
    }

    const summary = {
      schoolName: schoolData.schoolName || data.metadata?.schoolName || 'غير محدد',
      administration: schoolData.administration || data.metadata?.administration || 'غير محدد',
      exportDateFormatted: exportDateFormatted || 'غير مسجل',
      stageLabel: schoolData.stage || 'متعدد المراحل',
      totalStudents,
      stagesCount,
      settingsCount: Object.keys(storage).length,
    };

    const payload: BackupPayload = {
      version: data.version || '1.0',
      appName: data.appName || 'smart-school-control',
      exportDate: data.exportDate || new Date().toISOString(),
      metadata: data.metadata || {
        appName: 'نظام الكنترول المدرسي',
        version: '1.0',
        exportDate: data.exportDate || new Date().toISOString(),
        formattedDate: summary.exportDateFormatted,
        schoolName: summary.schoolName,
        administration: summary.administration,
        stage: summary.stageLabel,
        educationType: schoolData.educationType || '',
        totalStudents,
        stagesCount,
        keysCount: summary.settingsCount,
      },
      schoolData,
      controlDataByStage,
      studentsDataByStage,
      storage,
    };

    return { valid: true, payload, summary };
  } catch (err: any) {
    return {
      valid: false,
      error: 'تعذر قراءة الملف. يرجى التأكد من أن الملف بصيغة JSON غير تالفة.',
    };
  }
};

export const applyBackupRestore = async (payload: BackupPayload): Promise<void> => {
  try {
    // 1. تنظيف المفاتيح الضخمة والمكررة من localStorage أولاً لإتاحة أقصى مساحة ممكنة
    cleanupExcessStorageKeys();

    // 2. استرجاع المفاتيح الخفيفة والإعدادات فقط إلى localStorage (مع تجاهل بيانات الطلاب والشعار المكرر)
    if (payload.storage && typeof payload.storage === 'object') {
      Object.entries(payload.storage).forEach(([k, v]) => {
        if (BULKY_STUDENT_STORAGE_KEYS.has(k)) return;
        if (payload.schoolData?.schoolLogo && LOGO_STORAGE_KEYS.has(k)) return;
        if (typeof v !== 'string') return;
        safeLocalStorageSet(k, v);
      });
    }

    // 3. حفظ بيانات المدرسة والشعار (الشعار يُحفظ في IndexedDB بشكل مضمون، واختيارياً في localStorage إن توفرت مساحة)
    if (payload.schoolData) {
      const logo = payload.schoolData.schoolLogo || '';
      if (logo) {
        await idbSet('idb_official_school_logo', logo);
      } else {
        await idbRemove('idb_official_school_logo');
      }

      const schoolDataJson = JSON.stringify(payload.schoolData);
      const savedOfficialSchool = safeLocalStorageSet('sheet_control_official_school_data', schoolDataJson);
      if (!savedOfficialSchool && logo) {
        // إذا كان الشعار ضخماً وتسبب في تجاوز السعة، نحفظ بيانات المدرسة بدونه في localStorage ويبقى الشعار في IndexedDB
        const lightSchoolData = { ...payload.schoolData, schoolLogo: '' };
        const lightJson = JSON.stringify(lightSchoolData);
        safeLocalStorageSet('sheet_control_official_school_data', lightJson);
        safeLocalStorageSet('sheet_control_school_data', lightJson);
      } else {
        safeLocalStorageSet('sheet_control_school_data', schoolDataJson);
        if (logo && logo.length < 350_000) {
          safeLocalStorageSet('sheet_control_school_logo', logo);
        }
      }
    }

    // 4. حفظ إعدادات الكنترول واللجان في IndexedDB و localStorage بأمان
    if (payload.controlDataByStage) {
      await idbSet('idb_official_control_data_by_stage', payload.controlDataByStage);
      const controlJson = JSON.stringify(payload.controlDataByStage);
      safeLocalStorageSet('sheet_control_official_control_data_by_stage', controlJson);
      safeLocalStorageSet('sheet_control_control_data_by_stage', controlJson);
    }

    // 5. حفظ بيانات الطلاب الضخمة مباشرةً في IndexedDB لضمان نجاح الاسترجاع مهما كَبُر حجمها
    // مع إبقاء نسخة واحدة اختيارية فقط في localStorage إذا كان حجمها صغيراً جداً، ومنع التكرار نهائياً
    if (payload.studentsDataByStage) {
      await idbSetStrict('idb_official_students_data', payload.studentsDataByStage);

      // ضمان عدم وجود المفتاح المكرر القديم إطلاقاً
      try {
        localStorage.removeItem('sheet_control_students_data');
      } catch {}

      try {
        const studentsJson = JSON.stringify(payload.studentsDataByStage);
        if (studentsJson.length <= MAX_LOCAL_STORAGE_STUDENTS_CHARS) {
          if (!safeLocalStorageSet('sheet_control_official_students_data', studentsJson)) {
            localStorage.removeItem('sheet_control_official_students_data');
          }
        } else {
          localStorage.removeItem('sheet_control_official_students_data');
        }
      } catch {
        try {
          localStorage.removeItem('sheet_control_official_students_data');
        } catch {}
      }
    }
  } catch (err) {
    console.error('Error applying backup restore:', err);
    throw err;
  }
};
