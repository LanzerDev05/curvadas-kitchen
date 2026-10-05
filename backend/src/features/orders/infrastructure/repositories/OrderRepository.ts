import { OrderModel, IOrderDocument } from '../models/OrderModel';
import { Order } from '../../domain/entities/Order';

export class OrderRepository {
  async findAll(): Promise<IOrderDocument[]> {
    return OrderModel.find().sort({ createdAt: -1 });
  }

  async findActiveOrders(): Promise<IOrderDocument[]> {
    return OrderModel.find({ status: { $nin: ['delivered', 'cancelled'] } }).sort({ createdAt: 1 });
  }

  async findById(id: string): Promise<IOrderDocument | null> {
    return OrderModel.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }],
    });
  }

  async getNextQueueNumber(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestOrder = await OrderModel.findOne({ createdAt: { $gte: today } }).sort({ queueNumber: -1 });
    return latestOrder ? latestOrder.queueNumber + 1 : 1;
  }

  async create(order: Partial<Order>): Promise<IOrderDocument> {
    const doc = new OrderModel({
      ...order,
      customId: order.id || `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    });
    return doc.save();
  }

  async update(id: string, updates: Partial<Order>): Promise<IOrderDocument | null> {
    return OrderModel.findOneAndUpdate(
      { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }] },
      { $set: updates },
      { new: true }
    );
  }

  async delete(id: string): Promise<boolean> {
    const res = await OrderModel.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }],
    });
    return !!res;
  }
}
