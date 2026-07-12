import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { apiRouter } from './src/api/routes';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.json());

// API routes
app.use(apiRouter);

// Serve static assets in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback all other GET requests to index.html (Client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  Curvada's Kitchen Production Backend Running      `);
  console.log(`  Local URL: http://localhost:${PORT}               `);
  console.log(`===================================================`);
});
