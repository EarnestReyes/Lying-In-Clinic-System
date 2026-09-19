export type SupportRequestStatus = 'pending' | 'in_progress' | 'completed';

export interface SupportRequest {
  id: string;
  patientUid: string;
  message: string;
  status: SupportRequestStatus;
  createdAt?: any;
  updatedAt?: any;
}

