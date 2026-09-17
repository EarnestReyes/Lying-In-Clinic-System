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