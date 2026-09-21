export type SupportRequestStatus = 'pending' | 'completed';

export interface SupportRequest {
  id?: string;
  patientUid: string;
  message: string;
  sender?: 'patient' | 'staff';
  status: SupportRequestStatus;
  createdAt?: any;
  updatedAt?: any;
}