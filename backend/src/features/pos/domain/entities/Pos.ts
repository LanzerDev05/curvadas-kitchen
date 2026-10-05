export type TableStatus = 'vacant' | 'occupied' | 'billing' | 'reserved' | 'cleaning';

export interface RestaurantTable {
  id?: string;
  tableNumber: string;
  label?: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  seatedAt?: string | Date;
}

export interface ZReadAudit {
  id?: string;
  date: string;
  cashSales: number;
  ewalletSales: number;
  cardSales: number;
  totalGross: number;
  discountTotal: number;
  voidCount: number;
  expectedCash: number;
  actualCashCount: number;
  discrepancy: number;
  closedBy: string;
  timestamp?: string | Date;
}
