import { StudentData, AssessmentGrades } from '../types';

export type StudentPerformanceProfile =
  | 'excellent'
  | 'very_good'
  | 'good'
  | 'acceptable'
  | 'borderline_mercy_1'
  | 'borderline_mercy_2'
  | 'second_session_1_total'
  | 'second_session_1_written'
  | 'second_session_2'
  | 'second_session_religion'
  | 'fail_3'
  | 'fail_4';

interface RawStudentProfile {
  name: string;
  gender: 'male' | 'female';
  religion: 'muslim' | 'christian';
  enrollmentType: string;
  statusVariant: 'new' | 'repeating' | 'damg_new' | 'damg_repeating';
  performanceProfile: StudentPerformanceProfile;
}

const STUDENT_PROFILES_POOL: RawStudentProfile[] = [
  // 1. ناجح (ممتاز)
  { name: 'أحمد محمد محمود على', gender: 'male', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'excellent' },
  // 2. ناجحة (جيد جداً)
  { name: 'مريم طارق حسن إبراهيم', gender: 'female', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'very_good' },
  // 3. دور ثان (مادة واحدة - مجموع أقل من 50%) / رياض أطفال: ناجح حكماً
  { name: 'يوسف عمرو سعيد عبد الله', gender: 'male', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'second_session_1_total' },
  // 4. ناجحة (جيد)
  { name: 'نور الهدى خالد مصطفى كمال', gender: 'female', religion: 'muslim', enrollmentType: 'تحويلات', statusVariant: 'new', performanceProfile: 'good' },
  // 5. راسب (3 مواد) / ابتدائى: دور ثان / رياض أطفال: ناجح حكماً
  { name: 'محمود إيهاب رجب السويفى', gender: 'male', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'repeating', performanceProfile: 'fail_3' },
  // 6. دور ثان (مادتان) / رياض أطفال: ناجحة حكماً
  { name: 'سارة عبد الرحمن عادل حسين', gender: 'female', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'second_session_2' },
  // 7. ناجح (ممتاز)
  { name: 'مينا جرجس صموئيل عطية', gender: 'male', religion: 'christian', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'excellent' },
  // 8. ناجحة (مقبول)
  { name: 'سلمى هشام صلاح الدين محمود', gender: 'female', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'acceptable' },
  // 9. راسبة (4 مواد) / ابتدائى: دور ثان / رياض أطفال: ناجحة حكماً
  { name: 'جنى شريف عزت الفرماوى', gender: 'female', religion: 'muslim', enrollmentType: 'تحويلات', statusVariant: 'repeating', performanceProfile: 'fail_4' },
  // 10. ناجح (جيد جداً)
  { name: 'عمر ياسر فاروق عبد العزيز', gender: 'male', religion: 'muslim', enrollmentType: 'عائدين من الخارج', statusVariant: 'new', performanceProfile: 'very_good' },
  // 11. دور ثان (مرشح لدرجات الرأفة في مادة واحدة) / رياض أطفال: ناجح حكماً
  { name: 'زياد أشرف كمال الشاذلى', gender: 'male', religion: 'muslim', enrollmentType: 'وافدين', statusVariant: 'new', performanceProfile: 'borderline_mercy_1' },
  // 12. ناجحة (جيد)
  { name: 'حبيبة تامر جمال عبد الناصر', gender: 'female', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'damg_new', performanceProfile: 'good' },
  // 13. دور ثان (بسبب درجة التحريري في الفصل الثاني أقل من الحد الأدنى) / رياض أطفال: ناجح حكماً
  { name: 'كريم وليد سامى المنشاوى', gender: 'male', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'second_session_1_written' },
  // 14. دور ثان (رسوب في التربية الدينية < 70% + مادة) / رياض أطفال: ناجحة حكماً
  { name: 'رقية سامح ممدوح العطار', gender: 'female', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'second_session_religion' },
  // 15. راسب (3 مواد) / ابتدائى: دور ثان / رياض أطفال: ناجح حكماً
  { name: 'مازن وائل عصام الدين زكى', gender: 'male', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'repeating', performanceProfile: 'fail_3' },
  // 16. ناجح (جيد جداً)
  { name: 'كيرلس هانى نبيل غطاس', gender: 'male', religion: 'christian', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'very_good' },
  // 17. ناجحة (ممتاز)
  { name: 'مارينا مجدى شفيق بطرس', gender: 'female', religion: 'christian', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'excellent' },
  // 18. دور ثان (مرشحة لدرجات الرأفة في مادتين) / رياض أطفال: ناجحة حكماً
  { name: 'فاطمة الزهراء محمد نبيل سالم', gender: 'female', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'borderline_mercy_2' },
  // 19. ناجح (ممتاز)
  { name: 'عبد الله أيمن فؤاد الجندى', gender: 'male', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'excellent' },
  // 20. راسبة (3 مواد) / ابتدائى: دور ثان / رياض أطفال: ناجحة حكماً
  { name: 'ليان معتز حلمى عبد الفتاح', gender: 'female', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'repeating', performanceProfile: 'fail_3' },
  // 21. ناجح (جيد)
  { name: 'آدم حسام الدين فتحى رضوان', gender: 'male', religion: 'muslim', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'good' },
  // 22. ناجحة (ممتاز)
  { name: 'ملك رامى علاء الدين شكرى', gender: 'female', religion: 'muslim', enrollmentType: 'عائدين من الخارج', statusVariant: 'new', performanceProfile: 'excellent' },
  // 23. راسب (4 مواد) / ابتدائى: دور ثان / رياض أطفال: ناجح حكماً
  { name: 'حمزة باسم توفيق الدسوقى', gender: 'male', religion: 'muslim', enrollmentType: 'تحويلات', statusVariant: 'damg_repeating', performanceProfile: 'fail_4' },
  // 24. دور ثان (مادة واحدة) / رياض أطفال: ناجح حكماً
  { name: 'بيشوى ملاك وديع رزق', gender: 'male', religion: 'christian', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'second_session_1_total' },
  // 25. ناجحة (جيد جداً)
  { name: 'دميانة عادل فكرى حنا', gender: 'female', religion: 'christian', enrollmentType: 'قيد عادى', statusVariant: 'new', performanceProfile: 'very_good' },
];

const SERVICES_STUDENTS_POOL: RawStudentProfile[] = [
  // أسماء خاصة ومميزة لطلاب نظام الخدمات (Services) بالثانوية العامة
  { name: 'حسام الدين فراج عبد الخالق', gender: 'male', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'excellent' },
  { name: 'نوران حسام الدين مصطفى', gender: 'female', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'very_good' },
  { name: 'باسم صبرى عبدالغفار الشريف', gender: 'male', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'second_session_1_total' },
  { name: 'بسملة أحمد عبد التواب عويس', gender: 'female', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'good' },
  { name: 'إبراهيم ممدوح إبراهيم دسوقى', gender: 'male', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'repeating', performanceProfile: 'fail_3' },
  { name: 'شهد رمضان عبد الرازق البهنساوى', gender: 'female', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'second_session_2' },
  { name: 'فادي إميل فريد واصف', gender: 'male', religion: 'christian', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'excellent' },
  { name: 'آية محمد السيد أبو اليزيد', gender: 'female', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'acceptable' },
  { name: 'روان هاني عبد الحليم قاسم', gender: 'female', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'repeating', performanceProfile: 'fail_4' },
  { name: 'مصطفى رجب عبد العال مرسي', gender: 'male', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'very_good' },
  { name: 'مؤمن عادل شحاتة البنا', gender: 'male', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'borderline_mercy_1' },
  { name: 'ريم إسلام سعد الدين بركات', gender: 'female', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'damg_new', performanceProfile: 'good' },
  { name: 'إسلام حسني عبد الونيس النجار', gender: 'male', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'second_session_1_written' },
  { name: 'نادين أشرف زكي الهواري', gender: 'female', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'second_session_religion' },
  { name: 'مهند صبري عبد الحميد بدر', gender: 'male', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'repeating', performanceProfile: 'fail_3' },
  { name: 'جوزيف فايز نسيم حنا', gender: 'male', religion: 'christian', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'very_good' },
  { name: 'ساندي صموئيل فهمي تادرس', gender: 'female', religion: 'christian', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'excellent' },
  { name: 'منة الله مختار عبد الفتاح قطب', gender: 'female', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'borderline_mercy_2' },
  { name: 'زياد طارق عبد الباقي الشربيني', gender: 'male', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'excellent' },
  { name: 'كنزي محمد فريد عبد السلام', gender: 'female', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'repeating', performanceProfile: 'fail_3' },
  { name: 'معاذ صلاح الدين محمود الغنام', gender: 'male', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'good' },
  { name: 'جنا عماد الدين توفيق الألفي', gender: 'female', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'excellent' },
  { name: 'أدهم حاتم رشاد الحلواني', gender: 'male', religion: 'muslim', enrollmentType: 'خدمات', statusVariant: 'damg_repeating', performanceProfile: 'fail_4' },
  { name: 'مينا بقطر توفيق جاد الله', gender: 'male', religion: 'christian', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'second_session_1_total' },
  { name: 'جيسيكا عادل مراد بسطوروس', gender: 'female', religion: 'christian', enrollmentType: 'خدمات', statusVariant: 'new', performanceProfile: 'very_good' },
];

function buildNationalId(
  birthYear: number,
  studentIndex: number,
  stageSeed: number,
  gender: 'male' | 'female'
): string {
  const century = birthYear >= 2000 ? '3' : '2';
  const yy = String(birthYear % 100).padStart(2, '0');
  const mm = String(((studentIndex + stageSeed) % 12) + 1).padStart(2, '0');
  const dd = String(((studentIndex * 2 + stageSeed) % 27) + 1).padStart(2, '0');
  const govCodes = ['01', '02', '12', '13', '14', '16', '18', '21', '25', '26'];
  const gov = govCodes[(studentIndex + stageSeed) % govCodes.length];
  const serialBase = String(((stageSeed * 17 + studentIndex * 7) % 89) + 10).padStart(3, '0');
  const oddDigits = ['1', '3', '5', '7', '9'];
  const evenDigits = ['2', '4', '6', '8'];
  const genderDigit =
    gender === 'male'
      ? oddDigits[(studentIndex + stageSeed) % oddDigits.length]
      : evenDigits[(studentIndex + stageSeed) % evenDigits.length];
  const checkDigit = String(((studentIndex * 3 + stageSeed) % 9) + 1);
  return `${century}${yy}${mm}${dd}${gov}${serialBase}${genderDigit}${checkDigit}`;
}

function getEnrollmentStatusText(
  isFirstGrade: boolean,
  gender: 'male' | 'female',
  variant: 'new' | 'repeating' | 'damg_new' | 'damg_repeating'
): string {
  if (variant === 'damg_new' || variant === 'damg_repeating') {
    return gender === 'male' ? 'مستجد دمج' : 'مستجدة دمج';
  }
  if (variant === 'repeating') {
    return gender === 'male' ? 'باقٍ لإعادة الإمتحان' : 'باقية لإعادة الإمتحان';
  }
  return gender === 'male' ? 'مستجد' : 'مستجدة';
}

function randRange(min: number, max: number, studentIdx: number, subjIdx: number, seedKey: number): number {
  const x = Math.sin(studentIdx * 997 + subjIdx * 331 + seedKey * 149) * 10000;
  const rnd = x - Math.floor(x);
  return min + rnd * (max - min);
}

function clampGrade(val: number, max: number): number {
  const rounded = Math.round(val * 10) / 10;
  return Math.max(0, Math.min(max, rounded));
}

function computeSubjectRatios(
  profile: StudentPerformanceProfile,
  studentIdx: number,
  subjIdx: number,
  isReligion: boolean,
  hasWritten: boolean
): { a1: number; w1: number; a2: number; w2: number } {
  const passA1 = isReligion
    ? randRange(0.75, 0.95, studentIdx, subjIdx, 1)
    : randRange(0.62, 0.88, studentIdx, subjIdx, 1);
  const passW1 = isReligion
    ? randRange(0.74, 0.90, studentIdx, subjIdx, 2)
    : randRange(0.60, 0.85, studentIdx, subjIdx, 2);
  const passA2 = isReligion
    ? randRange(0.76, 0.94, studentIdx, subjIdx, 3)
    : randRange(0.65, 0.90, studentIdx, subjIdx, 3);
  const passW2 = isReligion
    ? randRange(0.75, 0.92, studentIdx, subjIdx, 4)
    : randRange(0.62, 0.86, studentIdx, subjIdx, 4);

  switch (profile) {
    case 'excellent':
      return {
        a1: randRange(0.89, 0.99, studentIdx, subjIdx, 1),
        w1: randRange(0.88, 0.98, studentIdx, subjIdx, 2),
        a2: randRange(0.90, 1.0, studentIdx, subjIdx, 3),
        w2: randRange(0.88, 0.99, studentIdx, subjIdx, 4),
      };
    case 'very_good':
      return {
        a1: randRange(0.78, 0.87, studentIdx, subjIdx, 1),
        w1: randRange(0.76, 0.85, studentIdx, subjIdx, 2),
        a2: randRange(0.79, 0.88, studentIdx, subjIdx, 3),
        w2: randRange(0.77, 0.86, studentIdx, subjIdx, 4),
      };
    case 'good':
      return {
        a1: isReligion ? randRange(0.75, 0.84, studentIdx, subjIdx, 1) : randRange(0.67, 0.76, studentIdx, subjIdx, 1),
        w1: isReligion ? randRange(0.73, 0.82, studentIdx, subjIdx, 2) : randRange(0.65, 0.74, studentIdx, subjIdx, 2),
        a2: isReligion ? randRange(0.75, 0.85, studentIdx, subjIdx, 3) : randRange(0.68, 0.77, studentIdx, subjIdx, 3),
        w2: isReligion ? randRange(0.74, 0.83, studentIdx, subjIdx, 4) : randRange(0.66, 0.75, studentIdx, subjIdx, 4),
      };
    case 'acceptable':
      return {
        a1: isReligion ? randRange(0.72, 0.78, studentIdx, subjIdx, 1) : randRange(0.54, 0.64, studentIdx, subjIdx, 1),
        w1: isReligion ? randRange(0.70, 0.76, studentIdx, subjIdx, 2) : randRange(0.52, 0.62, studentIdx, subjIdx, 2),
        a2: isReligion ? randRange(0.72, 0.79, studentIdx, subjIdx, 3) : randRange(0.55, 0.64, studentIdx, subjIdx, 3),
        w2: isReligion ? randRange(0.71, 0.77, studentIdx, subjIdx, 4) : randRange(0.52, 0.63, studentIdx, subjIdx, 4),
      };
    case 'borderline_mercy_1': {
      const targetSubj = 2;
      if (subjIdx === targetSubj && !isReligion && hasWritten) {
        return { a1: 0.48, w1: 0.46, a2: 0.47, w2: 0.46 };
      }
      if (!hasWritten && subjIdx === targetSubj && !isReligion) {
        return { a1: 0.43, w1: 0.43, a2: 0.44, w2: 0.44 };
      }
      return { a1: passA1, w1: passW1, a2: passA2, w2: passW2 };
    }
    case 'borderline_mercy_2': {
      if ((subjIdx === 1 || subjIdx === 2) && !isReligion && hasWritten) {
        return { a1: 0.48, w1: 0.46, a2: 0.46, w2: 0.46 };
      }
      if (!hasWritten && (subjIdx === 1 || subjIdx === 2) && !isReligion) {
        return { a1: 0.41, w1: 0.41, a2: 0.42, w2: 0.42 };
      }
      return { a1: passA1, w1: passW1, a2: passA2, w2: passW2 };
    }
    case 'second_session_1_total': {
      const targetSubj = studentIdx % 2 === 0 ? 2 : 1;
      if (subjIdx === targetSubj && !isReligion) {
        return {
          a1: randRange(0.28, 0.36, studentIdx, subjIdx, 1),
          w1: randRange(0.20, 0.28, studentIdx, subjIdx, 2),
          a2: randRange(0.26, 0.35, studentIdx, subjIdx, 3),
          w2: randRange(0.18, 0.24, studentIdx, subjIdx, 4),
        };
      }
      return { a1: passA1, w1: passW1, a2: passA2, w2: passW2 };
    }
    case 'second_session_1_written': {
      if (subjIdx === 1 && !isReligion) {
        if (!hasWritten) {
          return { a1: 0.38, w1: 0.38, a2: 0.40, w2: 0.40 };
        }
        return {
          a1: 0.82,
          w1: 0.70,
          a2: 0.78,
          w2: 0.15,
        };
      }
      return { a1: passA1, w1: passW1, a2: passA2, w2: passW2 };
    }
    case 'second_session_2': {
      if ((subjIdx === 1 || subjIdx === 2) && !isReligion) {
        return {
          a1: randRange(0.30, 0.38, studentIdx, subjIdx, 1),
          w1: randRange(0.18, 0.25, studentIdx, subjIdx, 2),
          a2: randRange(0.28, 0.36, studentIdx, subjIdx, 3),
          w2: randRange(0.16, 0.22, studentIdx, subjIdx, 4),
        };
      }
      return { a1: passA1, w1: passW1, a2: passA2, w2: passW2 };
    }
    case 'second_session_religion': {
      if (isReligion) {
        return {
          a1: randRange(0.50, 0.56, studentIdx, subjIdx, 1),
          w1: randRange(0.45, 0.52, studentIdx, subjIdx, 2),
          a2: randRange(0.48, 0.55, studentIdx, subjIdx, 3),
          w2: randRange(0.42, 0.50, studentIdx, subjIdx, 4),
        };
      }
      if (subjIdx === 2) {
        return {
          a1: randRange(0.32, 0.39, studentIdx, subjIdx, 1),
          w1: randRange(0.20, 0.26, studentIdx, subjIdx, 2),
          a2: randRange(0.30, 0.37, studentIdx, subjIdx, 3),
          w2: randRange(0.18, 0.24, studentIdx, subjIdx, 4),
        };
      }
      return { a1: passA1, w1: passW1, a2: passA2, w2: passW2 };
    }
    case 'fail_3': {
      if (subjIdx === 0 || subjIdx === 1 || subjIdx === 2) {
        return {
          a1: randRange(0.25, 0.35, studentIdx, subjIdx, 1),
          w1: randRange(0.15, 0.24, studentIdx, subjIdx, 2),
          a2: randRange(0.24, 0.34, studentIdx, subjIdx, 3),
          w2: randRange(0.14, 0.22, studentIdx, subjIdx, 4),
        };
      }
      return { a1: passA1, w1: passW1, a2: passA2, w2: passW2 };
    }
    case 'fail_4': {
      if (subjIdx === 0 || subjIdx === 1 || subjIdx === 2 || subjIdx === 3 || isReligion) {
        return {
          a1: randRange(0.22, 0.33, studentIdx, subjIdx, 1),
          w1: randRange(0.12, 0.22, studentIdx, subjIdx, 2),
          a2: randRange(0.20, 0.32, studentIdx, subjIdx, 3),
          w2: randRange(0.12, 0.20, studentIdx, subjIdx, 4),
        };
      }
      return { a1: passA1, w1: passW1, a2: passA2, w2: passW2 };
    }
  }
}

function buildGradesForStageAndGrade(
  stage: string,
  grade: string,
  studentIdx: number,
  profile: StudentPerformanceProfile,
  isHomeschool: boolean = false
): {
  assessmentsFirst: AssessmentGrades;
  assessmentsSecond: AssessmentGrades;
  writtenFirst: AssessmentGrades;
  writtenSecond: AssessmentGrades;
} {
  const assessmentsFirst: AssessmentGrades = {};
  const assessmentsSecond: AssessmentGrades = {};
  const writtenFirst: AssessmentGrades = {};
  const writtenSecond: AssessmentGrades = {};

  const assignSubjectGrades = (
    key: string,
    sIdx: number,
    maxAssess: number,
    maxWritten: number,
    hasWritten: boolean,
    isReligionOverride?: boolean
  ) => {
    const isReligion = isReligionOverride ?? key === 'religion';
    const r = computeSubjectRatios(profile, studentIdx, sIdx, isReligion, hasWritten);
    assessmentsFirst[key] = clampGrade(r.a1 * maxAssess, maxAssess);
    assessmentsSecond[key] = clampGrade(r.a2 * maxAssess, maxAssess);
    if (hasWritten && maxWritten > 0) {
      writtenFirst[key] = clampGrade(r.w1 * maxWritten, maxWritten);
      writtenSecond[key] = clampGrade(r.w2 * maxWritten, maxWritten);
    }
  };

  const applyCustomColsFromStorage = (defaultMaxAssess: number, defaultMaxWritten: number) => {
    try {
      const candidateKeys = [
        `${stage}_${grade}_assessments_custom_cols`,
        `${stage}_${grade.replace(/ي/g, 'ى')}_assessments_custom_cols`,
        `${stage}_${grade.replace(/ى/g, 'ي')}_assessments_custom_cols`,
      ];
      let savedCols: string | null = null;
      for (const k of candidateKeys) {
        const val = localStorage.getItem(k);
        if (val) {
          savedCols = val;
          break;
        }
      }
      const savedOvr =
        localStorage.getItem(`${stage}_${grade}_assessments_default_overrides`) ||
        localStorage.getItem(`${stage}_${grade.replace(/ي/g, 'ى')}_assessments_default_overrides`) ||
        localStorage.getItem(`${stage}_${grade.replace(/ى/g, 'ي')}_assessments_default_overrides`);
      const ovrMap = savedOvr ? JSON.parse(savedOvr) || {} : {};
      if (savedCols) {
        const parsedCols = JSON.parse(savedCols);
        if (Array.isArray(parsedCols)) {
          parsedCols.forEach((col: any, idx: number) => {
            if (!col || !col.key) return;
            const ovr = ovrMap[col.key] || {};
            const hasWritten =
              stage !== 'kindergarten' &&
              (ovr.hasWrittenExam !== undefined
                ? ovr.hasWrittenExam
                : col.hasWrittenExam !== false);
            const maxAssess =
              ovr.maxAssessmentsGrade !== undefined
                ? Number(ovr.maxAssessmentsGrade)
                : col.maxAssessmentsGrade !== undefined
                ? Number(col.maxAssessmentsGrade)
                : col.maxGrade !== undefined
                ? Number(col.maxGrade)
                : hasWritten
                ? defaultMaxAssess
                : 100;
            const maxWritten = hasWritten
              ? ovr.maxWrittenGrade !== undefined
                ? Number(ovr.maxWrittenGrade)
                : col.maxWrittenGrade !== undefined
                ? Number(col.maxWrittenGrade)
                : defaultMaxWritten
              : 0;
            const isRel =
              col.key === 'religion' ||
              Boolean((ovr.label || col.label) && String(ovr.label || col.label).includes('دين'));
            assignSubjectGrades(col.key, idx, maxAssess, maxWritten, hasWritten, isRel);
          });
        }
      }
    } catch {}
  };

  if (stage === 'kindergarten') {
    const kgSubjects = ['arabic', 'english', 'multidisciplinary', 'pe'];
    kgSubjects.forEach((key, sIdx) => {
      assignSubjectGrades(key, sIdx, 100, 0, false);
    });
    applyCustomColsFromStorage(100, 0);
    return { assessmentsFirst, assessmentsSecond, writtenFirst, writtenSecond };
  }

  const isP13 =
    stage === 'primary' &&
    (grade.includes('الأول') ||
      grade.includes('الاول') ||
      grade.includes('الثاني') ||
      grade.includes('الثالث'));

  if (stage === 'primary' && isP13) {
    const writtenSubjs = ['arabic', 'english', 'math', 'religion'];
    const activitySubjs = ['pe', 'tokkatsu'];

    writtenSubjs.forEach((key, sIdx) => {
      assignSubjectGrades(key, sIdx, 40, 60, true);
    });

    activitySubjs.forEach((key, sIdx) => {
      assignSubjectGrades(key, sIdx + 4, 100, 0, false);
    });

    applyCustomColsFromStorage(40, 60);
    return { assessmentsFirst, assessmentsSecond, writtenFirst, writtenSecond };
  }

  if (stage === 'primary') {
    const writtenSubjs = ['arabic', 'english', 'math', 'science', 'social_studies', 'religion', 'ict'];
    const activitySubjs = ['art', 'pe', 'fields', 'music'];

    writtenSubjs.forEach((key, sIdx) => {
      assignSubjectGrades(key, sIdx, 40, 60, true);
    });

    activitySubjs.forEach((key, sIdx) => {
      assignSubjectGrades(key, sIdx + 7, 100, 0, false);
    });

    applyCustomColsFromStorage(40, 60);
    return { assessmentsFirst, assessmentsSecond, writtenFirst, writtenSecond };
  }

  if (stage === 'middle' || stage === 'prep') {
    const writtenSubjs = ['arabic', 'english', 'math', 'science', 'social_studies', 'religion', 'art', 'ict'];
    const activitySubjs = ['music', 'pe', 'activity1', 'activity2'];

    if (isHomeschool) {
      writtenSubjs.forEach((key, sIdx) => {
        assignSubjectGrades(key, sIdx, 0, 100, true);
      });

      activitySubjs.forEach((key, sIdx) => {
        assignSubjectGrades(key, sIdx + 8, 100, 0, false);
      });

      applyCustomColsFromStorage(0, 100);
      return { assessmentsFirst, assessmentsSecond, writtenFirst, writtenSecond };
    }

    writtenSubjs.forEach((key, sIdx) => {
      assignSubjectGrades(key, sIdx, 70, 30, true);
    });

    activitySubjs.forEach((key, sIdx) => {
      assignSubjectGrades(key, sIdx + 8, 100, 0, false);
    });

    applyCustomColsFromStorage(70, 30);
    return { assessmentsFirst, assessmentsSecond, writtenFirst, writtenSecond };
  }

  const isSecondary2ModernMedical =
    stage === 'secondary' &&
    Boolean(
      grade?.includes('modern_medical') ||
      grade?.includes('medical') ||
      grade?.includes('الطب')
    );

  if (isSecondary2ModernMedical) {
    const medicalWritten = ['arabic', 'english', 'history', 'elective_physics_math', 'financial_literacy'];
    const medicalActivities = ['pe'];

    medicalWritten.forEach((key, sIdx) => {
      assignSubjectGrades(key, sIdx, 100, 100, true);
    });
    medicalActivities.forEach((key, sIdx) => {
      assignSubjectGrades(key, sIdx + medicalWritten.length, 100, 0, false);
    });

    applyCustomColsFromStorage(100, 100);
    return { assessmentsFirst, assessmentsSecond, writtenFirst, writtenSecond };
  }

  const writtenSubjs = [
    'arabic',
    'english',
    'math',
    'history',
    'chemistry',
    'physics',
    'geography',
    'psychology',
    'integrated_sciences',
    'philosophy_logic',
    'second_foreign_language',
    'pe',
    'national_education',
    'programming_ai',
    'religion',
  ];
  const activitySubjs = ['activity', 'educational_vocational_activity'];

  if (isHomeschool) {
    writtenSubjs.forEach((key, sIdx) => {
      const logicalIdx =
        key === 'arabic'
          ? 0
          : key === 'english'
          ? 1
          : key === 'math'
          ? 2
          : key === 'history'
          ? 3
          : sIdx + 1;
      assignSubjectGrades(key, logicalIdx, 0, 100, true);
    });

    activitySubjs.forEach((key, sIdx) => {
      assignSubjectGrades(key, sIdx + 15, 100, 0, false);
    });

    applyCustomColsFromStorage(0, 100);
    return { assessmentsFirst, assessmentsSecond, writtenFirst, writtenSecond };
  }

  writtenSubjs.forEach((key, sIdx) => {
    const logicalIdx =
      key === 'arabic'
        ? 0
        : key === 'english'
        ? 1
        : key === 'math'
        ? 2
        : key === 'history'
        ? 3
        : sIdx + 1;
    assignSubjectGrades(key, logicalIdx, 70, 30, true);
  });

  activitySubjs.forEach((key, sIdx) => {
    assignSubjectGrades(key, sIdx + 15, 100, 0, false);
  });

  applyCustomColsFromStorage(70, 30);
  return { assessmentsFirst, assessmentsSecond, writtenFirst, writtenSecond };
}

export function generateDefaultStudentsForGrade(
  stage: string,
  grade: string,
  stageSeed: number = 1,
  isHomeschool: boolean = false,
  isServices: boolean = false
): StudentData[] {
  const pool = isServices ? SERVICES_STUDENTS_POOL : STUDENT_PROFILES_POOL;

  const isFirstGrade =
    grade.includes('الأول') ||
    grade.includes('الاول') ||
    grade.includes('KG1') ||
    grade.includes('1st');

  const baseBirthYear =
    stage === 'kindergarten'
      ? isFirstGrade
        ? 2021
        : 2020
      : stage === 'primary'
      ? grade.includes('الأول')
        ? 2019
        : grade.includes('الثاني')
        ? 2018
        : grade.includes('الثالث')
        ? 2017
        : grade.includes('الرابع')
        ? 2016
        : grade.includes('الخامس')
        ? 2015
        : 2014
      : stage === 'middle'
      ? isFirstGrade
        ? 2013
        : 2012
      : isFirstGrade
      ? 2010
      : 2009;

  const seatBase = stageSeed * 100 + 1;
  const secretBaseFirst = stageSeed * 20 + 11;
  const secretBaseSecond = stageSeed * 30 + 21;

  return pool.map((profile, idx) => {
    const seatStr = String(seatBase + idx);
    const secretFirstStr = String(secretBaseFirst + idx * 2);
    const secretSecondStr = String(secretBaseSecond + idx * 2);

    const { assessmentsFirst, assessmentsSecond, writtenFirst, writtenSecond } =
      buildGradesForStageAndGrade(stage, grade, idx, profile.performanceProfile, isHomeschool);

    return {
      id: `default_${stage}_${stageSeed}_st_${idx + 1}${isHomeschool ? '_hs' : isServices ? '_serv' : ''}`,
      name: profile.name,
      nationalId: buildNationalId(baseBirthYear, idx + 1, stageSeed, profile.gender),
      gender: profile.gender,
      enrollmentStatus: getEnrollmentStatusText(isFirstGrade, profile.gender, profile.statusVariant),
      studentStatus: stage === 'kindergarten' ? (profile.statusVariant.includes('damg') ? 'دمج' : 'عادى') : undefined,
      enrollmentType: isHomeschool ? 'منازل' : isServices ? 'خدمات' : profile.enrollmentType,
      religion: profile.religion,
      seatNumber: stage === 'kindergarten' ? '' : seatStr,
      secretNumber: stage === 'kindergarten' ? '' : secretFirstStr,
      seatNumbers:
        stage === 'kindergarten'
          ? {}
          : {
              first: seatStr,
              second: seatStr,
              'الفصل الدراسي الأول': seatStr,
              'الفصل الدراسي الثاني': seatStr,
            },
      secretNumbers:
        stage === 'kindergarten'
          ? {}
          : {
              first: secretFirstStr,
              second: secretSecondStr,
              'الفصل الدراسي الأول': secretFirstStr,
              'الفصل الدراسي الثاني': secretSecondStr,
            },
      assessments: {
        first: assessmentsFirst,
        second: assessmentsSecond,
        'الفصل الدراسي الأول': { ...assessmentsFirst },
        'الفصل الدراسي الثاني': { ...assessmentsSecond },
      },
      writtenExams:
        stage === 'kindergarten'
          ? {}
          : {
              first: writtenFirst,
              second: writtenSecond,
              'الفصل الدراسي الأول': { ...writtenFirst },
              'الفصل الدراسي الثاني': { ...writtenSecond },
            },
    };
  });
}

export function getAllDefaultStudentsDataByStage(): Record<string, StudentData[]> {
  const stageGradesMap: { stage: string; grades: string[] }[] = [
    { stage: 'kindergarten', grades: ['المستوى الأول - KG1', 'المستوى الثانى - KG2'] },
    {
      stage: 'primary',
      grades: ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس'],
    },
    { stage: 'middle', grades: ['الصف الأول', 'الصف الثاني'] },
    {
      stage: 'secondary',
      grades: [
        'الصف الأول',
        'الصف الثاني',
        'الصف الثاني_scientific',
        'الصف الثاني_literary',
        'الصف الثاني_modern_medical',
        'الصف الثاني_modern_engineering',
        'الصف الثاني_modern_business',
        'الصف الثاني_modern_arts',
      ],
    },
    { stage: 'commercial_technical', grades: ['الصف الأول', 'الصف الثاني'] },
    { stage: 'industrial_technical', grades: ['الصف الأول', 'الصف الثاني'] },
    { stage: 'agricultural_technical', grades: ['الصف الأول', 'الصف الثاني'] },
    { stage: 'hotel_technical', grades: ['الصف الأول', 'الصف الثاني'] },
  ];

  const result: Record<string, StudentData[]> = {};
  let seed = 1;

  stageGradesMap.forEach(({ stage, grades }) => {
    grades.forEach((grade) => {
      const students = generateDefaultStudentsForGrade(stage, grade, seed++, false, false);
      result[`${stage}_${grade}_shared`] = students;
      if (stage === 'middle' || stage === 'prep' || stage === 'secondary') {
        const homeschoolStudents = generateDefaultStudentsForGrade(stage, grade, seed++, true, false);
        result[`${stage}_${grade}_homeschool_shared`] = homeschoolStudents;
      }
      if (stage === 'secondary') {
        const servicesStudents = generateDefaultStudentsForGrade(stage, grade, seed + 50, false, true);
        result[`${stage}_${grade}_services_shared`] = servicesStudents;
      }
    });
  });

  return result;
}

export function populateMissingSubjectGradesForStudents(
  students: StudentData[],
  stage: string,
  customCols: {
    key: string;
    label?: string;
    maxGrade?: number;
    maxAssessmentsGrade?: number;
    maxWrittenGrade?: number;
    hasWrittenExam?: boolean;
  }[],
  defaultSubjectsOverrides?: Record<string, any>
): { updated: StudentData[]; changed: boolean } {
  if (!students || students.length === 0 || !customCols || customCols.length === 0) {
    return { updated: students, changed: false };
  }

  const defaultMaxAssess = stage === 'kindergarten' ? 100 : stage === 'primary' ? 40 : 70;
  const defaultMaxWritten = stage === 'kindergarten' ? 0 : stage === 'primary' ? 60 : 30;

  let changed = false;
  const updated = students.map((student, sIdx) => {
    const pool = student.enrollmentType === 'خدمات' ? SERVICES_STUDENTS_POOL : STUDENT_PROFILES_POOL;
    const profile = pool[sIdx % pool.length].performanceProfile;

    const aFirst: Record<string, any> = {
      ...(student.assessments?.['الفصل الدراسي الأول'] || {}),
      ...(student.assessments?.first || {}),
    };
    const aSecond: Record<string, any> = {
      ...(student.assessments?.['الفصل الدراسي الثاني'] || {}),
      ...(student.assessments?.second || {}),
    };
    const wFirst: Record<string, any> = {
      ...(student.writtenExams?.['الفصل الدراسي الأول'] || {}),
      ...(student.writtenExams?.first || {}),
    };
    const wSecond: Record<string, any> = {
      ...(student.writtenExams?.['الفصل الدراسي الثاني'] || {}),
      ...(student.writtenExams?.second || {}),
    };

    let studentChanged = false;
    if (stage === 'kindergarten') {
      if ((aFirst['multidisciplinary'] === undefined || aFirst['multidisciplinary'] === null || String(aFirst['multidisciplinary']).trim() === '') && aFirst['math'] !== undefined && aFirst['math'] !== null && String(aFirst['math']).trim() !== '') {
        aFirst['multidisciplinary'] = aFirst['math'];
        studentChanged = true;
      }
      if ((aSecond['multidisciplinary'] === undefined || aSecond['multidisciplinary'] === null || String(aSecond['multidisciplinary']).trim() === '') && aSecond['math'] !== undefined && aSecond['math'] !== null && String(aSecond['math']).trim() !== '') {
        aSecond['multidisciplinary'] = aSecond['math'];
        studentChanged = true;
      }
    }
    customCols.forEach((col, cIdx) => {
      if (!col || !col.key) return;
      const ovr = defaultSubjectsOverrides?.[col.key] || {};
      const hasWritten =
        stage !== 'kindergarten' &&
        (ovr.hasWrittenExam !== undefined ? ovr.hasWrittenExam : col.hasWrittenExam !== false);
      const maxAssess =
        ovr.maxAssessmentsGrade !== undefined
          ? Number(ovr.maxAssessmentsGrade)
          : col.maxAssessmentsGrade !== undefined
          ? Number(col.maxAssessmentsGrade)
          : col.maxGrade !== undefined
          ? Number(col.maxGrade)
          : hasWritten
          ? defaultMaxAssess
          : 100;
      const maxWritten = hasWritten
        ? ovr.maxWrittenGrade !== undefined
          ? Number(ovr.maxWrittenGrade)
          : col.maxWrittenGrade !== undefined
          ? Number(col.maxWrittenGrade)
          : defaultMaxWritten
        : 0;
      const isRel =
        col.key === 'religion' ||
        Boolean((ovr.label || col.label) && String(ovr.label || col.label).includes('دين'));
      const r = computeSubjectRatios(profile, sIdx, cIdx + 4, isRel, hasWritten);

      if (aFirst[col.key] === undefined || aFirst[col.key] === null || String(aFirst[col.key]).trim() === '') {
        aFirst[col.key] = clampGrade(r.a1 * maxAssess, maxAssess);
        studentChanged = true;
      }
      if (aSecond[col.key] === undefined || aSecond[col.key] === null || String(aSecond[col.key]).trim() === '') {
        aSecond[col.key] = clampGrade(r.a2 * maxAssess, maxAssess);
        studentChanged = true;
      }
      if (hasWritten) {
        if (wFirst[col.key] === undefined || wFirst[col.key] === null || String(wFirst[col.key]).trim() === '') {
          wFirst[col.key] = clampGrade(r.w1 * maxWritten, maxWritten);
          studentChanged = true;
        }
        if (wSecond[col.key] === undefined || wSecond[col.key] === null || String(wSecond[col.key]).trim() === '') {
          wSecond[col.key] = clampGrade(r.w2 * maxWritten, maxWritten);
          studentChanged = true;
        }
      }
    });

    if (!studentChanged) return student;
    changed = true;
    return {
      ...student,
      assessments: {
        ...(student.assessments || {}),
        first: aFirst,
        second: aSecond,
        'الفصل الدراسي الأول': { ...aFirst },
        'الفصل الدراسي الثاني': { ...aSecond },
      },
      writtenExams:
        stage === 'kindergarten'
          ? student.writtenExams || {}
          : {
              ...(student.writtenExams || {}),
              first: wFirst,
              second: wSecond,
              'الفصل الدراسي الأول': { ...wFirst },
              'الفصل الدراسي الثاني': { ...wSecond },
            },
    };
  });

  return { updated, changed };
}
