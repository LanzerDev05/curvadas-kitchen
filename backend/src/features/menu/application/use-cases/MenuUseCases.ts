import { MenuRepository } from '../../infrastructure/repositories/MenuRepository';
import { MenuItem } from '../../domain/entities/MenuItem';
import { AppError } from '../../../../shared/errors/AppError';
import { wsGateway } from '../../../../core/websocket/websocketServer';

export class MenuUseCases {
  constructor(private readonly menuRepo: MenuRepository) {}

  async getAllMenu(availableOnly: boolean = false) {
    if (availableOnly) {
      return this.menuRepo.findAvailable();
    }
    return this.menuRepo.findAll();
  }

  async getMenuItem(id: string) {
    const item = await this.menuRepo.findById(id);
    if (!item) {
      throw AppError.notFound('Menu item not found');
    }
    return item;
  }

  async addMenuItem(item: Partial<MenuItem>) {
    if (!item.name || !item.price || !item.category) {
      throw AppError.badRequest('Name, price, and category are required');
    }
    const created = await this.menuRepo.create(item);

    wsGateway.broadcast({
      type: 'MENU_UPDATED',
      action: 'ADD',
      item: created,
    });

    return created;
  }

  async updateMenuItem(id: string, item: Partial<MenuItem>) {
    const updated = await this.menuRepo.update(id, item);
    if (!updated) {
      throw AppError.notFound('Menu item not found');
    }

    wsGateway.broadcast({
      type: 'MENU_UPDATED',
      action: 'EDIT',
      item: updated,
    });

    return updated;
  }

  async deleteMenuItem(id: string) {
    const deleted = await this.menuRepo.delete(id);
    if (!deleted) {
      throw AppError.notFound('Menu item not found');
    }

    wsGateway.broadcast({
      type: 'MENU_UPDATED',
      action: 'DELETE',
      itemId: id,
    });

    return { success: true, message: 'Menu item deleted successfully' };
  }

  async toggleAvailability(id: string, isAvailable: boolean) {
    const updated = await this.menuRepo.toggleAvailability(id, isAvailable);
    if (!updated) {
      throw AppError.notFound('Menu item not found');
    }

    wsGateway.broadcast({
      type: 'AVAILABILITY_CHANGED',
      itemId: id,
      isAvailable,
    });

    return updated;
  }
}
