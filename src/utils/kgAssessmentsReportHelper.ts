import { StudentData } from '../types';
import { buildPdfFromJpegPages, base64ToUint8Array, getReportRowBgColors, RowBgTheme } from './exportPdf';
import qrCodeUrl from '../assets/images/asd11.jpg';
import { getActiveFooterTagline } from './adFilter';
const ministryLogoUrl = '';
import signaturePenUrl from '../assets/images/signature_pen.png';
import kgBadgeBlueUrl from '../assets/images/kg_eval_blue.png';
import kgBadgeGreenUrl from '../assets/images/kg_eval_green.png';
import kgBadgeYellowUrl from '../assets/images/kg_eval_yellow.png';
import kgBadgeRedUrl from '../assets/images/kg_eval_red.png';

export const KG_LEARNING_DOMAINS = [
  'مهارات الاستماع والتحدث والتواصل والاتصال البصرى والشفهى',
  'مهارات الاستجابة والتفاعل مع المفردات باللغة الاجنبية',
  'المهارات الحياتية والعملية - التفكير العلمى - استكشاف البيئة المحيطة - العمل الجماعى',
  'المهارات الحركية والبدنية والسلوكيات الصحية',
] as const;

export interface ExportKgEvaluationsPdfOptions {
  students: StudentData[];
  semester: string;
  selectedGrade?: string;
  stage?: string;
  title?: string;
  schoolName?: string;
  administration?: string;
  dataOfficer?: string;
  controlHead?: string;
  committeeHead?: string;
  customCols?: any[];
  defaultSubjectsOverrides?: Record<string, any>;
  singleStudentId?: string; // If specified, export only this student
  isParentNotice?: boolean; // إخطار ولى الأمر
  rowTheme?: RowBgTheme;
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
 * Draws high-resolution images crisply via progressive multi-step downscaling
 * to eliminate aliasing/blur and preserve full logo fidelity and clarity.
 */
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

type KgColorLevel = 'blue' | 'green' | 'yellow' | 'red';

interface KgColorMeta {
  level: KgColorLevel;
  name: string;
  title: string;
  description: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
  actionGuidance: string;
}

const KG_COLORS: Record<KgColorLevel, KgColorMeta> = {
  blue: {
    level: 'blue',
    name: 'الأزرق',
    title: 'يفوق التوقعات دائماً',
    description: 'يمتلك نواتج التعلم بجدارة عالية',
    bgHex: '#0078d7',
    textHex: '#ffffff',
    borderHex: '#005a9e',
    actionGuidance: 'يمتلك المعارف والمهارات بجدارة عالية - يوصى بالاستمرار في الأنشطة الإثرائية ورعاية الموهبة',
  },
  green: {
    level: 'green',
    name: 'الأخضر',
    title: 'يلبي التوقعات',
    description: 'يمتلك نواتج التعلم المقررة',
    bgHex: '#16c60c',
    textHex: '#ffffff',
    borderHex: '#0f8a08',
    actionGuidance: 'يمتلك المعارف والمهارات المطلوبة ويلبي التوقعات - يوصى بالتحفيز والتشجيع المستمر',
  },
  yellow: {
    level: 'yellow',
    name: 'الأصفر',
    title: 'يلبي التوقعات أحياناً',
    description: 'بحاجة إلى بعض الدعم والمساعدة',
    bgHex: '#facc15',
    textHex: '#0f172a',
    borderHex: '#ca8a04',
    actionGuidance: 'يلبي التوقعات أحياناً - بحاجة إلى مساعدة وتوجيه إضافي في الأنشطة الصفية والمنزلية',
  },
  red: {
    level: 'red',
    name: 'الأحمر',
    title: 'أقل من المتوقع',
    description: 'بحاجة إلى برنامج دعم مكثف',
    bgHex: '#e81123',
    textHex: '#ffffff',
    borderHex: '#b90d1a',
    actionGuidance: 'أقل من المتوقع - يحتاج إلى برنامج دعم وتدخل تعليمي علاجي فردي مكثف بالتعاون مع ولي الأمر',
  },
};

/**
 * أمثلة مهنية وتوجيهية لتوصيات المعلمة مقسمة حسب مستويات الأداء لمرحلة رياض الأطفال
 */
export const KG_TEACHER_RECOMMENDATIONS: Record<KgColorLevel, readonly string[]> = {
  // مستوى ( يفوق التوقعات دائماً )
  blue: [
    'تلميذ متميز ومبدع ، أنصح بالاستمرار في القراءة الخارجية وتطوير مهارات التفكير العليا لديه',
    'أداء استثنائي مستمر!  نوصي بإشراكه في المسابقات المدرسية والأنشطة القيادية لدعم موهبته',
    'يمتلك شغفاً كبيراً بالتعلم ، أنصح بتوفير تحديات علمية إضافية له للحفاظ على هذا المستوى الرائع',
    'نموذج يحتذى به في الفصل ؛ استمر في هذا التألق والشغف المعرفي',
  ],
  // مستوى ( يلبي التوقعات )
  green: [
    'تلميذ مجتهد ويؤدي واجباته بدقة ، أنصح بالتركيز على المشاركة الشفهية بشكل أكبر داخل الفصل',
    'مستوى ثابت وممتاز ؛ شجّعوه على البحث الذاتي ليتخطى التوقعات ويصل لمرحلة الإبداع',
    'يظهر فهماً جيداً للمفاهيم ؛ الاستمرار في المراجعة المنظمة سيضمن له التفوق الدائم',
    'أداؤك رائع ومتوازن ، أتوقع منك المزيد من التميز في الفترة القادمة بالتركيز على التفاصيل',
  ],
  // مستوى ( يلبي التوقعات أحياناً )
  yellow: [
    'يمتلك قدرات جيدة ولكنه يحتاج إلى مزيد من التركيز وتنظيم الوقت لتفادي تذبذب المستوى',
    'أنصح بمتابعة يومية للواجبات المدرسية ، وحثه على الالتزام بالمراجعة المستمرة لضمان ثبات أدائه',
    'يحتاج التلميذ إلى تشجيع مستمر لزيادة ثقته بنفسه والمشاركة بانتظام داخل الحصة',
    'أداؤه يتطور عند المتابعة ؛ نوصي بالتعاون بين البيت والمدرسة لتعزيز استقراره الأكاديمي',
  ],
  // مستوى ( أقل من المتوقع )
  red: [
    'يحتاج التلميذ إلى خطة دعم علاجية مكثفة للتمكن من المهارات الأساسية ( كالقراءة - الكتابة - العمليات الحسابية )',
    'نوصي بضرورة التواصل العاجل بين ولي الأمر والمعلمة لوضع خطة مشتركة لمساعدة التلميذ على اللحاق بزملائه',
    'يحتاج إلى التدريب المستمر وتبسيط المفهوم له ، مع التركيز على حل التدريبات الأساسية يومياً',
    'يمتلك التلميذ طاقة قوية ، لكنه بحاجة إلى توجيه وإعادة تنظيم لطرق الاستذكار والدعم المنزلي',
  ],
};

/**
 * اختيار توصية واحدة عشوائياً حسب مستوى التلميذ اللوني / التقييمي
 */
export function getRandomKgTeacherRecommendation(level: KgColorLevel | string, isFemale?: boolean): string {
  let key: KgColorLevel = 'green';
  if (level === 'blue' || level.includes('يفوق')) {
    key = 'blue';
  } else if (level === 'yellow' || level.includes('أحياناً')) {
    key = 'yellow';
  } else if (level === 'red' || level.includes('أقل')) {
    key = 'red';
  } else {
    key = 'green';
  }

  const pool = KG_TEACHER_RECOMMENDATIONS[key] || KG_TEACHER_RECOMMENDATIONS.green;
  const randomIndex = Math.floor(Math.random() * pool.length);
  let text = pool[randomIndex];
  if (isFemale) {
    text = text
      .replace(/تلميذ /g, 'تلميذة ')
      .replace(/التلميذ /g, 'التلميذة ')
      .replace(/متميز ومبدع/g, 'متميزة ومبدعة')
      .replace(/مجتهد ويؤدي/g, 'مجتهدة وتؤدي')
      .replace(/يحتاج/g, 'تحتاج')
      .replace(/يمتلك/g, 'تمتلك')
      .replace(/لديه/g, 'لديها')
      .replace(/له /g, 'لها ')
      .replace(/بزملائه/g, 'بزميلاتها')
      .replace(/شجّعوه/g, 'شجّعوها')
      .replace(/حثه/g, 'حثها')
      .replace(/أداؤه/g, 'أداؤها');
  }
  return text;
}

/**
 * Determines a student's color evaluation level for a subject or total,
 * based strictly on color criteria without exposing numeric numbers in the output.
 */
function getKgStudentColorLevel(rawScore: any, maxScore = 100): KgColorLevel {
  if (rawScore === null || rawScore === undefined || rawScore === '') {
    return 'green'; // Default satisfactory
  }

  const str = String(rawScore).trim();
  if (str.includes('أزرق') || str.includes('ازرق') || str.includes('يفوق') || str.includes('ممتاز')) {
    return 'blue';
  }
  if (str.includes('أخضر') || str.includes('اخضر') || str.includes('يلبي') || str.includes('يلبى') || str.includes('جيد')) {
    if (str.includes('أحيانا') || str.includes('احيانا')) return 'yellow';
    return 'green';
  }
  if (str.includes('أصفر') || str.includes('اصفر') || str.includes('مقبول')) {
    return 'yellow';
  }
  if (str.includes('أحمر') || str.includes('احمر') || str.includes('أقل') || str.includes('اقل') || str.includes('دون') || str.includes('علاج') || str.includes('ضعيف')) {
    return 'red';
  }

  const num = parseFloat(str);
  if (!isNaN(num) && maxScore > 0) {
    const pct = (num / maxScore) * 100;
    if (pct >= 85) return 'blue';
    if (pct >= 65) return 'green';
    if (pct >= 50) return 'yellow';
    return 'red';
  }

  return 'green';
}

/**
 * Generates and downloads an official, beautifully formatted A4 Portrait PDF file
 * containing one student evaluation report card per page for Kindergarten (مرحلة رياض الأطفال):
 * - الهيدر كالمعتاد والتذييل كالمعتاد (Standard Header & Standard Footer)
 * - استعن بالمرفقات: الشعار الوزاري (asd13.png)، باركود QR (asd11.jpg)، وأيقونة قلم التوقيع
 * - كتابة النص "يمتلك نواتج التعلم ..." تحت الزر
 * - يتكون الجدول من 3 حقول: حقل م، حقل مجال التعلم (مع توسيط الخلايا)، حقل اللون (الألوان داخل الجدول بدون نصوص)
 * - حذف حقل "التقييم اللوني المكتسب"
 * - صفحة لكل طفل / طالب
 */
export async function exportKgStudentEvaluationsReportPdf(
  options: ExportKgEvaluationsPdfOptions
): Promise<void> {
  const {
    students,
    semester = 'first',
    selectedGrade = 'المستوى الأول (KG1)',
    stage = 'kindergarten',
    schoolName = '',
    administration = '',
    dataOfficer: propDataOfficer,
    controlHead: propControlHead,
    committeeHead: propCommitteeHead,
    customCols,
    defaultSubjectsOverrides,
    singleStudentId,
    isParentNotice = false,
  } = options;

  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }
  } catch {}

  const [
    qrImage,
    ministryLogoImage,
    penIcon,
    badgeBlueImg,
    badgeGreenImg,
    badgeYellowImg,
    badgeRedImg,
  ] = await Promise.all([
    loadImage(qrCodeUrl),
    loadImage(ministryLogoUrl),
    loadImage(signaturePenUrl),
    loadImage(kgBadgeBlueUrl),
    loadImage(kgBadgeGreenUrl),
    loadImage(kgBadgeYellowUrl),
    loadImage(kgBadgeRedUrl),
  ]);

  const levelBadges: Record<KgColorLevel, HTMLImageElement | null> = {
    blue: badgeBlueImg,
    green: badgeGreenImg,
    yellow: badgeYellowImg,
    red: badgeRedImg,
  };

  const isSecondSem = semester === 'second' || semester === 'الفصل الدراسي الثاني';
  const semText = isSecondSem ? 'الفصل الدراسي الثانى' : 'الفصل الدراسي الأول';
  const semKey = isSecondSem ? 'second' : 'first';

  let sAdmin = localStorage.getItem('school_administration') || administration || '';
  let sName = localStorage.getItem('school_name') || schoolName || '';

  try {
    const savedSchool = localStorage.getItem('sheet_control_school_data');
    if (savedSchool) {
      const parsedSchool = JSON.parse(savedSchool);
      if (!sAdmin && parsedSchool.administration) sAdmin = parsedSchool.administration;
      if (!sName && parsedSchool.schoolName) sName = parsedSchool.schoolName;
    }
  } catch {}

  let dataOfficer = propDataOfficer || '';
  let controlHead = propControlHead || '';
  let committeeHead = propCommitteeHead || '';

  if (!dataOfficer || !controlHead || !committeeHead) {
    try {
      const stageKey = stage || 'kindergarten';
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

  // قراءة لون خلفية الصفوف المتبادل مع اللون الأبيض في جداول التقارير المطبوعة
  const savedPrintTheme = typeof window !== 'undefined'
    ? (localStorage.getItem('pdf_print_row_theme') as RowBgTheme | null)
    : null;
  const activeRowTheme = (options.rowTheme as RowBgTheme) || (savedPrintTheme && savedPrintTheme !== ('auto' as any) ? savedPrintTheme : 'attachment_1');
  const { evenBg, oddBg } = getReportRowBgColors(
    isParentNotice ? 'kg_parent_notice' : 'kg_student_evaluations_report',
    false,
    activeRowTheme
  );

  // Read kindergarten subjects
  let subjects: { key: string; label: string; maxGrade?: number }[] = [];
  if (customCols && Array.isArray(customCols) && customCols.length > 0) {
    subjects = customCols.map((c) => ({
      key: c.key,
      label: c.label || c.name || c.key,
      maxGrade: c.maxGrade || c.maxAssessmentsGrade || 100,
    }));
  } else {
    try {
      const saved = localStorage.getItem(`${stage}_${selectedGrade}_assessments_custom_cols`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          subjects = parsed.map((c: any) => ({
            key: c.key,
            label: c.label || c.name || c.key,
            maxGrade: c.maxGrade || c.maxAssessmentsGrade || 100,
          }));
        }
      }
    } catch {}
  }

  // دالة استبدال مسميات المواد بمجالات قياس نواتج التعلم الوزارية المقررة لرياض الأطفال
  const getKgReportSubjectName = (key: string, label: string, domain?: string): string => {
    if (domain && domain.trim()) {
      return domain.trim();
    }
    const k = (key || '').toLowerCase().trim();
    const l = (label || '').trim();

    // 1. استبدال اللغة العربية بـ: مهارات الاستماع والتحدث والتواصل والاتصال البصرى والشفهى
    if (
      k === 'arabic' ||
      k === 'ar' ||
      l.includes('عربي') ||
      l.includes('العربية') ||
      l.includes('تواصل') ||
      l.includes('الاستماع')
    ) {
      return 'مهارات الاستماع والتحدث والتواصل والاتصال البصرى والشفهى';
    }

    // 2. استبدال اللغة الإنجليزية بـ: مهارات الاستجابة والتفاعل مع المفردات باللغة الاجنبية
    if (
      k === 'english' ||
      k === 'en' ||
      l.includes('انجليز') ||
      l.includes('إنجليزية') ||
      l.includes('connect') ||
      l.includes('الاجنبية') ||
      l.includes('الأجنبية') ||
      l.includes('الاستجابة') ||
      l.includes('المفردات')
    ) {
      return 'مهارات الاستجابة والتفاعل مع المفردات باللغة الاجنبية';
    }

    // 3. استبدال متعدد التخصصات بـ: المهارات الحياتية والعملية - التفكير العلمى - استكشاف البيئة المحيطة - العمل الجماعى
    if (
      k === 'multidisciplinary' ||
      k === 'discover' ||
      l.includes('متعدد') ||
      l.includes('اكتشف') ||
      l.includes('المهارات الحياتية')
    ) {
      return 'المهارات الحياتية والعملية - التفكير العلمى - استكشاف البيئة المحيطة - العمل الجماعى';
    }

    // 4. استبدال التربية البدنية والصحية بـ: المهارات الحركية والبدنية والسلوكيات الصحية
    if (
      k === 'pe' ||
      k === 'physical' ||
      l.includes('بدني') ||
      l.includes('صحي') ||
      l.includes('رياض') ||
      l.includes('حركي') ||
      l.includes('المهارات الحركية')
    ) {
      return 'المهارات الحركية والبدنية والسلوكيات الصحية';
    }

    return l || key;
  };

  if (subjects.length === 0) {
    subjects = [
      { key: 'arabic', label: 'مهارات الاستماع والتحدث والتواصل والاتصال البصرى والشفهى', maxGrade: 100 },
      { key: 'english', label: 'مهارات الاستجابة والتفاعل مع المفردات باللغة الاجنبية', maxGrade: 100 },
      { key: 'multidisciplinary', label: 'المهارات الحياتية والعملية - التفكير العلمى - استكشاف البيئة المحيطة - العمل الجماعى', maxGrade: 100 },
      { key: 'pe', label: 'المهارات الحركية والبدنية والسلوكيات الصحية', maxGrade: 100 },
    ];
  } else {
    subjects = subjects.filter(
      (s) => s.key !== 'religion' && !s.label.includes('ديني') && !s.label.includes('دين')
    );
    subjects = subjects.map((s) => ({
      ...s,
      label: getKgReportSubjectName(s.key, s.label, (s as any).learningDomain),
    }));
  }

  // Exact page dimensions for Portrait A4: 1240 x 1754 px
  const widthPx = 1240;
  const heightPx = 1754;
  const marginX = 55;
  const contentW = widthPx - marginX * 2; // 1130 px

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

  // Filter students if singleStudentId requested
  let targetStudents = students;
  if (singleStudentId) {
    targetStudents = students.filter((s) => s.id === singleStudentId);
  }
  const studentList = targetStudents.length > 0 ? targetStudents : [{} as StudentData];
  const renderedPages: { jpegBytes: Uint8Array; widthPx: number; heightPx: number }[] = [];

  for (let sIdx = 0; sIdx < studentList.length; sIdx++) {
    const student = studentList[sIdx];
    const renderScale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(widthPx * renderScale);
    canvas.height = Math.round(heightPx * renderScale);
    canvas.dir = 'rtl';
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.scale(renderScale, renderScale);

    // دالة رسم شارة التقييم المرفقة (PNG) بدلاً من دوائر الألوان مع وضع إطار واحد حول الشارة باللون المناسب
    const drawLevelBadge = (
      level: KgColorLevel,
      centerX: number,
      centerY: number,
      size: number
    ) => {
      const badgeImg = levelBadges[level];
      const meta = KG_COLORS[level];
      const halfSize = size / 2;
      // في ملفات الشارات (512x512)، نصف قطر قرص الشارة الدائري هو 236 من أصل 256
      const badgeDiscRadius = halfSize * (236 / 256);

      if (badgeImg) {
        ctx.drawImage(badgeImg, centerX - halfSize, centerY - halfSize, size, size);
      } else {
        ctx.beginPath();
        ctx.arc(centerX, centerY, badgeDiscRadius, 0, Math.PI * 2);
        ctx.fillStyle = meta.bgHex;
        ctx.fill();
      }

      // وضع إطار واحد حول الشارة باللون المناسب
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, badgeDiscRadius, 0, Math.PI * 2);
      ctx.strokeStyle = meta.borderHex;
      ctx.lineWidth = Math.max(3, Math.round(size * 0.045));
      ctx.stroke();
      ctx.restore();
    };

    // 1. Clean White Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // ==========================================
    // الهيدر كالمعتاد (Standard Egyptian Header)
    // ==========================================
    const topInfoY = 32;
    const topInfoH = 40;
    ctx.direction = 'rtl';
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px "Cairo", sans-serif';

    const adminDisplay = sAdmin.trim() ? `الإدارة :  ${sAdmin.trim()}` : 'الإدارة :  ........................';
    const schoolDisplay = sName.trim() ? `الروضة :  ${sName.trim()}` : 'الروضة :  ........................';

    // Far Right: الإدارة
    ctx.textAlign = 'right';
    ctx.fillText(adminDisplay, marginX + contentW, topInfoY + topInfoH / 2);

    // Far Left: الروضة
    ctx.textAlign = 'left';
    ctx.fillText(schoolDisplay, marginX, topInfoY + topInfoH / 2);

    // الخط الفاصل أسفل سطر الإدارة والروضة (<hr>)
    const headerLineY = topInfoY + topInfoH + 18; // 90 px

    // وزارة التربية والتعليم / الشعار الوزاري بجوار اسم الروضة (انزال شعار الوزارة للأعلى بنسبة 60% من المسافة الفاصلة وبأقصى دقة)
    if (ministryLogoImage) {
      const schoolTextW = ctx.measureText(schoolDisplay).width;
      const logoH = 50;
      const logoNatW = ministryLogoImage.naturalWidth || ministryLogoImage.width || 1;
      const logoNatH = ministryLogoImage.naturalHeight || ministryLogoImage.height || 1;
      const logoAspect = logoNatW / logoNatH;
      const logoW = Math.round(logoH * logoAspect);
      const logoX = marginX + schoolTextW + 18;
      // انزال الشعار درجتين إضافيتين (من 22 إلى 24)
      const logoY = 24;

      drawCrispImage(ctx, ministryLogoImage, logoX, logoY, logoW, logoH);
    }

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(marginX, headerLineY);
    ctx.lineTo(marginX + contentW, headerLineY);
    ctx.stroke();

    // بانر العنوان الرئيسي (بنى محروق - Burnt Brown Gradient بإطار أسود)
    const bannerY = headerLineY + 12;
    const bannerH = 70;
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
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    const titleText = isParentNotice
      ? `إخطار ولى الأمر - تقييمات التلميذ - ${semText} 2026 – 2027 م`
      : `تقرير تقييمات التلميذ - ${semText} 2026 – 2027 م`;
    ctx.fillStyle = '#ffffff';
    let bannerFontSize = isParentNotice ? 22 : 24;
    ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;
    while (bannerFontSize > 14 && ctx.measureText(titleText).width > contentW - 32) {
      bannerFontSize -= 1;
      ctx.font = `900 ${bannerFontSize}px "Cairo", sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleText, marginX + contentW / 2, bannerY + bannerH / 2 + 2);

    // السطر الوزاري
    const decreeY = bannerY + bannerH + 26;
    const decreeText = 'وفقا لنظام التعليم 2.0 ووفقا للقرار الوزارى 342 - 2018';
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px "Cairo", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(decreeText, marginX + contentW / 2, decreeY);

    // 1. سطر فارغ قبل سطر بيانات التلميذ والمرحلة
    // وضع اسم التلميذ فى أقصى اليمين (باللون الأحمر) والمرحلة فى أقصى اليسار فوق الخط الفاصل
    const infoY = decreeY + 60;
    const isFemale =
      student.gender === 'female' ||
      student.gender === 'أنثى' ||
      student.gender === 'بنت' ||
      (Boolean(student.nationalId) &&
        student.nationalId!.length === 14 &&
        parseInt(student.nationalId![12], 10) % 2 === 0);

    const studentPrefix = isFemale ? 'التلميذة' : 'التلميذ';
    const studentNameVal = student.name ? student.name.trim() : '................................';
    const studentNameText = `${studentPrefix} : ${studentNameVal}`;

    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';

    // اسم التلميذ فى أقصى اليمين باللون الأحمر
    ctx.fillStyle = '#dc2626'; // اللون الأحمر
    let nameFontSize = 24;
    ctx.font = `900 ${nameFontSize}px "Cairo", sans-serif`;
    const maxNameW = contentW * 0.58;
    while (nameFontSize > 15 && ctx.measureText(studentNameText).width > maxNameW) {
      nameFontSize -= 0.5;
      ctx.font = `900 ${nameFontSize}px "Cairo", sans-serif`;
    }
    ctx.textAlign = 'right';
    ctx.fillText(studentNameText, marginX + contentW, infoY);

    // المرحلة ... والمستوى فى أقصى اليسار فوق الخط الفاصل
    const gradeVal = selectedGrade ? selectedGrade.trim() : 'المستوى الأول (KG1)';
    const statusVal = student.studentStatus === 'دمج' ? '  ( دمج )' : '';
    const cleanGrade = gradeVal.startsWith('المستوى') ? gradeVal : `المستوى ${gradeVal}`;
    const stageLevelText = `المرحلة : رياض أطفال  -  ${cleanGrade}${statusVal}`;

    ctx.fillStyle = '#000000';
    let stageFontSize = 18;
    ctx.font = `bold ${stageFontSize}px "Cairo", sans-serif`;
    const maxStageW = contentW * 0.40;
    while (stageFontSize > 13 && ctx.measureText(stageLevelText).width > maxStageW) {
      stageFontSize -= 0.5;
      ctx.font = `bold ${stageFontSize}px "Cairo", sans-serif`;
    }
    ctx.textAlign = 'left';
    ctx.fillText(stageLevelText, marginX, infoY);

    // 2. <br> فاصل أسطر بين (اسم التلميذ والمرحلة) والخط الفاصل
    // الخط الفاصل (<hr>) أسود بعرض التقرير يقع أسفل اسم التلميذ والمرحلة
    const studentDividerY = infoY + 26;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginX, studentDividerY);
    ctx.lineTo(marginX + contentW, studentDividerY);
    ctx.stroke();

    // =========================================================================
    // سطر فارغ بعد الخط الفاصل ثم دليل مقياس الألوان الأربعة (المرفق)
    // =========================================================================
    const legendY = studentDividerY + 44; // سطر فارغ بعد الخط الفاصل
    const colorLevels: KgColorLevel[] = ['blue', 'green', 'yellow', 'red'];
    const badgeGap = 12;
    const totalGaps = (colorLevels.length - 1) * badgeGap;
    const badgeW = (contentW - totalGaps) / colorLevels.length; // 273.5 px each
    const legendBadgeSize = 88; // تكبير شارات التقييم بنسبة 100 % (من 44 إلى 88)
    const badgeRadius = legendBadgeSize / 2;
    const circleCenterY = legendY + badgeRadius + 4;
    const line1Y = circleCenterY + badgeRadius + 20; // العنوان تحت الشارة
    const line2Y = line1Y + 28; // الشرح تحت العنوان بمسافة أسطر متباعدة بنسبة 50%

    colorLevels.forEach((lvl, idx) => {
      const meta = KG_COLORS[lvl];
      const bX = marginX + contentW - (idx + 1) * badgeW - idx * badgeGap;
      const centerX = bX + badgeW / 2;

      // استخدام الشارة المرفقة (PNG) مكبرة بنسبة 100% مع إطار واحد باللون المناسب
      drawLevelBadge(lvl, centerX, circleCenterY, legendBadgeSize);

      // النص تحت الدائرة - السطر الأول (العنوان)
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      let titleFont = 17;
      ctx.font = `bold ${titleFont}px "Cairo", sans-serif`;
      while (titleFont > 12 && ctx.measureText(meta.title).width > badgeW - 8) {
        titleFont -= 0.5;
        ctx.font = `bold ${titleFont}px "Cairo", sans-serif`;
      }
      ctx.fillText(meta.title, centerX, line1Y);

      // النص تحت الدائرة - السطر الثاني مع زيادة المسافة بين السطور بنسبة 50%
      let descFont = 13.5;
      ctx.font = `bold ${descFont}px "Cairo", sans-serif`;
      while (descFont > 10 && ctx.measureText(meta.description).width > badgeW - 6) {
        descFont -= 0.5;
        ctx.font = `bold ${descFont}px "Cairo", sans-serif`;
      }
      ctx.fillStyle = '#334155';
      ctx.fillText(meta.description, centerX, line2Y);
    });

    // =========================================================================
    // فاصل أسطر وخط فاصل أسود بين دليل الألوان وجدول التقييمات (<br><hr><br>)
    // =========================================================================
    const tableDividerY = line2Y + 22; // <br> بعد نصوص دليل الألوان
    ctx.strokeStyle = '#000000'; // <hr> خط أسود بعرض التقرير
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginX, tableDividerY);
    ctx.lineTo(marginX + contentW, tableDividerY);
    ctx.stroke();

    // =========================================================================
    // جدول التقييمات:
    // يتكون الجدول من:
    // - حقل م
    // - حقل أبيض فارغ بعد حقل م (عرضه = 15% من عرض حقل م، حدوده العلوية والسفلية بيضاء، ولون الحد العلوي والسفلي للجدول عنده أبيض)
    // - حقل مجالات قياس نواتج التعلم
    // - حقل أبيض فارغ قبل حقل اللون (عرضه = 15% من عرض حقل م، حدوده العلوية والسفلية بيضاء، ولون الحد العلوي والسفلي للجدول عنده أبيض)
    // - حقل اللون
    // - زيادة ارتفاع صف عناوين الجدول بنسبة 100% (من 58 إلى 116)
    // - فصل صف عنوان الجدول عن الجدول نفسه بمسافة = 15% من عرض حقل م
    // =========================================================================
    const serialColW = 80;
    const spacerW = Math.round(serialColW * 0.15); // 12px (15% من عرض حقل م)
    const headerBodyGap = Math.round(serialColW * 0.15); // 12px (مسافة فصل صف العنوان عن الجدول = 15% من عرض حقل م)
    const colorColW = 300;
    // الحفاظ على العرض الإجمالي الدقيق لجدول A4 (contentW = 1130px)
    const subjectColW = contentW - (serialColW + spacerW + spacerW + colorColW); // 1130 - (80 + 12 + 12 + 300) = 726px

    const colWidths = {
      serial: serialColW,
      spacer1: spacerW,
      subject: subjectColW,
      spacer2: spacerW,
      color: colorColW,
    };

    const tableTopY = tableDividerY + 20; // <br> فاصل أسطر بعد الخط الفاصل وقبل الجدول
    const tableHeaderH = 116; // زيادة ارتفاع صف عناوين الجدول بنسبة 100% (كان 58 وأصبح 116)
    const tableBodyY = tableTopY + tableHeaderH + headerBodyGap;

    // =========================================================================
    // موائمة ارتفاع صفوف الجدول وحجم شارات التقييم (حتى لا تتداخل السطور الأخيرة مع سطر التوقيعات):
    // حساب أقصى ارتفاع متاح لجسم الجدول بحيث تنتهي بطاقة المواظبة وتوصيات المعلمة
    // بأمان تام قبل سطر التوقيعات بمسافة مريحة لا تقل عن 35 بكسل
    // =========================================================================
    const sigDividerY = heightPx - 185;
    const numSubjects = Math.max(1, subjects.length);
    const targetMaxContentBottomY = sigDividerY - 35; // 1569 - 35 = 1534px
    const fixedCardsBelowH = 288 + 104 + 26; // overallCardH (288) + notesH (104) + فواصل رأسية (12 + 14 = 26)
    const maxBodyAvailH = Math.max(160, targetMaxContentBottomY - fixedCardsBelowH - tableBodyY);

    // موائمة ارتفاع صفوف الجدول (rowH) بدقة حسب عدد المواد والمساحة المتاحة
    let rowH: number;
    if (numSubjects <= 4) {
      rowH = 72; // ارتفاع صف مريح ومتناسق جداً لـ 4 مواد
    } else if (numSubjects === 5) {
      rowH = 68;
    } else if (numSubjects === 6) {
      rowH = 62;
    } else if (numSubjects === 7) {
      rowH = 56;
    } else if (numSubjects === 8) {
      rowH = 50;
    } else {
      rowH = Math.max(38, Math.floor(maxBodyAvailH / numSubjects));
    }

    // ضمان رياضي حازم لعدم تجاوز المساحة المتاحة مهما بلغ عدد المواد
    if (numSubjects * rowH > maxBodyAvailH) {
      rowH = Math.max(36, Math.floor(maxBodyAvailH / numSubjects));
    }

    const bodyTotalH = numSubjects * rowH;
    const tableTotalH = tableHeaderH + headerBodyGap + bodyTotalH;

    // موائمة حجم شارات التقييم في خلايا الجدول بما يتناسب طردياً مع ارتفاع الصف rowH
    const tableBadgeSize = Math.max(28, Math.min(56, Math.round(rowH * 0.78)));

    // دالة مساعدة لرسم الحقل الأبيض الفارغ مع حدود علوية وسفلية بيضاء
    const drawWhiteSpacer = (x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      // الحد العلوي أبيض
      ctx.beginPath();
      ctx.moveTo(x - 0.5, y);
      ctx.lineTo(x + w + 0.5, y);
      ctx.stroke();
      // الحد السفلي أبيض
      ctx.beginPath();
      ctx.moveTo(x - 0.5, y + h);
      ctx.lineTo(x + w + 0.5, y + h);
      ctx.stroke();
    };

    // -------------------------------------------------------------------------
    // 1. رسم صف عناوين الجدول (مفصول بزوايا مستديرة وإطار خاص به)
    // -------------------------------------------------------------------------
    ctx.save();
    drawRoundedRect(ctx, marginX, tableTopY, contentW, tableHeaderH, 10);
    ctx.clip();

    let curX = marginX + contentW;

    // 1. حقل م
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(curX - colWidths.serial, tableTopY, colWidths.serial, tableHeaderH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(curX - colWidths.serial, tableTopY, colWidths.serial, tableHeaderH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Cairo", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('م', curX - colWidths.serial / 2, tableTopY + tableHeaderH / 2);
    curX -= colWidths.serial;

    // 2. حقل أبيض فارغ بعد حقل م (عرضه = 15% من عرض حقل م، حدوده العلوية والسفلية بيضاء)
    const spacer1X = curX - colWidths.spacer1;
    drawWhiteSpacer(spacer1X, tableTopY, colWidths.spacer1, tableHeaderH);
    curX -= colWidths.spacer1;

    // 3. حقل مجالات قياس نواتج التعلم
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(curX - colWidths.subject, tableTopY, colWidths.subject, tableHeaderH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(curX - colWidths.subject, tableTopY, colWidths.subject, tableHeaderH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Cairo", sans-serif';
    ctx.fillText('مجالات قياس نواتج التعلم', curX - colWidths.subject / 2, tableTopY + tableHeaderH / 2);
    curX -= colWidths.subject;

    // 4. حقل أبيض فارغ قبل حقل اللون (عرضه = 15% من عرض حقل م، حدوده العلوية والسفلية بيضاء)
    const spacer2X = curX - colWidths.spacer2;
    drawWhiteSpacer(spacer2X, tableTopY, colWidths.spacer2, tableHeaderH);
    curX -= colWidths.spacer2;

    // 5. حقل اللون
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(curX - colWidths.color, tableTopY, colWidths.color, tableHeaderH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(curX - colWidths.color, tableTopY, colWidths.color, tableHeaderH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Cairo", sans-serif';
    ctx.fillText('اللون', curX - colWidths.color / 2, tableTopY + tableHeaderH / 2);

    ctx.restore(); // استعادة بعد رأس الجدول

    // إطار صف العنوان الخارجي باللون الأسود
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, marginX, tableTopY, contentW, tableHeaderH, 10);
    ctx.stroke();

    // جعل لون الحد العلوي والسفلي لصف العنوان عند الحقلين الفارغين أبيض تماماً
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    const headerBottomY = tableTopY + tableHeaderH;

    // عند spacer1 في صف العنوان
    ctx.beginPath();
    ctx.moveTo(spacer1X, tableTopY);
    ctx.lineTo(spacer1X + colWidths.spacer1, tableTopY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(spacer1X, headerBottomY);
    ctx.lineTo(spacer1X + colWidths.spacer1, headerBottomY);
    ctx.stroke();

    // عند spacer2 في صف العنوان
    ctx.beginPath();
    ctx.moveTo(spacer2X, tableTopY);
    ctx.lineTo(spacer2X + colWidths.spacer2, tableTopY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(spacer2X, headerBottomY);
    ctx.lineTo(spacer2X + colWidths.spacer2, headerBottomY);
    ctx.stroke();

    // -------------------------------------------------------------------------
    // 2. رسم صفوف مواد الجدول (مفصولة بمسافة 15% من عرض حقل م أسفل صف العنوان)
    // -------------------------------------------------------------------------
    ctx.save();
    drawRoundedRect(ctx, marginX, tableBodyY, contentW, bodyTotalH, 10);
    ctx.clip();

    let curRowY = tableBodyY;
    const studentEvaluatedLevels: KgColorLevel[] = [];

    subjects.forEach((subj, subIdx) => {
      let rawGrade =
        student.assessments?.[semKey]?.[subj.key] ??
        student.assessments?.first?.[subj.key] ??
        student.assessments?.[subj.key];

      if (rawGrade === undefined) {
        const semObj =
          student.assessments?.[semKey] ||
          student.assessments?.first ||
          student.assessments?.['الفصل الدراسي الأول'] ||
          student.assessments ||
          {};
        if (subj.key === 'arabic') {
          rawGrade = semObj['arabic'] ?? semObj['اللغة العربية'] ?? semObj['ar'];
        } else if (subj.key === 'english') {
          rawGrade = semObj['english'] ?? semObj['اللغة الإنجليزية'] ?? semObj['اللغة الانجليزية'] ?? semObj['en'];
        } else if (subj.key === 'multidisciplinary') {
          rawGrade = semObj['multidisciplinary'] ?? semObj['discover'] ?? semObj['متعدد التخصصات'] ?? semObj['اكتشف'];
        } else if (subj.key === 'pe') {
          rawGrade = semObj['pe'] ?? semObj['physical'] ?? semObj['التربية البدنية والصحية'] ?? semObj['التربية الرياضية'];
        }
      }

      const level = getKgStudentColorLevel(rawGrade, subj.maxGrade || 100);
      studentEvaluatedLevels.push(level);
      const levelMeta = KG_COLORS[level];

      // تظليل صفوف الجدول باللون المتبادل مع اللون الأبيض
      const isOddRow = subIdx % 2 !== 0;
      const isDarkRow = isOddRow && (oddBg === '#000000' || oddBg === '#dc2626' || activeRowTheme === 'theme_black' || activeRowTheme === 'theme_red');
      const rowBg = isOddRow ? oddBg : evenBg;
      const cellTextColor = isDarkRow ? '#ffffff' : '#000000';

      let rX = marginX + contentW;

      // 1. خلية حقل م
      ctx.fillStyle = rowBg;
      ctx.fillRect(rX - colWidths.serial, curRowY, colWidths.serial, rowH);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rX - colWidths.serial, curRowY, colWidths.serial, rowH);

      ctx.fillStyle = cellTextColor;
      ctx.font = 'bold 18px "Cairo", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(subIdx + 1), rX - colWidths.serial / 2, curRowY + rowH / 2);
      rX -= colWidths.serial;

      // 2. حقل أبيض فارغ بعد حقل م (عرضه = 15% من عرض حقل م، حدوده العلوية والسفلية بيضاء)
      drawWhiteSpacer(rX - colWidths.spacer1, curRowY, colWidths.spacer1, rowH);
      rX -= colWidths.spacer1;

      // 3. خلية حقل مجالات قياس نواتج التعلم
      ctx.fillStyle = rowBg;
      ctx.fillRect(rX - colWidths.subject, curRowY, colWidths.subject, rowH);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rX - colWidths.subject, curRowY, colWidths.subject, rowH);

      ctx.fillStyle = cellTextColor;
      let subjFont = 16.5;
      ctx.font = `bold ${subjFont}px "Cairo", sans-serif`;
      while (subjFont > 10.5 && ctx.measureText(subj.label).width > colWidths.subject - 24) {
        subjFont -= 0.5;
        ctx.font = `bold ${subjFont}px "Cairo", sans-serif`;
      }
      ctx.textAlign = 'center'; // توسيط خلايا حقل مجالات قياس نواتج التعلم
      ctx.fillText(subj.label, rX - colWidths.subject / 2, curRowY + rowH / 2);
      rX -= colWidths.subject;

      // 4. حقل أبيض فارغ قبل حقل اللون (عرضه = 15% من عرض حقل م، حدوده العلوية والسفلية بيضاء)
      drawWhiteSpacer(rX - colWidths.spacer2, curRowY, colWidths.spacer2, rowH);
      rX -= colWidths.spacer2;

      // 5. خلية حقل اللون
      ctx.fillStyle = rowBg;
      ctx.fillRect(rX - colWidths.color, curRowY, colWidths.color, rowH);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rX - colWidths.color, curRowY, colWidths.color, rowH);

      // استخدام الشارة المرفقة (PNG) بمقاس موائم ومناسب تماماً لارتفاع الصف مع إطار باللون المناسب
      const cellCenterX = rX - colWidths.color / 2;
      const cellCenterY = curRowY + rowH / 2;
      drawLevelBadge(levelMeta.level, cellCenterX, cellCenterY, tableBadgeSize);

      curRowY += rowH;
    });

    ctx.restore(); // استعادة بعد جسم الجدول

    // إطار جسم الجدول الخارجي باللون الأسود
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, marginX, tableBodyY, contentW, bodyTotalH, 10);
    ctx.stroke();

    // جعل لون الحد العلوي والسفلي لجسم الجدول عند الحقلين الفارغين أبيض تماماً
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    const bodyBottomY = tableBodyY + bodyTotalH;

    // عند spacer1 في جسم الجدول
    ctx.beginPath();
    ctx.moveTo(spacer1X, tableBodyY);
    ctx.lineTo(spacer1X + colWidths.spacer1, tableBodyY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(spacer1X, bodyBottomY);
    ctx.lineTo(spacer1X + colWidths.spacer1, bodyBottomY);
    ctx.stroke();

    // عند spacer2 في جسم الجدول
    ctx.beginPath();
    ctx.moveTo(spacer2X, tableBodyY);
    ctx.lineTo(spacer2X + colWidths.spacer2, tableBodyY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(spacer2X, bodyBottomY);
    ctx.lineTo(spacer2X + colWidths.spacer2, bodyBottomY);
    ctx.stroke();

    // ========================================================
    // بطاقة التقييم العام للتلميذ ومستوى الأداء اللوني والتوجيه التربوي:
    // - تكبير شارة التقييم العام بنسبة 100% من الحجم الحالي (204px)
    // - التقييم العام للتلميذ في سطر مستقل وسط الصفحة
    // - سطر فارغ تحت شارة التقييم العام
    // - زيادة ارتفاع سطر التوجيه التربوي ودعم التعلم وتكبير خطه
    // ========================================================
    const overallCardY = tableBodyY + bodyTotalH + 12;
    const overallBadgeSize = 204; // تكبير شارة التقييم العام بنسبة 100 % من الحجم السابق (204px)
    const overallCardH = 288; // زيادة ارتفاع البطاقة لتوسيع سطر التوجيه التربوي ودعم التعلم

    // حساب المستوى اللوني العام (بناءً على أغلبية التقييمات)
    let overallLevel: KgColorLevel = 'green';
    if (studentEvaluatedLevels.length > 0) {
      const counts: Record<KgColorLevel, number> = { blue: 0, green: 0, yellow: 0, red: 0 };
      studentEvaluatedLevels.forEach((lvl) => counts[lvl]++);

      if (counts.red > studentEvaluatedLevels.length / 3) {
        overallLevel = 'red';
      } else if (counts.yellow > studentEvaluatedLevels.length / 3) {
        overallLevel = 'yellow';
      } else if (counts.blue >= studentEvaluatedLevels.length / 2) {
        overallLevel = 'blue';
      } else {
        overallLevel = 'green';
      }
    }
    const overallMeta = KG_COLORS[overallLevel];

    // إطار بطاقة التقييم العام باللون الأسود
    drawRoundedRect(ctx, marginX, overallCardY, contentW, overallCardH, 12);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 1. السطر الأول: التقييم العام للتلميذ في سطر مستقل مع توسيط شارة التقييم العام في وسط الصفحة تماماً
    // cardCenterX هو منتصف الصفحة الدقيق (marginX + contentW / 2 = 620px من إجمالي 1240px)
    const cardCenterX = marginX + contentW / 2;
    const line1CenterY = overallCardY + 114; // توسيط الشارة رأسياً في الجزء العلوي

    const labelText = 'التقييم العام للتلميذ :';
    ctx.font = 'bold 24px "Cairo", sans-serif';
    const labelW = ctx.measureText(labelText).width;

    const titleBadgeText = overallMeta.title;
    ctx.font = '900 24px "Cairo", sans-serif';
    const titleBadgeW = ctx.measureText(titleBadgeText).width;

    const itemSpacing = 24;

    // رسم شارة التقييم العام في وسط الصفحة تماماً (cardCenterX) مكبرة (204px) مع إطارها الملون المناسب
    drawLevelBadge(overallLevel, cardCenterX, line1CenterY, overallBadgeSize);

    // كتابة "التقييم العام للتلميذ :" على يمين الشارة المركزية باللون الأسود
    const labelRightX = cardCenterX + overallBadgeSize / 2 + itemSpacing + labelW;
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px "Cairo", sans-serif';
    ctx.fillText(labelText, labelRightX, line1CenterY);

    // كتابة مسمى التقييم على يسار الشارة المركزية باللون الأسود العريض
    const titleRightX = cardCenterX - overallBadgeSize / 2 - itemSpacing;
    ctx.fillStyle = '#000000';
    ctx.font = '900 24px "Cairo", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(titleBadgeText, titleRightX, line1CenterY);

    // 2. سطر فارغ تحت شارة التقييم العام مع خط فاصل أنيق
    const dividerBetweenY = line1CenterY + overallBadgeSize / 2 + 14; // مسافة وسطر فارغ تحت الشارة المكبرة
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginX + 24, dividerBetweenY);
    ctx.lineTo(marginX + contentW - 24, dividerBetweenY);
    ctx.stroke();

    // 3. السطر الثاني تحته: زيادة ارتفاع سطر التوجيه التربوي ودعم التعلم وتكبير حجم الخط باللون الأسود
    const line2CenterY = dividerBetweenY + 32; // زيادة ارتفاع السطر ومسافته الرأسية
    const guidanceLabel = 'التوجيه التربوي ودعم التعلم : ';
    let guidanceFontSize = 19.5; // زيادة حجم خط التوجيه التربوي
    ctx.font = `bold ${guidanceFontSize}px "Cairo", sans-serif`;
    const guidanceLabelW = ctx.measureText(guidanceLabel).width;

    ctx.font = `bold ${guidanceFontSize}px "Cairo", sans-serif`;
    const guidanceTextW = ctx.measureText(overallMeta.actionGuidance).width;
    const totalLine2W = guidanceLabelW + guidanceTextW;

    if (totalLine2W < contentW - 48) {
      // توسيط سطر التوجيه التربوي كاملاً وسط الصفحة باللون الأسود
      const line2RightX = cardCenterX + totalLine2W / 2;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#000000'; // باللون الأسود
      ctx.font = `bold ${guidanceFontSize}px "Cairo", sans-serif`;
      ctx.fillText(guidanceLabel, line2RightX, line2CenterY);

      ctx.fillStyle = '#000000'; // باللون الأسود
      ctx.font = `${guidanceFontSize}px "Cairo", sans-serif`;
      ctx.fillText(overallMeta.actionGuidance, line2RightX - guidanceLabelW, line2CenterY);
    } else {
      // في حالة تجاوز العرض، ضبط الحجم ومحاذاة لليمين باللون الأسود
      let adjustedSize = guidanceFontSize;
      while (adjustedSize > 13 && ctx.measureText(guidanceLabel + overallMeta.actionGuidance).width > contentW - 56) {
        adjustedSize -= 0.5;
        ctx.font = `${adjustedSize}px "Cairo", sans-serif`;
      }
      const startGuidanceX = marginX + contentW - 24;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#000000'; // باللون الأسود
      ctx.font = `bold ${adjustedSize}px "Cairo", sans-serif`;
      ctx.fillText(guidanceLabel, startGuidanceX, line2CenterY);

      const adjLabelW = ctx.measureText(guidanceLabel).width;
      ctx.fillStyle = '#000000'; // باللون الأسود
      ctx.font = `${adjustedSize}px "Cairo", sans-serif`;
      ctx.fillText(overallMeta.actionGuidance, startGuidanceX - adjLabelW, line2CenterY);
    }

    // ========================================================
    // بطاقة المواظبة والسلوك وتوصيات المعلمة
    // - زيادة ارتفاع سطور المواظبة والتوصيات
    // - تكبير حجم الخط وباللون الأسود
    // ========================================================
    const notesY = overallCardY + overallCardH + 14;
    const notesH = 104; // زيادة ارتفاع البطاقة ليتسع لزيادة ارتفاع سطور المواظبة والتوصيات

    drawRoundedRect(ctx, marginX, notesY, contentW, notesH, 12);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#000000'; // إطار أسود
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // سطر المواظبة والسلوك (زيادة ارتفاع السطر وتكبير الخط باللون الأسود)
    const notesLine1Y = notesY + 32;
    ctx.fillStyle = '#000000'; // باللون الأسود
    ctx.font = 'bold 20px "Cairo", sans-serif'; // زيادة حجم الخط
    ctx.fillText('المواظبة والسلوك : ', marginX + contentW - 18, notesLine1Y);

    const notesLabelW = ctx.measureText('المواظبة والسلوك : ').width;
    ctx.font = 'bold 18px "Cairo", sans-serif'; // زيادة حجم الخط
    ctx.fillStyle = '#000000'; // باللون الأسود
    ctx.fillText(
      'نسبة الحضور : 98 %   |   السلوك : متميز ويتفاعل بإيجابية واهتمام مع أقرانه ومعلماته في كافة الأنشطة',
      marginX + contentW - 18 - notesLabelW - 8,
      notesLine1Y
    );

    // سطر توصيات المعلمة (زيادة ارتفاع السطر وتكبير الخط باللون الأسود مع تباعد مريح)
    const notesLine2Y = notesY + 74;
    ctx.font = 'bold 20px "Cairo", sans-serif'; // زيادة حجم الخط
    ctx.fillStyle = '#000000'; // باللون الأسود
    const recLabel = 'توصيات المعلمة : ';
    ctx.fillText(recLabel, marginX + contentW - 18, notesLine2Y);

    const teacherRecommendation = getRandomKgTeacherRecommendation(overallLevel, isFemale);
    const recLabelWidth = ctx.measureText(recLabel).width;
    const recStartX = marginX + contentW - 18 - recLabelWidth - 8;
    const maxRecWidth = recStartX - (marginX + 20);

    let recFontSize = 18.5; // زيادة حجم الخط
    ctx.font = `bold ${recFontSize}px "Cairo", sans-serif`;
    while (ctx.measureText(teacherRecommendation).width > maxRecWidth && recFontSize > 13) {
      recFontSize -= 0.5;
      ctx.font = `bold ${recFontSize}px "Cairo", sans-serif`;
    }

    ctx.fillStyle = '#000000'; // باللون الأسود
    ctx.fillText(teacherRecommendation, recStartX, notesLine2Y);

    // ========================================================
    // سطر التوقيعات فوق التذييل (بدون خط فاصل فوق معلمة الروضة):
    // إذا كان إخطار ولى الأمر:
    // سطر التوقيعات:
    const signaturesY = sigDividerY + 36;
    const signaturesDotsY = signaturesY + 32;
    ctx.font = 'bold 20px "Cairo", sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    const penSize = 39;

    if (isParentNotice) {
      // 3 أعمدة توقيعات متناسقة:
      // اليمين: معلمة الروضة
      // الوسط: مدير الروضة
      // أقصى اليسار تحت توصيات المعلمة: توقيع ولى الأمر
      const dots3ColText = '...............................';
      const dots3ColW = ctx.measureText(dots3ColText).width;

      const rightSigX = marginX + contentW - 160;
      const centerSigX = marginX + contentW / 2;
      const leftSigX = marginX + 160;

      // Right: معلمة الروضة
      ctx.fillText('معلمة الروضة', rightSigX, signaturesY);
      ctx.fillText(dots3ColText, rightSigX, signaturesDotsY);

      // Center: مدير الروضة
      ctx.fillText('مدير الروضة', centerSigX, signaturesY);
      ctx.fillText(dots3ColText, centerSigX, signaturesDotsY);

      // Left: توقيع ولى الأمر
      ctx.fillText('توقيع ولى الأمر', leftSigX, signaturesY);
      ctx.fillText(dots3ColText, leftSigX, signaturesDotsY);

      // رسم أقلام التوقيع
      const drawSignaturePen3 = (centerX: number) => {
        const penX = centerX + dots3ColW / 2 + 4;
        const penY = signaturesDotsY - penSize / 2 - 4;
        if (penIcon) {
          ctx.drawImage(penIcon, penX, penY, penSize, penSize);
        }
      };
      drawSignaturePen3(rightSigX);
      drawSignaturePen3(centerSigX);
      drawSignaturePen3(leftSigX);
    } else {
      const dotsText = '..........................................';
      const dotsW = ctx.measureText(dotsText).width;

      // Right: معلمة الروضة
      const rightSigX = marginX + contentW - 170;
      ctx.fillText('معلمة الروضة', rightSigX, signaturesY);
      ctx.fillText(dotsText, rightSigX, signaturesDotsY);

      // Left: مديرة / مدير الروضة
      const leftSigX = marginX + 170;
      ctx.fillText('مدير الروضة', leftSigX, signaturesY);
      ctx.fillText(dotsText, leftSigX, signaturesDotsY);

      // أيقونة قلم توقيع بجوار التنقيط من ناحية اليمين كالمعتاد
      const drawSignaturePen = (centerX: number) => {
        const penX = centerX + dotsW / 2 + 6;
        const penY = signaturesDotsY - penSize / 2 - 4;
        if (penIcon) {
          ctx.drawImage(penIcon, penX, penY, penSize, penSize);
        }
      };
      drawSignaturePen(rightSigX);
      drawSignaturePen(leftSigX);
    }

    // ========================================================
    // التذييل كالمعتاد (Standard Egyptian School Footer)
    // سطر التوقيعات: مسئول البيانات والمعلومات ورقم الصفحة والتاريخ في أقصى يسار الصفحة بفاصل بسيط
    // ========================================================
    const footerLineY = heightPx - 102;
    const hasFooterQr = Boolean(qrImage);
    const footerQrSize = 78;
    const footerQrX = marginX + contentW - footerQrSize;
    const footerQrY = footerLineY + 6;
    const footerAvailW = hasFooterQr ? contentW - footerQrSize - 16 : contentW;
    const footerCenterX = marginX + footerAvailW / 2;

    const pageNumberText = `صفحة ${sIdx + 1} من ${studentList.length}`;

    // الخط الفاصل في التذييل باللون الأسود
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(marginX, footerLineY);
    ctx.lineTo(marginX + contentW, footerLineY);
    ctx.stroke();

    // باركود QR Code (asd11.jpg) في الجانب الأيمن من التذييل بدون حدود كالمعتاد
    if (hasFooterQr && qrImage) {
      ctx.save();
      ctx.drawImage(qrImage, footerQrX, footerQrY, footerQrSize, footerQrSize);
      ctx.restore();
    }

    const footerTextY = heightPx - 76;
    ctx.direction = 'rtl';
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';

    const dataOfficerDisplay = dataOfficer.trim() ? dataOfficer.trim() : '................';
    const controlHeadDisplay = controlHead.trim() ? controlHead.trim() : '................';
    const committeeHeadDisplay = committeeHead.trim() ? committeeHead.trim() : '................';

    // 1. رقم الصفحة والتاريخ فى أقصى يسار الصفحة
    const pageInfoText = `${pageNumberText} - ${dateDisplay}`;
    let pageInfoFontSize = 13.5;
    ctx.font = `bold ${pageInfoFontSize}px "Cairo", sans-serif`;
    const pageInfoW = ctx.measureText(pageInfoText).width;
    const pageInfoLeftX = marginX + 16;
    ctx.textAlign = 'left';
    ctx.fillText(pageInfoText, pageInfoLeftX, footerTextY);

    // 2. سطر التوقيعات (مسئول البيانات والمعلومات - رئيس الكنترول - رئيس اللجنة) في يمين الصفحة في ملفات PDF الرأسية
    const signaturesFooterText = `مسئول البيانات والمعلومات : ${dataOfficerDisplay}   رئيس الكنترول : ${controlHeadDisplay}   رئيس اللجنة : ${committeeHeadDisplay}`;
    let footerFontSize = 15;
    ctx.font = `bold ${footerFontSize}px "Cairo", sans-serif`;

    const rightTargetX = marginX + footerAvailW - 16;
    const maxSigW = Math.max(300, rightTargetX - (pageInfoLeftX + pageInfoW + 24));

    while (footerFontSize > 9.5 && ctx.measureText(signaturesFooterText).width > maxSigW) {
      footerFontSize -= 0.5;
      ctx.font = `bold ${footerFontSize}px "Cairo", sans-serif`;
    }
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillText(signaturesFooterText, rightTargetX, footerTextY);

    // Horizontal Line (<hr>) and Bottom Sub-footer below Footer
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
    ctx.fillStyle = '#334155';

    const subFooterText = getActiveFooterTagline(selectedGrade, stage);
    let subFooterFontSize = 13.5;
    ctx.font = `bold ${subFooterFontSize}px "Cairo", sans-serif`;
    while (subFooterFontSize > 9.5 && ctx.measureText(subFooterText).width > footerAvailW - 16) {
      subFooterFontSize -= 0.5;
      ctx.font = `bold ${subFooterFontSize}px "Cairo", sans-serif`;
    }
    ctx.fillText(
      subFooterText,
      footerCenterX,
      subFooterTextY,
      footerAvailW - 16
    );

    // Snapshot canvas to high-quality JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const base64 = dataUrl.split(',')[1];
    const jpegBytes = base64ToUint8Array(base64);
    renderedPages.push({ jpegBytes, widthPx: canvas.width, heightPx: canvas.height });
  }

  // Build PDF binary in Portrait A4 (595.28 x 841.89 pt)
  const pdfBytes = buildPdfFromJpegPages(renderedPages, 595.28, 841.89);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const safeGrade = (selectedGrade || '').replace(/[\\/:*?"<>|]/g, '_').trim();
  const safeSemester = semText.replace(/[\\/:*?"<>|]/g, '_').trim();
  link.download = isParentNotice
    ? `إخطار_ولى_الأمر_تقييمات_التلميذ_رياض_الأطفال_${safeGrade}_${safeSemester}.pdf`
    : `تقرير_تقييمات_التلاميذ_رياض_الأطفال_${safeGrade}_${safeSemester}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
