import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Search, CheckCircle2, Check, Plus, X, Trash2, RotateCcw, Info, Printer, Edit, Menu, PenTool, Sliders, Calendar, PieChart, Palette, Languages, BarChart3, Award } from 'lucide-react';
import { Language, StudentData, AssessmentGrades } from '../types';
import { translations } from '../i18n';
import { GradingSettingsModal } from './GradingSettingsModal';
import { AdvancedStatsModal } from './AdvancedStatsModal';
import { getGradingSettings, GradingSettings, getPrimaryStudentMercyBoosts, roundToOneDecimal } from '../utils/gradingSettings';
import { ActionMenuButton } from './ActionMenuButton';
import { ensureCellVisible } from '../utils/cellNavigation';
import { TooltipMarqueeText } from './TooltipMarqueeText';
import { ActualGradeTooltip } from './ActualGradeTooltip';
import { exportStudentsDataToPdf, PdfReportType, RowBgTheme, CustomControlSheetOptions, getSubjectsConfigForStageGrade } from '../utils/exportPdf';
import { RowThemeSelector, getTableRowColorStyle } from './RowThemeSelector';
import { SeatNumbersModal } from './SeatNumbersModal';
import { CustomControlSheetModal } from './CustomControlSheetModal';
import { populateMissingSubjectGradesForStudents } from '../utils/defaultStudentsData';
import { getStoredSubjectEn, saveStoredSubjectEn, capitalizeEachWord } from '../utils/subjectLanguage';
import { distributeTotalToDetailedAssessment, isSubjectWithoutWrittenExam } from '../utils/detailedAssessmentsHelper';
import { sortStudents } from '../utils/studentSorting';
import { SortButtonMenu } from './SortButtonMenu';
import { KG_LEARNING_DOMAINS } from '../utils/kgAssessmentsReportHelper';
import { TopTenCertificatesModal } from './TopTenCertificatesModal';
import { AllStudentsCertificatesModal } from './AllStudentsCertificatesModal';
import { CertificatesSelectionModal } from './CertificatesSelectionModal';
import { PasswordModal } from './PasswordModal';
import { isPaidUnlocked, getDeviceId } from '../utils/activationManager';

interface AssessmentsGradesScreenProps {
  data: StudentData[];
  onChange: (data: StudentData[]) => void;
  lang: Language;
  onBack: () => void;
  onEditData: (targetSemester?: string) => void;
  onEditWrittenExams?: (targetSemester?: string) => void;
  onSwitchSemester?: (newSemester: string) => void;
  onNavigateToSection?: (targetStep: number, targetSemester: string) => void;
  semester: string;
  title: string;
  stage: string;
  selectedGrade: string;
  sortBy?: { id: string; direction: 'asc' | 'desc' }[];
  onSortChange?: (newSort: { id: string; direction: 'asc' | 'desc' }[]) => void;
  onNavigateToDetailedAssessments?: (targetSubject?: string) => void;
  lastDetailedSubjectKey?: string;
  isTrialMode?: boolean;
}

const PortalModal = ({ children }: { children: React.ReactNode }) => {
  return typeof document !== 'undefined' ? createPortal(children, document.body) : <>{children}</>;
};

export const AssessmentsGradesScreen: React.FC<AssessmentsGradesScreenProps> = ({
  data,
  onChange,
  lang,
  onBack,
  onEditData,
  onEditWrittenExams,
  onSwitchSemester,
  onNavigateToSection,
  semester,
  title,
  stage,
  selectedGrade,
  sortBy: externalSortBy,
  onSortChange,
  onNavigateToDetailedAssessments,
  lastDetailedSubjectKey,
  isTrialMode = false,
}) => {
  const t = translations[lang];
  const sortBy = externalSortBy || [];
  const [localData, setLocalData] = useState<StudentData[]>(data);
  const lastActiveSubjectKey = React.useRef<string | null>(
    lastDetailedSubjectKey || (() => {
      try {
        return localStorage.getItem(`detailed_assessments_last_subject_${stage}_${selectedGrade}`) ||
               localStorage.getItem('detailed_assessments_last_subject') ||
               null;
      } catch {
        return null;
      }
    })()
  );

  useEffect(() => {
    if (lastDetailedSubjectKey) {
      lastActiveSubjectKey.current = lastDetailedSubjectKey;
    }
  }, [lastDetailedSubjectKey]);

  const handleNavigateToDetailed = () => {
    let target = lastActiveSubjectKey.current || lastDetailedSubjectKey || (() => {
      try {
        return localStorage.getItem(`detailed_assessments_last_subject_${stage}_${selectedGrade}`) ||
               localStorage.getItem('detailed_assessments_last_subject') ||
               undefined;
      } catch {
        return undefined;
      }
    })();

    if (target && stage !== 'kindergarten') {
      const cfg = getSubjectsConfigForStageGrade(stage, selectedGrade);
      if (isSubjectWithoutWrittenExam({ key: target }, cfg.customCols)) {
        target = undefined;
      }
    }

    onNavigateToDetailedAssessments?.(target);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditingData, setIsEditingData] = useState(false);
  const frozenIdsRef = React.useRef<string[]>([]);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [showSeatNumbersPasswordModal, setShowSeatNumbersPasswordModal] = useState(false);
  const [isAdvancedStatsModalOpen, setIsAdvancedStatsModalOpen] = useState(false);
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const [isAllStudentsCertModalOpen, setIsAllStudentsCertModalOpen] = useState(false);
  const [isCertSelectionModalOpen, setIsCertSelectionModalOpen] = useState(false);
  const [isSubjectPrintMenuOpen, setIsSubjectPrintMenuOpen] = useState(false);
  const [selectedPrintSubject, setSelectedPrintSubject] = useState<{ key: string; label: string } | null>(null);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const downloadToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [editingRowTheme, setEditingRowTheme] = useState<RowBgTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = (localStorage.getItem('assessments_grades_row_theme') || localStorage.getItem('editing_table_row_theme')) as RowBgTheme | null;
      if (saved) return saved;
    }
    return 'attachment_1';
  });

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.storageKey === 'assessments_grades_row_theme' && e.detail?.theme) {
        setEditingRowTheme(e.detail.theme);
      }
    };
    window.addEventListener('row_theme_updated', handler);
    return () => window.removeEventListener('row_theme_updated', handler);
  }, []);
  const [isGradingSettingsModalOpen, setIsGradingSettingsModalOpen] = useState(false);
  const [gradingSettings, setGradingSettings] = useState<GradingSettings>(() => getGradingSettings(stage, selectedGrade));
  const [hoveredNotesTooltip, setHoveredNotesTooltip] = useState<{
    text: string;
    subjectsTitle: string;
    headerTitle?: string;
    lines?: string[];
    x: number;
    y: number;
    width: number;
    height: number;
    studentName?: string;
    seatNumber?: string;
    secretNumber?: string;
  } | null>(null);
  const [hoveredActualGradeTooltip, setHoveredActualGradeTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const closeNotesTooltipTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const sanitizeNotesText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/[:،,()[\]{}«»"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const formatPunctuationSpacing = (text: string) => {
    if (!text) return '';
    return text
      .replace(/،/g, '-')
      .replace(/([():%\-])/g, ' $1 ')
      .replace(/[ \t]+/g, ' ');
  };

  useEffect(() => {
    setGradingSettings(getGradingSettings(stage, selectedGrade));
    const handleSettingsUpdate = () => {
      setGradingSettings(getGradingSettings(stage, selectedGrade));
    };
    window.addEventListener('grading-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('grading-settings-updated', handleSettingsUpdate);
  }, [stage, selectedGrade]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && hoveredNotesTooltip) {
        setHoveredNotesTooltip(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredNotesTooltip]);

  
  const [customCols, setCustomCols] = useState<{key: string, label: string, labelEn?: string, isAddedToTotal?: boolean, maxGrade?: number, actualMaxGrade?: number, maxAssessmentsGrade?: number, maxWrittenGrade?: number, hasWrittenExam?: boolean, minPassPercentage?: number, minTotalPassPercentage?: number, learningOutcomesType?: 'pass_fail' | 'grades'}[]>(() => {
    const saved = localStorage.getItem(`${stage}_${selectedGrade}_assessments_custom_cols`);
    
    const isPrimary1 = stage === 'primary' && (
      ['الصف الأول', 'الصف الاول', '1st Grade'].includes(selectedGrade) ||
      selectedGrade?.includes('الأول') ||
      selectedGrade?.includes('الاول')
    );
    const isPrimary1To3 = stage === 'primary' && (
      ['الصف الأول', 'الصف الثاني', 'الصف الثالث', '1st Grade', '2nd Grade', '3rd Grade'].includes(selectedGrade) ||
      selectedGrade?.includes('الأول') ||
      selectedGrade?.includes('الاول') ||
      selectedGrade?.includes('الثاني') ||
      selectedGrade?.includes('الثالث')
    );
    const isPrimary4To6 = stage === 'primary' && (
      ['الصف الرابع', 'الصف الخامس', 'الصف السادس', '4th Grade', '5th Grade', '6th Grade'].includes(selectedGrade) ||
      selectedGrade?.includes('الرابع') ||
      selectedGrade?.includes('الخامس') ||
      selectedGrade?.includes('السادس')
    );
    const isKindergarten = stage === 'kindergarten';
    const isMiddle = stage === 'prep' || stage === 'middle';
    const isSecondary1 = stage === 'secondary' && (
      ['الصف الأول', 'الصف الاول', 'الصف الأول الثانوي', 'الصف الاول الثانوى', '1st Grade'].includes(selectedGrade) ||
      selectedGrade?.includes('الأول') ||
      selectedGrade?.includes('الاول')
    );
    const isSecondary2Scientific = stage === 'secondary' && (
      selectedGrade === 'الصف الثاني_scientific' ||
      (selectedGrade?.includes('الثاني') && selectedGrade?.includes('scientific')) ||
      (selectedGrade?.toLowerCase().includes('2nd') && selectedGrade?.includes('scientific'))
    );
    const isSecondary2Literary = stage === 'secondary' && (
      selectedGrade === 'الصف الثاني_literary' ||
      (selectedGrade?.includes('الثاني') && selectedGrade?.includes('literary')) ||
      (selectedGrade?.includes('الثانى') && selectedGrade?.includes('literary')) ||
      (selectedGrade?.toLowerCase().includes('2nd') && selectedGrade?.includes('literary'))
    );
    const isMax40 = stage === 'primary';
    
    let defaultSubjects = [];
    if (stage === 'kindergarten') {
      defaultSubjects = [
        { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
        { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
        { key: 'multidisciplinary', label: 'متعدد التخصصات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
        { key: 'pe', label: 'التربية البدنية والصحية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 }
      ];
    } else if (stage === 'primary' && isPrimary1To3) {
      defaultSubjects = [
        { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'pass_fail' as const },
        { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const },
        { key: 'tokkatsu', label: 'أنشطة التوكاتسو', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const }
      ];
    } else if (stage === 'primary' && isPrimary4To6) {
      defaultSubjects = [
        { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'social_studies', label: 'الدراسات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'pass_fail' as const },
        { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const },
        { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const },
        { key: 'fields', label: 'المجالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const },
        { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const }
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
        { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false }
      ];
    } else if (stage === 'prep' || stage === 'middle') {
      defaultSubjects = [
        { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'social_studies', label: 'الدراسات الاجتماعية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
        { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'activity1', label: 'النشاط الأول', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'activity2', label: 'النشاط الثانى', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'grades' as const }
      ];
    } else if (stage === 'secondary' && isSecondary1) {
      defaultSubjects = [
        { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'integrated_sciences', label: 'العلوم المتكاملة', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'philosophy_logic', label: 'الفلسفة والمنطق', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'programming_ai', label: 'البرمجة والذكاء الإصطناعى', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70, learningOutcomesType: 'grades' as const },
        { key: 'activity', label: 'النشاط', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const }
      ];
    } else if (stage === 'secondary' && isSecondary2Scientific) {
      defaultSubjects = [
        { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'chemistry', label: 'الكيمياء', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'physics', label: 'الفيزياء', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70, learningOutcomesType: 'grades' as const },
        { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'national_education', label: 'التربية الوطنية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'educational_vocational_activity', label: 'النشاط التربوى والمهنى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const }
      ];
    } else if (stage === 'secondary' && isSecondary2Literary) {
      defaultSubjects = [
        { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'geography', label: 'الجغرافيا', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'psychology', label: 'علم النفس', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70, learningOutcomesType: 'grades' as const },
        { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'national_education', label: 'التربية الوطنية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
        { key: 'educational_vocational_activity', label: 'النشاط التربوى والمهنى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const }
      ];
    } else if (stage === 'secondary') {
      const cfg = getSubjectsConfigForStageGrade(stage, selectedGrade);
      defaultSubjects = cfg.customCols || [];
    }

    const mappedDefaults = defaultSubjects.map(sub => {
      if (isKindergarten) {
        return {
          ...sub,
          isAddedToTotal: true,
          maxGrade: 100,
          maxAssessmentsGrade: 100,
          hasWrittenExam: false,
          minPassPercentage: sub.minPassPercentage !== undefined ? sub.minPassPercentage : 50
        };
      }
      if (isPrimary1To3 || isPrimary4To6 || isMiddle || isSecondary1 || isSecondary2Scientific || isSecondary2Literary) {
        return {
          ...sub,
          minTotalPassPercentage: (sub as any).minTotalPassPercentage !== undefined ? (sub as any).minTotalPassPercentage : ((sub.key === 'religion' || (sub.label && sub.label.includes('دين'))) ? 70 : 50)
        };
      }
      if (sub.key === 'arabic' || sub.key === 'english') {
        return {
          ...sub,
          maxAssessmentsGrade: 40,
          hasWrittenExam: true,
          maxWrittenGrade: 60,
          minPassPercentage: 30,
          minTotalPassPercentage: 50
        };
      }
      return {
        ...sub,
        maxAssessmentsGrade: isMax40 ? 40 : 100,
        hasWrittenExam: true,
        maxWrittenGrade: isMax40 ? 60 : 100,
        minPassPercentage: 30,
        minTotalPassPercentage: (sub.key === 'religion' || (sub.label && sub.label.includes('دين'))) ? 70 : 50
      };
    });

    if (stage === 'secondary' && localStorage.getItem(`secondary_cols_cleared_v1_${selectedGrade}`) !== 'true') {
      localStorage.removeItem(`${stage}_${selectedGrade}_assessments_custom_cols`);
      localStorage.removeItem(`${stage}_${selectedGrade}_assessments_default_overrides`);
      localStorage.setItem(`secondary_cols_cleared_v1_${selectedGrade}`, 'true');
      return mappedDefaults;
    }

    if (saved) {
      let parsed = JSON.parse(saved);
      if (stage === 'secondary') {
        if (isSecondary1) {
          const defaultSec1 = [
            { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'integrated_sciences', label: 'العلوم المتكاملة', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'philosophy_logic', label: 'الفلسفة والمنطق', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'programming_ai', label: 'البرمجة والذكاء الإصطناعى', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70, learningOutcomesType: 'grades' as const },
            { key: 'activity', label: 'النشاط', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const }
          ];
          defaultSec1.forEach(def => {
            const idx = parsed.findIndex((c: any) => c.key === def.key);
            if (idx === -1) {
              parsed.push(def);
            } else {
              parsed[idx] = {
                ...def,
                ...parsed[idx],
                label: def.label,
                isAddedToTotal: def.isAddedToTotal,
                maxGrade: def.maxGrade,
                maxAssessmentsGrade: def.maxAssessmentsGrade,
                maxWrittenGrade: def.maxWrittenGrade,
                hasWrittenExam: def.hasWrittenExam,
                minPassPercentage: (parsed[idx].minPassPercentage === undefined || parsed[idx].minPassPercentage === 30 || parsed[idx].minPassPercentage === 10 || parsed[idx].minPassPercentage === 70 || parsed[idx].minPassPercentage === 7.2) ? def.minPassPercentage : parsed[idx].minPassPercentage,
                minTotalPassPercentage: parsed[idx].minTotalPassPercentage !== undefined ? parsed[idx].minTotalPassPercentage : def.minTotalPassPercentage,
                learningOutcomesType: parsed[idx].learningOutcomesType || def.learningOutcomesType
              };
            }
          });
        } else if (isSecondary2Scientific || isSecondary2Literary) {
          const defaultSec2 = [
            { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            ...(isSecondary2Literary
              ? [
                  { key: 'geography', label: 'الجغرافيا', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
                  { key: 'psychology', label: 'علم النفس', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
                ]
              : [
                  { key: 'chemistry', label: 'الكيمياء', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
                  { key: 'physics', label: 'الفيزياء', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
                ]),
            { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70, learningOutcomesType: 'grades' as const },
            { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'national_education', label: 'التربية الوطنية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
            { key: 'educational_vocational_activity', label: 'النشاط التربوى والمهنى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const }
          ];
          defaultSec2.forEach(def => {
            const idx = parsed.findIndex((c: any) => c.key === def.key);
            if (idx === -1) {
              parsed.push(def);
            } else {
              parsed[idx] = {
                ...def,
                ...parsed[idx],
                label: def.label,
                isAddedToTotal: def.isAddedToTotal,
                maxGrade: def.maxGrade,
                actualMaxGrade: def.actualMaxGrade,
                maxAssessmentsGrade: def.maxAssessmentsGrade,
                maxWrittenGrade: def.maxWrittenGrade,
                hasWrittenExam: def.hasWrittenExam,
                minPassPercentage: (parsed[idx].minPassPercentage === undefined || parsed[idx].minPassPercentage === 30 || parsed[idx].minPassPercentage === 10 || parsed[idx].minPassPercentage === 70 || parsed[idx].minPassPercentage === 7.2) ? def.minPassPercentage : parsed[idx].minPassPercentage,
                minTotalPassPercentage: parsed[idx].minTotalPassPercentage !== undefined ? parsed[idx].minTotalPassPercentage : def.minTotalPassPercentage,
                learningOutcomesType: parsed[idx].learningOutcomesType || def.learningOutcomesType
              };
            }
          });
        }
        return parsed;
      }
      if (isKindergarten) {
        parsed = parsed.filter((c: any) => c.key !== 'discover' && c.key !== 'math' && c.key !== 'religion' && c.label?.trim() !== 'الرياضيات' && !c.label?.includes('رياضيات') && !c.label?.includes('ديني') && !c.label?.includes('دين'));
        const defaultKg = [
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
          { key: 'multidisciplinary', label: 'متعدد التخصصات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
          { key: 'pe', label: 'التربية البدنية والصحية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 }
        ];
        defaultKg.forEach(def => {
          const idx = parsed.findIndex((c: any) => c.key === def.key);
          if (idx === -1) {
            parsed.push(def);
          } else {
            parsed[idx] = {
              ...def,
              ...parsed[idx],
              label: def.label,
              isAddedToTotal: true,
              maxGrade: 100,
              maxAssessmentsGrade: 100,
              hasWrittenExam: false,
              minPassPercentage: parsed[idx].minPassPercentage !== undefined ? parsed[idx].minPassPercentage : 50
            };
          }
        });
        parsed = parsed.map((c: any) => ({
          ...c,
          isAddedToTotal: true,
          maxGrade: 100,
          maxAssessmentsGrade: 100,
          hasWrittenExam: false,
          minPassPercentage: c.minPassPercentage !== undefined ? c.minPassPercentage : 50
        }));
        return parsed;
      }

      if (isPrimary1To3) {
        parsed = parsed.filter((c: any) => c.key !== 'discover' && c.key !== 'values');
        const defaultP13 = [
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'pass_fail' as const },
          { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const },
          { key: 'tokkatsu', label: 'أنشطة التوكاتسو', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const }
        ];
        defaultP13.forEach(def => {
          const idx = parsed.findIndex((c: any) => c.key === def.key);
          if (idx === -1) {
            parsed.push(def);
          } else {
            parsed[idx] = {
              ...def,
              ...parsed[idx],
              label: def.label,
              isAddedToTotal: def.isAddedToTotal,
              maxGrade: def.maxGrade,
              maxAssessmentsGrade: def.maxAssessmentsGrade,
              maxWrittenGrade: def.maxWrittenGrade,
              hasWrittenExam: def.hasWrittenExam,
              minPassPercentage: ((def.key === 'religion' || (def.label && def.label.includes('دين'))) && def.hasWrittenExam && parsed[idx].minPassPercentage === 70) ? 30 : (parsed[idx].minPassPercentage !== undefined ? parsed[idx].minPassPercentage : def.minPassPercentage),
              minTotalPassPercentage: parsed[idx].minTotalPassPercentage !== undefined ? parsed[idx].minTotalPassPercentage : ((def.key === 'religion' || (def.label && def.label.includes('دين'))) ? 70 : 50),
              learningOutcomesType: parsed[idx].learningOutcomesType || def.learningOutcomesType
            };
          }
        });
        return parsed.map((c: any) => ({
          ...c,
          minTotalPassPercentage: c.minTotalPassPercentage !== undefined ? c.minTotalPassPercentage : ((c.key === 'religion' || (c.label && c.label.includes('دين'))) ? 70 : 50)
        }));
      }

      if (isPrimary4To6) {
        parsed = parsed.filter((c: any) => c.key !== 'discover' && c.key !== 'values' && c.key !== 'skills');
        const defaultP46 = [
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'social_studies', label: 'الدراسات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'pass_fail' as const },
          { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const },
          { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const },
          { key: 'fields', label: 'المجالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const },
          { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const }
        ];
        defaultP46.forEach(def => {
          const idx = parsed.findIndex((c: any) => c.key === def.key);
          if (idx === -1) {
            parsed.push(def);
          } else {
            parsed[idx] = {
              ...def,
              ...parsed[idx],
              label: def.label,
              isAddedToTotal: def.isAddedToTotal,
              maxGrade: def.maxGrade,
              maxAssessmentsGrade: def.maxAssessmentsGrade,
              maxWrittenGrade: def.maxWrittenGrade,
              hasWrittenExam: def.hasWrittenExam,
              minPassPercentage: ((def.key === 'religion' || (def.label && def.label.includes('دين'))) && def.hasWrittenExam && parsed[idx].minPassPercentage === 70) ? 30 : (parsed[idx].minPassPercentage !== undefined ? parsed[idx].minPassPercentage : def.minPassPercentage),
              minTotalPassPercentage: parsed[idx].minTotalPassPercentage !== undefined ? parsed[idx].minTotalPassPercentage : ((def.key === 'religion' || (def.label && def.label.includes('دين'))) ? 70 : 50),
              learningOutcomesType: parsed[idx].learningOutcomesType || def.learningOutcomesType
            };
          }
        });
        return parsed.map((c: any) => ({
          ...c,
          minTotalPassPercentage: c.minTotalPassPercentage !== undefined ? c.minTotalPassPercentage : ((c.key === 'religion' || (c.label && c.label.includes('دين'))) ? 70 : 50)
        }));
      }

      if (isMiddle) {
        const unconfiguredMiddleKeys = ['computer'];
        parsed = parsed.filter((c: any) => !unconfiguredMiddleKeys.includes(c.key));
        const defaultMiddle = [
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'social_studies', label: 'الدراسات الاجتماعية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
          { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
          { key: 'activity1', label: 'النشاط الأول', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'grades' as const },
          { key: 'activity2', label: 'النشاط الثانى', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'grades' as const }
        ];
        defaultMiddle.forEach(def => {
          const idx = parsed.findIndex((c: any) => c.key === def.key);
          if (idx === -1) {
            parsed.push(def);
          } else {
            parsed[idx] = {
              ...def,
              ...parsed[idx],
              label: def.label,
              isAddedToTotal: def.isAddedToTotal,
              maxGrade: def.maxGrade,
              maxAssessmentsGrade: def.maxAssessmentsGrade,
              maxWrittenGrade: (def as any).maxWrittenGrade,
              hasWrittenExam: def.hasWrittenExam,
              minPassPercentage: (parsed[idx].minPassPercentage === undefined || parsed[idx].minPassPercentage === 10 || parsed[idx].minPassPercentage === 30 || parsed[idx].minPassPercentage === 50 || parsed[idx].minPassPercentage === 70 || parsed[idx].minPassPercentage === 7.2) ? def.minPassPercentage : parsed[idx].minPassPercentage,
              minTotalPassPercentage: parsed[idx].minTotalPassPercentage !== undefined ? parsed[idx].minTotalPassPercentage : ((def.key === 'religion' || (def.label && def.label.includes('دين'))) ? 70 : 50),
              learningOutcomesType: (def.key === 'pe' || def.key === 'music') ? 'grades' : (parsed[idx].learningOutcomesType || def.learningOutcomesType)
            };
          }
        });
        return parsed.map((c: any) => ({
          ...c,
          minPassPercentage: (c.hasWrittenExam !== false && (c.minPassPercentage === undefined || c.minPassPercentage === 10 || c.minPassPercentage === 7.2 || c.minPassPercentage === 70)) ? 30 : c.minPassPercentage,
          minTotalPassPercentage: c.minTotalPassPercentage !== undefined ? c.minTotalPassPercentage : ((c.key === 'religion' || (c.label && c.label.includes('دين'))) ? 70 : 50)
        }));
      }

      // Ensure arabic and english are included if missing (legacy support)
      if (!parsed.some((c: any) => c.key === 'arabic') && mappedDefaults.some(c => c.key === 'arabic')) {
        parsed.unshift(mappedDefaults.find(c => c.key === 'arabic'));
      } else {
        const arIndex = parsed.findIndex((c: any) => c.key === 'arabic');
        if (arIndex !== -1 && parsed[arIndex].maxWrittenGrade === undefined) {
           parsed[arIndex] = { ...parsed[arIndex], ...mappedDefaults.find(c => c.key === 'arabic') };
        }
      }
      if (!parsed.some((c: any) => c.key === 'english') && mappedDefaults.some(c => c.key === 'english')) {
        const engIndex = parsed.findIndex((c: any) => c.key === 'arabic') + 1;
        parsed.splice(engIndex, 0, mappedDefaults.find(c => c.key === 'english'));
      } else {
        const enIndex = parsed.findIndex((c: any) => c.key === 'english');
        if (enIndex !== -1 && parsed[enIndex].maxWrittenGrade === undefined) {
           parsed[enIndex] = { ...parsed[enIndex], ...mappedDefaults.find(c => c.key === 'english') };
        }
      }
      return parsed;
    }

    return mappedDefaults;
  });

  useEffect(() => {
    localStorage.setItem(`${stage}_${selectedGrade}_assessments_custom_cols`, JSON.stringify(customCols));
  }, [customCols, stage, selectedGrade]);


  const [defaultSubjectsOverrides, setDefaultSubjectsOverrides] = useState<{ [key: string]: { label?: string, labelEn?: string, maxAssessmentsGrade?: number, maxWrittenGrade?: number, minPassPercentage?: number, minTotalPassPercentage?: number, maxGrade?: number, isAddedToTotal?: boolean, hasWrittenExam?: boolean, learningOutcomesType?: 'pass_fail' | 'grades' } }>(() => {
    const saved = localStorage.getItem(`${stage}_${selectedGrade}_assessments_default_overrides`);
    const parsedOvr = saved ? JSON.parse(saved) : {};
    const isP1Init = stage === 'primary' && (
      ['الصف الأول', 'الصف الاول', '1st Grade'].includes(selectedGrade) ||
      selectedGrade?.includes('الأول') ||
      selectedGrade?.includes('الاول')
    );
    if (isP1Init && localStorage.getItem(`primary_g1_arabic_written_60_v2_${selectedGrade}`) !== 'true') {
      if (parsedOvr.arabic) {
        parsedOvr.arabic = {
          ...parsedOvr.arabic,
          maxAssessmentsGrade: 40,
          maxWrittenGrade: 60,
          maxGrade: 100
        };
        localStorage.setItem(`${stage}_${selectedGrade}_assessments_default_overrides`, JSON.stringify(parsedOvr));
      }
      localStorage.setItem(`primary_g1_arabic_written_60_v2_${selectedGrade}`, 'true');
    }
    return parsedOvr;
  });
  useEffect(() => {
    localStorage.setItem(`${stage}_${selectedGrade}_assessments_default_overrides`, JSON.stringify(defaultSubjectsOverrides));
  }, [defaultSubjectsOverrides, stage, selectedGrade]);
  useEffect(() => {
    const isP1 = stage === 'primary' && (
      ['الصف الأول', 'الصف الاول', '1st Grade'].includes(selectedGrade) ||
      selectedGrade?.includes('الأول') ||
      selectedGrade?.includes('الاول')
    );
    const isP13 = stage === 'primary' && (
      ['الصف الأول', 'الصف الثاني', 'الصف الثالث', '1st Grade', '2nd Grade', '3rd Grade'].includes(selectedGrade) ||
      selectedGrade?.includes('الأول') ||
      selectedGrade?.includes('الاول') ||
      selectedGrade?.includes('الثاني') ||
      selectedGrade?.includes('الثالث')
    );
    const isP46 = stage === 'primary' && (
      ['الصف الرابع', 'الصف الخامس', 'الصف السادس', '4th Grade', '5th Grade', '6th Grade'].includes(selectedGrade) ||
      selectedGrade?.includes('الرابع') ||
      selectedGrade?.includes('الخامس') ||
      selectedGrade?.includes('السادس')
    );
    const isMiddle = stage === 'prep' || stage === 'middle';
    const isSecondary1 = stage === 'secondary' && (
      ['الصف الأول', 'الصف الاول', 'الصف الأول الثانوي', 'الصف الاول الثانوى', '1st Grade'].includes(selectedGrade) ||
      selectedGrade?.includes('الأول') ||
      selectedGrade?.includes('الاول')
    );
    const isSecondary2Scientific = stage === 'secondary' && (
      selectedGrade === 'الصف الثاني_scientific' ||
      (selectedGrade?.includes('الثاني') && selectedGrade?.includes('scientific')) ||
      (selectedGrade?.toLowerCase().includes('2nd') && selectedGrade?.includes('scientific'))
    );
    const isSecondary2Literary = stage === 'secondary' && (
      selectedGrade === 'الصف الثاني_literary' ||
      (selectedGrade?.includes('الثاني') && selectedGrade?.includes('literary')) ||
      (selectedGrade?.includes('الثانى') && selectedGrade?.includes('literary')) ||
      (selectedGrade?.toLowerCase().includes('2nd') && selectedGrade?.includes('literary'))
    );
    const defaultSecondary1 = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'integrated_sciences', label: 'العلوم المتكاملة', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'philosophy_logic', label: 'الفلسفة والمنطق', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'programming_ai', label: 'البرمجة والذكاء الإصطناعى', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70, learningOutcomesType: 'grades' as const },
      { key: 'activity', label: 'النشاط', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const }
    ];
    const defaultSecondary2Scientific = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'chemistry', label: 'الكيمياء', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'physics', label: 'الفيزياء', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70, learningOutcomesType: 'grades' as const },
      { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'national_education', label: 'التربية الوطنية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'educational_vocational_activity', label: 'النشاط التربوى والمهنى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const }
    ];
    const defaultSecondary2Literary = [
      { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 80, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'history', label: 'التاريخ', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'geography', label: 'الجغرافيا', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'psychology', label: 'علم النفس', isAddedToTotal: true, maxGrade: 100, actualMaxGrade: 60, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 70, learningOutcomesType: 'grades' as const },
      { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 40, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'national_education', label: 'التربية الوطنية', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 25, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 25, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
      { key: 'educational_vocational_activity', label: 'النشاط التربوى والمهنى', isAddedToTotal: false, maxGrade: 100, actualMaxGrade: 20, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const }
    ];
    if (stage === 'secondary' && localStorage.getItem(`secondary_cols_cleared_v1_${selectedGrade}`) !== 'true') {
      localStorage.removeItem(`${stage}_${selectedGrade}_assessments_custom_cols`);
      localStorage.removeItem(`${stage}_${selectedGrade}_assessments_default_overrides`);
      localStorage.setItem(`secondary_cols_cleared_v1_${selectedGrade}`, 'true');
      setCustomCols(isSecondary1 ? defaultSecondary1 : (isSecondary2Scientific ? defaultSecondary2Scientific : (isSecondary2Literary ? defaultSecondary2Literary : [])));
      setDefaultSubjectsOverrides({});
      return;
    }
    const kgClearedKey = `kg_cols_cleared_v2_${selectedGrade}`;
    if (stage === 'kindergarten' && !localStorage.getItem(kgClearedKey)) {
      localStorage.removeItem(`${stage}_${selectedGrade}_assessments_custom_cols`);
      localStorage.removeItem(`${stage}_${selectedGrade}_assessments_default_overrides`);
      localStorage.setItem(kgClearedKey, 'true');
      setCustomCols([
        { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
        { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
        { key: 'multidisciplinary', label: 'متعدد التخصصات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
        { key: 'pe', label: 'التربية البدنية والصحية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 }
      ]);
      setDefaultSubjectsOverrides({});
      return;
    }
    const savedCustomCols = localStorage.getItem(`${stage}_${selectedGrade}_assessments_custom_cols`);
    if (savedCustomCols) {
      let parsed = JSON.parse(savedCustomCols);
      if (stage === 'kindergarten') {
        parsed = parsed.filter((c: any) => c.key !== 'discover' && c.key !== 'math' && c.key !== 'religion' && c.label?.trim() !== 'الرياضيات' && !c.label?.includes('رياضيات') && !c.label?.includes('ديني') && !c.label?.includes('دين'));
        const defaultKg = [
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
          { key: 'multidisciplinary', label: 'متعدد التخصصات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
          { key: 'pe', label: 'التربية البدنية والصحية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 }
        ];
        defaultKg.forEach(def => {
          const idx = parsed.findIndex((c: any) => c.key === def.key);
          if (idx === -1) {
            parsed.push(def);
          } else {
            parsed[idx] = {
              ...def,
              ...parsed[idx],
              label: def.label,
              isAddedToTotal: true,
              maxGrade: 100,
              maxAssessmentsGrade: 100,
              hasWrittenExam: false,
              minPassPercentage: parsed[idx].minPassPercentage !== undefined ? parsed[idx].minPassPercentage : 50
            };
          }
        });
        parsed = parsed.map((c: any) => ({
          ...c,
          isAddedToTotal: true,
          maxGrade: 100,
          maxAssessmentsGrade: 100,
          hasWrittenExam: false,
          minPassPercentage: c.minPassPercentage !== undefined ? c.minPassPercentage : 50
        }));
      } else if (isP13) {
        parsed = parsed.filter((c: any) => c.key !== 'discover' && c.key !== 'values');
        const defaultP13 = [
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'pass_fail' as const },
          { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const },
          { key: 'tokkatsu', label: 'أنشطة التوكاتسو', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const }
        ];
        defaultP13.forEach(def => {
          const idx = parsed.findIndex((c: any) => c.key === def.key);
          if (idx === -1) {
            parsed.push(def);
          } else {
            parsed[idx] = {
              ...def,
              ...parsed[idx],
              label: def.label,
              isAddedToTotal: def.isAddedToTotal,
              maxGrade: def.maxGrade,
              maxAssessmentsGrade: def.maxAssessmentsGrade,
              maxWrittenGrade: def.maxWrittenGrade,
              hasWrittenExam: def.hasWrittenExam,
              minPassPercentage: ((def.key === 'religion' || (def.label && def.label.includes('دين'))) && def.hasWrittenExam && parsed[idx].minPassPercentage === 70) ? 30 : (parsed[idx].minPassPercentage !== undefined ? parsed[idx].minPassPercentage : def.minPassPercentage),
              learningOutcomesType: parsed[idx].learningOutcomesType || def.learningOutcomesType
            };
          }
        });
      } else if (isP46) {
        parsed = parsed.filter((c: any) => c.key !== 'discover' && c.key !== 'values' && c.key !== 'skills');
        const defaultP46 = [
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'social_studies', label: 'الدراسات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'pass_fail' as const },
          { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const },
          { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const },
          { key: 'fields', label: 'المجالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const },
          { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'pass_fail' as const }
        ];
        defaultP46.forEach(def => {
          const idx = parsed.findIndex((c: any) => c.key === def.key);
          if (idx === -1) {
            parsed.push(def);
          } else {
            parsed[idx] = {
              ...def,
              ...parsed[idx],
              label: def.label,
              isAddedToTotal: def.isAddedToTotal,
              maxGrade: def.maxGrade,
              maxAssessmentsGrade: def.maxAssessmentsGrade,
              maxWrittenGrade: def.maxWrittenGrade,
              hasWrittenExam: def.hasWrittenExam,
              minPassPercentage: ((def.key === 'religion' || (def.label && def.label.includes('دين'))) && def.hasWrittenExam && parsed[idx].minPassPercentage === 70) ? 30 : (parsed[idx].minPassPercentage !== undefined ? parsed[idx].minPassPercentage : def.minPassPercentage),
              learningOutcomesType: parsed[idx].learningOutcomesType || def.learningOutcomesType
            };
          }
        });
      } else if (isMiddle) {
        const unconfiguredMiddleKeys = ['computer'];
        parsed = parsed.filter((c: any) => !unconfiguredMiddleKeys.includes(c.key));
        const defaultMiddle = [
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'social_studies', label: 'الدراسات الاجتماعية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, learningOutcomesType: 'grades' as const },
          { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
          { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' as const },
          { key: 'activity1', label: 'النشاط الأول', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'grades' as const },
          { key: 'activity2', label: 'النشاط الثانى', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, learningOutcomesType: 'grades' as const }
        ];
        defaultMiddle.forEach(def => {
          const idx = parsed.findIndex((c: any) => c.key === def.key);
          if (idx === -1) {
            parsed.push(def);
          } else {
            parsed[idx] = {
              ...def,
              ...parsed[idx],
              label: def.label,
              isAddedToTotal: def.isAddedToTotal,
              maxGrade: def.maxGrade,
              maxAssessmentsGrade: def.maxAssessmentsGrade,
              maxWrittenGrade: (def as any).maxWrittenGrade,
              hasWrittenExam: def.hasWrittenExam,
              minPassPercentage: (parsed[idx].minPassPercentage === undefined || parsed[idx].minPassPercentage === 10 || parsed[idx].minPassPercentage === 30 || parsed[idx].minPassPercentage === 50 || parsed[idx].minPassPercentage === 70 || parsed[idx].minPassPercentage === 7.2) ? def.minPassPercentage : parsed[idx].minPassPercentage,
              learningOutcomesType: (def.key === 'pe' || def.key === 'music') ? 'grades' : (parsed[idx].learningOutcomesType || def.learningOutcomesType)
            };
          }
        });
      } else if (isSecondary1) {
        defaultSecondary1.forEach(def => {
          const idx = parsed.findIndex((c: any) => c.key === def.key);
          if (idx === -1) {
            parsed.push(def);
          } else {
            parsed[idx] = {
              ...def,
              ...parsed[idx],
              label: def.label,
              isAddedToTotal: def.isAddedToTotal,
              maxGrade: def.maxGrade,
              maxAssessmentsGrade: def.maxAssessmentsGrade,
              maxWrittenGrade: def.maxWrittenGrade,
              hasWrittenExam: def.hasWrittenExam,
              minPassPercentage: (parsed[idx].minPassPercentage === undefined || parsed[idx].minPassPercentage === 30 || parsed[idx].minPassPercentage === 10 || parsed[idx].minPassPercentage === 70 || parsed[idx].minPassPercentage === 7.2) ? def.minPassPercentage : parsed[idx].minPassPercentage,
              minTotalPassPercentage: parsed[idx].minTotalPassPercentage !== undefined ? parsed[idx].minTotalPassPercentage : def.minTotalPassPercentage,
              learningOutcomesType: parsed[idx].learningOutcomesType || def.learningOutcomesType
            };
          }
        });
      } else if (isSecondary2Scientific || isSecondary2Literary) {
        const targetDefaults = isSecondary2Literary ? defaultSecondary2Literary : defaultSecondary2Scientific;
        targetDefaults.forEach(def => {
          const idx = parsed.findIndex((c: any) => c.key === def.key);
          if (idx === -1) {
            parsed.push(def);
          } else {
            parsed[idx] = {
              ...def,
              ...parsed[idx],
              label: def.label,
              isAddedToTotal: def.isAddedToTotal,
              maxGrade: def.maxGrade,
              actualMaxGrade: def.actualMaxGrade,
              maxAssessmentsGrade: def.maxAssessmentsGrade,
              maxWrittenGrade: def.maxWrittenGrade,
              hasWrittenExam: def.hasWrittenExam,
              minPassPercentage: (parsed[idx].minPassPercentage === undefined || parsed[idx].minPassPercentage === 30 || parsed[idx].minPassPercentage === 10 || parsed[idx].minPassPercentage === 70 || parsed[idx].minPassPercentage === 7.2) ? def.minPassPercentage : parsed[idx].minPassPercentage,
              minTotalPassPercentage: parsed[idx].minTotalPassPercentage !== undefined ? parsed[idx].minTotalPassPercentage : def.minTotalPassPercentage,
              learningOutcomesType: parsed[idx].learningOutcomesType || def.learningOutcomesType
            };
          }
        });
      }
      setCustomCols(parsed.map((c: any) => ({
        ...c,
        minPassPercentage: (stage !== 'kindergarten' && c.hasWrittenExam !== false && (c.minPassPercentage === undefined || c.minPassPercentage === 10 || c.minPassPercentage === 7.2 || c.minPassPercentage === 70)) ? (stage === 'secondary' ? 25 : 30) : c.minPassPercentage,
        minTotalPassPercentage: c.minTotalPassPercentage !== undefined ? c.minTotalPassPercentage : ((stage !== 'kindergarten' && (c.key === 'religion' || (c.label && c.label.includes('دين')))) ? 70 : 50)
      })));
    } else {
      if (stage === 'kindergarten') {
        setCustomCols([
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
          { key: 'multidisciplinary', label: 'متعدد التخصصات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 },
          { key: 'pe', label: 'التربية البدنية والصحية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50 }
        ]);
      } else if (isP13) {
        setCustomCols([
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 70, learningOutcomesType: 'pass_fail' },
          { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'pass_fail' },
          { key: 'tokkatsu', label: 'أنشطة التوكاتسو', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'pass_fail' }
        ]);
      } else if (isP46) {
        setCustomCols([
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'social_studies', label: 'الدراسات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 70, learningOutcomesType: 'pass_fail' },
          { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'pass_fail' },
          { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 40, maxWrittenGrade: 60, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'pass_fail' },
          { key: 'fields', label: 'المجالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'pass_fail' },
          { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'pass_fail' }
        ]);
      } else if (isMiddle) {
        setCustomCols([
          { key: 'arabic', label: 'اللغة العربية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'english', label: 'اللغة الإنجليزية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'math', label: 'الرياضيات', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'science', label: 'العلوم', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'social_studies', label: 'الدراسات الاجتماعية', isAddedToTotal: true, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'religion', label: 'التربية الدينية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 70, learningOutcomesType: 'grades' },
          { key: 'art', label: 'التربية الفنية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 70, maxWrittenGrade: 30, hasWrittenExam: true, minPassPercentage: 30, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'music', label: 'التربية الموسيقية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'pe', label: 'التربية الرياضية', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'activity1', label: 'النشاط الأول', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' },
          { key: 'activity2', label: 'النشاط الثانى', isAddedToTotal: false, maxGrade: 100, maxAssessmentsGrade: 100, hasWrittenExam: false, minPassPercentage: 50, minTotalPassPercentage: 50, learningOutcomesType: 'grades' }
        ]);
      } else if (isSecondary1) {
        setCustomCols(defaultSecondary1);
      } else if (isSecondary2Scientific) {
        setCustomCols(defaultSecondary2Scientific);
      } else if (isSecondary2Literary) {
        setCustomCols(defaultSecondary2Literary);
      } else if (stage === 'secondary') {
        setCustomCols([]);
      } else {
        setCustomCols([]);
      }
    }
    const savedOverrides = localStorage.getItem(`${stage}_${selectedGrade}_assessments_default_overrides`);
    if (savedOverrides) {
      const parsedOvr = JSON.parse(savedOverrides);
      if (isP1 && localStorage.getItem(`primary_g1_arabic_written_60_v2_${selectedGrade}`) !== 'true') {
        if (parsedOvr.arabic) {
          parsedOvr.arabic = {
            ...parsedOvr.arabic,
            maxAssessmentsGrade: 40,
            maxWrittenGrade: 60,
            maxGrade: 100
          };
          localStorage.setItem(`${stage}_${selectedGrade}_assessments_default_overrides`, JSON.stringify(parsedOvr));
        }
        localStorage.setItem(`primary_g1_arabic_written_60_v2_${selectedGrade}`, 'true');
      }
      setDefaultSubjectsOverrides(parsedOvr);
    } else {
      setDefaultSubjectsOverrides({});
    }
  }, [stage, selectedGrade]);

  const isPrimary1To3 = stage === 'primary' && (
    ['الصف الأول', 'الصف الثاني', 'الصف الثالث', '1st Grade', '2nd Grade', '3rd Grade'].includes(selectedGrade) ||
    selectedGrade?.includes('الأول') ||
    selectedGrade?.includes('الاول') ||
    selectedGrade?.includes('الثاني') ||
    selectedGrade?.includes('الثالث')
  );
  const isPrimary4To6 = stage === 'primary' && (
    ['الصف الرابع', 'الصف الخامس', 'الصف السادس', '4th Grade', '5th Grade', '6th Grade'].includes(selectedGrade) ||
    selectedGrade?.includes('الرابع') ||
    selectedGrade?.includes('الخامس') ||
    selectedGrade?.includes('السادس')
  );
  const isSecondary2Scientific = stage === 'secondary' && (
    selectedGrade === 'الصف الثاني_scientific' ||
    (selectedGrade?.includes('الثاني') && selectedGrade?.includes('scientific')) ||
    (selectedGrade?.toLowerCase().includes('2nd') && selectedGrade?.includes('scientific'))
  );
  const isSecondary2Literary = stage === 'secondary' && (
    selectedGrade === 'الصف الثاني_literary' ||
    (selectedGrade?.includes('الثاني') && selectedGrade?.includes('literary')) ||
    (selectedGrade?.includes('الثانى') && selectedGrade?.includes('literary')) ||
    (selectedGrade?.toLowerCase().includes('2nd') && selectedGrade?.includes('literary'))
  );
  const isKindergarten = stage === 'kindergarten';
  const isMax40 = stage === 'primary';
  const isMiddle = stage === 'middle' || stage === 'prep';
  const isHomeschool = Boolean(title && (title.includes('منازل') || title.toLowerCase().includes('homeschool'))) || (typeof window !== 'undefined' && localStorage.getItem('current_system_type') === 'homeschool');
  const isMiddleOrSecStage = stage === 'middle' || stage === 'prep' || stage === 'secondary';
  const isMiddleHomeschool = (isMiddleOrSecStage || Boolean(title && (title.includes('المرحلة الإعدادية') || title.includes('المرحلة الثانوية') || title.includes('ثانوي')))) && isHomeschool;
  const isMiddleOrSecondaryOrTechnical = stage === 'middle' || stage === 'prep' || stage === 'secondary' || stage.includes('technical');
  const showTotalAndEval = !isMax40 && !isMiddleOrSecondaryOrTechnical;
  const subjectMax = isMax40 ? 40 : 100;
  const isFirstSemester = semester === 'first' || semester === 'الفصل الدراسي الأول';
  const isSecondSemester = semester === 'second' || semester === 'الفصل الدراسي الثاني';

  const extractStudentSeatNumber = (st: StudentData, sem: string): string => {
    if (!st) return '';
    const isFirst = sem === 'first' || sem === 'الفصل الدراسي الأول';
    const isSecond = sem === 'second' || sem === 'الفصل الدراسي الثاني';
    
    if (isSecond) {
      const s2 = st.seatNumbers?.['second'] || st.seatNumbers?.['الفصل الدراسي الثاني'] || st.seatNumbers?.[sem];
      if (s2 && String(s2).trim()) return String(s2).trim();
    } else if (isFirst) {
      const s1 = st.seatNumbers?.['first'] || st.seatNumbers?.['الفصل الدراسي الأول'] || st.seatNumbers?.[sem];
      if (s1 && String(s1).trim()) return String(s1).trim();
    } else if (st.seatNumbers?.[sem] && String(st.seatNumbers[sem]).trim()) {
      return String(st.seatNumbers[sem]).trim();
    }

    if (st.seatNumber && String(st.seatNumber).trim()) {
      return String(st.seatNumber).trim();
    }

    if (st.seatNumbers) {
      const s1 = st.seatNumbers['first'] || st.seatNumbers['الفصل الدراسي الأول'];
      if (s1 && String(s1).trim()) return String(s1).trim();
      const s2 = st.seatNumbers['second'] || st.seatNumbers['الفصل الدراسي الثاني'];
      if (s2 && String(s2).trim()) return String(s2).trim();
      for (const val of Object.values(st.seatNumbers)) {
        if (val && String(val).trim()) return String(val).trim();
      }
    }

    return '';
  };

  const extractStudentSecretNumber = (st: StudentData, sem: string): string => {
    if (!st) return '';
    const isFirst = sem === 'first' || sem === 'الفصل الدراسي الأول';
    const isSecond = sem === 'second' || sem === 'الفصل الدراسي الثاني';
    
    if (isSecond) {
      const s2 = st.secretNumbers?.['second'] || st.secretNumbers?.['الفصل الدراسي الثاني'] || st.secretNumbers?.[sem];
      if (s2 && String(s2).trim()) return String(s2).trim();
    } else if (isFirst) {
      const s1 = st.secretNumbers?.['first'] || st.secretNumbers?.['الفصل الدراسي الأول'] || st.secretNumbers?.[sem];
      if (s1 && String(s1).trim()) return String(s1).trim();
    } else if (st.secretNumbers?.[sem] && String(st.secretNumbers[sem]).trim()) {
      return String(st.secretNumbers[sem]).trim();
    }

    if (st.secretNumber && String(st.secretNumber).trim()) {
      return String(st.secretNumber).trim();
    }

    if (st.secretNumbers) {
      const s1 = st.secretNumbers['first'] || st.secretNumbers['الفصل الدراسي الأول'];
      if (s1 && String(s1).trim()) return String(s1).trim();
      const s2 = st.secretNumbers['second'] || st.secretNumbers['الفصل الدراسي الثاني'];
      if (s2 && String(s2).trim()) return String(s2).trim();
      for (const val of Object.values(st.secretNumbers)) {
        if (val && String(val).trim()) return String(val).trim();
      }
    }

    return '';
  };

  const getDefaultAssessmentsGrade = (s: string) => {
    if (s === 'kindergarten') return '100';
    if (s === 'primary') return '40';
    if (s === 'middle' || s === 'prep' || s === 'secondary' || s.includes('technical')) return '70';
    return '40';
  };

  const getDefaultWrittenGrade = (s: string) => {
    if (s === 'kindergarten') return '';
    if (s === 'primary') return '60';
    if (s === 'middle' || s === 'prep' || s === 'secondary' || s.includes('technical')) return '30';
    return '60';
  };

  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldNameEn, setNewFieldNameEn] = useState('');
  const [newFieldIsAddedToTotal, setNewFieldIsAddedToTotal] = useState(true);
  const [newFieldMaxGrade, setNewFieldMaxGrade] = useState(stage === 'kindergarten' ? '100' : '');
  const [newFieldMaxAssessmentsGrade, setNewFieldMaxAssessmentsGrade] = useState(getDefaultAssessmentsGrade(stage));
  const [newFieldHasWrittenExam, setNewFieldHasWrittenExam] = useState(stage !== 'kindergarten');
  const [newFieldMaxWrittenGrade, setNewFieldMaxWrittenGrade] = useState(getDefaultWrittenGrade(stage));
  const [newFieldMinPassPercentage, setNewFieldMinPassPercentage] = useState(stage === 'kindergarten' ? '50' : '30');
  const [newFieldMinTotalPassPercentage, setNewFieldMinTotalPassPercentage] = useState('50');
  const [newFieldActualMaxGrade, setNewFieldActualMaxGrade] = useState('100');
  const [newFieldLearningOutcomes, setNewFieldLearningOutcomes] = useState<'pass_fail' | 'grades'>('grades');
  const [newFieldKgDomain, setNewFieldKgDomain] = useState<string>(KG_LEARNING_DOMAINS[0]);
  const [isDeleteFieldModalOpen, setIsDeleteFieldModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (stage === 'kindergarten') {
      setNewFieldMaxGrade('100');
      setNewFieldHasWrittenExam(false);
      setNewFieldMinPassPercentage('50');
    } else {
      setNewFieldHasWrittenExam(true);
      setNewFieldMinPassPercentage('30');
    }
    setNewFieldMinTotalPassPercentage('50');
    setNewFieldActualMaxGrade('100');
    setNewFieldMaxAssessmentsGrade(getDefaultAssessmentsGrade(stage));
    setNewFieldMaxWrittenGrade(getDefaultWrittenGrade(stage));
  }, [stage]);

  const [isSelectEditFieldModalOpen, setIsSelectEditFieldModalOpen] = useState(false);
  const [isEditFieldFormOpen, setIsEditFieldFormOpen] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState('');
  const [editFieldNameEn, setEditFieldNameEn] = useState('');
  const [subjectEnModal, setSubjectEnModal] = useState<{
    mode: 'new' | 'edit';
    arName: string;
    enName: string;
  } | null>(null);
  const [tempSubjectNameEn, setTempSubjectNameEn] = useState('');

  const handleSaveSubjectEn = () => {
    if (!subjectEnModal) return;
    const trimmed = tempSubjectNameEn.trim();
    if (subjectEnModal.mode === 'new') {
      setNewFieldNameEn(trimmed);
    } else {
      setEditFieldNameEn(trimmed);
      if (fieldToEdit) {
        saveStoredSubjectEn(fieldToEdit, editFieldName, trimmed);
      }
    }
    setSubjectEnModal(null);
  };
  const [editFieldIsAddedToTotal, setEditFieldIsAddedToTotal] = useState(true);
  const [editFieldMaxGrade, setEditFieldMaxGrade] = useState('');
  const [editFieldMaxAssessmentsGrade, setEditFieldMaxAssessmentsGrade] = useState('');
  const [editFieldHasWrittenExam, setEditFieldHasWrittenExam] = useState(true);
  const [editFieldMaxWrittenGrade, setEditFieldMaxWrittenGrade] = useState('');
  const [editFieldMinPassPercentage, setEditFieldMinPassPercentage] = useState('');
  const [editFieldMinTotalPassPercentage, setEditFieldMinTotalPassPercentage] = useState('50');
  const [editFieldActualMaxGrade, setEditFieldActualMaxGrade] = useState('100');
  const [editFieldLearningOutcomes, setEditFieldLearningOutcomes] = useState<'pass_fail' | 'grades'>('grades');
  const [editFieldKgDomain, setEditFieldKgDomain] = useState<string>(KG_LEARNING_DOMAINS[0]);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  useEffect(() => {
    if (isEditingData || !localData || localData.length === 0 || !customCols || customCols.length === 0) return;
    const unseededCols = customCols.filter((col) => {
      if (!col || !col.key) return false;
      const hasAnyAssess = localData.some((st) => {
        const v1 = st.assessments?.first?.[col.key] ?? st.assessments?.['الفصل الدراسي الأول']?.[col.key];
        const v2 = st.assessments?.second?.[col.key] ?? st.assessments?.['الفصل الدراسي الثاني']?.[col.key];
        return (v1 !== undefined && String(v1).trim() !== '') || (v2 !== undefined && String(v2).trim() !== '');
      });
      return !hasAnyAssess;
    });
    if (unseededCols.length > 0) {
      const { updated, changed } = populateMissingSubjectGradesForStudents(
        localData,
        stage,
        unseededCols,
        defaultSubjectsOverrides
      );
      if (changed) {
        setLocalData(updated);
        onChange(updated);
      }
    }
  }, [customCols, stage, selectedGrade]);

  const handleGradeChange = (id: string, field: keyof AssessmentGrades, value: string) => {
    let colMax = subjectMax;
    const customCol = customCols.find(c => c.key === field);
    const ovr = defaultSubjectsOverrides?.[field as string];
    if (ovr?.maxAssessmentsGrade !== undefined) {
      colMax = ovr.maxAssessmentsGrade;
    } else if (customCol) {
      colMax = customCol.maxAssessmentsGrade !== undefined ? customCol.maxAssessmentsGrade : (customCol.maxGrade !== undefined ? customCol.maxGrade : subjectMax);
    } else if (field === 'arabic' || field === 'english') {
      // Fallback if not found in customCols, shouldn't happen
      colMax = defaultSubjectsOverrides[field]?.maxAssessmentsGrade !== undefined ? defaultSubjectsOverrides[field].maxAssessmentsGrade : (defaultSubjectsOverrides[field]?.maxGrade !== undefined ? defaultSubjectsOverrides[field].maxGrade : subjectMax);
    }

    // Validate number between 0 and subjectMax, or allow absence marks based on language
    const trimmedValue = value.trim();
    const isAbsence = trimmedValue === 'غ' || trimmedValue.toLowerCase() === 'a';
    if (!isAbsence) {
      if (value !== '') {
        if (!/^\d*[.,]?\d{0,2}$/.test(value)) {
          return;
        }
        const numVal = parseFloat(value.replace(',', '.'));
        if (!isNaN(numVal) && (numVal < 0 || numVal > colMax)) {
          return;
        }
      }
    }
    
    const newData = localData.map(student => {
      if (student.id === id) {
        const currentAssessments = student.assessments || {};
        const currentSemesterGrades = currentAssessments[semester] || {};
        
        // Auto-distribute total grade to detailedAssessments for this subject
        const currentDetailedAssessments = student.detailedAssessments || {};
        const currentSemesterDetailed = currentDetailedAssessments[semester] || {};
        const cfg = getSubjectsConfigForStageGrade(stage, selectedGrade);
        const fieldStr = String(field || '');
        const isPESubj = stage !== 'kindergarten' && (
          fieldStr === 'pe' || 
          fieldStr === 'sport' || 
          fieldStr === 'sports' || 
          fieldStr === 'physical_education' ||
          Boolean(cfg.customCols?.some((c: any) => c.key === fieldStr && (c.label?.includes('رياضية') || c.label?.includes('بدنية'))))
        );
        const isWithoutWritten = stage !== 'kindergarten' && !isPESubj && isSubjectWithoutWrittenExam({ key: fieldStr }, cfg.customCols);
        const isSecondary2 = stage === 'secondary' && (
          selectedGrade?.includes('الثاني') ||
          selectedGrade?.includes('الثانى') ||
          selectedGrade?.toLowerCase().includes('2nd')
        );
        let isModernSec = false;
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('sheet_control_school_data');
            if (saved && JSON.parse(saved)?.secondarySystem === 'modern') isModernSec = true;
          } catch {}
        }
        if (selectedGrade?.includes('modern') || selectedGrade?.includes('medical') || selectedGrade?.includes('engineering') || selectedGrade?.includes('business') || selectedGrade?.includes('arts')) {
          isModernSec = true;
        }
        const isSec2Modern = Boolean(isSecondary2 && isModernSec);
        const distributedItem = distributeTotalToDetailedAssessment(value, colMax, stage, isWithoutWritten, isPESubj, isSec2Modern);

        if (!['total', 'percentage', 'evaluation', 'procedure', 'finalResult', 'studentRank', 'notes', 'notesCount'].includes(field as string)) {
          lastActiveSubjectKey.current = field as string;
          try {
            localStorage.setItem('detailed_assessments_last_subject', field as string);
            localStorage.setItem(`detailed_assessments_last_subject_${stage}_${selectedGrade}`, field as string);
          } catch {}
        }

        return {
          ...student,
          assessments: {
            ...currentAssessments,
            [semester]: {
              ...currentSemesterGrades,
              [field]: value,
            }
          },
          detailedAssessments: {
            ...currentDetailedAssessments,
            [semester]: {
              ...currentSemesterDetailed,
              [field as string]: distributedItem
            }
          }
        };
      }
      return student;
    });
    setLocalData(newData);
    onChange(newData);
  };

  const getStudentSemesterScore = (student: StudentData, semKey: 'first' | 'second', forAdded: boolean = true) => {
    let assess = student.assessments?.[semKey];
    let written = student.writtenExams?.[semKey];

    if (!assess && student.assessments) {
      if (semKey === 'first') assess = student.assessments['الفصل الدراسي الأول'];
      else if (semKey === 'second') assess = student.assessments['الفصل الدراسي الثاني'];
    }
    if (!written && student.writtenExams) {
      if (semKey === 'first') written = student.writtenExams['الفصل الدراسي الأول'];
      else if (semKey === 'second') written = student.writtenExams['الفصل الدراسي الثاني'];
    }

    let semTotal = 0;
    let hasValue = false;
    const targetSubjects = customCols.filter(c => {
      const override = defaultSubjectsOverrides?.[c.key];
      const isAdded = override?.isAddedToTotal !== undefined ? override.isAddedToTotal : (c.isAddedToTotal !== false);
      return forAdded ? isAdded : !isAdded;
    });

    const hasMercyStage = stage === 'primary' || stage === 'middle' || stage === 'prep' || stage === 'secondary';
    const mercyBoosts = semKey === 'second' && hasMercyStage
      ? getPrimaryStudentMercyBoosts(student, stage, customCols, defaultSubjectsOverrides, gradingSettings, selectedGrade)
      : {};

    targetSubjects.forEach(c => {
      const override = defaultSubjectsOverrides?.[c.key];
      const hasWritten = override?.hasWrittenExam !== undefined ? override.hasWrittenExam : (c.hasWrittenExam !== false);
      const boost = mercyBoosts[c.key];

      if (assess) {
        const rawVal = (assess as any)[c.key];
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          const trimmedVal = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
          const isAbsence = trimmedVal === 'غ' || (typeof trimmedVal === 'string' && trimmedVal.toLowerCase() === 'a');
          const baseVal = isAbsence ? 0 : parseFloat(typeof rawVal === 'string' ? rawVal.replace(',', '.') : rawVal);
          if (!isNaN(baseVal) || isAbsence) {
            semTotal += isNaN(baseVal) ? 0 : baseVal;
            hasValue = true;
          }
        }
      }

      if (written && hasWritten) {
        const rawVal = (written as any)[c.key];
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          const trimmedVal = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
          const isAbsence = trimmedVal === 'غ' || (typeof trimmedVal === 'string' && trimmedVal.toLowerCase() === 'a');
          const baseVal = isAbsence ? 0 : parseFloat(typeof rawVal === 'string' ? rawVal.replace(',', '.') : rawVal);
          if (!isNaN(baseVal) || isAbsence) {
            semTotal += isNaN(baseVal) ? 0 : baseVal;
            hasValue = true;
          }
        }
      }

      if (boost) {
        const pct = boost.actualPct ?? 0.5;
        semTotal += boost.boostAmount / pct;
      }
    });

    return { total: semTotal, hasValue };
  };

  const calculateTotal = (studentOrGrades: StudentData | AssessmentGrades | undefined) => {
    if (!studentOrGrades) return '';

    if ('id' in studentOrGrades) {
      const student = studentOrGrades as StudentData;
      if (isSecondSemester) {
        const sem1 = getStudentSemesterScore(student, 'first', true);
        const sem2 = getStudentSemesterScore(student, 'second', true);
        if (!sem1.hasValue && !sem2.hasValue) return '';
        const combined = (sem1.total + sem2.total) / 2;
        return roundToOneDecimal(combined).toString();
      } else {
        const sem1 = getStudentSemesterScore(student, 'first', true);
        return sem1.hasValue ? roundToOneDecimal(sem1.total).toString() : '';
      }
    }

    let assessmentsGrades = studentOrGrades as AssessmentGrades;
    let total = 0;
    let hasValue = false;
    const addedSubjects = customCols.filter(c => {
      const override = defaultSubjectsOverrides?.[c.key];
      return override?.isAddedToTotal !== undefined ? override.isAddedToTotal : (c.isAddedToTotal !== false);
    });
    addedSubjects.forEach(c => {
      if (assessmentsGrades) {
        const rawVal = (assessmentsGrades as any)[c.key];
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          const trimmedVal = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
          const isAbsence = trimmedVal === 'غ' || (typeof trimmedVal === 'string' && trimmedVal.toLowerCase() === 'a');
          const val = isAbsence ? 0 : parseFloat(typeof rawVal === 'string' ? rawVal.replace(',', '.') : rawVal);
          if (!isNaN(val) || isAbsence) {
            total += isNaN(val) ? 0 : val;
            hasValue = true;
          }
        }
      }
    });
    return hasValue ? roundToOneDecimal(total).toString() : '';
  };

  const calculateNonAddedTotal = (studentOrGrades: StudentData | AssessmentGrades | undefined): number => {
    if (!studentOrGrades) return 0;

    if ('id' in studentOrGrades) {
      const student = studentOrGrades as StudentData;
      if (isSecondSemester) {
        const sem1 = getStudentSemesterScore(student, 'first', false);
        const sem2 = getStudentSemesterScore(student, 'second', false);
        if (!sem1.hasValue && !sem2.hasValue) return 0;
        const combined = (sem1.total + sem2.total) / 2;
        return roundToOneDecimal(combined);
      } else {
        const sem1 = getStudentSemesterScore(student, 'first', false);
        return sem1.hasValue ? roundToOneDecimal(sem1.total) : 0;
      }
    }

    let assessmentsGrades = studentOrGrades as AssessmentGrades;
    let total = 0;
    const notAddedSubjects = customCols.filter(c => {
      const override = defaultSubjectsOverrides?.[c.key];
      return override?.isAddedToTotal !== undefined ? !override.isAddedToTotal : (c.isAddedToTotal === false);
    });
    notAddedSubjects.forEach(c => {
      if (assessmentsGrades) {
        const rawVal = (assessmentsGrades as any)[c.key];
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          const trimmedVal = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
          const isAbsence = trimmedVal === 'غ' || (typeof trimmedVal === 'string' && trimmedVal.toLowerCase() === 'a');
          const val = isAbsence ? 0 : parseFloat(typeof rawVal === 'string' ? rawVal.replace(',', '.') : rawVal);
          if (!isNaN(val) || isAbsence) {
            total += isNaN(val) ? 0 : val;
          }
        }
      }
    });
    return roundToOneDecimal(total);
  };

  const studentRanks = useMemo(() => {
    const ranksMap: Record<string, string> = {};
    if (isFirstSemester) return ranksMap;

    const studentScores: { id: string; addedTotal: number; nonAddedTotal: number }[] = [];
    localData.forEach(student => {
      const totalStr = calculateTotal(student);
      if (totalStr !== '') {
        const totalNum = parseFloat(totalStr);
        if (!isNaN(totalNum)) {
          const nonAddedNum = calculateNonAddedTotal(student);
          studentScores.push({ id: student.id, addedTotal: totalNum, nonAddedTotal: nonAddedNum });
        }
      }
    });

    if (studentScores.length === 0) return ranksMap;

    // Build unique score tiers: sorted primarily by addedTotal (descending), then by nonAddedTotal (descending)
    interface ScoreTier {
      addedTotal: number;
      nonAddedTotal: number;
      key: string;
    }

    const tierMap = new Map<string, ScoreTier>();
    const tierCounts = new Map<string, number>();

    studentScores.forEach(s => {
      const key = `${roundToOneDecimal(s.addedTotal)}_${roundToOneDecimal(s.nonAddedTotal)}`;
      if (!tierMap.has(key)) {
        tierMap.set(key, { addedTotal: s.addedTotal, nonAddedTotal: s.nonAddedTotal, key });
      }
      tierCounts.set(key, (tierCounts.get(key) || 0) + 1);
    });

    const sortedTiers = Array.from(tierMap.values()).sort((a, b) => {
      if (b.addedTotal !== a.addedTotal) {
        return b.addedTotal - a.addedTotal;
      }
      return b.nonAddedTotal - a.nonAddedTotal;
    });

    // Map each unique score tier to its rank string
    const tierToRankStr = new Map<string, string>();
    sortedTiers.forEach((tier, idx) => {
      const rankNum = idx + 1;
      const count = tierCounts.get(tier.key) || 0;
      tierToRankStr.set(tier.key, count > 1 ? `${rankNum} مكرر` : `${rankNum}`);
    });

    studentScores.forEach(s => {
      const key = `${roundToOneDecimal(s.addedTotal)}_${roundToOneDecimal(s.nonAddedTotal)}`;
      const rank = tierToRankStr.get(key);
      if (rank) {
        ranksMap[s.id] = rank;
      }
    });

    return ranksMap;
  }, [localData, isFirstSemester, customCols, defaultSubjectsOverrides, isKindergarten, isMax40, semester, gradingSettings, stage]);

  let filteredData = sortStudents(
    localData.filter(student => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (student.name && student.name.toLowerCase().includes(searchLower)) ||
        (student.nationalId && student.nationalId.includes(searchLower))
      );
    }),
    sortBy,
    semester,
    lang
  );

  if (isEditingData) {
    filteredData = frozenIdsRef.current.map(id => localData.find(s => s.id === id)).filter(Boolean) as StudentData[];
  } else {
    frozenIdsRef.current = filteredData.map(s => s.id);
  }

  const isFirstGrade = (() => {
    if (!selectedGrade) return true;
    const trimmed = selectedGrade.trim();
    if (stage === 'kindergarten') {
      return trimmed.includes('الأول') || trimmed.includes('KG1') || trimmed.includes('1');
    }
    return trimmed === 'الصف الأول' || trimmed.includes('الأول') || trimmed === '1st Grade';
  })();

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

  const executePrintOption = async (
    reportType: PdfReportType,
    subjectInfo?: { key: string; label: string },
    customControlSheetOptions?: CustomControlSheetOptions
  ) => {
    await exportStudentsDataToPdf({
      title,
      reportType,
      isHomeschool,
      customControlSheetOptions,
      subjectKey: subjectInfo?.key,
      subjectLabel: subjectInfo?.label,
      screenSubtitle: lang === 'ar' ? 'تحرير إجمالى التقييمات لكل مادة دراسية' : 'Edit Total Assessments per Subject',
      stage,
      selectedGrade,
      sortBy,
      students: filteredData,
      isFirstGrade,
      showExamFields: !isKindergarten,
      semester,
      normalizeStatusForGrade,
      customCols,
      defaultSubjectsOverrides,
      labels: {
        serial: t.serial,
        studentName: isKindergarten ? 'اسم التلميذ' : t.studentName,
        nationalId: t.nationalId,
        gender: t.gender,
        enrollmentStatus: isKindergarten ? 'حالة التلميذ' : t.enrollmentStatus,
        enrollmentType: (t as any).enrollmentType || 'نوعية القيد',
        religion: t.religion,
        seatNumber: (t as any).seatNumber || 'رقم الجلوس',
        secretNumber: (t as any).secretNumber || 'الرقم السري',
        committeeNumber: (t as any).committeeNumber || 'رقم اللجنة',
        male: t.male,
        female: t.female,
        muslim: t.muslim,
        muslimFemale: (t as any).muslimFemale || 'مسلمة',
        christian: t.christian,
        christianFemale: (t as any).christianFemale || 'مسيحية',
      },
    });
    if (downloadToastTimerRef.current) {
      clearTimeout(downloadToastTimerRef.current);
    }
    setShowDownloadSuccess(true);
    downloadToastTimerRef.current = setTimeout(() => {
      setShowDownloadSuccess(false);
    }, 3500);
  };

  const [isMercyPrintModalOpen, setIsMercyPrintModalOpen] = useState(false);
  const [isSeatNumbersModalOpen, setIsSeatNumbersModalOpen] = useState(false);
  const [isSeatNumbersEnglish, setIsSeatNumbersEnglish] = useState(false);
  const [isCustomControlSheetModalOpen, setIsCustomControlSheetModalOpen] = useState(false);
  const isOfficial = isPaidUnlocked() && !isTrialMode;
  const [showBlankSheetPasswordModal, setShowBlankSheetPasswordModal] = useState(false);
  const [blankSheetRandomId, setBlankSheetRandomId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sheet_control_blank_sheet_random_id');
      const parsed = saved ? parseInt(saved, 10) : 0;
      if (parsed >= 300 && parsed <= 399) return parsed;
      const newId = Math.floor(Math.random() * 100) + 300; // 300 to 399
      localStorage.setItem('sheet_control_blank_sheet_random_id', String(newId));
      return newId;
    } catch {
      return 350;
    }
  });

  const generateFreshBlankSheetId = () => {
    let newId = Math.floor(Math.random() * 100) + 300;
    try {
      localStorage.setItem('sheet_control_blank_sheet_random_id', String(newId));
    } catch {}
    setBlankSheetRandomId(newId);
    return newId;
  };

  const isBlankSheetUnlocked = () => {
    try {
      const currentMainId = getDeviceId();
      const unlockedId = localStorage.getItem('sheet_control_blank_sheet_unlocked_for_id');
      return unlockedId === String(currentMainId);
    } catch {
      return false;
    }
  };
  const [showCustomSheetPasswordModal, setShowCustomSheetPasswordModal] = useState(false);
  const [customSheetRandomId, setCustomSheetRandomId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sheet_control_custom_sheet_random_id');
      const parsed = saved ? parseInt(saved, 10) : 0;
      if (parsed >= 400 && parsed <= 499) return parsed;
      const newId = Math.floor(Math.random() * 100) + 400; // 400 to 499
      localStorage.setItem('sheet_control_custom_sheet_random_id', String(newId));
      return newId;
    } catch {
      return 450;
    }
  });

  const isCustomSheetUnlocked = () => {
    try {
      const currentMainId = getDeviceId();
      const unlockedId = localStorage.getItem('sheet_control_custom_sheet_unlocked_for_id');
      return unlockedId === String(currentMainId);
    } catch {
      return false;
    }
  };
  const [seatNumbersRandomId, setSeatNumbersRandomId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sheet_control_seat_numbers_random_id');
      const parsed = saved ? parseInt(saved, 10) : 0;
      if (parsed >= 500 && parsed <= 599) return parsed;
      const newId = Math.floor(Math.random() * 100) + 500;
      localStorage.setItem('sheet_control_seat_numbers_random_id', String(newId));
      return newId;
    } catch {
      return 550;
    }
  });

  const isSeatNumbersUnlocked = () => {
    try {
      const currentMainId = getDeviceId();
      const unlockedId = localStorage.getItem('sheet_control_seat_numbers_unlocked_for_id');
      return unlockedId === String(currentMainId);
    } catch {
      return false;
    }
  };

  const [showEnglishCertPasswordModal, setShowEnglishCertPasswordModal] = useState(false);
  const [englishCertRandomId, setEnglishCertRandomId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sheet_control_english_cert_random_id');
      const parsed = saved ? parseInt(saved, 10) : 0;
      if (parsed >= 600 && parsed <= 699) return parsed;
      const newId = Math.floor(Math.random() * 100) + 600;
      localStorage.setItem('sheet_control_english_cert_random_id', String(newId));
      return newId;
    } catch {
      return 650;
    }
  });

  const isEnglishCertUnlocked = () => {
    try {
      const currentMainId = getDeviceId();
      const unlockedId = localStorage.getItem('sheet_control_english_cert_unlocked_for_id');
      return unlockedId === String(currentMainId);
    } catch {
      return false;
    }
  };

  const [showCertificatesPasswordModal, setShowCertificatesPasswordModal] = useState(false);
  const [certificatesRandomId, setCertificatesRandomId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sheet_control_certificates_random_id');
      const parsed = saved ? parseInt(saved, 10) : 0;
      if (parsed >= 700 && parsed <= 799) return parsed;
      const newId = Math.floor(Math.random() * 100) + 700; // 700 to 799
      localStorage.setItem('sheet_control_certificates_random_id', String(newId));
      return newId;
    } catch {
      return 750;
    }
  });

  const isCertificatesUnlocked = () => {
    try {
      const currentMainId = getDeviceId();
      const unlockedId = localStorage.getItem('sheet_control_certificates_unlocked_for_id');
      return unlockedId === String(currentMainId);
    } catch {
      return false;
    }
  };

  const [pendingEnglishReportType, setPendingEnglishReportType] = useState<PdfReportType | null>(null);

  const [isTopTenCertModalOpen, setIsTopTenCertModalOpen] = useState(false);
  const [isTopTenCertDamg, setIsTopTenCertDamg] = useState(false);

  const handlePrintOption = async (reportType: PdfReportType) => {
    setIsPrintMenuOpen(false);
    if (
      reportType === 'top_ten_students_certificates' ||
      reportType === 'top_ten_damg_students_certificates'
    ) {
      setIsTopTenCertDamg(reportType === 'top_ten_damg_students_certificates');
      setIsTopTenCertModalOpen(true);
      return;
    }
    if (reportType === 'all_students_certificates') {
      setIsAllStudentsCertModalOpen(true);
      return;
    }
    if (reportType === 'mercy_grades_students') {
      setIsMercyPrintModalOpen(true);
      return;
    }
    if (
      reportType === 'student_semester_grades_certificate_en' ||
      reportType === 'student_semester_grades_assessments_certificate_en' ||
      reportType === 'student_semester_grades_assessments_certificate_detailed_en'
    ) {
      if (isOfficial && !isEnglishCertUnlocked()) {
        setPendingEnglishReportType(reportType);
        setShowEnglishCertPasswordModal(true);
        return;
      }
    }
    if (stage !== 'kindergarten') {
      if (reportType === 'seat_numbers') {
        setIsSeatNumbersEnglish(false);
        setIsSeatNumbersModalOpen(true);
        return;
      }
      if (reportType === 'seat_numbers_english') {
        setIsSeatNumbersEnglish(true);
        if (isOfficial && !isSeatNumbersUnlocked()) {
          setShowSeatNumbersPasswordModal(true);
          return;
        }
        setIsSeatNumbersModalOpen(true);
        return;
      }
    }
    await executePrintOption(reportType);
  };

  const isSecondary2 = stage === 'secondary' && (
    selectedGrade?.includes('الثاني') ||
    selectedGrade?.includes('الثانى') ||
    selectedGrade?.toLowerCase().includes('2nd') ||
    selectedGrade?.includes('second') ||
    selectedGrade === 'secondary_2'
  );
  let isModernSec = false;
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('sheet_control_school_data');
      if (saved && JSON.parse(saved)?.secondarySystem === 'modern') isModernSec = true;
    } catch {}
  }
  if (selectedGrade?.includes('modern') || selectedGrade?.includes('medical') || selectedGrade?.includes('engineering') || selectedGrade?.includes('business') || selectedGrade?.includes('arts') || selectedGrade?.includes('بكالوريا') || selectedGrade?.includes('الحديث')) {
    isModernSec = true;
  }
  const isSec2Modern = Boolean(isSecondary2 && isModernSec);

  const totalMax = isSec2Modern ? 400 : customCols.reduce((sum, c) => {
    if (c.isAddedToTotal === false) return sum;
    if (isKindergarten) {
      return sum + (c.maxGrade !== undefined ? c.maxGrade : 100);
    }
    const maxAssess = c.maxAssessmentsGrade !== undefined ? c.maxAssessmentsGrade : (c.maxGrade !== undefined ? c.maxGrade : (isMax40 ? 40 : 70));
    const maxWritten = c.hasWrittenExam !== false ? (c.maxWrittenGrade !== undefined ? c.maxWrittenGrade : (isMax40 ? 60 : 30)) : 0;
    return sum + maxAssess + maxWritten;
  }, 0);

  const displayTotalMax = totalMax;
  
  const getEvaluationData = (studentOrGrades: StudentData | AssessmentGrades | undefined) => {
    if (!studentOrGrades) return null;
    const totalStr = calculateTotal(studentOrGrades);
    if (!totalStr || displayTotalMax <= 0) return null;
    const total = parseFloat(totalStr);
    if (isNaN(total)) return null;

    const x = (total / displayTotalMax) * 100;
    if (isKindergarten) {
      if (x >= 85) {
        return {
          bg: 'bg-[#0078d7]',
          text: 'text-white',
          colorHex: '#0078d7',
          label: 'يفوق التوقعات دائماً',
          name: 'يفوق التوقعات دائماً',
          action: 'أنشطة إثرائية'
        };
      }
      if (x >= 65) {
        return {
          bg: 'bg-[#16c60c]',
          text: 'text-white',
          colorHex: '#16c60c',
          label: 'يلبي التوقعات',
          name: 'يلبي التوقعات',
          action: 'رعاية وتحفيز'
        };
      }
      if (x >= 50) {
        return {
          bg: 'bg-[#ffff00]',
          text: 'text-slate-900',
          colorHex: '#ffff00',
          label: 'يلبي التوقعات أحياناً',
          name: 'يلبي التوقعات أحياناً',
          action: 'رفع مستوى'
        };
      }
      return {
        bg: 'bg-[#e81123]',
        text: 'text-white',
        colorHex: '#e81123',
        label: 'أقل من المتوقع',
        name: 'أقل من المتوقع',
        action: 'أنشطة علاجية'
      };
    }

    if (x >= 85) return { bg: 'bg-transparent', text: 'text-slate-900', label: (t as any).excellent, name: (t as any).excellent, action: 'أنشطة إثرائية' };
    if (x >= 75) return { bg: 'bg-transparent', text: 'text-slate-900', label: (t as any).veryGood, name: (t as any).veryGood, action: 'رعاية وتحفيز' };
    if (x >= 65) return { bg: 'bg-transparent', text: 'text-slate-900', label: (t as any).good, name: (t as any).good, action: 'رفع كفاءة' };
    if (x >= 50) return { bg: 'bg-transparent', text: 'text-slate-900', label: (t as any).acceptable, name: (t as any).acceptable, action: 'رفع مستوى' };
    return { bg: 'bg-transparent', text: 'text-slate-900', label: (t as any).belowLevel, name: (t as any).belowLevel, action: 'أنشطة علاجية' };
  };

  const getSingleSubjectEvaluation = (rawVal: string | number | undefined, max: number) => {
    if (rawVal === undefined || rawVal === '') return null;
    const trimmedVal = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
    const isAbsence = trimmedVal === 'غ' || (typeof trimmedVal === 'string' && trimmedVal.toLowerCase() === 'a');
    const val = isAbsence ? 0 : parseFloat(typeof rawVal === 'string' ? rawVal.replace(',', '.') : rawVal.toString());
    if (isNaN(val)) return null;

    const x = (val / max) * 100;
    if (x >= 85) return { bg: 'bg-[#0070c0]', text: 'text-white', label: (t as any).excellent, name: (t as any).excellent };
    if (x >= 75) return { bg: 'bg-[#00b050]', text: 'text-white', label: (t as any).veryGood, name: (t as any).veryGood };
    if (x >= 65) return { bg: 'bg-[#92d050]', text: 'text-slate-900', label: (t as any).good, name: (t as any).good };
    if (x >= 50) return { bg: 'bg-[#ffff00]', text: 'text-slate-900', label: (t as any).acceptable, name: (t as any).acceptable };
    return { bg: 'bg-[#ff0000]', text: 'text-white', label: (t as any).belowLevel, name: (t as any).belowLevel };
  };

  const addedCols = customCols.filter(c => {
    const override = defaultSubjectsOverrides?.[c.key];
    const isAdded = override?.isAddedToTotal !== undefined ? override.isAddedToTotal : (c.isAddedToTotal !== false);
    return isAdded;
  }).map(c => {
    const override = defaultSubjectsOverrides?.[c.key];
    const maxAssessmentsGrade = override?.maxAssessmentsGrade !== undefined ? override.maxAssessmentsGrade : c.maxAssessmentsGrade;
    const maxWrittenGrade = override?.maxWrittenGrade !== undefined ? override.maxWrittenGrade : c.maxWrittenGrade;
    const minPassPercentage = override?.minPassPercentage !== undefined ? override.minPassPercentage : c.minPassPercentage;
    const hasWrittenExam = override?.hasWrittenExam !== undefined ? override.hasWrittenExam : (c.hasWrittenExam !== false);
    const maxGrade = override?.maxGrade !== undefined ? override.maxGrade : c.maxGrade;
    const label = override?.label || c.label;
    const learningOutcomesType = override?.learningOutcomesType || c.learningOutcomesType || 'grades';

    let maxVal = maxAssessmentsGrade !== undefined ? maxAssessmentsGrade : (maxGrade !== undefined ? maxGrade : subjectMax);
    return { 
      ...c,
      key: c.key, 
      label: (label || '').slice(0, 30), 
      max: maxVal, 
      isAddedToTotal: true,
      maxAssessmentsGrade,
      maxWrittenGrade,
      hasWrittenExam,
      minPassPercentage,
      maxGrade,
      learningOutcomesType
    };
  });
  
  const notAddedCols = customCols.filter(c => {
    const override = defaultSubjectsOverrides?.[c.key];
    const isAdded = override?.isAddedToTotal !== undefined ? override.isAddedToTotal : (c.isAddedToTotal !== false);
    return !isAdded;
  }).map(c => {
    const override = defaultSubjectsOverrides?.[c.key];
    const maxAssessmentsGrade = override?.maxAssessmentsGrade !== undefined ? override.maxAssessmentsGrade : c.maxAssessmentsGrade;
    const maxWrittenGrade = override?.maxWrittenGrade !== undefined ? override.maxWrittenGrade : c.maxWrittenGrade;
    const minPassPercentage = override?.minPassPercentage !== undefined ? override.minPassPercentage : c.minPassPercentage;
    const hasWrittenExam = override?.hasWrittenExam !== undefined ? override.hasWrittenExam : (c.hasWrittenExam !== false);
    const maxGrade = override?.maxGrade !== undefined ? override.maxGrade : c.maxGrade;
    const label = override?.label || c.label;
    const learningOutcomesType = override?.learningOutcomesType || c.learningOutcomesType || 'grades';

    let maxVal = maxAssessmentsGrade !== undefined ? maxAssessmentsGrade : (maxGrade !== undefined ? maxGrade : subjectMax);
    return { 
      ...c,
      key: c.key, 
      label: (label || '').slice(0, 30), 
      max: maxVal, 
      isAddedToTotal: false,
      maxAssessmentsGrade,
      maxWrittenGrade,
      hasWrittenExam,
      minPassPercentage,
      maxGrade,
      learningOutcomesType
    };
  });

  
  const getFinalResult = (studentOrGrades: StudentData | AssessmentGrades | undefined) => {
    if (!studentOrGrades) return null;

    const rawGender = studentOrGrades && 'gender' in studentOrGrades ? (studentOrGrades as any).gender : '';
    const g = typeof rawGender === 'string' ? rawGender.trim().toLowerCase() : '';
    const nid = studentOrGrades && 'nationalId' in studentOrGrades && typeof (studentOrGrades as any).nationalId === 'string' ? (studentOrGrades as any).nationalId.trim() : '';
    const nidGenderDigit = nid.length >= 13 ? parseInt(nid[12], 10) : NaN;
    const isFemaleByNid = !isNaN(nidGenderDigit) && nidGenderDigit % 2 === 0;
    const isFemale = g === 'female' || g === 'أنثى' || g === 'انثى' || g === 'بنت' || g.includes('أنث') || g.includes('انث') || g.includes('بنت') || (!g && isFemaleByNid);

    if (isKindergarten) {
      const isRecorded = (obj: any, key: string) => {
        if (!obj) return false;
        const val = obj[key];
        if (val === undefined || val === null) return false;
        if (typeof val === 'string' && val.trim() === '') return false;
        return true;
      };

      const parseGrade = (raw: any) => {
        if (raw === undefined || raw === null || raw === '') return null;
        const trimmed = typeof raw === 'string' ? raw.trim() : raw;
        const isAbsence = trimmed === 'غ' || (typeof trimmed === 'string' && trimmed.toLowerCase() === 'a');
        if (isAbsence) return 0;
        const num = parseFloat(typeof raw === 'string' ? raw.replace(',', '.') : raw);
        return isNaN(num) ? 0 : num;
      };

      let assess1: AssessmentGrades | undefined;
      let assess2: AssessmentGrades | undefined;

      if ('id' in studentOrGrades) {
        const student = studentOrGrades as StudentData;
        assess1 = student.assessments?.['first'] || student.assessments?.['الفصل الدراسي الأول'];
        assess2 = student.assessments?.['second'] || student.assessments?.['الفصل الدراسي الثاني'];
      } else {
        const grades = studentOrGrades as AssessmentGrades;
        if (isSecondSemester) {
          assess2 = grades;
        } else {
          assess1 = grades;
        }
      }

      if (isFirstSemester) {
        // تقييمات الفصل الدراسي الأول: مستقلة تماماً عن تقييمات الفصل الدراسي الثاني
        const isSem1Complete = customCols.every(c => isRecorded(assess1, c.key));
        if (!isSem1Complete) {
          return { 
            label: 'يجب رصد درجات كافة المواد', 
            tooltip: 'يجب رصد درجات كافة المواد فى الفصل الدراسي الاول',
            bg: 'bg-transparent', 
            text: 'text-slate-800', 
            isNotice: true 
          };
        }

        let anySubjectFailed = false;
        customCols.forEach(c => {
          const maxVal = c.maxAssessmentsGrade !== undefined ? c.maxAssessmentsGrade : (c.maxGrade !== undefined ? c.maxGrade : 100);
          const raw = assess1 ? (assess1 as any)[c.key] : undefined;
          const score = parseGrade(raw) ?? 0;
          const percentage = maxVal > 0 ? (score / maxVal) * 100 : 0;
          const isReligion = c.key === 'religion' || (c.label && c.label.includes('دين'));
          const minPass = isReligion ? 70 : (c.minPassPercentage !== undefined ? c.minPassPercentage : 50);

          if (percentage < minPass) {
            anySubjectFailed = true;
          }
        });

        if (anySubjectFailed) {
          return { 
            label: isFemale ? 'لها برنامج علاجى' : 'له برنامج علاجى', 
            bg: 'bg-transparent', 
            text: 'text-slate-900' 
          };
        }
        return { 
          label: isFemale ? 'ناجحة' : 'ناجح', 
          bg: 'bg-transparent', 
          text: 'text-slate-900' 
        };
      } else {
        // تقييمات الفصل الدراسي الثاني: مرتبطة بتمام رصد الفصل الدراسي الأول والفصل الدراسي الثاني معاً
        const isSem1Complete = customCols.every(c => isRecorded(assess1, c.key));
        const isSem2Complete = customCols.every(c => isRecorded(assess2, c.key));
        if (!isSem1Complete || !isSem2Complete) {
          return { 
            label: 'يجب رصد درجات كافة المواد', 
            tooltip: 'يجب رصد درجات كافة المواد فى الفصلين الدراسيين',
            bg: 'bg-transparent', 
            text: 'text-slate-800', 
            isNotice: true 
          };
        }

        let anySubjectFailed = false;
        customCols.forEach(c => {
          const maxVal = c.maxAssessmentsGrade !== undefined ? c.maxAssessmentsGrade : (c.maxGrade !== undefined ? c.maxGrade : 100);
          const raw1 = assess1 ? (assess1 as any)[c.key] : undefined;
          const raw2 = assess2 ? (assess2 as any)[c.key] : undefined;
          const num1 = parseGrade(raw1) ?? 0;
          const num2 = parseGrade(raw2) ?? 0;

          const pct1 = maxVal > 0 ? (num1 / maxVal) * 100 : 0;
          const pct2 = maxVal > 0 ? (num2 / maxVal) * 100 : 0;

          const isReligion = c.key === 'religion' || (c.label && c.label.includes('دين'));
          const minPass = isReligion ? 70 : (c.minPassPercentage !== undefined ? c.minPassPercentage : 50);

          // إذا حصل التلميذ على أقل من نسبة النجاح في أي مادة من مواد الفصلين الدراسيين
          if (pct1 < minPass || pct2 < minPass) {
            anySubjectFailed = true;
          }
        });

        if (anySubjectFailed) {
          return { 
            label: isFemale ? 'لها برنامج علاجى' : 'له برنامج علاجى', 
            bg: 'bg-transparent', 
            text: 'text-slate-900' 
          };
        }
        return { 
          label: isFemale ? 'ناجحة' : 'ناجح', 
          bg: 'bg-transparent', 
          text: 'text-slate-900' 
        };
      }
    }

    // لجميع المراحل ماعدا رياض الاطفال:
    let assess1: AssessmentGrades | undefined;
    let assess2: AssessmentGrades | undefined;
    let written1: AssessmentGrades | undefined;
    let written2: AssessmentGrades | undefined;

    if ('id' in studentOrGrades) {
      const student = studentOrGrades as StudentData;
      assess1 = student.assessments?.['first'] || student.assessments?.['الفصل الدراسي الأول'];
      assess2 = student.assessments?.['second'] || student.assessments?.['الفصل الدراسي الثاني'];
      written1 = student.writtenExams?.['first'] || student.writtenExams?.['الفصل الدراسي الأول'];
      written2 = student.writtenExams?.[semester] || student.writtenExams?.['second'] || student.writtenExams?.['الفصل الدراسي الثاني'];
    } else {
      const grades = studentOrGrades as AssessmentGrades;
      if (isSecondSemester) {
        assess2 = grades;
      } else {
        assess1 = grades;
      }
    }

    const isRecorded = (obj: any, key: string) => {
      if (!obj) return false;
      const val = obj[key];
      if (val === undefined || val === null) return false;
      if (typeof val === 'string' && val.trim() === '') return false;
      return true;
    };

    const writtenCols = customCols.filter(c => c.hasWrittenExam !== false);
    const hasAnyWrittenCols = writtenCols.length > 0;

    const isAssess1Complete = customCols.length > 0 && customCols.every(c => isRecorded(assess1, c.key));
    const isAssess2Complete = customCols.length > 0 && customCols.every(c => isRecorded(assess2, c.key));
    const isWritten1Complete = !hasAnyWrittenCols || writtenCols.every(c => isRecorded(written1, c.key));
    const isWritten2Complete = !hasAnyWrittenCols || writtenCols.every(c => isRecorded(written2, c.key));

    if (!isAssess1Complete || !isAssess2Complete || !isWritten1Complete || !isWritten2Complete) {
      return { 
        label: 'يجب رصد درجات كافة المواد', 
        tooltip: hasAnyWrittenCols 
          ? 'يجب رصد درجات كافة المواد - درجات التقييمات والامتحانات التحريرية للفصلين الدراسيين'
          : 'يجب رصد درجات كافة المواد فى الفصلين الدراسيين',
        bg: 'bg-transparent', 
        text: 'text-slate-800', 
        isNotice: true,
        notes: 'يجب رصد درجات كافة المواد للفصلين الدراسيين أولاً لاحتساب النتيجة',
        secondSessionSubjectsText: '-',
        secondSessionSubjectsCount: 0,
        detailsLines: ['يجب رصد درجات كافة المواد للفصلين الدراسيين أولاً لاحتساب النتيجة']
      };
    }

    let failingSubjectsCount = 0;
    let failedReligion = false;
    const failingDetails: string[] = [];
    const secondSessionSubjectNames: string[] = [];

    const parseVal = (raw: any) => {
      if (raw === undefined || raw === null || raw === '') return 0;
      const trimmed = typeof raw === 'string' ? raw.trim() : raw;
      const isAbsence = trimmed === 'غ' || (typeof trimmed === 'string' && trimmed.toLowerCase() === 'a');
      if (isAbsence) return 0;
      const num = parseFloat(typeof raw === 'string' ? raw.replace(',', '.') : raw);
      return isNaN(num) ? 0 : num;
    };

    const hasMercyStage = stage === 'primary' || stage === 'middle' || stage === 'prep' || stage === 'secondary';
    const mercyBoosts = ('id' in studentOrGrades && hasMercyStage)
      ? getPrimaryStudentMercyBoosts(studentOrGrades as StudentData, stage, customCols, defaultSubjectsOverrides, gradingSettings, selectedGrade)
      : {};

    const isMiddleOrSecStage = stage === 'middle' || stage === 'prep' || stage === 'secondary';
    const isMiddleHomeschool = isMiddleOrSecStage && Boolean(
      localStorage.getItem('current_system_type') === 'homeschool' ||
      (typeof window !== 'undefined' && localStorage.getItem(`${stage}_${selectedGrade}_homeschool_assessments_custom_cols`) !== null)
    );

    customCols.forEach(c => {
      const ovr = defaultSubjectsOverrides?.[c.key];
      const isReligion = c.key === 'religion' || (c.label && c.label.includes('دين'));
      const hasWritten = (ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : c.hasWrittenExam) !== false;

      // فى المرحلة الإعدادية منازل: حذف المواد التى ليس لها امتحان تحريرى من معادلات مواد الرسوب
      if (isMiddleHomeschool && !hasWritten) {
        return;
      }
      const maxAssess = c.maxAssessmentsGrade !== undefined ? c.maxAssessmentsGrade : (c.maxGrade !== undefined ? c.maxGrade : (isMax40 ? 40 : 70));
      const maxWritten = hasWritten ? (c.maxWrittenGrade !== undefined ? c.maxWrittenGrade : (isMax40 ? 60 : 30)) : 0;
      const subjectMax = maxAssess + maxWritten;
      const boost = mercyBoosts[c.key];

      const a1 = assess1 ? parseVal((assess1 as any)[c.key]) : 0;
      const a2 = assess2 ? parseVal((assess2 as any)[c.key]) : 0;
      const w1 = (written1 && hasWritten) ? parseVal((written1 as any)[c.key]) : 0;
      const w2 = (written2 && hasWritten) ? parseVal((written2 as any)[c.key]) : 0;

      const sem1Total = a1 + w1;
      const sem2Total = a2 + w2;
      const finalSubjectScore = boost ? ((sem1Total + sem2Total) / 2 + (boost.boostAmount / ((boost.actualPct ?? 0.5) * 2))) : (sem1Total + sem2Total) / 2;

      if (boost) {
        return;
      }

      if (stage === 'primary' || stage === 'middle' || stage === 'prep' || stage === 'secondary') {
        const isMiddleStage = stage === 'middle' || stage === 'prep';
        const actualPctMap: Record<string, number> = isMiddleStage
          ? {
              arabic: 0.4,
              english: 0.3,
              math: 0.3,
              science: 0.2,
              social_studies: 0.2,
              social: 0.2,
              religion: 0.2,
              art: 0.1,
              ict: 0.1,
              music: 0.1,
              pe: 0.1,
              activity1: 0.1,
              activity2: 0.1
            }
          : (isSecondary2Scientific || isSecondary2Literary)
          ? {
              arabic: 0.4,
              english: 0.3,
              math: 0.3,
              history: 0.3,
              chemistry: 0.3,
              physics: 0.3,
              geography: 0.3,
              psychology: 0.3,
              religion: 0.2,
              second_foreign_language: 0.2,
              pe: 0.125,
              national_education: 0.125,
              educational_vocational_activity: 0.1
            }
          : {};
        const ovr = defaultSubjectsOverrides?.[c.key];
        const customActualMax = (ovr as any)?.actualMaxGrade !== undefined ? (ovr as any).actualMaxGrade : (c as any).actualMaxGrade;
        const actualPct = customActualMax !== undefined && subjectMax > 0
          ? (customActualMax / (subjectMax * 2))
          : actualPctMap[c.key];
        const minTotalPass = ovr?.minTotalPassPercentage !== undefined ? ovr.minTotalPassPercentage : (c.minTotalPassPercentage !== undefined ? c.minTotalPassPercentage : (isReligion ? 70 : 50));
        if (hasWritten) {
          // المواد التي لها امتحان تحريري:
          // 1. حصول الطالب على 50% من مجموع درجات المادة (أو 70% للتربية الدينية من الدرجة المخصصة للمادة)
          const minSubjectPercent = minTotalPass;
          const subjectTotalPercent = subjectMax > 0 ? (finalSubjectScore / subjectMax) * 100 : 0;
          const passedSubjectTotal = subjectTotalPercent >= minSubjectPercent;

          // 2. مع حصوله على النسبة المئوية للدرجة الأدنى لنجاح الطالب فى الامتحان التحريرى للمادة فى الفصل الدراسي الثانى
          const rawMinWrittenPass = ovr?.minPassPercentage !== undefined ? ovr.minPassPercentage : c.minPassPercentage;
          const minWrittenPass = (rawMinWrittenPass === undefined || rawMinWrittenPass === 70 || rawMinWrittenPass === 10 || rawMinWrittenPass === 7.2)
            ? (stage === 'secondary' ? 25 : 30)
            : rawMinWrittenPass;
          const written2Percent = maxWritten > 0 ? (w2 / maxWritten) * 100 : 0;
          const passedWrittenExam = written2Percent >= minWrittenPass;

          if (!passedSubjectTotal || !passedWrittenExam) {
            failingSubjectsCount++;
            if (isReligion) failedReligion = true;
            secondSessionSubjectNames.push(c.label);

            const reasons: string[] = [];
            if (!passedSubjectTotal) {
              if ((isMiddleStage || isSecondary2Scientific || isSecondary2Literary) && actualPct !== undefined) {
                const actualScore = roundToOneDecimal((sem1Total + sem2Total) * actualPct);
                const actualMax = roundToOneDecimal((subjectMax * 2) * actualPct);
                reasons.push(`المجموع النهائي ${actualScore} من ${actualMax} بنسبة ${roundToOneDecimal(subjectTotalPercent)} % ( أقل من ${minSubjectPercent} % )`);
              } else {
                reasons.push(`المجموع النهائي ${roundToOneDecimal(finalSubjectScore)} من ${subjectMax} بنسبة ${roundToOneDecimal(subjectTotalPercent)} % ( أقل من ${minSubjectPercent} % )`);
              }
            }
            if (!passedWrittenExam) {
              reasons.push(`امتحان الفصل الثاني ${w2} من ${maxWritten} بنسبة ${roundToOneDecimal(written2Percent)} % ( أقل من ${minWrittenPass} % )`);
            }
            failingDetails.push(`مادة ${c.label} : ${reasons.join(' - ')}`);
          }
        } else {
          // المواد التي ليس لها امتحان تحريري:
          // حصول الطالب على 50% من درجات تقييمات المادة (أو 70% للتربية الدينية إن كانت بدون امتحان تحريري)
          const minAssessPercent = minTotalPass;
          const finalAssessScore = (a1 + a2) / 2;
          const assessPercent = maxAssess > 0 ? (finalAssessScore / maxAssess) * 100 : 0;

          if (assessPercent < minAssessPercent) {
            failingSubjectsCount++;
            if (isReligion) failedReligion = true;
            secondSessionSubjectNames.push(c.label);
            if ((isMiddleStage || isSecondary2Scientific || isSecondary2Literary || customActualMax !== undefined) && actualPct !== undefined) {
              const actualScore = roundToOneDecimal((a1 + a2) * actualPct);
              const actualMax = roundToOneDecimal((maxAssess * 2) * actualPct);
              failingDetails.push(`مادة ${c.label} : المجموع النهائي ${actualScore} من ${actualMax} بنسبة ${roundToOneDecimal(assessPercent)} % ( أقل من ${minAssessPercent} % )`);
            } else {
              failingDetails.push(`مادة ${c.label} : متوسط التقييمات ${roundToOneDecimal(finalAssessScore)} من ${maxAssess} بنسبة ${roundToOneDecimal(assessPercent)} % ( أقل من ${minAssessPercent} % )`);
            }
          }
        }
      } else {
        const percentage = subjectMax > 0 ? (finalSubjectScore / subjectMax) * 100 : 0;
        const minPass = c.minTotalPassPercentage !== undefined ? c.minTotalPassPercentage : (isReligion ? 70 : (c.minPassPercentage !== undefined ? c.minPassPercentage : 50));

        if (percentage < minPass) {
          if (isReligion) {
            failedReligion = true;
          }
          failingSubjectsCount++;
          secondSessionSubjectNames.push(c.label);
          failingDetails.push(`مادة ${c.label} : النسبة ${roundToOneDecimal(percentage)} % ( أقل من ${minPass} % )`);
        }
      }
    });

    const secondSessionSubjectsText = secondSessionSubjectNames.length > 0 ? secondSessionSubjectNames.join(' - ') : '-';

    if (stage === 'kindergarten') {
      if (failingSubjectsCount > 0) {
        return { 
          label: isFemale ? 'لها برنامج علاجى' : 'له برنامج علاجى', 
          bg: 'bg-transparent', 
          text: 'text-slate-900',
          notes: failingDetails.join('\n'),
          secondSessionSubjectsText: '-',
          secondSessionSubjectsCount: failingSubjectsCount,
          detailsLines: failingDetails
        };
      }
      return { 
        label: isFemale ? 'ناجحة' : ((t as any).pass || 'ناجح'), 
        bg: 'bg-transparent', 
        text: 'text-slate-900',
        notes: isFemale ? 'ناجحة حققت التقييمات المطلوبة بنجاح' : 'ناجح حقق التقييمات المطلوبة بنجاح',
        secondSessionSubjectsText: '-',
        secondSessionSubjectsCount: 0,
        detailsLines: []
      };
    }

    if (stage === 'primary') {
      // فى المرحلة الابتدائية: عدم تحقق الشرط فى مادة واحدة أو أكثر -> دور ثان
      if (failingSubjectsCount > 0) {
        return { 
          label: 'دور ثان', 
          bg: 'bg-[#ed7d31]', 
          text: 'text-white',
          notes: failingDetails.join('\n'),
          secondSessionSubjectsText,
          secondSessionSubjectsCount: secondSessionSubjectNames.length,
          detailsLines: failingDetails
        };
      }
      const fullNotes = isFemale 
        ? 'ناجحة حققت 50% فأكثر من مجموع درجات كل مادة واجتازت الحد الأدنى للامتحان التحريري وتقييمات الأنشطة بنجاح'
        : 'ناجح حقق 50% فأكثر من مجموع درجات كل مادة واجتاز الحد الأدنى للامتحان التحريري وتقييمات الأنشطة بنجاح';
      return { 
        label: isFemale ? 'ناجحة' : ((t as any).pass || 'ناجح'), 
        bg: 'bg-[#00b050]', 
        text: 'text-white',
        notes: fullNotes,
        secondSessionSubjectsText: '-',
        secondSessionSubjectsCount: 0,
        detailsLines: []
      };
    }

    if (failingSubjectsCount >= 3) {
      return { 
        label: isFemale ? 'راسبة' : 'راسب', 
        bg: 'bg-[#ff0000]', 
        text: 'text-white',
        notes: failingDetails.join('\n'),
        secondSessionSubjectsText: '-',
        secondSessionSubjectsCount: '-',
        detailsLines: failingDetails
      };
    }
    if (failingSubjectsCount > 0) {
      return { 
        label: 'دور ثان', 
        bg: 'bg-[#ed7d31]', 
        text: 'text-white',
        notes: failingDetails.join('\n'),
        secondSessionSubjectsText,
        secondSessionSubjectsCount: secondSessionSubjectNames.length,
        detailsLines: failingDetails
      };
    }
    return { 
      label: isFemale ? 'ناجحة' : ((t as any).pass || 'ناجح'), 
      bg: 'bg-[#00b050]', 
      text: 'text-white',
      notes: isFemale ? 'ناجحة لاجتيازها جميع المواد بنجاح' : 'ناجح لاجتيازه جميع المواد بنجاح',
      secondSessionSubjectsText: '-',
      secondSessionSubjectsCount: 0,
      detailsLines: []
    };
  };

  const showFinalResult = isKindergarten && !isFirstSemester;
  const isPrimary = stage === 'primary';
  const hasMercyStage = stage === 'primary' || stage === 'middle' || stage === 'prep' || stage === 'secondary';
  const showNotesCol = isPrimary && !isPrimary1To3 && !isFirstSemester;

  const finalResultLabel = isKindergarten ? 'نتيجة التلميذ' : ((t as any).finalResult || 'نتيجة الطالب');

  const cols = [
    ...addedCols,
    ...(showTotalAndEval ? [
      { key: 'total', label: isKindergarten ? 'المجموع - اعتبار' : (t as any).total, isReadonly: true, max: displayTotalMax, isAddedToTotal: false },
      { key: 'percentage', label: isKindergarten ? 'النسبة المئوية - اعتبارا' : ((t as any).percentage || 'النسبة المئوية %'), isReadonly: true, isAddedToTotal: false },
      { key: 'evaluation', label: isKindergarten ? 'التقييم' : (t as any).evaluation, isReadonly: true, isAddedToTotal: false },
      { key: 'procedure', label: (t as any).procedure || 'الإجراء', isReadonly: true, isAddedToTotal: false }
    ] : []),
    ...notAddedCols,
    ...(showFinalResult ? [
      { key: 'finalResult', label: finalResultLabel, isReadonly: true, isAddedToTotal: false },
      { key: 'studentRank', label: isKindergarten ? 'ترتيب التلميذ' : 'ترتيب الطالب', isReadonly: true, isAddedToTotal: false }
    ] : []),
    ...(showNotesCol && showFinalResult ? [
      { key: 'notesCount', label: isKindergarten ? 'عدد مواد برامج علاجية' : 'عدد مواد الدور الثانى', isReadonly: true, isAddedToTotal: false },
      { key: 'notes', label: isKindergarten ? 'مواد برامج علاجية' : 'مواد الدور الثانى', isReadonly: true, isAddedToTotal: false }
    ] : [])
  ];

  const deletableCols = [
    ...customCols.filter(c => {
      if (c.key === 'arabic' || c.key === 'english') return false;
      if (isMiddleHomeschool) {
        const override = defaultSubjectsOverrides?.[c.key];
        const hasExam = override?.hasWrittenExam !== undefined ? override.hasWrittenExam : (c.hasWrittenExam !== undefined ? c.hasWrittenExam : true);
        if (hasExam === false) return false;
      }
      return true;
    }).map(c => ({ key: c.key, label: c.label }))
  ];

  const editableCols = isMiddleHomeschool
    ? customCols.filter(c => {
        const override = defaultSubjectsOverrides?.[c.key];
        const hasExam = override?.hasWrittenExam !== undefined ? override.hasWrittenExam : (c.hasWrittenExam !== undefined ? c.hasWrittenExam : true);
        return hasExam !== false;
      })
    : customCols;

  const getSubjectColWidth = (col: { key: string; label: string }) => {
    if (col.key === 'total') {
      return !isKindergarten ? 275 : 210;
    }
    if (col.key === 'percentage') {
      return isKindergarten ? 230 : 200;
    }
    if (col.key === 'evaluation' || col.key === 'procedure' || col.key === 'finalResult') {
      return 200;
    }
    if (col.key === 'studentRank') {
      return 150;
    }
    if (col.key === 'notes') {
      return 260;
    }
    if (col.key === 'notesCount') {
      return 150;
    }
    const charCount = col.label ? col.label.length : 0;
    if (charCount > 14) {
      return Math.max(200, Math.ceil(charCount * 12 + 30));
    }
    return 200;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colKey: string) => {
    const editableCols = cols.filter(c => !(c as any).isReadonly).map(c => c.key);
    const currentEditableIndex = editableCols.indexOf(colKey);

    let nextRow = rowIndex;
    let nextEditableIndex = currentEditableIndex;

    switch (e.key) {
      case 'Tab':
        if (e.shiftKey) {
          if (currentEditableIndex > 0) {
            nextEditableIndex = currentEditableIndex - 1;
          } else if (rowIndex > 0) {
            nextRow = rowIndex - 1;
            nextEditableIndex = editableCols.length - 1;
          }
        } else {
          if (currentEditableIndex < editableCols.length - 1) {
            nextEditableIndex = currentEditableIndex + 1;
          } else if (rowIndex < filteredData.length - 1) {
            nextRow = rowIndex + 1;
            nextEditableIndex = 0;
          }
        }
        break;
      case 'Enter':
      case 'ArrowDown':
        nextRow = Math.min(filteredData.length - 1, rowIndex + 1);
        break;
      case 'ArrowUp':
        nextRow = Math.max(0, rowIndex - 1);
        break;
      case 'ArrowRight':
        nextEditableIndex = lang === 'ar' 
          ? Math.max(0, currentEditableIndex - 1)
          : Math.min(editableCols.length - 1, currentEditableIndex + 1);
        break;
      case 'ArrowLeft':
        nextEditableIndex = lang === 'ar'
          ? Math.min(editableCols.length - 1, currentEditableIndex + 1)
          : Math.max(0, currentEditableIndex - 1);
        break;
      default:
        return;
    }

    if (nextRow !== rowIndex || nextEditableIndex !== currentEditableIndex) {
      e.preventDefault();
      const nextColKey = editableCols[nextEditableIndex];
      const nextInput = document.getElementById(`grade-cell-${nextRow}-${nextColKey}`) as HTMLInputElement;
      if (nextInput) {
        try {
          nextInput.focus({ preventScroll: true });
        } catch {
          nextInput.focus();
        }
        try {
          nextInput.select();
        } catch {}
        ensureCellVisible(nextInput);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      className="w-[96%] sm:w-[95vw] max-w-[95vw] mx-auto relative rounded-2xl shadow-2xl p-[6px] bg-[linear-gradient(90deg,#000000_25%,#ffffff_50%,#000000_75%)] bg-[length:200%_auto] animate-shine"
      style={{ animationDuration: '15s' }}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="bg-[#f8ebff] rounded-[10px] w-full h-full p-6 flex flex-col gap-4 relative overflow-hidden">
        {/* Header Row */}
        <div className="flex flex-row justify-between items-center bg-[linear-gradient(to_right,#0d9488,#14b8a6,#5eead4,#14b8a6,#0d9488)] bg-[length:200%_auto] animate-shine border-2 border-slate-900 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-md gap-2 sm:gap-4 relative overflow-hidden w-full flex-nowrap">
          <div className="text-black/60 font-black text-xs sm:text-sm md:text-base lg:text-lg text-right truncate min-w-0 whitespace-nowrap flex-1">
            <span style={(stage === 'secondary' || title.includes('المرحلة الثانوية')) ? { fontSize: '85%' } : undefined} className="inline-block truncate max-w-full align-middle">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <motion.div
              animate={{
                rotate: [-1.5, 1.5, -1.5],
                y: [-1, 1, -1]
              }}
              transition={{
                repeat: Infinity,
                duration: 3.5,
                ease: "easeInOut"
              }}
              className="text-black/60 font-black text-xs sm:text-sm md:text-base lg:text-lg flex items-center gap-1.5 sm:gap-2 whitespace-nowrap origin-center"
            >
              <span>{lang === 'ar' ? 'تحرير إجمالى التقييمات لكل مادة دراسية' : 'Edit Total Assessments per Subject'}</span>
            </motion.div>

            {onNavigateToDetailedAssessments && (
              <div className="relative p-[2px] rounded-xl overflow-hidden shrink-0 shadow-sm">
                <div className="absolute inset-[-150%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />
                <button
                  type="button"
                  onClick={handleNavigateToDetailed}
                  className="relative z-10 bg-white/95 hover:bg-white text-black font-black text-xs sm:text-sm md:text-base px-3 sm:px-5 py-1.5 sm:py-2 min-h-[38px] sm:min-h-[42px] rounded-[10px] transition-all flex items-center justify-center active:scale-95 shadow-sm whitespace-nowrap"
                  title="التقييمات تفصيلاً"
                >
                  <span>التقييمات تفصيلاً</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search & Action Row */}
        <div className="flex flex-row justify-between items-center bg-white border-2 border-slate-900 rounded-xl p-2 sm:p-3 shadow-sm gap-2 sm:gap-4 flex-nowrap w-full">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 max-w-xl">
            <button
              onClick={onBack}
              title={lang === 'ar' ? 'عودة' : 'Back'}
              className="shrink-0 border-2 border-slate-900 text-white rounded-lg p-2 sm:px-3 sm:py-2 flex items-center justify-center transition-opacity hover:opacity-80 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-[length:200%_auto] animate-shine shadow-sm"
            >
              {lang === 'ar' ? <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" /> : <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <div className="relative flex-1 min-w-0 group/search">
              <div className="absolute inset-y-0 right-2.5 sm:right-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder={isKindergarten ? (lang === 'ar' ? 'بحث بإسم التلميذ' : 'Search by student name') : t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-w-0 bg-white border-2 border-slate-900 rounded-lg pr-8 sm:pr-10 pl-8 sm:pl-10 py-1.5 sm:py-2.5 text-xs sm:text-sm md:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium truncate"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSearchTerm('')}
                title="حذف النص"
                className={`absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-200 hover:bg-rose-500 text-slate-700 hover:text-white flex items-center justify-center transition-all ${
                  searchTerm
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none group-focus-within/search:opacity-100 group-focus-within/search:pointer-events-auto'
                }`}
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>
       
          <div className="flex flex-row items-center gap-1.5 sm:gap-2 shrink-0 relative justify-end flex-nowrap">
            {/* <SortButtonMenu
              sortBy={sortBy}
              onSortChange={onSortChange || (() => {})}
              lang={lang}
              isKindergarten={isKindergarten}
              showExamFields={!isKindergarten}
            /> */}
            <div className="relative shrink-0">
              
              <button
                type="button"
                onClick={() => setIsActionMenuOpen(true)}
                className="bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine text-slate-900 p-2 sm:p-2.5 rounded-[12px] border-2 border-slate-900 hover:bg-slate-100 transition-colors shadow-sm shrink-0 flex items-center justify-center"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5 mix-blend-difference text-white" />
              </button>
              <PortalModal><AnimatePresence>
                {isActionMenuOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                      onClick={() => setIsActionMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, rotateX: 90 }}
                      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                      exit={{ opacity: 0, scale: 0.9, rotateX: -90 }}
                      className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-[480px]"
                    >
                      <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-8px', animationDuration: '15s' }}></div>
                      <div className="bg-white rounded-[22px] p-6 flex flex-col gap-3 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        
                        <ActionMenuButton
                          onClick={() => {
                            setIsActionMenuOpen(false);
                            setNewFieldName('');
                            setNewFieldNameEn('');
                            if (isKindergarten) {
                              setNewFieldMaxGrade('100');
                              setNewFieldKgDomain(KG_LEARNING_DOMAINS[0]);
                            } else {
                              setNewFieldMaxAssessmentsGrade(getDefaultAssessmentsGrade(stage));
                              setNewFieldMaxWrittenGrade(getDefaultWrittenGrade(stage));
                            }
                            setIsAddFieldModalOpen(true);
                          }}
                          icon={<Plus className="w-4 h-4" />}
                          text={(t as any).addNewField || 'إضافة مادة دراسية'}
                          bgGradient="bg-[linear-gradient(to_right,#0ea5e9,#3b82f6,#0ea5e9)]"
                        />

                        <ActionMenuButton
                          onClick={() => { setIsActionMenuOpen(false); setIsSelectEditFieldModalOpen(true); }}
                          icon={<Edit className="w-4 h-4" />}
                          text={(t as any).editSubject || 'تعديل إعدادات مادة دراسية'}
                          bgGradient="bg-[linear-gradient(to_right,#eab308,#f59e0b,#eab308)]"
                        />

                        <ActionMenuButton
                          onClick={() => { setIsActionMenuOpen(false); setIsDeleteFieldModalOpen(true); }}
                          icon={<Trash2 className="w-4 h-4" />}
                          text={(t as any).deleteSubject || 'حذف مادة دراسية'}
                          bgGradient="bg-[linear-gradient(to_right,#f97316,#ef4444,#f97316)]"
                        />



                        {/* زر تحرير بيانات الفصل الدراسي الحالي - موضوع فوق زر التقييمات تفصيلاً */}
                        {isFirstSemester ? (
                          <ActionMenuButton
                            onClick={() => {
                              setIsActionMenuOpen(false);
                              onChange(localData);
                              if (onNavigateToSection) onNavigateToSection(4, 'first');
                              else onEditData('first');
                            }}
                            icon={<Edit className="w-4 h-4" />}
                            text={(t as any).editFirstSemesterData || 'تحرير بيانات الفصل الدراسي الأول'}
                            bgGradient="bg-[linear-gradient(to_right,#8b5cf6,#a855f7,#8b5cf6)]"
                          />
                        ) : (
                          <ActionMenuButton
                            onClick={() => {
                              setIsActionMenuOpen(false);
                              onChange(localData);
                              if (onNavigateToSection) onNavigateToSection(4, 'second');
                              else onEditData('second');
                            }}
                            icon={<Edit className="w-4 h-4" />}
                            text={(t as any).editSecondSemesterData || 'تحرير بيانات الفصل الدراسي الثانى'}
                            bgGradient="bg-[linear-gradient(to_right,#d946ef,#ec4899,#d946ef)]"
                          />
                        )}

                        {/* التقييمات تفصيلاً وتحرير درجات الامتحان التحريري */}
                        {(() => {
                          const isOfficialMode = !isTrialMode;
                          const hasAnyStudent = Boolean(localData && localData.length > 0 && localData.some(s => s && s.name && s.name.trim().length > 0));
                          const isOfficialNoStudents = isOfficialMode && !hasAnyStudent;
                          return (
                            <>
                              {/* التقييمات تفصيلاً في القائمة الجانبية */}
                              {onNavigateToDetailedAssessments && (
                                <ActionMenuButton
                                  onClick={() => {
                                    if (isOfficialNoStudents) return;
                                    setIsActionMenuOpen(false);
                                    handleNavigateToDetailed();
                                  }}
                                  disabled={isOfficialNoStudents}
                                  icon={<PenTool className="w-4 h-4" />}
                                  text="التقييمات تفصيلاً"
                                  bgGradient="bg-[linear-gradient(to_right,#0d9488,#10b981,#0d9488)]"
                                />
                              )}

                              {/* تحرير درجات الامتحان التحريري الخاص بالفصل الدراسي الحالي */}
                              {isFirstSemester ? (
                                <>
                                  {!isKindergarten && (
                                    <ActionMenuButton
                                      onClick={() => {
                                        if (isOfficialNoStudents) return;
                                        setIsActionMenuOpen(false);
                                        onChange(localData);
                                        if (onNavigateToSection) onNavigateToSection(7, 'first');
                                        else if (onEditWrittenExams) onEditWrittenExams('first');
                                      }}
                                      disabled={isOfficialNoStudents}
                                      icon={<PenTool className="w-4 h-4" />}
                                      text={(t as any).editFirstSemesterWrittenExams || 'تحرير درجات الإمتحانات التحريرية - الفصل الدراسي الأول'}
                                      bgGradient="bg-[linear-gradient(to_right,#2563eb,#3b82f6,#2563eb)]"
                                    />
                                  )}
                                </>
                              ) : (
                                <>
                                  {!isKindergarten && (
                                    <ActionMenuButton
                                      onClick={() => {
                                        if (isOfficialNoStudents) return;
                                        setIsActionMenuOpen(false);
                                        onChange(localData);
                                        if (onNavigateToSection) onNavigateToSection(7, 'second');
                                        else if (onEditWrittenExams) onEditWrittenExams('second');
                                      }}
                                      disabled={isOfficialNoStudents}
                                      icon={<PenTool className="w-4 h-4" />}
                                      text={(t as any).editSecondSemesterWrittenExams || 'تحرير درجات الإمتحانات التحريرية - الفصل الدراسي الثانى'}
                                      bgGradient="bg-[linear-gradient(to_right,#4f46e5,#6366f1,#4f46e5)]"
                                    />
                                  )}
                                </>
                              )}
                            </>
                          );
                        })()}

                        {!isKindergarten && (
                          <ActionMenuButton
                            onClick={() => { setIsActionMenuOpen(false); setIsGradingSettingsModalOpen(true); }}
                            icon={<Sliders className="w-4 h-4" />}
                            text={hasMercyStage && !isFirstSemester ? 'إعدادات الرصد والتحرير والرأفة' : ((t as any).gradingSettings || 'اعدادات الرصد والتحرير')}
                            bgGradient="bg-[linear-gradient(to_right,#059669,#10b981,#059669)]"
                          />
                        )}
                      
                        <div className="relative mt-2 pt-4 flex justify-center w-full shrink-0">
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-200 overflow-hidden rounded-full">
                            <div className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine" style={{ animationDuration: '3s' }}></div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsActionMenuOpen(false)}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg border border-slate-900/40 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                          >
                            <X className="w-8 h-8" strokeWidth={2.5} />
                          </button>
                        </div>
</div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence></PortalModal>
            </div>
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsPrintMenuOpen(true)}
                className="flex items-center justify-center bg-[linear-gradient(to_right,#34d399,#10b981,#059669,#10b981,#34d399)] bg-[length:200%_auto] animate-shine text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all hover:opacity-90 active:scale-[0.98] border-2 border-slate-900 shadow-sm shrink-0"
                title={(t as any).printLabel || (lang === 'ar' ? 'طباعة' : 'Print')}
              >
                <Printer className="w-full h-full p-1.5 drop-shadow-sm" />
              </button>
              <PortalModal><AnimatePresence>
                {isPrintMenuOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                      onClick={() => setIsPrintMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, rotateX: 90 }}
                      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                      exit={{ opacity: 0, scale: 0.9, rotateX: -90 }}
                      className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-[460px]"
                    >
                      <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-8px', animationDuration: '15s' }}></div>
                      <div className="bg-white rounded-[22px] p-6 flex flex-col gap-3 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        <RowThemeSelector />
                        <ActionMenuButton
                          onClick={() => handlePrintOption('students_data')}
                          icon={<Printer className="w-4 h-4" />}
                          text={isKindergarten ? "بيانات جميع التلاميذ" : "بيانات جميع الطلاب"}
                          bgGradient="bg-[linear-gradient(to_right,#3b82f6,#8b5cf6,#3b82f6)]"
                        />
                        {isKindergarten && (
                          <>
                            <ActionMenuButton
                              onClick={() => handlePrintOption('kg_student_evaluations_report')}
                              icon={<Printer className="w-4 h-4" />}
                              text="تقرير تقييمات التلميذ"
                              bgGradient="bg-[linear-gradient(to_right,#0284c7,#0d9488,#10b981)]"
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('kg_parent_notice')}
                              icon={<Printer className="w-4 h-4" />}
                              text="إخطار ولى الأمر"
                              bgGradient="bg-[linear-gradient(to_right,#f59e0b,#ea580c,#d97706)]"
                            />
                          </>
                        )}
                        {!isKindergarten && (
                          <>
                            <ActionMenuButton
                              onClick={() => handlePrintOption('calling_list')}
                              icon={<Printer className="w-4 h-4" />}
                              text="تقارير المناداة"
                              bgGradient="bg-[linear-gradient(to_right,#10b981,#059669,#10b981)]"
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('seat_numbers')}
                              icon={<Printer className="w-4 h-4" />}
                              text="أرقام الجلوس"
                              bgGradient="bg-[linear-gradient(to_right,#f59e0b,#d97706,#f59e0b)]"
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('seat_numbers_english')}
                              icon={<Printer className="w-4 h-4" />}
                              text="Seat Numbers in English"
                              bgGradient="bg-[linear-gradient(to_right,#d97706,#b45309,#d97706)]"
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('secret_numbers')}
                              icon={<Printer className="w-4 h-4" />}
                              text="الأرقام السرية"
                              bgGradient="bg-[linear-gradient(to_right,#d946ef,#f43f5e,#d946ef)]"
                            />
                          </>
                        )}
                        {isFirstSemester ? (
                          <>
                            <ActionMenuButton
                              onClick={() => handlePrintOption('passed_first_semester')}
                              icon={<Printer className="w-4 h-4" />}
                              text="الناجحون - اعتبارا - فى الفصل الدراسي الأول"
                              bgGradient="bg-[linear-gradient(to_right,#059669,#14b8a6,#059669)]"
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('failed_first_semester')}
                              icon={<Printer className="w-4 h-4" />}
                              text={isKindergarten ? "لهم برامج علاجية - فى الفصل الدراسي الأول" : "الراسبون - اعتبارا - فى الفصل الدراسي الأول"}
                              bgGradient="bg-[linear-gradient(to_right,#ea580c,#dc2626,#ea580c)]"
                            />
                          </>
                        ) : (
                          <>
                            <ActionMenuButton
                              onClick={() => handlePrintOption('passed_second_semester')}
                              icon={<Printer className="w-4 h-4" />}
                              text="الناجحون فى الفصل الدراسي الثانى"
                              bgGradient="bg-[linear-gradient(to_right,#0284c7,#2563eb,#0284c7)]"
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('failed_second_semester')}
                              icon={<Printer className="w-4 h-4" />}
                              text={isKindergarten ? "لهم برامج علاجية - فى الفصل الدراسي الثانى" : "الراسبون فى الفصل الدراسي الثانى"}
                              bgGradient="bg-[linear-gradient(to_right,#dc2626,#991b1b,#dc2626)]"
                            />
                            {stage !== 'kindergarten' && (
                              <ActionMenuButton
                                onClick={() => handlePrintOption('second_round_students')}
                                icon={<Printer className="w-4 h-4" />}
                                text="طلاب الدور الثانى"
                                bgGradient="bg-[linear-gradient(to_right,#7c3aed,#4f46e5,#7c3aed)]"
                              />
                            )}
                          </>
                        )}
                        <ActionMenuButton
                          onClick={() => handlePrintOption('top_ten_students')}
                          icon={<Printer className="w-4 h-4" />}
                          text="العشرة الأوائل - TOP 10"
                          bgGradient="bg-[linear-gradient(to_right,#ca8a04,#eab308,#ca8a04)]"
                        />
                        <ActionMenuButton
                          onClick={() => handlePrintOption('top_ten_damg_students')}
                          icon={<Printer className="w-4 h-4" />}
                          text="العشرة الأوائل - TOP 10 - دمج"
                          bgGradient="bg-[linear-gradient(to_right,#d97706,#f59e0b,#d97706)]"
                        />
                        <ActionMenuButton
                          onClick={() => {
                            setIsPrintMenuOpen(false);
                            if (isOfficial && !isCertificatesUnlocked()) {
                              setShowCertificatesPasswordModal(true);
                            } else {
                              setIsCertSelectionModalOpen(true);
                            }
                          }}
                          icon={<Award className="w-4 h-4" />}
                          text="شهادات التقدير"
                          bgGradient="bg-[linear-gradient(to_right,#ca8a04,#f59e0b,#3b82f6)]"
                        />
                        <ActionMenuButton
                          onClick={() => {
                            setIsPrintMenuOpen(false);
                            setIsSubjectPrintMenuOpen(true);
                          }}
                          icon={<Printer className="w-4 h-4" />}
                          text="تقارير مادة دراسية"
                          bgGradient="bg-[linear-gradient(to_right,#2563eb,#7c3aed,#2563eb)]"
                        />
                        {!isKindergarten && (
                          <ActionMenuButton
                            onClick={() => handlePrintOption('mercy_grades_students')}
                            icon={<Printer className="w-4 h-4" />}
                            text="طلاب يستحقون درجات الرأفة"
                            bgGradient="bg-[linear-gradient(to_right,#0d9488,#10b981,#0d9488)]"
                          />
                        )}
                        <ActionMenuButton
                          onClick={() => handlePrintOption('statistics_and_charts')}
                          icon={<PieChart className="w-4 h-4" />}
                          text="الإحصائيات الختامية والرسوم البيانية"
                          bgGradient="bg-[linear-gradient(to_right,#db2777,#9333ea,#db2777)]"
                        />
                        <ActionMenuButton
                          onClick={() => handlePrintOption('control_sheet')}
                          icon={<Printer className="w-4 h-4" />}
                          text={semester === 'first' ? 'شيت كنترول الفصل الدراسي الأول' : 'شيت كنترول الفصل الدراسي الثانى'}
                          bgGradient="bg-[linear-gradient(to_right,#0284c7,#0d9488,#0284c7)]"
                        />
                        <ActionMenuButton
                          onClick={() => {
                            setIsPrintMenuOpen(false);
                            if (isOfficial && !isBlankSheetUnlocked()) {
                              setShowBlankSheetPasswordModal(true);
                            } else {
                              handlePrintOption('blank_control_sheet');
                            }
                          }}
                          disabled={!isOfficial}
                          title={!isOfficial ? (lang === 'ar' ? 'متاح فقط في النسخة الرسمية' : 'Available only in official version') : undefined}
                          icon={<Printer className="w-4 h-4" />}
                          text="شيت كنترول فارغ للرصد والتحرير اليدوى"
                          bgGradient={isOfficial ? "bg-[linear-gradient(to_right,#0284c7,#0d9488,#0284c7)]" : "bg-[linear-gradient(to_right,#475569,#1e293b,#475569)]"}
                        />
                        <ActionMenuButton
                          onClick={() => {
                            setIsPrintMenuOpen(false);
                            if (isOfficial && !isCustomSheetUnlocked()) {
                              setShowCustomSheetPasswordModal(true);
                            } else {
                              setIsCustomControlSheetModalOpen(true);
                            }
                          }}
                          disabled={!isOfficial}
                          title={!isOfficial ? (lang === 'ar' ? 'متاح فقط في النسخة الرسمية' : 'Available only in official version') : undefined}
                          icon={<Sliders className="w-4 h-4" />}
                          text="تخصيص شيت كنترول"
                          bgGradient="bg-[linear-gradient(to_right,#059669,#0284c7,#059669)]"
                        />
                        {!isKindergarten && (
                          <>
                            <ActionMenuButton
                              onClick={() => handlePrintOption('student_semester_grades_certificate')}
                              icon={<Printer className="w-4 h-4" />}
                              text={isFirstSemester ? "شهادة درجات الطالب فى الفصل الدراسي الأول" : "شهادة درجات الطالب فى الفصل الدراسي الثانى"}
                              bgGradient="bg-[linear-gradient(to_right,#0284c7,#0d9488,#10b981)]"
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('student_semester_grades_certificate_en')}
                              icon={<Printer className="w-4 h-4" />}
                              text={
                                lang === 'ar'
                                  ? (isFirstSemester ? "شهادة درجات وتقييمات الفصل الدراسي الأول باللغة الإنجليزية" : "شهادة درجات وتقييمات الفصل الدراسي الثانى باللغة الإنجليزية")
                                  : (isFirstSemester ? "First Semester Grades & Assessments Certificate (English)" : "Second Semester Grades & Assessments Certificate (English)")
                              }
                              bgGradient="bg-[linear-gradient(to_right,#4f46e5,#7c3aed,#9333ea)]"
                            />
                          </>
                        )}

                        <div className="relative mt-2 pt-4 flex justify-center w-full shrink-0">
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-200 overflow-hidden rounded-full">
                            <div className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine" style={{ animationDuration: '3s' }}></div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsPrintMenuOpen(false)}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg border border-slate-900/40 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                            title="خروج"
                          >
                            <X className="w-8 h-8" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence></PortalModal>
              <PortalModal><AnimatePresence>
                {isSubjectPrintMenuOpen && (
                  <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                      onClick={() => setIsSubjectPrintMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, rotateX: 90 }}
                      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                      exit={{ opacity: 0, scale: 0.9, rotateX: -90 }}
                      className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-[460px]"
                    >
                      <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-8px', animationDuration: '15s' }}></div>
                      <div className="bg-white rounded-[22px] p-6 flex flex-col gap-3 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        {(() => {
                          const subjGradients = [
                            'bg-[linear-gradient(to_right,#2563eb,#4f46e5,#2563eb)]',
                            'bg-[linear-gradient(to_right,#059669,#10b981,#059669)]',
                            'bg-[linear-gradient(to_right,#d97706,#f59e0b,#d97706)]',
                            'bg-[linear-gradient(to_right,#7c3aed,#9333ea,#7c3aed)]',
                            'bg-[linear-gradient(to_right,#0284c7,#06b6d4,#0284c7)]',
                            'bg-[linear-gradient(to_right,#db2777,#f43f5e,#db2777)]',
                            'bg-[linear-gradient(to_right,#0d9488,#14b8a6,#0d9488)]',
                          ];
                          return editableCols.map((sc, sIdx) => {
                            const sLabel = defaultSubjectsOverrides?.[sc.key]?.label || sc.label;
                            return (
                              <ActionMenuButton
                                key={sc.key}
                                onClick={() => {
                                  setIsSubjectPrintMenuOpen(false);
                                  setSelectedPrintSubject({ key: sc.key, label: sLabel });
                                }}
                                icon={<Printer className="w-4 h-4" />}
                                text={sLabel}
                                bgGradient={subjGradients[sIdx % subjGradients.length]}
                              />
                            );
                          });
                        })()}
                        <div className="relative mt-2 pt-4 flex justify-center w-full shrink-0">
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-200 overflow-hidden rounded-full">
                            <div className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine" style={{ animationDuration: '3s' }}></div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsSubjectPrintMenuOpen(false)}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg border border-slate-900/40 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                            title="خروج"
                          >
                            <X className="w-8 h-8" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence></PortalModal>
              <PortalModal><AnimatePresence>
                {selectedPrintSubject && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                      onClick={() => setSelectedPrintSubject(null)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, rotateX: 90 }}
                      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                      exit={{ opacity: 0, scale: 0.9, rotateX: -90 }}
                      className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-[460px]"
                    >
                      <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-8px', animationDuration: '15s' }}></div>
                      <div className="bg-white rounded-[22px] p-6 flex flex-col gap-3 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        {isFirstSemester ? (
                          <>
                            <ActionMenuButton
                              onClick={async () => {
                                const sub = selectedPrintSubject;
                                setSelectedPrintSubject(null);
                                await executePrintOption('subject_passed_first_semester', sub);
                              }}
                              icon={<Printer className="w-4 h-4" />}
                              text="الناجحون - اعتبارا - فى الفصل الدراسي الأول"
                              bgGradient="bg-[linear-gradient(to_right,#059669,#14b8a6,#059669)]"
                            />
                            <ActionMenuButton
                              onClick={async () => {
                                const sub = selectedPrintSubject;
                                setSelectedPrintSubject(null);
                                await executePrintOption('subject_failed_first_semester', sub);
                              }}
                              icon={<Printer className="w-4 h-4" />}
                              text={isKindergarten ? "لهم برامج علاجية - فى الفصل الدراسي الأول" : "الراسبون - اعتبارا - فى الفصل الدراسي الأول"}
                              bgGradient="bg-[linear-gradient(to_right,#ea580c,#dc2626,#ea580c)]"
                            />
                          </>
                        ) : (
                          <>
                            <ActionMenuButton
                              onClick={async () => {
                                const sub = selectedPrintSubject;
                                setSelectedPrintSubject(null);
                                await executePrintOption('subject_passed_second_semester', sub);
                              }}
                              icon={<Printer className="w-4 h-4" />}
                              text="الناجحون فى الفصل الدراسي الثانى"
                              bgGradient="bg-[linear-gradient(to_right,#0284c7,#2563eb,#0284c7)]"
                            />
                            <ActionMenuButton
                              onClick={async () => {
                                const sub = selectedPrintSubject;
                                setSelectedPrintSubject(null);
                                await executePrintOption('subject_failed_second_semester', sub);
                              }}
                              icon={<Printer className="w-4 h-4" />}
                              text={isKindergarten ? "لهم برامج علاجية - فى الفصل الدراسي الثانى" : "الراسبون فى الفصل الدراسي الثانى"}
                              bgGradient="bg-[linear-gradient(to_right,#dc2626,#991b1b,#dc2626)]"
                            />
                            {!isKindergarten && (
                              <ActionMenuButton
                                onClick={async () => {
                                  const sub = selectedPrintSubject;
                                  setSelectedPrintSubject(null);
                                  await executePrintOption('subject_second_round', sub);
                                }}
                                icon={<Printer className="w-4 h-4" />}
                                text="لهم دور ثان"
                                bgGradient="bg-[linear-gradient(to_right,#7c3aed,#4f46e5,#7c3aed)]"
                              />
                            )}
                          </>
                        )}
                        <div className="relative mt-2 pt-4 flex justify-center w-full shrink-0">
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-200 overflow-hidden rounded-full">
                            <div className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine" style={{ animationDuration: '3s' }}></div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedPrintSubject(null)}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg border border-slate-900/40 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                            title="خروج"
                          >
                            <X className="w-8 h-8" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence></PortalModal>
            </div>

            <button
              type="button"
              onClick={() => setIsColorModalOpen(true)}
              className="flex items-center justify-center bg-[linear-gradient(to_right,#ec4899,#8b5cf6,#3b82f6,#10b981,#f59e0b,#ec4899)] bg-[length:200%_auto] animate-shine text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all active:scale-[0.98] border border-slate-900 shadow-sm shrink-0"
              title="ألوان جداول التحرير والرصد"
            >
              <Palette className="w-full h-full p-1.5 sm:p-2" />
            </button>

            <button
              type="button"
              onClick={() => setShowInstructions(true)}
              className="flex items-center justify-center bg-[linear-gradient(to_right,#fef08a,#facc15,#eab308,#facc15,#fef08a)] bg-[length:200%_auto] animate-shine text-yellow-950 w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all active:scale-[0.98] border border-slate-900 shadow-sm shrink-0"
              title={(t as any).instructionsLabel || (lang === 'ar' ? 'تعليمات' : 'Instructions')}
            >
              <Info className="w-full h-full p-1" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div 
          className="p-[2px] rounded-xl bg-[linear-gradient(90deg,#000000_30%,#ffffff_50%,#000000_70%)] bg-[length:200%_auto] animate-shine shadow-sm w-full relative"
          style={{ animationDuration: '15s' }}
        >
          
        <style>{`
          .sticky-cell-border {
            box-shadow: inset 1px 0 0 0 #0f172a, inset -1px 0 0 0 #0f172a !important;
          }
          .separator-line {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 1px;
            background-color: #0f172a !important;
            pointer-events: none;
            z-index: 60;
            inset-inline-end: 0;
          }
          [dir="rtl"] .separator-line, html[dir="rtl"] .separator-line {
            left: 0;
            right: auto;
          }
          [dir="ltr"] .separator-line, html[dir="ltr"] .separator-line {
            right: 0;
            left: auto;
          }
          @media (max-width: 1279px), (pointer: coarse) and (max-width: 1366px) {
            th.sticky-col {
              position: static !important;
              inset-inline-start: auto !important;
              left: auto !important;
              right: auto !important;
              box-shadow: none !important;
              z-index: auto !important;
            }
            td.sticky-col {
              position: relative !important;
              inset-inline-start: auto !important;
              left: auto !important;
              right: auto !important;
              box-shadow: none !important;
              z-index: 1 !important;
            }
            .sticky-col .separator-line {
              display: none !important;
            }
            .sticky-col.sticky-cell-border {
              box-shadow: none !important;
            }
          }
        `}</style>
          <div className="overflow-auto w-full max-h-[65vh] bg-white rounded-[10px]">
            {(() => {
              const showName = isKindergarten ? true : gradingSettings.showName;
              const showSeatNumber = !isKindergarten && gradingSettings.showSeatNumber;
              const showSecretNumber = !isKindergarten && gradingSettings.showSecretNumber;
              const lastStickyCol = showSecretNumber ? 'secret' : (showSeatNumber ? 'seat' : (showName ? 'name' : 'serial'));

              const nameOffset = 64;
              const seatOffset = 64 + (showName ? 400 : 0);
              const secretOffset = seatOffset + (showSeatNumber ? 150 : 0);

              return (
                <table className="w-full text-center text-slate-900 border-collapse min-w-[1500px]">
                  <thead className="sticky top-0 z-[60] shadow-[0_2px_10px_rgba(0,0,0,0.15)] bg-white">
                    <tr className="bg-[linear-gradient(to_right,rgba(251,113,133,0.7),#c0c0c0,rgba(34,211,238,0.7),#c0c0c0,rgba(251,191,36,0.7),#c0c0c0,rgba(251,113,133,0.7))] bg-[length:200%_auto] animate-shine text-slate-900 text-2xl font-extrabold whitespace-nowrap border-b border-slate-900">
                      <th 
                        rowSpan={2} 
                        className={`py-[18px] px-3 border-2 border-slate-900 bg-slate-200 sticky start-0 z-50 min-w-[64px] max-w-[64px] w-[64px] text-lg font-bold relative overflow-visible sticky-cell-border sticky-col ${lastStickyCol === 'serial' ? 'shadow-[-6px_0_12px_rgba(0,0,0,0.15)] rtl:shadow-[-6px_0_12px_rgba(0,0,0,0.15)] ltr:shadow-[6px_0_12px_rgba(0,0,0,0.15)]' : ''}`}
                      >
                        {t.serial}
                        <div className="separator-line"></div>
                      </th>
                      {showName && (
                        <th 
                          rowSpan={2} 
                          style={{ insetInlineStart: `${nameOffset}px` }}
                          className={`py-[18px] px-3 border-2 border-slate-900 bg-slate-200 sticky z-[49] min-w-[400px] max-w-[400px] w-[400px] text-lg font-bold relative overflow-visible sticky-cell-border sticky-col ${lastStickyCol === 'name' ? 'shadow-[-6px_0_12px_rgba(0,0,0,0.15)] rtl:shadow-[-6px_0_12px_rgba(0,0,0,0.15)] ltr:shadow-[6px_0_12px_rgba(0,0,0,0.15)]' : ''}`}
                        >
                            {isKindergarten ? 'اسم التلميذ' : t.studentName}
                            <div className="separator-line"></div>
                        </th>
                      )}
                      {showSeatNumber && (
                        <th 
                          rowSpan={2} 
                          style={{ insetInlineStart: `${seatOffset}px` }}
                          className={`py-[18px] px-3 border-2 border-slate-900 bg-slate-200 sticky z-[48] text-lg font-bold min-w-[150px] max-w-[150px] w-[150px] relative overflow-visible sticky-cell-border sticky-col ${lastStickyCol === 'seat' ? 'shadow-[-6px_0_12px_rgba(0,0,0,0.15)] rtl:shadow-[-6px_0_12px_rgba(0,0,0,0.15)] ltr:shadow-[6px_0_12px_rgba(0,0,0,0.15)]' : ''}`}
                        >
                          {(t as any).seatNumber}
                          <div className="separator-line"></div>
                        </th>
                      )}
                      {showSecretNumber && (
                        <th 
                          rowSpan={2} 
                          style={{ insetInlineStart: `${secretOffset}px` }}
                          className={`py-[18px] px-3 border-2 border-slate-900 bg-slate-200 sticky z-[47] text-lg font-bold min-w-[150px] max-w-[150px] w-[150px] relative overflow-visible sticky-cell-border sticky-col ${lastStickyCol === 'secret' ? 'shadow-[-6px_0_12px_rgba(0,0,0,0.15)] rtl:shadow-[-6px_0_12px_rgba(0,0,0,0.15)] ltr:shadow-[6px_0_12px_rgba(0,0,0,0.15)]' : ''}`}
                        >
                          {(t as any).secretNumber}
                          <div className="separator-line"></div>
                        </th>
                      )}
                      {cols.map((col, idx) => {
                        const colWidth = getSubjectColWidth(col);
                        return (
                          <th 
                            key={col.key} 
                            rowSpan={(col.key === 'percentage' || col.key === 'evaluation' || col.key === 'procedure' || col.key === 'finalResult' || col.key === 'studentRank' || col.key === 'notes' || col.key === 'notesCount') ? 2 : 1} 
                            style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                            className={`py-[6px] px-2 border-2 border-slate-900 bg-transparent text-lg font-bold leading-tight ${(col.key === 'percentage' || col.key === 'evaluation' || col.key === 'procedure' || col.key === 'finalResult' || col.key === 'studentRank' || col.key === 'notes' || col.key === 'notesCount') ? '' : 'h-[60px]'}`}
                          >
                            <div className="flex flex-col items-center justify-center h-full w-full">
                              <span className="whitespace-nowrap select-none">{col.label}</span>
                              {col.key === 'total' && isSecondSemester && (
                                <span className="text-[11px] font-bold text-slate-800 whitespace-nowrap mt-1 tracking-tight">
                                  مجموع درجات الفصلين الدراسيين ÷ 2
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                    <tr className="bg-slate-200 text-slate-900 text-2xl font-black whitespace-nowrap border-b-2 border-slate-900 shadow-sm">
                      {cols.map((col, idx) => {
                        if (col.key === 'percentage' || col.key === 'evaluation' || col.key === 'procedure' || col.key === 'finalResult' || col.key === 'studentRank' || col.key === 'notes' || col.key === 'notesCount') return null;
                        const colWidth = getSubjectColWidth(col);
                        const splitAssessSubjectMaxMap: Record<string, number> = isMiddle
                          ? {
                              music: 20,
                              pe: 20,
                              activity1: 20,
                              activity2: 20
                            }
                          : stage === 'primary'
                          ? {
                              art: 100,
                              pe: 100,
                              fields: 100,
                              music: 100,
                              tokkatsu: 100
                            }
                          : (isSecondary2Scientific || isSecondary2Literary)
                          ? {
                              educational_vocational_activity: 20
                            }
                          : {};
                        const isSplitAssessSubjectHeader = (isMiddle || stage === 'primary' || (stage === 'secondary' && (col as any).hasWrittenExam === false)) && isSecondSemester && (splitAssessSubjectMaxMap[col.key] !== undefined || (stage === 'secondary' && (col as any).hasWrittenExam === false));
                        if (isSplitAssessSubjectHeader) {
                          const assessMaxGrade = (col as any).maxAssessmentsGrade !== undefined ? (col as any).maxAssessmentsGrade : (col.max ?? 100);
                          const actualMaxGrade = (col as any).actualMaxGrade !== undefined ? (col as any).actualMaxGrade : (splitAssessSubjectMaxMap[col.key] !== undefined ? splitAssessSubjectMaxMap[col.key] : assessMaxGrade);
                          return (
                            <th 
                              key={`${col.key}-score`} 
                              style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                              className="p-0 border-2 border-slate-900 bg-transparent text-center h-[50px] relative"
                            >
                              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-slate-900 pointer-events-none z-10" />
                              <div className="absolute inset-0 grid grid-cols-2">
                                <div className="w-full h-full flex items-center justify-center px-1 py-2">
                                  <span className="text-2xl font-black inline-block mt-1 text-blue-700" dir="ltr">{assessMaxGrade}</span>
                                </div>
                                <div 
                                  className="w-full h-full flex items-center justify-center px-1 py-2 bg-slate-300/30 select-none cursor-default"
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setHoveredActualGradeTooltip({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top,
                                      text: 'الدرجة الفعلية للمادة فى الفصلين الدراسيين'
                                    });
                                  }}
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setHoveredActualGradeTooltip({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top,
                                      text: 'الدرجة الفعلية للمادة فى الفصلين الدراسيين'
                                    });
                                  }}
                                  onMouseLeave={() => setHoveredActualGradeTooltip(null)}
                                >
                                  <span className="text-2xl font-black inline-block mt-1 text-blue-700" dir="ltr">{actualMaxGrade}</span>
                                </div>
                              </div>
                            </th>
                          );
                        }
                        return (
                          <th 
                            key={`${col.key}-score`} 
                            style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                            className="py-2 px-2 border-2 border-slate-900 bg-transparent text-center h-[50px]"
                          >
                            {(col.max || (col as any).maxAssessmentsGrade) && (
                              <span className="text-2xl font-black inline-block mt-1 text-blue-700">{(col as any).maxAssessmentsGrade !== undefined ? (col as any).maxAssessmentsGrade : col.max}</span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody
                  onFocus={() => setIsEditingData(true)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setIsEditingData(false);
                    }
                  }}
                >
                    {filteredData.map((student, index) => {
                      const sIdx = localData.findIndex(s => s.id === student.id);
                      const grades = student.assessments?.[semester] || {};
                      const studentMercyBoosts = isSecondSemester && hasMercyStage
                        ? getPrimaryStudentMercyBoosts(student, stage, customCols, defaultSubjectsOverrides, gradingSettings, selectedGrade)
                        : {};
                      
                      const isMissingData = !student.name || cols.some(col => {
                        if ((col as any).isReadonly) return false;
                        const val = (grades as any)[col.key];
                        return val === undefined || val === null || val === '';
                      });

                      const rowColorStyle = getTableRowColorStyle(editingRowTheme, index % 2 !== 0);

                      return (
                        <tr key={student.id} className={`transition-colors font-bold group/row hover:!bg-blue-100 focus-within:!bg-blue-100 ${rowColorStyle.bgClass}`}>
                          <td 
                            className={`p-2 border-2 border-slate-900 text-slate-600 min-w-[64px] max-w-[64px] w-[64px] sticky start-0 z-30 bg-inherit relative overflow-visible sticky-cell-border sticky-col ${lastStickyCol === 'serial' ? 'shadow-[-6px_0_12px_rgba(0,0,0,0.08)] rtl:shadow-[-6px_0_12px_rgba(0,0,0,0.08)] ltr:shadow-[6px_0_12px_rgba(0,0,0,0.08)]' : ''}`} 
                            title={isMissingData ? (t as any).missingData : undefined}
                          >
                            {isMissingData && (
                              <div className="absolute inset-0 bg-red-500/10 shadow-[inset_0_0_20px_rgba(239,68,68,0.7)] animate-pulse pointer-events-none z-0"></div>
                            )}
                            <div className="separator-line"></div>
                            <span className="relative z-10 text-lg">{index + 1}</span>
                          </td>
                          {showName && (
                            <td 
                              style={{ insetInlineStart: `${nameOffset}px` }}
                              className={`p-3 border-2 border-slate-900 text-center whitespace-pre min-w-[400px] max-w-[400px] w-[400px] sticky z-[29] bg-inherit relative overflow-visible sticky-cell-border sticky-col ${lastStickyCol === 'name' ? 'shadow-[-6px_0_12px_rgba(0,0,0,0.08)] rtl:shadow-[-6px_0_12px_rgba(0,0,0,0.08)] ltr:shadow-[6px_0_12px_rgba(0,0,0,0.08)]' : ''}`}
                            >
                              <div className="separator-line"></div>
                              <span className="relative z-10 text-slate-800 flex items-center justify-center w-full h-full text-center overflow-hidden whitespace-pre px-2">{student.name ? (student.name.length > 40 ? student.name.substring(0, 40) + '  ' : student.name) : ''}</span>
                            </td>
                          )}
                          {showSeatNumber && (
                            <td 
                              style={{ insetInlineStart: `${seatOffset}px` }}
                              className={`p-0 border-2 border-slate-900 sticky z-[28] bg-inherit min-w-[150px] max-w-[150px] w-[150px] relative overflow-visible sticky-cell-border sticky-col ${lastStickyCol === 'seat' ? 'shadow-[-6px_0_12px_rgba(0,0,0,0.08)] rtl:shadow-[-6px_0_12px_rgba(0,0,0,0.08)] ltr:shadow-[6px_0_12px_rgba(0,0,0,0.08)]' : ''}`}
                            >
                              <div className="separator-line"></div>
                              <input
                                type="text"
                                readOnly
                                value={extractStudentSeatNumber(student, semester)}
                                className="w-full h-full bg-transparent border-none px-1 py-3 text-center text-xl text-slate-800 focus:outline-none cursor-default font-bold select-all"
                                dir="ltr"
                                title="حقل مجمد للقراءة فقط"
                              />
                            </td>
                          )}
                          {showSecretNumber && (
                            <td 
                              style={{ insetInlineStart: `${secretOffset}px` }}
                              className={`p-0 border-2 border-slate-900 sticky z-[27] bg-inherit min-w-[150px] max-w-[150px] w-[150px] relative overflow-visible sticky-cell-border sticky-col ${lastStickyCol === 'secret' ? 'shadow-[-6px_0_12px_rgba(0,0,0,0.08)] rtl:shadow-[-6px_0_12px_rgba(0,0,0,0.08)] ltr:shadow-[6px_0_12px_rgba(0,0,0,0.08)]' : ''}`}
                            >
                              <div className="separator-line"></div>
                              <input
                                type="text"
                                readOnly
                                value={extractStudentSecretNumber(student, semester)}
                                className="w-full h-full bg-transparent border-none px-1 py-3 text-center text-xl text-slate-800 focus:outline-none cursor-default font-bold select-all"
                                dir="ltr"
                                title="حقل مجمد للقراءة فقط"
                              />
                            </td>
                          )}
                      {cols.map(col => {
                        const colWidth = getSubjectColWidth(col);
                        const evalData = getEvaluationData(student);
                        if (col.key === 'total') {
                          const totalVal = calculateTotal(student);
                          const totalNum = parseFloat(totalVal);
                          const isTotalFail = isKindergarten && !isNaN(totalNum) && displayTotalMax > 0 && ((totalNum / displayTotalMax) * 100 < 50);
                          return (
                            <td 
                              key={col.key} 
                              style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                              className="p-0 border-2 border-slate-900 bg-[linear-gradient(45deg,#c0c0c0,rgba(192,192,192,0.5),#c0c0c0)] bg-[length:200%_200%] animate-shine"
                            >
                              <div className={`w-full h-full flex items-center justify-center py-3 text-2xl font-black drop-shadow-sm ${isTotalFail ? 'text-red-600' : 'text-slate-900'}`}>
                                {totalVal}
                              </div>
                            </td>
                          );
                        }
                        if (col.key === 'percentage') {
                          const totalVal = calculateTotal(student);
                          const totalNum = parseFloat(totalVal);
                          const hasTotal = totalVal !== '' && !isNaN(totalNum) && displayTotalMax > 0;
                          const pctVal = hasTotal ? `${roundToOneDecimal((totalNum / displayTotalMax) * 100)} %` : '';
                          const isBelowLevel = isKindergarten && hasTotal && ((totalNum / displayTotalMax) * 100 < 50);
                          return (
                            <td 
                              key={col.key} 
                              style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                              className={`p-0 border-2 border-slate-900 font-black text-center text-xl bg-transparent ${isBelowLevel ? 'text-red-600' : 'text-slate-900'}`}
                            >
                              <div className="w-full h-full flex items-center justify-center py-3 whitespace-nowrap px-1 select-none" dir="ltr">
                                {pctVal}
                              </div>
                            </td>
                          );
                        }
                        if (col.key === 'evaluation') {
                          if (isKindergarten) {
                            return (
                              <td 
                                key={col.key} 
                                style={{ 
                                  minWidth: `${colWidth}px`, 
                                  width: `${colWidth}px`,
                                  backgroundColor: evalData?.colorHex || undefined 
                                }}
                                className={`p-0 border-2 border-slate-900 font-black text-center text-base ${evalData ? `${evalData.bg} ${evalData.text}` : 'bg-transparent text-slate-900'}`}
                              >
                                <div 
                                  className="w-full h-full flex items-center justify-center py-3 whitespace-nowrap px-1 font-black" 
                                  title={evalData ? `التقييم: ${evalData.label} | الإجراء: ${evalData.action}` : undefined}
                                >
                                  {evalData?.label || '-'}
                                </div>
                              </td>
                            );
                          }
                          const isBelowLevel = isKindergarten && evalData?.label === (t as any).belowLevel;
                          return (
                            <td 
                              key={col.key} 
                              style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                              className={`p-0 border-2 border-slate-900 font-black text-center text-sm bg-transparent ${isBelowLevel ? 'text-red-600' : 'text-slate-900'}`}
                            >
                              <div className="w-full h-full flex items-center justify-center py-3 whitespace-nowrap px-1" title={evalData ? `التقدير: ${evalData.label} | الإجراء: ${evalData.action}` : undefined}>
                                {evalData?.label}
                              </div>
                            </td>
                          );
                        }
                        if (col.key === 'procedure') {
                          const isTherapeutic = isKindergarten && evalData?.action === 'أنشطة علاجية';
                          return (
                            <td 
                              key={col.key} 
                              style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                              className={`p-0 border-2 border-slate-900 font-black text-center text-sm bg-transparent ${isTherapeutic ? 'text-red-600' : 'text-slate-900'}`}
                            >
                              <div className="w-full h-full flex items-center justify-center py-3 whitespace-nowrap px-1">
                                {evalData?.action}
                              </div>
                            </td>
                          );
                        }
                        if (col.key === 'finalResult') {
                          const finalResultData = getFinalResult(student);
                          const isNotice = Boolean(finalResultData?.isNotice || finalResultData?.label === 'يجب رصد درجات كافة المواد');
                          const tooltip = isNotice
                            ? (finalResultData?.tooltip || 'يجب رصد درجات كافة المواد - درجات التقييمات والامتحانات التحريرية للفصلين الدراسيين')
                            : undefined;
                          return (
                            <td 
                              key={col.key} 
                              style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                              className={`p-0 border-2 border-slate-900 font-bold text-center ${isNotice ? 'bg-transparent text-slate-800' : (isKindergarten ? 'bg-transparent text-slate-900 text-lg font-black' : (finalResultData ? `${finalResultData.bg} ${finalResultData.text} text-lg font-black` : 'bg-transparent text-slate-800 text-lg'))}`}
                              title={tooltip}
                            >
                              <div 
                                className={`w-full h-full flex items-center justify-center py-2 px-1 text-center cursor-default ${isNotice ? 'text-[11px] font-bold leading-tight' : 'py-3 whitespace-nowrap text-lg font-black'}`}
                                title={tooltip}
                              >
                                {finalResultData?.label}
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'studentRank') {
                          const rank = studentRanks[student.id] || '-';
                          const isTied = rank.includes('مكرر');
                          return (
                            <td 
                              key={col.key} 
                              style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                              className="p-0 border-2 border-slate-900 bg-transparent text-center"
                            >
                              <div 
                                className={`w-full h-full flex items-center justify-center py-2 px-2 text-center select-none font-black ${isTied ? 'text-blue-900 text-lg' : 'text-slate-900 text-xl'}`}
                                dir="rtl"
                              >
                                {rank}
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'notesCount') {
                          const finalResultData = getFinalResult(student);
                          const count = finalResultData?.secondSessionSubjectsCount ?? 0;
                          const isNotice = finalResultData?.isNotice;
                          const isDash = isNotice || count === '-';
                          const numericCount = typeof count === 'number' ? count : 0;
                          const displayText = isDash ? '-' : (numericCount > 0 ? numericCount.toString() : '0');
                          return (
                            <td 
                              key={col.key} 
                              style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                              className="p-0 border-2 border-slate-900 bg-transparent text-center relative group cursor-default"
                            >
                              <div 
                                className={`w-full h-full flex items-center justify-center py-2 px-2 text-center select-none font-black ${displayText === '-' ? 'text-2xl text-slate-600' : (numericCount > 0 ? 'text-lg text-red-700' : 'text-lg text-slate-600')}`}
                                dir="rtl"
                              >
                                {displayText}
                              </div>
                            </td>
                          );
                        }

                        if (col.key === 'notes') {
                          const finalResultData = getFinalResult(student);
                          const fullNotes = finalResultData?.notes || '';
                          const subjectsText = finalResultData?.secondSessionSubjectsText || '-';
                          const displayText = subjectsText.length > 40 ? subjectsText.slice(0, 40) + '...' : subjectsText;
                          const subjectsTitle = subjectsText !== '-' ? `( ${subjectsText} )` : (isKindergarten ? '( لا توجد مواد برامج علاجية )' : '( لا توجد مواد دور ثان )');
                          const hasFailingDetails = Boolean(subjectsText !== '-' && (fullNotes || finalResultData?.detailsLines?.length));
                          return (
                            <td 
                              key={col.key} 
                              style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                              className="p-0 border-2 border-slate-900 bg-transparent text-slate-800 text-center relative group"
                            >
                              <div 
                                className="w-full h-full flex items-center justify-center py-2 px-2 text-center cursor-default select-none relative"
                                dir="rtl"
                              >
                                {hasFailingDetails && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentTarget = e.currentTarget;
                                      const rect = currentTarget ? currentTarget.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
                                      const seatNo = extractStudentSeatNumber(student, semester);
                                      const secretNo = extractStudentSecretNumber(student, semester);
                                      const studentName = (student.name || '').trim();
                                      const secondSessionCount = finalResultData?.secondSessionSubjectsCount ?? (finalResultData?.detailsLines?.length || 0);
                                      const headerTitle = isKindergarten
                                        ? `مواد برامج علاجية ( ${secondSessionCount} )`
                                        : `مواد الدور الثانى ( ${secondSessionCount} )`;
                                      setHoveredNotesTooltip((prev) => {
                                        if (prev && prev.text === fullNotes && prev.subjectsTitle === subjectsTitle && prev.headerTitle === headerTitle && prev.studentName === studentName && prev.seatNumber === seatNo && prev.secretNumber === secretNo) {
                                          return null;
                                        }
                                        return {
                                          text: fullNotes,
                                          subjectsTitle,
                                          headerTitle,
                                          lines: finalResultData?.detailsLines || (fullNotes ? [fullNotes] : []),
                                          x: rect.left,
                                          y: rect.top,
                                          width: rect.width,
                                          height: rect.height,
                                          studentName,
                                          seatNumber: seatNo,
                                          secretNumber: secretNo
                                        };
                                      });
                                    }}
                                    title={isKindergarten ? "معلومات وتفاصيل مواد برامج علاجية" : "معلومات وتفاصيل مواد الدور الثاني"}
                                    aria-label={isKindergarten ? "معلومات وتفاصيل مواد برامج علاجية" : "معلومات وتفاصيل مواد الدور الثاني"}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-full flex items-center justify-center z-10 cursor-pointer select-none transition-all duration-200 ease-out bg-gradient-to-b from-[#FFF275] via-[#FFCA00] via-45% to-[#E58300] border-2 border-[#FFFBEB] shadow-[0_3px_7px_rgba(180,83,9,0.45),0_1px_2px_rgba(0,0,0,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-2.5px_4px_rgba(146,64,14,0.65)] hover:scale-115 hover:brightness-110 hover:shadow-[0_0_14px_rgba(245,158,11,0.9),0_4px_8px_rgba(180,83,9,0.5),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_-2.5px_4px_rgba(146,64,14,0.65)] active:scale-95 active:translate-y-0.5 active:shadow-[0_1px_2px_rgba(180,83,9,0.4),inset_0_2.5px_4px_rgba(146,64,14,0.85)] overflow-hidden group/btn"
                                  >
                                    {/* 3D Glass Dome Specular Highlight */}
                                    <div className="absolute top-[1.5px] inset-x-1 h-[10px] rounded-t-full bg-gradient-to-b from-white/90 via-white/40 to-transparent pointer-events-none" />
                                    
                                    {/* 3D Embossed Info Icon */}
                                    <div className="relative z-10 flex items-center justify-center">
                                      <Info className="w-4 h-4 stroke-[2.75] text-[#451A03] drop-shadow-[0_1px_0_rgba(255,255,255,0.7)] group-hover/btn:scale-105 transition-transform" />
                                    </div>
                                  </button>
                                )}
                                <div className={`w-full whitespace-nowrap overflow-hidden text-ellipsis ${hasFailingDetails ? 'pl-12' : ''} ${subjectsText === '-' ? 'text-2xl font-black text-slate-600' : 'text-xs md:text-sm font-bold text-red-700'}`}>
                                  {displayText}
                                </div>
                              </div>
                            </td>
                          );
                        }

                        const isKindergartenFail = (() => {
                          if (!isKindergarten) return false;
                          const rawVal = (grades as any)[col.key];
                          if (rawVal === undefined || rawVal === null || rawVal === '') return false;
                          const trimmedVal = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
                          const isAbsence = trimmedVal === 'غ' || (typeof trimmedVal === 'string' && trimmedVal.toLowerCase() === 'a');
                          if (isAbsence) return true;
                          const val = parseFloat(typeof rawVal === 'string' ? rawVal.replace(',', '.') : rawVal);
                          if (isNaN(val)) return false;
                          const maxVal = (col as any).maxAssessmentsGrade !== undefined 
                            ? (col as any).maxAssessmentsGrade 
                            : ((col as any).maxGrade !== undefined ? (col as any).maxGrade : (col.max !== undefined ? col.max : 100));
                          if (maxVal <= 0) return false;
                          const percentage = (val / maxVal) * 100;
                          const isReligion = col.key === 'religion' || (col.label && col.label.includes('دين'));
                          const minPass = isReligion ? 70 : 50;
                          return percentage < minPass;
                        })();

                        const splitAssessSubjectPercentageMap: Record<string, number> = isMiddle
                          ? {
                              music: 0.1,
                              pe: 0.1,
                              activity1: 0.1,
                              activity2: 0.1
                            }
                          : stage === 'primary'
                          ? {
                              art: 0.5,
                              pe: 0.5,
                              fields: 0.5,
                              music: 0.5,
                              tokkatsu: 0.5
                            }
                          : (isSecondary2Scientific || isSecondary2Literary)
                          ? {
                              educational_vocational_activity: 0.1
                            }
                          : {};
                        const isSplitAssessSubjectCell = (isMiddle || stage === 'primary' || (stage === 'secondary' && (col as any).hasWrittenExam === false)) && isSecondSemester && (splitAssessSubjectPercentageMap[col.key] !== undefined || (stage === 'secondary' && (col as any).hasWrittenExam === false));
                        if (isSplitAssessSubjectCell) {
                          const assess1 = student.assessments?.['first'] || student.assessments?.['الفصل الدراسي الأول'];
                          const assess2 = student.assessments?.[semester] || student.assessments?.['second'] || student.assessments?.['الفصل الدراسي الثاني'];

                          const extractGradeNum = (obj: any) => {
                            if (!obj) return { val: 0, has: false };
                            const raw = obj[col.key];
                            if (raw === undefined || raw === null || String(raw).trim() === '') return { val: 0, has: false };
                            const trimmed = String(raw).trim();
                            if (trimmed === 'غ' || trimmed.toLowerCase() === 'a') return { val: 0, has: true };
                            const num = parseFloat(trimmed.replace(',', '.'));
                            if (isNaN(num)) return { val: 0, has: false };
                            return { val: num, has: true };
                          };

                          const a1 = extractGradeNum(assess1);
                          const a2 = extractGradeNum(assess2);

                          const mercyBoost = isSecondSemester && hasMercyStage ? studentMercyBoosts[col.key] : undefined;
                          const hasAnySubjectGrade = a1.has || a2.has;
                          const allSubjectGradesSum = a1.val + a2.val;
                          const twoSemAssessMax = (((col as any).maxAssessmentsGrade !== undefined ? (col as any).maxAssessmentsGrade : (col.max ?? 100))) * 2;
                          const customActualPct = (col as any).actualMaxGrade !== undefined && twoSemAssessMax > 0
                            ? ((col as any).actualMaxGrade / twoSemAssessMax)
                            : undefined;
                          const actualPercentage = customActualPct !== undefined ? customActualPct : (splitAssessSubjectPercentageMap[col.key] !== undefined ? splitAssessSubjectPercentageMap[col.key] : 0.5);
                          const actualSubjectGrade = mercyBoost
                            ? String(mercyBoost.boostedActualGrade)
                            : (hasAnySubjectGrade ? roundToOneDecimal(allSubjectGradesSum * actualPercentage).toString() : '');

                          return (
                            <td 
                              key={col.key} 
                              style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                              className="p-0 border-2 border-slate-900 relative group/cell"
                            >
                              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-slate-900 pointer-events-none z-10" />
                              <div className="w-full h-full grid grid-cols-2">
                                <div className="w-full h-full focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-10 focus-within:bg-blue-50/40">
                                  <input
                                    id={`grade-cell-${index}-${col.key}`}
                                    type="text"
                                    value={(grades as any)[col.key] || ''}
                                    onChange={(e) => handleGradeChange(student.id, col.key as keyof AssessmentGrades, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index, col.key)}
                                    onFocus={(e) => {
                                      e.target.select();
                                      ensureCellVisible(e.target);
                                      if (!['total', 'percentage', 'evaluation', 'procedure', 'finalResult', 'studentRank', 'notes', 'notesCount'].includes(col.key)) {
                                        lastActiveSubjectKey.current = col.key;
                                      }
                                    }}
                                    className="w-full h-full bg-transparent border-none px-1 py-3 text-center text-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:font-black text-slate-800 font-bold"
                                    dir="ltr"
                                  />
                                </div>
                                <div 
                                  className={`w-full h-full flex items-center justify-center px-1 py-3 text-center text-xl font-black bg-[linear-gradient(110deg,rgba(0,0,0,0.25)_20%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.25)_80%)] bg-[length:200%_100%] animate-shine select-none cursor-default ${mercyBoost ? 'text-green-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]' : 'text-black'}`}
                                  dir="ltr"
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setHoveredActualGradeTooltip({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top,
                                      text: mercyBoost
                                        ? `الدرجة الفعلية التى حصل عليها الطالب فى الفصلين الدراسيين\nدرجة مرفوعة بعد تفعيل درجات الرأفة - عدد الدرجات المضافة الى درجة الطالب الفعلية ( ${mercyBoost.boostAmount} )`
                                        : 'الدرجة الفعلية التى حصل عليها الطالب فى الفصلين الدراسيين'
                                    });
                                  }}
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setHoveredActualGradeTooltip({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top,
                                      text: mercyBoost
                                        ? `الدرجة الفعلية التى حصل عليها الطالب فى الفصلين الدراسيين\nدرجة مرفوعة بعد تفعيل درجات الرأفة - عدد الدرجات المضافة الى درجة الطالب الفعلية ( ${mercyBoost.boostAmount} )`
                                        : 'الدرجة الفعلية التى حصل عليها الطالب فى الفصلين الدراسيين'
                                    });
                                  }}
                                  onMouseLeave={() => setHoveredActualGradeTooltip(null)}
                                >
                                  {actualSubjectGrade}
                                </div>
                              </div>
                            </td>
                          );
                        }

                        const cellDisplayValue = (grades as any)[col.key] ?? '';

                        return (
                          <td 
                            key={col.key} 
                            style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                            className="p-0 border-2 border-slate-900 relative group/cell focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-10 focus-within:bg-blue-50/40"
                          >
                            <input
                              id={`grade-cell-${index}-${col.key}`}
                              type="text"
                              value={cellDisplayValue}
                              onChange={(e) => handleGradeChange(student.id, col.key as keyof AssessmentGrades, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, index, col.key)}
                              onFocus={(e) => {
                                e.target.select();
                                ensureCellVisible(e.target);
                                if (!['total', 'percentage', 'evaluation', 'procedure', 'finalResult', 'studentRank', 'notes', 'notesCount'].includes(col.key)) {
                                  lastActiveSubjectKey.current = col.key;
                                }
                              }}
                              className={`w-full h-full bg-transparent border-none px-1 py-3 text-center text-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:font-black ${isKindergartenFail ? 'text-red-600 font-black' : 'text-slate-800 font-bold'}`}
                              dir="ltr"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={cols.length + 1 + (showName ? 1 : 0) + (showSeatNumber ? 1 : 0) + (showSecretNumber ? 1 : 0)} className="py-12 text-center text-slate-500 font-bold border-2 border-slate-900">
                      {searchTerm ? 'لا يوجد' : (t as any).noStudentsMsg}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
              );
            })()}
          </div>
        </div>

      </div>

      <PortalModal><AnimatePresence>
        {isAddFieldModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsAddFieldModalOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden p-[4px] flex flex-col" 
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="absolute inset-[-100%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />
              <div className="relative bg-[linear-gradient(135deg,#e0e7ff,#f3e8ff,#fae8ff,#e0e7ff)] bg-[length:300%_300%] animate-shine rounded-[26px] w-full h-full border border-white/60">
                <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <motion.h3 animate={{ rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="text-2xl text-center font-bold text-indigo-950 mb-2 drop-shadow-sm">{(t as any).addNewField}</motion.h3>
                  <div className="h-1 w-full bg-[linear-gradient(90deg,#6366f1,#c7d2fe,#ffffff,#c7d2fe,#6366f1)] bg-[length:200%_100%] animate-shine shadow-[0_0_8px_rgba(99,102,241,0.6)] rounded-full mb-6" style={{ animationDuration: "5s" }}></div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-bold text-black opacity-80">{(t as any).fieldName}</label>
                      <div className="flex items-center gap-2">
                        {newFieldNameEn.trim() && (
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md truncate max-w-[140px]" dir="ltr">
                            {newFieldNameEn}
                          </span>
                        )}
                        <span className="text-xs font-bold text-indigo-700">{newFieldName.length} / {isKindergarten ? 100 : 30} حرف</span>
                      </div>
                    </div>
                    <div className="relative mb-4">
                      <input
                        type="text"
                        maxLength={isKindergarten ? 100 : 30}
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value.slice(0, isKindergarten ? 100 : 30))}
                        placeholder="اكتب اسم المادة باللغة العربية"
                        className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl pr-4 pl-12 py-3.5 text-indigo-900 focus:outline-none focus:border-indigo-500 font-bold transition-colors shadow-inner relative z-10"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const ar = newFieldName.trim() || 'مادة دراسية جديدة';
                          const currentEn = newFieldNameEn.trim() || getStoredSubjectEn('', ar);
                          setTempSubjectNameEn(currentEn);
                          setSubjectEnModal({
                            mode: 'new',
                            arName: ar,
                            enName: currentEn,
                          });
                        }}
                        title={
                          newFieldNameEn.trim()
                            ? `اسم المادة بالإنجليزية: ${newFieldNameEn}`
                            : 'إضافة / تعديل اسم المادة باللغة الإنجليزية'
                        }
                        className={`absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-lg border border-slate-900 flex items-center justify-center transition-all shadow-sm active:scale-95 ${
                          newFieldNameEn.trim()
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700'
                            : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700'
                        }`}
                      >
                        <Languages className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                    <div className="flex flex-col gap-3 mb-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isAddedToTotal"
                            checked={newFieldIsAddedToTotal}
                            onChange={() => setNewFieldIsAddedToTotal(true)}
                            className="w-5 h-5 text-indigo-600 border-amber-300 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-indigo-900">{(t as any).addedToTotal}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isAddedToTotal"
                            checked={!newFieldIsAddedToTotal}
                            onChange={() => setNewFieldIsAddedToTotal(false)}
                            className="w-5 h-5 text-indigo-600 border-amber-300 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-indigo-900">{(t as any).notAddedToTotal}</span>
                        </label>
                      </div>
                      {isKindergarten ? (
                        <>
                          <div>
                            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">{(t as any).maxGrade}</label>
                            <input
                                type="number"
                                value={newFieldMaxGrade}
                                onChange={(e) => setNewFieldMaxGrade(e.target.value)}
                                className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-indigo-900 focus:outline-none focus:border-indigo-500 font-bold transition-colors shadow-inner"
                            />
                          </div>

                          <div className="mt-3">
                            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">
                              {isKindergarten ? 'النسبة المئوية للدرجة الأدنى لنجاح التلميذ' : ((t as any).minPassPercentageKg || 'النسبة المئوية للدرجة الأدنى لنجاح الطالب')}
                            </label>
                            <div className="relative flex items-center">
                              <input
                                  type="number"
                                  value={newFieldMinPassPercentage}
                                  onChange={(e) => setNewFieldMinPassPercentage(e.target.value)}
                                  className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-indigo-900 focus:outline-none focus:border-indigo-500 font-bold transition-colors shadow-inner"
                              />
                              <span className="absolute end-4 font-bold text-slate-900">%</span>
                            </div>
                          </div>

                          <div className="mt-3">
                            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">
                              {((t as any).actualSubjectGrade || 'الدرجة الفعلية للمادة')}
                            </label>
                            <input
                              type="number"
                              value={newFieldActualMaxGrade}
                              onChange={(e) => setNewFieldActualMaxGrade(e.target.value)}
                              className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-indigo-900 focus:outline-none focus:border-indigo-500 font-bold transition-colors shadow-inner"
                            />
                          </div>

                          {/* مجالات قياس نواتج التعلم - استبدال حقل المرفق لرياض الأطفال */}
                          <div className="mt-3">
                            <label className="block text-sm font-bold text-black mb-2 opacity-80">
                              مجالات قياس نواتج التعلم
                            </label>
                            <div className="flex flex-col gap-2 bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-indigo-200 shadow-inner">
                              {KG_LEARNING_DOMAINS.map((domainOption) => (
                                <label
                                  key={domainOption}
                                  className={`flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl transition-all ${
                                    newFieldKgDomain === domainOption
                                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-500 shadow-sm'
                                      : 'hover:bg-indigo-50/40 border-2 border-transparent'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="newFieldKgDomain"
                                    value={domainOption}
                                    checked={newFieldKgDomain === domainOption}
                                    onChange={() => {
                                      setNewFieldKgDomain(domainOption);
                                    }}
                                    className="w-5 h-5 mt-0.5 text-indigo-600 border-indigo-300 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                                  />
                                  <span className="font-bold text-indigo-950 text-xs sm:text-sm leading-relaxed">
                                    {domainOption}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">{(t as any).maxAssessmentsGrade}</label>
            <input
                type="number"
                value={newFieldMaxAssessmentsGrade}
                onChange={(e) => setNewFieldMaxAssessmentsGrade(e.target.value)}
                className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-indigo-900 focus:outline-none focus:border-indigo-500 font-bold transition-colors shadow-inner"
            />
        </div>
                                      
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFieldHasWrittenExam}
                    onChange={(e) => setNewFieldHasWrittenExam(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-black opacity-80">المادة لها إمتحان تحريرى</span>
                </label>
              </div>
          <div className={!newFieldHasWrittenExam ? "opacity-50 pointer-events-none" : ""}>
            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">{(t as any).maxWrittenGrade}</label>
            <input
                type="number"
                value={newFieldMaxWrittenGrade}
                onChange={(e) => setNewFieldMaxWrittenGrade(e.target.value)}
                className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-indigo-900 focus:outline-none focus:border-indigo-500 font-bold transition-colors shadow-inner"
            />
        </div>
                            <div className={!newFieldHasWrittenExam ? "opacity-50 pointer-events-none" : ""}>
            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">
              {((t as any).minPassPercentage || 'النسبة المئوية للدرجة الأدنى لنجاح الطالب فى الامتحان التحريرى للمادة فى الفصل الدراسي الثانى')}
            </label>
            <div className="relative flex items-center">
                <input
                    type="number"
                    step="any"
                    value={newFieldMinPassPercentage}
                    onChange={(e) => setNewFieldMinPassPercentage(e.target.value)}
                    className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-indigo-900 focus:outline-none focus:border-indigo-500 font-bold transition-colors shadow-inner"
                />
                <span className="absolute end-4 font-bold text-slate-900">%</span>
            </div>
        </div>

                            <div className="mt-1">
                              <label className="block text-sm font-bold text-black mb-1.5 opacity-80">
                                النسبة المئوية للدرجة الأدنى لنجاح الطالب فى كل الدرجات المخصصة للمادة
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  step="any"
                                  value={newFieldMinTotalPassPercentage}
                                  onChange={(e) => setNewFieldMinTotalPassPercentage(e.target.value)}
                                  className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-indigo-900 focus:outline-none focus:border-indigo-500 font-bold transition-colors shadow-inner"
                                />
                                <span className="absolute end-4 font-bold text-slate-900">%</span>
                              </div>
                            </div>

                          <div className="mt-3">
                            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">
                              {((t as any).actualSubjectGrade || 'الدرجة الفعلية للمادة')}
                            </label>
                            <input
                              type="number"
                              value={newFieldActualMaxGrade}
                              onChange={(e) => setNewFieldActualMaxGrade(e.target.value)}
                              className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-indigo-900 focus:outline-none focus:border-indigo-500 font-bold transition-colors shadow-inner"
                            />
                          </div>

                          <div className="mt-3">
                            <label className="block text-sm font-bold text-black mb-2 opacity-80">
                              {(t as any).learningOutcomesIndicator || 'يشار الى نواتج التعلم باستخدام'}
                            </label>
                            <div className="flex flex-col gap-2.5">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="newFieldLearningOutcomes"
                                  value="pass_fail"
                                  checked={newFieldLearningOutcomes === 'pass_fail'}
                                  onChange={() => setNewFieldLearningOutcomes('pass_fail')}
                                  className="w-5 h-5 text-indigo-600 border-amber-300 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className="font-bold text-indigo-900 text-sm">
                                  {(t as any).learningOutcomesPassFail || 'إجتاز - لم يجتاز'}
                                </span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="newFieldLearningOutcomes"
                                  value="grades"
                                  checked={newFieldLearningOutcomes === 'grades'}
                                  onChange={() => setNewFieldLearningOutcomes('grades')}
                                  className="w-5 h-5 text-indigo-600 border-amber-300 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className="font-bold text-indigo-900 text-sm">
                                  {(t as any).learningOutcomesGrades || 'ممتاز - جيد جدا - جيد - مقبول - دون المستوى'}
                                </span>
                              </label>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="h-1 w-full bg-[linear-gradient(90deg,#6366f1,#c7d2fe,#ffffff,#c7d2fe,#6366f1)] bg-[length:200%_100%] animate-shine shadow-[0_0_8px_rgba(99,102,241,0.6)] rounded-full mb-4 mt-4" style={{ animationDuration: "5s" }}></div>
                    <div className="flex w-full gap-4 mt-2">
                      <div className="relative p-[3px] rounded-xl overflow-hidden group flex-1">
                        <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,#000_0%,#fff_50%,#000_100%)] pointer-events-none opacity-50" />
                        <button onClick={() => {
                          setIsAddFieldModalOpen(false);
                          setNewFieldActualMaxGrade('100');
                          if (isKindergarten) {
                            setNewFieldMaxGrade('100');
                          } else {
                            setNewFieldMaxAssessmentsGrade(getDefaultAssessmentsGrade(stage));
                            setNewFieldMaxWrittenGrade(getDefaultWrittenGrade(stage));
                          }
                        }} className="relative flex items-center justify-center w-full h-full px-6 py-4 rounded-[9px] font-bold text-indigo-800 bg-white/90 hover:bg-white transition-all shadow-sm text-lg">
                          <span className="inline-block transform -translate-y-0.5">{(t as any).cancel}</span>
                        </button>
                      </div>
                      <div className="relative p-[3px] rounded-xl overflow-hidden group flex-1">
                        <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,#000_0%,#fff_50%,#000_100%)] pointer-events-none" />
                        <button onClick={() => {
                          const isBaseValid = isKindergarten
                            ? (newFieldName.trim() !== '' || Boolean(newFieldKgDomain))
                            : newFieldName.trim() !== '';
                          if (!isBaseValid) return;
                          
                          const newKey = `custom_${Date.now()}`;
                          const chosenName = (newFieldName.trim() || (isKindergarten ? newFieldKgDomain : '')).trim();
                          const cleanLabel = isKindergarten ? chosenName.slice(0, 100) : chosenName.slice(0, 30);
                          const cleanEn = newFieldNameEn.trim();
                          if (cleanEn) {
                            saveStoredSubjectEn(newKey, cleanLabel, cleanEn);
                          }

                          if (isKindergarten) {
                            if (newFieldMaxGrade.trim() && !isNaN(parseFloat(newFieldMaxGrade))) {
                              setCustomCols(prev => [...prev, { 
                                key: newKey, 
                                label: cleanLabel,
                                labelEn: cleanEn || undefined,
                                isAddedToTotal: newFieldIsAddedToTotal,
                                maxGrade: parseFloat(newFieldMaxGrade),
                                actualMaxGrade: newFieldActualMaxGrade.trim() && !isNaN(parseFloat(newFieldActualMaxGrade)) ? parseFloat(newFieldActualMaxGrade) : 100,
                                minPassPercentage: newFieldMinPassPercentage.trim() && !isNaN(parseFloat(newFieldMinPassPercentage)) ? parseFloat(newFieldMinPassPercentage) : undefined,
                                learningOutcomesType: 'grades',
                                learningDomain: newFieldKgDomain
                              }]);
                              setNewFieldName('');
                              setNewFieldNameEn('');
                              setNewFieldActualMaxGrade('100');
                              setNewFieldMaxGrade('100');
                              setNewFieldMinPassPercentage('50');
                              setNewFieldKgDomain(KG_LEARNING_DOMAINS[0]);
                              setNewFieldLearningOutcomes('grades');
                              setNewFieldIsAddedToTotal(true);
                              setIsAddFieldModalOpen(false);
                            }
                          } else {
                            
                            const isValidAssessments = newFieldMaxAssessmentsGrade.trim() && !isNaN(parseFloat(newFieldMaxAssessmentsGrade));
                            const isValidWritten = !newFieldHasWrittenExam || (newFieldMaxWrittenGrade.trim() && !isNaN(parseFloat(newFieldMaxWrittenGrade)) && (!isMax40 || (newFieldMinPassPercentage.trim() && !isNaN(parseFloat(newFieldMinPassPercentage)))));
                            if (isValidAssessments && isValidWritten) {
                                
                                setCustomCols(prev => [...prev, {
                                  key: newKey, 
                                  label: cleanLabel,
                                  labelEn: cleanEn || undefined,
                                  isAddedToTotal: newFieldIsAddedToTotal,
                                  maxAssessmentsGrade: parseFloat(newFieldMaxAssessmentsGrade),
                                  maxWrittenGrade: newFieldHasWrittenExam ? parseFloat(newFieldMaxWrittenGrade) : undefined,
                                  hasWrittenExam: newFieldHasWrittenExam,
                                  actualMaxGrade: newFieldActualMaxGrade.trim() && !isNaN(parseFloat(newFieldActualMaxGrade)) ? parseFloat(newFieldActualMaxGrade) : 100,
                                  minPassPercentage: newFieldHasWrittenExam && newFieldMinPassPercentage.trim() && !isNaN(parseFloat(newFieldMinPassPercentage)) ? parseFloat(newFieldMinPassPercentage) : undefined,
                                  minTotalPassPercentage: newFieldMinTotalPassPercentage.trim() && !isNaN(parseFloat(newFieldMinTotalPassPercentage)) ? parseFloat(newFieldMinTotalPassPercentage) : (newFieldName.includes('دين') ? 70 : 50),
                                  learningOutcomesType: newFieldLearningOutcomes
                                }]);
                                setNewFieldName('');
                                setNewFieldNameEn('');
                                setNewFieldActualMaxGrade('100');
                                setNewFieldMaxAssessmentsGrade(getDefaultAssessmentsGrade(stage));
                                setNewFieldHasWrittenExam(true);
                                setNewFieldMaxWrittenGrade(getDefaultWrittenGrade(stage));
                                setNewFieldMinPassPercentage('30');
                                setNewFieldMinTotalPassPercentage('50');
                                setNewFieldLearningOutcomes('grades');
                                setNewFieldIsAddedToTotal(true);
                                setIsAddFieldModalOpen(false);
                            }
                          }
                        }} className="relative flex items-center justify-center w-full h-full px-6 py-4 rounded-[9px] font-bold text-white bg-[linear-gradient(45deg,#6366f1,#8b5cf6,#6366f1)] bg-[length:200%_200%] animate-shine hover:opacity-90 transition-all shadow-md text-lg">
                          <span className="inline-block transform -translate-y-0.5">{(t as any).add}</span>
                        </button>
                      </div>
                    </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></PortalModal>

      <PortalModal><AnimatePresence>
        {isSelectEditFieldModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSelectEditFieldModalOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-[4px] flex flex-col" 
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="absolute inset-[-100%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />
              <div className="relative bg-[linear-gradient(135deg,#fef3c7,#fef08a,#fef9c3,#fef3c7)] bg-[length:300%_300%] animate-shine rounded-[26px] w-full h-full border border-white/60 relative z-10">
                <div className="p-6 md:p-8">
                  <motion.h3 animate={{ rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="text-2xl text-center font-bold text-amber-950 mb-5 drop-shadow-sm relative z-10">{(t as any).selectSubjectToEdit}</motion.h3>
                  <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto pr-2 pl-1 custom-scrollbar mb-6 relative z-10">
                    {editableCols.length === 0 ? (
                      <p className="text-center text-amber-400 py-4 font-bold">لا توجد مواد قابلة للتعديل</p>
                    ) : (
                      editableCols.map(c => {
                        const override = defaultSubjectsOverrides?.[c.key];
                        const subjectLabel = override?.label || c.label;
                        return (
                          <div key={c.key} className="relative p-[2px] rounded-xl overflow-hidden group shadow-sm shrink-0">
                            <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_50%,rgba(217,119,6,0.35)_100%)] pointer-events-none" />
                            <button 
                              onClick={() => {
                                const targetCol = customCols.find(col => col.key === c.key) || c;
                                const ovr = defaultSubjectsOverrides?.[c.key];

                                const label = ovr?.label || targetCol?.label || c.label || '';
                                const isAdded = ovr?.isAddedToTotal !== undefined ? ovr.isAddedToTotal : (targetCol?.isAddedToTotal !== undefined ? targetCol.isAddedToTotal : true);
                                const hasExam = ovr?.hasWrittenExam !== undefined ? ovr.hasWrittenExam : (targetCol?.hasWrittenExam !== undefined ? targetCol.hasWrittenExam : (isKindergarten ? false : true));

                                const maxAssess = ovr?.maxAssessmentsGrade !== undefined 
                                  ? ovr.maxAssessmentsGrade.toString() 
                                  : (targetCol?.maxAssessmentsGrade !== undefined 
                                      ? targetCol.maxAssessmentsGrade.toString() 
                                      : (targetCol?.maxGrade !== undefined ? targetCol.maxGrade.toString() : getDefaultAssessmentsGrade(stage)));

                                const maxWritten = ovr?.maxWrittenGrade !== undefined 
                                  ? ovr.maxWrittenGrade.toString() 
                                  : (targetCol?.maxWrittenGrade !== undefined 
                                      ? targetCol.maxWrittenGrade.toString() 
                                      : (hasExam ? getDefaultWrittenGrade(stage) : ""));

                                let minPass = ovr?.minPassPercentage !== undefined 
                                  ? ovr.minPassPercentage.toString() 
                                  : (targetCol?.minPassPercentage !== undefined 
                                      ? targetCol.minPassPercentage.toString() 
                                      : (isKindergarten ? "50" : "30"));
                                if (hasExam && (minPass === "70" || minPass === "10" || minPass === "7.2")) {
                                  minPass = "30";
                                }

                                const isRel = c.key === 'religion' || label.includes('دين');
                                const minTotalPass = ovr?.minTotalPassPercentage !== undefined
                                  ? ovr.minTotalPassPercentage.toString()
                                  : (targetCol?.minTotalPassPercentage !== undefined
                                      ? targetCol.minTotalPassPercentage.toString()
                                      : (isRel ? "70" : "50"));

                                const maxG = ovr?.maxGrade !== undefined 
                                  ? ovr.maxGrade.toString() 
                                  : (targetCol?.maxGrade !== undefined ? targetCol.maxGrade.toString() : (isKindergarten ? "100" : ""));

                                const actualG = (ovr as any)?.actualMaxGrade !== undefined
                                  ? (ovr as any).actualMaxGrade.toString()
                                  : (targetCol?.actualMaxGrade !== undefined ? targetCol.actualMaxGrade.toString() : "100");

                                const outcomes = ovr?.learningOutcomesType || targetCol?.learningOutcomesType || 'grades';

                                const enName = (targetCol as any)?.labelEn || (ovr as any)?.labelEn || getStoredSubjectEn(c.key, label);
                                setFieldToEdit(c.key);
                                setEditFieldName(label);
                                setEditFieldNameEn(enName || '');
                                setEditFieldIsAddedToTotal(isAdded);
                                setEditFieldHasWrittenExam(hasExam);
                                setEditFieldMaxAssessmentsGrade(maxAssess);
                                setEditFieldMaxWrittenGrade(maxWritten);
                                setEditFieldMinPassPercentage(minPass);
                                setEditFieldMinTotalPassPercentage(minTotalPass);
                                setEditFieldMaxGrade(maxG);
                                setEditFieldActualMaxGrade(actualG);
                                setEditFieldLearningOutcomes(outcomes);
                                const matchedKgDomain = (targetCol as any)?.learningDomain ||
                                  (KG_LEARNING_DOMAINS as readonly string[]).find(d => label.includes(d) || d.includes(label)) ||
                                  (c.key === 'arabic' ? KG_LEARNING_DOMAINS[0] :
                                   c.key === 'english' ? KG_LEARNING_DOMAINS[1] :
                                   c.key === 'multidisciplinary' ? KG_LEARNING_DOMAINS[2] :
                                   c.key === 'pe' ? KG_LEARNING_DOMAINS[3] : KG_LEARNING_DOMAINS[0]);
                                setEditFieldKgDomain(matchedKgDomain);
                                setIsSelectEditFieldModalOpen(false);
                                setIsEditFieldFormOpen(true);
                              }}
                              className="relative w-full min-h-[46px] flex items-center justify-center text-center px-4 py-2.5 bg-white/95 hover:bg-white rounded-[10px] font-bold text-amber-950 hover:text-amber-700 transition-all shadow-sm"
                            >
                              <span className="text-base font-bold text-amber-950 leading-relaxed truncate px-1">{subjectLabel}</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex justify-end relative z-10">
                    <div className="relative p-[2px] rounded-xl overflow-hidden group shrink-0">
                      <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,#000_0%,#fff_50%,#000_100%)] pointer-events-none opacity-40" />
                      <button onClick={() => setIsSelectEditFieldModalOpen(false)} className="relative min-h-[42px] flex items-center justify-center px-6 py-2 rounded-[10px] font-bold text-amber-950 bg-white/95 hover:bg-white transition-all shadow-sm text-base">
                        <span>{(t as any).cancel}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></PortalModal>

      <PortalModal><AnimatePresence>
        {isEditFieldFormOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsEditFieldFormOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden p-[4px] flex flex-col" 
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="absolute inset-[-100%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />
              <div className="relative bg-[linear-gradient(135deg,#fef3c7,#fef08a,#fef9c3,#fef3c7)] bg-[length:300%_300%] animate-shine rounded-[26px] w-full h-full border border-white/60">
                <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <motion.h3 animate={{ rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="text-2xl text-center font-bold text-amber-950 mb-2 drop-shadow-sm">{(t as any).editSubject}</motion.h3>
                  <div className="h-1 w-full bg-[linear-gradient(90deg,#d97706,#fde68a,#ffffff,#fde68a,#d97706)] bg-[length:200%_100%] animate-shine shadow-[0_0_8px_rgba(217,119,6,0.6)] rounded-full mb-6" style={{ animationDuration: "5s" }}></div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-bold text-black opacity-80">{(t as any).fieldName}</label>
                      <div className="flex items-center gap-2">
                        {editFieldNameEn.trim() && (
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md truncate max-w-[140px]" dir="ltr">
                            {editFieldNameEn}
                          </span>
                        )}
                        <span className="text-xs font-bold text-amber-800">{editFieldName.length} / {isKindergarten ? 100 : 30} حرف</span>
                      </div>
                    </div>
                    <div className="relative mb-4">
                      <input
                        type="text"
                        maxLength={isKindergarten ? 100 : 30}
                        value={editFieldName}
                        onChange={(e) => setEditFieldName(e.target.value.slice(0, isKindergarten ? 100 : 30))}
                        placeholder="اكتب اسم المادة باللغة العربية"
                        className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl pr-4 pl-12 py-3.5 text-amber-900 focus:outline-none focus:border-amber-500 font-bold transition-colors shadow-inner relative z-10"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const ar = editFieldName.trim() || 'المادة الدراسية';
                          const currentEn = editFieldNameEn.trim() || (fieldToEdit ? getStoredSubjectEn(fieldToEdit, ar) : '');
                          setTempSubjectNameEn(currentEn);
                          setSubjectEnModal({
                            mode: 'edit',
                            arName: ar,
                            enName: currentEn,
                          });
                        }}
                        title={
                          editFieldNameEn.trim()
                            ? `اسم المادة بالإنجليزية: ${editFieldNameEn}`
                            : 'إضافة / تعديل اسم المادة باللغة الإنجليزية'
                        }
                        className={`absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-lg border border-slate-900 flex items-center justify-center transition-all shadow-sm active:scale-95 ${
                          editFieldNameEn.trim()
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700'
                            : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700'
                        }`}
                      >
                        <Languages className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                    <div className="flex flex-col gap-3 mb-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isAddedToTotal"
                            checked={editFieldIsAddedToTotal}
                            onChange={() => setEditFieldIsAddedToTotal(true)}
                            className="w-5 h-5 text-amber-600 border-amber-300 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-amber-900">{(t as any).addedToTotal}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isAddedToTotal"
                            checked={!editFieldIsAddedToTotal}
                            onChange={() => setEditFieldIsAddedToTotal(false)}
                            className="w-5 h-5 text-amber-600 border-amber-300 focus:ring-indigo-500"
                          />
                          <span className="font-bold text-amber-900">{(t as any).notAddedToTotal}</span>
                        </label>
                      </div>
                      {isKindergarten ? (
                        <>
                          <div>
                            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">{(t as any).maxGrade}</label>
                            <input
                                type="number"
                                value={editFieldMaxGrade}
                                onChange={(e) => setEditFieldMaxGrade(e.target.value)}
                                className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-amber-900 focus:outline-none focus:border-amber-500 font-bold transition-colors shadow-inner"
                            />
                          </div>

                          <div className="mt-3">
                            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">
                              {isKindergarten ? 'النسبة المئوية للدرجة الأدنى لنجاح التلميذ' : ((t as any).minPassPercentageKg || 'النسبة المئوية للدرجة الأدنى لنجاح الطالب')}
                            </label>
                            <div className="relative flex items-center">
                              <input
                                  type="number"
                                  value={editFieldMinPassPercentage}
                                  onChange={(e) => setEditFieldMinPassPercentage(e.target.value)}
                                  className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-amber-900 focus:outline-none focus:border-amber-500 font-bold transition-colors shadow-inner"
                              />
                              <span className="absolute end-4 font-bold text-slate-900">%</span>
                            </div>
                          </div>

                          <div className="mt-3">
                            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">
                              {((t as any).actualSubjectGrade || 'الدرجة الفعلية للمادة')}
                            </label>
                            <input
                              type="number"
                              value={editFieldActualMaxGrade}
                              onChange={(e) => setEditFieldActualMaxGrade(e.target.value)}
                              className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-amber-900 focus:outline-none focus:border-amber-500 font-bold transition-colors shadow-inner"
                            />
                          </div>

                          {/* مجالات قياس نواتج التعلم - استبدال حقل المرفق لرياض الأطفال */}
                          <div className="mt-3">
                            <label className="block text-sm font-bold text-black mb-2 opacity-80">
                              مجالات قياس نواتج التعلم
                            </label>
                            <div className="flex flex-col gap-2 bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-amber-200 shadow-inner">
                              {KG_LEARNING_DOMAINS.map((domainOption) => (
                                <label
                                  key={domainOption}
                                  className={`flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl transition-all ${
                                    editFieldKgDomain === domainOption
                                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-500 shadow-sm'
                                      : 'hover:bg-amber-50/40 border-2 border-transparent'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="editFieldKgDomain"
                                    value={domainOption}
                                    checked={editFieldKgDomain === domainOption}
                                    onChange={() => {
                                      setEditFieldKgDomain(domainOption);
                                    }}
                                    className="w-5 h-5 mt-0.5 text-amber-600 border-amber-300 focus:ring-amber-500 cursor-pointer flex-shrink-0"
                                  />
                                  <span className="font-bold text-amber-950 text-xs sm:text-sm leading-relaxed">
                                    {domainOption}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">{(t as any).maxAssessmentsGrade}</label>
            <input
                type="number"
                value={editFieldMaxAssessmentsGrade}
                onChange={(e) => setEditFieldMaxAssessmentsGrade(e.target.value)}
                className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-amber-900 focus:outline-none focus:border-amber-500 font-bold transition-colors shadow-inner"
            />
        </div>
                                      
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFieldHasWrittenExam}
                    onChange={(e) => setEditFieldHasWrittenExam(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-black opacity-80">المادة لها إمتحان تحريرى</span>
                </label>
              </div>
          <div className={!editFieldHasWrittenExam ? "opacity-50 pointer-events-none" : ""}>
            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">{(t as any).maxWrittenGrade}</label>
            <input
                type="number"
                value={editFieldMaxWrittenGrade}
                onChange={(e) => setEditFieldMaxWrittenGrade(e.target.value)}
                className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-amber-900 focus:outline-none focus:border-amber-500 font-bold transition-colors shadow-inner"
            />
        </div>
                          <div className={!editFieldHasWrittenExam ? "opacity-50 pointer-events-none" : ""}>
                            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">
                              {((t as any).minPassPercentage || 'النسبة المئوية للدرجة الأدنى لنجاح الطالب فى الامتحان التحريرى للمادة فى الفصل الدراسي الثانى')}
                            </label>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                step="any"
                                value={editFieldMinPassPercentage}
                                onChange={(e) => setEditFieldMinPassPercentage(e.target.value)}
                                className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-amber-900 focus:outline-none focus:border-amber-500 font-bold transition-colors shadow-inner"
                              />
                              <span className="absolute end-4 font-bold text-slate-900">%</span>
                            </div>
                          </div>

                          <div className="mt-1">
                            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">
                              النسبة المئوية للدرجة الأدنى لنجاح الطالب فى كل الدرجات المخصصة للمادة
                            </label>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                step="any"
                                value={editFieldMinTotalPassPercentage}
                                onChange={(e) => setEditFieldMinTotalPassPercentage(e.target.value)}
                                className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-amber-900 focus:outline-none focus:border-amber-500 font-bold transition-colors shadow-inner"
                              />
                              <span className="absolute end-4 font-bold text-slate-900">%</span>
                            </div>
                          </div>

                          <div className="mt-3">
                            <label className="block text-sm font-bold text-black mb-1.5 opacity-80">
                              {((t as any).actualSubjectGrade || 'الدرجة الفعلية للمادة')}
                            </label>
                            <input
                              type="number"
                              value={editFieldActualMaxGrade}
                              onChange={(e) => setEditFieldActualMaxGrade(e.target.value)}
                              className="w-full bg-white/70 backdrop-blur-sm border border-slate-900 rounded-xl px-4 py-3.5 text-amber-900 focus:outline-none focus:border-amber-500 font-bold transition-colors shadow-inner"
                            />
                          </div>

                          <div className="mt-3">
                            <label className="block text-sm font-bold text-black mb-2 opacity-80">
                              {(t as any).learningOutcomesIndicator || 'يشار الى نواتج التعلم باستخدام'}
                            </label>
                            <div className="flex flex-col gap-2.5">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="editFieldLearningOutcomes"
                                  value="pass_fail"
                                  checked={editFieldLearningOutcomes === 'pass_fail'}
                                  onChange={() => setEditFieldLearningOutcomes('pass_fail')}
                                  className="w-5 h-5 text-amber-600 border-amber-300 focus:ring-amber-500 cursor-pointer"
                                />
                                <span className="font-bold text-amber-950 text-sm">
                                  {(t as any).learningOutcomesPassFail || 'إجتاز - لم يجتاز'}
                                </span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="editFieldLearningOutcomes"
                                  value="grades"
                                  checked={editFieldLearningOutcomes === 'grades'}
                                  onChange={() => setEditFieldLearningOutcomes('grades')}
                                  className="w-5 h-5 text-amber-600 border-amber-300 focus:ring-amber-500 cursor-pointer"
                                />
                                <span className="font-bold text-amber-950 text-sm">
                                  {(t as any).learningOutcomesGrades || 'ممتاز - جيد جدا - جيد - مقبول - دون المستوى'}
                                </span>
                              </label>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="h-1 w-full bg-[linear-gradient(90deg,#d97706,#fde68a,#ffffff,#fde68a,#d97706)] bg-[length:200%_100%] animate-shine shadow-[0_0_8px_rgba(217,119,6,0.6)] rounded-full mb-4 mt-4" style={{ animationDuration: "5s" }}></div>
                    <div className="flex w-full gap-4 mt-2">
                      <div className="relative p-[3px] rounded-xl overflow-hidden group flex-1">
                        <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,#000_0%,#fff_50%,#000_100%)] pointer-events-none opacity-50" />
                        <button onClick={() => setIsEditFieldFormOpen(false)} className="relative w-full h-full px-6 py-4 rounded-[9px] font-bold text-amber-800 bg-white/90 hover:bg-white transition-all shadow-sm text-lg">{(t as any).cancel}</button>
                      </div>
                      <div className="relative p-[3px] rounded-xl overflow-hidden group flex-1">
                        <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,#000_0%,#fff_50%,#000_100%)] pointer-events-none" />
                        <button onClick={() => {
                          const isBaseValid = editFieldName.trim() !== '';
                          if (!isBaseValid) return;
                          
                          const cleanEn = editFieldNameEn.trim();
                          const editLabel = isKindergarten ? editFieldName.trim().slice(0, 100) : editFieldName.trim().slice(0, 30);
                          if (cleanEn) {
                            saveStoredSubjectEn(fieldToEdit!, editLabel, cleanEn);
                          } else {
                            saveStoredSubjectEn(fieldToEdit!, editLabel, '');
                          }

                          if (isKindergarten) {
                            if (!editFieldMaxGrade.trim() || isNaN(parseFloat(editFieldMaxGrade))) return;
                            const maxG = parseFloat(editFieldMaxGrade);
                            const minP = editFieldMinPassPercentage.trim() && !isNaN(parseFloat(editFieldMinPassPercentage)) ? parseFloat(editFieldMinPassPercentage) : 50;

                            setCustomCols(prev => {
                              const updated = prev.map(col => col.key === fieldToEdit ? {
                                ...col,
                                label: editLabel,
                                labelEn: cleanEn || undefined,
                                isAddedToTotal: editFieldIsAddedToTotal,
                                maxGrade: maxG,
                                maxAssessmentsGrade: maxG,
                                hasWrittenExam: false,
                                actualMaxGrade: editFieldActualMaxGrade.trim() && !isNaN(parseFloat(editFieldActualMaxGrade)) ? parseFloat(editFieldActualMaxGrade) : (col.actualMaxGrade !== undefined ? col.actualMaxGrade : 100),
                                minPassPercentage: minP,
                                learningOutcomesType: 'grades' as const,
                                learningDomain: editFieldKgDomain as any
                              } : col);
                              localStorage.setItem(`${stage}_${selectedGrade}_assessments_custom_cols`, JSON.stringify(updated));
                              return updated;
                            });

                            if (['arabic', 'english'].includes(fieldToEdit!)) {
                              setDefaultSubjectsOverrides(prev => {
                                const nextOvr = {
                                  ...prev,
                                  [fieldToEdit!]: {
                                    ...prev[fieldToEdit!],
                                    label: editLabel,
                                    labelEn: cleanEn || undefined,
                                    isAddedToTotal: editFieldIsAddedToTotal,
                                    maxGrade: maxG,
                                    maxAssessmentsGrade: maxG,
                                    hasWrittenExam: false,
                                    actualMaxGrade: editFieldActualMaxGrade.trim() && !isNaN(parseFloat(editFieldActualMaxGrade)) ? parseFloat(editFieldActualMaxGrade) : 100,
                                    minPassPercentage: minP,
                                    learningOutcomesType: editFieldLearningOutcomes
                                  }
                                };
                                localStorage.setItem(`${stage}_${selectedGrade}_assessments_default_overrides`, JSON.stringify(nextOvr));
                                return nextOvr;
                              });
                            }
                            setIsEditFieldFormOpen(false);
                          } else {
                            const isValidAssessments = editFieldMaxAssessmentsGrade.trim() !== '' && !isNaN(parseFloat(editFieldMaxAssessmentsGrade));
                            const isValidWritten = !editFieldHasWrittenExam || (
                              editFieldMaxWrittenGrade.trim() !== '' && !isNaN(parseFloat(editFieldMaxWrittenGrade)) &&
                              (!editFieldMinPassPercentage.trim() || !isNaN(parseFloat(editFieldMinPassPercentage)))
                            );

                            if (isValidAssessments && isValidWritten) {
                              const maxA = parseFloat(editFieldMaxAssessmentsGrade);
                              const maxW = editFieldHasWrittenExam ? parseFloat(editFieldMaxWrittenGrade) : undefined;
                              const minP = editFieldHasWrittenExam && editFieldMinPassPercentage.trim() && !isNaN(parseFloat(editFieldMinPassPercentage)) ? parseFloat(editFieldMinPassPercentage) : (editFieldHasWrittenExam ? 30 : undefined);
                              const isRel = fieldToEdit === 'religion' || editFieldName.includes('دين');
                              const minTotalP = editFieldMinTotalPassPercentage.trim() && !isNaN(parseFloat(editFieldMinTotalPassPercentage)) ? parseFloat(editFieldMinTotalPassPercentage) : (isRel ? 70 : 50);
                              const maxTotal = (stage === 'primary' && fieldToEdit === 'arabic') ? 100 : (maxA + (maxW || 0));

                              setCustomCols(prev => {
                                const updated = prev.map(col => col.key === fieldToEdit ? {
                                  ...col,
                                  label: editLabel,
                                  labelEn: cleanEn || undefined,
                                  isAddedToTotal: editFieldIsAddedToTotal,
                                  maxAssessmentsGrade: maxA,
                                  maxWrittenGrade: maxW,
                                  hasWrittenExam: editFieldHasWrittenExam,
                                  actualMaxGrade: editFieldActualMaxGrade.trim() && !isNaN(parseFloat(editFieldActualMaxGrade)) ? parseFloat(editFieldActualMaxGrade) : (col.actualMaxGrade !== undefined ? col.actualMaxGrade : 100),
                                  minPassPercentage: minP,
                                  minTotalPassPercentage: minTotalP,
                                  maxGrade: maxTotal,
                                  learningOutcomesType: editFieldLearningOutcomes
                                } : col);
                                localStorage.setItem(`${stage}_${selectedGrade}_assessments_custom_cols`, JSON.stringify(updated));
                                return updated;
                              });

                              if (['arabic', 'english'].includes(fieldToEdit!)) {
                                setDefaultSubjectsOverrides(prev => {
                                  const nextOvr = {
                                    ...prev,
                                    [fieldToEdit!]: {
                                      ...prev[fieldToEdit!],
                                      label: editLabel,
                                      labelEn: cleanEn || undefined,
                                      isAddedToTotal: editFieldIsAddedToTotal,
                                      maxAssessmentsGrade: maxA,
                                      maxWrittenGrade: maxW,
                                      hasWrittenExam: editFieldHasWrittenExam,
                                      actualMaxGrade: editFieldActualMaxGrade.trim() && !isNaN(parseFloat(editFieldActualMaxGrade)) ? parseFloat(editFieldActualMaxGrade) : 100,
                                      minPassPercentage: minP,
                                      minTotalPassPercentage: minTotalP,
                                      maxGrade: maxTotal,
                                      learningOutcomesType: editFieldLearningOutcomes
                                    }
                                  };
                                  localStorage.setItem(`${stage}_${selectedGrade}_assessments_default_overrides`, JSON.stringify(nextOvr));
                                  return nextOvr;
                                });
                              }
                              setIsEditFieldFormOpen(false);
                            }
                          }
                        }} className="relative w-full h-full px-6 py-4 rounded-[9px] font-bold text-white bg-[linear-gradient(45deg,#f59e0b,#fbbf24,#f59e0b)] bg-[length:200%_200%] animate-shine hover:opacity-90 transition-all shadow-md text-lg">حفظ</button>
                      </div>
                    </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></PortalModal>

      <PortalModal><AnimatePresence>
        {isDeleteFieldModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsDeleteFieldModalOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-[4px] flex flex-col" 
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="absolute inset-[-100%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />
              <div className="relative bg-[linear-gradient(135deg,#ffe4e6,#ffedd5,#fee2e2,#ffe4e6)] bg-[length:300%_300%] animate-shine rounded-[26px] w-full h-full border border-white/60 relative z-10">
                <div className="p-6 md:p-8">
                  <motion.h3 animate={{ rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="text-2xl text-center font-bold text-rose-950 mb-5 drop-shadow-sm relative z-10">{(t as any).selectSubjectToDelete}</motion.h3>
                  <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto pr-2 pl-1 custom-scrollbar mb-6 relative z-10">
                    {deletableCols.length === 0 ? (
                      <p className="text-center text-rose-400 py-4 font-bold">لا توجد مواد قابلة للحذف</p>
                    ) : (
                      deletableCols.map(c => (
                        <div key={c.key} className="relative p-[2px] rounded-xl overflow-hidden group shadow-sm shrink-0">
                          <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_50%,rgba(225,29,72,0.35)_100%)] pointer-events-none" />
                          <button 
                            onClick={() => {
                              setFieldToDelete(c.key);
                              setIsDeleteFieldModalOpen(false);
                              setIsConfirmDeleteModalOpen(true);
                            }}
                            className="relative w-full min-h-[46px] flex items-center justify-center text-center px-4 py-2.5 bg-white/95 hover:bg-white rounded-[10px] font-bold text-rose-950 hover:text-rose-700 transition-all shadow-sm"
                          >
                            <span className="text-base font-bold text-rose-950 leading-relaxed truncate px-1">{c.label}</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex justify-end relative z-10">
                    <div className="relative p-[2px] rounded-xl overflow-hidden group shrink-0">
                      <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,#000_0%,#fff_50%,#000_100%)] pointer-events-none opacity-40" />
                      <button onClick={() => setIsDeleteFieldModalOpen(false)} className="relative min-h-[42px] flex items-center justify-center px-6 py-2 rounded-[10px] font-bold text-rose-950 bg-white/95 hover:bg-white transition-all shadow-sm text-base">
                        <span>{(t as any).cancel}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></PortalModal>

      <PortalModal><AnimatePresence>
        {isConfirmDeleteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => {
              setIsConfirmDeleteModalOpen(false);
              setFieldToDelete(null);
            }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-[4px] flex flex-col text-center" 
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="absolute inset-[-100%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />
              <div className="relative bg-[linear-gradient(135deg,#ffe4e6,#ffedd5,#fee2e2,#ffe4e6)] bg-[length:300%_300%] animate-shine rounded-[26px] w-full h-full border border-white/60 relative z-10">
                <div className="p-8">
                  <div className="w-20 h-20 rounded-full bg-white/80 flex items-center justify-center mx-auto mb-6 text-rose-500 shadow-inner border border-rose-100 relative z-10">
                    <Trash2 className="w-10 h-10 drop-shadow-sm" />
                  </div>
                  <motion.h3 animate={{ rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="text-2xl text-center font-bold text-rose-950 mb-3 drop-shadow-sm relative z-10 whitespace-nowrap">{(t as any).confirmDeleteSubject}</motion.h3>
                  {fieldToDelete && (
                    <div className="relative p-[3px] rounded-xl overflow-hidden mb-8 shadow-sm relative z-10 mx-auto w-full">
                      <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_50%,rgba(0,0,0,0.3)_100%)] pointer-events-none" />
                      <p className="relative text-rose-800 font-bold text-xl bg-white/90 backdrop-blur-sm rounded-[9px] py-3 px-4 whitespace-nowrap overflow-hidden text-ellipsis">
                        {deletableCols.find(c => c.key === fieldToDelete)?.label || ''}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-center gap-3 relative z-10">
                    <div className="flex-1 relative p-[3px] rounded-xl overflow-hidden group">
                      <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,#000_0%,#fff_50%,#000_100%)] pointer-events-none opacity-50" />
                      <button 
                        onClick={() => {
                          setIsConfirmDeleteModalOpen(false);
                          setFieldToDelete(null);
                        }} 
                        className="relative w-full h-full px-5 py-3.5 rounded-[9px] font-bold text-rose-800 bg-white/90 hover:bg-white transition-all shadow-sm"
                      >
                        {(t as any).no}
                      </button>
                    </div>
                    <div className="flex-1 relative p-[3px] rounded-xl overflow-hidden group">
                      <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,#000_0%,#fff_50%,#000_100%)] pointer-events-none" />
                      <button 
                        onClick={() => {
                          if (fieldToDelete) {
                            setCustomCols(prev => prev.filter(c => c.key !== fieldToDelete));
                          }
                          setIsConfirmDeleteModalOpen(false);
                          setFieldToDelete(null);
                        }} 
                        className="relative w-full h-full px-5 py-3.5 rounded-[9px] font-bold text-white bg-[linear-gradient(45deg,#ef4444,#f43f5e,#ef4444)] bg-[length:200%_200%] animate-shine hover:opacity-90 transition-all shadow-md"
                      >
                        {(t as any).yes}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></PortalModal>

      {/* Instructions Modal Overlay */}
      <PortalModal><AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-900/70 backdrop-blur-sm [perspective:1000px]"
            onClick={() => setShowInstructions(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, rotateX: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, rotateX: -10, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-3xl flex flex-col max-h-[90vh] rounded-[26px] p-[4px] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-[-100%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />
              
              <div className="relative z-10 w-full p-6 md:p-8 rounded-[22px] bg-white bg-[linear-gradient(to_right,rgba(254,240,138,0.75),rgba(250,204,21,0.75),rgba(234,179,8,0.75),rgba(250,204,21,0.75),rgba(254,240,138,0.75))] bg-[length:200%_auto] animate-shine flex flex-col items-center gap-6">
                <div className="w-16 h-16 flex items-center justify-center shrink-0">
                  <Info className="w-8 h-8 text-black" />
                </div>
                
                <div className="text-yellow-950 text-sm md:text-base font-bold leading-relaxed space-y-4 w-full text-justify" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).sortInst1}</span></p>
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).sortInst2}</span></p>
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).sortInst3}</span></p>
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).sortInst4}</span></p>
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).assessInst5}</span></p>
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).sortInst6}</span></p>
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).assessInst7}</span></p>
                </div>

                <div className="flex justify-center w-full mt-2">
                  <div className="relative p-[3px] rounded-xl overflow-hidden group">
                    <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_50%,#ffffff_100%)] pointer-events-none" />
                    <button
                      onClick={() => setShowInstructions(false)}
                      className="relative flex items-center gap-2 px-8 py-3 bg-yellow-950 text-yellow-100 font-bold rounded-[9px] hover:bg-yellow-900 transition-colors shadow-md active:scale-95"
                    >
                      <Check className="w-5 h-5" />
                      {lang === 'ar' ? 'حسنا' : 'Got it'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></PortalModal>

      <PortalModal><AnimatePresence>
        {isColorModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsColorModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: 90 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: -90 }}
              className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-[552px] z-10"
            >
              <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-3px', animationDuration: '15s' }}></div>
              <div className="bg-white rounded-[22px] p-5 flex flex-col items-center gap-2.5 relative z-10">
                <div className="w-full flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-indigo-600" />
                    ألوان جداول التحرير والرصد
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsColorModalOpen(false)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <RowThemeSelector
                  title="اختر لون خلفية الصفوف المتبادل مع اللون الأبيض فى جداول التحرير والرصد"
                  storageKey="assessments_grades_row_theme"
                  defaultTheme={editingRowTheme}
                  onThemeChange={(theme) => {
                    setEditingRowTheme(theme);
                    setTimeout(() => setIsColorModalOpen(false), 160);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence></PortalModal>

      {!isKindergarten && (
        <GradingSettingsModal
          isOpen={isGradingSettingsModalOpen}
          onClose={() => setIsGradingSettingsModalOpen(false)}
          lang={lang}
          stage={stage}
          semester={semester}
          selectedGrade={selectedGrade}
          students={localData}
          customCols={customCols}
          defaultSubjectsOverrides={defaultSubjectsOverrides}
          onSaved={(newSettings) => setGradingSettings(newSettings)}
        />
      )}

      <SeatNumbersModal
        isOpen={isSeatNumbersModalOpen}
        onClose={() => setIsSeatNumbersModalOpen(false)}
        isEnglish={isSeatNumbersEnglish}
        onSelectModel={async (modelReportType) => {
          setIsSeatNumbersModalOpen(false);
          await executePrintOption(modelReportType);
        }}
      />
      <PasswordModal
        isOpen={showSeatNumbersPasswordModal}
        onClose={() => setShowSeatNumbersPasswordModal(false)}
        onSuccess={() => {
          localStorage.setItem('sheet_control_seat_numbers_unlocked_for_id', String(getDeviceId()));
          localStorage.removeItem('sheet_control_seat_numbers_random_id');
          setShowSeatNumbersPasswordModal(false);
          setIsSeatNumbersModalOpen(true);
        }}
        deviceIdOverride={seatNumbersRandomId}
        isVipOption={true}
        vipOptionTitle="VIP Option"
        customWhatsappMessage="السلام عليكم .. أود تحميل ارقام الجلوس باللغة الانجليزية - معرف جهازي : ID : x"
        skipActivation={true}
      />

      <CustomControlSheetModal
        isOpen={isCustomControlSheetModalOpen}
        onClose={() => setIsCustomControlSheetModalOpen(false)}
        stage={stage}
        selectedGrade={selectedGrade}
        semester={semester === 'second' ? 'second' : 'first'}
        onConfirm={async (options) => {
          await executePrintOption('custom_control_sheet', undefined, options);
        }}
      />

      <GradingSettingsModal
        mercyOnly
        isOpen={isMercyPrintModalOpen}
        onClose={() => {
          setIsMercyPrintModalOpen(false);
          executePrintOption('mercy_grades_students');
        }}
        lang={lang}
        stage={stage}
        semester={semester}
        selectedGrade={selectedGrade}
        students={localData}
        customCols={customCols}
        defaultSubjectsOverrides={defaultSubjectsOverrides}
        onSaved={(newSettings) => setGradingSettings(newSettings)}
      />

      {hoveredNotesTooltip && (hoveredNotesTooltip.text || hoveredNotesTooltip.subjectsTitle) && (
        <>
          {/* Backdrop to close on click outside */}
          <div 
            className="fixed inset-0 z-[99998] bg-black/40 backdrop-blur-[2px] transition-opacity cursor-pointer"
            onClick={() => setHoveredNotesTooltip(null)}
          />
          <div 
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(780px, 94vw)',
              maxWidth: '780px',
              zIndex: 99999,
              pointerEvents: 'auto'
            }}
            dir="rtl"
          >
          <style>{`
            .tooltip-scrollbar {
              scrollbar-gutter: stable;
            }
            .tooltip-scrollbar::-webkit-scrollbar {
              width: 10px !important;
              display: block !important;
            }
            .tooltip-scrollbar::-webkit-scrollbar-track {
              background: #0f172a !important;
              border-radius: 8px !important;
              margin: 4px 0 !important;
            }
            .tooltip-scrollbar::-webkit-scrollbar-thumb {
              background: linear-gradient(180deg, #f59e0b, #d97706) !important;
              border-radius: 8px !important;
              border: 2px solid #0f172a !important;
            }
            .tooltip-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #fbbf24 !important;
            }
            @keyframes tooltip-marquee-ltr {
              0% {
                transform: translate3d(0, 0, 0);
              }
              100% {
                transform: translate3d(var(--marquee-distance, 1000px), 0, 0);
              }
            }
          `}</style>
          <div className="relative rounded-2xl p-[3px] overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.92),0_0_40px_rgba(234,179,8,0.35)] animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute inset-[-150%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,#ca8a04_0%,#fbbf24_20%,#fef08a_35%,#ca8a04_50%,#fbbf24_70%,#fef08a_85%,#ca8a04_100%)] pointer-events-none" />
            <div 
              className="relative bg-slate-950/98 backdrop-blur-xl text-white rounded-[14px] p-4 md:p-5 text-right leading-relaxed max-h-[75vh] overflow-y-auto border border-amber-400/40 tooltip-scrollbar"
              style={{
                scrollbarWidth: 'auto',
                scrollbarColor: '#f59e0b #0f172a'
              }}
            >
              
              {/* Header Title: كتابة 'مواد الدور الثاني' في أعلى مربع التلميح وتحته المرحلة - الصف - الفصل الدراسي الثانى - اسم الطالب - رقم الجلوس - الرقم السري */}
              <div className="flex flex-col items-center justify-center border-b border-amber-400/30 pb-3 mb-4 gap-2 text-center">
                <div className="bg-amber-400/20 border border-amber-400/50 text-amber-200 px-6 py-1.5 rounded-xl text-base md:text-lg font-black shadow-sm text-center tracking-wide">
                  {hoveredNotesTooltip.headerTitle || (isKindergarten ? `مواد برامج علاجية ( ${hoveredNotesTooltip.lines?.length || 0} )` : `مواد الدور الثانى ( ${hoveredNotesTooltip.lines?.length || 0} )`)}
                </div>
                {(() => {
                  const stageLabel = (() => {
                    if (lang === 'ar') {
                      if (stage === 'kindergarten') return 'المرحلة : رياض أطفال';
                      if (stage === 'primary') return 'المرحلة الابتدائية';
                      if (stage === 'middle') return 'المرحلة الإعدادية';
                      if (stage === 'secondary') {
                        const isSecondSec = selectedGrade === 'الصف الثاني' || selectedGrade?.includes('الثاني') || selectedGrade?.toLowerCase().includes('2nd');
                        return isSecondSec ? 'المرحلة الثانوية' : 'المرحلة الثانوية - البكالوريا';
                      }
                      if (stage === 'commercial_technical') return 'المرحلة : التعليم الفنى التجارى';
                      if (stage === 'industrial_technical') return 'المرحلة : التعليم الفنى الصناعى';
                      if (stage === 'agricultural_technical') return 'المرحلة : التعليم الفنى الزراعى';
                      if (stage === 'hotel_technical') return 'المرحلة : التعليم الفنى الفندقى';
                    }
                    const stageKey = (stage || '').replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                    return (t as any)[stageKey] || stage || '';
                  })();

                  const gradeLabel = lang === 'ar'
                    ? (selectedGrade || '').replace(' الابتدائي', '').replace(' الإعدادي', '').replace(' الثانوي', '').trim()
                    : (selectedGrade || '').trim();

                  const semesterLabel = (() => {
                    if (semester === 'first' || semester === 'الفصل الدراسي الأول') return t.firstSemester || 'الفصل الدراسي الأول';
                    if (semester === 'second' || semester === 'الفصل الدراسي الثاني' || semester === 'الفصل الدراسي الثانى') return t.secondSemester || 'الفصل الدراسي الثانى';
                    if (semester === 'retake' || semester === 'الدور الثانى' || semester === 'الدور الثاني') return (t as any).secondSession || 'الدور الثانى';
                    return t.secondSemester || 'الفصل الدراسي الثانى';
                  })();

                  const isNameAllowed = isKindergarten ? true : (gradingSettings ? Boolean(gradingSettings.showName) : true);
                  const isSeatNumberAllowed = !isKindergarten && (gradingSettings ? Boolean(gradingSettings.showSeatNumber) : true);
                  const isSecretNumberAllowed = !isKindergarten && (gradingSettings ? Boolean(gradingSettings.showSecretNumber) : true);

                  const parts: string[] = [];
                  if (stageLabel) parts.push(stageLabel);
                  if (gradeLabel) parts.push(gradeLabel);
                  if (semesterLabel) parts.push(semesterLabel);
                  if (isNameAllowed && hoveredNotesTooltip.studentName) {
                    parts.push(hoveredNotesTooltip.studentName);
                  }
                  if (isSeatNumberAllowed && hoveredNotesTooltip.seatNumber) {
                    parts.push(hoveredNotesTooltip.seatNumber);
                  }
                  if (isSecretNumberAllowed && hoveredNotesTooltip.secretNumber) {
                    parts.push(hoveredNotesTooltip.secretNumber);
                  }
                  if (parts.length === 0) return null;
                  return (
                    <div className="text-white text-xs md:text-sm font-bold text-center tracking-wide drop-shadow-sm">
                      {parts.join(' - ')}
                    </div>
                  );
                })()}
              </div>

              {/* بطاقات المواد بخطوط كبيرة ومسافات حول الأقواس والفواصل والنقطتين وبدون نقطتين بعد اسم المادة */}
              <div className="flex flex-col gap-3">
                {(() => {
                  const subjectThemes = [
                    {
                      nameColor: 'text-[#38bdf8]',
                      bodyColor: 'text-sky-100',
                      borderSide: 'border-r-[#38bdf8]',
                      cardBg: 'bg-gradient-to-l from-sky-950/50 via-slate-900/70 to-slate-950/80',
                      badgeBg: 'bg-sky-500/20 text-[#38bdf8] border-sky-400/40'
                    },
                    {
                      nameColor: 'text-[#facc15]',
                      bodyColor: 'text-amber-100',
                      borderSide: 'border-r-[#facc15]',
                      cardBg: 'bg-gradient-to-l from-amber-950/50 via-slate-900/70 to-slate-950/80',
                      badgeBg: 'bg-amber-500/20 text-[#facc15] border-amber-400/40'
                    },
                    {
                      nameColor: 'text-[#4ade80]',
                      bodyColor: 'text-emerald-100',
                      borderSide: 'border-r-[#4ade80]',
                      cardBg: 'bg-gradient-to-l from-emerald-950/50 via-slate-900/70 to-slate-950/80',
                      badgeBg: 'bg-emerald-500/20 text-[#4ade80] border-emerald-400/40'
                    },
                    {
                      nameColor: 'text-[#fb7185]',
                      bodyColor: 'text-rose-100',
                      borderSide: 'border-r-[#fb7185]',
                      cardBg: 'bg-gradient-to-l from-rose-950/50 via-slate-900/70 to-slate-950/80',
                      badgeBg: 'bg-rose-500/20 text-[#fb7185] border-rose-400/40'
                    },
                    {
                      nameColor: 'text-[#c084fc]',
                      bodyColor: 'text-purple-100',
                      borderSide: 'border-r-[#c084fc]',
                      cardBg: 'bg-gradient-to-l from-purple-950/50 via-slate-900/70 to-slate-950/80',
                      badgeBg: 'bg-purple-500/20 text-[#c084fc] border-purple-400/40'
                    },
                    {
                      nameColor: 'text-[#fb923c]',
                      bodyColor: 'text-orange-100',
                      borderSide: 'border-r-[#fb923c]',
                      cardBg: 'bg-gradient-to-l from-orange-950/50 via-slate-900/70 to-slate-950/80',
                      badgeBg: 'bg-orange-500/20 text-[#fb923c] border-orange-400/40'
                    },
                    {
                      nameColor: 'text-[#2dd4bf]',
                      bodyColor: 'text-teal-100',
                      borderSide: 'border-r-[#2dd4bf]',
                      cardBg: 'bg-gradient-to-l from-teal-950/50 via-slate-900/70 to-slate-950/80',
                      badgeBg: 'bg-teal-500/20 text-[#2dd4bf] border-teal-400/40'
                    },
                    {
                      nameColor: 'text-[#e879f9]',
                      bodyColor: 'text-fuchsia-100',
                      borderSide: 'border-r-[#e879f9]',
                      cardBg: 'bg-gradient-to-l from-fuchsia-950/50 via-slate-900/70 to-slate-950/80',
                      badgeBg: 'bg-fuchsia-500/20 text-[#e879f9] border-fuchsia-400/40'
                    }
                  ];

                  const rawLines = hoveredNotesTooltip.lines && hoveredNotesTooltip.lines.length > 0 
                    ? hoveredNotesTooltip.lines 
                    : (hoveredNotesTooltip.text ? hoveredNotesTooltip.text.split('\n') : []);

                  return rawLines.map((line, lIdx) => {
                    const theme = subjectThemes[lIdx % subjectThemes.length];
                    const colonIndex = line.indexOf(':');
                    const hasColon = colonIndex !== -1;
                    const rawPrefix = hasColon ? line.substring(0, colonIndex).trim() : '';
                    const rawExplanation = hasColon ? line.substring(colonIndex + 1).trim() : line;
                    const subjectPrefix = formatPunctuationSpacing(rawPrefix.replace(/[:：]/g, '').trim());
                    const explanationText = formatPunctuationSpacing(rawExplanation.replace(/^[\s:：]+/, '').trim());

                    return (
                      <div 
                        key={lIdx}
                        className={`relative rounded-xl p-3.5 md:p-4 border-r-4 ${theme.borderSide} ${theme.cardBg} border border-white/10 shadow-lg flex flex-col gap-2 transition-all`}
                      >
                        {hasColon ? (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-base md:text-lg font-black ${theme.nameColor} bg-white/10 px-3 py-1 rounded-lg border border-white/10 shadow-inner`}>
                                {subjectPrefix}
                              </span>
                            </div>
                            <div className="w-full overflow-hidden pr-1">
                              <TooltipMarqueeText
                                text={explanationText}
                                className={`text-sm md:text-base font-bold ${theme.nameColor} leading-relaxed`}
                                align="right"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="w-full overflow-hidden">
                            <TooltipMarqueeText
                              text={formatPunctuationSpacing(line.replace(/[:：]/g, ' '))}
                              className={`text-sm md:text-base font-bold ${theme.nameColor} leading-relaxed`}
                              align="right"
                            />
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

            </div>
          </div>
        </div>
        </>
      )}

      {hoveredActualGradeTooltip && (
        <ActualGradeTooltip
          x={hoveredActualGradeTooltip.x}
          y={hoveredActualGradeTooltip.y}
          text={hoveredActualGradeTooltip.text}
        />
      )}

      {/* Subject English Name Modal */}
      <PortalModal>
        <AnimatePresence>
          {subjectEnModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
              onClick={() => setSubjectEnModal(null)}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 12 }}
                transition={{ duration: 0.25, type: 'spring', bounce: 0.25 }}
                className="relative w-full max-w-md rounded-3xl border-2 border-slate-900 overflow-hidden shadow-2xl p-[6px] bg-slate-900"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute inset-[-100%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(from_0deg,#a855f7_0%,#ffffff_25%,#3b82f6_50%,#ffffff_75%,#a855f7_100%)] pointer-events-none" />

                <div className="relative z-10 w-full p-6 rounded-2xl bg-white flex flex-col gap-5" dir="rtl">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white border border-slate-900 flex items-center justify-center shadow-sm shrink-0">
                        <Languages className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          تحرير اسم المادة باللغة الإنجليزية
                        </h3>
                        <p className="text-xs font-bold text-purple-700">
                          {subjectEnModal.arName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5" dir="ltr">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-extrabold text-slate-700 text-left">
                        Subject Name ( in English )
                      </label>
                      <span className="text-[11px] font-bold text-slate-400">
                        {tempSubjectNameEn.length} / 40
                      </span>
                    </div>
                    <input
                      type="text"
                      dir="ltr"
                      autoFocus
                      maxLength={40}
                      value={tempSubjectNameEn}
                      onChange={(e) => setTempSubjectNameEn(capitalizeEachWord(e.target.value.slice(0, 40)))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveSubjectEn();
                        }
                      }}
                      placeholder="e.g. Mathematics, Science, English..."
                      className="w-full bg-white border-[1.5px] border-slate-900 rounded-xl py-3 px-4 text-left font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-inner text-sm"
                    />
                  </div>

                  <p className="text-[11px] font-bold text-slate-500 leading-relaxed text-right">
                    سيتم حفظ واستخدام اسم المادة باللغة الإنجليزية في الشهادات والتقارير المطبوعة باللغة الإنجليزية.
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveSubjectEn}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 px-5 rounded-xl border-[1.5px] border-slate-900 shadow-md transition-all active:scale-95"
                    >
                      <Check className="w-5 h-5" />
                      <span>حفظ</span>
                    </button>
                    {tempSubjectNameEn.trim() && (
                      <button
                        type="button"
                        onClick={() => setTempSubjectNameEn('')}
                        title="مسح الاسم الإنجليزي"
                        className="px-3.5 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border-[1.5px] border-amber-300 transition-all text-xs"
                      >
                        مسح
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSubjectEnModal(null)}
                      className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border-[1.5px] border-slate-900 transition-all active:scale-95 text-sm"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </PortalModal>

      <AdvancedStatsModal
        isOpen={isAdvancedStatsModalOpen}
        onClose={() => setIsAdvancedStatsModalOpen(false)}
        students={localData}
        stage={stage}
        selectedGrade={selectedGrade}
        semester={semester}
        schoolName={title}
        administration=""
        lang={lang}
      />

      <TopTenCertificatesModal
        isOpen={isTopTenCertModalOpen}
        onClose={() => setIsTopTenCertModalOpen(false)}
        students={filteredData}
        stage={stage}
        selectedGrade={selectedGrade}
        semester={semester}
        isDamgOnly={isTopTenCertDamg}
      />

      <AllStudentsCertificatesModal
        isOpen={isAllStudentsCertModalOpen}
        onClose={() => setIsAllStudentsCertModalOpen(false)}
        students={data}
        stage={stage}
        selectedGrade={selectedGrade}
        semester={semester}
      />

      <PasswordModal
        isOpen={showEnglishCertPasswordModal}
        onClose={() => setShowEnglishCertPasswordModal(false)}
        onSuccess={() => {
          localStorage.setItem('sheet_control_english_cert_unlocked_for_id', String(getDeviceId()));
          localStorage.removeItem('sheet_control_english_cert_random_id');
          setShowEnglishCertPasswordModal(false);
          if (pendingEnglishReportType) {
            executePrintOption(pendingEnglishReportType);
            setPendingEnglishReportType(null);
          }
        }}
        deviceIdOverride={englishCertRandomId}
        skipActivation={true}
        isVipOption={true}
        vipOptionTitle="VIP Option"
        customWhatsappMessage="السلام عليكم .. أود تحميل شهادات باللغة الانجليزية - معرف جهازي : ID : x"
      />

      <PasswordModal
        isOpen={showCustomSheetPasswordModal}
        onClose={() => setShowCustomSheetPasswordModal(false)}
        onSuccess={() => {
          localStorage.setItem('sheet_control_custom_sheet_unlocked_for_id', String(getDeviceId()));
          localStorage.removeItem('sheet_control_custom_sheet_random_id');
          setShowCustomSheetPasswordModal(false);
          setIsCustomControlSheetModalOpen(true);
        }}
        deviceIdOverride={customSheetRandomId}
        skipActivation={true}
        isVipOption={true}
        vipOptionTitle="VIP Option"
        customWhatsappMessage="السلام عليكم .. أود تفعيل تخصيص شيت كنترول - معرف جهازي :"
      />

      <PasswordModal
        isOpen={showBlankSheetPasswordModal}
        onClose={() => setShowBlankSheetPasswordModal(false)}
        onSuccess={() => {
          localStorage.setItem('sheet_control_blank_sheet_unlocked_for_id', String(getDeviceId()));
          localStorage.removeItem('sheet_control_blank_sheet_random_id');
          setShowBlankSheetPasswordModal(false);
          handlePrintOption('blank_control_sheet');
        }}
        deviceIdOverride={blankSheetRandomId}
        skipActivation={true}
        isVipOption={true}
        vipOptionTitle="VIP Option"
        customWhatsappMessage="السلام عليكم .. أود تفعيل شيت كنترول فارغ - معرف جهازي :"
      />

      <PasswordModal
        isOpen={showCertificatesPasswordModal}
        onClose={() => setShowCertificatesPasswordModal(false)}
        onSuccess={() => {
          const currentMainId = getDeviceId();
          localStorage.setItem('sheet_control_certificates_unlocked_for_id', String(currentMainId));
          setShowCertificatesPasswordModal(false);
          setIsCertSelectionModalOpen(true);
        }}
        deviceIdOverride={certificatesRandomId}
        skipActivation={true}
        isVipOption={true}
        vipOptionTitle="شهادات التقدير"
        customWhatsappMessage="السلام عليكم .. أود تحميل شهادات التقدير - معرف جهازي : ID : x"
      />

      {/* Download Success Toast Notification */}
      <AnimatePresence>
        {showDownloadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-[linear-gradient(to_right,#059669,#10b981,#059669)] bg-[length:200%_auto] animate-shine text-white font-bold text-base sm:text-lg border-2 border-slate-900 shadow-2xl"
            dir="rtl"
          >
            <div className="w-7 h-7 rounded-full bg-white text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
              <Check className="w-5 h-5" strokeWidth={3} />
            </div>
            <span>تم تنزيل الملف بنجاح</span>
          </motion.div>
        )}
      </AnimatePresence>
      <CertificatesSelectionModal
        isOpen={isCertSelectionModalOpen}
        onClose={() => setIsCertSelectionModalOpen(false)}
        onSelectTopTen={() => handlePrintOption('top_ten_students_certificates')}
        onSelectTopTenDamg={() => handlePrintOption('top_ten_damg_students_certificates')}
        onSelectAllStudents={() => handlePrintOption('all_students_certificates' as any)}
      />
    </motion.div>
  );
};
