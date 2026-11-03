import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, Laptop, Tablet, Smartphone, AlertCircle, X, Check, ArrowRight } from 'lucide-react';

interface MobileDeviceNoticeProps {
  onDismiss?: () => void;
}

export function isMobilePhoneDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTabletUA = /iPad|Tablet|PlayBook|Silk/i.test(ua);

  // Tablets typically have viewports >= 768px (iPad, Android tablets, etc.)
  const isNarrow = window.innerWidth < 768;

  // If user is on a mobile phone user-agent, or screen width is narrow (<768px)
  if (isTabletUA && window.innerWidth >= 768) {
    return false;
  }

  return isNarrow || (isMobileUA && !isTabletUA);
}

export const MobileDeviceNotice: React.FC<MobileDeviceNoticeProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTopBanner, setShowTopBanner] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('mobile_advice_dismissed') === 'true';

    const checkDevice = () => {
      const isMobile = isMobilePhoneDevice();
      if (isMobile && !isDismissed) {
        setIsVisible(true);
      } else if (isMobile && isDismissed) {
        // Can optionally show a slim banner or remain quiet
        setShowTopBanner(false);
      } else {
        setIsVisible(false);
        setShowTopBanner(false);
      }
    };

    checkDevice();

    const handleResize = () => {
      const isMobile = isMobilePhoneDevice();
      const dismissed = sessionStorage.getItem('mobile_advice_dismissed') === 'true';
      if (isMobile && !dismissed) {
        setIsVisible(true);
      } else if (!isMobile) {
        setIsVisible(false);
        setShowTopBanner(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClose = () => {
    sessionStorage.setItem('mobile_advice_dismissed', 'true');
    setIsVisible(false);
    setShowTopBanner(true);
    if (onDismiss) onDismiss();
  };

  const handleDismissForever = () => {
    sessionStorage.setItem('mobile_advice_dismissed', 'true');
    localStorage.setItem('mobile_advice_dismissed_permanent', 'true');
    setIsVisible(false);
    setShowTopBanner(false);
    if (onDismiss) onDismiss();
  };

  return (
    <>
      {/* Primary Mobile Advisory Modal Dialog */}
      <AnimatePresence>
        {isVisible && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fadeIn"
            dir="rtl"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-amber-300/80 overflow-hidden text-right flex flex-col my-auto"
            >
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 text-white relative flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shrink-0 shadow-inner">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-100 block">
                      تنبيه توافق الأجهزة
                    </span>
                    <h4 className="text-base font-extrabold leading-tight">
                      تجربة الاستخدام المثلى
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center justify-center transition"
                  title="إغلاق"
                  aria-label="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Visual Devices Comparison */}
                <div className="flex items-center justify-around bg-gradient-to-b from-amber-50 to-orange-50/50 p-3.5 rounded-2xl border border-amber-200">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="w-11 h-11 rounded-xl bg-white shadow-sm border border-emerald-300 text-emerald-600 flex items-center justify-center relative">
                      <Monitor className="w-6 h-6" />
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold">✓</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">كمبيوتر</span>
                  </div>

                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="w-11 h-11 rounded-xl bg-white shadow-sm border border-emerald-300 text-emerald-600 flex items-center justify-center relative">
                      <Laptop className="w-6 h-6" />
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold">✓</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">لابتوب</span>
                  </div>

                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="w-11 h-11 rounded-xl bg-white shadow-sm border border-emerald-300 text-emerald-600 flex items-center justify-center relative">
                      <Tablet className="w-6 h-6" />
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold">✓</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">تابلت</span>
                  </div>

                  <div className="flex flex-col items-center gap-1 text-center opacity-70">
                    <div className="w-11 h-11 rounded-xl bg-amber-100 shadow-sm border border-amber-300 text-amber-700 flex items-center justify-center">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold text-amber-800">موبايل</span>
                  </div>
                </div>

                {/* The Required Explicit Advisory Message */}
                <div className="bg-amber-50/90 border-r-4 border-amber-500 p-3.5 rounded-xl text-slate-900 shadow-sm">
                  <p className="text-sm sm:text-base font-extrabold text-amber-950 leading-relaxed">
                    ينصح بتشغيل التطبيق على جهاز الكمبيوتر او اللابتوب او التابلت للحصول على تجربة مستخدم أفضل
                  </p>
                </div>

                {/* Additional context */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  يحتوي نظام الكنترول على جداول رصد متكاملة، كشوفات درجات متعددة الأعمدة، وتقارير طباعة رسمية تتطلب شاشة عريضة لسهولة القراءة والتحكم التام.
                </p>

                {/* Actions */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-sm shadow-md shadow-orange-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2"
                  >
                    <span>فهمت ذلك، المتابعة على الموبايل</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDismissForever}
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition"
                  >
                    عدم إظهار هذه الرسالة مرة أخرى
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Slim Top Ribbon on Mobile after modal dismissal */}
      <AnimatePresence>
        {showTopBanner && (
          <motion.aside
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="bg-amber-500 text-amber-950 px-3 py-2 text-xs font-bold flex items-center justify-between gap-2 shadow-sm border-b border-amber-600 z-[90] sticky top-0 md:hidden"
            dir="rtl"
            aria-label="تنبيه الجهاز"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Laptop className="w-4 h-4 shrink-0 text-amber-900" />
              <span className="truncate">
                ينصح بتشغيل التطبيق على جهاز الكمبيوتر او اللابتوب او التابلت للحصول على تجربة مستخدم أفضل
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowTopBanner(false)}
              className="p-1 rounded-md hover:bg-amber-600/30 text-amber-950 shrink-0 transition"
              title="إغلاق التنبيه"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};
