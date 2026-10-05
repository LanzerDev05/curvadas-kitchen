import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';
import { connectDatabase } from '../config/database';

import { MenuItemModel } from '../features/menu/infrastructure/models/MenuItemModel';
import { IngredientModel, StockBatchModel, SpoilageModel } from '../features/inventory/infrastructure/models/InventoryModels';
import { OrderModel } from '../features/orders/infrastructure/models/OrderModel';
import { UserModel } from '../features/auth/infrastructure/models/UserModel';
import { PromoModel } from '../features/promos/infrastructure/repositories/PromoRepository';
import { StaffShiftModel } from '../features/staff/infrastructure/models/StaffModels';
import { ZReadModel, TableModel } from '../features/pos/infrastructure/models/PosModels';
import { SettingModel } from '../features/settings/presentation/routes/settingsRoutes';

const runMigration = async () => {
  console.log('🔄 Starting Curvada JSON -> MongoDB Migration...');

  await connectDatabase();

  const legacyPaths = [
    path.resolve(process.cwd(), '../.data/db.json'),
    path.resolve(process.cwd(), '.data/db.json'),
    path.resolve(process.cwd(), '../db.json'),
  ];

  let rawData = '';
  for (const p of legacyPaths) {
    if (fs.existsSync(p)) {
      console.log(`📄 Found source legacy database file at: ${p}`);
      rawData = fs.readFileSync(p, 'utf-8');
      break;
    }
  }

  if (!rawData) {
    console.error('❌ Could not find .data/db.json or db.json. Exiting migration.');
    process.exit(1);
  }

  const db = JSON.parse(rawData);

  // 1. Users
  if (db.users && Array.isArray(db.users)) {
    console.log(`👤 Migrating ${db.users.length} Users...`);
    for (const u of db.users) {
      const existing = await UserModel.findOne({ email: u.email.toLowerCase().trim() });
      const hashedPassword = u.password.startsWith('$2a$') || u.password.startsWith('$2b$')
        ? u.password
        : await bcrypt.hash(u.password, 10);

      if (!existing) {
        await UserModel.create({
          name: u.name,
          email: u.email.toLowerCase().trim(),
          phone: u.phone,
          address: u.address || '',
          password: hashedPassword,
          role: u.role || 'customer',
          loyaltyPoints: u.loyaltyPoints || 0,
        });
      }
    }
  }

  // 2. Menu Items
  if (db.menuItems && Array.isArray(db.menuItems)) {
    console.log(`🍛 Migrating ${db.menuItems.length} Menu Items...`);
    for (const m of db.menuItems) {
      await MenuItemModel.findOneAndUpdate(
        { $or: [{ customId: m.id }, { name: m.name }] },
        {
          $set: {
            customId: m.id,
            name: m.name,
            description: m.description || '',
            price: m.price,
            category: m.category,
            image: m.image || '',
            spicy: !!m.spicy,
            popular: !!m.popular,
            isAvailable: m.isAvailable !== false,
            ingredients: m.ingredients || [],
            recipeRequirements: m.recipeRequirements || [],
            batchIngredients: m.batchIngredients || [],
            garnishes: m.garnishes || [],
            packaging: m.packaging || [],
            customizableOptions: m.customizableOptions || [],
            estimatedPrepTime: m.estimatedPrepTime || 15,
            targetMarginPercent: m.targetMarginPercent || 50,
            batchYieldGrams: m.batchYieldGrams,
            batchYieldUnit: m.batchYieldUnit,
            servingSizeGrams: m.servingSizeGrams,
            servingSizeUnit: m.servingSizeUnit,
            totalBatchCost: m.totalBatchCost,
            includeRice: !!m.includeRice,
            ricePortionGrams: m.ricePortionGrams || 150,
            riceCostPerGram: m.riceCostPerGram || 0.04,
          },
        },
        { upsert: true }
      );
    }
  }

  // 3. Ingredients Inventory
  if (db.ingredientsInventory && Array.isArray(db.ingredientsInventory)) {
    console.log(`📦 Migrating ${db.ingredientsInventory.length} Ingredients...`);
    for (const ing of db.ingredientsInventory) {
      await IngredientModel.findOneAndUpdate(
        { $or: [{ customId: ing.id }, { name: ing.name }] },
        {
          $set: {
            customId: ing.id,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            lowStockAlert: ing.lowStockAlert || 500,
            costPerUnit: ing.costPerUnit || 0,
            packCount: ing.packCount,
            packSize: ing.packSize,
            packCost: ing.packCost,
            supplier: ing.supplier,
          },
        },
        { upsert: true }
      );
    }
  }

  // 4. Stock Batches
  if (db.stockBatches && Array.isArray(db.stockBatches)) {
    console.log(`🏷️ Migrating ${db.stockBatches.length} Stock Batches...`);
    for (const b of db.stockBatches) {
      await StockBatchModel.findOneAndUpdate(
        { $or: [{ customId: b.id }, { batchNumber: b.batchNumber, ingredientName: b.ingredientName }] },
        {
          $set: {
            customId: b.id,
            ingredientId: b.ingredientId,
            ingredientName: b.ingredientName,
            batchNumber: b.batchNumber,
            receivedDate: b.receivedDate ? new Date(b.receivedDate) : new Date(),
            expiryDate: b.expiryDate ? new Date(b.expiryDate) : undefined,
            initialQuantity: b.initialQuantity,
            remainingQuantity: b.remainingQuantity,
            unit: b.unit,
            costPerUnit: b.costPerUnit,
            packCost: b.packCost,
            supplierName: b.supplierName,
            status: b.status || 'active',
          },
        },
        { upsert: true }
      );
    }
  }

  // 5. Promo Vouchers
  if (db.promoVouchers && Array.isArray(db.promoVouchers)) {
    console.log(`🎟️ Migrating ${db.promoVouchers.length} Promo Vouchers...`);
    for (const v of db.promoVouchers) {
      await PromoModel.findOneAndUpdate(
        { code: v.code.toUpperCase().trim() },
        {
          $set: {
            customId: v.id,
            code: v.code.toUpperCase().trim(),
            discountType: v.discountType || 'percentage',
            discountValue: v.discountValue,
            minSpend: v.minSpend || 0,
            isActive: v.isActive !== false,
          },
        },
        { upsert: true }
      );
    }
  }

  // 6. Orders
  if (db.orders && Array.isArray(db.orders)) {
    console.log(`🛒 Migrating ${db.orders.length} Past Orders...`);
    for (const o of db.orders) {
      await OrderModel.findOneAndUpdate(
        { $or: [{ customId: o.id }] },
        {
          $set: {
            customId: o.id,
            queueNumber: o.queueNumber || 1,
            orderType: o.orderType || (o.customer?.orderType === 'pickup' ? 'takeout' : o.customer?.orderType || 'takeout'),
            tableNumber: o.customer?.tableNumber || o.tableNumber,
            customer: o.customer || { name: 'Customer', phone: '0000' },
            items: o.items || [],
            totalAmount: o.totalAmount || 0,
            paymentMethod: o.paymentMethod || 'cash',
            paymentStatus: o.status === 'delivered' ? 'paid' : 'unpaid',
            status: o.status || 'pending',
            logs: o.logs || [],
            cookedItemIds: o.cookedItemIds || [],
            startedItemIds: o.startedItemIds || [],
            confirmedItemIds: o.confirmedItemIds || [],
            cookedBy: o.cookedBy,
            cookingStartTime: o.cookingStartTime ? new Date(o.cookingStartTime) : undefined,
            estimatedPrepTime: o.estimatedPrepTime,
            createdAt: o.timestamp ? new Date(o.timestamp) : new Date(),
          },
        },
        { upsert: true }
      );
    }
  }

  // 7. Spoilage Logs
  if (db.spoilageLogs && Array.isArray(db.spoilageLogs)) {
    console.log(`🗑️ Migrating ${db.spoilageLogs.length} Spoilage Logs...`);
    for (const spl of db.spoilageLogs) {
      await SpoilageModel.findOneAndUpdate(
        { customId: spl.id },
        {
          $set: {
            customId: spl.id,
            ingredientId: spl.ingredientId,
            ingredientName: spl.ingredientName,
            amount: spl.amount,
            unit: spl.unit,
            cost: spl.cost,
            reason: spl.reason,
            timestamp: spl.timestamp ? new Date(spl.timestamp) : new Date(),
            loggedBy: spl.loggedBy || 'Staff',
          },
        },
        { upsert: true }
      );
    }
  }

  // 8. Staff Shifts
  if (db.staffShifts && Array.isArray(db.staffShifts)) {
    console.log(`⏰ Migrating ${db.staffShifts.length} Staff Shifts...`);
    for (const s of db.staffShifts) {
      await StaffShiftModel.findOneAndUpdate(
        { customId: s.id },
        {
          $set: {
            customId: s.id,
            staffName: s.staffName,
            role: s.role,
            clockIn: s.clockIn ? new Date(s.clockIn) : new Date(),
            clockOut: s.clockOut ? new Date(s.clockOut) : undefined,
            hourlyRate: s.hourlyRate,
            totalHours: s.totalHours,
            totalEarned: s.totalEarned,
          },
        },
        { upsert: true }
      );
    }
  }

  // 9. Z-Read Audits
  if (db.zReadAudits && Array.isArray(db.zReadAudits)) {
    console.log(`📊 Migrating ${db.zReadAudits.length} Z-Read Audits...`);
    for (const zr of db.zReadAudits) {
      await ZReadModel.findOneAndUpdate(
        { customId: zr.id },
        {
          $set: {
            customId: zr.id,
            date: zr.date,
            cashSales: zr.cashSales,
            ewalletSales: zr.ewalletSales,
            cardSales: zr.cardSales,
            totalGross: zr.totalGross,
            discountTotal: zr.discountTotal || 0,
            voidCount: zr.voidCount || 0,
            expectedCash: zr.expectedCash,
            actualCashCount: zr.actualCashCount,
            discrepancy: zr.discrepancy,
            closedBy: zr.closedBy,
            timestamp: zr.timestamp ? new Date(zr.timestamp) : new Date(),
          },
        },
        { upsert: true }
      );
    }
  }

  // 10. Default Tables Setup
  const existingTablesCount = await TableModel.countDocuments();
  if (existingTablesCount === 0) {
    console.log('🪑 Initializing standard restaurant tables...');
    const defaultTables = [
      { tableNumber: 'T1', label: 'Table 1 (Window)', capacity: 4, status: 'vacant' },
      { tableNumber: 'T2', label: 'Table 2 (Main Hall)', capacity: 4, status: 'vacant' },
      { tableNumber: 'T3', label: 'Table 3 (Main Hall)', capacity: 4, status: 'vacant' },
      { tableNumber: 'T4', label: 'Table 4 (Booth)', capacity: 6, status: 'vacant' },
      { tableNumber: 'T5', label: 'Table 5 (Outdoor)', capacity: 2, status: 'vacant' },
      { tableNumber: 'T6', label: 'Table 6 (Outdoor)', capacity: 2, status: 'vacant' },
    ];
    await TableModel.insertMany(defaultTables);
  }

  // 11. Settings
  if (db.settings) {
    console.log('⚙️ Saving Settings...');
    await SettingModel.findOneAndUpdate({}, { $set: db.settings }, { upsert: true });
  }

  console.log('✅ Curvada JSON -> MongoDB Migration successfully finished!');
  await mongoose.disconnect();
  process.exit(0);
};

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
