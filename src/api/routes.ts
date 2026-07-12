import { Router, Request, Response } from 'express';
import { readDB, writeDB, DatabaseSchema } from './db';
import { Order, OrderStatus, MenuItem, IngredientStock, GroupOrderSession, GroupCartItem } from '../types';

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
    const { orderId, status, logs } = req.body;
    if (!orderId || !status) {
      res.status(400).json({ error: 'Missing orderId or status' });
      return;
    }

    const db = await readDB();
    db.orders = db.orders.map((o: Order) => {
      if (o.id === orderId) {
        return { ...o, status, logs };
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

// 16. Reset database
apiRouter.post('/reset', async (req: Request, res: Response) => {
  try {
    // Delete database file to trigger recreation with defaults
    const db = await readDB();
    // We can just construct a fresh default structure by deleting the file and reading again
    const path = require('path');
    const fs = require('fs');
    const DB_FILE = path.resolve(process.cwd(), 'db.json');
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
    const newDb = await readDB();
    res.json({ success: true, db: newDb });
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
