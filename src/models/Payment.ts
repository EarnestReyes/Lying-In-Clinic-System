export type PaymentStatus = "pending" | "paid" | "cancelled";

export interface Payment {
  id: string;

  patientId: string;
  patientName: string;

  amount: number;
  description: string;

  status: PaymentStatus;

  paymentDate?: string;

  createdAt?: any;
}