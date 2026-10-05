import { IngredientModel, IIngredientDocument, StockBatchModel, IStockBatchDocument, SpoilageModel, ISpoilageDocument } from '../models/InventoryModels';
import { IngredientStock, StockBatch, SpoilageRecord } from '../../domain/entities/Inventory';

export class InventoryRepository {
  // Ingredients
  async findAllIngredients(): Promise<IIngredientDocument[]> {
    return IngredientModel.find().sort({ name: 1 });
  }

  async findIngredientById(id: string): Promise<IIngredientDocument | null> {
    return IngredientModel.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }],
    });
  }

  async findIngredientByName(name: string): Promise<IIngredientDocument | null> {
    return IngredientModel.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
  }

  async createIngredient(data: Partial<IngredientStock>): Promise<IIngredientDocument> {
    const doc = new IngredientModel({
      ...data,
      customId: data.id || `ing-${Date.now()}`,
    });
    return doc.save();
  }

  async updateIngredient(id: string, data: Partial<IngredientStock>): Promise<IIngredientDocument | null> {
    return IngredientModel.findOneAndUpdate(
      { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }] },
      { $set: data },
      { new: true }
    );
  }

  async deleteIngredient(id: string): Promise<boolean> {
    const res = await IngredientModel.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }],
    });
    return !!res;
  }

  // Stock Batches
  async findAllBatches(): Promise<IStockBatchDocument[]> {
    return StockBatchModel.find().sort({ receivedDate: 1 });
  }

  async findActiveBatchesForIngredient(ingredientName: string): Promise<IStockBatchDocument[]> {
    return StockBatchModel.find({
      ingredientName: new RegExp(`^${ingredientName.trim()}$`, 'i'),
      status: 'active',
      remainingQuantity: { $gt: 0 },
    }).sort({ receivedDate: 1 }); // Oldest first for FIFO
  }

  async createBatch(batch: Partial<StockBatch>): Promise<IStockBatchDocument> {
    const doc = new StockBatchModel({
      ...batch,
      customId: batch.id || `lot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    });
    return doc.save();
  }

  async updateBatch(id: string, batch: Partial<StockBatch>): Promise<IStockBatchDocument | null> {
    return StockBatchModel.findOneAndUpdate(
      { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }] },
      { $set: batch },
      { new: true }
    );
  }

  async deleteBatch(id: string): Promise<boolean> {
    const res = await StockBatchModel.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }],
    });
    return !!res;
  }

  // Spoilage Logs
  async findAllSpoilage(): Promise<ISpoilageDocument[]> {
    return SpoilageModel.find().sort({ timestamp: -1 });
  }

  async createSpoilage(spoilage: Partial<SpoilageRecord>): Promise<ISpoilageDocument> {
    const doc = new SpoilageModel({
      ...spoilage,
      customId: spoilage.id || `spl-${Date.now()}`,
    });
    return doc.save();
  }
}
