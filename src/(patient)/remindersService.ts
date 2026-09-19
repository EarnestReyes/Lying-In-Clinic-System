import { db } from '../../src/config/firebase'; // Adjust path to your firebase config if needed
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
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

/** Keeps the patient portal in sync when staff add, update, or remove a reminder. */
export const subscribeRemindersForPatient = (
  patientUid: string,
  onUpdate: (reminders: Reminder[]) => void,
  onError: (error: Error) => void,
) => {
  const remindersQuery = query(collection(db, 'reminders'), where('patientUid', '==', patientUid));
  return onSnapshot(remindersQuery, (snapshot) => {
    onUpdate(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Reminder)));
  }, (error) => onError(error));
};

/** Used by staff/admin to send a reminder that is visible in the patient's portal. */
export const sendReminderToPatient = async (reminder: Omit<Reminder, 'id' | 'completed'>, senderId?: string) => {
  return addReminder({
    ...reminder,
    patientId: reminder.patientId || reminder.patientUid,
    createdBy: senderId,
    completed: false,
  });
};
