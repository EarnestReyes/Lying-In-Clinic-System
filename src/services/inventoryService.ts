import { db } from '../config/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, increment } from 'firebase/firestore';

export const fetchInventoryItems = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "inventory"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching inventory: ", error);
    return [];
  }
};

export const addInventoryItem = async (itemData: any) => {
  try {
    const docRef = await addDoc(collection(db, "inventory"), itemData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding inventory item: ", error);
    throw error;
  }
};

// New: Restock an item by adding to its current stock and updating the timestamp
export const restockInventoryItem = async (id: string, amountToAdd: number, restockDateStr: string) => {
  try {
    const itemRef = doc(db, "inventory", id);
    await updateDoc(itemRef, {
      stock: increment(amountToAdd),
      lastRestocked: restockDateStr,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error restocking item: ", error);
    throw error;
  }
};

// New: Remove an inventory item completely
export const deleteInventoryItem = async (id: string) => {
  try {
    const itemRef = doc(db, "inventory", id);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error("Error deleting inventory item: ", error);
    throw error;
  }
};