import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Square, Play } from 'lucide-react';
import { getBrandShieldSync } from '../utils/offlineAssetCache';

export const SPONSOR_DURATION_SECONDS = 15;
const SPONSOR_DURATION_MS = SPONSOR_DURATION_SECONDS * 1000;

interface SponsorAdCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SponsorAdCard: React.FC<SponsorAdCardProps> = ({
  isOpen,
  onClose,
}) => {
  const [remainingMs, setRemainingMs] = useState<number>(SPONSOR_DURATION_MS);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const remainingMsRef = useRef<number>(SPONSOR_DURATION_MS);

  useEffect(() => {
    if (isOpen) {
      remainingMsRef.current = SPONSOR_DURATION_MS;
      setRemainingMs(SPONSOR_DURATION_MS);
      setIsPaused(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isPaused) return;

    const endTime = Date.now() + remainingMsRef.current;

    const timer = window.setInterval(() => {
      const nextRemaining = Math.max(0, endTime - Date.now());
      remainingMsRef.current = nextRemaining;
      setRemainingMs(nextRemaining);

      if (nextRemaining <= 0) {
        window.clearInterval(timer);
        onClose();
      }
    }, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, [isOpen, isPaused, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const progressRatio = Math.max(0, Math.min(1, remainingMs / SPONSOR_DURATION_MS));
  const strokeDashoffset = ringCircumference * (1 - progressRatio);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="sponsor-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 font-arabic"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="هذا البرنامج برعاية - ضع اعلانك هنا"
        >
          {/* إطار خارجي متحرك الألوان بارتفاع 85vh (زيادة 10% عن 75vh) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-[75vw] h-[85vh] min-h-[420px] p-[3px] rounded-[26px] overflow-hidden shadow-[0_32px_95px_-20px_rgba(2,6,23,0.95)]"
          >
            {/* حركة دوران ألوان الإطار */}
            <motion.div
              aria-hidden="true"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="pointer-events-none absolute inset-[-100%] bg-[conic-gradient(from_0deg,#f59e0b_0deg,#fef3c7_55deg,#38bdf8_120deg,#1e3a8a_180deg,#d97706_240deg,#fde68a_300deg,#f59e0b_360deg)]"
            />

            {/* جسم البطاقة الداخلي */}
            <div className="relative w-full h-full flex flex-col justify-between overflow-hidden rounded-[23px] bg-gradient-to-br from-[#060f22] via-[#0b1936] to-[#071124] text-slate-50">
              {/* طبقة إضاءة داخلية متحركة 1: وهج ذهبي دافئ */}
              <motion.div
                aria-hidden="true"
                animate={{
                  x: ['-12%', '12%', '-12%'],
                  y: ['-8%', '8%', '-8%'],
                  opacity: [0.55, 0.85, 0.55],
                }}
                transition={{ repeat: Infinity, duration: 11, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-[-20%] bg-[radial-gradient(ellipse_50%_42%_at_50%_35%,rgba(245,158,11,0.18),transparent_70%)] will-change-transform"
              />

              {/* طبقة إضاءة داخلية متحركة 2: انعكاس أزرق ملكي هادئ */}
              <motion.div
                aria-hidden="true"
                animate={{
                  x: ['12%', '-12%', '12%'],
                  y: ['10%', '-8%', '10%'],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-[-20%] bg-[radial-gradient(ellipse_48%_45%_at_50%_68%,rgba(56,189,248,0.14),transparent_72%)] will-change-transform"
              />

              {/* طبقة إضاءة داخلية متحركة 3: وميض ضوئي مائل انسيابي */}
              <motion.div
                aria-hidden="true"
                animate={{ x: ['-130%', '230%'] }}
                transition={{ repeat: Infinity, repeatDelay: 2.5, duration: 6.5, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-y-0 w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-amber-200/[0.07] to-transparent will-change-transform"
              />

              {/* الشريط العلوي (شريط العنوان) */}
              <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 sm:px-10 pt-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0 justify-self-start">
                  <img
                    src={getBrandShieldSync()}
                    alt="SMART CONTROL"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallbackTried) {
                        img.dataset.fallbackTried = '1';
                        img.src = '/brand_shield.png';
                      }
                    }}
                    className="w-9 h-9 object-contain shrink-0"
                  />
                  <span className="hidden sm:inline font-bold text-xs sm:text-sm text-amber-300 whitespace-nowrap" dir="ltr">
                    SMART CONTROL 0.1
                  </span>
                </div>

                <h2 className="justify-self-center text-center text-base sm:text-xl md:text-2xl font-extrabold text-amber-300 tracking-wide whitespace-nowrap">
                  هذا البرنامج برعاية
                </h2>

                <div className="flex items-center gap-3 shrink-0 justify-self-end">
                  {/* زر إيقاف / تشغيل + عداد الثواني */}
                  <div className="flex items-center gap-2.5" aria-live="polite">
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      aria-pressed={isPaused}
                      aria-label={isPaused ? 'تشغيل المؤقت' : 'إيقاف المؤقت'}
                      title={isPaused ? 'تشغيل المؤقت' : 'إيقاف المؤقت'}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 shrink-0 ${
                        isPaused
                          ? 'border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
                          : 'border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300'
                      }`}
                    >
                      {isPaused ? (
                        <Play className="w-4 h-4 fill-current" />
                      ) : (
                        <Square className="w-4 h-4 fill-current" />
                      )}
                    </button>

                    <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
                        <circle
                          cx="22"
                          cy="22"
                          r={ringRadius}
                          fill="none"
                          stroke="rgba(255,255,255,0.12)"
                          strokeWidth="3"
                        />
                        <circle
                          cx="22"
                          cy="22"
                          r={ringRadius}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-[stroke-dashoffset] duration-100 ease-linear"
                        />
                      </svg>
                      <span className="absolute text-sm font-black text-amber-300 tabular-nums">
                        {secondsLeft}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* قلب البطاقة الرئيسي */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-14 text-center">
                <motion.p
                  animate={{
                    opacity: [0.32, 1, 0.32],
                    scale: [0.985, 1.025, 0.985],
                  }}
                  transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
                  className="relative font-black text-white leading-[1.2] [text-wrap:balance] text-[clamp(2.25rem,5.2vw,4.5rem)] tracking-tight drop-shadow-[0_0_24px_rgba(251,191,36,0.45)] will-change-transform"
                >
                  ضع اعلانك هنا
                </motion.p>
              </div>

              {/* أسفل البطاقة */}
              <div className="relative z-10 px-6 sm:px-10 py-5 border-t border-white/10 bg-black/25 flex items-center justify-center text-center">
                <span
                  dir="ltr"
                  className="font-black text-xl sm:text-2xl md:text-3xl text-amber-300 tracking-wider tabular-nums select-all"
                >
                  01098594956 - 01131097055
                </span>
              </div>

              {/* شريط التقدم السفلي للـ 15 ثانية */}
              <div className="relative z-10 h-1.5 w-full bg-white/10 overflow-hidden" aria-hidden="true">
                <div
                  style={{ transform: `scaleX(${progressRatio})` }}
                  className="h-full w-full origin-right bg-gradient-to-l from-amber-400 via-amber-300 to-yellow-500 transition-transform duration-100 ease-linear"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
