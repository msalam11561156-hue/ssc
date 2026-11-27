export function cleanClassName(name: string): string {
  return (name || '').replace(/\s+/g, ' ').trim();
}

export function normalizeClassNameForCompare(name: string): string {
  return cleanClassName(name)
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s*[/\\]\s*/g, '/')
    .toLowerCase();
}

export function getGradeNumberForClass(selectedGrade?: string): string {
  if (selectedGrade?.includes('الأول') || selectedGrade?.includes('1')) return '1';
  if (selectedGrade?.includes('الثاني') || selectedGrade?.includes('الثانى') || selectedGrade?.includes('2')) return '2';
  if (selectedGrade?.includes('الثالث') || selectedGrade?.includes('3')) return '3';
  if (selectedGrade?.includes('الرابع') || selectedGrade?.includes('4')) return '4';
  if (selectedGrade?.includes('الخامس') || selectedGrade?.includes('5')) return '5';
  if (selectedGrade?.includes('السادس') || selectedGrade?.includes('6')) return '6';
  return '1';
}

export function getDefaultClassesForGrade(selectedGrade?: string): string[] {
  const gradeNum = getGradeNumberForClass(selectedGrade);
  return Array.from({ length: 16 }, (_, i) => `${gradeNum} / ${i + 1}`);
}

function getCustomClassesStorageKey(stage?: string, selectedGrade?: string): string {
  return `sheet_control_custom_classes_${stage || 'default'}_${selectedGrade || 'default'}`;
}

export function getSavedCustomClasses(stage?: string, selectedGrade?: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getCustomClassesStorageKey(stage, selectedGrade));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of parsed) {
      if (typeof item !== 'string') continue;
      const cleaned = cleanClassName(item);
      if (!cleaned) continue;
      const norm = normalizeClassNameForCompare(cleaned);
      if (!seen.has(norm)) {
        seen.add(norm);
        result.push(cleaned);
      }
    }
    return result;
  } catch {
    return [];
  }
}

export function findMatchingExistingClass(inputName: string, existingClasses: string[]): string | null {
  const normInput = normalizeClassNameForCompare(inputName);
  if (!normInput) return null;
  for (const cls of existingClasses) {
    if (normalizeClassNameForCompare(cls) === normInput) {
      return cls;
    }
  }
  return null;
}

export function saveCustomClass(className: string, stage?: string, selectedGrade?: string): string[] {
  const cleaned = cleanClassName(className);
  const current = getSavedCustomClasses(stage, selectedGrade);
  if (!cleaned) return current;

  const defaults = getDefaultClassesForGrade(selectedGrade);
  if (findMatchingExistingClass(cleaned, [...defaults, ...current])) {
    return current;
  }

  const next = [...current, cleaned];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getCustomClassesStorageKey(stage, selectedGrade), JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }
  return next;
}

export function renameCustomClass(
  oldName: string,
  newName: string,
  stage?: string,
  selectedGrade?: string
): string[] {
  const cleanedOld = cleanClassName(oldName);
  const cleanedNew = cleanClassName(newName);
  const current = getSavedCustomClasses(stage, selectedGrade);
  if (!cleanedOld || !cleanedNew) return current;

  const oldNorm = normalizeClassNameForCompare(cleanedOld);
  const newNorm = normalizeClassNameForCompare(cleanedNew);

  let replaced = false;
  const nextRaw = current.map((item) => {
    if (normalizeClassNameForCompare(item) === oldNorm) {
      replaced = true;
      return cleanedNew;
    }
    return item;
  });

  if (!replaced) {
    nextRaw.push(cleanedNew);
  }

  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of nextRaw) {
    const cleaned = cleanClassName(item);
    if (!cleaned) continue;
    const norm = normalizeClassNameForCompare(cleaned);
    if (norm === oldNorm && newNorm !== oldNorm && replaced) continue;
    if (!seen.has(norm)) {
      seen.add(norm);
      next.push(cleaned);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getCustomClassesStorageKey(stage, selectedGrade), JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }
  return next;
}

export function deleteCustomClass(
  className: string,
  stage?: string,
  selectedGrade?: string
): string[] {
  const cleaned = cleanClassName(className);
  const current = getSavedCustomClasses(stage, selectedGrade);
  if (!cleaned) return current;

  const targetNorm = normalizeClassNameForCompare(cleaned);
  const next = current.filter((item) => normalizeClassNameForCompare(item) !== targetNorm);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getCustomClassesStorageKey(stage, selectedGrade), JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }
  return next;
}

export function buildAvailableClasses(params: {
  stage?: string;
  selectedGrade?: string;
  data: { studentClass?: string }[];
  savedCustomClasses?: string[];
}): {
  defaultClasses: string[];
  customClasses: string[];
  allClasses: string[];
} {
  const { stage, selectedGrade, data, savedCustomClasses } = params;
  const defaultClasses = getDefaultClassesForGrade(selectedGrade);
  const defaultNormSet = new Set(defaultClasses.map(normalizeClassNameForCompare));

  const saved = savedCustomClasses ?? getSavedCustomClasses(stage, selectedGrade);
  const inData = data
    .map((s) => cleanClassName(s.studentClass || ''))
    .filter(Boolean);

  const seenCustomNorms = new Set<string>();
  const customClasses: string[] = [];

  for (const cls of [...saved, ...inData]) {
    const cleaned = cleanClassName(cls);
    if (!cleaned) continue;
    const norm = normalizeClassNameForCompare(cleaned);
    if (defaultNormSet.has(norm)) continue;
    if (!seenCustomNorms.has(norm)) {
      seenCustomNorms.add(norm);
      customClasses.push(cleaned);
    }
  }

  return {
    defaultClasses,
    customClasses,
    allClasses: [...customClasses, ...defaultClasses],
  };
}

export function getClassColumnWidthPx(customClasses: string[], defaultWidth = 120): number {
  if (!customClasses || customClasses.length === 0) return defaultWidth;
  const maxLen = customClasses.reduce((max, item) => {
    const len = cleanClassName(item).length;
    return len > max ? len : max;
  }, 0);
  if (maxLen === 0) return defaultWidth;
  return Math.max(defaultWidth, Math.min(260, Math.max(185, maxLen * 16 + 32)));
}
