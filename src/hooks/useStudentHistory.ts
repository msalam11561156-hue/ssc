import { useCallback, useEffect, useRef, useState } from 'react';
import { StudentData } from '../types';

const MAX_HISTORY_STEPS = 40;
const COALESCE_WINDOW_MS = 600;

interface UseStudentHistoryOptions {
  onApply?: (nextData: StudentData[]) => void;
  enableShortcuts?: boolean;
}

function detectChangedStudentId(prev: StudentData[], next: StudentData[]): string | null {
  if (prev.length !== next.length) return null;
  let changedId: string | null = null;
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] !== next[i]) {
      if (changedId !== null) {
        return null; // Multiple students changed
      }
      changedId = next[i]?.id || prev[i]?.id || null;
    }
  }
  return changedId;
}

export function useStudentHistory(
  data: StudentData[],
  propOnChange: (nextData: StudentData[]) => void,
  options?: UseStudentHistoryOptions
) {
  const pastRef = useRef<StudentData[][]>([]);
  const futureRef = useRef<StudentData[][]>([]);
  const latestDataRef = useRef<StudentData[]>(data);
  const lastEditMetaRef = useRef<{ time: number; studentId: string | null }>({
    time: 0,
    studentId: null,
  });

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

  const handleChange = useCallback(
    (nextData: StudentData[], immediate = false) => {
      const prevData = latestDataRef.current;
      const now = Date.now();
      const singleStudentId = detectChangedStudentId(prevData, nextData);
      const isRapidSameStudentEdit =
        !immediate &&
        singleStudentId !== null &&
        lastEditMetaRef.current.studentId === singleStudentId &&
        now - lastEditMetaRef.current.time < COALESCE_WINDOW_MS &&
        pastRef.current.length > 0;

      if (!isRapidSameStudentEdit) {
        pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY_STEPS - 1)), prevData];
      }

      futureRef.current = [];
      lastEditMetaRef.current = {
        time: now,
        studentId: immediate ? null : singleStudentId,
      };
      latestDataRef.current = nextData;
      syncCounts();

      options?.onApply?.(nextData);
      propOnChange(nextData);
    },
    [propOnChange, options?.onApply, syncCounts]
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return null;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current.slice(-(MAX_HISTORY_STEPS - 1)), latestDataRef.current];
    lastEditMetaRef.current = { time: 0, studentId: null };
    latestDataRef.current = previous;
    syncCounts();

    options?.onApply?.(previous);
    propOnChange(previous);
    return previous;
  }, [propOnChange, options?.onApply, syncCounts]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return null;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY_STEPS - 1)), latestDataRef.current];
    lastEditMetaRef.current = { time: 0, studentId: null };
    latestDataRef.current = next;
    syncCounts();

    options?.onApply?.(next);
    propOnChange(next);
    return next;
  }, [propOnChange, options?.onApply, syncCounts]);

  const resetHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    lastEditMetaRef.current = { time: 0, studentId: null };
    syncCounts();
  }, [syncCounts]);

  useEffect(() => {
    if (options?.enableShortcuts === false) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
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
        }
      } else if (isRedoKey) {
        if (futureRef.current.length > 0) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [undo, redo, options?.enableShortcuts]);

  return {
    handleChange,
    undo,
    redo,
    resetHistory,
    canUndo: historyCounts.undo > 0,
    canRedo: historyCounts.redo > 0,
    undoCount: historyCounts.undo,
    redoCount: historyCounts.redo,
  };
}
