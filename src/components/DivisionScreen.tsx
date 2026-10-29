import React, { useState } from 'react';
import { translations } from '../i18n';
import { Language } from '../types';
import { ArrowLeft, ArrowRight, Layers, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'motion/react';

interface DivisionScreenProps {
  lang: Language;
  onBack: () => void;
  onSave: (division: string) => void;
  initialDivision?: string;
  subtitle?: string;
}

export const DivisionScreen: React.FC<DivisionScreenProps> = ({
  lang,
  onBack,
  onSave,
  initialDivision = 'literary',
  subtitle,
}) => {
  const t = translations[lang];
  const [selected, setSelected] = useState(initialDivision || 'literary');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(selected);
  };

  const divisions = [
    { id: 'literary', label: (t as any).literaryDivision || 'الشعبة الأدبية' },
    { id: 'scientific', label: (t as any).scientificDivision || 'الشعبة العلمية' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      className="w-full max-w-4xl mx-auto relative p-[8px] rounded-3xl overflow-hidden shadow-2xl"
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
          className="absolute inset-0 z-[-1] bg-gradient-to-r from-slate-300 via-rose-600 to-[#d4a373] bg-[length:400%_400%]"
        />

        {/* Title */}
        <div className="flex flex-col items-center justify-center mb-12">
          <motion.div
            animate={{ x: [-8, 8, -8] }}
            transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
            className="relative inline-block pb-8"
          >
            <h2 className="text-3xl font-extrabold text-[#2d3748] px-4 flex items-center justify-center gap-3">
              <Layers className="w-8 h-8 text-rose-600" />
              {(t as any).chooseDivision || 'إختر الشعبة'}
            </h2>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-600 to-transparent overflow-hidden rounded-full">
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                className="w-full h-full bg-white shadow-[0_0_10px_3px_rgba(225,29,72,0.8)]"
              />
            </div>
          </motion.div>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="pt-2">
            <div className="flex flex-col items-center gap-4">
              {divisions.map((div) => {
                const isSelected = selected === div.id;
                return (
                  <button
                    key={div.id}
                    type="button"
                    onClick={() => setSelected(div.id)}
                    className={`w-1/2 flex items-center gap-3 p-4 rounded-lg border-[1.5px] transition-all text-right shadow-sm ${
                      isSelected
                        ? 'bg-rose-500/20 border-white text-white'
                        : 'bg-white border-slate-900 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    )}
                    <span className="font-bold text-lg">{div.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-8 flex flex-col items-center gap-4">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-rose-600 to-transparent relative overflow-hidden rounded-full opacity-50">
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
                className="w-full h-full bg-white shadow-[0_0_10px_3px_rgba(225,29,72,0.8)]"
              />
            </div>

            <div className="w-1/2 flex gap-4">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-slate-400 via-rose-600 to-[#d4a373] hover:from-slate-500 hover:via-rose-700 hover:to-[#bc8c5d] text-white font-bold py-4 px-2 rounded-lg transition-all active:scale-[0.98] border-[1.5px] border-slate-900 shadow-lg text-sm md:text-base"
              >
                {lang === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                {t.back}
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-slate-400 via-rose-600 to-[#d4a373] hover:from-slate-500 hover:via-rose-700 hover:to-[#bc8c5d] text-white font-bold py-4 px-2 rounded-lg transition-all active:scale-[0.98] border-[1.5px] border-slate-900 shadow-lg text-sm md:text-base"
              >
                {t.save}
                {lang === 'ar' ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
