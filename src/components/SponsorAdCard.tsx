import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Square, Play } from 'lucide-react';
import { getBrandShieldSync, getCachedSponsorAdBanner, getSponsorAdBannerSync } from '../utils/offlineAssetCache';
import sponsorAdBannerFallback from '../assets/images/sponsor_ad_banner.jpg';

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
  const [adBannerSrc, setAdBannerSrc] = useState<string>(() => getSponsorAdBannerSync());
  const remainingMsRef = useRef<number>(SPONSOR_DURATION_MS);

  useEffect(() => {
    let active = true;
    getCachedSponsorAdBanner()
      .then((cachedUrl) => {
        if (active && cachedUrl) {
          setAdBannerSrc(cachedUrl);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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
          animate={{ opacity: 1, transition: { duration: 1.4, ease: 'easeInOut' } }}
          exit={{ opacity: 0, transition: { duration: 2.8, ease: [0.4, 0, 0.6, 1] } }}
          className="fixed inset-0 z-[220] flex items-center justify-center overflow-hidden bg-slate-950/75 backdrop-blur-md p-4 font-arabic [perspective:1400px]"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="هذا البرنامج برعاية - ضع اعلانك هنا"
        >
          {/* إطار خارجي متحرك الألوان بارتفاع 90vh (زيادة 5% عن 85vh) */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.14,
              x: '-26vw',
              y: '-34vh',
              rotate: -360,
              rotateX: 55,
              rotateY: -90,
            }}
            animate={{
              opacity: [0, 0.78, 1, 1],
              scale: [0.14, 0.58, 1.05, 1],
              x: ['-26vw', '10vw', '-3vw', 0],
              y: ['-34vh', '12vh', '-4vh', 0],
              rotate: [-360, -140, 14, 0],
              rotateX: [55, -18, 6, 0],
              rotateY: [-90, 28, -8, 0],
              transition: {
                duration: 2.8,
                times: [0, 0.42, 0.78, 1],
                ease: [0.22, 1, 0.36, 1],
              },
            }}
            exit={{
              opacity: [1, 1, 0.78, 0],
              scale: [1, 1.05, 0.52, 0.12],
              x: [0, '-4vw', '14vw', '28vw'],
              y: [0, '-5vh', '14vh', '-34vh'],
              rotate: [0, -14, 150, 360],
              rotateX: [0, 8, -22, 55],
              rotateY: [0, -10, 35, 90],
              transition: {
                duration: 2.8,
                times: [0, 0.22, 0.58, 1],
                ease: [0.4, 0, 0.2, 1],
              },
            }}
            style={{ transformStyle: 'preserve-3d' }}
            className="relative w-[75vw] h-[90vh] min-h-[420px] p-[3px] rounded-[26px] overflow-hidden shadow-[0_32px_95px_-20px_rgba(2,6,23,0.95)] will-change-transform"
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
              <div className="relative z-10 flex items-center justify-between gap-3 px-5 sm:px-10 pt-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
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

                <div className="flex items-center gap-3 shrink-0">
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
              <div className="relative z-10 flex-1 min-h-0 w-full p-0 flex items-center justify-center overflow-hidden bg-[#060f22]">
                {/* الصورة الأساسية مع حركة تنفس سينمائية فائقة النعومة */}
                <motion.img
                  src={adBannerSrc}
                  alt="هذا البرنامج برعاية - ضع إعلانك هنا"
                  loading="eager"
                  decoding="async"
                  animate={{ scale: [1, 1.022, 1] }}
                  transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
                  onError={() => {
                    if (adBannerSrc !== sponsorAdBannerFallback) {
                      setAdBannerSrc(sponsorAdBannerFallback);
                    }
                  }}
                  className="w-full h-full object-fill select-none pointer-events-none block contrast-[1.03] saturate-[1.06] will-change-transform"
                />

                {/* تأثيرات احترافية متناسقة فوق الصورة */}
                <div className="absolute inset-0 z-10 pointer-events-none select-none overflow-hidden">
                  {/* 1. إبراز وميض وهالة ذهبية حول لوحة (ضع إعلانك هنا) */}
                  <div
                    className="absolute overflow-hidden rounded-sm"
                    style={{
                      left: '7.27%',
                      top: '36.85%',
                      width: '36.19%',
                      height: '22.39%',
                    }}
                  >
                    <motion.div
                      animate={{
                        opacity: [0.35, 0.9, 0.35],
                        boxShadow: [
                          'inset 0 0 12px rgba(251,191,36,0.18), 0 0 12px rgba(251,191,36,0.2)',
                          'inset 0 0 22px rgba(251,191,36,0.38), 0 0 28px rgba(251,191,36,0.55)',
                          'inset 0 0 12px rgba(251,191,36,0.18), 0 0 12px rgba(251,191,36,0.2)',
                        ],
                      }}
                      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 border border-amber-300/60 rounded-sm"
                    />
                    <motion.div
                      animate={{ x: ['-130%', '170%'] }}
                      transition={{
                        duration: 2.8,
                        repeat: Infinity,
                        repeatDelay: 2.4,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-amber-100/55 to-transparent skew-x-[-22deg] mix-blend-screen"
                    />
                  </div>

                  {/* 2. ومضات نجمية لامعة على زوايا إطار الإعلان الذهبي */}
                  <motion.div
                    animate={{
                      scale: [0, 1.3, 0],
                      opacity: [0, 1, 0],
                      rotate: [0, 90, 180],
                    }}
                    transition={{
                      duration: 2.1,
                      repeat: Infinity,
                      repeatDelay: 2.6,
                      ease: 'easeInOut',
                    }}
                    style={{ left: '43.3%', top: '36.9%' }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center"
                  >
                    <div className="w-full h-[2px] bg-white rounded-full shadow-[0_0_10px_#fbbf24,0_0_18px_#ffffff]" />
                    <div className="h-full w-[2px] bg-white rounded-full shadow-[0_0_10px_#fbbf24,0_0_18px_#ffffff] absolute" />
                  </motion.div>

                  <motion.div
                    animate={{
                      scale: [0, 1.15, 0],
                      opacity: [0, 0.95, 0],
                      rotate: [0, -90, -180],
                    }}
                    transition={{
                      duration: 2.1,
                      repeat: Infinity,
                      delay: 1.8,
                      repeatDelay: 2.6,
                      ease: 'easeInOut',
                    }}
                    style={{ left: '7.4%', top: '59.1%' }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center"
                  >
                    <div className="w-full h-[1.5px] bg-cyan-100 rounded-full shadow-[0_0_8px_#38bdf8,0_0_14px_#ffffff]" />
                    <div className="h-full w-[1.5px] bg-cyan-100 rounded-full shadow-[0_0_8px_#38bdf8,0_0_14px_#ffffff] absolute" />
                  </motion.div>

                  {/* 3. مسح ضوئي زجاجي مائل انسيابي عبر كامل الصورة */}
                  <motion.div
                    animate={{ x: ['-120%', '220%'] }}
                    transition={{
                      duration: 4.5,
                      repeat: Infinity,
                      repeatDelay: 3.5,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-y-0 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/[0.09] to-transparent mix-blend-screen will-change-transform"
                  />

                  {/* 4. تدرج حواف داخلي خفيف لدمج الصورة باحترافية مع الإطار */}
                  <div className="absolute inset-0 shadow-[inset_0_0_28px_rgba(6,15,34,0.38)]" />
                </div>

                {/* ضوء متحرك احترافي يدور بانسيابية حول كامل إطار الصورة */}
                <svg
                  viewBox="0 0 1000 560"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full z-20 pointer-events-none"
                >
                  <defs>
                    <filter id="sponsorFrameGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    <linearGradient id="sponsorGoldBeam" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                      <stop offset="50%" stopColor="#fde68a" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
                    </linearGradient>

                    <linearGradient id="sponsorCyanBeam" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
                      <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
                    </linearGradient>
                  </defs>

                  {/* مسار الإطار الأساسي الدقيق */}
                  <rect
                    x="1.5"
                    y="1.5"
                    width="997"
                    height="557"
                    fill="none"
                    stroke="rgba(251, 191, 36, 0.28)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* الشعاع الذهبي المتوهج المتحرك حول الإطار (هالة + نواة مضيئة) */}
                  <rect
                    x="1.5"
                    y="1.5"
                    width="997"
                    height="557"
                    pathLength="1000"
                    fill="none"
                    stroke="url(#sponsorGoldBeam)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray="175 825"
                    vectorEffect="non-scaling-stroke"
                    filter="url(#sponsorFrameGlow)"
                    opacity="0.72"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="-1000"
                      dur="12s"
                      repeatCount="indefinite"
                    />
                  </rect>
                  <rect
                    x="1.5"
                    y="1.5"
                    width="997"
                    height="557"
                    pathLength="1000"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="110 890"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.95"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="-30"
                      to="-1030"
                      dur="12s"
                      repeatCount="indefinite"
                    />
                  </rect>

                  {/* الشعاع الفيروزي المقابل المتحرك حول الإطار (هالة + نواة مضيئة) */}
                  <rect
                    x="1.5"
                    y="1.5"
                    width="997"
                    height="557"
                    pathLength="1000"
                    fill="none"
                    stroke="url(#sponsorCyanBeam)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="165 835"
                    vectorEffect="non-scaling-stroke"
                    filter="url(#sponsorFrameGlow)"
                    opacity="0.68"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="-500"
                      to="-1500"
                      dur="12s"
                      repeatCount="indefinite"
                    />
                  </rect>
                  <rect
                    x="1.5"
                    y="1.5"
                    width="997"
                    height="557"
                    pathLength="1000"
                    fill="none"
                    stroke="#e0f2fe"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="95 905"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.92"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="-535"
                      to="-1535"
                      dur="12s"
                      repeatCount="indefinite"
                    />
                  </rect>
                </svg>
              </div>

              {/* أسفل البطاقة */}
              <div className="relative z-10 px-6 sm:px-10 py-3.5 sm:py-4 border-t border-white/10 bg-black/25 flex items-center justify-center text-center">
                <span
                  dir="ltr"
                  className="font-black text-xs sm:text-sm md:text-lg text-amber-300 tracking-wider tabular-nums select-all"
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
