import express, { Express } from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import { container } from './core/di/container';
import { errorHandler } from './shared/middleware/errorHandler';

export const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: ENV.CORS_ORIGIN === '*' ? true : ENV.CORS_ORIGIN.split(','),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), service: "Curvada's Kitchen API" });
  });

  // API v1 Routes
  const apiV1 = express.Router();
  apiV1.use('/auth', container.authRoutes);
  apiV1.use('/menu', container.menuRoutes);
  apiV1.use('/inventory', container.inventoryRoutes);
  apiV1.use('/orders', container.orderRoutes);
  apiV1.use('/pos', container.posRoutes);
  apiV1.use('/staff', container.staffRoutes);
  apiV1.use('/promos', container.promoRoutes);
  apiV1.use('/vouchers', container.promoRoutes);
  apiV1.use('/settings', container.settingsRoutes);
  apiV1.get('/db', container.settingsController.getFullDatabaseSnapshot);

  app.use('/api/v1', apiV1);

  // Legacy /api routes fallback for backwards compatibility with existing React frontend
  const legacyApi = express.Router();
  legacyApi.use('/auth', container.authRoutes);
  legacyApi.use('/menu', container.menuRoutes);
  legacyApi.use('/inventory', container.inventoryRoutes);
  legacyApi.use('/orders', container.orderRoutes);
  legacyApi.use('/vouchers', container.promoRoutes);
  legacyApi.use('/settings', container.settingsRoutes);
  legacyApi.use('/shifts', container.staffRoutes);
  legacyApi.get('/db', container.settingsController.getFullDatabaseSnapshot);
  legacyApi.post('/zread', container.posController.createZRead);
  legacyApi.post('/spoilage', container.inventoryController.logSpoilage);

  app.use('/api', legacyApi);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
