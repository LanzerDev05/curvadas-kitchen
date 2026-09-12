import fs from 'fs';
import path from 'path';
import { Router, Request, Response } from 'express';
import { readDB, writeDB, DatabaseSchema } from './db';
import { Order, OrderStatus, MenuItem, IngredientStock, GroupOrderSession, GroupCartItem, UserAccount, PromoVoucher, SpoilageRecord, StaffShift, ZReadAudit } from '../types';

export const apiRouter = Router();



// 1. Get entire database
apiRouter.get('/db', async (req: Request, res: Response) => {
  try {
    const db = await readDB();
    res.json(db);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Place Order
apiRouter.post('/orders/place', async (req: Request, res: Response) => {
  try {
    const { order, stockLevels, ingredientsInventory } = req.body;
    if (!order) {
      res.status(400).json({ error: 'Missing order details' });
      return;
    }

    const db = await readDB();
    db.orders = [order, ...db.orders];
    
    if (stockLevels) {
      db.stockLevels = stockLevels;
    }
    if (ingredientsInventory) {
      db.ingredientsInventory = ingredientsInventory;
    }

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update Order Status
apiRouter.post('/orders/status', async (req: Request, res: Response) => {
  try {
    const { orderId, status, logs, cookingStartTime, estimatedPrepTime } = req.body;
    if (!orderId || !status) {
      res.status(400).json({ error: 'Missing orderId or status' });
      return;
    }

    const db = await readDB();
    const targetOrder = db.orders.find((o: Order) => o.id === orderId);

    // If order status is changing to 'cancelled' and was not already 'cancelled', restore stock!
    if (status === 'cancelled' && targetOrder && targetOrder.status !== 'cancelled') {
      targetOrder.items.forEach((item: any) => {
        const menuItem = item.menuItem;
        const orderQty = item.quantity || 1;

        // 1. Restore item stock level
        if (menuItem && menuItem.id && db.stockLevels && db.stockLevels[menuItem.id] !== undefined) {
          db.stockLevels[menuItem.id] += orderQty;
        }

        // 2. Restore ingredient inventory levels
        if (menuItem && db.ingredientsInventory) {
          if (menuItem.recipeRequirements && menuItem.recipeRequirements.length > 0) {
            menuItem.recipeRequirements.forEach((req: any) => {
              const ing = db.ingredientsInventory.find(
                (i: any) => i.name.toLowerCase() === req.name.toLowerCase()
              );
              if (ing) {
                const amountPerServing = ing.unit === 'kg' ? req.amount / 1000 : req.amount;
                const amountToRestore = amountPerServing * orderQty;
                ing.quantity = Number((ing.quantity + amountToRestore).toFixed(4));
              }
            });
          } else if (menuItem.ingredients) {
            menuItem.ingredients.forEach((ingName: string) => {
              const ing = db.ingredientsInventory.find(
                (i: any) => i.name.toLowerCase() === ingName.toLowerCase()
              );
              if (ing) {
                let amountPerServing = 100;
                if (ing.unit === 'pcs' || ing.unit === 'cans') {
                  amountPerServing = 1;
                } else if (ing.unit === 'kg') {
                  amountPerServing = 0.1;
                }
                const amountToRestore = amountPerServing * orderQty;
                ing.quantity = Number((ing.quantity + amountToRestore).toFixed(4));
              }
            });
          }
        }
      });
    }

    db.orders = db.orders.map((o: Order) => {
      if (o.id === orderId) {
        const updatedOrder = { ...o, status, logs };
        if (cookingStartTime !== undefined) updatedOrder.cookingStartTime = cookingStartTime;
        if (estimatedPrepTime !== undefined) updatedOrder.estimatedPrepTime = estimatedPrepTime;
        return updatedOrder;
      }
      return o;
    });

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.5. Update Cooked Items and Staff Name in Order
apiRouter.post('/orders/cook-item', async (req: Request, res: Response) => {
  try {
    const { orderId, cookedItemIds, cookedBy, estimatedPrepTime, cookingStartTime, startedItemIds } = req.body;
    if (!orderId) {
      res.status(400).json({ error: 'Missing orderId' });
      return;
    }

    const db = await readDB();
    db.orders = db.orders.map((o: Order) => {
      if (o.id === orderId) {
        const updated = { ...o };
        if (cookedItemIds !== undefined) updated.cookedItemIds = cookedItemIds;
        if (cookedBy !== undefined) updated.cookedBy = cookedBy;
        if (estimatedPrepTime !== undefined) updated.estimatedPrepTime = estimatedPrepTime;
        if (cookingStartTime !== undefined) updated.cookingStartTime = cookingStartTime;
        if (startedItemIds !== undefined) updated.startedItemIds = startedItemIds;
        return updated;
      }
      return o;
    });

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Confirm Items in Order
apiRouter.post('/orders/confirm', async (req: Request, res: Response) => {
  try {
    const { orderId, confirmedItemIds } = req.body;
    if (!orderId || !confirmedItemIds) {
      res.status(400).json({ error: 'Missing orderId or confirmedItemIds' });
      return;
    }

    const db = await readDB();
    db.orders = db.orders.map((o: Order) => {
      if (o.id === orderId) {
        return { ...o, confirmedItemIds };
      }
      return o;
    });

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Add Menu Item
apiRouter.post('/menu/add', async (req: Request, res: Response) => {
  try {
    const { menuItem, stockLevels } = req.body;
    if (!menuItem) {
      res.status(400).json({ error: 'Missing menuItem' });
      return;
    }

    const db = await readDB();
    db.menuItems = [...db.menuItems, menuItem];
    if (stockLevels) {
      db.stockLevels = stockLevels;
    }

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Edit Menu Item
apiRouter.post('/menu/edit', async (req: Request, res: Response) => {
  try {
    const { menuItem } = req.body;
    if (!menuItem) {
      res.status(400).json({ error: 'Missing menuItem' });
      return;
    }

    const db = await readDB();
    db.menuItems = db.menuItems.map((item: MenuItem) => 
      item.id === menuItem.id ? menuItem : item
    );

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Delete Menu Item
apiRouter.post('/menu/delete', async (req: Request, res: Response) => {
  try {
    const { itemId, stockLevels } = req.body;
    if (!itemId) {
      res.status(400).json({ error: 'Missing itemId' });
      return;
    }

    const db = await readDB();
    db.menuItems = db.menuItems.filter((item: MenuItem) => item.id !== itemId);
    if (stockLevels) {
      db.stockLevels = stockLevels;
    }

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Update Inventory Stock Levels
apiRouter.post('/inventory/update', async (req: Request, res: Response) => {
  try {
    const { ingredientsInventory } = req.body;
    if (!ingredientsInventory) {
      res.status(400).json({ error: 'Missing ingredientsInventory' });
      return;
    }

    const db = await readDB();
    db.ingredientsInventory = ingredientsInventory;

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Add Ingredient
apiRouter.post('/inventory/add', async (req: Request, res: Response) => {
  try {
    const { ingredient } = req.body;
    if (!ingredient) {
      res.status(400).json({ error: 'Missing ingredient' });
      return;
    }

    const db = await readDB();
    db.ingredientsInventory = [...db.ingredientsInventory, ingredient];

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Edit Ingredient
apiRouter.post('/inventory/edit', async (req: Request, res: Response) => {
  try {
    const { ingredient } = req.body;
    if (!ingredient) {
      res.status(400).json({ error: 'Missing ingredient' });
      return;
    }

    const db = await readDB();
    db.ingredientsInventory = db.ingredientsInventory.map((ing: IngredientStock) => 
      ing.id === ingredient.id ? ingredient : ing
    );

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Delete Ingredient
apiRouter.post('/inventory/delete', async (req: Request, res: Response) => {
  try {
    const { ingredientId } = req.body;
    if (!ingredientId) {
      res.status(400).json({ error: 'Missing ingredientId' });
      return;
    }

    const db = await readDB();
    db.ingredientsInventory = db.ingredientsInventory.filter((ing: IngredientStock) => ing.id !== ingredientId);

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Save Settings (Financial Rates, Targets, Forecast sales pace)
apiRouter.post('/settings', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings) {
      res.status(400).json({ error: 'Missing settings' });
      return;
    }

    const db = await readDB();
    db.settings = { ...db.settings, ...settings };

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Update Stock levels directly
apiRouter.post('/stock/update', async (req: Request, res: Response) => {
  try {
    const { stockLevels, manualStockOverrides } = req.body;
    if (!stockLevels) {
      res.status(400).json({ error: 'Missing stockLevels' });
      return;
    }

    const db = await readDB();
    db.stockLevels = stockLevels;
    if (manualStockOverrides) {
      db.manualStockOverrides = manualStockOverrides;
    }

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Toggle manual overrides / hidden categories
apiRouter.post('/stock/categories', async (req: Request, res: Response) => {
  try {
    const { hiddenCategories } = req.body;
    if (!hiddenCategories) {
      res.status(400).json({ error: 'Missing hiddenCategories' });
      return;
    }

    const db = await readDB();
    db.hiddenCategories = hiddenCategories;

    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Group session actions
apiRouter.post('/group/update', async (req: Request, res: Response) => {
  try {
    const { groupSessions } = req.body;
    if (!groupSessions) {
      res.status(400).json({ error: 'Missing groupSessions' });
      return;
    }
    const db = await readDB();
    db.groupSessions = groupSessions;
    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 16. Reset database (wipes all menu items, stock & orders down to 0 while retaining user accounts)
apiRouter.post('/reset', async (req: Request, res: Response) => {
  try {
    const currentDb = await readDB();
    const preservedUsers = currentDb.users && currentDb.users.length > 0 ? currentDb.users : [];

    const DB_FILE = path.resolve(process.cwd(), 'db.json');
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }

    const wipedDb: DatabaseSchema = {
      menuItems: [],
      ingredientsInventory: [],
      stockLevels: {},
      manualStockOverrides: [],
      hiddenCategories: [],
      orders: [],
      groupSessions: [],
      users: preservedUsers,
      promoVouchers: [],
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

    await writeDB(wipedDb);
    res.json({ success: true, db: wipedDb });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



// 17. Clear all transactions (orders)
apiRouter.post('/clear', async (req: Request, res: Response) => {
  try {
    const db = await readDB();
    db.orders = [];
    db.groupSessions = [];
    await writeDB(db);
    res.json({ success: true, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 18. Customer Registration API (Saves user to Redis / db.json)
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, address, password } = req.body;
    if (!name || !email || !phone || !address || !password) {
      res.status(400).json({ error: 'All fields (name, email, phone, address, password) are required!' });
      return;
    }

    const db = await readDB();
    const existing = db.users.find((u: UserAccount) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists!' });
      return;
    }

    const newUser: UserAccount = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      password,
      role: 'customer',
      createdAt: new Date().toISOString()
    };

    db.users = [...db.users, newUser];
    await writeDB(db);

    res.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        address: newUser.address,
        orderType: 'delivery'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 19. Customer Login API (Checks credentials against Redis / db.json)
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required!' });
      return;
    }

    const db = await readDB();
    const found = db.users.find(
      (u: UserAccount) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );

    if (!found) {
      res.status(400).json({ error: 'Invalid email or password!' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: found.id,
        name: found.name,
        email: found.email,
        phone: found.phone,
        address: found.address,
        orderType: 'delivery'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 20. Staff & Workplace Portal Login API (Checks staff passcodes/accounts in database)
apiRouter.post('/auth/staff-login', async (req: Request, res: Response) => {
  try {
    const { passcode, requestedRole } = req.body;
    if (!passcode) {
      res.status(400).json({ error: 'Passcode is required!' });
      return;
    }

    const cleanedPasscode = passcode.trim().toLowerCase();
    const db = await readDB();

    // Check database users matching passcode/password or fallback role passcodes
    const matchedUser = db.users.find(
      (u: UserAccount) => (u.role === 'kitchen' || u.role === 'admin') && u.password.toLowerCase() === cleanedPasscode
    );

    let authenticatedRole: 'kitchen' | 'admin' | null = null;
    if (matchedUser) {
      authenticatedRole = matchedUser.role as 'kitchen' | 'admin';
    } else if (cleanedPasscode === 'kitchen123') {
      authenticatedRole = 'kitchen';
    } else if (cleanedPasscode === 'admin123') {
      authenticatedRole = 'admin';
    }

    if (!authenticatedRole) {
      res.status(400).json({ error: 'Invalid Staff Passcode!' });
      return;
    }

    res.json({
      success: true,
      role: authenticatedRole
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 21. Promo Voucher Validation API
apiRouter.post('/vouchers/validate', async (req: Request, res: Response) => {
  try {
    const { code, cartTotal } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Voucher code is required!' });
      return;
    }

    const db = await readDB();
    const cleanCode = code.trim().toUpperCase();
    const voucher = (db.promoVouchers || []).find((v: PromoVoucher) => v.code === cleanCode && v.isActive);

    if (!voucher) {
      res.status(400).json({ error: 'Invalid or inactive promo code!' });
      return;
    }

    if (cartTotal < voucher.minSpend) {
      res.status(400).json({ error: `Minimum spend of ₱${voucher.minSpend} required for voucher ${cleanCode}` });
      return;
    }

    let discountAmount = 0;
    if (voucher.discountType === 'percentage') {
      discountAmount = (cartTotal * voucher.discountValue) / 100;
    } else {
      discountAmount = voucher.discountValue;
    }
    discountAmount = Math.min(cartTotal, discountAmount);

    res.json({
      success: true,
      voucher,
      discountAmount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 22. Spoilage Logging API
apiRouter.post('/spoilage', async (req: Request, res: Response) => {
  try {
    const { ingredientId, amount, reason, loggedBy } = req.body;
    if (!ingredientId || !amount || amount <= 0) {
      res.status(400).json({ error: 'Valid ingredientId and amount (> 0) required' });
      return;
    }

    const db = await readDB();
    const ing = db.ingredientsInventory.find((i: IngredientStock) => i.id === ingredientId);
    if (!ing) {
      res.status(404).json({ error: 'Ingredient not found' });
      return;
    }

    const unitCost = ing.costPerUnit || 0;
    const totalCost = amount * unitCost;

    // Deduct stock quantity
    ing.quantity = Math.max(0, ing.quantity - amount);

    const record: SpoilageRecord = {
      id: `spl-${Date.now()}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      amount,
      unit: ing.unit,
      cost: totalCost,
      reason: reason || 'expired',
      timestamp: new Date().toISOString(),
      loggedBy: loggedBy || 'Staff'
    };

    db.spoilageLogs = [record, ...(db.spoilageLogs || [])];
    await writeDB(db);

    res.json({ success: true, record, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 23. Staff Shift Clock-In / Clock-Out API
apiRouter.post('/shifts/clock-in', async (req: Request, res: Response) => {
  try {
    const { staffName, role, hourlyRate } = req.body;
    if (!staffName) {
      res.status(400).json({ error: 'Staff name is required' });
      return;
    }

    const db = await readDB();
    const activeShift = (db.staffShifts || []).find((s: StaffShift) => s.staffName.toLowerCase() === staffName.trim().toLowerCase() && !s.clockOut);
    if (activeShift) {
      res.status(400).json({ error: `${staffName} is already clocked in!` });
      return;
    }

    const newShift: StaffShift = {
      id: `sft-${Date.now()}`,
      staffName: staffName.trim(),
      role: role || 'Kitchen Crew',
      clockIn: new Date().toISOString(),
      hourlyRate: hourlyRate || 75 // Default ₱75/hr base wage
    };

    db.staffShifts = [newShift, ...(db.staffShifts || [])];
    await writeDB(db);

    res.json({ success: true, shift: newShift, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/shifts/clock-out', async (req: Request, res: Response) => {
  try {
    const { shiftId } = req.body;
    if (!shiftId) {
      res.status(400).json({ error: 'shiftId is required' });
      return;
    }

    const db = await readDB();
    const shift = (db.staffShifts || []).find((s: StaffShift) => s.id === shiftId);
    if (!shift) {
      res.status(404).json({ error: 'Shift not found' });
      return;
    }

    const now = new Date();
    shift.clockOut = now.toISOString();

    const startMs = new Date(shift.clockIn).getTime();
    const endMs = now.getTime();
    const diffHours = Math.max(0.1, (endMs - startMs) / (1000 * 60 * 60));

    shift.totalHours = Number(diffHours.toFixed(2));
    shift.totalEarned = Number((diffHours * shift.hourlyRate).toFixed(2));

    await writeDB(db);
    res.json({ success: true, shift, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 24. Save Z-Read End-of-Day Reconciliation Audit
apiRouter.post('/zread', async (req: Request, res: Response) => {
  try {
    const { actualCashCount, closedBy } = req.body;
    const db = await readDB();

    // Calculate today's sales breakdown
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = db.orders.filter(o => o.timestamp.startsWith(todayStr) && o.status !== 'cancelled');

    const cashSales = todayOrders.filter(o => o.paymentMethod === 'cod').reduce((sum, o) => sum + o.totalAmount, 0);
    const ewalletSales = todayOrders.filter(o => o.paymentMethod === 'ewallet').reduce((sum, o) => sum + o.totalAmount, 0);
    const cardSales = todayOrders.filter(o => o.paymentMethod === 'card').reduce((sum, o) => sum + o.totalAmount, 0);
    const totalGross = cashSales + ewalletSales + cardSales;
    const voidCount = db.orders.filter(o => o.timestamp.startsWith(todayStr) && o.status === 'cancelled').length;

    const expectedCash = cashSales;
    const actualCash = Number(actualCashCount) || 0;
    const discrepancy = actualCash - expectedCash;

    const audit: ZReadAudit = {
      id: `zr-${Date.now()}`,
      date: todayStr,
      cashSales,
      ewalletSales,
      cardSales,
      totalGross,
      discountTotal: 0,
      voidCount,
      expectedCash,
      actualCashCount: actualCash,
      discrepancy,
      closedBy: closedBy || 'Admin',
      timestamp: new Date().toISOString()
    };

    db.zReadAudits = [audit, ...(db.zReadAudits || [])];
    await writeDB(db);

    res.json({ success: true, audit, db });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


