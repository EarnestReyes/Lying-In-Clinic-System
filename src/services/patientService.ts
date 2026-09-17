import { db } from '../config/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

export const fetchPatient = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "patient"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching patients list: ", error);
    return [];
  }
};

export const addPatient = async (itemData: any) => {
  try {
    const docRef = await addDoc(collection(db, "patient]"), itemData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding patient: ", error);
    throw error;
  }
};