import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { CarePlan, CareQuestion, CareRecap, CareTask, CompanionShare, emptyCarePlan } from '../models/Care';

function signedIn() { const uid = auth.currentUser?.uid; if (!uid) throw new Error('Please sign in again.'); return uid; }
function owner(patientId: string) { if (signedIn() !== patientId) throw new Error('Only the patient can change this item.'); }
async function staff() {
  const uid = signedIn();
  const profile = await getDoc(doc(db, 'users', uid));
  if (!['staff', 'midwife', 'admin'].includes(profile.data()?.role)) throw new Error('Staff access required.');
  return uid;
}
const careCollection = (patientId: string, section: string) => collection(db, 'care', patientId, section);
function listen<T>(patientId: string, section: string, update: (items: T[]) => void, error: (error: Error) => void) {
  return onSnapshot(careCollection(patientId, section), snapshot => update(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as T))), error);
}
export const subscribeCareTasks = (id: string, update: (items: CareTask[]) => void, error: (error: Error) => void) => listen(id, 'tasks', update, error);
export const subscribeQuestions = (id: string, shared: boolean, update: (items: CareQuestion[]) => void, error: (error: Error) => void) => listen(id, shared ? 'sharedQuestions' : 'privateQuestions', update, error);
export const subscribeRecaps = (id: string, draft: boolean, update: (items: CareRecap[]) => void, error: (error: Error) => void) => listen(id, draft ? 'draftRecaps' : 'recaps', update, error);
export function subscribeCarePlan(id: string, update: (plan: CarePlan) => void, error: (error: Error) => void) {
  return onSnapshot(doc(db, 'care', id, 'details', 'plan'), snapshot => update(snapshot.exists() ? snapshot.data() as CarePlan : emptyCarePlan), error);
}
export async function saveCarePlan(patientId: string, plan: CarePlan) {
  owner(patientId);
  if (Object.values(plan).some(value => value.length > 2000)) throw new Error('Keep each field under 2,000 characters.');
  await setDoc(doc(db, 'care', patientId, 'details', 'plan'), { ...plan, updatedAt: serverTimestamp() });
}
export async function setTaskDone(patientId: string, task: CareTask) {
  owner(patientId);
  const { id, label, category, done } = task;
  await setDoc(doc(db, 'care', patientId, 'tasks', id), { label, category, done: !done, review: 'Pending', reviewedBy: '', updatedAt: serverTimestamp() });
}
export async function addCareTask(patientId: string, label: string, isStaff: boolean) {
  if (isStaff) await staff(); else owner(patientId);
  if (!label.trim() || label.length > 200) throw new Error('Enter a preparation task (up to 200 characters).');
  await addDoc(careCollection(patientId, 'tasks'), { label: label.trim(), category: isStaff ? 'Clinic requirements' : 'My checklist', done: false, review: 'Pending', reviewedBy: '', updatedAt: serverTimestamp() });
}
export async function reviewCareTask(patientId: string, task: CareTask, review: CareTask['review']) {
  const uid = await staff();
  const { id, label, category, done } = task;
  await setDoc(doc(db, 'care', patientId, 'tasks', id), { label, category, done, review, reviewedBy: uid, updatedAt: serverTimestamp() });
}
export async function addCareQuestion(patientId: string, text: string) {
  owner(patientId);
  if (!text.trim() || text.length > 1500) throw new Error('Enter a question (up to 1,500 characters).');
  await addDoc(careCollection(patientId, 'privateQuestions'), { text: text.trim(), updatedAt: serverTimestamp() });
}
export async function shareCareQuestion(patientId: string, question: CareQuestion, share: boolean) {
  owner(patientId);
  const ref = doc(db, 'care', patientId, 'sharedQuestions', question.id);
  if (!share) { await deleteDoc(ref); return; }
  await runTransaction(db, async transaction => {
    const [existing, original] = await Promise.all([transaction.get(ref), transaction.get(doc(db, 'care', patientId, 'privateQuestions', question.id))]);
    if (existing.exists()) return;
    if (!original.exists()) throw new Error('This question no longer exists.');
    transaction.set(ref, { text: original.data().text, answer: '', status: 'Shared', updatedAt: serverTimestamp() });
  });
}
export async function deleteCareQuestion(patientId: string, id: string) {
  owner(patientId);
  const batch = writeBatch(db);
  batch.delete(doc(db, 'care', patientId, 'privateQuestions', id));
  batch.delete(doc(db, 'care', patientId, 'sharedQuestions', id));
  await batch.commit();
}
export async function answerCareQuestion(patientId: string, id: string, answer: string) {
  const uid = await staff();
  if (!answer.trim() || answer.length > 3000) throw new Error('Enter a response (up to 3,000 characters).');
  await updateDoc(doc(db, 'care', patientId, 'sharedQuestions', id), { answer: answer.trim(), status: 'Answered', answeredBy: uid, updatedAt: serverTimestamp() });
}
export async function saveRecapDraft(patientId: string, recap: Omit<CareRecap, 'id'>, id?: string) {
  const uid = await staff();
  validateRecap(recap);
  const ref = id ? doc(db, 'care', patientId, 'draftRecaps', id) : doc(careCollection(patientId, 'draftRecaps'));
  await setDoc(ref, { ...recap, updatedBy: uid, updatedAt: serverTimestamp() });
  return ref.id;
}
export function validateRecap(recap: Omit<CareRecap, 'id'>) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recap.visitDate) || new Date(`${recap.visitDate}T00:00:00Z`).toISOString().slice(0, 10) !== recap.visitDate) throw new Error('Enter a valid visit date as YYYY-MM-DD.');
  if (!recap.summary.trim() || recap.summary.length > 4000 || recap.instructions.length > 4000 || recap.nextVisit.length > 300) throw new Error('Add a summary and keep summary/instructions under 4,000 characters.');
}
export async function publishRecap(patientId: string, id: string) {
  const uid = await staff();
  await runTransaction(db, async transaction => {
    const draftRef = doc(db, 'care', patientId, 'draftRecaps', id);
    const snapshot = await transaction.get(draftRef);
    if (!snapshot.exists()) throw new Error('Save the draft before approving it.');
    const { visitDate, summary, instructions, nextVisit } = snapshot.data();
    validateRecap({ visitDate, summary, instructions, nextVisit });
    transaction.set(doc(db, 'care', patientId, 'recaps', id), { visitDate, summary, instructions, nextVisit, approvedBy: uid, approvedAt: serverTimestamp() });
  });
}
export async function withdrawRecap(patientId: string, id: string) { await staff(); await deleteDoc(doc(db, 'care', patientId, 'recaps', id)); }
export function subscribeCompanionShares(id: string, asCompanion: boolean, update: (items: CompanionShare[]) => void, error: (error: Error) => void) {
  return onSnapshot(query(collection(db, 'careCompanions'), where(asCompanion ? 'companionId' : 'patientId', '==', id)), snapshot => update(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as CompanionShare))), error);
}
export async function saveCompanionShare(data: Omit<CompanionShare, 'id' | 'updatedAt'>, id?: string) {
  owner(data.patientId);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(data.companionId) || data.companionId === data.patientId) throw new Error('Enter your companion’s account ID, not an email address.');
  if (!data.preparation.length && !data.reminders.length) throw new Error('Select at least one preparation item or reminder to share.');
  const ref = id ? doc(db, 'careCompanions', id) : doc(collection(db, 'careCompanions'));
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() });
}
export async function revokeCompanionShare(patientId: string, id: string) { owner(patientId); await deleteDoc(doc(db, 'careCompanions', id)); }
