import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FAST_SCREEN_FLIP, FAST_MODAL_FLIP, FAST_BACKDROP_FADE } from '../utils/flipAnimation';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, User } from 'firebase/auth';
import { AlertCircle } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { AnimatedBackground } from './AnimatedBackground';

const loginLogoDefaultUrl = '/pwa-256x256.png';
const loginPortraitFallbackUrl = '/assets/aistudio/Screenshot_12_bc36452f.jpg';

const PLANT_ROSES = [
  { id: 'rose-top', x: 374, y: 282, baseRotate: -8, scale: 0.94, duration: 5.6, delay: 0 },
  { id: 'rose-left', x: 352, y: 308, baseRotate: -16, scale: 1.04, duration: 6.4, delay: 1.1 },
  { id: 'rose-right', x: 401, y: 304, baseRotate: 14, scale: 0.98, duration: 6.0, delay: 2.2 },
];

const BUTTERFLY_CYCLE_DURATION = 22;
const BUTTERFLY_REPEAT_DELAY = 2.0;

function buildWingKeyframes(sign: 1 | -1) {
  const times: number[] = [];
  const scaleX: number[] = [];
  const skewY: number[] = [];

  // Phase 1: Flying in smoothly (t = 0.00 -> 0.40)
  const flyInSteps = 22;
  for (let i = 0; i <= flyInSteps; i++) {
    const t = (i / flyInSteps) * 0.40;
    const isUp = i % 2 === 1;
    times.push(Number(t.toFixed(4)));
    scaleX.push(isUp ? 0.28 : 1);
    skewY.push(isUp ? 8 * sign : 0);
  }

  // Phase 2: Perched softly on the top rose (t = 0.43 -> 0.65) with slow gentle wing breathing
  const restFrames = [
    { t: 0.43, sx: 0.46, sy: 5 * sign },
    { t: 0.49, sx: 0.84, sy: 1.5 * sign },
    { t: 0.55, sx: 0.36, sy: 6.5 * sign },
    { t: 0.60, sx: 0.80, sy: 2 * sign },
    { t: 0.65, sx: 0.42, sy: 5.5 * sign },
  ];
  for (const frame of restFrames) {
    times.push(frame.t);
    scaleX.push(frame.sx);
    skewY.push(frame.sy);
  }

  // Phase 3: Lifting off and flying out smoothly (t = 0.68 -> 1.00)
  const flyOutSteps = 18;
  for (let i = 0; i <= flyOutSteps; i++) {
    const t = 0.68 + (i / flyOutSteps) * 0.32;
    const isUp = i % 2 === 1;
    times.push(Number(t.toFixed(4)));
    scaleX.push(isUp ? 0.28 : 1);
    skewY.push(isUp ? 8 * sign : 0);
  }

  return { times, scaleX, skewY };
}

const LEFT_WING_KF = buildWingKeyframes(1);
const RIGHT_WING_KF = buildWingKeyframes(-1);

interface LoginScreenProps {
  onSuccess?: (user: User) => void;
  onContinueWithoutAccount?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onContinueWithoutAccount }) => {
  const [logoSrc, setLogoSrc] = useState<string>(loginLogoDefaultUrl);
  const [portraitSrc, setPortraitSrc] = useState<string>(loginPortraitFallbackUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [offlineBootCount, setOfflineBootCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('smart_control_offline_boot_count') || '0', 10);
  });
  const [showMandatoryUpdateModal, setShowMandatoryUpdateModal] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      localStorage.setItem('smart_control_offline_boot_count', '0');
      setOfflineBootCount(0);
      setShowMandatoryUpdateModal(false);
    };

    window.addEventListener('online', handleOnline);

    const isOnline = navigator.onLine;
    if (isOnline) {
      localStorage.setItem('smart_control_offline_boot_count', '0');
      setOfflineBootCount(0);
      setShowMandatoryUpdateModal(false);
    } else {
      const countedThisSession = sessionStorage.getItem('smart_control_offline_boot_counted');
      if (!countedThisSession) {
        sessionStorage.setItem('smart_control_offline_boot_counted', 'true');
        const currentCount = parseInt(localStorage.getItem('smart_control_offline_boot_count') || '0', 10) + 1;
        localStorage.setItem('smart_control_offline_boot_count', currentCount.toString());
        setOfflineBootCount(currentCount);
        if (currentCount >= 15) {
          setShowMandatoryUpdateModal(true);
        }
      } else {
        const currentCount = parseInt(localStorage.getItem('smart_control_offline_boot_count') || '0', 10);
        if (currentCount >= 15) {
          setShowMandatoryUpdateModal(true);
        }
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    // Check redirect result for desktop PWA standalone mode
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user && onSuccess) {
          onSuccess(result.user);
        }
      })
      .catch((err) => {
        console.warn('Redirect auth warning:', err);
      });
  }, [onSuccess]);

  const handleImageError = () => {
    if (logoSrc === loginLogoDefaultUrl) {
      setLogoSrc('/brand_shield.png');
    } else if (logoSrc !== '/pwa-192x192.png') {
      setLogoSrc('/pwa-192x192.png');
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    if (!navigator.onLine && offlineBootCount >= 15) {
      setShowMandatoryUpdateModal(true);
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      if (isStandalone) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      const result = await signInWithPopup(auth, googleProvider);
      if (onSuccess && result.user) {
        onSuccess(result.user);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMsg('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية. يرجى المحاولة مرة أخرى.');
      } else if (code === 'auth/popup-blocked' || code === 'auth/operation-not-allowed') {
        // Fallback to redirect when popup blocked or not allowed in desktop PWA
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          setErrorMsg('المتصفح منع فتح نافذة تسجيل الدخول. يرجى السماح بالنوافذ المنبثقة أو استخدام المتابعة بدون حساب.');
        }
      } else if (code === 'auth/network-request-failed') {
        setErrorMsg('تعذر الاتصال بالإنترنت. يرجى التحقق من الشبكة والمحاولة مرة أخرى.');
      } else {
        // Try redirect fallback for desktop app / PWA environments
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          setErrorMsg('تعذر إتمام تسجيل الدخول حالياً. يرجى المحاولة مرة أخرى أو استخدام المتابعة بدون حساب.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);
    if (!emailInput.trim() || !passwordInput.trim()) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني (أو اسم المستخدم) وكلمة المرور.');
      return;
    }
    setIsLoading(true);
    try {
      const emailVal = emailInput.includes('@') ? emailInput : `${emailInput.trim()}@smartcontrol.edu`;
      let result;
      if (isRegisterMode) {
        result = await createUserWithEmailAndPassword(auth, emailVal, passwordInput);
      } else {
        result = await signInWithEmailAndPassword(auth, emailVal, passwordInput);
      }
      if (onSuccess && result.user) {
        onSuccess(result.user);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setErrorMsg('خدمة البريد وكلمة المرور غير مفعلة في لوحة تحكم Firebase. يرجى تفعيلها من Authentication > Sign-in method.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg('البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول أو استخدام بريد آخر.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('كلمة المرور ضعيفة جداً. يرجى استخدام 6 أحرف على الأقل.');
      } else if (code === 'auth/invalid-email' || code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMsg('بيانات الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور.');
      } else {
        setErrorMsg('تعذر إتمام العملية. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-center p-2 sm:p-4 md:p-5 relative overflow-x-hidden overflow-y-auto [color-scheme:light_only]"
    >
      <AnimatedBackground />

      <motion.div
        {...FAST_SCREEN_FLIP}
        className="relative z-10 w-full md:max-w-[920px] lg:max-w-[1074px] my-auto"
      >
        {/* Clipped Luminous Frame & Split Card */}
        <div className="relative w-full p-[3px] rounded-[32px] overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)]">
          {/* Animated Luminous Border */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 14, ease: 'linear' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] aspect-square bg-[conic-gradient(from_0deg_at_50%_50%,#fbbf24_0deg,#3b82f6_90deg,#a855f7_180deg,#06b6d4_270deg,#fbbf24_360deg)] opacity-85 pointer-events-none"
          />

          {/* Split Hero Card Container */}
          <div className="relative z-10 w-full bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#090d16] rounded-[29px] overflow-hidden border border-slate-800/80 grid grid-cols-1 md:grid-cols-[45%_55%]">
            {/* Right Column (RTL - 45%): Portrait Strictly Inside Frame */}
            <div className="relative h-[242px] sm:h-[274px] md:h-full md:min-h-[593px] overflow-hidden bg-[#040507]">
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
                className="relative w-full h-full origin-center will-change-transform select-none pointer-events-none"
              >
                <img
                  src={portraitSrc}
                  alt="مرحباً بك في منظومة الكنترول الذكي"
                  fetchPriority="high"
                  loading="eager"
                  decoding="sync"
                  onError={() => {
                    if (portraitSrc !== loginPortraitFallbackUrl) {
                      setPortraitSrc(loginPortraitFallbackUrl);
                    }
                  }}
                  className="w-full h-full object-cover object-center block"
                />
                <svg
                  viewBox="0 0 470 640"
                  preserveAspectRatio="xMidYMid slice"
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full block pointer-events-none"
                >
                  <defs>
                    <radialGradient id="roseOuterGrad" cx="42%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="55%" stopColor="#dc2626" />
                      <stop offset="100%" stopColor="#7f1d1d" />
                    </radialGradient>
                    <radialGradient id="roseInnerGrad" cx="40%" cy="32%" r="65%">
                      <stop offset="0%" stopColor="#f87171" />
                      <stop offset="45%" stopColor="#b91c1c" />
                      <stop offset="100%" stopColor="#6b1010" />
                    </radialGradient>
                    <filter id="roseShadow" x="-40%" y="-40%" width="180%" height="180%">
                      <feDropShadow dx="0" dy="1.8" stdDeviation="1.4" floodColor="#091a0d" floodOpacity="0.65" />
                    </filter>
                    <linearGradient id="butterflyWingUpperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="35%" stopColor="#fb923c" />
                      <stop offset="75%" stopColor="#dc2626" />
                      <stop offset="100%" stopColor="#450a0a" />
                    </linearGradient>
                    <linearGradient id="butterflyWingLowerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fde047" />
                      <stop offset="50%" stopColor="#ea580c" />
                      <stop offset="100%" stopColor="#7f1d1d" />
                    </linearGradient>
                    <filter id="butterflyShadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="1.5" dy="3.5" stdDeviation="2.2" floodColor="#0f172a" floodOpacity="0.45" />
                    </filter>
                  </defs>

                  {/* 3 Slow-Fluttering Red Roses on the Classroom Plant */}
                  {PLANT_ROSES.map((rose) => (
                    <g
                      key={rose.id}
                      transform={`translate(${rose.x}, ${rose.y}) scale(${rose.scale})`}
                      filter="url(#roseShadow)"
                    >
                      <motion.g
                        style={{ transformOrigin: '0px 8px' }}
                        animate={{
                          rotate: [
                            rose.baseRotate - 5,
                            rose.baseRotate + 6,
                            rose.baseRotate - 3,
                            rose.baseRotate + 5,
                            rose.baseRotate - 5,
                          ],
                          x: [0, 1.1, -0.7, 0.8, 0],
                          y: [0, -0.9, 0.4, -0.6, 0],
                          scaleX: [1, 0.94, 1.03, 0.96, 1],
                          scaleY: [1, 1.03, 0.98, 1.02, 1],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: rose.duration,
                          delay: rose.delay,
                          ease: 'easeInOut',
                        }}
                      >
                        {/* Tiny Green Sepals / Leaves */}
                        <path d="M-2,6 Q-7,8 -6,3 Q-3,4 -1,5 Z" fill="#1e5128" />
                        <path d="M2,6 Q7,7.5 6,3 Q3,4 1,5 Z" fill="#245c2e" />
                        <path d="M0,7 L0,11" stroke="#1b4322" strokeWidth="1.4" strokeLinecap="round" />

                        {/* Outer Velvety Petals */}
                        <motion.g
                          style={{ transformOrigin: '0px 0px' }}
                          animate={{
                            rotate: [-3, 4, -2, 3, -3],
                            scale: [1, 1.04, 0.98, 1.03, 1],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: rose.duration * 0.85,
                            delay: rose.delay + 0.3,
                            ease: 'easeInOut',
                          }}
                        >
                          <path
                            d="M0,-9 C5.5,-9 9.5,-5 8.5,0.5 C9.5,5.5 4.5,8.5 0,7.5 C-4.5,8.5 -9.5,5.5 -8.5,0.5 C-9.5,-5 -5.5,-9 0,-9 Z"
                            fill="url(#roseOuterGrad)"
                          />
                          <path
                            d="M-6.5,-4.5 C-2,-7.5 3.5,-7 6.5,-3.5 C8,0 6,4.5 2,5.5 C-3,6 -7.5,2.5 -6.5,-4.5 Z"
                            fill="#dc2626"
                            opacity="0.88"
                          />
                        </motion.g>

                        {/* Inner Cupped Petals & Swirl */}
                        <motion.g
                          style={{ transformOrigin: '0px 0px' }}
                          animate={{
                            rotate: [2, -4, 3, -2, 2],
                            scale: [1, 0.97, 1.04, 0.99, 1],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: rose.duration * 0.75,
                            delay: rose.delay + 0.6,
                            ease: 'easeInOut',
                          }}
                        >
                          <circle cx="0" cy="-0.5" r="5" fill="url(#roseInnerGrad)" />
                          <path
                            d="M-3.5,-1.5 C-2.5,-4.5 2.5,-4.5 3.5,-1.5 C4,1.5 1.5,3.5 -1,3 C-3,2.5 -3.5,0.5 -2,-1 C-1,-2.2 1.5,-2 2,-0.5 C2.2,0.8 0.5,1.6 -0.5,1"
                            fill="none"
                            stroke="#7f1d1d"
                            strokeWidth="1.05"
                            strokeLinecap="round"
                          />
                          {/* Sunlit Rim Highlight */}
                          <path
                            d="M-4.5,-5.5 C-1.5,-7.5 2.5,-7.2 4.8,-5"
                            fill="none"
                            stroke="#fca5a5"
                            strokeWidth="0.9"
                            strokeLinecap="round"
                            opacity="0.85"
                          />
                        </motion.g>
                      </motion.g>
                    </g>
                  ))}

                  {/* Graceful Butterfly: Enters Smoothly, Perches Briefly on Top Rose, Then Flies Away */}
                  <motion.g
                    filter="url(#butterflyShadow)"
                    initial={{ x: -36, y: 178, rotate: 18, scale: 0.425, opacity: 0 }}
                    animate={{
                      x: [-36, 92, 245, 354, 374, 375, 374, 394, 438, 506],
                      y: [178, 208, 258, 272, 278, 277, 278, 254, 204, 168],
                      rotate: [18, 20, 14, 6, -10, -6, -12, -22, -20, -16],
                      scale: [0.425, 0.49, 0.52, 0.47, 0.43, 0.43, 0.43, 0.46, 0.44, 0.41],
                      opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      repeatDelay: BUTTERFLY_REPEAT_DELAY,
                      duration: BUTTERFLY_CYCLE_DURATION,
                      times: [0, 0.08, 0.24, 0.36, 0.42, 0.54, 0.65, 0.72, 0.86, 1],
                      ease: 'easeInOut',
                    }}
                  >
                    {/* Left Wing (pivots at its right edge inside the body) */}
                    <motion.g
                      style={{ originX: 1, originY: 0.5 }}
                      animate={{ scaleX: LEFT_WING_KF.scaleX, skewY: LEFT_WING_KF.skewY }}
                      transition={{
                        repeat: Infinity,
                        repeatDelay: BUTTERFLY_REPEAT_DELAY,
                        duration: BUTTERFLY_CYCLE_DURATION,
                        times: LEFT_WING_KF.times,
                        ease: 'easeInOut',
                      }}
                    >
                      {/* Upper Left Wing */}
                      <path
                        d="M0,-2 C-8,-15 -22,-18 -23,-7 C-24,0 -15,4 0,2 Z"
                        fill="url(#butterflyWingUpperGrad)"
                        stroke="#1c1917"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M-2,-2 C-8,-9 -16,-11 -18,-5"
                        fill="none"
                        stroke="#451a03"
                        strokeWidth="0.7"
                        opacity="0.75"
                      />
                      <circle cx="-18" cy="-10" r="1.1" fill="#ffffff" opacity="0.9" />
                      <circle cx="-20.5" cy="-6" r="0.85" fill="#ffffff" opacity="0.85" />
                      {/* Lower Left Wing */}
                      <path
                        d="M0,2 C-12,3 -18,10 -12,15 C-7,19 -1,13 0,5 Z"
                        fill="url(#butterflyWingLowerGrad)"
                        stroke="#1c1917"
                        strokeWidth="1.1"
                      />
                      <circle cx="-11.5" cy="12" r="0.8" fill="#fef9c3" opacity="0.85" />
                    </motion.g>

                    {/* Right Wing (pivots at its left edge inside the body) */}
                    <motion.g
                      style={{ originX: 0, originY: 0.5 }}
                      animate={{ scaleX: RIGHT_WING_KF.scaleX, skewY: RIGHT_WING_KF.skewY }}
                      transition={{
                        repeat: Infinity,
                        repeatDelay: BUTTERFLY_REPEAT_DELAY,
                        duration: BUTTERFLY_CYCLE_DURATION,
                        times: RIGHT_WING_KF.times,
                        ease: 'easeInOut',
                      }}
                    >
                      {/* Upper Right Wing */}
                      <path
                        d="M0,-2 C8,-15 22,-18 23,-7 C24,0 15,4 0,2 Z"
                        fill="url(#butterflyWingUpperGrad)"
                        stroke="#1c1917"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M2,-2 C8,-9 16,-11 18,-5"
                        fill="none"
                        stroke="#451a03"
                        strokeWidth="0.7"
                        opacity="0.75"
                      />
                      <circle cx="18" cy="-10" r="1.1" fill="#ffffff" opacity="0.9" />
                      <circle cx="20.5" cy="-6" r="0.85" fill="#ffffff" opacity="0.85" />
                      {/* Lower Right Wing */}
                      <path
                        d="M0,2 C12,3 18,10 12,15 C7,19 1,13 0,5 Z"
                        fill="url(#butterflyWingLowerGrad)"
                        stroke="#1c1917"
                        strokeWidth="1.1"
                      />
                      <circle cx="11.5" cy="12" r="0.8" fill="#fef9c3" opacity="0.85" />
                    </motion.g>

                    {/* Butterfly Body & Antennae */}
                    <ellipse cx="0" cy="2" rx="1.8" ry="7.6" fill="#1c1917" />
                    <circle cx="0" cy="-6" r="1.7" fill="#292524" />
                    <path
                      d="M-0.6,-7.2 Q-3.5,-12 -6,-13"
                      fill="none"
                      stroke="#1c1917"
                      strokeWidth="0.7"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0.6,-7.2 Q3.5,-12 6,-13"
                      fill="none"
                      stroke="#1c1917"
                      strokeWidth="0.7"
                      strokeLinecap="round"
                    />
                    <circle cx="-6" cy="-13" r="0.65" fill="#fbbf24" />
                    <circle cx="6" cy="-13" r="0.65" fill="#fbbf24" />
                  </motion.g>
                </svg>
              </motion.div>

              {/* Seamless Left-Edge Blend into Dark Card Column */}
              <div className="hidden md:block absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/35 to-transparent pointer-events-none" />
              <div className="hidden md:block absolute inset-y-6 left-0 w-[3px] bg-gradient-to-b from-transparent via-amber-400 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.8)] pointer-events-none" />
              {/* Soft Bottom Blend Vignette */}
              <div className="absolute inset-x-0 bottom-0 h-14 md:h-24 bg-gradient-to-t from-[#090d16]/85 via-[#090d16]/25 to-transparent pointer-events-none" />
            </div>

          {/* Left Column (RTL): Brand & Actions Panel */}
          <div className="min-w-0 px-4 py-6 sm:p-6 md:p-8 lg:p-10 flex flex-col items-center justify-center text-center">
            {/* Glowing Floating App Logo */}
            <motion.div
              animate={{
                y: [0, -6, 0],
                scale: [1, 1.03, 1],
              }}
              transition={{
                y: { repeat: Infinity, duration: 4, ease: 'easeInOut' },
                scale: { repeat: Infinity, duration: 4, ease: 'easeInOut' },
              }}
              className="relative mb-4 md:mb-5 will-change-transform drop-shadow-[0_0_14px_rgba(251,191,36,0.45)]"
            >
              <div className="w-[84px] h-[84px] sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl md:rounded-3xl bg-gradient-to-br from-slate-800/90 to-slate-950/90 border-2 border-amber-400/50 flex items-center justify-center p-2.5 md:p-3.5 shadow-2xl">
                <img
                  src={logoSrc}
                  alt="Smart Control Logo"
                  onError={handleImageError}
                  className="w-full h-full object-contain select-none pointer-events-none"
                />
              </div>
              <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full -z-10 animate-pulse" />
            </motion.div>

          {/* App Brand Title */}
          <h1 className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400 drop-shadow-sm">
            SMART CONTROL 0.1
          </h1>

          {/* Luminous Divider */}
          <div className="w-4/5 h-[2px] bg-slate-800 rounded-full overflow-hidden my-2.5 md:my-3">
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              className="w-full h-full bg-gradient-to-r from-transparent via-amber-400 to-transparent"
            />
          </div>

          <h2 className="text-[13px] sm:text-xl font-extrabold text-white mt-0.5 md:mt-1 leading-snug">
            <span className="hidden md:inline">مرحباً بك في منظومة الكنترول الذكي</span>
            <span className="block mt-0 md:mt-1 text-sm sm:text-base font-bold text-amber-300">
              لإدارة أعمال إمتحانات المدارس المصرية
            </span>
          </h2>
          <div className="hidden md:block my-3">
            <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] animate-pulse">
              2027 - 2026
            </span>
          </div>
          <p className="mt-1 text-[11px] sm:text-xs md:text-sm text-slate-300 font-bold tracking-wide">
            لجميع المدارس الرسمية والخاصة والدولية
          </p>

          <motion.span
            animate={{ backgroundPosition: ['220% center', '-220% center'] }}
            transition={{ repeat: Infinity, duration: 6.5, ease: 'linear' }}
            className="mt-1.5 md:mt-2.5 text-xs sm:text-sm md:text-base font-extrabold leading-relaxed tracking-wide text-transparent bg-clip-text bg-[linear-gradient(110deg,#fde68a_0%,#ffffff_30%,#fbbf24_55%,#ffffff_78%,#fde68a_100%)] bg-[length:220%_auto] select-none"
          >
            مجانى وسيبقى مجانى
          </motion.span>

          {/* Error Alert */}
          {errorMsg && (
            <div className="w-full mt-3 mb-1.5 md:mt-5 md:mb-2 h-14 px-4 rounded-2xl bg-rose-500/20 border border-rose-500/60 text-rose-200 text-xs font-bold flex items-center justify-center gap-2 text-center">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Divider Line Above Buttons */}
          <div className="w-full h-[2px] bg-slate-700/80 rounded-full overflow-hidden mt-4 mb-3.5 md:mt-6 md:mb-5">
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
              className="w-full h-full bg-gradient-to-r from-transparent via-amber-400/80 to-transparent"
            />
          </div>

          {/* Action Buttons Row: App Tutorial (Right) + Continue (Left) */}
          <div className="w-full grid grid-cols-2 gap-3">
            <a
              href="https://youtube.com/playlist?list=PLCwlGOLf0Pec&si=6d9RhP0T6gWZKsAx"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="شرح التطبيق"
              title="شرح التطبيق"
              className="w-full h-12 md:h-14 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white font-bold text-sm border border-white/85 hover:border-white flex items-center justify-center gap-2.5 shadow-[0_6px_20px_-4px_rgba(220,38,38,0.5)] transition-all active:scale-[0.98] cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="w-[43.1px] h-[45px] shrink-0"
              >
                <path
                  fill="#ffffff"
                  d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
                />
                <path fill="#dc2626" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span className="hidden sm:inline">شرح التطبيق</span>
            </a>

            <button
              type="button"
              onClick={() => {
                if (!navigator.onLine && offlineBootCount >= 15) {
                  setShowMandatoryUpdateModal(true);
                  return;
                }
                onContinueWithoutAccount?.();
              }}
              disabled={isLoading}
              className="w-full h-12 md:h-14 rounded-2xl bg-slate-800/85 hover:bg-slate-700/90 text-slate-200 hover:text-white font-bold text-[1.05rem] border border-white/85 hover:border-white flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <span>متابعة</span>
            </button>
          </div>
          </div>
        </div>
        </div>
      </motion.div>

      {/* Developer Contact Under Login Window */}
      <div className="relative z-10 mt-2 md:mt-4 text-center select-none">
        <p className="text-xs sm:text-sm font-bold text-amber-300 tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
          Mahmoud Sallam : 01098594956 - 01131097055
        </p>
      </div>

      <AnimatePresence>
        {showMandatoryUpdateModal && (
          <motion.div
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
            dir="rtl"
          >
            <motion.div
              {...FAST_MODAL_FLIP}
              className="bg-slate-900 border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <AlertCircle className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">تحديث مطلوب</h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-semibold">
                يجب تشغيل الانترنت لتحديث التطبيق .. تلقائيا
              </p>
              <button
                type="button"
                onClick={() => {
                  if (navigator.onLine) {
                    localStorage.setItem('smart_control_offline_boot_count', '0');
                    setOfflineBootCount(0);
                    setShowMandatoryUpdateModal(false);
                  } else {
                    alert('لا يوجد اتصال بالإنترنت حالياً. يرجى توصيل الإنترنت لإتمام التحديث والمتابعة.');
                  }
                }}
                className="w-full mt-2 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-lg transition-all cursor-pointer"
              >
                حسنا
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
