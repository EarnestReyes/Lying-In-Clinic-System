import {
  collection,
  collectionGroup,
  doc,
  DocumentData,
  getDoc,
  onSnapshot,
  QueryDocumentSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import {
  PATIENT_DOCUMENT_CATEGORIES,
  PatientDocument,
  PatientDocumentInput,
  PatientDocumentStatus,
  UploadFile,
} from '../models/patientDocument';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const supportedTypes: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

function supportedMimeType(file: UploadFile) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const expected = supportedTypes[extension];
  if (!expected) throw new Error('Choose a PDF, JPG, JPEG or PNG file.');
  if (file.mimeType && ![expected, 'application/octet-stream'].includes(file.mimeType.toLowerCase())) {
    throw new Error('The selected file type does not match its filename.');
  }
  return expected;
}

function cleanFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return cleaned.slice(-180) || 'document';
}

function timestampMillis(value: unknown) {
  return typeof (value as { toMillis?: unknown })?.toMillis === 'function'
    ? (value as { toMillis(): number }).toMillis()
    : 0;
}

function mapDocument(snapshot: QueryDocumentSnapshot<DocumentData>): PatientDocument {
  const data = snapshot.data();
  const status = (data.status || data.reviewStatus || 'pending') as PatientDocumentStatus;
  return {
    id: snapshot.id,
    patientId: String(data.patientId || snapshot.ref.parent.parent?.id || ''),
    patientName: String(data.patientName || 'Patient'),
    title: String(data.title || data.documentName || 'Untitled document'),
    category: String(data.category || data.documentType || 'Other'),
    description: String(data.description || ''),
    fileName: String(data.fileName || data.documentName || 'Document'),
    fileType: String(data.fileType || ''),
    fileUrl: String(data.fileUrl || data.fileURL || ''),
    storagePath: String(data.storagePath || ''),
    status,
    submittedAt: data.submittedAt || data.uploadedAt || null,
    reviewedAt: data.reviewedAt || null,
    reviewedBy: data.reviewedBy || null,
    reviewerName: data.reviewerName || null,
    rejectionReason: String(data.rejectionReason || (status === 'rejected' ? data.reviewNotes || '' : '')),
  };
}

function sortNewest(documents: PatientDocument[]) {
  return documents.sort((a, b) => timestampMillis(b.submittedAt) - timestampMillis(a.submittedAt));
}

export async function uploadPatientFile(patientId: string, file: UploadFile, path: string, progress: (value: number) => void) {
  if (auth.currentUser?.uid !== patientId) throw new Error('Please sign in to your patient account.');
  const contentType = supportedMimeType(file);
  if (file.size !== undefined && (file.size <= 0 || file.size > MAX_FILE_SIZE)) throw new Error('Choose a nonempty file smaller than 10 MB.');
  const response = await fetch(file.uri);
  if (!response.ok) throw new Error('The selected file could not be read. Please choose it again.');
  const blob = await response.blob();
  if (!blob.size || blob.size > MAX_FILE_SIZE) throw new Error('Choose a nonempty file smaller than 10 MB.');
  const target = ref(storage, path);
  try {
    const task = uploadBytesResumable(target, blob, { contentType });
    await new Promise<void>((resolve, reject) => task.on(
      'state_changed',
      state => progress(Math.round(100 * state.bytesTransferred / state.totalBytes)),
      reject,
      resolve,
    ));
    return await getDownloadURL(target);
  } finally {
    (blob as Blob & { close?: () => void }).close?.();
  }
}

export async function uploadPatientDocument(
  patientName: string,
  input: PatientDocumentInput,
  file: UploadFile,
  progress: (value: number) => void,
) {
  const patientId = auth.currentUser?.uid;
  if (!patientId) throw new Error('Please sign in again.');
  const title = input.title.trim();
  const description = input.description?.trim() || '';
  if (!title) throw new Error('Enter a document title.');
  if (title.length > 160) throw new Error('Document title must be 160 characters or fewer.');
  if (!PATIENT_DOCUMENT_CATEGORIES.includes(input.category)) throw new Error('Choose a valid document category.');
  if (description.length > 1000) throw new Error('Description must be 1,000 characters or fewer.');
  const fileType = supportedMimeType(file);
  const target = doc(collection(db, 'care', patientId, 'documents'));
  const storagePath = `patients/${patientId}/documents/${target.id}/${cleanFileName(file.name)}`;
  const fileUrl = await uploadPatientFile(patientId, file, storagePath, progress);
  try {
    await setDoc(target, {
      patientId,
      patientName: patientName.trim() || 'Patient',
      title,
      category: input.category,
      description,
      fileName: file.name,
      fileType,
      fileUrl,
      storagePath,
      status: 'pending',
      submittedAt: serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      reviewerName: null,
      rejectionReason: '',
    });
  } catch (error) {
    await deleteObject(ref(storage, storagePath)).catch(() => undefined);
    throw error;
  }
}

export function subscribePatientDocuments(patientId: string, receive: (documents: PatientDocument[]) => void, fail: (error: Error) => void) {
  if (auth.currentUser?.uid !== patientId) {
    fail(new Error('You can only view your own documents.'));
    return () => undefined;
  }
  return onSnapshot(collection(db, 'care', patientId, 'documents'), snapshot => {
    receive(sortNewest(snapshot.docs.map(mapDocument)));
  }, fail);
}

export function subscribeAllPatientDocuments(receive: (documents: PatientDocument[]) => void, fail: (error: Error) => void) {
  return onSnapshot(collectionGroup(db, 'documents'), snapshot => {
    receive(sortNewest(snapshot.docs.map(mapDocument)));
  }, fail);
}

async function reviewer() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in again.');
  const profile = await getDoc(doc(db, 'users', user.uid));
  const role = profile.data()?.role;
  if (!['admin', 'staff', 'midwife'].includes(role)) throw new Error('Staff access required.');
  return { uid: user.uid, name: String(profile.data()?.fullName || user.displayName || user.email || 'Clinic staff') };
}

async function reviewPatientDocument(document: PatientDocument, status: Exclude<PatientDocumentStatus, 'pending'>, reason = '') {
  const staff = await reviewer();
  const rejectionReason = reason.trim();
  if (status === 'rejected' && !rejectionReason) throw new Error('Enter a rejection reason.');
  if (rejectionReason.length > 1000) throw new Error('Rejection reason must be 1,000 characters or fewer.');
  await runTransaction(db, async transaction => {
    const target = doc(db, 'care', document.patientId, 'documents', document.id);
    const snapshot = await transaction.get(target);
    if (!snapshot.exists()) throw new Error('This document no longer exists.');
    const currentStatus = snapshot.data().status || snapshot.data().reviewStatus || 'pending';
    if (currentStatus !== 'pending') throw new Error('This document has already been reviewed.');
    transaction.update(target, {
      status,
      reviewedAt: serverTimestamp(),
      reviewedBy: staff.uid,
      reviewerName: staff.name,
      rejectionReason: status === 'rejected' ? rejectionReason : '',
    });
  });
}

export const approvePatientDocument = (document: PatientDocument) => reviewPatientDocument(document, 'approved');
export const rejectPatientDocument = (document: PatientDocument, reason: string) => reviewPatientDocument(document, 'rejected', reason);
