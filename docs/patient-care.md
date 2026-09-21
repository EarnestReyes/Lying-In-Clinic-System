# Patient care workspace

Mobile patients open **My Care** from the tab bar or Home. Staff open **Patient Care** in the shared sidebar and choose a patient. Teal cards, wrapping section controls and a centered responsive content column match the clinic theme.

- **Passport:** preparation checklist with optional custom tasks, staff requirements and review status. Updating a task resets its review. Patients save companion/contact/transport details and preferences separately. Progress is task completion, not medical readiness.
- **Questions:** private questions live in a patient-only collection. Sharing creates a separate staff-visible copy. Staff can answer it. Making it private or deleting it removes the shared copy and answer; staff cannot read the private notebook.
- **Recaps:** staff draft summaries, instructions and follow-up text, then explicitly approve a separate published copy. Patients cannot read drafts. Staff can revise and reapprove, or withdraw published copies. Follow-up text does not book an appointment.
- **Companions:** a trusted person creates a companion account from mobile login and gives the patient their account ID. The patient explicitly chooses preparation items and existing reminders to share. Shared copies are read-only, contain only selected fields and a display name, and can be edited, refreshed or revoked. The UI identifies the last refresh time; these are snapshots, not automatic access to the underlying records. Private questions, clinical recaps and support/contact details are never automatically shared. No invitations or messages are sent externally.

## Database setup before release

Merge `firebase/care.rules.fragment` into the existing Firestore rules and test with an emulator/test project before deployment. It is an additive fragment, not a standalone replacement. No remote rules were deployed. Existing rules must deny broad wildcard access to `care` and `careCompanions`, prevent patient/companion role escalation and preserve staff-only patient-record writes. An existing broad allow overrides narrower rules because Firestore permissions are additive. Companion accounts must not gain access to staff, patient lists, queues or medical records through existing broad authenticated-user grants.

The current patient schema uses the Firebase UID as `patients/{id}`. Staff care uses a stored `uid` alias when supplied. Existing legacy patients without an associated Firebase account must be linked before their mobile account can use that care space. Existing reminder selection uses the application's `reminders.patientUid` field.

No composite index is required for the new queries. `care/{patientUid}` contains subcollections `tasks`, `details`, `privateQuestions`, `sharedQuestions`, `draftRecaps` and `recaps`. `careCompanions` is queried by patientId or companionId. Patient-owned share documents contain only selected copies. Revocation removes access through the app; it cannot retract screenshots or previously copied information.

## Clinical record correction

Staff `[id]` and patient Home now subscribe to the patient document plus `prenatalVisits` and `medicalHistory` subcollections. Stored legacy arrays are merged with subcollection documents, duplicates removed and records sorted newest first. No fabricated visits, ages, blood types, dates or default blood pressure are inserted on the staff record screen. Checkups update the visit and patient measurements in one Firestore batch. The standalone record-checkup route now persists records as well. Clinic Notices derives history/checkup updates from the same subscriptions, alongside existing reminders; it does not create duplicate reminder records.

## Verification before release

Run TypeScript and the tests in `tests`. In an emulator/test project verify two devices synchronize clinical records, staff cannot read private questions, patients cannot read recap drafts or approve recaps, companions can see only their grants, revocation clears the companion view, account signup cannot elevate roles, and writes fail gracefully offline. Test on a physical Expo Go device and the staff website. Server rule enforcement and physical-device behavior cannot be confirmed by the local mocked unit tests alone.
