import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { ActivityAssignment, parseAssignment, validActivity } from '../models/Activity';

function patientUid() { const uid = auth.currentUser?.uid; if (!uid) throw Error('Please sign in again.'); return uid; }
export function subscribeActivities(next: (items: ActivityAssignment[]) => void, error: (error: Error) => void) {
  const uid = patientUid();
  return onSnapshot(query(collection(db, 'patientActivityAssignments'), where('patientUid', '==', uid)), snapshot => {
    try { next(snapshot.docs.map(d => parseAssignment(d.id, d.data()))); } catch (e) { error(e instanceof Error ? e : Error('Unable to load activities.')); }
  }, error);
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
