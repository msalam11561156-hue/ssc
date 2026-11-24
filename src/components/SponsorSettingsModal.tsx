import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FAST_MODAL_FLIP, FAST_BACKDROP_FADE } from '../utils/flipAnimation';
import { Clock, CheckCircle2, X, Eye } from 'lucide-react';
import { getBrandShieldSync } from '../utils/offlineAssetCache';

export type SponsorScheduleInterval = '1m' | '10m' | '30m' | '60m';

interface SponsorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentInterval: SponsorScheduleInterval;
  onSave: (interval: SponsorScheduleInterval) => void;
  onPreview?: () => void;
}

const SPONSOR_TIMING_OPTIONS: { id: SponsorScheduleInterval; label: string }[] = [
  { id: '1m', label: 'كل دقيقة' },
  { id: '10m', label: 'كل 10 دقائق' },
  { id: '30m', label: 'كل 30 دقيقة' },
  { id: '60m', label: 'كل ساعة' },
];

export const SponsorSettingsModal: React.FC<SponsorSettingsModalProps> = ({
  isOpen,
  onClose,
  currentInterval,
  onSave,
  onPreview,
}) => {
  const [selected, setSelected] = useState<SponsorScheduleInterval>(currentInterval);

  useEffect(() => {
    if (isOpen) {
      setSelected(currentInterval);
    }
  }, [isOpen, currentInterval]);

  const handleConfirm = () => {
    onSave(selected);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 font-arabic"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sponsor-settings-title"
      >
        <motion.div
          {...FAST_BACKDROP_FADE}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          {...FAST_MODAL_FLIP}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl z-10 overflow-hidden border-2 border-black flex flex-col max-h-[90vh]"
        >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#071124] via-[#0d1f42] to-[#081226] text-white flex items-center justify-between border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-amber-400/40 flex items-center justify-center shrink-0">
              <img
                src={getBrandShieldSync()}
                alt="SMART CONTROL"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallbackTried) {
                    img.dataset.fallbackTried = '1';
                    img.src = '/brand_shield.png';
                  }
                }}
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest leading-none mb-1" dir="ltr">
                SMART CONTROL 0.1
              </div>
              <h3 id="sponsor-settings-title" className="font-black text-lg leading-tight">
                تظهر نافذة هذا البرنامج برعاية
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-labelledby="sponsor-settings-title">
            {SPONSOR_TIMING_OPTIONS.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelected(opt.id)}
                  className={`w-full p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    isSelected
                      ? 'border-black bg-amber-50 shadow-md ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-black bg-amber-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="font-bold text-base text-slate-900">{opt.label}</span>
                  </div>
                  <Clock className={`w-5 h-5 ${isSelected ? 'text-amber-700' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t-2 border-black flex items-center justify-end gap-2.5 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 sm:px-6 rounded-xl border-2 border-black text-slate-900 font-bold text-sm hover:bg-slate-100 active:scale-95 transition flex items-center justify-center whitespace-nowrap cursor-pointer"
          >
            إلغاء
          </button>
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className="h-11 px-5 sm:px-6 rounded-xl border-2 border-black bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-sm hover:shadow active:scale-95 transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              معاينة
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className="h-11 px-5 sm:px-6 rounded-xl border-2 border-black bg-gradient-to-r from-[#0b1d3a] to-[#132f5c] hover:from-[#0f274d] hover:to-[#183b73] text-amber-300 font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            حفظ الإعدادات
          </button>
        </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
