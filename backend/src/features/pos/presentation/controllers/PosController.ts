import { Request, Response, NextFunction } from 'express';
import { PosUseCases } from '../../application/use-cases/PosUseCases';

export class PosController {
  constructor(private readonly posUseCases: PosUseCases) {}

  getTables = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tables = await this.posUseCases.getAllTables();
      res.status(200).json({ success: true, count: tables.length, tables });
    } catch (err) {
      next(err);
    }
  };

  updateTableStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tableNumber, status, currentOrderId } = req.body;
      const table = await this.posUseCases.updateTableStatus(tableNumber, status, currentOrderId);
      res.status(200).json({ success: true, table });
    } catch (err) {
      next(err);
    }
  };

  createZRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { actualCashCount, closedBy } = req.body;
      const audit = await this.posUseCases.createZRead(Number(actualCashCount), closedBy);
      res.status(201).json({ success: true, audit });
    } catch (err) {
      next(err);
    }
  };

  getZReads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const audits = await this.posUseCases.getAllZReads();
      res.status(200).json({ success: true, count: audits.length, zReadAudits: audits });
    } catch (err) {
      next(err);
    }
  };
}
