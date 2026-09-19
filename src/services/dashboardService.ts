import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Appointment } from '../models/Appointment';
import { Patient } from '../models/Patient';
import { Reminder } from '../models/reminder';

const mapDocument = <T>(item: any): T => ({ id: item.id, ...item.data() } as T);

export const subscribeDashboardPatients = (onUpdate: (patients: Patient[]) => void, onError?: (error: Error) => void) =>
  onSnapshot(collection(db, 'patients'), (snapshot) => onUpdate(snapshot.docs.map(mapDocument<Patient>)), (error) => onError?.(error));

export const subscribeDashboardAppointments = (onUpdate: (appointments: Appointment[]) => void, onError?: (error: Error) => void) =>
  onSnapshot(collection(db, 'appointments'), (snapshot) => onUpdate(snapshot.docs.map(mapDocument<Appointment>)), (error) => onError?.(error));

export const subscribeDashboardReminders = (onUpdate: (reminders: Reminder[]) => void, onError?: (error: Error) => void) =>
  onSnapshot(collection(db, 'reminders'), (snapshot) => onUpdate(snapshot.docs.map(mapDocument<Reminder>)), (error) => onError?.(error));

