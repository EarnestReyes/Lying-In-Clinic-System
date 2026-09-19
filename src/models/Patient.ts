export interface Patient {
  id: string;
  /** Canonical display name used by current Firestore patient records. */
  name: string;
  email?: string;
  uid?: string;
  fullName?: string;
  contactNumber?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  dob?: string;
  age?: string | number | null;
  bloodType?: string;
  gravidaPara?: string;
  pregnancyWeek?: string | number | null;
  edd?: string;
  weight?: string | number;
  height?: string | number;
  heightCm?: number;
  bloodPressure?: string;
  bp?: string;
  fhb?: string;
  address?: string;
  status?: 'Routine' | 'Follow-up' | 'Review Required' | 'Active' | string;
  flagColor?: string;
  assignedMidwife?: string;
  profileImage?: string;
  emergencyContact?: string;
  registeredAt?: any;
  admissionDate?: string;
  deliveryDate?: string;
  lastVisit?: string;
  date?: string;
  notes?: string;
  prenatalVisits?: any[];
  medicalHistory?: any[];
  financialRecords?: any[];
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export type PatientInput = Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>;
