import React from 'react';
import { Check } from 'lucide-react';
import { COLOR_THEMES, ColorThemeKey } from '../utils/themeConfig';
import { Language } from '../types';

interface ColorThemeBarProps {
  activeTheme: ColorThemeKey;
  onThemeChange: (theme: ColorThemeKey) => void;
  lang?: Language;
}

export const ColorThemeBar: React.FC<ColorThemeBarProps> = ({
  activeTheme,
  onThemeChange,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';

  return (
    <div
      dir="ltr"
      className="flex items-center gap-2 p-1.5 px-3 rounded-full bg-slate-900/75 backdrop-blur-md border border-white/20 shadow-2xl transition-all hover:scale-[1.02]"
    >
      {(Object.keys(COLOR_THEMES) as ColorThemeKey[]).map((key) => {
        const th = COLOR_THEMES[key];
        const isSelected = activeTheme === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onThemeChange(key)}
            title={isAr ? th.nameAr : th.nameEn}
            className={`relative w-6 h-6 rounded-full bg-gradient-to-r ${th.previewBg} transition-transform hover:scale-110 cursor-pointer flex items-center justify-center ${
              isSelected ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
          </button>
        );
      })}
    </div>
  );
};
