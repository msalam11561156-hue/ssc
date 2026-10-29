import { StudentData, AssessmentGrades } from '../types';

export interface GradingSettings {
  showName: boolean;
  showSeatNumber: boolean;
  showSecretNumber: boolean;
  password?: string;
  isLocked?: boolean;
  isMercyEnabled?: boolean;
  mercyMaxSubjects?: number;
  mercyMaxPercentage?: number;
  mercyTargetScreen?: 'written' | 'assessments';
  mercyDefaultsV2?: boolean;
}

export interface SubjectMercyBoost {
  subjectKey: string;
  originalActualGrade: number;
  boostAmount: number;
  boostedActualGrade: number;
  actualPct?: number;
}

export const BACKUP_PASSWORD = '123456';

export const DEFAULT_GRADING_SETTINGS: GradingSettings = {
  showName: true,
  showSeatNumber: true,
  showSecretNumber: true,
  password: '',
  isLocked: false,
  isMercyEnabled: false,
  mercyMaxSubjects: 2,
  mercyMaxPercentage: 10,
  mercyTargetScreen: 'written',
  mercyDefaultsV2: true,
};

const STORAGE_KEY = 'sheet_control_grading_display_settings';
const MERCY_GRADE_STORAGE_PREFIX = 'sheet_control_mercy_grade_settings_v2_';

const normalizeStageKey = (stage?: string): string => {
  if (!stage) return 'default';
  if (stage === 'prep' || stage === 'middle') return 'middle';
  return stage.trim();
};

const normalizeGradeKey = (selectedGrade?: string): string => {
  if (!selectedGrade) return 'default';
  const g = selectedGrade
    .replace(' الابتدائي', '')
    .replace(' الإعدادي', '')
    .replace(' الثانوي', '')
    .trim();
  if (g === 'الصف الأول' || g === 'الصف الاول' || g.toLowerCase() === '1st grade') return 'grade_1';
  if (g === 'الصف الثاني' || g === 'الصف الثانى' || g.toLowerCase() === '2nd grade') return 'grade_2';
  if (g === 'الصف الثالث' || g.toLowerCase() === '3rd grade') return 'grade_3';
  if (g === 'الصف الرابع' || g.toLowerCase() === '4th grade') return 'grade_4';
  if (g === 'الصف الخامس' || g.toLowerCase() === '5th grade') return 'grade_5';
  if (g === 'الصف السادس' || g.toLowerCase() === '6th grade') return 'grade_6';
  return g;
};

const getMercyStorageKey = (stage?: string, selectedGrade?: string): string => {
  return `${MERCY_GRADE_STORAGE_PREFIX}${normalizeStageKey(stage)}_${normalizeGradeKey(selectedGrade)}`;
};

export const getGradingSettings = (stage?: string, selectedGrade?: string): GradingSettings => {
  let baseSettings: GradingSettings = { ...DEFAULT_GRADING_SETTINGS };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      baseSettings = {
        ...baseSettings,
        showName: parsed.showName ?? true,
        showSeatNumber: parsed.showSeatNumber ?? true,
        showSecretNumber: parsed.showSecretNumber ?? true,
        password: parsed.password || '',
        isLocked: parsed.isLocked ?? false,
      };
    }

    const mercyKey = getMercyStorageKey(stage, selectedGrade);
    const savedMercy = localStorage.getItem(mercyKey);
    if (savedMercy) {
      const parsedMercy = JSON.parse(savedMercy);
      baseSettings = {
        ...baseSettings,
        isMercyEnabled: parsedMercy.isMercyEnabled ?? DEFAULT_GRADING_SETTINGS.isMercyEnabled,
        mercyMaxSubjects:
          parsedMercy.mercyMaxSubjects !== undefined
            ? Number(parsedMercy.mercyMaxSubjects)
            : DEFAULT_GRADING_SETTINGS.mercyMaxSubjects,
        mercyMaxPercentage:
          parsedMercy.mercyMaxPercentage !== undefined
            ? Number(parsedMercy.mercyMaxPercentage)
            : DEFAULT_GRADING_SETTINGS.mercyMaxPercentage,
        mercyTargetScreen:
          parsedMercy.mercyTargetScreen === 'assessments' ? 'assessments' : 'written',
        mercyDefaultsV2: true,
      };
    }
  } catch (e) {
    console.error('Failed to load grading settings:', e);
  }
  return baseSettings;
};

export const saveGradingSettings = (
  settings: GradingSettings,
  stage?: string,
  selectedGrade?: string
) => {
  try {
    const toSave = { ...settings, mercyDefaultsV2: true };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        showName: toSave.showName,
        showSeatNumber: toSave.showSeatNumber,
        showSecretNumber: toSave.showSecretNumber,
        password: toSave.password,
        isLocked: toSave.isLocked,
        mercyDefaultsV2: true,
      })
    );

    const mercyKey = getMercyStorageKey(stage, selectedGrade);
    localStorage.setItem(
      mercyKey,
      JSON.stringify({
        isMercyEnabled: toSave.isMercyEnabled ?? DEFAULT_GRADING_SETTINGS.isMercyEnabled,
        mercyMaxSubjects:
          toSave.mercyMaxSubjects ?? DEFAULT_GRADING_SETTINGS.mercyMaxSubjects,
        mercyMaxPercentage:
          toSave.mercyMaxPercentage ?? DEFAULT_GRADING_SETTINGS.mercyMaxPercentage,
        mercyTargetScreen: toSave.mercyTargetScreen ?? DEFAULT_GRADING_SETTINGS.mercyTargetScreen,
        mercyDefaultsV2: true,
      })
    );

    window.dispatchEvent(
      new CustomEvent('grading-settings-updated', {
        detail: { settings: toSave, stage, selectedGrade },
      })
    );
  } catch (e) {
    console.error('Failed to save grading settings:', e);
  }
};

/**
 * التقريب لرقم عشري واحد لصالح الطالب:
 * إذا كان بعد العلامة العشرية رقمين أو أكثر، يتم تطبيق قاعدة التقريب لصالح الطالب:
 * مثال: 12.55 تصبح 12.6
 * مثال: 12.44 تصبح 12.4
 */
export function roundToOneDecimal(val: number): number {
  if (typeof val !== 'number' || isNaN(val)) return val;
  const sign = val < 0 ? -1 : 1;
  const absVal = Math.abs(val);
  // إضافة هامش دقيق (1e-7) لضمان عدم تأثر حالات مثل 12.55 بتمثيل الأعداد العشرية في جافاسكريبت
  const rounded = Math.round((absVal + 1e-7) * 10) / 10;
  return sign * Number(rounded.toFixed(1));
}

/**
 * تنسيق الدرجة لرقم عشري واحد وفق قاعدة التقريب لصالح الطالب،
 * مع الاحتفاظ بالأعداد الصحيحة دون أصفار زائدة:
 * مثال: 12.55 -> "12.6"
 * مثال: 12.44 -> "12.4"
 * مثال: 12 -> "12"
 */
export function formatToOneDecimal(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  if (val === 'غ' || val === '-') return String(val);
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  if (isNaN(num)) return String(val);
  const rounded = roundToOneDecimal(num);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export const getPrimaryStudentMercyBoosts = (
  student: StudentData | undefined,
  stage: string,
  customCols: any[],
  defaultSubjectsOverrides: Record<string, any> | undefined,
  settings: GradingSettings | undefined,
  selectedGrade?: string
): Record<string, SubjectMercyBoost> => {
  const result: Record<string, SubjectMercyBoost> = {};
  const isSupportedStage =
    stage === 'primary' ||
    stage === 'middle' ||
    stage === 'prep' ||
    stage === 'secondary';
  if (!student || !isSupportedStage || !settings) return result;
  if (settings.isMercyEnabled === false) return result;

  const maxSubjects = Number(settings.mercyMaxSubjects) || 0;
  const maxPct = Number(settings.mercyMaxPercentage) || 0;

  if (maxSubjects <= 0 || maxPct <= 0) return result;

  const isMiddleStage = stage === 'middle' || stage === 'prep' || stage === 'secondary';
  const resolvedGrade = selectedGrade || (student as any)?.grade || '';
  const isMiddleHomeschool = isMiddleStage && Boolean(
    (typeof window !== 'undefined' && (
      localStorage.getItem('current_system_type') === 'homeschool' ||
      (resolvedGrade ? localStorage.getItem(`${stage}_${resolvedGrade}_homeschool_assessments_custom_cols`) !== null : false) ||
      Object.keys(localStorage).some(k => k.startsWith(`${stage}_`) && k.endsWith('_homeschool_assessments_custom_cols'))
    )) ||
    (student as any)?.systemType === 'homeschool'
  );

  const assess1 = student.assessments?.['first'] || student.assessments?.['الفصل الدراسي الأول'];
  const assess2 = student.assessments?.['second'] || student.assessments?.['الفصل الدراسي الثاني'] || (student.assessments as any)?.['الفصل الدراسي الثانى'];
  const written1 = student.writtenExams?.['first'] || student.writtenExams?.['الفصل الدراسي الأول'];
  const written2 = student.writtenExams?.['second'] || student.writtenExams?.['الفصل الدراسي الثاني'] || (student.writtenExams as any)?.['الفصل الدراسي الثانى'];

  const isRecorded = (obj: any, key: string) => {
    if (!obj) return false;
    const val = obj[key];
    if (val === undefined || val === null) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    return true;
  };

  const parseVal = (raw: any) => {
    if (raw === undefined || raw === null || raw === '') return 0;
    const trimmed = typeof raw === 'string' ? raw.trim() : raw;
    const isAbsence = trimmed === 'غ' || (typeof trimmed === 'string' && trimmed.toLowerCase() === 'a');
    if (isAbsence) return 0;
    const num = parseFloat(typeof raw === 'string' ? raw.replace(',', '.') : raw);
    return isNaN(num) ? 0 : num;
  };

  const writtenCols = customCols.filter((c) => {
    const ovr = defaultSubjectsOverrides?.[c.key];
    return (ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : c.hasWrittenExam) !== false;
  });
  const hasAnyWrittenCols = writtenCols.length > 0;

  const isAssess1Complete = isMiddleHomeschool || (customCols.length > 0 && customCols.every((c) => isRecorded(assess1, c.key)));
  const isAssess2Complete = isMiddleHomeschool || (customCols.length > 0 && customCols.every((c) => isRecorded(assess2, c.key)));
  const isWritten1Complete = !hasAnyWrittenCols || writtenCols.every((c) => isRecorded(written1, c.key));
  const isWritten2Complete = !hasAnyWrittenCols || writtenCols.every((c) => isRecorded(written2, c.key));

  if (!isAssess1Complete || !isAssess2Complete || !isWritten1Complete || !isWritten2Complete) {
    return result;
  }

  const isMax40 = stage === 'primary';
  const middleActualPctMap: Record<string, number> = {
    arabic: 0.4,
    english: 0.3,
    math: 0.3,
    science: 0.2,
    social_studies: 0.2,
    social: 0.2,
    religion: 0.2,
    art: 0.1,
    ict: 0.1,
    music: 0.1,
    pe: 0.1,
    activity1: 0.1,
    activity2: 0.1,
  };

  let totalFailedSubjects = 0;
  const candidates: SubjectMercyBoost[] = [];

  customCols.forEach((c) => {
    const ovr = defaultSubjectsOverrides?.[c.key];
    const isReligion = c.key === 'religion' || Boolean(c.label && c.label.includes('دين'));
    const hasWritten = (ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : c.hasWrittenExam) !== false;

    // فى المرحلة الإعدادية منازل: حذف المواد التى ليس لها امتحان تحريرى من معادلات مواد الرسوب
    if (isMiddleHomeschool && !hasWritten) {
      return;
    }

    const maxAssess = isMiddleHomeschool
      ? 0
      : (ovr?.maxAssessmentsGrade !== undefined
          ? Number(ovr.maxAssessmentsGrade)
          : (c.maxAssessmentsGrade !== undefined ? Number(c.maxAssessmentsGrade) : (c.maxGrade !== undefined ? Number(c.maxGrade) : (hasWritten ? (isMax40 ? 40 : 70) : 100))));
    const maxWritten = hasWritten
      ? (ovr?.maxWrittenGrade !== undefined ? Number(ovr.maxWrittenGrade) : (c.maxWrittenGrade !== undefined ? Number(c.maxWrittenGrade) : (isMiddleHomeschool ? 100 : (isMax40 ? 60 : 30))))
      : 0;
    const twoSemMax = (maxAssess + maxWritten) * 2;
    const customActualMax = ovr?.actualMaxGrade !== undefined ? Number(ovr.actualMaxGrade) : (c.actualMaxGrade !== undefined ? Number(c.actualMaxGrade) : undefined);
    const actualPct = customActualMax !== undefined && twoSemMax > 0
      ? (customActualMax / twoSemMax)
      : (isMiddleStage && middleActualPctMap[c.key] !== undefined
          ? middleActualPctMap[c.key]
          : 0.5);
    const actualMaxGrade = customActualMax !== undefined ? customActualMax : roundToOneDecimal(twoSemMax * actualPct);

    const a1 = assess1 ? parseVal((assess1 as any)[c.key]) : 0;
    const a2 = assess2 ? parseVal((assess2 as any)[c.key]) : 0;
    const w1 = written1 && hasWritten ? parseVal((written1 as any)[c.key]) : 0;
    const w2 = written2 && hasWritten ? parseVal((written2 as any)[c.key]) : 0;

    const minTotalPass = ovr?.minTotalPassPercentage !== undefined
      ? ovr.minTotalPassPercentage
      : (c.minTotalPassPercentage !== undefined ? c.minTotalPassPercentage : (isReligion ? 70 : 50));

    const minRequiredActualGrade = roundToOneDecimal(actualMaxGrade * (minTotalPass / 100));

    if (hasWritten) {
      const originalActualGrade = roundToOneDecimal((a1 + w1 + a2 + w2) * actualPct);
      const passedSubjectTotal = originalActualGrade >= minRequiredActualGrade;

      const rawMinWrittenPass = ovr?.minPassPercentage !== undefined ? ovr.minPassPercentage : c.minPassPercentage;
      const minWrittenPass =
        rawMinWrittenPass === undefined || rawMinWrittenPass === 70 || rawMinWrittenPass === 10 || rawMinWrittenPass === 7.2
          ? (stage === 'secondary' ? 25 : 30)
          : rawMinWrittenPass;
      const written2Percent = maxWritten > 0 ? (w2 / maxWritten) * 100 : 0;
      const passedWrittenExam = written2Percent >= minWrittenPass;

      if (!passedSubjectTotal || !passedWrittenExam) {
        totalFailedSubjects++;
        const neededBoost = roundToOneDecimal(minRequiredActualGrade - originalActualGrade);
        const maxAllowedBoost = (maxPct / 100) * minRequiredActualGrade;

        if (neededBoost > 0 && neededBoost <= maxAllowedBoost + 1e-9) {
          candidates.push({
            subjectKey: c.key,
            originalActualGrade,
            boostAmount: neededBoost,
            boostedActualGrade: minRequiredActualGrade,
            actualPct,
          });
        }
      }
    } else {
      const originalActualGrade = roundToOneDecimal((a1 + a2) * actualPct);
      const passedAssess = originalActualGrade >= minRequiredActualGrade;

      if (!passedAssess) {
        totalFailedSubjects++;
        const neededBoost = roundToOneDecimal(minRequiredActualGrade - originalActualGrade);
        const maxAllowedBoost = (maxPct / 100) * minRequiredActualGrade;

        if (neededBoost > 0 && neededBoost <= maxAllowedBoost + 1e-9) {
          candidates.push({
            subjectKey: c.key,
            originalActualGrade,
            boostAmount: neededBoost,
            boostedActualGrade: minRequiredActualGrade,
            actualPct,
          });
        }
      }
    }
  });

  // لا يتم تفعيل درجات الرأفة إلا لصالح الطالب الذي يضمن النجاح في عدد المواد التي يمكن رفع درجات الطالب فيها
  // بعد إضافة النسبة المئوية للحد الأدنى للدرجة الفعلية للمادة المقرر إضافتها إلى درجات الطالب المستفيد
  if (
    totalFailedSubjects <= 0 ||
    totalFailedSubjects > maxSubjects ||
    candidates.length !== totalFailedSubjects
  ) {
    return result;
  }

  candidates.forEach((item) => {
    result[item.subjectKey] = item;
  });

  return result;
};

