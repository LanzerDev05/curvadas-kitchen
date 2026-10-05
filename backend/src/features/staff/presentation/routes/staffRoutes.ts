import { Router } from 'express';
import { StaffController } from '../controllers/StaffController';
import { authenticate, authorize } from '../../../../shared/middleware/authMiddleware';

export const createStaffRoutes = (staffController: StaffController): Router => {
  const router = Router();

  router.get('/shifts', staffController.getShifts);
  router.post('/shifts/clock-in', staffController.clockIn);
  router.post('/shifts/clock-out', staffController.clockOut);
  router.post('/clock-in', staffController.clockIn);
  router.post('/clock-out', staffController.clockOut);

  router.get('/advances', authenticate, authorize(['admin']), staffController.getAdvances);
  router.post('/advances', authenticate, authorize(['admin']), staffController.logAdvance);
  router.get('/payrolls', authenticate, authorize(['admin']), staffController.getPayrolls);

  return router;
};
