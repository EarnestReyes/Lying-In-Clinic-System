export interface CareTask {
  id: string;
  label: string;
  category: string;
  done: boolean;
  review: 'Pending' | 'Reviewed' | 'Needs attention';
  reviewedBy: string;
}
export interface CarePlan { companion: string; emergencyContact: string; transport: string; preferences: string }
export const emptyCarePlan: CarePlan = { companion: '', emergencyContact: '', transport: '', preferences: '' };
export interface CareQuestion { id: string; text: string; answer?: string; status?: string }
export interface CareRecap { id: string; visitDate: string; summary: string; instructions: string; nextVisit: string; approvedBy?: string }
export interface CompanionShare {
  id: string; patientId: string; companionId: string; patientName: string;
  preparation: { id: string; label: string; done: boolean }[];
  reminders: { id: string; title: string; date: string; time: string }[];
  updatedAt?: { toDate(): Date };
}
export const passportTasks: CareTask[] = [
  ['identity', 'Prepare identification and clinic documents', 'Documents'],
  ['consent', 'Discuss required consent forms with the clinic', 'Documents'],
  ['results', 'Prepare results requested by your midwife', 'Documents'],
  ['bag', 'Pack your personal hospital bag', 'Hospital bag'],
  ['baby', 'Pack your baby’s essentials', 'Hospital bag'],
  ['companion', 'Confirm your birth companion', 'Support plan'],
  ['transport', 'Arrange transport to the clinic', 'Support plan'],
  ['contacts', 'Save your emergency contacts', 'Support plan'],
].map(([id, label, category]) => ({ id, label, category, done: false, review: 'Pending', reviewedBy: '' }));

export function mergePassport(saved: CareTask[]): CareTask[] {
  const merged = new Map(passportTasks.map(task => [task.id, { ...task }]));
  saved.forEach(task => merged.set(task.id, task));
  return [...merged.values()];
}
export function preparationProgress(tasks: CareTask[]): number {
  return tasks.length ? Math.round(tasks.filter(task => task.done).length / tasks.length * 100) : 0;
}
/** Whitelist shared fields: no contact details, preferences, questions or clinical notes. */
export function companionSnapshot(tasks: CareTask[], taskIds: string[], reminders: { id?: string; title: string; date: string; time: string }[], reminderIds: string[]) {
  return {
    preparation: tasks.filter(task => taskIds.includes(task.id)).map(({ id, label, done }) => ({ id, label, done })),
    reminders: reminders.filter(item => item.id && reminderIds.includes(item.id)).map(item => ({ id: item.id!, title: item.title, date: item.date, time: item.time })),
  };
}
