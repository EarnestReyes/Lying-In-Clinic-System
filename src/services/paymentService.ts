import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { Payment } from "../models/Payment";

const paymentsCollection = collection(db, "payments");

export async function getPayments(): Promise<Payment[]> {
  const q = query(
    paymentsCollection,
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Payment[];
}

export async function createPayment(
  payment: Omit<Payment, "id" | "createdAt">
) {
  return await addDoc(paymentsCollection, {
    ...payment,
    createdAt: serverTimestamp(),
  });
}

export async function updatePayment(
  paymentId: string,
  data: Partial<Payment>
) {
  await updateDoc(
    doc(db, "payments", paymentId),
    data
  );
}