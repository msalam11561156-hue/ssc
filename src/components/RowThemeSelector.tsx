import React, { useState, useEffect } from 'react';
import { RowBgTheme } from '../utils/exportPdf';

export interface RowThemeSelectorProps {
  onThemeChange?: (theme: RowBgTheme) => void;
  title?: string;
  storageKey?: string;
  defaultTheme?: RowBgTheme;
}

export function getTableRowColorStyle(
  theme: RowBgTheme = 'attachment_1',
  isOdd: boolean
): { bgClass: string; isDark: boolean } {
  if (!isOdd) {
    return { bgClass: 'bg-white text-slate-800', isDark: false };
  }
  switch (theme) {
    case 'theme_red':
      return {
        bgClass:
          'row-theme-red !bg-[#dc2626] !text-white [&_*]:!text-white [&_td]:!text-white [&_span]:!text-white [&_div]:!text-white [&_input]:!text-white [&_select]:!text-white [&_option]:text-slate-900 [&_option]:bg-white hover:!bg-red-700 focus-within:!bg-red-700',
        isDark: true,
      };
    case 'theme_black':
      return {
        bgClass:
          'row-theme-black !bg-black !text-white [&_*]:!text-white [&_td]:!text-white [&_span]:!text-white [&_div]:!text-white [&_input]:!text-white [&_select]:!text-white [&_option]:text-slate-900 [&_option]:bg-white hover:!bg-slate-900 focus-within:!bg-slate-900',
        isDark: true,
      };
    case 'theme_white':
      return { bgClass: 'bg-white text-slate-800', isDark: false };
    case 'theme_pink':
      return { bgClass: 'bg-[#FCE7F3] text-slate-800', isDark: false };
    case 'attachment_2':
      return { bgClass: 'bg-[#E2EFDA] text-slate-800', isDark: false };
    case 'attachment_1':
      return { bgClass: 'bg-[#FEFAE9] text-slate-800', isDark: false };
    case 'theme_peach':
      return { bgClass: 'bg-[#FCE4D6] text-slate-800', isDark: false };
    case 'attachment_3':
      return { bgClass: 'bg-[#D9E1F2] text-slate-800', isDark: false };
    case 'attachment_4':
      return { bgClass: 'bg-[#F2F2F2] text-slate-800', isDark: false };
    case 'theme_yellow':
      return { bgClass: 'bg-[#FFE699] text-slate-800', isDark: false };
    default:
      return { bgClass: 'bg-[#FEFAE9] text-slate-800', isDark: false };
  }
}

export const RowThemeSelector: React.FC<RowThemeSelectorProps> = ({
  onThemeChange,
  title = 'اختر لون خلفية الصفوف المتبادل مع اللون الأبيض فى جداول التقارير المطبوعة',
  storageKey = 'pdf_print_row_theme',
  defaultTheme = 'attachment_1',
}) => {
  const isPrintMenu = storageKey === 'pdf_print_row_theme' || title.includes('المطبوعة');
  const [currentTheme, setCurrentTheme] = useState<RowBgTheme>(defaultTheme);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (
      saved &&
      [
        'theme_red',
        'theme_black',
        'theme_white',
        'attachment_1',
        'attachment_2',
        'attachment_3',
        'attachment_4',
        'theme_pink',
        'theme_peach',
        'theme_yellow',
      ].includes(saved)
    ) {
      if (isPrintMenu && saved === 'theme_black') {
        setCurrentTheme('theme_red');
        localStorage.setItem(storageKey, 'theme_red');
      } else {
        setCurrentTheme(saved as RowBgTheme);
      }
    } else if (saved === 'auto') {
      const fallbackTheme = isPrintMenu ? 'theme_red' : 'theme_black';
      setCurrentTheme(fallbackTheme);
      localStorage.setItem(storageKey, fallbackTheme);
    }
  }, [storageKey, isPrintMenu]);

  const handleSelect = (theme: RowBgTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem(storageKey, theme);
    if (onThemeChange) {
      onThemeChange(theme);
    }
    window.dispatchEvent(
      new CustomEvent('row_theme_updated', { detail: { storageKey, theme } })
    );
  };

  // Swatches arranged from left to right with completely equal spacing and dimensions:
  // 1. Red (#dc2626) in print menus (or black in non-print contexts)
  // 2. White (#ffffff)
  // 3. Pink (#FCE7F3)
  // 4. Light Green (#E2EFDA)
  // 5. Cream (#FEFAE9)
  // 6. Peach (#FCE4D6)
  // 7. Sky Blue (#D9E1F2)
  // 8. Light Gray (#F2F2F2)
  // 9. Light Yellow (#FFE699)
  const swatches: {
    id: RowBgTheme;
    color: string;
    title: string;
  }[] = [
    isPrintMenu
      ? {
          id: 'theme_red',
          color: '#dc2626',
          title: 'أحمر',
        }
      : {
          id: 'theme_black',
          color: '#000000',
          title: 'أسود',
        },
    {
      id: 'theme_white',
      color: '#ffffff',
      title: 'أبيض (جميع الصفوف بيضاء)',
    },
    {
      id: 'theme_pink',
      color: '#FCE7F3',
      title: 'وردي فاتح',
    },
    {
      id: 'attachment_2',
      color: '#E2EFDA',
      title: 'أخضر هادئ',
    },
    {
      id: 'attachment_1',
      color: '#FEFAE9',
      title: 'بيج دافئ / كريمي',
    },
    {
      id: 'theme_peach',
      color: '#FCE4D6',
      title: 'خوخي هادئ',
    },
    {
      id: 'attachment_3',
      color: '#D9E1F2',
      title: 'أزرق سماوي',
    },
    {
      id: 'attachment_4',
      color: '#F2F2F2',
      title: 'رمادي هادئ',
    },
    {
      id: 'theme_yellow',
      color: '#FFE699',
      title: 'أصفر ذهبي هادئ',
    },
  ];

  return (
    <div className="relative p-[2px] rounded-2xl overflow-hidden shadow-md mb-2 shrink-0 w-full">
      {/* إطار أسود متحرك حول نافذة اختيار اللون */}
      <div className="absolute inset-[-150%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />

      <div className="relative bg-white rounded-[14px] p-3 flex flex-col items-center gap-2.5 w-full">
        <div className="w-full text-center overflow-hidden flex flex-col items-center justify-center">
          <span className="text-[8.75px] sm:text-[9.9px] font-black text-black select-none tracking-tight whitespace-nowrap block text-center pb-2">
            {title}
          </span>
          <hr className="w-full border-t border-slate-300" />
        </div>

        {/* شريط المربعات الملونة بمسافات وأبعاد متساوية تماماً وبدون شريط تمرير */}
        <div className="flex items-center justify-center gap-2 sm:gap-2.5 w-full pt-1 pb-1 overflow-hidden" dir="ltr">
          {swatches.map((s) => {
            const isSelected = currentTheme === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s.id)}
                title={s.title}
                style={{ backgroundColor: s.color }}
                className={`w-7 h-7 sm:w-8 sm:h-8 aspect-square rounded-[3px] border cursor-pointer transition-all shrink-0 ${
                  s.id === 'theme_black'
                    ? 'border-black'
                    : s.id === 'theme_red'
                    ? 'border-red-800'
                    : s.id === 'theme_white'
                    ? 'border-slate-400 shadow-xs'
                    : 'border-black/30'
                } ${
                  isSelected
                    ? 'ring-2 ring-black ring-offset-2 scale-110 shadow-md border-black'
                    : 'hover:scale-105 hover:border-black/60 active:scale-95'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
