import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SplashScreen } from './components/SplashScreen';
import { MainScreen } from './components/MainScreen';
import { GradesScreen } from './components/GradesScreen';
import { DivisionScreen } from './components/DivisionScreen';
import { SemesterScreen } from './components/SemesterScreen';
import { StudentsDataScreen } from './components/StudentsDataScreen';
import { AssessmentsOrExamsScreen } from './components/AssessmentsOrExamsScreen';
import { AssessmentsGradesScreen } from './components/AssessmentsGradesScreen';
import { WrittenExamsGradesScreen } from './components/WrittenExamsGradesScreen';
import { DetailedAssessmentsGradesScreen } from './components/DetailedAssessmentsGradesScreen';
import { MiddleSystemTypeScreen } from './components/MiddleSystemTypeScreen';
import { SecondarySystemTypeScreen } from './components/SecondarySystemTypeScreen';
import { SecondaryGrade2SystemScreen } from './components/SecondaryGrade2SystemScreen';
import { SecondaryModernTracksScreen } from './components/SecondaryModernTracksScreen';
import { ColorThemeBar } from './components/ColorThemeBar';
import { ColorThemeKey, getSavedColorTheme, saveColorTheme } from './utils/themeConfig';
import { SchoolData, ControlData, Language, StudentData } from './types';
import { translations, setCurrentAffiliatedEntity } from './i18n';
import { AnimatedBackground } from './components/AnimatedBackground';
import { Languages, FileDown, Share2, Menu, Megaphone, X, Settings, HardDrive, FolderOutput, LogOut, LayoutDashboard, Home, CheckCircle2, AlertTriangle, Bell, Clock } from 'lucide-react';

import { FooterBanner } from './components/FooterBanner';
import { getAllDefaultStudentsDataByStage } from './utils/defaultStudentsData';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { BackupReminderModal } from './components/BackupReminderModal';
import { FooterSettingsModal } from './components/FooterSettingsModal';
import { AdvertisingPrivilegeModal } from './components/AdvertisingPrivilegeModal';
import { createBackupPayload, saveBackupToFile, BackupPayload } from './utils/backupRestore';
import { getTrialInfo, startTrial, setTrialExpired, formatTrialTime, consumeTrialTime, syncTrialWithServer, TrialInfo } from './utils/trialManager';
import { isPaidUnlocked, checkAndRegisterPaidLaunch, recordPaidActiveTime } from './utils/activationManager';
import { idbSet, idbGet } from './utils/idbStorage';

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

function loadTrialStudentsData(): Record<string, StudentData[]> {
  // تفريغ أي نسخة تجريبية ضخمة مخزنة مسبقاً لتفادي تجاوز سعة التخزين (QuotaExceededError)
  try {
    localStorage.removeItem('sheet_control_trial_students_data');
  } catch {}
  return getAllDefaultStudentsDataByStage();
}

function loadOfficialStudentsData(): Record<string, StudentData[]> {
  const saved = localStorage.getItem('sheet_control_official_students_data');
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isBackupReminderModalOpen, setIsBackupReminderModalOpen] = useState(false);
  const [isFooterSettingsModalOpen, setIsFooterSettingsModalOpen] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [customAdText, setCustomAdText] = useState(() => localStorage.getItem('sheet_control_ad_text') || '');

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
    
    if (isOfficial) {
      if (!isPaidUnlocked()) {
        localStorage.setItem('sheet_control_step', '0');
        return 0;
      }
      const lastOfficial = localStorage.getItem('sheet_control_last_official_step');
      if (lastOfficial) {
        const parsed = parseInt(lastOfficial, 10);
        if (parsed > 0) return parsed;
      }
      return 1; // Default to main screen if official but no step saved
    }

    const savedStep = localStorage.getItem('sheet_control_step');
    return savedStep ? parseInt(savedStep, 10) : 0;
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

  // احتساب وقت العمل الفعلي للنسخة التجريبية (ساعة واحدة يومياً لمدة 4 أيام كحد أقصى)
  useEffect(() => {
    setTrialInfo(getTrialInfo());

    if (!isTrialMode || isPaidUnlocked()) return;

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
        if ((updated.isExpired || updated.isDayExpired) && !isPaidUnlocked()) {
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

  // تسجيل تشغيل البرنامج والتحقق من الأنظمة الأمنية الثلاثة (110 مرة / 110 يوم / 110 ساعة)
  useEffect(() => {
    const launch = checkAndRegisterPaidLaunch();
    if (launch.justExpired) {
      setIsTrialMode(false);
      localStorage.setItem('sheet_control_is_trial', 'false');
      setStep(0);
      localStorage.setItem('sheet_control_step', '0');
    }
  }, []);

  // احتساب وقت العمل الفعلي للنسخة الرسمية (200 ساعة) في الخلفية دون أي تلميحات أو رسائل للمستخدم
  useEffect(() => {
    if (isTrialMode || !isPaidUnlocked()) return;

    let lastTick = Date.now();

    const tick = () => {
      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;

      if (delta > 0 && delta < 15000 && !document.hidden) {
        const res = recordPaidActiveTime(delta);
        if (res.isExpired) {
          setIsTrialMode(false);
          localStorage.setItem('sheet_control_is_trial', 'false');
          setStep(0);
          localStorage.setItem('sheet_control_step', '0');
        }
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

  // مزامنة حالة الحصة التجريبية للجهاز مع الخادم للتعرف عليه عبر أي متصفح
  useEffect(() => {
    syncTrialWithServer().then((serverInfo) => {
      setTrialInfo(serverInfo);
      if ((serverInfo.isExpired || serverInfo.isDayExpired) && !isPaidUnlocked()) {
        setIsTrialMode(false);
        localStorage.setItem('sheet_control_is_trial', 'false');
        setStep(0);
        localStorage.setItem('sheet_control_step', '0');
      }
    });
  }, []);

  const handleStartApp = (isTrial?: boolean) => {
    if (isTrial) {
      const current = getTrialInfo();
      if (current.isExpired || current.isDayExpired) {
        setTrialInfo(current);
        setStep(0);
        return;
      }
      const res = startTrial();
      if (!res.success) {
        setTrialInfo(getTrialInfo());
        setStep(0);
        return;
      }
      setIsTrialMode(true);
      localStorage.setItem('sheet_control_is_trial', 'true');
      setTrialInfo(getTrialInfo());

      // تحميل بيانات النسخة التجريبية (25 طالب بكامل بياناتهم ودرجاتهم وبيانات افتراضية للنافذة الرئيسية)
      setSchoolData(loadTrialSchoolData());
      setControlDataByStage(loadTrialControlData());
      setStudentsDataByStage(loadTrialStudentsData());

      setStep(1);
      localStorage.setItem('sheet_control_step', '1');
    } else {
      if (!isPaidUnlocked()) {
        setStep(0);
        return;
      }
      setIsTrialMode(false);
      localStorage.setItem('sheet_control_is_trial', 'false');

      // تحميل بيانات النسخة الرسمية (نظام نظيف ومُهيأ بدون درجات وبدون طلاب وبدون بيانات المدرسة)
      setSchoolData(loadOfficialSchoolData());
      setControlDataByStage(loadOfficialControlData());
      setStudentsDataByStage(loadOfficialStudentsData());

      const lastOfficial = localStorage.getItem('sheet_control_last_official_step');
      const targetStep = lastOfficial ? parseInt(lastOfficial, 10) : 1;
      const validStep = targetStep > 0 ? targetStep : 1;
      setStep(validStep);
      localStorage.setItem('sheet_control_step', validStep.toString());
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
    return isTrial ? loadTrialStudentsData() : loadOfficialStudentsData();
  });

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

  useEffect(() => {
    // تنظيف أي نسخة تجريبية قديمة استهلكت سعة التخزين
    try {
      localStorage.removeItem('sheet_control_trial_students_data');
    } catch {}

    // حفظ احتياطي صامت في الخلفية عبر IndexedDB للبيانات الضخمة
    try {
      const idbKey = isTrialMode ? 'idb_trial_students_data' : 'idb_official_students_data';
      idbSet(idbKey, studentsDataByStage);
    } catch {}

    if (!isTrialMode) {
      try {
        localStorage.setItem('sheet_control_official_students_data', JSON.stringify(studentsDataByStage));
        localStorage.setItem('sheet_control_students_data', JSON.stringify(studentsDataByStage));
      } catch (err) {
        console.warn('Failed to save official students data:', err);
      }
    }
  }, [studentsDataByStage, isTrialMode]);

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
    const key = isTrialMode ? 'sheet_control_trial_school_data' : 'sheet_control_official_school_data';
    const logoKey = isTrialMode ? 'sheet_control_trial_school_logo' : 'sheet_control_official_school_logo';
    try {
      localStorage.setItem(key, JSON.stringify(schoolData));
      localStorage.setItem('sheet_control_school_data', JSON.stringify(schoolData));
      if (schoolData.schoolLogo) {
        localStorage.setItem(logoKey, schoolData.schoolLogo);
        localStorage.setItem('sheet_control_school_logo', schoolData.schoolLogo);
      } else {
        localStorage.removeItem(logoKey);
        localStorage.removeItem('sheet_control_school_logo');
      }
    } catch (err) {
      console.error('Failed to save schoolData to localStorage:', err);
    }
  }, [schoolData, isTrialMode]);

  useEffect(() => {
    try {
      const key = isTrialMode ? 'sheet_control_trial_control_data_by_stage' : 'sheet_control_official_control_data_by_stage';
      localStorage.setItem(key, JSON.stringify(controlDataByStage));
      localStorage.setItem('sheet_control_control_data_by_stage', JSON.stringify(controlDataByStage));
    } catch (err) {
      console.warn('Failed to save controlDataByStage:', err);
    }
  }, [controlDataByStage, isTrialMode]);

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
    if (isTrialMode && !isPaidUnlocked()) {
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

    setSchoolData(EMPTY_OFFICIAL_SCHOOL_DATA);
    setControlDataByStage({});
    setStudentsDataByStage({});
    setEditMode('data');
    setStep5PrevStep(3);
    setStep(1);
    setIsResetModalOpen(false);
    setIsMenuOpen(false);
  };

  const handleSaveBackup = async () => {
    setIsMenuOpen(false);
    setIsSavingBackup(true);
    try {
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

  const handleRestoreSuccess = (payload: BackupPayload) => {
    if (payload.schoolData) setSchoolData(payload.schoolData);
    if (payload.controlDataByStage) setControlDataByStage(payload.controlDataByStage);
    if (payload.studentsDataByStage) setStudentsDataByStage(payload.studentsDataByStage);
    setIsRestoreModalOpen(false);
    window.location.reload();
  };

  const menuItems = [
    { id: 'splashScreen', label: t.splashScreen, icon: Home, color: 'bg-indigo-600 shadow-[0_5px_15px_-3px_rgba(79,70,229,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(79,70,229,0.6)]', action: () => { setStep(0); setIsMenuOpen(false); } },
    { id: 'mainData', label: t.mainData, icon: LayoutDashboard, color: 'bg-fuchsia-600 shadow-[0_5px_15px_-3px_rgba(192,38,211,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(192,38,211,0.6)]', action: () => { setStep(1); setIsMenuOpen(false); } },
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
      disabled: isTrialMode && !isPaidUnlocked(),
      color: (isTrialMode && !isPaidUnlocked())
        ? 'bg-slate-700/60 opacity-40 cursor-not-allowed shadow-none'
        : 'bg-teal-600 shadow-[0_5px_15px_-3px_rgba(13,148,136,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(13,148,136,0.6)]', 
      action: () => { 
        if (isTrialMode && !isPaidUnlocked()) return;
        setIsMenuOpen(false); 
        setIsResetModalOpen(true); 
      } 
    },
    { 
      id: 'ads', 
      label: t.advertisingPrivilege, 
      icon: Megaphone, 
      color: 'bg-blue-600 shadow-[0_5px_15px_-3px_rgba(37,99,235,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(37,99,235,0.6)]',
      action: () => {
        setIsMenuOpen(false);
        setIsAdModalOpen(true);
      },
    },
    { id: 'logout', label: t.logout, icon: LogOut, color: 'bg-[#dc2626] shadow-[0_5px_15px_-3px_rgba(220,38,38,0.5)] hover:shadow-[0_8px_20px_-3px_rgba(220,38,38,0.6)]' },
  ];



  const getEducationTypeLabel = (type: string) => {
    switch (type) {
      case 'official': return (t as any).official;
      case 'official_languages': return (t as any).officialLanguages;
      case 'official_distinguished': return (t as any).officialDistinguished;
      case 'ips': return (t as any).ips;
      case 'private': return (t as any).private;
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

  return (
    <div className={`min-h-screen text-slate-900 font-sans ${lang === 'ar' ? 'font-arabic' : ''}`}>
      <AnimatedBackground />
      <div className="relative min-h-screen flex flex-col">
        {/* Header with Gradient */}
        {step !== 0 && (
          <header className="w-full h-16 relative overflow-hidden px-4 md:px-6 flex items-center justify-between z-10 shadow-md">
            <motion.div
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              className={`absolute inset-0 z-[-1] bg-gradient-to-r bg-[length:400%_400%] transition-colors duration-1000 ${
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
                  <motion.h1
                    animate={{ color: ['#ffffff', '#000000', '#ffffff'] }}
                    transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
                    className="font-bold text-base md:text-lg"
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  >
                    {t.appTitle}
                  </motion.h1>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 relative z-10">
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="h-12 w-12 flex items-center justify-center text-white relative overflow-hidden rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md border-[1.5px] border-white/20 group shrink-0"
              >
                <motion.div 
                  className="absolute inset-0 z-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 bg-[length:200%_auto]"
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                />
                <Menu className="w-[32px] h-[32px] relative z-10 drop-shadow-sm transition-transform group-hover:scale-110" />
              </button>
            </div>
          </header>
        )}

        <AnimatePresence>
          {isMenuOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-sm bg-[#1b1e2b] rounded-[24px] p-6 shadow-2xl z-10 flex flex-col gap-4 border border-slate-700/80"
              >
                {/* Brand Header inside Menu */}
                <div className="flex flex-col items-center gap-1.5 pb-3 border-b border-slate-700/80">
                  <h3 className="text-xl font-black text-white tracking-wide">Smart Control</h3>
                  <span className="text-xs font-semibold text-amber-400">المنظومة الرقمية للكنترول المدرسي 2026 - 2027</span>
                </div>
                {menuItems.map((item) => {
                  const isDisabled = Boolean((item as any).disabled);
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
                      className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-white transition-all ${
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed bg-slate-700/60 shadow-none hover:translate-y-0'
                          : `hover:-translate-y-0.5 active:translate-y-0 ${item.color}`
                      }`}
                    >
                      <item.icon className="w-6 h-6" />
                      <span className="font-bold text-lg">{item.label}</span>
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                onClick={() => setIsResetModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
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
                  <h5 className="font-bold text-sm text-slate-900">إشعار حفظ النسخة الاحتياطية</h5>
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
        <main className={`flex-1 flex flex-col items-center justify-center z-10 w-full ${[4, 6, 7].includes(step) ? 'p-1 sm:py-6 sm:px-0' : 'p-4 md:p-8'}`}>
          {step === 10 && (
            <div className="w-full max-w-4xl flex justify-center mb-3.5 z-30">
              <ColorThemeBar
                activeTheme={activeColorTheme}
                onThemeChange={handleColorThemeChange}
                lang={lang}
              />
            </div>
          )}
          <AnimatePresence mode="wait">
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
                      onNext={() => {
                        if (schoolData.stage === 'middle') {
                          setStep(10);
                        } else if (schoolData.stage === 'secondary') {
                          setStep(11);
                        } else {
                          setStep(2);
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
                      onBack={() => setStep(1)}
                      onSelect={(systemType) => {
                        setSchoolData(prev => ({ ...prev, systemType }));
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('current_system_type', systemType);
                          localStorage.setItem('systemType', systemType);
                        }
                        setStep(2);
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
                      onBack={() => setStep(1)}
                      onSelect={(systemType) => {
                        setSchoolData(prev => ({ ...prev, systemType }));
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('current_system_type', systemType);
                          localStorage.setItem('systemType', systemType);
                        }
                        setStep(2);
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
                          setStep(10);
                        } else if (schoolData.stage === 'secondary') {
                          setStep(11);
                        } else {
                          setStep(1);
                        }
                      }}
                      onEditData={() => {
                        setEditMode('data');
                        if (isSecondSecondaryGrade) {
                          setStep(12);
                        } else {
                          setStep(3);
                        }
                      }}
                      onEditGrades={() => {
                        setEditMode('grades');
                        if (isSecondSecondaryGrade) {
                          setStep(12);
                        } else {
                          setStep(3);
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
                      onBack={() => setStep(2)}
                      onSelect={(selectedSystem) => {
                        setSchoolData(prev => ({ ...prev, secondarySystem: selectedSystem }));
                        if (selectedSystem === 'old') {
                          setStep(8);
                        } else {
                          setStep(13);
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
                      onBack={() => setStep(12)}
                      onSave={(division) => {
                        setSchoolData(prev => ({ ...prev, secondarySystem: 'old', division }));
                        setStep(3);
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
                      onBack={() => setStep(12)}
                      onSelect={(trackId) => {
                        setSchoolData(prev => ({ ...prev, secondarySystem: 'modern', division: trackId }));
                        setStep(3);
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
                            setStep(13);
                          } else {
                            setStep(8);
                          }
                        } else {
                          setStep(2);
                        }
                      }}
                      onSave={(semester) => {
                        setSchoolData(prev => ({ ...prev, semester }));
                        if (editMode === 'grades') {
                          if (!isTrialMode && !checkHasStudentsForGrade(currentControlData.selectedGrade)) {
                            setEditMode('data');
                            setStep(4);
                            return;
                          }
                          if (schoolData.stage === 'middle' && schoolData.systemType === 'homeschool') {
                            setStep5PrevStep(3);
                            setStep(7);
                          } else if (schoolData.stage === 'secondary' && schoolData.systemType === 'homeschool') {
                            setStep5PrevStep(3);
                            setStep(7);
                          } else {
                            setStep5PrevStep(3);
                            setStep(5);
                          }
                        } else {
                          setStep(4);
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
                      systemType={schoolData.systemType}
                      selectedGrade={gradeWithDivision}
                      administration={schoolData.administration}
                      schoolName={schoolData.schoolName}
                      dataOfficer={currentControlData.dataOfficer}
                      controlHead={currentControlData.controlHead}
                      committeeHead={currentControlData.committeeHead}
                      data={currentStudentsData}
                      onChange={handleStudentsDataChange}
                      onBack={() => setStep(3)}
                      isTrialMode={isTrialMode && !isPaidUnlocked()}
                      onSave={() => {
                        if (!isTrialMode && !hasCurrentStudents) {
                          return;
                        }
                        if (schoolData.stage === 'middle' && schoolData.systemType === 'homeschool') {
                          setStep5PrevStep(4);
                          setStep(7);
                        } else if (schoolData.stage === 'secondary' && schoolData.systemType === 'homeschool') {
                          setStep5PrevStep(4);
                          setStep(7);
                        } else {
                          setStep5PrevStep(4);
                          setStep(5);
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
                        setStep(targetStep);
                      }}
                      onEditData={(targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        setStep(4);
                      }}
                      onEditAssessments={(schoolData.stage === 'middle' || schoolData.stage === 'secondary') && schoolData.systemType === 'homeschool' ? undefined : (targetSem?: string) => {
                        if (!isTrialMode && !hasCurrentStudents) return;
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        setStep(6);
                      }}
                      onEditWrittenExams={schoolData.stage === 'kindergarten' ? undefined : (targetSem?: string) => {
                        if (!isTrialMode && !hasCurrentStudents) return;
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        setStep(7);
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
                      onBack={() => setStep(step5PrevStep)}
                      onSelectAssessments={() => setStep(6)}
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
                        setStep(9);
                      }}
                      onSelectExams={() => setStep(7)}
                      isOfficial={!isTrialMode}
                      hasStudents={hasCurrentStudents}
                    />
                  );
                case 6:
                  return (
                    <AssessmentsGradesScreen
                      stage={schoolData.stage}
                      selectedGrade={gradeWithDivision}
                      lastDetailedSubjectKey={currentDetailedSubject}
                      key={`assessments-${schoolData.educationType}-${schoolData.stage}-${gradeWithDivision}-${schoolData.semester}`}
                      lang={lang}
                      title={getScreenTitle()}
                      semester={schoolData.semester || 'first'}
                      data={currentStudentsData}
                      onChange={handleStudentsDataChange}
                      onBack={() => setStep(5)}
                      isTrialMode={isTrialMode && !isPaidUnlocked()}
                      sortBy={currentStageSortBy}
                      onSortChange={handleStageSortChange}
                      onEditData={(targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        setStep(4);
                      }}
                      onNavigateToSection={(targetStep, targetSem) => {
                        setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        setStep(targetStep);
                      }}
                      onEditWrittenExams={schoolData.stage === 'kindergarten' ? undefined : (targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        setStep(7);
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
                        setStep(9);
                      }}
                    />
                  );
                case 7:
                  return (
                    <WrittenExamsGradesScreen
                      stage={schoolData.stage}
                      systemType={schoolData.systemType}
                      selectedGrade={gradeWithDivision}
                      key={`written-exams-${schoolData.educationType}-${schoolData.stage}-${gradeWithDivision}-${schoolData.systemType || 'regular'}-${schoolData.semester}`}
                      lang={lang}
                      title={getScreenTitle()}
                      semester={schoolData.semester || 'first'}
                      data={currentStudentsData}
                      onChange={handleStudentsDataChange}
                      isTrialMode={isTrialMode && !isPaidUnlocked()}
                      onBack={() => {
                        if ((schoolData.stage === 'middle' || schoolData.stage === 'secondary') && schoolData.systemType === 'homeschool') {
                          setStep(step5PrevStep === 4 ? 4 : 3);
                        } else {
                          setStep(5);
                        }
                      }}
                      sortBy={currentStageSortBy}
                      onSortChange={handleStageSortChange}
                      onEditData={(targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        setStep(4);
                      }}
                      onNavigateToSection={(targetStep, targetSem) => {
                        if ((schoolData.stage === 'middle' || schoolData.stage === 'secondary') && schoolData.systemType === 'homeschool' && (targetStep === 5 || targetStep === 6 || targetStep === 9)) {
                          return;
                        }
                        setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        setStep(targetStep);
                      }}
                      onEditAssessments={(schoolData.stage === 'middle' || schoolData.stage === 'secondary') && schoolData.systemType === 'homeschool' ? undefined : (targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        setStep(6);
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
                      onBack={() => setStep(5)}
                      sortBy={currentStageSortBy}
                      onSortChange={handleStageSortChange}
                      onNavigateToGeneralAssessments={() => setStep(6)}
                      onEditData={(targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        setStep(4);
                      }}
                      onEditWrittenExams={schoolData.stage === 'kindergarten' ? undefined : (targetSem?: string) => {
                        if (targetSem) {
                          setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        }
                        setStep(7);
                      }}
                      onNavigateToSection={(targetStep, targetSem) => {
                        setSchoolData(prev => ({ ...prev, semester: targetSem }));
                        setStep(targetStep);
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
                      isTrialMode={isTrialMode && !isPaidUnlocked()}
                    />
                  );
                default:
                  return null;
              }
            })()}
          </AnimatePresence>
        </main>
        <FooterBanner lang={lang} isFooterEnabled={isDefaultFooterEnabled} />
      </div>
    </div>
  );
}
