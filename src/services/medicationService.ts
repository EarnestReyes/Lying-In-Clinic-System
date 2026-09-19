import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface MedicationAdministrationInput {
  patientId: string;
  patientName: string;
  inventoryItemId: string;
  quantity: number;
  dosage?: string;
  notes?: string;
}

/** Records administration and inventory usage atomically; stock can never go below zero. */
export async function administerMedication(input: MedicationAdministrationInput): Promise<void> {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('Medication quantity must be greater than zero.');
  }

  const inventoryRef = doc(db, 'inventory', input.inventoryItemId);
  const administrationRef = doc(collection(db, 'medicationAdministrations'));
  const usageRef = doc(collection(db, 'inventory', input.inventoryItemId, 'usageHistory'));

  await runTransaction(db, async (transaction) => {
    const inventorySnapshot = await transaction.get(inventoryRef);
    if (!inventorySnapshot.exists() || inventorySnapshot.data().isActive === false) {
      throw new Error('The selected inventory item is unavailable.');
    }
    const item = inventorySnapshot.data();
    const available = Number(item.stock) || 0;
    if (available < input.quantity) {
      throw new Error(`Insufficient stock. Available quantity: ${available}.`);
    }
    const medicationName = item.itemName || 'Medication';
    const resultingStock = available - input.quantity;
    transaction.update(inventoryRef, { stock: resultingStock, updatedAt: serverTimestamp() });
    const record = {
      patientId: input.patientId,
      patientUid: input.patientId,
      patientName: input.patientName,
      inventoryItemId: input.inventoryItemId,
      medicationName,
      unit: item.unit || 'units',
      quantity: input.quantity,
      dosage: input.dosage || '',
      notes: input.notes || '',
      administeredAt: serverTimestamp(),
    };
    transaction.set(administrationRef, record);
    transaction.set(usageRef, { ...record, previousStock: available, resultingStock, createdAt: serverTimestamp() });
  });
}
