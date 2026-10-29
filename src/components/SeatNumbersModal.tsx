import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Award } from 'lucide-react';
import { PdfReportType } from '../utils/exportPdf';
import { ActionMenuButton } from './ActionMenuButton';

interface SeatNumbersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (reportType: PdfReportType) => void;
  isEnglish?: boolean;
}

export const SeatNumbersModal: React.FC<SeatNumbersModalProps> = ({
  isOpen,
  onClose,
  onSelectModel,
  isEnglish = false,
}) => {
  if (!isOpen) return null;

  const models: {
    reportType: PdfReportType;
    englishReportType: PdfReportType;
    label: string;
    labelEn: string;
    bgGradient: string;
  }[] = [
    {
      reportType: 'seat_numbers_default',
      englishReportType: 'seat_numbers_english_default',
      label: 'النموذج الافتراضى',
      labelEn: 'Default Model',
      bgGradient: 'bg-[linear-gradient(to_right,#0f2942,#1e40af,#0f2942)]',
    },
    {
      reportType: 'seat_numbers_model_2',
      englishReportType: 'seat_numbers_english_model_2',
      label: 'نموذج 2',
      labelEn: 'Model 2',
      bgGradient: 'bg-[linear-gradient(to_right,#701a2e,#991b1b,#701a2e)]',
    },
    {
      reportType: 'seat_numbers_model_3',
      englishReportType: 'seat_numbers_english_model_3',
      label: 'نموذج 3',
      labelEn: 'Model 3',
      bgGradient: 'bg-[linear-gradient(to_right,#064e3b,#059669,#064e3b)]',
    },
    {
      reportType: 'seat_numbers_model_4',
      englishReportType: 'seat_numbers_english_model_4',
      label: 'نموذج 4',
      labelEn: 'Model 4',
      bgGradient: 'bg-[linear-gradient(to_right,#4c1d95,#7c3aed,#4c1d95)]',
    },
    {
      reportType: 'seat_numbers_model_5',
      englishReportType: 'seat_numbers_english_model_5',
      label: 'نموذج 5',
      labelEn: 'Model 5',
      bgGradient: 'bg-[linear-gradient(to_right,#0f172a,#0284c7,#0f172a)]',
    },
    {
      reportType: 'seat_numbers_model_6',
      englishReportType: 'seat_numbers_english_model_6',
      label: 'نموذج 6',
      labelEn: 'Model 6',
      bgGradient: 'bg-[linear-gradient(to_right,#451a03,#b45309,#451a03)]',
    },
    {
      reportType: 'seat_numbers_model_7',
      englishReportType: 'seat_numbers_english_model_7',
      label: 'نموذج 7',
      labelEn: 'Model 7',
      bgGradient: 'bg-[linear-gradient(to_right,#831843,#be123c,#831843)]',
    },
  ];

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-[500px] overflow-hidden"
        >
          {/* Animated gradient ring */}
          <div
            className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#f59e0b,#3b82f6,#10b981,#d946ef,#f59e0b)] bg-[length:200%_auto] animate-shine opacity-90"
            style={{ zIndex: 0, margin: '-6px', animationDuration: '10s' }}
          ></div>

          <div className="bg-white rounded-[22px] p-6 relative z-10 max-h-[88vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    {isEnglish ? 'نماذج أرقام الجلوس (English)' : 'نماذج أرقام الجلوس'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Models list */}
            <div className="flex flex-col gap-3 my-4 overflow-y-auto custom-scrollbar pr-1 pl-1 max-h-[65vh]">
              {models.map((m) => (
                <ActionMenuButton
                  key={m.reportType}
                  onClick={() => {
                    onClose();
                    onSelectModel(isEnglish ? m.englishReportType : m.reportType);
                  }}
                  icon={<Printer className="w-4 h-4 shrink-0" />}
                  text={isEnglish ? `${m.labelEn} - ${m.label}` : m.label}
                  bgGradient={m.bgGradient}
                  className="!h-[50px] !text-[17px] shadow-md hover:brightness-105 active:scale-[0.99] transition-all"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
