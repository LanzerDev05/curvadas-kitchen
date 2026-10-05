import http from 'http';
import { createApp } from './app';
import { ENV } from './config/env';
import { connectDatabase } from './config/database';
import { wsGateway } from './core/websocket/websocketServer';

const startServer = async () => {
  // 1. Connect MongoDB
  await connectDatabase();

  // 2. Initialize Express app
  const app = createApp();

  // 3. Create HTTP Server
  const server = http.createServer(app);

  // 4. Initialize WebSocket Server
  wsGateway.init(server);

  // 5. Start listening
  server.listen(ENV.PORT, () => {
    console.log(`===================================================`);
    console.log(`  🍛 Curvada's Kitchen Standalone Backend Active   `);
    console.log(`  🚀 REST API:  http://localhost:${ENV.PORT}/api/v1  `);
    console.log(`  ⚡ WebSocket: ws://localhost:${ENV.PORT}/ws        `);
    console.log(`===================================================`);
  });
};

startServer().catch((err) => {
  console.error('💥 Failed to start server:', err);
  process.exit(1);
});
