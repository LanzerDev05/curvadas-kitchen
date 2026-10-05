import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { AppError } from '../../../../shared/errors/AppError';
import { ENV } from '../../../../config/env';
import { UserRole } from '../../domain/entities/User';

export interface RegisterDTO {
  name: string;
  email: string;
  phone: string;
  address?: string;
  password: string;
  role?: UserRole;
  pinCode?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export class AuthUseCases {
  constructor(private readonly userRepo: UserRepository) {}

  async register(dto: RegisterDTO) {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw AppError.conflict('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    let hashedPin: string | undefined;
    if (dto.pinCode) {
      hashedPin = await bcrypt.hash(dto.pinCode, 10);
    }

    const newUser = await this.userRepo.create({
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone.trim(),
      address: dto.address?.trim() || '',
      password: hashedPassword,
      pinCode: hashedPin,
      role: dto.role || 'customer',
      loyaltyPoints: 0,
    });

    const token = this.generateToken(newUser._id.toString(), newUser.email, newUser.role, newUser.name);

    return {
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        address: newUser.address,
        role: newUser.role,
        loyaltyPoints: newUser.loyaltyPoints,
      },
      token,
    };
  }

  async login(dto: LoginDTO) {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user || !user.password) {
      throw AppError.badRequest('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      // Backward compatibility for plain text passwords in legacy db.json
      if (user.password !== dto.password) {
        throw AppError.badRequest('Invalid email or password');
      }
    }

    const token = this.generateToken(user._id.toString(), user.email, user.role, user.name);

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints,
      },
      token,
    };
  }

  async staffLogin(passcode: string) {
    const clean = passcode.trim();

    // Check default quick passcodes
    if (clean === 'kitchen123') {
      const token = this.generateToken('staff-kitchen-default', 'kitchen@curvada.com', 'kitchen', 'Kitchen Staff');
      return { success: true, role: 'kitchen', token };
    }
    if (clean === 'admin123') {
      const token = this.generateToken('staff-admin-default', 'admin@curvada.com', 'admin', 'Admin Manager');
      return { success: true, role: 'admin', token };
    }

    const allUsers = await this.userRepo.findAll();
    for (const u of allUsers) {
      if ((u.role === 'kitchen' || u.role === 'admin' || u.role === 'cashier') && u.password) {
        const match = (await bcrypt.compare(clean, u.password)) || u.password === clean;
        if (match) {
          const token = this.generateToken(u._id.toString(), u.email, u.role, u.name);
          return { success: true, role: u.role, token, user: u };
        }
      }
    }

    throw AppError.unauthorized('Invalid Staff Passcode');
  }

  private generateToken(id: string, email: string, role: string, name: string): string {
    return jwt.sign({ id, email, role, name }, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN as any,
    });
  }
}
