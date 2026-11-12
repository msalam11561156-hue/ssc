import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X, Monitor, CheckCircle2, HelpCircle } from 'lucide-react';
import { Language } from '../types';
import { useIsMobilePhone } from '../utils/deviceHelper';

interface PWAInstallButtonProps {
  lang?: Language;
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ lang = 'ar', className = '' }) => {
  const { isInstalled, install, isIOS } = usePWAInstall();
  const isMobile = useIsMobilePhone();
  const [showModal, setShowModal] = useState(false);

  // If already running as an installed standalone PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // On mobile phone devices, hide the install button
  if (isMobile) {
    return null;
  }

  const buttonText = lang === 'ar' ? 'تثبيت التطبيق' : 'Install App';

  const handleClick = async () => {
    const success = await install();
    if (!success) {
      // If browser deferredPrompt wasn't ready, show helpful installation guide modal
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={buttonText}
        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 bg-gradient-to-r from-[#facc15] via-[#fde047] to-[#22d3ee] hover:from-[#eab308] hover:to-[#06b6d4] text-slate-950 font-black text-[11px] sm:text-xs md:text-sm border-[1.5px] border-slate-900 rounded-lg transition-all shadow-sm shrink-0 h-11 sm:h-12 md:h-14 cursor-pointer active:scale-[0.98] ${className}`}
      >
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 shrink-0" strokeWidth={2.5} />
        <span className="whitespace-nowrap">{buttonText}</span>
      </button>

      {/* Installation Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" dir="rtl">
          <div className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-400/60 rounded-3xl shadow-2xl p-6 text-white flex flex-col items-center">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
              <Monitor className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black text-amber-300 mb-2 text-center">
              طريقة تثبيت تطبيق Smart Control على جهازك
            </h3>

            <p className="text-sm text-slate-300 text-center mb-6 leading-relaxed font-medium">
              لكي تعمل المنظومة بكفاءة كاملة وسرعة فائقة بدون إنترنت، يمكنك تثبيت التطبيق على جهاز الكمبيوتر أو اللابتوب باتباع إحدى الطرق التالية:
            </p>

            <div className="w-full flex flex-col gap-3 text-right">
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 font-black text-sm mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-cyan-300 mb-1">من شريط عنوان المتصفح (Chrome / Edge)</h4>
                  <p className="text-xs text-slate-300 leading-normal">
                    انظر إلى أعلى المتصفح في أقصى يمين أو يسار شريط العنوان، ستجد أيقونة تثبيت <span className="text-amber-300 font-bold">(شاشة صغيرة عليها سهم)</span>، اضغط عليها ثم اضغط <span className="text-emerald-400 font-bold">تثبيت</span>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-black text-sm mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-300 mb-1">من قائمة إعدادات المتصفح (⋮)</h4>
                  <p className="text-xs text-slate-300 leading-normal">
                    اضغط على زر القائمة الثلاثية <span className="text-amber-300 font-bold">(⋮)</span> في أعلى يمين المتصفح، ثم اختر <span className="text-cyan-300 font-bold">"تثبيت Smart Control..."</span> أو <span className="text-cyan-300 font-bold">"حفظ و مشاركة" &gt; "تثبيت التطبيق"</span>.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              فهمت، شكراً لك
            </button>
          </div>
        </div>
      )}
    </>
  );
};
