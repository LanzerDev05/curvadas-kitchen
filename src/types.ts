export type Category = 'bento' | 'silog' | 'rice-bowl' | 'drinks';

export interface IngredientStock {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lowStockAlert: number;
  costPerUnit?: number; // Price/cost per unit (e.g. per gram or per pc)
  supplier?: {
    name: string;
    contact: string;
    email: string;
  };
}

export interface MenuOption {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  spicy?: boolean;
  popular?: boolean;
  isAvailable: boolean;
  ingredients?: string[];
  recipeRequirements?: { name: string; amount: number }[];
  customizableOptions?: {
    title: string;
    choices: MenuOption[];
  }[];
  estimatedPrepTime?: number;
  targetMarginPercent?: number; // Desired target profit margin % (e.g. 50%)
  utilityOverhead?: {
    electricity?: number; // Electricity cost per serving (e.g. ₱3.00)
    gas?: number;         // Cooking gas/LPG cost per serving (e.g. ₱2.50)
    water?: number;       // Water cost per serving (e.g. ₱1.00)
    packaging?: number;   // Packaging/misc cost per serving (e.g. ₱2.00)
  };
}

export interface SelectedOption {
  optionTitle: string;
  choice: MenuOption;
}

export interface CartItem {
  id: string; // unique cart item ID (including option hashes)
  menuItem: MenuItem;
  selectedOptions: SelectedOption[];
  quantity: number;
  specialInstructions?: string;
  totalUnitPrice: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled';

export interface OrderLog {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  orderType: 'delivery' | 'pickup';
  tableNumber?: string; // If ordering inside the restaurant
  loyaltyPoints?: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number;
  customer: CustomerInfo;
  paymentMethod: 'cod' | 'ewallet' | 'card';
  status: OrderStatus;
  timestamp: string; // ISO string
  logs: OrderLog[];
  isGroupOrder?: boolean;
  groupSessionId?: string;
  confirmedItemIds?: string[];
  cookingStartTime?: string;
  estimatedPrepTime?: number;
  cookedItemIds?: string[];
  startedItemIds?: string[];
  cookedBy?: string;
}

export interface GroupMember {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
}

export interface GroupCartItem {
  id: string; // unique item id inside the group cart
  memberId: string;
  memberName: string;
  menuItem: MenuItem;
  selectedOptions: SelectedOption[];
  quantity: number;
  specialInstructions?: string;
  totalUnitPrice: number;
}

export interface GroupOrderSession {
  id: string; // e.g. GR-93F2
  hostId: string;
  hostName: string;
  status: 'active' | 'completed' | 'cancelled';
  members: GroupMember[];
  items: GroupCartItem[];
  createdAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  role: 'customer' | 'kitchen' | 'admin';
  createdAt: string;
  loyaltyPoints?: number;
}

export interface PromoVoucher {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // % or PHP
  minSpend: number;
  isActive: boolean;
}

export interface SpoilageRecord {
  id: string;
  ingredientId: string;
  ingredientName: string;
  amount: number;
  unit: string;
  cost: number;
  reason: 'expired' | 'spilled' | 'damaged' | 'quality_defect';
  timestamp: string;
  loggedBy: string;
}

export interface StaffShift {
  id: string;
  staffName: string;
  role: string;
  clockIn: string;
  clockOut?: string;
  hourlyRate: number;
  totalHours?: number;
  totalEarned?: number;
}

export interface ZReadAudit {
  id: string;
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
  timestamp: string;
}



