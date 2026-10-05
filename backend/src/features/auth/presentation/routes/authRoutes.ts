import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../../../../shared/middleware/authMiddleware';

export const createAuthRoutes = (authController: AuthController): Router => {
  const router = Router();

  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.post('/staff-login', authController.staffLogin);
  router.get('/me', authenticate, authController.getMe);

  return router;
};
