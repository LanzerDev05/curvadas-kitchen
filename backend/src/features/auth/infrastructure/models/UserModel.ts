import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../../domain/entities/User';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  phone: string;
  address?: string;
  password?: string;
  pinCode?: string;
  role: UserRole;
  loyaltyPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    password: { type: String, required: true },
    pinCode: { type: String, select: false },
    role: {
      type: String,
      enum: ['customer', 'cashier', 'kitchen', 'admin'],
      default: 'customer',
      index: true,
    },
    loyaltyPoints: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
