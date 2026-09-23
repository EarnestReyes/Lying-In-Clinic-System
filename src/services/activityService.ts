import { collection, deleteField, doc, getDoc, getDocsFromServer, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { ActivityAssignment, ActivityDefinition, CatalogActivity, parseAssignment, validActivity, validMovementRules } from '../models/Activity';
import type { Patient } from '../models/Patient';

function patientUid() { const uid = auth.currentUser?.uid; if (!uid) throw Error('Please sign in again.'); return uid; }
export function subscribeActivities(next: (items: ActivityAssignment[]) => void, error: (error: Error) => void) {
  return subscribePatientActivities(patientUid(), next, error);
}
export function subscribePatientActivities(uid: string, next: (items: ActivityAssignment[]) => void, error: (error: Error) => void) {
  return onSnapshot(query(collection(db, 'patientActivityAssignments'), where('patientUid', '==', uid)), snapshot => {
    try { next(snapshot.docs.map(d => parseAssignment(d.id, d.data()))); } catch (e) { error(e instanceof Error ? e : Error('Unable to load activities.')); }
  }, error);
}

/** Never infer an account link from a clinical ID, name, or email. */
export async function getPatientAuthUid(patient: Pick<Patient, 'uid'>): Promise<string> {
  const uid = patient.uid;
  if (typeof uid !== 'string' || !uid.trim() || uid.includes('/')) throw Error('Unable to assign activity because this patient record is not linked to a patient account.');
  const user = await getDoc(doc(db, 'users', uid));
  if (user.data()?.role !== 'patient') throw Error('Unable to assign activity because the linked patient account is unavailable.');
  return uid;
}

export function subscribeActivityLibrary(next: (items: CatalogActivity[]) => void, error: (error: Error) => void, activeOnly = false) {
  const source = collection(db, 'activities');
  return onSnapshot(activeOnly ? query(source, where('isActive', '==', true)) : source, snapshot => {
    try {
      const items = snapshot.docs.map(item => {
        const data = item.data();
        if (!validActivity(data)) {
          const configurationError = 'Configuration needs review. Edit the activity to supply valid instructions and targets before assignment.';
          if (activeOnly) throw Error(`Activity "${String(data.name || item.id)}" needs a valid clinic configuration. Ask staff to edit or deactivate it in the Activity Library.`);
          // Keep incomplete developer-configured drafts editable without ever
          // offering them for assignment or as approved movement templates.
          const text = (value: unknown) => typeof value === 'string' ? value : '';
          const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
          return { id: item.id, configurationError, name: text(data.name), description: text(data.description),
            instructions: Array.isArray(data.instructions) ? data.instructions.filter((line: unknown): line is string => typeof line === 'string') : [],
            verificationType: data.verificationType === 'pose' || data.verificationType === 'timer' ? data.verificationType : 'manual',
            targetRepetitions: number(data.targetRepetitions), targetDurationSeconds: number(data.targetDurationSeconds),
            estimatedDurationSeconds: number(data.estimatedDurationSeconds), tutorialUrl: text(data.tutorialUrl), safetyNotice: text(data.safetyNotice),
            isActive: data.isActive === true, ...(validMovementRules(data.rules) ? { rules: data.rules } : {}) } satisfies CatalogActivity;
        }
        return { ...data, id: item.id } as CatalogActivity;
      });
      next(items.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (reason) { error(reason instanceof Error ? reason : Error('Unable to load activity library.')); }
  }, error);
}

function definitionFields(activity: ActivityDefinition): ActivityDefinition {
  const { name, description, instructions, verificationType, targetRepetitions, targetDurationSeconds, estimatedDurationSeconds, tutorialUrl, safetyNotice, isActive, rules } = activity;
  return { name, description, instructions, verificationType, targetRepetitions, targetDurationSeconds, estimatedDurationSeconds, tutorialUrl, safetyNotice, isActive, ...(verificationType === 'pose' && rules ? { rules } : {}) };
}

export async function saveActivityDefinition(activity: ActivityDefinition, id?: string) {
  if (!validActivity(activity)) throw Error('Enter a name, instructions, valid target, and an HTTPS tutorial URL if provided. Camera activities also require a configured movement template.');
  const uid = patientUid(), ref = id ? doc(db, 'activities', id) : doc(collection(db, 'activities'));
  await runTransaction(db, async tx => {
    const user = await tx.get(doc(db, 'users', uid));
    if (!['admin', 'staff', 'midwife'].includes(user.data()?.role)) throw Error('Staff access required.');
    if (id && !(await tx.get(ref)).exists()) throw Error('Activity no longer exists.');
    const fields = { ...definitionFields(activity), updatedBy: uid, updatedAt: serverTimestamp() };
    if (id) tx.update(ref, { ...fields, ...(activity.verificationType !== 'pose' ? { rules: deleteField() } : {}) });
    else tx.set(ref, { ...fields, createdBy: uid, createdAt: serverTimestamp() });
  });
  return ref.id;
}

export async function setActivityActive(id: string, isActive: boolean) {
  const uid = patientUid();
  await runTransaction(db, async tx => {
    const ref = doc(db, 'activities', id);
    const [user, source] = await Promise.all([tx.get(doc(db, 'users', uid)), tx.get(ref)]);
    if (!['admin', 'staff', 'midwife'].includes(user.data()?.role)) throw Error('Staff access required.');
    if (!source.exists() || (isActive && !validActivity(source.data()))) throw Error('Activity needs approved configuration.');
    tx.update(ref, { isActive, updatedAt: serverTimestamp(), updatedBy: uid });
  });
}
// For clinic tooling only; Security Rules independently enforce staff authorization.
export async function assignActivity(activityId: string, patient: string) {
  const uid = patientUid(), assignment = doc(collection(db, 'patientActivityAssignments'));
  await runTransaction(db, async tx => {
    const [user, recipient, source] = await Promise.all([tx.get(doc(db, 'users', uid)), tx.get(doc(db, 'users', patient)), tx.get(doc(db, 'activities', activityId))]);
    if (!['admin', 'staff', 'midwife'].includes(user.data()?.role)) throw Error('Staff access required.');
    if (recipient.data()?.role !== 'patient') throw Error('Select a patient account.');
    const activity = source.data();
    if (!validActivity(activity) || !activity.isActive) throw Error('Activity needs approved configuration.');
    // Reading the catalog document in this transaction and updating its revision
    // serializes concurrent assignments of this activity. The query is repeated
    // on transaction retry, including assignments made by another staff device.
    const existing = await getDocsFromServer(query(collection(db, 'patientActivityAssignments'), where('patientUid', '==', patient)));
    if (existing.docs.some(item => item.data().activityId === activityId && ['not_started', 'in_progress'].includes(item.data().status))) {
      throw Error('This patient already has an active assignment for this activity.');
    }
    const revision = source.data()?.assignmentRevision;
    tx.update(doc(db, 'activities', activityId), { assignmentRevision: (Number.isSafeInteger(revision) ? revision : 0) + 1 });
    // Explicitly copy only the definition; catalog metadata remains in the catalog.
    const { name, description, instructions, verificationType, targetRepetitions, targetDurationSeconds, estimatedDurationSeconds, tutorialUrl, safetyNotice, isActive, rules } = activity;
    tx.set(assignment, { patientUid: patient, activityId, assignedBy: uid, assignedAt: serverTimestamp(), activity: { name, description, instructions, verificationType, targetRepetitions, targetDurationSeconds, estimatedDurationSeconds, tutorialUrl, safetyNotice, isActive, ...(rules ? { rules } : {}) }, status: 'not_started', completedRepetitions: 0, durationSeconds: 0, startedAt: null, completedAt: null, updatedAt: serverTimestamp() });
  });
  return assignment.id;
}
export async function saveActivityProgress(id: string, repetitions: number, seconds: number, complete = false): Promise<void> {
  const uid = patientUid();
  if (![repetitions, seconds].every(n => Number.isSafeInteger(n) && n >= 0) || seconds > 86400) throw Error('Invalid activity progress.');
  await runTransaction(db, async tx => {
    const ref = doc(db, 'patientActivityAssignments', id), snapshot = await tx.get(ref);
    if (!snapshot.exists()) throw Error('Assignment no longer exists.');
    const assignment = parseAssignment(id, snapshot.data());
    if (assignment.patientUid !== uid) throw Error('This activity belongs to another patient.');
    if (assignment.status === 'completed') return;
    if (!assignment.activity.isActive) throw Error('The clinic has paused this assignment.');
    const a = assignment.activity;
    const reps = Math.max(assignment.completedRepetitions, repetitions);
    const duration = Math.max(assignment.durationSeconds, seconds);
    if (a.verificationType !== 'pose' && reps !== 0) throw Error('Repetitions are only valid for camera activities.');
    if (a.verificationType === 'pose' && reps > a.targetRepetitions) throw Error('Repetition target exceeded.');
    if (complete && ((a.verificationType === 'pose' && reps < a.targetRepetitions) || (a.verificationType === 'timer' && duration < a.targetDurationSeconds))) throw Error('Activity target has not been reached.');
    const startedAt = snapshot.data().startedAt ?? serverTimestamp();
    const progress = { status: complete ? 'completed' : 'in_progress', completedRepetitions: reps, durationSeconds: duration, startedAt, completedAt: complete ? serverTimestamp() : null, updatedAt: serverTimestamp() };
    tx.update(ref, progress);
    if (complete) tx.set(doc(db, 'activityLogs', id), { patientUid: uid, assignmentId: id, activityId: assignment.activityId, verificationType: a.verificationType, targetRepetitions: a.targetRepetitions, targetDurationSeconds: a.targetDurationSeconds, completedRepetitions: reps, durationSeconds: duration, startedAt, completedAt: serverTimestamp(), status: 'completed' });
  });
}
