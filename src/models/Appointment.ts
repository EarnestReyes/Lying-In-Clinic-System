export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "Scheduled"
  | "Queue"
  | "Cancelled";

export interface Appointment {
  id: string;

  patientId: string;
  patientUid?: string;
  patientName: string;
  patientContact?: string;

  appointmentDate: string;
  appointmentTime: string;

  purpose: string;
  service?: string;

  status: AppointmentStatus;

  notes?: string;

  /** Legacy field aliases retained while existing records are migrated. */
  date?: string;
  time?: string;

  createdAt?: any;
  updatedAt?: any;
}
