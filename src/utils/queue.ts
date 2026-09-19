import type { Appointment } from '../models/Appointment';

export type QueueStatus = 'Waiting' | 'In Consultation' | 'Completed' | 'No-show';
export interface QueueTicket {
  id: string;
  day: string;
  status: QueueStatus;
  checkedInAt: { toMillis(): number; toDate(): Date } | null;
}
export interface QueueEntry extends QueueTicket {
  patientId: string;
  patientName: string;
  appointmentTime: string;
  purpose: string;
}
export const CHECK_IN_URL = 'lyinginsystem://check-in';
export function clinicDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function appointmentDay(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Legacy appointments store a human-readable calendar date, not an instant.
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function canCheckIn(appointment: Appointment, day = clinicDay()): boolean {
  return appointmentDay(appointment.appointmentDate || appointment.date || '') === day &&
    ['confirmed', 'scheduled', 'queue'].includes(String(appointment.status).toLowerCase());
}
export function waitingQueue<T extends QueueTicket>(tickets: T[]): T[] {
  return tickets.filter(ticket => ticket.status === 'Waiting' && ticket.checkedInAt).sort((a, b) =>
    a.checkedInAt!.toMillis() - b.checkedInAt!.toMillis() || a.id.localeCompare(b.id));
}
export function canTransition(from: QueueStatus, to: QueueStatus): boolean {
  return (from === 'Waiting' && (to === 'In Consultation' || to === 'No-show')) ||
    (from === 'In Consultation' && to === 'Completed');
}
