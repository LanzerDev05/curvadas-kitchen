import fs from 'fs';
import path from 'path';
import { MENU_ITEMS } from '../data/menu';
import { MenuItem, IngredientStock, Order, GroupOrderSession } from '../types';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const DB_FILE = path.resolve(process.cwd(), 'db.json');

let localCache: DatabaseSchema | null = null;

export interface DatabaseSchema {
  menuItems: MenuItem[];
  ingredientsInventory: IngredientStock[];
  stockLevels: Record<string, number>;
  manualStockOverrides: string[];
  hiddenCategories: string[];
  orders: Order[];
  groupSessions: GroupOrderSession[];
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
  };
}

// Generate the initial seed database matching App.tsx's baseline logic
const generateDefaultDB = (): DatabaseSchema => {
  // Generate realistic ingredients stock
  const uniqueIngredients = new Set<string>();
  MENU_ITEMS.forEach(item => {
    if (item.ingredients) {
      item.ingredients.forEach(ing => uniqueIngredients.add(ing));
    }
  });

  if (uniqueIngredients.size === 0) {
    ['Premium Beef Tapa', 'Sunny-Side-Up Egg', 'Garlic Fried Rice', 'Atchara Pickles', 'Sweet Cured Pork', 'Traditional Vinegar Dip', 'Steamed Rice', 'Pork Gyoza (2pcs)', 'Crispy Chicken Fillet', 'Bulldog Tonkatsu Sauce', 'Japanese Mayo', 'Garlic', 'Egg', 'Pork Belly'].forEach(ing => uniqueIngredients.add(ing));
  }

  const ingredientsInventory: IngredientStock[] = Array.from(uniqueIngredients).map((name, index) => {
    const isEggOrGyoza = name.toLowerCase().includes('egg') || name.toLowerCase().includes('gyoza');
    const unit: string = isEggOrGyoza ? 'pcs' : 'g';
    let costPerUnit = 0.05;
    if (name.toLowerCase().includes('egg')) costPerUnit = 8.00;
    else if (name.toLowerCase().includes('gyoza')) costPerUnit = 12.00;
    else if (name.toLowerCase().includes('rice')) costPerUnit = 0.03;
    else if (name.toLowerCase().includes('beef') || name.toLowerCase().includes('pork') || name.toLowerCase().includes('chicken')) costPerUnit = 0.25;
    else if (unit === 'pcs') costPerUnit = 15.00;
    else if (unit === 'cans') costPerUnit = 45.00;

    return {
      id: `ing-${index}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      quantity: isEggOrGyoza ? 60 : 3000,
      unit,
      lowStockAlert: isEggOrGyoza ? 10 : 500,
      costPerUnit
    };
  });

  const stockLevels: Record<string, number> = {};
  MENU_ITEMS.forEach(item => {
    stockLevels[item.id] = item.category === 'drinks' ? 45 : 18;
  });

  const seedOrders: Order[] = [
    {
      id: 'ord-seed01',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      items: [
        {
          id: 'silog-tapsilog-default',
          menuItem: MENU_ITEMS[0],
          selectedOptions: [
            { optionTitle: 'Rice Upgrade', choice: { id: 'rice-garlic', name: 'Garlic Fried Rice', price: 0 } },
            { optionTitle: 'Egg Style', choice: { id: 'egg-sunny', name: 'Sunny-side-up', price: 0 } }
          ],
          quantity: 2,
          totalUnitPrice: 149,
        },
        {
          id: 'drink-red-tea-default',
          menuItem: MENU_ITEMS[2],
          selectedOptions: [
            { optionTitle: 'Serving Size', choice: { id: 'size-large', name: 'Large C-Cup (22oz) (+20)', price: 20 } }
          ],
          quantity: 2,
          totalUnitPrice: 69,
        }
      ],
      totalAmount: 436,
      customer: {
        name: 'Arnel Cruz',
        phone: '0917-882-9382',
        email: 'arnel@gmail.com',
        address: 'Block 3 Lot 15, Springville Homes, Bacoor, Cavite',
        orderType: 'delivery',
      },
      paymentMethod: 'ewallet',
      status: 'delivered',
      logs: [
        { status: 'pending', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
        { status: 'preparing', timestamp: new Date(Date.now() - 1.8 * 60 * 60 * 1000).toISOString() },
        { status: 'dispatched', timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString() },
        { status: 'delivered', timestamp: new Date(Date.now() - 1.2 * 60 * 60 * 1000).toISOString() }
      ]
    },
    {
      id: 'ord-seed02',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      items: [
        {
          id: 'bento-chicken-katsu-default',
          menuItem: MENU_ITEMS[1],
          selectedOptions: [
            { optionTitle: 'Sauce Option', choice: { id: 'sauce-katsu', name: 'Katsu Sauce & Mayo', price: 0 } }
          ],
          quantity: 1,
          totalUnitPrice: 189,
        }
      ],
      totalAmount: 189,
      customer: {
        name: 'Sarah Geronimo',
        phone: '0922-383-7377',
        email: 'sarahg@gmail.com',
        address: 'Zone 4, Curvada National Highway (Eat-in)',
        orderType: 'pickup',
        tableNumber: '7',
      },
      paymentMethod: 'cod',
      status: 'pending',
      logs: [
        { status: 'pending', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() }
      ]
    }
  ];

  return {
    menuItems: MENU_ITEMS,
    ingredientsInventory,
    stockLevels,
    manualStockOverrides: [],
    hiddenCategories: [],
    orders: seedOrders,
    groupSessions: [],
    settings: {
      salesPace: 30,
      electricityBaseRate: 250,
      electricityVariableRate: 10,
      waterBaseRate: 80,
      rentBaseRate: 500,
      laborBaseRate: 1200,
      gasBaseRate: 200,
      otherBaseRate: 100,
      targetSalesDay: 6000,
      targetSalesWeek: 42000,
      targetSalesMonth: 180000,
      targetSalesYear: 2160000,
      targetProfitDay: 2500,
      targetProfitWeek: 17500,
      targetProfitMonth: 75000,
      targetProfitYear: 900000,
      financesPeriod: 'day'
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
    if (!fs.existsSync(DB_FILE)) {
      const defaultData = generateDefaultDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
      localCache = defaultData;
      return defaultData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
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
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file.', err);
  }
};
