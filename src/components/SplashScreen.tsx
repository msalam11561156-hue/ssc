import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import { translations } from '../i18n';
import defaultIllustrationBg from '../assets/images/control_illustration_1786475473814.jpg';
import defaultBrandBg from '../assets/images/splash_brand_bg.jpg';
import { getCachedSplashBackground } from '../utils/offlineAssetCache';
import { PasswordModal } from './PasswordModal';
import { isPaidUnlocked } from '../utils/activationManager';
import { Clock, AlertCircle, Crown, ArrowLeft, ArrowRight } from 'lucide-react';

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
  const [bgImage1, setBgImage1] = useState(defaultIllustrationBg);
  const [bgImage2, setBgImage2] = useState(defaultBrandBg);
  const [activeBgIndex, setActiveBgIndex] = useState(0);

  useEffect(() => {
    setIsOfficialUnlocked(isPaidUnlocked());

    // جلب وحفظ الصور على جهاز العميل لضمان التحميل الفوري وعدم فقدانها
    getCachedSplashBackground('illustration').then((url) => {
      if (url) setBgImage1(url);
    });
    getCachedSplashBackground('brand').then((url) => {
      if (url) setBgImage2(url);
    });

    // تبديل خلفية الشاشة كل 5 ثوان بنعومة وسلاسة
    const interval = setInterval(() => {
      setActiveBgIndex((prev) => (prev === 0 ? 1 : 0));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleOfficialClick = () => {
    if (isPaidUnlocked()) {
      setIsOfficialUnlocked(true);
      onNext(false);
    } else {
      setIsPasswordModalOpen(true);
    }
  };

  const handleTrialClick = () => {
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
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, x: -100, scale: 0.9 }}
        transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
        className="w-full relative p-[8px] rounded-[3rem] overflow-hidden shadow-2xl"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-[conic-gradient(transparent_270deg,#ffffff_360deg)]"
        />
        
        <div className="relative rounded-[2.5rem] overflow-hidden border-[3px] border-black w-full h-full flex flex-col">
          <div 
            className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900"
          />
        
        <div className="relative z-10 w-full min-h-[60vh] flex flex-col items-center justify-center gap-12 py-12 md:py-16 overflow-hidden">
          
          {/* Background Image 1 (Illustration) */}
          <div 
            className={`absolute inset-0 z-0 ${activeBgIndex === 0 ? 'opacity-100' : 'opacity-0'}`}
            style={{
              backgroundImage: `url(${bgImage1})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              transition: 'opacity 1200ms ease-in-out'
            }}
          />

          {/* Background Image 2 (Brand Shield on Velvet) - Centered and contained so shield is fully visible */}
          <div 
            className={`absolute inset-0 z-0 ${activeBgIndex === 1 ? 'opacity-100' : 'opacity-0'}`}
            style={{
              backgroundImage: `url(${bgImage2})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#1a0508',
              transition: 'opacity 1200ms ease-in-out'
            }}
          />
          
          {/* Subtle Dark Overlay to preserve text contrast & depth */}
          <div className="absolute inset-0 z-0 bg-slate-900/20 backdrop-blur-[0.5px]" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1.2, ease: 'easeOut' }}
            className="relative z-10 w-full my-auto"
          >
            {/* Glowing Animated Border Container */}
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
              className="w-full bg-[length:200%_auto] py-[3px] shadow-2xl relative overflow-visible"
              style={{ backgroundImage: 'linear-gradient(to right, #ffffff, #06b6d4, #3b82f6, #06b6d4, #ffffff)' }}
            >
              {/* Ticker Background (Blue -> Green -> Yellow) */}
              <motion.div 
                 animate={{ backgroundColor: ['rgba(30,64,175,0.95)', 'rgba(21,128,61,0.95)', 'rgba(161,98,7,0.95)', 'rgba(30,64,175,0.95)'] }}
                 transition={{ repeat: Infinity, duration: 15, ease: 'easeInOut' }}
                 className="w-full py-4 md:py-5 flex items-center overflow-hidden [container-type:inline-size]"
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
                    className="text-lg md:text-2xl font-extrabold text-transparent bg-clip-text flex items-center"
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
          </motion.div>
        </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="flex flex-col items-center gap-5 w-full"
      >
        {isOfficialUnlocked ? (
          <div className="flex items-center justify-center w-full px-4">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onNext(false)}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center bg-gradient-to-r from-[#a855f7] via-[#6366f1] to-[#3b82f6] hover:from-[#9333ea] hover:via-[#4f46e5] hover:to-[#2563eb] text-white shadow-[0_10px_25px_-5px_rgba(168,85,247,0.6)] border-2 border-black group transition-all cursor-pointer relative overflow-hidden"
              title={lang === 'ar' ? 'الدخول إلى التطبيق' : 'Enter application'}
              aria-label={lang === 'ar' ? 'الدخول إلى التطبيق' : 'Enter application'}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
              {lang === 'ar' ? (
                <ArrowLeft className="w-8 h-8 md:w-10 md:h-10 relative z-10 transition-transform group-hover:-translate-x-1 drop-shadow-md" />
              ) : (
                <ArrowRight className="w-8 h-8 md:w-10 md:h-10 relative z-10 transition-transform group-hover:translate-x-1 drop-shadow-md" />
              )}
            </motion.button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full max-w-lg px-4">
            <button
              type="button"
              onClick={handleTrialClick}
              className={`flex-1 w-full flex items-center justify-center ${
                isTrialExpired || isDayExpired
                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-300 opacity-90'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-600 text-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.55)]'
              } font-black min-h-[62px] py-4 px-6 rounded-2xl transition-all active:scale-[0.98] border-2 border-black group overflow-hidden relative cursor-pointer`}
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 text-lg flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-amber-300 shrink-0" />
                <span>النسخة التجريبية</span>
              </span>
            </button>

            <button
              type="button"
              onClick={handleOfficialClick}
              className="flex-1 w-full flex items-center justify-center bg-gradient-to-r from-[#a855f7] to-[#3b82f6] hover:from-[#9333ea] hover:to-[#2563eb] text-white font-black min-h-[62px] py-4 px-6 rounded-2xl transition-all active:scale-[0.98] shadow-[0_8px_20px_-6px_rgba(168,85,247,0.6)] border-2 border-black group overflow-hidden relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 text-lg flex items-center justify-center gap-2">
                <Crown className="w-5 h-5 text-amber-300 shrink-0" />
                <span>النسخة الرسمية</span>
              </span>
            </button>
          </div>
        )}

        <div className="w-full max-w-sm flex flex-col items-center gap-3 mt-1">
          {/* Animated Light Line */}
          <div className="relative w-full h-[2px] bg-slate-900/20 overflow-hidden rounded-full">
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
              className="absolute inset-y-0 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent"
            />
          </div>
          <span className="bg-gradient-to-r from-white via-slate-400 to-white bg-[length:200%_auto] text-transparent bg-clip-text animate-shine text-sm md:text-base font-bold tracking-wider drop-shadow-md text-center whitespace-nowrap">
            Smart Control 2026 - 2027 - Mahmoud Sallam : 01098594956 - 01131097055
          </span>
        </div>
      </motion.div>

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
