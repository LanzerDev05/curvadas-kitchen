import React, { useState, useMemo } from 'react';
import { Order, MenuItem, IngredientStock, StockBatch } from '../types';
import { X, Calendar, DollarSign, TrendingUp, PackageCheck, Copy, Check, Search, Download, Edit, Eye, Clock, ShoppingBag, ArrowRight, Layers, Sparkles } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// 1. DAILY SALES BREAKDOWN & RECONCILIATION MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface DailyBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  menuItems: MenuItem[];
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
  onOpenEditOrder: (order: Order) => void;
}

export const DailyBreakdownModal: React.FC<DailyBreakdownModalProps> = ({
  isOpen,
  onClose,
  orders,
  menuItems,
  selectedDate,
  onDateChange,
  onOpenEditOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'cancelled' | 'active'>('all');
  const [isCopied, setIsCopied] = useState(false);

  // Filter orders for the selected date
  const dayOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!o.timestamp) return false;
      return o.timestamp.startsWith(selectedDate);
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders, selectedDate]);

  // Delivered (Counted Sales) vs Cancelled vs In-Flight
  const deliveredOrders = useMemo(() => dayOrders.filter((o) => o.status === 'delivered'), [dayOrders]);
  const cancelledOrders = useMemo(() => dayOrders.filter((o) => o.status === 'cancelled'), [dayOrders]);
  const activeOrders = useMemo(() => dayOrders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled'), [dayOrders]);

  const deliveredGrossSales = useMemo(() => deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0), [deliveredOrders]);
  const allOrdersGross = useMemo(() => dayOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.totalAmount, 0), [dayOrders]);

  // Payment Breakdown
  const cashSales = useMemo(() => deliveredOrders.filter((o) => o.paymentMethod === 'cod').reduce((sum, o) => sum + o.totalAmount, 0), [deliveredOrders]);
  const ewalletSales = useMemo(() => deliveredOrders.filter((o) => o.paymentMethod === 'ewallet').reduce((sum, o) => sum + o.totalAmount, 0), [deliveredOrders]);
  const cardSales = useMemo(() => deliveredOrders.filter((o) => o.paymentMethod === 'card').reduce((sum, o) => sum + o.totalAmount, 0), [deliveredOrders]);

  // Dish Sales Aggregation
  const dishSalesStats = useMemo(() => {
    const map: Record<string, { menuItem: MenuItem; qty: number; totalRev: number; categories: string }> = {};

    deliveredOrders.forEach((o) => {
      o.items.forEach((item) => {
        const id = item.menuItem.id;
        if (!map[id]) {
          map[id] = {
            menuItem: item.menuItem,
            qty: 0,
            totalRev: 0,
            categories: item.menuItem.category,
          };
        }
        map[id].qty += item.quantity;
        map[id].totalRev += item.totalUnitPrice * item.quantity;
      });
    });

    return Object.values(map).sort((a, b) => b.totalRev - a.totalRev);
  }, [deliveredOrders]);

  const filteredDayOrders = useMemo(() => {
    return dayOrders.filter((o) => {
      if (statusFilter === 'delivered' && o.status !== 'delivered') return false;
      if (statusFilter === 'cancelled' && o.status !== 'cancelled') return false;
      if (statusFilter === 'active' && (o.status === 'delivered' || o.status === 'cancelled')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = o.id.toLowerCase().includes(q);
        const matchCust = o.customer.name.toLowerCase().includes(q) || o.customer.phone.includes(q);
        const matchDish = o.items.some((it) => it.menuItem.name.toLowerCase().includes(q));
        if (!matchId && !matchCust && !matchDish) return false;
      }
      return true;
    });
  }, [dayOrders, statusFilter, searchQuery]);

  if (!isOpen) return null;

  const formattedSelectedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleCopySummary = () => {
    const report = `===========================================
CURVADA'S KITCHEN - DAILY SALES RECONCILIATION
Date: ${formattedSelectedDate} (${selectedDate})
===========================================
TOTAL DELIVERED SALES: ₱${deliveredGrossSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
Total Orders Count:   ${deliveredOrders.length} completed (${cancelledOrders.length} voided, ${activeOrders.length} active)

--- PAYMENT BREAKDOWN ---
💵 Cash / Counter COD:  ₱${cashSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${deliveredGrossSales > 0 ? ((cashSales / deliveredGrossSales) * 100).toFixed(1) : 0}%)
📱 GCash / E-Wallet:    ₱${ewalletSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${deliveredGrossSales > 0 ? ((ewalletSales / deliveredGrossSales) * 100).toFixed(1) : 0}%)
💳 Card Payments:       ₱${cardSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${deliveredGrossSales > 0 ? ((cardSales / deliveredGrossSales) * 100).toFixed(1) : 0}%)

--- TOP DISHES SOLD ---
${dishSalesStats.map((d, i) => `${i + 1}. ${d.menuItem.name}: ${d.qty} plates = ₱${d.totalRev.toFixed(2)}`).join('\n')}
===========================================`;

    navigator.clipboard.writeText(report);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['Order ID', 'Time', 'Customer Name', 'Contact Phone', 'Fulfillment', 'Payment Method', 'Status', 'Total (PHP)', 'Dishes Summary'];
    const rows = dayOrders.map((o) => [
      `#${o.id.slice(0, 8)}`,
      new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      `"${o.customer.name}"`,
      `"${o.customer.phone}"`,
      o.customer.orderType,
      o.paymentMethod,
      o.status,
      o.totalAmount.toFixed(2),
      `"${o.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join('; ')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `curvada_sales_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md overflow-y-auto animate-fade-in text-left">
      <div className="bg-[#141413] border-2 border-emerald-500/30 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl w-full max-w-5xl flex flex-col max-h-[94vh] animate-scale-up">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-white/5 bg-[#0D0D0C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-black text-white text-base sm:text-lg uppercase tracking-tight">
                  Daily Sales Breakdown & Reconciliation
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {selectedDate}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">
                {formattedSelectedDate} • Real-time sales reconciliation against actual cash, GCash, and completed orders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Date Picker */}
            <div className="flex items-center gap-1.5 bg-[#181818] border border-white/10 rounded-xl px-2.5 py-1">
              <Calendar className="w-3.5 h-3.5 text-brand-gold" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-white font-mono font-bold text-xs focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          
          {/* Quick Date Selector Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-gray-500 uppercase font-bold pr-1">Jump Date:</span>
            {[
              { label: '☀️ Today', val: new Date().toISOString().split('T')[0] },
              { label: '🗓️ Yesterday', val: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
              { label: '2 Days Ago', val: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0] },
              { label: '3 Days Ago', val: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0] },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => onDateChange(p.val)}
                className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                  selectedDate === p.val
                    ? 'bg-emerald-500 text-black border-emerald-400 font-black'
                    : 'bg-[#181818] border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Metrics Top Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Delivered Gross Sales */}
            <div className="bg-[#181818] border border-emerald-500/20 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Completed Gross Sales</span>
              <span className="font-display font-black text-emerald-400 text-xl md:text-2xl">
                ₱{deliveredGrossSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-gray-500 font-mono block">From {deliveredOrders.length} delivered orders</span>
            </div>

            {/* Cash Collected */}
            <div className="bg-[#181818] border border-white/5 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">💵 Cash / Counter COD</span>
              <span className="font-display font-black text-white text-lg md:text-xl">
                ₱{cashSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-brand-gold font-mono block">
                {deliveredGrossSales > 0 ? ((cashSales / deliveredGrossSales) * 100).toFixed(0) : 0}% of total sales
              </span>
            </div>

            {/* GCash / E-Wallet */}
            <div className="bg-[#181818] border border-white/5 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">📱 GCash / E-Wallet</span>
              <span className="font-display font-black text-blue-400 text-lg md:text-xl">
                ₱{ewalletSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-gray-400 font-mono block">
                {deliveredGrossSales > 0 ? ((ewalletSales / deliveredGrossSales) * 100).toFixed(0) : 0}% of total sales
              </span>
            </div>

            {/* Total Orders / Voided */}
            <div className="bg-[#181818] border border-white/5 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Orders Fulfilled</span>
              <span className="font-display font-black text-brand-gold text-lg md:text-xl">
                {deliveredOrders.length} Delivered
              </span>
              <span className="text-[9px] text-brand-red font-mono block">
                {cancelledOrders.length} voided / {activeOrders.length} active
              </span>
            </div>
          </div>

          {/* Dish Sales Performance Table */}
          <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="font-display font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-brand-gold" />
                <span>Dishes Sold on this Day ({dishSalesStats.reduce((s, d) => s + d.qty, 0)} Total Plates)</span>
              </h4>
              <span className="text-[9px] text-gray-500 font-mono">Ranked by revenue</span>
            </div>

            {dishSalesStats.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                No dishes were recorded sold on this date yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-gray-500 uppercase text-[9px] font-black border-b border-white/5">
                      <th className="pb-2">#</th>
                      <th className="pb-2">Dish Item</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2 text-center">Qty Sold</th>
                      <th className="pb-2 text-right">Revenue</th>
                      <th className="pb-2 text-right">% Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {dishSalesStats.map((dish, i) => {
                      const share = deliveredGrossSales > 0 ? (dish.totalRev / deliveredGrossSales) * 100 : 0;
                      return (
                        <tr key={dish.menuItem.id} className="hover:bg-white/[0.02]">
                          <td className="py-2 text-gray-500">{i + 1}</td>
                          <td className="py-2 font-bold text-white font-sans">{dish.menuItem.name}</td>
                          <td className="py-2 text-gray-400 capitalize">{dish.categories}</td>
                          <td className="py-2 text-center text-brand-gold font-bold">{dish.qty} pcs</td>
                          <td className="py-2 text-right text-green-400 font-bold">₱{dish.totalRev.toFixed(2)}</td>
                          <td className="py-2 text-right text-gray-400">{share.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Day Transactions Table with Quick Edit */}
          <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
              <div>
                <h4 className="font-display font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-gold" />
                  <span>Orders Ledger for {selectedDate} ({filteredDayOrders.length} Orders)</span>
                </h4>
                <p className="text-[9px] text-gray-500 mt-0.5">
                  Click 'Edit' on any transaction to adjust prices, dishes, customer details, or status.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Search order # or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#0D0D0C] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-gold"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-[#0D0D0C] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-brand-gold font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Orders</option>
                  <option value="delivered">Completed Only</option>
                  <option value="cancelled">Voided Only</option>
                  <option value="active">In-Flight Only</option>
                </select>
              </div>
            </div>

            {/* Transactions List */}
            {filteredDayOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                🔍 No transactions found for the selected date and filters.
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredDayOrders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-[#0D0D0C] border border-white/5 hover:border-brand-gold/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-white text-xs">#{o.id.slice(0, 8)}</span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`text-[8.5px] uppercase font-black px-2 py-0.2 rounded font-mono ${
                          o.status === 'delivered' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          o.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-brand-gold/10 text-brand-gold border border-brand-gold/20'
                        }`}>
                          {o.status}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-gray-400">
                          {o.paymentMethod === 'cod' ? '💵 Cash' : o.paymentMethod === 'ewallet' ? '📱 GCash' : '💳 Card'}
                        </span>
                      </div>

                      <div className="text-xs text-gray-300">
                        <strong>{o.customer.name}</strong> ({o.customer.phone}) • <span className="capitalize">{o.customer.orderType}</span>
                        {o.customer.tableNumber ? ` (Table ${o.customer.tableNumber})` : ''}
                      </div>

                      <div className="text-[10px] text-gray-400 truncate">
                        {o.items.map((it) => `${it.quantity}x ${it.menuItem.name}`).join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                      <span className="font-mono font-extrabold text-brand-gold text-sm">
                        ₱{o.totalAmount.toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          onOpenEditOrder(o);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t-2 border-white/5 bg-[#0D0D0C] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[10px] text-gray-400">
            Reconciling <strong>{deliveredOrders.length} completed transactions</strong> amounting to <strong>₱{deliveredGrossSales.toFixed(2)}</strong>.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#181818] hover:bg-[#222222] border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-brand-gold" /> Export CSV
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#181818] hover:bg-[#222222] border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-brand-gold" />}
              <span>{isCopied ? 'Copied Summary!' : 'Copy Summary'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// 2. DAILY STOCK CONSUMPTION AUDIT & RECONCILIATION MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface DailyStockAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  menuItems: MenuItem[];
  ingredientsInventory: IngredientStock[];
  stockBatches?: StockBatch[];
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
}

export const DailyStockAuditModal: React.FC<DailyStockAuditModalProps> = ({
  isOpen,
  onClose,
  orders,
  menuItems,
  ingredientsInventory,
  stockBatches = [],
  selectedDate,
  onDateChange,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [checkedPantryItems, setCheckedPantryItems] = useState<Record<string, boolean>>({});

  // Filter delivered orders for the selected date
  const deliveredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!o.timestamp) return false;
      return o.timestamp.startsWith(selectedDate) && o.status === 'delivered';
    });
  }, [orders, selectedDate]);

  const totalDeliveredSales = useMemo(() => {
    return deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  }, [deliveredOrders]);

  // Aggregate ingredient consumption with FIFO Batch Costing
  const stockAuditList = useMemo(() => {
    const consumptionMap: Record<string, {
      name: string;
      consumedAmount: number;
      unit: string;
      invStock?: IngredientStock;
      estimatedCost: number;
      isFifoCosted?: boolean;
    }> = {};

    deliveredOrders.forEach((order) => {
      order.items.forEach((cartItem) => {
        const item = cartItem.menuItem;
        const qty = cartItem.quantity;

        if (item.recipeRequirements && item.recipeRequirements.length > 0) {
          item.recipeRequirements.forEach((req) => {
            const ingKey = req.name.toLowerCase().trim();
            const inv = ingredientsInventory.find((i) => i.name.toLowerCase().trim() === ingKey);
            const unit = inv ? inv.unit : 'g';
            const reqAmount = (inv && inv.unit === 'kg') ? req.amount / 1000 : req.amount;
            const consumed = reqAmount * qty;

            // FIFO Batch Cost calculation
            const batches = inv ? stockBatches.filter(b => (b.ingredientId === inv.id || b.ingredientName.toLowerCase().trim() === ingKey) && b.remainingQuantity > 0).sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime()) : [];
            let cost = 0;
            let isFifo = false;

            if (batches.length > 0) {
              isFifo = true;
              let remaining = consumed;
              for (const b of batches) {
                if (remaining <= 0) break;
                const take = Math.min(remaining, b.remainingQuantity);
                cost += take * (b.costPerUnit || 0.05);
                remaining -= take;
              }
              if (remaining > 0) {
                cost += remaining * (inv?.costPerUnit || 0.05);
              }
            } else {
              const unitCost = (inv && inv.costPerUnit !== undefined && inv.costPerUnit !== null) ? inv.costPerUnit : (unit === 'kg' ? 150 : unit === 'pcs' ? 15 : 0.05);
              cost = consumed * unitCost;
            }

            if (!consumptionMap[ingKey]) {
              consumptionMap[ingKey] = {
                name: req.name,
                consumedAmount: 0,
                unit,
                invStock: inv,
                estimatedCost: 0,
                isFifoCosted: isFifo
              };
            }
            consumptionMap[ingKey].consumedAmount += consumed;
            consumptionMap[ingKey].estimatedCost += cost;
            if (isFifo) consumptionMap[ingKey].isFifoCosted = true;
          });
        } else if (item.ingredients && item.ingredients.length > 0) {
          item.ingredients.forEach((ingName) => {
            const ingKey = ingName.toLowerCase().trim();
            const inv = ingredientsInventory.find((i) => i.name.toLowerCase().trim() === ingKey);
            const unit = inv ? inv.unit : 'g';
            const reqPerServing = (unit === 'pcs' || unit === 'cans') ? 1 : unit === 'kg' ? 0.1 : 100;
            const consumed = reqPerServing * qty;
            const unitCost = (inv && inv.costPerUnit !== undefined && inv.costPerUnit !== null) ? inv.costPerUnit : 5;
            const cost = consumed * unitCost;

            if (!consumptionMap[ingKey]) {
              consumptionMap[ingKey] = {
                name: ingName,
                consumedAmount: 0,
                unit,
                invStock: inv,
                estimatedCost: 0,
              };
            }
            consumptionMap[ingKey].consumedAmount += consumed;
            consumptionMap[ingKey].estimatedCost += cost;
          });
        }
      });
    });

    return Object.values(consumptionMap).sort((a, b) => b.estimatedCost - a.estimatedCost);
  }, [deliveredOrders, ingredientsInventory, stockBatches]);

  const totalRecipeCOGS = useMemo(() => {
    return stockAuditList.reduce((sum, item) => sum + item.estimatedCost, 0);
  }, [stockAuditList]);

  const grossFoodMargin = totalDeliveredSales > 0 ? ((totalDeliveredSales - totalRecipeCOGS) / totalDeliveredSales) * 100 : 0;

  if (!isOpen) return null;

  const formattedSelectedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleToggleCheck = (key: string) => {
    setCheckedPantryItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyReport = () => {
    const report = `===========================================
CURVADA'S KITCHEN - DAILY INGREDIENT CONSUMPTION AUDIT
Date: ${formattedSelectedDate} (${selectedDate})
Total Delivered Sales: ₱${totalDeliveredSales.toFixed(2)} (${deliveredOrders.length} orders)
Total Recipe COGS:     ₱${totalRecipeCOGS.toFixed(2)}
Gross Food Margin:     ${grossFoodMargin.toFixed(1)}%
===========================================
INGREDIENT CONSUMPTION & CURRENT STOCK LEVELS:
${stockAuditList.map((item, i) => {
  const curStock = item.invStock ? `${item.invStock.quantity}${item.invStock.unit}` : 'Not in inventory';
  return `${i + 1}. ${item.name}: Consumed ${item.consumedAmount.toFixed(1)} ${item.unit} | Cost: ₱${item.estimatedCost.toFixed(2)} | Current In-Stock: ${curStock}`;
}).join('\n')}
===========================================`;

    navigator.clipboard.writeText(report);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md overflow-y-auto animate-fade-in text-left">
      <div className="bg-[#141413] border-2 border-blue-500/30 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl w-full max-w-5xl flex flex-col max-h-[94vh] animate-scale-up">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-white/5 bg-[#0D0D0C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <PackageCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-black text-white text-base sm:text-lg uppercase tracking-tight">
                  Daily Ingredient Stock Consumption Audit
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  {selectedDate}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">
                {formattedSelectedDate} • Cross-verify ingredient consumption against current physical stock in the kitchen pantry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#181818] border border-white/10 rounded-xl px-2.5 py-1">
              <Calendar className="w-3.5 h-3.5 text-brand-gold" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-white font-mono font-bold text-xs focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-gray-500 uppercase font-bold pr-1">Jump Date:</span>
            {[
              { label: '☀️ Today', val: new Date().toISOString().split('T')[0] },
              { label: '🗓️ Yesterday', val: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
              { label: '2 Days Ago', val: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0] },
              { label: '3 Days Ago', val: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0] },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => onDateChange(p.val)}
                className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                  selectedDate === p.val
                    ? 'bg-blue-500 text-black border-blue-400 font-black'
                    : 'bg-[#181818] border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Audit Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#181818] border border-white/5 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Delivered Sales</span>
              <span className="font-display font-black text-emerald-400 text-lg md:text-xl">
                ₱{totalDeliveredSales.toFixed(2)}
              </span>
              <span className="text-[9px] text-gray-500 font-mono block">{deliveredOrders.length} completed orders</span>
            </div>

            <div className="bg-[#181818] border border-white/5 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Estimated Recipe COGS</span>
              <span className="font-display font-black text-amber-400 text-lg md:text-xl">
                ₱{totalRecipeCOGS.toFixed(2)}
              </span>
              <span className="text-[9px] text-gray-500 font-mono block">Materials used today</span>
            </div>

            <div className="bg-[#181818] border border-white/5 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Gross Food Margin</span>
              <span className="font-display font-black text-brand-gold text-lg md:text-xl">
                {grossFoodMargin.toFixed(1)}%
              </span>
              <span className="text-[9px] text-gray-500 font-mono block">Profit before operating overheads</span>
            </div>

            <div className="bg-[#181818] border border-white/5 p-4 rounded-2xl space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Materials Consumed</span>
              <span className="font-display font-black text-blue-400 text-lg md:text-xl">
                {stockAuditList.length} Ingredients
              </span>
              <span className="text-[9px] text-gray-500 font-mono block">Tracked from recipes</span>
            </div>
          </div>

          {/* Detailed Stock Consumption Audit Table */}
          <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="font-display font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <span>📋 Ingredient Usage vs. Kitchen Storage Count</span>
              </h4>
              <span className="text-[9px] text-gray-500">
                Check off items as you perform physical inventory reconciliation
              </span>
            </div>

            {stockAuditList.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-xs">
                No ingredient consumption recorded on {selectedDate}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-gray-500 uppercase text-[9px] font-black border-b border-white/5 bg-[#0D0D0C]">
                      <th className="p-3 w-10 text-center">Done</th>
                      <th className="p-3">Ingredient Name</th>
                      <th className="p-3 text-center">Amount Consumed</th>
                      <th className="p-3 text-right">Est. Cost</th>
                      <th className="p-3 text-center">Current Pantry Stock</th>
                      <th className="p-3 text-right">Inventory Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stockAuditList.map((item) => {
                      const isChecked = !!checkedPantryItems[item.name];
                      const inv = item.invStock;
                      const isDepleted = inv ? inv.quantity <= 0 : false;
                      const isLow = inv ? inv.quantity <= inv.lowStockAlert && !isDepleted : false;

                      return (
                        <tr key={item.name} className={`hover:bg-white/[0.02] transition-colors ${isChecked ? 'opacity-60 bg-green-500/[0.02]' : ''}`}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCheck(item.name)}
                              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-sans font-bold text-white">
                            <span>{item.name}</span>
                            {!inv && (
                              <span className="text-[8.5px] bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded ml-2 font-mono">
                                Missing in Inventory
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center text-brand-gold font-bold">
                            {item.consumedAmount.toFixed(1)} {item.unit}
                          </td>
                          <td className="p-3 text-right text-gray-300 font-bold">
                            <div className="flex items-center justify-end gap-1">
                              <span>₱{item.estimatedCost.toFixed(2)}</span>
                              {item.isFifoCosted && (
                                <span className="text-[8px] bg-brand-gold/15 text-brand-gold border border-brand-gold/30 px-1 py-0.2 rounded font-mono font-bold" title="Accurately costed from actual FIFO purchase batches">
                                  FIFO
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center font-bold">
                            {inv ? (
                              <span className={isDepleted ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-green-400'}>
                                {inv.quantity} {inv.unit}
                              </span>
                            ) : (
                              <span className="text-gray-500 italic font-sans text-[10px]">Unlinked</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-sans">
                            {isDepleted ? (
                              <span className="text-[9px] bg-red-500/15 border border-red-500/30 text-red-400 px-2 py-0.5 rounded font-black uppercase">
                                🚨 Depleted
                              </span>
                            ) : isLow ? (
                              <span className="text-[9px] bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded font-black uppercase">
                                ⚠️ Low Stock
                              </span>
                            ) : inv ? (
                              <span className="text-[9px] bg-green-500/15 border border-green-500/30 text-green-400 px-2 py-0.5 rounded font-bold uppercase">
                                ✓ Healthy
                              </span>
                            ) : (
                              <span className="text-[9px] text-gray-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t-2 border-white/5 bg-[#0D0D0C] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[10px] text-gray-400">
            Audit report calculated from <strong>{deliveredOrders.length} delivered orders</strong> using recipe portion multipliers.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyReport}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#181818] hover:bg-[#222222] border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5 text-brand-gold" />}
              <span>{isCopied ? 'Copied Audit!' : 'Copy Audit Report'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-500 hover:bg-blue-400 text-black font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
