import { Appointment } from '../models/Appointment';

/** Clinic appointments use Philippine local time, including on devices abroad. */
export function appointmentMillis(item: Pick<Appointment, 'appointmentDate' | 'appointmentTime' | 'date' | 'time'>) {
  const date = item.appointmentDate || item.date || '';
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00+08:00` : date);
  if (!Number.isFinite(parsed.getTime())) return NaN;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) return NaN;
  const parts = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$/i.exec(item.appointmentTime || item.time || '');
  if (!parts) return NaN;
  let hour = Number(parts[1]); const minute = Number(parts[2]);
  if (minute > 59 || hour > (parts[3] ? 12 : 23) || (parts[3] && hour < 1)) return NaN;
  if (parts[3]) hour = hour % 12 + (parts[3].toUpperCase() === 'PM' ? 12 : 0);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  return Date.parse(`${day}T${String(hour).padStart(2, '0')}:${parts[2]}:00+08:00`);
}

export function canPatientChange(item: Appointment, status: 'confirmed' | 'cancelled', now = Date.now()) {
  const current = String(item.status).toLowerCase();
  return appointmentMillis(item) > now && (status === 'confirmed' ? ['pending', 'scheduled'] : ['pending', 'scheduled', 'confirmed']).includes(current);
}
