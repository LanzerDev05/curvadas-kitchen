import { StaffRepository } from '../../infrastructure/repositories/StaffRepository';
import { AppError } from '../../../../shared/errors/AppError';
import { wsGateway } from '../../../../core/websocket/websocketServer';

export class StaffUseCases {
  constructor(private readonly staffRepo: StaffRepository) {}

  async clockIn(staffName: string, role: string, hourlyRate: number = 75) {
    if (!staffName) throw AppError.badRequest('Staff name is required');

    const active = await this.staffRepo.findActiveShift(staffName);
    if (active) {
      throw AppError.badRequest(`${staffName} is already clocked in!`);
    }

    const shift = await this.staffRepo.createShift({
      staffName: staffName.trim(),
      role: role || 'Kitchen Crew',
      hourlyRate: hourlyRate || 75,
      clockIn: new Date(),
    });

    wsGateway.broadcast({ type: 'STAFF_SHIFT_UPDATED', action: 'CLOCK_IN', shift });
    return shift;
  }

  async clockOut(shiftId: string) {
    const shift = await this.staffRepo.findShiftById(shiftId);
    if (!shift) throw AppError.notFound('Shift not found');

    const now = new Date();
    const startMs = new Date(shift.clockIn).getTime();
    const endMs = now.getTime();
    const diffHours = Math.max(0.1, (endMs - startMs) / (1000 * 60 * 60));

    const totalHours = Number(diffHours.toFixed(2));
    const totalEarned = Number((diffHours * shift.hourlyRate).toFixed(2));

    const updated = await this.staffRepo.updateShift(shiftId, {
      clockOut: now,
      totalHours,
      totalEarned,
    });

    wsGateway.broadcast({ type: 'STAFF_SHIFT_UPDATED', action: 'CLOCK_OUT', shift: updated });
    return updated;
  }

  async getAllShifts() {
    return this.staffRepo.findAllShifts();
  }

  async logAdvance(staffId: string, staffName: string, amount: number, reason: string) {
    const advance = await this.staffRepo.createAdvance({
      staffId,
      staffName,
      amount,
      reason,
      date: new Date(),
      isDeducted: false,
    });
    return advance;
  }

  async getAllAdvances() {
    return this.staffRepo.findAllAdvances();
  }

  async getAllPayrolls() {
    return this.staffRepo.findAllPayrolls();
  }
}
