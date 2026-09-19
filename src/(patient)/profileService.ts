import { db } from '../../src/config/firebase'; // Adjust path to your firebase config if needed
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export interface PatientProfile {
  name?: string;
  email?: string;
  phone?: string;
  contactNumber?: string;
  pregnancyWeek?: number;
  gravidaPara?: string;
  edd?: string;
  bloodType?: string;
  emergencyContact?: string;
  status?: string;
}

export const fetchPatientProfile = async (patientUid: string): Promise<PatientProfile | null> => {
  try {
    const docRef = doc(db, "patients", patientUid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as PatientProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching patient profile: ", error);
    throw error;
  }
};

export const updatePatientProfile = async (patientUid: string, updatedData: Partial<PatientProfile>) => {
  try {
    const docRef = doc(db, "patients", patientUid);
    await updateDoc(docRef, updatedData);
  } catch (error) {
    console.error("Error updating patient profile: ", error);
    throw error;
  }
};
