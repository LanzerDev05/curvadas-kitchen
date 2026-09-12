import React, { useEffect, useState } from 'react';
import { Order, OrderStatus } from '../types';
import { MapPin, Clock, Phone, CheckCircle2, ShieldCheck, ShoppingBag, Loader2, RefreshCw } from 'lucide-react';

import { realtimeOrderService } from '../api/websocket';

interface OrderTrackerProps {
  activeOrder: Order | null;
  onCancelOrder: (orderId: string) => void;
  onNewOrderClick: () => void;
  onUpdateConfirmedItems?: (orderId: string, confirmedItemIds: string[]) => void;
  onUpdateOrderStatus?: (orderId: string, status: OrderStatus) => void;
}

function OrderTracker({
  activeOrder,
  onCancelOrder,
  onNewOrderClick,
  onUpdateConfirmedItems,
  onUpdateOrderStatus,
}: OrderTrackerProps) {
  const [riderProgress, setRiderProgress] = useState(0); // 0 to 100% on the map
  const [timeTick, setTimeTick] = useState(0);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(activeOrder);

  useEffect(() => {
    setCurrentOrder(activeOrder);
  }, [activeOrder]);

  // Subscribe to live WebSocket / BroadcastChannel events for instant no-refresh status updates
  useEffect(() => {
    const unsubscribe = realtimeOrderService.subscribe((event) => {
      if (event.type === 'STATUS_CHANGED') {
        setCurrentOrder((prev) => {
          if (!prev || prev.id !== event.orderId) return prev;
          const newStatus = event.status;
          const existingLogs = prev.logs || [];
          const newLogs = existingLogs.some(l => l.status === newStatus)
            ? existingLogs
            : [...existingLogs, { status: newStatus, timestamp: event.timestamp || new Date().toISOString() }];

          return { ...prev, status: newStatus, logs: newLogs };
        });
      } else if (event.type === 'ORDER_UPDATED') {
        setCurrentOrder((prev) => {
          if (!prev || prev.id !== event.order.id) return prev;
          return event.order;
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const confirmedItemIds = activeOrder?.confirmedItemIds || [];

  const handleToggleItemConfirm = (itemId: string) => {
    if (!activeOrder || !onUpdateConfirmedItems) return;
    const newConfirmed = confirmedItemIds.includes(itemId)
      ? confirmedItemIds.filter((id) => id !== itemId)
      : [...confirmedItemIds, itemId];
    onUpdateConfirmedItems(activeOrder.id, newConfirmed);
  };

  const handleConfirmReceipt = () => {
    if (!activeOrder || !onUpdateOrderStatus) return;
    // Mark order as delivered / completed
    onUpdateOrderStatus(activeOrder.id, 'delivered');
  };

  // Animate rider if dispatched
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeOrder && activeOrder.status === 'dispatched') {
      setRiderProgress(30);
      interval = setInterval(() => {
        setRiderProgress((prev) => {
          if (prev >= 95) {
            return 95; // wait at destination
          }
          return prev + 1; // slow crawl
        });
      }, 500);
    } else if (activeOrder && activeOrder.status === 'delivered') {
      setRiderProgress(100);
    } else {
      setRiderProgress(5);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeOrder?.status]);

  const displayOrder = currentOrder || activeOrder;

  if (!displayOrder) {
    return (
      <div className="py-16 px-4 md:px-8 max-w-md mx-auto text-center space-y-6">
        <div className="p-5 rounded-full bg-[#181818] border-2 border-white/5 w-20 h-20 flex items-center justify-center mx-auto text-3xl shadow-lg">
          📡
        </div>
        <div>
          <h3 className="font-display font-black text-white text-xl uppercase tracking-tight">No Active Orders</h3>
          <p className="text-gray-400 text-xs mt-2 leading-relaxed font-normal">
            You don't have any active orders right now. Order some hot Bento or Silog meals and watch them get prepared and delivered live!
          </p>
        </div>
        <button
          onClick={onNewOrderClick}
          className="px-6 py-3.5 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-brand-red/20"
        >
          View Menu & Order
        </button>
      </div>
    );
  }

  const { id, items, totalAmount, customer, paymentMethod, status, logs } = displayOrder;

  // Track stages configuration
  const stages: { key: OrderStatus; label: string; desc: string; icon: string }[] = [
    { key: 'pending', label: 'Order Placed', desc: 'Received & Queued', icon: '📝' },
    { key: 'preparing', label: 'In the Kitchen', desc: 'Chef cooking fresh', icon: '🍳' },
    { key: 'dispatched', label: 'Out for Delivery', desc: 'Rider is on the way', icon: '🏍️' },
    { key: 'delivered', label: 'Delivered', desc: 'Enjoy your meal!', icon: '😋' },
  ];

  // Helper to determine active/completed state for stages
  const getStageState = (stageKey: OrderStatus) => {
    const statusPriority: Record<OrderStatus, number> = {
      'pending': 1,
      'preparing': 2,
      'dispatched': 3,
      'delivered': 4,
      'cancelled': 0,
    };

    const currentPriority = statusPriority[status];
    const stagePriority = statusPriority[stageKey];

    if (status === 'cancelled') return 'cancelled';
    if (currentPriority > stagePriority) return 'completed';
    if (currentPriority === stagePriority) return 'active';
    return 'upcoming';
  };

  const estimatedTimeText = (() => {
    if (status === 'delivered') return 'Delivered 🎉';
    if (status === 'cancelled') return 'Cancelled ❌';
    
    if (status === 'preparing' && displayOrder?.cookingStartTime && displayOrder?.estimatedPrepTime) {
      const startMs = new Date(displayOrder.cookingStartTime).getTime();
      const durationMs = displayOrder.estimatedPrepTime * 60 * 1000;
      const elapsedMs = Date.now() - startMs;
      const remainingMs = durationMs - elapsedMs;
      const isOverdue = remainingMs <= 0;

      const absDiffSec = Math.ceil(Math.abs(remainingMs) / 1000);
      const mins = Math.floor(absDiffSec / 60);
      const secs = absDiffSec % 60;
      const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;
      
      return isOverdue ? `${formatted} overdue ⚠️` : `${formatted} remaining ⏳`;
    }

    if (status === 'dispatched') {
      return 'Out for Delivery 🏍️';
    }

    return 'Pending Accept ⏳';
  })();

  return (
    <div className="py-8 px-4 md:px-8 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT: Order Tracker visual timeline & Live Map simulation */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Status Tracker card */}
        <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-brand-gold/10 text-brand-gold font-bold uppercase tracking-widest px-2.5 py-1 rounded-md">
                  Order Tracking
                </span>
                <span className="text-[8.5px] bg-green-500/10 border border-green-500/25 text-green-400 font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Live WebSocket Sync
                </span>
              </div>
              <h3 className="font-display font-black text-white text-lg mt-1.5 flex items-center gap-2 uppercase tracking-tight">
                Order #{id.slice(0, 8)}
                {status === 'preparing' && <Loader2 className="w-4 h-4 text-brand-red animate-spin" />}
              </h3>
            </div>
            
            <div className="text-left sm:text-right">
              <span className="text-gray-500 text-[10px] uppercase tracking-wider block font-bold">Est. Arrival Time</span>
              <span className="text-brand-gold font-display font-black text-sm uppercase tracking-tight">
                {estimatedTimeText}
              </span>
            </div>
          </div>

          {/* Timeline Nodes */}
          {status === 'cancelled' ? (
            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-[1.5rem] p-5 text-center">
              <span className="text-red-500 text-3xl">❌</span>
              <h4 className="font-display font-black text-red-500 text-base mt-2 uppercase tracking-tight">Order Cancelled</h4>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                This order was cancelled. Feel free to browse our menu and place a new order.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 md:pl-8 space-y-6 py-2 border-l-2 border-white/5 ml-3 md:ml-4">
              {stages.map((stage) => {
                const state = getStageState(stage.key);

                return (
                  <div key={stage.key} className="relative">
                    
                    {/* Circle Node Indicator */}
                    <div className={`absolute -left-[35px] md:-left-[43px] top-0.5 w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center text-xs md:text-sm transition-all z-10 ${
                      state === 'completed'
                        ? 'bg-brand-red border-brand-red text-white font-bold'
                        : state === 'active'
                        ? 'bg-[#181818] border-brand-red text-brand-red animate-pulse-slow shadow-lg shadow-brand-red/20 font-black'
                        : 'bg-[#0D0D0C] border-white/10 text-gray-600'
                    }`}>
                      {state === 'completed' ? '✓' : stage.icon}
                    </div>

                    {/* Content details */}
                    <div>
                      <h4 className={`font-display text-sm md:text-base font-black uppercase tracking-tight ${
                        state === 'active' ? 'text-brand-red' : state === 'completed' ? 'text-white' : 'text-gray-500'
                      }`}>
                        {stage.label}
                      </h4>
                      <p className={`text-xs mt-0.5 font-normal ${state === 'active' ? 'text-gray-300' : 'text-gray-500'}`}>
                        {stage.desc}
                      </p>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Cancel button if pending */}
          {status === 'pending' && (
            <div className="pt-4 border-t-2 border-white/5 text-center">
              <button
                onClick={() => onCancelOrder(id)}
                className="text-gray-500 hover:text-brand-red text-xs font-bold underline uppercase tracking-wider focus:outline-none transition-all"
              >
                Cancel Order
              </button>
            </div>
          )}
        </div>

        {/* Live Delivery Map Simulator (Fully Animated CSS Map) */}
        {status !== 'cancelled' && customer.orderType === 'delivery' && (
          <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-5 shadow-2xl space-y-4">
            <h4 className="text-white font-display font-black text-sm tracking-tight uppercase flex items-center justify-between">
              <span>Live Delivery Route</span>
              <span className="text-[10px] bg-green-500/10 text-green-400 px-2.5 py-1 rounded font-mono font-bold animate-pulse-slow flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Live GPS Simulation
              </span>
            </h4>

            {/* Simulated Grid Road Map */}
            <div className="relative h-48 rounded-[1.5rem] bg-[#0D0D0C] overflow-hidden border-2 border-white/5">
              
              {/* Grid map drawing lines */}
              <div className="absolute inset-0 bg-[radial-gradient(#333333_1px,transparent_1px)] [background-size:16px_16px] opacity-45" />
              
              {/* Simulated streets / paths */}
              <div className="absolute h-4 w-full bg-[#1A1A1A] top-1/4 left-0 border-y border-white/5" />
              <div className="absolute h-4 w-full bg-[#1A1A1A] top-2/3 left-0 border-y border-white/5" />
              <div className="absolute w-4 h-full bg-[#1A1A1A] left-1/4 top-0 border-x border-white/5" />
              <div className="absolute w-4 h-full bg-[#1A1A1A] left-3/4 top-0 border-x border-white/5" />

              {/* Diagonal Delivery Highway Path (Wavy Line) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <path
                  id="route-path"
                  d="M 50 140 Q 150 50 250 140 T 450 110"
                  fill="none"
                  stroke="#d31f24"
                  strokeWidth="4"
                  strokeDasharray="6 4"
                  className="opacity-75"
                />
              </svg>

              {/* Marker A: Curvada's Kitchen (Origin) */}
              <div className="absolute left-[30px] top-[115px] z-20 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-brand-red border border-white flex items-center justify-center text-xs shadow-lg animate-bounce-slow">
                  🍱
                </div>
                <span className="text-[9px] bg-[#181818] text-white font-bold px-1.5 py-0.5 rounded border-2 border-brand-red mt-1">
                  Kitchen
                </span>
              </div>

              {/* Marker B: Customer's House (Destination) */}
              <div className="absolute right-[30px] top-[85px] z-20 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 border border-white flex items-center justify-center text-xs shadow-lg">
                  🏠
                </div>
                <span className="text-[9px] bg-[#181818] text-white font-bold px-1.5 py-0.5 rounded border-2 border-blue-600 mt-1">
                  You
                </span>
              </div>

              {/* Floating Motor Rider Icon along the highway */}
              <div
                style={{
                  left: `${50 + (riderProgress / 100) * 350}px`,
                  top: `${130 - Math.sin((riderProgress / 100) * Math.PI) * 45}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-30 transition-all duration-300 flex flex-col items-center"
              >
                <div className="w-7 h-7 rounded-full bg-brand-gold border-2 border-white/5 flex items-center justify-center text-xs shadow-xl animate-bounce-short">
                  🏍️
                </div>
                {status === 'dispatched' && (
                  <span className="text-[8px] bg-brand-gold text-black font-extrabold px-1 rounded uppercase tracking-wider animate-pulse-slow mt-1">
                    Moving
                  </span>
                )}
              </div>

              {/* Preparing Stage Sizzling Stove overlay graphics */}
              {status === 'preparing' && (
                <div className="absolute inset-0 bg-[#0D0D0C]/90 flex items-center justify-center animate-fade-in">
                  <div className="bg-[#181818]/95 border-2 border-brand-red p-3.5 rounded-xl flex items-center gap-3 shadow-2xl">
                    <span className="text-2xl animate-spin-slow">🍳</span>
                    <div>
                      <span className="text-white text-[10px] font-black uppercase tracking-wider">Chef is cooking!</span>
                      <span className="text-gray-400 text-[9px] block font-medium">Meals are currently pan-frying...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Stage Order received overlay */}
              {status === 'pending' && (
                <div className="absolute inset-0 bg-[#0D0D0C]/90 flex items-center justify-center">
                  <div className="bg-[#181818]/95 border-2 border-brand-gold p-3.5 rounded-xl flex items-center gap-3 shadow-2xl">
                    <span className="text-2xl animate-pulse-slow">📝</span>
                    <div>
                      <span className="text-white text-[10px] font-black uppercase tracking-wider">Awaiting Chef Approval</span>
                      <span className="text-gray-400 text-[9px] block font-medium">Order placed in kitchen queue...</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* RIGHT: Order details breakdown */}
      <div className="lg:col-span-5 bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-6">
        <h4 className="text-white font-display font-black text-sm tracking-tight uppercase border-b-2 border-white/5 pb-2">
          Order Breakdown
        </h4>

        {/* Customer info card */}
        <div className="space-y-3.5 text-xs text-white">
          <div className="flex justify-between">
            <span className="text-gray-500 font-bold uppercase tracking-wider">Recipient:</span>
            <span className="text-white font-bold">{customer.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-bold uppercase tracking-wider">Fulfillment:</span>
            <span className="text-white font-bold capitalize">{customer.orderType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-bold uppercase tracking-wider">Phone:</span>
            <span className="text-white font-mono font-bold">{customer.phone}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-500 font-bold uppercase tracking-wider">Fulfillment Address / Point:</span>
            <span className="text-white bg-[#0D0D0C] p-3 rounded-xl border-2 border-white/5 leading-relaxed font-normal mt-0.5">
              {customer.address}
            </span>
          </div>
          {customer.tableNumber && (
            <div className="flex justify-between pt-1 border-t-2 border-white/5">
              <span className="text-gray-500 font-bold uppercase tracking-wider">Table Number:</span>
              <span className="text-brand-gold font-black">Dine-In Table #{customer.tableNumber}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t-2 border-white/5">
            <span className="text-gray-500 font-bold uppercase tracking-wider">Payment Mode:</span>
            <span className="text-brand-red font-black uppercase tracking-wider">{paymentMethod}</span>
          </div>
        </div>

        {/* Itemised list */}
        <div className="pt-4 border-t-2 border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="text-white text-xs font-black uppercase tracking-wider">Ordered Dishes Checklist</h5>
            <span className="text-[10px] text-gray-400 bg-[#0D0D0C] border border-white/5 px-2 py-0.5 rounded-md font-mono">
              {confirmedItemIds.length}/{items.length} Checked
            </span>
          </div>
          
          <p className="text-[10px] text-gray-400 leading-normal">
            Please verify each dish as you receive it to confirm your complete order has arrived without any missing items.
          </p>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {items.map((item) => {
              const isChecked = confirmedItemIds.includes(item.id);
              return (
                <div 
                  key={item.id} 
                  onClick={() => status !== 'cancelled' && handleToggleItemConfirm(item.id)}
                  className={`flex gap-2.5 items-start p-2.5 rounded-xl border-2 transition-all cursor-pointer select-none ${
                    isChecked 
                      ? 'bg-green-500/[0.03] border-green-500/20 hover:border-green-500/30' 
                      : 'bg-[#0D0D0C] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center pt-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      id={`chk-${item.id}`}
                      checked={isChecked}
                      disabled={status === 'cancelled'}
                      onChange={() => handleToggleItemConfirm(item.id)}
                      className="h-4 w-4 rounded border-white/10 text-brand-red focus:ring-brand-red bg-[#181818] cursor-pointer"
                    />
                  </div>
                  
                  <img
                    src={item.menuItem.image}
                    alt={item.menuItem.name}
                    className="w-10 h-10 object-cover rounded-lg flex-shrink-0 border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-1 items-start">
                      <span className={`text-xs font-bold truncate leading-tight ${isChecked ? 'text-gray-300 line-through decoration-white/20' : 'text-white'}`}>
                        {item.quantity}x {item.menuItem.name}
                      </span>
                      <span className="text-brand-gold font-mono text-xs font-bold flex-shrink-0">
                        ₱{(item.totalUnitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    {item.selectedOptions.length > 0 && (
                      <div className="flex flex-wrap gap-x-1.5 mt-0.5">
                        {item.selectedOptions.map((opt) => (
                          <span key={opt.optionTitle} className="text-[9px] text-brand-red font-bold">
                            {opt.choice.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <p className="text-[9px] text-brand-gold italic truncate mt-0.5">
                        "{item.specialInstructions}"
                      </p>
                    )}

                    {isChecked && (
                      <span className="inline-flex items-center gap-1 text-[8px] bg-green-500/10 border border-green-500/20 text-green-400 font-extrabold px-1.5 py-0.5 rounded uppercase mt-1">
                        ✓ Confirmed Received
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive receipt confirmation card depending on checked status */}
          {status !== 'delivered' && status !== 'cancelled' ? (
            <div className="p-3.5 bg-brand-gold/5 border border-brand-gold/10 rounded-2xl space-y-2.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Verification Progress:</span>
                <span className="text-brand-gold font-mono font-bold">
                  {confirmedItemIds.length === items.length ? '100% Complete' : `${confirmedItemIds.length} of ${items.length} verified`}
                </span>
              </div>
              
              <div className="w-full bg-[#0D0D0C] rounded-full h-1.5 overflow-hidden border border-white/5">
                <div 
                  className="bg-brand-gold h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(confirmedItemIds.length / items.length) * 100}%` }}
                />
              </div>

              {confirmedItemIds.length === items.length ? (
                <button
                  type="button"
                  onClick={handleConfirmReceipt}
                  className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-green-600/10 flex items-center justify-center gap-2 animate-pulse-slow"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirm & Mark Order Completed
                </button>
              ) : (
                <p className="text-[10px] text-gray-400 italic text-center leading-normal">
                  Check off all {items.length} items to unlock the "Complete Order" confirmation button to notify the kitchen.
                </p>
              )}
            </div>
          ) : status === 'delivered' ? (
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl text-center space-y-1">
              <span className="text-2xl block">🎉</span>
              <h5 className="text-green-400 text-xs font-black uppercase tracking-wider">Order Fully Verified</h5>
              <p className="text-gray-400 text-[10px] leading-relaxed">
                Thank you! You've successfully confirmed receipt of all items. The kitchen is notified that this order was completed without any missing items.
              </p>
            </div>
          ) : null}

          <div className="flex justify-between items-center pt-3 border-t-2 border-white/5 font-bold">
            <span className="text-white text-xs font-bold uppercase">Grand Total</span>
            <span className="text-brand-gold font-display font-black text-lg">
              ₱{totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Security badge and helpful triggers */}
        <div className="pt-4 border-t-2 border-white/5 flex items-center gap-2 text-[10px] text-gray-400 leading-normal bg-[#141414] p-3.5 rounded-2xl">
          <ShieldCheck className="w-5 h-5 text-brand-red flex-shrink-0" />
          <span>
            We value your order experience. If you need any immediate assistance, feel free to contact Curvada's kitchen support directly at <strong>0922-383-7377</strong>.
          </span>
        </div>

      </div>

    </div>
  );
}

export default React.memo(OrderTracker);
