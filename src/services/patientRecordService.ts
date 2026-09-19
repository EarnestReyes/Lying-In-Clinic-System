import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { InventoryItem } from '../models/inventory';
import { MedicalHistoryEntry, PrenatalVisit } from '../models/PatientRecord';
import { PatientInput } from '../models/Patient';

export const updatePatientRecord = (patientId: string, changes: Partial<PatientInput>) =>
  updateDoc(doc(db, 'patients', patientId), { ...changes, updatedAt: serverTimestamp() });

export const getAvailableMedicationInventory = async (): Promise<InventoryItem[]> => {
  const snapshot = await getDocs(collection(db, 'inventory'));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as InventoryItem)).filter((item) => item.isActive !== false && Number(item.stock) > 0);
};

export const addPrenatalVisit = async (patientId: string, visit: Omit<PrenatalVisit, 'createdAt'>, patientChanges: Partial<PatientInput>) => {
  await addDoc(collection(db, 'patients', patientId, 'prenatalVisits'), { ...visit, createdAt: serverTimestamp() });
  await updatePatientRecord(patientId, patientChanges);
};

export const addMedicalHistoryEntry = (patientId: string, entry: Omit<MedicalHistoryEntry, 'createdAt'>) =>
  addDoc(collection(db, 'patients', patientId, 'medicalHistory'), { ...entry, createdAt: serverTimestamp() });
