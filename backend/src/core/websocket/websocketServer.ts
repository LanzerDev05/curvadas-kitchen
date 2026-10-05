import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface WebSocketClient extends WebSocket {
  rooms?: Set<string>;
  isAlive?: boolean;
}

export class WebSocketGateway {
  private wss: WebSocketServer | null = null;

  public init(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocketClient) => {
      ws.rooms = new Set<string>();
      ws.isAlive = true;

      console.log('⚡ Client connected to Curvada WebSocket Gateway');

      ws.send(
        JSON.stringify({
          type: 'CONNECTED',
          message: 'Connected to Curvada Standalone Real-Time Gateway',
          timestamp: new Date().toISOString(),
        })
      );

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message: string) => {
        try {
          const payload = JSON.parse(message.toString());

          // Handle room operations
          if (payload.action === 'JOIN_ROOM' && payload.room) {
            ws.rooms?.add(payload.room);
            ws.send(JSON.stringify({ type: 'ROOM_JOINED', room: payload.room }));
            return;
          }

          if (payload.action === 'LEAVE_ROOM' && payload.room) {
            ws.rooms?.delete(payload.room);
            ws.send(JSON.stringify({ type: 'ROOM_LEFT', room: payload.room }));
            return;
          }

          // Broadcast to specific room or all
          if (payload.room) {
            this.broadcastToRoom(payload.room, payload);
          } else {
            this.broadcast(payload);
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Client disconnected from WebSocket Gateway');
      });
    });

    // Heartbeat check every 30s
    setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach((client: WebSocketClient) => {
        if (client.isAlive === false) return client.terminate();
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    console.log('📡 WebSocket Gateway initialized on path /ws');
  }

  public broadcast(event: any): void {
    if (!this.wss) return;
    const data = JSON.stringify(event);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  public broadcastToRoom(room: string, event: any): void {
    if (!this.wss) return;
    const data = JSON.stringify(event);
    this.wss.clients.forEach((client: WebSocketClient) => {
      if (client.readyState === WebSocket.OPEN && client.rooms?.has(room)) {
        client.send(data);
      }
    });
  }
}

export const wsGateway = new WebSocketGateway();
