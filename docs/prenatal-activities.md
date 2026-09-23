# Camera-based prenatal activity verification

## Implementation and compatibility

The existing application uses Expo SDK 57.0.21, React Native 0.86.3, Expo Router patient tabs, Firebase JS Auth and Firestore. `users/{uid}.role` controls patient/staff routing. Patient clinical records may use separate record IDs; **activity ownership always uses the Firebase Authentication UID**, not a clinical record ID. There was no activity verification collection or screen to reuse. Existing care checklist and clinical progress modules are unchanged.

The repository has an ignored, generated `android/` project and native `expo run:android` / `expo run:ios` scripts. There is no checked-in EAS configuration or `expo-dev-client` dependency; a local native debug build is the supported development path here. The prior runtime used on a device cannot be inferred from the files alone.

Selected solution: Google's on-device **ML Kit Pose Detection**, exposed by a local Expo module in `modules/prenatal-pose`. Android uses CameraX and iOS uses AVFoundation. The module returns 13 named body landmarks (nose, shoulders, elbows, wrists, hips, knees, ankles), pixel coordinates in the oriented image, likelihood, dimensions and a monotonic timestamp. It does not count repetitions. TypeScript applies the assigned rules.

Why: both native platforms have official streaming APIs with bundled models, no generative AI service, no paid inference endpoint and no camera-file storage. A local Expo module avoids a third-party wrapper whose Android support is unfinished and avoids adding a second worklets runtime. MediaPipe also supports on-device landmarks, but wrappers reviewed varied in platform support. TensorFlow Lite would require additional model preprocessing/postprocessing and camera integration that ML Kit already supplies. ML Kit's pose API is **beta**, and compatibility with this exact app still requires native builds and device validation.

- Expo Go: camera verification **not supported**; the screen explicitly says so, with no fake fallback.
- Web: no camera verification. The catalog/guide/timer screens can render, but the native confirmation flow for manual activities is intended for the patient mobile app.
- Native Android/iOS build: required. Both implementations are included; neither has been tested on a physical device in this session.
- New npm packages installed: **none**. Existing Expo, Expo Image Picker camera-permission APIs, Ionicons and Firestore are reused. No lockfile changes.
- Declared Android build dependencies: `com.google.mlkit:pose-detection:18.0.0-beta5`, `androidx.camera:camera-camera2:1.5.1`, `camera-lifecycle:1.5.1`, `camera-view:1.5.1`.
- Declared iOS build dependency: `GoogleMLKit/PoseDetection` `8.0.0`; deployment target 16.4 or higher. Native dependency downloads have not been verified in this restricted environment.

References: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [local Expo modules](https://docs.expo.dev/modules/get-started/), [ML Kit Android](https://developers.google.com/ml-kit/vision/pose-detection/android), [ML Kit iOS](https://developers.google.com/ml-kit/vision/pose-detection/ios), [CameraX](https://developer.android.com/jetpack/androidx/releases/camera).

## Files

Created:

- `app/(patient)/activities.tsx`: assigned activity list, guide, privacy acknowledgment, live Firestore subscription.
- `components/activities/ActivitySession.tsx`: pose/timer/manual sessions, permission handling, progress, pause/resume, persistence retry.
- `components/activities/PoseCamera.tsx`: guarded native view binding; unsupported-build state.
- `src/models/Activity.ts`: typed definitions, assignments, landmarks, runtime configuration validation.
- `src/utils/poseMath.ts`: distance, visibility and joint angle math.
- `src/services/movementEvaluator.ts`: stable phase state machine and rep counting.
- `src/services/activityService.ts`: assignment subscription, staff assignment helper and atomic progress/completion writes.
- `modules/prenatal-pose/package.json`, `expo-module.config.json`: local module metadata/autolinking.
- `modules/prenatal-pose/android/build.gradle`, `android/src/main/AndroidManifest.xml`, `android/src/main/java/expo/modules/prenatalpose/PrenatalPoseModule.kt`: Android camera/ML Kit implementation.
- `modules/prenatal-pose/ios/PrenatalPose.podspec`, `ios/PrenatalPoseModule.swift`: iOS camera/ML Kit implementation.
- `firebase/activities.rules.fragment`: required ownership, role and write-validation rules.
- `docs/activity-demo.json`: inactive configurable technical demo, with no generated medical instructions.
- `tests/activities.test.cjs`: deterministic engine and mocked Firestore transaction tests.
- This document.

Modified: `app.json` (camera permission declarations), `app/(patient)/_layout.tsx` (Activities tab and no floating support button over the activity screen).

## Build commands

From `lying-in-system`, with dependencies already installed:

```powershell
# Windows / Android: Android SDK, a compatible JDK, and a connected device are required.
npx expo run:android --device
```

The existing Android native project can be reused. The module's manifest contributes CAMERA permission and Expo autolinking includes the module; **no clean prebuild or eject is required**. Gradle needs network access to download missing plugins, CameraX and ML Kit. If starting from a clean checkout without `android/`, the command generates that platform automatically.

On macOS with Xcode, CocoaPods and an attached iPhone:

```sh
npx expo run:ios --device
```

The iOS project is not present in this workspace, so Expo generates it and applies the camera usage description. Supply the intended iOS bundle identifier/signing team when prompted. CocoaPods downloads ML Kit. These commands build an installed native debug app and start Metro; `expo-dev-client`'s launcher is not installed or necessary for this local build workflow. A JavaScript reload alone cannot add the native module to an older installed binary.

Validation:

```sh
npx tsc --noEmit
node --test --test-isolation=none tests/*.test.cjs
npx expo-modules-autolinking resolve --platform android
npx expo-modules-autolinking resolve --platform apple
# JavaScript import/bundle validation only; does not compile the native module:
npx expo export --platform android --no-bytecode --max-workers 1 --output-dir .expo/activity-export-js
```

The in-process test option avoids this environment's `spawn EPERM` restriction. There is no configured lint script or lint dependency in the project.

## Firestore schema and clinic setup

No Firestore data or rules were deployed. These are new collections, created when clinic staff provisions records:

| Collection | Fields |
| --- | --- |
| `activities/{activityId}` | `name`, `description`, `instructions: string[]`, `verificationType: pose/timer/manual`, `targetRepetitions`, `targetDurationSeconds`, `estimatedDurationSeconds`, `tutorialUrl` (HTTPS or empty), `safetyNotice`, `isActive`, optional `rules`, `createdBy`, `createdAt` |
| `patientActivityAssignments/{assignmentId}` | `patientUid`, `activityId`, `assignedBy`, `assignedAt`, `activity` (immutable approved definition snapshot), `status`, `completedRepetitions`, `durationSeconds`, `startedAt`, `completedAt`, `updatedAt` |
| `activityLogs/{assignmentId}` | `patientUid`, `activityId`, `assignmentId`, `verificationType`, `targetRepetitions`, `targetDurationSeconds`, `completedRepetitions`, `durationSeconds`, `startedAt`, `completedAt`, `status: completed` |

All timestamps written by the service use `serverTimestamp()`. New assignments have status `not_started`, zero counters and null start/completion times. The assignment definition snapshot makes the targets/rules stable even if the catalog definition is later edited. To change a patient's instructions or thresholds, staff must issue a new assignment. Staff may set an existing assignment's `activity.isActive` to false to stop it; changing catalog `isActive` only prevents future assignments.

Setup sequence:

1. Merge `firebase/activities.rules.fragment` inside the deployed ruleset's `/databases/{database}/documents` match. Preserve existing rules, but remove any broad wildcard grant that would bypass these restrictions. The existing Firebase configuration only references Cloud Functions; do not use it to deploy this fragment as a standalone rules file.
2. Protect `users/{uid}.role` against patient edits using the existing account rules. These activity rules depend on trusted staff roles (`admin`, `staff`, `midwife`).
3. Clinic staff creates an activity catalog document with its own instructions, optional demonstration URL, approved targets/rules, `createdBy` set to the staff UID and `createdAt` as a server timestamp. Explicit zero values are required for unused targets. Timer targets are limited to 86,400 seconds, matching the progress cap.
4. Use `assignActivity(activityId, patientAuthUid)` from `src/services/activityService.ts` in authenticated staff tooling. It checks staff role, recipient role, validates the catalog record and copies the approved snapshot. No new admin UI was added, and the patient screen never assigns activities to itself. The Firebase console/Admin SDK can also provision the documented schema; privileged SDK writes bypass rules and must be validated by the clinic's tooling.
5. The patient's Activities tab queries `patientActivityAssignments` using `where('patientUid', '==', auth.currentUser.uid)`. No composite index is needed. Empty lists show an empty state, never fabricated progress.

Required security behavior:

- Only staff creates catalog definitions and assignments; patient ownership and all configuration fields are immutable to patients.
- Patients read only their own assignments/logs and update only allowed progress fields on their own active, unfinished assignments.
- Progress is nondecreasing; targets and verification method cannot be changed by the patient.
- Completion must atomically create a matching history document and update the assignment, with matching server timestamps and target checks.
- History uses the assignment ID, allows creation only, and cannot be edited or deleted. Completed assignments are immutable.
- Staff can read assignments/logs and pause/reactivate unfinished assignments, with separate grants.

Rules enforce authorization and result consistency. **Client-side pose evaluation is not cryptographic proof of movement**: a modified authenticated client could submit fabricated derived counters. Firestore cannot independently attest camera measurements without a different trusted architecture. The normal app has no simulated detection or manual pose-completion path. Timer and manual outcomes retain their actual verification type in history.

## Movement and session behavior

The technical demo measures the **left shoulder–elbow–wrist angle**. It uses 150–180 degrees for start/return, 45–100 degrees for target, confidence 0.7 and 300 ms hold time. These are configurable **test values, not medically validated thresholds**. The engine requires only the landmarks specified in the assigned rules; it does not claim full-body visibility for a three-landmark demo.

`docs/activity-demo.json` is intentionally inactive with an empty instruction list. Runtime validation rejects assigning it until clinic staff supplies instructions and explicitly activates it. No exercise advice is generated automatically and no demo is seeded into patient records. Unit tests supply synthetic landmarks strictly as test fixtures; production frames come only from ML Kit.

The sequence is `WAITING_FOR_START → START_POSITION → TARGET_POSITION → RETURNED_TO_START → rep + 1`. Conditions must hold for the configured duration in each phase. Remaining in target/start does not repeat counts. Missing/low-confidence/out-of-image landmarks, clipped framing, a large frame gap or pause discard the unfinished cycle. Completed repetitions are retained. Ambiguous overlapping target/start ranges do not advance the state machine. Pixel-space math avoids distorting angles with normalized x/y aspect ratios.

Native inference is limited to approximately 10 frames/second, with one frame in flight and stale camera frames dropped. Only landmarks cross into JavaScript. React feedback updates only when text changes and repetition updates occur only when a cycle finishes. No images, screenshots, video files or landmark histories are sent to Firestore. The demonstration link opens clinic-provided external media; it never uploads the camera stream.

Pose completion stops the camera and submits the result automatically. The Firestore transaction rereads ownership/status/targets; duplicate completion calls do nothing after completion. A failed completion keeps the achieved target in memory with a retry button. Progress writes happen after completed repetitions and on pause/exit. Cancel saves progress with `in_progress`; it does not mark an incomplete activity completed.

Timer sessions count foreground, focused, running time; pausing, backgrounding and leaving the tab stop the clock. Finish is enabled only at the configured target. Manual completion requires an explicit confirmation dialog and is recorded as `manual`. No camera opens for either type.

Native lifecycle hooks and screen focus/AppState handling stop capture on leaving/backgrounding, with explicit resume required. Detector failures pause the session and show a retryable error. Denied permission offers retry; permanently denied permission offers device Settings and a permission recheck. An unsupported native binary blocks camera use. Another client's completion or staff pausing the assignment also closes the session when the Firestore update arrives.

## Validation and remaining limits

Verified here:

- TypeScript check passed.
- 38 tests passed: 26 existing tests plus 12 activity tests covering joint math, complete movement cycles, stable holds, stationary poses, jitter, tracking loss, confidence, clipping, malformed config, ambiguous ranges, out-of-order frames, target freeze, ownership/authentication, early completion rejection, progress monotonicity, atomic completion failure/retry and duplicate prevention.
- Expo autolinking resolves `PrenatalPoseModule` for Android and iOS.
- Android JavaScript export passed with `--no-bytecode` (1,614 modules). The new screen focus hooks use the SDK 57 `expo-router` exports. This check does not validate native SDK compilation or runtime camera behavior.
- Tests use mocked transactions, not a live Firestore deployment or rules emulator.

Not verified here:

- Native Android compilation initially failed on restricted access to the global Gradle cache. A second attempt with a writable workspace cache got past that restriction but could not resolve `org.gradle.toolchains.foojay-resolver-convention:1.0.0` offline, before compiling the module. Native SDK compatibility is therefore unconfirmed.
- iOS compilation requires macOS/Xcode and was not run.
- Normal Android export reached Metro resolution but Hermes bytecode compilation was blocked by `spawn EPERM`; JavaScript-only export succeeded. The debug export flag is a verification workaround, not a production build setting.
- No physical-device camera capture, orientation, landmark accuracy, camera interruptions, performance or medical suitability testing was performed.
- Rules are supplied for review/merging; they were not deployed or emulator-tested.
- A force-killed process may lose unsaved timer time or the last pending progress write; restart uses the last server-confirmed counters. The unfinished pose cycle always resets. Multiple-device progress merges use maxima, not sums; concurrent sessions should be avoided.
- ML Kit tracks a prominent person; this is not identity verification, anti-replay detection, medical form assessment, diagnosis or pregnancy safety assessment.

Before rollout, test on Android and iOS hardware: grant/deny/permanent denial; no camera/in-use camera; bright/dim lighting; cropped and missing landmarks; slow/fast cycles and stationary target; background/foreground, tab changes and repeated mounts; target completion; dropped network and retry; completed assignment reopening; two-patient cross-access denial; unauthorized assignment/configuration edits; and atomic completion rules in the Firebase Emulator Suite.
