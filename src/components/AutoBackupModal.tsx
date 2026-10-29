import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ShieldCheck, CheckCircle2, X, Bell } from 'lucide-react';
import { playClickSound } from '../utils/sound';

interface AutoBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutoBackupModal: React.FC<AutoBackupModalProps> = ({ isOpen, onClose }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('sheet_control_auto_backup_enabled') === 'true';
  });
  const [intervalOption, setIntervalOption] = useState<string>(() => {
    return localStorage.getItem('sheet_control_auto_backup_interval') || '10_mins';
  });
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    const savedEnabled = localStorage.getItem('sheet_control_auto_backup_enabled') === 'true';
    const savedInterval = localStorage.getItem('sheet_control_auto_backup_interval') || '10_mins';
    setIsEnabled(savedEnabled);
    setIntervalOption(savedInterval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    playClickSound();
    localStorage.setItem('sheet_control_auto_backup_enabled', isEnabled ? 'true' : 'false');
    localStorage.setItem('sheet_control_auto_backup_interval', intervalOption);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
      onClose();
    }, 1200);
  };

  const options = [
    { id: '1_min', label: 'الحفظ التلقائى كل دقيقة' },
    { id: '10_mins', label: 'الحفظ التلقائى كل 10 دقائق' },
    { id: '30_mins', label: 'الحفظ التلقائى كل 30 دقيقة' },
    { id: '1_hour', label: 'الحفظ التلقائى كل ساعة' },
    { id: '2_hours', label: 'الحفظ التلقائى كل ساعتين' },
    { id: '1_day', label: 'الحفظ التلقائى كل يوم' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">إعدادات الحفظ التلقائي</h3>
              <p className="text-xs text-blue-100 opacity-90">حفظ نسخة احتياطية من البيانات بشكل دوري ومنتظم</p>
            </div>
          </div>
          <button
            onClick={() => { playClickSound(); onClose(); }}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Toast Notification inside modal */}
          {toastVisible && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-50 border-2 border-black rounded-xl text-emerald-900 flex items-center gap-2.5 text-sm font-bold"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              تم حفظ إعدادات الحفظ التلقائي بنجاح!
            </motion.div>
          )}

          {/* Toggle Switch Card */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border-2 border-black rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">تشغيل خاصية الحفظ التلقائى</h4>
                <p className="text-xs text-slate-500 mt-0.5">حفظ البيانات فى الخلفية تلقائياً حسب الفترات المحددة</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => {
                  playClickSound();
                  setIsEnabled(e.target.checked);
                }}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 border-2 border-black"></div>
            </label>
          </div>

          {/* Intervals Selection */}
          <div className={`space-y-3 transition-opacity ${isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <label className="block text-xs font-bold text-slate-700">اختر الفترة الزمنية للحفظ التلقائى:</label>
            <div className="grid grid-cols-2 gap-3">
              {options.map((opt) => {
                const selected = intervalOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIntervalOption(opt.id);
                    }}
                    className={`p-3 rounded-2xl border-2 text-right transition flex items-center justify-between ${
                      selected
                        ? 'border-black bg-blue-50/80 text-blue-950 font-bold shadow-sm'
                        : 'border-black bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs">{opt.label}</span>
                    <div className={`w-4 h-4 rounded-full border-2 border-black flex items-center justify-center ${selected ? 'bg-blue-600' : 'bg-white'}`}>
                      {selected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => { playClickSound(); onClose(); }}
            className="h-11 px-6 rounded-xl border-2 border-black text-slate-900 font-bold text-sm hover:bg-slate-100 active:scale-95 transition flex items-center justify-center"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-11 px-6 rounded-xl border-2 border-black bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md active:scale-95 transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            حفظ الإعدادات
          </button>
        </div>
      </motion.div>
    </div>
  );
};
