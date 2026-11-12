import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import { translations } from '../i18n';
import defaultIllustrationBg from '../assets/images/control_illustration_1786475473814.jpg';
import defaultBrandBg from '../assets/images/splash_brand_bg.jpg';
import modernControlBg from '../assets/images/smart_control_room_modern.jpg';
import blueShieldBg from '../assets/images/blue_shield_bg.jfif';
import goldShieldBg from '../assets/images/smart_control_gold_shield.jfif';
import cloudDashboardBg from '../assets/images/smart_control_cloud_dashboard.jfif';
import { getCachedSplashBackground } from '../utils/offlineAssetCache';
import { PasswordModal } from './PasswordModal';
import { isPaidUnlocked } from '../utils/activationManager';
import { useIsMobilePhone } from '../utils/deviceHelper';

import { Clock, AlertCircle, Crown, ArrowLeft, ArrowRight } from 'lucide-react';

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

const EgyptianSchoolsTitleEffect: React.FC = () => (
  <div 
    className="absolute z-10 pointer-events-none select-none overflow-visible"
    style={{
      left: '27.8%',
      top: '41.3%',
      width: '51.8%',
      height: '17.2%',
    }}
  >
    {/* 1. Luminous ambient glow breathing through the banner */}
    <motion.div
      animate={{
        opacity: [0.3, 0.8, 0.3],
        scaleY: [0.94, 1.06, 0.94],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent blur-md mix-blend-screen"
    />

    {/* 2. Sleek high-tech golden & cyan laser borders on top and bottom of the banner */}
    <div className="absolute top-0 inset-x-0 h-[2px] overflow-hidden">
      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
        className="w-full h-full bg-gradient-to-r from-transparent via-[#38bdf8] to-[#fbbf24] shadow-[0_0_8px_#38bdf8]"
      />
    </div>
    <div className="absolute bottom-0 inset-x-0 h-[2px] overflow-hidden">
      <motion.div
        animate={{ x: ['100%', '-100%'] }}
        transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
        className="w-full h-full bg-gradient-to-r from-transparent via-[#fbbf24] to-[#38bdf8] shadow-[0_0_8px_#fbbf24]"
      />
    </div>

    {/* 3. SVG Light Beam & Traveling Starburst Lens Flares across the text */}
    <svg
      viewBox="0 0 710 130"
      className="absolute inset-0 w-full h-full overflow-visible"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="egyptTitleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur2" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur3" />
          <feMerge>
            <feMergeNode in="blur3" />
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="laserBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
          <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="75%" stopColor="#fbbf24" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="starCoreRadial" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="25%" stopColor="#fef08a" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Traveling light streak along the text horizontal midline */}
      <line
        x1="25"
        y1="65"
        x2="685"
        y2="65"
        stroke="url(#laserBeamGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        filter="url(#egyptTitleGlow)"
        strokeDasharray="200 700"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="700; -700"
          dur="3.4s"
          repeatCount="indefinite"
        />
      </line>

      {/* Primary Radiant Diamond Starburst traveling across the words */}
      <g>
        <animate
          attributeName="transform"
          type="translate"
          values="685 65; 25 65; 685 65"
          dur="6.5s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
        />

        {/* Outer radial glow */}
        <circle r="38" fill="url(#starCoreRadial)" opacity="0.9" />
        <circle r="15" fill="#fbbf24" filter="url(#egyptTitleGlow)" opacity="0.95" />
        <circle r="6" fill="#ffffff" filter="url(#egyptTitleGlow)" />



        {/* Golden diagonal sparkle */}
        <polygon
          points="0,-20 3.5,-4 20,0 3.5,4 0,20 -3.5,4 -20,0 -3.5,-4"
          fill="#fef08a"
          opacity="0.9"
          transform="rotate(45)"
        />
      </g>
    </svg>

    {/* 4. Diagonal Metallic Light-Sheen Sweep across the letters */}
    <div 
      className="absolute inset-0 flex items-center justify-center mix-blend-overlay pointer-events-none overflow-hidden"
    >
      <motion.div
        animate={{
          x: ['-140%', '140%'],
        }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatDelay: 0.6,
        }}
        className="w-1/3 h-full bg-gradient-to-r from-transparent via-white/85 to-transparent skew-x-[-25deg] blur-[1.5px]"
      />
    </div>

    {/* 5. Floating Micro-Sparkle Particles rising gently from the text */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[
        { left: '18%', top: '25%', delay: '0s', dur: '2.5s', size: 6 },
        { left: '36%', top: '70%', delay: '0.9s', dur: '2.8s', size: 8 },
        { left: '54%', top: '20%', delay: '1.5s', dur: '2.3s', size: 7 },
        { left: '72%', top: '65%', delay: '0.4s', dur: '3.1s', size: 9 },
        { left: '88%', top: '30%', delay: '1.8s', dur: '2.7s', size: 6 },
      ].map((sparkle, idx) => (
        <motion.div
          key={idx}
          animate={{
            y: [0, -18, -35],
            opacity: [0, 1, 0],
            scale: [0.5, 1.3, 0.3],
          }}
          transition={{
            repeat: Infinity,
            duration: parseFloat(sparkle.dur),
            delay: parseFloat(sparkle.delay),
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: sparkle.left,
            top: sparkle.top,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
          }}
          className="rounded-full bg-gradient-to-br from-white via-amber-300 to-cyan-400 shadow-[0_0_10px_#38bdf8]"
        />
      ))}
    </div>
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
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showDayExpiredModal, setShowDayExpiredModal] = useState(false);
  const [showAllExpiredModal, setShowAllExpiredModal] = useState(false);
  const [isOfficialUnlocked, setIsOfficialUnlocked] = useState(() => isPaidUnlocked());
  const [blueShieldImg, setBlueShieldImg] = useState(blueShieldBg);
  const [illustrationImg, setIllustrationImg] = useState(defaultIllustrationBg);
  const [brandImg, setBrandImg] = useState(defaultBrandBg);
  const [modernControlImg, setModernControlImg] = useState(modernControlBg);
  const [goldShieldImg, setGoldShieldImg] = useState(goldShieldBg);
  const [cloudDashboardImg, setCloudDashboardImg] = useState(cloudDashboardBg);
  const [screenshotImg, setScreenshotImg] = useState('/assets/aistudio/ASD56565_2b16dafd.jfif');
  const [activeBgIndex, setActiveBgIndex] = useState(0);

  useEffect(() => {
    setIsOfficialUnlocked(isPaidUnlocked());

    // جلب وحفظ الصور على جهاز العميل في IndexedDB
    getCachedSplashBackground('blue_shield').then((url) => { if (url) setBlueShieldImg(url); });
    getCachedSplashBackground('illustration').then((url) => { if (url) setIllustrationImg(url); });
    getCachedSplashBackground('brand').then((url) => { if (url) setBrandImg(url); });
    getCachedSplashBackground('modern_control').then((url) => { if (url) setModernControlImg(url); });
    getCachedSplashBackground('gold_shield').then((url) => { if (url) setGoldShieldImg(url); });
    getCachedSplashBackground('cloud_dashboard').then((url) => { if (url) setCloudDashboardImg(url); });
    getCachedSplashBackground('screenshot').then((url) => { if (url) setScreenshotImg(url); });

    // تبديل خلفية الشاشة كل 5 ثوان بنعومة وسلاسة بين الصور السبع
    const interval = setInterval(() => {
      setActiveBgIndex((prev) => (prev + 1) % 7);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const isMobile = useIsMobilePhone();

  const handleOfficialClick = () => {
    if (isMobile) {
      return;
    }
    if (isPaidUnlocked()) {
      setIsOfficialUnlocked(true);
      onNext(false);
    } else {
      setIsPasswordModalOpen(true);
    }
  };

  const handleTrialClick = () => {
    if (isMobile) {
      return;
    }
    if (isOfficialUnlocked) return;
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

  const handleUnlockSuccess = () => {
    setIsOfficialUnlocked(true);
    setIsPasswordModalOpen(false);
    onNext(false);
  };

  return (
    <div className="w-full h-[100dvh] flex flex-col justify-between items-center overflow-hidden bg-slate-900">

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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, x: -100, scale: 0.9 }}
          transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
          className="w-full max-w-[340px] sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl aspect-[16/16] sm:aspect-[16/11] max-h-[50vh] sm:max-h-[60vh] relative p-[3px] sm:p-[6px] md:p-[8px] rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-2xl shrink-1 flex items-center justify-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-[conic-gradient(transparent_270deg,#ffffff_360deg)]"
          />
          
          <div className="relative rounded-[1.2rem] sm:rounded-[1.8rem] md:rounded-[2.2rem] overflow-hidden border-[2px] sm:border-[3px] border-black w-full h-full flex flex-col">
          <div 
            className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"
          />
        
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center overflow-hidden">
            {/* 1. Blue Shield Image (الصورة الأولى - الدرع الأزرق وشعار SMART CONTROL) */}
            <div 
              className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={blueShieldImg}
                  alt="Smart Control Blue Shield"
                  className="w-full h-full object-fill pointer-events-none select-none"
                />
                <PrecisionLightOverlay />
              </div>
            </div>

            {/* 2. Illustration Image (الصورة الثانية - التوضيحية لنظام الكنترول الذكي) */}
            <div 
              className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img
                src={illustrationImg}
                alt="Smart Control Illustration"
                className="w-full h-full object-fill pointer-events-none select-none"
              />
            </div>

            {/* 3. Brand Shield Image (الصورة الثالثة - صورة الشعار الأرجوانية/المخملية) */}
            <div 
              className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={brandImg}
                  alt="Smart Control Logo"
                  className="w-full h-full object-fill pointer-events-none select-none"
                />
                <PrecisionLightOverlay />
              </div>
            </div>

            {/* 4. Modern Control Room Image (الصورة الرابعة - غرفة الكنترول الذكية الحديثة مع زيادة الوضوح والدقة) */}
            <div 
              className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 3 ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img
                src={modernControlImg}
                alt="Modern Smart Control Room"
                className="w-full h-full object-fill pointer-events-none select-none contrast-[1.12] saturate-[1.08] brightness-[1.03]"
                style={{ imageRendering: 'high-quality' }}
              />
            </div>

            {/* 5. Gold Shield Image (الصورة الخامسة - الدرع الذهبي وشعار SMART CONTROL Examination Management) */}
            <div 
              className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 4 ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={goldShieldImg}
                  alt="Smart Control Gold Shield Examination Management"
                  className="w-full h-full object-fill pointer-events-none select-none contrast-[1.08] brightness-[1.02]"
                  style={{ imageRendering: 'high-quality' }}
                />
                <PrecisionLightOverlay />
              </div>
            </div>

            {/* 6. Cloud Dashboard Image (الصورة السادسة - التحول الرقمي من إكسيل إلى الكنترول السحابي الذكي) */}
            <div 
              className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 5 ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img
                src={cloudDashboardImg}
                alt="Smart Control Cloud Dashboard vs Excel"
                className="w-full h-full object-fill pointer-events-none select-none contrast-[1.08] saturate-[1.05] brightness-[1.02]"
                style={{ imageRendering: 'high-quality' }}
              />
            </div>

            {/* 7. New Screenshot (الصورة السابعة - المرفقة) */}
            <div 
              className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${
                activeBgIndex === 6 ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={screenshotImg}
                  alt="New Screenshot"
                  className="w-full h-full object-fill pointer-events-none select-none"
                  style={{ imageRendering: 'high-quality' }}
                />
                <EgyptianSchoolsTitleEffect />
              </div>
            </div>

            {/* Subtle Dark Overlay to preserve text contrast & depth */}
            <div className="absolute inset-0 z-0 bg-slate-900/15 backdrop-blur-[0.5px] pointer-events-none" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="flex flex-col items-center gap-1.5 sm:gap-2.5 w-full shrink-0"
      >
        {isOfficialUnlocked ? (
          <div className="flex flex-col items-center justify-center w-full px-4 gap-1.5">
            <motion.button
              whileHover={{ scale: isMobile ? 1 : 1.08 }}
              whileTap={{ scale: isMobile ? 1 : 0.95 }}
              type="button"
              onClick={() => {
                if (isMobile) {
                  return;
                }
                onNext(false);
              }}
              className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center bg-gradient-to-r from-[#a855f7] via-[#6366f1] to-[#3b82f6] text-white shadow-[0_10px_25px_-5px_rgba(168,85,247,0.6)] border-2 border-black group transition-all relative overflow-hidden ${
                isMobile ? 'opacity-60 cursor-not-allowed' : 'hover:from-[#9333ea] hover:via-[#4f46e5] hover:to-[#2563eb] cursor-pointer'
              }`}
              title={isMobile ? (lang === 'ar' ? 'يعمل فقط على أجهزة الكمبيوتر واللابتوب والتابلت' : 'Works only on PC, Laptop & Tablet') : (lang === 'ar' ? 'الدخول إلى التطبيق' : 'Enter application')}
              aria-label={lang === 'ar' ? 'الدخول إلى التطبيق' : 'Enter application'}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
              {lang === 'ar' ? (
                <ArrowLeft className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 relative z-10 transition-transform group-hover:-translate-x-1 drop-shadow-md" />
              ) : (
                <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 relative z-10 transition-transform group-hover:translate-x-1 drop-shadow-md" />
              )}
            </motion.button>
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
        ) : (
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
        )}

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
      </motion.div>
      </div>

      {/* نافذة تنبيه انتهاء الجلسة التجريبية */}
      <AnimatePresence>
        {showDayExpiredModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
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
          </div>
        )}
      </AnimatePresence>

      {/* نافذة تنبيه انتهاء النسخة التجريبية */}
      <AnimatePresence>
        {showAllExpiredModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="relative w-full max-w-md bg-white border-2 border-slate-900 rounded-[24px] shadow-2xl p-6 text-center flex flex-col items-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4 border border-rose-300">
                <AlertCircle className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2">
                النسخة التجريبية
              </h3>

              <p className="text-sm text-slate-700 leading-relaxed mb-4 font-semibold">
                عفواً، انتهت النسخة التجريبية.
                <br />
                يرجى التفعيل للنسخة الرسمية لمتابعة العمل واستخدام كافة مزايا التطبيق.
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
                  تفعيل النسخة الرسمية الآن
                </button>

                <button
                  type="button"
                  onClick={() => setShowAllExpiredModal(false)}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handleUnlockSuccess}
      />
    </div>
  );
};
