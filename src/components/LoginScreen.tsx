import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { signInWithPopup, User } from 'firebase/auth';
import { ShieldCheck, AlertCircle, Database, Globe } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { AnimatedBackground } from './AnimatedBackground';
import { getBrandShieldSync, getCachedBrandShield } from '../utils/offlineAssetCache';

interface LoginScreenProps {
  onSuccess?: (user: User) => void;
  onContinueWithoutAccount?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onContinueWithoutAccount }) => {
  const [logoSrc, setLogoSrc] = useState<string>(() => getBrandShieldSync());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCachedBrandShield().then((cached) => {
      if (active && cached) {
        setLogoSrc(cached);
      }
    });
    return () => {
      active = false;
    };
  }, []);

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
      const result = await signInWithPopup(auth, googleProvider);
      if (onSuccess && result.user) {
        onSuccess(result.user);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMsg('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية. يرجى المحاولة مرة أخرى.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('المتصفح منع فتح نافذة تسجيل الدخول. يرجى السماح بالنوافذ المنبثقة لهذا الموقع ثم المحاولة مجدداً.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMsg('تعذر الاتصال بالإنترنت. يرجى التحقق من الشبكة والمحاولة مرة أخرى.');
      } else {
        setErrorMsg('تعذر إتمام تسجيل الدخول حالياً. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden [color-scheme:light_only]"
    >
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, type: 'spring', bounce: 0.25 }}
        className="relative z-10 w-full max-w-2xl p-[3px] rounded-[32px] overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)]"
      >
        {/* Animated Luminous Border */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 14, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] aspect-square bg-[conic-gradient(from_0deg_at_50%_50%,#fbbf24_0deg,#3b82f6_90deg,#a855f7_180deg,#06b6d4_270deg,#fbbf24_360deg)] opacity-85 pointer-events-none"
        />

        {/* Card Container */}
        <div className="relative z-10 w-full bg-gradient-to-b from-[#111827] via-[#0f172a] to-[#090d16] rounded-[29px] p-6 sm:p-8 flex flex-col items-center text-center border border-slate-800/80">
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
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-slate-800/90 to-slate-950/90 border-2 border-amber-400/50 flex items-center justify-center p-3 shadow-2xl">
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
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400 drop-shadow-sm">
            SMART CONTROL
          </h1>

          {/* Luminous Divider */}
          <div className="w-4/5 h-[2px] bg-slate-800 rounded-full overflow-hidden my-3">
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              className="w-full h-full bg-gradient-to-r from-transparent via-amber-400 to-transparent"
            />
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1 leading-snug">
            مرحباً بك في منظومة الكنترول الذكي
            <span className="block text-sm sm:text-base font-bold text-amber-300 mt-1">
              لإدارة أعمال إمتحانات المدارس المصرية
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-medium">
            سجل الدخول بحساب جوجل الخاص بك للانتقال إلى الشاشة الافتتاحية والولوج إلى شاشات التطبيق الأخرى.
          </p>

          {/* Feature Highlights */}
          <div className="w-full grid grid-cols-3 gap-2 sm:gap-3 my-5">
            <div className="bg-slate-800/60 border border-white/85 rounded-2xl px-2 py-2.5 sm:p-3 flex flex-col items-center justify-center gap-1.5">
              <Database className="w-5 h-5 text-cyan-400 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold text-slate-300 leading-tight">حفظ سحابي تلقائي</span>
            </div>
            <div className="bg-slate-800/60 border border-white/85 rounded-2xl px-2 py-2.5 sm:p-3 flex flex-col items-center justify-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold text-slate-300 leading-tight">حماية وخصوصية تامة</span>
            </div>
            <div className="bg-slate-800/60 border border-white/85 rounded-2xl px-2 py-2.5 sm:p-3 flex flex-col items-center justify-center gap-1.5">
              <Globe className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold text-slate-300 leading-tight">الوصول من أى مكان</span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="w-full mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/60 text-rose-200 text-xs font-bold flex items-center gap-2 text-right">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-14 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-base shadow-[0_10px_30px_-5px_rgba(255,255,255,0.3)] border-2 border-amber-400/70 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>تسجيل الدخول باستخدام حسابك فى Google</span>
              </>
            )}
          </button>

          {/* Divider Between Login Buttons */}
          <div className="w-full flex items-center gap-3 my-3.5">
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-slate-600 to-slate-500" />
            <span className="text-xs font-bold text-slate-400">أو</span>
            <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-slate-600 to-slate-500" />
          </div>

          {/* Continue Without Account Button */}
          <button
            type="button"
            onClick={() => onContinueWithoutAccount?.()}
            disabled={isLoading}
            className="w-full h-12 rounded-2xl bg-slate-800/85 hover:bg-slate-700/90 text-slate-200 hover:text-white font-bold text-sm border border-white/85 hover:border-white flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            <span>المتابعة بدون حساب</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
