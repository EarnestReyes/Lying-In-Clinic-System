import { addDoc, collection, onSnapshot, query, serverTimestamp, updateDoc, doc, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SupportRequest, SupportRequestStatus } from '../models/SupportRequest';

// Re-export the type so it can be imported by components from this service file
export type { SupportRequest, SupportRequestStatus };

const supportRequests = collection(db, 'supportRequests');
const toSupportRequest = (item: any): SupportRequest => ({ id: item.id, ...item.data() } as SupportRequest);

export const subscribePatientSupportRequests = (patientUid: string, onUpdate: (requests: SupportRequest[]) => void, onError?: (error: Error) => void) =>
  onSnapshot(query(supportRequests, where('patientUid', '==', patientUid)), (snapshot) => onUpdate(snapshot.docs.map(toSupportRequest)), (error) => onError?.(error));

export const createSupportRequest = async (patientUid: string, message: string) =>
  addDoc(supportRequests, { 
    patientUid, 
    message, 
    sender: 'patient', 
    status: 'pending' satisfies SupportRequestStatus, 
    createdAt: serverTimestamp(), 
    updatedAt: serverTimestamp() 
  });

export const updateSupportRequestStatus = (id: string, status: SupportRequestStatus) =>
  updateDoc(doc(db, 'supportRequests', id), { status, updatedAt: serverTimestamp() });

// --- Staff Chat Console Functions ---

export const subscribeAllSupportRequests = (onUpdate: (requests: SupportRequest[]) => void, onError?: (error: Error) => void) => {
  const q = query(supportRequests, orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    onUpdate(snapshot.docs.map(toSupportRequest));
  }, (error) => onError?.(error));
};

export const sendStaffSupportReply = async (patientUid: string, message: string) => {
  return await addDoc(supportRequests, {
    patientUid,
    message,
    sender: 'staff',
    status: 'completed' satisfies SupportRequestStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};