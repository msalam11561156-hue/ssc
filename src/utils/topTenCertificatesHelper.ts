import { StudentData } from '../types';
import { 
  buildPdfFromJpegPages, 
  base64ToUint8Array, 
  evaluateStudentSemesterSummary,
  getSubjectsConfigForStageGrade 
} from './exportPdf';
import topTenCertTemplateUrl from '../assets/images/top_ten_cert_template.webp';
import royalCertTemplateUrl from '../assets/images/top_ten_cert_royal.jpg';
import ministryLogoUrl from '../assets/images/ministry_logo.png';
import qrCodeUrl from '../assets/images/asd11.jpg';

export interface RankedStudent {
  student: StudentData;
  rank: number;
  rankArabic: string;
  totalScore: number | string;
  percentage?: string;
  isFemale: boolean;
  statusText?: string;
}

export const ARABIC_MALE_RANKS: Record<number, string> = {
  1: 'الأول',
  2: 'الثاني',
  3: 'الثالث',
  4: 'الرابع',
  5: 'الخامس',
  6: 'السادس',
  7: 'السابع',
  8: 'الثامن',
  9: 'التاسع',
  10: 'العاشر',
};

export const ARABIC_FEMALE_RANKS: Record<number, string> = {
  1: 'الأولى',
  2: 'الثانية',
  3: 'الثالثة',
  4: 'الرابعة',
  5: 'الخامسة',
  6: 'السادسة',
  7: 'السابعة',
  8: 'الثامنة',
  9: 'التاسعة',
  10: 'العاشرة',
};

export function isFemaleStudent(student: StudentData): boolean {
  const rawGender = student.gender || '';
  const g = typeof rawGender === 'string' ? rawGender.trim().toLowerCase() : '';
  const nid = typeof student.nationalId === 'string' ? student.nationalId.trim() : '';
  const nidGenderDigit = nid.length >= 13 ? parseInt(nid[12], 10) : NaN;
  const isFemaleByNid = !isNaN(nidGenderDigit) && nidGenderDigit % 2 === 0;

  if (
    g === 'female' ||
    g === 'أنثى' ||
    g === 'انثى' ||
    g === 'بنت' ||
    g.includes('أنث') ||
    g.includes('انث') ||
    g.includes('بنت')
  ) {
    return true;
  }
  if (!g && isFemaleByNid) {
    return true;
  }

  // Common female Arabic name endings heuristic if gender is unset
  const name = (student.name || '').trim();
  const firstName = name.split(/\s+/)[0] || '';
  if (firstName.endsWith('ة') || firstName.endsWith('اء') || firstName.endsWith('ى')) {
    return true;
  }

  return false;
}

export function isStudentDamg(student: StudentData): boolean {
  if (student.studentStatus === 'دمج') return true;
  if (student.studentStatus === 'نظامى' || student.studentStatus === 'عادى') return false;
  const rawStatus = (student.enrollmentStatus || '').trim();
  return (
    rawStatus.includes('دمج') ||
    Boolean(student.enrollmentType?.includes('دمج'))
  );
}

/**
 * Calculates and returns the top 10 students with rank, scores, and gender.
 */
export function getTopTenRankedStudents(
  students: StudentData[],
  stage: string = 'primary',
  selectedGrade: string = '',
  semester: string = 'first',
  isDamgOnly: boolean | 'all' = false,
  limit: number = 10
): RankedStudent[] {
  if (!students || students.length === 0) return [];

  const targetSem: 'first' | 'second' =
    semester === 'second' || semester === 'الفصل الدراسي الثاني' || semester === 'الفصل الدراسي الثانى'
      ? 'second'
      : 'first';

  // Filter students by damg status if needed
  let filtered = students.filter((s) => {
    if (isDamgOnly === 'all') return true;
    const isDamg = isStudentDamg(s);
    return isDamgOnly ? isDamg : !isDamg;
  });

  // If filtered list is empty, fallback to all available students
  if (filtered.length === 0) {
    filtered = [...students];
  }

  // Calculate scores and evaluation summaries
  const evaluatedList = filtered.map((student) => {
    let summary: any;
    try {
      summary = evaluateStudentSemesterSummary(student, targetSem, stage, selectedGrade);
    } catch {
      summary = { status: 'pass', addedTotal: null, percentage: '100%' };
    }

    let addedTotal: number | null = summary?.addedTotal ?? null;

    // Fallback: sum numerical grades if summary total is null or incomplete
    if (addedTotal === null || isNaN(addedTotal)) {
      const exams =
        student.writtenExams?.[targetSem] ||
        student.writtenExams?.first ||
        student.assessments?.[targetSem] ||
        student.assessments?.first ||
        {};
      let sum = 0;
      let count = 0;
      Object.values(exams).forEach((val) => {
        if (typeof val === 'string' && val.trim() !== '' && val !== '-' && val !== 'غ') {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            sum += num;
            count++;
          }
        }
      });
      addedTotal = count > 0 ? Math.round(sum * 10) / 10 : 0;
    }

    return {
      student,
      addedTotal: addedTotal || 0,
      percentage: summary?.percentage || '',
      status: summary?.status || 'pass',
    };
  });

  // Sort descending by added total score
  evaluatedList.sort((a, b) => b.addedTotal - a.addedTotal);

  // Take top N (if limit is 0 or negative, take all)
  const resultList = limit > 0 ? evaluatedList.slice(0, limit) : evaluatedList;

  return resultList.map((item, idx) => {
    const rank = idx + 1;
    const female = isFemaleStudent(item.student);
    const rankArabic = female
      ? (ARABIC_FEMALE_RANKS[rank] || `المركز ${rank}`)
      : (ARABIC_MALE_RANKS[rank] || `المركز ${rank}`);

    return {
      student: item.student,
      rank,
      rankArabic,
      totalScore: item.addedTotal,
      percentage: item.percentage,
      isFemale: female,
      statusText: item.status,
    };
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback try without crossOrigin
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = () => resolve(null);
      fallbackImg.src = src;
    };
    img.src = src;
  });
}

function drawDefaultSchoolCrest(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  schoolName: string
) {
  const bgGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  bgGrad.addColorStop(0, '#ffffff');
  bgGrad.addColorStop(1, '#f1f5f9');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // Soft laurel wreath circle
  ctx.strokeStyle = '#c29b38';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  // Book emblem icon
  ctx.fillStyle = '#0a2240';
  ctx.beginPath();
  ctx.moveTo(cx, cy + 16);
  ctx.quadraticCurveTo(cx - 30, cy + 24, cx - 48, cy + 18);
  ctx.lineTo(cx - 48, cy - 26);
  ctx.quadraticCurveTo(cx - 30, cy - 20, cx, cy - 30);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy + 16);
  ctx.quadraticCurveTo(cx + 30, cy + 24, cx + 48, cy + 18);
  ctx.lineTo(cx + 48, cy - 26);
  ctx.quadraticCurveTo(cx + 30, cy - 20, cx, cy - 30);
  ctx.closePath();
  ctx.fill();

  // Book spine
  ctx.strokeStyle = '#c29b38';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 30);
  ctx.lineTo(cx, cy + 28);
  ctx.stroke();

  // Star on top
  ctx.fillStyle = '#c29b38';
  ctx.beginPath();
  ctx.arc(cx, cy - 44, 6, 0, Math.PI * 2);
  ctx.fill();

  // School Crest Text
  ctx.font = 'bold 16px "Cairo", sans-serif';
  ctx.fillStyle = '#0a2240';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = schoolName.trim() ? schoolName.trim().slice(0, 18) : 'شعار المدرسة';
  ctx.fillText(label, cx, cy + 50, radius * 1.6);
}

export interface RenderCertificateOptions {
  schoolName?: string;
  administration?: string;
  selectedGrade?: string;
  stage?: string;
  academicYear?: string;
  showCustomSignatures?: boolean;
  schoolPrincipal?: string;
  controlHead?: string;
  schoolLogo?: string;
  issueDate?: string;
  design?: 'classic' | 'royal';
  hideRank?: boolean;
  shiftNameDown?: boolean;
}

/**
 * Draws a single appreciation certificate on an HTML Canvas.
 */
export async function renderTopTenCertificateToCanvas(
  canvas: HTMLCanvasElement,
  rankedItem: RankedStudent,
  options: RenderCertificateOptions = {},
  cachedTemplateImg?: HTMLImageElement | null
): Promise<void> {
  const widthPx = 2268;
  const heightPx = 1590;

  canvas.width = widthPx;
  canvas.height = heightPx;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Load template image
  let templateImg = cachedTemplateImg;
  if (!templateImg) {
    const targetUrl = options.design === 'royal' ? royalCertTemplateUrl : topTenCertTemplateUrl;
    templateImg = await loadImage(targetUrl);
    if (!templateImg && options.design !== 'royal') {
      templateImg = await loadImage('/assets/images/top_ten_cert_template.webp');
    }
  }

  // 2. Draw background template
  if (templateImg) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(templateImg, 0, 0, widthPx, heightPx);

    // Erase pre-printed elements in templates without background distortion (content-aware clean parchment sampling)
    if (options.design === 'royal') {
      try {
        // Left signature line patch (X: 430 to 890)
        ctx.drawImage(canvas, 430, 1240, 460, 12, 430, 1254, 460, 22);
        // Right signature line patch (X: 1370 to 1830)
        ctx.drawImage(canvas, 1370, 1240, 460, 12, 1370, 1254, 460, 22);

        // Erase bottom school building picture completely (X: 880 to 1380, Y: 1050 to 1520)
        const patchY = 1050;
        const patchH = 470;
        ctx.drawImage(canvas, 550, patchY, 200, patchH, 880, patchY, 200, patchH);
        ctx.drawImage(canvas, 550, patchY, 200, patchH, 1080, patchY, 200, patchH);
        ctx.drawImage(canvas, 550, patchY, 100, patchH, 1280, patchY, 100, patchH);
        ctx.drawImage(canvas, 1520, patchY, 100, patchH, 1330, patchY, 100, patchH);
      } catch (e) {
        console.error('Error erasing pre-printed royal template elements:', e);
      }
    } else {
      try {
        // Erase bottom golden stamp completely in classic template (X: 880 to 1380, Y: 1050 to 1520)
        const patchY = 1050;
        const patchH = 470;
        ctx.drawImage(canvas, 550, patchY, 200, patchH, 880, patchY, 200, patchH);
        ctx.drawImage(canvas, 550, patchY, 200, patchH, 1080, patchY, 200, patchH);
        ctx.drawImage(canvas, 550, patchY, 100, patchH, 1280, patchY, 100, patchH);
        ctx.drawImage(canvas, 1520, patchY, 100, patchH, 1330, patchY, 100, patchH);
      } catch (e) {
        console.error('Error erasing pre-printed classic template golden stamp:', e);
      }
    }
  } else {
    // Elegant fallback background
    ctx.fillStyle = '#faf6eb';
    ctx.fillRect(0, 0, widthPx, heightPx);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 20;
    ctx.strokeRect(30, 30, widthPx - 60, heightPx - 60);
  }

  const centerX = widthPx / 2;
  const isFemale = rankedItem.isFemale;
  const studentName = (rankedItem.student.name || (isFemale ? 'طالبة' : 'طالب')).trim();

  // Helper text drawer
  const drawCenteredText = (
    text: string,
    y: number,
    font: string,
    fillStyle: string,
    maxWidth: number = 1900,
    shadow = false
  ) => {
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
    ctx.fillStyle = fillStyle;
    if (shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
    }
    ctx.fillText(text, centerX, y, maxWidth);
    ctx.restore();
  };

  // 3. Institution header (الادارة - المدرسة)
  let rawAdmin = (options.administration || '').trim();
  let rawSchool = (options.schoolName || '').trim();

  try {
    const saved = localStorage.getItem('sheet_control_school_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!rawAdmin && parsed.administration) rawAdmin = parsed.administration.trim();
      if (!rawSchool && parsed.schoolName) rawSchool = parsed.schoolName.trim();
    }
    if (!rawAdmin) {
      rawAdmin = (localStorage.getItem('school_administration') || localStorage.getItem('administration') || '').trim();
    }
    if (!rawSchool) {
      rawSchool = (localStorage.getItem('school_name') || localStorage.getItem('schoolName') || '').trim();
    }
  } catch {}

  let adminPart = rawAdmin;
  if (adminPart && !adminPart.startsWith('إدارة') && !adminPart.startsWith('ادارة')) {
    adminPart = `إدارة ${adminPart}`;
  }

  let schoolPart = rawSchool;
  if (schoolPart && !schoolPart.startsWith('مدرسة') && !schoolPart.startsWith('مدرسه')) {
    schoolPart = `مدرسة ${schoolPart}`;
  }

  let institutionLine = '';
  let stageNameForHeader = '';
  if (options.stage === 'primary') stageNameForHeader = 'المرحلة الابتدائية';
  else if (options.stage === 'prep' || options.stage === 'middle') stageNameForHeader = 'المرحلة الاعدادية';
  else if (options.stage === 'secondary') stageNameForHeader = 'المرحلة الثانوية';

  const baseInst = (adminPart && schoolPart) ? `${adminPart} - ${schoolPart}` : (schoolPart || adminPart || 'الإدارة التعليمية - المدرسة');
  institutionLine = stageNameForHeader ? `${baseInst} - ${stageNameForHeader}` : baseInst;

  // 3. Top Center School Logo
  let schoolLogoSrc = (options.schoolLogo || '').trim();
  try {
    if (!schoolLogoSrc) {
      const savedSchool = localStorage.getItem('sheet_control_school_data');
      if (savedSchool) {
        const parsed = JSON.parse(savedSchool);
        if (parsed.schoolLogo) schoolLogoSrc = parsed.schoolLogo.trim();
      }
      if (!schoolLogoSrc) {
        schoolLogoSrc = (
          localStorage.getItem('sheet_control_school_logo') ||
          localStorage.getItem('school_logo') ||
          localStorage.getItem('schoolLogo') ||
          ''
        ).trim();
      }
    }
  } catch {}

  const logoCenterX = options.design === 'royal' ? 510 : centerX + 6; // Set to 510 for Royal, 1140 for Classic
  const logoCenterY = options.design === 'royal' ? 380 : 272;
  const logoRadius = options.design === 'royal' ? 104 : 160;

  let loadedLogoImg: HTMLImageElement | null = null;
  if (schoolLogoSrc) {
    loadedLogoImg = await loadImage(schoolLogoSrc);
  }
  if (!loadedLogoImg) {
    loadedLogoImg = await loadImage(ministryLogoUrl);
  }

  const frameColor = options.design === 'royal' ? '#d4af37' : '#000000';
  const innerFrameColor = options.design === 'royal' ? '#0a2240' : '#000000';

  ctx.save();
  // Outer Frame Ring
  ctx.beginPath();
  ctx.arc(logoCenterX, logoCenterY, logoRadius + 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 5;
  ctx.stroke();

  // Inner Frame Ring
  ctx.beginPath();
  ctx.arc(logoCenterX, logoCenterY, logoRadius + 1, 0, Math.PI * 2);
  ctx.strokeStyle = innerFrameColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Clip area for logo content
  ctx.beginPath();
  ctx.arc(logoCenterX, logoCenterY, logoRadius, 0, Math.PI * 2);
  ctx.clip();

  if (loadedLogoImg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(logoCenterX - logoRadius, logoCenterY - logoRadius, logoRadius * 2, logoRadius * 2);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      loadedLogoImg,
      logoCenterX - logoRadius,
      logoCenterY - logoRadius,
      logoRadius * 2,
      logoRadius * 2
    );
  } else {
    drawDefaultSchoolCrest(ctx, logoCenterX, logoCenterY, logoRadius, rawSchool || 'شعار المدرسة');
  }
  ctx.restore();

  const introY = options.design === 'royal' ? 670 : 660;

  drawCenteredText(
    institutionLine,
    introY,
    'bold 30.6px "Cairo", sans-serif',
    '#78350f',
    1900,
    true
  );

  // 5. Main Student Honor Title & Name
  const studentPrefix = isFemale ? 'الطالبة :' : 'الطالب :';
  const fullStudentLine = `${studentPrefix} ${studentName}`;
  
  let nameY = options.design === 'royal' ? 770 : 772;
  if (options.hideRank) {
    nameY += 60; // Shift down by one line as requested for All Students certificates
  }

  drawCenteredText(
    fullStudentLine,
    nameY,
    'bold 62px "Cairo", "Amiri", sans-serif',
    '#000000',
    1920,
    true
  );

  // 6. Distinction Rank Ribbon & Details
  let rawGradeStr = (options.selectedGrade || '').trim();
  let cleanGrade = rawGradeStr;
  if (rawGradeStr.includes('modern_medical') || rawGradeStr.includes('الطب')) {
    cleanGrade = 'الصف الثاني الثانوي - مسار الطب وعلوم الحياة';
  } else if (rawGradeStr.includes('modern_engineering') || rawGradeStr.includes('الهندسة')) {
    cleanGrade = 'الصف الثاني الثانوي - مسار الهندسة وعلوم الحاسب';
  } else if (rawGradeStr.includes('modern_business') || rawGradeStr.includes('الأعمال')) {
    cleanGrade = 'الصف الثاني الثانوي - مسار الأعمال';
  } else if (rawGradeStr.includes('modern_arts') || rawGradeStr.includes('الآداب')) {
    cleanGrade = 'الصف الثاني الثانوي - مسار الآداب والفنون';
  } else if (rawGradeStr.includes('scientific') || rawGradeStr.includes('علمي')) {
    cleanGrade = 'الصف الثاني الثانوي - الشعبة العلمية';
  } else if (rawGradeStr.includes('literary') || rawGradeStr.includes('أدبي')) {
    cleanGrade = 'الصف الثاني الثانوي - الشعبة الأدبية';
  } else {
    cleanGrade = rawGradeStr.replace(/^الصف\s*/, 'الصف ').trim() || 'الصف الدراسي';
  }

  const scoreBadge =
    rankedItem.totalScore !== undefined && rankedItem.totalScore !== null && rankedItem.totalScore !== ''
      ? ` بمجموع ( ${rankedItem.totalScore} ) `
      : '';
  const percentageBadge =
    rankedItem.percentage !== undefined && rankedItem.percentage !== null && rankedItem.percentage !== ''
      ? ` ونسبة مئوية ( ${rankedItem.percentage} ) `
      : '';
  if (!options.hideRank) {
    const distinctionText = isFemale
      ? `★ الحاصلة على المركز ${rankedItem.rankArabic} على مستوى ${cleanGrade}${scoreBadge}${percentageBadge}★`
      : `★ الحاصل على المركز ${rankedItem.rankArabic} على مستوى ${cleanGrade}${scoreBadge}${percentageBadge}★`;
    drawCenteredText(
      distinctionText,
      options.design === 'royal' ? 855 : 850,
      'bold 34px "Cairo", sans-serif',
      '#78350f',
      1880
    );
  }

  // 7. Recognition / Citation Paragraph (3 lines)
  const academicYear = options.academicYear || '- 2026 - 2027 م';
  const citeLine1 = isFemale
    ? 'تقديرًا لتميزها الأكاديمي ، وتفوقها الملحوظ في الدراسة ، ومشاركتها الفعالة'
    : 'تقديرًا لتميزه الأكاديمي ، وتفوقه الملحوظ في الدراسة ، ومشاركته الفعالة';
  const citeLine2 = isFemale
    ? `وسلوكها المثالي خلال العام الدراسي ${academicYear}`
    : `وسلوكه المثالي خلال العام الدراسي ${academicYear}`;
  const citeLine3 = isFemale
    ? 'مع تمنياتنا لها بمستقبل مشرق ومزيد من النجاح والتوفيق.'
    : 'مع تمنياتنا له بمستقبل مشرق ومزيد من النجاح والتوفيق.';

  drawCenteredText(citeLine1, options.design === 'royal' ? 945 : 936, 'bold 31px "Cairo", sans-serif', '#000000', 1880);
  drawCenteredText(citeLine2, options.design === 'royal' ? 1005 : 994, 'bold 31px "Cairo", sans-serif', '#000000', 1880);
  drawCenteredText(citeLine3, options.design === 'royal' ? 1065 : 1052, 'bold 31px "Cairo", sans-serif', '#000000', 1880);

  // خط فضي متدرج (<hr> فضي) فوق نص المنظومة الرقمية
  const hrLineY = options.design === 'royal' ? 1094 : 1081;
  const taglineY = options.design === 'royal' ? 1125 : 1112;

  const hrWidth = 800;
  const hrStartX = centerX - hrWidth / 2;
  const hrEndX = centerX + hrWidth / 2;

  ctx.save();
  const silverGrad = ctx.createLinearGradient(hrStartX, hrLineY, hrEndX, hrLineY);
  silverGrad.addColorStop(0, 'rgba(148, 163, 184, 0)');
  silverGrad.addColorStop(0.2, '#94a3b8');
  silverGrad.addColorStop(0.5, '#cbd5e1');
  silverGrad.addColorStop(0.8, '#94a3b8');
  silverGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');

  ctx.strokeStyle = silverGrad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(hrStartX, hrLineY);
  ctx.lineTo(hrEndX, hrLineY);
  ctx.stroke();
  ctx.restore();

  drawCenteredText(
    'المنظومة الرقمية الريادة اعمال المدارس المصرية 01098594956',
    taglineY,
    'bold 18px "Cairo", sans-serif',
    '#334155',
    1880
  );

  // drawCenteredText(
  //   'تحريراً في ......................... هـ',
  //   options.design === 'royal' ? 1160 : 1150,
  //   'bold 24px "Cairo", sans-serif',
  //   '#000000',
  //   1880
  // );

  // 8. Custom School Signatures (Right: رئيس الكنترول, Left: مدير المدرسة)
  // Drawn on 3 independent lines with 100% doubled signature dots
  let controlHead = (options.controlHead || '').trim();
  let schoolPrincipal = (options.schoolPrincipal || '').trim();
  try {
    if (!controlHead || !schoolPrincipal) {
      const savedControl = localStorage.getItem('sheet_control_control_data_by_stage');
      if (savedControl) {
        const parsed = JSON.parse(savedControl);
        const stKey = options.stage || '';
        const cur = parsed[stKey] || parsed[''] || Object.values(parsed)[0];
        if (cur) {
          if (!controlHead && cur.controlHead) controlHead = cur.controlHead.trim();
          if (!schoolPrincipal && cur.committeeHead) schoolPrincipal = cur.committeeHead.trim();
        }
      }
    }
    if (!controlHead) controlHead = (localStorage.getItem('school_control_head') || '').trim();
    if (!schoolPrincipal) schoolPrincipal = (localStorage.getItem('school_committee_head') || '').trim();
  } catch {}

  const rightX = 1650; // ناحية اليمين: رئيس الكنترول
  const leftX = 625;   // ناحية اليسار: مدير المدرسة
  const sigY = options.design === 'royal' ? 1195 : 1190;
  const doubledDots = '........................................'; // 40 نقاط (زيادة 100%)

  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';

  // Right Side (ناحية اليمين): رئيس الكنترول
  // سطر 1: رئيس الكنترول
  ctx.font = 'bold 31px "Cairo", sans-serif';
  ctx.fillText('رئيس الكنترول', rightX, sigY);

  // سطر 2: اسم رئيس الكنترول
  const controlHeadNameText = controlHead || '....................';
  ctx.font = 'bold 27px "Cairo", sans-serif';
  ctx.fillText(controlHeadNameText, rightX, sigY + 52);

  // سطر 3: التوقيع مع زيادة عدد النقاط 100%
  ctx.font = 'bold 25px "Cairo", sans-serif';
  ctx.fillText(`التوقيع : ${doubledDots}`, rightX, sigY + 104);

  // سطر 4: تحريرا في
  // ctx.font = '20px "Cairo", sans-serif';
  // ctx.fillText('تحريراً في ..... / ..... / .......... م', rightX, sigY + 140);

  // Left Side (ناحية اليسار): مدير المدرسة
  // سطر 1: مدير المدرسة
  ctx.font = 'bold 31px "Cairo", sans-serif';
  ctx.fillText('مدير المدرسة', leftX, sigY);

  // سطر 2: اسم مدير المدرسة
  const principalNameText = schoolPrincipal || '....................';
  ctx.font = 'bold 27px "Cairo", sans-serif';
  ctx.fillText(principalNameText, leftX, sigY + 52);

  // سطر 3: التوقيع مع زيادة عدد النقاط 100%
  ctx.font = 'bold 25px "Cairo", sans-serif';
  ctx.fillText(`التوقيع : ${doubledDots}`, leftX, sigY + 104);

  // سطر 4: تحريرا في
  // ctx.font = '20px "Cairo", sans-serif';
  // ctx.fillText('تحريراً في ..... / ..... / .......... م', leftX, sigY + 140);

  // Draw QR Code in the middle
  const qrCodeImg = await loadImage(qrCodeUrl);
  if (qrCodeImg) {
    const qrSize = 176; // 110 * 1.6
    const gap = 10;
    const borderWidth = 6;
    const qrX = centerX - qrSize / 2;
    const qrY = sigY - 20;

    // Draw Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = borderWidth;
    ctx.beginPath();
    ctx.roundRect(qrX - gap - borderWidth/2, qrY - gap - borderWidth/2, qrSize + (gap + borderWidth/2) * 2, qrSize + (gap + borderWidth/2) * 2, 25);
    ctx.stroke();

    // Round and Draw QR image
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(qrX, qrY, qrSize, qrSize, 15);
    ctx.clip();
    ctx.drawImage(qrCodeImg, qrX, qrY, qrSize, qrSize);
    ctx.restore();
  }

  ctx.restore();
}

export interface ExportTopTenCertificatesPdfOptions {
  students: StudentData[];
  stage?: string;
  selectedGrade?: string;
  semester?: string;
  title?: string;
  schoolName?: string;
  administration?: string;
  schoolPrincipal?: string;
  controlHead?: string;
  schoolLogo?: string;
  isDamgOnly?: boolean | 'all';
  singleStudentIndex?: number; // Optional: print only one student
  showCustomSignatures?: boolean;
  design?: 'classic' | 'royal';
  hideRank?: boolean;
  shiftNameDown?: boolean;
  limit?: number;
}

/**
 * Generates and downloads a multi-page PDF with appreciation certificates for top 10 students.
 */
export async function exportTopTenCertificatesPdf(
  options: ExportTopTenCertificatesPdfOptions
): Promise<void> {
  const {
    students,
    stage = 'primary',
    selectedGrade = '',
    semester = 'first',
    title = '',
    schoolName = '',
    administration = '',
    schoolPrincipal = '',
    controlHead = '',
    isDamgOnly = false,
    singleStudentIndex,
    showCustomSignatures = false,
    design = 'classic',
    hideRank = false,
    limit = 10,
  } = options;

  try {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }
  } catch {}

  const rankedStudents = getTopTenRankedStudents(
    students,
    stage,
    selectedGrade,
    semester,
    isDamgOnly,
    limit
  );

  if (rankedStudents.length === 0) {
    alert('لا توجد بيانات طلاب لتوليد شهادات التقدير');
    return;
  }

  const targetList =
    typeof singleStudentIndex === 'number' && singleStudentIndex >= 0 && singleStudentIndex < rankedStudents.length
      ? [rankedStudents[singleStudentIndex]]
      : rankedStudents;

  // Preload template image once
  let templateImg = await loadImage(design === 'royal' ? royalCertTemplateUrl : topTenCertTemplateUrl);
  if (!templateImg && design !== 'royal') {
    templateImg = await loadImage('/assets/images/top_ten_cert_template.webp');
  }

  const canvas = document.createElement('canvas');
  const renderedPages: { jpegBytes: Uint8Array; widthPx: number; heightPx: number }[] = [];

  for (let i = 0; i < targetList.length; i++) {
    const item = targetList[i];
    await renderTopTenCertificateToCanvas(
      canvas,
      item,
      {
        schoolName,
        administration,
        selectedGrade,
        stage,
        schoolPrincipal,
        controlHead,
        showCustomSignatures,
        design,
        hideRank,
      },
      templateImg
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const base64 = dataUrl.split(',')[1];
    const jpegBytes = base64ToUint8Array(base64);
    renderedPages.push({
      jpegBytes,
      widthPx: canvas.width,
      heightPx: canvas.height,
    });
  }

  // A4 Landscape dimensions in points
  const widthPt = 841.89;
  const heightPt = 595.28;

  const pdfBytes = buildPdfFromJpegPages(renderedPages, widthPt, heightPt);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const cleanGrade = (selectedGrade || '').replace(/[\\/:*?"<>|]/g, '_');
  const studentSuffix =
    targetList.length === 1 ? `_${targetList[0].student.name.replace(/[\\/:*?"<>|]/g, '_')}` : '';
  const damgSuffix = isDamgOnly ? '_دمج' : '';
  link.download = `شهادات_تقدير_العشرة_الأوائل${damgSuffix}_${cleanGrade}${studentSuffix}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
