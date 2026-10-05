import { Router } from 'express';
import { InventoryController } from '../controllers/InventoryController';
import { authenticate, authorize } from '../../../../shared/middleware/authMiddleware';

export const createInventoryRoutes = (inventoryController: InventoryController): Router => {
  const router = Router();

  router.get('/ingredients', inventoryController.getAllIngredients);
  router.get('/batches', inventoryController.getAllBatches);
  router.get('/spoilage', inventoryController.getSpoilage);

  router.post('/ingredients', authenticate, authorize(['admin']), inventoryController.createIngredient);
  router.put('/ingredients/:id', authenticate, authorize(['admin']), inventoryController.updateIngredient);
  router.delete('/ingredients/:id', authenticate, authorize(['admin']), inventoryController.deleteIngredient);

  router.post('/batches', authenticate, authorize(['admin']), inventoryController.createBatch);
  router.post('/batches/update', authenticate, authorize(['admin']), inventoryController.updateBatches);
  router.post('/spoilage', authenticate, authorize(['admin', 'kitchen', 'cashier']), inventoryController.logSpoilage);

  // Backward compatibility routes for legacy frontend
  router.post('/add', inventoryController.createIngredient);
  router.post('/edit', inventoryController.updateIngredient);
  router.post('/delete', inventoryController.deleteIngredient);
  router.post('/update', inventoryController.updateBatches);

  return router;
};
