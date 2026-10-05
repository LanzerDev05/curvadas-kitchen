import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderStatus, MenuItem, CartItem, SelectedOption } from '../types';
import { X, Trash2, Plus, Minus, Check, AlertTriangle, Calendar, Clock, DollarSign, PackageCheck, User, Phone, MapPin, ShoppingBag, Edit } from 'lucide-react';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  menuItems: MenuItem[];
  onSave: (updatedOrder: Order, syncStock: boolean) => void;
  onDelete?: (orderId: string) => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  menuItems,
  onSave,
  onDelete,
}) => {
  if (!isOpen || !order) return null;

  // Local editable state
  const [timestamp, setTimestamp] = useState<string>(() => {
    try {
      const d = new Date(order.timestamp);
      if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
      return new Date().toISOString().slice(0, 16);
    }
  });

  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [customerName, setCustomerName] = useState(order.customer.name || '');
  const [customerPhone, setCustomerPhone] = useState(order.customer.phone || '');
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>(order.customer.orderType || 'pickup');
  const [tableNumber, setTableNumber] = useState(order.customer.tableNumber || '');
  const [address, setAddress] = useState(order.customer.address || '');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'ewallet' | 'card'>(order.paymentMethod || 'cod');
  const [isPaid, setIsPaid] = useState<boolean>(order.customer.isPaid ?? (order.status === 'delivered'));
  const [orderSource, setOrderSource] = useState<'online' | 'walkin' | 'messenger'>(order.orderSource || 'online');
  const [amountTendered, setAmountTendered] = useState<number | ''>(order.amountTendered !== undefined ? order.amountTendered : '');
  const [items, setItems] = useState<CartItem[]>(() => JSON.parse(JSON.stringify(order.items || [])));
  const [syncStock, setSyncStock] = useState<boolean>(true);
  const [totalOverride, setTotalOverride] = useState<number | ''>('');
  const [isTotalManual, setIsTotalManual] = useState<boolean>(false);

  // Add Item to Order State
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>(menuItems[0]?.id || '');
  const [addItemQty, setAddItemQty] = useState<number>(1);
  const [addItemInstructions, setAddItemInstructions] = useState<string>('');

  // Reset local state whenever opened or order changes
  useEffect(() => {
    if (order) {
      try {
        const d = new Date(order.timestamp);
        const pad = (n: number) => String(n).padStart(2, '0');
        setTimestamp(!isNaN(d.getTime()) ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : new Date().toISOString().slice(0, 16));
      } catch (e) {
        setTimestamp(new Date().toISOString().slice(0, 16));
      }
      setStatus(order.status);
      setCustomerName(order.customer.name || '');
      setCustomerPhone(order.customer.phone || '');
      setOrderType(order.customer.orderType || 'pickup');
      setTableNumber(order.customer.tableNumber || '');
      setAddress(order.customer.address || '');
      setPaymentMethod(order.paymentMethod || 'cod');
      setIsPaid(order.customer.isPaid ?? (order.status === 'delivered'));
      setOrderSource(order.orderSource || 'online');
      setAmountTendered(order.amountTendered !== undefined ? order.amountTendered : '');
      setItems(JSON.parse(JSON.stringify(order.items || [])));
      setSyncStock(true);
      setIsTotalManual(false);
      setTotalOverride('');
      setIsAddingItem(false);
    }
  }, [order, isOpen]);

  // Calculate items sum
  const calculatedItemsTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.totalUnitPrice) || 0) * (Number(it.quantity) || 0), 0);
  }, [items]);

  const finalTotalAmount = isTotalManual && typeof totalOverride === 'number' && totalOverride >= 0
    ? totalOverride
    : calculatedItemsTotal;

  const changeDue = typeof amountTendered === 'number' && amountTendered > finalTotalAmount
    ? amountTendered - finalTotalAmount
    : 0;

  const handleUpdateItemQty = (index: number, delta: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const newQty = (updated[index].quantity || 1) + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const handleUpdateItemPrice = (index: number, newUnitPrice: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], totalUnitPrice: Math.max(0, newUnitPrice) };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItemToOrder = () => {
    const itemToAdd = menuItems.find((m) => m.id === selectedMenuItemId);
    if (!itemToAdd) return;

    const newItem: CartItem = {
      id: `edit-item-${itemToAdd.id}-${Date.now()}`,
      menuItem: itemToAdd,
      quantity: Math.max(1, addItemQty),
      totalUnitPrice: itemToAdd.price,
      selectedOptions: [],
      specialInstructions: addItemInstructions.trim() || undefined,
    };

    setItems((prev) => [...prev, newItem]);
    setIsAddingItem(false);
    setAddItemQty(1);
    setAddItemInstructions('');
  };

  const handleSave = () => {
    if (items.length === 0) {
      alert('An order must contain at least 1 item.');
      return;
    }

    const isoTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    const updatedOrder: Order = {
      ...order,
      timestamp: isoTimestamp,
      status,
      orderSource,
      paymentMethod,
      totalAmount: finalTotalAmount,
      amountTendered: typeof amountTendered === 'number' ? amountTendered : undefined,
      changeAmount: typeof amountTendered === 'number' && amountTendered >= finalTotalAmount ? changeDue : undefined,
      customer: {
        ...order.customer,
        name: customerName.trim() || 'Walk-In Customer',
        phone: customerPhone.trim() || 'N/A',
        orderType,
        tableNumber: orderType === 'pickup' && tableNumber.trim() ? tableNumber.trim() : undefined,
        address: orderType === 'delivery' ? address.trim() : undefined,
        isPaid,
      },
      items,
      logs: [
        ...(order.logs || []),
        {
          status,
          timestamp: new Date().toISOString(),
          note: `Order modified manually in Sales Management Console (Total: ₱${finalTotalAmount.toFixed(2)}, Items: ${items.length}).`,
        },
      ],
    };

    onSave(updatedOrder, syncStock);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md overflow-y-auto animate-fade-in text-left">
      <div className="bg-[#141413] border-2 border-brand-gold/40 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl w-full max-w-4xl flex flex-col max-h-[94vh] animate-scale-up">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-white/5 bg-[#0D0D0C] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-gold/15 border border-brand-gold/30 text-brand-gold">
              <Edit className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-black text-white text-base sm:text-lg uppercase tracking-tight">
                  Edit Order #{String(order.id || (order as any)._id || 'ORD00000').slice(0, 8)}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-mono border ${
                  status === 'delivered' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                  status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                  'bg-brand-gold/10 text-brand-gold border-brand-gold/30'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">
                Adjust order date & time, item quantities, price overrides, customer info, and sync stock deductions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          
          {/* Section 1: Date & Time, Status & Channel */}
          <div className="bg-[#181818] border border-white/10 p-4 rounded-2xl space-y-4">
            <h4 className="font-display font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-gold" />
              <span>1. Order Date, Timestamp & Fulfillment Status</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Timestamp picker */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">
                  Order Date & Time (Past/Manual) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-brand-gold cursor-pointer"
                />
              </div>

              {/* Status picker */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">
                  Order Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    const newStatus = e.target.value as OrderStatus;
                    setStatus(newStatus);
                    if (newStatus === 'delivered') setIsPaid(true);
                  }}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-brand-gold font-bold focus:outline-none focus:border-brand-gold cursor-pointer"
                >
                  <option value="pending">⏳ Pending (Queue)</option>
                  <option value="preparing">🍳 Preparing (Cooking)</option>
                  <option value="dispatched">🛵 Dispatched / Ready</option>
                  <option value="delivered">✅ Delivered / Completed (Sales Counted)</option>
                  <option value="cancelled">🚫 Cancelled / Void</option>
                </select>
              </div>

              {/* Order Channel */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">
                  Order Channel / Source
                </label>
                <select
                  value={orderSource}
                  onChange={(e) => setOrderSource(e.target.value as any)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-brand-gold cursor-pointer"
                >
                  <option value="online">🌐 Online Storefront</option>
                  <option value="walkin">🚶 Walk-In Counter POS</option>
                  <option value="messenger">💬 Facebook Messenger</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Customer Details & Payment */}
          <div className="bg-[#181818] border border-white/10 p-4 rounded-2xl space-y-4">
            <h4 className="font-display font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-brand-gold" />
              <span>2. Customer & Payment Information</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">Contact Phone #</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="09123456789"
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">Fulfillment Type</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="pickup">🛍️ Pickup / Dine-In</option>
                  <option value="delivery">🛵 Delivery</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">
                  {orderType === 'pickup' ? 'Table # (Optional)' : 'Delivery Address'}
                </label>
                {orderType === 'pickup' ? (
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. Table 4"
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                  />
                ) : (
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Barangay, House #, Landmark"
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                  />
                )}
              </div>
            </div>

            {/* Payment Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-brand-gold font-bold focus:outline-none cursor-pointer"
                >
                  <option value="cod">💵 Cash / COD</option>
                  <option value="ewallet">📱 GCash / E-Wallet</option>
                  <option value="card">💳 Card</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase block">Cash Given / Tendered (₱)</label>
                <input
                  type="number"
                  min="0"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => setIsPaid(!isPaid)}
                  className={`w-full py-2 px-3 rounded-xl font-bold uppercase text-[10px] border flex items-center justify-between cursor-pointer transition-all ${
                    isPaid ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
                  }`}
                >
                  <span>Payment Settled:</span>
                  <span className="font-mono font-black">{isPaid ? '✓ PAID' : '⚠️ UNPAID'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Ordered Dishes & Items */}
          <div className="bg-[#181818] border border-white/10 p-4 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-brand-gold" />
                <span>3. Order Dishes & Quantities ({items.length} Dishes)</span>
              </h4>

              <button
                type="button"
                onClick={() => setIsAddingItem(!isAddingItem)}
                className="px-3 py-1.5 bg-brand-gold hover:bg-brand-gold-hover text-black font-black uppercase text-[10px] rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Dish
              </button>
            </div>

            {/* Add Dish Inline Panel */}
            {isAddingItem && (
              <div className="bg-[#0D0D0C] border border-brand-gold/30 p-3.5 rounded-2xl space-y-3 animate-fade-in">
                <span className="text-[10px] text-brand-gold uppercase font-black block">Select Dish to Add to Order:</span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-6 space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase font-bold block">Menu Dish</label>
                    <select
                      value={selectedMenuItemId}
                      onChange={(e) => setSelectedMenuItemId(e.target.value)}
                      className="w-full bg-[#141413] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-gold cursor-pointer"
                    >
                      {menuItems.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (₱{m.price.toFixed(2)}) - {m.category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase font-bold block">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={addItemQty}
                      onChange={(e) => setAddItemQty(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-[#141413] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold text-center"
                    />
                  </div>

                  <div className="sm:col-span-4 flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddItemToOrder}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[10px] rounded-xl cursor-pointer"
                    >
                      Confirm Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingItem(false)}
                      className="px-3 py-2 bg-[#222222] text-gray-400 hover:text-white rounded-xl text-[10px] font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#0D0D0C] border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{item.menuItem.name}</span>
                      <span className="text-[9px] text-gray-500 uppercase font-mono">({item.menuItem.category})</span>
                    </div>

                    {item.selectedOptions && item.selectedOptions.filter(opt => {
                      const name = (opt.choice?.name || '').toLowerCase().trim();
                      const price = opt.choice?.price || 0;
                      if (price === 0 && (name.startsWith('no ') || name === 'none' || name === 'no' || name.includes('no extra') || name.includes('no drink'))) return false;
                      return true;
                    }).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedOptions.filter(opt => {
                          const name = (opt.choice?.name || '').toLowerCase().trim();
                          const price = opt.choice?.price || 0;
                          if (price === 0 && (name.startsWith('no ') || name === 'none' || name === 'no' || name.includes('no extra') || name.includes('no drink'))) return false;
                          return true;
                        }).map((opt, oIdx) => (
                          <span key={oIdx} className="text-[8.5px] px-1.5 py-0.5 rounded font-bold bg-white/5 text-gray-300 border border-white/10">
                            + {opt.choice.name} {opt.choice.price > 0 ? `(+₱${opt.choice.price})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quantity & Unit Price Controls */}
                  <div className="flex items-center gap-3 justify-between sm:justify-end">
                    {/* Unit Price input */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-500 font-bold">Price: ₱</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.totalUnitPrice}
                        onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value) || 0)}
                        className="w-16 bg-[#181818] border border-white/10 rounded-lg px-1.5 py-1 text-xs text-white font-mono font-bold text-right"
                      />
                    </div>

                    {/* Quantity - / + */}
                    <div className="flex items-center gap-1 bg-[#181818] p-1 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(idx, -1)}
                        className="w-6 h-6 rounded bg-[#222222] flex items-center justify-center text-gray-300 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-white px-2 text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(idx, 1)}
                        className="w-6 h-6 rounded bg-[#222222] flex items-center justify-center text-gray-300 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <span className="font-mono text-brand-gold font-bold text-xs w-16 text-right">
                      ₱{(item.totalUnitPrice * item.quantity).toFixed(2)}
                    </span>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-gray-500 hover:text-brand-red rounded transition-all cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Total Calculation & Stock Synchronization */}
          <div className="bg-[#181818] border border-brand-gold/30 p-4 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Calculated Total</span>
                <span className="font-mono text-gray-300 text-sm">
                  ₱{calculatedItemsTotal.toFixed(2)}
                </span>
              </div>

              {/* Total Override */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsTotalManual(!isTotalManual);
                    if (!isTotalManual) setTotalOverride(calculatedItemsTotal);
                  }}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                    isTotalManual ? 'bg-brand-gold/15 border-brand-gold text-brand-gold font-black' : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  {isTotalManual ? 'Manual Override Active' : 'Enable Manual Price Override'}
                </button>

                {isTotalManual && (
                  <div className="flex items-center gap-1">
                    <span className="text-brand-gold font-mono font-bold text-sm">₱</span>
                    <input
                      type="number"
                      min="0"
                      value={totalOverride}
                      onChange={(e) => setTotalOverride(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-24 bg-[#0D0D0C] border border-brand-gold/50 rounded-xl px-2 py-1 text-sm text-brand-gold font-mono font-black text-right"
                    />
                  </div>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Final Order Total</span>
                <span className="font-display font-black text-brand-gold text-xl">
                  ₱{finalTotalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Inventory Stock Sync Toggle */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={syncStock}
                  onChange={(e) => setSyncStock(e.target.checked)}
                  className="w-4 h-4 accent-brand-gold rounded cursor-pointer"
                />
                <span className="text-[11px] font-bold">
                  🔄 Automatically synchronize pantry and ingredient stock levels for this edit
                </span>
              </label>

              <span className="text-[9px] text-gray-500">
                {syncStock ? 'Will restore previous items and deduct new items' : 'Bypasses stock deduction'}
              </span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t-2 border-white/5 bg-[#0D0D0C] flex flex-col sm:flex-row items-center justify-between gap-3">
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                const safeId = String(order.id || (order as any)._id || '');
                if (confirm(`Permanently delete Order #${safeId.slice(0, 8)}? This cannot be undone.`)) {
                  onDelete(safeId);
                  onClose();
                }
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-brand-red/40 text-brand-red hover:bg-brand-red hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Void & Delete Order
            </button>
          ) : <div />}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-[#181818] hover:bg-[#222222] border border-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-black font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save Order Changes
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EditOrderModal;
