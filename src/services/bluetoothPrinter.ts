/**
 * Bluetooth & Serial Thermal Receipt Printer Service for Curvada's Kitchen
 * Supports:
 * 1. Web Bluetooth API (Bluetooth Low Energy / BLE Thermal Receipt Printers 58mm/80mm)
 *    - Auto-reconnects on page refresh via navigator.bluetooth.getDevices() (Chrome 85+)
 *    - Background BLE advertisement watching when available
 * 2. Web Serial API (Bluetooth Virtual COM / USB Thermal Receipt Printers)
 *    - Auto-reconnects on page refresh via navigator.serial.getPorts()
 * 3. System Print Fallback with thermal-tailored CSS
 */

import { Order } from '../types';

export type PaperWidth = '58mm' | '80mm';
export type ConnectionType = 'bluetooth' | 'serial' | 'system';

export interface PrinterSettings {
  paperWidth: PaperWidth;
  connectionType: ConnectionType;
  autoPrintKOT: boolean;
  autoPrintReceipt: boolean;
  autoCut: boolean;
  openCashDrawer: boolean;
  characterSet: 'CP437' | 'UTF-8';
  autoReconnect: boolean;
}

export interface PrinterStatus {
  isConnected: boolean;
  isReconnecting: boolean;
  deviceName: string | null;
  connectionType: ConnectionType;
  lastError: string | null;
}

const DEFAULT_SETTINGS: PrinterSettings = {
  paperWidth: '58mm',
  connectionType: 'bluetooth',
  autoPrintKOT: false,
  autoPrintReceipt: false,
  autoCut: true,
  openCashDrawer: false,
  characterSet: 'CP437',
  autoReconnect: true,
};

// Known BLE Thermal Printer GATT Services & Characteristics
const PRINTER_BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // Most common Chinese 58mm/80mm BLE module (HM-10 / MPT-II)
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Xprinter / ISSC Transparent Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC BLE serial service
  '0000ff00-0000-1000-8000-00805f9b34fb', // Custom generic printer service
  '0000ae00-0000-1000-8000-00805f9b34fb', // PT-210 / Goojprt
  '0000af30-0000-1000-8000-00805f9b34fb',
];

class BluetoothPrinterService {
  private bleDevice: any = null;
  private bleCharacteristic: any = null;
  private serialPort: any = null;
  private serialWriter: any = null;
  private boundHandleDisconnect: any = null;
  private reconnectTimer: any = null;

  private status: PrinterStatus = {
    isConnected: false,
    isReconnecting: false,
    deviceName: null,
    connectionType: 'bluetooth',
    lastError: null,
  };

  private settings: PrinterSettings = { ...DEFAULT_SETTINGS };
  private listeners: Set<(status: PrinterStatus) => void> = new Set();

  constructor() {
    this.loadSettings();
    this.initAutoLifecycle();
  }

  // --- Settings Persistence ---
  public getSettings(): PrinterSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<PrinterSettings>): void {
    this.settings = { ...this.settings, ...partial };
    try {
      localStorage.setItem('curvada_printer_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save printer settings', e);
    }
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('curvada_printer_settings');
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load printer settings', e);
    }
  }

  // --- Saved Device Info ---
  public getSavedDeviceName(): string | null {
    try {
      return localStorage.getItem('curvada_last_device_name');
    } catch {
      return null;
    }
  }

  public hasSavedDevice(): boolean {
    try {
      return Boolean(
        localStorage.getItem('curvada_last_device_id') ||
        localStorage.getItem('curvada_last_device_name') ||
        localStorage.getItem('curvada_last_connection_type') === 'serial'
      );
    } catch {
      return false;
    }
  }

  // --- Event Subscription ---
  public subscribe(callback: (status: PrinterStatus) => void): () => void {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const current = this.getStatus();
    this.listeners.forEach((cb) => cb(current));
  }

  public getStatus(): PrinterStatus {
    return { ...this.status };
  }

  // Check browser capability
  public isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public isSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  // --- Automatic Page Lifecycle Hook ---
  private initAutoLifecycle(): void {
    if (typeof window === 'undefined') return;

    const triggerAuto = () => {
      if (this.settings.autoReconnect && !this.status.isConnected && this.hasSavedDevice()) {
        this.autoReconnect().catch((err) => {
          console.debug('Auto-reconnect attempt ended:', err);
        });
      }
    };

    // When page finishes loading
    if (document.readyState === 'complete') {
      setTimeout(triggerAuto, 600);
    } else {
      window.addEventListener('load', () => setTimeout(triggerAuto, 600));
    }

    // When user returns to tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        triggerAuto();
      }
    });
  }

  // --- Connect to a specific BLE Device Instance ---
  public async connectDevice(device: any): Promise<boolean> {
    if (!device) return false;

    try {
      this.status.isReconnecting = true;
      this.status.lastError = null;
      this.notify();

      // Setup disconnect listener
      if (this.boundHandleDisconnect && device.removeEventListener) {
        device.removeEventListener('gattserverdisconnected', this.boundHandleDisconnect);
      }
      this.boundHandleDisconnect = () => this.handleDisconnected();
      device.addEventListener('gattserverdisconnected', this.boundHandleDisconnect);

      // Connect GATT server
      const server = await device.gatt.connect();

      // Find writable characteristic in known printer services
      let targetCharacteristic: any = null;

      for (const serviceUuid of PRINTER_BLE_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              targetCharacteristic = char;
              break;
            }
          }
          if (targetCharacteristic) break;
        } catch {
          // Check next service
        }
      }

      // If not in known services, search all primary services
      if (!targetCharacteristic) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            try {
              const chars = await service.getCharacteristics();
              for (const char of chars) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  targetCharacteristic = char;
                  break;
                }
              }
              if (targetCharacteristic) break;
            } catch {
              // Ignore
            }
          }
        } catch {
          // Ignore
        }
      }

      if (!targetCharacteristic) {
        throw new Error('Connected to Bluetooth device, but no writable printer characteristic was found.');
      }

      this.bleDevice = device;
      this.bleCharacteristic = targetCharacteristic;

      // Remember device in localStorage so it reconnects on refresh
      try {
        localStorage.setItem('curvada_last_device_id', device.id);
        if (device.name) {
          localStorage.setItem('curvada_last_device_name', device.name);
        }
        localStorage.setItem('curvada_last_connection_type', 'bluetooth');
        localStorage.removeItem('curvada_user_disconnected');
      } catch (e) {
        console.warn('Could not store device info in localStorage', e);
      }

      this.status = {
        isConnected: true,
        isReconnecting: false,
        deviceName: device.name || 'Bluetooth Receipt Printer',
        connectionType: 'bluetooth',
        lastError: null,
      };
      this.notify();

      // Listen for BLE advertisements in background if supported (allows auto-reconnect if printer was out of range)
      if (typeof device.watchAdvertisements === 'function') {
        try {
          await device.watchAdvertisements();
          device.addEventListener('advertisementreceived', () => {
            if (!this.status.isConnected && this.settings.autoReconnect) {
              this.connectDevice(device).catch(() => {});
            }
          });
        } catch {
          // Ignore if unsupported
        }
      }

      return true;
    } catch (err: any) {
      console.warn('Connect device failed:', err);
      this.status.isReconnecting = false;
      this.status.isConnected = false;
      this.status.lastError = err.message || 'Failed to connect to Bluetooth printer';
      this.notify();
      throw err;
    }
  }

  // --- Bluetooth (BLE) Manual Scan & Connect ---
  public async connectBluetooth(): Promise<boolean> {
    if (!this.isBluetoothSupported()) {
      const msg = 'Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Android Chrome.';
      this.status.lastError = msg;
      this.notify();
      throw new Error(msg);
    }

    try {
      this.status.lastError = null;
      this.notify();

      const nav = navigator as any;

      // Request device from user with common printer services
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_BLE_SERVICES,
      });

      if (!device) {
        throw new Error('No Bluetooth device selected.');
      }

      return await this.connectDevice(device);
    } catch (err: any) {
      console.error('Bluetooth connection error:', err);
      this.status = {
        isConnected: false,
        isReconnecting: false,
        deviceName: null,
        connectionType: 'bluetooth',
        lastError: err.message || 'Failed to connect to Bluetooth printer',
      };
      this.notify();
      throw err;
    }
  }

  // --- Auto-Reconnect on Page Refresh ---
  public async autoReconnect(): Promise<boolean> {
    if (this.status.isConnected) return true;
    if (!this.settings.autoReconnect) return false;

    // Check if user explicitly clicked "Disconnect"
    try {
      if (localStorage.getItem('curvada_user_disconnected') === 'true') {
        return false;
      }
    } catch {
      // Ignore
    }

    const lastType = (() => {
      try {
        return localStorage.getItem('curvada_last_connection_type') || this.settings.connectionType;
      } catch {
        return this.settings.connectionType;
      }
    })();

    // 1. Try Bluetooth BLE Auto-Reconnect
    if (lastType === 'bluetooth' && this.isBluetoothSupported()) {
      const nav = navigator as any;
      if (nav.bluetooth && typeof nav.bluetooth.getDevices === 'function') {
        try {
          this.status.isReconnecting = true;
          this.notify();

          const devices = await nav.bluetooth.getDevices();
          const lastId = localStorage.getItem('curvada_last_device_id');
          const targetDevice = devices.find((d: any) => d.id === lastId) || devices[0];

          if (targetDevice) {
            console.log('Restoring connection to Bluetooth printer:', targetDevice.name || targetDevice.id);
            const connected = await this.connectDevice(targetDevice);
            return connected;
          }
        } catch (err: any) {
          console.debug('Bluetooth auto-reconnect not available right now:', err);
        } finally {
          this.status.isReconnecting = false;
          this.notify();
        }
      }
    }

    // 2. Try Serial / COM Port Auto-Reconnect
    if (lastType === 'serial' && this.isSerialSupported()) {
      const nav = navigator as any;
      if (nav.serial && typeof nav.serial.getPorts === 'function') {
        try {
          this.status.isReconnecting = true;
          this.notify();

          const ports = await nav.serial.getPorts();
          if (ports.length > 0) {
            console.log('Restoring connection to Serial thermal printer');
            const port = ports[0];
            await port.open({ baudRate: 9600 });

            this.serialPort = port;
            this.serialWriter = port.writable.getWriter();

            this.status = {
              isConnected: true,
              isReconnecting: false,
              deviceName: 'Serial / COM Thermal Printer',
              connectionType: 'serial',
              lastError: null,
            };
            this.notify();
            return true;
          }
        } catch (err: any) {
          console.debug('Serial auto-reconnect not available right now:', err);
        } finally {
          this.status.isReconnecting = false;
          this.notify();
        }
      }
    }

    return false;
  }

  // --- Web Serial (Bluetooth Virtual COM / USB) Connection ---
  public async connectSerial(baudRate = 9600): Promise<boolean> {
    if (!this.isSerialSupported()) {
      const msg = 'Web Serial API is not supported in this browser. Please use Chrome or Edge on Windows/Mac.';
      this.status.lastError = msg;
      this.notify();
      throw new Error(msg);
    }

    try {
      this.status.lastError = null;
      this.notify();

      const nav = navigator as any;
      const port = await nav.serial.requestPort();
      await port.open({ baudRate });

      this.serialPort = port;
      this.serialWriter = port.writable.getWriter();

      try {
        localStorage.setItem('curvada_last_connection_type', 'serial');
        localStorage.removeItem('curvada_user_disconnected');
      } catch (e) {
        // Ignore
      }

      this.status = {
        isConnected: true,
        isReconnecting: false,
        deviceName: 'Serial / COM Thermal Printer',
        connectionType: 'serial',
        lastError: null,
      };
      this.notify();
      return true;
    } catch (err: any) {
      console.error('Serial connection error:', err);
      this.status = {
        isConnected: false,
        isReconnecting: false,
        deviceName: null,
        connectionType: 'serial',
        lastError: err.message || 'Failed to connect to Serial/COM printer',
      };
      this.notify();
      throw err;
    }
  }

  // --- Disconnect ---
  public async disconnect(): Promise<void> {
    // Record user explicitly disconnected so it won't aggressively auto-reconnect until reconnected
    try {
      localStorage.setItem('curvada_user_disconnected', 'true');
    } catch {
      // Ignore
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.bleDevice && this.bleDevice.gatt && this.bleDevice.gatt.connected) {
      try {
        this.bleDevice.gatt.disconnect();
      } catch (e) {
        console.warn('Error disconnecting BLE:', e);
      }
    }
    if (this.serialWriter) {
      try {
        this.serialWriter.releaseLock();
      } catch (e) {
        console.warn('Error releasing serial lock:', e);
      }
    }
    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch (e) {
        console.warn('Error closing serial port:', e);
      }
    }

    this.bleDevice = null;
    this.bleCharacteristic = null;
    this.serialPort = null;
    this.serialWriter = null;

    this.status = {
      isConnected: false,
      isReconnecting: false,
      deviceName: null,
      connectionType: this.settings.connectionType,
      lastError: null,
    };
    this.notify();
  }

  // Handle unexpected disconnection (e.g. printer turned off, sleep mode, signal lost)
  private handleDisconnected(): void {
    this.bleDevice = null;
    this.bleCharacteristic = null;

    let isExplicit = false;
    try {
      isExplicit = localStorage.getItem('curvada_user_disconnected') === 'true';
    } catch {
      // Ignore
    }

    this.status = {
      isConnected: false,
      isReconnecting: false,
      deviceName: null,
      connectionType: 'bluetooth',
      lastError: isExplicit ? null : 'Printer disconnected. Make sure printer is powered on.',
    };
    this.notify();

    // If unexpected and autoReconnect is enabled, try reconnecting in a few seconds
    if (!isExplicit && this.settings.autoReconnect) {
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        if (!this.status.isConnected) {
          this.autoReconnect().catch(() => {});
        }
      }, 3000);
    }
  }

  // --- Sending Raw ESC/POS Bytes ---
  public async sendRawBytes(bytes: Uint8Array): Promise<void> {
    if (this.status.connectionType === 'bluetooth') {
      if (!this.bleCharacteristic) {
        throw new Error('Bluetooth printer is not connected. Please connect your printer first.');
      }

      // Send in MTU chunks (usually 100 bytes is safe for BLE thermal printers)
      const CHUNK_SIZE = 100;
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.slice(i, i + CHUNK_SIZE);
        if (this.bleCharacteristic.writeValueWithoutResponse) {
          await this.bleCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.bleCharacteristic.writeValue(chunk);
        }
        // Small delay between chunks to prevent printer buffer overrun
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    } else if (this.status.connectionType === 'serial') {
      if (!this.serialWriter) {
        throw new Error('Serial printer is not connected.');
      }
      await this.serialWriter.write(bytes);
    } else {
      throw new Error('Direct print requires Bluetooth or Serial connection.');
    }
  }

  // --- ESC/POS Builder Helpers ---
  private getLineWidth(): number {
    return this.settings.paperWidth === '80mm' ? 48 : 32;
  }

  private padColumns(left: string, right: string, width?: number): string {
    const totalWidth = width || this.getLineWidth();
    if (left.length + right.length + 1 <= totalWidth) {
      const spaces = ' '.repeat(Math.max(1, totalWidth - left.length - right.length));
      return left + spaces + right;
    }
    // If left is too long to fit with right on one line, wrap neatly
    const availableForLeft = Math.max(1, totalWidth - right.length - 1);
    
    // Find last space before availableForLeft to avoid mid-word cuts
    let splitIdx = left.lastIndexOf(' ', availableForLeft);
    if (splitIdx <= 3) {
      splitIdx = availableForLeft;
    }
    
    const firstLine = left.slice(0, splitIdx);
    const remainder = left.slice(splitIdx).trim();
    const spaces = ' '.repeat(Math.max(1, totalWidth - firstLine.length - right.length));
    if (remainder.length > 0) {
      return `${firstLine}${spaces}${right}\n   ${remainder}`;
    }
    return `${firstLine}${spaces}${right}`;
  }

  private divider(char = '-'): string {
    return char.repeat(this.getLineWidth()) + '\n';
  }

  // Sanitize text for thermal printer (replace ₱ with P for standard ASCII compatibility)
  private sanitize(str: string): string {
    return str
      .replace(/₱/g, 'P')
      .replace(/[^\x20-\x7E\n\r]/g, ' '); // Keep standard printable ASCII
  }

  // --- ESC/POS Command Generator ---
  public buildEscPosReceipt(order: Order, type: 'customer' | 'kot'): Uint8Array {
    const commands: number[] = [];

    const addBytes = (...bytes: number[]) => {
      commands.push(...bytes);
    };

    const addText = (text: string) => {
      const sanitized = this.sanitize(text);
      for (let i = 0; i < sanitized.length; i++) {
        commands.push(sanitized.charCodeAt(i));
      }
    };

    const addLine = (text = '') => {
      addText(text + '\n');
    };

    // ESC @ - Initialize printer
    addBytes(0x1b, 0x40);

    // If configured, pulse cash drawer (pin 2)
    if (type === 'customer' && this.settings.openCashDrawer) {
      addBytes(0x1b, 0x70, 0x00, 0x19, 0xfa);
    }

    if (type === 'kot') {
      // ===== KITCHEN ORDER TICKET (KOT) =====
      addBytes(0x1b, 0x61, 0x01); // Center
      addBytes(0x1d, 0x21, 0x11); // Double width & height
      addLine('** KITCHEN KOT **');
      
      // Large Prominent Queue Number for Kitchen Crew
      const qNum = String(order.queueNumber || (parseInt(order.id.replace(/\D/g, '').slice(-2), 10) || 1)).padStart(2, '0');
      addLine(`QUEUE #${qNum}`);
      addBytes(0x1d, 0x21, 0x00); // Normal size
      
      addLine("CURVADA'S KITCHEN");
      addBytes(0x1b, 0x45, 0x01); // Bold ON
      addLine(`TICKET #${order.id.slice(0, 8).toUpperCase()}`);
      addBytes(0x1b, 0x45, 0x00); // Bold OFF
      addLine(`${new Date(order.timestamp).toLocaleTimeString()} - ${new Date(order.timestamp).toLocaleDateString()}`);
      addLine(this.divider('='));

      addBytes(0x1b, 0x61, 0x00); // Left align
      if (order.customer.tableNumber) {
        addBytes(0x1b, 0x45, 0x01);
        addLine(`TABLE #${order.customer.tableNumber}`);
        addBytes(0x1b, 0x45, 0x00);
      } else {
        addLine(`ORDER TYPE: ${order.customer.orderType.toUpperCase()}`);
      }
      if (order.customer.orderType === 'pickup') {
        addBytes(0x1b, 0x45, 0x01);
        addLine(`TARGET PICKUP: ${order.customer.pickupTime || 'ASAP (~15-20 MINS)'}`);
        addBytes(0x1b, 0x45, 0x00);
      } else if (order.customer.orderType === 'delivery') {
        addBytes(0x1b, 0x45, 0x01);
        addLine(`TARGET DELIVERY: ${order.customer.deliveryTime || 'ASAP (~20-30 MINS)'}`);
        addBytes(0x1b, 0x45, 0x00);
      }
      if (order.orderSource && order.orderSource !== 'online') {
        const sourceLabel = order.orderSource === 'walkin' ? 'WALK-IN (COUNTER)' : 'MESSENGER ORDER';
        addBytes(0x1b, 0x45, 0x01);
        addLine(`CHANNEL: ${sourceLabel}`);
        addBytes(0x1b, 0x45, 0x00);
      }
      addLine(`Customer: ${order.customer.name}`);
      addLine(this.divider('-'));

      addBytes(0x1b, 0x45, 0x01); // Bold ON
      addLine('PREPARATION ITEMS & COOKING NOTES:');
      addBytes(0x1b, 0x45, 0x00); // Bold OFF

      order.items.forEach((item) => {
        addBytes(0x1b, 0x45, 0x01); // Bold ON
        addLine(`${item.quantity}x ${item.menuItem.name}`);
        addBytes(0x1b, 0x45, 0x00); // Bold OFF

        if (item.selectedOptions && item.selectedOptions.length > 0) {
          item.selectedOptions.forEach((opt: any) => {
            const optTitle = opt.optionTitle || 'Option';
            const rawChoiceName = typeof opt.choice === 'string' ? opt.choice : (opt.choice?.name || '');
            const choicePrice = opt.choice && typeof opt.choice.price === 'number' ? opt.choice.price : 0;

            if (choicePrice === 0 && (rawChoiceName.toLowerCase().startsWith('no ') || rawChoiceName.toLowerCase() === 'none')) {
              return;
            }

            const choiceName = rawChoiceName.replace(/\s*\(Upgrade\)/gi, '').trim();
            const lowerTitle = optTitle.toLowerCase();
            const lowerChoice = choiceName.toLowerCase();

            const isEgg = lowerTitle.includes('egg') || lowerChoice.includes('egg') || lowerChoice.includes('sunny') || lowerChoice.includes('scrambled') || lowerChoice.includes('well done');
            const isExtra = lowerTitle.includes('extra') || lowerChoice.includes('extra');
            const isRice = lowerTitle.includes('rice');
            const isRiceUpgrade = isRice && !isExtra && choicePrice > 0;
            const isDrink = lowerTitle.includes('drink');
            const isCooking = lowerTitle.includes('cook') || lowerTitle.includes('prep') || lowerTitle.includes('spicy') || lowerTitle.includes('doneness');

            const optPrice = choicePrice > 0 ? ` (+P${choicePrice.toFixed(2)})` : '';
            if (isEgg) {
              addBytes(0x1b, 0x45, 0x01);
              addLine(`   >> [EGG PREP]: ${choiceName.toUpperCase()}`);
              addBytes(0x1b, 0x45, 0x00);
            } else if (isCooking) {
              addBytes(0x1b, 0x45, 0x01);
              addLine(`   >> [COOKING]: ${choiceName.toUpperCase()}`);
              addBytes(0x1b, 0x45, 0x00);
            } else if (isRiceUpgrade) {
              addLine(`   > [RICE UPGRADE] ${choiceName}${optPrice}`);
            } else if (isExtra) {
              addLine(`   > [EXTRA SIDE] ${choiceName}${optPrice}`);
            } else if (isDrink) {
              addLine(`   > [DRINK] ${choiceName}${optPrice}`);
            } else if (isRice) {
              addLine(`   > [RICE] ${choiceName}`);
            } else {
              addLine(`   > ${optTitle}: ${choiceName}${optPrice}`);
            }
          });
        }

        if (item.specialInstructions) {
          addBytes(0x1b, 0x45, 0x01);
          addLine(`   *** COOKING INSTRUCTION: ***`);
          addLine(`   "${item.specialInstructions.toUpperCase()}"`);
          addBytes(0x1b, 0x45, 0x00);
        }
      });

      addLine(this.divider('-'));
      addLine(this.padColumns('TOTAL ITEMS:', `${order.items.reduce((acc, it) => acc + it.quantity, 0)}`));
      addBytes(0x1b, 0x61, 0x01); // Center
      addLine('--- END OF KOT ---');

    } else {
      // ===== CUSTOMER SALES RECEIPT (Exact Match to UI Receipt) =====
      addBytes(0x1b, 0x61, 0x01); // Center align
      addBytes(0x1b, 0x45, 0x01); // Bold ON
      addLine("CURVADA'S KITCHEN");
      addBytes(0x1b, 0x45, 0x00); // Bold OFF
      addLine('Colo, Dinalupihan, Bataan');
      addLine('09568247699');
      addLine('');
      
      const qNum = String(order.queueNumber || (parseInt(order.id.replace(/\D/g, '').slice(-2), 10) || 1)).padStart(2, '0');
      addBytes(0x1b, 0x45, 0x01); // Bold ON
      addLine(`QUEUE #${qNum}  •  RECEIPT #${order.id.slice(0, 8).toUpperCase()}`);
      addBytes(0x1b, 0x45, 0x00); // Bold OFF
      addLine(new Date(order.timestamp).toLocaleString('en-US'));
      addLine(this.divider('-'));

      // Customer Details (Left align)
      addBytes(0x1b, 0x61, 0x00);
      addLine(`Customer: ${order.customer.name}`);
      addLine(`Contact: ${order.customer.phone || 'N/A'}`);
      if (order.customer.tableNumber) {
        addLine(`Dine-In Table: #${order.customer.tableNumber}`);
      }
      addLine(`Order Type: ${order.customer.orderType.toUpperCase()}`);
      if (order.customer.orderType === 'pickup') {
        addLine(`Pickup Time: ${order.customer.pickupTime || 'ASAP (~15-20 mins)'}`);
      } else if (order.customer.orderType === 'delivery') {
        addLine(`Delivery Time: ${order.customer.deliveryTime || 'ASAP (~20-30 mins)'}`);
      }
      if (order.orderSource && order.orderSource !== 'online') {
        const sourceLabel = order.orderSource === 'walkin' ? 'Walk-In / Over-the-Counter' : 'Facebook Messenger';
        addLine(`Channel: ${sourceLabel}`);
      }
      if (order.customer.address && order.customer.orderType === 'delivery') {
        addLine(`Address: ${order.customer.address}`);
      }
      addLine(this.divider('-'));

      // Items Column Header
      addBytes(0x1b, 0x45, 0x01); // Bold ON
      addLine(this.padColumns('QTY ITEM', 'AMOUNT'));
      addBytes(0x1b, 0x45, 0x00); // Bold OFF

      // Item rows with base price + individual add-on costs
      order.items.forEach((item) => {
        const itemLine = `${item.quantity}x ${item.menuItem.name}`;
        const baseItemTotal = `P${(item.menuItem.price * item.quantity).toFixed(2)}`;
        addBytes(0x1b, 0x45, 0x01); // Bold ON for item row
        addLine(this.padColumns(itemLine, baseItemTotal));
        addBytes(0x1b, 0x45, 0x00); // Bold OFF

        if (item.selectedOptions && item.selectedOptions.length > 0) {
          item.selectedOptions.forEach((opt: any) => {
            const optTitle = opt.optionTitle || '';
            const rawChoiceName = typeof opt.choice === 'string' ? opt.choice : (opt.choice?.name || 'Option');
            const choicePrice = opt.choice && typeof opt.choice.price === 'number' ? opt.choice.price : 0;

            // Skip zero-cost "None" or "No Extra..." options
            if (choicePrice === 0 && (rawChoiceName.toLowerCase().startsWith('no ') || rawChoiceName.toLowerCase() === 'none')) {
              return;
            }

            // Strip redundant "(Upgrade)" suffix from choice name
            const choiceName = rawChoiceName.replace(/\s*\(Upgrade\)/gi, '').trim();

            const isExtra = optTitle.toLowerCase().includes('extra') || choiceName.toLowerCase().includes('extra');
            const isRice = optTitle.toLowerCase().includes('rice');
            const isRiceUpgrade = isRice && !isExtra && choicePrice > 0;
            const isDrink = optTitle.toLowerCase().includes('drink');

            let label = choiceName;
            if (isRiceUpgrade) {
              label = `Rice Upgrade: ${choiceName}`;
            } else if (isExtra) {
              label = `Extra: ${choiceName}`;
            } else if (isDrink) {
              label = `Drink: ${choiceName}`;
            }

            const optLabel = `   + ${label}`;
            const optCost = choicePrice > 0 ? `+P${(choicePrice * item.quantity).toFixed(2)}` : 'Included';
            addLine(this.padColumns(optLabel, optCost));
          });
        }

        if (item.specialInstructions) {
          addLine(`   * "${item.specialInstructions}"`);
        }
      });

      addLine(this.divider('-'));

      // Financial Totals
      const subtotal = order.totalAmount;
      addLine(this.padColumns('Subtotal', `P${subtotal.toFixed(2)}`));
      
      addBytes(0x1b, 0x45, 0x01); // Bold ON
      addLine(this.padColumns('TOTAL DUE', `P${order.totalAmount.toFixed(2)}`));
      addBytes(0x1b, 0x45, 0x00); // Bold OFF

      addLine(this.padColumns('Payment Method', order.paymentMethod.toUpperCase()));
      if (order.amountTendered !== undefined && order.amountTendered !== null) {
        addLine(this.padColumns('Amount Given (Cash)', `P${order.amountTendered.toFixed(2)}`));
        addLine(this.padColumns('Change Due', `P${(order.changeAmount ?? 0).toFixed(2)}`));
      }
      if (order.paymentMethod.toLowerCase() !== 'cod') {
        addLine(this.padColumns('Payment Status', 'PAID'));
      }
      addLine(this.divider('-'));

      // Footer
      addBytes(0x1b, 0x61, 0x01); // Center
      addBytes(0x1b, 0x45, 0x01); // Bold ON
      addLine('Maraming Salamat po!');
      addBytes(0x1b, 0x45, 0x00); // Bold OFF
      addLine('Please order again');
      addLine('Enjoy your food!');
      addLine('09568247699');
    }

    // Line feeds before cut
    addLine('\n\n\n');

    // Auto Cut paper if enabled
    if (this.settings.autoCut) {
      addBytes(0x1d, 0x56, 0x42, 0x00);
    }

    return new Uint8Array(commands);
  }

  // --- Test Print Ticket ---
  public buildTestTicket(): Uint8Array {
    const commands: number[] = [];

    const addBytes = (...bytes: number[]) => commands.push(...bytes);
    const addText = (text: string) => {
      const sanitized = this.sanitize(text);
      for (let i = 0; i < sanitized.length; i++) commands.push(sanitized.charCodeAt(i));
    };
    const addLine = (text = '') => addText(text + '\n');

    addBytes(0x1b, 0x40); // Initialize

    addBytes(0x1b, 0x61, 0x01); // Center
    addBytes(0x1d, 0x21, 0x11); // Double size
    addLine("CURVADA'S KITCHEN");
    addBytes(0x1d, 0x21, 0x00);
    addLine('TEST PRINT DIAGNOSTIC');
    addLine(this.divider('='));

    addBytes(0x1b, 0x61, 0x00); // Left
    addLine(`PRINTER: ${this.status.deviceName || 'Bluetooth POS Printer'}`);
    addLine(`WIDTH  : ${this.settings.paperWidth} (${this.getLineWidth()} cols)`);
    addLine(`TIME   : ${new Date().toLocaleString()}`);
    addLine(this.divider('-'));

    addBytes(0x1b, 0x45, 0x01);
    addLine('TESTING TEXT FORMATTING:');
    addBytes(0x1b, 0x45, 0x00);
    addLine('1. Normal ASCII characters');
    addBytes(0x1b, 0x45, 0x01);
    addLine('2. Bold text preview');
    addBytes(0x1b, 0x45, 0x00);
    addLine(this.padColumns('3. Column Alignment', '[OK]'));
    addLine(this.padColumns('4. Philippine Currency', 'PHP 250.00'));
    addLine(this.divider('='));

    addBytes(0x1b, 0x61, 0x01); // Center
    addLine('SUCCESS! YOUR PRINTER');
    addLine('IS READY FOR SERVICE!');
    addLine('\n\n\n');

    if (this.settings.autoCut) {
      addBytes(0x1d, 0x56, 0x42, 0x00);
    }

    return new Uint8Array(commands);
  }

  // --- High-Level Print Functions ---
  public async printReceipt(order: Order, type: 'customer' | 'kot' = 'customer'): Promise<void> {
    // If not currently connected, check if we can auto-reconnect to saved printer before printing
    if (!this.status.isConnected && this.hasSavedDevice()) {
      try {
        console.log('Attempting auto-reconnect before printing...');
        await this.autoReconnect();
      } catch (e) {
        console.warn('Auto-reconnect prior to printing was not successful:', e);
      }
    }

    if (this.status.isConnected) {
      const bytes = this.buildEscPosReceipt(order, type);
      await this.sendRawBytes(bytes);
    } else {
      // Fallback to system print if not connected via Bluetooth/Serial
      this.triggerSystemPrint();
    }
  }

  public async printTestTicket(): Promise<void> {
    if (!this.status.isConnected && this.hasSavedDevice()) {
      await this.autoReconnect();
    }

    if (!this.status.isConnected) {
      throw new Error('Printer is not connected. Please pair your Bluetooth printer first.');
    }
    const bytes = this.buildTestTicket();
    await this.sendRawBytes(bytes);
  }

  // --- System Print Fallback ---
  public triggerSystemPrint(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}

// Export singleton instance
export const bluetoothPrinter = new BluetoothPrinterService();
