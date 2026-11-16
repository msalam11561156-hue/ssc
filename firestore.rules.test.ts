/**
 * Phase 0: Security Rules Adversarial Test Specification ("Dirty Dozen")
 *
 * These test cases encode the 12 adversarial payloads from security_spec.md
 * to verify PERMISSION_DENIED enforcement when run against a Firebase Emulator
 * with @firebase/rules-unit-testing.
 */

export interface SecurityRuleTestCase {
  id: number;
  name: string;
  actorUid: string | null;
  emailVerified: boolean;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: SecurityRuleTestCase[] = [
  {
    id: 1,
    name: 'Shadow Update / Ghost Field on User Profile Create',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'create',
    path: 'users/alice',
    payload: {
      uid: 'alice',
      displayName: 'Alice',
      photoURL: '',
      role: 'educator',
      isVerified: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Assigned Admin Escalation',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'create',
    path: 'users/alice',
    payload: {
      uid: 'alice',
      displayName: 'Alice',
      photoURL: '',
      role: 'admin',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Token Write',
    actorUid: 'alice',
    emailVerified: false,
    operation: 'create',
    path: 'users/alice',
    payload: {
      uid: 'alice',
      displayName: 'Alice',
      photoURL: '',
      role: 'educator',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-Owner Identity Spoofing on Workspace',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'create',
    path: 'users/bob/workspaces/official',
    payload: {
      ownerId: 'bob',
      schoolData: {},
      controlDataByStage: {},
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Client-Forged Timestamp Bypass',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'create',
    path: 'users/alice/workspaces/official',
    payload: {
      ownerId: 'alice',
      schoolData: {},
      controlDataByStage: {},
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'PII Blanket Read / Cross-User Private Info Get',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'get',
    path: 'users/bob/private/info',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Invalid Private Subcollection Doc ID',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'create',
    path: 'users/alice/private/custom',
    payload: {
      uid: 'alice',
      email: 'alice@example.com',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Orphan Student Record Without Master Gate StudentGroup',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'create',
    path: 'users/alice/students/stu_1',
    payload: {
      ownerId: 'alice',
      groupId: 'nonexistent_group',
      stageKey: 'primary_4_shared',
      orderIndex: 0,
      studentId: '1',
      name: 'Test',
      nationalId: '123',
      gender: 'ذكر',
      enrollmentStatus: 'مقيد',
      religion: 'مسلم',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Path Variable ID Poisoning (Invalid Chars)',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'create',
    path: 'users/alice/students/invalid$id!with*bad+chars',
    payload: {
      ownerId: 'alice',
      groupId: 'grp_1',
      stageKey: 'primary_4',
      orderIndex: 0,
      studentId: '1',
      name: 'Test',
      nationalId: '123',
      gender: 'ذكر',
      enrollmentStatus: 'مقيد',
      religion: 'مسلم',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Workspace Update (Oversized String)',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'update',
    path: 'users/alice/workspaces/official',
    payload: {
      schoolData: { schoolName: 'x'.repeat(2000) },
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Immutable Field Tampering on Student Update',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'update',
    path: 'users/alice/students/stu_1',
    payload: {
      ownerId: 'bob',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Cross-Tenant List Scraping Without Owner Scoping',
    actorUid: 'alice',
    emailVerified: true,
    operation: 'list',
    path: 'users/bob/students',
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
