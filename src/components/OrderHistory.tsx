import React, { useState } from 'react';
import { Order, CartItem } from '../types';
import { History, ShoppingBag, Eye, Calendar, ArrowRight, RotateCw, FileText } from 'lucide-react';
import ReceiptModal from './ReceiptModal';

interface OrderHistoryProps {
  orders: Order[];
  onOrderAgain: (items: CartItem[]) => void;
  onTrackOrder: (order: Order) => void;
  onBrowseMenu: () => void;
}

export default function OrderHistory({
  orders,
  onOrderAgain,
  onTrackOrder,
  onBrowseMenu,
}: OrderHistoryProps) {
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  
  // Format Date beautifully
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <section className="py-12 px-4 md:px-8 max-w-4xl mx-auto w-full space-y-8 animate-fade-in">
      
      {/* Title */}
      <div className="text-center">
        <h2 className="font-display font-black text-3xl text-white tracking-tight uppercase">
          My <span className="text-brand-red">Order History</span>
        </h2>
        <div className="h-1 w-12 bg-brand-red mx-auto mt-2.5 rounded-full" />
        <p className="text-gray-400 text-xs mt-2 max-w-sm mx-auto font-normal">
          Inspect, track active orders, or instantly re-order your favorite recipes.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-[#181818] border-2 border-white/5 rounded-[2rem] max-w-md mx-auto px-6 space-y-4 shadow-2xl">
          <div className="p-4 rounded-full bg-[#0D0D0C] w-16 h-16 flex items-center justify-center mx-auto text-2xl border border-white/5">
            ⏳
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-base">No Order History Found</h3>
            <p className="text-gray-400 text-xs mt-1 leading-normal max-w-xs mx-auto font-normal">
              You haven't placed any orders yet in this session. Add items to your cart, checkout, and experience our blazing fast delivery!
            </p>
          </div>
          <button
            onClick={onBrowseMenu}
            className="px-5 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-brand-red/20"
          >
            Start Ordering
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* List of past orders */}
          {orders.map((order) => {
            const isActive = order.status === 'pending' || order.status === 'preparing' || order.status === 'dispatched';

            return (
              <div
                key={order.id}
                className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-4 md:p-5 hover:border-brand-red/25 transition-all space-y-4 shadow-2xl"
              >
                
                {/* Order Meta Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-white/5 pb-3 text-xs">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-display font-black text-white text-sm uppercase tracking-tight">
                      Order #{order.id.slice(0, 8)}
                    </span>
                    <span className="text-white/10">|</span>
                    <span className="text-gray-400 flex items-center gap-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      {formatDate(order.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md tracking-wider border ${
                      order.status === 'pending'
                        ? 'bg-brand-red/15 text-brand-red border-brand-red/20'
                        : order.status === 'preparing'
                        ? 'bg-brand-gold/15 text-brand-gold border-brand-gold/20'
                        : order.status === 'dispatched'
                        ? 'bg-blue-600/15 text-blue-400 border-blue-600/20'
                        : order.status === 'delivered'
                        ? 'bg-green-600/15 text-green-400 border-green-600/20'
                        : 'bg-red-500/15 text-red-500 border-red-500/20'
                    }`}>
                      {order.status}
                    </span>

                    {isActive && (
                      <button
                        onClick={() => onTrackOrder(order)}
                        className="px-2.5 py-1 rounded-md bg-brand-red hover:bg-brand-red-hover text-white text-[10px] font-bold uppercase flex items-center gap-1 transition-all shadow-md hover:shadow-brand-red/25"
                      >
                        Track Live
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Ordered Items summary list */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  <div className="space-y-1.5 flex-1">
                    <div className="text-xs text-white font-bold flex flex-wrap gap-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="bg-[#0D0D0C] border-2 border-white/5 px-2.5 py-1.5 rounded-lg flex flex-col gap-0.5 text-white">
                          <div className="flex items-center gap-2">
                            <strong className="text-brand-red">{item.quantity}x</strong> {item.menuItem.name}
                            <span className="text-brand-gold text-[10px] font-mono ml-auto font-bold">
                              ₱{(item.totalUnitPrice * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <div className="text-[10px] text-gray-400 font-normal pl-2 border-l border-white/10 space-y-0.5 mt-0.5">
                              {item.selectedOptions.map((opt: any, optIdx: number) => {
                                const optTitle = opt.optionTitle || '';
                                const choiceName = typeof opt.choice === 'string' ? opt.choice : (opt.choice?.name || 'Option');
                                const choicePrice = opt.choice && typeof opt.choice.price === 'number' ? opt.choice.price : 0;

                                if (choicePrice === 0 && (choiceName.toLowerCase().startsWith('no ') || choiceName.toLowerCase() === 'none')) {
                                  return null;
                                }

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

                                return (
                                  <div key={optIdx} className="flex items-center justify-between gap-2">
                                    <span>+ {label}</span>
                                    {choicePrice > 0 && (
                                      <span className="text-brand-gold font-mono text-[9px] font-semibold">
                                        +₱{(choicePrice * item.quantity).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {item.specialInstructions && (
                            <span className="text-gray-500 text-[9px] italic pl-2">
                              * "{item.specialInstructions}"
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-[10px] text-gray-400 font-normal">
                      Fulfillment: <strong className="text-white font-bold capitalize">{order.customer.orderType}</strong> • Address: <strong className="text-white font-bold truncate max-w-xs inline-block align-bottom">{order.customer.address}</strong>
                    </p>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center justify-between md:justify-end gap-4 flex-shrink-0 pt-2 md:pt-0 border-t-2 border-white/5 md:border-none">
                    <div className="flex flex-col md:items-end">
                      <span className="text-gray-500 text-[9px] uppercase tracking-wider font-bold">Paid Total</span>
                      <span className="text-brand-gold font-display font-black text-base md:text-lg">
                        ₱{order.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPrintingOrder(order)}
                        className="px-3 py-2 rounded-xl bg-[#0D0D0C] hover:bg-[#222222] border-2 border-white/5 text-gray-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none uppercase tracking-wider shadow-sm cursor-pointer"
                        title="Print / View Customer Receipt"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-gold" />
                        Receipt
                      </button>

                      <button
                        onClick={() => onOrderAgain(order.items)}
                        className="px-3.5 py-2 rounded-xl bg-[#0D0D0C] hover:bg-[#222222] border-2 border-white/5 text-white hover:text-brand-gold text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none uppercase tracking-wider shadow-sm cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Reorder
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Printable Receipt Modal */}
      {printingOrder && (
        <ReceiptModal
          order={printingOrder}
          initialType="customer"
          onClose={() => setPrintingOrder(null)}
        />
      )}

    </section>
  );
}

