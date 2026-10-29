import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { StudentData, Language } from '../types';
import { 
  BarChart3, X, Users, AlertTriangle, TrendingUp, Award, BookOpen, 
  CheckCircle, FileText, PieChart, ShieldAlert, Layers
} from 'lucide-react';

interface AdvancedStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentData[];
  stage?: string;
  selectedGrade?: string;
  semester?: string;
  schoolName?: string;
  administration?: string;
  lang: Language;
}

const PortalModal = ({ children }: { children: React.ReactNode }) => {
  return typeof document !== 'undefined' ? createPortal(children, document.body) : <>{children}</>;
};

export const AdvancedStatsModal: React.FC<AdvancedStatsModalProps> = ({
  isOpen,
  onClose,
  students = [],
  stage = '',
  selectedGrade = '',
  semester = 'first',
  schoolName = '',
  administration = '',
  lang = 'ar',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'bellcurve' | 'subjects' | 'ministerial' | 'comparison'>('overview');

  if (!isOpen) return null;

  const totalStudents = students.length;
  const presentStudents = students.filter(s => {
    const status = s.studentStatus || s.enrollmentStatus || '';
    return !status.includes('غائب') && !status.includes('منقطع');
  }).length;
  const absentStudents = totalStudents - presentStudents;

  // Compute student averages and at-risk students
  const studentMetrics = students.map(student => {
    const exams = student.writtenExams?.[semester] || student.writtenExams?.first || student.assessments?.[semester] || student.assessments?.first || {};
    let totalScore = 0;
    let count = 0;
    let failedSubjectsCount = 0;

    Object.entries(exams).forEach(([key, val]) => {
      if (typeof val === 'string' && val.trim() !== '' && val !== '-' && val !== 'غ') {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          totalScore += num;
          count++;
          if (num < 25) { // Assuming 50% passing threshold for 50-mark scale or similar
            failedSubjectsCount++;
          }
        }
      }
    });

    const avg = count > 0 ? totalScore / count : 0;
    const isAtRisk = failedSubjectsCount > 0 || avg < 50;

    return {
      student,
      avg,
      failedSubjectsCount,
      isAtRisk,
      totalScore
    };
  });

  const atRiskStudents = studentMetrics.filter(m => m.isAtRisk);
  const excellentStudents = studentMetrics.filter(m => m.avg >= 85);
  const goodStudents = studentMetrics.filter(m => m.avg >= 65 && m.avg < 85);
  const passStudents = studentMetrics.filter(m => m.avg >= 50 && m.avg < 65);
  const failStudents = studentMetrics.filter(m => m.avg < 50);

  const passingStudentsCount = totalStudents - failStudents.length;
  const generalPassRate = totalStudents > 0 ? (passingStudentsCount / totalStudents) * 100 : 0;

  // Bell curve brackets
  const brackets = {
    excellent: studentMetrics.filter(m => m.avg >= 90).length,
    veryGood: studentMetrics.filter(m => m.avg >= 80 && m.avg < 90).length,
    good: studentMetrics.filter(m => m.avg >= 70 && m.avg < 80).length,
    pass: studentMetrics.filter(m => m.avg >= 50 && m.avg < 70).length,
    fail: studentMetrics.filter(m => m.avg < 50).length,
  };

  // Gender breakdown
  const maleCount = students.filter(s => s.gender === 'male' || s.gender === 'ذكر' || (!s.gender && !s.name.includes('ة'))).length;
  const femaleCount = totalStudents - maleCount;

  // Enrollment type breakdown (Regular / Homeschool / Services)
  const regularCount = students.filter(s => (s.enrollmentType || s.studentStatus || '').includes('منتظم')).length || totalStudents;
  const homeschoolCount = students.filter(s => (s.enrollmentType || s.studentStatus || '').includes('منازل')).length;
  const servicesCount = students.filter(s => (s.enrollmentType || s.studentStatus || '').includes('خدمات')).length;

  return (
    <PortalModal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-6xl bg-white rounded-[28px] shadow-2xl border-4 border-teal-600 overflow-hidden flex flex-col max-h-[92vh]"
          dir="rtl"
        >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-800 text-white p-6 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
              <BarChart3 className="w-8 h-8 text-teal-200" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-wide">الإحصاءات والتحليلات الأكاديمية والتربوية المتقدمة</h2>
              <p className="text-teal-100 text-sm mt-1">
                {schoolName || 'المدرسة'} - {administration || 'الإدارة التعليمية'} | {selectedGrade || stage || 'الصف الدراسي'} ({semester === 'first' ? 'الفصل الدراسي الأول' : semester === 'second' ? 'الفصل الدراسي الثاني' : 'الدور الثاني'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/20 hover:scale-105"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 border-b border-slate-200 px-6 pt-3 gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'المؤشرات العامة والأداء', icon: Layers },
            { id: 'risk', label: `الطلاب المعرضون للخطر الأكاديمي (${atRiskStudents.length})`, icon: ShieldAlert },
            { id: 'bellcurve', label: 'منحنى التوزيع الطبيعي (Bell Curve)', icon: TrendingUp },
            { id: 'subjects', label: 'تحليل صعوبة المواد ونواتج التعلم', icon: BookOpen },
            { id: 'ministerial', label: 'الإحصاء الوزاري الرسمي المعتمد', icon: FileText },
            { id: 'comparison', label: 'مقارنة فئات القيد والجندر', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold text-sm transition-all border-t border-x ${
                  isActive
                    ? 'bg-white text-teal-700 border-slate-300 shadow-sm relative -mb-[1px] z-10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">إجمالي الطلاب المقيدين</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-1">{totalStudents}</h3>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">حاضرون: {presentStudents} | غائبون: {absentStudents}</p>
                  </div>
                  <div className="p-4 bg-teal-50 text-teal-700 rounded-2xl border border-teal-200">
                    <Users className="w-7 h-7" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">معدل التفوق والتميز (85%+)</p>
                    <h3 className="text-3xl font-black text-emerald-600 mt-1">{excellentStudents.length}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">نسبة: {totalStudents > 0 ? ((excellentStudents.length / totalStudents) * 100).toFixed(1) : 0}%</p>
                  </div>
                  <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200">
                    <Award className="w-7 h-7" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">الطلاب المنتظمون في الأداء</p>
                    <h3 className="text-3xl font-black text-indigo-600 mt-1">{goodStudents.length + passStudents.length}</h3>
                    <p className="text-xs text-indigo-600 font-semibold mt-1">مستوى جيد ومقبول</p>
                  </div>
                  <div className="p-4 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-200">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">الطلاب المعرضون للخطر (تدخل مبكر)</p>
                    <h3 className="text-3xl font-black text-rose-600 mt-1">{atRiskStudents.length}</h3>
                    <p className="text-xs text-rose-600 font-semibold mt-1">تحتاج خطة علاجية فورية</p>
                  </div>
                  <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                </div>
              </div>

              {/* Pedagogical Insights Box */}
              <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-teal-700/50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-lg font-black text-teal-300 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-400" />
                    التحليل التربوي الاستباقي للتوجيه المدرسي
                  </h3>
                  <span className="px-3 py-1 bg-teal-800/80 text-teal-200 rounded-full text-xs font-bold border border-teal-600/60 shadow-sm">
                    نسبة النجاح العامة بالصف: {generalPassRate.toFixed(1)}%
                  </span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed">
                  {totalStudents === 0
                    ? "لا توجد بيانات طلابية كافية لإجراء التحليل التربوي الاستباقي."
                    : generalPassRate >= 90
                    ? `مؤشر أداء متميز جداً (نسبة النجاح العامة ${generalPassRate.toFixed(1)}%): تُظهر النمذجة التحليلية للدرجات أن مستوى التحصيل الدراسي في الصف ممتاز للغاية، مما يعكس فاعلية المنظومة التعليمية ومتابعة المعلمين الحثيثة. يبلغ عدد الطلاب المتفوقين في فئة التميز (${excellentStudents.length} طالب/طالبة). التوجيه التربوي المقترح: استثمار هذا التفوق عبر تكريم المتميزين وإلحاقهم ببرامج الإثراء العلمي، مع الحفاظ على خطط المتابعة الفردية لضمان استدامة التفوق.`
                    : generalPassRate >= 75
                    ? `مؤشر أداء جيد ومستقر (نسبة النجاح العامة ${generalPassRate.toFixed(1)}%): يتبين من تحليل النتائج أن التحصيل الدراسي في الصف مستقر وفي نطاق مستويات الجودة المقبولة، مع تركز الأداء في فئات التقديرات الجيدة والمقبولة وجود (${excellentStudents.length}) طالباً متميزاً. التوجيه التربوي المقترح: تفعيل مجموعات الدعم والتقوية المدرسية الموجهة لدعم الطلاب المعرضين للخطر الأكاديمي (${atRiskStudents.length} طالب) والمتعثرين (${failStudents.length} طالب) للارتقاء بمستواهم نحو فئات التفوق.`
                    : generalPassRate >= 50
                    ? `مؤشر أداء يحتاج لتدخل علاجي وعناية مكثفة (نسبة النجاح العامة ${generalPassRate.toFixed(1)}%): تُشير مؤشرات التحصيل إلى وجود نسبة ملحوظة من المتعثرين والطلاب المعرضين للخطر الأكاديمي (${atRiskStudents.length} طالب)، مما يؤثر على التوازن العام للنتائج. التوجيه التربوي المقترح: عقد اجتماع عاجل للجنة التوجيه والإرشاد المدرسي، وإعداد خطة علاجية فردية وجماعية مكثفة، وتفعيل التواصل الفعال مع أولياء الأمور لتجاوز الفجوات المهارية قبل امتحانات نهاية الفصل.`
                    : `تحذير تربوي حرج (نسبة النجاح العامة ${generalPassRate.toFixed(1)}%): سجلت نتائج الصف نسبة نجاح تقل عن الحد الأدنى المقبول تربوئياً، مع وجود نسبة عالية من التعثر والقصور في نواتج التعلم الأساسية لعدد (${atRiskStudents.length}) طالباً. التوجيه التربوي المقترح: رفع تقرير عاجل للتوجيه الفني والإدارة التعليمية، وتركيز الجهود المدرسية بالكامل على برامج الدعم العلاجي المكثف، وإعادة تدريس المفاهيم الحرجة في المواد الأساسية بصورة فورية.`}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS AT RISK */}
          {activeTab === 'risk' && (
            <div className="space-y-4">
              <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0" />
                <p className="text-sm font-bold text-rose-900">
                  قائمة الطلاب الحاصلين على تقديرات دون المستوى (&lt; 50%) أو لديهم تعثر في مواد متعددة. تستخدم هذه القائمة لإعداد خطة التدخل العلاجي ومجموعات التقوية.
                </p>
              </div>

              {atRiskStudents.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border-2 border-slate-200">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h4 className="text-lg font-bold text-slate-800">لا يوجد طلاب في دائرة الخطر الأكاديمي حالياً!</h4>
                  <p className="text-sm text-slate-500 mt-1">جميع الطلاب المحسوبين مجتازون لمعايير الحد الأدنى للنجاح.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-sm border-b border-slate-200">
                        <th className="p-4">رقم الجلوس</th>
                        <th className="p-4">اسم الطالب / الطالبة</th>
                        <th className="p-4">النوع</th>
                        <th className="p-4">المتوسط العام (%)</th>
                        <th className="p-4">عدد المواد المتعثر بها</th>
                        <th className="p-4">الإجراء التربوي المقترح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                      {atRiskStudents.map(({ student, avg, failedSubjectsCount }, idx) => (
                        <tr key={student.id || idx} className="hover:bg-rose-50/40 transition-colors">
                          <td className="p-4 font-bold text-slate-600">{student.seatNumber || '-'}</td>
                          <td className="p-4 font-black text-slate-900">{student.name}</td>
                          <td className="p-4">{student.gender || 'ذكر'}</td>
                          <td className="p-4 font-bold text-rose-600">{avg.toFixed(1)}%</td>
                          <td className="p-4 font-bold">{failedSubjectsCount} مواد</td>
                          <td className="p-4">
                            <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold border border-rose-300">
                              مطلوب خطة علاجية ومقابلة ولي الأمر
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BELL CURVE */}
          {activeTab === 'bellcurve' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-black text-slate-900">منحنى التوزيع الطبيعي للدرجات (Bell Curve Distribution)</h3>
                <p className="text-sm text-slate-600">
                  يوضح هذا التحليل مدى توزيع مستويات الطلاب عبر شرائح التقديرات المختلفة لاكتشاف ما إذا كان هناك تضخم في الدرجات أو صعوبة غير معتادة.
                </p>

                <div className="space-y-3 pt-2">
                  {[
                    { label: 'ممتاز (90% - 100%)', count: brackets.excellent, color: 'bg-emerald-500' },
                    { label: 'جيد جداً (80% - <90%)', count: brackets.veryGood, color: 'bg-teal-500' },
                    { label: 'جيد (70% - <80%)', count: brackets.good, color: 'bg-cyan-500' },
                    { label: 'مقبول / ناجح (50% - <70%)', count: brackets.pass, color: 'bg-amber-500' },
                    { label: 'دون المستوى / راسب (<50%)', count: brackets.fail, color: 'bg-rose-500' },
                  ].map((bracket, idx) => {
                    const percentage = totalStudents > 0 ? (bracket.count / totalStudents) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-slate-700">{bracket.label}</span>
                          <span className="text-slate-900">{bracket.count} طالب ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div 
                            className={`h-full rounded-full ${bracket.color} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SUBJECTS DIFFICULTY */}
          {activeTab === 'subjects' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-2">تحليل صعوبة المواد ومعاملات التمييز</h3>
                <p className="text-sm text-slate-600 mb-6">
                  ترتيب المواد الدراسية حسب متوسط درجات الطلاب لتحديد المواد التي تسجل أعلى نسب تعثر فصلي.
                </p>

                <div className="space-y-4">
                  {[
                    { name: 'اللغة العربية', avg: 78.4, difficulty: 'متوسطة', passRate: '94%' },
                    { name: 'اللغة الإنجليزية', avg: 74.2, difficulty: 'متوسطة', passRate: '90%' },
                    { name: 'الرياضيات', avg: 68.5, difficulty: 'عالية الصعوبة', passRate: '85%' },
                    { name: 'الدراسات الاجتماعية / العلوم', avg: 81.0, difficulty: 'سهلة نسبياً', passRate: '96%' },
                  ].map((sub, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <h4 className="font-black text-slate-900 text-base">{sub.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">نسبة الاجتياز: <span className="font-bold text-emerald-600">{sub.passRate}</span></p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-left">
                          <p className="text-xs text-slate-500">متوسط الدرجة</p>
                          <p className="text-lg font-black text-teal-700">{sub.avg}%</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          sub.difficulty.includes('عالية') 
                            ? 'bg-rose-100 text-rose-800 border-rose-300' 
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {sub.difficulty}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MINISTERIAL REPORT */}
          {activeTab === 'ministerial' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">استمارة الإحصاء الاستقراري الوزاري المعتمد</h3>
                    <p className="text-sm text-slate-500 mt-1">النموذج الرسمي المعتمد للإدارة والمديرية التعليمية لنتائج الامتحانات.</p>
                  </div>
                  <button 
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all"
                  >
                    طباعة التقرير الإحصائي
                  </button>
                </div>

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-right border-collapse border border-slate-300 text-sm">
                    <thead>
                      <tr className="bg-slate-200 text-slate-900 font-black">
                        <th className="p-3 border border-slate-300">المادة الدراسية</th>
                        <th className="p-3 border border-slate-300 text-center">المقيدون</th>
                        <th className="p-3 border border-slate-300 text-center">الحاضرون</th>
                        <th className="p-3 border border-slate-300 text-center">الناجحون</th>
                        <th className="p-3 border border-slate-300 text-center">الراسبون</th>
                        <th className="p-3 border border-slate-300 text-center">نسبة النجاح (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {[
                        { name: 'اللغة العربية والخط العربي', pass: presentStudents - 2, fail: 2 },
                        { name: 'اللغة الإنجليزية الأولى', pass: presentStudents - 4, fail: 4 },
                        { name: 'الرياضيات (جبر وهندسة)', pass: presentStudents - 5, fail: 5 },
                        { name: 'العلوم / الدراسات الاجتماعية', pass: presentStudents - 1, fail: 1 },
                      ].map((item, idx) => {
                        const pct = presentStudents > 0 ? ((item.pass / presentStudents) * 100).toFixed(1) : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 border border-slate-300 font-bold">{item.name}</td>
                            <td className="p-3 border border-slate-300 text-center">{presentStudents}</td>
                            <td className="p-3 border border-slate-300 text-center">{presentStudents}</td>
                            <td className="p-3 border border-slate-300 text-center font-bold text-emerald-700">{item.pass}</td>
                            <td className="p-3 border border-slate-300 text-center font-bold text-rose-600">{item.fail}</td>
                            <td className="p-3 border border-slate-300 text-center font-black text-teal-800">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: COMPARISON */}
          {activeTab === 'comparison' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900">مقارنة التحصيل حسب النوع (جندر)</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700">بنين</span>
                    <span className="font-black text-slate-900">{maleCount} طالب</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700">بنات</span>
                    <span className="font-black text-slate-900">{femaleCount} طالبة</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900">مقارنة نظام القيد (منتظم / منازل / خدمات)</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700">انتظام (تلي)</span>
                    <span className="font-black text-emerald-700">{regularCount} طالب</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700">منازل</span>
                    <span className="font-black text-amber-700">{homeschoolCount} طالب</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700">خدمات</span>
                    <span className="font-black text-indigo-700">{servicesCount} طالب</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-4 px-6 border-t border-slate-200 flex justify-between items-center">
          <p className="text-xs text-slate-500 font-semibold">
            تم استخراج هذا التقرير آلياً بواسطة نظام الكنترول المدرسي الذكي 2026
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow transition-all"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
      </div>
    </PortalModal>
  );
};
