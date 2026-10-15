import http from 'http';
import { createApp } from './app';
import { ENV } from './config/env';
import { connectDatabase } from './config/database';
import { wsGateway } from './core/websocket/websocketServer';

let server: http.Server | null = null;

const startServer = async () => {
  // 1. Connect MongoDB
  await connectDatabase();

  // 2. Initialize Express app
  const app = createApp();

  // 3. Create HTTP Server
  server = http.createServer(app);

  // 4. Handle socket and EADDRINUSE collisions gracefully during hot-reload
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${ENV.PORT} is temporarily busy. Retrying in 1s...`);
      setTimeout(() => {
        if (server) {
          try {
            wsGateway.close();
            server.close();
          } catch (_) {}
          server.listen(ENV.PORT);
        }
      }, 1000);
    } else {
      console.error('💥 Server error:', err);
    }
  });

  // 5. Start listening
  server.listen(ENV.PORT, () => {
    if (server) {
      wsGateway.init(server);
    }
    console.log(`===================================================`);
    console.log(`  🍛 Curvada's Kitchen Standalone Backend Active   `);
    console.log(`  🚀 REST API:  http://localhost:${ENV.PORT}/api/v1  `);
    console.log(`  ⚡ WebSocket: ws://localhost:${ENV.PORT}/ws        `);
    console.log(`===================================================`);
  });
};

// Graceful cleanup on restart/shutdown
const cleanup = () => {
  wsGateway.close();
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGUSR2', cleanup); // tsx watch reload signal

startServer().catch((err) => {
  console.error('💥 Failed to start server:', err);
  process.exit(1);
});
