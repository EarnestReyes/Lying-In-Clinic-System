# Patient mobile implementation and deployment

The app keeps the existing Expo Router routes, teal care components, Firebase app, UID ownership and clinical record merge service. Changes are implemented in source; dependency installation and Firebase deployment are required before end-to-end use. No production data or deployed rules were changed.

## Files modified in this task

- `app/(patient)/home.tsx`: replaces sample BP chart with real merged prenatal history; confirms logout and displays record errors.
- `app/(patient)/appointments.tsx`: typed, chronological appointment list, live details/actions, booking validation, error/retry and keyboard handling.
- `app/(patient)/progress.tsx`: recorded pregnancy information, BP/weight/visit history, upcoming appointments and refresh.
- `app/(patient)/profile.tsx`: persistent photo upload/preview, editable personal details, account controls, errors and keyboard handling.
- `app/(patient)/_layout.tsx`: authenticated patient route guard.
- `components/care/CareWorkspace.tsx`: patient/staff Documents section; existing sections retained.
- `src/(patient)/profileService.ts`: photo URL type and server update timestamp.
- `src/config/firebase.ts`: exports Storage from the existing app; guards duplicate initialization.
- `src/models/Appointment.ts`, `src/models/PatientRecord.ts`: optional existing aliases and clinician/cancellation fields.
- `src/services/appointmentService.ts`: transactional patient actions; both legacy query listeners must load before emitting.
- `package.json`: declares document picker and file system dependencies.

Other modified/untracked files already existed before this task and were left in place.

## Files created

- `components/BloodPressureChart.tsx`
- `components/AppointmentDetails.tsx`
- `components/PatientAccountActions.tsx`
- `components/care/DocumentsPanel.tsx`
- `src/hooks/usePatientClinicalRecord.ts`
- `src/services/patientDocumentService.ts`
- `src/services/patientAccountService.ts`
- `src/utils/patientProgress.ts`
- `src/utils/patientAppointments.ts`
- `tests/patientMobile.test.cjs`
- `functions/index.js`, `functions/package.json`
- `firebase.patient-mobile.json`
- `firebase/patient-mobile.rules.fragment`
- `firebase/patient-mobile.storage.rules`
- This document.

## Data and paths

Existing data: `users/{uid}`, `patients/{uid}`, patient legacy `prenatalVisits`/`medicalHistory` arrays, `patients/{uid}/prenatalVisits`, `patients/{uid}/medicalHistory`, `appointments` (both `patientId` and legacy `patientUid`), reminders and existing care collections. Patient-owned queries use only the authenticated UID, which current registration uses as the patient document ID. Unlinked legacy auto-ID patient records are not guessed or looked up by name/email; staff must link those to the correct account.

New metadata subcollection: `care/{uid}/documents/{documentId}`. Stores patient ID/name, document name/category, download URL, Storage path, server upload timestamp, pending/approved/rejected status, reviewer ID/time/notes. Patients create pending records; staff review existing records. No duplicate patient or appointment collections.

Storage:

- `patients/{uid}/documents/{documentId}/{sanitizedFilename}`
- `patients/{uid}/profile/avatar.jpg` or `avatar.png`

New optional fields on existing appointments: `cancelledAt`, `cancelledBy`, `cancellationReason`, `confirmedAt`, `confirmedBy`; existing status values are retained. Only future pending/Scheduled appointments can be confirmed; future pending/Scheduled/confirmed appointments can be cancelled. Queue, completed and cancelled appointments cannot be changed by patients. The client transaction rechecks ownership and state. Date/time parsing uses Philippine time. The supplied rules enforce ownership and transitions; because historical appointments have heterogeneous date/time strings, future-time validation is performed by the application, not by these rule fragments.

Deletion adds `accountStatus`, `accountDeletionRequestedAt`, `accountDeletedAt` and sets `isActive: false` on the existing patient document. The backend permanently removes Firebase Auth access, the `users` profile, avatar files, private care questions and `careCompanions` sharing grants. It retains clinical history, appointments, submitted documents, shared clinic questions and care plans for staff. An idempotent Auth deletion trigger retries cleanup after failures. No medical records are blindly erased. Confirm the clinic's retention policy before enabling this in production.

## Install and deployment

1. From the app directory, run `npm install`. Dependencies added: `expo-document-picker ~57.0.1` and explicit `expo-file-system ~57.0.6` (file system is already present transitively). These match the installed Expo SDK compatibility map. This environment could not download the picker: network connection refused; offline cache also lacked it. Rebuild the development app if necessary for the native module.
2. Confirm the existing `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` names an enabled Firebase Storage bucket. No secrets were added. Merge the supplied Storage matches into the deployed bucket rules, retaining any existing paths. Cross-service Firestore access for Storage rules needs the Firebase-console permission grant.
3. Merge `firebase/patient-mobile.rules.fragment` into the existing Firestore rules. Retain staff grants and existing patient appointment-create rules. Do not deploy this fragment as a complete ruleset. Audit broad/overlapping existing grants: Firebase rules combine allows, so a broad old grant can bypass the new restrictions. Owners should not be able to modify roles, clinical records, document review fields or other patients' records. Ensure retained-account access is denied after `users/{uid}` is removed, including through any legacy rules.
4. Install backend dependencies with `npm install --prefix functions`. New server dependencies: `firebase-admin` and `firebase-functions`. Configure a Firebase project with Functions/Storage enabled and applicable billing. The default callable region is `us-central1`.
5. Deploy using `firebase deploy --config firebase.patient-mobile.json --project YOUR_PROJECT_ID --only functions:patient-mobile`. This config isolates the new function codebase and does not replace existing rule configuration. Deploy both `deletePatientAccount` and `finishDeletedPatientAccount` together. Do not enable the delete UI in a released build without this backend. Missing deployment produces an error and does not delete records locally.
6. Rerun `npx tsc --noEmit`, then test a development build on a phone. No new composite indexes are required by the added queries.

## Validation and limitations

- `node --test --test-isolation=none tests/*.test.cjs`: 21 tests passed, including new BP parsing/chronology, date/time/status transitions and transaction ownership/cancellation metadata tests. The standard isolated runner was blocked by Windows sandbox child-process permissions, so the supported non-isolated runner was used.
- `node node_modules/typescript/bin/tsc --noEmit`: only error is the uninstalled `expo-document-picker` module. No declaration stubs or suppression were added.
- No lint script or linter is configured; `npm run lint --if-present` has nothing to run.
- `node --check functions/index.js`: passed. Function deployment and security-rule emulator tests were not available here.
- Existing unrelated whitespace errors in login/root layout remain untouched.
- Live Firebase persistence, Firebase permission failures, camera/document pickers, and Android/iOS navigation require manual verification; no connected phone or authenticated Firebase runtime was available.

Manual acceptance: add a dated prenatal visit as staff and watch Home/Progress update; upload PDF/JPEG/PNG and reject oversize/unsupported files; review a document as staff and verify patient status changes; reopen a profile after sign-out/sign-in; cancel/confirm future appointments and attempt forbidden transitions; validate incorrect-current-password and mismatch paths; clear cache and verify clinical data remains; delete a disposable patient account and verify Auth/profile/sharing cleanup while healthcare records remain; verify back navigation after logout cannot enter patient tabs; attempt cross-patient reads/writes in the rules emulator.

Implementation references: Expo SDK 57 DocumentPicker documentation (https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/) and Firebase Authentication user management (https://firebase.google.com/docs/auth/web/manage-users).
