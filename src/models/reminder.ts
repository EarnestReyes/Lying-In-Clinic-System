export interface Reminder {
  id?: string;
  patientUid: string;
  title: string;
  date: string;
  time: string;
  type: 'Medication' | 'Checkup' | 'Lab Test' | 'General';
  completed: boolean;
  createdAt?: any;
  patientId?: string;
  createdBy?: string;
  priority?: 'normal' | 'urgent';
}
