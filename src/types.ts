export type AffiliatedEntity = 'moe' | 'azhar' | '';
export type EducationalStage = 'kindergarten' | 'primary' | 'middle' | 'secondary' | 'commercial_technical' | 'industrial_technical' | 'agricultural_technical' | 'hotel_technical' | '';
export type EducationType = 'official' | 'official_languages' | 'official_distinguished' | 'private' | 'other_schools' | '';

export interface SchoolData {
  affiliatedEntity?: AffiliatedEntity;
  affiliatedEntityEn?: string;
  administration: string;
  administrationEn?: string;
  schoolName: string;
  schoolNameEn?: string;
  schoolLogo?: string;
  educationType: EducationType;
  educationTypeEn?: string;
  stage: EducationalStage;
  stageEn?: string;
  semester?: string;
  division?: string;
  systemType?: 'regular' | 'homeschool' | 'services';
  secondarySystem?: 'old' | 'modern';
}

export interface ControlData {
  dataOfficer: string;
  dataOfficerEn?: string;
  controlHead: string;
  controlHeadEn?: string;
  committeeHead: string;
  committeeHeadEn?: string;
  selectedGrade: string;
}

export interface AssessmentGrades {
  [key: string]: any;
  arabic?: string;
  english?: string;
  math?: string;
  science?: string;
  social_studies?: string;
  religion?: string;
  art?: string;
  ict?: string;
  pe?: string;
  fields?: string;
  music?: string;
  multidisciplinary?: string;
  physicalEducation?: string;
  tokatsu?: string;
  values?: string;
  other1?: string;
  other2?: string;
  other3?: string;
}

export interface DetailedAssessmentItem {
  classNotebook?: string;
  homework?: string;
  weeklyAssessment?: string;
  behavior?: string;
  firstMonthlyExam?: string;
  secondMonthlyExam?: string;
  practicalPerformance?: string; // الأداء العملى والمهارى (60)
  classActivities?: string;      // الأنشطة الصفية (20)
  researchProject?: string;      // المشروع البحثي (15) - الصف الثاني بكالوريا النظام الحديث
  // مادة التربية الرياضية - دائماً (ما عدا رياض الأطفال)
  physicalSkillDomain?: string;       // المجال البدنى والمهارى (50)
  cognitiveDomain?: string;           // المجال المعرفى (20)
  affectiveBehavioralDomain?: string; // المجال الوجدانى والسلوكى (20)
  sportsUniformAttendance?: string;   // الزى الرياضى والمواظبة (10)
  total?: string;
}

export interface StudentData {
  id: string;
  name: string;
  nameEn?: string;
  nationalId: string;
  gender: string;
  enrollmentStatus: string;
  enrollmentType?: string;
  studentStatus?: string;
  religion: string;
  seatNumber?: string;
  secretNumber?: string;
  committeeNumber?: string;
  seatNumbers?: Record<string, string>;
  secretNumbers?: Record<string, string>;
  committeeNumbers?: Record<string, string>;
  assessments?: Record<string, AssessmentGrades>;
  writtenExams?: Record<string, AssessmentGrades>;
  detailedAssessments?: Record<string, Record<string, DetailedAssessmentItem>>;
}

export type Language = 'ar';
