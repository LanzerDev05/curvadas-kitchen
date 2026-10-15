import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { MENU_ITEMS } from '../src/data/menu';

// Load .env.local and .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DB_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.resolve(DB_DIR, 'db.json');
const ROOT_DB_FILE = path.resolve(process.cwd(), 'db.json');

const seedUsers = [
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

const seedVouchers = [
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

// Clean seed inventory including all ingredients referenced by default dishes and templates
const seedIngredients = [
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
  { id: 'ing-19', name: 'Green Chili (Siling Haba)', quantity: 500, unit: 'g', lowStockAlert: 100, costPerUnit: 0.25 },
  // Common ingredients for chicken poppers, sisig, and bentos
  { id: 'ing-20', name: 'Breast Chicken', quantity: 5000, unit: 'g', lowStockAlert: 1000, costPerUnit: 0.16 },
  { id: 'ing-21', name: 'Crispy Tempura / Batter Mix', quantity: 2000, unit: 'g', lowStockAlert: 300, costPerUnit: 0.12 },
  { id: 'ing-22', name: 'Chicken Powder', quantity: 1000, unit: 'g', lowStockAlert: 200, costPerUnit: 0.25 },
  { id: 'ing-23', name: 'Cooking Oil (Deep Fry)', quantity: 5000, unit: 'ml', lowStockAlert: 1000, costPerUnit: 0.08 },
  { id: 'ing-24', name: 'Bento Box with Lid', quantity: 200, unit: 'pcs', lowStockAlert: 30, costPerUnit: 4.50 },
  { id: 'ing-25', name: 'Signature Gravy / Dip', quantity: 100, unit: 'pcs', lowStockAlert: 20, costPerUnit: 3.50 }
];

const seedStockLevels: Record<string, number> = {
  'silog-tapsilog': 25,
  'bento-chicken-katsu': 20,
  'drink-red-tea': 50,
  'silog-lumpiang-shanghai': 30
};

const defaultDB = {
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
    deliveryGasBaseRate: 60,
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

async function runReset() {
  console.log('🚀 Resetting Curvada Kitchen Database to clean factory defaults...');

  // 1. Ensure directory
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // 2. Write local .data/db.json
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2), 'utf-8');
  console.log(`✅ Reset .data/db.json (${DB_FILE})`);

  // 3. Write root db.json
  fs.writeFileSync(ROOT_DB_FILE, JSON.stringify(defaultDB, null, 2), 'utf-8');
  console.log(`✅ Reset root db.json (${ROOT_DB_FILE})`);

  // 4. Sync to Upstash Redis if configured
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (redisUrl && redisToken && !redisUrl.includes('YOUR_UPSTASH') && redisUrl.startsWith('http')) {
    try {
      console.log(`☁️ Syncing reset to Upstash Redis (${redisUrl})...`);
      const res = await fetch(redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SET', 'curvada_db', JSON.stringify(defaultDB)]),
      });
      if (res.ok) {
        console.log('✅ Upstash Redis key "curvada_db" successfully reset!');
      } else {
        console.warn('⚠️ Upstash Redis sync returned status:', res.status);
      }
    } catch (err: any) {
      console.warn('⚠️ Failed to sync reset to Upstash Redis:', err.message);
    }
  }

  console.log('\n🎉 ALL DATABASE DATA HAS BEEN RESET!');
  console.log(`- Menu Items: ${defaultDB.menuItems.length}`);
  console.log(`- Ingredients: ${defaultDB.ingredientsInventory.length}`);
  console.log(`- Orders: ${defaultDB.orders.length}`);
  console.log(`- Users: ${defaultDB.users.length}`);
}

runReset().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
