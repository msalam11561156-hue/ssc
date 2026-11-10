import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, X, Check, Users, Shield, GraduationCap, School, RotateCcw, Sparkles } from 'lucide-react';
import { Language, StudentData } from '../types';
import { translations } from '../i18n';
import { formatNumberDigits, NumberLang } from '../utils/numberLangHelper';

export interface FilterState {
  gender?: string;
  religion?: string;
  enrollmentType?: string;
  studentClass?: string;
  studentStatus?: string;
  enrollmentStatus?: string;
  committeeNumber?: string;
}

interface FilterButtonMenuProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  lang: Language;
  data: StudentData[];
  numberLang: NumberLang;
  isKindergarten?: boolean;
  className?: string;
}

interface FilterSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { value: string; label: string }[];
  currentVal?: string;
  onSelect: (val: string) => void;
  gradientBg: string;
  borderColor: string;
  iconGradient: string;
  activeBtnGradient: string;
  lang: Language;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  icon: Icon,
  options,
  currentVal,
  onSelect,
  gradientBg,
  borderColor,
  iconGradient,
  activeBtnGradient,
  lang,
}) => (
  <div className={`flex flex-col gap-3 p-4 rounded-2xl border-2 border-slate-900 shadow-sm transition-all hover:shadow-md ${gradientBg} ${borderColor}`}>
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-xl text-white shadow-sm ${iconGradient}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-black text-slate-900 drop-shadow-2xs">{title}</span>
      </div>
      {currentVal && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-900 text-white shadow-xs">
          {lang === 'ar' ? 'مُفعل' : 'Active'}
        </span>
      )}
    </div>
    <div className="flex flex-wrap gap-2 pt-1">
      <button
        type="button"
        onClick={() => onSelect('all')}
        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 border-slate-900 active:scale-95 ${
          !currentVal
            ? 'bg-slate-900 text-white shadow-md scale-102'
            : 'bg-white/90 text-slate-800 hover:bg-white hover:border-slate-900 shadow-xs'
        }`}
      >
        {lang === 'ar' ? 'الكل' : 'All'}
      </button>
      {options.map((opt) => {
        const isSelected = currentVal === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-2 border-slate-900 active:scale-95 ${
              isSelected
                ? `${activeBtnGradient} text-white shadow-md scale-102 ring-2 ring-white/50`
                : 'bg-white/90 text-slate-800 hover:bg-white hover:border-slate-900 shadow-xs'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

export const FilterButtonMenu: React.FC<FilterButtonMenuProps> = ({
  filters,
  onFilterChange,
  lang,
  data,
  numberLang,
  isKindergarten = false,
  className = '',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = translations[lang];

  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(data.map((s) => s.studentClass).filter(Boolean))).sort() as string[];
  }, [data]);

  const uniqueEnrollmentTypes = useMemo(() => {
    return Array.from(new Set(data.map((s) => s.enrollmentType).filter(Boolean))).sort() as string[];
  }, [data]);

  const uniqueEnrollmentStatuses = useMemo(() => {
    return Array.from(new Set(data.map((s) => s.enrollmentStatus).filter(Boolean))).sort() as string[];
  }, [data]);

  const uniqueCommitteeNumbers = useMemo(() => {
    return (
      Array.from(new Set(data.map((s) => s.committeeNumber).filter(Boolean))).sort((a: any, b: any) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA - numB;
      }) as string[]
    );
  }, [data]);

  const activeFilterCount = Object.values(filters).filter((v) => v && v !== 'all').length;

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value === 'all' ? undefined : value });
  };

  const clearFilters = () => {
    onFilterChange({});
    setIsMenuOpen(false);
  };

  return (
    <div className={`relative flex items-stretch ${className}`}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-xl border-2 border-slate-900 transition-all shadow-sm h-full font-black ${
          activeFilterCount > 0
            ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white shadow-purple-200 animate-pulse'
            : 'bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 hover:from-indigo-100 hover:to-pink-100 text-slate-800'
        }`}
        title={lang === 'ar' ? 'تصفية البيانات' : 'Filter Data'}
      >
        <div className="flex items-center gap-2">
          <Filter className={`w-4 h-4 sm:w-5 sm:h-5 ${activeFilterCount > 0 ? 'text-white' : 'text-purple-600'}`} />
          <span className="text-xs sm:text-sm font-black whitespace-nowrap">
            {lang === 'ar' ? 'تصفية' : 'Filter'}
          </span>
        </div>
        {activeFilterCount > 0 && (
          <span className="mr-2 rtl:mr-2 ltr:ml-2 bg-white text-purple-700 w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-black shadow-md shrink-0">
            {activeFilterCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: 20 }}
              transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
              className="relative w-full max-w-2xl bg-white rounded-[28px] shadow-2xl border-2 border-slate-900 overflow-hidden flex flex-col"
            >
              {/* Header with vibrant cheerful gradient */}
              <div className="bg-gradient-to-r from-violet-700 via-purple-600 to-pink-600 px-6 py-4 flex justify-between items-center border-b-2 border-slate-900 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-sm">
                    <Filter className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg sm:text-xl drop-shadow-sm flex items-center gap-2">
                      {lang === 'ar' ? 'خيارات التصفية' : 'Filter Options'}
                    </h3>
                    <p className="text-white/80 text-xs font-bold">
                      {lang === 'ar' ? 'تصفية الطلاب بحسب المعايير المحددة' : 'Filter students by selected criteria'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all border border-white/20 active:scale-95"
                >
                  <X className="w-6 h-6" strokeWidth={2.5} />
                </button>
              </div>

              {/* Body with soft cheerful pastel gradient */}
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 max-h-[70vh] overflow-y-auto custom-scrollbar bg-[linear-gradient(135deg,#f0f9ff_0%,#f5f3ff_35%,#fdf2f8_70%,#fff7ed_100%)]">
                {/* Gender */}
                <FilterSection
                  title={t.gender}
                  icon={Users}
                  gradientBg="bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-indigo-500/10"
                  borderColor="hover:border-pink-500"
                  iconGradient="bg-gradient-to-r from-pink-500 to-rose-600"
                  activeBtnGradient="bg-gradient-to-r from-pink-600 to-rose-600"
                  currentVal={filters.gender}
                  onSelect={(v: string) => updateFilter('gender', v)}
                  options={[
                    { value: 'male', label: t.male },
                    { value: 'female', label: t.female },
                  ]}
                  lang={lang}
                />

                {/* Religion */}
                <FilterSection
                  title={t.religion}
                  icon={Shield}
                  gradientBg="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10"
                  borderColor="hover:border-emerald-500"
                  iconGradient="bg-gradient-to-r from-emerald-500 to-teal-600"
                  activeBtnGradient="bg-gradient-to-r from-emerald-600 to-teal-600"
                  currentVal={filters.religion}
                  onSelect={(v: string) => updateFilter('religion', v)}
                  options={[
                    { value: 'muslim', label: isKindergarten ? 'مسلم / مسلمة' : 'مسلم' },
                    { value: 'christian', label: isKindergarten ? 'مسيحي / مسيحية' : 'مسيحي' },
                  ]}
                  lang={lang}
                />

                {/* Class */}
                {uniqueClasses.length > 0 && (
                  <FilterSection
                    title={lang === 'ar' ? 'الفصل' : 'Class'}
                    icon={GraduationCap}
                    gradientBg="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-yellow-500/10"
                    borderColor="hover:border-amber-500"
                    iconGradient="bg-gradient-to-r from-amber-500 to-orange-500"
                    activeBtnGradient="bg-gradient-to-r from-amber-600 to-orange-600"
                    currentVal={filters.studentClass}
                    onSelect={(v: string) => updateFilter('studentClass', v)}
                    options={uniqueClasses.map((c) => ({ value: c, label: formatNumberDigits(c, numberLang) }))}
                    lang={lang}
                  />
                )}

                {/* Enrollment Status */}
                {uniqueEnrollmentStatuses.length > 0 && (
                  <FilterSection
                    title={lang === 'ar' ? 'حالة القيد' : 'Enrollment Status'}
                    icon={Check}
                    gradientBg="bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-red-500/10"
                    borderColor="hover:border-rose-500"
                    iconGradient="bg-gradient-to-r from-rose-500 to-red-600"
                    activeBtnGradient="bg-gradient-to-r from-rose-600 to-red-600"
                    currentVal={filters.enrollmentStatus}
                    onSelect={(v: string) => updateFilter('enrollmentStatus', v)}
                    options={uniqueEnrollmentStatuses.map((c) => ({ value: c, label: c }))}
                    lang={lang}
                  />
                )}

                {/* Enrollment Type */}
                {uniqueEnrollmentTypes.length > 0 && (
                  <FilterSection
                    title={lang === 'ar' ? 'نوعية القيد' : 'Enrollment Type'}
                    icon={School}
                    gradientBg="bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-purple-500/10"
                    borderColor="hover:border-indigo-500"
                    iconGradient="bg-gradient-to-r from-indigo-500 to-violet-600"
                    activeBtnGradient="bg-gradient-to-r from-indigo-600 to-violet-600"
                    currentVal={filters.enrollmentType}
                    onSelect={(v: string) => updateFilter('enrollmentType', v)}
                    options={uniqueEnrollmentTypes.map((c) => ({ value: c, label: c }))}
                    lang={lang}
                  />
                )}

                {/* Committee Number */}
                {uniqueCommitteeNumbers.length > 0 && (
                  <FilterSection
                    title={lang === 'ar' ? 'رقم اللجنة' : 'Committee Number'}
                    icon={Users}
                    gradientBg="bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-blue-500/10"
                    borderColor="hover:border-cyan-500"
                    iconGradient="bg-gradient-to-r from-cyan-500 to-blue-600"
                    activeBtnGradient="bg-gradient-to-r from-cyan-600 to-blue-600"
                    currentVal={filters.committeeNumber}
                    onSelect={(v: string) => updateFilter('committeeNumber', v)}
                    options={uniqueCommitteeNumbers.map((c) => ({ value: c, label: formatNumberDigits(c, numberLang) }))}
                    lang={lang}
                  />
                )}
              </div>

              {/* Footer with cheerful gradient bar */}
              <div className="p-4 bg-gradient-to-r from-slate-100 via-indigo-50/60 to-purple-50/60 border-t-2 border-slate-900 flex gap-3">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-black border-2 border-slate-900 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {lang === 'ar' ? 'إلغاء التصفية' : 'Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-black border-2 border-slate-900 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" strokeWidth={3} />
                  {lang === 'ar' ? 'تطبيق التصفية' : 'Apply'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
