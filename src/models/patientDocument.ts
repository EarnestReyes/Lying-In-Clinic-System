import { Timestamp } from 'firebase/firestore';

export const PATIENT_DOCUMENT_CATEGORIES = [
  'Medical Certificate',
  'Laboratory Result',
  'Ultrasound Result',
  'PhilHealth Document',
  'Valid ID',
  'Referral',
  'Prescription',
  'Other',
] as const;

export type PatientDocumentCategory = typeof PATIENT_DOCUMENT_CATEGORIES[number];
export type PatientDocumentStatus = 'pending' | 'approved' | 'rejected';

export interface PatientDocument {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  category: string;
  description: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  storagePath: string;
  status: PatientDocumentStatus;
  submittedAt: Timestamp | null;
  reviewedAt: Timestamp | null;
  reviewedBy: string | null;
  reviewerName: string | null;
  rejectionReason: string;
}

export interface PatientDocumentInput {
  title: string;
  category: PatientDocumentCategory;
  description?: string;
}

export interface UploadFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}
