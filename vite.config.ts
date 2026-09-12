import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
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
      }
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
    },
  };
});
