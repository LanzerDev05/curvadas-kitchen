import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Locate backend directory (whether running inside /backend or from repository root)
const rootEnvPath = path.resolve(process.cwd(), '.env');
const backendEnvPath = path.resolve(process.cwd(), 'backend', '.env');
const envDir = fs.existsSync(rootEnvPath)
  ? process.cwd()
  : fs.existsSync(backendEnvPath)
  ? path.resolve(process.cwd(), 'backend')
  : path.resolve(__dirname, '../../');

// First read base .env if present to obtain APP_ENV or defaults
dotenv.config({ path: path.resolve(envDir, '.env') });

// Determine environment mode (dev | stg | prod)
const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'dev';
const envFile =
  appEnv === 'prod' || appEnv === 'production'
    ? '.env.prod'
    : appEnv === 'stg' || appEnv === 'staging'
    ? '.env.stg'
    : '.env.dev';

// Load specific env file with override
dotenv.config({ path: path.resolve(envDir, envFile), override: true });

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5050,
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_ENV: appEnv,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/curvadas_kitchen',
  JWT_SECRET: process.env.JWT_SECRET || 'curvadas_super_secret_jwt_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};

console.log(`🌍 Loaded Environment [${ENV.APP_ENV.toUpperCase()}] using ${envFile}`);
