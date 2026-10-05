import { PosRepository } from '../../infrastructure/repositories/PosRepository';
import { OrderRepository } from '../../../orders/infrastructure/repositories/OrderRepository';
import { AppError } from '../../../../shared/errors/AppError';
import { wsGateway } from '../../../../core/websocket/websocketServer';

export class PosUseCases {
  constructor(
    private readonly posRepo: PosRepository,
    private readonly orderRepo: OrderRepository
  ) {}

  async getAllTables() {
    return this.posRepo.findAllTables();
  }

  async updateTableStatus(tableNumber: string, status: any, currentOrderId?: string) {
    const updated = await this.posRepo.updateTableStatus(tableNumber, status, currentOrderId);
    if (!updated) throw AppError.notFound('Table not found');

    wsGateway.broadcastToRoom('room:pos', {
      type: 'TABLE_STATUS_CHANGED',
      table: updated,
    });
    wsGateway.broadcast({ type: 'TABLE_STATUS_CHANGED', table: updated });

    return updated;
  }

  async createZRead(actualCashCount: number, closedBy: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const allOrders = await this.orderRepo.findAll();

    const todayOrders = allOrders.filter(
      (o: any) =>
        new Date(o.createdAt).toISOString().split('T')[0] === todayStr && o.status !== 'cancelled'
    );

    const cashSales = todayOrders
      .filter((o: any) => o.paymentMethod === 'cash' || o.paymentMethod === 'cod')
      .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

    const ewalletSales = todayOrders
      .filter((o: any) => o.paymentMethod === 'ewallet')
      .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

    const cardSales = todayOrders
      .filter((o: any) => o.paymentMethod === 'card')
      .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

    const totalGross = cashSales + ewalletSales + cardSales;
    const voidCount = allOrders.filter(
      (o: any) =>
        new Date(o.createdAt).toISOString().split('T')[0] === todayStr && o.status === 'cancelled'
    ).length;

    const expectedCash = cashSales;
    const discrepancy = Number(actualCashCount) - expectedCash;

    const audit = await this.posRepo.createZRead({
      date: todayStr,
      cashSales,
      ewalletSales,
      cardSales,
      totalGross,
      discountTotal: 0,
      voidCount,
      expectedCash,
      actualCashCount: Number(actualCashCount),
      discrepancy,
      closedBy: closedBy || 'Admin',
      timestamp: new Date(),
    });

    wsGateway.broadcastToRoom('room:admin', { type: 'ZREAD_SAVED', audit });
    wsGateway.broadcast({ type: 'ZREAD_SAVED', audit });

    return audit;
  }

  async getAllZReads() {
    return this.posRepo.findAllZReads();
  }
}
