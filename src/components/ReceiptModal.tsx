import React, { useState, useEffect } from 'react';
import {
  Printer,
  Bluetooth,
  FileText,
  ChefHat,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Settings
} from 'lucide-react';
import { Order } from '../types';
import { bluetoothPrinter, PrinterStatus } from '../services/bluetoothPrinter';
import BluetoothPrinterModal from './BluetoothPrinterModal';

interface ReceiptModalProps {
  order: Order | null;
  initialType?: 'customer' | 'kot';
  onClose: () => void;
}

export default function ReceiptModal({
  order,
  initialType = 'customer',
  onClose,
}: ReceiptModalProps) {
  const [receiptType, setReceiptType] = useState<'customer' | 'kot'>(initialType);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(bluetoothPrinter.getStatus());
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);

  useEffect(() => {
    setReceiptType(initialType);
  }, [initialType]);

  useEffect(() => {
    const unsub = bluetoothPrinter.subscribe((status) => {
      setPrinterStatus(status);
    });
    return () => unsub();
  }, []);

  if (!order) return null;

  const handleBluetoothPrint = async () => {
    setIsPrinting(true);
    setPrintError(null);
    setPrintSuccess(false);

    try {
      if (!printerStatus.isConnected) {
        // Open printer setup modal if not connected
        setIsPrinterSettingsOpen(true);
        setIsPrinting(false);
        return;
      }

      await bluetoothPrinter.printReceipt(order, receiptType);
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 4000);
    } catch (err: any) {
      setPrintError(err.message || 'Failed to print via Bluetooth.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSystemPrint = () => {
    window.print();
  };

  const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
        <div className="bg-[#141414] border-2 border-white/10 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          
          {/* Top Bar */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#181818] print:hidden">
            <div className="flex items-center gap-2">
              {/* Type Switcher */}
              <button
                type="button"
                onClick={() => setReceiptType('customer')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  receiptType === 'customer'
                    ? 'bg-brand-gold text-black shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Customer Receipt
              </button>

              <button
                type="button"
                onClick={() => setReceiptType('kot')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  receiptType === 'kot'
                    ? 'bg-brand-red text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                Kitchen KOT
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPrinterSettingsOpen(true)}
                title="Bluetooth Printer Settings"
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  printerStatus.isConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Bluetooth className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Receipt Paper Container */}
          <div className="p-6 overflow-y-auto flex-1 flex justify-center bg-[#0d0d0c]">
            <div
              id="printable-thermal-receipt"
              className="bg-white text-black font-mono w-full max-w-[320px] p-5 rounded-2xl shadow-xl space-y-3 text-xs border border-gray-300 select-all"
            >
              {receiptType === 'customer' ? (
                /* CUSTOMER RECEIPT */
                <>
                  <div className="text-center border-b-2 border-dashed border-gray-400 pb-3 space-y-1">
                    <h2 className="text-base font-black uppercase tracking-tight">CURVADA'S KITCHEN</h2>
                    <p className="text-[9px] text-gray-500">Colo, Dinalupihan, Bataan</p>
                    <p className="text-[9px] text-gray-500 font-medium">09568247699</p>
                    <div className="pt-1">
                      <div className="flex items-center justify-between bg-gray-100 px-2.5 py-1 rounded-lg text-[11px] font-black my-1 border border-gray-300">
                        <span className="text-gray-600">QUEUE PRIORITY:</span>
                        <span className="text-black font-mono text-sm font-black">
                          #{String(order.queueNumber || (parseInt(String(order.id || (order as any)._id || '1').replace(/\D/g, '').slice(-2), 10) || 1)).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-[11px] font-black">RECEIPT #{String(order.id || (order as any)._id || 'ORD00000').slice(0, 8).toUpperCase()}</p>
                      <p className="text-[9px] text-gray-600">{new Date(order.timestamp).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="border-b border-gray-300 pb-2 space-y-0.5 text-[10px]">
                    <p><strong>Customer:</strong> {order.customer.name}</p>
                    <p><strong>Contact:</strong> {order.customer.phone || 'N/A'}</p>
                    {order.customer.tableNumber && (
                      <p className="font-bold">
                        <strong>Dine-In Table:</strong> #{order.customer.tableNumber}
                      </p>
                    )}
                    <p><strong>Order Type:</strong> {order.customer.orderType.toUpperCase()}</p>
                    {order.customer.orderType === 'pickup' && (
                      <p className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <strong>⏰ Pickup Time:</strong> {order.customer.pickupTime || 'ASAP (~15-20 mins)'}
                      </p>
                    )}
                    {order.customer.orderType === 'delivery' && (
                      <p className="font-bold text-red-900 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                        <strong>🛵 Delivery Time:</strong> {order.customer.deliveryTime || 'ASAP (~20-30 mins)'}
                      </p>
                    )}
                    {order.orderSource && order.orderSource !== 'online' && (
                      <p>
                        <strong>Channel:</strong>{' '}
                        <span className="font-bold text-amber-800">
                          {order.orderSource === 'walkin' ? 'Walk-In / Over-the-Counter' : 'Facebook Messenger'}
                        </span>
                      </p>
                    )}
                    {order.customer.address && order.customer.orderType === 'delivery' && (
                      <p className="text-[9px] text-gray-600 truncate">
                        <strong>Address:</strong> {order.customer.address}
                      </p>
                    )}
                  </div>

                  {/* Items list */}
                  <div className="border-b border-dashed border-gray-400 pb-3 space-y-2">
                    <div className="flex justify-between font-black text-[10px] uppercase border-b border-gray-200 pb-1">
                      <span>QTY ITEM</span>
                      <span>AMOUNT</span>
                    </div>

                    {order.items.map((item, idx) => (
                      <div key={idx} className="space-y-0.5 text-[11px]">
                        <div className="flex justify-between font-bold">
                          <span>{item.quantity}x {item.menuItem.name}</span>
                          <span>₱{(item.menuItem.price * item.quantity).toFixed(2)}</span>
                        </div>
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="pl-3 space-y-0.5 text-[9px]">
                            {item.selectedOptions.map((opt: any, optIdx: number) => {
                              const optTitle = opt.optionTitle || '';
                              const rawChoiceName = typeof opt.choice === 'string' ? opt.choice : (opt.choice?.name || 'Option');
                              const choicePrice = opt.choice && typeof opt.choice.price === 'number' ? opt.choice.price : 0;

                              if (choicePrice === 0 && (rawChoiceName.toLowerCase().startsWith('no ') || rawChoiceName.toLowerCase() === 'none')) {
                                return null;
                              }

                              const choiceName = rawChoiceName.replace(/\s*\(Upgrade\)/gi, '').trim();
                              const lowerTitle = optTitle.toLowerCase();
                              const lowerChoice = choiceName.toLowerCase();

                              const isEgg = lowerTitle.includes('egg') || lowerChoice.includes('egg') || lowerChoice.includes('sunny') || lowerChoice.includes('scrambled') || lowerChoice.includes('well done');
                              const isExtra = lowerTitle.includes('extra') || lowerChoice.includes('extra');
                              const isRice = lowerTitle.includes('rice');
                              const isRiceUpgrade = isRice && !isExtra && choicePrice > 0;
                              const isDrink = lowerTitle.includes('drink');

                              let label = choiceName;
                              if (isEgg) {
                                label = `Egg Prep: ${choiceName}`;
                              } else if (isRiceUpgrade) {
                                label = `Rice Upgrade: ${choiceName}`;
                              } else if (isExtra) {
                                label = `Extra: ${choiceName}`;
                              } else if (isDrink) {
                                label = `Drink: ${choiceName}`;
                              }

                              return (
                                <div key={optIdx} className="flex justify-between items-center text-gray-600">
                                  <span>+ {label}</span>
                                  {choicePrice > 0 ? (
                                    <span className="font-semibold text-gray-800 font-mono">
                                      +₱{(choicePrice * item.quantity).toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">Included</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {item.specialInstructions && (
                          <p className="text-[9px] pl-3 italic text-gray-700">
                            * "{item.specialInstructions}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="space-y-1 text-xs pt-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₱{order.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm pt-1 border-t border-gray-300">
                      <span>TOTAL DUE</span>
                      <span>₱{order.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-600 pt-1">
                      <span>Payment Method</span>
                      <span className="font-bold uppercase">{order.paymentMethod}</span>
                    </div>
                    {order.amountTendered !== undefined && order.amountTendered !== null && (
                      <>
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>Amount Given (Cash)</span>
                          <span className="font-mono font-bold">₱{order.amountTendered.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-800 font-bold bg-amber-50 px-1 py-0.5 rounded">
                          <span>Change Due</span>
                          <span className="font-mono font-bold text-amber-900">₱{(order.changeAmount ?? 0).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {order.paymentMethod.toLowerCase() !== 'cod' && (
                      <div className="flex justify-between text-[10px] text-gray-600">
                        <span>Payment Status</span>
                        <span className="font-bold text-green-700">PAID</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="text-center pt-3 border-t-2 border-dashed border-gray-400 space-y-1 text-[9px] text-gray-500">
                    <p className="font-bold text-gray-700">Maraming Salamat po!</p>
                    <p>Please order again</p>
                    <p>Enjoy your food!</p>
                    <p className="font-medium text-gray-600">09568247699</p>
                  </div>
                </>
              ) : (
                /* KITCHEN ORDER TICKET (KOT) */
                <>
                  <div className="text-center border-b-2 border-black pb-2 space-y-1.5">
                    <h2 className="text-lg font-black uppercase tracking-tight">** KITCHEN KOT **</h2>
                    <p className="text-[11px] font-bold">CURVADA'S KITCHEN</p>
                    
                    {/* Big Prominent Queue Number Badge for Kitchen Staff */}
                    <div className="bg-black text-white py-1.5 px-3 rounded-xl font-black flex items-center justify-between my-1">
                      <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">QUEUE PRIO:</span>
                      <span className="text-brand-gold text-xl font-black font-mono tracking-wider">
                        #{String(order.queueNumber || (parseInt(String(order.id || (order as any)._id || '1').replace(/\D/g, '').slice(-2), 10) || 1)).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] text-gray-300 font-mono">#{String(order.id || (order as any)._id || 'ORD00000').slice(0, 8).toUpperCase()}</span>
                    </div>

                    <p className="text-[9px] text-gray-700">{new Date(order.timestamp).toLocaleTimeString()} - {new Date(order.timestamp).toLocaleDateString()}</p>
                  </div>

                  <div className="border-b-2 border-black pb-2 space-y-1 text-xs">
                    {order.customer.tableNumber ? (
                      <div className="bg-black text-white text-base font-black px-2 py-1 rounded text-center">
                        TABLE #{order.customer.tableNumber}
                      </div>
                    ) : (
                      <div className="bg-gray-200 text-black text-xs font-black px-2 py-1 rounded text-center uppercase">
                        {order.customer.orderType}
                      </div>
                    )}
                    <p><strong>Customer:</strong> {order.customer.name}</p>
                    {order.customer.orderType === 'pickup' && (
                      <div className="bg-amber-100 border-2 border-amber-500 text-amber-950 text-[11px] font-black px-2 py-1 rounded text-center uppercase">
                        ⏰ TARGET PICKUP: {order.customer.pickupTime || 'ASAP (~15-20 MINS)'}
                      </div>
                    )}
                    {order.customer.orderType === 'delivery' && (
                      <div className="bg-red-100 border-2 border-red-500 text-red-950 text-[11px] font-black px-2 py-1 rounded text-center uppercase">
                        🛵 TARGET DELIVERY: {order.customer.deliveryTime || 'ASAP (~20-30 MINS)'}
                      </div>
                    )}
                  </div>

                  <div className="border-b-2 border-black pb-3 space-y-2.5">
                    <p className="font-black text-[10px] uppercase tracking-wider text-gray-800">PREPARATION ITEMS & COOKING NOTES:</p>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="space-y-1 border-b border-gray-300 pb-2">
                        <div className="flex items-start gap-2">
                          <span className="font-black text-sm bg-black text-white px-2 py-0.5 rounded">
                            {item.quantity}x
                          </span>
                          <span className="font-black text-sm flex-1 text-black">
                            {item.menuItem.name}
                          </span>
                        </div>

                        {/* Options & Egg / Doneness Instructions */}
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="pl-6 space-y-1 text-[10px] font-semibold">
                            {item.selectedOptions.map((opt: any, optIdx: number) => {
                              const optTitle = opt.optionTitle || 'Option';
                              const rawChoiceName = typeof opt.choice === 'string' ? opt.choice : (opt.choice?.name || '');
                              const choicePrice = opt.choice && typeof opt.choice.price === 'number' ? opt.choice.price : 0;

                              if (choicePrice === 0 && (rawChoiceName.toLowerCase().startsWith('no ') || rawChoiceName.toLowerCase() === 'none')) {
                                return null;
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

                              return (
                                <p key={optIdx} className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-gray-500">└</span>
                                  {isEgg ? (
                                    <span className="font-black text-amber-950 bg-amber-200 border border-amber-400 px-1.5 py-0.5 rounded text-[10px] uppercase">
                                      🍳 [EGG PREP]: {choiceName}
                                    </span>
                                  ) : isCooking ? (
                                    <span className="font-black text-rose-950 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded text-[10px] uppercase">
                                      👨‍🍳 [COOKING]: {choiceName}
                                    </span>
                                  ) : isRiceUpgrade ? (
                                    <span className="font-black text-emerald-950 bg-emerald-100 px-1.5 py-0.5 rounded">
                                      🍚 [RICE UPGRADE]: {choiceName}
                                    </span>
                                  ) : isExtra ? (
                                    <span className="font-black text-blue-900 bg-blue-100 px-1.5 py-0.5 rounded">
                                      [EXTRA SIDE]: {choiceName}
                                    </span>
                                  ) : isDrink ? (
                                    <span className="font-black text-sky-900 bg-sky-100 px-1.5 py-0.5 rounded">
                                      [DRINK]: {choiceName}
                                    </span>
                                  ) : isRice ? (
                                    <span><strong>[RICE]:</strong> {choiceName}</span>
                                  ) : (
                                    <span><strong>{optTitle}:</strong> {choiceName}</span>
                                  )}
                                  {choicePrice > 0 && (
                                    <span className="text-gray-600 text-[9px] font-mono">
                                      (+₱{choicePrice.toFixed(2)})
                                    </span>
                                  )}
                                </p>
                              );
                            })}
                          </div>
                        )}

                        {/* Special Kitchen Cooking Instruction */}
                        {item.specialInstructions && (
                          <div className="mt-1 ml-6 p-1.5 bg-red-100 border-2 border-red-500 rounded-lg text-red-900 text-[10.5px] font-black uppercase">
                            🔥 COOKING INSTRUCTION: "{item.specialInstructions}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold pt-1">
                    <span>TOTAL ITEMS:</span>
                    <span className="font-black text-sm">{totalItemsCount}</span>
                  </div>

                  <div className="text-center pt-2 border-t border-black text-[10px] font-bold">
                    --- END OF KOT ---
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Feedback banners */}
          {printSuccess && (
            <div className="px-6 py-2 bg-emerald-500/10 border-t border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center gap-1.5 font-bold print:hidden">
              <CheckCircle2 className="w-4 h-4" />
              Printed successfully to Bluetooth printer!
            </div>
          )}

          {printError && (
            <div className="px-6 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs flex items-center justify-center gap-1.5 font-bold print:hidden">
              <AlertCircle className="w-4 h-4" />
              {printError}
            </div>
          )}

          {/* Action Footer */}
          <div className="p-4 bg-[#181818] border-t border-white/10 space-y-2 print:hidden">
            <div className="flex gap-2">
              {/* Bluetooth Print Button */}
              <button
                type="button"
                onClick={handleBluetoothPrint}
                disabled={isPrinting}
                className="flex-1 py-3 px-4 bg-brand-red hover:bg-brand-red-hover text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-red/20 cursor-pointer"
              >
                {isPrinting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Sending to Printer...
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-4 h-4" />
                    {printerStatus.isConnected
                      ? `Print via Bluetooth (${printerStatus.deviceName || 'Thermal'})`
                      : 'Connect & Print Bluetooth'}
                  </>
                )}
              </button>

              {/* System Print Fallback */}
              <button
                type="button"
                onClick={handleSystemPrint}
                className="py-3 px-4 bg-[#222222] hover:bg-[#2c2c2c] border border-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Print via standard system print dialog"
              >
                <Printer className="w-4 h-4" />
                System Print
              </button>
            </div>

            {/* Quick Status Subtitle */}
            <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  printerStatus.isConnected ? 'bg-emerald-500' : 'bg-red-500'
                }`} />
                {printerStatus.isConnected
                  ? `Printer: ${printerStatus.deviceName}`
                  : 'No Bluetooth printer connected'}
              </span>
              <button
                type="button"
                onClick={() => setIsPrinterSettingsOpen(true)}
                className="text-brand-gold hover:underline font-bold cursor-pointer"
              >
                Configure Printer
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Bluetooth Setup Modal */}
      <BluetoothPrinterModal
        isOpen={isPrinterSettingsOpen}
        onClose={() => setIsPrinterSettingsOpen(false)}
      />
    </>
  );
}
