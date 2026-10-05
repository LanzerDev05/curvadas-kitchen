import { Request, Response, NextFunction, Router } from 'express';
import { PromoRepository, PromoVoucher } from '../../infrastructure/repositories/PromoRepository';
import { AppError } from '../../../../shared/errors/AppError';
import { authenticate, authorize } from '../../../../shared/middleware/authMiddleware';

export class PromoUseCases {
  constructor(private readonly promoRepo: PromoRepository) {}

  async getAll() {
    return this.promoRepo.findAll();
  }

  async validateVoucher(code: string, cartTotal: number) {
    if (!code) throw AppError.badRequest('Voucher code is required');
    const voucher = await this.promoRepo.findByCode(code);

    if (!voucher || !voucher.isActive) {
      throw AppError.badRequest('Invalid or inactive promo code!');
    }

    if (cartTotal < voucher.minSpend) {
      throw AppError.badRequest(`Minimum spend of ₱${voucher.minSpend} required for voucher ${voucher.code}`);
    }

    let discountAmount = 0;
    if (voucher.discountType === 'percentage') {
      discountAmount = (cartTotal * voucher.discountValue) / 100;
    } else {
      discountAmount = voucher.discountValue;
    }
    discountAmount = Math.min(cartTotal, discountAmount);

    return {
      voucher,
      discountAmount,
    };
  }

  async create(data: Partial<PromoVoucher>) {
    if (!data.code || data.discountValue === undefined) {
      throw AppError.badRequest('Voucher code and discount value are required');
    }
    return this.promoRepo.create(data);
  }

  async delete(id: string) {
    const deleted = await this.promoRepo.delete(id);
    if (!deleted) throw AppError.notFound('Voucher not found');
    return { success: true };
  }
}

export class PromoController {
  constructor(private readonly promoUseCases: PromoUseCases) {}

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vouchers = await this.promoUseCases.getAll();
      res.status(200).json({ success: true, count: vouchers.length, promoVouchers: vouchers });
    } catch (err) {
      next(err);
    }
  };

  validate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, cartTotal } = req.body;
      const result = await this.promoUseCases.validateVoucher(code, Number(cartTotal) || 0);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await this.promoUseCases.create(req.body);
      res.status(201).json({ success: true, voucher: created });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.promoUseCases.delete(req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

export const createPromoRoutes = (promoController: PromoController): Router => {
  const router = Router();

  router.get('/', promoController.getAll);
  router.post('/validate', promoController.validate);
  router.post('/', authenticate, authorize(['admin']), promoController.create);
  router.delete('/:id', authenticate, authorize(['admin']), promoController.delete);

  return router;
};
