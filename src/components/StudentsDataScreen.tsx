import React, { useState, useEffect } from 'react';
import { translations, applyEntityTerms } from '../i18n';
import { Language, StudentData } from '../types';
import { ArrowLeft, ArrowRight, Save, Plus, Trash2, Search, Menu, ChevronDown, ArrowDownUp, Check, X, ArrowUp, ArrowDown, Info, Printer, FileSpreadsheet, PieChart, Edit, Calendar, PenTool, AlertTriangle, Languages, Palette, Sliders, BarChart3, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActionMenuButton } from './ActionMenuButton';
import { GradingSettingsModal } from './GradingSettingsModal';
import { SeatNumbersModal } from './SeatNumbersModal';
import { CustomControlSheetModal } from './CustomControlSheetModal';
import { AdvancedStatsModal } from './AdvancedStatsModal';
import { ensureCellVisible } from '../utils/cellNavigation';
import { exportStudentsDataToPdf, getSubjectsConfigForStageGrade, PdfReportType, RowBgTheme, CustomControlSheetOptions } from '../utils/exportPdf';
import { RowThemeSelector, getTableRowColorStyle } from './RowThemeSelector';
import { TopTenCertificatesModal } from './TopTenCertificatesModal';
import { AllStudentsCertificatesModal } from './AllStudentsCertificatesModal';
import { CertificatesSelectionModal } from './CertificatesSelectionModal';
import { PasswordModal } from './PasswordModal';
import { isPaidUnlocked, getDeviceId } from '../utils/activationManager';

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
}

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
  onChange,
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
}) => {
  const t = translations[lang];
  const isKindergarten = stage === 'kindergarten';
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
  const [isEditingData, setIsEditingData] = useState(false);
  const frozenIdsRef = React.useRef<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalText, setModalText] = useState('');
  const [studentToDelete, setStudentToDelete] = useState<StudentData | null>(null);
  const [isNationalIdModalOpen, setIsNationalIdModalOpen] = useState(false);
  const [nationalIdModalText, setNationalIdModalText] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
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
  const [studentNameEnModal, setStudentNameEnModal] = useState<{
    studentId: string;
    arName: string;
    index: number;
  } | null>(null);
  const [tempStudentNameEn, setTempStudentNameEn] = useState('');

  const capitalizeEachWord = (val: string) =>
    val.replace(/(^|[\s.\-/]+)([a-z])/g, (_, sep, char) => sep + char.toUpperCase());

  const openStudentNameEnModal = (student: StudentData, index: number) => {
    setTempStudentNameEn(capitalizeEachWord(student.nameEn || ''));
    setStudentNameEnModal({
      studentId: student.id,
      arName: student.name || (isKindergarten ? `تلميذ رقم ${index + 1}` : `طالب رقم ${index + 1}`),
      index,
    });
  };

  const handleSaveStudentNameEn = () => {
    if (!studentNameEnModal) return;
    const trimmed = capitalizeEachWord(tempStudentNameEn.trim());
    onChange(
      data.map((s) =>
        s.id === studentNameEnModal.studentId ? { ...s, nameEn: trimmed } : s
      )
    );
    setStudentNameEnModal(null);
  };
  
  const [isSeatNumModalOpen, setIsSeatNumModalOpen] = useState(false);
  const [isSecretNumModalOpen, setIsSecretNumModalOpen] = useState(false);
  const committeeStorageKey = `${stage || 'default'}_${selectedGrade || 'default'}`;
  const numberingStorageKey = `${committeeStorageKey}_${semester || 'first'}`;

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
  const [committeeModalSemester, setCommitteeModalSemester] = useState<'first' | 'second'>(semester === 'second' ? 'second' : 'first');

  const [committeeSizeFirst, setCommitteeSizeFirst] = useState<number | ''>(() => {
    try {
      const byGradeRaw = localStorage.getItem('sheet_control_committee_settings_by_grade');
      if (byGradeRaw) {
        const parsed = JSON.parse(byGradeRaw);
        const semVal = Number(parsed?.[`${committeeStorageKey}_first`]?.committeeSize);
        if (semVal >= 1) return semVal;
        const legacyVal = Number(parsed?.[committeeStorageKey]?.committeeSize);
        if (legacyVal >= 1) return legacyVal;
      }
      const globalRaw = localStorage.getItem('sheet_control_committee_size');
      if (globalRaw) {
        const parsedGlobal = Number(globalRaw);
        if (parsedGlobal >= 1) return parsedGlobal;
      }
    } catch {}
    return 20;
  });

  const [mergeLastCommitteeFirst, setMergeLastCommitteeFirst] = useState<boolean>(() => {
    try {
      const byGradeRaw = localStorage.getItem('sheet_control_committee_settings_by_grade');
      if (byGradeRaw) {
        const parsed = JSON.parse(byGradeRaw);
        if (typeof parsed?.[`${committeeStorageKey}_first`]?.mergeLastCommittee === 'boolean') {
          return parsed[`${committeeStorageKey}_first`].mergeLastCommittee;
        }
        if (typeof parsed?.[committeeStorageKey]?.mergeLastCommittee === 'boolean') {
          return parsed[committeeStorageKey].mergeLastCommittee;
        }
      }
      const globalMerge = localStorage.getItem('sheet_control_merge_last_committee');
      if (globalMerge !== null) {
        return globalMerge === 'true';
      }
    } catch {}
    return false;
  });

  const [committeeSizeSecond, setCommitteeSizeSecond] = useState<number | ''>(() => {
    try {
      const byGradeRaw = localStorage.getItem('sheet_control_committee_settings_by_grade');
      if (byGradeRaw) {
        const parsed = JSON.parse(byGradeRaw);
        const semVal = Number(parsed?.[`${committeeStorageKey}_second`]?.committeeSize);
        if (semVal >= 1) return semVal;
        const legacyVal = Number(parsed?.[committeeStorageKey]?.committeeSize);
        if (legacyVal >= 1) return legacyVal;
      }
      const globalRaw = localStorage.getItem('sheet_control_committee_size');
      if (globalRaw) {
        const parsedGlobal = Number(globalRaw);
        if (parsedGlobal >= 1) return parsedGlobal;
      }
    } catch {}
    return 20;
  });

  const [mergeLastCommitteeSecond, setMergeLastCommitteeSecond] = useState<boolean>(() => {
    try {
      const byGradeRaw = localStorage.getItem('sheet_control_committee_settings_by_grade');
      if (byGradeRaw) {
        const parsed = JSON.parse(byGradeRaw);
        if (typeof parsed?.[`${committeeStorageKey}_second`]?.mergeLastCommittee === 'boolean') {
          return parsed[`${committeeStorageKey}_second`].mergeLastCommittee;
        }
        if (typeof parsed?.[committeeStorageKey]?.mergeLastCommittee === 'boolean') {
          return parsed[committeeStorageKey].mergeLastCommittee;
        }
      }
      const globalMerge = localStorage.getItem('sheet_control_merge_last_committee');
      if (globalMerge !== null) {
        return globalMerge === 'true';
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    try {
      const byGradeRaw = localStorage.getItem('sheet_control_committee_settings_by_grade');
      if (byGradeRaw) {
        const parsed = JSON.parse(byGradeRaw);
        const entryFirst = parsed?.[`${committeeStorageKey}_first`] ?? parsed?.[committeeStorageKey];
        if (entryFirst) {
          if (Number(entryFirst.committeeSize) >= 1) {
            setCommitteeSizeFirst(Number(entryFirst.committeeSize));
          }
          if (typeof entryFirst.mergeLastCommittee === 'boolean') {
            setMergeLastCommitteeFirst(entryFirst.mergeLastCommittee);
          }
        }
        const entrySecond = parsed?.[`${committeeStorageKey}_second`] ?? parsed?.[committeeStorageKey];
        if (entrySecond) {
          if (Number(entrySecond.committeeSize) >= 1) {
            setCommitteeSizeSecond(Number(entrySecond.committeeSize));
          }
          if (typeof entrySecond.mergeLastCommittee === 'boolean') {
            setMergeLastCommitteeSecond(entrySecond.mergeLastCommittee);
          }
        }
      }
    } catch {}
  }, [committeeStorageKey]);

  useEffect(() => {
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

      localStorage.setItem('sheet_control_committee_size', String(currentValidSize));
      localStorage.setItem('sheet_control_merge_last_committee', String(currentMerge));
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
            setSecretNumSkipMultiple(entry.secretNumSkipMultiple === '' ? '' : Number(entry.secretNumSkipMultiple));
          }
          if (entry.secretNumSkipMultiple2 !== undefined) {
            setSecretNumSkipMultiple2(entry.secretNumSkipMultiple2 === '' ? '' : Number(entry.secretNumSkipMultiple2));
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
        secretNumSkipMultiple,
        secretNumSkipMultiple2,
      };
      localStorage.setItem('sheet_control_numbering_settings_by_grade', JSON.stringify(parsed));
    } catch {}
  }, [seatNumStart, secretNumStart, secretNumSkipMultiple, secretNumSkipMultiple2, numberingStorageKey]);
  
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
      systemType,
      isHomeschool,
      customControlSheetOptions,
      subjectKey: subjectInfo?.key,
      subjectLabel: subjectInfo?.label,
      screenSubtitle: 'تحرير البيانات',
      administration,
      schoolName,
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
      normalizeStatusForGrade,
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
      onChange(updated);
    }
  }, [isFirstGrade, data, onChange, t]);

  const handleRemoveRow = (id: string) => {
    onChange(data.filter(s => s.id !== id));
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
    onChange(data.map(s => {
      if (s.id === id) {
        let valToSet = value;
        if (field === 'enrollmentStatus') {
          valToSet = normalizeStatusForGrade(value, isFirstGrade, s.gender);
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
    }));
  };

  const handleSemesterFieldChange = (id: string, field: 'seatNumbers' | 'secretNumbers' | 'committeeNumbers', value: string) => {
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
        ? secretNumSkipMultiple
        : (semSaved.secretNumSkipMultiple !== undefined ? semSaved.secretNumSkipMultiple : secretNumSkipMultiple);
      const rawSkip2 = sem === semester
        ? secretNumSkipMultiple2
        : (semSaved.secretNumSkipMultiple2 !== undefined ? semSaved.secretNumSkipMultiple2 : secretNumSkipMultiple2);

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

  const handleModalAdd = () => {
    const lines = modalText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length > 0) {
      const newStudents: StudentData[] = lines.map(name => ({
        id: Math.random().toString(36).substring(2, 11),
        name,
        nationalId: '',
        gender: '',
        enrollmentStatus: '',
        studentStatus: isKindergarten ? 'عادى' : undefined,
        enrollmentType: '',
        religion: '',
      }));
      const combined = assignAutoSeatAndSecretNumbers([...data, ...newStudents], true);
      onChange(combined);
    }
    setModalText('');
    setIsModalOpen(false);
  };

  useEffect(() => {
    if (!showExamFields || isEditingData || data.length === 0) return;
    const hasMissingNumbers = data.some(s => {
      const seatVal = (s.seatNumbers?.[semester] || (semester === 'first' ? s.seatNumber : '') || '').trim();
      const secretVal = (s.secretNumbers?.[semester] || (semester === 'first' ? s.secretNumber : '') || '').trim();
      return !seatVal || !secretVal;
    });
    if (hasMissingNumbers) {
      const updated = assignAutoSeatAndSecretNumbers(data, false);
      onChange(updated);
    }
  }, [data, semester, showExamFields, isEditingData, seatNumStart, secretNumStart, secretNumSkipMultiple, secretNumSkipMultiple2]);

  const handleNationalIdModalAdd = () => {
    const lines = nationalIdModalText.split('\n').map(line => line.replace(/\D/g, '').substring(0, 14)).filter(line => line.length > 0);
    if (lines.length > 0) {
      const updatedData = [...data];
      lines.forEach((nid, index) => {
        if (index < updatedData.length) {
          updatedData[index] = { ...updatedData[index], nationalId: nid };
          if (nid.length === 14) {
            const digit13 = parseInt(nid.charAt(12), 10);
            const newGender = (digit13 % 2 !== 0) ? 'male' : 'female';
            updatedData[index].gender = newGender;
            updatedData[index].enrollmentStatus = convertStatus(updatedData[index].enrollmentStatus, newGender);
            updatedData[index].religion = convertReligion(updatedData[index].religion, newGender);
          }
        }
      });
      onChange(updatedData);
    }
    setNationalIdModalText('');
    setIsNationalIdModalOpen(false);
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
    onChange(updatedData);
    setIsSeatNumModalOpen(false);
  };

  const handleGenerateSecretNumbers = () => {
    const updatedData = [...data];
    let currentNum = secretNumStart;
    const skipNum1 = typeof secretNumSkipMultiple === 'number' && secretNumSkipMultiple > 0 ? secretNumSkipMultiple : null;
    const skipNum2 = typeof secretNumSkipMultiple2 === 'number' && secretNumSkipMultiple2 > 0 ? secretNumSkipMultiple2 : null;
    
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
        secretNumSkipMultiple,
        secretNumSkipMultiple2,
        userSetSecret: true,
      };
      localStorage.setItem('sheet_control_numbering_settings_by_grade', JSON.stringify(parsed));
    } catch {}
    onChange(updatedData);
    setIsSecretNumModalOpen(false);
  };

  useEffect(() => {
    if (data.length === 0) return;

    const sizeFirst = typeof committeeSizeFirst === 'number' && committeeSizeFirst >= 1 ? committeeSizeFirst : 20;
    const sizeSecond = typeof committeeSizeSecond === 'number' && committeeSizeSecond >= 1 ? committeeSizeSecond : 20;

    const buildCommMap = (
      targetSem: 'first' | 'second',
      commSize: number,
      mergeLast: boolean
    ) => {
      const orderedStudents = [...data].sort((a, b) => {
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
    const updatedData = data.map(s => {
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

    if (hasChanges) {
      onChange(updatedData);
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
    onChange,
  ]);

  let filteredData = data.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.nationalId.includes(searchTerm) ||
    (s.enrollmentStatus && s.enrollmentStatus.includes(searchTerm)) ||
    (s.enrollmentType && s.enrollmentType.includes(searchTerm))
  ).sort((a, b) => {
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
    }
    return 0;
  });

  if (isEditingData) {
    filteredData = frozenIdsRef.current.map(id => data.find(s => s.id === id)).filter(Boolean) as StudentData[];
  } else {
    frozenIdsRef.current = filteredData.map(s => s.id);
  }

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
      ...(isKindergarten ? ['حالة التلميذ'] : (!isKindergarten ? [t.enrollmentStatus] : [])),
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
        ...(isKindergarten ? [`"${student.studentStatus === 'دمج' ? 'دمج' : 'عادى'}"`] : (!isKindergarten ? [`"${normalizeStatusForGrade(student.enrollmentStatus, isFirstGrade)}"`] : [])),
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
    const tableColumns = isKindergarten ? 6 : (showExamFields ? 9 : 7);
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
      onChange(updatedData);
      
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
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      className="w-[96%] sm:w-[95vw] max-w-[95vw] mx-auto relative rounded-2xl shadow-2xl p-[6px] bg-[linear-gradient(90deg,#0f172a_25%,#ffffff_50%,#0f172a_75%)] bg-[length:200%_auto] animate-shine"
      style={{ animationDuration: '15s' }}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="bg-[#f8ebff] rounded-[10px] w-full h-full p-6 flex flex-col gap-4 relative overflow-hidden">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-[linear-gradient(to_right,#b45309,#d97706,#f59e0b,#d97706,#b45309)] bg-[length:200%_auto] animate-shine border-2 border-slate-900 rounded-xl p-3 shadow-sm gap-4 relative overflow-hidden">
          <div className="text-white drop-shadow-md font-bold text-base md:text-lg text-center md:text-right px-4 flex-1">
            <span style={(stage === 'secondary' || title.includes('المرحلة الثانوية')) ? { fontSize: '85%' } : undefined} className="inline-block truncate max-w-full align-middle">
              {title}
            </span>
          </div>
          <div className="text-white drop-shadow-md font-bold text-base md:text-lg px-4 shrink-0">
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
              className="origin-center whitespace-nowrap"
            >
              تحرير البيانات
            </motion.div>
          </div>
        </div>

        {/* Search & Sort Row */}
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
                placeholder={isKindergarten ? 'بحث باسم التلميذ أو بالرقم القومى' : t.searchPlaceholder}
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
            <div className="relative shrink-0">
              
              <button
                type="button"
                onClick={() => setIsToolsMenuOpen(true)}
                className="bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine text-slate-900 p-2 sm:p-2.5 rounded-[12px] border-2 border-slate-900 hover:bg-slate-100 transition-colors shadow-sm shrink-0 flex items-center justify-center"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5 mix-blend-difference text-white" />
              </button>
              <AnimatePresence>
                {isToolsMenuOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                      onClick={() => setIsToolsMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, rotateX: 90 }}
                      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                      exit={{ opacity: 0, scale: 0.9, rotateX: -90 }}
                      className="relative bg-white rounded-3xl p-1 shadow-2xl w-full max-w-sm"
                    >
                      <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(to_right,#000000,#ffffff,#000000)] bg-[length:200%_auto] animate-shine opacity-100" style={{ zIndex: -1, margin: '-8px', animationDuration: '15s' }}></div>
                      <div className="bg-white rounded-[22px] p-6 flex flex-col gap-3 relative z-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        <ActionMenuButton
                          onClick={() => { setIsToolsMenuOpen(false); setIsModalOpen(true); }}
                          icon={<Plus className="w-4 h-4" />}
                          text={isKindergarten ? 'إضافة تلميذ' : t.addStudent}
                          bgGradient="bg-[linear-gradient(to_right,#3b82f6,#8b5cf6,#3b82f6)]"
                          disabled={isTrialMode}
                          title={isTrialMode ? "متاح فى النسخة الرسمية فقط" : undefined}
                        />
                        
                        <ActionMenuButton
                          onClick={() => { setIsToolsMenuOpen(false); setIsNationalIdModalOpen(true); }}
                          icon={<Plus className="w-4 h-4" />}
                          text={t.addNationalIds}
                          bgGradient="bg-[linear-gradient(to_right,#d946ef,#f43f5e,#d946ef)]"
                          disabled={isTrialMode}
                          title={isTrialMode ? "متاح فى النسخة الرسمية فقط" : undefined}
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
                            text={(t as any).studentsPerCommittee || (isKindergarten ? 'عدد التلاميذ فى اللجنة' : 'عدد الطلاب فى اللجنة')}
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
                                  text={(t as any).editFirstSemesterAssessments || 'تحرير تقييمات الفصل الدراسي الأول'}
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
                                  text={(t as any).editSecondSemesterAssessments || 'تحرير تقييمات الفصل الدراسي الثانى'}
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
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsPrintMenuOpen(true)}
                className="flex items-center justify-center bg-[linear-gradient(to_right,#34d399,#10b981,#059669,#10b981,#34d399)] bg-[length:200%_auto] animate-shine text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all hover:opacity-90 active:scale-[0.98] border-2 border-slate-900 shadow-sm shrink-0"
                title={(t as any).printLabel || (lang === 'ar' ? 'طباعة' : 'Print')}
              >
                <Printer className="w-full h-full p-1.5 drop-shadow-sm" />
              </button>
              <AnimatePresence>
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
                              className="!text-[19.8px]"
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
              </AnimatePresence>
            </div>
            
            <AnimatePresence>
              {isStatsMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    onClick={() => setIsStatsMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.2, rotateX: 180, rotateY: 180, y: 300 }}
                    animate={{ opacity: 1, scale: 1, rotateX: 0, rotateY: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.2, rotateX: -180, rotateY: -180, y: 300 }}
                    transition={{ type: "spring", duration: 2.5, bounce: 0.4 }}
                    className="relative w-full max-w-md rounded-[32px] p-[8px] shadow-[0_0_50px_-10px_rgba(255,255,255,0.3)] overflow-hidden flex flex-col [perspective:1000px]"
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    onClick={() => setIsDetailedStatsMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 50 }}
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

            {/* Detailed Stats Modal - نوعية القيد */}
            <AnimatePresence>
              {isEnrollmentTypeStatsMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    onClick={() => setIsEnrollmentTypeStatsMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 50 }}
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    onClick={() => setIsDamgStatsMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 50 }}
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

            <motion.div 
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-500/40 via-white/70 to-pink-500/40 hover:from-blue-500/60 hover:via-white/90 hover:to-pink-500/60 border-2 border-slate-900 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 cursor-pointer transition-all duration-300 shrink-0 whitespace-nowrap select-none"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: "200% 200%" }}
            >
              <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center whitespace-nowrap gap-1">
                {sortBy.length === 0 ? t.defaultSort : sortBy.map((c, index) => {
                  const opt = [
                    { id: 'alphabetical', label: t.sortAlphabetical },
                    { id: 'name', label: t.sortAlphabetical },
                    { id: 'gender', label: t.sortGender },
                    { id: 'status', label: t.sortStatus },
                    { id: 'studentStatus', label: isKindergarten ? 'حالة التلميذ' : 'حالة الطالب' },
                    { id: 'enrollmentType', label: (t as any).sortEnrollmentType || (t as any).enrollmentType || 'نوعية القيد' },
                    { id: 'religion', label: t.sortReligion },
                    { id: 'seatNumber', label: (t as any).seatNumber },
                    { id: 'secretNumber', label: (t as any).secretNumber },
                    { id: 'total', label: (t as any).totalSort || 'المجموع' }
                  ].find(o => o.id === c.id);
                  return (
                    <React.Fragment key={c.id}>
                      <span className="flex items-center gap-1.5 ml-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm leading-none">{index + 1}</span>
                        <span>{opt ? opt.label : c.id}</span>
                        {c.direction === 'desc' ? <ArrowDown className="w-4 h-4 text-slate-700" strokeWidth={3} /> : <ArrowUp className="w-4 h-4 text-slate-700" strokeWidth={3} />}
                      </span>
                    </React.Fragment>
                  );
                })}
              </span>
            </motion.div>
            <AnimatePresence>
              {isSortMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 [perspective:1000px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={() => setIsSortMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotateX: 90 }}
                    animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                    exit={{ opacity: 0, scale: 0.9, rotateX: -90 }}
                    transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
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
                            { id: 'status', label: t.sortStatus, color: 'from-amber-500 to-orange-500', active: 'from-amber-400 via-orange-500 to-amber-600', shadow: 'shadow-amber-500/30' }
                          ]),
                          { id: 'enrollmentType', label: (t as any).sortEnrollmentType || (t as any).enrollmentType || 'نوعية القيد', color: 'from-teal-500 to-emerald-500', active: 'from-teal-400 via-emerald-500 to-teal-600', shadow: 'shadow-teal-500/30' },
                          { id: 'religion', label: t.sortReligion, color: 'from-purple-500 to-fuchsia-500', active: 'from-purple-400 via-fuchsia-500 to-purple-600', shadow: 'shadow-purple-500/30' },
                          ...(showExamFields ? [
                            { id: 'seatNumber', label: (t as any).seatNumber, color: 'from-cyan-500 to-blue-500', active: 'from-cyan-400 via-blue-500 to-cyan-600', shadow: 'shadow-cyan-500/30' },
                            { id: 'secretNumber', label: (t as any).secretNumber, color: 'from-sky-500 to-indigo-500', active: 'from-sky-400 via-indigo-500 to-sky-600', shadow: 'shadow-sky-500/30' }
                          ] : [])
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
        <div className="p-[2px] rounded-xl bg-[linear-gradient(90deg,#0f172a_40%,#ffffff_50%,#0f172a_60%)] bg-[length:200%_auto] animate-shine shadow-sm w-full relative">
          
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
                <th className="py-[18px] px-3 w-44 border-2 border-slate-900 bg-transparent">{(t as any).enrollmentType || 'نوعية القيد'}</th>
                <th className={`py-[18px] px-3 border-2 border-slate-900 bg-transparent ${showExamFields ? 'min-w-[130px] max-w-[130px] w-[130px]' : 'w-32'}`}>{t.religion}</th>
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
                const isMissingData = !student.name || !student.nationalId || student.nationalId.length !== 14 || !student.gender || (!isKindergarten && !student.enrollmentStatus) || !student.religion || (showExamFields && (!student.seatNumbers?.[semester] && !student.seatNumber)) || (showExamFields && (!student.secretNumbers?.[semester] && !student.secretNumber));
                const rowColorStyle = getTableRowColorStyle(editingRowTheme, idx % 2 !== 0);
                return (
                <tr key={student.id} className={`transition-colors font-bold group/row hover:!bg-blue-100 focus-within:!bg-blue-100 ${rowColorStyle.bgClass}`}>
                  <td className="p-2 border-2 border-slate-900 text-slate-600 relative overflow-visible min-w-[64px] max-w-[64px] w-[64px] sticky start-0 z-30 bg-inherit sticky-cell-border sticky-col" title={isMissingData ? (t as any).missingData : undefined}>
                    {isMissingData && (
                      <div className="absolute inset-0 bg-red-500/10 shadow-[inset_0_0_20px_rgba(239,68,68,0.7)] animate-pulse pointer-events-none z-0"></div>
                    )}
                    <div className="separator-line"></div>
                    <span className="relative z-10 text-lg">{idx + 1}</span>
                  </td>
                  <td className={`p-0 border-2 border-slate-900 sticky start-[64px] z-[29] bg-inherit relative overflow-visible sticky-cell-border sticky-col shadow-[-6px_0_12px_rgba(0,0,0,0.08)] rtl:shadow-[-6px_0_12px_rgba(0,0,0,0.08)] ltr:shadow-[6px_0_12px_rgba(0,0,0,0.08)] focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-30 focus-within:bg-blue-50/60 ${showExamFields ? 'min-w-[380px] max-w-[380px] w-[380px]' : 'min-w-[400px] max-w-[400px] w-[400px]'}`}>
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
                      className="w-full h-full bg-transparent border-none pl-11 pr-3 py-3 text-center text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 relative z-10"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openStudentNameEnModal(student, idx);
                      }}
                      title={
                        student.nameEn?.trim()
                          ? `الاسم بالإنجليزية: ${student.nameEn}`
                          : (isKindergarten ? 'تحرير اسم التلميذ باللغة الإنجليزية' : 'تحرير اسم الطالب باللغة الإنجليزية')
                      }
                      className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-lg border border-slate-900 flex items-center justify-center transition-all shadow-sm active:scale-95 ${
                        student.nameEn?.trim()
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700'
                          : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700'
                      }`}
                    >
                      <Languages className="w-4 h-4" />
                    </button>
                  </td>
                  <td className={`p-0 border-2 border-slate-900 relative group/cell focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60 ${showExamFields ? 'min-w-[210px] max-w-[210px] w-[210px]' : 'min-w-[192px] max-w-[192px] w-[192px]'}`}>
                    <input 
                      id={`cell-${idx}-1`}
                      type="text" 
                      maxLength={14}
                      value={student.nationalId}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
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
                  <td className="p-0 border-2 border-slate-900 relative group/enrollmentType min-w-[160px] max-w-[160px] w-[160px] focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60">
                    <select 
                      id={`cell-${idx}-4`}
                      value={student.enrollmentType === 'تحويل من مدرسة أخرى' ? 'تحويلات' : (student.enrollmentType === 'قيد عادي' ? 'قيد عادى' : (student.enrollmentType || ''))}
                      onChange={(e) => handleChange(student.id, 'enrollmentType', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 4)}
                      onFocus={(e) => ensureCellVisible(e.target)}
                      onPaste={(e) => handlePaste(e, student.id, "enrollmentType", idx, 4)}
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
                      id={`cell-${idx}-5`}
                      value={student.religion === 'muslim' || (student.religion || '').includes('ل') ? 'muslim' : (student.religion === 'christian' || (student.religion || '').includes('ح') ? 'christian' : '')}
                      onChange={(e) => handleChange(student.id, 'religion', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 5)}
                      onFocus={(e) => ensureCellVisible(e.target)}
                      onPaste={(e) => handlePaste(e, student.id, "religion", idx, 5)}
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
                  {showExamFields && (
                    <>
                      <td className="p-0 border-2 border-slate-900 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60">
                        <input
                          id={`cell-${idx}-6`}
                          type="text"
                          value={student.seatNumbers?.[semester] || (semester === 'first' ? student.seatNumber : '') || ''}
                          onChange={(e) => handleSemesterFieldChange(student.id, 'seatNumbers', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 6)}
                          onFocus={(e) => {
                            e.target.select();
                            ensureCellVisible(e.target);
                          }}
                          onPaste={(e) => handlePaste(e, student.id, "seatNumbers", idx, 6)}
                          className="w-full h-full bg-transparent border-none px-3 py-3 text-center text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 font-mono"
                          dir="ltr"
                        />
                      </td>
                      <td className="p-0 border-2 border-slate-900 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60">
                        <input
                          id={`cell-${idx}-7`}
                          type="text"
                          value={student.secretNumbers?.[semester] || (semester === 'first' ? student.secretNumber : '') || ''}
                          onChange={(e) => handleSemesterFieldChange(student.id, 'secretNumbers', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx, 7)}
                          onFocus={(e) => {
                            e.target.select();
                            ensureCellVisible(e.target);
                          }}
                          onPaste={(e) => handlePaste(e, student.id, "secretNumbers", idx, 7)}
                          className="w-full h-full bg-transparent border-none px-3 py-3 text-center text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 font-mono"
                          dir="ltr"
                        />
                      </td>
                    </>
                  )}
                  {!isKindergarten && (
                    <td className="p-0 border-2 border-slate-900 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 focus-within:z-20 focus-within:bg-blue-50/60">
                      <input
                        id={`cell-${idx}-${showExamFields ? 8 : 6}`}
                        type="text"
                        value={student.committeeNumbers?.[semester] || student.committeeNumber || ''}
                        onChange={(e) => handleSemesterFieldChange(student.id, 'committeeNumbers', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, idx, showExamFields ? 8 : 6)}
                        onFocus={(e) => {
                          e.target.select();
                          ensureCellVisible(e.target);
                        }}
                        onPaste={(e) => handlePaste(e, student.id, "committeeNumbers", idx, showExamFields ? 8 : 6)}
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
                className="inline-block text-slate-500 font-bold"
              >
                {t.noStudentsMsg}
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setStudentToDelete(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[120] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm [perspective:1000px]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, rotateX: 90 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0 }}
              exit={{ scale: 0.95, opacity: 0, rotateX: -90 }}
              transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
              className="relative w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden p-[4px] flex flex-col"
            >
              {/* Slow Moving Light Glow */}
              <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_30%,#ffffff_50%,#ffffff_70%,transparent_100%)] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col w-full h-full rounded-[20px] overflow-hidden border-2 border-slate-900 bg-white">
                <div className="bg-[linear-gradient(to_right,#4f46e5,#9333ea,#4f46e5)] bg-[length:200%_auto] animate-shine border-b-2 border-slate-900 p-8 flex flex-col items-center justify-center text-center">
                  <h3 className="text-2xl font-black text-white mb-2">{t.studentsModalTitle}</h3>
                  <p className="text-indigo-100 font-bold text-sm mb-1">{t.studentsModalSub1}</p>
                  <p className="text-indigo-200/80 font-medium text-xs">{t.studentsModalSub2}</p>
                </div>
                
                <div className="p-8 flex flex-col items-center bg-[linear-gradient(to_right,#e0e7ff,#c7d2fe,#e0e7ff)] bg-[length:200%_auto] animate-shine w-full">
                  <textarea
                    value={modalText}
                    onChange={(e) => setModalText(e.target.value)}
                    placeholder="أحمد محمد&#10;محمود علي&#10;سارة أحمد..."
                    className="w-full h-48 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-900 shadow-inner p-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-4 ring-indigo-500/20 resize-none font-bold leading-relaxed transition-all"
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  />
                </div>
                
                <div className="bg-[linear-gradient(to_right,#4f46e5,#9333ea,#4f46e5)] bg-[length:200%_auto] animate-shine border-t-2 border-slate-900 p-6 flex justify-end gap-3 items-center">
                  <button
                    onClick={handleModalAdd}
                    className="flex-[2] py-3 px-6 rounded-xl font-black text-slate-900 bg-white hover:bg-slate-100 transition-all shadow-md border-2 border-slate-900 active:scale-95 text-lg flex items-center justify-center gap-2"
                  >
                    <Plus className="w-6 h-6" strokeWidth={3} />
                    {t.add}
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
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

      {/* National ID Modal Overlay */}
      <AnimatePresence>
        {isNationalIdModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden p-[4px] flex flex-col"
            >
              {/* Slow Moving Light Glow */}
              <div className="absolute inset-[-100%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_30%,#ffffff_50%,#ffffff_70%,transparent_100%)] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col w-full h-full rounded-[20px] overflow-hidden border-2 border-slate-900 bg-white">
                <div className="bg-[linear-gradient(to_right,#3b82f6,#06b6d4,#3b82f6)] bg-[length:200%_auto] animate-shine border-b-2 border-slate-900 p-8 flex flex-col items-center justify-center text-center">
                  <h3 className="text-2xl font-black text-white mb-2">{t.nationalIdsModalTitle}</h3>
                  <p className="text-blue-100 font-bold text-sm mb-1">{t.nationalIdsModalSub1}</p>
                  <p className="text-blue-200/80 font-medium text-xs">{t.studentsModalSub2}</p>
                </div>
                
                <div className="p-8 flex flex-col items-center bg-[linear-gradient(to_right,#dbeafe,#cffafe,#dbeafe)] bg-[length:200%_auto] animate-shine w-full">
                  <textarea
                    value={nationalIdModalText}
                    onChange={(e) => setNationalIdModalText(e.target.value)}
                    placeholder="30001011234567&#10;30001011234568&#10;30001011234569..."
                    className="w-full h-48 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-slate-900 shadow-inner p-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 ring-blue-500/20 resize-none font-bold leading-relaxed font-mono transition-all"
                    dir="ltr"
                  />
                </div>
                
                <div className="bg-[linear-gradient(to_right,#3b82f6,#06b6d4,#3b82f6)] bg-[length:200%_auto] animate-shine border-t-2 border-slate-900 p-6 flex justify-end gap-3 items-center">
                  <button
                    onClick={handleNationalIdModalAdd}
                    className="flex-[2] py-3 px-6 rounded-xl font-black text-slate-900 bg-white hover:bg-slate-100 transition-all shadow-md border-2 border-slate-900 active:scale-95 text-lg flex items-center justify-center gap-2"
                  >
                    <Plus className="w-6 h-6" strokeWidth={3} />
                    {t.add}
                  </button>
                  <button
                    onClick={() => setIsNationalIdModalOpen(false)}
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

      {/* Instructions Modal Overlay */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-900/70 backdrop-blur-sm [perspective:1000px]"
            onClick={() => setShowInstructions(false)}
          >
            <motion.div
              initial={{ rotateX: 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: -90, opacity: 0 }}
              transition={{ duration: 1.2, type: "spring", bounce: 0.3 }}
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
                  <p className="flex gap-2 items-start"><span className="text-yellow-700 mt-1 shrink-0">●</span><span className="flex-1">{(t as any).sortInst7}</span></p>
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" 
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            onClick={() => setIsCommitteeSizeModalOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
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
                    عدد الطلاب في اللجنة
                  </h3>
                  <p className="text-white/90 font-bold text-xs sm:text-sm leading-relaxed">
                    <span style={(stage === 'secondary' || (title && title.includes('المرحلة الثانوية'))) ? { fontSize: '85%' } : undefined} className="inline-block">
                      {modalSubtitle}
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
                          {committeesCount}
                        </div>
                      </div>
                    );
                  })()}
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" 
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            onClick={() => setIsSeatNumModalOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" 
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            onClick={() => setIsSecretNumModalOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
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
                      <label className="text-slate-800 font-bold text-center">
                        {(t as any).skipMultiplesLabel}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={secretNumSkipMultiple}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value);
                          if (typeof val === 'number' && val <= 0) return;
                          setSecretNumSkipMultiple(val);
                          if (val !== '' && val === secretNumSkipMultiple2) {
                            setSecretNumSkipMultiple2('');
                          }
                        }}
                        placeholder={(t as any).skipMultiplesPlaceholder}
                        className="w-full bg-white/80 backdrop-blur-sm border-2 border-slate-900 p-4 rounded-xl text-center font-bold text-3xl text-slate-800 outline-none focus:ring-4 ring-rose-500/40 focus:border-rose-700 transition-all shadow-inner"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-slate-800 font-bold text-center">
                        {(t as any).skipMultiplesLabel}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={secretNumSkipMultiple2}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value);
                          if (typeof val === 'number' && val <= 0) return;
                          if (val !== '' && val === secretNumSkipMultiple) return;
                          setSecretNumSkipMultiple2(val);
                        }}
                        placeholder={(t as any).skipMultiplesPlaceholder}
                        className="w-full bg-white/80 backdrop-blur-sm border-2 border-slate-900 p-4 rounded-xl text-center font-bold text-3xl text-slate-800 outline-none focus:ring-4 ring-rose-500/40 focus:border-rose-700 transition-all shadow-inner"
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

      {/* Student Name in English Modal */}
      <AnimatePresence>
        {studentNameEnModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => setStudentNameEnModal(null)}
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
                        {isKindergarten ? 'تحرير اسم التلميذ باللغة الإنجليزية' : 'تحرير اسم الطالب باللغة الإنجليزية'}
                      </h3>
                      <p className="text-xs font-bold text-purple-700">
                        {studentNameEnModal.arName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5" dir="ltr">
                  <label className="block text-xs font-extrabold text-slate-700 text-left">
                    Student Name ( in English )
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    autoFocus
                    value={tempStudentNameEn}
                    onChange={(e) => setTempStudentNameEn(capitalizeEachWord(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveStudentNameEn();
                      }
                    }}
                    placeholder="e.g. Mohamed Ahmed Mahmoud"
                    className="w-full bg-white border-[1.5px] border-slate-900 rounded-xl py-3 px-4 text-left font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-inner"
                  />
                </div>

                <p className="text-[11px] font-bold text-slate-500 leading-relaxed text-right">
                  سيتم استخدام القيم المحفوظة باللغة الإنجليزية عند طباعة أرقام الجلوس باللغة الإنجليزية  وعند طباعة شهادات الطلاب باللغة الإنجليزية.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveStudentNameEn}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl border-[1.5px] border-slate-900 shadow-md transition-all active:scale-95"
                  >
                    <Check className="w-5 h-5" />
                    <span>حفظ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentNameEnModal(null)}
                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border-[1.5px] border-slate-900 transition-all active:scale-95"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        customWhatsappMessage="السلام عليكم .. أود تحميل ارقام الجلوس باللغة الانجليزية - معرف جهازي : ID : x - 350 L.E"
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
        students={data}
      />

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
        customWhatsappMessage="السلام عليكم .. أود تحميل شهادات باللغة الانجليزية - معرف جهازي : ID : x - 350 L.E"
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
        customWhatsappMessage="السلام عليكم .. أود تحميل شهادات التقدير - معرف جهازي : ID : x - 350 L.E"
      />

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
