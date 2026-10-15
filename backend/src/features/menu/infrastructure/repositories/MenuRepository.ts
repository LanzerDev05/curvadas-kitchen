import { MenuItemModel, IMenuItemDocument, RecipeTemplateModel, IRecipeTemplateDocument } from '../models/MenuItemModel';
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
    const query: any[] = [];
    if (id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) query.push({ _id: id });
    if (id) query.push({ customId: id });
    if (item.name) query.push({ name: new RegExp(`^${item.name.trim()}$`, 'i') });

    return MenuItemModel.findOneAndUpdate(
      query.length > 0 ? { $or: query } : { customId: id },
      { $set: { ...item, customId: id || item.id || `dish-${Date.now()}` } },
      { new: true, upsert: true }
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

  // --- Recipe Templates Persistence ---
  async findAllTemplates(): Promise<any[]> {
    const docs = await RecipeTemplateModel.find().sort({ name: 1 });
    return docs.map((doc) => {
      const obj = doc.toObject ? doc.toObject() : doc;
      const validId = (obj.customId && obj.customId !== 'undefined') ? obj.customId : `template-${obj._id}`;
      return {
        ...obj,
        id: validId,
        customId: validId,
      };
    });
  }

  async saveTemplates(templates: any[]): Promise<any[]> {
    const results: any[] = [];
    for (const tmpl of templates) {
      if (!tmpl) continue;
      const rawId = tmpl.id || tmpl.customId;
      const validId = (rawId && rawId !== 'undefined') ? rawId : `template-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const cleanName = (tmpl.name || '').trim();
      if (!cleanName) continue;

      const saved = await RecipeTemplateModel.findOneAndUpdate(
        { $or: [{ customId: validId }, { name: new RegExp(`^${cleanName}$`, 'i') }] },
        { $set: { ...tmpl, customId: validId, id: validId } },
        { upsert: true, new: true }
      );
      if (saved) {
        const obj = saved.toObject ? saved.toObject() : saved;
        results.push({ ...obj, id: obj.customId || String(obj._id) });
      }
    }
    return results;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const res = await RecipeTemplateModel.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { customId: id }],
    });
    return !!res;
  }
}

