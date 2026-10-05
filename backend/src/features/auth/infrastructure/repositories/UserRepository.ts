import { UserModel, IUserDocument } from '../models/UserModel';
import { User } from '../../domain/entities/User';

export class UserRepository {
  async findByEmail(email: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim() });
  }

  async findById(id: string): Promise<IUserDocument | null> {
    return UserModel.findById(id);
  }

  async findByPinCode(pinCode: string): Promise<IUserDocument | null> {
    return UserModel.findOne({ pinCode });
  }

  async create(userData: Partial<User>): Promise<IUserDocument> {
    const user = new UserModel(userData);
    return user.save();
  }

  async findAll(): Promise<IUserDocument[]> {
    return UserModel.find().sort({ createdAt: -1 });
  }

  async updateLoyaltyPoints(id: string, pointsDelta: number): Promise<IUserDocument | null> {
    return UserModel.findByIdAndUpdate(
      id,
      { $inc: { loyaltyPoints: pointsDelta } },
      { new: true }
    );
  }
}
