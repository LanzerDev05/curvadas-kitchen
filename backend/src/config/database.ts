import mongoose from 'mongoose';
import { ENV } from './env';

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(ENV.MONGODB_URI);
    console.log(` Connected to MongoDB at: ${ENV.MONGODB_URI}`);
  } catch (error) {
    console.error(' MongoDB Connection Error:', error);
    process.exit(1);
  }
};
