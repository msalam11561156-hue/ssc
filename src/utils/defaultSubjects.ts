import { getSubjectsConfigForStageGrade } from './exportPdf';

export interface SubjectColConfig {
  key: string;
  label: string;
  labelEn?: string;
  isAddedToTotal?: boolean;
  maxGrade?: number;
  actualMaxGrade?: number;
  maxAssessmentsGrade?: number;
  maxWrittenGrade?: number;
  hasWrittenExam?: boolean;
  minPassPercentage?: number;
  minTotalPassPercentage?: number;
  learningOutcomesType?: 'pass_fail' | 'grades';
}

export function getDefaultSubjectCols(params: {
  stage?: string;
  selectedGrade?: string;
  systemType?: string;
  title?: string;
}): SubjectColConfig[] {
  const { stage = '', selectedGrade = '', systemType, title } = params;

  const isHomeschoolInit =
    systemType === 'homeschool' ||
    Boolean(title && (title.includes('منازل') || title.toLowerCase().includes('homeschool')));
  const isMiddleOrSecStage = stage === 'middle' || stage === 'prep' || stage === 'secondary';
  const isMiddleHomeschoolInit =
    (isMiddleOrSecStage ||
      Boolean(
        title &&
          (title.includes('المرحلة الإعدادية') ||
            title.includes('المرحلة الثانوية') ||
            title.includes('ثانوي'))
      )) &&
    isHomeschoolInit;

  const isKindergarten = stage === 'kindergarten';
  const isPrimary1To3 =
    stage === 'primary' &&
    (['الصف الأول', 'الصف الثاني', 'الصف الثالث', '1st Grade', '2nd Grade', '3rd Grade'].includes(
      selectedGrade
    ) ||
      selectedGrade.includes('الأول') ||
      selectedGrade.includes('الاول') ||
      selectedGrade.includes('الثاني') ||
      selectedGrade.includes('الثالث'));
  const isPrimary4To6 =
    stage === 'primary' &&
    (['الصف الرابع', 'الصف الخامس', 'الصف السادس', '4th Grade', '5th Grade', '6th Grade'].includes(
      selectedGrade
    ) ||
      selectedGrade.includes('الرابع') ||
      selectedGrade.includes('الخامس') ||
      selectedGrade.includes('السادس'));
  const isMiddle = stage === 'prep' || stage === 'middle';
  const isSecondary1 =
    stage === 'secondary' &&
    ([
      'الصف الأول',
      'الصف الاول',
      'الصف الأول الثانوي',
      'الصف الاول الثانوى',
      '1st Grade',
    ].includes(selectedGrade) ||
      selectedGrade.includes('الأول') ||
      selectedGrade.includes('الاول'));
  const isSecondary2Scientific =
    stage === 'secondary' &&
    (selectedGrade === 'الصف الثاني_scientific' ||
      (selectedGrade.includes('الثاني') && selectedGrade.includes('scientific')) ||
      (selectedGrade.includes('الثانى') && selectedGrade.includes('scientific')));
  const isSecondary2Literary =
    stage === 'secondary' &&
    (selectedGrade === 'الصف الثاني_literary' ||
      (selectedGrade.includes('الثاني') && selectedGrade.includes('literary')) ||
      (selectedGrade.includes('الثانى') && selectedGrade.includes('literary')) ||
      (selectedGrade.toLowerCase().includes('2nd') && selectedGrade.includes('literary')));

  const isMax40 = stage === 'primary';
  let defaultSubjects: SubjectColConfig[] = [];

  if (isKindergarten) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
      { key: 'multidisciplinary', label: 'متعدد التخصصات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
      { key: 'pe', label: 'التربية البدنية والصحية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
    ];
  } else if (stage === 'primary' && isPrimary1To3) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'pass_fail' },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' },
      { key: 'tokkatsu', label: 'أنشطة التوكاتسو', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' },
    ];
  } else if (stage === 'primary' && isPrimary4To6) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
      { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
      { key: 'social_studies', label: 'الدراسات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'pass_fail' },
      { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' },
      { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' },
      { key: 'fields', label: 'المجالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' },
      { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' },
    ];
  } else if (stage === 'primary') {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية' },
      { key: 'english', label: 'اللغة الإنجليزية' },
      { key: 'math', label: 'الرياضيات' },
      { key: 'science', label: 'العلوم' },
      { key: 'social_studies', label: 'الدراسات' },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false },
      { key: 'art', label: 'التربية الفنية', isAddedToTotal: false },
      { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false },
      { key: 'fields', label: 'المجالات', isAddedToTotal: false },
      { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false },
    ];
  } else if (isMiddle) {
    defaultSubjects = isMiddleHomeschoolInit
      ? [
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 0, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 0, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 0, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 0, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'social_studies', label: 'الدراسات الاجتماعية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 0, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 0, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 0, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 0, maxWrittenGrade: 100, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'activity1', label: 'النشاط الأول', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'activity2', label: 'النشاط الثانى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'grades' },
        ]
      : [
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'social_studies', label: 'الدراسات الاجتماعية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' },
          { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'activity1', label: 'النشاط الأول', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'activity2', label: 'النشاط الثانى', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'grades' },
        ];
  } else if (stage === 'secondary' && isSecondary1) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'integrated_sciences', label: 'العلوم المتكاملة', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'philosophy_logic', label: 'الفلسفة والمنطق', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'programming_ai', label: 'البرمجة والذكاء الإصطناعى', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70, learningOutcomesType: 'grades' },
      { key: 'activity', label: 'النشاط', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
    ];
  } else if (stage === 'secondary' && isSecondary2Scientific) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'chemistry', label: 'الكيمياء', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'physics', label: 'الفيزياء', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70, learningOutcomesType: 'grades' },
      { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'national_education', label: 'التربية الوطنية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'educational_vocational_activity', label: 'النشاط التربوى والمهنى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
    ];
  } else if (stage === 'secondary' && isSecondary2Literary) {
    defaultSubjects = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'geography', label: 'الجغرافيا', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'psychology', label: 'علم النفس', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70, learningOutcomesType: 'grades' },
      { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'national_education', label: 'التربية الوطنية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
      { key: 'educational_vocational_activity', label: 'النشاط التربوى والمهنى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
    ];
  } else if (stage === 'secondary') {
    const cfg = getSubjectsConfigForStageGrade(stage, selectedGrade, isHomeschoolInit);
    defaultSubjects = cfg.customCols || [];
  }

  if (stage === 'secondary' && isMiddleHomeschoolInit) {
    defaultSubjects = defaultSubjects.map((sub) => ({
      ...sub,
      maxAssessmentsGrade: 0,
      maxWrittenGrade: sub.hasWrittenExam !== false ? 100 : 0,
      hasWrittenExam: sub.hasWrittenExam !== false,
    }));
  }

  return defaultSubjects.map((sub) => {
    if (isKindergarten) {
      return {
        ...sub,
        isAddedToTotal: true,
        maxGrade: 100,
        maxAssessmentsGrade: 100,
        hasWrittenExam: false,
        minPassPercentage: sub.minPassPercentage !== undefined ? sub.minPassPercentage : 50,
      };
    }
    if (
      isPrimary1To3 ||
      isPrimary4To6 ||
      isMiddle ||
      isSecondary1 ||
      isSecondary2Scientific ||
      isSecondary2Literary
    ) {
      return {
        ...sub,
        minTotalPassPercentage:
          sub.minTotalPassPercentage !== undefined
            ? sub.minTotalPassPercentage
            : sub.key === 'religion' || (sub.label && sub.label.includes('دين'))
            ? 70
            : 50,
      };
    }
    if (stage === 'secondary') {
      return {
        ...sub,
        minTotalPassPercentage:
          sub.minTotalPassPercentage !== undefined
            ? sub.minTotalPassPercentage
            : sub.key === 'religion' || (sub.label && sub.label.includes('دين'))
            ? 70
            : 50,
      };
    }
    if (sub.key === 'arabic' || sub.key === 'english') {
      return {
        ...sub,
        maxAssessmentsGrade: 40,
        hasWrittenExam: true,
        maxWrittenGrade: 60,
        minPassPercentage: 30,
        minTotalPassPercentage: 50,
      };
    }
    return {
      ...sub,
      maxAssessmentsGrade: isMax40 ? 40 : 100,
      hasWrittenExam: true,
      maxWrittenGrade: isMax40 ? 60 : 100,
      minPassPercentage: 30,
      minTotalPassPercentage:
        sub.key === 'religion' || (sub.label && sub.label.includes('دين')) ? 70 : 50,
    };
  });
}
