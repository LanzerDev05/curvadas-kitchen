import { Request, Response, NextFunction } from 'express';
import { InventoryUseCases } from '../../application/use-cases/InventoryUseCases';

export class InventoryController {
  constructor(private readonly inventoryUseCases: InventoryUseCases) {}

  getAllIngredients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await this.inventoryUseCases.getAllIngredients();
      res.status(200).json({ success: true, count: items.length, ingredients: items });
    } catch (err) {
      next(err);
    }
  };

  getAllBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batches = await this.inventoryUseCases.getAllBatches();
      res.status(200).json({ success: true, count: batches.length, batches });
    } catch (err) {
      next(err);
    }
  };

  createIngredient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body.ingredient || req.body;
      const created = await this.inventoryUseCases.addIngredient(data);
      res.status(201).json({ success: true, ingredient: created });
    } catch (err) {
      next(err);
    }
  };

  updateIngredient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body.ingredient || req.body;
      const id = req.params.id || data.id || data._id;
      const updated = await this.inventoryUseCases.updateIngredient(id, data);
      res.status(200).json({ success: true, ingredient: updated });
    } catch (err) {
      next(err);
    }
  };

  deleteIngredient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id || req.body.ingredientId;
      const result = await this.inventoryUseCases.deleteIngredient(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  createBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batch = req.body.batch || req.body;
      const created = await this.inventoryUseCases.addBatch(batch);
      res.status(201).json({ success: true, batch: created });
    } catch (err) {
      next(err);
    }
  };

  updateBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batches = req.body.stockBatches || req.body;
      const result = await this.inventoryUseCases.updateBatches(batches);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  logSpoilage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ingredientId, amount, reason, loggedBy } = req.body;
      const record = await this.inventoryUseCases.logSpoilage({
        ingredientId,
        amount: Number(amount),
        reason,
        loggedBy,
      });
      res.status(201).json({ success: true, record });
    } catch (err) {
      next(err);
    }
  };

  getSpoilage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const logs = await this.inventoryUseCases.getAllSpoilage();
      res.status(200).json({ success: true, count: logs.length, spoilageLogs: logs });
    } catch (err) {
      next(err);
    }
  };
}
