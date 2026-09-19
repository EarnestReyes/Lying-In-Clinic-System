import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { PatientPriority, PatientPriorityLevel } from '../models/patientPriority';

type PriorityPatient = { id: string; uid?: string; name?: string; status?: string };
type PriorityAppointment = { patientId?: string; patientUid?: string; patientName?: string; appointmentDate?: unknown; appointmentTime?: string; purpose?: string; service?: string; type?: string; status?: string };
type PriorityReminder = { patientId?: string; patientUid?: string; date?: unknown; time?: string; title?: string; type?: string; completed?: boolean; status?: string };

function dateAtLocalMidnight(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as any).toDate === 'function') {
    const date = (value as any).toDate();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function formatDate(value: unknown): string {
  const date = dateAtLocalMidnight(value);
  return date ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : String(value || 'an unspecified date');
}

function isOpen(status?: string): boolean {
  return !['completed', 'cancelled', 'canceled', 'done', 'resolved'].includes((status || '').trim().toLowerCase());
}

function patientMatches(record: { patientId?: string; patientUid?: string; patientName?: string }, patient: PriorityPatient): boolean {
  const identifiers = [patient.id, patient.uid].filter(Boolean);
  if (identifiers.includes(record.patientId) || identifiers.includes(record.patientUid)) return true;
  // Legacy appointments may only have a name; new records should use a patient ID.
  return !record.patientId && !record.patientUid && !!patient.name && record.patientName === patient.name;
}

function result(level: PatientPriorityLevel, reason: string, relevantInfo?: string): PatientPriority {
  return { level, label: level === 'high' ? 'High Attention' : level === 'moderate' ? 'Moderate Attention' : 'Routine', reason, relevantInfo };
}

/** Pure deterministic evaluator; a future provider can replace this without changing the patients UI. */
export function evaluatePatientPriority(patient: PriorityPatient, appointments: PriorityAppointment[], reminders: PriorityReminder[], now = new Date()): PatientPriority {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const patientAppointments = appointments.filter((item) => patientMatches(item, patient) && isOpen(item.status));
  const patientReminders = reminders.filter((item) => patientMatches(item, patient) && !item.completed && isOpen(item.status));
  const overdueAppointment = patientAppointments.find((item) => { const date = dateAtLocalMidnight(item.appointmentDate); return date && date < today; });
  if (overdueAppointment) {
    const service = overdueAppointment.purpose || overdueAppointment.service || overdueAppointment.type || 'appointment';
    return result('high', `Missed ${service.toLowerCase()} on ${formatDate(overdueAppointment.appointmentDate)}. Follow-up required.`, `Appointment: ${service}`);
  }
  const overdueReminder = patientReminders.find((item) => { const date = dateAtLocalMidnight(item.date); return date && date < today; });
  if (overdueReminder) return result('high', `Overdue reminder: ${overdueReminder.title || overdueReminder.type || 'pending task'} (${formatDate(overdueReminder.date)}).`, `Reminder: ${overdueReminder.title || overdueReminder.type || 'Pending task'}`);
  const todayAppointment = patientAppointments.find((item) => dateAtLocalMidnight(item.appointmentDate)?.getTime() === today.getTime());
  if (todayAppointment) {
    const service = todayAppointment.purpose || todayAppointment.service || todayAppointment.type || 'Appointment';
    return result('high', `${service} is scheduled for today.`, `Appointment: ${service}${todayAppointment.appointmentTime ? ` at ${todayAppointment.appointmentTime}` : ''}`);
  }
  const upcomingAppointment = patientAppointments.find((item) => { const date = dateAtLocalMidnight(item.appointmentDate); return date && date > today; });
  if (upcomingAppointment) {
    const service = upcomingAppointment.purpose || upcomingAppointment.service || upcomingAppointment.type || 'appointment';
    return result('moderate', `Upcoming ${service.toLowerCase()} on ${formatDate(upcomingAppointment.appointmentDate)}.`, `Appointment: ${service}`);
  }
  const activeReminder = patientReminders.find((item) => { const date = dateAtLocalMidnight(item.date); return !date || date >= today; });
  if (activeReminder) return result('moderate', `Active reminder: ${activeReminder.title || activeReminder.type || 'pending task'}.`, `Due: ${formatDate(activeReminder.date)}${activeReminder.time ? ` at ${activeReminder.time}` : ''}`);
  if (['review required', 'high risk', 'high attention'].includes((patient.status || '').trim().toLowerCase())) {
    return result('high', 'Patient record is marked for administrative review.', 'Administrative review status is pending');
  }
  if ((patient.status || '').trim().toLowerCase() === 'follow-up') return result('moderate', 'Patient record has a pending follow-up.', 'Administrative follow-up is pending');
  return result('routine', 'No overdue appointments, reminders, or pending administrative actions.');
}

export async function getPatientPriorities(patients: PriorityPatient[]): Promise<Record<string, PatientPriority>> {
  const [appointmentSnapshot, reminderSnapshot] = await Promise.all([getDocs(collection(db, 'appointments')), getDocs(collection(db, 'reminders'))]);
  const appointments = appointmentSnapshot.docs.map((item) => item.data() as PriorityAppointment);
  const reminders = reminderSnapshot.docs.map((item) => item.data() as PriorityReminder);
  return patients.reduce<Record<string, PatientPriority>>((priorities, patient) => {
    priorities[patient.id] = evaluatePatientPriority(patient, appointments, reminders);
    return priorities;
  }, {});
}
