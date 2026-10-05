import mongoose, { Schema, Document } from 'mongoose';

export interface IStaffShiftDocument extends Document {
  customId?: string;
  staffName: string;
  role: string;
  clockIn: Date;
  clockOut?: Date;
  hourlyRate: number;
  totalHours?: number;
  totalEarned?: number;
  createdAt: Date;
  updatedAt: Date;
}

const StaffShiftSchema = new Schema<IStaffShiftDocument>(
  {
    customId: { type: String, index: true },
    staffName: { type: String, required: true, trim: true, index: true },
    role: { type: String, default: 'Kitchen Crew' },
    clockIn: { type: Date, required: true, default: Date.now },
    clockOut: { type: Date },
    hourlyRate: { type: Number, default: 75 },
    totalHours: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const StaffShiftModel = mongoose.model<IStaffShiftDocument>('StaffShift', StaffShiftSchema);

export interface IStaffAdvanceDocument extends Document {
  customId?: string;
  staffId: string;
  staffName: string;
  amount: number;
  reason: string;
  date: Date;
  isDeducted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StaffAdvanceSchema = new Schema<IStaffAdvanceDocument>(
  {
    customId: { type: String, index: true },
    staffId: { type: String, required: true },
    staffName: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    isDeducted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const StaffAdvanceModel = mongoose.model<IStaffAdvanceDocument>('StaffAdvance', StaffAdvanceSchema);

export interface IPayrollDocument extends Document {
  customId?: string;
  staffId: string;
  staffName: string;
  role: string;
  periodStart: string;
  periodEnd: string;
  hourlyRate: number;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
  bonusTips: number;
  cashAdvanceDeduction: number;
  otherDeductions: number;
  netPay: number;
  status: 'paid' | 'pending';
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema = new Schema<IPayrollDocument>(
  {
    customId: { type: String, index: true },
    staffId: { type: String, required: true, index: true },
    staffName: { type: String, required: true },
    role: { type: String, required: true },
    periodStart: { type: String, required: true },
    periodEnd: { type: String, required: true },
    hourlyRate: { type: Number, required: true },
    regularHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    grossPay: { type: Number, default: 0 },
    bonusTips: { type: Number, default: 0 },
    cashAdvanceDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    status: { type: String, enum: ['paid', 'pending'], default: 'pending', index: true },
    paidAt: Date,
    notes: String,
  },
  {
    timestamps: true,
  }
);

export const PayrollModel = mongoose.model<IPayrollDocument>('Payroll', PayrollSchema);
