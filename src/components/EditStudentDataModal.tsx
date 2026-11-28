import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Pencil, X, Check, UserCheck, Hash, Languages, AlertCircle } from 'lucide-react';
import { StudentData, Language, EducationType } from '../types';
import { translations, isInternationalSchool } from '../i18n';
import { formatNumberDigits, NumberLang } from '../utils/numberLangHelper';
import { FAST_MODAL_FLIP, FAST_BACKDROP_FADE } from '../utils/flipAnimation';

interface EditStudentDataModalProps {
  student: StudentData | null;
  rowNumber?: number;
  onClose: () => void;
  onSave: (updatedStudent: StudentData) => void;
  semester: string;
  stage?: string;
  selectedGrade?: string;
  educationType?: EducationType;
  showExamFields?: boolean;
  availableClasses: string[];
  numberLang?: NumberLang;
  lang?: Language;
}

const capitalizeEachWord = (val: string) =>
  val.replace(/(^|[\s.\-/]+)([a-z])/g, (_, sep, char) => sep + char.toUpperCase());

export const EditStudentDataModal: React.FC<EditStudentDataModalProps> = ({
  student,
  rowNumber,
  onClose,
  onSave,
  semester,
  stage,
  selectedGrade,
  educationType,
  showExamFields,
  availableClasses,
  numberLang = 'ar' as NumberLang,
  lang = 'ar' as Language,
}) => {
  const t = translations[lang];
  const isKindergarten = stage === 'kindergarten';
  const isInternational = isInternationalSchool(educationType);
  const showExemptionStatus = isInternational && !isKindergarten;
  const effectiveShowExamFields = showExamFields ?? !isKindergarten;

  const isFirstGrade = useMemo(() => {
    if (!selectedGrade) return true;
    const trimmed = selectedGrade.trim();
    if (stage === 'kindergarten') {
      return trimmed.includes('الأول') || trimmed.includes('KG1') || trimmed.includes('1');
    }
    return trimmed === 'الصف الأول' || trimmed.includes('الأول') || trimmed === '1st Grade';
  }, [selectedGrade, stage]);

  const normalizeStatusForGrade = (status: string, isFirst: boolean, gender?: string): string => {
    if (!status) return '';
    const clean = status.trim();
    const isFemale = gender === 'female' || clean.includes('ة') || clean.includes('بنات');
    const isDamg = clean.includes('دمج');
    const isBaq = clean.includes('باق');

    if (isDamg) {
      if (isBaq) {
        return isFemale ? 'باقية - دمج' : 'باق - دمج';
      }
      return isFirst ? (isFemale ? 'مستجدة - دمج' : 'مستجد - دمج') : (isFemale ? 'منقولة - دمج' : 'منقول - دمج');
    }

    if (isBaq) {
      return isFemale ? 'باقية' : 'باق';
    }

    return isFirst ? (isFemale ? 'مستجدة' : 'مستجد') : (isFemale ? 'منقولة' : 'منقول');
  };

  const convertStatusForGender = (currentStatus: string, gender: string): string => {
    if (!currentStatus) return currentStatus;
    const keys = [1, 2, 3, 4];
    for (const key of keys) {
      const maleVal = (t as any)[`status_${key}_M`];
      const femaleVal = (t as any)[`status_${key}_F`];
      if (maleVal && femaleVal) {
        if (gender === 'female' && currentStatus === maleVal) return femaleVal;
        if (gender !== 'female' && currentStatus === femaleVal) return maleVal;
      }
      const maleTransVal = (t as any)[`status_${key}_transferred_M`];
      const femaleTransVal = (t as any)[`status_${key}_transferred_F`];
      if (maleTransVal && femaleTransVal) {
        if (gender === 'female' && currentStatus === maleTransVal) return femaleTransVal;
        if (gender !== 'female' && currentStatus === femaleTransVal) return maleTransVal;
      }
    }
    return currentStatus;
  };

  const normalizeReligionValue = (rel?: string): 'muslim' | 'christian' | '' => {
    if (!rel) return '';
    const v = rel.trim().toLowerCase();
    if (v === 'muslim' || v.includes('مسلم') || v.includes('ل')) return 'muslim';
    if (v === 'christian' || v.includes('مسيح') || v.includes('ح')) return 'christian';
    return '';
  };

  const normalizeExemptionValue = (val?: string): string => {
    if (!val) return '';
    if (val === 'كلي' || val === 'كلى') return 'كلى';
    if (val === 'تدريجي' || val === 'تدريجى') return 'تدريجى';
    return val;
  };

  const normalizeEnrollmentTypeValue = (val?: string): string => {
    if (!val) return '';
    if (val === 'تحويل من مدرسة أخرى') return 'تحويلات';
    if (val === 'قيد عادي') return 'قيد عادى';
    return val;
  };

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [gender, setGender] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState('');
  const [studentStatus, setStudentStatus] = useState<'عادى' | 'دمج'>('عادى');
  const [exemptionStatus, setExemptionStatus] = useState('');
  const [enrollmentType, setEnrollmentType] = useState('');
  const [religion, setReligion] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [seatNumberVal, setSeatNumberVal] = useState('');
  const [secretNumberVal, setSecretNumberVal] = useState('');
  const [committeeNumberVal, setCommitteeNumberVal] = useState('');

  useEffect(() => {
    if (!student) return;
    setName(student.name || '');
    setNameEn(capitalizeEachWord(student.nameEn || ''));
    setNationalId(formatNumberDigits(student.nationalId || '', 'en').replace(/\D/g, '').slice(0, 14));
    const initGender = student.gender || '';
    setGender(initGender);
    setStudentStatus(student.studentStatus === 'دمج' ? 'دمج' : 'عادى');
    setEnrollmentStatus(
      student.enrollmentStatus
        ? normalizeStatusForGrade(student.enrollmentStatus, isFirstGrade, initGender)
        : ''
    );
    setExemptionStatus(normalizeExemptionValue(student.exemptionStatus));
    setEnrollmentType(normalizeEnrollmentTypeValue(student.enrollmentType));
    setReligion(normalizeReligionValue(student.religion));
    setStudentClass(student.studentClass || '');
    setSeatNumberVal(student.seatNumbers?.[semester] || (semester === 'first' ? student.seatNumber : '') || '');
    setSecretNumberVal(student.secretNumbers?.[semester] || (semester === 'first' ? student.secretNumber : '') || '');
    setCommitteeNumberVal(student.committeeNumbers?.[semester] || student.committeeNumber || '');
  }, [student, semester, isFirstGrade]);

  useEffect(() => {
    if (!student) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [student, onClose]);

  const classOptions = useMemo(() => {
    if (studentClass && !availableClasses.includes(studentClass)) {
      return [studentClass, ...availableClasses];
    }
    return availableClasses;
  }, [availableClasses, studentClass]);

  const statusOptions = useMemo(() => {
    return [1, 2, 3, 4].map((key) => {
      if (!isFirstGrade && key === 1) {
        return gender === 'female'
          ? ((t as any).status_1_transferred_F || 'منقولة')
          : ((t as any).status_1_transferred_M || 'منقول');
      }
      if (!isFirstGrade && key === 3) {
        return gender === 'female'
          ? ((t as any).status_3_transferred_F || 'منقولة - دمج')
          : ((t as any).status_3_transferred_M || 'منقول - دمج');
      }
      return gender === 'female'
        ? (t as any)[`status_${key}_F`]
        : (t as any)[`status_${key}_M`];
    });
  }, [isFirstGrade, gender, t]);

  const handleNationalIdChange = (raw: string) => {
    const cleaned = formatNumberDigits(raw, 'en').replace(/\D/g, '').slice(0, 14);
    setNationalId(cleaned);
    if (cleaned.length === 14) {
      const digit13 = parseInt(cleaned.charAt(12), 10);
      const derivedGender = digit13 % 2 !== 0 ? 'male' : 'female';
      setGender(derivedGender);
      setEnrollmentStatus((prev) =>
        prev ? normalizeStatusForGrade(convertStatusForGender(prev, derivedGender), isFirstGrade, derivedGender) : prev
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const cleanSeat = formatNumberDigits(seatNumberVal.trim(), 'en');
    const cleanSecret = formatNumberDigits(secretNumberVal.trim(), 'en');
    const cleanCommittee = formatNumberDigits(committeeNumberVal.trim(), 'en');

    const finalEnrollmentStatus = isKindergarten
      ? (studentStatus === 'دمج'
          ? (gender === 'female' ? 'مستجدة - دمج' : 'مستجد - دمج')
          : (gender === 'female' ? 'مستجدة' : 'مستجد'))
      : (enrollmentStatus ? normalizeStatusForGrade(enrollmentStatus, isFirstGrade, gender) : '');

    const updatedStudent: StudentData = {
      ...student,
      name: name.trim(),
      nameEn: capitalizeEachWord(nameEn.trim()),
      nationalId: nationalId.trim(),
      gender,
      ...(isKindergarten
        ? {
            studentStatus,
            enrollmentStatus: finalEnrollmentStatus,
          }
        : {
            enrollmentStatus: finalEnrollmentStatus,
          }),
      ...(showExemptionStatus ? { exemptionStatus } : {}),
      enrollmentType,
      religion,
      studentClass,
      ...(effectiveShowExamFields
        ? {
            seatNumbers: {
              ...student.seatNumbers,
              [semester]: cleanSeat,
            },
            secretNumbers: {
              ...student.secretNumbers,
              [semester]: cleanSecret,
            },
            ...(semester === 'first'
              ? {
                  seatNumber: cleanSeat,
                  secretNumber: cleanSecret,
                }
              : {}),
          }
        : {}),
      ...(!isKindergarten
        ? {
            committeeNumber: cleanCommittee,
            committeeNumbers: {
              ...student.committeeNumbers,
              [semester]: cleanCommittee,
            },
          }
        : {}),
    };

    onSave(updatedStudent);
  };

  const modalContent = (
    <AnimatePresence>
      {student && (
        <motion.div
          {...FAST_BACKDROP_FADE}
          className="fixed inset-0 z-[155] flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm"
          onClick={onClose}
          dir="rtl"
        >
          <motion.div
            {...FAST_MODAL_FLIP}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[92vh] rounded-3xl border-2 border-slate-900 overflow-hidden shadow-2xl bg-white flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white border-b-2 border-slate-900 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/50 flex items-center justify-center shrink-0 shadow-sm">
                  <Pencil className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black leading-tight">
                    {isKindergarten ? 'تعديل بيانات التلميذ' : 'تعديل بيانات الطالب'}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-amber-50 truncate mt-0.5">
                    {rowNumber ? `م ${formatNumberDigits(rowNumber, numberLang)} : ` : ''}
                    {student.name || (isKindergarten ? 'تلميذ بدون اسم' : 'طالب بدون اسم')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 border border-white/50 flex items-center justify-center transition-colors shrink-0"
                title="إغلاق"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/70">
                {/* Personal & Enrollment Data Section */}
                <div className="bg-white rounded-2xl border-2 border-slate-900 p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-black text-slate-900">
                      {isKindergarten ? 'البيانات الشخصية وبيانات التلميذ' : 'البيانات الشخصية وبيانات القيد'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Arabic Name */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="h-7 flex items-center text-xs font-black text-slate-800">
                        {isKindergarten ? 'اسم التلميذ ( بالعربية )' : 'اسم الطالب ( بالعربية )'}
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={name}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val.length > 40 && !val.endsWith('  ')) {
                            val = val.substring(0, 40) + '  ';
                          }
                          setName(val);
                        }}
                        placeholder={isKindergarten ? 'أدخل اسم التلميذ رباعياً' : 'أدخل اسم الطالب رباعياً'}
                        className="w-full h-11 bg-white border-[1.5px] border-slate-900 rounded-xl px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                      />
                    </div>

                    {/* English Name */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="h-7 flex items-center justify-between text-xs font-black text-slate-800">
                        <span>{isKindergarten ? 'اسم التلميذ ( بالإنجليزية )' : 'اسم الطالب ( بالإنجليزية )'}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                          <Languages className="w-3.5 h-3.5" />
                          English
                        </span>
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={nameEn}
                        onChange={(e) => setNameEn(capitalizeEachWord(e.target.value))}
                        placeholder="e.g. Mohamed Ahmed Mahmoud"
                        className="w-full h-11 bg-white border-[1.5px] border-slate-900 rounded-xl px-3.5 text-left text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    {/* National ID */}
                    <div className="space-y-1.5">
                      <label className="h-7 flex items-center gap-2 text-xs font-black text-slate-800">
                        <span>{t.nationalId}</span>
                        <span
                          className={`h-5 inline-flex items-center text-[10px] font-extrabold px-2 rounded-full border border-slate-900 ${
                            nationalId.length === 14
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {formatNumberDigits(nationalId.length, numberLang)} / {formatNumberDigits(14, numberLang)}
                        </span>
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        maxLength={14}
                        value={formatNumberDigits(nationalId, numberLang)}
                        onChange={(e) => handleNationalIdChange(e.target.value)}
                        placeholder="14 رقم"
                        className={`w-full h-11 border-[1.5px] border-slate-900 rounded-xl px-3.5 text-center font-mono text-sm font-bold outline-none transition-all ${
                          nationalId && nationalId.length !== 14
                            ? 'bg-red-50 text-red-900 focus:ring-2 focus:ring-red-500'
                            : 'bg-white text-slate-900 focus:ring-2 focus:ring-amber-500'
                        }`}
                      />
                      {nationalId && nationalId.length !== 14 && (
                        <p className="flex items-center gap-1 text-[11px] font-bold text-red-600">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>يجب أن يتكون الرقم القومي من {formatNumberDigits(14, numberLang)} رقماً</span>
                        </p>
                      )}
                    </div>

                    {/* Student Status (KG) or Enrollment Status */}
                    {isKindergarten ? (
                      <div className="space-y-1.5">
                        <label className="h-7 flex items-center text-xs font-black text-slate-800">حالة التلميذ</label>
                        <select
                          value={studentStatus}
                          onChange={(e) => setStudentStatus(e.target.value === 'دمج' ? 'دمج' : 'عادى')}
                          className="w-full h-11 bg-white border-[1.5px] border-slate-900 rounded-xl px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer appearance-none"
                        >
                          <option value="عادى">عادى</option>
                          <option value="دمج">دمج</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="h-7 flex items-center text-xs font-black text-slate-800">{t.enrollmentStatus}</label>
                        <select
                          value={enrollmentStatus}
                          onChange={(e) => setEnrollmentStatus(e.target.value)}
                          className="w-full h-11 bg-white border-[1.5px] border-slate-900 rounded-xl px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer appearance-none"
                        >
                          <option value="">اختر حالة القيد</option>
                          {statusOptions.map((val) => (
                            <option key={val} value={val}>
                              {val}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Exemption Status (International Non-KG) */}
                    {showExemptionStatus && (
                      <div className="space-y-1.5">
                        <label className="h-7 flex items-center text-xs font-black text-slate-800">
                          {(t as any).exemptionStatus || 'حالة الإعفاء'}
                        </label>
                        <select
                          value={exemptionStatus}
                          onChange={(e) => setExemptionStatus(e.target.value)}
                          className="w-full h-11 bg-white border-[1.5px] border-slate-900 rounded-xl px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer appearance-none"
                        >
                          <option value="">بدون إعفاء</option>
                          <option value="كلى">كلى</option>
                          <option value="تدريجى">تدريجى</option>
                        </select>
                      </div>
                    )}

                    {/* Enrollment Type */}
                    <div className="space-y-1.5">
                      <label className="h-7 flex items-center text-xs font-black text-slate-800">
                        {(t as any).enrollmentType || 'نوعية القيد'}
                      </label>
                      <select
                        value={enrollmentType}
                        onChange={(e) => setEnrollmentType(e.target.value)}
                        className="w-full h-11 bg-white border-[1.5px] border-slate-900 rounded-xl px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer appearance-none"
                      >
                        <option value="">اختر نوعية القيد</option>
                        <option value="قيد عادى">{(t as any).enrollmentTypeRegular || 'قيد عادى'}</option>
                        <option value="تحويلات">{(t as any).enrollmentTypeTransfer || 'تحويلات'}</option>
                        <option value="وافدين">{(t as any).enrollmentTypeExpatriate || 'وافدين'}</option>
                        <option value="عائدين من الخارج">{(t as any).enrollmentTypeReturnee || 'عائدين من الخارج'}</option>
                      </select>
                    </div>

                    {/* Religion */}
                    <div className="space-y-1.5">
                      <label className="h-7 flex items-center text-xs font-black text-slate-800">{t.religion}</label>
                      <select
                        value={religion}
                        onChange={(e) => setReligion(e.target.value)}
                        className="w-full h-11 bg-white border-[1.5px] border-slate-900 rounded-xl px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer appearance-none"
                      >
                        <option value="">اختر الديانة</option>
                        <option value="muslim">
                          {gender === 'female' ? (t as any).muslimFemale : t.muslim}
                        </option>
                        <option value="christian">
                          {gender === 'female' ? (t as any).christianFemale : t.christian}
                        </option>
                      </select>
                    </div>

                    {/* Class */}
                    <div className={`${!showExemptionStatus ? 'sm:col-span-2' : ''} space-y-1.5`}>
                      <label className="h-7 flex items-center text-xs font-black text-slate-800">الفصل</label>
                      <select
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        className="w-full h-11 bg-white border-[1.5px] border-slate-900 rounded-xl px-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer appearance-none"
                      >
                        <option value="">اختر الفصل</option>
                        {classOptions.map((cls) => (
                          <option key={cls} value={cls}>
                            {formatNumberDigits(cls, numberLang)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Exam & Control Numbers Section */}
                {(effectiveShowExamFields || !isKindergarten) && (
                  <div className="bg-white rounded-2xl border-2 border-slate-900 p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-black text-slate-900">بيانات الامتحانات والكنترول</span>
                      </div>
                      <span className="min-h-[30px] inline-flex items-center text-[11px] font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-900">
                        {semester === 'second' ? 'الفصل الدراسي الثاني' : 'الفصل الدراسي الأول'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {effectiveShowExamFields && (
                        <>
                          <div className="space-y-1.5">
                            <label className="h-7 flex items-center text-xs font-black text-slate-800">
                              {(t as any).seatNumber || 'رقم الجلوس'}
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              value={formatNumberDigits(seatNumberVal, numberLang)}
                              onChange={(e) => setSeatNumberVal(formatNumberDigits(e.target.value, 'en'))}
                              placeholder="رقم الجلوس"
                              className="w-full h-11 bg-white border-[1.5px] border-slate-900 rounded-xl px-3.5 text-center font-mono text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="h-7 flex items-center text-xs font-black text-slate-800">
                              {(t as any).secretNumber || 'الرقم السري'}
                            </label>
                            <input
                              type="text"
                              dir="ltr"
                              value={formatNumberDigits(secretNumberVal, numberLang)}
                              onChange={(e) => setSecretNumberVal(formatNumberDigits(e.target.value, 'en'))}
                              placeholder="الرقم السري"
                              className="w-full h-11 bg-white border-[1.5px] border-slate-900 rounded-xl px-3.5 text-center font-mono text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                          </div>
                        </>
                      )}

                      {!isKindergarten && (
                        <div className="space-y-1.5">
                          <label className="h-7 flex items-center text-xs font-black text-slate-800">
                            {(t as any).committeeNumber || 'رقم اللجنة'}
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            value={formatNumberDigits(committeeNumberVal, numberLang)}
                            onChange={(e) => setCommitteeNumberVal(formatNumberDigits(e.target.value, 'en'))}
                            placeholder="رقم اللجنة"
                            className="w-full h-11 bg-white border-[1.5px] border-slate-900 rounded-xl px-3.5 text-center font-mono text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 sm:px-6 py-3.5 bg-white border-t-2 border-slate-200 flex items-center gap-3 shrink-0">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black py-3 px-6 rounded-xl border-2 border-slate-900 shadow-md transition-all active:scale-95 text-sm sm:text-base"
                >
                  <Check className="w-5 h-5" />
                  <span>حفظ التعديلات</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black border-2 border-slate-900 transition-all active:scale-95 text-sm sm:text-base"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
