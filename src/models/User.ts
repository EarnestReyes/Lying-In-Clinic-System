export type UserRole = "admin" | "staff" | "patient";

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  createdAt?: any;
}