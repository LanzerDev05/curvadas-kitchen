import mongoose, { Schema, Document } from 'mongoose';
import { Request, Response, NextFunction, Router } from 'express';
import { MenuItemModel } from '../../../menu/infrastructure/models/MenuItemModel';
import { IngredientModel, StockBatchModel, SpoilageModel } from '../../../inventory/infrastructure/models/InventoryModels';
import { OrderModel } from '../../../orders/infrastructure/models/OrderModel';
import { UserModel } from '../../../auth/infrastructure/models/UserModel';
import { PromoModel } from '../../../promos/infrastructure/repositories/PromoRepository';
import { StaffShiftModel, StaffAdvanceModel, PayrollModel } from '../../../staff/infrastructure/models/StaffModels';
import { ZReadModel, TableModel } from '../../../pos/infrastructure/models/PosModels';
import { authenticate, authorize } from '../../../../shared/middleware/authMiddleware';

export interface ISettingDocument extends Document {
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
  financesPeriod: string;
  expenseInputMode: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISettingDocument>(
  {
    salesPace: { type: Number, default: 18 },
    electricityBaseRate: { type: Number, default: 150 },
    electricityVariableRate: { type: Number, default: 3.5 },
    waterBaseRate: { type: Number, default: 40 },
    rentBaseRate: { type: Number, default: 300 },
    laborBaseRate: { type: Number, default: 450 },
    gasBaseRate: { type: Number, default: 80 },
    otherBaseRate: { type: Number, default: 50 },
    targetSalesDay: { type: Number, default: 3500 },
    targetSalesWeek: { type: Number, default: 24500 },
    targetSalesMonth: { type: Number, default: 105000 },
    targetSalesYear: { type: Number, default: 1260000 },
    targetProfitDay: { type: Number, default: 1200 },
    targetProfitWeek: { type: Number, default: 8400 },
    targetProfitMonth: { type: Number, default: 36000 },
    targetProfitYear: { type: Number, default: 432000 },
    financesPeriod: { type: String, default: 'day' },
    expenseInputMode: { type: String, default: 'monthly' },
  },
  {
    timestamps: true,
  }
);

export const SettingModel = mongoose.model<ISettingDocument>('Setting', SettingSchema);

export class SettingsController {
  getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let setting = await SettingModel.findOne();
      if (!setting) {
        setting = await SettingModel.create({});
      }
      res.status(200).json({ success: true, settings: setting });
    } catch (err) {
      next(err);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updates = req.body.settings || req.body;
      const setting = await SettingModel.findOneAndUpdate({}, { $set: updates }, { upsert: true, new: true });
      res.status(200).json({ success: true, settings: setting });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Backward-compatible /db full snapshot endpoint
   */
  getFullDatabaseSnapshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [
        menuItems,
        ingredientsInventory,
        stockBatches,
        orders,
        users,
        promoVouchers,
        spoilageLogs,
        staffShifts,
        zReadAudits,
        tables,
        settings,
      ] = await Promise.all([
        MenuItemModel.find(),
        IngredientModel.find(),
        StockBatchModel.find(),
        OrderModel.find().sort({ createdAt: -1 }),
        UserModel.find().select('-password -pinCode'),
        PromoModel.find(),
        SpoilageModel.find().sort({ timestamp: -1 }),
        StaffShiftModel.find().sort({ clockIn: -1 }),
        ZReadModel.find().sort({ timestamp: -1 }),
        TableModel.find(),
        SettingModel.findOne() || SettingModel.create({}),
      ]);

      const stockLevels: Record<string, number> = {};
      menuItems.forEach((m: any) => {
        const id = m.customId || m._id.toString();
        stockLevels[id] = 20; // fallback standard level
      });

      res.status(200).json({
        menuItems,
        ingredientsInventory,
        stockBatches,
        stockLevels,
        manualStockOverrides: [],
        hiddenCategories: [],
        orders,
        groupSessions: [],
        users,
        promoVouchers,
        spoilageLogs,
        staffShifts,
        zReadAudits,
        tables,
        settings,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const createSettingsRoutes = (settingsController: SettingsController): Router => {
  const router = Router();

  router.get('/', settingsController.getSettings);
  router.post('/', authenticate, authorize(['admin']), settingsController.updateSettings);
  router.get('/snapshot', settingsController.getFullDatabaseSnapshot);

  return router;
};
