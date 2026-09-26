import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env.local and .env
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const env = loadEnv(mode, process.cwd(), '');
  const rawTarget = env.VITE_BACKEND_URL || env.DEPLOYED_BACKEND_URL || process.env.VITE_BACKEND_URL || process.env.DEPLOYED_BACKEND_URL;
  const backendTarget = rawTarget && rawTarget.trim().startsWith('http') && !rawTarget.includes('YOUR_DEPLOYED_URL') ? rawTarget.trim() : null;

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Only mount the local Express API middleware if NOT proxying to a deployed backend
      ...(!backendTarget ? [{
        name: 'api-server',
        configureServer(server: any) {
          server.middlewares.use(async (req: any, res: any, next: any) => {
            if (req.url && req.url.startsWith('/api')) {
              try {
                const express = await import('express');
                const { apiRouter } = await import('./src/api/routes');
                const app = express.default();
                app.use(express.default.json({ limit: '50mb' }));
                app.use(express.default.urlencoded({ limit: '50mb', extended: true }));
                app.use('/api', apiRouter);
                app(req as any, res as any, next);
              } catch (err) {
                console.error('API middleware error:', err);
                next(err);
              }
            } else {
              next();
            }
          });
        }
      }] : [])
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Ignore db.json and data directory from triggering Vite full page reloads
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/db.json', '**/.data/**', '**/dist/**']
      },
      // When a live deployed backend URL is configured, proxy all /api and /ws requests directly
      ...(backendTarget ? {
        proxy: {
          '/api': {
            target: backendTarget,
            changeOrigin: true,
            secure: false,
          },
          '/ws': {
            target: backendTarget,
            ws: true,
            changeOrigin: true,
          }
        }
      } : {})
    },
  };
});
