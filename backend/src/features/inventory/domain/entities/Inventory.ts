export interface StockBatch {
  id?: string;
  ingredientId: string;
  ingredientName: string;
  batchNumber: string;
  receivedDate: string | Date;
  expiryDate?: string | Date;
  initialQuantity: number;
  remainingQuantity: number;
  unit: string;
  costPerUnit: number;
  packCost?: number;
  supplierName?: string;
  invoiceNumber?: string;
  notes?: string;
  status: 'active' | 'depleted' | 'expired' | 'discarded';
}

export interface IngredientStock {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  lowStockAlert: number;
  costPerUnit?: number;
  packCount?: number;
  packSize?: number;
  packCost?: number;
  supplier?: {
    name: string;
    contact: string;
    email: string;
  };
  batches?: StockBatch[];
}

export interface SpoilageRecord {
  id?: string;
  ingredientId: string;
  ingredientName: string;
  amount: number;
  unit: string;
  cost: number;
  reason: 'expired' | 'spilled' | 'damaged' | 'quality_defect';
  timestamp: string | Date;
  loggedBy: string;
}
