import mongoose, { Schema, Document } from 'mongoose';

export interface PromoVoucher {
  id?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSpend: number;
  isActive: boolean;
}

export interface IPromoDocument extends Document {
  customId?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSpend: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromoSchema = new Schema<IPromoDocument>(
  {
    customId: { type: String, index: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    discountValue: { type: Number, required: true },
    minSpend: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

export const PromoModel = mongoose.model<IPromoDocument>('PromoVoucher', PromoSchema);

export class PromoRepository {
  async findAll(): Promise<IPromoDocument[]> {
    return PromoModel.find().sort({ createdAt: -1 });
  }

  async findByCode(code: string): Promise<IPromoDocument | null> {
    return PromoModel.findOne({ code: code.toUpperCase().trim() });
  }

  async create(data: Partial<PromoVoucher>): Promise<IPromoDocument> {
    const doc = new PromoModel({
      ...data,
      customId: data.id || `vch-${Date.now()}`,
      code: data.code?.toUpperCase().trim(),
    });
    return doc.save();
  }

  async update(id: string, data: Partial<PromoVoucher>): Promise<IPromoDocument | null> {
    return PromoModel.findOneAndUpdate(
      { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }] },
      { $set: data },
      { new: true }
    );
  }

  async delete(id: string): Promise<boolean> {
    const res = await PromoModel.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }],
    });
    return !!res;
  }
}
