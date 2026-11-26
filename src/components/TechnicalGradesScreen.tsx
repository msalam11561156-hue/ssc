import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FAST_MODAL_FLIP, FAST_BACKDROP_FADE } from '../utils/flipAnimation';
import { ControlData, EducationalStage, Language } from '../types';
import { translations } from '../i18n';
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, Layers, AlertCircle } from 'lucide-react';

interface TechnicalGradesScreenProps {
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

const TECHNICAL_STAGE_LABELS: Record<string, string> = {
  commercial_technical: 'المرحلة : التعليم الفنى التجارى',
  industrial_technical: 'المرحلة : التعليم الفنى الصناعى',
  agricultural_technical: 'المرحلة : التعليم الفنى الزراعى',
  hotel_technical: 'المرحلة : التعليم الفنى الفندقى',
};

export const TechnicalGradesScreen: React.FC<TechnicalGradesScreenProps> = ({
  data,
  stage,
  systemType,
  onChange,
  onBack,
  onEditData,
  onEditGrades,
  isOfficial = false,
  hasStudentsForGrade,
  lang,
}) => {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const t = translations[lang];

  const grades = t.secondaryGrades;

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
    }
  };

  const stageLabel =
    stage && TECHNICAL_STAGE_LABELS[stage]
      ? TECHNICAL_STAGE_LABELS[stage]
      : 'مدارس التعليم الفنى';
  const systemLabel =
    systemType === 'homeschool'
      ? ' - منازل'
      : systemType === 'services'
      ? ' - خدمات'
      : systemType === 'regular'
      ? ' - منتظمين'
      : '';
  const subtitle = `${stageLabel}${systemLabel}`;

  return (
    <div
      className="w-full max-w-4xl mx-auto relative p-[8px] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-white/40 via-slate-800/40 to-white/25"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="rounded-2xl p-8 md:p-12 border-[1.5px] border-slate-900 relative z-10 overflow-hidden w-full h-full">
        <div className="absolute inset-0 z-[-1] bg-gradient-to-r from-[#14b8a6] via-[#d4a373] to-[#c2410c]" />

        <div className="flex flex-col items-center justify-center mb-10">
          <div className="relative inline-block pb-4">
            <h2 className="text-3xl font-extrabold text-[#2d3748] px-4 flex items-center justify-center gap-3">
              <Layers className="w-8 h-8 text-[#14b8a6]" />
              {t.gradesScreenTitle}
            </h2>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#14b8a6] to-transparent overflow-hidden rounded-full" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-lg font-bold text-slate-800 text-center"
          >
            {subtitle}
          </motion.div>
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
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#14b8a6] via-[#d4a373] to-[#c2410c] hover:from-[#0f766e] hover:via-[#bc8c5d] hover:to-[#9a3412] text-white font-bold py-4 px-2 rounded-lg transition-all active:scale-[0.98] border-[1.5px] border-slate-900 shadow-lg text-sm md:text-base cursor-pointer"
              >
                {lang === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                {t.back}
              </button>
              <button
                type="button"
                onClick={() => handleAction(onEditData)}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#14b8a6] via-[#d4a373] to-[#c2410c] hover:from-[#0f766e] hover:via-[#bc8c5d] hover:to-[#9a3412] text-white font-bold py-4 px-2 rounded-lg transition-all active:scale-[0.98] border-[1.5px] border-slate-900 shadow-lg text-sm md:text-base cursor-pointer"
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
                        : 'bg-gradient-to-r from-[#14b8a6] via-[#d4a373] to-[#c2410c] hover:from-[#0f766e] hover:via-[#bc8c5d] hover:to-[#9a3412] text-white font-bold border-slate-900 cursor-pointer'
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
            {...FAST_BACKDROP_FADE}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/70 backdrop-blur-sm rounded-[10px]"
          >
            <motion.div
              {...FAST_MODAL_FLIP}
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
    </div>
  );
};
