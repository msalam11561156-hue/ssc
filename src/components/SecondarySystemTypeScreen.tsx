import React, { useState, useEffect } from 'react';
import { translations } from '../i18n';
import { Language } from '../types';
import { ArrowLeft, ArrowRight, GraduationCap, Home, Users, Building2, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { COLOR_THEMES, ColorThemeKey, getSavedColorTheme, saveColorTheme } from '../utils/themeConfig';
import { ColorThemeBar } from './ColorThemeBar';

interface SecondarySystemTypeScreenProps {
  lang: Language;
  onBack: () => void;
  onSelect: (systemType: 'regular' | 'homeschool' | 'services') => void;
  initialType?: 'regular' | 'homeschool' | 'services';
  theme?: ColorThemeKey;
}

export const SecondarySystemTypeScreen: React.FC<SecondarySystemTypeScreenProps> = ({
  lang,
  onBack,
  onSelect,
  initialType = 'regular',
  theme,
}) => {
  const t = translations[lang];
  const [selected, setSelected] = useState<'regular' | 'homeschool' | 'services'>(initialType);
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

  const handleChoose = (type: 'regular' | 'homeschool' | 'services') => {
    setSelected(type);
    onSelect(type);
  };

  const isAr = lang === 'ar';

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

          {/* Title with exact requested text formatting */}
          <div className="flex flex-col items-center justify-center mb-8 sm:mb-10 text-center">
            <motion.div
              animate={{ y: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative inline-block pb-4"
            >
              <h2 className={`text-[21px] sm:text-[26px] md:text-[30px] leading-snug font-black ${currentTheme.titleShadow} px-4 flex items-center justify-center gap-3 transition-colors duration-500`}>
                <GraduationCap className={`w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] md:w-[32px] md:h-[32px] ${currentTheme.titleIconColor} transition-colors duration-500`} />
                {isAr ? 'الثانوية العامة ( البكالوريا ) : نظام القيد' : 'General Secondary (Baccalaureate): Enrollment System'}
              </h2>
              <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${currentTheme.titleUnderline} overflow-hidden rounded-full transition-all duration-500`}>
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
                  className={`w-full h-full ${currentTheme.runnerGlow}`}
                />
              </div>
            </motion.div>
          </div>

          {/* Three Options: منتظمين vs منازل vs خدمات */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-6 sm:mb-8 max-w-3xl mx-auto">
            {/* منتظمين */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChoose('regular')}
              className={`group relative py-7 sm:py-8 px-5 sm:px-6 rounded-2xl transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer ${
                selected === 'regular' ? currentTheme.regularActive : currentTheme.regularInactive
              }`}
            >
              {selected === 'regular' && (
                <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 w-7 h-7 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}

              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 ${
                selected === 'regular' ? currentTheme.regularIconActive : currentTheme.regularIconInactive
              }`}>
                <Users className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  {isAr ? 'منتظمين' : 'Regular'}
                </h3>
              </div>
            </motion.button>

            {/* منازل */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChoose('homeschool')}
              className={`group relative py-7 sm:py-8 px-5 sm:px-6 rounded-2xl transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer ${
                selected === 'homeschool' ? currentTheme.homeschoolActive : currentTheme.homeschoolInactive
              }`}
            >
              {selected === 'homeschool' && (
                <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 w-7 h-7 rounded-full bg-white text-orange-600 flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}

              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 ${
                selected === 'homeschool' ? currentTheme.homeschoolIconActive : currentTheme.homeschoolIconInactive
              }`}>
                <Home className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  {isAr ? 'منازل' : 'Homeschool'}
                </h3>
              </div>
            </motion.button>

            {/* خدمات */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChoose('services')}
              className={`group relative py-7 sm:py-8 px-5 sm:px-6 rounded-2xl transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer ${
                selected === 'services'
                  ? 'bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-700 text-white shadow-indigo-500/50 ring-4 ring-indigo-300/85 border-transparent'
                  : 'bg-white/95 text-slate-900 border-2 border-indigo-600/30 hover:border-indigo-500 hover:bg-white hover:shadow-indigo-500/20 shadow-md'
              }`}
            >
              {selected === 'services' && (
                <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 w-7 h-7 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}

              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 ${
                selected === 'services' ? 'bg-white/20 text-white shadow-inner' : 'bg-indigo-100 text-indigo-800'
              }`}>
                <Building2 className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  {isAr ? 'خدمات' : 'Services'}
                </h3>
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
              className={`px-8 py-3 rounded-xl font-black text-sm sm:text-base flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${currentTheme.backBtnStyle}`}
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
