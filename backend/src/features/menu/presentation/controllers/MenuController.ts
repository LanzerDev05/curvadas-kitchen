import { Request, Response, NextFunction } from 'express';
import { MenuUseCases } from '../../application/use-cases/MenuUseCases';

export class MenuController {
  constructor(private readonly menuUseCases: MenuUseCases) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const availableOnly = req.query.available === 'true';
      const items = await this.menuUseCases.getAllMenu(availableOnly);
      res.status(200).json({ success: true, count: items.length, menuItems: items });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const item = await this.menuUseCases.getMenuItem(req.params.id);
      res.status(200).json({ success: true, menuItem: item });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const menuItem = req.body.menuItem || req.body;
      const item = await this.menuUseCases.addMenuItem(menuItem);
      res.status(201).json({ success: true, menuItem: item });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const menuItem = req.body.menuItem || req.body;
      const id = req.params.id || menuItem.id || menuItem._id;
      const item = await this.menuUseCases.updateMenuItem(id, menuItem);
      res.status(200).json({ success: true, menuItem: item });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id || req.body.itemId;
      const result = await this.menuUseCases.deleteMenuItem(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  toggleAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { isAvailable } = req.body;
      const item = await this.menuUseCases.toggleAvailability(id, isAvailable);
      res.status(200).json({ success: true, menuItem: item });
    } catch (err) {
      next(err);
    }
  };
}
