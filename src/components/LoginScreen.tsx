import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, User } from 'firebase/auth';
import { AlertCircle } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { AnimatedBackground } from './AnimatedBackground';
import { getBrandShieldSync, getCachedBrandShield } from '../utils/offlineAssetCache';
import loginGirlPortrait from '../assets/images/login_girl_popout_1795289770176.jpg';

function buildPopoutArmCutout(img: HTMLImageElement): string | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const minX = Math.floor(w * 0.62);
  const fadeEndX = Math.floor(w * 0.69);
  const fadeStartY = Math.floor(h * 0.66);
  const maxY = Math.floor(h * 0.72);

  const isBgCandidate = (idx: number): boolean => {
    const o = idx * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const maxC = r > g ? (r > b ? r : b) : (g > b ? g : b);
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const isSkinWarm = r - b >= 14 && r > 52;
    return !isSkinWarm && luma < 52 && maxC < 64;
  };

  const total = w * h;
  const visited = new Uint8Array(total);
  const isExteriorBg = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const tryEnqueue = (x: number, y: number) => {
    if (x < minX || x >= w || y < 0 || y >= maxY) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    if (isBgCandidate(idx)) {
      isExteriorBg[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let y = 0; y < maxY; y++) {
    tryEnqueue(w - 1, y);
  }
  for (let x = minX; x < w; x++) {
    tryEnqueue(x, 0);
    tryEnqueue(x, maxY - 1);
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx - x) / w;
    if (x + 1 < w) tryEnqueue(x + 1, y);
    if (x - 1 >= minX) tryEnqueue(x - 1, y);
    if (y + 1 < maxY) tryEnqueue(x, y + 1);
    if (y - 1 >= 0) tryEnqueue(x, y - 1);
  }

  const nearBgDist = new Uint8Array(total);
  for (let y = 2; y < maxY - 2; y++) {
    for (let x = minX + 2; x < w - 2; x++) {
      const idx = y * w + x;
      if (isExteriorBg[idx]) continue;
      if (
        isExteriorBg[idx - 1] ||
        isExteriorBg[idx + 1] ||
        isExteriorBg[idx - w] ||
        isExteriorBg[idx + w]
      ) {
        nearBgDist[idx] = 1;
      } else if (
        isExteriorBg[idx - 2] ||
        isExteriorBg[idx + 2] ||
        isExteriorBg[idx - w * 2] ||
        isExteriorBg[idx + w * 2]
      ) {
        nearBgDist[idx] = 2;
      }
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const o = idx * 4;
      if (x < minX || y >= maxY || isExteriorBg[idx]) {
        data[o + 3] = 0;
        continue;
      }

      let alpha = 255;
      if (x < fadeEndX) {
        alpha = Math.min(alpha, Math.round(((x - minX) / (fadeEndX - minX)) * 255));
      }
      if (y > fadeStartY) {
        alpha = Math.min(alpha, Math.round(((maxY - y) / (maxY - fadeStartY)) * 255));
      }

      if (nearBgDist[idx] === 1) {
        const luma = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
        if (luma < 62) {
          alpha = Math.min(alpha, Math.round((luma / 62) * 120));
        } else {
          alpha = Math.min(alpha, 210);
        }
      } else if (nearBgDist[idx] === 2) {
        const luma = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
        if (luma < 52) {
          alpha = Math.min(alpha, 195);
        }
      }

      data[o + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

interface LoginScreenProps {
  onSuccess?: (user: User) => void;
  onContinueWithoutAccount?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onContinueWithoutAccount }) => {
  const [logoSrc, setLogoSrc] = useState<string>(() => getBrandShieldSync());
  const [popoutArmSrc, setPopoutArmSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      try {
        const cutout = buildPopoutArmCutout(img);
        if (cutout) setPopoutArmSrc(cutout);
      } catch (err) {
        console.warn('Popout cutout fallback:', err);
      }
    };
    img.src = loginGirlPortrait;
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getCachedBrandShield().then((cached) => {
      if (active && cached) {
        setLogoSrc(cached);
      }
    });

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

    return () => {
      active = false;
    };
  }, [onSuccess]);

  const handleImageError = () => {
    if (logoSrc !== '/brand_shield.png' && !logoSrc.startsWith('data:image/')) {
      setLogoSrc('/brand_shield.png');
    } else if (logoSrc !== '/pwa-192x192.png') {
      setLogoSrc('/pwa-192x192.png');
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoading) return;
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
      className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden overflow-y-auto [color-scheme:light_only]"
    >
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, type: 'spring', bounce: 0.25 }}
        className="relative z-10 w-full md:max-w-[calc(100%-6.5rem)] lg:max-w-4xl my-auto overflow-visible"
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
          <div className="relative z-10 w-full bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#090d16] rounded-[29px] overflow-hidden border border-slate-800/80 grid grid-cols-1 md:grid-cols-[35%_65%]">
            {/* Right Column (RTL - 35%): Portrait Inside Frame */}
            <div className="relative h-64 sm:h-72 md:h-full md:min-h-[520px] overflow-hidden bg-[#040507]">
              {/* Mobile/Small Screen Full Fit */}
              <motion.img
                src={loginGirlPortrait}
                alt="مرحباً بك في منظومة الكنترول الذكي"
                referrerPolicy="no-referrer"
                animate={{ scale: [1, 1.09, 1] }}
                transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
                className="md:hidden w-full h-full object-cover object-[50%_24%] origin-center will-change-transform select-none pointer-events-none"
              />
              {/* Desktop/Tablet Split Card Layer 1: Aligned to allow forearm/hand to extend right past card edge */}
              <div className="hidden md:block absolute top-0 bottom-0 left-0 aspect-[3/4] h-full">
                <motion.img
                  src={loginGirlPortrait}
                  alt="مرحباً بك في منظومة الكنترول الذكي"
                  referrerPolicy="no-referrer"
                  animate={{ scale: [1, 1.09, 1] }}
                  transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
                  className="w-full h-full object-cover origin-center will-change-transform select-none pointer-events-none"
                />
              </div>

              {/* Seamless Left-Edge Blend into Dark Card Column */}
              <div className="hidden md:block absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/35 to-transparent pointer-events-none" />
              <div className="hidden md:block absolute inset-y-6 left-0 w-[3px] bg-gradient-to-b from-transparent via-amber-400 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.8)] pointer-events-none" />
              {/* Soft Bottom Blend Vignette */}
              <div className="absolute inset-x-0 bottom-0 h-20 md:h-24 bg-gradient-to-t from-[#090d16]/85 via-[#090d16]/25 to-transparent pointer-events-none" />
            </div>

          {/* Left Column (RTL): Brand & Actions Panel */}
          <div className="p-6 sm:p-8 lg:p-9 flex flex-col items-center justify-center text-center">
            {/* Glowing Floating App Logo */}
            <motion.div
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.04, 1],
                filter: [
                  'drop-shadow(0 0 8px rgba(251,191,36,0.3))',
                  'drop-shadow(0 0 24px rgba(251,191,36,0.85))',
                  'drop-shadow(0 0 8px rgba(251,191,36,0.3))',
                ],
              }}
              transition={{
                y: { repeat: Infinity, duration: 4, ease: 'easeInOut' },
                scale: { repeat: Infinity, duration: 4, ease: 'easeInOut' },
                filter: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
              }}
              className="relative mb-4"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-slate-800/90 to-slate-950/90 border-2 border-amber-400/50 flex items-center justify-center p-3 shadow-2xl">
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
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400 drop-shadow-sm">
            SMART CONTROL 0.1
          </h1>

          {/* Luminous Divider */}
          <div className="w-4/5 h-[2px] bg-slate-800 rounded-full overflow-hidden my-3">
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              className="w-full h-full bg-gradient-to-r from-transparent via-amber-400 to-transparent"
            />
          </div>

          <h2 className="text-[13px] sm:text-xl font-extrabold text-white mt-1 leading-snug">
            مرحباً بك في منظومة الكنترول الذكي
            <div className="mobile-ticker mt-1">
              <span className="mobile-ticker-inner text-sm sm:text-base font-bold text-amber-300">
                لإدارة أعمال إمتحانات المدارس المصرية
              </span>
            </div>
          </h2>
          <div className="my-3">
            <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)] animate-pulse">
              2027 - 2026
            </span>
          </div>
          <div className="mobile-ticker mt-1">
            <p className="mobile-ticker-inner text-xs sm:text-sm text-slate-300 font-bold tracking-wide">
              للمدارس ( الرسمية - الرسمية لغات - الرسمية المتميزة لغات - الخاصة - الدولية )
            </p>
          </div>

          <motion.span
            animate={{ backgroundPosition: ['220% center', '-220% center'] }}
            transition={{ repeat: Infinity, duration: 6.5, ease: 'linear' }}
            className="mt-2.5 text-sm sm:text-base font-extrabold leading-relaxed tracking-wide text-transparent bg-clip-text bg-[linear-gradient(110deg,#fde68a_0%,#ffffff_30%,#fbbf24_55%,#ffffff_78%,#fde68a_100%)] bg-[length:220%_auto] select-none"
          >
            مجانى وسيبقى مجانى
          </motion.span>

          {/* Error Alert */}
          {errorMsg && (
            <div className="w-full mt-5 mb-2 h-14 px-4 rounded-2xl bg-rose-500/20 border border-rose-500/60 text-rose-200 text-xs font-bold flex items-center justify-center gap-2 text-center">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Divider Line Above Buttons */}
          <div className="w-full h-[2px] bg-slate-700/80 rounded-full overflow-hidden mt-6 mb-5">
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
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white font-bold text-sm border border-white/85 hover:border-white flex items-center justify-center gap-2.5 shadow-[0_6px_20px_-4px_rgba(220,38,38,0.5)] transition-all active:scale-[0.98] cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="w-6 h-6 shrink-0"
              >
                <path
                  fill="#ffffff"
                  d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
                />
                <path fill="#dc2626" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span>شرح التطبيق</span>
            </a>

            <button
              type="button"
              onClick={() => onContinueWithoutAccount?.()}
              disabled={isLoading}
              className="w-full h-14 rounded-2xl bg-slate-800/85 hover:bg-slate-700/90 text-slate-200 hover:text-white font-bold text-[1.05rem] border border-white/85 hover:border-white flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <span>متابعة</span>
            </button>
          </div>
          </div>
        </div>
        </div>

        {/* Layer 2: Out-of-Frame 3D Arm Pop-Out Breaking Past Only the Right Frame Edge */}
        {popoutArmSrc && (
          <div
            aria-hidden="true"
            style={{ clipPath: 'inset(0 -240px 0 0)' }}
            className="hidden md:block absolute top-[4px] bottom-[4px] right-[4px] w-[calc(35%-2.8px)] z-30 pointer-events-none"
          >
            <div className="absolute top-0 bottom-0 left-0 aspect-[3/4] h-full overflow-visible">
              <motion.img
                src={popoutArmSrc}
                alt=""
                referrerPolicy="no-referrer"
                animate={{ scale: [1, 1.09, 1] }}
                transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
                style={{
                  filter: 'drop-shadow(-10px 14px 18px rgba(0, 0, 0, 0.85))',
                }}
                className="w-full h-full object-cover origin-center will-change-transform select-none pointer-events-none"
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Developer Contact Under Login Window */}
      <div className="relative z-10 mt-4 text-center select-none">
        <p className="text-xs sm:text-sm font-bold text-amber-300 tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
          Mahmoud Sallam : 01098594956 - 01131097055
        </p>
      </div>
    </div>
  );
};
