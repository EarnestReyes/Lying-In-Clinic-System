import { addDoc, collection, doc, getDocs, onSnapshot, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { InventoryItem } from '../models/inventory';
import { MedicalHistoryEntry, PrenatalVisit } from '../models/PatientRecord';
import { PatientInput } from '../models/Patient';
import { mergeClinicalRecords } from '../utils/clinicalRecords';

export function subscribePatientClinicalRecord(patientId: string, onUpdate: (record: any | null) => void, onError: (error: Error) => void) {
  let profile: any = null;
  let visits: any[] = [];
  let history: any[] = [];
  const loaded = new Set<string>();
  const emit = () => {
    if (loaded.size < 3) return;
    onUpdate(profile ? { ...profile, prenatalVisits: mergeClinicalRecords(Array.isArray(profile.prenatalVisits) ? profile.prenatalVisits : [], visits), medicalHistory: mergeClinicalRecords(Array.isArray(profile.medicalHistory) ? profile.medicalHistory : [], history) } : null);
  };
  const stops = [
    onSnapshot(doc(db, 'patients', patientId), snapshot => { profile = snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null; loaded.add('profile'); emit(); }, onError),
    onSnapshot(collection(db, 'patients', patientId, 'prenatalVisits'), snapshot => { visits = snapshot.docs.map(item => ({ ...item.data(), id: item.id })); loaded.add('visits'); emit(); }, onError),
    onSnapshot(collection(db, 'patients', patientId, 'medicalHistory'), snapshot => { history = snapshot.docs.map(item => ({ ...item.data(), id: item.id })); loaded.add('history'); emit(); }, onError),
  ];
  return () => stops.forEach(stop => stop());
}

export const updatePatientRecord = (patientId: string, changes: Partial<PatientInput>) =>
  updateDoc(doc(db, 'patients', patientId), { ...changes, updatedAt: serverTimestamp() });

export const getAvailableMedicationInventory = async (): Promise<InventoryItem[]> => {
  const snapshot = await getDocs(collection(db, 'inventory'));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as InventoryItem)).filter((item) => item.isActive !== false && Number(item.stock) > 0);
};

export const addPrenatalVisit = async (patientId: string, visit: Omit<PrenatalVisit, 'createdAt'>, patientChanges: Partial<PatientInput>) => {
  const batch = writeBatch(db);
  const visitRef = doc(collection(db, 'patients', patientId, 'prenatalVisits'));
  batch.set(visitRef, { ...visit, createdAt: serverTimestamp() });
  batch.update(doc(db, 'patients', patientId), { ...patientChanges, updatedAt: serverTimestamp() });
  await batch.commit();
};

export const addMedicalHistoryEntry = (patientId: string, entry: Omit<MedicalHistoryEntry, 'createdAt'>) =>
  addDoc(collection(db, 'patients', patientId, 'medicalHistory'), { ...entry, createdAt: serverTimestamp() });
