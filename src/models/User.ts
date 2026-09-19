export type UserRole = "admin" | "staff" | "midwife" | "patient" | "companion";

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  createdAt?: any;
}
