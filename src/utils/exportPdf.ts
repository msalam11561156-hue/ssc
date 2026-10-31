import { StudentData } from '../types';
import { applyEntityTerms } from '../i18n';
import { getGradingSettings, getPrimaryStudentMercyBoosts, roundToOneDecimal, formatToOneDecimal } from './gradingSettings';
import { getStoredSubjectEn } from './subjectLanguage';
import { sortStudents, SortCriterion } from './studentSorting';
import { getActiveFooterTagline } from './adFilter';
import qrCodeUrl from '../assets/images/asd11.jpg';
const ministryLogoUrl = '';

const isNumericGrade = (v: string): boolean => {
  if (!v) return false;
  const trimmed = v.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === 'غ') return false;
  if (/[\u0600-\u06FFa-zA-Z]/.test(trimmed)) return false;
  return !isNaN(Number(trimmed));
};

function cropImageToCircleCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const w = img.naturalWidth || img.width || 300;
  const h = img.naturalHeight || img.height || 300;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext('2d');

  let srcX = 0;
  let srcY = 0;
  let srcW = w;
  let srcH = h;

  if (tempCtx) {
    tempCtx.drawImage(img, 0, 0, w, h);
    try {
      const imgData = tempCtx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const getPixel = (x: number, y: number) => {
        const idx = (y * w + x) * 4;
        return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
      };
      const corners = [
        getPixel(0, 0),
        getPixel(w - 1, 0),
        getPixel(0, h - 1),
        getPixel(w - 1, h - 1),
      ];
      const avgAlpha = (corners[0][3] + corners[1][3] + corners[2][3] + corners[3][3]) / 4;
      const bgR = (corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4;
      const bgG = (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4;
      const bgB = (corners[0][2] + corners[1][2] + corners[2][2] + corners[3][2]) / 4;

      let minX = w;
      let minY = h;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a < 40) continue;

          if (avgAlpha > 30) {
            const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
            const chroma = Math.max(r, g, b) - Math.min(r, g, b);
            const isLightShadow = r > 165 && g > 165 && b > 165 && chroma < 18;
            if (diff < 45 || isLightShadow) continue;
          }

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      const detW = maxX - minX + 1;
      const detH = maxY - minY + 1;
      if (detW > w * 0.4 && detH > h * 0.4) {
        const insetX = detW * 0.015;
        const insetY = detH * 0.015;
        srcX = minX + insetX;
        srcY = minY + insetY;
        srcW = Math.max(1, detW - insetX * 2);
        srcH = Math.max(1, detH - insetY * 2);
      }
    } catch {
      // Fallback to full image bounds
    }
  }

  const outSize = 600;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outSize;
  outCanvas.height = outSize;
  const outCtx = outCanvas.getContext('2d');
  if (outCtx) {
    outCtx.save();
    outCtx.beginPath();
    outCtx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
    outCtx.closePath();
    outCtx.clip();
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outSize, outSize);
    outCtx.restore();
  }
  return outCanvas;
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

export type PdfReportType =
  | 'students_data'
  | 'calling_list'
  | 'seat_numbers'
  | 'seat_numbers_default'
  | 'seat_numbers_model_1'
  | 'seat_numbers_model_2'
  | 'seat_numbers_model_3'
  | 'seat_numbers_model_4'
  | 'seat_numbers_model_5'
  | 'seat_numbers_model_6'
  | 'seat_numbers_model_7'
  | 'seat_numbers_no_qr'
  | 'seat_numbers_english'
  | 'seat_numbers_english_default'
  | 'seat_numbers_english_model_1'
  | 'seat_numbers_english_model_2'
  | 'seat_numbers_english_model_3'
  | 'seat_numbers_english_model_4'
  | 'seat_numbers_english_model_5'
  | 'seat_numbers_english_model_6'
  | 'seat_numbers_english_model_7'
  | 'secret_numbers'
  | 'passed_first_semester'
  | 'passed_second_semester'
  | 'failed_first_semester'
  | 'failed_second_semester'
  | 'second_round_students'
  | 'top_ten_students'
  | 'top_ten_damg_students'
  | 'mercy_grades_students'
  | 'subject_passed_first_semester'
  | 'subject_failed_first_semester'
  | 'subject_passed_second_semester'
  | 'subject_failed_second_semester'
  | 'subject_second_round'
  | 'general_statistics'
  | 'statistics_and_charts'
  | 'control_sheet'
  | 'blank_control_sheet'
  | 'custom_control_sheet'
  | 'kg_student_evaluations_report'
  | 'kg_parent_notice'
  | 'student_semester_grades_certificate'
  | 'student_semester_grades_certificate_en'
  | 'student_semester_grades_assessments_certificate_en'
  | 'student_semester_grades_assessments_certificate_detailed_en'
  | 'top_ten_students_certificate'
  | 'top_ten_students_certificates'
  | 'top_ten_damg_students_certificate'
  | 'top_ten_damg_students_certificates'
  | 'all_students_certificates';

export interface CustomControlSheetOptions {
  includeMainData: boolean;
  includeStudentData: boolean;
  includeAddedSubjects: boolean;
  includeNonAddedSubjects: boolean;
}

export type RowBgTheme =
  | 'theme_black'
  | 'theme_red'
  | 'theme_white'
  | 'attachment_1'
  | 'attachment_2'
  | 'attachment_3'
  | 'attachment_4'
  | 'theme_pink'
  | 'theme_peach'
  | 'theme_yellow';

/**
 * Returns alternating row background colors for generated printed files.
 * Row 0 and all even rows are Pure White (#ffffff).
 * Alternating (odd) rows are tinted according to the 4 attachment references or custom palette:
 *  - Theme Black: Alternating rows in Pure Black (#000000) with crisp white text
 *  - Theme White: All rows in Pure White (#ffffff) without alternating tint
 *  - Attachment 1 (Warm Cream): Control Sheet, Blank Control Sheet, Top 10, Mercy Candidates
 *  - Attachment 2 (Soft Mint Green): Passed Students (1st & 2nd Semester, Subject Passed)
 *  - Attachment 3 (Soft Sky Blue): Student Data, Calling Lists, Secret Numbers, Seat Numbers
 *  - Attachment 4 (Soft Neutral Gray): Failed Students, Second Round, General Statistics & Charts
 */
export function getReportRowBgColors(
  reportType?: PdfReportType,
  isControlSheet?: boolean,
  forcedTheme?: RowBgTheme
): { evenBg: string; oddBg: string; theme: RowBgTheme } {
  const evenBg = '#ffffff';

  let theme: RowBgTheme = 'attachment_1';

  if (forcedTheme) {
    theme = forcedTheme;
  } else {
    const isPassedTheme =
      reportType === 'passed_first_semester' ||
      reportType === 'passed_second_semester' ||
      reportType === 'subject_passed_first_semester' ||
      reportType === 'subject_passed_second_semester';

    const isFailedOrSecondRoundOrStats =
      reportType === 'failed_first_semester' ||
      reportType === 'failed_second_semester' ||
      reportType === 'subject_failed_first_semester' ||
      reportType === 'subject_failed_second_semester' ||
      reportType === 'second_round_students' ||
      reportType === 'subject_second_round' ||
      reportType === 'general_statistics' ||
      reportType === 'statistics_and_charts';

    const isStudentDataTheme =
      reportType === 'students_data' ||
      reportType === 'calling_list' ||
      reportType === 'secret_numbers' ||
      Boolean(reportType && reportType.startsWith('seat_numbers'));

    if (isPassedTheme) {
      theme = 'attachment_2';
    } else if (isStudentDataTheme) {
      theme = 'attachment_3';
    } else if (isFailedOrSecondRoundOrStats) {
      theme = 'attachment_4';
    } else {
      // Attachment 1: Control sheet, blank control sheet, top 10, mercy candidates
      theme = 'attachment_1';
    }
  }

  // Base colors lightened by 25% with pure white (Color * 0.75 + 255 * 0.25):
  // 1. Black (#000000)
  // 2. White (#ffffff)
  // 3. Warm Cream (#FEF8E1 -> #FEFAE9)
  // 4. Soft Mint Green (#DEEFDE -> #E6F3E6)
  // 5. Soft Sky Blue (#DEEBF8 -> #E6F0FA)
  // 6. Soft Neutral Gray (#ECECEC -> #F1F1F1)
  let oddBg = '#FEFAE9';
  if (theme === 'theme_red') {
    oddBg = '#dc2626';
  } else if (theme === 'theme_black') {
    oddBg = '#000000';
  } else if (theme === 'theme_white') {
    oddBg = '#ffffff';
  } else if (theme === 'attachment_2') {
    oddBg = '#E6F3E6';
  } else if (theme === 'attachment_3') {
    oddBg = '#E6F0FA';
  } else if (theme === 'attachment_4') {
    oddBg = '#F1F1F1';
  } else if (theme === 'theme_pink') {
    oddBg = '#FCE7F3';
  } else if (theme === 'theme_peach') {
    oddBg = '#FCE4D6';
  } else if (theme === 'theme_yellow') {
    oddBg = '#FFE699';
  } else {
    oddBg = '#FEFAE9';
  }

  return { evenBg, oddBg, theme };
}

export interface ExportStudentsPdfOptions {
  title: string;
  reportType?: PdfReportType;
  isEnglish?: boolean;
  isHomeschool?: boolean;
  systemType?: string;
  customControlSheetOptions?: CustomControlSheetOptions;
  rowTheme?: RowBgTheme;
  subjectKey?: string;
  subjectLabel?: string;
  screenSubtitle?: string;
  administration?: string;
  administrationEn?: string;
  schoolName?: string;
  schoolNameEn?: string;
  educationType?: string;
  educationTypeEn?: string;
  dataOfficer?: string;
  dataOfficerEn?: string;
  controlHead?: string;
  controlHeadEn?: string;
  committeeHead?: string;
  committeeHeadEn?: string;
  stage?: string;
  stageEn?: string;
  selectedGrade?: string;
  sortBy?: SortCriterion[];
  students: StudentData[];
  isFirstGrade: boolean;
  showExamFields: boolean;
  semester: string;
  normalizeStatusForGrade: (status: string, isFirst: boolean, gender?: string) => string;
  labels: {
    serial: string;
    studentName: string;
    nationalId: string;
    gender: string;
    enrollmentStatus: string;
    enrollmentType: string;
    religion: string;
    seatNumber?: string;
    secretNumber?: string;
    committeeNumber?: string;
    male: string;
    female: string;
    muslim: string;
    muslimFemale: string;
    christian: string;
    christianFemale: string;
  };
  customCols?: any[];
  defaultSubjectsOverrides?: Record<string, any>;
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function stringToAsciiBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

export function buildPdfFromJpegPages(
  pages: { jpegBytes: Uint8Array; widthPx: number; heightPx: number }[],
  pageWidthPt = 841.89,
  pageHeightPt = 595.28
): Uint8Array {
  const chunks: Uint8Array[] = [];
  let currentOffset = 0;

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    currentOffset += bytes.length;
  };

  const pushStr = (str: string) => {
    pushBytes(stringToAsciiBytes(str));
  };

  const numPages = pages.length;
  const totalObjects = 2 + numPages * 3;
  const offsets: number[] = new Array(totalObjects + 1).fill(0);

  // PDF Header (with binary comment)
  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Object 1: Catalog
  offsets[1] = currentOffset;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages
  const kidsRefs = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  offsets[2] = currentOffset;
  pushStr(`2 0 obj\n<< /Type /Pages /Kids [ ${kidsRefs} ] /Count ${numPages} >>\nendobj\n`);

  // Page Objects
  pages.forEach((p, i) => {
    const pageObjId = 3 + i * 3;
    const contentObjId = 3 + i * 3 + 1;
    const imageObjId = 3 + i * 3 + 2;

    // Page dictionary
    offsets[pageObjId] = currentOffset;
    pushStr(
      `${pageObjId} 0 obj\n` +
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}] ` +
        `/Resources << /XObject << /Im${i} ${imageObjId} 0 R >> >> ` +
        `/Contents ${contentObjId} 0 R >>\n` +
        `endobj\n`
    );

    // Content stream
    const contentStream = `q ${pageWidthPt.toFixed(2)} 0 0 ${pageHeightPt.toFixed(2)} 0 0 cm /Im${i} Do Q\n`;
    offsets[contentObjId] = currentOffset;
    pushStr(
      `${contentObjId} 0 obj\n` +
        `<< /Length ${contentStream.length} >>\n` +
        `stream\n` +
        contentStream +
        `endstream\n` +
        `endobj\n`
    );

    // Image XObject
    offsets[imageObjId] = currentOffset;
    pushStr(
      `${imageObjId} 0 obj\n` +
        `<< /Type /XObject /Subtype /Image /Width ${p.widthPx} /Height ${p.heightPx} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpegBytes.length} >>\n` +
        `stream\n`
    );
    pushBytes(p.jpegBytes);
    pushStr('\nendstream\nendobj\n');
  });

  // Cross-reference table
  const xrefOffset = currentOffset;
  pushStr(`xref\n0 ${totalObjects + 1}\n`);
  pushStr('0000000000 65535 f \n');
  for (let objId = 1; objId <= totalObjects; objId++) {
    const padded = String(offsets[objId]).padStart(10, '0');
    pushStr(`${padded} 00000 n \n`);
  }

  // Trailer
  pushStr(
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF`
  );

  // Concatenate all chunks
  const result = new Uint8Array(currentOffset);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
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

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  maxWidth?: number
) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(text);
  const asc = m.actualBoundingBoxAscent ?? 0;
  const desc = m.actualBoundingBoxDescent ?? 0;
  const shouldSquash = maxWidth !== undefined && m.width > maxWidth;
  if (asc > 0 || desc > 0) {
    const drawY = centerY + (asc - desc) / 2;
    if (shouldSquash) {
      ctx.fillText(text, centerX, drawY, maxWidth);
    } else {
      ctx.fillText(text, centerX, drawY);
    }
  } else {
    ctx.textBaseline = 'middle';
    if (shouldSquash) {
      ctx.fillText(text, centerX, centerY + 2, maxWidth);
    } else {
      ctx.fillText(text, centerX, centerY + 2);
    }
  }
}

export function getSavedEnglishMainFields(stage?: string): {
  administrationEn: string;
  schoolNameEn: string;
  educationTypeEn: string;
  stageEn: string;
  dataOfficerEn: string;
  controlHeadEn: string;
  committeeHeadEn: string;
} {
  let administrationEn = '';
  let schoolNameEn = '';
  let educationTypeEn = '';
  let stageEn = '';
  let dataOfficerEn = '';
  let controlHeadEn = '';
  let committeeHeadEn = '';

  const defaultEduTypeMap: Record<string, string> = {
    official: 'Official Schools',
    official_languages: 'Official Language Schools',
    official_distinguished: 'Distinguished Official Language Schools',
    ips: 'Official International Schools (IPS)',
    private: 'Private Schools',
    national: 'National Schools',
    egyptian_japanese: 'Egyptian Japanese Schools (EJS)',
    nile_egyptian: 'Nile Egyptian Schools (NES)',
    stem: 'STEM Schools',
    applied_technology: 'Applied Technology Schools',
    intellectual_schools: 'Intellectual Education Schools',
    vocational_schools: 'Vocational Schools',
    other_schools: 'Other Schools',
  };

  const defaultStageMap: Record<string, string> = {
    kindergarten: 'Kindergarten Stage',
    primary: 'Primary Stage',
    middle: 'Preparatory Stage',
    prep: 'Preparatory Stage',
    secondary: 'Secondary Stage',
    commercial_technical: 'Commercial Technical Education',
    industrial_technical: 'Industrial Technical Education',
    agricultural_technical: 'Agricultural Technical Education',
    hotel_technical: 'Hotel Technical Education',
  };

  try {
    const savedSchool = localStorage.getItem('sheet_control_school_data');
    if (savedSchool) {
      const parsedSchool = JSON.parse(savedSchool);
      administrationEn = (parsedSchool.administrationEn || '').trim();
      schoolNameEn = (parsedSchool.schoolNameEn || '').trim();
      educationTypeEn =
        (parsedSchool.educationTypeEn || '').trim() ||
        (parsedSchool.educationType ? defaultEduTypeMap[parsedSchool.educationType] || '' : '');
      stageEn =
        (parsedSchool.stageEn || '').trim() ||
        (parsedSchool.stage ? defaultStageMap[parsedSchool.stage] || '' : '');
    }
    const savedControl = localStorage.getItem('sheet_control_control_data_by_stage');
    if (savedControl) {
      const parsedControl = JSON.parse(savedControl);
      const stageControl = stage ? parsedControl[stage] : undefined;
      const fallbackEntry =
        parsedControl[''] || (Object.values(parsedControl)[0] as Record<string, any> | undefined);
      dataOfficerEn = (
        stageControl?.dataOfficerEn ||
        fallbackEntry?.dataOfficerEn ||
        ''
      ).trim();
      controlHeadEn = (
        stageControl?.controlHeadEn ||
        fallbackEntry?.controlHeadEn ||
        ''
      ).trim();
      committeeHeadEn = (
        stageControl?.committeeHeadEn ||
        fallbackEntry?.committeeHeadEn ||
        ''
      ).trim();
    }
  } catch {
    // Ignore localStorage parse errors
  }

  return {
    administrationEn,
    schoolNameEn,
    educationTypeEn,
    stageEn,
    dataOfficerEn,
    controlHeadEn,
    committeeHeadEn,
  };
}

function translateCardTitleToEnglish(
  rawTitle: string,
  stage?: string,
  selectedGrade?: string,
  semester?: string,
  customStageEn?: string
): string {
  const stageMap: Record<string, string> = {
    kindergarten: 'Kindergarten Stage',
    primary: 'Primary Stage',
    middle: 'Preparatory Stage',
    prep: 'Preparatory Stage',
    secondary: 'Secondary Stage',
    commercial_technical: 'Commercial Technical Education',
    industrial_technical: 'Industrial Technical Education',
    agricultural_technical: 'Agricultural Technical Education',
    hotel_technical: 'Hotel Technical Education',
  };

  let stageEn = (customStageEn && customStageEn.trim()) || (stage && stageMap[stage]) || '';
  if (stage === 'secondary' && selectedGrade && !(customStageEn && customStageEn.trim())) {
    if (selectedGrade.includes('scientific') || rawTitle.includes('العلمية')) {
      stageEn = 'Secondary Stage - Scientific Division';
    } else if (selectedGrade.includes('literary') || rawTitle.includes('الأدبية')) {
      stageEn = 'Secondary Stage - Literary Division';
    } else if (selectedGrade.includes('modern_medical') || selectedGrade.includes('medical') || rawTitle.includes('الطب')) {
      stageEn = 'Baccalaureate - Medicine & Life Sciences Track';
    } else if (selectedGrade.includes('modern_engineering') || selectedGrade.includes('engineering') || rawTitle.includes('الهندسة')) {
      stageEn = 'Baccalaureate - Engineering & Computer Science Track';
    } else if (selectedGrade.includes('modern_business') || selectedGrade.includes('business') || rawTitle.includes('الأعمال')) {
      stageEn = 'Baccalaureate - Business Track';
    } else if (selectedGrade.includes('modern_arts') || selectedGrade.includes('arts') || rawTitle.includes('الآداب')) {
      stageEn = 'Baccalaureate - Arts & Humanities Track';
    }
  }

  let gradeEn = '';
  const g = selectedGrade || rawTitle || '';
  if (g.includes('KG1') || (stage === 'kindergarten' && (g.includes('الأول') || g.includes('الاول')))) {
    gradeEn = 'KG 1';
  } else if (g.includes('KG2') || (stage === 'kindergarten' && (g.includes('الثاني') || g.includes('الثانى')))) {
    gradeEn = 'KG 2';
  } else if (g.includes('الأول') || g.includes('الاول') || g.includes('1st')) {
    gradeEn = 'Grade 1';
  } else if (g.includes('الثاني') || g.includes('الثانى') || g.includes('2nd')) {
    gradeEn = 'Grade 2';
  } else if (g.includes('الثالث') || g.includes('3rd')) {
    gradeEn = 'Grade 3';
  } else if (g.includes('الرابع') || g.includes('4th')) {
    gradeEn = 'Grade 4';
  } else if (g.includes('الخامس') || g.includes('5th')) {
    gradeEn = 'Grade 5';
  } else if (g.includes('السادس') || g.includes('6th')) {
    gradeEn = 'Grade 6';
  }

  const semEn =
    semester === 'first'
      ? 'First Semester'
      : semester === 'second'
      ? 'Second Semester'
      : semester === 'retake'
      ? 'Second Round'
      : '';

  const parts = [stageEn, gradeEn, semEn, '2026 - 2027'].filter(Boolean);
  return parts.length > 1 ? parts.join(' - ') : rawTitle;
}

const SEAT_CARD_NO_QR_QUOTES = [
  'العِلْمُ غَرْسٌ يُفِيضُ النَّفْعَ خَالِدَةً\u00A0\u00A0\u00A0\u00A0ثِمَارُهُ لا تُدَانِيها ثِمَارُ الجَنَى  - الإمام : الشافعي',
  'اصْبِرْ عَلَى مُرِّ الجَفَا مِنْ مُعَلِّمٍ\u00A0\u00A0\u00A0\u00A0فَإِنَّ رُسُوبَ العِلْمِ فِي نَفَرَاتِهِ  - الإمام : الشافعي',
  'وَمَنْ لَمْ يَذُقْ مُرَّ التَّعَلُّمِ سَاعَةً\u00A0\u00A0\u00A0\u00A0تَجَرَّعَ ذُلَّ الجَهْلِ طُولَ حَيَاتِهِ  - الإمام : الشافعي',
  'وَمَنْ فَاتَهُ التَّعْلِيمُ وَقْتَ شَبَابِهِ\u00A0\u00A0\u00A0\u00A0فَكَبِّرْ عَلَيْهِ أَرْبَعًا لِوَفَاتِهِ  - الإمام : الشافعي',
  'مَا الفَخْرُ إِلا لأَهْلِ العِلْمِ إِنَّهُمُ\u00A0\u00A0\u00A0\u00A0عَلَى الهُدَى لِمَنِ اسْتَهْدَى أَدِلاَّءُ  - الامام : علي بن أبي طالب',
  'وَقَدْرُ كُلِّ امْرِئٍ مَا كَانَ يُحْسِنُهُ\u00A0\u00A0\u00A0\u00A0وَالجَاهِلُونَ لأَهْلِ العِلْمِ أَعْدَاءُ  - الامام : علي بن أبي طالب',
  'فَفُزْ بِعِلْمٍ وَلاَ تَطْلُبْ بِهِ بَدَلاً\u00A0\u00A0\u00A0\u00A0فَالنَّاسُ مَوْتَى وَأَهْلُ العِلْمِ أَحْيَاءُ  - الامام : علي بن أبي طالب',
];

function drawDefaultSchoolCrest(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  schoolName: string
) {
  const bgGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  bgGrad.addColorStop(0, '#f8fafc');
  bgGrad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // Soft laurel wreath circle
  ctx.strokeStyle = '#c29b38';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.78, 0, Math.PI * 2);
  ctx.stroke();

  // Book emblem icon
  ctx.fillStyle = '#0a2240';
  ctx.beginPath();
  ctx.moveTo(cx, cy + 12);
  ctx.quadraticCurveTo(cx - 26, cy + 20, cx - 40, cy + 14);
  ctx.lineTo(cx - 40, cy - 22);
  ctx.quadraticCurveTo(cx - 26, cy - 16, cx, cy - 24);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy + 12);
  ctx.quadraticCurveTo(cx + 26, cy + 20, cx + 40, cy + 14);
  ctx.lineTo(cx + 40, cy - 22);
  ctx.quadraticCurveTo(cx + 26, cy - 16, cx, cy - 24);
  ctx.closePath();
  ctx.fill();

  // Book spine
  ctx.strokeStyle = '#c29b38';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 24);
  ctx.lineTo(cx, cy + 22);
  ctx.stroke();

  // Star on top
  ctx.fillStyle = '#c29b38';
  ctx.beginPath();
  ctx.arc(cx, cy - 36, 5, 0, Math.PI * 2);
  ctx.fill();

  // School Crest Text
  ctx.font = 'bold 15px "Cairo", sans-serif';
  ctx.fillStyle = '#0a2240';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = schoolName.trim() ? schoolName.trim().slice(0, 18) : 'شعار المدرسة';
  ctx.fillText(label, cx, cy + 44, radius * 1.5);
}

function drawSeatNumberCardModel1(
  ctx: CanvasRenderingContext2D,
  targetX: number,
  targetY: number,
  targetW: number,
  targetH: number,
  student: StudentData,
  studentIdx: number,
  options: {
    cleanTitle: string;
    administration: string;
    schoolName: string;
    dataOfficer: string;
    controlHead: string;
    committeeHead: string;
    statusText: string;
    enrollmentTypeText: string;
    religionText: string;
    seatNumText: string;
    committeeNumText: string;
    dateDisplay: string;
    qrImage?: HTMLImageElement | null;
    ministryLogoImage?: HTMLImageElement | null;
    schoolLogoImage?: HTMLImageElement | HTMLCanvasElement | null;
    isEnglish?: boolean;
    isNoQr?: boolean;
    selectedGrade: string;
    stage: string;
  }
) {
  const {
    cleanTitle,
    administration,
    schoolName,
    dataOfficer,
    controlHead,
    committeeHead,
    statusText,
    enrollmentTypeText,
    religionText,
    seatNumText,
    committeeNumText,
    dateDisplay,
    qrImage,
    ministryLogoImage,
    schoolLogoImage,
    isEnglish = false,
    selectedGrade,
    stage,
  } = options;

  // Bottom Quote / Exclusive Ad text for seat numbers
  const quoteLine = getActiveFooterTagline(selectedGrade, stage);
  const isCustomAd = quoteLine !== 'المنظومة الرقمية لريادة أعمال المدارس المصرية  01098594956 - 01131097055';
  const finalQuoteLine = isCustomAd ? quoteLine : SEAT_CARD_NO_QR_QUOTES[studentIdx % SEAT_CARD_NO_QR_QUOTES.length];

  ctx.save();
  const cardX = 0;
  const cardY = 0;
  const cardW = 1658;
  const cardH = 660;
  ctx.translate(targetX, targetY);
  ctx.scale(targetW / cardW, targetH / cardH);

  // 1. Crisp White Card Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // 2. Elegant Dual Outer Borders (Gold & Navy exactly like 1.jfif attachment)
  // Outer Gold Border
  ctx.strokeStyle = '#c29b38';
  ctx.lineWidth = 4;
  ctx.strokeRect(cardX + 12, cardY + 12, cardW - 24, cardH - 24);

  // Inner Navy Border
  ctx.strokeStyle = '#0a2240';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(cardX + 20, cardY + 20, cardW - 40, cardH - 40);

  // 3. Left Section (Profile / Circular School Logo Column - exactly like 1.jfif)
  const col1W = 460;
  const col1Left = cardX + 20;
  const col1CenterX = col1Left + col1W / 2;

  // Vertical Divider Line (Deep Navy line separating profile and main certificate)
  const dividerX = col1Left + col1W;
  ctx.strokeStyle = '#0a2240';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(dividerX, cardY + 30);
  ctx.lineTo(dividerX, cardY + cardH - 85);
  ctx.stroke();

  // Top Title in Left Column (like "SCHOLAR PROFILE" in 1.jfif)
  const isKgCard = cleanTitle.includes('رياض') || (options as any)?.stage === 'kindergarten' || (options as any)?.isKindergarten;
  ctx.direction = isEnglish ? 'ltr' : 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0a2240';
  ctx.font = 'bold 24px "Cairo", serif';
  ctx.fillText(isEnglish ? 'SCHOLAR PROFILE' : (isKgCard ? 'بطاقة بيانات التلميذ' : 'بطاقة بيانات الطالب'), col1CenterX, cardY + 62);

  // Circular Frame (Concentric Navy & Gold Rings matching 1.jfif)
  const circleCenterX = col1CenterX;
  const circleCenterY = cardY + 230;
  const outerR = 142;
  const innerR = 132;
  const clipR = 124;

  // Outer thick Navy ring
  ctx.beginPath();
  ctx.arc(circleCenterX, circleCenterY, outerR, 0, Math.PI * 2);
  ctx.strokeStyle = '#0a2240';
  ctx.lineWidth = 12;
  ctx.stroke();

  // Inner Gold ring
  ctx.beginPath();
  ctx.arc(circleCenterX, circleCenterY, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = '#c29b38';
  ctx.lineWidth = 4.5;
  ctx.stroke();

  // Inner Circle Clipping for School Logo
  ctx.save();
  ctx.beginPath();
  ctx.arc(circleCenterX, circleCenterY, clipR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(circleCenterX - clipR, circleCenterY - clipR, clipR * 2, clipR * 2);

  if (schoolLogoImage) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      schoolLogoImage,
      circleCenterX - clipR,
      circleCenterY - clipR,
      clipR * 2,
      clipR * 2
    );
  } else {
    drawDefaultSchoolCrest(ctx, circleCenterX, circleCenterY, clipR, schoolName);
  }
  ctx.restore();

  // Below Circle: Institution Details (School Name & Administration like Luxor University in 1.jfif)
  const schoolNameDisplay = applyEntityTerms(schoolName.trim()) || '........................';
  const adminDisplay = applyEntityTerms(administration.trim()) || '........................';

  ctx.direction = isEnglish ? 'ltr' : 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0a2240';
  ctx.font = '900 24px "Cairo", sans-serif';
  ctx.fillText(schoolNameDisplay, col1CenterX, cardY + 410, col1W - 40);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 18px "Cairo", sans-serif';
  ctx.fillText(isEnglish ? `Admin: ${adminDisplay}` : `إدارة: ${adminDisplay}`, col1CenterX, cardY + 444, col1W - 40);

  ctx.fillStyle = '#b38728';
  ctx.font = 'bold 16px "Cairo", sans-serif';
  ctx.fillText(cleanTitle, col1CenterX, cardY + 476, col1W - 40);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px "Cairo", sans-serif';
  ctx.fillText(`العام الدراسي 2025 / 2026 م`, col1CenterX, cardY + 506);

  // 4. Right / Main Content Column (like Main Column in 1.jfif)
  const mainLeftX = dividerX + 35;
  const mainRightX = cardW - 35;
  const mainW = mainRightX - mainLeftX;
  const mainCenterX = mainLeftX + mainW / 2;

  // Top Ministry Logo (Top Right corner)
  if (ministryLogoImage) {
    const minLogoH = 65;
    const minLogoW = Math.round(minLogoH * (ministryLogoImage.naturalWidth / (ministryLogoImage.naturalHeight || 1)));
    ctx.drawImage(ministryLogoImage, mainRightX - minLogoW - 10, cardY + 36, minLogoW, minLogoH);
  }

  // Main Header
  ctx.direction = isEnglish ? 'ltr' : 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0a2240';
  ctx.font = '900 36px "Cairo", serif';
  ctx.fillText(
    isEnglish ? 'STUDENT EXAMINATION CARD' : (isKgCard ? 'بطاقة رقم جلوس التلميذ' : 'بطاقة رقم جلوس الطالب'),
    mainCenterX,
    cardY + 68
  );

  // Student Name
  const studentNameDisplay = (
    isEnglish
      ? (student.nameEn || student.name || '').toUpperCase()
      : student.name || '................................'
  );
  ctx.fillStyle = '#0a2240';
  ctx.font = '900 44px "Cairo", sans-serif';
  ctx.fillText(studentNameDisplay, mainCenterX, cardY + 142, mainW - 220);

  // Hero Seat Number
  const displayedSeatNum = seatNumText.trim() || String(studentIdx + 1);
  ctx.fillStyle = '#b38728';
  ctx.font = '900 50px "Cairo", sans-serif';
  ctx.fillText(
    isEnglish ? `SEAT NUMBER : ${displayedSeatNum}` : `رقم الجلوس : ${displayedSeatNum}`,
    mainCenterX,
    cardY + 225
  );

  // Subtitle under Seat Number
  const displayedCommitteeNum = committeeNumText.trim() || '1';
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 20px "Cairo", sans-serif';
  ctx.fillText(
    isEnglish
      ? `Committee No. ( ${displayedCommitteeNum} )  •  ${cleanTitle}`
      : `رقم اللجنة : ( ${displayedCommitteeNum} )  •  ${cleanTitle}`,
    mainCenterX,
    cardY + 272
  );

  // 4 Metric Boxes + QR Code
  const rowY = cardY + 325;
  const rowH = 96;
  const qrBoxSize = 96;

  // QR Code on Far Right (matching 1.jfif)
  const qrBoxX = mainRightX - qrBoxSize;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, qrBoxX, rowY, qrBoxSize, rowH, 10);
  ctx.fill();
  ctx.stroke();

  if (qrImage) {
    ctx.drawImage(qrImage, qrBoxX + 6, rowY + 6, qrBoxSize - 12, rowH - 12);
  }

  // 4 Metric Boxes
  const statBoxesW = mainW - qrBoxSize - 20;
  const boxGap = 12;
  const singleBoxW = Math.floor((statBoxesW - 3 * boxGap) / 4);

  const stats = [
    { label: isEnglish ? 'COMMITTEE' : 'رقم اللجنة', val: displayedCommitteeNum },
    { label: isEnglish ? 'RELIGION' : 'الديانة', val: religionText || 'مسلم' },
    { label: isEnglish ? 'STATUS' : 'حالة القيد', val: statusText || 'مستجد' },
    { label: isEnglish ? 'ENROLLMENT' : 'نوع القيد', val: enrollmentTypeText || 'قيد عادي' },
  ];

  stats.forEach((st, sIdx) => {
    const sBoxX = mainLeftX + sIdx * (singleBoxW + boxGap);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, sBoxX, rowY, singleBoxW, rowH, 8);
    ctx.fill();
    ctx.stroke();

    // Box Header Label
    ctx.direction = isEnglish ? 'ltr' : 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 14px "Cairo", sans-serif';
    ctx.fillText(st.label, sBoxX + singleBoxW / 2, rowY + 25);

    // Box Value (Bold Navy)
    ctx.fillStyle = '#0a2240';
    ctx.font = '900 22px "Cairo", sans-serif';
    ctx.fillText(st.val, sBoxX + singleBoxW / 2, rowY + 60, singleBoxW - 14);
  });

  // Footer Signatures Row
  const sigY = cardY + 470;
  const dataOfficerDisplay = dataOfficer.trim() ? dataOfficer.trim() : '........................';
  const controlHeadDisplay = controlHead.trim() ? controlHead.trim() : '........................';
  const committeeHeadDisplay = committeeHead.trim() ? committeeHead.trim() : '........................';

  const sigColW = mainW / 3;
  ctx.fillStyle = '#0a2240';
  ctx.font = 'bold 17px "Cairo", sans-serif';

  // Signature 1
  ctx.fillText(
    isEnglish ? `Data Officer: ${dataOfficerDisplay}` : `مسئول البيانات: ${dataOfficerDisplay}`,
    mainLeftX + sigColW * 0.5,
    sigY,
    sigColW - 20
  );
  // Signature 2
  ctx.fillText(
    isEnglish ? `Control Head: ${controlHeadDisplay}` : `رئيس الكنترول: ${controlHeadDisplay}`,
    mainLeftX + sigColW * 1.5,
    sigY,
    sigColW - 20
  );
  // Signature 3
  ctx.fillText(
    isEnglish ? `Committee Head: ${committeeHeadDisplay}` : `رئيس اللجنة: ${committeeHeadDisplay}`,
    mainLeftX + sigColW * 2.5,
    sigY,
    sigColW - 20
  );

  // Bottom Quote / Exclusive Ad text for seat numbers
  ctx.fillStyle = '#64748b';
  let qFontSize = 15;
  ctx.font = `bold ${qFontSize}px "Cairo", sans-serif`;
  while (qFontSize > 8 && ctx.measureText(finalQuoteLine).width > cardW - 60) {
    qFontSize -= 0.5;
    ctx.font = `bold ${qFontSize}px "Cairo", sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(finalQuoteLine, cardW / 2, cardH - 32, cardW - 40);

  ctx.restore();
}

function drawSeatNumberCard(
  ctx: CanvasRenderingContext2D,
  targetX: number,
  targetY: number,
  targetW: number,
  targetH: number,
  student: StudentData,
  studentIdx: number,
  options: {
    cleanTitle: string;
    administration: string;
    schoolName: string;
    dataOfficer: string;
    controlHead: string;
    committeeHead: string;
    statusText: string;
    enrollmentTypeText: string;
    religionText: string;
    seatNumText: string;
    committeeNumText: string;
    dateDisplay: string;
    qrImage?: HTMLImageElement | null;
    ministryLogoImage?: HTMLImageElement | null;
    schoolLogoImage?: HTMLImageElement | HTMLCanvasElement | null;
    isEnglish?: boolean;
    isNoQr?: boolean;
    model?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'default';
    selectedGrade: string;
    stage: string;
  }
) {
  const {
    cleanTitle,
    administration,
    schoolName,
    dataOfficer,
    controlHead,
    committeeHead,
    seatNumText,
    committeeNumText,
    qrImage,
    ministryLogoImage,
    schoolLogoImage,
    isEnglish = false,
    isNoQr = false,
    model = 'default',
    selectedGrade,
    stage,
  } = options;

  const cardModel = model;

  // Model 1: Specially styled according to the attached certificate 1.jfif
  if (cardModel === 1) {
    drawSeatNumberCardModel1(ctx, targetX, targetY, targetW, targetH, student, studentIdx, { ...options, selectedGrade, stage });
    return;
  }
  let frameColor = '#0f2942';
  let ribbonColor = '#c59f54';
  let outerBorderColor = '#c59f54';
  let innerBorderColor = '#0f2942';
  let titleColor = '#1e40af';
  let leftBoxBorder = '#b45309';
  let leftBoxPill = '#f59e0b';
  let leftBoxNumColor = '#0d3b66';
  let rightBoxBorder = '#7f1d1d';
  let rightBoxPill = '#b91c1c';
  let rightBoxNumColor = '#991b1b';

  if (cardModel === 2) {
    frameColor = '#701a2e';
    ribbonColor = '#d97706';
    outerBorderColor = '#f59e0b';
    innerBorderColor = '#881337';
    titleColor = '#9f1239';
    leftBoxBorder = '#881337';
    leftBoxPill = '#be123c';
    leftBoxNumColor = '#881337';
    rightBoxBorder = '#b45309';
    rightBoxPill = '#d97706';
    rightBoxNumColor = '#9a3412';
  } else if (cardModel === 3) {
    frameColor = '#064e3b';
    ribbonColor = '#10b981';
    outerBorderColor = '#d97706';
    innerBorderColor = '#065f46';
    titleColor = '#047857';
    leftBoxBorder = '#065f46';
    leftBoxPill = '#059669';
    leftBoxNumColor = '#064e3b';
    rightBoxBorder = '#b45309';
    rightBoxPill = '#d97706';
    rightBoxNumColor = '#9a3412';
  } else if (cardModel === 4) {
    frameColor = '#4c1d95';
    ribbonColor = '#fbbf24';
    outerBorderColor = '#fbbf24';
    innerBorderColor = '#581c87';
    titleColor = '#6d28d9';
    leftBoxBorder = '#581c87';
    leftBoxPill = '#7c3aed';
    leftBoxNumColor = '#4c1d95';
    rightBoxBorder = '#b45309';
    rightBoxPill = '#f59e0b';
    rightBoxNumColor = '#9a3412';
  } else if (cardModel === 5) {
    frameColor = '#0f172a';
    ribbonColor = '#0284c7';
    outerBorderColor = '#0ea5e9';
    innerBorderColor = '#0369a1';
    titleColor = '#0284c7';
    leftBoxBorder = '#0369a1';
    leftBoxPill = '#0284c7';
    leftBoxNumColor = '#0c4a6e';
    rightBoxBorder = '#0f766e';
    rightBoxPill = '#0d9488';
    rightBoxNumColor = '#134e4a';
  } else if (cardModel === 6) {
    frameColor = '#451a03';
    ribbonColor = '#f59e0b';
    outerBorderColor = '#d97706';
    innerBorderColor = '#78350f';
    titleColor = '#b45309';
    leftBoxBorder = '#78350f';
    leftBoxPill = '#b45309';
    leftBoxNumColor = '#451a03';
    rightBoxBorder = '#991b1b';
    rightBoxPill = '#dc2626';
    rightBoxNumColor = '#7f1d1d';
  } else if (cardModel === 7) {
    frameColor = '#831843';
    ribbonColor = '#e11d48';
    outerBorderColor = '#f59e0b';
    innerBorderColor = '#9d174d';
    titleColor = '#be185d';
    leftBoxBorder = '#9d174d';
    leftBoxPill = '#db2777';
    leftBoxNumColor = '#831843';
    rightBoxBorder = '#7f1d1d';
    rightBoxPill = '#e11d48';
    rightBoxNumColor = '#881337';
  }

  ctx.save();
  const cardX = 0;
  const cardY = 0;
  const cardW = 1658;
  const cardH = 660;
  ctx.translate(targetX, targetY);
  ctx.scale(targetW / cardW, targetH / cardH);

  // 1. Outer Frame
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fillStyle = frameColor;
  ctx.fill();
  ctx.clip();

  // Corner Geometric Accents (White & Gold angled ribbons like attachment)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = ribbonColor;
  ctx.lineWidth = 3;

  // Top-Right Corner Ribbon
  ctx.beginPath();
  ctx.moveTo(cardX + cardW - 150, cardY);
  ctx.lineTo(cardX + cardW, cardY + 150);
  ctx.lineTo(cardX + cardW, cardY + 115);
  ctx.lineTo(cardX + cardW - 115, cardY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top-Left Corner Ribbon
  ctx.beginPath();
  ctx.moveTo(cardX + 150, cardY);
  ctx.lineTo(cardX, cardY + 150);
  ctx.lineTo(cardX, cardY + 115);
  ctx.lineTo(cardX + 115, cardY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bottom-Right Corner Ribbon
  ctx.beginPath();
  ctx.moveTo(cardX + cardW - 150, cardY + cardH);
  ctx.lineTo(cardX + cardW, cardY + cardH - 150);
  ctx.lineTo(cardX + cardW, cardY + cardH - 115);
  ctx.lineTo(cardX + cardW - 115, cardY + cardH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bottom-Left Corner Ribbon
  ctx.beginPath();
  ctx.moveTo(cardX + 150, cardY + cardH);
  ctx.lineTo(cardX, cardY + cardH - 150);
  ctx.lineTo(cardX, cardY + cardH - 115);
  ctx.lineTo(cardX + 115, cardY + cardH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Inner Card Area (White Background without colored/faceted pattern)
  const pad = 28;
  const inX = cardX + pad;
  const inY = cardY + pad;
  const inW = cardW - pad * 2;
  const inH = cardH - pad * 2;

  drawRoundedRect(ctx, inX, inY, inW, inH, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Outer Gold & Inner Navy/Colored Double Border
  drawRoundedRect(ctx, inX, inY, inW, inH, 10);
  ctx.strokeStyle = outerBorderColor;
  ctx.lineWidth = 4;
  ctx.stroke();

  drawRoundedRect(ctx, inX + 6, inY + 6, inW - 12, inH - 12, 7);
  ctx.strokeStyle = innerBorderColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (ministryLogoImage) {
    const scaleX = targetW / cardW;
    const scaleY = targetH / cardH;
    const imgAspect =
      ministryLogoImage.naturalWidth > 0 && ministryLogoImage.naturalHeight > 0
        ? ministryLogoImage.naturalWidth / ministryLogoImage.naturalHeight
        : 1;
    const logoH = Math.round(130 * 1.25);
    const logoW = Math.round(logoH * imgAspect * (scaleY / scaleX));
    const logoX = inX + inW - 40 - logoW;
    const logoY = inY + 30;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = 'contrast(1.08)';
    ctx.drawImage(ministryLogoImage, logoX, logoY, logoW, logoH);
    ctx.restore();
  }

  if (schoolLogoImage) {
    const scaleX = targetW / cardW;
    const scaleY = targetH / cardH;
    const minLogoAspect =
      ministryLogoImage &&
      ministryLogoImage.naturalWidth > 0 &&
      ministryLogoImage.naturalHeight > 0
        ? ministryLogoImage.naturalWidth / ministryLogoImage.naturalHeight
        : 1;
    const logoH = Math.round(130 * 1.25);
    const logoW = Math.round(logoH * minLogoAspect * (scaleY / scaleX));
    const logoX = inX + 40;
    const logoY = inY + 30;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      logoX + logoW / 2,
      logoY + logoH / 2,
      logoW / 2,
      logoH / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.closePath();
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = 'contrast(1.08)';
    ctx.drawImage(schoolLogoImage, logoX, logoY, logoW, logoH);
    ctx.restore();
  }

  // 3. Ordered Centered Text Lines:
  // 1) الادارة
  // 2) المدرسة
  // 3) المرحلة ........
  // 4) بطاقة رقم جلوس
  // 5) STUDENT EXAMINATION CARD - 2026 / 2027
  // 6) اسم الطالب باللون الاحمر
  const centerX = cardX + cardW / 2;
  const isFemale =
    student.gender === 'female' ||
    student.gender === 'أنثى' ||
    student.gender === 'انثى';

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // Row 1: إدارة / Administration
  ctx.direction = isEnglish ? 'ltr' : 'rtl';
  ctx.fillStyle = '#0e294b';
  const adminVal = applyEntityTerms(administration.trim()) || '........................';
  ctx.font = '900 28px "Cairo", sans-serif';
  ctx.fillText(
    isEnglish
      ? `Administration : ${adminVal}`
      : applyEntityTerms(`إدارة : ${adminVal}`),
    centerX,
    inY + 48,
    inW - 120
  );

  // Row 2: مدرسة / School
  ctx.direction = isEnglish ? 'ltr' : 'rtl';
  ctx.fillStyle = '#0e294b';
  const schoolVal = applyEntityTerms(schoolName.trim()) || '........................';
  ctx.font = '900 30px "Cairo", sans-serif';
  ctx.fillText(
    isEnglish
      ? `School : ${schoolVal}`
      : applyEntityTerms(`مدرسة : ${schoolVal}`),
    centerX,
    inY + 94,
    inW - 120
  );

  // Row 3: المرحلة ........
  ctx.direction = isEnglish ? 'ltr' : 'rtl';
  ctx.fillStyle = '#0e294b';
  ctx.font = isEnglish ? '800 28px "Cairo", sans-serif' : '800 21px "Cairo", sans-serif';
  ctx.fillText(cleanTitle, centerX, inY + 142, inW - 120);

  // Row 4: بطاقة رقم جلوس
  const cardTitleRowY = inY + 196;
  ctx.font = '900 32px "Cairo", sans-serif';
  ctx.fillStyle = titleColor;
  const modelTitleText = isEnglish ? 'STUDENT EXAMINATION CARD' : 'بطاقة رقم جلوس';

  ctx.direction = isEnglish ? 'ltr' : 'rtl';
  ctx.textAlign = 'center';
  ctx.fillText(modelTitleText, centerX, cardTitleRowY, inW - 120);

  // Row 5: اسم الطالب باللون الاحمر
  ctx.direction = isEnglish ? 'ltr' : 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#dc2626';
  const studentVal =
    (isEnglish ? (student.nameEn?.trim() || student.name || '').toUpperCase() : student.name) ||
    '................................';
  const isKgCard2 = cleanTitle.includes('رياض') || (options as any)?.stage === 'kindergarten' || (options as any)?.isKindergarten;
  const studentLabel = isEnglish ? 'STUDENT' : isKgCard2 ? (isFemale ? 'التلميذة' : 'التلميذ') : isFemale ? 'الطالبة' : 'الطالب';
  ctx.font = '900 36px "Cairo", sans-serif';
  ctx.fillText(`${studentLabel} : ${studentVal}`, centerX, inY + 250, inW - 120);

  // 4. Three Highlighted Boxes (Right Box: Committee Number | Middle Box: QR Code | Left Box: Seat Number)
  const boxY = inY + 310;
  const boxH = 140;
  const scaleX = targetW / cardW;
  const scaleY = targetH / cardH;
  // Ensure visual width equals visual height on the rendered card
  const mBoxW = Math.round(boxH * (scaleY / scaleX));
  const rBoxW = 540;
  const lBoxW = 540;
  const boxesGap = 45;
  const totalBoxesW = lBoxW + boxesGap + mBoxW + boxesGap + rBoxW;
  const boxesStartX = inX + (inW - totalBoxesW) / 2;
  const lBoxX = boxesStartX;
  const mBoxX = lBoxX + lBoxW + boxesGap;
  const rBoxX = mBoxX + mBoxW + boxesGap;

  // Right Box (Pill Accents - Committee Number)
  drawRoundedRect(ctx, rBoxX, boxY, rBoxW, boxH, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = rightBoxBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Vertical side bars
  drawRoundedRect(ctx, rBoxX - 6, boxY + 24, 14, boxH - 48, 7);
  ctx.fillStyle = rightBoxPill;
  ctx.fill();
  drawRoundedRect(ctx, rBoxX + rBoxW - 8, boxY + 24, 14, boxH - 48, 7);
  ctx.fillStyle = rightBoxPill;
  ctx.fill();

  ctx.direction = isEnglish ? 'ltr' : 'rtl';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px "Cairo", sans-serif';
  drawCenteredText(
    ctx,
    isEnglish ? 'Committee No.' : 'رقم اللجنة',
    rBoxX + rBoxW / 2,
    boxY + 34,
    rBoxW - 24
  );

  ctx.direction = 'ltr';
  ctx.fillStyle = rightBoxNumColor;
  ctx.font = '900 62px "Cairo", sans-serif';
  const displayedCommitteeNum = committeeNumText.trim() || '1';
  drawCenteredText(ctx, displayedCommitteeNum, rBoxX + rBoxW / 2, boxY + 92, rBoxW - 40);

  // Middle Box (Width = Height, QR Code Background asd11.jpg, without red borders)
  drawRoundedRect(ctx, mBoxX, boxY, mBoxW, boxH, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  if (qrImage) {
    ctx.save();
    drawRoundedRect(ctx, mBoxX, boxY, mBoxW, boxH, 18);
    ctx.clip();
    ctx.drawImage(qrImage, mBoxX, boxY, mBoxW, boxH);
    ctx.restore();
  }

  // Left Box (Pill Accents - Seat Number)
  drawRoundedRect(ctx, lBoxX, boxY, lBoxW, boxH, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = leftBoxBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Vertical side bars
  drawRoundedRect(ctx, lBoxX - 6, boxY + 24, 14, boxH - 48, 7);
  ctx.fillStyle = leftBoxPill;
  ctx.fill();
  drawRoundedRect(ctx, lBoxX + lBoxW - 8, boxY + 24, 14, boxH - 48, 7);
  ctx.fillStyle = leftBoxPill;
  ctx.fill();

  ctx.direction = isEnglish ? 'ltr' : 'rtl';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px "Cairo", sans-serif';
  drawCenteredText(
    ctx,
    isEnglish ? 'Seat Number' : 'رقم الجلوس',
    lBoxX + lBoxW / 2,
    boxY + 34,
    lBoxW - 24
  );

  ctx.direction = 'ltr';
  ctx.fillStyle = leftBoxNumColor;
  ctx.font = '900 62px "Cairo", sans-serif';
  const displayedSeatNum = seatNumText.trim() || String(studentIdx + 1);
  drawCenteredText(ctx, displayedSeatNum, lBoxX + lBoxW / 2, boxY + 92, lBoxW - 40);

  // 5. Card Footer (مسئول البيانات والمعلومات | رئيس الكنترول | رئيس اللجنة)
  const footerLineY = inY + 480;
  ctx.strokeStyle = '#0e294b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(inX + 60, footerLineY);
  ctx.lineTo(inX + inW - 60, footerLineY);
  ctx.stroke();

  const footerTextY = inY + 510;
  ctx.direction = isEnglish ? 'ltr' : 'rtl';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px "Cairo", sans-serif';
  ctx.textBaseline = 'middle';

  const dataOfficerDisplay = dataOfficer.trim()
    ? dataOfficer.trim()
    : '........................';
  const controlHeadDisplay = controlHead.trim()
    ? controlHead.trim()
    : '........................';
  const committeeHeadDisplay = committeeHead.trim()
    ? committeeHead.trim()
    : '........................';

  const tenSpaces = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
  const combinedFooterText = isEnglish
    ? `Data Officer : ${dataOfficerDisplay}${tenSpaces}Control Head : ${controlHeadDisplay}${tenSpaces}Committee Head : ${committeeHeadDisplay}${tenSpaces}`
    : `مسئول البيانات والمعلومات : ${dataOfficerDisplay}${tenSpaces}رئيس الكنترول : ${controlHeadDisplay}${tenSpaces}رئيس اللجنة : ${committeeHeadDisplay}${tenSpaces}`;
  ctx.textAlign = 'center';
  ctx.fillText(combinedFooterText, centerX, footerTextY, inW - 100);

  // 6. Horizontal Line (<hr>) and Poetry Quote Line below Card Footer
  const quoteHrY = inY + 540;
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(inX + 60, quoteHrY);
  ctx.lineTo(inX + inW - 60, quoteHrY);
  ctx.stroke();

  const quoteTextY = inY + 568;
  const quoteLine = getActiveFooterTagline(selectedGrade, stage);
  const isCustomAd = quoteLine !== 'المنظومة الرقمية لريادة أعمال المدارس المصرية  01098594956 - 01131097055';
  const finalQuoteLine = isCustomAd ? quoteLine : SEAT_CARD_NO_QR_QUOTES[studentIdx % SEAT_CARD_NO_QR_QUOTES.length];
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0e294b';
  let qFontSize = 19;
  ctx.font = `bold ${qFontSize}px "Cairo", sans-serif`;
  while (qFontSize > 9 && ctx.measureText(finalQuoteLine).width > inW - 120) {
    qFontSize -= 0.5;
    ctx.font = `bold ${qFontSize}px "Cairo", sans-serif`;
  }
  ctx.fillText(finalQuoteLine, centerX, quoteTextY, inW - 120);

  ctx.restore();
}

export const getMiddleActualMaxGrade = (key: string, item?: any): number => {
  const k = String(key || '').toLowerCase();
  const lbl = String(item?.label || item?.name || '').trim();
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
  return item?.maxGrade || 100;
};

export function getSubjectsConfigForStageGrade(stage?: string, selectedGrade?: string, isHomeschool?: boolean) {
  const isKindergarten = stage === 'kindergarten';
  const isPrimary1To3 =
    stage === 'primary' &&
    (['الصف الأول', 'الصف الثاني', 'الصف الثالث', '1st Grade', '2nd Grade', '3rd Grade'].includes(
      selectedGrade || ''
    ) ||
      selectedGrade?.includes('الأول') ||
      selectedGrade?.includes('الاول') ||
      selectedGrade?.includes('الثاني') ||
      selectedGrade?.includes('الثالث'));
  const isPrimary4To6 =
    stage === 'primary' &&
    (['الصف الرابع', 'الصف الخامس', 'الصف السادس', '4th Grade', '5th Grade', '6th Grade'].includes(
      selectedGrade || ''
    ) ||
      selectedGrade?.includes('الرابع') ||
      selectedGrade?.includes('الخامس') ||
      selectedGrade?.includes('السادس'));
  const isMiddle = stage === 'prep' || stage === 'middle';
  const isHomeschoolResolved = Boolean(
    isHomeschool === true ||
    (isHomeschool !== false && typeof window !== 'undefined' && localStorage.getItem('current_system_type') === 'homeschool')
  );
  const isSecondary1 =
    stage === 'secondary' &&
    ([
      'الصف الأول',
      'الصف الاول',
      'الصف الأول الثانوي',
      'الصف الاول الثانوى',
      '1st Grade',
    ].includes(selectedGrade || '') ||
      selectedGrade?.includes('الأول') ||
      selectedGrade?.includes('الاول'));
  const isSecondary2Scientific =
    stage === 'secondary' &&
    (selectedGrade === 'الصف الثاني_scientific' ||
      (selectedGrade?.includes('الثاني') && selectedGrade?.includes('scientific')) ||
      (selectedGrade?.includes('الثانى') && selectedGrade?.includes('scientific')));
  const isSecondary2Literary =
    stage === 'secondary' &&
    (selectedGrade === 'الصف الثاني_literary' ||
      (selectedGrade?.includes('الثاني') && selectedGrade?.includes('literary')) ||
      (selectedGrade?.includes('الثانى') && selectedGrade?.includes('literary')) ||
      (selectedGrade?.toLowerCase().includes('2nd') && selectedGrade?.includes('literary')));
  const isSecondary2ModernMedical =
    stage === 'secondary' &&
    Boolean(
      selectedGrade?.includes('modern_medical') ||
      selectedGrade?.includes('medical') ||
      selectedGrade?.includes('الطب')
    );
  const isSecondary2ModernEngineering =
    stage === 'secondary' &&
    Boolean(
      selectedGrade?.includes('modern_engineering') ||
      selectedGrade?.includes('engineering') ||
      selectedGrade?.includes('الهندسة')
    );
  const isSecondary2ModernBusiness =
    stage === 'secondary' &&
    Boolean(
      selectedGrade?.includes('modern_business') ||
      selectedGrade?.includes('business') ||
      selectedGrade?.includes('الأعمال') ||
      selectedGrade?.includes('الاعمال')
    );
  const isSecondary2ModernArts =
    stage === 'secondary' &&
    Boolean(
      selectedGrade?.includes('modern_arts') ||
      selectedGrade?.includes('arts') ||
      selectedGrade?.includes('الآداب') ||
      selectedGrade?.includes('الاداب')
    );

  let defaultSubjects: any[] = [];
  if (isKindergarten) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
      { key: 'multidisciplinary', label: 'متعدد التخصصات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
      { key: 'pe', label: 'التربية البدنية والصحية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
    ];
  } else if (stage === 'primary' && isPrimary1To3) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 70, learningOutcomesType: 'pass_fail' },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'pass_fail' },
      { key: 'tokkatsu', label: 'أنشطة التوكاتسو', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'pass_fail' },
    ];
  } else if (stage === 'primary' && isPrimary4To6) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'social_studies', label: 'الدراسات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 70, learningOutcomesType: 'pass_fail' },
      { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'pass_fail' },
      { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'pass_fail' },
      { key: 'fields', label: 'المجالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'pass_fail' },
      { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'pass_fail' },
    ];
  } else if (isMiddle) {
    if (isHomeschoolResolved) {
      defaultSubjects = [
        { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 80, maxWrittenGrade: 80, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 60, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 60, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 40, maxWrittenGrade: 40, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'social_studies', label: 'الدراسات الاجتماعية', isAddedToTotal: true, maxGrade: 40, maxWrittenGrade: 40, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 40, maxWrittenGrade: 40, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 70 },
        { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 20, maxWrittenGrade: 20, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 20, maxWrittenGrade: 20, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
      ];
    } else {
      defaultSubjects = [
        { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'social_studies', label: 'الدراسات الاجتماعية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 70 },
        { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50 },
        { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50 },
        { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50 },
        { key: 'activity1', label: 'النشاط الأول', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50 },
        { key: 'activity2', label: 'النشاط الثانى', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50 },
      ];
    }
  } else if (isSecondary1) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'integrated_sciences', label: 'العلوم المتكاملة', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'philosophy_logic', label: 'الفلسفة والمنطق', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'programming_ai', label: 'البرمجة والذكاء الإصطناعى', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70 },
      { key: 'activity', label: 'النشاط', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50 },
    ];
  } else if (isSecondary2ModernMedical) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 100, maxAssessmentsGrade: 100, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 100, maxAssessmentsGrade: 100, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 100, maxAssessmentsGrade: 100, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'elective_physics_math', label: 'المادة الإختيارية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 100, maxAssessmentsGrade: 100, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'financial_literacy', label: 'الثقافة المالية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 100, maxAssessmentsGrade: 100, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 100, maxAssessmentsGrade: 100, maxWrittenGrade: 0, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50 },
    ];
  } else if (isSecondary2ModernEngineering) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'physics', label: 'الفيزياء', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'programming_ai', label: 'البرمجة والذكاء الإصطناعى', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70 },
      { key: 'financial_literacy', label: 'الثقافة المالية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'educational_vocational_activity', label: 'النشاط التربوى والمهنى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50 },
    ];
  } else if (isSecondary2ModernBusiness) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'accounting', label: 'المحاسبة والعلوم المالية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'business_admin', label: 'إدارة الأعمال والاقتصاد', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70 },
      { key: 'financial_literacy', label: 'الثقافة المالية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'educational_vocational_activity', label: 'النشاط التربوى والمهنى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50 },
    ];
  } else if (isSecondary2ModernArts) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'geography', label: 'الجغرافيا', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'psychology', label: 'علم النفس والاجتماع', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'arts_design', label: 'الفنون والتصميم', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70 },
      { key: 'financial_literacy', label: 'الثقافة المالية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'educational_vocational_activity', label: 'النشاط التربوى والمهنى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50 },
    ];
  } else if (isSecondary2Scientific || isSecondary2Literary) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      ...(isSecondary2Literary
        ? [
            { key: 'geography', label: 'الجغرافيا', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
            { key: 'psychology', label: 'علم النفس', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
          ]
        : [
            { key: 'chemistry', label: 'الكيمياء', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
            { key: 'physics', label: 'الفيزياء', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
          ]),
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70 },
      { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'national_education', label: 'التربية الوطنية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
      { key: 'educational_vocational_activity', label: 'النشاط التربوى والمهنى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50 },
    ];
  } else if (stage === 'secondary') {
    const isSec2 = selectedGrade?.includes('الثاني') || selectedGrade?.includes('الثانى') || selectedGrade?.toLowerCase().includes('2nd');
    if (isSec2) {
      defaultSubjects = [
        { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'geography', label: 'الجغرافيا', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'psychology', label: 'علم النفس', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70 },
        { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'national_education', label: 'التربية الوطنية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'educational_vocational_activity', label: 'النشاط التربوى والمهنى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50 },
      ];
    } else {
      defaultSubjects = [
        { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'integrated_sciences', label: 'العلوم المتكاملة', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'philosophy_logic', label: 'الفلسفة والمنطق', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'programming_ai', label: 'البرمجة والذكاء الإصطناعى', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50 },
        { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70 },
        { key: 'activity', label: 'النشاط', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50 },
      ];
    }
  }

  if (stage === 'secondary' && isHomeschoolResolved) {
    defaultSubjects = defaultSubjects.map(sub => ({
      ...sub,
      maxAssessmentsGrade: 0,
      maxWrittenGrade: sub.hasWrittenExam !== false ? (sub.actualMaxGrade || sub.maxGrade || 100) : 0,
      hasWrittenExam: sub.hasWrittenExam !== false,
    }));
  }

  let customCols = [...defaultSubjects];
  let defaultSubjectsOverrides: Record<string, any> = {};

  try {
    if (stage && selectedGrade) {
      const savedCols = localStorage.getItem(`${stage}_${selectedGrade}_assessments_custom_cols`);
      if (savedCols) {
        let parsed = JSON.parse(savedCols);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (isKindergarten) {
            parsed = parsed.filter(
              (c: any) =>
                c.key !== 'discover' &&
                c.key !== 'math' &&
                c.label?.trim() !== 'الرياضيات' &&
                !c.label?.includes('الرياضيات') &&
                !c.label?.includes('رياضيات')
            );
          } else if (isPrimary1To3) {
            parsed = parsed.filter((c: any) => c.key !== 'discover' && c.key !== 'values');
          } else if (isPrimary4To6) {
            parsed = parsed.filter(
              (c: any) => c.key !== 'discover' && c.key !== 'values' && c.key !== 'skills'
            );
          } else if (isMiddle) {
            parsed = parsed.filter((c: any) => c.key !== 'computer');
          }

          defaultSubjects.forEach((def) => {
            const idx = parsed.findIndex((c: any) => c.key === def.key);
            if (idx === -1) {
              parsed.push({
                ...def,
                labelEn: def.labelEn || getStoredSubjectEn(def.key, def.label),
              });
            } else {
              parsed[idx] = {
                ...def,
                ...parsed[idx],
                label: parsed[idx].label || def.label,
                labelEn: parsed[idx].labelEn || def.labelEn || getStoredSubjectEn(parsed[idx].key, parsed[idx].label),
                isAddedToTotal: def.isAddedToTotal,
                maxGrade: def.maxGrade,
                actualMaxGrade: def.actualMaxGrade,
                maxAssessmentsGrade: def.maxAssessmentsGrade,
                maxWrittenGrade: def.maxWrittenGrade,
                hasWrittenExam: def.hasWrittenExam,
                minPassPercentage:
                  parsed[idx].minPassPercentage === undefined ||
                  parsed[idx].minPassPercentage === 30 ||
                  parsed[idx].minPassPercentage === 10 ||
                  parsed[idx].minPassPercentage === 70 ||
                  parsed[idx].minPassPercentage === 7.2
                    ? def.minPassPercentage
                    : parsed[idx].minPassPercentage,
                minTotalPassPercentage:
                  parsed[idx].minTotalPassPercentage !== undefined
                    ? parsed[idx].minTotalPassPercentage
                    : def.minTotalPassPercentage,
                learningOutcomesType:
                  parsed[idx].learningOutcomesType !== undefined
                    ? parsed[idx].learningOutcomesType
                    : def.learningOutcomesType,
              };
            }
          });
          customCols = parsed;
        }
      }
      const savedOvr = localStorage.getItem(`${stage}_${selectedGrade}_assessments_default_overrides`);
      if (savedOvr) {
        defaultSubjectsOverrides = JSON.parse(savedOvr) || {};
      }
    }
  } catch {}

  customCols = customCols.map((c: any) => {
    if (c.key.includes('elective') || c.label?.includes('اختيارية') || c.label?.includes('الإختيارية')) {
      return { ...c, label: 'المادة الإختيارية' };
    }
    return c;
  });
  Object.keys(defaultSubjectsOverrides).forEach((k) => {
    if (k.includes('elective') || defaultSubjectsOverrides[k].label?.includes('اختيارية') || defaultSubjectsOverrides[k].label?.includes('الإختيارية')) {
      defaultSubjectsOverrides[k] = { ...defaultSubjectsOverrides[k], label: 'المادة الإختيارية' };
    }
  });

  return { customCols, defaultSubjectsOverrides, isKindergarten };
}

export interface StudentSemesterSummary {
  status: 'pass' | 'second_round' | 'fail' | 'incomplete';
  finalResult: string;
  evaluation: string;
  percentage: string;
  addedTotal: number | null;
  nonAddedTotal: number;
  failedCount: string;
  failedSubjects: string;
  mercyCount?: string;
  mercySubjects?: string;
}

export function evaluateStudentSemesterSummary(
  student: StudentData,
  targetSem: 'first' | 'second',
  stage?: string,
  selectedGrade?: string
): StudentSemesterSummary {
  const { customCols, defaultSubjectsOverrides, isKindergarten } = getSubjectsConfigForStageGrade(
    stage,
    selectedGrade
  );

  const rawGender = student.gender || '';
  const g = typeof rawGender === 'string' ? rawGender.trim().toLowerCase() : '';
  const nid = typeof student.nationalId === 'string' ? student.nationalId.trim() : '';
  const nidGenderDigit = nid.length >= 13 ? parseInt(nid[12], 10) : NaN;
  const isFemaleByNid = !isNaN(nidGenderDigit) && nidGenderDigit % 2 === 0;
  const isFemale =
    g === 'female' ||
    g === 'أنثى' ||
    g === 'انثى' ||
    g === 'بنت' ||
    g.includes('أنث') ||
    g.includes('انث') ||
    g.includes('بنت') ||
    (!g && isFemaleByNid);

  const isStudentRegular = Boolean(
    (student as any)?.systemType === 'regular' ||
    (student as any)?.enrollmentType === 'منتظم' ||
    (student as any)?.enrollmentStatus === 'منتظم' ||
    student.studentStatus === 'منتظم' ||
    student.studentStatus === 'نظامى'
  );
  const isMiddleStage = stage === 'middle' || stage === 'prep' || stage === 'secondary';
  const isMiddleHomeschool = isMiddleStage && !isStudentRegular && Boolean(
    (student as any)?.systemType === 'homeschool' ||
    (student as any)?.enrollmentType === 'منازل' ||
    student.studentStatus === 'منازل' ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('current_system_type') === 'homeschool' ||
      localStorage.getItem('systemType') === 'homeschool'
    ))
  );

  if (customCols.length === 0) {
    return {
      status: 'incomplete',
      finalResult: '-',
      evaluation: '-',
      percentage: '-',
      addedTotal: null,
      nonAddedTotal: 0,
      failedCount: '-',
      failedSubjects: '-',
    };
  }

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
    const isAbsence =
      trimmed === 'غ' || (typeof trimmed === 'string' && trimmed.toLowerCase() === 'a');
    if (isAbsence) return 0;
    const num = parseFloat(typeof raw === 'string' ? raw.replace(',', '.') : String(raw));
    return isNaN(num) ? 0 : num;
  };

  const isMax40 = stage === 'primary';
  const isMiddleStageCs = stage === 'middle' || stage === 'prep';
  const isSec2SciOrLitCs =
    stage === 'secondary' &&
    Boolean(
      selectedGrade &&
        (selectedGrade.includes('scientific') ||
          selectedGrade.includes('literary') ||
          selectedGrade.includes('modern_') ||
          selectedGrade.includes('medical') ||
          selectedGrade.includes('engineering') ||
          selectedGrade.includes('business') ||
          selectedGrade.includes('arts') ||
          selectedGrade.includes('الطب') ||
          selectedGrade.includes('الهندسة') ||
          selectedGrade.includes('الأعمال') ||
          selectedGrade.includes('الآداب'))
    );
  const isSec2Modern =
    stage === 'secondary' &&
    Boolean(
      selectedGrade &&
      (selectedGrade.includes('modern_') ||
       selectedGrade.includes('medical') ||
       selectedGrade.includes('engineering') ||
       selectedGrade.includes('business') ||
       selectedGrade.includes('arts') ||
       selectedGrade.includes('الطب') ||
       selectedGrade.includes('الهندسة') ||
       selectedGrade.includes('الأعمال') ||
       selectedGrade.includes('الآداب'))
    );
  const defaultActualPctMap: Record<string, number> = isMiddleStageCs
    ? {
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
      }
    : isSec2SciOrLitCs
    ? {
        arabic: 0.4,
        english: 0.3,
        math: 0.3,
        history: 0.3,
        chemistry: 0.3,
        physics: 0.3,
        geography: 0.3,
        psychology: 0.3,
        biology: 0.3,
        programming_ai: 0.3,
        accounting: 0.3,
        business_admin: 0.3,
        arts_design: 0.3,
        religion: 0.2,
        second_foreign_language: 0.2,
        financial_literacy: 0.125,
        pe: 0.125,
        national_education: 0.125,
        educational_vocational_activity: 0.1,
      }
    : {};

  const totalMax = isSec2Modern ? 400 : customCols.reduce((sum, c) => {
    const ovr = defaultSubjectsOverrides?.[c.key];
    const isAdded =
      ovr?.isAddedToTotal !== undefined ? ovr.isAddedToTotal : c.isAddedToTotal !== false;
    if (!isAdded) return sum;
    if (isKindergarten) {
      return (
        sum +
        (ovr?.maxAssessmentsGrade !== undefined
          ? ovr.maxAssessmentsGrade
          : c.maxAssessmentsGrade !== undefined
          ? c.maxAssessmentsGrade
          : ovr?.maxGrade !== undefined
          ? ovr.maxGrade
          : c.maxGrade !== undefined
          ? c.maxGrade
          : 100)
      );
    }
    if (stage === 'primary' && c.key === 'arabic') {
      return sum + (targetSem === 'second' ? 200 : 100);
    }
    const maxAssess =
      ovr?.maxAssessmentsGrade !== undefined
        ? ovr.maxAssessmentsGrade
        : c.maxAssessmentsGrade !== undefined
        ? c.maxAssessmentsGrade
        : c.maxGrade !== undefined
        ? c.maxGrade
        : isMax40
        ? 40
        : 70;
    const hasWritten =
      (ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : c.hasWrittenExam) !== false;
    const maxWritten = hasWritten
      ? ovr?.maxWrittenGrade !== undefined
        ? ovr.maxWrittenGrade
        : c.maxWrittenGrade !== undefined
        ? c.maxWrittenGrade
        : isMax40
        ? 60
        : 30
      : 0;
    const maxVal = isSec2Modern && isAdded ? maxWritten : (maxAssess + maxWritten);
    if (targetSem === 'second') {
      const twoSemRawMax = maxVal * 2;
      const customActualMax =
        ovr?.actualMaxGrade !== undefined
          ? Number(ovr.actualMaxGrade)
          : (c as any).actualMaxGrade !== undefined
          ? Number((c as any).actualMaxGrade)
          : undefined;
      const actualPct =
        customActualMax !== undefined && twoSemRawMax > 0
          ? customActualMax / twoSemRawMax
          : defaultActualPctMap[c.key] ?? 0.5;
      const isMiddle = stage === 'middle' || stage === 'prep';
      const actualMaxVal =
        customActualMax !== undefined
          ? customActualMax
          : (isSec2Modern && isAdded
              ? maxWritten
              : (isMiddle
                  ? getMiddleActualMaxGrade(c.key, c)
                  : roundToOneDecimal(twoSemRawMax * actualPct)));
      return sum + actualMaxVal;
    }
    return sum + maxVal;
  }, 0);

  const gradingSettings = getGradingSettings(stage, selectedGrade);
  const hasMercyStage =
    stage === 'primary' || stage === 'middle' || stage === 'prep' || stage === 'secondary';
  const mercyBoosts =
    targetSem === 'second' && hasMercyStage
      ? getPrimaryStudentMercyBoosts(
          student,
          stage || '',
          customCols,
          defaultSubjectsOverrides,
          gradingSettings,
          selectedGrade
        )
      : {};
  const eligibleMercyBoosts =
    targetSem === 'second'
      ? getPrimaryStudentMercyBoosts(
          student,
          stage === 'kindergarten' ? 'primary' : stage || '',
          customCols,
          defaultSubjectsOverrides,
          gradingSettings,
          selectedGrade
        )
      : {};
  const eligibleMercyList = customCols
    .filter((c) => Boolean(eligibleMercyBoosts[c.key]))
    .map((c) => {
      const ovr = defaultSubjectsOverrides?.[c.key];
      const label = ovr?.label || c.label;
      const b = eligibleMercyBoosts[c.key];
      return `${label} ( + ${b.boostAmount} ) `;
    });
  const mercyCountStr = eligibleMercyList.length > 0 ? String(eligibleMercyList.length) : '0';
  const mercySubjectsStr = eligibleMercyList.length > 0 ? eligibleMercyList.join(' - ') : '-';

  const getStudentSemesterScore = (semKey: 'first' | 'second', forAdded: boolean) => {
    let assess = student.assessments?.[semKey];
    let written = student.writtenExams?.[semKey];

    if (!assess && student.assessments) {
      if (semKey === 'first') assess = student.assessments['الفصل الدراسي الأول'];
      else if (semKey === 'second')
        assess =
          student.assessments['الفصل الدراسي الثاني'] ||
          (student.assessments as any)['الفصل الدراسي الثانى'];
    }
    if (!written && student.writtenExams) {
      if (semKey === 'first') written = student.writtenExams['الفصل الدراسي الأول'];
      else if (semKey === 'second')
        written =
          student.writtenExams['الفصل الدراسي الثاني'] ||
          (student.writtenExams as any)['الفصل الدراسي الثانى'];
    }

    let semTotal = 0;
    let hasValue = false;
    const targetSubjects = customCols.filter((c) => {
      const ovr = defaultSubjectsOverrides?.[c.key];
      const isAdded =
        ovr?.isAddedToTotal !== undefined ? ovr.isAddedToTotal : c.isAddedToTotal !== false;
      return forAdded ? isAdded : !isAdded;
    });

    targetSubjects.forEach((c) => {
      const ovr = defaultSubjectsOverrides?.[c.key];
      const hasWritten =
        (ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : c.hasWrittenExam) !== false;
      const boost = semKey === 'second' ? mercyBoosts[c.key] : undefined;

      const includeAssess = !(isSec2Modern && forAdded);
      if (includeAssess && assess && isRecorded(assess, c.key)) {
        semTotal += parseVal((assess as any)[c.key]);
        hasValue = true;
      }
      if (written && hasWritten && isRecorded(written, c.key)) {
        semTotal += parseVal((written as any)[c.key]);
        hasValue = true;
      }
      if (includeAssess && boost) {
        semTotal += boost.boostAmount / (boost.actualPct || 0.5);
      }
    });

    return { total: semTotal, hasValue };
  };

  let addedTotal: number | null = null;
  let nonAddedTotal = 0;

  if (targetSem === 'first') {
    const s1Added = getStudentSemesterScore('first', true);
    const s1NonAdded = getStudentSemesterScore('first', false);
    if (s1Added.hasValue) addedTotal = roundToOneDecimal(s1Added.total);
    if (s1NonAdded.hasValue) nonAddedTotal = roundToOneDecimal(s1NonAdded.total);
  } else {
    if (isKindergarten) {
      const s1Added = getStudentSemesterScore('first', true);
      const s2Added = getStudentSemesterScore('second', true);
      if (s1Added.hasValue || s2Added.hasValue) {
        addedTotal = roundToOneDecimal(
          (s1Added.hasValue && s2Added.hasValue)
            ? (s1Added.total + s2Added.total) / 2
            : (s2Added.hasValue ? s2Added.total : s1Added.total)
        );
      }
    } else {
      let sumActualAdded = 0;
      let hasAnyAddedVal = false;
      let assess1 = student.assessments?.['first'];
      let assess2 = student.assessments?.['second'] || student.assessments?.['الفصل الدراسي الثاني'] || (student.assessments as any)?.['الفصل الدراسي الثانى'];
      let written1 = student.writtenExams?.['first'];
      let written2 = student.writtenExams?.['second'] || student.writtenExams?.['الفصل الدراسي الثاني'] || (student.writtenExams as any)?.['الفصل الدراسي الثانى'];
      if (!assess1 && student.assessments) assess1 = student.assessments['الفصل الدراسي الأول'];
      if (!written1 && student.writtenExams) written1 = student.writtenExams['الفصل الدراسي الأول'];

      customCols.forEach((c) => {
        const ovr = defaultSubjectsOverrides?.[c.key];
        const isAdded =
          ovr?.isAddedToTotal !== undefined ? ovr.isAddedToTotal : c.isAddedToTotal !== false;
        if (!isAdded) return;

        const hasWritten =
          (ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : c.hasWrittenExam) !== false;
        const boost = mercyBoosts[c.key];

        const a1 = (!isSec2Modern || !isAdded) && assess1 && isRecorded(assess1, c.key) ? parseVal((assess1 as any)[c.key]) : 0;
        const w1 = written1 && hasWritten && isRecorded(written1, c.key) ? parseVal((written1 as any)[c.key]) : 0;
        const a2 = (!isSec2Modern || !isAdded) && assess2 && isRecorded(assess2, c.key) ? parseVal((assess2 as any)[c.key]) : 0;
        const w2 = written2 && hasWritten && isRecorded(written2, c.key) ? parseVal((written2 as any)[c.key]) : 0;

        const hasAnySem1 = (!isSec2Modern || !isAdded ? (assess1 && isRecorded(assess1, c.key)) : false) || (written1 && hasWritten && isRecorded(written1, c.key));
        const hasAnySem2 = (!isSec2Modern || !isAdded ? (assess2 && isRecorded(assess2, c.key)) : false) || (written2 && hasWritten && isRecorded(written2, c.key));

        if (hasAnySem1 || hasAnySem2) {
          hasAnyAddedVal = true;
          const sem1Sum = a1 + w1;
          const sem2Sum = a2 + w2;
          const rawSum = roundToOneDecimal(
            (hasAnySem1 && hasAnySem2)
              ? (sem1Sum + sem2Sum) / 2
              : (hasAnySem2 ? sem2Sum : sem1Sum)
          );

          const maxAssess =
            ovr?.maxAssessmentsGrade !== undefined
              ? ovr.maxAssessmentsGrade
              : c.maxAssessmentsGrade !== undefined
              ? c.maxAssessmentsGrade
              : ovr?.maxGrade !== undefined
              ? ovr.maxGrade
              : c.maxGrade !== undefined
              ? c.maxGrade
              : isMax40
              ? 40
              : 70;
          const maxWritten = hasWritten
            ? ovr?.maxWrittenGrade !== undefined
              ? ovr.maxWrittenGrade
              : c.maxWrittenGrade !== undefined
              ? c.maxWrittenGrade
              : isMax40
              ? 60
              : 30
            : 0;
          const maxVal = isSec2Modern && isAdded ? maxWritten : (maxAssess + maxWritten);
          const twoSemRawMax = maxVal * 2;
          const customActualMax =
            ovr?.actualMaxGrade !== undefined
              ? Number(ovr.actualMaxGrade)
              : (c as any).actualMaxGrade !== undefined
              ? Number((c as any).actualMaxGrade)
              : undefined;
          const isPrimary = stage === 'primary';
          const isMiddle = stage === 'middle' || stage === 'prep';
          const subjActualMax = customActualMax !== undefined
            ? customActualMax
            : (isSec2Modern && isAdded ? maxWritten : (isMiddle ? getMiddleActualMaxGrade(c.key, c) : (c.maxGrade || 100)));
          const actualScore = boost
            ? boost.boostedActualGrade
            : (isSec2Modern && isAdded
                ? roundToOneDecimal(hasAnySem1 && hasAnySem2 ? (w1 + w2) / 2 : (hasAnySem2 ? w2 : w1))
                : (isPrimary
                    ? rawSum
                    : roundToOneDecimal(((hasAnySem1 && hasAnySem2 ? (sem1Sum + sem2Sum) : (hasAnySem2 ? sem2Sum * 2 : sem1Sum * 2)) * subjActualMax) / 200)));
          sumActualAdded += actualScore;
        }
      });

      if (hasAnyAddedVal) {
        addedTotal = roundToOneDecimal(sumActualAdded);
      }
    }
    const s1NonAdded = getStudentSemesterScore('first', false);
    const s2NonAdded = getStudentSemesterScore('second', false);
    if (s1NonAdded.hasValue || s2NonAdded.hasValue) {
      nonAddedTotal = roundToOneDecimal(
        (s1NonAdded.hasValue && s2NonAdded.hasValue)
          ? (s1NonAdded.total + s2NonAdded.total) / 2
          : (s2NonAdded.hasValue ? s2NonAdded.total : s1NonAdded.total)
      );
    }
  }

  let percentage = '-';
  let evaluation = '-';
  if (addedTotal !== null && totalMax > 0) {
    const pct = (addedTotal / totalMax) * 100;
    percentage = `${roundToOneDecimal(pct)} %`;
    if (isKindergarten) {
      if (pct >= 85) evaluation = 'يفوق التوقعات دائماً';
      else if (pct >= 65) evaluation = 'يلبي التوقعات';
      else if (pct >= 50) evaluation = 'يلبي التوقعات أحياناً';
      else evaluation = 'أقل من المتوقع';
    } else {
      if (pct >= 85) evaluation = 'ممتاز';
      else if (pct >= 75) evaluation = 'جيد جداً';
      else if (pct >= 65) evaluation = 'جيد';
      else if (pct >= 50) evaluation = 'مقبول';
      else evaluation = 'دون المستوى';
    }
  }

  const assess1 =
    student.assessments?.['first'] || student.assessments?.['الفصل الدراسي الأول'];
  const assess2 =
    student.assessments?.['second'] ||
    student.assessments?.['الفصل الدراسي الثاني'] ||
    (student.assessments as any)?.['الفصل الدراسي الثانى'];
  const written1 =
    student.writtenExams?.['first'] || student.writtenExams?.['الفصل الدراسي الأول'];
  const written2 =
    student.writtenExams?.['second'] ||
    student.writtenExams?.['الفصل الدراسي الثاني'] ||
    (student.writtenExams as any)?.['الفصل الدراسي الثانى'];

  const failedSubjectNames: string[] = [];

  if (isKindergarten) {
    if (targetSem === 'first') {
      const isSem1Complete = customCols.every((c) => isRecorded(assess1, c.key));
      if (!isSem1Complete) {
        return {
          status: 'incomplete',
          finalResult: '-',
          evaluation,
          percentage,
          addedTotal,
          nonAddedTotal,
          failedCount: '-',
          failedSubjects: '-',
        };
      }
      customCols.forEach((c) => {
        const ovr = defaultSubjectsOverrides?.[c.key];
        const label = ovr?.label || c.label;
        const maxVal =
          ovr?.maxAssessmentsGrade !== undefined
            ? ovr.maxAssessmentsGrade
            : c.maxAssessmentsGrade !== undefined
            ? c.maxAssessmentsGrade
            : ovr?.maxGrade !== undefined
            ? ovr.maxGrade
            : c.maxGrade !== undefined
            ? c.maxGrade
            : 100;
        const score = parseVal(assess1 ? (assess1 as any)[c.key] : undefined);
        const pct = maxVal > 0 ? (score / maxVal) * 100 : 0;
        const isReligion = c.key === 'religion' || (label && label.includes('دين'));
        const minPass = isReligion
          ? 70
          : ovr?.minPassPercentage !== undefined
          ? ovr.minPassPercentage
          : c.minPassPercentage !== undefined
          ? c.minPassPercentage
          : 50;
        if (pct < minPass) failedSubjectNames.push(label);
      });
      const isFail = failedSubjectNames.length > 0;
      return {
        status: isFail ? 'fail' : 'pass',
        finalResult: isFail ? (isFemale ? 'لها برنامج علاجى' : 'له برنامج علاجى') : isFemale ? 'ناجحة' : 'ناجح',
        evaluation,
        percentage,
        addedTotal,
        nonAddedTotal,
        failedCount: isFail ? String(failedSubjectNames.length) : '0',
        failedSubjects: isFail ? failedSubjectNames.join(' - ') : '-',
      };
    } else {
      const isSem1Complete = customCols.every((c) => isRecorded(assess1, c.key));
      const isSem2Complete = customCols.every((c) => isRecorded(assess2, c.key));
      if (!isSem1Complete || !isSem2Complete) {
        return {
          status: 'incomplete',
          finalResult: '-',
          evaluation,
          percentage,
          addedTotal,
          nonAddedTotal,
          failedCount: '-',
          failedSubjects: '-',
        };
      }
      customCols.forEach((c) => {
        const ovr = defaultSubjectsOverrides?.[c.key];
        const label = ovr?.label || c.label;
        const maxVal =
          ovr?.maxAssessmentsGrade !== undefined
            ? ovr.maxAssessmentsGrade
            : c.maxAssessmentsGrade !== undefined
            ? c.maxAssessmentsGrade
            : ovr?.maxGrade !== undefined
            ? ovr.maxGrade
            : c.maxGrade !== undefined
            ? c.maxGrade
            : 100;
        const num1 = parseVal(assess1 ? (assess1 as any)[c.key] : undefined);
        const num2 = parseVal(assess2 ? (assess2 as any)[c.key] : undefined);
        const pct1 = maxVal > 0 ? (num1 / maxVal) * 100 : 0;
        const pct2 = maxVal > 0 ? (num2 / maxVal) * 100 : 0;
        const isReligion = c.key === 'religion' || (label && label.includes('دين'));
        const minPass = isReligion
          ? 70
          : ovr?.minPassPercentage !== undefined
          ? ovr.minPassPercentage
          : c.minPassPercentage !== undefined
          ? c.minPassPercentage
          : 50;
        if (pct1 < minPass || pct2 < minPass) failedSubjectNames.push(label);
      });
      const isFail = failedSubjectNames.length > 0;
      return {
        status: isFail ? 'fail' : 'pass',
        finalResult: isFail ? (isFemale ? 'لها برنامج علاجى' : 'له برنامج علاجى') : isFemale ? 'ناجحة' : 'ناجح',
        evaluation,
        percentage,
        addedTotal,
        nonAddedTotal,
        failedCount: isFail ? String(failedSubjectNames.length) : '0',
        failedSubjects: isFail ? failedSubjectNames.join(' - ') : '-',
        mercyCount: mercyCountStr,
        mercySubjects: mercySubjectsStr,
      };
    }
  }

  const writtenCols = customCols.filter((c) => {
    const ovr = defaultSubjectsOverrides?.[c.key];
    return (ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : c.hasWrittenExam) !== false;
  });
  const hasAnyWrittenCols = writtenCols.length > 0;

  if (targetSem === 'first') {
    const isAssess1Complete = isMiddleHomeschool || customCols.every((c) => isRecorded(assess1, c.key));
    const isWritten1Complete =
      !hasAnyWrittenCols || writtenCols.every((c) => isRecorded(written1, c.key));
    if (!isAssess1Complete || !isWritten1Complete) {
      return {
        status: 'incomplete',
        finalResult: '-',
        evaluation,
        percentage,
        addedTotal,
        nonAddedTotal,
        failedCount: '-',
        failedSubjects: '-',
      };
    }

    customCols.forEach((c) => {
      const ovr = defaultSubjectsOverrides?.[c.key];
      const label = ovr?.label || c.label;
      const isReligion = c.key === 'religion' || Boolean(label && label.includes('دين'));
      const hasWritten =
        (ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : c.hasWrittenExam) !== false;

      // فى المرحلة الإعدادية منازل: حذف المواد التى ليس لها امتحان تحريرى من معادلات مواد الرسوب
      if (isMiddleHomeschool && !hasWritten) {
        return;
      }

      const maxAssess =
        ovr?.maxAssessmentsGrade !== undefined
          ? ovr.maxAssessmentsGrade
          : c.maxAssessmentsGrade !== undefined
          ? c.maxAssessmentsGrade
          : c.maxGrade !== undefined
          ? c.maxGrade
          : isMax40
          ? 40
          : 70;
      const maxWritten = hasWritten
        ? ovr?.maxWrittenGrade !== undefined
          ? ovr.maxWrittenGrade
          : c.maxWrittenGrade !== undefined
          ? c.maxWrittenGrade
          : isMax40
          ? 60
          : 30
        : 0;
      const subjectMax = maxAssess + maxWritten;
      const minTotalPass =
        ovr?.minTotalPassPercentage !== undefined
          ? ovr.minTotalPassPercentage
          : c.minTotalPassPercentage !== undefined
          ? c.minTotalPassPercentage
          : isReligion
          ? 70
          : 50;

      const a1 = assess1 ? parseVal((assess1 as any)[c.key]) : 0;
      const w1 = written1 && hasWritten ? parseVal((written1 as any)[c.key]) : 0;

      if (hasWritten) {
        const sem1Total = a1 + w1;
        const subjectTotalPercent = subjectMax > 0 ? (sem1Total / subjectMax) * 100 : 0;
        const passedSubjectTotal = subjectTotalPercent >= minTotalPass;

        const rawMinWrittenPass =
          ovr?.minPassPercentage !== undefined ? ovr.minPassPercentage : c.minPassPercentage;
        const minWrittenPass =
          rawMinWrittenPass === undefined ||
          rawMinWrittenPass === 70 ||
          rawMinWrittenPass === 10 ||
          rawMinWrittenPass === 7.2
            ? stage === 'secondary'
              ? 25
              : 30
            : rawMinWrittenPass;
        const written1Percent = maxWritten > 0 ? (w1 / maxWritten) * 100 : 0;
        const passedWrittenExam = written1Percent >= minWrittenPass;

        if (!passedSubjectTotal || !passedWrittenExam) {
          failedSubjectNames.push(label);
        }
      } else {
        const assessPercent = maxAssess > 0 ? (a1 / maxAssess) * 100 : 0;
        if (assessPercent < minTotalPass) {
          failedSubjectNames.push(label);
        }
      }
    });

    const isFail = failedSubjectNames.length > 0;
    return {
      status: isFail ? 'fail' : 'pass',
      finalResult: isFail ? (isFemale ? 'راسبة' : 'راسب') : isFemale ? 'ناجحة' : 'ناجح',
      evaluation,
      percentage,
      addedTotal,
      nonAddedTotal,
      failedCount: isFail ? String(failedSubjectNames.length) : '0',
      failedSubjects: isFail ? failedSubjectNames.join(' - ') : '-',
    };
  } else {
    const isAssess1Complete = isMiddleHomeschool || customCols.every((c) => isRecorded(assess1, c.key));
    const isAssess2Complete = isMiddleHomeschool || customCols.every((c) => isRecorded(assess2, c.key));
    const isWritten1Complete =
      !hasAnyWrittenCols || writtenCols.every((c) => isRecorded(written1, c.key));
    const isWritten2Complete =
      !hasAnyWrittenCols || writtenCols.every((c) => isRecorded(written2, c.key));
    if (!isAssess1Complete || !isAssess2Complete || !isWritten1Complete || !isWritten2Complete) {
      return {
        status: 'incomplete',
        finalResult: '-',
        evaluation,
        percentage,
        addedTotal,
        nonAddedTotal,
        failedCount: '-',
        failedSubjects: '-',
      };
    }

    customCols.forEach((c) => {
      if (mercyBoosts[c.key]) return;
      const ovr = defaultSubjectsOverrides?.[c.key];
      const label = ovr?.label || c.label;
      const isReligion = c.key === 'religion' || Boolean(label && label.includes('دين'));
      const hasWritten =
        (ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : c.hasWrittenExam) !== false;

      // فى المرحلة الإعدادية منازل: حذف المواد التى ليس لها امتحان تحريرى من معادلات مواد الرسوب
      if (isMiddleHomeschool && !hasWritten) {
        return;
      }
      const maxAssess =
        ovr?.maxAssessmentsGrade !== undefined
          ? ovr.maxAssessmentsGrade
          : c.maxAssessmentsGrade !== undefined
          ? c.maxAssessmentsGrade
          : c.maxGrade !== undefined
          ? c.maxGrade
          : isMax40
          ? 40
          : 70;
      const maxWritten = hasWritten
        ? ovr?.maxWrittenGrade !== undefined
          ? ovr.maxWrittenGrade
          : c.maxWrittenGrade !== undefined
          ? c.maxWrittenGrade
          : isMax40
          ? 60
          : 30
        : 0;
      const subjectMax = maxAssess + maxWritten;
      const minTotalPass =
        ovr?.minTotalPassPercentage !== undefined
          ? ovr.minTotalPassPercentage
          : c.minTotalPassPercentage !== undefined
          ? c.minTotalPassPercentage
          : isReligion
          ? 70
          : 50;

      const a1 = assess1 ? parseVal((assess1 as any)[c.key]) : 0;
      const a2 = assess2 ? parseVal((assess2 as any)[c.key]) : 0;
      const w1 = written1 && hasWritten ? parseVal((written1 as any)[c.key]) : 0;
      const w2 = written2 && hasWritten ? parseVal((written2 as any)[c.key]) : 0;

      const sem1Total = a1 + w1;
      const sem2Total = a2 + w2;
      const finalSubjectScore = (sem1Total + sem2Total) / 2;

      if (hasWritten) {
        const subjectTotalPercent = subjectMax > 0 ? (finalSubjectScore / subjectMax) * 100 : 0;
        const passedSubjectTotal = subjectTotalPercent >= minTotalPass;

        const rawMinWrittenPass =
          ovr?.minPassPercentage !== undefined ? ovr.minPassPercentage : c.minPassPercentage;
        const minWrittenPass =
          rawMinWrittenPass === undefined ||
          rawMinWrittenPass === 70 ||
          rawMinWrittenPass === 10 ||
          rawMinWrittenPass === 7.2
            ? stage === 'secondary'
              ? 25
              : 30
            : rawMinWrittenPass;
        const written2Percent = maxWritten > 0 ? (w2 / maxWritten) * 100 : 0;
        const passedWrittenExam = written2Percent >= minWrittenPass;

        if (!passedSubjectTotal || !passedWrittenExam) {
          failedSubjectNames.push(label);
        }
      } else {
        const finalAssessScore = (a1 + a2) / 2;
        const assessPercent = maxAssess > 0 ? (finalAssessScore / maxAssess) * 100 : 0;
        if (assessPercent < minTotalPass) {
          failedSubjectNames.push(label);
        }
      }
    });

    const failingSubjectsCount = failedSubjectNames.length;
    if (stage === 'primary') {
      if (failingSubjectsCount > 0) {
        return {
          status: 'second_round',
          finalResult: 'دور ثان',
          evaluation,
          percentage,
          addedTotal,
          nonAddedTotal,
          failedCount: String(failingSubjectsCount),
          failedSubjects: failedSubjectNames.join(' - '),
          mercyCount: mercyCountStr,
          mercySubjects: mercySubjectsStr,
        };
      }
      return {
        status: 'pass',
        finalResult: isFemale ? 'ناجحة' : 'ناجح',
        evaluation,
        percentage,
        addedTotal,
        nonAddedTotal,
        failedCount: '0',
        failedSubjects: '-',
        mercyCount: mercyCountStr,
        mercySubjects: mercySubjectsStr,
      };
    }

    if (failingSubjectsCount >= 3) {
      return {
        status: 'fail',
        finalResult: isFemale ? 'راسبة' : 'راسب',
        evaluation,
        percentage,
        addedTotal,
        nonAddedTotal,
        failedCount: String(failingSubjectsCount),
        failedSubjects: failedSubjectNames.join(' - '),
        mercyCount: mercyCountStr,
        mercySubjects: mercySubjectsStr,
      };
    }

    if (failingSubjectsCount > 0) {
      return {
        status: 'second_round',
        finalResult: 'دور ثان',
        evaluation,
        percentage,
        addedTotal,
        nonAddedTotal,
        failedCount: String(failingSubjectsCount),
        failedSubjects: failedSubjectNames.join(' - '),
        mercyCount: mercyCountStr,
        mercySubjects: mercySubjectsStr,
      };
    }

    return {
      status: 'pass',
      finalResult: isFemale ? 'ناجحة' : 'ناجح',
      evaluation,
      percentage,
      addedTotal,
      nonAddedTotal,
      failedCount: '0',
      failedSubjects: '-',
      mercyCount: mercyCountStr,
      mercySubjects: mercySubjectsStr,
    };
  }
}

function evaluateStudentSingleSubjectSummary(
  student: StudentData,
  subjectKey: string,
  targetSem: 'first' | 'second',
  stage?: string,
  selectedGrade?: string,
  customSubjectLabel?: string
): StudentSemesterSummary {
  const { customCols, defaultSubjectsOverrides, isKindergarten } = getSubjectsConfigForStageGrade(
    stage,
    selectedGrade
  );

  const rawGender = student.gender || '';
  const g = typeof rawGender === 'string' ? rawGender.trim().toLowerCase() : '';
  const nid = typeof student.nationalId === 'string' ? student.nationalId.trim() : '';
  const nidGenderDigit = nid.length >= 13 ? parseInt(nid[12], 10) : NaN;
  const isFemaleByNid = !isNaN(nidGenderDigit) && nidGenderDigit % 2 === 0;
  const isFemale =
    g === 'female' ||
    g === 'أنثى' ||
    g === 'انثى' ||
    g === 'بنت' ||
    g.includes('أنث') ||
    g.includes('انث') ||
    g.includes('بنت') ||
    (!g && isFemaleByNid);

  const targetCol = customCols.find((c) => c.key === subjectKey);
  if (!targetCol) {
    return {
      status: 'incomplete',
      finalResult: '-',
      evaluation: '-',
      percentage: '-',
      addedTotal: null,
      nonAddedTotal: 0,
      failedCount: '-',
      failedSubjects: '-',
    };
  }

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
    const isAbsence =
      trimmed === 'غ' || (typeof trimmed === 'string' && trimmed.toLowerCase() === 'a');
    if (isAbsence) return 0;
    const num = parseFloat(typeof raw === 'string' ? raw.replace(',', '.') : String(raw));
    return isNaN(num) ? 0 : num;
  };

  const getEvalFromPct = (pct: number): string => {
    if (isKindergarten) {
      if (pct >= 85) return 'يفوق التوقعات دائماً';
      if (pct >= 65) return 'يلبي التوقعات';
      if (pct >= 50) return 'يلبي التوقعات أحياناً';
      return 'أقل من المتوقع';
    }
    if (pct >= 85) return 'ممتاز';
    if (pct >= 75) return 'جيد جداً';
    if (pct >= 65) return 'جيد';
    if (pct >= 50) return 'مقبول';
    return 'دون المستوى';
  };

  const assess1 =
    student.assessments?.['first'] || student.assessments?.['الفصل الدراسي الأول'];
  const assess2 =
    student.assessments?.['second'] ||
    student.assessments?.['الفصل الدراسي الثاني'] ||
    (student.assessments as any)?.['الفصل الدراسي الثانى'];
  const written1 =
    student.writtenExams?.['first'] || student.writtenExams?.['الفصل الدراسي الأول'];
  const written2 =
    student.writtenExams?.['second'] ||
    student.writtenExams?.['الفصل الدراسي الثاني'] ||
    (student.writtenExams as any)?.['الفصل الدراسي الثانى'];

  const ovr = defaultSubjectsOverrides?.[targetCol.key];
  const label = customSubjectLabel || ovr?.label || targetCol.label;
  const isReligion = targetCol.key === 'religion' || Boolean(label && label.includes('دين'));
  const isMax40 = stage === 'primary';
  const isPassFailSubject =
    stage !== 'kindergarten' &&
    ((ovr?.learningOutcomesType !== undefined
      ? ovr.learningOutcomesType === 'pass_fail'
      : targetCol.learningOutcomesType === 'pass_fail') ||
      (targetCol.learningOutcomesType === undefined &&
        ovr?.learningOutcomesType === undefined &&
        ((stage !== 'secondary' && targetCol.key === 'pe') ||
          targetCol.key === 'tokkatsu' ||
          (stage === 'primary' &&
            (targetCol.key === 'religion' ||
              targetCol.key === 'art' ||
              targetCol.key === 'fields' ||
              targetCol.key === 'music')))));

  if (isKindergarten) {
    const maxVal =
      ovr?.maxAssessmentsGrade !== undefined
        ? ovr.maxAssessmentsGrade
        : targetCol.maxAssessmentsGrade !== undefined
        ? targetCol.maxAssessmentsGrade
        : ovr?.maxGrade !== undefined
        ? ovr.maxGrade
        : targetCol.maxGrade !== undefined
        ? targetCol.maxGrade
        : 100;
    const minPass =
      ovr?.minPassPercentage !== undefined
        ? ovr.minPassPercentage
        : targetCol.minPassPercentage !== undefined
        ? targetCol.minPassPercentage
        : 50;

    if (targetSem === 'first') {
      if (!isRecorded(assess1, targetCol.key)) {
        return {
          status: 'incomplete',
          finalResult: '-',
          evaluation: '-',
          percentage: '-',
          addedTotal: null,
          nonAddedTotal: 0,
          failedCount: '-',
          failedSubjects: '-',
        };
      }
      const score = parseVal(assess1 ? (assess1 as any)[targetCol.key] : undefined);
      const pct = maxVal > 0 ? (score / maxVal) * 100 : 0;
      const isFail = pct < minPass;
      return {
        status: isFail ? 'fail' : 'pass',
        finalResult: isFail ? (isFemale ? 'لها برنامج علاجى' : 'له برنامج علاجى') : isFemale ? 'ناجحة' : 'ناجح',
        evaluation: getEvalFromPct(pct),
        percentage: `${roundToOneDecimal(pct)} %`,
        addedTotal: roundToOneDecimal(score),
        nonAddedTotal: 0,
        failedCount: isFail ? '1' : '0',
        failedSubjects: isFail ? label : '-',
      };
    } else {
      if (!isRecorded(assess1, targetCol.key) || !isRecorded(assess2, targetCol.key)) {
        return {
          status: 'incomplete',
          finalResult: '-',
          evaluation: '-',
          percentage: '-',
          addedTotal: null,
          nonAddedTotal: 0,
          failedCount: '-',
          failedSubjects: '-',
        };
      }
      const num1 = parseVal(assess1 ? (assess1 as any)[targetCol.key] : undefined);
      const num2 = parseVal(assess2 ? (assess2 as any)[targetCol.key] : undefined);
      const pct1 = maxVal > 0 ? (num1 / maxVal) * 100 : 0;
      const pct2 = maxVal > 0 ? (num2 / maxVal) * 100 : 0;
      const avgScore = (num1 + num2) / 2;
      const avgPct = (pct1 + pct2) / 2;
      const isFail = pct1 < minPass || pct2 < minPass;
      return {
        status: isFail ? 'fail' : 'pass',
        finalResult: isFail ? (isFemale ? 'لها برنامج علاجى' : 'له برنامج علاجى') : isFemale ? 'ناجحة' : 'ناجح',
        evaluation: getEvalFromPct(avgPct),
        percentage: `${roundToOneDecimal(avgPct)} %`,
        addedTotal: roundToOneDecimal(avgScore),
        nonAddedTotal: 0,
        failedCount: isFail ? '1' : '0',
        failedSubjects: isFail ? label : '-',
      };
    }
  }

  const hasWritten =
    (ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : targetCol.hasWrittenExam) !== false;
  const maxAssess =
    ovr?.maxAssessmentsGrade !== undefined
      ? ovr.maxAssessmentsGrade
      : targetCol.maxAssessmentsGrade !== undefined
      ? targetCol.maxAssessmentsGrade
      : ovr?.maxGrade !== undefined
      ? ovr.maxGrade
      : targetCol.maxGrade !== undefined
      ? targetCol.maxGrade
      : isMax40
      ? 40
      : 70;
  const maxWritten = hasWritten
    ? ovr?.maxWrittenGrade !== undefined
      ? ovr.maxWrittenGrade
      : targetCol.maxWrittenGrade !== undefined
      ? targetCol.maxWrittenGrade
      : isMax40
      ? 60
      : 30
    : 0;
  const subjectMax = maxAssess + maxWritten;
  const minTotalPass =
    ovr?.minTotalPassPercentage !== undefined
      ? ovr.minTotalPassPercentage
      : targetCol.minTotalPassPercentage !== undefined
      ? targetCol.minTotalPassPercentage
      : isReligion
      ? 70
      : 50;
  const rawMinWrittenPass =
    ovr?.minPassPercentage !== undefined ? ovr.minPassPercentage : targetCol.minPassPercentage;
  const minWrittenPass =
    rawMinWrittenPass === undefined ||
    rawMinWrittenPass === 70 ||
    rawMinWrittenPass === 10 ||
    rawMinWrittenPass === 7.2
      ? stage === 'secondary'
        ? 25
        : 30
      : rawMinWrittenPass;

  if (targetSem === 'first') {
    if (
      !isRecorded(assess1, targetCol.key) ||
      (hasWritten && !isRecorded(written1, targetCol.key))
    ) {
      return {
        status: 'incomplete',
        finalResult: '-',
        evaluation: '-',
        percentage: '-',
        addedTotal: null,
        nonAddedTotal: 0,
        failedCount: '-',
        failedSubjects: '-',
      };
    }

    const a1 = assess1 ? parseVal((assess1 as any)[targetCol.key]) : 0;
    const w1 = written1 && hasWritten ? parseVal((written1 as any)[targetCol.key]) : 0;
    const sem1Total = a1 + w1;
    const pct = subjectMax > 0 ? (sem1Total / subjectMax) * 100 : 0;

    let isFail = false;
    if (hasWritten) {
      const passedSubjectTotal = pct >= minTotalPass;
      const written1Percent = maxWritten > 0 ? (w1 / maxWritten) * 100 : 0;
      const passedWrittenExam = written1Percent >= minWrittenPass;
      isFail = !passedSubjectTotal || !passedWrittenExam;
    } else {
      isFail = pct < minTotalPass;
    }

    const isKgStage = stage === 'kindergarten';
    return {
      status: isFail ? 'fail' : 'pass',
      finalResult: isFail
        ? (isKgStage ? (isFemale ? 'لها برنامج علاجى' : 'له برنامج علاجى') : isFemale ? 'راسبة' : 'راسب')
        : isFemale
        ? 'ناجحة'
        : 'ناجح',
      evaluation: isPassFailSubject ? (isFail ? 'لم يجتاز' : 'اجتاز') : getEvalFromPct(pct),
      percentage: `${roundToOneDecimal(pct)} %`,
      addedTotal: roundToOneDecimal(sem1Total),
      nonAddedTotal: 0,
      failedCount: isFail ? '1' : '0',
      failedSubjects: isFail ? label : '-',
    };
  } else {
    if (
      !isRecorded(assess1, targetCol.key) ||
      !isRecorded(assess2, targetCol.key) ||
      (hasWritten &&
        (!isRecorded(written1, targetCol.key) || !isRecorded(written2, targetCol.key)))
    ) {
      return {
        status: 'incomplete',
        finalResult: '-',
        evaluation: '-',
        percentage: '-',
        addedTotal: null,
        nonAddedTotal: 0,
        failedCount: '-',
        failedSubjects: '-',
      };
    }

    const gradingSettings = getGradingSettings(stage, selectedGrade);
    const hasMercyStage =
      stage === 'primary' || stage === 'middle' || stage === 'prep' || stage === 'secondary';
    const mercyBoosts = hasMercyStage
      ? getPrimaryStudentMercyBoosts(
          student,
          stage || '',
          customCols,
          defaultSubjectsOverrides,
          gradingSettings,
          selectedGrade
        )
      : {};
    const boost = mercyBoosts[targetCol.key];

    const a1 = assess1 ? parseVal((assess1 as any)[targetCol.key]) : 0;
    const a2 = assess2 ? parseVal((assess2 as any)[targetCol.key]) : 0;
    const w1 = written1 && hasWritten ? parseVal((written1 as any)[targetCol.key]) : 0;
    const w2 = written2 && hasWritten ? parseVal((written2 as any)[targetCol.key]) : 0;

    const sem1Total = a1 + w1;
    const sem2Total = a2 + w2;
    const finalSubjectScore = boost
      ? (sem1Total + sem2Total) / 2 + boost.boostAmount / ((boost.actualPct || 0.5) * 2)
      : (sem1Total + sem2Total) / 2;
    const pct = subjectMax > 0 ? (finalSubjectScore / subjectMax) * 100 : 0;

    let passedSubj = false;
    if (boost) {
      passedSubj = true;
    } else if (hasWritten) {
      const passedSubjectTotal = pct >= minTotalPass;
      const written2Percent = maxWritten > 0 ? (w2 / maxWritten) * 100 : 0;
      const passedWrittenExam = written2Percent >= minWrittenPass;
      passedSubj = passedSubjectTotal && passedWrittenExam;
    } else {
      passedSubj = pct >= minTotalPass;
    }

    if (passedSubj) {
      return {
        status: 'pass',
        finalResult: isFemale ? 'ناجحة' : 'ناجح',
        evaluation: isPassFailSubject ? 'اجتاز' : getEvalFromPct(pct),
        percentage: `${roundToOneDecimal(pct)} %`,
        addedTotal: roundToOneDecimal(finalSubjectScore),
        nonAddedTotal: 0,
        failedCount: '0',
        failedSubjects: '-',
      };
    }

    // Subject not passed in Semester 2: determine if student is 'second_round' or 'fail'
    let totalFailedRecordedSubjects = 0;
    customCols.forEach((c) => {
      if (mercyBoosts[c.key]) return;
      const cOvr = defaultSubjectsOverrides?.[c.key];
      const cLabel = cOvr?.label || c.label;
      const cIsReligion = c.key === 'religion' || Boolean(cLabel && cLabel.includes('دين'));
      const cHasWritten =
        (cOvr?.hasWrittenExam !== undefined ? cOvr.hasWrittenExam : c.hasWrittenExam) !== false;
      if (
        !isRecorded(assess1, c.key) ||
        !isRecorded(assess2, c.key) ||
        (cHasWritten && (!isRecorded(written1, c.key) || !isRecorded(written2, c.key)))
      ) {
        return;
      }
      const cMaxAssess =
        cOvr?.maxAssessmentsGrade !== undefined
          ? cOvr.maxAssessmentsGrade
          : c.maxAssessmentsGrade !== undefined
          ? c.maxAssessmentsGrade
          : cOvr?.maxGrade !== undefined
          ? cOvr.maxGrade
          : c.maxGrade !== undefined
          ? c.maxGrade
          : isMax40
          ? 40
          : 70;
      const cMaxWritten = cHasWritten
        ? cOvr?.maxWrittenGrade !== undefined
          ? cOvr.maxWrittenGrade
          : c.maxWrittenGrade !== undefined
          ? c.maxWrittenGrade
          : isMax40
          ? 60
          : 30
        : 0;
      const cMax = cMaxAssess + cMaxWritten;
      const cMinTotalPass =
        cOvr?.minTotalPassPercentage !== undefined
          ? cOvr.minTotalPassPercentage
          : c.minTotalPassPercentage !== undefined
          ? c.minTotalPassPercentage
          : cIsReligion
          ? 70
          : 50;
      const ca1 = assess1 ? parseVal((assess1 as any)[c.key]) : 0;
      const ca2 = assess2 ? parseVal((assess2 as any)[c.key]) : 0;
      const cw1 = written1 && cHasWritten ? parseVal((written1 as any)[c.key]) : 0;
      const cw2 = written2 && cHasWritten ? parseVal((written2 as any)[c.key]) : 0;
      const cFinal = (ca1 + cw1 + ca2 + cw2) / 2;

      if (cHasWritten) {
        const cPct = cMax > 0 ? (cFinal / cMax) * 100 : 0;
        const cRawMinW =
          cOvr?.minPassPercentage !== undefined ? cOvr.minPassPercentage : c.minPassPercentage;
        const cMinW =
          cRawMinW === undefined || cRawMinW === 70 || cRawMinW === 10 || cRawMinW === 7.2
            ? stage === 'secondary'
              ? 25
              : 30
            : cRawMinW;
        const cw2Pct = cMaxWritten > 0 ? (cw2 / cMaxWritten) * 100 : 0;
        if (cPct < cMinTotalPass || cw2Pct < cMinW) {
          totalFailedRecordedSubjects++;
        }
      } else {
        const cAssessPct = cMaxAssess > 0 ? (cFinal / cMaxAssess) * 100 : 0;
        if (cAssessPct < cMinTotalPass) {
          totalFailedRecordedSubjects++;
        }
      }
    });

    const isKgStage = stage === 'kindergarten';
    if (stage !== 'primary' && totalFailedRecordedSubjects >= 3) {
      return {
        status: isKgStage ? 'second_round' : 'fail',
        finalResult: isKgStage
          ? (isFemale ? 'لها برنامج علاجى' : 'له برنامج علاجى')
          : isFemale
          ? 'راسبة'
          : 'راسب',
        evaluation: isPassFailSubject ? 'لم يجتاز' : getEvalFromPct(pct),
        percentage: `${roundToOneDecimal(pct)} %`,
        addedTotal: roundToOneDecimal(finalSubjectScore),
        nonAddedTotal: 0,
        failedCount: String(totalFailedRecordedSubjects),
        failedSubjects: label,
      };
    }

    return {
      status: 'second_round',
      finalResult: isKgStage ? (isFemale ? 'لها برنامج علاجى' : 'له برنامج علاجى') : 'دور ثان',
      evaluation: isPassFailSubject ? 'لم يجتاز' : getEvalFromPct(pct),
      percentage: `${roundToOneDecimal(pct)} %`,
      addedTotal: roundToOneDecimal(finalSubjectScore),
      nonAddedTotal: 0,
      failedCount: String(Math.max(1, totalFailedRecordedSubjects)),
      failedSubjects: label,
    };
  }
}

export async function exportStudentsDataToPdf(options: ExportStudentsPdfOptions): Promise<void> {
  const {
    title,
    reportType = 'students_data',
    customControlSheetOptions: propCustomOptions,
    rowTheme: propRowTheme,
    administration: propAdmin,
    schoolName: propSchoolName,
    dataOfficer: propDataOfficer,
    controlHead: propControlHead,
    committeeHead: propCommitteeHead,
    stage,
    selectedGrade,
    sortBy: propSortBy,
    students: inputStudents,
    isFirstGrade,
    showExamFields,
    semester: propSemester,
    normalizeStatusForGrade,
    labels,
  } = options;

  const isCustomControlSheet = reportType === 'custom_control_sheet';
  const semester = isCustomControlSheet ? 'second' : propSemester;

  let rawStudents = [...inputStudents];
  const activeSortBy: SortCriterion[] = (() => {
    if (propSortBy && propSortBy.length > 0) return propSortBy;
    try {
      const gradeSorts = JSON.parse(localStorage.getItem('gradeSortOrders') || '{}');
      if (selectedGrade && gradeSorts[selectedGrade] && gradeSorts[selectedGrade].length > 0) {
        return gradeSorts[selectedGrade];
      }
      for (const k of Object.keys(gradeSorts)) {
        if (stage && k.includes(stage) && (!selectedGrade || k.includes(selectedGrade)) && gradeSorts[k]?.length > 0) {
          return gradeSorts[k];
        }
      }
      const stageSorts = JSON.parse(localStorage.getItem('stageSortOrders') || '{}');
      if (stage && stageSorts[stage] && stageSorts[stage].length > 0) {
        return stageSorts[stage];
      }
      for (const k of Object.keys(stageSorts)) {
        if (stage && k.includes(stage) && stageSorts[k]?.length > 0) {
          return stageSorts[k];
        }
      }
    } catch {}
    return [];
  })();

  if (activeSortBy.length > 0) {
    rawStudents = sortStudents(rawStudents, activeSortBy, semester);
  }

  if (reportType === 'kg_student_evaluations_report' || reportType === 'kg_parent_notice') {
    const { exportKgStudentEvaluationsReportPdf } = await import('./kgAssessmentsReportHelper');
    await exportKgStudentEvaluationsReportPdf({
      students: rawStudents,
      semester: propSemester,
      selectedGrade,
      stage: stage || 'kindergarten',
      title,
      schoolName: propSchoolName,
      administration: propAdmin,
      dataOfficer: propDataOfficer,
      controlHead: propControlHead,
      committeeHead: propCommitteeHead,
      customCols: options.customCols,
      defaultSubjectsOverrides: options.defaultSubjectsOverrides,
      isParentNotice: reportType === 'kg_parent_notice',
      rowTheme: options.rowTheme,
    });
    return;
  }

  if (
    reportType === 'top_ten_students_certificate' ||
    reportType === 'top_ten_students_certificates' ||
    reportType === 'top_ten_damg_students_certificate' ||
    reportType === 'top_ten_damg_students_certificates'
  ) {
    const { exportTopTenCertificatesPdf } = await import('./topTenCertificatesHelper');
    const isDamgOnly =
      reportType === 'top_ten_damg_students_certificate' ||
      reportType === 'top_ten_damg_students_certificates';
    await exportTopTenCertificatesPdf({
      students: rawStudents,
      stage,
      selectedGrade,
      semester: propSemester,
      title,
      schoolName: propSchoolName,
      administration: propAdmin,
      isDamgOnly,
    });
    return;
  }

  if (
    reportType === 'student_semester_grades_certificate' ||
    reportType === 'student_semester_grades_certificate_en'
  ) {
    let targetStudents = rawStudents;

    let resolvedAdmin = propAdmin || '';
    let resolvedSchoolName = propSchoolName || '';
    try {
      const savedSchool = localStorage.getItem('sheet_control_school_data');
      if (savedSchool) {
        const parsed = JSON.parse(savedSchool);
        if (!resolvedAdmin && parsed.administration) resolvedAdmin = parsed.administration;
        if (!resolvedSchoolName && parsed.schoolName) resolvedSchoolName = parsed.schoolName;
      }
    } catch {}

    const savedEnFields = getSavedEnglishMainFields(stage);
    const resolvedAdminEn = (options.administrationEn || savedEnFields.administrationEn || '').trim();
    const resolvedSchoolNameEn = (options.schoolNameEn || savedEnFields.schoolNameEn || '').trim();
    const resolvedDataOfficerEn = (options.dataOfficerEn || savedEnFields.dataOfficerEn || '').trim();
    const resolvedControlHeadEn = (options.controlHeadEn || savedEnFields.controlHeadEn || '').trim();
    const resolvedCommitteeHeadEn = (options.committeeHeadEn || savedEnFields.committeeHeadEn || '').trim();

    const isHomeschoolResolved = Boolean(
      options.isHomeschool ||
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
      options.isHomeschool === false ||
      (typeof window !== 'undefined' && localStorage.getItem('current_system_type') === 'regular')
    );

    const isMiddleHomeschool = ((stage === 'prep' || stage === 'middle' || stage === 'secondary') || Boolean(options.title && (options.title.includes('المرحلة الإعدادية') || options.title.includes('المرحلة الثانوية') || options.title.includes('ثانوي') || options.title.includes('إعداد') || options.title.includes('اعداد')))) && isHomeschoolResolved;

    let certCustomCols = options.customCols;
    if (isMiddleHomeschool && certCustomCols) {
      certCustomCols = certCustomCols.filter((c: any) => {
        const ovr = options.defaultSubjectsOverrides?.[c.key];
        const hasExam = ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : (c.hasWrittenExam !== undefined ? c.hasWrittenExam : true);
        return hasExam !== false;
      });
    }

    const { exportStudentSemesterGradesCertificatePdf } = await import('./detailedAssessmentsHelper');
    await exportStudentSemesterGradesCertificatePdf({
      students: targetStudents,
      semester: propSemester,
      selectedGrade,
      stage: stage || 'primary',
      systemType: options.systemType || (isHomeschoolResolved ? 'homeschool' : (isServicesResolved ? 'services' : (isExplicitlyRegular ? 'regular' : undefined))),
      title: options.title,
      isHomeschool: isHomeschoolResolved,
      isMiddleHomeschool: isMiddleHomeschool,
      schoolName: resolvedSchoolName,
      schoolNameEn: resolvedSchoolNameEn,
      administration: resolvedAdmin,
      administrationEn: resolvedAdminEn,
      dataOfficer: propDataOfficer,
      dataOfficerEn: resolvedDataOfficerEn,
      controlHead: propControlHead,
      controlHeadEn: resolvedControlHeadEn,
      committeeHead: propCommitteeHead,
      committeeHeadEn: resolvedCommitteeHeadEn,
      customCols: certCustomCols,
      defaultSubjectsOverrides: options.defaultSubjectsOverrides,
      rowTheme: options.rowTheme,
      isEnglishCertificate: reportType === 'student_semester_grades_certificate_en',
    });
    return;
  }

  const savedRowTheme = typeof window !== 'undefined' ? (localStorage.getItem('pdf_print_row_theme') as RowBgTheme | null) : null;
  const rowTheme = propRowTheme || (savedRowTheme && savedRowTheme !== ('auto' as any) ? savedRowTheme : undefined);

  const isStudentDamg = (s: StudentData): boolean => {
    if (s.studentStatus === 'دمج') return true;
    if (s.studentStatus === 'نظامى' || s.studentStatus === 'عادى') return false;
    const normStatus = normalizeStatusForGrade(
      s.enrollmentStatus,
      isFirstGrade,
      s.gender
    );
    const rawStatus = (s.enrollmentStatus || '').trim();
    return (
      rawStatus.includes('دمج') ||
      normStatus.includes('دمج') ||
      Boolean(s.enrollmentType?.includes('دمج'))
    );
  };

  const isTopTenReport =
    reportType === 'top_ten_students' || reportType === 'top_ten_damg_students';

  const isSubjectReport =
    reportType === 'subject_passed_first_semester' ||
    reportType === 'subject_failed_first_semester' ||
    reportType === 'subject_passed_second_semester' ||
    reportType === 'subject_failed_second_semester' ||
    reportType === 'subject_second_round';

  const subjectKey = options.subjectKey || 'arabic';
  const subjectLabelDisplay = (() => {
    if (options.subjectLabel) return options.subjectLabel;
    const { customCols, defaultSubjectsOverrides } = getSubjectsConfigForStageGrade(
      stage,
      selectedGrade
    );
    const found = customCols.find((c) => c.key === subjectKey);
    return defaultSubjectsOverrides?.[subjectKey]?.label || found?.label || subjectKey;
  })();

  const isPassFailReport =
    reportType === 'passed_first_semester' ||
    reportType === 'passed_second_semester' ||
    reportType === 'failed_first_semester' ||
    reportType === 'failed_second_semester' ||
    reportType === 'second_round_students' ||
    isTopTenReport ||
    reportType === 'mercy_grades_students' ||
    reportType === 'control_sheet' ||
    reportType === 'custom_control_sheet' ||
    isSubjectReport;

  let targetEvalSem: 'first' | 'second' =
    reportType === 'passed_first_semester' ||
    reportType === 'failed_first_semester' ||
    reportType === 'subject_passed_first_semester' ||
    reportType === 'subject_failed_first_semester' ||
    ((reportType === 'control_sheet' || reportType === 'custom_control_sheet') && semester === 'first')
      ? 'first'
      : 'second';

  if (isTopTenReport) {
    const hasAnySecondComplete = rawStudents.some(
      (s) => evaluateStudentSemesterSummary(s, 'second', stage, selectedGrade).status !== 'incomplete'
    );
    targetEvalSem = hasAnySecondComplete ? 'second' : 'first';
  }

  const summariesById = new Map<string, StudentSemesterSummary>();
  const studentRanksById = new Map<string, string>();
  const studentRankNumById = new Map<string, number>();

  const isKindergartenStage =
    stage === 'kindergarten' ||
    stage === 'رياض أطفال' ||
    stage === 'رياض اطفال' ||
    stage === 'kg' ||
    Boolean(
      selectedGrade &&
        (selectedGrade.includes('KG') ||
          selectedGrade.includes('kg') ||
          selectedGrade.includes('المستوى') ||
          selectedGrade.includes('رياض'))
    ) ||
    Boolean(title && (title.includes('رياض أطفال') || title.includes('رياض الأطفال')));

  const effectiveLabels = {
    ...labels,
    studentName: isKindergartenStage ? (labels.studentName === 'اسم الطالب' ? 'اسم التلميذ' : (labels.studentName || 'اسم التلميذ')) : labels.studentName,
    enrollmentStatus: isKindergartenStage ? (labels.enrollmentStatus === 'حالة الطالب' ? 'حالة التلميذ' : (labels.enrollmentStatus || 'حالة التلميذ')) : labels.enrollmentStatus,
  };

  let subjectGradePassCount = 0;
  let subjectGradeFailCount = 0;
  let subjectGradeSecondRoundCount = 0;

  if (isPassFailReport) {
    const scoreItems: { id: string; addedTotal: number; nonAddedTotal: number }[] = [];
    rawStudents.forEach((s) => {
      const summary = isSubjectReport
        ? evaluateStudentSingleSubjectSummary(
            s,
            subjectKey,
            targetEvalSem,
            stage,
            selectedGrade,
            subjectLabelDisplay
          )
        : evaluateStudentSemesterSummary(s, targetEvalSem, stage, selectedGrade);
      summariesById.set(s.id, summary);

      if (isSubjectReport) {
        if (targetEvalSem === 'first') {
          if (summary.status === 'pass') subjectGradePassCount++;
          else if (summary.status === 'fail') {
            subjectGradeFailCount++;
            if (isKindergartenStage) subjectGradeSecondRoundCount++;
          }
          const sem2Subj = evaluateStudentSingleSubjectSummary(
            s,
            subjectKey,
            'second',
            stage,
            selectedGrade,
            subjectLabelDisplay
          );
          if (sem2Subj.status === 'second_round' || (isKindergartenStage && sem2Subj.status === 'fail')) {
            subjectGradeSecondRoundCount++;
          }
        } else {
          if (summary.status === 'pass') subjectGradePassCount++;
          else if (summary.status === 'fail') {
            subjectGradeFailCount++;
            if (isKindergartenStage) subjectGradeSecondRoundCount++;
          }
          else if (summary.status === 'second_round') subjectGradeSecondRoundCount++;
        }
      }

      const matchesTopTenGroup =
        reportType === 'top_ten_students'
          ? !isStudentDamg(s)
          : reportType === 'top_ten_damg_students'
          ? isStudentDamg(s)
          : true;
      if (
        summary.addedTotal !== null &&
        !isNaN(summary.addedTotal) &&
        matchesTopTenGroup &&
        (!isTopTenReport || summary.status === 'pass') &&
        (!isSubjectReport || summary.status === 'pass')
      ) {
        scoreItems.push({
          id: s.id,
          addedTotal: summary.addedTotal,
          nonAddedTotal: summary.nonAddedTotal,
        });
      }
    });

    if (isKindergartenStage) {
      subjectGradeSecondRoundCount = subjectGradeFailCount;
    }

    const tierMap = new Map<string, { addedTotal: number; nonAddedTotal: number; key: string }>();
    const tierCounts = new Map<string, number>();
    scoreItems.forEach((item) => {
      const key = `${roundToOneDecimal(item.addedTotal)}_${roundToOneDecimal(item.nonAddedTotal)}`;
      if (!tierMap.has(key)) {
        tierMap.set(key, {
          addedTotal: item.addedTotal,
          nonAddedTotal: item.nonAddedTotal,
          key,
        });
      }
      tierCounts.set(key, (tierCounts.get(key) || 0) + 1);
    });

    const sortedTiers = Array.from(tierMap.values()).sort((a, b) => {
      if (b.addedTotal !== a.addedTotal) return b.addedTotal - a.addedTotal;
      return b.nonAddedTotal - a.nonAddedTotal;
    });

    const tierToRankStr = new Map<string, string>();
    const tierToRankNum = new Map<string, number>();
    sortedTiers.forEach((tier, idx) => {
      const rankNum = idx + 1;
      const count = tierCounts.get(tier.key) || 0;
      tierToRankStr.set(tier.key, count > 1 ? `${rankNum} مكرر` : `${rankNum}`);
      tierToRankNum.set(tier.key, rankNum);
    });

    scoreItems.forEach((item) => {
      const key = `${roundToOneDecimal(item.addedTotal)}_${roundToOneDecimal(item.nonAddedTotal)}`;
      const rank = tierToRankStr.get(key);
      const rankNum = tierToRankNum.get(key);
      if (rank) studentRanksById.set(item.id, rank);
      if (rankNum !== undefined) studentRankNumById.set(item.id, rankNum);
    });
  }

  const students =
    reportType === 'passed_first_semester' ||
    reportType === 'passed_second_semester' ||
    reportType === 'subject_passed_first_semester' ||
    reportType === 'subject_passed_second_semester'
      ? rawStudents.filter((s) => summariesById.get(s.id)?.status === 'pass')
      : reportType === 'failed_first_semester' ||
        reportType === 'failed_second_semester' ||
        reportType === 'subject_failed_first_semester' ||
        reportType === 'subject_failed_second_semester'
      ? rawStudents.filter((s) => summariesById.get(s.id)?.status === 'fail')
      : reportType === 'second_round_students' || reportType === 'subject_second_round'
      ? rawStudents.filter((s) => {
          const st = summariesById.get(s.id)?.status;
          return st === 'second_round' || (isKindergartenStage && st === 'fail');
        })
      : isTopTenReport
      ? [...rawStudents]
          .filter((s) => {
            const isDamg = isStudentDamg(s);
            if (reportType === 'top_ten_students' && isDamg) return false;
            if (reportType === 'top_ten_damg_students' && !isDamg) return false;
            const summary = summariesById.get(s.id);
            const rNum = studentRankNumById.get(s.id);
            return summary?.status === 'pass' && rNum !== undefined && rNum <= 10;
          })
          .sort((a, b) => {
            const sumA = summariesById.get(a.id);
            const sumB = summariesById.get(b.id);
            const totA = sumA?.addedTotal ?? -1;
            const totB = sumB?.addedTotal ?? -1;
            if (totB !== totA) return totB - totA;
            const nonA = sumA?.nonAddedTotal ?? -1;
            const nonB = sumB?.nonAddedTotal ?? -1;
            return nonB - nonA;
          })
          .slice(0, 10)
      : reportType === 'mercy_grades_students'
      ? rawStudents.filter((s) => {
          const mCount = summariesById.get(s.id)?.mercyCount;
          return Boolean(mCount && mCount !== '0' && mCount !== '-');
        })
      : rawStudents;

  // Fallback to localStorage if any school/control field is not provided
  let administration = propAdmin || '';
  let schoolName = propSchoolName || '';
  let dataOfficer = propDataOfficer || '';
  let controlHead = propControlHead || '';
  let committeeHead = propCommitteeHead || '';

  const savedEnFields = getSavedEnglishMainFields(stage);
  const administrationEn = (options.administrationEn || savedEnFields.administrationEn || '').trim();
  const schoolNameEn = (options.schoolNameEn || savedEnFields.schoolNameEn || '').trim();
  const stageEn = (options.stageEn || savedEnFields.stageEn || '').trim();
  const dataOfficerEn = (options.dataOfficerEn || savedEnFields.dataOfficerEn || '').trim();
  const controlHeadEn = (options.controlHeadEn || savedEnFields.controlHeadEn || '').trim();
  const committeeHeadEn = (options.committeeHeadEn || savedEnFields.committeeHeadEn || '').trim();

  let savedSchoolLogo = '';
  try {
    savedSchoolLogo = localStorage.getItem('sheet_control_school_logo') || '';
    const savedSchool = localStorage.getItem('sheet_control_school_data');
    if (savedSchool) {
      const parsedSchool = JSON.parse(savedSchool);
      if (!administration && parsedSchool.administration) {
        administration = parsedSchool.administration;
      }
      if (!schoolName && parsedSchool.schoolName) {
        schoolName = parsedSchool.schoolName;
      }
      if (!savedSchoolLogo && parsedSchool.schoolLogo) {
        savedSchoolLogo = parsedSchool.schoolLogo;
      }
    }
    const savedControl = localStorage.getItem('sheet_control_control_data_by_stage');
    if (savedControl) {
      const parsedControl = JSON.parse(savedControl);
      const stageControl = stage ? parsedControl[stage] : undefined;
      if (!dataOfficer && stageControl?.dataOfficer) {
        dataOfficer = stageControl.dataOfficer;
      }
      if (!controlHead && stageControl?.controlHead) {
        controlHead = stageControl.controlHead;
      }
      if (!committeeHead && stageControl?.committeeHead) {
        committeeHead = stageControl.committeeHead;
      }
    }
  } catch {
    // Ignore localStorage parse errors
  }

  try {
    if (document.fonts) {
      await Promise.all([
        document.fonts.load('bold 14px "Cairo"'),
        document.fonts.load('bold 16px "Cairo"'),
        document.fonts.load('bold 18px "Cairo"'),
        document.fonts.load('bold 20px "Cairo"'),
        document.fonts.load('bold 24px "Cairo"'),
        document.fonts.ready,
      ]);
    }
  } catch {
    // Ignore font readiness errors
  }

  const isBlankControlSheet = reportType === 'blank_control_sheet';
  const isControlSheet = reportType === 'control_sheet' || isBlankControlSheet || isCustomControlSheet;
  const customOpts = propCustomOptions;
  const includeMainData = isCustomControlSheet ? (customOpts?.includeMainData ?? true) : true;
  const includeStudentData = isCustomControlSheet ? (customOpts?.includeStudentData ?? true) : !isBlankControlSheet;
  const includeAddedSubjects = isCustomControlSheet ? (customOpts?.includeAddedSubjects ?? true) : true;
  const includeNonAddedSubjects = isCustomControlSheet ? (customOpts?.includeNonAddedSubjects ?? true) : true;

  // A4 Portrait for seat_numbers, calling_list, and secret_numbers; A4 Landscape for other reports; A1 Landscape for non-Kindergarten control_sheet
  const isNonKgControlSheet = isControlSheet && !isKindergartenStage;
  const isSeatNumbersCard =
    reportType === 'seat_numbers' ||
    Boolean(reportType && reportType.startsWith('seat_numbers'));
  const isPortrait =
    isSeatNumbersCard ||
    reportType === 'calling_list' ||
    reportType === 'secret_numbers';
  const widthPx = isNonKgControlSheet ? 2800 : isPortrait ? 1240 : 1754;
  const heightPx = isNonKgControlSheet ? 1980 : isPortrait ? 1754 : 1240;
  const marginX = isPortrait ? 36 : 48;
  const marginY = isPortrait ? 28 : 32;
  const contentW = widthPx - marginX * 2;

  let fallbackCommSize = 20;
  let fallbackMergeLast = false;
  try {
    const committeeStorageKey = `${stage}_${selectedGrade}`;
    const byGradeRaw = localStorage.getItem('sheet_control_committee_settings_by_grade');
    if (byGradeRaw) {
      const parsed = JSON.parse(byGradeRaw);
      const semKey = `${committeeStorageKey}_${semester}`;
      const gradeEntry = parsed?.[semKey] ?? parsed?.[committeeStorageKey];
      if (gradeEntry) {
        if (Number(gradeEntry.committeeSize) >= 1) {
          fallbackCommSize = Number(gradeEntry.committeeSize);
        }
        if (typeof gradeEntry.mergeLastCommittee === 'boolean') {
          fallbackMergeLast = gradeEntry.mergeLastCommittee;
        }
      }
    }
    if (fallbackCommSize === 20) {
      const savedSize = Number(localStorage.getItem('sheet_control_committee_size'));
      if (savedSize >= 1) fallbackCommSize = savedSize;
      const savedMerge = localStorage.getItem('sheet_control_merge_last_committee');
      if (savedMerge !== null) fallbackMergeLast = savedMerge === 'true';
    }
  } catch {}

  const totalStudentsCount = students.length;
  const fullCommitteesCount = Math.floor(totalStudentsCount / fallbackCommSize);
  const hasIncompleteLastComm =
    totalStudentsCount > fallbackCommSize && totalStudentsCount % fallbackCommSize !== 0;

  const getStudentCommitteeNum = (
    student: StudentData,
    globalIdx: number,
    targetSem: string = semester
  ): string => {
    let semCommSize = fallbackCommSize;
    let semMergeLast = fallbackMergeLast;
    try {
      const committeeStorageKey = `${stage}_${selectedGrade}`;
      const byGradeRaw = localStorage.getItem('sheet_control_committee_settings_by_grade');
      if (byGradeRaw) {
        const parsed = JSON.parse(byGradeRaw);
        const targetEntry = parsed?.[`${committeeStorageKey}_${targetSem}`] ?? parsed?.[committeeStorageKey];
        if (targetEntry) {
          if (Number(targetEntry.committeeSize) >= 1) semCommSize = Number(targetEntry.committeeSize);
          if (typeof targetEntry.mergeLastCommittee === 'boolean') semMergeLast = targetEntry.mergeLastCommittee;
        }
      }
    } catch {}

    const totalStudents = students.length;
    const fullComms = Math.floor(totalStudents / semCommSize);
    const hasIncLast = totalStudents > semCommSize && totalStudents % semCommSize !== 0;

    let computedCommNum = Math.floor(globalIdx / semCommSize) + 1;
    if (semMergeLast && hasIncLast && computedCommNum > fullComms) {
      computedCommNum = fullComms;
    }
    return (
      student.committeeNumbers?.[targetSem]?.trim() ||
      (targetSem === 'first' ? student.committeeNumber?.trim() : '') ||
      String(computedCommNum)
    );
  };

  type IndexedStudent = {
    student: StudentData;
    globalIdx: number;
    committeeNumText: string;
  };

  const indexedStudents: IndexedStudent[] = students.map((student, idx) => ({
    student,
    globalIdx: idx,
    committeeNumText: getStudentCommitteeNum(student, idx),
  }));

  const rowsPerPage = isSeatNumbersCard ? 3 : 15;
  const pagesData: IndexedStudent[][] = [];

  const isExplicitlyRegular = Boolean(
    options.isHomeschool === false ||
    options.systemType === 'regular' ||
    (options.title && (options.title.includes('منتظم') || options.title.toLowerCase().includes('regular')))
  );

  const isHomeschoolResolved = !isExplicitlyRegular && Boolean(
    options.isHomeschool ||
    (options.title && (options.title.includes('منازل') || options.title.toLowerCase().includes('homeschool'))) ||
    (typeof window !== 'undefined' && localStorage.getItem('current_system_type') === 'homeschool') ||
    rawStudents.some((s) => (s as any).systemType === 'homeschool')
  );
  const isMiddleHomeschool = !isExplicitlyRegular && ((stage === 'prep' || stage === 'middle' || stage === 'secondary') || Boolean(options.title && (options.title.includes('المرحلة الإعدادية') || options.title.includes('المرحلة الثانوية') || options.title.includes('ثانوي')))) && isHomeschoolResolved;

  const statsSubjectsConfig =
    reportType === 'statistics_and_charts'
      ? getSubjectsConfigForStageGrade(stage, selectedGrade, isHomeschoolResolved)
      : null;
  const statsSubjectsList: {
    key: string;
    label: string;
    religionFilter?: 'muslim' | 'christian';
  }[] = [];
  if (statsSubjectsConfig) {
    statsSubjectsConfig.customCols.forEach((c) => {
      if (isMiddleHomeschool) {
        const override = statsSubjectsConfig.defaultSubjectsOverrides?.[c.key];
        const hasExam = override?.hasWrittenExam !== undefined ? override.hasWrittenExam : (c.hasWrittenExam !== undefined ? c.hasWrittenExam : true);
        if (hasExam === false) return;
      }
      const rawLbl = statsSubjectsConfig.defaultSubjectsOverrides?.[c.key]?.label || c.label;
      const isRelSubj =
        c.key === 'religion' ||
        rawLbl.includes('التربية الدينية') ||
        rawLbl.includes('التربية الإسلامية') ||
        rawLbl.includes('التربية الاسلامية');
      if (isRelSubj) {
        statsSubjectsList.push(
          { key: c.key, label: 'التربية الدينية الإسلامية', religionFilter: 'muslim' },
          { key: c.key, label: 'التربية الدينية المسيحية', religionFilter: 'christian' }
        );
      } else {
        statsSubjectsList.push({ key: c.key, label: rawLbl });
      }
    });
  }

  if (isBlankControlSheet || isCustomControlSheet) {
    if (!includeStudentData || indexedStudents.length === 0) {
      const blankRows: IndexedStudent[] = Array.from({ length: 20 }, (_, idx) => ({
        student: {
          id: `blank_${idx}`,
          name: '',
          nationalId: '',
          gender: '',
          enrollmentStatus: '',
          enrollmentType: '',
          religion: '',
        },
        globalIdx: idx,
        committeeNumText: '',
      }));
      pagesData.push(blankRows);
    } else {
      const committeeGroups = new Map<string, IndexedStudent[]>();
      indexedStudents.forEach((item) => {
        const commKey = item.committeeNumText || '1';
        if (!committeeGroups.has(commKey)) {
          committeeGroups.set(commKey, []);
        }
        committeeGroups.get(commKey)!.push(item);
      });
      committeeGroups.forEach((group) => {
        const count = Math.max(1, Math.ceil(group.length / 20));
        for (let i = 0; i < count; i++) {
          const slice = group.slice(i * 20, (i + 1) * 20);
          while (slice.length < 20) {
            slice.push({
              student: {
                id: `blank_${slice.length}`,
                name: '',
                nationalId: '',
                gender: '',
                enrollmentStatus: '',
                enrollmentType: '',
                religion: '',
              },
              globalIdx: slice.length,
              committeeNumText: slice[0]?.committeeNumText || '',
            });
          }
          pagesData.push(slice);
        }
      });
    }
  } else if (
    reportType === 'calling_list' ||
    reportType === 'students_data' ||
    reportType === 'secret_numbers' ||
    isNonKgControlSheet
  ) {
    if (indexedStudents.length === 0) {
      pagesData.push([]);
    } else {
      const committeeGroups = new Map<string, IndexedStudent[]>();
      indexedStudents.forEach((item) => {
        const commKey = item.committeeNumText || '1';
        if (!committeeGroups.has(commKey)) {
          committeeGroups.set(commKey, []);
        }
        committeeGroups.get(commKey)!.push(item);
      });
      committeeGroups.forEach((group) => {
        pagesData.push(group);
      });
    }
  } else if (reportType === 'general_statistics') {
    pagesData.push(indexedStudents, indexedStudents);
  } else if (reportType === 'statistics_and_charts') {
    pagesData.push(indexedStudents, indexedStudents);
    statsSubjectsList.forEach(() => {
      pagesData.push(indexedStudents);
    });
  } else {
    const count = Math.max(1, Math.ceil(indexedStudents.length / rowsPerPage));
    for (let i = 0; i < count; i++) {
      pagesData.push(indexedStudents.slice(i * rowsPerPage, (i + 1) * rowsPerPage));
    }
  }

  const totalPages = pagesData.length;

  // Define columns from Right to Left (RTL order) based on reportType
  let columns: {
    key: string;
    header: string;
    subHeader?: string;
    splitSemGroups?: string[];
    splitSubHeaders?: string[];
    splitMaxGrades?: string[];
    splitSemTotalMax?: string;
    splitSemTotalKeys?: [string, string];
    splitBothSemTotalMax?: string;
    splitBothSemTotalKey?: string;
    splitActualMaxGrade?: string;
    splitActualKey?: string;
    maxGradeText?: string;
    splitKeys?: string[];
    weight: number;
    dir?: 'ltr' | 'rtl';
  }[] = [];

  const controlSheetSubjectsConfig =
    isControlSheet
      ? getSubjectsConfigForStageGrade(stage, selectedGrade, isHomeschoolResolved)
      : null;
  const controlSheetAddedSubjects: {
    key: string;
    label: string;
    maxVal: number;
    maxAssess: number;
    maxWritten: number;
    actualMaxVal: number;
    actualPct: number;
    minTotalPass: number;
    minWrittenPass: number;
    hasWritten: boolean;
    isAdded: boolean;
  }[] = [];
  const controlSheetNonAddedSubjects: {
    key: string;
    label: string;
    maxVal: number;
    maxAssess: number;
    maxWritten: number;
    actualMaxVal: number;
    actualPct: number;
    minTotalPass: number;
    minWrittenPass: number;
    hasWritten: boolean;
    isAdded: boolean;
  }[] = [];
  let controlSheetAddedTotalMax = 0;

  if (controlSheetSubjectsConfig) {
    const {
      customCols: csCols,
      defaultSubjectsOverrides: csOvr,
      isKindergarten: csIsKg,
    } = controlSheetSubjectsConfig;
    const csIsMax40 = stage === 'primary';
    const isMiddleStageCs = stage === 'middle' || stage === 'prep';
    const isSec2SciOrLitCs =
      stage === 'secondary' &&
      Boolean(
        selectedGrade &&
          (selectedGrade.includes('scientific') ||
            selectedGrade.includes('literary') ||
            selectedGrade.includes('modern_') ||
            selectedGrade.includes('medical') ||
            selectedGrade.includes('engineering') ||
            selectedGrade.includes('business') ||
            selectedGrade.includes('arts') ||
            selectedGrade.includes('الطب') ||
            selectedGrade.includes('الهندسة') ||
            selectedGrade.includes('الأعمال') ||
            selectedGrade.includes('الآداب'))
      );
    const defaultActualPctMap: Record<string, number> = isMiddleStageCs
      ? {
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
        }
      : isSec2SciOrLitCs
      ? {
          arabic: 0.4,
          english: 0.3,
          math: 0.3,
          history: 0.3,
          chemistry: 0.3,
          physics: 0.3,
          geography: 0.3,
          psychology: 0.3,
          biology: 0.3,
          programming_ai: 0.3,
          accounting: 0.3,
          business_admin: 0.3,
          arts_design: 0.3,
          religion: 0.2,
          second_foreign_language: 0.2,
          financial_literacy: 0.125,
          pe: 0.125,
          national_education: 0.125,
          educational_vocational_activity: 0.1,
        }
      : {};
    csCols.forEach((c) => {
      if (isMiddleHomeschool) {
        const ovr = csOvr?.[c.key];
        const hasExam = ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : (c.hasWrittenExam !== undefined ? c.hasWrittenExam : true);
        if (hasExam === false) return;
      }
      const ovr = csOvr?.[c.key];
      const isAdded =
        ovr?.isAddedToTotal !== undefined ? ovr.isAddedToTotal : c.isAddedToTotal !== false;
      const label = ovr?.label || c.label;
      const isReligion = c.key === 'religion' || Boolean(label && label.includes('دين'));
      const hasWritten =
        !csIsKg &&
        (ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : c.hasWrittenExam) !== false;
      let maxVal = 100;
      let maxAssess = 100;
      let maxWritten = 0;
      if (csIsKg) {
        maxVal =
          ovr?.maxAssessmentsGrade !== undefined
            ? ovr.maxAssessmentsGrade
            : c.maxAssessmentsGrade !== undefined
            ? c.maxAssessmentsGrade
            : ovr?.maxGrade !== undefined
            ? ovr.maxGrade
            : c.maxGrade !== undefined
            ? c.maxGrade
            : 100;
        maxAssess = maxVal;
      } else {
        maxAssess = isMiddleHomeschool ? 0 : (
          ovr?.maxAssessmentsGrade !== undefined
            ? ovr.maxAssessmentsGrade
            : c.maxAssessmentsGrade !== undefined
            ? c.maxAssessmentsGrade
            : ovr?.maxGrade !== undefined
            ? ovr.maxGrade
            : c.maxGrade !== undefined
            ? c.maxGrade
            : csIsMax40
            ? 40
            : 70
        );
        maxWritten = isMiddleHomeschool ? 100 : (
          hasWritten
            ? ovr?.maxWrittenGrade !== undefined
              ? ovr.maxWrittenGrade
              : c.maxWrittenGrade !== undefined
              ? c.maxWrittenGrade
              : csIsMax40
              ? 60
              : 30
            : 0
        );
        maxVal = maxAssess + maxWritten;
      }
      const minTotalPass = csIsKg
        ? isReligion
          ? 70
          : ovr?.minPassPercentage !== undefined
          ? ovr.minPassPercentage
          : c.minPassPercentage !== undefined
          ? c.minPassPercentage
          : 50
        : ovr?.minTotalPassPercentage !== undefined
        ? ovr.minTotalPassPercentage
        : c.minTotalPassPercentage !== undefined
        ? c.minTotalPassPercentage
        : isReligion
        ? 70
        : 50;
      const rawMinWrittenPass =
        ovr?.minPassPercentage !== undefined ? ovr.minPassPercentage : c.minPassPercentage;
      const minWrittenPass =
        rawMinWrittenPass === undefined ||
        rawMinWrittenPass === 70 ||
        rawMinWrittenPass === 10 ||
        rawMinWrittenPass === 7.2
          ? stage === 'secondary'
            ? 25
            : 30
          : rawMinWrittenPass;
      const twoSemRawMax = maxVal * 2;
      const customActualMax =
        ovr?.actualMaxGrade !== undefined
          ? Number(ovr.actualMaxGrade)
          : (c as any).actualMaxGrade !== undefined
          ? Number((c as any).actualMaxGrade)
          : undefined;
      // الدرجة الفعلية للطالب = (مجموع درجات الطالب * الدرجة الفعلية للمادة الدراسية) / 200
      const actualPct = 0; // Not used anymore, formula is (rawSum * actualMaxVal) / 200
      const actualMaxVal =
        customActualMax !== undefined
          ? customActualMax
          : ((stage === 'middle' || stage === 'prep')
              ? getMiddleActualMaxGrade(c.key, c)
              : (stage === 'secondary' && selectedGrade?.includes('الثاني')
                  ? (c.key === 'arabic' ? 80 : 60)
                  : (maxVal))); // Fallback or stage-specific actual max
      const item = {
        key: c.key,
        label,
        maxVal,
        maxAssess,
        maxWritten,
        actualMaxVal,
        actualPct,
        minTotalPass,
        minWrittenPass,
        hasWritten,
        isAdded,
      };
      if (isAdded) {
        controlSheetAddedSubjects.push(item);
        controlSheetAddedTotalMax += (csIsKg || semester === 'first') ? maxVal : actualMaxVal;
      } else {
        controlSheetNonAddedSubjects.push(item);
      }
    });
  }

  if (reportType === 'calling_list') {
    columns = [
      { key: 'serial', header: effectiveLabels.serial, weight: 0.6, dir: 'ltr' },
      { key: 'name', header: effectiveLabels.studentName, weight: 3.2, dir: 'rtl' },
      { key: 'seatNumber', header: effectiveLabels.seatNumber || 'رقم الجلوس', weight: 1.2, dir: 'ltr' },
      ...(!isKindergartenStage
        ? [{ key: 'committeeNumber', header: effectiveLabels.committeeNumber || 'رقم اللجنة', weight: 1.2, dir: 'ltr' as const }]
        : []),
      { key: 'enrollmentStatus', header: effectiveLabels.enrollmentStatus, weight: 1.4, dir: 'rtl' },
      { key: 'religion', header: effectiveLabels.religion, weight: 1.1, dir: 'rtl' },
      { key: 'notes', header: 'ملاحظات', weight: 2.0, dir: 'rtl' },
    ];
  } else if (reportType === 'secret_numbers') {
    columns = [
      { key: 'serial', header: effectiveLabels.serial, weight: 0.6, dir: 'ltr' },
      { key: 'name', header: effectiveLabels.studentName, weight: 3.4, dir: 'rtl' },
      { key: 'seatNumber', header: effectiveLabels.seatNumber || 'رقم الجلوس', weight: 1.3, dir: 'ltr' },
      { key: 'secretNumber', header: effectiveLabels.secretNumber || 'الرقم السري', weight: 1.3, dir: 'ltr' },
      ...(!isKindergartenStage
        ? [{ key: 'committeeNumber', header: effectiveLabels.committeeNumber || 'رقم اللجنة', weight: 1.3, dir: 'ltr' as const }]
        : []),
      { key: 'notes', header: 'ملاحظات', weight: 2.0, dir: 'rtl' },
    ];
  } else if (isControlSheet) {
    columns = [
      { key: 'serial', header: effectiveLabels.serial, weight: 0.38, dir: 'ltr' },
      { key: 'name', header: effectiveLabels.studentName, weight: 2.8, dir: 'rtl' },
      { key: 'nationalId', header: effectiveLabels.nationalId, weight: 1.05, dir: 'ltr' },
      { key: 'gender', header: effectiveLabels.gender, weight: 0.52, dir: 'rtl' },
      {
        key: 'enrollmentStatus',
        header: effectiveLabels.enrollmentStatus,
        weight: isKindergartenStage ? 0.78 : 0.76,
        dir: 'rtl',
      },
      { key: 'religion', header: labels.religion, weight: 0.60, dir: 'rtl' },
    ];
    if (isKindergartenStage) {
      columns.push({
        key: 'blankSeparator',
        header: '',
        weight: 0.38 * 0.4,
        dir: 'ltr',
      });
    }
    if (!isKindergartenStage || showExamFields) {
      if (isNonKgControlSheet && semester === 'second') {
        columns.push(
          {
            key: 'seatNumber_sem1',
            header: 'رقم الجلوس ف 1',
            weight: 0.52,
            dir: 'ltr',
          },
          {
            key: 'secretNumber_sem1',
            header: 'الرقم السري ف 1',
            weight: 0.52,
            dir: 'ltr',
          },
          {
            key: 'committeeNumber_sem1',
            header: 'رقم اللجنة ف 1',
            weight: 0.52,
            dir: 'ltr',
          },
          {
            key: 'seatNumber_sem2',
            header: 'رقم الجلوس ف 2',
            weight: 0.52,
            dir: 'ltr',
          },
          {
            key: 'secretNumber_sem2',
            header: 'الرقم السري ف 2',
            weight: 0.52,
            dir: 'ltr',
          },
          {
            key: 'committeeNumber_sem2',
            header: 'رقم اللجنة ف 2',
            weight: 0.52,
            dir: 'ltr',
          }
        );
      } else {
        columns.push(
          {
            key: 'seatNumber',
            header: labels.seatNumber || 'رقم الجلوس',
            weight: 0.68,
            dir: 'ltr',
          },
          {
            key: 'secretNumber',
            header: labels.secretNumber || 'الرقم السري',
            weight: 0.68,
            dir: 'ltr',
          },
          {
            key: 'committeeNumber',
            header: labels.committeeNumber || 'رقم اللجنة',
            weight: 0.68,
            dir: 'ltr',
          }
        );
      }
      if (isNonKgControlSheet) {
        columns.push({
          key: 'blankSeparator',
          header: '',
          weight: 0.38 * 0.4,
          dir: 'ltr',
        });
      }
    }
    if (includeAddedSubjects) {
      controlSheetAddedSubjects.forEach((sub) => {
      const effectiveHasWritten = isMiddleHomeschool ? false : sub.hasWritten;
      if (isNonKgControlSheet) {
        if (semester === 'second') {
          if (effectiveHasWritten) {
            columns.push({
              key: `subj_${sub.key}`,
              header: sub.label,
              subHeader: 'ف 1 | ف 2 | فعلية',
              splitSemGroups: ['ف 1', 'ف 1', 'ف 2', 'ف 2', 'الدرجة الفعلية'],
              splitSubHeaders: ['تقييمات', 'تحريرى', 'تقييمات', 'تحريرى', 'الدرجة الفعلية'],
              splitMaxGrades: [
                String(sub.maxAssess),
                String(sub.maxWritten),
                String(sub.maxAssess),
                String(sub.maxWritten),
                String(sub.actualMaxVal ?? sub.maxVal),
              ],
              splitSemTotalMax: String(sub.maxVal),
              splitSemTotalKeys: [
                `subj_sem1_total_${sub.key}`,
                `subj_sem2_total_${sub.key}`,
              ],
              splitActualKey: `subj_actual_${sub.key}`,
              splitKeys: [
                `subj_sem1_assess_${sub.key}`,
                `subj_sem1_written_${sub.key}`,
                `subj_sem2_assess_${sub.key}`,
                `subj_sem2_written_${sub.key}`,
                `subj_actual_${sub.key}`,
              ],
              weight: 1.6,
              dir: 'ltr',
            });
          } else {
            columns.push({
              key: `subj_${sub.key}`,
              header: sub.label,
              subHeader: 'ف 1 | ف 2 | فعلية',
              splitSemGroups: ['ف 1', 'ف 2', 'الدرجة الفعلية'],
              splitSubHeaders: ['ف 1', 'ف 2', 'الدرجة الفعلية'],
              splitMaxGrades: [
                String(sub.maxVal),
                String(sub.maxVal),
                String(sub.actualMaxVal ?? sub.maxVal),
              ],
              splitSemTotalMax: String(sub.maxVal),
              splitActualKey: `subj_actual_${sub.key}`,
              splitKeys: [
                isMiddleHomeschool ? `subj_sem1_${sub.key}` : `subj_sem1_assess_${sub.key}`,
                isMiddleHomeschool ? `subj_sem2_${sub.key}` : `subj_sem2_assess_${sub.key}`,
                `subj_actual_${sub.key}`,
              ],
              weight: 1.05,
              dir: 'ltr',
            });
          }
        } else if (effectiveHasWritten) {
          columns.push({
            key: `subj_${sub.key}`,
            header: sub.label,
            subHeader: 'تقييمات | تحريرى | مجموع',
            splitSubHeaders: ['تقييمات', 'تحريرى', 'مجموع'],
            splitMaxGrades: [
              String(sub.maxAssess),
              String(sub.maxWritten),
              String(sub.maxVal),
            ],
            splitKeys: [
              `subj_assess_${sub.key}`,
              `subj_written_${sub.key}`,
              `subj_${sub.key}`,
            ],
            weight: 1.32,
            dir: 'ltr',
          });
        } else {
          columns.push({
            key: `subj_${sub.key}`,
            header: sub.label,
            subHeader: '',
            maxGradeText: String(sub.maxVal),
            weight: 0.55,
            dir: 'ltr',
          });
        }
      } else if (semester === 'second') {
        columns.push({
          key: `subj_${sub.key}`,
          header: sub.label,
          subHeader: 'ف 1 | ف 2',
          splitSubHeaders: ['ف 1', 'ف 2'],
          splitKeys: [`subj_sem1_${sub.key}`, `subj_sem2_${sub.key}`],
          weight: 0.72,
          dir: 'rtl',
        });
      } else {
        columns.push({
          key: `subj_${sub.key}`,
          header: sub.label,
          weight: 0.48,
          dir: 'ltr',
        });
      }
    });

    if (isCustomControlSheet && includeAddedSubjects) {
      if (isNonKgControlSheet) {
        if (semester === 'second') {
          if (isMiddleHomeschool) {
            columns.push({
              key: 'subj_custom_new_added',
              header: '........................',
              subHeader: 'ف 1 | ف 2 | فعلية',
              splitSemGroups: ['ف 1', 'ف 2', 'الدرجة الفعلية'],
              splitSubHeaders: ['ف 1', 'ف 2', 'الدرجة الفعلية'],
              splitMaxGrades: ['', '', ''],
              splitSemTotalMax: '',
              splitActualKey: 'subj_actual_custom_new_added',
              splitKeys: [
                'subj_sem1_custom_new_added',
                'subj_sem2_custom_new_added',
                'subj_actual_custom_new_added',
              ],
              weight: 1.05,
              dir: 'ltr',
            });
          } else {
            columns.push({
              key: 'subj_custom_new_added',
              header: '........................',
              subHeader: 'ف 1 | ف 2 | فعلية',
              splitSemGroups: ['ف 1', 'ف 1', 'ف 2', 'ف 2', 'الدرجة الفعلية'],
              splitSubHeaders: ['تقييمات', 'تحريرى', 'تقييمات', 'تحريرى', 'الدرجة الفعلية'],
              splitMaxGrades: ['', '', '', '', ''],
              splitSemTotalMax: '',
              splitSemTotalKeys: [
                'subj_sem1_total_custom_new_added',
                'subj_sem2_total_custom_new_added',
              ],
              splitActualKey: 'subj_actual_custom_new_added',
              splitKeys: [
                'subj_sem1_assess_custom_new_added',
                'subj_sem1_written_custom_new_added',
                'subj_sem2_assess_custom_new_added',
                'subj_sem2_written_custom_new_added',
                'subj_actual_custom_new_added',
              ],
              weight: 1.6,
              dir: 'ltr',
            });
          }
        } else if (isMiddleHomeschool) {
          columns.push({
            key: 'subj_custom_new_added',
            header: '........................',
            subHeader: '',
            maxGradeText: '',
            weight: 0.55,
            dir: 'ltr',
          });
        } else {
          columns.push({
            key: 'subj_custom_new_added',
            header: '........................',
            subHeader: 'تقييمات | تحريرى | مجموع',
            splitSubHeaders: ['تقييمات', 'تحريرى', 'مجموع'],
            splitMaxGrades: ['', '', ''],
            splitKeys: [
              'subj_assess_custom_new_added',
              'subj_written_custom_new_added',
              'subj_custom_new_added',
            ],
            weight: 1.32,
            dir: 'ltr',
          });
        }
      } else {
        columns.push({
          key: 'subj_custom_new_added',
          header: '........................',
          subHeader: 'تقييمات',
          maxGradeText: '',
          weight: 0.55,
          dir: 'ltr',
        });
      }
    }

    if (!isKindergartenStage) {
      columns.push(
        {
          key: 'blankSeparatorPreTotal',
          header: '',
          weight: 0.38 * 0.4,
          dir: 'ltr',
        },
        {
          key: 'addedTotal',
          header: 'مجموع المواد الأساسية',
          subHeader: (isCustomControlSheet && includeAddedSubjects) ? '' : String(controlSheetAddedTotalMax),
          weight: 0.52 * 1.15,
          dir: 'ltr',
        },
        { key: 'percentage', header: 'النسبة المئوية', weight: 0.62, dir: 'ltr' }
      );
    }
    columns.push(
      {
        key: 'evaluation',
        header: isKindergartenStage ? 'التقييم' : 'التقدير',
        weight: isKindergartenStage ? 0.65 : 0.95,
        dir: 'rtl',
      },
      { key: 'studentRank', header: isKindergartenStage ? 'ترتيب التلميذ' : 'ترتيب الطالب', weight: 0.88, dir: 'rtl' }
    );
    if (isNonKgControlSheet) {
      columns.push({
        key: 'blankSeparator2',
        header: '',
        weight: 0.38 * 0.4,
        dir: 'ltr',
      });
    }
  }

  controlSheetNonAddedSubjects.forEach((sub) => {
    const effectiveHasWritten = isMiddleHomeschool ? false : sub.hasWritten;
    if (isNonKgControlSheet) {
      if (semester === 'second' && effectiveHasWritten) {
        columns.push({
          key: `subj_${sub.key}`,
          header: sub.label,
          subHeader: 'ف 1 | ف 2 | فعلية',
          splitSemGroups: ['ف 1', 'ف 1', 'ف 2', 'ف 2', 'الدرجة الفعلية'],
          splitSubHeaders: ['تقييمات', 'تحريرى', 'تقييمات', 'تحريرى', 'الدرجة الفعلية'],
          splitMaxGrades: [
            String(sub.maxAssess),
            String(sub.maxWritten),
            String(sub.maxAssess),
            String(sub.maxWritten),
            String(sub.actualMaxVal ?? sub.maxVal),
          ],
          splitSemTotalMax: String(sub.maxVal),
          splitSemTotalKeys: [
            `subj_sem1_total_${sub.key}`,
            `subj_sem2_total_${sub.key}`,
          ],
          splitActualKey: `subj_actual_${sub.key}`,
          splitKeys: [
            `subj_sem1_assess_${sub.key}`,
            `subj_sem1_written_${sub.key}`,
            `subj_sem2_assess_${sub.key}`,
            `subj_sem2_written_${sub.key}`,
            `subj_actual_${sub.key}`,
          ],
          weight: 1.6,
          dir: 'ltr',
        });
      } else if (semester === 'second') {
        columns.push({
          key: `subj_${sub.key}`,
          header: sub.label,
          subHeader: 'ف 1 | ف 2 | فعلية',
          splitSemGroups: ['ف 1', 'ف 2', 'الدرجة الفعلية'],
          splitSubHeaders: ['ف 1', 'ف 2', 'الدرجة الفعلية'],
          splitMaxGrades: [
            String(sub.maxVal),
            String(sub.maxVal),
            String(sub.actualMaxVal ?? sub.maxVal),
          ],
          splitSemTotalMax: String(sub.maxVal),
          splitActualKey: `subj_actual_${sub.key}`,
          splitKeys: [
            isMiddleHomeschool ? `subj_sem1_${sub.key}` : `subj_sem1_assess_${sub.key}`,
            isMiddleHomeschool ? `subj_sem2_${sub.key}` : `subj_sem2_assess_${sub.key}`,
            `subj_actual_${sub.key}`,
          ],
          weight: 1.05,
          dir: 'ltr',
        });
      } else if (effectiveHasWritten) {
        columns.push({
          key: `subj_${sub.key}`,
          header: sub.label,
          subHeader: 'تقييمات | تحريرى | مجموع',
          splitSubHeaders: ['تقييمات', 'تحريرى', 'مجموع'],
          splitMaxGrades: [
            String(sub.maxAssess),
            String(sub.maxWritten),
            String(sub.maxVal),
          ],
          splitKeys: [
            `subj_assess_${sub.key}`,
            `subj_written_${sub.key}`,
            `subj_${sub.key}`,
          ],
          weight: 1.32,
          dir: 'ltr',
        });
      } else {
        columns.push({
          key: `subj_${sub.key}`,
          header: sub.label,
          subHeader: '',
          maxGradeText: String(sub.maxVal),
          weight: 0.55,
          dir: 'ltr',
        });
      }
    } else if (semester === 'second') {
      columns.push({
        key: `subj_${sub.key}`,
        header: sub.label,
        subHeader: 'ف 1 | ف 2',
        splitSubHeaders: ['ف 1', 'ف 2'],
        splitKeys: [`subj_sem1_${sub.key}`, `subj_sem2_${sub.key}`],
        weight: 0.72,
        dir: 'rtl',
      });
    } else {
      columns.push({
        key: `subj_${sub.key}`,
        header: sub.label,
        weight: 0.48,
        dir: 'ltr',
      });
    }
  });

  if (isCustomControlSheet && includeNonAddedSubjects) {
    if (isNonKgControlSheet) {
      if (semester === 'second') {
        if (isMiddleHomeschool) {
          columns.push({
            key: 'subj_custom_new_non_added',
            header: '........................',
            subHeader: 'ف 1 | ف 2 | فعلية',
            splitSemGroups: ['ف 1', 'ف 2', 'الدرجة الفعلية'],
            splitSubHeaders: ['ف 1', 'ف 2', 'الدرجة الفعلية'],
            splitMaxGrades: ['', '', ''],
            splitSemTotalMax: '',
            splitActualKey: 'subj_actual_custom_new_non_added',
            splitKeys: [
              'subj_sem1_custom_new_non_added',
              'subj_sem2_custom_new_non_added',
              'subj_actual_custom_new_non_added',
            ],
            weight: 1.05,
            dir: 'ltr',
          });
        } else {
          columns.push({
            key: 'subj_custom_new_non_added',
            header: '........................',
            subHeader: 'ف 1 | ف 2 | فعلية',
            splitSemGroups: ['ف 1', 'ف 1', 'ف 2', 'ف 2', 'الدرجة الفعلية'],
            splitSubHeaders: ['تقييمات', 'تحريرى', 'تقييمات', 'تحريرى', 'الدرجة الفعلية'],
            splitMaxGrades: ['', '', '', '', ''],
            splitSemTotalMax: '',
            splitSemTotalKeys: [
              'subj_sem1_total_custom_new_non_added',
              'subj_sem2_total_custom_new_non_added',
            ],
            splitActualKey: 'subj_actual_custom_new_non_added',
            splitKeys: [
              'subj_sem1_assess_custom_new_non_added',
              'subj_sem1_written_custom_new_non_added',
              'subj_sem2_assess_custom_new_non_added',
              'subj_sem2_written_custom_new_non_added',
              'subj_actual_custom_new_non_added',
            ],
            weight: 1.6,
            dir: 'ltr',
          });
        }
      } else if (isMiddleHomeschool) {
        columns.push({
          key: 'subj_custom_new_non_added',
          header: '........................',
          subHeader: '',
          maxGradeText: '',
          weight: 0.55,
          dir: 'ltr',
        });
      } else {
        columns.push({
          key: 'subj_custom_new_non_added',
          header: '........................',
          subHeader: 'تقييمات | تحريرى | مجموع',
          splitSubHeaders: ['تقييمات', 'تحريرى', 'مجموع'],
          splitMaxGrades: ['', '', ''],
          splitKeys: [
            'subj_assess_custom_new_non_added',
            'subj_written_custom_new_non_added',
            'subj_custom_new_non_added',
          ],
          weight: 1.32,
          dir: 'ltr',
        });
      }
    } else {
      columns.push({
        key: 'subj_custom_new_non_added',
        header: '........................',
        subHeader: 'تقييمات',
        maxGradeText: '',
        weight: 0.55,
        dir: 'ltr',
      });
    }
  }

    if (isCustomControlSheet) {
      columns.push({ key: 'finalResult', header: isKindergartenStage ? 'نتيجة التلميذ' : 'نتيجة الطالب', weight: 0.95, dir: 'rtl' });
      columns.push({ key: 'notes', header: 'ملاحظات', weight: 0.95, dir: 'rtl' });
    } else if (includeAddedSubjects) {
      if (isNonKgControlSheet && semester === 'first') {
        columns.push({ key: 'notes', header: 'ملاحظات', weight: 0.95, dir: 'rtl' });
      } else {
        columns.push({ key: 'finalResult', header: isKindergartenStage ? 'نتيجة التلميذ' : 'نتيجة الطالب', weight: 0.95, dir: 'rtl' });
      }
    } else {
      columns.push({ key: 'notes', header: 'ملاحظات', weight: 1.2, dir: 'rtl' });
    }
  } else {
    const isFailedReport =
      reportType === 'failed_first_semester' ||
      reportType === 'failed_second_semester' ||
      reportType === 'second_round_students' ||
      reportType === 'mercy_grades_students';

    columns = [
      { key: 'serial', header: effectiveLabels.serial, weight: isFailedReport ? 0.5 : 0.6, dir: 'ltr' },
      { key: 'name', header: effectiveLabels.studentName, weight: isFailedReport ? 2.2 : 3.2, dir: 'rtl' },
    ];

    if (!isPassFailReport) {
      columns.push(
        { key: 'nationalId', header: labels.nationalId, weight: 2.0, dir: 'ltr' },
        { key: 'gender', header: labels.gender, weight: 1.0, dir: 'rtl' },
        { key: 'enrollmentStatus', header: labels.enrollmentStatus, weight: 1.5, dir: 'rtl' },
        { key: 'enrollmentType', header: labels.enrollmentType, weight: 1.5, dir: 'rtl' },
        { key: 'religion', header: labels.religion, weight: 1.1, dir: 'rtl' }
      );
    }

    if (showExamFields) {
      columns.push({
        key: 'seatNumber',
        header: labels.seatNumber || 'رقم الجلوس',
        weight: isFailedReport ? 0.85 : 1.1,
        dir: 'ltr',
      });
      if (!isPassFailReport) {
        columns.push({
          key: 'secretNumber',
          header: labels.secretNumber || 'الرقم السري',
          weight: 1.1,
          dir: 'ltr',
        });
      }
    }

    if (!isFailedReport && !isKindergartenStage) {
      columns.push({
        key: 'committeeNumber',
        header: labels.committeeNumber || 'رقم اللجنة',
        weight: 1.1,
        dir: 'ltr',
      });
    }

    if (
      reportType === 'passed_first_semester' ||
      reportType === 'passed_second_semester' ||
      (reportType as string) === 'control_sheet' ||
      isTopTenReport ||
      isSubjectReport
    ) {
      if (!isTopTenReport) {
        columns.push({ key: 'finalResult', header: isKindergartenStage ? 'نتيجة التلميذ' : 'نتيجة الطالب', weight: 1.2, dir: 'rtl' });
      }
      columns.push(
        { key: 'evaluation', header: isKindergartenStage ? 'التقييم' : 'التقدير', weight: 1.2, dir: 'rtl' },
        { key: 'percentage', header: 'النسبة المئوية', weight: 1.2, dir: 'ltr' }
      );
      const isSubjectFailedOrSecondRound =
        reportType === 'subject_failed_first_semester' ||
        reportType === 'subject_failed_second_semester' ||
        reportType === 'subject_second_round';
      if (!isSubjectFailedOrSecondRound) {
        columns.push({ key: 'studentRank', header: isKindergartenStage ? 'ترتيب التلميذ' : 'ترتيب الطالب', weight: 1.2, dir: 'rtl' });
      }
    } else if (isFailedReport) {
      columns.push({
        key: 'failedSubjects',
        header:
          reportType === 'second_round_students'
            ? (isKindergartenStage ? 'مواد برامج علاجية' : 'مواد الدور الثانى')
            : reportType === 'mercy_grades_students'
            ? 'مواد الرأفة والدرجات المضافة'
            : isKindergartenStage
            ? 'مواد يحتاج التلميذ فيها الى برامج علاجية'
            : 'مواد الرسوب',
        weight: isKindergartenStage ? 8.5 : 6.5,
        dir: 'rtl',
      });
    } else {
      columns.push({ key: 'notes', header: 'ملاحظات', weight: 1.6, dir: 'rtl' });
    }
  }

  const isBlankSepKey = (k: string) =>
    k === 'blankSeparator' || k === 'blankSeparator2' || k.startsWith('blankSeparator');
  const totalWeight = columns.reduce((sum, col) => sum + col.weight, 0);
  const colWidths = columns.map((col) => Math.floor((col.weight / totalWeight) * contentW));
  const usedWidth = colWidths.reduce((s, w) => s + w, 0);
  colWidths[colWidths.length - 1] += contentW - usedWidth;
  if (colWidths.length > 1) {
    const targetSepW = Math.max(4, Math.round(colWidths[0] * 0.4));
    columns.forEach((col, idx) => {
      if (isBlankSepKey(col.key)) {
        const diffW = targetSepW - colWidths[idx];
        colWidths[idx] = targetSepW;
        colWidths[colWidths.length - 1] -= diffW;
      }
    });
  }

  // فى مرحلة رياض الاطفال فقط فى ملفات pdf: اذا وجدت كلمة برامج علاجية فى خلية معينة
  // يجب زيادة عرض الخلية لتسمح بعرض النص فى الخلية بنفس حجم خط الخلايا المناظرة وفى سطر واحد + 5 %
  if (isKindergartenStage) {
    const measCanvas = document.createElement('canvas');
    const mCtx = measCanvas.getContext('2d');
    if (mCtx) {
      const baseHFont = 21;
      const baseRowFont = isControlSheet ? 17.5 : isSubjectReport ? 20 : 18;
      const fontToUse = Math.max(20, baseRowFont);
      columns.forEach((col, idx) => {
        let maxReqW = 0;
        if (col.header && col.header.includes('برامج علاجية')) {
          mCtx.font = `bold ${baseHFont}px "Cairo", sans-serif`;
          const textW = mCtx.measureText(col.header).width;
          const reqW = Math.ceil(textW * 1.05) + 24;
          if (reqW > maxReqW) maxReqW = reqW;
        }
        students.forEach((st) => {
          const sum = summariesById.get(st.id);
          const cellCandidates: (string | undefined)[] = [
            col.key === 'finalResult' ? sum?.finalResult : undefined,
            col.key === 'failedSubjects' ? sum?.failedSubjects : undefined,
            sum ? (sum as any)[col.key] : undefined,
            (st as any)[col.key],
          ];
          cellCandidates.forEach((val) => {
            if (val && typeof val === 'string' && val.includes('برامج علاجية')) {
              mCtx.font = `bold ${fontToUse}px "Cairo", sans-serif`;
              const textW = mCtx.measureText(val).width;
              const reqW = Math.ceil(textW * 1.05) + 24;
              if (reqW > maxReqW) maxReqW = reqW;
            }
          });
        });

        if (maxReqW > colWidths[idx]) {
          const neededDiff = maxReqW - colWidths[idx];
          colWidths[idx] = maxReqW;
          const otherIndices = columns
            .map((c, i) => i)
            .filter((i) => i !== idx && !isBlankSepKey(columns[i].key) && !columns[i].header?.includes('برامج علاجية') && colWidths[i] > 60);

          if (otherIndices.length > 0) {
            const sumOther = otherIndices.reduce((sum, i) => sum + colWidths[i], 0);
            let remDiff = neededDiff;
            otherIndices.forEach((oi, oIdx) => {
              if (oIdx === otherIndices.length - 1) {
                colWidths[oi] = Math.max(35, colWidths[oi] - remDiff);
              } else {
                const take = Math.min(colWidths[oi] - 35, Math.floor((colWidths[oi] / sumOther) * neededDiff));
                colWidths[oi] -= take;
                remDiff -= take;
              }
            });
          }
        }
      });
      const reTotal = colWidths.reduce((s, w) => s + w, 0);
      colWidths[colWidths.length - 1] += contentW - reTotal;
    }
  }

  const qrImage =
    reportType !== 'seat_numbers_no_qr'
      ? await loadImage(qrCodeUrl)
      : null;
  const ministryLogoImage =
    isSeatNumbersCard || isControlSheet ? await loadImage(ministryLogoUrl) : null;
  const rawSchoolLogoImage =
    (isSeatNumbersCard || isControlSheet) && savedSchoolLogo
      ? await loadImage(savedSchoolLogo)
      : null;
  const schoolLogoImage = rawSchoolLogoImage
    ? cropImageToCircleCanvas(rawSchoolLogoImage)
    : null;
  const renderedPages: { jpegBytes: Uint8Array; widthPx: number; heightPx: number }[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const renderScale = isNonKgControlSheet ? 3 : isSeatNumbersCard ? 2 : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(widthPx * renderScale);
    canvas.height = Math.round(heightPx * renderScale);
    canvas.dir = 'rtl';

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    if (renderScale !== 1) {
      ctx.scale(renderScale, renderScale);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    (ctx as any).textRendering = 'optimizeLegibility';

    // White Page Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    if (isSeatNumbersCard) {
      const isEnglishCard = Boolean(reportType && reportType.startsWith('seat_numbers_english'));
      const rawCleanTitle = (title || '').trim();
      const cleanTitle = isEnglishCard
        ? translateCardTitleToEnglish(rawCleanTitle, stage, selectedGrade, semester, stageEn)
        : rawCleanTitle;
      const pageStudents =
        students.length > 0
          ? students.slice(pageIdx * rowsPerPage, (pageIdx + 1) * rowsPerPage)
          : [
              {
                id: 'empty',
                name: isEnglishCard ? 'No Students' : 'لا يوجد',
                nationalId: '',
                gender: 'male',
                enrollmentStatus: '',
                enrollmentType: 'قيد عادى',
                religion: 'muslim',
              } as StudentData,
            ];

      const topBottomMargin = 36;
      const cardGap = 48;
      const availableH = heightPx - topBottomMargin * 2 - cardGap * 2;
      const singleCardH = Math.floor(availableH / 3);

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
      } catch {
        // Fallback to local system date
      }
      const dateDisplay = `${day} - ${month} - ${year} م`;

      let fallbackCommSize = 20;
      let fallbackMergeLast = false;
      try {
        const savedSize = Number(localStorage.getItem('sheet_control_committee_size'));
        if (savedSize >= 1) fallbackCommSize = savedSize;
        const savedMerge = localStorage.getItem('sheet_control_merge_last_committee');
        if (savedMerge !== null) fallbackMergeLast = savedMerge === 'true';
      } catch {}

      const totalStudentsCount = students.length;
      const fullCommitteesCount = Math.floor(totalStudentsCount / fallbackCommSize);
      const hasIncompleteLastComm =
        totalStudentsCount > fallbackCommSize && totalStudentsCount % fallbackCommSize !== 0;

      pageStudents.forEach((student, cIdx) => {
        const globalStudentIdx = pageIdx * rowsPerPage + cIdx;
        const statusText = normalizeStatusForGrade(
          student.enrollmentStatus,
          isFirstGrade,
          student.gender
        );
        const enrollmentTypeText =
          student.enrollmentType === 'تحويل من مدرسة أخرى'
            ? 'تحويلات'
            : student.enrollmentType === 'قيد عادي'
            ? 'قيد عادى'
            : student.enrollmentType || 'قيد عادى';

        const isMuslim =
          student.religion === 'muslim' || (student.religion || '').includes('ل');
        const isChristian =
          student.religion === 'christian' || (student.religion || '').includes('ح');
        const religionText = isMuslim
          ? student.gender === 'female'
            ? labels.muslimFemale
            : labels.muslim
          : isChristian
          ? student.gender === 'female'
            ? labels.christianFemale
            : labels.christian
          : '';

        const seatNumText =
          student.seatNumbers?.[semester] ||
          (semester === 'first' ? student.seatNumber : '') ||
          '';

        let computedCommNum = Math.floor(globalStudentIdx / fallbackCommSize) + 1;
        if (fallbackMergeLast && hasIncompleteLastComm && computedCommNum > fullCommitteesCount) {
          computedCommNum = fullCommitteesCount;
        }
        const committeeNumText =
          student.committeeNumbers?.[semester] ||
          student.committeeNumber ||
          String(computedCommNum);

        const cardTopY = topBottomMargin + cIdx * (singleCardH + cardGap);
        const seatCardModel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'default' =
          reportType?.includes('model_1')
            ? 1
            : reportType?.includes('model_2')
            ? 2
            : reportType?.includes('model_3')
            ? 3
            : reportType?.includes('model_4')
            ? 4
            : reportType?.includes('model_5')
            ? 5
            : reportType?.includes('model_6')
            ? 6
            : reportType?.includes('model_7')
            ? 7
            : 'default';

        drawSeatNumberCard(
          ctx,
          marginX,
          cardTopY,
          contentW,
          singleCardH,
          student,
          globalStudentIdx,
          {
            cleanTitle,
            administration: isEnglishCard ? administrationEn || administration : administration,
            schoolName: isEnglishCard ? schoolNameEn || schoolName : schoolName,
            dataOfficer: isEnglishCard ? dataOfficerEn || dataOfficer : dataOfficer,
            controlHead: isEnglishCard ? controlHeadEn || controlHead : controlHead,
            committeeHead: isEnglishCard ? committeeHeadEn || committeeHead : committeeHead,
            statusText,
            enrollmentTypeText,
            religionText,
            seatNumText,
            committeeNumText,
            dateDisplay,
            qrImage,
            ministryLogoImage,
            schoolLogoImage,
            isEnglish: isEnglishCard,
            isNoQr: reportType === 'seat_numbers_no_qr',
            model: seatCardModel,
            selectedGrade,
            stage,
          }
        );
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
      const base64 = dataUrl.split(',')[1];
      const jpegBytes = base64ToUint8Array(base64);
      renderedPages.push({ jpegBytes, widthPx: canvas.width, heightPx: canvas.height });
      continue;
    }

    // 1. Top Row: Educational Administration (Far Right) & School Name (Far Left)
    const topInfoY = isSubjectReport ? 28 : marginY;
    const topInfoH = isSubjectReport ? 60 : 46;
    ctx.direction = 'rtl';
    ctx.fillStyle = '#0f172a';
    const topInfoFontSize = (isNonKgControlSheet ? 14 : 22) * (isControlSheet ? 1.2 : 1.0);
    ctx.font = `bold ${topInfoFontSize}px "Cairo", sans-serif`;
    ctx.textBaseline = 'middle';

    const adminPrefix = applyEntityTerms('الإدارة :');
    const showHeaderSchoolAdmin = !(isCustomControlSheet && !includeMainData);
    const adminDisplay = showHeaderSchoolAdmin
      ? (administration.trim()
          ? `${adminPrefix} ${applyEntityTerms(administration.trim())}`
          : `${adminPrefix} ........................`)
      : `${adminPrefix} ........................`;
    const schoolPrefix = applyEntityTerms(isKindergartenStage ? 'الروضة :' : 'المدرسة :');
    const schoolDisplay = showHeaderSchoolAdmin
      ? (schoolName.trim()
          ? `${schoolPrefix} ${applyEntityTerms(schoolName.trim())}`
          : `${schoolPrefix} ........................`)
      : `${schoolPrefix} ........................`;

    // Far Right: Educational Administration
    ctx.textAlign = 'right';
    ctx.fillText(adminDisplay, marginX + contentW, topInfoY + topInfoH / 2);

    // Far Left: School Name
    ctx.textAlign = 'left';
    ctx.fillText(schoolDisplay, marginX, topInfoY + topInfoH / 2);

    // فى جميع ملفات الشيت كنترول المولدة: ضع اللوجو بجوار اسم المدرسة ناحية اليمين (مرفوع بمقدار 50% من المسافة للخط الفاصل)
    if (isControlSheet) {
      const controlLogo = schoolLogoImage || rawSchoolLogoImage || ministryLogoImage;
      if (controlLogo) {
        const schoolTextW = ctx.measureText(schoolDisplay).width;
        const logoH = isNonKgControlSheet ? 44 : 46;
        const logoNatW =
          (controlLogo as HTMLImageElement).naturalWidth || controlLogo.width || 1;
        const logoNatH =
          (controlLogo as HTMLImageElement).naturalHeight || controlLogo.height || 1;
        const logoAspect = logoNatW / logoNatH;
        const logoW = Math.round(logoH * logoAspect);
        const logoX = marginX + schoolTextW + 16;
        const baseLogoY = topInfoY + (topInfoH - logoH) / 2;
        const headerLineY = topInfoY + topInfoH + (isSubjectReport ? 8 : 6);
        const distToLine = headerLineY - (baseLogoY + logoH);
        const liftY = distToLine > 0 ? distToLine * 0.5 : 0;
        const logoY = Math.round(baseLogoY - liftY);

        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(controlLogo, logoX, logoY, logoW, logoH);
        ctx.restore();
      }
    }

    let bannerY = topInfoY + topInfoH + 10;
    if (
      reportType === 'calling_list' ||
      reportType === 'students_data' ||
      reportType === 'secret_numbers' ||
      reportType === 'general_statistics' ||
      reportType === 'statistics_and_charts' ||
      isPassFailReport ||
      isBlankControlSheet
    ) {
      const headerLineY = topInfoY + topInfoH + (isSubjectReport ? 8 : 6);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(marginX, headerLineY);
      ctx.lineTo(marginX + contentW, headerLineY);
      ctx.stroke();
      bannerY = headerLineY + (isSubjectReport ? 12 : 14);
    }

    // 2. Title Banner (increased height by 40% for subject reports: 56 -> 78)
    const bannerH = isSubjectReport ? Math.round(56 * 1.4) : 81;
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

    // Banner Text (Centered)
    const cleanTitle = (title || '').trim();
    const titleWithoutSemester = cleanTitle
      .replace(/\s*-\s*الفصل\s+الدراس[يى]\s+(?:الأول|الاول|الثان[يى])/g, '')
      .replace(/الفصل\s+الدراس[يى]\s+(?:الأول|الاول|الثان[يى])\s*-\s*/g, '')
      .replace(/\s*-\s*(?:1st|2nd|First|Second)\s+Semester/gi, '')
      .trim();
    let bannerTitle = isKindergartenStage
      ? (cleanTitle.startsWith('بيانات تلاميذ') || cleanTitle.startsWith('بيانات طلاب')
          ? cleanTitle.replace(/^بيانات طلاب/, 'بيانات تلاميذ')
          : `بيانات تلاميذ ${cleanTitle}`)
      : (cleanTitle.startsWith('بيانات طلاب')
          ? cleanTitle
          : `بيانات طلاب ${cleanTitle}`);
    if (reportType === 'calling_list') {
      bannerTitle = `تقارير المناداة - ${cleanTitle}`;
    } else if ((reportType as string) === 'seat_numbers') {
      bannerTitle = isKindergartenStage ? `أرقام جلوس تلاميذ ${cleanTitle}` : `أرقام جلوس طلاب ${cleanTitle}`;
    } else if (reportType === 'secret_numbers') {
      bannerTitle = isKindergartenStage ? `الأرقام السرية لتلاميذ ${cleanTitle}` : `الأرقام السرية لطلاب ${cleanTitle}`;
    } else if (reportType === 'passed_first_semester') {
      bannerTitle = `الناجحون - اعتبارا - فى الفصل الدراسي الأول - ${titleWithoutSemester}`;
    } else if (reportType === 'passed_second_semester') {
      bannerTitle = `الناجحون فى الفصل الدراسي الثانى - ${titleWithoutSemester}`;
    } else if (reportType === 'failed_first_semester') {
      bannerTitle = isKindergartenStage
        ? `لهم برامج علاجية - فى الفصل الدراسي الأول - ${titleWithoutSemester}`
        : `الراسبون - اعتبارا - فى الفصل الدراسي الأول - ${titleWithoutSemester}`;
    } else if (reportType === 'failed_second_semester') {
      bannerTitle = isKindergartenStage
        ? `لهم برامج علاجية - فى الفصل الدراسي الثانى - ${titleWithoutSemester}`
        : `الراسبون فى الفصل الدراسي الثانى - ${titleWithoutSemester}`;
    } else if (reportType === 'second_round_students') {
      bannerTitle = isKindergartenStage
        ? `تلاميذ برامج علاجية - ${titleWithoutSemester}`
        : `طلاب الدور الثانى - ${titleWithoutSemester}`;
    } else if (reportType === 'top_ten_students') {
      bannerTitle = `العشرة الأوائل - TOP 10 - ${cleanTitle}`;
    } else if (reportType === 'top_ten_damg_students') {
      bannerTitle = `العشرة الأوائل - TOP 10 - دمج - ${cleanTitle}`;
    } else if (reportType === 'mercy_grades_students') {
      bannerTitle = `طلاب يستحقون درجات الرأفة - ${cleanTitle}`;
    } else if (reportType === 'subject_passed_first_semester') {
      bannerTitle = `الناجحون - اعتبارا - فى الفصل الدراسي الأول - مادة ${subjectLabelDisplay} - ${titleWithoutSemester}`;
    } else if (reportType === 'subject_failed_first_semester') {
      bannerTitle = isKindergartenStage
        ? `لهم برامج علاجية - فى الفصل الدراسي الأول - مادة ${subjectLabelDisplay} - ${titleWithoutSemester}`
        : `الراسبون - اعتبارا - فى الفصل الدراسي الأول - مادة ${subjectLabelDisplay} - ${titleWithoutSemester}`;
    } else if (reportType === 'subject_passed_second_semester') {
      bannerTitle = `الناجحون فى الفصل الدراسي الثانى - مادة ${subjectLabelDisplay} - ${titleWithoutSemester}`;
    } else if (reportType === 'subject_failed_second_semester') {
      bannerTitle = isKindergartenStage
        ? `لهم برامج علاجية - فى الفصل الدراسي الثانى - مادة ${subjectLabelDisplay} - ${titleWithoutSemester}`
        : `الراسبون فى الفصل الدراسي الثانى - مادة ${subjectLabelDisplay} - ${titleWithoutSemester}`;
    } else if (reportType === 'subject_second_round') {
      bannerTitle = isKindergartenStage
        ? `تلاميذ يحتاجون برامج علاجية - مادة ${subjectLabelDisplay} - ${titleWithoutSemester}`
        : `طلاب لهم دور ثان - مادة ${subjectLabelDisplay} - ${titleWithoutSemester}`;
    } else if (reportType === 'general_statistics') {
      bannerTitle =
        pageIdx === 1
          ? `إحصائيات نوعية القيد - ${cleanTitle}`
          : isKindergartenStage
          ? `إحصائيات تلاميذ ${cleanTitle}`
          : `إحصائيات طلاب ${cleanTitle}`;
    } else if (isControlSheet) {
      const semLabel =
        semester === 'first' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثانى';
      let formattedControlTitle = titleWithoutSemester
        .replace(/^المرحلة\s*:\s*رياض\s*[أا]طفال/, 'رياض الأطفال')
        .replace(/^رياض\s*[أا]طفال/, 'رياض الأطفال')
        .replace(/^شيت\s+كنترول\s*-\s*/, '')
        .replace(/^شيت\s+كنترول\s+مخصص\s*-\s*/, '')
        .trim();

      if (!/\d{4}\s*-\s*\d{4}/.test(formattedControlTitle)) {
        formattedControlTitle = `${formattedControlTitle} - 2026 - 2027`;
      } else {
        formattedControlTitle = formattedControlTitle
          .replace(/\s*-\s*(\d{4}\s*-\s*\d{4})\s*$/, '\u200F - \u200F\u200E$1\u200E\u200F');
      }

      if (isCustomControlSheet) {
        const getCustomStageName = (stg?: string, ttl?: string) => {
          if (stg === 'kindergarten' || stg === 'رياض أطفال' || stg === 'رياض اطفال' || stg === 'kg') return 'رياض الأطفال';
          if (stg === 'primary' || stg === 'ابتدائي' || stg === 'ابتدائى') return 'المرحلة الابتدائية';
          if (stg === 'middle' || stg === 'إعدادي' || stg === 'اعدادي') return 'المرحلة الإعدادية';
          if (stg === 'secondary' || stg === 'ثانوي' || stg === 'ثانوى') return 'المرحلة الثانوية';
          if (stg === 'commercial_technical') return 'التعليم الفنى التجارى';
          if (stg === 'industrial_technical') return 'التعليم الفنى الصناعى';
          if (stg === 'agricultural_technical') return 'التعليم الفنى الزراعى';
          if (stg === 'hotel_technical') return 'التعليم الفنى الفندقى';
          if (ttl) {
            if (ttl.includes('رياض')) return 'رياض الأطفال';
            if (ttl.includes('ابتدائي') || ttl.includes('ابتدائى')) return 'المرحلة الابتدائية';
            if (ttl.includes('إعدادي') || ttl.includes('اعدادي')) return 'المرحلة الإعدادية';
            if (ttl.includes('ثانوي') || ttl.includes('ثانوى')) return 'المرحلة الثانوية';
          }
          return stg || '';
        };

        const getCustomGradeName = (grd?: string) => {
          if (!grd) return '';
          return grd
            .replace(' الابتدائي', '')
            .replace(' الابتدائى', '')
            .replace(' الإعدادي', '')
            .replace(' الاعدادي', '')
            .replace(' الثانوي', '')
            .replace(' الثانوى', '')
            .trim();
        };

        const customStageDisp = getCustomStageName(stage, title);
        const customGradeDisp = getCustomGradeName(selectedGrade);
        if (customStageDisp && customGradeDisp) {
          bannerTitle = `شيت كنترول - ${customStageDisp} - ${customGradeDisp} - 2026 - 2027`;
        } else {
          bannerTitle = `شيت كنترول - ${formattedControlTitle}`;
        }
      } else {
        bannerTitle =
          isNonKgControlSheet && semester === 'second'
            ? `شيت كنترول - ${formattedControlTitle}`
            : `شيت كنترول ${semLabel} - ${formattedControlTitle}`;
      }
    } else if (reportType === 'statistics_and_charts') {
      if (pageIdx === 0) {
        bannerTitle = `الإحصائيات والرسوم البيانية - ${cleanTitle}`;
      } else if (pageIdx === 1) {
        bannerTitle =
          semester === 'first'
            ? (isKindergartenStage
                ? `إحصائيات النجاح والبرامج العلاجية - ${cleanTitle}`
                : `إحصائيات النجاح والرسوب - ${cleanTitle}`)
            : isKindergartenStage
            ? `إحصائيات النجاح والبرامج العلاجية - ${cleanTitle}`
            : `إحصائيات النجاح والرسوب والدور الثانى - ${cleanTitle}`;
      } else {
        const subjEntry = statsSubjectsList[pageIdx - 2];
        const dispSubjLbl = subjEntry?.label || '';
        bannerTitle = isKindergartenStage
          ? `إحصائيات النجاح والبرامج العلاجية - الحضور والغياب - ${dispSubjLbl} - ${cleanTitle}`
          : `إحصائيات النجاح والرسوب - الحضور والغياب - ${dispSubjLbl} - ${cleanTitle}`;
      }
    }
    bannerTitle = applyEntityTerms(bannerTitle);
    ctx.direction = 'rtl';
    ctx.fillStyle = '#ffffff';
    if (isControlSheet) {
      const mainTitleScale = (isNonKgControlSheet ? 1.25 : 1.0) * 1.25;
      const mainTitleFontSize = (isNonKgControlSheet ? 18 : 25) * 1.1 * mainTitleScale;
      const decreeFontSize = (mainTitleFontSize / 2) * 1.25;
      const isPrepStage =
        stage === 'preparatory' ||
        cleanTitle.includes('الإعداد') ||
        cleanTitle.includes('الاعداد');
      const isSecStage =
        stage === 'secondary' ||
        cleanTitle.includes('الثانو') ||
        cleanTitle.includes('البكالوريا');
      const decreeText = isKindergartenStage
        ? 'وفقا للقرار الوزاري رقم 342 بتاريخ 8\u200F - \u200F9\u200F - \u200F2018 م'
        : isPrepStage
        ? 'وفقا للقرار الوزاري رقم 137 بتاريخ 12\u200F - \u200F8\u200F - \u200F2024 م'
        : isSecStage
        ? 'وفقا للقرار الوزاري رقم 234 بتاريخ 17\u200F - \u200F9\u200F - \u200F2025 م'
        : 'وفقا للقرار الوزاري رقم 151 بتاريخ 18\u200F - \u200F8\u200F - \u200F2026 م';

      const centerY = bannerY + bannerH / 2;
      let wDecree = 0;
      if (!(isCustomControlSheet && !includeMainData)) {
        ctx.font = `bold ${decreeFontSize}px "Cairo", sans-serif`;
        wDecree = ctx.measureText(decreeText).width;
        const decreeCenterX = marginX + 24 + wDecree / 2;
        drawCenteredText(ctx, decreeText, decreeCenterX, centerY, wDecree + 16);
      }

      ctx.font = `bold ${mainTitleFontSize}px "Cairo", sans-serif`;
      if (isKindergartenStage) {
        const maxKgTitleW = Math.max(200, contentW - 48 - wDecree - 32);
        const rawTitleW = ctx.measureText(bannerTitle).width;
        const actualTitleW = Math.min(rawTitleW, maxKgTitleW);
        const titleCenterX = marginX + contentW - 24 - actualTitleW / 2;
        drawCenteredText(ctx, bannerTitle, titleCenterX, centerY, maxKgTitleW);
      } else {
        drawCenteredText(ctx, bannerTitle, widthPx / 2, centerY, contentW - 32);
      }
    } else {
      ctx.font = 'bold 25px "Cairo", sans-serif';
      drawCenteredText(ctx, bannerTitle, widthPx / 2, bannerY + bannerH / 2, contentW - 32);
    }

    if (reportType === 'general_statistics') {
      const isMuslimRel = (r?: string) => {
        if (!r) return false;
        const clean = r.trim().toLowerCase();
        return clean.includes('ل') || clean === 'muslim' || clean.includes('مسلم');
      };
      const isChristianRel = (r?: string) => {
        if (!r) return false;
        const clean = r.trim().toLowerCase();
        return clean.includes('ح') || clean === 'christian' || clean.includes('مسيح');
      };

      const totalCount = rawStudents.length;
      const boysList = rawStudents.filter((s) => s.gender === 'male');
      const girlsList = rawStudents.filter((s) => s.gender === 'female');
      const boysCnt = boysList.length;
      const girlsCnt = girlsList.length;
      const muslimsCnt = rawStudents.filter((s) => isMuslimRel(s.religion)).length;
      const christiansCnt = rawStudents.filter((s) => isChristianRel(s.religion)).length;
      const muslimBoysCnt = boysList.filter((s) => isMuslimRel(s.religion)).length;
      const christianBoysCnt = boysList.filter((s) => isChristianRel(s.religion)).length;
      const muslimGirlsCnt = girlsList.filter((s) => isMuslimRel(s.religion)).length;
      const christianGirlsCnt = girlsList.filter((s) => isChristianRel(s.religion)).length;

      const generalCols = [
        { label: isKindergartenStage ? 'إجمالي التلاميذ' : 'إجمالي الطلاب', value: String(totalCount) },
        { label: 'بنين', value: String(boysCnt) },
        { label: 'بنات', value: String(girlsCnt) },
        { label: 'مسلم', value: String(muslimsCnt) },
        { label: 'مسيحي', value: String(christiansCnt) },
        { label: 'بنين مسلمين', value: String(muslimBoysCnt) },
        { label: 'بنين مسيحيين', value: String(christianBoysCnt) },
        { label: 'بنات مسلمات', value: String(muslimGirlsCnt) },
        { label: 'بنات مسيحيات', value: String(christianGirlsCnt) },
      ];

      const officialStatuses = isFirstGrade
        ? [
            'مستجد',
            'مستجدة',
            'باق',
            'باقية',
            'مستجد - دمج',
            'مستجدة - دمج',
            'باق - دمج',
            'باقية - دمج',
          ]
        : [
            'منقول',
            'منقولة',
            'باق',
            'باقية',
            'منقول - دمج',
            'منقولة - دمج',
            'باق - دمج',
            'باقية - دمج',
          ];
      const statusCountsMap: Record<string, number> = {};
      officialStatuses.forEach((st) => {
        statusCountsMap[st] = 0;
      });
      rawStudents.forEach((s) => {
        const norm = normalizeStatusForGrade(s.enrollmentStatus, isFirstGrade, s.gender);
        if (statusCountsMap[norm] !== undefined) {
          statusCountsMap[norm]++;
        } else {
          const fb = isFirstGrade
            ? s.gender === 'female'
              ? 'مستجدة'
              : 'مستجد'
            : s.gender === 'female'
            ? 'منقولة'
            : 'منقول';
          statusCountsMap[fb] = (statusCountsMap[fb] || 0) + 1;
        }
      });
      const statusCols = [
        { label: isKindergartenStage ? 'إجمالي التلاميذ' : 'إجمالي الطلاب', value: String(totalCount) },
        ...officialStatuses.map((st) => ({
          label: st,
          value: String(statusCountsMap[st] || 0),
        })),
      ];

      const officialTypes = ['قيد عادى', 'تحويلات', 'عائدين من الخارج', 'وافدين'];
      const typeCountsMap: Record<string, { total: number; boys: number; girls: number }> = {};
      officialTypes.forEach((ot) => {
        typeCountsMap[ot] = { total: 0, boys: 0, girls: 0 };
      });
      rawStudents.forEach((s) => {
        const rawT =
          s.enrollmentType === 'تحويل من مدرسة أخرى'
            ? 'تحويلات'
            : s.enrollmentType === 'قيد عادي'
            ? 'قيد عادى'
            : s.enrollmentType || 'قيد عادى';
        const key = typeCountsMap[rawT] ? rawT : 'قيد عادى';
        typeCountsMap[key].total++;
        if (s.gender === 'male') typeCountsMap[key].boys++;
        if (s.gender === 'female') typeCountsMap[key].girls++;
      });
      const enrollmentTypeRows: { label: string; value: string }[] = [
        { label: isKindergartenStage ? 'إجمالي التلاميذ' : 'إجمالي الطلاب', value: String(totalCount) },
      ];
      officialTypes.forEach((tName) => {
        const cObj = typeCountsMap[tName];
        const dispName = applyEntityTerms(tName);
        enrollmentTypeRows.push(
          { label: `${dispName} ( إجمالي )`, value: String(cObj.total) },
          { label: `${dispName} ( بنين )`, value: String(cObj.boys) },
          { label: `${dispName} ( بنات )`, value: String(cObj.girls) }
        );
      });

      const damgList = rawStudents.filter((s) => isStudentDamg(s));
      const damgBoys = damgList.filter((s) => s.gender === 'male').length;
      const damgGirls = damgList.filter((s) => s.gender === 'female').length;
      const damgMuslim = damgList.filter((s) => isMuslimRel(s.religion)).length;
      const damgChristian = damgList.filter((s) => isChristianRel(s.religion)).length;
      const damgNewOrTrans = damgList.filter((s) => {
        const norm = normalizeStatusForGrade(s.enrollmentStatus, isFirstGrade, s.gender);
        return norm.includes('مستجد') || norm.includes('منقول');
      }).length;
      const damgRepeating = damgList.filter((s) => {
        const norm = normalizeStatusForGrade(s.enrollmentStatus, isFirstGrade, s.gender);
        return norm.includes('باق');
      }).length;
      const damgCols = [
        { label: isKindergartenStage ? 'إجمالي تلاميذ الدمج' : 'إجمالي طلاب الدمج', value: String(damgList.length) },
        { label: 'بنين', value: String(damgBoys) },
        { label: 'بنات', value: String(damgGirls) },
        { label: 'مسلم ( دمج )', value: String(damgMuslim) },
        { label: 'مسيحى ( دمج )', value: String(damgChristian) },
        {
          label: isFirstGrade ? 'مستجد ( دمج )' : 'منقول ( دمج )',
          value: String(damgNewOrTrans),
        },
        { label: 'باق ( دمج )', value: String(damgRepeating) },
      ];

      if (pageIdx === 0) {
        const drawStatsBlock = (
          topY: number,
          blockTitle: string,
          cols: { label: string; value: string }[]
        ) => {
          const titleH = 74;
          const headH = 72;
          const valH = 78;
          const totalBlockH = titleH + headH + valH;
          const cW = Math.floor(contentW / cols.length);
          const cWidths = cols.map((_, i) =>
            i === cols.length - 1 ? contentW - cW * (cols.length - 1) : cW
          );

          ctx.save();
          drawRoundedRect(ctx, marginX, topY, contentW, totalBlockH, 14);
          ctx.clip();

          const tGrad = ctx.createLinearGradient(marginX, topY, marginX + contentW, topY);
          tGrad.addColorStop(0, '#5eead4');
          tGrad.addColorStop(0.5, '#ccfbf1');
          tGrad.addColorStop(1, '#5eead4');
          ctx.fillStyle = tGrad;
          ctx.fillRect(marginX, topY, contentW, titleH);

          ctx.direction = 'rtl';
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 23px "Cairo", sans-serif';
          drawCenteredText(ctx, blockTitle, marginX + contentW / 2, topY + titleH / 2, contentW - 24);

          const hY = topY + titleH;
          const vY = hY + headH;

          const hGrad = ctx.createLinearGradient(marginX, hY, marginX + contentW, hY);
          hGrad.addColorStop(0, '#fde2e4');
          hGrad.addColorStop(0.5, '#e2e8f0');
          hGrad.addColorStop(1, '#fef3c7');
          ctx.fillStyle = hGrad;
          ctx.fillRect(marginX, hY, contentW, headH);

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(marginX, vY, contentW, valH);

          let curX = marginX + contentW;
          cols.forEach((colItem, idx) => {
            const w = cWidths[idx];
            const x = curX - w;

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, hY, w, headH);

            ctx.direction = 'rtl';
            ctx.fillStyle = '#0f172a';
            let hFont = 20;
            ctx.font = `bold ${hFont}px "Cairo", sans-serif`;
            while (hFont > 12 && ctx.measureText(colItem.label).width > w - 10) {
              hFont -= 0.5;
              ctx.font = `bold ${hFont}px "Cairo", sans-serif`;
            }
            drawCenteredText(ctx, colItem.label, x + w / 2, hY + headH / 2, w - 8);

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, vY, w, valH);

            ctx.direction = 'ltr';
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 24px "Cairo", monospace';
            drawCenteredText(ctx, colItem.value, x + w / 2, vY + valH / 2, w - 8);

            curX -= w;
          });

          ctx.restore();
          drawRoundedRect(ctx, marginX, topY, contentW, totalBlockH, 14);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.stroke();

          return topY + totalBlockH;
        };

        let currentBlockY = bannerY + bannerH + 34;
        const blockGap = 69;
        currentBlockY =
          drawStatsBlock(currentBlockY, isKindergartenStage ? 'الإحصائيات العامة للتلاميذ' : 'الإحصائيات العامة للطلاب', generalCols) + blockGap;
        currentBlockY =
          drawStatsBlock(currentBlockY, 'إحصائيات حالة القيد', statusCols) + blockGap;
        drawStatsBlock(currentBlockY, isKindergartenStage ? 'إحصائيات تلاميذ الدمج' : 'إحصائيات طلاب الدمج', damgCols);
      } else {
        // Page 2: Vertical table for إحصائيات نوعية القيد (14 rows: 1 header + 13 data rows, 3 columns: نوعية القيد, العدد, ملاحظات)
        const vTableTopY = bannerY + bannerH + 16;
        const vHeaderH = 62;
        const vAvailH = heightPx - 102 - 14 - vTableTopY;
        const vRowH = Math.floor((vAvailH - vHeaderH) / 13);
        const vTableTotalH = vHeaderH + vRowH * 13;

        const col1W = Math.floor(contentW * 0.38); // نوعية القيد (Right)
        const col2W = Math.floor(contentW * 0.22); // العدد (Middle)
        const col3W = contentW - col1W - col2W; // ملاحظات (Left)
        const col1X = marginX + contentW - col1W;
        const col2X = col1X - col2W;
        const col3X = marginX;

        ctx.save();
        drawRoundedRect(ctx, marginX, vTableTopY, contentW, vTableTotalH, 16);
        ctx.clip();

        // Row 1 (Header row)
        const vHeadGrad = ctx.createLinearGradient(
          marginX,
          vTableTopY,
          marginX + contentW,
          vTableTopY
        );
        vHeadGrad.addColorStop(0, '#fde2e4');
        vHeadGrad.addColorStop(0.5, '#e2e8f0');
        vHeadGrad.addColorStop(1, '#fef3c7');
        ctx.fillStyle = vHeadGrad;
        ctx.fillRect(marginX, vTableTopY, contentW, vHeaderH);

        const headerCells = [
          { x: col1X, w: col1W, label: 'نوعية القيد' },
          { x: col2X, w: col2W, label: 'العدد' },
          { x: col3X, w: col3W, label: 'ملاحظات' },
        ];
        headerCells.forEach((hc) => {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.strokeRect(hc.x, vTableTopY, hc.w, vHeaderH);
          ctx.direction = 'rtl';
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 21px "Cairo", sans-serif';
          drawCenteredText(ctx, hc.label, hc.x + hc.w / 2, vTableTopY + vHeaderH / 2, hc.w - 16);
        });

        // Rows 2..14 (13 data rows)
        enrollmentTypeRows.slice(0, 13).forEach((rowItem, rIdx) => {
          const rY = vTableTopY + vHeaderH + rIdx * vRowH;
          const { evenBg: vEvenBg, oddBg: vOddBg } = getReportRowBgColors('general_statistics', false, rowTheme);
          const isOddRow = rIdx % 2 !== 0;
          const isDarkRow = isOddRow && (vOddBg === '#000000' || vOddBg === '#dc2626' || rowTheme === 'theme_black' || rowTheme === 'theme_red');
          ctx.fillStyle = isOddRow ? vOddBg : vEvenBg;
          ctx.fillRect(marginX, rY, contentW, vRowH);

          // Col 1: Label
          ctx.strokeStyle = isDarkRow ? '#475569' : '#0f172a';
          ctx.lineWidth = 1.8;
          ctx.strokeRect(col1X, rY, col1W, vRowH);
          ctx.direction = 'rtl';
          ctx.fillStyle = isDarkRow ? '#ffffff' : '#0f172a';
          ctx.font = 'bold 20px "Cairo", sans-serif';
          drawCenteredText(ctx, rowItem.label, col1X + col1W / 2, rY + vRowH / 2, col1W - 16);

          // Col 2: Count
          ctx.strokeRect(col2X, rY, col2W, vRowH);
          ctx.direction = 'ltr';
          ctx.fillStyle = isDarkRow ? '#ffffff' : '#0f172a';
          ctx.font = 'bold 22px "Cairo", monospace';
          drawCenteredText(ctx, rowItem.value, col2X + col2W / 2, rY + vRowH / 2, col2W - 16);

          // Col 3: Notes (ملاحظات)
          ctx.strokeStyle = isDarkRow ? '#475569' : '#0f172a';
          ctx.strokeRect(col3X, rY, col3W, vRowH);
        });

        ctx.restore();

        drawRoundedRect(ctx, marginX, vTableTopY, contentW, vTableTotalH, 16);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    } else if (reportType === 'statistics_and_charts') {
      const isMuslimRel = (r?: string) => {
        if (!r) return false;
        const clean = r.trim().toLowerCase();
        return clean.includes('ل') || clean === 'muslim' || clean.includes('مسلم');
      };
      const isChristianRel = (r?: string) => {
        if (!r) return false;
        const clean = r.trim().toLowerCase();
        return clean.includes('ح') || clean === 'christian' || clean.includes('مسيح');
      };

      const totalCount = rawStudents.length;
      const boysList = rawStudents.filter((s) => s.gender === 'male');
      const girlsList = rawStudents.filter((s) => s.gender === 'female');
      const boysCnt = boysList.length;
      const girlsCnt = girlsList.length;
      const muslimsCnt = rawStudents.filter((s) => isMuslimRel(s.religion)).length;
      const christiansCnt = rawStudents.filter((s) => isChristianRel(s.religion)).length;
      const muslimBoysCnt = boysList.filter((s) => isMuslimRel(s.religion)).length;
      const christianBoysCnt = boysList.filter((s) => isChristianRel(s.religion)).length;
      const muslimGirlsCnt = girlsList.filter((s) => isMuslimRel(s.religion)).length;
      const christianGirlsCnt = girlsList.filter((s) => isChristianRel(s.religion)).length;

      let newOrTransCnt = 0;
      let repeatingCnt = 0;
      let damgCnt = 0;
      let regularTypeCnt = 0;
      let transferTypeCnt = 0;
      let returneeTypeCnt = 0;
      let expatriateTypeCnt = 0;

      rawStudents.forEach((s) => {
        const normStatus = normalizeStatusForGrade(
          s.enrollmentStatus,
          isFirstGrade,
          s.gender
        );
        if (normStatus.includes('باق')) {
          repeatingCnt++;
        } else {
          newOrTransCnt++;
        }
        if (isStudentDamg(s)) {
          damgCnt++;
        }
        const rawT =
          s.enrollmentType === 'تحويل من مدرسة أخرى'
            ? 'تحويلات'
            : s.enrollmentType === 'قيد عادي'
            ? 'قيد عادى'
            : s.enrollmentType || 'قيد عادى';
        if (rawT === 'تحويلات') transferTypeCnt++;
        else if (rawT === 'عائدين من الخارج') returneeTypeCnt++;
        else if (rawT === 'وافدين') expatriateTypeCnt++;
        else regularTypeCnt++;
      });

      const evalSem: 'first' | 'second' = semester === 'first' ? 'first' : 'second';

      const buildPassFailStatsItems = (
        targetStudents: StudentData[],
        subjKey?: string,
        subjLbl?: string
      ) => {
        let passedCnt = 0;
        let passedBoysCnt = 0;
        let passedGirlsCnt = 0;
        let passedDamgCnt = 0;
        let failedCnt = 0;
        let failedBoysCnt = 0;
        let failedGirlsCnt = 0;
        let failedDamgCnt = 0;
        let secondRoundCnt = 0;
        let secondRoundBoysCnt = 0;
        let secondRoundGirlsCnt = 0;
        let secondRoundDamgCnt = 0;

        const evalCounts: Record<string, number> = {
          'ممتاز': 0,
          'جيد جداً': 0,
          'جيد': 0,
          'مقبول': 0,
          'دون المستوى': 0,
          'يفوق التوقعات دائماً': 0,
          'يفوق التوقعات': 0,
          'يلبي التوقعات': 0,
          'يلبي التوقعات أحياناً': 0,
          'أقل من المتوقع': 0,
          'أقل من التوقعات': 0,
        };

        targetStudents.forEach((s) => {
          const sum = subjKey
            ? evaluateStudentSingleSubjectSummary(
                s,
                subjKey,
                evalSem,
                stage,
                selectedGrade,
                subjLbl
              )
            : evaluateStudentSemesterSummary(s, evalSem, stage, selectedGrade);
          const isBoy = s.gender === 'male';
          const isGirl = s.gender === 'female';
          const isDamg = isStudentDamg(s);

          if (sum.status === 'pass') {
            passedCnt++;
            if (isBoy) passedBoysCnt++;
            if (isGirl) passedGirlsCnt++;
            if (isDamg) passedDamgCnt++;
          } else if (sum.status === 'fail') {
            failedCnt++;
            if (isBoy) failedBoysCnt++;
            if (isGirl) failedGirlsCnt++;
            if (isDamg) failedDamgCnt++;
            if (isKindergartenStage) {
              secondRoundCnt++;
              if (isBoy) secondRoundBoysCnt++;
              if (isGirl) secondRoundGirlsCnt++;
              if (isDamg) secondRoundDamgCnt++;
            }
          } else if (sum.status === 'second_round') {
            secondRoundCnt++;
            if (isBoy) secondRoundBoysCnt++;
            if (isGirl) secondRoundGirlsCnt++;
            if (isDamg) secondRoundDamgCnt++;
          }

          if (sum.evaluation && evalCounts[sum.evaluation] !== undefined) {
            evalCounts[sum.evaluation]++;
          }
        });

        if (isKindergartenStage) {
          secondRoundCnt = failedCnt;
          secondRoundBoysCnt = failedBoysCnt;
          secondRoundGirlsCnt = failedGirlsCnt;
          secondRoundDamgCnt = failedDamgCnt;
        }

        return [
          {
            label: isKindergartenStage ? 'إجمالي التلاميذ' : 'إجمالي الطلاب',
            count: targetStudents.length,
            color: '#1e293b',
            lightColor: '#475569',
          },
          { label: 'إجمالي الناجحين', count: passedCnt, color: '#059669', lightColor: '#34d399' },
          { label: 'ناجح ( بنين )', count: passedBoysCnt, color: '#2563eb', lightColor: '#60a5fa' },
          { label: 'ناجح ( بنات )', count: passedGirlsCnt, color: '#db2777', lightColor: '#f472b6' },
          { label: 'ناجح ( دمج )', count: passedDamgCnt, color: '#0d9488', lightColor: '#2dd4bf' },
          {
            label: isKindergartenStage
              ? 'إجمالي من لهم برنامج علاجى'
              : 'إجمالي الراسبين',
            count: failedCnt,
            color: '#dc2626',
            lightColor: '#f87171'
          },
          {
            label: isKindergartenStage
              ? 'له برنامج علاجى ( بنين )'
              : 'راسب ( بنين )',
            count: failedBoysCnt,
            color: '#e11d48',
            lightColor: '#fb7185'
          },
          {
            label: isKindergartenStage
              ? 'لها برنامج علاجى ( بنات )'
              : 'راسب ( بنات )',
            count: failedGirlsCnt,
            color: '#be185d',
            lightColor: '#f472b6'
          },
          {
            label: isKindergartenStage
              ? 'له برنامج علاجى ( دمج )'
              : 'راسب ( دمج )',
            count: failedDamgCnt,
            color: '#b91c1c',
            lightColor: '#fca5a5'
          },
          ...(evalSem === 'second'
            ? [
                {
                  label: isKindergartenStage ? 'إجمالي برامج علاجية' : 'إجمالي الدور الثانى',
                  count: secondRoundCnt,
                  color: '#d97706',
                  lightColor: '#fbbf24',
                },
                {
                  label: isKindergartenStage ? 'برامج علاجية ( بنين )' : 'دور ثان ( بنين )',
                  count: secondRoundBoysCnt,
                  color: '#ea580c',
                  lightColor: '#fb923c',
                },
                {
                  label: isKindergartenStage ? 'برامج علاجية ( بنات )' : 'دور ثان ( بنات )',
                  count: secondRoundGirlsCnt,
                  color: '#9333ea',
                  lightColor: '#c084fc',
                },
                {
                  label: isKindergartenStage ? 'برامج علاجية ( دمج )' : 'دور ثان ( دمج )',
                  count: secondRoundDamgCnt,
                  color: '#7c3aed',
                  lightColor: '#a78bfa',
                },
              ]
            : []),
          ...(isKindergartenStage
            ? [
                {
                  label: '',
                  chartLabel: 'يفوق التوقعات',
                  count: (evalCounts['يفوق التوقعات دائماً'] || 0) + (evalCounts['يفوق التوقعات'] || 0),
                  color: '#0078d7',
                  lightColor: '#60a5fa',
                  headerBgColor: '#0078d7',
                  hideHeaderLabel: true,
                },
                {
                  label: '',
                  chartLabel: 'يلبي التوقعات',
                  count: evalCounts['يلبي التوقعات'] || 0,
                  color: '#16c60c',
                  lightColor: '#4ade80',
                  headerBgColor: '#16c60c',
                  hideHeaderLabel: true,
                },
                {
                  label: '',
                  chartLabel: 'يلبي أحياناً',
                  count: evalCounts['يلبي التوقعات أحياناً'] || 0,
                  color: '#ca8a04',
                  lightColor: '#fde047',
                  headerBgColor: '#ffff00',
                  hideHeaderLabel: true,
                },
                {
                  label: '',
                  chartLabel: 'أقل من المتوقع',
                  count: (evalCounts['أقل من المتوقع'] || 0) + (evalCounts['أقل من التوقعات'] || 0),
                  color: '#e81123',
                  lightColor: '#f87171',
                  headerBgColor: '#e81123',
                  hideHeaderLabel: true,
                },
              ]
            : [
                { label: 'ممتاز', count: evalCounts['ممتاز'], color: '#16a34a', lightColor: '#4ade80' },
                {
                  label: 'جيد جداً',
                  count: evalCounts['جيد جداً'],
                  color: '#0284c7',
                  lightColor: '#38bdf8',
                },
                { label: 'جيد', count: evalCounts['جيد'], color: '#4f46e5', lightColor: '#818cf8' },
                { label: 'مقبول', count: evalCounts['مقبول'], color: '#ca8a04', lightColor: '#facc15' },
                {
                  label: 'دون المستوى',
                  count: evalCounts['دون المستوى'],
                  color: '#dc2626',
                  lightColor: '#f87171',
                },
              ]),
        ];
      };

      const isKgStage =
        Boolean(statsSubjectsConfig?.isKindergarten) ||
        stage === 'kindergarten' ||
        stage === 'kg' ||
        cleanTitle.includes('رياض الأطفال') ||
        cleanTitle.includes('رياض الاطفال');

      const buildWrittenAttendanceTable = (
        targetStudents: StudentData[],
        subjKey: string,
        subjLbl: string
      ): {
        title: string;
        items: { label: string; count: number; color: string }[];
      } => {
        let presentTotal = 0;
        let presentBoys = 0;
        let presentGirls = 0;
        let presentDamg = 0;
        let absentTotal = 0;
        let absentBoys = 0;
        let absentGirls = 0;
        let absentDamg = 0;

                const subjConfig = statsSubjectsConfig?.customCols.find((c) => c.key === subjKey);
        const subjOvr = statsSubjectsConfig?.defaultSubjectsOverrides?.[subjKey];
        const subHasWritten = (subjOvr?.hasWrittenExam !== undefined ? subjOvr.hasWrittenExam : subjConfig?.hasWrittenExam) !== false;

        targetStudents.forEach((s) => {
          const writtenObj =
            evalSem === 'first'
              ? s.writtenExams?.['first'] || s.writtenExams?.['الفصل الدراسي الأول']
              : s.writtenExams?.['second'] ||
                s.writtenExams?.['الفصل الدراسي الثاني'] ||
                (s.writtenExams as any)?.['الفصل الدراسي الثانى'];
          const assessObj =
            evalSem === 'first'
              ? s.assessments?.['first'] || s.assessments?.['الفصل الدراسي الأول']
              : s.assessments?.['second'] ||
                s.assessments?.['الفصل الدراسي الثاني'] ||
                (s.assessments as any)?.['الفصل الدراسي الثانى'];
          const sourceObj = (isKgStage || !subHasWritten) ? assessObj || writtenObj : writtenObj;
          const rawVal = sourceObj ? (sourceObj as any)[subjKey] : undefined;
          const tr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
          const isAbsent =
            tr === 'غ' ||
            tr === 'غائب' ||
            tr === 'غائبة' ||
            tr.toLowerCase() === 'a' ||
            tr.toLowerCase() === 'absent';
          const isBoy = s.gender === 'male';
          const isGirl = s.gender === 'female';
          const isDamg = isStudentDamg(s);

          if (isAbsent) {
            absentTotal++;
            if (isBoy) absentBoys++;
            if (isGirl) absentGirls++;
            if (isDamg) absentDamg++;
          } else {
            presentTotal++;
            if (isBoy) presentBoys++;
            if (isGirl) presentGirls++;
            if (isDamg) presentDamg++;
          }
        });

        return {
          title: (isKgStage || !subHasWritten)
            ? `جدول احصائيات الحضور والغياب - ${subjLbl} - ${cleanTitle}`
            : `جدول احصائيات الحضور والغياب فى الامتحان التحريرى - ${subjLbl} - ${cleanTitle}`,
          items: [
            { label: isKgStage ? 'اجمالى التلاميذ' : 'اجمالى الطلاب', count: targetStudents.length, color: '#1e293b' },
            { label: 'الحضور', count: presentTotal, color: '#059669' },
            { label: 'بنين', count: presentBoys, color: '#2563eb' },
            { label: 'بنات', count: presentGirls, color: '#db2777' },
            { label: 'دمج', count: presentDamg, color: '#0d9488' },
            { label: 'الغياب', count: absentTotal, color: '#dc2626' },
            { label: 'بنين', count: absentBoys, color: '#e11d48' },
            { label: 'بنات', count: absentGirls, color: '#be185d' },
            { label: 'دمج', count: absentDamg, color: '#b91c1c' },
          ],
        };
      };

      const drawStatsTableAndChartSection = (
        secTopY: number,
        secAvailH: number,
        tblTitleText: string,
        itemsList: { label: string; count: number; color: string; lightColor: string }[],
        denomCount: number,
        isCompactSection = false,
        secondaryTable?: {
          title: string;
          items: { label: string; count: number; color: string }[];
        }
      ) => {
        const fmtSecPct = (cnt: number) =>
          denomCount > 0 ? `${parseFloat(((cnt / denomCount) * 100).toFixed(1))} %` : '0 %';

        const hasSecondary = Boolean(secondaryTable);
        const tblTopY = secTopY;
        const tblTitleH = isCompactSection
          ? Math.round((hasSecondary ? 34 : 48) * 1.05)
          : Math.round((hasSecondary ? 50 : 58) * 1.05);
        const tblHeaderH = isCompactSection
          ? Math.round((hasSecondary ? 32 : 48) * 1.05)
          : Math.round((hasSecondary ? 48 : 56) * 1.05);
        const tblCountRowH = isCompactSection
          ? Math.round((hasSecondary ? 29 : 44) * 1.05)
          : Math.round((hasSecondary ? 44 : 50) * 1.05);
        const tblPctRowH = isCompactSection
          ? Math.round((hasSecondary ? 29 : 42) * 1.05)
          : Math.round((hasSecondary ? 44 : 48) * 1.05);
        const tblTotalH = tblTitleH + tblHeaderH + tblCountRowH + tblPctRowH;

        const countFontSize = Math.round(
          (isCompactSection ? (hasSecondary ? 16.5 : 20) : 21) * 1.25
        );
        const pctFontSize = Math.round(
          (isCompactSection ? (hasSecondary ? 13.5 : 15.5) : 16) * 1.25
        );
        const highlightedPctFontSize = Math.round(pctFontSize * 1.5);
        let uniformHeaderFontSize = isCompactSection ? (hasSecondary ? 15 : 17) : 17.5;
        let rawColNeeds: number[] = [];
        const cellPadX = itemsList.length > 16 ? 12 : 18;
        while (uniformHeaderFontSize >= 10.5) {
          rawColNeeds = itemsList.map((item) => {
            const isHighlightedTotalCol =
              item.label === 'إجمالي الناجحين' ||
              item.label === 'إجمالي الراسبين' ||
              item.label === 'الناجحين حكما' ||
              item.label === 'إجمالي الناجحين حكما' ||
              item.label === 'من لهم برنامج علاجى' ||
              item.label === 'إجمالي من لهم برنامج علاجى' ||
              item.label === 'الناجحين اعتبارا' ||
              item.label === 'إجمالي الناجحين اعتبارا' ||
              item.label === 'إجمالي من لهم برامج علاجية' ||
              item.label === 'لهم برامج علاجية' ||
              item.label === 'إجمالي الدور الثانى' ||
              item.label === 'إجمالي برامج علاجية';
            const colPctFont = isHighlightedTotalCol ? highlightedPctFontSize : pctFontSize;
            ctx.font = `bold ${uniformHeaderFontSize}px "Cairo", sans-serif`;
            let headerW = item.label ? ctx.measureText(item.label).width : 50;
            if (isKgStage && item.label.includes('برامج علاجية')) {
              headerW = Math.ceil(headerW * 1.05) + 16;
            }
            ctx.font = `bold ${countFontSize}px "Cairo", monospace`;
            const countW = ctx.measureText(String(item.count)).width;
            ctx.font = `bold ${colPctFont}px "Cairo", monospace`;
            const pctW = ctx.measureText(fmtSecPct(item.count)).width;
            return Math.ceil(Math.max(headerW, countW, pctW)) + cellPadX;
          });
          const totalNeeded = rawColNeeds.reduce((acc, w) => acc + w, 0);
          if (totalNeeded <= contentW) {
            break;
          }
          uniformHeaderFontSize -= 0.5;
        }

        const totalRawNeeds = rawColNeeds.reduce((acc, w) => acc + w, 0);
        const itemColWidths = rawColNeeds.map((needW) =>
          Math.floor((needW / totalRawNeeds) * contentW)
        );
        const sumAssigned = itemColWidths.reduce((acc, w) => acc + w, 0);
        itemColWidths[itemColWidths.length - 1] += contentW - sumAssigned;

        if (isKgStage) {
          itemsList.forEach((item, idx) => {
            if (item.label.includes('برامج علاجية')) {
              ctx.font = `bold ${uniformHeaderFontSize}px "Cairo", sans-serif`;
              const minAllowed = Math.ceil(ctx.measureText(item.label).width * 1.05) + cellPadX + 8;
              if (itemColWidths[idx] < minAllowed) {
                const diff = minAllowed - itemColWidths[idx];
                itemColWidths[idx] = minAllowed;
                const others = itemsList.map((_, i) => i).filter(i => i !== idx && !itemsList[i].label.includes('برامج علاجية'));
                if (others.length > 0) {
                  const cut = Math.floor(diff / others.length);
                  others.forEach(oi => {
                    itemColWidths[oi] = Math.max(30, itemColWidths[oi] - cut);
                  });
                }
              }
            }
          });
          const reSum = itemColWidths.reduce((acc, w) => acc + w, 0);
          itemColWidths[itemColWidths.length - 1] += contentW - reSum;
        }

        ctx.save();
        drawRoundedRect(ctx, marginX, tblTopY, contentW, tblTotalH, isCompactSection ? 12 : 14);
        ctx.clip();

        // Table Title Bar
        const tblTitleGrad = ctx.createLinearGradient(marginX, tblTopY, marginX + contentW, tblTopY);
        tblTitleGrad.addColorStop(0, '#5eead4');
        tblTitleGrad.addColorStop(0.5, '#ccfbf1');
        tblTitleGrad.addColorStop(1, '#5eead4');
        ctx.fillStyle = tblTitleGrad;
        ctx.fillRect(marginX, tblTopY, contentW, tblTitleH);

        ctx.direction = 'rtl';
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${isCompactSection ? (hasSecondary ? 17 : 20) : 21}px "Cairo", sans-serif`;
        drawCenteredText(
          ctx,
          applyEntityTerms(tblTitleText),
          marginX + contentW / 2,
          tblTopY + tblTitleH / 2,
          contentW - 24
        );

        const hRowY = tblTopY + tblTitleH;
        const cRowY = hRowY + tblHeaderH;
        const pRowY = cRowY + tblCountRowH;

        const hGrad = ctx.createLinearGradient(marginX, hRowY, marginX + contentW, hRowY);
        hGrad.addColorStop(0, '#fde2e4');
        hGrad.addColorStop(0.5, '#e2e8f0');
        hGrad.addColorStop(1, '#fef3c7');
        ctx.fillStyle = hGrad;
        ctx.fillRect(marginX, hRowY, contentW, tblHeaderH);

        const { evenBg: sEvenBg, oddBg: sOddBg } = getReportRowBgColors('statistics_and_charts', false, rowTheme);
        ctx.fillStyle = sEvenBg;
        ctx.fillRect(marginX, cRowY, contentW, tblCountRowH);

        ctx.fillStyle = sOddBg;
        ctx.fillRect(marginX, pRowY, contentW, tblPctRowH);

        const drawCenteredCellValue = (
          valText: string,
          cellX: number,
          cellY: number,
          cellW: number,
          cellH: number
        ) => {
          drawCenteredText(ctx, valText, cellX + cellW / 2, cellY + cellH / 2, cellW - 6);
        };

        let curRightX = marginX + contentW;
        itemsList.forEach((item, idx) => {
          const w = itemColWidths[idx];
          const x = curRightX - w;

          // Header cell (uniform font size across all columns)
          if ((item as any).headerBgColor) {
            ctx.fillStyle = (item as any).headerBgColor;
            ctx.fillRect(x, hRowY, w, tblHeaderH);
          }
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, hRowY, w, tblHeaderH);
          if (!(item as any).hideHeaderLabel && item.label) {
            ctx.direction = 'rtl';
            ctx.fillStyle = '#0f172a';
            ctx.font = `bold ${uniformHeaderFontSize}px "Cairo", sans-serif`;
            drawCenteredCellValue(item.label, x, hRowY, w, tblHeaderH);
          }

          // Count cell
          ctx.strokeRect(x, cRowY, w, tblCountRowH);
          ctx.direction = 'ltr';
          ctx.fillStyle = item.color;
          ctx.font = `bold ${countFontSize}px "Cairo", monospace`;
          drawCenteredCellValue(String(item.count), x, cRowY, w, tblCountRowH);

          // Percentage cell
          const isPassedTotalCol = item.label === 'إجمالي الناجحين';
          const isKgJudgedPassCol =
            isKgStage &&
            (item.label === 'الناجحين حكما' ||
              item.label === 'إجمالي الناجحين حكما' ||
              item.label === 'من لهم برنامج علاجى' ||
              item.label === 'إجمالي من لهم برنامج علاجى' ||
              item.label.includes('حكما') ||
              item.label.includes('برنامج علاجى'));
          const isFailedTotalCol =
            !isKgJudgedPassCol && (
              item.label === 'إجمالي الراسبين' ||
              item.label === 'الناجحين اعتبارا' ||
              item.label === 'إجمالي الناجحين اعتبارا' ||
              item.label === 'إجمالي من لهم برامج علاجية' ||
              item.label === 'لهم برامج علاجية'
            );
          const isSecondRoundTotalCol =
            item.label === 'إجمالي الدور الثانى' ||
            item.label === 'إجمالي برامج علاجية';
          if (isKgJudgedPassCol) {
            // فى مرحلة رياض الاطفال فى الفصل الدراسي الاول والثانى حذف حقل نسبة الطلاب الناجحين حكما
          } else if (isPassedTotalCol) {
            ctx.fillStyle = '#15803d';
            ctx.fillRect(x, pRowY, w, tblPctRowH);
          } else if (isFailedTotalCol) {
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(x, pRowY, w, tblPctRowH);
          } else if (isSecondRoundTotalCol) {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(x, pRowY, w, tblPctRowH);
          }
          const isDarkPct = sOddBg === '#000000' || sOddBg === '#dc2626' || rowTheme === 'theme_black' || rowTheme === 'theme_red';
          ctx.strokeStyle = isDarkPct ? '#475569' : '#0f172a';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, pRowY, w, tblPctRowH);
          ctx.direction = 'ltr';
          ctx.fillStyle = isKgJudgedPassCol ? (isDarkPct ? '#ffffff' : '#000000') : (isPassedTotalCol || isFailedTotalCol ? '#ffffff' : (isDarkPct ? '#ffffff' : '#000000'));
          const activePctFont =
            isPassedTotalCol || isFailedTotalCol || isSecondRoundTotalCol
              ? highlightedPctFontSize
              : pctFontSize;
          ctx.font = `bold ${activePctFont}px "Cairo", monospace`;
          const pctValToDraw = isKgJudgedPassCol ? '' : fmtSecPct(item.count);
          drawCenteredCellValue(pctValToDraw, x, pRowY, w, tblPctRowH);

          curRightX -= w;
        });

        ctx.restore();
        drawRoundedRect(ctx, marginX, tblTopY, contentW, tblTotalH, isCompactSection ? 12 : 14);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Optional Secondary Table (Written Exam Attendance & Absence Table) directly below the main table
        let afterTablesY = tblTopY + tblTotalH;
        if (secondaryTable) {
          const secGap = isCompactSection ? 9 : 15;
          const secTblTopY = afterTablesY + secGap;
          const secTblTitleH = tblTitleH;
          const secTblHeaderH = tblHeaderH;
          const secTblCountRowH = tblCountRowH;
          const secTblPctRowH = tblPctRowH;
          const secTblTotalH = secTblTitleH + secTblHeaderH + secTblCountRowH + secTblPctRowH;

          const secItems = secondaryTable.items;
          const secColW = Math.floor(contentW / secItems.length);
          const secColWidths = secItems.map((_, i) =>
            i === secItems.length - 1 ? contentW - secColW * (secItems.length - 1) : secColW
          );

          ctx.save();
          drawRoundedRect(
            ctx,
            marginX,
            secTblTopY,
            contentW,
            secTblTotalH,
            isCompactSection ? 12 : 14
          );
          ctx.clip();

          // Secondary Table Title Bar
          const secTitleGrad = ctx.createLinearGradient(
            marginX,
            secTblTopY,
            marginX + contentW,
            secTblTopY
          );
          secTitleGrad.addColorStop(0, '#5eead4');
          secTitleGrad.addColorStop(0.5, '#ccfbf1');
          secTitleGrad.addColorStop(1, '#5eead4');
          ctx.fillStyle = secTitleGrad;
          ctx.fillRect(marginX, secTblTopY, contentW, secTblTitleH);

          ctx.direction = 'rtl';
          ctx.fillStyle = '#000000';
          ctx.font = `bold ${isCompactSection ? (hasSecondary ? 17 : 20) : 21}px "Cairo", sans-serif`;
          drawCenteredText(
            ctx,
            applyEntityTerms(secondaryTable.title),
            marginX + contentW / 2,
            secTblTopY + secTblTitleH / 2,
            contentW - 24
          );

          const shRowY = secTblTopY + secTblTitleH;
          const scRowY = shRowY + secTblHeaderH;
          const spRowY = scRowY + secTblCountRowH;

          const shGrad = ctx.createLinearGradient(marginX, shRowY, marginX + contentW, shRowY);
          shGrad.addColorStop(0, '#fde2e4');
          shGrad.addColorStop(0.5, '#e2e8f0');
          shGrad.addColorStop(1, '#fef3c7');
          ctx.fillStyle = shGrad;
          ctx.fillRect(marginX, shRowY, contentW, secTblHeaderH);

          ctx.fillStyle = sEvenBg;
          ctx.fillRect(marginX, scRowY, contentW, secTblCountRowH);

          ctx.fillStyle = sOddBg;
          ctx.fillRect(marginX, spRowY, contentW, secTblPctRowH);

          let secRightX = marginX + contentW;
          secItems.forEach((sItem, sIdx) => {
            const w = secColWidths[sIdx];
            const x = secRightX - w;

            // Header cell
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, shRowY, w, secTblHeaderH);
            ctx.direction = 'rtl';
            ctx.fillStyle = '#0f172a';
            ctx.font = `bold ${uniformHeaderFontSize}px "Cairo", sans-serif`;
            drawCenteredCellValue(sItem.label, x, shRowY, w, secTblHeaderH);

            // Count cell
            ctx.strokeRect(x, scRowY, w, secTblCountRowH);
            ctx.direction = 'ltr';
            ctx.fillStyle = sItem.color;
            ctx.font = `bold ${countFontSize}px "Cairo", monospace`;
            drawCenteredCellValue(String(sItem.count), x, scRowY, w, secTblCountRowH);

            // Percentage cell (last row)
            const isPresentTotalCol = sItem.label === 'الحضور';
            const isAbsentTotalCol = sItem.label === 'الغياب';
            if (isPresentTotalCol) {
              ctx.fillStyle = '#15803d';
              ctx.fillRect(x, spRowY, w, secTblPctRowH);
            } else if (isAbsentTotalCol) {
              ctx.fillStyle = '#991b1b';
              ctx.fillRect(x, spRowY, w, secTblPctRowH);
            }
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, spRowY, w, secTblPctRowH);
            ctx.direction = 'ltr';
            ctx.fillStyle = isPresentTotalCol || isAbsentTotalCol ? '#ffffff' : '#000000';
            const secActivePctFont =
              isPresentTotalCol || isAbsentTotalCol ? highlightedPctFontSize : pctFontSize;
            ctx.font = `bold ${secActivePctFont}px "Cairo", monospace`;
            drawCenteredCellValue(fmtSecPct(sItem.count), x, spRowY, w, secTblPctRowH);

            secRightX -= w;
          });

          ctx.restore();
          drawRoundedRect(
            ctx,
            marginX,
            secTblTopY,
            contentW,
            secTblTotalH,
            isCompactSection ? 12 : 14
          );
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.stroke();

          afterTablesY = secTblTopY + secTblTotalH;
        }

        const chartGap = isCompactSection ? (hasSecondary ? 9 : 12) : hasSecondary ? 15 : 24;

        // 2) Bar Chart below the table(s)
        const chartBoxTopY = afterTablesY + chartGap;
        const chartBoxH = secTopY + secAvailH - chartBoxTopY;

        ctx.save();
        drawRoundedRect(
          ctx,
          marginX,
          chartBoxTopY,
          contentW,
          chartBoxH,
          isCompactSection ? 12 : 16
        );
        ctx.clip();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(marginX, chartBoxTopY, contentW, chartBoxH);

        // Plot Area
        const yAxisStripW = 56;
        const plotTopY = chartBoxTopY + (isCompactSection ? (hasSecondary ? 26 : 34) : 54);
        const plotBottomY =
          chartBoxTopY + chartBoxH - (isCompactSection ? (hasSecondary ? 28 : 38) : 76);
        const plotH = Math.max(40, plotBottomY - plotTopY);
        const plotLeftX = marginX + 20;
        const plotRightX = marginX + contentW - yAxisStripW;
        const plotW = plotRightX - plotLeftX;

        const maxScaleVal = Math.max(1, denomCount);
        const gridSteps = isCompactSection ? 4 : 5;
        for (let g = 0; g <= gridSteps; g++) {
          const ratio = g / gridSteps;
          const gy = plotBottomY - ratio * plotH;
          const stepVal = Math.round(ratio * maxScaleVal);

          ctx.strokeStyle = g === 0 ? '#0f172a' : '#cbd5e1';
          ctx.lineWidth = g === 0 ? 2.5 : 1.2;
          if (g > 0) ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(plotLeftX, gy);
          ctx.lineTo(plotRightX, gy);
          ctx.stroke();
          ctx.setLineDash([]);

          // Y-axis value on the right
          ctx.direction = 'ltr';
          ctx.fillStyle = '#334155';
          ctx.font = `bold ${isCompactSection ? 13 : 15}px "Cairo", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(stepVal), plotRightX + yAxisStripW / 2, gy);
        }

        // Draw vertical axis line at plotRightX
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(plotRightX, plotTopY - (isCompactSection ? 10 : 16));
        ctx.lineTo(plotRightX, plotBottomY);
        ctx.stroke();

        // Draw bars distributed across plotW from right to left
        const barSlotW = plotW / itemsList.length;
        itemsList.forEach((item, idx) => {
          const colX = plotRightX - (idx + 1) * barSlotW;
          const colW = barSlotW;
          const centerX = colX + colW / 2;
          const barW = Math.min(isCompactSection ? 42 : 54, Math.floor(colW * 0.62));
          const barX = centerX - barW / 2;

          const barRatio = maxScaleVal > 0 ? item.count / maxScaleVal : 0;
          const rawBarH = Math.round(barRatio * plotH);
          const barH = item.count > 0 ? Math.max(6, rawBarH) : 3;
          const barY = plotBottomY - barH;

          // Bar shadow & gradient
          const bGrad = ctx.createLinearGradient(barX, barY, barX, plotBottomY);
          bGrad.addColorStop(0, item.lightColor);
          bGrad.addColorStop(1, item.color);

          ctx.save();
          drawRoundedRect(ctx, barX, barY, barW, barH, Math.min(8, barH / 2));
          ctx.fillStyle = bGrad;
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.restore();

          // Value & Percentage above bar
          ctx.direction = 'ltr';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillStyle = item.color;
          ctx.font = `bold ${isCompactSection ? 15 : 18}px "Cairo", monospace`;
          ctx.fillText(
            String(item.count),
            centerX,
            barY - (isCompactSection ? 15 : 20),
            colW - 4
          );

          ctx.fillStyle = '#475569';
          ctx.font = `bold ${isCompactSection ? 11.5 : 13}px "Cairo", monospace`;
          ctx.fillText(`(${fmtSecPct(item.count)})`, centerX, barY - 2, colW - 4);

          // X-axis label below bar
          const dispLabel = (item as any).chartLabel || item.label;
          ctx.direction = 'rtl';
          ctx.fillStyle = '#0f172a';
          let xFont = isCompactSection ? 13.5 : 15;
          ctx.font = `bold ${xFont}px "Cairo", sans-serif`;
          while (xFont > 10 && ctx.measureText(dispLabel).width > colW - 6) {
            xFont -= 0.5;
            ctx.font = `bold ${xFont}px "Cairo", sans-serif`;
          }
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            dispLabel,
            centerX,
            plotBottomY + (isCompactSection ? 20 : 34),
            colW - 4
          );
        });

        ctx.restore();
        drawRoundedRect(
          ctx,
          marginX,
          chartBoxTopY,
          contentW,
          chartBoxH,
          isCompactSection ? 12 : 16
        );
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.stroke();
      };

      const fullSecTopY = bannerY + bannerH + 14;
      const fullSecAvailH = heightPx - 102 - 12 - fullSecTopY;

      if (pageIdx === 0) {
        const generalStatsItems = [
          { label: isKindergartenStage ? 'إجمالي التلاميذ' : 'إجمالي الطلاب', count: totalCount, color: '#1e293b', lightColor: '#475569' },
          { label: 'بنين', count: boysCnt, color: '#2563eb', lightColor: '#60a5fa' },
          { label: 'بنات', count: girlsCnt, color: '#db2777', lightColor: '#f472b6' },
          { label: 'مسلم', count: muslimsCnt, color: '#059669', lightColor: '#34d399' },
          { label: 'مسيحي', count: christiansCnt, color: '#d97706', lightColor: '#fbbf24' },
          { label: 'بنين مسلمين', count: muslimBoysCnt, color: '#1d4ed8', lightColor: '#3b82f6' },
          { label: 'بنين مسيحيين', count: christianBoysCnt, color: '#0284c7', lightColor: '#38bdf8' },
          { label: 'بنات مسلمات', count: muslimGirlsCnt, color: '#be185d', lightColor: '#ec4899' },
          { label: 'بنات مسيحيات', count: christianGirlsCnt, color: '#e11d48', lightColor: '#fb7185' },
          ...(!isKindergartenStage
            ? [
                {
                  label: isFirstGrade ? 'مستجد' : 'منقول',
                  count: newOrTransCnt,
                  color: '#4f46e5',
                  lightColor: '#818cf8',
                },
                { label: 'باق', count: repeatingCnt, color: '#dc2626', lightColor: '#f87171' },
              ]
            : []),
          { label: isKindergartenStage ? 'تلاميذ الدمج' : 'طلاب الدمج', count: damgCnt, color: '#7c3aed', lightColor: '#a78bfa' },
          { label: 'قيد عادى', count: regularTypeCnt, color: '#0d9488', lightColor: '#2dd4bf' },
          { label: 'تحويلات', count: transferTypeCnt, color: '#ea580c', lightColor: '#fb923c' },
          { label: 'عائدين من الخارج', count: returneeTypeCnt, color: '#0891b2', lightColor: '#22d3ee' },
          { label: 'وافدين', count: expatriateTypeCnt, color: '#9333ea', lightColor: '#c084fc' },
        ];
        drawStatsTableAndChartSection(
          fullSecTopY,
          fullSecAvailH,
          `جدول الإحصائيات العامة - ${cleanTitle}`,
          generalStatsItems,
          totalCount,
          false
        );
      } else if (pageIdx === 1) {
        const overallPassFailItems = buildPassFailStatsItems(rawStudents);
        const tblTitle =
          semester === 'first'
            ? (isKindergartenStage
                ? `جدول إحصائيات النجاح والبرامج العلاجية - ${cleanTitle}`
                : `جدول إحصائيات النجاح والرسوب - ${cleanTitle}`)
            : isKindergartenStage
            ? `جدول إحصائيات النجاح والبرامج العلاجية - ${cleanTitle}`
            : `جدول إحصائيات النجاح والرسوب والدور الثانى - ${cleanTitle}`;
        drawStatsTableAndChartSection(
          fullSecTopY,
          fullSecAvailH,
          tblTitle,
          overallPassFailItems,
          totalCount,
          false
        );
      } else {
        const subjEntry = statsSubjectsList[pageIdx - 2];
        const subjKey = subjEntry?.key || 'arabic';
        const subjLbl = subjEntry?.label || subjKey;
        const targetStudents =
          subjEntry?.religionFilter === 'muslim'
            ? rawStudents.filter((s) => isMuslimRel(s.religion))
            : subjEntry?.religionFilter === 'christian'
            ? rawStudents.filter((s) => isChristianRel(s.religion))
            : rawStudents;

        const subjItems = buildPassFailStatsItems(targetStudents, subjKey, subjLbl);
        const subjTblTitle =
          semester === 'first'
            ? (isKindergartenStage
                ? `جدول إحصائيات النجاح والبرامج العلاجية - ${subjLbl} - ${cleanTitle}`
                : `جدول إحصائيات النجاح والرسوب - ${subjLbl} - ${cleanTitle}`)
            : isKindergartenStage
            ? `جدول إحصائيات النجاح والبرامج العلاجية - ${subjLbl} - ${cleanTitle}`
            : `جدول إحصائيات النجاح والرسوب والدور الثانى - ${subjLbl} - ${cleanTitle}`;
        drawStatsTableAndChartSection(
          fullSecTopY,
          fullSecAvailH,
          subjTblTitle,
          subjItems,
          targetStudents.length,
          false,
          buildWrittenAttendanceTable(targetStudents, subjKey, subjLbl)
        );
      }
    } else {
    // 3. Table (headerRowH increased by 30%: 52 -> 68)
    const hasKgColorLegend = isControlSheet && isKindergartenStage;
    const hasNonKgSem2Legend = isNonKgControlSheet && semester === 'second';
    const kgLegendY = bannerY + bannerH + 8;
    const kgLegendH = 36;
    if (hasKgColorLegend) {
      const kgLegendW = Math.round(contentW * 0.5);
      const kgLegendX = marginX;
      ctx.save();

      const legendItems = [
        { color: '#0078d7', label: 'يفوق التوقعات دائماً' },
        { color: '#16c60c', label: 'يلبي التوقعات' },
        { color: '#ffff00', label: 'يلبي التوقعات أحياناً' },
        { color: '#e81123', label: 'أقل من المتوقع' },
      ];
      const itemW = kgLegendW / legendItems.length;
      ctx.direction = 'rtl';
      ctx.font = 'bold 16px "Cairo", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';

      legendItems.forEach((item, idx) => {
        const cellRightX = kgLegendX + kgLegendW - idx * itemW;
        const cellLeftX = cellRightX - itemW;
        const circleR = 11;
        const gap = 8;
        const textW = ctx.measureText(item.label).width;
        const groupW = circleR * 2 + gap + textW;
        const groupRightX = cellLeftX + (itemW + groupW) / 2;
        const circleCx = groupRightX - circleR;
        const circleCy = kgLegendY + kgLegendH / 2;

        ctx.beginPath();
        ctx.arc(circleCx, circleCy, circleR, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.fillText(item.label, circleCx - circleR - gap, circleCy);
      });

      if (semester === 'second') {
        const semLegendY = kgLegendY + kgLegendH / 2;
        const sem1Text = 'ف 1 = الفصل الدراسي الأول';
        const sem2Text = 'ف 2 = الفصل الدراسي الثانى';
        ctx.direction = 'rtl';
        ctx.font = 'bold 16px "Cairo", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        const sem2LeftX = kgLegendX + kgLegendW + 28;
        ctx.fillText(sem2Text, sem2LeftX, semLegendY);
        const sem2W = ctx.measureText(sem2Text).width;
        const sem1LeftX = sem2LeftX + sem2W + 36;
        ctx.fillText(sem1Text, sem1LeftX, semLegendY);
      }

      ctx.restore();
    }
    const tableTopY = hasKgColorLegend
      ? kgLegendY + kgLegendH + 8
      : bannerY + bannerH + (isSubjectReport ? 14 : 16);
    const pageItems = pagesData[pageIdx] || [];
    const isLastPage = pageIdx === totalPages - 1;
    const showStatsOnPage =
      reportType === 'calling_list' ||
      reportType === 'secret_numbers' ||
      (isPassFailReport && !isControlSheet && isLastPage);
    const statsTitleRowH = isSubjectReport ? 65 : 63;
    const statsHeaderRowH = isSubjectReport ? 44 : 66;
    const statsValRowH = isSubjectReport ? 46 : 69;
    const statsTableH = statsTitleRowH + statsHeaderRowH + statsValRowH;
    const statsGap = isSubjectReport ? 12 : 27;
    const subjectSecondRowGap = 12;
    const controlSheetSignBarH = 36;
    const controlSheetSignGap = 15;
    const reservedForStats =
      isControlSheet
        ? controlSheetSignBarH + controlSheetSignGap
        : !showStatsOnPage
        ? 0
        : isSubjectReport
        ? statsTableH * 2 + subjectSecondRowGap + statsGap
        : statsTableH + statsGap;
    const footerTopReserve = isPortrait ? 130 : 102;
    const bottomTableMargin = isSubjectReport ? 6 : isControlSheet ? 8 : 14;
    const maxRowH = isBlankControlSheet ? 200 : isNonKgControlSheet ? 160 : isSubjectReport ? 58 : 50;

    // حجم الخطوط فى حقول شيت كنترول رياض الأطفال الفصل الدراسي الثانى = حجم الخطوط فى ملف الفصل الدراسي الأول تماماً (المقياس هو ملف الفصل الدراسي الأول)
    const kgSem2TableFontScale = 1;

    let controlSheetTopH = 112;
    let controlSheetBotH = 34;
    const isNonKgSem1 = isNonKgControlSheet && semester === 'first';

    let nonKgSem1FixedLabelRowH = 55;
    let nonKgSem1FixedMaxRowH = 20;

    if (isControlSheet) {
      if (isNonKgSem1) {
        // Measure largest cell content for Row 1 (sub-headers row) with 25% larger font (15px)
        const subHdrFontPx = 12 * 1.25;
        ctx.font = `bold ${subHdrFontPx}px "Cairo", sans-serif`;
        let maxAttachedSubContentSpan = 0;
        columns.forEach((col) => {
          if (col.splitSubHeaders) {
            col.splitSubHeaders.forEach((sh) => {
              const m = ctx.measureText(sh);
              const w = Math.max(m.width, (m.actualBoundingBoxLeft ?? 0) + (m.actualBoundingBoxRight ?? 0));
              if (w > maxAttachedSubContentSpan) maxAttachedSubContentSpan = w;
            });
          } else if (col.subHeader) {
            // قياس الأجزاء الفرعية الفردية إذا كان النص مجمعاً بعلامة |
            const parts = col.subHeader.includes('|') ? col.subHeader.split('|') : [col.subHeader];
            parts.forEach((p) => {
              const m = ctx.measureText(p.trim());
              const w = Math.max(m.width, (m.actualBoundingBoxLeft ?? 0) + (m.actualBoundingBoxRight ?? 0));
              if (w > maxAttachedSubContentSpan) maxAttachedSubContentSpan = w;
            });
          }
        });
        // زيادة ارتفاع الصف المرفق (صف تقييمات - تحريرى - مجموع) بمقدار 20% (من 66 إلى 80 بكسل)
        const targetSubRowH = Math.max(52, Math.ceil(maxAttachedSubContentSpan + 3));
        const baseSubRowH = Math.min(58, Math.max(52, targetSubRowH));
        nonKgSem1FixedLabelRowH = Math.round(baseSubRowH * 1.2 * 1.2);

        // Measure largest cell content for Row 2 (max grades row) with 25% larger font (15px)
        const maxGradeFontPx = 12 * 1.25;
        ctx.font = `bold ${maxGradeFontPx}px "Cairo", monospace`;
        const m100 = ctx.measureText('100');
        const maxGradeContentH = Math.max(
          maxGradeFontPx,
          (m100.actualBoundingBoxAscent ?? 11) + (m100.actualBoundingBoxDescent ?? 3)
        );
        const baseMaxRowH = Math.max(20, Math.ceil(maxGradeContentH * 1.05 + 2));
        // زيادة ارتفاع الصف المرفق بمقدار 150 % (ليصبح 50 بكسل بدلاً من 20 بكسل)
        nonKgSem1FixedMaxRowH = Math.round(baseMaxRowH * (1 + 1.5));
      }

      let maxSubHeaderSpan = 0;
      let maxFullHeaderSpan = 0;
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      columns.forEach((col) => {
        if (col.subHeader !== undefined) {
          const subjHdrScale = (isNonKgSem1 ? 1.2 : 1.0) * (isControlSheet ? 1.2 : 1.0);
          const baseSubjHdrFont =
            (isNonKgControlSheet ? 16 * subjHdrScale : 19 * 0.8 * 1.25 * 1.2) * kgSem2TableFontScale;
          const subHdrFont = col.key === 'addedTotal' ? baseSubjHdrFont + 2 : baseSubjHdrFont;
          ctx.font = `bold ${subHdrFont}px "Cairo", sans-serif`;
          const m = ctx.measureText(col.header);
          const w = Math.max(
            m.width,
            (m.actualBoundingBoxLeft ?? 0) + (m.actualBoundingBoxRight ?? 0)
          );
          if (w > maxSubHeaderSpan) maxSubHeaderSpan = w;
        } else if (
          col.key !== 'serial' &&
          col.key !== 'name' &&
          !isBlankSepKey(col.key)
        ) {
          const fieldHdrScale = (isNonKgSem1 ? 1.2 : 1.0) * (isControlSheet ? 1.2 : 1.0);
          ctx.font = `bold ${(isNonKgControlSheet ? 16 * fieldHdrScale : 21 * 0.8 * 1.25 * 1.2) * kgSem2TableFontScale}px "Cairo", sans-serif`;
          const m = ctx.measureText(col.header);
          const w = Math.max(
            m.width,
            (m.actualBoundingBoxLeft ?? 0) + (m.actualBoundingBoxRight ?? 0)
          );
          if (w > maxFullHeaderSpan) maxFullHeaderSpan = w;
        }
      });
      const topHeaderPad = isNonKgControlSheet ? 40 : 36;
      controlSheetTopH = Math.max(96, Math.ceil(maxSubHeaderSpan + topHeaderPad));
      if (isNonKgControlSheet) {
        if (semester === 'second') {
          // فى شيت كنترول الفصل الدراسي الثانى لجميع المراحل ما عدا رياض الأطفال:
          // ارتفاع صفوف الجزء السفلي للهيدر محكوم ومثبت بدقة بعد نقل خلية الدرجة الفعلية بجوار التقييمات والتحريري:
          // صف مجموعات الفصلين (ف 1 / ف 2 / الدرجة الفعلية): 30 بكسل ثابت
          // صف تقييمات - تحريرى: 55 بكسل ثابت لضمان عدم تماس النص العمودي مع الحدود بقدر مناسب جداً
          // صفوف الدرجات العظمى: صفان بارتفاع 30 بكسل لكل صف (30 بكسل × 2 = 60 بكسل)
          // المجموع الكلي الثابت = 30 + 55 + 60 = 145 بكسل (توفير 60 بكسل لصالح صفوف الطلاب)
          controlSheetBotH = 145;
          if (maxFullHeaderSpan + topHeaderPad > controlSheetTopH + controlSheetBotH) {
            controlSheetTopH = Math.ceil(maxFullHeaderSpan + topHeaderPad) - controlSheetBotH;
          }
        } else {
          // فى شيت كنترول الفصل الدراسي الأول لجميع المراحل ما عدا رياض الأطفال:
          // تثبيت ارتفاع الصفوف المرفقة لتطابق أكبر محتوى لخلية + 5%
          controlSheetBotH = nonKgSem1FixedLabelRowH + nonKgSem1FixedMaxRowH;
          if (maxFullHeaderSpan + topHeaderPad > controlSheetTopH + controlSheetBotH) {
            controlSheetTopH = Math.ceil(maxFullHeaderSpan + topHeaderPad) - controlSheetBotH;
          }
        }
      } else if (semester === 'second') {
        // فى شيت كنترول رياض الأطفال الفصل الدراسي الثانى:
        // ارتفاع صف أجزاء الفصلين الفرعيين (ف 1 / ف 2) 34 بكسل ليتطابق إجمالي ارتفاع الهيدر والصفوف تماماً مع الفصل الأول
        controlSheetBotH = 34;
        const fullHeaderReqH = Math.ceil(maxFullHeaderSpan + topHeaderPad);
        const subHeaderReqH = Math.ceil(maxSubHeaderSpan + topHeaderPad);
        controlSheetTopH = Math.max(subHeaderReqH, fullHeaderReqH - controlSheetBotH);
      } else {
        controlSheetBotH = 0;
        if (maxFullHeaderSpan + topHeaderPad > controlSheetTopH) {
          controlSheetTopH = Math.ceil(maxFullHeaderSpan + topHeaderPad);
        }
      }
      const standardCommRows =
        isBlankControlSheet || isCustomControlSheet
          ? 20
          : fallbackCommSize >= 1
          ? fallbackCommSize
          : 20;
      if ((isControlSheet || isBlankControlSheet || isCustomControlSheet) && pageItems.length > 0) {
        const totalAvailTableH =
          heightPx - footerTopReserve - bottomTableMargin - reservedForStats - tableTopY;
        const targetHeaderH = controlSheetTopH + controlSheetBotH;
        const availForRows = totalAvailTableH - targetHeaderH;
        const calcRowH = Math.floor(availForRows / standardCommRows);
        const remH = availForRows - calcRowH * standardCommRows;
        if (remH > 0) {
          controlSheetTopH += remH;
        }
      }
    }
    const headerRowH = isSubjectReport
      ? 116
      : isControlSheet
      ? controlSheetTopH + controlSheetBotH
      : 68;
    const maxDataAreaH =
      heightPx -
      footerTopReserve -
      bottomTableMargin -
      reservedForStats -
      (tableTopY + headerRowH);
    const standardCommRows =
      isBlankControlSheet || isCustomControlSheet
        ? 20
        : fallbackCommSize >= 1
        ? fallbackCommSize
        : 20;
    const baseCommRowH = Math.floor(maxDataAreaH / standardCommRows);
    const dataRowH =
      isNonKgControlSheet && pageItems.length > 0
        ? isLastPage && pageItems.length < standardCommRows && !isBlankControlSheet && !isCustomControlSheet
          ? baseCommRowH
          : Math.floor(maxDataAreaH / standardCommRows)
        : pageItems.length > 0
        ? Math.min(maxRowH, Math.max(20, Math.floor(maxDataAreaH / pageItems.length)))
        : maxRowH;
    const rowFontSize =
      dataRowH >= 42 || (isControlSheet && dataRowH >= 36)
        ? 20
        : Math.max(12, Math.floor(dataRowH * 0.52));
    const tableTotalH =
      pageItems.length > 0
        ? headerRowH + pageItems.length * dataRowH
        : headerRowH + dataRowH * 2;
    const tableRadius = 16;

    // Clip table content to rounded corners
    ctx.save();
    drawRoundedRect(ctx, marginX, tableTopY, contentW, tableTotalH, tableRadius);
    ctx.clip();

    // Draw Table Header Background
    const headerGrad = ctx.createLinearGradient(marginX, tableTopY, marginX + contentW, tableTopY);
    headerGrad.addColorStop(0, '#fde2e4');
    headerGrad.addColorStop(0.5, '#e2e8f0');
    headerGrad.addColorStop(1, '#fef3c7');

    ctx.fillStyle = headerGrad;
    ctx.fillRect(marginX, tableTopY, contentW, headerRowH);

    // Draw Header Cells (RTL: from right to left)
    const cellBorderW = isNonKgControlSheet ? 1 : 2;
    const outerTableBorderW = isNonKgControlSheet ? 2 : 3;
    let curRightX = marginX + contentW;
    ctx.font = 'bold 21px "Cairo", sans-serif';
    // توحيد حجم خط الأرقام في صف الهيدر السفلي (الدرجات العظمى للمواد والمجموع)
    let unifiedBotRowNumberFont = isNonKgControlSheet ? (isNonKgSem1 ? 20 : 18) : (isControlSheet ? 18 : 16);
    columns.forEach((col, idx) => {
      if (col.subHeader !== undefined) {
        const colW = colWidths[idx];
        let numText = '';
        if (col.maxGradeText && (!col.subHeader || !col.subHeader.trim())) {
          numText = col.maxGradeText.trim();
        } else if (col.key === 'addedTotal' && col.subHeader && !/[\u0600-\u06FF]/.test(col.subHeader)) {
          numText = col.subHeader.trim();
        }
        if (numText) {
          ctx.font = `bold ${unifiedBotRowNumberFont}px "Cairo", monospace`;
          while (unifiedBotRowNumberFont > 12 && ctx.measureText(numText).width > colW - 8) {
            unifiedBotRowNumberFont -= 0.5;
            ctx.font = `bold ${unifiedBotRowNumberFont}px "Cairo", monospace`;
          }
        }
      }
    });

    columns.forEach((col, cIdx) => {
      const colW = colWidths[cIdx];
      const cellX = curRightX - colW;

      if (isBlankSepKey(col.key)) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cellX, tableTopY, colW, headerRowH);
        curRightX -= colW;
        return;
      }

      if (cIdx < 2) {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(cellX, tableTopY, colW, headerRowH);
      }

      const drawVerticalTopToBottomHeader = (
        text: string,
        cX: number,
        cY: number,
        availVerticalH: number,
        baseFontSize: number,
        minFont: number,
        textColor = '#0f172a'
      ) => {
        ctx.save();
        ctx.translate(cX, cY);
        ctx.rotate(-Math.PI / 2);
        ctx.direction = 'rtl';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let fSize = baseFontSize;
        const vPad = availVerticalH < 75 ? 8 : 18;
        ctx.font = `bold ${fSize}px "Cairo", sans-serif`;
        while (fSize > minFont && ctx.measureText(text).width > availVerticalH - vPad) {
          fSize -= 0.5;
          ctx.font = `bold ${fSize}px "Cairo", sans-serif`;
        }
        const metrics = ctx.measureText(text);
        const asc = metrics.actualBoundingBoxAscent ?? 0;
        const desc = metrics.actualBoundingBoxDescent ?? 0;
        const yOff = asc || desc ? (asc - desc) / 2 : 0;
        const left = metrics.actualBoundingBoxLeft ?? 0;
        const right = metrics.actualBoundingBoxRight ?? 0;
        const xOff = left || right ? (left - right) / 2 : 0;
        ctx.fillText(text, xOff, yOff, availVerticalH - vPad);
        ctx.restore();
      };

      if (col.subHeader !== undefined) {
        const topH = isControlSheet ? controlSheetTopH : Math.floor(headerRowH * 0.58);
        const botH = headerRowH - topH;

        if (isControlSheet && col.key === 'addedTotal') {
          const darkBlackGrad = ctx.createLinearGradient(
            cellX,
            tableTopY,
            cellX,
            tableTopY + topH
          );
          darkBlackGrad.addColorStop(0, '#090d16');
          darkBlackGrad.addColorStop(0.5, '#1e293b');
          darkBlackGrad.addColorStop(1, '#090d16');
          ctx.fillStyle = darkBlackGrad;
          ctx.fillRect(cellX, tableTopY, colW, topH);
        }

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = cellBorderW;
        ctx.strokeRect(cellX, tableTopY, colW, topH);

        if (isControlSheet) {
          const subjHdrScale = (isNonKgSem1 ? 1.2 : 1.0) * 1.2;
          const baseSubjHdrFont =
            (isNonKgControlSheet ? 16 * subjHdrScale : 19 * 0.8 * 1.25 * 1.2) * kgSem2TableFontScale;
          drawVerticalTopToBottomHeader(
            col.header,
            cellX + colW / 2,
            tableTopY + topH / 2,
            topH,
            col.key === 'addedTotal' ? baseSubjHdrFont + 2 : baseSubjHdrFont,
            (isNonKgControlSheet ? 10 * subjHdrScale : 11 * 1.2) * kgSem2TableFontScale,
            col.key === 'addedTotal' ? '#ffffff' : '#0f172a'
          );
        } else {
          ctx.direction = 'rtl';
          ctx.fillStyle = '#0f172a';
          let hFontSize = 19;
          ctx.font = `bold ${hFontSize}px "Cairo", sans-serif`;
          while (hFontSize > 11 && ctx.measureText(col.header).width > colW - 8) {
            hFontSize -= 0.5;
            ctx.font = `bold ${hFontSize}px "Cairo", sans-serif`;
          }
          drawCenteredText(ctx, col.header, cellX + colW / 2, tableTopY + topH / 2, colW - 6);
        }

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(cellX, tableTopY + topH, colW, botH);

        const isNonKgSem2 = isNonKgControlSheet && semester === 'second';
        const subLabelExtraPad = isNonKgControlSheet ? (semester === 'second' ? 46 : 16) : 0;
        if (col.splitSubHeaders) {
          const nSub = col.splitSubHeaders.length;
          const baseSubW = Math.floor(colW / nSub);
          const hasMaxRow = Boolean(col.splitMaxGrades);
          const hasSemGroups = Boolean(col.splitSemGroups && col.splitSemGroups.some(Boolean));

          let semGroupRowH = 0;
          let labelRowH = botH;
          let maxRowH = 0;

          if (isNonKgSem2) {
            semGroupRowH = hasSemGroups ? 30 : 0;
            // الحفاظ على صف («تقييمات - تحريرى») بارتفاع ثابت 55px لضمان عدم تماس النص العمودي مع الحدود بقدر مناسب جداً
            const nonKgSem2SubBoxH = 55;
            labelRowH = semGroupRowH + nonKgSem2SubBoxH;
            // توحيد ارتفاع صفوف الدرجات العظمى ليكون 30 بكسل لكل صف (30 بكسل × 2 = 60 بكسل)
            maxRowH = 60;
          } else if (isNonKgSem1) {
            // تثبيت ارتفاع الصفوف المرفقة لتطابق اكبر محتوى لخلية + 5 %
            maxRowH = hasMaxRow ? nonKgSem1FixedMaxRowH : 0;
            labelRowH = hasMaxRow ? nonKgSem1FixedLabelRowH : botH;
            semGroupRowH = 0;
          } else {
            maxRowH = hasMaxRow ? Math.floor((botH - subLabelExtraPad) * 0.5) : 0;
            labelRowH = hasMaxRow ? botH - maxRowH : botH;
            semGroupRowH = hasSemGroups
              ? Math.round(Math.min(26, Math.max(20, Math.floor(labelRowH * 0.28))) * 1.25)
              : 0;
          }
          let subBoxes: {
            text: string;
            semGroup: string;
            maxText: string;
            x: number;
            w: number;
          }[] = [];

          if (col.splitBothSemTotalMax && col.splitMaxGrades && col.splitMaxGrades.length === 4) {
            const mAssess = parseFloat(col.splitMaxGrades[0]) || 30;
            const mWritten = parseFloat(col.splitMaxGrades[1]) || 70;
            const mTotal = mAssess + mWritten;
            const halfW = Math.floor(colW / 2);
            const remW = colW - halfW;
            const wA1 = Math.max(Math.floor(halfW * 0.35), Math.min(Math.floor(halfW * 0.5), Math.round(halfW * (mAssess / (mTotal || 100)))));
            const wW1 = halfW - wA1;
            const wA2 = Math.max(Math.floor(remW * 0.35), Math.min(Math.floor(remW * 0.5), Math.round(remW * (mAssess / (mTotal || 100)))));
            const wW2 = remW - wA2;

            subBoxes = [
              { text: col.splitSubHeaders[0], semGroup: col.splitSemGroups?.[0] || '', maxText: col.splitMaxGrades[0], x: cellX + colW - wA1, w: wA1 },
              { text: col.splitSubHeaders[1], semGroup: col.splitSemGroups?.[1] || '', maxText: col.splitMaxGrades[1], x: cellX + colW - halfW, w: wW1 },
              { text: col.splitSubHeaders[2], semGroup: col.splitSemGroups?.[2] || '', maxText: col.splitMaxGrades[2], x: cellX + remW - wA2, w: wA2 },
              { text: col.splitSubHeaders[3], semGroup: col.splitSemGroups?.[3] || '', maxText: col.splitMaxGrades[3], x: cellX, w: wW2 },
            ];
          } else if ((col.splitSemTotalKeys || col.key === 'subj_custom_new_added' || col.key === 'subj_custom_new_non_added') && nSub === 5) {
            const actualW = Math.max(32, Math.floor(colW * 0.24));
            const fourPartsW = colW - actualW;
            const bW = Math.floor(fourPartsW / 4);
            let curSubRightX = cellX + colW;
            subBoxes = col.splitSubHeaders.map((text, idx) => {
              const w =
                idx === 4
                  ? curSubRightX - cellX
                  : idx === 3
                  ? curSubRightX - (cellX + actualW)
                  : bW;
              const x = curSubRightX - w;
              curSubRightX -= w;
              return {
                text,
                semGroup: col.splitSemGroups?.[idx] || '',
                maxText: col.splitMaxGrades?.[idx] || '',
                x,
                w,
              };
            });
          } else {
            let curSubRightX = cellX + colW;
            subBoxes = col.splitSubHeaders.map((text, idx) => {
              const w = idx === nSub - 1 ? curSubRightX - cellX : baseSubW;
              const x = curSubRightX - w;
              curSubRightX -= w;
              return {
                text,
                semGroup: col.splitSemGroups?.[idx] || '',
                maxText: col.splitMaxGrades?.[idx] || '',
                x,
                w,
              };
            });
          }

          if (hasSemGroups) {
            let gIdx = 0;
            while (gIdx < subBoxes.length) {
              const gName = subBoxes[gIdx].semGroup;
              const boxesInThisGroup = subBoxes.filter((b) => b.semGroup === gName);
              // إذا كان الفصل يضم خانة واحدة فقط (مثل منازل حيث ف 1 تضم خانة ف 1 فقط وف 2 تضم خانة ف 2 فقط) أو الدرجة الفعلية: يتم دمج الخلية رأسياً على كامل ارتفاع الهيدر
              if (!gName || gName === 'الدرجة الفعلية' || boxesInThisGroup.length === 1) {
                gIdx++;
                continue;
              }
              let endIdx = gIdx;
              while (
                endIdx + 1 < subBoxes.length &&
                subBoxes[endIdx + 1].semGroup === gName
              ) {
                endIdx++;
              }
              const groupRightX = subBoxes[gIdx].x + subBoxes[gIdx].w;
              const groupLeftX = subBoxes[endIdx].x;
              const groupW = groupRightX - groupLeftX;

              ctx.strokeStyle = '#0f172a';
              ctx.lineWidth = cellBorderW;
              ctx.strokeRect(groupLeftX, tableTopY + topH, groupW, semGroupRowH);

              ctx.direction = 'rtl';
              ctx.fillStyle = '#0f172a';
              let gFont = 12.5 * 0.9 * (isControlSheet ? 1.2 : 1.0);
              ctx.font = `bold ${gFont}px "Cairo", sans-serif`;
              while (gFont > 9.5 * 0.9 * (isControlSheet ? 1.2 : 1.0) && ctx.measureText(gName).width > groupW - 6) {
                gFont -= 0.5;
                ctx.font = `bold ${gFont}px "Cairo", sans-serif`;
              }
              drawCenteredText(
                ctx,
                gName,
                groupLeftX + groupW / 2,
                tableTopY + topH + semGroupRowH / 2,
                groupW - 4
              );

              gIdx = endIdx + 1;
            }
          }

          subBoxes.forEach((sb, sbIdx) => {
            const boxesInSbGroup = subBoxes.filter((b) => b.semGroup === sb.semGroup);
            const isSingleSub = boxesInSbGroup.length === 1;
            const isActualGradeCol =
              sb.semGroup === 'الدرجة الفعلية' ||
              sb.text === 'الدرجة الفعلية' ||
              sb.text === 'درجة فعلية';
            const isMergedSubBox = isActualGradeCol || isSingleSub;
            const subBoxTopY = isMergedSubBox
              ? tableTopY + topH
              : hasSemGroups && sb.semGroup
              ? tableTopY + topH + semGroupRowH
              : tableTopY + topH;
            const subBoxH = isMergedSubBox
              ? labelRowH
              : hasSemGroups && sb.semGroup
              ? labelRowH - semGroupRowH
              : labelRowH;

            if (hasSemGroups && !sb.semGroup) {
              ctx.fillStyle = '#cbd5e1';
              ctx.fillRect(sb.x, subBoxTopY, sb.w, subBoxH);
            }

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = cellBorderW;
            ctx.strokeRect(sb.x, subBoxTopY, sb.w, subBoxH);
            const displayText = isActualGradeCol ? 'الدرجة الفعلية' : sb.text;
            if (isNonKgControlSheet) {
              const subHdrScale = (semester === 'second' ? 0.9 : isNonKgSem1 ? 1.25 : 1) * 1.2;
              drawVerticalTopToBottomHeader(
                displayText,
                sb.x + sb.w / 2,
                subBoxTopY + subBoxH / 2,
                subBoxH,
                12 * subHdrScale,
                9.5 * subHdrScale
              );
            } else {
              ctx.direction = 'rtl';
              ctx.fillStyle = '#0f172a';
              let subFontSize = 15 * kgSem2TableFontScale * (isControlSheet ? 1.2 : 1.0);
              ctx.font = `bold ${subFontSize}px "Cairo", sans-serif`;
              while (
                subFontSize > 9.5 * kgSem2TableFontScale * (isControlSheet ? 1.2 : 1.0) &&
                ctx.measureText(displayText).width > sb.w - 4
              ) {
                subFontSize -= 0.5;
                ctx.font = `bold ${subFontSize}px "Cairo", sans-serif`;
              }
              drawCenteredText(
                ctx,
                displayText,
                sb.x + sb.w / 2,
                subBoxTopY + subBoxH / 2,
                sb.w - 4
              );
            }

            if (hasMaxRow) {
              if (col.splitBothSemTotalMax) {
                const numMaxRows = col.splitActualMaxGrade ? 4 : 3;
                let r1H = Math.floor(maxRowH / numMaxRows);
                let r2H = r1H;
                let r3H = numMaxRows === 3 ? maxRowH - r1H - r2H : r1H;
                let r4H = numMaxRows === 4 ? maxRowH - r1H - r2H - r3H : 0;

                if (isNonKgSem2) {
                  // توحيد ارتفاع صفوف الدرجات العظمى ليكون 30 بكسل لكل صف (120 بكسل للمستويات الأربعة)
                  r1H = 30;
                  r2H = 30;
                  r3H = 30;
                  r4H = 30;
                }

                // Count how many subBoxes belong to this semGroup
                const boxesInGroup = subBoxes.filter((b) => b.semGroup === sb.semGroup);
                const isSingleSubInGroup = boxesInGroup.length === 1;

                if (isSingleSubInGroup) {
                  // دمج الخليتين (المستوى الأول + المستوى الثاني) للمواد التي بها خانة واحدة فقط تحت الفصل (مثل التقييمات فقط)
                  const mergedH = r1H + r2H;
                  ctx.strokeStyle = '#0f172a';
                  ctx.lineWidth = cellBorderW;
                  ctx.strokeRect(sb.x, tableTopY + topH + labelRowH, sb.w, mergedH);
                  ctx.direction = 'ltr';
                  ctx.fillStyle = '#1d4ed8';
                  const dispText = sb.maxText || col.splitSemTotalMax || '';
                  let maxFont = (isNonKgSem2 ? 14 : Math.min(13, Math.max(9.5, Math.floor(mergedH * 0.45)))) * (isControlSheet ? 1.2 : 1.0);
                  ctx.font = `bold ${maxFont}px "Cairo", monospace`;
                  while (maxFont > 8.5 && ctx.measureText(dispText).width > sb.w - 4) {
                    maxFont -= 0.5;
                    ctx.font = `bold ${maxFont}px "Cairo", monospace`;
                  }
                  drawCenteredText(
                    ctx,
                    dispText,
                    sb.x + sb.w / 2,
                    tableTopY + topH + labelRowH + mergedH / 2,
                    sb.w - 4
                  );
                } else {
                  // Level 1: Draw max grades for each sub-box (e.g. 30, 70, 30, 70)
                  ctx.strokeStyle = '#0f172a';
                  ctx.lineWidth = cellBorderW;
                  ctx.strokeRect(sb.x, tableTopY + topH + labelRowH, sb.w, r1H);
                  ctx.direction = 'ltr';
                  ctx.fillStyle = '#1d4ed8';
                  let maxFont = (isNonKgSem2 ? 13 : Math.min(11.5, Math.max(9.5, Math.floor(r1H * 0.62)))) * (isControlSheet ? 1.2 : 1.0);
                  ctx.font = `bold ${maxFont}px "Cairo", monospace`;
                  while (maxFont > 8.5 && ctx.measureText(sb.maxText).width > sb.w - 4) {
                    maxFont -= 0.5;
                    ctx.font = `bold ${maxFont}px "Cairo", monospace`;
                  }
                  drawCenteredText(
                    ctx,
                    sb.maxText,
                    sb.x + sb.w / 2,
                    tableTopY + topH + labelRowH + r1H / 2,
                    sb.w - 4
                  );

                  // Level 2: Sem totals (100 for Sem 1, 100 for Sem 2)
                  const isLastInGroup =
                    sbIdx + 1 >= subBoxes.length || subBoxes[sbIdx + 1].semGroup !== sb.semGroup;
                  if (isLastInGroup && col.splitSemTotalMax) {
                    let firstInGroup = sbIdx;
                    while (
                      firstInGroup > 0 &&
                      subBoxes[firstInGroup - 1].semGroup === sb.semGroup
                    ) {
                      firstInGroup--;
                    }
                    const gRightX = subBoxes[firstInGroup].x + subBoxes[firstInGroup].w;
                    const gLeftX = sb.x;
                    const gW = gRightX - gLeftX;
                    const r2Y = tableTopY + topH + labelRowH + r1H;

                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = cellBorderW;
                    ctx.strokeRect(gLeftX, r2Y, gW, r2H);
                    ctx.direction = 'ltr';
                    ctx.fillStyle = '#1d4ed8';
                    let totMaxFont = (isNonKgSem2 ? 13.5 : Math.min(12, Math.max(9.5, Math.floor(r2H * 0.62)))) * (isControlSheet ? 1.2 : 1.0);
                    ctx.font = `bold ${totMaxFont}px "Cairo", monospace`;
                    while (
                      totMaxFont > 8.5 &&
                      ctx.measureText(col.splitSemTotalMax).width > gW - 6
                    ) {
                      totMaxFont -= 0.5;
                      ctx.font = `bold ${totMaxFont}px "Cairo", monospace`;
                    }
                    drawCenteredText(
                      ctx,
                      col.splitSemTotalMax,
                      gLeftX + gW / 2,
                      r2Y + r2H / 2,
                      gW - 4
                    );
                  }
                }

                // Level 3 & Level 4: Drawn once by the last sub-box of the subject column
                if (sbIdx === subBoxes.length - 1) {
                  // Level 3: Total of both semesters (200 in Screenshot_6.jpg)
                  const r3Y = tableTopY + topH + labelRowH + r1H + r2H;
                  ctx.strokeStyle = '#0f172a';
                  ctx.lineWidth = cellBorderW;
                  ctx.strokeRect(cellX, r3Y, colW, r3H);
                  ctx.direction = 'ltr';
                  ctx.fillStyle = '#1d4ed8';
                  let bothSemFont = (isNonKgSem2 ? 14 : Math.min(12.5, Math.max(9.5, Math.floor(r3H * 0.65)))) * (isControlSheet ? 1.2 : 1.0);
                  ctx.font = `bold ${bothSemFont}px "Cairo", monospace`;
                  while (
                    bothSemFont > 8.5 &&
                    ctx.measureText(col.splitBothSemTotalMax).width > colW - 6
                  ) {
                    bothSemFont -= 0.5;
                    ctx.font = `bold ${bothSemFont}px "Cairo", monospace`;
                  }
                  drawCenteredText(
                    ctx,
                    col.splitBothSemTotalMax,
                    cellX + colW / 2,
                    r3Y + r3H / 2,
                    colW - 4
                  );

                  // Level 4: Actual Grade if defined, or placeholder in nonKgSem2 for alignment
                  const r4Y = tableTopY + topH + labelRowH + r1H + r2H + r3H;
                  if (col.splitActualMaxGrade && r4H > 0) {
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = cellBorderW;
                    ctx.strokeRect(cellX, r4Y, colW, r4H);
                    ctx.direction = 'ltr';
                    ctx.fillStyle = '#1d4ed8';
                    let actFont = (isNonKgSem2 ? 14 * 1.25 : Math.min(12.5, Math.max(9.5, Math.floor(r4H * 0.65)))) * (isControlSheet ? 1.2 : 1.0);
                    ctx.font = `bold ${actFont}px "Cairo", monospace`;
                    while (
                      actFont > (isNonKgSem2 ? 10.5 : 8.5) &&
                      ctx.measureText(col.splitActualMaxGrade).width > colW - 6
                    ) {
                      actFont -= 0.5;
                      ctx.font = `bold ${actFont}px "Cairo", monospace`;
                    }
                    drawCenteredText(
                      ctx,
                      col.splitActualMaxGrade,
                      cellX + colW / 2,
                      r4Y + r4H / 2,
                      colW - 4
                    );
                  } else if (isNonKgSem2 && r4H > 0) {
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = cellBorderW;
                    ctx.strokeRect(cellX, r4Y, colW, r4H);
                    ctx.direction = 'ltr';
                    ctx.fillStyle = '#64748b';
                    ctx.font = `bold ${(13 * 1.25 * (isControlSheet ? 1.2 : 1.0))}px "Cairo", monospace`;
                    drawCenteredText(
                      ctx,
                      '-',
                      cellX + colW / 2,
                      r4Y + r4H / 2,
                      colW - 4
                    );
                  }
                }
              } else if (col.splitSemTotalMax !== undefined && sb.semGroup && sb.semGroup !== 'الدرجة الفعلية') {
                const boxesInGroup = subBoxes.filter((b) => b.semGroup === sb.semGroup);
                if (boxesInGroup.length > 1) {
                  const maxTopH = Math.floor(maxRowH / 2);
                  const maxBotH = maxRowH - maxTopH;

                  ctx.strokeStyle = '#0f172a';
                  ctx.lineWidth = cellBorderW;
                  ctx.strokeRect(sb.x, tableTopY + topH + labelRowH, sb.w, maxTopH);
                  if (sb.maxText) {
                    ctx.direction = 'ltr';
                    ctx.fillStyle = '#1d4ed8';
                    let maxFont = Math.min(11.5, Math.max(9.5, Math.floor(maxTopH * 0.62))) * (isControlSheet ? 1.2 : 1.0);
                    ctx.font = `bold ${maxFont}px "Cairo", monospace`;
                    while (maxFont > 8.5 && ctx.measureText(sb.maxText).width > sb.w - 4) {
                      maxFont -= 0.5;
                      ctx.font = `bold ${maxFont}px "Cairo", monospace`;
                    }
                    drawCenteredText(
                      ctx,
                      sb.maxText,
                      sb.x + sb.w / 2,
                      tableTopY + topH + labelRowH + maxTopH / 2,
                      sb.w - 4
                    );
                  }

                  const isLastInGroup =
                    sbIdx + 1 >= subBoxes.length || subBoxes[sbIdx + 1].semGroup !== sb.semGroup;
                  if (isLastInGroup) {
                    let firstInGroup = sbIdx;
                    while (
                      firstInGroup > 0 &&
                      subBoxes[firstInGroup - 1].semGroup === sb.semGroup
                    ) {
                      firstInGroup--;
                    }
                    const gRightX = subBoxes[firstInGroup].x + subBoxes[firstInGroup].w;
                    const gLeftX = sb.x;
                    const gW = gRightX - gLeftX;
                    const botBoxY = tableTopY + topH + labelRowH + maxTopH;

                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = cellBorderW;
                    ctx.strokeRect(gLeftX, botBoxY, gW, maxBotH);
                    if (col.splitSemTotalMax) {
                      ctx.direction = 'ltr';
                      ctx.fillStyle = '#1d4ed8';
                      let totMaxFont = Math.min(12, Math.max(9.5, Math.floor(maxBotH * 0.62))) * (isControlSheet ? 1.2 : 1.0);
                      ctx.font = `bold ${totMaxFont}px "Cairo", monospace`;
                      while (
                        totMaxFont > 8.5 &&
                        ctx.measureText(col.splitSemTotalMax).width > gW - 6
                      ) {
                        totMaxFont -= 0.5;
                        ctx.font = `bold ${totMaxFont}px "Cairo", monospace`;
                      }
                      drawCenteredText(
                        ctx,
                        col.splitSemTotalMax,
                        gLeftX + gW / 2,
                        botBoxY + maxBotH / 2,
                        gW - 4
                      );
                    }
                  }
                } else {
                  ctx.strokeStyle = '#0f172a';
                  ctx.lineWidth = cellBorderW;
                  ctx.strokeRect(sb.x, tableTopY + topH + labelRowH, sb.w, maxRowH);
                  if (sb.maxText) {
                    ctx.direction = 'ltr';
                    ctx.fillStyle = '#1d4ed8';
                    let maxFont = Math.min(13, Math.max(9.5, Math.floor(maxRowH * 0.45))) * (isControlSheet ? 1.2 : 1.0);
                    ctx.font = `bold ${maxFont}px "Cairo", monospace`;
                    while (maxFont > 8.5 && ctx.measureText(sb.maxText).width > sb.w - 4) {
                      maxFont -= 0.5;
                      ctx.font = `bold ${maxFont}px "Cairo", monospace`;
                    }
                    drawCenteredText(
                      ctx,
                      sb.maxText,
                      sb.x + sb.w / 2,
                      tableTopY + topH + labelRowH + maxRowH / 2,
                      sb.w - 4
                    );
                  }
                }
              } else {
                if (hasSemGroups && !sb.semGroup) {
                  ctx.fillStyle = '#cbd5e1';
                  ctx.fillRect(sb.x, tableTopY + topH + labelRowH, sb.w, maxRowH);
                }
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = cellBorderW;
                ctx.strokeRect(sb.x, tableTopY + topH + labelRowH, sb.w, maxRowH);
                ctx.direction = 'ltr';
                ctx.fillStyle = '#1d4ed8';
                const isActualOrTotal = sb.semGroup === 'الدرجة الفعلية' || sbIdx === nSub - 1;
                const maxGradeScale = isNonKgSem1 ? 1.25 : 1.0;
                let maxFont = (isNonKgControlSheet
                  ? isActualOrTotal
                    ? 12.5 * maxGradeScale
                    : 12 * maxGradeScale
                  : 16) * (isControlSheet ? 1.2 : 1.0);
                ctx.font = `bold ${maxFont}px "Cairo", monospace`;
                if (!isActualOrTotal) {
                  while (maxFont > (isNonKgSem1 ? 11 : 10) && ctx.measureText(sb.maxText).width > sb.w - 6) {
                    maxFont -= 0.5;
                    ctx.font = `bold ${maxFont}px "Cairo", monospace`;
                  }
                }
                drawCenteredText(
                  ctx,
                  sb.maxText,
                  sb.x + sb.w / 2,
                  tableTopY + topH + labelRowH + maxRowH / 2,
                  sb.w - 4
                );
              }
            }
          });
        } else if (col.maxGradeText) {
          const hasSubLabel = Boolean(col.subHeader && col.subHeader.trim() !== '');
          if (!hasSubLabel) {
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = cellBorderW;
            ctx.strokeRect(cellX, tableTopY + topH, colW, botH);
            if (col.maxGradeText && col.maxGradeText.trim()) {
              ctx.direction = 'ltr';
              ctx.fillStyle = '#1d4ed8';
              ctx.font = `bold ${unifiedBotRowNumberFont}px "Cairo", monospace`;
              drawCenteredText(
                ctx,
                col.maxGradeText,
                cellX + colW / 2,
                tableTopY + topH + botH / 2,
                colW - 4
              );
            }
          } else {
            const maxRowH = isNonKgSem2
              ? Math.max(0, botH - 85)
              : isNonKgSem1
              ? nonKgSem1FixedMaxRowH
              : Math.floor((botH - subLabelExtraPad) * 0.5);
            const labelRowH = isNonKgSem1 ? nonKgSem1FixedLabelRowH : botH - maxRowH;

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = cellBorderW;
            ctx.strokeRect(cellX, tableTopY + topH, colW, labelRowH);
            if (isNonKgControlSheet) {
              const subHdrScale = (isNonKgSem1 ? 1.25 : 1) * 1.2;
              drawVerticalTopToBottomHeader(
                col.subHeader,
                cellX + colW / 2,
                tableTopY + topH + labelRowH / 2,
                labelRowH,
                12 * subHdrScale,
                9.5 * subHdrScale
              );
            } else {
              ctx.direction = 'rtl';
              ctx.fillStyle = '#0f172a';
              let subFontSize = 15 * kgSem2TableFontScale * (isControlSheet ? 1.2 : 1.0);
              ctx.font = `bold ${subFontSize}px "Cairo", sans-serif`;
              while (
                subFontSize > 9.5 * kgSem2TableFontScale * (isControlSheet ? 1.2 : 1.0) &&
                ctx.measureText(col.subHeader).width > colW - 6
              ) {
                subFontSize -= 0.5;
                ctx.font = `bold ${subFontSize}px "Cairo", sans-serif`;
              }
              drawCenteredText(
                ctx,
                col.subHeader,
                cellX + colW / 2,
                tableTopY + topH + labelRowH / 2,
                colW - 4
              );
            }

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = cellBorderW;
            ctx.strokeRect(cellX, tableTopY + topH + labelRowH, colW, maxRowH);
            ctx.direction = 'ltr';
            ctx.fillStyle = '#1d4ed8';
            let maxFont = (isNonKgControlSheet ? 12 * 1.2 * (isNonKgSem1 ? 1.25 : 1) : 16) * (isControlSheet ? 1.2 : 1.0);
            ctx.font = `bold ${maxFont}px "Cairo", monospace`;
            while (maxFont > (isNonKgSem1 ? 11 : 10) && ctx.measureText(col.maxGradeText).width > colW - 6) {
              maxFont -= 0.5;
              ctx.font = `bold ${maxFont}px "Cairo", monospace`;
            }
            drawCenteredText(
              ctx,
              col.maxGradeText,
              cellX + colW / 2,
              tableTopY + topH + labelRowH + maxRowH / 2,
              colW - 4
            );
          }
        } else {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = cellBorderW;
          ctx.strokeRect(cellX, tableTopY + topH, colW, botH);

          if (col.subHeader) {
            const isArabicSub = /[\u0600-\u06FF]/.test(col.subHeader);
            ctx.direction = isArabicSub ? 'rtl' : 'ltr';
            ctx.fillStyle = isArabicSub ? '#0f172a' : '#1d4ed8';
            const isNumericSub = !isArabicSub && (col.key === 'addedTotal' || !isNaN(Number(col.subHeader)));
            const subFontFam = isArabicSub ? '"Cairo", sans-serif' : '"Cairo", monospace';
            let subFontSize = isNumericSub
              ? unifiedBotRowNumberFont
              : isNonKgControlSheet
              ? (col.key === 'addedTotal' ? 12 * 1.2 : 12) * 1.2
              : (isArabicSub
                  ? 15
                  : isControlSheet
                  ? 18 * 0.8 * 1.25 * 1.2
                  : 18) * kgSem2TableFontScale;
            const minSubHFont =
              (isArabicSub ? 9.5 : isControlSheet ? 11 * 1.2 : 11) *
              kgSem2TableFontScale;
            ctx.font = `bold ${subFontSize}px ${subFontFam}`;
            if (!isNumericSub) {
              while (subFontSize > minSubHFont && ctx.measureText(col.subHeader).width > colW - 8) {
                subFontSize -= 0.5;
                ctx.font = `bold ${subFontSize}px ${subFontFam}`;
              }
            }
            drawCenteredText(
              ctx,
              col.subHeader,
              cellX + colW / 2,
              tableTopY + topH + botH / 2,
              colW - 6
            );
          }
        }
      } else {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = cellBorderW;
        ctx.strokeRect(cellX, tableTopY, colW, headerRowH);

        if (
          isControlSheet &&
          col.key !== 'serial' &&
          col.key !== 'name'
        ) {
          const fieldHdrScale = (isNonKgSem1 ? 1.2 : 1.0) * 1.2;
          drawVerticalTopToBottomHeader(
            col.header,
            cellX + colW / 2,
            tableTopY + headerRowH / 2,
            headerRowH,
            (isNonKgControlSheet ? 16 * fieldHdrScale : 21 * 0.8 * 1.25 * 1.2) * kgSem2TableFontScale,
            (isNonKgControlSheet ? 10 * fieldHdrScale : 11 * 1.2) * kgSem2TableFontScale
          );
        } else {
          ctx.direction = 'rtl';
          ctx.fillStyle = '#0f172a';
          const isCompactControlCol =
            isControlSheet &&
            (col.key === 'nationalId' ||
              col.key === 'gender' ||
              col.key === 'enrollmentStatus' ||
              col.key === 'religion');
          const hFontScale = isCompactControlCol
            ? 0.6 * 1.25 * 1.2
            : isControlSheet
            ? 0.8 * 1.25 * 1.2
            : 1;
          const nameSerialScale = (isNonKgSem1 ? 1.2 : 1.0) * (isControlSheet ? 1.2 : 1.0);
          let hFontSize = isNonKgControlSheet
            ? col.key === 'name'
              ? 16 * 1.2 * nameSerialScale
              : 16 * nameSerialScale
            : (isKindergartenStage && isSubjectReport ? 25 : 21) * hFontScale * kgSem2TableFontScale;
          const minHFont =
            (isNonKgControlSheet
              ? 10 * nameSerialScale
              : isCompactControlCol
              ? 11 * 1.2
              : isControlSheet
              ? 11.5 * 1.2
              : 11) * kgSem2TableFontScale;
          ctx.font = `bold ${hFontSize}px "Cairo", sans-serif`;
          if (isKindergartenStage && col.header.includes('برامج علاجية')) {
            hFontSize = 21 * kgSem2TableFontScale;
          } else {
            while (
              hFontSize > minHFont &&
              ctx.measureText(col.header).width > colW - (isCompactControlCol ? 6 : 10)
            ) {
              hFontSize -= 0.5;
              ctx.font = `bold ${hFontSize}px "Cairo", sans-serif`;
            }
          }
          drawCenteredText(
            ctx,
            col.header,
            cellX + colW / 2,
            tableTopY + headerRowH / 2,
            colW - (isCompactControlCol ? 4 : 8)
          );
        }
      }

      curRightX -= colW;
    });

    // Draw Student Rows for this page
    if (pageItems.length === 0) {
      const emptyY = tableTopY + headerRowH;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(marginX, emptyY, contentW, dataRowH * 2);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = cellBorderW;
      ctx.strokeRect(marginX, emptyY, contentW, dataRowH * 2);
      ctx.direction = 'rtl';
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 22px "Cairo", sans-serif';
      drawCenteredText(ctx, 'لا يوجد', marginX + contentW / 2, emptyY + dataRowH);
    } else {
      pageItems.forEach((item, rIdx) => {
        const { student, globalIdx, committeeNumText } = item;
        const rowY = tableTopY + headerRowH + rIdx * dataRowH;

        // Alternating row background matching attachments (even: pure white, odd: attachment color lightened 25% with white)
        const { evenBg, oddBg } = getReportRowBgColors(reportType, isControlSheet, rowTheme);
        const isOddRow = rIdx % 2 !== 0;
        const isDarkRow = isOddRow && (oddBg === '#000000' || oddBg === '#dc2626' || rowTheme === 'theme_black' || rowTheme === 'theme_red');
        ctx.fillStyle = isOddRow ? oddBg : evenBg;
        ctx.fillRect(marginX, rowY, contentW, dataRowH);

        if (isBlankControlSheet) {
          let blankCellRightX = marginX + contentW;
          columns.forEach((col, cIdx) => {
            const colW = colWidths[cIdx];
            const cellX = blankCellRightX - colW;

            if (isBlankSepKey(col.key)) {
              ctx.fillStyle = isDarkRow ? '#000000' : '#ffffff';
              ctx.fillRect(cellX, rowY, colW, dataRowH);
              blankCellRightX -= colW;
              return;
            }

            if (col.key === 'addedTotal') {
              ctx.fillStyle = isDarkRow ? '#18181b' : '#e2e8f0';
              ctx.fillRect(cellX, rowY, colW, dataRowH);
            }

            if (isKindergartenStage && col.key === 'finalResult') {
              ctx.fillStyle = isDarkRow ? '#000000' : '#ffffff';
              ctx.fillRect(cellX, rowY, colW, dataRowH);
            }

            if (col.splitKeys) {
              const nSub = col.splitKeys.length;
              let blankParts: { k: string; x: number; w: number }[] = [];

              if (col.splitBothSemTotalMax && nSub === 4 && col.splitMaxGrades && col.splitMaxGrades.length === 4) {
                const mAssess = parseFloat(col.splitMaxGrades[0]) || 30;
                const mWritten = parseFloat(col.splitMaxGrades[1]) || 70;
                const mTotal = mAssess + mWritten;
                const halfW = Math.floor(colW / 2);
                const remW = colW - halfW;
                const wA1 = Math.max(Math.floor(halfW * 0.35), Math.min(Math.floor(halfW * 0.5), Math.round(halfW * (mAssess / (mTotal || 100)))));
                const wW1 = halfW - wA1;
                const wA2 = Math.max(Math.floor(remW * 0.35), Math.min(Math.floor(remW * 0.5), Math.round(remW * (mAssess / (mTotal || 100)))));
                const wW2 = remW - wA2;

                blankParts = [
                  { k: col.splitKeys[0], x: cellX + colW - wA1, w: wA1 },
                  { k: col.splitKeys[1], x: cellX + colW - halfW, w: wW1 },
                  { k: col.splitKeys[2], x: cellX + remW - wA2, w: wA2 },
                  { k: col.splitKeys[3], x: cellX, w: wW2 },
                ];
              } else {
                const baseSubW = Math.floor(colW / nSub);
                let curSubRightX = cellX + colW;
                blankParts = col.splitKeys.map((k, idx) => {
                  const w = idx === nSub - 1 ? curSubRightX - cellX : baseSubW;
                  const x = curSubRightX - w;
                  curSubRightX -= w;
                  return { k, x, w };
                });
              }

              if (col.splitBothSemTotalMax) {
                const numLevels = col.splitActualMaxGrade ? 4 : 3;
                const lvH = Math.floor(dataRowH / numLevels);
                const lv1H = lvH;
                const lv2H = lvH;
                const lv3H = numLevels === 3 ? dataRowH - lv1H - lv2H : lvH;
                const lv4H = numLevels === 4 ? dataRowH - lv1H - lv2H - lv3H : 0;

                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = cellBorderW;

                if (nSub === 2) {
                  // دمج الخليتين لـ nSub === 2
                  blankParts.forEach((bp) => {
                    ctx.strokeRect(bp.x, rowY, bp.w, lv1H + lv2H);
                  });
                } else {
                  // Level 1: sub-boxes
                  blankParts.forEach((bp) => {
                    ctx.strokeRect(bp.x, rowY, bp.w, lv1H);
                  });

                  // Level 2: sem totals
                  if (nSub === 4) {
                    ctx.strokeRect(blankParts[1].x, rowY + lv1H, blankParts[0].w + blankParts[1].w, lv2H);
                    ctx.strokeRect(blankParts[3].x, rowY + lv1H, blankParts[2].w + blankParts[3].w, lv2H);
                  } else {
                    ctx.strokeRect(cellX, rowY + lv1H, colW, lv2H);
                  }
                }

                // Level 3: total of both semesters
                ctx.strokeRect(cellX, rowY + lv1H + lv2H, colW, lv3H);

                // Level 4: actual grade if defined
                if (numLevels === 4 && lv4H > 0) {
                  ctx.strokeRect(cellX, rowY + lv1H + lv2H + lv3H, colW, lv4H);
                }
              } else if (col.splitSemTotalKeys && nSub === 5) {
                const topHalfH = Math.floor(dataRowH / 2);
                const botHalfH = dataRowH - topHalfH;
                blankParts.forEach((bp, idx) => {
                  if (idx < 4) {
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = cellBorderW;
                    ctx.strokeRect(bp.x, rowY, bp.w, topHalfH);
                  } else {
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillRect(bp.x, rowY, bp.w, dataRowH);
                    ctx.strokeStyle = '#0f172a';
                    ctx.lineWidth = cellBorderW;
                    ctx.strokeRect(bp.x, rowY, bp.w, dataRowH);
                  }
                });
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = cellBorderW;
                ctx.strokeRect(
                  blankParts[1].x,
                  rowY + topHalfH,
                  blankParts[0].w + blankParts[1].w,
                  botHalfH
                );
                ctx.strokeRect(
                  blankParts[3].x,
                  rowY + topHalfH,
                  blankParts[2].w + blankParts[3].w,
                  botHalfH
                );
              } else {
                blankParts.forEach((bp) => {
                  if (bp.k.startsWith('subj_actual_')) {
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillRect(bp.x, rowY, bp.w, dataRowH);
                  }
                  ctx.strokeStyle = '#0f172a';
                  ctx.lineWidth = cellBorderW;
                  ctx.strokeRect(bp.x, rowY, bp.w, dataRowH);
                });
              }
              blankCellRightX -= colW;
              return;
            }

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = cellBorderW;
            ctx.strokeRect(cellX, rowY, colW, dataRowH);
            blankCellRightX -= colW;
          });
          return;
        }

        const genderText =
          student.gender === 'male'
            ? labels.male
            : student.gender === 'female'
            ? labels.female
            : '';

        const statusText = isKindergartenStage
          ? (student.studentStatus === 'دمج' ? 'دمج' : 'عادى')
          : normalizeStatusForGrade(
              student.enrollmentStatus,
              isFirstGrade,
              student.gender
            );

        const enrollmentTypeText =
          student.enrollmentType === 'تحويل من مدرسة أخرى'
            ? 'تحويلات'
            : student.enrollmentType === 'قيد عادي'
            ? 'قيد عادى'
            : student.enrollmentType || '';

        const isMuslim =
          student.religion === 'muslim' || (student.religion || '').includes('ل');
        const isChristian =
          student.religion === 'christian' || (student.religion || '').includes('ح');
        const religionText = isMuslim
          ? student.gender === 'female'
            ? labels.muslimFemale
            : labels.muslim
          : isChristian
          ? student.gender === 'female'
            ? labels.christianFemale
            : labels.christian
          : '';

        const seatNumText =
          student.seatNumbers?.[semester] ||
          (semester === 'first' ? student.seatNumber : '') ||
          '';
        const secretNumText =
          student.secretNumbers?.[semester] ||
          (semester === 'first' ? student.secretNumber : '') ||
          '';

        const seatNumSem1 =
          student.seatNumbers?.['first'] ||
          student.seatNumber ||
          '';
        const secretNumSem1 =
          student.secretNumbers?.['first'] ||
          student.secretNumber ||
          '';
        const commNumSem1 = getStudentCommitteeNum(student, globalIdx, 'first');

        const seatNumSem2 =
          student.seatNumbers?.['second'] ||
          (semester === 'second' ? student.seatNumber : '') ||
          '';
        const secretNumSem2 =
          student.secretNumbers?.['second'] ||
          (semester === 'second' ? student.secretNumber : '') ||
          '';
        const commNumSem2 = getStudentCommitteeNum(student, globalIdx, 'second');

        const summary = summariesById.get(student.id);
        const rankStr = studentRanksById.get(student.id) || '-';

        const getKgEvalLabelFromPct = (pct: number): string => {
          if (pct >= 85) return 'يفوق التوقعات دائماً';
          if (pct >= 65) return 'يلبي التوقعات';
          if (pct >= 50) return 'يلبي التوقعات أحياناً';
          return 'أقل من المتوقع';
        };

        const getKgColorFromPct = (pct: number): string => {
          if (pct >= 85) return '#0078d7';
          if (pct >= 65) return '#16c60c';
          if (pct >= 50) return '#ffff00';
          return '#e81123';
        };

        const getKgEvalCellColor = (evalText: string): { bg: string; text: string } | null => {
          if (!evalText || evalText === '-' || evalText.trim() === '') return null;
          if (
            evalText.includes('يفوق') ||
            evalText.includes('أزرق') ||
            evalText.includes('ازرق') ||
            evalText.includes('ممتاز')
          ) {
            return { bg: '#0078d7', text: '#ffffff' };
          }
          if (
            evalText.includes('أحيانا') ||
            evalText.includes('احيانا') ||
            evalText.includes('أصفر') ||
            evalText.includes('اصفر') ||
            evalText.includes('مقبول')
          ) {
            return { bg: '#ffff00', text: '#0f172a' };
          }
          if (
            evalText.includes('يلبي') ||
            evalText.includes('يلبى') ||
            evalText.includes('أخضر') ||
            evalText.includes('اخضر') ||
            evalText.includes('جيد')
          ) {
            return { bg: '#16c60c', text: '#ffffff' };
          }
          if (
            evalText.includes('أقل') ||
            evalText.includes('اقل') ||
            evalText.includes('دون') ||
            evalText.includes('علاج') ||
            evalText.includes('أحمر') ||
            evalText.includes('احمر') ||
            evalText.includes('ضعيف') ||
            evalText.includes('راسب')
          ) {
            return { bg: '#e81123', text: '#ffffff' };
          }
          return null;
        };

        const kgEvalText =
          isKindergartenStage
            ? (summary?.addedTotal !== null && summary?.addedTotal !== undefined && controlSheetAddedTotalMax > 0
                ? getKgEvalLabelFromPct((summary.addedTotal / controlSheetAddedTotalMax) * 100)
                : summary?.evaluation && summary.evaluation !== '-'
                ? summary.evaluation
                : '-')
            : summary?.evaluation || '-';

        const isBlankRow = !student.name;
        const cellValues: Record<string, string> = {
          serial: isBlankRow
            ? ''
            : reportType === 'calling_list' || reportType === 'secret_numbers'
            ? String(rIdx + 1)
            : String(globalIdx + 1),
          name: student.name || '',
          nationalId: student.nationalId || '',
          gender: isBlankRow ? '' : genderText,
          enrollmentStatus: isBlankRow ? '' : statusText,
          enrollmentType: isBlankRow ? '' : enrollmentTypeText,
          religion: isBlankRow ? '' : religionText,
          seatNumber: isBlankRow ? '' : seatNumText,
          secretNumber: isBlankRow ? '' : secretNumText,
          committeeNumber: isBlankRow ? '' : committeeNumText,
          seatNumber_sem1: isBlankRow ? '' : seatNumSem1,
          secretNumber_sem1: isBlankRow ? '' : secretNumSem1,
          committeeNumber_sem1: isBlankRow ? '' : commNumSem1,
          seatNumber_sem2: isBlankRow ? '' : seatNumSem2,
          secretNumber_sem2: isBlankRow ? '' : secretNumSem2,
          committeeNumber_sem2: isBlankRow ? '' : commNumSem2,
          addedTotal: isBlankRow || isCustomControlSheet
            ? ''
            : summary?.addedTotal !== null && summary?.addedTotal !== undefined
            ? String(summary.addedTotal)
            : '-',
          finalResult: isBlankRow || isCustomControlSheet
            ? ''
            : isKindergartenStage && (summary?.finalResult === 'راسب' || summary?.finalResult === 'راسبة' || summary?.finalResult === 'ناجح حكما' || summary?.finalResult === 'ناجحة حكما' || summary?.finalResult === 'له برنامج علاجى' || summary?.finalResult === 'لها برنامج علاجى' || summary?.finalResult === 'برامج علاجية' || summary?.status === 'second_round' || summary?.status === 'fail')
            ? (student.gender === 'female' || (student.gender as string) === 'أنثى' || (student.gender as string) === 'انثى' ? 'لها برنامج علاجى' : 'له برنامج علاجى')
            : summary?.finalResult || '-',
          evaluation: isBlankRow || isCustomControlSheet ? '' : kgEvalText,
          percentage: isBlankRow || isCustomControlSheet ? '' : summary?.percentage || '-',
          studentRank: isBlankRow || isCustomControlSheet ? '' : rankStr,
          failedCount: isBlankRow
            ? ''
            : reportType === 'mercy_grades_students'
            ? summary?.mercyCount || '-'
            : summary?.failedCount || '-',
          failedSubjects: isBlankRow
            ? ''
            : reportType === 'mercy_grades_students'
            ? summary?.mercySubjects || '-'
            : summary?.failedSubjects || '-',
        };

        const failedControlSheetSubjKeys = new Set<string>();
        const failedControlSheetWrittenKeys = new Set<string>();
        const kgSubjectCellColors: Record<string, string> = {};
        if (!isBlankRow && isControlSheet && controlSheetSubjectsConfig) {
          const isStudentRegular = Boolean(
            isExplicitlyRegular ||
            (student as any)?.systemType === 'regular' ||
            (student as any)?.enrollmentType === 'منتظم' ||
            (student as any)?.enrollmentStatus === 'منتظم' ||
            student.studentStatus === 'منتظم' ||
            student.studentStatus === 'نظامى'
          );
          const isMiddleStage = stage === 'middle' || stage === 'prep' || stage === 'secondary' || Boolean(options.title && (options.title.includes('المرحلة الإعدادية') || options.title.includes('المرحلة الثانوية') || options.title.includes('ثانوي') || options.title.includes('إعداد') || options.title.includes('اعداد')));
          const isMiddleHomeschool = isMiddleStage && !isStudentRegular && Boolean(
            options.isHomeschool ||
            (options.title && (options.title.includes('منازل') || options.title.toLowerCase().includes('homeschool'))) ||
            (typeof window !== 'undefined' && (
              localStorage.getItem('current_system_type') === 'homeschool' ||
              localStorage.getItem('systemType') === 'homeschool'
            )) ||
            (student as any)?.systemType === 'homeschool' ||
            (student as any)?.enrollmentType === 'منازل' ||
            student.studentStatus === 'منازل'
          );
          const csAssess1 =
            student.assessments?.['first'] || student.assessments?.['الفصل الدراسي الأول'];
          const csAssess2 =
            student.assessments?.['second'] ||
            student.assessments?.['الفصل الدراسي الثاني'] ||
            (student.assessments as any)?.['الفصل الدراسي الثانى'];
          const csWritten1 =
            student.writtenExams?.['first'] || student.writtenExams?.['الفصل الدراسي الأول'];
          const csWritten2 =
            student.writtenExams?.['second'] ||
            student.writtenExams?.['الفصل الدراسي الثاني'] ||
            (student.writtenExams as any)?.['الفصل الدراسي الثانى'];

          const csGradingSettings = getGradingSettings(stage, selectedGrade);
          const csHasMercyStage =
            stage === 'primary' || stage === 'middle' || stage === 'prep' || stage === 'secondary';
          const csMercyBoosts =
            semester === 'second' && csHasMercyStage
              ? getPrimaryStudentMercyBoosts(
                  student,
                  stage || '',
                  controlSheetSubjectsConfig.customCols,
                  controlSheetSubjectsConfig.defaultSubjectsOverrides,
                  csGradingSettings,
                  selectedGrade
                )
              : {};

          const allCsSubjects = [
            ...controlSheetAddedSubjects,
            ...controlSheetNonAddedSubjects,
          ];

          allCsSubjects.forEach((sub) => {
            if (isNonKgControlSheet && semester === 'second' && !isMiddleHomeschool) {
              const parseValOrDash = (rawVal: any) => {
                if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
                  return { text: '-', num: 0, has: false, isAbs: false };
                }
                const strVal = String(rawVal).trim();
                const isAbs = strVal === 'غ' || strVal.toLowerCase() === 'a';
                if (isAbs) {
                  return { text: 'غ', num: 0, has: true, isAbs: true };
                }
                const num = parseFloat(strVal.replace(',', '.'));
                if (isNaN(num)) {
                  return { text: strVal, num: 0, has: false, isAbs: false };
                }
                const roundedNum = roundToOneDecimal(num);
                return {
                  text: formatToOneDecimal(roundedNum),
                  num: roundedNum,
                  has: true,
                  isAbs: false,
                };
              };

              const a1Val = parseValOrDash(csAssess1 ? (csAssess1 as any)[sub.key] : undefined);
              const w1Val = parseValOrDash(csWritten1 ? (csWritten1 as any)[sub.key] : undefined);
              const a2Val = parseValOrDash(csAssess2 ? (csAssess2 as any)[sub.key] : undefined);
              const w2Val = parseValOrDash(csWritten2 ? (csWritten2 as any)[sub.key] : undefined);

              cellValues[`subj_sem1_assess_${sub.key}`] = a1Val.text;
              if (sub.hasWritten) {
                cellValues[`subj_sem1_written_${sub.key}`] = w1Val.text;
              }
              cellValues[`subj_sem2_assess_${sub.key}`] = a2Val.text;
              if (sub.hasWritten) {
                cellValues[`subj_sem2_written_${sub.key}`] = w2Val.text;
              }

              const hasAnySem1 = a1Val.has || w1Val.has;
              const hasAnySem2 = a2Val.has || w2Val.has;
              const boost = csMercyBoosts[sub.key];

              const sem1Sum = (a1Val.isAbs ? 0 : a1Val.num) + (w1Val.isAbs ? 0 : w1Val.num);
              const sem2Sum = (a2Val.isAbs ? 0 : a2Val.num) + (w2Val.isAbs ? 0 : w2Val.num);

              if (sub.hasWritten) {
                cellValues[`subj_sem1_total_${sub.key}`] = hasAnySem1
                  ? (a1Val.isAbs && w1Val.isAbs ? 'غ' : formatToOneDecimal(sem1Sum))
                  : '-';
                cellValues[`subj_sem2_total_${sub.key}`] = hasAnySem2
                  ? (a2Val.isAbs && w2Val.isAbs ? 'غ' : formatToOneDecimal(sem2Sum))
                  : '-';
              }

              if (!hasAnySem1 && !hasAnySem2) {
                cellValues[`subj_actual_${sub.key}`] = '-';
              } else {
                const isPrimary = stage === 'primary';
                const rawSum = roundToOneDecimal(
                  (hasAnySem1 && hasAnySem2)
                    ? (sem1Sum + sem2Sum) / 2
                    : (hasAnySem2 ? sem2Sum : sem1Sum)
                );
                
                // فى المرحلة الابتدائية فى ملف شيت كنترول الفصل الدراسي الثانى فى خلايا حقل الدرجة الفعلية = مجموع درجات الطالب فى الفصلين الدراسيين / 2
                const actualScore = boost
                  ? boost.boostedActualGrade
                  : (isPrimary
                      ? rawSum
                      : roundToOneDecimal(((hasAnySem1 && hasAnySem2 ? (sem1Sum + sem2Sum) : (hasAnySem2 ? sem2Sum * 2 : sem1Sum * 2)) * sub.actualMaxVal) / 200));
                cellValues[`subj_actual_${sub.key}`] = formatToOneDecimal(actualScore);

                const minReqActual = roundToOneDecimal(
                  sub.actualMaxVal * (sub.minTotalPass / 100)
                );
                const failedActualTotal = !boost && actualScore < minReqActual;
                if (failedActualTotal || (isPrimary ? actualScore < sub.actualMaxVal / 2 : rawSum < sub.maxVal / 2)) {
                  failedControlSheetSubjKeys.add(`subj_actual_${sub.key}`);
                  failedControlSheetSubjKeys.add(`subj_${sub.key}`);
                }
              }
              return;
            }

            if (isMiddleHomeschool) {
              const parseCsVal = (rawVal: any) => {
                const hasVal =
                  rawVal !== undefined &&
                  rawVal !== null &&
                  String(rawVal).trim() !== '';
                if (!hasVal) {
                  return { text: '-', num: 0, has: false, isAbs: false };
                }
                const strVal = String(rawVal).trim();
                const isAbs = strVal === 'غ' || strVal.toLowerCase() === 'a';
                if (isAbs) {
                  return { text: 'غ', num: 0, has: true, isAbs: true };
                }
                const num = parseFloat(strVal.replace(',', '.'));
                if (isNaN(num)) {
                  return { text: strVal, num: 0, has: false, isAbs: false };
                }
                const roundedNum = roundToOneDecimal(num);
                return {
                  text: formatToOneDecimal(roundedNum),
                  num: roundedNum,
                  has: true,
                  isAbs: false,
                };
              };

              const combineCsSemVal = (wPart: ReturnType<typeof parseCsVal>, aPart: ReturnType<typeof parseCsVal>) => {
                if (wPart.has && aPart.has) {
                  if (wPart.isAbs && aPart.isAbs) {
                    return { text: 'غ', num: 0, has: true, isAbs: true };
                  }
                  const sum = roundToOneDecimal((wPart.isAbs ? 0 : wPart.num) + (aPart.isAbs ? 0 : aPart.num));
                  return { text: formatToOneDecimal(sum), num: sum, has: true, isAbs: false };
                }
                if (wPart.has) return wPart;
                if (aPart.has) return aPart;
                return { text: '-', num: 0, has: false, isAbs: false };
              };

              if (isNonKgControlSheet && semester === 'second') {
                const w1Val = parseCsVal(csWritten1 ? (csWritten1 as any)[sub.key] : undefined);
                const a1Val = parseCsVal(csAssess1 ? (csAssess1 as any)[sub.key] : undefined);
                const w2Val = parseCsVal(csWritten2 ? (csWritten2 as any)[sub.key] : undefined);
                const a2Val = parseCsVal(csAssess2 ? (csAssess2 as any)[sub.key] : undefined);

                const s1Val = combineCsSemVal(w1Val, a1Val);
                const s2Val = combineCsSemVal(w2Val, a2Val);

                cellValues[`subj_sem1_${sub.key}`] = s1Val.text;
                cellValues[`subj_sem2_${sub.key}`] = s2Val.text;

                const hasSem1 = s1Val.has;
                const isSem1Abs = s1Val.isAbs;
                const sem1Num = s1Val.num;

                const hasSem2 = s2Val.has;
                const isSem2Abs = s2Val.isAbs;
                const sem2Num = s2Val.num;

                const hasAnyGrade = hasSem1 || hasSem2;
                const boost = csMercyBoosts[sub.key];
                if (!hasAnyGrade) {
                  cellValues[`subj_${sub.key}`] = '-';
                  cellValues[`subj_actual_${sub.key}`] = '-';
                } else {
                  const rawSum = roundToOneDecimal((hasSem1 ? sem1Num : 0) + (hasSem2 ? sem2Num : 0));
                  cellValues[`subj_${sub.key}`] =
                    isSem1Abs && isSem2Abs
                      ? 'غ'
                      : formatToOneDecimal(rawSum);

                  const actualScore = boost
                    ? boost.boostedActualGrade
                    : roundToOneDecimal(
                        (hasSem1 && hasSem2)
                          ? (rawSum * sub.actualMaxVal) / 200
                          : hasSem2
                          ? (sem2Num * sub.actualMaxVal) / 100
                          : (sem1Num * sub.actualMaxVal) / 100
                      );
                  cellValues[`subj_actual_${sub.key}`] = formatToOneDecimal(actualScore);

                  const minReqActual = roundToOneDecimal(
                    sub.actualMaxVal * (sub.minTotalPass / 100)
                  );
                  const failedActualTotal = !boost && actualScore < minReqActual;
                  if (hasSem1 && (isSem1Abs || sem1Num < sub.maxVal / 2)) {
                    failedControlSheetSubjKeys.add(`subj_sem1_${sub.key}`);
                  }
                  if (hasSem2 && (isSem2Abs || sem2Num < sub.maxVal / 2)) {
                    failedControlSheetSubjKeys.add(`subj_sem2_${sub.key}`);
                  }
                  if (failedActualTotal || (hasSem1 && hasSem2 && rawSum < sub.maxVal)) {
                    failedControlSheetSubjKeys.add(`subj_actual_${sub.key}`);
                    failedControlSheetSubjKeys.add(`subj_${sub.key}`);
                  }
                }
                return;
              } else {
                const targetWritten = targetEvalSem === 'first' ? csWritten1 : csWritten2;
                const targetAssess = targetEvalSem === 'first' ? csAssess1 : csAssess2;
                const wPart = parseCsVal(targetWritten ? (targetWritten as any)[sub.key] : undefined);
                const aPart = parseCsVal(targetAssess ? (targetAssess as any)[sub.key] : undefined);
                const semVal = combineCsSemVal(wPart, aPart);

                if (!semVal.has) {
                  cellValues[`subj_${sub.key}`] = '-';
                } else {
                  cellValues[`subj_${sub.key}`] = semVal.text;
                  if (!semVal.isAbs && sub.maxVal > 0 && semVal.num < sub.maxVal / 2) {
                    failedControlSheetSubjKeys.add(`subj_${sub.key}`);
                  }
                }
                return;
              }
            }

            if (isKindergartenStage && semester === 'second') {
              const applyKgSemGrade = (rawVal: any, cellKey: string) => {
                const hasVal =
                  rawVal !== undefined &&
                  rawVal !== null &&
                  String(rawVal).trim() !== '';
                if (!hasVal) {
                  cellValues[cellKey] = '-';
                  return;
                }
                const strVal = String(rawVal).trim();
                const isAbs = strVal === 'غ' || strVal.toLowerCase() === 'a';
                if (isAbs) {
                  cellValues[cellKey] = 'غ';
                  kgSubjectCellColors[cellKey] = getKgColorFromPct(0);
                } else {
                  const num = parseFloat(strVal.replace(',', '.'));
                  cellValues[cellKey] = isNaN(num) ? strVal : String(roundToOneDecimal(num));
                  if (!isNaN(num) && sub.maxVal > 0) {
                    const pct = (num / sub.maxVal) * 100;
                    kgSubjectCellColors[cellKey] = getKgColorFromPct(pct);
                  }
                }
              };
              applyKgSemGrade(csAssess1 ? (csAssess1 as any)[sub.key] : undefined, `subj_sem1_${sub.key}`);
              applyKgSemGrade(csAssess2 ? (csAssess2 as any)[sub.key] : undefined, `subj_sem2_${sub.key}`);
              return;
            }

            const targetAssess = targetEvalSem === 'first' ? csAssess1 : csAssess2;
            const targetWritten = targetEvalSem === 'first' ? csWritten1 : csWritten2;
            const rawAssess = targetAssess ? (targetAssess as any)[sub.key] : undefined;
            const hasAssess =
              rawAssess !== undefined &&
              rawAssess !== null &&
              String(rawAssess).trim() !== '';

            if (!sub.hasWritten) {
              if (!hasAssess) {
                cellValues[`subj_${sub.key}`] = '-';
              } else {
                const strVal = String(rawAssess).trim();
                const isAbs = strVal === 'غ' || strVal.toLowerCase() === 'a';
                if (isAbs) {
                  cellValues[`subj_${sub.key}`] = 'غ';
                  if (isKindergartenStage) {
                    kgSubjectCellColors[`subj_${sub.key}`] = getKgColorFromPct(0);
                  } else if (!isMiddleHomeschool) {
                    failedControlSheetSubjKeys.add(`subj_${sub.key}`);
                  }
                } else {
                  const num = parseFloat(strVal.replace(',', '.'));
                  cellValues[`subj_${sub.key}`] = isNaN(num) ? strVal : String(roundToOneDecimal(num));
                  if (!isNaN(num) && sub.maxVal > 0) {
                    const pct = (num / sub.maxVal) * 100;
                    if (isKindergartenStage) {
                      kgSubjectCellColors[`subj_${sub.key}`] = getKgColorFromPct(pct);
                    } else if (isNonKgControlSheet) {
                      if (!isMiddleHomeschool && num < sub.maxVal / 2) {
                        failedControlSheetSubjKeys.add(`subj_${sub.key}`);
                      }
                    } else {
                      if (!isMiddleHomeschool && pct < sub.minTotalPass) {
                        failedControlSheetSubjKeys.add(`subj_${sub.key}`);
                      }
                    }
                  }
                }
              }
            } else {
              const rawW = targetWritten ? (targetWritten as any)[sub.key] : undefined;
              const hasW =
                rawW !== undefined && rawW !== null && String(rawW).trim() !== '';

              if (!hasAssess) {
                cellValues[`subj_assess_${sub.key}`] = '-';
              } else {
                const aStr = String(rawAssess).trim();
                if (aStr === 'غ' || aStr.toLowerCase() === 'a') {
                  cellValues[`subj_assess_${sub.key}`] = 'غ';
                } else {
                  const aParsed = parseFloat(aStr.replace(',', '.'));
                  cellValues[`subj_assess_${sub.key}`] = isNaN(aParsed)
                    ? aStr
                    : String(roundToOneDecimal(aParsed));
                }
              }

              if (!hasW) {
                cellValues[`subj_written_${sub.key}`] = '-';
              } else {
                const wStr = String(rawW).trim();
                if (wStr === 'غ' || wStr.toLowerCase() === 'a') {
                  cellValues[`subj_written_${sub.key}`] = 'غ';
                } else {
                  const wParsed = parseFloat(wStr.replace(',', '.'));
                  cellValues[`subj_written_${sub.key}`] = isNaN(wParsed)
                    ? wStr
                    : String(roundToOneDecimal(wParsed));
                }
              }

              if (!hasAssess && !hasW) {
                cellValues[`subj_${sub.key}`] = '-';
              } else {
                const aStr = hasAssess ? String(rawAssess).trim() : '0';
                const wStr = hasW ? String(rawW).trim() : '0';
                const isWrittenAbs = hasW && (wStr === 'غ' || wStr.toLowerCase() === 'a');
                const aNum =
                  aStr === 'غ' || aStr.toLowerCase() === 'a'
                    ? 0
                    : parseFloat(aStr.replace(',', '.')) || 0;
                const wNum =
                  wStr === 'غ' || wStr.toLowerCase() === 'a'
                    ? 0
                    : parseFloat(wStr.replace(',', '.')) || 0;
                const totalSubjScore = roundToOneDecimal(aNum + wNum);
                cellValues[`subj_${sub.key}`] = String(totalSubjScore);
                
                const a1Num = csAssess1 ? parseFloat(String((csAssess1 as any)[sub.key]).replace(',', '.')) || 0 : 0;
                const w1Num = csWritten1 ? parseFloat(String((csWritten1 as any)[sub.key]).replace(',', '.')) || 0 : 0;
                const a2Num = csAssess2 ? parseFloat(String((csAssess2 as any)[sub.key]).replace(',', '.')) || 0 : 0;
                const w2Num = csWritten2 ? parseFloat(String((csWritten2 as any)[sub.key]).replace(',', '.')) || 0 : 0;
                const actualScore = roundToOneDecimal(a1Num + w1Num + a2Num + w2Num);
                cellValues[`subj_actual_${sub.key}`] = formatToOneDecimal(actualScore);
                
                if (isNonKgControlSheet) {
                  if (sub.maxVal > 0 && totalSubjScore < sub.maxVal / 2) {
                    failedControlSheetSubjKeys.add(`subj_${sub.key}`);
                  }
                } else {
                  const totalPct = sub.maxVal > 0 ? (totalSubjScore / sub.maxVal) * 100 : 0;
                  const writtenPct = sub.maxWritten > 0 ? (wNum / sub.maxWritten) * 100 : 100;
                  if (isWrittenAbs || totalPct < sub.minTotalPass || writtenPct < sub.minWrittenPass) {
                    failedControlSheetSubjKeys.add(`subj_${sub.key}`);
                  }
                }
              }
            }
          });
        }

        let cellRightX = marginX + contentW;
        columns.forEach((col, cIdx) => {
          const colW = colWidths[cIdx];
          const cellX = cellRightX - colW;

          if (isBlankSepKey(col.key)) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cellX, rowY, colW, dataRowH);
            cellRightX -= colW;
            return;
          }

          if (col.key === 'addedTotal') {
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(cellX, rowY, colW, dataRowH);
          }

          if (isKindergartenStage && col.key === 'finalResult') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cellX, rowY, colW, dataRowH);
          }

          if (col.splitKeys) {
            const nSub = col.splitKeys.length;
            let splitParts: { k: string; x: number; w: number }[] = [];

            if (col.splitBothSemTotalMax && nSub === 4 && col.splitMaxGrades && col.splitMaxGrades.length === 4) {
              const mAssess = parseFloat(col.splitMaxGrades[0]) || 30;
              const mWritten = parseFloat(col.splitMaxGrades[1]) || 70;
              const mTotal = mAssess + mWritten;
              const halfW = Math.floor(colW / 2);
              const remW = colW - halfW;
              const wA1 = Math.max(Math.floor(halfW * 0.35), Math.min(Math.floor(halfW * 0.5), Math.round(halfW * (mAssess / (mTotal || 100)))));
              const wW1 = halfW - wA1;
              const wA2 = Math.max(Math.floor(remW * 0.35), Math.min(Math.floor(remW * 0.5), Math.round(remW * (mAssess / (mTotal || 100)))));
              const wW2 = remW - wA2;

              splitParts = [
                { k: col.splitKeys[0], x: cellX + colW - wA1, w: wA1 },
                { k: col.splitKeys[1], x: cellX + colW - halfW, w: wW1 },
                { k: col.splitKeys[2], x: cellX + remW - wA2, w: wA2 },
                { k: col.splitKeys[3], x: cellX, w: wW2 },
              ];
            } else if ((col.splitSemTotalKeys || col.key === 'subj_custom_new_added' || col.key === 'subj_custom_new_non_added') && nSub === 5) {
              const actualW = Math.max(32, Math.floor(colW * 0.24));
              const fourPartsW = colW - actualW;
              const bW = Math.floor(fourPartsW / 4);
              let curSubRightX = cellX + colW;
              splitParts = col.splitKeys.map((k, idx) => {
                const w =
                  idx === 4
                    ? curSubRightX - cellX
                    : idx === 3
                    ? curSubRightX - (cellX + actualW)
                    : bW;
                const x = curSubRightX - w;
                curSubRightX -= w;
                return { k, x, w };
              });
            } else {
              const baseSubW = Math.floor(colW / nSub);
              let curSubRightX = cellX + colW;
              splitParts = col.splitKeys.map((k, idx) => {
                const w = idx === nSub - 1 ? curSubRightX - cellX : baseSubW;
                const x = curSubRightX - w;
                curSubRightX -= w;
                return { k, x, w };
              });
            }

            const drawHalfSubCell = (
              boxX: number,
              boxY: number,
              boxW: number,
              boxH: number,
              rawTextVal: string,
              isFailed = false,
              isActualGrade = false
            ) => {
              const textVal = isCustomControlSheet ? '' : formatToOneDecimal(rawTextVal);
              const effectiveFailed = !isCustomControlSheet && isFailed;
              const shouldShade = effectiveFailed && isActualGrade && isNonKgControlSheet && semester === 'second';
              if (shouldShade) {
                ctx.fillStyle = '#fee2e2';
                ctx.fillRect(boxX, boxY, boxW, boxH);
              }
              ctx.strokeStyle = isDarkRow ? '#475569' : '#0f172a';
              ctx.lineWidth = cellBorderW;
              ctx.strokeRect(boxX, boxY, boxW, boxH);
              const isAr = /[\u0600-\u06FF]/.test(textVal);
              ctx.direction = isAr ? 'rtl' : 'ltr';
              const isNonKgSem2 = isNonKgControlSheet && semester === 'second';
              ctx.fillStyle =
                shouldShade
                  ? '#000000'
                  : isDarkRow
                  ? (effectiveFailed ? '#fca5a5' : '#ffffff')
                  : isNonKgSem2
                  ? '#1e293b'
                  : effectiveFailed
                  ? '#dc2626'
                  : '#1e293b';
              const fFam = isActualGrade ? '"Cairo", sans-serif' : (isAr ? '"Cairo", sans-serif' : '"Cairo", monospace');
              let fSize = isActualGrade && isNonKgControlSheet
                ? 12.5
                : Math.min(13, Math.max(8, Math.floor(boxH * 0.65)));
              const maxW = boxW - 4;
              ctx.font = `bold ${fSize}px ${fFam}`;
              if (!isActualGrade) {
                while (fSize > 7 && ctx.measureText(textVal).width > maxW) {
                  fSize -= 0.5;
                  ctx.font = `bold ${fSize}px ${fFam}`;
                }
              }
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              if (
                effectiveFailed &&
                textVal &&
                textVal !== '-' &&
                !isSubjectReport &&
                (!isNonKgControlSheet || semester !== 'second') &&
                isNumericGrade(textVal)
              ) {
                const cx = boxX + boxW / 2;
                const cy = boxY + boxH / 2;
                const textW = ctx.measureText(textVal).width;
                const ry = Math.max(5, Math.min(boxH / 2 - 2, 13));
                const rx = Math.max(ry, Math.min(boxW / 2 - 2, textW / 2 + 5));
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                ctx.lineWidth = 1.8;
                ctx.strokeStyle = '#dc2626';
                ctx.stroke();
                ctx.restore();
                ctx.fillStyle = '#dc2626';
              }

              drawCenteredText(ctx, textVal, boxX + boxW / 2, boxY + boxH / 2, maxW);
            };

            if (col.splitBothSemTotalMax) {
              const numLevels = col.splitActualMaxGrade ? 4 : 3;
              const lvH = Math.floor(dataRowH / numLevels);
              const lv1H = lvH;
              const lv2H = lvH;
              const lv3H = numLevels === 3 ? dataRowH - lv1H - lv2H : lvH;
              const lv4H = numLevels === 4 ? dataRowH - lv1H - lv2H - lv3H : 0;

              if (nSub === 2) {
                // دمج الخليتين (المستوى الأول + الثاني) في صفوف الطلاب عند nSub === 2
                splitParts.forEach((sp) => {
                  const isFail =
                    failedControlSheetWrittenKeys.has(sp.k) ||
                    failedControlSheetSubjKeys.has(sp.k) ||
                    cellValues[sp.k] === 'غ';
                  drawHalfSubCell(sp.x, rowY, sp.w, lv1H + lv2H, cellValues[sp.k] || '-', isFail, false);
                });
              } else {
                // Level 1: Draw grades for each sub-box
                splitParts.forEach((sp, idx) => {
                  const isFail =
                    failedControlSheetWrittenKeys.has(sp.k) ||
                    failedControlSheetSubjKeys.has(sp.k) ||
                    cellValues[sp.k] === 'غ';
                  drawHalfSubCell(sp.x, rowY, sp.w, lv1H, cellValues[sp.k] || '-', isFail, false);
                });

                // Level 2: Semester Totals
                if (nSub === 4 && col.splitSemTotalKeys) {
                  const s1Fail =
                    failedControlSheetSubjKeys.has(col.splitSemTotalKeys[0]) ||
                    cellValues[col.splitSemTotalKeys[0]] === 'غ';
                  const s2Fail =
                    failedControlSheetSubjKeys.has(col.splitSemTotalKeys[1]) ||
                    cellValues[col.splitSemTotalKeys[1]] === 'غ';
                  drawHalfSubCell(
                    splitParts[1].x,
                    rowY + lv1H,
                    splitParts[0].w + splitParts[1].w,
                    lv2H,
                    cellValues[col.splitSemTotalKeys[0]] || '-',
                    s1Fail,
                    false
                  );
                  drawHalfSubCell(
                    splitParts[3].x,
                    rowY + lv1H,
                    splitParts[2].w + splitParts[3].w,
                    lv2H,
                    cellValues[col.splitSemTotalKeys[1]] || '-',
                    s2Fail,
                    false
                  );
                } else {
                  const isFailBoth = col.splitBothSemTotalKey
                    ? failedControlSheetSubjKeys.has(col.splitBothSemTotalKey) ||
                      cellValues[col.splitBothSemTotalKey] === 'غ'
                    : false;
                  drawHalfSubCell(
                    cellX,
                    rowY + lv1H,
                    colW,
                    lv2H,
                    col.splitBothSemTotalKey ? cellValues[col.splitBothSemTotalKey] || '-' : '-',
                    isFailBoth,
                    false
                  );
                }
              }

              // Level 3: Total of both semesters (مجموع الفصلين)
              let bothSemVal = col.splitBothSemTotalKey ? cellValues[col.splitBothSemTotalKey] || '-' : '-';
              if ((!bothSemVal || bothSemVal === '-') && col.splitSemTotalKeys && col.splitSemTotalKeys.length === 2) {
                const s1Text = cellValues[col.splitSemTotalKeys[0]];
                const s2Text = cellValues[col.splitSemTotalKeys[1]];
                const hasS1 = s1Text && s1Text !== '-';
                const hasS2 = s2Text && s2Text !== '-';
                if (hasS1 || hasS2) {
                  const s1Num = s1Text === 'غ' ? 0 : parseFloat(s1Text) || 0;
                  const s2Num = s2Text === 'غ' ? 0 : parseFloat(s2Text) || 0;
                  bothSemVal = String(roundToOneDecimal(s1Num + s2Num));
                }
              }
              const isFailedBothSem = col.splitBothSemTotalKey
                ? failedControlSheetSubjKeys.has(col.splitBothSemTotalKey) ||
                  bothSemVal === 'غ'
                : false;
              drawHalfSubCell(
                cellX,
                rowY + lv1H + lv2H,
                colW,
                lv3H,
                bothSemVal,
                isFailedBothSem,
                numLevels === 3
              );

              // Level 4: Actual Grade (الدرجة الفعلية) if defined
              if (numLevels === 4 && lv4H > 0 && col.splitActualKey) {
                const isFailedActual =
                  failedControlSheetSubjKeys.has(col.splitActualKey) ||
                  cellValues[col.splitActualKey] === 'غ';
                drawHalfSubCell(
                  cellX,
                  rowY + lv1H + lv2H + lv3H,
                  colW,
                  lv4H,
                  cellValues[col.splitActualKey] || '-',
                  isFailedActual,
                  true
                );
              }

              cellRightX -= colW;
              return;
            } else if (col.splitSemTotalKeys && nSub === 5) {
              const topHalfH = Math.floor(dataRowH / 2);
              const botHalfH = dataRowH - topHalfH;

              for (let sIdx = 0; sIdx < 4; sIdx++) {
                const sp = splitParts[sIdx];
                const isFail =
                  failedControlSheetWrittenKeys.has(sp.k) ||
                  failedControlSheetSubjKeys.has(sp.k) ||
                  cellValues[sp.k] === 'غ';
                drawHalfSubCell(sp.x, rowY, sp.w, topHalfH, cellValues[sp.k] || '-', isFail, false);
              }

              const s1Fail =
                failedControlSheetSubjKeys.has(col.splitSemTotalKeys[0]) ||
                cellValues[col.splitSemTotalKeys[0]] === 'غ';
              const s2Fail =
                failedControlSheetSubjKeys.has(col.splitSemTotalKeys[1]) ||
                cellValues[col.splitSemTotalKeys[1]] === 'غ';

              drawHalfSubCell(
                splitParts[1].x,
                rowY + topHalfH,
                splitParts[0].w + splitParts[1].w,
                botHalfH,
                cellValues[col.splitSemTotalKeys[0]] || '-',
                s1Fail,
                false
              );
              drawHalfSubCell(
                splitParts[3].x,
                rowY + topHalfH,
                splitParts[2].w + splitParts[3].w,
                botHalfH,
                cellValues[col.splitSemTotalKeys[1]] || '-',
                s2Fail,
                false
              );

              const actualSp = splitParts[4];
              const isActualFail = !isCustomControlSheet && (failedControlSheetSubjKeys.has(actualSp.k) || cellValues[actualSp.k] === 'غ');
              if (isActualFail && isNonKgControlSheet && semester === 'second') {
                ctx.fillStyle = '#fee2e2';
                ctx.fillRect(actualSp.x, rowY, actualSp.w, dataRowH);
              } else {
                ctx.fillStyle = isDarkRow ? '#18181b' : '#e2e8f0';
                ctx.fillRect(actualSp.x, rowY, actualSp.w, dataRowH);
              }
              ctx.strokeStyle = isDarkRow ? '#475569' : '#0f172a';
              ctx.lineWidth = cellBorderW;
              ctx.strokeRect(actualSp.x, rowY, actualSp.w, dataRowH);

              const actualVal = isCustomControlSheet ? '' : formatToOneDecimal(cellValues[actualSp.k] || '-');
              const actualIsAr = /[\u0600-\u06FF]/.test(actualVal);
              ctx.direction = actualIsAr ? 'rtl' : 'ltr';
              ctx.fillStyle =
                isActualFail && isNonKgControlSheet && semester === 'second'
                  ? '#000000'
                  : isDarkRow
                  ? (isActualFail ? '#fca5a5' : '#ffffff')
                  : '#1e293b';
              const actualFontFam = '"Cairo", sans-serif';
              const actualFontSize = isNonKgControlSheet ? 12.5 : rowFontSize * kgSem2TableFontScale;
              const actualMaxW = actualSp.w - 4;
              ctx.font = `bold ${actualFontSize}px ${actualFontFam}`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              if (
                isActualFail &&
                !isSubjectReport &&
                (!isNonKgControlSheet || semester !== 'second') &&
                isNumericGrade(actualVal)
              ) {
                const cx = actualSp.x + actualSp.w / 2;
                const cy = rowY + dataRowH / 2;
                const textW = ctx.measureText(actualVal).width;
                const ry = Math.max(9, Math.min(dataRowH / 2 - 4, 16));
                const rx = Math.max(ry, Math.min(actualSp.w / 2 - 3, textW / 2 + 7));
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#dc2626';
                ctx.stroke();
                ctx.restore();
              }
              ctx.fillStyle =
                isActualFail && isNonKgControlSheet && semester === 'second'
                  ? '#000000'
                  : isDarkRow
                  ? (isActualFail ? '#fca5a5' : '#ffffff')
                  : '#1e293b';
              drawCenteredText(
                ctx,
                actualVal,
                actualSp.x + actualSp.w / 2,
                rowY + dataRowH / 2,
                actualMaxW
              );
              cellRightX -= colW;
              return;
            }

            splitParts.forEach((sp) => {
              const isSingleFail = !isCustomControlSheet && (failedControlSheetSubjKeys.has(sp.k) || (cellValues[sp.k] === 'غ'));
              if (isSingleFail && isNonKgControlSheet && semester === 'second') {
                ctx.fillStyle = '#fee2e2';
                ctx.fillRect(sp.x, rowY, sp.w, dataRowH);
              } else if (sp.k.startsWith('subj_actual_')) {
                ctx.fillStyle = isDarkRow ? '#18181b' : '#e2e8f0';
                ctx.fillRect(sp.x, rowY, sp.w, dataRowH);
              }
              ctx.strokeStyle = isDarkRow ? '#475569' : '#0f172a';
              ctx.lineWidth = cellBorderW;
              ctx.strokeRect(sp.x, rowY, sp.w, dataRowH);
              const kgSplitColor =
                isKindergartenStage && isControlSheet
                  ? kgSubjectCellColors[sp.k]
                  : undefined;
              if (kgSplitColor) {
                const diameter = Math.max(14, Math.min(sp.w - 10, dataRowH - 12));
                const radius = diameter / 2;
                const cx = sp.x + sp.w / 2;
                const cy = rowY + dataRowH / 2;
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fillStyle = kgSplitColor;
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#000000';
                ctx.stroke();
                ctx.restore();
                return;
              }
              const spVal = isCustomControlSheet ? '' : formatToOneDecimal(cellValues[sp.k] || '-');
              const spIsArabic = /[\u0600-\u06FF]/.test(spVal);
              ctx.direction = spIsArabic ? 'rtl' : 'ltr';
              ctx.fillStyle =
                isSingleFail && isNonKgControlSheet && semester === 'second'
                  ? '#000000'
                  : '#1e293b';
              const isActualGradePart = sp.k.startsWith('subj_actual_');
              const spFontFam = isActualGradePart ? '"Cairo", sans-serif' : (spIsArabic ? '"Cairo", sans-serif' : '"Cairo", monospace');
              const isTotalSubKey =
                isActualGradePart ||
                (!sp.k.startsWith('subj_assess_') &&
                  !sp.k.startsWith('subj_written_') &&
                  !sp.k.startsWith('subj_sem1_') &&
                  !sp.k.startsWith('subj_sem2_'));
              let spFontSize = isNonKgControlSheet
                ? isActualGradePart
                  ? 12.5
                  : isTotalSubKey
                  ? 15
                  : semester === 'second'
                  ? 13.5
                  : 14.5
                : rowFontSize * kgSem2TableFontScale;
              const spMaxW = sp.w - 4;
              ctx.font = `bold ${spFontSize}px ${spFontFam}`;
              if (!isActualGradePart) {
                while (
                  spFontSize > (isNonKgControlSheet ? 9.5 : 11 * kgSem2TableFontScale) &&
                  ctx.measureText(spVal).width > spMaxW
                ) {
                  spFontSize -= 0.5;
                  ctx.font = `bold ${spFontSize}px ${spFontFam}`;
                }
              }
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              if (
                isSingleFail &&
                !isSubjectReport &&
                (!isNonKgControlSheet || semester !== 'second') &&
                isNumericGrade(spVal)
              ) {
                const cx = sp.x + sp.w / 2;
                const cy = rowY + dataRowH / 2;
                const textW = ctx.measureText(spVal).width;
                const ry = Math.max(9, Math.min(dataRowH / 2 - 4, isNonKgControlSheet ? 18 : 19));
                const rx = Math.max(ry, Math.min(sp.w / 2 - 3, textW / 2 + 8));
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                ctx.lineWidth = 2.2;
                ctx.strokeStyle = '#dc2626';
                ctx.stroke();
                ctx.restore();
              }
              ctx.fillStyle =
                isSingleFail && isNonKgControlSheet && semester === 'second'
                  ? '#000000'
                  : isDarkRow
                  ? (isSingleFail ? '#fca5a5' : '#ffffff')
                  : '#1e293b';
              drawCenteredText(ctx, spVal, sp.x + sp.w / 2, rowY + dataRowH / 2, spMaxW);
            });
            cellRightX -= colW;
            return;
          }

          ctx.strokeStyle = isDarkRow ? '#475569' : '#0f172a';
          ctx.lineWidth = cellBorderW;
          ctx.strokeRect(cellX, rowY, colW, dataRowH);

          const isCustomBlankGradeCol = isCustomControlSheet && (
            col.key === 'addedTotal' ||
            col.key.startsWith('subj_') ||
            col.key === 'percentage' ||
            col.key === 'evaluation' ||
            col.key === 'studentRank' ||
            col.key === 'finalResult'
          );
          const val = isCustomBlankGradeCol ? '' : (cellValues[col.key] || '');
          const isSubjOrTotalCol = col.key === 'addedTotal' || col.key.startsWith('subj_');
          const isArabicVal = /[\u0600-\u06FF]/.test(val);
          ctx.direction = isArabicVal ? 'rtl' : col.dir || 'rtl';
          ctx.fillStyle = isDarkRow ? '#ffffff' : '#1e293b';
          const isMonoCol =
            col.key === 'nationalId' ||
            col.key === 'serial' ||
            col.key === 'seatNumber' ||
            col.key === 'committeeNumber' ||
            col.key === 'secretNumber' ||
            col.key.startsWith('seatNumber_') ||
            col.key.startsWith('secretNumber_') ||
            col.key.startsWith('committeeNumber_') ||
            (isSubjOrTotalCol && !isArabicVal);
          const fontFamily = isMonoCol ? '"Cairo", monospace' : '"Cairo", sans-serif';
          const maxCellTextW = isControlSheet ? colW - 8 : colW - 18;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (col.key === 'failedSubjects' && val && val !== '-') {
            const activeCount =
              reportType === 'mercy_grades_students' ? summary?.mercyCount : summary?.failedCount;
            const failedCountText =
              activeCount && activeCount !== '-' && activeCount !== '0'
                ? activeCount
                : String(val.split(' - ').filter(Boolean).length);

            // Draw circle with failed subjects count at the start (right side in RTL) of the cell
            const circleR = Math.min(17, Math.max(10, Math.floor((dataRowH - 12) / 2)));
            const circleCx = cellX + colW - 12 - circleR;
            const circleCy = rowY + dataRowH / 2;

            ctx.save();
            ctx.beginPath();
            ctx.arc(circleCx, circleCy, circleR, 0, Math.PI * 2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#dc2626';
            ctx.stroke();

            const countFontSize = Math.max(11, Math.floor(circleR * 1.05));
            ctx.direction = 'ltr';
            ctx.fillStyle = '#0f172a';
            ctx.font = `bold ${countFontSize}px "Cairo", monospace`;
            drawCenteredText(ctx, failedCountText, circleCx, circleCy, circleR * 1.7);
            ctx.restore();

            // Remaining width for failed subjects text to the left of the circle
            const textAreaLeft = cellX + 12;
            const textAreaRight = circleCx - circleR - 12;
            const availTextW = Math.max(40, textAreaRight - textAreaLeft);
            const textCenterX = textAreaLeft + availTextW / 2;

            ctx.direction = 'rtl';
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let fitFontSize = rowFontSize;
            ctx.font = `bold ${fitFontSize}px ${fontFamily}`;
            while (fitFontSize > 14 && ctx.measureText(val).width > availTextW) {
              fitFontSize -= 1;
              ctx.font = `bold ${fitFontSize}px ${fontFamily}`;
            }

            if (ctx.measureText(val).width <= availTextW || !val.includes(' - ') || dataRowH < 36) {
              while (fitFontSize > 10 && ctx.measureText(val).width > availTextW) {
                fitFontSize -= 0.5;
                ctx.font = `bold ${fitFontSize}px ${fontFamily}`;
              }
              drawCenteredText(ctx, val, textCenterX, rowY + dataRowH / 2, availTextW);
            } else {
              const parts = val.split(' - ');
              const mid = Math.ceil(parts.length / 2);
              const line1 = parts.slice(0, mid).join(' - ');
              const line2 = parts.slice(mid).join(' - ');
              let twoLineFontSize = Math.min(rowFontSize - 2, Math.floor(dataRowH * 0.36));
              ctx.font = `bold ${twoLineFontSize}px ${fontFamily}`;
              while (
                twoLineFontSize > 10 &&
                (ctx.measureText(line1).width > availTextW ||
                  ctx.measureText(line2).width > availTextW)
              ) {
                twoLineFontSize -= 0.5;
                ctx.font = `bold ${twoLineFontSize}px ${fontFamily}`;
              }
              const lineOffset = Math.max(twoLineFontSize * 0.58, dataRowH * 0.23);
              drawCenteredText(ctx, line1, textCenterX, rowY + dataRowH / 2 - lineOffset, availTextW);
              drawCenteredText(ctx, line2, textCenterX, rowY + dataRowH / 2 + lineOffset, availTextW);
            }
          } else {
            const isDemographicCol =
              isControlSheet &&
              (col.key === 'gender' ||
                col.key === 'enrollmentStatus' ||
                col.key === 'religion');
            const isCompactControlCol =
              isControlSheet &&
              (col.key === 'nationalId' || isDemographicCol);
            const isKgCompactControlCol = isCompactControlCol && isKindergartenStage;
            const cellFontScale = isKgCompactControlCol
              ? 0.6 * 1.25 * 0.9
              : isCompactControlCol
              ? 0.6 * 1.25
              : isControlSheet
              ? 0.8 * 1.25
              : 1;
            const isEnlargedNonKgCell =
              isNonKgControlSheet &&
              (col.key === 'name' ||
                col.key === 'addedTotal' ||
                col.key === 'percentage' ||
                col.key === 'evaluation' ||
                col.key === 'studentRank' ||
                col.key === 'seatNumber' ||
                col.key === 'secretNumber' ||
                col.key === 'committeeNumber' ||
                col.key.startsWith('seatNumber_') ||
                col.key.startsWith('secretNumber_') ||
                col.key.startsWith('committeeNumber_') ||
                col.key === 'finalResult' ||
                col.key.startsWith('subj_'));
            let fitFontSize = isNonKgControlSheet
              ? isDemographicCol
                ? 12
                : isCompactControlCol
                ? 11.5
                : isEnlargedNonKgCell
                ? 16
                : 13.5
              : rowFontSize * cellFontScale * kgSem2TableFontScale;
            const minCellFont =
              (isNonKgControlSheet
                ? isCompactControlCol
                  ? 8
                  : 9.5
                : isCompactControlCol
                ? 10.5
                : isControlSheet
                ? 11.5
                : 11) * kgSem2TableFontScale;
            const cellMaxW = isCompactControlCol
              ? colW - (isNonKgControlSheet ? 8 : col.key === 'enrollmentStatus' ? 14 : 8)
              : maxCellTextW;
            ctx.font = `bold ${fitFontSize}px ${fontFamily}`;
            if (isKindergartenStage && val.includes('برامج علاجية')) {
              fitFontSize = rowFontSize * cellFontScale * kgSem2TableFontScale;
            } else if (!isDemographicCol && (!isKgCompactControlCol || col.key === 'enrollmentStatus')) {
              while (fitFontSize > minCellFont && ctx.measureText(val).width > cellMaxW) {
                fitFontSize -= 0.5;
                ctx.font = `bold ${fitFontSize}px ${fontFamily}`;
              }
            }
            const isKgControlSheetEvalCol =
              isKindergartenStage && isControlSheet && col.key === 'evaluation';
            const kgEvalCircleColor =
              isKgControlSheetEvalCol && val && val !== '-' && val.trim() !== ''
                ? getKgEvalCellColor(val)?.bg ||
                  (summary?.addedTotal !== null && summary?.addedTotal !== undefined && controlSheetAddedTotalMax > 0
                    ? getKgColorFromPct((summary.addedTotal / controlSheetAddedTotalMax) * 100)
                    : undefined)
                : undefined;

            const kgCellColor =
              (isKindergartenStage && isControlSheet && col.key.startsWith('subj_')
                ? kgSubjectCellColors[col.key]
                : undefined) || kgEvalCircleColor;

            if (kgCellColor) {
              const diameter = Math.max(16, Math.min(colW - 12, dataRowH - 12));
              const radius = diameter / 2;
              const cx = cellX + colW / 2;
              const cy = rowY + dataRowH / 2;
              ctx.save();
              ctx.beginPath();
              ctx.arc(cx, cy, radius, 0, Math.PI * 2);
              ctx.fillStyle = kgCellColor;
              ctx.fill();
              ctx.lineWidth = 1;
              ctx.strokeStyle = '#000000';
              ctx.stroke();
              ctx.restore();
            } else {
              if (!isKgControlSheetEvalCol) {
                const isResultFail =
                  !isKindergartenStage &&
                  ((col.key === 'finalResult' && (val.includes('دور') || val.includes('راسب') || val.includes('دون') || val.includes('إعادة') || val.includes('إخفاق'))) ||
                  (col.key === 'evaluation' && (val.includes('دون المستوى') || val.includes('دون'))));
                const isSubjFail =
                  failedControlSheetSubjKeys.has(col.key) ||
                  (col.key.startsWith('subj_') && val === 'غ');
                const hasFailure = isSubjFail || isResultFail;
                if (hasFailure && isNonKgControlSheet && semester === 'second') {
                  ctx.fillStyle = '#fee2e2';
                  ctx.fillRect(cellX, rowY, colW, dataRowH);
                  ctx.strokeStyle = '#0f172a';
                  ctx.lineWidth = cellBorderW;
                  ctx.strokeRect(cellX, rowY, colW, dataRowH);
                }
                if (
                  hasFailure &&
                  !isSubjectReport &&
                  (!isNonKgControlSheet || semester !== 'second') &&
                  isNumericGrade(val)
                ) {
                  const cx = cellX + colW / 2;
                  const cy = rowY + dataRowH / 2;
                  const textW = ctx.measureText(val).width;
                  const ry = Math.max(10, Math.min(dataRowH / 2 - 4, isNonKgControlSheet ? 20 : 19));
                  const rx = Math.max(ry, Math.min(colW / 2 - 3, textW / 2 + 9));
                  ctx.save();
                  ctx.beginPath();
                  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                  ctx.lineWidth = 2.4;
                  ctx.strokeStyle = '#dc2626';
                  ctx.stroke();
                  ctx.restore();
                }
                ctx.fillStyle =
                  (isKindergartenStage && col.key === 'finalResult')
                    ? '#1e293b'
                    : hasFailure && isNonKgControlSheet && semester === 'second'
                    ? '#000000'
                    : isDarkRow
                    ? (hasFailure ? '#fca5a5' : '#ffffff')
                    : '#1e293b';
                drawCenteredText(ctx, val, cellX + colW / 2, rowY + dataRowH / 2, cellMaxW);
              }
            }
          }

          cellRightX -= colW;
        });
      });
    }

    ctx.restore();

    // Draw Outer Rounded Border of Table
    drawRoundedRect(ctx, marginX, tableTopY, contentW, tableTotalH, tableRadius);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = outerTableBorderW;
    ctx.stroke();

    columns.forEach((col, idx) => {
      if (!isBlankSepKey(col.key)) return;
      let sepRightX = marginX + contentW;
      for (let i = 0; i < idx; i++) {
        sepRightX -= colWidths[i];
      }
      const sepW = colWidths[idx];
      const sepX = sepRightX - sepW;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(
        sepX,
        tableTopY - outerTableBorderW - 1,
        sepW,
        tableTotalH + outerTableBorderW * 2 + 2
      );
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = cellBorderW;
      ctx.beginPath();
      ctx.moveTo(sepRightX, tableTopY);
      ctx.lineTo(sepRightX, tableTopY + tableTotalH);
      ctx.moveTo(sepX, tableTopY);
      ctx.lineTo(sepX, tableTopY + tableTotalH);
      ctx.stroke();
    });

    // 3b. Statistics Table below Students Table (for calling_list, secret_numbers, and pass/fail/second_round reports on last page)
    if (showStatsOnPage) {
      const statsTopY = tableTopY + tableTotalH + statsGap;
      const commNumberLabel = pageItems[0]?.committeeNumText || String(pageIdx + 1);
      const statsItems = isPassFailReport ? indexedStudents : pageItems;

      const totalComm = statsItems.length;
      const boysComm = statsItems.filter(
        (i) => i.student.gender === 'male' || i.student.gender === 'ذكر'
      ).length;
      const girlsComm = statsItems.filter(
        (i) =>
          i.student.gender === 'female' ||
          i.student.gender === 'أنثى' ||
          i.student.gender === 'انثى'
      ).length;
      const muslimComm = statsItems.filter(
        (i) => i.student.religion === 'muslim' || (i.student.religion || '').includes('ل')
      ).length;
      const christianComm = statsItems.filter(
        (i) => i.student.religion === 'christian' || (i.student.religion || '').includes('ح')
      ).length;

      let newOrTransComm = 0;
      let repeatingComm = 0;
      let damgComm = 0;

      statsItems.forEach((i) => {
        const normStatus = normalizeStatusForGrade(
          i.student.enrollmentStatus,
          isFirstGrade,
          i.student.gender
        );
        const rawStatus = (i.student.enrollmentStatus || '').trim();
        if (
          rawStatus.includes('دمج') ||
          normStatus.includes('دمج') ||
          i.student.enrollmentType?.includes('دمج')
        ) {
          damgComm++;
        }
        if (normStatus.includes('باق') || rawStatus.includes('باق')) {
          repeatingComm++;
        } else {
          newOrTransComm++;
        }
      });

      const totalLabel =
        reportType === 'passed_first_semester' ||
        reportType === 'passed_second_semester' ||
        reportType === 'subject_passed_first_semester' ||
        reportType === 'subject_passed_second_semester'
          ? 'إجمالي الناجحين'
          : reportType === 'failed_first_semester' ||
            reportType === 'failed_second_semester' ||
            reportType === 'subject_failed_first_semester' ||
            reportType === 'subject_failed_second_semester'
          ? (isKindergartenStage && (reportType === 'failed_second_semester' || reportType === 'subject_failed_second_semester')
              ? 'إجمالي من لهم برامج علاجية'
              : isKindergartenStage && (reportType === 'failed_first_semester' || reportType === 'subject_failed_first_semester')
              ? 'إجمالي من لهم برامج علاجية'
              : 'إجمالي الراسبين')
          : reportType === 'second_round_students' || reportType === 'subject_second_round'
          ? (isKindergartenStage ? 'إجمالي برامج علاجية' : 'إجمالي الدور الثانى')
          : isTopTenReport
          ? 'إجمالي الأوائل'
          : reportType === 'mercy_grades_students'
          ? 'إجمالي المستحقين'
          : isKindergartenStage
          ? 'إجمالي التلاميذ'
          : 'إجمالي اللجنة';

      const statsTitleText =
        reportType === 'passed_first_semester'
          ? 'إحصائيات الناجحين - اعتبارا - فى الفصل الدراسي الأول'
          : reportType === 'passed_second_semester'
          ? 'إحصائيات الناجحين فى الفصل الدراسي الثانى'
          : reportType === 'failed_first_semester'
          ? (isKindergartenStage
              ? 'إحصائيات التلاميذ من لهم برامج علاجية - فى الفصل الدراسي الأول'
              : 'إحصائيات الراسبين - اعتبارا - فى الفصل الدراسي الأول')
          : reportType === 'failed_second_semester'
          ? (isKindergartenStage
              ? 'إحصائيات التلاميذ من لهم برامج علاجية - فى الفصل الدراسي الثانى'
              : 'إحصائيات الراسبين فى الفصل الدراسي الثانى')
          : reportType === 'second_round_students'
          ? (isKindergartenStage
              ? 'إحصائيات تلاميذ برامج علاجية'
              : 'إحصائيات طلاب الدور الثانى')
          : reportType === 'top_ten_students'
          ? 'إحصائيات العشرة الأوائل - TOP 10'
          : reportType === 'top_ten_damg_students'
          ? 'إحصائيات العشرة الأوائل - TOP 10 - دمج'
          : reportType === 'mercy_grades_students'
          ? 'إحصائيات طلاب يستحقون درجات الرأفة'
          : reportType === 'subject_passed_first_semester'
          ? 'إحصائيات الناجحين - اعتبارا - فى الفصل الدراسي الأول'
          : reportType === 'subject_failed_first_semester'
          ? (isKindergartenStage
              ? 'إحصائيات التلاميذ من لهم برامج علاجية - فى الفصل الدراسي الأول'
              : 'إحصائيات الراسبين - اعتبارا - فى الفصل الدراسي الأول')
          : reportType === 'subject_passed_second_semester'
          ? 'إحصائيات الناجحين فى الفصل الدراسي الثانى'
          : reportType === 'subject_failed_second_semester'
          ? (isKindergartenStage
              ? 'إحصائيات التلاميذ من لهم برامج علاجية - فى الفصل الدراسي الثانى'
              : 'إحصائيات الراسبين فى الفصل الدراسي الثانى')
          : reportType === 'subject_second_round'
          ? (isKindergartenStage
              ? 'إحصائيات التلاميذ من يحتاجون برامج علاجية'
              : 'إحصائيات الطلاب من لهم دور ثان')
          : isKindergartenStage
          ? 'إحصائيات التلاميذ'
          : `إحصائيات اللجنة ( ${commNumberLabel} )`;

      const statsCols = [
        ...(isSubjectReport
          ? [{ label: isKindergartenStage ? 'إجمالي عدد التلاميذ' : 'إجمالي عدد الطلاب', value: String(rawStudents.length) }]
          : []),
        { label: totalLabel, value: String(totalComm) },
        { label: 'بنين', value: String(boysComm) },
        { label: 'بنات', value: String(girlsComm) },
        { label: 'مسلم', value: String(muslimComm) },
        { label: 'مسيحي', value: String(christianComm) },
        ...(!isKindergartenStage
          ? [
              { label: isFirstGrade ? 'مستجد' : 'منقول', value: String(newOrTransComm) },
              { label: 'باق', value: String(repeatingComm) },
            ]
          : []),
        ...(isTopTenReport ? [] : [{ label: 'دمج', value: String(damgComm) }]),
      ];

      const statsColW = Math.floor(contentW / statsCols.length);
      const statsColWidths = statsCols.map((_, idx) =>
        idx === statsCols.length - 1
          ? contentW - statsColW * (statsCols.length - 1)
          : statsColW
      );

      if (isKindergartenStage) {
        statsCols.forEach((sc, idx) => {
          if (sc.label.includes('برامج علاجية')) {
            const hFont = isSubjectReport ? 18 : 21;
            ctx.font = `bold ${hFont}px "Cairo", sans-serif`;
            const textW = ctx.measureText(sc.label).width;
            const neededW = Math.ceil(textW * 1.05) + 20;
            if (statsColWidths[idx] < neededW) {
              const diff = neededW - statsColWidths[idx];
              statsColWidths[idx] = neededW;
              const others = statsCols.map((_, i) => i).filter(i => i !== idx && !statsCols[i].label.includes('برامج علاجية'));
              if (others.length > 0) {
                let rem = diff;
                others.forEach((oi, oIdx) => {
                  const cut = oIdx === others.length - 1 ? rem : Math.floor(diff / others.length);
                  statsColWidths[oi] = Math.max(50, statsColWidths[oi] - cut);
                  rem -= cut;
                });
              }
            }
          }
        });
        const reSumStats = statsColWidths.reduce((acc, w) => acc + w, 0);
        statsColWidths[statsColWidths.length - 1] += contentW - reSumStats;
      }

      ctx.save();
      drawRoundedRect(ctx, marginX, statsTopY, contentW, statsTableH, 14);
      ctx.clip();

      // Title bar for Statistics
      const statsTitleGrad = ctx.createLinearGradient(
        marginX,
        statsTopY,
        marginX + contentW,
        statsTopY
      );
      statsTitleGrad.addColorStop(0, '#5eead4');
      statsTitleGrad.addColorStop(0.5, '#ccfbf1');
      statsTitleGrad.addColorStop(1, '#5eead4');
      ctx.fillStyle = statsTitleGrad;
      ctx.fillRect(marginX, statsTopY, contentW, statsTitleRowH);

      ctx.direction = 'rtl';
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${isSubjectReport ? 21 : 23}px "Cairo", sans-serif`;
      drawCenteredText(
        ctx,
        statsTitleText,
        marginX + contentW / 2,
        statsTopY + statsTitleRowH / 2,
        contentW - 24
      );

      // Stats Header Row & Values Row
      const statsHeaderY = statsTopY + statsTitleRowH;
      const statsValY = statsHeaderY + statsHeaderRowH;

      ctx.fillStyle = headerGrad;
      ctx.fillRect(marginX, statsHeaderY, contentW, statsHeaderRowH);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(marginX, statsValY, contentW, statsValRowH);

      let sRightX = marginX + contentW;
      statsCols.forEach((sc, idx) => {
        const w = statsColWidths[idx];
        const x = sRightX - w;

        // Header cell
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, statsHeaderY, w, statsHeaderRowH);
        ctx.direction = 'rtl';
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${isSubjectReport ? 18 : 21}px "Cairo", sans-serif`;
        drawCenteredText(ctx, sc.label, x + w / 2, statsHeaderY + statsHeaderRowH / 2, w - 10);

        // Value cell
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, statsValY, w, statsValRowH);
        ctx.direction = 'ltr';
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${isSubjectReport ? 20 : 24}px "Cairo", monospace`;
        drawCenteredText(ctx, sc.value, x + w / 2, statsValY + statsValRowH / 2, w - 10);

        sRightX -= w;
      });

      ctx.restore();

      drawRoundedRect(ctx, marginX, statsTopY, contentW, statsTableH, 14);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 3c. Second Row of Statistics for Subject Reports:
      // Right Box: نسب الطلاب فى الصف الدراسي (ناجحين، راسبين، لهم دور ثان)
      // Left Box: إحصائيات التقديرات الموجودة فى الملف
      if (isSubjectReport) {
        const row2TopY = statsTopY + statsTableH + subjectSecondRowGap;
        const boxesGapX = 9;
        const rightBoxW = Math.floor((contentW - boxesGapX) * 0.54);
        const leftBoxW = contentW - boxesGapX - rightBoxW;
        const rightBoxX = marginX + contentW - rightBoxW;
        const leftBoxX = marginX;

        const totalGradeDenom = rawStudents.length;
        const fmtPct = (cnt: number) =>
          totalGradeDenom > 0
            ? `${roundToOneDecimal((cnt / totalGradeDenom) * 100)} %`
            : '0 %';

        const isFirstSemReport =
          semester === 'first' ||
          reportType === 'subject_passed_first_semester' ||
          reportType === 'subject_failed_first_semester';

        const gradeRatiosCols = isKindergartenStage
          ? [
              {
                label: 'إجمالي عدد التلاميذ',
                value: String(totalGradeDenom),
              },
              {
                label: 'نسبة التلاميذ الناجحين',
                value: fmtPct(subjectGradePassCount),
              },
              {
                label: 'نسبة التلاميذ من يحتاجون برامج علاجية',
                value: fmtPct(subjectGradeFailCount),
              },
            ]
          : [
              {
                label: 'إجمالي عدد الطلاب',
                value: String(totalGradeDenom),
              },
              {
                label: 'نسبة الطلاب الناجحين',
                value: fmtPct(subjectGradePassCount),
              },
              {
                label: isFirstSemReport
                  ? 'نسبة الطلاب الراسبين اعتبارا'
                  : 'نسبة الطلاب الراسبين',
                value: fmtPct(subjectGradeFailCount),
              },
              ...(!isFirstSemReport
                ? [
                    {
                      label: 'نسبة الطلاب من لهم دور ثان',
                      value: fmtPct(subjectGradeSecondRoundCount),
                    },
                  ]
                : []),
            ];

        const { customCols: subjCustomCols, defaultSubjectsOverrides: subjOvrs } =
          getSubjectsConfigForStageGrade(stage, selectedGrade);
        const targetSubjectCol = subjCustomCols.find((c) => c.key === subjectKey);
        const isSubjectPassFail =
          !isKindergartenStage &&
          (targetSubjectCol?.learningOutcomesType === 'pass_fail' ||
            subjOvrs?.[subjectKey]?.learningOutcomesType === 'pass_fail' ||
            (!targetSubjectCol?.learningOutcomesType &&
              !subjOvrs?.[subjectKey]?.learningOutcomesType &&
              ((stage !== 'secondary' && subjectKey === 'pe') ||
                subjectKey === 'tokkatsu' ||
                (stage === 'primary' &&
                  (subjectKey === 'religion' ||
                    subjectKey === 'art' ||
                    subjectKey === 'fields' ||
                    subjectKey === 'music')))));

        let passOutcomesCount = 0;
        let failOutcomesCount = 0;
        const evalCounts: Record<string, number> = {
          'ممتاز': 0,
          'جيد جداً': 0,
          'جيد': 0,
          'مقبول': 0,
          'دون المستوى': 0,
          'يفوق التوقعات دائماً': 0,
          'يفوق التوقعات': 0,
          'يلبي التوقعات': 0,
          'يلبي التوقعات أحياناً': 0,
          'أقل من المتوقع': 0,
          'أقل من التوقعات': 0,
        };
        students.forEach((st) => {
          const ev = summariesById.get(st.id)?.evaluation;
          if (ev === 'اجتاز') {
            passOutcomesCount++;
          } else if (ev === 'لم يجتاز') {
            failOutcomesCount++;
          } else if (ev && evalCounts[ev] !== undefined) {
            evalCounts[ev]++;
          }
        });

        const evalTableTitle = isSubjectPassFail
          ? reportType === 'subject_failed_first_semester' ||
            reportType === 'subject_failed_second_semester'
            ? 'إحصائيات الطلاب الراسبين (لم يجتاز)'
            : 'إحصائيات نواتج التعلم (اجتاز - لم يجتاز)'
          : isKindergartenStage
          ? 'إحصائيات تقييمات التلاميذ'
          : reportType === 'subject_failed_first_semester' ||
            reportType === 'subject_failed_second_semester'
          ? 'إحصائيات تقديرات الطلاب الراسبين'
          : reportType === 'subject_second_round'
          ? 'إحصائيات تقديرات الطلاب من لهم دور ثان'
          : 'إحصائيات تقديرات الطلاب الناجحين';

        const fileEvalCols = isSubjectPassFail
          ? [
              { label: 'اجتاز', value: String(passOutcomesCount) },
              { label: 'لم يجتاز', value: String(failOutcomesCount) },
            ]
          : isKindergartenStage
          ? [
              {
                label: '',
                value: String((evalCounts['يفوق التوقعات دائماً'] || 0) + (evalCounts['يفوق التوقعات'] || 0)),
                headerBgColor: '#0078d7',
                hideHeaderLabel: true,
              },
              {
                label: '',
                value: String(evalCounts['يلبي التوقعات'] || 0),
                headerBgColor: '#16c60c',
                hideHeaderLabel: true,
              },
              {
                label: '',
                value: String(evalCounts['يلبي التوقعات أحياناً'] || 0),
                headerBgColor: '#ffff00',
                hideHeaderLabel: true,
              },
              {
                label: '',
                value: String((evalCounts['أقل من المتوقع'] || 0) + (evalCounts['أقل من التوقعات'] || 0)),
                headerBgColor: '#e81123',
                hideHeaderLabel: true,
              },
            ]
          : [
              { label: 'ممتاز', value: String(evalCounts['ممتاز']) },
              { label: 'جيد جداً', value: String(evalCounts['جيد جداً']) },
              { label: 'جيد', value: String(evalCounts['جيد']) },
              { label: 'مقبول', value: String(evalCounts['مقبول']) },
              { label: 'دون المستوى', value: String(evalCounts['دون المستوى']) },
            ];

        const drawSubStatsTable = (
          boxX: number,
          boxY: number,
          boxW: number,
          boxTitle: string,
          colsList: { label: string; value: string }[],
          isRtlValue = false
        ) => {
          const cW = Math.floor(boxW / colsList.length);
          const cWidths = colsList.map((_, i) =>
            i === colsList.length - 1 ? boxW - cW * (colsList.length - 1) : cW
          );

          if (isKindergartenStage) {
            colsList.forEach((colItem, idx) => {
              if (colItem.label.includes('برامج علاجية')) {
                const hFont = 16;
                ctx.font = `bold ${hFont}px "Cairo", sans-serif`;
                const textW = ctx.measureText(colItem.label).width;
                const neededW = Math.ceil(textW * 1.05) + 18;
                if (cWidths[idx] < neededW) {
                  const diff = neededW - cWidths[idx];
                  cWidths[idx] = neededW;
                  const others = colsList.map((_, i) => i).filter(i => i !== idx && !colsList[i].label.includes('برامج علاجية'));
                  if (others.length > 0) {
                    let rem = diff;
                    others.forEach((oi, oIdx) => {
                      const cut = oIdx === others.length - 1 ? rem : Math.floor(diff / others.length);
                      cWidths[oi] = Math.max(30, cWidths[oi] - cut);
                      rem -= cut;
                    });
                  }
                }
              }
            });
            const reSum = cWidths.reduce((acc, w) => acc + w, 0);
            cWidths[cWidths.length - 1] += boxW - reSum;
          }

          ctx.save();
          drawRoundedRect(ctx, boxX, boxY, boxW, statsTableH, 14);
          ctx.clip();

          const tGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY);
          tGrad.addColorStop(0, '#5eead4');
          tGrad.addColorStop(0.5, '#ccfbf1');
          tGrad.addColorStop(1, '#5eead4');
          ctx.fillStyle = tGrad;
          ctx.fillRect(boxX, boxY, boxW, statsTitleRowH);

          ctx.direction = 'rtl';
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 20px "Cairo", sans-serif';
          drawCenteredText(ctx, boxTitle, boxX + boxW / 2, boxY + statsTitleRowH / 2, boxW - 20);

          const hY = boxY + statsTitleRowH;
          const vY = hY + statsHeaderRowH;

          const subHeaderGrad = ctx.createLinearGradient(boxX, hY, boxX + boxW, hY);
          subHeaderGrad.addColorStop(0, '#fde2e4');
          subHeaderGrad.addColorStop(0.5, '#e2e8f0');
          subHeaderGrad.addColorStop(1, '#fef3c7');
          ctx.fillStyle = subHeaderGrad;
          ctx.fillRect(boxX, hY, boxW, statsHeaderRowH);

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(boxX, vY, boxW, statsValRowH);

          let curX = boxX + boxW;
          colsList.forEach((colItem, idx) => {
            const w = cWidths[idx];
            const x = curX - w;

            if ((colItem as any).headerBgColor) {
              ctx.fillStyle = (colItem as any).headerBgColor;
              ctx.fillRect(x, hY, w, statsHeaderRowH);
            }
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, hY, w, statsHeaderRowH);

            if (!(colItem as any).hideHeaderLabel && colItem.label) {
              ctx.direction = 'rtl';
              ctx.fillStyle = '#0f172a';
              let hFont = 16;
              ctx.font = `bold ${hFont}px "Cairo", sans-serif`;
              if (!isKindergartenStage || !colItem.label.includes('برامج علاجية')) {
                while (hFont > 11 && ctx.measureText(colItem.label).width > w - 10) {
                  hFont -= 0.5;
                  ctx.font = `bold ${hFont}px "Cairo", sans-serif`;
                }
              }
              drawCenteredText(ctx, colItem.label, x + w / 2, hY + statsHeaderRowH / 2, w - 8);
            }

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, vY, w, statsValRowH);

            ctx.direction = isRtlValue ? 'rtl' : 'ltr';
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 20px "Cairo", monospace';
            drawCenteredText(ctx, colItem.value, x + w / 2, vY + statsValRowH / 2, w - 8);

            curX -= w;
          });

          ctx.restore();

          drawRoundedRect(ctx, boxX, boxY, boxW, statsTableH, 14);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.stroke();
        };

        drawSubStatsTable(
          rightBoxX,
          row2TopY,
          rightBoxW,
          isKindergartenStage ? 'إحصائيات نسب التلاميذ' : 'إحصائيات نسب الطلاب',
          gradeRatiosCols
        );

        drawSubStatsTable(
          leftBoxX,
          row2TopY,
          leftBoxW,
          evalTableTitle,
          fileEvalCols
        );
      }
    }

    if (isControlSheet) {
      const signBarY = Math.max(
        tableTopY + tableTotalH + 8,
        heightPx - footerTopReserve - controlSheetSignBarH - 8
      );
      const signBarRadius = 14;
      const signBarW = isNonKgControlSheet ? Math.round(widthPx * 0.4) : contentW;
      const signBarX = isNonKgControlSheet ? Math.round((widthPx - signBarW) / 2) : marginX;

      if (hasNonKgSem2Legend) {
        ctx.save();
        const semLegendY = signBarY + controlSheetSignBarH / 2;
        const sem1Text = 'ف 1 = الفصل الدراسي الأول';
        const sem2Text = 'ف 2 = الفصل الدراسي الثانى';
        ctx.direction = 'rtl';
        ctx.font = `bold ${13 * (isControlSheet ? 1.2 : 1.0)}px "Cairo", sans-serif`;
        ctx.fillStyle = '#0f172a';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        const sem2LeftX = marginX;
        ctx.fillText(sem2Text, sem2LeftX, semLegendY);
        const sem2W = ctx.measureText(sem2Text).width;
        const sem1LeftX = sem2LeftX + sem2W + 24;
        ctx.fillText(sem1Text, sem1LeftX, semLegendY);
        ctx.restore();
      }
      const dotsText = isNonKgControlSheet
        ? '- - - - - - - - - - - - - - -'
        : '- - - - - - - - - - - - - - - - - -';
      const signCells = [
        { text: 'أملاه', weight: 0.43, isDots: false },
        { text: dotsText, weight: 0.57, isDots: true },
        { text: 'كتبه', weight: 0.43, isDots: false },
        { text: dotsText, weight: 0.57, isDots: true },
        { text: 'راجعه', weight: 0.43, isDots: false },
        { text: dotsText, weight: 0.57, isDots: true },
      ];
      const totalSignWeight = signCells.reduce((s, c) => s + c.weight, 0);
      const signColWidths = signCells.map((c) =>
        Math.floor((c.weight / totalSignWeight) * signBarW)
      );
      const usedSignW = signColWidths.reduce((s, w) => s + w, 0);
      signColWidths[signColWidths.length - 1] += signBarW - usedSignW;

      ctx.save();
      drawRoundedRect(ctx, signBarX, signBarY, signBarW, controlSheetSignBarH, signBarRadius);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.clip();

      let sCurRightX = signBarX + signBarW;
      signCells.forEach((sc, idx) => {
        const w = signColWidths[idx];
        const x = sCurRightX - w;

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, signBarY, w, controlSheetSignBarH);

        ctx.direction = sc.isDots ? 'ltr' : 'rtl';
        ctx.fillStyle = '#0f172a';
        ctx.font = sc.isDots
          ? `bold ${(isNonKgControlSheet ? 14 : 18 * 0.75) * (isControlSheet ? 1.2 : 1.0)}px "Cairo", monospace`
          : `bold ${(isNonKgControlSheet ? 14 : 20 * 0.75) * (isControlSheet ? 1.2 : 1.0)}px "Cairo", sans-serif`;
        drawCenteredText(
          ctx,
          sc.text,
          x + w / 2,
          signBarY + controlSheetSignBarH / 2,
          w - 12
        );

        sCurRightX -= w;
      });

      ctx.restore();

      drawRoundedRect(ctx, signBarX, signBarY, signBarW, controlSheetSignBarH, signBarRadius);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    }

    // 4. Footer (رقم الصفحة - التاريخ - مسئول البيانات والمعلومات : س   رئيس الكنترول : ص   رئيس اللجنة : ع) + <hr> + المنظومة الرقمية...
    const footerLineY = heightPx - 102;
    const hasFooterQr = Boolean(
      !isSeatNumbersCard &&
      reportType !== 'seat_numbers_no_qr' &&
      qrImage
    );
    const footerQrSize = 90;
    const footerQrX = marginX + contentW - footerQrSize;
    const footerQrY = footerLineY + 6;
    const footerAvailW = hasFooterQr ? contentW - footerQrSize - 16 : contentW;
    const footerCenterX = marginX + footerAvailW / 2;

    const pageNumberText = `صفحة ${pageIdx + 1} من ${totalPages}`;

    // Date (28 - 9 - 2026 م)
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
    } catch {
      // Fallback to local system date
    }
    const dateDisplay = `${day} - ${month} - ${year} م`;

    // الخط الفاصل أعلى سطر مسئول البيانات في التذييل
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(marginX, footerLineY);
    ctx.lineTo(marginX + contentW, footerLineY);
    ctx.stroke();

    if (qrImage) {
      ctx.save();
      drawRoundedRect(ctx, footerQrX, footerQrY, footerQrSize, footerQrSize, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.clip();
      ctx.drawImage(qrImage, footerQrX, footerQrY, footerQrSize, footerQrSize);
      ctx.restore();
    }

    const footerTextY = heightPx - 76;
    ctx.direction = 'rtl';
    ctx.fillStyle = '#0f172a';
    ctx.textBaseline = 'middle';

    const dataOfficerDisplay = dataOfficer.trim()
      ? dataOfficer.trim()
      : '................';
    const controlHeadDisplay = controlHead.trim()
      ? controlHead.trim()
      : '................';
    const committeeHeadDisplay = committeeHead.trim()
      ? committeeHead.trim()
      : '................';

    const signaturesFooterText = `مسئول البيانات والمعلومات : ${dataOfficerDisplay}   رئيس الكنترول : ${controlHeadDisplay}   رئيس اللجنة : ${committeeHeadDisplay}`;
    let footerFontSize = (isNonKgControlSheet ? 13.5 : isPortrait ? 14.5 : 18) * (isControlSheet ? 1.15 : 1.0);
    const minFooterFont = (isNonKgControlSheet ? 8 : 9.5) * (isControlSheet ? 1.15 : 1.0);
    ctx.font = `bold ${footerFontSize}px "Cairo", sans-serif`;

    // 1. كتابة (رقم الصفحة - التاريخ) فى أقصى يسار سطر مسئول البيانات فى الملفات المولدة ما عدا أرقام الجلوس
    let pageInfoRightEdge = marginX;
    if (!isSeatNumbersCard) {
      const pageInfoText = `${pageNumberText} - ${dateDisplay}`;
      let pageInfoFontSize = (isNonKgControlSheet ? 11 : isPortrait ? 13 : 14.5) * (isControlSheet ? 1.15 : 1.0);
      ctx.font = `bold ${pageInfoFontSize}px "Cairo", sans-serif`;
      const pageInfoLeftX = marginX + (isNonKgControlSheet ? 20 : 16);
      ctx.textAlign = 'left';
      ctx.fillText(pageInfoText, pageInfoLeftX, footerTextY);
      pageInfoRightEdge = pageInfoLeftX + ctx.measureText(pageInfoText).width;
    }

    // 2. سطر التوقيعات: في يمين الصفحة في ملفات PDF الرأسية فقط، وفي وسط الصفحة في ملفات PDF الأفقية
    ctx.direction = 'rtl';
    const rightTargetX = marginX + (isControlSheet ? contentW - 20 : footerAvailW - 16);
    const centerTargetX = isControlSheet ? (widthPx / 2) : footerCenterX;
    const maxSigW = isPortrait
      ? Math.max(300, rightTargetX - (pageInfoRightEdge + 30))
      : (isControlSheet ? (contentW - 40) : (footerAvailW - 32));

    while (footerFontSize > minFooterFont && ctx.measureText(signaturesFooterText).width > maxSigW) {
      footerFontSize -= 0.5;
      ctx.font = `bold ${footerFontSize}px "Cairo", sans-serif`;
    }

    if (isPortrait) {
      // في ملفات PDF الرأسية فقط: جعل نص مسئول البيانات والمعلومات في يمين الصفحة
      ctx.textAlign = 'right';
      ctx.fillText(signaturesFooterText, rightTargetX, footerTextY);
    } else {
      // في ملفات PDF الأفقية: في وسط الصفحة
      ctx.textAlign = 'center';
      ctx.fillText(signaturesFooterText, centerTargetX, footerTextY);
    }

    // Horizontal Line (<hr>) and Bottom Smaller Text below Footer
    const isFooterEnabled = localStorage.getItem('isDefaultFooterEnabled') !== 'false';
    if (isFooterEnabled) {
      const subFooterHrY = heightPx - 50;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(marginX, subFooterHrY);
      ctx.lineTo(marginX + footerAvailW, subFooterHrY);
      ctx.stroke();
  
      const subFooterTextY = heightPx - 25;
      const subFooterFontSize = (isNonKgControlSheet
        ? 8
        : Math.max(10, Math.min(15, footerFontSize - 3))) * (isControlSheet ? 1.2 : 1.0);
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#334155';
      ctx.font = `bold ${subFooterFontSize}px "Cairo", sans-serif`;
      ctx.fillText(
        'المنظومة الرقمية لريادة أعمال المدارس المصرية  01098594956 - 01131097055',
        footerCenterX,
        subFooterTextY,
        footerAvailW - 16
      );
    }

    const dataUrl = canvas.toDataURL('image/jpeg', isNonKgControlSheet ? 1.0 : 0.95);
    const base64 = dataUrl.split(',')[1];
    const jpegBytes = base64ToUint8Array(base64);
    renderedPages.push({ jpegBytes, widthPx: canvas.width, heightPx: canvas.height });
  }

  const pdfBytes = buildPdfFromJpegPages(
    renderedPages,
    isNonKgControlSheet ? 2383.94 : isPortrait ? 595.28 : 841.89,
    isNonKgControlSheet ? 1683.78 : isPortrait ? 841.89 : 595.28
  );
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const baseTitleForFile =
    isSubjectReport ||
    reportType === 'passed_first_semester' ||
    reportType === 'passed_second_semester' ||
    reportType === 'failed_first_semester' ||
    reportType === 'failed_second_semester' ||
    reportType === 'second_round_students' ||
    isControlSheet
      ? (title || (isKindergartenStage ? 'بيانات_التلاميذ' : 'بيانات_الطلاب'))
          .replace(/\s*-\s*الفصل\s+الدراس[يى]\s+(?:الأول|الاول|الثان[يى])/g, '')
          .replace(/الفصل\s+الدراس[يى]\s+(?:الأول|الاول|الثان[يى])\s*-\s*/g, '')
          .replace(/\s*-\s*(?:1st|2nd|First|Second)\s+Semester/gi, '')
          .replace(/^المرحلة\s*:\s*رياض\s*[أا]طفال/, 'رياض الأطفال')
          .trim()
      : title || (isKindergartenStage ? 'بيانات_التلاميذ' : 'بيانات_الطلاب');
  const safeTitle = baseTitleForFile.replace(/[\\/:*?"<>|]/g, '_');
  const safeSubject = (subjectLabelDisplay || '').replace(/[\\/:*?"<>|]/g, '_');
  const filePrefix =
    reportType === 'calling_list'
      ? 'تقارير_المناداة'
      : reportType === 'seat_numbers_default'
      ? 'أرقام_الجلوس_النموذج_الافتراضي'
      : reportType === 'seat_numbers' || reportType === 'seat_numbers_model_1'
      ? 'أرقام_الجلوس_نموذج_1'
      : reportType === 'seat_numbers_model_2'
      ? 'أرقام_الجلوس_نموذج_2'
      : reportType === 'seat_numbers_model_3'
      ? 'أرقام_الجلوس_نموذج_3'
      : reportType === 'seat_numbers_model_4'
      ? 'أرقام_الجلوس_نموذج_4'
      : reportType === 'seat_numbers_model_5'
      ? 'أرقام_الجلوس_نموذج_5'
      : reportType === 'seat_numbers_model_6'
      ? 'أرقام_الجلوس_نموذج_6'
      : reportType === 'seat_numbers_model_7'
      ? 'أرقام_الجلوس_نموذج_7'
      : reportType === 'seat_numbers_no_qr'
      ? 'أرقام_جلوس_بدون_كيو_ار_كود'
      : reportType === 'seat_numbers_english' || (Boolean(reportType) && reportType.startsWith('seat_numbers_english'))
      ? `Seat_Numbers_in_English${reportType.includes('model_') ? '_' + reportType.split('model_')[1] : ''}`
      : reportType === 'secret_numbers'
      ? 'الأرقام_السرية'
      : reportType === 'passed_first_semester'
      ? 'الناجحون_اعتبارا_فى_الفصل_الدراسي_الأول'
      : reportType === 'passed_second_semester'
      ? 'الناجحون_فى_الفصل_الدراسي_الثانى'
      : reportType === 'failed_first_semester'
      ? (isKindergartenStage
          ? 'لهم_برامج_علاجية_فى_الفصل_الدراسي_الأول'
          : 'الراسبون_اعتبارا_فى_الفصل_الدراسي_الأول')
      : reportType === 'failed_second_semester'
      ? (isKindergartenStage
          ? 'لهم_برامج_علاجية_فى_الفصل_الدراسي_الثانى'
          : 'الراسبون_فى_الفصل_الدراسي_الثانى')
      : reportType === 'second_round_students'
      ? (isKindergartenStage ? 'تلاميذ_برامج_علاجية' : 'طلاب_الدور_الثانى')
      : reportType === 'top_ten_students'
      ? 'العشرة_الأوائل_TOP_10'
      : reportType === 'top_ten_damg_students'
      ? 'العشرة_الأوائل_TOP_10_دمج'
      : reportType === 'mercy_grades_students'
      ? 'طلاب_يستحقون_درجات_الرأفة'
      : reportType === 'subject_passed_first_semester'
      ? `الناجحون_اعتبارا_فى_الفصل_الدراسي_الأول_مادة_${safeSubject}`
      : reportType === 'subject_failed_first_semester'
      ? (isKindergartenStage
          ? `لهم_برامج_علاجية_فى_الفصل_الدراسي_الأول_مادة_${safeSubject}`
          : `الراسبون_اعتبارا_فى_الفصل_الدراسي_الأول_مادة_${safeSubject}`)
      : reportType === 'subject_passed_second_semester'
      ? `الناجحون_فى_الفصل_الدراسي_الثانى_مادة_${safeSubject}`
      : reportType === 'subject_failed_second_semester'
      ? (isKindergartenStage
          ? `لهم_برامج_علاجية_فى_الفصل_الدراسي_الثانى_مادة_${safeSubject}`
          : `الراسبون_فى_الفصل_الدراسي_الثانى_مادة_${safeSubject}`)
      : reportType === 'subject_second_round'
      ? (isKindergartenStage
          ? `يحتاجون_برامج_علاجية_مادة_${safeSubject}`
          : `لهم_دور_ثان_مادة_${safeSubject}`)
      : reportType === 'general_statistics'
      ? (isKindergartenStage ? 'إحصائيات_التلاميذ' : 'إحصائيات_الطلاب')
      : reportType === 'statistics_and_charts'
      ? 'الإحصائيات_والرسوم_البيانية'
      : reportType === 'control_sheet'
      ? semester === 'first'
        ? 'شيت_كنترول_الفصل_الدراسي_الأول'
        : 'شيت_كنترول_الفصل_الدراسي_الثانى'
      : reportType === 'blank_control_sheet'
      ? 'شيت_كنترول_فارغ_للرصد_والتحرير_اليدوى'
      : reportType === 'custom_control_sheet'
      ? 'شيت_كنترول_مخصص'
      : (isKindergartenStage ? 'بيانات_تلاميذ' : 'بيانات_طلاب');
  link.download = `${filePrefix}_${safeTitle}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export {
  exportKgStudentEvaluationsReportPdf,
  KG_TEACHER_RECOMMENDATIONS,
  getRandomKgTeacherRecommendation,
} from './kgAssessmentsReportHelper';
