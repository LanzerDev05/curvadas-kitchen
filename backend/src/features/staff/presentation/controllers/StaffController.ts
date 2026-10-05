import { Request, Response, NextFunction } from 'express';
import { StaffUseCases } from '../../application/use-cases/StaffUseCases';

export class StaffController {
  constructor(private readonly staffUseCases: StaffUseCases) {}

  clockIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { staffName, role, hourlyRate } = req.body;
      const shift = await this.staffUseCases.clockIn(staffName, role, hourlyRate);
      res.status(201).json({ success: true, shift });
    } catch (err) {
      next(err);
    }
  };

  clockOut = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { shiftId } = req.body;
      const id = req.params.id || shiftId;
      const shift = await this.staffUseCases.clockOut(id);
      res.status(200).json({ success: true, shift });
    } catch (err) {
      next(err);
    }
  };

  getShifts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const shifts = await this.staffUseCases.getAllShifts();
      res.status(200).json({ success: true, count: shifts.length, staffShifts: shifts });
    } catch (err) {
      next(err);
    }
  };

  logAdvance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { staffId, staffName, amount, reason } = req.body;
      const advance = await this.staffUseCases.logAdvance(staffId, staffName, Number(amount), reason);
      res.status(201).json({ success: true, advance });
    } catch (err) {
      next(err);
    }
  };

  getAdvances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const advances = await this.staffUseCases.getAllAdvances();
      res.status(200).json({ success: true, count: advances.length, advances });
    } catch (err) {
      next(err);
    }
  };

  getPayrolls = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payrolls = await this.staffUseCases.getAllPayrolls();
      res.status(200).json({ success: true, count: payrolls.length, payrolls });
    } catch (err) {
      next(err);
    }
  };
}
