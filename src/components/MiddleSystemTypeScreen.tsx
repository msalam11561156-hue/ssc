import React, { useState, useEffect } from 'react';
import { translations } from '../i18n';
import { Language } from '../types';
import { ArrowLeft, ArrowRight, School, Home, Users, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { COLOR_THEMES, ColorThemeKey, getSavedColorTheme } from '../utils/themeConfig';

interface MiddleSystemTypeScreenProps {
  lang: Language;
  onBack: () => void;
  onSelect: (systemType: 'regular' | 'homeschool') => void;
  initialType?: 'regular' | 'homeschool';
  theme?: ColorThemeKey;
}

export const MiddleSystemTypeScreen: React.FC<MiddleSystemTypeScreenProps> = ({
  lang,
  onBack,
  onSelect,
  initialType = 'regular',
  theme,
}) => {
  const t = translations[lang];
  const [selected, setSelected] = useState<'regular' | 'homeschool'>(initialType);
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

  const currentTheme = COLOR_THEMES[theme || activeTheme] || COLOR_THEMES.emerald_indigo;

  const handleChoose = (type: 'regular' | 'homeschool') => {
    setSelected(type);
    onSelect(type);
  };

  const isAr = lang === 'ar';

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center" dir={isAr ? 'rtl' : 'ltr'}>
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

          {/* Title - تم تكبير حجم الخط بنسبة 30% */}
          <div className="flex flex-col items-center justify-center mb-8 sm:mb-10 text-center">
            <motion.div
              animate={{ y: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative inline-block pb-4"
            >
              <h2 className={`text-[21px] sm:text-[26px] md:text-[30px] leading-snug font-black ${currentTheme.titleShadow} px-4 flex items-center justify-center gap-3 transition-colors duration-500`}>
                <School className={`w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] md:w-[32px] md:h-[32px] ${currentTheme.titleIconColor} transition-colors duration-500`} />
                {isAr ? 'المرحلة الإعدادية : نظام القيد' : 'Preparatory Stage: Enrollment System'}
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

          {/* Two Options: منتظمين vs منازل */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8 max-w-2xl mx-auto">
            {/* منتظمين */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChoose('regular')}
              className={`group relative py-8 sm:py-9 px-6 sm:px-8 rounded-2xl transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer ${
                selected === 'regular' ? currentTheme.regularActive : currentTheme.regularInactive
              }`}
            >
              {/* Selection Check Badge */}
              {selected === 'regular' && (
                <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 w-7 h-7 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}

              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 ${
                selected === 'regular' ? currentTheme.regularIconActive : currentTheme.regularIconInactive
              }`}>
                <Users className="w-9 h-9 sm:w-11 sm:h-11" />
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {isAr ? 'منتظمين' : 'Regular Students'}
                </h3>
              </div>
            </motion.button>

            {/* منازل */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleChoose('homeschool')}
              className={`group relative py-8 sm:py-9 px-6 sm:px-8 rounded-2xl transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer ${
                selected === 'homeschool' ? currentTheme.homeschoolActive : currentTheme.homeschoolInactive
              }`}
            >
              {/* Selection Check Badge */}
              {selected === 'homeschool' && (
                <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 w-7 h-7 rounded-full bg-white text-orange-600 flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}

              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 ${
                selected === 'homeschool' ? currentTheme.homeschoolIconActive : currentTheme.homeschoolIconInactive
              }`}>
                <Home className="w-9 h-9 sm:w-11 sm:h-11" />
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {isAr ? 'منازل' : 'Homeschool Students'}
                </h3>
              </div>
            </motion.button>
          </div>

          {/* خط فاصل فوق زر السابق يشبه الخط الموجود تحت نص العنوان */}
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

