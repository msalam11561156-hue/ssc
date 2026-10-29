import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock } from 'lucide-react';
import { 
  verifyActivationPassword, 
  getDeviceId 
} from '../utils/activationManager';
import { PasswordModal } from './PasswordModal';

interface FooterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const FooterSettingsModal: React.FC<FooterSettingsModalProps> = ({
  isOpen,
  onClose,
  enabled,
  onToggle,
}) => {
  const generateFreshFooterId = () => {
    let newId = Math.floor(Math.random() * 101) + 100;
    while (newId === 13) {
      newId = Math.floor(Math.random() * 101) + 100;
    }
    try {
      localStorage.setItem('sheet_control_footer_random_id', String(newId));
    } catch {}
    setRandomId(newId);
    return newId;
  };

  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [randomId, setRandomId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sheet_control_footer_random_id');
      const parsed = saved ? parseInt(saved, 10) : 0;
      if (parsed > 0 && parsed !== 13) return parsed;
      const newId = Math.floor(Math.random() * 101) + 100;
      localStorage.setItem('sheet_control_footer_random_id', String(newId));
      return newId;
    } catch {
      return Math.floor(Math.random() * 101) + 100;
    }
  });

  // Check if footer settings are already unlocked for the current activation cycle
  const isAlreadyUnlocked = () => {
    try {
      const isTrial = localStorage.getItem('sheet_control_is_trial') === 'true';
      if (isTrial) return true;
      const currentMainId = getDeviceId();
      const unlockedId = localStorage.getItem('sheet_control_footer_unlocked_for_id');
      return unlockedId === String(currentMainId);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setShowPasswordPrompt(false);
      
      let effectiveId = 0;
      try {
        const saved = localStorage.getItem('sheet_control_footer_random_id');
        const parsed = saved ? parseInt(saved, 10) : 0;
        if (parsed > 0 && parsed !== 13) {
          effectiveId = parsed;
        } else {
          effectiveId = Math.floor(Math.random() * 101) + 100;
          localStorage.setItem('sheet_control_footer_random_id', String(effectiveId));
        }
      } catch {
        effectiveId = Math.floor(Math.random() * 101) + 100;
      }
      
      setRandomId(effectiveId);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleClick = () => {
    if (isAlreadyUnlocked()) {
      onToggle(!enabled);
    } else {
      setShowPasswordPrompt(true);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-[634px] bg-white rounded-3xl p-6 shadow-2xl z-10 overflow-hidden"
          dir="rtl"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-black text-lg text-slate-900">تذييل التقارير الإفتراضي</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                هذه النافذة تستخدم لحذف السطر الأخير الموجود فى اسفل كل التقارير والمستندات والشهادات ... أو البقاء عليه
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          
          <div className="mb-6">
            <div className="pt-2 border-t-2 border-black mb-4" />
            <div className="font-bold text-sm text-slate-900 text-center whitespace-nowrap">
              المنظومة الرقمية لريادة أعمال المدارس المصرية 01098594956 - 01131097055
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-2 gap-6">
            <button 
              onClick={handleToggleClick} 
              className={`relative w-24 h-12 rounded-full transition-all duration-300 flex items-center p-1 ${
                enabled ? 'bg-green-500' : 'bg-gray-400'
              }`}
            >
              <div className={`absolute top-1 w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-500 border border-gray-600 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_-2px_4px_rgba(255,255,255,0.5)] transition-all duration-300 ${
                enabled ? 'right-13' : 'right-1'
              }`} />
              <span className={`absolute text-white font-bold text-xs ${enabled ? 'left-4' : 'right-14'}`}>
                {enabled ? 'ON' : 'OFF'}
              </span>
              {!isAlreadyUnlocked() && (
                <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1 rounded-full border border-white shadow-sm">
                  <Lock className="w-3 h-3" />
                </div>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      <PasswordModal
        isOpen={showPasswordPrompt}
        onClose={() => setShowPasswordPrompt(false)}
        onSuccess={() => {
          // Unlock for the current main activation cycle
          localStorage.setItem('sheet_control_footer_unlocked_for_id', String(getDeviceId()));
          // Clear the persisted random ID now that it's been used successfully
          localStorage.removeItem('sheet_control_footer_random_id');
          setShowPasswordPrompt(false);
          onToggle(!enabled);
        }}
        deviceIdOverride={randomId}
        skipActivation={true}
        isVipOption={true}
        vipOptionTitle="VIP Option"
        customWhatsappMessage="السلام عليكم .. أود الغاء تذييل التقارير الافتراضى - معرف جهازي :"
      />
    </>
  );
};

