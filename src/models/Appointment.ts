export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export interface Appointment {
  id: string;

  patientId: string;
  patientName: string;

  appointmentDate: string;
  appointmentTime: string;

  purpose: string;

  status: AppointmentStatus;

  notes?: string;

  createdAt?: any;
  updatedAt?: any;
}