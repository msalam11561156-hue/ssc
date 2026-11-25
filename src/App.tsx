import React, { useState, useEffect, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FAST_SCREEN_FLIP, FAST_MODAL_FLIP, FAST_BACKDROP_FADE } from './utils/flipAnimation';
import { ColorThemeKey, getSavedColorTheme, saveColorTheme } from './utils/themeConfig';
import { SchoolData, ControlData, Language, StudentData } from './types';
import { translations, setCurrentAffiliatedEntity } from './i18n';
import { AnimatedBackground } from './components/AnimatedBackground';
import { Languages, FileDown, Share2, Menu, Megaphone, X, Settings, HardDrive, FolderOutput, LogOut, LayoutDashboard, Home, CheckCircle2, AlertTriangle, Bell, Clock, Crown } from 'lucide-react';

import { BrandHeader } from './components/BrandHeader';
import type { SponsorScheduleInterval } from './components/SponsorSettingsModal';
import type { BackupPayload } from './utils/backupRestore';
import { MAX_LOCAL_STORAGE_STUDENTS_CHARS, safeLocalStorageSet } from './utils/backupRestore';
import { getTrialInfo, startTrial, setTrialExpired, formatTrialTime, consumeTrialTime, syncTrialWithServer, TrialInfo } from './utils/trialManager';
import { idbSet, idbGet, idbRemove } from './utils/idbStorage';
import { isMobilePhoneDevice } from './utils/deviceHelper';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, testConnection, isOfflineOrNetworkError } from './firebase';
import { LoginScreen } from './components/LoginScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { lazyWithRetry, prefetchAllScreensForOffline } from './utils/prefetchScreens';
import {
  upsertUserProfile,
  subscribeToUserWorkspace,
  saveWorkspaceToFirestore,
  syncStudentsDataToFirestore,
  clearOfficialWorkspaceInFirestore,
  clearUserSyncCache,
} from './utils/firebaseSync';

const SplashScreen = lazyWithRetry(() => import('./components/SplashScreen').then(m => ({ default: m.SplashScreen })));
const MainScreen = lazyWithRetry(() => import('./components/MainScreen').then(m => ({ default: m.MainScreen })));
const GradesScreen = lazyWithRetry(() => import('./components/GradesScreen').then(m => ({ default: m.GradesScreen })));
const DivisionScreen = lazyWithRetry(() => import('./components/DivisionScreen').then(m => ({ default: m.DivisionScreen })));
const SemesterScreen = lazyWithRetry(() => import('./components/SemesterScreen').then(m => ({ default: m.SemesterScreen })));
const StudentsDataScreen = lazyWithRetry(() => import('./components/StudentsDataScreen').then(m => ({ default: m.StudentsDataScreen })));
const AssessmentsOrExamsScreen = lazyWithRetry(() => import('./components/AssessmentsOrExamsScreen').then(m => ({ default: m.AssessmentsOrExamsScreen })));
const AssessmentsGradesScreen = lazyWithRetry(() => import('./components/AssessmentsGradesScreen').then(m => ({ default: m.AssessmentsGradesScreen })));
const WrittenExamsGradesScreen = lazyWithRetry(() => import('./components/WrittenExamsGradesScreen').then(m => ({ default: m.WrittenExamsGradesScreen })));
const DetailedAssessmentsGradesScreen = lazyWithRetry(() => import('./components/DetailedAssessmentsGradesScreen').then(m => ({ default: m.DetailedAssessmentsGradesScreen })));
const MiddleSystemTypeScreen = lazyWithRetry(() => import('./components/MiddleSystemTypeScreen').then(m => ({ default: m.MiddleSystemTypeScreen })));
const SecondarySystemTypeScreen = lazyWithRetry(() => import('./components/SecondarySystemTypeScreen').then(m => ({ default: m.SecondarySystemTypeScreen })));
const SecondaryGrade2SystemScreen = lazyWithRetry(() => import('./components/SecondaryGrade2SystemScreen').then(m => ({ default: m.SecondaryGrade2SystemScreen })));
const SecondaryModernTracksScreen = lazyWithRetry(() => import('./components/SecondaryModernTracksScreen').then(m => ({ default: m.SecondaryModernTracksScreen })));
const ColorThemeBar = lazyWithRetry(() => import('./components/ColorThemeBar').then(m => ({ default: m.ColorThemeBar })));
const FooterBanner = lazyWithRetry(() => import('./components/FooterBanner').then(m => ({ default: m.FooterBanner })));
const BackupRestoreModal = lazyWithRetry(() => import('./components/BackupRestoreModal').then(m => ({ default: m.BackupRestoreModal })));
const BackupReminderModal = lazyWithRetry(() => import('./components/BackupReminderModal').then(m => ({ default: m.BackupReminderModal })));
const FooterSettingsModal = lazyWithRetry(() => import('./components/FooterSettingsModal').then(m => ({ default: m.FooterSettingsModal })));
const AdvertisingPrivilegeModal = lazyWithRetry(() => import('./components/AdvertisingPrivilegeModal').then(m => ({ default: m.AdvertisingPrivilegeModal })));
const SponsorAdCard = lazyWithRetry(() => import('./components/SponsorAdCard').then(m => ({ default: m.SponsorAdCard })));
const SponsorSettingsModal = lazyWithRetry(() => import('./components/SponsorSettingsModal').then(m => ({ default: m.SponsorSettingsModal })));

const ScreenSuspenseFallback = () => (
  <div className="w-full min-h-[260px] flex items-center justify-center p-8">
    <div className="w-9 h-9 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

const MathStatsIcon = ({ className = "w-6 h-6 md:w-8 md:h-8" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
    <path d="M12 17v-3" />
    <path d="M15 17v-6" />
    <path d="M18 17v-4" />
  </svg>
);

export const DEFAULT_TRIAL_SCHOOL_DATA: SchoolData = {
  affiliatedEntity: 'moe',
  affiliatedEntityEn: 'Ministry of Education',
  administration: 'إدارة مصر الجديدة التعليمية',
  administrationEn: 'Heliopolis Educational Administration',
  schoolName: 'مدرسة الأمل الرسمية للغات',
  schoolNameEn: 'Al-Amal Official Language School',
  educationType: 'official_languages',
  educationTypeEn: 'Official Language Schools',
  stage: 'primary',
  stageEn: 'Primary Stage',
  systemType: 'regular',
};

export const DEFAULT_TRIAL_CONTROL_DATA: Record<string, ControlData> = {
  primary: {
    dataOfficer: 'أحمد محمود حسن',
    dataOfficerEn: 'Ahmed Mahmoud Hassan',
    controlHead: 'محمد إبراهيم علي',
    controlHeadEn: 'Mohamed Ibrahim Ali',
    committeeHead: 'محمود سامي كامل',
    committeeHeadEn: 'Mahmoud Sami Kamel',
    selectedGrade: 'الصف الرابع',
  },
  middle: {
    dataOfficer: 'أحمد محمود حسن',
    dataOfficerEn: 'Ahmed Mahmoud Hassan',
    controlHead: 'محمد إبراهيم علي',
    controlHeadEn: 'Mohamed Ibrahim Ali',
    committeeHead: 'محمود سامي كامل',
    committeeHeadEn: 'Mahmoud Sami Kamel',
    selectedGrade: 'الصف الأول الإعدادي',
  },
  secondary: {
    dataOfficer: 'أحمد محمود حسن',
    dataOfficerEn: 'Ahmed Mahmoud Hassan',
    controlHead: 'محمد إبراهيم علي',
    controlHeadEn: 'Mohamed Ibrahim Ali',
    committeeHead: 'محمود سامي كامل',
    committeeHeadEn: 'Mahmoud Sami Kamel',
    selectedGrade: 'الصف الأول الثانوي',
  },
  kindergarten: {
    dataOfficer: 'أحمد محمود حسن',
    dataOfficerEn: 'Ahmed Mahmoud Hassan',
    controlHead: 'محمد إبراهيم علي',
    controlHeadEn: 'Mohamed Ibrahim Ali',
    committeeHead: 'محمود سامي كامل',
    committeeHeadEn: 'Mahmoud Sami Kamel',
    selectedGrade: 'المستوى الأول',
  },
};

export const EMPTY_OFFICIAL_SCHOOL_DATA: SchoolData = {
  affiliatedEntity: 'moe',
  affiliatedEntityEn: 'Ministry of Education',
  administration: '',
  administrationEn: '',
  schoolName: '',
  schoolNameEn: '',
  educationType: '',
  educationTypeEn: '',
  stage: '',
  stageEn: '',
};

function loadTrialSchoolData(): SchoolData {
  const saved = localStorage.getItem('sheet_control_trial_school_data');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_TRIAL_SCHOOL_DATA,
          ...parsed,
          affiliatedEntity: parsed.affiliatedEntity || 'moe',
        };
      }
    } catch {}
  }
  return DEFAULT_TRIAL_SCHOOL_DATA;
}

function loadOfficialSchoolData(): SchoolData {
  const saved = localStorage.getItem('sheet_control_official_school_data');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          ...EMPTY_OFFICIAL_SCHOOL_DATA,
          ...parsed,
        };
      }
    } catch {}
  }
  return EMPTY_OFFICIAL_SCHOOL_DATA;
}

function loadTrialControlData(): Record<string, ControlData> {
  const saved = localStorage.getItem('sheet_control_trial_control_data_by_stage');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    } catch {}
  }
  return DEFAULT_TRIAL_CONTROL_DATA;
}

function loadOfficialControlData(): Record<string, ControlData> {
  const saved = localStorage.getItem('sheet_control_official_control_data_by_stage');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {}
  }
  return {};
}

async function loadTrialStudentsDataAsync(): Promise<Record<string, StudentData[]>> {
  // تفريغ أي نسخة تجريبية ضخمة مخزنة مسبقاً لتفادي تجاوز سعة التخزين (QuotaExceededError)
  try {
    localStorage.removeItem('sheet_control_trial_students_data');
  } catch {}
  const { getAllDefaultStudentsDataByStage } = await import('./utils/defaultStudentsData');
  return getAllDefaultStudentsDataByStage();
}

function loadOfficialStudentsData(): Record<string, StudentData[]> {
  const saved =
    localStorage.getItem('sheet_control_official_students_data') ||
    localStorage.getItem('sheet_control_students_data');
  if (!saved) {
    return {};
  }
  try {
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {}
  return {};
}

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [continueWithoutAccount, setContinueWithoutAccount] = useState(false);
  const [hasPassedLoginScreen, setHasPassedLoginScreen] = useState(false);
  const [fatalError, setFatalError] = useState<Error | null>(null);
  const wasLoggedOutRef = React.useRef(false);
  const remoteWorkspaceReadyRef = React.useRef(false);
  const hasReceivedRemoteStudentsRef = React.useRef(false);
  const isApplyingRemoteWorkspaceRef = React.useRef(false);
  const isApplyingRemoteStudentsRef = React.useRef(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isBackupReminderModalOpen, setIsBackupReminderModalOpen] = useState(false);
  const [isFooterSettingsModalOpen, setIsFooterSettingsModalOpen] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [customAdText, setCustomAdText] = useState(() => localStorage.getItem('sheet_control_ad_text') || '');
  const [isSponsorAdOpen, setIsSponsorAdOpen] = useState(false);
  const [isSponsorSettingsModalOpen, setIsSponsorSettingsModalOpen] = useState(false);
  const [sponsorInterval, setSponsorInterval] = useState<SponsorScheduleInterval>(() => {
    const saved = localStorage.getItem('sheet_control_sponsor_interval');
    if (saved === '1m' || saved === '10m' || saved === '30m' || saved === '60m') return saved;
    return '60m';
  });
  const [sponsorTimerCycle, setSponsorTimerCycle] = useState(0);

  const handleCloseSponsorAd = React.useCallback(() => {
    setIsSponsorAdOpen(false);
  }, []);

  const handleSaveAdText = (slots: { text: string; grade: string }[]) => {
    setCustomAdText(slots.length > 0 ? slots[0].text : '');
    localStorage.setItem('sheet_control_ad_slots', JSON.stringify(slots));
    if (slots.length > 0 && slots[0].text) {
      localStorage.setItem('sheet_control_ad_text', slots[0].text);
    } else {
      localStorage.removeItem('sheet_control_ad_text');
    }
  };

  const [isSavingBackup, setIsSavingBackup] = useState(false);
  const [backupToast, setBackupToast] = useState<{ visible: boolean; message: string; isError?: boolean } | null>(null);
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('sheet_control_lang');
    return 'ar';
  });

  const [activeColorTheme, setActiveColorTheme] = useState<ColorThemeKey>(() => getSavedColorTheme());

  const handleColorThemeChange = (newTheme: ColorThemeKey) => {
    setActiveColorTheme(newTheme);
    saveColorTheme(newTheme);
  };
  
  const initialTrial = getTrialInfo();
  const [trialInfo, setTrialInfo] = useState<TrialInfo>(initialTrial);

  const [step, setStep] = useState<number>(() => {
    if (isMobilePhoneDevice()) {
      return 0;
    }
    const isTrial = localStorage.getItem('sheet_control_is_trial') === 'true';
    const hasStartedTrial = localStorage.getItem('sheet_control_trial_has_started') === 'true';
    
    // Explicitly check for expired trial (all 4 days or today's 1 hour)
    if (isTrial && (initialTrial.isExpired || initialTrial.isDayExpired)) {
      localStorage.setItem('sheet_control_step', '0');
      localStorage.setItem('sheet_control_is_trial', 'false');
      return 0;
    }
    
    // Determine if official: not trial and either explicitly set or already has data
    const isOfficial = !isTrial && (localStorage.getItem('sheet_control_is_trial') === 'false' || hasStartedTrial || localStorage.getItem('sheet_control_last_official_step'));
    const validSteps = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    const savedStep = localStorage.getItem('sheet_control_step');
    const parsedStep = savedStep ? parseInt(savedStep, 10) : 0;

    if (isOfficial) {
      if (savedStep === '0') {
        return 0;
      }
      if (savedStep && validSteps.has(parsedStep) && parsedStep > 0) {
        return parsedStep;
      }
      const lastOfficial = localStorage.getItem('sheet_control_last_official_step');
      if (lastOfficial) {
        const parsed = parseInt(lastOfficial, 10);
        if (parsed > 0) return parsed;
      }
      return savedStep === null ? 0 : 1; // Default to main screen if official but no step saved
    }

    return validSteps.has(parsedStep) ? parsedStep : 0;
  });

  const [editMode, setEditMode] = useState<'data' | 'grades'>(() => {
    const saved = localStorage.getItem('sheet_control_edit_mode');
    return (saved === 'grades' || saved === 'data') ? saved : 'data';
  });
  const [step5PrevStep, setStep5PrevStep] = useState<3 | 4>(() => {
    const saved = localStorage.getItem('sheet_control_step5_prev');
    return saved ? (parseInt(saved, 10) as 3 | 4) : 3;
  });

  const [isTrialMode, setIsTrialMode] = useState<boolean>(() => {
    if (initialTrial.isExpired || initialTrial.isDayExpired) {
      localStorage.setItem('sheet_control_is_trial', 'false');
      return false;
    }
    return localStorage.getItem('sheet_control_is_trial') === 'true';
  });

  const [hasHydratedOfficialIdb, setHasHydratedOfficialIdb] = useState<boolean>(() => {
    if (initialTrial.isExpired || initialTrial.isDayExpired) return false;
    return localStorage.getItem('sheet_control_is_trial') === 'true';
  });

  const handleSaveSponsorInterval = (newInterval: SponsorScheduleInterval) => {
    setSponsorInterval(newInterval);
    localStorage.setItem('sheet_control_sponsor_interval', newInterval);
    setSponsorTimerCycle((prev) => prev + 1);
    setBackupToast({
      visible: true,
      message: 'تم حفظ توقيت ظهور نافذة هذا البرنامج برعاية بنجاح.',
    });
    setTimeout(() => setBackupToast(null), 4000);
  };

  const isSponsorWindowEnabled = false;
  const isOnSplashScreen = step === 0;
  useEffect(() => {
    if (!isSponsorWindowEnabled || !hasPassedLoginScreen || (!authUser && !continueWithoutAccount) || isOnSplashScreen || isSponsorAdOpen) {
      return;
    }

    const ms =
      sponsorInterval === '1m'
        ? 60 * 1000
        : sponsorInterval === '10m'
        ? 10 * 60 * 1000
        : sponsorInterval === '30m'
        ? 30 * 60 * 1000
        : 60 * 60 * 1000;

    const timer = window.setTimeout(() => {
      setIsSponsorAdOpen(true);
    }, ms);

    return () => {
      window.clearTimeout(timer);
    };
  }, [sponsorInterval, sponsorTimerCycle, hasPassedLoginScreen, authUser, continueWithoutAccount, isOnSplashScreen, isSponsorAdOpen]);

  // احتساب وقت العمل الفعلي للنسخة التجريبية (ساعة واحدة يومياً لمدة 4 أيام كحد أقصى)
  useEffect(() => {
    setTrialInfo(getTrialInfo());

    if (!isTrialMode) return;

    let lastTick = Date.now();

    const tick = () => {
      // لا يتم الخصم من المؤقت إلا أثناء تشغيل التطبيق وظهوره للمستخدم (وقت العمل الفعلي)
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const delta = Math.min(2500, Math.max(0, now - lastTick));
        lastTick = now;

        const updated = consumeTrialTime(delta);
        setTrialInfo(updated);

        // إذا انتهت حصة اليوم (ساعة) أو انتهت الـ 4 أيام بالكامل
        if (updated.isExpired || updated.isDayExpired) {
          setIsTrialMode(false);
          localStorage.setItem('sheet_control_is_trial', 'false');
          setStep(0);
          localStorage.setItem('sheet_control_step', '0');
        }
      } else {
        lastTick = Date.now();
      }
    };

    const interval = setInterval(tick, 1000);

    const handleResetTick = () => {
      lastTick = Date.now();
    };

    document.addEventListener('visibilitychange', handleResetTick);
    window.addEventListener('focus', handleResetTick);
    window.addEventListener('blur', handleResetTick);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleResetTick);
      window.removeEventListener('focus', handleResetTick);
      window.removeEventListener('blur', handleResetTick);
    };
  }, [isTrialMode]);

  // مزامنة حالة الحصة التجريبية للجهاز مع الخادم بشكل مؤجل لعدم مزاحمة رسم الشاشة الأولى
  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncTrialWithServer().then((serverInfo) => {
        setTrialInfo(serverInfo);
        const currentlyInTrial = localStorage.getItem('sheet_control_is_trial') === 'true';
        if (currentlyInTrial && (serverInfo.isExpired || serverInfo.isDayExpired)) {
          setIsTrialMode(false);
          localStorage.setItem('sheet_control_is_trial', 'false');
          setStep(0);
          localStorage.setItem('sheet_control_step', '0');
        }
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleDeviceCheck = () => {
      if (isMobilePhoneDevice()) {
        setStep(0);
      }
    };
    window.addEventListener('resize', handleDeviceCheck);
    window.addEventListener('orientationchange', handleDeviceCheck);
    return () => {
      window.removeEventListener('resize', handleDeviceCheck);
      window.removeEventListener('orientationchange', handleDeviceCheck);
    };
  }, []);

  const navigateStep = React.useCallback((nextStep: number) => {
    setStep(nextStep);
  }, []);

  const handleStartApp = async (isTrial?: boolean) => {
    if (isMobilePhoneDevice()) {
      navigateStep(0);
      return;
    }
    if (isTrial) {
      const current = getTrialInfo();
      if (current.isExpired || current.isDayExpired) {
        setTrialInfo(current);
        navigateStep(0);
        return;
      }
      const res = startTrial();
      if (!res.success) {
        setTrialInfo(getTrialInfo());
        navigateStep(0);
        return;
      }
      setIsTrialMode(true);
      localStorage.setItem('sheet_control_is_trial', 'true');
      setTrialInfo(getTrialInfo());

      // تحميل بيانات النسخة التجريبية ديناميكياً لتسريع التحميل المبدئي
      setSchoolData(loadTrialSchoolData());
      setControlDataByStage(loadTrialControlData());
      const trialStudents = await loadTrialStudentsDataAsync();
      setStudentsDataByStage(trialStudents);

      navigateStep(1);
      localStorage.setItem('sheet_control_step', '1');
    } else {
      setIsTrialMode(false);
      localStorage.setItem('sheet_control_is_trial', 'false');

      if (isTrialMode) {
        // تحميل بيانات النسخة الرسمية عند الانتقال من النسخة التجريبية مع إعادة قراءة IndexedDB أولاً
        setHasHydratedOfficialIdb(false);
        setSchoolData(loadOfficialSchoolData());
        setControlDataByStage(loadOfficialControlData());
        setStudentsDataByStage(loadOfficialStudentsData());
      }

      navigateStep(1);
      localStorage.setItem('sheet_control_step', '1');
      localStorage.setItem('sheet_control_last_official_step', '1');
    }
  };

  const [isDefaultFooterEnabled, setIsDefaultFooterEnabled] = useState(() => {
    const saved = localStorage.getItem('isDefaultFooterEnabled');
    if (saved !== null) return saved !== 'false';
    const isTrial = localStorage.getItem('sheet_control_is_trial') === 'true';
    return isTrial ? true : false; // النسخة الرسمية افتراضي OFF (عكس المرفق)، التجريبية افتراضي ON
  });
  const [reminderToastVisible, setReminderToastVisible] = useState(false);
  const [reminderInterval, setReminderInterval] = useState<string>(() => {
    return localStorage.getItem('sheet_control_reminder_interval') || '10m';
  });

  useEffect(() => {
    localStorage.setItem('isDefaultFooterEnabled', String(isDefaultFooterEnabled));
  }, [isDefaultFooterEnabled]);

  const stepRef = React.useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (reminderInterval === 'off') return;

    let ms = 60 * 1000;
    if (reminderInterval === '1m') ms = 60 * 1000;
    else if (reminderInterval === '10m') ms = 10 * 60 * 1000;
    else if (reminderInterval === '30m') ms = 30 * 60 * 1000;
    else if (reminderInterval === '1h') ms = 60 * 60 * 1000;
    else if (reminderInterval === '2h') ms = 2 * 60 * 60 * 1000;
    else if (reminderInterval === '1d') ms = 24 * 60 * 60 * 1000;

    const timer = setInterval(() => {
      // Show only in:
      // step 4: StudentsDataScreen (Edit Data)
      // step 6: AssessmentsGradesScreen (Edit Assessments)
      // step 9: DetailedAssessmentsGradesScreen (Edit Detailed Assessments)
      // step 7: WrittenExamsGradesScreen (Edit Written Exams)
      if ([4, 6, 7, 9].includes(stepRef.current)) {
        setReminderToastVisible(true);
      }
    }, ms);

    return () => clearInterval(timer);
  }, [reminderInterval]);

  useEffect(() => {
    if (!reminderToastVisible) return;
    const autoHideTimer = setTimeout(() => {
      setReminderToastVisible(false);
    }, 15000);
    return () => clearTimeout(autoHideTimer);
  }, [reminderToastVisible]);

  useEffect(() => {
    if (reminderToastVisible && ![4, 6, 7, 9].includes(step)) {
      setReminderToastVisible(false);
    }
  }, [step, reminderToastVisible]);

  const handleSaveReminderInterval = (newInterval: string) => {
    setReminderInterval(newInterval);
    localStorage.setItem('sheet_control_reminder_interval', newInterval);
    setBackupToast({
      visible: true,
      message: newInterval === 'off' ? 'تم إيقاف إشعارات حفظ النسخة الاحتياطية.' : 'تم تحديث جدول إشعارات حفظ النسخة الاحتياطية بنجاح.',
    });
    setTimeout(() => setBackupToast(null), 4000);
  };


  const [schoolData, setSchoolData] = useState<SchoolData>(() => {
    const isTrial = localStorage.getItem('sheet_control_is_trial') === 'true';
    return isTrial ? loadTrialSchoolData() : loadOfficialSchoolData();
  });

  const [controlDataByStage, setControlDataByStage] = useState<Record<string, ControlData>>(() => {
    const isTrial = localStorage.getItem('sheet_control_is_trial') === 'true';
    return isTrial ? loadTrialControlData() : loadOfficialControlData();
  });

  const [studentsDataByStage, setStudentsDataByStage] = useState<Record<string, StudentData[]>>(() => {
    const isTrial = localStorage.getItem('sheet_control_is_trial') === 'true';
    return isTrial ? {} : loadOfficialStudentsData();
  });

  // تحميل بيانات الطلاب التجريبية ديناميكياً عند الحاجة فقط دون تضخيم الحزمة المبدئية
  useEffect(() => {
    if (!isTrialMode || !hasPassedLoginScreen) return;
    if (Object.keys(studentsDataByStage).length > 0) return;
    let cancelled = false;
    loadTrialStudentsDataAsync()
      .then((data) => {
        if (!cancelled) {
          setStudentsDataByStage(data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isTrialMode, hasPassedLoginScreen]);

  // التحميل المسبق الشامل لكافة الشاشات والأصول أثناء الخمول (بدءاً من شاشة تسجيل الدخول) للعمل بدون إنترنت
  useEffect(() => {
    const idleWin = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const runPrefetch = () => {
      void prefetchAllScreensForOffline();
    };

    let cancelIdle: (() => void) | undefined;
    if (typeof idleWin.requestIdleCallback === 'function') {
      const idleId = idleWin.requestIdleCallback(runPrefetch, { timeout: 1200 });
      cancelIdle = () => idleWin.cancelIdleCallback?.(idleId);
    } else {
      const timerId = window.setTimeout(runPrefetch, 700);
      cancelIdle = () => window.clearTimeout(timerId);
    }

    window.addEventListener('online', runPrefetch);
    return () => {
      cancelIdle?.();
      window.removeEventListener('online', runPrefetch);
    };
  }, []);

  const fallbackControlEntry =
    controlDataByStage[''] || Object.values(controlDataByStage)[0];
  const rawStageControl = controlDataByStage[schoolData.stage];
  const currentControlData: ControlData = rawStageControl
    ? {
        ...rawStageControl,
        dataOfficerEn: rawStageControl.dataOfficerEn || fallbackControlEntry?.dataOfficerEn || '',
        controlHeadEn: rawStageControl.controlHeadEn || fallbackControlEntry?.controlHeadEn || '',
        committeeHeadEn: rawStageControl.committeeHeadEn || fallbackControlEntry?.committeeHeadEn || '',
      }
    : {
        dataOfficer: fallbackControlEntry?.dataOfficer || '',
        dataOfficerEn: fallbackControlEntry?.dataOfficerEn || '',
        controlHead: fallbackControlEntry?.controlHead || '',
        controlHeadEn: fallbackControlEntry?.controlHeadEn || '',
        committeeHead: fallbackControlEntry?.committeeHead || '',
        committeeHeadEn: fallbackControlEntry?.committeeHeadEn || '',
        selectedGrade: '',
      };

  const handleControlChange = (newData: ControlData) => {
    setControlDataByStage(prev => {
      const updated: Record<string, ControlData> = {
        ...prev,
        [schoolData.stage]: newData,
      };
      Object.keys(updated).forEach(stKey => {
        if (stKey !== schoolData.stage && updated[stKey]) {
          updated[stKey] = {
            ...updated[stKey],
            dataOfficerEn: newData.dataOfficerEn !== undefined ? newData.dataOfficerEn : updated[stKey].dataOfficerEn,
            controlHeadEn: newData.controlHeadEn !== undefined ? newData.controlHeadEn : updated[stKey].controlHeadEn,
            committeeHeadEn: newData.committeeHeadEn !== undefined ? newData.committeeHeadEn : updated[stKey].committeeHeadEn,
          };
        }
      });
      return updated;
    });
  };

  setCurrentAffiliatedEntity(schoolData.affiliatedEntity);
  const t = translations[lang];

  // استرجاع البيانات الضخمة (الطلاب والشعار وإعدادات الكنترول) من IndexedDB تلقائياً في الوضع الرسمي
  useEffect(() => {
    if (isTrialMode) {
      setHasHydratedOfficialIdb(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [idbStudents, idbControl, idbLogo] = await Promise.all([
          idbGet('idb_official_students_data'),
          idbGet('idb_official_control_data_by_stage'),
          idbGet('idb_official_school_logo'),
        ]);
        if (cancelled) return;

        if (
          !hasReceivedRemoteStudentsRef.current &&
          idbStudents &&
          typeof idbStudents === 'object' &&
          Object.keys(idbStudents).length > 0
        ) {
          setStudentsDataByStage(idbStudents);
        }

        if (idbControl && typeof idbControl === 'object' && Object.keys(idbControl).length > 0) {
          setControlDataByStage((prev) => (Object.keys(prev).length > 0 ? prev : idbControl));
        }

        if (idbLogo && typeof idbLogo === 'string') {
          setSchoolData((prev) => (prev.schoolLogo ? prev : { ...prev, schoolLogo: idbLogo }));
        }
      } catch (err) {
        console.warn('Failed to hydrate official data from IndexedDB:', err);
      } finally {
        if (!cancelled) {
          setHasHydratedOfficialIdb(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isTrialMode]);

  useEffect(() => {
    // مرجع سريع بالذاكرة لبيانات الطلاب الحالية دون استهلاك مساحة localStorage
    if (typeof window !== 'undefined') {
      (window as any).__SMART_CONTROL_STUDENTS_BY_STAGE__ = studentsDataByStage;
    }

    // لا تكتب في IndexedDB أو localStorage قبل اكتمال تحميل البيانات الرسمية من IndexedDB لتفادي الكتابة الفارغة
    if (!isTrialMode && !hasHydratedOfficialIdb) {
      return;
    }

    const flushStudentsPersistence = () => {
      try {
        localStorage.removeItem('sheet_control_trial_students_data');
        localStorage.removeItem('sheet_control_students_data');
      } catch {}

      try {
        const idbKey = isTrialMode ? 'idb_trial_students_data' : 'idb_official_students_data';
        idbSet(idbKey, studentsDataByStage);
      } catch {}

      if (!isTrialMode) {
        try {
          const serialized = JSON.stringify(studentsDataByStage);
          if (serialized.length <= MAX_LOCAL_STORAGE_STUDENTS_CHARS) {
            if (!safeLocalStorageSet('sheet_control_official_students_data', serialized)) {
              localStorage.removeItem('sheet_control_official_students_data');
            }
          } else {
            localStorage.removeItem('sheet_control_official_students_data');
          }
        } catch (err) {
          try {
            localStorage.removeItem('sheet_control_official_students_data');
          } catch {}
          console.warn('Official students data stored in IndexedDB only (size exceeds localStorage cap):', err);
        }
      }
    };

    const timer = window.setTimeout(flushStudentsPersistence, 350);
    const handlePageHide = () => flushStudentsPersistence();
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [studentsDataByStage, isTrialMode, hasHydratedOfficialIdb]);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('sheet_control_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('sheet_control_step', step.toString());
    if (!isTrialMode && step > 0) {
      localStorage.setItem('sheet_control_last_official_step', step.toString());
    }
  }, [step, isTrialMode]);

  useEffect(() => {
    localStorage.setItem('sheet_control_edit_mode', editMode);
  }, [editMode]);

  useEffect(() => {
    localStorage.setItem('sheet_control_step5_prev', step5PrevStep.toString());
  }, [step5PrevStep]);

  useEffect(() => {
    const flushSchoolPersistence = () => {
      const key = isTrialMode ? 'sheet_control_trial_school_data' : 'sheet_control_official_school_data';
      const logoKey = isTrialMode ? 'sheet_control_trial_school_logo' : 'sheet_control_official_school_logo';
      try {
        if (!isTrialMode) {
          if (schoolData.schoolLogo) {
            idbSet('idb_official_school_logo', schoolData.schoolLogo);
          } else {
            idbRemove('idb_official_school_logo');
          }
        }

        const fullJson = JSON.stringify(schoolData);
        const savedPrimary = safeLocalStorageSet(key, fullJson);
        if (!savedPrimary && schoolData.schoolLogo) {
          const lightJson = JSON.stringify({ ...schoolData, schoolLogo: '' });
          safeLocalStorageSet(key, lightJson);
          safeLocalStorageSet('sheet_control_school_data', lightJson);
        } else {
          safeLocalStorageSet('sheet_control_school_data', fullJson);
        }

        if (schoolData.schoolLogo) {
          if (schoolData.schoolLogo.length < 350_000) {
            safeLocalStorageSet(logoKey, schoolData.schoolLogo);
            safeLocalStorageSet('sheet_control_school_logo', schoolData.schoolLogo);
          } else {
            localStorage.removeItem(logoKey);
            localStorage.removeItem('sheet_control_school_logo');
          }
        } else {
          localStorage.removeItem(logoKey);
          localStorage.removeItem('sheet_control_school_logo');
        }
      } catch (err) {
        console.error('Failed to save schoolData:', err);
      }
    };

    const timer = window.setTimeout(flushSchoolPersistence, 300);
    window.addEventListener('pagehide', flushSchoolPersistence);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', flushSchoolPersistence);
    };
  }, [schoolData, isTrialMode]);

  useEffect(() => {
    const flushControlPersistence = () => {
      try {
        const key = isTrialMode ? 'sheet_control_trial_control_data_by_stage' : 'sheet_control_official_control_data_by_stage';
        if (!isTrialMode) {
          idbSet('idb_official_control_data_by_stage', controlDataByStage);
        }
        const json = JSON.stringify(controlDataByStage);
        safeLocalStorageSet(key, json);
        safeLocalStorageSet('sheet_control_control_data_by_stage', json);
      } catch (err) {
        console.warn('Failed to save controlDataByStage:', err);
      }
    };

    const timer = window.setTimeout(flushControlPersistence, 300);
    window.addEventListener('pagehide', flushControlPersistence);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pagehide', flushControlPersistence);
    };
  }, [controlDataByStage, isTrialMode]);

  // اختبار الاتصال بقاعدة بيانات Firebase ومراقبة حالة تسجيل الدخول
  useEffect(() => {
    const connTimer = window.setTimeout(() => {
      testConnection();
    }, 1200);
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (typeof navigator === 'undefined' || navigator.onLine) {
          try {
            await upsertUserProfile(user);
          } catch (err) {
            if (err instanceof Error && !isOfflineOrNetworkError(err)) {
              setFatalError(err);
            }
          }
        }
        if (wasLoggedOutRef.current) {
          wasLoggedOutRef.current = false;
          setStep(0);
          localStorage.setItem('sheet_control_step', '0');
        }
        setAuthUser(user);
        setAuthReady(true);
      } else {
        wasLoggedOutRef.current = true;
        remoteWorkspaceReadyRef.current = false;
        hasReceivedRemoteStudentsRef.current = false;
        clearUserSyncCache();
        setAuthUser(null);
        setAuthReady(true);
      }
    });
    return () => {
      window.clearTimeout(connTimer);
      unsubAuth();
    };
  }, []);

  // الاستماع الفوري لبيانات المدرسة والطلاب من Firestore بعد تسجيل الدخول واجتياز شاشة الدخول فقط
  useEffect(() => {
    if (!authReady || !authUser || isTrialMode || !hasPassedLoginScreen) {
      remoteWorkspaceReadyRef.current = false;
      hasReceivedRemoteStudentsRef.current = false;
      return;
    }

    const uid = authUser.uid;
    let receivedWorkspaceSnap = false;
    let receivedStudentsSnap = false;

    const unsubscribe = subscribeToUserWorkspace(uid, {
      onWorkspaceData: ({ exists, schoolData: remoteSchool, controlDataByStage: remoteControl }) => {
        receivedWorkspaceSnap = true;
        if (exists) {
          isApplyingRemoteWorkspaceRef.current = true;
          setSchoolData((prev) => ({
            ...EMPTY_OFFICIAL_SCHOOL_DATA,
            ...remoteSchool,
            schoolLogo: prev.schoolLogo,
          }));
          if (remoteControl) {
            setControlDataByStage(remoteControl);
          }
          setTimeout(() => {
            isApplyingRemoteWorkspaceRef.current = false;
          }, 0);
        }
        if (receivedWorkspaceSnap && receivedStudentsSnap) {
          remoteWorkspaceReadyRef.current = true;
        }
      },
      onStudentsData: (remoteStudents, hasRemoteDocs) => {
        receivedStudentsSnap = true;
        if (hasRemoteDocs) {
          hasReceivedRemoteStudentsRef.current = true;
          isApplyingRemoteStudentsRef.current = true;
          setStudentsDataByStage(remoteStudents);
          setTimeout(() => {
            isApplyingRemoteStudentsRef.current = false;
          }, 0);
        }
        if (receivedWorkspaceSnap && receivedStudentsSnap) {
          remoteWorkspaceReadyRef.current = true;
        }
      },
      onError: (err) => {
        if (!isOfflineOrNetworkError(err)) {
          setFatalError(err);
        }
      },
    });

    return () => {
      unsubscribe();
      remoteWorkspaceReadyRef.current = false;
    };
  }, [authReady, authUser, isTrialMode, hasPassedLoginScreen]);

  // مزامنة تلقائية لإعدادات المدرسة والكنترول إلى Firestore في الوضع الرسمي
  useEffect(() => {
    if (!authReady || !authUser || isTrialMode || !hasPassedLoginScreen || !remoteWorkspaceReadyRef.current) return;
    if (isApplyingRemoteWorkspaceRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const uid = authUser.uid;
    const timer = setTimeout(() => {
      saveWorkspaceToFirestore(uid, schoolData, controlDataByStage).catch((err) => {
        if (err instanceof Error && !isOfflineOrNetworkError(err)) setFatalError(err);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [schoolData, controlDataByStage, authReady, authUser, isTrialMode, hasPassedLoginScreen]);

  // مزامنة تلقائية لبيانات الطلاب والدرجات إلى Firestore في الوضع الرسمي
  useEffect(() => {
    if (!authReady || !authUser || isTrialMode || !hasPassedLoginScreen || !remoteWorkspaceReadyRef.current || !hasHydratedOfficialIdb) return;
    if (isApplyingRemoteStudentsRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const uid = authUser.uid;
    const timer = setTimeout(() => {
      syncStudentsDataToFirestore(uid, studentsDataByStage).catch((err) => {
        if (err instanceof Error && !isOfflineOrNetworkError(err)) setFatalError(err);
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [studentsDataByStage, authReady, authUser, isTrialMode, hasPassedLoginScreen, hasHydratedOfficialIdb]);

  // إدارة ترتيب المرحلة الحالية ومشاركته بين كافة شاشات المرحلة المختارة
  // (تحرير البيانات، التقييمات، التقييمات تفصيلاً، وتحرير الدرجات)
  const [stageSortOrders, setStageSortOrders] = useState<Record<string, { id: string; direction: 'asc' | 'desc' }[]>>(() => {
    try {
      const saved = localStorage.getItem('stageSortOrders');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [gradeSortOrders, setGradeSortOrders] = useState<Record<string, { id: string; direction: 'asc' | 'desc' }[]>>(() => {
    try {
      const saved = localStorage.getItem('gradeSortOrders');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const isSecondSecondaryGrade = 
    schoolData.stage === 'secondary' && 
    (currentControlData.selectedGrade === 'الصف الثاني' || 
     currentControlData.selectedGrade?.includes('الثاني') || 
     currentControlData.selectedGrade?.toLowerCase().includes('2nd'));

  const activeDivision = schoolData.division || (schoolData.secondarySystem === 'modern' ? 'modern_medical' : 'literary');
  const gradeWithDivision = isSecondSecondaryGrade
    ? `${currentControlData.selectedGrade}_${activeDivision}`
    : currentControlData.selectedGrade;

  const currentStageKey = `${schoolData.educationType}_${schoolData.stage}`;
  const currentGradeKey = `${schoolData.educationType}_${schoolData.stage}_${gradeWithDivision}`;

  const currentStageSortBy = React.useMemo(() => {
    if (stageSortOrders[currentStageKey] && stageSortOrders[currentStageKey].length > 0) {
      return stageSortOrders[currentStageKey];
    }
    if (gradeSortOrders[currentGradeKey] && gradeSortOrders[currentGradeKey].length > 0) {
      return gradeSortOrders[currentGradeKey];
    }
    if (stageSortOrders[schoolData.stage] && stageSortOrders[schoolData.stage].length > 0) {
      return stageSortOrders[schoolData.stage];
    }
    return [];
  }, [stageSortOrders, gradeSortOrders, currentStageKey, currentGradeKey, schoolData.stage]);

  const handleStageSortChange = (newSortBy: { id: string; direction: 'asc' | 'desc' }[]) => {
    setStageSortOrders(prev => {
      const updated = { 
        ...prev, 
        [currentStageKey]: newSortBy, 
        [schoolData.stage]: newSortBy 
      };
      try {
        localStorage.setItem('stageSortOrders', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    setGradeSortOrders(prev => {
      const updated = { 
        ...prev, 
        [currentGradeKey]: newSortBy,
        [currentStageKey]: newSortBy 
      };
      try {
        localStorage.setItem('gradeSortOrders', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // تتبع المادة الحالية لشاشة التقييمات تفصيلاً لكل صف ومشاركتها عند التنقل بين الشاشات
  const [lastDetailedSubjectByGrade, setLastDetailedSubjectByGrade] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('sheet_control_last_detailed_subject_by_grade');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const currentGradeDetailedKey = `${schoolData.stage}_${gradeWithDivision}`;
  const currentDetailedSubject = lastDetailedSubjectByGrade[currentGradeDetailedKey] || 
    (() => {
      try {
        const specific = localStorage.getItem(`detailed_assessments_last_subject_${schoolData.stage}_${gradeWithDivision}`);
        if (specific) return specific;
        const general = localStorage.getItem('detailed_assessments_last_subject');
        if (general) return general;
      } catch {}
      return undefined;
    })();

  const handleDetailedSubjectChange = (subjectKey: string) => {
    if (!subjectKey) return;
    setLastDetailedSubjectByGrade(prev => {
      const updated = {
        ...prev,
        [currentGradeDetailedKey]: subjectKey,
      };
      try {
        localStorage.setItem('sheet_control_last_detailed_subject_by_grade', JSON.stringify(updated));
        localStorage.setItem(`detailed_assessments_last_subject_${schoolData.stage}_${gradeWithDivision}`, subjectKey);
        localStorage.setItem('detailed_assessments_last_subject', subjectKey);
      } catch {}
      return updated;
    });
  };


  const handleResetSystem = () => {
    if (isTrialMode) {
      setIsResetModalOpen(false);
      return;
    }

    // تهيئة وضبط النسخة الرسمية فقط: تفريغ بيانات المدرسة وبيانات الطلاب ودرجاتهم
    // مع الحفاظ التام والكامل على بيانات ودرجات النسخة التجريبية دون أي مساس بها
    localStorage.removeItem('sheet_control_official_school_data');
    localStorage.removeItem('sheet_control_official_school_logo');
    localStorage.removeItem('sheet_control_official_control_data_by_stage');
    localStorage.removeItem('sheet_control_official_students_data');
    localStorage.removeItem('sheet_control_school_data');
    localStorage.removeItem('sheet_control_school_logo');
    localStorage.removeItem('sheet_control_control_data_by_stage');
    localStorage.removeItem('sheet_control_students_data');
    localStorage.removeItem('sheet_control_last_official_step');
    localStorage.removeItem('sheet_control_edit_mode');
    localStorage.removeItem('sheet_control_step5_prev');
    localStorage.setItem('sheet_control_step', '1');

    idbRemove('idb_official_students_data').catch(() => {});
    idbRemove('idb_official_control_data_by_stage').catch(() => {});
    idbRemove('idb_official_school_logo').catch(() => {});

    if (authUser && !isTrialMode && (typeof navigator === 'undefined' || navigator.onLine)) {
      clearOfficialWorkspaceInFirestore(authUser.uid).catch((err) => {
        if (err instanceof Error && !isOfflineOrNetworkError(err)) setFatalError(err);
      });
    }

    setSchoolData(EMPTY_OFFICIAL_SCHOOL_DATA);
    setControlDataByStage({});
    setStudentsDataByStage({});
    setEditMode('data');
    setStep5PrevStep(3);
    setStep(1);
    setIsResetModalOpen(false);
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    setIsMenuOpen(false);
    try {
      clearUserSyncCache(authUser?.uid);
      if (authUser) {
        await signOut(auth);
      }
      setContinueWithoutAccount(false);
      setHasPassedLoginScreen(false);
      setIsSponsorAdOpen(false);
      setStep(0);
      localStorage.setItem('sheet_control_step', '0');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleSaveBackup = async () => {
    setIsMenuOpen(false);
    setIsSavingBackup(true);
    try {
      const { createBackupPayload, saveBackupToFile } = await import('./utils/backupRestore');
      const payload = createBackupPayload(schoolData, controlDataByStage, studentsDataByStage);
      const res = await saveBackupToFile(payload);
      if (res.success) {
        setBackupToast({
          visible: true,
          message: 'تم حفظ نسخة احتياطية شاملة لكافة البيانات والإعدادات بنجاح.',
        });
        setTimeout(() => setBackupToast(null), 4500);
      } else if (!res.cancelled) {
        setBackupToast({
          visible: true,
          message: res.error || 'حدث خطأ أثناء حفظ ملف النسخة الاحتياطية.',
          isError: true,
        });
        setTimeout(() => setBackupToast(null), 4500);
      }
    } catch (err: any) {
      console.error('Backup error:', err);
      setBackupToast({
        visible: true,
        message: 'حدث خطأ غير متوقع أثناء تجهيز النسخة الاحتياطية.',
        isError: true,
      });
      setTimeout(() => setBackupToast(null), 4500);
    } finally {
      setIsSavingBackup(false);
    }
  };

  const handleRestoreSuccess = async (payload: BackupPayload) => {
    if (payload.schoolData) setSchoolData(payload.schoolData);
    if (payload.controlDataByStage) setControlDataByStage(payload.controlDataByStage);
    if (payload.studentsDataByStage) setStudentsDataByStage(payload.studentsDataByStage);
    setIsRestoreModalOpen(false);
    const restoredIsTrial = payload.storage?.['sheet_control_is_trial'] === 'true';
    if (authUser && !restoredIsTrial && (typeof navigator === 'undefined' || navigator.onLine)) {
      try {
        await saveWorkspaceToFirestore(
          authUser.uid,
          payload.schoolData || schoolData,
          payload.controlDataByStage || controlDataByStage
        );
        if (payload.studentsDataByStage) {
          await syncStudentsDataToFirestore(authUser.uid, payload.studentsDataByStage);
        }
      } catch (err) {
        if (err instanceof Error && !isOfflineOrNetworkError(err)) {
          setFatalError(err);
          return;
        }
      }
    }
    window.location.reload();
  };

  const menuItems = [
    { id: 'splashScreen', label: t.splashScreen, icon: Home, color: 'bg-indigo-600 shadow-[0_5px_15px_-3px_rgba(79,70,229,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(79,70,229,0.6)]', action: () => { navigateStep(0); setIsMenuOpen(false); } },
    { id: 'mainData', label: t.mainData, icon: LayoutDashboard, color: 'bg-fuchsia-600 shadow-[0_5px_15px_-3px_rgba(192,38,211,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(192,38,211,0.6)]', action: () => { navigateStep(1); setIsMenuOpen(false); } },
    { 
      id: 'backup', 
      label: t.backup, 
      icon: HardDrive, 
      color: 'bg-[#059669] shadow-[0_5px_15px_-3px_rgba(5,150,105,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(5,150,105,0.6)]',
      action: handleSaveBackup,
    },
    { 
      id: 'restore', 
      label: t.restoreBackup, 
      icon: FolderOutput, 
      color: 'bg-[#ea580c] shadow-[0_5px_15px_-3px_rgba(234,88,12,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(234,88,12,0.6)]',
      action: () => {
        setIsMenuOpen(false);
        setIsRestoreModalOpen(true);
      },
    },
    { 
      id: 'backupReminder', 
      label: 'اشعار حفظ النسخة الاحتياطية', 
      icon: Bell, 
      color: 'bg-[#0284c7] shadow-[0_5px_15px_-3px_rgba(2,132,199,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(2,132,199,0.6)]',
      action: () => {
        setIsMenuOpen(false);
        setIsBackupReminderModalOpen(true);
      },
    },
    { 
      id: 'defaultFooter', 
      label: 'تذييل التقارير الإفتراضى', 
      icon: Settings, 
      isPaidService: true,
      color: 'bg-indigo-700 shadow-[0_5px_15px_-3px_rgba(67,56,202,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(67,56,202,0.6)]',
      action: () => {
        setIsMenuOpen(false);
        setIsFooterSettingsModalOpen(true);
      },
    },
    { 
      id: 'systemSetup', 
      label: (t as any).systemSetup || 'ضبط وتهيئة النظام', 
      icon: Settings, 
      disabled: isTrialMode,
      color: isTrialMode
        ? 'bg-slate-700/60 opacity-40 cursor-not-allowed shadow-none'
        : 'bg-teal-600 shadow-[0_5px_15px_-3px_rgba(13,148,136,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(13,148,136,0.6)]', 
      action: () => { 
        if (isTrialMode) return;
        setIsMenuOpen(false); 
        setIsResetModalOpen(true); 
      } 
    },
    { 
      id: 'ads', 
      label: t.advertisingPrivilege, 
      icon: Megaphone, 
      isPaidService: true,
      color: 'bg-blue-600 shadow-[0_5px_15px_-3px_rgba(37,99,235,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(37,99,235,0.6)]',
      action: () => {
        setIsMenuOpen(false);
        setIsAdModalOpen(true);
      },
    },
    { 
      id: 'sponsorSettings', 
      label: 'اعدادات نافذة هذا البرنامج برعاية', 
      icon: Clock, 
      marquee: true,
      hidden: !isSponsorWindowEnabled,
      color: 'bg-amber-600 shadow-[0_5px_15px_-3px_rgba(217,119,6,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(217,119,6,0.6)]',
      action: () => {
        setIsMenuOpen(false);
        setIsSponsorSettingsModalOpen(true);
      },
    },
    { id: 'logout', label: t.logout, icon: LogOut, color: 'bg-[#dc2626] shadow-[0_5px_15px_-3px_rgba(220,38,38,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(220,38,38,0.6)]', action: handleLogout },
  ];



  const getEducationTypeLabel = (type: string) => {
    switch (type) {
      case 'official': return (t as any).official;
      case 'official_languages': return (t as any).officialLanguages;
      case 'official_distinguished': return (t as any).officialDistinguished;
      case 'ips': return (t as any).ips;
      case 'private': return (t as any).private;
      case 'international': return (t as any).international || 'مدارس دولية';
      case 'national': return (t as any).national;
      case 'intellectual_schools': return (t as any).intellectualSchools;
      case 'vocational_schools': return (t as any).vocationalSchools;
      case 'egyptian_japanese': return (t as any).egyptianJapanese;
      case 'nile_egyptian': return (t as any).nileEgyptian;
      case 'stem': return (t as any).stem;
      case 'applied_technology': return (t as any).appliedTechnology;
      case 'other_schools': return (t as any).otherSchools;
      default: return '';
    }
  };

  const getStageLabel = (stage: string) => {
    if (lang === 'ar') {
      if (stage === 'kindergarten') return 'المرحلة : رياض أطفال';
      if (stage === 'primary') return 'المرحلة الابتدائية';
      if (stage === 'middle') return 'المرحلة الإعدادية';
      if (stage === 'secondary') return 'المرحلة الثانوية - البكالوريا';
      if (stage === 'commercial_technical') return 'المرحلة : التعليم الفنى التجارى';
      if (stage === 'industrial_technical') return 'المرحلة : التعليم الفنى الصناعى';
      if (stage === 'agricultural_technical') return 'المرحلة : التعليم الفنى الزراعى';
      if (stage === 'hotel_technical') return 'المرحلة : التعليم الفنى الفندقى';
    }
    const stageKey = stage.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    return (t as any)[stageKey] || stage;
  };
  
  const formatGrade = (grade: string) => {
    if (lang === 'ar') {
      return grade.replace(' الابتدائي', '').replace(' الإعدادي', '').replace(' الثانوي', '');
    }
    return grade;
  };

  const getSemesterLabel = (sem: string) => {
    if (sem === 'first') return t.firstSemester;
    if (sem === 'second') return t.secondSemester;
    if (sem === 'retake') return t.secondSession;
    return '';
  };

  const getDivisionLabel = (div?: string) => {
    if (div === 'scientific') return (t as any).scientificDivision || 'الشعبة العلمية';
    if (div === 'literary') return (t as any).literaryDivision || 'الشعبة الأدبية';
    if (div === 'modern_medical') return 'مسار الطب وعلوم الحياة';
    if (div === 'modern_engineering') return 'مسار الهندسة وعلوم الحاسب';
    if (div === 'modern_business') return 'مسار الأعمال';
    if (div === 'modern_arts') return 'مسار الآداب والفنون';
    return '';
  };

  const getDivisionSubtitle = () => {
    if (lang === 'ar' && (isSecondSecondaryGrade || schoolData.stage === 'secondary')) {
      const sysName = schoolData.systemType === 'homeschool' ? '- منازل' : schoolData.systemType === 'services' ? '- خدمات' : '- منتظمين';
      const secSys = schoolData.secondarySystem === 'modern' ? ' - البكالوريا ( النظام الحديث )' : ' - النظام القديم';
      return `المرحلة الثانوية العامة ${sysName}${secSys} - ${formatGrade(currentControlData.selectedGrade)}`;
    }
    return `${getStageLabel(schoolData.stage)} - ${formatGrade(currentControlData.selectedGrade)}`;
  };

  const getSemesterSubtitle = () => {
    if (schoolData.stage === 'secondary') {
      const sysName = schoolData.systemType === 'homeschool' ? ' ( منازل )' : schoolData.systemType === 'services' ? ' ( خدمات )' : ' ( منتظمين )';
      if (lang === 'ar' && isSecondSecondaryGrade) {
        const divLabel = getDivisionLabel(schoolData.division || 'literary');
        const sysLabel = schoolData.secondarySystem === 'modern' ? 'البكالوريا ( النظام الحديث )' : 'النظام القديم';
        return `المرحلة الثانوية العامة${sysName} - ${sysLabel} - ${formatGrade(currentControlData.selectedGrade)}${divLabel ? ` - ${divLabel}` : ''}`;
      }
      return `${getStageLabel(schoolData.stage)}${sysName} - ${formatGrade(currentControlData.selectedGrade)}`;
    }
    if (lang === 'ar' && isSecondSecondaryGrade) {
      const divLabel = getDivisionLabel(schoolData.division || 'literary');
      return `المرحلة الثانوية العامة - ${formatGrade(currentControlData.selectedGrade)}${divLabel ? ` - ${divLabel}` : ''}`;
    }
    const systemSuffix = schoolData.stage === 'middle' && schoolData.systemType === 'homeschool' ? ' ( منازل )' : (schoolData.stage === 'middle' && schoolData.systemType === 'regular' ? ' ( منتظمين )' : '');
    return `${getStageLabel(schoolData.stage)}${systemSuffix} - ${formatGrade(currentControlData.selectedGrade)}`;
  };

  const getScreenTitle = () => {
    let stageLabel = getStageLabel(schoolData.stage);
    if (schoolData.stage === 'secondary') {
      const sysName = schoolData.systemType === 'homeschool' ? ' ( منازل )' : schoolData.systemType === 'services' ? ' ( خدمات )' : ' ( منتظمين )';
      if (lang === 'ar' && isSecondSecondaryGrade) {
        const divLabel = getDivisionLabel(schoolData.division || 'literary');
        const sysPrefix = schoolData.secondarySystem === 'modern' ? 'البكالوريا' : 'الثانوية العامة';
        stageLabel = divLabel ? `${sysPrefix}${sysName} - ${divLabel}` : `${sysPrefix}${sysName}`;
      } else {
        stageLabel = `${stageLabel}${sysName}`;
      }
    } else if (lang === 'ar' && isSecondSecondaryGrade) {
      const divLabel = getDivisionLabel(schoolData.division || 'literary');
      stageLabel = divLabel ? `المرحلة الثانوية - ${divLabel}` : 'المرحلة الثانوية';
    } else if (schoolData.stage === 'middle' && schoolData.systemType === 'homeschool') {
      stageLabel = `${stageLabel} ( منازل )`;
    } else if (schoolData.stage === 'middle' && schoolData.systemType === 'regular') {
      stageLabel = `${stageLabel} ( منتظمين )`;
    }
    return `${stageLabel} - ${formatGrade(currentControlData.selectedGrade)} - ${getSemesterLabel(schoolData.semester || '')} - 2026 - 2027`;
  };

  const stageSystemSuffix = schoolData.systemType === 'homeschool' ? '_homeschool' : schoolData.systemType === 'services' ? '_services' : '';
  const studentsDataKey = schoolData.semester === 'retake' 
    ? `${schoolData.stage}_${gradeWithDivision}${stageSystemSuffix}_retake` 
    : `${schoolData.stage}_${gradeWithDivision}${stageSystemSuffix}_shared`;
  const fallbackStudentsDataKey = schoolData.semester === 'retake'
    ? `${schoolData.stage}_${currentControlData.selectedGrade}${stageSystemSuffix}_retake`
    : `${schoolData.stage}_${currentControlData.selectedGrade}${stageSystemSuffix}_shared`;
  const currentStudentsData = studentsDataByStage[studentsDataKey] || studentsDataByStage[fallbackStudentsDataKey] || [];
  const isFirstOrSecondPrimary = schoolData.stage === 'kindergarten';
  const isFirstToThirdPrimary = schoolData.stage === 'kindergarten' || (schoolData.stage === 'primary' && ['الصف الأول', 'الصف الثاني', 'الصف الثالث', '1st Grade', '2nd Grade', '3rd Grade'].includes(currentControlData.selectedGrade));

  const hasCurrentStudents = Boolean(
    currentStudentsData &&
    currentStudentsData.length > 0 &&
    currentStudentsData.some(s => Boolean(s && s.name && s.name.trim().length > 0))
  );

  const checkHasStudentsForGrade = (targetGrade?: string): boolean => {
    const g = (targetGrade || currentControlData.selectedGrade || '').trim();
    if (!g) return false;
    for (const [key, list] of Object.entries(studentsDataByStage)) {
      if (key.startsWith(`${schoolData.stage}_${g}`) && Array.isArray(list)) {
        if (list.some(s => Boolean(s && s.name && s.name.trim().length > 0))) {
          return true;
        }
      }
    }
    return false;
  };

  const handleStudentsDataChange = (data: StudentData[]) => {
    setStudentsDataByStage(prev => ({
      ...prev,
      [studentsDataKey]: data
    }));
  };

  if (fatalError) {
    throw fatalError;
  }

  if (!hasPassedLoginScreen || (!authUser && !continueWithoutAccount)) {
    return (
      <>
        <LoginScreen
          onSuccess={(user) => {
            setAuthUser(user);
            setAuthReady(true);
            setContinueWithoutAccount(false);
            setHasPassedLoginScreen(true);
            setStep(0);
            localStorage.setItem('sheet_control_step', '0');
          }}
          onContinueWithoutAccount={() => {
            clearUserSyncCache(authUser?.uid);
            if (auth.currentUser) {
              signOut(auth).catch((err) => console.error('Guest switch sign out error:', err));
            }
            setAuthUser(null);
            setAuthReady(true);
            setContinueWithoutAccount(true);
            setHasPassedLoginScreen(true);
            setStep(0);
            localStorage.setItem('sheet_control_step', '0');
          }}
        />
        <OfflineIndicator />
      </>
    );
  }

  if (!authReady) {
    return (
      <div
        dir="rtl"
        className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 relative overflow-hidden [color-scheme:light_only]"
      >
        <AnimatedBackground />
        <div className="relative z-10 flex flex-col items-center gap-4 bg-slate-900/90 border border-slate-700/80 rounded-[28px] p-8 shadow-2xl max-w-xs w-full">
          <BrandHeader variant="gold" />
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-200 text-center">جاري تهيئة الحساب والاتصال بقاعدة البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-slate-900 font-sans [color-scheme:light_only] ${lang === 'ar' ? 'font-arabic' : ''}`}>
      <AnimatedBackground />
      <div className={`relative flex flex-col ${[0, 1, 2, 4, 6, 7, 9].includes(step) ? 'h-screen h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
        {/* Header with Gradient */}
        {step !== 0 && (
          <header className="w-full h-16 shrink-0 relative overflow-hidden px-4 md:px-6 flex items-center justify-between z-10 shadow-md">
            <div
              className={`absolute inset-0 z-[-1] bg-gradient-to-r transition-colors duration-300 ${
                step === 1 ? 'from-fuchsia-500 via-violet-500 to-cyan-500' :
                step === 10 ? 'from-indigo-600 via-purple-600 to-amber-600' :
                step === 11 ? 'from-teal-600 via-indigo-600 to-cyan-600' :
                step === 12 ? 'from-indigo-600 via-rose-600 to-amber-600' :
                step === 13 ? 'from-cyan-600 via-violet-600 to-emerald-600' :
                step === 2 ? 'from-[#14b8a6] via-[#d4a373] to-[#c2410c]' :
                step === 8 ? 'from-slate-400 via-rose-600 to-[#d4a373]' :
                step === 3 ? 'from-slate-400 via-rose-600 to-[#d4a373]' :
                step === 4 ? 'from-violet-600 via-purple-600 to-fuchsia-600' :
                'from-teal-500 via-emerald-500 to-cyan-500'
              }`}
            />
            
            <div className="flex items-center gap-2.5 relative z-10 flex-1 overflow-hidden">
              <div className="flex-1 overflow-hidden [container-type:inline-size] [mask-image:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]" dir="ltr">
                <div className="whitespace-nowrap animate-header-marquee ml-2">
                  <h1
                    className="font-bold text-base md:text-lg animate-header-title-color"
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  >
                    {t.appTitle}
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 relative z-10">
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="h-12 w-12 flex items-center justify-center text-white relative overflow-hidden rounded-xl transition-transform active:scale-95 shadow-md border-[1.5px] border-white/20 group shrink-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500"
              >
                <Menu className="w-[32px] h-[32px] relative z-10 drop-shadow-sm transition-transform group-hover:scale-110" />
              </button>
            </div>
          </header>
        )}

        <AnimatePresence>
          {isMenuOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                {...FAST_BACKDROP_FADE}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div
                {...FAST_MODAL_FLIP}
                className="relative w-full max-w-sm bg-[#1b1e2b] rounded-[24px] p-6 shadow-2xl z-10 flex flex-col gap-4 border border-slate-700/80 max-h-[88vh] overflow-y-auto custom-scrollbar"
              >
                <BrandHeader variant="gold" />
                {authUser && (
                  <div className="flex items-center gap-3 bg-slate-800/70 border border-slate-700/80 rounded-2xl p-3 text-right">
                    {authUser.photoURL ? (
                      <img
                        src={authUser.photoURL}
                        alt={authUser.displayName || 'User'}
                        className="w-10 h-10 rounded-full border border-amber-400/70 shrink-0 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0">
                        {(authUser.displayName || authUser.email || 'U').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">
                        {authUser.displayName || 'مستخدم Smart Control 0.1'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate" dir="ltr">
                        {authUser.email}
                      </p>
                    </div>
                  </div>
                )}
                {menuItems.filter((item) => !(item as any).hidden).map((item) => {
                  const isDisabled = Boolean((item as any).disabled);
                  const isMarquee = Boolean((item as any).marquee);
                  const isPaidService = Boolean((item as any).isPaidService);
                  return (
                    <button
                      key={item.id}
                      disabled={isDisabled}
                      title={isDisabled ? 'غير متاح في النسخة التجريبية' : undefined}
                      onClick={() => {
                        if (isDisabled) return;
                        if (item.action) {
                          item.action();
                        } else {
                          setIsMenuOpen(false);
                        }
                      }}
                      className={`w-full shrink-0 flex items-center justify-center gap-3 rounded-xl text-white transition-all ${
                        isMarquee ? 'py-4 px-2 overflow-hidden' : 'py-4 px-6'
                      } ${
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed bg-slate-700/60 shadow-none hover:translate-y-0'
                          : `hover:-translate-y-0.5 active:translate-y-0 ${item.color}`
                      }`}
                    >
                      {isMarquee ? (
                        <div
                          className="w-full overflow-hidden flex items-center relative [mask-image:linear-gradient(to_right,transparent_0%,black_8%,black_92%,transparent_100%)]"
                          dir="ltr"
                        >
                          <div className="animate-btn-marquee-ltr marquee-continuous items-center" dir="rtl">
                            <div className="flex items-center gap-2.5 shrink-0 px-8 whitespace-nowrap">
                              <item.icon className="w-6 h-6 shrink-0" />
                              <span className="font-bold text-lg whitespace-nowrap">{item.label}</span>
                              {isPaidService && (
                                <Crown className="w-5 h-5 text-amber-300 fill-amber-300/35 shrink-0 drop-shadow-sm" />
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0 px-8 whitespace-nowrap" aria-hidden="true">
                              <item.icon className="w-6 h-6 shrink-0" />
                              <span className="font-bold text-lg whitespace-nowrap">{item.label}</span>
                              {isPaidService && (
                                <Crown className="w-5 h-5 text-amber-300 fill-amber-300/35 shrink-0 drop-shadow-sm" />
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <item.icon className="w-6 h-6" />
                          <span className="font-bold text-lg">{item.label}</span>
                          {isPaidService && (
                            <Crown className="w-5 h-5 text-amber-300 fill-amber-300/35 shrink-0 drop-shadow-sm" />
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* System Setup & Initialization Modal */}
        <AnimatePresence>
          {isResetModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                {...FAST_BACKDROP_FADE}
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                onClick={() => setIsResetModalOpen(false)}
              />
              <motion.div
                {...FAST_MODAL_FLIP}
                className="relative w-full max-w-md bg-white rounded-[28px] p-6 shadow-2xl z-10 border-4 border-red-600 ring-4 ring-white shadow-[0_0_0_2px_#dc2626,0_25px_50px_-12px_rgba(0,0,0,0.6)]"
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 border-2 border-slate-900 flex items-center justify-center mb-4 text-teal-700 shadow-inner">
                    <Settings className="w-8 h-8" />
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-2">
                    ضبط وتهيئة النظام
                  </h3>

                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    مسح البيانات المحفوظة للبدء من جديد
                    <br />
                    <span className="text-xs text-amber-600 font-semibold block mt-1.5">
                      ⚠️ سيتم تفريغ كافة البيانات والدرجات المدخلة والعودة للوضع الابتدائي للنظام.
                    </span>
                  </p>

                  <div className="flex items-center gap-3 w-full">
                    {/* Cancel Button with animated black border */}
                    <div className="relative p-[3px] rounded-2xl overflow-hidden group flex-1 shadow-sm">
                      <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setIsResetModalOpen(false)}
                        className="relative w-full py-3 px-4 rounded-[13px] bg-white hover:bg-slate-50 text-slate-700 font-bold transition-colors flex items-center justify-center"
                      >
                        إلغاء
                      </button>
                    </div>

                    {/* Confirm Button with animated black border */}
                    <div className="relative p-[3px] rounded-2xl overflow-hidden group flex-1 shadow-md">
                      <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,#000000_0%,#ffffff_25%,#000000_50%,#ffffff_75%,#000000_100%)] pointer-events-none" />
                      <button
                        type="button"
                        onClick={handleResetSystem}
                        className="relative w-full py-3 px-4 rounded-[13px] bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center"
                      >
                        <span>تأكيد</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Restore Backup Dialog */}
        <Suspense fallback={null}>
          <AnimatePresence>
            {isRestoreModalOpen && (
              <BackupRestoreModal
                isOpen={isRestoreModalOpen}
                onClose={() => setIsRestoreModalOpen(false)}
                onRestoreSuccess={handleRestoreSuccess}
              />
            )}
          </AnimatePresence>

          {/* Backup Reminder Settings Dialog */}
          <AnimatePresence>
            {isBackupReminderModalOpen && (
              <BackupReminderModal
                isOpen={isBackupReminderModalOpen}
                onClose={() => setIsBackupReminderModalOpen(false)}
                currentInterval={reminderInterval}
                onSave={handleSaveReminderInterval}
              />
            )}
          </AnimatePresence>

          {/* Footer Settings Dialog */}
          <AnimatePresence>
            {isFooterSettingsModalOpen && (
              <FooterSettingsModal
                isOpen={isFooterSettingsModalOpen}
                onClose={() => setIsFooterSettingsModalOpen(false)}
                enabled={isDefaultFooterEnabled}
                onToggle={setIsDefaultFooterEnabled}
              />
            )}
          </AnimatePresence>

          {/* Exclusive Advertising Privilege Dialog */}
          <AnimatePresence>
            {isAdModalOpen && (
              <AdvertisingPrivilegeModal
                isOpen={isAdModalOpen}
                onClose={() => setIsAdModalOpen(false)}
                onSave={handleSaveAdText}
              />
            )}
          </AnimatePresence>

          {/* Sponsor Window Timing Settings Dialog */}
          <AnimatePresence>
            {isSponsorWindowEnabled && isSponsorSettingsModalOpen && (
              <SponsorSettingsModal
                isOpen={isSponsorSettingsModalOpen}
                onClose={() => setIsSponsorSettingsModalOpen(false)}
                currentInterval={sponsorInterval}
                onSave={handleSaveSponsorInterval}
                onPreview={() => setIsSponsorAdOpen(true)}
              />
            )}
          </AnimatePresence>

          {/* 75% Viewport 10-Second Sponsorship Ad Card */}
          {isSponsorWindowEnabled && isSponsorAdOpen && (
            <SponsorAdCard
              isOpen={isSponsorWindowEnabled && isSponsorAdOpen}
              onClose={handleCloseSponsorAd}
            />
          )}
        </Suspense>

        {/* Windows-style Backup Reminder Toast */}
        <AnimatePresence>
          {reminderToastVisible && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98, transition: { duration: 0.6, ease: 'easeInOut' } }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-6 right-6 z-[100] w-96 bg-white rounded-2xl shadow-2xl border-2 border-black p-4 flex flex-col gap-3 text-right"
              dir="rtl"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-300 text-sky-700 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div className="flex-1">
                  <h5 className="font-black text-[10px] text-blue-700 uppercase tracking-widest mb-0.5">SMART CONTROL 0.1</h5>
                  <h6 className="font-bold text-sm text-slate-900 leading-tight">إشعار حفظ النسخة الاحتياطية</h6>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    نذكرك بحفظ نسخة احتياطية من بيانات التطبيق
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReminderToastVisible(false)}
                    className="px-4 py-2 rounded-xl border-2 border-black text-slate-900 font-bold text-xs hover:bg-slate-100 active:scale-95 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReminderToastVisible(false);
                      setIsBackupReminderModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl border-2 border-black bg-sky-100 hover:bg-sky-200 text-sky-900 flex items-center justify-center transition active:scale-95 shrink-0 shadow-sm"
                    title="إعدادات الإشعارات"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setReminderToastVisible(false);
                    handleSaveBackup();
                  }}
                  className="px-5 py-2 rounded-xl border-2 border-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md active:scale-95 transition"
                >
                  حفظ
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Backup Feedback Toast */}
        <AnimatePresence>
          {backupToast && (
            <motion.div
              initial={{ opacity: 0, y: -25, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -25, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-3 backdrop-blur-md max-w-md text-right ${
                backupToast.isError
                  ? 'bg-rose-950/90 text-white border-rose-500 shadow-rose-900/30'
                  : 'bg-emerald-950/90 text-white border-emerald-500 shadow-emerald-900/30'
              }`}
              dir="rtl"
            >
              {backupToast.isError ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <span className="leading-snug">{backupToast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={`flex-1 flex flex-col items-center z-10 w-full min-h-0 ${step === 0 ? 'h-full justify-between p-0 pb-0.5 pt-0 overflow-hidden' : [4, 6, 7, 9].includes(step) ? 'h-full justify-start pt-0.5 pb-0 px-1 sm:pt-[9px] sm:pb-[3px] sm:px-0 overflow-y-auto overflow-x-hidden' : [1, 2].includes(step) ? 'h-full overflow-y-auto overflow-x-hidden p-4 md:p-8' : 'justify-center p-4 md:p-8'}`}>
          {step === 10 && (
            <Suspense fallback={null}>
              <div className="w-full max-w-4xl flex justify-center mb-3.5 z-30">
                <ColorThemeBar
                  activeTheme={activeColorTheme}
                  onThemeChange={handleColorThemeChange}
                  lang={lang}
                />
              </div>
            </Suspense>
          )}
          <Suspense fallback={<ScreenSuspenseFallback />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                {...FAST_SCREEN_FLIP}
                className={`w-full flex flex-col items-center ${step === 0 ? 'flex-1 h-full justify-between min-h-0' : [4, 6, 7, 9].includes(step) ? 'flex-1 h-full min-h-0' : [1, 2].includes(step) ? 'my-auto' : ''}`}
              >
            {(() => {
              switch (step) {
                case 0:
                  return (
                    <SplashScreen
                      key="splash"
                      onNext={handleStartApp}
                      lang={lang}
                      isTrialExpired={trialInfo.isExpired}
                      isDayExpired={trialInfo.isDayExpired}
                      trialRemainingDayMs={trialInfo.remainingDayMs}
                      trialCurrentDayNumber={trialInfo.currentDayNumber}
                      trialRemainingDaysCount={trialInfo.remainingDaysCount}
                    />
                  );
                case 1:
                  return (
                    <MainScreen
                      key="main"
                      schoolData={schoolData}
                      controlData={currentControlData}
                      onSchoolChange={setSchoolData}
                      onControlChange={handleControlChange}
                      onBack={() => navigateStep(0)}
                      onNext={() => {
                        if (schoolData.stage === 'middle') {
                          navigateStep(10);
                        } else if (schoolData.stage === 'secondary') {
                          navigateStep(11);
                        } else {
                          navigateStep(2);
                        }
                      }}
                      lang={lang}
                    />
                  );
                case 10:
                  return (
                    <MiddleSystemTypeScreen
                      key="middle-system-type"
                      lang={lang}
                      initialType={schoolData.systemType || 'regular'}
                      theme={activeColorTheme}
                      onBack={() => navigateStep(1)}
                      onSelect={(systemType) => {
                        setSchoolData(prev => ({ ...prev, systemType }));
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('current_system_type', systemType);
                          localStorage.setItem('systemType', systemType);
                        }
                        navigateStep(2);
                      }}
                    />
                  );
                case 11:
                  return (
                    <SecondarySystemTypeScreen
                      key="secondary-system-type"
                      lang={lang}
                      initialType={schoolData.systemType || 'regular'}
                      theme={activeColorTheme}
                      onBack={() => navigateStep(1)}
                      onSelect={(systemType) => {
                        setSchoolData(prev => ({ ...prev, systemType }));
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('current_system_type', systemType);
                          localStorage.setItem('systemType', systemType);
                        }
                        navigateStep(2);
                      }}
                    />
                  );
                case 2:
                  return (
                    <GradesScreen
                      stage={schoolData.stage as any}
                      systemType={schoolData.systemType}
                      key="grades"
                      data={currentControlData}
                      onChange={handleControlChange}
                      onBack={() => {
                        if (schoolData.stage === 'middle') {
                          navigateStep(10);
                        } else if (schoolData.stage === 'secondary') {
                          navigateStep(11);
                        } else {
                          navigateStep(1);
                        }
                      }}
                      onEditData={() => {
                        setEditMode('data');
                        if (isSecondSecondaryGrade) {
                          navigateStep(12);
                        } else {
                          navigateStep(3);
                        }
                      }}
                      onEditGrades={() => {
                        setEditMode('grades');
                        if (isSecondSecondaryGrade) {
                          navigateStep(12);
                        } else {
                          navigateStep(3);
                        }
                      }}
                      isOfficial={!isTrialMode}
                      hasStudentsForGrade={checkHasStudentsForGrade}
                      lang={lang}
                    />
                  );
                case 12:
                  return (
                    <SecondaryGrade2SystemScreen
                      key="secondary-grade2-system"
                      lang={lang}
                      initialSystem={schoolData.secondarySystem || 'old'}
                      theme={activeColorTheme}
                      onBack={() => navigateStep(2)}
                      onSelect={(selectedSystem) => {
                        setSchoolData(prev => ({ ...prev, secondarySystem: selectedSystem }));
                        if (selectedSystem === 'old') {
                          navigateStep(8);
                        } else {
                          navigateStep(13);
                        }
                      }}
                    />
                  );
                case 8:
                  return (
                    <DivisionScreen
                      key="division"
                      lang={lang}
                      initialDivision={schoolData.division && !schoolData.division.startsWith('modern_') ? schoolData.division : 'literary'}
                      subtitle={getDivisionSubtitle()}
                      onBack={() => navigateStep(12)}
                      onSave={(division) => {
                        setSchoolData(prev => ({ ...prev, secondarySystem: 'old', division }));
                        navigateStep(3);
                      }}
                    />
                  );
                case 13:
                  return (
                    <SecondaryModernTracksScreen
                      key="secondary-modern-tracks"
                      lang={lang}
                      initialTrack={schoolData.division?.startsWith('modern_') ? schoolData.division : 'modern_medical'}
                      subtitle={getDivisionSubtitle()}
                      theme={activeColorTheme}
                      onBack={() => navigateStep(12)}
                      onSelect={(trackId) => {
                        setSchoolData(prev => ({ ...prev, secondarySystem: 'modern', division: trackId }));
                        navigateStep(3);
                      }}
                    />
                  );
                case 3:
                  return (
                    <SemesterScreen
                      key="semester"
                      disableRetake={true}
                      lang={lang}
                      initialSemester={schoolData.semester === 'retake' ? 'first' : schoolData.semester}
                      subtitle={getSemesterSubtitle()}
                      onBack={() => {
                        if (isSecondSecondaryGrade) {
                          if (schoolData.secondarySystem === 'modern') {
                            navigateStep(13);
                          } else {
                            navigateStep(8);
                          }
                        } else {
                          navigateStep(2);
                        }
                      }}
                      onSave={(semester) => {
                        setSchoolData(prev => ({ ...prev, semester }));
                        if (editMode === 'grades') {
                          if (!isTrialMode && !checkHasStudentsForGrade(currentControlData.selectedGrade)) {
                            setEditMode('data');
                            navigateStep(4);
                            return;
                          }
                          if (schoolData.stage === 'middle' && schoolData.systemType === 'homeschool') {
                            setStep5PrevStep(3);
                            navigateStep(7);
                          } else if (schoolData.stage === 'secondary' && schoolData.systemType === 'homeschool') {
                            setStep5PrevStep(3);
                            navigateStep(7);
                          } else {
                            setStep5PrevStep(3);
                            navigateStep(5);
                          }
                        } else {
                          navigateStep(4);
                        }
                      }}
                    />
                  );
                case 4:
                  return (
                    <StudentsDataScreen
                      key={`students-${schoolData.educationType}-${schoolData.stage}-${gradeWithDivision}-${schoolData.semester}`}
                      lang={lang}
                      semester={schoolData.semester || 'first'}
                      title={getScreenTitle()}
                      stage={schoolData.stage}
                      educationType={schoolData.educationType}
                      systemType={schoolData.systemType}
                      selectedGrade={gradeWithDivision}
                      administration={schoolData.administration}
                      schoolName={schoolData.schoolName}
                      dataOfficer={currentControlData.dataOfficer}
                      controlHead={currentControlData.controlHead}
                      committeeHead={currentControlData.committeeHead}
                      data={currentStudentsData}
                      onChange={handleStudentsDataChange}
                      onBack={() => navigateStep(3)}
                      isTrialMode={isTrialMode}
                      onSave={() => {
                        if (!isTrialMode && !hasCurrentStudents) {
                          return;
                        }
                        if (schoolData.stage === 'middle' && schoolData.systemType === 'homeschool') {
                          setStep5PrevStep(4);
                          navigateStep(7);
                        } else if (schoolData.stage === 'secondary' && schoolData.systemType === 'homeschool') {
                          setStep5PrevStep(4);
                          navigateStep(7);
                        } else {
                          setStep5PrevStep(4);
                          navigateStep(5);
                        }
                      }}
                      showExamFields={!isFirstOrSecondPrimary}
                      sortBy={currentStageSortBy}
                      onSortChange={handleStageSortChange}
                      onNavigateToSection={(targetStep, targetSem) => {
                        if (!isTrialMode && !hasCurrentStudents && (targetStep === 5 || targetStep === 6 || targetStep === 7 || targetStep === 9)) {
                          return;
                        }
                        if ((schoolData.stage === 'middle' || schoolData.stage === 'secondary') && schoolData.systemType === 'homeschool' && (targetStep === 5 || targetStep === 6 || targetStep === 9)) {
                          return;
                        }
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        navigateStep(targetStep);
                      }}
                      onEditData={(targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        navigateStep(4);
                      }}
                      onEditAssessments={(schoolData.stage === 'middle' || schoolData.stage === 'secondary') && schoolData.systemType === 'homeschool' ? undefined : (targetSem?: string) => {
                        if (!isTrialMode && !hasCurrentStudents) return;
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        navigateStep(6);
                      }}
                      onEditWrittenExams={schoolData.stage === 'kindergarten' ? undefined : (targetSem?: string) => {
                        if (!isTrialMode && !hasCurrentStudents) return;
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        navigateStep(7);
                      }}
                      onSwitchSemester={(newSem) => {
                        setSchoolData(prev => ({ ...prev, semester: newSem }));
                      }}
                    />
                  );
                case 5:
                  return (
                    <AssessmentsOrExamsScreen
                      key="assessments-or-exams"
                      stage={schoolData.stage}
                      isKindergarten={schoolData.stage === 'kindergarten'}
                      disableExams={isFirstOrSecondPrimary}
                      lang={lang}
                      onBack={() => navigateStep(step5PrevStep)}
                      onSelectAssessments={() => navigateStep(6)}
                      onSelectDetailedAssessments={() => {
                        const subjToOpen = currentDetailedSubject || (() => {
                          try {
                            return localStorage.getItem(`detailed_assessments_last_subject_${schoolData.stage}_${gradeWithDivision}`) ||
                                  localStorage.getItem('detailed_assessments_last_subject') ||
                                  undefined;
                          } catch { return undefined; }
                        })();
                        if (subjToOpen) {
                          handleDetailedSubjectChange(subjToOpen);
                        }
                        navigateStep(9);
                      }}
                      onSelectExams={() => navigateStep(7)}
                      isOfficial={!isTrialMode}
                      hasStudents={hasCurrentStudents}
                    />
                  );
                case 6:
                  return (
                    <AssessmentsGradesScreen
                      stage={schoolData.stage}
                      educationType={schoolData.educationType}
                      selectedGrade={gradeWithDivision}
                      schoolName={schoolData.schoolName}
                      administration={schoolData.administration}
                      schoolLogo={schoolData.schoolLogo}
                      dataOfficer={currentControlData.dataOfficer}
                      controlHead={currentControlData.controlHead}
                      committeeHead={currentControlData.committeeHead}
                      lastDetailedSubjectKey={currentDetailedSubject}
                      key={`assessments-${schoolData.educationType}-${schoolData.stage}-${gradeWithDivision}-${schoolData.semester}`}
                      lang={lang}
                      title={getScreenTitle()}
                      semester={schoolData.semester || 'first'}
                      data={currentStudentsData}
                      onChange={handleStudentsDataChange}
                      onBack={() => navigateStep(5)}
                      isTrialMode={isTrialMode}
                      sortBy={currentStageSortBy}
                      onSortChange={handleStageSortChange}
                      onEditData={(targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        navigateStep(4);
                      }}
                      onNavigateToSection={(targetStep, targetSem) => {
                        setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        navigateStep(targetStep);
                      }}
                      onEditWrittenExams={schoolData.stage === 'kindergarten' ? undefined : (targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        navigateStep(7);
                      }}
                      onSwitchSemester={(newSem) => {
                        setSchoolData(prev => ({ ...prev, semester: newSem }));
                      }}
                      onNavigateToDetailedAssessments={schoolData.stage === 'kindergarten' ? undefined : (targetSubject?: string) => {
                        const resolvedSubj = targetSubject || currentDetailedSubject || (() => {
                          try {
                            return localStorage.getItem(`detailed_assessments_last_subject_${schoolData.stage}_${gradeWithDivision}`) ||
                                  localStorage.getItem('detailed_assessments_last_subject') ||
                                  undefined;
                          } catch { return undefined; }
                        })();
                        if (resolvedSubj) {
                          handleDetailedSubjectChange(resolvedSubj);
                        }
                        navigateStep(9);
                      }}
                    />
                  );
                case 7:
                  return (
                    <WrittenExamsGradesScreen
                      stage={schoolData.stage}
                      educationType={schoolData.educationType}
                      systemType={schoolData.systemType}
                      selectedGrade={gradeWithDivision}
                      schoolName={schoolData.schoolName}
                      administration={schoolData.administration}
                      schoolLogo={schoolData.schoolLogo}
                      dataOfficer={currentControlData.dataOfficer}
                      controlHead={currentControlData.controlHead}
                      committeeHead={currentControlData.committeeHead}
                      key={`written-exams-${schoolData.educationType}-${schoolData.stage}-${gradeWithDivision}-${schoolData.systemType || 'regular'}-${schoolData.semester}`}
                      lang={lang}
                      title={getScreenTitle()}
                      semester={schoolData.semester || 'first'}
                      data={currentStudentsData}
                      onChange={handleStudentsDataChange}
                      isTrialMode={isTrialMode}
                      onBack={() => {
                        if ((schoolData.stage === 'middle' || schoolData.stage === 'secondary') && schoolData.systemType === 'homeschool') {
                          navigateStep(step5PrevStep === 4 ? 4 : 3);
                        } else {
                          navigateStep(5);
                        }
                      }}
                      sortBy={currentStageSortBy}
                      onSortChange={handleStageSortChange}
                      onEditData={(targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        navigateStep(4);
                      }}
                      onNavigateToSection={(targetStep, targetSem) => {
                        if ((schoolData.stage === 'middle' || schoolData.stage === 'secondary') && schoolData.systemType === 'homeschool' && (targetStep === 5 || targetStep === 6 || targetStep === 9)) {
                          return;
                        }
                        setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        navigateStep(targetStep);
                      }}
                      onEditAssessments={(schoolData.stage === 'middle' || schoolData.stage === 'secondary') && schoolData.systemType === 'homeschool' ? undefined : (targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        navigateStep(6);
                      }}
                      onSwitchSemester={(newSem) => {
                        setSchoolData(prev => ({ ...prev, semester: newSem }));
                      }}
                    />
                  );
                case 9:
                  return (
                    <DetailedAssessmentsGradesScreen
                      key={`detailed-assessments-${schoolData.educationType}-${schoolData.stage}-${gradeWithDivision}-${schoolData.semester}`}
                      stage={schoolData.stage}
                      educationType={schoolData.educationType}
                      selectedGrade={gradeWithDivision}
                      secondarySystem={schoolData.secondarySystem}
                      currentSubjectKey={currentDetailedSubject}
                      onSubjectChange={handleDetailedSubjectChange}
                      lang={lang}
                      title={getScreenTitle()}
                      semester={schoolData.semester || 'first'}
                      systemType={schoolData.systemType || 'regular'}
                      data={currentStudentsData}
                      onChange={handleStudentsDataChange}
                      onBack={() => navigateStep(5)}
                      sortBy={currentStageSortBy}
                      onSortChange={handleStageSortChange}
                      onNavigateToGeneralAssessments={() => navigateStep(6)}
                      onEditData={(targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        navigateStep(4);
                      }}
                      onEditWrittenExams={schoolData.stage === 'kindergarten' ? undefined : (targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        navigateStep(7);
                      }}
                      onNavigateToSection={(targetStep, targetSem) => {
                        setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        navigateStep(targetStep);
                      }}
                      schoolName={schoolData.schoolName}
                      schoolNameEn={schoolData.schoolNameEn}
                      administration={schoolData.administration}
                      administrationEn={schoolData.administrationEn}
                      schoolLogo={schoolData.schoolLogo}
                      dataOfficer={currentControlData.dataOfficer}
                      dataOfficerEn={currentControlData.dataOfficerEn}
                      controlHead={currentControlData.controlHead}
                      controlHeadEn={currentControlData.controlHeadEn}
                      committeeHead={currentControlData.committeeHead}
                      committeeHeadEn={currentControlData.committeeHeadEn}
                      isTrialMode={isTrialMode}
                    />
                  );
                default:
                  return (
                    <SplashScreen
                      key="splash-fallback"
                      onNext={handleStartApp}
                      lang={lang}
                      isTrialExpired={trialInfo.isExpired}
                      isDayExpired={trialInfo.isDayExpired}
                      trialRemainingDayMs={trialInfo.remainingDayMs}
                      trialCurrentDayNumber={trialInfo.currentDayNumber}
                      trialRemainingDaysCount={trialInfo.remainingDaysCount}
                    />
                  );
              }
            })()}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>
        <Suspense fallback={null}>
          <FooterBanner lang={lang} isFooterEnabled={isDefaultFooterEnabled} />
        </Suspense>
        <OfflineIndicator />
      </div>
    </div>
  );
}
