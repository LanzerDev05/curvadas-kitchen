export type Category = 'bento' | 'silog' | 'rice-bowl' | 'drinks';

export interface StockBatch {
  id: string;
  ingredientId: string;
  ingredientName: string;
  batchNumber: string; // e.g. "LOT-20261001-01"
  receivedDate: string; // ISO date / timestamp (used for FIFO sorting - oldest first)
  expiryDate?: string; // ISO date (for spoilage / expiration tracking)
  initialQuantity: number; // Original received quantity
  remainingQuantity: number; // Remaining stock available in this batch
  unit: string; // 'g', 'kg', 'pcs', 'ml', 'cans', etc.
  costPerUnit: number; // Unit purchase price for this batch (e.g. ₱0.25/g)
  packCost?: number; // Total cost paid for the pack / purchase
  supplierName?: string;
  invoiceNumber?: string;
  notes?: string;
  status: 'active' | 'depleted' | 'expired' | 'discarded';
}

export interface IngredientStock {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lowStockAlert: number;
  costPerUnit?: number; // Price/cost per unit (e.g. per gram or per pc)
  packCount?: number;   // Number of bulk packs / cans count (e.g. 60)
  packSize?: number;    // Size per pack (e.g. 30g)
  packCost?: number;    // Purchase cost per pack (e.g. ₱10)
  supplier?: {
    name: string;
    contact: string;
    email: string;
  };
  batches?: StockBatch[]; // FIFO batch history & current active lots
}

export interface FIFOConsumptionLayer {
  batchId: string;
  batchNumber: string;
  receivedDate: string;
  costPerUnit: number;
  quantityUsed: number;
  layerCost: number;
}

export interface FIFODishCostResult {
  totalCost: number;
  profit: number;
  marginPercent: number;
  baseCost: number;
  costVariancePercent?: number; // % change compared to base/reference cost
  isMarginSqueezed?: boolean;
  layers: {
    ingredientName: string;
    amountRequired: number;
    unit: string;
    totalIngredientCost: number;
    effectiveUnitCost: number;
    batchesUsed: FIFOConsumptionLayer[];
  }[];
}

export interface StockLossReport {
  totalExpiredLossCost: number;
  totalSpoilageLossCost: number;
  totalVarianceLossCost: number;
  totalCombinedLossCost: number;
  expiredBatchesCount: number;
  expiringSoonBatchesCount: number;
  activeBatchesCount: number;
  depletedBatchesCount: number;
}

export interface MenuOption {
  id: string;
  name: string;
  price: number;
  isDefault?: boolean;
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
  batchIngredients?: { name: string; batchAmount: number; unit: string; cost?: number }[];
  garnishes?: Array<{ name: string; amount: number; unit?: string; costPerUnit?: number; selected: boolean }>;
  packaging?: Array<{ name: string; amount: number; unit?: string; costPerUnit?: number; selected: boolean }>;
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
  batchYieldGrams?: number;   // Total batch yield weight/quantity (e.g. 1000g for 1kg, 2000g for 2kg, or 100 for 100pcs)
  batchYieldUnit?: 'g' | 'pcs'; // Unit for batch yield ('g' or 'pcs')
  servingSizeGrams?: number;  // Portion/serving weight/count (e.g. 80g, 90g, or 4pcs)
  servingSizeUnit?: 'g' | 'pcs'; // Unit for portion/serving size ('g' or 'pcs')
  totalBatchCost?: number;    // Overall raw materials batch cost (e.g. ₱3,000)
  includeRice?: boolean;      // Whether this plate/dish includes steamed rice
  ricePortionGrams?: number;  // Steamed rice portion weight in grams per serving (e.g. 150g, 180g, 200g)
  riceCostPerGram?: number;   // Cost per cooked steamed rice gram (e.g. ₱0.04/g)
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
  pickupTime?: string; // Target or estimated pickup time for pickup orders
  deliveryTime?: string; // Target or scheduled delivery date & time for delivery orders
  scheduleType?: 'asap' | 'scheduled'; // Fulfillment timing preference: 'asap' or 'scheduled'
  loyaltyPoints?: number;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  isLocationVerified?: boolean;
  isFirstTimeCustomer?: boolean;
}

export interface Order {
  id: string;
  queueNumber?: number; // Daily sequential queue priority number
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
  orderSource?: 'online' | 'walkin' | 'messenger';
  amountTendered?: number;
  changeAmount?: number;
  isFirstTimeCod?: boolean;
  isLocationVerified?: boolean;
  isBogusRisk?: boolean;
  confirmationCallStatus?: 'pending' | 'confirmed' | 'unreachable' | 'rejected';
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

export interface StaffMember {
  id: string;
  name: string;
  role: 'Head Chef' | 'Line Cook' | 'Kitchen Crew' | 'Cashier' | 'Dispatcher' | 'Rider' | 'Store Manager';
  stationTask: string;
  isOnDuty: boolean;
  isDefaultLeadChef?: boolean;
  hourlyRate: number;
  phone?: string;
  clockInTime?: string;
}

export interface StaffAdvance {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  reason: string;
  date: string;
  isDeducted: boolean;
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  periodStart: string;
  periodEnd: string;
  hourlyRate: number;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
  bonusTips: number;
  cashAdvanceDeduction: number;
  otherDeductions: number;
  netPay: number;
  status: 'paid' | 'pending';
  paidAt?: string;
  notes?: string;
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



