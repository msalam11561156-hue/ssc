import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { Crown } from 'lucide-react';
import { 
  getDeviceId, 
  generateNewDeviceId,
  verifyActivationPassword, 
  activatePaidVersion 
} from '../utils/activationManager';
import { PASSWORD_MODAL_ICON_BASE64 } from '../utils/offlineAssetCache';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  deviceIdOverride?: number;
  skipActivation?: boolean;
  customWhatsappMessage?: string;
  isVipOption?: boolean;
  vipOptionTitle?: string;
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
}) => {
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

  // تحديث المعرف وحقول النموذج عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      setDeviceId(resolveEffectiveId());
      setPassword('');
      setError('');
      setIsSuccess(false);
    }
  }, [isOpen, deviceIdOverride]);

  const whatsappNumber = '201098594956';
  const finalMessage = customWhatsappMessage 
    ? customWhatsappMessage.includes('ID : x')
      ? customWhatsappMessage.replace('ID : x', `ID : ${deviceId}`)
      : `${customWhatsappMessage}\nID : ${deviceId} - 350 L.E`
    : `السلام عليكم، أود تفعيل النسخة الرسمية للتطبيق.\nمعرف جهازي:\nID : ${deviceId} - 350 L.E`;
    
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(finalMessage)}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور');
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
      setError('كلمة المرور غير صحيحة');
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[360px] bg-gradient-to-br from-[#bae6fd] via-[#e0e7ff] to-[#bbf7d0] border-2 border-[#38bdf8] rounded-[28px] shadow-2xl p-6 md:p-7 flex flex-col items-center text-center"
        >
          {/* Close button (top-left in screenshot) */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors text-2xl font-light leading-none rounded-full"
            aria-label="إغلاق"
          >
            ×
          </button>

          {/* VIP Option Header */}
          {isVipOption && (
            <div className="w-full flex flex-col items-center mt-0 mb-2">
              <div className="flex items-center justify-center gap-2 px-3.5 py-1 bg-amber-500/15 border border-amber-500/40 rounded-full shadow-sm">
                <Crown className="w-4 h-4 text-amber-600 fill-amber-400 shrink-0" />
                <span className="font-black text-slate-800 text-sm md:text-base tracking-wider">
                  {vipOptionTitle || 'VIP Option'}
                </span>
                <Crown className="w-4 h-4 text-amber-600 fill-amber-400 shrink-0" />
              </div>
              <hr className="w-full border-t border-slate-300/80 mt-2.5 mb-1" />
            </div>
          )}

          {/* Professional Security & Activation Badge */}
          <div className="relative mt-1 mb-4 flex items-center justify-center">
            {/* Badge Frame with Black Border */}
            <div className="relative w-24 h-24 rounded-2xl bg-white border-2 border-black shadow-md flex items-center justify-center p-2.5 transition-transform hover:scale-105 duration-300">
              <img 
                src={PASSWORD_MODAL_ICON_BASE64} 
                alt="أيقونة نافذة كلمة المرور" 
                className="w-full h-full object-contain filter drop-shadow-sm"
                loading="eager"
                draggable={false}
              />
            </div>
          </div>

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
            التحقق من كلمة المرور
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
                placeholder="أدخل كلمة المرور..."
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



            {/* Submit Button (متابعة) */}
            <button
              type="submit"
              disabled={isSuccess}
              className="w-full bg-gradient-to-r from-[#4f46e5] to-[#2563eb] hover:from-[#4338ca] hover:to-[#1d4ed8] text-white font-black py-3.5 px-6 rounded-2xl border border-black/35 hover:border-black/50 shadow-md transition-all active:scale-[0.98] text-base cursor-pointer disabled:opacity-75"
            >
              {isSuccess ? 'جارٍ التحميل...' : 'متابعة'}
            </button>

            {/* Subtitle text */}
            <span className="text-[12px] font-bold text-emerald-800 mt-1">
              للحصول على كلمة المرور
            </span>

            {/* WhatsApp Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white font-bold py-3.5 px-6 rounded-2xl border border-black/35 hover:border-black/50 shadow-md transition-all active:scale-[0.98] text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>تواصل معنا عبر واتساب</span>
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
              ID : {deviceId} - 350 L.E
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
