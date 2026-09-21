import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  onSnapshot,
  runTransaction,
  QuerySnapshot,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";
import { canPatientChange } from '../utils/patientAppointments';
import { Appointment } from "../models/Appointment";

const appointmentsCollection = collection(db, "appointments");

export async function getAppointments(): Promise<Appointment[]> {
  const q = query(
    appointmentsCollection,
    orderBy("appointmentDate", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Appointment[];
}

export async function getPatientAppointments(
  patientId: string
): Promise<Appointment[]> {
  const q = query(
    appointmentsCollection,
    where("patientId", "==", patientId),
    orderBy("appointmentDate", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Appointment[];
}

export async function createAppointment(
  appointment: Omit<
    Appointment,
    "id" | "createdAt" | "updatedAt"
  >
) {
  return await addDoc(appointmentsCollection, {
    ...appointment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateAppointment(
  appointmentId: string,
  data: Partial<Appointment>
) {
  await updateDoc(
    doc(db, "appointments", appointmentId),
    {
      ...data,
      updatedAt: serverTimestamp(),
    }
  );
}

export async function deleteAppointment(
  appointmentId: string
) {
  await deleteDoc(
    doc(db, "appointments", appointmentId)
  );
}

export async function reviewAppointment(
  appointmentId: string,
  decision: 'confirmed' | 'cancelled',
  cancellationReason = ''
) {
  const staffUid = auth.currentUser?.uid;
  if (!staffUid) throw new Error('Please sign in again.');
  const reason = cancellationReason.trim();
  if (decision === 'cancelled' && !reason) throw new Error('Enter a cancellation reason.');

  await runTransaction(db, async transaction => {
    const target = doc(db, 'appointments', appointmentId);
    const snapshot = await transaction.get(target);
    if (!snapshot.exists()) throw new Error('Appointment no longer exists.');
    const currentStatus = String(snapshot.data().status || '').toLowerCase();
    if (!['pending', 'requested'].includes(currentStatus)) throw new Error('This appointment has already been reviewed.');

    transaction.update(target, decision === 'confirmed'
      ? { status: 'confirmed', confirmedAt: serverTimestamp(), confirmedBy: staffUid, updatedAt: serverTimestamp() }
      : { status: 'cancelled', cancellationReason: reason, cancelledAt: serverTimestamp(), cancelledBy: staffUid, updatedAt: serverTimestamp() });
  });
}

export const subscribeAppointments = (onUpdate: (appointments: Appointment[]) => void, onError?: (error: Error) => void) =>
  onSnapshot(appointmentsCollection, (snapshot) => onUpdate(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Appointment))), (error) => onError?.(error));

/** Supports both the current patientId field and legacy patientUid field without duplicate records. */
export const subscribePatientAppointments = (patientId: string, onUpdate: (appointments: Appointment[]) => void, onError?: (error: Error) => void) => {
  let byId: Appointment[] = [];
  let byUid: Appointment[] = [];
  let idReady = false;
  let uidReady = false;
  let failed = false;
  const emit = () => {
    if (!idReady || !uidReady || failed) return;
    const records = new Map<string, Appointment>();
    [...byId, ...byUid].forEach((item) => records.set(item.id, item));
    onUpdate(Array.from(records.values()));
  };
  const mapSnapshot = (snapshot: QuerySnapshot) => snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Appointment));
  const fail = (error: Error) => { failed = true; onError?.(error); };
  const unsubscribeId = onSnapshot(query(appointmentsCollection, where('patientId', '==', patientId)), (snapshot) => { byId = mapSnapshot(snapshot); idReady = true; emit(); }, fail);
  const unsubscribeUid = onSnapshot(query(appointmentsCollection, where('patientUid', '==', patientId)), (snapshot) => { byUid = mapSnapshot(snapshot); uidReady = true; emit(); }, fail);
  return () => { unsubscribeId(); unsubscribeUid(); };
};

export async function changePatientAppointment(id: string, status: 'confirmed' | 'cancelled', cancellationReason = '') {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Please sign in again.');
  await runTransaction(db, async transaction => {
    const target = doc(db, 'appointments', id);
    const snapshot = await transaction.get(target);
    if (!snapshot.exists()) throw new Error('Appointment no longer exists.');
    const item = { ...snapshot.data(), id } as Appointment;
    if (item.patientId !== uid && item.patientUid !== uid) throw new Error('This appointment belongs to another patient.');
    if (!canPatientChange(item, status)) throw new Error('This appointment can no longer be changed. Please contact the clinic.');
    transaction.update(target, { status, updatedAt: serverTimestamp(), ...(status === 'cancelled'
      ? { cancelledAt: serverTimestamp(), cancelledBy: uid, cancellationReason: cancellationReason.trim() }
      : { confirmedAt: serverTimestamp(), confirmedBy: uid }) });
  });
}

/** Prevents two active appointments from being booked for the same date and time. */
export async function assertAppointmentSlotAvailable(appointmentDate: string, appointmentTime: string) {
  const snapshot = await getDocs(appointmentsCollection);
  const conflict = snapshot.docs.some((item) => {
    const data: any = item.data();
    const status = String(data.status || '').toLowerCase();
    const active = !['completed', 'cancelled', 'canceled'].includes(status);
    return active && String(data.appointmentDate || data.date || '').trim() === appointmentDate.trim() && String(data.appointmentTime || data.time || '').trim() === appointmentTime.trim();
  });
  if (conflict) throw new Error(`The ${appointmentTime} slot on ${appointmentDate} is already booked.`);
}
