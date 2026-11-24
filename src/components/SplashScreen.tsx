import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FAST_MODAL_FLIP, FAST_BACKDROP_FADE } from '../utils/flipAnimation';
import { Language } from '../types';
import { translations } from '../i18n';
import defaultIllustrationBg from '../assets/images/control_illustration_1786475473814.jpg';
import defaultBrandBg from '../assets/images/splash_brand_bg.jpg';
import modernControlBg from '../assets/images/smart_control_room_modern.jpg';
import blueShieldBg from '../assets/images/blue_shield_bg.jpg';
import goldShieldBg from '../assets/images/smart_control_gold_shield.jpg';
import cloudDashboardBg from '../assets/images/smart_control_cloud_dashboard.jpg';
import screenshotBg from '../assets/images/meeting_room_smart.jpg';
import { getCachedSplashBackground, SplashType } from '../utils/offlineAssetCache';
import { useIsMobilePhone } from '../utils/deviceHelper';
import { AnimatedBackground } from './AnimatedBackground';

import { Clock, AlertCircle, Crown } from 'lucide-react';

const PrecisionLightOverlay: React.FC = () => (
  <svg 
    viewBox="0 0 1048 1024" 
    className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
    preserveAspectRatio="none"
  >
    <defs>
      <filter id="zigzagBrightGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur1" />
        <feGaussianBlur stdDeviation="8" result="blur2" />
        <feGaussianBlur stdDeviation="15" result="blur3" />
        <feMerge>
          <feMergeNode in="blur3" />
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      
      <radialGradient id="zigzagSparkRadial" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
        <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.95" />
        <stop offset="65%" stopColor="#fbbf24" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
      </radialGradient>

      <linearGradient id="zigzagTrailGrad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
        <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.5" />
        <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
      </linearGradient>
    </defs>

    {/* Luminous laser trail running behind the light */}
    <path
      d="M 206 638 L 402 432 L 452 502 L 567 370 L 633 456 L 896 194"
      fill="none"
      stroke="url(#zigzagTrailGrad)"
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#zigzagBrightGlow)"
      strokeDasharray="220 1200"
    >
      <animate
        attributeName="stroke-dashoffset"
        values="220; -805; -1025; -1025"
        keyTimes="0; 0.82; 0.9; 1"
        dur="3.7s"
        repeatCount="indefinite"
        calcMode="linear"
      />
      <animate
        attributeName="opacity"
        values="0; 0.95; 0.95; 0; 0"
        keyTimes="0; 0.05; 0.82; 0.88; 1"
        dur="3.7s"
        repeatCount="indefinite"
      />
    </path>

    {/* Hot white inner laser core */}
    <path
      d="M 206 638 L 402 432 L 452 502 L 567 370 L 633 456 L 896 194"
      fill="none"
      stroke="#ffffff"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="150 1200"
    >
      <animate
        attributeName="stroke-dashoffset"
        values="150; -875; -1025; -1025"
        keyTimes="0; 0.82; 0.9; 1"
        dur="3.7s"
        repeatCount="indefinite"
        calcMode="linear"
      />
      <animate
        attributeName="opacity"
        values="0; 1; 1; 0; 0"
        keyTimes="0; 0.05; 0.82; 0.88; 1"
        dur="3.7s"
        repeatCount="indefinite"
      />
    </path>

    {/* Moving Light Orb / Energy Spark traveling accurately over the broken line */}
    <g>
      <animateMotion
        path="M 206 638 L 402 432 L 452 502 L 567 370 L 633 456 L 896 194"
        dur="3.7s"
        repeatCount="indefinite"
        keyPoints="0; 1; 1"
        keyTimes="0; 0.82; 1"
        calcMode="linear"
      />
      <animate
        attributeName="opacity"
        values="0; 1; 1; 1; 0; 0"
        keyTimes="0; 0.04; 0.8; 0.84; 0.9; 1"
        dur="3.7s"
        repeatCount="indefinite"
      />

      {/* Outer soft aura */}
      <circle r="32" fill="url(#zigzagSparkRadial)" />

      {/* Intense glow aura */}
      <circle r="15" fill="#fbbf24" filter="url(#zigzagBrightGlow)" opacity="0.95" />
      <circle r="10" fill="#38bdf8" filter="url(#zigzagBrightGlow)" opacity="0.95" />

      {/* Rotating 4-pointed diamond star flare */}
      <polygon
        points="0,-24 4,-6 24,0 4,6 0,24 -4,6 -24,0 -4,-6"
        fill="#ffffff"
        opacity="0.95"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0"
          to="360"
          dur="3.7s"
          repeatCount="indefinite"
        />
      </polygon>

      {/* Diamond sparkle diagonal flares */}
      <polygon
        points="0,-14 3,-3 14,0 3,3 0,14 -3,3 -14,0 -3,-3"
        fill="#fef08a"
        opacity="0.85"
        transform="rotate(45)"
      />

      {/* Pure white radiant core */}
      <circle r="5.5" fill="#ffffff" filter="url(#zigzagBrightGlow)" />
    </g>
  </svg>
);

const MeetingRoomSmartEffect: React.FC = () => (
  <div className="absolute inset-0 z-10 pointer-events-none select-none overflow-hidden">
    {/* 1. توهج ونبض ضوئي فائق النعومة على الشاشة التفاعلية الذكية (Interactive Smart Screen) */}
    <div 
      className="absolute overflow-hidden rounded-sm"
      style={{
        left: '56.3%',
        top: '12.6%',
        width: '43.2%',
        height: '35.4%',
      }}
    >
      {/* وميض تنفسي خفيف على إطار الشاشة لإبراز تفاعلية العرض */}
      <motion.div
        animate={{
          opacity: [0.15, 0.45, 0.15],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 border border-cyan-400/30 shadow-[inset_0_0_18px_rgba(56,189,248,0.18)]"
      />

      {/* خط مسح ضوئي تقني خافت يمر بسلاسة عبر لوحة المؤشرات البيانية */}
      <motion.div
        animate={{
          x: ['-120%', '160%'],
        }}
        transition={{
          duration: 4.8,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatDelay: 1.8,
        }}
        className="absolute inset-y-0 w-28 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent skew-x-[-18deg] mix-blend-screen pointer-events-none"
      />
    </div>

    {/* 2. بريق وهالة ذهبية أنيقة على شعار الدرع وسهم الكنترول الذكي في اللوحة الجدارية */}
    <div
      className="absolute overflow-visible"
      style={{
        left: '38.9%',
        top: '17.6%',
        width: '16.2%',
        height: '18.3%',
      }}
    >
      {/* هالة ذهبية دافئة ناعمة تنبض خلف الدرع */}
      <motion.div
        animate={{
          opacity: [0.25, 0.65, 0.25],
          scale: [0.94, 1.06, 0.94],
        }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-2 rounded-full bg-amber-400/25 blur-md mix-blend-screen"
      />

      {/* لمعة ضوئية عابرة تمشي على السهم والدرع الذهبي */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: ['-130%', '150%'],
          }}
          transition={{
            duration: 3.6,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatDelay: 2.2,
          }}
          className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-amber-200/50 to-transparent skew-x-[-25deg] mix-blend-overlay"
        />
      </div>

      {/* ومضة نجمية لامعة وراقية تظهر كل فترة على رأس السهم الصاعد */}
      <motion.div
        animate={{
          scale: [0, 1.25, 0],
          opacity: [0, 1, 0],
          rotate: [0, 90, 180],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatDelay: 3.2,
        }}
        style={{
          position: 'absolute',
          left: '73%',
          top: '18%',
        }}
        className="w-4 h-4 flex items-center justify-center pointer-events-none"
      >
        <div className="w-full h-[1.5px] bg-white rounded-full shadow-[0_0_8px_#fbbf24]" />
        <div className="h-full w-[1.5px] bg-white rounded-full shadow-[0_0_8px_#fbbf24] absolute" />
      </motion.div>
    </div>

    {/* 3. لمسة إضاءة سينمائية علوية وسفلية تزيد تباين وعمق المشهد بدون التأثير على الوجوه */}
    <div 
      className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-cyan-950/15 pointer-events-none"
    />
  </div>
);

interface SplashScreenProps {
  onNext: (isTrial?: boolean) => void;
  lang: Language;
  isTrialExpired?: boolean;
  isDayExpired?: boolean;
  trialRemainingDayMs?: number;
  trialCurrentDayNumber?: number;
  trialRemainingDaysCount?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onNext, 
  lang,
  isTrialExpired = false,
  isDayExpired = false,
  trialCurrentDayNumber = 1,
  trialRemainingDaysCount = 3,
}) => {
  const [showDayExpiredModal, setShowDayExpiredModal] = useState(false);
  const [showAllExpiredModal, setShowAllExpiredModal] = useState(false);
  const [blueShieldImg, setBlueShieldImg] = useState(blueShieldBg);
  const [illustrationImg, setIllustrationImg] = useState(defaultIllustrationBg);
  const [brandImg, setBrandImg] = useState(defaultBrandBg);
  const [modernControlImg, setModernControlImg] = useState(modernControlBg);
  const [goldShieldImg, setGoldShieldImg] = useState(goldShieldBg);
  const [cloudDashboardImg, setCloudDashboardImg] = useState(cloudDashboardBg);
  const [screenshotImg, setScreenshotImg] = useState(screenshotBg);
  const [activeBgIndex, setActiveBgIndex] = useState(0);
  const [failedSlides, setFailedSlides] = useState<Record<number, boolean>>({});
  const totalSlides = 7;

  const findNextHealthySlide = React.useCallback(
    (fromIndex: number, step: 1 | -1, failedMap: Record<number, boolean> = failedSlides): number => {
      for (let offset = 1; offset <= totalSlides; offset++) {
        const candidate = (fromIndex + step * offset + totalSlides) % totalSlides;
        if (!failedMap[candidate]) {
          return candidate;
        }
      }
      return fromIndex;
    },
    [failedSlides]
  );

  const handleSlideImageError = (
    slideIndex: number,
    splashType: SplashType,
    fallbackSrc: string,
    currentSrc: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (!currentSrc.startsWith('data:image/')) {
      getCachedSplashBackground(splashType)
        .then((cachedUrl) => {
          if (cachedUrl && cachedUrl !== currentSrc) {
            setter(cachedUrl);
          } else if (currentSrc !== fallbackSrc) {
            setter(fallbackSrc);
          } else if (currentSrc !== defaultBrandBg) {
            setter(defaultBrandBg);
          } else {
            setFailedSlides((prev) => {
              if (prev[slideIndex]) return prev;
              const nextMap = { ...prev, [slideIndex]: true };
              setActiveBgIndex((curr) => (curr === slideIndex ? findNextHealthySlide(slideIndex, 1, nextMap) : curr));
              return nextMap;
            });
          }
        })
        .catch(() => {
          if (currentSrc !== fallbackSrc) {
            setter(fallbackSrc);
          }
        });
      return;
    }
    if (currentSrc !== fallbackSrc && currentSrc !== defaultBrandBg) {
      setter(fallbackSrc);
      return;
    }
    if (currentSrc !== defaultBrandBg) {
      setter(defaultBrandBg);
      return;
    }
    setFailedSlides((prev) => {
      if (prev[slideIndex]) return prev;
      const nextMap = { ...prev, [slideIndex]: true };
      setActiveBgIndex((curr) => (curr === slideIndex ? findNextHealthySlide(slideIndex, 1, nextMap) : curr));
      return nextMap;
    });
  };

  // تبديل خلفية الشاشة كل 5 ثوان بنعومة وسلاسة بين الصور السبع
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setActiveBgIndex((prev) => findNextHealthySlide(prev, 1));
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [activeBgIndex, findNextHealthySlide]);

  const isMobile = useIsMobilePhone();

  const handleOfficialClick = () => {
    if (isMobile) {
      return;
    }
    onNext(false);
  };

  const handleTrialClick = () => {
    if (isMobile) {
      return;
    }
    if (isTrialExpired) {
      setShowAllExpiredModal(true);
      return;
    }
    if (isDayExpired) {
      setShowDayExpiredModal(true);
      return;
    }
    onNext(true);
  };

  return (
    <div className="w-full h-[100dvh] flex flex-col justify-between items-center overflow-hidden bg-transparent relative">
      <AnimatedBackground />

      {/* Top Scrolling Ticker Bar - Spans full width of the screen on any device */}
      <div className="w-full z-20 shrink-0">
        <motion.div 
          animate={{ 
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            boxShadow: [
              '0 0 10px 2px rgba(255,255,255,0.4), 0 0 20px 5px rgba(6,182,212,0.4)', 
              '0 0 20px 4px rgba(255,255,255,0.7), 0 0 40px 10px rgba(6,182,212,0.7)', 
              '0 0 10px 2px rgba(255,255,255,0.4), 0 0 20px 5px rgba(6,182,212,0.4)'
            ]
          }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="w-full bg-[length:200%_auto] py-[2px] sm:py-[3px] shadow-2xl relative overflow-hidden border-b-2 border-black"
          style={{ backgroundImage: 'linear-gradient(to right, #ffffff, #06b6d4, #3b82f6, #06b6d4, #ffffff)' }}
        >
          {/* Ticker Background (Blue -> Green -> Yellow) */}
          <motion.div 
             animate={{ backgroundColor: ['rgba(30,64,175,0.95)', 'rgba(21,128,61,0.95)', 'rgba(161,98,7,0.95)', 'rgba(30,64,175,0.95)'] }}
             transition={{ repeat: Infinity, duration: 15, ease: 'easeInOut' }}
             className="w-full py-2 sm:py-2.5 md:py-3.5 px-3 sm:px-4 flex items-center overflow-hidden [container-type:inline-size]"
             dir="ltr"
          >
            {/* Ticker Animation */}
            <div 
              className="flex whitespace-nowrap w-max animate-splash-marquee"
              dir="ltr"
            >
              <motion.h1 
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                className="text-sm sm:text-base md:text-xl font-extrabold text-transparent bg-clip-text flex items-center"
                style={{ 
                  backgroundImage: 'linear-gradient(to right, #2dd4bf, #ffffff, #a855f7, #fbbf24, #2dd4bf)',
                  backgroundSize: '200% auto',
                  filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.8))' 
                }}
                dir="rtl"
              >
                <span>{translations.ar.appTitle}</span>
              </motion.h1>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Frame & Action Buttons Area - Centered and flexibly sized to fit any screen */}
      <div className="w-full max-w-5xl mx-auto px-2 sm:px-6 md:px-8 flex-1 min-h-0 flex flex-col items-center justify-center gap-1.5 sm:gap-3 md:gap-4 my-auto overflow-y-auto sm:overflow-hidden py-1 sm:py-2">
        <div
          className="w-full max-w-[340px] sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl aspect-[16/16] sm:aspect-[16/11] max-h-[50vh] sm:max-h-[60vh] relative p-[3px] sm:p-[6px] md:p-[8px] rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-2xl shrink-1 flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
        >
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.08, 1] }}
            transition={{ rotate: { repeat: Infinity, duration: 15, ease: 'linear' }, scale: { repeat: Infinity, duration: 6, ease: 'easeInOut' } }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] aspect-square bg-[conic-gradient(from_0deg_at_50%_50%,#06b6d4_0deg,#a855f7_90deg,#fbbf24_180deg,#3b82f6_270deg,#06b6d4_360deg)] opacity-90 blur-xl z-0 pointer-events-none"
          />
          
          <div className="relative rounded-[1.2rem] sm:rounded-[1.8rem] md:rounded-[2.2rem] overflow-hidden border-[2px] sm:border-[3px] border-black w-full h-full flex flex-col z-10 bg-slate-950">
          <div 
            className="absolute inset-0 z-0 bg-slate-950/40"
          />
            {/* 1. Blue Shield Image (الصورة الأولى - الدرع الأزرق وشعار SMART CONTROL) */}
            <div 
              className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 0 ? 'opacity-100 z-[2]' : 'opacity-0 z-[1] pointer-events-none'
              }`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={blueShieldImg}
                  alt="Smart Control Blue Shield"
                  loading="eager"
                  decoding="async"
                  onError={() => handleSlideImageError(0, 'blue_shield', blueShieldBg, blueShieldImg, setBlueShieldImg)}
                  className="w-full h-full object-fill pointer-events-none select-none"
                />
                <PrecisionLightOverlay />
              </div>
            </div>

            {/* 2. Illustration Image (الصورة الثانية - التوضيحية لنظام الكنترول الذكي) */}
            <div 
              className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 1 ? 'opacity-100 z-[2]' : 'opacity-0 z-[1] pointer-events-none'
              }`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={illustrationImg}
                  alt="Smart Control Illustration"
                  loading="eager"
                  decoding="async"
                  onError={() => handleSlideImageError(1, 'illustration', defaultIllustrationBg, illustrationImg, setIllustrationImg)}
                  className="w-full h-full object-fill pointer-events-none select-none"
                />
              </div>
            </div>

            {/* 3. Brand Shield Image (الصورة الثالثة - صورة الشعار الأرجوانية/المخملية) */}
            <div 
              className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 2 ? 'opacity-100 z-[2]' : 'opacity-0 z-[1] pointer-events-none'
              }`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={brandImg}
                  alt="Smart Control Logo"
                  loading="eager"
                  decoding="async"
                  onError={() => handleSlideImageError(2, 'brand', defaultBrandBg, brandImg, setBrandImg)}
                  className="w-full h-full object-fill pointer-events-none select-none"
                />
                <PrecisionLightOverlay />
              </div>
            </div>

            {/* 4. Modern Control Room Image (الصورة الرابعة - غرفة الكنترول الذكية الحديثة) */}
            <div 
              className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 3 ? 'opacity-100 z-[2]' : 'opacity-0 z-[1] pointer-events-none'
              }`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={modernControlImg}
                  alt="Modern Smart Control Room"
                  loading="eager"
                  decoding="async"
                  onError={() => handleSlideImageError(3, 'modern_control', modernControlBg, modernControlImg, setModernControlImg)}
                  className="w-full h-full object-fill pointer-events-none select-none contrast-[1.12] saturate-[1.08] brightness-[1.03]"
                />
              </div>
            </div>

            {/* 5. Gold Shield Image (الصورة الخامسة - الدرع الذهبي وشعار SMART CONTROL Examination Management) */}
            <div 
              className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 4 ? 'opacity-100 z-[2]' : 'opacity-0 z-[1] pointer-events-none'
              }`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={goldShieldImg}
                  alt="Smart Control Gold Shield Examination Management"
                  loading="eager"
                  decoding="async"
                  onError={() => handleSlideImageError(4, 'gold_shield', goldShieldBg, goldShieldImg, setGoldShieldImg)}
                  className="w-full h-full object-fill pointer-events-none select-none contrast-[1.08] brightness-[1.02]"
                />
                <PrecisionLightOverlay />
              </div>
            </div>

            {/* 6. Cloud Dashboard Image (الصورة السادسة - التحول الرقمي من إكسيل إلى الكنترول السحابي الذكي) */}
            <div 
              className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 5 ? 'opacity-100 z-[2]' : 'opacity-0 z-[1] pointer-events-none'
              }`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={cloudDashboardImg}
                  alt="Smart Control Cloud Dashboard vs Excel"
                  loading="eager"
                  decoding="async"
                  onError={() => handleSlideImageError(5, 'cloud_dashboard', cloudDashboardBg, cloudDashboardImg, setCloudDashboardImg)}
                  className="w-full h-full object-fill pointer-events-none select-none contrast-[1.08] saturate-[1.05] brightness-[1.02]"
                />
              </div>
            </div>

            {/* 7. Last Gallery Image (الصورة السابعة والأخيرة - قاعة الاجتماعات وشاشة الكنترول التفاعلية الذكية) */}
            <div 
              className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 6 ? 'opacity-100 z-[2]' : 'opacity-0 z-[1] pointer-events-none'
              }`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={screenshotImg}
                  alt="Smart Control Examination Management Meeting"
                  loading="eager"
                  decoding="async"
                  onError={() => handleSlideImageError(6, 'screenshot', screenshotBg, screenshotImg, setScreenshotImg)}
                  className="w-full h-full object-fill pointer-events-none select-none contrast-[1.10] saturate-[1.08] brightness-[1.02]"
                />
                <MeetingRoomSmartEffect />
              </div>
            </div>

            {/* Subtle Dark Overlay to preserve text contrast & depth */}
            <div className="absolute inset-0 z-[3] bg-slate-900/15 backdrop-blur-[0.5px] pointer-events-none" />
          </div>
        </div>

      <div
        className="flex flex-col items-center gap-1.5 sm:gap-2.5 w-full shrink-0"
      >
        <div className="flex flex-col items-center gap-1.5 w-full">
            <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 w-full max-w-sm sm:max-w-md md:max-w-lg px-2 sm:px-4">
              <button
                type="button"
                onClick={handleTrialClick}
                className={`flex-1 flex items-center justify-center ${
                  isMobile
                    ? 'bg-slate-800 text-slate-400 opacity-60 cursor-not-allowed border-slate-700'
                    : isTrialExpired || isDayExpired
                    ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-300 opacity-90 cursor-pointer'
                    : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-600 text-white shadow-[0_8px_20px_-6px_rgba(160,185,129,0.55)] cursor-pointer'
                } font-black min-h-[42px] sm:min-h-[50px] md:min-h-[58px] py-2 sm:py-3 md:py-3.5 px-2.5 sm:px-4 md:px-6 rounded-xl sm:rounded-2xl transition-all active:scale-[0.98] border-2 border-black group overflow-hidden relative`}
                title={isMobile ? (lang === 'ar' ? 'يعمل فقط على أجهزة الكمبيوتر واللابتوب والتابلت' : 'Works only on PC, Laptop & Tablet') : undefined}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 text-xs sm:text-base md:text-lg flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap">
                  <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${isMobile ? 'text-slate-500' : 'text-amber-300'} shrink-0`} />
                  <span>النسخة التجريبية</span>
                </span>
              </button>

              <button
                type="button"
                onClick={handleOfficialClick}
                className={`flex-1 flex items-center justify-center ${
                  isMobile
                    ? 'bg-slate-800 text-slate-400 opacity-60 cursor-not-allowed border-slate-700'
                    : 'bg-gradient-to-r from-[#a855f7] to-[#3b82f6] hover:from-[#9333ea] hover:to-[#2563eb] text-white shadow-[0_8px_20px_-6px_rgba(168,85,247,0.6)] cursor-pointer'
                } font-black min-h-[42px] sm:min-h-[50px] md:min-h-[58px] py-2 sm:py-3 md:py-3.5 px-2.5 sm:px-4 md:px-6 rounded-xl sm:rounded-2xl transition-all active:scale-[0.98] border-2 border-black group overflow-hidden relative`}
                title={isMobile ? (lang === 'ar' ? 'يعمل فقط على أجهزة الكمبيوتر واللابتوب والتابلت' : 'Works only on PC, Laptop & Tablet') : undefined}
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10 text-xs sm:text-base md:text-lg flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap">
                  <Crown className={`w-4 h-4 sm:w-5 sm:h-5 ${isMobile ? 'text-slate-500' : 'text-amber-300'} shrink-0`} />
                  <span>النسخة الرسمية</span>
                </span>
              </button>
            </div>
            {isMobile && (
              <div 
                className="w-full max-w-sm sm:max-w-md mx-auto mt-3 sm:mt-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 border-2 border-amber-400/80 shadow-md shadow-amber-500/15 backdrop-blur-sm overflow-hidden relative flex items-center"
                dir="ltr"
              >
                <div className="w-full overflow-hidden relative flex items-center [container-type:inline-size] [mask-image:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]">
                  <div
                    className="inline-flex items-center gap-2 whitespace-nowrap animate-mobile-alert-marquee py-0.5"
                    dir="rtl"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="text-xs sm:text-sm font-black text-amber-200 tracking-wide leading-snug drop-shadow-sm whitespace-nowrap">
                      يعمل فقط على أجهزة الكمبيوتر واللابتوب والتابلت
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

        {/* Support Information & Developer Signature */}
        <div className="flex flex-col items-center gap-1 sm:gap-1.5 w-full mt-0.5 sm:mt-1">

          {/* Animated Light Line */}
          <div className="relative w-36 sm:w-48 md:w-64 h-[2px] bg-slate-900/20 overflow-hidden rounded-full hidden sm:block">
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
              className="absolute inset-y-0 w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent"
            />
          </div>

          <span className="bg-gradient-to-r from-white via-slate-400 to-white bg-[length:200%_auto] text-transparent bg-clip-text animate-shine text-[11px] sm:text-xs md:text-sm font-bold tracking-wider drop-shadow-md text-center whitespace-nowrap">
            Mahmoud Sallam : 01098594956 - 01131097055
          </span>
        </div>
      </div>
      </div>

      {/* نافذة تنبيه انتهاء الجلسة التجريبية */}
      <AnimatePresence>
        {showDayExpiredModal && (
          <motion.div
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
            dir="rtl"
          >
            <motion.div
              {...FAST_MODAL_FLIP}
              className="relative w-full max-w-md bg-white border-2 border-slate-900 rounded-[24px] shadow-2xl p-6 text-center flex flex-col items-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 border border-amber-300">
                <Clock className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2">
                النسخة التجريبية
              </h3>

              <p className="text-sm text-slate-700 leading-relaxed mb-4 font-semibold">
                عفواً، لا يمكن بدء جلسة جديدة حالياً.
                <br />
                يمكنك التفعيل للنسخة الرسمية الآن للعمل بدون توقف، أو المتابعة لاحقاً.
              </p>

              <div className="w-full flex flex-col gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDayExpiredModal(false);
                    handleOfficialClick();
                  }}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  الترقية والتفعيل للنسخة الرسمية الآن
                </button>

                <button
                  type="button"
                  onClick={() => setShowDayExpiredModal(false)}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* نافذة تنبيه انتهاء النسخة التجريبية */}
      <AnimatePresence>
        {showAllExpiredModal && (
          <motion.div
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
            dir="rtl"
          >
            <motion.div
              {...FAST_MODAL_FLIP}
              className="relative w-full max-w-md bg-white border-2 border-slate-900 rounded-[24px] shadow-2xl p-6 text-center flex flex-col items-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4 border border-rose-300">
                <AlertCircle className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2">
                النسخة التجريبية
              </h3>

              <p className="text-sm text-slate-700 leading-relaxed mb-4 font-semibold">
                عفواً ... انتهت صلاحية النسخة التجريبية.
              </p>

              <div className="w-full flex flex-col gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAllExpiredModal(false);
                    handleOfficialClick();
                  }}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-black rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  يمكنك استخدام النسخة الرسمية مجانا
                </button>

                <button
                  type="button"
                  onClick={() => setShowAllExpiredModal(false)}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-black/30 transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
