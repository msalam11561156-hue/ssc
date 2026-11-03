import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, Laptop, Tablet, Smartphone, AlertCircle, X, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

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

  // If user is on a tablet with width >= 768px, it is considered tablet
  if (isTabletUA && window.innerWidth >= 768) {
    return false;
  }

  return isNarrow || (isMobileUA && !isTabletUA);
}

export const MobileDeviceNotice: React.FC<MobileDeviceNoticeProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTopBanner, setShowTopBanner] = useState(false);

  useEffect(() => {
    // Check if dismissed permanently or in this session
    const isDismissedPermanent = localStorage.getItem('mobile_advice_dismissed_permanent') === 'true';
    const isDismissedSession = sessionStorage.getItem('mobile_advice_dismissed') === 'true';

    if (isDismissedPermanent) {
      setIsVisible(false);
      return;
    }

    const checkDevice = () => {
      const isMobile = isMobilePhoneDevice();
      if (isMobile && !isDismissedSession) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    checkDevice();

    const handleResize = () => {
      if (isDismissedPermanent) return;
      const isMobile = isMobilePhoneDevice();
      const dismissed = sessionStorage.getItem('mobile_advice_dismissed') === 'true';
      if (isMobile && !dismissed) {
        setIsVisible(true);
      } else if (!isMobile) {
        setIsVisible(false);
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
      {/* 100% Full Screen Mobile Advisory Overlay - Responsive for any mobile device size */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[200] w-full h-[100dvh] min-h-screen bg-[#070b14] text-white flex flex-col justify-between overflow-y-auto overflow-x-hidden select-none"
            dir="rtl"
            role="dialog"
            aria-modal="true"
          >
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl" />
              <div className="absolute top-1/2 -left-24 w-72 h-72 bg-sky-500/15 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl" />
            </div>

            {/* Top Navigation Bar */}
            <div className="relative z-10 w-full px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/10 bg-slate-900/60 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 flex items-center justify-center shadow-md shadow-amber-500/20">
                  <ShieldCheck className="w-5 h-5 text-slate-950" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black tracking-wide text-amber-300">نظام الكنترول المدرسي الإلكتروني</span>
                  <span className="text-[10px] text-slate-400">تنبيه ملاءمة الجهاز والشاشة</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition border border-white/10"
                title="تخطي الرسالة"
                aria-label="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Content Area - Fully responsive with auto-scrolling on compact screens */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-5 max-w-lg mx-auto w-full text-center">
              
              {/* Alert Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold mb-4 shadow-sm animate-pulse">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>إشعار تجربة الاستخدام المثالية</span>
              </div>

              {/* Devices Comparison Grid */}
              <div className="w-full grid grid-cols-4 gap-2 mb-5">
                {/* Desktop */}
                <div className="bg-slate-800/80 border border-emerald-500/40 rounded-2xl p-2.5 flex flex-col items-center justify-center shadow-lg relative group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5 border border-emerald-500/30">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200">كمبيوتر</span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-bold mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> مثالي
                  </span>
                </div>

                {/* Laptop */}
                <div className="bg-slate-800/80 border border-emerald-500/40 rounded-2xl p-2.5 flex flex-col items-center justify-center shadow-lg relative group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5 border border-emerald-500/30">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200">لابتوب</span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-bold mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> مثالي
                  </span>
                </div>

                {/* Tablet */}
                <div className="bg-slate-800/80 border border-emerald-500/40 rounded-2xl p-2.5 flex flex-col items-center justify-center shadow-lg relative group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5 border border-emerald-500/30">
                    <Tablet className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200">تابلت</span>
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-bold mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> ممتاز
                  </span>
                </div>

                {/* Mobile Phone (Current) */}
                <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-2.5 flex flex-col items-center justify-center shadow-lg relative">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1.5 border border-amber-500/30">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-amber-200">موبايل</span>
                  <span className="text-[10px] text-amber-400 font-bold mt-0.5">
                    شاشة ضيقة
                  </span>
                </div>
              </div>

              {/* The EXACT Required Advisory Message Card */}
              <div className="w-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-5 shadow-xl shadow-amber-500/10 mb-4 backdrop-blur-md">
                <p className="text-base sm:text-lg font-black text-amber-200 leading-relaxed drop-shadow-sm">
                  ينصح بتشغيل التطبيق على جهاز الكمبيوتر او اللابتوب او التابلت للحصول على تجربة مستخدم أفضل
                </p>
              </div>

              {/* Explanatory bullet points */}
              <div className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 sm:p-4 text-right space-y-2 mb-2 text-xs sm:text-sm text-slate-300">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </div>
                  <p className="leading-snug">
                    <strong className="text-white">جداول رصد متعددة الأعمدة:</strong> يتضمن التطبيق جداول تقييمات، امتحانات تحريرية، وكشوفات رصد واسعة تحتاج لشاشة عريضة.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </div>
                  <p className="leading-snug">
                    <strong className="text-white">طباعة رسمية A4:</strong> شهادات الدرجات والتقديرات وبطاقات أرقام الجلوس مصممة بأبعاد الطباعة المعتمدة بوزارة التربية والتعليم.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </div>
                  <p className="leading-snug">
                    <strong className="text-white">سهولة ودقة الإدخال:</strong> إدخال وتعديل درجات عشرات الطلاب يتطلب مساحة رؤية مريحة وتفاعلاً سريعاً.
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Actions Area - Pinned comfortably for mobile reach */}
            <div className="relative z-10 w-full p-4 sm:p-5 border-t border-white/10 bg-slate-950/90 backdrop-blur-md flex flex-col gap-2.5 max-w-lg mx-auto">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-amber-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 border border-amber-300"
              >
                <span>فهمت ذلك، الدخول إلى التطبيق على الموبايل</span>
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>

              <button
                type="button"
                onClick={handleDismissForever}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 active:scale-95 transition"
              >
                عدم إظهار هذه الرسالة مرة أخرى على هذا الجهاز
              </button>
            </div>
          </motion.div>
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
