import { MenuItemModel, IMenuItemDocument } from '../models/MenuItemModel';
import { MenuItem } from '../../domain/entities/MenuItem';

export class MenuRepository {
  async findAll(): Promise<IMenuItemDocument[]> {
    return MenuItemModel.find().sort({ category: 1, name: 1 });
  }

  async findAvailable(): Promise<IMenuItemDocument[]> {
    return MenuItemModel.find({ isAvailable: true }).sort({ category: 1, name: 1 });
  }

  async findById(id: string): Promise<IMenuItemDocument | null> {
    return MenuItemModel.findById(id);
  }

  async findByCustomId(customId: string): Promise<IMenuItemDocument | null> {
    return MenuItemModel.findOne({ customId });
  }

  async create(item: Partial<MenuItem>): Promise<IMenuItemDocument> {
    const doc = new MenuItemModel({
      ...item,
      customId: item.id || `dish-${Date.now()}`,
    });
    return doc.save();
  }

  async update(id: string, item: Partial<MenuItem>): Promise<IMenuItemDocument | null> {
    return MenuItemModel.findOneAndUpdate(
      { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }] },
      { $set: item },
      { new: true }
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await MenuItemModel.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }],
    });
    return !!result;
  }

  async toggleAvailability(id: string, isAvailable: boolean): Promise<IMenuItemDocument | null> {
    return MenuItemModel.findOneAndUpdate(
      { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }] },
      { $set: { isAvailable } },
      { new: true }
    );
  }
}
