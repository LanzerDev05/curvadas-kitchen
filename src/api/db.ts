import fs from 'fs';
import path from 'path';
import { MENU_ITEMS } from '../data/menu';
import { MenuItem, IngredientStock, Order, GroupOrderSession, UserAccount, PromoVoucher, SpoilageRecord, StaffShift, ZReadAudit } from '../types';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const DB_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.resolve(DB_DIR, 'db.json');

const ensureDbDir = () => {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  } catch (e) {}
};

let localCache: DatabaseSchema | null = null;

export interface DatabaseSchema {
  menuItems: MenuItem[];
  ingredientsInventory: IngredientStock[];
  stockLevels: Record<string, number>;
  manualStockOverrides: string[];
  hiddenCategories: string[];
  orders: Order[];
  groupSessions: GroupOrderSession[];
  users: UserAccount[];
  promoVouchers: PromoVoucher[];
  spoilageLogs: SpoilageRecord[];
  staffShifts: StaffShift[];
  zReadAudits: ZReadAudit[];
  settings: {
    salesPace: number;
    electricityBaseRate: number;
    electricityVariableRate: number;
    waterBaseRate: number;
    rentBaseRate: number;
    laborBaseRate: number;
    gasBaseRate: number;
    otherBaseRate: number;
    targetSalesDay: number;
    targetSalesWeek: number;
    targetSalesMonth: number;
    targetSalesYear: number;
    targetProfitDay: number;
    targetProfitWeek: number;
    targetProfitMonth: number;
    targetProfitYear: number;
    financesPeriod: 'day' | 'week' | 'month' | 'year';
    expenseInputMode?: 'monthly' | 'daily';
    monthlyRatesMap?: Record<string, {
      electricityBaseRate: number;
      electricityVariableRate: number;
      waterBaseRate: number;
      rentBaseRate: number;
      laborBaseRate: number;
      gasBaseRate: number;
      otherBaseRate: number;
    }>;
  };
}

// Generate the initial seed database (Includes standard default dishes, ingredients & stock levels)
const generateDefaultDB = (): DatabaseSchema => {
  const seedUsers: UserAccount[] = [
    {
      id: 'usr-lanzer',
      name: 'Lanzer Villarlibo',
      email: 'lanzer@gmail.com',
      phone: '0917-882-9382',
      address: 'Block 3 Lot 15, Springville Homes, Bacoor, Cavite',
      password: 'password123',
      role: 'customer',
      createdAt: new Date().toISOString(),
      loyaltyPoints: 120
    },
    {
      id: 'usr-kitchen-staff',
      name: 'Kitchen Staff',
      email: 'kitchen@curvada.com',
      phone: '0922-000-0001',
      address: 'Curvada Kitchen Station 1',
      password: 'kitchen123',
      role: 'kitchen',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr-admin',
      name: 'Curvada Manager',
      email: 'admin@curvada.com',
      phone: '0922-000-0002',
      address: 'Curvada HQ Cavite',
      password: 'admin123',
      role: 'admin',
      createdAt: new Date().toISOString()
    }
  ];

  const seedVouchers: PromoVoucher[] = [
    {
      id: 'vch-10',
      code: 'WELCOME10',
      discountType: 'percentage',
      discountValue: 10,
      minSpend: 200,
      isActive: true
    },
    {
      id: 'vch-50',
      code: 'CURVADA50',
      discountType: 'fixed',
      discountValue: 50,
      minSpend: 350,
      isActive: true
    }
  ];

  const seedIngredients: IngredientStock[] = [
    { id: 'ing-1', name: 'Premium Beef Tapa', quantity: 3000, unit: 'g', lowStockAlert: 500, costPerUnit: 0.40 },
    { id: 'ing-2', name: 'Sunny-Side-Up Egg', quantity: 200, unit: 'pcs', lowStockAlert: 20, costPerUnit: 7.00 },
    { id: 'ing-3', name: 'Garlic Fried Rice', quantity: 5000, unit: 'g', lowStockAlert: 1000, costPerUnit: 0.08 },
    { id: 'ing-4', name: 'Atchara Pickles', quantity: 2000, unit: 'g', lowStockAlert: 300, costPerUnit: 0.15 },
    { id: 'ing-5', name: 'Crispy Chicken Fillet', quantity: 3000, unit: 'g', lowStockAlert: 500, costPerUnit: 0.35 },
    { id: 'ing-6', name: 'Panko Breadcrumbs', quantity: 2000, unit: 'g', lowStockAlert: 400, costPerUnit: 0.10 },
    { id: 'ing-7', name: 'Japanese Mayo', quantity: 1500, unit: 'g', lowStockAlert: 300, costPerUnit: 0.20 },
    { id: 'ing-8', name: 'Shredded Cabbage', quantity: 2000, unit: 'g', lowStockAlert: 400, costPerUnit: 0.05 },
    { id: 'ing-9', name: 'Steamed Rice', quantity: 5000, unit: 'g', lowStockAlert: 1000, costPerUnit: 0.04 },
    { id: 'ing-10', name: 'Black Tea Leaves', quantity: 1000, unit: 'g', lowStockAlert: 200, costPerUnit: 0.30 },
    { id: 'ing-11', name: 'Sugar Cane Syrup', quantity: 2000, unit: 'g', lowStockAlert: 400, costPerUnit: 0.08 },
    { id: 'ing-12', name: 'Purified Filtered Water', quantity: 10000, unit: 'g', lowStockAlert: 2000, costPerUnit: 0.01 },
    { id: 'ing-13', name: 'Crushed Ice', quantity: 5000, unit: 'g', lowStockAlert: 1000, costPerUnit: 0.02 },
    { id: 'ing-14', name: 'Paper Bowl', quantity: 500, unit: 'pcs', lowStockAlert: 50, costPerUnit: 2.50 },
    { id: 'ing-15', name: 'Utensils (Spoon & Fork)', quantity: 500, unit: 'pcs', lowStockAlert: 50, costPerUnit: 1.50 }
  ];

  const seedStockLevels: Record<string, number> = {
    'silog-tapsilog': 25,
    'bento-chicken-katsu': 20,
    'drink-red-tea': 50
  };

  return {
    menuItems: MENU_ITEMS,
    ingredientsInventory: seedIngredients,
    stockLevels: seedStockLevels,
    manualStockOverrides: [],
    hiddenCategories: [],
    orders: [],
    groupSessions: [],
    users: seedUsers,
    promoVouchers: seedVouchers,
    spoilageLogs: [],
    staffShifts: [],
    zReadAudits: [],
    settings: {
      salesPace: 18,
      electricityBaseRate: 150,
      electricityVariableRate: 3.5,
      waterBaseRate: 40,
      rentBaseRate: 300,
      laborBaseRate: 450,
      gasBaseRate: 80,
      otherBaseRate: 50,
      targetSalesDay: 3500,
      targetSalesWeek: 24500,
      targetSalesMonth: 105000,
      targetSalesYear: 1260000,
      targetProfitDay: 1200,
      targetProfitWeek: 8400,
      targetProfitMonth: 36000,
      targetProfitYear: 432000,
      financesPeriod: 'day',
      expenseInputMode: 'monthly'
    }
  };
};

export const readDB = async (): Promise<DatabaseSchema> => {
  const defaultDB = generateDefaultDB();

  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const res = await fetch(REDIS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REDIS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', 'curvada_db']),
      });
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json && json.result) {
          const parsed = JSON.parse(json.result) as DatabaseSchema;
          if (!parsed.menuItems || parsed.menuItems.length === 0) parsed.menuItems = defaultDB.menuItems;
          if (!parsed.ingredientsInventory || parsed.ingredientsInventory.length === 0) parsed.ingredientsInventory = defaultDB.ingredientsInventory;
          if (!parsed.stockLevels || Object.keys(parsed.stockLevels).length === 0) parsed.stockLevels = defaultDB.stockLevels;
          if (!parsed.users || !Array.isArray(parsed.users)) parsed.users = defaultDB.users;
          if (!parsed.promoVouchers) parsed.promoVouchers = defaultDB.promoVouchers;
          if (!parsed.spoilageLogs) parsed.spoilageLogs = [];
          if (!parsed.staffShifts) parsed.staffShifts = [];
          if (!parsed.zReadAudits) parsed.zReadAudits = [];
          localCache = parsed;
          return parsed;
        }
        await writeDB(defaultDB);
        return defaultDB;
      }
    } catch (err) {
      console.error('Failed to read database from Upstash Redis, using cache/file.', err);
      if (localCache) return localCache;
    }
  }

  try {
    ensureDbDir();
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2), 'utf-8');
      localCache = defaultDB;
      return defaultDB;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed.menuItems || parsed.menuItems.length === 0) parsed.menuItems = defaultDB.menuItems;
    if (!parsed.ingredientsInventory || parsed.ingredientsInventory.length === 0) parsed.ingredientsInventory = defaultDB.ingredientsInventory;
    if (!parsed.stockLevels || Object.keys(parsed.stockLevels).length === 0) parsed.stockLevels = defaultDB.stockLevels;
    if (!parsed.users || !Array.isArray(parsed.users)) parsed.users = defaultDB.users;
    if (!parsed.promoVouchers) parsed.promoVouchers = defaultDB.promoVouchers;
    if (!parsed.spoilageLogs) parsed.spoilageLogs = [];
    if (!parsed.staffShifts) parsed.staffShifts = [];
    if (!parsed.zReadAudits) parsed.zReadAudits = [];
    localCache = parsed;
    return parsed;

  } catch (err) {
    console.error('Failed to read database file, generating default.', err);
    const defaultData = generateDefaultDB();
    localCache = defaultData;
    return defaultData;
  }
};

export const writeDB = async (data: DatabaseSchema): Promise<void> => {
  localCache = data;

  if (REDIS_URL && REDIS_TOKEN) {
    try {
      const res = await fetch(REDIS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${REDIS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SET', 'curvada_db', JSON.stringify(data)]),
      });
      if (res.ok) {
        return;
      }
    } catch (err) {
      console.error('Failed to write database to Upstash Redis.', err);
    }
  }

  try {
    ensureDbDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file.', err);
  }
};
