import { addDoc, collection, onSnapshot, query, serverTimestamp, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SupportRequest, SupportRequestStatus } from '../models/SupportRequest';

const supportRequests = collection(db, 'supportRequests');
const toSupportRequest = (item: any): SupportRequest => ({ id: item.id, ...item.data() } as SupportRequest);

export const subscribePatientSupportRequests = (patientUid: string, onUpdate: (requests: SupportRequest[]) => void, onError?: (error: Error) => void) =>
  onSnapshot(query(supportRequests, where('patientUid', '==', patientUid)), (snapshot) => onUpdate(snapshot.docs.map(toSupportRequest)), (error) => onError?.(error));

export const createSupportRequest = async (patientUid: string, message: string) =>
  addDoc(supportRequests, { patientUid, message, status: 'pending' satisfies SupportRequestStatus, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

export const updateSupportRequestStatus = (id: string, status: SupportRequestStatus) =>
  updateDoc(doc(db, 'supportRequests', id), { status, updatedAt: serverTimestamp() });
