import { SchoolData, ControlData, StudentData } from '../types';

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

  // Capture all current localStorage entries
  const storage: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          storage[key] = value;
        }
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

    const schoolData: SchoolData = data.schoolData || {};
    const controlDataByStage = data.controlDataByStage || {};
    const studentsDataByStage = data.studentsDataByStage || {};
    const storage = data.storage || {};

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

export const applyBackupRestore = (payload: BackupPayload): void => {
  try {
    // 1. If payload contains storage snapshot, write all keys to localStorage
    if (payload.storage && typeof payload.storage === 'object') {
      Object.entries(payload.storage).forEach(([k, v]) => {
        try {
          localStorage.setItem(k, v);
        } catch (e) {
          console.warn(`Could not set localStorage key ${k}:`, e);
        }
      });
    }

    // 2. Ensure explicit key persistence
    if (payload.schoolData) {
      localStorage.setItem('sheet_control_school_data', JSON.stringify(payload.schoolData));
      if (payload.schoolData.schoolLogo) {
        localStorage.setItem('sheet_control_school_logo', payload.schoolData.schoolLogo);
      }
    }

    if (payload.controlDataByStage) {
      localStorage.setItem(
        'sheet_control_control_data_by_stage',
        JSON.stringify(payload.controlDataByStage)
      );
    }

    if (payload.studentsDataByStage) {
      localStorage.setItem(
        'sheet_control_students_data',
        JSON.stringify(payload.studentsDataByStage)
      );
    }
  } catch (err) {
    console.error('Error applying backup to localStorage:', err);
    throw err;
  }
};
