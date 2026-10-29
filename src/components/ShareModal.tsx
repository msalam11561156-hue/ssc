import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageCircle, Facebook, Instagram, Send, Copy } from 'lucide-react';
import { Language } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, lang }) => {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (isOpen) {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      setCurrentUrl(url);
      setIsCopied(false);
      if (url) {
        copyToClipboard(url);
      }
    } else {
      setIsCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const appTitle = lang === 'ar' 
    ? 'شيت كنترول جميع المدارس المصرية - المنظومة الرقمية الشاملة' 
    : 'Sheet Control Egypt';
  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedShareText = encodeURIComponent(`${appTitle}\n${currentUrl}`);

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedShareText}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(appTitle)}`;
  const instagramUrl = 'https://www.instagram.com/';
  const tiktokUrl = 'https://www.tiktok.com/';

  const handlePlatformClick = () => {
    copyToClipboard(currentUrl);
  };

  const handleManualCopy = async () => {
    await copyToClipboard(currentUrl);
    setIsCopied(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-sm rounded-3xl p-[6px] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated Gradient Border */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-[conic-gradient(from_0deg,transparent_0_70%,#ffffff_85%,#000000_90%,#ffffff_95%,transparent_100%)] pointer-events-none"
          />

          <div className="bg-[#e0ebfb] rounded-[20px] p-6 w-full relative z-10 border border-slate-900/10">
            <h3 className="text-xl font-bold text-center mb-4 text-slate-800">
              {lang === 'ar' ? 'مشاركة التطبيق' : 'Share App'}
            </h3>

            <hr className="border-slate-300 mb-4" />

            {/* Social Share Buttons */}
            <div className="flex flex-row justify-between items-center w-full gap-2 mb-4">
              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePlatformClick}
                title={lang === 'ar' ? 'مشاركة عبر واتساب' : 'Share via WhatsApp'}
                className="flex items-center justify-center w-12 h-12 bg-[#25D366] border border-slate-900/40 rounded-2xl hover:bg-[#128C7E] active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <MessageCircle className="w-6 h-6 text-white" />
              </a>

              {/* Facebook */}
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePlatformClick}
                title={lang === 'ar' ? 'مشاركة عبر فيسبوك' : 'Share via Facebook'}
                className="flex items-center justify-center w-12 h-12 bg-[#1877F2] border border-slate-900/40 rounded-2xl hover:bg-[#0c5aab] active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <Facebook className="w-6 h-6 text-white" />
              </a>

              {/* Instagram */}
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePlatformClick}
                title={lang === 'ar' ? 'مشاركة عبر إنستجرام' : 'Share on Instagram'}
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] border border-slate-900/40 rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <Instagram className="w-6 h-6 text-white" />
              </a>

              {/* Telegram */}
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePlatformClick}
                title={lang === 'ar' ? 'مشاركة عبر تيليجرام' : 'Share via Telegram'}
                className="flex items-center justify-center w-12 h-12 bg-[#0088cc] border border-slate-900/40 rounded-2xl hover:bg-[#006699] active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <Send className="w-6 h-6 text-white" />
              </a>

              {/* TikTok */}
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handlePlatformClick}
                title={lang === 'ar' ? 'مشاركة عبر تيك توك' : 'Share on TikTok'}
                className="flex items-center justify-center w-12 h-12 bg-black border border-slate-900/40 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <svg className="w-6 h-6 fill-white" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                  <path d="M448 209.91a210.06 210.06 0 0 1 -122.77-39.25v178.72A162.55 162.55 0 1 1 162.6 186.8v82.38a80.3 80.3 0 1 0 80.3 80.3V0h82.38a162.55 162.55 0 0 0 122.72 162.6z"/>
                </svg>
              </a>
            </div>

            <hr className="border-slate-300 mb-4" />

            {/* Copy Link Button - Clean without any checkmark */}
            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={handleManualCopy}
                className="flex flex-row items-center justify-center gap-2 p-3.5 bg-slate-800 hover:bg-slate-900 border border-slate-900/40 rounded-xl transition-all active:scale-[0.98] shadow-md cursor-pointer text-white"
              >
                <span className="text-sm font-bold text-white">
                  {isCopied 
                    ? (lang === 'ar' ? 'تم نسخ الرابط بنجاح' : 'Link Copied Successfully') 
                    : (lang === 'ar' ? 'نسخ الرابط' : 'Copy Link')}
                </span>
                <Copy className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full bg-red-100 border border-red-500 hover:bg-red-200 transition-colors shadow-sm cursor-pointer"
                title={lang === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5 text-red-600" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
