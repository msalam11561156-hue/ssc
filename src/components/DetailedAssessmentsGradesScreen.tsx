import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Search, 
  Printer, 
  BookOpen, 
  Layers, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Sparkles, 
  RotateCcw,
  Palette,
  FileSpreadsheet,
  ChevronDown,
  Check,
  Menu,
  Info,
  Edit,
  PenTool,
  X,
  BarChart3,
  Award,
  Trophy
} from 'lucide-react';
import { ActionMenuButton } from './ActionMenuButton';
import { TopTenCertificatesModal } from './TopTenCertificatesModal';
import { AllStudentsCertificatesModal } from './AllStudentsCertificatesModal';
import { CertificatesSelectionModal } from './CertificatesSelectionModal';
import { AdvancedStatsModal } from './AdvancedStatsModal';
import { StudentData, Language, EducationalStage, DetailedAssessmentItem } from '../types';
import { RowThemeSelector, getTableRowColorStyle } from './RowThemeSelector';
import { RowBgTheme, getSubjectsConfigForStageGrade } from '../utils/exportPdf';
import { ensureCellVisible } from '../utils/cellNavigation';
import {
  exportSubjectDetailedAssessmentsPdf,
  exportDetailedAssessmentsCertificatesPdf,
  exportStudentSemesterGradesCertificatePdf,
  distributeTotalToDetailedAssessment,
  isSubjectWithoutWrittenExam
} from '../utils/detailedAssessmentsHelper';
import { exportKgStudentEvaluationsReportPdf } from '../utils/exportPdf';
import { SortButtonMenu } from './SortButtonMenu';
import { sortStudents } from '../utils/studentSorting';
import { PasswordModal } from './PasswordModal';
import { isPaidUnlocked, getDeviceId } from '../utils/activationManager';

interface SubjectInfo {
  key: string;
  label: string;
  maxGrade?: number;
  hasWrittenExam?: boolean;
  learningOutcomesType?: 'pass_fail' | 'grades';
}

interface DetailedAssessmentsGradesScreenProps {
  stage: EducationalStage;
  selectedGrade: string;
  currentSubjectKey?: string;
  onSubjectChange?: (subjectKey: string) => void;
  lang: Language;
  title: string;
  semester: string;
  data: StudentData[];
  onChange: (data: StudentData[]) => void;
  onBack: () => void;
  onNavigateToGeneralAssessments?: () => void;
  onEditData?: (targetSemester?: string) => void;
  onEditWrittenExams?: (targetSemester?: string) => void;
  onNavigateToSection?: (targetStep: number, targetSemester: string) => void;
  schoolName?: string;
  schoolNameEn?: string;
  administration?: string;
  administrationEn?: string;
  schoolLogo?: string;
  dataOfficer?: string;
  dataOfficerEn?: string;
  controlHead?: string;
  controlHeadEn?: string;
  committeeHead?: string;
  committeeHeadEn?: string;
  sortBy?: { id: string; direction: 'asc' | 'desc' }[];
  onSortChange?: (newSort: { id: string; direction: 'asc' | 'desc' }[]) => void;
  systemType?: 'regular' | 'homeschool' | string;
  secondarySystem?: 'old' | 'modern';
  isTrialMode?: boolean;
}

const PortalModal = ({ children }: { children: React.ReactNode }) => {
  return typeof document !== 'undefined' ? createPortal(children, document.body) : <>{children}</>;
};

/**
 * Centers the active cell in the middle of the screen (both inside scrollable container and viewport window).
 */
const centerActiveCellInView = (el: HTMLElement | null) => {
  if (!el) return;

  const run = () => {
    const container =
      (el.closest('.overflow-auto') as HTMLElement) ||
      (el.closest('div[class*="overflow"]') as HTMLElement);
    if (!container) return;

    const td = (el.closest('td, th') as HTMLElement) || el;
    const containerRect = container.getBoundingClientRect();
    const cellRect = td.getBoundingClientRect();

    // 1. Center vertically inside the scrollable container (accounting for sticky thead)
    const thead = container.querySelector('thead');
    const theadBottom = thead ? thead.getBoundingClientRect().bottom : containerRect.top;
    const availableHeight = containerRect.bottom - theadBottom;
    if (availableHeight > 0) {
      const targetCenterY = theadBottom + availableHeight / 2;
      const cellCenterY = cellRect.top + cellRect.height / 2;
      const deltaY = cellCenterY - targetCenterY;
      if (Math.abs(deltaY) > 2) {
        container.scrollTop += deltaY;
      }
    }

    // 2. Center horizontally inside the scrollable container (accounting for sticky columns in RTL)
    const isRtl = window.getComputedStyle(container).direction === 'rtl' || document.dir === 'rtl';
    const stickyCols = container.querySelectorAll<HTMLElement>(
      'thead th.sticky-col, thead th[class*="sticky"], tbody tr:first-child td.sticky, tbody tr:first-child td[class*="sticky"]'
    );

    let stickyBoundary = isRtl ? containerRect.right : containerRect.left;
    stickyCols.forEach(col => {
      const style = window.getComputedStyle(col);
      if (style.position === 'sticky') {
        const r = col.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          if (isRtl && r.left < stickyBoundary && r.right > containerRect.left + 20) {
            stickyBoundary = r.left;
          } else if (!isRtl && r.right > stickyBoundary && r.left < containerRect.right - 20) {
            stickyBoundary = r.right;
          }
        }
      }
    });

    const scrollbarWidth = Math.max(0, container.offsetWidth - container.clientWidth);
    const visibleLeft = isRtl ? containerRect.left + scrollbarWidth : stickyBoundary;
    const visibleRight = isRtl ? stickyBoundary : containerRect.right - scrollbarWidth;
    const availableWidth = visibleRight - visibleLeft;

    if (availableWidth > 0) {
      const targetCenterX = visibleLeft + availableWidth / 2;
      const cellCenterX = cellRect.left + cellRect.width / 2;
      const deltaX = cellCenterX - targetCenterX;
      if (Math.abs(deltaX) > 2) {
        container.scrollLeft += deltaX;
      }
    }

    // 3. Center cell vertically inside the main browser window if needed
    const updatedCellRect = td.getBoundingClientRect();
    const windowCenterY = window.innerHeight / 2;
    const currentCellCenterY = updatedCellRect.top + updatedCellRect.height / 2;
    const windowDeltaY = currentCellCenterY - windowCenterY;
    if (Math.abs(windowDeltaY) > 25) {
      window.scrollBy({ top: windowDeltaY, behavior: 'auto' });
    }
  };

  run();
  requestAnimationFrame(run);
  setTimeout(run, 30);
  setTimeout(run, 80);
};

export const DetailedAssessmentsGradesScreen: React.FC<DetailedAssessmentsGradesScreenProps> = ({
  stage,
  selectedGrade,
  currentSubjectKey,
  onSubjectChange,
  lang,
  title,
  semester,
  data,
  onChange,
  onBack,
  onNavigateToGeneralAssessments,
  onEditData,
  onEditWrittenExams,
  onNavigateToSection,
  schoolName = '',
  schoolNameEn = '',
  administration = '',
  administrationEn = '',
  schoolLogo,
  dataOfficer = '',
  dataOfficerEn = '',
  controlHead = '',
  controlHeadEn = '',
  committeeHead = '',
  committeeHeadEn = '',
  sortBy: externalSortBy,
  onSortChange,
  systemType = 'regular',
  secondarySystem,
  isTrialMode = false,
}) => {
  const sortBy = externalSortBy || [];
  const isMiddle = stage === 'middle' || (stage as string) === 'prep';
  const isSecondary = stage === 'secondary';
  const isMiddleOrSecondary = isMiddle || isSecondary;
  const isKindergarten = stage === 'kindergarten';
  const isFirstSemester = semester === 'first' || semester === 'الفصل الدراسي الأول';

  // التحقق الخاص بالصف الثاني الثانوي - بكالوريا - النظام الحديث (فقط)
  const isSecondary2 = isSecondary && (
    selectedGrade?.includes('الثاني') ||
    selectedGrade?.includes('الثانى') ||
    selectedGrade?.toLowerCase().includes('2nd')
  );
  let isModernSec = secondarySystem === 'modern';
  if (!isModernSec && typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('sheet_control_school_data');
      if (saved && JSON.parse(saved)?.secondarySystem === 'modern') isModernSec = true;
    } catch {}
  }
  if (selectedGrade?.includes('modern') || selectedGrade?.includes('medical') || selectedGrade?.includes('engineering') || selectedGrade?.includes('business') || selectedGrade?.includes('arts')) {
    isModernSec = true;
  }
  const isSecondary2Modern = Boolean(isSecondary2 && isModernSec);
  const [localData, setLocalData] = useState<StudentData[]>(data || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSeatNumber, setShowSeatNumber] = useState(true);
  const [showSecretNumber, setShowSecretNumber] = useState(false);
  const [showThemeSelectorModal, setShowThemeSelectorModal] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isAdvancedStatsModalOpen, setIsAdvancedStatsModalOpen] = useState(false);
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const [isSubjectPrintModalOpen, setIsSubjectPrintModalOpen] = useState(false);
  const [isTopTenModalOpen, setIsTopTenModalOpen] = useState(false);
  const [isTopTenDamgModalOpen, setIsTopTenDamgModalOpen] = useState(false);
  const [isAllStudentsCertModalOpen, setIsAllStudentsCertModalOpen] = useState(false);
  const [isCertSelectionModalOpen, setIsCertSelectionModalOpen] = useState(false);
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

  const isOfficial = isPaidUnlocked();
  const [pendingPrintCallback, setPendingPrintCallback] = useState<(() => void) | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const lastSubjectStorageKey = useMemo(() => {
    return `detailed_assessments_last_subject_${stage}_${selectedGrade}`;
  }, [stage, selectedGrade]);

  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>(() => {
    if (currentSubjectKey) return currentSubjectKey;
    try {
      const savedSpecific = localStorage.getItem(`detailed_assessments_last_subject_${stage}_${selectedGrade}`);
      if (savedSpecific) return savedSpecific;
      const savedGeneral = localStorage.getItem('detailed_assessments_last_subject');
      if (savedGeneral) return savedGeneral;
    } catch {}
    return 'arabic';
  });

  // حفظ المادة الحالية لضمان استرجاعها فور العودة للشاشة
  const handleSelectSubject = (subjKey: string) => {
    setSelectedSubjectKey(subjKey);
    onSubjectChange?.(subjKey);
    try {
      localStorage.setItem(lastSubjectStorageKey, subjKey);
      localStorage.setItem(`detailed_assessments_last_subject_${stage}_${selectedGrade}`, subjKey);
      localStorage.setItem('detailed_assessments_last_subject', subjKey);
    } catch {}
  };

  // المزامنة الفورية عند تغير الخاصية currentSubjectKey القادمة من الشاشة الرئيسية
  useEffect(() => {
    if (currentSubjectKey && currentSubjectKey !== selectedSubjectKey) {
      setSelectedSubjectKey(currentSubjectKey);
    }
  }, [currentSubjectKey]);

  // حفظ وتمرير المادة المحددة عند تغييرها
  useEffect(() => {
    if (selectedSubjectKey) {
      onSubjectChange?.(selectedSubjectKey);
      try {
        localStorage.setItem(lastSubjectStorageKey, selectedSubjectKey);
        localStorage.setItem(`detailed_assessments_last_subject_${stage}_${selectedGrade}`, selectedSubjectKey);
        localStorage.setItem('detailed_assessments_last_subject', selectedSubjectKey);
      } catch {}
    }
  }, [selectedSubjectKey, lastSubjectStorageKey, stage, selectedGrade]);

  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const subjectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target as Node)) {
        setIsSubjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [editingRowTheme, setEditingRowTheme] = useState<RowBgTheme>(() => {
    const saved = localStorage.getItem('detailed_assessments_row_theme') || localStorage.getItem('editing_row_theme') || localStorage.getItem('editing_table_row_theme');
    if (saved && ['theme_red', 'theme_black', 'theme_white', 'attachment_1', 'attachment_2', 'attachment_3', 'attachment_4', 'theme_pink', 'theme_peach', 'theme_yellow'].includes(saved)) {
      return saved as RowBgTheme;
    }
    return 'attachment_1';
  });

  useEffect(() => {
    const handleStorageChange = (e: any) => {
      if (e.detail?.storageKey === 'detailed_assessments_row_theme' && e.detail?.theme) {
        setEditingRowTheme(e.detail.theme);
      }
    };
    window.addEventListener('row_theme_updated', handleStorageChange);
    return () => window.removeEventListener('row_theme_updated', handleStorageChange);
  }, []);

  useEffect(() => {
    setLocalData(data || []);
  }, [data]);

  // Determine subjects for the selected stage and grade
  const subjects: SubjectInfo[] = useMemo(() => {
    let resultList: SubjectInfo[] = [];

    // Check if custom cols are saved in localStorage
    const savedColsStr = localStorage.getItem(`${stage}_${selectedGrade}_assessments_custom_cols`);
    if (savedColsStr) {
      try {
        const parsed = JSON.parse(savedColsStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          resultList = parsed.map((c: any) => {
            const noWritten = c.hasWrittenExam === false || isSubjectWithoutWrittenExam({ key: c.key, label: c.label || c.name || c.key });
            return {
              key: c.key,
              label: c.label || c.name || c.key,
              maxGrade: noWritten ? (c.maxAssessmentsGrade || 100) : (c.maxAssessmentsGrade || c.maxGrade || (isMiddleOrSecondary ? 70 : 40)),
              hasWrittenExam: !noWritten,
              learningOutcomesType: c.learningOutcomesType || (c.key === 'religion' || c.key === 'pe' || c.key === 'art' || c.key === 'fields' || c.key === 'music' || c.key === 'tokkatsu' ? 'pass_fail' : 'grades')
            };
          });
        }
      } catch (e) {
        console.error('Failed to parse saved custom cols', e);
      }
    }

    if (resultList.length === 0) {
      if (stage === 'kindergarten') {
        const cfg = getSubjectsConfigForStageGrade(stage, selectedGrade);
        if (cfg.customCols && cfg.customCols.length > 0) {
          resultList = cfg.customCols.map(c => ({
            key: c.key,
            label: c.label,
            maxGrade: c.maxAssessmentsGrade ?? 100,
            hasWrittenExam: c.hasWrittenExam !== false,
          }));
        } else {
          resultList = [
            { key: 'arabic', label: 'اللغة العربية', maxGrade: 100 },
            { key: 'english', label: 'اللغة الإنجليزية', maxGrade: 100 },
            { key: 'multidisciplinary', label: 'متعدد التخصصات', maxGrade: 100 },
            { key: 'pe', label: 'التربية البدنية والصحية', maxGrade: 100 }
          ];
        }
      } else if (isSecondary) {
        const cfg = getSubjectsConfigForStageGrade(stage, selectedGrade);
        if (cfg.customCols && cfg.customCols.length > 0) {
          resultList = cfg.customCols.map(c => {
            const noWritten = c.hasWrittenExam === false || isSubjectWithoutWrittenExam(c, cfg.customCols);
            return {
              key: c.key,
              label: c.label,
              maxGrade: noWritten ? 100 : (c.maxAssessmentsGrade ?? 70),
              hasWrittenExam: !noWritten,
            };
          });
        } else {
          resultList = [
            { key: 'arabic', label: 'اللغة العربية', maxGrade: 70, hasWrittenExam: true },
            { key: 'english', label: 'اللغة الإنجليزية', maxGrade: 70, hasWrittenExam: true },
            { key: 'history', label: 'التاريخ', maxGrade: 70, hasWrittenExam: true },
            { key: 'math', label: 'الرياضيات', maxGrade: 70, hasWrittenExam: true },
            { key: 'integrated_sciences', label: 'العلوم المتكاملة', maxGrade: 70, hasWrittenExam: true },
            { key: 'philosophy_logic', label: 'الفلسفة والمنطق', maxGrade: 70, hasWrittenExam: true },
            { key: 'second_foreign_language', label: 'اللغة الاجنبية الثانية', maxGrade: 70, hasWrittenExam: true },
            { key: 'pe', label: 'التربية الرياضية', maxGrade: 100, hasWrittenExam: false },
            { key: 'programming_ai', label: 'البرمجة والذكاء الإصطناعى', maxGrade: 70, hasWrittenExam: true },
            { key: 'religion', label: 'التربية الدينية', maxGrade: 70, hasWrittenExam: true },
            { key: 'activity', label: 'النشاط', maxGrade: 100, hasWrittenExam: false }
          ];
        }
      } else if (isMiddle) {
        const cfg = getSubjectsConfigForStageGrade(stage, selectedGrade);
        if (cfg.customCols && cfg.customCols.length > 0) {
          resultList = cfg.customCols.map(c => {
            const noWritten = c.hasWrittenExam === false || isSubjectWithoutWrittenExam(c, cfg.customCols);
            return {
              key: c.key,
              label: c.label,
              maxGrade: noWritten ? 100 : (c.maxAssessmentsGrade ?? 70),
              hasWrittenExam: !noWritten,
            };
          });
        } else {
          resultList = [
            { key: 'arabic', label: 'اللغة العربية', maxGrade: 70, hasWrittenExam: true },
            { key: 'english', label: 'اللغة الإنجليزية', maxGrade: 70, hasWrittenExam: true },
            { key: 'math', label: 'الرياضيات', maxGrade: 70, hasWrittenExam: true },
            { key: 'science', label: 'العلوم', maxGrade: 70, hasWrittenExam: true },
            { key: 'social_studies', label: 'الدراسات الاجتماعية', maxGrade: 70, hasWrittenExam: true },
            { key: 'religion', label: 'التربية الدينية', maxGrade: 70, hasWrittenExam: true },
            { key: 'art', label: 'التربية الفنية', maxGrade: 70, hasWrittenExam: true },
            { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', maxGrade: 70, hasWrittenExam: true },
            { key: 'music', label: 'التربية الموسيقية', maxGrade: 100, hasWrittenExam: false },
            { key: 'pe', label: 'التربية الرياضية', maxGrade: 100, hasWrittenExam: false },
            { key: 'activity1', label: 'النشاط الأول', maxGrade: 100, hasWrittenExam: false },
            { key: 'activity2', label: 'النشاط الثانى', maxGrade: 100, hasWrittenExam: false }
          ];
        }
      } else {
        const isPrimary1To3 = ['الصف الأول', 'الصف الثاني', 'الصف الثالث', '1st Grade', '2nd Grade', '3rd Grade'].some(
          g => selectedGrade?.includes(g)
        );

        if (isPrimary1To3) {
          resultList = [
            { key: 'arabic', label: 'اللغة العربية', maxGrade: 40, hasWrittenExam: true },
            { key: 'math', label: 'الرياضيات', maxGrade: 40, hasWrittenExam: true },
            { key: 'english', label: 'اللغة الإنجليزية', maxGrade: 40, hasWrittenExam: true },
            { key: 'religion', label: 'التربية الدينية', maxGrade: 40, hasWrittenExam: true },
            { key: 'pe', label: 'التربية الرياضية', maxGrade: 100, hasWrittenExam: false },
            { key: 'tokkatsu', label: 'أنشطة التوكاتسو', maxGrade: 100, hasWrittenExam: false }
          ];
        } else {
          resultList = [
            { key: 'arabic', label: 'اللغة العربية', maxGrade: 40, hasWrittenExam: true },
            { key: 'math', label: 'الرياضيات', maxGrade: 40, hasWrittenExam: true },
            { key: 'science', label: 'العلوم', maxGrade: 40, hasWrittenExam: true },
            { key: 'english', label: 'اللغة الإنجليزية', maxGrade: 40, hasWrittenExam: true },
            { key: 'social_studies', label: 'الدراسات الاجتماعية', maxGrade: 40, hasWrittenExam: true },
            { key: 'religion', label: 'التربية الدينية', maxGrade: 40, hasWrittenExam: true },
            { key: 'ict', label: 'تكنولوجيا المعلومات والاتصالات', maxGrade: 40, hasWrittenExam: true },
            { key: 'art', label: 'التربية الفنية', maxGrade: 100, hasWrittenExam: false },
            { key: 'pe', label: 'التربية الرياضية', maxGrade: 100, hasWrittenExam: false },
            { key: 'fields', label: 'المهارات المهنية', maxGrade: 100, hasWrittenExam: false },
            { key: 'music', label: 'التربية الموسيقية', maxGrade: 100, hasWrittenExam: false }
          ];
        }
      }
    }

    // ضمان إضافة المواد التي ليس لها امتحان تحريري لجميع المراحل ما عدا رياض الأطفال
    if (stage !== 'kindergarten') {
      const isPrimary1To3 = ['الصف الأول', 'الصف الثاني', 'الصف الثالث', '1st Grade', '2nd Grade', '3rd Grade'].some(
        g => selectedGrade?.includes(g)
      );

      const nonWrittenTemplates: SubjectInfo[] = isSecondary
        ? [
            { key: 'pe', label: 'التربية الرياضية', maxGrade: 100, hasWrittenExam: false },
            { key: 'activity', label: 'النشاط', maxGrade: 100, hasWrittenExam: false }
          ]
        : isMiddle
        ? [
            { key: 'music', label: 'التربية الموسيقية', maxGrade: 100, hasWrittenExam: false },
            { key: 'pe', label: 'التربية الرياضية', maxGrade: 100, hasWrittenExam: false },
            { key: 'activity1', label: 'النشاط الأول', maxGrade: 100, hasWrittenExam: false },
            { key: 'activity2', label: 'النشاط الثانى', maxGrade: 100, hasWrittenExam: false }
          ]
        : isPrimary1To3
        ? [
            { key: 'pe', label: 'التربية الرياضية', maxGrade: 100, hasWrittenExam: false },
            { key: 'tokkatsu', label: 'أنشطة التوكاتسو', maxGrade: 100, hasWrittenExam: false }
          ]
        : [
            { key: 'art', label: 'التربية الفنية', maxGrade: 100, hasWrittenExam: false },
            { key: 'pe', label: 'التربية الرياضية', maxGrade: 100, hasWrittenExam: false },
            { key: 'fields', label: 'المهارات المهنية', maxGrade: 100, hasWrittenExam: false },
            { key: 'music', label: 'التربية الموسيقية', maxGrade: 100, hasWrittenExam: false }
          ];

      nonWrittenTemplates.forEach(t => {
        const idx = resultList.findIndex(s => s.key === t.key || s.label === t.label);
        if (idx === -1) {
          resultList.push(t);
        } else {
          resultList[idx].hasWrittenExam = false;
          resultList[idx].maxGrade = 100;
        }
      });
    }

    return resultList;
  }, [stage, selectedGrade, isMiddle, isSecondary, isMiddleOrSecondary]);

  // Ensure selectedSubjectKey is valid and restore last selected subject
  useEffect(() => {
    if (subjects.length > 0) {
      if (currentSubjectKey && subjects.some(s => s.key === currentSubjectKey)) {
        if (selectedSubjectKey !== currentSubjectKey) {
          setSelectedSubjectKey(currentSubjectKey);
        }
        return;
      }
      if (subjects.some(s => s.key === selectedSubjectKey)) {
        onSubjectChange?.(selectedSubjectKey);
        return;
      }
      try {
        const savedSpecific = localStorage.getItem(lastSubjectStorageKey) ||
          localStorage.getItem(`detailed_assessments_last_subject_${stage}_${selectedGrade}`);
        if (savedSpecific && subjects.some(s => s.key === savedSpecific)) {
          setSelectedSubjectKey(savedSpecific);
          onSubjectChange?.(savedSpecific);
          return;
        }
        const savedGeneral = localStorage.getItem('detailed_assessments_last_subject');
        if (savedGeneral && subjects.some(s => s.key === savedGeneral)) {
          setSelectedSubjectKey(savedGeneral);
          onSubjectChange?.(savedGeneral);
          return;
        }
      } catch {}
      setSelectedSubjectKey(subjects[0].key);
      onSubjectChange?.(subjects[0].key);
    }
  }, [subjects, selectedSubjectKey, lastSubjectStorageKey, currentSubjectKey, stage, selectedGrade]);

  const currentSubject = useMemo(() => {
    return subjects.find(s => s.key === selectedSubjectKey) || subjects[0] || { key: 'arabic', label: 'اللغة العربية' };
  }, [subjects, selectedSubjectKey]);

  // التحقق هل المادة الحالية هي مادة التربية الرياضية دائماً في جميع المراحل ما عدا رياض الأطفال
  const isPESubject = useMemo(() => {
    if (stage === 'kindergarten') return false;
    const key = (selectedSubjectKey || currentSubject?.key || '').toLowerCase();
    const label = (currentSubject?.label || '').toLowerCase();
    return (
      key === 'pe' ||
      key === 'sport' ||
      key === 'physical_education' ||
      key === 'sports' ||
      label.includes('رياضية') ||
      label.includes('بدنية')
    );
  }, [stage, selectedSubjectKey, currentSubject]);

  // التحقق هل المادة الحالية من المواد التي ليس لها امتحان تحريري (ما عدا التربية الرياضية وما عدا رياض الأطفال)
  const isNoWrittenExceptPe = useMemo(() => {
    if (stage === 'kindergarten' || isPESubject) return false;
    const cfg = getSubjectsConfigForStageGrade(stage, selectedGrade);
    return isSubjectWithoutWrittenExam(currentSubject, cfg?.customCols);
  }, [stage, selectedGrade, currentSubject, isPESubject]);

  const isNoWrittenSubject = isPESubject || isNoWrittenExceptPe;

  // التحقق هل المادة الحالية من المواد التي ليس لها امتحان تحريري والدرجة العظمى لتقييماتها = 100
  const isSelectedSubjectOutOf100 = useMemo(() => {
    if (isNoWrittenSubject) return true;
    try {
      const { customCols } = getSubjectsConfigForStageGrade(stage, selectedGrade);
      const subjConfig = customCols?.find((c: any) => c.key === selectedSubjectKey);
      return subjConfig?.maxAssessmentsGrade === 100 || subjConfig?.hasWrittenExam === false;
    } catch {
      return ['art', 'pe', 'fields', 'music', 'tokkatsu', 'activity1', 'activity2'].includes(selectedSubjectKey);
    }
  }, [stage, selectedGrade, selectedSubjectKey, isNoWrittenSubject]);

  // تحويل مجموع التقييمات تفصيلا إلى مجموع التقييمات إجمالا (من 100 للمواد التي ليس لها امتحان تحريري)
  const convertDetailedTotalToAssessmentsTotal = (detailedTotal?: string): string => {
    if (!detailedTotal || detailedTotal === 'غ') return detailedTotal || '';
    if (isSecondary2Modern) {
      // مجموع التقييمات تفصيلا للصف الثاني الثانوي النظام الحديث هو بالفعل من 100 لجميع المواد
      return detailedTotal;
    }
    if (isNoWrittenSubject) {
      // مجموع المواد التي ليس لها امتحان تحريري ومادة التربية الرياضية هو بالفعل من 100
      return detailedTotal;
    }
    if (isSelectedSubjectOutOf100) {
      const numDetailed = parseFloat(detailedTotal.replace(',', '.'));
      if (!isNaN(numDetailed)) {
        if (isMiddle || isSecondary) {
          // في المرحلة الإعدادية والثانوية: تحويل الدرجة من 70 إلى 100
          const num100 = Math.round(((numDetailed / 70) * 100) * 10) / 10;
          return Number.isInteger(num100) ? String(num100) : num100.toFixed(1);
        } else {
          // في المرحلة الابتدائية: عكس معادلة (الدرجة / 5) * 2 هو: (الدرجة / 2) * 5
          const num100 = Math.round(((numDetailed / 2) * 5) * 10) / 10;
          return Number.isInteger(num100) ? String(num100) : num100.toFixed(1);
        }
      }
    }
    return detailedTotal;
  };

  // مزامنة مبدئية: في حال وجود درجات للطلاب في التقييمات إجمالاً وعدم وجود تفصيل لها للمادة المحددة
  useEffect(() => {
    if (!localData || localData.length === 0 || !selectedSubjectKey) return;
    let anyMissing = false;
    const updated = localData.map(student => {
      const detailedItem = student.detailedAssessments?.[semester]?.[selectedSubjectKey];
      const hasDetailed = detailedItem && hasAnyFieldVal(detailedItem);
      if (!hasDetailed) {
        const generalVal = student.assessments?.[semester]?.[selectedSubjectKey];
        if (generalVal !== undefined && generalVal !== null && String(generalVal).trim() !== '') {
          anyMissing = true;
          const distributed = distributeTotalToDetailedAssessment(
            generalVal,
            isSecondary2Modern ? 100 : (isNoWrittenSubject ? 100 : (currentSubject.maxGrade || (isMiddleOrSecondary ? 70 : 40))),
            stage,
            isNoWrittenExceptPe,
            isPESubject,
            isSecondary2Modern
          );
          return {
            ...student,
            detailedAssessments: {
              ...(student.detailedAssessments || {}),
              [semester]: {
                ...(student.detailedAssessments?.[semester] || {}),
                [selectedSubjectKey]: distributed
              }
            }
          };
        }
      }
      return student;
    });

    if (anyMissing) {
      setLocalData(updated);
      onChange(updated);
    }
  }, [selectedSubjectKey, semester, stage, currentSubject.maxGrade, isMiddleOrSecondary, isNoWrittenSubject, isPESubject, isNoWrittenExceptPe, isSecondary2Modern]);

  // Helpers to calculate detailed assessment total
  const parseNum = (val?: string): number => {
    if (!val || typeof val !== 'string') return 0;
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'غ' || trimmed.toLowerCase() === 'a') return 0;
    const num = parseFloat(trimmed.replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  const hasAnyFieldVal = (item?: DetailedAssessmentItem): boolean => {
    if (!item) return false;
    if (isSecondary2Modern) {
      const fields = [
        item.weeklyAssessment,
        item.researchProject,
        item.homework,
        item.behavior,
        item.firstMonthlyExam,
        item.secondMonthlyExam
      ];
      return fields.some(v => v !== undefined && v !== null && String(v).trim() !== '');
    }
    if (isPESubject) {
      const fields = [
        item.physicalSkillDomain,
        item.cognitiveDomain,
        item.affectiveBehavioralDomain,
        item.sportsUniformAttendance ?? item.behavior
      ];
      return fields.some(v => v !== undefined && v !== null && String(v).trim() !== '');
    }
    if (isNoWrittenExceptPe) {
      const fields = [item.practicalPerformance, item.classActivities, item.behavior];
      return fields.some(v => v !== undefined && v !== null && String(v).trim() !== '');
    }
    const fields = isMiddleOrSecondary
      ? [item.homework, item.weeklyAssessment, item.behavior, item.firstMonthlyExam, item.secondMonthlyExam]
      : [item.classNotebook, item.homework, item.weeklyAssessment, item.behavior, item.firstMonthlyExam, item.secondMonthlyExam];
    return fields.some(v => v !== undefined && v !== null && String(v).trim() !== '');
  };

  const calculateDetailedTotal = (item?: DetailedAssessmentItem): string => {
    if (!item || !hasAnyFieldVal(item)) return '';

    // للصف الثانى الثانوى - بكالوريا - النظام الحديث (لكل المواد):
    // التقييم الأسبوعي (20) + المشروع البحثي (15) + الحصة والواجبات (15) + السلوك والمواظبة (10) + الاختبار الأول (20) + الاختبار الثاني (20) = 100
    if (isSecondary2Modern) {
      const wStr = (item.weeklyAssessment ?? '').trim();
      const rStr = (item.researchProject ?? '').trim();
      const hStr = (item.homework ?? '').trim();
      const bStr = (item.behavior ?? '').trim();
      const e1Str = (item.firstMonthlyExam ?? '').trim();
      const e2Str = (item.secondMonthlyExam ?? '').trim();

      const hasAnyNonEmpty = wStr !== '' || rStr !== '' || hStr !== '' || bStr !== '' || e1Str !== '' || e2Str !== '';
      const allAreAbsent = hasAnyNonEmpty &&
        (wStr === 'غ' || wStr === '') &&
        (rStr === 'غ' || rStr === '') &&
        (hStr === 'غ' || hStr === '') &&
        (bStr === 'غ' || bStr === '') &&
        (e1Str === 'غ' || e1Str === '') &&
        (e2Str === 'غ' || e2Str === '') &&
        (wStr === 'غ' || rStr === 'غ' || hStr === 'غ' || bStr === 'غ' || e1Str === 'غ' || e2Str === 'غ');

      if (allAreAbsent) return 'غ';

      const w = parseNum(item.weeklyAssessment);
      const r = parseNum(item.researchProject);
      const h = parseNum(item.homework);
      const b = parseNum(item.behavior);
      const e1 = parseNum(item.firstMonthlyExam);
      const e2 = parseNum(item.secondMonthlyExam);
      const sum = w + r + h + b + e1 + e2;
      return (Math.round(sum * 10) / 10).toString();
    }

    if (isPESubject) {
      // مادة التربية الرياضية دائماً: المجال البدنى والمهارى (50) + المجال المعرفى (20) + المجال الوجدانى والسلوكى (20) + الزى الرياضى والمواظبة (10) = 100
      const pStr = (item.physicalSkillDomain ?? '').trim();
      const cStr = (item.cognitiveDomain ?? '').trim();
      const aStr = (item.affectiveBehavioralDomain ?? '').trim();
      const sStr = (item.sportsUniformAttendance ?? item.behavior ?? '').trim();

      const hasAnyNonEmpty = pStr !== '' || cStr !== '' || aStr !== '' || sStr !== '';
      const allAreAbsent = hasAnyNonEmpty &&
        (pStr === 'غ' || pStr === '') &&
        (cStr === 'غ' || cStr === '') &&
        (aStr === 'غ' || aStr === '') &&
        (sStr === 'غ' || sStr === '') &&
        (pStr === 'غ' || cStr === 'غ' || aStr === 'غ' || sStr === 'غ');

      if (allAreAbsent) return 'غ';

      const p = parseNum(item.physicalSkillDomain);
      const c = parseNum(item.cognitiveDomain);
      const a = parseNum(item.affectiveBehavioralDomain);
      const s = parseNum(item.sportsUniformAttendance ?? item.behavior);
      const sum = p + c + a + s;
      return (Math.round(sum * 10) / 10).toString();
    }

    if (isNoWrittenExceptPe) {
      // للمواد التي ليس لها امتحان تحريري (ما عدا التربية الرياضية): الأداء العملى والمهارى (60) + الأنشطة الصفية (20) + السلوك والمواظبة (20) = 100
      const pStr = (item.practicalPerformance ?? '').trim();
      const aStr = (item.classActivities ?? '').trim();
      const bStr = (item.behavior ?? '').trim();

      const hasAnyNonEmpty = pStr !== '' || aStr !== '' || bStr !== '';
      const allAreAbsent = hasAnyNonEmpty &&
        (pStr === 'غ' || pStr === '') &&
        (aStr === 'غ' || aStr === '') &&
        (bStr === 'غ' || bStr === '') &&
        (pStr === 'غ' || aStr === 'غ' || bStr === 'غ');

      if (allAreAbsent) return 'غ';

      const p = parseNum(item.practicalPerformance);
      const a = parseNum(item.classActivities);
      const b = parseNum(item.behavior);
      const sum = p + a + b;
      return (Math.round(sum * 10) / 10).toString();
    }

    const h = parseNum(item.homework);
    const w = parseNum(item.weeklyAssessment);
    const b = parseNum(item.behavior);
    const e1 = parseNum(item.firstMonthlyExam);
    const e2 = parseNum(item.secondMonthlyExam);
    
    if (isSecondary) {
      // للمرحلة الثانوية العامة - البكالوريا: كراسة الواجب (15) + التقييم الأسبوعي (15) + السلوك والمواظبة (10) + الاختبار الأول (15) + الاختبار الثاني (15) = 70
      const sum = h + w + b + e1 + e2;
      return (Math.round(sum * 10) / 10).toString();
    }

    if (isMiddle) {
      // للمرحلة الإعدادية: كراسة الواجب (10) + التقييم الأسبوعي (20) + السلوك والمواظبة (10) + الاختبار الأول (15) + الاختبار الثاني (15) = 70
      const sum = h + w + b + e1 + e2;
      return (Math.round(sum * 10) / 10).toString();
    }

    const c = parseNum(item.classNotebook);
    // Egyptian Primary rule: Highest of the two monthly exams (each max 15) is taken:
    const examMax = Math.max(e1, e2);
    const sum = c + h + w + b + examMax;
    return (Math.round(sum * 10) / 10).toString();
  };

  // Get field value from student
  const getFieldValue = (student: StudentData, field: keyof DetailedAssessmentItem): string => {
    let item = student.detailedAssessments?.[semester]?.[selectedSubjectKey];
    if (!item) {
      const generalVal = student.assessments?.[semester]?.[selectedSubjectKey];
      if (generalVal !== undefined && generalVal !== null && String(generalVal).trim() !== '') {
        item = distributeTotalToDetailedAssessment(
          generalVal,
          isSecondary2Modern ? 100 : (isNoWrittenSubject ? 100 : (currentSubject.maxGrade || (isMiddleOrSecondary ? 70 : 40))),
          stage,
          isNoWrittenExceptPe,
          isPESubject,
          isSecondary2Modern
        );
      }
    }
    if (!item) return '';
    if (field === 'total') {
      return item.total !== undefined && item.total !== '' ? item.total : calculateDetailedTotal(item);
    }
    if (field === 'sportsUniformAttendance') {
      return item.sportsUniformAttendance ?? item.behavior ?? '';
    }
    return (item as any)[field] ?? '';
  };

  // Update field value
  const handleFieldChange = (
    studentId: string, 
    field: keyof DetailedAssessmentItem, 
    rawVal: string
  ) => {
    let val = rawVal.trim();
    if (val === '') {
      // allow empty
    } else if (val === 'غ' || val.includes('غ')) {
      val = 'غ';
    } else {
      // تحويل الأرقام العربية المشرقية إن وجدت إلى أرقام قياسية
      val = val.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

      // لا يُسمح بأي حروف أو علامات سوى حرف غ والأرقام والفاصلة
      if (!/^\d*[.,]?\d{0,2}$/.test(val)) {
        return;
      }

      const num = parseFloat(val.replace(',', '.'));
      if (isNaN(num)) {
        return;
      }

      // Enforce maximums based on column specification
      let max = 15;
      if (isSecondary2Modern) {
        if (field === 'weeklyAssessment' || field === 'firstMonthlyExam' || field === 'secondMonthlyExam') max = 20;
        else if (field === 'researchProject' || field === 'homework') max = 15;
        else if (field === 'behavior') max = 10;
        else if (field === 'total') max = 100;
      } else if (isPESubject) {
        if (field === 'physicalSkillDomain') max = 50;
        else if (field === 'cognitiveDomain' || field === 'affectiveBehavioralDomain') max = 20;
        else if (field === 'sportsUniformAttendance' || field === 'behavior') max = 10;
        else if (field === 'total') max = 100;
      } else if (isNoWrittenExceptPe) {
        if (field === 'practicalPerformance') max = 60;
        else if (field === 'classActivities') max = 20;
        else if (field === 'behavior') max = 20;
        else if (field === 'total') max = 100;
      } else if (isSecondary) {
        if (field === 'homework' || field === 'weeklyAssessment') max = 15;
        else if (field === 'behavior') max = 10;
        else if (field === 'firstMonthlyExam' || field === 'secondMonthlyExam') max = 15;
        else if (field === 'total') max = 70;
      } else if (isMiddle) {
        if (field === 'homework' || field === 'behavior') max = 10;
        else if (field === 'weeklyAssessment') max = 20;
        else if (field === 'firstMonthlyExam' || field === 'secondMonthlyExam') max = 15;
        else if (field === 'total') max = 70;
      } else {
        if (field === 'classNotebook' || field === 'homework' || field === 'behavior') max = 5;
        else if (field === 'weeklyAssessment') max = 10;
        else if (field === 'firstMonthlyExam' || field === 'secondMonthlyExam') max = 15;
        else if (field === 'total') max = 40;
      }

      if (num > max) {
        val = max.toString();
      } else if (num < 0) {
        val = '0';
      }
    }

    const updated = localData.map(student => {
      if (student.id !== studentId) return student;

      const currentSemDetailed = student.detailedAssessments?.[semester] || {};
      const currentSubjectItem: DetailedAssessmentItem = { ...(currentSemDetailed[selectedSubjectKey] || {}) };
      
      (currentSubjectItem as any)[field] = val;
      // مزامنة درجة الزى الرياضى والمواظبة مع السلوك لتدخل تلقائياً في حسابات نسبة الحضور
      if (isPESubject && (field === 'sportsUniformAttendance' || field === 'behavior')) {
        currentSubjectItem.sportsUniformAttendance = val;
        currentSubjectItem.behavior = val;
      }

      // Auto-compute total if any component changed
      if (field !== 'total') {
        currentSubjectItem.total = calculateDetailedTotal(currentSubjectItem);
      }

      const updatedDetailed = {
        ...(student.detailedAssessments || {}),
        [semester]: {
          ...currentSemDetailed,
          [selectedSubjectKey]: currentSubjectItem
        }
      };

      // Also sync total to student.assessments[semester][selectedSubjectKey] (مع تطبيق المعادلة العكسية للمواد التي ليس لها امتحان تحريري)
      const finalTotalForAssessments = convertDetailedTotalToAssessmentsTotal(currentSubjectItem.total);
      const updatedAssessments = {
        ...(student.assessments || {}),
        [semester]: {
          ...(student.assessments?.[semester] || {}),
          [selectedSubjectKey]: finalTotalForAssessments
        }
      };

      return {
        ...student,
        detailedAssessments: updatedDetailed,
        assessments: updatedAssessments
      };
    });

    setLocalData(updated);
    onChange(updated);
  };

  // Filter students based on search and sort by active sortBy
  const filteredData = useMemo(() => {
    let list = localData;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = localData.filter(s => {
        const nameMatch = s.name?.toLowerCase().includes(q);
        const idMatch = s.nationalId?.includes(q);
        const seatMatch = s.seatNumbers?.[semester]?.includes(q) || s.seatNumber?.includes(q);
        return nameMatch || idMatch || seatMatch;
      });
    }
    return sortStudents(list, sortBy, semester, lang);
  }, [localData, searchQuery, semester, sortBy, lang]);

  // Keyboard navigation across cells
  const fieldKeys: (keyof DetailedAssessmentItem)[] = useMemo(() => {
    if (isSecondary2Modern) {
      return [
        'weeklyAssessment',
        'researchProject',
        'homework',
        'behavior',
        'firstMonthlyExam',
        'secondMonthlyExam'
      ];
    }
    if (isPESubject) {
      return [
        'physicalSkillDomain',
        'cognitiveDomain',
        'affectiveBehavioralDomain',
        'sportsUniformAttendance'
      ];
    }
    if (isNoWrittenExceptPe) {
      return [
        'practicalPerformance',
        'classActivities',
        'behavior'
      ];
    }
    return isMiddleOrSecondary
      ? [
          'homework',
          'weeklyAssessment',
          'behavior',
          'firstMonthlyExam',
          'secondMonthlyExam'
        ]
      : [
          'classNotebook',
          'homework',
          'weeklyAssessment',
          'behavior',
          'firstMonthlyExam',
          'secondMonthlyExam'
        ];
  }, [isSecondary2Modern, isPESubject, isNoWrittenExceptPe, isMiddleOrSecondary]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    // منع كتابة أى حروف أو علامات نهائياً ما عدا حرف 'غ' والأرقام والفاصلة العشرية
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const allowedChars = /^[0-9٠-٩.,غ]$/;
      if (!allowedChars.test(e.key)) {
        e.preventDefault();
        return;
      }
    }

    let nextRow = rowIndex;
    let nextCol = colIndex;

    switch (e.key) {
      case 'Enter':
      case 'ArrowDown':
        e.preventDefault();
        nextRow = Math.min(filteredData.length - 1, rowIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextRow = Math.max(0, rowIndex - 1);
        break;
      case 'ArrowLeft':
        // In RTL, ArrowLeft moves forward to next cell
        if (colIndex < fieldKeys.length - 1) {
          e.preventDefault();
          nextCol = colIndex + 1;
        } else if (rowIndex < filteredData.length - 1) {
          e.preventDefault();
          nextRow = rowIndex + 1;
          nextCol = 0;
        }
        break;
      case 'ArrowRight':
        // In RTL, ArrowRight moves backward to previous cell
        if (colIndex > 0) {
          e.preventDefault();
          nextCol = colIndex - 1;
        } else if (rowIndex > 0) {
          e.preventDefault();
          nextRow = rowIndex - 1;
          nextCol = fieldKeys.length - 1;
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (colIndex > 0) {
            nextCol = colIndex - 1;
          } else if (rowIndex > 0) {
            nextRow = rowIndex - 1;
            nextCol = fieldKeys.length - 1;
          }
        } else {
          if (colIndex < fieldKeys.length - 1) {
            nextCol = colIndex + 1;
          } else if (rowIndex < filteredData.length - 1) {
            nextRow = rowIndex + 1;
            nextCol = 0;
          }
        }
        break;
      default:
        return;
    }

    if (nextRow !== rowIndex || nextCol !== colIndex) {
      e.preventDefault();
      const nextId = `detailed-cell-${nextRow}-${nextCol}`;
      const nextElem = document.getElementById(nextId) as HTMLInputElement | null;
      if (nextElem) {
        try {
          nextElem.focus({ preventScroll: true });
        } catch {
          nextElem.focus();
        }
        try {
          nextElem.select();
        } catch {}
        centerActiveCellInView(nextElem);
      }
    }
  };

  // Paste handling for multiple rows
  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRowIndex: number,
    field: keyof DetailedAssessmentItem
  ) => {
    e.preventDefault();
    const clipboardData = e.clipboardData.getData('text');
    if (!clipboardData) return;

    const rows = clipboardData.split(/\r?\n/).filter(r => r.length > 0);
    if (rows.length === 0) return;

    const updated = [...localData];
    rows.forEach((rowText, i) => {
      const targetIndex = startRowIndex + i;
      if (targetIndex >= filteredData.length) return;

      const studentToUpdate = filteredData[targetIndex];
      const studentIdxInAll = updated.findIndex(s => s.id === studentToUpdate.id);
      if (studentIdxInAll === -1) return;

      const cells = rowText.split('\t');
      let val = cells[0].trim();
      if (val === 'غ' || val.includes('غ')) {
        val = 'غ';
      } else {
        val = val.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
        if (!/^\d*[.,]?\d{0,2}$/.test(val)) {
          val = '';
        } else if (val !== '') {
          const num = parseFloat(val.replace(',', '.'));
          if (isNaN(num)) {
            val = '';
          } else {
            let max = 15;
            if (isSecondary2Modern) {
              if (field === 'weeklyAssessment' || field === 'firstMonthlyExam' || field === 'secondMonthlyExam') max = 20;
              else if (field === 'researchProject' || field === 'homework') max = 15;
              else if (field === 'behavior') max = 10;
              else if (field === 'total') max = 100;
            } else if (isPESubject) {
              if (field === 'physicalSkillDomain') max = 50;
              else if (field === 'cognitiveDomain' || field === 'affectiveBehavioralDomain') max = 20;
              else if (field === 'sportsUniformAttendance' || field === 'behavior') max = 10;
              else if (field === 'total') max = 100;
            } else if (isNoWrittenExceptPe) {
              if (field === 'practicalPerformance') max = 60;
              else if (field === 'classActivities') max = 20;
              else if (field === 'behavior') max = 20;
              else if (field === 'total') max = 100;
            } else if (isSecondary) {
              if (field === 'homework' || field === 'weeklyAssessment') max = 15;
              else if (field === 'behavior') max = 10;
              else if (field === 'firstMonthlyExam' || field === 'secondMonthlyExam') max = 15;
              else if (field === 'total') max = 70;
            } else if (isMiddle) {
              if (field === 'homework' || field === 'behavior') max = 10;
              else if (field === 'weeklyAssessment') max = 20;
              else if (field === 'firstMonthlyExam' || field === 'secondMonthlyExam') max = 15;
              else if (field === 'total') max = 70;
            } else {
              if (field === 'classNotebook' || field === 'homework' || field === 'behavior') max = 5;
              else if (field === 'weeklyAssessment') max = 10;
              else if (field === 'firstMonthlyExam' || field === 'secondMonthlyExam') max = 15;
              else if (field === 'total') max = 40;
            }
            if (num > max) val = max.toString();
            else if (num < 0) val = '0';
          }
        }
      }

      const student = updated[studentIdxInAll];
      const currentSemDetailed = student.detailedAssessments?.[semester] || {};
      const currentSubjectItem: DetailedAssessmentItem = { ...(currentSemDetailed[selectedSubjectKey] || {}) };
      
      (currentSubjectItem as any)[field] = val;
      // مزامنة درجة الزى الرياضى والمواظبة مع السلوك لتدخل تلقائياً في حسابات نسبة الحضور
      if (isPESubject && (field === 'sportsUniformAttendance' || field === 'behavior')) {
        currentSubjectItem.sportsUniformAttendance = val;
        currentSubjectItem.behavior = val;
      }

      if (field !== 'total') {
        currentSubjectItem.total = calculateDetailedTotal(currentSubjectItem);
      }

      updated[studentIdxInAll] = {
        ...student,
        detailedAssessments: {
          ...(student.detailedAssessments || {}),
          [semester]: {
            ...currentSemDetailed,
            [selectedSubjectKey]: currentSubjectItem
          }
        },
        assessments: {
          ...(student.assessments || {}),
          [semester]: {
            ...(student.assessments?.[semester] || {}),
            [selectedSubjectKey]: convertDetailedTotalToAssessmentsTotal(currentSubjectItem.total)
          }
        }
      };
    });

    setLocalData(updated);
    onChange(updated);
  };

  // Helper to print styled HTML documents via an isolated hidden iframe
  const printHtmlDocument = (docTitle: string, bodyContent: string, landscape = true) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>${docTitle}</title>
        <style>
          @page {
            size: A4 ${landscape ? 'landscape' : 'portrait'};
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            background: #ffffff;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1.5px solid #0f172a;
            padding: 5px 6px;
            text-align: center;
            font-size: 13px;
          }
          th {
            background-color: #f1f5f9;
            font-weight: 800;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2500);
    }, 400);
  };

  // 1. Export and download detailed assessment PDF report for a specific subject
  const printSubjectDetailed = async (subjKey: string, subjLabel: string) => {
    try {
      await exportSubjectDetailedAssessmentsPdf({
        subjectKey: subjKey,
        subjectLabel: subjLabel,
        students: sortStudents(localData, sortBy, semester, lang),
        semester,
        selectedGrade,
        stage,
        schoolName,
        administration,
        dataOfficer,
        controlHead,
        committeeHead,
        showSeatNumber,
      });
    } catch (e) {
      console.error('Failed to export detailed assessments PDF', e);
    }
  };

  // 2. Print Certificates for all students after Exam 1 or Exam 2
  const printMonthlyCertificates = (examType: 1 | 2 | 'october' | 'november') => {
    const isSecondSem = semester === 'second';
    const isExam1 = examType === 1 || examType === 'october';
    const semName = isSecondSem ? 'الفصل الدراسي الثانى' : 'الفصل الدراسي الأول';
    const examName = isExam1 ? 'الاختبار الأول' : 'الاختبار الثانى';
    const sName = localStorage.getItem('school_name') || schoolName || 'المدرسة';
    const sAdmin = localStorage.getItem('school_administration') || administration || 'الإدارة التعليمية';
    const sGov = localStorage.getItem('school_governorate') || 'مديرية التربية والتعليم';
    const semText = semName;

    const getGradeLevel = (val: number) => {
      if (val >= 13) return { text: 'ممتاز (فائق التوقعات)', color: '#1d4ed8', bg: '#dbeafe' };
      if (val >= 10) return { text: 'جيد جداً (يلبي التوقعات)', color: '#047857', bg: '#d1fae5' };
      if (val >= 7.5) return { text: 'جيد (يلبي التوقعات أحياناً)', color: '#b45309', bg: '#fef3c7' };
      return { text: 'يحتاج إلى دعم', color: '#b91c1c', bg: '#fee2e2' };
    };

    // Split students into chunks of 2 per A4 landscape page sorted by active order
    const sortedStudentsForCert = sortStudents(localData, sortBy, semester, lang);
    const chunks: StudentData[][] = [];
    for (let i = 0; i < sortedStudentsForCert.length; i += 2) {
      chunks.push(sortedStudentsForCert.slice(i, i + 2));
    }

    const pagesHtml = chunks.map((chunk, pageIdx) => {
      const cardsHtml = chunk.map(student => {
        const seat = student.seatNumbers?.[semester] || student.seatNumber || '-';

        const subjectRows = subjects.map((subj, idx) => {
          const item = student.detailedAssessments?.[semester]?.[subj.key];
          const rawScore = isExam1 ? item?.firstMonthlyExam : item?.secondMonthlyExam;
          const scoreNum = parseNum(rawScore);
          const hasScore = rawScore !== undefined && rawScore !== null && String(rawScore).trim() !== '';
          const isPassFail = stage !== 'kindergarten' && subj.learningOutcomesType === 'pass_fail';
          const level = hasScore
            ? isPassFail
              ? scoreNum >= 7.5
                ? { text: 'اجتاز', color: '#047857', bg: '#d1fae5' }
                : { text: 'لم يجتاز', color: '#b91c1c', bg: '#fee2e2' }
              : getGradeLevel(scoreNum)
            : { text: '-', color: '#64748b', bg: '#ffffff' };

          return `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 13px;">
              <td style="width: 35px; font-weight: bold; text-align: center;">${idx + 1}</td>
              <td style="font-weight: bold; text-align: right; padding-right: 8px;">${subj.label}</td>
              <td style="width: 70px; font-weight: bold; text-align: center;">15</td>
              <td style="width: 80px; font-weight: 900; text-align: center; font-size: 14px; color: #0f172a;">${hasScore ? rawScore : '-'}</td>
              <td style="width: 140px; text-align: center; font-weight: bold; color: ${level.color}; background-color: ${level.bg}; font-size: 11px;">${level.text}</td>
            </tr>
          `;
        }).join('');

        return `
          <div style="flex: 1; border: 3px double #0f172a; border-radius: 14px; padding: 12px; margin: 4px; background: #ffffff; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div>
              <!-- Header -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px;">
                <div style="text-align: right; font-size: 11px; font-weight: bold; line-height: 1.4;">
                  <div>جمهورية مصر العربية</div>
                  <div>${sGov}</div>
                  <div>${sAdmin}</div>
                  <div>${sName}</div>
                </div>
                <div style="text-align: center;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #0f172a, #1e293b); color: #ffffff; padding: 3px 14px; border-radius: 20px; font-size: 13px; font-weight: 900; margin-bottom: 2px;">
                    إشعار نتيجة تقييمات ${semName} بعد ${examName}
                  </div>
                  <div style="font-size: 11px; font-weight: bold; color: #475569;">
                    ${selectedGrade} - ${semText}
                  </div>
                </div>
                <div style="text-align: left; font-size: 11px; font-weight: bold; line-height: 1.4;">
                  <div>العام الدراسي: 2026 / 2027</div>
                  <div>رقم الجلوس: <span style="font-size: 13px; color: #0284c7;">${seat}</span></div>
                </div>
              </div>

              <!-- Student Banner -->
              <div style="background: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 5px 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <span style="font-size: 12px; font-weight: bold; color: #475569;">${isKindergarten ? 'اسم التلميذ: ' : 'اسم الطالب: '}</span>
                  <span style="font-size: 14px; font-weight: 900; color: #0f172a;">${student.name || '-'}</span>
                </div>
                <div>
                  <span style="font-size: 12px; font-weight: bold; color: #475569;">الفصل: </span>
                  <span style="font-size: 13px; font-weight: bold; color: #0f172a;">${selectedGrade}</span>
                </div>
              </div>

              <!-- Subjects Table -->
              <table>
                <thead>
                  <tr style="background: #e2e8f0; font-size: 12px;">
                    <th style="width: 35px;">م</th>
                    <th>المادة الدراسية</th>
                    <th style="width: 70px;">العظمى</th>
                    <th style="width: 80px;">الدرجة</th>
                    <th style="width: 140px;">${isKindergarten ? 'التقييم' : 'التقدير / المستوى'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${subjectRows}
                </tbody>
              </table>
            </div>

            <!-- Signatures -->
            <div style="display: flex; justify-content: space-between; margin-top: 14px; padding: 0 20px; font-size: 12px; font-weight: bold; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
              <div>رائد الفصل: .................</div>
              <div>${isKindergarten ? 'شؤون التلاميذ' : 'شؤون الطلاب'}: .................</div>
              <div>${isKindergarten ? 'مدير الروضة' : 'مدير المدرسة'}: .................</div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="display: flex; gap: 10px; height: 100vh; max-height: 100vh; padding: 4px;" class="${pageIdx < chunks.length - 1 ? 'page-break' : ''}">
          ${cardsHtml}
        </div>
      `;
    }).join('');

    printHtmlDocument(`شهادات_تقييمات_${semName}_بعد_${examName}_${selectedGrade}`, pagesHtml, true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      className="w-[96%] sm:w-[95vw] max-w-[95vw] mx-auto relative rounded-2xl shadow-2xl p-[6px] bg-[linear-gradient(90deg,#000000_25%,#ffffff_50%,#000000_75%)] bg-[length:200%_auto] animate-shine font-sans my-4"
      style={{ animationDuration: '15s' }}
      dir="rtl"
    >
      {/* Container Card */}
      <div className="bg-[#f8ebff] rounded-[10px] w-full p-4 sm:p-6 flex flex-col gap-4 relative overflow-hidden">
        
        {/* Main Header Banner */}
        <div className="flex flex-row justify-between items-center bg-[linear-gradient(to_right,#0d9488,#14b8a6,#5eead4,#14b8a6,#0d9488)] bg-[length:200%_auto] animate-shine border-2 border-slate-900 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-md gap-2 sm:gap-4 relative overflow-hidden w-full flex-nowrap">
          <div className="text-black/60 font-black text-xs sm:text-sm md:text-base lg:text-lg text-right truncate min-w-0 whitespace-nowrap flex-1">
            <span style={(isSecondary || title.includes('المرحلة الثانوية')) ? { fontSize: '85%' } : undefined} className="inline-block truncate max-w-full align-middle">
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
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-black/60 shrink-0" />
              <span>تحرير التقييمات - تفصيلا - لكل مادة دراسية</span>
            </motion.div>

            {onNavigateToGeneralAssessments && (
              <div className="relative p-[2px] rounded-xl overflow-hidden shrink-0 shadow-sm">
                <div className="absolute inset-[-150%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />
                <button
                  type="button"
                  onClick={() => {
                    handleSelectSubject(selectedSubjectKey);
                    onNavigateToGeneralAssessments();
                  }}
                  className="relative z-10 bg-white/95 hover:bg-white text-black font-black text-xs sm:text-sm md:text-base px-3 sm:px-5 py-1.5 sm:py-2 min-h-[38px] sm:min-h-[42px] rounded-[10px] transition-all flex items-center justify-center active:scale-95 shadow-sm whitespace-nowrap"
                  title="التقييمات إجمالاً"
                >
                  <span>التقييمات إجمالاً</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search & Tool Bar */}
        <div className="flex flex-wrap items-center justify-between bg-white border-2 border-slate-900 rounded-xl p-2.5 sm:p-3 shadow-sm gap-2 w-full relative z-30">
          {/* Back & Subject Dropdown & Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px] flex-wrap md:flex-nowrap">
            <button
              onClick={() => {
                handleSelectSubject(selectedSubjectKey);
                onBack();
              }}
              title={lang === 'ar' ? 'عودة' : 'Back'}
              className="h-11 shrink-0 border-2 border-slate-900 text-white rounded-lg px-3 flex items-center justify-center transition-opacity hover:opacity-80 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-[length:200%_auto] animate-shine shadow-sm font-bold gap-1 text-sm"
            >
              <ArrowRight className="w-5 h-5" />
              <span className="hidden sm:inline">السابق</span>
            </button>

            {/* زر فتح قائمة إختر المادة الدراسية بدون أيقونة وبدون سهم */}
            <button
              type="button"
              onClick={() => setIsSubjectDropdownOpen(true)}
              className="h-11 px-4 sm:px-5 rounded-lg border-2 border-slate-900 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm transition-all active:scale-95 whitespace-nowrap"
              title="إختر المادة الدراسية للرصد والتحرير"
            >
              <span>إختر المادة الدراسية</span>
            </button>

            {/* مربع البحث */}
            <div className="relative w-[200px] sm:w-[240px] md:w-[270px]">
              <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث بالاسم أو رقم الجلوس"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-3 pr-10 py-2 border-2 border-slate-300 focus:border-teal-600 rounded-lg text-slate-800 font-bold focus:outline-none text-xs sm:text-sm transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
                >
                  مسح
                </button>
              )}
            </div>
          </div>

          {/* Action buttons matching AssessmentsGradesScreen */}
          <div className="flex flex-row items-center gap-1.5 sm:gap-2 shrink-0 relative justify-end flex-nowrap">
            {/* <SortButtonMenu
              sortBy={sortBy}
              onSortChange={onSortChange || (() => {})}
              lang={lang}
              isKindergarten={isKindergarten}
              showExamFields={!isKindergarten}
            /> */}
            {/* 1. Action Menu Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsActionMenuOpen(true)}
                className="bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine text-slate-900 p-2 sm:p-2.5 rounded-[12px] border-2 border-slate-900 hover:bg-slate-100 transition-colors shadow-sm shrink-0 flex items-center justify-center"
                title="القائمة"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5 mix-blend-difference text-white" />
              </button>
            </div>

            {/* 2. Print Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsPrintMenuOpen(true)}
                className="flex items-center justify-center bg-[linear-gradient(to_right,#34d399,#10b981,#059669,#10b981,#34d399)] bg-[length:200%_auto] animate-shine text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all hover:opacity-90 active:scale-[0.98] border-2 border-slate-900 shadow-sm shrink-0"
                title="طباعة"
              >
                <Printer className="w-full h-full p-1.5 drop-shadow-sm" />
              </button>
            </div>

            {/* 3. Color Palette Button */}
            <button
              type="button"
              onClick={() => setShowThemeSelectorModal(true)}
              className="flex items-center justify-center bg-[linear-gradient(to_right,#ec4899,#8b5cf6,#3b82f6,#10b981,#f59e0b,#ec4899)] bg-[length:200%_auto] animate-shine text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all active:scale-[0.98] border border-slate-900 shadow-sm shrink-0"
              title="ألوان جداول التحرير والرصد"
            >
              <Palette className="w-full h-full p-1.5 sm:p-2" />
            </button>

            {/* 4. Instructions Button */}
            <button
              type="button"
              onClick={() => setShowInstructions(true)}
              className="flex items-center justify-center bg-[linear-gradient(to_right,#fef08a,#facc15,#eab308,#facc15,#fef08a)] bg-[length:200%_auto] animate-shine text-yellow-950 w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all active:scale-[0.98] border border-slate-900 shadow-sm shrink-0"
              title="تعليمات"
            >
              <Info className="w-full h-full p-1" />
            </button>
          </div>
        </div>

        {/* Table Container - Identical styling to AssessmentsGradesScreen with vertical and horizontal scrollbars */}
        <div 
          className="p-[2px] rounded-xl bg-[linear-gradient(90deg,#000000_30%,#ffffff_50%,#000000_70%)] bg-[length:200%_auto] animate-shine shadow-sm w-full relative z-10"
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
          `}</style>
          
          <div className="overflow-auto w-full max-h-[calc(100vh-230px)] min-h-[460px] bg-white rounded-[10px] custom-scrollbar">
            <table className="w-full text-center text-slate-900 border-collapse min-w-[1250px] select-none">
              <thead className="sticky top-0 z-[60] shadow-[0_2px_10px_rgba(0,0,0,0.15)] bg-white">
                {/* Row 1: Super Header: Subject Name with identical styling to AssessmentsGradesScreen */}
                <tr className="bg-[linear-gradient(to_right,rgba(251,113,133,0.7),#c0c0c0,rgba(34,211,238,0.7),#c0c0c0,rgba(251,191,36,0.7),#c0c0c0,rgba(251,113,133,0.7))] bg-[length:200%_auto] animate-shine text-slate-900 text-xl md:text-2xl font-extrabold whitespace-nowrap border-b border-slate-900">
                  <th 
                    rowSpan={3} 
                    className="py-[16px] px-3 border-2 border-slate-900 bg-slate-200 sticky start-0 z-50 min-w-[64px] max-w-[64px] w-[64px] text-lg font-bold relative overflow-visible sticky-cell-border text-center align-middle"
                  >
                    م
                    <div className="separator-line"></div>
                  </th>
                  <th 
                    rowSpan={3} 
                    style={{ insetInlineStart: '64px' }}
                    className="py-[16px] px-3 border-2 border-slate-900 bg-slate-200 sticky z-[49] min-w-[360px] max-w-[360px] w-[360px] text-lg font-bold relative overflow-visible sticky-cell-border text-center align-middle"
                  >
                    {isKindergarten ? 'اسم التلميذ' : 'اسم الطالب'}
                    <div className="separator-line"></div>
                  </th>
                  {showSeatNumber && (
                    <th 
                      rowSpan={3} 
                      style={{ insetInlineStart: '424px' }}
                      className="py-[16px] px-3 border-2 border-slate-900 bg-slate-200 sticky z-[48] min-w-[140px] max-w-[140px] w-[140px] text-lg font-bold relative overflow-visible sticky-cell-border text-center align-middle"
                    >
                      رقم الجلوس
                      <div className="separator-line"></div>
                    </th>
                  )}
                  {showSecretNumber && (
                    <th 
                      rowSpan={3} 
                      style={{ insetInlineStart: showSeatNumber ? '564px' : '424px' }}
                      className="py-[16px] px-3 border-2 border-slate-900 bg-slate-200 sticky z-[47] min-w-[140px] max-w-[140px] w-[140px] text-lg font-bold relative overflow-visible sticky-cell-border text-center align-middle"
                    >
                      الرقم السري
                      <div className="separator-line"></div>
                    </th>
                  )}
                  {/* Spanning Header: اسم المادة الدراسية بلون مميز وواضح بدون خط */}
                  <th 
                    colSpan={isSecondary2Modern ? 7 : (isPESubject ? 5 : (isNoWrittenExceptPe ? 4 : (isMiddleOrSecondary ? 6 : 7)))} 
                    className="py-3 px-4 border-2 border-slate-900 text-center font-black text-xl md:text-[25px] shadow-inner overflow-hidden"
                  >
                    <motion.span
                      animate={{
                        rotate: [-2, 2, -2],
                        y: [-1, 1, -1]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 3.5,
                        ease: "easeInOut"
                      }}
                      className="inline-block text-blue-900 font-black tracking-wide origin-center drop-shadow-xs"
                    >
                      {currentSubject.label}
                    </motion.span>
                  </th>
                </tr>

                {/* Row 2: Sub-headers with reduced font size and comfortable margins */}
                <tr className="bg-slate-200 text-slate-900 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 border-slate-900 shadow-sm">
                  {isSecondary2Modern ? (
                    <>
                      <th className="py-3 px-3 border-2 border-slate-900 min-w-[140px] max-w-[140px] w-[140px] text-center whitespace-nowrap">
                        التقييم الأسبوعي
                      </th>
                      <th className="py-3 px-3 border-2 border-slate-900 min-w-[140px] max-w-[140px] w-[140px] text-center whitespace-nowrap">
                        المشروع البحثي
                      </th>
                      <th className="py-3 px-3 border-2 border-slate-900 min-w-[160px] max-w-[160px] w-[160px] text-center whitespace-nowrap">
                        الحصة والواجبات
                      </th>
                      <th className="py-3 px-3 border-2 border-slate-900 min-w-[140px] max-w-[140px] w-[140px] text-center whitespace-nowrap">
                        السلوك والمواظبة
                      </th>
                      <th className="py-3 px-3 border-2 border-slate-900 min-w-[140px] max-w-[140px] w-[140px] text-center whitespace-nowrap">
                        الاختبار الأول
                      </th>
                      <th className="py-3 px-3 border-2 border-slate-900 min-w-[140px] max-w-[140px] w-[140px] text-center whitespace-nowrap">
                        الاختبار الثاني
                      </th>
                      <th rowSpan={2} className="py-3 px-3 border-2 border-slate-900 min-w-[140px] max-w-[140px] w-[140px] text-center whitespace-nowrap bg-[linear-gradient(45deg,#c0c0c0,rgba(192,192,192,0.5),#c0c0c0)] bg-[length:200%_200%] animate-shine font-bold align-middle">
                        المجموع
                      </th>
                    </>
                  ) : isPESubject ? (
                    <>
                      <th className="py-3.5 px-4 border-2 border-slate-900 min-w-[210px] sm:min-w-[230px] w-[230px] text-center whitespace-nowrap">
                        المجال البدنى والمهارى
                      </th>
                      <th className="py-3.5 px-4 border-2 border-slate-900 min-w-[170px] sm:min-w-[185px] w-[185px] text-center whitespace-nowrap">
                        المجال المعرفى
                      </th>
                      <th className="py-3.5 px-4 border-2 border-slate-900 min-w-[220px] sm:min-w-[240px] w-[240px] text-center whitespace-nowrap">
                        المجال الوجدانى والسلوكى
                      </th>
                      <th className="py-3.5 px-4 border-2 border-slate-900 min-w-[180px] sm:min-w-[200px] w-[200px] text-center whitespace-nowrap">
                        الزى الرياضى والمواظبة
                      </th>
                      <th rowSpan={2} className="py-3.5 px-4 border-2 border-slate-900 min-w-[140px] sm:min-w-[160px] w-[160px] text-center whitespace-nowrap bg-[linear-gradient(45deg,#c0c0c0,rgba(192,192,192,0.5),#c0c0c0)] bg-[length:200%_200%] animate-shine font-bold align-middle">
                        المجموع
                      </th>
                    </>
                  ) : isNoWrittenExceptPe ? (
                    <>
                      <th className="py-3 px-3 border-2 border-slate-900 min-w-[180px] max-w-[180px] w-[180px] text-center whitespace-nowrap">
                        الأداء العملى والمهارى
                      </th>
                      <th className="py-3 px-3 border-2 border-slate-900 min-w-[160px] max-w-[160px] w-[160px] text-center whitespace-nowrap">
                        الأنشطة الصفية
                      </th>
                      <th className="py-3 px-3 border-2 border-slate-900 min-w-[160px] max-w-[160px] w-[160px] text-center whitespace-nowrap">
                        السلوك والمواظبة
                      </th>
                      <th rowSpan={2} className="py-3 px-3 border-2 border-slate-900 min-w-[160px] max-w-[160px] w-[160px] text-center whitespace-nowrap bg-[linear-gradient(45deg,#c0c0c0,rgba(192,192,192,0.5),#c0c0c0)] bg-[length:200%_200%] animate-shine font-bold align-middle">
                        المجموع
                      </th>
                    </>
                  ) : (
                    <>
                      {!isMiddleOrSecondary && (
                        <th className="py-3 px-3 border-2 border-slate-900 min-w-[130px] max-w-[130px] w-[130px] text-center whitespace-nowrap">
                          كراسة الحصة
                        </th>
                      )}
                      <th className={`py-3 px-3 border-2 border-slate-900 ${isMiddleOrSecondary ? 'min-w-[140px] max-w-[140px] w-[140px]' : 'min-w-[130px] max-w-[130px] w-[130px]'} text-center whitespace-nowrap`}>
                        كراسة الواجب
                      </th>
                      <th className={`py-3 px-3 border-2 border-slate-900 ${isMiddleOrSecondary ? 'min-w-[150px] max-w-[150px] w-[150px]' : 'min-w-[140px] max-w-[140px] w-[140px]'} text-center whitespace-nowrap`}>
                        التقييم الأسبوعى
                      </th>
                      <th className="py-3 px-3 border-2 border-slate-900 min-w-[150px] max-w-[150px] w-[150px] text-center whitespace-nowrap">
                        السلوك والمواظبة
                      </th>
                      <th className={`py-3 px-3 border-2 border-slate-900 ${isMiddleOrSecondary ? 'min-w-[140px] max-w-[140px] w-[140px]' : 'min-w-[130px] max-w-[130px] w-[130px]'} text-center whitespace-nowrap`}>
                        الإختبار الأول
                      </th>
                      <th className={`py-3 px-3 border-2 border-slate-900 ${isMiddleOrSecondary ? 'min-w-[140px] max-w-[140px] w-[140px]' : 'min-w-[130px] max-w-[130px] w-[130px]'} text-center whitespace-nowrap`}>
                        الإختبار الثانى
                      </th>
                      <th rowSpan={2} className={`py-3 px-3 border-2 border-slate-900 ${isMiddleOrSecondary ? 'min-w-[140px] max-w-[140px] w-[140px]' : 'min-w-[130px] max-w-[130px] w-[130px]'} text-center whitespace-nowrap bg-[linear-gradient(45deg,#c0c0c0,rgba(192,192,192,0.5),#c0c0c0)] bg-[length:200%_200%] animate-shine font-bold align-middle`}>
                        المجموع
                      </th>
                    </>
                  )}
                </tr>

                {/* Row 3: Max Grades */}
                <tr className="bg-slate-100 text-slate-900 text-lg sm:text-[18px] font-black whitespace-nowrap border-b-2 border-slate-900 shadow-sm">
                  {isSecondary2Modern ? (
                    <>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">20</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">15</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">15</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">10</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">20</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">20</th>
                    </>
                  ) : isPESubject ? (
                    <>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">50</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">20</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">20</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">10</th>
                    </>
                  ) : isNoWrittenExceptPe ? (
                    <>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">60</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">20</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center text-lg sm:text-[18px]">20</th>
                    </>
                  ) : (
                    <>
                      {!isMiddleOrSecondary && (
                        <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center">5</th>
                      )}
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center">{isSecondary ? '15' : (isMiddle ? '10' : '5')}</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center">{isSecondary ? '15' : (isMiddle ? '20' : '10')}</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center">{isMiddleOrSecondary ? '10' : '5'}</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center">15</th>
                      <th className="py-2.5 px-2 border-2 border-slate-900 text-slate-950 font-black text-center">15</th>
                    </>
                  )}
                </tr>
              </thead>

              {/* Table Body: Student Rows */}
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={(showSeatNumber ? 1 : 0) + (showSecretNumber ? 1 : 0) + 2 + (isSecondary2Modern ? 7 : (isPESubject ? 5 : (isNoWrittenExceptPe ? 4 : (isMiddleOrSecondary ? 6 : 7))))} 
                      className="p-8 text-center text-slate-500 font-bold text-lg"
                    >
                      {isKindergarten ? 'لا توجد بيانات تلاميذ مطابقة للبحث' : 'لا توجد بيانات طلاب مطابقة للبحث'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((student, rowIndex) => {
                    const rowColorStyle = getTableRowColorStyle(editingRowTheme, rowIndex % 2 !== 0);
                    const seatNum = student.seatNumbers?.[semester] || student.seatNumber || '';
                    const secretNum = student.secretNumbers?.[semester] || student.secretNumber || '';
                    const totalVal = getFieldValue(student, 'total');

                    return (
                      <tr 
                        key={student.id} 
                        className={`transition-colors font-bold group/row hover:!bg-blue-100 focus-within:!bg-blue-100 ${rowColorStyle.bgClass}`}
                      >
                        {/* Serial Number */}
                        <td className="p-2 border-2 border-slate-900 sticky start-0 z-30 bg-inherit font-black text-lg text-center relative overflow-visible sticky-cell-border">
                          <div className="separator-line"></div>
                          <span className="relative z-10">{rowIndex + 1}</span>
                        </td>

                        {/* Student Name */}
                        <td 
                          style={{ insetInlineStart: '64px' }}
                          className="p-3 border-2 border-slate-900 text-center whitespace-pre min-w-[360px] max-w-[360px] w-[360px] sticky z-[29] bg-inherit relative overflow-visible sticky-cell-border"
                        >
                          <div className="separator-line"></div>
                          <span className="relative z-10 text-slate-900 flex items-center justify-center w-full h-full text-center overflow-hidden whitespace-pre px-2 font-bold text-lg">
                            {student.name || '-'}
                          </span>
                        </td>

                        {/* Seat Number */}
                        {showSeatNumber && (
                          <td 
                            style={{ insetInlineStart: '424px' }}
                            className="p-0 border-2 border-slate-900 sticky z-[28] bg-inherit min-w-[140px] max-w-[140px] w-[140px] relative overflow-visible sticky-cell-border text-center"
                          >
                            <div className="separator-line"></div>
                            <input
                              type="text"
                              readOnly
                              value={seatNum}
                              className="w-full h-full bg-transparent border-none px-1 py-3 text-center text-xl text-slate-800 focus:outline-none cursor-default font-bold select-all"
                              dir="ltr"
                              title="حقل مجمد للقراءة فقط"
                            />
                          </td>
                        )}

                        {/* Secret Number */}
                        {showSecretNumber && (
                          <td 
                            style={{ insetInlineStart: showSeatNumber ? '564px' : '424px' }}
                            className="p-0 border-2 border-slate-900 sticky z-[27] bg-inherit min-w-[140px] max-w-[140px] w-[140px] relative overflow-visible sticky-cell-border text-center"
                          >
                            <div className="separator-line"></div>
                            <input
                              type="text"
                              readOnly
                              value={secretNum}
                              className="w-full h-full bg-transparent border-none px-1 py-3 text-center text-xl text-slate-800 focus:outline-none cursor-default font-bold select-all"
                              dir="ltr"
                              title="حقل مجمد للقراءة فقط"
                            />
                          </td>
                        )}

                        {/* الصف الثاني الثانوي - بكالوريا - النظام الحديث (لكل المواد) */}
                        {isSecondary2Modern ? (
                          <>
                            {/* 1. التقييم الأسبوعي (عظمى 20) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-0`}
                                type="text"
                                value={getFieldValue(student, 'weeklyAssessment')}
                                onChange={e => handleFieldChange(student.id, 'weeklyAssessment', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 0)}
                                onPaste={e => handlePaste(e, rowIndex, 'weeklyAssessment')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="التقييم الأسبوعي (الدرجة العظمى 20)"
                              />
                            </td>

                            {/* 2. المشروع البحثي (عظمى 15) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-1`}
                                type="text"
                                value={getFieldValue(student, 'researchProject')}
                                onChange={e => handleFieldChange(student.id, 'researchProject', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 1)}
                                onPaste={e => handlePaste(e, rowIndex, 'researchProject')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="المشروع البحثي (الدرجة العظمى 15)"
                              />
                            </td>

                            {/* 3. الحصة والواجبات (عظمى 15) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-2`}
                                type="text"
                                value={getFieldValue(student, 'homework')}
                                onChange={e => handleFieldChange(student.id, 'homework', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 2)}
                                onPaste={e => handlePaste(e, rowIndex, 'homework')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="الحصة والواجبات (الدرجة العظمى 15)"
                              />
                            </td>

                            {/* 4. السلوك والمواظبة (عظمى 10) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-3`}
                                type="text"
                                value={getFieldValue(student, 'behavior')}
                                onChange={e => handleFieldChange(student.id, 'behavior', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 3)}
                                onPaste={e => handlePaste(e, rowIndex, 'behavior')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="السلوك والمواظبة (الدرجة العظمى 10)"
                              />
                            </td>

                            {/* 5. الاختبار الأول (عظمى 20) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-4`}
                                type="text"
                                value={getFieldValue(student, 'firstMonthlyExam')}
                                onChange={e => handleFieldChange(student.id, 'firstMonthlyExam', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 4)}
                                onPaste={e => handlePaste(e, rowIndex, 'firstMonthlyExam')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="الاختبار الأول (الدرجة العظمى 20)"
                              />
                            </td>

                            {/* 6. الاختبار الثاني (عظمى 20) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-5`}
                                type="text"
                                value={getFieldValue(student, 'secondMonthlyExam')}
                                onChange={e => handleFieldChange(student.id, 'secondMonthlyExam', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 5)}
                                onPaste={e => handlePaste(e, rowIndex, 'secondMonthlyExam')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="الاختبار الثاني (الدرجة العظمى 20)"
                              />
                            </td>

                            {/* 7. المجموع (عظمى 100) - حقل غير مفعل للقراءة فقط ومحسوب تلقائياً */}
                            <td className="p-0 border-2 border-slate-900 bg-[linear-gradient(45deg,#c0c0c0,rgba(192,192,192,0.5),#c0c0c0)] bg-[length:200%_200%] animate-shine">
                              <input
                                type="text"
                                readOnly
                                disabled
                                tabIndex={-1}
                                value={totalVal}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-lg sm:text-xl font-black text-slate-950 cursor-default select-none focus:outline-none"
                                dir="ltr"
                                title="المجموع التلقائي من 100 (محسوب آلياً ومجمّد للعرض والتزامن الفوري)"
                              />
                            </td>
                          </>
                        ) : isPESubject ? (
                          <>
                            {/* 1. المجال البدنى والمهارى (عظمى 50) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-0`}
                                type="text"
                                value={getFieldValue(student, 'physicalSkillDomain')}
                                onChange={e => handleFieldChange(student.id, 'physicalSkillDomain', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 0)}
                                onPaste={e => handlePaste(e, rowIndex, 'physicalSkillDomain')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="المجال البدنى والمهارى (الدرجة العظمى 50)"
                              />
                            </td>

                            {/* 2. المجال المعرفى (عظمى 20) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-1`}
                                type="text"
                                value={getFieldValue(student, 'cognitiveDomain')}
                                onChange={e => handleFieldChange(student.id, 'cognitiveDomain', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 1)}
                                onPaste={e => handlePaste(e, rowIndex, 'cognitiveDomain')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="المجال المعرفى (الدرجة العظمى 20)"
                              />
                            </td>

                            {/* 3. المجال الوجدانى والسلوكى (عظمى 20) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-2`}
                                type="text"
                                value={getFieldValue(student, 'affectiveBehavioralDomain')}
                                onChange={e => handleFieldChange(student.id, 'affectiveBehavioralDomain', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 2)}
                                onPaste={e => handlePaste(e, rowIndex, 'affectiveBehavioralDomain')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="المجال الوجدانى والسلوكى (الدرجة العظمى 20)"
                              />
                            </td>

                            {/* 4. الزى الرياضى والمواظبة (عظمى 10) - تدخل ضمن معادلة احتساب نسبة حضور الطالب في الشهادات */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-3`}
                                type="text"
                                value={getFieldValue(student, 'sportsUniformAttendance')}
                                onChange={e => handleFieldChange(student.id, 'sportsUniformAttendance', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 3)}
                                onPaste={e => handlePaste(e, rowIndex, 'sportsUniformAttendance')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="الزى الرياضى والمواظبة (الدرجة العظمى 10) - تدخل ضمن معادلة احتساب نسبة حضور الطالب في الشهادات"
                              />
                            </td>

                            {/* 5. المجموع (عظمى 100) - حقل غير مفعل للقراءة فقط ومحسوب تلقائياً ومجمّد */}
                            <td className="p-0 border-2 border-slate-900 bg-[linear-gradient(45deg,#c0c0c0,rgba(192,192,192,0.5),#c0c0c0)] bg-[length:200%_200%] animate-shine">
                              <input
                                type="text"
                                readOnly
                                disabled
                                tabIndex={-1}
                                value={totalVal}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-lg sm:text-xl font-black text-slate-950 cursor-default select-none focus:outline-none"
                                dir="ltr"
                                title="المجموع التلقائي من 100 (محسوب آلياً ومجمّد للعرض والتزامن الفوري)"
                              />
                            </td>
                          </>
                        ) : isNoWrittenExceptPe ? (
                          <>
                            {/* 1. الأداء العملى والمهارى (عظمى 60) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-0`}
                                type="text"
                                value={getFieldValue(student, 'practicalPerformance')}
                                onChange={e => handleFieldChange(student.id, 'practicalPerformance', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 0)}
                                onPaste={e => handlePaste(e, rowIndex, 'practicalPerformance')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="الأداء العملى والمهارى (الدرجة العظمى 60)"
                              />
                            </td>

                            {/* 2. الأنشطة الصفية (عظمى 20) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-1`}
                                type="text"
                                value={getFieldValue(student, 'classActivities')}
                                onChange={e => handleFieldChange(student.id, 'classActivities', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 1)}
                                onPaste={e => handlePaste(e, rowIndex, 'classActivities')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="الأنشطة الصفية (الدرجة العظمى 20)"
                              />
                            </td>

                            {/* 3. السلوك والمواظبة (عظمى 20) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-2`}
                                type="text"
                                value={getFieldValue(student, 'behavior')}
                                onChange={e => handleFieldChange(student.id, 'behavior', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 2)}
                                onPaste={e => handlePaste(e, rowIndex, 'behavior')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="السلوك والمواظبة (الدرجة العظمى 20)"
                              />
                            </td>

                            {/* 4. المجموع (عظمى 100) - حقل غير مفعل للقراءة فقط ومحسوب تلقائياً */}
                            <td className="p-0 border-2 border-slate-900 bg-[linear-gradient(45deg,#c0c0c0,rgba(192,192,192,0.5),#c0c0c0)] bg-[length:200%_200%] animate-shine">
                              <input
                                type="text"
                                readOnly
                                disabled
                                tabIndex={-1}
                                value={totalVal}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-lg sm:text-xl font-black text-slate-950 cursor-default select-none focus:outline-none"
                                dir="ltr"
                                title="المجموع التلقائي من 100 (حقل غير مفعّل ومحسوب آلياً)"
                              />
                            </td>
                          </>
                        ) : isMiddleOrSecondary ? (
                          <>
                            {/* 1. كراسة الواجب (عظمى 15 للثانوي، 10 للإعدادي) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-0`}
                                type="text"
                                value={getFieldValue(student, 'homework')}
                                onChange={e => handleFieldChange(student.id, 'homework', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 0)}
                                onPaste={e => handlePaste(e, rowIndex, 'homework')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title={isSecondary ? "كراسة الواجب (الدرجة العظمى 15)" : "كراسة الواجب (الدرجة العظمى 10)"}
                              />
                            </td>

                            {/* 2. التقييم الأسبوعى (عظمى 15 للثانوي، 20 للإعدادي) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-1`}
                                type="text"
                                value={getFieldValue(student, 'weeklyAssessment')}
                                onChange={e => handleFieldChange(student.id, 'weeklyAssessment', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 1)}
                                onPaste={e => handlePaste(e, rowIndex, 'weeklyAssessment')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title={isSecondary ? "التقييم الأسبوعي (الدرجة العظمى 15)" : "التقييم الأسبوعي (الدرجة العظمى 20)"}
                              />
                            </td>

                            {/* 3. السلوك والمواظبة (عظمى 10) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-2`}
                                type="text"
                                value={getFieldValue(student, 'behavior')}
                                onChange={e => handleFieldChange(student.id, 'behavior', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 2)}
                                onPaste={e => handlePaste(e, rowIndex, 'behavior')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="السلوك والمواظبة (الدرجة العظمى 10)"
                              />
                            </td>

                            {/* 4. الاختبار الأول (عظمى 15) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-3`}
                                type="text"
                                value={getFieldValue(student, 'firstMonthlyExam')}
                                onChange={e => handleFieldChange(student.id, 'firstMonthlyExam', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 3)}
                                onPaste={e => handlePaste(e, rowIndex, 'firstMonthlyExam')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="الاختبار الأول (الدرجة العظمى 15)"
                              />
                            </td>

                            {/* 5. الاختبار الثانى (عظمى 15) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-4`}
                                type="text"
                                value={getFieldValue(student, 'secondMonthlyExam')}
                                onChange={e => handleFieldChange(student.id, 'secondMonthlyExam', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 4)}
                                onPaste={e => handlePaste(e, rowIndex, 'secondMonthlyExam')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                                title="الاختبار الثاني (الدرجة العظمى 15)"
                              />
                            </td>

                            {/* 6. المجموع (عظمى 70) - حقل غير مفعل للقراءة فقط ومحسوب تلقائياً */}
                            <td className="p-0 border-2 border-slate-900 bg-[linear-gradient(45deg,#c0c0c0,rgba(192,192,192,0.5),#c0c0c0)] bg-[length:200%_200%] animate-shine">
                              <input
                                type="text"
                                readOnly
                                disabled
                                tabIndex={-1}
                                value={totalVal}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-lg sm:text-xl font-black text-slate-950 cursor-default select-none focus:outline-none"
                                dir="ltr"
                                title="المجموع التلقائي من 70 (حقل غير مفعّل ومحسوب آلياً)"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            {/* 1. كراسة الحصة (عظمى 5) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-0`}
                                type="text"
                                value={getFieldValue(student, 'classNotebook')}
                                onChange={e => handleFieldChange(student.id, 'classNotebook', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 0)}
                                onPaste={e => handlePaste(e, rowIndex, 'classNotebook')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                              />
                            </td>

                            {/* 2. كراسة الواجب (عظمى 5) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-1`}
                                type="text"
                                value={getFieldValue(student, 'homework')}
                                onChange={e => handleFieldChange(student.id, 'homework', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 1)}
                                onPaste={e => handlePaste(e, rowIndex, 'homework')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                              />
                            </td>

                            {/* 3. التقييم الأسبوعى (عظمى 10) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-2`}
                                type="text"
                                value={getFieldValue(student, 'weeklyAssessment')}
                                onChange={e => handleFieldChange(student.id, 'weeklyAssessment', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 2)}
                                onPaste={e => handlePaste(e, rowIndex, 'weeklyAssessment')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                              />
                            </td>

                            {/* 4. السلوك والمواظبة (عظمى 5) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-3`}
                                type="text"
                                value={getFieldValue(student, 'behavior')}
                                onChange={e => handleFieldChange(student.id, 'behavior', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 3)}
                                onPaste={e => handlePaste(e, rowIndex, 'behavior')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                              />
                            </td>

                            {/* 5. الاختبار الأول (عظمى 15) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-4`}
                                type="text"
                                value={getFieldValue(student, 'firstMonthlyExam')}
                                onChange={e => handleFieldChange(student.id, 'firstMonthlyExam', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 4)}
                                onPaste={e => handlePaste(e, rowIndex, 'firstMonthlyExam')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                              />
                            </td>

                            {/* 6. الاختبار الثانى (عظمى 15) */}
                            <td className="p-0 border-2 border-slate-900 bg-inherit focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600">
                              <input
                                id={`detailed-cell-${rowIndex}-5`}
                                type="text"
                                value={getFieldValue(student, 'secondMonthlyExam')}
                                onChange={e => handleFieldChange(student.id, 'secondMonthlyExam', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, rowIndex, 5)}
                                onPaste={e => handlePaste(e, rowIndex, 'secondMonthlyExam')}
                                onFocus={e => { e.target.select(); centerActiveCellInView(e.target); }}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-base sm:text-lg font-bold focus:outline-none focus:bg-white/80"
                                dir="ltr"
                              />
                            </td>

                            {/* 7. المجموع (عظمى 40) - حقل غير مفعل للقراءة فقط ومحسوب تلقائياً */}
                            <td className="p-0 border-2 border-slate-900 bg-[linear-gradient(45deg,#c0c0c0,rgba(192,192,192,0.5),#c0c0c0)] bg-[length:200%_200%] animate-shine">
                              <input
                                type="text"
                                readOnly
                                disabled
                                tabIndex={-1}
                                value={totalVal}
                                className="w-full h-full bg-transparent border-none py-2 text-center text-lg sm:text-xl font-black text-slate-950 cursor-default select-none focus:outline-none"
                                dir="ltr"
                                title="المجموع التلقائي من 40 (حقل غير مفعّل ومحسوب آلياً)"
                              />
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal تخصيص ألوان الصفوف */}
      <PortalModal><AnimatePresence>
        {showThemeSelectorModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowThemeSelectorModal(false)}
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
                    onClick={() => setShowThemeSelectorModal(false)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <RowThemeSelector
                  title="اختر لون خلفية الصفوف المتبادل مع اللون الأبيض فى جداول التحرير والرصد"
                  storageKey="detailed_assessments_row_theme"
                  defaultTheme={editingRowTheme}
                  onThemeChange={(theme) => {
                    setEditingRowTheme(theme);
                    setTimeout(() => setShowThemeSelectorModal(false), 160);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence></PortalModal>

      {/* نافذة القائمة (Action Menu) المطابقة لشاشة التقييمات إجمالاً */}
      <PortalModal><AnimatePresence>
        {isActionMenuOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
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
                
                {/* خيار رقم الجلوس */}
                <ActionMenuButton
                  onClick={() => {
                    setShowSeatNumber(prev => !prev);
                    setIsActionMenuOpen(false);
                  }}
                  icon={showSeatNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  text={showSeatNumber ? 'إخفاء عمود رقم الجلوس' : 'إظهار عمود رقم الجلوس'}
                  bgGradient="bg-[linear-gradient(to_right,#f59e0b,#d97706,#f59e0b)]"
                />

                {/* خيار الرقم السري */}
                <ActionMenuButton
                  onClick={() => {
                    setShowSecretNumber(prev => !prev);
                    setIsActionMenuOpen(false);
                  }}
                  icon={showSecretNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  text={showSecretNumber ? 'إخفاء عمود الرقم السري' : 'إظهار عمود الرقم السري'}
                  bgGradient="bg-[linear-gradient(to_right,#8b5cf6,#a855f7,#8b5cf6)]"
                />

                {/* زر تحرير بيانات الفصل الدراسي الحالي - موضوع فوق زر التقييمات إجمالاً */}
                {isFirstSemester ? (
                  <>
                    {(onEditData || onNavigateToSection) && (
                      <ActionMenuButton
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          handleSelectSubject(selectedSubjectKey);
                          onChange(localData);
                          if (onNavigateToSection) onNavigateToSection(4, 'first');
                          else if (onEditData) onEditData('first');
                        }}
                        icon={<Edit className="w-4 h-4" />}
                        text="تحرير بيانات الفصل الدراسي الأول"
                        bgGradient="bg-[linear-gradient(to_right,#8b5cf6,#a855f7,#8b5cf6)]"
                      />
                    )}
                  </>
                ) : (
                  <>
                    {(onEditData || onNavigateToSection) && (
                      <ActionMenuButton
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          handleSelectSubject(selectedSubjectKey);
                          onChange(localData);
                          if (onNavigateToSection) onNavigateToSection(4, 'second');
                          else if (onEditData) onEditData('second');
                        }}
                        icon={<Edit className="w-4 h-4" />}
                        text="تحرير بيانات الفصل الدراسي الثانى"
                        bgGradient="bg-[linear-gradient(to_right,#d946ef,#ec4899,#d946ef)]"
                      />
                    )}
                  </>
                )}

                {/* التقييمات إجمالاً وتحرير درجات الإمتحانات التحريرية */}
                {(() => {
                  const isOfficialMode = !isTrialMode;
                  const hasAnyStudent = Boolean(data && data.length > 0 && data.some(s => s && s.name && s.name.trim().length > 0));
                  const isOfficialNoStudents = isOfficialMode && !hasAnyStudent;
                  return (
                    <>
                      {/* التقييمات إجمالاً */}
                      {onNavigateToGeneralAssessments && (
                        <ActionMenuButton
                          onClick={() => {
                            if (isOfficialNoStudents) return;
                            setIsActionMenuOpen(false);
                            handleSelectSubject(selectedSubjectKey);
                            onNavigateToGeneralAssessments();
                          }}
                          disabled={isOfficialNoStudents}
                          icon={<BookOpen className="w-4 h-4" />}
                          text="التقييمات إجمالاً"
                          bgGradient="bg-[linear-gradient(to_right,#0d9488,#10b981,#0d9488)]"
                        />
                      )}

                      {/* تحرير درجات الإمتحانات التحريرية */}
                      {isFirstSemester ? (
                        <>
                          {!isKindergarten && (onEditWrittenExams || onNavigateToSection) && (
                            <ActionMenuButton
                              onClick={() => {
                                if (isOfficialNoStudents) return;
                                setIsActionMenuOpen(false);
                                handleSelectSubject(selectedSubjectKey);
                                onChange(localData);
                                if (onNavigateToSection) onNavigateToSection(7, 'first');
                                else if (onEditWrittenExams) onEditWrittenExams('first');
                              }}
                              disabled={isOfficialNoStudents}
                              icon={<PenTool className="w-4 h-4" />}
                              text="تحرير درجات الإمتحانات التحريرية - الفصل الدراسي الأول"
                              bgGradient="bg-[linear-gradient(to_right,#2563eb,#3b82f6,#2563eb)]"
                            />
                          )}
                        </>
                      ) : (
                        <>
                          {!isKindergarten && (onEditWrittenExams || onNavigateToSection) && (
                            <ActionMenuButton
                              onClick={() => {
                                if (isOfficialNoStudents) return;
                                setIsActionMenuOpen(false);
                                handleSelectSubject(selectedSubjectKey);
                                onChange(localData);
                                if (onNavigateToSection) onNavigateToSection(7, 'second');
                                else if (onEditWrittenExams) onEditWrittenExams('second');
                              }}
                              disabled={isOfficialNoStudents}
                              icon={<PenTool className="w-4 h-4" />}
                              text="تحرير درجات الإمتحانات التحريرية - الفصل الدراسي الثانى"
                              bgGradient="bg-[linear-gradient(to_right,#4f46e5,#6366f1,#4f46e5)]"
                            />
                          )}
                        </>
                      )}
                    </>
                  );
                })()}

                {/* زر الإغلاق الدائري مع الخط المشع */}
                <div className="relative mt-2 pt-4 flex justify-center w-full shrink-0">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-200 overflow-hidden rounded-full">
                    <div className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine" style={{ animationDuration: '3s' }}></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActionMenuOpen(false)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg border border-slate-900/40 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                    title="إغلاق"
                  >
                    <X className="w-8 h-8" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence></PortalModal>

      {/* نافذة الطباعة (Print Menu) المطابقة لشاشة التقييمات إجمالاً */}
      <PortalModal><AnimatePresence>
        {isPrintMenuOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
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
              className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-[480px]"
            >
              <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-8px', animationDuration: '15s' }}></div>
              <div className="bg-white rounded-[22px] p-6 flex flex-col gap-3 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                
                {/* بطاقة ألوان الطباعة */}
                <RowThemeSelector />

                {/* 1. تقييمات المواد تفصيلا */}
                <ActionMenuButton
                  onClick={() => {
                    setIsPrintMenuOpen(false);
                    setIsSubjectPrintModalOpen(true);
                  }}
                  icon={<Printer className="w-4 h-4" />}
                  text="تقييمات المواد تفصيلا"
                  bgGradient="bg-[linear-gradient(to_right,#059669,#10b981,#059669)]"
                />

                {/* 2. شهادات بعد الاختبار الأول */}
                <ActionMenuButton
                  onClick={async () => {
                    setIsPrintMenuOpen(false);
                    try {
                      const isHs = Boolean(systemType === 'homeschool' || (title && (title.includes('منازل') || title.toLowerCase().includes('homeschool'))));
                      const isMidHs = isMiddle && isHs;
                      await exportDetailedAssessmentsCertificatesPdf({
                        students: sortStudents(localData, sortBy, semester, lang),
                        semester,
                        selectedGrade,
                        stage,
                        examIndex: 1,
                        schoolName,
                        schoolNameEn,
                        administration,
                        administrationEn,
                        schoolLogo,
                        dataOfficer,
                        dataOfficerEn,
                        controlHead,
                        controlHeadEn,
                        committeeHead,
                        committeeHeadEn,
                        systemType: systemType || (isHs ? 'homeschool' : 'regular'),
                        title,
                        isHomeschool: isHs,
                        isMiddleHomeschool: isMidHs,
                      });
                    } catch (e) {
                      console.error('Failed to export certificates PDF', e);
                    }
                  }}
                  icon={<Printer className="w-4 h-4" />}
                  text={
                    semester === 'second'
                      ? 'شهادات تقييمات الفصل الدراسي الثانى بعد الاختبار الأول'
                      : 'شهادات تقييمات الفصل الدراسي الأول بعد الاختبار الأول'
                  }
                  bgGradient="bg-[linear-gradient(to_right,#f59e0b,#d97706,#f59e0b)]"
                />

                {/* 3. شهادات بعد الاختبار الثانى */}
                <ActionMenuButton
                  onClick={async () => {
                    setIsPrintMenuOpen(false);
                    try {
                      const isHs = Boolean(systemType === 'homeschool' || (title && (title.includes('منازل') || title.toLowerCase().includes('homeschool'))));
                      const isMidHs = isMiddle && isHs;
                      await exportDetailedAssessmentsCertificatesPdf({
                        students: sortStudents(localData, sortBy, semester, lang),
                        semester,
                        selectedGrade,
                        stage,
                        examIndex: 2,
                        schoolName,
                        schoolNameEn,
                        administration,
                        administrationEn,
                        schoolLogo,
                        dataOfficer,
                        dataOfficerEn,
                        controlHead,
                        controlHeadEn,
                        committeeHead,
                        committeeHeadEn,
                        systemType: systemType || (isHs ? 'homeschool' : 'regular'),
                        title,
                        isHomeschool: isHs,
                        isMiddleHomeschool: isMidHs,
                      });
                    } catch (e) {
                      console.error('Failed to export certificates PDF', e);
                    }
                  }}
                  icon={<Printer className="w-4 h-4" />}
                  text={
                    semester === 'second'
                      ? 'شهادات تقييمات الفصل الدراسي الثانى بعد الاختبار الثانى'
                      : 'شهادات تقييمات الفصل الدراسي الأول بعد الاختبار الثانى'
                  }
                  bgGradient="bg-[linear-gradient(to_right,#8b5cf6,#6366f1,#8b5cf6)]"
                />

                {isKindergarten && (
                  <>
                    <ActionMenuButton
                      onClick={async () => {
                        setIsPrintMenuOpen(false);
                        try {
                          await exportKgStudentEvaluationsReportPdf({
                            students: sortStudents(localData, sortBy, semester, lang),
                            semester,
                            selectedGrade,
                            stage,
                            schoolName,
                            administration,
                            dataOfficer,
                            controlHead,
                            committeeHead,
                            rowTheme: (localStorage.getItem('pdf_print_row_theme') as RowBgTheme) || undefined,
                          });
                        } catch (e) {
                          console.error('Failed to export KG evaluations PDF', e);
                        }
                      }}
                      icon={<Printer className="w-4 h-4" />}
                      text="تقرير تقييمات التلميذ"
                      bgGradient="bg-[linear-gradient(to_right,#0284c7,#0d9488,#10b981)]"
                    />
                    <ActionMenuButton
                      onClick={async () => {
                        setIsPrintMenuOpen(false);
                        try {
                          await exportKgStudentEvaluationsReportPdf({
                            students: sortStudents(localData, sortBy, semester, lang),
                            semester,
                            selectedGrade,
                            stage,
                            schoolName,
                            administration,
                            dataOfficer,
                            controlHead,
                            committeeHead,
                            isParentNotice: true,
                            rowTheme: (localStorage.getItem('pdf_print_row_theme') as RowBgTheme) || undefined,
                          });
                        } catch (e) {
                          console.error('Failed to export KG parent notice PDF', e);
                        }
                      }}
                      icon={<Printer className="w-4 h-4" />}
                      text="إخطار ولى الأمر"
                      bgGradient="bg-[linear-gradient(to_right,#f59e0b,#ea580c,#d97706)]"
                    />
                  </>
                )}

                {!isKindergarten && (
                  <>
                    <ActionMenuButton
                      onClick={async () => {
                        setIsPrintMenuOpen(false);
                        try {
                          const isHs = Boolean(systemType === 'homeschool' || (title && (title.includes('منازل') || title.toLowerCase().includes('homeschool'))));
                          const isMidHs = isMiddle && isHs;
                          await exportStudentSemesterGradesCertificatePdf({
                            students: sortStudents(localData, sortBy, semester, lang),
                            semester,
                            selectedGrade,
                            stage,
                            schoolName,
                            schoolNameEn,
                            administration,
                            administrationEn,
                            schoolLogo,
                            dataOfficer,
                            dataOfficerEn,
                            controlHead,
                            controlHeadEn,
                            committeeHead,
                            committeeHeadEn,
                            rowTheme: (localStorage.getItem('pdf_print_row_theme') as RowBgTheme) || undefined,
                            systemType: systemType || (isHs ? 'homeschool' : 'regular'),
                            title,
                            isHomeschool: isHs,
                            isMiddleHomeschool: isMidHs,
                          });
                        } catch (e) {
                          console.error('Failed to export student semester grades certificate PDF', e);
                        }
                      }}
                      icon={<Printer className="w-4 h-4" />}
                      text={
                        semester === 'second'
                          ? 'شهادة درجات الطالب فى الفصل الدراسي الثانى'
                          : 'شهادة درجات الطالب فى الفصل الدراسي الأول'
                      }
                      bgGradient="bg-[linear-gradient(to_right,#0284c7,#0d9488,#10b981)]"
                    />
                    <ActionMenuButton
                      onClick={async () => {
                        setIsPrintMenuOpen(false);
                        const printFn = async () => {
                          try {
                            const isHs = Boolean(systemType === 'homeschool' || (title && (title.includes('منازل') || title.toLowerCase().includes('homeschool'))));
                            const isMidHs = isMiddle && isHs;
                            await exportStudentSemesterGradesCertificatePdf({
                              students: sortStudents(localData, sortBy, semester, lang),
                              semester,
                              selectedGrade,
                              stage,
                              schoolName,
                              schoolNameEn,
                              administration,
                              administrationEn,
                              schoolLogo,
                              dataOfficer,
                              dataOfficerEn,
                              controlHead,
                              controlHeadEn,
                              committeeHead,
                              committeeHeadEn,
                              rowTheme: (localStorage.getItem('pdf_print_row_theme') as RowBgTheme) || undefined,
                              isEnglishCertificate: true,
                              systemType: systemType || (isHs ? 'homeschool' : 'regular'),
                              title,
                              isHomeschool: isHs,
                              isMiddleHomeschool: isMidHs,
                            });
                          } catch (e) {
                            console.error('Failed to export student semester grades certificate PDF (EN)', e);
                          }
                        };

                        if (isOfficial && !isEnglishCertUnlocked()) {
                          setPendingPrintCallback(() => printFn);
                          setShowEnglishCertPasswordModal(true);
                        } else {
                          printFn();
                        }
                      }}
                      icon={<Printer className="w-4 h-4" />}
                      text={
                        lang === 'ar'
                          ? (semester === 'second'
                              ? 'شهادة درجات وتقييمات الفصل الدراسي الثانى باللغة الإنجليزية'
                              : 'شهادة درجات وتقييمات الفصل الدراسي الأول باللغة الإنجليزية')
                          : (semester === 'second'
                              ? 'Second Semester Grades & Assessments Certificate (English)'
                              : 'First Semester Grades & Assessments Certificate (English)')
                      }
                      bgGradient="bg-[linear-gradient(to_right,#4f46e5,#7c3aed,#9333ea)]"
                    />
                  </>
                )}

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

                {/* زر الإغلاق الدائري */}
                <div className="relative mt-2 pt-4 flex justify-center w-full shrink-0">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-200 overflow-hidden rounded-full">
                    <div className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine" style={{ animationDuration: '3s' }}></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrintMenuOpen(false)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg border border-slate-900/40 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                    title="إغلاق"
                  >
                    <X className="w-8 h-8" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence></PortalModal>

      {/* نافذة اختيار المادة لطباعة تقييماتها تفصيلاً */}
      <PortalModal><AnimatePresence>
        {isSubjectPrintModalOpen && (
          <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsSubjectPrintModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: 90 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: -90 }}
              className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-[480px] z-10"
            >
              <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-8px', animationDuration: '15s' }}></div>
              <div className="bg-white rounded-[22px] p-6 flex flex-col gap-3 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                
                <div className="text-center font-black text-slate-800 text-lg border-b border-slate-200 pb-3 mb-1">
                  اختر المادة الدراسية لطباعة تقييماتها تفصيلاً
                </div>

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
                  return subjects.map((subj, sIdx) => (
                    <ActionMenuButton
                      key={subj.key}
                      onClick={() => {
                        handleSelectSubject(subj.key);
                        setIsSubjectPrintModalOpen(false);
                        printSubjectDetailed(subj.key, subj.label);
                      }}
                      icon={<Printer className="w-4 h-4" />}
                      text={subj.label}
                      bgGradient={subjGradients[sIdx % subjGradients.length]}
                    />
                  ));
                })()}

                {/* زر الإغلاق الدائري */}
                <div className="relative mt-2 pt-4 flex justify-center w-full shrink-0">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-200 overflow-hidden rounded-full">
                    <div className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine" style={{ animationDuration: '3s' }}></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSubjectPrintModalOpen(false)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg border border-slate-900/40 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                    title="إغلاق"
                  >
                    <X className="w-8 h-8" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence></PortalModal>

      {/* نافذة التعليمات (Instructions Modal) */}
      <PortalModal><AnimatePresence>
        {showInstructions && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 [perspective:1000px]" dir="rtl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowInstructions(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: 90 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: -90 }}
              className="relative rounded-3xl p-1 shadow-2xl w-full max-w-[520px]"
            >
              <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-8px', animationDuration: '15s' }}></div>
              <div 
                className="rounded-[22px] p-6 flex flex-col gap-4 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar bg-[linear-gradient(135deg,#fff1f2_0%,#ffe4e6_45%,#fda4af_100%)] bg-[length:200%_200%] animate-shine shadow-inner border border-rose-300/80"
                style={{ animationDuration: '8s' }}
              >
                <div className="text-center font-black text-xl text-slate-900 pb-2 border-b-2 border-rose-300/80 flex items-center justify-center gap-2">
                  <motion.div
                    animate={{
                      rotate: [-2, 2, -2],
                      y: [-1, 1, -1]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3.5,
                      ease: "easeInOut"
                    }}
                    className="flex items-center justify-center gap-2 origin-center"
                  >
                    <Info className="w-6 h-6 text-amber-500" />
                    <span>تعليمات وضوابط التقييمات التفصيلية</span>
                  </motion.div>
                </div>

                <div className="flex flex-col gap-3 text-sm text-slate-700 font-bold leading-relaxed">
                  {/* الصندوق 1: توزيع درجات المادة بإطار أسود متحرك ببطء */}
                  <div 
                    className="p-[2px] rounded-xl bg-[linear-gradient(90deg,#000000_30%,#ffffff_50%,#000000_70%)] bg-[length:200%_auto] animate-shine shadow-sm"
                    style={{ animationDuration: '12s' }}
                  >
                    <div className="p-3 bg-teal-50 rounded-[10px] text-teal-900">
                      {isPESubject ? (
                        <>
                          <strong>توزيع درجات مادة التربية الرياضية دائماً (المجموع 100 درجة) :</strong>
                          <ul className="list-disc list-inside mt-1.5 space-y-1 text-xs sm:text-sm">
                            <li>المجال البدنى والمهارى : 50 درجة.</li>
                            <li>المجال المعرفى : 20 درجة.</li>
                            <li>المجال الوجدانى والسلوكى : 20 درجة.</li>
                            <li>الزى الرياضى والمواظبة : 10 درجات (هذه الدرجة التى تدخل ضمن معادلة احتساب نسبة حضور الطالب فيما بعد فى الشهادات).</li>
                            <li>المجموع : 100 درجة (محسوب آلياً ومجمّد للعرض والتزامن الفوري).</li>
                          </ul>
                          <div className="mt-2.5 pt-2 border-t border-teal-200 text-xs text-teal-800">
                            ملاحظة: هذا التوزيع معتمد دائماً لمادة التربية الرياضية لجميع المراحل الدراسية (ما عدا رياض الأطفال).
                          </div>
                        </>
                      ) : isNoWrittenExceptPe ? (
                        <>
                          <strong>توزيع درجات المواد التى ليس لها امتحان تحريري عدا التربية الرياضية (المجموع 100 درجة) :</strong>
                          <ul className="list-disc list-inside mt-1.5 space-y-1 text-xs sm:text-sm">
                            <li>الأداء العملى والمهارى : 60 درجة</li>
                            <li>الأنشطة الصفية : 20 درجة</li>
                            <li>السلوك والمواظبة : 20 درجة</li>
                            <li>المجموع : 100 درجة (محسوب آلياً ومجمّد للعرض والتزامن الفوري)</li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <strong>توزيع درجات المادة ({isSecondary2Modern ? ' المجموع 100 درجة ' : (isMiddleOrSecondary ? ' المجموع 70 درجة ' : ' المجموع 40 درجة ')}) :</strong>
                          <ul className="list-disc list-inside mt-1.5 space-y-1 text-xs sm:text-sm">
                            {isSecondary2Modern ? (
                              <>
                                <li>التقييم الأسبوعي : 20 درجة</li>
                                <li>المشروع البحثي : 15 درجة</li>
                                <li>الحصة والواجبات : 15 درجة</li>
                                <li>السلوك والمواظبة : 10 درجات</li>
                                <li>الاختبار الأول : 20 درجة</li>
                                <li>الاختبار الثاني : 20 درجة</li>
                                <li>المجموع : 100 درجة</li>
                              </>
                            ) : isSecondary ? (
                              <>
                                <li>كراسة الواجب : 15 درجة</li>
                                <li>التقييم الأسبوعي : 15 درجة</li>
                                <li>السلوك والمواظبة : 10 درجات</li>
                                <li>الإختبار الأول : 15 درجة</li>
                                <li>الإختبار الثانى : 15 درجة</li>
                                <li>المجموع : 70 درجة</li>
                              </>
                            ) : isMiddle ? (
                              <>
                                <li>كراسة الواجب : 10 درجات</li>
                                <li>التقييم الأسبوعي : 20 درجة</li>
                                <li>السلوك والمواظبة : 10 درجات</li>
                                <li>الإختبار الأول : 15 درجة</li>
                                <li>الإختبار الثانى : 15 درجة</li>
                                <li>المجموع : 70 درجة</li>
                              </>
                            ) : (
                              <>
                                <li>كراسة الحصة : 5 درجات</li>
                                <li>كراسة الواجب : 5 درجات</li>
                                <li>التقييم الأسبوعي : 10 درجات</li>
                                <li>السلوك والمواظبة : 5 درجات</li>
                                <li>الإختبار الأول : 15 درجة</li>
                                <li>الإختبار الثانى : 15 درجة</li>
                                <li>المجموع : 40 درجة</li>
                              </>
                            )}
                          </ul>
                          {/* مادة التربية الرياضية دائماً */}
                          <div className="mt-2.5 pt-2 border-t border-teal-200">
                            <strong>مادة التربية الرياضية دائماً (المجموع 100 درجة) :</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1 text-xs sm:text-sm">
                              <li>المجال البدنى والمهارى : 50 درجة</li>
                              <li>المجال المعرفى : 20 درجة</li>
                              <li>المجال الوجدانى والسلوكى : 20 درجة</li>
                              <li>الزى الرياضى والمواظبة : 10 درجات (هذه الدرجة التى تدخل ضمن معادلة احتساب نسبة حضور الطالب فيما بعد فى الشهادات)</li>
                              <li>المجموع : 100 درجة (محسوب آلياً ومجمّد للعرض والتزامن الفوري)</li>
                            </ul>
                          </div>
                          {/* المواد التي ليس لها امتحان تحريري (ما عدا التربية الرياضية) */}
                          <div className="mt-2.5 pt-2 border-t border-teal-200">
                            <strong>المواد التى ليس لها امتحان تحريري عدا التربية الرياضية (المجموع 100 درجة) :</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1 text-xs sm:text-sm">
                              <li>الأداء العملى والمهارى : 60 درجة</li>
                              <li>الأنشطة الصفية : 20 درجة</li>
                              <li>السلوك والمواظبة : 20 درجة</li>
                              <li>المجموع : 100 درجة</li>
                            </ul>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* الصندوق 2: آلية احتساب المجموع بإطار أسود متحرك ببطء */}
                  <div 
                    className="p-[2px] rounded-xl bg-[linear-gradient(90deg,#000000_30%,#ffffff_50%,#000000_70%)] bg-[length:200%_auto] animate-shine shadow-sm"
                    style={{ animationDuration: '12s' }}
                  >
                    <div className="p-3 bg-amber-50 rounded-[10px] text-amber-900 text-xs sm:text-sm">
                      <strong>آلية احتساب المجموع :</strong> يُحسب المجموع تلقائياً وفقاً للمعادلة {isSecondary2Modern ? '( التقييم الأسبوعي [ 20 ] + المشروع البحثي [ 15 ] + الحصة والواجبات [ 15 ] + السلوك والمواظبة [ 10 ] + الاختبار الأول [ 20 ] + الاختبار الثاني [ 20 ] ) ليصبح المجموع من 100 درجة.' : isPESubject ? '( المجال البدنى والمهارى [ 50 ] + المجال المعرفى [ 20 ] + المجال الوجدانى والسلوكى [ 20 ] + الزى الرياضى والمواظبة [ 10 ] ) ليصبح المجموع من 100 درجة.' : isNoWrittenExceptPe ? '( الأداء العملى والمهارى [ 60 ] + الأنشطة الصفية [ 20 ] + السلوك والمواظبة [ 20 ] ) ليصبح المجموع من 100 درجة.' : isSecondary ? '( كراسة الواجب [ 15 ] + التقييم الأسبوعي [ 15 ] + السلوك والمواظبة [ 10 ] + الإختبار الأول [ 15 ] + الإختبار الثانى [ 15 ] ) ليصبح المجموع من 70 درجة.' : isMiddle ? '( كراسة الواجب [ 10 ] + التقييم الأسبوعي [ 20 ] + السلوك والمواظبة [ 10 ] + الإختبار الأول [ 15 ] + الإختبار الثانى [ 15 ] ) ليصبح المجموع من 70 درجة.' : '( كراسة الحصة [ 5 ] + كراسة الواجب [ 5 ] + التقييم الأسبوعي [ 10 ] + السلوك والمواظبة [ 5 ] + أعلى درجات الاختبارين [ 15 ] ) ليصبح المجموع من 40 درجة.'}
                    </div>
                  </div>

                  {/* الصندوق 3: التكامل التلقائي بإطار أسود متحرك ببطء */}
                  <div 
                    className="p-[2px] rounded-xl bg-[linear-gradient(90deg,#000000_30%,#ffffff_50%,#000000_70%)] bg-[length:200%_auto] animate-shine shadow-sm"
                    style={{ animationDuration: '12s' }}
                  >
                    <div className="p-3 bg-blue-50 rounded-[10px] text-blue-900 text-xs sm:text-sm">
                      <strong>التكامل التلقائي :</strong> درجة المجموع في جدول الرصد التفصيلي فى شاشة تحرير التقييمات تفصيلا تنعكس وتتزامن تلقائياً وبشكل فوري في شاشة التقييمات إجمالاً. وعند رصد وتحرير حقول التقييمات بالقيمة الاجمالية فى شاشات تحرير التقييمات اجمالا فإن القيمة الاجمالية المكتوبة يتم توزيعها تلقائيا على الحقول التى تمثل بنود التقييم للمادة الدراسية فى شاشة التقييمات تفصيلا.
                    </div>
                  </div>
                </div>

                {/* زر الإغلاق الدائري */}
                <div className="relative mt-2 pt-4 flex justify-center w-full shrink-0">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-200 overflow-hidden rounded-full">
                    <div className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine" style={{ animationDuration: '3s' }}></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInstructions(false)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg border border-slate-900/40 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                    title="إغلاق"
                  >
                    <X className="w-8 h-8" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence></PortalModal>

      {/* نافذة اختيار المادة الدراسية في منتصف الشاشة مطابقة للمرفق تماماً */}
      <PortalModal><AnimatePresence>
        {isSubjectDropdownOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsSubjectDropdownOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: 90 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: -90 }}
              className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-[460px] z-10"
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
                  return subjects.map((subj, sIdx) => (
                    <ActionMenuButton
                      key={subj.key}
                      onClick={() => {
                        handleSelectSubject(subj.key);
                        setIsSubjectDropdownOpen(false);
                      }}
                      icon={<Printer className="w-4 h-4" />}
                      text={subj.label}
                      bgGradient={subjGradients[sIdx % subjGradients.length]}
                    />
                  ));
                })()}

                {/* زر الإغلاق الدائري مع الخط المشع */}
                <div className="relative mt-2 pt-4 flex justify-center w-full shrink-0">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-200 overflow-hidden rounded-full">
                    <div className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine" style={{ animationDuration: '3s' }}></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSubjectDropdownOpen(false)}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg border border-slate-900/40 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                    title="إغلاق"
                  >
                    <X className="w-8 h-8" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence></PortalModal>
      <AdvancedStatsModal
        isOpen={isAdvancedStatsModalOpen}
        onClose={() => setIsAdvancedStatsModalOpen(false)}
        students={localData}
        stage={stage}
        selectedGrade={selectedGrade}
        semester={semester}
        lang={lang}
      />

      <PasswordModal
        isOpen={showEnglishCertPasswordModal}
        onClose={() => setShowEnglishCertPasswordModal(false)}
        onSuccess={() => {
          localStorage.setItem('sheet_control_english_cert_unlocked_for_id', String(getDeviceId()));
          localStorage.removeItem('sheet_control_english_cert_random_id');
          setShowEnglishCertPasswordModal(false);
          if (pendingPrintCallback) {
            pendingPrintCallback();
            setPendingPrintCallback(null);
          }
        }}
        deviceIdOverride={englishCertRandomId}
        skipActivation={true}
        isVipOption={true}
        vipOptionTitle="VIP Option"
        customWhatsappMessage="السلام عليكم .. أود تحميل شهادات باللغة الانجليزية - معرف جهازي :"
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

      {/* شهادات التقدير */}
      <TopTenCertificatesModal
        isOpen={isTopTenModalOpen}
        onClose={() => setIsTopTenModalOpen(false)}
        students={localData}
        stage={stage}
        selectedGrade={selectedGrade}
        semester={semester}
        schoolName={schoolName}
        administration={administration}
      />
      <TopTenCertificatesModal
        isOpen={isTopTenDamgModalOpen}
        onClose={() => setIsTopTenDamgModalOpen(false)}
        students={localData}
        stage={stage}
        selectedGrade={selectedGrade}
        semester={semester}
        schoolName={schoolName}
        administration={administration}
        isDamgOnly={true}
      />
      <AllStudentsCertificatesModal
        isOpen={isAllStudentsCertModalOpen}
        onClose={() => setIsAllStudentsCertModalOpen(false)}
        students={localData}
        stage={stage}
        selectedGrade={selectedGrade}
        semester={semester}
        schoolName={schoolName}
        administration={administration}
      />
      <CertificatesSelectionModal
        isOpen={isCertSelectionModalOpen}
        onClose={() => setIsCertSelectionModalOpen(false)}
        onSelectTopTen={() => setIsTopTenModalOpen(true)}
        onSelectTopTenDamg={() => setIsTopTenDamgModalOpen(true)}
        onSelectAllStudents={() => setIsAllStudentsCertModalOpen(true)}
      />
    </motion.div>
  );
};
