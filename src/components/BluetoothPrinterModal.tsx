import React, { useState, useEffect } from 'react';
import {
  Printer,
  Bluetooth,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sliders,
  Scissors,
  Zap,
  HelpCircle,
  X,
  FileText,
  DollarSign
} from 'lucide-react';
import {
  bluetoothPrinter,
  PrinterStatus,
  PrinterSettings
} from '../services/bluetoothPrinter';

interface BluetoothPrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BluetoothPrinterModal({ isOpen, onClose }: BluetoothPrinterModalProps) {
  const [status, setStatus] = useState<PrinterStatus>(bluetoothPrinter.getStatus());
  const [settings, setSettings] = useState<PrinterSettings>(bluetoothPrinter.getSettings());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = bluetoothPrinter.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const isBluetoothSupported = bluetoothPrinter.isBluetoothSupported();
  const isSerialSupported = bluetoothPrinter.isSerialSupported();
  const hasSavedDevice = bluetoothPrinter.hasSavedDevice();
  const savedDeviceName = bluetoothPrinter.getSavedDeviceName();

  const handleConnectBluetooth = async () => {
    setIsConnecting(true);
    setFeedbackMsg(null);
    try {
      await bluetoothPrinter.connectBluetooth();
      setFeedbackMsg({ type: 'success', text: 'Bluetooth Thermal Printer connected successfully!' });
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setFeedbackMsg({
          type: 'error',
          text: err.message || 'Failed to connect. Make sure your printer is powered on and Bluetooth is enabled.'
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleQuickReconnect = async () => {
    setIsConnecting(true);
    setFeedbackMsg(null);
    try {
      const ok = await bluetoothPrinter.autoReconnect();
      if (ok) {
        setFeedbackMsg({ type: 'success', text: `Reconnected to ${savedDeviceName || 'Bluetooth printer'} successfully!` });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: 'Could not reach saved printer. Make sure printer is powered on and Bluetooth is on, or tap "Scan & Connect" below.'
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to reconnect. Make sure printer is powered on and within range.'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectSerial = async () => {
    setIsConnecting(true);
    setFeedbackMsg(null);
    try {
      await bluetoothPrinter.connectSerial();
      setFeedbackMsg({ type: 'success', text: 'Serial / COM Thermal Printer connected successfully!' });
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setFeedbackMsg({
          type: 'error',
          text: err.message || 'Failed to open Serial port. Check USB/COM port connection.'
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await bluetoothPrinter.disconnect();
      setFeedbackMsg({ type: 'success', text: 'Printer disconnected.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to disconnect.' });
    }
  };

  const handleTestPrint = async () => {
    setIsTestPrinting(true);
    setFeedbackMsg(null);
    try {
      await bluetoothPrinter.printTestTicket();
      setFeedbackMsg({ type: 'success', text: 'Test receipt sent to printer!' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Test print failed.' });
    } finally {
      setIsTestPrinting(false);
    }
  };

  const handleUpdateSetting = <K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    bluetoothPrinter.updateSettings(updated);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#141414] border-2 border-white/10 rounded-[2rem] max-w-lg w-full p-6 shadow-2xl space-y-6 text-white max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-red/10 border border-brand-red/20 rounded-2xl text-brand-red">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg text-white tracking-wide uppercase flex items-center gap-2">
                Bluetooth Receipt Printer
              </h2>
              <p className="text-gray-400 text-xs">
                Manage portable 58mm / 80mm ESC/POS thermal printers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          status.isConnected
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
            : status.isReconnecting
            ? 'bg-amber-950/20 border-amber-500/30 text-amber-400'
            : 'bg-white/5 border-white/10 text-gray-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${
                status.isConnected
                  ? 'bg-emerald-500 animate-pulse'
                  : status.isReconnecting
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-red-500/80'
              }`} />
              <div>
                <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  {status.isConnected ? (
                    'Printer Connected & Ready'
                  ) : status.isReconnecting ? (
                    <>
                      <RotateCw className="w-3 h-3 animate-spin" />
                      Reconnecting to Saved Printer...
                    </>
                  ) : (
                    'No Printer Connected'
                  )}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {status.isConnected
                    ? `Device: ${status.deviceName} (${status.connectionType.toUpperCase()})`
                    : savedDeviceName
                    ? `Last paired: ${savedDeviceName}`
                    : 'Connect via Bluetooth Low Energy (BLE) or Serial/USB'}
                </p>
              </div>
            </div>

            {status.isConnected ? (
              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-bold transition-all cursor-pointer"
              >
                Disconnect
              </button>
            ) : null}
          </div>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Connection Action Buttons */}
        {!status.isConnected && (
          <div className="space-y-3">
            {/* Quick Reconnect Button if printer was previously paired */}
            {hasSavedDevice && (
              <button
                onClick={handleQuickReconnect}
                disabled={isConnecting}
                className="w-full py-3 px-4 rounded-xl bg-brand-gold hover:opacity-90 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Reconnecting to {savedDeviceName || 'Printer'}...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-black" />
                    ⚡ Quick Reconnect ({savedDeviceName || 'Saved Printer'})
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleConnectBluetooth}
              disabled={isConnecting || !isBluetoothSupported}
              className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                isBluetoothSupported
                  ? hasSavedDevice
                    ? 'bg-[#1e1e1e] hover:bg-[#282828] border border-white/10 text-white'
                    : 'bg-brand-red hover:bg-brand-red-hover text-white shadow-brand-red/20'
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isConnecting && !hasSavedDevice ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  Pairing Bluetooth Printer...
                </>
              ) : (
                <>
                  <Bluetooth className="w-4 h-4" />
                  {hasSavedDevice ? 'Pair New / Different Bluetooth Device' : 'Scan & Connect Bluetooth (BLE)'}
                </>
              )}
            </button>

            {isSerialSupported && (
              <button
                onClick={handleConnectSerial}
                disabled={isConnecting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] border border-white/10 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                Connect via Serial COM / USB (Windows SPP)
              </button>
            )}

            {!isBluetoothSupported && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  Web Bluetooth API not detected in this browser
                </p>
                <p className="text-gray-400">
                  Direct Bluetooth printing is supported on <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or <strong>Chrome on Android</strong>.
                  You can still use System Print for Windows-paired Bluetooth printers!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Printer Configuration & Settings */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-gold">
            <Sliders className="w-4 h-4" />
            Printer Configuration
          </div>

          {/* Paper Width */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-300 font-semibold block">Paper Roll Width</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleUpdateSetting('paperWidth', '58mm')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  settings.paperWidth === '58mm'
                    ? 'bg-brand-gold text-black border-brand-gold'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                58mm (32 chars / Portable)
              </button>
              <button
                type="button"
                onClick={() => handleUpdateSetting('paperWidth', '80mm')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  settings.paperWidth === '80mm'
                    ? 'bg-brand-gold text-black border-brand-gold'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                80mm (48 chars / Countertop)
              </button>
            </div>
          </div>

          {/* Automation Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-white/5 text-xs">
            {/* Auto-Reconnect on Page Refresh */}
            <label className="flex items-center justify-between cursor-pointer py-1">
              <div className="space-y-0.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-brand-gold" />
                  Auto-Reconnect on Page Refresh
                </span>
                <p className="text-[10px] text-gray-400">
                  Automatically restore Bluetooth connection when browser is reloaded
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoReconnect}
                onChange={(e) => handleUpdateSetting('autoReconnect', e.target.checked)}
                className="w-4 h-4 accent-brand-red rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <div className="space-y-0.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-brand-gold" />
                  Auto-Print Kitchen Ticket (KOT)
                </span>
                <p className="text-[10px] text-gray-400">
                  Automatically print order to kitchen when received
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPrintKOT}
                onChange={(e) => handleUpdateSetting('autoPrintKOT', e.target.checked)}
                className="w-4 h-4 accent-brand-red rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <div className="space-y-0.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-blue-400" />
                  Auto Cut Paper
                </span>
                <p className="text-[10px] text-gray-400">
                  Send partial cut command after each print
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoCut}
                onChange={(e) => handleUpdateSetting('autoCut', e.target.checked)}
                className="w-4 h-4 accent-brand-red rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <div className="space-y-0.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Open Cash Drawer
                </span>
                <p className="text-[10px] text-gray-400">
                  Kick cash drawer pin (RJ11) on receipts
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.openCashDrawer}
                onChange={(e) => handleUpdateSetting('openCashDrawer', e.target.checked)}
                className="w-4 h-4 accent-brand-red rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Test Print Diagnostic Button */}
        {status.isConnected && (
          <div className="pt-2">
            <button
              onClick={handleTestPrint}
              disabled={isTestPrinting}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-gold hover:opacity-90 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {isTestPrinting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  Printing Test Slip...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  🖨️ Test Print Diagnostic Ticket
                </>
              )}
            </button>
          </div>
        )}

        {/* Quick Instructions & Help */}
        <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-[11px] text-gray-400 space-y-1.5">
          <p className="font-bold text-white flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-brand-gold" />
            Persistent Bluetooth Connection:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Once you pair your printer once, the browser remembers it.</li>
            <li>When you <strong>refresh the page</strong>, the app will automatically re-establish the connection in the background!</li>
            <li>If your printer turns off to save battery, simply power it on and tap <strong>⚡ Quick Reconnect</strong> or print any receipt.</li>
          </ul>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
