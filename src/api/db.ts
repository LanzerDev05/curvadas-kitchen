import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { MENU_ITEMS } from '../data/menu';
import { MenuItem, IngredientStock, Order, GroupOrderSession, UserAccount, PromoVoucher, SpoilageRecord, StaffShift, ZReadAudit, StockBatch } from '../types';

// Ensure environment variables from .env.local and .env are loaded
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const getRedisConfig = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (
    url &&
    token &&
    !url.includes('YOUR_UPSTASH') &&
    !token.includes('YOUR_UPSTASH') &&
    url.startsWith('http')
  ) {
    return { url, token };
  }
  return null;
};

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
  stockBatches?: StockBatch[];
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
      address: 'Colo, Dinalupihan, Bataan',
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
      address: 'Curvada HQ Colo, Dinalupihan, Bataan',
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
    { id: 'ing-15', name: 'Utensils (Spoon & Fork)', quantity: 500, unit: 'pcs', lowStockAlert: 50, costPerUnit: 1.50 },
    { id: 'ing-16', name: 'Ground Pork Meat', quantity: 5000, unit: 'g', lowStockAlert: 1000, costPerUnit: 0.34 },
    { id: 'ing-17', name: 'Lumpia Wrappers', quantity: 500, unit: 'pcs', lowStockAlert: 50, costPerUnit: 0.50 },
    { id: 'ing-18', name: 'Quickmelt/Cheddar Cheese', quantity: 1000, unit: 'g', lowStockAlert: 200, costPerUnit: 0.35 },
    { id: 'ing-19', name: 'Green Chili (Siling Haba)', quantity: 500, unit: 'g', lowStockAlert: 100, costPerUnit: 0.25 }
  ];

  const seedStockLevels: Record<string, number> = {
    'silog-tapsilog': 25,
    'bento-chicken-katsu': 20,
    'drink-red-tea': 50,
    'silog-lumpiang-shanghai': 30
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
    stockBatches: [],
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

const sanitizeAndMergeDB = (parsed: DatabaseSchema, defaultDB: DatabaseSchema): DatabaseSchema => {
  if (!parsed.menuItems || !Array.isArray(parsed.menuItems)) {
    parsed.menuItems = defaultDB.menuItems;
  }

  if (!parsed.ingredientsInventory || !Array.isArray(parsed.ingredientsInventory)) {
    parsed.ingredientsInventory = defaultDB.ingredientsInventory;
  }

  if (!parsed.stockLevels || Object.keys(parsed.stockLevels).length === 0) {
    parsed.stockLevels = defaultDB.stockLevels;
  }

  if (!parsed.users || !Array.isArray(parsed.users)) parsed.users = defaultDB.users;
  if (!parsed.promoVouchers) parsed.promoVouchers = defaultDB.promoVouchers;
  if (!parsed.spoilageLogs) parsed.spoilageLogs = [];
  if (!parsed.staffShifts) parsed.staffShifts = [];
  if (!parsed.zReadAudits) parsed.zReadAudits = [];
  return parsed;
};

export const readDB = async (): Promise<DatabaseSchema> => {
  const defaultDB = generateDefaultDB();

  // Helper to read local file safely
  const readLocalFile = (): DatabaseSchema => {
    try {
      ensureDbDir();
      if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2), 'utf-8');
        localCache = defaultDB;
        return defaultDB;
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      const merged = sanitizeAndMergeDB(parsed, defaultDB);
      localCache = merged;
      return merged;
    } catch (e) {
      return localCache || defaultDB;
    }
  };

  const redis = getRedisConfig();
  if (redis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(redis.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redis.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['GET', 'curvada_db']),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json && json.result) {
          const parsed = JSON.parse(json.result) as DatabaseSchema;
          const merged = sanitizeAndMergeDB(parsed, defaultDB);
          localCache = merged;
          // Persist latest to local file for fast offline resilience
          try {
            ensureDbDir();
            fs.writeFileSync(DB_FILE, JSON.stringify(merged, null, 2), 'utf-8');
          } catch (e) {}
          return merged;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('Upstash Redis read timed out (>2s), falling back to local database.');
      } else {
        console.warn('Upstash Redis read failed, falling back to local database.', err.message);
      }
    }
  }

  return readLocalFile();
};

export const writeDB = async (data: DatabaseSchema): Promise<void> => {
  localCache = data;

  // 1. ALWAYS write locally first! Ensures zero data loss and instant responses
  try {
    ensureDbDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local database file.', err);
  }

  // 2. Sync to Upstash Redis with a fast timeout (2000ms max) so it NEVER freezes Vite/Node
  const redis = getRedisConfig();
  if (redis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(redis.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redis.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SET', 'curvada_db', JSON.stringify(data)]),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        console.warn('Upstash Redis sync returned non-OK status:', res.status);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('Upstash Redis write timed out (>2s). Local database safely preserved.');
      } else {
        console.warn('Failed to sync to Upstash Redis (offline/network issue). Local database safely preserved.', err.message);
      }
    }
  }
};
