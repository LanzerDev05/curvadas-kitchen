import { OrderRepository } from '../../infrastructure/repositories/OrderRepository';
import { InventoryUseCases } from '../../../inventory/application/use-cases/InventoryUseCases';
import { MenuRepository } from '../../../menu/infrastructure/repositories/MenuRepository';
import { Order, OrderStatus } from '../../domain/entities/Order';
import { AppError } from '../../../../shared/errors/AppError';
import { wsGateway } from '../../../../core/websocket/websocketServer';

export class OrderUseCases {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly inventoryUseCases: InventoryUseCases,
    private readonly menuRepo: MenuRepository
  ) {}

  async getAllOrders() {
    return this.orderRepo.findAll();
  }

  async getActiveOrders() {
    return this.orderRepo.findActiveOrders();
  }

  async getOrderById(id: string) {
    const order = await this.orderRepo.findById(id);
    if (!order) throw AppError.notFound('Order not found');
    return order;
  }

  async placeOrder(orderData: Partial<Order>) {
    if (!orderData.items || orderData.items.length === 0) {
      throw AppError.badRequest('Order must have at least one item');
    }
    if (!orderData.customer || !orderData.customer.name || !orderData.customer.phone) {
      throw AppError.badRequest('Customer name and phone are required');
    }

    // 1. Assign queue number
    const queueNumber = await this.orderRepo.getNextQueueNumber();

    // 2. Prepare initial log
    const initialLogs = [
      {
        status: 'pending' as OrderStatus,
        timestamp: new Date(),
        note: `Order placed via ${orderData.orderType || 'counter'}`,
      },
    ];

    // 3. Save Order
    const createdOrder = await this.orderRepo.create({
      ...orderData,
      queueNumber,
      status: 'pending',
      logs: initialLogs,
    });

    // 4. Extract recipe requirements and deduct FIFO stock
    const requirementsToConsume: Array<{ name: string; amount: number; orderQty: number }> = [];

    for (const item of orderData.items) {
      const orderQty = item.quantity || 1;
      let menuItemDoc: any = null;

      if (item.menuItemId) {
        menuItemDoc = await this.menuRepo.findById(item.menuItemId.toString());
      }
      if (!menuItemDoc && (item as any).menuItem?.name) {
        const all = await this.menuRepo.findAll();
        menuItemDoc = all.find((m: any) => m.name.toLowerCase() === (item as any).menuItem.name.toLowerCase());
      }

      if (menuItemDoc && menuItemDoc.recipeRequirements) {
        for (const req of menuItemDoc.recipeRequirements) {
          requirementsToConsume.push({
            name: req.name,
            amount: req.amount,
            orderQty,
          });
        }
      }
    }

    if (requirementsToConsume.length > 0) {
      await this.inventoryUseCases.consumeIngredientsFIFO(requirementsToConsume);
    }

    // 5. Broadcast to WebSocket rooms
    const orderObj = createdOrder.toObject ? createdOrder.toObject() : createdOrder;
    wsGateway.broadcastToRoom('room:kitchen', { type: 'NEW_ORDER', order: orderObj });
    wsGateway.broadcastToRoom('room:pos', { type: 'NEW_ORDER', order: orderObj });
    wsGateway.broadcastToRoom('room:admin', { type: 'NEW_ORDER', order: orderObj });
    wsGateway.broadcast({ type: 'NEW_ORDER', order: orderObj });

    return createdOrder;
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    logs?: any[],
    cookingStartTime?: string | Date,
    estimatedPrepTime?: number
  ) {
    const existing = await this.orderRepo.findById(orderId);
    if (!existing) throw AppError.notFound('Order not found');

    const previousStatus = existing.status;
    const updatedLogs = logs || [
      ...existing.logs,
      {
        status,
        timestamp: new Date(),
        note: `Status transitioned to ${status}`,
      },
    ];

    // If order is cancelled, rollback ingredient stock
    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      const requirementsToRestore: Array<{ name: string; amount: number; orderQty: number }> = [];
      for (const item of existing.items) {
        const orderQty = item.quantity || 1;
        const menuItemDoc = item.menuItemId ? await this.menuRepo.findById(item.menuItemId.toString()) : null;
        if (menuItemDoc && menuItemDoc.recipeRequirements) {
          for (const req of menuItemDoc.recipeRequirements) {
            requirementsToRestore.push({
              name: req.name,
              amount: req.amount,
              orderQty,
            });
          }
        }
      }
      if (requirementsToRestore.length > 0) {
        await this.inventoryUseCases.restoreIngredients(requirementsToRestore);
      }
    }

    const updated = await this.orderRepo.update(orderId, {
      status,
      logs: updatedLogs,
      cookingStartTime: cookingStartTime ? new Date(cookingStartTime) : existing.cookingStartTime,
      estimatedPrepTime: estimatedPrepTime ?? existing.estimatedPrepTime,
    });

    const orderObj = updated?.toObject ? updated.toObject() : updated;
    wsGateway.broadcastToRoom(`room:order_${orderId}`, { type: 'ORDER_UPDATED', order: orderObj });
    wsGateway.broadcastToRoom('room:kitchen', { type: 'ORDER_UPDATED', order: orderObj });
    wsGateway.broadcastToRoom('room:pos', { type: 'ORDER_UPDATED', order: orderObj });
    wsGateway.broadcast({ type: 'ORDER_UPDATED', order: orderObj });

    return updated;
  }

  async cookItem(dto: {
    orderId: string;
    cookedItemIds?: string[];
    startedItemIds?: string[];
    cookedBy?: string;
    estimatedPrepTime?: number;
    cookingStartTime?: string | Date;
  }) {
    const existing = await this.orderRepo.findById(dto.orderId);
    if (!existing) throw AppError.notFound('Order not found');

    const updated = await this.orderRepo.update(dto.orderId, {
      cookedItemIds: dto.cookedItemIds ?? existing.cookedItemIds,
      startedItemIds: dto.startedItemIds ?? existing.startedItemIds,
      cookedBy: dto.cookedBy ?? existing.cookedBy,
      estimatedPrepTime: dto.estimatedPrepTime ?? existing.estimatedPrepTime,
      cookingStartTime: dto.cookingStartTime ? new Date(dto.cookingStartTime) : existing.cookingStartTime,
    });

    const orderObj = updated?.toObject ? updated.toObject() : updated;
    wsGateway.broadcastToRoom('room:kitchen', { type: 'COOK_ITEM_TOGGLED', order: orderObj });
    wsGateway.broadcastToRoom('room:pos', { type: 'COOK_ITEM_TOGGLED', order: orderObj });
    wsGateway.broadcast({ type: 'ORDER_UPDATED', order: orderObj });

    return updated;
  }

  async confirmItems(orderId: string, confirmedItemIds: string[]) {
    const updated = await this.orderRepo.update(orderId, { confirmedItemIds });
    if (!updated) throw AppError.notFound('Order not found');
    wsGateway.broadcast({ type: 'ORDER_UPDATED', order: updated });
    return updated;
  }

  async deleteOrder(orderId: string) {
    const deleted = await this.orderRepo.delete(orderId);
    if (!deleted) throw AppError.notFound('Order not found');
    wsGateway.broadcast({ type: 'ORDER_DELETED', orderId });
    return { success: true };
  }
}
