export type ColorThemeKey = 'emerald_indigo' | 'sky_navy' | 'purple_rose' | 'light_gold';

export interface ColorTheme {
  id: ColorThemeKey;
  nameAr: string;
  nameEn: string;
  previewBg: string;
  gradientBg: string;
  backdropOverlay: string;
  borderStroke: string;
  titleIconColor: string;
  titleUnderline: string;
  titleShadow: string;
  runnerGlow: string;
  regularActive: string;
  regularInactive: string;
  regularIconActive: string;
  regularIconInactive: string;
  homeschoolActive: string;
  homeschoolInactive: string;
  homeschoolIconActive: string;
  homeschoolIconInactive: string;
  servicesActive?: string;
  servicesInactive?: string;
  servicesIconActive?: string;
  servicesIconInactive?: string;
  backBtnStyle: string;
  textColor: string;
  subtitleColor: string;
}

export const COLOR_THEMES: Record<ColorThemeKey, ColorTheme> = {
  emerald_indigo: {
    id: 'emerald_indigo',
    nameAr: 'زمردي ونيلي فاخر',
    nameEn: 'Emerald & Indigo',
    previewBg: 'from-emerald-500 via-teal-600 to-indigo-700',
    gradientBg: 'bg-gradient-to-r from-emerald-600/40 via-teal-500/30 to-indigo-700/45',
    backdropOverlay: 'bg-slate-950/45 backdrop-blur-md',
    borderStroke: 'border-emerald-500/30',
    titleIconColor: 'text-emerald-300',
    titleUnderline: 'from-transparent via-emerald-400 to-transparent',
    titleShadow: 'text-white drop-shadow-[0_2px_8px_rgba(16,185,129,0.5)]',
    runnerGlow: 'bg-white shadow-[0_0_12px_4px_rgba(52,211,153,0.9)]',
    regularActive: 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-emerald-500/50 ring-4 ring-emerald-300/80 border-transparent',
    regularInactive: 'bg-white/95 text-slate-900 border-2 border-emerald-600/30 hover:border-emerald-500 hover:bg-white hover:shadow-emerald-500/20 shadow-md',
    regularIconActive: 'bg-white/20 text-white shadow-inner',
    regularIconInactive: 'bg-emerald-100 text-emerald-800',
    homeschoolActive: 'bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white shadow-orange-500/50 ring-4 ring-amber-300/80 border-transparent',
    homeschoolInactive: 'bg-white/95 text-slate-900 border-2 border-amber-600/30 hover:border-amber-500 hover:bg-white hover:shadow-amber-500/20 shadow-md',
    homeschoolIconActive: 'bg-white/20 text-white shadow-inner',
    homeschoolIconInactive: 'bg-amber-100 text-amber-800',
    servicesActive: 'bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-700 text-white shadow-indigo-500/50 ring-4 ring-indigo-300/80 border-transparent',
    servicesInactive: 'bg-white/95 text-slate-900 border-2 border-indigo-600/30 hover:border-indigo-500 hover:bg-white hover:shadow-indigo-500/20 shadow-md',
    servicesIconActive: 'bg-white/20 text-white shadow-inner',
    servicesIconInactive: 'bg-indigo-100 text-indigo-800',
    backBtnStyle: 'bg-white/95 hover:bg-white text-slate-900 border-2 border-slate-300 hover:border-emerald-600 shadow-md',
    textColor: 'text-white',
    subtitleColor: 'text-emerald-100 drop-shadow',
  },
  sky_navy: {
    id: 'sky_navy',
    nameAr: 'أزرق سماوي وبحري',
    nameEn: 'Sky & Deep Navy',
    previewBg: 'from-sky-400 via-blue-600 to-slate-900',
    gradientBg: 'bg-gradient-to-r from-sky-500/40 via-blue-600/35 to-slate-900/50',
    backdropOverlay: 'bg-slate-950/50 backdrop-blur-md',
    borderStroke: 'border-sky-400/30',
    titleIconColor: 'text-sky-300',
    titleUnderline: 'from-transparent via-sky-400 to-transparent',
    titleShadow: 'text-white drop-shadow-[0_2px_8px_rgba(56,189,248,0.5)]',
    runnerGlow: 'bg-white shadow-[0_0_12px_4px_rgba(56,189,248,0.9)]',
    regularActive: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-700 text-white shadow-blue-500/50 ring-4 ring-sky-300/80 border-transparent',
    regularInactive: 'bg-white/95 text-slate-900 border-2 border-blue-600/30 hover:border-blue-500 hover:bg-white hover:shadow-blue-500/20 shadow-md',
    regularIconActive: 'bg-white/20 text-white shadow-inner',
    regularIconInactive: 'bg-blue-100 text-blue-800',
    homeschoolActive: 'bg-gradient-to-br from-teal-500 via-emerald-600 to-cyan-700 text-white shadow-teal-500/50 ring-4 ring-teal-300/80 border-transparent',
    homeschoolInactive: 'bg-white/95 text-slate-900 border-2 border-teal-600/30 hover:border-teal-500 hover:bg-white hover:shadow-teal-500/20 shadow-md',
    homeschoolIconActive: 'bg-white/20 text-white shadow-inner',
    homeschoolIconInactive: 'bg-teal-100 text-teal-800',
    servicesActive: 'bg-gradient-to-br from-cyan-600 via-sky-600 to-indigo-700 text-white shadow-cyan-500/50 ring-4 ring-cyan-300/80 border-transparent',
    servicesInactive: 'bg-white/95 text-slate-900 border-2 border-cyan-600/30 hover:border-cyan-500 hover:bg-white hover:shadow-cyan-500/20 shadow-md',
    servicesIconActive: 'bg-white/20 text-white shadow-inner',
    servicesIconInactive: 'bg-cyan-100 text-cyan-800',
    backBtnStyle: 'bg-white/95 hover:bg-white text-slate-900 border-2 border-slate-300 hover:border-sky-600 shadow-md',
    textColor: 'text-white',
    subtitleColor: 'text-sky-100 drop-shadow',
  },
  purple_rose: {
    id: 'purple_rose',
    nameAr: 'أرجواني ملكي وزهري',
    nameEn: 'Royal Purple & Rose',
    previewBg: 'from-fuchsia-500 via-purple-600 to-rose-600',
    gradientBg: 'bg-gradient-to-r from-purple-600/40 via-fuchsia-500/35 to-rose-600/45',
    backdropOverlay: 'bg-slate-950/45 backdrop-blur-md',
    borderStroke: 'border-fuchsia-400/30',
    titleIconColor: 'text-fuchsia-300',
    titleUnderline: 'from-transparent via-fuchsia-400 to-transparent',
    titleShadow: 'text-white drop-shadow-[0_2px_8px_rgba(217,70,239,0.5)]',
    runnerGlow: 'bg-white shadow-[0_0_12px_4px_rgba(244,114,182,0.9)]',
    regularActive: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-700 text-white shadow-purple-500/50 ring-4 ring-fuchsia-300/80 border-transparent',
    regularInactive: 'bg-white/95 text-slate-900 border-2 border-purple-600/30 hover:border-purple-500 hover:bg-white hover:shadow-purple-500/20 shadow-md',
    regularIconActive: 'bg-white/20 text-white shadow-inner',
    regularIconInactive: 'bg-purple-100 text-purple-800',
    homeschoolActive: 'bg-gradient-to-br from-rose-500 via-pink-600 to-amber-600 text-white shadow-rose-500/50 ring-4 ring-rose-300/80 border-transparent',
    homeschoolInactive: 'bg-white/95 text-slate-900 border-2 border-rose-600/30 hover:border-rose-500 hover:bg-white hover:shadow-rose-500/20 shadow-md',
    homeschoolIconActive: 'bg-white/20 text-white shadow-inner',
    homeschoolIconInactive: 'bg-rose-100 text-rose-800',
    servicesActive: 'bg-gradient-to-br from-violet-600 via-purple-600 to-pink-700 text-white shadow-violet-500/50 ring-4 ring-violet-300/80 border-transparent',
    servicesInactive: 'bg-white/95 text-slate-900 border-2 border-violet-600/30 hover:border-violet-500 hover:bg-white hover:shadow-violet-500/20 shadow-md',
    servicesIconActive: 'bg-white/20 text-white shadow-inner',
    servicesIconInactive: 'bg-violet-100 text-violet-800',
    backBtnStyle: 'bg-white/95 hover:bg-white text-slate-900 border-2 border-slate-300 hover:border-fuchsia-600 shadow-md',
    textColor: 'text-white',
    subtitleColor: 'text-fuchsia-100 drop-shadow',
  },
  light_gold: {
    id: 'light_gold',
    nameAr: 'مشرق كلاسيكي وأنيق',
    nameEn: 'Luminous Classic',
    previewBg: 'from-amber-300 via-amber-500 to-sky-400',
    gradientBg: 'bg-gradient-to-r from-amber-200/60 via-slate-100/90 to-sky-200/60',
    backdropOverlay: 'bg-white/80 backdrop-blur-md',
    borderStroke: 'border-slate-300',
    titleIconColor: 'text-amber-600',
    titleUnderline: 'from-transparent via-amber-500 to-transparent',
    titleShadow: 'text-slate-900 drop-shadow-sm',
    runnerGlow: 'bg-amber-600 shadow-[0_0_12px_4px_rgba(217,119,6,0.6)]',
    regularActive: 'bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 text-white shadow-blue-900/40 ring-4 ring-blue-300/80 border-transparent',
    regularInactive: 'bg-white text-slate-900 border-2 border-slate-300 hover:border-blue-600 hover:bg-slate-50 hover:shadow-md shadow-sm',
    regularIconActive: 'bg-white/20 text-white shadow-inner',
    regularIconInactive: 'bg-blue-100 text-blue-800',
    homeschoolActive: 'bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 text-white shadow-amber-700/40 ring-4 ring-amber-300/80 border-transparent',
    homeschoolInactive: 'bg-white text-slate-900 border-2 border-slate-300 hover:border-amber-600 hover:bg-slate-50 hover:shadow-md shadow-sm',
    homeschoolIconActive: 'bg-white/20 text-white shadow-inner',
    homeschoolIconInactive: 'bg-amber-100 text-amber-800',
    servicesActive: 'bg-gradient-to-br from-indigo-700 via-blue-800 to-slate-900 text-white shadow-indigo-900/40 ring-4 ring-indigo-300/80 border-transparent',
    servicesInactive: 'bg-white text-slate-900 border-2 border-slate-300 hover:border-indigo-600 hover:bg-slate-50 hover:shadow-md shadow-sm',
    servicesIconActive: 'bg-white/20 text-white shadow-inner',
    servicesIconInactive: 'bg-indigo-100 text-indigo-800',
    backBtnStyle: 'bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-300 hover:border-slate-600 shadow-md',
    textColor: 'text-slate-900',
    subtitleColor: 'text-slate-700 font-bold',
  },
};

export const getSavedColorTheme = (): ColorThemeKey => {
  try {
    const saved = localStorage.getItem('app_color_theme') || localStorage.getItem('middle_system_type_color_theme');
    if (saved && saved in COLOR_THEMES) {
      return saved as ColorThemeKey;
    }
  } catch {}
  return 'emerald_indigo';
};

export const saveColorTheme = (theme: ColorThemeKey) => {
  try {
    localStorage.setItem('app_color_theme', theme);
    localStorage.setItem('middle_system_type_color_theme', theme);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app_color_theme_changed', { detail: theme }));
    }
  } catch {}
};
