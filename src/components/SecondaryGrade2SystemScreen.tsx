import React, { useState, useEffect } from 'react';
import { translations } from '../i18n';
import { Language } from '../types';
import { ArrowLeft, ArrowRight, GraduationCap, Sparkles, BookOpen, Check, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import { COLOR_THEMES, ColorThemeKey, getSavedColorTheme, saveColorTheme } from '../utils/themeConfig';
import { ColorThemeBar } from './ColorThemeBar';

interface SecondaryGrade2SystemScreenProps {
  lang: Language;
  onBack: () => void;
  onSelect: (system: 'old' | 'modern') => void;
  initialSystem?: 'old' | 'modern';
  theme?: ColorThemeKey;
}

export const SecondaryGrade2SystemScreen: React.FC<SecondaryGrade2SystemScreenProps> = ({
  lang,
  onBack,
  onSelect,
  initialSystem = 'old',
  theme,
}) => {
  const t = translations[lang];
  const [selected, setSelected] = useState<'old' | 'modern'>(initialSystem);
  const [activeTheme, setActiveTheme] = useState<ColorThemeKey>(() => theme || getSavedColorTheme());

  useEffect(() => {
    if (theme) {
      setActiveTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ColorThemeKey>;
      if (customEvent.detail && customEvent.detail in COLOR_THEMES) {
        setActiveTheme(customEvent.detail);
      }
    };
    window.addEventListener('app_color_theme_changed', handleThemeChange);
    return () => window.removeEventListener('app_color_theme_changed', handleThemeChange);
  }, []);

  const handleThemeChange = (newTheme: ColorThemeKey) => {
    setActiveTheme(newTheme);
    saveColorTheme(newTheme);
  };

  const currentTheme = COLOR_THEMES[activeTheme] || COLOR_THEMES.emerald_indigo;
  const isAr = lang === 'ar';

  const handleChoose = (system: 'old' | 'modern') => {
    setSelected(system);
    onSelect(system);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Color Palette Bar */}
      <div className="w-full flex justify-center mb-4">
        <ColorThemeBar
          activeTheme={activeTheme}
          onThemeChange={handleThemeChange}
          lang={lang}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -100, scale: 0.9 }}
        transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
        className="w-full relative p-[8px] rounded-3xl overflow-hidden shadow-2xl"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-[conic-gradient(transparent_270deg,#ffffff_360deg)]"
        />

        <div className={`rounded-2xl p-6 sm:p-10 md:p-12 border-[2px] ${currentTheme.borderStroke} relative z-10 overflow-hidden w-full h-full transition-colors duration-500`}>
          {/* Animated Background Gradient */}
          <motion.div
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
            className={`absolute inset-0 z-[-2] ${currentTheme.gradientBg} bg-[length:400%_400%] transition-all duration-700`}
          />

          {/* Refined Glassmorphic Backdrop Overlay */}
          <div className={`absolute inset-0 z-[-1] ${currentTheme.backdropOverlay} pointer-events-none transition-all duration-500`} />

          {/* Header Title */}
          <div className="flex flex-col items-center justify-center mb-8 sm:mb-10 text-center">
            <motion.div
              animate={{ y: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative inline-block pb-4"
            >
              <h2 className={`text-[21px] sm:text-[26px] md:text-[30px] leading-snug font-black ${currentTheme.titleShadow} px-4 flex items-center justify-center gap-3 transition-colors duration-500`}>
                <GraduationCap className={`w-[26px] h-[26px] sm:w-[30px] sm:h-[30px] md:w-[34px] md:h-[34px] ${currentTheme.titleIconColor} transition-colors duration-500`} />
                {isAr ? 'الصف الثاني الثانوي : نظام الدراسة' : 'Second Secondary Grade: Study System'}
              </h2>
              <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${currentTheme.titleUnderline} overflow-hidden rounded-full transition-all duration-500`}>
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
                  className={`w-full h-full ${currentTheme.runnerGlow}`}
                />
              </div>
            </motion.div>
            <p className="text-slate-800 font-bold text-sm sm:text-base mt-2 drop-shadow-sm">
              {isAr ? 'يرجى اختيار نظام الدراسة للمتابعة إلى الشعب أو المسارات المعتمدة' : 'Please select the study system to proceed'}
            </p>
          </div>

          {/* Two Options: الثانوية العامة - النظام القديم vs البكالوريا - النظام الحديث */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8 max-w-2xl mx-auto">
            {/* 1. الثانوية العامة - النظام القديم */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChoose('old')}
              className={`group relative p-6 sm:p-8 rounded-2xl transition-all text-center flex flex-col items-center justify-center gap-4 cursor-pointer shadow-xl ${
                selected === 'old'
                  ? 'bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 text-white ring-4 ring-amber-300/90 shadow-orange-500/50 border-2 border-white/60'
                  : 'bg-white/95 text-slate-900 border-2 border-amber-600/30 hover:border-amber-500 hover:bg-white hover:shadow-amber-500/30'
              }`}
            >
              {selected === 'old' && (
                <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 w-7 h-7 rounded-full bg-white text-orange-600 flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}

              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-lg border border-black transition-all duration-300 group-hover:scale-110 ${
                selected === 'old'
                  ? 'bg-white/20 text-white shadow-inner backdrop-blur-sm'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                <BookOpen className="w-9 h-9 sm:w-11 sm:h-11" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-black tracking-tight mb-2.5 whitespace-nowrap">
                  {isAr ? 'الثانوية العامة - النظام القديم' : 'General Secondary - Old System'}
                </h3>
                <div className="text-xs sm:text-sm font-bold">
                  {isAr ? 'الشعبة العلمية • الشعبة الأدبية' : 'Scientific & Literary Divisions'}
                </div>
              </div>
            </motion.button>

            {/* 2. البكالوريا - النظام الحديث */}
            <motion.button
              type="button"
              disabled
              className={`group relative p-6 sm:p-8 rounded-2xl transition-all text-center flex flex-col items-center justify-center gap-4 shadow-xl opacity-50 cursor-not-allowed ${
                selected === 'modern'
                  ? 'bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-700 text-white ring-4 ring-cyan-300/90 shadow-cyan-500/50 border-2 border-white/60'
                  : 'bg-white/95 text-slate-900 border-2 border-indigo-600/30'
              }`}
            >
              {selected === 'modern' && (
                <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 w-7 h-7 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}

              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-lg border border-black transition-all duration-300 group-hover:scale-110 ${
                selected === 'modern'
                  ? 'bg-white/20 text-white shadow-inner backdrop-blur-sm'
                  : 'bg-indigo-100 text-indigo-800'
              }`}>
                <GraduationCap className="w-9 h-9 sm:w-11 sm:h-11" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-black tracking-tight mb-2.5 whitespace-nowrap">
                  {isAr ? 'البكالوريا - النظام الحديث' : 'Baccalaureate - Modern System'}
                </h3>
                <div className="text-xs sm:text-sm font-bold">
                  {isAr ? 'أربعة مسارات تخصصية حديثة' : 'Four Specialized Modern Tracks'}
                </div>
              </div>
            </motion.button>
          </div>

          {/* Divider line */}
          <div className="relative w-full max-w-md mx-auto my-6 flex items-center justify-center">
            <div className={`relative w-full h-1 bg-gradient-to-r ${currentTheme.titleUnderline} overflow-hidden rounded-full transition-all duration-500`}>
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
                className={`w-full h-full ${currentTheme.runnerGlow}`}
              />
            </div>
          </div>

          {/* Back Button */}
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={onBack}
              className={`px-8 py-3.5 rounded-xl font-black text-sm sm:text-base flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg ${currentTheme.backBtnStyle}`}
            >
              {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{t.back}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
