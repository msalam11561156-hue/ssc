import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpRight,
  CheckCircle2,
  Printer,
  X,
} from 'lucide-react';
import quickSupportAuditIcon from '../assets/images/quick_support_audit_icon.png';
import { FAST_BACKDROP_FADE, FAST_MODAL_FLIP } from '../utils/flipAnimation';
import { AuditIssueCategory, PrePrintAuditResult } from '../utils/prePrintAudit';

interface PrePrintAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditResult: PrePrintAuditResult;
  onNavigateToStudent: (studentId: string, studentName: string) => void;
  onProceedToPrint?: () => void;
  isPrintTrigger?: boolean;
}

type FilterTab = 'all' | 'duplicates' | 'anomalous' | 'missing';

export const PrePrintAuditModal: React.FC<PrePrintAuditModalProps> = ({
  isOpen,
  onClose,
  auditResult,
  onNavigateToStudent,
  onProceedToPrint,
  isPrintTrigger = false,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filteredIssues = useMemo(() => {
    switch (activeTab) {
      case 'duplicates':
        return auditResult.issues.filter(
          (i) => i.category === 'duplicate_seat' || i.category === 'duplicate_secret' || i.category === 'duplicate_nid'
        );
      case 'anomalous':
        return auditResult.issues.filter((i) => i.category === 'anomalous_grade');
      case 'missing':
        return auditResult.issues.filter((i) => i.category === 'missing_data');
      default:
        return auditResult.issues;
    }
  }, [auditResult.issues, activeTab]);

  const getCategoryBadgeLabel = (cat: AuditIssueCategory) => {
    switch (cat) {
      case 'duplicate_seat':
        return 'تكرار جلوس';
      case 'duplicate_secret':
        return 'تكرار سري';
      case 'duplicate_nid':
        return 'تكرار رقم قومي';
      case 'anomalous_grade':
        return 'درجة شاذة';
      case 'missing_data':
        return 'بيانات ناقصة';
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 [perspective:1000px]"
          dir="rtl"
        >
          <motion.div
            {...FAST_BACKDROP_FADE}
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            {...FAST_MODAL_FLIP}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl p-[3px] shadow-2xl bg-[linear-gradient(135deg,#0f172a,#334155,#0f172a)] z-10"
          >
            <div className="bg-white rounded-[21px] w-full flex flex-col max-h-[calc(88vh-6px)] overflow-hidden">
              {/* Header */}
              <div
                className={`px-5 py-4 flex items-center justify-between border-b-2 border-slate-900 shrink-0 ${
                  auditResult.errorCount > 0
                    ? 'bg-gradient-to-l from-rose-600 via-red-600 to-rose-700 text-white'
                    : auditResult.warningCount > 0
                    ? 'bg-gradient-to-l from-amber-500 via-orange-500 to-amber-600 text-white'
                    : 'bg-gradient-to-l from-emerald-600 via-teal-600 to-emerald-700 text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-white/25 border border-slate-900/80 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    <img
                      src={quickSupportAuditIcon}
                      alt="الدعم السريع - فحص الأخطاء قبل الطباعة"
                      draggable={false}
                      className="w-9 h-9 object-contain pointer-events-none select-none contrast-125 [filter:drop-shadow(0_0_2px_rgba(255,255,255,0.95))_drop-shadow(0_1px_2px_rgba(15,23,42,0.5))]"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-black truncate">
                      الدعم السريع - فحص الأخطاء قبل الطباعة
                    </h3>
                    <p className="text-xs sm:text-sm font-bold text-white/90 truncate">
                      {auditResult.issues.length === 0
                        ? `تم فحص ${auditResult.totalStudents} طالب — لا توجد أخطاء`
                        : `تم فحص ${auditResult.totalStudents} طالب — ${auditResult.errorCount} أخطاء حرجة و ${auditResult.warningCount} تنبيهات`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 border border-slate-900/80 flex items-center justify-center transition-colors shrink-0"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Tabs */}
              {auditResult.issues.length > 0 && (
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`min-h-[38px] sm:min-h-[42px] inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border border-slate-900/80 transition-all ${
                      activeTab === 'all'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    الكل ( {auditResult.issues.length} )
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('duplicates')}
                    className={`min-h-[38px] sm:min-h-[42px] inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border border-slate-900/80 transition-all ${
                      activeTab === 'duplicates'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-white text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    تكرار الجلوس / السري / القومي ( {auditResult.duplicateCount} )
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('anomalous')}
                    className={`min-h-[38px] sm:min-h-[42px] inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border border-slate-900/80 transition-all ${
                      activeTab === 'anomalous'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-white text-orange-700 hover:bg-orange-50'
                    }`}
                  >
                    الدرجات الشاذة ( {auditResult.anomalousCount} )
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('missing')}
                    className={`min-h-[38px] sm:min-h-[42px] inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border border-slate-900/80 transition-all ${
                      activeTab === 'missing'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-white text-amber-800 hover:bg-amber-50'
                    }`}
                  >
                    بيانات ناقصة ( {auditResult.missingCount} )
                  </button>
                </div>
              )}

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
                {auditResult.issues.length === 0 ? (
                  <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-slate-900/80 shadow-sm">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900">
                      جميع البيانات والدرجات سليمة وجاهزة للطباعة
                    </h4>
                  </div>
                ) : filteredIssues.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 font-bold text-sm">
                    لا توجد ملاحظات في هذا التصنيف.
                  </div>
                ) : (
                  filteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`rounded-2xl border-2 border-slate-900 p-3 sm:p-3.5 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        issue.severity === 'error'
                          ? 'bg-rose-50/30'
                          : 'bg-amber-50/25'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span
                              className={`min-h-[26px] inline-flex items-center text-[11px] font-black px-2.5 py-1 rounded-full border border-slate-900/80 ${
                                issue.severity === 'error'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              {issue.severity === 'error' ? 'خطأ حرج' : 'تنبيه'}
                            </span>
                            <span className="min-h-[26px] inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-900/80">
                              {getCategoryBadgeLabel(issue.category)}
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              م {issue.rowNumber} : {issue.studentName}
                            </span>
                            {issue.seatNumber && (
                              <span className="min-h-[26px] inline-flex items-center text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-slate-900/80">
                                جلوس : {issue.seatNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm font-extrabold text-slate-800">
                            {issue.title}
                          </p>
                          <p className="text-xs font-semibold text-slate-600 mt-0.5 leading-relaxed">
                            {issue.description}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToStudent(issue.studentId, issue.studentName);
                        }}
                        className="shrink-0 self-end sm:self-center inline-flex items-center justify-center gap-1.5 min-h-[48px] px-3.5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black border border-slate-900 transition-all active:scale-95 shadow-sm"
                      >
                        <span>انتقال للطالب</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Actions */}
              <div className="px-4 py-3 bg-white border-t-2 border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs sm:text-sm border-2 border-slate-900 shadow-sm transition-all"
                >
                  {auditResult.issues.length > 0 ? 'إغلاق للمراجعة والتعديل' : 'إغلاق'}
                </button>

                {onProceedToPrint && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onProceedToPrint();
                    }}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm text-white border-2 border-slate-900 shadow-md transition-all active:scale-95 ${
                      auditResult.errorCount > 0
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    <span>
                      {isPrintTrigger && auditResult.issues.length > 0
                        ? 'متابعة الطباعة على أي حال'
                        : 'فتح قائمة الطباعة'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
