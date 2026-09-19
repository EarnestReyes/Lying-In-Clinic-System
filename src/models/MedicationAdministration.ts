export interface MedicationAdministration {
  id: string;
  patientId: string;
  patientUid?: string;
  patientName: string;
  inventoryItemId: string;
  medicationName: string;
  unit: string;
  quantity: number;
  dosage?: string;
  notes?: string;
  administeredAt?: any;
}

