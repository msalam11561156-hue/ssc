import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ControlData, EducationalStage, Language } from '../types';
import { translations } from '../i18n';
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, Layers, AlertCircle } from 'lucide-react';

interface GradesScreenProps {
  data: ControlData;
  stage: EducationalStage;
  systemType?: 'regular' | 'homeschool' | 'services';
  onChange: (data: ControlData) => void;
  onBack: () => void;
  onEditData?: () => void;
  onEditGrades?: () => void;
  isOfficial?: boolean;
  hasStudentsForGrade?: (grade: string) => boolean;
  lang: Language;
}

export const GradesScreen: React.FC<GradesScreenProps> = ({ 
  data, 
  stage, 
  systemType, 
  onChange, 
  onBack, 
  onEditData, 
  onEditGrades, 
  isOfficial = false,
  hasStudentsForGrade,
  lang 
}) => {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const t = translations[lang];

  const getGradesForStage = () => {
    switch (stage) {
      case 'kindergarten': return (t as any).kgGrades;
      case 'primary': return t.primaryGrades;
      case 'middle': return t.middleGrades;
      case 'secondary':
      case 'commercial_technical':
      case 'industrial_technical':
      case 'agricultural_technical':
      case 'hotel_technical':
        return t.secondaryGrades;
      default: return [];
    }
  };

  const grades = getGradesForStage();

  const selectGrade = (grade: string) => {
    onChange({ ...data, selectedGrade: grade });
  };

  const handleAction = (action?: () => void) => {
    if (!data.selectedGrade) {
      setShowWarningModal(true);
      return;
    }
    if (action) {
      action();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.selectedGrade) {
      setShowWarningModal(true);
      return;
    }
    // Implementation for saving or finishing
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      className="w-full max-w-4xl mx-auto relative p-[8px] rounded-3xl overflow-hidden shadow-2xl"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-[conic-gradient(transparent_270deg,#ffffff_360deg)]"
      />
      
      <div className="rounded-2xl p-8 md:p-12 border-[1.5px] border-slate-900 relative z-10 overflow-hidden w-full h-full">
        <motion.div
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
          className="absolute inset-0 z-[-1] bg-gradient-to-r from-[#14b8a6] via-[#d4a373] to-[#c2410c] bg-[length:400%_400%]"
        />
        
        {/* Title */}
        <div className="flex flex-col items-center justify-center mb-10">
          <motion.div
            animate={{ x: [-8, 8, -8] }}
            transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
            className="relative inline-block pb-4"
          >
            <h2 className="text-3xl font-extrabold text-[#2d3748] px-4 flex items-center justify-center gap-3"><Layers className="w-8 h-8 text-[#14b8a6]" />{t.gradesScreenTitle}</h2>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#14b8a6] to-transparent overflow-hidden rounded-full">
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                className="w-full h-full bg-white shadow-[0_0_10px_3px_rgba(20,184,166,0.8)]"
              />
            </div>
          </motion.div>
          {stage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-lg font-bold text-slate-500"
            >
              {lang === 'ar' ? (
                stage === 'middle' && systemType === 'homeschool'
                  ? 'المرحلة الإعدادية ( منازل )'
                  : stage === 'middle' && systemType === 'regular'
                  ? 'المرحلة الإعدادية ( منتظمين )'
                  : stage === 'secondary' && systemType === 'homeschool'
                  ? 'المرحلة الثانوية العامة - البكالوريا - منازل'
                  : stage === 'secondary' && systemType === 'services'
                  ? 'المرحلة الثانوية العامة - البكالوريا - خدمات'
                  : stage === 'secondary' && systemType === 'regular'
                  ? 'المرحلة الثانوية العامة - البكالوريا - منتظمين'
                  : `${(t as any).stageNamePrefix}${stage.includes('technical') || stage === 'kindergarten' ? ' : ' : ' '}${(t as any)[stage.replace(/_([a-z])/g, (g) => g[1].toUpperCase())]}`
              ) : (
                stage === 'secondary' && systemType === 'homeschool'
                  ? 'General Secondary (Baccalaureate) - Homeschool'
                  : stage === 'secondary' && systemType === 'services'
                  ? 'General Secondary (Services)'
                  : stage === 'secondary' && systemType === 'regular'
                  ? 'General Secondary (Regular)'
                  : `${(t as any)[stage.replace(/_([a-z])/g, (g) => g[1].toUpperCase())]} ${(t as any).stageNamePrefix}`.trim()
              )}
            </motion.div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="pt-2">
            <div className="flex flex-col items-center gap-4">
              {grades.map((grade) => {
                const isSelected = data.selectedGrade === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => selectGrade(grade)}
                    className={`w-1/2 flex items-center gap-3 p-4 rounded-lg border-[1.5px] transition-all text-right shadow-sm ${
                      isSelected 
                        ? 'bg-[#d4a373]/20 border-white text-white' 
                        : 'bg-white border-slate-900 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    )}
                    <span className="font-bold text-lg">{grade}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-8 flex flex-col items-center gap-4">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#14b8a6] to-transparent relative overflow-hidden rounded-full opacity-50">
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                className="w-full h-full bg-white shadow-[0_0_10px_3px_rgba(20,184,166,0.8)]"
              />
            </div>
            <div className="w-full lg:w-3/4 flex gap-2 md:gap-4">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#14b8a6] via-[#d4a373] to-[#c2410c] hover:from-[#0f766e] hover:via-[#bc8c5d] hover:to-[#9a3412] text-white font-bold py-4 px-2 rounded-lg transition-all active:scale-[0.98] border-[1.5px] border-slate-900 shadow-lg text-sm md:text-base"
              >
                {lang === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                {t.back}
              </button>
              <button
                type="button"
                onClick={() => handleAction(onEditData)}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#14b8a6] via-[#d4a373] to-[#c2410c] hover:from-[#0f766e] hover:via-[#bc8c5d] hover:to-[#9a3412] text-white font-bold py-4 px-2 rounded-lg transition-all active:scale-[0.98] border-[1.5px] border-slate-900 shadow-lg text-sm md:text-base"
              >
                {t.editData}
              </button>
              {(() => {
                const isGradesDisabled = Boolean(
                  isOfficial && (
                    !data.selectedGrade ||
                    (hasStudentsForGrade ? !hasStudentsForGrade(data.selectedGrade) : false)
                  )
                );
                return (
                  <button
                    type="button"
                    disabled={isGradesDisabled}
                    onClick={() => {
                      if (isGradesDisabled) return;
                      handleAction(onEditGrades);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 rounded-lg transition-all active:scale-[0.98] border-[1.5px] shadow-lg text-sm md:text-base ${
                      isGradesDisabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-400 border-slate-500 text-slate-200 shadow-none'
                        : 'bg-gradient-to-r from-[#14b8a6] via-[#d4a373] to-[#c2410c] hover:from-[#0f766e] hover:via-[#bc8c5d] hover:to-[#9a3412] text-white font-bold border-slate-900'
                    }`}
                  >
                    {t.editGrades}
                  </button>
                );
              })()}
            </div>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {showWarningModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/70 backdrop-blur-sm rounded-[10px]"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#1e293b] border-2 border-[#14b8a6] p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center gap-6 relative"
            >
              <div className="w-16 h-16 bg-[#14b8a6]/20 rounded-full flex items-center justify-center shadow-inner border border-[#14b8a6]">
                <AlertCircle className="w-8 h-8 text-[#14b8a6]" />
              </div>
              
              <div className="text-white text-lg md:text-xl font-bold leading-relaxed text-justify" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                {t.selectGradeRequired}
              </div>

              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="w-full py-3 bg-gradient-to-r from-[#14b8a6] via-[#d4a373] to-[#c2410c] hover:from-[#0f766e] hover:via-[#bc8c5d] hover:to-[#9a3412] text-white font-bold text-lg rounded-xl transition-all active:scale-[0.98] border-[1.5px] border-slate-900 shadow-md"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
