import mongoose, { Schema, Document } from 'mongoose';

export interface IIngredientDocument extends Document {
  customId?: string;
  name: string;
  quantity: number;
  unit: string;
  lowStockAlert: number;
  costPerUnit: number;
  packCount?: number;
  packSize?: number;
  packCost?: number;
  supplier?: {
    name: string;
    contact: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const IngredientSchema = new Schema<IIngredientDocument>(
  {
    customId: { type: String, index: true },
    name: { type: String, required: true, trim: true, unique: true, index: true },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true },
    lowStockAlert: { type: Number, default: 500 },
    costPerUnit: { type: Number, default: 0 },
    packCount: Number,
    packSize: Number,
    packCost: Number,
    supplier: {
      name: String,
      contact: String,
      email: String,
    },
  },
  {
    timestamps: true,
  }
);

export const IngredientModel = mongoose.model<IIngredientDocument>('Ingredient', IngredientSchema);

export interface IStockBatchDocument extends Document {
  customId?: string;
  ingredientId: Schema.Types.ObjectId | string;
  ingredientName: string;
  batchNumber: string;
  receivedDate: Date;
  expiryDate?: Date;
  initialQuantity: number;
  remainingQuantity: number;
  unit: string;
  costPerUnit: number;
  packCost?: number;
  supplierName?: string;
  invoiceNumber?: string;
  notes?: string;
  status: 'active' | 'depleted' | 'expired' | 'discarded';
  createdAt: Date;
  updatedAt: Date;
}

const StockBatchSchema = new Schema<IStockBatchDocument>(
  {
    customId: { type: String, index: true },
    ingredientId: { type: Schema.Types.Mixed, required: true, index: true },
    ingredientName: { type: String, required: true, index: true },
    batchNumber: { type: String, required: true },
    receivedDate: { type: Date, required: true, default: Date.now, index: true },
    expiryDate: { type: Date },
    initialQuantity: { type: Number, required: true },
    remainingQuantity: { type: Number, required: true },
    unit: { type: String, required: true },
    costPerUnit: { type: Number, required: true },
    packCost: Number,
    supplierName: String,
    invoiceNumber: String,
    notes: String,
    status: {
      type: String,
      enum: ['active', 'depleted', 'expired', 'discarded'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const StockBatchModel = mongoose.model<IStockBatchDocument>('StockBatch', StockBatchSchema);

export interface ISpoilageDocument extends Document {
  customId?: string;
  ingredientId: Schema.Types.Mixed;
  ingredientName: string;
  amount: number;
  unit: string;
  cost: number;
  reason: 'expired' | 'spilled' | 'damaged' | 'quality_defect';
  timestamp: Date;
  loggedBy: string;
}

const SpoilageSchema = new Schema<ISpoilageDocument>(
  {
    customId: { type: String, index: true },
    ingredientId: { type: Schema.Types.Mixed, required: true },
    ingredientName: { type: String, required: true },
    amount: { type: Number, required: true },
    unit: { type: String, required: true },
    cost: { type: Number, required: true },
    reason: {
      type: String,
      enum: ['expired', 'spilled', 'damaged', 'quality_defect'],
      default: 'expired',
    },
    timestamp: { type: Date, default: Date.now, index: true },
    loggedBy: { type: String, default: 'Staff' },
  },
  {
    timestamps: true,
  }
);

export const SpoilageModel = mongoose.model<ISpoilageDocument>('Spoilage', SpoilageSchema);
