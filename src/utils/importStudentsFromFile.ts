export interface ImportStudentsResult {
  names: string[];
  fileName: string;
  sourceType: 'excel' | 'word';
  error?: string;
}

const ARABIC_DIGITS_MAP: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

function toWesternDigits(str: string): string {
  return str.replace(/[٠-٩]/g, (d) => ARABIC_DIGITS_MAP[d] ?? d);
}

function normalizeArabicForMatch(text: string): string {
  return toWesternDigits(text)
    .replace(/[\u0640\u064B-\u065F\u0670\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function cleanCandidateName(raw: string): string {
  if (!raw) return '';
  let cleaned = raw
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u00A0]/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip leading bullets or list numbers like "1-", "1.", "(1)", "١ -", "•"
  cleaned = cleaned
    .replace(/[\u061C\u2066-\u2069]/g, '')
    .replace(/^\s*(?:\([\d٠-٩]+\)|[\d٠-٩]+\s*[-–—.):/\\]+|[•●○▪▫■□◆◇★☆*]+)\s*/u, '')
    .replace(/^\s*[-–—]+\s*/, '')
    .trim();

  return cleaned;
}

function parseSerialNumber(raw: string): number | null {
  if (!raw) return null;
  const normalized = toWesternDigits(raw)
    .replace(/[\u061C\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00A0]/g, '')
    .trim();
  const match = normalized.match(/^\(?(\d{1,4})\)?[-–—.)]*$/);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  return Number.isFinite(val) && val >= 1 ? val : null;
}

const EXACT_NON_NAME_WORDS = new Set([
  'م',
  'ت',
  'رقم',
  'الرقم',
  'مسلسل',
  'الكود',
  'كود',
  'الاسم',
  'الاسماء',
  'اسماء',
  'اسم',
  'اسم الطالب',
  'اسم الطالبه',
  'اسم التلميذ',
  'اسم التلميذه',
  'اسماء الطلاب',
  'اسماء الطالبات',
  'اسماء التلاميذ',
  'اسماء التلميذات',
  'الاسم ثلاثي',
  'الاسم رباعي',
  'الاسم خماسي',
  'الاسم بالكامل',
  'الاسم الكامل',
  'الاسم كامل',
  'رباعي',
  'ثلاثي',
  'خماسي',
  'بالعربي',
  'باللغه العربيه',
  'الرقم القومي',
  'تاريخ الميلاد',
  'تاريخ',
  'الميلاد',
  'السن',
  'العمر',
  'النوع',
  'الجنس',
  'ذكر',
  'انثي',
  'ولد',
  'بنت',
  'الديانه',
  'ديانه',
  'مسلم',
  'مسلمه',
  'مسيحي',
  'مسيحيه',
  'الجنسيه',
  'مصري',
  'مصريه',
  'حاله القيد',
  'نوع القيد',
  'نوعيه القيد',
  'الحاله',
  'حاله الطالب',
  'حاله التلميذ',
  'حاله الاعفاء',
  'الاعفاء',
  'منقول',
  'منقوله',
  'باق',
  'باقي',
  'باقيه',
  'مستجد',
  'مستجده',
  'وافد',
  'وافده',
  'عادي',
  'دمج',
  'قيد عادي',
  'تحويلات',
  'محول',
  'محوله',
  'كلي',
  'تدريجي',
  'ناجح',
  'ناجحه',
  'راسب',
  'راسبه',
  'دور ثان',
  'غائب',
  'غ',
  'الصف',
  'الفصل',
  'الشعبه',
  'التخصص',
  'رقم الجلوس',
  'الرقم السري',
  'رقم اللجنه',
  'اللجنه',
  'ملاحظات',
  'الملاحظات',
  'توقيع',
  'التوقيع',
  'العنوان',
  'ولي الامر',
  'الهاتف',
  'التليفون',
  'الموبايل',
  'جمله',
  'الاجمالي',
  'المجموع',
  'المجموع الكلي',
  'الترتيب',
  'التقدير',
  'بنين',
  'بنات',
  'name',
  'student name',
  'full name',
  'first name',
  'last name',
  'id',
  'no',
  'number',
  'national id',
  'gender',
  'religion',
  'class',
  'grade',
  'status',
  'notes',
  'male',
  'female',
  'muslim',
  'christian',
  'total',
]);

const METADATA_LINE_PATTERNS: RegExp[] = [
  /^(?:مديريه|اداره|محافظه|وزاره|مدرسه|كشف(?:\s+اسماء|\s+الطلاب|\s+التلاميذ)?|قائمه(?:\s+فصل|\s+الفصل|\s+اسماء|\s+الطلاب|\s+التلاميذ)?|بيان\s+(?:درجات|احصائ|اسماء|الطلاب|التلاميذ)|سجل\s+(?:الطلاب|التلاميذ|الحضور|الدرجات)|احصاء|تقرير|نموذج|جدول|لجنه)\b/,
  /\b(?:التعليميه|التربيه والتعليم|العام الدراسي|الفصل الدراسي|شئون الطلبه|شؤون الطلاب|مدير المدرسه|وكيل المدرسه|رائد الفصل|مسئول|رئيس الكنترول|رئيس اللجنه|يعتمد|توقيع|الامضاء)\b/,
  /\b(?:اجمالي|عدد المقيدين|عدد البنين|عدد البنات|جمله الفصل|صفحه|page)\b/,
  /\b(?:اسم الطالب|اسم التلميذ|اسم الطالبه|اسماء الطلاب|اسماء التلاميذ|الرقم القومي|رقم الجلوس|تاريخ الميلاد|حاله القيد)\b/,
];

const HEADER_NAME_PATTERNS: RegExp[] = [
  /^(?:ال)?اسم(?:\s+(?:الطالب|الطالبه|التلميذ|التلميذه|الدارس|الدارسه|المتقدم|رباعي|ثلاثي|خماسي|بالكامل|الكامل|كامل|واللقب))+$/,
  /^(?:ال)?اسم$/,
  /^(?:ال)?اسماء(?:\s+(?:الطلاب|الطالبات|التلاميذ|التلميذات|الدارسين))?$/,
  /^(?:student(?:'s)?|pupil(?:'s)?)\s+(?:full\s+)?name$|^full\s+name$|^name$/,
];

const HEADER_SERIAL_PATTERNS: RegExp[] = [
  /^(?:م|ت|مسلسل|رقم\s*مسلسل|الرقم\s*المسلسل|ت\s*م|s\/?n|no\.?)$/,
];

const HEADER_NON_NAME_PATTERNS: RegExp[] = [
  /^(?:م|ت|مسلسل|رقم|الرقم|الكود|كود(?:\s+الطالب)?)$/,
  /^(?:الرقم\s+القومي|قومي|تاريخ\s+الميلاد|الميلاد|السن|العمر)$/,
  /^(?:النوع|الجنس|الديانه|ديانه|الجنسيه|حاله|الحاله|ملاحظات|التوقيع|العنوان|الهاتف)$/,
  /^(?:حاله\s+القيد|نوع\s+القيد|نوعيه\s+القيد|حاله\s+الطالب|حاله\s+التلميذ|حاله\s+الاعفاء)$/,
  /^(?:الصف|الفصل|اللجنه|رقم\s+الجلوس|الرقم\s+السري|المجموع|التقدير|الترتيب)$/,
  /^(?:اسم\s+(?:المدرسه|الاداره|الاب|الام|الماده|ولي\s+الامر))$/,
  /^(?:no\.?|s\/?n|id|code|gender|sex|religion|class|grade|seat|secret|notes?|status|birth)/,
];

function normalizeHeaderText(cell: string): string {
  return normalizeArabicForMatch(
    cell
      .replace(/[/\\|()[\]–—-]+/g, ' ')
      .replace(/[:؛،]+/g, ' ')
  );
}

function isNameColumnHeader(cell: string): boolean {
  const norm = normalizeHeaderText(cell);
  if (!norm) return false;
  return HEADER_NAME_PATTERNS.some((re) => re.test(norm));
}

function isSerialColumnHeader(cell: string): boolean {
  const norm = normalizeHeaderText(cell);
  if (!norm) return false;
  return HEADER_SERIAL_PATTERNS.some((re) => re.test(norm));
}

function isNonNameColumnHeader(cell: string): boolean {
  const norm = normalizeHeaderText(cell);
  if (!norm) return false;
  return HEADER_NON_NAME_PATTERNS.some((re) => re.test(norm));
}

export function isLikelyStudentName(
  raw: string,
  options: { fromNamedColumn?: boolean; requireMultiWord?: boolean } = {}
): boolean {
  const cleaned = cleanCandidateName(raw);
  if (!cleaned || cleaned.length < 2 || cleaned.length > 90) return false;

  // Must contain alphabetic characters (Arabic or Latin)
  const hasLetters = /[\u0621-\u064A\u0671-\u06D3a-zA-Z]/.test(cleaned);
  if (!hasLetters) return false;

  // Student names should not contain digits or email/URL/math symbols
  const western = toWesternDigits(cleaned);
  if (/\d/.test(western)) return false;
  if (/[:=@#$%^&*+<>|[\]{}\\/]/.test(cleaned)) return false;

  const norm = normalizeArabicForMatch(cleaned);
  if (!norm || EXACT_NON_NAME_WORDS.has(norm)) return false;

  if (METADATA_LINE_PATTERNS.some((re) => re.test(norm))) return false;
  if (isNameColumnHeader(cleaned) || isNonNameColumnHeader(cleaned)) return false;

  const words = norm.split(' ').filter(Boolean);
  if (words.length === 0) return false;

  if (options.requireMultiWord && words.length < 2) {
    return false;
  }

  // Reject if every word is just 1 letter (e.g. "أ ب")
  if (words.every((w) => w.length <= 1)) return false;

  // Reject single-word values unless explicitly inside a confirmed name column
  if (!options.fromNamedColumn && words.length < 2) {
    return false;
  }

  return true;
}

interface HeaderMatch {
  headerRowIndex: number;
  nameColIndices: number[];
  serialColIndices: number[];
}

function findHeaderRowAndColumns(grid: string[][]): HeaderMatch | null {
  const maxScanRows = Math.min(grid.length, 30);
  for (let r = 0; r < maxScanRows; r++) {
    const row = grid[r];
    if (!row || row.length === 0) continue;

    const nameCols: number[] = [];
    const serialCols: number[] = [];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c] || '';
      if (isNameColumnHeader(cell)) {
        nameCols.push(c);
      } else if (isSerialColumnHeader(cell)) {
        serialCols.push(c);
      }
    }

    if (nameCols.length > 0) {
      return {
        headerRowIndex: r,
        nameColIndices: nameCols,
        serialColIndices: serialCols,
      };
    }
  }
  return null;
}

interface SerialPanelAnchor {
  serialCol: number;
  startRow: number;
  startSerial: number;
  nameCol: number;
}

function findSerialAnchorsInGrid(
  grid: string[][],
  headerMatch: HeaderMatch | null,
  allowContinuationStart = false
): SerialPanelAnchor[] {
  const maxCols = grid.reduce((max, row) => Math.max(max, row.length), 0);
  if (maxCols < 2 || grid.length === 0) return [];

  const anchors: SerialPanelAnchor[] = [];
  const usedNameCols = new Set<number>();

  // Scan candidate serial columns
  for (let c = 0; c < maxCols; c++) {
    const minRow = headerMatch ? headerMatch.headerRowIndex + 1 : 0;
    let anchorRow = -1;
    let anchorVal = -1;

    // 1. Prefer finding exact serial number 1
    for (let r = minRow; r < grid.length; r++) {
      const val = parseSerialNumber(grid[r]?.[c] || '');
      if (val === 1) {
        // Verify this is genuinely a serial sequence (either next row has 2, or serial header exists, or another cell in row r is a valid name)
        const nextVal = r + 1 < grid.length ? parseSerialNumber(grid[r + 1]?.[c] || '') : null;
        const hasSerialHeaderAbove =
          r > 0 && grid.slice(0, r).some((hr) => isSerialColumnHeader(hr?.[c] || ''));
        const hasNameInSameRow = grid[r].some(
          (cell, colIdx) =>
            colIdx !== c &&
            isLikelyStudentName(cell, { fromNamedColumn: true, requireMultiWord: true })
        );

        if (nextVal === 2 || hasSerialHeaderAbove || hasNameInSameRow) {
          anchorRow = r;
          anchorVal = 1;
          break;
        }
      }
    }

    // 2. For continuation tables (e.g. page 2 of Word document starting at 26, 27, 28...)
    if (anchorRow === -1 && allowContinuationStart) {
      for (let r = minRow; r < grid.length - 1; r++) {
        const val = parseSerialNumber(grid[r]?.[c] || '');
        const nextVal = parseSerialNumber(grid[r + 1]?.[c] || '');
        if (val !== null && nextVal !== null && nextVal === val + 1) {
          const hasNameInSameRow = grid[r].some(
            (cell, colIdx) =>
              colIdx !== c &&
              isLikelyStudentName(cell, { fromNamedColumn: true, requireMultiWord: true })
          );
          if (hasNameInSameRow) {
            anchorRow = r;
            anchorVal = val;
            break;
          }
        }
      }
    }

    if (anchorRow === -1) continue;

    // Find the best corresponding name column for this serial column starting at anchorRow
    let matchedNameCol = -1;

    if (headerMatch && headerMatch.nameColIndices.length > 0) {
      // Pick the closest name column declared in the header that has a valid name at anchorRow (or below)
      const candidates = headerMatch.nameColIndices
        .filter((nc) => nc !== c && !usedNameCols.has(nc))
        .sort((a, b) => Math.abs(a - c) - Math.abs(b - c));

      for (const nc of candidates) {
        const cellAtAnchor = cleanCandidateName(grid[anchorRow]?.[nc] || '');
        if (isLikelyStudentName(cellAtAnchor, { fromNamedColumn: true, requireMultiWord: false })) {
          matchedNameCol = nc;
          break;
        }
      }
      if (matchedNameCol === -1 && candidates.length > 0) {
        matchedNameCol = candidates[0];
      }
    }

    if (matchedNameCol === -1) {
      // Score non-serial columns starting strictly from anchorRow
      let bestCol = -1;
      let bestScore = -1;
      for (let nc = 0; nc < maxCols; nc++) {
        if (nc === c || usedNameCols.has(nc)) continue;
        const firstCell = cleanCandidateName(grid[anchorRow]?.[nc] || '');
        if (!isLikelyStudentName(firstCell, { fromNamedColumn: true, requireMultiWord: false })) {
          continue;
        }

        let nameCount = 0;
        let wordSum = 0;
        let checked = 0;
        for (let r = anchorRow; r < Math.min(grid.length, anchorRow + 40); r++) {
          const cell = cleanCandidateName(grid[r]?.[nc] || '');
          if (!cell) continue;
          checked++;
          if (isLikelyStudentName(cell, { requireMultiWord: true })) {
            nameCount++;
            wordSum += Math.min(normalizeArabicForMatch(cell).split(' ').length, 5);
          }
        }

        if (nameCount > 0 && checked > 0) {
          const proximityBonus = Math.max(0, 6 - Math.abs(nc - c));
          const score = nameCount * 10 + wordSum * 2 + proximityBonus;
          if (score > bestScore) {
            bestScore = score;
            bestCol = nc;
          }
        }
      }
      matchedNameCol = bestCol;
    }

    if (matchedNameCol !== -1) {
      usedNameCols.add(matchedNameCol);
      anchors.push({
        serialCol: c,
        startRow: anchorRow,
        startSerial: anchorVal,
        nameCol: matchedNameCol,
      });
    }
  }

  // Sort panels by starting serial (so 1..20 comes before 21..40 in side-by-side tables), then by column
  anchors.sort((a, b) => {
    if (a.startSerial !== b.startSerial) return a.startSerial - b.startSerial;
    return a.serialCol - b.serialCol;
  });

  return anchors;
}

function detectNameColumnsByContent(grid: string[][]): number[] {
  if (grid.length === 0) return [];
  const maxCols = grid.reduce((max, row) => Math.max(max, row.length), 0);
  if (maxCols === 0) return [];

  const colScores: { col: number; score: number; multiWordCount: number }[] = [];

  for (let c = 0; c < maxCols; c++) {
    let multiWordCount = 0;
    let nonNameCount = 0;
    let nonEmptyCount = 0;
    let totalWords = 0;

    for (let r = 0; r < grid.length; r++) {
      const cell = (grid[r]?.[c] || '').trim();
      if (!cell) continue;
      nonEmptyCount++;

      if (isNonNameColumnHeader(cell)) {
        nonNameCount += 2;
        continue;
      }

      if (isLikelyStudentName(cell, { requireMultiWord: true })) {
        multiWordCount++;
        const words = normalizeArabicForMatch(cleanCandidateName(cell)).split(' ').filter(Boolean);
        totalWords += Math.min(words.length, 5);
      } else {
        nonNameCount++;
      }
    }

    if (multiWordCount === 0) continue;

    const avgWords = totalWords / multiWordCount;
    const ratio = nonEmptyCount > 0 ? multiWordCount / nonEmptyCount : 0;
    if (ratio >= 0.35 && multiWordCount >= 1) {
      const score = multiWordCount * 10 + avgWords * 4 - nonNameCount * 2;
      colScores.push({ col: c, score, multiWordCount });
    }
  }

  if (colScores.length === 0) return [];

  colScores.sort((a, b) => b.score - a.score);
  const topScore = colScores[0].score;
  const topCount = colScores[0].multiWordCount;

  return colScores
    .filter(
      (item) =>
        item.col === colScores[0].col ||
        (item.score >= topScore * 0.65 && item.multiWordCount >= Math.max(2, Math.floor(topCount * 0.5)))
    )
    .map((item) => item.col)
    .sort((a, b) => a - b);
}

function extractColumnNamesFromStartRow(
  grid: string[][],
  colIdx: number,
  startRow: number,
  options: { requireMultiWordFirst?: boolean; allowSingleWordInColumn?: boolean } = {}
): string[] {
  const results: string[] = [];
  let started = false;

  for (let r = startRow; r < grid.length; r++) {
    const rawCell = grid[r]?.[colIdx] || '';
    if (!rawCell) continue;
    if (isNameColumnHeader(rawCell)) continue;

    const subLines = rawCell.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    for (const sub of subLines) {
      const cleaned = cleanCandidateName(sub);
      const valid = isLikelyStudentName(cleaned, {
        fromNamedColumn: options.allowSingleWordInColumn ?? true,
        requireMultiWord: !started && options.requireMultiWordFirst ? true : false,
      });

      if (!started) {
        if (valid) {
          started = true;
          results.push(cleaned);
        }
      } else if (
        isLikelyStudentName(cleaned, {
          fromNamedColumn: options.allowSingleWordInColumn ?? true,
          requireMultiWord: false,
        })
      ) {
        results.push(cleaned);
      }
    }
  }

  return results;
}

export function extractNamesFromGrid(
  rawGrid: string[][],
  options: { allowContinuationSerial?: boolean } = {}
): string[] {
  const grid = rawGrid
    .map((row) => row.map((cell) => (cell ?? '').toString().trim()))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (grid.length === 0) return [];

  const headerMatch = findHeaderRowAndColumns(grid);

  // Priority 1: Check Serial Number column starting at 1 (or continuation serial in multi-page Word tables)
  const serialAnchors = findSerialAnchorsInGrid(
    grid,
    headerMatch,
    Boolean(options.allowContinuationSerial)
  );
  if (serialAnchors.length > 0) {
    const serialExtracted: string[] = [];
    for (const anchor of serialAnchors) {
      const colNames = extractColumnNamesFromStartRow(grid, anchor.nameCol, anchor.startRow, {
        allowSingleWordInColumn: true,
      });
      serialExtracted.push(...colNames);
    }
    if (serialExtracted.length > 0) {
      return serialExtracted;
    }
  }

  // Priority 2: Check Student Names field header and start from the first cell containing an actual name below it
  if (headerMatch) {
    const headerExtracted: string[] = [];
    for (const colIdx of headerMatch.nameColIndices) {
      const colNames = extractColumnNamesFromStartRow(
        grid,
        colIdx,
        headerMatch.headerRowIndex + 1,
        {
          allowSingleWordInColumn: true,
        }
      );
      headerExtracted.push(...colNames);
    }
    if (headerExtracted.length > 0) {
      return headerExtracted;
    }
  }

  // Priority 3: Fallback when table has neither serial numbers nor explicit headers
  const detectedCols = detectNameColumnsByContent(grid);
  if (detectedCols.length > 0) {
    const fallbackExtracted: string[] = [];
    for (const colIdx of detectedCols) {
      const colNames = extractColumnNamesFromStartRow(grid, colIdx, 0, {
        requireMultiWordFirst: true,
        allowSingleWordInColumn: true,
      });
      fallbackExtracted.push(...colNames);
    }
    if (fallbackExtracted.length > 0) {
      return fallbackExtracted;
    }
  }

  // Priority 4: Single-column plain name list
  if (grid.every((row) => row.filter(Boolean).length <= 1)) {
    const singleColExtracted: string[] = [];
    for (const row of grid) {
      const cell = row.find(Boolean) || '';
      const subLines = cell.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      for (const sub of subLines) {
        const cleaned = cleanCandidateName(sub);
        if (isLikelyStudentName(cleaned, { requireMultiWord: true })) {
          singleColExtracted.push(cleaned);
        }
      }
    }
    return singleColExtracted;
  }

  return [];
}

export function extractNamesFromLines(lines: string[]): string[] {
  // Priority 1: Check for explicit serial #1 line (e.g. "1- أحمد محمد علي" or "1\tأحمد محمد علي")
  let startIdx = 0;
  let foundExplicitAnchor = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim()).filter(Boolean);
      const firstSerial = parts.length >= 2 ? parseSerialNumber(parts[0]) : null;
      if (
        firstSerial === 1 &&
        parts.slice(1).some((p) => isLikelyStudentName(p, { fromNamedColumn: true, requireMultiWord: true }))
      ) {
        startIdx = i;
        foundExplicitAnchor = true;
        break;
      }
    }

    const numMatch = toWesternDigits(line).match(/^\s*\(?(\d{1,3})\)?\s*[-–—.):/\\]+\s*(.+)$/);
    if (numMatch && parseInt(numMatch[1], 10) === 1) {
      const candidate = cleanCandidateName(numMatch[2]);
      if (isLikelyStudentName(candidate, { fromNamedColumn: true, requireMultiWord: true })) {
        startIdx = i;
        foundExplicitAnchor = true;
        break;
      }
    }
  }

  // Priority 2: Check for a student names header line
  if (!foundExplicitAnchor) {
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      if (isNameColumnHeader(lines[i])) {
        startIdx = i + 1;
        foundExplicitAnchor = true;
        break;
      }
    }
  }

  const results: string[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine.includes('\t')) {
      const parts = rawLine.split('\t').map((p) => p.trim()).filter(Boolean);
      const namePart = parts.find((p) =>
        isLikelyStudentName(p, { fromNamedColumn: foundExplicitAnchor, requireMultiWord: true })
      );
      if (namePart) {
        results.push(cleanCandidateName(namePart));
        continue;
      }
    }

    const cleaned = cleanCandidateName(rawLine);
    if (isLikelyStudentName(cleaned, { fromNamedColumn: foundExplicitAnchor, requireMultiWord: true })) {
      results.push(cleaned);
    }
  }
  return results;
}

function extractGridFromHtmlTable(table: HTMLTableElement): string[][] {
  const rows: string[][] = [];
  const trs = Array.from(table.querySelectorAll('tr'));
  for (const tr of trs) {
    if (tr.closest('table') !== table) continue;
    const cells = Array.from(tr.children).filter(
      (el) => el.tagName === 'TD' || el.tagName === 'TH'
    );
    const rowValues: string[] = [];
    for (const cell of cells) {
      const blocks = Array.from(cell.querySelectorAll('p, li, div'));
      let text = '';
      if (blocks.length > 1) {
        text = blocks
          .map((b) => (b.textContent || '').trim())
          .filter(Boolean)
          .join('\n');
      } else {
        const cloned = cell.cloneNode(true) as HTMLElement;
        cloned.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
        text = (cloned.textContent || '').trim();
      }
      const colSpan = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1);
      rowValues.push(text);
      for (let span = 1; span < colSpan && span < 20; span++) {
        rowValues.push('');
      }
    }
    if (rowValues.some((v) => v.length > 0)) {
      rows.push(rowValues);
    }
  }
  return rows;
}

function extractNamesFromHtmlDocument(html: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const tables = Array.from(doc.querySelectorAll('table'));
  const tableNames: string[] = [];
  for (const table of tables) {
    if (table.querySelector('table')) continue;
    const grid = extractGridFromHtmlTable(table);
    const extracted = extractNamesFromGrid(grid, {
      allowContinuationSerial: tableNames.length > 0,
    });
    tableNames.push(...extracted);
  }

  if (tableNames.length > 0) {
    return tableNames;
  }

  // Fallback for Word files formatted as paragraphs or bullet/numbered lists without tables
  const textBlocks = Array.from(doc.body?.querySelectorAll('li, p, div') || [])
    .filter((el) => {
      if (el.closest('table')) return false;
      if (el.tagName === 'DIV' && el.querySelector('p, li, div')) return false;
      return true;
    })
    .map((el) => {
      const cloned = el.cloneNode(true) as HTMLElement;
      cloned.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
      return (cloned.textContent || '').trim();
    })
    .flatMap((block) => block.split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);

  return extractNamesFromLines(textBlocks);
}

function decodeTextBuffer(buffer: ArrayBuffer): string {
  const utf8Text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  if (!utf8Text.includes('\uFFFD')) {
    return utf8Text;
  }
  try {
    return new TextDecoder('windows-1256').decode(buffer);
  } catch {
    return utf8Text;
  }
}

function decodeRtfToLines(rtf: string): string[] {
  const win1256Decoder = (() => {
    try {
      return new TextDecoder('windows-1256');
    } catch {
      return null;
    }
  })();

  let text = rtf
    .replace(/\\par\b|\\line\b|\\row\b/g, '\n')
    .replace(/\\tab\b|\\cell\b/g, '\t')
    .replace(/\\u(-?\d+)\??/g, (_, numStr) => {
      let code = parseInt(numStr, 10);
      if (code < 0) code += 65536;
      return String.fromCharCode(code);
    });

  text = text.replace(/(?:\\'[0-9a-fA-F]{2})+/g, (seq) => {
    const hexMatches = seq.match(/[0-9a-fA-F]{2}/g) || [];
    const bytes = new Uint8Array(hexMatches.map((h) => parseInt(h, 16)));
    if (win1256Decoder) {
      return win1256Decoder.decode(bytes);
    }
    return '';
  });

  text = text
    .replace(/\{\\\*\\[^}]*\}/g, '')
    .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
    .replace(/[{}]/g, '');

  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function deduplicatePreserveOrder(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const cleaned = cleanCandidateName(name);
    if (!cleaned) continue;
    const key = normalizeArabicForMatch(cleaned);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cleaned);
    }
  }
  return result;
}

export async function importStudentNamesFromFile(file: File): Promise<ImportStudentsResult> {
  const fileName = file.name || 'file';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isWordExt = ext === 'docx' || ext === 'doc';
  const sourceType: 'excel' | 'word' = isWordExt ? 'word' : 'excel';

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isZipMagic = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b; // PK
    const isOle2Magic =
      bytes.length >= 4 &&
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0;

    // 1. Word files (.docx or HTML/RTF/PK disguised as .doc)
    if (isWordExt) {
      if (ext === 'docx' || isZipMagic) {
        const mammoth = await import('mammoth');
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer });
        let names = extractNamesFromHtmlDocument(html);

        if (names.length === 0) {
          const { value: rawText } = await mammoth.extractRawText({ arrayBuffer: buffer });
          const rawLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          names = extractNamesFromLines(rawLines);
        }

        const finalNames = deduplicatePreserveOrder(names);
        if (finalNames.length === 0) {
          return {
            names: [],
            fileName,
            sourceType: 'word',
            error: 'لم يتم العثور على أسماء طلاب صالحة داخل ملف Word. تأكد من وجود عمود أو قائمة بأسماء الطلاب.',
          };
        }
        return { names: finalNames, fileName, sourceType: 'word' };
      }

      const textPreview = decodeTextBuffer(buffer.slice(0, Math.min(buffer.byteLength, 2048))).trimStart();
      if (textPreview.startsWith('{\\rtf')) {
        const fullText = decodeTextBuffer(buffer);
        const lines = decodeRtfToLines(fullText);
        const hasTabGrid = lines.some((l) => l.includes('\t'));
        const rtfNames = hasTabGrid
          ? extractNamesFromGrid(lines.map((l) => l.split('\t')))
          : extractNamesFromLines(lines);
        const finalNames = deduplicatePreserveOrder(rtfNames.length > 0 ? rtfNames : extractNamesFromLines(lines));
        if (finalNames.length > 0) {
          return { names: finalNames, fileName, sourceType: 'word' };
        }
      } else if (
        /^<(?:!doctype|html|table|\?xml|meta|head|body)/i.test(textPreview) ||
        /<table[\s>]/i.test(textPreview)
      ) {
        const fullHtml = decodeTextBuffer(buffer);
        const finalNames = deduplicatePreserveOrder(extractNamesFromHtmlDocument(fullHtml));
        if (finalNames.length > 0) {
          return { names: finalNames, fileName, sourceType: 'word' };
        }
      }

      if (isOle2Magic) {
        return {
          names: [],
          fileName,
          sourceType: 'word',
          error: 'صيغة Word القديمة (.doc) غير مدعومة مباشرة؛ يرجى فتح الملف في برنامج Word وحفظه بصيغة (.docx) ثم إعادة الاستيراد.',
        };
      }

      return {
        names: [],
        fileName,
        sourceType: 'word',
        error: 'تعذر قراءة الأسماء من ملف Word المحدد. يرجى التأكد من حفظ الملف بصيغة (.docx).',
      };
    }

    // 2. Excel / CSV / ODS files
    const XLSX = await import('xlsx');
    let workbook: ReturnType<typeof XLSX.read> | null = null;

    try {
      workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    } catch {
      workbook = null;
    }

    const allExtracted: string[] = [];

    if (workbook && workbook.SheetNames.length > 0) {
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: '',
          blankrows: false,
        });
        const grid = rows.map((r) =>
          Array.isArray(r) ? r.map((cell) => (cell ?? '').toString()) : []
        );
        const sheetNames = extractNamesFromGrid(grid);
        allExtracted.push(...sheetNames);
      }
    }

    // Fallback: HTML table saved as .xls (very common in Egyptian school portals)
    if (allExtracted.length === 0) {
      const textPreview = decodeTextBuffer(buffer.slice(0, Math.min(buffer.byteLength, 2048))).trimStart();
      if (
        /^<(?:!doctype|html|table|\?xml|meta|head|body)/i.test(textPreview) ||
        /<table[\s>]/i.test(textPreview)
      ) {
        const fullHtml = decodeTextBuffer(buffer);
        allExtracted.push(...extractNamesFromHtmlDocument(fullHtml));
      }
    }

    const finalNames = deduplicatePreserveOrder(allExtracted);
    if (finalNames.length === 0) {
      return {
        names: [],
        fileName,
        sourceType: 'excel',
        error: 'لم يتم العثور على أسماء طلاب صالحة داخل ملف Excel. تأكد من وجود عمود أو قائمة بأسماء الطلاب.',
      };
    }

    return { names: finalNames, fileName, sourceType: 'excel' };
  } catch (err) {
    console.error('Failed to import student names from file:', err);
    return {
      names: [],
      fileName,
      sourceType,
      error: 'حدث خطأ أثناء قراءة الملف. يرجى التأكد من سلامة الملف والمحاولة مرة أخرى.',
    };
  }
}

export interface ImportNationalIdsResult {
  nationalIds: string[];
  fileName: string;
  sourceType: 'excel' | 'word';
  error?: string;
}

const EGYPTIAN_NATIONAL_ID_REGEX = /^[23]\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{7}$/;
const EGYPTIAN_NATIONAL_ID_TOKEN_REGEX = /(?:^|[^\d])([23]\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{7})(?=[^\d]|$)/g;

const HEADER_NATIONAL_ID_PATTERNS: RegExp[] = [
  /^(?:ال)?رقم\s*القومي(?:\s+(?:للطالب|للطالبه|للتلميذ|للتلميذه|للدارس|للدارسه|للمتقدم|كامل|بالكامل))?$/,
  /^(?:ال)?ارقام\s*(?:ال)?قوميه(?:\s+(?:للطلاب|للطالبات|للتلاميذ|للتلميذات|للدارسين))?$/,
  /^رقم\s*قومي$/,
  /^قومي$/,
  /^(?:student(?:'s)?\s+|pupil(?:'s)?\s+)?national\s*(?:id|number)$|^nid$/,
];

function isNationalIdColumnHeader(cell: string): boolean {
  const norm = normalizeHeaderText(cell);
  if (!norm) return false;
  return HEADER_NATIONAL_ID_PATTERNS.some((re) => re.test(norm));
}

export function parseEgyptianNationalId(raw: string): string | null {
  if (!raw) return null;
  const western = toWesternDigits(raw)
    .replace(/[\u061C\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00A0]/g, '')
    .replace(/^'+/, '')
    .trim();

  if (!western) return null;
  // Reject values containing letters, slashes, decimals, or punctuation other than spaces/hyphens
  if (/[a-zA-Z\u0600-\u06FF./\\:@]/.test(western)) return null;

  const digitsOnly = western.replace(/[\s\-–—]+/g, '');
  if (!EGYPTIAN_NATIONAL_ID_REGEX.test(digitsOnly)) return null;
  return digitsOnly;
}

function extractNationalIdFromTextLine(raw: string): string | null {
  if (!raw) return null;
  const western = toWesternDigits(raw)
    .replace(/[\u061C\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00A0]/g, ' ')
    .trim();
  if (!western) return null;

  // Strip optional leading serial number like "1-" or "1)"
  const withoutSerial = western.replace(/^\s*\(?(\d{1,4})\)?\s*[-–—.):/\\]+\s*/, '').trim();
  const direct = parseEgyptianNationalId(withoutSerial);
  if (direct) return direct;

  // Also check if a clean 14-digit National ID token appears inside the line (e.g. "أحمد محمد 30001011234567")
  const compact = withoutSerial.replace(/(\d)\s+(?=\d)/g, '$1');
  const matches: string[] = [];
  EGYPTIAN_NATIONAL_ID_TOKEN_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = EGYPTIAN_NATIONAL_ID_TOKEN_REGEX.exec(compact)) !== null) {
    matches.push(m[1]);
  }
  return matches.length === 1 ? matches[0] : null;
}

interface NationalIdHeaderMatch {
  headerRowIndex: number;
  nationalIdColIndices: number[];
  serialColIndices: number[];
}

function findNationalIdHeaderRowAndColumns(grid: string[][]): NationalIdHeaderMatch | null {
  const maxScanRows = Math.min(grid.length, 30);
  for (let r = 0; r < maxScanRows; r++) {
    const row = grid[r];
    if (!row || row.length === 0) continue;

    const nidCols: number[] = [];
    const serialCols: number[] = [];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c] || '';
      if (isNationalIdColumnHeader(cell)) {
        nidCols.push(c);
      } else if (isSerialColumnHeader(cell)) {
        serialCols.push(c);
      }
    }

    if (nidCols.length > 0) {
      return {
        headerRowIndex: r,
        nationalIdColIndices: nidCols,
        serialColIndices: serialCols,
      };
    }
  }
  return null;
}

interface NationalIdSerialPanelAnchor {
  serialCol: number;
  startRow: number;
  startSerial: number;
  nidCol: number;
}

function findNationalIdSerialAnchorsInGrid(
  grid: string[][],
  headerMatch: NationalIdHeaderMatch | null,
  allowContinuationStart = false
): NationalIdSerialPanelAnchor[] {
  const maxCols = grid.reduce((max, row) => Math.max(max, row.length), 0);
  if (maxCols < 2 || grid.length === 0) return [];

  const anchors: NationalIdSerialPanelAnchor[] = [];
  const usedNidCols = new Set<number>();

  for (let c = 0; c < maxCols; c++) {
    const minRow = headerMatch ? headerMatch.headerRowIndex + 1 : 0;
    let anchorRow = -1;
    let anchorVal = -1;

    // 1. Prefer finding exact serial number 1
    for (let r = minRow; r < grid.length; r++) {
      const val = parseSerialNumber(grid[r]?.[c] || '');
      if (val === 1) {
        const nextVal = r + 1 < grid.length ? parseSerialNumber(grid[r + 1]?.[c] || '') : null;
        const hasSerialHeaderAbove =
          r > 0 && grid.slice(0, r).some((hr) => isSerialColumnHeader(hr?.[c] || ''));
        const hasNidOrNameInSameRow = grid[r].some(
          (cell, colIdx) =>
            colIdx !== c &&
            (parseEgyptianNationalId(cell) !== null ||
              isLikelyStudentName(cell, { fromNamedColumn: true, requireMultiWord: true }))
        );

        if (nextVal === 2 || hasSerialHeaderAbove || hasNidOrNameInSameRow) {
          anchorRow = r;
          anchorVal = 1;
          break;
        }
      }
    }

    // 2. For continuation tables (e.g. page 2 of Word document)
    if (anchorRow === -1 && allowContinuationStart) {
      for (let r = minRow; r < grid.length - 1; r++) {
        const val = parseSerialNumber(grid[r]?.[c] || '');
        const nextVal = parseSerialNumber(grid[r + 1]?.[c] || '');
        if (val !== null && nextVal !== null && nextVal === val + 1) {
          const hasNidInSameRow = grid[r].some(
            (cell, colIdx) => colIdx !== c && parseEgyptianNationalId(cell) !== null
          );
          if (hasNidInSameRow) {
            anchorRow = r;
            anchorVal = val;
            break;
          }
        }
      }
    }

    if (anchorRow === -1) continue;

    // Match the National ID column starting from anchorRow
    let matchedNidCol = -1;

    if (headerMatch && headerMatch.nationalIdColIndices.length > 0) {
      const candidates = headerMatch.nationalIdColIndices
        .filter((nc) => nc !== c && !usedNidCols.has(nc))
        .sort((a, b) => Math.abs(a - c) - Math.abs(b - c));

      for (const nc of candidates) {
        if (parseEgyptianNationalId(grid[anchorRow]?.[nc] || '') !== null) {
          matchedNidCol = nc;
          break;
        }
      }

      if (matchedNidCol === -1) {
        for (const nc of candidates) {
          let hasValidBelow = false;
          for (let r = anchorRow; r < Math.min(grid.length, anchorRow + 25); r++) {
            if (parseEgyptianNationalId(grid[r]?.[nc] || '') !== null) {
              hasValidBelow = true;
              break;
            }
          }
          if (hasValidBelow) {
            matchedNidCol = nc;
            break;
          }
        }
      }
    }

    if (matchedNidCol === -1) {
      let bestCol = -1;
      let bestScore = -1;
      for (let nc = 0; nc < maxCols; nc++) {
        if (nc === c || usedNidCols.has(nc)) continue;

        let validCount = 0;
        let nonEmpty = 0;
        for (let r = anchorRow; r < Math.min(grid.length, anchorRow + 40); r++) {
          const rawCell = (grid[r]?.[nc] || '').trim();
          if (!rawCell) continue;
          nonEmpty++;
          if (parseEgyptianNationalId(rawCell) !== null) {
            validCount++;
          }
        }

        if (validCount > 0 && nonEmpty > 0 && validCount / nonEmpty >= 0.45) {
          const startsAtAnchorBonus =
            parseEgyptianNationalId(grid[anchorRow]?.[nc] || '') !== null ? 15 : 0;
          const proximityBonus = Math.max(0, 6 - Math.abs(nc - c));
          const score = validCount * 10 + startsAtAnchorBonus + proximityBonus;
          if (score > bestScore) {
            bestScore = score;
            bestCol = nc;
          }
        }
      }
      matchedNidCol = bestCol;
    }

    if (matchedNidCol !== -1) {
      usedNidCols.add(matchedNidCol);
      anchors.push({
        serialCol: c,
        startRow: anchorRow,
        startSerial: anchorVal,
        nidCol: matchedNidCol,
      });
    }
  }

  anchors.sort((a, b) => {
    if (a.startSerial !== b.startSerial) return a.startSerial - b.startSerial;
    return a.serialCol - b.serialCol;
  });

  return anchors;
}

function extractColumnNationalIdsFromStartRow(
  grid: string[][],
  colIdx: number,
  startRow: number
): { ids: string[]; nonEmptyChecked: number } {
  const results: string[] = [];
  let started = false;
  let nonEmptyChecked = 0;

  for (let r = startRow; r < grid.length; r++) {
    const rawCell = grid[r]?.[colIdx] || '';
    if (!rawCell) continue;
    if (isNationalIdColumnHeader(rawCell)) continue;

    const subLines = rawCell.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    for (const sub of subLines) {
      nonEmptyChecked++;
      const nid = parseEgyptianNationalId(sub);
      if (!started) {
        if (nid) {
          started = true;
          results.push(nid);
        }
      } else if (nid) {
        results.push(nid);
      }
    }
  }

  return { ids: results, nonEmptyChecked };
}

function detectNationalIdColumnsByContent(grid: string[][]): number[] {
  if (grid.length === 0) return [];
  const maxCols = grid.reduce((max, row) => Math.max(max, row.length), 0);
  if (maxCols === 0) return [];

  const colScores: { col: number; validCount: number }[] = [];

  for (let c = 0; c < maxCols; c++) {
    let validCount = 0;
    let nonEmptyCount = 0;

    for (let r = 0; r < grid.length; r++) {
      const cell = (grid[r]?.[c] || '').trim();
      if (!cell) continue;
      if (isNationalIdColumnHeader(cell)) continue;
      if (isNonNameColumnHeader(cell) || isNameColumnHeader(cell)) {
        nonEmptyCount++;
        continue;
      }

      nonEmptyCount++;
      if (parseEgyptianNationalId(cell) !== null) {
        validCount++;
      }
    }

    if (validCount === 0 || nonEmptyCount === 0) continue;
    const ratio = validCount / nonEmptyCount;
    if (ratio >= 0.45 && (validCount >= 2 || nonEmptyCount <= 2)) {
      colScores.push({ col: c, validCount });
    }
  }

  if (colScores.length === 0) return [];
  colScores.sort((a, b) => b.validCount - a.validCount);
  const topCount = colScores[0].validCount;

  return colScores
    .filter((item) => item.col === colScores[0].col || item.validCount >= Math.max(2, Math.floor(topCount * 0.5)))
    .map((item) => item.col)
    .sort((a, b) => a - b);
}

export function extractNationalIdsFromGrid(
  rawGrid: string[][],
  options: { allowContinuationSerial?: boolean } = {}
): string[] {
  const grid = rawGrid
    .map((row) => row.map((cell) => (cell ?? '').toString().trim()))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (grid.length === 0) return [];

  const headerMatch = findNationalIdHeaderRowAndColumns(grid);

  // Priority 1: Check Serial Number column starting at 1 (or continuation serial in multi-page Word tables)
  const serialAnchors = findNationalIdSerialAnchorsInGrid(
    grid,
    headerMatch,
    Boolean(options.allowContinuationSerial)
  );
  if (serialAnchors.length > 0) {
    const serialExtracted: string[] = [];
    for (const anchor of serialAnchors) {
      const { ids } = extractColumnNationalIdsFromStartRow(grid, anchor.nidCol, anchor.startRow);
      serialExtracted.push(...ids);
    }
    if (serialExtracted.length > 0) {
      return serialExtracted;
    }
  }

  // Priority 2: Check National ID field header and verify/start from the first valid National ID cell below it
  if (headerMatch) {
    const headerExtracted: string[] = [];
    let totalChecked = 0;
    for (const colIdx of headerMatch.nationalIdColIndices) {
      const { ids, nonEmptyChecked } = extractColumnNationalIdsFromStartRow(
        grid,
        colIdx,
        headerMatch.headerRowIndex + 1
      );
      headerExtracted.push(...ids);
      totalChecked += nonEmptyChecked;
    }
    if (headerExtracted.length > 0 && (totalChecked === 0 || headerExtracted.length / totalChecked >= 0.35)) {
      return headerExtracted;
    }
  }

  // Priority 3: Content-density fallback — verifies that the column genuinely contains a list of 14-digit Egyptian National IDs
  const detectedCols = detectNationalIdColumnsByContent(grid);
  if (detectedCols.length > 0) {
    const fallbackExtracted: string[] = [];
    for (const colIdx of detectedCols) {
      const { ids } = extractColumnNationalIdsFromStartRow(grid, colIdx, 0);
      fallbackExtracted.push(...ids);
    }
    if (fallbackExtracted.length > 0) {
      return fallbackExtracted;
    }
  }

  // Priority 4: Single-column plain National ID list
  if (grid.every((row) => row.filter(Boolean).length <= 1)) {
    const singleColExtracted: string[] = [];
    let nonEmpty = 0;
    for (const row of grid) {
      const cell = row.find(Boolean) || '';
      const subLines = cell.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      for (const sub of subLines) {
        if (isNationalIdColumnHeader(sub)) continue;
        nonEmpty++;
        const nid = parseEgyptianNationalId(sub);
        if (nid) {
          singleColExtracted.push(nid);
        }
      }
    }
    if (singleColExtracted.length > 0 && nonEmpty > 0 && singleColExtracted.length / nonEmpty >= 0.45) {
      return singleColExtracted;
    }
  }

  return [];
}

export function extractNationalIdsFromLines(lines: string[]): string[] {
  let startIdx = 0;
  let foundExplicitAnchor = false;

  // Priority 1: Explicit serial #1 line containing a valid National ID
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim()).filter(Boolean);
      const firstSerial = parts.length >= 2 ? parseSerialNumber(parts[0]) : null;
      if (firstSerial === 1 && parts.slice(1).some((p) => parseEgyptianNationalId(p) !== null)) {
        startIdx = i;
        foundExplicitAnchor = true;
        break;
      }
    }

    const numMatch = toWesternDigits(line).match(/^\s*\(?(\d{1,3})\)?\s*[-–—.):/\\]+\s*(.+)$/);
    if (numMatch && parseInt(numMatch[1], 10) === 1) {
      if (extractNationalIdFromTextLine(numMatch[2]) !== null) {
        startIdx = i;
        foundExplicitAnchor = true;
        break;
      }
    }
  }

  // Priority 2: Explicit National ID header line
  if (!foundExplicitAnchor) {
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      if (isNationalIdColumnHeader(lines[i])) {
        startIdx = i + 1;
        foundExplicitAnchor = true;
        break;
      }
    }
  }

  const results: string[] = [];
  let checkedLines = 0;
  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || isNationalIdColumnHeader(rawLine)) continue;
    checkedLines++;

    if (rawLine.includes('\t')) {
      const parts = rawLine.split('\t').map((p) => p.trim()).filter(Boolean);
      const nidPart = parts.map((p) => parseEgyptianNationalId(p)).find((v): v is string => v !== null);
      if (nidPart) {
        results.push(nidPart);
        continue;
      }
    }

    const nid = extractNationalIdFromTextLine(rawLine);
    if (nid) {
      results.push(nid);
    }
  }

  if (results.length === 0) return [];

  // Verify that the file genuinely represents a list of National IDs (not one stray number inside prose)
  if (!foundExplicitAnchor && results.length < 2 && checkedLines > 4) {
    return [];
  }
  if (checkedLines > 6 && results.length / checkedLines < 0.25 && !foundExplicitAnchor) {
    return [];
  }

  return results;
}

function extractNationalIdsFromHtmlDocument(html: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const tables = Array.from(doc.querySelectorAll('table'));
  const tableIds: string[] = [];
  for (const table of tables) {
    if (table.querySelector('table')) continue;
    const grid = extractGridFromHtmlTable(table);
    const extracted = extractNationalIdsFromGrid(grid, {
      allowContinuationSerial: tableIds.length > 0,
    });
    tableIds.push(...extracted);
  }

  if (tableIds.length > 0) {
    return tableIds;
  }

  const textBlocks = Array.from(doc.body?.querySelectorAll('li, p, div') || [])
    .filter((el) => {
      if (el.closest('table')) return false;
      if (el.tagName === 'DIV' && el.querySelector('p, li, div')) return false;
      return true;
    })
    .map((el) => {
      const cloned = el.cloneNode(true) as HTMLElement;
      cloned.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
      return (cloned.textContent || '').trim();
    })
    .flatMap((block) => block.split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);

  return extractNationalIdsFromLines(textBlocks);
}

function deduplicateIdsPreserveOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    const parsed = parseEgyptianNationalId(id);
    if (!parsed) continue;
    if (!seen.has(parsed)) {
      seen.add(parsed);
      result.push(parsed);
    }
  }
  return result;
}

export async function importNationalIdsFromFile(file: File): Promise<ImportNationalIdsResult> {
  const fileName = file.name || 'file';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isWordExt = ext === 'docx' || ext === 'doc';
  const sourceType: 'excel' | 'word' = isWordExt ? 'word' : 'excel';

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isZipMagic = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b; // PK
    const isOle2Magic =
      bytes.length >= 4 &&
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0;

    // 1. Word files
    if (isWordExt) {
      if (ext === 'docx' || isZipMagic) {
        const mammoth = await import('mammoth');
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer });
        let ids = extractNationalIdsFromHtmlDocument(html);

        if (ids.length === 0) {
          const { value: rawText } = await mammoth.extractRawText({ arrayBuffer: buffer });
          const rawLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          ids = extractNationalIdsFromLines(rawLines);
        }

        const finalIds = deduplicateIdsPreserveOrder(ids);
        if (finalIds.length === 0) {
          const looksLikeNamesOnly = extractNamesFromHtmlDocument(html).length > 0;
          return {
            nationalIds: [],
            fileName,
            sourceType: 'word',
            error: looksLikeNamesOnly
              ? 'الملف المحدد يحتوي على أسماء أو بيانات أخرى وليس قائمة أرقام قومية صالحة (14 رقماً).'
              : 'الملف المحدد لا يحتوي على قائمة أرقام قومية صالحة (14 رقماً). تأكد من اختيار ملف يتضمن عمود أو قائمة الأرقام القومية.',
          };
        }
        return { nationalIds: finalIds, fileName, sourceType: 'word' };
      }

      const textPreview = decodeTextBuffer(buffer.slice(0, Math.min(buffer.byteLength, 2048))).trimStart();
      if (textPreview.startsWith('{\\rtf')) {
        const fullText = decodeTextBuffer(buffer);
        const lines = decodeRtfToLines(fullText);
        const hasTabGrid = lines.some((l) => l.includes('\t'));
        const rtfIds = hasTabGrid
          ? extractNationalIdsFromGrid(lines.map((l) => l.split('\t')))
          : extractNationalIdsFromLines(lines);
        const finalIds = deduplicateIdsPreserveOrder(
          rtfIds.length > 0 ? rtfIds : extractNationalIdsFromLines(lines)
        );
        if (finalIds.length > 0) {
          return { nationalIds: finalIds, fileName, sourceType: 'word' };
        }
      } else if (
        /^<(?:!doctype|html|table|\?xml|meta|head|body)/i.test(textPreview) ||
        /<table[\s>]/i.test(textPreview)
      ) {
        const fullHtml = decodeTextBuffer(buffer);
        const finalIds = deduplicateIdsPreserveOrder(extractNationalIdsFromHtmlDocument(fullHtml));
        if (finalIds.length > 0) {
          return { nationalIds: finalIds, fileName, sourceType: 'word' };
        }
      }

      if (isOle2Magic) {
        return {
          nationalIds: [],
          fileName,
          sourceType: 'word',
          error: 'صيغة Word القديمة (.doc) غير مدعومة مباشرة؛ يرجى فتح الملف في برنامج Word وحفظه بصيغة (.docx) ثم إعادة الاستيراد.',
        };
      }

      return {
        nationalIds: [],
        fileName,
        sourceType: 'word',
        error: 'تعذر التحقق من وجود قائمة أرقام قومية صالحة داخل ملف Word المحدد. تأكد من حفظ الملف بصيغة (.docx).',
      };
    }

    // 2. Excel / CSV / ODS files
    const XLSX = await import('xlsx');
    let workbook: ReturnType<typeof XLSX.read> | null = null;

    try {
      workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    } catch {
      workbook = null;
    }

    const allExtracted: string[] = [];
    let hasNamesWithoutIds = false;

    if (workbook && workbook.SheetNames.length > 0) {
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: '',
          blankrows: false,
        });
        const grid = rows.map((r) =>
          Array.isArray(r) ? r.map((cell) => (cell ?? '').toString()) : []
        );
        const sheetIds = extractNationalIdsFromGrid(grid);
        if (sheetIds.length > 0) {
          allExtracted.push(...sheetIds);
        } else if (extractNamesFromGrid(grid).length > 0) {
          hasNamesWithoutIds = true;
        }
      }
    }

    // Fallback: HTML table saved as .xls
    if (allExtracted.length === 0) {
      const textPreview = decodeTextBuffer(buffer.slice(0, Math.min(buffer.byteLength, 2048))).trimStart();
      if (
        /^<(?:!doctype|html|table|\?xml|meta|head|body)/i.test(textPreview) ||
        /<table[\s>]/i.test(textPreview)
      ) {
        const fullHtml = decodeTextBuffer(buffer);
        const htmlIds = extractNationalIdsFromHtmlDocument(fullHtml);
        allExtracted.push(...htmlIds);
        if (htmlIds.length === 0 && extractNamesFromHtmlDocument(fullHtml).length > 0) {
          hasNamesWithoutIds = true;
        }
      }
    }

    const finalIds = deduplicateIdsPreserveOrder(allExtracted);
    if (finalIds.length === 0) {
      return {
        nationalIds: [],
        fileName,
        sourceType: 'excel',
        error: hasNamesWithoutIds
          ? 'الملف المحدد يحتوي على أسماء أو بيانات أخرى وليس قائمة أرقام قومية صالحة (14 رقماً).'
          : 'الملف المحدد لا يحتوي على قائمة أرقام قومية صالحة (14 رقماً). تأكد من وجود عمود أو قائمة بالأرقام القومية.',
      };
    }

    return { nationalIds: finalIds, fileName, sourceType: 'excel' };
  } catch (err) {
    console.error('Failed to import national IDs from file:', err);
    return {
      nationalIds: [],
      fileName,
      sourceType,
      error: 'حدث خطأ أثناء قراءة الملف. يرجى التأكد من سلامة الملف والمحاولة مرة أخرى.',
    };
  }
}
