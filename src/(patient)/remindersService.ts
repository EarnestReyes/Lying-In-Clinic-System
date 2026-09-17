import { db } from '../../src/config/firebase'; // Adjust path to your firebase config if needed
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { Reminder } from '../models/reminder';

export const fetchRemindersForPatient = async (patientUid: string): Promise<Reminder[]> => {
  try {
    const q = query(collection(db, "reminders"), where("patientUid", "==", patientUid));
    const querySnapshot = await getDocs(q);
    
    const reminders: Reminder[] = [];
    querySnapshot.forEach((docSnap) => {
      reminders.push({ id: docSnap.id, ...docSnap.data() } as Reminder);
    });
    
    return reminders;
  } catch (error) {
    console.error("Error fetching reminders: ", error);
    throw error;
  }
};

export const addReminder = async (reminder: Omit<Reminder, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "reminders"), {
      ...reminder,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding reminder: ", error);
    throw error;
  }
};

export const toggleReminderStatus = async (reminderId: string, currentStatus: boolean) => {
  try {
    const reminderRef = doc(db, "reminders", reminderId);
    await updateDoc(reminderRef, {
      completed: !currentStatus,
    });
  } catch (error) {
    console.error("Error updating reminder status: ", error);
    throw error;
  }
};

export const deleteReminder = async (reminderId: string) => {
  try {
    await deleteDoc(doc(db, "reminders", reminderId));
  } catch (error) {
    console.error("Error deleting reminder: ", error);
    throw error;
  }
};