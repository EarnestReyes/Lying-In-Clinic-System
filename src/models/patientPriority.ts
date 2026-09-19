/** Administrative workflow support only; never a clinical assessment. */
export type PatientPriorityLevel = 'high' | 'moderate' | 'routine';

export interface PatientPriority {
  level: PatientPriorityLevel;
  label: 'High Attention' | 'Moderate Attention' | 'Routine';
  reason: string;
  relevantInfo?: string;
}
