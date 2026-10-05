export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
export type OrderType = 'dine_in' | 'takeout' | 'delivery';
export type PaymentMethod = 'cash' | 'cod' | 'ewallet' | 'card';

export interface OrderItem {
  id?: string;
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalUnitPrice: number;
  selectedOptions?: Array<{ optionTitle: string; choice: { id?: string; name: string; price: number } }>;
  specialInstructions?: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  orderType?: 'delivery' | 'pickup' | 'dine_in';
  tableNumber?: string;
  pickupTime?: string;
  deliveryTime?: string;
  scheduleType?: 'asap' | 'scheduled';
  latitude?: number;
  longitude?: number;
}

export interface OrderLog {
  status: OrderStatus;
  timestamp: string | Date;
  note?: string;
}

export interface Order {
  id?: string;
  queueNumber: number;
  orderType: OrderType;
  tableNumber?: string;
  customer: CustomerInfo;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'unpaid' | 'paid';
  amountTendered?: number;
  changeAmount?: number;
  status: OrderStatus;
  logs: OrderLog[];
  cookedItemIds?: string[];
  startedItemIds?: string[];
  confirmedItemIds?: string[];
  cookedBy?: string;
  cookingStartTime?: string | Date;
  estimatedPrepTime?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
