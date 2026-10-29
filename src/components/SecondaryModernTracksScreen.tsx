import React, { useState, useEffect } from 'react';
import { translations } from '../i18n';
import { Language } from '../types';
import { ArrowLeft, ArrowRight, GraduationCap, Check, HeartPulse, Laptop, TrendingUp, Palette } from 'lucide-react';
import { motion } from 'motion/react';
import { COLOR_THEMES, ColorThemeKey, getSavedColorTheme, saveColorTheme } from '../utils/themeConfig';
import { ColorThemeBar } from './ColorThemeBar';

export interface ModernTrackOption {
  id: string;
  title: string;
  titleEn: string;
  icon: React.ElementType;
  gradientActive: string;
  gradientBorder: string;
  iconBg: string;
  badge: string;
  subjectsSummary: string;
}

export const MODERN_TRACKS: ModernTrackOption[] = [
  {
    id: 'modern_medical',
    title: 'مسار الطب وعلوم الحياة',
    titleEn: 'Medicine & Life Sciences Track',
    icon: HeartPulse,
    gradientActive: 'from-emerald-600 via-teal-600 to-cyan-700 text-white ring-4 ring-emerald-300/90 shadow-emerald-500/50',
    gradientBorder: 'border-emerald-500/40 hover:border-emerald-500',
    iconBg: 'bg-emerald-100 text-emerald-800',
    badge: 'الأحياء • الكيمياء • الفيزياء',
    subjectsSummary: 'الأحياء والعلوم الحياتية • الكيمياء • الفيزياء • المواد العامة',
  },
  {
    id: 'modern_engineering',
    title: 'مسار الهندسة وعلوم الحاسب',
    titleEn: 'Engineering & Computer Science Track',
    icon: Laptop,
    gradientActive: 'from-blue-600 via-indigo-600 to-cyan-700 text-white ring-4 ring-blue-300/90 shadow-blue-500/50',
    gradientBorder: 'border-blue-500/40 hover:border-blue-500',
    iconBg: 'bg-blue-100 text-blue-800',
    badge: 'الرياضيات • الفيزياء • البرمجة والذكاء الاصطناعي',
    subjectsSummary: 'الرياضيات • الفيزياء • البرمجة والذكاء الاصطناعي • المواد العامة',
  },
  {
    id: 'modern_business',
    title: 'مسار الأعمال',
    titleEn: 'Business Track',
    icon: TrendingUp,
    gradientActive: 'from-amber-600 via-orange-600 to-yellow-600 text-white ring-4 ring-amber-300/90 shadow-amber-500/50',
    gradientBorder: 'border-amber-500/40 hover:border-amber-500',
    iconBg: 'bg-amber-100 text-amber-800',
    badge: 'المحاسبة • إدارة الأعمال والاقتصاد',
    subjectsSummary: 'المحاسبة والعلوم المالية • إدارة الأعمال والاقتصاد • الرياضيات • المواد العامة',
  },
  {
    id: 'modern_arts',
    title: 'مسار الآداب والفنون',
    titleEn: 'Arts & Humanities Track',
    icon: Palette,
    gradientActive: 'from-purple-600 via-fuchsia-600 to-pink-700 text-white ring-4 ring-purple-300/90 shadow-purple-500/50',
    gradientBorder: 'border-purple-500/40 hover:border-purple-500',
    iconBg: 'bg-purple-100 text-purple-800',
    badge: 'الجغرافيا • علم النفس • الفنون والتصميم',
    subjectsSummary: 'الجغرافيا • علم النفس والاجتماع • الفنون والتصميم • المواد العامة',
  },
];

interface SecondaryModernTracksScreenProps {
  lang: Language;
  onBack: () => void;
  onSelect: (trackId: string) => void;
  initialTrack?: string;
  subtitle?: string;
  theme?: ColorThemeKey;
}

export const SecondaryModernTracksScreen: React.FC<SecondaryModernTracksScreenProps> = ({
  lang,
  onBack,
  onSelect,
  initialTrack = 'modern_medical',
  subtitle,
  theme,
}) => {
  const t = translations[lang];
  const [selected, setSelected] = useState<string>(initialTrack || 'modern_medical');
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
  const isLightGold = activeTheme === 'light_gold';
  const isAr = lang === 'ar';

  const handleChoose = (trackId: string) => {
    setSelected(trackId);
    onSelect(trackId);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center" dir={isAr ? 'rtl' : 'ltr'}>
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

        <div className={`rounded-2xl p-6 sm:p-8 md:p-10 border-[2px] ${currentTheme.borderStroke} relative z-10 overflow-hidden w-full h-full transition-colors duration-500`}>
          {/* Animated Background Gradient */}
          <motion.div
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
            className={`absolute inset-0 z-[-2] ${currentTheme.gradientBg} bg-[length:400%_400%] transition-all duration-700`}
          />

          {/* Refined Glassmorphic Backdrop Overlay */}
          <div className={`absolute inset-0 z-[-1] ${currentTheme.backdropOverlay} pointer-events-none transition-all duration-500`} />

          {/* Header Title */}
          <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 text-center">
            <motion.div
              animate={{ y: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative inline-block pb-3"
            >
              <h2 className={`text-[21px] sm:text-[26px] md:text-[30px] leading-snug font-black ${currentTheme.titleShadow} ${currentTheme.headerTextColor || 'text-slate-900'} px-4 flex items-center justify-center gap-3 transition-colors duration-500`}>
                <GraduationCap className={`w-[26px] h-[26px] sm:w-[30px] sm:h-[30px] md:w-[34px] md:h-[34px] ${currentTheme.titleIconColor} transition-colors duration-500`} />
                {isAr ? 'البكالوريا - النظام الحديث : المسارات التعليمية' : 'Baccalaureate - Modern System: Study Tracks'}
              </h2>
              <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${currentTheme.titleUnderline} overflow-hidden rounded-full transition-all duration-500`}>
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
                  className={`w-full h-full ${currentTheme.runnerGlow}`}
                />
              </div>
            </motion.div>
            <p className="text-slate-800 font-bold text-xs sm:text-sm md:text-base mt-1 drop-shadow-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-2">
              {subtitle || (isAr ? 'الصف الثاني الثانوي : اختر المسار التخصصي المطلوب' : 'Select the required specialized track')}
            </p>
          </div>

          {/* 4 Tracks Cards in 2x2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {MODERN_TRACKS.map((track) => {
              const isSelected = selected === track.id;
              const Icon = track.icon;

              return (
                <motion.button
                  key={track.id}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleChoose(track.id)}
                  className={`group relative p-5 sm:p-6 rounded-2xl transition-all text-right flex items-center gap-4 cursor-pointer shadow-lg border-2 ${
                    isSelected
                      ? (isLightGold
                          ? 'bg-white text-black ring-4 ring-amber-300/80 shadow-amber-500/30 border-2 border-amber-600'
                          : `${track.gradientActive} border-white/60`)
                      : `bg-white/95 text-slate-900 ${track.gradientBorder} hover:bg-white hover:shadow-xl`
                  }`}
                >
                  {isSelected && (
                    <div className={`absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center shadow-md ${
                      isLightGold ? 'bg-amber-600 text-white' : 'bg-white text-emerald-600'
                    }`}>
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}

                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-md border border-black transition-all duration-300 group-hover:scale-110 shrink-0 ${
                    isSelected
                      ? (isLightGold ? 'bg-amber-100 text-amber-800 shadow-inner' : 'bg-white/20 text-white shadow-inner backdrop-blur-sm')
                      : track.iconBg
                  }`}>
                    <Icon className="w-8 h-8 sm:w-9 sm:h-9" />
                  </div>

                  <div className="flex-1 min-w-0 pr-1">
                    <h3 className={`text-lg sm:text-xl font-black tracking-tight mb-1.5 leading-snug ${
                      isSelected && !isLightGold ? 'text-white' : 'text-black'
                    }`}>
                      {isAr ? track.title : track.titleEn}
                    </h3>

                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Divider line */}
          <div className="relative w-full max-w-md mx-auto my-5 flex items-center justify-center">
            <div className={`relative w-full h-1 bg-gradient-to-r ${currentTheme.titleUnderline} overflow-hidden rounded-full transition-all duration-500`}>
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
                className={`w-full h-full ${currentTheme.runnerGlow}`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 pt-1 max-w-md mx-auto">
            <button
              type="button"
              onClick={onBack}
              className={`flex-1 py-3 px-6 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg ${currentTheme.backBtnStyle}`}
            >
              {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{t.back}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelect(selected)}
              className="flex-1 py-3 px-6 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-700 hover:to-cyan-800 text-white border-2 border-white/40"
            >
              <span>{t.save || 'متابعة'}</span>
              {isAr ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
