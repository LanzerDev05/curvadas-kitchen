import { Request, Response, NextFunction } from 'express';
import { OrderUseCases } from '../../application/use-cases/OrderUseCases';

export class OrderController {
  constructor(private readonly orderUseCases: OrderUseCases) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const activeOnly = req.query.active === 'true';
      const orders = activeOnly
        ? await this.orderUseCases.getActiveOrders()
        : await this.orderUseCases.getAllOrders();
      res.status(200).json({ success: true, count: orders.length, orders });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.orderUseCases.getOrderById(req.params.id);
      res.status(200).json({ success: true, order });
    } catch (err) {
      next(err);
    }
  };

  placeOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderData = req.body.order || req.body;
      const order = await this.orderUseCases.placeOrder(orderData);
      res.status(201).json({ success: true, order });
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderId, status, logs, cookingStartTime, estimatedPrepTime } = req.body;
      const id = req.params.id || orderId;
      const order = await this.orderUseCases.updateStatus(id, status, logs, cookingStartTime, estimatedPrepTime);
      res.status(200).json({ success: true, order });
    } catch (err) {
      next(err);
    }
  };

  cookItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.orderUseCases.cookItem(req.body);
      res.status(200).json({ success: true, order });
    } catch (err) {
      next(err);
    }
  };

  confirmItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderId, confirmedItemIds } = req.body;
      const order = await this.orderUseCases.confirmItems(orderId, confirmedItemIds);
      res.status(200).json({ success: true, order });
    } catch (err) {
      next(err);
    }
  };

  deleteOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id || req.body.orderId;
      const result = await this.orderUseCases.deleteOrder(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
