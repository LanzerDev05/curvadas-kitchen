export type Category = 'bento' | 'silog' | 'rice-bowl' | 'drinks';

export interface IngredientStock {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lowStockAlert: number;
  costPerUnit?: number; // Price/cost per unit (e.g. per gram or per pc)
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

