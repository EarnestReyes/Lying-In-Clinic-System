export interface PrenatalVisit {
  id?: string;
  visitNo: string;
  date: string;
  bp: string;
  weight: string;
  heightCm?: number | null;
  bmi?: number | null;
  fhb?: string;
  gestationalAge?: string;
  notes?: string;
  createdAt?: any;
}

export interface MedicalHistoryEntry {
  id?: string;
  title: string;
  date: string;
  notes: string;
  createdAt?: any;
}

