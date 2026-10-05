import mongoose, { Schema, Document } from 'mongoose';
import { OrderStatus, OrderType, PaymentMethod } from '../../domain/entities/Order';

export interface IOrderDocument extends Document {
  customId?: string;
  queueNumber: number;
  orderType: OrderType;
  tableNumber?: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    orderType?: string;
    tableNumber?: string;
    pickupTime?: string;
    deliveryTime?: string;
    scheduleType?: string;
    latitude?: number;
    longitude?: number;
  };
  items: Array<{
    id?: string;
    menuItemId?: Schema.Types.ObjectId | string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalUnitPrice: number;
    selectedOptions?: Array<{ optionTitle: string; choice: { id?: string; name: string; price: number } }>;
    specialInstructions?: string;
    menuItem?: any;
  }>;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'unpaid' | 'paid';
  amountTendered?: number;
  changeAmount?: number;
  status: OrderStatus;
  logs: Array<{
    status: OrderStatus;
    timestamp: Date;
    note?: string;
  }>;
  cookedItemIds: string[];
  startedItemIds: string[];
  confirmedItemIds: string[];
  cookedBy?: string;
  cookingStartTime?: Date;
  estimatedPrepTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrderDocument>(
  {
    customId: { type: String, index: true },
    queueNumber: { type: Number, required: true, index: true },
    orderType: {
      type: String,
      enum: ['dine_in', 'takeout', 'delivery', 'pickup'],
      default: 'takeout',
      index: true,
    },
    tableNumber: { type: String, index: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: String,
      address: String,
      orderType: String,
      tableNumber: String,
      pickupTime: String,
      deliveryTime: String,
      scheduleType: String,
      latitude: Number,
      longitude: Number,
    },
    items: [
      {
        id: String,
        menuItemId: Schema.Types.Mixed,
        name: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true },
        totalUnitPrice: { type: Number, required: true },
        selectedOptions: [
          {
            optionTitle: String,
            choice: { id: String, name: String, price: Number },
          },
        ],
        specialInstructions: String,
        menuItem: Schema.Types.Mixed,
      },
    ],
    totalAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'cod', 'ewallet', 'card'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    amountTendered: Number,
    changeAmount: Number,
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    logs: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    cookedItemIds: [{ type: String }],
    startedItemIds: [{ type: String }],
    confirmedItemIds: [{ type: String }],
    cookedBy: String,
    cookingStartTime: Date,
    estimatedPrepTime: Number,
  },
  {
    timestamps: true,
  }
);

export const OrderModel = mongoose.model<IOrderDocument>('Order', OrderSchema);
