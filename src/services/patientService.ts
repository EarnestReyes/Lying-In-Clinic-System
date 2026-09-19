import { db } from '../config/firebase';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Patient, PatientInput } from '../models/Patient';

const patientsCollection = collection(db, 'patients');

const toPatient = (snapshot: any): Patient => ({ id: snapshot.id, ...snapshot.data() } as Patient);

export const fetchPatients = async (): Promise<Patient[]> => (await getDocs(patientsCollection)).docs.map(toPatient);

export const fetchPatientById = async (id: string): Promise<Patient | null> => {
  const snapshot = await getDoc(doc(db, 'patients', id));
  return snapshot.exists() ? toPatient(snapshot) : null;
};

/** Backward-compatible alias for older callers. */
export const fetchPatient = fetchPatients;

export const subscribePatients = (onUpdate: (patients: Patient[]) => void, onError?: (error: Error) => void) =>
  onSnapshot(patientsCollection, (snapshot) => onUpdate(snapshot.docs.map(toPatient)), (error) => onError?.(error));

export const addPatient = async (itemData: PatientInput) => (await addDoc(patientsCollection, { ...itemData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })).id;

/** Creates/updates the patient document whose ID matches the Firebase Auth UID. */
export const savePatient = async (id: string, itemData: PatientInput) =>
  setDoc(doc(db, 'patients', id), { ...itemData, uid: id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });

export const updatePatient = async (id: string, data: Partial<PatientInput>) =>
  updateDoc(doc(db, 'patients', id), { ...data, updatedAt: serverTimestamp() });

/** Archives records to retain clinical and administrative history. */
export const archivePatient = async (id: string) => updateDoc(doc(db, 'patients', id), { isActive: false, archivedAt: serverTimestamp(), updatedAt: serverTimestamp() });

/** Backward-compatible name; this no longer permanently deletes patient records. */
export const deletePatient = archivePatient;
