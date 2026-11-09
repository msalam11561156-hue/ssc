import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, X, Check, Users, Shield, GraduationCap, School } from 'lucide-react';
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

export const FilterButtonMenu: React.FC<FilterButtonMenuProps> = ({
  filters,
  onFilterChange,
  lang,
  data,
  numberLang,
  isKindergarten = false,
  className = ''
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = translations[lang];

  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(data.map(s => s.studentClass).filter(Boolean))).sort() as string[];
  }, [data]);

  const uniqueEnrollmentTypes = useMemo(() => {
    return Array.from(new Set(data.map(s => s.enrollmentType).filter(Boolean))).sort() as string[];
  }, [data]);

  const uniqueEnrollmentStatuses = useMemo(() => {
    return Array.from(new Set(data.map(s => s.enrollmentStatus).filter(Boolean))).sort() as string[];
  }, [data]);

  const uniqueCommitteeNumbers = useMemo(() => {
    return Array.from(new Set(data.map(s => s.committeeNumber).filter(Boolean))).sort((a: any, b: any) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    }) as string[];
  }, [data]);

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length;

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value === 'all' ? undefined : value });
  };

  const clearFilters = () => {
    onFilterChange({});
    setIsMenuOpen(false);
  };

  const FilterSection = ({ title, icon: Icon, options, currentVal, onSelect, colorClass }: any) => (
    <div className="flex flex-col gap-2.5 p-3.5 bg-slate-50/90 rounded-2xl border-2 border-black shadow-sm">
      <div className="flex items-center gap-2 px-1 mb-0.5">
        <Icon className={`w-4 h-4 ${colorClass}`} />
        <span className="text-sm font-black text-slate-900">{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelect('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border-2 border-black ${
            !currentVal ? 'bg-black text-white shadow-sm' : 'bg-white text-slate-800 hover:bg-slate-100'
          }`}
        >
          {lang === 'ar' ? 'الكل' : 'All'}
        </button>
        {options.map((opt: any) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border-2 border-black ${
              currentVal === opt.value 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-white text-slate-800 hover:bg-slate-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`relative flex items-stretch ${className}`}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border-2 transition-all shadow-sm h-full ${
          activeFilterCount > 0 
            ? 'bg-indigo-600 border-indigo-700 text-white shadow-indigo-200' 
            : 'bg-white border-slate-900 text-slate-700 hover:bg-slate-50'
        }`}
        title={lang === 'ar' ? 'تصفية البيانات' : 'Filter Data'}
      >
        <div className="flex items-center gap-1.5">
          <Filter className={`w-4 h-4 sm:w-5 sm:h-5 ${activeFilterCount > 0 ? 'text-white' : 'text-slate-500'}`} />
          <span className="text-xs sm:text-sm font-black whitespace-nowrap">
            {lang === 'ar' ? 'تصفية' : 'Filter'}
          </span>
        </div>
        {activeFilterCount > 0 && (
          <span className="mr-4 sm:mr-5 rtl:mr-5 ltr:ml-5 bg-white text-indigo-600 w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-black shadow-sm shrink-0">
            {activeFilterCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[28px] shadow-2xl border-2 border-black overflow-hidden"
            >
              <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b-2 border-black">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-white font-black text-lg">{lang === 'ar' ? 'خيارات التصفية' : 'Filter Options'}</h3>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Gender */}
                <FilterSection
                  title={t.gender}
                  icon={Users}
                  colorClass="text-blue-500"
                  currentVal={filters.gender}
                  onSelect={(v: string) => updateFilter('gender', v)}
                  options={[
                    { value: 'male', label: t.male },
                    { value: 'female', label: t.female }
                  ]}
                />

                {/* Religion */}
                <FilterSection
                  title={t.religion}
                  icon={Shield}
                  colorClass="text-emerald-500"
                  currentVal={filters.religion}
                  onSelect={(v: string) => updateFilter('religion', v)}
                  options={[
                    { value: 'muslim', label: isKindergarten ? 'مسلم / مسلمة' : 'مسلم' },
                    { value: 'christian', label: isKindergarten ? 'مسيحي / مسيحية' : 'مسيحي' }
                  ]}
                />

                {/* Class */}
                {uniqueClasses.length > 0 && (
                  <FilterSection
                    title={lang === 'ar' ? 'الفصل' : 'Class'}
                    icon={GraduationCap}
                    colorClass="text-amber-500"
                    currentVal={filters.studentClass}
                    onSelect={(v: string) => updateFilter('studentClass', v)}
                    options={uniqueClasses.map(c => ({ value: c, label: formatNumberDigits(c, numberLang) }))}
                  />
                )}

                {/* Enrollment Status */}
                {uniqueEnrollmentStatuses.length > 0 && (
                  <FilterSection
                    title={lang === 'ar' ? 'حالة القيد' : 'Enrollment Status'}
                    icon={Check}
                    colorClass="text-rose-500"
                    currentVal={filters.enrollmentStatus}
                    onSelect={(v: string) => updateFilter('enrollmentStatus', v)}
                    options={uniqueEnrollmentStatuses.map(c => ({ value: c, label: c }))}
                  />
                )}

                {/* Enrollment Type */}
                {uniqueEnrollmentTypes.length > 0 && (
                  <FilterSection
                    title={lang === 'ar' ? 'نوعية القيد' : 'Enrollment Type'}
                    icon={School}
                    colorClass="text-purple-500"
                    currentVal={filters.enrollmentType}
                    onSelect={(v: string) => updateFilter('enrollmentType', v)}
                    options={uniqueEnrollmentTypes.map(c => ({ value: c, label: c }))}
                  />
                )}

                {/* Committee Number */}
                {uniqueCommitteeNumbers.length > 0 && (
                  <FilterSection
                    title={lang === 'ar' ? 'رقم اللجنة' : 'Committee Number'}
                    icon={Users}
                    colorClass="text-cyan-500"
                    currentVal={filters.committeeNumber}
                    onSelect={(v: string) => updateFilter('committeeNumber', v)}
                    options={uniqueCommitteeNumbers.map(c => ({ value: c, label: formatNumberDigits(c, numberLang) }))}
                  />
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t-2 border-black flex gap-3">
                <button
                  onClick={clearFilters}
                  className="flex-1 py-3 rounded-xl bg-white border-2 border-black text-slate-900 font-black hover:bg-slate-100 transition-colors shadow-sm"
                >
                  {lang === 'ar' ? 'إلغاء التصفية' : 'Reset'}
                </button>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 border-2 border-black shadow-sm"
                >
                  <Check className="w-5 h-5" />
                  {lang === 'ar' ? 'تطبيق' : 'Apply'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
