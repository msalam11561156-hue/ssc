import { DetailedAssessmentItem, StudentData } from '../types';
import { buildPdfFromJpegPages, base64ToUint8Array, getReportRowBgColors, RowBgTheme, getSubjectsConfigForStageGrade } from './exportPdf';
import { getGradingSettings, getPrimaryStudentMercyBoosts, roundToOneDecimal } from './gradingSettings';
import { getStoredSubjectEn } from './subjectLanguage';
import qrCodeUrl from '../assets/images/asd11.jpg';
import { getActiveFooterTagline } from './adFilter';
const ministryLogoUrl = '';
import signaturePenUrl from '../assets/images/signature_pen.png';

function drawCrispImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

/**
 * Checks whether the current context is 2nd Secondary - Modern System (Baccalaureate)
 */
export function checkIsSecondary2Modern(stage?: string, selectedGrade?: string): boolean {
  const isSecondaryStage = stage === 'secondary' || stage === 'sec';
  const isSecondary2 = isSecondaryStage && Boolean(
    selectedGrade?.includes('الثاني') ||
    selectedGrade?.includes('الثانى') ||
    selectedGrade?.toLowerCase().includes('2nd') ||
    selectedGrade?.includes('second') ||
    selectedGrade === 'secondary_2' ||
    selectedGrade?.includes('2')
  );
  let isModernSec = false;
  try {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('sheet_control_school_data') || localStorage.getItem('school_data_settings')) : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.secondarySystem === 'modern') isModernSec = true;
    }
  } catch {}
  if (
    selectedGrade?.includes('modern') ||
    selectedGrade?.includes('medical') ||
    selectedGrade?.includes('engineering') ||
    selectedGrade?.includes('business') ||
    selectedGrade?.includes('arts') ||
    selectedGrade?.includes('بكالوريا') ||
    selectedGrade?.includes('الحديث')
  ) {
    isModernSec = true;
  }
  return Boolean(isSecondary2 && isModernSec);
}

/**
 * Distributes a general total grade (40, 70, or 100) into detailed assessment fields:
 * Primary (max 40):
 * - classNotebook (5)
 * - homework (5)
 * - weeklyAssessment (10)
 * - behavior (5)
 * - firstMonthlyExam (15)
 * - secondMonthlyExam (15)
 */
export const distributeTotalToDetailedAssessment = (
  totalVal: string | number,
  maxAssessmentsGrade: number = 40,
  stage?: string,
  isNoWritten?: boolean,
  isPE?: boolean,
  isSecondary2Modern?: boolean
): DetailedAssessmentItem => {
  const str = String(totalVal ?? '').trim();
  const isSecondary = stage === 'secondary';
  const isMiddle = stage === 'middle' || stage === 'prep' || (maxAssessmentsGrade === 70 && !isSecondary);

  const roundClean = (v: number): string => {
    const rounded = Math.round(v * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  };

  // للصف الثانى الثانوى - بكالوريا - النظام الحديث (فقط لكل المواد):
  // التقييم الأسبوعي (20) + المشروع البحثي (15) + الحصة والواجبات (15) + السلوك والمواظبة (10) + الاختبار الأول (20) + الاختبار الثاني (20) = 100
  if (isSecondary2Modern) {
    if (!str) {
      return {
        weeklyAssessment: '',
        researchProject: '',
        homework: '',
        behavior: '',
        firstMonthlyExam: '',
        secondMonthlyExam: '',
        total: ''
      };
    }
    if (str === 'غ' || str.toLowerCase() === 'a') {
      return {
        weeklyAssessment: 'غ',
        researchProject: 'غ',
        homework: 'غ',
        behavior: 'غ',
        firstMonthlyExam: 'غ',
        secondMonthlyExam: 'غ',
        total: 'غ'
      };
    }
    const num = parseFloat(str.replace(',', '.'));
    if (isNaN(num) || num < 0) {
      return {
        weeklyAssessment: '',
        researchProject: '',
        homework: '',
        behavior: '',
        firstMonthlyExam: '',
        secondMonthlyExam: '',
        total: str
      };
    }
    const baseMax = maxAssessmentsGrade > 0 ? maxAssessmentsGrade : 100;
    const clamped = Math.min(baseMax, Math.max(0, num));
    const r = clamped / baseMax;

    return {
      weeklyAssessment: roundClean(20 * r),
      researchProject: roundClean(15 * r),
      homework: roundClean(15 * r),
      behavior: roundClean(10 * r),
      firstMonthlyExam: roundClean(20 * r),
      secondMonthlyExam: roundClean(20 * r),
      total: roundClean(clamped)
    };
  }

  // مادة التربية الرياضية دائماً فى جميع المراحل ما عدا رياض الأطفال:
  // المجال البدنى والمهارى: 50، المجال المعرفى: 20، المجال الوجدانى والسلوكى: 20، الزى الرياضى والمواظبة: 10، المجموع: 100
  if (isPE && stage !== 'kindergarten') {
    if (!str) {
      return { physicalSkillDomain: '', cognitiveDomain: '', affectiveBehavioralDomain: '', sportsUniformAttendance: '', behavior: '', total: '' };
    }
    if (str === 'غ' || str.toLowerCase() === 'a') {
      return { physicalSkillDomain: 'غ', cognitiveDomain: 'غ', affectiveBehavioralDomain: 'غ', sportsUniformAttendance: 'غ', behavior: 'غ', total: 'غ' };
    }
    const num = parseFloat(str.replace(',', '.'));
    if (isNaN(num) || num < 0) {
      return { physicalSkillDomain: '', cognitiveDomain: '', affectiveBehavioralDomain: '', sportsUniformAttendance: '', behavior: '', total: str };
    }
    const clamped = Math.min(100, Math.max(0, num));
    const r = clamped / 100;
    const att = roundClean(10 * r);
    return {
      physicalSkillDomain: roundClean(50 * r),
      cognitiveDomain: roundClean(20 * r),
      affectiveBehavioralDomain: roundClean(20 * r),
      sportsUniformAttendance: att,
      behavior: att,
      total: roundClean(clamped)
    };
  }

  // لجميع المواد التى ليس لها امتحان تحريري فى جميع المراحل ما عدا رياض الأطفال
  if (isNoWritten) {
    if (!str) {
      return { practicalPerformance: '', classActivities: '', behavior: '', total: '' };
    }
    if (str === 'غ' || str.toLowerCase() === 'a') {
      return { practicalPerformance: 'غ', classActivities: 'غ', behavior: 'غ', total: 'غ' };
    }
    const num = parseFloat(str.replace(',', '.'));
    if (isNaN(num) || num < 0) {
      return { practicalPerformance: '', classActivities: '', behavior: '', total: str };
    }
    const clamped = Math.min(100, Math.max(0, num));
    const r = clamped / 100;
    return {
      practicalPerformance: roundClean(60 * r),
      classActivities: roundClean(20 * r),
      behavior: roundClean(20 * r),
      total: roundClean(clamped)
    };
  }

  if (!str) {
    return {
      ...(isMiddle || isSecondary ? {} : { classNotebook: '' }),
      homework: '',
      weeklyAssessment: '',
      behavior: '',
      firstMonthlyExam: '',
      secondMonthlyExam: '',
      total: ''
    };
  }

  if (str === 'غ' || str.toLowerCase() === 'a') {
    return {
      ...(isMiddle || isSecondary ? {} : { classNotebook: 'غ' }),
      homework: 'غ',
      weeklyAssessment: 'غ',
      behavior: 'غ',
      firstMonthlyExam: 'غ',
      secondMonthlyExam: 'غ',
      total: 'غ'
    };
  }

  const num = parseFloat(str.replace(',', '.'));
  if (isNaN(num) || num < 0) {
    return {
      ...(isMiddle || isSecondary ? {} : { classNotebook: '' }),
      homework: '',
      weeklyAssessment: '',
      behavior: '',
      firstMonthlyExam: '',
      secondMonthlyExam: '',
      total: str
    };
  }



  // للمرحلة الثانوية العامة - البكالوريا (كراسة الواجب: 15، التقييم الأسبوعي: 15، السلوك والمواظبة: 10، الاختبار الأول: 15، الاختبار الثاني: 15، المجموع: 70)
  if (isSecondary) {
    if (maxAssessmentsGrade === 100) {
      const clamped = Math.min(100, Math.max(0, num));
      const r = clamped / 100;
      const totalOutOf70 = 70 * r;
      const hw = 15 * r;
      const weekly = 15 * r;
      const behavior = 10 * r;
      const exam1 = 15 * r;
      const exam2 = 15 * r;

      return {
        homework: roundClean(hw),
        weeklyAssessment: roundClean(weekly),
        behavior: roundClean(behavior),
        firstMonthlyExam: roundClean(exam1),
        secondMonthlyExam: roundClean(exam2),
        total: roundClean(totalOutOf70)
      };
    }

    const baseMax = maxAssessmentsGrade > 0 ? maxAssessmentsGrade : 70;
    const clamped = Math.min(baseMax, Math.max(0, num));
    const r = clamped / baseMax;

    const hw = 15 * r;
    const weekly = 15 * r;
    const behavior = 10 * r;
    const exam1 = 15 * r;
    const exam2 = 15 * r;

    return {
      homework: roundClean(hw),
      weeklyAssessment: roundClean(weekly),
      behavior: roundClean(behavior),
      firstMonthlyExam: roundClean(exam1),
      secondMonthlyExam: roundClean(exam2),
      total: roundClean(clamped)
    };
  }

  // للمرحلة الإعدادية (كراسة الواجب: 10، التقييم الأسبوعي: 20، السلوك والمواظبة: 10، الاختبار الأول: 15، الاختبار الثاني: 15، المجموع: 70)
  if (isMiddle) {
    if (maxAssessmentsGrade === 100) {
      const clamped = Math.min(100, Math.max(0, num));
      const r = clamped / 100;
      const totalOutOf70 = 70 * r;
      const hw = 10 * r;
      const weekly = 20 * r;
      const behavior = 10 * r;
      const exam1 = 15 * r;
      const exam2 = 15 * r;

      return {
        homework: roundClean(hw),
        weeklyAssessment: roundClean(weekly),
        behavior: roundClean(behavior),
        firstMonthlyExam: roundClean(exam1),
        secondMonthlyExam: roundClean(exam2),
        total: roundClean(totalOutOf70)
      };
    }

    const baseMax = maxAssessmentsGrade > 0 ? maxAssessmentsGrade : 70;
    const clamped = Math.min(baseMax, Math.max(0, num));
    const r = clamped / baseMax;

    const hw = 10 * r;
    const weekly = 20 * r;
    const behavior = 10 * r;
    const exam1 = 15 * r;
    const exam2 = 15 * r;

    return {
      homework: roundClean(hw),
      weeklyAssessment: roundClean(weekly),
      behavior: roundClean(behavior),
      firstMonthlyExam: roundClean(exam1),
      secondMonthlyExam: roundClean(exam2),
      total: roundClean(clamped)
    };
  }

  // للمواد التي ليس لها امتحان تحريري والدرجة العظمى لتقييماتها = 100 في المرحلة الابتدائية:
  // قسمة الدرجة العظمى 100 / 5 ثم ضرب الناتج فى 2 = 40 درجة
  // وتحويل درجة الطالب (num / 5) * 2 ثم توزيع الناتج على بنود التقييمات
  if (maxAssessmentsGrade === 100) {
    const clamped = Math.min(100, Math.max(0, num));
    // المعادلة: قسمة الدرجة على 5 ثم ضرب الناتج فى 2
    const totalOutOf40 = (clamped / 5) * 2;
    const r = totalOutOf40 / 40; // = clamped / 100

    const notebook = 5 * r;
    const hw = 5 * r;
    const weekly = 10 * r;
    const behavior = 5 * r;
    const exam = 15 * r;

    return {
      classNotebook: roundClean(notebook),
      homework: roundClean(hw),
      weeklyAssessment: roundClean(weekly),
      behavior: roundClean(behavior),
      firstMonthlyExam: roundClean(exam),
      secondMonthlyExam: roundClean(exam),
      total: roundClean(totalOutOf40)
    };
  }

  // لباقي المواد في المرحلة الابتدائية (الدرجة العظمى 40):
  const baseMax = maxAssessmentsGrade > 0 ? maxAssessmentsGrade : 40;
  const clamped = Math.min(baseMax, Math.max(0, num));
  const r = clamped / baseMax;

  const notebook = 5 * r;
  const hw = 5 * r;
  const weekly = 10 * r;
  const behavior = 5 * r;
  const exam = 15 * r;

  return {
    classNotebook: roundClean(notebook),
    homework: roundClean(hw),
    weeklyAssessment: roundClean(weekly),
    behavior: roundClean(behavior),
    firstMonthlyExam: roundClean(exam),
    secondMonthlyExam: roundClean(exam),
    total: roundClean(clamped)
  };
};

export interface ExportSubjectDetailedPdfOptions {
  subjectKey: string;
  subjectLabel: string;
  students: StudentData[];
  semester: string;
  selectedGrade: string;
  stage?: string;
  schoolName?: string;
  administration?: string;
  governorate?: string;
  dataOfficer?: string;
  controlHead?: string;
  committeeHead?: string;
  rowTheme?: string;
  showSeatNumber?: boolean;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generates and downloads a real, beautifully formatted PDF file
 * for detailed subject assessments (A4 Landscape), with:
 * - A4 Landscape orientation (841.89 x 595.28 pt)
 * - Calling list styling (header, divider line, title banner)
 * - Title format: تقييمات - [المادة] - [الصف] - [الفصل] - 2026 - 2027
 * - QR code in page footer
 * - Rounded table corners (14px)
 * - Header rows height increased by 30%
 * - Header rows font size increased by 25%
 * - Alternating row colors from pdf_print_row_theme
 */
export async function exportSubjectDetailedAssessmentsPdf(
  options: ExportSubjectDetailedPdfOptions
): Promise<void> {
  const {
    subjectKey,
    subjectLabel,
    students,
    semester,
    selectedGrade,
    stage,
    schoolName = '',
    administration = '',
    dataOfficer: propDataOfficer,
    controlHead: propControlHead,
    committeeHead: propCommitteeHead,
    rowTheme: propRowTheme,
  } = options;

  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }
  } catch {}

  const qrImage = await loadImage(qrCodeUrl);

  const sAdmin = localStorage.getItem('school_administration') || administration || '';
  const sName = localStorage.getItem('school_name') || schoolName || '';
  const semText = semester === 'first' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني';

  let dataOfficer = propDataOfficer || '';
  let controlHead = propControlHead || '';
  let committeeHead = propCommitteeHead || '';

  if (!dataOfficer || !controlHead || !committeeHead) {
    try {
      const stageKey = stage || '';
      const savedControlByStage = localStorage.getItem('sheet_control_control_data_by_stage');
      if (savedControlByStage) {
        const parsed = JSON.parse(savedControlByStage);
        const stageControl = parsed[stageKey] || parsed[''] || Object.values(parsed)[0];
        if (stageControl) {
          if (!dataOfficer && stageControl.dataOfficer) dataOfficer = stageControl.dataOfficer;
          if (!controlHead && stageControl.controlHead) controlHead = stageControl.controlHead;
          if (!committeeHead && stageControl.committeeHead) committeeHead = stageControl.committeeHead;
        }
      }
    } catch {}
  }
  if (!dataOfficer) dataOfficer = localStorage.getItem('school_data_officer') || '................';
  if (!controlHead) controlHead = localStorage.getItem('school_control_head') || '................';
  if (!committeeHead) committeeHead = localStorage.getItem('school_committee_head') || '................';

  // Read saved print row theme from localStorage (matching RowThemeSelector in print menu)
  const savedPrintTheme = typeof window !== 'undefined'
    ? (localStorage.getItem('pdf_print_row_theme') as RowBgTheme | null)
    : null;
  const activeRowTheme = (propRowTheme as RowBgTheme) || (savedPrintTheme && savedPrintTheme !== ('auto' as any) ? savedPrintTheme : 'attachment_3');
  const { evenBg, oddBg } = getReportRowBgColors('calling_list', false, activeRowTheme);

  // Exact page dimensions for Landscape A4:
  const widthPx = 1754;
  const heightPx = 1240;
  const marginX = 48;
  const marginY = 28;
  const contentW = widthPx - marginX * 2; // 1658 px

  // Serial field width (حقل المسلسل)
  const indexWidth = 60;
  // Empty fields width: exactly 15px (الحقول الفارغة بعرض = 15 بكسل)
  const spacer1Width = 15;
  const spacer2Width = 15;

  const isMiddleStage = stage === 'middle' || stage === 'prep';
  const isSecondaryStage = stage === 'secondary';
  const isMiddleOrSecondaryStage = isMiddleStage || isSecondaryStage;
  const showSeat = options.showSeatNumber !== false;

  const cfg = getSubjectsConfigForStageGrade(stage, selectedGrade);
  const isPESubj = stage !== 'kindergarten' && (subjectKey === 'pe' || subjectKey === 'physical_education' || subjectLabel?.includes('رياضية') || subjectLabel?.includes('بدنية'));
  const isNoWrittenSubj = stage !== 'kindergarten' && isSubjectWithoutWrittenExam({ key: subjectKey, label: subjectLabel }, cfg?.customCols, stage);

  const isSecondary2Modern = checkIsSecondary2Modern(stage, selectedGrade);

  // Column definitions (RTL order: right-to-left) summing to exactly 1658 px
  const columns = isSecondary2Modern
    ? [
        { key: 'index', title: 'م', width: 50, align: 'center' as const },
        { key: 'name', title: 'اسم الطالب', width: showSeat ? 358 : 478, align: 'center' as const },
        ...(showSeat ? [{ key: 'seat', title: 'رقم الجلوس', width: 120, align: 'center' as const }] : []),
        { key: 'spacer1', title: '', width: spacer1Width, align: 'center' as const },
        { key: 'weekly', title: 'التقييم الأسبوعي', width: 155, max: '20', align: 'center' as const },
        { key: 'researchProject', title: 'المشروع البحثي', width: 155, max: '15', align: 'center' as const },
        { key: 'homework', title: 'الحصة والواجبات', width: 175, max: '15', align: 'center' as const },
        { key: 'behavior', title: 'السلوك والمواظبة', width: 140, max: '10', align: 'center' as const },
        { key: 'exam1', title: 'الاختبار الأول', width: 154, max: '20', align: 'center' as const },
        { key: 'exam2', title: 'الاختبار الثاني', width: 154, max: '20', align: 'center' as const },
        { key: 'spacer2', title: '', width: spacer2Width, align: 'center' as const },
        { key: 'total', title: 'المجموع', width: 172, max: '100', align: 'center' as const },
      ]
    : isPESubj
    ? [
        { key: 'index', title: 'م', width: indexWidth, align: 'center' as const },
        { key: 'name', title: 'اسم الطالب', width: showSeat ? 458 : 578, align: 'center' as const },
        ...(showSeat ? [{ key: 'seat', title: 'رقم الجلوس', width: 120, align: 'center' as const }] : []),
        // حقل فارغ بعد رقم الجلوس بعرض 15 بكسل
        { key: 'spacer1', title: '', width: spacer1Width, align: 'center' as const },
        { key: 'physicalSkillDomain', title: 'المجال البدنى والمهارى', width: 235, max: '50', align: 'center' as const },
        { key: 'cognitiveDomain', title: 'المجال المعرفى', width: 170, max: '20', align: 'center' as const },
        { key: 'affectiveBehavioralDomain', title: 'المجال الوجدانى والسلوكى', width: 205, max: '20', align: 'center' as const },
        { key: 'sportsUniformAttendance', title: 'الزى الرياضى والمواظبة', width: 180, max: '10', align: 'center' as const },
        // حقل فارغ قبل المجموع بعرض 15 بكسل
        { key: 'spacer2', title: '', width: spacer2Width, align: 'center' as const },
        { key: 'total', title: 'المجموع', width: 220, max: '100', align: 'center' as const },
      ]
    : isNoWrittenSubj
    ? [
        { key: 'index', title: 'م', width: indexWidth, align: 'center' as const },
        { key: 'name', title: 'اسم الطالب', width: showSeat ? 458 : 578, align: 'center' as const },
        ...(showSeat ? [{ key: 'seat', title: 'رقم الجلوس', width: 120, align: 'center' as const }] : []),
        // حقل فارغ بعد رقم الجلوس بعرض 15 بكسل
        { key: 'spacer1', title: '', width: spacer1Width, align: 'center' as const },
        { key: 'practicalPerformance', title: 'الأداء العملى والمهارى', width: 260, max: '60', align: 'center' as const },
        { key: 'classActivities', title: 'الأنشطة الصفية', width: 240, max: '20', align: 'center' as const },
        { key: 'behavior', title: 'السلوك والمواظبة', width: 240, max: '20', align: 'center' as const },
        // حقل فارغ قبل المجموع بعرض 15 بكسل
        { key: 'spacer2', title: '', width: spacer2Width, align: 'center' as const },
        { key: 'total', title: 'المجموع', width: 250, max: '100', align: 'center' as const },
      ]
    : isMiddleOrSecondaryStage
    ? [
        { key: 'index', title: 'م', width: 50, align: 'center' as const },
        { key: 'name', title: 'اسم الطالب', width: showSeat ? 358 : 478, align: 'center' as const },
        ...(showSeat ? [{ key: 'seat', title: 'رقم الجلوس', width: 120, align: 'center' as const }] : []),
        // حقل فارغ بعد رقم الجلوس بعرض 15 بكسل
        { key: 'spacer1', title: '', width: spacer1Width, align: 'center' as const },
        { key: 'notebook', title: 'كراسة الحصة', width: 130, max: '5', align: 'center' as const },
        { key: 'homework', title: 'كراسة الواجب', width: 150, max: isSecondaryStage ? '15' : '10', align: 'center' as const },
        { key: 'weekly', title: 'التقييم الأسبوعي', width: 160, max: isSecondaryStage ? '15' : '20', align: 'center' as const },
        { key: 'behavior', title: 'السلوك والمواظبة', width: 150, max: '10', align: 'center' as const },
        { key: 'exam1', title: 'الإختبار الأول', width: 150, max: '15', align: 'center' as const },
        { key: 'exam2', title: 'الإختبار الثانى', width: 150, max: '15', align: 'center' as const },
        // حقل فارغ قبل المجموع بعرض 15 بكسل
        { key: 'spacer2', title: '', width: spacer2Width, align: 'center' as const },
        { key: 'total', title: 'المجموع', width: 160, max: '70', align: 'center' as const },
      ]
    : [
        { key: 'index', title: 'م', width: indexWidth, align: 'center' as const },
        { key: 'name', title: 'اسم الطالب', width: showSeat ? 373 : 493, align: 'center' as const },
        ...(showSeat ? [{ key: 'seat', title: 'رقم الجلوس', width: 120, align: 'center' as const }] : []),
        // حقل فارغ بعد رقم الجلوس بعرض 15 بكسل
        { key: 'spacer1', title: '', width: spacer1Width, align: 'center' as const },
        { key: 'notebook', title: 'كراسة الحصة', width: 145, max: '5', align: 'center' as const },
        { key: 'homework', title: 'كراسة الواجب', width: 145, max: '5', align: 'center' as const },
        { key: 'weekly', title: 'التقييم الأسبوعي', width: 170, max: '10', align: 'center' as const },
        { key: 'behavior', title: 'السلوك والمواظبة', width: 145, max: '5', align: 'center' as const },
        { key: 'exam1', title: 'الإختبار الأول', width: 155, max: '15', align: 'center' as const },
        { key: 'exam2', title: 'الإختبار الثانى', width: 155, max: '15', align: 'center' as const },
        // حقل فارغ قبل المجموع بعرض 15 بكسل
        { key: 'spacer2', title: '', width: spacer2Width, align: 'center' as const },
        { key: 'total', title: 'المجموع', width: 160, max: '40', align: 'center' as const },
      ];

  // Date calculation
  const now = new Date();
  let day = now.getDate();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(now);
    const d = parts.find((p) => p.type === 'day')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const y = parts.find((p) => p.type === 'year')?.value;
    if (d && m && y) {
      day = parseInt(d, 10);
      month = parseInt(m, 10);
      year = parseInt(y, 10);
    }
  } catch {}
  const dateDisplay = `${day} - ${month} - ${year} م`;

  // 20 students per page
  const rowsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(students.length / rowsPerPage));
  const renderedPages: { jpegBytes: Uint8Array; widthPx: number; heightPx: number }[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    canvas.dir = 'rtl';
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Background fill
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // 1. Top Row: Educational Administration (Far Right) & School Name (Far Left)
    const topInfoY = marginY;
    const topInfoH = 46;
    ctx.direction = 'rtl';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px "Cairo", sans-serif';
    ctx.textBaseline = 'middle';

    const adminDisplay = sAdmin.trim()
      ? `الإدارة : ${sAdmin.trim()}`
      : 'الإدارة : ........................';
    const schoolDisplay = sName.trim()
      ? `المدرسة : ${sName.trim()}`
      : 'المدرسة : ........................';

    // Far Right: Educational Administration
    ctx.textAlign = 'right';
    ctx.fillText(adminDisplay, marginX + contentW, topInfoY + topInfoH / 2);

    // Far Left: School Name
    ctx.textAlign = 'left';
    ctx.fillText(schoolDisplay, marginX, topInfoY + topInfoH / 2);

    // Top Divider Line (exact line from calling list)
    const headerLineY = topInfoY + topInfoH + 6;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(marginX, headerLineY);
    ctx.lineTo(marginX + contentW, headerLineY);
    ctx.stroke();

    // 2. Title Banner (with calling list styling and years format)
    const bannerY = headerLineY + 12;
    const bannerH = 72;
    const bannerGrad = ctx.createLinearGradient(marginX, bannerY, marginX + contentW, bannerY);
    bannerGrad.addColorStop(0, '#361500');
    bannerGrad.addColorStop(0.25, '#5c270d');
    bannerGrad.addColorStop(0.5, '#9a5826');
    bannerGrad.addColorStop(0.75, '#5c270d');
    bannerGrad.addColorStop(1, '#361500');

    drawRoundedRect(ctx, marginX, bannerY, contentW, bannerH, 16);
    ctx.fillStyle = bannerGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // Banner Text: تقييمات - [اسم المادة] - [الصف] - [الفصل الدراسي] - 2026 - 2027
    // تصغير حجم الخط بنسبة 15% (من 25 إلى 21)
    const bannerTitle = `تقييمات - ${subjectLabel} - ${selectedGrade} - ${semText} - 2026 - 2027`;
    ctx.fillStyle = '#ffffff';
    let bannerFontSize = 21;
    ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;
    while (bannerFontSize > 13 && ctx.measureText(bannerTitle).width > contentW - 32) {
      bannerFontSize -= 1;
      ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bannerTitle, marginX + contentW / 2, bannerY + bannerH / 2 + 2);

    // 3. Table Setup (20 students per page fitting comfortably)
    const tableTopY = bannerY + bannerH + 14;
    const headerRow1H = 50;
    const headerRow2H = 38;
    const dataRowH = 39;

    const startIdx = pageIdx * rowsPerPage;
    const pageStudents = students.slice(startIdx, startIdx + rowsPerPage);
    const tableTotalH = headerRow1H + headerRow2H + pageStudents.length * dataRowH;

    // Tabled Rounded Corners (تدوير أركان الجدول)
    ctx.save();
    drawRoundedRect(ctx, marginX, tableTopY, contentW, tableTotalH, 14);
    ctx.clip();

    let currentX = widthPx - marginX; // RTL starting from right edge
    let spacer1X = 0;
    let spacer2X = 0;

    // Draw Column Headers with font size reduced by 20%
    columns.forEach((col, cIdx) => {
      const isLast = col.key === 'total' || cIdx === columns.length - 1;
      const colW = isLast ? Math.max(col.width, currentX - marginX) : col.width;
      const colX = isLast ? marginX : (currentX - colW);

      if (col.key === 'spacer1') {
        spacer1X = colX;
      } else if (col.key === 'spacer2') {
        spacer2X = colX;
      } else if (col.key === 'index' || col.key === 'name' || col.key === 'seat' || col.key === 'total') {
        // Spanning across both header rows (height = 50 + 38 = 88 px) دون التقسيم
        const isTotal = col.key === 'total';
        ctx.fillStyle = isTotal ? '#cbd5e1' : '#e2e8f0';
        ctx.fillRect(colX, tableTopY, colW, headerRow1H + headerRow2H);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(colX, tableTopY, colW, headerRow1H + headerRow2H);

        // Header font: المجموع بحجم 22px بارز ومميز في منتصف الخلية دون تقسيم، وبقية الحقول 18px
        if (col.title) {
          ctx.fillStyle = '#0f172a';
          ctx.font = isTotal ? 'bold 22px "Cairo", sans-serif' : 'bold 18px "Cairo", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(col.title, colX + colW / 2, tableTopY + (headerRow1H + headerRow2H) / 2 + 1);
        }
      } else {
        // Header Row 1: Title (height = 50 px)
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(colX, tableTopY, colW, headerRow1H);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(colX, tableTopY, colW, headerRow1H);

        // Header font reduced by 20% (was 20px -> 16px)
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px "Cairo", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(col.title, colX + colW / 2, tableTopY + headerRow1H / 2 + 1);

        // Header Row 2: Max Grade (height = 38 px)
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(colX, tableTopY + headerRow1H, colW, headerRow2H);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(colX, tableTopY + headerRow1H, colW, headerRow2H);

        // Header max grade font
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px "Cairo", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(col.max || '', colX + colW / 2, tableTopY + headerRow1H + headerRow2H / 2 + 1);
      }

      currentX -= colW;
    });

    // 4. Data Rows
    let rowY = tableTopY + headerRow1H + headerRow2H;

    for (let rIdx = 0; rIdx < pageStudents.length; rIdx++) {
      const student = pageStudents[rIdx];
      const isOdd = rIdx % 2 !== 0;

      let cellX = widthPx - marginX;

      columns.forEach((col, cIdx) => {
        const isLast = col.key === 'total' || cIdx === columns.length - 1;
        const cW = isLast ? Math.max(col.width, cellX - marginX) : col.width;
        const cX = isLast ? marginX : (cellX - cW);
        const isTotalCol = col.key === 'total';
        const isSpacer = col.key === 'spacer1' || col.key === 'spacer2';

        if (!isSpacer) {
          // Cell background with activeRowTheme alternating colors
          ctx.fillStyle = isTotalCol
            ? '#cbd5e1'
            : isOdd
            ? oddBg
            : evenBg;
          ctx.fillRect(cX, rowY, cW, dataRowH);

          // Cell border
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cX, rowY, cW, dataRowH);

          if (student) {
            let item = student.detailedAssessments?.[semester]?.[subjectKey];
            if (!item) {
              const generalVal = student.assessments?.[semester]?.[subjectKey];
              if (generalVal !== undefined && generalVal !== null && String(generalVal).trim() !== '') {
                item = distributeTotalToDetailedAssessment(
                  generalVal,
                  isSecondary2Modern ? 100 : ((isPESubj || isNoWrittenSubj) ? 100 : (isMiddleOrSecondaryStage ? 70 : 40)),
                  stage,
                  isNoWrittenSubj,
                  isPESubj,
                  isSecondary2Modern
                );
              }
            }
            const seat = student.seatNumbers?.[semester] || student.seatNumber || '-';

            let cellText = '';
            switch (col.key) {
              case 'index':
                cellText = String(startIdx + rIdx + 1);
                break;
              case 'name':
                cellText = student.name || '-';
                break;
              case 'seat':
                cellText = String(seat);
                break;
              case 'physicalSkillDomain':
                cellText = item?.physicalSkillDomain ?? '';
                break;
              case 'cognitiveDomain':
                cellText = item?.cognitiveDomain ?? '';
                break;
              case 'affectiveBehavioralDomain':
                cellText = item?.affectiveBehavioralDomain ?? '';
                break;
              case 'sportsUniformAttendance':
                cellText = item?.sportsUniformAttendance ?? item?.behavior ?? '';
                break;
              case 'practicalPerformance':
                cellText = item?.practicalPerformance ?? '';
                break;
              case 'classActivities':
                cellText = item?.classActivities ?? '';
                break;
              case 'notebook':
                cellText = item?.classNotebook ?? '';
                break;
              case 'researchProject':
                cellText = item?.researchProject ?? '';
                break;
              case 'homework':
                cellText = item?.homework ?? '';
                break;
              case 'weekly':
                cellText = item?.weeklyAssessment ?? '';
                break;
              case 'behavior':
                cellText = item?.behavior ?? '';
                break;
              case 'exam1':
                cellText = item?.firstMonthlyExam ?? '';
                break;
              case 'exam2':
                cellText = item?.secondMonthlyExam ?? '';
                break;
              case 'total':
                cellText = item?.total ?? (student.assessments?.[semester]?.[subjectKey] ?? '');
                break;
            }

            ctx.fillStyle = (activeRowTheme === 'theme_black' || activeRowTheme === 'theme_red') && isOdd ? '#ffffff' : '#0f172a';
            // توسيط جميع النصوص وتكبير أرقام بنود التقييم والمجموع والمسلسل ورقم الجلوس بنسبة 20% bold
            ctx.textAlign = 'center';
            ctx.font = col.key === 'name'
              ? 'bold 17px "Cairo", sans-serif'
              : isTotalCol
              ? 'bold 22px "Cairo", sans-serif'
              : 'bold 19px "Cairo", sans-serif';
            ctx.fillText(cellText, cX + cW / 2, rowY + dataRowH / 2 + 1, cW - 6);
          }
        }

        cellX -= cW;
      });

      rowY += dataRowH;
    }

    // 5. Draw empty fields (الحقول الفارغة مثل المرفق بعرض 10 بكسل والحدود بيضاء في الأعلى والأسفل)
    // Both spacer1 and spacer2 are drawn as continuous vertical white channels from tableTopY to tableTopY + tableTotalH
    // with pure white fill, no horizontal row lines, and solid vertical dividing borders
    // exactly matching Screenshot_18.jpg and Screenshot_19.jpg.
    [
      { x: spacer1X, w: spacer1Width },
      { x: spacer2X, w: spacer2Width },
    ].forEach((sp) => {
      if (sp.x > 0 && sp.w > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sp.x, tableTopY, sp.w, tableTotalH);

        // Draw solid vertical dividing borders on left and right
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Right vertical line
        ctx.moveTo(sp.x + sp.w, tableTopY);
        ctx.lineTo(sp.x + sp.w, tableTopY + tableTotalH);
        // Left vertical line
        ctx.moveTo(sp.x, tableTopY);
        ctx.lineTo(sp.x, tableTopY + tableTotalH);
        ctx.stroke();
      }
    });

    ctx.restore();

    // Outer table rounded border stroke
    drawRoundedRect(ctx, marginX, tableTopY, contentW, tableTotalH, 14);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // اجعل لون الحد المشار إليه باللون الأبيض في الأعلى والأسفل
    // (Make the top and bottom border segments of empty fields pure white)
    [
      { x: spacer1X, w: spacer1Width },
      { x: spacer2X, w: spacer2Width },
    ].forEach((sp) => {
      if (sp.x > 0 && sp.w > 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;

        // Top border segment in pure white
        ctx.beginPath();
        ctx.moveTo(sp.x + 0.5, tableTopY);
        ctx.lineTo(sp.x + sp.w - 0.5, tableTopY);
        ctx.stroke();

        // Bottom border segment in pure white
        ctx.beginPath();
        ctx.moveTo(sp.x + 0.5, tableTopY + tableTotalH);
        ctx.lineTo(sp.x + sp.w - 0.5, tableTopY + tableTotalH);
        ctx.stroke();
      }
    });

    // 5. Subject Signatures (معلم المادة - الموجه الفني - مدير المدرسة)
    const signaturesY = rowY + 30;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px "Cairo", sans-serif';

    // Right signature
    ctx.textAlign = 'right';
    ctx.fillText('معلم المادة : ............................', widthPx - marginX - 40, signaturesY);

    // Center signature
    ctx.textAlign = 'center';
    ctx.fillText('الموجه الفني : ............................', widthPx / 2, signaturesY);

    // Left signature
    ctx.textAlign = 'left';
    ctx.fillText('مدير المدرسة : ............................', marginX + 40, signaturesY);

    // 6. Footer (with QR Code without border on the right side)
    const footerLineY = heightPx - 102;
    const hasFooterQr = Boolean(qrImage);
    const footerQrSize = 88;
    const footerQrX = marginX + contentW - footerQrSize;
    const footerQrY = footerLineY + 6;
    const footerAvailW = hasFooterQr ? contentW - footerQrSize - 16 : contentW;
    const footerCenterX = marginX + footerAvailW / 2;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(marginX, footerLineY);
    ctx.lineTo(marginX + contentW, footerLineY);
    ctx.stroke();

    // Draw QR Code without any border
    if (hasFooterQr && qrImage) {
      ctx.save();
      ctx.drawImage(qrImage, footerQrX, footerQrY, footerQrSize, footerQrSize);
      ctx.restore();
    }

    const footerTextY = heightPx - 76;
    ctx.direction = 'rtl';
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';

    // 1. كتابة (رقم الصفحة - التاريخ) فى أقصى يسار سطر مسئول البيانات
    const pageNumberText = `صفحة ${pageIdx + 1} من ${totalPages}`;
    const pageInfoText = `${pageNumberText} - ${dateDisplay}`;
    let pageInfoFontSize = 14;
    ctx.font = `bold ${pageInfoFontSize}px "Cairo", sans-serif`;
    const pageInfoW = ctx.measureText(pageInfoText).width;
    const pageInfoLeftX = marginX + 16;
    ctx.textAlign = 'left';
    ctx.fillText(pageInfoText, pageInfoLeftX, footerTextY);

    // 2. توسيط سطر التوقيعات (مسئول البيانات والمعلومات - رئيس الكنترول - رئيس اللجنة) في وسط الصفحة
    const dataOfficerDisplay = dataOfficer.trim() ? dataOfficer.trim() : '................';
    const controlHeadDisplay = controlHead.trim() ? controlHead.trim() : '................';
    const committeeHeadDisplay = committeeHead.trim() ? committeeHead.trim() : '................';
    const signaturesText = `مسئول البيانات والمعلومات : ${dataOfficerDisplay}   رئيس الكنترول : ${controlHeadDisplay}   رئيس اللجنة : ${committeeHeadDisplay}`;
    let footerFontSize = 17.5;
    ctx.font = `bold ${footerFontSize}px "Cairo", sans-serif`;

    const maxSigW = footerAvailW - 32;

    while (footerFontSize > 10 && ctx.measureText(signaturesText).width > maxSigW) {
      footerFontSize -= 0.5;
      ctx.font = `bold ${footerFontSize}px "Cairo", sans-serif`;
    }
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillText(signaturesText, footerCenterX, footerTextY);

    // Horizontal Line (<hr>) and Bottom Tagline below Footer
    const subFooterHrY = heightPx - 50;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginX, subFooterHrY);
    ctx.lineTo(marginX + footerAvailW, subFooterHrY);
    ctx.stroke();

    const subFooterTextY = heightPx - 25;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const footerTagline = getActiveFooterTagline(selectedGrade, stage);
    let subFooterFontSize = 13;
    ctx.font = `bold ${subFooterFontSize}px "Cairo", sans-serif`;
    while (subFooterFontSize > 9 && ctx.measureText(footerTagline).width > footerAvailW - 16) {
      subFooterFontSize -= 0.5;
      ctx.font = `bold ${subFooterFontSize}px "Cairo", sans-serif`;
    }
    ctx.fillText(
      footerTagline,
      footerCenterX,
      subFooterTextY,
      footerAvailW - 16
    );

    // Snapshot canvas to JPEG (0.95 high quality)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const base64 = dataUrl.split(',')[1];
    const jpegBytes = base64ToUint8Array(base64);
    renderedPages.push({ jpegBytes, widthPx: canvas.width, heightPx: canvas.height });
  }

  // Build standard PDF binary in Landscape A4 (841.89 x 595.28 pt)
  const pdfBytes = buildPdfFromJpegPages(renderedPages, 841.89, 595.28);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const safeSubject = subjectLabel.replace(/[\\/:*?"<>|]/g, '_').trim();
  const safeGrade = selectedGrade.replace(/[\\/:*?"<>|]/g, '_').trim();
  const safeSemester = semText.replace(/[\\/:*?"<>|]/g, '_').trim();
  link.download = `كشف_رصد_تقييمات_${safeSubject}تفصيلا${safeGrade}_${safeSemester}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export interface ExportDetailedAssessmentsCertificatesPdfOptions {
  students: StudentData[];
  semester: string;
  selectedGrade: string;
  stage?: string;
  examIndex: 1 | 2; // 1 = First Exam, 2 = Second Exam
  schoolName?: string;
  schoolNameEn?: string;
  administration?: string;
  administrationEn?: string;
  governorate?: string;
  schoolLogo?: string;
  dataOfficer?: string;
  dataOfficerEn?: string;
  controlHead?: string;
  controlHeadEn?: string;
  committeeHead?: string;
  committeeHeadEn?: string;
  rowTheme?: string;
  showTotalScoreCircle?: boolean;
  isEnglishCertificate?: boolean;
  systemType?: 'regular' | 'homeschool' | string;
  title?: string;
  isHomeschool?: boolean;
  isMiddleHomeschool?: boolean;
}

/**
 * Generates and downloads an official, beautifully formatted A4 Portrait PDF file
 * containing one student certificate per page, exactly matching Screenshot_24.jpg:
 * - A4 Portrait (595.28 x 841.89 pt)
 * - Standard Header (إدارة / مدرسة)
 * - Official Title: شهادة درجات تقييمات الفصل الدراسي الأول 2026 – 2027 – تاريخ الطباعة بالشهر فقط ( 10 – 2026 )
 * - Ministerial Decree: وفقا للقرار الوزارى رقم 151 – 18 – 8 – 2026 م
 * - Student info row: الطالب / الصف الدراسي / المرحلة
 * - 7-Column Table with rounded corners:
 *   [المادة الدراسية] | كراسة الحصة (5) | كراسة الواجب (5) | التقييم الأسبوعى (10) | السلوك والمواظبة (5) | الإختبار (15) | المجموع
 *   - القسم الأول: المواد المضافة للمجموع
 *   - القسم الثاني: المواد الغير مضافة للمجموع
 * - Attendance note: النسبة المئوية لحضور الطالب = ........ %
 * - Signatures: رائد الفصل / شؤون الطلاب / مدير المدرسة
/**
 * يتحقق مما إذا كانت المادة ليس لها امتحان تحريري وفقاً لإعدادات المادة أو القرار الوزاري
 */
export function isSubjectWithoutWrittenExam(subj: any, cfgCustomCols?: any[], stage?: string): boolean {
  if (!subj) return false;
  const key = String(subj.key || '').trim().toLowerCase();
  const label = String(subj.label || subj.name || '').trim();
  const isPE = key === 'pe' || key === 'sport' || key === 'sports' || key === 'physical_education' || label.includes('رياضية') || label.includes('بدنية');
  
  // فى المرحلة الثانوية (سواء منتظمين أو منازل أو خدمات): مادة التربية الرياضية لها امتحان تحريري / عملي بنهاية الفصل
  if (isPE && (stage === 'secondary' || subj.hasWrittenExam === true)) {
    return false;
  }
  const found = cfgCustomCols?.find((c: any) => c.key === subj.key);
  if (isPE && found && found.hasWrittenExam === true) {
    return false;
  }

  // إذا كانت المادة محددة صراحة بأن لها امتحان تحريري
  if (subj.hasWrittenExam === true && !isPE) return false;
  if (found && found.hasWrittenExam === true && !isPE) return false;

  if (isPE) return true; // مادة التربية الرياضية في المراحل الأخرى (الابتدائي والإعدادي) ليس لها امتحان تحريري
  if (subj.hasWrittenExam === false) return true;
  if (subj.maxWrittenGrade === 0) return true;
  if (found && found.hasWrittenExam === false) return true;
  const nonWrittenKeys = [
    'tokkatsu', 'music', 'art', 'fields', 'activity',
    'activity1', 'activity2', 'educational_vocational_activity', 'valuesAndRespect'
  ];
  if (nonWrittenKeys.includes(key)) return true;
  if (
    label.includes('توكاتسو') ||
    label.includes('موسيقية') ||
    label.includes('نشاط') ||
    label.includes('أنشطة') ||
    label.includes('قيم')
  ) {
    return true;
  }
  return false;
}

/**
 * يتحقق مما إذا كانت المادة ليس لها اختبارات شهرية وفقاً لإعدادات المادة أو القرار الوزاري
 */
export function isSubjectWithoutTests(subj: any, cfgCustomCols?: any[], stage?: string): boolean {
  if (!subj) return false;
  if (subj.hasExams === false || subj.hasMonthlyExam === false) return true;
  return isSubjectWithoutWrittenExam(subj, cfgCustomCols, stage);
}

export function parseNumOrZero(val: any): { num: number; hasVal: boolean; isAbsent: boolean } {
  if (val === undefined || val === null || String(val).trim() === '') {
    return { num: 0, hasVal: false, isAbsent: false };
  }
  const s = String(val).trim();
  if (s === 'غ') return { num: 0, hasVal: true, isAbsent: true };
  const n = parseFloat(s.replace(',', '.'));
  if (!isNaN(n)) return { num: n, hasVal: true, isAbsent: false };
  return { num: 0, hasVal: false, isAbsent: false };
}

/**
 * يرسم دائرة المجموع الكلي يدوية وكأنها مرسومة باليد مثل المرفق تماماً (image_9c398ed9.jpg):
 * - دائرة حمراء عضوية مرسومة بالقلم الأحمر بحلقتين متداخلتين وضربات فرشاة طبيعية
 * - في الأعلى: درجة الطالب (المجموع الكلي) باللون الأحمر اليدوي
 * - في الوسط: خط كسر أفقي أحمر مرسوم باليد
 * - في الأسفل: الدرجة العظمى (المقام) باللون الأحمر اليدوي
 * - توضع في المساحة البيضاء بين توقيع شئون الطلاب وتوقيع مدير المدرسة
 */
function drawHandwrittenTotalScoreCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  scoreText: string,
  maxGrade?: number | string
) {
  ctx.save();
  ctx.direction = 'ltr';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const redInk = '#d32f2f'; // أحمر حبر قلم التصحيح كما في المرفق
  const redInkDeep = '#b71c1c';

  // 1. الحلقة الأولى الخارجية غير المنتظمة (Loop 1)
  ctx.beginPath();
  const steps = 72;
  const startAngle1 = -Math.PI * 0.45;
  const endAngle1 = startAngle1 + Math.PI * 2 + 0.65;
  for (let i = 0; i <= steps + 12; i++) {
    const angle = startAngle1 + (i / steps) * (Math.PI * 2);
    if (angle > endAngle1) break;
    // تموجات عضوية طبيعية مع فروقات طفيفة في نصف القطر تحاكي القلم اليدوي
    const wobble = Math.sin(angle * 2.2) * 2.4 + Math.cos(angle * 3.7) * 1.6 - Math.sin(angle * 5) * 0.8;
    const r = radius + wobble;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = redInk;
  ctx.lineWidth = 3.8;
  ctx.stroke();

  // 2. الحلقة الثانية المتداخلة الداخلية (Loop 2) لإعطاء إحساس تكرار خط القلم اليدوي المزدوج
  ctx.beginPath();
  const startAngle2 = startAngle1 + 0.35;
  const endAngle2 = startAngle2 + Math.PI * 2 + 0.45;
  for (let i = 0; i <= steps + 10; i++) {
    const angle = startAngle2 + (i / steps) * (Math.PI * 2);
    if (angle > endAngle2) break;
    const wobble2 = Math.cos(angle * 1.8) * 2.8 - Math.sin(angle * 3.2) * 1.4;
    const r2 = radius - 3.2 + wobble2;
    const x = cx + r2 * Math.cos(angle);
    const y = cy + r2 * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = redInkDeep;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // 3. خط الكسر الأفقي اليدوي (Hand-drawn horizontal fraction stroke)
  const lineHalfW = radius * 0.65;
  ctx.beginPath();
  ctx.moveTo(cx - lineHalfW, cy + 1.2);
  ctx.bezierCurveTo(
    cx - lineHalfW * 0.3, cy - 1.8,
    cx + lineHalfW * 0.3, cy + 2.2,
    cx + lineHalfW, cy - 0.6
  );
  ctx.strokeStyle = redInk;
  ctx.lineWidth = 3.6;
  ctx.stroke();

  // 4. كتابة البسط (درجة الطالب) في النصف العلوي
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = redInk;

  const displayScore = (scoreText || '').trim() || '0';
  let topFontSize = Math.round(radius * 0.58);
  ctx.font = `900 ${topFontSize}px "Cairo", sans-serif`;
  while (topFontSize > 13 && ctx.measureText(displayScore).width > radius * 1.35) {
    topFontSize -= 1;
    ctx.font = `900 ${topFontSize}px "Cairo", sans-serif`;
  }
  ctx.fillText(displayScore, cx, cy - radius * 0.38);

  // 5. كتابة المقام (الدرجة العظمى) في النصف السفلي
  const maxVal = maxGrade && String(maxGrade).trim() !== '' ? String(maxGrade).trim() : '100';
  let bottomFontSize = Math.round(radius * 0.54);
  ctx.font = `900 ${bottomFontSize}px "Cairo", sans-serif`;
  while (bottomFontSize > 13 && ctx.measureText(maxVal).width > radius * 1.35) {
    bottomFontSize -= 1;
    ctx.font = `900 ${bottomFontSize}px "Cairo", sans-serif`;
  }
  ctx.fillText(maxVal, cx, cy + radius * 0.44);

  ctx.restore();
}

export async function exportDetailedAssessmentsCertificatesPdf(
  options: ExportDetailedAssessmentsCertificatesPdfOptions
): Promise<void> {
  const {
    students,
    semester,
    selectedGrade,
    stage = 'primary',
    examIndex,
    schoolName = '',
    administration = '',
    dataOfficer: propDataOfficer,
    controlHead: propControlHead,
    committeeHead: propCommitteeHead,
    rowTheme: propRowTheme,
  } = options;

  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }
  } catch {}

  let sLogo = options.schoolLogo || localStorage.getItem('sheet_control_school_logo') || localStorage.getItem('school_logo') || '';
  try {
    const savedSchool = localStorage.getItem('sheet_control_school_data');
    if (savedSchool) {
      const parsedSchool = JSON.parse(savedSchool);
      if (!sLogo && parsedSchool.schoolLogo) sLogo = parsedSchool.schoolLogo;
    }
  } catch {}

  const [qrImage, penIcon, ministryLogoImage, schoolLogoImage] = await Promise.all([
    loadImage(qrCodeUrl),
    loadImage(signaturePenUrl),
    loadImage(ministryLogoUrl),
    sLogo ? loadImage(sLogo) : Promise.resolve(null),
  ]);

  const isSecondSem = semester === 'second';
  const isExam1 = examIndex === 1;
  const semText = isSecondSem ? 'الفصل الدراسي الثانى' : 'الفصل الدراسي الأول';
  const examName = isExam1 ? 'الإختبار الأول' : 'الإختبار الثانى';

  const sAdmin = localStorage.getItem('school_administration') || administration || '';
  const sName = localStorage.getItem('school_name') || schoolName || '';

  let dataOfficer = propDataOfficer || '';
  let controlHead = propControlHead || '';
  let committeeHead = propCommitteeHead || '';

  if (!dataOfficer || !controlHead || !committeeHead) {
    try {
      const stageKey = stage || '';
      const savedControlByStage = localStorage.getItem('sheet_control_control_data_by_stage');
      if (savedControlByStage) {
        const parsed = JSON.parse(savedControlByStage);
        const stageControl = parsed[stageKey] || parsed[''] || Object.values(parsed)[0];
        if (stageControl) {
          if (!dataOfficer && stageControl.dataOfficer) dataOfficer = stageControl.dataOfficer;
          if (!controlHead && stageControl.controlHead) controlHead = stageControl.controlHead;
          if (!committeeHead && stageControl.committeeHead) committeeHead = stageControl.committeeHead;
        }
      }
    } catch {}
  }
  if (!dataOfficer) dataOfficer = localStorage.getItem('school_data_officer') || '................';
  if (!controlHead) controlHead = localStorage.getItem('school_control_head') || '................';
  if (!committeeHead) committeeHead = localStorage.getItem('school_committee_head') || '................';

  // Read saved print row theme from localStorage
  const savedPrintTheme = typeof window !== 'undefined'
    ? (localStorage.getItem('pdf_print_row_theme') as RowBgTheme | null)
    : null;
  const activeRowTheme = (propRowTheme as RowBgTheme) || (savedPrintTheme && savedPrintTheme !== ('auto' as any) ? savedPrintTheme : 'attachment_3');
  const { evenBg, oddBg } = getReportRowBgColors('calling_list', false, activeRowTheme);

  // Month-Year string formatted in parentheses as in Screenshot_24: ( 10 – 2026 )
  let monthYearStr = '10 – 2026';
  if (!isSecondSem) {
    monthYearStr = isExam1 ? '10 – 2026' : '11 – 2026';
  } else {
    monthYearStr = isExam1 ? '3 – 2027' : '4 – 2027';
  }

  const isHomeschoolResolved = Boolean(
    options.isHomeschool ||
    options.isMiddleHomeschool ||
    options.systemType === 'homeschool' ||
    (options.title && (options.title.includes('منازل') || options.title.toLowerCase().includes('homeschool'))) ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('current_system_type') === 'homeschool' ||
      localStorage.getItem('systemType') === 'homeschool'
    ))
  );

  const isServicesResolved = !isHomeschoolResolved && Boolean(
    options.systemType === 'services' ||
    (options.title && (options.title.includes('خدمات') || options.title.toLowerCase().includes('services'))) ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('current_system_type') === 'services' ||
      localStorage.getItem('systemType') === 'services'
    ))
  );

  const isExplicitlyRegular = !isHomeschoolResolved && !isServicesResolved && Boolean(
    options.systemType === 'regular' ||
    (options.title && (options.title.includes('منتظمين') || options.title.toLowerCase().includes('regular'))) ||
    (typeof window !== 'undefined' && localStorage.getItem('current_system_type') === 'regular')
  );
  const isMiddleHomeschool = (stage === 'prep' || stage === 'middle') && isHomeschoolResolved;

  // Stage display name
  const stageDisplay =
    stage === 'primary' ? 'المرحلة الابتدائية' :
    stage === 'prep' || stage === 'middle' ? (isMiddleHomeschool ? 'المرحلة الإعدادية ( منازل )' : 'المرحلة الإعدادية ( منتظمين )') :
    stage === 'secondary' ? (
      isHomeschoolResolved ? 'المرحلة الثانوية العامة ( منازل )' :
      isServicesResolved ? 'المرحلة الثانوية العامة ( خدمات )' :
      'المرحلة الثانوية العامة ( منتظمين )'
    ) :
    stage === 'kindergarten' ? 'مرحلة رياض الأطفال' : 'المرحلة الابتدائية';

  // Get subjects config for this stage/grade
  const cfg = getSubjectsConfigForStageGrade(stage, selectedGrade, isHomeschoolResolved);
  let baseSubjects: any[] = cfg.customCols || [];
  const savedColsStr = typeof window !== 'undefined'
    ? (isMiddleHomeschool
        ? (localStorage.getItem(`${stage}_${selectedGrade}_homeschool_assessments_custom_cols`) || localStorage.getItem(`${stage}_${selectedGrade}_assessments_custom_cols`))
        : localStorage.getItem(`${stage}_${selectedGrade}_assessments_custom_cols`))
    : null;
  if (savedColsStr) {
    try {
      const parsed = JSON.parse(savedColsStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        baseSubjects = parsed.map((c: any) => ({
          key: c.key,
          label: c.label || c.name || c.key,
          isAddedToTotal: c.isAddedToTotal !== false,
          maxGrade: c.maxGrade || 100,
          maxAssessmentsGrade: isMiddleHomeschool ? 0 : (c.maxAssessmentsGrade || 40),
          maxWrittenGrade: isMiddleHomeschool ? 100 : 30,
          hasWrittenExam: c.hasWrittenExam !== false,
        }));
      }
    } catch {}
  }

  // فى المرحلة الإعدادية والمرحلة الثانوية - منازل فقط: استبعاد المواد التى ليس لها امتحان تحريرى
  if (isMiddleHomeschool || (stage === 'secondary' && isHomeschoolResolved)) {
    baseSubjects = baseSubjects.filter((s) => {
      const ovr = cfg?.defaultSubjectsOverrides?.[s.key];
      const hasExam = ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : (s.hasWrittenExam !== undefined ? s.hasWrittenExam : true);
      return hasExam !== false;
    });
  }

  let addedSubjects = baseSubjects.filter(s => s.isAddedToTotal !== false);
  let nonAddedSubjects = baseSubjects.filter(s => s.isAddedToTotal === false);

  if (addedSubjects.length === 0 && nonAddedSubjects.length === 0) {
    addedSubjects = [
      { key: 'arabic', label: 'اللغة العربية' },
      { key: 'math', label: 'الرياضيات' },
      { key: 'science', label: 'العلوم' },
      { key: 'english', label: 'اللغة الإنجليزية' },
      { key: 'social_studies', label: 'الدراسات الاجتماعية' },
    ];
    nonAddedSubjects = [
      { key: 'religion', label: 'التربية الدينية' },
      { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات' },
      { key: 'art', label: 'التربية الفنية' },
      { key: 'pe', label: 'التربية الرياضية' },
    ];
  }

  // في جزء المواد الغير مضافة للمجموع: جعل صفوف المواد التى لها امتحان تحريرى قبل صفوف المواد التى ليس لها امتحان تحريرى
  const nonAddedWithWritten = nonAddedSubjects.filter(s => !isSubjectWithoutWrittenExam(s, cfg?.customCols, stage));
  const nonAddedWithoutWritten = nonAddedSubjects.filter(s => isSubjectWithoutWrittenExam(s, cfg?.customCols, stage));
  nonAddedSubjects = [...nonAddedWithWritten, ...nonAddedWithoutWritten];

  // Exact page dimensions for Portrait A4: 1240 x 1754 px
  const widthPx = 1240;
  const heightPx = 1754;
  const marginX = 55;
  const contentW = widthPx - marginX * 2; // 1130 px

  // Date calculation for footer
  const now = new Date();
  let day = now.getDate();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(now);
    const d = parts.find((p) => p.type === 'day')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const y = parts.find((p) => p.type === 'year')?.value;
    if (d && m && y) {
      day = parseInt(d, 10);
      month = parseInt(m, 10);
      year = parseInt(y, 10);
    }
  } catch {}
  const dateDisplay = `${day} - ${month} - ${year} م`;

  // Render a page for each student (or 1 blank template if students is empty)
  const studentList = students.length > 0 ? students : [{} as StudentData];
  const renderedPages: { jpegBytes: Uint8Array; widthPx: number; heightPx: number }[] = [];

  for (let studentIdx = 0; studentIdx < studentList.length; studentIdx++) {
    const student = studentList[studentIdx];
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    canvas.dir = 'rtl';
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Background fill
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // 1. Top Row: الإدارة : ... (Far right) & المدرسة : ... (Far left)
    // زيادة ارتفاع الهيدر بنسبة 100% فى جميع المراحل ما عدا رياض الأطفال
    const isKgStage = stage === 'kindergarten';
    const topInfoY = isKgStage ? 35 : 16;
    const topInfoH = isKgStage ? 40 : 136; // زيادة ارتفاع الهيدر بنسبة 100%
    ctx.direction = 'rtl';
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px "Cairo", sans-serif';

    const adminDisplay = sAdmin.trim() ? `الإدارة :  ${sAdmin.trim()}` : 'الإدارة :  ........................';
    const schoolDisplay = sName.trim()
      ? `${isKgStage ? 'الروضة' : 'المدرسة'} :  ${sName.trim()}`
      : `${isKgStage ? 'الروضة' : 'المدرسة'} :  ........................`;

    // Far Right: الإدارة
    ctx.textAlign = 'right';
    ctx.fillText(adminDisplay, marginX + contentW, topInfoY + topInfoH / 2);

    let schoolX = marginX;
    let logoActualH = 112;
    let logoActualW = 112;
    let logoY = topInfoY + (topInfoH - logoActualH) / 2;

    // وضع اللوجو فى أقصى يسار الصفحة (يسار اسم المدرسة) في المراحل غير رياض الأطفال
    if (!isKgStage) {
      const activeLogo = schoolLogoImage || ministryLogoImage;
      if (activeLogo) {
        logoActualH = 112; // ارتفاع متناسق مع ارتفاع الهيدر الجديد (136px)
        const logoNatW = activeLogo.naturalWidth || (activeLogo as any).width || 1;
        const logoNatH = activeLogo.naturalHeight || (activeLogo as any).height || 1;
        const logoAspect = logoNatW / logoNatH;
        logoActualW = Math.round(logoActualH * logoAspect);
        logoY = topInfoY + (topInfoH - logoActualH) / 2;
        // وضع اللوجو فى أقصى يسار الصفحة (يسار اسم المدرسة)
        const logoX = marginX;
        drawCrispImage(ctx, activeLogo, logoX, logoY, logoActualW, logoActualH);
        // اسم المدرسة بجوار اللوجو جهة اليمين (بحيث يقع اللوجو يسار اسم المدرسة)
        schoolX = marginX + logoActualW + 24;
      }
    }

    // Far Left: المدرسة (يمين اللوجو بحيث يقع اللوجو يسار اسم المدرسة)
    ctx.textAlign = 'left';
    ctx.fillText(schoolDisplay, schoolX, topInfoY + topInfoH / 2);

    // Horizontal Divider Line (<hr>)
    // زيادة المسافة بين اللوجو والخط الفاصل الموجود أسفل منه بمقدار 60% من المسافة الحالية
    // المسافة الحالية كانت: 14px -> الزيادة بنسبة 60% تصبح: 23px
    const headerLineY = !isKgStage
      ? (logoY + logoActualH + 23)
      : (topInfoY + topInfoH + 8);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(marginX, headerLineY);
    ctx.lineTo(marginX + contentW, headerLineY);
    ctx.stroke();

    // 2. Title Banner (Burnt Brown Gradient - بنى محروق كما فى باقى التقارير)
    const bannerY = headerLineY + 12;
    const bannerH = 72;
    const bannerGrad = ctx.createLinearGradient(marginX, bannerY, marginX + contentW, bannerY);
    bannerGrad.addColorStop(0, '#361500');
    bannerGrad.addColorStop(0.25, '#5c270d');
    bannerGrad.addColorStop(0.5, '#9a5826');
    bannerGrad.addColorStop(0.75, '#5c270d');
    bannerGrad.addColorStop(1, '#361500');

    drawRoundedRect(ctx, marginX, bannerY, contentW, bannerH, 16);
    ctx.fillStyle = bannerGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    // اسم الشهر الحالى - 2026
    let currentMonthName = 'أكتوبر';
    if (!isSecondSem) {
      currentMonthName = isExam1 ? 'أكتوبر' : 'نوفمبر';
    } else {
      currentMonthName = isExam1 ? 'مارس' : 'أبريل';
    }

    const titleText = `شهادة درجات تقييمات ${semText} – ${currentMonthName} - 2026`;

    let decreeText = 'وفقا للقرار الوزارى رقم 151 – 18 – 8 – 2026 م';
    if (stage === 'prep' || stage === 'middle') {
      decreeText = 'وفقا للقرار الوزارى رقم 137 - 12 - 08 - 2024 م';
    } else if (stage === 'secondary') {
      decreeText = 'وفقا للقرار الوزارى رقم 234 - 17 - 09 - 2025 م';
    }

    if (!isKgStage) {
      // نقل نص وفقا للقرار إلى أقصى يسار شريط العنوان البني في جميع المراحل ما عدا رياض الأطفال
      ctx.fillStyle = '#ffffff';
      let decreeFontSize = 14;
      ctx.font = `bold ${decreeFontSize}px "Cairo", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const decreeLeftX = marginX + 24;
      ctx.fillText(decreeText, decreeLeftX, bannerY + bannerH / 2 + 1);
      const decreeW = ctx.measureText(decreeText).width;

      // وضع نص العنوان فى أقصى يمين الشريط البنى
      ctx.fillStyle = '#ffffff';
      let titleRightX = marginX + contentW - 24;

      // فى المرحلة الاعدادية - منازل فقط : اكتب فى اقصى يمين شريط العنوان كلمة : منازل
      // لا تكتب كلمة منازل فى شهادات المرحلة الاعدادية منتظمين
      const isStudentRegular = Boolean(
        (student as any).systemType === 'regular' ||
        (student as any).enrollmentType === 'منتظم' ||
        (student as any).enrollmentType === 'نظامى' ||
        (student as any).enrollmentStatus === 'منتظم' ||
        (student as any).enrollmentStatus === 'نظامى' ||
        student.studentStatus === 'نظامى' ||
        student.studentStatus === 'عادى' ||
        student.studentStatus === 'منتظم'
      );
      const isStudentHomeschool = !isStudentRegular && !isExplicitlyRegular && Boolean(
        isMiddleHomeschool ||
        (student as any).systemType === 'homeschool' ||
        (student as any).enrollmentType === 'منازل' ||
        (student as any).enrollmentStatus === 'منازل' ||
        student.studentStatus === 'منازل'
      );

      if (isMiddleHomeschool && isStudentHomeschool && !isStudentRegular && !isExplicitlyRegular) {
        const homeschoolText = 'منازل';
        ctx.font = '900 28px "Cairo", sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(homeschoolText, titleRightX, bannerY + bannerH / 2 + 1);
        const hsW = ctx.measureText(homeschoolText).width;
        titleRightX = titleRightX - hsW - 20;
      }

      let bannerFontSize = 33;
      ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;
      const maxTitleW = titleRightX - (decreeLeftX + decreeW + 24);
      while (bannerFontSize > 14 && ctx.measureText(titleText).width > maxTitleW) {
        bannerFontSize -= 0.5;
        ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;
      }
      // تطبيق تصغير حجم الخط بنسبة 15% فعلياً ومباشرة بعد الملاءمة حتى ينعكس التغيير بوضوح تام على الشهادة
      bannerFontSize = Math.max(12, Math.round(bannerFontSize * 0.85 * 10) / 10);
      ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(titleText, titleRightX, bannerY + bannerH / 2 + 1);
    } else {
      ctx.fillStyle = '#ffffff';
      let bannerFontSize = 23;
      ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;
      while (bannerFontSize > 14 && ctx.measureText(titleText).width > contentW - 32) {
        bannerFontSize -= 1;
        ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(titleText, marginX + contentW / 2, bannerY + bannerH / 2 + 2);
    }

    // 3. Subtitle / Decree Line
    const decreeY = bannerY + bannerH + 24;

    // 4. Student Info Section & Total Score Circle:
    // بجوار الصف - المرحلة - رقم اللجنة - رقم الجلوس: ضع المجموع الكلى فى دائرة مثل المرفق تماما
    const isFemale =
      student.gender === 'female' ||
      student.gender === 'أنثى' ||
      student.gender === 'بنت' ||
      (Boolean(student.nationalId) && student.nationalId!.length === 14 && parseInt(student.nationalId![12], 10) % 2 === 0);

    const studentPrefix = isFemale ? 'الطالبة' : 'الطالب';
    const studentNameVal = student.name ? student.name.trim() : '................................';
    const gradeVal = selectedGrade ? selectedGrade.trim() : '................';
    
    // عدم تكرار كلمة المرحلة
    let cleanStage = stageDisplay.trim().startsWith('المرحلة')
      ? stageDisplay.trim()
      : `المرحلة ${stageDisplay.trim()}`;
    if (stage === 'secondary' && isHomeschoolResolved) {
      cleanStage = cleanStage.replace(/\(\s*منتظمين\s*\)/g, '( منازل )');
      if (!cleanStage.includes('منازل')) {
        cleanStage = `${cleanStage} ( منازل )`;
      }
    }

    const isMiddleStage = stage === 'middle' || stage === 'prep';
    const isSecondaryStage = stage === 'secondary';
    const isMiddleOrSecondaryStage = isMiddleStage || isSecondaryStage;
    const semKey = isSecondSem ? 'second' : 'first';

    const seatNumberVal = (
      student.seatNumbers?.[semKey] ||
      student.seatNumbers?.[semester] ||
      student.seatNumber ||
      ''
    ).trim() || '........';

    const committeeNumberVal = (
      student.committeeNumbers?.[semKey] ||
      student.committeeNumbers?.[semester] ||
      student.committeeNumber ||
      ''
    ).trim() || '........';

    // احتساب المجموع الكلي للطالب في الاختبار الشهري
    let certTotalScore = 0;
    let certTotalMax = 0;
    let certHasAny = false;
    let certAllAbsent = true;

    for (const subj of addedSubjects) {
      const item = student.detailedAssessments?.[semester]?.[subj.key];
      const notebook = item?.classNotebook ?? '';
      const homework = item?.homework ?? '';
      const weekly = item?.weeklyAssessment ?? '';
      const behavior = item?.behavior ?? '';
      const examVal = isExam1 ? (item?.firstMonthlyExam ?? '') : (item?.secondMonthlyExam ?? '');
      const parts = isMiddleOrSecondaryStage
        ? [homework, weekly, behavior, examVal]
        : [notebook, homework, weekly, behavior, examVal];
      const hasAnyPart = parts.some((p) => p && String(p).trim() !== '');
      if (hasAnyPart) {
        certHasAny = true;
        let sum = 0;
        let isAnyAbsent = parts.some((p) => String(p).trim() === 'غ');
        let allValid = true;
        for (const p of parts) {
          const str = String(p || '').trim();
          if (!str || str === 'غ') continue;
          const num = parseFloat(str.replace(',', '.'));
          if (!isNaN(num)) sum += num;
          else allValid = false;
        }
        if (!isAnyAbsent || sum > 0) {
          certAllAbsent = false;
          certTotalScore += sum;
        }
      }
      certTotalMax += (isMiddleOrSecondaryStage ? 70 : 40);
    }

    let certTotalDisplay = '........';
    if (certAllAbsent && certHasAny) {
      certTotalDisplay = 'غ';
    } else if (certHasAny) {
      const rounded = Math.round(certTotalScore * 10) / 10;
      certTotalDisplay = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }

    // سطر بيانات الطالب: اسم الطالب فى أقصى اليمين، والصف والمرحلة ورقم اللجنة ورقم الجلوس فى أقصى اليسار
    const infoY = !isKgStage ? (bannerY + bannerH + 28) : (decreeY + 36);

    // اسم الطالب فى أقصى اليمين باللون الأحمر القاتم
    const studentRightText = `${studentPrefix} : ${studentNameVal}`;
    ctx.direction = 'rtl';
    ctx.fillStyle = '#7f1d1d';
    ctx.textBaseline = 'middle';
    let rightFontSize = 23;
    ctx.font = `900 ${rightFontSize}px "Cairo", sans-serif`;
    ctx.textAlign = 'right';
    const maxRightW = contentW * 0.44;
    while (rightFontSize > 14 && ctx.measureText(studentRightText).width > maxRightW) {
      rightFontSize -= 0.5;
      ctx.font = `900 ${rightFontSize}px "Cairo", sans-serif`;
    }
    ctx.fillText(studentRightText, marginX + contentW, infoY);
    const measuredRightW = ctx.measureText(studentRightText).width;

    // تنظيف اسم الصف من أية زوائد تقنية (_scientific, _literary, modern tracks)
    const cleanGradeRaw = gradeVal
      .replace(/_scientific/gi, '')
      .replace(/_literary/gi, '')
      .replace(/_modern_medical/gi, '')
      .replace(/_modern_engineering/gi, '')
      .replace(/_modern_business/gi, '')
      .replace(/_modern_arts/gi, '')
      .replace(/\s*-\s*scientific/gi, '')
      .replace(/\s*-\s*literary/gi, '')
      .replace(/scientific/gi, '')
      .replace(/literary/gi, '')
      .trim();
    const gradeDisplayFormatted = cleanGradeRaw.startsWith('الصف ')
      ? cleanGradeRaw
      : `الصف ${cleanGradeRaw}`;

    // التحقق مما إذا كانت المرحلة الثانوية - الصف الثاني
    const isSec2 = isSecondaryStage && (
      selectedGrade?.includes('الثاني') ||
      selectedGrade?.includes('الثانى') ||
      selectedGrade?.toLowerCase().includes('2nd') ||
      selectedGrade?.includes('2')
    );

    let divisionArabic = '';
    if (isSec2) {
      const gradeLower = (selectedGrade || '').toLowerCase();
      const studentDiv = (((student as any)?.division || '') as string).toLowerCase();
      let localDiv = '';
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('sheet_control_school_data');
          if (raw) localDiv = (JSON.parse(raw)?.division || '').toLowerCase();
        } catch {}
      }

      if (
        gradeLower.includes('modern_medical') ||
        gradeLower.includes('medical') ||
        gradeLower.includes('الطب') ||
        studentDiv.includes('medical') ||
        studentDiv.includes('الطب') ||
        localDiv === 'modern_medical'
      ) {
        divisionArabic = 'مسار الطب وعلوم الحياة';
      } else if (
        gradeLower.includes('modern_engineering') ||
        gradeLower.includes('engineering') ||
        gradeLower.includes('الهندسة') ||
        studentDiv.includes('engineering') ||
        studentDiv.includes('الهندسة') ||
        localDiv === 'modern_engineering'
      ) {
        divisionArabic = 'مسار الهندسة وعلوم الحاسب';
      } else if (
        gradeLower.includes('modern_business') ||
        gradeLower.includes('business') ||
        gradeLower.includes('الأعمال') ||
        gradeLower.includes('الاعمال') ||
        studentDiv.includes('business') ||
        studentDiv.includes('الأعمال') ||
        localDiv === 'modern_business'
      ) {
        divisionArabic = 'مسار الأعمال';
      } else if (
        gradeLower.includes('modern_arts') ||
        gradeLower.includes('arts') ||
        gradeLower.includes('الآداب') ||
        gradeLower.includes('الاداب') ||
        studentDiv.includes('arts') ||
        studentDiv.includes('الآداب') ||
        localDiv === 'modern_arts'
      ) {
        divisionArabic = 'مسار الآداب والفنون';
      } else if (
        gradeLower.includes('scientific') ||
        gradeLower.includes('علمي') ||
        gradeLower.includes('علمى') ||
        studentDiv.includes('scientific') ||
        studentDiv.includes('علم') ||
        localDiv === 'scientific'
      ) {
        divisionArabic = 'الشعبة العلمية';
      } else if (
        gradeLower.includes('literary') ||
        gradeLower.includes('أدبي') ||
        gradeLower.includes('أدبى') ||
        studentDiv.includes('literary') ||
        studentDiv.includes('أدب') ||
        localDiv === 'literary'
      ) {
        divisionArabic = 'الشعبة الأدبية';
      } else {
        divisionArabic = 'الشعبة الأدبية';
      }
    }

    // تعديل سطر الصف فى المرحلة الثانوية - الصف الثانى إلى:
    // الصف - الشعبة باللغة العربية - المرحلة - رقم اللجنة رقم الجلوس
    const infoItemsText = isSec2 && divisionArabic
      ? `${gradeDisplayFormatted}   •   ${divisionArabic}   •   ${cleanStage}   •   رقم اللجنة : ${committeeNumberVal}   •   رقم الجلوس : ${seatNumberVal}`
      : `${gradeDisplayFormatted}   •   ${cleanStage}   •   رقم اللجنة : ${committeeNumberVal}   •   رقم الجلوس : ${seatNumberVal}`;
    ctx.fillStyle = '#0f172a';
    let itemsFontSize = 19;
    ctx.font = `bold ${itemsFontSize}px "Cairo", sans-serif`;
    ctx.textAlign = 'left';
    const maxItemsW = contentW - measuredRightW - 24;
    while (itemsFontSize > 11 && ctx.measureText(infoItemsText).width > maxItemsW) {
      itemsFontSize -= 0.5;
      ctx.font = `bold ${itemsFontSize}px "Cairo", sans-serif`;
    }
    ctx.fillText(infoItemsText, marginX, infoY);

    // 5. Table Setup
    const tableTopY = infoY + 28;
    const spacer1Width = 12; // 0.2 سم (2 مم)
    const spacer2Width = 12; // 0.2 سم (2 مم)
    const isSecondary2Modern = checkIsSecondary2Modern(stage, selectedGrade);

    // Columns in RTL order (summing to exactly contentW = 1130 px):
    // للصف الثاني الثانوي - بكالوريا - النظام الحديث (فقط):
    // التقييم الأسبوعي (20) + المشروع البحثي (15) + الحصة والواجبات (15) + السلوك والمواظبة (10) + الاختبار (20) = 80
    // المرحلة الإعدادية والثانوية العامة: 6 أعمدة + عمودين فارغين (عرض 0.2 سم)
    // المرحلة الابتدائية: 7 أعمدة + عمودين فارغين (عرض 0.2 سم)
    const tableColumns = isSecondary2Modern
      ? [
          { key: 'subject', title: 'بنود التقييم', width: 250, max: 'العظمى' },
          // عمود فارغ بعد حقل اسم المواد بعرض 0.2 سم (12 px)
          { key: 'spacer1', title: '', width: spacer1Width, max: '' },
          { key: 'weekly', title: 'التقييم الأسبوعي', width: 140, max: '20' },
          { key: 'researchProject', title: 'المشروع البحثي', width: 140, max: '15' },
          { key: 'homework', title: 'الحصة والواجبات', width: 150, max: '15' },
          { key: 'behavior', title: 'السلوك والمواظبة', width: 130, max: '10' },
          { key: 'exam', title: examName, width: 140, max: '20' },
          // عمود فارغ قبل حقل المجموع بعرض 0.2 سم (12 px)
          { key: 'spacer2', title: '', width: spacer2Width, max: '' },
          { key: 'total', title: 'المجموع', width: 156, max: '80' },
        ]
      : isMiddleOrSecondaryStage
      ? [
          { key: 'subject', title: 'بنود التقييم', width: 258, max: 'العظمى' },
          // عمود فارغ بعد حقل اسم المواد بعرض 0.2 سم (12 px)
          { key: 'spacer1', title: '', width: spacer1Width, max: '' },
          { key: 'homework', title: 'كراسة الواجب', width: 170, max: isSecondaryStage ? '15' : '10' },
          { key: 'weekly', title: 'التقييم الأسبوعى', width: 174, max: isSecondaryStage ? '15' : '20' },
          { key: 'behavior', title: 'السلوك والمواظبة', width: 170, max: '10' },
          { key: 'exam', title: examName, width: 164, max: '15' },
          // عمود فارغ قبل حقل المجموع بعرض 0.2 سم (12 px)
          { key: 'spacer2', title: '', width: spacer2Width, max: '' },
          { key: 'total', title: 'المجموع', width: 170, max: '70' },
        ]
      : [
          { key: 'subject', title: 'بنود التقييم', width: 234, max: 'العظمى' },
          // عمود فارغ بعد حقل اسم المواد بعرض 0.2 سم (12 px)
          { key: 'spacer1', title: '', width: spacer1Width, max: '' },
          { key: 'notebook', title: 'كراسة الحصة', width: 138, max: '5' },
          { key: 'homework', title: 'كراسة الواجب', width: 138, max: '5' },
          { key: 'weekly', title: 'التقييم الأسبوعى', width: 164, max: '10' },
          { key: 'behavior', title: 'السلوك والمواظبة', width: 160, max: '5' },
          { key: 'exam', title: examName, width: 140, max: '15' },
          // عمود فارغ قبل حقل المجموع بعرض 0.2 سم (12 px)
          { key: 'spacer2', title: '', width: spacer2Width, max: '' },
          { key: 'total', title: 'المجموع', width: 132, max: '40' },
        ];

    let curXCol = marginX + contentW;
    let spacer1X = 0;
    let spacer2X = 0;
    tableColumns.forEach((col) => {
      const cX = curXCol - col.width;
      if (col.key === 'spacer1') spacer1X = cX;
      if (col.key === 'spacer2') spacer2X = cX;
      curXCol -= col.width;
    });

    // تقليل ارتفاع الصف المرفق (صف العناوين الأول) بنسبة 6% (من 96 إلى 90)
    const headerRow1H = 90;
    const headerRow2H = 55;
    const sectionHeaderH = 90; // زيادة ارتفاع صف سطر العنوان (المواد المضافة وغير المضافة للمجموع) بمقدار 15% (من 78 إلى 90)
    const emptyRowH = Math.round(sectionHeaderH * 0.25); // صف أبيض فارغ بارتفاع 25% من ارتفاع صف المواد المضافة للمجموع (23 بكسل)
    const dataRowH = 52;

    const tableTotalH =
      headerRow1H +
      headerRow2H +
      emptyRowH * 2 + // صف فارغ فوق المواد المضافة وفوق المواد غير المضافة
      sectionHeaderH * 2 +
      (addedSubjects.length + nonAddedSubjects.length) * dataRowH;

    // تدوير أركان الجدول فى الملف (16px radius)
    ctx.save();
    drawRoundedRect(ctx, marginX, tableTopY, contentW, tableTotalH, 16);
    ctx.clip();

    let curY = tableTopY;
    const failedCellsWhiteBorders: { cX: number; curY: number; width: number; rowHeight: number }[] = [];

    // Helper to draw a table row with cells
    const drawRowCells = (
      cells: { text: string; width: number; isBold?: boolean; fontSize?: number; bg?: string; textColor?: string; hasRedCircle?: boolean }[],
      rowHeight: number,
      rowBg?: string | CanvasGradient
    ) => {
      // If rowBg is provided, fill the entire row width first
      if (rowBg) {
        ctx.fillStyle = rowBg;
        ctx.fillRect(marginX, curY, contentW, rowHeight);
      }

      let curX = marginX + contentW;
      cells.forEach((cell) => {
        const cX = curX - cell.width;

        if ((cell as any).isSpacer) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cX, curY, cell.width, rowHeight);
          curX -= cell.width;
          return;
        }

        // Background
        const isCellFailed = Boolean(cell.hasRedCircle && cell.text !== '-' && cell.text.trim() !== '');
        if (isCellFailed) {
          // خلفية باللون الأحمر القاتم للخلايا غير المجتازة
          ctx.fillStyle = '#b91c1c';
          ctx.fillRect(cX, curY, cell.width, rowHeight);
        } else if (!rowBg && cell.bg) {
          ctx.fillStyle = cell.bg;
          ctx.fillRect(cX, curY, cell.width, rowHeight);
        }

        // Border
        if (isCellFailed) {
          // الحد الأيمن والأيسر بلون حدود الجدول
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cX, curY);
          ctx.lineTo(cX, curY + rowHeight);
          ctx.moveTo(cX + cell.width, curY);
          ctx.lineTo(cX + cell.width, curY + rowHeight);
          ctx.stroke();

          // الحد العلوي والسفلي باللون الأبيض للخلية ذات اللون الأحمر القاتم
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cX, curY);
          ctx.lineTo(cX + cell.width, curY);
          ctx.moveTo(cX, curY + rowHeight);
          ctx.lineTo(cX + cell.width, curY + rowHeight);
          ctx.stroke();

          failedCellsWhiteBorders.push({ cX, curY, width: cell.width, rowHeight });
        } else {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cX, curY, cell.width, rowHeight);
        }

        // Text
        if (cell.text) {
          // النص باللون الأبيض إذا كانت الخلية باللون الأحمر القاتم
          ctx.fillStyle = isCellFailed ? '#ffffff' : (cell.textColor || '#0f172a');
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let targetFontSize = cell.fontSize || 18;
          ctx.font = `${cell.isBold !== false ? 'bold' : 'normal'} ${targetFontSize}px "Cairo", sans-serif`;
          const horizontalPadding = Math.min(8, Math.max(4, Math.round(cell.width * 0.08)));
          const maxTextW = Math.max(10, cell.width - horizontalPadding * 2);
          while (targetFontSize > 10 && ctx.measureText(cell.text).width > maxTextW) {
            targetFontSize -= 0.5;
            ctx.font = `${cell.isBold !== false ? 'bold' : 'normal'} ${targetFontSize}px "Cairo", sans-serif`;
          }
          // توسيط تام للقيم في خلايا الجدول أفقياً ورأسياً بمسافات متساوية من الجهات الأربعة
          ctx.fillText(cell.text, cX + cell.width / 2, curY + rowHeight / 2, maxTextW);
        }

        curX -= cell.width;
      });
      curY += rowHeight;
    };

    // Helper to draw a spanning section row (المواد المضافة للمجموع / المواد الغير مضافة للمجموع)
    const drawSpanningSection = (title: string, rowHeight: number) => {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(marginX, curY, contentW, rowHeight);

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(marginX, curY, contentW, rowHeight);

      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 21.5px "Cairo", sans-serif';
      ctx.fillText(title, marginX + contentW / 2, curY + rowHeight / 2, contentW - 32);

      curY += rowHeight;
    };

    // Helper to draw an empty white row (صف أبيض فارغ بارتفاع 25% من ارتفاع صف المواد المضافة)
    const emptyWhiteRowYs: { y: number; h: number }[] = [];
    const drawEmptyWhiteRow = (rowHeight: number) => {
      emptyWhiteRowYs.push({ y: curY, h: rowHeight });

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(marginX, curY, contentW, rowHeight);

      curY += rowHeight;
    };

    // Row 1: Header Titles (خلفية بلون سماوي ثلجي فاتح مميز ومخفف بنسبة 20%)
    const headerRowGrad = ctx.createLinearGradient(marginX, curY, marginX + contentW, curY);
    headerRowGrad.addColorStop(0, '#e8f6fe');   // الدرجة الأولى: سماوي ثلجي فاتح جداً وناعم
    headerRowGrad.addColorStop(0.5, '#97dcfd'); // الدرجة الثانية: أزرق سماوي مخفف وهادئ في الوسط
    headerRowGrad.addColorStop(1, '#c8ebfd');   // الدرجة الثالثة: فيروزي سماوي فاتح ورقيق

    drawRowCells(
      tableColumns.map((col) => ({
        text: col.title,
        width: col.width,
        fontSize: col.key === 'subject' ? 20 : 18,
        isSpacer: col.key === 'spacer1' || col.key === 'spacer2',
      })),
      headerRow1H,
      headerRowGrad
    );

    // Row 2: Max Grades (تكبير حجم الخط بنسبة 20%)
    drawRowCells(
      tableColumns.map((col) => ({
        text: col.max,
        width: col.width,
        fontSize: 22,
        bg: '#f1f5f9',
        isSpacer: col.key === 'spacer1' || col.key === 'spacer2',
      })),
      headerRow2H
    );

    // صف أبيض فارغ بحدود داخلية وخارجية بيضاء بارتفاع 25% من ارتفاع صف المواد المضافة فوق صف المواد المضافة
    drawEmptyWhiteRow(emptyRowH);

    // Helper to compute student's mark in a subject with theme row shading:
    const getSubjectRowCells = (subj: any, rIdx: number) => {
      const isNonWritten = stage !== 'kindergarten' && isSubjectWithoutWrittenExam(subj, cfg?.customCols, stage);
      const item = student.detailedAssessments?.[semester]?.[subj.key];
      const notebook = item?.classNotebook ?? '';
      const homework = item?.homework ?? '';
      const weekly = item?.weeklyAssessment ?? '';
      const behavior = item?.behavior ?? '';
      const researchProject = item?.researchProject ?? '';
      const examVal = isExam1 ? (item?.firstMonthlyExam ?? '') : (item?.secondMonthlyExam ?? '');

      // Calculate total automatically
      let totalStr = '';
      if (isSecondary2Modern) {
        const parts = [weekly, researchProject, homework, behavior, examVal];
        const hasAny = parts.some((p) => p && String(p).trim() !== '');
        if (hasAny) {
          let sum = 0;
          let isAnyAbsent = parts.some((p) => String(p).trim() === 'غ');
          let allValid = true;
          for (const p of parts) {
            const str = String(p || '').trim();
            if (!str) continue;
            if (str === 'غ') continue;
            const num = parseFloat(str.replace(',', '.'));
            if (!isNaN(num)) {
              sum += num;
            } else {
              allValid = false;
            }
          }
          if (isAnyAbsent && sum === 0) {
            totalStr = 'غ';
          } else if (allValid) {
            const rounded = Math.round(sum * 10) / 10;
            totalStr = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
          }
        }
      } else if (isNonWritten) {
        // للمواد التي ليس لها امتحان تحريري (بما فيها التربية الرياضية):
        // مزامنة درجة مجموع التقييمات من item?.total أو من assessments
        const rawItemTotal = item?.total;
        if (rawItemTotal !== undefined && rawItemTotal !== null && String(rawItemTotal).trim() !== '') {
          totalStr = String(rawItemTotal).trim();
        } else {
          const isPESubj = subj.key === 'pe' || subj.key === 'physical_education' || subj.label?.includes('رياضية') || subj.label?.includes('بدنية');
          if (isPESubj) {
            const p = parseNumOrZero(item?.physicalSkillDomain);
            const c = parseNumOrZero(item?.cognitiveDomain);
            const a = parseNumOrZero(item?.affectiveBehavioralDomain);
            const s = parseNumOrZero(item?.sportsUniformAttendance ?? item?.behavior);
            const anyAbsent = [item?.physicalSkillDomain, item?.cognitiveDomain, item?.affectiveBehavioralDomain, item?.sportsUniformAttendance, item?.behavior]
              .some(v => String(v || '').trim() === 'غ');
            const hasAny = p.hasVal || c.hasVal || a.hasVal || s.hasVal;
            if (anyAbsent && !hasAny) {
              totalStr = 'غ';
            } else if (hasAny) {
              const sum = p.num + c.num + a.num + s.num;
              const r = Math.round(sum * 10) / 10;
              totalStr = Number.isInteger(r) ? String(r) : r.toFixed(1);
            }
          } else {
            const p = parseNumOrZero(item?.practicalPerformance);
            const c = parseNumOrZero(item?.classActivities);
            const b = parseNumOrZero(item?.behavior);
            const anyAbsent = [item?.practicalPerformance, item?.classActivities, item?.behavior]
              .some(v => String(v || '').trim() === 'غ');
            const hasAny = p.hasVal || c.hasVal || b.hasVal;
            if (anyAbsent && !hasAny) {
              totalStr = 'غ';
            } else if (hasAny) {
              const sum = p.num + c.num + b.num;
              const r = Math.round(sum * 10) / 10;
              totalStr = Number.isInteger(r) ? String(r) : r.toFixed(1);
            }
          }
        }

        // إذا لم تكن موجودة في detailedAssessments، مزامنتها من student.assessments
        if (!totalStr) {
          const semArabic1 = semester === 'first' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثانى';
          const semArabic2 = semester === 'first' ? 'الفصل الدراسي الاول' : 'الفصل الدراسي الثاني';
          const genVal = student.assessments?.[semester]?.[subj.key] ??
            student.assessments?.[semArabic1]?.[subj.key] ??
            student.assessments?.[semArabic2]?.[subj.key];
          if (genVal !== undefined && genVal !== null && String(genVal).trim() !== '') {
            totalStr = String(genVal).trim();
          }
        }
      } else {
        const parts = isMiddleOrSecondaryStage
          ? [homework, weekly, behavior, examVal]
          : [notebook, homework, weekly, behavior, examVal];
        const hasAny = parts.some((p) => p && String(p).trim() !== '');
        if (hasAny) {
          let sum = 0;
          let isAnyAbsent = parts.some((p) => String(p).trim() === 'غ');
          let allValid = true;
          for (const p of parts) {
            const str = String(p || '').trim();
            if (!str) continue;
            if (str === 'غ') continue;
            const num = parseFloat(str.replace(',', '.'));
            if (!isNaN(num)) {
              sum += num;
            } else {
              allValid = false;
            }
          }
          if (isAnyAbsent && sum === 0) {
            totalStr = 'غ';
          } else if (allValid) {
            const rounded = Math.round(sum * 10) / 10;
            totalStr = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
          }
        }
      }

      // تظليل صفوف الجدول وفقا للون المكود قى التطبيق
      const isOdd = rIdx % 2 !== 0;
      const cellBg = isOdd ? oddBg : evenBg;
      const isThemeDark = activeRowTheme === 'theme_black' || activeRowTheme === 'theme_red';
      const cellTextColor = isThemeDark && isOdd ? '#ffffff' : '#0f172a';

      // قص اسم المادة عند 32 حرف لتفادي قطع الأسماء الطويلة مثل تكنولوجيا المعلومات والاتصالات
      const rawLabel = String(subj.label || '');
      const subjectName = rawLabel.length > 32 ? rawLabel.slice(0, 32) : rawLabel;

      const noTests = isSubjectWithoutTests(subj, cfg?.customCols);
      const examCellText = (isNonWritten || noTests) ? '-' : String(examVal);

      // دائرة حمراء حول حقل المجموع للمواد الأقل من 50%
      const certTotalMax = isSecondary2Modern ? 80 : (isNonWritten ? (subj.maxGrade || 100) : (isMiddleOrSecondaryStage ? 70 : 40));
      const parsedCertTotal = parseNumOrZero(totalStr);
      const isCertTotalFail = (
        (parsedCertTotal.hasVal && !parsedCertTotal.isAbsent && certTotalMax > 0 && (parsedCertTotal.num / certTotalMax) * 100 < 50) ||
        parsedCertTotal.isAbsent
      );

      if (isSecondary2Modern) {
        return [
          { text: subjectName, width: 250, fontSize: 19.5, bg: cellBg, textColor: cellTextColor },
          { text: '', width: spacer1Width, isSpacer: true, bg: '#ffffff' },
          { text: isNonWritten ? '-' : String(weekly), width: 140, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
          { text: isNonWritten ? '-' : String(researchProject), width: 140, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
          { text: isNonWritten ? '-' : String(homework), width: 150, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
          { text: isNonWritten ? '-' : String(behavior), width: 130, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
          { text: examCellText, width: 140, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
          { text: '', width: spacer2Width, isSpacer: true, bg: '#ffffff' },
          { text: totalStr, width: 156, fontSize: 22, isBold: true, bg: cellBg, textColor: cellTextColor, hasRedCircle: isCertTotalFail },
        ];
      }

      if (isMiddleOrSecondaryStage) {
        return [
          { text: subjectName, width: 258, fontSize: 19.5, bg: cellBg, textColor: cellTextColor },
          { text: '', width: spacer1Width, isSpacer: true, bg: '#ffffff' },
          { text: isNonWritten ? '-' : String(homework), width: 170, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
          { text: isNonWritten ? '-' : String(weekly), width: 174, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
          { text: isNonWritten ? '-' : String(behavior), width: 170, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
          { text: examCellText, width: 164, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
          { text: '', width: spacer2Width, isSpacer: true, bg: '#ffffff' },
          { text: totalStr, width: 170, fontSize: 22, isBold: true, bg: cellBg, textColor: cellTextColor, hasRedCircle: isCertTotalFail },
        ];
      }

      return [
        { text: subjectName, width: 234, fontSize: 19.5, bg: cellBg, textColor: cellTextColor },
        { text: '', width: spacer1Width, isSpacer: true, bg: '#ffffff' },
        { text: isNonWritten ? '-' : String(notebook), width: 138, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
        { text: isNonWritten ? '-' : String(homework), width: 138, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
        { text: isNonWritten ? '-' : String(weekly), width: 164, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
        { text: isNonWritten ? '-' : String(behavior), width: 160, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
        { text: examCellText, width: 140, fontSize: 20.5, bg: cellBg, textColor: cellTextColor },
        { text: '', width: spacer2Width, isSpacer: true, bg: '#ffffff' },
        { text: totalStr, width: 132, fontSize: 22, isBold: true, bg: cellBg, textColor: cellTextColor, hasRedCircle: isCertTotalFail },
      ];
    };

    // Section 1: المواد المضافة للمجموع
    drawSpanningSection('المواد المضافة للمجموع', sectionHeaderH);

    // Render Added Subjects
    addedSubjects.forEach((subj, idx) => {
      drawRowCells(getSubjectRowCells(subj, idx), dataRowH);
    });

    // صف أبيض فارغ بحدود داخلية وخارجية بيضاء بارتفاع 25% من ارتفاع صف المواد المضافة فوق صف المواد غير المضافة
    drawEmptyWhiteRow(emptyRowH);

    // Section 2: المواد الغير مضافة للمجموع
    drawSpanningSection('المواد الغير مضافة للمجموع', sectionHeaderH);

    // Render Non-Added Subjects
    nonAddedSubjects.forEach((subj, idx) => {
      drawRowCells(getSubjectRowCells(subj, idx), dataRowH);
    });

    // رسم الحقول الفارغة (عمود فارغ بعرض 0.2 سم بعد اسم المواد وقبل المجموع بحدود داخلية بيضاء)
    [
      { x: spacer1X, w: spacer1Width },
      { x: spacer2X, w: spacer2Width },
    ].forEach((sp) => {
      if (sp.x > 0 && sp.w > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sp.x, tableTopY, sp.w, tableTotalH);

        // رسم الحدود الرأسية الفاصلة على اليمين واليسار
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sp.x + sp.w, tableTopY);
        ctx.lineTo(sp.x + sp.w, tableTopY + tableTotalH);
        ctx.moveTo(sp.x, tableTopY);
        ctx.lineTo(sp.x, tableTopY + tableTotalH);
        ctx.stroke();
      }
    });

    ctx.restore();

    // Outer table rounded border stroke (16px radius)
    drawRoundedRect(ctx, marginX, tableTopY, contentW, tableTotalH, 16);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // جعل لون حدود الجدول الخارجية في هذا الحقل باللون الأبيض (في الأعلى والأسفل)
    [
      { x: spacer1X, w: spacer1Width },
      { x: spacer2X, w: spacer2Width },
    ].forEach((sp) => {
      if (sp.x > 0 && sp.w > 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;

        // الحد العلوي الخارجي باللون الأبيض
        ctx.beginPath();
        ctx.moveTo(sp.x + 0.5, tableTopY);
        ctx.lineTo(sp.x + sp.w - 0.5, tableTopY);
        ctx.stroke();

        // الحد السفلي الخارجي باللون الأبيض
        ctx.beginPath();
        ctx.moveTo(sp.x + 0.5, tableTopY + tableTotalH);
        ctx.lineTo(sp.x + sp.w - 0.5, tableTotalH);
        ctx.stroke();
      }
    });

    // رسم الحدود الأربعة باللون الأسود وفق طلب المستخدم بدقة متناهية:
    // 1. الحد السفلى لصف الدرجات العظمى (y للصف الفارغ الأول)
    // 2. الحد العلوى لصف المواد المضافة (y + h للصف الفارغ الأول)
    // 3. الحد السفلى لاخر مادة فى المواد المضافة للمجموع (y للصف الفارغ الثاني)
    // 4. الحد العلوى لصف المواد الغير مضافة (y + h للصف الفارغ الثاني)
    emptyWhiteRowYs.forEach(({ y, h }) => {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;

      // الحد الأفقي العلوي باللون الأسود
      ctx.beginPath();
      ctx.moveTo(marginX, y);
      ctx.lineTo(marginX + contentW, y);
      ctx.stroke();

      // الحد الأفقي السفلي باللون الأسود
      ctx.beginPath();
      ctx.moveTo(marginX, y + h);
      ctx.lineTo(marginX + contentW, y + h);
      ctx.stroke();
    });

    // جعل الحد الأيمن والحد الأيسر للصفين الفارغين باللون الأبيض
    emptyWhiteRowYs.forEach(({ y, h }) => {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;

      // الحد الأيمن باللون الأبيض
      ctx.beginPath();
      ctx.moveTo(marginX + contentW, y + 0.5);
      ctx.lineTo(marginX + contentW, y + h - 0.5);
      ctx.stroke();

      // الحد الأيسر باللون الأبيض
      ctx.beginPath();
      ctx.moveTo(marginX, y + 0.5);
      ctx.lineTo(marginX, y + h - 0.5);
      ctx.stroke();
    });

    // قفل الفراغات المشار إليها في المرفق باللون الأسود عند زوايا التقاطع الأربعة
    emptyWhiteRowYs.forEach(({ y: ey, h: eh }) => {
      [
        { x: spacer1X, w: spacer1Width },
        { x: spacer2X, w: spacer2Width },
      ].forEach((sp) => {
        if (sp.x > 0 && sp.w > 0) {
          // مساحة التقاطع الداخلية بيضاء نقية
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sp.x + 0.5, ey + 0.5, sp.w - 1, eh - 1);

          // إزالة أي خطوط داخلية عبر التقاطع
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sp.x + 0.75, ey);
          ctx.lineTo(sp.x + sp.w - 0.75, ey);
          ctx.moveTo(sp.x + 0.75, ey + eh);
          ctx.lineTo(sp.x + sp.w - 0.75, ey + eh);
          ctx.moveTo(sp.x + sp.w, ey + 0.75);
          ctx.lineTo(sp.x + sp.w, ey + eh - 0.75);
          ctx.moveTo(sp.x, ey + 0.75);
          ctx.lineTo(sp.x, ey + eh - 0.75);
          ctx.stroke();

          // قفل الزوايا الأربعة المشار إليها بالأسهم الحمراء في المرفق باللون الأسود بدقة تامة
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;

          // 1. الزاوية العلوية اليمنى (Corner Top-Right)
          ctx.beginPath();
          ctx.moveTo(sp.x + sp.w, ey - 6);
          ctx.lineTo(sp.x + sp.w, ey);
          ctx.lineTo(sp.x + sp.w + 6, ey);
          ctx.stroke();

          // 2. الزاوية العلوية اليسرى (Corner Top-Left)
          ctx.beginPath();
          ctx.moveTo(sp.x, ey - 6);
          ctx.lineTo(sp.x, ey);
          ctx.lineTo(sp.x - 6, ey);
          ctx.stroke();

          // 3. الزاوية السفلية اليمنى (Corner Bottom-Right)
          ctx.beginPath();
          ctx.moveTo(sp.x + sp.w, ey + eh + 6);
          ctx.lineTo(sp.x + sp.w, ey + eh);
          ctx.lineTo(sp.x + sp.w + 6, ey + eh);
          ctx.stroke();

          // 4. الزاوية السفلية اليسرى (Corner Bottom-Left)
          ctx.beginPath();
          ctx.moveTo(sp.x, ey + eh + 6);
          ctx.lineTo(sp.x, ey + eh);
          ctx.lineTo(sp.x - 6, ey + eh);
          ctx.stroke();
        }
      });
    });

    // إعادة رسم الحدود العلوية والسفلية باللون الأبيض للخلايا ذات اللون الأحمر القاتم لضمان بقائها ناصعة
    if (failedCellsWhiteBorders.length > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      failedCellsWhiteBorders.forEach(({ cX, curY: fcY, width, rowHeight: fcH }) => {
        ctx.beginPath();
        ctx.moveTo(cX, fcY);
        ctx.lineTo(cX + width, fcY);
        ctx.moveTo(cX, fcY + fcH);
        ctx.lineTo(cX + width, fcY + fcH);
        ctx.stroke();
      });
    }

    // الخط الفاصل (<hr>) فوق نص النسبة المئوية للحضور
    const attendanceDividerY = tableTopY + tableTotalH + 20;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marginX, attendanceDividerY);
    ctx.lineTo(marginX + contentW, attendanceDividerY);
    ctx.stroke();

    // 6. Below Table: حساب النسبة المئوية لحضور الطالب / الطالبة وفقاً للمعادلة:
    // النسبة المئوية = (مجموع درجات السلوك والمواظبة فى جميع المواد / (5 * عدد المواد الدراسية)) * 100
    const allTableSubjects = [...addedSubjects, ...nonAddedSubjects];
    let behaviorSum = 0;
    let behaviorEnteredCount = 0;
    let maxPossibleBehavior = 0;

    for (const subj of allTableSubjects) {
      const isPESubj = stage !== 'kindergarten' && (subj.key === 'pe' || subj.key === 'physical_education' || subj.label?.includes('رياضية') || subj.label?.includes('بدنية'));
      const subjBehMax = isPESubj ? 10 : (isMiddleOrSecondaryStage ? 10 : 5);
      const item = student.detailedAssessments?.[semester]?.[subj.key];
      const bVal = isPESubj ? (item?.sportsUniformAttendance ?? item?.behavior) : item?.behavior;
      if (bVal !== undefined && bVal !== null && String(bVal).trim() !== '') {
        const str = String(bVal).trim();
        if (str !== 'غ') {
          const num = parseFloat(str.replace(',', '.'));
          if (!isNaN(num)) {
            behaviorSum += num;
            behaviorEnteredCount++;
          }
        } else {
          behaviorEnteredCount++;
        }
        maxPossibleBehavior += subjBehMax;
      }
    }

    let percentageDisplay = '........';
    if (behaviorEnteredCount > 0 && maxPossibleBehavior > 0) {
      const rawPercentage = (behaviorSum / maxPossibleBehavior) * 100;
      const clamped = Math.min(100, Math.max(0, rawPercentage));
      const rounded = Math.round(clamped * 10) / 10;
      percentageDisplay = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }

    const attendanceY = attendanceDividerY + 35;
    ctx.textBaseline = 'middle';

    const attendanceText = isFemale
      ? `النسبة المئوية لحضور الطالبة = ${percentageDisplay} %`
      : `النسبة المئوية لحضور الطالب = ${percentageDisplay} %`;

    const certTotalFormatted = `${certTotalMax}  :  ${certTotalDisplay}`;
    const certLabelText = 'المجموع الكلى :';

    let detBaseFontSize = 20;
    let detScoreFontSize = 28; // خط أكبر بلون أحمر لدرجات المجموع الكلي

    ctx.font = `bold ${detBaseFontSize}px "Cairo", sans-serif`;
    const wCertLabel = ctx.measureText(certLabelText).width;
    ctx.font = `900 ${detScoreFontSize}px "Cairo", sans-serif`;
    const wCertScore = ctx.measureText(certTotalFormatted).width;
    const certSummaryTotalW = wCertLabel + wCertScore + 14;

    // 1. Right: النسبة المئوية لحضور الطالب فى أقصى اليمين
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${detBaseFontSize}px "Cairo", sans-serif`;
    ctx.fillText(attendanceText, marginX + contentW, attendanceY);

    // 2. Left: المجموع الكلي وفق الصيغة المطلوبة بخط أكبر وبلون أحمر
    const certRightBoundary = marginX + certSummaryTotalW;
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.font = `bold ${detBaseFontSize}px "Cairo", sans-serif`;
    ctx.fillStyle = '#0f172a';
    ctx.fillText(certLabelText, certRightBoundary, attendanceY);

    const certScoreRight = certRightBoundary - wCertLabel - 8;
    const certScoreCenterX = certScoreRight - wCertScore / 2;
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.font = `900 ${detScoreFontSize}px "Cairo", sans-serif`;
    ctx.fillStyle = '#dc2626'; // لون أحمر
    ctx.fillText(certTotalFormatted, certScoreCenterX, attendanceY);

    // الخط الفاصل (<hr>) فوق شئون الطلاب ومدير المدرسة
    const sigDividerY = attendanceY + 28;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marginX, sigDividerY);
    ctx.lineTo(marginX + contentW, sigDividerY);
    ctx.stroke();

    // الخط الفاصل أعلى سطر مسئول البيانات في التذييل: زيادة ارتفاع التذييل بنسبة 25% (من 110 إلى 138)
    const footerLineY = heightPx - 138;

    // 7. سطر التوقيعات (على سطر واحد: النص ثم أيقونة القلم ثم التنقيط)
    const signaturesRowY = Math.round((sigDividerY + footerLineY) / 2);

    const circleRadius = 58;
    const circleMiddleX = marginX + contentW / 2;
    const circleMiddleY = signaturesRowY;

    const drawSignatureItem = (
      label: string,
      centerX: number,
      centerY: number,
      dotsText: string = '..............................'
    ) => {
      ctx.save();
      ctx.font = 'bold 20px "Cairo", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textBaseline = 'middle';

      const labelW = ctx.measureText(label).width;
      const dotsW = ctx.measureText(dotsText).width;
      const penSize = 34;
      const gap = 8;
      const totalW = labelW + gap + penSize + gap + dotsW;

      // Arabic / RTL: سطر واحد: شئون الطلاب ثم ايقونة القلم ثم التنقيط
      const rightX = centerX + totalW / 2;

      // 1. النص (يمين)
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillText(label, rightX, centerY);

      // 2. أيقونة القلم (في المنتصف)
      const penX = rightX - labelW - gap - penSize;
      const penY = centerY - penSize / 2;
      if (penIcon) {
        ctx.drawImage(penIcon, penX, penY, penSize, penSize);
      }

      // 3. التنقيط (يسار القلم)
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      const dotsRightX = penX - gap;
      ctx.fillText(dotsText, dotsRightX, centerY);

      ctx.restore();
    };

    if (!isKgStage) {
      // فى جميع المراحل ما عدا رياض الأطفال: شئون الطلاب / مدير المدرسة / توقيع ولى الأمر
      const rightSigX = marginX + contentW - 220;
      const centerSigX = marginX + contentW / 2;
      const leftSigX = marginX + 220;

      const parentSigLabel = 'توقيع ولى الأمر';

      // Right: شئون الطلاب
      drawSignatureItem('شئون الطلاب', rightSigX, signaturesRowY);

      // Center: مدير المدرسة
      drawSignatureItem('مدير المدرسة', centerSigX, signaturesRowY);

      // Left: توقيع ولى الأمر
      drawSignatureItem(parentSigLabel, leftSigX, signaturesRowY);
    } else {
      // رياض الأطفال: شئون الطلاب / مدير الروضة
      const rightSigX = marginX + contentW - 250;
      const leftSigX = marginX + 250;

      // Right: شئون الطلاب
      drawSignatureItem('شئون الطلاب', rightSigX, signaturesRowY, '..........................................');

      // Left: مدير الروضة
      drawSignatureItem('مدير الروضة', leftSigX, signaturesRowY, '..........................................');
    }

    // تم حذف الدائرة الحمراء المخصصة للمجموع بناءً على الطلب (تُعرض فقط إذا تم تفعيلها صراحة)
    if (options.showTotalScoreCircle && !isKgStage) {
      drawHandwrittenTotalScoreCircle(
        ctx,
        circleMiddleX,
        circleMiddleY,
        circleRadius,
        certTotalDisplay,
        certTotalMax
      );
    }

    // 8. Standard Footer (الهيدر المعتاد والتذييل المعتاد)
    const hasFooterQr = Boolean(qrImage);
    const footerQrSize = 100;
    const footerQrX = marginX + contentW - footerQrSize;
    const footerQrY = footerLineY + 18;
    const footerAvailW = hasFooterQr ? contentW - footerQrSize - 16 : contentW;
    const footerCenterX = marginX + footerAvailW / 2;

    const pageNumberText = `صفحة ${studentIdx + 1} من ${studentList.length}`;

    // الخط الفاصل أعلى سطر مسئول البيانات في التذييل
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(marginX, footerLineY);
    ctx.lineTo(marginX + contentW, footerLineY);
    ctx.stroke();

    // Draw QR Code without any border
    if (hasFooterQr && qrImage) {
      ctx.save();
      ctx.drawImage(qrImage, footerQrX, footerQrY, footerQrSize, footerQrSize);
      ctx.restore();
    }

    // تقسيم التذييل بالتساوي: ارتفاع سطر المنظومة = ارتفاع سطر التوقيعات مسئول البيانات (69 بكسل لكل منهما)
    const footerTotalH = 138;
    const footerRowH = footerTotalH / 2;

    const footerTextY = footerLineY + footerRowH / 2;
    ctx.direction = 'rtl';
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';

    // 1. رقم الصفحة والتاريخ فى أقصى يسار الصفحة
    const pageInfoText = `${pageNumberText} - ${dateDisplay}`;
    let pageInfoFontSize = 14;
    ctx.font = `bold ${pageInfoFontSize}px "Cairo", sans-serif`;
    const pageInfoW = ctx.measureText(pageInfoText).width;
    const pageInfoLeftX = marginX + 16;
    ctx.textAlign = 'left';
    ctx.fillText(pageInfoText, pageInfoLeftX, footerTextY);

    // 2. سطر التوقيعات (مسئول البيانات والمعلومات - رئيس الكنترول - رئيس اللجنة) في يمين الصفحة في ملفات PDF الرأسية
    const footerSignaturesText = `مسئول البيانات والمعلومات : ${dataOfficer}   رئيس الكنترول : ${controlHead}   رئيس اللجنة : ${committeeHead}`;
    let footerFontSize = 17.5;
    ctx.font = `bold ${footerFontSize}px "Cairo", sans-serif`;

    const rightTargetX = marginX + footerAvailW - 16;
    const maxSigW = Math.max(300, rightTargetX - (pageInfoLeftX + pageInfoW + 24));

    while (footerFontSize > 10 && ctx.measureText(footerSignaturesText).width > maxSigW) {
      footerFontSize -= 0.5;
      ctx.font = `bold ${footerFontSize}px "Cairo", sans-serif`;
    }
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillText(footerSignaturesText, rightTargetX, footerTextY);

    // Sub-footer line and tagline (الخط الفاصل في منتصف التذييل تماماً)
    const subFooterHrY = footerLineY + footerRowH;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginX, subFooterHrY);
    ctx.lineTo(marginX + footerAvailW, subFooterHrY);
    ctx.stroke();

    // سطر المنظومة الرقمية بارتفاع متساوٍ تماماً مع سطر التوقيعات
    const subFooterTextY = subFooterHrY + footerRowH / 2;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#334155';
    let subFooterFontSize = 14;
    const orgTaglineText = getActiveFooterTagline(selectedGrade, stage);
    while (subFooterFontSize > 10 && ctx.measureText(orgTaglineText).width > footerAvailW - 16) {
      subFooterFontSize -= 0.5;
      ctx.font = `bold ${subFooterFontSize}px "Cairo", sans-serif`;
    }
    ctx.fillText(
      orgTaglineText,
      footerCenterX,
      subFooterTextY,
      footerAvailW - 16
    );

    // Snapshot canvas to JPEG (0.95 high quality)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const base64 = dataUrl.split(',')[1];
    const jpegBytes = base64ToUint8Array(base64);
    renderedPages.push({ jpegBytes, widthPx: canvas.width, heightPx: canvas.height });
  }

  // Build standard PDF binary in Portrait A4 (595.28 x 841.89 pt)
  const pdfBytes = buildPdfFromJpegPages(renderedPages, 595.28, 841.89);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const safeGrade = (selectedGrade || '').replace(/[\\/:*?"<>|]/g, '_').trim();
  const safeSemester = semText.replace(/[\\/:*?"<>|]/g, '_').trim();
  const safeExam = examName.replace(/[\\/:*?"<>|]/g, '_').trim();
  link.download = `شهادات_تقييمات_${safeGrade}_${safeSemester}_بعد_${safeExam}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export interface ExportStudentSemesterGradesCertificatePdfOptions {
  students: StudentData[];
  semester: string;
  selectedGrade: string;
  stage?: string;
  schoolName?: string;
  schoolNameEn?: string;
  administration?: string;
  administrationEn?: string;
  governorate?: string;
  schoolLogo?: string;
  dataOfficer?: string;
  dataOfficerEn?: string;
  controlHead?: string;
  controlHeadEn?: string;
  committeeHead?: string;
  committeeHeadEn?: string;
  rowTheme?: string;
  customCols?: any[];
  defaultSubjectsOverrides?: Record<string, any>;
  showTotalScoreCircle?: boolean;
  isEnglishCertificate?: boolean;
  isHomeschool?: boolean;
  isMiddleHomeschool?: boolean;
  systemType?: 'regular' | 'homeschool' | string;
  title?: string;
}

/**
 * Generates and downloads an official, beautifully formatted Landscape A4 PDF file
 * containing one student certificate per page:
 * "شهادة درجات وتقديرات الفصل الدراسي الأول 2026 - 2027" أو "شهادة درجات وتقديرات الفصل الدراسي الثانى 2026 - 2027"
 * - A4 Landscape (841.89 x 595.28 pt) -> 1754 x 1240 px
 * - Horizontal orientation (أفقى)
 * - Includes all assessment fields and formats of detailed assessment certificate
 * - In addition to:
 *   * حقل الاختبار الثانى (second monthly exam)
 *   * حقل الامتحان التحريرى (written exam)
 *   * حقل التقدير (evaluation grade label)
 */
export async function exportStudentSemesterGradesCertificatePdf(
  options: ExportStudentSemesterGradesCertificatePdfOptions
): Promise<void> {
  const {
    students,
    semester,
    selectedGrade,
    stage = 'primary',
    schoolName = '',
    schoolNameEn = '',
    administration = '',
    administrationEn = '',
    dataOfficer: propDataOfficer,
    dataOfficerEn: propDataOfficerEn,
    controlHead: propControlHead,
    controlHeadEn: propControlHeadEn,
    committeeHead: propCommitteeHead,
    committeeHeadEn: propCommitteeHeadEn,
    rowTheme: propRowTheme,
    customCols: propCustomCols,
    defaultSubjectsOverrides: propOverrides,
    isHomeschool: propIsHomeschool,
    isMiddleHomeschool: propIsMiddleHomeschool,
    systemType: propSystemType,
    title: propTitle,
  } = options;

  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }
  } catch {}

  let sLogo = options.schoolLogo || localStorage.getItem('sheet_control_school_logo') || localStorage.getItem('school_logo') || '';
  try {
    const savedSchool = localStorage.getItem('sheet_control_school_data');
    if (savedSchool) {
      const parsedSchool = JSON.parse(savedSchool);
      if (!sLogo && parsedSchool.schoolLogo) sLogo = parsedSchool.schoolLogo;
    }
  } catch {}

  const [qrImage, penIcon, ministryLogoImage, schoolLogoImage] = await Promise.all([
    loadImage(qrCodeUrl),
    loadImage(signaturePenUrl),
    loadImage(ministryLogoUrl),
    sLogo ? loadImage(sLogo) : Promise.resolve(null),
  ]);

  const isSecondSem = semester === 'second' || semester === 'الفصل الدراسي الثاني' || semester === 'الفصل الدراسي الثانى';
  const semText = isSecondSem ? 'الفصل الدراسي الثانى' : 'الفصل الدراسي الأول';
  const semKey = isSecondSem ? 'second' : 'first';

  let sAdmin = administration || '';
  let sName = schoolName || '';
  let sAdminEn = administrationEn || '';
  let sNameEn = schoolNameEn || '';

  try {
    const savedSchool = localStorage.getItem('sheet_control_school_data');
    if (savedSchool) {
      const parsedSchool = JSON.parse(savedSchool);
      if (!sAdmin && parsedSchool.administration) sAdmin = parsedSchool.administration;
      if (!sName && parsedSchool.schoolName) sName = parsedSchool.schoolName;
      if (!sAdminEn && parsedSchool.administrationEn) sAdminEn = parsedSchool.administrationEn;
      if (!sNameEn && parsedSchool.schoolNameEn) sNameEn = parsedSchool.schoolNameEn;
    }
  } catch {}

  try {
    const rawSchoolData = localStorage.getItem('schoolData') || localStorage.getItem('school_data');
    if (rawSchoolData) {
      const parsed = JSON.parse(rawSchoolData);
      if (!sAdmin && parsed.administration) sAdmin = parsed.administration;
      if (!sName && parsed.schoolName) sName = parsed.schoolName;
      if (!sAdminEn && parsed.administrationEn) sAdminEn = parsed.administrationEn;
      if (!sNameEn && parsed.schoolNameEn) sNameEn = parsed.schoolNameEn;
    }
  } catch {}

  if (!sAdmin) {
    sAdmin = localStorage.getItem('school_administration') || localStorage.getItem('administration') || '';
  }
  if (!sName) {
    sName = localStorage.getItem('school_name') || localStorage.getItem('schoolName') || '';
  }
  if (!sAdminEn) {
    sAdminEn = localStorage.getItem('school_administration_en') || localStorage.getItem('administrationEn') || '';
  }
  if (!sNameEn) {
    sNameEn = localStorage.getItem('school_name_en') || localStorage.getItem('schoolNameEn') || '';
  }

  let dataOfficer = propDataOfficer || '';
  let controlHead = propControlHead || '';
  let committeeHead = propCommitteeHead || '';
  let dataOfficerEn = propDataOfficerEn || '';
  let controlHeadEn = propControlHeadEn || '';
  let committeeHeadEn = propCommitteeHeadEn || '';

  try {
    const stageKey = stage || '';
    const savedControlByStage = localStorage.getItem('sheet_control_control_data_by_stage');
    if (savedControlByStage) {
      const parsed = JSON.parse(savedControlByStage);
      const stageControl = stageKey ? parsed[stageKey] : undefined;
      const allEntries = Object.values(parsed) as Record<string, any>[];
      const fallbackEntry = parsed[''] || allEntries[0];

      if (!dataOfficer) dataOfficer = stageControl?.dataOfficer || fallbackEntry?.dataOfficer || '';
      if (!controlHead) controlHead = stageControl?.controlHead || fallbackEntry?.controlHead || '';
      if (!committeeHead) committeeHead = stageControl?.committeeHead || fallbackEntry?.committeeHead || '';

      if (!dataOfficerEn) {
        dataOfficerEn = stageControl?.dataOfficerEn || fallbackEntry?.dataOfficerEn || '';
        if (!dataOfficerEn) {
          const found = allEntries.find((e) => e && e.dataOfficerEn && e.dataOfficerEn.trim());
          if (found) dataOfficerEn = found.dataOfficerEn.trim();
        }
      }
      if (!controlHeadEn) {
        controlHeadEn = stageControl?.controlHeadEn || fallbackEntry?.controlHeadEn || '';
        if (!controlHeadEn) {
          const found = allEntries.find((e) => e && e.controlHeadEn && e.controlHeadEn.trim());
          if (found) controlHeadEn = found.controlHeadEn.trim();
        }
      }
      if (!committeeHeadEn) {
        committeeHeadEn = stageControl?.committeeHeadEn || fallbackEntry?.committeeHeadEn || '';
        if (!committeeHeadEn) {
          const found = allEntries.find((e) => e && e.committeeHeadEn && e.committeeHeadEn.trim());
          if (found) committeeHeadEn = found.committeeHeadEn.trim();
        }
      }
    }
  } catch {}

  try {
    const rawControlData = localStorage.getItem('controlData') || localStorage.getItem('control_data');
    if (rawControlData) {
      const parsed = JSON.parse(rawControlData);
      if (!dataOfficer && parsed.dataOfficer) dataOfficer = parsed.dataOfficer;
      if (!controlHead && parsed.controlHead) controlHead = parsed.controlHead;
      if (!committeeHead && parsed.committeeHead) committeeHead = parsed.committeeHead;
      if (!dataOfficerEn && parsed.dataOfficerEn) dataOfficerEn = parsed.dataOfficerEn;
      if (!controlHeadEn && parsed.controlHeadEn) controlHeadEn = parsed.controlHeadEn;
      if (!committeeHeadEn && parsed.committeeHeadEn) committeeHeadEn = parsed.committeeHeadEn;
    }
  } catch {}

  try {
    const savedSchool = localStorage.getItem('sheet_control_school_data');
    if (savedSchool) {
      const parsed = JSON.parse(savedSchool);
      if (!dataOfficerEn && parsed.dataOfficerEn) dataOfficerEn = parsed.dataOfficerEn;
      if (!controlHeadEn && parsed.controlHeadEn) controlHeadEn = parsed.controlHeadEn;
      if (!committeeHeadEn && parsed.committeeHeadEn) committeeHeadEn = parsed.committeeHeadEn;
    }
  } catch {}

  if (!dataOfficer) dataOfficer = localStorage.getItem('school_data_officer') || '................';
  if (!controlHead) controlHead = localStorage.getItem('school_control_head') || '................';
  if (!committeeHead) committeeHead = localStorage.getItem('school_committee_head') || '................';

  if (!dataOfficerEn) dataOfficerEn = localStorage.getItem('school_data_officer_en') || localStorage.getItem('dataOfficerEn') || '';
  if (!controlHeadEn) controlHeadEn = localStorage.getItem('school_control_head_en') || localStorage.getItem('controlHeadEn') || '';
  if (!committeeHeadEn) committeeHeadEn = localStorage.getItem('school_committee_head_en') || localStorage.getItem('committeeHeadEn') || '';

  // Read saved print row theme from localStorage
  const savedPrintTheme = typeof window !== 'undefined'
    ? (localStorage.getItem('pdf_print_row_theme') as RowBgTheme | null)
    : null;
  const activeRowTheme = (propRowTheme as RowBgTheme) || (savedPrintTheme && savedPrintTheme !== ('auto' as any) ? savedPrintTheme : 'attachment_3');
  const { evenBg, oddBg } = getReportRowBgColors('calling_list', false, activeRowTheme);

  const isHomeschoolResolved = Boolean(
    propIsHomeschool ||
    propIsMiddleHomeschool ||
    propSystemType === 'homeschool' ||
    (propTitle && (propTitle.includes('منازل') || propTitle.toLowerCase().includes('homeschool'))) ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('current_system_type') === 'homeschool' ||
      localStorage.getItem('systemType') === 'homeschool'
    ))
  );

  const isServicesResolved = !isHomeschoolResolved && Boolean(
    propSystemType === 'services' ||
    (propTitle && (propTitle.includes('خدمات') || propTitle.toLowerCase().includes('services'))) ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('current_system_type') === 'services' ||
      localStorage.getItem('systemType') === 'services'
    ))
  );

  const isExplicitlyRegular = !isHomeschoolResolved && !isServicesResolved && Boolean(
    propSystemType === 'regular' ||
    (propTitle && (propTitle.includes('منتظمين') || propTitle.toLowerCase().includes('regular'))) ||
    (typeof window !== 'undefined' && localStorage.getItem('current_system_type') === 'regular')
  );
  const isMiddleHomeschool = Boolean(
    propIsMiddleHomeschool ||
    (((stage === 'prep' || stage === 'middle') || Boolean(selectedGrade && (selectedGrade.includes('إعداد') || selectedGrade.includes('اعداد')))) && isHomeschoolResolved)
  );

  // Stage display name
  const stageDisplay =
    stage === 'primary' ? 'المرحلة الابتدائية' :
    stage === 'prep' || stage === 'middle' ? (isMiddleHomeschool ? 'المرحلة الإعدادية ( منازل )' : 'المرحلة الإعدادية ( منتظمين )') :
    stage === 'secondary' ? (
      isHomeschoolResolved ? 'المرحلة الثانوية العامة ( منازل )' :
      isServicesResolved ? 'المرحلة الثانوية العامة ( خدمات )' :
      'المرحلة الثانوية العامة ( منتظمين )'
    ) : 'المرحلة الابتدائية';

  // Get subjects config for this stage/grade
  const cfg = getSubjectsConfigForStageGrade(stage, selectedGrade, isHomeschoolResolved);
  let baseSubjects: any[] = propCustomCols || cfg.customCols || [];
  const savedColsStr = typeof window !== 'undefined'
    ? (isMiddleHomeschool
        ? (localStorage.getItem(`${stage}_${selectedGrade}_homeschool_assessments_custom_cols`) || localStorage.getItem(`${stage}_${selectedGrade}_assessments_custom_cols`))
        : localStorage.getItem(`${stage}_${selectedGrade}_assessments_custom_cols`))
    : null;
  if (savedColsStr && !propCustomCols) {
    try {
      const parsed = JSON.parse(savedColsStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        baseSubjects = parsed.map((c: any) => ({
          key: c.key,
          label: c.label || c.name || c.key,
          isAddedToTotal: c.isAddedToTotal !== false,
          maxGrade: c.maxGrade || 100,
          maxAssessmentsGrade: isMiddleHomeschool ? 0 : (c.maxAssessmentsGrade !== undefined ? c.maxAssessmentsGrade : (stage === 'primary' ? 40 : 70)),
          maxWrittenGrade: isMiddleHomeschool ? 100 : (c.maxWrittenGrade !== undefined ? c.maxWrittenGrade : (stage === 'primary' ? 60 : 30)),
          hasWrittenExam: c.hasWrittenExam !== false,
          learningOutcomesType: c.learningOutcomesType,
        }));
      }
    } catch {}
  }

  // فى المرحلة الإعدادية والمرحلة الثانوية - منازل فقط: استبعاد المواد التى ليس لها امتحان تحريرى
  if (isMiddleHomeschool || (stage === 'secondary' && isHomeschoolResolved)) {
    baseSubjects = baseSubjects.filter((s) => {
      const ovr = propOverrides?.[s.key] || cfg?.defaultSubjectsOverrides?.[s.key];
      const hasExam = ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : (s.hasWrittenExam !== undefined ? s.hasWrittenExam : true);
      return hasExam !== false;
    });
  }

  let addedSubjects = baseSubjects.filter((s) => s.isAddedToTotal !== false);
  let nonAddedSubjects = baseSubjects.filter((s) => s.isAddedToTotal === false);

  if (addedSubjects.length === 0 && nonAddedSubjects.length === 0) {
    addedSubjects = [
      { key: 'arabic', label: 'اللغة العربية' },
      { key: 'math', label: 'الرياضيات' },
      { key: 'science', label: 'العلوم' },
      { key: 'english', label: 'اللغة الإنجليزية' },
      { key: 'social_studies', label: 'الدراسات الاجتماعية' },
    ];
    nonAddedSubjects = [
      { key: 'religion', label: 'التربية الدينية' },
      { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات' },
      { key: 'art', label: 'التربية الفنية' },
      { key: 'pe', label: 'التربية الرياضية' },
    ];
  }

  // في جزء المواد الغير مضافة للمجموع: جعل صفوف المواد التى لها امتحان تحريرى قبل صفوف المواد التى ليس لها امتحان تحريرى
  const nonAddedWithWritten = nonAddedSubjects.filter(s => !isSubjectWithoutWrittenExam(s, cfg?.customCols, stage));
  const nonAddedWithoutWritten = nonAddedSubjects.filter(s => isSubjectWithoutWrittenExam(s, cfg?.customCols, stage));
  nonAddedSubjects = [...nonAddedWithWritten, ...nonAddedWithoutWritten];

  // Exact page dimensions for Landscape A4: 1754 x 1240 px
  const widthPx = 1754;
  const heightPx = 1240;
  const marginX = 48;
  const contentW = widthPx - marginX * 2; // 1658 px

  // Date calculation for footer
  const now = new Date();
  let day = now.getDate();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(now);
    const d = parts.find((p) => p.type === 'day')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const y = parts.find((p) => p.type === 'year')?.value;
    if (d && m && y) {
      day = parseInt(d, 10);
      month = parseInt(m, 10);
      year = parseInt(y, 10);
    }
  } catch {}
  const isEn = Boolean(options.isEnglishCertificate);
  const dateDisplay = isEn ? `${day} / ${month} / ${year}` : `${day} - ${month} - ${year} م`;

  const isMiddleStage = stage === 'middle' || stage === 'prep';
  const isSecondaryStage = stage === 'secondary';
  const isMiddleOrSecondaryStage = isMiddleStage || isSecondaryStage;
  const isPrimaryStage = stage === 'primary' || (!isMiddleStage && !isSecondaryStage && stage !== 'kindergarten');
  const isSec2 = isSecondaryStage && Boolean(
    selectedGrade?.includes('الثاني') ||
    selectedGrade?.includes('الثانى') ||
    selectedGrade?.toLowerCase().includes('2nd') ||
    selectedGrade?.includes('2')
  );
  const isSecondary2Modern = checkIsSecondary2Modern(stage, selectedGrade);

  // النهاية الكبرى الفعلية لمواد المرحلة الثانوية - الصف الثاني فقط (القرار الوزاري):
  // عربي 80، إنجليزي 60، رياضيات 60، تاريخ 60، جغرافيا 60، علم نفس 60، كيمياء 60، فيزياء 60،
  // دين 40، لغة ثانية 40، تربية رياضية 25، تربية وطنية 25، نشاط تربوي ومهني 20
  const getSecondary2ActualMax = (subjItem: any): number => {
    if (isSecondary2Modern) return subjItem?.actualMaxGrade || subjItem?.maxGrade || 100;
    if (subjItem?.actualMaxGrade !== undefined && Number(subjItem.actualMaxGrade) > 0) {
      return Number(subjItem.actualMaxGrade);
    }
    const ovr = propOverrides?.[subjItem?.key];
    if (ovr?.actualMaxGrade !== undefined && Number(ovr.actualMaxGrade) > 0) {
      return Number(ovr.actualMaxGrade);
    }
    const k = String(subjItem?.key || '').toLowerCase();
    const lbl = String(subjItem?.label || subjItem?.name || '').trim();
    if (k === 'arabic' || lbl.includes('عرب')) return 80;
    if (k === 'english' || lbl.includes('إنجليز') || lbl.includes('انجليز') || lbl.toLowerCase().includes('english')) return 60;
    if (k === 'math' || lbl.includes('رياضيات') || lbl.includes('رياض') || lbl.includes('بحتة') || lbl.includes('تطبيقي')) return 60;
    if (k === 'history' || lbl.includes('تاريخ')) return 60;
    if (k === 'geography' || lbl.includes('جغرافيا') || lbl.includes('جغراف')) return 60;
    if (k === 'psychology' || lbl.includes('علم النفس') || lbl.includes('نفس')) return 60;
    if (k === 'chemistry' || lbl.includes('كيمياء') || lbl.includes('كيميا')) return 60;
    if (k === 'physics' || lbl.includes('فيزياء') || lbl.includes('فيزيا')) return 60;
    if (k === 'religion' || lbl.includes('دين') || lbl.includes('إسلام') || lbl.includes('مسيح')) return 40;
    if (k === 'second_foreign_language' || lbl.includes('أجنبية ثانية') || lbl.includes('اجنبية ثانية') || lbl.includes('فرنس') || lbl.includes('ألمان') || lbl.includes('المان') || lbl.includes('إيطال') || lbl.includes('ايطال') || lbl.includes('إسبان') || lbl.includes('اسبان')) return 40;
    if (k === 'pe' || k === 'physical_education' || lbl.includes('رياضية') || lbl.includes('بدنية')) return 25;
    if (k === 'national_education' || lbl.includes('وطنية')) return 25;
    if (k === 'educational_vocational_activity' || k === 'activity' || k.includes('activity') || lbl.includes('مهن') || lbl.includes('تربو') || lbl.includes('نشاط')) return 20;
    return subjItem?.actualMaxGrade || subjItem?.maxGrade || 100;
  };

  // النهاية الكبرى الفعلية لمواد المرحلة الإعدادية (القرار الوزاري 137 لسنة 2024):
  // عربي 80، إنجليزي 60، رياضيات 60، علوم 40، دراسات 40، دين 40، تربية فنية 20، تكنولوجيا 20، موسيقى 20، تربية رياضية 20، أنشطة 20
  const getMiddleActualMax = (subjItem: any): number => {
    if (subjItem?.actualMaxGrade !== undefined && Number(subjItem.actualMaxGrade) > 0) {
      return Number(subjItem.actualMaxGrade);
    }
    const ovr = propOverrides?.[subjItem?.key];
    if (ovr?.actualMaxGrade !== undefined && Number(ovr.actualMaxGrade) > 0) {
      return Number(ovr.actualMaxGrade);
    }
    const k = String(subjItem?.key || '').toLowerCase();
    const lbl = String(subjItem?.label || subjItem?.name || '').trim();
    if (k === 'arabic' || lbl.includes('عرب')) return 80;
    if (k === 'english' || lbl.includes('إنجليز') || lbl.includes('انجليز') || lbl.toLowerCase().includes('english')) return 60;
    if (k === 'math' || lbl.includes('رياضيات') || lbl.includes('رياض')) return 60;
    if (k === 'science' || lbl.includes('علوم')) return 40;
    if (k === 'social_studies' || k === 'social' || lbl.includes('دراسات')) return 40;
    if (k === 'religion' || lbl.includes('دين') || lbl.includes('إسلام') || lbl.includes('مسيح')) return 40;
    if (k === 'art' || lbl.includes('فني') || lbl.includes('فنية') || lbl.includes('رسم')) return 20;
    if (k === 'ict' || lbl.includes('تكنولوج') || lbl.includes('حاسب') || lbl.includes('كمبيوتر')) return 20;
    if (k === 'music' || lbl.includes('موسيق')) return 20;
    if (k === 'pe' || k === 'physical_education' || lbl.includes('رياضية') || lbl.includes('بدنية')) return 20;
    if (k.startsWith('activity') || lbl.includes('نشاط')) return 20;
    return subjItem?.maxGrade || 100;
  };

  // Render a page for each student (or 1 blank template if students is empty)
  const studentList = students.length > 0 ? students : [{} as StudentData];
  const renderedPages: { jpegBytes: Uint8Array; widthPx: number; heightPx: number }[] = [];

  // Table Columns Setup:
  // في الفصل الدراسي الثاني لجميع المراحل ما عدا رياض الأطفال، يتم تطبيق جدول المرفق المقسم إلى ف 1 وف 2 والدرجة الفعلية
  const isSecondSemNonKg = isSecondSem; // الدالة لا تستدعى لرياض الأطفال

  // أعمدة الفصل الثاني المقسمة (ف 1 | ف 2)
  interface SubColumnDef {
    key: string;
    label: string; // ف 1 أو ف 2 أو اسم العمود إذا كان غير مقسم
    width: number;
    max: string;
  }
  interface MainGroupColDef {
    key: string;
    title: string;
    isSplit: boolean;
    subCols: SubColumnDef[];
    totalWidth: number;
    maxSingle?: string; // للأعمدة غير المقسمة (الدرجة الفعلية، النسبة المئوية، التقدير)
  }

  // عرض المحتوى الإجمالي contentW = 1658 px
  // Empty fields width: exactly 0.2 cm = 12 px (الحقول الفارغة بعرض = 0.2 سم)
  const spacer1Width = 12;
  const spacer2Width = 12;

  // التوزيع الدقيق ليطابق contentW = 1658 px تماماً:
  // للصف الثاني الثانوي - بكالوريا - النظام الحديث (فقط):
  // التقييم الأسبوعي (20) + المشروع البحثي (15) + الحصة والواجبات (15) + السلوك والمواظبة (10) + الاختبار الأول (20) + الاختبار الثاني (20) = 100
  // في المرحلة الإعدادية والثانوية: حذف كراسة الحصة (116 px) وتوزيعها بتناسق على باقي الأعمدة
  const sem2GroupColumns: MainGroupColDef[] = isSecondary2Modern
    ? [
        {
          key: 'subject',
          title: isEn ? 'Subject' : 'بنود التقييم',
          isSplit: false,
          totalWidth: 280,
          maxSingle: isEn ? 'Max' : 'العظمى',
          subCols: [{ key: 'subject', label: '', width: 280, max: isEn ? 'Max' : 'العظمى' }],
        },
        {
          key: 'spacer1',
          title: '',
          isSplit: false,
          totalWidth: spacer1Width,
          subCols: [{ key: 'spacer1', label: '', width: spacer1Width, max: '' }],
        },
        {
          key: 'weekly',
          title: isEn ? 'W.A.' : 'التقييم الأسبوعى',
          isSplit: true,
          totalWidth: 144,
          subCols: [
            { key: 'weekly_sem1', label: isEn ? 'S.1' : 'ف 1', width: 72, max: '20' },
            { key: 'weekly_sem2', label: isEn ? 'S.2' : 'ف 2', width: 72, max: '20' },
          ],
        },
        {
          key: 'researchProject',
          title: isEn ? 'Research' : 'المشروع البحثي',
          isSplit: true,
          totalWidth: 144,
          subCols: [
            { key: 'research_sem1', label: isEn ? 'S.1' : 'ف 1', width: 72, max: '15' },
            { key: 'research_sem2', label: isEn ? 'S.2' : 'ف 2', width: 72, max: '15' },
          ],
        },
        {
          key: 'homework',
          title: isEn ? 'H.W. & Class' : 'الحصة والواجبات',
          isSplit: true,
          totalWidth: 156,
          subCols: [
            { key: 'homework_sem1', label: isEn ? 'S.1' : 'ف 1', width: 78, max: '15' },
            { key: 'homework_sem2', label: isEn ? 'S.2' : 'ف 2', width: 78, max: '15' },
          ],
        },
        {
          key: 'behavior',
          title: isEn ? 'Beh.' : 'السلوك والمواظبة',
          isSplit: true,
          totalWidth: 136,
          subCols: [
            { key: 'behavior_sem1', label: isEn ? 'S.1' : 'ف 1', width: 68, max: '10' },
            { key: 'behavior_sem2', label: isEn ? 'S.2' : 'ف 2', width: 68, max: '10' },
          ],
        },
        {
          key: 'exam1',
          title: isEn ? 'T.1' : 'الاختبار الاول',
          isSplit: true,
          totalWidth: 144,
          subCols: [
            { key: 'exam1_sem1', label: isEn ? 'S.1' : 'ف 1', width: 72, max: '20' },
            { key: 'exam1_sem2', label: isEn ? 'S.2' : 'ف 2', width: 72, max: '20' },
          ],
        },
        {
          key: 'exam2',
          title: isEn ? 'T.2' : 'الاختبار الثانى',
          isSplit: true,
          totalWidth: 144,
          subCols: [
            { key: 'exam2_sem1', label: isEn ? 'S.1' : 'ف 1', width: 72, max: '20' },
            { key: 'exam2_sem2', label: isEn ? 'S.2' : 'ف 2', width: 72, max: '20' },
          ],
        },
        {
          key: 'spacer2',
          title: '',
          isSplit: false,
          totalWidth: spacer2Width,
          subCols: [{ key: 'spacer2', label: '', width: spacer2Width, max: '' }],
        },
        {
          key: 'total',
          title: isEn ? 'Tot.' : 'المجموع',
          isSplit: true,
          totalWidth: 156,
          subCols: [
            { key: 'total_sem1', label: isEn ? 'S.1' : 'ف 1', width: 78, max: '100' },
            { key: 'total_sem2', label: isEn ? 'S.2' : 'ف 2', width: 78, max: '100' },
          ],
        },
        {
          key: 'actual',
          title: isEn ? 'Student Score' : 'درجة الطالب',
          isSplit: false,
          totalWidth: 124,
          maxSingle: '100',
          subCols: [{ key: 'actual', label: '', width: 124, max: '100' }],
        },
        {
          key: 'percentage',
          title: '%',
          isSplit: false,
          totalWidth: 76,
          subCols: [{ key: 'percentage', label: '', width: 76, max: '' }],
        },
        {
          key: 'eval',
          title: isEn ? 'Eval.' : 'التقدير',
          isSplit: false,
          totalWidth: 130,
          subCols: [{ key: 'eval', label: '', width: 130, max: '' }],
        },
      ]
    : isMiddleOrSecondaryStage
    ? [
        {
          key: 'subject',
          title: isEn ? 'Subject' : 'بنود التقييم',
          isSplit: false,
          totalWidth: 292,
          maxSingle: isEn ? 'Max' : 'العظمى',
          subCols: [{ key: 'subject', label: '', width: 292, max: isEn ? 'Max' : 'العظمى' }],
        },
        {
          key: 'spacer1',
          title: '',
          isSplit: false,
          totalWidth: spacer1Width,
          subCols: [{ key: 'spacer1', label: '', width: spacer1Width, max: '' }],
        },
        {
          key: 'homework',
          title: isEn ? 'H.W.' : 'كراسة الواجب',
          isSplit: true,
          totalWidth: 136,
          subCols: [
            { key: 'homework_sem1', label: isEn ? 'S.1' : 'ف 1', width: 68, max: isSecondaryStage ? '15' : '10' },
            { key: 'homework_sem2', label: isEn ? 'S.2' : 'ف 2', width: 68, max: isSecondaryStage ? '15' : '10' },
          ],
        },
        {
          key: 'weekly',
          title: isEn ? 'W.A.' : 'التقييم الأسبوعى',
          isSplit: true,
          totalWidth: 156,
          subCols: [
            { key: 'weekly_sem1', label: isEn ? 'S.1' : 'ف 1', width: 78, max: isSecondaryStage ? '15' : '20' },
            { key: 'weekly_sem2', label: isEn ? 'S.2' : 'ف 2', width: 78, max: isSecondaryStage ? '15' : '20' },
          ],
        },
        {
          key: 'behavior',
          title: isEn ? 'Beh.' : 'السلوك والمواظبة',
          isSplit: true,
          totalWidth: 164,
          subCols: [
            { key: 'behavior_sem1', label: isEn ? 'S.1' : 'ف 1', width: 82, max: '10' },
            { key: 'behavior_sem2', label: isEn ? 'S.2' : 'ف 2', width: 82, max: '10' },
          ],
        },
        {
          key: 'exam1',
          title: isEn ? 'T.1' : 'الاختبار الاول',
          isSplit: true,
          totalWidth: 140,
          subCols: [
            { key: 'exam1_sem1', label: isEn ? 'S.1' : 'ف 1', width: 70, max: '15' },
            { key: 'exam1_sem2', label: isEn ? 'S.2' : 'ف 2', width: 70, max: '15' },
          ],
        },
        {
          key: 'exam2',
          title: isEn ? 'T.2' : 'الاختبار الثانى',
          isSplit: true,
          totalWidth: 140,
          subCols: [
            { key: 'exam2_sem1', label: isEn ? 'S.1' : 'ف 1', width: 70, max: '15' },
            { key: 'exam2_sem2', label: isEn ? 'S.2' : 'ف 2', width: 70, max: '15' },
          ],
        },
        {
          key: 'written',
          title: isEn ? 'W.E.' : 'الامتحان التحريرى',
          isSplit: true,
          totalWidth: 148,
          subCols: [
            { key: 'written_sem1', label: isEn ? 'S.1' : 'ف 1', width: 74, max: '30' },
            { key: 'written_sem2', label: isEn ? 'S.2' : 'ف 2', width: 74, max: '30' },
          ],
        },
        {
          key: 'spacer2',
          title: '',
          isSplit: false,
          totalWidth: spacer2Width,
          subCols: [{ key: 'spacer2', label: '', width: spacer2Width, max: '' }],
        },
        {
          key: 'total',
          title: isEn ? 'Tot.' : 'المجموع',
          isSplit: true,
          totalWidth: 150,
          subCols: [
            { key: 'total_sem1', label: isEn ? 'S.1' : 'ف 1', width: 75, max: '100' },
            { key: 'total_sem2', label: isEn ? 'S.2' : 'ف 2', width: 75, max: '100' },
          ],
        },
        {
          key: 'actual',
          title: (isMiddleStage || isSec2) ? (isEn ? 'Student Score' : 'درجة الطالب') : (isEn ? 'Act.' : 'الدرجة الفعلية'),
          isSplit: false,
          totalWidth: 120,
          maxSingle: (isMiddleStage || isSec2) ? '' : '100',
          subCols: [{ key: 'actual', label: '', width: 120, max: (isMiddleStage || isSec2) ? '' : '100' }],
        },
        {
          key: 'percentage',
          title: '%',
          isSplit: false,
          totalWidth: 68,
          subCols: [{ key: 'percentage', label: '', width: 68, max: '' }],
        },
        {
          key: 'eval',
          title: isEn ? 'Eval.' : 'التقدير',
          isSplit: false,
          totalWidth: 120,
          subCols: [{ key: 'eval', label: '', width: 120, max: '' }],
        },
      ]
    : [
        {
          key: 'subject',
          title: isEn ? 'Subject' : 'بنود التقييم',
          isSplit: false,
          totalWidth: 272,
          maxSingle: isEn ? 'Max' : 'العظمى',
          subCols: [{ key: 'subject', label: '', width: 272, max: isEn ? 'Max' : 'العظمى' }],
        },
        {
          key: 'spacer1',
          title: '',
          isSplit: false,
          totalWidth: spacer1Width,
          subCols: [{ key: 'spacer1', label: '', width: spacer1Width, max: '' }],
        },
        {
          key: 'notebook',
          title: isEn ? 'C.W.' : 'كراسة الحصة',
          isSplit: true,
          totalWidth: 116,
          subCols: [
            { key: 'notebook_sem1', label: isEn ? 'S.1' : 'ف 1', width: 58, max: '5' },
            { key: 'notebook_sem2', label: isEn ? 'S.2' : 'ف 2', width: 58, max: '5' },
          ],
        },
        {
          key: 'homework',
          title: isEn ? 'H.W.' : 'كراسة الواجب',
          isSplit: true,
          totalWidth: 116,
          subCols: [
            { key: 'homework_sem1', label: isEn ? 'S.1' : 'ف 1', width: 58, max: '5' },
            { key: 'homework_sem2', label: isEn ? 'S.2' : 'ف 2', width: 58, max: '5' },
          ],
        },
        {
          key: 'weekly',
          title: isEn ? 'W.A.' : 'التقييم الأسبوعى',
          isSplit: true,
          totalWidth: 136,
          subCols: [
            { key: 'weekly_sem1', label: isEn ? 'S.1' : 'ف 1', width: 68, max: '10' },
            { key: 'weekly_sem2', label: isEn ? 'S.2' : 'ف 2', width: 68, max: '10' },
          ],
        },
        {
          key: 'behavior',
          title: isEn ? 'Beh.' : 'السلوك والمواظبة',
          isSplit: true,
          totalWidth: 150,
          subCols: [
            { key: 'behavior_sem1', label: isEn ? 'S.1' : 'ف 1', width: 75, max: '5' },
            { key: 'behavior_sem2', label: isEn ? 'S.2' : 'ف 2', width: 75, max: '5' },
          ],
        },
        {
          key: 'exam1',
          title: isEn ? 'T.1' : 'الاختبار الاول',
          isSplit: true,
          totalWidth: 128,
          subCols: [
            { key: 'exam1_sem1', label: isEn ? 'S.1' : 'ف 1', width: 64, max: '15' },
            { key: 'exam1_sem2', label: isEn ? 'S.2' : 'ف 2', width: 64, max: '15' },
          ],
        },
        {
          key: 'exam2',
          title: isEn ? 'T.2' : 'الاختبار الثانى',
          isSplit: true,
          totalWidth: 128,
          subCols: [
            { key: 'exam2_sem1', label: isEn ? 'S.1' : 'ف 1', width: 64, max: '15' },
            { key: 'exam2_sem2', label: isEn ? 'S.2' : 'ف 2', width: 64, max: '15' },
          ],
        },
        {
          key: 'written',
          title: isEn ? 'W.E.' : 'الامتحان التحريرى',
          isSplit: true,
          totalWidth: 136,
          subCols: [
            { key: 'written_sem1', label: isEn ? 'S.1' : 'ف 1', width: 68, max: '60' },
            { key: 'written_sem2', label: isEn ? 'S.2' : 'ف 2', width: 68, max: '60' },
          ],
        },
        {
          key: 'spacer2',
          title: '',
          isSplit: false,
          totalWidth: spacer2Width,
          subCols: [{ key: 'spacer2', label: '', width: spacer2Width, max: '' }],
        },
        {
          key: 'total',
          title: isEn ? 'Tot.' : 'المجموع',
          isSplit: true,
          totalWidth: 144,
          subCols: [
            { key: 'total_sem1', label: isEn ? 'S.1' : 'ف 1', width: 72, max: '100' },
            { key: 'total_sem2', label: isEn ? 'S.2' : 'ف 2', width: 72, max: '100' },
          ],
        },
        {
          key: 'actual',
          title: isEn ? 'Act.' : 'الدرجة الفعلية',
          isSplit: false,
          totalWidth: 120,
          maxSingle: '100',
          subCols: [{ key: 'actual', label: '', width: 120, max: '100' }],
        },
        {
          key: 'percentage',
          title: '%',
          isSplit: false,
          totalWidth: 68,
          subCols: [{ key: 'percentage', label: '', width: 68, max: '' }],
        },
        {
          key: 'eval',
          title: isEn ? 'Eval.' : 'التقدير',
          isSplit: false,
          totalWidth: 120,
          subCols: [{ key: 'eval', label: '', width: 120, max: '' }],
        },
      ];

  // Table Columns in order for Semester 1 summing to exactly contentW = 1658 px:
  const tableColumns = isSecondary2Modern
    ? [
        { key: 'subject', title: isEn ? 'Subject' : 'بنود التقييم', width: 266, max: isEn ? 'Max' : 'العظمى' },
        // عمود فارغ بعد حقل اسم المواد بعرض 0.2 سم (12 px)
        { key: 'spacer1', title: '', width: spacer1Width, max: '' },
        { key: 'weekly', title: isEn ? 'W.A.' : 'التقييم الأسبوعي', width: 150, max: '20' },
        { key: 'researchProject', title: isEn ? 'Research' : 'المشروع البحثي', width: 150, max: '15' },
        { key: 'homework', title: isEn ? 'H.W. & Class' : 'الحصة والواجبات', width: 175, max: '15' },
        { key: 'behavior', title: isEn ? 'Beh.' : 'السلوك والمواظبة', width: 140, max: '10' },
        { key: 'exam1', title: isEn ? 'T.1' : 'الاختبار الأول', width: 150, max: '20' },
        { key: 'exam2', title: isEn ? 'T.2' : 'الاختبار الثاني', width: 150, max: '20' },
        // عمود فارغ قبل حقل المجموع بعرض 0.2 سم (12 px)
        { key: 'spacer2', title: '', width: spacer2Width, max: '' },
        { key: 'total', title: isEn ? 'Tot.' : 'المجموع', width: 175, max: '100' },
        { key: 'eval', title: isEn ? 'Eval.' : 'التقدير', width: 178, max: '' },
      ]
    : isMiddleOrSecondaryStage
    ? [
        { key: 'subject', title: isEn ? 'Subject' : 'بنود التقييم', width: 266, max: isEn ? 'Max' : 'العظمى' },
        // عمود فارغ بعد حقل اسم المواد بعرض 0.2 سم (12 px)
        { key: 'spacer1', title: '', width: spacer1Width, max: '' },
        { key: 'homework', title: isEn ? 'H.W.' : 'كراسة الواجب', width: 165, max: isSecondaryStage ? '15' : '10' },
        { key: 'weekly', title: isEn ? 'W.A.' : 'التقييم الأسبوعى', width: 175, max: isSecondaryStage ? '15' : '20' },
        { key: 'behavior', title: isEn ? 'Beh.' : 'السلوك والمواظبة', width: 165, max: '10' },
        { key: 'exam1', title: isEn ? 'T.1' : 'الإختبار الأول', width: 175, max: '15' },
        { key: 'exam2', title: isEn ? 'T.2' : 'الإختبار الثانى', width: 169, max: '15' },
        { key: 'written', title: isEn ? 'W.E.' : 'الإمتحان التحريرى', width: 179, max: '30' },
        // عمود فارغ قبل حقل المجموع بعرض 0.2 سم (12 px)
        { key: 'spacer2', title: '', width: spacer2Width, max: '' },
        { key: 'total', title: isEn ? 'Tot.' : 'المجموع', width: 170, max: '100' },
        { key: 'eval', title: isEn ? 'Eval.' : 'التقدير', width: 170, max: '' },
      ]
    : [
        { key: 'subject', title: isEn ? 'Subject' : 'بنود التقييم', width: 226, max: isEn ? 'Max' : 'العظمى' },
        // عمود فارغ بعد حقل اسم المواد بعرض 0.2 سم (12 px)
        { key: 'spacer1', title: '', width: spacer1Width, max: '' },
        { key: 'notebook', title: isEn ? 'C.W.' : 'كراسة الحصة', width: 135, max: '5' },
        { key: 'homework', title: isEn ? 'H.W.' : 'كراسة الواجب', width: 135, max: '5' },
        { key: 'weekly', title: isEn ? 'W.A.' : 'التقييم الأسبوعى', width: 165, max: '10' },
        { key: 'behavior', title: isEn ? 'Beh.' : 'السلوك والمواظبة', width: 159, max: '5' },
        { key: 'exam1', title: isEn ? 'T.1' : 'الإختبار الأول', width: 160, max: '15' },
        { key: 'exam2', title: isEn ? 'T.2' : 'الإختبار الثانى', width: 160, max: '15' },
        { key: 'written', title: isEn ? 'W.E.' : 'الإمتحان التحريرى', width: 164, max: '60' },
        // عمود فارغ قبل حقل المجموع بعرض 0.2 سم (12 px)
        { key: 'spacer2', title: '', width: spacer2Width, max: '' },
        { key: 'total', title: isEn ? 'Tot.' : 'المجموع', width: 160, max: '100' },
        { key: 'eval', title: isEn ? 'Eval.' : 'التقدير', width: 170, max: '' },
      ];

  const getEvaluationLabel = (pct: number): string => {
    if (isEn) {
      if (pct >= 85) return 'Excellent';
      if (pct >= 75) return 'Very Good';
      if (pct >= 65) return 'Good';
      if (pct >= 50) return 'Pass';
      return 'Below Level';
    }
    if (pct >= 85) return 'ممتاز';
    if (pct >= 75) return 'جيد جداً';
    if (pct >= 65) return 'جيد';
    if (pct >= 50) return 'مقبول';
    return 'دون المستوى';
  };

  const computeStudentSemesterScores = (studentData: StudentData, isFemaleStudent: boolean) => {
    let totalAddedScore = 0;
    let totalAddedMax = 0;
    let hasAnyRecordedScore = false;
    let allAddedAbsent = true;
    let failedSubjectsCount = 0;

    for (const subj of addedSubjects) {
      const subjMax = isMiddleStage && isSecondSem
        ? getMiddleActualMax(subj)
        : (isSec2 && isSecondSem
            ? getSecondary2ActualMax(subj)
            : (subj.maxGrade || (subj.maxAssessmentsGrade !== undefined && subj.maxWrittenGrade !== undefined ? subj.maxAssessmentsGrade + subj.maxWrittenGrade : 100)));
      totalAddedMax += subjMax;

      // درجات الفصل الأول
      const item1 = studentData.detailedAssessments?.['first']?.[subj.key] ||
        (studentData.detailedAssessments as any)?.['الفصل الدراسي الأول']?.[subj.key] ||
        (studentData.detailedAssessments as any)?.['الفصل الدراسي الاول']?.[subj.key];
      const w1Val = studentData.writtenExams?.['first']?.[subj.key] ??
        (studentData.writtenExams as any)?.['الفصل الدراسي الأول']?.[subj.key] ??
        (studentData.writtenExams as any)?.['الفصل الدراسي الاول']?.[subj.key] ?? '';

      let assess1 = 0;
      let hasAssess1 = false;
      let isAbsentAssess1 = false;
      const tot1Str = item1?.total ?? '';
      if (tot1Str === 'غ') { isAbsentAssess1 = true; }
      else if (tot1Str !== '') {
        const n = parseFloat(String(tot1Str).replace(',', '.'));
        if (!isNaN(n)) { assess1 = n; hasAssess1 = true; }
      } else {
        const parts = isMiddleOrSecondaryStage
          ? [item1?.homework, item1?.weeklyAssessment, item1?.behavior, item1?.firstMonthlyExam, item1?.secondMonthlyExam]
          : [item1?.classNotebook, item1?.homework, item1?.weeklyAssessment, item1?.behavior, item1?.firstMonthlyExam, item1?.secondMonthlyExam];
        let pSum = 0;
        let anyP = false;
        for (const p of parts) {
          const s = String(p || '').trim();
          if (s && s !== 'غ') {
            const num = parseFloat(s.replace(',', '.'));
            if (!isNaN(num)) { pSum += num; anyP = true; }
          }
        }
        if (anyP) { assess1 = pSum; hasAssess1 = true; }
      }
      if (!hasAssess1 && !isAbsentAssess1) {
        const fb1 = studentData.assessments?.['first']?.[subj.key] ?? (studentData.assessments as any)?.['الفصل الدراسي الأول']?.[subj.key];
        if (fb1 === 'غ') isAbsentAssess1 = true;
        else if (fb1 !== undefined && fb1 !== null && fb1 !== '') {
          const num = parseFloat(String(fb1).replace(',', '.'));
          if (!isNaN(num)) { assess1 = num; hasAssess1 = true; }
        }
      }

      let written1 = 0;
      let hasWritten1 = false;
      let isAbsentWritten1 = false;
      const w1Str = String(w1Val ?? '').trim();
      if (w1Str === 'غ') isAbsentWritten1 = true;
      else if (w1Str !== '') {
        const n = parseFloat(w1Str.replace(',', '.'));
        if (!isNaN(n)) { written1 = n; hasWritten1 = true; }
      }

      // درجات الفصل الثاني
      const item2 = studentData.detailedAssessments?.['second']?.[subj.key] ||
        (studentData.detailedAssessments as any)?.['الفصل الدراسي الثانى']?.[subj.key] ||
        (studentData.detailedAssessments as any)?.['الفصل الدراسي الثاني']?.[subj.key];
      const w2Val = studentData.writtenExams?.['second']?.[subj.key] ??
        (studentData.writtenExams as any)?.['الفصل الدراسي الثانى']?.[subj.key] ??
        (studentData.writtenExams as any)?.['الفصل الدراسي الثاني']?.[subj.key] ?? '';

      let assess2 = 0;
      let hasAssess2 = false;
      let isAbsentAssess2 = false;
      const tot2Str = item2?.total ?? '';
      if (tot2Str === 'غ') { isAbsentAssess2 = true; }
      else if (tot2Str !== '') {
        const n = parseFloat(String(tot2Str).replace(',', '.'));
        if (!isNaN(n)) { assess2 = n; hasAssess2 = true; }
      } else {
        const parts = isMiddleOrSecondaryStage
          ? [item2?.homework, item2?.weeklyAssessment, item2?.behavior, item2?.firstMonthlyExam, item2?.secondMonthlyExam]
          : [item2?.classNotebook, item2?.homework, item2?.weeklyAssessment, item2?.behavior, item2?.firstMonthlyExam, item2?.secondMonthlyExam];
        let pSum = 0;
        let anyP = false;
        for (const p of parts) {
          const s = String(p || '').trim();
          if (s && s !== 'غ') {
            const num = parseFloat(s.replace(',', '.'));
            if (!isNaN(num)) { pSum += num; anyP = true; }
          }
        }
        if (anyP) { assess2 = pSum; hasAssess2 = true; }
      }
      if (!hasAssess2 && !isAbsentAssess2) {
        const fb2 = studentData.assessments?.['second']?.[subj.key] ?? (studentData.assessments as any)?.['الفصل الدراسي الثانى']?.[subj.key];
        if (fb2 === 'غ') isAbsentAssess2 = true;
        else if (fb2 !== undefined && fb2 !== null && fb2 !== '') {
          const num = parseFloat(String(fb2).replace(',', '.'));
          if (!isNaN(num)) { assess2 = num; hasAssess2 = true; }
        }
      }

      let written2 = 0;
      let hasWritten2 = false;
      let isAbsentWritten2 = false;
      const w2Str = String(w2Val ?? '').trim();
      if (w2Str === 'غ') isAbsentWritten2 = true;
      else if (w2Str !== '') {
        const n = parseFloat(w2Str.replace(',', '.'));
        if (!isNaN(n)) { written2 = n; hasWritten2 = true; }
      }

      if (isSecondSem) {
        const sem1Total = assess1 + written1;
        const sem2Total = assess2 + written2;
        const hasSem1 = hasAssess1 || hasWritten1;
        const hasSem2 = hasAssess2 || hasWritten2;

        if (hasSem1 || hasSem2) {
          hasAnyRecordedScore = true;
          allAddedAbsent = false;
          const combined = (hasSem1 && hasSem2) ? (sem1Total + sem2Total) / 2 : (hasSem2 ? sem2Total : sem1Total);
          if (isMiddleStage && isSecondSem) {
            const actualMax = getMiddleActualMax(subj);
            totalAddedScore += Math.round(((combined / 100) * actualMax) * 10) / 10;
          } else if (isSec2 && isSecondSem) {
            const actualMax = getSecondary2ActualMax(subj);
            totalAddedScore += Math.round(((combined / 100) * actualMax) * 10) / 10;
          } else {
            totalAddedScore += combined;
          }
        } else if (isAbsentAssess1 || isAbsentWritten1 || isAbsentAssess2 || isAbsentWritten2) {
          hasAnyRecordedScore = true;
        }

        const finalSubjScore = (hasSem1 && hasSem2) ? (sem1Total + sem2Total) / 2 : (hasSem2 ? sem2Total : sem1Total);
        const subjPct = Math.min(100, (finalSubjScore / 100) * 100);
        const maxWrittenVal = subj.hasWrittenExam !== false ? (subj.maxWrittenGrade !== undefined ? subj.maxWrittenGrade : (stage === 'primary' ? 60 : 30)) : 0;
        const writtenPassMin = stage === 'secondary' ? 25 : 30;
        const written2Pct = maxWrittenVal > 0 ? (written2 / maxWrittenVal) * 100 : 0;
        const isReligion = subj.key === 'religion' || (subj.label && subj.label.includes('دين'));
        const minPass = isReligion ? 70 : 50;

        if (subj.hasWrittenExam !== false) {
          if (subjPct < minPass || written2Pct < writtenPassMin) {
            failedSubjectsCount++;
          }
        } else {
          if (subjPct < minPass) {
            failedSubjectsCount++;
          }
        }
      } else {
        if (hasAssess1 || hasWritten1) {
          hasAnyRecordedScore = true;
          allAddedAbsent = false;
          totalAddedScore += (assess1 + written1);
        } else if (isAbsentAssess1 || isAbsentWritten1) {
          hasAnyRecordedScore = true;
        }
      }
    }

    if (isSecondSem) {
      for (const subj of nonAddedSubjects) {
        const item1 = studentData.detailedAssessments?.['first']?.[subj.key] || (studentData.detailedAssessments as any)?.['الفصل الدراسي الأول']?.[subj.key];
        const w1Val = studentData.writtenExams?.['first']?.[subj.key] ?? (studentData.writtenExams as any)?.['الفصل الدراسي الأول']?.[subj.key] ?? '';
        const item2 = studentData.detailedAssessments?.['second']?.[subj.key] || (studentData.detailedAssessments as any)?.['الفصل الدراسي الثانى']?.[subj.key];
        const w2Val = studentData.writtenExams?.['second']?.[subj.key] ?? (studentData.writtenExams as any)?.['الفصل الدراسي الثانى']?.[subj.key] ?? '';

        const parseSum = (item: any, wVal: any) => {
          let s = 0;
          let has = false;
          const t = item?.total ?? '';
          if (t && t !== 'غ') {
            const n = parseFloat(String(t).replace(',', '.'));
            if (!isNaN(n)) { s += n; has = true; }
          }
          const w = String(wVal ?? '').trim();
          if (w && w !== 'غ') {
            const n = parseFloat(w.replace(',', '.'));
            if (!isNaN(n)) { s += n; has = true; }
          }
          return { sum: s, has };
        };

        const res1 = parseSum(item1, w1Val);
        const res2 = parseSum(item2, w2Val);
        if (res1.has || res2.has) {
          const finalScore = (res1.has && res2.has) ? (res1.sum + res2.sum) / 2 : (res2.has ? res2.sum : res1.sum);
          const subjMax = subj.maxGrade || 100;
          const isReligion = subj.key === 'religion' || (subj.label && subj.label.includes('دين'));
          const minPass = isReligion ? 70 : 50;
          const pct = subjMax > 0 ? (finalScore / subjMax) * 100 : 0;
          if (pct < minPass) {
            failedSubjectsCount++;
          }
        }
      }
    }

    let totalScoreDisplay = '........';
    let pctDisplay = '........';
    let evalDisplay = '........';

    if (allAddedAbsent && hasAnyRecordedScore) {
      totalScoreDisplay = 'غ';
      pctDisplay = '0';
      evalDisplay = 'غائب';
    } else if (hasAnyRecordedScore) {
      const roundedTotal = Math.round(totalAddedScore * 10) / 10;
      totalScoreDisplay = Number.isInteger(roundedTotal) ? String(roundedTotal) : roundedTotal.toFixed(1);

      if (totalAddedMax > 0) {
        const rawPct = (totalAddedScore / totalAddedMax) * 100;
        const roundedPct = Math.round(rawPct * 10) / 10;
        pctDisplay = Number.isInteger(roundedPct) ? String(roundedPct) : roundedPct.toFixed(1);
        evalDisplay = getEvaluationLabel(rawPct);
      }
    }

    let resultDisplay = '........';
    if (isSecondSem) {
      const preResult = (studentData as any).finalResult || (studentData as any).studentResult || (studentData as any).result;
      if (preResult && preResult !== '-' && !preResult.includes('يجب رصد')) {
        resultDisplay = preResult;
      } else if (hasAnyRecordedScore) {
        if (stage === 'primary') {
          resultDisplay = failedSubjectsCount > 0 ? 'دور ثان' : (isFemaleStudent ? 'ناجحة' : 'ناجح');
        } else {
          if (failedSubjectsCount >= 3) {
            resultDisplay = isFemaleStudent ? 'راسبة' : 'راسب';
          } else if (failedSubjectsCount > 0) {
            resultDisplay = 'دور ثان';
          } else {
            resultDisplay = isFemaleStudent ? 'ناجحة' : 'ناجح';
          }
        }
      }
    }

    return {
      totalAddedScore,
      totalAddedMax,
      totalScoreDisplay,
      pctDisplay,
      evalDisplay,
      resultDisplay,
    };
  };

  for (let studentIdx = 0; studentIdx < studentList.length; studentIdx++) {
    const student = studentList[studentIdx];
    const isFemale =
      student.gender === 'female' ||
      student.gender === 'أنثى' ||
      student.gender === 'بنت' ||
      (Boolean(student.nationalId) && student.nationalId!.length === 14 && parseInt(student.nationalId![12], 10) % 2 === 0);

    const isStudentRegular = Boolean(
      (student as any).systemType === 'regular' ||
      (student as any).enrollmentType === 'منتظم' ||
      (student as any).enrollmentType === 'نظامى' ||
      (student as any).enrollmentStatus === 'منتظم' ||
      (student as any).enrollmentStatus === 'نظامى' ||
      student.studentStatus === 'نظامى' ||
      student.studentStatus === 'عادى' ||
      student.studentStatus === 'منتظم'
    );
    const isStudentHomeschool = !isStudentRegular && !isExplicitlyRegular && Boolean(
      isMiddleHomeschool ||
      (stage === 'secondary' && isHomeschoolResolved) ||
      (student as any).systemType === 'homeschool' ||
      (student as any).enrollmentType === 'منازل' ||
      (student as any).enrollmentStatus === 'منازل' ||
      student.studentStatus === 'منازل'
    );
    const isMiddleOrSecHomeschool = Boolean(
      (isMiddleOrSecondaryStage || isMiddleStage || isSecondaryStage) && isStudentHomeschool
    );
    const {
      totalAddedScore,
      totalAddedMax,
      totalScoreDisplay,
      pctDisplay,
      evalDisplay,
      resultDisplay,
    } = computeStudentSemesterScores(student, isFemale);

    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    canvas.dir = 'rtl';
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Background fill
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // 1. Top Header Row: الإدارة (Far right) & المدرسة (Far left)
    // زيادة ارتفاع الهيدر بنسبة 100% فى جميع المراحل ما عدا رياض الأطفال (من 68 إلى 136)
    const isKgStage = stage === 'kindergarten';
    const topInfoY = isKgStage ? 22 : 16;
    const topInfoH = isKgStage ? 40 : 136; // زيادة ارتفاع الهيدر بنسبة 100% (مضاعفة الارتفاع إلى 136)
    ctx.direction = 'rtl';
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px "Cairo", sans-serif';

    const effectiveAdmin = (isEn && sAdminEn.trim()) ? sAdminEn.trim() : sAdmin.trim();
    const effectiveSchool = (isEn && sNameEn.trim()) ? sNameEn.trim() : sName.trim();

    const adminDisplay = isEn
      ? (effectiveAdmin ? `Administration :  ${effectiveAdmin}` : 'Administration :  ........................')
      : (effectiveAdmin ? `الإدارة :  ${effectiveAdmin}` : 'الإدارة :  ........................');
    const schoolDisplay = isEn
      ? (effectiveSchool ? `School :  ${effectiveSchool}` : 'School :  ........................')
      : (effectiveSchool ? `المدرسة :  ${effectiveSchool}` : 'المدرسة :  ........................');

    // Far Right: الإدارة
    ctx.textAlign = 'right';
    ctx.fillText(adminDisplay, marginX + contentW, topInfoY + topInfoH / 2);

    let schoolX = marginX;
    let logoActualH = 112;
    let logoActualW = 112;
    let logoY = topInfoY + (topInfoH - logoActualH) / 2;

    // وضع اللوجو فى أقصى يسار الصفحة (يسار اسم المدرسة) في المراحل غير رياض الأطفال
    if (!isKgStage) {
      const activeLogo = schoolLogoImage || ministryLogoImage;
      if (activeLogo) {
        logoActualH = 112; // ارتفاع متناسق مع ارتفاع الهيدر الجديد (136px)
        const logoNatW = activeLogo.naturalWidth || (activeLogo as any).width || 1;
        const logoNatH = activeLogo.naturalHeight || (activeLogo as any).height || 1;
        const logoAspect = logoNatW / logoNatH;
        logoActualW = Math.round(logoActualH * logoAspect);
        logoY = topInfoY + (topInfoH - logoActualH) / 2;
        // وضع اللوجو فى أقصى يسار الصفحة (يسار اسم المدرسة)
        const logoX = marginX;
        drawCrispImage(ctx, activeLogo, logoX, logoY, logoActualW, logoActualH);
        // اسم المدرسة بجوار اللوجو جهة اليمين (بحيث يقع اللوجو يسار اسم المدرسة)
        schoolX = marginX + logoActualW + 24;
      }
    }

    // Far Left: المدرسة (يمين اللوجو بحيث يكون اللوجو يسار اسم المدرسة)
    ctx.textAlign = 'left';
    ctx.fillText(schoolDisplay, schoolX, topInfoY + topInfoH / 2);

    // Horizontal Divider Line (<hr>)
    // زيادة المسافة بين اللوجو والخط الفاصل الموجود أسفل منه بمقدار 60% من المسافة الحالية
    // المسافة الحالية كانت: 11px -> الزيادة بنسبة 60% تصبح: 18px
    const headerLineY = !isKgStage
      ? (logoY + logoActualH + 18)
      : (topInfoY + topInfoH + 6);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(marginX, headerLineY);
    ctx.lineTo(marginX + contentW, headerLineY);
    ctx.stroke();

    // 2. Title Banner (Burnt Brown Gradient) - Height increased by 25% (62 -> 78)
    const bannerY = headerLineY + 10;
    const bannerH = 78;
    const bannerGrad = ctx.createLinearGradient(marginX, bannerY, marginX + contentW, bannerY);
    bannerGrad.addColorStop(0, '#361500');
    bannerGrad.addColorStop(0.25, '#5c270d');
    bannerGrad.addColorStop(0.5, '#9a5826');
    bannerGrad.addColorStop(0.75, '#5c270d');
    bannerGrad.addColorStop(1, '#361500');

    drawRoundedRect(ctx, marginX, bannerY, contentW, bannerH, 16);
    ctx.fillStyle = bannerGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();

    const titleText = isEn
      ? (isSecondSem
          ? 'Grades & Assessments Certificate - Academic Year 2026 - 2027'
          : `First Semester Grades & Assessments Certificate 2026 – 2027`)
      : (isSecondSem
          ? 'شهادة درجات وتقييمات - العام الدراسي  2026 - 2027'
          : `شهادة درجات وتقديرات ${semText} 2026 – 2027`);

    let decreeText = isEn
      ? (stage === 'prep' || stage === 'middle'
          ? 'According to Ministerial Decree No. 137 - 12/08/2024'
          : stage === 'secondary'
          ? 'According to Ministerial Decree No. 234 - 17/09/2025'
          : 'According to Ministerial Decree No. 151 - 18/08/2026')
      : (stage === 'prep' || stage === 'middle'
          ? 'وفقا للقرار الوزارى رقم 137 - 12 - 08 - 2024 م'
          : stage === 'secondary'
          ? 'وفقا للقرار الوزارى رقم 234 - 17 - 09 - 2025 م'
          : 'وفقا للقرار الوزارى رقم 151 – 18 – 8 – 2026 م');

    if (!isKgStage) {
      // نقل نص وفقا للقرار إلى أقصى يسار شريط العنوان البني في جميع المراحل ما عدا رياض الأطفال
      // تكبير حجم الخط المكتوب باللغة الإنجليزية بمقدار 40% (من 13.5 إلى 19px)
      ctx.fillStyle = '#ffffff';
      let decreeFontSize = isEn ? 19 : 15;
      ctx.font = `bold ${decreeFontSize}px "Cairo", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const decreeLeftX = marginX + (isEn ? 20 : 28);
      ctx.fillText(decreeText, decreeLeftX, bannerY + bannerH / 2 + 1);
      const decreeW = ctx.measureText(decreeText).width;
      const decreeRightX = decreeLeftX + decreeW;

      let rightEdge = marginX + contentW - 24;

      // فى المرحلة الاعدادية - منازل فقط : فى شهادات الفصل الدراسي الاول والثانى : اكتب فى اقصى يمين شريط العنوان كلمة : منازل
      // لا تكتب كلمة منازل فى شهادات المرحلة الاعدادية منتظمين
      if (isMiddleStage && isStudentHomeschool && !isStudentRegular && !isExplicitlyRegular) {
        const homeschoolText = isEn ? 'Homeschool' : 'منازل';
        ctx.fillStyle = '#ffffff';
        const hsFontSize = isEn ? 26 : 28;
        ctx.font = `900 ${hsFontSize}px "Cairo", sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const hsRightX = marginX + contentW - (isEn ? 20 : 28);
        ctx.fillText(homeschoolText, hsRightX, bannerY + bannerH / 2 + 1);
        const hsW = ctx.measureText(homeschoolText).width;
        rightEdge = hsRightX - hsW - 20;
      }

      // العنوان الرئيسي في شريط العنوان (تكبير حجم الخط المكتوب باللغة الإنجليزية بمقدار 40%: من 24 إلى 34px)
      ctx.fillStyle = '#ffffff';
      let bannerFontSize = isEn ? 34 : 28;
      ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;

      const availableTitleW = rightEdge - (decreeRightX + 16);
      while (bannerFontSize > 16 && ctx.measureText(titleText).width > availableTitleW) {
        bannerFontSize -= 0.5;
        ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;
      }

      const fullCenterX = marginX + contentW / 2;
      const titleW = ctx.measureText(titleText).width;
      const finalTitleCenterX = (fullCenterX - titleW / 2 > decreeRightX + 15 && fullCenterX + titleW / 2 < rightEdge - 15)
        ? fullCenterX
        : (decreeRightX + 15 + rightEdge) / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(titleText, finalTitleCenterX, bannerY + bannerH / 2 + 2);
    } else {
      ctx.fillStyle = '#ffffff';
      let bannerFontSize = isEn ? 35 : 29;
      ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;
      while (bannerFontSize > 14 && ctx.measureText(titleText).width > contentW - 32) {
        bannerFontSize -= 1;
        ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(titleText, marginX + contentW / 2, bannerY + bannerH / 2 + 2);
    }

    // 3. Subtitle / Decree Line
    const decreeY = bannerY + bannerH + 20;

    // 4. Student Info Section & Total Score Circle:
    // بجوار الصف - المرحلة - رقم اللجنة - رقم الجلوس: ضع المجموع الكلى فى دائرة مثل المرفق تماما
    const studentPrefix = isEn ? 'Student' : (isFemale ? 'الطالبة' : 'الطالب');
    let rawEnName = (student.nameEn || (student as any).englishName || '').trim();
    if (!rawEnName) {
      try {
        const savedStudentsStr = localStorage.getItem('sheet_control_students_data');
        if (savedStudentsStr) {
          const parsed = JSON.parse(savedStudentsStr);
          const list: any[] = Array.isArray(parsed) ? parsed : Object.values(parsed).flat();
          const found = list.find((s: any) => s && (s.id === student.id || (student.nationalId && s.nationalId === student.nationalId) || s.name === student.name));
          if (found && (found.nameEn || found.englishName)) {
            rawEnName = (found.nameEn || found.englishName).trim();
          }
        }
      } catch {}
    }
    const studentNameVal = isEn
      ? (rawEnName || (student.name ? student.name.trim() : '................................'))
      : (student.name ? student.name.trim() : '................................');
    const gradeVal = selectedGrade ? selectedGrade.trim() : '................';
    let cleanStage = isEn
      ? (stage === 'primary' ? 'Primary Stage' : stage === 'prep' || stage === 'middle' ? (isHomeschoolResolved ? 'Preparatory Stage (Homeschool)' : 'Preparatory Stage') : stage === 'secondary' ? (isHomeschoolResolved ? 'Secondary Stage (Homeschool)' : 'Secondary Stage') : stage)
      : (stageDisplay.trim().startsWith('المرحلة') ? stageDisplay.trim() : `المرحلة ${stageDisplay.trim()}`);
    if (!isEn && stage === 'secondary' && isHomeschoolResolved) {
      cleanStage = cleanStage.replace(/\(\s*منتظمين\s*\)/g, '( منازل )');
      if (!cleanStage.includes('منازل')) {
        cleanStage = `${cleanStage} ( منازل )`;
      }
    }

    const seatNumberVal = (
      student.seatNumbers?.[semKey] ||
      student.seatNumbers?.[semester] ||
      student.seatNumber ||
      ''
    ).trim() || '........';

    const committeeNumberVal = (
      student.committeeNumbers?.[semKey] ||
      student.committeeNumbers?.[semester] ||
      student.committeeNumber ||
      ''
    ).trim() || '........';

    // سطر بيانات الطالب: اسم الطالب فى أقصى اليمين، والصف والمرحلة ورقم اللجنة ورقم الجلوس فى أقصى اليسار
    const infoY = !isKgStage ? (bannerY + bannerH + 26) : (decreeY + 34);

    // اسم الطالب فى أقصى اليمين باللون الأحمر القاتم
    const studentRightText = `${studentPrefix} : ${studentNameVal}`;
    ctx.direction = isEn ? 'ltr' : 'rtl';
    ctx.fillStyle = '#7f1d1d';
    ctx.textBaseline = 'middle';
    let rightFontSize = isEn ? 22 : 24;
    ctx.font = `900 ${rightFontSize}px "Cairo", sans-serif`;
    ctx.textAlign = 'right';
    const maxRightW = contentW * 0.44;
    while (rightFontSize > 14 && ctx.measureText(studentRightText).width > maxRightW) {
      rightFontSize -= 0.5;
      ctx.font = `900 ${rightFontSize}px "Cairo", sans-serif`;
    }
    ctx.fillText(studentRightText, marginX + contentW, infoY);
    const measuredRightW = ctx.measureText(studentRightText).width;

    // تنظيف اسم الصف من أية زوائد تقنية (_scientific, _literary, modern tracks)
    const cleanGradeRaw = gradeVal
      .replace(/_scientific/gi, '')
      .replace(/_literary/gi, '')
      .replace(/_modern_medical/gi, '')
      .replace(/_modern_engineering/gi, '')
      .replace(/_modern_business/gi, '')
      .replace(/_modern_arts/gi, '')
      .replace(/\s*-\s*scientific/gi, '')
      .replace(/\s*-\s*literary/gi, '')
      .replace(/scientific/gi, '')
      .replace(/literary/gi, '')
      .trim();
    const gradeDisplayFormatted = cleanGradeRaw.startsWith('الصف ')
      ? cleanGradeRaw
      : `الصف ${cleanGradeRaw}`;

    // التحقق مما إذا كانت المرحلة الثانوية - الصف الثاني (معرّفة في نطاق الدالة)

    let divisionArabic = '';
    if (isSec2) {
      const gradeLower = (selectedGrade || '').toLowerCase();
      const studentDiv = (((student as any)?.division || '') as string).toLowerCase();
      let localDiv = '';
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('sheet_control_school_data');
          if (raw) localDiv = (JSON.parse(raw)?.division || '').toLowerCase();
        } catch {}
      }

      if (
        gradeLower.includes('modern_medical') ||
        gradeLower.includes('medical') ||
        gradeLower.includes('الطب') ||
        studentDiv.includes('medical') ||
        studentDiv.includes('الطب') ||
        localDiv === 'modern_medical'
      ) {
        divisionArabic = 'مسار الطب وعلوم الحياة';
      } else if (
        gradeLower.includes('modern_engineering') ||
        gradeLower.includes('engineering') ||
        gradeLower.includes('الهندسة') ||
        studentDiv.includes('engineering') ||
        studentDiv.includes('الهندسة') ||
        localDiv === 'modern_engineering'
      ) {
        divisionArabic = 'مسار الهندسة وعلوم الحاسب';
      } else if (
        gradeLower.includes('modern_business') ||
        gradeLower.includes('business') ||
        gradeLower.includes('الأعمال') ||
        gradeLower.includes('الاعمال') ||
        studentDiv.includes('business') ||
        studentDiv.includes('الأعمال') ||
        localDiv === 'modern_business'
      ) {
        divisionArabic = 'مسار الأعمال';
      } else if (
        gradeLower.includes('modern_arts') ||
        gradeLower.includes('arts') ||
        gradeLower.includes('الآداب') ||
        gradeLower.includes('الاداب') ||
        studentDiv.includes('arts') ||
        studentDiv.includes('الآداب') ||
        localDiv === 'modern_arts'
      ) {
        divisionArabic = 'مسار الآداب والفنون';
      } else if (
        gradeLower.includes('scientific') ||
        gradeLower.includes('علمي') ||
        gradeLower.includes('علمى') ||
        studentDiv.includes('scientific') ||
        studentDiv.includes('علم') ||
        localDiv === 'scientific'
      ) {
        divisionArabic = 'الشعبة العلمية';
      } else if (
        gradeLower.includes('literary') ||
        gradeLower.includes('أدبي') ||
        gradeLower.includes('أدبى') ||
        studentDiv.includes('literary') ||
        studentDiv.includes('أدب') ||
        localDiv === 'literary'
      ) {
        divisionArabic = 'الشعبة الأدبية';
      } else {
        divisionArabic = 'الشعبة الأدبية';
      }
    }

    // تعديل سطر الصف ورقم اللجنة ورقم الجلوس
    let infoItemsText = '';
    if (isEn) {
      let enGrade = 'Grade ' + cleanGradeRaw.replace(/[^0-9]/g, '');
      if (enGrade === 'Grade ') {
        if (cleanGradeRaw.includes('الأول') || cleanGradeRaw.includes('الاول')) enGrade = 'Grade 1';
        else if (cleanGradeRaw.includes('الثاني') || cleanGradeRaw.includes('الثانى')) enGrade = 'Grade 2';
        else if (cleanGradeRaw.includes('الثالث')) enGrade = 'Grade 3';
        else if (cleanGradeRaw.includes('الرابع')) enGrade = 'Grade 4';
        else if (cleanGradeRaw.includes('الخامس')) enGrade = 'Grade 5';
        else if (cleanGradeRaw.includes('السادس')) enGrade = 'Grade 6';
        else enGrade = cleanGradeRaw;
      }
      const enDiv = divisionArabic.includes('علم') ? 'Scientific Section' : (divisionArabic.includes('أدب') ? 'Literary Section' : '');
      infoItemsText = isSec2 && enDiv
        ? `${enGrade}   •   ${enDiv}   •   ${cleanStage}   •   Committee No. : ${committeeNumberVal}   •   Seat No. : ${seatNumberVal}`
        : `${enGrade}   •   ${cleanStage}   •   Committee No. : ${committeeNumberVal}   •   Seat No. : ${seatNumberVal}`;
    } else {
      infoItemsText = isSec2 && divisionArabic
        ? `${gradeDisplayFormatted}   •   ${divisionArabic}   •   ${cleanStage}   •   رقم اللجنة : ${committeeNumberVal}   •   رقم الجلوس : ${seatNumberVal}`
        : `${gradeDisplayFormatted}   •   ${cleanStage}   •   رقم اللجنة : ${committeeNumberVal}   •   رقم الجلوس : ${seatNumberVal}`;
    }
    ctx.direction = isEn ? 'ltr' : 'rtl';
    ctx.fillStyle = '#0f172a';
    let itemsFontSize = isEn ? 19 : 21;
    ctx.font = `bold ${itemsFontSize}px "Cairo", sans-serif`;
    ctx.textAlign = 'left';
    const maxItemsW = contentW - measuredRightW - 28;
    while (itemsFontSize > 12 && ctx.measureText(infoItemsText).width > maxItemsW) {
      itemsFontSize -= 0.5;
      ctx.font = `bold ${itemsFontSize}px "Cairo", sans-serif`;
    }
    ctx.fillText(infoItemsText, marginX, infoY);

    // 5. Table Setup
    const tableTopY = infoY + 24;
    const sectionHeaderH = 46; // ارتفاع صف عنوان القسم
    const emptyRowH = 12;
    const totalSubjectsCount = addedSubjects.length + nonAddedSubjects.length;

    // حساب ارتفاع خلايا صف المواد بدقة ليترك مساحة كاملة للتوقيعات والتذييل بدون قص
    const headerRow1H = isSecondSemNonKg ? 50 : 54;
    const estFooterTotalH = 90;
    const estFooterLineY = heightPx - estFooterTotalH; // 1150
    const estSigDividerY = estFooterLineY - 95; // 1055
    const estSignaturesY = estSigDividerY + 28; // 1083
    const estSignaturesDotsY = estSignaturesY + 26; // 1109
    const estLineY = estSigDividerY - 26; // 1029
    const estAttendanceDividerY = estLineY - 24; // 1005
    const maxTableBottom = estAttendanceDividerY - 12; // 993
    const availableTableH = maxTableBottom - tableTopY;

    const dynamicRowsCount = isSecondSemNonKg
      ? totalSubjectsCount + 2
      : totalSubjectsCount + 1;
    const fixedNonDataH = headerRow1H + sectionHeaderH * 2 + emptyRowH * 2;
    const targetDataH = Math.floor((availableTableH - fixedNonDataH) / Math.max(1, dynamicRowsCount));
    const dataRowH = Math.max(28, Math.min(42, targetDataH));

    const headerRow2H = dataRowH;
    const headerRow3H = isSecondSemNonKg ? dataRowH : 0;

    const tableTotalH =
      headerRow1H +
      headerRow2H +
      headerRow3H +
      emptyRowH * 2 +
      sectionHeaderH * 2 +
      totalSubjectsCount * dataRowH;

    // Clip rounded corners (16px)
    ctx.save();
    drawRoundedRect(ctx, marginX, tableTopY, contentW, tableTotalH, 16);
    ctx.clip();

    let curY = tableTopY;
    const failedCellsWhiteBorders: { cX: number; curY: number; width: number; rowHeight: number }[] = [];
    let spacer1X = 0;
    let spacer2X = 0;

    // Helper to draw simple row cells
    const drawRowCells = (
      cells: { text: string; width: number; isBold?: boolean; fontSize?: number; bg?: string; textColor?: string; hasRedCircle?: boolean }[],
      rowHeight: number,
      rowBg?: string | CanvasGradient
    ) => {
      if (rowBg) {
        ctx.fillStyle = rowBg;
        ctx.fillRect(marginX, curY, contentW, rowHeight);
      }

      let curX = marginX + contentW;
      cells.forEach((cell) => {
        const cX = curX - cell.width;

        if ((cell as any).isSpacer) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cX, curY, cell.width, rowHeight);
          curX -= cell.width;
          return;
        }

        // Background
        const isCellFailed = Boolean(cell.hasRedCircle && cell.text !== '-' && cell.text.trim() !== '');
        if (isCellFailed) {
          // خلفية باللون الأحمر القاتم للخلايا غير المجتازة
          ctx.fillStyle = '#b91c1c';
          ctx.fillRect(cX, curY, cell.width, rowHeight);
        } else if (!rowBg && cell.bg) {
          ctx.fillStyle = cell.bg;
          ctx.fillRect(cX, curY, cell.width, rowHeight);
        }

        // Border
        if (isCellFailed) {
          // الحد الأيمن والأيسر بلون حدود الجدول
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cX, curY);
          ctx.lineTo(cX, curY + rowHeight);
          ctx.moveTo(cX + cell.width, curY);
          ctx.lineTo(cX + cell.width, curY + rowHeight);
          ctx.stroke();

          // الحد العلوي والسفلي باللون الأبيض للخلية ذات اللون الأحمر القاتم
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cX, curY);
          ctx.lineTo(cX + cell.width, curY);
          ctx.moveTo(cX, curY + rowHeight);
          ctx.lineTo(cX + cell.width, curY + rowHeight);
          ctx.stroke();

          failedCellsWhiteBorders.push({ cX, curY, width: cell.width, rowHeight });
        } else {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cX, curY, cell.width, rowHeight);
        }

        if (cell.text) {
          // النص باللون الأبيض إذا كانت الخلية باللون الأحمر القاتم
          ctx.fillStyle = isCellFailed ? '#ffffff' : (cell.textColor || '#0f172a');
          ctx.direction = isEn ? 'ltr' : 'rtl';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let targetFontSize = cell.fontSize || 17;
          ctx.font = `${cell.isBold !== false ? 'bold' : 'normal'} ${targetFontSize}px "Cairo", sans-serif`;
          const horizontalPadding = Math.min(8, Math.max(4, Math.round(cell.width * 0.08)));
          const maxTextW = Math.max(10, cell.width - horizontalPadding * 2);
          while (targetFontSize > 8 && ctx.measureText(cell.text).width > maxTextW) {
            targetFontSize -= 0.5;
            ctx.font = `${cell.isBold !== false ? 'bold' : 'normal'} ${targetFontSize}px "Cairo", sans-serif`;
          }
          // توسيط تام للقيم في خلايا الجدول أفقياً ورأسياً بمسافات متساوية من الجهات الأربعة
          ctx.fillText(cell.text, cX + cell.width / 2, curY + rowHeight / 2, maxTextW);
        }

        curX -= cell.width;
      });
      curY += rowHeight;
    };

    // دالة مساعدة لتوسيط النص أفقياً ورأسياً في الخلية مع ضبط المسافة البادئة العلوية والسفلية لتكون متساوية تماماً
    const drawCenteredCellText = (
      text: string,
      centerX: number,
      centerY: number,
      maxAvailableWidth: number,
      options: {
        isBold?: boolean;
        fontWeight?: string;
        fontSize: number;
        minFontSize?: number;
        color?: string;
        isEnglish?: boolean;
      }
    ) => {
      ctx.save();
      const isEnglish = options.isEnglish !== undefined ? options.isEnglish : isEn;
      ctx.direction = isEnglish ? 'ltr' : 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = options.color || '#0f172a';

      let fSize = options.fontSize;
      const weight = options.fontWeight || (options.isBold !== false ? 'bold' : 'normal');
      ctx.font = `${weight} ${fSize}px "Cairo", sans-serif`;

      const maxW = Math.max(10, maxAvailableWidth - 16);
      const minF = options.minFontSize || 9;
      while (fSize > minF && ctx.measureText(text).width > maxW) {
        fSize -= 0.5;
        ctx.font = `${weight} ${fSize}px "Cairo", sans-serif`;
      }

      // إزاحة خفيفة بمقدار 1 بكسل فقط للغة الإنجليزية لموازنة ارتفاع الأحرف الكبيرة اللاتينية في خط Cairo
      const vOffset = isEnglish ? 1 : 0;
      ctx.fillText(text, centerX, centerY + vOffset);
      ctx.restore();
    };

    // Helper for spanning header
    const drawSpanningSection = (title: string, rowHeight: number, leftNote?: string, subNote?: string) => {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(marginX, curY, contentW, rowHeight);

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(marginX, curY, contentW, rowHeight);

      const centerY = curY + rowHeight / 2;
      const hasLeftNote = Boolean(leftNote && spacer2X > marginX);

      // 1. إذا وجدت ملاحظة في الخلية اليسرى
      if (hasLeftNote) {
        const leftCellW = spacer2X - marginX;
        const leftCellCenterX = marginX + leftCellW / 2;

        drawCenteredCellText(leftNote!, leftCellCenterX, centerY, leftCellW, {
          fontSize: isEn ? 17 : 14,
          minFontSize: 10,
          isBold: true,
          color: '#0f172a',
          isEnglish: isEn,
        });
      }

      // 2. عنوان القسم في منتصف الجدول تماماً
      const tableCenterX = marginX + contentW / 2;

      if (subNote) {
        // للمرحلة الابتدائية: دمج « المواد المضافة للمجموع » مع « - يحسب مجموع درجات المادة الدراسية بالدرجة الأعلى فى الاختبارين »
        // بحجم خط أصغر بنسبة تتجاوز 30% على نفس السطر في المنتصف تماماً
        let titleFontSize = isEn ? 18.5 : 20;
        let noteFontSize = Math.round(titleFontSize * 0.66 * 10) / 10; // أصغر بنسبة 34% (تتجاوز 30%)
        const maxBlockW = hasLeftNote
          ? Math.max(200, contentW - (spacer2X - marginX) * 2 - 20)
          : (contentW - 32);

        ctx.font = `900 ${titleFontSize}px "Cairo", sans-serif`;
        let wTitle = ctx.measureText(title).width;
        ctx.font = `bold ${noteFontSize}px "Cairo", sans-serif`;
        let wNote = ctx.measureText(subNote).width;

        while ((wTitle + wNote) > maxBlockW && titleFontSize > 11) {
          titleFontSize -= 0.5;
          noteFontSize = Math.round(titleFontSize * 0.66 * 10) / 10;
          ctx.font = `900 ${titleFontSize}px "Cairo", sans-serif`;
          wTitle = ctx.measureText(title).width;
          ctx.font = `bold ${noteFontSize}px "Cairo", sans-serif`;
          wNote = ctx.measureText(subNote).width;
        }

        const totalW = wTitle + wNote;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a';

        if (isEn) {
          ctx.direction = 'ltr';
          ctx.textAlign = 'left';
          const leftX = tableCenterX - totalW / 2;
          ctx.font = `900 ${titleFontSize}px "Cairo", sans-serif`;
          ctx.fillText(title, leftX, centerY);
          ctx.font = `bold ${noteFontSize}px "Cairo", sans-serif`;
          ctx.fillText(subNote, leftX + wTitle, centerY);
        } else {
          ctx.direction = 'rtl';
          ctx.textAlign = 'right';
          const rightX = tableCenterX + totalW / 2;
          ctx.font = `900 ${titleFontSize}px "Cairo", sans-serif`;
          ctx.fillText(title, rightX, centerY);
          ctx.font = `bold ${noteFontSize}px "Cairo", sans-serif`;
          ctx.fillText(subNote, rightX - wTitle, centerY);
        }
      } else {
        const maxTitleW = hasLeftNote
          ? Math.max(200, contentW - (spacer2X - marginX) * 2 - 20)
          : (contentW - 32);

        drawCenteredCellText(title, tableCenterX, centerY, maxTitleW, {
          fontSize: isEn ? 18.5 : 20,
          fontWeight: '900',
          minFontSize: 12,
          color: '#0f172a',
          isEnglish: isEn,
        });
      }

      curY += rowHeight;
    };

    const emptyWhiteRowYs: { y: number; h: number }[] = [];
    const drawEmptyWhiteRow = (rowHeight: number) => {
      emptyWhiteRowYs.push({ y: curY, h: rowHeight });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(marginX, curY, contentW, rowHeight);
      curY += rowHeight;
    };

    // رسم هيدر الجدول
    if (isSecondSemNonKg) {
      // هيدر الفصل الدراسي الثاني مثل المرفق تماماً:
      // صف 1 (سماوي ثلجي): أسماء الحقول الرئيسية، والأعمدة غير المقسمة (الدرجة الفعلية، النسبة المئوية، التقدير) تمتد بارتفاع الصفين 1 و 2
      // صف 2: ف 1 | ف 2 تحت كل بند مقسم
      // صف 3: الدرجات العظمى لكل عمود
      const headerRowGrad = ctx.createLinearGradient(marginX, curY, marginX + contentW, curY);
      headerRowGrad.addColorStop(0, '#e8f6fe');
      headerRowGrad.addColorStop(0.5, '#97dcfd');
      headerRowGrad.addColorStop(1, '#c8ebfd');

      // خلفية صف 1
      ctx.fillStyle = headerRowGrad;
      ctx.fillRect(marginX, curY, contentW, headerRow1H);

      // خلفية صف 2
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(marginX, curY + headerRow1H, contentW, headerRow2H);

      // خلفية صف 3 (العظمى)
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(marginX, curY + headerRow1H + headerRow2H, contentW, headerRow3H);

      // رسم حدود ونصوص الأعمدة الرئيسية
      let currentX = marginX + contentW;
      sem2GroupColumns.forEach((group) => {
        const groupX = currentX - group.totalWidth;

        if (group.key === 'spacer1') spacer1X = groupX;
        if (group.key === 'spacer2') spacer2X = groupX;

        if (group.key === 'spacer1' || group.key === 'spacer2') {
          // عمود فارغ بعرض 0.2 سم بحدود بيضاء
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(groupX, curY, group.totalWidth, headerRow1H + headerRow2H + headerRow3H);
          currentX -= group.totalWidth;
          return;
        }

        if (!group.isSplit) {
          const maxVal = group.maxSingle || '';
          // إذا كان العمود غير مقسم ولا توجد له درجة عظمى (مثل حقل التقدير بعد حذف التقييم العام)،
          // يتم دمج الخلية بالكامل بارتفاع الصفوف الثلاثة (headerRow1H + headerRow2H + headerRow3H)
          if (!maxVal) {
            const fullH = headerRow1H + headerRow2H + headerRow3H;
            ctx.fillStyle = headerRowGrad;
            ctx.fillRect(groupX, curY, group.totalWidth, fullH);

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(groupX, curY, group.totalWidth, fullH);

            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let titleFSize = group.key === 'percentage' ? 22 : 18;
            ctx.font = `bold ${titleFSize}px "Cairo", sans-serif`;
            const maxTextW = group.totalWidth - 6;
            while (titleFSize > 10 && ctx.measureText(group.title).width > maxTextW) {
              titleFSize -= 0.5;
              ctx.font = `bold ${titleFSize}px "Cairo", sans-serif`;
            }
            ctx.fillText(group.title, groupX + group.totalWidth / 2, curY + fullH / 2, maxTextW);
          } else {
            // عمود ممتد بارتفاع السطرين 1 و 2، وأسفله صف الدرجة العظمى (صف 3)
            const mergedH = headerRow1H + headerRow2H;
            ctx.fillStyle = headerRowGrad;
            ctx.fillRect(groupX, curY, group.totalWidth, mergedH);

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(groupX, curY, group.totalWidth, mergedH);

            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let titleFSize = group.key === 'subject' ? 18.5 : 17;
            ctx.font = `bold ${titleFSize}px "Cairo", sans-serif`;
            const maxTextW = group.totalWidth - 8;
            while (titleFSize > 10 && ctx.measureText(group.title).width > maxTextW) {
              titleFSize -= 0.5;
              ctx.font = `bold ${titleFSize}px "Cairo", sans-serif`;
            }
            ctx.fillText(group.title, groupX + group.totalWidth / 2, curY + mergedH / 2, maxTextW);

            // صف الدرجة العظمى (صف 3)
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(groupX, curY + mergedH, group.totalWidth, headerRow3H);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(groupX, curY + mergedH, group.totalWidth, headerRow3H);

            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 16px "Cairo", sans-serif';
            ctx.fillText(maxVal, groupX + group.totalWidth / 2, curY + mergedH + headerRow3H / 2);
          }
        } else {
          // عمود مقسم إلى ف 1 و ف 2
          // عنوان المجموعة في صف 1
          ctx.fillStyle = headerRowGrad;
          ctx.fillRect(groupX, curY, group.totalWidth, headerRow1H);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(groupX, curY, group.totalWidth, headerRow1H);

          ctx.direction = isEn ? 'ltr' : 'rtl';
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let gTitleFSize = 16.5;
          ctx.font = `bold ${gTitleFSize}px "Cairo", sans-serif`;
          const maxTextW = group.totalWidth - 6;
          while (gTitleFSize > 9 && ctx.measureText(group.title).width > maxTextW) {
            gTitleFSize -= 0.5;
            ctx.font = `bold ${gTitleFSize}px "Cairo", sans-serif`;
          }
          ctx.fillText(group.title, groupX + group.totalWidth / 2, curY + headerRow1H / 2, maxTextW);

          // الصف 2 (ف 1 | ف 2) والصف 3 (الدرجات العظمى)
          // يتم رسم الأعمدة الفرعية بالترتيب من اليمين لليسار: ف 1 أولاً (يمين) ثم ف 2 (يسار)
          let subCurX = currentX;
          group.subCols.forEach((subCol) => {
            const subX = subCurX - subCol.width;

            // صف 2: ف 1 / ف 2
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(subX, curY + headerRow1H, subCol.width, headerRow2H);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(subX, curY + headerRow1H, subCol.width, headerRow2H);

            ctx.direction = isEn ? 'ltr' : 'rtl';
            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 15px "Cairo", sans-serif';
            ctx.fillText(subCol.label, subX + subCol.width / 2, curY + headerRow1H + headerRow2H / 2);

            // صف 3: الدرجة العظمى
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(subX, curY + headerRow1H + headerRow2H, subCol.width, headerRow3H);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(subX, curY + headerRow1H + headerRow2H, subCol.width, headerRow3H);

            ctx.direction = 'ltr';
            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 15px "Cairo", sans-serif';
            ctx.fillText(subCol.max, subX + subCol.width / 2, curY + headerRow1H + headerRow2H + headerRow3H / 2);

            subCurX -= subCol.width;
          });
        }

        currentX -= group.totalWidth;
      });

      curY += headerRow1H + headerRow2H + headerRow3H;
    } else {
      // هيدر الفصل الأول: صفين، مع دمج عنوان حقل التقدير بارتفاع الصفين وحذف كلمة التقييم العام
      const headerRowGrad = ctx.createLinearGradient(marginX, curY, marginX + contentW, curY);
      headerRowGrad.addColorStop(0, '#e8f6fe');
      headerRowGrad.addColorStop(0.5, '#97dcfd');
      headerRowGrad.addColorStop(1, '#c8ebfd');

      const fullHeaderH = headerRow1H + headerRow2H;

      let curX = marginX + contentW;
      tableColumns.forEach((col) => {
        const cX = curX - col.width;

        if (col.key === 'spacer1') spacer1X = cX;
        if (col.key === 'spacer2') spacer2X = cX;

        if (col.key === 'spacer1' || col.key === 'spacer2') {
          // عمود فارغ بعرض 0.2 سم بحدود بيضاء
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cX, curY, col.width, fullHeaderH);
          curX -= col.width;
          return;
        }

        if (col.key === 'eval') {
          // دمج عنوان حقل التقدير بارتفاع الصفين بالكامل وحذف كلمة التقييم العام
          ctx.fillStyle = headerRowGrad;
          ctx.fillRect(cX, curY, col.width, fullHeaderH);

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cX, curY, col.width, fullHeaderH);

          ctx.direction = isEn ? 'ltr' : 'rtl';
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let evalFSize = 19;
          ctx.font = `bold ${evalFSize}px "Cairo", sans-serif`;
          const maxTextW = col.width - 12;
          while (evalFSize > 10 && ctx.measureText(col.title).width > maxTextW) {
            evalFSize -= 0.5;
            ctx.font = `bold ${evalFSize}px "Cairo", sans-serif`;
          }
          ctx.fillText(col.title, cX + col.width / 2, curY + fullHeaderH / 2, maxTextW);
        } else {
          // الصف 1: عنوان الحقل
          ctx.fillStyle = headerRowGrad;
          ctx.fillRect(cX, curY, col.width, headerRow1H);

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cX, curY, col.width, headerRow1H);

          ctx.direction = isEn ? 'ltr' : 'rtl';
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let titleFSize = col.key === 'subject' ? 18.5 : 16.5;
          ctx.font = `bold ${titleFSize}px "Cairo", sans-serif`;
          const maxTextW1 = col.width - 12;
          while (titleFSize > 10 && ctx.measureText(col.title).width > maxTextW1) {
            titleFSize -= 0.5;
            ctx.font = `bold ${titleFSize}px "Cairo", sans-serif`;
          }
          ctx.fillText(col.title, cX + col.width / 2, curY + headerRow1H / 2, maxTextW1);

          // الصف 2: الدرجة العظمى
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(cX, curY + headerRow1H, col.width, headerRow2H);

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cX, curY + headerRow1H, col.width, headerRow2H);

          if (col.max) {
            ctx.direction = 'ltr';
            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let maxFSize = 18;
            ctx.font = `bold ${maxFSize}px "Cairo", sans-serif`;
            const maxTextW2 = col.width - 12;
            while (maxFSize > 10 && ctx.measureText(col.max).width > maxTextW2) {
              maxFSize -= 0.5;
              ctx.font = `bold ${maxFSize}px "Cairo", sans-serif`;
            }
            ctx.fillText(col.max, cX + col.width / 2, curY + headerRow1H + headerRow2H / 2, maxTextW2);
          }
        }

        curX -= col.width;
      });

      curY += fullHeaderH;
    }

    // Empty white row above added subjects
    drawEmptyWhiteRow(emptyRowH);

    // دالة مساعدة لجلب قيمة الدرجة والتحقق منها
    const parseNumOrZero = (val: any): { num: number; hasVal: boolean; isAbsent: boolean } => {
      if (val === undefined || val === null || String(val).trim() === '') {
        return { num: 0, hasVal: false, isAbsent: false };
      }
      const s = String(val).trim();
      if (s === 'غ') return { num: 0, hasVal: true, isAbsent: true };
      const n = parseFloat(s.replace(',', '.'));
      if (!isNaN(n)) return { num: n, hasVal: true, isAbsent: false };
      return { num: 0, hasVal: false, isAbsent: false };
    };

    const formatCellNum = (val: any): string => {
      if (val === undefined || val === null || String(val).trim() === '') return '';
      const s = String(val).trim();
      if (s === 'غ') return 'غ';
      const n = parseFloat(s.replace(',', '.'));
      if (!isNaN(n)) {
        const rounded = Math.round(n * 10) / 10;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
      }
      return s;
    };

    // Helper to calculate student marks per subject
    const getSubjectRowCells = (subj: any, rIdx: number) => {
      const noWritten = isSubjectWithoutWrittenExam(subj, cfg?.customCols, stage);
      const noTests = isSubjectWithoutTests(subj, cfg?.customCols, stage);

      // بيانات الفصل الأول
      const itemSem1 =
        student.detailedAssessments?.['first']?.[subj.key] ||
        student.detailedAssessments?.['الفصل الدراسي الأول']?.[subj.key] ||
        student.detailedAssessments?.['الفصل الدراسي الاول']?.[subj.key];

      const notebookSem1 = itemSem1?.classNotebook ?? '';
      const homeworkSem1 = itemSem1?.homework ?? '';
      const weeklySem1 = itemSem1?.weeklyAssessment ?? '';
      const behaviorSem1 = itemSem1?.behavior ?? '';
      const researchSem1 = itemSem1?.researchProject ?? '';
      const exam1Sem1 = itemSem1?.firstMonthlyExam ?? '';
      const exam2Sem1 = itemSem1?.secondMonthlyExam ?? '';

      let writtenSem1 =
        student.writtenExams?.['first']?.[subj.key] ??
        student.writtenExams?.['الفصل الدراسي الأول']?.[subj.key] ??
        student.writtenExams?.['الفصل الدراسي الاول']?.[subj.key] ??
        '';

      // بيانات الفصل الثاني
      const itemSem2 =
        student.detailedAssessments?.['second']?.[subj.key] ||
        student.detailedAssessments?.['الفصل الدراسي الثانى']?.[subj.key] ||
        student.detailedAssessments?.['الفصل الدراسي الثاني']?.[subj.key];

      const notebookSem2 = itemSem2?.classNotebook ?? '';
      const homeworkSem2 = itemSem2?.homework ?? '';
      const weeklySem2 = itemSem2?.weeklyAssessment ?? '';
      const behaviorSem2 = itemSem2?.behavior ?? '';
      const researchSem2 = itemSem2?.researchProject ?? '';
      const exam1Sem2 = itemSem2?.firstMonthlyExam ?? '';
      const exam2Sem2 = itemSem2?.secondMonthlyExam ?? '';

      let writtenSem2 =
        student.writtenExams?.['second']?.[subj.key] ??
        student.writtenExams?.['الفصل الدراسي الثانى']?.[subj.key] ??
        student.writtenExams?.['الفصل الدراسي الثاني']?.[subj.key] ??
        '';

      // لطلاب المنازل (إعدادي أو ثانوي): إذا كانت درجة التحريري غير مسجلة في writtenExams ولكن مسجلة في assessments، استرجاعها كدرجة تحريري
      if (isMiddleOrSecHomeschool || isStudentHomeschool) {
        if (!writtenSem1 || String(writtenSem1).trim() === '') {
          const fbAssess1 = student.assessments?.['first']?.[subj.key] ??
            student.assessments?.['الفصل الدراسي الأول']?.[subj.key] ??
            student.assessments?.['الفصل الدراسي الاول']?.[subj.key];
          if (fbAssess1 !== undefined && fbAssess1 !== null && String(fbAssess1).trim() !== '') {
            writtenSem1 = String(fbAssess1).trim();
          }
        }
        if (!writtenSem2 || String(writtenSem2).trim() === '') {
          const fbAssess2 = student.assessments?.['second']?.[subj.key] ??
            student.assessments?.['الفصل الدراسي الثانى']?.[subj.key] ??
            student.assessments?.['الفصل الدراسي الثاني']?.[subj.key];
          if (fbAssess2 !== undefined && fbAssess2 !== null && String(fbAssess2).trim() !== '') {
            writtenSem2 = String(fbAssess2).trim();
          }
        }
      }

      // احتساب مجموع تقييمات الفصل الأول
      let numericAssessSem1 = 0;
      let hasAssessSem1 = false;
      const totalAssessStr1 = itemSem1?.total ?? '';
      if (!isMiddleOrSecHomeschool && !isStudentHomeschool) {
        if (totalAssessStr1 !== '' && totalAssessStr1 !== 'غ') {
          const n = parseFloat(String(totalAssessStr1).replace(',', '.'));
          if (!isNaN(n)) { numericAssessSem1 = n; hasAssessSem1 = true; }
        } else if (noWritten) {
          // المواد التي ليس لها امتحان تحريري (بما فيها التربية الرياضية)
          const isPESubj = subj.key === 'pe' || subj.key === 'physical_education' || subj.label?.includes('رياضية') || subj.label?.includes('بدنية');
          if (isPESubj) {
            const p = parseNumOrZero(itemSem1?.physicalSkillDomain);
            const c = parseNumOrZero(itemSem1?.cognitiveDomain);
            const a = parseNumOrZero(itemSem1?.affectiveBehavioralDomain);
            const s = parseNumOrZero(itemSem1?.sportsUniformAttendance ?? itemSem1?.behavior);
            if (p.hasVal || c.hasVal || a.hasVal || s.hasVal) {
              numericAssessSem1 = p.num + c.num + a.num + s.num;
              hasAssessSem1 = true;
            }
          } else {
            const p = parseNumOrZero(itemSem1?.practicalPerformance);
            const c = parseNumOrZero(itemSem1?.classActivities);
            const b = parseNumOrZero(itemSem1?.behavior);
            if (p.hasVal || c.hasVal || b.hasVal) {
              numericAssessSem1 = p.num + c.num + b.num;
              hasAssessSem1 = true;
            }
          }
        } else {
          const compParts1 = isSecondary2Modern
            ? [weeklySem1, researchSem1, homeworkSem1, behaviorSem1, exam1Sem1, exam2Sem1]
            : isMiddleOrSecondaryStage
            ? [homeworkSem1, weeklySem1, behaviorSem1, exam1Sem1, exam2Sem1]
            : [notebookSem1, homeworkSem1, weeklySem1, behaviorSem1, exam1Sem1, exam2Sem1];
          let cSum = 0;
          for (const p of compParts1) {
            const s = String(p || '').trim();
            if (s && s !== 'غ') {
              const num = parseFloat(s.replace(',', '.'));
              if (!isNaN(num)) { cSum += num; hasAssessSem1 = true; }
            }
          }
          numericAssessSem1 = cSum;
        }
        if (!hasAssessSem1) {
          const fb1 = student.assessments?.['first']?.[subj.key] ??
            student.assessments?.['الفصل الدراسي الأول']?.[subj.key] ??
            student.assessments?.['الفصل الدراسي الاول']?.[subj.key];
          if (fb1 !== undefined && fb1 !== null && fb1 !== '' && fb1 !== 'غ') {
            const num = parseFloat(String(fb1).replace(',', '.'));
            if (!isNaN(num)) { numericAssessSem1 = num; hasAssessSem1 = true; }
          }
        }
      }

      // تحريري الفصل الأول
      const parsedWrittenSem1 = parseNumOrZero(writtenSem1);
      const fb1Raw = student.assessments?.['first']?.[subj.key] ?? student.assessments?.['الفصل الدراسي الأول']?.[subj.key];
      const isAbsentSem1 = (noWritten && (totalAssessStr1 === 'غ' || fb1Raw === 'غ')) ||
        (!noWritten && (
          (isMiddleOrSecHomeschool || isStudentHomeschool)
            ? (writtenSem1 === 'غ')
            : ((totalAssessStr1 === 'غ' && (!writtenSem1 || writtenSem1 === 'غ')) ||
               (writtenSem1 === 'غ' && (!totalAssessStr1 || totalAssessStr1 === 'غ')))
        ));

      // مجموع الفصل الأول ف 1
      let totalSem1Str = '';
      let numericTotalSem1 = 0;
      let hasSem1Total = false;
      if (isSecondary2Modern) {
        if (totalAssessStr1 === 'غ' || (isAbsentSem1 && !hasAssessSem1)) {
          totalSem1Str = 'غ';
        } else if (hasAssessSem1 || totalAssessStr1) {
          numericTotalSem1 = numericAssessSem1;
          hasSem1Total = true;
          const r1 = Math.round(numericTotalSem1 * 10) / 10;
          totalSem1Str = totalAssessStr1 || (Number.isInteger(r1) ? String(r1) : r1.toFixed(1));
        }
      } else if (isAbsentSem1) {
        totalSem1Str = 'غ';
      } else if (hasAssessSem1 || (!noWritten && parsedWrittenSem1.hasVal)) {
        numericTotalSem1 = numericAssessSem1 + (noWritten ? 0 : parsedWrittenSem1.num);
        hasSem1Total = true;
        const r1 = Math.round(numericTotalSem1 * 10) / 10;
        totalSem1Str = Number.isInteger(r1) ? String(r1) : r1.toFixed(1);
      }

      // احتساب مجموع تقييمات الفصل الثاني
      let numericAssessSem2 = 0;
      let hasAssessSem2 = false;
      const totalAssessStr2 = itemSem2?.total ?? '';
      if (!isMiddleOrSecHomeschool && !isStudentHomeschool) {
        if (totalAssessStr2 !== '' && totalAssessStr2 !== 'غ') {
          const n = parseFloat(String(totalAssessStr2).replace(',', '.'));
          if (!isNaN(n)) { numericAssessSem2 = n; hasAssessSem2 = true; }
        } else if (noWritten) {
          const isPESubj = subj.key === 'pe' || subj.key === 'physical_education' || subj.label?.includes('رياضية') || subj.label?.includes('بدنية');
          if (isPESubj) {
            const p = parseNumOrZero(itemSem2?.physicalSkillDomain);
            const c = parseNumOrZero(itemSem2?.cognitiveDomain);
            const a = parseNumOrZero(itemSem2?.affectiveBehavioralDomain);
            const s = parseNumOrZero(itemSem2?.sportsUniformAttendance ?? itemSem2?.behavior);
            if (p.hasVal || c.hasVal || a.hasVal || s.hasVal) {
              numericAssessSem2 = p.num + c.num + a.num + s.num;
              hasAssessSem2 = true;
            }
          } else {
            const p = parseNumOrZero(itemSem2?.practicalPerformance);
            const c = parseNumOrZero(itemSem2?.classActivities);
            const b = parseNumOrZero(itemSem2?.behavior);
            if (p.hasVal || c.hasVal || b.hasVal) {
              numericAssessSem2 = p.num + c.num + b.num;
              hasAssessSem2 = true;
            }
          }
        } else {
          const compParts2 = isSecondary2Modern
            ? [weeklySem2, researchSem2, homeworkSem2, behaviorSem2, exam1Sem2, exam2Sem2]
            : isMiddleOrSecondaryStage
            ? [homeworkSem2, weeklySem2, behaviorSem2, exam1Sem2, exam2Sem2]
            : [notebookSem2, homeworkSem2, weeklySem2, behaviorSem2, exam1Sem2, exam2Sem2];
          let cSum = 0;
          for (const p of compParts2) {
            const s = String(p || '').trim();
            if (s && s !== 'غ') {
              const num = parseFloat(s.replace(',', '.'));
              if (!isNaN(num)) { cSum += num; hasAssessSem2 = true; }
            }
          }
          numericAssessSem2 = cSum;
        }
        if (!hasAssessSem2) {
          const fb2 = student.assessments?.['second']?.[subj.key] ??
            student.assessments?.['الفصل الدراسي الثانى']?.[subj.key] ??
            student.assessments?.['الفصل الدراسي الثاني']?.[subj.key];
          if (fb2 !== undefined && fb2 !== null && fb2 !== '' && fb2 !== 'غ') {
            const num = parseFloat(String(fb2).replace(',', '.'));
            if (!isNaN(num)) { numericAssessSem2 = num; hasAssessSem2 = true; }
          }
        }
      }

      // تحريري الفصل الثاني
      const parsedWrittenSem2 = parseNumOrZero(writtenSem2);
      const fb2Raw = student.assessments?.['second']?.[subj.key] ?? student.assessments?.['الفصل الدراسي الثانى']?.[subj.key];
      const isAbsentSem2 = (noWritten && (totalAssessStr2 === 'غ' || fb2Raw === 'غ')) ||
        (!noWritten && (
          (isMiddleOrSecHomeschool || isStudentHomeschool)
            ? (writtenSem2 === 'غ')
            : ((totalAssessStr2 === 'غ' && (!writtenSem2 || writtenSem2 === 'غ')) ||
               (writtenSem2 === 'غ' && (!totalAssessStr2 || totalAssessStr2 === 'غ')))
        ));

      // مجموع الفصل الثاني ف 2
      let totalSem2Str = '';
      let numericTotalSem2 = 0;
      let hasSem2Total = false;
      if (isSecondary2Modern) {
        if (totalAssessStr2 === 'غ' || (isAbsentSem2 && !hasAssessSem2)) {
          totalSem2Str = 'غ';
        } else if (hasAssessSem2 || totalAssessStr2) {
          numericTotalSem2 = numericAssessSem2;
          hasSem2Total = true;
          const r2 = Math.round(numericTotalSem2 * 10) / 10;
          totalSem2Str = totalAssessStr2 || (Number.isInteger(r2) ? String(r2) : r2.toFixed(1));
        }
      } else if (isAbsentSem2) {
        totalSem2Str = 'غ';
      } else if (hasAssessSem2 || (!noWritten && parsedWrittenSem2.hasVal)) {
        numericTotalSem2 = numericAssessSem2 + (noWritten ? 0 : parsedWrittenSem2.num);
        hasSem2Total = true;
        const r2 = Math.round(numericTotalSem2 * 10) / 10;
        totalSem2Str = Number.isInteger(r2) ? String(r2) : r2.toFixed(1);
      }

      // الدرجة الفعلية = (مجموع ف 1 + مجموع ف 2) / 2 (أو وفق النهاية الكبرى الفعلية للمرحلة الإعدادية)
      let actualGradeStr = '';
      let pctStr = '';
      let evalLabel = '-';
      const subjMax = subj.maxGrade || 100;
      const middleActualMax = isMiddleStage ? getMiddleActualMax(subj) : subjMax;
      const sec2ActualMax = isSec2 ? getSecondary2ActualMax(subj) : subjMax;
      const secondaryActualMax = isSecondaryStage ? (isSec2 ? sec2ActualMax : (subj.actualMaxGrade || subjMax)) : subjMax;
      const effectiveActualMax = isMiddleStage ? middleActualMax : (isSecondaryStage ? secondaryActualMax : subjMax);

      if (isAbsentSem1 && isAbsentSem2) {
        actualGradeStr = 'غ';
        pctStr = '0';
        evalLabel = 'غائب';
      } else if (hasSem1Total || hasSem2Total) {
        // مجموع الفصلين للدرجة الفعلية
        let combinedSum = numericTotalSem1 + numericTotalSem2;

        // الدرجة الفعلية للطالب = (مجموع درجات الطالب * الدرجة الفعلية للمادة الدراسية) / 200
        const actualMaxForFormula = isMiddleStage ? middleActualMax : (isSecondaryStage ? secondaryActualMax : subjMax);
        const studentActualScore = Math.round(((combinedSum * actualMaxForFormula) / 200) * 10) / 10;
        actualGradeStr = Number.isInteger(studentActualScore) ? String(studentActualScore) : studentActualScore.toFixed(1);

        let pct = subjMax > 0 ? (combinedSum / subjMax) * 100 : 0;
        if (isPrimaryStage) {
          // فى المرحلة الابتدائية فى ملف شهادات الفصل الدراسي الثانى فى خلايا حقل النسبة المئوية اقسم القيمة / 2
          pct = pct / 2;
        } else if (isMiddleStage) {
          // فى المرحلة الاعدادية منتظمين فى شهادات الفصل الدراسي الثانى فى حقل النسبة المئوية:
          // اجعل قيمة خلايا الحقل = درجة الطالب الفعلية التى حصل عليها * 100 / الدرجة الفعلية للمادة الدراسية
          pct = middleActualMax > 0 ? (studentActualScore * 100) / middleActualMax : 0;
        } else if (isSecondaryStage) {
          // فى المرحلة الثانوية فى شهادات الفصل الدراسي الثانى فى حقل النسبة المئوية:
          // اجعل قيمة خلايا الحقل = درجة الطالب الفعلية التى حصل عليها * 100 / الدرجة الفعلية للمادة الدراسية
          pct = secondaryActualMax > 0 ? (studentActualScore * 100) / secondaryActualMax : 0;
        }
        const rPct = Math.round(pct * 10) / 10;
        pctStr = Number.isInteger(rPct) ? String(rPct) : rPct.toFixed(1);
        evalLabel = getEvaluationLabel(pct);
      }

      // التحقق من مواد الاجتياز (مثل المواد غير التحريرية، التربية الدينية، التربية الرياضية)
      const isPassFail = subj.learningOutcomesType === 'pass_fail' || noWritten;
      if (isPassFail && evalLabel !== '-' && evalLabel !== 'غائب' && evalLabel !== 'Abs') {
        const rawActual = parseFloat(actualGradeStr.replace(',', '.'));
        if (!isNaN(rawActual)) {
          const passMax = effectiveActualMax;
          const pct = passMax > 0 ? (rawActual / passMax) * 100 : 0;
          evalLabel = pct >= (subj.key === 'religion' ? 70 : 50)
            ? (isEn ? 'Pass' : 'اجتاز')
            : (isEn ? 'Fail' : 'لم يجتز');
        }
      }

      // Zebra colors
      const isOdd = rIdx % 2 !== 0;
      const cellBg = isOdd ? oddBg : evenBg;
      const isThemeDark = activeRowTheme === 'theme_black' || activeRowTheme === 'theme_red';
      const cellTextColor = isThemeDark && isOdd ? '#ffffff' : '#0f172a';

      // Trim label safely and balance font size for English (max 30 chars with spaces around brackets)
      const rawLabel = String(subj.label || '');
      let subjectName = rawLabel;
      if (isEn) {
        let enName = (getStoredSubjectEn(subj.key, subj.label) || rawLabel).trim();
        // وضع مسافات قبل وبعد الأقواس
        enName = enName.replace(/\s*\(\s*/g, ' ( ').replace(/\s*\)\s*/g, ' ) ');
        // التحديد بـ 30 حرف كحد أقصى لضمان توازن أحجام الخطوط
        if (enName.length > 30) {
          if (subj.key === 'ict' || enName.includes('ICT')) {
            enName = 'Info & Comm Tech ( ICT )';
          } else {
            enName = enName.slice(0, 30).trim();
          }
        }
        subjectName = enName;
      } else {
        subjectName = rawLabel.length > 25 ? rawLabel.slice(0, 25) : rawLabel;
      }

      // احتساب الشروط للدائرة الحمراء وفق توجيهات المستخدم:
      // 1. فى الفصل الدراسي الاول: حقل المجموع المواد الاقل من 50 %
      const isReligion = subj.key === 'religion' || (subj.label && subj.label.includes('دين'));
      const parsedTotalSem1 = parseNumOrZero(totalSem1Str);
      const isSem1TotalFail = (
        (parsedTotalSem1.hasVal && !parsedTotalSem1.isAbsent && subjMax > 0 && ((parsedTotalSem1.num / subjMax) * 100 < 50 || (isReligion && (parsedTotalSem1.num / subjMax) * 100 < 70))) ||
        parsedTotalSem1.isAbsent
      );

      // 2. فى الفصل الدراسي الثانى: حقل الدرجة الفعلية المواد الاقل من 50 %
      const parsedActual = parseNumOrZero(actualGradeStr);
      const isActualFail = (
        (parsedActual.hasVal && !parsedActual.isAbsent && effectiveActualMax > 0 && ((parsedActual.num / effectiveActualMax) * 100 < 50 || (isReligion && (parsedActual.num / effectiveActualMax) * 100 < 70))) ||
        parsedActual.isAbsent
      );

      // 3. فى الفصل الدراسي الثانى: حقل الامتحان التحريرى ف 2 والتى لا توافق النسبة الادنى للنجاح فى الامتحان التحريرى فى الفصل الدراسي الثانى المواد
      const maxWrittenVal = subj.hasWrittenExam !== false
        ? (subj.maxWrittenGrade !== undefined ? subj.maxWrittenGrade : (stage === 'primary' ? 60 : 30))
        : 0;
      const rawMinW = subj.minPassPercentage !== undefined ? subj.minPassPercentage : (stage === 'secondary' ? 25 : 30);
      const minWrittenPass = (rawMinW === 70 || rawMinW === 10 || rawMinW === 7.2 || rawMinW === undefined)
        ? (stage === 'secondary' ? 25 : 30)
        : rawMinW;

      const parsedWritten2 = parseNumOrZero(writtenSem2);
      const isWritten2Fail = !noWritten && (
        (parsedWritten2.hasVal && !parsedWritten2.isAbsent && maxWrittenVal > 0 && (parsedWritten2.num / maxWrittenVal) * 100 < minWrittenPass) ||
        parsedWritten2.isAbsent
      );

      if (isSecondSemNonKg) {
        if (isSecondary2Modern) {
          return [
            { text: subjectName, width: 280, fontSize: 18, bg: cellBg, textColor: cellTextColor },
            // عمود فارغ بعد حقل اسم المواد بعرض 0.2 سم (12 px)
            { text: '', width: spacer1Width, isSpacer: true, bg: '#ffffff' },
            // التقييم الأسبوعي
            { text: noWritten ? '-' : formatCellNum(weeklySem1), width: 72, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            { text: noWritten ? '-' : formatCellNum(weeklySem2), width: 72, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            // المشروع البحثي
            { text: noWritten ? '-' : formatCellNum(researchSem1), width: 72, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            { text: noWritten ? '-' : formatCellNum(researchSem2), width: 72, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            // الحصة والواجبات
            { text: noWritten ? '-' : formatCellNum(homeworkSem1), width: 78, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            { text: noWritten ? '-' : formatCellNum(homeworkSem2), width: 78, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            // السلوك والمواظبة
            { text: noWritten ? '-' : formatCellNum(behaviorSem1), width: 68, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            { text: noWritten ? '-' : formatCellNum(behaviorSem2), width: 68, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            // الاختبار الاول
            { text: (noWritten || noTests) ? '-' : formatCellNum(exam1Sem1), width: 72, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            { text: (noWritten || noTests) ? '-' : formatCellNum(exam1Sem2), width: 72, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            // الاختبار الثانى
            { text: (noWritten || noTests) ? '-' : formatCellNum(exam2Sem1), width: 72, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            { text: (noWritten || noTests) ? '-' : formatCellNum(exam2Sem2), width: 72, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            // عمود فارغ قبل حقل المجموع بعرض 0.2 سم (12 px)
            { text: '', width: spacer2Width, isSpacer: true, bg: '#ffffff' },
            // المجموع
            { text: totalSem1Str, width: 78, fontSize: 17, isBold: true, bg: cellBg, textColor: cellTextColor },
            { text: totalSem2Str, width: 78, fontSize: 17, isBold: true, bg: cellBg, textColor: cellTextColor },
            // درجة الطالب
            {
              text: actualGradeStr,
              width: 124,
              fontSize: 17,
              isBold: true,
              bg: cellBg,
              textColor: cellTextColor,
              hasRedCircle: isActualFail,
            },
            // النسبة المئوية (%) (عرض 76 px)
            { text: pctStr ? `${pctStr}%` : '', width: 76, fontSize: 16.5, isBold: true, bg: cellBg, textColor: cellTextColor },
            // التقدير (عرض 130 px)
            { text: evalLabel, width: 130, fontSize: 17, isBold: true, bg: cellBg, textColor: cellTextColor },
          ];
        }

        if (isMiddleOrSecondaryStage) {
          // للمرحلة الإعدادية والثانوية فقط: حذف حقل كراسة الحصة من الجدول
          return [
            { text: subjectName, width: 292, fontSize: 18, bg: cellBg, textColor: cellTextColor },
            // عمود فارغ بعد حقل اسم المواد بعرض 0.2 سم (12 px)
            { text: '', width: spacer1Width, isSpacer: true, bg: '#ffffff' },
            // كراسة الواجب
            { text: (noWritten || isMiddleOrSecHomeschool) ? '-' : formatCellNum(homeworkSem1), width: 68, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            { text: (noWritten || isMiddleOrSecHomeschool) ? '-' : formatCellNum(homeworkSem2), width: 68, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            // التقييم الأسبوعى
            { text: (noWritten || isMiddleOrSecHomeschool) ? '-' : formatCellNum(weeklySem1), width: 78, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            { text: (noWritten || isMiddleOrSecHomeschool) ? '-' : formatCellNum(weeklySem2), width: 78, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            // السلوك والمواظبة (موسع)
            { text: (noWritten || isMiddleOrSecHomeschool) ? '-' : formatCellNum(behaviorSem1), width: 82, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            { text: (noWritten || isMiddleOrSecHomeschool) ? '-' : formatCellNum(behaviorSem2), width: 82, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            // الاختبار الاول
            { text: (noWritten || noTests || isMiddleOrSecHomeschool) ? '-' : formatCellNum(exam1Sem1), width: 70, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            { text: (noWritten || noTests || isMiddleOrSecHomeschool) ? '-' : formatCellNum(exam1Sem2), width: 70, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            // الاختبار الثانى
            { text: (noWritten || noTests || isMiddleOrSecHomeschool) ? '-' : formatCellNum(exam2Sem1), width: 70, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            { text: (noWritten || noTests || isMiddleOrSecHomeschool) ? '-' : formatCellNum(exam2Sem2), width: 70, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            // الامتحان التحريرى
            { text: noWritten ? '-' : formatCellNum(writtenSem1), width: 74, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
            { text: noWritten ? '-' : formatCellNum(writtenSem2), width: 74, fontSize: 16.5, bg: cellBg, textColor: cellTextColor, hasRedCircle: isWritten2Fail },
            // عمود فارغ قبل حقل المجموع بعرض 0.2 سم (12 px)
            { text: '', width: spacer2Width, isSpacer: true, bg: '#ffffff' },
            // المجموع
            { text: totalSem1Str, width: 75, fontSize: 17, isBold: true, bg: cellBg, textColor: cellTextColor },
            { text: totalSem2Str, width: 75, fontSize: 17, isBold: true, bg: cellBg, textColor: cellTextColor },
            // درجة الطالب / الدرجة الفعلية (فى المرحلة الإعدادية والثانوية الصف الثاني: قسمة خلايا الحقل إلى خليتين: الأولى درجة الطالب، والثانية الدرجة الفعلية للمادة)
            ...(isMiddleStage || isSec2
              ? [
                  // الخلية الأولى: درجة الطالب (مثال 73.6)
                  {
                    text: actualGradeStr,
                    width: 60,
                    fontSize: 17,
                    isBold: true,
                    bg: cellBg,
                    textColor: cellTextColor,
                    hasRedCircle: isActualFail,
                  },
                  // الخلية الثانية: الدرجة الفعلية للمادة الدراسية (مثال 80)
                  {
                    text: String(isMiddleStage ? middleActualMax : sec2ActualMax),
                    width: 60,
                    fontSize: 17,
                    isBold: true,
                    bg: cellBg,
                    textColor: cellTextColor,
                  },
                ]
              : [
                  {
                    text: actualGradeStr,
                    width: 120,
                    fontSize: 18,
                    isBold: true,
                    bg: cellBg,
                    textColor: cellTextColor,
                    hasRedCircle: isActualFail,
                  },
                ]),
            // النسبة المئوية (%) (عرض 68 px مع دمج العنوان)
            { text: pctStr ? `${pctStr}%` : '', width: 68, fontSize: 16.5, isBold: true, bg: cellBg, textColor: cellTextColor },
            // التقدير (عرض 120 px مع دمج الهيدر)
            { text: evalLabel, width: 120, fontSize: 17, isBold: true, bg: cellBg, textColor: cellTextColor },
          ];
        }

        // للمرحلة الابتدائية (تتضمن كراسة الحصة):
        return [
          { text: subjectName, width: 272, fontSize: 18, bg: cellBg, textColor: cellTextColor },
          // عمود فارغ بعد حقل اسم المواد بعرض 0.2 سم (12 px)
          { text: '', width: spacer1Width, isSpacer: true, bg: '#ffffff' },
          // كراسة الحصة
          { text: noWritten ? '-' : formatCellNum(notebookSem1), width: 58, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          { text: noWritten ? '-' : formatCellNum(notebookSem2), width: 58, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          // كراسة الواجب
          { text: noWritten ? '-' : formatCellNum(homeworkSem1), width: 58, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          { text: noWritten ? '-' : formatCellNum(homeworkSem2), width: 58, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          // التقييم الأسبوعى
          { text: noWritten ? '-' : formatCellNum(weeklySem1), width: 68, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          { text: noWritten ? '-' : formatCellNum(weeklySem2), width: 68, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          // السلوك والمواظبة (موسع)
          { text: noWritten ? '-' : formatCellNum(behaviorSem1), width: 75, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          { text: noWritten ? '-' : formatCellNum(behaviorSem2), width: 75, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          // الاختبار الاول
          { text: (noWritten || noTests) ? '-' : formatCellNum(exam1Sem1), width: 64, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          { text: (noWritten || noTests) ? '-' : formatCellNum(exam1Sem2), width: 64, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          // الاختبار الثانى
          { text: (noWritten || noTests) ? '-' : formatCellNum(exam2Sem1), width: 64, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          { text: (noWritten || noTests) ? '-' : formatCellNum(exam2Sem2), width: 64, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          // الامتحان التحريرى
          { text: noWritten ? '-' : formatCellNum(writtenSem1), width: 68, fontSize: 16.5, bg: cellBg, textColor: cellTextColor },
          { text: noWritten ? '-' : formatCellNum(writtenSem2), width: 68, fontSize: 16.5, bg: cellBg, textColor: cellTextColor, hasRedCircle: isWritten2Fail },
          // عمود فارغ قبل حقل المجموع بعرض 0.2 سم (12 px)
          { text: '', width: spacer2Width, isSpacer: true, bg: '#ffffff' },
          // المجموع
          { text: totalSem1Str, width: 72, fontSize: 17, isBold: true, bg: cellBg, textColor: cellTextColor },
          { text: totalSem2Str, width: 72, fontSize: 17, isBold: true, bg: cellBg, textColor: cellTextColor },
          // الدرجة الفعلية
          { text: actualGradeStr, width: 120, fontSize: 18, isBold: true, bg: cellBg, textColor: cellTextColor, hasRedCircle: isActualFail },
          // النسبة المئوية (%) (عرض 68 px مع دمج العنوان)
          { text: pctStr ? `${pctStr}%` : '', width: 68, fontSize: 16.5, isBold: true, bg: cellBg, textColor: cellTextColor },
          // التقدير (عرض 120 px مع دمج الهيدر)
          { text: evalLabel, width: 120, fontSize: 17, isBold: true, bg: cellBg, textColor: cellTextColor },
        ];
      }

      // في الفصل الأول:
      if (isSecondary2Modern) {
        return [
          { text: subjectName, width: 266, fontSize: 18, bg: cellBg, textColor: cellTextColor },
          // عمود فارغ بعد حقل اسم المواد بعرض 0.2 سم (12 px)
          { text: '', width: spacer1Width, isSpacer: true, bg: '#ffffff' },
          { text: noWritten ? '-' : (String(weeklySem1) || ''), width: 150, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
          { text: noWritten ? '-' : (String(researchSem1) || ''), width: 150, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
          { text: noWritten ? '-' : (String(homeworkSem1) || ''), width: 175, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
          { text: noWritten ? '-' : (String(behaviorSem1) || ''), width: 140, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
          { text: (noWritten || noTests) ? '-' : (String(exam1Sem1) || ''), width: 150, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
          { text: (noWritten || noTests) ? '-' : (String(exam2Sem1) || ''), width: 150, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
          // عمود فارغ قبل حقل المجموع بعرض 0.2 سم (12 px)
          { text: '', width: spacer2Width, isSpacer: true, bg: '#ffffff' },
          { text: totalSem1Str, width: 175, fontSize: 20, isBold: true, bg: cellBg, textColor: cellTextColor, hasRedCircle: isSem1TotalFail },
          { text: evalLabel, width: 178, fontSize: 18, isBold: true, bg: cellBg, textColor: cellTextColor },
        ];
      }

      if (isMiddleOrSecondaryStage) {
        return [
          { text: subjectName, width: 266, fontSize: 18, bg: cellBg, textColor: cellTextColor },
          // عمود فارغ بعد حقل اسم المواد بعرض 0.2 سم (12 px)
          { text: '', width: spacer1Width, isSpacer: true, bg: '#ffffff' },
          { text: (noWritten || isMiddleOrSecHomeschool) ? '-' : (String(homeworkSem1) || (isMiddleOrSecHomeschool ? '-' : '')), width: 165, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
          { text: (noWritten || isMiddleOrSecHomeschool) ? '-' : (String(weeklySem1) || (isMiddleOrSecHomeschool ? '-' : '')), width: 175, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
          { text: (noWritten || isMiddleOrSecHomeschool) ? '-' : (String(behaviorSem1) || (isMiddleOrSecHomeschool ? '-' : '')), width: 165, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
          { text: (noWritten || noTests || isMiddleOrSecHomeschool) ? '-' : (String(exam1Sem1) || (isMiddleOrSecHomeschool ? '-' : '')), width: 175, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
          { text: (noWritten || noTests || isMiddleOrSecHomeschool) ? '-' : (String(exam2Sem1) || (isMiddleOrSecHomeschool ? '-' : '')), width: 169, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
          { text: noWritten ? '-' : String(writtenSem1), width: 179, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
          // عمود فارغ قبل حقل المجموع بعرض 0.2 سم (12 px)
          { text: '', width: spacer2Width, isSpacer: true, bg: '#ffffff' },
          { text: totalSem1Str, width: 170, fontSize: 20, isBold: true, bg: cellBg, textColor: cellTextColor, hasRedCircle: isSem1TotalFail },
          { text: evalLabel, width: 170, fontSize: 18, isBold: true, bg: cellBg, textColor: cellTextColor },
        ];
      }

      return [
        { text: subjectName, width: 226, fontSize: 18, bg: cellBg, textColor: cellTextColor },
        // عمود فارغ بعد حقل اسم المواد بعرض 0.2 سم (12 px)
        { text: '', width: spacer1Width, isSpacer: true, bg: '#ffffff' },
        { text: noWritten ? '-' : String(notebookSem1), width: 135, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
        { text: noWritten ? '-' : String(homeworkSem1), width: 135, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
        { text: noWritten ? '-' : String(weeklySem1), width: 165, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
        { text: noWritten ? '-' : String(behaviorSem1), width: 159, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
        { text: (noWritten || noTests) ? '-' : String(exam1Sem1), width: 160, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
        { text: (noWritten || noTests) ? '-' : String(exam2Sem1), width: 160, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
        { text: noWritten ? '-' : String(writtenSem1), width: 164, fontSize: 18.5, bg: cellBg, textColor: cellTextColor },
        // عمود فارغ قبل حقل المجموع بعرض 0.2 سم (12 px)
        { text: '', width: spacer2Width, isSpacer: true, bg: '#ffffff' },
        { text: totalSem1Str, width: 160, fontSize: 20, isBold: true, bg: cellBg, textColor: cellTextColor, hasRedCircle: isSem1TotalFail },
        { text: evalLabel, width: 170, fontSize: 18, isBold: true, bg: cellBg, textColor: cellTextColor },
      ];
    };

    // للمرحلة الابتدائية فقط فى شهادة درجات وتقييمات (الفصل الدراسي الأول والثاني):
    // استبدال نص المواد المضافة للمجموع ليصبح:
    // « المواد المضافة للمجموع - يحسب مجموع درجات المادة الدراسية بالدرجة الأعلى فى الاختبارين »
    const primaryExamSubNote = stage === 'primary'
      ? (isEn ? ' - The highest score of both exams is counted' : ' - يحسب مجموع درجات المادة الدراسية بالدرجة الأعلى فى الاختبارين')
      : undefined;

    // Section 1: المواد المضافة للمجموع
    drawSpanningSection(
      isEn ? 'Basic Subjects ( Added to Total )' : 'المواد المضافة للمجموع',
      sectionHeaderH,
      undefined,
      primaryExamSubNote
    );
    addedSubjects.forEach((subj, idx) => {
      drawRowCells(getSubjectRowCells(subj, idx), dataRowH);
    });

    // Empty white row above non-added subjects
    drawEmptyWhiteRow(emptyRowH);

    // Section 2: المواد الغير مضافة للمجموع
    drawSpanningSection(isEn ? 'Activities & Non - Added Subjects ( Not Added to Total )' : 'المواد الغير مضافة للمجموع', sectionHeaderH);
    nonAddedSubjects.forEach((subj, idx) => {
      drawRowCells(getSubjectRowCells(subj, idx), dataRowH);
    });

    // رسم الحقول الفارغة (عمود فارغ بعرض 0.2 سم بعد اسم المواد وقبل المجموع بحدود داخلية بيضاء)
    [
      { x: spacer1X, w: spacer1Width },
      { x: spacer2X, w: spacer2Width },
    ].forEach((sp) => {
      if (sp.x > 0 && sp.w > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sp.x, tableTopY, sp.w, tableTotalH);

        // رسم الحدود الرأسية الفاصلة على اليمين واليسار
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sp.x + sp.w, tableTopY);
        ctx.lineTo(sp.x + sp.w, tableTopY + tableTotalH);
        ctx.moveTo(sp.x, tableTopY);
        ctx.lineTo(sp.x, tableTopY + tableTotalH);
        ctx.stroke();
      }
    });

    ctx.restore();

    // Outer table rounded border (16px)
    drawRoundedRect(ctx, marginX, tableTopY, contentW, tableTotalH, 16);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // جعل لون حدود الجدول الخارجية في هذا الحقل باللون الأبيض (في الأعلى والأسفل)
    [
      { x: spacer1X, w: spacer1Width },
      { x: spacer2X, w: spacer2Width },
    ].forEach((sp) => {
      if (sp.x > 0 && sp.w > 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;

        // الحد العلوي الخارجي باللون الأبيض
        ctx.beginPath();
        ctx.moveTo(sp.x + 0.5, tableTopY);
        ctx.lineTo(sp.x + sp.w - 0.5, tableTopY);
        ctx.stroke();

        // الحد السفلي الخارجي باللون الأبيض
        ctx.beginPath();
        ctx.moveTo(sp.x + 0.5, tableTopY + tableTotalH);
        ctx.lineTo(sp.x + sp.w - 0.5, tableTopY + tableTotalH);
        ctx.stroke();
      }
    });

    // Redraw horizontal divider borders for empty rows
    emptyWhiteRowYs.forEach(({ y, h }) => {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(marginX, y);
      ctx.lineTo(marginX + contentW, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(marginX, y + h);
      ctx.lineTo(marginX + contentW, y + h);
      ctx.stroke();

      // Right & Left borders in white
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;

      ctx.beginPath();
      ctx.moveTo(marginX + contentW, y + 0.5);
      ctx.lineTo(marginX + contentW, y + h - 0.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(marginX, y + 0.5);
      ctx.lineTo(marginX, y + h - 0.5);
      ctx.stroke();
    });

    // قفل الفراغات المشار إليها في المرفق باللون الأسود عند زوايا التقاطع الأربعة
    emptyWhiteRowYs.forEach(({ y: ey, h: eh }) => {
      [
        { x: spacer1X, w: spacer1Width },
        { x: spacer2X, w: spacer2Width },
      ].forEach((sp) => {
        if (sp.x > 0 && sp.w > 0) {
          // مساحة التقاطع الداخلية بيضاء نقية
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sp.x + 0.5, ey + 0.5, sp.w - 1, eh - 1);

          // إزالة أي خطوط داخلية عبر التقاطع
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sp.x + 0.75, ey);
          ctx.lineTo(sp.x + sp.w - 0.75, ey);
          ctx.moveTo(sp.x + 0.75, ey + eh);
          ctx.lineTo(sp.x + sp.w - 0.75, ey + eh);
          ctx.moveTo(sp.x + sp.w, ey + 0.75);
          ctx.lineTo(sp.x + sp.w, ey + eh - 0.75);
          ctx.moveTo(sp.x, ey + 0.75);
          ctx.lineTo(sp.x, ey + eh - 0.75);
          ctx.stroke();

          // قفل الزوايا الأربعة المشار إليها بالأسهم الحمراء في المرفق باللون الأسود بدقة تامة
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;

          // 1. الزاوية العلوية اليمنى (Corner Top-Right)
          ctx.beginPath();
          ctx.moveTo(sp.x + sp.w, ey - 6);
          ctx.lineTo(sp.x + sp.w, ey);
          ctx.lineTo(sp.x + sp.w + 6, ey);
          ctx.stroke();

          // 2. الزاوية العلوية اليسرى (Corner Top-Left)
          ctx.beginPath();
          ctx.moveTo(sp.x, ey - 6);
          ctx.lineTo(sp.x, ey);
          ctx.lineTo(sp.x - 6, ey);
          ctx.stroke();

          // 3. الزاوية السفلية اليمنى (Corner Bottom-Right)
          ctx.beginPath();
          ctx.moveTo(sp.x + sp.w, ey + eh + 6);
          ctx.lineTo(sp.x + sp.w, ey + eh);
          ctx.lineTo(sp.x + sp.w + 6, ey + eh);
          ctx.stroke();

          // 4. الزاوية السفلية اليسرى (Corner Bottom-Left)
          ctx.beginPath();
          ctx.moveTo(sp.x, ey + eh + 6);
          ctx.lineTo(sp.x, ey + eh);
          ctx.lineTo(sp.x - 6, ey + eh);
          ctx.stroke();
        }
      });
    });

    // إعادة رسم الحدود العلوية والسفلية باللون الأبيض للخلايا ذات اللون الأحمر القاتم لضمان بقائها ناصعة
    if (failedCellsWhiteBorders.length > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      failedCellsWhiteBorders.forEach(({ cX, curY: fcY, width, rowHeight: fcH }) => {
        ctx.beginPath();
        ctx.moveTo(cX, fcY);
        ctx.lineTo(cX + width, fcY);
        ctx.moveTo(cX, fcY + fcH);
        ctx.lineTo(cX + width, fcY + fcH);
        ctx.stroke();
      });
    }

    // Divider Line above attendance and Semester Legend for second semester
    const tableBottomY = tableTopY + tableTotalH;
    let attendanceDividerY = tableBottomY + 16;

    if (isSecondSem) {
      // فى الشهادات باللغة العربية والانجليزية للفصل الدراسي الثانى فقط:
      // كتابة توضيح الرموز بخط صغير تحت الجدول مباشرة فى أقصى اليسار
      // تساوى المسافة تماماً بين النص والجدول في الأعلى والخط الفاصل في الأسفل
      const semLegendText = isEn
        ? 'S.1 = First Semester     S.2 = Second Semester'
        : 'ف 1 = الفصل الدراسي الأول     ف 2 = الفصل الدراسي الثانى';

      ctx.save();
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      const legendFontSize = 13.5;
      ctx.font = `bold ${legendFontSize}px "Cairo", sans-serif`;

      const metrics = ctx.measureText(semLegendText);
      const ascent = (metrics.actualBoundingBoxAscent && metrics.actualBoundingBoxAscent > 0)
        ? metrics.actualBoundingBoxAscent
        : Math.round(legendFontSize * 0.75);
      const descent = (metrics.actualBoundingBoxDescent && metrics.actualBoundingBoxDescent > 0)
        ? metrics.actualBoundingBoxDescent
        : Math.round(legendFontSize * 0.25);

      // مسافة متساوية تماماً (12 بكسل) بين النص والجدول أعلاه، وبين النص والخط الفاصل أسفله
      const gap = 12;
      const semLegendX = marginX + 4;
      const baselineY = Math.round(tableBottomY + gap + ascent);

      ctx.textBaseline = 'alphabetic';
      ctx.fillText(semLegendText, semLegendX, baselineY);
      ctx.restore();

      // الخط الفاصل اسفل النص: بعده عن أسفل النص يساوي تماماً gap (12 بكسل) مع احتساب نصف سمك الخط (1 بكسل)
      attendanceDividerY = Math.round(baselineY + descent + gap + 1);
    }

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marginX, attendanceDividerY);
    ctx.lineTo(marginX + contentW, attendanceDividerY);
    ctx.stroke();

    // 6. Attendance Percentage Calculation
    // اعادة حساب النسبة المئوية لحضور الطالب والتأكد منها عبر فحص درجات السلوك من تقييمات الفصل أو الفصلين
    const allTableSubjects = [...addedSubjects, ...nonAddedSubjects];
    let behaviorSum = 0;
    let behaviorMaxPossible = 0;
    let behaviorEnteredCount = 0;

    for (const subj of allTableSubjects) {
      const isPESubj = stage !== 'kindergarten' && (subj.key === 'pe' || subj.key === 'physical_education' || subj.label?.includes('رياضية') || subj.label?.includes('بدنية'));
      const subjBehMax = isPESubj ? 10 : (isMiddleOrSecondaryStage ? 10 : 5);
      if (isSecondSem) {
        // في الفصل الدراسي الثاني: نحسب السلوك للفصلين (أو المتاح منهما) ليعبر عن حضور العام
        const b1 = isPESubj
          ? (student.detailedAssessments?.['first']?.[subj.key]?.sportsUniformAttendance ??
             student.detailedAssessments?.['first']?.[subj.key]?.behavior ??
             (student.detailedAssessments as any)?.['الفصل الدراسي الأول']?.[subj.key]?.sportsUniformAttendance ??
             (student.detailedAssessments as any)?.['الفصل الدراسي الأول']?.[subj.key]?.behavior)
          : (student.detailedAssessments?.['first']?.[subj.key]?.behavior ??
             (student.detailedAssessments as any)?.['الفصل الدراسي الأول']?.[subj.key]?.behavior);
        const b2 = isPESubj
          ? (student.detailedAssessments?.['second']?.[subj.key]?.sportsUniformAttendance ??
             student.detailedAssessments?.['second']?.[subj.key]?.behavior ??
             (student.detailedAssessments as any)?.['الفصل الدراسي الثانى']?.[subj.key]?.sportsUniformAttendance ??
             (student.detailedAssessments as any)?.['الفصل الدراسي الثانى']?.[subj.key]?.behavior)
          : (student.detailedAssessments?.['second']?.[subj.key]?.behavior ??
             (student.detailedAssessments as any)?.['الفصل الدراسي الثانى']?.[subj.key]?.behavior);

        const hasB1 = b1 !== undefined && b1 !== null && String(b1).trim() !== '';
        const hasB2 = b2 !== undefined && b2 !== null && String(b2).trim() !== '';

        if (hasB1 || hasB2) {
          if (hasB1 && String(b1).trim() !== 'غ') {
            const n1 = parseFloat(String(b1).replace(',', '.'));
            if (!isNaN(n1)) behaviorSum += n1;
          }
          if (hasB2 && String(b2).trim() !== 'غ') {
            const n2 = parseFloat(String(b2).replace(',', '.'));
            if (!isNaN(n2)) behaviorSum += n2;
          }
          behaviorMaxPossible += (hasB1 && hasB2) ? (subjBehMax * 2) : subjBehMax;
          behaviorEnteredCount++;
        }
      } else {
        // الفصل الأول فقط
        const b = isPESubj
          ? (student.detailedAssessments?.['first']?.[subj.key]?.sportsUniformAttendance ??
             student.detailedAssessments?.['first']?.[subj.key]?.behavior ??
             (student.detailedAssessments as any)?.[semText]?.[subj.key]?.sportsUniformAttendance ??
             (student.detailedAssessments as any)?.[semText]?.[subj.key]?.behavior ??
             student.detailedAssessments?.[semester]?.[subj.key]?.sportsUniformAttendance ??
             student.detailedAssessments?.[semester]?.[subj.key]?.behavior)
          : (student.detailedAssessments?.['first']?.[subj.key]?.behavior ??
             (student.detailedAssessments as any)?.[semText]?.[subj.key]?.behavior ??
             student.detailedAssessments?.[semester]?.[subj.key]?.behavior);

        if (b !== undefined && b !== null && String(b).trim() !== '') {
          if (String(b).trim() !== 'غ') {
            const n = parseFloat(String(b).replace(',', '.'));
            if (!isNaN(n)) behaviorSum += n;
          }
          behaviorMaxPossible += subjBehMax;
          behaviorEnteredCount++;
        }
      }
    }

    let percentageDisplay = '........';
    if (behaviorEnteredCount > 0 && behaviorMaxPossible > 0) {
      const rawPercentage = (behaviorSum / behaviorMaxPossible) * 100;
      const clamped = Math.min(100, Math.max(0, rawPercentage));
      const rounded = Math.round(clamped * 10) / 10;
      percentageDisplay = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }

    const attendanceText = isEn
      ? `Student Attendance = ${percentageDisplay} %`
      : (isFemale
        ? `النسبة المئوية لحضور الطالبة = ${percentageDisplay} %`
        : `النسبة المئوية لحضور الطالب = ${percentageDisplay} %`);

    // 7. Student Semester Total, Percentage, Evaluation, and Final Result (تم احتسابها مسبقاً بدقة لعرضها فى دائرة المجموع الكلى وسطر الملخص)

    const studentResultTitle = isEn ? 'Student Result' : (isFemale ? 'نتيجة الطالبة' : 'نتيجة الطالب');
    const totalScoreFormatted = isEn
      ? `${totalScoreDisplay} : ${totalAddedMax}`
      : `${totalAddedMax}  :  ${totalScoreDisplay}`;
    const labelText = isEn ? 'Total Score : ' : 'المجموع الكلى :';
    const enResultText = (resultDisplay === 'ناجح' || resultDisplay === 'ناجحة')
      ? 'Pass'
      : (resultDisplay === 'دور ثان' || resultDisplay === 'دور ثاني')
      ? 'Second Round'
      : (resultDisplay === 'راسب' || resultDisplay === 'راسبة')
      ? 'Fail'
      : resultDisplay;

    const restText = !isSecondSem
      ? (isEn
          ? `- ${evalDisplay} - Percentage ${pctDisplay} %`
          : `النسبة المئوية - ${pctDisplay} %   التقدير - ${evalDisplay}`)
      : (isEn
          ? `- ${evalDisplay} - Percentage ${pctDisplay} %   - ${enResultText}`
          : `النسبة المئوية - ${pctDisplay} %   التقدير - ${evalDisplay}   ${studentResultTitle} - ${resultDisplay}`);

    // Render Both on the SAME Line: Attendance in far-right, Total summary in far-left
    const lineY = attendanceDividerY + 28;
    ctx.textBaseline = 'middle';

    let baseRowFontSize = isEn ? 22 : 25;
    let scoreRowFontSize = 34; // خط أكبر لدرجات المجموع الكلي

    const maxSummaryWidth = contentW * 0.62;

    const measureSummary = (baseSize: number, scoreSize: number) => {
      ctx.font = `bold ${baseSize}px "Cairo", sans-serif`;
      const wLabel = ctx.measureText(labelText).width;
      const wRest = ctx.measureText(restText).width;
      ctx.font = `900 ${scoreSize}px "Cairo", sans-serif`;
      const wScore = ctx.measureText(totalScoreFormatted).width;
      return { wLabel, wScore, wRest, total: wLabel + wScore + wRest + 22 };
    };

    let summaryDims = measureSummary(baseRowFontSize, scoreRowFontSize);
    while (summaryDims.total > maxSummaryWidth && baseRowFontSize > 15) {
      baseRowFontSize -= 0.5;
      scoreRowFontSize = Math.round(baseRowFontSize * 1.34);
      summaryDims = measureSummary(baseRowFontSize, scoreRowFontSize);
    }

    if (isEn) {
      // 1. Far Right: Student Attendance
      ctx.direction = 'ltr';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${baseRowFontSize}px "Cairo", sans-serif`;
      let attFontSize = baseRowFontSize;
      const maxAttW = contentW * 0.35;
      while (attFontSize > 14 && ctx.measureText(attendanceText).width > maxAttW) {
        attFontSize -= 0.5;
        ctx.font = `bold ${attFontSize}px "Cairo", sans-serif`;
      }
      ctx.fillText(attendanceText, marginX + contentW, lineY);

      // 2. Far Left: Total Score : 342 : 500 - Good - Percentage 86.4 %
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      let curX = marginX;

      // Label: "Total Score :"
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${baseRowFontSize}px "Cairo", sans-serif`;
      ctx.fillText(labelText, curX, lineY);
      curX += ctx.measureText(labelText).width + 8;

      // Score: "342 : 500" in Red 900
      ctx.fillStyle = '#dc2626';
      ctx.font = `900 ${scoreRowFontSize}px "Cairo", sans-serif`;
      ctx.fillText(totalScoreFormatted, curX, lineY);
      curX += ctx.measureText(totalScoreFormatted).width + 8;

      // Rest: "- Good - Percentage 86.4 %"
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${baseRowFontSize}px "Cairo", sans-serif`;
      ctx.fillText(restText, curX, lineY);
    } else {
      // 1. Far Right: النسبة المئوية لحضور الطالب فى أقصى اليمين
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${baseRowFontSize}px "Cairo", sans-serif`;
      let attFontSize = baseRowFontSize;
      const maxAttW = contentW * 0.35;
      while (attFontSize > 14 && ctx.measureText(attendanceText).width > maxAttW) {
        attFontSize -= 0.5;
        ctx.font = `bold ${attFontSize}px "Cairo", sans-serif`;
      }
      ctx.fillText(attendanceText, marginX + contentW, lineY);

      // 2. Far Left: سطر المجموع الكلى (المجموع الكلي بخط أكبر وبلون أحمر وفق الصيغة 168 : 300)
      const rightBoundary = marginX + summaryDims.total;

      // رسم كلمة "المجموع الكلى :"
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.font = `bold ${baseRowFontSize}px "Cairo", sans-serif`;
      ctx.fillStyle = '#0f172a';
      ctx.fillText(labelText, rightBoundary, lineY);

      // رسم درجات المجموع الكلي بخط أكبر وبلون أحمر وفق الصيغة المطلوبة (مثال 168 : 300)
      const scoreRight = rightBoundary - summaryDims.wLabel - 10;
      const scoreCenterX = scoreRight - summaryDims.wScore / 2;
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.font = `900 ${scoreRowFontSize}px "Cairo", sans-serif`;
      ctx.fillStyle = '#dc2626'; // لون أحمر
      ctx.fillText(totalScoreFormatted, scoreCenterX, lineY);

      // رسم باقي سطر المجموع (النسبة المئوية، التقدير، نتيجة الطالب) باللون والخط الأساسي
      const restRight = scoreRight - summaryDims.wScore - 12;
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.font = `bold ${baseRowFontSize}px "Cairo", sans-serif`;
      ctx.fillStyle = '#0f172a';
      ctx.fillText(restText, restRight, lineY);
    }

    // Divider above signatures
    const sigDividerY = lineY + 22;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marginX, sigDividerY);
    ctx.lineTo(marginX + contentW, sigDividerY);
    ctx.stroke();

    // الخط الفاصل أعلى سطر مسئول البيانات في التذييل: زيادة ارتفاع التذييل بنسبة 25% (من 76 إلى 100)
    const footerTotalH = 100;
    const footerRowH = footerTotalH / 2; // 50 بكسل لكل سطر: ارتفاع سطر المنظومة متساوٍ تماماً مع ارتفاع سطر التوقيعات مسئول البيانات
    const footerLineY = heightPx - footerTotalH;

    // 7. سطر التوقيعات (على سطر واحد: النص ثم أيقونة القلم ثم التنقيط)
    const signaturesRowY = Math.round((sigDividerY + footerLineY) / 2);

    const circleRadius = 60;
    const circleMiddleX = marginX + contentW / 2;
    const circleMiddleY = signaturesRowY;

    const drawSignatureItem = (
      label: string,
      centerX: number,
      centerY: number,
      dotsText: string = '..............................'
    ) => {
      ctx.save();
      ctx.font = 'bold 19px "Cairo", sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textBaseline = 'middle';

      const labelW = ctx.measureText(label).width;
      const dotsW = ctx.measureText(dotsText).width;
      const penSize = 32;
      const gap = 8;
      const totalW = labelW + gap + penSize + gap + dotsW;

      if (!isEn) {
        // Arabic / RTL: سطر واحد: شئون الطلاب ثم ايقونة القلم ثم التنقيط
        const rightX = centerX + totalW / 2;

        // 1. النص (يمين)
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillText(label, rightX, centerY);

        // 2. أيقونة القلم (في المنتصف)
        const penX = rightX - labelW - gap - penSize;
        const penY = centerY - penSize / 2;
        if (penIcon) {
          ctx.drawImage(penIcon, penX, penY, penSize, penSize);
        }

        // 3. التنقيط (يسار القلم)
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        const dotsRightX = penX - gap;
        ctx.fillText(dotsText, dotsRightX, centerY);
      } else {
        // English / LTR: One line: Student Affairs then pen icon then dots
        const leftX = centerX - totalW / 2;

        // 1. Label (left)
        ctx.direction = 'ltr';
        ctx.textAlign = 'left';
        ctx.fillText(label, leftX, centerY);

        // 2. Pen Icon
        const penX = leftX + labelW + gap;
        const penY = centerY - penSize / 2;
        if (penIcon) {
          ctx.drawImage(penIcon, penX, penY, penSize, penSize);
        }

        // 3. Dots
        ctx.direction = 'ltr';
        ctx.textAlign = 'left';
        const dotsLeftX = penX + penSize + gap;
        ctx.fillText(dotsText, dotsLeftX, centerY);
      }

      ctx.restore();
    };

    if (!isKgStage) {
      // فى جميع المراحل ما عدا رياض الأطفال: شئون الطلاب / مدير المدرسة / توقيع ولى الأمر
      const rightSigX = marginX + contentW - 250;
      const centerSigX = marginX + contentW / 2;
      const leftSigX = marginX + 250;

      const parentSigLabel = isEn ? 'Parent Signature' : 'توقيع ولى الأمر';

      // Right: شئون الطلاب
      drawSignatureItem(isEn ? 'Student Affairs' : 'شئون الطلاب', rightSigX, signaturesRowY);

      // Center: مدير المدرسة
      drawSignatureItem(isEn ? 'School Principal' : 'مدير المدرسة', centerSigX, signaturesRowY);

      // Left: توقيع ولى الأمر
      drawSignatureItem(parentSigLabel, leftSigX, signaturesRowY);
    } else {
      // رياض الأطفال: شئون الطلاب / مدير الروضة
      const rightSigX = marginX + contentW - 280;
      const leftSigX = marginX + 280;

      // Right: شئون الطلاب
      drawSignatureItem(isEn ? 'Student Affairs' : 'شئون الطلاب', rightSigX, signaturesRowY, '..........................................');

      // Left: مدير الروضة
      drawSignatureItem(isEn ? 'Kindergarten Principal' : 'مدير الروضة', leftSigX, signaturesRowY, '..........................................');
    }

    // تم حذف الدائرة الحمراء المخصصة للمجموع بناءً على الطلب (تُعرض فقط إذا تم تفعيلها صراحة)
    if (options.showTotalScoreCircle && !isKgStage) {
      drawHandwrittenTotalScoreCircle(
        ctx,
        circleMiddleX,
        circleMiddleY,
        circleRadius,
        totalScoreDisplay,
        totalAddedMax
      );
    }

    // 8. Standard Footer (Landscape) - تقسيم التذييل بالتساوي بين السطرين
    const hasFooterQr = Boolean(qrImage);
    const footerQrSize = 80;
    const footerQrX = marginX + contentW - footerQrSize;
    const footerQrY = footerLineY + (footerTotalH - footerQrSize) / 2;
    const footerAvailW = hasFooterQr ? contentW - footerQrSize - 16 : contentW;
    const footerCenterX = marginX + footerAvailW / 2;

    const pageNumberText = isEn
      ? `Page ${studentIdx + 1} of ${studentList.length}`
      : `صفحة ${studentIdx + 1} من ${studentList.length}`;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(marginX, footerLineY);
    ctx.lineTo(marginX + contentW, footerLineY);
    ctx.stroke();

    // QR code
    if (hasFooterQr && qrImage) {
      ctx.save();
      ctx.drawImage(qrImage, footerQrX, footerQrY, footerQrSize, footerQrSize);
      ctx.restore();
    }

    // سطر التوقيعات: رقم الصفحة والتاريخ في أقصى يسار الصفحة بفاصل بسيط بين هذا النص ونص التوقيعات
    const footerTextY = footerLineY + footerRowH / 2;
    ctx.direction = isEn ? 'ltr' : 'rtl';
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';

    // 1. كتابة (رقم الصفحة - التاريخ) فى أقصى يسار سطر مسئول البيانات
    const pageInfoText = isEn
      ? `${pageNumberText}   -   ${dateDisplay}`
      : `${pageNumberText} - ${dateDisplay}`;
    let pageInfoFontSize = 14;
    ctx.font = `bold ${pageInfoFontSize}px "Cairo", sans-serif`;
    const pageInfoLeftX = marginX + 16;
    ctx.textAlign = 'left';
    ctx.fillText(pageInfoText, pageInfoLeftX, footerTextY);

    // 2. سطر التوقيعات (مسئول البيانات والمعلومات ورئيس الكنترول ورئيس اللجنة) في وسط الصفحة في ملفات PDF الأفقية
    const effDataOfficer = (isEn && dataOfficerEn.trim()) ? dataOfficerEn.trim() : (dataOfficer.trim() || '................');
    const effControlHead = (isEn && controlHeadEn.trim()) ? controlHeadEn.trim() : (controlHead.trim() || '................');
    const effCommitteeHead = (isEn && committeeHeadEn.trim()) ? committeeHeadEn.trim() : (committeeHead.trim() || '................');

    const footerSignaturesText = isEn
      ? `Data & Info Officer :  ${effDataOfficer}      Control Head :  ${effControlHead}      Committee Head :  ${effCommitteeHead}`
      : `مسئول البيانات والمعلومات : ${dataOfficer}   رئيس الكنترول : ${controlHead}   رئيس اللجنة : ${committeeHead}`;
    let footerFontSize = 16.5;
    ctx.font = `bold ${footerFontSize}px "Cairo", sans-serif`;

    const maxSigW = footerAvailW - 32;

    while (footerFontSize > 10 && ctx.measureText(footerSignaturesText).width > maxSigW) {
      footerFontSize -= 0.5;
      ctx.font = `bold ${footerFontSize}px "Cairo", sans-serif`;
    }
    ctx.direction = isEn ? 'ltr' : 'rtl';
    ctx.textAlign = 'center';
    ctx.fillText(footerSignaturesText, footerCenterX, footerTextY);

    // Centered Sub-footer: الخط الفاصل في منتصف التذييل تماماً
    const subFooterHrY = footerLineY + footerRowH;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginX, subFooterHrY);
    ctx.lineTo(marginX + footerAvailW, subFooterHrY);
    ctx.stroke();

    // سطر المنظومة الرقمية: بارتفاع متساوٍ تماماً مع سطر التوقيعات (50 بكسل لكل منهما)
    const subFooterTextY = subFooterHrY + footerRowH / 2;
    ctx.direction = isEn ? 'ltr' : 'rtl';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    let subFooterFontSize = 14.5;
    ctx.font = `bold ${subFooterFontSize}px "Cairo", sans-serif`;
    const centeredSubFooter = isEn
      ? 'Digital System for Egyptian Schools Leadership 01098594956 - 01131097055'
      : getActiveFooterTagline(selectedGrade, stage);
    while (subFooterFontSize > 10 && ctx.measureText(centeredSubFooter).width > footerAvailW - 16) {
      subFooterFontSize -= 0.5;
      ctx.font = `bold ${subFooterFontSize}px "Cairo", sans-serif`;
    }
    ctx.fillText(centeredSubFooter, footerCenterX, subFooterTextY, footerAvailW - 16);

    // Snapshot canvas to JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const base64 = dataUrl.split(',')[1];
    const jpegBytes = base64ToUint8Array(base64);
    renderedPages.push({ jpegBytes, widthPx: canvas.width, heightPx: canvas.height });
  }

  // Build standard PDF binary in Landscape A4 (841.89 x 595.28 pt)
  const pdfBytes = buildPdfFromJpegPages(renderedPages, 841.89, 595.28);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const safeGrade = (selectedGrade || '').replace(/[\\/:*?"<>|]/g, '_').trim();
  const safeSemester = semText.replace(/[\\/:*?"<>|]/g, '_').trim();
  link.download = isEn
    ? `Student_Semester_Grades_Certificate_${semester}_${safeGrade}.pdf`
    : `شهادة_درجات_وتقديرات_${safeSemester}_2026_-_2027_${safeGrade}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

