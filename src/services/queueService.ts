import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { Appointment } from '../models/Appointment';
import { canCheckIn, canTransition, clinicDay, QueueEntry, QueueStatus, QueueTicket } from '../utils/queue';

export function subscribeQueue(day: string, update: (tickets: QueueTicket[]) => void, error: (error: Error) => void) {
  return onSnapshot(query(collection(db, 'queueTickets'), where('day', '==', day)), { includeMetadataChanges: true }, snapshot =>
    update(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as QueueTicket))), error);
}
export function subscribeQueueEntries(day: string, patientId: string | null, update: (entries: QueueEntry[]) => void, error: (error: Error) => void) {
  const source = patientId
    ? query(collection(db, 'queueEntries'), where('patientId', '==', patientId))
    : query(collection(db, 'queueEntries'), where('day', '==', day));
  return onSnapshot(source, snapshot => update(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as QueueEntry)).filter(item => item.day === day)), error);
}
export async function checkIn(appointmentId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to check in.');
  await runTransaction(db, async transaction => {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const entryRef = doc(db, 'queueEntries', appointmentId);
    const [appointmentSnapshot, existing, profile] = await Promise.all([
      transaction.get(appointmentRef), transaction.get(entryRef), transaction.get(doc(db, 'users', uid)),
    ]);
    if (!appointmentSnapshot.exists()) throw new Error('Appointment no longer exists.');
    const appointment = appointmentSnapshot.data() as Appointment;
    if (appointment.patientId !== uid && appointment.patientUid !== uid) throw new Error('This appointment belongs to another patient.');
    if (existing.exists()) return;
    if (!canCheckIn(appointment)) throw new Error('Check-in is available for confirmed appointments today.');
    const day = clinicDay();
    const ticket = { day, status: 'Waiting', checkedInAt: serverTimestamp() };
    transaction.set(entryRef, {
      ...ticket, patientId: uid,
      patientName: profile.data()?.fullName || appointment.patientName,
      appointmentTime: appointment.appointmentTime || appointment.time || '',
      purpose: appointment.purpose || appointment.service || 'Consultation',
    });
    transaction.set(doc(db, 'queueTickets', appointmentId), ticket);
  });
}
export async function changeQueueStatus(id: string, status: QueueStatus): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in to manage the queue.');
  await runTransaction(db, async transaction => {
    const entryRef = doc(db, 'queueEntries', id);
    const [profile, snapshot] = await Promise.all([transaction.get(doc(db, 'users', uid)), transaction.get(entryRef)]);
    if (!['admin', 'staff', 'midwife'].includes(profile.data()?.role)) throw new Error('Staff access required.');
    if (!snapshot.exists()) throw new Error('Queue entry no longer exists.');
    const entry = snapshot.data() as QueueEntry;
    if (!canTransition(entry.status, status)) throw new Error('The status has changed. Please review the live queue.');
    transaction.update(entryRef, { status });
    transaction.update(doc(db, 'queueTickets', id), { status });
    if (status === 'Completed') transaction.update(doc(db, 'appointments', id), { status: 'completed', updatedAt: serverTimestamp() });
  });
}
