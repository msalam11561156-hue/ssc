import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Clock, CheckCircle2, X } from 'lucide-react';

interface BackupReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentInterval: string;
  onSave: (interval: string) => void;
}

export const BackupReminderModal: React.FC<BackupReminderModalProps> = ({
  isOpen,
  onClose,
  currentInterval,
  onSave,
}) => {
  const [selected, setSelected] = useState<string>(currentInterval);

  if (!isOpen) return null;

  const options = [
    { id: 'off', label: 'إيقاف' },
    { id: '1m', label: 'كل دقيقة' },
    { id: '10m', label: 'كل 10 دقائق' },
    { id: '30m', label: 'كل 30 دقيقة' },
    { id: '1h', label: 'كل ساعة' },
    { id: '2h', label: 'كل ساعتين' },
    { id: '1d', label: 'كل يوم' },
  ];

  const handleConfirm = () => {
    onSave(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl z-10 overflow-hidden border-2 border-black flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <h3 className="font-black text-lg">إشعار حفظ النسخة الاحتياطية</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 gap-2.5">
            {options.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelected(opt.id)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-black bg-sky-50 shadow-md ring-2 ring-sky-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-black bg-sky-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">{opt.label}</div>
                    </div>
                  </div>
                  <Clock className={`w-4 h-4 ${isSelected ? 'text-sky-700' : 'text-slate-400'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t-2 border-black flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-xl border-2 border-black text-slate-900 font-bold text-sm hover:bg-slate-100 active:scale-95 transition flex items-center justify-center"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-11 px-6 rounded-xl border-2 border-black bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            حفظ إعدادات الإشعار
          </button>
        </div>
      </motion.div>
    </div>
  );
};
