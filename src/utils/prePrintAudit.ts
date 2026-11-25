import { DetailedAssessmentItem, StudentData } from '../types';

export type AuditScreenMode =
  | 'students_data'
  | 'assessments'
  | 'written_exams'
  | 'detailed_assessments';

export type AuditIssueCategory =
  | 'duplicate_seat'
  | 'duplicate_secret'
  | 'missing_data'
  | 'anomalous_grade';

export type AuditSeverity = 'error' | 'warning';

export interface AuditIssue {
  id: string;
  studentId: string;
  studentName: string;
  rowNumber: number;
  seatNumber?: string;
  category: AuditIssueCategory;
  severity: AuditSeverity;
  title: string;
  description: string;
}

export interface AuditEditableColumn {
  key: string;
  label: string;
  max?: number;
  isAddedToTotal?: boolean;
}

export interface PrePrintAuditParams {
  mode: AuditScreenMode;
  students: StudentData[];
  semester: string;
  showExamFields?: boolean;
  isKindergarten?: boolean;
  editableColumns?: AuditEditableColumn[];
  detailedContext?: {
    subjectKey: string;
    subjectLabel: string;
    stage: string;
    isPESubject: boolean;
    isNoWrittenExceptPe: boolean;
    isSecondary2Modern: boolean;
  };
}

export interface PrePrintAuditResult {
  issues: AuditIssue[];
  errorCount: number;
  warningCount: number;
  duplicateCount: number;
  missingCount: number;
  anomalousCount: number;
  totalStudents: number;
}

function normalizeDigits(val: unknown): string {
  if (val === undefined || val === null) return '';
  return String(val)
    .trim()
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/\s+/g, ' ');
}

function getStudentSeat(student: StudentData, semester: string): string {
  return normalizeDigits(student.seatNumbers?.[semester] ?? student.seatNumber ?? '');
}

function getStudentSecret(student: StudentData, semester: string): string {
  return normalizeDigits(student.secretNumbers?.[semester] ?? student.secretNumber ?? '');
}

function isAbsenceToken(raw: string): boolean {
  const norm = normalizeDigits(raw).toLowerCase();
  return norm === 'غ' || norm === 'غائب' || norm === 'a' || norm === 'absent';
}

function isExemptToken(raw: string): boolean {
  const norm = normalizeDigits(raw).toLowerCase();
  return norm === 'معفى' || norm === 'معفي' || norm === 'م';
}

function isStudentNonRegular(student: StudentData): boolean {
  const combined = `${student.enrollmentStatus || ''} ${student.exemptionStatus || ''} ${student.studentStatus || ''}`;
  return (
    combined.includes('معفى') ||
    combined.includes('معفي') ||
    combined.includes('محول') ||
    combined.includes('محولة') ||
    combined.includes('منقطع') ||
    combined.includes('منقطعة')
  );
}

export function runPrePrintAudit(params: PrePrintAuditParams): PrePrintAuditResult {
  const {
    mode,
    students,
    semester,
    showExamFields = true,
    isKindergarten = false,
    editableColumns = [],
    detailedContext,
  } = params;

  const issues: AuditIssue[] = [];
  const seatMap = new Map<string, { student: StudentData; rowNumber: number }[]>();
  const secretMap = new Map<string, { student: StudentData; rowNumber: number }[]>();

  let anySeatAssigned = false;
  let anySecretAssigned = false;

  students.forEach((student, idx) => {
    const rowNumber = idx + 1;
    const seat = getStudentSeat(student, semester);
    const secret = getStudentSecret(student, semester);

    if (seat) {
      anySeatAssigned = true;
      const list = seatMap.get(seat) || [];
      list.push({ student, rowNumber });
      seatMap.set(seat, list);
    }

    if (secret) {
      anySecretAssigned = true;
      const list = secretMap.get(secret) || [];
      list.push({ student, rowNumber });
      secretMap.set(secret, list);
    }
  });

  // 1. أرقام الجلوس المكررة
  seatMap.forEach((entries, seatVal) => {
    if (entries.length > 1) {
      const otherNames = entries
        .map((e) => e.student.name?.trim() || `طالب #${e.rowNumber}`)
        .slice(0, 4)
        .join(' ، ');
      entries.forEach(({ student, rowNumber }) => {
        issues.push({
          id: `dup-seat-${student.id}`,
          studentId: student.id,
          studentName: student.name?.trim() || `طالب رقم ${rowNumber}`,
          rowNumber,
          seatNumber: seatVal,
          category: 'duplicate_seat',
          severity: 'error',
          title: `رقم جلوس مكرر ( ${seatVal} )`,
          description: `رقم الجلوس ( ${seatVal} ) مكرر لدى ${entries.length} طلاب : ${otherNames}${entries.length > 4 ? ' ...' : ''}`,
        });
      });
    }
  });

  // 2. الأرقام السرية المكررة
  secretMap.forEach((entries, secretVal) => {
    if (entries.length > 1) {
      const otherNames = entries
        .map((e) => e.student.name?.trim() || `طالب #${e.rowNumber}`)
        .slice(0, 4)
        .join(' ، ');
      entries.forEach(({ student, rowNumber }) => {
        issues.push({
          id: `dup-secret-${student.id}`,
          studentId: student.id,
          studentName: student.name?.trim() || `طالب رقم ${rowNumber}`,
          rowNumber,
          seatNumber: getStudentSeat(student, semester),
          category: 'duplicate_secret',
          severity: 'error',
          title: `رقم سري مكرر ( ${secretVal} )`,
          description: `الرقم السري ( ${secretVal} ) مكرر لدى ${entries.length} طلاب : ${otherNames}${entries.length > 4 ? ' ...' : ''}`,
        });
      });
    }
  });

  // 3 & 4. فحص بيانات كل طالب ودرجاته
  students.forEach((student, idx) => {
    const rowNumber = idx + 1;
    const rawName = (student.name || '').trim();
    const displayName = rawName || (isKindergarten ? `تلميذ رقم ${rowNumber}` : `طالب رقم ${rowNumber}`);
    const seat = getStudentSeat(student, semester);
    const secret = getStudentSecret(student, semester);
    const nonRegular = isStudentNonRegular(student);

    // فحص الاسم
    if (!rawName) {
      issues.push({
        id: `missing-name-${student.id}`,
        studentId: student.id,
        studentName: displayName,
        rowNumber,
        seatNumber: seat,
        category: 'missing_data',
        severity: 'error',
        title: isKindergarten ? 'اسم التلميذ غير مكتوب' : 'اسم الطالب غير مكتوب',
        description: `الصف رقم ${rowNumber} لا يحتوي على اسم مسجل.`,
      });
    } else if (rawName.split(/\s+/).length < 2) {
      issues.push({
        id: `short-name-${student.id}`,
        studentId: student.id,
        studentName: displayName,
        rowNumber,
        seatNumber: seat,
        category: 'missing_data',
        severity: 'warning',
        title: 'الاسم غير مكتمل',
        description: `الاسم ( ${rawName} ) مكوّن من كلمة واحدة فقط.`,
      });
    }

    // فحص بيانات الطالب الأساسية في شاشة تحرير البيانات (أو بشكل موجز في الكل)
    const missingBasicFields: string[] = [];
    const nid = normalizeDigits(student.nationalId).replace(/\s+/g, '');
    if (mode === 'students_data') {
      if (!nid) {
        missingBasicFields.push('الرقم القومي');
      } else if (!/^\d{14}$/.test(nid)) {
        issues.push({
          id: `invalid-nid-${student.id}`,
          studentId: student.id,
          studentName: displayName,
          rowNumber,
          seatNumber: seat,
          category: 'missing_data',
          severity: 'warning',
          title: 'رقم قومي غير مطابق ( 14 رقماً )',
          description: `الرقم القومي المسجل ( ${nid} ) يتكون من ${nid.length} رقم بدلاً من 14 رقماً.`,
        });
      }
      if (!student.gender?.trim()) missingBasicFields.push('النوع');
      if (!student.religion?.trim()) missingBasicFields.push('الديانة');
      if (!student.enrollmentStatus?.trim()) missingBasicFields.push('حالة القيد');
    }

    if (showExamFields && !isKindergarten) {
      if (anySeatAssigned && !seat) {
        missingBasicFields.push('رقم الجلوس');
      }
      if (anySecretAssigned && !secret) {
        missingBasicFields.push('الرقم السري');
      }
    }

    if (missingBasicFields.length > 0) {
      issues.push({
        id: `missing-basic-${student.id}`,
        studentId: student.id,
        studentName: displayName,
        rowNumber,
        seatNumber: seat,
        category: 'missing_data',
        severity: missingBasicFields.includes('رقم الجلوس') ? 'error' : 'warning',
        title: 'بيانات أساسية ناقصة',
        description: `ينقص الطالب الحقول التالية : ${missingBasicFields.join(' ، ')}.`,
      });
    }

    // فحص درجات التقييمات أو التحريري
    if ((mode === 'assessments' || mode === 'written_exams') && editableColumns.length > 0) {
      const gradesMap =
        mode === 'assessments'
          ? student.assessments?.[semester] || {}
          : student.writtenExams?.[semester] || {};

      const missingSubjects: string[] = [];
      const zeroSubjects: string[] = [];
      let hasAnyRecordedGrade = false;

      editableColumns.forEach((col) => {
        const rawVal = (gradesMap as Record<string, unknown>)[col.key];
        const strVal = rawVal === undefined || rawVal === null ? '' : String(rawVal).trim();

        if (strVal === '') {
          if (!nonRegular) {
            missingSubjects.push(col.label);
          }
          return;
        }

        hasAnyRecordedGrade = true;

        if (isAbsenceToken(strVal) || isExemptToken(strVal)) {
          return;
        }

        const normalizedNumStr = normalizeDigits(strVal).replace(',', '.');
        const num = Number(normalizedNumStr);

        if (Number.isNaN(num)) {
          issues.push({
            id: `invalid-grade-${student.id}-${col.key}`,
            studentId: student.id,
            studentName: displayName,
            rowNumber,
            seatNumber: seat,
            category: 'anomalous_grade',
            severity: 'error',
            title: `قيمة غير صالحة في ${col.label}`,
            description: `القيمة ( ${strVal} ) في مادة ${col.label} ليست رقماً صحيحاً أو رمز غياب ( غ ) .`,
          });
          return;
        }

        const colMax = col.max;
        if (num < 0) {
          issues.push({
            id: `neg-grade-${student.id}-${col.key}`,
            studentId: student.id,
            studentName: displayName,
            rowNumber,
            seatNumber: seat,
            category: 'anomalous_grade',
            severity: 'error',
            title: `درجة سالبة في ${col.label}`,
            description: `الدرجة ( ${num} ) أقل من الصفر في مادة ${col.label}.`,
          });
        } else if (colMax !== undefined && colMax > 0 && num > colMax) {
          issues.push({
            id: `over-max-${student.id}-${col.key}`,
            studentId: student.id,
            studentName: displayName,
            rowNumber,
            seatNumber: seat,
            category: 'anomalous_grade',
            severity: 'error',
            title: `درجة تتجاوز النهاية العظمى ( ${col.label} )`,
            description: `الدرجة المرصودة ( ${num} ) تتجاوز النهاية العظمى للمادة ( ${colMax} ) .`,
          });
        } else if (num === 0) {
          zeroSubjects.push(col.label);
        }
      });

      if (nonRegular && hasAnyRecordedGrade) {
        issues.push({
          id: `conflict-nonreg-${student.id}`,
          studentId: student.id,
          studentName: displayName,
          rowNumber,
          seatNumber: seat,
          category: 'anomalous_grade',
          severity: 'warning',
          title: 'تعارض بين حالة الطالب والدرجات المرصودة',
          description: `الطالب حالته ( ${student.exemptionStatus || student.enrollmentStatus} ) ومع ذلك تم رصد درجات له.`,
        });
      }

      if (zeroSubjects.length > 0) {
        const preview = zeroSubjects.slice(0, 3).join(' ، ');
        issues.push({
          id: `zero-grade-${student.id}`,
          studentId: student.id,
          studentName: displayName,
          rowNumber,
          seatNumber: seat,
          category: 'anomalous_grade',
          severity: 'warning',
          title: `درجة صفر صريحة ( ${zeroSubjects.length} ${zeroSubjects.length === 1 ? 'مادة' : 'مواد'} )`,
          description: `مرصود ( 0 ) في : ${preview}${zeroSubjects.length > 3 ? ` و + ${zeroSubjects.length - 3} أخرى` : ''}. تأكد هل المقصود صفر أم غياب ( غ ) .`,
        });
      }

      if (missingSubjects.length > 0) {
        const preview = missingSubjects.slice(0, 3).join(' ، ');
        issues.push({
          id: `missing-grades-${student.id}`,
          studentId: student.id,
          studentName: displayName,
          rowNumber,
          seatNumber: seat,
          category: 'missing_data',
          severity: 'warning',
          title: `درجات غير مرصودة ( ${missingSubjects.length} ${missingSubjects.length === 1 ? 'مادة' : 'مواد'} )`,
          description: `لم تُرصد درجات في : ${preview}${missingSubjects.length > 3 ? ` و + ${missingSubjects.length - 3} أخرى` : ''}.`,
        });
      }
    }

    // فحص التقييمات التفصيلية للمادة المحددة
    if (mode === 'detailed_assessments' && detailedContext) {
      const { subjectKey, subjectLabel, stage, isPESubject, isNoWrittenExceptPe, isSecondary2Modern } =
        detailedContext;
      const isMiddle = stage === 'middle' || stage === 'prep';
      const isSecondary = stage === 'secondary';

      let fieldSpecs: { key: keyof DetailedAssessmentItem; label: string; max: number }[] = [];
      if (isSecondary2Modern) {
        fieldSpecs = [
          { key: 'weeklyAssessment', label: 'التقييم الأسبوعي', max: 20 },
          { key: 'researchProject', label: 'المشروع البحثي', max: 15 },
          { key: 'homework', label: 'كراسة الواجب', max: 15 },
          { key: 'behavior', label: 'السلوك والمواظبة', max: 10 },
          { key: 'firstMonthlyExam', label: 'اختبار الشهر الأول', max: 20 },
          { key: 'secondMonthlyExam', label: 'اختبار الشهر الثاني', max: 20 },
        ];
      } else if (isPESubject) {
        fieldSpecs = [
          { key: 'physicalSkillDomain', label: 'المجال البدني والمهاري', max: 50 },
          { key: 'cognitiveDomain', label: 'المجال المعرفي', max: 20 },
          { key: 'affectiveBehavioralDomain', label: 'المجال الوجداني والسلوكي', max: 20 },
          { key: 'sportsUniformAttendance', label: 'الزي الرياضي والمواظبة', max: 10 },
        ];
      } else if (isNoWrittenExceptPe) {
        fieldSpecs = [
          { key: 'practicalPerformance', label: 'الأداء العملي والمهاري', max: 60 },
          { key: 'classActivities', label: 'الأنشطة الصفية', max: 20 },
          { key: 'behavior', label: 'السلوك والمواظبة', max: 20 },
        ];
      } else if (isSecondary) {
        fieldSpecs = [
          { key: 'homework', label: 'الواجب', max: 15 },
          { key: 'weeklyAssessment', label: 'التقييم الأسبوعي', max: 15 },
          { key: 'behavior', label: 'السلوك والمواظبة', max: 10 },
          { key: 'firstMonthlyExam', label: 'اختبار الشهر الأول', max: 15 },
          { key: 'secondMonthlyExam', label: 'اختبار الشهر الثاني', max: 15 },
        ];
      } else if (isMiddle) {
        fieldSpecs = [
          { key: 'homework', label: 'الواجب', max: 10 },
          { key: 'weeklyAssessment', label: 'التقييم الأسبوعي', max: 20 },
          { key: 'behavior', label: 'السلوك والمواظبة', max: 10 },
          { key: 'firstMonthlyExam', label: 'اختبار الشهر الأول', max: 15 },
          { key: 'secondMonthlyExam', label: 'اختبار الشهر الثاني', max: 15 },
        ];
      } else {
        fieldSpecs = [
          { key: 'classNotebook', label: 'كراسة الحصة', max: 5 },
          { key: 'homework', label: 'الواجب', max: 5 },
          { key: 'weeklyAssessment', label: 'التقييم الأسبوعي', max: 10 },
          { key: 'behavior', label: 'السلوك والمواظبة', max: 5 },
          { key: 'firstMonthlyExam', label: 'اختبار الشهر الأول', max: 15 },
          { key: 'secondMonthlyExam', label: 'اختبار الشهر الثاني', max: 15 },
        ];
      }

      const item = student.detailedAssessments?.[semester]?.[subjectKey];
      const missingFields: string[] = [];
      let hasAbsentSub = false;
      let hasNumericSub = false;

      fieldSpecs.forEach((spec) => {
        let rawVal = item?.[spec.key];
        if (spec.key === 'sportsUniformAttendance' && (rawVal === undefined || rawVal === '')) {
          rawVal = item?.behavior;
        }
        const strVal = rawVal === undefined || rawVal === null ? '' : String(rawVal).trim();

        if (strVal === '') {
          if (!nonRegular) missingFields.push(spec.label);
          return;
        }

        if (isAbsenceToken(strVal)) {
          hasAbsentSub = true;
          return;
        }

        const num = Number(normalizeDigits(strVal).replace(',', '.'));
        if (Number.isNaN(num)) {
          issues.push({
            id: `det-invalid-${student.id}-${spec.key}`,
            studentId: student.id,
            studentName: displayName,
            rowNumber,
            seatNumber: seat,
            category: 'anomalous_grade',
            severity: 'error',
            title: `قيمة غير صالحة ( ${spec.label} )`,
            description: `القيمة ( ${strVal} ) في بند ${spec.label} ( ${subjectLabel} ) غير صالحة.`,
          });
          return;
        }

        hasNumericSub = true;
        if (num < 0 || num > spec.max) {
          issues.push({
            id: `det-range-${student.id}-${spec.key}`,
            studentId: student.id,
            studentName: displayName,
            rowNumber,
            seatNumber: seat,
            category: 'anomalous_grade',
            severity: 'error',
            title: `درجة تتجاوز الحد ( ${spec.label} )`,
            description: `الدرجة ( ${num} ) في بند ${spec.label} تتعدى النهاية العظمى ( ${spec.max} ) .`,
          });
        }
      });

      if (hasAbsentSub && hasNumericSub) {
        issues.push({
          id: `det-conflict-absent-${student.id}`,
          studentId: student.id,
          studentName: displayName,
          rowNumber,
          seatNumber: seat,
          category: 'anomalous_grade',
          severity: 'warning',
          title: `تضارب غياب ودرجات في ${subjectLabel}`,
          description: `تم تسجيل غياب ( غ ) في بعض بنود ${subjectLabel} مع وجود درجات رقمية في بنود أخرى.`,
        });
      }

      if (missingFields.length > 0 && missingFields.length < fieldSpecs.length) {
        const preview = missingFields.slice(0, 3).join(' ، ');
        issues.push({
          id: `det-partial-${student.id}`,
          studentId: student.id,
          studentName: displayName,
          rowNumber,
          seatNumber: seat,
          category: 'missing_data',
          severity: 'warning',
          title: `بنود تقييم ناقصة ( ${subjectLabel} )`,
          description: `بنود غير مرصودة : ${preview}${missingFields.length > 3 ? ` و + ${missingFields.length - 3} أخرى` : ''}.`,
        });
      } else if (missingFields.length === fieldSpecs.length && !nonRegular) {
        issues.push({
          id: `det-empty-${student.id}`,
          studentId: student.id,
          studentName: displayName,
          rowNumber,
          seatNumber: seat,
          category: 'missing_data',
          severity: 'warning',
          title: `لم يُرصد تقييم ${subjectLabel}`,
          description: `جميع بنود مادة ${subjectLabel} فارغة لهذا الطالب.`,
        });
      }
    }
  });

  // ترتيب الأخطاء الحرجة أولاً ثم التحذيرات
  issues.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'error' ? -1 : 1;
    }
    return a.rowNumber - b.rowNumber;
  });

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const duplicateCount = issues.filter(
    (i) => i.category === 'duplicate_seat' || i.category === 'duplicate_secret'
  ).length;
  const missingCount = issues.filter((i) => i.category === 'missing_data').length;
  const anomalousCount = issues.filter((i) => i.category === 'anomalous_grade').length;

  return {
    issues,
    errorCount,
    warningCount,
    duplicateCount,
    missingCount,
    anomalousCount,
    totalStudents: students.length,
  };
}
