import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Mail, User, ArrowLeft, X, Check, AlertCircle } from 'lucide-react';
import { Language } from '../types';
import brandShield from '../assets/images/brand_shield.png';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userData: { email: string; role: string; schoolName: string }) => void;
  lang?: Language;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  lang = 'ar',
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [role, setRole] = useState<'admin' | 'teacher' | 'viewer'>('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    if (isRegistering && !schoolName.trim()) {
      setError('يرجى إدخال اسم المدرسة أو المؤسسة');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        email,
        role,
        schoolName: schoolName.trim() || 'مدرسة التميز الذكية',
      });
    }, 800);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-indigo-500/50 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] p-6 md:p-8 flex flex-col text-slate-100 overflow-hidden"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 left-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 z-10"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-blue-600/30 border-2 border-indigo-400/50 flex items-center justify-center p-2 mb-3 shadow-lg shadow-indigo-500/20">
              <img 
                src={brandShield} 
                alt="Smart Control Logo" 
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            </div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-white via-indigo-200 to-blue-400 bg-clip-text text-transparent">
              {isRegistering ? 'إنشاء حساب مؤسسي جديد' : 'تسجيل الدخول السحابي'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {isRegistering ? 'أنشئ حساباً لمدرستك لحفظ ومزامنة البيانات سحابياً' : 'قم بتسجيل الدخول للوصول إلى قاعدة بياناتك السحابية'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isRegistering && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">اسم المدرسة / المؤسسة</label>
                <div className="relative flex items-center">
                  <User className="absolute right-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="مثال: مدرسة النور الاعدادية بنين"
                    className="w-full h-11 bg-slate-800/90 border-2 border-slate-700 focus:border-indigo-500 rounded-xl pr-10 pl-4 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">البريد الإلكتروني أو اسم المستخدم</label>
              <div className="relative flex items-center">
                <Mail className="absolute right-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.edu.eg"
                  className="w-full h-11 bg-slate-800/90 border-2 border-slate-700 focus:border-indigo-500 rounded-xl pr-10 pl-4 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">كلمة المرور</label>
              <div className="relative flex items-center">
                <Lock className="absolute right-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-11 bg-slate-800/90 border-2 border-slate-700 focus:border-indigo-500 rounded-xl pr-10 pl-4 text-sm text-white placeholder-slate-500 outline-none transition-colors"
                />
              </div>
            </div>

            {isRegistering && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300">صلاحية المستخدم</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full h-11 bg-slate-800/90 border-2 border-slate-700 focus:border-indigo-500 rounded-xl px-4 text-sm text-white outline-none transition-colors cursor-pointer"
                >
                  <option value="admin">مدير النظام (تحكم كامل وتعديل)</option>
                  <option value="teacher">معلم / مدخل بيانات (إدخال ومراجعة)</option>
                  <option value="viewer">مشاهد فقط (استعراض التقارير)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full h-12 rounded-xl font-black bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegistering ? 'إنشاء الحساب وبدء الاتصال' : 'تسجيل الدخول'}</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="mt-6 text-center text-xs text-slate-400">
            {isRegistering ? (
              <span>لديك حساب بالفعل؟{' '}</span>
            ) : (
              <span>ليس لديك حساب مؤسسي؟{' '}</span>
            )}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-bold underline transition-colors cursor-pointer"
            >
              {isRegistering ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
