import { Router } from 'express';
import { PosController } from '../controllers/PosController';
import { authenticate, authorize } from '../../../../shared/middleware/authMiddleware';

export const createPosRoutes = (posController: PosController): Router => {
  const router = Router();

  router.get('/tables', posController.getTables);
  router.post('/tables/status', posController.updateTableStatus);

  router.get('/zread', authenticate, authorize(['admin', 'cashier']), posController.getZReads);
  router.post('/zread', authenticate, authorize(['admin', 'cashier']), posController.createZRead);

  return router;
};
