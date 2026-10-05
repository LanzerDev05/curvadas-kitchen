import { Request, Response, NextFunction } from 'express';
import { AuthUseCases } from '../../application/use-cases/AuthUseCases';

export class AuthController {
  constructor(private readonly authUseCases: AuthUseCases) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authUseCases.register(req.body);
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authUseCases.login(req.body);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  };

  staffLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { passcode } = req.body;
      const result = await this.authUseCases.staffLogin(passcode);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ success: true, user: req.user });
    } catch (err) {
      next(err);
    }
  };
}
