import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import shortcutImg from '/asd1234.jpg';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-[75vw] h-[75vh] bg-white rounded-3xl shadow-2xl relative p-2 overflow-hidden border-4 border-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-900/50 hover:bg-slate-900/70 text-white rounded-full transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={shortcutImg} 
              alt="شرح إنشاء الاختصار" 
              className="w-full h-full object-contain rounded-2xl"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
