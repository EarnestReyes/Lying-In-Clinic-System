# Clinic check-in and live queue

Patients open **Appointments → Check In / My Queue** and confirm arrival for a confirmed appointment on the current Philippine calendar date. Staff open **Dashboard → Live Queue / Clinic QR**. The queue displays arrivals, appointment details, waiting positions, and status controls. Completing a consultation also completes the appointment in the same transaction. No-show means a checked-in patient was unavailable when called; appointments that never checked in remain in appointment management.

Patient check-in runs on mobile only. On the web, `/check-in` shows instructions to open the installed app and does not subscribe to patient data. Staff queue management runs on the website only. Role checks and Firestore rules protect data access; platform checks define the supported UI, not a server-side device attestation mechanism.

The QR panel has two modes. **Installed clinic app** uses `lyinginsystem://check-in`; this requires an installed native build with the app scheme. **Expo Go** uses the running project's `exp://.../--/check-in` link. Paste the project URL beside "Metro waiting on" from the Expo terminal into the QR panel. Development defaults to Expo Go and uses the Expo host when available; `EXPO_PUBLIC_EXPO_GO_URL` can also supply the default. Localhost addresses are rejected because they cannot reach the computer from a phone. Keep Metro running and use the same Wi-Fi or a tunnel. On Android scan inside Expo Go; on iPhone use the Camera app. Production defaults to the installed-app QR.

Sign-in preserves the check-in destination. Scanning opens the confirmation screen and does not itself record arrival. No new camera permission is needed. QR codes contain only the app/project link, never patient data.

## Firebase deployment prerequisite

This repository has no existing Firestore rules or deployment configuration. Merge `firebase/queue.rules.fragment` into the deployed rules under `match /databases/{database}/documents`, test in the Firebase emulator, and deploy through the project's normal process before releasing this feature. The fragment is not a standalone replacement for existing rules. No remote configuration was changed by this implementation.

Existing rules must restrict appointment reads to the owner/staff, protect appointment ownership and confirmation status from patient edits, allow staff to complete appointments, and prevent users from modifying their own role. Remove any broad wildcard grants covering the queue collections: Firestore grants are additive. The new rules alone cannot override existing broad permissions.

`queueEntries/{appointmentId}` contains private appointment details and is readable by the owning patient and staff. `queueTickets/{appointmentId}` contains only day, arrival timestamp and status, allowing patients to calculate their position without reading other patients' records. Both documents are created and transitioned atomically. IDs are deterministic to prevent duplicate check-in of an appointment. All arrival timestamps use the server clock. Waiting order is arrival timestamp, with document ID breaking ties. Only Waiting → In Consultation / No-show and In Consultation → Completed transitions are allowed.

Appointment dates supported by the rules are `YYYY-MM-DD` and the existing `MMM D, YYYY` format (for example `Sep 19, 2026`). Normalize other legacy formats before rollout. No composite index is required by the queue queries. A network connection is required for transaction writes; offline check-in is not reported as successful.

## Validation

Run `node --test --test-isolation=none tests/queue.test.cjs` and `npx tsc --noEmit`.

Before deployment, verify against the Firebase emulator or a test project:

- Two simultaneous check-ins of the same appointment produce one entry with the original timestamp.
- Patients cannot read another patient's private queue entry, forge an arrival time, change queue status, or check in an unconfirmed/future/cancelled appointment.
- Partial entry/ticket writes are rejected; staff transitions update both documents together.
- Two staff members acting on the same patient cannot overwrite a newer status with an invalid transition.
- Two signed-in devices receive arrivals and status changes immediately; midnight in Asia/Manila rolls the view to the next day.
- Scan the displayed QR on a physical device with the installed native app, including while signed out.

The queue makes no medical priority decision or time-duration promise. Other proposed features (consent, notifications, offline checkup drafts, uploads, and postnatal timelines) are separate work.
