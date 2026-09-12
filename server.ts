import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { apiRouter } from './src/api/routes';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser with 50MB payload limit for high-res dish photos and database sync
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API routes
app.use('/api', apiRouter);

// Serve static assets in production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback all other GET requests to index.html (Client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  console.log('⚡ Client connected to Curvada WebSocket Server');

  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to Curvada Live Order Sync' }));

  ws.on('message', (message: string) => {
    try {
      const parsed = JSON.parse(message.toString());
      // Broadcast message to all connected clients except sender (or all clients)
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(parsed));
        }
      });
    } catch (e) {
      console.error('Error handling WebSocket message', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from Curvada WebSocket Server');
  });
});

// Start listening
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  Curvada's Kitchen Backend + WebSocket Active     `);
  console.log(`  Local URL: http://localhost:${PORT}               `);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws             `);
  console.log(`===================================================`);
});
