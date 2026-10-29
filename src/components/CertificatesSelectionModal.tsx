import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { Award, Trophy, X } from 'lucide-react';
import { ActionMenuButton } from './ActionMenuButton';

interface CertificatesSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopTen: () => void;
  onSelectTopTenDamg: () => void;
  onSelectAllStudents: () => void;
}

const PortalModal = ({ children }: { children: React.ReactNode }) => {
  return typeof document !== 'undefined' ? createPortal(children, document.body) : <>{children}</>;
};

export const CertificatesSelectionModal: React.FC<CertificatesSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectTopTen,
  onSelectTopTenDamg,
  onSelectAllStudents,
}) => {
  return (
    <PortalModal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 [perspective:1000px]" dir="rtl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-[32px] p-1 shadow-2xl w-full max-w-[480px] z-10"
            >
              <div className="absolute inset-0 rounded-[32px] bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-8px', animationDuration: '15s' }}></div>
              <div className="bg-white rounded-[26px] p-8 flex flex-col gap-4 relative z-10">
                
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-yellow-600 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-yellow-500/20 flex items-center justify-center">
                    <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                      <Award className="w-8 h-8 text-yellow-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mt-2">شهادات التقدير</h3>
                  <div className="w-24 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent rounded-full" />
                </div>

                <div className="flex flex-col gap-3.5">
                  <ActionMenuButton
                    onClick={() => {
                      onClose();
                      onSelectTopTen();
                    }}
                    icon={<Trophy className="w-5 h-5 text-white" />}
                    text="شهادات تقدير العشرة الأوائل"
                    bgGradient="bg-[linear-gradient(to_right,#ca8a04,#eab308,#ca8a04)]"
                  />

                  <ActionMenuButton
                    onClick={() => {
                      onClose();
                      onSelectTopTenDamg();
                    }}
                    icon={<Trophy className="w-5 h-5 text-white" />}
                    text="شهادات تقدير العشرة الأوائل - دمج"
                    bgGradient="bg-[linear-gradient(to_right,#d97706,#f59e0b,#d97706)]"
                  />

                  <ActionMenuButton
                    onClick={() => {
                      onClose();
                      onSelectAllStudents();
                    }}
                    icon={<Award className="w-5 h-5 text-white" />}
                    text="شهادات تقدير جميع الطلاب"
                    bgGradient="bg-[linear-gradient(to_right,#3b82f6,#8b5cf6,#3b82f6)]"
                  />
                </div>

                {/* Close Button */}
                <div className="relative mt-4 pt-6 flex justify-center w-full shrink-0">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-100 overflow-hidden rounded-full">
                    <div className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine" style={{ animationDuration: '3s' }}></div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg border border-slate-900/10 transition-all hover:scale-110 active:scale-95 flex items-center justify-center group"
                    title="إغلاق"
                  >
                    <X className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PortalModal>
  );
};
