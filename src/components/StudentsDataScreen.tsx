import { getActiveFooterTagline } from "../utils/adFilter";
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { translations, applyEntityTerms, isInternationalSchool, applyTechnicalAssessmentTerms } from '../i18n';
import { Language, StudentData, EducationType } from '../types';
import { formatNumberDigits, NumberLang } from '../utils/numberLangHelper';
import { ArrowLeft, ArrowRight, Save, Plus, Trash2, Search, Menu, ChevronDown, ArrowDownUp, Check, X, ArrowUp, ArrowDown, Info, Printer, PieChart, Edit, Calendar, PenTool, AlertTriangle, Palette, Sliders, BarChart3, Award, FileDown, Undo2, Redo2, Pencil, FileSpreadsheet, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FAST_MODAL_FLIP, FAST_BACKDROP_FADE } from '../utils/flipAnimation';
import { ActionMenuButton } from './ActionMenuButton';
import { BrandHeader } from './BrandHeader';
import { ensureCellVisible } from '../utils/cellNavigation';
import { exportStudentsDataToPdf, exportExamScheduleToPdf, getSubjectsConfigForStageGrade, PdfReportType, RowBgTheme, CustomControlSheetOptions } from '../utils/exportPdf';
import { RowThemeSelector, getTableRowColorStyle } from './RowThemeSelector';
import { PasswordModal } from './PasswordModal';
import { getDeviceId } from '../utils/activationManager';
import { FilterButtonMenu, FilterState } from './FilterButtonMenu';
import { downloadControlWorkGuide } from '../utils/controlGuideDownload';
import { useStudentHistory } from '../hooks/useStudentHistory';
import { runPrePrintAudit } from '../utils/prePrintAudit';
import { PrePrintAuditModal } from './PrePrintAuditModal';
import { EditStudentDataModal } from './EditStudentDataModal';
import { QuickSupportAuditButton } from './QuickSupportAuditButton';
import { importStudentNamesFromFile, importNationalIdsFromFile } from '../utils/importStudentsFromFile';
import {
  buildAvailableClasses,
  cleanClassName,
  deleteCustomClass,
  findMatchingExistingClass,
  getClassColumnWidthPx,
  getSavedCustomClasses,
  normalizeClassNameForCompare,
  renameCustomClass,
  saveCustomClass,
} from '../utils/customClasses';

const GradingSettingsModal = lazy(() => import('./GradingSettingsModal').then(m => ({ default: m.GradingSettingsModal })));
const SeatNumbersModal = lazy(() => import('./SeatNumbersModal').then(m => ({ default: m.SeatNumbersModal })));
const CustomControlSheetModal = lazy(() => import('./CustomControlSheetModal').then(m => ({ default: m.CustomControlSheetModal })));
const AdvancedStatsModal = lazy(() => import('./AdvancedStatsModal').then(m => ({ default: m.AdvancedStatsModal })));
const ExportExcelModal = lazy(() => import('./ExportExcelModal').then(m => ({ default: m.ExportExcelModal })));
const TopTenCertificatesModal = lazy(() => import('./TopTenCertificatesModal').then(m => ({ default: m.TopTenCertificatesModal })));
const AllStudentsCertificatesModal = lazy(() => import('./AllStudentsCertificatesModal').then(m => ({ default: m.AllStudentsCertificatesModal })));
const CertificatesSelectionModal = lazy(() => import('./CertificatesSelectionModal').then(m => ({ default: m.CertificatesSelectionModal })));

interface StudentsDataScreenProps {
  lang: Language;
  semester: string;
  title: string;
  stage?: string;
  selectedGrade?: string;
  administration?: string;
  schoolName?: string;
  dataOfficer?: string;
  controlHead?: string;
  committeeHead?: string;
  data: StudentData[];
  onChange: (data: StudentData[]) => void;
  onBack: () => void;
  onSave: () => void;
  showExamFields: boolean;
  systemType?: 'regular' | 'homeschool' | 'services';
  onNavigateToSection?: (step: number, semester?: string) => void;
  onEditData?: (semester?: string) => void;
  onEditAssessments?: (semester?: string) => void;
  onEditWrittenExams?: (semester?: string) => void;
  onSwitchSemester?: (newSem: string) => void;
  sortBy?: { id: string; direction: 'asc' | 'desc' }[];
  onSortChange?: (newSort: { id: string; direction: 'asc' | 'desc' }[]) => void;
  isTrialMode?: boolean;
  educationType?: EducationType;
}

interface ExamScheduleItem {
  id: string;
  day: string;
  date: string;
  period: string;
  fromTime?: string;
  toTime?: string;
  subject: string;
}

const SCHEDULE_DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const SCHEDULE_PERIODS = ['الفترة الأولى', 'الفترة الثانية', 'الفترة الثالثة'];

export const sortExamScheduleItems = (items: ExamScheduleItem[]): ExamScheduleItem[] => {
  const DAY_ORDER: Record<string, number> = {
    'السبت': 1,
    'الأحد': 2,
    'الاحد': 2,
    'الإثنين': 3,
    'الاثنين': 3,
    'الثلاثاء': 4,
    'الأربعاء': 5,
    'الاربعاء': 5,
    'الخميس': 6,
    'الجمعة': 7,
  };

  const PERIOD_ORDER: Record<string, number> = {
    'الفترة الأولى': 1,
    'الفترة الاولى': 1,
    'الفترة الثانية': 2,
    'الفترة الثالثة': 3,
    'الفترة الرابعة': 4,
    'الفترة الخامسة': 5,
  };

  return [...items].sort((a, b) => {
    // 1. الترتيب حسب التاريخ إن وجد وإلا حسب أيام الأسبوع
    if (a.date && b.date && a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }

    const dayA = DAY_ORDER[(a.day || '').trim()] || 99;
    const dayB = DAY_ORDER[(b.day || '').trim()] || 99;

    if (dayA !== dayB) {
      return dayA - dayB;
    }

    // 2. الترتيب حسب الفترة
    const perA = PERIOD_ORDER[(a.period || '').trim()] || (parseInt(a.period || '') || 99);
    const perB = PERIOD_ORDER[(b.period || '').trim()] || (parseInt(b.period || '') || 99);

    if (perA !== perB) {
      return perA - perB;
    }

    // 3. الترتيب حسب وقت البداية
    if (a.fromTime && b.fromTime && a.fromTime !== b.fromTime) {
      return a.fromTime.localeCompare(b.fromTime);
    }

    return 0;
  });
};

const formatDateRTL = (dStr: string, nLang: NumberLang) => {
  if (!dStr) return '-';
  const cleanStr = dStr.trim();
  const parts = cleanStr.split(/[-/]/);
  let formatted = cleanStr;
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      formatted = `${parts[2]} / ${parts[1]} / ${parts[0]}`;
    } else if (parts[2].length === 4) {
      formatted = `${parts[0]} / ${parts[1]} / ${parts[2]}`;
    }
  }
  return formatNumberDigits(formatted, nLang);
};

export const StudentsDataScreen: React.FC<StudentsDataScreenProps> = ({
  lang,
  semester,
  title,
  stage,
  selectedGrade,
  administration,
  schoolName,
  dataOfficer,
  controlHead,
  committeeHead,
  data,
  onChange: propOnChange,
  onBack,
  onSave,
  showExamFields,
  systemType,
  onNavigateToSection,
  onEditData,
  onEditAssessments,
  onEditWrittenExams,
  onEditDetailedAssessments,
  onSwitchSemester,
  sortBy: externalSortBy,
  onSortChange,
  isTrialMode = false,
  educationType,
}) => {
  const t = translations[lang];
  const [auditModalState, setAuditModalState] = useState<{ isOpen: boolean; isPrintTrigger: boolean }>({
    isOpen: false,
    isPrintTrigger: false,
  });
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
  const auditHighlightTimerRef = React.useRef<number | null>(null);
  const [editingStudentState, setEditingStudentState] = useState<{ student: StudentData; rowNumber: number } | null>(null);
  const [editClassModalState, setEditClassModalState] = useState<{
    originalName: string;
    newName: string;
    error: string | null;
    confirmDelete: boolean;
  } | null>(null);
  const skipAutoSyncSnapshotRef = React.useRef<StudentData[] | null>(null);
  const userEditedExamNumbersRef = React.useRef(false);
  const {
    handleChange: onChange,
    applySilentChange,
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
  } = useStudentHistory(data, propOnChange, {
    onHistoryNavigate: (_direction, restoredData) => {
      skipAutoSyncSnapshotRef.current = restoredData;
      const prevIds = data.map((s) => s.id).join(',');
      const nextIds = restoredData.map((s) => s.id).join(',');
      if (prevIds !== nextIds) {
        frozenIdsRef.current = [];
        setIsEditingData(false);
      }
    },
    enableShortcuts: !auditModalState.isOpen && !editingStudentState && !editClassModalState,
  });
  const [numberLang, setNumberLang] = useState<NumberLang>(() => {
    return (localStorage.getItem('sheet_control_number_lang') as NumberLang) || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('sheet_control_number_lang', numberLang);
  }, [numberLang]);
  const isKindergarten = stage === 'kindergarten';
  const isInternational = isInternationalSchool(educationType);
  const showExemptionStatus = isInternational && !isKindergarten;
  const colOffset = showExemptionStatus ? 1 : 0;
  const isFirstSemester = semester === 'first';
  const isHomeschool = systemType === 'homeschool' || Boolean(title && (title.includes('منازل') || title.toLowerCase().includes('homeschool')));
  const isMiddleOrSecHomeschool = (stage === 'middle' || stage === 'prep' || stage === 'secondary' || Boolean(title && (title.includes('المرحلة الإعدادية') || title.includes('المرحلة الثانوية') || title.includes('ثانوي')))) && isHomeschool;

  const isFirstGrade = (() => {
    if (!selectedGrade) return true;
    const trimmed = selectedGrade.trim();
    if (stage === 'kindergarten') {
      return trimmed.includes('الأول') || trimmed.includes('KG1') || trimmed.includes('1');
    }
    return trimmed === 'الصف الأول' || trimmed.includes('الأول') || trimmed === '1st Grade';
  })();

  const [savedCustomClasses, setSavedCustomClasses] = useState<string[]>(() =>
    getSavedCustomClasses(stage, selectedGrade)
  );

  useEffect(() => {
    setSavedCustomClasses(getSavedCustomClasses(stage, selectedGrade));
  }, [stage, selectedGrade]);

  const {
    defaultClasses: defaultClassesList,
    customClasses: customClassesList,
    allClasses: availableClasses,
  } = React.useMemo(
    () =>
      buildAvailableClasses({
        stage,
        selectedGrade,
        data,
        savedCustomClasses,
      }),
    [stage, selectedGrade, data, savedCustomClasses]
  );

  const classColWidth = React.useMemo(
    () => getClassColumnWidthPx(customClassesList, 128),
    [customClassesList]
  );

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

    // Default to new / transferred
    return isFirst ? (isFemale ? 'مستجدة' : 'مستجد') : (isFemale ? 'منقولة' : 'منقول');
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  const [isEditingData, setIsEditingData] = useState(false);
  const frozenIdsRef = React.useRef<string[]>([]);
  const filteredDataRef = React.useRef<StudentData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalText, setModalText] = useState('');
  const studentFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [importFileFeedback, setImportFileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentData | null>(null);
  const [isNationalIdModalOpen, setIsNationalIdModalOpen] = useState(false);
  const [nationalIdModalText, setNationalIdModalText] = useState('');
  const nidFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isImportingNidFile, setIsImportingNidFile] = useState(false);
  const [importNidFileFeedback, setImportNidFileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDefaultValuesModalOpen, setIsDefaultValuesModalOpen] = useState(false);
  const [defaultEnrollmentStatus, setDefaultEnrollmentStatus] = useState<'منقول' | ''>('منقول');
  const [defaultExemptionStatus, setDefaultExemptionStatus] = useState<'كلى' | 'تدريجى' | ''>(() => (showExemptionStatus ? 'كلى' : ''));
  const [defaultEnrollmentType, setDefaultEnrollmentType] = useState<'قيد عادى' | ''>('قيد عادى');
  const [defaultReligion, setDefaultReligion] = useState<'muslim' | ''>('muslim');
  const [showInstructions, setShowInstructions] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const stageDisplayName = (() => {
    if (stage === 'primary') return 'الابتدائية';
    if (stage === 'middle' || stage === 'prep') return 'الإعدادية';
    if (stage === 'secondary') return 'الثانوية';
    if (stage === 'kindergarten') return 'رياض الأطفال';
    return stage || '';
  })();

  const examScheduleStorageKey = `sheet_control_exam_schedule_${stage || 'default'}_${selectedGrade || 'default'}_${semester || 'first'}`;

  const [isExamScheduleModalOpen, setIsExamScheduleModalOpen] = useState(false);
  const [examSchedule, setExamSchedule] = useState<ExamScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(examScheduleStorageKey);
      return saved ? sortExamScheduleItems(JSON.parse(saved)) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(examScheduleStorageKey);
      setExamSchedule(saved ? sortExamScheduleItems(JSON.parse(saved)) : []);
    } catch {
      setExamSchedule([]);
    }
  }, [examScheduleStorageKey]);

  const scheduleRowSpans = React.useMemo(() => {
    const n = examSchedule.length;
    const daySpans = new Array(n).fill(1);
    const dateSpans = new Array(n).fill(1);
    const periodSpans = new Array(n).fill(1);
    const fromTimeSpans = new Array(n).fill(1);
    const toTimeSpans = new Array(n).fill(1);

    const showDay = new Array(n).fill(true);
    const showDate = new Array(n).fill(true);
    const showPeriod = new Array(n).fill(true);
    const showFromTime = new Array(n).fill(true);
    const showToTime = new Array(n).fill(true);

    let i = 0;
    while (i < n) {
      let j = i + 1;
      const curDay = (examSchedule[i].day || "").trim();
      const curDate = (examSchedule[i].date || "").trim();

      while (
        j < n &&
        (examSchedule[j].day || "").trim() === curDay &&
        (examSchedule[j].date || "").trim() === curDate
      ) {
        j++;
      }

      const count = j - i;
      daySpans[i] = count;
      dateSpans[i] = count;

      for (let k = i + 1; k < j; k++) {
        showDay[k] = false;
        showDate[k] = false;
        daySpans[k] = 0;
        dateSpans[k] = 0;
      }

      let p = i;
      while (p < j) {
        let q = p + 1;
        const curPeriod = (examSchedule[p].period || "").trim();

        while (
          q < j &&
          (examSchedule[q].period || "").trim() === curPeriod
        ) {
          q++;
        }

        const pCount = q - p;
        periodSpans[p] = pCount;
        showPeriod[p] = true;

        for (let k = p + 1; k < q; k++) {
          showPeriod[k] = false;
          periodSpans[k] = 0;
        }

        let tf = p;
        while (tf < q) {
          let tNext = tf + 1;
          const curFrom = (examSchedule[tf].fromTime || "").trim();
          const curTo = (examSchedule[tf].toTime || "").trim();

          while (
            tNext < q &&
            (examSchedule[tNext].fromTime || "").trim() === curFrom &&
            (examSchedule[tNext].toTime || "").trim() === curTo
          ) {
            tNext++;
          }

          const tCount = tNext - tf;
          fromTimeSpans[tf] = tCount;
          toTimeSpans[tf] = tCount;
          showFromTime[tf] = true;
          showToTime[tf] = true;

          for (let k = tf + 1; k < tNext; k++) {
            showFromTime[k] = false;
            showToTime[k] = false;
            fromTimeSpans[k] = 0;
            toTimeSpans[k] = 0;
          }

          tf = tNext;
        }

        p = q;
      }

      i = j;
    }

    return {
      daySpans,
      dateSpans,
      periodSpans,
      fromTimeSpans,
      toTimeSpans,
      showDay,
      showDate,
      showPeriod,
      showFromTime,
      showToTime,
    };
  }, [examSchedule]);

  const availableSubjectsForSchedule = React.useMemo(() => {
    const isHomeschoolResolved = Boolean(
      (title && (title.includes('منازل') || title.toLowerCase().includes('homeschool'))) ||
      (typeof window !== 'undefined' && localStorage.getItem('current_system_type') === 'homeschool')
    );
    try {
      const { customCols: subjCols, defaultSubjectsOverrides: subjOvr } = getSubjectsConfigForStageGrade(
        stage,
        selectedGrade,
        isHomeschoolResolved
      );
      if (Array.isArray(subjCols) && subjCols.length > 0) {
        const list = subjCols.map((sc: any) => subjOvr?.[sc.key]?.label || sc.label).filter(Boolean);
        const unique = Array.from(new Set(list));
        if (unique.length > 0) return unique;
      }
    } catch (err) {
      console.error('Error fetching subjects config:', err);
    }
    return [
      'اللغة العربية',
      'اللغة الإنجليزية',
      'الرياضيات',
      'العلوم',
      'الدراسات الاجتماعية',
      'التربية الدينية',
      'تكنولوجيا المعلومات والاتصالات',
      'التربية الفنية'
    ];
  }, [stage, selectedGrade, title]);

  const [schedDay, setSchedDay] = useState<string>('السبت');
  const [schedDate, setSchedDate] = useState<string>('');
  const [schedPeriod, setSchedPeriod] = useState<string>('الفترة الأولى');
  const [schedFromTime, setSchedFromTime] = useState<string>('08:00');
  const [schedToTime, setSchedToTime] = useState<string>('09:30');
  const [schedSubject, setSchedSubject] = useState<string>('');

  useEffect(() => {
    if (availableSubjectsForSchedule.length > 0 && (!schedSubject || !availableSubjectsForSchedule.includes(schedSubject))) {
      setSchedSubject(availableSubjectsForSchedule[0]);
    }
  }, [availableSubjectsForSchedule, schedSubject]);

  const handleDateChange = (val: string) => {
    setSchedDate(val);
    if (val) {
      try {
        const d = new Date(val);
        const dayIndex = d.getDay();
        const dayMap: Record<number, string> = {
          6: 'السبت',
          0: 'الأحد',
          1: 'الإثنين',
          2: 'الثلاثاء',
          3: 'الأربعاء',
          4: 'الخميس',
        };
        if (dayIndex !== 5 && dayMap[dayIndex]) {
          setSchedDay(dayMap[dayIndex]);
        }
      } catch {}
    }
  };

  const [editingScheduleItemId, setEditingScheduleItemId] = useState<string | null>(null);

  const handleStartEditScheduleItem = (item: ExamScheduleItem) => {
    setEditingScheduleItemId(item.id);
    setSchedDay(item.day || 'السبت');
    setSchedDate(item.date || '');
    setSchedPeriod(item.period || 'الفترة الأولى');
    setSchedFromTime(item.fromTime || '08:00');
    setSchedToTime(item.toTime || '09:30');
    setSchedSubject(item.subject || (availableSubjectsForSchedule[0] || 'اللغة العربية'));
  };

  const handleCancelEditSchedule = () => {
    setEditingScheduleItemId(null);
  };

  const handleAddScheduleItem = () => {
    const subToAdd = schedSubject || (availableSubjectsForSchedule[0] || 'اللغة العربية');
    if (editingScheduleItemId) {
      const updated = examSchedule.map(item => {
        if (item.id === editingScheduleItemId) {
          return {
            ...item,
            day: schedDay,
            date: schedDate,
            period: schedPeriod,
            fromTime: schedFromTime,
            toTime: schedToTime,
            subject: subToAdd,
          };
        }
        return item;
      });
      const sorted = sortExamScheduleItems(updated);
      setExamSchedule(sorted);
      setEditingScheduleItemId(null);
      try {
        localStorage.setItem(examScheduleStorageKey, JSON.stringify(sorted));
      } catch (e) {
        console.error(e);
      }
      return;
    }

    const newItem: ExamScheduleItem = {
      id: Math.random().toString(36).substring(2, 10),
      day: schedDay,
      date: schedDate,
      period: schedPeriod,
      fromTime: schedFromTime,
      toTime: schedToTime,
      subject: subToAdd,
    };
    const updated = [...examSchedule, newItem];
    const sorted = sortExamScheduleItems(updated);
    setExamSchedule(sorted);
    try {
      localStorage.setItem(examScheduleStorageKey, JSON.stringify(sorted));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteScheduleItem = (id: string) => {
    if (editingScheduleItemId === id) {
      setEditingScheduleItemId(null);
    }
    const updated = examSchedule.filter(item => item.id !== id);
    setExamSchedule(updated);
    try {
      localStorage.setItem(examScheduleStorageKey, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearSchedule = () => {
    setExamSchedule([]);
    try {
      localStorage.removeItem(examScheduleStorageKey);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrintExamSchedule = async () => {
    try {
      await exportExamScheduleToPdf({
        stage,
        selectedGrade,
        semester,
        administration,
        schoolName,
        dataOfficer,
        controlHead,
        committeeHead,
        numberLang,
        examSchedule,
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };
  const [editingRowTheme, setEditingRowTheme] = useState<RowBgTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = (localStorage.getItem('students_data_row_theme') || localStorage.getItem('editing_table_row_theme')) as RowBgTheme | null;
      if (saved) return saved;
    }
    return 'attachment_1';
  });

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.storageKey === 'students_data_row_theme' && e.detail?.theme) {
        setEditingRowTheme(e.detail.theme);
      }
    };
    window.addEventListener('row_theme_updated', handler);
    return () => window.removeEventListener('row_theme_updated', handler);
  }, []);
  
  const [isSeatNumModalOpen, setIsSeatNumModalOpen] = useState(false);
  const [isSecretNumModalOpen, setIsSecretNumModalOpen] = useState(false);
  const committeeStorageKey = `${stage || 'default'}_${selectedGrade || 'default'}${systemType && systemType !== 'regular' ? `_${systemType}` : ''}`;
  const legacyCommitteeStorageKey = `${stage || 'default'}_${selectedGrade || 'default'}`;
  const numberingStorageKey = `${committeeStorageKey}_${semester || 'first'}`;

  const readCommitteeSettingsForKey = (key: string, legacyKey: string) => {
    const defaults = {
      firstSize: 20 as number | '',
      firstMerge: false,
      secondSize: 20 as number | '',
      secondMerge: false,
    };
    try {
      const byGradeRaw = localStorage.getItem('sheet_control_committee_settings_by_grade');
      if (!byGradeRaw) return defaults;
      const parsed = JSON.parse(byGradeRaw);
      const entryFirst = parsed?.[`${key}_first`] ?? parsed?.[key];
      const entrySecond = parsed?.[`${key}_second`] ?? parsed?.[key];
      return {
        firstSize: Number(entryFirst?.committeeSize) >= 1 ? Number(entryFirst.committeeSize) : 20,
        firstMerge: typeof entryFirst?.mergeLastCommittee === 'boolean' ? entryFirst.mergeLastCommittee : false,
        secondSize: Number(entrySecond?.committeeSize) >= 1 ? Number(entrySecond.committeeSize) : 20,
        secondMerge: typeof entrySecond?.mergeLastCommittee === 'boolean' ? entrySecond.mergeLastCommittee : false,
      };
    } catch {
      return defaults;
    }
  };

  const [seatNumStart, setSeatNumStart] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('sheet_control_numbering_settings_by_grade');
      if (raw) {
        const parsed = JSON.parse(raw);
        const savedVal = Number(parsed?.[numberingStorageKey]?.seatNumStart ?? parsed?.[committeeStorageKey]?.seatNumStart);
        if (!isNaN(savedVal) && savedVal >= 1) return savedVal;
      }
    } catch {}
    return 1;
  });

  const [secretNumStart, setSecretNumStart] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('sheet_control_numbering_settings_by_grade');
      if (raw) {
        const parsed = JSON.parse(raw);
        const savedVal = Number(parsed?.[numberingStorageKey]?.secretNumStart ?? parsed?.[committeeStorageKey]?.secretNumStart);
        if (!isNaN(savedVal) && savedVal >= 1) return savedVal;
      }
    } catch {}
    return 1;
  });

  const [isCommitteeSizeModalOpen, setIsCommitteeSizeModalOpen] = useState(false);
  const [isExportExcelModalOpen, setIsExportExcelModalOpen] = useState(false);
  const [committeeModalSemester, setCommitteeModalSemester] = useState<'first' | 'second'>(semester === 'second' ? 'second' : 'first');

  const initialCommitteeSettings = readCommitteeSettingsForKey(committeeStorageKey, legacyCommitteeStorageKey);
  const [committeeSizeFirst, setCommitteeSizeFirst] = useState<number | ''>(initialCommitteeSettings.firstSize);
  const [mergeLastCommitteeFirst, setMergeLastCommitteeFirst] = useState<boolean>(initialCommitteeSettings.firstMerge);
  const [committeeSizeSecond, setCommitteeSizeSecond] = useState<number | ''>(initialCommitteeSettings.secondSize);
  const [mergeLastCommitteeSecond, setMergeLastCommitteeSecond] = useState<boolean>(initialCommitteeSettings.secondMerge);
  const loadedCommitteeKeyRef = React.useRef<string>(committeeStorageKey);

  useEffect(() => {
    const loaded = readCommitteeSettingsForKey(committeeStorageKey, legacyCommitteeStorageKey);
    loadedCommitteeKeyRef.current = '';
    setCommitteeSizeFirst(loaded.firstSize);
    setMergeLastCommitteeFirst(loaded.firstMerge);
    setCommitteeSizeSecond(loaded.secondSize);
    setMergeLastCommitteeSecond(loaded.secondMerge);
    loadedCommitteeKeyRef.current = committeeStorageKey;
  }, [committeeStorageKey, legacyCommitteeStorageKey]);

  useEffect(() => {
    if (loadedCommitteeKeyRef.current !== committeeStorageKey) return;
    try {
      const byGradeRaw = localStorage.getItem('sheet_control_committee_settings_by_grade');
      const parsed = byGradeRaw ? JSON.parse(byGradeRaw) : {};
      const validSizeFirst = typeof committeeSizeFirst === 'number' && committeeSizeFirst >= 1 ? committeeSizeFirst : 20;
      const validSizeSecond = typeof committeeSizeSecond === 'number' && committeeSizeSecond >= 1 ? committeeSizeSecond : 20;

      parsed[`${committeeStorageKey}_first`] = {
        committeeSize: validSizeFirst,
        mergeLastCommittee: mergeLastCommitteeFirst,
      };
      parsed[`${committeeStorageKey}_second`] = {
        committeeSize: validSizeSecond,
        mergeLastCommittee: mergeLastCommitteeSecond,
      };

      const currentValidSize = semester === 'second' ? validSizeSecond : validSizeFirst;
      const currentMerge = semester === 'second' ? mergeLastCommitteeSecond : mergeLastCommitteeFirst;
      parsed[committeeStorageKey] = {
        committeeSize: currentValidSize,
        mergeLastCommittee: currentMerge,
      };

      localStorage.setItem('sheet_control_committee_settings_by_grade', JSON.stringify(parsed));
    } catch {}
  }, [
    committeeSizeFirst,
    mergeLastCommitteeFirst,
    committeeSizeSecond,
    mergeLastCommitteeSecond,
    committeeStorageKey,
    semester,
  ]);
  const [isStatsMenuOpen, setIsStatsMenuOpen] = useState(false);
  const [isDetailedStatsMenuOpen, setIsDetailedStatsMenuOpen] = useState(false);
  const [isExemptionStatsMenuOpen, setIsExemptionStatsMenuOpen] = useState(false);
  const [isEnrollmentTypeStatsMenuOpen, setIsEnrollmentTypeStatsMenuOpen] = useState(false);
  const [isDamgStatsMenuOpen, setIsDamgStatsMenuOpen] = useState(false);
  const [isAdvancedStatsModalOpen, setIsAdvancedStatsModalOpen] = useState(false);
  const [showSeatNumbersPasswordModal, setShowSeatNumbersPasswordModal] = useState(false);
  const [secretNumSkipMultiple, setSecretNumSkipMultiple] = useState<number | ''>(() => {
    try {
      const raw = localStorage.getItem('sheet_control_numbering_settings_by_grade');
      if (raw) {
        const parsed = JSON.parse(raw);
        const entry = parsed?.[numberingStorageKey] ?? parsed?.[committeeStorageKey];
        if (entry && entry.secretNumSkipMultiple !== undefined) {
          return entry.secretNumSkipMultiple === '' ? '' : Number(entry.secretNumSkipMultiple);
        }
      }
    } catch {}
    return 5;
  });
  const [secretNumSkipMultiple2, setSecretNumSkipMultiple2] = useState<number | ''>(() => {
    try {
      const raw = localStorage.getItem('sheet_control_numbering_settings_by_grade');
      if (raw) {
        const parsed = JSON.parse(raw);
        const entry = parsed?.[numberingStorageKey] ?? parsed?.[committeeStorageKey];
        if (entry && entry.secretNumSkipMultiple2 !== undefined) {
          return entry.secretNumSkipMultiple2 === '' ? '' : Number(entry.secretNumSkipMultiple2);
        }
      }
    } catch {}
    return '';
  });
  const [enableSkipMultiple1, setEnableSkipMultiple1] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('sheet_control_numbering_settings_by_grade');
      if (raw) {
        const parsed = JSON.parse(raw);
        const entry = parsed?.[numberingStorageKey] ?? parsed?.[committeeStorageKey];
        if (entry && entry.secretNumSkipMultiple !== undefined) {
          return entry.secretNumSkipMultiple !== '' && Number(entry.secretNumSkipMultiple) > 0;
        }
      }
    } catch {}
    return true;
  });
  const [enableSkipMultiple2, setEnableSkipMultiple2] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('sheet_control_numbering_settings_by_grade');
      if (raw) {
        const parsed = JSON.parse(raw);
        const entry = parsed?.[numberingStorageKey] ?? parsed?.[committeeStorageKey];
        if (entry && entry.secretNumSkipMultiple2 !== undefined) {
          return entry.secretNumSkipMultiple2 !== '' && Number(entry.secretNumSkipMultiple2) > 0;
        }
      }
    } catch {}
    return false;
  });
  const [lastValidSkip1, setLastValidSkip1] = useState<number>(5);
  const [lastValidSkip2, setLastValidSkip2] = useState<number>(9);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sheet_control_numbering_settings_by_grade');
      if (raw) {
        const parsed = JSON.parse(raw);
        const entry = parsed?.[numberingStorageKey] ?? parsed?.[committeeStorageKey];
        if (entry) {
          if (Number(entry.seatNumStart) >= 1) setSeatNumStart(Number(entry.seatNumStart));
          if (Number(entry.secretNumStart) >= 1) setSecretNumStart(Number(entry.secretNumStart));
          if (entry.secretNumSkipMultiple !== undefined) {
            const has1 = entry.secretNumSkipMultiple !== '' && Number(entry.secretNumSkipMultiple) > 0;
            setEnableSkipMultiple1(has1);
            setSecretNumSkipMultiple(has1 ? Number(entry.secretNumSkipMultiple) : '');
            if (has1) setLastValidSkip1(Number(entry.secretNumSkipMultiple));
          }
          if (entry.secretNumSkipMultiple2 !== undefined) {
            const has2 = entry.secretNumSkipMultiple2 !== '' && Number(entry.secretNumSkipMultiple2) > 0;
            setEnableSkipMultiple2(has2);
            setSecretNumSkipMultiple2(has2 ? Number(entry.secretNumSkipMultiple2) : '');
            if (has2) setLastValidSkip2(Number(entry.secretNumSkipMultiple2));
          }
        }
      }
    } catch {}
  }, [numberingStorageKey, committeeStorageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sheet_control_numbering_settings_by_grade');
      const parsed = raw ? JSON.parse(raw) : {};
      const currentEntry = parsed[numberingStorageKey] || {};
      parsed[numberingStorageKey] = {
        ...currentEntry,
        seatNumStart: seatNumStart >= 1 ? seatNumStart : 1,
        secretNumStart: secretNumStart >= 1 ? secretNumStart : 1,
        secretNumSkipMultiple: enableSkipMultiple1 ? secretNumSkipMultiple : '',
        secretNumSkipMultiple2: enableSkipMultiple2 ? secretNumSkipMultiple2 : '',
      };
      localStorage.setItem('sheet_control_numbering_settings_by_grade', JSON.stringify(parsed));
    } catch {}
  }, [seatNumStart, secretNumStart, secretNumSkipMultiple, secretNumSkipMultiple2, enableSkipMultiple1, enableSkipMultiple2, numberingStorageKey]);
  
  const [internalSortBy, setInternalSortBy] = useState<{id: string, direction: 'asc' | 'desc'}[]>([]);
  const sortBy = externalSortBy !== undefined ? externalSortBy : internalSortBy;
  const setSortBy = (valOrFn: any) => {
    const nextVal = typeof valOrFn === 'function' ? valOrFn(sortBy) : valOrFn;
    if (onSortChange) {
      onSortChange(nextVal);
    } else {
      setInternalSortBy(nextVal);
    }
  };
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const [isSeatNumbersModalOpen, setIsSeatNumbersModalOpen] = useState(false);
  const [isSeatNumbersEnglish, setIsSeatNumbersEnglish] = useState(false);
  const [isSubjectPrintMenuOpen, setIsSubjectPrintMenuOpen] = useState(false);
  const [selectedPrintSubject, setSelectedPrintSubject] = useState<{ key: string; label: string } | null>(null);
  const [isMercyPrintModalOpen, setIsMercyPrintModalOpen] = useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const downloadToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const executePrintOption = async (
    reportType: PdfReportType,
    subjectInfo?: { key: string; label: string },
    customControlSheetOptions?: CustomControlSheetOptions
  ) => {
    const isHomeschool = Boolean(
      systemType === 'homeschool' ||
      (title && (title.includes('منازل') || title.toLowerCase().includes('homeschool'))) ||
      (typeof window !== 'undefined' && localStorage.getItem('current_system_type') === 'homeschool')
    );
    await exportStudentsDataToPdf({
      title,
      reportType,
      numberLang,
      systemType,
      isHomeschool,
      customControlSheetOptions,
      subjectKey: subjectInfo?.key,
      subjectLabel: subjectInfo?.label,
      screenSubtitle: 'تحرير البيانات',
      administration,
      schoolName,
      educationType,
      dataOfficer,
      controlHead,
      committeeHead,
      stage,
      selectedGrade,
      sortBy,
      students: filteredData,
      isFirstGrade,
      showExamFields,
      semester,
      examSchedule,
      normalizeStatusForGrade,
      labels: {
        serial: t.serial,
        studentName: isKindergarten ? 'اسم التلميذ' : t.studentName,
        nationalId: t.nationalId,
        gender: t.gender,
        enrollmentStatus: isKindergarten ? 'حالة التلميذ' : t.enrollmentStatus,
        exemptionStatus: (t as any).exemptionStatus || 'حالة الإعفاء',
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

  const [isCustomControlSheetModalOpen, setIsCustomControlSheetModalOpen] = useState(false);
  const isOfficial = !isTrialMode;
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
  const [isTopTenCertModalOpen, setIsTopTenCertModalOpen] = useState(false);
  const [isAllStudentsCertModalOpen, setIsAllStudentsCertModalOpen] = useState(false);
  const [isCertSelectionModalOpen, setIsCertSelectionModalOpen] = useState(false);
  const [isTopTenCertDamg, setIsTopTenCertDamg] = useState(false);
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

  const [showSeatNumbersScheduleEnPasswordModal, setShowSeatNumbersScheduleEnPasswordModal] = useState(false);
  const [seatNumbersScheduleEnRandomId, setSeatNumbersScheduleEnRandomId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sheet_control_seat_numbers_schedule_en_random_id');
      const parsed = saved ? parseInt(saved, 10) : 0;
      if (parsed >= 800 && parsed <= 899) return parsed;
      const newId = Math.floor(Math.random() * 100) + 800;
      localStorage.setItem('sheet_control_seat_numbers_schedule_en_random_id', String(newId));
      return newId;
    } catch {
      return 850;
    }
  });

  const isSeatNumbersScheduleEnUnlocked = () => {
    try {
      const currentMainId = getDeviceId();
      const unlockedId = localStorage.getItem('sheet_control_seat_numbers_schedule_en_unlocked_for_id');
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
      if (reportType === 'seat_numbers_with_schedule') {
        await executePrintOption('seat_numbers_with_schedule');
        return;
      }
      if (reportType === 'seat_numbers_with_schedule_english') {
        if (isOfficial && !isSeatNumbersScheduleEnUnlocked()) {
          setShowSeatNumbersScheduleEnPasswordModal(true);
          return;
        }
        await executePrintOption('seat_numbers_with_schedule_english');
        return;
      }
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

  const prevSortByRef = React.useRef(sortBy);
  React.useEffect(() => {
    if (JSON.stringify(prevSortByRef.current) !== JSON.stringify(sortBy)) {
      prevSortByRef.current = sortBy;
      frozenIdsRef.current = [];
    }
  }, [sortBy]);

  useEffect(() => {
    if (skipAutoSyncSnapshotRef.current === data) return;
    let hasChanges = false;
    const updated = data.map(s => {
      const normalized = normalizeStatusForGrade(s.enrollmentStatus, isFirstGrade, s.gender);
      let newEnrollmentType = s.enrollmentType;
      if (!newEnrollmentType) {
        if (s.enrollmentStatus?.includes('وافد')) {
          newEnrollmentType = 'وافدين';
        } else if (s.enrollmentStatus?.includes('عائد')) {
          newEnrollmentType = 'عائدين من الخارج';
        }
      }
      let newReligion = s.religion;
      if (s.religion) {
        const rTrim = s.religion.trim().toLowerCase();
        if (rTrim.includes('ل') || rTrim.includes('مسلم') || rTrim === 'muslim') {
          newReligion = 'muslim';
        } else if (rTrim.includes('ح') || rTrim.includes('مسيح') || rTrim === 'christian') {
          newReligion = 'christian';
        }
      }
      if (normalized !== s.enrollmentStatus || newEnrollmentType !== s.enrollmentType || newReligion !== s.religion) {
        hasChanges = true;
        return { ...s, enrollmentStatus: normalized, enrollmentType: newEnrollmentType, religion: newReligion };
      }
      return s;
    });
    if (hasChanges) {
      applySilentChange(updated);
    }
  }, [isFirstGrade, data, applySilentChange, t]);

  const handleRemoveRow = (id: string) => {
    const remaining = data.filter(s => s.id !== id);
    const { data: withCommittees } = applyCommitteeAssignments(remaining);
    onChange(withCommittees, true);
  };

  const convertStatus = (currentStatus: string, gender: string) => {
    if (!currentStatus) return currentStatus;
    const statusPairs = [
      [(t as any).status_1_M, (t as any).status_1_F],
      [(t as any).status_1_transferred_M, (t as any).status_1_transferred_F],
      [(t as any).status_2_M, (t as any).status_2_F],
      [(t as any).status_3_M, (t as any).status_3_F],
      [(t as any).status_3_transferred_M, (t as any).status_3_transferred_F],
      [(t as any).status_4_M, (t as any).status_4_F],
      ['مستجد', 'مستجدة'],
      ['منقول', 'منقولة'],
      ['باق', 'باقية'],
      ['مستجد - دمج', 'مستجدة - دمج'],
      ['منقول - دمج', 'منقولة - دمج'],
      ['باق - دمج', 'باقية - دمج'],
    ];

    for (const [maleVal, femaleVal] of statusPairs) {
      if (!maleVal || !femaleVal) continue;
      if (gender === 'female') {
        if (currentStatus === maleVal) return femaleVal;
      } else {
        if (currentStatus === femaleVal) return maleVal;
      }
    }
    return currentStatus;
  };

  const convertReligion = (currentReligion: string, gender: string) => {
    if (!currentReligion) return currentReligion;
    if (gender === 'female') {
      if (currentReligion === t.muslim) return (t as any).muslimFemale;
      if (currentReligion === t.christian) return (t as any).christianFemale;
    } else {
      if (currentReligion === (t as any).muslimFemale) return t.muslim;
      if (currentReligion === (t as any).christianFemale) return t.christian;
    }
    return currentReligion;
  };

  const handleChange = (id: string, field: keyof StudentData, value: string) => {
    const isDiscreteField =
      field === 'gender' ||
      field === 'studentStatus' ||
      field === 'enrollmentStatus' ||
      field === 'exemptionStatus' ||
      field === 'enrollmentType' ||
      field === 'religion' ||
      field === ('studentClass' as any) ||
      (field === 'nationalId' && value.length === 14);
    onChange(data.map(s => {
      if (s.id === id) {
        let valToSet = value;
        if (field === 'enrollmentStatus') {
          valToSet = normalizeStatusForGrade(value, isFirstGrade, s.gender);
        } else if (field === 'exemptionStatus') {
          const v = value.trim();
          if (v === 'كلي' || v === 'كلى') valToSet = 'كلى';
          else if (v === 'تدريجي' || v === 'تدريجى') valToSet = 'تدريجى';
          else valToSet = v;
        } else if (field === 'studentStatus') {
          valToSet = value === 'دمج' ? 'دمج' : 'عادى';
        } else if (field === 'religion') {
          const v = value.trim().toLowerCase();
          if (v.includes('ل') || v.includes('مسلم') || v === 'muslim') valToSet = 'muslim';
          else if (v.includes('ح') || v.includes('مسيح') || v === 'christian') valToSet = 'christian';
        }
        const updatedStudent = { ...s, [field]: valToSet };
        if (field === 'studentStatus') {
          updatedStudent.enrollmentStatus = valToSet === 'دمج' ? (updatedStudent.gender === 'female' ? 'مستجدة - دمج' : 'مستجد - دمج') : (updatedStudent.gender === 'female' ? 'مستجدة' : 'مستجد');
        }
        if (field === 'nationalId' && value.length === 14) {
          const digit13 = parseInt(value.charAt(12), 10);
          const newGender = (digit13 % 2 !== 0) ? 'male' : 'female';
          updatedStudent.gender = newGender;
          updatedStudent.enrollmentStatus = convertStatus(updatedStudent.enrollmentStatus, newGender);
          updatedStudent.religion = convertReligion(updatedStudent.religion, newGender);
        } else if (field === 'gender') {
          updatedStudent.enrollmentStatus = convertStatus(updatedStudent.enrollmentStatus, value);
          updatedStudent.religion = convertReligion(updatedStudent.religion, value);
        }
        return updatedStudent;
      }
      return s;
    }), isDiscreteField);
  };

  const handleSemesterFieldChange = (id: string, field: 'seatNumbers' | 'secretNumbers' | 'committeeNumbers', value: string) => {
    if (field === 'seatNumbers' || field === 'secretNumbers') {
      userEditedExamNumbersRef.current = true;
    }
    onChange(data.map(s => {
      if (s.id === id) {
        return {
          ...s,
          ...(field === 'committeeNumbers' ? { committeeNumber: value } : {}),
          [field]: {
            ...s[field],
            [semester]: value
          }
        };
      }
      return s;
    }));
  };

  const sortStudentsList = (list: StudentData[], targetSem: string = semester) => {
    return [...list].sort((a, b) => {
      for (const criteria of sortBy) {
        const modifier = criteria.direction === 'desc' ? -1 : 1;
        if (criteria.id === 'alphabetical' || criteria.id === 'name') {
          const cmp = a.name.localeCompare(b.name, lang === 'ar' ? 'ar' : 'en');
          if (cmp !== 0) return cmp * modifier;
        }
        if (criteria.id === 'gender') {
          const cmp = (a.gender || '').localeCompare(b.gender || '', lang === 'ar' ? 'ar' : 'en');
          if (cmp !== 0) return cmp * modifier;
        }
        if (criteria.id === 'status') {
          const cmp = (a.enrollmentStatus || '').localeCompare(b.enrollmentStatus || '', lang === 'ar' ? 'ar' : 'en');
          if (cmp !== 0) return cmp * modifier;
        }
        if (criteria.id === 'exemptionStatus') {
          const cmp = (a.exemptionStatus || '').localeCompare(b.exemptionStatus || '', lang === 'ar' ? 'ar' : 'en');
          if (cmp !== 0) return cmp * modifier;
        }
        if (criteria.id === 'studentStatus') {
          const valA = a.studentStatus === 'دمج' ? 'دمج' : 'عادى';
          const valB = b.studentStatus === 'دمج' ? 'دمج' : 'عادى';
          const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en');
          if (cmp !== 0) return cmp * modifier;
        }
        if (criteria.id === 'enrollmentType') {
          const cmp = (a.enrollmentType || '').localeCompare(b.enrollmentType || '', lang === 'ar' ? 'ar' : 'en');
          if (cmp !== 0) return cmp * modifier;
        }
        if (criteria.id === 'religion') {
          const cmp = (a.religion || '').localeCompare(b.religion || '', lang === 'ar' ? 'ar' : 'en');
          if (cmp !== 0) return cmp * modifier;
        }
        if (criteria.id === 'seatNumber') {
          const valA = a.seatNumbers?.[targetSem] || (targetSem === 'first' ? a.seatNumber : '') || '';
          const valB = b.seatNumbers?.[targetSem] || (targetSem === 'first' ? b.seatNumber : '') || '';
          const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en', { numeric: true });
          if (cmp !== 0) return cmp * modifier;
        }
        if (criteria.id === 'secretNumber') {
          const valA = a.secretNumbers?.[targetSem] || (targetSem === 'first' ? a.secretNumber : '') || '';
          const valB = b.secretNumbers?.[targetSem] || (targetSem === 'first' ? b.secretNumber : '') || '';
          const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en', { numeric: true });
          if (cmp !== 0) return cmp * modifier;
        }
        if (criteria.id === 'studentClass' || criteria.id === 'class') {
          const valA = (a.studentClass || '').toString();
          const valB = (b.studentClass || '').toString();
          const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en', { numeric: true });
          if (cmp !== 0) return cmp * modifier;
        }
      }
      return 0;
    });
  };

  const assignAutoSeatAndSecretNumbers = (studentsList: StudentData[], isAddingStudents: boolean = false): StudentData[] => {
    if (!showExamFields || studentsList.length === 0) return studentsList;

    const targetSemesters = semester === 'retake'
      ? ['retake']
      : Array.from(new Set([semester, 'first', 'second']));

    let updated = studentsList.map(s => ({
      ...s,
      seatNumbers: { ...(s.seatNumbers || {}) },
      secretNumbers: { ...(s.secretNumbers || {}) },
    }));

    let savedSettingsByKey: Record<string, any> = {};
    try {
      const raw = localStorage.getItem('sheet_control_numbering_settings_by_grade');
      if (raw) savedSettingsByKey = JSON.parse(raw);
    } catch {}

    const hasActiveNonNumberSort = sortBy.some(c => c.id !== 'seatNumber' && c.id !== 'secretNumber');

    for (const sem of targetSemesters) {
      const semKey = `${committeeStorageKey}_${sem}`;
      const semSaved = savedSettingsByKey[semKey] || savedSettingsByKey[committeeStorageKey] || {};

      const semSeatStart = sem === semester
        ? (seatNumStart >= 1 ? seatNumStart : 1)
        : (Number(semSaved.seatNumStart) >= 1 ? Number(semSaved.seatNumStart) : (seatNumStart >= 1 ? seatNumStart : 1));

      const semSecretStart = sem === semester
        ? (secretNumStart >= 1 ? secretNumStart : 1)
        : (Number(semSaved.secretNumStart) >= 1 ? Number(semSaved.secretNumStart) : (secretNumStart >= 1 ? secretNumStart : 1));

      const rawSkip1 = sem === semester
        ? (enableSkipMultiple1 ? secretNumSkipMultiple : '')
        : (semSaved.secretNumSkipMultiple !== undefined ? semSaved.secretNumSkipMultiple : (enableSkipMultiple1 ? secretNumSkipMultiple : ''));
      const rawSkip2 = sem === semester
        ? (enableSkipMultiple2 ? secretNumSkipMultiple2 : '')
        : (semSaved.secretNumSkipMultiple2 !== undefined ? semSaved.secretNumSkipMultiple2 : (enableSkipMultiple2 ? secretNumSkipMultiple2 : ''));

      const skip1 = typeof rawSkip1 === 'number' && rawSkip1 > 0 ? rawSkip1 : (Number(rawSkip1) > 0 ? Number(rawSkip1) : null);
      const skip2 = typeof rawSkip2 === 'number' && rawSkip2 > 0 ? rawSkip2 : (Number(rawSkip2) > 0 ? Number(rawSkip2) : null);

      const getNextValidSecret = (candidate: number): number => {
        let num = candidate;
        if (skip1 || skip2) {
          while ((skip1 && num % skip1 === 0) || (skip2 && num % skip2 === 0)) {
            num++;
          }
        }
        return num;
      };

      const ordered = sortStudentsList(updated, sem);
      const seatMap = new Map<string, string>();
      const secretMap = new Map<string, string>();

      if (isAddingStudents && hasActiveNonNumberSort) {
        const existingSeats = ordered
          .map(s => parseInt((s.seatNumbers?.[sem] || (sem === 'first' ? s.seatNumber : '') || '').trim(), 10))
          .filter(n => !isNaN(n) && n >= 1);
        const existingSecrets = ordered
          .map(s => parseInt((s.secretNumbers?.[sem] || (sem === 'first' ? s.secretNumber : '') || '').trim(), 10))
          .filter(n => !isNaN(n) && n >= 1);

        let currentSeat = (!semSaved.userSetSeat && semSeatStart === 1 && existingSeats.length > 0)
          ? Math.min(...existingSeats)
          : semSeatStart;

        let currentSecret = (!semSaved.userSetSecret && semSecretStart === 1 && existingSecrets.length > 0)
          ? Math.min(...existingSecrets)
          : semSecretStart;

        ordered.forEach(student => {
          seatMap.set(student.id, String(currentSeat++));
          currentSecret = getNextValidSecret(currentSecret);
          secretMap.set(student.id, String(currentSecret++));
        });
      } else {
        let currentSeat = semSeatStart;
        let currentSecret = semSecretStart;

        ordered.forEach(student => {
          const existingSeat = (student.seatNumbers?.[sem] || (sem === 'first' ? student.seatNumber : '') || '').trim();
          if (existingSeat) {
            seatMap.set(student.id, existingSeat);
            const parsedSeat = parseInt(existingSeat, 10);
            if (!isNaN(parsedSeat) && parsedSeat >= currentSeat) {
              currentSeat = parsedSeat + 1;
            }
          } else {
            seatMap.set(student.id, String(currentSeat++));
          }

          const existingSecret = (student.secretNumbers?.[sem] || (sem === 'first' ? student.secretNumber : '') || '').trim();
          if (existingSecret) {
            secretMap.set(student.id, existingSecret);
            const parsedSecret = parseInt(existingSecret, 10);
            if (!isNaN(parsedSecret) && parsedSecret >= currentSecret) {
              currentSecret = parsedSecret + 1;
            }
          } else {
            currentSecret = getNextValidSecret(currentSecret);
            secretMap.set(student.id, String(currentSecret++));
          }
        });
      }

      updated = updated.map(s => {
        const newSeat = seatMap.get(s.id) || '';
        const newSecret = secretMap.get(s.id) || '';
        return {
          ...s,
          ...(sem === 'first' ? { seatNumber: newSeat, secretNumber: newSecret } : {}),
          seatNumbers: {
            ...s.seatNumbers,
            [sem]: newSeat,
          },
          secretNumbers: {
            ...s.secretNumbers,
            [sem]: newSecret,
          },
        };
      });
    }

    return updated;
  };

  const gradeNumForClass = React.useMemo(() => {
    if (selectedGrade?.includes('الأول') || selectedGrade?.includes('1')) return '1';
    if (selectedGrade?.includes('الثاني') || selectedGrade?.includes('الثانى') || selectedGrade?.includes('2')) return '2';
    if (selectedGrade?.includes('الثالث') || selectedGrade?.includes('3')) return '3';
    if (selectedGrade?.includes('الرابع') || selectedGrade?.includes('4')) return '4';
    if (selectedGrade?.includes('الخامس') || selectedGrade?.includes('5')) return '5';
    if (selectedGrade?.includes('السادس') || selectedGrade?.includes('6')) return '6';
    return '1';
  }, [selectedGrade]);

  const [selectedClass, setSelectedClass] = useState<string>(() => `${gradeNumForClass} / 1`);
  const [selectedClassForNid, setSelectedClassForNid] = useState<string>(() => `${gradeNumForClass} / 1`);
  const [addClassMode, setAddClassMode] = useState<'select' | 'custom'>('select');
  const [customClassNameInput, setCustomClassNameInput] = useState<string>('');
  const [customClassError, setCustomClassError] = useState<string | null>(null);
  const [isAddClassDropdownOpen, setIsAddClassDropdownOpen] = useState(false);
  const addClassDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAddClassDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (addClassDropdownRef.current && !addClassDropdownRef.current.contains(e.target as Node)) {
        setIsAddClassDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isAddClassDropdownOpen]);

  const openEditClassModal = (className: string) => {
    setIsAddClassDropdownOpen(false);
    setEditClassModalState({
      originalName: className,
      newName: className,
      error: null,
      confirmDelete: false,
    });
  };

  const handleSaveEditedClassName = () => {
    if (!editClassModalState) return;
    const { originalName, newName } = editClassModalState;
    const cleanedNew = cleanClassName(newName);
    if (!cleanedNew) {
      setEditClassModalState((prev) =>
        prev ? { ...prev, error: 'يرجى كتابة اسم الفصل.' } : null
      );
      return;
    }
    if (cleanedNew.length >= 15) {
      setEditClassModalState((prev) =>
        prev ? { ...prev, error: 'يجب أن يكون عدد حروف اسم الفصل أقل من 15 حرفاً.' } : null
      );
      return;
    }
    const origNorm = normalizeClassNameForCompare(originalName);
    const otherClasses = availableClasses.filter(
      (cls) => normalizeClassNameForCompare(cls) !== origNorm
    );
    const conflict = findMatchingExistingClass(cleanedNew, otherClasses);
    if (conflict) {
      setEditClassModalState((prev) =>
        prev
          ? {
              ...prev,
              error: `اسم الفصل «${conflict}» موجود بالفعل في القائمة! يُرجى كتابة اسم آخر.`,
            }
          : null
      );
      return;
    }

    const updatedSaved = renameCustomClass(originalName, cleanedNew, stage, selectedGrade);
    setSavedCustomClasses(updatedSaved);

    const hasAffectedStudents = data.some(
      (s) => normalizeClassNameForCompare(s.studentClass || '') === origNorm
    );
    if (hasAffectedStudents) {
      const updatedStudents = data.map((s) =>
        normalizeClassNameForCompare(s.studentClass || '') === origNorm
          ? { ...s, studentClass: cleanedNew }
          : s
      );
      onChange(updatedStudents, true);
    }

    if (normalizeClassNameForCompare(selectedClass) === origNorm) {
      setSelectedClass(cleanedNew);
    }
    if (normalizeClassNameForCompare(selectedClassForNid) === origNorm) {
      setSelectedClassForNid(cleanedNew);
    }
    if (filters.studentClass && normalizeClassNameForCompare(filters.studentClass) === origNorm) {
      setFilters((prev) => ({ ...prev, studentClass: cleanedNew }));
    }

    setEditClassModalState(null);
  };

  const handleConfirmDeleteClass = () => {
    if (!editClassModalState) return;
    const { originalName } = editClassModalState;
    const targetNorm = normalizeClassNameForCompare(originalName);

    const updatedSaved = deleteCustomClass(originalName, stage, selectedGrade);
    setSavedCustomClasses(updatedSaved);

    const hasAffectedStudents = data.some(
      (s) => normalizeClassNameForCompare(s.studentClass || '') === targetNorm
    );
    if (hasAffectedStudents) {
      const updatedStudents = data.map((s) =>
        normalizeClassNameForCompare(s.studentClass || '') === targetNorm
          ? { ...s, studentClass: '' }
          : s
      );
      onChange(updatedStudents, true);
    }

    const fallbackClass = `${gradeNumForClass} / 1`;
    if (normalizeClassNameForCompare(selectedClass) === targetNorm) {
      setSelectedClass(fallbackClass);
    }
    if (normalizeClassNameForCompare(selectedClassForNid) === targetNorm) {
      setSelectedClassForNid(fallbackClass);
    }
    if (filters.studentClass && normalizeClassNameForCompare(filters.studentClass) === targetNorm) {
      setFilters((prev) => {
        const next = { ...prev };
        delete next.studentClass;
        return next;
      });
    }

    setEditClassModalState(null);
  };

  const matchedExistingClassForCustom = React.useMemo(() => {
    if (addClassMode !== 'custom') return null;
    const cleaned = cleanClassName(customClassNameInput);
    if (!cleaned) return null;
    return findMatchingExistingClass(cleaned, availableClasses);
  }, [addClassMode, customClassNameInput, availableClasses]);

  useEffect(() => {
    setSelectedClass(`${gradeNumForClass} / 1`);
    setSelectedClassForNid(`${gradeNumForClass} / 1`);
  }, [gradeNumForClass]);

  const handleModalAdd = () => {
    let targetClass = selectedClass;
    if (addClassMode === 'custom') {
      const cleanedCustom = cleanClassName(customClassNameInput);
      if (!cleanedCustom) {
        setCustomClassError('يرجى كتابة اسم الفصل أو اختيار فصل من القائمة أعلاه.');
        return;
      }
      if (cleanedCustom.length >= 15) {
        setCustomClassError('يجب أن يكون عدد حروف اسم الفصل أقل من 15 حرفاً.');
        return;
      }
      const existingMatch = findMatchingExistingClass(cleanedCustom, availableClasses);
      if (existingMatch) {
        setCustomClassError(`اسم الفصل «${existingMatch}» موجود بالفعل في القائمة! اختره من القائمة أعلاه لضمان عدم التكرار.`);
        return;
      }
      const updatedSaved = saveCustomClass(cleanedCustom, stage, selectedGrade);
      setSavedCustomClasses(updatedSaved);
      targetClass = cleanedCustom;
      setSelectedClass(cleanedCustom);
    }

    const lines = modalText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length > 0) {
      const newStudents: StudentData[] = lines.map(name => ({
        id: Math.random().toString(36).substring(2, 11),
        name,
        nationalId: '',
        gender: '',
        enrollmentStatus: '',
        exemptionStatus: '',
        studentStatus: isKindergarten ? 'عادى' : undefined,
        enrollmentType: '',
        religion: '',
        studentClass: targetClass,
        assessments: {
          first: {},
          second: {},
          'الفصل الدراسي الأول': {},
          'الفصل الدراسي الثاني': {},
        },
        writtenExams: {
          first: {},
          second: {},
          'الفصل الدراسي الأول': {},
          'الفصل الدراسي الثاني': {},
        },
        detailedAssessments: {
          first: {},
          second: {},
          'الفصل الدراسي الأول': {},
          'الفصل الدراسي الثاني': {},
        },
      }));
      const combined = assignAutoSeatAndSecretNumbers([...data, ...newStudents], true);
      const { data: combinedWithCommittees } = applyCommitteeAssignments(combined);
      onChange(combinedWithCommittees, true);
    }
    setModalText('');
    setCustomClassNameInput('');
    setCustomClassError(null);
    setAddClassMode('select');
    setImportFileFeedback(null);
    setIsModalOpen(false);
  };

  const handleImportStudentsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImportingFile(true);
    setImportFileFeedback(null);

    try {
      const result = await importStudentNamesFromFile(file);
      if (result.error || result.names.length === 0) {
        setImportFileFeedback({
          type: 'error',
          message: result.error || 'لم يتم العثور على أسماء صالحة داخل الملف.',
        });
        return;
      }

      const existingLines = modalText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const existingSet = new Set(existingLines);
      const merged = [...existingLines];
      let addedCount = 0;

      for (const name of result.names) {
        if (!existingSet.has(name)) {
          existingSet.add(name);
          merged.push(name);
          addedCount++;
        }
      }

      setModalText(merged.join('\n'));
      setImportFileFeedback({
        type: 'success',
        message:
          existingLines.length > 0
            ? `تم جلب ${result.names.length} اسماً من (${result.fileName}) — أُضيف ${addedCount} اسماً جديداً إلى القائمة.`
            : `تم جلب ${result.names.length} اسماً بدقة من (${result.fileName}). راجع القائمة ثم اضغط إضافة.`,
      });
    } finally {
      setIsImportingFile(false);
    }
  };

  useEffect(() => {
    if (
      !showExamFields ||
      isEditingData ||
      data.length === 0 ||
      userEditedExamNumbersRef.current ||
      skipAutoSyncSnapshotRef.current === data
    ) {
      return;
    }
    const hasMissingNumbers = data.some(s => {
      const seatVal = (s.seatNumbers?.[semester] || (semester === 'first' ? s.seatNumber : '') || '').trim();
      const secretVal = (s.secretNumbers?.[semester] || (semester === 'first' ? s.secretNumber : '') || '').trim();
      return !seatVal || !secretVal;
    });
    if (hasMissingNumbers) {
      const updated = assignAutoSeatAndSecretNumbers(data, false);
      applySilentChange(updated);
    }
  }, [data, semester, showExamFields, isEditingData, seatNumStart, secretNumStart, secretNumSkipMultiple, secretNumSkipMultiple2, enableSkipMultiple1, enableSkipMultiple2, applySilentChange]);

  const handleNationalIdModalAdd = () => {
    const lines = nationalIdModalText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g, '').substring(0, 14))
      .filter(line => line.length > 0);
    if (lines.length > 0) {
      const updatedData = [...data];
      const dataIndexById = new Map<string, number>();
      updatedData.forEach((s, idx) => {
        dataIndexById.set(s.id, idx);
      });

      const distinctClasses = Array.from(
        new Set(updatedData.map((s) => (s.studentClass || '').trim()).filter(Boolean))
      );
      const allowEmptyClassMatch = distinctClasses.length <= 1;

      const isTargetClassMatch = (s: StudentData) => {
        const cls = (s.studentClass || '').trim();
        if (cls === selectedClassForNid) return true;
        if (allowEmptyClassMatch && !cls) return true;
        return false;
      };

      const targetIndices: number[] = [];
      const seenIndices = new Set<number>();
      const pushIfUnseen = (idx: number | undefined) => {
        if (idx !== undefined && !seenIndices.has(idx)) {
          seenIndices.add(idx);
          targetIndices.push(idx);
        }
      };

      // 1. Follow exact visible table order (filteredData) so the 1st student displayed gets National ID #1
      filteredDataRef.current.forEach((s) => {
        if (isTargetClassMatch(s)) {
          pushIfUnseen(dataIndexById.get(s.id));
        }
      });

      // 2. Append any remaining students of the selected class outside current filter
      updatedData.forEach((s, idx) => {
        if (isTargetClassMatch(s)) {
          pushIfUnseen(idx);
        }
      });

      // 3. Fallback if no students matched selectedClassForNid
      if (targetIndices.length === 0) {
        filteredDataRef.current.forEach((s) => {
          pushIfUnseen(dataIndexById.get(s.id));
        });
        updatedData.forEach((_, idx) => {
          pushIfUnseen(idx);
        });
      }

      lines.forEach((nid, i) => {
        if (i < targetIndices.length) {
          const targetIdx = targetIndices[i];
          updatedData[targetIdx] = {
            ...updatedData[targetIdx],
            nationalId: nid,
            studentClass: updatedData[targetIdx].studentClass || selectedClassForNid,
          };
          if (nid.length === 14) {
            const digit13 = parseInt(nid.charAt(12), 10);
            const newGender = (digit13 % 2 !== 0) ? 'male' : 'female';
            updatedData[targetIdx].gender = newGender;
            updatedData[targetIdx].enrollmentStatus = convertStatus(updatedData[targetIdx].enrollmentStatus, newGender);
            updatedData[targetIdx].religion = convertReligion(updatedData[targetIdx].religion, newGender);
          }
        }
      });
      onChange(updatedData, true);
    }
    setNationalIdModalText('');
    setImportNidFileFeedback(null);
    setIsNationalIdModalOpen(false);
  };

  const handleImportNationalIdsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImportingNidFile(true);
    setImportNidFileFeedback(null);

    try {
      const result = await importNationalIdsFromFile(file);
      if (result.error || result.nationalIds.length === 0) {
        setImportNidFileFeedback({
          type: 'error',
          message:
            result.error ||
            'الملف المحدد لا يحتوي على قائمة أرقام قومية صالحة (14 رقماً).',
        });
        return;
      }

      const existingLines = nationalIdModalText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const existingSet = new Set(existingLines);
      const merged = [...existingLines];
      let addedCount = 0;

      for (const nid of result.nationalIds) {
        if (!existingSet.has(nid)) {
          existingSet.add(nid);
          merged.push(nid);
          addedCount++;
        }
      }

      setNationalIdModalText(merged.join('\n'));
      setImportNidFileFeedback({
        type: 'success',
        message:
          existingLines.length > 0
            ? `تم التحقق وجلب ${result.nationalIds.length} رقماً قومياً من (${result.fileName}) — أُضيف ${addedCount} رقماً جديداً إلى القائمة.`
            : `تم التحقق من قائمة الأرقام القومية وجلب ${result.nationalIds.length} رقماً بدقة من (${result.fileName}). راجع القائمة ثم اضغط إضافة.`,
      });
    } finally {
      setIsImportingNidFile(false);
    }
  };

  const handleApplyDefaultValues = () => {
    const targetIds = new Set(filteredData.map(s => s.id));
    const effectiveExemption = showExemptionStatus ? defaultExemptionStatus : '';
    if (targetIds.size > 0 && (defaultEnrollmentStatus || effectiveExemption || defaultEnrollmentType || defaultReligion)) {
      const updatedData = data.map(s => {
        if (!targetIds.has(s.id)) return s;
        const next: StudentData = { ...s };
        if (defaultEnrollmentStatus === 'منقول') {
          if (isKindergarten) {
            next.studentStatus = 'عادى';
            next.enrollmentStatus = s.gender === 'female' ? 'مستجدة' : 'مستجد';
          } else {
            next.enrollmentStatus = normalizeStatusForGrade('منقول', isFirstGrade, s.gender);
          }
        }
        if (effectiveExemption) {
          next.exemptionStatus = effectiveExemption;
        }
        if (defaultEnrollmentType === 'قيد عادى') {
          next.enrollmentType = 'قيد عادى';
        }
        if (defaultReligion === 'muslim') {
          next.religion = 'muslim';
        }
        return next;
      });
      onChange(updatedData, true);
    }
    setIsDefaultValuesModalOpen(false);
  };

  const handleGenerateSeatNumbers = () => {
    const updatedData = [...data];
    let currentNum = seatNumStart;
    filteredData.forEach(student => {
      const index = updatedData.findIndex(s => s.id === student.id);
      if (index !== -1) {
        const seatStr = String(currentNum++);
        updatedData[index] = {
          ...updatedData[index],
          ...(semester === 'first' ? { seatNumber: seatStr } : {}),
          seatNumbers: {
            ...updatedData[index].seatNumbers,
            [semester]: seatStr
          }
        };
      }
    });
    try {
      const raw = localStorage.getItem('sheet_control_numbering_settings_by_grade');
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[numberingStorageKey] = {
        ...(parsed[numberingStorageKey] || {}),
        seatNumStart: seatNumStart >= 1 ? seatNumStart : 1,
        userSetSeat: true,
      };
      localStorage.setItem('sheet_control_numbering_settings_by_grade', JSON.stringify(parsed));
    } catch {}
    userEditedExamNumbersRef.current = true;
    onChange(updatedData, true);
    setIsSeatNumModalOpen(false);
  };

  const handleGenerateSecretNumbers = () => {
    const updatedData = [...data];
    let currentNum = secretNumStart;
    const skipNum1 = enableSkipMultiple1 && typeof secretNumSkipMultiple === 'number' && secretNumSkipMultiple > 0 ? secretNumSkipMultiple : null;
    const skipNum2 = enableSkipMultiple2 && typeof secretNumSkipMultiple2 === 'number' && secretNumSkipMultiple2 > 0 ? secretNumSkipMultiple2 : null;
    
    filteredData.forEach(student => {
      const index = updatedData.findIndex(s => s.id === student.id);
      if (index !== -1) {
        if (skipNum1 || skipNum2) {
          while ((skipNum1 && currentNum % skipNum1 === 0) || (skipNum2 && currentNum % skipNum2 === 0)) {
            currentNum++;
          }
        }
        const secretStr = String(currentNum++);
        updatedData[index] = {
          ...updatedData[index],
          ...(semester === 'first' ? { secretNumber: secretStr } : {}),
          secretNumbers: {
            ...updatedData[index].secretNumbers,
            [semester]: secretStr
          }
        };
      }
    });
    try {
      const raw = localStorage.getItem('sheet_control_numbering_settings_by_grade');
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[numberingStorageKey] = {
        ...(parsed[numberingStorageKey] || {}),
        secretNumStart: secretNumStart >= 1 ? secretNumStart : 1,
        secretNumSkipMultiple: enableSkipMultiple1 ? secretNumSkipMultiple : '',
        secretNumSkipMultiple2: enableSkipMultiple2 ? secretNumSkipMultiple2 : '',
        userSetSecret: true,
      };
      localStorage.setItem('sheet_control_numbering_settings_by_grade', JSON.stringify(parsed));
    } catch {}
    userEditedExamNumbersRef.current = true;
    onChange(updatedData, true);
    setIsSecretNumModalOpen(false);
  };

  const applyCommitteeAssignments = React.useCallback((studentsList: StudentData[]) => {
    if (studentsList.length === 0) {
      return { data: studentsList, hasChanges: false };
    }

    const sizeFirst = typeof committeeSizeFirst === 'number' && committeeSizeFirst >= 1 ? committeeSizeFirst : 20;
    const sizeSecond = typeof committeeSizeSecond === 'number' && committeeSizeSecond >= 1 ? committeeSizeSecond : 20;

    const buildCommMap = (
      targetSem: 'first' | 'second',
      commSize: number,
      mergeLast: boolean
    ) => {
      const orderedStudents = [...studentsList].sort((a, b) => {
        for (const criteria of sortBy) {
          const modifier = criteria.direction === 'desc' ? -1 : 1;
          if (criteria.id === 'alphabetical' || criteria.id === 'name') {
            const cmp = a.name.localeCompare(b.name, lang === 'ar' ? 'ar' : 'en');
            if (cmp !== 0) return cmp * modifier;
          }
          if (criteria.id === 'gender') {
            const cmp = (a.gender || '').localeCompare(b.gender || '', lang === 'ar' ? 'ar' : 'en');
            if (cmp !== 0) return cmp * modifier;
          }
          if (criteria.id === 'status') {
            const cmp = (a.enrollmentStatus || '').localeCompare(b.enrollmentStatus || '', lang === 'ar' ? 'ar' : 'en');
            if (cmp !== 0) return cmp * modifier;
          }
          if (criteria.id === 'exemptionStatus') {
            const cmp = (a.exemptionStatus || '').localeCompare(b.exemptionStatus || '', lang === 'ar' ? 'ar' : 'en');
            if (cmp !== 0) return cmp * modifier;
          }
          if (criteria.id === 'studentStatus') {
            const valA = a.studentStatus === 'دمج' ? 'دمج' : 'عادى';
            const valB = b.studentStatus === 'دمج' ? 'دمج' : 'عادى';
            const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en');
            if (cmp !== 0) return cmp * modifier;
          }
          if (criteria.id === 'enrollmentType') {
            const cmp = (a.enrollmentType || '').localeCompare(b.enrollmentType || '', lang === 'ar' ? 'ar' : 'en');
            if (cmp !== 0) return cmp * modifier;
          }
          if (criteria.id === 'religion') {
            const cmp = (a.religion || '').localeCompare(b.religion || '', lang === 'ar' ? 'ar' : 'en');
            if (cmp !== 0) return cmp * modifier;
          }
          if (criteria.id === 'seatNumber') {
            const valA = a.seatNumbers?.[targetSem] || (targetSem === 'first' ? a.seatNumber : '') || '';
            const valB = b.seatNumbers?.[targetSem] || (targetSem === 'first' ? b.seatNumber : '') || '';
            const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en', { numeric: true });
            if (cmp !== 0) return cmp * modifier;
          }
          if (criteria.id === 'secretNumber') {
            const valA = a.secretNumbers?.[targetSem] || (targetSem === 'first' ? a.secretNumber : '') || '';
            const valB = b.secretNumbers?.[targetSem] || (targetSem === 'first' ? b.secretNumber : '') || '';
            const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en', { numeric: true });
            if (cmp !== 0) return cmp * modifier;
          }
          if (criteria.id === 'studentClass' || criteria.id === 'class') {
            const valA = (a.studentClass || '').toString();
            const valB = (b.studentClass || '').toString();
            const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en', { numeric: true });
            if (cmp !== 0) return cmp * modifier;
          }
        }
        return 0;
      });

      const total = orderedStudents.length;
      const fullCommittees = Math.floor(total / commSize);
      const hasIncompleteLast = total > commSize && total % commSize !== 0;

      const commById = new Map<string, string>();
      orderedStudents.forEach((student, idx) => {
        let rawCommNum = Math.floor(idx / commSize) + 1;
        if (mergeLast && hasIncompleteLast && rawCommNum > fullCommittees) {
          rawCommNum = fullCommittees;
        }
        commById.set(student.id, String(rawCommNum));
      });
      return commById;
    };

    const commMapFirst = buildCommMap('first', sizeFirst, mergeLastCommitteeFirst);
    const commMapSecond = buildCommMap('second', sizeSecond, mergeLastCommitteeSecond);

    let hasChanges = false;
    const updatedData = studentsList.map(s => {
      const targetCommFirst = commMapFirst.get(s.id) || '1';
      const targetCommSecond = commMapSecond.get(s.id) || '1';
      const currentCommFirst = s.committeeNumbers?.['first'] || '';
      const currentCommSecond = s.committeeNumbers?.['second'] || '';
      const currentActiveTarget = semester === 'second' ? targetCommSecond : targetCommFirst;

      if (
        s.committeeNumber !== currentActiveTarget ||
        currentCommFirst !== targetCommFirst ||
        currentCommSecond !== targetCommSecond
      ) {
        hasChanges = true;
        return {
          ...s,
          committeeNumber: currentActiveTarget,
          committeeNumbers: {
            ...s.committeeNumbers,
            first: targetCommFirst,
            second: targetCommSecond,
          },
        };
      }
      return s;
    });

    return { data: updatedData, hasChanges };
  }, [
    committeeSizeFirst,
    mergeLastCommitteeFirst,
    committeeSizeSecond,
    mergeLastCommitteeSecond,
    sortBy,
    semester,
    lang,
  ]);

  const prevCommitteeConfigKeyRef = React.useRef<string | null>(null);
  const prevSortedOrderKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (data.length === 0) return;

    const committeeConfigKey = `${committeeSizeFirst}|${mergeLastCommitteeFirst}|${committeeSizeSecond}|${mergeLastCommitteeSecond}|${semester}|${lang}|${JSON.stringify(sortBy)}`;
    const sortedOrderKey = `${sortStudentsList(data, 'first').map(s => s.id).join(',')}|${sortStudentsList(data, 'second').map(s => s.id).join(',')}`;

    const isInitialRun = prevCommitteeConfigKeyRef.current === null;
    const configOrOrderChanged =
      prevCommitteeConfigKeyRef.current !== committeeConfigKey ||
      prevSortedOrderKeyRef.current !== sortedOrderKey;

    if (skipAutoSyncSnapshotRef.current === data) {
      prevCommitteeConfigKeyRef.current = committeeConfigKey;
      prevSortedOrderKeyRef.current = sortedOrderKey;
      return;
    }

    if (isEditingData) {
      return;
    }

    prevCommitteeConfigKeyRef.current = committeeConfigKey;
    prevSortedOrderKeyRef.current = sortedOrderKey;

    const hasMissingCommittee = data.some(s =>
      !(s.committeeNumbers?.first || '').trim() ||
      !(s.committeeNumbers?.second || '').trim() ||
      !(s.committeeNumber || '').trim()
    );

    if (!isInitialRun && !configOrOrderChanged && !hasMissingCommittee) {
      return;
    }
    if (!configOrOrderChanged && !isInitialRun) {
      return;
    }

    const { data: updatedData, hasChanges } = applyCommitteeAssignments(data);
    if (hasChanges) {
      applySilentChange(updatedData);
    }
  }, [
    committeeSizeFirst,
    mergeLastCommitteeFirst,
    committeeSizeSecond,
    mergeLastCommitteeSecond,
    data,
    sortBy,
    semester,
    lang,
    isEditingData,
    applyCommitteeAssignments,
    applySilentChange,
  ]);

  let filteredData = data.filter(s => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(searchLower) || 
                         s.nationalId.includes(searchTerm) ||
                         (s.enrollmentStatus && s.enrollmentStatus.includes(searchTerm)) ||
                         (showExemptionStatus && s.exemptionStatus && s.exemptionStatus.includes(searchTerm)) ||
                         (s.enrollmentType && s.enrollmentType.includes(searchTerm));
    
    if (!matchesSearch) return false;

    if (filters.gender && s.gender !== filters.gender) return false;
    if (filters.religion) {
      const isMuslim = s.religion === 'muslim' || (s.religion || '').includes('ل');
      const isChristian = s.religion === 'christian' || (s.religion || '').includes('ح');
      if (filters.religion === 'muslim' && !isMuslim) return false;
      if (filters.religion === 'christian' && !isChristian) return false;
    }
    if (filters.studentClass && s.studentClass !== filters.studentClass) return false;
    if (filters.enrollmentStatus && s.enrollmentStatus !== filters.enrollmentStatus) return false;
    if (showExemptionStatus && filters.exemptionStatus && s.exemptionStatus !== filters.exemptionStatus) return false;
    if (filters.enrollmentType && s.enrollmentType !== filters.enrollmentType) return false;
    if (filters.committeeNumber && s.committeeNumber !== filters.committeeNumber) return false;

    return true;
  }).sort((a, b) => {
    for (const criteria of sortBy) {
      const modifier = criteria.direction === 'desc' ? -1 : 1;
      if (criteria.id === 'alphabetical' || criteria.id === 'name') {
        const cmp = a.name.localeCompare(b.name, lang === 'ar' ? 'ar' : 'en');
        if (cmp !== 0) return cmp * modifier;
      }
      if (criteria.id === 'gender') {
        const cmp = (a.gender || '').localeCompare(b.gender || '', lang === 'ar' ? 'ar' : 'en');
        if (cmp !== 0) return cmp * modifier;
      }
      if (criteria.id === 'status') {
        const cmp = (a.enrollmentStatus || '').localeCompare(b.enrollmentStatus || '', lang === 'ar' ? 'ar' : 'en');
        if (cmp !== 0) return cmp * modifier;
      }
      if (criteria.id === 'exemptionStatus') {
        const cmp = (a.exemptionStatus || '').localeCompare(b.exemptionStatus || '', lang === 'ar' ? 'ar' : 'en');
        if (cmp !== 0) return cmp * modifier;
      }
        if (criteria.id === 'studentStatus') {
          const valA = a.studentStatus === 'دمج' ? 'دمج' : 'عادى';
          const valB = b.studentStatus === 'دمج' ? 'دمج' : 'عادى';
          const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en');
          if (cmp !== 0) return cmp * modifier;
        }
      if (criteria.id === 'enrollmentType') {
        const cmp = (a.enrollmentType || '').localeCompare(b.enrollmentType || '', lang === 'ar' ? 'ar' : 'en');
        if (cmp !== 0) return cmp * modifier;
      }
      if (criteria.id === 'religion') {
        const cmp = (a.religion || '').localeCompare(b.religion || '', lang === 'ar' ? 'ar' : 'en');
        if (cmp !== 0) return cmp * modifier;
      }
      if (criteria.id === 'seatNumber') {
        const valA = a.seatNumbers?.[semester] || (semester === 'first' ? a.seatNumber : '') || '';
        const valB = b.seatNumbers?.[semester] || (semester === 'first' ? b.seatNumber : '') || '';
        const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en', { numeric: true });
        if (cmp !== 0) return cmp * modifier;
      }
      if (criteria.id === 'secretNumber') {
        const valA = a.secretNumbers?.[semester] || (semester === 'first' ? a.secretNumber : '') || '';
        const valB = b.secretNumbers?.[semester] || (semester === 'first' ? b.secretNumber : '') || '';
        const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en', { numeric: true });
        if (cmp !== 0) return cmp * modifier;
      }
      if (criteria.id === 'studentClass' || criteria.id === 'class') {
        const valA = (a.studentClass || '').toString();
        const valB = (b.studentClass || '').toString();
        const cmp = valA.localeCompare(valB, lang === 'ar' ? 'ar' : 'en', { numeric: true });
        if (cmp !== 0) return cmp * modifier;
      }
    }
    return 0;
  });

  if (isEditingData) {
    filteredData = frozenIdsRef.current.map(id => data.find(s => s.id === id)).filter(Boolean) as StudentData[];
  } else {
    frozenIdsRef.current = filteredData.map(s => s.id);
  }
  filteredDataRef.current = filteredData;

  const auditResult = useMemo(
    () =>
      runPrePrintAudit({
        mode: 'students_data',
        students: filteredData,
        semester,
        showExamFields,
        showSecretFields: showExamFields,
        isKindergarten,
      }),
    [filteredData, semester, showExamFields, isKindergarten]
  );

  const handleOpenPrintWithAudit = () => {
    if (auditResult.issues.length > 0) {
      setAuditModalState({ isOpen: true, isPrintTrigger: true });
    } else {
      setIsPrintMenuOpen(true);
    }
  };

  const handleJumpToStudent = (studentId: string) => {
    setAuditModalState({ isOpen: false, isPrintTrigger: false });
    setSearchTerm('');
    setFilters({});
    if (auditHighlightTimerRef.current) {
      window.clearTimeout(auditHighlightTimerRef.current);
    }
    setHighlightedStudentId(studentId);
    window.setTimeout(() => {
      const nameCellEl = document.querySelector(`[data-audit-name-cell="${studentId}"]`) as HTMLElement | null;
      const targetEl = nameCellEl || (document.querySelector(`[data-audit-student-id="${studentId}"]`) as HTMLElement | null);
      targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 80);
    auditHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedStudentId((prev) => (prev === studentId ? null : prev));
      auditHighlightTimerRef.current = null;
    }, 10000);
  };

  const totalStudents = data.length;
  const boysCount = data.filter(s => s.gender === 'male').length;
  const girlsCount = data.filter(s => s.gender === 'female').length;
  const muslimsCount = data.filter(s => s.religion === 'muslim').length;
  const christiansCount = data.filter(s => s.religion === 'christian').length;
  
  const muslimBoysCount = data.filter(s => s.gender === 'male' && s.religion === 'muslim').length;
  const christianBoysCount = data.filter(s => s.gender === 'male' && s.religion === 'christian').length;
  const muslimGirlsCount = data.filter(s => s.gender === 'female' && s.religion === 'muslim').length;
  const christianGirlsCount = data.filter(s => s.gender === 'female' && s.religion === 'christian').length;

  const handleExportCSV = () => {
    const headers = [
      t.serial,
      isKindergarten ? 'اسم التلميذ' : t.studentName,
      t.nationalId,
      t.gender,
      ...(isKindergarten ? ['حالة التلميذ'] : (!isKindergarten ? [t.enrollmentStatus, ...(showExemptionStatus ? [(t as any).exemptionStatus || 'حالة الإعفاء'] : [])] : [])),
      (t as any).enrollmentType || 'نوعية القيد',
      t.religion
    ];
    if (showExamFields) {
      headers.push((t as any).seatNumber, (t as any).secretNumber);
    }
    if (!isKindergarten) {
      headers.push((t as any).committeeNumber || 'رقم اللجنة');
    }
    
    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    
    filteredData.forEach((student, idx) => {
      const row = [
        idx + 1,
        `"${student.name}"`,
        `"${student.nationalId}"`,
        `"${student.gender === 'male' ? t.male : (student.gender === 'female' ? t.female : '')}"`,
        ...(isKindergarten ? [`"${student.studentStatus === 'دمج' ? 'دمج' : 'عادى'}"`] : (!isKindergarten ? [`"${normalizeStatusForGrade(student.enrollmentStatus, isFirstGrade)}"`, ...(showExemptionStatus ? [`"${student.exemptionStatus || ''}"`] : [])] : [])),
        `"${student.enrollmentType || ''}"`,
        `"${student.religion === 'muslim' ? (student.gender === 'female' ? (t as any).muslimFemale : t.muslim) : (student.religion === 'christian' ? (student.gender === 'female' ? (t as any).christianFemale : t.christian) : '')}"`
      ];
      
      if (showExamFields) {
        row.push(`"${student.seatNumbers?.[semester] || (semester === 'first' ? student.seatNumber : '') || ''}"`);
        row.push(`"${student.secretNumbers?.[semester] || (semester === 'first' ? student.secretNumber : '') || ''}"`);
      }
      if (!isKindergarten) {
        row.push(`"${student.committeeNumbers?.[semester] || student.committeeNumber || ''}"`);
      }
      
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `students_${title}.csv`;
    link.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, rowIndex: number, colIndex: number) => {
    const tableColumns = isKindergarten ? 7 : (showExamFields ? 10 + colOffset : 8 + colOffset);
    let nextRow = rowIndex;
    let nextCol = colIndex;

    switch (e.key) {
      case 'Tab':
        if (e.shiftKey) {
          if (colIndex > 0) {
            nextCol = colIndex - 1;
          } else if (rowIndex > 0) {
            nextRow = rowIndex - 1;
            nextCol = tableColumns - 1;
          }
        } else {
          if (colIndex < tableColumns - 1) {
            nextCol = colIndex + 1;
          } else if (rowIndex < filteredData.length - 1) {
            nextRow = rowIndex + 1;
            nextCol = 0;
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
      case 'ArrowLeft':
        if (e.currentTarget.tagName === 'SELECT') {
          nextCol = lang === 'ar' ? Math.min(tableColumns - 1, colIndex + 1) : Math.max(0, colIndex - 1);
        } else {
          const input = e.currentTarget as HTMLInputElement;
          const isAllSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
          if (isAllSelected || input.value === '') {
            nextCol = lang === 'ar' ? Math.min(tableColumns - 1, colIndex + 1) : Math.max(0, colIndex - 1);
          } else if (lang === 'ar' && (input.selectionEnd === input.value.length || input.selectionStart === 0)) {
            nextCol = Math.min(tableColumns - 1, colIndex + 1);
          } else if (lang !== 'ar' && input.selectionStart === 0) {
            nextCol = Math.max(0, colIndex - 1);
          } else {
            return;
          }
        }
        break;
      case 'ArrowRight':
        if (e.currentTarget.tagName === 'SELECT') {
          nextCol = lang === 'ar' ? Math.max(0, colIndex - 1) : Math.min(tableColumns - 1, colIndex + 1);
        } else {
          const input = e.currentTarget as HTMLInputElement;
          const isAllSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
          if (isAllSelected || input.value === '') {
            nextCol = lang === 'ar' ? Math.max(0, colIndex - 1) : Math.min(tableColumns - 1, colIndex + 1);
          } else if (lang === 'ar' && (input.selectionStart === 0 || input.selectionEnd === input.value.length)) {
            nextCol = Math.max(0, colIndex - 1);
          } else if (lang !== 'ar' && input.selectionEnd === input.value.length) {
            nextCol = Math.min(tableColumns - 1, colIndex + 1);
          } else {
            return;
          }
        }
        break;
      default:
        return;
    }

    if (nextRow !== rowIndex || nextCol !== colIndex) {
      e.preventDefault();
      const nextInput = document.getElementById(`cell-${nextRow}-${nextCol}`);
      if (nextInput) {
        try {
          nextInput.focus({ preventScroll: true });
        } catch {
          nextInput.focus();
        }
        if (nextInput.tagName === 'INPUT') {
          try {
            (nextInput as HTMLInputElement).select();
          } catch {}
        }
        ensureCellVisible(nextInput);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLSelectElement>, id: string, field: keyof StudentData | 'seatNumbers' | 'secretNumbers' | 'committeeNumbers', rowIndex: number, colIndex: number) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;
    
    const lines = pasteData.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length > 1) {
      e.preventDefault();
      const updatedData = [...data];
      let linesUsed = 0;
      for (let i = 0; i < lines.length; i++) {
        const targetFilteredRow = rowIndex + i;
        if (targetFilteredRow >= filteredData.length) break;
        
        const targetStudentId = filteredData[targetFilteredRow].id;
        const dataIndex = updatedData.findIndex(s => s.id === targetStudentId);
        if (dataIndex === -1) continue;
        
        const val = lines[i];
        const student = { ...updatedData[dataIndex] };
        
        if (field === 'seatNumbers' || field === 'secretNumbers' || field === 'committeeNumbers') {
           student[field] = { ...student[field], [semester]: val };
           if (field === 'committeeNumbers') {
             student.committeeNumber = val;
           }
        } else {
           let finalVal = val;
           if (field === 'enrollmentStatus') {
             finalVal = normalizeStatusForGrade(val, isFirstGrade, student.gender);
           } else if (field === 'exemptionStatus') {
             const v = val.trim();
             if (v === 'كلي' || v === 'كلى') finalVal = 'كلى';
             else if (v === 'تدريجي' || v === 'تدريجى') finalVal = 'تدريجى';
             else if (v === '' || v === '-') finalVal = '';
             else finalVal = v;
           } else if (field === 'studentStatus') {
             const v = val.trim();
             if (v.includes('دمج')) finalVal = 'دمج';
             else if (v.includes('نظام') || v.includes('عادي') || v.includes('عادى')) finalVal = 'عادى';
             else finalVal = v;
           } else if (field === 'enrollmentType') {
             const v = val.trim();
             if (v === 'قيد عادي' || v === 'قيد عادى') finalVal = 'قيد عادى';
             else if (v === 'تحويل من مدرسة أخرى' || v === 'تحويلات') finalVal = 'تحويلات';
           } else if (field === 'religion') {
             const v = val.trim().toLowerCase();
             if (v.includes('ل') || v.includes('مسلم') || v === 'muslim') finalVal = 'muslim';
             else if (v.includes('ح') || v.includes('مسيح') || v === 'christian') finalVal = 'christian';
           }
           (student as any)[field] = finalVal;
           if (field === 'nationalId' && val.length === 14) {
             const digit13 = parseInt(val.charAt(12), 10);
             const newGender = (digit13 % 2 !== 0) ? 'male' : 'female';
             student.gender = newGender;
             student.enrollmentStatus = convertStatus(student.enrollmentStatus, newGender);
             student.religion = convertReligion(student.religion, newGender);
           } else if (field === 'gender') {
             student.enrollmentStatus = convertStatus(student.enrollmentStatus, val);
             student.religion = convertReligion(student.religion, val);
           }
        }
        updatedData[dataIndex] = student;
        linesUsed++;
      }
      if (field === 'seatNumbers' || field === 'secretNumbers') {
        userEditedExamNumbersRef.current = true;
      }
      onChange(updatedData, true);
      
      const nextRow = Math.min(filteredData.length - 1, rowIndex + linesUsed);
      setTimeout(() => {
        const nextInput = document.getElementById(`cell-${nextRow}-${colIndex}`);
        if (nextInput) {
          nextInput.focus();
          if (nextInput.tagName === 'INPUT') (nextInput as HTMLInputElement).select();
        }
      }, 50);
    } else {
      setTimeout(() => {
        const nextRow = Math.min(filteredData.length - 1, rowIndex + 1);
        if (nextRow !== rowIndex) {
          const nextInput = document.getElementById(`cell-${nextRow}-${colIndex}`);
          if (nextInput) {
            nextInput.focus();
            if (nextInput.tagName === 'INPUT') (nextInput as HTMLInputElement).select();
          }
        }
      }, 10);
    }
  };

  return (
    <div
      className="w-[96%] sm:w-[95vw] max-w-[95vw] mx-auto relative rounded-2xl shadow-2xl p-[6px] bg-slate-900 flex-1 h-full min-h-0 flex flex-col"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="bg-[#f8ebff] rounded-[10px] w-full flex-1 min-h-0 p-6 flex flex-col gap-4 relative overflow-hidden">
        {/* Header Row */}
        <div className="shrink-0 flex flex-col md:flex-row justify-between items-center bg-[linear-gradient(to_right,#b45309,#d97706,#f59e0b,#d97706,#b45309)] border-2 border-slate-900 rounded-xl p-3 shadow-sm gap-4 relative overflow-hidden">
          <div className="text-white drop-shadow-md font-bold text-base md:text-lg text-center md:text-right px-4 flex-1">
            <span style={(stage === 'secondary' || title.includes('المرحلة الثانوية')) ? { fontSize: '85%' } : undefined} className="inline-block truncate max-w-full align-middle">
              {title}
            </span>
          </div>
          <div className="text-white drop-shadow-md font-bold text-base md:text-lg px-4 shrink-0">
            <div className="whitespace-nowrap">
              تحرير البيانات
            </div>
          </div>
        </div>

        {/* Search & Sort Row */}
        <div className="shrink-0 flex flex-row justify-between items-center bg-white border-2 border-slate-900 rounded-xl p-2 sm:p-3 shadow-sm gap-2 sm:gap-4 flex-nowrap w-full">
          <div className="flex items-stretch gap-1.5 sm:gap-2 flex-1 min-w-0 max-w-3xl">
            <button
              onClick={onBack}
              title={lang === 'ar' ? 'عودة' : 'Back'}
              className="shrink-0 border-2 border-slate-900 text-white rounded-lg p-2 sm:px-3 flex items-center justify-center transition-opacity hover:opacity-80 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-[length:200%_auto] animate-shine shadow-sm self-stretch"
            >
              {lang === 'ar' ? <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" /> : <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <div className="relative flex-1 min-w-0 group/search flex items-center">
              <div className="absolute inset-y-0 right-2.5 sm:right-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder={isKindergarten ? 'بحث باسم التلميذ أو بالرقم القومى' : t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-full min-w-0 bg-white border-2 border-slate-900 rounded-lg pr-8 sm:pr-10 pl-8 sm:pl-10 py-1.5 sm:py-2.5 text-xs sm:text-sm md:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium truncate"
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
            <FilterButtonMenu
              filters={filters}
              onFilterChange={setFilters}
              lang={lang}
              data={data}
              numberLang={numberLang}
              isKindergarten={isKindergarten}
              isInternational={isInternational}
              educationType={educationType}
              className="shrink-0"
            />
            <button
              type="button"
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              title={t.sortBy}
              className="flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-500/40 via-white/70 to-pink-500/40 hover:from-blue-500/60 hover:via-white/90 hover:to-pink-500/60 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-2.5 cursor-pointer transition-all duration-300 shrink-0 whitespace-nowrap select-none shadow-sm self-stretch"
            >
              <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center whitespace-nowrap gap-1">
                {sortBy.length === 0 ? t.defaultSort : sortBy.map((c, index) => {
                  const opt = [
                    { id: 'alphabetical', label: t.sortAlphabetical },
                    { id: 'name', label: t.sortAlphabetical },
                    { id: 'gender', label: t.sortGender },
                    { id: 'status', label: t.sortStatus },
                    { id: 'exemptionStatus', label: (t as any).sortExemptionStatus || 'حالة الإعفاء' },
                    { id: 'studentStatus', label: isKindergarten ? 'حالة التلميذ' : 'حالة الطالب' },
                    { id: 'enrollmentType', label: (t as any).sortEnrollmentType || (t as any).enrollmentType || 'نوعية القيد' },
                    { id: 'religion', label: t.sortReligion },
                    { id: 'seatNumber', label: (t as any).seatNumber },
                    { id: 'secretNumber', label: (t as any).secretNumber },
                    { id: 'studentClass', label: (t as any).sortClass || 'الفصل' },
                    { id: 'total', label: (t as any).totalSort || 'المجموع' }
                  ].find(o => o.id === c.id);
                  return (
                    <React.Fragment key={c.id}>
                      <span className="flex items-center gap-1.5 ml-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs leading-none">{index + 1}</span>
                        <span>{opt ? opt.label : c.id}</span>
                        {c.direction === 'desc' ? <ArrowDown className="w-4 h-4 text-slate-700" strokeWidth={3} /> : <ArrowUp className="w-4 h-4 text-slate-700" strokeWidth={3} />}
                      </span>
                    </React.Fragment>
                  );
                })}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setNumberLang(prev => prev === 'ar' ? 'en' : 'ar')}
              className={`px-2.5 sm:px-3 border-2 border-slate-900 rounded-lg text-xs sm:text-sm font-black flex items-center justify-center gap-1 transition-colors shrink-0 shadow-sm whitespace-nowrap self-stretch ${
                numberLang === 'ar' ? 'bg-amber-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
              title="تغيير لغة الأرقام من عربي إلى إنجليزي والعكس"
            >
              <span>{numberLang === 'ar' ? 'الأرقام باللغة الإنجليزية' : 'الأرقام باللغة العربية'}</span>
            </button>
          </div>
       
          <div dir="ltr" className="flex flex-row items-center gap-1.5 sm:gap-2 shrink-0 relative justify-end flex-nowrap">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={undo}
              disabled={!canUndo}
              aria-label="تراجع عن آخر تعديل"
              className={`order-3 flex items-center justify-center w-10 h-10 sm:w-[50px] sm:h-[50px] rounded-full border-2 border-slate-900 shadow-sm shrink-0 transition-all relative ${
                canUndo
                  ? 'bg-gradient-to-br from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 text-slate-900 active:scale-[0.96] cursor-pointer'
                  : 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed'
              }`}
              title={canUndo ? `تراجع عن آخر تعديل (Ctrl+Z) - متاح ${undoCount}` : 'لا توجد تعديلات للتراجع عنها'}
            >
              <Undo2 className="w-5 h-5 sm:w-6 sm:h-6" />
              {canUndo && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center border border-white">
                  {undoCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={redo}
              disabled={!canRedo}
              aria-label="العودة عن التراجع"
              className={`order-4 flex items-center justify-center w-10 h-10 sm:w-[50px] sm:h-[50px] rounded-full border-2 border-slate-900 shadow-sm shrink-0 transition-all relative ${
                canRedo
                  ? 'bg-gradient-to-br from-sky-100 to-sky-200 hover:from-sky-200 hover:to-sky-300 text-slate-900 active:scale-[0.96] cursor-pointer'
                  : 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed'
              }`}
              title={canRedo ? `العودة عن التراجع (Ctrl+Y) - متاح ${redoCount}` : 'لا توجد تعديلات للعودة عن التراجع'}
            >
              <Redo2 className="w-5 h-5 sm:w-6 sm:h-6" />
              {canRedo && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center border border-white">
                  {redoCount}
                </span>
              )}
            </button>

            <QuickSupportAuditButton
              issueCount={auditResult.issues.length}
              onClick={() => setAuditModalState({ isOpen: true, isPrintTrigger: false })}
              className="order-5"
            />

            <div className="relative shrink-0 order-1">
              
              <button
                type="button"
                onClick={() => setIsToolsMenuOpen(true)}
                className="bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine text-slate-900 w-10 h-10 sm:w-[50px] sm:h-[50px] rounded-full border-2 border-slate-900 hover:bg-slate-100 transition-colors shadow-sm shrink-0 flex items-center justify-center"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 mix-blend-difference text-white" />
              </button>
              <AnimatePresence>
                {isToolsMenuOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <motion.div
                      {...FAST_BACKDROP_FADE}
                      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                      onClick={() => setIsToolsMenuOpen(false)}
                    />
                    <motion.div
                      {...FAST_MODAL_FLIP}
                      className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-sm"
                    >
                      <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-8px', animationDuration: '15s' }}></div>
                      <div className="bg-white rounded-[22px] p-6 flex flex-col gap-3 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        <BrandHeader />
                        <ActionMenuButton
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setAddClassMode('select');
                            setIsAddClassDropdownOpen(false);
                            setCustomClassNameInput('');
                            setCustomClassError(null);
                            setIsModalOpen(true);
                          }}
                          icon={<Plus className="w-4 h-4" />}
                          text={isKindergarten ? 'إضافة تلميذ' : t.addStudent}
                          bgGradient="bg-[linear-gradient(to_right,#3b82f6,#8b5cf6,#3b82f6)]"
                          disabled={isTrialMode}
                          title={isTrialMode ? "متاح فى النسخة الرسمية فقط" : undefined}
                        />
                        
                        <ActionMenuButton
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setImportNidFileFeedback(null);
                            if (filters.studentClass) {
                              setSelectedClassForNid(filters.studentClass);
                            } else {
                              const hasCurrentClass = data.some(s => s.studentClass === selectedClassForNid);
                              const firstClassInTable = filteredData.find(s => s.studentClass?.trim())?.studentClass?.trim();
                              if (!hasCurrentClass && firstClassInTable) {
                                setSelectedClassForNid(firstClassInTable);
                              }
                            }
                            setIsNationalIdModalOpen(true);
                          }}
                          icon={<Plus className="w-4 h-4" />}
                          text={t.addNationalIds}
                          bgGradient="bg-[linear-gradient(to_right,#d946ef,#f43f5e,#d946ef)]"
                          disabled={isTrialMode}
                          title={isTrialMode ? "متاح فى النسخة الرسمية فقط" : undefined}
                        />

                        <ActionMenuButton
                          onClick={() => {
                            setIsToolsMenuOpen(false);
                            setDefaultEnrollmentStatus('منقول');
                            setDefaultExemptionStatus(showExemptionStatus ? 'كلى' : '');
                            setDefaultEnrollmentType('قيد عادى');
                            setDefaultReligion('muslim');
                            setIsDefaultValuesModalOpen(true);
                          }}
                          icon={<Sliders className="w-4 h-4" />}
                          text="القيم الافتراضية لبيانات الطلاب"
                          bgGradient="bg-[linear-gradient(to_right,#6366f1,#3b82f6,#6366f1)]"
                        />

                        <ActionMenuButton
                          onClick={() => { setIsToolsMenuOpen(false); setIsExamScheduleModalOpen(true); }}
                          icon={<Calendar className="w-4 h-4" />}
                          text="تحرير جدول الامتحان"
                          bgGradient="bg-[linear-gradient(to_right,#0284c7,#2563eb,#0284c7)]"
                        />
                        
                        {showExamFields && (
                          <>
                            <ActionMenuButton
                              onClick={() => { setIsToolsMenuOpen(false); setIsSeatNumModalOpen(true); }}
                              icon={<Plus className="w-4 h-4" />}
                              text={(t as any).generateSeatNumbers}
                              bgGradient="bg-[linear-gradient(to_right,#10b981,#059669,#10b981)]"
                            />
                            <ActionMenuButton
                              onClick={() => { setIsToolsMenuOpen(false); setIsSecretNumModalOpen(true); }}
                              icon={<Plus className="w-4 h-4" />}
                              text={(t as any).generateSecretNumbers}
                              bgGradient="bg-[linear-gradient(to_right,#f59e0b,#ef4444,#f59e0b)]"
                            />
                          </>
                        )}
                        
                        {!isKindergarten && (
                          <ActionMenuButton
                            onClick={() => {
                              setIsToolsMenuOpen(false);
                              setCommitteeModalSemester(isFirstSemester ? 'first' : 'second');
                              setIsCommitteeSizeModalOpen(true);
                            }}
                            icon={<Plus className="w-4 h-4" />}
                            text={(t as any).studentsPerCommittee || 'إعدادات اللجنة'}
                            bgGradient={
                              isFirstSemester
                                ? "bg-[linear-gradient(to_right,#059669,#14b8a6,#059669)]"
                                : "bg-[linear-gradient(to_right,#0284c7,#06b6d4,#0284c7)]"
                            }
                          />
                        )}
                        
                        <ActionMenuButton
                          onClick={() => { setIsToolsMenuOpen(false); setIsStatsMenuOpen(true); }}
                          icon={<PieChart className="w-4 h-4" />}
                          text={(t as any).statistics || 'إحصائيات أولية'}
                          bgGradient="bg-[linear-gradient(to_right,#14b8a6,#a855f7,#14b8a6)]"
                        />



                        {/* أزرار التحرير والرصد الخاصة بالفصل الدراسي الحالي فقط */}
                        {(() => {
                          const isOfficialMode = !isTrialMode;
                          const hasAnyStudent = Boolean(data && data.length > 0 && data.some(s => s && s.name && s.name.trim().length > 0));
                          const isOfficialNoStudents = isOfficialMode && !hasAnyStudent;
                          return isFirstSemester ? (
                            <>
                              {!isMiddleOrSecHomeschool && Boolean(onEditAssessments) && (
                                <ActionMenuButton
                                  onClick={() => {
                                    if (isOfficialNoStudents) return;
                                    setIsToolsMenuOpen(false);
                                    if (onNavigateToSection) onNavigateToSection(6, 'first');
                                    else if (onEditAssessments) onEditAssessments('first');
                                  }}
                                  disabled={isOfficialNoStudents}
                                  icon={<Calendar className="w-4 h-4" />}
                                  text={applyTechnicalAssessmentTerms((t as any).editFirstSemesterAssessments || 'تحرير تقييمات الفصل الدراسي الأول', educationType, stage)}
                                  bgGradient="bg-[linear-gradient(to_right,#0d9488,#10b981,#0d9488)]"
                                />
                              )}

                              {!isKindergarten && (
                                <ActionMenuButton
                                  onClick={() => {
                                    if (isOfficialNoStudents) return;
                                    setIsToolsMenuOpen(false);
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
                              {!isMiddleOrSecHomeschool && Boolean(onEditAssessments) && (
                                <ActionMenuButton
                                  onClick={() => {
                                    if (isOfficialNoStudents) return;
                                    setIsToolsMenuOpen(false);
                                    if (onNavigateToSection) onNavigateToSection(6, 'second');
                                    else if (onEditAssessments) onEditAssessments('second');
                                  }}
                                  disabled={isOfficialNoStudents}
                                  icon={<Calendar className="w-4 h-4" />}
                                  text={applyTechnicalAssessmentTerms((t as any).editSecondSemesterAssessments || 'تحرير تقييمات الفصل الدراسي الثانى', educationType, stage)}
                                  bgGradient="bg-[linear-gradient(to_right,#059669,#10b981,#059669)]"
                                />
                              )}

                              {!isKindergarten && (
                                <ActionMenuButton
                                  onClick={() => {
                                    if (isOfficialNoStudents) return;
                                    setIsToolsMenuOpen(false);
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
                          );
                        })()}
                      
                        <div className="relative mt-2 pt-4 flex justify-center w-full shrink-0">
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-200 overflow-hidden rounded-full">
                            <div className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine" style={{ animationDuration: '3s' }}></div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsToolsMenuOpen(false)}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg border border-slate-900/40 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
                          >
                            <X className="w-8 h-8" strokeWidth={2.5} />
                          </button>
                        </div>
</div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
            <div className="relative shrink-0 order-2">
              <button
                type="button"
                onClick={handleOpenPrintWithAudit}
                className="flex items-center justify-center bg-[linear-gradient(to_right,#34d399,#10b981,#059669,#10b981,#34d399)] bg-[length:200%_auto] animate-shine text-white w-10 h-10 sm:w-[50px] sm:h-[50px] rounded-full transition-all hover:opacity-90 active:scale-[0.98] border-2 border-slate-900 shadow-sm shrink-0"
                title={(t as any).printLabel || (lang === 'ar' ? 'طباعة' : 'Print')}
              >
                <Printer className="w-full h-full p-2 drop-shadow-sm" />
              </button>
              <AnimatePresence>
                {isPrintMenuOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <motion.div
                      {...FAST_BACKDROP_FADE}
                      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                      onClick={() => setIsPrintMenuOpen(false)}
                    />
                    <motion.div
                      {...FAST_MODAL_FLIP}
                      className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-[460px]"
                    >
                      <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-8px', animationDuration: '15s' }}></div>
                      <div className="bg-white rounded-[22px] p-6 flex flex-col gap-3 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        <BrandHeader />
                        <RowThemeSelector />
                        <ActionMenuButton
                          onClick={async () => {
                            setIsPrintMenuOpen(false);
                            await downloadControlWorkGuide();
                          }}
                          icon={<FileDown className="w-4 h-4" />}
                          text="دليل أعمال الكنترول"
                          bgGradient="bg-[linear-gradient(to_right,#b45309,#f59e0b,#b45309)]"
                        />
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
                              onClick={() => handlePrintOption('answer_sheets_covers')}
                              icon={<Printer className="w-4 h-4" />}
                              text="أغلفة أوراق الإجابة"
                              bgGradient="bg-[linear-gradient(to_right,#0891b2,#06b6d4,#0891b2)]"
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('question_sheets_covers')}
                              icon={<Printer className="w-4 h-4" />}
                              text="أغلفة أوراق الأسئلة"
                              bgGradient="bg-[linear-gradient(to_right,#2563eb,#3b82f6,#2563eb)]"
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('seat_numbers')}
                              icon={<Printer className="w-4 h-4" />}
                              text="أرقام الجلوس"
                              bgGradient="bg-[linear-gradient(to_right,#f59e0b,#d97706,#f59e0b)]"
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('seat_numbers_with_schedule')}
                              icon={<Printer className="w-4 h-4" />}
                              text="أرقام الجلوس بجدول الإمتحانات"
                              bgGradient="bg-[linear-gradient(to_right,#f59e0b,#ea580c,#f59e0b)]"
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
                          isPaidService
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
                        {semester === 'second' && stage !== 'kindergarten' && (
                          <>
                            <ActionMenuButton
                              onClick={() => handlePrintOption('control_sheet_actual_and_percentage')}
                              icon={<Printer className="w-4 h-4" />}
                              text="شيت كنترول الفصل الدراسي الثانى - بالدرجة الفعلية والنسبة المئوية والتقدير للطالب لكل مادة دراسية"
                              bgGradient="bg-[linear-gradient(to_right,#0284c7,#2563eb,#0284c7)]"
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('student_success_statement' as any)}
                              icon={<Award className="w-4 h-4" />}
                              text="مستخرج رسمي لبيان درجات طالب"
                              bgGradient="bg-[linear-gradient(to_right,#dc2626,#1e3a8a,#dc2626)]"
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('student_success_statement_principal_only')}
                              icon={<Award className="w-4 h-4" />}
                              text="مستخرج رسمي لبيان درجات طالب - بتوقيع مدير المدرسة فقط"
                              bgGradient="bg-[linear-gradient(to_right,#1e3a8a,#0f766e,#1e3a8a)]"
                            />
                          </>
                        )}
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
                          isPaidService
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
                          isPaidService
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
                              onClick={() => handlePrintOption('seat_numbers_with_schedule_english')}
                              icon={<Printer className="w-4 h-4 shrink-0" />}
                              text="SEAT NUMBERS WITH IN EXAM SCHEDULE"
                              bgGradient="bg-[linear-gradient(to_right,#0c4a6e,#1e3a8a,#0c4a6e)]"
                              className="!text-[12.5px] sm:!text-[15.5px] !px-2 tracking-wide"
                              disableMarquee
                              isPaidService
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('seat_numbers_english')}
                              icon={<Printer className="w-4 h-4 shrink-0" />}
                              text="SEAT NUMBERS IN ENGLISH"
                              bgGradient="bg-[linear-gradient(to_right,#0c4a6e,#1e3a8a,#0c4a6e)]"
                              className="!text-[12.5px] sm:!text-[15.5px] !px-2 tracking-wide"
                              disableMarquee
                              isPaidService
                            />
                            <ActionMenuButton
                              onClick={() => handlePrintOption('student_semester_grades_certificate_en')}
                              icon={<Printer className="w-4 h-4 shrink-0" />}
                              text="CERTIFICATES IN ENGLISH"
                              bgGradient="bg-[linear-gradient(to_right,#0c4a6e,#1e3a8a,#0c4a6e)]"
                              className="!text-[12.5px] sm:!text-[15.5px] !px-2 tracking-wide"
                              disableMarquee
                              isPaidService
                            />
                          </>
                        )}

                        <div className="relative mt-2 pt-4 flex flex-col items-center gap-4 w-full shrink-0">
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-200 overflow-hidden rounded-full">
                            <div className="w-full h-full bg-[linear-gradient(90deg,transparent,#f43f5e,transparent)] bg-[length:200%_auto] animate-shine" style={{ animationDuration: '3s' }}></div>
                          </div>
                          {/* Shortcut creation button removed */}
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
              </AnimatePresence>
              <AnimatePresence>
                {isSubjectPrintMenuOpen && (
                  <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <motion.div
                      {...FAST_BACKDROP_FADE}
                      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                      onClick={() => setIsSubjectPrintMenuOpen(false)}
                    />
                    <motion.div
                      {...FAST_MODAL_FLIP}
                      className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-[460px]"
                    >
                      <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-8px', animationDuration: '15s' }}></div>
                      <div className="bg-white rounded-[22px] p-6 flex flex-col gap-3 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        {(() => {
                          const isHomeschoolResolved = Boolean(
                            (title && (title.includes('منازل') || title.toLowerCase().includes('homeschool'))) ||
                            (typeof window !== 'undefined' && localStorage.getItem('current_system_type') === 'homeschool')
                          );
                          const isMiddleHomeschool = ((stage === 'middle' || stage === 'prep') || Boolean(title && title.includes('المرحلة الإعدادية'))) && isHomeschoolResolved;
                          const { customCols: subjCols, defaultSubjectsOverrides: subjOvr } = getSubjectsConfigForStageGrade(stage, selectedGrade, isHomeschoolResolved);
                          const filteredCols = isMiddleHomeschool
                            ? subjCols.filter((sc: any) => {
                                const override = subjOvr?.[sc.key];
                                const hasExam = override?.hasWrittenExam !== undefined ? override.hasWrittenExam : (sc.hasWrittenExam !== undefined ? sc.hasWrittenExam : true);
                                return hasExam !== false;
                              })
                            : subjCols;
                          const subjGradients = [
                            'bg-[linear-gradient(to_right,#2563eb,#4f46e5,#2563eb)]',
                            'bg-[linear-gradient(to_right,#059669,#10b981,#059669)]',
                            'bg-[linear-gradient(to_right,#d97706,#f59e0b,#d97706)]',
                            'bg-[linear-gradient(to_right,#7c3aed,#9333ea,#7c3aed)]',
                            'bg-[linear-gradient(to_right,#0284c7,#06b6d4,#0284c7)]',
                            'bg-[linear-gradient(to_right,#db2777,#f43f5e,#db2777)]',
                            'bg-[linear-gradient(to_right,#0d9488,#14b8a6,#0d9488)]',
                          ];
                          return filteredCols.map((sc: any, sIdx: number) => {
                            const sLabel = subjOvr?.[sc.key]?.label || sc.label;
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
              </AnimatePresence>
              <AnimatePresence>
                {selectedPrintSubject && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <motion.div
                      {...FAST_BACKDROP_FADE}
                      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                      onClick={() => setSelectedPrintSubject(null)}
                    />
                    <motion.div
                      {...FAST_MODAL_FLIP}
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
              </AnimatePresence>
            </div>
            
            <AnimatePresence>
              {isStatsMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <motion.div
                    {...FAST_BACKDROP_FADE}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    onClick={() => setIsStatsMenuOpen(false)}
                  />
                  <motion.div
                    {...FAST_MODAL_FLIP}
                    className="relative w-full max-w-md rounded-[32px] p-[8px] shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] overflow-hidden flex flex-col"
                  >
                    <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_50%,#ef4444_75%,#000000_100%)] pointer-events-none" />

                    <div className="relative rounded-[24px] flex flex-col w-full h-full overflow-hidden bg-white/90">
                      {/* Animated wavy background */}
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,#dbeafe,#f3e8ff,#fce7f3,#dbeafe)] bg-[length:300%_300%] animate-shine opacity-60" />
                      <div className="absolute inset-0 backdrop-blur-3xl" />

                      <div className="relative p-6 flex flex-col gap-8 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center z-10">
                          <h3 className="text-slate-800 font-bold text-xl flex items-center gap-2">
                            <PieChart className="w-6 h-6 text-emerald-600" strokeWidth={2.5} />
                            {(t as any).statistics}
                          </h3>
                          <button onClick={() => setIsStatsMenuOpen(false)} className="text-slate-500 hover:text-slate-800 bg-white/50 hover:bg-white/80 p-2 rounded-full transition-all">
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="flex flex-col gap-10 pb-4 z-10">
                          {/* Total Header */}
                          <div className="flex items-center justify-center">
                            <div className="bg-[linear-gradient(45deg,#d946ef,#06b6d4,#d946ef)] bg-[length:300%_300%] text-white px-14 py-6 rounded-[20px] shadow-xl flex flex-col items-center gap-1 border-2 border-slate-900" style={{ animation: "shine 12s ease-in-out infinite" }}>
                              <span className="text-sm font-medium text-slate-200">{(t as any).totalStudents}</span>
                              <div className="text-6xl font-black drop-shadow-md">{totalStudents}</div>
                            </div>
                          </div>

                          {/* Gender Chart */}
                          <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-end px-1">
                              <div className="font-bold text-slate-700 flex items-center gap-1.5 text-sm">
                                {(t as any).boys} <span className="text-blue-500 text-xl">{boysCount}</span>
                              </div>
                              <div className="font-bold text-slate-700 flex items-center gap-1.5 text-sm">
                                <span className="text-pink-500 text-xl">{girlsCount}</span> {(t as any).girls}
                              </div>
                            </div>
                            <div className="h-4 w-full bg-slate-200/50 rounded-full flex overflow-hidden shadow-inner">
                              {boysCount > 0 && (
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${(boysCount / totalStudents) * 100}%` }} 
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="h-full bg-blue-500 relative overflow-hidden"
                                >
                                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] bg-[length:200%_100%] animate-shine" />
                                </motion.div>
                              )}
                              {girlsCount > 0 && (
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${(girlsCount / totalStudents) * 100}%` }} 
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className="h-full bg-pink-500 relative overflow-hidden"
                                >
                                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] bg-[length:200%_100%] animate-shine" />
                                </motion.div>
                              )}
                            </div>
                          </div>

                          {/* Religion Chart */}
                          <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-end px-1">
                              <div className="font-bold text-slate-700 flex items-center gap-1.5 text-sm">
                                {t.muslim} <span className="text-emerald-600 text-xl">{muslimsCount}</span>
                              </div>
                              <div className="font-bold text-slate-700 flex items-center gap-1.5 text-sm">
                                <span className="text-amber-500 text-xl">{christiansCount}</span> {t.christian}
                              </div>
                            </div>
                            <div className="h-4 w-full bg-slate-200/50 rounded-full flex overflow-hidden shadow-inner">
                              {muslimsCount > 0 && (
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${(muslimsCount / totalStudents) * 100}%` }} 
                                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                                  className="h-full bg-emerald-500 relative overflow-hidden"
                                >
                                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] bg-[length:200%_100%] animate-shine" />
                                </motion.div>
                              )}
                              {christiansCount > 0 && (
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${(christiansCount / totalStudents) * 100}%` }} 
                                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                                  className="h-full bg-amber-500 relative overflow-hidden"
                                >
                                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] bg-[length:200%_100%] animate-shine" />
                                </motion.div>
                              )}
                            </div>
                          </div>

                          {/* Muslim Boys vs Christian Boys */}
                          <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-end px-1">
                              <div className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                                {(t as any).muslimBoys} <span className="text-blue-600 text-lg">{muslimBoysCount}</span>
                              </div>
                              <div className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                                <span className="text-blue-400 text-lg">{christianBoysCount}</span> {(t as any).christianBoys}
                              </div>
                            </div>
                            <div className="h-3 w-full bg-slate-200/50 rounded-full flex overflow-hidden shadow-inner">
                              {muslimBoysCount > 0 && (
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${(muslimBoysCount / (boysCount || 1)) * 100}%` }} 
                                  transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                                  className="h-full bg-blue-600 relative overflow-hidden"
                                >
                                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] bg-[length:200%_100%] animate-shine" />
                                </motion.div>
                              )}
                              {christianBoysCount > 0 && (
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${(christianBoysCount / (boysCount || 1)) * 100}%` }} 
                                  transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                                  className="h-full bg-blue-400 relative overflow-hidden"
                                >
                                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] bg-[length:200%_100%] animate-shine" />
                                </motion.div>
                              )}
                            </div>
                          </div>

                          {/* Muslim Girls vs Christian Girls */}
                          <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-end px-1">
                              <div className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                                {(t as any).muslimGirls} <span className="text-pink-600 text-lg">{muslimGirlsCount}</span>
                              </div>
                              <div className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                                <span className="text-pink-400 text-lg">{christianGirlsCount}</span> {(t as any).christianGirls}
                              </div>
                            </div>
                            <div className="h-3 w-full bg-slate-200/50 rounded-full flex overflow-hidden shadow-inner">
                              {muslimGirlsCount > 0 && (
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${(muslimGirlsCount / (girlsCount || 1)) * 100}%` }} 
                                  transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                                  className="h-full bg-pink-600 relative overflow-hidden"
                                >
                                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] bg-[length:200%_100%] animate-shine" />
                                </motion.div>
                              )}
                              {christianGirlsCount > 0 && (
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${(christianGirlsCount / (girlsCount || 1)) * 100}%` }} 
                                  transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                                  className="h-full bg-pink-400 relative overflow-hidden"
                                >
                                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] bg-[length:200%_100%] animate-shine" />
                                </motion.div>
                              )}
                            </div>
                          </div>

                          {/* Detailed Stats Buttons - Stacked Vertically with Distinct Colors & Black Borders */}
                          <div className="flex flex-col items-stretch gap-3 mt-4 w-full max-w-[280px] mx-auto">
                            {!isKindergarten && (
                              <button
                                onClick={() => {
                                  setIsStatsMenuOpen(false);
                                  setIsDetailedStatsMenuOpen(true);
                                }}
                                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2.5 shadow-md shadow-blue-500/25 active:scale-95 transition-all text-sm border-2 border-slate-900"
                              >
                                <PieChart className="w-5 h-5 text-blue-200" strokeWidth={2.5} />
                                <span>{(t as any).statusStatistics || (t as any).detailedStatistics}</span>
                              </button>
                            )}
                            {showExemptionStatus && (
                              <button
                                onClick={() => {
                                  setIsStatsMenuOpen(false);
                                  setIsExemptionStatsMenuOpen(true);
                                }}
                                className="w-full bg-gradient-to-r from-sky-600 via-cyan-600 to-sky-700 hover:from-sky-500 hover:via-cyan-500 hover:to-sky-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2.5 shadow-md shadow-sky-500/25 active:scale-95 transition-all text-sm border-2 border-slate-900"
                              >
                                <PieChart className="w-5 h-5 text-sky-200" strokeWidth={2.5} />
                                <span>{(t as any).exemptionStatistics || 'إحصائيات حالة الإعفاء'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setIsStatsMenuOpen(false);
                                setIsEnrollmentTypeStatsMenuOpen(true);
                              }}
                              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2.5 shadow-md shadow-emerald-500/25 active:scale-95 transition-all text-sm border-2 border-slate-900"
                            >
                              <PieChart className="w-5 h-5 text-emerald-200" strokeWidth={2.5} />
                              <span>{(t as any).enrollmentTypeStatistics || 'إحصائيات نوعية القيد'}</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsStatsMenuOpen(false);
                                setIsDamgStatsMenuOpen(true);
                              }}
                              className="w-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-500 hover:via-fuchsia-500 hover:to-purple-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2.5 shadow-md shadow-purple-500/25 active:scale-95 transition-all text-sm border-2 border-slate-900"
                            >
                              <PieChart className="w-5 h-5 text-purple-200" strokeWidth={2.5} />
                              <span>{(t as any).damgStatistics || (isKindergarten ? 'إحصائيات تلاميذ الدمج' : 'إحصائيات طلاب الدمج')}</span>
                            </button>
                            <button
                              onClick={async () => {
                                setIsStatsMenuOpen(false);
                                await executePrintOption('general_statistics');
                              }}
                              className="w-full bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:via-red-500 hover:to-rose-600 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2.5 shadow-md shadow-rose-500/25 active:scale-95 transition-all text-sm border-2 border-slate-900"
                            >
                              <svg className="w-5 h-5 text-rose-100 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <text x="12" y="16.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">PDF</text>
                              </svg>
                              <span>تصدير</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Detailed Stats Modal - حالة القيد */}
            <AnimatePresence>
              {isDetailedStatsMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <motion.div
                    {...FAST_BACKDROP_FADE}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    onClick={() => setIsDetailedStatsMenuOpen(false)}
                  />
                  <motion.div
                    {...FAST_MODAL_FLIP}
                    className="relative w-full max-w-3xl rounded-[32px] p-[8px] shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_50%,#3b82f6_75%,#000000_100%)] pointer-events-none" />
                    <div className="relative rounded-[24px] flex flex-col w-full h-full overflow-hidden bg-white/95 backdrop-blur-3xl">
                      <div className="p-6 flex flex-col gap-6 h-full overflow-hidden">
                        <div className="flex justify-between items-center z-10 shrink-0 border-b-2 border-slate-200 pb-4 gap-2 flex-wrap">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-slate-800 font-bold text-xl flex items-center gap-2">
                              <PieChart className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
                              <span>{(t as any).statusStatistics || (t as any).detailedStatistics}</span>
                            </h3>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 text-slate-800 px-3.5 py-1 rounded-xl text-base font-extrabold shadow-sm flex items-center gap-1.5">
                              <span className="text-blue-900">{(t as any).totalStudents || 'الإجمالي'} =</span>
                              <span className="text-lg font-black text-blue-600">{filteredData.length}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setIsDetailedStatsMenuOpen(false);
                                setIsStatsMenuOpen(true);
                              }}
                              className="text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 p-2 rounded-full transition-all border border-slate-200 hover:border-slate-400 flex items-center justify-center shadow-sm active:scale-95"
                              title={t.back || 'السابق'}
                            >
                              {lang === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                            </button>
                            <button onClick={() => setIsDetailedStatsMenuOpen(false)} className="text-slate-500 hover:text-red-500 bg-slate-100 hover:bg-red-50 p-2 rounded-full transition-all border border-slate-200">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 px-2">
                            {(() => {
                              const officialStatuses = isFirstGrade ? [
                                'باق',
                                'باقية',
                                'مستجد',
                                'مستجدة',
                                'مستجد - دمج',
                                'باق - دمج',
                                'مستجدة - دمج',
                                'باقية - دمج',
                              ] : [
                                'باق',
                                'باقية',
                                'منقول',
                                'منقولة',
                                'منقول - دمج',
                                'باق - دمج',
                                'منقولة - دمج',
                                'باقية - دمج',
                              ];

                              const statusCounts: Record<string, number> = {};
                              officialStatuses.forEach(st => {
                                statusCounts[st] = 0;
                              });

                              filteredData.forEach(student => {
                                const norm = normalizeStatusForGrade(student.enrollmentStatus, isFirstGrade, student.gender);
                                if (statusCounts[norm] !== undefined) {
                                  statusCounts[norm]++;
                                } else {
                                  const fallback = isFirstGrade
                                    ? (student.gender === 'female' ? 'مستجدة' : 'مستجد')
                                    : (student.gender === 'female' ? 'منقولة' : 'منقول');
                                  statusCounts[fallback] = (statusCounts[fallback] || 0) + 1;
                                }
                              });

                              const borderColors: Record<string, string> = {
                                'باق': '#059669',
                                'باقية': '#e11d48',
                                'مستجد': '#2563eb',
                                'منقول': '#2563eb',
                                'مستجدة': '#7c3aed',
                                'منقولة': '#7c3aed',
                                'مستجد - دمج': '#d97706',
                                'منقول - دمج': '#d97706',
                                'باق - دمج': '#0891b2',
                                'مستجدة - دمج': '#c026d3',
                                'منقولة - دمج': '#c026d3',
                                'باقية - دمج': '#16a34a',
                              };

                              const bgGradients: Record<string, string> = {
                                'باق': 'bg-gradient-to-br from-emerald-50 to-teal-50',
                                'باقية': 'bg-gradient-to-br from-rose-50 to-pink-50',
                                'مستجد': 'bg-gradient-to-br from-blue-50 to-indigo-50',
                                'منقول': 'bg-gradient-to-br from-blue-50 to-indigo-50',
                                'مستجدة': 'bg-gradient-to-br from-violet-50 to-purple-50',
                                'منقولة': 'bg-gradient-to-br from-violet-50 to-purple-50',
                                'مستجد - دمج': 'bg-gradient-to-br from-amber-50 to-orange-50',
                                'منقول - دمج': 'bg-gradient-to-br from-amber-50 to-orange-50',
                                'باق - دمج': 'bg-gradient-to-br from-cyan-50 to-sky-50',
                                'مستجدة - دمج': 'bg-gradient-to-br from-fuchsia-50 to-pink-50',
                                'منقولة - دمج': 'bg-gradient-to-br from-fuchsia-50 to-pink-50',
                                'باقية - دمج': 'bg-gradient-to-br from-green-50 to-emerald-50',
                              };

                              // Sort by count descending, while preserving official list order for ties
                              const sortedStatuses = officialStatuses.slice().sort((a, b) => (statusCounts[b] || 0) - (statusCounts[a] || 0));

                              return sortedStatuses.map((status, index) => {
                                const count = statusCounts[status] || 0;
                                const themeColor = borderColors[status] || '#3b82f6';
                                const bgClass = bgGradients[status] || 'bg-gradient-to-br from-blue-50 to-indigo-50';

                                return (
                                  <div 
                                    key={index} 
                                    className={`relative rounded-[17px] p-4 flex flex-col gap-3 h-full z-10 border-2 shadow-sm hover:shadow-md transition-all ${bgClass}`}
                                    style={{ borderColor: themeColor }}
                                  >
                                    <h4 className="font-bold border-b-2 border-slate-900/10 pb-2 text-sm leading-tight transition-colors text-center" style={{ color: themeColor }}>
                                      {status}
                                    </h4>
                                    <div className="flex justify-center items-center bg-white/70 rounded-xl py-3 px-4 border border-white/60 shadow-inner">
                                      <div className="text-2xl font-black text-slate-800 leading-none">{count}</div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Detailed Stats Modal - حالة الإعفاء */}
            <AnimatePresence>
              {isExemptionStatsMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <motion.div
                    {...FAST_BACKDROP_FADE}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    onClick={() => setIsExemptionStatsMenuOpen(false)}
                  />
                  <motion.div
                    {...FAST_MODAL_FLIP}
                    className="relative w-full max-w-3xl rounded-[32px] p-[8px] shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_50%,#0284c7_75%,#000000_100%)] pointer-events-none" />
                    <div className="relative rounded-[24px] flex flex-col w-full h-full overflow-hidden bg-white/95 backdrop-blur-3xl">
                      <div className="p-6 flex flex-col gap-6 h-full overflow-hidden">
                        <div className="flex justify-between items-center z-10 shrink-0 border-b-2 border-slate-200 pb-4 gap-2 flex-wrap">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-slate-800 font-bold text-xl flex items-center gap-2">
                              <PieChart className="w-6 h-6 text-sky-600" strokeWidth={2.5} />
                              <span>{(t as any).exemptionStatistics || 'إحصائيات حالة الإعفاء'}</span>
                            </h3>
                            <div className="bg-gradient-to-r from-sky-50 to-cyan-50 border-2 border-sky-400 text-slate-800 px-3.5 py-1 rounded-xl text-base font-extrabold shadow-sm flex items-center gap-1.5">
                              <span className="text-sky-900">{(t as any).totalStudents || 'الإجمالي'} =</span>
                              <span className="text-lg font-black text-sky-600">{filteredData.length}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setIsExemptionStatsMenuOpen(false);
                                setIsStatsMenuOpen(true);
                              }}
                              className="text-slate-700 hover:text-sky-600 bg-slate-100 hover:bg-sky-50 p-2 rounded-full transition-all border border-slate-200 hover:border-slate-400 flex items-center justify-center shadow-sm active:scale-95"
                              title={t.back || 'السابق'}
                            >
                              {lang === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                            </button>
                            <button onClick={() => setIsExemptionStatsMenuOpen(false)} className="text-slate-500 hover:text-red-500 bg-slate-100 hover:bg-red-50 p-2 rounded-full transition-all border border-slate-200">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 px-2">
                            {[
                              { key: 'كلى', title: 'كلى', themeColor: '#0284c7', bgClass: 'bg-gradient-to-br from-sky-50 to-cyan-50' },
                              { key: 'تدريجى', title: 'تدريجى', themeColor: '#0d9488', bgClass: 'bg-gradient-to-br from-teal-50 to-emerald-50' },
                              { key: '', title: 'غير محدد', themeColor: '#64748b', bgClass: 'bg-gradient-to-br from-slate-50 to-gray-100' },
                            ].map((item) => {
                              const matched = filteredData.filter((st) => {
                                const val = (st.exemptionStatus || '').trim();
                                const normalized = val === 'كلي' ? 'كلى' : val === 'تدريجي' ? 'تدريجى' : val;
                                return item.key === '' ? normalized !== 'كلى' && normalized !== 'تدريجى' : normalized === item.key;
                              });
                              const boys = matched.filter((st) => st.gender === 'male').length;
                              const girls = matched.filter((st) => st.gender === 'female').length;
                              return (
                                <div
                                  key={item.title}
                                  className={`relative rounded-[17px] p-4 flex flex-col gap-3 h-full z-10 border-2 shadow-sm hover:shadow-md transition-all ${item.bgClass}`}
                                  style={{ borderColor: item.themeColor }}
                                >
                                  <h4 className="font-bold border-b-2 border-slate-900/10 pb-2 text-sm leading-tight text-center" style={{ color: item.themeColor }}>
                                    {item.title}
                                  </h4>
                                  <div className="flex justify-between items-center bg-white/60 rounded-xl p-2 border border-white/50 shadow-inner">
                                    <div className="text-center flex-1">
                                      <div className="text-xs text-slate-600 font-bold mb-1">{(t as any).totalStudents}</div>
                                      <div className="text-xl font-black text-slate-800">{matched.length}</div>
                                    </div>
                                    <div className="h-10 w-[2px] bg-slate-900/10 rounded-full" />
                                    <div className="text-center flex-1">
                                      <div className="text-xs text-blue-600 font-bold mb-1">{(t as any).boys}</div>
                                      <div className="text-lg font-bold text-blue-700">{boys}</div>
                                    </div>
                                    <div className="h-10 w-[2px] bg-slate-900/10 rounded-full" />
                                    <div className="text-center flex-1">
                                      <div className="text-xs text-pink-600 font-bold mb-1">{(t as any).girls}</div>
                                      <div className="text-lg font-bold text-pink-700">{girls}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Detailed Stats Modal - نوعية القيد */}
            <AnimatePresence>
              {isEnrollmentTypeStatsMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <motion.div
                    {...FAST_BACKDROP_FADE}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    onClick={() => setIsEnrollmentTypeStatsMenuOpen(false)}
                  />
                  <motion.div
                    {...FAST_MODAL_FLIP}
                    className="relative w-full max-w-3xl rounded-[32px] p-[8px] shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_50%,#10b981_75%,#000000_100%)] pointer-events-none" />
                    <div className="relative rounded-[24px] flex flex-col w-full h-full overflow-hidden bg-white/95 backdrop-blur-3xl">
                      <div className="p-6 flex flex-col gap-6 h-full overflow-hidden">
                        <div className="flex justify-between items-center z-10 shrink-0 border-b-2 border-slate-200 pb-4 gap-2 flex-wrap">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-slate-800 font-bold text-xl flex items-center gap-2">
                              <PieChart className="w-6 h-6 text-emerald-600" strokeWidth={2.5} />
                              <span>{(t as any).enrollmentTypeStatistics || 'إحصائيات نوعية القيد'}</span>
                            </h3>
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-400 text-slate-800 px-3.5 py-1 rounded-xl text-base font-extrabold shadow-sm flex items-center gap-1.5">
                              <span className="text-emerald-950">{(t as any).totalStudents || 'الإجمالي'} =</span>
                              <span className="text-lg font-black text-emerald-600">{filteredData.length}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setIsEnrollmentTypeStatsMenuOpen(false);
                                setIsStatsMenuOpen(true);
                              }}
                              className="text-slate-700 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 p-2 rounded-full transition-all border border-slate-200 hover:border-slate-400 flex items-center justify-center shadow-sm active:scale-95"
                              title={t.back || 'السابق'}
                            >
                              {lang === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                            </button>
                            <button onClick={() => setIsEnrollmentTypeStatsMenuOpen(false)} className="text-slate-500 hover:text-red-500 bg-slate-100 hover:bg-red-50 p-2 rounded-full transition-all border border-slate-200">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 px-2">
                            {Object.entries(
                              filteredData.reduce((acc, student) => {
                                const type = student.enrollmentType === 'تحويل من مدرسة أخرى' ? 'تحويلات' : (student.enrollmentType === 'قيد عادي' ? 'قيد عادى' : (student.enrollmentType || 'قيد عادى'));
                                if (!acc[type]) {
                                  acc[type] = { total: 0, boys: 0, girls: 0 };
                                }
                                acc[type].total++;
                                if (student.gender === 'male') acc[type].boys++;
                                if (student.gender === 'female') acc[type].girls++;
                                return acc;
                              }, {} as Record<string, { total: number; boys: number; girls: number }>)
                            ).sort((a, b) => (b[1] as any).total - (a[1] as any).total).map(([type, counts], index) => {
                              const borderColors = [
                                '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'
                              ];
                              const bgGradients = [
                                'bg-gradient-to-br from-emerald-50 to-teal-50',
                                'bg-gradient-to-br from-cyan-50 to-sky-50',
                                'bg-gradient-to-br from-blue-50 to-indigo-50',
                                'bg-gradient-to-br from-violet-50 to-purple-50',
                                'bg-gradient-to-br from-amber-50 to-orange-50',
                                'bg-gradient-to-br from-red-50 to-rose-50',
                                'bg-gradient-to-br from-pink-50 to-fuchsia-50'
                              ];
                              const themeColor = borderColors[index % borderColors.length];
                              const bgClass = bgGradients[index % bgGradients.length];
                              return (
                              <div 
                                key={index} 
                                className={`relative rounded-[17px] p-4 flex flex-col gap-3 h-full z-10 border-2 shadow-sm hover:shadow-md transition-all ${bgClass}`}
                                style={{ borderColor: themeColor }}
                              >
                                  <h4 className="font-bold border-b-2 border-slate-900/10 pb-2 text-sm leading-tight transition-colors" style={{ color: themeColor }}>{type}</h4>
                                  <div className="flex justify-between items-center bg-white/60 rounded-xl p-2 border border-white/50 shadow-inner">
                                    <div className="text-center flex-1">
                                      <div className="text-xs text-slate-600 font-bold mb-1">{(t as any).totalStudents}</div>
                                      <div className="text-xl font-black text-slate-800">{(counts as any).total}</div>
                                    </div>
                                    <div className="h-10 w-[2px] bg-slate-900/10 rounded-full" />
                                    <div className="text-center flex-1">
                                      <div className="text-xs text-blue-600 font-bold mb-1">{(t as any).boys}</div>
                                      <div className="text-lg font-bold text-blue-700">{(counts as any).boys}</div>
                                    </div>
                                    <div className="h-10 w-[2px] bg-slate-900/10 rounded-full" />
                                    <div className="text-center flex-1">
                                      <div className="text-xs text-pink-600 font-bold mb-1">{(t as any).girls}</div>
                                      <div className="text-lg font-bold text-pink-700">{(counts as any).girls}</div>
                                    </div>
                                  </div>
                                </div>
                            )})}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Detailed Stats Modal - إحصائيات طلاب الدمج */}
            <AnimatePresence>
              {isDamgStatsMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <motion.div
                    {...FAST_BACKDROP_FADE}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    onClick={() => setIsDamgStatsMenuOpen(false)}
                  />
                  <motion.div
                    {...FAST_MODAL_FLIP}
                    className="relative w-full max-w-3xl rounded-[32px] p-[8px] shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_50%,#a855f7_75%,#000000_100%)] pointer-events-none" />
                    <div className="relative rounded-[24px] flex flex-col w-full h-full overflow-hidden bg-white/95 backdrop-blur-3xl">
                      <div className="p-6 flex flex-col gap-6 h-full overflow-hidden">
                        <div className="flex justify-between items-center z-10 shrink-0 border-b-2 border-slate-200 pb-4 gap-2 flex-wrap">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-slate-800 font-bold text-xl flex items-center gap-2">
                              <PieChart className="w-6 h-6 text-purple-600" strokeWidth={2.5} />
                              <span>{(t as any).damgStatistics || (isKindergarten ? 'إحصائيات تلاميذ الدمج' : 'إحصائيات طلاب الدمج')}</span>
                            </h3>
                            <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border-2 border-purple-400 text-slate-800 px-3.5 py-1 rounded-xl text-base font-extrabold shadow-sm flex items-center gap-1.5">
                              <span className="text-purple-950">{isKindergarten ? 'اجمالى عدد تلاميذ الدمج =' : 'اجمالى عدد طلاب الدمج ='}</span>
                              <span className="text-lg font-black text-purple-600">
                                {(() => {
                                  const damgStudents = filteredData.filter(s => {
                                    const status = (s.enrollmentStatus || '').trim();
                                    const norm = normalizeStatusForGrade(status, isFirstGrade, s.gender);
                                    return status.includes('دمج') || norm.includes('دمج') || s.enrollmentType?.includes('دمج');
                                  });
                                  return damgStudents.length;
                                })()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setIsDamgStatsMenuOpen(false);
                                setIsStatsMenuOpen(true);
                              }}
                              className="text-slate-700 hover:text-purple-600 bg-slate-100 hover:bg-purple-50 p-2 rounded-full transition-all border border-slate-200 hover:border-slate-400 flex items-center justify-center shadow-sm active:scale-95"
                              title={t.back || 'السابق'}
                            >
                              {lang === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                            </button>
                            <button onClick={() => setIsDamgStatsMenuOpen(false)} className="text-slate-500 hover:text-red-500 bg-slate-100 hover:bg-red-50 p-2 rounded-full transition-all border border-slate-200">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
                          {(() => {
                            const isMuslimReligion = (r?: string) => {
                              if (!r) return false;
                              const clean = r.trim().toLowerCase();
                              return clean.includes('ل') || clean === 'muslim' || clean.includes('مسلم');
                            };

                            const isChristianReligion = (r?: string) => {
                              if (!r) return false;
                              const clean = r.trim().toLowerCase();
                              return clean.includes('ح') || clean === 'christian' || clean.includes('مسيح');
                            };

                            const damgStudents = filteredData.filter(s => {
                              const status = (s.enrollmentStatus || '').trim();
                              const norm = normalizeStatusForGrade(status, isFirstGrade, s.gender);
                              return status.includes('دمج') || norm.includes('دمج') || s.enrollmentType?.includes('دمج');
                            });

                            const totalDamg = damgStudents.length;
                            const boysDamg = damgStudents.filter(s => s.gender === 'male').length;
                            const girlsDamg = damgStudents.filter(s => s.gender === 'female').length;

                            const muslimDamg = damgStudents.filter(s => isMuslimReligion(s.religion)).length;
                            const christianDamg = damgStudents.filter(s => isChristianReligion(s.religion)).length;

                            const newDamgLabel = isFirstGrade ? 'مستجد ( دمج )' : 'منقول ( دمج )';
                            const newDamg = damgStudents.filter(s => {
                              const norm = normalizeStatusForGrade(s.enrollmentStatus, isFirstGrade, s.gender);
                              return norm.includes('مستجد') || norm.includes('منقول');
                            }).length;

                            const remainingDamgLabel = 'باق ( دمج )';
                            const remainingDamg = damgStudents.filter(s => {
                              const norm = normalizeStatusForGrade(s.enrollmentStatus, isFirstGrade, s.gender);
                              return norm.includes('باق');
                            }).length;

                            const cards = [
                              {
                                title: 'بنين',
                                count: boysDamg,
                                borderColor: '#2563eb',
                                bgClass: 'bg-gradient-to-br from-blue-50 to-indigo-50',
                              },
                              {
                                title: 'بنات',
                                count: girlsDamg,
                                borderColor: '#e11d48',
                                bgClass: 'bg-gradient-to-br from-rose-50 to-pink-50',
                              },
                              {
                                title: 'مسلم ( دمج )',
                                count: muslimDamg,
                                borderColor: '#059669',
                                bgClass: 'bg-gradient-to-br from-emerald-50 to-teal-50',
                              },
                              {
                                title: 'مسيحى ( دمج )',
                                count: christianDamg,
                                borderColor: '#0284c7',
                                bgClass: 'bg-gradient-to-br from-cyan-50 to-sky-50',
                              },
                              {
                                title: newDamgLabel,
                                count: newDamg,
                                borderColor: '#d97706',
                                bgClass: 'bg-gradient-to-br from-amber-50 to-orange-50',
                              },
                              {
                                title: remainingDamgLabel,
                                count: remainingDamg,
                                borderColor: '#7c3aed',
                                bgClass: 'bg-gradient-to-br from-violet-50 to-purple-50',
                              },
                            ];

                            return (
                              <div className="flex flex-col gap-4 pb-4 px-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {cards.map((card, idx) => (
                                    <div
                                      key={idx}
                                      className={`relative rounded-[17px] p-4 flex flex-col gap-3 h-full z-10 border-2 shadow-sm hover:shadow-md transition-all ${card.bgClass}`}
                                      style={{ borderColor: card.borderColor }}
                                    >
                                      <h4
                                        className="font-bold border-b-2 border-slate-900/10 pb-2 text-sm leading-tight transition-colors text-center"
                                        style={{ color: card.borderColor }}
                                      >
                                        {card.title}
                                      </h4>
                                      <div className="flex justify-center items-center bg-white/70 rounded-xl py-3 px-4 border border-white/60 shadow-inner">
                                        <div className="text-2xl font-black text-slate-800 leading-none">
                                          {card.count}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {isSortMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <motion.div
                    {...FAST_BACKDROP_FADE}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={() => setIsSortMenuOpen(false)}
                  />
                  <motion.div
                    {...FAST_MODAL_FLIP}
                    className="relative w-full max-w-xs rounded-3xl overflow-hidden p-1.5 shadow-[0_0_40px_-10px_rgba(0,0,0,0.3)] flex flex-col"
                  >
                    {/* Moving Light Border */}
                    <div className="absolute inset-[-100%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_50%,rgba(99,102,241,1)_100%)] pointer-events-none" />
                    
                    <div className="relative bg-white/95 backdrop-blur-xl rounded-[20px] flex flex-col w-full h-full overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex justify-between items-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30"></div>
                        <h3 className="text-white font-bold text-lg relative z-10 flex items-center gap-2">
                          <ArrowDownUp className="w-5 h-5 text-blue-200" />
                          {t.sortBy}
                        </h3>
                        <button onClick={() => setIsSortMenuOpen(false)} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all relative z-10">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4 flex flex-col gap-3">
                        {[
                          { id: 'default', label: t.defaultSort, color: 'from-blue-500 to-indigo-500', active: 'from-blue-400 via-indigo-500 to-blue-600', shadow: 'shadow-blue-500/30' },
                          { id: 'alphabetical', label: t.sortAlphabetical, color: 'from-emerald-500 to-teal-500', active: 'from-emerald-400 via-teal-500 to-emerald-600', shadow: 'shadow-emerald-500/30' },
                          { id: 'gender', label: t.sortGender, color: 'from-rose-500 to-pink-500', active: 'from-rose-400 via-pink-500 to-rose-600', shadow: 'shadow-rose-500/30' },
                          ...(isKindergarten ? [
                            { id: 'studentStatus', label: isKindergarten ? 'حالة التلميذ' : 'حالة الطالب', color: 'from-amber-500 to-orange-500', active: 'from-amber-400 via-orange-500 to-amber-600', shadow: 'shadow-amber-500/30' }
                          ] : [
                            { id: 'status', label: t.sortStatus, color: 'from-amber-500 to-orange-500', active: 'from-amber-400 via-orange-500 to-amber-600', shadow: 'shadow-amber-500/30' },
                            ...(showExemptionStatus ? [
                              { id: 'exemptionStatus', label: (t as any).sortExemptionStatus || 'حالة الإعفاء', color: 'from-sky-500 to-cyan-500', active: 'from-sky-400 via-cyan-500 to-sky-600', shadow: 'shadow-sky-500/30' }
                            ] : [])
                          ]),
                          { id: 'enrollmentType', label: (t as any).sortEnrollmentType || (t as any).enrollmentType || 'نوعية القيد', color: 'from-teal-500 to-emerald-500', active: 'from-teal-400 via-emerald-500 to-teal-600', shadow: 'shadow-teal-500/30' },
                          { id: 'religion', label: t.sortReligion, color: 'from-purple-500 to-fuchsia-500', active: 'from-purple-400 via-fuchsia-500 to-purple-600', shadow: 'shadow-purple-500/30' },
                          ...(showExamFields ? [
                            { id: 'seatNumber', label: (t as any).seatNumber, color: 'from-cyan-500 to-blue-500', active: 'from-cyan-400 via-blue-500 to-cyan-600', shadow: 'shadow-cyan-500/30' },
                            { id: 'secretNumber', label: (t as any).secretNumber, color: 'from-sky-500 to-indigo-500', active: 'from-sky-400 via-indigo-500 to-sky-600', shadow: 'shadow-sky-500/30' }
                          ] : []),
                          { id: 'studentClass', label: (t as any).sortClass || 'الفصل', color: 'from-orange-500 to-amber-500', active: 'from-orange-400 via-amber-500 to-orange-600', shadow: 'shadow-orange-500/30' }
                        ].map(opt => {
                          const existingSort = sortBy.find(s => s.id === opt.id || (opt.id === 'alphabetical' && s.id === 'name') || (opt.id === 'name' && s.id === 'alphabetical'));
                          const isSelected = (opt.id === 'default' && sortBy.length === 0) || !!existingSort;
                          const sortIndex = sortBy.findIndex(s => s.id === opt.id || (opt.id === 'alphabetical' && s.id === 'name') || (opt.id === 'name' && s.id === 'alphabetical'));
                          return (
                          <motion.div
                            key={opt.id}
                            whileHover={{ scale: 1.02 }}
                            className={`relative rounded-2xl overflow-hidden ${isSelected ? `p-[2px] ${opt.shadow} shadow-lg` : 'border-2 border-slate-900 opacity-80 hover:opacity-100'}`}
                          >
                            {isSelected && (
                              <div className="absolute inset-[-100%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_40%,#3b82f6_60%,#d946ef_80%,#06b6d4_100%)] pointer-events-none" />
                            )}
                            <motion.button
                              onClick={() => { 
                                if (opt.id === 'default') {
                                  setSortBy([]);
                                  setIsSortMenuOpen(false);
                                } else {
                                  const matchId = existingSort ? existingSort.id : opt.id;
                                  if (existingSort) {
                                    if (existingSort.direction === 'asc') {
                                      setSortBy(sortBy.map(s => s.id === matchId ? { ...s, direction: 'desc' } : s));
                                    } else {
                                      setSortBy(sortBy.filter(s => s.id !== matchId));
                                    }
                                  } else {
                                    setSortBy([...sortBy, { id: opt.id, direction: 'asc' }]);
                                  }
                                }
                              }}
                              className={`relative w-full flex items-center justify-between px-5 py-3.5 text-base font-bold text-white bg-gradient-to-r rounded-[14px] ${isSelected ? opt.active : opt.color}`}
                              animate={isSelected ? { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] } : {}}
                              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                              style={isSelected ? { backgroundSize: "200% 200%" } : {}}
                            >
                              <div className="w-6 flex justify-start items-center">
                                {existingSort && (
                                  existingSort.direction === 'desc' ? <ArrowDown className="w-4 h-4 text-white/90" /> : <ArrowUp className="w-4 h-4 text-white/90" />
                                )}
                              </div>
                              <span className="flex-1 text-center">{opt.label}</span>
                              <div className="w-6 flex justify-end items-center">
                                {isSelected && (
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                    <div className="bg-white text-slate-900 w-6 h-6 flex items-center justify-center rounded-full font-black text-xs shadow-sm">
                                      {opt.id === 'default' ? <Check className="w-3 h-3" /> : sortIndex + 1}
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            </motion.button>
                          </motion.div>
                        )})}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setIsColorModalOpen(true)}
              className="order-6 flex items-center justify-center bg-[linear-gradient(to_right,#ec4899,#8b5cf6,#3b82f6,#10b981,#f59e0b,#ec4899)] bg-[length:200%_auto] animate-shine text-white w-10 h-10 sm:w-[50px] sm:h-[50px] rounded-full transition-all active:scale-[0.98] border border-slate-900 shadow-sm shrink-0"
              title="ألوان جداول التحرير والرصد"
            >
              <Palette className="w-full h-full p-2 sm:p-2.5" />
            </button>

            <button
              type="button"
              onClick={() => setShowInstructions(true)}
              className="order-7 flex items-center justify-center bg-[linear-gradient(to_right,#fef08a,#facc15,#eab308,#facc15,#fef08a)] bg-[length:200%_auto] animate-shine text-yellow-950 w-10 h-10 sm:w-[50px] sm:h-[50px] rounded-full transition-all active:scale-[0.98] border border-slate-900 shadow-sm shrink-0"
              title={(t as any).instructionsLabel || (lang === 'ar' ? 'تعليمات' : 'Instructions')}
            >
              <Info className="w-full h-full p-1.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="p-[2px] rounded-xl bg-[linear-gradient(90deg,#0f172a_40%,#ffffff_50%,#0f172a_60%)] bg-[length:200%_auto] animate-shine shadow-sm w-full relative flex-1 min-h-0 flex flex-col">
          
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
          <div className="overflow-auto w-full flex-1 min-h-[150px] bg-white rounded-[10px]">
            <table className={`w-full text-center text-slate-900 border-collapse ${showExamFields ? 'min-w-[1200px]' : (isKindergarten ? 'min-w-[650px]' : 'min-w-[800px]')}`}>
            <thead className="sticky top-0 z-[60] shadow-[0_2px_10px_rgba(0,0,0,0.15)] bg-white">
              <tr className="bg-[linear-gradient(to_right,rgba(251,113,133,0.7),#c0c0c0,rgba(34,211,238,0.7),#c0c0c0,rgba(251,191,36,0.7),#c0c0c0,rgba(251,113,133,0.7))] bg-[length:200%_auto] animate-shine text-slate-900 text-lg font-bold whitespace-nowrap border-b border-slate-900">
                <th className="py-[18px] px-3 border-2 border-slate-900 bg-slate-200 sticky start-0 z-50 min-w-[64px] max-w-[64px] w-[64px] relative overflow-visible sticky-cell-border sticky-col">
                  {t.serial}
                  <div className="separator-line"></div>
                </th>
                <th className={`py-[18px] px-3 border-2 border-slate-900 bg-slate-200 sticky start-[64px] z-[49] relative overflow-visible sticky-cell-border sticky-col shadow-[-6px_0_12px_rgba(0,0,0,0.15)] rtl:shadow-[-6px_0_12px_rgba(0,0,0,0.15)] ltr:shadow-[6px_0_12px_rgba(0,0,0,0.15)] ${showExamFields ? 'min-w-[380px] max-w-[380px] w-[380px]' : 'min-w-[400px] max-w-[400px] w-[400px]'}`}>
                  {isKindergarten ? 'اسم التلميذ' : t.studentName}
                  <div className="separator-line"></div>
                </th>
                <th className={`py-[18px] px-3 border-2 border-slate-900 bg-transparent ${showExamFields ? 'min-w-[210px] max-w-[210px] w-[210px]' : 'w-48'}`}>{t.nationalId}</th>
                <th className="py-[18px] px-3 w-32 border-2 border-slate-900 bg-transparent">{t.gender}</th>
                {isKindergarten ? (
                  <th className="py-[18px] px-3 w-36 border-2 border-slate-900 bg-transparent whitespace-nowrap">حالة التلميذ</th>
                ) : (
                  <th className="py-[18px] px-3 min-w-[175px] max-w-[175px] w-[175px] border-2 border-slate-900 bg-transparent">{t.enrollmentStatus}</th>
                )}
                {showExemptionStatus && (
                  <th className="py-[18px] px-3 w-36 border-2 border-slate-900 bg-transparent whitespace-nowrap">{(t as any).exemptionStatus || 'حالة الإعفاء'}</th>
                )}
                <th className="py-[18px] px-3 w-44 border-2 border-slate-900 bg-transparent">{(t as any).enrollmentType || 'نوعية القيد'}</th>
                <th className={`py-[18px] px-3 border-2 border-slate-900 bg-transparent ${showExamFields ? 'min-w-[130px] max-w-[130px] w-[130px]' : 'w-32'}`}>{t.religion}</th>
                <th
                  style={{ minWidth: `${classColWidth}px`, width: `${classColWidth}px` }}
                  className="py-[18px] px-3 border-2 border-slate-900 bg-transparent whitespace-nowrap"
                >
                  الفصل
                </th>
                {showExamFields && (
                  <>
                    <th className="py-[18px] px-3 w-32 border-2 border-slate-900 bg-transparent">{(t as any).seatNumber}</th>
                    <th className="py-[18px] px-3 w-32 border-2 border-slate-900 bg-transparent">{(t as any).secretNumber}</th>
                  </>
                )}
                {!isKindergarten && (
                  <th className="py-[18px] px-3 w-32 border-2 border-slate-900 bg-transparent">{(t as any).committeeNumber || 'رقم اللجنة'}</th>
                )}
                <th className="py-[18px] px-3 w-16 border-2 border-slate-900 bg-transparent"></th>
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
              {filteredData.map((student, idx) => {
                const isMissingData = !student.name?.trim() || !student.nationalId || student.nationalId.length !== 14 || !student.gender?.trim() || (!isKindergarten && !student.enrollmentStatus?.trim()) || !student.enrollmentType?.trim() || !student.religion?.trim() || !student.studentClass?.trim() || (showExamFields && !isKindergarten && !student.seatNumbers?.[semester] && !student.seatNumber) || (showExamFields && !isKindergarten && !student.secretNumbers?.[semester] && !student.secretNumber) || (!isKindergarten && !(student.committeeNumbers?.[semester] || student.committeeNumber)?.trim());
                const rowColorStyle = getTableRowColorStyle(editingRowTheme, idx % 2 !== 0);
                const isAuditHighlighted = highlightedStudentId === student.id;
                return (
                <tr key={student.id} data-audit-student-id={student.id} className={`transition-colors font-bold group/row ${isAuditHighlighted ? 'audit-row-glow' : `hover:!bg-blue-100 focus-within:!bg-blue-100 ${rowColorStyle.bgClass}`}`}>
                  <td className="p-2 border-2 border-slate-900 text-slate-600 relative overflow-visible min-w-[64px] max-w-[64px] w-[64px] sticky start-0 z-30 bg-inherit sticky-cell-border sticky-col" title={isMissingData ? (t as any).missingData : undefined}>
                    {isMissingData && (
                      <div className="absolute inset-0 bg-red-500/10 shadow-[inset_0_0_20px_rgba(239,68,68,0.7)] animate-pulse pointer-events-none z-0"></div>
                    )}
                    <div className="separator-line"></div>
                    <span className="relative z-10 text-lg">{formatNumberDigits(idx + 1, numberLang)}</span>
                  </td>
                  <td
                    data-audit-name-cell={student.id}
                    className={`p-0 border-2 border-slate-900 sticky start-[64px] z-[29] bg-inherit relative overflow-visible sticky-cell-border sticky-col shadow-[-6px_0_12px_rgba(0,0,0,0.08)] rtl:shadow-[-6px_0_12px_rgba(0,0,0,0.08)] ltr:shadow-[6px_0_12px_rgba(0,0,0,0.08)] focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-30 focus-within:bg-blue-50/60 ${showExamFields ? 'min-w-[380px] max-w-[380px] w-[380px]' : 'min-w-[400px] max-w-[400px] w-[400px]'}`}
                  >
                    <div className="separator-line"></div>
                    <input 
                      id={`cell-${idx}-0`}
                      type="text" 
                      value={student.name}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 40 && !val.endsWith('  ')) {
                           val = val.substring(0, 40) + '  ';
                        }
                        handleChange(student.id, 'name', val);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, idx, 0)}
                      onFocus={(e) => {
                        e.target.select();
                        ensureCellVisible(e.target);
                      }}
                      onPaste={(e) => handlePaste(e, student.id, "name", idx, 0)}
                      className="w-full h-full bg-transparent border-none pl-[54px] pr-3 py-3 text-center text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 relative z-10"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStudentState({ student, rowNumber: idx + 1 });
                      }}
                      title={isKindergarten ? 'تعديل بيانات التلميذ' : 'تعديل بيانات الطالب'}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-[39px] h-[39px] rounded-lg border border-slate-900 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white flex items-center justify-center transition-all shadow-sm active:scale-95"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  </td>
                  <td className={`p-0 border-2 border-slate-900 relative group/cell focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60 ${showExamFields ? 'min-w-[210px] max-w-[210px] w-[210px]' : 'min-w-[192px] max-w-[192px] w-[192px]'}`}>
                    <input 
                      id={`cell-${idx}-1`}
                      type="text" 
                      maxLength={14}
                      value={formatNumberDigits(student.nationalId, numberLang)}
                      onChange={(e) => {
                        const val = formatNumberDigits(e.target.value, 'en').replace(/\D/g, '');
                        handleChange(student.id, 'nationalId', val);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                      onFocus={(e) => {
                        e.target.select();
                        ensureCellVisible(e.target);
                      }}
                      onPaste={(e) => handlePaste(e, student.id, "nationalId", idx, 1)}
                      className={`w-full h-full bg-transparent border-none px-3 py-3 text-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset font-mono transition-all duration-300 ${student.nationalId && student.nationalId.length !== 14 ? 'text-red-950 focus:ring-red-500 bg-[linear-gradient(to_right,#fecaca,#f87171,#fecaca)] bg-[length:200%_auto] animate-shine' : 'text-slate-800 focus:ring-blue-500'}`}
                      dir="ltr"
                    />
                    {student.nationalId && student.nationalId.length !== 14 && (
                      <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity duration-300 absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 pointer-events-none">
                        <div className="p-[2px] rounded shadow-lg bg-[linear-gradient(90deg,#1e293b_40%,#ffffff_50%,#1e293b_60%)] bg-[length:200%_auto] animate-shine">
                          <div className="bg-slate-800 text-white text-[14px] font-bold px-3 py-1.5 rounded-[2px] whitespace-nowrap">
                            {(t as any).invalidNationalId}
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-0 border-2 border-slate-900 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60">
                    <select 
                      id={`cell-${idx}-2`}
                      value={student.gender}
                      onChange={(e) => handleChange(student.id, 'gender', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                      onFocus={(e) => ensureCellVisible(e.target)}
                      onPaste={(e) => handlePaste(e, student.id, "gender", idx, 2)}
                      className="w-full h-full bg-transparent border-none px-3 py-3 text-center text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 appearance-none"
                      style={{ textAlignLast: 'center' }}
                    >
                      <option value=""></option>
                      <option value="male">{t.male}</option>
                      <option value="female">{t.female}</option>
                    </select>
                  </td>
                  {isKindergarten ? (
                    <td className="p-0 border-2 border-slate-900 w-36 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60">
                      <select 
                        id={`cell-${idx}-3`}
                        value={student.studentStatus === 'دمج' ? 'دمج' : 'عادى'}
                        onChange={(e) => handleChange(student.id, 'studentStatus', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                        onFocus={(e) => ensureCellVisible(e.target)}
                        onPaste={(e) => handlePaste(e, student.id, "studentStatus", idx, 3)}
                        className="w-full h-full bg-transparent border-none px-3 py-3 text-center font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 appearance-none"
                        style={{ textAlignLast: 'center' }}
                      >
                        <option value="عادى" className="text-center">عادى</option>
                        <option value="دمج" className="text-center">دمج</option>
                      </select>
                    </td>
                  ) : (
                    <td className="p-0 border-2 border-slate-900 relative group/status min-w-[175px] max-w-[175px] w-[175px] focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60">
                      <select 
                        id={`cell-${idx}-3`}
                        value={normalizeStatusForGrade(student.enrollmentStatus, isFirstGrade, student.gender)}
                        onChange={(e) => handleChange(student.id, 'enrollmentStatus', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                        onFocus={(e) => ensureCellVisible(e.target)}
                        onPaste={(e) => handlePaste(e, student.id, "enrollmentStatus", idx, 3)}
                        className="w-full h-full bg-transparent border-none px-2 py-3 text-center text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 appearance-none text-ellipsis overflow-hidden whitespace-nowrap"
                        style={{ textAlignLast: 'center' }}
                      >
                        <option value="" className="text-center"></option>
                        {[1, 2, 3, 4].map(key => {
                          let val = '';
                          if (!isFirstGrade && key === 1) {
                             val = student.gender === 'female' ? ((t as any).status_1_transferred_F || 'منقولة') : ((t as any).status_1_transferred_M || 'منقول');
                          } else if (!isFirstGrade && key === 3) {
                             val = student.gender === 'female' ? ((t as any).status_3_transferred_F || 'منقولة - دمج') : ((t as any).status_3_transferred_M || 'منقول - دمج');
                          } else {
                             val = student.gender === 'female' ? (t as any)[`status_${key}_F`] : (t as any)[`status_${key}_M`];
                          }
                          return <option key={key} value={val} className="text-center" style={{ textAlign: 'center' }}>{val}</option>;
                        })}
                      </select>
                      {student.enrollmentStatus && (
                        <div className="opacity-0 group-hover/status:opacity-100 transition-opacity duration-300 absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 pointer-events-none">
                          <div className="p-[2px] rounded shadow-lg bg-[linear-gradient(90deg,#1e293b_40%,#ffffff_50%,#1e293b_60%)] bg-[length:200%_auto] animate-shine">
                            <div className="bg-slate-800 text-white text-[14px] font-bold px-3 py-1.5 rounded-[2px] whitespace-nowrap">
                              {normalizeStatusForGrade(student.enrollmentStatus, isFirstGrade, student.gender)}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  )}
                  {showExemptionStatus && (
                    <td className="p-0 border-2 border-slate-900 relative group/exemption w-36 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60">
                      <select
                        id={`cell-${idx}-4`}
                        value={student.exemptionStatus === 'كلي' ? 'كلى' : (student.exemptionStatus === 'تدريجي' ? 'تدريجى' : (student.exemptionStatus || ''))}
                        onChange={(e) => handleChange(student.id, 'exemptionStatus', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, 4)}
                        onFocus={(e) => ensureCellVisible(e.target)}
                        onPaste={(e) => handlePaste(e, student.id, 'exemptionStatus', idx, 4)}
                        className="w-full h-full bg-transparent border-none px-3 py-3 text-center text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 appearance-none"
                        style={{ textAlignLast: 'center' }}
                      >
                        <option value="" className="text-center"></option>
                        <option value="كلى" className="text-center">كلى</option>
                        <option value="تدريجى" className="text-center">تدريجى</option>
                      </select>
                    </td>
                  )}
                  <td className="p-0 border-2 border-slate-900 relative group/enrollmentType min-w-[160px] max-w-[160px] w-[160px] focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60">
                    <select 
                      id={`cell-${idx}-${4 + colOffset}`}
                      value={student.enrollmentType === 'تحويل من مدرسة أخرى' ? 'تحويلات' : (student.enrollmentType === 'قيد عادي' ? 'قيد عادى' : (student.enrollmentType || ''))}
                      onChange={(e) => handleChange(student.id, 'enrollmentType', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 4 + colOffset)}
                      onFocus={(e) => ensureCellVisible(e.target)}
                      onPaste={(e) => handlePaste(e, student.id, "enrollmentType", idx, 4 + colOffset)}
                      className="w-full h-full bg-transparent border-none px-3 py-3 text-center text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 appearance-none text-ellipsis overflow-hidden whitespace-nowrap"
                      style={{ textAlignLast: 'center' }}
                    >
                      <option value="" className="text-center"></option>
                      <option value="قيد عادى" className="text-center" style={{ textAlign: 'center' }}>
                        {(t as any).enrollmentTypeRegular || 'قيد عادى'}
                      </option>
                      <option value="تحويلات" className="text-center" style={{ textAlign: 'center' }}>
                        {(t as any).enrollmentTypeTransfer || 'تحويلات'}
                      </option>
                      <option value="وافدين" className="text-center" style={{ textAlign: 'center' }}>
                        {(t as any).enrollmentTypeExpatriate || 'وافدين'}
                      </option>
                      <option value="عائدين من الخارج" className="text-center" style={{ textAlign: 'center' }}>
                        {(t as any).enrollmentTypeReturnee || 'عائدين من الخارج'}
                      </option>
                    </select>
                    {student.enrollmentType && (
                      <div className="opacity-0 group-hover/enrollmentType:opacity-100 transition-opacity duration-300 absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 pointer-events-none">
                        <div className="p-[2px] rounded shadow-lg bg-[linear-gradient(90deg,#1e293b_40%,#ffffff_50%,#1e293b_60%)] bg-[length:200%_auto] animate-shine">
                          <div className="bg-slate-800 text-white text-[14px] font-bold px-3 py-1.5 rounded-[2px] whitespace-nowrap">
                            {student.enrollmentType === 'تحويل من مدرسة أخرى' ? 'تحويلات' : (student.enrollmentType === 'قيد عادي' ? 'قيد عادى' : student.enrollmentType)}
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className={`p-0 border-2 border-slate-900 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60 ${showExamFields ? 'min-w-[130px] max-w-[130px] w-[130px]' : ''}`}>
                    <select 
                      id={`cell-${idx}-${5 + colOffset}`}
                      value={student.religion === 'muslim' || (student.religion || '').includes('ل') ? 'muslim' : (student.religion === 'christian' || (student.religion || '').includes('ح') ? 'christian' : '')}
                      onChange={(e) => handleChange(student.id, 'religion', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 5 + colOffset)}
                      onFocus={(e) => ensureCellVisible(e.target)}
                      onPaste={(e) => handlePaste(e, student.id, "religion", idx, 5 + colOffset)}
                      className="w-full h-full bg-transparent border-none px-3 py-3 text-center text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 appearance-none"
                      style={{ textAlignLast: 'center' }}
                    >
                      <option value=""></option>
                      <option value="muslim">
                        {student.gender === 'female' ? (t as any).muslimFemale : t.muslim}
                      </option>
                      <option value="christian">
                        {student.gender === 'female' ? (t as any).christianFemale : t.christian}
                      </option>
                    </select>
                  </td>
                  <td
                    style={{ minWidth: `${classColWidth}px`, width: `${classColWidth}px` }}
                    className="p-0 border-2 border-slate-900 relative focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60"
                  >
                    <select 
                      id={`cell-${idx}-${6 + colOffset}`}
                      value={student.studentClass || ''}
                      onChange={(e) => handleChange(student.id, 'studentClass' as any, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 6 + colOffset)}
                      onFocus={(e) => {
                        ensureCellVisible(e.target);
                      }}
                      className="w-full h-full bg-transparent border-none px-2 py-3 text-center text-slate-800 focus:outline-none appearance-none cursor-pointer"
                      style={{ textAlignLast: 'center' }}
                    >
                      <option value=""></option>
                      {availableClasses.map(cls => (
                        <option key={cls} value={cls}>{formatNumberDigits(cls, numberLang)}</option>
                      ))}
                    </select>
                  </td>
                  {showExamFields && (
                    <>
                      <td className="p-0 border-2 border-slate-900 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60">
                        <input
                          id={`cell-${idx}-${7 + colOffset}`}
                          type="text"
                          value={formatNumberDigits(student.seatNumbers?.[semester] || (semester === 'first' ? student.seatNumber : '') || '', numberLang)}
                          onChange={(e) => handleSemesterFieldChange(student.id, 'seatNumbers', formatNumberDigits(e.target.value, 'en'))}
                          onKeyDown={(e) => handleKeyDown(e, idx, 7 + colOffset)}
                          onFocus={(e) => {
                            e.target.select();
                            ensureCellVisible(e.target);
                          }}
                          onPaste={(e) => handlePaste(e, student.id, "seatNumbers", idx, 7 + colOffset)}
                          className="w-full h-full bg-transparent border-none px-3 py-3 text-center text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 font-mono"
                          dir="ltr"
                        />
                      </td>
                      <td className="p-0 border-2 border-slate-900 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60">
                        <input
                          id={`cell-${idx}-${8 + colOffset}`}
                          type="text"
                          value={formatNumberDigits(student.secretNumbers?.[semester] || (semester === 'first' ? student.secretNumber : '') || '', numberLang)}
                          onChange={(e) => handleSemesterFieldChange(student.id, 'secretNumbers', formatNumberDigits(e.target.value, 'en'))}
                          onKeyDown={(e) => handleKeyDown(e, idx, 8 + colOffset)}
                          onFocus={(e) => {
                            e.target.select();
                            ensureCellVisible(e.target);
                          }}
                          onPaste={(e) => handlePaste(e, student.id, "secretNumbers", idx, 8 + colOffset)}
                          className="w-full h-full bg-transparent border-none px-3 py-3 text-center text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 font-mono"
                          dir="ltr"
                        />
                      </td>
                    </>
                  )}
                  {!isKindergarten && (
                    <td className="p-0 border-2 border-slate-900 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60">
                      <input
                        id={`cell-${idx}-${(showExamFields ? 9 : 7) + colOffset}`}
                        type="text"
                        value={formatNumberDigits(student.committeeNumbers?.[semester] || student.committeeNumber || '', numberLang)}
                        onChange={(e) => handleSemesterFieldChange(student.id, 'committeeNumbers', formatNumberDigits(e.target.value, 'en'))}
                        onKeyDown={(e) => handleKeyDown(e, idx, (showExamFields ? 9 : 7) + colOffset)}
                        onFocus={(e) => {
                          e.target.select();
                          ensureCellVisible(e.target);
                        }}
                        onPaste={(e) => handlePaste(e, student.id, "committeeNumbers", idx, (showExamFields ? 9 : 7) + colOffset)}
                        className="w-full h-full bg-transparent border-none px-3 py-3 text-center text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 font-mono"
                        dir="ltr"
                      />
                    </td>
                  )}
                  <td className="p-0 border-2 border-slate-900 bg-[#fef2f2]">
                    <button 
                      onClick={() => setStudentToDelete(student)}
                      className="w-full h-full p-3 text-red-500 hover:text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center"
                      title={t.deleteRow}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="text-center py-12 bg-white overflow-hidden">
              <motion.div 
                animate={{ x: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="inline-block text-slate-500 font-bold text-base"
              >
                {(Object.values(filters).some(v => v && v !== 'all') || Boolean(searchTerm))
                  ? 'لا يوجد طلاب حسب التصفية المحددة'
                  : t.noStudentsMsg}
              </motion.div>
            </div>
          )}
          </div>
        </div>


      </div>

      {/* Confirm Delete Student Modal */}
      <AnimatePresence>
        {studentToDelete && (
          <motion.div 
            {...FAST_BACKDROP_FADE}
            onClick={() => setStudentToDelete(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[120] flex items-center justify-center p-4"
          >
            <motion.div 
              {...FAST_MODAL_FLIP}
              onClick={(e) => e.stopPropagation()}
              className="relative rounded-3xl shadow-2xl w-fit min-w-[340px] sm:min-w-[520px] max-w-[95vw] overflow-hidden p-[4px] flex flex-col text-center" 
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            >
              <div className="absolute inset-[-100%] animate-[spin_10s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />
              <div className="relative bg-[linear-gradient(135deg,#ffe4e6,#ffedd5,#fee2e2,#ffe4e6)] bg-[length:300%_300%] animate-shine rounded-[26px] w-full h-full border border-white/60 relative z-10">
                <div className="p-8">
                  <div className="w-20 h-20 rounded-full bg-white/80 flex items-center justify-center mx-auto mb-6 text-rose-600 shadow-inner border border-rose-100 relative z-10">
                    <AlertTriangle className="w-10 h-10 drop-shadow-sm" />
                  </div>
                  <motion.h3 animate={{ rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="text-2xl text-center font-bold text-rose-950 mb-3 drop-shadow-sm relative z-10">
                    {isKindergarten ? 'تأكيد حذف التلميذ' : 'تأكيد حذف الطالب'}
                  </motion.h3>
                  <div className="relative p-[3px] rounded-xl overflow-hidden mb-8 shadow-sm relative z-10 mx-auto w-full">
                    <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_50%,rgba(0,0,0,0.3)_100%)] pointer-events-none" />
                    <p className="relative text-rose-800 font-bold text-lg sm:text-xl bg-white/90 backdrop-blur-sm rounded-[9px] py-3 px-6 whitespace-nowrap">
                      {studentToDelete.name || (isKindergarten ? 'تلميذ بدون اسم' : 'طالب بدون اسم')}
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 relative z-10">
                    <div className="flex-1 relative p-[3px] rounded-xl overflow-hidden group">
                      <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,#000_0%,#fff_50%,#000_100%)] pointer-events-none" />
                      <button 
                        onClick={() => {
                          handleRemoveRow(studentToDelete.id);
                          setStudentToDelete(null);
                        }} 
                        className="relative w-full h-full px-5 py-3.5 rounded-[9px] font-bold text-white bg-[linear-gradient(45deg,#ef4444,#f43f5e,#ef4444)] bg-[length:200%_200%] animate-shine hover:opacity-90 transition-all shadow-md"
                      >
                        {(t as any).yes || 'نعم'}
                      </button>
                    </div>
                    <div className="flex-1 relative p-[3px] rounded-xl overflow-hidden group">
                      <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,#000_0%,#fff_50%,#000_100%)] pointer-events-none opacity-50" />
                      <button 
                        onClick={() => setStudentToDelete(null)} 
                        className="relative w-full h-full px-5 py-3.5 rounded-[9px] font-bold text-rose-800 bg-white/90 hover:bg-white transition-all shadow-sm"
                      >
                        {(t as any).no || 'لا'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm [perspective:1000px]"
          >
            <motion.div
              {...FAST_MODAL_FLIP}
              className="relative w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden p-[4px] flex flex-col"
            >
              {/* Slow Moving Light Glow */}
              <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_30%,#ffffff_50%,#ffffff_70%,transparent_100%)] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col w-full max-h-[92vh] rounded-[20px] overflow-hidden border-2 border-slate-900 bg-white">
                <div className="bg-[linear-gradient(to_right,#4f46e5,#9333ea,#4f46e5)] bg-[length:200%_auto] animate-shine border-b-2 border-slate-900 p-6 sm:p-8 flex flex-col items-center justify-center text-center shrink-0">
                  <h3 className="text-2xl font-black text-white mb-2">{t.studentsModalTitle}</h3>
                  <p className="text-indigo-100 font-bold text-sm mb-1">{t.studentsModalSub1}</p>
                  <p className="text-indigo-200/80 font-medium text-xs">{t.studentsModalSub2}</p>
                </div>
                
                <div className="p-6 sm:p-8 flex flex-col gap-5 bg-[linear-gradient(to_right,#e0e7ff,#c7d2fe,#e0e7ff)] bg-[length:200%_auto] animate-shine w-full overflow-y-auto">
                  <div className="flex flex-col gap-3 w-full text-right">
                    {/* الخيار الأول: الاختيار من القائمة المحفوظة أو التقليدية */}
                    <div
                      className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-all ${
                        addClassMode === 'select'
                          ? 'bg-white/95 border-indigo-600 shadow-sm'
                          : 'bg-white/55 border-slate-900/30 opacity-80'
                      }`}
                    >
                      <label className="text-slate-800 font-black text-sm flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="radio"
                          name="addStudentsClassMode"
                          checked={addClassMode === 'select'}
                          onChange={() => {
                            setAddClassMode('select');
                            setCustomClassError(null);
                          }}
                          className="w-4 h-4 text-indigo-600 border-slate-900 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        />
                        <span>إختر ( الفصل ) للطلاب الذين ستقوم بإضافتهم :</span>
                      </label>
                      <div ref={addClassDropdownRef} className="relative w-full">
                        <div className="flex items-stretch gap-2 w-full">
                          <button
                            type="button"
                            disabled={addClassMode !== 'select'}
                            onClick={() => setIsAddClassDropdownOpen((prev) => !prev)}
                            className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-900 bg-white text-slate-900 font-black text-base sm:text-lg focus:outline-none focus:border-indigo-600 focus:ring-4 ring-indigo-500/20 cursor-pointer shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 flex items-center justify-between gap-2"
                          >
                            <span className="w-4 shrink-0" />
                            <span className="flex-1 text-center truncate">
                              {formatNumberDigits(selectedClass, numberLang)}
                            </span>
                            <ChevronDown
                              className={`w-5 h-5 text-slate-700 shrink-0 transition-transform duration-200 ${
                                isAddClassDropdownOpen && addClassMode === 'select' ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {customClassesList.includes(selectedClass) && (
                            <button
                              type="button"
                              disabled={addClassMode !== 'select'}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditClassModal(selectedClass);
                              }}
                              title="تعديل أو حذف اسم الفصل"
                              aria-label="تعديل أو حذف اسم الفصل"
                              className="px-3 rounded-xl border-2 border-slate-900 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {isAddClassDropdownOpen && addClassMode === 'select' && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border-2 border-slate-900 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                            {customClassesList.length > 0 && (
                              <div>
                                <div className="min-h-[44px] px-3 py-3 text-[11px] font-black text-indigo-800 bg-indigo-50 border-b border-indigo-200 sticky top-0 z-10 flex items-center justify-center text-center">
                                  الفصول المخصصة المحفوظة
                                </div>
                                {customClassesList.map((classLabel) => {
                                  const isSelected = selectedClass === classLabel;
                                  return (
                                    <div
                                      key={`custom-${classLabel}`}
                                      className={`flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 transition-colors ${
                                        isSelected ? 'bg-indigo-50/90' : 'hover:bg-slate-50'
                                      }`}
                                    >
                                      <span className="w-[30px] shrink-0" aria-hidden="true" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedClass(classLabel);
                                          setIsAddClassDropdownOpen(false);
                                        }}
                                        className="flex-1 text-center font-bold text-sm sm:text-base text-slate-900 flex items-center justify-center gap-2 cursor-pointer min-w-0"
                                      >
                                        <span className="truncate">{formatNumberDigits(classLabel, numberLang)}</span>
                                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditClassModal(classLabel);
                                        }}
                                        title="تعديل أو حذف اسم الفصل"
                                        aria-label={`تعديل أو حذف ${classLabel}`}
                                        className="w-[30px] h-[30px] rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-slate-900/50 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div>
                              {customClassesList.length > 0 && (
                                <div className="min-h-[44px] px-3 py-3 text-[11px] font-black text-slate-600 bg-slate-100 border-b border-slate-200 sticky top-0 z-10 flex items-center justify-center text-center">
                                  الفصول التقليدية
                                </div>
                              )}
                              {defaultClassesList.map((classLabel) => {
                                const isSelected = selectedClass === classLabel;
                                return (
                                  <button
                                    key={classLabel}
                                    type="button"
                                    onClick={() => {
                                      setSelectedClass(classLabel);
                                      setIsAddClassDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2 border-b border-slate-100 last:border-b-0 text-center font-bold text-sm sm:text-base text-slate-800 flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                                      isSelected ? 'bg-indigo-50 text-indigo-900 font-black' : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>{formatNumberDigits(classLabel, numberLang)}</span>
                                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* الخيار الثاني (اختياري): تحرير اسم مخصص للفصل */}
                    <div
                      className={`flex flex-col gap-2 p-3 rounded-xl border-2 transition-all ${
                        addClassMode === 'custom'
                          ? 'bg-white/95 border-indigo-600 shadow-sm'
                          : 'bg-white/55 border-slate-900/30 opacity-85'
                      }`}
                    >
                      <label className="w-full text-slate-800 font-black text-sm flex items-center justify-between gap-2 cursor-pointer select-none">
                        <span className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="radio"
                            name="addStudentsClassMode"
                            checked={addClassMode === 'custom'}
                            onChange={() => {
                              setAddClassMode('custom');
                              setIsAddClassDropdownOpen(false);
                              setCustomClassError(null);
                            }}
                            className="w-4 h-4 text-indigo-600 border-slate-900 focus:ring-indigo-500 cursor-pointer accent-indigo-600 shrink-0"
                          />
                          <span>تحرير اسم الفصل بدلا من الأرقام التقليدية</span>
                        </span>
                        <span className="inline-flex items-center justify-center min-h-[32px] text-[11px] font-bold px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 border-2 border-black shrink-0">
                          اختياري
                        </span>
                      </label>
                      <input
                        type="text"
                        maxLength={14}
                        disabled={addClassMode !== 'custom'}
                        value={customClassNameInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw.length >= 15) {
                            setCustomClassNameInput(raw.slice(0, 14));
                            setCustomClassError('يجب أن يكون عدد الحروف أقل من 15 حرفاً (الحد الأقصى 14 حرفاً).');
                          } else {
                            setCustomClassNameInput(raw);
                            if (customClassError) setCustomClassError(null);
                          }
                        }}
                        placeholder="EX : Sunflowers, Daisies, Tulips, ......"
                        className={`w-full py-2.5 px-4 rounded-xl border-2 bg-white text-slate-900 font-bold text-base focus:outline-none focus:ring-4 transition-all text-center placeholder:text-slate-400 placeholder:font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                          matchedExistingClassForCustom || customClassError
                            ? 'border-rose-600 focus:border-rose-600 ring-rose-500/20'
                            : 'border-slate-900 focus:border-indigo-600 ring-indigo-500/20'
                        }`}
                        dir="auto"
                      />
                      {addClassMode === 'custom' && (
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1">
                          <span>يجب أن يكون عدد الحروف أقل من {formatNumberDigits(15, numberLang)} حرفاً</span>
                          <span className={customClassNameInput.length >= 14 ? 'text-amber-700 font-black' : 'text-slate-600'}>
                            {formatNumberDigits(customClassNameInput.length, numberLang)} / {formatNumberDigits(14, numberLang)}
                          </span>
                        </div>
                      )}

                      {addClassMode === 'custom' && matchedExistingClassForCustom && (
                        <div className="flex flex-col gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border-2 border-amber-500 text-amber-950 text-xs font-bold leading-relaxed">
                          <span>
                            هذا الفصل موجود أصلاً في القائمة باسم «{formatNumberDigits(matchedExistingClassForCustom, numberLang)}» — يُرجى اختياره من القائمة أعلاه لضمان عدم الخطأ أو التكرار.
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClass(matchedExistingClassForCustom);
                              setAddClassMode('select');
                              setCustomClassNameInput('');
                              setCustomClassError(null);
                            }}
                            className="self-start px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition-colors cursor-pointer"
                          >
                            اختيار «{formatNumberDigits(matchedExistingClassForCustom, numberLang)}» من القائمة
                          </button>
                        </div>
                      )}

                      {addClassMode === 'custom' && customClassError && !matchedExistingClassForCustom && (
                        <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-500 text-rose-900 text-xs font-bold">
                          {customClassError}
                        </div>
                      )}

                      {addClassMode === 'custom' &&
                        cleanClassName(customClassNameInput) &&
                        !matchedExistingClassForCustom &&
                        !customClassError && (
                          <p className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5">
                            سيتم حفظ اسم الفصل في القائمة تلقائياً لاختياره لاحقاً بسهولة.
                          </p>
                        )}
                    </div>
                  </div>

                  <div className="w-full py-2.5 flex flex-col justify-center" aria-hidden="true">
                    <div className="relative w-full">
                      <hr className="w-full h-[3px] border-0 rounded-full bg-indigo-950/85" />
                      <div
                        className="pointer-events-none absolute -top-[2px] inset-x-0 h-[5px] rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(99,102,241,0.35)_30%,#ffffff_50%,rgba(99,102,241,0.35)_70%,transparent_100%)] bg-[length:200%_100%] animate-shine shadow-[0_0_12px_rgba(255,255,255,0.95)]"
                        style={{ animationDuration: '3.2s' }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full text-right">
                    <div className="flex flex-wrap items-center justify-between gap-2 pr-1">
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-800 font-black text-sm flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                          {t.studentsModalSub1}
                        </label>
                        <p className="text-indigo-950/80 font-bold text-xs pr-4">
                          {t.studentsModalSub2}
                        </p>
                      </div>

                      <input
                        ref={studentFileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv,.ods,.docx,.doc"
                        onChange={handleImportStudentsFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isImportingFile}
                        onClick={() => studentFileInputRef.current?.click()}
                        title="جلب أسماء القوائم من ملف Excel أو Word"
                        className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-black text-xs sm:text-sm border-2 border-slate-900 shadow-sm transition-all active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
                      >
                        {isImportingFile ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 shrink-0" />
                        )}
                        <span>{isImportingFile ? 'جاري الاستيراد...' : 'استيراد من ملف'}</span>
                      </button>
                    </div>

                    {importFileFeedback && (
                      <div
                        className={`px-3 py-2 rounded-xl border text-xs font-bold leading-relaxed ${
                          importFileFeedback.type === 'success'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                            : 'bg-rose-50 border-rose-600 text-rose-900'
                        }`}
                      >
                        {importFileFeedback.message}
                      </div>
                    )}

                    <textarea
                      value={modalText}
                      onChange={(e) => setModalText(e.target.value)}
                      placeholder="أحمد محمد&#10;محمود علي&#10;سارة أحمد..."
                      className="w-full h-48 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-900 shadow-inner p-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-4 ring-indigo-500/20 resize-none font-bold leading-relaxed transition-all"
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>
                
                <div className="bg-[linear-gradient(to_right,#4f46e5,#9333ea,#4f46e5)] bg-[length:200%_auto] animate-shine border-t-2 border-slate-900 p-5 sm:p-6 flex justify-end gap-3 items-center shrink-0">
                  <button
                    onClick={handleModalAdd}
                    className="flex-[2] h-14 px-6 rounded-xl font-black text-slate-900 bg-white hover:bg-slate-100 transition-all shadow-md border-2 border-slate-900 active:scale-95 text-lg flex items-center justify-center gap-2"
                  >
                    <Plus className="w-6 h-6" strokeWidth={3} />
                    {t.add}
                  </button>
                  <button
                    onClick={() => {
                      setImportFileFeedback(null);
                      setAddClassMode('select');
                      setIsAddClassDropdownOpen(false);
                      setCustomClassNameInput('');
                      setCustomClassError(null);
                      setIsModalOpen(false);
                    }}
                    className="w-14 h-14 flex items-center justify-center rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors border-2 border-slate-900 shadow-md active:scale-95 shrink-0"
                  >
                    <X className="w-8 h-8" strokeWidth={3} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit / Delete Custom Class Modal */}
      <AnimatePresence>
        {editClassModalState && (
          <motion.div
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm [perspective:1000px]"
            dir="rtl"
            onClick={() => setEditClassModalState(null)}
          >
            <motion.div
              {...FAST_MODAL_FLIP}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full rounded-[24px] shadow-2xl overflow-hidden p-[4px] flex flex-col transition-all duration-200 ${
                editClassModalState.confirmDelete ? 'max-w-[584px]' : 'max-w-[560px]'
              }`}
            >
              <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_30%,#ffffff_50%,#ffffff_70%,transparent_100%)] pointer-events-none" />

              <div className="relative z-10 flex flex-col w-full rounded-[20px] overflow-hidden border-2 border-slate-900 bg-white">
                <div
                  className={`bg-[length:200%_auto] animate-shine border-b-2 border-slate-900 p-5 flex items-center justify-center text-center ${
                    editClassModalState.confirmDelete
                      ? 'bg-[linear-gradient(to_right,#dc2626,#e11d48,#dc2626)]'
                      : 'bg-[linear-gradient(to_right,#4f46e5,#7c3aed,#4f46e5)]'
                  }`}
                >
                  <h3 className="text-xl font-black text-white">
                    {editClassModalState.confirmDelete ? 'حذف الفصل' : 'تعديل اسم الفصل'}
                  </h3>
                </div>

                {!editClassModalState.confirmDelete ? (
                  <>
                    <div className="p-6 flex flex-col gap-3 bg-[linear-gradient(to_right,#eef2ff,#e0e7ff,#eef2ff)] bg-[length:200%_auto] animate-shine">
                      <label className="text-slate-800 font-black text-sm text-right">
                        تعديل اسم الفصل
                      </label>
                      <input
                        type="text"
                        maxLength={14}
                        autoFocus
                        value={editClassModalState.newName}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw.length >= 15) {
                            setEditClassModalState((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    newName: raw.slice(0, 14),
                                    error: 'يجب أن يكون عدد الحروف أقل من 15 حرفاً (الحد الأقصى 14 حرفاً).',
                                  }
                                : null
                            );
                          } else {
                            setEditClassModalState((prev) =>
                              prev ? { ...prev, newName: raw, error: null } : null
                            );
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveEditedClassName();
                          }
                        }}
                        placeholder="EX : Sunflowers, Daisies, Tulips, ......"
                        className={`w-full py-2.5 px-4 rounded-xl border-2 bg-white text-slate-900 font-bold text-base focus:outline-none focus:ring-4 transition-all text-center ${
                          editClassModalState.error
                            ? 'border-rose-600 focus:border-rose-600 ring-rose-500/20'
                            : 'border-slate-900 focus:border-indigo-600 ring-indigo-500/20'
                        }`}
                        dir="auto"
                      />
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1">
                        <span>يجب أن يكون عدد الحروف أقل من {formatNumberDigits(15, numberLang)} حرفاً</span>
                        <span
                          className={
                            editClassModalState.newName.length >= 14
                              ? 'text-amber-700 font-black'
                              : 'text-slate-600'
                          }
                        >
                          {formatNumberDigits(editClassModalState.newName.length, numberLang)} /{' '}
                          {formatNumberDigits(14, numberLang)}
                        </span>
                      </div>

                      {editClassModalState.error && (
                        <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-500 text-rose-900 text-xs font-bold">
                          {editClassModalState.error}
                        </div>
                      )}
                    </div>

                    <div className="bg-[linear-gradient(to_right,#4f46e5,#7c3aed,#4f46e5)] bg-[length:200%_auto] animate-shine border-t-2 border-slate-900 p-4 flex items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={handleSaveEditedClassName}
                        className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl font-black text-sm sm:text-base text-slate-900 bg-white hover:bg-slate-100 border-2 border-slate-900 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Save className="w-4 h-4 shrink-0" />
                        <span>حفظ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditClassModalState(null)}
                        className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl font-black text-sm sm:text-base text-white bg-slate-700 hover:bg-slate-800 border-2 border-white shadow-sm active:scale-95 transition-all whitespace-nowrap cursor-pointer"
                      >
                        الغاء الأمر
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditClassModalState((prev) =>
                            prev ? { ...prev, confirmDelete: true, error: null } : null
                          )
                        }
                        className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl font-black text-sm sm:text-base text-white bg-rose-600 hover:bg-rose-700 border-2 border-white shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span>حذف الفصل</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-6 flex flex-col gap-3 bg-rose-50">
                      <div className="flex flex-col items-center text-center gap-3 p-5 rounded-2xl bg-amber-50 border-2 border-amber-500 text-amber-950 shadow-sm">
                        <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
                        <div className="flex flex-col items-center gap-2 text-center">
                          <p className="font-black text-sm sm:text-base leading-relaxed">
                            سيتم حذف اسم الفصل مع بقاء الطلاب به بدون فصل
                          </p>
                          <p className="font-bold text-xs sm:text-sm text-amber-900 leading-relaxed">
                            يمكنك اختيار الفصل للطلاب المشار اليهم مجددا من القائمة المنسدلة الموجودة فى حقل الفصل فى نافذة تحرير البيانات لهذا الصف الدراسي.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[linear-gradient(to_right,#dc2626,#e11d48,#dc2626)] bg-[length:200%_auto] animate-shine border-t-2 border-slate-900 p-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleConfirmDeleteClass}
                        className="flex-1 min-h-[58px] sm:min-h-[60px] py-4 px-4 rounded-xl font-black text-sm sm:text-base text-rose-700 bg-white hover:bg-rose-50 border-2 border-slate-900 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span>تأكيد حذف الفصل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditClassModalState((prev) =>
                            prev ? { ...prev, confirmDelete: false } : null
                          )
                        }
                        className="flex-1 min-h-[58px] sm:min-h-[60px] py-4 px-4 rounded-xl font-black text-sm sm:text-base text-white bg-slate-800 hover:bg-slate-900 border-2 border-white shadow-sm active:scale-95 transition-all flex items-center justify-center whitespace-nowrap cursor-pointer"
                      >
                        الغاء الأمر
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* National ID Modal Overlay */}
      <AnimatePresence>
        {isNationalIdModalOpen && (
          <motion.div
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm [perspective:1000px]"
          >
            <motion.div
              {...FAST_MODAL_FLIP}
              className="relative w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden p-[4px] flex flex-col"
            >
              {/* Slow Moving Light Glow */}
              <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_30%,#ffffff_50%,#ffffff_70%,transparent_100%)] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col w-full max-h-[92vh] rounded-[20px] overflow-hidden border-2 border-slate-900 bg-white">
                <div className="bg-[linear-gradient(to_right,#3b82f6,#06b6d4,#3b82f6)] bg-[length:200%_auto] animate-shine border-b-2 border-slate-900 p-6 sm:p-8 flex flex-col items-center justify-center text-center shrink-0">
                  <h3 className="text-2xl font-black text-white mb-2">{t.nationalIdsModalTitle}</h3>
                  <p className="text-blue-100 font-bold text-sm mb-1">{t.nationalIdsModalSub1}</p>
                  <p className="text-blue-200/80 font-medium text-xs">{t.studentsModalSub2}</p>
                </div>
                
                <div className="p-6 sm:p-8 flex flex-col gap-5 bg-[linear-gradient(to_right,#dbeafe,#cffafe,#dbeafe)] bg-[length:200%_auto] animate-shine w-full overflow-y-auto">
                  <div className="flex flex-col gap-3 w-full text-right">
                    <label className="text-slate-800 font-black text-sm flex items-center gap-2 pr-1">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      إختر ( الفصل ) للطلاب الذين ستقوم بإضافتهم :
                    </label>
                    <select
                      value={selectedClassForNid}
                      onChange={(e) => setSelectedClassForNid(e.target.value)}
                      className="w-full py-3 px-4 rounded-xl border-2 border-slate-900 bg-white text-slate-900 font-black text-lg focus:outline-none focus:border-blue-600 focus:ring-4 ring-blue-500/20 appearance-none text-center cursor-pointer shadow-sm transition-all hover:bg-slate-50"
                      style={{ textAlignLast: 'center' }}
                    >
                      {customClassesList.length > 0 ? (
                        <>
                          <optgroup label="الفصول المخصصة المحفوظة">
                            {customClassesList.map((classLabel) => (
                              <option key={`nid-custom-${classLabel}`} value={classLabel} className="font-bold">
                                {formatNumberDigits(classLabel, numberLang)}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="الفصول التقليدية">
                            {defaultClassesList.map((classLabel) => (
                              <option key={classLabel} value={classLabel} className="font-bold">
                                {formatNumberDigits(classLabel, numberLang)}
                              </option>
                            ))}
                          </optgroup>
                        </>
                      ) : (
                        defaultClassesList.map((classLabel) => (
                          <option key={classLabel} value={classLabel} className="font-bold">
                            {formatNumberDigits(classLabel, numberLang)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 w-full text-right">
                    <div className="flex flex-wrap items-center justify-between gap-2 pr-1">
                      <div className="flex flex-col gap-1">
                        <label className="text-slate-800 font-black text-sm flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          {t.nationalIdsModalSub1}
                        </label>
                        <p className="text-blue-950/80 font-bold text-xs pr-4">
                          {t.studentsModalSub2}
                        </p>
                      </div>

                      <input
                        ref={nidFileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv,.ods,.docx,.doc"
                        onChange={handleImportNationalIdsFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isImportingNidFile}
                        onClick={() => nidFileInputRef.current?.click()}
                        title="التحقق وجلب قائمة الأرقام القومية من ملف Excel أو Word"
                        className="h-10 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-black text-xs sm:text-sm border-2 border-slate-900 shadow-sm transition-all active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
                      >
                        {isImportingNidFile ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 shrink-0" />
                        )}
                        <span>{isImportingNidFile ? 'جاري التحقق والاستيراد...' : 'استيراد من ملف'}</span>
                      </button>
                    </div>

                    {importNidFileFeedback && (
                      <div
                        className={`px-3 py-2 rounded-xl border text-xs font-bold leading-relaxed ${
                          importNidFileFeedback.type === 'success'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                            : 'bg-rose-50 border-rose-600 text-rose-900'
                        }`}
                      >
                        {importNidFileFeedback.message}
                      </div>
                    )}

                    <textarea
                      value={nationalIdModalText}
                      onChange={(e) => {
                        const cleanValue = e.target.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                        const lines = cleanValue.split('\n');
                        const processed = lines.map(line => {
                          const normalized = line.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
                          const digits = normalized.replace(/\D/g, '');
                          return digits.slice(0, 14);
                        });
                        setNationalIdModalText(processed.join('\n'));
                      }}
                      placeholder="30001011234567&#10;30001011234568&#10;30001011234569..."
                      className="w-full h-48 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-900 shadow-inner p-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 ring-blue-500/20 resize-none font-bold leading-relaxed font-mono transition-all"
                      dir="ltr"
                    />
                  </div>
                </div>
                
                <div className="bg-[linear-gradient(to_right,#3b82f6,#06b6d4,#3b82f6)] bg-[length:200%_auto] animate-shine border-t-2 border-slate-900 p-5 sm:p-6 flex justify-end gap-3 items-center shrink-0">
                  <button
                    onClick={handleNationalIdModalAdd}
                    className="flex-[2] h-14 px-6 rounded-xl font-black text-slate-900 bg-white hover:bg-slate-100 transition-all shadow-md border-2 border-slate-900 active:scale-95 text-lg flex items-center justify-center gap-2"
                  >
                    <Plus className="w-6 h-6" strokeWidth={3} />
                    {t.add}
                  </button>
                  <button
                    onClick={() => {
                      setImportNidFileFeedback(null);
                      setIsNationalIdModalOpen(false);
                    }}
                    className="w-14 h-14 flex items-center justify-center rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors border-2 border-slate-900 shadow-md active:scale-95 shrink-0"
                  >
                    <X className="w-8 h-8" strokeWidth={3} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Default Student Values Modal Overlay */}
      <AnimatePresence>
        {isDefaultValuesModalOpen && (
          <motion.div
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm [perspective:1000px]"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            onClick={() => setIsDefaultValuesModalOpen(false)}
          >
            <motion.div
              {...FAST_MODAL_FLIP}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden p-[4px] flex flex-col"
            >
              <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_30%,#ffffff_50%,#ffffff_70%,transparent_100%)] pointer-events-none" />

              <div className="relative z-10 flex flex-col w-full h-full rounded-[20px] overflow-hidden border-2 border-slate-900 bg-white">
                <div className="bg-[linear-gradient(to_right,#4f46e5,#2563eb,#4f46e5)] bg-[length:200%_auto] animate-shine border-b-2 border-slate-900 p-5 sm:p-6 flex flex-col items-center justify-center text-center">
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    القيم الافتراضية لبيانات الطلاب
                  </h3>
                </div>

                <div className="p-5 sm:p-6 flex flex-col gap-4 bg-[linear-gradient(to_right,#eef2ff,#e0f2fe,#eef2ff)] bg-[length:200%_auto] animate-shine w-full max-h-[65vh] overflow-y-auto custom-scrollbar">
                  {/* حالة القيد */}
                  <div className="bg-[linear-gradient(135deg,#eff6ff,#dbeafe)] border-2 border-blue-800 rounded-2xl p-3.5 sm:p-4 shadow-md">
                    <div className="font-black text-blue-950 text-sm sm:text-base mb-2.5 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                      حالة القيد
                    </div>
                    <label
                      onClick={(e) => {
                        e.preventDefault();
                        setDefaultEnrollmentStatus(prev => (prev === 'منقول' ? '' : 'منقول'));
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                        defaultEnrollmentStatus === 'منقول'
                          ? 'bg-white border-blue-600 text-blue-950 shadow-sm ring-2 ring-blue-400/40'
                          : 'bg-white/75 border-blue-200 text-slate-700 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="defaultEnrollmentStatus"
                        value="منقول"
                        checked={defaultEnrollmentStatus === 'منقول'}
                        readOnly
                        className="w-5 h-5 accent-blue-600 cursor-pointer shrink-0"
                      />
                      <span className="font-bold text-sm sm:text-base">{isFirstGrade ? 'مستجد - مستجدة' : 'منقول - منقولة'}</span>
                    </label>
                  </div>

                  {/* حالة الإعفاء (تظهر للمدارس الدولية فقط) */}
                  {showExemptionStatus && (
                    <div className="bg-[linear-gradient(135deg,#fffbeb,#fef3c7)] border-2 border-amber-700 rounded-2xl p-3.5 sm:p-4 shadow-md">
                      <div className="font-black text-amber-950 text-sm sm:text-base mb-2.5 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                        حالة الإعفاء
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          onClick={(e) => {
                            e.preventDefault();
                            setDefaultExemptionStatus(prev => (prev === 'كلى' ? '' : 'كلى'));
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                            defaultExemptionStatus === 'كلى'
                              ? 'bg-white border-amber-600 text-amber-950 shadow-sm ring-2 ring-amber-400/40'
                              : 'bg-white/75 border-amber-200 text-slate-700 hover:border-amber-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="defaultExemptionStatus"
                            value="كلى"
                            checked={defaultExemptionStatus === 'كلى'}
                            readOnly
                            className="w-5 h-5 accent-amber-600 cursor-pointer shrink-0"
                          />
                          <span className="font-bold text-sm sm:text-base">كلى</span>
                        </label>

                        <label
                          onClick={(e) => {
                            e.preventDefault();
                            setDefaultExemptionStatus(prev => (prev === 'تدريجى' ? '' : 'تدريجى'));
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                            defaultExemptionStatus === 'تدريجى'
                              ? 'bg-white border-amber-600 text-amber-950 shadow-sm ring-2 ring-amber-400/40'
                              : 'bg-white/75 border-amber-200 text-slate-700 hover:border-amber-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="defaultExemptionStatus"
                            value="تدريجى"
                            checked={defaultExemptionStatus === 'تدريجى'}
                            readOnly
                            className="w-5 h-5 accent-amber-600 cursor-pointer shrink-0"
                          />
                          <span className="font-bold text-sm sm:text-base">تدريجى</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* نوعية القيد */}
                  <div className="bg-[linear-gradient(135deg,#ecfdf5,#d1fae5)] border-2 border-emerald-800 rounded-2xl p-3.5 sm:p-4 shadow-md">
                    <div className="font-black text-emerald-950 text-sm sm:text-base mb-2.5 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                      نوعية القيد
                    </div>
                    <label
                      onClick={(e) => {
                        e.preventDefault();
                        setDefaultEnrollmentType(prev => (prev === 'قيد عادى' ? '' : 'قيد عادى'));
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                        defaultEnrollmentType === 'قيد عادى'
                          ? 'bg-white border-emerald-600 text-emerald-950 shadow-sm ring-2 ring-emerald-400/40'
                          : 'bg-white/75 border-emerald-200 text-slate-700 hover:border-emerald-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="defaultEnrollmentType"
                        value="قيد عادى"
                        checked={defaultEnrollmentType === 'قيد عادى'}
                        readOnly
                        className="w-5 h-5 accent-emerald-600 cursor-pointer shrink-0"
                      />
                      <span className="font-bold text-sm sm:text-base">قيد عادى</span>
                    </label>
                  </div>

                  {/* الديانة */}
                  <div className="bg-[linear-gradient(135deg,#faf5ff,#f3e8ff)] border-2 border-purple-800 rounded-2xl p-3.5 sm:p-4 shadow-md">
                    <div className="font-black text-purple-950 text-sm sm:text-base mb-2.5 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                      الديانة
                    </div>
                    <label
                      onClick={(e) => {
                        e.preventDefault();
                        setDefaultReligion(prev => (prev === 'muslim' ? '' : 'muslim'));
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                        defaultReligion === 'muslim'
                          ? 'bg-white border-purple-600 text-purple-950 shadow-sm ring-2 ring-purple-400/40'
                          : 'bg-white/75 border-purple-200 text-slate-700 hover:border-purple-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="defaultReligion"
                        value="muslim"
                        checked={defaultReligion === 'muslim'}
                        readOnly
                        className="w-5 h-5 accent-purple-600 cursor-pointer shrink-0"
                      />
                      <span className="font-bold text-sm sm:text-base">مسلم - مسلمة</span>
                    </label>
                  </div>

                  <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50/95 border-2 border-amber-500 text-amber-950 shadow-sm">
                    <Info className="w-5 h-5 text-amber-600 shrink-0" />
                    <span className="font-black text-xs sm:text-sm text-center">
                      إدراج القيم الافتراضية للحقول السابقة
                    </span>
                  </div>
                </div>

                <div className="bg-[linear-gradient(to_right,#4f46e5,#2563eb,#4f46e5)] bg-[length:200%_auto] animate-shine border-t-2 border-slate-900 p-4 sm:p-5 flex justify-center gap-3 items-center">
                  <button
                    type="button"
                    onClick={handleApplyDefaultValues}
                    className="flex-1 h-16 px-5 rounded-xl font-black text-slate-900 bg-white hover:bg-slate-100 transition-all shadow-md border-2 border-red-600 active:scale-95 text-base flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5 text-emerald-600" strokeWidth={3} />
                    إدراج
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDefaultValuesModalOpen(false)}
                    className="flex-1 h-16 px-5 rounded-xl font-black text-white bg-rose-600 hover:bg-rose-700 transition-colors border-2 border-white shadow-md active:scale-95 text-base flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" strokeWidth={3} />
                    إلغاء الأمر
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exam Schedule Modal Overlay */}
      <AnimatePresence>
        {isExamScheduleModalOpen && (
          <motion.div
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm [perspective:1000px]"
            onClick={() => setIsExamScheduleModalOpen(false)}
          >
            <motion.div
              {...FAST_MODAL_FLIP}
              className="relative w-full max-w-6xl rounded-[24px] shadow-2xl overflow-hidden p-0 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >

              <div className="relative z-10 flex flex-col w-full max-h-[90vh] rounded-[20px] overflow-hidden bg-white">
                {/* Header */}
                <div className="py-5 sm:py-6 min-h-[76px] sm:min-h-[84px] flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-r from-blue-700 via-emerald-600 to-amber-500 border-b-2 border-slate-900 shadow-md">
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 38, ease: "linear" }}
                    className="flex items-center gap-2.5 whitespace-nowrap"
                  >
                    <Calendar className="w-6 h-6 text-yellow-300 shrink-0 drop-shadow" strokeWidth={2.5} />
                    <h3 className="text-base sm:text-lg md:text-xl font-black text-white drop-shadow tracking-wide">
                      جدول امتحانات {stageDisplayName.startsWith('المرحلة') ? stageDisplayName : 'المرحلة ' + stageDisplayName} - {selectedGrade || ''} - {semester === 'first' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني'} - 2026 - 2027
                    </h3>
                  </motion.div>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar bg-slate-50/80">
                  {/* Inputs Form */}
                  <div className="bg-[linear-gradient(135deg,#fbcfe8_0%,#fce7f3_35%,#ccfbf1_70%,#99f6e4_100%)] rounded-2xl border-2 border-slate-900 p-4 sm:p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-2 border-b border-slate-900/20 pb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                      <span className="font-black text-sm text-slate-900">
                        {editingScheduleItemId ? 'تعديل مادة في جدول الامتحان :' : 'إضافة مادة إلى جدول الامتحان :'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                      {/* Day */}
                      <div className="flex flex-col gap-1.5 text-right">
                        <label className={`font-black text-xs sm:text-sm flex items-center gap-1.5 ${editingScheduleItemId ? 'text-amber-950' : 'text-slate-900'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${editingScheduleItemId ? 'bg-amber-600 animate-pulse' : 'bg-blue-600'}`} />
                          اليوم :
                        </label>
                        <select
                          value={schedDay}
                          onChange={(e) => setSchedDay(e.target.value)}
                          className={`w-full h-12 px-3 rounded-xl border-2 text-sm sm:text-base focus:outline-none appearance-none [-webkit-appearance:none] [-moz-appearance:none] bg-none text-center cursor-pointer shadow-sm transition-all font-black ${
                            editingScheduleItemId
                              ? 'bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] border-amber-600 text-amber-950 ring-2 ring-amber-400/50 shadow-md'
                              : 'border-slate-900 bg-white text-slate-900 hover:bg-slate-50 focus:border-blue-600 focus:ring-2 ring-blue-500/20'
                          }`}
                          style={{ textAlignLast: 'center' }}
                        >
                          {SCHEDULE_DAYS.map(d => (
                            <option key={d} value={d} className="font-bold">{d}</option>
                          ))}
                        </select>
                      </div>

                      {/* Date */}
                      <div className="flex flex-col gap-1.5 text-right">
                        <label className={`font-black text-xs sm:text-sm flex items-center gap-1.5 ${editingScheduleItemId ? 'text-amber-950' : 'text-slate-900'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${editingScheduleItemId ? 'bg-amber-600 animate-pulse' : 'bg-blue-600'}`} />
                          التاريخ :
                        </label>
                        <input
                          type="date"
                          value={schedDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          className={`w-full h-12 px-3 rounded-xl border-2 text-sm sm:text-base focus:outline-none text-center cursor-pointer shadow-sm font-mono transition-all font-black ${
                            editingScheduleItemId
                              ? 'bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] border-amber-600 text-amber-950 ring-2 ring-amber-400/50 shadow-md'
                              : 'border-slate-900 bg-white text-slate-900 hover:bg-slate-50 focus:border-blue-600 focus:ring-2 ring-blue-500/20'
                          }`}
                        />
                      </div>

                      {/* Period */}
                      <div className="flex flex-col gap-1.5 text-right">
                        <label className={`font-black text-xs sm:text-sm flex items-center gap-1.5 ${editingScheduleItemId ? 'text-amber-950' : 'text-slate-900'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${editingScheduleItemId ? 'bg-amber-600 animate-pulse' : 'bg-blue-600'}`} />
                          الفترة :
                        </label>
                        <select
                          value={schedPeriod}
                          onChange={(e) => setSchedPeriod(e.target.value)}
                          className={`w-full h-12 px-3 rounded-xl border-2 text-sm sm:text-base focus:outline-none appearance-none [-webkit-appearance:none] [-moz-appearance:none] bg-none text-center cursor-pointer shadow-sm transition-all font-black ${
                            editingScheduleItemId
                              ? 'bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] border-amber-600 text-amber-950 ring-2 ring-amber-400/50 shadow-md'
                              : 'border-slate-900 bg-white text-slate-900 hover:bg-slate-50 focus:border-blue-600 focus:ring-2 ring-blue-500/20'
                          }`}
                          style={{ textAlignLast: 'center' }}
                        >
                          {SCHEDULE_PERIODS.map(p => (
                            <option key={p} value={p} className="font-bold">{p}</option>
                          ))}
                        </select>
                      </div>

                      {/* From Time */}
                      <div className="flex flex-col gap-1.5 text-right">
                        <label className={`font-black text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap ${editingScheduleItemId ? 'text-amber-950' : 'text-slate-900'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${editingScheduleItemId ? 'bg-amber-600 animate-pulse' : 'bg-blue-600'}`} />
                          من :
                        </label>
                        <input
                          type="time"
                          value={schedFromTime}
                          onChange={(e) => setSchedFromTime(e.target.value)}
                          className={`w-full h-12 px-3 rounded-xl border-2 text-lg sm:text-xl focus:outline-none text-center cursor-pointer shadow-sm font-mono transition-all font-black ${
                            editingScheduleItemId
                              ? 'bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] border-amber-600 text-amber-950 ring-2 ring-amber-400/50 shadow-md'
                              : 'border-slate-900 bg-white text-slate-900 hover:bg-slate-50 focus:border-blue-600 focus:ring-2 ring-blue-500/20'
                          }`}
                        />
                      </div>

                      {/* To Time */}
                      <div className="flex flex-col gap-1.5 text-right">
                        <label className={`font-black text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap ${editingScheduleItemId ? 'text-amber-950' : 'text-slate-900'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${editingScheduleItemId ? 'bg-amber-600 animate-pulse' : 'bg-blue-600'}`} />
                          إلى :
                        </label>
                        <input
                          type="time"
                          value={schedToTime}
                          onChange={(e) => setSchedToTime(e.target.value)}
                          className={`w-full h-12 px-3 rounded-xl border-2 text-lg sm:text-xl focus:outline-none text-center cursor-pointer shadow-sm font-mono transition-all font-black ${
                            editingScheduleItemId
                              ? 'bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] border-amber-600 text-amber-950 ring-2 ring-amber-400/50 shadow-md'
                              : 'border-slate-900 bg-white text-slate-900 hover:bg-slate-50 focus:border-blue-600 focus:ring-2 ring-blue-500/20'
                          }`}
                        />
                      </div>

                      {/* Subject */}
                      <div className="flex flex-col gap-1.5 text-right">
                        <label className={`font-black text-xs sm:text-sm flex items-center gap-1.5 ${editingScheduleItemId ? 'text-amber-950' : 'text-slate-900'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${editingScheduleItemId ? 'bg-amber-600 animate-pulse' : 'bg-blue-600'}`} />
                          المادة الدراسية :
                        </label>
                        <select
                          value={schedSubject}
                          onChange={(e) => setSchedSubject(e.target.value)}
                          className={`w-full h-12 px-3 rounded-xl border-2 text-sm sm:text-base focus:outline-none appearance-none [-webkit-appearance:none] [-moz-appearance:none] bg-none text-center cursor-pointer shadow-sm transition-all font-black ${
                            editingScheduleItemId
                              ? 'bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] border-amber-600 text-amber-950 ring-2 ring-amber-400/50 shadow-md'
                              : 'border-slate-900 bg-white text-slate-900 hover:bg-slate-50 focus:border-blue-600 focus:ring-2 ring-blue-500/20'
                          }`}
                          style={{ textAlignLast: 'center' }}
                        >
                          {availableSubjectsForSchedule.map(s => (
                            <option key={s} value={s} className="font-bold">{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      {editingScheduleItemId ? (
                        <>
                          <button
                            type="button"
                            onClick={handleCancelEditSchedule}
                            className="h-12 px-5 rounded-xl font-black text-slate-700 bg-white hover:bg-slate-100 transition-all border-2 border-slate-900 active:scale-95 text-sm sm:text-base flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <X className="w-4 h-4" />
                            إلغاء التعديل
                          </button>
                          <button
                            type="button"
                            onClick={handleAddScheduleItem}
                            className="h-12 px-7 rounded-xl font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md border-2 border-slate-900 active:scale-95 text-sm sm:text-base flex items-center justify-center gap-2"
                          >
                            <Check className="w-5 h-5" strokeWidth={3} />
                            حفظ التعديل
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAddScheduleItem}
                          className="w-full sm:w-auto h-12 px-8 rounded-xl font-black text-white bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-700 hover:to-pink-700 transition-all shadow-md border-2 border-slate-900 active:scale-95 text-sm sm:text-base flex items-center justify-center gap-2"
                        >
                          <Plus className="w-5 h-5" strokeWidth={3} />
                          إضافة إلى جدول الامتحان
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Schedule Table */}
                  <div className="bg-[linear-gradient(to_right,#ffffff,#f0fdf4,#ffffff)] bg-[length:200%_auto] animate-shine rounded-2xl border-2 border-slate-900 overflow-hidden shadow-sm flex flex-col">
                    <div className="p-3 bg-slate-100 border-b-2 border-slate-900 flex justify-between items-center">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="font-bold text-xs sm:text-sm text-slate-900 whitespace-nowrap truncate">
                          جدول امتحانات المرحلة {stageDisplayName} - {selectedGrade || ''} - {semester === 'first' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني'} - 2026 - 2027
                        </span>
                      </div>
                      {examSchedule.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من مسح جميع بنود جدول الامتحان؟')) {
                              handleClearSchedule();
                            }
                          }}
                          className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors shrink-0 mr-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          مسح الكل
                        </button>
                      )}
                    </div>

                    {examSchedule.length === 0 ? (
                      <div className="py-12 px-4 flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-blue-500">
                          <Calendar className="w-7 h-7" />
                        </div>
                        <p className="font-black text-slate-700 text-sm">
                          لم يتم إضافة أي مواد إلى جدول الامتحان بعد
                        </p>
                      </div>
                    ) : (
                      <div className="mt-6 overflow-x-auto rounded-2xl border-y-2 border-slate-900 shadow-sm">
                        <table className="w-full text-center border-collapse">
                          <thead>
                            <tr className="bg-slate-200/80 text-slate-900 font-black text-xs sm:text-sm border-b-2 border-slate-900">
                              <th className="py-2.5 px-3 border-l-2 border-slate-900 w-12">م</th>
                              <th className="py-2.5 px-3 border-l-2 border-slate-900">اليوم</th>
                              <th className="py-2.5 px-3 border-l-2 border-slate-900">التاريخ</th>
                              <th className="py-2.5 px-3 border-l-2 border-slate-900">الفترة</th>
                              <th className="py-2.5 px-3 border-l-2 border-slate-900">من</th>
                              <th className="py-2.5 px-3 border-l-2 border-slate-900">إلى</th>
                              <th className="py-2.5 px-3 border-l-2 border-slate-900">المادة الدراسية</th>
                              <th className="py-2.5 px-3 border-l-2 border-slate-900 w-16">تعديل</th>
                              <th className="py-2.5 px-3 w-16">حذف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {examSchedule.map((item, idx) => {
                              const showDay = scheduleRowSpans.showDay[idx];
                              const daySpan = scheduleRowSpans.daySpans[idx];
                              const showDate = scheduleRowSpans.showDate[idx];
                              const dateSpan = scheduleRowSpans.dateSpans[idx];
                              const showPeriod = scheduleRowSpans.showPeriod[idx];
                              const periodSpan = scheduleRowSpans.periodSpans[idx];
                              const showFromTime = scheduleRowSpans.showFromTime[idx];
                              const fromTimeSpan = scheduleRowSpans.fromTimeSpans[idx];
                              const showToTime = scheduleRowSpans.showToTime[idx];
                              const toTimeSpan = scheduleRowSpans.toTimeSpans[idx];

                              const isNewDayDivider = idx > 0 && showDay;
                              const divCls = "";

                              return (
                                <React.Fragment key={item.id}>
                                  {isNewDayDivider && (
                                    <tr key={`sep-${item.id}`} className="bg-white h-5">
                                      <td
                                        colSpan={9}
                                        className="p-0 h-5 border-t-2 border-b-2 border-slate-900 border-l-0 border-r-0 bg-slate-50/50"
                                      >
                                        &nbsp;
                                      </td>
                                    </tr>
                                  )}
                                  <tr
                                    className={`font-bold text-xs sm:text-sm border-b border-slate-300 hover:bg-emerald-50/60 transition-colors ${
                                      editingScheduleItemId === item.id ? 'bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] text-amber-950 ring-2 ring-amber-500 shadow-md font-black' : idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                                    }`}
                                  >
                                    <td className="py-2.5 px-3 border-l-2 border-slate-900 text-slate-600 font-mono">
                                    {formatNumberDigits(String(idx + 1), numberLang)}
                                  </td>
                                  {showDay && (
                                    <td
                                      rowSpan={daySpan}
                                      className={`py-2.5 px-3 border-l-2 border-slate-900 font-black align-middle text-center ${divCls} ${editingScheduleItemId === item.id ? "bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] text-amber-950" : "bg-white text-slate-900"}`}
                                    >
                                      {item.day}
                                    </td>
                                  )}
                                  {showDate && (
                                    <td
                                      rowSpan={dateSpan}
                                      className={`py-2.5 px-3 border-l-2 border-slate-900 font-mono font-black text-base sm:text-lg md:text-xl align-middle text-center ${divCls} ${editingScheduleItemId === item.id ? "bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] text-amber-950" : "bg-white text-slate-900"}`}
                                    >
                                      {item.date ? (
                                        <span dir="rtl" className="inline-block">{formatDateRTL(item.date, numberLang)}</span>
                                      ) : "-"}
                                    </td>
                                  )}
                                  {showPeriod && (
                                    <td
                                      rowSpan={periodSpan}
                                      className={`py-2.5 px-3 border-l-2 border-slate-900 font-black align-middle text-center ${divCls} ${editingScheduleItemId === item.id ? "bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] text-amber-950" : "bg-white text-slate-800"}`}
                                    >
                                      {item.period}
                                    </td>
                                  )}
                                  {showFromTime && (
                                    <td
                                      rowSpan={fromTimeSpan}
                                      className={`py-2.5 px-3 border-l-2 border-slate-900 font-mono font-black text-base sm:text-lg md:text-xl align-middle text-center ${divCls} ${
                                        editingScheduleItemId === item.id
                                          ? "bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] text-amber-950"
                                          : "bg-white text-slate-900"
                                      }`}
                                    >
                                      {item.fromTime && item.fromTime.includes(":") ? (
                                        <span dir="ltr" className="inline-flex items-center justify-center gap-1.5 font-mono font-black">
                                          <span>{formatNumberDigits(item.fromTime.split(":")[0].trim(), numberLang)}</span>
                                          <span>:</span>
                                          <span>{formatNumberDigits(item.fromTime.split(":")[1].trim(), numberLang)}</span>
                                        </span>
                                      ) : item.fromTime ? formatNumberDigits(item.fromTime, numberLang) : "-"}
                                    </td>
                                  )}
                                  {showToTime && (
                                    <td
                                      rowSpan={toTimeSpan}
                                      className={`py-2.5 px-3 border-l-2 border-slate-900 font-mono font-black text-base sm:text-lg md:text-xl align-middle text-center ${divCls} ${
                                        editingScheduleItemId === item.id
                                          ? "bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] text-amber-950"
                                          : "bg-white text-slate-900"
                                      }`}
                                    >
                                      {item.toTime && item.toTime.includes(":") ? (
                                        <span dir="ltr" className="inline-flex items-center justify-center gap-1.5 font-mono font-black">
                                          <span>{formatNumberDigits(item.toTime.split(":")[0].trim(), numberLang)}</span>
                                          <span>:</span>
                                          <span>{formatNumberDigits(item.toTime.split(":")[1].trim(), numberLang)}</span>
                                        </span>
                                      ) : item.toTime ? formatNumberDigits(item.toTime, numberLang) : "-"}
                                    </td>
                                  )}
                                  <td className={`py-2.5 px-3 border-l-2 border-slate-900 font-black text-sm ${divCls} ${editingScheduleItemId === item.id ? "bg-[linear-gradient(135deg,#fef08a_0%,#fde047_50%,#fef08a_100%)] text-amber-950" : "text-blue-950"}`}>
                                    {item.subject}
                                  </td>
                                  <td className={`py-2.5 px-3 border-l-2 border-slate-900 text-center ${divCls}`}>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditScheduleItem(item)}
                                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                                      title="تعديل هذا البند"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                  </td>
                                  <td className={`py-2.5 px-3 text-center ${divCls}`}>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteScheduleItem(item.id)}
                                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                                      title="حذف هذا البند"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-100 border-t-2 border-slate-900 p-4 sm:p-5 flex justify-between items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={examSchedule.length === 0}
                      onClick={handlePrintExamSchedule}
                      className="h-12 px-6 rounded-xl font-black text-white bg-[linear-gradient(to_right,#059669,#10b981,#059669)] hover:bg-[linear-gradient(to_right,#047857,#059669,#047857)] bg-[length:200%_auto] animate-shine transition-all shadow-md border-2 border-slate-900 active:scale-95 text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <FileDown className="w-5 h-5" strokeWidth={2.5} />
                      تصدير إلى PDF
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsExamScheduleModalOpen(false)}
                    className="h-12 px-8 rounded-xl font-black text-slate-800 bg-white hover:bg-slate-200 transition-colors border-2 border-slate-900 shadow-sm active:scale-95 text-sm sm:text-base flex items-center justify-center"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Modal Overlay */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-900/70 backdrop-blur-sm [perspective:1000px]"
            onClick={() => setShowInstructions(false)}
          >
            <motion.div
              {...FAST_MODAL_FLIP}
              className="relative w-full max-w-2xl rounded-3xl border-2 border-slate-900 overflow-hidden shadow-2xl p-[8px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-[-100%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_70%,#ffffff_90%,transparent_100%)] pointer-events-none" />
              
              <div className="relative z-10 w-full p-6 md:p-8 rounded-2xl bg-white bg-[linear-gradient(to_right,rgba(254,240,138,0.75),rgba(250,204,21,0.75),rgba(234,179,8,0.75),rgba(250,204,21,0.75),rgba(254,240,138,0.75))] bg-[length:200%_auto] animate-shine flex flex-col items-center gap-6">
                <div className="w-16 h-16 flex items-center justify-center shrink-0">
                  <Info className="w-8 h-8 text-black" />
                </div>
                
                <div className="text-yellow-950 text-sm md:text-base font-bold leading-relaxed space-y-4 w-full text-justify" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).sortInst1}</span></p>
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).sortInst2}</span></p>
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).sortInst3}</span></p>
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).sortInst4}</span></p>
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).sortInst5}</span></p>
                  <p className="flex gap-2 items-start"><span className="text-red-600 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).sortInst6}</span></p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInstructions(false)}
                  className="mt-4 w-full md:w-auto px-12 py-3 bg-[linear-gradient(to_right,#000000,#6b7280,#1f2937,#6b7280,#000000)] bg-[length:200%_auto] animate-shine text-white font-bold text-lg rounded-xl transition-all active:scale-[0.98] border border-white shadow-md"
                >
                  {lang === 'ar' ? 'حسنا' : 'OK'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isColorModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <motion.div
              {...FAST_BACKDROP_FADE}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsColorModalOpen(false)}
            />
            <motion.div
              {...FAST_MODAL_FLIP}
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
                  storageKey="students_data_row_theme"
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
      </AnimatePresence>

      {/* Committee Size Modal (Separate window / settings per semester) */}
      <AnimatePresence>
        {isCommitteeSizeModalOpen && (() => {
          const isFirstSemModal = committeeModalSemester === 'first';
          const activeCommSize = isFirstSemModal ? committeeSizeFirst : committeeSizeSecond;
          const activeMergeLast = isFirstSemModal ? mergeLastCommitteeFirst : mergeLastCommitteeSecond;
          const semName = isFirstSemModal ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثانى';
          let modalSubtitle = title || '';
          if (/الفصل\s+الدراس[يى]\s+(الأول|الثان[يى])/i.test(modalSubtitle)) {
            modalSubtitle = modalSubtitle.replace(/الفصل\s+الدراس[يى]\s+(الأول|الثان[يى])/g, semName);
          } else {
            modalSubtitle = `${stage || ''} - ${selectedGrade || ''} - ${semName} - 2026 - 2027`;
          }

          return (
          <motion.div 
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" 
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            onClick={() => setIsCommitteeSizeModalOpen(false)}
          >
            <motion.div 
              {...FAST_MODAL_FLIP}
              className="relative w-full max-w-2xl rounded-[24px] shadow-2xl overflow-hidden p-[4px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_30%,#ffffff_50%,#ffffff_70%,transparent_100%)] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col w-full h-full rounded-[20px] overflow-hidden border-2 border-slate-900 bg-white">
                <div className={`bg-[length:200%_auto] animate-shine border-b-2 border-slate-900 p-5 flex flex-col items-center justify-center text-center gap-1.5 ${
                  isFirstSemModal
                    ? 'bg-[linear-gradient(to_right,#059669,#14b8a6,#0d9488,#059669)]'
                    : 'bg-[linear-gradient(to_right,#0284c7,#06b6d4,#0369a1,#0284c7)]'
                }`}>
                  <h3 className="text-xl font-bold text-white">
                    إعدادات اللجنة
                  </h3>
                  <p className="text-white/90 font-bold text-xs sm:text-sm leading-relaxed">
                    <span style={(stage === 'secondary' || (title && title.includes('المرحلة الثانوية'))) ? { fontSize: '85%' } : undefined} className="inline-block">
                      {formatNumberDigits(modalSubtitle, numberLang)}
                    </span>
                  </p>
                </div>

                <div className={`p-6 sm:p-8 flex flex-col items-center gap-5 bg-[length:200%_auto] animate-shine ${
                  isFirstSemModal
                    ? 'bg-[linear-gradient(to_right,#ccfbf1,#d1fae5,#cffafe,#ccfbf1,#d1fae5)]'
                    : 'bg-[linear-gradient(to_right,#e0f2fe,#bae6fd,#e0f2fe,#bae6fd)]'
                }`}>
                  <div className="w-full max-w-xs relative flex flex-col gap-2">
                    <label className="text-slate-800 font-bold text-center">
                      {(t as any).studentsPerCommitteeLabel || 'عدد الطلاب فى اللجنة الواحدة'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={activeCommSize}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          if (isFirstSemModal) setCommitteeSizeFirst('');
                          else setCommitteeSizeSecond('');
                        } else {
                          const num = parseInt(raw, 10);
                          if (!isNaN(num) && num >= 1) {
                            if (isFirstSemModal) setCommitteeSizeFirst(num);
                            else setCommitteeSizeSecond(num);
                          }
                        }
                      }}
                      onBlur={() => {
                        if (isFirstSemModal) {
                          if (committeeSizeFirst === '' || Number(committeeSizeFirst) < 1) {
                            setCommitteeSizeFirst(20);
                          }
                        } else {
                          if (committeeSizeSecond === '' || Number(committeeSizeSecond) < 1) {
                            setCommitteeSizeSecond(20);
                          }
                        }
                      }}
                      className="w-full bg-white/80 backdrop-blur-sm border-2 border-slate-900 p-4 rounded-xl text-center font-bold text-3xl text-slate-800 outline-none focus:ring-4 ring-emerald-500/40 focus:border-emerald-700 transition-all shadow-inner"
                      dir="ltr"
                    />
                  </div>

                  <div className="w-full bg-white/85 backdrop-blur-sm border-2 border-slate-900 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm text-right">
                    <div className="text-center border-b border-slate-300 pb-2.5">
                      <p className="text-slate-900 font-black text-base sm:text-lg mb-1">
                        {applyEntityTerms('شرط تقديرى يخضع لإدارة أعمال الإمتحانات بالمدرسة')}
                      </p>
                      <p className="text-slate-700 font-bold text-[11px] sm:text-xs whitespace-nowrap leading-relaxed">
                        فى حالة عدم استيفاء عدد طلاب اللجنة الأخيرة الحد المسموح به من عدد الطلاب فى اللجنة الواحدة.
                      </p>
                    </div>

                    <label
                      onClick={() => {
                        if (isFirstSemModal) setMergeLastCommitteeFirst(true);
                        else setMergeLastCommitteeSecond(true);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                        activeMergeLast
                          ? isFirstSemModal
                            ? 'bg-emerald-50 border-emerald-700 text-emerald-950 shadow-sm'
                            : 'bg-blue-50 border-blue-700 text-blue-950 shadow-sm'
                          : 'bg-white/70 border-slate-300 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={activeMergeLast}
                        onChange={() => {
                          if (isFirstSemModal) setMergeLastCommitteeFirst(true);
                          else setMergeLastCommitteeSecond(true);
                        }}
                        className="w-5 h-5 accent-emerald-600 rounded cursor-pointer shrink-0"
                      />
                      <span className="font-bold text-xs sm:text-sm leading-snug">
                        إضافة طلاب اللجنة الأخيرة إلى اللجنة السابقة لها
                      </span>
                    </label>

                    <label
                      onClick={() => {
                        if (isFirstSemModal) setMergeLastCommitteeFirst(false);
                        else setMergeLastCommitteeSecond(false);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                        !activeMergeLast
                          ? isFirstSemModal
                            ? 'bg-emerald-50 border-emerald-700 text-emerald-950 shadow-sm'
                            : 'bg-blue-50 border-blue-700 text-blue-950 shadow-sm'
                          : 'bg-white/70 border-slate-300 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!activeMergeLast}
                        onChange={() => {
                          if (isFirstSemModal) setMergeLastCommitteeFirst(false);
                          else setMergeLastCommitteeSecond(false);
                        }}
                        className="w-5 h-5 accent-emerald-600 rounded cursor-pointer shrink-0"
                      />
                      <span className="font-bold text-xs sm:text-sm leading-snug">
                        عدم إضافة طلاب اللجنة الأخيرة إلى اللجنة السابقة لها
                      </span>
                    </label>
                  </div>

                  {(() => {
                    const countPerComm = typeof activeCommSize === 'number' && activeCommSize >= 1 ? activeCommSize : 20;
                    const total = data.length;
                    const fullComms = Math.floor(total / countPerComm);
                    const hasIncLast = total > countPerComm && total % countPerComm !== 0;
                    const committeesCount =
                      total === 0
                        ? 0
                        : activeMergeLast && hasIncLast
                        ? fullComms
                        : Math.ceil(total / countPerComm);
                    return (
                      <div className="w-full bg-white/85 backdrop-blur-sm border-2 border-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm">
                        <span className="text-slate-800 font-black text-sm sm:text-base text-center">
                          عدد اللجان وفقا للإعدادات السابقة
                        </span>
                        <div className={`w-20 h-20 rounded-full border-2 border-slate-900 shadow-lg flex items-center justify-center text-white font-black text-3xl font-mono ${
                          isFirstSemModal
                            ? 'bg-[linear-gradient(135deg,#059669,#14b8a6,#0d9488)]'
                            : 'bg-[linear-gradient(135deg,#0284c7,#06b6d4,#0369a1)]'
                        }`}>
                          {formatNumberDigits(committeesCount, numberLang)}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50/95 border-2 border-amber-500 text-amber-900 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span className="font-black text-xs sm:text-sm text-center">
                      {`هذه الإعدادات مخصصة للصف الحالى فقط - ${isFirstSemModal ? 'الفصل الدراسى الأول' : 'الفصل الدراسى الثانى'}`}
                    </span>
                  </div>
                </div>

                <div className={`bg-[length:200%_auto] animate-shine border-t-2 border-slate-900 p-4 flex justify-center items-center ${
                  isFirstSemModal
                    ? 'bg-[linear-gradient(to_right,#059669,#14b8a6,#0d9488,#059669)]'
                    : 'bg-[linear-gradient(to_right,#0284c7,#06b6d4,#0369a1,#0284c7)]'
                }`}>
                  <button
                    onClick={() => setIsCommitteeSizeModalOpen(false)}
                    className="w-14 h-14 flex items-center justify-center rounded-full font-bold text-white bg-red-600 hover:bg-red-700 transition-transform hover:scale-105 border-2 border-slate-900 shadow-md active:scale-95 shrink-0"
                  >
                    <X className="w-8 h-8" strokeWidth={3} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Seat Number Modal */}
      <AnimatePresence>
        {isSeatNumModalOpen && (
          <motion.div 
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" 
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            onClick={() => setIsSeatNumModalOpen(false)}
          >
            <motion.div 
              {...FAST_MODAL_FLIP}
              className="relative w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden p-[4px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Slow Moving Light Glow */}
              <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_30%,#ffffff_50%,#ffffff_70%,transparent_100%)] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col w-full h-full rounded-[20px] overflow-hidden border-2 border-slate-900 bg-white">
                <div className="bg-[linear-gradient(to_right,#0d9488,#059669,#0891b2,#0d9488,#059669)] bg-[length:200%_auto] animate-shine border-b-2 border-slate-900 p-6 flex items-center justify-center text-center">
                  <div>
                    <h3 className="text-xl font-bold text-white">{(t as any).generateSeatNumbers}</h3>
                  </div>
                </div>

                <div className="p-8 flex flex-col items-center bg-[linear-gradient(to_right,#ccfbf1,#d1fae5,#cffafe,#ccfbf1,#d1fae5)] bg-[length:200%_auto] animate-shine">
                  <div className="w-full max-w-xs relative flex flex-col gap-2">
                    <label className="text-slate-800 font-bold text-center">
                      {(t as any).seatNumberStartLabel}
                    </label>
                    <input
                      type="number"
                      value={seatNumStart}
                      onChange={(e) => setSeatNumStart(parseInt(e.target.value) || 0)}
                      className="w-full bg-white/80 backdrop-blur-sm border-2 border-slate-900 p-4 rounded-xl text-center font-bold text-3xl text-slate-800 outline-none focus:ring-4 ring-emerald-500/40 focus:border-emerald-700 transition-all shadow-inner"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="bg-[linear-gradient(to_right,#0d9488,#059669,#0891b2,#0d9488,#059669)] bg-[length:200%_auto] animate-shine border-t-2 border-slate-900 p-6 flex justify-end gap-3 items-center">
                  <button
                    onClick={handleGenerateSeatNumbers}
                    className="flex-1 py-3 px-6 rounded-xl font-bold text-white bg-slate-900 hover:bg-black transition-all shadow-md border-2 border-white active:scale-95 text-lg"
                  >
                    {(t as any).insertSeatNumbers}
                  </button>
                  <button
                    onClick={() => setIsSeatNumModalOpen(false)}
                    className="w-14 h-14 flex items-center justify-center rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors border-2 border-slate-900 shadow-md active:scale-95 shrink-0"
                  >
                    <X className="w-8 h-8" strokeWidth={3} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secret Number Modal */}
      <AnimatePresence>
        {isSecretNumModalOpen && (
          <motion.div 
            {...FAST_BACKDROP_FADE}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" 
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            onClick={() => setIsSecretNumModalOpen(false)}
          >
            <motion.div 
              {...FAST_MODAL_FLIP}
              className="relative w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden p-[4px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Slow Moving Light Glow */}
              <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_30%,#ffffff_50%,#ffffff_70%,transparent_100%)] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col w-full h-full rounded-[20px] overflow-hidden border-2 border-slate-900 bg-white">
                <div className="bg-[linear-gradient(to_right,#be123c,#db2777,#c2410c,#be123c,#db2777)] bg-[length:200%_auto] animate-shine border-b-2 border-slate-900 p-6 flex items-center justify-center text-center">
                  <div>
                    <h3 className="text-xl font-bold text-white">{(t as any).generateSecretNumbers}</h3>
                  </div>
                </div>

                <div className="p-8 flex flex-col items-center bg-[linear-gradient(to_right,#ffe4e6,#fce7f3,#ffedd5,#ffe4e6,#fce7f3)] bg-[length:200%_auto] animate-shine gap-6">
                  <div className="w-full max-w-xs relative flex flex-col gap-2">
                    <label className="text-slate-800 font-bold text-center">
                      {(t as any).secretNumberStartLabel}
                    </label>
                    <input
                      type="number"
                      value={secretNumStart}
                      onChange={(e) => setSecretNumStart(parseInt(e.target.value) || 0)}
                      className="w-full bg-white/80 backdrop-blur-sm border-2 border-slate-900 p-4 rounded-xl text-center font-bold text-3xl text-slate-800 outline-none focus:ring-4 ring-rose-500/40 focus:border-rose-700 transition-all shadow-inner"
                      dir="ltr"
                    />
                  </div>

                  <div className="w-full max-w-xs relative flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center justify-start gap-2.5 px-3 py-2 rounded-xl bg-white/80 border-2 border-slate-900 hover:bg-white transition-all cursor-pointer select-none shadow-xs">
                        <input
                          type="checkbox"
                          checked={enableSkipMultiple1}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setEnableSkipMultiple1(isChecked);
                            if (isChecked) {
                              setSecretNumSkipMultiple(lastValidSkip1 > 0 ? lastValidSkip1 : 5);
                            } else {
                              if (typeof secretNumSkipMultiple === 'number' && secretNumSkipMultiple > 0) {
                                setLastValidSkip1(secretNumSkipMultiple);
                              }
                              setSecretNumSkipMultiple('');
                            }
                          }}
                          className="w-5 h-5 rounded border-2 border-slate-900 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600 shrink-0"
                        />
                        <span className="text-slate-800 font-bold text-sm">
                          {(t as any).skipMultiplesLabel}
                        </span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        disabled={!enableSkipMultiple1}
                        value={enableSkipMultiple1 ? secretNumSkipMultiple : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value);
                          if (typeof val === 'number' && val <= 0) return;
                          setSecretNumSkipMultiple(val);
                          if (typeof val === 'number' && val > 0) setLastValidSkip1(val);
                          if (val !== '' && val === secretNumSkipMultiple2) {
                            setSecretNumSkipMultiple2('');
                          }
                        }}
                        placeholder={(t as any).skipMultiplesPlaceholder}
                        className={`w-full border-2 border-slate-900 p-4 rounded-xl text-center font-bold text-3xl transition-all shadow-inner ${
                          enableSkipMultiple1
                            ? 'bg-white/90 backdrop-blur-sm text-slate-800 outline-none focus:ring-4 ring-rose-500/40 focus:border-rose-700 cursor-text'
                            : 'bg-slate-200/50 text-slate-400 border-slate-400 cursor-not-allowed opacity-50'
                        }`}
                        dir="ltr"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center justify-start gap-2.5 px-3 py-2 rounded-xl bg-white/80 border-2 border-slate-900 hover:bg-white transition-all cursor-pointer select-none shadow-xs">
                        <input
                          type="checkbox"
                          checked={enableSkipMultiple2}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setEnableSkipMultiple2(isChecked);
                            if (isChecked) {
                              const fallback = (lastValidSkip2 > 0 && lastValidSkip2 !== secretNumSkipMultiple) ? lastValidSkip2 : (secretNumSkipMultiple === 9 ? 7 : 9);
                              setSecretNumSkipMultiple2(fallback);
                            } else {
                              if (typeof secretNumSkipMultiple2 === 'number' && secretNumSkipMultiple2 > 0) {
                                setLastValidSkip2(secretNumSkipMultiple2);
                              }
                              setSecretNumSkipMultiple2('');
                            }
                          }}
                          className="w-5 h-5 rounded border-2 border-slate-900 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600 shrink-0"
                        />
                        <span className="text-slate-800 font-bold text-sm">
                          {(t as any).skipMultiplesLabel}
                        </span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        disabled={!enableSkipMultiple2}
                        value={enableSkipMultiple2 ? secretNumSkipMultiple2 : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value);
                          if (typeof val === 'number' && val <= 0) return;
                          if (val !== '' && val === secretNumSkipMultiple) return;
                          setSecretNumSkipMultiple2(val);
                          if (typeof val === 'number' && val > 0) setLastValidSkip2(val);
                        }}
                        placeholder={(t as any).skipMultiplesPlaceholder}
                        className={`w-full border-2 border-slate-900 p-4 rounded-xl text-center font-bold text-3xl transition-all shadow-inner ${
                          enableSkipMultiple2
                            ? 'bg-white/90 backdrop-blur-sm text-slate-800 outline-none focus:ring-4 ring-rose-500/40 focus:border-rose-700 cursor-text'
                            : 'bg-slate-200/50 text-slate-400 border-slate-400 cursor-not-allowed opacity-50'
                        }`}
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[linear-gradient(to_right,#be123c,#db2777,#c2410c,#be123c,#db2777)] bg-[length:200%_auto] animate-shine border-t-2 border-slate-900 p-6 flex justify-end gap-3 items-center">
                  <button
                    onClick={handleGenerateSecretNumbers}
                    className="flex-1 py-3 px-6 rounded-xl font-bold text-white bg-slate-900 hover:bg-black transition-all shadow-md border-2 border-white active:scale-95 text-lg"
                  >
                    {(t as any).insertSecretNumbers}
                  </button>
                  <button
                    onClick={() => setIsSecretNumModalOpen(false)}
                    className="w-14 h-14 flex items-center justify-center rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors border-2 border-slate-900 shadow-md active:scale-95 shrink-0"
                  >
                    <X className="w-8 h-8" strokeWidth={3} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        {isSeatNumbersModalOpen && (
          <SeatNumbersModal
            isOpen={isSeatNumbersModalOpen}
            onClose={() => setIsSeatNumbersModalOpen(false)}
            isEnglish={isSeatNumbersEnglish}
            onSelectModel={async (modelReportType) => {
              setIsSeatNumbersModalOpen(false);
              await executePrintOption(modelReportType);
            }}
          />
        )}
      </Suspense>
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
        vipOptionTitle="SEAT NUMBERS IN ENGLISH"
        showFullVipTitle={true}
        modalLang="en"
        customWhatsappMessage="السلام عليكم .. أود تحميل ارقام الجلوس باللغة الانجليزية - معرف جهازي : ID : x"
        skipActivation={true}
        showExampleButton={true}
      />
      <PasswordModal
        isOpen={showSeatNumbersScheduleEnPasswordModal}
        onClose={() => setShowSeatNumbersScheduleEnPasswordModal(false)}
        onSuccess={() => {
          localStorage.setItem('sheet_control_seat_numbers_schedule_en_unlocked_for_id', String(getDeviceId()));
          localStorage.removeItem('sheet_control_seat_numbers_schedule_en_random_id');
          setShowSeatNumbersScheduleEnPasswordModal(false);
          executePrintOption('seat_numbers_with_schedule_english');
        }}
        deviceIdOverride={seatNumbersScheduleEnRandomId}
        isVipOption={true}
        vipOptionTitle="SEAT NUMBERS WITH IN EXAM SCHEDULE"
        showFullVipTitle={true}
        modalLang="en"
        customWhatsappMessage="السلام عليكم .. أود تحميل أرقام الجلوس بجدول الإمتحانات باللغة الإنجليزية - معرف جهازي : ID : x"
        skipActivation={true}
        showExampleButton={true}
        exampleVariant="seat_numbers_with_schedule"
      />

      <Suspense fallback={null}>
        {isCustomControlSheetModalOpen && (
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
        )}

        {isMercyPrintModalOpen && (
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
            students={data}
          />
        )}

        {isAdvancedStatsModalOpen && (
          <AdvancedStatsModal
            isOpen={isAdvancedStatsModalOpen}
            onClose={() => setIsAdvancedStatsModalOpen(false)}
            students={data}
            stage={stage}
            selectedGrade={selectedGrade}
            semester={semester}
            schoolName={schoolName}
            administration={administration}
            lang={lang}
          />
        )}

        {isTopTenCertModalOpen && (
          <TopTenCertificatesModal
            isOpen={isTopTenCertModalOpen}
            onClose={() => setIsTopTenCertModalOpen(false)}
            students={filteredData}
            stage={stage}
            selectedGrade={selectedGrade}
            semester={semester}
            schoolName={schoolName}
            administration={administration}
            isDamgOnly={isTopTenCertDamg}
          />
        )}
      </Suspense>

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
        vipOptionTitle="شيت كنترول مخصص"
        customWhatsappMessage="السلام عليكم .. أود تفعيل تخصيص شيت كنترول - معرف جهازي :"
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
        vipOptionTitle="CERTIFICATES IN ENGLISH"
        showFullVipTitle={true}
        modalLang="en"
        customWhatsappMessage="السلام عليكم .. أود تحميل شهادات باللغة الانجليزية - معرف جهازي : ID : x"
        showExampleButton={true}
        exampleVariant="english_cert"
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
        vipOptionTitle="شيت كنترول فارغ"
        customWhatsappMessage="السلام عليكم .. أود تفعيل شيت كنترول فارغ - معرف جهازي :"
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

      <Suspense fallback={null}>
        {isAllStudentsCertModalOpen && (
          <AllStudentsCertificatesModal
            isOpen={isAllStudentsCertModalOpen}
            onClose={() => setIsAllStudentsCertModalOpen(false)}
            students={data}
            stage={stage}
            selectedGrade={selectedGrade}
            semester={semester}
            schoolName={schoolName}
            administration={administration}
          />
        )}
      </Suspense>
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
        showExampleButton={true}
        exampleVariant="appreciation_cert"
      />

      <Suspense fallback={null}>
        {isExportExcelModalOpen && (
          <ExportExcelModal
            isOpen={isExportExcelModalOpen}
            onClose={() => setIsExportExcelModalOpen(false)}
            students={data}
            stage={stage}
            selectedGrade={selectedGrade}
            educationType={educationType}
          />
        )}
        {isCertSelectionModalOpen && (
          <CertificatesSelectionModal
            isOpen={isCertSelectionModalOpen}
            onClose={() => setIsCertSelectionModalOpen(false)}
            onSelectTopTen={() => handlePrintOption('top_ten_students_certificates')}
            onSelectTopTenDamg={() => handlePrintOption('top_ten_damg_students_certificates')}
            onSelectAllStudents={() => handlePrintOption('all_students_certificates' as any)}
          />
        )}
      </Suspense>
      <AnimatePresence>
        {downloadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-6 py-4 rounded-xl font-bold shadow-2xl border-2 border-white"
          >
            تم تنزيل الملف بنجاح
          </motion.div>
        )}
      </AnimatePresence>
      <PrePrintAuditModal
        isOpen={auditModalState.isOpen}
        onClose={() => setAuditModalState({ isOpen: false, isPrintTrigger: false })}
        auditResult={auditResult}
        onNavigateToStudent={(studentId) => handleJumpToStudent(studentId)}
        onProceedToPrint={() => setIsPrintMenuOpen(true)}
        isPrintTrigger={auditModalState.isPrintTrigger}
      />
      <EditStudentDataModal
        student={editingStudentState?.student || null}
        rowNumber={editingStudentState?.rowNumber}
        onClose={() => setEditingStudentState(null)}
        onSave={(updatedStudent) => {
          userEditedExamNumbersRef.current = true;
          onChange(data.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)), true);
          setEditingStudentState(null);
        }}
        semester={semester}
        stage={stage}
        selectedGrade={selectedGrade}
        educationType={educationType}
        showExamFields={showExamFields}
        availableClasses={availableClasses}
        numberLang={numberLang}
        lang={lang}
      />
    </div>
  );
};
