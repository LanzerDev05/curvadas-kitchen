import { TableModel, ITableDocument, ZReadModel, IZReadDocument } from '../models/PosModels';
import { RestaurantTable, ZReadAudit } from '../../domain/entities/Pos';

export class PosRepository {
  // Tables
  async findAllTables(): Promise<ITableDocument[]> {
    return TableModel.find().sort({ tableNumber: 1 });
  }

  async findTableByNumber(tableNumber: string): Promise<ITableDocument | null> {
    return TableModel.findOne({ tableNumber });
  }

  async upsertTable(tableData: Partial<RestaurantTable>): Promise<ITableDocument> {
    return TableModel.findOneAndUpdate(
      { tableNumber: tableData.tableNumber },
      { $set: tableData },
      { upsert: true, new: true }
    );
  }

  async updateTableStatus(tableNumber: string, status: any, currentOrderId?: string): Promise<ITableDocument | null> {
    return TableModel.findOneAndUpdate(
      { tableNumber },
      {
        $set: {
          status,
          currentOrderId: currentOrderId || undefined,
          seatedAt: status === 'occupied' ? new Date() : undefined,
        },
      },
      { new: true }
    );
  }

  // Z-Read Audits
  async findAllZReads(): Promise<IZReadDocument[]> {
    return ZReadModel.find().sort({ timestamp: -1 });
  }

  async createZRead(data: Partial<ZReadAudit>): Promise<IZReadDocument> {
    const doc = new ZReadModel({
      ...data,
      customId: data.id || `zr-${Date.now()}`,
    });
    return doc.save();
  }
}
