import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { Patient } from '../models/Patient';
import { PrenatalVisit, MedicalHistoryEntry } from '../models/PatientRecord';
import { subscribePatientClinicalRecord } from '../services/patientRecordService';
export type ClinicalPatient = Omit<Patient, 'prenatalVisits' | 'medicalHistory'> & { prenatalVisits: PrenatalVisit[]; medicalHistory: MedicalHistoryEntry[] };
export function usePatientClinicalRecord() {
  const { firebaseUser } = useAuth();
  const [patient, setPatient] = useState<ClinicalPatient | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  useEffect(() => {
    setPatient(null); setError(''); setLoading(true);
    if (!firebaseUser) { setLoading(false); return; }
    return subscribePatientClinicalRecord(firebaseUser.uid, value => { setPatient(value); setLoading(false); }, () => { setError('Unable to load clinic records. Check your connection or contact the clinic.'); setLoading(false); });
  }, [firebaseUser?.uid, retry]);
  return { patient, loading, error, refresh: () => setRetry(value => value + 1) };
}
