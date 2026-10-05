import { Router } from 'express';
import { MenuController } from '../controllers/MenuController';
import { authenticate, authorize } from '../../../../shared/middleware/authMiddleware';

export const createMenuRoutes = (menuController: MenuController): Router => {
  const router = Router();

  router.get('/', menuController.getAll);
  router.get('/:id', menuController.getById);

  // Management routes
  router.post('/', authenticate, authorize(['admin']), menuController.create);
  router.put('/:id', authenticate, authorize(['admin']), menuController.update);
  router.delete('/:id', authenticate, authorize(['admin']), menuController.delete);
  router.patch('/:id/availability', authenticate, authorize(['admin', 'kitchen', 'cashier']), menuController.toggleAvailability);

  // Backward compatibility endpoints for legacy web admin
  router.post('/add', menuController.create);
  router.post('/edit', menuController.update);
  router.post('/delete', menuController.delete);

  return router;
};
