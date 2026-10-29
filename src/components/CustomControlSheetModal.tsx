import React, { useState } from 'react';
import { Sliders, Printer, X, Check } from 'lucide-react';
import { CustomControlSheetOptions } from '../utils/exportPdf';

interface CustomControlSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: CustomControlSheetOptions) => Promise<void> | void;
  stage?: string;
  selectedGrade?: string;
  semester?: 'first' | 'second';
}

export const CustomControlSheetModal: React.FC<CustomControlSheetModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  stage,
  selectedGrade,
  semester = 'first',
}) => {
  const [includeMainData, setIncludeMainData] = useState(true);
  const [includeStudentData, setIncludeStudentData] = useState(true);
  const [includeAddedSubjects, setIncludeAddedSubjects] = useState(false);
  const [includeNonAddedSubjects, setIncludeNonAddedSubjects] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handlePrint = async () => {
    try {
      setIsExporting(true);
      await onConfirm({
        includeMainData,
        includeStudentData,
        includeAddedSubjects,
        includeNonAddedSubjects,
      });
      onClose();
    } catch (err) {
      console.error('Error generating custom control sheet:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const semLabel = semester === 'first' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثانى';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-right flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* رأس النافذة */}
        <div className="relative bg-gradient-to-r from-sky-700 via-indigo-700 to-sky-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20">
              <Sliders className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-wide text-white">
                إعدادات شيت كنترول مخصص
              </h3>
              <p className="text-xs text-sky-200 font-medium">
                مطابق لحقول شيت كنترول الفصل الدراسي الثانى {selectedGrade ? `• ${selectedGrade}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* جسم النافذة والخيارات */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3 text-xs text-sky-900 leading-relaxed font-bold">
            اختر البنود المراد تضمينها في شيت الكنترول المخصص (الحقول مطابقة تماماً لشيت كنترول الفصل الدراسي الثانى):
          </div>

          <div className="space-y-3">
            {/* 1. اضافة البيانات الرئيسية */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                includeMainData
                  ? 'bg-indigo-50/70 border-indigo-400 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                  includeMainData
                    ? 'bg-indigo-600 text-white'
                    : 'border-2 border-slate-400 bg-white'
                }`}
              >
                {includeMainData && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={includeMainData}
                onChange={(e) => setIncludeMainData(e.target.checked)}
              />
              <div className="flex-1">
                <span className="block font-black text-sm text-slate-900">
                  اضافة البيانات الرئيسية
                </span>
                <span className="block text-xs text-slate-500 font-medium mt-0.5">
                  طباعة الترويسة الرئيسية (الإدارة التعليمية، المدرسة، وعنوان الشيت والفصل الدراسي).
                </span>
              </div>
            </label>

            {/* 2. اضافة بيانات الطلاب الحالية */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                includeStudentData
                  ? 'bg-indigo-50/70 border-indigo-400 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                  includeStudentData
                    ? 'bg-indigo-600 text-white'
                    : 'border-2 border-slate-400 bg-white'
                }`}
              >
                {includeStudentData && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={includeStudentData}
                onChange={(e) => setIncludeStudentData(e.target.checked)}
              />
              <div className="flex-1">
                <span className="block font-black text-sm text-slate-900">
                  اضافة بيانات الطلاب الحالية
                </span>
                <span className="block text-xs text-slate-500 font-medium mt-0.5">
                  طباعة أسماء الطلاب الحالية وأرقام الجلوس والأرقام القومية وبيانات القيد واللجان.
                </span>
              </div>
            </label>

            {/* 3. اضافة مادة دراسية مضافة للمجموع */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                includeAddedSubjects
                  ? 'bg-emerald-50/80 border-emerald-400 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                  includeAddedSubjects
                    ? 'bg-emerald-600 text-white'
                    : 'border-2 border-slate-400 bg-white'
                }`}
              >
                {includeAddedSubjects && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={includeAddedSubjects}
                onChange={(e) => setIncludeAddedSubjects(e.target.checked)}
              />
              <div className="flex-1">
                <span className="block font-black text-sm text-slate-900">
                  اضافة مادة جديدة مضافة للمجموع
                </span>
                <span className="block text-xs text-emerald-800 font-medium mt-0.5">
                  سيتم إضافة حقل المادة الجديدة بالهيكل الكامل المخصص للرصد والتحرير اليدوي (فصل أول / فصل ثان / فعلية) بدون درجات، وجعل درجة مجموع المواد الأساسية بدون درجة، مع ترك درجات المواد الأخرى كما هي.
                </span>
              </div>
            </label>

            {/* 4. اضافة مادة جديدة غير مضافة للمجموع */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                includeNonAddedSubjects
                  ? 'bg-amber-50/80 border-amber-400 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                  includeNonAddedSubjects
                    ? 'bg-amber-600 text-white'
                    : 'border-2 border-slate-400 bg-white'
                }`}
              >
                {includeNonAddedSubjects && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={includeNonAddedSubjects}
                onChange={(e) => setIncludeNonAddedSubjects(e.target.checked)}
              />
              <div className="flex-1">
                <span className="block font-black text-sm text-slate-900">
                  اضافة مادة جديدة غير مضافة للمجموع
                </span>
                <span className="block text-xs text-amber-800 font-medium mt-0.5">
                  سيتم إضافة حقل مادة جديدة غير مضافة للمجموع بالهيكل الكامل المخصص للرصد والتحرير اليدوي (فصل أول / فصل ثان / فعلية) بدون درجات إلى نهاية الشيت قبل حقل نتيجة الطالب.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="p-4 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-black text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-600 hover:from-sky-700 hover:to-indigo-700 text-white font-black text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>طباعة شيت كنترول مخصص</span>
          </button>
        </div>
      </div>
    </div>
  );
};
