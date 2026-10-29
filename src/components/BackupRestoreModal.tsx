import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOutput,
  UploadCloud,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  X,
  School,
  Calendar,
  Users,
  Settings,
  RefreshCw,
} from 'lucide-react';
import {
  parseAndValidateBackup,
  applyBackupRestore,
  BackupPayload,
  ParsedBackupResult,
} from '../utils/backupRestore';
import { playClickSound } from '../utils/sound';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: (payload: BackupPayload) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  onRestoreSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [parsedResult, setParsedResult] = useState<ParsedBackupResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' كيلوبايت');

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const res = parseAndValidateBackup(content);
      setParsedResult(res);
      playClickSound();
    };
    reader.onerror = () => {
      setParsedResult({
        valid: false,
        error: 'حدث خطأ أثناء قراءة الملف من جهازك.',
      });
    };
    reader.readAsText(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setFileName('');
    setFileSize('');
    setParsedResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmRestore = () => {
    if (!parsedResult?.valid || !parsedResult.payload) return;

    playClickSound();
    setIsProcessing(true);

    try {
      applyBackupRestore(parsedResult.payload);
      setIsSuccess(true);

      setTimeout(() => {
        onRestoreSuccess(parsedResult.payload!);
      }, 1200);
    } catch (err: any) {
      setIsProcessing(false);
      setParsedResult({
        valid: false,
        error: 'فشل استرجاع النسخة: ' + (err?.message || 'خطأ غير معروف'),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 font-arabic" dir="rtl">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
        onClick={() => !isProcessing && onClose()}
      />

      {/* Modal Dialog Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl z-10 border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header with vibrant amber/orange gradient */}
        <div className="relative overflow-hidden bg-gradient-to-l from-orange-600 via-amber-600 to-amber-700 px-6 py-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-inner">
              <FolderOutput className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold leading-tight">استرجاع نسخة احتياطية</h3>
            </div>
          </div>

          <button
            onClick={() => !isProcessing && onClose()}
            disabled={isProcessing}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-50"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-500 text-emerald-600 flex items-center justify-center shadow-lg"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
              <h4 className="text-2xl font-black text-slate-800">تم استرجاع النسخة بنجاح!</h4>
              <p className="text-sm text-slate-600 max-w-sm">
                تم استعادة جميع البيانات والدرجات والإعدادات المضمنة. جاري تطبيق التغييرات وتحديث النظام...
              </p>
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold pt-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                تحديث الواجهة...
              </div>
            </div>
          ) : !parsedResult?.valid ? (
            <>
              {/* File Dropzone Area */}
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-orange-500 bg-orange-50/70 scale-[0.99]'
                    : 'border-slate-300 hover:border-orange-400 hover:bg-slate-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleInputChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-orange-100/70 border border-orange-200 text-orange-600 flex items-center justify-center shadow-sm">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-800">
                    اضغط لاختيار ملف النسخة الاحتياطية أو اسحبه إلى هنا
                  </p>
                  <p className="text-xs text-slate-500">
                    يدعم ملفات النسخ الاحتياطية الخاصة بالنظام بصيغة  ( JSON ) 
                  </p>
                </div>

                <span className="inline-flex items-center justify-center gap-2.5 px-6 h-[52px] rounded-xl bg-orange-600 text-white text-sm font-bold shadow-md hover:bg-orange-700 active:scale-95 transition-all">
                  <FileJson className="w-5 h-5" />
                  استعراض الملفات من الجهاز
                </span>
              </div>

              {/* Error Alert if parsing failed */}
              {parsedResult?.error && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 text-sm"
                >
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold">تعذر استرجاع الملف</h5>
                    <p className="text-xs text-red-700 mt-0.5">{parsedResult.error}</p>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <>
              {/* File Verified Banner */}
              <div className="flex items-center justify-between gap-3 p-3.5 bg-emerald-50 border-2 border-black rounded-2xl text-emerald-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-sm text-emerald-950">ملف نسخة احتياطية صالح ومكتمل</h5>
                    <p className="text-xs text-emerald-800 font-mono mt-0.5 truncate">
                      {fileName} ({fileSize})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-slate-900 hover:text-black bg-white border-2 border-black px-4 py-2 rounded-xl shadow-sm hover:bg-slate-100 active:scale-95 transition shrink-0 whitespace-nowrap min-w-[100px] text-center"
                >
                  تغيير الملف
                </button>
              </div>

              {/* Backup Summary Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border-2 border-black rounded-xl flex items-center gap-2.5">
                  <School className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-500">المدرسة والإدارة</div>
                    <div className="font-bold text-slate-800 text-xs truncate">
                      {parsedResult.summary?.schoolName}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {parsedResult.summary?.administration}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-2 border-black rounded-xl flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-[11px] text-slate-500">إجمالي الطلاب</div>
                    <div className="font-bold text-slate-800 text-sm">
                      {parsedResult.summary?.totalStudents} طالب/طالبة
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-2 border-black rounded-xl flex items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="text-[11px] text-slate-500">تاريخ حفظ النسخة</div>
                    <div className="font-bold text-slate-800 text-xs">
                      {parsedResult.summary?.exportDateFormatted}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-2 border-black rounded-xl flex items-center gap-2.5">
                  <Settings className="w-5 h-5 text-purple-600 shrink-0" />
                  <div>
                    <div className="text-[11px] text-slate-500">الإعدادات والتخصيصات</div>
                    <div className="font-bold text-slate-800 text-xs">
                      {parsedResult.summary?.settingsCount} إعداد محفوظ
                    </div>
                    <div className="text-[10px] text-slate-500">يشمل اللجان والدرجات والألوان</div>
                  </div>
                </div>
              </div>

              {/* Warning Alert */}
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 flex items-start gap-3 text-xs leading-relaxed">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h6 className="font-bold text-amber-950 text-sm">تنبيه هام قبل الاسترجاع</h6>
                  <p className="mt-1">
                    سيؤدي تأكيد الاسترجاع إلى استبدال كافة البيانات والدرجات والإعدادات الحالية بالنظام
                    بالبيانات الموجودة في ملف النسخة الاحتياطية هذا.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        {!isSuccess && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="h-11 px-6 rounded-xl border-2 border-black text-slate-900 font-bold text-sm hover:bg-slate-100 active:scale-95 transition flex items-center justify-center disabled:opacity-50"
            >
              إلغاء
            </button>

            {parsedResult?.valid && (
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isProcessing}
                className="h-11 px-6 rounded-xl border-2 border-black bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري استرجاع البيانات...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    تأكيد واسترجاع النسخة الاحتياطية
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
