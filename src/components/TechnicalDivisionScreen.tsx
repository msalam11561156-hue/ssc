import React, { useState, useEffect } from 'react';
import { translations } from '../i18n';
import { Language } from '../types';
import { ArrowLeft, ArrowRight, Layers, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface TechnicalDivisionScreenProps {
  lang: Language;
  onBack: () => void;
  onSave: (division: string) => void;
  initialDivision?: string;
  subtitle?: string;
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = 'sheet_control_technical_divisions';

function loadSavedDivisions(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    );
  } catch {
    return [];
  }
}

function saveDivisionsToStorage(storageKey: string, list: string[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to save technical divisions list:', err);
  }
}

export const TechnicalDivisionScreen: React.FC<TechnicalDivisionScreenProps> = ({
  lang,
  onBack,
  onSave,
  initialDivision = '',
  subtitle,
  storageKey = DEFAULT_STORAGE_KEY,
}) => {
  const t = translations[lang];
  const isAr = lang === 'ar';

  const [savedDivisions, setSavedDivisions] = useState<string[]>(() => {
    const existing = loadSavedDivisions(storageKey);
    const cleanedInitial = (initialDivision || '').trim();
    if (cleanedInitial && !existing.includes(cleanedInitial)) {
      const merged = [cleanedInitial, ...existing];
      saveDivisionsToStorage(storageKey, merged);
      return merged;
    }
    return existing;
  });

  const [selectedDivision, setSelectedDivision] = useState<string>(() => {
    const cleanedInitial = (initialDivision || '').trim();
    if (cleanedInitial) return cleanedInitial;
    const existing = loadSavedDivisions(storageKey);
    return existing[0] || '';
  });

  const [newDivisionText, setNewDivisionText] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    const cleanedInitial = (initialDivision || '').trim();
    if (cleanedInitial) {
      setSavedDivisions((prev) => {
        if (prev.includes(cleanedInitial)) return prev;
        const next = [cleanedInitial, ...prev];
        saveDivisionsToStorage(storageKey, next);
        return next;
      });
      setSelectedDivision(cleanedInitial);
    }
  }, [initialDivision, storageKey]);

  useEffect(() => {
    if (!feedbackMsg) return;
    const timer = window.setTimeout(() => {
      setFeedbackMsg(null);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [feedbackMsg]);

  const insertDivision = (rawName: string): string | null => {
    const trimmed = rawName.trim().slice(0, 60);
    if (!trimmed) {
      setFeedbackMsg({
        type: 'error',
        text: isAr ? 'يرجى كتابة اسم الشعبة أولاً' : 'Please enter the division name first',
      });
      return null;
    }

    const existingMatch = savedDivisions.find(
      (d) => d.trim().toLowerCase() === trimmed.toLowerCase()
    );
    const finalName = existingMatch || trimmed;

    if (!existingMatch) {
      const updated = [...savedDivisions, finalName];
      setSavedDivisions(updated);
      saveDivisionsToStorage(storageKey, updated);
    }

    setSelectedDivision(finalName);
    setNewDivisionText('');
    setFeedbackMsg({
      type: 'success',
      text: existingMatch
        ? (isAr ? `تم اختيار الشعبة ( ${finalName} ) من القائمة` : `Selected ( ${finalName} ) from list`)
        : (isAr ? `تم إدراج الشعبة ( ${finalName} ) في القائمة المنسدلة` : `Added ( ${finalName} ) to dropdown`),
    });
    return finalName;
  };

  const handleInsertClick = () => {
    insertDivision(newDivisionText);
  };

  const handleDeleteSelected = () => {
    if (!selectedDivision) return;
    const updated = savedDivisions.filter((d) => d !== selectedDivision);
    setSavedDivisions(updated);
    saveDivisionsToStorage(storageKey, updated);
    setSelectedDivision(updated[0] || '');
    setFeedbackMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const typed = newDivisionText.trim();
    if (typed) {
      const inserted = insertDivision(typed);
      if (inserted) {
        onSave(inserted);
      }
      return;
    }

    if (selectedDivision.trim()) {
      onSave(selectedDivision.trim());
      return;
    }

    setFeedbackMsg({
      type: 'error',
      text: isAr
        ? 'يرجى كتابة اسم الشعبة وإدراجها أو اختيارها من القائمة المنسدلة'
        : 'Please enter a division name or select one from the dropdown',
    });
  };

  return (
    <div
      className="w-full max-w-4xl mx-auto relative p-[8px] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-white/40 via-slate-800/40 to-white/25"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="rounded-2xl p-8 md:p-12 border-[1.5px] border-slate-900 relative z-10 overflow-hidden w-full h-full">
        <div
          className="absolute inset-0 z-[-1] bg-gradient-to-r from-slate-300 via-rose-600 to-[#d4a373]"
        />

        {/* Title */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="relative inline-block pb-6">
            <h2 className="text-3xl font-extrabold text-[#2d3748] px-4 flex items-center justify-center gap-3">
              <Layers className="w-8 h-8 text-rose-600" />
              {isAr ? 'الشعبة' : 'Division'}
            </h2>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-600 to-transparent overflow-hidden rounded-full" />
          </div>
          {subtitle && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-xs sm:text-sm md:text-base font-bold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-2 text-center"
            >
              {subtitle}
            </motion.div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
          {/* مربع نص لكتابة اسم الشعبة + زر إدراج */}
          <div className="bg-white/95 rounded-2xl p-5 border-[1.5px] border-slate-900 shadow-md space-y-3">
            <label className="block text-sm font-extrabold text-slate-800">
              {isAr ? 'كتابة اسم الشعبة' : 'Enter Division Name'}
            </label>
            <div className="flex items-stretch gap-2.5">
              <input
                type="text"
                maxLength={60}
                value={newDivisionText}
                onChange={(e) => {
                  setNewDivisionText(e.target.value);
                  if (feedbackMsg) setFeedbackMsg(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInsertClick();
                  }
                }}
                placeholder={isAr ? 'اكتب اسم الشعبة هنا لإدراجها فى القائمة...' : 'Type division name to insert...'}
                className="flex-1 bg-white border-[1.5px] border-slate-900 rounded-xl py-3 px-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              />
              <button
                type="button"
                onClick={handleInsertClick}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold border-[1.5px] border-slate-900 shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>{isAr ? 'إدراج' : 'Insert'}</span>
              </button>
            </div>
          </div>

          {/* القائمة المنسدلة للشعب المدرجة */}
          <div className="bg-white/95 rounded-2xl p-5 border-[1.5px] border-slate-900 shadow-md space-y-3">
            <label className="block text-sm font-extrabold text-slate-800">
              {isAr ? 'الشعب المدرجة ( القائمة المنسدلة )' : 'Saved Divisions'}
            </label>
            <div className="flex items-stretch gap-2.5">
              <select
                value={selectedDivision}
                onChange={(e) => {
                  setSelectedDivision(e.target.value);
                  if (feedbackMsg) setFeedbackMsg(null);
                }}
                className="flex-1 bg-white border-[1.5px] border-slate-900 rounded-xl py-3 px-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">
                  {savedDivisions.length > 0
                    ? (isAr ? 'اختر الشعبة...' : 'Select division...')
                    : (isAr ? 'لا توجد شعب مدرجة بعد — اكتب اسم الشعبة أعلاه' : 'No saved divisions yet')}
                </option>
                {savedDivisions.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>

              {selectedDivision && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  title={isAr ? 'حذف الشعبة المحددة من القائمة' : 'Remove selected division'}
                  className="px-3.5 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border-[1.5px] border-red-600 flex items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {feedbackMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-[1.5px] text-sm font-bold shadow-sm ${
                feedbackMsg.type === 'error'
                  ? 'bg-red-50 border-red-600 text-red-800'
                  : 'bg-emerald-50 border-emerald-700 text-emerald-900'
              }`}
            >
              {feedbackMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </motion.div>
          )}

          <div className="pt-4 flex flex-col items-center gap-4">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-rose-600 to-transparent relative overflow-hidden rounded-full opacity-50">
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                className="w-full h-full bg-white shadow-[0_0_10px_3px_rgba(225,29,72,0.8)]"
              />
            </div>

            <div className="w-full sm:w-3/4 flex gap-4">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-slate-400 via-rose-600 to-[#d4a373] hover:from-slate-500 hover:via-rose-700 hover:to-[#bc8c5d] text-white font-bold py-4 px-2 rounded-lg transition-all active:scale-[0.98] border-[1.5px] border-slate-900 shadow-lg text-sm md:text-base cursor-pointer"
              >
                {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                {t.back}
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-slate-400 via-rose-600 to-[#d4a373] hover:from-slate-500 hover:via-rose-700 hover:to-[#bc8c5d] text-white font-bold py-4 px-2 rounded-lg transition-all active:scale-[0.98] border-[1.5px] border-slate-900 shadow-lg text-sm md:text-base cursor-pointer"
              >
                {t.save}
                {isAr ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
