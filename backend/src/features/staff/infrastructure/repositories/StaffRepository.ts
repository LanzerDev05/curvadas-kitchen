import { StaffShiftModel, IStaffShiftDocument, StaffAdvanceModel, IStaffAdvanceDocument, PayrollModel, IPayrollDocument } from '../models/StaffModels';
import { StaffShift, StaffAdvance, PayrollRecord } from '../../domain/entities/Staff';

export class StaffRepository {
  // Shifts
  async findAllShifts(): Promise<IStaffShiftDocument[]> {
    return StaffShiftModel.find().sort({ clockIn: -1 });
  }

  async findActiveShift(staffName: string): Promise<IStaffShiftDocument | null> {
    return StaffShiftModel.findOne({
      staffName: new RegExp(`^${staffName.trim()}$`, 'i'),
      clockOut: { $exists: false },
    });
  }

  async findShiftById(id: string): Promise<IStaffShiftDocument | null> {
    return StaffShiftModel.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }],
    });
  }

  async createShift(shift: Partial<StaffShift>): Promise<IStaffShiftDocument> {
    const doc = new StaffShiftModel({
      ...shift,
      customId: shift.id || `sft-${Date.now()}`,
    });
    return doc.save();
  }

  async updateShift(id: string, updates: Partial<StaffShift>): Promise<IStaffShiftDocument | null> {
    return StaffShiftModel.findOneAndUpdate(
      { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }] },
      { $set: updates },
      { new: true }
    );
  }

  // Advances
  async findAllAdvances(): Promise<IStaffAdvanceDocument[]> {
    return StaffAdvanceModel.find().sort({ date: -1 });
  }

  async createAdvance(data: Partial<StaffAdvance>): Promise<IStaffAdvanceDocument> {
    const doc = new StaffAdvanceModel({
      ...data,
      customId: data.id || `adv-${Date.now()}`,
    });
    return doc.save();
  }

  // Payroll
  async findAllPayrolls(): Promise<IPayrollDocument[]> {
    return PayrollModel.find().sort({ createdAt: -1 });
  }

  async createPayroll(data: Partial<PayrollRecord>): Promise<IPayrollDocument> {
    const doc = new PayrollModel({
      ...data,
      customId: data.id || `pay-${Date.now()}`,
    });
    return doc.save();
  }
}
