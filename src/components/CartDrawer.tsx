import React from 'react';
import { CartItem, MenuItem } from '../types';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckoutClick: () => void;
  getDishStockCapacity: (item: MenuItem) => number;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckoutClick,
  getDishStockCapacity,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.totalUnitPrice * item.quantity,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity"
      />

      {/* Drawer Body */}
      <div className="relative w-full max-w-md h-full bg-[#181818] border-l-2 border-white/10 shadow-2xl flex flex-col z-10 animate-slide-in-right">
        
        {/* Header */}
        <div className="p-5 border-b-2 border-white/5 bg-[#0D0D0C] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-red" />
            <h3 className="font-display font-black text-white text-lg uppercase tracking-tight">My Cart ({cartItems.length})</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#222222] text-gray-500 hover:text-white border border-white/5 transition-all focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Cart Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center h-full py-20 px-4 space-y-4">
              <div className="p-4 rounded-full bg-[#0D0D0C] border border-white/5">
                <ShoppingBag className="w-10 h-10 text-gray-600" />
              </div>
              <div>
                <h4 className="font-display font-black text-white text-base uppercase tracking-tight">Your cart is empty</h4>
                <p className="text-gray-400 text-xs mt-1 max-w-xs mx-auto font-normal">
                  Add some delicious Bento, Silog, or Rice Bowl meals from our menu to start your order!
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-md hover:shadow-brand-red/20"
              >
                Start Browsing
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#0D0D0C] border-2 border-white/5 rounded-2xl p-4 flex gap-3 relative hover:border-brand-red/20 transition-all shadow-inner"
              >
                {/* Thumb */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#181818] border border-white/5 flex-shrink-0">
                  <img
                    src={item.menuItem.image}
                    alt={item.menuItem.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-display font-bold text-white text-sm truncate leading-snug">
                        {item.menuItem.name}
                      </h4>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-gray-500 hover:text-brand-red p-1 transition-colors -mr-1"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Options list */}
                    {item.selectedOptions.length > 0 && (
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                        {item.selectedOptions.map((opt) => (
                          <span
                            key={opt.optionTitle}
                            className="text-[10px] text-brand-red font-bold"
                          >
                            • {opt.choice.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Special Instructions note */}
                    {item.specialInstructions && (
                      <p className="text-[10px] text-brand-gold font-medium italic mt-2 bg-[#181818] p-2 rounded-lg border-l-2 border-brand-red truncate">
                        Note: "{item.specialInstructions}"
                      </p>
                    )}
                  </div>

                  {/* Quantity & Price */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-brand-gold text-sm font-extrabold font-mono">
                      ₱{(item.totalUnitPrice * item.quantity).toFixed(2)}
                    </span>

                    {/* Quantity modifier */}
                    <div className="flex items-center bg-[#181818] rounded-lg p-0.5 border border-white/5">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="p-1 rounded text-gray-400 hover:text-white transition-all hover:bg-[#222222]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-white">
                        {item.quantity}
                      </span>
                      {(() => {
                        const maxCap = getDishStockCapacity(item.menuItem);
                        const isMaxReached = item.quantity >= maxCap;
                        return (
                          <button
                            onClick={() => !isMaxReached && onUpdateQuantity(item.id, 1)}
                            disabled={isMaxReached}
                            className={`p-1 rounded text-gray-400 hover:text-white transition-all hover:bg-[#222222] ${
                              isMaxReached ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                            title={isMaxReached ? "Maximum stock limit reached" : "Increase quantity"}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                </div>

              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="p-5 bg-[#0D0D0C] border-t-2 border-white/5 space-y-4">
            
            {/* Calculation summary */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                <span>Subtotal</span>
                <span className="text-white font-bold">₱{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                <span>Fulfillment Fee</span>
                <span className="text-green-400 font-bold">FREE</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t-2 border-white/5 pt-2 text-white uppercase tracking-tight">
                <span>Total</span>
                <span className="text-brand-gold font-mono font-black text-base">₱{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Trigger */}
            <button
              onClick={onCheckoutClick}
              className="w-full py-4 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-brand-red/20 transition-all"
            >
              Checkout Order
              <ArrowRight className="w-4.5 h-4.5" />
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
