import mongoose, { Schema, Document } from 'mongoose';
import { TableStatus } from '../../domain/entities/Pos';

export interface ITableDocument extends Document {
  tableNumber: string;
  label?: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  seatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITableDocument>(
  {
    tableNumber: { type: String, required: true, unique: true, index: true },
    label: String,
    capacity: { type: Number, default: 4 },
    status: {
      type: String,
      enum: ['vacant', 'occupied', 'billing', 'reserved', 'cleaning'],
      default: 'vacant',
      index: true,
    },
    currentOrderId: String,
    seatedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const TableModel = mongoose.model<ITableDocument>('Table', TableSchema);

export interface IZReadDocument extends Document {
  customId?: string;
  date: string;
  cashSales: number;
  ewalletSales: number;
  cardSales: number;
  totalGross: number;
  discountTotal: number;
  voidCount: number;
  expectedCash: number;
  actualCashCount: number;
  discrepancy: number;
  closedBy: string;
  timestamp: Date;
}

const ZReadSchema = new Schema<IZReadDocument>(
  {
    customId: { type: String, index: true },
    date: { type: String, required: true, index: true },
    cashSales: { type: Number, default: 0 },
    ewalletSales: { type: Number, default: 0 },
    cardSales: { type: Number, default: 0 },
    totalGross: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    voidCount: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    actualCashCount: { type: Number, default: 0 },
    discrepancy: { type: Number, default: 0 },
    closedBy: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const ZReadModel = mongoose.model<IZReadDocument>('ZRead', ZReadSchema);
