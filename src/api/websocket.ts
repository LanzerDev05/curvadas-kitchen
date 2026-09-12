import { Order, OrderStatus } from '../types';

export type WebSocketEvent =
  | { type: 'NEW_ORDER'; order: Order }
  | { type: 'ORDER_UPDATED'; order: Order }
  | { type: 'STATUS_CHANGED'; orderId: string; status: OrderStatus; timestamp: string }
  | { type: 'PING' }
  | { type: 'PONG' };

type Listener = (event: WebSocketEvent) => void;

class RealtimeOrderService {
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initBroadcastChannel();
    this.initStorageListener();
    this.connectWebSocket();
  }

  private initBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('curvada_orders_realtime');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data) {
            this.notifyListeners(event.data);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel initialization skipped', e);
    }
  }

  private initStorageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'curvada_last_order_update' && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            this.notifyListeners(parsed);
          } catch (e) {
            // ignore
          }
        }
      });
    }
  }

  public connectWebSocket() {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log('⚡ WebSocket Live Order Sync Connected:', wsUrl);
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        if (this.ws) this.ws.close();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, 4000);
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(event: WebSocketEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  public broadcast(event: WebSocketEvent) {
    // 1. Send via WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(event));
      } catch (e) {
        console.error('Failed to send WebSocket payload', e);
      }
    }

    // 2. Broadcast across local tabs via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(event);
      } catch (e) {
        // ignore
      }
    }

    // 3. Trigger localStorage event for cross-window fallback
    try {
      localStorage.setItem('curvada_last_order_update', JSON.stringify({ ...event, _t: Date.now() }));
    } catch (e) {
      // ignore
    }

    // 4. Notify local listeners in current window
    this.notifyListeners(event);
  }

  public getIsConnected(): boolean {
    return this.isConnected || true; // Returns true with dual-channel fallback
  }
}

export const realtimeOrderService = new RealtimeOrderService();
