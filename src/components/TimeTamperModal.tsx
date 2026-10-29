import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { syncTimeWithServer, checkTimeTampering } from '../utils/activationManager';

interface TimeTamperModalProps {
  isOpen: boolean;
  onResolved: () => void;
}

export const TimeTamperModal: React.FC<TimeTamperModalProps> = ({ isOpen, onResolved }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleRecheck = async () => {
    setIsChecking(true);
    setStatusMessage(null);

    // محاولة المزامنة مع الخادم وفحص التراجع
    await syncTimeWithServer();
    const stillTampered = checkTimeTampering();

    setIsChecking(false);

    if (!stillTampered) {
      setIsSuccess(true);
      setStatusMessage('تم التحقق بنجاح وتطابق الوقت!');
      setTimeout(() => {
        setIsSuccess(false);
        onResolved();
      }, 1000);
    } else {
      setIsSuccess(false);
      setStatusMessage('التاريخ والوقت ما زالا غير مضبوطين. يرجى تفعيل الضبط التلقائي للوقت ثم المحاولة مجدداً.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, type: 'spring', bounce: 0.25 }}
          className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden"
          dir="rtl"
        >
          {/* خلفية جمالية */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center gap-5">
            {/* أيقونة التنبيه */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 text-white">
                <Clock className="w-10 h-10 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-rose-600 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* العنوان الرئيسي المحدد من قبل المستخدم */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-wide">
                يرجى ضبط اعدادات التاريخ والوقت
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mx-auto">
                تم اكتشاف عدم تطابق أو تراجع في التاريخ والوقت الخاص بجهازك. لحماية دقة التقارير وأمان التطبيق، يرجى ضبط الساعة والتاريخ الحاليين بشكل صحيح للمتابعة.
              </p>
            </div>

            {/* بطاقة إرشادات */}
            <div className="w-full bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 text-right text-xs sm:text-sm text-slate-300 space-y-1.5">
              <div className="font-bold text-amber-300 mb-1">خطوات الحل السريع:</div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span>افتح إعدادات التاريخ والوقت على جهازك (Windows أو الهاتف).</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span>قم بتفعيل خيار <strong>"الضبط التلقائي للتاريخ والوقت" (Set time automatically)</strong>.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span>اضغط على الزر أدناه لإعادة التحقق واستئناف العمل فوراً.</span>
              </div>
            </div>

            {/* رسالة الحالة بعد الضغط */}
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`w-full p-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 ${
                  isSuccess
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                }`}
              >
                {isSuccess ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{statusMessage}</span>
              </motion.div>
            )}

            {/* زر التحقق وتحديث الوقت */}
            <button
              type="button"
              onClick={handleRecheck}
              disabled={isChecking}
              className="w-full sm:w-auto min-w-[220px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-base transition-all active:scale-95 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'جارٍ التحقق من الوقت...' : 'التحقق وتحديث الوقت الآن'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
