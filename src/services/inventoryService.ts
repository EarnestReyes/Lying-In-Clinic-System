import { db } from '../config/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, runTransaction, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { InventoryItem } from '../models/inventory';

const inventoryCollection = collection(db, 'inventory');
const toInventoryItem = (item: any): InventoryItem => ({ id: item.id, ...item.data() } as InventoryItem);

export const subscribeInventoryItems = (onUpdate: (items: InventoryItem[]) => void, onError?: (error: Error) => void) =>
  onSnapshot(inventoryCollection, (snapshot) => onUpdate(snapshot.docs.map(toInventoryItem)), (error) => onError?.(error));

export const fetchInventoryItems = async () => {
  try {
    const querySnapshot = await getDocs(inventoryCollection);
    return querySnapshot.docs.map(toInventoryItem);
  } catch (error) {
    console.error("Error fetching inventory: ", error);
    return [];
  }
};

export const addInventoryItem = async (itemData: Omit<InventoryItem, 'id' | 'status' | 'statusColor' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(inventoryCollection, { ...itemData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return docRef.id;
  } catch (error) {
    console.error("Error adding inventory item: ", error);
    throw error;
  }
};

// New: Restock an item by adding to its current stock and updating the timestamp
export interface RestockDetails {
  quantity: number;
  restockDate: string;
  supplier?: string;
  batchNumber?: string;
  expirationDate?: string;
}

export const restockInventoryItem = async (id: string, details: RestockDetails) => {
  try {
    const itemRef = doc(db, "inventory", id);
    const historyRef = doc(collection(db, "inventory", id, "restockHistory"));
    await runTransaction(db, async (transaction) => {
      const item = await transaction.get(itemRef);
      if (!item.exists()) throw new Error('Inventory item no longer exists.');
      const currentStock = Number(item.data().stock) || 0;
      transaction.update(itemRef, {
        stock: currentStock + details.quantity,
        lastRestocked: details.restockDate,
        updatedAt: serverTimestamp(),
      });
      transaction.set(historyRef, {
        ...details,
        previousStock: currentStock,
        resultingStock: currentStock + details.quantity,
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error("Error restocking item: ", error);
    throw error;
  }
};

// Archive rather than permanently remove the item, preserving its medication and restock history.
export const deleteInventoryItem = async (id: string) => {
  try {
    const itemRef = doc(db, "inventory", id);
    await updateDoc(itemRef, {
      isActive: false,
      archivedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error deleting inventory item: ", error);
    throw error;
  }
};
