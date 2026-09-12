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

// Generate the initial seed database (Starts clean with 0 ingredients/dishes/orders, retaining accounts)
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

  return {
    menuItems: [],
    ingredientsInventory: [],
    stockLevels: {},
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
      salesPace: 0,
      electricityBaseRate: 0,
      electricityVariableRate: 0,
      waterBaseRate: 0,
      rentBaseRate: 0,
      laborBaseRate: 0,
      gasBaseRate: 0,
      otherBaseRate: 0,
      targetSalesDay: 0,
      targetSalesWeek: 0,
      targetSalesMonth: 0,
      targetSalesYear: 0,
      targetProfitDay: 0,
      targetProfitWeek: 0,
      targetProfitMonth: 0,
      targetProfitYear: 0,
      financesPeriod: 'day',
      expenseInputMode: 'monthly'
    }
  };
};

export const readDB = async (): Promise<DatabaseSchema> => {
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
          if (!parsed.users || !Array.isArray(parsed.users)) {
            parsed.users = generateDefaultDB().users;
          }
          if (!parsed.promoVouchers) parsed.promoVouchers = generateDefaultDB().promoVouchers;
          if (!parsed.spoilageLogs) parsed.spoilageLogs = [];
          if (!parsed.staffShifts) parsed.staffShifts = [];
          if (!parsed.zReadAudits) parsed.zReadAudits = [];
          localCache = parsed;
          return parsed;
        }
        const defaultData = generateDefaultDB();
        await writeDB(defaultData);
        return defaultData;
      }
    } catch (err) {
      console.error('Failed to read database from Upstash Redis, using cache/file.', err);
      if (localCache) return localCache;
    }
  }

  try {
    ensureDbDir();
    if (!fs.existsSync(DB_FILE)) {
      const defaultData = generateDefaultDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      localCache = defaultData;
      return defaultData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed.users || !Array.isArray(parsed.users)) {
      parsed.users = generateDefaultDB().users;
    }
    if (!parsed.promoVouchers) parsed.promoVouchers = generateDefaultDB().promoVouchers;
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
