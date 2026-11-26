import { useCallback, useEffect, useRef, useState } from 'react';
import { StudentData } from '../types';

const MAX_HISTORY_STEPS = 40;
const COALESCE_WINDOW_MS = 600;

interface UseStudentHistoryOptions {
  onApply?: (nextData: StudentData[]) => void;
  onHistoryNavigate?: (direction: 'undo' | 'redo', nextData: StudentData[]) => void;
  enableShortcuts?: boolean;
}

function areValuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!areValuesEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!areValuesEqual(objA[key], objB[key])) return false;
  }
  return true;
}

function areStudentListsEqual(prev: StudentData[], next: StudentData[]): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] !== next[i] && !areValuesEqual(prev[i], next[i])) {
      return false;
    }
  }
  return true;
}

function collectDiffPaths(a: unknown, b: unknown, prefix: string, out: string[]): void {
  if (areValuesEqual(a, b)) return;
  if (
    a !== null &&
    b !== null &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)]);
    for (const key of allKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (!areValuesEqual(objA[key], objB[key])) {
        collectDiffPaths(objA[key], objB[key], path, out);
      }
    }
    return;
  }
  out.push(prefix || 'value');
}

function detectChangedEditSignature(prev: StudentData[], next: StudentData[]): string | null {
  if (prev.length !== next.length) return null;
  let changedIndex = -1;
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] !== next[i] && !areValuesEqual(prev[i], next[i])) {
      if (changedIndex !== -1) {
        return null; // Multiple students changed
      }
      changedIndex = i;
    }
  }
  if (changedIndex === -1) return null;
  const studentId = next[changedIndex]?.id || prev[changedIndex]?.id;
  if (!studentId) return null;
  const paths: string[] = [];
  collectDiffPaths(prev[changedIndex], next[changedIndex], '', paths);
  if (paths.length === 0) return null;
  paths.sort();
  return `${studentId}::${paths.join('|')}`;
}

export function useStudentHistory(
  data: StudentData[],
  propOnChange: (nextData: StudentData[]) => void,
  options?: UseStudentHistoryOptions
) {
  const pastRef = useRef<StudentData[][]>([]);
  const futureRef = useRef<StudentData[][]>([]);
  const latestDataRef = useRef<StudentData[]>(data);
  const lastEditMetaRef = useRef<{ time: number; signature: string | null }>({
    time: 0,
    signature: null,
  });

  const propOnChangeRef = useRef(propOnChange);
  propOnChangeRef.current = propOnChange;

  const onApplyRef = useRef(options?.onApply);
  onApplyRef.current = options?.onApply;

  const onHistoryNavigateRef = useRef(options?.onHistoryNavigate);
  onHistoryNavigateRef.current = options?.onHistoryNavigate;

  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  const syncCounts = useCallback(() => {
    setHistoryCounts({
      undo: pastRef.current.length,
      redo: futureRef.current.length,
    });
  }, []);

  const applySilentChange = useCallback((nextData: StudentData[]) => {
    if (areStudentListsEqual(latestDataRef.current, nextData)) {
      return;
    }
    latestDataRef.current = nextData;
    onApplyRef.current?.(nextData);
    propOnChangeRef.current(nextData);
  }, []);

  const handleChange = useCallback(
    (nextData: StudentData[], immediate = false) => {
      const prevData = latestDataRef.current;
      if (areStudentListsEqual(prevData, nextData)) {
        return;
      }

      const now = Date.now();
      const editSignature = detectChangedEditSignature(prevData, nextData);
      const isRapidSameFieldEdit =
        !immediate &&
        editSignature !== null &&
        lastEditMetaRef.current.signature === editSignature &&
        now - lastEditMetaRef.current.time < COALESCE_WINDOW_MS &&
        pastRef.current.length > 0;

      if (!isRapidSameFieldEdit) {
        pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY_STEPS - 1)), prevData];
      }

      futureRef.current = [];
      lastEditMetaRef.current = {
        time: now,
        signature: immediate ? null : editSignature,
      };
      latestDataRef.current = nextData;
      syncCounts();

      onApplyRef.current?.(nextData);
      propOnChangeRef.current(nextData);
    },
    [syncCounts]
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return null;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current.slice(-(MAX_HISTORY_STEPS - 1)), latestDataRef.current];
    lastEditMetaRef.current = { time: 0, signature: null };
    latestDataRef.current = previous;
    syncCounts();

    onHistoryNavigateRef.current?.('undo', previous);
    onApplyRef.current?.(previous);
    propOnChangeRef.current(previous);
    return previous;
  }, [syncCounts]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return null;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY_STEPS - 1)), latestDataRef.current];
    lastEditMetaRef.current = { time: 0, signature: null };
    latestDataRef.current = next;
    syncCounts();

    onHistoryNavigateRef.current?.('redo', next);
    onApplyRef.current?.(next);
    propOnChangeRef.current(next);
    return next;
  }, [syncCounts]);

  const resetHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    lastEditMetaRef.current = { time: 0, signature: null };
    syncCounts();
  }, [syncCounts]);

  useEffect(() => {
    if (options?.enableShortcuts === false) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) &&
        !target.closest('table')
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code;

      const isUndoKey = (key === 'z' || code === 'KeyZ') && !e.shiftKey;
      const isRedoKey =
        key === 'y' ||
        code === 'KeyY' ||
        ((key === 'z' || code === 'KeyZ') && e.shiftKey);

      if (isUndoKey) {
        if (pastRef.current.length > 0) {
          e.preventDefault();
          undo();
        } else if (target && target.closest('table')) {
          e.preventDefault();
        }
      } else if (isRedoKey) {
        if (futureRef.current.length > 0) {
          e.preventDefault();
          redo();
        } else if (target && target.closest('table')) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [undo, redo, options?.enableShortcuts]);

  return {
    handleChange,
    applySilentChange,
    undo,
    redo,
    resetHistory,
    canUndo: historyCounts.undo > 0,
    canRedo: historyCounts.redo > 0,
    undoCount: historyCounts.undo,
    redoCount: historyCounts.redo,
  };
}
