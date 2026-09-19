import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { CLINIC } from '../config/clinic';
import { db } from '../config/firebase';
import { ClinicLocation } from '../models/ClinicLocation';

const clinicSettingsRef = doc(db, 'settings', 'clinic');
const fallbackClinic: ClinicLocation = CLINIC;

/**
 * Keeps every patient portal pinned to this deployment's clinic.
 * If settings/clinic does not exist yet, the deployment configuration is used.
 */
export const subscribeClinicLocation = (onUpdate: (location: ClinicLocation) => void, onError?: (error: Error) => void) =>
  onSnapshot(clinicSettingsRef, (snapshot) => {
    const data = snapshot.data() as Partial<ClinicLocation> | undefined;
    const latitude = Number(data?.coordinates?.latitude);
    const longitude = Number(data?.coordinates?.longitude);
    onUpdate(data?.name && data.address && Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { name: data.name, address: data.address, coordinates: { latitude, longitude }, updatedAt: data.updatedAt }
      : fallbackClinic);
  }, (error) => { onError?.(error); onUpdate(fallbackClinic); });

/** Save the physical location for this clinic deployment. */
export const saveClinicLocation = (location: ClinicLocation) =>
  setDoc(clinicSettingsRef, { ...location, updatedAt: serverTimestamp() }, { merge: true });

