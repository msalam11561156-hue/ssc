import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDownUp, ArrowDown, ArrowUp, X, Check } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n';
import { SortCriterion } from '../utils/studentSorting';

interface SortButtonMenuProps {
  sortBy: SortCriterion[];
  onSortChange: (newSort: SortCriterion[]) => void;
  lang: Language;
  isKindergarten?: boolean;
  showExamFields?: boolean;
  className?: string;
}

export const SortButtonMenu: React.FC<SortButtonMenuProps> = ({
  sortBy,
  onSortChange,
  lang,
  isKindergarten = false,
  showExamFields = true,
  className = ''
}) => {
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const t = translations[lang];

  const getSortOptionLabel = (id: string) => {
    const opt = [
      { id: 'alphabetical', label: t.sortAlphabetical },
      { id: 'name', label: t.sortAlphabetical },
      { id: 'gender', label: t.sortGender },
      { id: 'status', label: t.sortStatus },
      { id: 'studentStatus', label: isKindergarten ? 'حالة التلميذ' : 'حالة الطالب' },
      { id: 'enrollmentType', label: (t as any).sortEnrollmentType || (t as any).enrollmentType || 'نوعية القيد' },
      { id: 'religion', label: t.sortReligion },
      { id: 'seatNumber', label: (t as any).seatNumber || 'رقم الجلوس' },
      { id: 'secretNumber', label: (t as any).secretNumber || 'الرقم السري' },
      { id: 'total', label: (t as any).totalSort || 'المجموع' }
    ].find(o => o.id === id);
    return opt ? opt.label : id;
  };

  return (
    <div className={`relative ${className}`}>
      <motion.div 
        onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
        className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-500/40 via-white/70 to-pink-500/40 hover:from-blue-500/60 hover:via-white/90 hover:to-pink-500/60 border-2 border-slate-900 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 cursor-pointer transition-all duration-300 shrink-0 whitespace-nowrap select-none"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        style={{ backgroundSize: "200% 200%" }}
        title={isKindergarten ? "تغيير ترتيب التلاميذ" : "تغيير ترتيب الطلاب"}
      >
        <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center whitespace-nowrap gap-1">
          {sortBy.length === 0 ? t.defaultSort : sortBy.map((c, index) => {
            const label = getSortOptionLabel(c.id);
            return (
              <React.Fragment key={c.id}>
                <span className="flex items-center gap-1.5 ml-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs sm:text-sm leading-none font-bold">
                    {index + 1}
                  </span>
                  <span>{label}</span>
                  {c.direction === 'desc' ? (
                    <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" strokeWidth={3} />
                  ) : (
                    <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" strokeWidth={3} />
                  )}
                </span>
              </React.Fragment>
            );
          })}
        </span>
      </motion.div>

      <AnimatePresence>
        {isSortMenuOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsSortMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: 90 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: -90 }}
              transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
              className="relative w-full max-w-xs rounded-3xl overflow-hidden p-1.5 shadow-[0_0_40px_-10px_rgba(0,0,0,0.3)] flex flex-col"
            >
              {/* Moving Light Border */}
              <div className="absolute inset-[-100%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_50%,rgba(99,102,241,1)_100%)] pointer-events-none" />
              
              <div className="relative bg-white/95 backdrop-blur-xl rounded-[20px] flex flex-col w-full h-full overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex justify-between items-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30"></div>
                  <h3 className="text-white font-bold text-lg relative z-10 flex items-center gap-2">
                    <ArrowDownUp className="w-5 h-5 text-blue-200" />
                    {t.sortBy}
                  </h3>
                  <button 
                    onClick={() => setIsSortMenuOpen(false)} 
                    className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all relative z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
                  {[
                    { id: 'default', label: t.defaultSort, color: 'from-blue-500 to-indigo-500', active: 'from-blue-400 via-indigo-500 to-blue-600', shadow: 'shadow-blue-500/30' },
                    { id: 'alphabetical', label: t.sortAlphabetical, color: 'from-emerald-500 to-teal-500', active: 'from-emerald-400 via-teal-500 to-emerald-600', shadow: 'shadow-emerald-500/30' },
                    { id: 'gender', label: t.sortGender, color: 'from-rose-500 to-pink-500', active: 'from-rose-400 via-pink-500 to-rose-600', shadow: 'shadow-rose-500/30' },
                    ...(isKindergarten ? [
                      { id: 'studentStatus', label: isKindergarten ? 'حالة التلميذ' : 'حالة الطالب', color: 'from-amber-500 to-orange-500', active: 'from-amber-400 via-orange-500 to-amber-600', shadow: 'shadow-amber-500/30' }
                    ] : [
                      { id: 'status', label: t.sortStatus, color: 'from-amber-500 to-orange-500', active: 'from-amber-400 via-orange-500 to-amber-600', shadow: 'shadow-amber-500/30' }
                    ]),
                    { id: 'enrollmentType', label: (t as any).sortEnrollmentType || (t as any).enrollmentType || 'نوعية القيد', color: 'from-teal-500 to-emerald-500', active: 'from-teal-400 via-emerald-500 to-teal-600', shadow: 'shadow-teal-500/30' },
                    { id: 'religion', label: t.sortReligion, color: 'from-purple-500 to-fuchsia-500', active: 'from-purple-400 via-fuchsia-500 to-purple-600', shadow: 'shadow-purple-500/30' },
                    ...(showExamFields ? [
                      { id: 'seatNumber', label: (t as any).seatNumber || 'رقم الجلوس', color: 'from-cyan-500 to-blue-500', active: 'from-cyan-400 via-blue-500 to-cyan-600', shadow: 'shadow-cyan-500/30' },
                      { id: 'secretNumber', label: (t as any).secretNumber || 'الرقم السري', color: 'from-sky-500 to-indigo-500', active: 'from-sky-400 via-indigo-500 to-sky-600', shadow: 'shadow-sky-500/30' }
                    ] : [])
                  ].map(opt => {
                    const existingSort = sortBy.find(s => s.id === opt.id || (opt.id === 'alphabetical' && s.id === 'name') || (opt.id === 'name' && s.id === 'alphabetical'));
                    const isSelected = (opt.id === 'default' && sortBy.length === 0) || !!existingSort;
                    const sortIndex = sortBy.findIndex(s => s.id === opt.id || (opt.id === 'alphabetical' && s.id === 'name') || (opt.id === 'name' && s.id === 'alphabetical'));
                    return (
                      <motion.div
                        key={opt.id}
                        whileHover={{ scale: 1.02 }}
                        className={`relative rounded-2xl overflow-hidden ${isSelected ? `p-[2px] ${opt.shadow} shadow-lg` : 'border-2 border-slate-900 opacity-80 hover:opacity-100'}`}
                      >
                        {isSelected && (
                          <div className="absolute inset-[-100%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_40%,#3b82f6_60%,#d946ef_80%,#06b6d4_100%)] pointer-events-none" />
                        )}
                        <motion.button
                          onClick={() => { 
                            if (opt.id === 'default') {
                              onSortChange([]);
                              setIsSortMenuOpen(false);
                            } else {
                              const matchId = existingSort ? existingSort.id : opt.id;
                              if (existingSort) {
                                if (existingSort.direction === 'asc') {
                                  onSortChange(sortBy.map(s => s.id === matchId ? { ...s, direction: 'desc' } : s));
                                } else {
                                  onSortChange(sortBy.filter(s => s.id !== matchId));
                                }
                              } else {
                                onSortChange([...sortBy, { id: opt.id, direction: 'asc' }]);
                              }
                            }
                          }}
                          className={`relative w-full flex items-center justify-between px-5 py-3.5 text-base font-bold text-white bg-gradient-to-r rounded-[14px] ${isSelected ? opt.active : opt.color}`}
                          animate={isSelected ? { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] } : {}}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          style={isSelected ? { backgroundSize: "200% 200%" } : {}}
                        >
                          <div className="w-6 flex justify-start items-center">
                            {existingSort && (
                              existingSort.direction === 'desc' ? <ArrowDown className="w-4 h-4 text-white/90" /> : <ArrowUp className="w-4 h-4 text-white/90" />
                            )}
                          </div>
                          <span className="flex-1 text-center">{opt.label}</span>
                          <div className="w-6 flex justify-end items-center">
                            {isSelected && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                <div className="bg-white text-slate-900 w-6 h-6 flex items-center justify-center rounded-full font-black text-xs shadow-sm">
                                  {opt.id === 'default' ? <Check className="w-3 h-3" /> : sortIndex + 1}
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </motion.button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
