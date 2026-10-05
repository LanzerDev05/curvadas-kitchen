import { InventoryRepository } from '../../infrastructure/repositories/InventoryRepository';
import { IngredientStock, StockBatch, SpoilageRecord } from '../../domain/entities/Inventory';
import { AppError } from '../../../../shared/errors/AppError';
import { wsGateway } from '../../../../core/websocket/websocketServer';

export interface FIFOConsumptionLayer {
  batchId: string;
  batchNumber: string;
  receivedDate: string;
  costPerUnit: number;
  quantityUsed: number;
  layerCost: number;
}

export class InventoryUseCases {
  constructor(private readonly inventoryRepo: InventoryRepository) {}

  async getAllIngredients() {
    return this.inventoryRepo.findAllIngredients();
  }

  async getAllBatches() {
    return this.inventoryRepo.findAllBatches();
  }

  async addIngredient(data: Partial<IngredientStock>) {
    if (!data.name || !data.unit) {
      throw AppError.badRequest('Ingredient name and unit are required');
    }
    const created = await this.inventoryRepo.createIngredient(data);
    wsGateway.broadcast({ type: 'INVENTORY_UPDATED', action: 'ADD_INGREDIENT', ingredient: created });
    return created;
  }

  async updateIngredient(id: string, data: Partial<IngredientStock>) {
    const updated = await this.inventoryRepo.updateIngredient(id, data);
    if (!updated) throw AppError.notFound('Ingredient not found');
    wsGateway.broadcast({ type: 'INVENTORY_UPDATED', action: 'UPDATE_INGREDIENT', ingredient: updated });
    return updated;
  }

  async deleteIngredient(id: string) {
    const deleted = await this.inventoryRepo.deleteIngredient(id);
    if (!deleted) throw AppError.notFound('Ingredient not found');
    wsGateway.broadcast({ type: 'INVENTORY_UPDATED', action: 'DELETE_INGREDIENT', ingredientId: id });
    return { success: true };
  }

  async addBatch(batch: Partial<StockBatch>) {
    if (!batch.ingredientName || !batch.initialQuantity || !batch.costPerUnit) {
      throw AppError.badRequest('Ingredient name, initial quantity, and cost per unit are required');
    }

    const created = await this.inventoryRepo.createBatch({
      ...batch,
      remainingQuantity: batch.remainingQuantity ?? batch.initialQuantity,
      status: 'active',
      receivedDate: batch.receivedDate || new Date(),
    });

    // Also increment main ingredient total quantity
    const ing = await this.inventoryRepo.findIngredientByName(batch.ingredientName);
    if (ing) {
      ing.quantity += batch.initialQuantity;
      await ing.save();
    }

    wsGateway.broadcast({ type: 'BATCH_UPDATED', action: 'ADD_BATCH', batch: created });
    return created;
  }

  async updateBatches(batches: StockBatch[]) {
    for (const b of batches) {
      if (b.id) {
        await this.inventoryRepo.updateBatch(b.id, b);
      }
    }
    wsGateway.broadcast({ type: 'BATCH_UPDATED', action: 'BULK_UPDATE' });
    return { success: true };
  }

  /**
   * Consume ingredients using FIFO layer deduction.
   */
  async consumeIngredientsFIFO(requirements: Array<{ name: string; amount: number; orderQty: number }>) {
    for (const req of requirements) {
      const ing = await this.inventoryRepo.findIngredientByName(req.name);
      if (!ing) continue;

      const totalNeeded = req.amount * req.orderQty;
      ing.quantity = Math.max(0, Number((ing.quantity - totalNeeded).toFixed(4)));
      await ing.save();

      // Deplete FIFO batches (oldest first)
      const batches = await this.inventoryRepo.findActiveBatchesForIngredient(req.name);
      let remainingToDeduct = totalNeeded;

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;
        if (batch.remainingQuantity <= remainingToDeduct) {
          remainingToDeduct -= batch.remainingQuantity;
          batch.remainingQuantity = 0;
          batch.status = 'depleted';
        } else {
          batch.remainingQuantity = Number((batch.remainingQuantity - remainingToDeduct).toFixed(4));
          remainingToDeduct = 0;
        }
        await batch.save();
      }
    }
  }

  /**
   * Restore ingredients on order cancellation.
   */
  async restoreIngredients(requirements: Array<{ name: string; amount: number; orderQty: number }>) {
    for (const req of requirements) {
      const ing = await this.inventoryRepo.findIngredientByName(req.name);
      if (!ing) continue;

      const totalToRestore = req.amount * req.orderQty;
      ing.quantity = Number((ing.quantity + totalToRestore).toFixed(4));
      await ing.save();
    }
  }

  /**
   * Spoilage logging.
   */
  async logSpoilage(dto: { ingredientId: string; amount: number; reason: any; loggedBy: string }) {
    const ing = await this.inventoryRepo.findIngredientById(dto.ingredientId);
    if (!ing) throw AppError.notFound('Ingredient not found');

    const cost = dto.amount * (ing.costPerUnit || 0);
    ing.quantity = Math.max(0, ing.quantity - dto.amount);
    await ing.save();

    const record = await this.inventoryRepo.createSpoilage({
      ingredientId: ing._id.toString(),
      ingredientName: ing.name,
      amount: dto.amount,
      unit: ing.unit,
      cost,
      reason: dto.reason,
      loggedBy: dto.loggedBy || 'Staff',
      timestamp: new Date(),
    });

    wsGateway.broadcast({ type: 'SPOILAGE_LOGGED', record });
    return record;
  }

  async getAllSpoilage() {
    return this.inventoryRepo.findAllSpoilage();
  }
}
