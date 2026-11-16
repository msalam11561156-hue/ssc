# Smart Control Security Specification (Phase 0)

## 1. Data Invariants
1. **Identity & Email Verification**: Only authenticated users with `request.auth != null` and `request.auth.token.email_verified == true` may create, update, or delete data. Users cannot impersonate another `uid` in document paths or payload fields (`uid` / `ownerId`).
2. **PII Isolation**: User email addresses are stored exclusively in `/users/{userId}/private/info` and are never exposed to blanket `isSignedIn()` reads or queries (`allow list: if false`).
3. **Self-Assigned Privilege Prevention**: User profile creation strictly locks `role == 'educator'`, and `role` is immutable on update.
4. **Master Gate Relational Integrity**:
   - `/users/{userId}/private/info` requires an existing or same-batch `/users/{userId}` document with matching `uid`.
   - `/users/{userId}/workspaces/{workspaceId}` and `/users/{userId}/studentGroups/{groupId}` require `/users/{userId}` to exist with matching `uid`.
   - `/users/{userId}/students/{studentDocId}` requires `/users/{userId}/studentGroups/{groupId}` (via `incoming().groupId`) to exist (or be created in the same atomic batch via `getAfter`) and belong to `request.auth.uid`.
5. **Immutable Provenance & Server Timestamps**: `ownerId`, `uid`, `groupId`, `stageKey`, `studentId`, and `createdAt` are immutable once created. `createdAt` (on create) and `updatedAt` (on create/update) must strictly equal `request.time`.
6. **Path Hardening & Volumetric Bounds**: All document IDs (`userId`, `infoId`, `workspaceId`, `groupId`, `studentDocId`) must match `^[a-zA-Z0-9_\-]+$` with length `1..128`. All strings and nested maps have strict bounded sizes to prevent Denial-of-Wallet attacks and stay well below the 1MB Firestore document limit.
7. **Zero-Delegation List Queries**: Every `allow list` rule enforces `userId == request.auth.uid && resource.data.ownerId == request.auth.uid` without calling `get()` or `exists()`.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Yield PERMISSION_DENIED)
1. **Ghost Field Shadow Create (`/users/alice`)**:
   ```json
   { "uid": "alice", "displayName": "Alice", "photoURL": "", "role": "educator", "isVerified": true, "createdAt": "<request.time>", "updatedAt": "<request.time>" }
   ```
2. **Self-Assigned Admin Escalation (`/users/alice`)**:
   ```json
   { "uid": "alice", "displayName": "Alice", "photoURL": "", "role": "admin", "createdAt": "<request.time>", "updatedAt": "<request.time>" }
   ```
3. **Unverified Email Write (`/users/alice` with `email_verified: false`)**:
   ```json
   { "uid": "alice", "displayName": "Alice", "photoURL": "", "role": "educator", "createdAt": "<request.time>", "updatedAt": "<request.time>" }
   ```
4. **Cross-Owner Identity Spoofing (`/users/bob/workspaces/official` authored by `alice`)**:
   ```json
   { "ownerId": "bob", "schoolData": {}, "controlDataByStage": {}, "createdAt": "<request.time>", "updatedAt": "<request.time>" }
   ```
5. **Client-Spoofed Timestamp (`/users/alice/workspaces/official`)**:
   ```json
   { "ownerId": "alice", "schoolData": {}, "controlDataByStage": {}, "createdAt": "2020-01-01T00:00:00Z", "updatedAt": "2020-01-01T00:00:00Z" }
   ```
6. **PII Blanket Read / Cross-User Get (`/users/bob/private/info` read by `alice`)**:
   - Action: `get(/users/bob/private/info)` authenticated as `alice`.
7. **Invalid Private Info Document ID (`/users/alice/private/custom`)**:
   ```json
   { "uid": "alice", "email": "alice@example.com", "createdAt": "<request.time>", "updatedAt": "<request.time>" }
   ```
8. **Orphan Student Record Without Valid StudentGroup (`/users/alice/students/stu_1`)**:
   ```json
   { "ownerId": "alice", "groupId": "nonexistent_group", "stageKey": "primary_4_shared", "orderIndex": 0, "studentId": "1", "name": "Test", "nationalId": "123", "gender": "ذكر", "enrollmentStatus": "مقيد", "religion": "مسلم", "createdAt": "<request.time>", "updatedAt": "<request.time>" }
   ```
9. **Path ID Poisoning (`/users/alice/students/invalid$id!with*bad+chars` or >128 chars)**:
   ```json
   { "ownerId": "alice", "groupId": "grp_1", "stageKey": "primary_4", "orderIndex": 0, "studentId": "1", "name": "Test", "nationalId": "123", "gender": "ذكر", "enrollmentStatus": "مقيد", "religion": "مسلم", "createdAt": "<request.time>", "updatedAt": "<request.time>" }
   ```
10. **Value Poisoning on Update (`/users/alice/workspaces/official` setting `schoolData.schoolName` to 2000-char string or invalid type)**:
    ```json
    { "schoolData": { "schoolName": "<2000_char_string>" }, "updatedAt": "<request.time>" }
    ```
11. **Immutable Field Tampering on Update (`/users/alice/students/stu_1` changing `studentId` or `ownerId`)**:
    ```json
    { "ownerId": "bob", "updatedAt": "<request.time>" }
    ```
12. **Unscoped List Query Scraping (`/users/bob/students` queried by `alice` without `ownerId == alice`)**:
    - Action: `list(/users/bob/students)` authenticated as `alice`.
