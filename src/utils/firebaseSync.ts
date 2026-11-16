import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ControlData, SchoolData, StudentData } from '../types';

const WORKSPACE_ID = 'official';

function fnv1aHash(input: string, seed = 2166136261): string {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(36);
}

export function stageKeyToGroupId(stageKey: string): string {
  const h1 = fnv1aHash(stageKey, 2166136261);
  const h2 = fnv1aHash(stageKey.split('').reverse().join(''), 2166136261 ^ 0x9e3779b9);
  const asciiPrefix = stageKey
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return `grp_${asciiPrefix ? `${asciiPrefix}_` : ''}${h1}_${h2}`.slice(0, 120);
}

export function makeStudentDocId(stageKey: string, studentId: string): string {
  const raw = `${stageKey}::${studentId}`;
  const h1 = fnv1aHash(raw, 2166136261);
  const h2 = fnv1aHash(raw.split('').reverse().join(''), 2166136261 ^ 0x85ebca6b);
  return `stu_${h1}_${h2}`.slice(0, 120);
}

function clampStr(value: unknown, maxLen: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.length > maxLen ? value.slice(0, maxLen) : value;
}

function stripUndefinedDeep<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined) {
      clean[k] = stripUndefinedDeep(v);
    }
  }
  return clean as T;
}

function clampSmallMap(value: unknown, maxKeys = 10): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>).slice(0, maxKeys);
  const result: Record<string, unknown> = {};
  for (const [k, v] of entries) {
    if (v !== undefined) {
      result[clampStr(k, 64)] = stripUndefinedDeep(v);
    }
  }
  return result;
}

export function sanitizeSchoolDataForFirestore(schoolData: SchoolData): Record<string, string> {
  const out: Record<string, string> = {};
  const fields: Array<[keyof SchoolData, number]> = [
    ['affiliatedEntity', 32],
    ['affiliatedEntityEn', 100],
    ['administration', 150],
    ['administrationEn', 150],
    ['schoolName', 150],
    ['schoolNameEn', 150],
    ['educationType', 64],
    ['educationTypeEn', 100],
    ['stage', 64],
    ['stageEn', 100],
    ['semester', 32],
    ['division', 64],
    ['systemType', 32],
    ['secondarySystem', 32],
  ];

  for (const [key, maxLen] of fields) {
    const val = schoolData[key];
    if (typeof val === 'string') {
      out[key] = clampStr(val, maxLen);
    }
  }
  return out;
}

export function sanitizeControlDataForFirestore(
  controlDataByStage: Record<string, ControlData>
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  const entries = Object.entries(controlDataByStage || {}).slice(0, 20);
  for (const [stageKey, val] of entries) {
    if (!val || typeof val !== 'object') continue;
    const safeKey = clampStr(stageKey, 64);
    const cleanEntry: Record<string, string> = {
      dataOfficer: clampStr(val.dataOfficer, 150),
      controlHead: clampStr(val.controlHead, 150),
      committeeHead: clampStr(val.committeeHead, 150),
      selectedGrade: clampStr(val.selectedGrade, 100),
    };
    if (typeof val.dataOfficerEn === 'string') cleanEntry.dataOfficerEn = clampStr(val.dataOfficerEn, 150);
    if (typeof val.controlHeadEn === 'string') cleanEntry.controlHeadEn = clampStr(val.controlHeadEn, 150);
    if (typeof val.committeeHeadEn === 'string') cleanEntry.committeeHeadEn = clampStr(val.committeeHeadEn, 150);
    out[safeKey] = cleanEntry;
  }
  return out;
}

function buildStudentDocFields(
  uid: string,
  groupId: string,
  stageKey: string,
  orderIndex: number,
  student: StudentData
): Record<string, unknown> {
  const safeStudentId = clampStr(student.id || `row_${orderIndex}`, 128, `row_${orderIndex}`);
  const payload: Record<string, unknown> = {
    ownerId: uid,
    groupId,
    stageKey: clampStr(stageKey, 200),
    orderIndex: Math.max(0, Math.min(5000, Math.trunc(orderIndex))),
    studentId: safeStudentId,
    name: clampStr(student.name, 200),
    nationalId: clampStr(student.nationalId, 32),
    gender: clampStr(student.gender, 32),
    enrollmentStatus: clampStr(student.enrollmentStatus, 64),
    religion: clampStr(student.religion, 32),
  };

  if (typeof student.nameEn === 'string') payload.nameEn = clampStr(student.nameEn, 200);
  if (typeof student.exemptionStatus === 'string') payload.exemptionStatus = clampStr(student.exemptionStatus, 64);
  if (typeof student.enrollmentType === 'string') payload.enrollmentType = clampStr(student.enrollmentType, 64);
  if (typeof student.studentStatus === 'string') payload.studentStatus = clampStr(student.studentStatus, 64);
  if (typeof student.seatNumber === 'string') payload.seatNumber = clampStr(student.seatNumber, 32);
  if (typeof student.secretNumber === 'string') payload.secretNumber = clampStr(student.secretNumber, 32);
  if (typeof student.committeeNumber === 'string') payload.committeeNumber = clampStr(student.committeeNumber, 32);
  if (typeof student.studentClass === 'string') payload.studentClass = clampStr(student.studentClass, 64);

  const seatNumbers = clampSmallMap(student.seatNumbers, 10);
  if (seatNumbers) payload.seatNumbers = seatNumbers;

  const secretNumbers = clampSmallMap(student.secretNumbers, 10);
  if (secretNumbers) payload.secretNumbers = secretNumbers;

  const committeeNumbers = clampSmallMap(student.committeeNumbers, 10);
  if (committeeNumbers) payload.committeeNumbers = committeeNumbers;

  const assessments = clampSmallMap(student.assessments, 10);
  if (assessments) payload.assessments = assessments;

  const writtenExams = clampSmallMap(student.writtenExams, 10);
  if (writtenExams) payload.writtenExams = writtenExams;

  const detailedAssessments = clampSmallMap(student.detailedAssessments, 10);
  if (detailedAssessments) payload.detailedAssessments = detailedAssessments;

  return payload;
}

function stableHashPayload(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
}

// Track known createdAt timestamps and last synced hashes per user session
interface UserSyncCache {
  workspaceCreatedAt?: Timestamp | null;
  lastWorkspaceHash?: string;
  groupCreatedAt: Map<string, Timestamp>;
  groupCounts: Map<string, number>;
  studentCreatedAt: Map<string, Timestamp>;
  studentHashes: Map<string, string>;
  studentStageByDocId: Map<string, string>;
}

const syncCaches = new Map<string, UserSyncCache>();

function getUserCache(uid: string): UserSyncCache {
  let cache = syncCaches.get(uid);
  if (!cache) {
    cache = {
      groupCreatedAt: new Map(),
      groupCounts: new Map(),
      studentCreatedAt: new Map(),
      studentHashes: new Map(),
      studentStageByDocId: new Map(),
    };
    syncCaches.set(uid, cache);
  }
  return cache;
}

export function clearUserSyncCache(uid?: string): void {
  if (uid) {
    syncCaches.delete(uid);
  } else {
    syncCaches.clear();
  }
}

export async function upsertUserProfile(user: User): Promise<void> {
  const uid = user.uid;
  const userPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/info`;
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');

  const displayName = clampStr(user.displayName || 'مستخدم Smart Control', 120);
  const photoURL = clampStr(user.photoURL || '', 500);
  const email = clampStr(user.email || '', 254);

  try {
    const [userSnap, privateSnap] = await Promise.all([getDoc(userRef), getDoc(privateRef)]);

    if (!userSnap.exists() || !privateSnap.exists()) {
      const batch = writeBatch(db);
      if (!userSnap.exists()) {
        batch.set(userRef, {
          uid,
          displayName,
          photoURL,
          role: 'educator',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const existingCreatedAt = userSnap.data()?.createdAt;
        batch.update(userRef, {
          uid,
          displayName,
          photoURL,
          role: 'educator',
          createdAt: existingCreatedAt,
          updatedAt: serverTimestamp(),
        });
      }

      if (!privateSnap.exists()) {
        batch.set(privateRef, {
          uid,
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const existingPrivCreatedAt = privateSnap.data()?.createdAt;
        batch.update(privateRef, {
          uid,
          email,
          createdAt: existingPrivCreatedAt,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    } else {
      const existingUser = userSnap.data();
      if (existingUser?.displayName !== displayName || existingUser?.photoURL !== photoURL) {
        await updateDoc(userRef, {
          uid,
          displayName,
          photoURL,
          role: 'educator',
          createdAt: existingUser?.createdAt,
          updatedAt: serverTimestamp(),
        });
      }
      const existingPriv = privateSnap.data();
      if (existingPriv?.email !== email) {
        await updateDoc(privateRef, {
          uid,
          email,
          createdAt: existingPriv?.createdAt,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${userPath} / ${privatePath}`);
  }
}

export interface WorkspaceSubscriptionCallbacks {
  onWorkspaceData: (data: {
    exists: boolean;
    schoolData?: Partial<SchoolData>;
    controlDataByStage?: Record<string, ControlData>;
  }) => void;
  onStudentsData: (studentsByStage: Record<string, StudentData[]>, hasRemoteDocs: boolean) => void;
  onError?: (err: Error) => void;
}

export function subscribeToUserWorkspace(
  uid: string,
  callbacks: WorkspaceSubscriptionCallbacks
): () => void {
  const cache = getUserCache(uid);
  const workspacePath = `users/${uid}/workspaces/${WORKSPACE_ID}`;
  const groupsPath = `users/${uid}/studentGroups`;
  const studentsPath = `users/${uid}/students`;

  const workspaceRef = doc(db, 'users', uid, 'workspaces', WORKSPACE_ID);
  const groupsQuery = query(collection(db, 'users', uid, 'studentGroups'), where('ownerId', '==', uid));
  const studentsQuery = query(collection(db, 'users', uid, 'students'), where('ownerId', '==', uid));

  const unsubWorkspace: Unsubscribe = onSnapshot(
    workspaceRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        cache.workspaceCreatedAt = null;
        callbacks.onWorkspaceData({ exists: false });
        return;
      }
      const data = snapshot.data();
      if (data?.createdAt instanceof Timestamp) {
        cache.workspaceCreatedAt = data.createdAt;
      }
      const schoolData = (data?.schoolData || {}) as Partial<SchoolData>;
      const controlDataByStage = (data?.controlDataByStage || {}) as Record<string, ControlData>;
      cache.lastWorkspaceHash = stableHashPayload({
        schoolData: sanitizeSchoolDataForFirestore(schoolData as SchoolData),
        controlDataByStage: sanitizeControlDataForFirestore(controlDataByStage),
      });
      callbacks.onWorkspaceData({
        exists: true,
        schoolData,
        controlDataByStage,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, workspacePath);
      } catch (wrapped) {
        if (callbacks.onError && wrapped instanceof Error) {
          callbacks.onError(wrapped);
        }
      }
    }
  );

  const unsubGroups: Unsubscribe = onSnapshot(
    groupsQuery,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const docId = change.doc.id;
        if (change.type === 'removed') {
          cache.groupCreatedAt.delete(docId);
          cache.groupCounts.delete(docId);
        } else {
          const data = change.doc.data();
          if (data?.createdAt instanceof Timestamp) {
            cache.groupCreatedAt.set(docId, data.createdAt);
          }
          if (typeof data?.studentCount === 'number') {
            cache.groupCounts.set(docId, data.studentCount);
          }
        }
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, groupsPath);
      } catch (wrapped) {
        if (callbacks.onError && wrapped instanceof Error) {
          callbacks.onError(wrapped);
        }
      }
    }
  );

  const unsubStudents: Unsubscribe = onSnapshot(
    studentsQuery,
    (snapshot) => {
      const groupedRows = new Map<string, Array<{ orderIndex: number; student: StudentData }>>();
      const seenDocIds = new Set<string>();

      snapshot.forEach((docSnap) => {
        const docId = docSnap.id;
        seenDocIds.add(docId);
        const data = docSnap.data();
        if (data?.createdAt instanceof Timestamp) {
          cache.studentCreatedAt.set(docId, data.createdAt);
        }

        const stageKey = typeof data?.stageKey === 'string' ? data.stageKey : '';
        if (!stageKey) return;

        cache.studentStageByDocId.set(docId, stageKey);

        const student: StudentData = {
          id: typeof data.studentId === 'string' ? data.studentId : docId,
          name: typeof data.name === 'string' ? data.name : '',
          nationalId: typeof data.nationalId === 'string' ? data.nationalId : '',
          gender: typeof data.gender === 'string' ? data.gender : '',
          enrollmentStatus: typeof data.enrollmentStatus === 'string' ? data.enrollmentStatus : '',
          religion: typeof data.religion === 'string' ? data.religion : '',
        };

        if (typeof data.nameEn === 'string') student.nameEn = data.nameEn;
        if (typeof data.exemptionStatus === 'string') student.exemptionStatus = data.exemptionStatus;
        if (typeof data.enrollmentType === 'string') student.enrollmentType = data.enrollmentType;
        if (typeof data.studentStatus === 'string') student.studentStatus = data.studentStatus;
        if (typeof data.seatNumber === 'string') student.seatNumber = data.seatNumber;
        if (typeof data.secretNumber === 'string') student.secretNumber = data.secretNumber;
        if (typeof data.committeeNumber === 'string') student.committeeNumber = data.committeeNumber;
        if (typeof data.studentClass === 'string') student.studentClass = data.studentClass;
        if (data.seatNumbers && typeof data.seatNumbers === 'object') student.seatNumbers = data.seatNumbers;
        if (data.secretNumbers && typeof data.secretNumbers === 'object') student.secretNumbers = data.secretNumbers;
        if (data.committeeNumbers && typeof data.committeeNumbers === 'object') student.committeeNumbers = data.committeeNumbers;
        if (data.assessments && typeof data.assessments === 'object') student.assessments = data.assessments;
        if (data.writtenExams && typeof data.writtenExams === 'object') student.writtenExams = data.writtenExams;
        if (data.detailedAssessments && typeof data.detailedAssessments === 'object') student.detailedAssessments = data.detailedAssessments;

        const orderIndex = typeof data.orderIndex === 'number' ? data.orderIndex : 0;
        const groupId = typeof data.groupId === 'string' ? data.groupId : stageKeyToGroupId(stageKey);

        cache.studentHashes.set(
          docId,
          stableHashPayload(buildStudentDocFields(uid, groupId, stageKey, orderIndex, student))
        );

        const list = groupedRows.get(stageKey) || [];
        list.push({ orderIndex, student });
        groupedRows.set(stageKey, list);
      });

      // Clean deleted entries from cache
      for (const existingDocId of Array.from(cache.studentCreatedAt.keys())) {
        if (!seenDocIds.has(existingDocId)) {
          cache.studentCreatedAt.delete(existingDocId);
          cache.studentHashes.delete(existingDocId);
          cache.studentStageByDocId.delete(existingDocId);
        }
      }

      const result: Record<string, StudentData[]> = {};
      for (const [stageKey, rows] of groupedRows.entries()) {
        rows.sort((a, b) => a.orderIndex - b.orderIndex);
        result[stageKey] = rows.map((r) => r.student);
      }

      callbacks.onStudentsData(result, snapshot.size > 0);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, studentsPath);
      } catch (wrapped) {
        if (callbacks.onError && wrapped instanceof Error) {
          callbacks.onError(wrapped);
        }
      }
    }
  );

  return () => {
    unsubWorkspace();
    unsubGroups();
    unsubStudents();
  };
}

export async function saveWorkspaceToFirestore(
  uid: string,
  schoolData: SchoolData,
  controlDataByStage: Record<string, ControlData>
): Promise<void> {
  const cache = getUserCache(uid);
  const cleanSchool = sanitizeSchoolDataForFirestore(schoolData);
  const cleanControl = sanitizeControlDataForFirestore(controlDataByStage);
  const payloadHash = stableHashPayload({ schoolData: cleanSchool, controlDataByStage: cleanControl });

  if (cache.lastWorkspaceHash === payloadHash) {
    return;
  }

  const workspacePath = `users/${uid}/workspaces/${WORKSPACE_ID}`;
  const workspaceRef = doc(db, 'users', uid, 'workspaces', WORKSPACE_ID);

  try {
    let createdAt = cache.workspaceCreatedAt;
    if (createdAt === undefined) {
      const snap = await getDoc(workspaceRef);
      if (snap.exists() && snap.data()?.createdAt instanceof Timestamp) {
        createdAt = snap.data()!.createdAt as Timestamp;
        cache.workspaceCreatedAt = createdAt;
      } else {
        createdAt = null;
        cache.workspaceCreatedAt = null;
      }
    }

    if (!createdAt) {
      await setDoc(workspaceRef, {
        ownerId: uid,
        schoolData: cleanSchool,
        controlDataByStage: cleanControl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(workspaceRef, {
        ownerId: uid,
        schoolData: cleanSchool,
        controlDataByStage: cleanControl,
        createdAt,
        updatedAt: serverTimestamp(),
      });
    }

    cache.lastWorkspaceHash = payloadHash;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, workspacePath);
  }
}

export async function syncStudentsDataToFirestore(
  uid: string,
  studentsDataByStage: Record<string, StudentData[]>
): Promise<void> {
  const cache = getUserCache(uid);
  const studentsBasePath = `users/${uid}/students`;

  try {
    const desiredDocs = new Map<string, { stageKey: string; groupId: string; fields: Record<string, unknown>; hash: string }>();
    const desiredGroups = new Map<string, { stageKey: string; count: number }>();

    for (const [stageKey, list] of Object.entries(studentsDataByStage || {})) {
      if (!stageKey || !Array.isArray(list)) continue;
      const groupId = stageKeyToGroupId(stageKey);
      desiredGroups.set(groupId, { stageKey, count: list.length });

      list.forEach((student, idx) => {
        if (!student || typeof student !== 'object') return;
        const studentId = student.id || `row_${idx}`;
        const docId = makeStudentDocId(stageKey, studentId);
        const fields = buildStudentDocFields(uid, groupId, stageKey, idx, { ...student, id: studentId });
        const hash = stableHashPayload(fields);
        desiredDocs.set(docId, { stageKey, groupId, fields, hash });
      });
    }

    // Collect writes & deletes
    type Op =
      | { type: 'groupSet'; groupId: string; stageKey: string; count: number; createdAt?: Timestamp }
      | { type: 'studentSet'; docId: string; fields: Record<string, unknown>; hash: string; createdAt?: Timestamp }
      | { type: 'studentDelete'; docId: string };

    const ops: Op[] = [];

    for (const [groupId, meta] of desiredGroups.entries()) {
      const existingGroupCreatedAt = cache.groupCreatedAt.get(groupId);
      const existingCount = cache.groupCounts.get(groupId);
      if (!existingGroupCreatedAt) {
        const gSnap = await getDoc(doc(db, 'users', uid, 'studentGroups', groupId));
        if (gSnap.exists() && gSnap.data()?.createdAt instanceof Timestamp) {
          const ts = gSnap.data()!.createdAt as Timestamp;
          cache.groupCreatedAt.set(groupId, ts);
          if (gSnap.data()?.studentCount !== meta.count) {
            ops.push({ type: 'groupSet', groupId, stageKey: meta.stageKey, count: meta.count, createdAt: ts });
          }
        } else {
          ops.push({ type: 'groupSet', groupId, stageKey: meta.stageKey, count: meta.count });
        }
      } else if (existingCount !== meta.count) {
        ops.push({ type: 'groupSet', groupId, stageKey: meta.stageKey, count: meta.count, createdAt: existingGroupCreatedAt });
      }
    }

    for (const [docId, item] of desiredDocs.entries()) {
      const prevHash = cache.studentHashes.get(docId);
      if (prevHash === item.hash) continue;

      let existingCreatedAt = cache.studentCreatedAt.get(docId);
      if (!existingCreatedAt) {
        const sSnap = await getDoc(doc(db, 'users', uid, 'students', docId));
        if (sSnap.exists() && sSnap.data()?.createdAt instanceof Timestamp) {
          existingCreatedAt = sSnap.data()!.createdAt as Timestamp;
          cache.studentCreatedAt.set(docId, existingCreatedAt);
        }
      }
      ops.push({
        type: 'studentSet',
        docId,
        fields: item.fields,
        hash: item.hash,
        createdAt: existingCreatedAt,
      });
    }

    for (const knownDocId of Array.from(cache.studentHashes.keys())) {
      if (!desiredDocs.has(knownDocId)) {
        ops.push({ type: 'studentDelete', docId: knownDocId });
      }
    }

    if (ops.length === 0) return;

    // Commit group creates/updates first so Master Gate get/getAfter always sees committed group docs
    const groupOps = ops.filter((o) => o.type === 'groupSet');
    const studentOps = ops.filter((o) => o.type !== 'groupSet');

    const BATCH_LIMIT = 200;
    for (let i = 0; i < groupOps.length; i += BATCH_LIMIT) {
      const chunk = groupOps.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const op of chunk) {
        if (op.type !== 'groupSet') continue;
        const gRef = doc(db, 'users', uid, 'studentGroups', op.groupId);
        if (!op.createdAt) {
          batch.set(gRef, {
            ownerId: uid,
            groupId: op.groupId,
            stageKey: clampStr(op.stageKey, 200),
            studentCount: Math.max(0, Math.min(5000, op.count)),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.update(gRef, {
            ownerId: uid,
            groupId: op.groupId,
            stageKey: clampStr(op.stageKey, 200),
            studentCount: Math.max(0, Math.min(5000, op.count)),
            createdAt: op.createdAt,
            updatedAt: serverTimestamp(),
          });
        }
        cache.groupCounts.set(op.groupId, op.count);
      }
      await batch.commit();
    }

    for (let i = 0; i < studentOps.length; i += BATCH_LIMIT) {
      const chunk = studentOps.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const op of chunk) {
        if (op.type === 'studentSet') {
          const sRef = doc(db, 'users', uid, 'students', op.docId);
          if (!op.createdAt) {
            batch.set(sRef, {
              ...op.fields,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            batch.update(sRef, {
              ...op.fields,
              createdAt: op.createdAt,
              updatedAt: serverTimestamp(),
            });
          }
          cache.studentHashes.set(op.docId, op.hash);
        } else if (op.type === 'studentDelete') {
          const sRef = doc(db, 'users', uid, 'students', op.docId);
          batch.delete(sRef);
          cache.studentHashes.delete(op.docId);
          cache.studentCreatedAt.delete(op.docId);
          cache.studentStageByDocId.delete(op.docId);
        }
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, studentsBasePath);
  }
}

export async function clearOfficialWorkspaceInFirestore(uid: string): Promise<void> {
  const basePath = `users/${uid}`;
  try {
    const [studentsSnap, groupsSnap] = await Promise.all([
      getDocs(query(collection(db, 'users', uid, 'students'), where('ownerId', '==', uid))),
      getDocs(query(collection(db, 'users', uid, 'studentGroups'), where('ownerId', '==', uid))),
    ]);

    const refs = [
      ...studentsSnap.docs.map((d) => d.ref),
      ...groupsSnap.docs.map((d) => d.ref),
      doc(db, 'users', uid, 'workspaces', WORKSPACE_ID),
    ];

    const BATCH_LIMIT = 200;
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      refs.slice(i, i + BATCH_LIMIT).forEach((r) => batch.delete(r));
      await batch.commit();
    }

    clearUserSyncCache(uid);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, basePath);
  }
}
