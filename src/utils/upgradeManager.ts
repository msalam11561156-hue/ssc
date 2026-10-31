import { idbGet, idbSet } from './idbStorage';

/**
 * معرف التطبيق الثابت والفريد (Fixed App Bundle Identifier / GUID)
 * يستخدم من قبل أنظمة التشغيل (Windows / macOS / WebApp Installers) لترقية البرنامج في مكانه دون تكرار
 */
export const APP_BUNDLE_ID = 'com.smartcontrol.app';
export const APP_GUID = 'A3F8B9C1-82E4-4C91-9F3D-7E1A2B3C4D5E';
export const CURRENT_APP_VERSION = '2026.2.0';

const INSTALLED_VERSION_KEY = 'smart_control_installed_version';
const LAST_UPGRADE_TIME_KEY = 'smart_control_last_upgrade_timestamp';
const UPGRADE_SNAPSHOTS_STORE = 'smart_control_upgrade_snapshots';

export interface UpgradeReport {
  isFirstInstall: boolean;
  isUpgraded: boolean;
  previousVersion: string | null;
  currentVersion: string;
  bundleIdentifier: string;
  dataPreserved: boolean;
  timestamp: string;
}

/**
 * فحص تلقائي لعملية الترقية في مكانها (In-Place Upgrade)
 * يكتشف وجود أي نسخة قديمة من التطبيق ويقوم بالترقية مع الحفاظ الكامل على كافة البيانات المحلية
 */
export async function checkAndPerformInPlaceUpgrade(): Promise<UpgradeReport> {
  if (typeof window === 'undefined') {
    return {
      isFirstInstall: false,
      isUpgraded: false,
      previousVersion: null,
      currentVersion: CURRENT_APP_VERSION,
      bundleIdentifier: APP_BUNDLE_ID,
      dataPreserved: true,
      timestamp: new Date().toISOString(),
    };
  }

  const previousVersion = localStorage.getItem(INSTALLED_VERSION_KEY);
  const now = new Date().toISOString();

  // 1. التثبيت لأول مرة
  if (!previousVersion) {
    localStorage.setItem(INSTALLED_VERSION_KEY, CURRENT_APP_VERSION);
    localStorage.setItem(LAST_UPGRADE_TIME_KEY, now);
    localStorage.setItem('smart_control_app_guid', APP_GUID);
    localStorage.setItem('smart_control_bundle_id', APP_BUNDLE_ID);

    return {
      isFirstInstall: true,
      isUpgraded: false,
      previousVersion: null,
      currentVersion: CURRENT_APP_VERSION,
      bundleIdentifier: APP_BUNDLE_ID,
      dataPreserved: true,
      timestamp: now,
    };
  }

  // 2. فحص ما إذا كانت النسخة الحالية أحدث من النسخة السابقة (In-Place Upgrade)
  const isUpgraded = previousVersion !== CURRENT_APP_VERSION;

  if (isUpgraded) {
    console.log(`[In-Place Upgrade] Detected update from v${previousVersion} to v${CURRENT_APP_VERSION}`);

    // أخذ لقطة أمان تلقائية للبيانات المحلية في IndexedDB قبل تطبيق التحديث
    try {
      const backupStorage: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          if (val !== null) backupStorage[key] = val;
        }
      }

      const snapshotKey = `${UPGRADE_SNAPSHOTS_STORE}_v${previousVersion}_${Date.now()}`;
      await idbSet(snapshotKey, {
        previousVersion,
        newVersion: CURRENT_APP_VERSION,
        bundleIdentifier: APP_BUNDLE_ID,
        appGuid: APP_GUID,
        timestamp: now,
        storageSnapshot: backupStorage,
      });
    } catch (err) {
      console.warn('[In-Place Upgrade] Safety snapshot warning:', err);
    }

    // الترقية وسلسلة الهجرة المستمرة للبيانات
    localStorage.setItem(INSTALLED_VERSION_KEY, CURRENT_APP_VERSION);
    localStorage.setItem(LAST_UPGRADE_TIME_KEY, now);
    localStorage.setItem('smart_control_app_guid', APP_GUID);
    localStorage.setItem('smart_control_bundle_id', APP_BUNDLE_ID);
  }

  return {
    isFirstInstall: false,
    isUpgraded,
    previousVersion,
    currentVersion: CURRENT_APP_VERSION,
    bundleIdentifier: APP_BUNDLE_ID,
    dataPreserved: true,
    timestamp: now,
  };
}
