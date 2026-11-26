import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FAST_MODAL_FLIP, FAST_BACKDROP_FADE } from '../utils/flipAnimation';
import { createPortal } from 'react-dom';
import { Crown } from 'lucide-react';
import { 
  getDeviceId, 
  generateNewDeviceId,
  verifyActivationPassword, 
  activatePaidVersion 
} from '../utils/activationManager';
import { getBrandShieldSync, getCachedBrandShield, getCachedEnglishSeatExample, getCachedEnglishSeatScheduleExample, getCachedEnglishCertExample, getCachedAppreciationCertExample } from '../utils/offlineAssetCache';
import { applyTechnicalAssessmentTerms } from '../i18n';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deviceIdOverride?: number;
  skipActivation?: boolean;
  customWhatsappMessage?: string;
  isVipOption?: boolean;
  vipOptionTitle?: string;
  showFullVipTitle?: boolean;
  showExampleButton?: boolean;
  exampleVariant?: 'seat_numbers' | 'seat_numbers_with_schedule' | 'english_cert' | 'appreciation_cert';
  modalLang?: 'ar' | 'en';
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  deviceIdOverride,
  skipActivation = false,
  customWhatsappMessage,
  isVipOption = false,
  vipOptionTitle,
  showFullVipTitle = false,
  showExampleButton = false,
  exampleVariant = 'seat_numbers',
  modalLang = 'ar',
}) => {
  const isEnglish = modalLang === 'en';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const resolveEffectiveId = () => {
    let id = deviceIdOverride && deviceIdOverride > 0 && deviceIdOverride !== 13 
      ? deviceIdOverride 
      : getDeviceId();
    if (!id || id === 13) {
      id = generateNewDeviceId();
    }
    return id;
  };

  const [deviceId, setDeviceId] = useState<number>(resolveEffectiveId);
  const [logoSrc, setLogoSrc] = useState<string>(() => getBrandShieldSync());

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

  const isSeatScheduleExample = exampleVariant === 'seat_numbers_with_schedule';
  const isCertExample = exampleVariant === 'english_cert';
  const isAppreciationExample = exampleVariant === 'appreciation_cert';
  const isLargeCertExample = isCertExample || isAppreciationExample;
  const defaultExampleUrl = isAppreciationExample
    ? '/assets/aistudio/Screenshot_39_f29a76cd.jpg'
    : isCertExample
      ? '/assets/aistudio/1234_fe7474fc.jpg'
      : isSeatScheduleExample
        ? '/assets/aistudio/Screenshot_17_c02a8e5f.jpg'
        : '/assets/aistudio/Screenshot_1_33782f4f.jpg';
  const exampleModalTitle = isAppreciationExample
    ? (isEnglish ? 'Appreciation Certificates Example' : 'نموذج شهادات التقدير')
    : isCertExample
      ? (isEnglish ? 'Certificates in English Example' : applyTechnicalAssessmentTerms('نموذج شهادة درجات وتقييمات باللغة الإنجليزية'))
      : isSeatScheduleExample
        ? (isEnglish ? 'Seat Numbers With Exam Schedule Example' : 'نموذج أرقام الجلوس بجدول الامتحانات')
        : (isEnglish ? 'Seat Numbers in English Example' : 'نموذج أرقام الجلوس بالإنجليزية');
  const exampleDownloadFilename = isAppreciationExample
    ? 'appreciation_certificate_example.jpg'
    : isCertExample
      ? 'english_grades_certificate_example.jpg'
      : isSeatScheduleExample
        ? 'english_seat_number_with_schedule_example.jpg'
        : 'english_seat_number_example.jpg';
  const exampleModalSizeClass = isLargeCertExample || isSeatScheduleExample
    ? 'w-[80vw] h-[92vh] max-w-[80vw] max-h-[92vh]'
    : 'w-[75vw] h-[75vh] max-w-[75vw] max-h-[75vh]';

  const [showExampleModal, setShowExampleModal] = useState(false);
  const [exampleImageUrl, setExampleImageUrl] = useState(defaultExampleUrl);
  const [croppedExampleImageUrl, setCroppedExampleImageUrl] = useState<string>('');

  useEffect(() => {
    setExampleImageUrl(defaultExampleUrl);
    setCroppedExampleImageUrl('');
    if (showExampleButton && isOpen) {
      let active = true;
      const loader = isAppreciationExample
        ? getCachedAppreciationCertExample
        : isCertExample
          ? getCachedEnglishCertExample
          : isSeatScheduleExample
            ? getCachedEnglishSeatScheduleExample
            : getCachedEnglishSeatExample;
      loader()
        .then((url) => {
          if (active && url) setExampleImageUrl(url);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [showExampleButton, isOpen, isSeatScheduleExample, isCertExample, isAppreciationExample, defaultExampleUrl]);

  useEffect(() => {
    if (!showExampleButton || !exampleImageUrl || isLargeCertExample) {
      setCroppedExampleImageUrl('');
      return;
    }
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        let minX = w;
        let minY = h;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            if (r < 225 || g < 225 || b < 225) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX > minX + 100 && maxY > minY + 100) {
          const inset = 2;
          const sx = Math.min(w - 1, minX + inset);
          const sy = Math.min(h - 1, minY + inset);
          const sw = Math.max(1, maxX - minX + 1 - inset * 2);
          const sh = Math.max(1, maxY - minY + 1 - inset * 2);

          const outCanvas = document.createElement('canvas');
          outCanvas.width = sw;
          outCanvas.height = sh;
          const outCtx = outCanvas.getContext('2d');
          if (outCtx) {
            const radius = Math.round(Math.min(sw, sh) * 0.02);
            outCtx.beginPath();
            if (typeof outCtx.roundRect === 'function') {
              outCtx.roundRect(0, 0, sw, sh, radius);
            } else {
              outCtx.rect(0, 0, sw, sh);
            }
            outCtx.clip();
            outCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
            if (active) {
              setCroppedExampleImageUrl(outCanvas.toDataURL('image/png'));
            }
          }
        }
      } catch {
        // fallback to original image url
      }
    };
    img.src = exampleImageUrl;
    return () => {
      active = false;
    };
  }, [showExampleButton, exampleImageUrl, isLargeCertExample]);

  // تحديث المعرف وحقول النموذج عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      setDeviceId(resolveEffectiveId());
      setPassword('');
      setError('');
      setIsSuccess(false);
    } else {
      setShowExampleModal(false);
    }
  }, [isOpen, deviceIdOverride]);

  const resolvedServiceName = (() => {
    const raw = (vipOptionTitle || '').trim();
    if (!raw || raw.toLowerCase() === 'vip option') {
      return isEnglish ? 'Additional Service' : 'خدمة إضافية';
    }
    if (showFullVipTitle || isEnglish) {
      return raw;
    }
    return raw.split(/\s+/).slice(0, 3).join(' ');
  })();

  const whatsappNumber = '201098594956';
  const finalMessage = customWhatsappMessage 
    ? customWhatsappMessage.includes('ID : x')
      ? customWhatsappMessage.replace('ID : x', `ID : ${deviceId}`)
      : `${customWhatsappMessage}\nID : ${deviceId}`
    : `السلام عليكم، أود تفعيل النسخة الرسمية للتطبيق.\nمعرف جهازي:\nID : ${deviceId}`;
    
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(finalMessage)}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(isEnglish ? 'Please enter the password' : 'يرجى إدخال كلمة المرور');
      return;
    }

    const isValid = verifyActivationPassword(password, deviceId);
    if (isValid) {
      setError('');
      setIsSuccess(true);
      
      if (!skipActivation) {
        // تفعيل النسخة الرسمية وبدء عداد الـ 5 مرات تشغيل للجلسة الحالية
        activatePaidVersion();
      }

      setTimeout(() => {
        onSuccess();
      }, 700);
    } else {
      setError(isEnglish ? 'Incorrect password' : 'كلمة المرور غير صحيحة');
    }
  };

  const modalContent = (
    <>
      <AnimatePresence>
        {isOpen && (
        <motion.div
          key="password-modal-backdrop"
          {...FAST_BACKDROP_FADE}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          dir={isEnglish ? 'ltr' : 'rtl'}
          onClick={onClose}
        >
          <motion.div
            {...FAST_MODAL_FLIP}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] max-h-[92vh] overflow-y-auto bg-gradient-to-br from-[#bae6fd] via-[#e0e7ff] to-[#bbf7d0] border-2 border-[#38bdf8] rounded-[28px] shadow-2xl p-6 md:p-7 flex flex-col items-center text-center"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className={`absolute top-4 ${isEnglish ? 'right-4' : 'left-4'} w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors text-2xl font-light leading-none rounded-full`}
              aria-label={isEnglish ? 'Close' : 'إغلاق'}
            >
              ×
            </button>

            {/* Services + Header */}
            {isVipOption && (
              <div className="w-full flex flex-col items-center mt-0 mb-3">
                <img
                  src={logoSrc}
                  alt="SMART CONTROL"
                  onError={() => {
                    if (logoSrc !== '/brand_shield.png' && !logoSrc.startsWith('data:image/')) {
                      setLogoSrc('/brand_shield.png');
                    } else if (logoSrc !== '/pwa-192x192.png') {
                      setLogoSrc('/pwa-192x192.png');
                    }
                  }}
                  className="w-14 h-14 object-contain drop-shadow-sm select-none pointer-events-none"
                />
                <hr className="w-full border-t border-slate-300/80 my-2" />
                <div
                  dir="ltr"
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-1 bg-amber-500/15 border border-amber-500/40 rounded-full shadow-sm"
                >
                  <Crown className="w-4 h-4 text-amber-600 fill-amber-400 shrink-0" />
                  <span className="font-black text-slate-800 text-sm md:text-base tracking-wider">
                    Services +
                  </span>
                  <Crown className="w-4 h-4 text-amber-600 fill-amber-400 shrink-0" />
                </div>
                <hr className="w-full border-t border-slate-300/80 my-2" />
                <div
                  dir={isEnglish || showFullVipTitle ? 'ltr' : undefined}
                  className="font-black text-slate-800 text-sm md:text-base tracking-tight px-2"
                >
                  {resolvedServiceName}
                </div>
                <hr className="w-full border-t border-slate-300/80 mt-2 mb-0.5" />
              </div>
            )}

            {/* Title */}
            <motion.h2
              animate={{
                rotate: [-2.5, 2.5],
                x: [-1, 1],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "50% 0%" }}
              className="text-xl md:text-2xl font-black text-slate-800 mb-5 tracking-tight inline-block select-none"
            >
              {isEnglish ? 'Password Verification' : 'التحقق من كلمة المرور'}
            </motion.h2>

            {/* Input & Form */}
            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-3.5">
              <div className="w-full">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder={isEnglish ? 'Enter password...' : 'أدخل كلمة المرور...'}
                  autoFocus
                  className="w-full bg-white text-slate-900 font-bold text-center text-base py-3 px-4 rounded-xl border-2 border-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all placeholder:text-slate-400 placeholder:font-semibold"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-bold text-rose-600 px-1 text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSuccess}
                className="w-full bg-gradient-to-r from-[#4f46e5] to-[#2563eb] hover:from-[#4338ca] hover:to-[#1d4ed8] text-white font-black py-3.5 px-6 rounded-2xl border border-black/35 hover:border-black/50 shadow-md transition-all active:scale-[0.98] text-base cursor-pointer disabled:opacity-75"
              >
                {isSuccess
                  ? (isEnglish ? 'Loading...' : 'جارٍ التحميل...')
                  : (isEnglish ? 'Continue' : 'متابعة')}
              </button>

              {showExampleButton && (
                <button
                  type="button"
                  onClick={() => setShowExampleModal(true)}
                  className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black py-3.5 px-6 rounded-2xl border border-black/35 shadow-md transition-all active:scale-[0.98] text-base cursor-pointer flex items-center justify-center gap-2 mt-1"
                >
                  <span>{isEnglish ? 'Example' : 'نموذج'}</span>
                </button>
              )}

              {/* Subtitle text */}
              <span className="text-[12px] font-bold text-emerald-800 mt-1">
                {isEnglish ? 'To obtain the password' : 'للحصول على كلمة المرور'}
              </span>

              {/* WhatsApp Button */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white font-bold py-3.5 px-6 rounded-2xl border border-black/35 hover:border-black/50 shadow-md transition-all active:scale-[0.98] text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isEnglish ? 'Contact us via WhatsApp' : 'تواصل معنا عبر واتساب'}</span>
                {/* WhatsApp speech bubble icon */}
                <svg 
                  className="w-5 h-5 fill-white shrink-0" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.976.58 1.96.924 3.149.924 3.182 0 5.767-2.587 5.767-5.766.001-3.187-2.575-5.766-5.767-5.766zm10.169 5.766c0 5.626-4.577 10.198-10.2 10.198-1.785 0-3.483-.464-4.968-1.282l-5.632 1.48 1.505-5.496a10.088 10.088 0 0 1-1.305-4.9c0-5.627 4.578-10.199 10.2-10.199 5.623 0 10.2 4.572 10.2 10.199z"/>
                </svg>
              </a>

              {/* Bottom Separator */}
              <div className="w-full h-[2px] bg-gradient-to-r from-sky-400 via-indigo-500 to-emerald-400 rounded-full mt-1.5 mb-0.5" />

              {/* Device ID Footer */}
              <div 
                className="font-bold text-slate-800 text-sm tracking-wide mt-0.5 select-all" 
                dir="ltr"
              >
                ID : {deviceId}
              </div>
            </form>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExampleModal && (
          <motion.div
            key="example-modal-backdrop"
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            dir={isEnglish ? 'ltr' : 'rtl'}
            onClick={() => setShowExampleModal(false)}
          >
            <motion.div
              {...FAST_MODAL_FLIP}
              onClick={(e) => e.stopPropagation()}
              className={`bg-white rounded-3xl p-4 sm:p-5 ${exampleModalSizeClass} shadow-2xl border-[3px] border-black flex flex-col items-center justify-between gap-3 relative overflow-hidden`}
            >
              <div className="w-full h-11 shrink-0 flex items-center justify-center relative">
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-950 truncate px-4">{exampleModalTitle}</h3>
              </div>

              <div className="relative flex-1 w-full min-h-0 rounded-2xl overflow-hidden border-2 border-black bg-[#04070d] p-1 sm:p-[5px] flex items-center justify-center shadow-inner">
                {/* Rotating professional white luminous sweep around the card */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 5.5, ease: 'linear' }}
                  style={{
                    background:
                      'conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.05) 0deg, rgba(255,255,255,0.3) 35deg, #ffffff 70deg, rgba(255,255,255,0.95) 85deg, rgba(255,255,255,0.3) 120deg, rgba(255,255,255,0.05) 160deg, rgba(255,255,255,0.05) 180deg, rgba(255,255,255,0.3) 215deg, #ffffff 250deg, rgba(255,255,255,0.95) 265deg, rgba(255,255,255,0.3) 300deg, rgba(255,255,255,0.05) 340deg)',
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220%] aspect-square pointer-events-none"
                />
                {/* Soft diffused white halo for smooth studio rim-light */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 5.5, ease: 'linear' }}
                  style={{
                    background:
                      'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(255,255,255,0.65) 75deg, transparent 150deg, transparent 180deg, rgba(255,255,255,0.65) 255deg, transparent 330deg)',
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220%] aspect-square blur-sm opacity-80 pointer-events-none"
                />
                <div className="relative z-10 w-full h-full bg-white rounded-xl p-[0.5cm] flex items-center justify-center ring-1 ring-white/80 shadow-[0_0_7px_rgba(255,255,255,0.5)]">
                  <img
                    src={croppedExampleImageUrl || exampleImageUrl}
                    alt={exampleModalTitle}
                    className="w-full h-full object-fill rounded-lg block"
                  />
                </div>
              </div>

              <div className="w-full h-11 shrink-0 flex items-center justify-end gap-3">
                <a
                  href={exampleImageUrl}
                  download={exampleDownloadFilename}
                  className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm border-2 border-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isEnglish ? 'Save Image to Device' : 'حفظ الصورة على الجهاز'}
                </a>
                <button
                  type="button"
                  onClick={() => setShowExampleModal(false)}
                  className="h-11 px-6 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-950 font-bold text-sm border-2 border-black transition-all flex items-center justify-center cursor-pointer"
                >
                  {isEnglish ? 'Close' : 'إغلاق'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
