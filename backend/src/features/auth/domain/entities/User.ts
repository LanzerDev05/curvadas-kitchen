export type UserRole = 'customer' | 'cashier' | 'kitchen' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  password?: string;
  pinCode?: string;
  role: UserRole;
  loyaltyPoints?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
