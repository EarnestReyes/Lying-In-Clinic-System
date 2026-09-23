# Staff activity management and patient assignment

## Where to use it

Activity Library is in the staff web sidebar. On web or mobile, it is also available from **Patients > open a patient > Activities > Activity Library**.

1. Sign in with an existing `admin`, `staff`, or `midwife` account.
2. Open **Activity Library > Create Activity**.
3. Supply the name, description, instructions (one step per line), verification method, and target. Optional fields include estimated duration, HTTPS tutorial URL, and clinic safety notice.
4. For camera verification, select an existing configured, active pose activity as the movement template. Technical movement thresholds are not editable here. If there are no templates, an administrator must first configure and approve one using the existing `rules` schema. The technical demonstration is not automatically imported or activated.
5. Select **Active** when approved, then **Create Activity**. Existing activities have **Edit** and **Make Inactive / Make Active** actions. Editing preserves the activity ID. Inactivation requires confirmation.
6. Open **Patients > the patient record > Activities > Assign Activity**.
7. Search/select an active activity. Review the patient name, verification method, target, and clinic instructions, then press **Assign Activity**.
8. The dialog closes and shows success. The staff list and the patient's existing Activities tab receive the same Firestore assignment through their subscriptions.
9. Select **View Details** to review status, assigned/started/completed dates, repetitions, and recorded duration.

Unlinked records show a clear error and disable assignment. Correct the account link using the clinic's verified records; do not substitute a clinical ID or create another patient account.

## Identity, services, and storage

The existing registration flow in `app/(admin)/patients/index.tsx` gets the Firebase Auth UID from `authService.registerPatientAccount`, stores it in `patientRecord.uid`, and calls `savePatient`. `savePatient` also stores `uid`. The clinical record subscription already exposes this field. New UI calls `getPatientAuthUid(patient)`, which requires that stored field and verifies `users/{uid}.role == 'patient'`. It never falls back to `patient.id`, name, or email. `assignActivity` rechecks the recipient and caller roles in its transaction.

Existing functions reused: `assignActivity`, `parseAssignment`, `validActivity`, `validMovementRules`, and the patient-side `subscribeActivities` interface. Existing clinical record and auth subscriptions remain in place. Patient progress/completion, camera, and movement evaluator code are unchanged.

Added service functions in the existing `activityService.ts`:

- `getPatientAuthUid`: validates the stored account link.
- `subscribePatientActivities`: staff subscription by explicit verified UID; the existing `subscribeActivities` delegates to it using the signed-in patient's UID.
- `subscribeActivityLibrary`: real-time catalog, optionally active-only. Incomplete definitions are flagged and editable in the library; assignment fails closed for invalid active definitions.
- `saveActivityDefinition`: create/update with validation, role checks, preserved IDs and creation metadata.
- `setActivityActive`: change availability without modifying assignments or logs; incomplete definitions can be deactivated but not activated.

Modified `assignActivity` retains its two-argument interface. It queries the server for this patient's existing assignments and rejects the same activity if `not_started` or `in_progress`. The transaction reads and increments the selected catalog document's `assignmentRevision`. Concurrent callers using this service conflict on that document and retry the duplicate query. It recognizes pre-existing random-ID assignments and permits a new assignment after completion, preserving the old document and log. Each submission also has an immediate UI ref guard and disabled loading button.

The duplicate query explicitly uses `getDocsFromServer`; it must not silently fall back to cached results. Transaction retry behavior follows [Firebase's transaction documentation](https://firebase.google.com/docs/firestore/manage-data/transactions); server-only queries are documented in the [Firestore API reference](https://firebase.google.com/docs/reference/js/firestore#getdocsfromserver).

Collections used:

| Collection | Use |
| --- | --- |
| `activities` | Existing reusable definitions; create/edit/activate/deactivate |
| `patientActivityAssignments` | Existing assignment documents and immutable definition snapshots |
| `activityLogs` | Existing completion history; unchanged, never deleted |
| `patients` | Existing clinical record subscription exposes stored `uid` |
| `users` | Existing staff and patient role verification |

No new collection or assignment architecture. No assignment or log fields were added. The model now exposes the already-stored `assignedAt`, `startedAt`, and `completedAt` as nullable dates, tolerating legacy records without dates. `configurationError` is a UI-only catalog property and is not saved.

Catalog writes include existing definition fields plus `createdBy`/`createdAt` on creation and `updatedBy`/`updatedAt` on create/edit/status changes. Dates use Firestore server timestamps. `assignmentRevision` is a lazily initialized integer used only for assignment concurrency. Editing preserves it. Changing verification away from pose removes obsolete catalog `rules`; existing assignment snapshots are untouched.

## Rules deployment required

**Yes, manually merge and publish `firebase/activities.rules.fragment` before using the updated service.** This repository does not include the complete deployed Firestore rules or a Firestore rules deployment configuration. No production rules were deployed or replaced.

In Firebase Console > Firestore Database > Rules:

1. Keep the existing complete rules, including patients, users, appointments, prenatal visits, documents, inventory, support, and other modules.
2. Replace the previous activity-specific functions/matches with the updated fragment inside `match /databases/{database}/documents`. Do not paste duplicate old activity matches, and do not deploy the fragment as a standalone rules file.
3. Ensure existing user-profile read rules allow authorized staff to read `users/{patientUid}`; recipient role validation uses this read. Do not broaden patient access to other users. Ensure existing role-management rules prevent patients from changing their own role and existing patient-record rules prevent patients from changing `uid`.
4. Audit any overlapping blanket write grants. Firestore combines matching allows with OR, so broad grants would bypass the restrictions in this fragment.
5. Test the merged rules in the Emulator Suite or Rules Playground, then publish. If your deployment has a complete local rules file and Firebase config, use `firebase deploy --only firestore:rules --project YOUR_PROJECT_ID` from that configured deployment directory. This repository's `firebase.patient-mobile.json` configures functions only and cannot deploy these rules as-is.

Changes retain admin/staff/midwife role authorization and patient ownership/progress restrictions. Catalog creation/updates validate definition shape and audit metadata; definitions and historical assignments/logs cannot be deleted. Assignment creation must match the current active catalog definition and increment its revision atomically. Patients cannot create assignments or modify definitions, ownership, targets, or instructions. The existing completion/log transaction rules remain intact.

Duplicate prevention is enforced by the shared service and UI. The revision requirement makes cooperating service callers serialize; the rules cannot query all historical assignments to independently prevent a privileged caller deliberately bypassing that service. No new server-side assignment endpoint was introduced.

## Files

Created:

- `app/(admin)/activity-library.tsx`
- `components/activities/ActivityEditor.tsx`
- `components/activities/PatientActivitiesPanel.tsx`
- `components/activities/StaffActivityUI.tsx`
- `tests/staffActivities.test.cjs`
- `docs/staff-activities.md`

Modified:

- `app/(admin)/_layout.tsx`
- `app/(admin)/patients/[id].tsx`
- `src/navigation/AdminNavigation.ts`
- `src/models/Activity.ts`
- `src/services/activityService.ts`
- `firebase/activities.rules.fragment`

## Validation and limitations

Run from `lying-in-system`:

```powershell
npx tsc --noEmit
node --test --experimental-test-isolation=none tests/*.test.cjs
npm run web
```

No new npm dependencies, package installation, composite indexes, or data migration are required. Expo regenerates route types on startup; the new-route navigation uses the project's `Href` type rather than relying on stale generated route declarations.

Validation results: `npx tsc --noEmit` passed; all **46 tests passed** with the in-process command above; `git diff --check` passed. The ordinary test command was blocked by `spawn EPERM` in this workspace; the equivalent in-process Node test command avoids child processes. Tests use mocked Firestore, including optimistic transaction retries. They cover UID mismatch safety, creation/editing, inactivation, incomplete drafts, active-only selection, staff and patient subscriptions, concurrent duplicate submissions, existing in-progress assignments, completed-history retention, permission checks, network failures, and timestamp parsing. They do not establish that deployed Firebase rules or physical-device flows pass.

Remaining limits:

- No live Firebase, browser interaction, physical-device, or Rules Emulator validation was performed. Emulator dependencies and a cached Firestore emulator were unavailable. Validate the merged deployed rules and app workflow before rollout.
- Assignment-specific target overrides, scheduling/due dates, and cancellation are not supported by the existing assignment model and are intentionally not introduced.
- Approved pose templates must already exist in the library. Incomplete developer drafts can be repaired through Edit when their movement rules are valid; invalid movement rules require developer configuration.
- Catalog edits and inactivation affect future assignments. Existing immutable snapshots and completed logs remain available; inactivation does not pause existing sessions.
- Assignment creation requires network access. Revision contention may produce a retryable error under heavy simultaneous assignment load; errors are displayed without clearing the selection.
- The existing patient registration service signs in the newly created account. After registering a patient, staff may need to sign back into their staff account before managing activities; this pre-existing authentication behavior was not changed.

The repository-required [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) was consulted before implementation.
