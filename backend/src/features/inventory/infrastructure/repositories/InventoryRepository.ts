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
    const query: any[] = [];
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) query.push({ _id: id });
    if (id) query.push({ customId: id });
    if (data.name) query.push({ name: new RegExp(`^${data.name.trim()}$`, 'i') });

    return IngredientModel.findOneAndUpdate(
      query.length > 0 ? { $or: query } : { customId: id },
      { $set: { ...data, customId: id || data.id || `ing-${Date.now()}` } },
      { new: true, upsert: true }
    );
  }

  async bulkUpsertIngredients(ingredients: Partial<IngredientStock>[]): Promise<void> {
    for (const ing of ingredients) {
      const id = ing.id || (ing as any)._id || (ing as any).customId;
      const query: any[] = [];
      if (id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) query.push({ _id: id });
      if (id) query.push({ customId: id });
      if (ing.name) query.push({ name: new RegExp(`^${ing.name.trim()}$`, 'i') });

      await IngredientModel.findOneAndUpdate(
        query.length > 0 ? { $or: query } : { name: ing.name },
        { $set: { ...ing, customId: id || `ing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` } },
        { upsert: true, new: true }
      );
    }
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
    const query: any[] = [];
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) query.push({ _id: id });
    if (id) query.push({ customId: id });

    return StockBatchModel.findOneAndUpdate(
      query.length > 0 ? { $or: query } : { customId: id },
      { $set: { ...batch, customId: id || batch.id } },
      { new: true, upsert: true }
    );
  }

  async bulkUpsertBatches(batches: Partial<StockBatch>[]): Promise<void> {
    for (const b of batches) {
      const id = b.id || (b as any)._id || (b as any).customId;
      const query: any[] = [];
      if (id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) query.push({ _id: id });
      if (id) query.push({ customId: id });

      if (query.length > 0) {
        await StockBatchModel.findOneAndUpdate(
          { $or: query },
          { $set: { ...b, customId: id } },
          { upsert: true, new: true }
        );
      } else {
        await this.createBatch(b);
      }
    }
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
