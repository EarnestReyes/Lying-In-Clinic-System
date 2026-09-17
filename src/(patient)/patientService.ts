import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const subscribePatientData = (patientUid: string, callback: (data: any) => void) => {
  try {
    // Assuming your collection is named "patients" or "users"
    const patientRef = doc(db, "patients", patientUid);
    return onSnapshot(patientRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        callback({ id: docSnapshot.id, ...docSnapshot.data() });
      } else {
        console.log("No such patient document!");
        callback(null);
      }
    }, (error) => {
      console.error("Error listening to patient data: ", error);
    });
  } catch (error) {
    console.error("Error setting up patient listener: ", error);
    return () => {};
  }
};