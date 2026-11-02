import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Megaphone, Save, RotateCcw, Plus, Trash2, LayoutTemplate, Eye } from 'lucide-react';
import { getDeviceId } from '../utils/activationManager';
import { PasswordModal } from './PasswordModal';
import { getCachedAdPrivilegeExample } from '../utils/offlineAssetCache';

interface AdvertisingPrivilegeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (slots: { text: string; grade: string }[]) => void;
}

const GRADES_LIST = [
  { id: 'all', label: 'جميع الصفوف' },
  { id: 'all_kg', label: 'جميع صفوف رياض الأطفال' },
  { id: 'all_primary', label: 'جميع صفوف المرحلة الإبتدائية' },
  { id: 'all_prep', label: 'جميع صفوف المرحلة الإعدادية' },
  { id: 'all_secondary', label: 'جميع صفوف المرحلة الثانوية' },
  { id: 'kg1', label: 'رياض الأطفال - KG1' },
  { id: 'kg2', label: 'رياض الأطفال - KG2' },
  { id: 'prim1', label: 'الصف الأول الإبتدائى' },
  { id: 'prim2', label: 'الصف الثانى الإبتدائى' },
  { id: 'prim3', label: 'الصف الثالث الإبتدائى' },
  { id: 'prim4', label: 'الصف الرابع الإبتدائى' },
  { id: 'prim5', label: 'الصف الخامس الإبتدائى' },
  { id: 'prim6', label: 'الصف السادس الإبتدائى' },
  { id: 'prep1', label: 'الصف الأول الإعدادى' },
  { id: 'prep2', label: 'الصف الثانى الإعدادى' },
  { id: 'sec1', label: 'الصف الأول الثانوى' },
  { id: 'sec2', label: 'الصف الثانى الثانوى' },
];

export const AdvertisingPrivilegeModal: React.FC<AdvertisingPrivilegeModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [slots, setSlots] = useState<{ grade: string; text: string }[]>(() => {
    try {
      const saved = localStorage.getItem('sheet_control_ad_slots');
      if (saved) {
        return JSON.parse(saved);
      }
      // النسخة الرسمية: الوضع الافتراضي ON، مع نص افتراضي
      return [{ grade: 'all', text: localStorage.getItem('sheet_control_last_ad_text') || 'تنبيه هام: يرجى مراجعة كافة الدرجات والبيانات قبل طباعة الشهادات والتقارير النهائية.' }];
    } catch {
      return [{ grade: 'all', text: 'تنبيه هام: يرجى مراجعة كافة الدرجات والبيانات قبل طباعة الشهادات والتقارير النهائية.' }];
    }
  });

  const generateFreshAdId = () => {
    let newId = Math.floor(Math.random() * 100) + 201; // 201 to 300
    while (newId === 13) {
      newId = Math.floor(Math.random() * 100) + 201;
    }
    try {
      localStorage.setItem('sheet_control_ad_random_id', String(newId));
    } catch {}
    setRandomId(newId);
    return newId;
  };

  const [enabled, setEnabled] = useState(() => slots.length > 0 && slots.some(s => s.text.trim() !== ''));
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [exampleImage, setExampleImage] = useState<string>('/assets/images/ad_privilege_seat_number_example.jpg');

  useEffect(() => {
    getCachedAdPrivilegeExample().then((url) => {
      if (url) setExampleImage(url);
    });
  }, []);
  const [randomId, setRandomId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sheet_control_ad_random_id');
      const parsed = saved ? parseInt(saved, 10) : 0;
      if (parsed > 0 && parsed !== 13) return parsed;
      const newId = Math.floor(Math.random() * 100) + 201;
      localStorage.setItem('sheet_control_ad_random_id', String(newId));
      return newId;
    } catch {
      return Math.floor(Math.random() * 100) + 201;
    }
  });

  // Check if advertising privilege is already unlocked for the current activation cycle
  const isAlreadyUnlocked = () => {
    try {
      const isTrial = localStorage.getItem('sheet_control_is_trial') === 'true';
      if (isTrial) return true;
      const currentMainId = getDeviceId();
      const unlockedId = localStorage.getItem('sheet_control_ad_unlocked_for_id');
      return unlockedId === String(currentMainId);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('sheet_control_ad_slots');
        setSlots(saved ? JSON.parse(saved) : [{ grade: 'all', text: localStorage.getItem('sheet_control_last_ad_text') || '' }]);
      } catch {
        setSlots([{ grade: 'all', text: '' }]);
      }
      
      setShowPasswordPrompt(false);
      
      // Handle random ID persistence
      let effectiveId = 0;
      try {
        const savedId = localStorage.getItem('sheet_control_ad_random_id');
        const parsed = savedId ? parseInt(savedId, 10) : 0;
        if (parsed > 0 && parsed !== 13) {
          effectiveId = parsed;
        } else {
          effectiveId = Math.floor(Math.random() * 100) + 201; // 201 to 300
          localStorage.setItem('sheet_control_ad_random_id', String(effectiveId));
        }
      } catch {
        effectiveId = Math.floor(Math.random() * 100) + 201;
      }
      setRandomId(effectiveId);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const [errorIndex, setErrorIndex] = useState<number | null>(null);


  const handleSaveAttempt = () => {
    if (isAlreadyUnlocked()) {
      executeSave();
    } else {
      setShowPasswordPrompt(true);
    }
  };

  const executeSave = () => {
    const invalidIndex = slots.findIndex(s => s.grade && !s.text.trim());
    if (invalidIndex !== -1) {
      setErrorIndex(invalidIndex);
      alert('يرجى إدخال نص الإعلان للصف المختار');
      return;
    }
    setErrorIndex(null);
    const activeSlots = enabled ? slots.filter(s => s.text.trim() !== '') : [];
    localStorage.setItem('sheet_control_ad_slots', JSON.stringify(activeSlots));
    onSave(activeSlots);
    onClose();
  };

  const addSlot = () => {
    setSlots([...slots, { grade: '', text: '' }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: 'grade' | 'text', value: string) => {
    const newSlots = [...slots];
    newSlots[index][field] = value;
    setSlots(newSlots);
  };

  const getAvailableGrades = (currentIndex: number) => {
    const selectedGrades = slots
      .map((s, i) => (i !== currentIndex ? s.grade : null))
      .filter(Boolean);
    return GRADES_LIST.filter(g => !selectedGrades.includes(g.id));
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
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-[1209px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-yellow-300 via-red-400 to-teal-400 rounded-3xl p-6 md:p-8 shadow-2xl z-10 border-2 border-black text-slate-900 custom-scrollbar"
          dir="rtl"
        >
          <div className="flex items-start justify-between mb-5">
            <div className="flex flex-col w-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-2xl bg-white/50 border-2 border-black flex items-center justify-center text-slate-900 shrink-0">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h3 className="font-black text-xl text-slate-950">امتياز إعلاني</h3>
              </div>
              <div className="pr-14">
                <p className="text-xs md:text-sm text-white font-bold leading-relaxed">
                  النص الاعلانى الذى يظهر فى تذييل الشهادات وأرقام الجلوس و اخطارات أولياء الأمور - لتعظيم ابرادات المدرسة من خلال تطبيق سمارت شيت كنترول 2026 - 2027 
                </p>
                <div className="pt-2 border-t border-white/40 mt-3" />
                <div className="flex items-center gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => setEnabled(!enabled)}
                    className={`relative w-20 h-9 rounded-full transition-all duration-300 flex items-center p-1 border-2 border-black ${enabled ? 'bg-emerald-600' : 'bg-slate-600'}`}
                  >
                    <div className={`absolute top-0.5 w-7 h-7 rounded-full bg-white border border-black shadow-md transition-all duration-300 ${enabled ? 'right-10' : 'right-0.5'}`} />
                    <span className={`absolute text-white font-black text-xs ${enabled ? 'left-3' : 'right-11'}`}>{enabled ? 'ON' : 'OFF'}</span>
                  </button>
                  <span className="text-xs font-extrabold text-slate-950">{enabled ? 'تم تفعيل الامتياز الإعلاني' : 'متوقف'}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-black/10 hover:bg-black/20 text-slate-950 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={`space-y-4 ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
            {slots.map((slot, index) => (
              <div key={index} className="p-4 bg-white/20 rounded-2xl border border-black/10 relative">
                <div className="flex gap-2">
                  <select
                    value={slot.grade}
                    onChange={(e) => updateSlot(index, 'grade', e.target.value)}
                    className="w-1/3 rounded-2xl border-2 border-black p-3 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-black appearance-none"
                  >
                    <option value="">اختر نطاق تطبيق النص الاعلانى</option>
                    {getAvailableGrades(index).map((g) => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                  <textarea
                    value={slot.text}
                    maxLength={120}
                    onChange={(e) => {
                      updateSlot(index, 'text', e.target.value);
                      if (errorIndex === index) setErrorIndex(null);
                    }}
                    placeholder={[
                      "مثال : على محمد أبو طالب - معلم خبير مادة الرياضيات - 010000000000 - 0110000000000",
                      "مثال : مكتبة الشروق للخدمات التعليمية - 010000000000 - 0110000000000",
                      "مثال : مركز الصفوة لتعليم اللغات والبرمجة - 010000000000 - 0110000000000"
                    ][index % 3]}
                    rows={1}
                    className={`w-2/3 rounded-2xl border-2 p-3 text-[12px] font-semibold text-slate-950 bg-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-black resize-none ${
                      errorIndex === index ? 'border-red-600 ring-2 ring-red-600' : 'border-black'
                    }`}
                  />
                  {slots.length > 1 && (
                    <button onClick={() => removeSlot(index)} className="text-rose-900 hover:text-rose-950 flex items-center justify-center p-2 rounded-xl">
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex flex-col gap-2">
              <button onClick={addSlot} className="py-3 px-6 rounded-xl border-2 border-dashed border-black text-slate-950 font-bold flex items-center gap-2 hover:bg-black/5">
                <Plus className="w-5 h-5" /> إضافة إعلان جديد
              </button>

            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={handleSaveAttempt} 
                className="w-28 md:w-32 py-3 px-3 rounded-xl border-2 border-black bg-slate-950 hover:bg-black text-white font-black text-sm md:text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Save className="w-5 h-5 shrink-0" /> <span>حفظ</span>
              </button>

              <button 
                type="button" 
                onClick={() => setShowExampleModal(true)} 
                className="w-28 md:w-32 py-3 px-3 rounded-xl border-2 border-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-sm md:text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 hover:shadow-amber-500/30 hover:shadow-lg"
                title="عرض نموذج توضيحي للامتياز الإعلاني في بطاقة رقم الجلوس"
              >
                <Eye className="w-5 h-5 shrink-0 text-slate-950" /> <span>مثال</span>
              </button>

              <button 
                type="button" 
                onClick={onClose} 
                className="w-28 md:w-32 py-3 px-3 rounded-xl border-2 border-black bg-white/50 hover:bg-white/70 text-slate-950 font-bold text-sm md:text-base transition-colors flex items-center justify-center cursor-pointer active:scale-95"
              >
                إلغاء
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* نافذة عرض نموذج الامتياز الإعلاني - خلفيتها صورة المرفق */}
      <AnimatePresence>
        {showExampleModal && (
          <div 
            className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-slate-950/85 backdrop-blur-md"
            dir="rtl"
            onClick={() => setShowExampleModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl rounded-2xl md:rounded-3xl border-3 border-amber-400 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
              style={{
                backgroundImage: `url(${exampleImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                aspectRatio: '1550 / 760',
              }}
            >
              {/* شريط تحكم علوي أنيق طافٍ فوق الخلفية */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-400/50 text-white text-xs md:text-sm font-black shadow-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>نموذج توضيحي: بطاقة رقم الجلوس مع الامتياز الإعلاني</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExampleModal(false)}
                  className="pointer-events-auto w-9 h-9 flex items-center justify-center rounded-full bg-slate-950/85 hover:bg-black text-white hover:text-amber-300 transition-all border border-white/20 shadow-xl cursor-pointer active:scale-90"
                  aria-label="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* شريط توجيهي طافٍ بالتذييل يبرز السطر الإعلاني أسفل البطاقة */}
              <div className="absolute bottom-3 right-3 left-3 flex items-center justify-center pointer-events-none z-10">
                <div className="pointer-events-auto px-4 py-1.5 rounded-xl bg-amber-500/95 text-slate-950 font-black text-[11px] md:text-xs shadow-xl border border-black/30 backdrop-blur-sm flex items-center gap-2">
                  <span>مكان ظهور النص الإعلاني بالتذييل أسفل بطاقات أرقام الجلوس والشهادات واخطارات أولياء الأمور</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <PasswordModal
        isOpen={showPasswordPrompt}
        onClose={() => setShowPasswordPrompt(false)}
        onSuccess={() => {
          // Unlock for the current main activation cycle
          localStorage.setItem('sheet_control_ad_unlocked_for_id', String(getDeviceId()));
          // Clear the persisted random ID now that it's been used successfully
          localStorage.removeItem('sheet_control_ad_random_id');
          setShowPasswordPrompt(false);
          executeSave();
        }}
        deviceIdOverride={randomId}
        skipActivation={true}
        isVipOption={true}
        vipOptionTitle="VIP Option"
        customWhatsappMessage="السلام عليكم .. أود تفعيل الامتياز الإعلاني - معرف جهازي :"
      />
    </>
  );
};


