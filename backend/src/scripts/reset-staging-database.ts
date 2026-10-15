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

async function resetStagingDatabase() {
  console.log('====================================================');
  console.log('🚨 RESETTING CURVADA KITCHEN STAGING DATABASE 🚨');
  console.log(`🌍 Target Environment: [${ENV.APP_ENV.toUpperCase()}]`);
  console.log(`🔗 Target MongoDB URI: ${ENV.MONGODB_URI}`);
  console.log('====================================================');

  if (!ENV.MONGODB_URI.includes('curvadas_kitchen_stg')) {
    console.error('❌ ABORTING: The target database URI does NOT point to curvadas_kitchen_stg!');
    console.error(`Current URI: ${ENV.MONGODB_URI}`);
    process.exit(1);
  }

  await connectDatabase();

  console.log('\n🧹 Clearing all collections in staging database...');
  await Promise.all([
    MenuItemModel.deleteMany({}),
    IngredientModel.deleteMany({}),
    StockBatchModel.deleteMany({}),
    SpoilageModel.deleteMany({}),
    OrderModel.deleteMany({}),
    UserModel.deleteMany({}),
    PromoModel.deleteMany({}),
    StaffShiftModel.deleteMany({}),
    ZReadModel.deleteMany({}),
    TableModel.deleteMany({}),
    SettingModel.deleteMany({}),
  ]);
  console.log('✅ All staging collections cleared.');

  // Read clean factory defaults from .data/db.json
  const sourcePaths = [
    path.resolve(process.cwd(), '../.data/db.json'),
    path.resolve(process.cwd(), '.data/db.json'),
    path.resolve(process.cwd(), '../db.json'),
  ];

  let rawData = '';
  for (const p of sourcePaths) {
    if (fs.existsSync(p)) {
      console.log(`📄 Reading clean defaults from: ${p}`);
      rawData = fs.readFileSync(p, 'utf-8');
      break;
    }
  }

  if (!rawData) {
    console.error('❌ Could not find source db.json. Exiting reset.');
    process.exit(1);
  }

  const db = JSON.parse(rawData);

  // 1. Users
  if (db.users && Array.isArray(db.users)) {
    console.log(`👤 Seeding ${db.users.length} default users...`);
    for (const u of db.users) {
      const hashedPassword = u.password.startsWith('$2a$') || u.password.startsWith('$2b$')
        ? u.password
        : await bcrypt.hash(u.password, 10);

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

  // 2. Menu Items
  if (db.menuItems && Array.isArray(db.menuItems)) {
    console.log(`🍛 Seeding ${db.menuItems.length} default menu items...`);
    for (const m of db.menuItems) {
      await MenuItemModel.create({
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
      });
    }
  }

  // 3. Ingredients Inventory
  if (db.ingredientsInventory && Array.isArray(db.ingredientsInventory)) {
    console.log(`📦 Seeding ${db.ingredientsInventory.length} default ingredients...`);
    for (const ing of db.ingredientsInventory) {
      await IngredientModel.create({
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
      });
    }
  }

  // 4. Promo Vouchers
  if (db.promoVouchers && Array.isArray(db.promoVouchers)) {
    console.log(`🎟️ Seeding ${db.promoVouchers.length} default promo vouchers...`);
    for (const v of db.promoVouchers) {
      await PromoModel.create({
        customId: v.id,
        code: v.code.toUpperCase().trim(),
        discountType: v.discountType || 'percentage',
        discountValue: v.discountValue,
        minSpend: v.minSpend || 0,
        isActive: v.isActive !== false,
      });
    }
  }

  // 5. Dining Tables
  console.log('🪑 Seeding 6 restaurant tables (T1-T6)...');
  const defaultTables = [
    { tableNumber: 'T1', label: 'Table 1 (Window)', capacity: 4, status: 'vacant' },
    { tableNumber: 'T2', label: 'Table 2 (Main Hall)', capacity: 4, status: 'vacant' },
    { tableNumber: 'T3', label: 'Table 3 (Main Hall)', capacity: 4, status: 'vacant' },
    { tableNumber: 'T4', label: 'Table 4 (Booth)', capacity: 6, status: 'vacant' },
    { tableNumber: 'T5', label: 'Table 5 (Outdoor)', capacity: 2, status: 'vacant' },
    { tableNumber: 'T6', label: 'Table 6 (Outdoor)', capacity: 2, status: 'vacant' },
  ];
  await TableModel.insertMany(defaultTables);

  // 6. Settings
  if (db.settings) {
    console.log('⚙️ Seeding standard settings...');
    await SettingModel.create(db.settings);
  }

  // Summary counts
  const [usersCount, menuCount, ingsCount, promosCount, tablesCount, ordersCount] = await Promise.all([
    UserModel.countDocuments(),
    MenuItemModel.countDocuments(),
    IngredientModel.countDocuments(),
    PromoModel.countDocuments(),
    TableModel.countDocuments(),
    OrderModel.countDocuments(),
  ]);

  console.log('\n====================================================');
  console.log('🎉 STAGING DATABASE RESET COMPLETE!');
  console.log(`- Database: curvadas_kitchen_stg`);
  console.log(`- Users: ${usersCount}`);
  console.log(`- Menu Items: ${menuCount}`);
  console.log(`- Ingredients: ${ingsCount}`);
  console.log(`- Promo Vouchers: ${promosCount}`);
  console.log(`- Tables: ${tablesCount}`);
  console.log(`- Orders: ${ordersCount} (clean slate)`);
  console.log('====================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

resetStagingDatabase().catch((err) => {
  console.error('❌ Staging database reset failed:', err);
  process.exit(1);
});
