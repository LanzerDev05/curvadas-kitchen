// Repositories
import { UserRepository } from '../../features/auth/infrastructure/repositories/UserRepository';
import { MenuRepository } from '../../features/menu/infrastructure/repositories/MenuRepository';
import { InventoryRepository } from '../../features/inventory/infrastructure/repositories/InventoryRepository';
import { OrderRepository } from '../../features/orders/infrastructure/repositories/OrderRepository';
import { PosRepository } from '../../features/pos/infrastructure/repositories/PosRepository';
import { StaffRepository } from '../../features/staff/infrastructure/repositories/StaffRepository';
import { PromoRepository } from '../../features/promos/infrastructure/repositories/PromoRepository';

// Use Cases
import { AuthUseCases } from '../../features/auth/application/use-cases/AuthUseCases';
import { MenuUseCases } from '../../features/menu/application/use-cases/MenuUseCases';
import { InventoryUseCases } from '../../features/inventory/application/use-cases/InventoryUseCases';
import { OrderUseCases } from '../../features/orders/application/use-cases/OrderUseCases';
import { PosUseCases } from '../../features/pos/application/use-cases/PosUseCases';
import { StaffUseCases } from '../../features/staff/application/use-cases/StaffUseCases';
import { PromoUseCases } from '../../features/promos/presentation/routes/promoRoutes';

// Controllers
import { AuthController } from '../../features/auth/presentation/controllers/AuthController';
import { MenuController } from '../../features/menu/presentation/controllers/MenuController';
import { InventoryController } from '../../features/inventory/presentation/controllers/InventoryController';
import { OrderController } from '../../features/orders/presentation/controllers/OrderController';
import { PosController } from '../../features/pos/presentation/controllers/PosController';
import { StaffController } from '../../features/staff/presentation/controllers/StaffController';
import { PromoController, createPromoRoutes } from '../../features/promos/presentation/routes/promoRoutes';
import { SettingsController, createSettingsRoutes } from '../../features/settings/presentation/routes/settingsRoutes';

// Routes
import { createAuthRoutes } from '../../features/auth/presentation/routes/authRoutes';
import { createMenuRoutes } from '../../features/menu/presentation/routes/menuRoutes';
import { createInventoryRoutes } from '../../features/inventory/presentation/routes/inventoryRoutes';
import { createOrderRoutes } from '../../features/orders/presentation/routes/orderRoutes';
import { createPosRoutes } from '../../features/pos/presentation/routes/posRoutes';
import { createStaffRoutes } from '../../features/staff/presentation/routes/staffRoutes';

export class Container {
  // Repositories
  public readonly userRepo = new UserRepository();
  public readonly menuRepo = new MenuRepository();
  public readonly inventoryRepo = new InventoryRepository();
  public readonly orderRepo = new OrderRepository();
  public readonly posRepo = new PosRepository();
  public readonly staffRepo = new StaffRepository();
  public readonly promoRepo = new PromoRepository();

  // Use Cases
  public readonly authUseCases = new AuthUseCases(this.userRepo);
  public readonly menuUseCases = new MenuUseCases(this.menuRepo);
  public readonly inventoryUseCases = new InventoryUseCases(this.inventoryRepo);
  public readonly orderUseCases = new OrderUseCases(this.orderRepo, this.inventoryUseCases, this.menuRepo);
  public readonly posUseCases = new PosUseCases(this.posRepo, this.orderRepo);
  public readonly staffUseCases = new StaffUseCases(this.staffRepo);
  public readonly promoUseCases = new PromoUseCases(this.promoRepo);

  // Controllers
  public readonly authController = new AuthController(this.authUseCases);
  public readonly menuController = new MenuController(this.menuUseCases);
  public readonly inventoryController = new InventoryController(this.inventoryUseCases);
  public readonly orderController = new OrderController(this.orderUseCases);
  public readonly posController = new PosController(this.posUseCases);
  public readonly staffController = new StaffController(this.staffUseCases);
  public readonly promoController = new PromoController(this.promoUseCases);
  public readonly settingsController = new SettingsController();

  // Routers
  public readonly authRoutes = createAuthRoutes(this.authController);
  public readonly menuRoutes = createMenuRoutes(this.menuController);
  public readonly inventoryRoutes = createInventoryRoutes(this.inventoryController);
  public readonly orderRoutes = createOrderRoutes(this.orderController);
  public readonly posRoutes = createPosRoutes(this.posController);
  public readonly staffRoutes = createStaffRoutes(this.staffController);
  public readonly promoRoutes = createPromoRoutes(this.promoController);
  public readonly settingsRoutes = createSettingsRoutes(this.settingsController);
}

export const container = new Container();
