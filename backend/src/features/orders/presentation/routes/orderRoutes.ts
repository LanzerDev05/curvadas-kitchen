import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';

export const createOrderRoutes = (orderController: OrderController): Router => {
  const router = Router();

  router.get('/', orderController.getAll);
  router.get('/:id', orderController.getById);
  router.post('/', orderController.placeOrder);
  router.post('/place', orderController.placeOrder);
  router.post('/status', orderController.updateStatus);
  router.patch('/:id/status', orderController.updateStatus);
  router.post('/cook-item', orderController.cookItem);
  router.post('/confirm', orderController.confirmItems);
  router.delete('/:id', orderController.deleteOrder);
  router.post('/delete', orderController.deleteOrder);

  return router;
};
