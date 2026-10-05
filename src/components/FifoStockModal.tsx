import React, { useState, useMemo } from 'react';
import { IngredientStock, MenuItem, StockBatch, SpoilageRecord } from '../types';
import { 
  X, 
  Package, 
  Layers, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Clock, 
  Check, 
  Copy, 
  Download, 
  Search, 
  Scale, 
  FileSpreadsheet, 
  Calculator, 
  Sparkles, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { calculateFIFODishCost, calculateStockLossReport, getFIFOBatchesForIngredient } from '../services/fifoStockService';
import { SearchableSelect } from './SearchableSelect';

interface FifoStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredientsInventory: IngredientStock[];
  stockBatches: StockBatch[];
  menuItems: MenuItem[];
  spoilageRecords?: SpoilageRecord[];
  initialIngredientId?: string;
  initialSubTab?: 'batches' | 'intake' | 'simulator' | 'variance' | 'loss-ledger';
  onAddBatch: (batch: StockBatch) => void;
  onUpdateBatch: (batchId: string, updates: Partial<StockBatch>) => void;
  onDeleteBatch: (batchId: string) => void;
  onLogSpoilage?: (ingredientId: string, amount: number, reason: 'expired' | 'spilled' | 'damaged' | 'quality_defect', cost: number) => void;
}

export const FifoStockModal: React.FC<FifoStockModalProps> = ({
  isOpen,
  onClose,
  ingredientsInventory,
  stockBatches,
  menuItems,
  spoilageRecords = [],
  initialIngredientId,
  initialSubTab,
  onAddBatch,
  onUpdateBatch,
  onDeleteBatch,
  onLogSpoilage,
}) => {
  if (!isOpen) return null;

  // Active Tab
  const [activeSubTab, setActiveSubTab] = useState<'batches' | 'intake' | 'simulator' | 'variance' | 'loss-ledger'>(() => initialSubTab || 'batches');

  // Search and filters for Batch Lots
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIngredientFilter, setSelectedIngredientFilter] = useState<string>(() => initialIngredientId || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring_soon' | 'expired' | 'depleted'>('all');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'exp-asc' | 'cost-desc' | 'qty-desc'>('date-asc');

  // Physical Stocktake state
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
  const [isCopied, setIsCopied] = useState(false);

  // Live Recipe Simulator state
  const [selectedDishId, setSelectedDishId] = useState<string>(() => menuItems[0]?.id || '');

  // New Batch Intake Form State
  const [intakeIngId, setIntakeIngId] = useState<string>(() => initialIngredientId || ingredientsInventory[0]?.id || '');
  const [intakeBatchNumber, setIntakeBatchNumber] = useState<string>(() => `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`);
  const [intakeReceivedDate, setIntakeReceivedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [intakeExpiryDate, setIntakeExpiryDate] = useState<string>(() => {
    const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return exp.toISOString().slice(0, 10);
  });
  const [intakeQuantity, setIntakeQuantity] = useState<number | ''>(1000);
  const [intakeCostPerUnit, setIntakeCostPerUnit] = useState<number | ''>('');
  const [intakePackCost, setIntakePackCost] = useState<number | ''>('');
  const [intakeSupplier, setIntakeSupplier] = useState<string>('');
  const [intakeInvoice, setIntakeInvoice] = useState<string>('');
  const [intakeNotes, setIntakeNotes] = useState<string>('');

  // Sync initialIngredientId and initialSubTab when opened
  React.useEffect(() => {
    if (initialIngredientId) {
      setSelectedIngredientFilter(initialIngredientId);
      setIntakeIngId(initialIngredientId);
      const ing = ingredientsInventory.find(i => i.id === initialIngredientId);
      if (ing) {
        setIntakeCostPerUnit(ing.costPerUnit || 0.05);
        if (ing.packCost) setIntakePackCost(ing.packCost);
        if (ing.supplier?.name) setIntakeSupplier(ing.supplier.name);
      }
    }
  }, [initialIngredientId, isOpen, ingredientsInventory]);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, isOpen]);

  // Pre-fill cost when ingredient selection changes in intake form
  const handleIntakeIngredientChange = (ingId: string) => {
    setIntakeIngId(ingId);
    const ing = ingredientsInventory.find(i => i.id === ingId);
    if (ing) {
      setIntakeCostPerUnit(ing.costPerUnit || 0.05);
      if (ing.packCost) setIntakePackCost(ing.packCost);
      if (ing.supplier?.name) setIntakeSupplier(ing.supplier.name);
    }
  };

  const ingredientFilterOptions = useMemo(() => [
    { value: 'all', label: `All Pantry Ingredients (${ingredientsInventory.length})` },
    ...ingredientsInventory.map(ing => ({
      value: ing.id,
      label: ing.name,
      sublabel: `Stock: ${ing.quantity} ${ing.unit}`,
      badge: ing.unit,
    }))
  ], [ingredientsInventory]);

  const intakeIngredientOptions = useMemo(() => ingredientsInventory.map(ing => ({
    value: ing.id,
    label: ing.name,
    sublabel: `Current: ${ing.quantity} ${ing.unit} • ₱${(ing.costPerUnit || 0).toFixed(2)}/${ing.unit}`,
    badge: ing.unit,
  })), [ingredientsInventory]);

  // Stock Loss & Valuation Metrics
  const lossReport = useMemo(() => {
    return calculateStockLossReport(stockBatches, spoilageRecords, physicalCounts, ingredientsInventory);
  }, [stockBatches, spoilageRecords, physicalCounts, ingredientsInventory]);

  // Total active stock inventory value based on exact FIFO batch prices
  const totalActiveInventoryValue = useMemo(() => {
    return stockBatches
      .filter(b => (b.status === 'active' || !b.status) && b.remainingQuantity > 0)
      .reduce((sum, b) => sum + (b.remainingQuantity * (b.costPerUnit || 0)), 0);
  }, [stockBatches]);

  // Squeezed Dishes Analysis (Dishes where current FIFO batch cost is higher than baseline)
  const squeezedDishes = useMemo(() => {
    return menuItems.map(item => {
      const res = calculateFIFODishCost(item, ingredientsInventory, stockBatches);
      return { item, res };
    }).filter(d => d.res.isMarginSqueezed);
  }, [menuItems, ingredientsInventory, stockBatches]);

  // Filtered & Sorted Batches
  const filteredBatches = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const next7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return stockBatches.filter(batch => {
      // 1. Ingredient Filter
      if (selectedIngredientFilter !== 'all') {
        const ing = ingredientsInventory.find(i => i.id === selectedIngredientFilter);
        if (ing && batch.ingredientId !== ing.id && batch.ingredientName.toLowerCase() !== ing.name.toLowerCase()) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter === 'active') {
        if (batch.status === 'depleted' || batch.remainingQuantity <= 0) return false;
      } else if (statusFilter === 'expiring_soon') {
        if (!batch.expiryDate || batch.remainingQuantity <= 0 || batch.expiryDate < todayStr || batch.expiryDate > next7DaysStr) {
          return false;
        }
      } else if (statusFilter === 'expired') {
        if (!batch.expiryDate || batch.remainingQuantity <= 0 || batch.expiryDate >= todayStr) {
          return false;
        }
      } else if (statusFilter === 'depleted') {
        if (batch.status !== 'depleted' && batch.remainingQuantity > 0) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchBatch = batch.batchNumber.toLowerCase().includes(q);
        const matchName = batch.ingredientName.toLowerCase().includes(q);
        const matchSupplier = (batch.supplierName || '').toLowerCase().includes(q);
        const matchInvoice = (batch.invoiceNumber || '').toLowerCase().includes(q);
        if (!matchBatch && !matchName && !matchSupplier && !matchInvoice) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-asc') return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime();
      if (sortBy === 'date-desc') return new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime();
      if (sortBy === 'exp-asc') return (a.expiryDate || '9999').localeCompare(b.expiryDate || '9999');
      if (sortBy === 'cost-desc') return (b.costPerUnit || 0) - (a.costPerUnit || 0);
      if (sortBy === 'qty-desc') return b.remainingQuantity - a.remainingQuantity;
      return 0;
    });
  }, [stockBatches, selectedIngredientFilter, statusFilter, searchQuery, sortBy, ingredientsInventory]);

  // Selected dish simulation result
  const selectedDishSimulation = useMemo(() => {
    const dish = menuItems.find(m => m.id === selectedDishId);
    if (!dish) return null;
    return calculateFIFODishCost(dish, ingredientsInventory, stockBatches);
  }, [selectedDishId, menuItems, ingredientsInventory, stockBatches]);

  // Handle Submit New Batch
  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const ing = ingredientsInventory.find(i => i.id === intakeIngId);
    if (!ing) {
      alert('Please select a valid ingredient.');
      return;
    }
    const qty = Number(intakeQuantity);
    if (!qty || qty <= 0) {
      alert('Please enter a valid received quantity greater than 0.');
      return;
    }

    let unitCost = Number(intakeCostPerUnit);
    if (isNaN(unitCost) || unitCost <= 0) {
      unitCost = ing.costPerUnit || (ing.unit === 'pcs' ? 15 : 0.05);
    }

    const newBatch: StockBatch = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      batchNumber: intakeBatchNumber.trim() || `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      receivedDate: intakeReceivedDate,
      expiryDate: intakeExpiryDate || undefined,
      initialQuantity: qty,
      remainingQuantity: qty,
      unit: ing.unit,
      costPerUnit: Number(unitCost.toFixed(4)),
      packCost: intakePackCost !== '' ? Number(Number(intakePackCost).toFixed(2)) : undefined,
      supplierName: intakeSupplier.trim() || undefined,
      invoiceNumber: intakeInvoice.trim() || undefined,
      notes: intakeNotes.trim() || undefined,
      status: 'active'
    };

    onAddBatch(newBatch);
    alert(`✅ Batch "${newBatch.batchNumber}" for ${ing.name} (${qty} ${ing.unit} @ ₱${unitCost}/${ing.unit}) successfully added to FIFO queue.`);
    setActiveSubTab('batches');
  };

  // Export CSV of Batches & Stock Losses
  const handleExportCSV = () => {
    const headers = ['Batch Number', 'Ingredient', 'Received Date', 'Expiry Date', 'Initial Qty', 'Remaining Qty', 'Unit', 'Unit Cost (PHP)', 'Lot Valuation (PHP)', 'Supplier', 'Status'];
    const rows = stockBatches.map(b => [
      `"${b.batchNumber}"`,
      `"${b.ingredientName}"`,
      `"${b.receivedDate}"`,
      `"${b.expiryDate || 'N/A'}"`,
      b.initialQuantity,
      b.remainingQuantity,
      `"${b.unit}"`,
      b.costPerUnit.toFixed(4),
      (b.remainingQuantity * b.costPerUnit).toFixed(2),
      `"${b.supplierName || 'N/A'}"`,
      `"${b.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `curvada_fifo_batches_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Summary Clipboard
  const handleCopySummary = () => {
    const text = `📦 CURVADA FIFO STOCK & LOSS AUDIT REPORT
Date: ${new Date().toLocaleDateString()}
Total Active Batches: ${lossReport.activeBatchesCount}
Total Active Inventory Valuation: ₱${totalActiveInventoryValue.toFixed(2)}
---------------------------------------------
⚠️ FINANCIAL LOSSES & SHRINKAGE:
• Expired Batch Losses: ₱${lossReport.totalExpiredLossCost.toFixed(2)} (${lossReport.expiredBatchesCount} batches)
• Kitchen Spoilage Losses: ₱${lossReport.totalSpoilageLossCost.toFixed(2)}
• Physical Count Discrepancies: ₱${lossReport.totalVarianceLossCost.toFixed(2)}
• Total Combined Loss: ₱${lossReport.totalCombinedLossCost.toFixed(2)}
---------------------------------------------
⚡ MARGIN SQUEEZE ALERTS:
${squeezedDishes.length > 0 
  ? squeezedDishes.map(d => `• ${d.item.name}: FIFO Cost ₱${d.res.totalCost.toFixed(2)} (Margin ${d.res.marginPercent}% vs Target ${d.item.targetMarginPercent || 50}%)`).join('\n')
  : 'All menu dishes are operating within target profit margins!'}
`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in text-left">
      <div className="bg-[#121211] border-2 border-brand-gold/30 rounded-[2.5rem] w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-6 border-b-2 border-white/5 bg-[#181818]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-brand-gold/15 text-brand-gold font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-wider border border-brand-gold/30 flex items-center gap-1.5 shadow-sm">
                <Layers className="w-3.5 h-3.5" /> FIFO Stock & Pricing Engine
              </span>
              <span className="text-[11px] text-gray-400 font-bold hidden sm:inline">First-In First-Out Multi-Lot Reconciler</span>
            </div>
            <h2 className="font-display font-black text-white text-lg sm:text-2xl mt-1.5 flex items-center gap-2">
              Smart Stock FIFO & Recipe Loss Manager
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Track shifting purchase costs, consume oldest lots first, monitor expired batches, and catch recipe margin squeeze.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSubTab('intake')}
              className="px-3.5 py-2 rounded-xl bg-brand-gold hover:bg-brand-gold-hover text-black text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Intake New Batch
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-[#0D0D0C] hover:bg-[#222] border border-white/10 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Download CSV report of all batch lots"
            >
              <Download className="w-3.5 h-3.5 text-brand-gold" /> Export CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-[#0D0D0C] border border-white/10 hover:border-brand-red text-gray-400 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Highlight Metrics Cards */}
        <div className="p-4 sm:p-6 bg-[#0D0D0C]/70 border-b border-white/5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Card 1: Total Valuation */}
          <div className="bg-[#181818] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider">FIFO Active Stock Value</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <h3 className="font-mono font-extrabold text-white text-lg sm:text-xl text-emerald-400">
                ₱{totalActiveInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5 font-bold">
                {lossReport.activeBatchesCount} active lots across {ingredientsInventory.length} items
              </p>
            </div>
          </div>

          {/* Card 2: Total Financial Losses */}
          <div className="bg-[#181818] border border-brand-red/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-brand-red uppercase font-black tracking-wider">Total Losses & Spoilage</span>
              <AlertTriangle className="w-4 h-4 text-brand-red" />
            </div>
            <div className="mt-2">
              <h3 className="font-mono font-extrabold text-brand-red text-lg sm:text-xl">
                ₱{lossReport.totalCombinedLossCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {lossReport.expiredBatchesCount} expired + spoilage records
              </p>
            </div>
          </div>

          {/* Card 3: Margin Squeeze Alert */}
          <div className="bg-[#181818] border border-amber-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-400 uppercase font-black tracking-wider">Margin Squeeze Alerts</span>
              <TrendingDown className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <h3 className="font-mono font-extrabold text-amber-300 text-lg sm:text-xl">
                {squeezedDishes.length} Dishes
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {squeezedDishes.length > 0 ? 'Batch costs lower profit margin' : 'All dishes meet target margin'}
              </p>
            </div>
          </div>

          {/* Card 4: Expiring Lots */}
          <div className="bg-[#181818] border border-blue-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-blue-400 uppercase font-black tracking-wider">Expiring (Next 7 Days)</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2">
              <h3 className="font-mono font-extrabold text-blue-300 text-lg sm:text-xl">
                {lossReport.expiringSoonBatchesCount} Batches
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                FIFO prioritization recommended
              </p>
            </div>
          </div>

        </div>

        {/* Sub-Navigation Tabs */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#141413] border-b border-white/5 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 flex-nowrap">
            {[
              { id: 'batches', label: '📦 Active Batch Lots', badge: filteredBatches.length },
              { id: 'intake', label: '➕ Intake Delivery' },
              { id: 'simulator', label: '🍳 Recipe FIFO Simulator' },
              { id: 'variance', label: '🔍 Physical Count Audit' },
              { id: 'loss-ledger', label: '💸 Spoilage & Loss Ledger', badge: `₱${lossReport.totalCombinedLossCost.toFixed(0)}` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeSubTab === tab.id
                    ? 'bg-brand-gold text-black shadow-md'
                    : 'bg-[#181818] text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeSubTab === tab.id ? 'bg-black text-brand-gold' : 'bg-white/10 text-gray-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-xl bg-[#181818] border border-white/10 hover:border-brand-gold text-brand-gold text-xs font-bold uppercase transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Copied Summary!' : 'Copy Summary'}</span>
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: BATCH LOTS EXPLORER */}
          {activeSubTab === 'batches' && (
            <div className="space-y-4">
              
              {/* Filter Bar */}
              <div className="bg-[#181818] p-3.5 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
                
                {/* Search Box */}
                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search batch #, item, supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
                  />
                </div>

                {/* Ingredient Dropdown */}
                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                  <div className="w-full sm:w-64">
                    <SearchableSelect
                      options={ingredientFilterOptions}
                      value={selectedIngredientFilter}
                      onChange={setSelectedIngredientFilter}
                      placeholder="Filter by ingredient..."
                      searchPlaceholder="Search ingredient..."
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="expiring_soon">⏰ Expiring Soon (&lt; 7 days)</option>
                    <option value="expired">⚠️ Expired</option>
                    <option value="depleted">Depleted / Empty</option>
                  </select>

                  {/* Sort By */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="date-asc">Oldest First (FIFO Order)</option>
                    <option value="date-desc">Newest Intake First</option>
                    <option value="exp-asc">Expiry Date (Soonest)</option>
                    <option value="cost-desc">Highest Unit Cost</option>
                    <option value="qty-desc">Largest Remaining Stock</option>
                  </select>
                </div>
              </div>

              {/* Comprehensive Ingredient FIFO Details & Inspection Banner (When a specific ingredient is selected) */}
              {selectedIngredientFilter !== 'all' && (() => {
                const ing = ingredientsInventory.find(i => i.id === selectedIngredientFilter);
                if (!ing) return null;

                const allIngBatches = stockBatches.filter(
                  b => b.ingredientId === ing.id || b.ingredientName.toLowerCase().trim() === ing.name.toLowerCase().trim()
                );
                const activeIngBatches = allIngBatches
                  .filter(b => (b.status === 'active' || !b.status) && b.remainingQuantity > 0)
                  .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());
                const totalBatchRemaining = activeIngBatches.reduce((s, b) => s + b.remainingQuantity, 0);
                const totalValuation = activeIngBatches.reduce((s, b) => s + (b.remainingQuantity * b.costPerUnit), 0);
                const weightedAvgCost = totalBatchRemaining > 0 ? totalValuation / totalBatchRemaining : (ing.costPerUnit || 0);
                const firstOutLot = activeIngBatches[0];
                const nearestExpiryLot = activeIngBatches
                  .filter(b => b.expiryDate)
                  .sort((a, b) => (a.expiryDate! > b.expiryDate! ? 1 : -1))[0];
                
                const todayStr = new Date().toISOString().split('T')[0];
                const isNearestExpired = nearestExpiryLot?.expiryDate && nearestExpiryLot.expiryDate < todayStr;
                const isNearestExpiringSoon = nearestExpiryLot?.expiryDate && nearestExpiryLot.expiryDate >= todayStr && nearestExpiryLot.expiryDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                const recipesUsing = menuItems.filter(m => 
                  m.recipeRequirements?.some(r => r.name.toLowerCase() === ing.name.toLowerCase()) ||
                  m.ingredients?.some(i => i.toLowerCase() === ing.name.toLowerCase())
                );

                return (
                  <div className="bg-[#181818] border border-brand-gold/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Header with Title and Quick Filter Clear */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-brand-gold/15 text-brand-gold border border-brand-gold/30 font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                            🔬 Ingredient FIFO Inspector
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Unit: <strong className="text-white uppercase">{ing.unit}</strong>
                          </span>
                        </div>
                        <h3 className="font-display font-black text-xl text-white mt-1">
                          {ing.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setIntakeIngId(ing.id);
                            setIntakeCostPerUnit(ing.costPerUnit || 0.05);
                            if (ing.packCost) setIntakePackCost(ing.packCost);
                            if (ing.supplier?.name) setIntakeSupplier(ing.supplier.name);
                            setActiveSubTab('intake');
                          }}
                          className="px-3 py-1.5 bg-brand-gold text-black hover:bg-amber-400 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Intake New Delivery Lot</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedIngredientFilter('all')}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          ✕ Show All Ingredients
                        </button>
                      </div>
                    </div>

                    {/* 4 Essential Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div className="bg-[#121211] p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[8.5px] text-gray-400 uppercase font-black tracking-wider block">
                          📦 Stock Status
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono font-black text-white text-base">
                            {ing.quantity.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{ing.unit}</span>
                        </div>
                        <div className="text-[9px] text-gray-400">
                          {activeIngBatches.length} active lot{activeIngBatches.length === 1 ? '' : 's'} ({totalBatchRemaining} {ing.unit} tracked)
                        </div>
                      </div>

                      <div className="bg-[#121211] p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[8.5px] text-gray-400 uppercase font-black tracking-wider block">
                          🥇 Next FIFO Cost (Layer 1)
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono font-black text-brand-gold text-base">
                            ₱{(firstOutLot ? firstOutLot.costPerUnit : (ing.costPerUnit || 0)).toFixed(4)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">/{ing.unit}</span>
                        </div>
                        <div className="text-[9px] text-gray-400 truncate">
                          {firstOutLot ? `Lot ${firstOutLot.batchNumber}` : 'Base Pantry Price'}
                        </div>
                      </div>

                      <div className="bg-[#121211] p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[8.5px] text-gray-400 uppercase font-black tracking-wider block">
                          ⚖️ Weighted Lot Avg Cost
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono font-black text-emerald-400 text-base">
                            ₱{weightedAvgCost.toFixed(4)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">/{ing.unit}</span>
                        </div>
                        <div className="text-[9px] text-gray-400">
                          Total Value: <strong className="text-white">₱{totalValuation.toFixed(2)}</strong>
                        </div>
                      </div>

                      <div className="bg-[#121211] p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[8.5px] text-gray-400 uppercase font-black tracking-wider block">
                          ⏳ Earliest Expiration Date
                        </span>
                        <div className="font-mono font-black text-sm">
                          {nearestExpiryLot?.expiryDate ? (
                            <span className={isNearestExpired ? 'text-red-400' : isNearestExpiringSoon ? 'text-amber-400' : 'text-white'}>
                              {nearestExpiryLot.expiryDate}
                            </span>
                          ) : (
                            <span className="text-gray-500 font-normal">No Expiry Set</span>
                          )}
                        </div>
                        <div className="text-[9px]">
                          {isNearestExpired ? (
                            <span className="text-red-400 font-bold">⚠️ Already Expired</span>
                          ) : isNearestExpiringSoon ? (
                            <span className="text-amber-400 font-bold">⏰ Expiring in &lt;7 days</span>
                          ) : nearestExpiryLot?.expiryDate ? (
                            <span className="text-emerald-400 font-bold">✓ Safe Shelf Life</span>
                          ) : (
                            <span className="text-gray-500">Non-perishable</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visual FIFO Consumption Layer Pipeline */}
                    <div className="bg-[#10100F] p-3.5 rounded-xl border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <span>🔄 Active FIFO Consumption Order</span>
                        <span className="font-mono text-gray-500">Oldest Intake First (Deduction Sequence)</span>
                      </div>

                      {activeIngBatches.length === 0 ? (
                        <div className="text-xs text-gray-500 italic py-2">
                          No active lots registered for this ingredient yet. Click "+ Intake New Delivery Lot" to create one.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {activeIngBatches.map((b, idx) => {
                            const pct = b.initialQuantity > 0 ? (b.remainingQuantity / b.initialQuantity) * 100 : 0;
                            const isFirst = idx === 0;
                            return (
                              <div
                                key={b.id}
                                className={`p-2.5 rounded-xl border transition-all ${
                                  isFirst
                                    ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                                    : 'bg-[#181818] border-white/5'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[9px] ${
                                    isFirst ? 'bg-amber-400 text-black font-black' : 'bg-white/10 text-gray-300'
                                  }`}>
                                    {isFirst ? '🟢 1st in Queue (Active)' : `⚪ #${idx + 1} in Queue`}
                                  </span>
                                  <span className="font-mono text-gray-400 text-[9px]">
                                    {b.receivedDate}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between mt-1.5">
                                  <span className="font-mono font-bold text-white text-xs">{b.batchNumber}</span>
                                  <span className="font-mono text-brand-gold font-bold text-xs">
                                    ₱{b.costPerUnit.toFixed(4)}/{b.unit}
                                  </span>
                                </div>

                                <div className="mt-1.5 space-y-1">
                                  <div className="flex justify-between text-[9px] text-gray-400">
                                    <span>Remaining:</span>
                                    <span className="font-mono text-white font-bold">{b.remainingQuantity} / {b.initialQuantity} {b.unit}</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-[#0D0D0C] rounded-full overflow-hidden border border-white/5">
                                    <div className={`h-full rounded-full ${isFirst ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                                  </div>
                                </div>

                                {b.expiryDate && (
                                  <div className="mt-1.5 pt-1.5 border-t border-white/5 flex justify-between text-[8.5px] text-gray-400">
                                    <span>Expires:</span>
                                    <span className="font-mono font-bold text-gray-200">{b.expiryDate}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Used in Recipes & Portion Costing */}
                    {recipesUsing.length > 0 && (
                      <div className="bg-[#10100F] p-3 rounded-xl border border-white/5 space-y-2">
                        <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider block">
                          🍳 Used in {recipesUsing.length} Menu Recipe{recipesUsing.length === 1 ? '' : 's'}:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {recipesUsing.map(dish => {
                            const req = dish.recipeRequirements?.find(r => r.name.toLowerCase() === ing.name.toLowerCase());
                            const portionAmount = req ? req.amount : (dish.ingredients?.includes(ing.name) ? (ing.unit === 'pcs' ? 1 : 100) : 0);
                            const unitCostToUse = firstOutLot ? firstOutLot.costPerUnit : (ing.costPerUnit || 0);
                            const portionCost = portionAmount * unitCostToUse;

                            return (
                              <div key={dish.id} className="bg-[#181818] border border-white/5 rounded-xl px-2.5 py-1.5 text-[10px] flex items-center gap-2">
                                <span className="font-bold text-white">{dish.name}</span>
                                <span className="text-gray-400 font-mono">({portionAmount}{ing.unit}/plate)</span>
                                <span className="text-brand-gold font-mono font-bold">~₱{portionCost.toFixed(2)} cost</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Batches Table / Grid */}
              {filteredBatches.length === 0 ? (
                <div className="bg-[#181818] border border-white/5 rounded-2xl p-10 text-center space-y-3">
                  <Package className="w-10 h-10 text-gray-600 mx-auto" />
                  <h4 className="font-bold text-white text-sm">No batch lots match your filters</h4>
                  <p className="text-gray-400 text-xs">Try clearing your search query or intake a new stock delivery batch.</p>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('intake')}
                    className="px-4 py-2 bg-brand-gold text-black rounded-xl text-xs font-black uppercase"
                  >
                    + Intake Stock Batch
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredBatches.map((batch, index) => {
                    const pctRemaining = batch.initialQuantity > 0 
                      ? Math.min(100, Math.max(0, (batch.remainingQuantity / batch.initialQuantity) * 100))
                      : 0;

                    const todayStr = new Date().toISOString().split('T')[0];
                    const isExpired = batch.expiryDate && batch.expiryDate < todayStr && batch.remainingQuantity > 0;
                    const isExpiringSoon = batch.expiryDate && batch.expiryDate >= todayStr && batch.expiryDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    const lotValue = batch.remainingQuantity * batch.costPerUnit;

                    return (
                      <div
                        key={batch.id}
                        className={`bg-[#181818] border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all ${
                          isExpired 
                            ? 'border-red-500/50 bg-red-950/10' 
                            : isExpiringSoon 
                              ? 'border-amber-500/40 bg-amber-950/10' 
                              : batch.remainingQuantity <= 0 
                                ? 'border-white/5 opacity-60' 
                                : 'border-white/10 hover:border-brand-gold/40 shadow-lg'
                        }`}
                      >
                        {/* Header: Batch # & Expiry Pill */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20">
                                {batch.batchNumber}
                              </span>
                              <span className="text-[9px] text-gray-500 font-bold uppercase">
                                FIFO #{index + 1}
                              </span>
                            </div>
                            <h4 className="font-display font-extrabold text-white text-sm mt-1">
                              {batch.ingredientName}
                            </h4>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {isExpired ? (
                              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                ⚠️ EXPIRED
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                ⏳ EXPIRING SOON
                              </span>
                            ) : batch.remainingQuantity <= 0 ? (
                              <span className="bg-gray-800 text-gray-400 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                DEPLETED
                              </span>
                            ) : (
                              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                ACTIVE LOT
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar of Remaining Quantity */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-gray-400">Remaining:</span>
                            <span className="font-mono font-extrabold text-white">
                              {batch.remainingQuantity.toLocaleString()} / {batch.initialQuantity.toLocaleString()} {batch.unit} ({pctRemaining.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-[#0D0D0C] rounded-full overflow-hidden border border-white/5">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isExpired ? 'bg-red-500' : isExpiringSoon ? 'bg-amber-400' : 'bg-brand-gold'
                              }`}
                              style={{ width: `${pctRemaining}%` }}
                            />
                          </div>
                        </div>

                        {/* Financials & Dates */}
                        <div className="grid grid-cols-2 gap-2 bg-[#121211] p-2.5 rounded-xl border border-white/5 text-[10px]">
                          <div>
                            <span className="text-gray-500 block">Unit Cost:</span>
                            <span className="font-mono font-bold text-white">₱{batch.costPerUnit.toFixed(4)}/{batch.unit}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Lot Valuation:</span>
                            <span className="font-mono font-bold text-emerald-400">₱{lotValue.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Received:</span>
                            <span className="font-mono text-gray-300">{batch.receivedDate}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Expiry Date:</span>
                            <span className={`font-mono font-bold ${isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-gray-300'}`}>
                              {batch.expiryDate || 'No Expiry'}
                            </span>
                          </div>
                        </div>

                        {/* Footer details & discard action */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                          <span className="text-gray-500 truncate max-w-[150px]">
                            🏢 {batch.supplierName || 'Standard Supplier'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {batch.remainingQuantity > 0 && onLogSpoilage && (
                              <button
                                type="button"
                                onClick={() => {
                                  const reason = isExpired ? 'expired' : 'damaged';
                                  const lossCost = batch.remainingQuantity * batch.costPerUnit;
                                  if (confirm(`Log remaining ${batch.remainingQuantity} ${batch.unit} as spoilage loss (₱${lossCost.toFixed(2)})?`)) {
                                    onLogSpoilage(batch.ingredientId, batch.remainingQuantity, reason, lossCost);
                                    onUpdateBatch(batch.id, { remainingQuantity: 0, status: isExpired ? 'expired' : 'discarded' });
                                  }
                                }}
                                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-bold text-[9px] uppercase cursor-pointer"
                                title="Discard remaining stock and log financial loss"
                              >
                                Discard / Loss
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete batch ${batch.batchNumber}?`)) {
                                  onDeleteBatch(batch.id);
                                }
                              }}
                              className="p-1 text-gray-500 hover:text-red-400 transition-all cursor-pointer"
                              title="Delete batch record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTAKE NEW BATCH DELIVERY */}
          {activeSubTab === 'intake' && (
            <div className="max-w-2xl mx-auto bg-[#181818] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-brand-gold/10 text-brand-gold font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border border-brand-gold/20">
                    📥 Stock Receiving & Intake
                  </span>
                </div>
                <h3 className="font-display font-black text-white text-lg mt-1">
                  Register New Supplier Delivery / Batch Lot
                </h3>
                <p className="text-gray-400 text-xs">
                  New batches are automatically added to the FIFO deduction queue. If supplier prices increased, the system will adjust recipe COGS accurately.
                </p>
              </div>

              <form onSubmit={handleCreateBatch} className="space-y-4">
                
                {/* 1. Ingredient Selection */}
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                    Select Ingredient <span className="text-brand-red">*</span>
                  </label>
                  <SearchableSelect
                    options={intakeIngredientOptions}
                    value={intakeIngId}
                    onChange={(val) => handleIntakeIngredientChange(val)}
                    placeholder="Search and select ingredient..."
                    searchPlaceholder="Type ingredient name (e.g. Beef Tapa, Rice, Eggs)..."
                  />
                </div>

                {/* 2. Batch Number & Invoice */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                      Batch / Lot # <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={intakeBatchNumber}
                      onChange={(e) => setIntakeBatchNumber(e.target.value)}
                      placeholder="e.g. LOT-20261004-01"
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-gold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                      Supplier Invoice / Receipt #
                    </label>
                    <input
                      type="text"
                      value={intakeInvoice}
                      onChange={(e) => setIntakeInvoice(e.target.value)}
                      placeholder="e.g. INV-98421"
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                {/* 3. Received Date & Expiry Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                      Received / Intake Date <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="date"
                      value={intakeReceivedDate}
                      onChange={(e) => setIntakeReceivedDate(e.target.value)}
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-gold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                      Expiry Date (For Expiry Tracking)
                    </label>
                    <input
                      type="date"
                      value={intakeExpiryDate}
                      onChange={(e) => setIntakeExpiryDate(e.target.value)}
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                {/* 4. Quantity & Unit Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                      Quantity Received ({ingredientsInventory.find(i => i.id === intakeIngId)?.unit || 'units'}) <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={intakeQuantity}
                      onChange={(e) => setIntakeQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 5000"
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-brand-gold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                      Unit Purchase Price (₱ per {ingredientsInventory.find(i => i.id === intakeIngId)?.unit || 'unit'}) <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={intakeCostPerUnit}
                      onChange={(e) => setIntakeCostPerUnit(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 0.28"
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-brand-gold font-mono font-bold focus:outline-none focus:border-brand-gold"
                      required
                    />
                  </div>
                </div>

                {/* 5. Supplier Name */}
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                    Supplier / Vendor Name
                  </label>
                  <input
                    type="text"
                    value={intakeSupplier}
                    onChange={(e) => setIntakeSupplier(e.target.value)}
                    placeholder="e.g. Monterey Meat Market / Dinalupihan Wholesale"
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                  />
                </div>

                {/* 6. Total Calculated Lot Cost Preview */}
                {typeof intakeQuantity === 'number' && typeof intakeCostPerUnit === 'number' && (
                  <div className="bg-[#121211] p-3 rounded-xl border border-brand-gold/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold">Total Batch Cost:</span>
                      <h4 className="font-mono font-extrabold text-emerald-400 text-base">
                        ₱{(intakeQuantity * intakeCostPerUnit).toFixed(2)}
                      </h4>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {intakeQuantity} {ingredientsInventory.find(i => i.id === intakeIngId)?.unit} @ ₱{intakeCostPerUnit.toFixed(4)}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('batches')}
                    className="px-5 py-2.5 bg-[#0D0D0C] border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-black rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Save & Queue in FIFO Stock
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* TAB 3: LIVE RECIPE FIFO COST SIMULATOR */}
          {activeSubTab === 'simulator' && (
            <div className="space-y-6">
              
              {/* Dish Selector Header */}
              <div className="bg-[#181818] p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">
                    Select Menu Item to Simulate FIFO Costing
                  </label>
                  <select
                    value={selectedDishId}
                    onChange={(e) => setSelectedDishId(e.target.value)}
                    className="bg-[#0D0D0C] border border-white/10 rounded-xl px-4 py-2 text-sm text-brand-gold font-extrabold focus:outline-none focus:border-brand-gold cursor-pointer"
                  >
                    {menuItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} — ₱{item.price.toFixed(2)} ({item.category.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDishSimulation && (
                  <div className="flex items-center gap-3">
                    <div className="bg-[#121211] p-3 rounded-xl border border-white/5 text-right">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Selling Price</span>
                      <span className="font-mono font-extrabold text-white text-base">
                        ₱{menuItems.find(m => m.id === selectedDishId)?.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-[#121211] p-3 rounded-xl border border-white/5 text-right">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Actual FIFO Cost</span>
                      <span className="font-mono font-extrabold text-brand-red text-base">
                        ₱{selectedDishSimulation.totalCost.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-[#121211] p-3 rounded-xl border border-white/5 text-right">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Profit Margin</span>
                      <span className={`font-mono font-extrabold text-base ${selectedDishSimulation.isMarginSqueezed ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {selectedDishSimulation.marginPercent}% (₱{selectedDishSimulation.profit.toFixed(2)})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Margin Squeeze Warning */}
              {selectedDishSimulation?.isMarginSqueezed && (
                <div className="bg-amber-950/20 border border-amber-500/40 p-4 rounded-2xl flex items-center gap-3 text-amber-300 text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
                  <div>
                    <strong>Margin Squeeze Alert:</strong> The current active FIFO stock batches have increased this dish's raw cost by <strong>{selectedDishSimulation.costVariancePercent}%</strong> compared to base rates. 
                    Target profit margin is <strong>{menuItems.find(m => m.id === selectedDishId)?.targetMarginPercent || 50}%</strong>, but current margin is <strong>{selectedDishSimulation.marginPercent}%</strong>.
                  </div>
                </div>
              )}

              {/* Itemized Recipe FIFO Consumption Breakdown */}
              {selectedDishSimulation && (
                <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="font-display font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-gold" /> Recipe Ingredients & FIFO Batch Draw Matrix
                  </h4>

                  <div className="space-y-3">
                    {selectedDishSimulation.layers.map((layer, idx) => (
                      <div key={idx} className="bg-[#121211] p-3.5 rounded-xl border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white text-xs">{layer.ingredientName}</span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              ({layer.amountRequired} {layer.unit} required)
                            </span>
                          </div>
                          <span className="font-mono font-bold text-brand-gold text-xs">
                            Line Total: ₱{layer.totalIngredientCost.toFixed(2)}
                          </span>
                        </div>

                        {/* Batch Layers Used */}
                        <div className="pl-3 border-l-2 border-brand-gold/30 space-y-1">
                          {layer.batchesUsed.map((bLayer, bIdx) => (
                            <div key={bIdx} className="flex items-center justify-between text-[10px] text-gray-300">
                              <span className="flex items-center gap-1.5 font-mono">
                                <span className="text-brand-gold">↳ Batch: {bLayer.batchNumber}</span>
                                <span className="text-gray-500">(Recv: {bLayer.receivedDate})</span>
                              </span>
                              <span className="font-mono">
                                {bLayer.quantityUsed} {layer.unit} @ ₱{bLayer.costPerUnit.toFixed(4)}/{layer.unit} = <strong>₱{bLayer.layerCost.toFixed(2)}</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: PHYSICAL STOCKTAKE & VARIANCE AUDIT */}
          {activeSubTab === 'variance' && (
            <div className="space-y-4">
              <div className="bg-[#181818] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-white text-sm">Physical Stocktake vs Theoretical FIFO Stock</h4>
                  <p className="text-gray-400 text-xs">Enter actual counts from physical pantry audit to compute shrinkage, waste, and financial variance.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Shrinkage Loss</span>
                  <span className="font-mono font-black text-brand-red text-base">
                    ₱{lossReport.totalVarianceLossCost.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-[#181818] rounded-2xl border border-white/5 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0D0D0C] text-[10px] text-gray-400 uppercase font-bold border-b border-white/5">
                    <tr>
                      <th className="p-3">Ingredient</th>
                      <th className="p-3">System (FIFO) Stock</th>
                      <th className="p-3">Physical Count Input</th>
                      <th className="p-3">Variance</th>
                      <th className="p-3 text-right">Variance Loss (PHP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {ingredientsInventory.map((ing) => {
                      const physical = physicalCounts[ing.id];
                      const hasCount = physical !== undefined && physical !== null;
                      const variance = hasCount ? physical - ing.quantity : 0;
                      const varianceCost = variance < 0 ? Math.abs(variance) * (ing.costPerUnit || 0.05) : 0;

                      return (
                        <tr key={ing.id} className="hover:bg-white/5">
                          <td className="p-3 font-bold text-white">{ing.name}</td>
                          <td className="p-3 font-mono text-gray-300">{ing.quantity} {ing.unit}</td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="any"
                              placeholder={`${ing.quantity}`}
                              value={physical !== undefined ? physical : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : Number(e.target.value);
                                setPhysicalCounts(prev => {
                                  const updated = { ...prev };
                                  if (val === undefined) delete updated[ing.id];
                                  else updated[ing.id] = val;
                                  return updated;
                                });
                              }}
                              className="bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-white w-28 focus:outline-none focus:border-brand-gold"
                            />
                          </td>
                          <td className="p-3 font-mono font-bold">
                            {hasCount ? (
                              variance < 0 ? (
                                <span className="text-red-400">{variance.toFixed(1)} {ing.unit} (Missing)</span>
                              ) : variance > 0 ? (
                                <span className="text-emerald-400">+{variance.toFixed(1)} {ing.unit} (Surplus)</span>
                              ) : (
                                <span className="text-gray-400">Exact Match</span>
                              )
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-right">
                            {varianceCost > 0 ? (
                              <span className="text-brand-red">-₱{varianceCost.toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-500">₱0.00</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: SPOILAGE & LOSS LEDGER */}
          {activeSubTab === 'loss-ledger' && (
            <div className="space-y-4">
              <div className="bg-[#181818] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-white text-sm">Combined Loss & Spoilage Ledger</h4>
                  <p className="text-gray-400 text-xs">All expired batch loss, discarded ingredients, and recorded kitchen shrinkage.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Grand Total Loss</span>
                  <span className="font-mono font-black text-brand-red text-lg">
                    ₱{lossReport.totalCombinedLossCost.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Expired Batches Section */}
              <div className="bg-[#181818] p-4 rounded-2xl border border-white/5 space-y-3">
                <h5 className="font-bold text-xs uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Expired Stock Batches (₱{lossReport.totalExpiredLossCost.toFixed(2)})
                </h5>
                {stockBatches.filter(b => b.status === 'expired' || (b.expiryDate && b.expiryDate < new Date().toISOString().split('T')[0] && b.remainingQuantity > 0)).length === 0 ? (
                  <p className="text-gray-500 text-xs italic">No expired batches currently in storage.</p>
                ) : (
                  <div className="space-y-2">
                    {stockBatches
                      .filter(b => b.status === 'expired' || (b.expiryDate && b.expiryDate < new Date().toISOString().split('T')[0] && b.remainingQuantity > 0))
                      .map(b => (
                        <div key={b.id} className="bg-[#121211] p-3 rounded-xl border border-red-500/20 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white">{b.ingredientName}</span>
                            <span className="text-[10px] text-gray-500 font-mono block">
                              Batch: {b.batchNumber} • Expired: {b.expiryDate}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-gray-400 text-[10px] block">{b.remainingQuantity} {b.unit} unused</span>
                            <span className="text-brand-red font-bold">₱{(b.remainingQuantity * b.costPerUnit).toFixed(2)} Loss</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Spoilage Records Section */}
              <div className="bg-[#181818] p-4 rounded-2xl border border-white/5 space-y-3">
                <h5 className="font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Kitchen Spoilage & Waste Logs (₱{lossReport.totalSpoilageLossCost.toFixed(2)})
                </h5>
                {spoilageRecords.length === 0 ? (
                  <p className="text-gray-500 text-xs italic">No manual spoilage records logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {spoilageRecords.map(rec => (
                      <div key={rec.id} className="bg-[#121211] p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white">{rec.ingredientName}</span>
                          <span className="text-[10px] text-gray-500 font-mono block">
                            Reason: {rec.reason.toUpperCase()} • Logged by: {rec.loggedBy} • {new Date(rec.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-gray-400 text-[10px] block">{rec.amount} {rec.unit}</span>
                          <span className="text-brand-red font-bold">₱{rec.cost.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t-2 border-white/5 bg-[#0D0D0C] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>FIFO Multi-Batch Engine Active. Costs and Deductions dynamically computed.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-black font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all cursor-pointer"
          >
            Done & Return
          </button>
        </div>

      </div>
    </div>
  );
};

export default FifoStockModal;
