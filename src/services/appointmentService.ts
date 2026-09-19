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
} from "firebase/firestore";

import { db } from "../config/firebase";
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

export const subscribeAppointments = (onUpdate: (appointments: Appointment[]) => void, onError?: (error: Error) => void) =>
  onSnapshot(appointmentsCollection, (snapshot) => onUpdate(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Appointment))), (error) => onError?.(error));

/** Supports both the current patientId field and legacy patientUid field without duplicate records. */
export const subscribePatientAppointments = (patientId: string, onUpdate: (appointments: Appointment[]) => void, onError?: (error: Error) => void) => {
  let byId: Appointment[] = [];
  let byUid: Appointment[] = [];
  const emit = () => {
    const records = new Map<string, Appointment>();
    [...byId, ...byUid].forEach((item) => records.set(item.id, item));
    onUpdate(Array.from(records.values()));
  };
  const mapSnapshot = (snapshot: any) => snapshot.docs.map((item: any) => ({ id: item.id, ...item.data() } as Appointment));
  const unsubscribeId = onSnapshot(query(appointmentsCollection, where('patientId', '==', patientId)), (snapshot) => { byId = mapSnapshot(snapshot); emit(); }, (error) => onError?.(error));
  const unsubscribeUid = onSnapshot(query(appointmentsCollection, where('patientUid', '==', patientId)), (snapshot) => { byUid = mapSnapshot(snapshot); emit(); }, (error) => onError?.(error));
  return () => { unsubscribeId(); unsubscribeUid(); };
};

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
