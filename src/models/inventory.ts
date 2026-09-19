export type InventoryCategory =
  | "Vitamins & Supplements"
  | "Vaccines"
  | "Equipment & Supplies"
  | "PPE & Consumables"
  | "Emergency Medications"
  | string; // Allows flexibility for custom categories

export type StockStatus = "In Stock" | "Low Stock";

export interface InventoryItem {
  id: string;
  itemName: string;
  category: InventoryCategory;
  stock: number;
  unit: string;           // e.g., "tablets", "vials", "boxes", "pairs"
  minThreshold: number;   // Minimum stock level before triggering "Low Stock"
  status?: StockStatus;   // Evaluated dynamically or stored
  statusColor?: string;   // UI hex color for badges
  lastRestocked?: string; // e.g., "Sept 1, 2026" or ISO date string
  createdAt?: any;
  updatedAt?: any;
  isActive?: boolean;
}
