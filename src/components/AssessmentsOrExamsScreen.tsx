import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, ClipboardList, PenTool, Layers, Info, X } from 'lucide-react';
import { translations } from '../i18n';
import { Language } from '../types';

interface AssessmentsOrExamsScreenProps {
  lang: Language;
  onBack: () => void;
  onSelectAssessments: () => void;
  onSelectExams: () => void;
  disableExams?: boolean;
  stage?: string;
  isKindergarten?: boolean;
  onSelectDetailedAssessments?: () => void;
  isOfficial?: boolean;
  hasStudents?: boolean;
}

export const AssessmentsOrExamsScreen: React.FC<AssessmentsOrExamsScreenProps> = ({
  lang,
  onBack,
  onSelectAssessments,
  onSelectExams,
  disableExams,
  stage,
  isKindergarten,
  onSelectDetailedAssessments,
  isOfficial = false,
  hasStudents = true,
}) => {
  const [viewMode, setViewMode] = useState<'main' | 'assessments_sub'>('main');
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const t = translations[lang];

  const isKg = isKindergarten || stage === 'kindergarten';
  const isPrimary = stage === 'primary';
  const isMiddle = stage === 'middle' || stage === 'prep';
  const isSecondary = stage === 'secondary';

  const isNoStudents = Boolean(isOfficial && !hasStudents);

  const handleAssessmentsClick = () => {
    if (isNoStudents) return;
    if (isKg) {
      onSelectAssessments();
    } else {
      setViewMode('assessments_sub');
    }
  };

  const handleDetailedClick = () => {
    if (isNoStudents) return;
    if ((isPrimary || isMiddle || isSecondary) && onSelectDetailedAssessments) {
      onSelectDetailedAssessments();
    } else {
      setShowDetailedModal(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -100, scale: 0.9 }}
        transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
        className="w-full max-w-2xl mx-auto relative p-[8px] rounded-3xl overflow-hidden shadow-2xl"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
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
            className="absolute inset-0 z-[-1] bg-gradient-to-r from-slate-400 via-rose-600 to-[#d4a373] bg-[length:400%_400%]"
          />

          <AnimatePresence mode="wait">
            {viewMode === 'main' ? (
              <motion.div
                key="main-view"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full flex flex-col items-center"
              >
                <div className="flex flex-col gap-6 w-full max-w-sm mx-auto mt-8">
                  {/* زر التقييمات - ينقل إلى نافذة الاختيار (إجمالاً / تفصيلاً) أو مباشرة لرياض الأطفال */}
                  <button
                    type="button"
                    disabled={isNoStudents}
                    onClick={handleAssessmentsClick}
                    className={`w-full flex items-center justify-center gap-3 ${
                      isNoStudents 
                        ? 'bg-slate-300 border-slate-400 text-slate-500 cursor-not-allowed opacity-60 shadow-none' 
                        : 'bg-gradient-to-r from-[#14b8a6] via-[#0d9488] to-[#0f766e] hover:from-[#0d9488] hover:to-[#115e59] text-white active:scale-[0.98] shadow-lg'
                    } font-bold py-6 px-4 rounded-xl transition-all border-[1.5px] border-slate-900 text-lg md:text-xl`}
                  >
                    <ClipboardList className="w-6 h-6" />
                    <span className="inline-block transform -translate-y-0.5">{(t as any).assessments || 'التقييمات'}</span>
                  </button>
                  
                  {/* زر الامتحانات التحريرية */}
                  <button
                    type="button"
                    disabled={disableExams || isNoStudents}
                    onClick={onSelectExams}
                    className={`w-full flex items-center justify-center gap-3 ${
                      disableExams || isNoStudents 
                        ? 'bg-slate-300 border-slate-400 text-slate-500 cursor-not-allowed opacity-60 shadow-none' 
                        : 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white active:scale-[0.98] shadow-lg'
                    } font-bold py-6 px-4 rounded-xl transition-all border-[1.5px] border-slate-900 text-lg md:text-xl`}
                  >
                    <PenTool className="w-9 h-9" />
                    <span className="inline-block transform -translate-y-0.5">{(t as any).writtenExams}</span>
                  </button>
                </div>

                <div className="pt-10 flex flex-col items-center gap-4 w-full">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#2d3748] to-transparent relative overflow-hidden rounded-full opacity-50">
                    <motion.div
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                      className="w-full h-full bg-white shadow-[0_0_10px_3px_rgba(45,55,72,0.8)]"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={onBack}
                    className="w-1/2 flex items-center justify-center gap-2 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white font-bold py-4 px-8 rounded-lg transition-all active:scale-[0.98] border-[1.5px] border-white shadow-lg"
                  >
                    {lang === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                    {t.back}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="assessments-sub-view"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full flex flex-col items-center"
              >
                <div className="flex flex-col gap-6 w-full max-w-sm mx-auto mt-8">
                  {/* زر التقييمات - إجمالا */}
                  <button
                    type="button"
                    disabled={isNoStudents}
                    onClick={onSelectAssessments}
                    className={`w-full flex items-center justify-center gap-3 ${
                      isNoStudents 
                        ? 'bg-slate-300 border-slate-400 text-slate-500 cursor-not-allowed opacity-60 shadow-none' 
                        : 'bg-gradient-to-r from-[#14b8a6] via-[#0d9488] to-[#0f766e] hover:from-[#0d9488] hover:to-[#115e59] text-white active:scale-[0.98] shadow-lg'
                    } font-bold py-6 px-4 rounded-xl transition-all border-[1.5px] border-slate-900 text-lg md:text-xl`}
                  >
                    <ClipboardList className="w-6 h-6" />
                    <span className="inline-block transform -translate-y-0.5">التقييمات - إجمالا</span>
                  </button>
                  
                  {/* زر التقييمات - تفصيلا */}
                  <button
                    type="button"
                    disabled={isNoStudents}
                    onClick={handleDetailedClick}
                    className={`w-full flex items-center justify-center gap-3 ${
                      isNoStudents 
                        ? 'bg-slate-300 border-slate-400 text-slate-500 cursor-not-allowed opacity-60 shadow-none' 
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-700 hover:from-blue-700 hover:to-indigo-800 text-white active:scale-[0.98] shadow-lg'
                    } font-bold py-6 px-4 rounded-xl transition-all border-[1.5px] border-slate-900 text-lg md:text-xl`}
                  >
                    <Layers className="w-6 h-6" />
                    <span className="inline-block transform -translate-y-0.5">التقييمات - تفصيلا</span>
                  </button>
                </div>

                <div className="pt-10 flex flex-col items-center gap-4 w-full">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#2d3748] to-transparent relative overflow-hidden rounded-full opacity-50">
                    <motion.div
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                      className="w-full h-full bg-white shadow-[0_0_10px_3px_rgba(45,55,72,0.8)]"
                    />
                  </div>
                  
                  {/* زر السابق - يعود إلى النافذة السابقة */}
                  <button
                    type="button"
                    onClick={() => setViewMode('main')}
                    className="w-1/2 flex items-center justify-center gap-2 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white font-bold py-4 px-8 rounded-lg transition-all active:scale-[0.98] border-[1.5px] border-white shadow-lg"
                  >
                    {lang === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                    {t.back}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Modal نافذة إشعار شاشة التقييمات تفصيلاً */}
      <AnimatePresence>
        {showDetailedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full border-2 border-slate-900 shadow-2xl relative text-center"
              dir="rtl"
            >
              <button
                type="button"
                onClick={() => setShowDetailedModal(false)}
                className="absolute top-4 left-4 text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-16 h-16 bg-blue-100 border-2 border-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-md">
                <Layers className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-3">
                التقييمات - تفصيلاً
              </h3>

              <p className="text-slate-700 text-base leading-relaxed mb-6 font-medium">
                سنوافيكم بتفاصيل وإعدادات شاشة التقييمات تفصيلاً فور اعتماد وتحديد بياناتها.
              </p>

              <button
                type="button"
                onClick={() => setShowDetailedModal(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl border border-slate-900 shadow-md transition-all active:scale-95"
              >
                حسناً
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
