import React, { ComponentType, lazy } from 'react';

/**
 * غلاف مقاوم لانقطاع الاتصال لتحميل الشاشات الكسولة (Lazy Chunks) مع إعادة محاولة سريعة
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await factory();
      } catch (err) {
        lastError = err;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 180 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  });
}

let hasPrefetchedAllScreens = false;
let prefetchInFlight: Promise<void> | null = null;

const SCREEN_IMPORTERS: Array<() => Promise<unknown>> = [
  () => import('../components/SplashScreen'),
  () => import('../components/MainScreen'),
  () => import('../components/GradesScreen'),
  () => import('../components/SemesterScreen'),
  () => import('../components/MiddleSystemTypeScreen'),
  () => import('../components/SecondarySystemTypeScreen'),
  () => import('../components/TechnicalSystemTypeScreen'),
  () => import('../components/TechnicalGradesScreen'),
  () => import('../components/SecondaryGrade2SystemScreen'),
  () => import('../components/DivisionScreen'),
  () => import('../components/TechnicalDivisionScreen'),
  () => import('../components/SecondaryModernTracksScreen'),
  () => import('../components/AssessmentsOrExamsScreen'),
  () => import('../components/StudentsDataScreen'),
  () => import('../components/AssessmentsGradesScreen'),
  () => import('../components/WrittenExamsGradesScreen'),
  () => import('../components/DetailedAssessmentsGradesScreen'),
  () => import('../components/ColorThemeBar'),
  () => import('../components/FooterBanner'),
  () => import('../components/BackupRestoreModal'),
  () => import('../components/BackupReminderModal'),
  () => import('../components/FooterSettingsModal'),
  () => import('../components/AdvertisingPrivilegeModal'),
  () => import('../components/SponsorSettingsModal'),
  () => import('../components/SponsorAdCard'),
  () => import('../utils/defaultStudentsData'),
  () => import('../utils/backupRestore'),
  () => import('../utils/exportPdf'),
];

/**
 * تحميل وتخزين جميع حزم الشاشات والنوافذ في ذاكرة الجهاز والكاش أثناء الخمول
 * لضمان جاهزيتها الكاملة عند فصل الإنترنت حتى قبل دخول المستخدم للشاشات الداخلية
 */
export function prefetchAllScreensForOffline(): Promise<void> {
  if (typeof window === 'undefined' || hasPrefetchedAllScreens) {
    return Promise.resolve();
  }
  if (prefetchInFlight) {
    return prefetchInFlight;
  }

  prefetchInFlight = (async () => {
    const BATCH_SIZE = 3;
    for (let i = 0; i < SCREEN_IMPORTERS.length; i += BATCH_SIZE) {
      const batch = SCREEN_IMPORTERS.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map((loader) => loader()));
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    hasPrefetchedAllScreens = true;
  })()
    .catch(() => {})
    .finally(() => {
      prefetchInFlight = null;
    });

  return prefetchInFlight;
}
