import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';
import { Language } from '../types';

interface PWAInstallButtonProps {
  lang?: Language;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ lang = 'ar', className = '' }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // If already running as an installed standalone PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    }
  };

  const buttonText = lang === 'ar' ? 'تثبيت التطبيق ليعمل بدون انترنت' : 'Install App (Works Offline)';

  return (
    <button
      type="button"
      onClick={handleClick}
      title={buttonText}
      className={`flex items-center justify-center gap-2 px-3 md:px-4 bg-gradient-to-r from-[#facc15] via-[#fde047] to-[#22d3ee] hover:from-[#eab308] hover:to-[#06b6d4] text-slate-950 font-black text-xs md:text-sm border-[1.5px] border-slate-900 rounded-lg transition-all shadow-sm shrink-0 h-14 cursor-pointer active:scale-[0.98] ${className}`}
    >
      <Download className="w-4 h-4 text-slate-950 shrink-0" strokeWidth={2.5} />
      <span className="whitespace-nowrap">{buttonText}</span>
    </button>
  );
};
