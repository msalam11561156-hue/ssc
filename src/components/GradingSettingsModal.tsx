import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { Sliders, Lock, Unlock, Eye, EyeOff, Check, X, ShieldAlert, KeyRound, User, Hash, AlertCircle, TrendingUp, Percent, BookOpen } from 'lucide-react';
import { 
  GradingSettings, 
  BACKUP_PASSWORD, 
  getGradingSettings, 
  saveGradingSettings,
  getPrimaryStudentMercyBoosts
} from '../utils/gradingSettings';
import { getSubjectsConfigForStageGrade } from '../utils/exportPdf';
import { StudentData } from '../types';

interface GradingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
  stage?: string;
  semester?: string;
  selectedGrade?: string;
  students?: StudentData[];
  customCols?: any[];
  defaultSubjectsOverrides?: Record<string, any>;
  onSaved?: (settings: GradingSettings) => void;
  mercyOnly?: boolean;
}

const PortalModal = ({ children }: { children: React.ReactNode }) => {
  return typeof document !== 'undefined' ? createPortal(children, document.body) : <>{children}</>;
};

export const GradingSettingsModal: React.FC<GradingSettingsModalProps> = ({
  isOpen,
  onClose,
  lang,
  stage,
  semester,
  selectedGrade,
  students,
  customCols,
  defaultSubjectsOverrides,
  onSaved,
  mercyOnly = false,
}) => {
  const isFirstSemester = semester === 'first' || semester === 'الفصل الدراسي الأول';
  const hasMercyRules = mercyOnly || ((stage === 'primary' || stage === 'middle' || stage === 'prep' || stage === 'secondary') && !isFirstSemester);
  const [currentSettings, setCurrentSettings] = useState<GradingSettings>(() => getGradingSettings(stage, selectedGrade));
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  // Unlock view state
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // Edit view state
  const [showName, setShowName] = useState(true);
  const [showSeatNumber, setShowSeatNumber] = useState(true);
  const [showSecretNumber, setShowSecretNumber] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Mercy rules modal state
  const [isMercyModalOpen, setIsMercyModalOpen] = useState(false);
  const [isMercyEnabled, setIsMercyEnabled] = useState<boolean>(false);
  const [mercyMaxSubjects, setMercyMaxSubjects] = useState<string>('2');
  const [mercyMaxPercentage, setMercyMaxPercentage] = useState<string>('10');
  const [mercyTargetScreen, setMercyTargetScreen] = useState<'written' | 'assessments'>('written');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const s = getGradingSettings(stage, selectedGrade);
      setCurrentSettings(s);
      setShowName(s.showName);
      setShowSeatNumber(s.showSeatNumber);
      setShowSecretNumber(s.showSecretNumber);
      setPassword(s.password || '');
      setConfirmPassword(s.password || '');
      setIsMercyEnabled(s.isMercyEnabled ?? false);
      setMercyMaxSubjects(String(Math.min(20, Math.max(0, Number(s.mercyMaxSubjects ?? 2)))));
      setMercyMaxPercentage(String(Math.min(50, Math.max(0, Number(s.mercyMaxPercentage ?? 10)))));
      setMercyTargetScreen(s.mercyTargetScreen === 'assessments' ? 'assessments' : 'written');
      setIsMercyModalOpen(Boolean(mercyOnly));
      setUnlockPassword('');
      setUnlockError('');
      setSaveError('');

      // If already locked with a password, user must unlock first
      if (s.isLocked && s.password) {
        setIsUnlocked(false);
      } else {
        setIsUnlocked(true);
      }
    }
  }, [isOpen, stage, selectedGrade]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockPassword === BACKUP_PASSWORD || (currentSettings.password && unlockPassword === currentSettings.password)) {
      setIsUnlocked(true);
      setUnlockError('');
    } else {
      setUnlockError('كلمة المرور غير صحيحة!');
    }
  };

  const applyMercySettings = (
    nextEnabled: boolean,
    nextMaxSubjStr: string,
    nextMaxPctStr: string
  ) => {
    const parsedMaxSubj = Math.min(20, Math.max(0, parseInt(nextMaxSubjStr, 10) || 0));
    const parsedMaxPct = Math.min(50, Math.max(0, parseInt(nextMaxPctStr, 10) || 0));

    const updatedSettings: GradingSettings = {
      ...currentSettings,
      showName,
      showSeatNumber,
      showSecretNumber,
      password: password.trim(),
      isLocked: Boolean(password.trim()),
      isMercyEnabled: nextEnabled,
      mercyMaxSubjects: parsedMaxSubj,
      mercyMaxPercentage: parsedMaxPct,
      mercyTargetScreen,
    };

    saveGradingSettings(updatedSettings, stage, selectedGrade);
    setCurrentSettings(updatedSettings);
    if (onSaved) {
      onSaved(updatedSettings);
    }
  };

  const handleCloseMercyModal = () => {
    applyMercySettings(isMercyEnabled, mercyMaxSubjects, mercyMaxPercentage);
    setIsMercyModalOpen(false);
    if (mercyOnly) {
      onClose();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');

    // Must have at least one field enabled
    if (!showName && !showSeatNumber && !showSecretNumber) {
      setSaveError('يجب تحديد وسيلة واحدة على الأقل للرصد (الاسم، رقم الجلوس، أو الرقم السري)!');
      return;
    }

    // Password validation if entered
    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        setSaveError('كلمة المرور وتأكيد كلمة المرور غير متطابقين!');
        return;
      }
    }

    const parsedMaxSubj = Math.min(20, Math.max(0, parseInt(mercyMaxSubjects, 10) || 0));
    const parsedMaxPct = Math.min(50, Math.max(0, parseInt(mercyMaxPercentage, 10) || 0));

    const newSettings: GradingSettings = {
      showName,
      showSeatNumber,
      showSecretNumber,
      password: password.trim(),
      isLocked: Boolean(password.trim()),
      isMercyEnabled,
      mercyMaxSubjects: parsedMaxSubj,
      mercyMaxPercentage: parsedMaxPct,
      mercyTargetScreen,
    };

    saveGradingSettings(newSettings, stage, selectedGrade);
    setCurrentSettings(newSettings);
    if (onSaved) {
      onSaved(newSettings);
    }
    onClose();
  };

  const toggleCheckbox = (type: 'name' | 'seat' | 'secret') => {
    setSaveError('');
    if (type === 'name') {
      if (showName && !showSeatNumber && !showSecretNumber) {
        setSaveError('يجب الإبقاء على وسيلة واحدة على الأقل للرصد!');
        return;
      }
      setShowName(!showName);
    } else if (type === 'seat') {
      if (showSeatNumber && !showName && !showSecretNumber) {
        setSaveError('يجب الإبقاء على وسيلة واحدة على الأقل للرصد!');
        return;
      }
      setShowSeatNumber(!showSeatNumber);
    } else if (type === 'secret') {
      if (showSecretNumber && !showName && !showSeatNumber) {
        setSaveError('يجب الإبقاء على وسيلة واحدة على الأقل للرصد!');
        return;
      }
      setShowSecretNumber(!showSecretNumber);
    }
  };

  if (!isOpen) return null;

  return (
    <PortalModal>
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          {!mercyOnly && (
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-[4px] flex flex-col"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            {/* Spinning animated border */}
            <div className="absolute inset-[-100%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />
            
            {/* Modal Card Body */}
            <div className="relative bg-[linear-gradient(135deg,#f0fdf4,#dcfce7,#ecfdf5,#f0fdf4)] bg-[length:300%_300%] animate-shine rounded-[26px] w-full h-full border border-white/60 p-6 sm:p-8">
              
              {/* Close button at top */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 left-4 rtl:left-4 rtl:right-auto ltr:right-4 ltr:left-auto w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-red-600 flex items-center justify-center transition-all shadow-sm border border-slate-200 z-20"
              >
                <X className="w-5 h-5" />
              </button>

              {/* View 1: Locked Settings View */}
              {!isUnlocked ? (
                <form onSubmit={handleUnlock} className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
                    <Lock className="w-8 h-8 animate-bounce" />
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-2">
                    {hasMercyRules ? 'إعدادات الرصد والتحرير والرأفة محمية' : 'إعدادات الرصد والتحرير محمية'}
                  </h3>
                  <p className="text-sm font-semibold text-slate-600 mb-6 max-w-sm">
                    تم قفل هذه الإعدادات بكلمة مرور لمنع التعديل غير المصرح به. يرجى إدخال كلمة المرور للمتابعة وتعديل الخيارات.
                  </p>

                  <div className="w-full text-right mb-4">
                    <label className="block text-sm font-bold text-slate-800 mb-1.5">
                      كلمة المرور لفتح الإعدادات :
                    </label>
                    <div className="relative">
                      <input
                        type={showUnlockPassword ? 'text' : 'password'}
                        value={unlockPassword}
                        onChange={(e) => { setUnlockPassword(e.target.value); setUnlockError(''); }}
                        placeholder="أدخل كلمة المرور..."
                        autoFocus
                        className="w-full bg-white/90 border-2 border-slate-800 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                        className="absolute left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                      >
                        {showUnlockPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="flex justify-start mt-2 px-1">
                      <a
                        href="https://wa.me/201098594956"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline transition-colors"
                      >
                        <svg className="w-4 h-4 fill-emerald-600 shrink-0" viewBox="0 0 24 24">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.976.58 1.96.924 3.149.924 3.182 0 5.767-2.587 5.767-5.766.001-3.187-2.575-5.766-5.767-5.766zm10.169 5.766c0 5.626-4.577 10.198-10.2 10.198-1.785 0-3.483-.464-4.968-1.282l-5.632 1.48 1.505-5.496a10.088 10.088 0 0 1-1.305-4.9c0-5.627 4.578-10.199 10.2-10.199 5.623 0 10.2 4.572 10.2 10.199z"/>
                        </svg>
                        <span>نسيت كلمة المرور</span>
                      </a>
                    </div>
                  </div>

                  {unlockError && (
                    <div className="w-full flex items-center gap-2 p-3 bg-red-100/90 border border-red-400 rounded-xl text-red-700 text-xs font-bold mb-4">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{unlockError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 w-full mt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-[linear-gradient(to_right,#059669,#10b981,#059669)] bg-[length:200%_auto] animate-shine text-white font-black py-3 px-4 rounded-xl border border-slate-900 shadow-md hover:brightness-105 active:scale-95 transition-all text-base flex items-center justify-center gap-2"
                    >
                      <Unlock className="w-5 h-5" />
                      فتح وتعديل الإعدادات
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-5 rounded-xl border border-slate-400 transition-all text-base"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                /* View 2: Edit Settings View */
                <form onSubmit={handleSave} className="flex flex-col">
                  {/* Header */}
                  <div className="text-center mb-5">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-600 text-emerald-700 mb-2 shadow-inner">
                      <Sliders className="w-6 h-6" />
                    </div>
                    <motion.h3 
                      animate={{ rotate: [-1, 1, -1] }} 
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} 
                      className="text-2xl font-black text-emerald-950 drop-shadow-sm"
                    >
                      {hasMercyRules ? 'إعدادات الرصد والتحرير والرأفة' : 'اعدادات الرصد والتحرير'}
                    </motion.h3>
                    <p className="text-xs font-bold text-emerald-800 mt-1">
                      حدد أعمدة الرصد المراد إظهارها في الجدول واحفظها بكلمة مرور
                    </p>
                    <div className="h-1 w-full bg-[linear-gradient(90deg,#059669,#6ee7b7,#ffffff,#6ee7b7,#059669)] bg-[length:200%_100%] animate-shine shadow-[0_0_8px_rgba(16,185,129,0.4)] rounded-full mt-3" style={{ animationDuration: "5s" }} />
                  </div>

                  {/* Checkboxes List */}
                  <div className="flex flex-col gap-2.5 mb-4">
                    {/* Checkbox 1: الرصد بالاسم */}
                    <label
                      onClick={(e) => { e.preventDefault(); toggleCheckbox('name'); }}
                      className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        showName 
                          ? 'bg-white/95 border-emerald-600 shadow-md text-emerald-950' 
                          : 'bg-white/50 border-slate-300 opacity-60 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${showName ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div className="font-black text-base">الرصد بالاسم</div>
                      </div>
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${showName ? 'bg-emerald-600 border-emerald-700 text-white' : 'border-slate-400 bg-white'}`}>
                        {showName && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </label>

                    {/* Checkbox 2: الرصد برقم الجلوس */}
                    <label
                      onClick={(e) => { e.preventDefault(); toggleCheckbox('seat'); }}
                      className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        showSeatNumber 
                          ? 'bg-white/95 border-emerald-600 shadow-md text-emerald-950' 
                          : 'bg-white/50 border-slate-300 opacity-60 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${showSeatNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          <Hash className="w-4 h-4" />
                        </div>
                        <div className="font-black text-base">الرصد برقم الجلوس</div>
                      </div>
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${showSeatNumber ? 'bg-emerald-600 border-emerald-700 text-white' : 'border-slate-400 bg-white'}`}>
                        {showSeatNumber && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </label>

                    {/* Checkbox 3: الرصد بالرقم السري */}
                    <label
                      onClick={(e) => { e.preventDefault(); toggleCheckbox('secret'); }}
                      className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        showSecretNumber 
                          ? 'bg-white/95 border-emerald-600 shadow-md text-emerald-950' 
                          : 'bg-white/50 border-slate-300 opacity-60 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${showSecretNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div className="font-black text-base">الرصد بالرقم السري</div>
                      </div>
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${showSecretNumber ? 'bg-emerald-600 border-emerald-700 text-white' : 'border-slate-400 bg-white'}`}>
                        {showSecretNumber && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </label>
                  </div>

                  {/* زر قواعد الرأفة للمراحل الابتدائية والإعدادية والثانوية */}
                  {hasMercyRules && (
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => setIsMercyModalOpen(true)}
                        className="w-full bg-[linear-gradient(to_right,#15803d,#16a34a,#22c55e,#16a34a,#15803d)] bg-[length:200%_auto] animate-shine text-white font-black py-3.5 px-4 rounded-xl border-2 border-slate-900 shadow-md hover:brightness-105 active:scale-95 transition-all text-base flex items-center justify-center gap-2.5"
                      >
                        <TrendingUp className="w-5 h-5 stroke-[2.75]" />
                        <span>قواعد الرأفة</span>
                      </button>
                    </div>
                  )}

                  {/* Password Protection Section */}
                  <div className="bg-emerald-900/5 border border-emerald-900/20 rounded-2xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="w-4 h-4 text-emerald-800" />
                      <span className="text-sm font-black text-emerald-950">
                        حفظ الإعدادات
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">
                      {/* كلمة المرور لحفظ الاعدادات */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          كلمة المرور لحفظ الاعدادات
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setSaveError(''); }}
                            placeholder="أدخل كلمة المرور..."
                            className="w-full bg-white/90 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute left-2.5 rtl:left-2.5 rtl:right-auto ltr:right-2.5 ltr:left-auto top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* تأكيد كلمة المرور */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          تأكيد كلمة المرور
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setSaveError(''); }}
                            placeholder="أعد إدخال كلمة المرور..."
                            className="w-full bg-white/90 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute left-2.5 rtl:left-2.5 rtl:right-auto ltr:right-2.5 ltr:left-auto top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {saveError && (
                    <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-400 rounded-xl text-red-700 text-xs font-bold mb-4">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 mt-1">
                    <button
                      type="submit"
                      className="flex-1 bg-[linear-gradient(to_right,#059669,#10b981,#059669)] bg-[length:200%_auto] animate-shine text-white font-black py-3 px-4 rounded-xl border border-slate-900 shadow-md hover:brightness-105 active:scale-95 transition-all text-base flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      حفظ الإعدادات
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-5 rounded-xl border border-slate-400 transition-all text-base"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}

            </div>
          </motion.div>
          )}

          {/* نافذة اعدادات رفع درجات الطلاب - الرأفة */}
          {((hasMercyRules && isMercyModalOpen) || mercyOnly) && (
            <div
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={handleCloseMercyModal}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden p-[4px] flex flex-col"
              >
                <div className="absolute inset-[-100%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />

                <div className="relative bg-[linear-gradient(135deg,#f0fdf4,#dcfce7,#ecfdf5,#f0fdf4)] bg-[length:300%_300%] animate-shine rounded-[26px] w-full h-full border border-white/60 p-6 sm:p-7 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-600 text-emerald-700 mb-2 shadow-inner">
                        <TrendingUp className="w-6 h-6 stroke-[2.75]" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-emerald-950 drop-shadow-sm">
                        اعدادات رفع درجات الطلاب - الرأفة
                      </h3>
                      <div
                        className="h-1 w-full bg-[linear-gradient(90deg,#059669,#6ee7b7,#ffffff,#6ee7b7,#059669)] bg-[length:200%_100%] animate-shine shadow-[0_0_8px_rgba(16,185,129,0.4)] rounded-full mt-3"
                        style={{ animationDuration: '5s' }}
                      />
                    </div>

                    {/* أول حقلين في النافذة: تفعيل درجات الرأفة / الغاء تفعيل درجات الرأفة */}
                    <div className="flex flex-col gap-2.5 mb-3">
                      <label
                        onClick={(e) => {
                          e.preventDefault();
                          setIsMercyEnabled(true);
                          applyMercySettings(true, mercyMaxSubjects, mercyMaxPercentage);
                        }}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                          isMercyEnabled
                            ? 'bg-white/95 border-emerald-700 shadow-md text-emerald-950'
                            : 'bg-white/60 border-slate-300 opacity-70 text-slate-600'
                        }`}
                      >
                        <div className="font-black text-sm sm:text-base">تفعيل درجات الرأفة</div>
                        <div
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            isMercyEnabled
                              ? 'bg-emerald-600 border-emerald-700 text-white'
                              : 'border-slate-400 bg-white'
                          }`}
                        >
                          {isMercyEnabled && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </label>

                      <label
                        onClick={(e) => {
                          e.preventDefault();
                          setIsMercyEnabled(false);
                          applyMercySettings(false, mercyMaxSubjects, mercyMaxPercentage);
                        }}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                          !isMercyEnabled
                            ? 'bg-white/95 border-emerald-700 shadow-md text-emerald-950'
                            : 'bg-white/60 border-slate-300 opacity-70 text-slate-600'
                        }`}
                      >
                        <div className="font-black text-sm sm:text-base">الغاء تفعيل درجات الرأفة</div>
                        <div
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            !isMercyEnabled
                              ? 'bg-emerald-600 border-emerald-700 text-white'
                              : 'border-slate-400 bg-white'
                          }`}
                        >
                          {!isMercyEnabled && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </label>
                    </div>

                    {/* الحقول التالية يتم إلغاء تفعيلها عند اختيار الغاء تفعيل درجات الرأفة */}
                    <div className={`flex flex-col transition-all ${!isMercyEnabled ? 'opacity-50 pointer-events-none select-none grayscale-[40%]' : ''}`}>
                      {/* عدد المواد التى يمكن رفع درجات الطالب فيها */}
                      <div className="bg-white/90 border-2 border-emerald-700 rounded-2xl p-4 mb-3 shadow-sm">
                        <label className="block text-sm sm:text-base font-black text-slate-900 mb-2">
                          عدد المواد التى يمكن رفع درجات الطالب فيها
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="1"
                            inputMode="numeric"
                            disabled={!isMercyEnabled}
                            value={mercyMaxSubjects}
                            onKeyDown={(e) => {
                              if (['-', '+', '.', ',', 'e', 'E'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setMercyMaxSubjects('');
                                applyMercySettings(isMercyEnabled, '0', mercyMaxPercentage);
                                return;
                              }
                              if (!/^\d+$/.test(raw)) return;
                              const num = parseInt(raw, 10);
                              if (isNaN(num) || num < 0 || num > 20) return;
                              const normalized = String(num);
                              setMercyMaxSubjects(normalized);
                              applyMercySettings(isMercyEnabled, normalized, mercyMaxPercentage);
                            }}
                            onBlur={() => {
                              if (mercyMaxSubjects === '') {
                                setMercyMaxSubjects('0');
                                applyMercySettings(isMercyEnabled, '0', mercyMaxPercentage);
                              }
                            }}
                            className="w-full bg-white disabled:bg-slate-100 border-2 border-slate-800 rounded-xl px-4 py-2.5 text-center text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      {/* النسبة المئوية للحد الأدنى للدرجة الفعلية للمادة المقرر إضافتها الى درجات الطالب المستفيد */}
                      <div className="bg-white/90 border-2 border-emerald-700 rounded-2xl p-4 mb-3 shadow-sm">
                        <label className="block text-sm sm:text-base font-black text-slate-900 mb-2 leading-relaxed">
                          النسبة المئوية للحد الأدنى للدرجة الفعلية للمادة المقرر إضافتها الى درجات الطالب المستفيد
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            step="1"
                            inputMode="numeric"
                            disabled={!isMercyEnabled}
                            value={mercyMaxPercentage}
                            onKeyDown={(e) => {
                              if (['-', '+', '.', ',', 'e', 'E'].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setMercyMaxPercentage('');
                                applyMercySettings(isMercyEnabled, mercyMaxSubjects, '0');
                                return;
                              }
                              if (!/^\d+$/.test(raw)) return;
                              const num = parseInt(raw, 10);
                              if (isNaN(num) || num < 0 || num > 50) return;
                              const normalized = String(num);
                              setMercyMaxPercentage(normalized);
                              applyMercySettings(isMercyEnabled, mercyMaxSubjects, normalized);
                            }}
                            onBlur={() => {
                              if (mercyMaxPercentage === '') {
                                setMercyMaxPercentage('0');
                                applyMercySettings(isMercyEnabled, mercyMaxSubjects, '0');
                              }
                            }}
                            className="w-full bg-white disabled:bg-slate-100 border-2 border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-center text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed"
                            dir="ltr"
                          />
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-900 font-black text-lg pointer-events-none select-none">
                            %
                          </span>
                        </div>
                      </div>

                      {(() => {
                        const parsedMaxSubjPreview = Math.min(20, Math.max(0, parseInt(mercyMaxSubjects, 10) || 0));
                        const parsedMaxPctPreview = Math.min(50, Math.max(0, parseInt(mercyMaxPercentage, 10) || 0));
                        const previewSettings: GradingSettings = {
                          ...currentSettings,
                          isMercyEnabled,
                          mercyMaxSubjects: parsedMaxSubjPreview,
                          mercyMaxPercentage: parsedMaxPctPreview,
                        };
                        const fallbackConfig =
                          !customCols || customCols.length === 0
                            ? getSubjectsConfigForStageGrade(stage, selectedGrade)
                            : null;
                        const effectiveCols =
                          customCols && customCols.length > 0
                            ? customCols
                            : fallbackConfig?.customCols || [];
                        const effectiveOverrides =
                          defaultSubjectsOverrides && Object.keys(defaultSubjectsOverrides).length > 0
                            ? defaultSubjectsOverrides
                            : fallbackConfig?.defaultSubjectsOverrides;
                        const effectiveStage =
                          stage === 'kindergarten' ? 'primary' : stage || 'primary';
                        const eligibleStudentsCount =
                          students && effectiveCols.length > 0 && hasMercyRules && isMercyEnabled
                            ? students.filter((st) => {
                                const boosts = getPrimaryStudentMercyBoosts(
                                  st,
                                  effectiveStage,
                                  effectiveCols,
                                  effectiveOverrides,
                                  previewSettings,
                                  selectedGrade
                                );
                                return Object.keys(boosts).length > 0;
                              }).length
                            : 0;

                        const stageLabel = (() => {
                          if (stage === 'primary' || !stage) return 'المرحلة الابتدائية';
                          if (stage === 'kindergarten') return 'المرحلة : رياض أطفال';
                          if (stage === 'middle' || stage === 'prep') return 'المرحلة الإعدادية';
                          if (stage === 'secondary') {
                            const isSecondSec =
                              selectedGrade === 'الصف الثاني' ||
                              selectedGrade?.includes('الثاني') ||
                              selectedGrade?.toLowerCase().includes('2nd');
                            return isSecondSec ? 'المرحلة الثانوية' : 'المرحلة الثانوية - البكالوريا';
                          }
                          if (stage === 'commercial_technical') return 'المرحلة : التعليم الفنى التجارى';
                          if (stage === 'industrial_technical') return 'المرحلة : التعليم الفنى الصناعى';
                          if (stage === 'agricultural_technical') return 'المرحلة : التعليم الفنى الزراعى';
                          if (stage === 'hotel_technical') return 'المرحلة : التعليم الفنى الفندقى';
                          return stage;
                        })();

                        const gradeLabel = (selectedGrade || '')
                          .replace(' الابتدائي', '')
                          .replace(' الإعدادي', '')
                          .replace(' الثانوي', '')
                          .trim();

                        return (
                          <div className="bg-white/90 border-2 border-emerald-700 rounded-2xl p-3.5 mb-2 shadow-sm text-center flex flex-col items-center justify-center gap-1">
                            <div className="text-xs sm:text-sm font-black text-emerald-950 flex items-center justify-center gap-1.5 whitespace-nowrap">
                              <span>عدد الطلاب المستحقين لدرجات الرأفة وفقا للإعدادات السابقة =</span>
                              <span className="text-base sm:text-lg font-black text-emerald-700" dir="ltr">
                                {eligibleStudentsCount}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-600">
                              {`${stageLabel} - ${gradeLabel || 'الصف'} - الفصل الدراسي الثانى`}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* أيقونة X باللون الأحمر في أسفل منتصف النافذة للإغلاق */}
                    <div className="relative mt-2 pt-4 flex justify-center w-full shrink-0">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-700/20 overflow-hidden rounded-full">
                        <div
                          className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine"
                          style={{ animationDuration: '3s' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCloseMercyModal}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg border border-slate-900/40 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                      >
                        <X className="w-8 h-8" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </AnimatePresence>
    </PortalModal>
  );
};
