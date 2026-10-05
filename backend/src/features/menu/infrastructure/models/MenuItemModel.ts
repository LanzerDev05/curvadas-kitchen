import mongoose, { Schema, Document } from 'mongoose';
import { Category } from '../../domain/entities/MenuItem';

export interface IMenuItemDocument extends Document {
  customId?: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  spicy: boolean;
  popular: boolean;
  isAvailable: boolean;
  ingredients: string[];
  recipeRequirements: Array<{
    ingredientId?: Schema.Types.ObjectId;
    name: string;
    amount: number;
  }>;
  batchIngredients: Array<{
    name: string;
    batchAmount: number;
    unit: string;
    cost?: number;
  }>;
  garnishes: Array<{
    name: string;
    amount: number;
    unit: string;
    costPerUnit: number;
    selected: boolean;
  }>;
  packaging: Array<{
    name: string;
    amount: number;
    unit: string;
    costPerUnit: number;
    selected: boolean;
  }>;
  customizableOptions: Array<{
    title: string;
    choices: Array<{ id: string; name: string; price: number; isDefault: boolean }>;
  }>;
  estimatedPrepTime: number;
  targetMarginPercent: number;
  batchYieldGrams?: number;
  batchYieldUnit?: string;
  servingSizeGrams?: number;
  servingSizeUnit?: string;
  totalBatchCost?: number;
  includeRice?: boolean;
  ricePortionGrams?: number;
  riceCostPerGram?: number;
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItemDocument>(
  {
    customId: { type: String, index: true },
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    category: {
      type: String,
      enum: ['bento', 'silog', 'rice-bowl', 'drinks'],
      required: true,
      index: true,
    },
    image: { type: String, default: '' },
    spicy: { type: Boolean, default: false },
    popular: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true, index: true },
    ingredients: [{ type: String }],
    recipeRequirements: [
      {
        ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient' },
        name: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    batchIngredients: [
      {
        name: String,
        batchAmount: Number,
        unit: String,
        cost: Number,
      },
    ],
    garnishes: [
      {
        name: String,
        amount: Number,
        unit: String,
        costPerUnit: Number,
        selected: Boolean,
      },
    ],
    packaging: [
      {
        name: String,
        amount: Number,
        unit: String,
        costPerUnit: Number,
        selected: Boolean,
      },
    ],
    customizableOptions: [
      {
        title: String,
        choices: [
          {
            id: String,
            name: String,
            price: Number,
            isDefault: Boolean,
          },
        ],
      },
    ],
    estimatedPrepTime: { type: Number, default: 15 },
    targetMarginPercent: { type: Number, default: 50 },
    batchYieldGrams: Number,
    batchYieldUnit: String,
    servingSizeGrams: Number,
    servingSizeUnit: String,
    totalBatchCost: Number,
    includeRice: { type: Boolean, default: false },
    ricePortionGrams: { type: Number, default: 150 },
    riceCostPerGram: { type: Number, default: 0.04 },
  },
  {
    timestamps: true,
  }
);

export const MenuItemModel = mongoose.model<IMenuItemDocument>('MenuItem', MenuItemSchema);
