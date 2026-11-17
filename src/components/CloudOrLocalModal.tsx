import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, HardDrive, CheckCircle2, ShieldCheck, WifiOff, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Language } from '../types';

interface CloudOrLocalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCloud: () => void;
  onSelectLocal: () => void;
  lang?: Language;
}

export const CloudOrLocalModal: React.FC<CloudOrLocalModalProps> = ({
  isOpen,
  onClose,
  onSelectCloud,
  onSelectLocal,
  lang = 'ar',
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-indigo-500/40 rounded-[28px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] p-6 md:p-8 flex flex-col text-slate-100 overflow-hidden"
        >
          {/* Decorative Glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 left-5 w-9 h-9 flex items-center justify-center rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 z-10"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-6 md:mb-8 z-10">
            <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-indigo-200 to-blue-400 bg-clip-text text-transparent mb-2">
              اختر طريقة التشغيل المفضلة للكونترول
            </h2>
            <p className="text-sm md:text-base text-slate-400 font-medium">
              يمكنك العمل من خلال الوضع السحابي المتصل لمزامنة السجلات، أو العمل بالوضع المحلي المستقل بدون إنترنت
            </p>
          </div>

          {/* Two Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 z-10 mb-2">
            
            {/* Card 1: Cloud Sync (الوضع السحابي المتصل) */}
            <div className="bg-gradient-to-b from-slate-800/90 to-slate-800/60 border-2 border-indigo-500/60 hover:border-indigo-400 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative transition-all group">
              {/* Badge: موصى به للمؤسسات */}
              <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-black px-3.5 py-1 rounded-full shadow-md border border-indigo-400 flex items-center gap-1">
                <span>⭐</span>
                <span>موصى به للمؤسسات</span>
              </div>

              <div>
                <div className="flex items-center gap-3.5 mb-4 mt-1">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-inner group-hover:scale-110 transition-transform">
                    <Cloud className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-white">الوضع السحابي المتصل</h3>
                    <p className="text-xs text-indigo-300 font-bold">Cloud Sync • اتصال ومزامنة لحظية</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>حفظ تلقائي ومزامنة لحظية للبيانات والسجلات عبر السحابة.</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>وصول مرن للنظام من أي جهاز كمبيوتر أو هاتف وفي أي مكان.</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>نسخ احتياطي آمن ومشفر يحمي بياناتك من تلف أو فقدان الجهاز.</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>دعم العمل الجماعي وتعدد المستخدمين والصلاحيات في نفس الوقت.</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onSelectCloud}
                className="w-full h-12 rounded-xl font-black bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>تسجيل الدخول والمزامنة السحابية</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Card 2: Local Standalone (الوضع المحلي المستقل) */}
            <div className="bg-gradient-to-b from-slate-800/90 to-slate-800/60 border-2 border-slate-700 hover:border-slate-500 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col justify-between relative transition-all group">
              {/* Badge: بدون إنترنت */}
              <div className="absolute -top-3.5 right-6 bg-slate-700 text-slate-200 text-xs font-black px-3.5 py-1 rounded-full shadow-md border border-slate-600 flex items-center gap-1">
                <WifiOff className="w-3.5 h-3.5 text-slate-300" />
                <span>بدون إنترنت • Offline Ready</span>
              </div>

              <div>
                <div className="flex items-center gap-3.5 mb-4 mt-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-700/50 border border-slate-600 flex items-center justify-center text-slate-300 shadow-inner group-hover:scale-110 transition-transform">
                    <HardDrive className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-white">الوضع المحلي المستقل</h3>
                    <p className="text-xs text-slate-400 font-bold">Local Storage • تخزين مباشر على الجهاز</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>عمل فوري وسريع دون الحاجة لأي اتصال بالإنترنت أو خوادم.</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>خصوصية تامة حيث تُحفظ كافة البيانات محلياً على هذا الجهاز فقط.</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>مثالي للعمل الفردي أو في قاعات الكنترول ذات الشبكة المغلقة.</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>تحكم يدوي كامل مع إمكانية تصدير واستيراد النسخ الاحتياطية في أي وقت.</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onSelectLocal}
                className="w-full h-12 rounded-xl font-black bg-slate-700 hover:bg-slate-600 text-slate-100 shadow-md border border-slate-600 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>العمل دون اتصال (محلي)</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Footer note */}
          <div className="text-center text-xs text-slate-500 mt-2 z-10">
            Smart Control 0.1 Examination Management System • Secure & Reliable
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
