import { idbGet, idbSet } from './idbStorage';

const REGISTRY_STORAGE_KEY = 'smart_control_deleted_subjects_registry';
const IDB_REGISTRY_KEY = 'smart_control_deleted_subjects_registry';

function normalizeGradeKey(grade: string): string {
  return (grade || '')
    .trim()
    .replace(/ى/g, 'ي')
    .replace(/[أإآ]/g, 'ا')
    .replace(/\s+/g, ' ');
}

function getGradeVariants(selectedGrade: string): string[] {
  const g = (selectedGrade || '').trim();
  if (!g) return [];
  const variants = new Set<string>([
    selectedGrade,
    g,
    g.replace(/ي/g, 'ى'),
    g.replace(/ى/g, 'ي'),
    normalizeGradeKey(g),
  ]);
  return Array.from(variants).filter(Boolean);
}

function getRegistryEntryKey(stage: string, selectedGrade: string): string {
  return `${stage.trim()}::${normalizeGradeKey(selectedGrade)}`;
}

function readRegistry(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, string[]> = {};
    Object.entries(parsed).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        result[k] = Array.from(new Set(v.filter((item): item is string => typeof item === 'string' && item.length > 0)));
      }
    });
    return result;
  } catch {
    return {};
  }
}

function writeRegistry(registry: Record<string, string[]>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(registry));
  } catch {}
  idbSet(IDB_REGISTRY_KEY, registry).catch(() => {});
}

function stripKeyFromSavedCols(stage: string, selectedGrade: string, keyToRemove: string): void {
  if (typeof window === 'undefined' || !stage || !selectedGrade || !keyToRemove) return;
  const variants = getGradeVariants(selectedGrade);
  const suffixes = ['assessments_custom_cols', 'homeschool_assessments_custom_cols'];

  variants.forEach((variant) => {
    suffixes.forEach((suffix) => {
      const storageKey = `${stage}_${variant}_${suffix}`;
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((c: any) => c && c.key !== keyToRemove);
          if (filtered.length !== parsed.length) {
            localStorage.setItem(storageKey, JSON.stringify(filtered));
          }
        }
      } catch {}
    });
  });
}

function stripKeysFromAllSavedCols(stage: string, gradeVariant: string, keysToRemove: string[]): void {
  if (typeof window === 'undefined' || !stage || !gradeVariant || keysToRemove.length === 0) return;
  const removeSet = new Set(keysToRemove);
  const suffixes = ['assessments_custom_cols', 'homeschool_assessments_custom_cols'];

  suffixes.forEach((suffix) => {
    const storageKey = `${stage}_${gradeVariant}_${suffix}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((c: any) => c && !removeSet.has(c.key));
        if (filtered.length !== parsed.length) {
          localStorage.setItem(storageKey, JSON.stringify(filtered));
        }
      }
    } catch {}
  });
}

export function getDeletedSubjectKeys(stage?: string, selectedGrade?: string): string[] {
  if (typeof window === 'undefined' || !stage || !selectedGrade) return [];
  const merged = new Set<string>();

  try {
    const variants = getGradeVariants(selectedGrade);
    variants.forEach((variant) => {
      const raw = localStorage.getItem(`${stage}_${variant}_deleted_subjects`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((k) => {
              if (typeof k === 'string' && k) merged.add(k);
            });
          }
        } catch {}
      }
    });

    const registry = readRegistry();
    const entryKey = getRegistryEntryKey(stage, selectedGrade);
    const regList = registry[entryKey];
    if (Array.isArray(regList)) {
      regList.forEach((k) => {
        if (typeof k === 'string' && k) merged.add(k);
      });
    }
  } catch {
    return Array.from(merged);
  }

  return Array.from(merged);
}

export function filterDeletedSubjects<T extends { key: string }>(
  cols: T[],
  stage?: string,
  selectedGrade?: string
): T[] {
  if (!Array.isArray(cols)) return [];
  if (!stage || !selectedGrade) return cols;
  const deletedKeys = getDeletedSubjectKeys(stage, selectedGrade);
  if (deletedKeys.length === 0) return cols;
  const deletedSet = new Set(deletedKeys);
  return cols.filter((c) => c && !deletedSet.has(c.key));
}

export function markSubjectDeleted(stage: string, selectedGrade: string, key: string): void {
  if (typeof window === 'undefined' || !stage || !selectedGrade || !key) return;
  try {
    const current = getDeletedSubjectKeys(stage, selectedGrade);
    const next = current.includes(key) ? current : [...current, key];

    const variants = getGradeVariants(selectedGrade);
    variants.forEach((variant) => {
      const storageKey = `${stage}_${variant}_deleted_subjects`;
      if (variant === selectedGrade || localStorage.getItem(storageKey) !== null) {
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
    });

    const registry = readRegistry();
    const entryKey = getRegistryEntryKey(stage, selectedGrade);
    registry[entryKey] = next;
    writeRegistry(registry);

    // Synchronously remove from any saved subject column lists so immediate restarts stay in sync
    stripKeyFromSavedCols(stage, selectedGrade, key);
  } catch {}
}

export function clearDeletedSubjects(stage?: string, selectedGrade?: string): void {
  if (typeof window === 'undefined' || !stage || !selectedGrade) return;
  try {
    const variants = getGradeVariants(selectedGrade);
    variants.forEach((variant) => {
      localStorage.removeItem(`${stage}_${variant}_deleted_subjects`);
    });

    const registry = readRegistry();
    const entryKey = getRegistryEntryKey(stage, selectedGrade);
    if (entryKey in registry) {
      delete registry[entryKey];
      writeRegistry(registry);
    }
  } catch {}
}

/**
 * مزامنة واسترجاع قائمة المواد المحذوفة من IndexedDB و localStorage عند تشغيل التطبيق أو تحديثه
 * لضمان بقاء المواد المحذوفة محذوفة عبر إعادة التشغيل وتحديثات المطور ما لم يضغط المستخدم على استعادة الافتراضية.
 */
export async function hydrateDeletedSubjectsFromStorage(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const localRegistry = readRegistry();
    const idbRegistryRaw = await idbGet(IDB_REGISTRY_KEY);
    const idbRegistry: Record<string, string[]> =
      idbRegistryRaw && typeof idbRegistryRaw === 'object' && !Array.isArray(idbRegistryRaw)
        ? idbRegistryRaw
        : {};

    const mergedRegistry: Record<string, string[]> = {};
    const addKeys = (entryKey: string, keys: unknown) => {
      if (!Array.isArray(keys)) return;
      const set = new Set<string>(mergedRegistry[entryKey] || []);
      keys.forEach((k) => {
        if (typeof k === 'string' && k) set.add(k);
      });
      if (set.size > 0) {
        mergedRegistry[entryKey] = Array.from(set);
      }
    };

    Object.entries(idbRegistry).forEach(([k, v]) => addKeys(k, v));
    Object.entries(localRegistry).forEach(([k, v]) => addKeys(k, v));

    // Also scan all per-grade *_deleted_subjects keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const lsKey = localStorage.key(i);
      if (lsKey && lsKey.endsWith('_deleted_subjects')) {
        const prefix = lsKey.slice(0, -'_deleted_subjects'.length);
        const underscoreIdx = prefix.indexOf('_');
        if (underscoreIdx > 0) {
          const st = prefix.slice(0, underscoreIdx);
          const gr = prefix.slice(underscoreIdx + 1);
          try {
            const parsed = JSON.parse(localStorage.getItem(lsKey) || '[]');
            addKeys(getRegistryEntryKey(st, gr), parsed);
          } catch {}
        }
      }
    }

    if (Object.keys(mergedRegistry).length > 0) {
      localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(mergedRegistry));
      idbSet(IDB_REGISTRY_KEY, mergedRegistry).catch(() => {});

      // Ensure per-grade localStorage keys & saved columns also match the merged registry
      Object.entries(mergedRegistry).forEach(([entryKey, keys]) => {
        const sepIdx = entryKey.indexOf('::');
        if (sepIdx <= 0) return;
        const st = entryKey.slice(0, sepIdx);
        const normGrade = entryKey.slice(sepIdx + 2);
        const variants = getGradeVariants(normGrade);
        variants.forEach((variant) => {
          const perGradeKey = `${st}_${variant}_deleted_subjects`;
          const existingRaw = localStorage.getItem(perGradeKey);
          if (existingRaw !== null || variant === normGrade) {
            try {
              const existingParsed = existingRaw ? JSON.parse(existingRaw) : [];
              const mergedList = Array.from(
                new Set([
                  ...(Array.isArray(existingParsed) ? existingParsed : []),
                  ...keys,
                ])
              );
              localStorage.setItem(perGradeKey, JSON.stringify(mergedList));
            } catch {
              localStorage.setItem(perGradeKey, JSON.stringify(keys));
            }
          }
          stripKeysFromAllSavedCols(st, variant, keys);
        });
      });

      window.dispatchEvent(new CustomEvent('deleted-subjects-hydrated'));
    }
  } catch (err) {
    console.warn('[DeletedSubjects] Hydration warning:', err);
  }
}
