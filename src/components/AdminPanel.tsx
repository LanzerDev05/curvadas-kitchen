import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Order, OrderStatus, MenuItem, Category, MenuOption, IngredientStock, SelectedOption } from '../types';
import { 
  ChefHat, 
  TrendingUp, 
  CheckCircle, 
  Ban, 
  ArrowRight, 
  Eye, 
  ToggleLeft, 
  ToggleRight, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  Edit, 
  Search, 
  Sparkles, 
  AlertTriangle, 
  FilePlus,
  RefreshCw,
  Calendar,
  Zap,
  TrendingDown,
  ShoppingCart,
  Copy,
  Check,
  DollarSign,
  Target,
  Percent,
  Coins,
  Lock,
  Menu,
  LogOut,
  ChevronLeft,
  QrCode,
  Ticket,
  Clock,
  FileSpreadsheet,
  PackageCheck,
  Upload,
  Image as ImageIcon,
  Camera,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Move,
  Crop,
  Flame,
  Award,
  Undo,
  Scale,
  Calculator,
  BookOpen,
  Download,
  Save,
  Printer,
  Bluetooth,
  PhoneCall,
  MessageSquare,
  Navigation,
  ShieldAlert
} from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import BluetoothPrinterModal from './BluetoothPrinterModal';
import CustomizeModal from './CustomizeModal';
import { bluetoothPrinter, PrinterStatus } from '../services/bluetoothPrinter';


interface AdminPanelProps {
  orders: Order[];
  menuItems: MenuItem[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, cookingStartTime?: string, estimatedPrepTime?: number) => void;
  unavailableItemIds: string[];
  onToggleItemAvailability: (itemId: string) => void;
  // Dynamic features
  stockLevels: Record<string, number>;
  onUpdateStockLevel: (itemId: string, newQty: number, isSync?: boolean) => void;
  onAddMenuItem: (item: MenuItem) => void;
  // Support both updating an item and deleting it
  onEditMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (itemId: string) => void;
  hiddenCategories: string[];
  onToggleCategoryHidden: (category: string) => void;
  ingredientsInventory: IngredientStock[];
  onAddIngredient: (name: string, quantity: number, unit: string, lowStockAlert: number, costPerUnit?: number, packCount?: number, packSize?: number, packCost?: number) => void;
  onUpdateIngredientStock: (id: string, newQty: number) => void;
  onUpdateMultipleIngredientsStock?: (updates: Record<string, number>) => void;
  onEditIngredient: (id: string, name: string, quantity: number, unit: string, lowStockAlert: number, costPerUnit?: number, packCount?: number, packSize?: number, packCost?: number) => void;
  onDeleteIngredient: (id: string) => void;
  onResetToDemo?: () => void;
  onClearAllData?: () => void;
  onReturnToStore?: () => void;
  onToggleItemCooked?: (orderId: string, itemId: string) => void;
  onSetCookedBy?: (orderId: string, staffName: string) => void;
  onGenerateRandomOrder?: () => void;
  onStartItemCooking?: (orderId: string, itemId: string) => void;
  onManualPlaceOrder?: (order: Order) => void;
  onUpdateConfirmationCallStatus?: (orderId: string, callStatus: 'pending' | 'confirmed' | 'unreachable' | 'rejected', isBogusRisk?: boolean) => void;
}

const IMAGE_PRESETS = [
  { name: 'Tapsilog / Egg Beef', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600' },
  { name: 'Tocilog / Red Glaze', url: 'https://images.unsplash.com/photo-1608454367599-c1139e3196dc?auto=format&fit=crop&q=80&w=600' },
  { name: 'Chicken Katsu / Bento', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=600' },
  { name: 'Crispy Pork Tonkatsu', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=600' },
  { name: 'Dynamic Rice Bowl', url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&q=80&w=600' },
  { name: 'Chilled Ice Tea / Drinks', url: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&q=80&w=600' },
];

interface DetailedServings {
  servings: number | null;
  bottleneck: { name: string; quantity: number; unit: string; possibleServings: number } | null;
  hasRecipe: boolean;
  missingIngredients?: string[];
}

const findMatchingIngredientInInventory = (reqName: string, inventory: IngredientStock[]): IngredientStock | undefined => {
  if (!reqName || !inventory) return undefined;
  const cleanReq = reqName.toLowerCase().trim();
  
  let match = inventory.find(i => i.name.toLowerCase().trim() === cleanReq);
  if (match) return match;

  const alphaReq = cleanReq.replace(/[^a-z]/g, '');
  if (alphaReq.length > 0) {
    match = inventory.find(i => i.name.toLowerCase().replace(/[^a-z]/g, '') === alphaReq);
    if (match) return match;
  }

  match = inventory.find(i => {
    const cleanInv = i.name.toLowerCase().trim();
    return cleanReq.startsWith(cleanInv) || cleanInv.startsWith(cleanReq);
  });
  
  return match;
};

const getDetailedServingsForDish = (item: MenuItem, ingredientsInventory: IngredientStock[]): DetailedServings => {
  if (item.recipeRequirements && item.recipeRequirements.length > 0) {
    let minServings = Infinity;
    let hasMatchingIngredient = false;
    let bottleneck: { name: string; quantity: number; unit: string; possibleServings: number } | null = null;
    let missingIngredients: string[] = [];
    
    item.recipeRequirements.forEach((req) => {
      const ing = findMatchingIngredientInInventory(req.name, ingredientsInventory);
      if (ing) {
        hasMatchingIngredient = true;
        const reqQty = ing.unit === 'kg' ? req.amount / 1000 : req.amount;
        const possibleServings = reqQty > 0 ? Math.floor(ing.quantity / reqQty) : 0;
        if (possibleServings < minServings) {
          minServings = possibleServings;
          bottleneck = { name: ing.name, quantity: ing.quantity, unit: ing.unit, possibleServings };
        }
      } else {
        minServings = 0;
        missingIngredients.push(req.name);
        bottleneck = { name: `${req.name} (Missing)`, quantity: 0, unit: 'units', possibleServings: 0 };
      }
    });
    
    return {
      servings: hasMatchingIngredient ? minServings : 0,
      bottleneck: (hasMatchingIngredient && minServings !== Infinity) ? bottleneck : bottleneck,
      hasRecipe: true,
      missingIngredients
    };
  }

  if (item.ingredients && item.ingredients.length > 0) {
    let minServings = Infinity;
    let hasMatchingIngredient = false;
    let bottleneck: { name: string; quantity: number; unit: string; possibleServings: number } | null = null;
    let missingIngredients: string[] = [];
    
    item.ingredients.forEach((ingName) => {
      const ing = findMatchingIngredientInInventory(ingName, ingredientsInventory);
      if (ing) {
        hasMatchingIngredient = true;
        const reqPerServing = (ing.unit === 'pcs' || ing.unit === 'cans') ? 1 : ing.unit === 'kg' ? 0.1 : 100;
        const possibleServings = Math.floor(ing.quantity / reqPerServing);
        if (possibleServings < minServings) {
          minServings = possibleServings;
          bottleneck = { name: ing.name, quantity: ing.quantity, unit: ing.unit, possibleServings };
        }
      } else {
        minServings = 0;
        missingIngredients.push(ingName);
        bottleneck = { name: `${ingName} (Missing)`, quantity: 0, unit: 'units', possibleServings: 0 };
      }
    });
    
    return {
      servings: hasMatchingIngredient ? minServings : 0,
      bottleneck: (hasMatchingIngredient && minServings !== Infinity) ? bottleneck : bottleneck,
      hasRecipe: true,
      missingIngredients
    };
  }

  return { servings: null, bottleneck: null, hasRecipe: false, missingIngredients: [] };
};

const getServingsForDish = (item: MenuItem, ingredientsInventory: IngredientStock[]) => {
  return getDetailedServingsForDish(item, ingredientsInventory).servings;
};

const calculateDishRecipeCost = (item: MenuItem, ingredientsInventory: IngredientStock[]) => {
  let totalCost = 0;
  const breakDown: { name: string; amount: number; unit: string; cost: number }[] = [];

  const getUnitPriceLocal = (unit: string, ingId?: string) => {
    if (ingId) {
      const ing = ingredientsInventory.find(i => i.id === ingId);
      if (ing && ing.costPerUnit !== undefined && ing.costPerUnit !== null) {
        return ing.costPerUnit;
      }
    }
    switch (unit.toLowerCase()) {
      case 'g': return 0.05;
      case 'kg': return 150.00;
      case 'pcs': return 15.00;
      case 'ml': return 0.08;
      case 'cans': return 45.00;
      default: return 5.00;
    }
  };

  if (item.recipeRequirements && item.recipeRequirements.length > 0) {
    item.recipeRequirements.forEach((req) => {
      const ing = ingredientsInventory.find(
        (i) => i.name.toLowerCase() === req.name.toLowerCase()
      );
      const unit = ing ? ing.unit : 'g';
      const unitPrice = getUnitPriceLocal(unit, ing?.id);
      const amountFactor = unit === 'kg' ? req.amount / 1000 : req.amount;
      const cost = amountFactor * unitPrice;
      totalCost += cost;
      breakDown.push({ name: req.name, amount: req.amount, unit, cost });
    });
  } else if (item.ingredients && item.ingredients.length > 0) {
    item.ingredients.forEach((ingName) => {
      const ing = ingredientsInventory.find(
        (i) => i.name.toLowerCase() === ingName.toLowerCase()
      );
      const unit = ing ? ing.unit : 'g';
      const reqAmount = (unit === 'pcs' || unit === 'cans') ? 1 : unit === 'kg' ? 0.1 : 100;
      const unitPrice = getUnitPriceLocal(unit, ing?.id);
      const cost = reqAmount * unitPrice;
      totalCost += cost;
      breakDown.push({ name: ingName, amount: reqAmount, unit, cost });
    });
  } else {
    // Fallback COGS estimate at 35%
    totalCost = item.price * 0.35;
  }

  const profit = item.price - totalCost;
  const marginPercent = item.price > 0 ? (profit / item.price) * 100 : 0;

  const targetMarginPercent = item.targetMarginPercent !== undefined ? item.targetMarginPercent : 50;
  const recommendedPrice = (targetMarginPercent > 0 && targetMarginPercent < 100)
    ? totalCost / (1 - targetMarginPercent / 100)
    : totalCost * 2;
  const targetProfit = recommendedPrice - totalCost;

  return {
    totalCost,
    profit,
    marginPercent,
    targetMarginPercent,
    recommendedPrice,
    targetProfit,
    breakDown
  };
};

// ─── Smart Profit & Overhead Horizon Simulator Modal ─────────────────────────
interface SmartProfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  ingredientsInventory: IngredientStock[];
  initialMenuItemId?: string;
}

const SmartProfitModal: React.FC<SmartProfitModalProps> = ({
  isOpen,
  onClose,
  menuItems,
  ingredientsInventory,
  initialMenuItemId,
}) => {
  const [selectedItemId, setSelectedItemId] = React.useState<string>(initialMenuItemId || (menuItems[0]?.id || ''));
  const [periodType, setPeriodType] = React.useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('daily');
  const [customDays, setCustomDays] = React.useState<number>(15);
  const [dailyUnits, setDailyUnits] = React.useState<number>(10);
  const [localPrice, setLocalPrice] = React.useState<number>(120);
  const [localCogs, setLocalCogs] = React.useState<number>(45);
  const [customDishName, setCustomDishName] = React.useState<string>('');
  const [isCopied, setIsCopied] = React.useState(false);

  // Overheads list with categories and icons
  const [overheads, setOverheads] = React.useState([
    { id: 'elec', label: 'Electricity', amount: 150, enabled: true, icon: '⚡' },
    { id: 'water', label: 'Water & Utilities', amount: 50, enabled: true, icon: '💧' },
    { id: 'gas', label: 'Gas / LPG Fuel', amount: 80, enabled: true, icon: '🔥' },
    { id: 'labor', label: 'Labor / Crew Wages', amount: 500, enabled: false, icon: '👨‍🍳' },
    { id: 'rent', label: 'Store Rent / Space', amount: 200, enabled: false, icon: '🏠' },
    { id: 'pkg', label: 'Packaging & Supplies', amount: 50, enabled: false, icon: '📦' },
  ]);
  const [newExpenseLabel, setNewExpenseLabel] = React.useState('');
  const [newExpenseAmt, setNewExpenseAmt] = React.useState<number | ''>('');

  // Update selectedItemId if initialMenuItemId changes when opening modal
  React.useEffect(() => {
    if (initialMenuItemId) {
      setSelectedItemId(initialMenuItemId);
    } else if (!selectedItemId && menuItems.length > 0) {
      setSelectedItemId(menuItems[0].id);
    }
  }, [initialMenuItemId, isOpen, menuItems]);

  // When selected dish changes, recalculate COGS & price
  React.useEffect(() => {
    if (selectedItemId === '__custom__') {
      if (!customDishName) setCustomDishName('Custom Specialty Plate');
      return;
    }
    const item = menuItems.find(m => m.id === selectedItemId);
    if (item) {
      setLocalPrice(item.price);
      setCustomDishName(item.name);

      // Calculate accurate COGS
      const fin = calculateDishRecipeCost(item, ingredientsInventory);
      let calculatedCogs = fin.totalCost;

      // Add garnishes if any
      if (item.garnishes && item.garnishes.length > 0) {
        const garnishCost = item.garnishes.filter(g => g.selected).reduce((acc, g) => {
          const invItem = ingredientsInventory.find(i => (i?.name || '').toLowerCase() === (g.name || '').toLowerCase());
          const gUnit = (g.unit || 'pcs').toLowerCase();
          const isVol = gUnit === 'g' || gUnit === 'ml';
          const rawRate = invItem ? (Number(invItem.costPerUnit) || 0) : (g.costPerUnit || 0);
          const effectiveRate = (() => {
            if (isVol && rawRate > 0) {
              const iu = (invItem?.unit || '').toLowerCase();
              if (iu === 'g' || iu === 'ml') return rawRate;
              if (iu === 'kg' || iu === 'l') return rawRate / 1000;
            }
            return g.costPerUnit || rawRate || 0;
          })();
          return acc + effectiveRate * (Number(g.amount) || 1);
        }, 0);
        calculatedCogs += garnishCost;
      }
      setLocalCogs(Number(calculatedCogs.toFixed(2)) || Number((item.price * 0.35).toFixed(2)));
    }
  }, [selectedItemId, menuItems, ingredientsInventory]);

  if (!isOpen) return null;

  const selectedItem = menuItems.find(m => m.id === selectedItemId);

  // Period multiplier in days
  const periodDays = (() => {
    switch (periodType) {
      case 'daily': return 1;
      case 'weekly': return 7;
      case 'monthly': return 30;
      case 'yearly': return 365;
      case 'custom': return Math.max(1, customDays);
      default: return 1;
    }
  })();

  const periodLabel = (() => {
    switch (periodType) {
      case 'daily': return 'Daily (1 Day)';
      case 'weekly': return 'Weekly (7 Days)';
      case 'monthly': return 'Monthly (30 Days)';
      case 'yearly': return 'Yearly (365 Days)';
      case 'custom': return `Custom (${periodDays} Days)`;
      default: return 'Daily';
    }
  })();

  // Core Math
  const price = Math.max(0, localPrice);
  const cogsPerServing = Math.max(0, localCogs);
  const totalDailyOverhead = overheads.filter(o => o.enabled).reduce((s, o) => s + o.amount, 0);
  const totalPeriodOverhead = totalDailyOverhead * periodDays;

  const totalPeriodUnits = dailyUnits * periodDays;
  const periodRevenue = price * totalPeriodUnits;
  const periodCogsTotal = cogsPerServing * totalPeriodUnits;
  const periodGrossProfit = periodRevenue - periodCogsTotal;
  const periodNetProfit = periodGrossProfit - totalPeriodOverhead;

  const unitGrossSpread = price - cogsPerServing;
  const grossMargin = periodRevenue > 0 ? (periodGrossProfit / periodRevenue) * 100 : 0;
  const netMargin = periodRevenue > 0 ? (periodNetProfit / periodRevenue) * 100 : 0;
  const cogsRatio = periodRevenue > 0 ? (periodCogsTotal / periodRevenue) * 100 : 0;
  const overheadRatio = periodRevenue > 0 ? (totalPeriodOverhead / periodRevenue) * 100 : 0;

  // Break-even
  const dailyBreakEvenUnits = unitGrossSpread > 0 ? Math.ceil(totalDailyOverhead / unitGrossSpread) : 0;
  const periodBreakEvenUnits = dailyBreakEvenUnits * periodDays;

  // Quick Multi-Horizon Projections for the summary matrix
  const getHorizonMetrics = (days: number) => {
    const units = dailyUnits * days;
    const rev = price * units;
    const cogs = cogsPerServing * units;
    const gross = rev - cogs;
    const overhead = totalDailyOverhead * days;
    const net = gross - overhead;
    const margin = rev > 0 ? (net / rev) * 100 : 0;
    return { days, units, rev, cogs, gross, overhead, net, margin };
  };

  const horizonDaily = getHorizonMetrics(1);
  const horizonWeekly = getHorizonMetrics(7);
  const horizonMonthly = getHorizonMetrics(30);
  const horizonYearly = getHorizonMetrics(365);

  const activeDishTitle = selectedItemId === '__custom__' ? (customDishName || 'Custom Dish') : (selectedItem?.name || 'Selected Dish');

  // Copy text report handler
  const handleCopyReport = () => {
    const report = `===========================================
PROFIT SIMULATION REPORT: ${activeDishTitle.toUpperCase()}
Horizon: ${periodLabel} (${periodDays} days)
===========================================
Selling Price: ₱${price.toFixed(2)} / serving
Plate COGS: ₱${cogsPerServing.toFixed(2)} / serving
Unit Spread: ₱${unitGrossSpread.toFixed(2)} / plate

Daily Volume: ${dailyUnits} plates/day (Total: ${totalPeriodUnits} plates)
Break-Even Point: ${dailyBreakEvenUnits} plates/day (${periodBreakEvenUnits} total)

--- FINANCIAL BREAKDOWN ---
Total Revenue:      ₱${periodRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Total Recipe COGS:  ₱${periodCogsTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${cogsRatio.toFixed(1)}%)
Gross Profit:       ₱${periodGrossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Gross Margin: ${grossMargin.toFixed(1)}%)
Overhead Expenses:  ₱${totalPeriodOverhead.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${overheadRatio.toFixed(1)}%)
NET PROFIT:         ₱${periodNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Net Margin: ${netMargin.toFixed(1)}%)

--- HORIZON FORECASTS ---
Daily Net:   ₱${horizonDaily.net.toFixed(2)} / day
Weekly Net:  ₱${horizonWeekly.net.toFixed(2)} / week
Monthly Net: ₱${horizonMonthly.net.toFixed(2)} / month (30d)
Yearly Net:  ₱${horizonYearly.net.toFixed(2)} / year
===========================================`;

    navigator.clipboard.writeText(report);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md overflow-y-auto animate-fade-in text-left">
      <div className="bg-[#141413] border-2 border-emerald-500/30 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl w-full max-w-4xl lg:max-w-5xl flex flex-col max-h-[92vh] animate-slide-in-up">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-white/5 bg-[#0D0D0C] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-black text-white text-base sm:text-lg uppercase tracking-tight">
                  Smart Profit & Overhead Horizon Simulator
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {periodLabel}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">
                Forecast revenue, ingredient COGS, and kitchen overheads across Daily, Weekly, Monthly, Yearly, or Custom days.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`hidden sm:inline-flex font-mono text-xs font-black px-3 py-1.5 rounded-xl border ${
              periodNetProfit >= 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30'
            }`}>
              Net: ₱{periodNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          
          {/* Section 1: Menu Item Picker & Timeframe Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Menu Item Selector (5 cols) */}
            <div className="lg:col-span-5 bg-[#0D0D0C] p-4 rounded-2xl border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-brand-gold uppercase font-black tracking-wider flex items-center gap-1.5">
                  <span>🍱 Select Menu Item / Dish</span>
                </label>
                {selectedItem && (
                  <span className="text-[9px] text-gray-400 capitalize font-mono">
                    {selectedItem.category}
                  </span>
                )}
              </div>

              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-brand-gold cursor-pointer"
              >
                <option value="">-- Choose a Dish to Simulate --</option>
                <option value="__custom__">✨ Custom / Manual Simulation</option>
                {['bento', 'silog', 'rice-bowl', 'drinks'].map(cat => {
                  const itemsInCat = menuItems.filter(m => m.category === cat);
                  if (itemsInCat.length === 0) return null;
                  return (
                    <optgroup key={cat} label={`🍽️ ${cat.toUpperCase()}`}>
                      {itemsInCat.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} (₱{item.price.toFixed(2)})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>

              {/* Selected dish quick metadata */}
              {selectedItem ? (
                <div className="flex items-center gap-3 bg-[#121211] p-2.5 rounded-xl border border-white/5">
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.name}
                    className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-white text-xs truncate">{selectedItem.name}</h5>
                    <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5 text-gray-400">
                      <span>Base: <strong className="text-brand-gold">₱{selectedItem.price.toFixed(2)}</strong></span>
                      <span>·</span>
                      <span>COGS: <strong className="text-gray-200">₱{cogsPerServing.toFixed(2)}</strong></span>
                    </div>
                  </div>
                </div>
              ) : selectedItemId === '__custom__' ? (
                <div className="space-y-1 bg-[#121211] p-2.5 rounded-xl border border-white/5">
                  <label className="text-[8px] text-gray-400 uppercase font-bold block">Custom Recipe / Dish Title</label>
                  <input
                    type="text"
                    value={customDishName}
                    onChange={(e) => setCustomDishName(e.target.value)}
                    placeholder="e.g. Special Pork Adobo Bowl"
                    className="w-full bg-[#181818] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-brand-gold"
                  />
                </div>
              ) : null}
            </div>

            {/* Timeframe & Horizon Period Tabs (7 cols) */}
            <div className="lg:col-span-7 bg-[#0D0D0C] p-4 rounded-2xl border border-white/10 space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-[10px] text-emerald-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                  <span>📅 Projection Time Horizon</span>
                </label>
                <span className="text-[10px] text-gray-400 font-mono">
                  Multiplier: <strong className="text-white">{periodDays} {periodDays === 1 ? 'day' : 'days'}</strong>
                </span>
              </div>

              {/* Time Horizon Button Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { id: 'daily', label: '☀️ Daily', days: 1, sub: '1 Day' },
                  { id: 'weekly', label: '📆 Weekly', days: 7, sub: '7 Days' },
                  { id: 'monthly', label: '🗓️ Monthly', days: 30, sub: '30 Days' },
                  { id: 'yearly', label: '🏛️ Yearly', days: 365, sub: '365 Days' },
                  { id: 'custom', label: '⚙️ Custom', days: customDays, sub: `${customDays} Days` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPeriodType(tab.id as any)}
                    className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer border ${
                      periodType === tab.id
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-black shadow-md'
                        : 'bg-[#181818] border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="block text-[10.5px] leading-tight font-black">{tab.label}</span>
                    <span className="block text-[8.5px] opacity-75 font-mono mt-0.5">{tab.sub}</span>
                  </button>
                ))}
              </div>

              {/* Custom Days Input field (shown when custom is selected) */}
              {periodType === 'custom' && (
                <div className="flex items-center gap-2 bg-[#181818] p-2.5 rounded-xl border border-emerald-500/30 animate-fade-in">
                  <span className="text-gray-300 text-xs font-bold">Input Custom Duration:</span>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={customDays}
                    onChange={(e) => setCustomDays(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 bg-[#0D0D0C] border border-emerald-500/40 rounded-lg px-2 py-1 text-xs text-white text-center font-mono font-black focus:outline-none"
                  />
                  <span className="text-gray-400 text-xs">days</span>
                  <div className="flex gap-1 ml-auto flex-wrap">
                    {[14, 45, 60, 90, 180].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCustomDays(d)}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          customDays === d ? 'bg-emerald-500 text-black' : 'bg-[#0D0D0C] text-gray-400 hover:text-white'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Section 2: Input Parameters Grid (Daily Volume, Selling Price, Plate COGS, Break-Even) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* 1. Daily Units Sold */}
            <div className="bg-[#0D0D0C] p-3.5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">
                  Daily Volume Sold
                </label>
                <span className="text-[9px] text-emerald-400 font-mono font-bold">
                  {totalPeriodUnits} total
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDailyUnits(u => Math.max(1, u - 1))}
                  className="w-8 h-8 rounded-xl bg-[#181818] border border-white/10 text-white font-bold text-base flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                >−</button>
                <input
                  type="number"
                  min="1"
                  value={dailyUnits}
                  onChange={e => setDailyUnits(Math.max(1, Number(e.target.value) || 1))}
                  className="flex-1 bg-[#181818] border border-white/10 rounded-xl px-2 py-1.5 text-sm text-white text-center font-mono font-black focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => setDailyUnits(u => u + 1)}
                  className="w-8 h-8 rounded-xl bg-[#181818] border border-white/10 text-white font-bold text-base flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                >+</button>
              </div>
              <div className="flex gap-1 flex-wrap pt-0.5">
                {[5, 10, 15, 20, 30, 50, 100].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDailyUnits(n)}
                    className={`px-1.5 py-0.5 text-[8.5px] font-black rounded transition-all cursor-pointer ${
                      dailyUnits === n
                        ? 'bg-emerald-500 text-black'
                        : 'bg-[#181818] text-gray-400 border border-white/5 hover:text-white'
                    }`}
                  >
                    {n} pcs
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Selling Price / Plate */}
            <div className="bg-[#0D0D0C] p-3.5 rounded-2xl border border-brand-gold/30 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[9px] text-brand-gold uppercase font-black tracking-wider block">
                  Selling Price / Plate
                </label>
                {selectedItem && localPrice !== selectedItem.price && (
                  <button
                    type="button"
                    onClick={() => setLocalPrice(selectedItem.price)}
                    className="text-[8px] text-gray-500 hover:text-brand-gold underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-brand-gold font-bold">₱</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={localPrice}
                  onChange={e => setLocalPrice(Number(e.target.value) || 0)}
                  className="w-full bg-[#181818] border border-brand-gold/30 rounded-xl pl-7 pr-3 py-1.5 text-sm text-white text-right font-mono font-black focus:outline-none focus:border-brand-gold"
                />
              </div>
              <div className="text-[9px] text-gray-400 font-mono flex justify-between">
                <span>Unit Margin:</span>
                <span className={unitGrossSpread > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  ₱{unitGrossSpread.toFixed(2)} ({price > 0 ? ((unitGrossSpread / price) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>

            {/* 3. Cost of Goods Sold (COGS) / Plate */}
            <div className="bg-[#0D0D0C] p-3.5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">
                  Plate Recipe COGS
                </label>
                {selectedItem && (
                  <button
                    type="button"
                    onClick={() => {
                      const fin = calculateDishRecipeCost(selectedItem, ingredientsInventory);
                      setLocalCogs(Number(fin.totalCost.toFixed(2)));
                    }}
                    className="text-[8px] text-gray-500 hover:text-gray-300 underline"
                  >
                    Auto COGS
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-gray-400 font-bold">₱</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={localCogs}
                  onChange={e => setLocalCogs(Number(e.target.value) || 0)}
                  className="w-full bg-[#181818] border border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-sm text-white text-right font-mono font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div className="text-[9px] text-gray-500 font-mono flex justify-between">
                <span>Food Cost Ratio:</span>
                <span className="text-amber-400 font-bold">
                  {price > 0 ? ((cogsPerServing / price) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* 4. Break-Even Benchmark */}
            <div className="bg-[#0D0D0C] p-3.5 rounded-2xl border border-white/10 space-y-1.5 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <label className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">
                  Break-Even Point
                </label>
                <span className="text-[8.5px] text-gray-500 font-mono">To cover overheads</span>
              </div>
              <div className="text-center py-1">
                <span className="text-2xl font-black font-mono text-white">{dailyBreakEvenUnits}</span>
                <span className="text-[9.5px] text-gray-400 block font-medium">plates/day ({periodBreakEvenUnits} for {periodDays}d)</span>
              </div>
              <span className={`text-[9px] font-bold text-center block px-2 py-0.5 rounded-lg ${
                dailyUnits >= dailyBreakEvenUnits
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {dailyUnits >= dailyBreakEvenUnits
                  ? `✓ +${dailyUnits - dailyBreakEvenUnits} plates/day profit margin`
                  : `⚠️ -${dailyBreakEvenUnits - dailyUnits} more plates/day needed`}
              </span>
            </div>

          </div>

          {/* Section 3: Overhead Expenses Configurator */}
          <div className="bg-[#0D0D0C] rounded-2xl border border-white/10 overflow-hidden space-y-0">
            <div className="px-4 py-3 bg-[#181818] border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">💡</span>
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Operating Overhead Expenses
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-gray-400">Daily: <strong className="text-white">₱{totalDailyOverhead.toFixed(2)}/day</strong></span>
                <span>·</span>
                <span className="text-gray-400">{periodLabel}: <strong className="text-red-400">₱{totalPeriodOverhead.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              </div>
            </div>

            <div className="p-3.5 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {overheads.map((o, idx) => (
                  <div
                    key={o.id || idx}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                      o.enabled
                        ? 'bg-red-500/5 border-red-500/20 text-white'
                        : 'bg-[#121211] border-white/5 opacity-50 text-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={o.enabled}
                      onChange={() => setOverheads(prev => prev.map((x, i) => i === idx ? { ...x, enabled: !x.enabled } : x))}
                      className="w-3.5 h-3.5 rounded text-emerald-500 bg-[#181818] border-white/20 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-sm shrink-0">{o.icon}</span>
                    <span className="flex-1 text-[10.5px] font-bold truncate">{o.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-gray-500">₱</span>
                      <input
                        type="number"
                        min="0"
                        value={o.amount}
                        onChange={e => setOverheads(prev => prev.map((x, i) => i === idx ? { ...x, amount: Number(e.target.value) || 0 } : x))}
                        className="w-16 bg-[#181818] border border-white/10 rounded-lg px-1.5 py-0.5 text-xs text-white text-right font-mono font-bold focus:outline-none focus:border-emerald-400"
                      />
                      <span className="text-[8px] text-gray-500">/day</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Overhead Expense */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  placeholder="+ Add new overhead item (e.g. Internet, Marketing, Oil)..."
                  value={newExpenseLabel}
                  onChange={e => setNewExpenseLabel(e.target.value)}
                  className="flex-1 bg-[#121211] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
                />
                <div className="flex items-center gap-1 bg-[#121211] border border-white/10 rounded-xl px-2.5 py-1">
                  <span className="text-xs text-gray-500">₱</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newExpenseAmt}
                    onChange={e => setNewExpenseAmt(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-16 bg-transparent text-xs text-white font-mono font-bold text-right focus:outline-none"
                  />
                  <span className="text-[9px] text-gray-500">/day</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (newExpenseLabel.trim() && newExpenseAmt !== '' && Number(newExpenseAmt) >= 0) {
                      setOverheads(prev => [
                        ...prev,
                        { id: 'custom-' + Date.now(), label: newExpenseLabel.trim(), amount: Number(newExpenseAmt), enabled: true, icon: '📌' }
                      ]);
                      setNewExpenseLabel('');
                      setNewExpenseAmt('');
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  + Add Expense
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Period Financial Results Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {[
              {
                label: `Total Revenue (${periodLabel})`,
                value: `₱${periodRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: `${totalPeriodUnits} pcs × ₱${price}`,
                color: 'text-white',
                bg: 'bg-white/[0.02] border-white/10'
              },
              {
                label: 'Total Recipe COGS',
                value: `₱${periodCogsTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: `Food cost: ${cogsRatio.toFixed(1)}%`,
                color: 'text-amber-400',
                bg: 'bg-amber-500/5 border-amber-500/20'
              },
              {
                label: 'Gross Profit',
                value: `₱${periodGrossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: `Gross margin: ${grossMargin.toFixed(1)}%`,
                color: 'text-sky-400',
                bg: 'bg-sky-500/5 border-sky-500/20'
              },
              {
                label: 'Period Overheads',
                value: `₱${totalPeriodOverhead.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: `Overhead ratio: ${overheadRatio.toFixed(1)}%`,
                color: 'text-red-400',
                bg: 'bg-red-500/5 border-red-500/20'
              },
              {
                label: `Net Profit (${periodLabel})`,
                value: `₱${periodNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: `Net margin: ${netMargin.toFixed(1)}%`,
                color: periodNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400',
                bg: periodNetProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
              },
            ].map((card, i) => (
              <div key={i} className={`p-3.5 rounded-2xl border ${card.bg} space-y-1`}>
                <span className="text-[8px] text-gray-400 uppercase font-black tracking-wider block">
                  {card.label}
                </span>
                <span className={`font-mono font-black text-sm sm:text-base block truncate ${card.color}`}>
                  {card.value}
                </span>
                <span className="text-[8.5px] text-gray-400 font-mono block">
                  {card.sub}
                </span>
              </div>
            ))}
          </div>

          {/* Section 5: Multi-Horizon Quick Comparison Matrix */}
          <div className="bg-[#0D0D0C] p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                <span>📊 Horizon Projections Matrix ({dailyUnits} pcs/day volume)</span>
              </span>
              <span className="text-[9px] text-gray-500 font-mono">Normalized estimates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { title: '☀️ Daily (1 Day)', data: horizonDaily, active: periodType === 'daily' },
                { title: '📆 Weekly (7 Days)', data: horizonWeekly, active: periodType === 'weekly' },
                { title: '🗓️ Monthly (30 Days)', data: horizonMonthly, active: periodType === 'monthly' },
                { title: '🏛️ Yearly (365 Days)', data: horizonYearly, active: periodType === 'yearly' },
              ].map((h, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border transition-all space-y-2 ${
                    h.active
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-md'
                      : 'bg-[#141413] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-black text-white text-[11px]">{h.title}</span>
                    <span className="text-[8.5px] font-mono text-gray-400">{h.data.units} pcs</span>
                  </div>

                  <div className="space-y-1 font-mono text-[10px] border-t border-white/5 pt-1.5">
                    <div className="flex justify-between text-gray-400">
                      <span>Revenue:</span>
                      <span className="text-white font-bold">₱{h.data.rev.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>COGS:</span>
                      <span className="text-amber-400">₱{h.data.cogs.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Overhead:</span>
                      <span className="text-red-400">₱{h.data.overhead.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between font-black pt-1 border-t border-white/5 text-xs">
                      <span className="text-gray-300">Net Profit:</span>
                      <span className={h.data.net >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        ₱{h.data.net.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t-2 border-white/5 bg-[#0D0D0C] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[10px] text-gray-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Simulating <strong>{activeDishTitle}</strong> at <strong>{dailyUnits} plates/day</strong> for <strong>{periodLabel}</strong>.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyReport}
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
// ──────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────

function AdminPanel({
  orders,
  menuItems,
  onUpdateOrderStatus,
  unavailableItemIds,
  onToggleItemAvailability,
  stockLevels,
  onUpdateStockLevel,
  onAddMenuItem,
  onEditMenuItem,
  onDeleteMenuItem,
  hiddenCategories,
  onToggleCategoryHidden,
  ingredientsInventory,
  onAddIngredient,
  onUpdateIngredientStock,
  onUpdateMultipleIngredientsStock,
  onEditIngredient,
  onDeleteIngredient,
  onResetToDemo,
  onClearAllData,
  onReturnToStore,
  onToggleItemCooked,
  onSetCookedBy,
  onGenerateRandomOrder,
  onStartItemCooking,
  onManualPlaceOrder,
  onUpdateConfirmationCallStatus,
}: AdminPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  // Login & Dashboard Layout states
  const [loginRole, setLoginRole] = useState<'kitchen' | 'admin' | null>(() => {
    try {
      const cached = localStorage.getItem('curvada_login_role');
      return (cached === 'kitchen' || cached === 'admin') ? cached : null;
    } catch(e) {
      return null;
    }
  });
  const [selectedRole, setSelectedRole] = useState<'kitchen' | 'admin'>('kitchen');
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Live Date & Time clock state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Navigation sub-tabs inside Chef Dashboard
  const [chefTab, setChefTab] = useState<'orders' | 'history' | 'stock' | 'builder' | 'finances' | 'qr' | 'vouchers' | 'po' | 'spoilage' | 'shifts' | 'zread'>('orders');
  const [ordersViewMode, setOrdersViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // Operational & Line Automation States
  const [bottleneckThreshold, setBottleneckThreshold] = useState<number>(15);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [printingOrderType, setPrintingOrderType] = useState<'customer' | 'kot'>('kot');
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(bluetoothPrinter.getStatus());

  useEffect(() => {
    const unsub = bluetoothPrinter.subscribe((status) => {
      setPrinterStatus(status);
    });
    return () => unsub();
  }, []);

  const [tableQRModalOpen, setTableQRModalOpen] = useState(false);
  const [selectedQRTable, setSelectedQRTable] = useState(1);
  const [isProfitCalcModalOpen, setIsProfitCalcModalOpen] = useState(false);
  const [selectedProfitMenuItemId, setSelectedProfitMenuItemId] = useState<string>('');
  const [showPOModal, setShowPOModal] = useState(false);
  const [showSpoilageModal, setShowSpoilageModal] = useState(false);
  const [spoilageIngId, setSpoilageIngId] = useState('');
  const [spoilageAmount, setSpoilageAmount] = useState(100);
  const [spoilageReason, setSpoilageReason] = useState<'expired' | 'spilled' | 'damaged' | 'quality_defect'>('expired');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [staffClockName, setStaffClockName] = useState('');
  const [staffClockHourly, setStaffClockHourly] = useState(75);
  const [activeShifts, setActiveShifts] = useState<{ id: string; staffName: string; clockIn: string; hourlyRate: number }[]>([]);
  const [showZReadModal, setShowZReadModal] = useState(false);
  const [zReadCashCount, setZReadCashCount] = useState(0);

  // Manual POS Order (Walk-In / Messenger) State
  const getPosDefaultPickupDateTime = (offsetMinutes = 15) => {
    const d = new Date(Date.now() + offsetMinutes * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatPosPickupDateTimeDisplay = (isoStr: string, isDelivery = false) => {
    if (!isoStr) return isDelivery ? 'ASAP (~20-30 mins)' : 'ASAP (~15-20 mins)';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const isToday = d.toDateString() === new Date().toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    if (isToday) {
      return `Today, ${timeStr}`;
    }
    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dateStr}, ${timeStr}`;
  };

  const [showManualOrderModal, setShowManualOrderModal] = useState(false);
  const [posOrderSource, setPosOrderSource] = useState<'walkin' | 'messenger'>('walkin');
  const [posOrderType, setPosOrderType] = useState<'pickup' | 'delivery'>('pickup');
  const [posScheduleType, setPosScheduleType] = useState<'asap' | 'scheduled'>('asap');
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posTableNumber, setPosTableNumber] = useState('');
  const [posPickupTime, setPosPickupTime] = useState(() => getPosDefaultPickupDateTime(15));
  const [posDeliveryTime, setPosDeliveryTime] = useState(() => getPosDefaultPickupDateTime(30));
  const [posDeliveryAddress, setPosDeliveryAddress] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cod' | 'ewallet' | 'card'>('cod');
  const [posAmountTendered, setPosAmountTendered] = useState<number | ''>('');
  const [posSelectedCategory, setPosSelectedCategory] = useState<string>('all');
  const [posSearchQuery, setPosSearchQuery] = useState('');
  const [posCart, setPosCart] = useState<any[]>([]);
  const [posSelectedItem, setPosSelectedItem] = useState<MenuItem | null>(null);
  const [posItemQuantity, setPosItemQuantity] = useState(1);
  const [posSelectedOptions, setPosSelectedOptions] = useState<SelectedOption[]>([]);
  const [posSpecialInstructions, setPosSpecialInstructions] = useState('');
  const [posMobileTab, setPosMobileTab] = useState<'catalog' | 'ticket'>('catalog');

  // Financial Tracker Internal Sub-Tabs & Filter States
  const [financeSubTab, setFinanceSubTab] = useState<'overview' | 'overheads' | 'timeline' | 'daily-ledger'>('overview');
  const [dailySearchQuery, setDailySearchQuery] = useState('');
  const [dailyPeriodFilter, setDailyPeriodFilter] = useState<'all' | '7d' | '30d'>('all');
  const [dailyStatusFilter, setDailyStatusFilter] = useState<'all' | 'profitable' | 'loss' | 'sales'>('all');
  const [dailySortBy, setDailySortBy] = useState<'date-desc' | 'date-asc' | 'revenue-desc' | 'profit-desc' | 'orders-desc'>('date-desc');

  // Dedicated Full-Screen Dashboard Data States
  const [vouchersList, setVouchersList] = useState<Array<{ id: string; code: string; discountType: 'percentage' | 'fixed'; discountValue: number; minSpend: number; active: boolean; timesUsed: number }>>([
    { id: 'v-1', code: 'WELCOME10', discountType: 'percentage', discountValue: 10, minSpend: 200, active: true, timesUsed: 34 },
    { id: 'v-2', code: 'CURVADA50', discountType: 'fixed', discountValue: 50, minSpend: 500, active: true, timesUsed: 22 },
    { id: 'v-3', code: 'SILOG15', discountType: 'percentage', discountValue: 15, minSpend: 350, active: true, timesUsed: 14 },
    { id: 'v-4', code: 'VIP25', discountType: 'percentage', discountValue: 25, minSpend: 800, active: false, timesUsed: 8 },
  ]);
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherType, setNewVoucherType] = useState<'percentage' | 'fixed'>('percentage');
  const [newVoucherValue, setNewVoucherValue] = useState<number>(10);
  const [newVoucherMinSpend, setNewVoucherMinSpend] = useState<number>(250);

  const [spoilageLogs, setSpoilageLogs] = useState<Array<{ id: string; ingredientId: string; ingredientName: string; amount: number; unit: string; reason: string; loggedBy: string; timestamp: string; estLossCost: number }>>([
    { id: 'sp-1', ingredientId: 'ing-beef', ingredientName: 'Beef Tapa Strips', amount: 500, unit: 'g', reason: 'expired', loggedBy: 'Chef Ronald', timestamp: new Date(Date.now() - 3600000 * 14).toISOString(), estLossCost: 375 },
    { id: 'sp-2', ingredientId: 'ing-eggs', ingredientName: 'Fresh Native Eggs', amount: 12, unit: 'pcs', reason: 'damaged', loggedBy: 'Manager', timestamp: new Date(Date.now() - 3600000 * 36).toISOString(), estLossCost: 180 },
    { id: 'sp-3', ingredientId: 'ing-rice', ingredientName: 'Sinag Garlic Rice Grain', amount: 2, unit: 'kg', reason: 'spilled', loggedBy: 'Kitchen Staff', timestamp: new Date(Date.now() - 3600000 * 60).toISOString(), estLossCost: 120 },
  ]);

  const [completedShifts, setCompletedShifts] = useState<Array<{ id: string; staffName: string; clockIn: string; clockOut: string; totalHours: number; hourlyRate: number; totalEarned: number }>>([
    { id: 'cs-1', staffName: 'Chef Ronald', clockIn: new Date(Date.now() - 3600000 * 9).toISOString(), clockOut: new Date(Date.now() - 3600000 * 1).toISOString(), totalHours: 8, hourlyRate: 75, totalEarned: 600 },
    { id: 'cs-2', staffName: 'Maria Santos (Cashier)', clockIn: new Date(Date.now() - 3600000 * 18).toISOString(), clockOut: new Date(Date.now() - 3600000 * 10).toISOString(), totalHours: 8, hourlyRate: 75, totalEarned: 600 },
    { id: 'cs-3', staffName: 'Juan Dela Cruz', clockIn: new Date(Date.now() - 3600000 * 34).toISOString(), clockOut: new Date(Date.now() - 3600000 * 26).toISOString(), totalHours: 8, hourlyRate: 75, totalEarned: 600 },
  ]);

  const [zReadReports, setZReadReports] = useState<Array<{ id: string; date: string; grossSales: number; cashSales: number; ewalletSales: number; cardSales: number; countedCash: number; variance: number; closedBy: string }>>([
    { id: 'zr-1', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], grossSales: 14250, cashSales: 8500, ewalletSales: 4250, cardSales: 1500, countedCash: 8500, variance: 0, closedBy: 'Manager' },
    { id: 'zr-2', date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], grossSales: 11890, cashSales: 7100, ewalletSales: 3500, cardSales: 1290, countedCash: 7100, variance: 0, closedBy: 'Manager' },
  ]);

  const playKitchenChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.setValueAtTime(1320, ctx.currentTime);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.log('Audio chime unavailable', e);
    }
  };

  const prevOrdersCount = React.useRef(orders.length);
  useEffect(() => {
    if (orders.length > prevOrdersCount.current) {
      playKitchenChime();
      const settings = bluetoothPrinter.getSettings();
      if (settings.autoPrintKOT && bluetoothPrinter.getStatus().isConnected) {
        const newestOrder = orders[0];
        if (newestOrder) {
          bluetoothPrinter.printReceipt(newestOrder, 'kot').catch((e) => console.error('Auto KOT print failed', e));
        }
      }
    }
    prevOrdersCount.current = orders.length;
  }, [orders.length]);


  // Sync chefTab state with URL paths
  useEffect(() => {
    if (path.startsWith('/portal/admin')) {
      if (path === '/portal/admin/history') setChefTab('history');
      else if (path === '/portal/admin/stock') setChefTab('stock');
      else if (path === '/portal/admin/builder') setChefTab('builder');
      else if (path === '/portal/admin/finances') setChefTab('finances');
      else if (path === '/portal/admin/qr') setChefTab('qr');
      else if (path === '/portal/admin/vouchers') setChefTab('vouchers');
      else if (path === '/portal/admin/po') setChefTab('po');
      else if (path === '/portal/admin/spoilage') setChefTab('spoilage');
      else if (path === '/portal/admin/shifts') setChefTab('shifts');
      else if (path === '/portal/admin/zread') setChefTab('zread');
      else setChefTab('orders');
    } else if (path.startsWith('/portal/kitchen')) {
      if (path === '/portal/kitchen/history') setChefTab('history');
      else if (path === '/portal/kitchen/spoilage') setChefTab('spoilage');
      else if (path === '/portal/kitchen/shifts') setChefTab('shifts');
      else if (path === '/portal/kitchen/qr') setChefTab('qr');
      else if (path === '/portal/kitchen/orders') setChefTab('orders');
      else setChefTab('orders');
    }
  }, [path]);

  // Route protection/guards
  useEffect(() => {
    // If not logged in and visiting portal routes, redirect to login
    if (path.startsWith('/portal') && path !== '/portal/login') {
      if (!loginRole) {
        navigate('/portal/login');
        return;
      }
    }

    // Redirect base /portal or /portal/ requests to role-specific dashboard
    if (path === '/portal' || path === '/portal/') {
      if (loginRole === 'admin') navigate('/portal/admin');
      else if (loginRole === 'kitchen') navigate('/portal/kitchen');
      return;
    }
    
    // Redirect kitchen staff away from admin panels
    if (path.startsWith('/portal/admin') && loginRole === 'kitchen') {
      navigate('/portal/kitchen');
    }

    // Redirect logged-in users away from portal login screen
    if (path === '/portal/login' && loginRole) {
      if (loginRole === 'admin') navigate('/portal/admin');
      else if (loginRole === 'kitchen') navigate('/portal/kitchen');
    }
  }, [path, loginRole, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    const cleanedPasscode = passcode.trim().toLowerCase();
    if (!cleanedPasscode) {
      setLoginError('Please enter a passcode!');
      return;
    }

    try {
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: cleanedPasscode, requestedRole: selectedRole })
      });
      const data = await res.json();

      if (res.ok && data.success && data.role) {
        const authedRole: 'kitchen' | 'admin' = data.role;
        setLoginRole(authedRole);
        localStorage.setItem('curvada_login_role', authedRole);
        setPasscode('');

        if (authedRole === 'admin') {
          navigate('/portal/admin');
        } else {
          setChefTab('orders');
          navigate('/portal/kitchen');
        }
        return;
      } else if (data.error) {
        setLoginError(data.error);
        return;
      }
    } catch (e) {
      console.warn("Staff auth endpoint offline, running smart fallback", e);
    }

    // Smart Local Fallback
    let roleToSet: 'kitchen' | 'admin' | null = null;
    if (cleanedPasscode === 'admin123') {
      roleToSet = 'admin';
    } else if (cleanedPasscode === 'kitchen123') {
      roleToSet = 'kitchen';
    }

    if (roleToSet) {
      setLoginRole(roleToSet);
      localStorage.setItem('curvada_login_role', roleToSet);
      setPasscode('');
      if (roleToSet === 'admin') {
        navigate('/portal/admin');
      } else {
        setChefTab('orders');
        navigate('/portal/kitchen');
      }
    } else {
      setLoginError(selectedRole === 'admin' ? 'Invalid Administrator Passcode!' : 'Invalid Kitchen Staff Passcode!');
    }
  };


  const handleLogout = () => {
    setLoginRole(null);
    localStorage.removeItem('curvada_login_role');
    setPasscode('');
    setLoginError('');
    setIsSidebarOpen(false);
    navigate('/portal/login');
  };

  const KanbanCard = ({ order }: { order: Order; key?: string }) => {
    const elapsedMinutes = Math.round(
      (Date.now() - new Date(order.timestamp).getTime()) / (1000 * 60)
    );
    const timeText = elapsedMinutes <= 0 ? 'Just now' : `${elapsedMinutes}m ago`;

    const autoPrepTime = useMemo(() => {
      const itemTimes = order.items.map(item => {
        const match = menuItems.find(m => m.id === item.menuItem.id);
        return match?.estimatedPrepTime || item.menuItem.estimatedPrepTime || 10;
      });
      if (itemTimes.length === 0) return 10;
      const maxTime = Math.max(...itemTimes);
      const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
      return maxTime + (totalQty - 1) * 2;
    }, [order.items]);

    const isAllItemsCooked = useMemo(() => {
      if (order.items.length === 0) return false;
      return order.items.every(item => order.cookedItemIds?.includes(item.id));
    }, [order.items, order.cookedItemIds]);

    return (
      <div className="bg-[#181818] border border-white/5 hover:border-white/10 rounded-2xl p-4 space-y-3.5 transition-all shadow-md">
        
        {/* Top Info */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-black text-white/50 uppercase">
              #{order.id.slice(0, 8)}
            </span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
              elapsedMinutes > 15 ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' :
              elapsedMinutes >= 10 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              ⏱️ {timeText}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setPrintingOrderType('kot');
                setPrintingOrder(order);
              }}
              className="px-2 py-0.5 rounded bg-[#0D0D0C] hover:bg-[#222222] border border-white/10 text-gray-400 hover:text-brand-gold text-[9px] font-bold transition-all cursor-pointer"
              title="Print Kitchen Ticket (KOT)"
            >
              👨‍🍳 KOT
            </button>
            <button
              type="button"
              onClick={() => {
                setPrintingOrderType('customer');
                setPrintingOrder(order);
              }}
              className="px-2 py-0.5 rounded bg-[#0D0D0C] hover:bg-[#222222] border border-white/10 text-gray-400 hover:text-brand-gold text-[9px] font-bold transition-all cursor-pointer"
              title="Print Customer Receipt"
            >
              🧾 Slip
            </button>
          </div>

        </div>

        {/* Customer & Fulfillment Info */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <p className="font-bold text-white truncate text-sm">{order.customer.name}</p>
            <span className="text-[10px] text-gray-400 font-mono tracking-tight font-semibold">{order.customer.phone}</span>
          </div>

          {/* Badges line: non-conflicting */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {order.orderSource === 'walkin' ? (
              <span className="text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                🚶 Walk-In
              </span>
            ) : (
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                order.customer.orderType === 'delivery' 
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30' 
                  : 'bg-brand-gold/10 text-brand-gold border border-brand-gold/30'
              }`}>
                {order.customer.orderType === 'delivery' ? '🛵 Delivery' : `🛍️ Pickup ${order.customer.tableNumber ? `(T-${order.customer.tableNumber})` : ''}`}
              </span>
            )}

            {order.customer.orderType === 'pickup' && order.customer.pickupTime && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                ⏰ {order.customer.pickupTime}
              </span>
            )}

            {order.customer.orderType === 'delivery' && order.customer.deliveryTime && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-red-500/15 text-red-300 border border-red-500/30">
                ⏰ {order.customer.deliveryTime}
              </span>
            )}

            {order.orderSource === 'messenger' && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                💬 Messenger
              </span>
            )}

            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
              order.paymentMethod === 'cod' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-gray-400 border border-white/10'
            }`}>
              {order.paymentMethod === 'cod' ? '💵 COD' : order.paymentMethod}
            </span>

            {order.changeAmount !== undefined && order.changeAmount > 0 && (
              <span className="text-[8px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                Change: ₱{order.changeAmount.toFixed(0)}
              </span>
            )}

            {isAllItemsCooked && order.status === 'preparing' && (
              <span className="text-[8px] font-black px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 uppercase tracking-wider animate-pulse border border-green-500/20">
                🟢 Ready to Pack
              </span>
            )}
          </div>

          {/* GPS Pin Badge & Direct Google Maps Navigation */}
          {order.customer.latitude && order.customer.longitude && (
            <div className="flex items-center justify-between text-[9px] bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-1.5 px-2.5">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                GPS Location Attached
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${order.customer.latitude},${order.customer.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand-gold font-black underline hover:text-white flex items-center gap-0.5 text-[9px]"
              >
                🗺️ Maps ↗
              </a>
            </div>
          )}

          {/* COD Anti-Bogus Call & Verification Toolbar (Compact Grid) */}
          {order.paymentMethod === 'cod' && (
            <div className="bg-[#121211] border border-white/10 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                    {order.isFirstTimeCod ? '⚠️ 1st-Time COD' : 'COD Verification'}
                  </span>
                </div>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  order.confirmationCallStatus === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  order.confirmationCallStatus === 'unreachable' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                  order.confirmationCallStatus === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                }`}>
                  {order.confirmationCallStatus === 'confirmed' ? '✓ Confirmed' :
                   order.confirmationCallStatus === 'unreachable' ? '📵 Unreachable' :
                   order.confirmationCallStatus === 'rejected' ? '🚫 Rejected' :
                   '📞 Call Pending'}
                </span>
              </div>

              {/* 5-Button Unified Action Grid */}
              <div className="grid grid-cols-5 gap-1 pt-0.5">
                <a
                  href={`tel:${order.customer.phone}`}
                  className="py-1 px-1 rounded-lg bg-[#1c1c1a] hover:bg-emerald-600/30 text-emerald-400 hover:text-white border border-white/5 hover:border-emerald-500/30 text-[9px] font-bold flex items-center justify-center gap-1 transition-all text-center"
                  title="Call Customer"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Call</span>
                </a>

                <a
                  href={`sms:${order.customer.phone}?body=Hi ${encodeURIComponent(order.customer.name)}, this is Curvada's Kitchen regarding your COD order #${order.id.slice(0, 8)}. Please confirm your order so we can cook!`}
                  className="py-1 px-1 rounded-lg bg-[#1c1c1a] hover:bg-blue-600/30 text-blue-400 hover:text-white border border-white/5 hover:border-blue-500/30 text-[9px] font-bold flex items-center justify-center gap-1 transition-all text-center"
                  title="Send SMS"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>SMS</span>
                </a>

                <button
                  type="button"
                  onClick={() => onUpdateConfirmationCallStatus?.(order.id, 'confirmed', false)}
                  className={`py-1 px-1 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer flex items-center justify-center ${
                    order.confirmationCallStatus === 'confirmed' 
                      ? 'bg-emerald-500 text-black font-extrabold shadow-sm' 
                      : 'bg-[#1c1c1a] text-gray-300 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/5'
                  }`}
                  title="Mark Confirmed (OK to Cook)"
                >
                  ✓ OK
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateConfirmationCallStatus?.(order.id, 'unreachable')}
                  className={`py-1 px-1 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer flex items-center justify-center truncate ${
                    order.confirmationCallStatus === 'unreachable' 
                      ? 'bg-orange-500 text-black font-extrabold shadow-sm' 
                      : 'bg-[#1c1c1a] text-gray-300 hover:bg-orange-500/20 hover:text-orange-400 border border-white/5'
                  }`}
                  title="Customer Unreachable"
                >
                  📵 No Ans
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Flag this order as Fake/Bogus?')) {
                      onUpdateConfirmationCallStatus?.(order.id, 'rejected', true);
                    }
                  }}
                  className={`py-1 px-1 rounded-lg text-[8px] font-black uppercase transition-all cursor-pointer flex items-center justify-center ${
                    order.confirmationCallStatus === 'rejected' 
                      ? 'bg-red-500 text-white font-extrabold shadow-sm' 
                      : 'bg-[#1c1c1a] text-gray-300 hover:bg-red-500/20 hover:text-red-400 border border-white/5'
                  }`}
                  title="Flag Bogus Order"
                >
                  🚫 Fake
                </button>
              </div>
            </div>
          )}

          {/* Bogus Order Warning Banner */}
          {order.isBogusRisk && (
            <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center gap-1.5 text-red-400 text-[9px] font-black uppercase tracking-wider animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
              <span>🚨 Flagged as Bogus / Suspicious</span>
            </div>
          )}
        </div>

        {/* Prepared By Staff / Chef Tag (Clean compact box) */}
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-[#121211] border border-white/5 rounded-xl text-[9px]">
          <span className="text-gray-400 font-bold uppercase tracking-wider">Chef:</span>
          {onSetCookedBy ? (
            <input
              type="text"
              placeholder="Assign Chef..."
              defaultValue={order.cookedBy || ''}
              onBlur={(e) => onSetCookedBy(order.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSetCookedBy(order.id, (e.target as HTMLInputElement).value);
                }
              }}
              className="bg-black/40 border border-white/10 rounded-lg px-2 py-0.5 text-[9px] text-white focus:outline-none focus:border-brand-gold w-32 font-semibold text-right"
            />
          ) : (
            <span className="font-bold text-brand-gold">{order.cookedBy || 'Kitchen Team'}</span>
          )}
        </div>

        {/* Item checklist */}
        <div className="space-y-1 pb-1">
          <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest block">Ordered Items</span>
          <div className="space-y-1">
            {order.items.map(item => {
              const isCooked = order.cookedItemIds?.includes(item.id);
              const isStarted = order.startedItemIds?.includes(item.id);
              const canToggle = order.status === 'preparing';

              return (
                <div key={item.id} className="text-xs font-medium flex items-start justify-between gap-2 p-2 rounded-lg bg-black/20 border border-white/[0.04]">
                  <div className="min-w-0 flex-1">
                    <div className={`truncate ${isCooked ? 'line-through text-gray-500' : isStarted ? 'text-brand-gold font-semibold' : 'text-gray-200 font-bold'}`}>
                      <strong className="text-brand-red mr-1 font-extrabold">{item.quantity}x</strong> 
                      {item.menuItem.name}
                    </div>

                    {/* Selected Options / Add-ons / Rice display */}
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedOptions.map((opt, optIdx) => (
                          <span
                            key={optIdx}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold border leading-none ${
                              opt.choice.price > 0
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                : 'bg-white/5 border-white/10 text-gray-300'
                            }`}
                          >
                            + {opt.choice.name} {opt.choice.price > 0 ? `(+₱${opt.choice.price.toFixed(2)})` : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Special Instructions */}
                    {item.specialInstructions && (
                      <div className="text-[9px] text-amber-400/90 italic mt-1 font-medium bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10">
                        📝 "{item.specialInstructions}"
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                    {canToggle && !isCooked && !isStarted && onStartItemCooking && (
                      <button
                        type="button"
                        onClick={() => onStartItemCooking(order.id, item.id)}
                        className="px-1.5 py-0.5 rounded bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/20 text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                        title="Start cooking this dish item"
                      >
                        ▶️ Prep
                      </button>
                    )}
                    {canToggle && isStarted && !isCooked && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[8px] font-bold uppercase tracking-wider border border-amber-500/20 animate-pulse">
                        🔥 Cooking
                      </span>
                    )}
                    {canToggle ? (
                      <button
                        type="button"
                        onClick={() => onToggleItemCooked?.(order.id, item.id)}
                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                          isCooked 
                            ? 'bg-green-500/10 border-green-500/25 text-green-450' 
                            : 'bg-[#181818] border-white/10 text-gray-500 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {isCooked ? '✓ Cooked' : 'Done?'}
                      </button>
                    ) : (
                      isCooked && (
                        <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-450 text-[8px] font-black uppercase tracking-wider">
                          ✓ Cooked
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Cooking Timer Section */}
        {order.status === 'preparing' && (
          <div className="pt-1.5">
            {!order.cookingStartTime ? (
              <div className="space-y-2 p-2.5 bg-[#0D0D0C]/40 border border-white/5 rounded-xl">
                <div className="flex items-center justify-between text-[8px] font-black uppercase text-gray-500 tracking-wider">
                  <span>Cooking Queue</span>
                  <span className="text-brand-gold font-bold">Auto Est: {autoPrepTime}m</span>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateOrderStatus(order.id, 'preparing', new Date().toISOString(), autoPrepTime)}
                  className="w-full py-2 bg-brand-gold hover:opacity-90 text-black text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer rounded-lg flex items-center justify-center gap-1 shadow-md"
                >
                  ▶️ Start Cooking
                </button>

                <div className="h-[1px] bg-white/5" />

                {/* Custom Entry select option */}
                <div className="space-y-1.5">
                  <span className="text-[8px] text-gray-500 font-black uppercase tracking-wider block">Or Custom Start Time</span>
                  <div className="flex items-center gap-1.5 justify-between">
                    <input 
                      type="number" 
                      min="1" 
                      defaultValue={15} 
                      id={`custom-time-${order.id}`}
                      className="w-16 bg-[#181818] border border-white/10 rounded-lg px-2 py-1 text-xs text-center text-white focus:outline-none focus:border-brand-gold"
                    />
                    <select 
                      id={`custom-unit-${order.id}`}
                      className="bg-[#181818] border border-white/10 rounded-lg px-2 py-1 text-xs text-brand-gold font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="m">Mins</option>
                      <option value="h">Hours</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt((document.getElementById(`custom-time-${order.id}`) as HTMLInputElement)?.value || "0");
                        const unit = (document.getElementById(`custom-unit-${order.id}`) as HTMLSelectElement)?.value || "m";
                        const resolvedMins = unit === 'h' ? val * 60 : val;
                        if (resolvedMins > 0) {
                          onUpdateOrderStatus(order.id, 'preparing', new Date().toISOString(), resolvedMins);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-brand-gold hover:opacity-90 text-black text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Start
                    </button>
                  </div>
                </div>

              </div>
            ) : isAllItemsCooked ? (
              <div className="p-2.5 rounded-xl flex items-center justify-between text-[10px] font-black uppercase tracking-wide border bg-green-500/10 border-green-500/20 text-green-400">
                <span className="flex items-center gap-1">
                  🎉 Ready to Pack
                </span>
                <span className="font-mono text-xs font-black">✓ DONE</span>
              </div>
            ) : (
              (() => {
                const startMs = new Date(order.cookingStartTime!).getTime();
                const durationMs = order.estimatedPrepTime * 60 * 1000;
                const elapsedMs = Date.now() - startMs;
                const remainingMs = durationMs - elapsedMs;
                const isOverdue = remainingMs <= 0;

                const timeString = (() => {
                  const absDiffSec = Math.ceil(Math.abs(remainingMs) / 1000);
                  const mins = Math.floor(absDiffSec / 60);
                  const secs = absDiffSec % 60;
                  const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;
                  return isOverdue ? `${formatted} overdue` : `${formatted} left`;
                })();

                return (
                  <div className={`p-2.5 rounded-xl flex items-center justify-between text-[10px] font-black uppercase tracking-wide border ${
                    isOverdue 
                      ? 'bg-brand-red/10 border-brand-red/20 text-brand-red animate-pulse'
                      : 'bg-brand-gold/10 border-brand-gold/20 text-brand-gold'
                  }`}>
                    <span className="flex items-center gap-1">
                      {isOverdue ? '⚠️ Overdue' : '⏳ Cooking'}
                    </span>
                    <span className="font-mono text-xs font-black">{timeString}</span>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Action button */}
        <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
          <div className="flex gap-1.5 w-full">
            {order.status === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={() => onUpdateOrderStatus(order.id, 'preparing')}
                  className="flex-1 py-2 rounded-xl bg-brand-gold hover:opacity-90 text-black text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Accept & Prep
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Cancel this order?')) {
                      onUpdateOrderStatus(order.id, 'cancelled');
                    }
                  }}
                  className="px-2 py-2 rounded-xl border border-brand-red/30 hover:bg-brand-red/5 text-brand-red text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Reject
                </button>
              </>
            )}

            {order.status === 'preparing' && (
              <div className="flex flex-col gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => onUpdateOrderStatus(order.id, 'dispatched')}
                  className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isAllItemsCooked 
                      ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/10 animate-pulse'
                      : 'bg-brand-red hover:opacity-90 text-white'
                  }`}
                >
                  {isAllItemsCooked ? '✓ Cooked! Dispatch Order' : 'Dispatch Order'}
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateOrderStatus(order.id, 'pending', '', 0)}
                  className="w-full py-1.5 rounded-xl border border-white/10 bg-black/25 hover:bg-white/5 text-gray-400 hover:text-white text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  ← Back to Prep Queue
                </button>
              </div>
            )}

            {order.status === 'dispatched' && (
              <div className="flex flex-col gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                  className="w-full py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Mark Completed
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateOrderStatus(order.id, 'preparing')}
                  className="w-full py-1.5 rounded-xl border border-brand-gold/30 hover:bg-brand-gold/5 text-brand-gold text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  ← Back to Cooking
                </button>
              </div>
            )}

            {order.status === 'delivered' && (
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.id, 'dispatched')}
                className="w-full py-2 rounded-xl border border-blue-500/30 hover:bg-blue-500/5 text-blue-450 text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                ← Back to Ready
              </button>
            )}
            
            <button
              type="button"
              onClick={() => setViewingOrderDetails(order)}
              className="p-2 rounded-xl bg-[#0D0D0C] hover:bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
              title="View Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLogin = () => {
    return (
      <div className="fixed inset-0 bg-[#0D0D0C] flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
        <div className="max-w-md w-full space-y-6 my-8">
          
          {/* Logo and Greeting */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 bg-brand-red/10 text-brand-red rounded-3xl border border-brand-red/15 animate-bounce-slow">
              <ChefHat className="w-8 h-8" />
            </div>
            <h2 className="font-display font-black text-2xl uppercase tracking-tighter text-white">
              Workplace Console
            </h2>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Enter your passcode to sign in
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-[#121211] border-2 border-white/5 rounded-[2.5rem] p-6 md:p-8 shadow-2xl space-y-6">
            
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Role Select Buttons */}
              <div className="grid grid-cols-2 gap-2 bg-[#0D0D0C] p-1 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('kitchen');
                    setLoginError('');
                  }}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    selectedRole === 'kitchen'
                      ? 'bg-brand-red text-white shadow-lg shadow-brand-red/10'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Kitchen Staff
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('admin');
                    setLoginError('');
                  }}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    selectedRole === 'admin'
                      ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/10'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Manager / Admin
                </button>
              </div>

              {/* Passcode Input */}
              <div className="space-y-1">
                <label className="text-[9px] text-gray-500 uppercase tracking-widest font-black block">
                  Staff Passcode
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                  />
                </div>
              </div>

              {loginError && (
                <p className="text-brand-red text-[11px] font-bold text-center animate-shake mt-1">
                  ⚠️ {loginError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-brand-red hover:opacity-90 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-brand-red/10 focus:outline-none cursor-pointer"
              >
                Sign In
              </button>
            </form>

            {/* Hint Box */}
            <div className="bg-black/40 border border-white/5 rounded-2xl p-3.5 text-center space-y-1">
              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block">Simulation Passcodes:</span>
              <p className="text-[10px] text-gray-400">
                Kitchen: <span className="font-mono font-bold text-white">kitchen123</span> • Admin: <span className="font-mono font-bold text-brand-gold">admin123</span>
              </p>
            </div>

          </div>

          {/* Return button */}
          {onReturnToStore && (
            <div className="text-center">
              <button
                type="button"
                onClick={onReturnToStore}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-all font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Return to Customer Storefront
              </button>
            </div>
          )}

        </div>
      </div>
    );
  };

  const renderSidebar = () => {
    const mainLinks = [
      { id: 'orders', label: 'Order Queue', icon: ChefHat, badge: orders.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'dispatched').length },
      { id: 'history', label: 'Order History & Sales', icon: Clock, badge: null },
      { id: 'stock', label: 'Stock & Inventory', icon: Sparkles, badge: stockStats.totalCount, adminOnly: true },
      { id: 'builder', label: 'Menu Builder', icon: Edit, badge: null, adminOnly: true },
      { id: 'finances', label: 'Financial Tracker', icon: DollarSign, badge: null, adminOnly: true },
    ].filter(l => !l.adminOnly || loginRole === 'admin');

    const automationTools = [
      { id: 'qr', label: 'Table QR Generator', icon: QrCode },
      { id: 'printer', label: 'Bluetooth Printer', icon: Printer },
      { id: 'vouchers', label: 'Promo Vouchers', icon: Ticket, adminOnly: true },
      { id: 'po', label: 'Low-Stock Supplier PO', icon: PackageCheck, adminOnly: true },
      { id: 'spoilage', label: 'Log Spoilage / Waste', icon: Trash2 },
      { id: 'shifts', label: 'Staff Shift Clock', icon: Clock },
      { id: 'zread', label: 'EOD Z-Read Audit', icon: FileSpreadsheet, adminOnly: true },
    ].filter(l => !l.adminOnly || loginRole === 'admin');

    return (
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#121211] border-r-2 border-white/5 flex flex-col justify-between p-5 transform transition-transform duration-300 xl:translate-x-0 xl:static xl:h-screen ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-6 overflow-y-auto pr-1">
          
          {/* Logo Brand */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-brand-red flex items-center justify-center text-white text-lg font-black font-display tracking-tighter shadow-lg shadow-brand-red/20">
                C
              </div>
              <div>
                <span className="font-display font-black text-sm uppercase tracking-tighter text-white block leading-none">
                  CURVADA'S
                </span>
                <span className="text-[9px] text-brand-gold uppercase tracking-widest font-black leading-none block mt-0.5">
                  KITCHEN KDS
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="xl:hidden p-1.5 rounded-lg bg-black/20 border border-white/5 text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active profile */}
          <div className="bg-[#0D0D0C] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-black ${
              loginRole === 'admin' ? 'bg-brand-gold text-black' : 'bg-brand-red text-white'
            }`}>
              {loginRole === 'admin' ? 'A' : 'K'}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Active Staff</span>
              <p className="text-xs font-black text-white capitalize truncate leading-none mt-0.5">
                {loginRole === 'admin' ? 'Administrator' : 'Kitchen Chef'}
              </p>
            </div>
          </div>

          {/* Main Dashboard Navigation Links */}
          <nav className="space-y-1.5">
            <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest px-2 block mb-2">
              Core Navigation
            </span>
            {mainLinks.map(link => {
              const LinkIcon = link.icon;
              const isActive = chefTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setChefTab(link.id as any);
                    if (loginRole === 'admin') {
                      if (link.id === 'orders') navigate('/portal/admin');
                      else navigate(`/portal/admin/${link.id}`);
                    } else {
                      if (link.id === 'orders') navigate('/portal/kitchen');
                      else navigate(`/portal/kitchen/${link.id}`);
                    }
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? loginRole === 'admin'
                        ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/10 shadow-sm'
                        : 'bg-brand-red/10 text-brand-red border border-brand-red/10 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LinkIcon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge !== null && link.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${
                      isActive 
                        ? loginRole === 'admin'
                          ? 'bg-brand-gold text-black'
                          : 'bg-brand-red text-white'
                        : 'bg-white/5 text-gray-400'
                    }`}>
                      {link.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Workflow Automation Tools Section */}
          <nav className="space-y-1.5 pt-2 border-t border-white/5">
            <span className="text-[8px] text-brand-gold font-black uppercase tracking-widest px-2 block mb-2">
              ⚡ Automation & Operations
            </span>
            {automationTools.map(tool => {
              const ToolIcon = tool.icon;
              const isActive = chefTab === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    if (tool.id === 'printer') {
                      setIsBluetoothModalOpen(true);
                      setIsSidebarOpen(false);
                      return;
                    }
                    setChefTab(tool.id as any);
                    if (loginRole === 'admin') {
                      navigate(`/portal/admin/${tool.id}`);
                    } else {
                      navigate(`/portal/kitchen/${tool.id}`);
                    }
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? loginRole === 'admin'
                        ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20 shadow-sm font-black'
                        : 'bg-brand-red/10 text-brand-red border border-brand-red/20 shadow-sm font-black'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ToolIcon className={`w-4 h-4 ${isActive ? (loginRole === 'admin' ? 'text-brand-gold' : 'text-brand-red') : 'text-brand-gold'}`} />
                    <span>{tool.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-ping" />
                  )}
                </button>
              );
            })}
          </nav>

        </div>

        {/* Sidebar Footer */}
        <div className="space-y-2 pb-2 pt-4 border-t border-white/5">
          {onReturnToStore && (
            <button
              onClick={onReturnToStore}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold text-gray-500 hover:text-white hover:bg-white/[0.01] transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Customer Storefront</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold text-brand-red hover:bg-brand-red/5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    );
  };

  const renderHeader = () => {
    const formattedDate = currentTime.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const formattedTime = currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    return (
      <header className="bg-[#121211] border-b-2 border-white/5 py-4 px-4 md:px-8 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3.5 flex-wrap">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="xl:hidden p-2 rounded-xl bg-[#181818] border border-white/5 text-gray-400 hover:text-white"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display font-black text-base uppercase tracking-tight text-white flex items-center gap-2">
              👨‍🍳 curvada workspace console
            </h1>
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#0D0D0C] border border-white/10 text-xs font-mono font-bold shadow-inner">
              <Clock className="w-3.5 h-3.5 text-brand-gold animate-pulse" />
              <span className="text-gray-300">{formattedDate}</span>
              <span className="text-gray-600">•</span>
              <span className="text-brand-gold font-black">{formattedTime}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`py-1 px-2.5 rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer border flex items-center gap-1 ${
              soundEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-white/5 text-gray-500 border-white/10'
            }`}
            title="Toggle Kitchen Sound Alerts"
          >
            {soundEnabled ? '🔔 Chime On' : '🔕 Muted'}
          </button>

          {/* Bluetooth Receipt Printer */}
          <button
            type="button"
            onClick={() => setIsBluetoothModalOpen(true)}
            className={`py-1 px-2.5 rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer border flex items-center gap-1.5 ${
              printerStatus.isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white border-white/10'
            }`}
            title="Bluetooth Receipt Printer Settings"
          >
            <span className={`w-2 h-2 rounded-full ${printerStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
            <Printer className="w-3.5 h-3.5" />
            <span>{printerStatus.isConnected ? (printerStatus.deviceName || 'Printer Ready') : 'Bluetooth Printer'}</span>
          </button>


          {/* Table QR Code Generator */}
          <button
            type="button"
            onClick={() => setTableQRModalOpen(true)}
            className="py-1 px-2.5 bg-[#181818] border border-white/10 text-white hover:border-brand-gold hover:text-brand-gold rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer flex items-center gap-1"
          >
            📱 Table QR
          </button>

          {/* Staff Shift Timecard */}
          <button
            type="button"
            onClick={() => setShowShiftModal(true)}
            className="py-1 px-2.5 bg-[#181818] border border-white/10 text-white hover:border-brand-gold hover:text-brand-gold rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer flex items-center gap-1"
          >
            ⏱️ Shift Clock
          </button>

          {/* EOD Z-Read Audit */}
          {loginRole === 'admin' && (
            <button
              type="button"
              onClick={() => setShowZReadModal(true)}
              className="py-1 px-2.5 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-black rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer flex items-center gap-1"
            >
              📋 EOD Z-Read
            </button>
          )}

          {loginRole === 'admin' && (
            <div className="hidden sm:flex items-center gap-2">
              {onResetToDemo && (
                <button
                  type="button"
                  onClick={onResetToDemo}
                  className="py-1 px-2.5 bg-brand-gold/5 border border-brand-gold/25 text-brand-gold hover:bg-brand-gold hover:text-black rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer"
                  title="Reset stock levels to demo defaults"
                >
                  Reset Stock
                </button>
              )}
              {onClearAllData && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="py-1 px-2.5 bg-brand-red/10 border border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white rounded-lg font-black uppercase text-[9px] tracking-wider transition-all cursor-pointer"
                  title="Clear transaction history"
                >
                  Clear Sales
                </button>
              )}
            </div>
          )}
          
          <div className="h-6 w-[1px] bg-white/5 hidden sm:block" />

          <span className="text-[10px] bg-white/5 text-gray-400 font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
            {loginRole === 'admin' ? 'Manager' : 'Kitchen'}
          </span>
        </div>
      </header>
    );
  };

  const renderMetrics = () => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Card 1: Total Revenue */}
        <div className="bg-[#181818] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3 shadow-xl">
          <div className="p-2.5 rounded-xl bg-brand-gold/10 text-brand-gold flex-shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block truncate">Total Revenue</span>
            <h4 className="text-white font-display font-extrabold text-xs md:text-sm truncate">
              ₱{stats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h4>
          </div>
        </div>

        {/* Card 2: Today's Revenue */}
        <div className="bg-[#181818] border border-emerald-500/20 bg-emerald-500/[0.02] rounded-2xl p-3.5 flex items-center gap-3 shadow-xl">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 flex-shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-emerald-400 uppercase tracking-wider font-bold block truncate">
              📅 Today's Revenue
            </span>
            <h4 className="text-white font-display font-extrabold text-xs md:text-sm truncate">
              ₱{stats.todaySales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h4>
          </div>
        </div>

        {/* Card 3: Today's Total Orders */}
        <div className="bg-[#181818] border border-blue-500/20 bg-blue-500/[0.02] rounded-2xl p-3.5 flex items-center gap-3 shadow-xl">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 flex-shrink-0">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-blue-400 uppercase tracking-wider font-bold block truncate">
              🛍️ Today's Orders
            </span>
            <h4 className="text-white font-display font-extrabold text-xs md:text-sm truncate">
              {stats.todayOrdersCount} Orders
            </h4>
          </div>
        </div>

        {/* Card 4: Active Prep */}
        <div className="bg-[#181818] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3 shadow-xl">
          <div className="p-2.5 rounded-xl bg-brand-red/10 text-brand-red animate-pulse-slow flex-shrink-0">
            <ChefHat className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block truncate">Cooking / Active</span>
            <h4 className="text-white font-display font-extrabold text-xs md:text-sm truncate">
              {stats.activeCount} Orders
            </h4>
          </div>
        </div>

        {/* Card 5: Delivered Today */}
        <div className="bg-[#181818] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3 shadow-xl">
          <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400 flex-shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block truncate">Delivered Today</span>
            <h4 className="text-white font-display font-extrabold text-xs md:text-sm truncate">
              {stats.todayCompletedCount} <span className="text-[9px] text-gray-500 font-normal">({stats.completedCount} total)</span>
            </h4>
          </div>
        </div>

        {/* Card 6: Cancelled Today */}
        <div className="bg-[#181818] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3 shadow-xl">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 flex-shrink-0">
            <Ban className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block truncate">Cancelled Today</span>
            <h4 className="text-white font-display font-extrabold text-xs md:text-sm truncate">
              {stats.todayCancelledCount} <span className="text-[9px] text-gray-500 font-normal">({stats.cancelledCount} total)</span>
            </h4>
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryScreen = () => {
    const isSameDay = (d1Str: string, d2Date: Date) => {
      const d1 = new Date(d1Str);
      return (
        d1.getFullYear() === d2Date.getFullYear() &&
        d1.getMonth() === d2Date.getMonth() &&
        d1.getDate() === d2Date.getDate()
      );
    };

    const filteredArchiveOrders = orders.filter((order) => {
      // 1. Period filter
      if (archivePeriod === 'today') {
        if (!isTodayOrder(order.timestamp)) return false;
      } else if (archivePeriod === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (!isSameDay(order.timestamp, yesterday)) return false;
      } else if (archivePeriod === 'week') {
        const d = new Date(order.timestamp).getTime();
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (d < cutoff) return false;
      } else if (archivePeriod === 'month') {
        const d = new Date(order.timestamp);
        const now = new Date();
        if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
      }

      // 2. Status filter
      if (archiveStatusFilter !== 'all') {
        if (order.status !== archiveStatusFilter) return false;
      }

      // 3. Search query filter
      if (archiveSearchQuery.trim()) {
        const q = archiveSearchQuery.toLowerCase();
        const matchId = order.id.toLowerCase().includes(q);
        const matchCustomer = order.customer.name.toLowerCase().includes(q) || order.customer.phone.includes(q);
        const matchItem = order.items.some((i) => i.menuItem.name.toLowerCase().includes(q));
        if (!matchId && !matchCustomer && !matchItem) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const archiveTotalSales = filteredArchiveOrders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const archiveDeliveredCount = filteredArchiveOrders.filter((o) => o.status === 'delivered').length;
    const archiveCancelledCount = filteredArchiveOrders.filter((o) => o.status === 'cancelled').length;
    const archiveAvgValue = archiveDeliveredCount > 0 ? archiveTotalSales / archiveDeliveredCount : 0;

    return (
      <div className="space-y-6 text-left animate-fade-in">
        {/* Full Screen Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121211] border border-white/5 p-6 rounded-[2rem] shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-brand-gold/10 text-brand-gold font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-wider border border-brand-gold/20 flex items-center gap-1">
                📜 Sales & Order Vault
              </span>
              <span className="text-xs text-gray-400 font-bold">Historical Archive & Inspection</span>
            </div>
            <h2 className="font-display font-black text-white text-xl md:text-2xl mt-1.5 flex items-center gap-2">
              Order History & Sales Archive
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Inspect historical customer receipts, view payment breakdown, and search past order logs
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setChefTab('orders');
                if (loginRole === 'admin') navigate('/portal/admin');
                else navigate('/portal/kitchen');
              }}
              className="px-4 py-2 rounded-xl bg-brand-gold hover:opacity-90 text-black text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              ← Back to Active Order Queue
            </button>
          </div>
        </div>

        {/* Filter Bar & Metrics */}
        <div className="bg-[#121211] border border-white/5 p-5 rounded-[2rem] shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Period Filters */}
            <div className="flex items-center gap-1 bg-[#0D0D0C] p-1.5 rounded-2xl border border-white/10 w-full lg:w-auto overflow-x-auto">
              {(['all', 'today', 'yesterday', 'week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setArchivePeriod(p)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    archivePeriod === p
                      ? 'bg-brand-gold text-black shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {p === 'all' ? 'All Time' : p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === 'week' ? 'Last 7 Days' : 'This Month'}
                </button>
              ))}
            </div>

            {/* Status & Search */}
            <div className="flex items-center gap-3 w-full lg:w-auto flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search Order #, Customer, Phone, or Dish Item..."
                  value={archiveSearchQuery}
                  onChange={(e) => setArchiveSearchQuery(e.target.value)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold font-medium"
                />
                {archiveSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setArchiveSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <select
                value={archiveStatusFilter}
                onChange={(e) => setArchiveStatusFilter(e.target.value as any)}
                className="bg-[#0D0D0C] border border-white/10 text-brand-gold font-bold text-xs rounded-2xl px-4 py-2.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Completed Only</option>
                <option value="cancelled">Cancelled Only</option>
              </select>
            </div>

          </div>

          {/* Metric Summary Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-white/5">
            <div className="bg-[#0D0D0C] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Archived Gross Sales</span>
                <span className="font-mono text-emerald-400 font-black text-base md:text-lg">₱{archiveTotalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <span className="text-xl">💰</span>
            </div>

            <div className="bg-[#0D0D0C] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Delivered Orders</span>
                <span className="font-mono text-brand-gold font-black text-base md:text-lg">{archiveDeliveredCount} Orders</span>
              </div>
              <span className="text-xl">✅</span>
            </div>

            <div className="bg-[#0D0D0C] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Cancelled Orders</span>
                <span className="font-mono text-brand-red font-black text-base md:text-lg">{archiveCancelledCount} Orders</span>
              </div>
              <span className="text-xl">🚫</span>
            </div>

            <div className="bg-[#0D0D0C] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Avg Order Value (AOV)</span>
                <span className="font-mono text-blue-400 font-black text-base md:text-lg">₱{archiveAvgValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <span className="text-xl">📊</span>
            </div>
          </div>
        </div>

        {/* Full Width Archive List Feed */}
        <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-display font-black text-white text-base flex items-center gap-2">
              📜 Archived Transactions ({filteredArchiveOrders.length})
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">
              Showing {filteredArchiveOrders.length} matching order records
            </span>
          </div>

          {filteredArchiveOrders.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-xs font-semibold uppercase tracking-wider leading-relaxed">
              💤 No historical orders found matching filter criteria.<br/>
              <span className="text-[10px] text-gray-600 font-normal normal-case">Try selecting another time period or adjusting your search keyword</span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArchiveOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#0D0D0C] border border-white/5 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-brand-gold/30 transition-all shadow-md"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-black text-white text-sm">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className="text-gray-500 text-xs font-mono">
                        📅 {new Date(order.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        order.status === 'delivered' ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                        order.status === 'cancelled' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-brand-gold/15 text-brand-gold border border-brand-gold/20'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-300 flex items-center gap-2 flex-wrap">
                      <span><strong>Customer:</strong> {order.customer.name} ({order.customer.phone})</span>
                      <span className="text-white/20">•</span>
                      <span className="capitalize font-bold text-white">
                        {order.customer.orderType === 'delivery' ? '🛵 Delivery' : `🛍️ Pickup ${order.customer.tableNumber ? `(Table ${order.customer.tableNumber})` : ''}`}
                      </span>
                      {order.customer.orderType === 'pickup' && order.customer.pickupTime && (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          ⏰ {order.customer.pickupTime}
                        </span>
                      )}
                      {order.customer.orderType === 'delivery' && order.customer.deliveryTime && (
                        <span className="text-[10px] font-bold text-red-300 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                          ⏰ {order.customer.deliveryTime}
                        </span>
                      )}
                      <span className="text-white/20">•</span>
                      <span className="uppercase text-[10px] font-bold text-gray-400">{order.paymentMethod}</span>
                    </div>

                    <div className="text-[11px] text-gray-400 flex flex-wrap gap-1.5 pt-1">
                      {order.items.map((i) => (
                        <div key={i.id} className="bg-[#181818] border border-white/5 px-2.5 py-1 rounded-lg text-[10px]">
                          <div>
                            <strong className="text-brand-red font-bold">{i.quantity}x</strong> {i.menuItem.name}
                          </div>
                          {i.selectedOptions && i.selectedOptions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {i.selectedOptions.map((opt, optIdx) => (
                                <span key={optIdx} className={`text-[8.5px] px-1 py-0.2 rounded font-bold ${opt.choice.price > 0 ? 'text-amber-300' : 'text-gray-400'}`}>
                                  + {opt.choice.name} {opt.choice.price > 0 ? `(+₱${opt.choice.price.toFixed(2)})` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex sm:flex-row lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0 border-t lg:border-t-0 border-white/5 pt-3 lg:pt-0">
                    <span className="font-mono text-brand-gold font-extrabold text-base lg:text-lg">
                      ₱{order.totalAmount.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPrintingOrderType('customer');
                          setPrintingOrder(order);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#181818] hover:bg-[#222222] border border-white/10 hover:border-brand-gold text-brand-gold text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                        title="Print Receipt"
                      >
                        🖨️ Receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingOrderDetails(order)}
                        className="px-4 py-2 rounded-xl bg-[#181818] hover:bg-[#222222] border border-white/10 hover:border-brand-gold text-gray-300 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-gold" /> Inspect Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderOrders = () => {
    return (
      <div className="space-y-6">
        
        {/* Sub Header for Order View Layout selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121211] border border-white/5 p-4 rounded-[2rem] shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-sm uppercase tracking-wider text-white">
                📦 Order Command Queue
              </h3>
              <span className="text-[9px] bg-brand-gold/10 text-brand-gold px-2.5 py-0.5 rounded-full border border-brand-gold/20 font-bold">
                📅 Today's Board
              </span>
            </div>
            <p className="text-gray-400 text-[11px] mt-0.5">
              Accept incoming orders, monitor cooking prep, and manage fulfillment dispatching
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setChefTab('history');
                if (loginRole === 'admin') navigate('/portal/admin/history');
                else navigate('/portal/kitchen/history');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#181818] border border-white/10 hover:border-brand-gold text-brand-gold hover:text-white text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              📜 Order History Archive
            </button>

            <button
              type="button"
              onClick={() => {
                setPosCart([]);
                setPosCustomerName('');
                setPosCustomerPhone('');
                setPosTableNumber('');
                setPosDeliveryAddress('');
                setPosAmountTendered('');
                setPosPaymentMethod('cod');
                setPosOrderType('pickup');
                setPosOrderSource('walkin');
                setShowManualOrderModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-brand-red hover:bg-red-600 text-white text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-brand-red/20"
            >
              <Plus className="w-3.5 h-3.5" /> Manual POS Order
            </button>

            {onGenerateRandomOrder && (
              <button
                type="button"
                onClick={onGenerateRandomOrder}
                className="px-3.5 py-1.5 rounded-xl bg-brand-gold hover:opacity-90 text-black text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                ⚡ Generate Sample Order
              </button>
            )}

            <div className="flex items-center gap-1 bg-[#0D0D0C] p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setOrdersViewMode('kanban')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  ordersViewMode === 'kanban'
                    ? 'bg-brand-red text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🗂️ Kanban Board
              </button>
              <button
                type="button"
                onClick={() => setOrdersViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  ordersViewMode === 'list'
                    ? 'bg-brand-red text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📋 List Feed
              </button>
            </div>
          </div>
        </div>

        {ordersViewMode === 'kanban' ? (
          /* KANBAN BOARD LAYOUT */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* COLUMN 1: PENDING */}
            <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                  <h4 className="font-display font-black text-xs uppercase tracking-wider text-white">
                    Incoming Orders
                  </h4>
                </div>
                <span className="bg-brand-red/10 text-brand-red font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
                  {todayOrders.filter(o => o.status === 'pending').length}
                </span>
              </div>

              <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1 min-h-[300px]">
                {todayOrders.filter(o => o.status === 'pending').length === 0 ? (
                  <div className="text-center py-20 text-gray-500 text-xs font-semibold uppercase tracking-wider leading-relaxed">
                    💤 No pending orders<br/>
                    <span className="text-[10px] text-gray-600 font-normal normal-case">Waiting for customer checkouts...</span>
                  </div>
                ) : (
                  todayOrders.filter(o => o.status === 'pending').map(order => (
                    <KanbanCard key={order.id} order={order} />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: PREPARING */}
            <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
                  <h4 className="font-display font-black text-xs uppercase tracking-wider text-brand-gold">
                    Cooking Station
                  </h4>
                </div>
                <span className="bg-brand-gold/10 text-brand-gold font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
                  {todayOrders.filter(o => o.status === 'preparing').length}
                </span>
              </div>

              <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1 min-h-[300px]">
                {todayOrders.filter(o => o.status === 'preparing').length === 0 ? (
                  <div className="text-center py-20 text-gray-500 text-xs font-semibold uppercase tracking-wider leading-relaxed">
                    🍳 Kitchen is quiet<br/>
                    <span className="text-[10px] text-gray-600 font-normal normal-case">Accept pending orders to start cooking</span>
                  </div>
                ) : (
                  todayOrders.filter(o => o.status === 'preparing').map(order => (
                    <KanbanCard key={order.id} order={order} />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 3: DISPATCHED */}
            <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <h4 className="font-display font-black text-xs uppercase tracking-wider text-blue-400">
                    Dispatched / Ready
                  </h4>
                </div>
                <span className="bg-blue-500/10 text-blue-400 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
                  {todayOrders.filter(o => o.status === 'dispatched').length}
                </span>
              </div>

              <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1 min-h-[300px]">
                {todayOrders.filter(o => o.status === 'dispatched').length === 0 ? (
                  <div className="text-center py-20 text-gray-500 text-xs font-semibold uppercase tracking-wider leading-relaxed">
                    🛵 No dispatched orders<br/>
                    <span className="text-[10px] text-gray-600 font-normal normal-case">Dispatch orders when food is cooked</span>
                  </div>
                ) : (
                  todayOrders.filter(o => o.status === 'dispatched').map(order => (
                    <KanbanCard key={order.id} order={order} />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 4: COMPLETED TODAY */}
            <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <h4 className="font-display font-black text-xs uppercase tracking-wider text-green-400">
                    Completed Today
                  </h4>
                </div>
                <span className="bg-green-500/10 text-green-400 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
                  {todayOrders.filter(o => o.status === 'delivered').length}
                </span>
              </div>

              <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1 min-h-[300px]">
                {todayOrders.filter(o => o.status === 'delivered').length === 0 ? (
                  <div className="text-center py-20 text-gray-500 text-xs font-semibold uppercase tracking-wider leading-relaxed">
                    🎉 No completed orders today<br/>
                    <span className="text-[10px] text-gray-600 font-normal normal-case">Delivered orders will appear here</span>
                  </div>
                ) : (
                  todayOrders.filter(o => o.status === 'delivered')
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 15)
                    .map(order => (
                      <KanbanCard key={order.id} order={order} />
                    ))
                )}
              </div>
            </div>

          </div>
        ) : (
          /* ORIGINAL LIST FEED SPLIT LAYOUT */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COMPARTMENT: Active Orders list (8 cols) */}
            <div className="xl:col-span-8 space-y-6">
              
              <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-4">
                
                {/* List header filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-white/5 pb-3">
                  <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                    📦 Order Queue ({filteredOrders.length})
                  </h3>
                  
                  <div className="flex items-center gap-1 bg-[#0D0D0C] p-1 rounded-full border-2 border-white/5">
                    <button
                      onClick={() => setFilterStatus('active')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                        filterStatus === 'active'
                          ? 'bg-brand-red text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Active Queue
                    </button>
                    <button
                      onClick={() => setFilterStatus('completed')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                        filterStatus === 'completed'
                          ? 'bg-brand-red text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Past Orders
                    </button>
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                        filterStatus === 'all'
                          ? 'bg-brand-red text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>

                {/* Orders Feed */}
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-16 text-gray-500 text-xs font-medium">
                    💤 No orders found in this category queue.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[680px] overflow-y-auto pr-1">
                    {filteredOrders.map((order) => {
                      const isActive = order.status === 'pending' || order.status === 'preparing' || order.status === 'dispatched';
                      
                      return (
                        <div 
                          key={order.id} 
                          className={`p-5 rounded-[1.75rem] border-2 transition-all relative ${
                            isActive 
                              ? 'bg-[#121211] border-white/10 hover:border-brand-gold shadow-md' 
                              : 'bg-[#0F0F0E] border-white/5 opacity-70 hover:opacity-100'
                          }`}
                        >
                          {/* Top metadata line */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b-2 border-white/5 mb-3 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-bold text-white text-sm">
                                Order #{order.id.slice(0, 8)}
                              </span>
                              <span className="text-white/10">|</span>
                              <span className="text-gray-500 font-mono">
                                {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md tracking-wider ${
                                order.status === 'pending'
                                  ? 'bg-brand-red text-white animate-pulse-slow'
                                  : order.status === 'preparing'
                                  ? 'bg-brand-gold text-black'
                                  : order.status === 'dispatched'
                                  ? 'bg-blue-600 text-white'
                                  : order.status === 'delivered'
                                  ? 'bg-green-600/15 text-green-400 border border-green-500/20'
                                  : 'bg-red-600/15 text-red-500 border border-red-500/20'
                              }`}>
                                {order.status}
                              </span>

                              <button
                                type="button"
                                onClick={() => setViewingOrderDetails(order)}
                                className="p-1.5 rounded bg-[#181818] hover:bg-[#222222] border border-white/5 text-gray-400 hover:text-brand-red transition-all cursor-pointer"
                                title="Inspect Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Mid Details section */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold flex flex-wrap gap-x-2 gap-y-1.5">
                                {order.items.map((item) => {
                                  const isVerified = order.confirmedItemIds?.includes(item.id);
                                  const isCooked = order.cookedItemIds?.includes(item.id);
                                  const isStarted = order.startedItemIds?.includes(item.id);
                                  const canToggle = order.status === 'preparing';

                                  return (
                                    <div key={item.id} className={`px-2.5 py-1 rounded-lg border-2 flex items-center gap-1.5 ${
                                      isVerified 
                                        ? 'bg-green-500/5 border-green-500/20 text-green-400' 
                                        : isCooked
                                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                        : isStarted
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                        : 'bg-[#181818] border-white/5 text-white'
                                    }`}>
                                      <div>
                                        <span className={isCooked ? 'line-through text-gray-400' : ''}>
                                          <strong className="text-brand-red mr-1">{item.quantity}x</strong> {item.menuItem.name}
                                        </span>
                                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-0.5">
                                            {item.selectedOptions.map((opt, optIdx) => (
                                              <span key={optIdx} className={`text-[8.5px] px-1 py-0.2 rounded font-bold ${opt.choice.price > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-gray-300'}`}>
                                                + {opt.choice.name} {opt.choice.price > 0 ? `(+₱${opt.choice.price.toFixed(2)})` : ''}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {canToggle && !isCooked && !isStarted && onStartItemCooking && (
                                        <button
                                          type="button"
                                          onClick={() => onStartItemCooking(order.id, item.id)}
                                          className="px-1.5 py-0.5 rounded bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer border border-brand-gold/20"
                                        >
                                          ▶️ Prep
                                        </button>
                                      )}
                                      
                                      {canToggle && (
                                        <button
                                          type="button"
                                          onClick={() => onToggleItemCooked?.(order.id, item.id)}
                                          className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                                            isCooked
                                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                              : 'bg-black/30 text-gray-400 hover:text-white border-white/10'
                                          }`}
                                        >
                                          {isCooked ? '✓ Cooked' : 'Done?'}
                                        </button>
                                      )}
                                      {isVerified && <span className="text-[8px] bg-green-500/10 px-1 py-0.5 rounded font-black uppercase text-green-400">✓ Received</span>}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Customer confirmation summary badge */}
                              {order.confirmedItemIds && order.confirmedItemIds.length > 0 && (
                                <div className={`mt-3 p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2 border ${
                                  order.confirmedItemIds.length === order.items.length
                                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                    : 'bg-brand-gold/10 border-brand-gold/20 text-brand-gold'
                                }`}>
                                  <span className="text-sm">👥</span>
                                  <div>
                                    <span className="uppercase tracking-wide font-extrabold block">Customer Item Checklist Verification:</span>
                                    <span className="font-normal">{order.confirmedItemIds.length === order.items.length ? '100% Complete — All items confirmed received by customer. No missing items reported.' : `${order.confirmedItemIds.length} of ${order.items.length} items verified received.`}</span>
                                  </div>
                                </div>
                              )}

                              <div className="mt-3 text-xs text-gray-300 leading-relaxed font-normal flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="space-y-1.5 flex-1">
                                  <div>
                                    <strong>Recipient:</strong> {order.customer.name} ({order.customer.phone}) <br />
                                    <strong>Type:</strong> <span className="capitalize font-bold text-white">{order.customer.orderType}</span>
                                    {order.orderSource && order.orderSource !== 'online' && (
                                      <> • <strong>Channel:</strong> <span className="font-bold text-amber-400 capitalize">{order.orderSource === 'walkin' ? 'Walk-In' : 'Messenger'}</span></>
                                    )}
                                    {' '}• <strong>Payment:</strong> <span className="uppercase font-bold text-brand-gold">{order.paymentMethod === 'cod' ? '💵 COD' : order.paymentMethod}</span>
                                    {order.changeAmount !== undefined && order.changeAmount > 0 && (
                                      <> • <strong className="text-amber-400">Change:</strong> <span className="font-mono font-bold text-amber-300">₱{order.changeAmount.toFixed(2)}</span> (Paid: ₱{order.amountTendered?.toFixed(2)})</>
                                    )}
                                  </div>

                                  {/* GPS Info in List view */}
                                  {order.customer.latitude && order.customer.longitude && (
                                    <div className="inline-flex items-center gap-2 text-[10px] bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-0.5 px-2">
                                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                        <Navigation className="w-3 h-3 text-emerald-400" />
                                        GPS Location Attached
                                      </span>
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${order.customer.latitude},${order.customer.longitude}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-brand-gold font-bold underline hover:text-white"
                                      >
                                        Map ↗
                                      </a>
                                    </div>
                                  )}

                                  {/* COD Call & Verification Controls in List view */}
                                  {order.paymentMethod === 'cod' && (
                                    <div className="flex items-center gap-2 flex-wrap pt-1">
                                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                        order.confirmationCallStatus === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                        order.confirmationCallStatus === 'unreachable' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                        order.confirmationCallStatus === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                        'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                                      }`}>
                                        {order.confirmationCallStatus === 'confirmed' ? '✓ Call Confirmed' :
                                         order.confirmationCallStatus === 'unreachable' ? '📵 Unreachable' :
                                         order.confirmationCallStatus === 'rejected' ? '🚫 Bogus' :
                                         '⚠️ Call Pending'}
                                      </span>

                                      <a
                                        href={`tel:${order.customer.phone}`}
                                        className="px-2 py-0.5 rounded bg-black/40 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-1"
                                      >
                                        <PhoneCall className="w-2.5 h-2.5" /> Call
                                      </a>
                                      <a
                                        href={`sms:${order.customer.phone}?body=Hi ${encodeURIComponent(order.customer.name)}, Curvada's Kitchen received your COD order #${order.id.slice(0, 8)}. Please confirm!`}
                                        className="px-2 py-0.5 rounded bg-black/40 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[9px] font-bold flex items-center gap-1"
                                      >
                                        <MessageSquare className="w-2.5 h-2.5" /> SMS
                                      </a>

                                      {onUpdateConfirmationCallStatus && (
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => onUpdateConfirmationCallStatus(order.id, 'confirmed', false)}
                                            className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 cursor-pointer"
                                          >
                                            ✓ Confirm
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => onUpdateConfirmationCallStatus(order.id, 'unreachable')}
                                            className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-orange-500/15 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 cursor-pointer"
                                          >
                                            📵 No Answer
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (confirm('Flag this order as Fake/Bogus?')) {
                                                onUpdateConfirmationCallStatus(order.id, 'rejected', true);
                                              }
                                            }}
                                            className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 cursor-pointer"
                                          >
                                            🚫 Bogus
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1.5 text-[9px] flex-shrink-0">
                                  <span className="text-gray-500 font-bold uppercase">Chef:</span>
                                  {onSetCookedBy ? (
                                    <input
                                      type="text"
                                      placeholder="Assign..."
                                      defaultValue={order.cookedBy || ''}
                                      onBlur={(e) => onSetCookedBy(order.id, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          onSetCookedBy(order.id, (e.target as HTMLInputElement).value);
                                        }
                                      }}
                                      className="bg-[#0D0D0C] border border-white/10 rounded px-2 py-0.5 text-[9px] text-white focus:outline-none focus:border-brand-gold w-24 font-semibold"
                                    />
                                  ) : (
                                    <span className="font-bold text-brand-gold">{order.cookedBy || 'Kitchen Team'}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Trigger Buttons based on Current Status */}
                            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end justify-start">
                              {order.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateOrderStatus(order.id, 'preparing')}
                                    className="py-2 px-4 rounded-xl bg-brand-gold hover:opacity-90 text-black font-black uppercase tracking-wider text-[10px] shadow-lg shadow-brand-gold/5 cursor-pointer"
                                  >
                                    👨‍🍳 Accept & Prep
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm('Cancel this order?')) {
                                        onUpdateOrderStatus(order.id, 'cancelled');
                                      }
                                    }}
                                    className="py-2 px-3 rounded-xl border border-brand-red/30 text-brand-red font-bold uppercase tracking-wider text-[10px] hover:bg-brand-red/5 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                              
                              {order.status === 'preparing' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateOrderStatus(order.id, 'dispatched')}
                                    className="py-2 px-4 rounded-xl bg-brand-red hover:opacity-90 text-white font-black uppercase tracking-wider text-[10px] shadow-lg shadow-brand-red/10 cursor-pointer"
                                  >
                                    🛵 Dispatch Order
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateOrderStatus(order.id, 'pending', '', 0)}
                                    className="py-1 px-3 rounded-xl border border-white/10 bg-black/25 text-gray-400 hover:text-white font-bold uppercase tracking-wider text-[9px] cursor-pointer"
                                  >
                                    ← Back to Prep
                                  </button>
                                </>
                              )}

                              {order.status === 'dispatched' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                                    className="py-2 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-wider text-[10px] shadow-lg shadow-green-500/10 cursor-pointer"
                                  >
                                    ✓ Mark Completed
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateOrderStatus(order.id, 'preparing')}
                                    className="py-1 px-3 rounded-xl border border-brand-gold/30 text-brand-gold font-bold uppercase tracking-wider text-[9px] hover:bg-brand-gold/5 cursor-pointer"
                                  >
                                    ← Back to Cooking
                                  </button>
                                </>
                              )}

                              {order.status === 'delivered' && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateOrderStatus(order.id, 'dispatched')}
                                  className="py-2 px-4 rounded-xl border border-blue-500/30 hover:bg-blue-500/5 text-blue-450 font-bold uppercase tracking-wider text-[10px] cursor-pointer"
                                >
                                  ← Back to Ready
                                </button>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </div>

            {/* RIGHT COMPARTMENT: Analytics & Performance metrics (4 cols) */}
            <div className="xl:col-span-4 space-y-6">
              
              {/* Real-time Insights card */}
              <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-4">
                <h3 className="font-display font-bold text-white text-base flex items-center gap-2 pb-2.5 border-b-2 border-white/5 font-black">
                  📈 KDS Performance Metrics
                </h3>
                
                <div className="space-y-4 text-xs">
                  <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Avg Prep Time</span>
                      <span className="text-white font-bold font-mono">14.5 Minutes</span>
                    </div>
                    <span className="text-xl">⏱️</span>
                  </div>

                  <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Order Dispatch Pace</span>
                      <span className="text-white font-bold font-mono">4.2 orders / hr</span>
                    </div>
                    <span className="text-xl">⚡</span>
                  </div>

                  {/* Quick transaction summary statistics list */}
                  <div className="border border-white/5 rounded-2xl p-4 space-y-2.5">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block">Daily Transactions Summary</span>
                    
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-400">Total Active cooking:</span>
                      <span className="text-brand-gold font-mono">{stats.activeCount} orders</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-400">Total Completed/Delivered:</span>
                      <span className="text-green-400 font-mono">{stats.completedCount} orders</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-400">Total Cancelled/Failed:</span>
                      <span className="text-brand-red font-mono">{stats.cancelledCount} orders</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulated Customer Experience stats */}
              <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-4">
                <h3 className="font-display font-bold text-white text-base flex items-center gap-2 pb-2.5 border-b-2 border-white/5 font-black">
                  ⭐ Customer Satisfaction
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-display font-extrabold text-brand-gold">4.9</div>
                    <div>
                      <div className="flex text-brand-gold text-sm">★★★★★</div>
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block">Based on 148 ratings</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block">Top Positive Feedback:</span>
                    {orders.filter(o => o.status === 'delivered').slice(0, 2).map((o, idx) => {
                      const feedbackList = [
                        "Garlic fried rice was very aromatic and beef tapa was cooked perfectly tender. Highly recommended!",
                        "Fast delivery, food arrived hot and secure. GCash payment was seamless. Will order again!",
                      ];
                      return (
                        <div key={idx} className="bg-black/30 border border-white/5 p-3 rounded-xl">
                          <p className="text-gray-300 font-normal leading-relaxed italic">
                            "{feedbackList[idx] || feedbackList[0]}"
                          </p>
                          <span className="text-[9px] text-gray-500 font-bold block mt-1.5 text-right">— Customer order review</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COMPARTMENT: Sidebar Stock Control Panel Quick Toggle (4 cols) */}
            <div className="xl:col-span-4 bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-4">
              <div className="border-b-2 border-white/5 pb-3">
                <h3 className="font-display font-bold text-white text-base">
                  🗃️ Storefront Inventory Toggle
                </h3>
                <p className="text-gray-400 text-xs font-normal">Quickly flag menu dishes as Sold Out / In Stock</p>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {menuItems.map((item) => {
                  const qty = stockLevels[item.id] ?? 0;
                  const isUnavailable = unavailableItemIds.includes(item.id) || qty <= 0;

                  return (
                    <div 
                      key={item.id} 
                      className="p-3 rounded-xl bg-[#0D0D0C] border-2 border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-10 h-10 object-cover rounded-xl flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <span className="text-white text-xs font-bold block truncate leading-tight">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider capitalize">{item.category} • {qty} Left</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleItemAvailability(item.id)}
                        className="focus:outline-none p-1 transition-all"
                        title={isUnavailable ? 'Mark as Available' : 'Mark as Sold Out'}
                      >
                        {isUnavailable ? (
                          <div className="flex items-center gap-1 text-[10px] text-brand-red font-bold uppercase tracking-wider bg-brand-red/10 px-2.5 py-1 rounded-lg">
                            Sold Out
                            <ToggleLeft className="w-6 h-6 text-brand-red flex-shrink-0" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase tracking-wider bg-green-500/10 px-2.5 py-1 rounded-lg">
                            In Stock
                            <ToggleRight className="w-6 h-6 text-green-400 flex-shrink-0" />
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>
    );
  };


  // Order Queue search & status filters
  const [filterStatus, setFilterStatus] = useState<'active' | 'completed' | 'all'>('active');
  const [viewingOrderDetails, setViewingOrderDetails] = useState<Order | null>(null);

  // Order History Archive State
  const [archivePeriod, setArchivePeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('all');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveStatusFilter, setArchiveStatusFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');

  // Stock View state
  const [stockViewMode, setStockViewMode] = useState<'ingredients' | 'recipes'>('ingredients');
  const [forecastMode, setForecastMode] = useState<'real' | 'projection'>('real');
  const [salesPace, setSalesPace] = useState<number>(30); // expected orders per day
  const [forecastPeriodDays, setForecastPeriodDays] = useState<number>(7); // 7 for week, 1 for day
  const [prepQuantities, setPrepQuantities] = useState<Record<string, number>>({});

  // Shopping list / custom restocks buy list
  const [restockBuyList, setRestockBuyList] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem('curvada_restock_buy_list');
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  });

  const saveRestockBuyList = (newList: Record<string, number>) => {
    setRestockBuyList(newList);
    localStorage.setItem('curvada_restock_buy_list', JSON.stringify(newList));
  };

  const [checkedBuyItems, setCheckedBuyItems] = useState<Record<string, boolean>>(() => {
    try {
      const cached = localStorage.getItem('curvada_checked_buy_items');
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  });

  const saveCheckedBuyItems = (newChecked: Record<string, boolean>) => {
    setCheckedBuyItems(newChecked);
    localStorage.setItem('curvada_checked_buy_items', JSON.stringify(newChecked));
  };
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientQuantity, setNewIngredientQuantity] = useState<number | ''>(100);
  const [newIngredientUnit, setNewIngredientUnit] = useState('g');
  const [newIngredientLowStock, setNewIngredientLowStock] = useState<number | ''>(20);
  const [newIngredientCostPerUnit, setNewIngredientCostPerUnit] = useState<number | ''>(0.05);

  const [newIngredientPacksCount, setNewIngredientPacksCount] = useState<string>('1');
  const [newIngredientPackSize, setNewIngredientPackSize] = useState<string>('');
  const [newIngredientPackCost, setNewIngredientPackCost] = useState<string>('');

  const handleNewPackSizeChange = (val: string) => {
    setNewIngredientPackSize(val);
    const size = Number(val);
    const cost = Number(newIngredientPackCost);
    if (size > 0 && cost > 0) {
      setNewIngredientCostPerUnit(Number((cost / size).toFixed(2)));
    }
  };
  const handleNewPackCostChange = (val: string) => {
    setNewIngredientPackCost(val);
    const size = Number(newIngredientPackSize);
    const cost = Number(val);
    if (size > 0 && cost > 0) {
      setNewIngredientCostPerUnit(Number((cost / size).toFixed(2)));
    }
  };
  const handleApplyNewBulkPackCalculation = () => {
    const count = Number(newIngredientPacksCount) || (Number(newIngredientQuantity) > 0 ? Number(newIngredientQuantity) : 1);
    const size = Number(newIngredientPackSize);
    const cost = Number(newIngredientPackCost);
    if (size > 0) {
      const totalQty = count * size;
      setNewIngredientQuantity(totalQty);
      if (cost > 0) {
        setNewIngredientCostPerUnit(Number((cost / size).toFixed(2)));
      }
    }
  };
  const [ingredientsSubTab, setIngredientsSubTab] = useState<'control-board' | 'low-stock' | 'multi-recipe' | 'reports'>('control-board');
  const [reportsPeriodDays, setReportsPeriodDays] = useState<7 | 30>(7);
  
  // Financial Rates & Expenses States
  const [electricityBaseRate, setElectricityBaseRate] = useState<number>(250);
  const [electricityVariableRate, setElectricityVariableRate] = useState<number>(10);
  const [waterBaseRate, setWaterBaseRate] = useState<number>(80);
  const [rentBaseRate, setRentBaseRate] = useState<number>(500);
  const [laborBaseRate, setLaborBaseRate] = useState<number>(1200);
  const [gasBaseRate, setGasBaseRate] = useState<number>(200);
  const [otherBaseRate, setOtherBaseRate] = useState<number>(100);

  // Financial Target States
  const [targetSalesDay, setTargetSalesDay] = useState<number>(6000);
  const [targetSalesWeek, setTargetSalesWeek] = useState<number>(42000);
  const [targetSalesMonth, setTargetSalesMonth] = useState<number>(180000);
  const [targetSalesYear, setTargetSalesYear] = useState<number>(2160000);

  const [targetProfitDay, setTargetProfitDay] = useState<number>(2500);
  const [targetProfitWeek, setTargetProfitWeek] = useState<number>(17500);
  const [targetProfitMonth, setTargetProfitMonth] = useState<number>(75000);
  const [targetProfitYear, setTargetProfitYear] = useState<number>(900000);

  const [financesPeriod, setFinancesPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [expenseInputMode, setExpenseInputMode] = useState<'monthly' | 'daily'>('monthly');
  const [selectedFinancialMonth, setSelectedFinancialMonth] = useState<string>('all');

  const [isEditingRates, setIsEditingRates] = useState<boolean>(false);
  const [monthlyRatesMap, setMonthlyRatesMap] = useState<Record<string, {
    electricityBaseRate: number;
    electricityVariableRate: number;
    waterBaseRate: number;
    rentBaseRate: number;
    laborBaseRate: number;
    gasBaseRate: number;
    otherBaseRate: number;
  }>>(() => {
    try {
      const cached = localStorage.getItem('curvada_monthly_rates_map');
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  });

  // Automatically update active operating rates when selected month changes
  useEffect(() => {
    const targetKey = selectedFinancialMonth === 'all' ? 'default' : selectedFinancialMonth;
    if (monthlyRatesMap[targetKey]) {
      const saved = monthlyRatesMap[targetKey];
      setElectricityBaseRate(saved.electricityBaseRate);
      setElectricityVariableRate(saved.electricityVariableRate);
      setWaterBaseRate(saved.waterBaseRate);
      setRentBaseRate(saved.rentBaseRate);
      setLaborBaseRate(saved.laborBaseRate);
      setGasBaseRate(saved.gasBaseRate);
      setOtherBaseRate(saved.otherBaseRate);
    }
    setIsEditingRates(false);
  }, [selectedFinancialMonth]);

  const handleSaveMonthlyRates = () => {
    const currentRates = {
      electricityBaseRate,
      electricityVariableRate,
      waterBaseRate,
      rentBaseRate,
      laborBaseRate,
      gasBaseRate,
      otherBaseRate
    };
    const targetKey = selectedFinancialMonth === 'all' ? 'default' : selectedFinancialMonth;
    const updatedMap = {
      ...monthlyRatesMap,
      [targetKey]: currentRates
    };
    setMonthlyRatesMap(updatedMap);
    localStorage.setItem('curvada_monthly_rates_map', JSON.stringify(updatedMap));

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { monthlyRatesMap: updatedMap } })
    }).catch(err => console.error("Failed to sync monthly rates map", err));

    setIsEditingRates(false);
  };

  const availableMonthsOptions = React.useMemo(() => {
    const monthsSet = new Set<string>();
    const now = new Date();
    // Include past 12 calendar months starting from current month
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearStr = d.getFullYear();
      const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
      monthsSet.add(`${yearStr}-${monthStr}`);
    }
    // Also scan order timestamps for any existing order months
    orders.forEach(o => {
      if (o.timestamp) {
        const d = new Date(o.timestamp);
        if (!isNaN(d.getTime())) {
          const yearStr = d.getFullYear();
          const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
          monthsSet.add(`${yearStr}-${monthStr}`);
        }
      }
    });
    const sorted = Array.from(monthsSet).sort().reverse();
    return sorted.map(yMonth => {
      const [y, m] = yMonth.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, 1);
      const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      return { value: yMonth, label };
    });
  }, [orders]);

  const hasLoadedRef = React.useRef(false);

  // Load initial settings on mount
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/db');
        if (!res.ok) throw new Error('API failed');
        const data = await res.json();
        if (data.settings) {
          hasLoadedRef.current = false;
          if (data.settings.electricityBaseRate !== undefined) setElectricityBaseRate(data.settings.electricityBaseRate);
          if (data.settings.electricityVariableRate !== undefined) setElectricityVariableRate(data.settings.electricityVariableRate);
          if (data.settings.waterBaseRate !== undefined) setWaterBaseRate(data.settings.waterBaseRate);
          if (data.settings.rentBaseRate !== undefined) setRentBaseRate(data.settings.rentBaseRate);
          if (data.settings.laborBaseRate !== undefined) setLaborBaseRate(data.settings.laborBaseRate);
          if (data.settings.gasBaseRate !== undefined) setGasBaseRate(data.settings.gasBaseRate);
          if (data.settings.otherBaseRate !== undefined) setOtherBaseRate(data.settings.otherBaseRate);
          if (data.settings.targetSalesDay !== undefined) setTargetSalesDay(data.settings.targetSalesDay);
          if (data.settings.targetSalesWeek !== undefined) setTargetSalesWeek(data.settings.targetSalesWeek);
          if (data.settings.targetSalesMonth !== undefined) setTargetSalesMonth(data.settings.targetSalesMonth);
          if (data.settings.targetSalesYear !== undefined) setTargetSalesYear(data.settings.targetSalesYear);
          if (data.settings.targetProfitDay !== undefined) setTargetProfitDay(data.settings.targetProfitDay);
          if (data.settings.targetProfitWeek !== undefined) setTargetProfitWeek(data.settings.targetProfitWeek);
          if (data.settings.targetProfitMonth !== undefined) setTargetProfitMonth(data.settings.targetProfitMonth);
          if (data.settings.targetProfitYear !== undefined) setTargetProfitYear(data.settings.targetProfitYear);
          if (data.settings.salesPace !== undefined) setSalesPace(data.settings.salesPace);
          if (data.settings.financesPeriod !== undefined) setFinancesPeriod(data.settings.financesPeriod);
          if (data.settings.expenseInputMode !== undefined) setExpenseInputMode(data.settings.expenseInputMode);
          if (data.settings.monthlyRatesMap) {
            setMonthlyRatesMap(data.settings.monthlyRatesMap);
            localStorage.setItem('curvada_monthly_rates_map', JSON.stringify(data.settings.monthlyRatesMap));
          }
        }
        setTimeout(() => {
          hasLoadedRef.current = true;
        }, 100);
      } catch (e) {
        console.error("Failed to load settings from server", e);
        hasLoadedRef.current = true;
      }
    };
    loadSettings();
  }, []);

  // Debounced settings synchronization
  React.useEffect(() => {
    if (!hasLoadedRef.current) return;

    const timer = setTimeout(() => {
      const settingsPayload = {
        electricityBaseRate,
        electricityVariableRate,
        waterBaseRate,
        rentBaseRate,
        laborBaseRate,
        gasBaseRate,
        otherBaseRate,
        targetSalesDay,
        targetSalesWeek,
        targetSalesMonth,
        targetSalesYear,
        targetProfitDay,
        targetProfitWeek,
        targetProfitMonth,
        targetProfitYear,
        salesPace,
        financesPeriod,
        expenseInputMode,
        monthlyRatesMap
      };
      
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsPayload })
      }).catch(err => console.error("Failed to sync settings to server", err));
    }, 800);

    return () => clearTimeout(timer);
  }, [
    electricityBaseRate,
    electricityVariableRate,
    waterBaseRate,
    rentBaseRate,
    laborBaseRate,
    gasBaseRate,
    otherBaseRate,
    targetSalesDay,
    targetSalesWeek,
    targetSalesMonth,
    targetSalesYear,
    targetProfitDay,
    targetProfitWeek,
    targetProfitMonth,
    targetProfitYear,
    salesPace,
    financesPeriod,
    expenseInputMode
  ]);

  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<Category | 'all'>('all');
  const [stockIngredientRecipeFilter, setStockIngredientRecipeFilter] = useState<string>('all');

  // Ingredient Edit state
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editIngredientName, setEditIngredientName] = useState('');
  const [editIngredientQuantity, setEditIngredientQuantity] = useState<number | ''>(0);
  const [editIngredientUnit, setEditIngredientUnit] = useState('g');
  const [editIngredientLowStock, setEditIngredientLowStock] = useState<number | ''>(0);
  const [editIngredientCostPerUnit, setEditIngredientCostPerUnit] = useState<number | ''>(0);

  const [editIngredientPacksCount, setEditIngredientPacksCount] = useState<string>('1');
  const [editIngredientPackSize, setEditIngredientPackSize] = useState<string>('');
  const [editIngredientPackCost, setEditIngredientPackCost] = useState<string>('');

  const handleEditPackSizeChange = (val: string) => {
    setEditIngredientPackSize(val);
    const size = Number(val);
    const cost = Number(editIngredientPackCost);
    if (size > 0 && cost > 0) {
      setEditIngredientCostPerUnit(Number((cost / size).toFixed(2)));
    }
  };
  const handleEditPackCostChange = (val: string) => {
    setEditIngredientPackCost(val);
    const size = Number(editIngredientPackSize);
    const cost = Number(val);
    if (size > 0 && cost > 0) {
      setEditIngredientCostPerUnit(Number((cost / size).toFixed(2)));
    }
  };
  const handleApplyEditBulkPackCalculation = () => {
    const count = Number(editIngredientPacksCount) || (Number(editIngredientQuantity) > 0 ? Number(editIngredientQuantity) : 1);
    const size = Number(editIngredientPackSize);
    const cost = Number(editIngredientPackCost);
    if (size > 0) {
      const totalQty = count * size;
      setEditIngredientQuantity(totalQty);
      if (cost > 0) {
        setEditIngredientCostPerUnit(Number((cost / size).toFixed(2)));
      }
    }
  };

  // Menu Builder state
  const [builderSearchQuery, setBuilderSearchQuery] = useState('');
  const [builderCategoryFilter, setBuilderCategoryFilter] = useState<Category | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Add/Edit menu item form states
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>(130);
  const [formCategory, setFormCategory] = useState<Category>('bento');
  const [formImage, setFormImage] = useState('');
  const [formOriginalImage, setFormOriginalImage] = useState('');
  const [formSpicy, setFormSpicy] = useState(false);
  const [formPopular, setFormPopular] = useState(false);
  const [formIngredients, setFormIngredients] = useState('');
  const [formCustomOptions, setFormCustomOptions] = useState<{
    id: string;
    title: string;
    choices: { id: string; name: string; price: number }[];
  }[]>([]);
  const [formRecipeRequirements, setFormRecipeRequirements] = useState<{ name: string; amount: number | '' }[]>([]);
  const [formBatchIngredients, setFormBatchIngredients] = useState<Array<{ name: string; batchAmount: number; unit: string; cost?: number }>>([]);
  const [formGarnishes, setFormGarnishes] = useState<Array<{ name: string; amount: number; unit?: string; costPerUnit?: number; selected: boolean }>>([]);
  const [formPackaging, setFormPackaging] = useState<Array<{ name: string; amount: number; unit?: string; costPerUnit?: number; selected: boolean }>>([]);
  const [recipeAllowDecimals, setRecipeAllowDecimals] = useState<boolean>(false);
  const [formTargetMargin, setFormTargetMargin] = useState<number | ''>(50);
  const [batchServingsTarget, setBatchServingsTarget] = useState<number | ''>(20);
  const [formElecOverhead, setFormElecOverhead] = useState<number | ''>(3.00);
  const [formGasOverhead, setFormGasOverhead] = useState<number | ''>(2.50);
  const [formWaterOverhead, setFormWaterOverhead] = useState<number | ''>(1.00);
  const [formPkgOverhead, setFormPkgOverhead] = useState<number | ''>(0.00);

  // Batch Yield & Portion Costing state in Add/Edit modal (Viand / Meat Batch)
  const [formBatchYieldGrams, setFormBatchYieldGrams] = useState<number | ''>(2000); // 2000g (2kg) or pieces count default
  const [formBatchYieldUnit, setFormBatchYieldUnit] = useState<'g' | 'pcs'>('g');
  const [formServingSizeGrams, setFormServingSizeGrams] = useState<number | ''>(90); // 90g or pieces count default
  const [formServingSizeUnit, setFormServingSizeUnit] = useState<'g' | 'pcs'>('g');
  const [formBatchTotalCost, setFormBatchTotalCost] = useState<number | ''>(3000); // ₱3,000 default
  const [batchYieldInputMode, setBatchYieldInputMode] = useState<'quick' | 'ingredients'>('quick');
  const [batchIngredientsList, setBatchIngredientsList] = useState<Array<{ name: string; amount: number | ''; unit: string; cost: number | '' }>>([
    { name: 'Pork Belly / Meat Cuts', amount: 1600, unit: 'g', cost: 2400 },
    { name: 'Special Soy Sauce Marinade', amount: 200, unit: 'ml', cost: 250 },
    { name: 'Garlic & Onion Spices', amount: 100, unit: 'g', cost: 150 },
    { name: 'Cooking Oil & Seasoning', amount: 50, unit: 'ml', cost: 100 },
    { name: 'Atchara Pickles Garnish', amount: 50, unit: 'g', cost: 100 }
  ]);
  // Steamed Rice Costing for Add/Edit Modal (Cooked Separately)
  const [formIncludeRice, setFormIncludeRice] = useState<boolean>(true);
  const [formRicePortionGrams, setFormRicePortionGrams] = useState<number | ''>(150); // 150g standard cup
  const [formRiceCostMode, setFormRiceCostMode] = useState<'simple' | 'cooker'>('simple');
  const [formRiceCostPerGram, setFormRiceCostPerGram] = useState<number | ''>(0.04); // ₱0.04/g (₱6.00 / 150g cup)
  const [formRawRiceKg, setFormRawRiceKg] = useState<number | ''>(2);
  const [formRawRiceCostKg, setFormRawRiceCostKg] = useState<number | ''>(50);
  const [formRiceExpansionRatio, setFormRiceExpansionRatio] = useState<number | ''>(2.3);
  const [formRiceOverhead, setFormRiceOverhead] = useState<number | ''>(10);
  const [formSelectedRiceIngredient, setFormSelectedRiceIngredient] = useState<string>('');

  // Standalone Batch Yield & Portion Calculator Modal state
  const [isBatchCalcModalOpen, setIsBatchCalcModalOpen] = useState(false);
  const [standaloneBatchWeight, setStandaloneBatchWeight] = useState<number | ''>(2000); // 2000g / 2kg or count default
  const [standaloneBatchUnit, setStandaloneBatchUnit] = useState<'g' | 'pcs'>('g');
  const [standaloneServingGrams, setStandaloneServingGrams] = useState<number | ''>(90); // 90g or count default
  const [standaloneTotalBatchCost, setStandaloneTotalBatchCost] = useState<number | ''>(3000); // ₱3,000 default
  const [standaloneTargetMargin, setStandaloneTargetMargin] = useState<number | ''>(50);
  const [standaloneRecipeName, setStandaloneRecipeName] = useState<string>('');
  const [standaloneIngredients, setStandaloneIngredients] = useState<Array<{ name: string; batchAmount: number | ''; unit: string; cost: number | '' }>>([]);
  const [batchCalcCopied, setBatchCalcCopied] = useState(false);
  // Steamed Rice Costing for Standalone Modal (Cooked Separately)
  const [standaloneIncludeRice, setStandaloneIncludeRice] = useState<boolean>(true);
  const [standaloneRicePortionGrams, setStandaloneRicePortionGrams] = useState<number | ''>(150); // 150g standard cup
  const [standaloneRiceCostMode, setStandaloneRiceCostMode] = useState<'simple' | 'cooker'>('simple');
  const [standaloneRiceCostPerGram, setStandaloneRiceCostPerGram] = useState<number | ''>(0.04); // ₱0.04/g (₱6.00 / 150g cup)
  const [standaloneRawRiceKg, setStandaloneRawRiceKg] = useState<number | ''>(2);
  const [standaloneRawRiceCostKg, setStandaloneRawRiceCostKg] = useState<number | ''>(50);
  const [standaloneRiceExpansionRatio, setStandaloneRiceExpansionRatio] = useState<number | ''>(2.3);
  const [standaloneRiceOverhead, setStandaloneRiceOverhead] = useState<number | ''>(10);
  const [standaloneSelectedRiceIngredient, setStandaloneSelectedRiceIngredient] = useState<string>('');
  // Packaging & Disposables Costing for Standalone Modal (Selected directly from Inventory Stock)
  const [standaloneIncludePackaging, setStandaloneIncludePackaging] = useState<boolean>(true);
  const [standaloneSelectedPackaging, setStandaloneSelectedPackaging] = useState<Array<{
    name: string;
    unit?: string;
    amount: number;
    costPerUnit: number;
    selected: boolean;
  }>>([
    { name: 'Paper Bowl', unit: 'pcs', amount: 1, costPerUnit: 2.50, selected: true },
    { name: 'Utensils (Spoon & Fork)', unit: 'pcs', amount: 1, costPerUnit: 1.50, selected: true }
  ]);

  const standalonePackagingCost = useMemo(() => {
    if (!standaloneIncludePackaging) return 0;
    return standaloneSelectedPackaging
      .filter(p => p.selected)
      .reduce((sum, p) => {
        const invMatch = (ingredientsInventory || []).find(i => i.name.toLowerCase() === p.name.toLowerCase());
        const cost = (invMatch?.costPerUnit && invMatch.costPerUnit > 0) ? invMatch.costPerUnit : (Number(p.costPerUnit) || 0);
        return sum + cost * (Number(p.amount) || 1);
      }, 0);
  }, [standaloneIncludePackaging, standaloneSelectedPackaging, ingredientsInventory]);

  // Plate Garnishes, Toppings & Direct Sides (Per Serving - Eggs, Calamansi, Red Chili, Atchara, Soup)
  const [standaloneIncludeGarnishes, setStandaloneIncludeGarnishes] = useState<boolean>(true);
  const [standaloneSelectedGarnishes, setStandaloneSelectedGarnishes] = useState<Array<{
    name: string;
    unit?: string;
    amount: number;
    costPerUnit: number;
    selected: boolean;
  }>>([
    { name: 'Egg', unit: 'pcs', amount: 1, costPerUnit: 8.00, selected: true },
    { name: 'Kalamansi /pc', unit: 'pcs', amount: 1, costPerUnit: 0.50, selected: true },
    { name: 'Red Chili', unit: 'pcs', amount: 1, costPerUnit: 0.80, selected: true }
  ]);

  // Helper to determine grams or piece conversion for plate garnishes/toppings
  const getGarnishGramsPerPiece = (name: string, invMatch?: IngredientStock): number => {
    const n = name.toLowerCase();
    if (n.includes('egg') || n.includes('itlog')) return 50;
    if (n.includes('chili') || n.includes('sili')) return 10;
    if (n.includes('calamansi') || n.includes('kalamansi') || n.includes('lemon')) return 12;
    if (n.includes('garlic') || n.includes('bawang') || n.includes('laurel')) return 5;
    if (n.includes('onion') || n.includes('sibuyas') || n.includes('tomato') || n.includes('kamatis')) return 15;
    if (n.includes('atchara') || n.includes('pickle')) return 20;
    if (n.includes('soup') || n.includes('sabaw') || n.includes('sauce') || n.includes('gravy')) return 25;
    return 15; // default 15g portion for general garnish
  };

  const getGarnishPieceCost = (name: string, fallbackCost?: number, invMatch?: IngredientStock): number => {
    if (!invMatch) {
      if (fallbackCost !== undefined && fallbackCost > 0) return Number(fallbackCost.toFixed(2));
      const n = name.toLowerCase();
      if (n.includes('egg') || n.includes('itlog')) return 8.00;
      if (n.includes('calamansi') || n.includes('kalamansi')) return 0.50;
      if (n.includes('chili') || n.includes('sili')) return 1.00;
      if (n.includes('atchara')) return 3.00;
      if (n.includes('soup') || n.includes('sabaw')) return 2.00;
      return 1.00;
    }

    const unit = (invMatch.unit || 'pcs').toLowerCase();
    const rawCost = Number(invMatch.costPerUnit) || 0;
    if (rawCost <= 0) {
      return fallbackCost !== undefined && fallbackCost > 0 ? Number(fallbackCost.toFixed(2)) : 1.00;
    }

    if (unit === 'pcs' || unit === 'pc') {
      return Number(rawCost.toFixed(2));
    }

    if (unit === 'kg') {
      const grams = getGarnishGramsPerPiece(name, invMatch);
      const pieceCost = (rawCost / 1000) * grams;
      return Number(Math.max(0.05, pieceCost).toFixed(2));
    }

    if (unit === 'g') {
      const grams = getGarnishGramsPerPiece(name, invMatch);
      const pieceCost = rawCost * grams;
      return Number(Math.max(0.05, pieceCost).toFixed(2));
    }

    if (unit === 'ml') {
      const ml = getGarnishGramsPerPiece(name, invMatch);
      const pieceCost = rawCost * ml;
      return Number(Math.max(0.05, pieceCost).toFixed(2));
    }

    if (unit === 'cans') {
      return Number((rawCost * 0.1).toFixed(2));
    }

    return Number(rawCost.toFixed(2));
  };

  const standaloneGarnishesCost = useMemo(() => {
    if (!standaloneIncludeGarnishes) return 0;
    return standaloneSelectedGarnishes
      .filter(g => g.selected)
      .reduce((sum, g) => {
        const invMatch = (ingredientsInventory || []).find(i => i.name.toLowerCase() === g.name.toLowerCase());
        const garnishUnit = (g.unit || 'pcs').toLowerCase();
        const isVolumeUnit = garnishUnit === 'ml' || garnishUnit === 'g';
        const rawCostPerUnit = invMatch ? (Number(invMatch.costPerUnit) || 0) : (g.costPerUnit || 0);

        // For volume/weight units, compute cost from raw per-unit price × amount
        // This avoids the double-multiplication bug where the old pieceCost
        // already had the default 15g baked in, then got multiplied by amount again.
        const effectiveCostPerUnit = (() => {
          if (isVolumeUnit && rawCostPerUnit > 0) {
            const invUnit = (invMatch?.unit || '').toLowerCase();
            if (invUnit === 'ml' || invUnit === 'g') return rawCostPerUnit;       // per ml or per g
            if (invUnit === 'kg') return rawCostPerUnit / 1000;                   // convert kg→g
            if (invUnit === 'l') return rawCostPerUnit / 1000;                    // convert l→ml
          }
          // For pcs or fallback, use stored costPerUnit (per piece)
          return (g.costPerUnit !== undefined && g.costPerUnit > 0)
            ? g.costPerUnit
            : getGarnishPieceCost(g.name, undefined, invMatch);
        })();

        return sum + effectiveCostPerUnit * (Number(g.amount) || 1);
      }, 0);
  }, [standaloneIncludeGarnishes, standaloneSelectedGarnishes, ingredientsInventory]);

  const handleOpenFreshBatchCalculator = () => {
    setStandaloneRecipeName('');
    setStandaloneIngredients([]);
    setStandaloneTotalBatchCost(0);
    setStandaloneBatchWeight(2000);
    setStandaloneBatchUnit('g');
    setStandaloneServingGrams(90);
    setStandaloneTargetMargin(50);
    setStandaloneIncludeRice(true);
    setStandaloneRicePortionGrams(150);
    setStandaloneRiceCostPerGram(0.04);
    setStandaloneSelectedRiceIngredient('');
    setStandaloneIncludeGarnishes(true);
    setStandaloneSelectedGarnishes([
      { name: 'Egg', unit: 'pcs', amount: 1, costPerUnit: 8.00, selected: true },
      { name: 'Kalamansi /pc', unit: 'pcs', amount: 1, costPerUnit: 0.50, selected: true },
      { name: 'Red Chili', unit: 'pcs', amount: 1, costPerUnit: 0.80, selected: true }
    ]);
    setStandaloneIncludePackaging(true);
    setSelectedRecipeToLoad('');
    setIsBatchCalcModalOpen(true);
  };

  // Filter rice items from inventory for quick selection
  const riceInventoryItems = useMemo(() => {
    return (ingredientsInventory || []).filter(i => {
      const n = (i.name || '').toLowerCase();
      return n.includes('rice') || n.includes('kanin') || n.includes('bigas') || n.includes('sinandomeng') || n.includes('jasmine') || n.includes('dinorado') || n.includes('japanese') || n.includes('malagkit');
    });
  }, [ingredientsInventory]);

  const nonRiceInventoryItems = useMemo(() => {
    return (ingredientsInventory || []).filter(i => !riceInventoryItems.some(r => r.id === i.id));
  }, [ingredientsInventory, riceInventoryItems]);

  const applyRiceIngredientCost = (ingredientName: string, isStandalone: boolean) => {
    if (isStandalone) {
      setStandaloneSelectedRiceIngredient(ingredientName);
    } else {
      setFormSelectedRiceIngredient(ingredientName);
    }

    if (!ingredientName) return;

    const invItem = ingredientsInventory.find(i => i.name.toLowerCase() === ingredientName.toLowerCase());
    if (!invItem) return;

    const unit = (invItem.unit || 'kg').toLowerCase();
    const unitCost = Number(invItem.costPerUnit) || 0;

    if (unit === 'kg') {
      if (isStandalone) {
        setStandaloneRawRiceCostKg(unitCost);
        const expRatio = Number(standaloneRiceExpansionRatio) || 2.3;
        const overhead = Number(standaloneRiceOverhead) || 10;
        const rawKg = Number(standaloneRawRiceKg) || 2;
        const totalCookedGrams = rawKg * expRatio * 1000;
        const computedRate = ((rawKg * unitCost) + overhead) / Math.max(1, totalCookedGrams);
        setStandaloneRiceCostPerGram(Number(computedRate.toFixed(4)));
      } else {
        setFormRawRiceCostKg(unitCost);
        const expRatio = Number(formRiceExpansionRatio) || 2.3;
        const overhead = Number(formRiceOverhead) || 10;
        const rawKg = Number(formRawRiceKg) || 2;
        const totalCookedGrams = rawKg * expRatio * 1000;
        const computedRate = ((rawKg * unitCost) + overhead) / Math.max(1, totalCookedGrams);
        setFormRiceCostPerGram(Number(computedRate.toFixed(4)));
      }
    } else if (unit === 'g') {
      if (isStandalone) {
        setStandaloneRiceCostPerGram(unitCost);
        setStandaloneRawRiceCostKg(Number((unitCost * 1000).toFixed(2)));
      } else {
        setFormRiceCostPerGram(unitCost);
        setFormRawRiceCostKg(Number((unitCost * 1000).toFixed(2)));
      }
    }
  };

  const handleCreateQuickRiceIngredient = (riceName: string = 'Sinandomeng Rice (Raw)', pricePerKg: number = 45) => {
    onAddIngredient(riceName, 50, 'kg', 10, pricePerKg);
    setTimeout(() => {
      applyRiceIngredientCost(riceName, true);
      applyRiceIngredientCost(riceName, false);
    }, 150);
  };

  // Quick culinary unit converter widget state
  const [quickConverterAmount, setQuickConverterAmount] = useState<number | ''>(1);
  const [quickConverterFromUnit, setQuickConverterFromUnit] = useState<string>('tbsp');
  const [isQuickConverterExpanded, setIsQuickConverterExpanded] = useState<boolean>(false);

  // Helper to convert culinary measurement units to base standard (grams or milliliters)
  const getBaseEquivalentUnits = (amount: number, unit: string): number => {
    const u = (unit || 'g').trim().toLowerCase();
    switch (u) {
      case 'kg': case 'kilo': case 'kilos': case 'kilogram': case 'kilograms':
        return amount * 1000;
      case 'g': case 'gram': case 'grams':
        return amount;
      case 'mg': case 'milligram': case 'milligrams':
        return amount / 1000;
      case 'l': case 'liter': case 'liters':
        return amount * 1000;
      case 'ml': case 'milliliter': case 'milliliters':
        return amount;
      case 'tbsp': case 'tablespoon': case 'tablespoons': case 'tbs':
        return amount * 15; // 1 tbsp = 15ml / 15g approx standard
      case 'tsp': case 'teaspoon': case 'teaspoons':
        return amount * 5; // 1 tsp = 5ml / 5g approx standard
      case 'cup': case 'cups':
        return amount * 240; // 1 cup = 240ml / 240g
      case 'oz': case 'fl oz': case 'ounce': case 'ounces':
        return amount * 30; // 1 fl oz = 30ml / 28.35g
      case 'pinch': case 'pinches': case 'dash': case 'dashes':
        return amount * 0.5; // 1 pinch = 0.5g
      case 'pcs': case 'pc': case 'piece': case 'pieces': case 'cans': case 'can': case 'pack': case 'packs':
        return amount;
      default:
        return amount;
    }
  };

  // Helper to compute inventory item cost for a given amount and unit (handling tbsp, tsp, cups, oz, pinch, ml, g, kg, L)
  const computeInventoryIngredientCost = (name: string, amount: number | '', unit: string) => {
    const inv = ingredientsInventory.find(i => i.name.toLowerCase() === name.toLowerCase());
    const invUnit = (inv?.unit || 'g').toLowerCase();
    const inputUnit = (unit || invUnit).toLowerCase();
    const numAmt = Number(amount) || 0;

    const isCountableInv = invUnit === 'pcs' || invUnit === 'pc' || invUnit === 'cans' || invUnit === 'can' || invUnit === 'pack';
    const isCountableInput = inputUnit === 'pcs' || inputUnit === 'pc' || inputUnit === 'cans' || inputUnit === 'can' || inputUnit === 'pack';

    if (isCountableInv && isCountableInput) {
      const unitPrice = inv?.costPerUnit ?? 15.00;
      return Number((numAmt * unitPrice).toFixed(2));
    }

    // Determine inventory cost per base unit (per gram or per ml)
    let costPerBaseUnit = 0;
    if (inv && inv.costPerUnit !== undefined && inv.costPerUnit !== null) {
      if (invUnit === 'kg' || invUnit === 'l' || invUnit === 'liter') {
        costPerBaseUnit = inv.costPerUnit / 1000;
      } else {
        costPerBaseUnit = inv.costPerUnit;
      }
    } else {
      switch (invUnit) {
        case 'kg': costPerBaseUnit = 150.00 / 1000; break;
        case 'g': costPerBaseUnit = 0.05; break;
        case 'l': costPerBaseUnit = 80.00 / 1000; break;
        case 'ml': costPerBaseUnit = 0.08; break;
        case 'tbsp': costPerBaseUnit = 1.20 / 15; break;
        case 'tsp': costPerBaseUnit = 0.40 / 5; break;
        case 'cup': costPerBaseUnit = 18.00 / 240; break;
        case 'pcs': case 'pc': costPerBaseUnit = 15.00; break;
        case 'cans': case 'can': costPerBaseUnit = 45.00; break;
        default: costPerBaseUnit = 0.05; break;
      }
    }

    const baseAmount = getBaseEquivalentUnits(numAmt, inputUnit);
    return Number((baseAmount * costPerBaseUnit).toFixed(2));
  };

  // Helpers to distinguish and normalize recipe requirement components
  const getItemName = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null && 'name' in item) {
      return String(item.name || '');
    }
    return '';
  };

  const isRiceRequirement = (item: any) => {
    const n = getItemName(item).toLowerCase();
    return n.includes('rice') || n.includes('kanin') || n.includes('bigas') || n.includes('sinandomeng') || n.includes('jasmine') || n.includes('dinorado') || n.includes('japanese') || n.includes('malagkit');
  };

  const isPackagingRequirement = (item: any) => {
    const n = getItemName(item).toLowerCase();
    return n.includes('bowl') || n.includes('utensil') || n.includes('box') || n.includes('container') || n.includes('packaging') || n.includes('spoon') || n.includes('fork') || (n.includes('cup') && !n.includes('rice') && !n.includes('measuring'));
  };

  const isGarnishRequirement = (item: any) => {
    const n = getItemName(item).toLowerCase();
    return n.includes('egg') || n.includes('itlog') || n.includes('calamansi') || n.includes('kalamansi') || n.includes('chili') || n.includes('sili') || n.includes('atchara') || n.includes('garnish') || n.includes('sauce') || n.includes('gravy') || n.includes('soup') || n.includes('sabaw') || n.includes('topping');
  };

  const isViandRequirement = (item: any) => {
    return !isRiceRequirement(item) && !isPackagingRequirement(item) && !isGarnishRequirement(item);
  };

  const deduplicateAndNormalizeRequirements = (reqs: Array<{ name: string; amount: number }>) => {
    const map = new Map<string, { name: string; amount: number }>();
    for (const r of reqs) {
      if (!r || !r.name) continue;
      const key = r.name.trim().toLowerCase();
      let amt = Number(r.amount) || 0;
      if (isPackagingRequirement(r.name)) {
        amt = Math.max(1, Math.round(amt) || 1);
      }
      if (map.has(key)) {
        const existing = map.get(key)!;
        if (isPackagingRequirement(r.name)) {
          existing.amount = 1;
        } else {
          existing.amount = Number((existing.amount + amt).toFixed(1));
        }
      } else {
        map.set(key, { name: r.name.trim(), amount: amt });
      }
    }
    return Array.from(map.values()).map(item => {
      if (isPackagingRequirement(item.name)) return { name: item.name, amount: 1 };
      if (item.name.toLowerCase().includes('/pc') || item.name.toLowerCase().includes('egg') || item.name.toLowerCase().includes('laurel')) {
        return { name: item.name, amount: Math.max(1, Math.round(item.amount)) };
      }
      if (item.amount > 0 && item.amount < 1) {
        return {
          name: item.name,
          amount: recipeAllowDecimals ? Math.max(0.1, Number(item.amount.toFixed(1))) : 1
        };
      }
      return item;
    });
  };

  const formViandReqs = useMemo(() => formRecipeRequirements.filter(r => isViandRequirement(r.name)), [formRecipeRequirements]);
  const formRiceReqs = useMemo(() => formRecipeRequirements.filter(r => isRiceRequirement(r.name)), [formRecipeRequirements]);
  const formPkgReqs = useMemo(() => formRecipeRequirements.filter(r => isPackagingRequirement(r.name)), [formRecipeRequirements]);

  // --- Saved Recipe Templates & Batch Calculator Integration ---
  interface SavedRecipeTemplate {
    id: string;
    name: string;
    category?: Category;
    description?: string;
    batchYieldUnit?: 'g' | 'pcs';
    servingSizeUnit?: 'g' | 'pcs';
    servingSizeGrams: number;
    batchYieldGrams: number;
    targetMargin: number;
    includeRice: boolean;
    ricePortionGrams: number;
    riceCostPerGram: number;
    includeGarnishes?: boolean;
    garnishes?: Array<{
      name: string;
      amount: number;
      unit?: string;
      costPerUnit?: number;
      selected: boolean;
    }>;
    includePackaging?: boolean;
    packaging?: Array<{
      name: string;
      amount: number;
      unit?: string;
      costPerUnit?: number;
      selected: boolean;
    }>;
    ingredients: Array<{
      name: string;
      batchAmount: number;
      unit: string;
      cost?: number;
    }>;
  }

  const DEFAULT_RECIPE_TEMPLATES: SavedRecipeTemplate[] = [
    {
      id: 'template-lumpiang-shanghai',
      name: 'Crispy Lumpiang Shanghai (100 pcs Batch)',
      category: 'silog',
      description: 'Golden crispy pork spring rolls with minced carrots, garlic, onions, and egg seasoning, paired with sweet chili sauce and steamed rice.',
      batchYieldUnit: 'pcs',
      servingSizeUnit: 'pcs',
      servingSizeGrams: 4,
      batchYieldGrams: 100,
      targetMargin: 55,
      includeRice: true,
      ricePortionGrams: 150,
      riceCostPerGram: 0.04,
      includeGarnishes: true,
      garnishes: [
        { name: 'Sweet Chili Sauce Pack', amount: 1, unit: 'pcs', costPerUnit: 2.00, selected: true }
      ],
      ingredients: [
        { name: 'Ground Pork Meat', batchAmount: 1000, unit: 'g' },
        { name: 'Lumpia Wrappers', batchAmount: 100, unit: 'pcs' },
        { name: 'Fresh Eggs', batchAmount: 2, unit: 'pcs' },
        { name: 'Finely Minced Carrots', batchAmount: 150, unit: 'g' },
        { name: 'White & Red Onions', batchAmount: 100, unit: 'g' },
        { name: 'Minced Garlic', batchAmount: 50, unit: 'g' },
        { name: 'Cooking Oil (Deep Fry)', batchAmount: 200, unit: 'ml' }
      ]
    },
    {
      id: 'template-sisig-special',
      name: 'Sizzling Pork Sisig Recipe',
      category: 'silog',
      description: 'Authentic Pampanga-style crispy pork belly & jowl with chicken liver, onions, siling haba, and calamansi seasoning.',
      batchYieldUnit: 'g',
      servingSizeUnit: 'g',
      servingSizeGrams: 90,
      batchYieldGrams: 2000,
      targetMargin: 55,
      includeRice: true,
      ricePortionGrams: 150,
      riceCostPerGram: 0.04,
      includeGarnishes: true,
      garnishes: [
        { name: 'Egg', amount: 1, unit: 'pcs', costPerUnit: 8.00, selected: true },
        { name: 'Kalamansi /pc', amount: 1, unit: 'pcs', costPerUnit: 0.50, selected: true },
        { name: 'Red Chili', amount: 1, unit: 'pcs', costPerUnit: 0.80, selected: true }
      ],
      ingredients: [
        { name: 'Crispy Pork Belly / Mask', batchAmount: 1550, unit: 'g' },
        { name: 'Minced Chicken Liver', batchAmount: 220, unit: 'g' },
        { name: 'White & Red Onions', batchAmount: 180, unit: 'g' },
        { name: 'Green & Red Chili (Siling Haba)', batchAmount: 60, unit: 'g' },
        { name: 'Calamansi Juice Seasoning', batchAmount: 60, unit: 'ml' },
        { name: 'Soy Sauce & Liquid Seasoning', batchAmount: 60, unit: 'ml' },
        { name: 'Japanese Mayonnaise', batchAmount: 60, unit: 'g' }
      ]
    },
    {
      id: 'template-beef-tapa',
      name: 'Special Garlic Beef Tapa Bento',
      category: 'bento',
      description: 'Special garlic soy cured beef tapa with aromatics.',
      batchYieldUnit: 'g',
      servingSizeUnit: 'g',
      servingSizeGrams: 90,
      batchYieldGrams: 2000,
      targetMargin: 50,
      includeRice: true,
      ricePortionGrams: 150,
      riceCostPerGram: 0.04,
      includeGarnishes: true,
      garnishes: [
        { name: 'Egg', amount: 1, unit: 'pcs', costPerUnit: 8.00, selected: true },
        { name: 'Atchara Garnish Pack', amount: 1, unit: 'pcs', costPerUnit: 3.00, selected: true }
      ],
      ingredients: [
        { name: 'Marinated Beef Tapa Meat', batchAmount: 1600, unit: 'g' },
        { name: 'Special Soy-Garlic Glaze', batchAmount: 200, unit: 'ml' },
        { name: 'Fresh Garlic & Onion Aromatics', batchAmount: 100, unit: 'g' },
        { name: 'Cooking Oil & Spices', batchAmount: 50, unit: 'ml' }
      ]
    },
    {
      id: 'template-chicken-teriyaki',
      name: 'Crispy Chicken Teriyaki Bento',
      category: 'bento',
      description: 'Tender chicken fillet with sweet teriyaki glaze.',
      batchYieldUnit: 'g',
      servingSizeUnit: 'g',
      servingSizeGrams: 80,
      batchYieldGrams: 1000,
      targetMargin: 50,
      includeRice: true,
      ricePortionGrams: 150,
      riceCostPerGram: 0.04,
      includeGarnishes: true,
      garnishes: [
        { name: 'Toasted Sesame & Spring Onions', amount: 1, unit: 'pcs', costPerUnit: 1.50, selected: true }
      ],
      ingredients: [
        { name: 'Boneless Chicken Fillet', batchAmount: 700, unit: 'g' },
        { name: 'Authentic Teriyaki Sauce', batchAmount: 150, unit: 'ml' },
        { name: 'Stir-fry Cabbage & Veggies', batchAmount: 70, unit: 'g' },
        { name: 'Pure Sesame Cooking Oil', batchAmount: 30, unit: 'ml' }
      ]
    }
  ];

  const [savedRecipeTemplates, setSavedRecipeTemplates] = useState<SavedRecipeTemplate[]>(() => {
    try {
      const stored = localStorage.getItem('curvada_saved_recipe_templates');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If stored templates exist but do not have lumpiang shanghai, prepend it
          if (!parsed.some((t: SavedRecipeTemplate) => t.id === 'template-lumpiang-shanghai')) {
            return [DEFAULT_RECIPE_TEMPLATES[0], ...parsed];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load saved templates', e);
    }
    return DEFAULT_RECIPE_TEMPLATES;
  });

  const [selectedRecipeToLoad, setSelectedRecipeToLoad] = useState<string>('');
  const [isSavingTemplatePrompt, setIsSavingTemplatePrompt] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const saveRecipeTemplates = (newTemplates: SavedRecipeTemplate[]) => {
    setSavedRecipeTemplates(newTemplates);
    try {
      localStorage.setItem('curvada_saved_recipe_templates', JSON.stringify(newTemplates));
    } catch (e) {
      console.error('Failed to save templates to storage', e);
    }
  };

  const handleSaveCurrentBatchAsTemplate = (nameToSave?: string) => {
    const finalName = (nameToSave || newTemplateName || standaloneRecipeName || 'Custom Recipe').trim();
    if (!finalName) {
      alert('Please enter a recipe name to save.');
      return;
    }

    const newTemplate: SavedRecipeTemplate = {
      id: 'template-' + Date.now(),
      name: finalName,
      batchYieldUnit: standaloneBatchUnit,
      servingSizeUnit: standaloneBatchUnit,
      servingSizeGrams: Number(standaloneServingGrams) || (standaloneBatchUnit === 'pcs' ? 4 : 90),
      batchYieldGrams: Number(standaloneBatchWeight) || (standaloneBatchUnit === 'pcs' ? 100 : 2000),
      targetMargin: Number(standaloneTargetMargin) || 50,
      includeRice: standaloneIncludeRice,
      ricePortionGrams: Number(standaloneRicePortionGrams) || 150,
      riceCostPerGram: Number(standaloneRiceCostPerGram) || 0.04,
      includeGarnishes: standaloneIncludeGarnishes,
      garnishes: standaloneSelectedGarnishes,
      includePackaging: standaloneIncludePackaging,
      packaging: standaloneSelectedPackaging,
      ingredients: standaloneIngredients.map(item => ({
        name: item.name,
        batchAmount: Number(item.batchAmount) || 0,
        unit: item.unit,
        cost: Number(item.cost) || 0
      }))
    };

    const updated = [newTemplate, ...savedRecipeTemplates.filter(t => t.name.toLowerCase() !== finalName.toLowerCase())];
    saveRecipeTemplates(updated);
    setSelectedRecipeToLoad(`template:${newTemplate.id}`);
    setIsSavingTemplatePrompt(false);
    setNewTemplateName('');
    alert(`🎉 Successfully saved "${finalName}" template with ${newTemplate.ingredients.length} viand ingredients, ${standaloneIncludeRice ? '1 rice' : 'no rice'}, ${standaloneIncludeGarnishes ? standaloneSelectedGarnishes.filter(g => g.selected).length : 0} garnishes & ${standaloneIncludePackaging ? standaloneSelectedPackaging.filter(p => p.selected).length : 0} packaging items!`);
  };

  const handleSaveAllBatchCostingChanges = (options?: { closeModal?: boolean; sectionLabel?: string; openMenuForm?: boolean }) => {
    const finalName = (standaloneRecipeName || 'Custom Recipe').trim();
    const batchWeightG = Math.max(1, Number(standaloneBatchWeight) || (standaloneBatchUnit === 'pcs' ? 100 : 2000));
    const servingG = Math.max(1, Number(standaloneServingGrams) || (standaloneBatchUnit === 'pcs' ? 4 : 90));

    // Calculate portion amounts for viand ingredients
    const scaledReqs = standaloneIngredients.map(item => {
      const invMatch = (ingredientsInventory || []).find(inv => inv.name.toLowerCase() === item.name.toLowerCase());
      const unit = (item.unit || invMatch?.unit || 'g').toLowerCase();
      const isCountable = unit === 'pcs' || unit === 'cans' || unit === 'pc' || unit === 'pack';
      const rawAmt = Number(item.batchAmount) || 0;
      
      let finalAmt: number;
      if (rawAmt <= 0) {
        finalAmt = 0;
      } else if (isCountable) {
        const scaled = (rawAmt / batchWeightG) * servingG;
        finalAmt = rawAmt <= 1 ? 1 : Math.max(1, Math.round(scaled));
      } else {
        const scaled = (rawAmt / batchWeightG) * servingG;
        finalAmt = recipeAllowDecimals ? Math.max(0.1, Number(scaled.toFixed(1))) : Math.max(1, Math.round(scaled));
      }

      return {
        name: item.name.trim(),
        amount: finalAmt
      };
    });

    if (standaloneIncludeRice) {
      const riceName = standaloneSelectedRiceIngredient || 'Steamed Rice';
      scaledReqs.push({
        name: riceName,
        amount: Number(standaloneRicePortionGrams) || 150
      });
    }

    if (standaloneIncludeGarnishes && standaloneSelectedGarnishes.length > 0) {
      standaloneSelectedGarnishes
        .filter(g => g.selected)
        .forEach(g => {
          const invMatch = (ingredientsInventory || []).find(inv => inv.name.toLowerCase() === g.name.toLowerCase());
          const garnishUnit = (g.unit || 'pcs').toLowerCase();
          const isGarnishWeightUnit = garnishUnit === 'g' || garnishUnit === 'ml';
          const isWeightStockPcs = (invMatch?.unit === 'g' || invMatch?.unit === 'kg') && !isGarnishWeightUnit;
          const gramsPerPc = getGarnishGramsPerPiece(g.name, invMatch);
          // If garnish unit is already g/ml, the amount IS the per-serving weight — don't multiply by gramsPerPc.
          // Only convert pieces→grams when the garnish is measured in pcs but stored in g/kg inventory.
          const reqAmount = isGarnishWeightUnit
            ? (Number(g.amount) || 1)
            : isWeightStockPcs
              ? (Number(g.amount) || 1) * gramsPerPc
              : (Number(g.amount) || 1);

          scaledReqs.push({
            name: g.name,
            amount: reqAmount
          });
        });
    }

    if (standaloneIncludePackaging && standaloneSelectedPackaging.length > 0) {
      standaloneSelectedPackaging
        .filter(p => p.selected)
        .forEach(p => {
          scaledReqs.push({
            name: p.name,
            amount: Number(p.amount) || 1
          });
        });
    }
    const finalCombinedReqs = deduplicateAndNormalizeRequirements(scaledReqs);
    const allIngredientNames = Array.from(new Set(finalCombinedReqs.map(p => p.name)));

    const batchCost = standaloneTotalBatchCost !== undefined && standaloneTotalBatchCost > 0
      ? standaloneTotalBatchCost
      : standaloneIngredients.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    const viandCostPerServing = (batchCost / batchWeightG) * servingG;
    const riceCostPerServing = standaloneIncludeRice ? (Number(standaloneRicePortionGrams) || 0) * (Number(standaloneRiceCostPerGram) || 0) : 0;
    const garnishesCostPerServing = standaloneIncludeGarnishes
      ? standaloneSelectedGarnishes.filter(g => g.selected).reduce((sum, g) => sum + (Number(g.amount) || 1) * (Number(g.costPerUnit) || 0), 0)
      : 0;
    const packagingCostPerServing = standaloneIncludePackaging
      ? standaloneSelectedPackaging.filter(p => p.selected).reduce((sum, p) => sum + (Number(p.amount) || 1) * (Number(p.costPerUnit) || 0), 0)
      : 0;
    const totalPlateCogs = viandCostPerServing + riceCostPerServing + garnishesCostPerServing + packagingCostPerServing;
    const targetMarginRatio = (Number(standaloneTargetMargin) || 50) / 100;
    const recSellingPrice = Math.max(1, Math.round(totalPlateCogs / Math.max(0.05, (1 - targetMarginRatio))));

    // Update Form States (so the Add/Edit form always has the fresh values)
    const exactBatchIngredients = standaloneIngredients.map(item => ({
      name: item.name,
      batchAmount: Number(item.batchAmount) || 0,
      unit: item.unit,
      cost: Number(item.cost) || 0
    }));
    setFormBatchIngredients(exactBatchIngredients);
    setFormGarnishes(standaloneSelectedGarnishes);
    setFormPackaging(standaloneSelectedPackaging);
    setFormBatchTotalCost(batchCost);
    setFormPrice(recSellingPrice);
    setFormTargetMargin(Number(standaloneTargetMargin) || 50);
    setFormBatchYieldUnit(standaloneBatchUnit);
    setFormServingSizeUnit(standaloneBatchUnit);
    setFormBatchYieldGrams(batchWeightG);
    setFormServingSizeGrams(servingG);
    setFormIncludeRice(standaloneIncludeRice);
    setFormRicePortionGrams(Number(standaloneRicePortionGrams) || 150);
    setFormRiceCostPerGram(Number(standaloneRiceCostPerGram) || 0.04);
    setFormSelectedRiceIngredient(standaloneSelectedRiceIngredient);
    setFormRecipeRequirements(finalCombinedReqs);
    setFormIngredients(allIngredientNames.join(', '));

    // Pre-fill form metadata if not editing an existing item
    if (!editingItem && options?.openMenuForm) {
      setFormName(finalName);
      setFormDescription(`Prepared in bulk ${standaloneBatchUnit === 'pcs' ? `${batchWeightG} pcs` : `${(batchWeightG / 1000).toFixed(1)}kg`} viand batch, portioned at ${servingG}${standaloneBatchUnit === 'pcs' ? ' pcs' : 'g meat'}${standaloneIncludeRice ? ` with ${standaloneRicePortionGrams}g steamed rice` : ''}. Served fresh with savory traditional accompaniments.`);
      if (!formCategory) setFormCategory('silog');
      if (!formImage) setFormImage(IMAGE_PRESETS[2].url);
      if (!formOriginalImage) setFormOriginalImage(IMAGE_PRESETS[2].url);
    } else if (standaloneRecipeName && standaloneRecipeName !== 'New Dish Recipe') {
      setFormName(finalName);
    }

    // Persist directly to active MenuItem if loaded from dish or matching name
    let matchedDish: MenuItem | undefined;
    if (selectedRecipeToLoad && selectedRecipeToLoad.startsWith('dish:')) {
      const dishId = selectedRecipeToLoad.replace('dish:', '');
      matchedDish = menuItems.find(item => item.id === dishId);
    } else {
      matchedDish = menuItems.find(item => item.name.toLowerCase() === finalName.toLowerCase());
    }

    if (matchedDish) {
      const updatedDish: MenuItem = {
        ...matchedDish,
        name: finalName,
        price: recSellingPrice,
        batchYieldUnit: standaloneBatchUnit,
        servingSizeUnit: standaloneBatchUnit,
        batchYieldGrams: batchWeightG,
        servingSizeGrams: servingG,
        targetMarginPercent: Number(standaloneTargetMargin) || 50,
        totalBatchCost: batchCost,
        includeRice: standaloneIncludeRice,
        ricePortionGrams: Number(standaloneRicePortionGrams) || 150,
        riceCostPerGram: Number(standaloneRiceCostPerGram) || 0.04,
        batchIngredients: exactBatchIngredients,
        garnishes: standaloneSelectedGarnishes,
        packaging: standaloneSelectedPackaging,
        recipeRequirements: finalCombinedReqs,
        ingredients: allIngredientNames
      };
      onEditMenuItem(updatedDish);
    }

    // Also persist to template
    const matchingTemplateIndex = savedRecipeTemplates.findIndex(t => 
      t.name.toLowerCase() === finalName.toLowerCase() || 
      (matchedDish && t.id === `template-${matchedDish.id}`) ||
      (selectedRecipeToLoad && selectedRecipeToLoad.startsWith('template:') && t.id === selectedRecipeToLoad.replace('template:', ''))
    );

    const updatedTemplate: SavedRecipeTemplate = {
      id: matchingTemplateIndex !== -1 ? savedRecipeTemplates[matchingTemplateIndex].id : (matchedDish ? `template-${matchedDish.id}` : `template-${Date.now()}`),
      name: finalName,
      batchYieldUnit: standaloneBatchUnit,
      servingSizeUnit: standaloneBatchUnit,
      servingSizeGrams: servingG,
      batchYieldGrams: batchWeightG,
      targetMargin: Number(standaloneTargetMargin) || 50,
      includeRice: standaloneIncludeRice,
      ricePortionGrams: Number(standaloneRicePortionGrams) || 150,
      riceCostPerGram: Number(standaloneRiceCostPerGram) || 0.04,
      includeGarnishes: standaloneIncludeGarnishes,
      garnishes: standaloneSelectedGarnishes,
      includePackaging: standaloneIncludePackaging,
      packaging: standaloneSelectedPackaging,
      ingredients: exactBatchIngredients
    };

    let newTemplates = [...savedRecipeTemplates];
    if (matchingTemplateIndex !== -1) {
      newTemplates[matchingTemplateIndex] = updatedTemplate;
    } else {
      newTemplates = [updatedTemplate, ...newTemplates];
    }
    saveRecipeTemplates(newTemplates);

    if (options?.closeModal) {
      setIsBatchCalcModalOpen(false);
    }
    if (options?.openMenuForm) {
      setIsFormOpen(true);
    }

    const sectionNotice = options?.sectionLabel ? `[${options.sectionLabel}] ` : '';
    alert(`💾 ${sectionNotice}All costing sections successfully saved! (Selling Price: ₱${recSellingPrice.toFixed(2)})`);
  };

  const handleUpdateSelectedRecipe = () => {
    handleSaveAllBatchCostingChanges();
  };

  const handleLoadRecipeIntoBatch = (recipeKey: string) => {
    if (!recipeKey || recipeKey === '__fresh__') {
      handleOpenFreshBatchCalculator();
      return;
    }

    if (recipeKey.startsWith('template:')) {
      const templateId = recipeKey.replace('template:', '');
      const t = savedRecipeTemplates.find(item => item.id === templateId);
      if (!t) return;

      const unit = t.batchYieldUnit || 'g';
      setStandaloneBatchUnit(unit);
      setStandaloneRecipeName(t.name);
      setStandaloneServingGrams(t.servingSizeGrams || (unit === 'pcs' ? 4 : 90));
      setStandaloneBatchWeight(t.batchYieldGrams || (unit === 'pcs' ? 100 : 2000));
      setStandaloneTargetMargin(t.targetMargin || 50);
      setStandaloneIncludeRice(t.includeRice ?? true);
      setStandaloneRicePortionGrams(t.ricePortionGrams || 150);
      setStandaloneRiceCostPerGram(t.riceCostPerGram || 0.04);
      setStandaloneIncludeGarnishes(t.includeGarnishes ?? (t.garnishes && t.garnishes.length > 0 ? true : false));
      if (t.garnishes && t.garnishes.length > 0) {
        setStandaloneSelectedGarnishes(t.garnishes);
      }
      setStandaloneIncludePackaging(t.includePackaging ?? (t.packaging && t.packaging.length > 0 ? true : false));
      if (t.packaging && t.packaging.length > 0) {
        setStandaloneSelectedPackaging(t.packaging);
      }

      const mapped = t.ingredients.map(ing => {
        const cost = computeInventoryIngredientCost(ing.name, ing.batchAmount, ing.unit);
        return {
          name: ing.name,
          batchAmount: ing.batchAmount,
          unit: ing.unit,
          cost: cost > 0 ? cost : (Number(ing.cost) || 0)
        };
      });

      setStandaloneIngredients(mapped);
      const totalCost = mapped.reduce((sum, i) => sum + (Number(i.cost) || 0), 0);
      setStandaloneTotalBatchCost(totalCost);
      return;
    }

    if (recipeKey.startsWith('dish:')) {
      const dishId = recipeKey.replace('dish:', '');
      const dish = menuItems.find(item => item.id === dishId);
      if (!dish) return;
      handleOpenBatchCalculatorForRecipe(dish);
    }
  };

  const handleOpenBatchCalculatorForRecipe = (item: MenuItem) => {
    setSelectedRecipeToLoad(`dish:${item.id}`);
    setStandaloneRecipeName(item.name);
    const unit = item.batchYieldUnit || 'g';
    setStandaloneBatchUnit(unit);
    const servingG = item.servingSizeGrams || (unit === 'pcs' ? 4 : 90);
    const batchG = item.batchYieldGrams || (unit === 'pcs' ? 100 : 2000);
    setStandaloneServingGrams(servingG);
    setStandaloneBatchWeight(batchG);
    setStandaloneTargetMargin(item.targetMarginPercent || 50);
    setStandaloneIncludeRice(item.includeRice ?? true);
    if (item.ricePortionGrams) setStandaloneRicePortionGrams(item.ricePortionGrams);
    if (item.riceCostPerGram) setStandaloneRiceCostPerGram(item.riceCostPerGram);

    // 0. If this item has exact saved batch ingredients, load them directly without recalculation!
    if (item.batchIngredients && item.batchIngredients.length > 0) {
      setStandaloneIngredients(item.batchIngredients);
      const totalCost = item.totalBatchCost !== undefined && item.totalBatchCost > 0
        ? item.totalBatchCost
        : item.batchIngredients.reduce((sum, ing) => sum + (Number(ing.cost) || 0), 0);
      setStandaloneTotalBatchCost(totalCost);

      if (item.garnishes && item.garnishes.length > 0) {
        setStandaloneIncludeGarnishes(true);
        setStandaloneSelectedGarnishes(item.garnishes);
      }
      if (item.packaging && item.packaging.length > 0) {
        setStandaloneIncludePackaging(true);
        setStandaloneSelectedPackaging(item.packaging);
      }
      setIsBatchCalcModalOpen(true);
      return;
    }

    const bWeight = Math.max(1, batchG);
    const sGrams = Math.max(1, servingG);
    const multiplier = bWeight / sGrams;

    if (item.recipeRequirements && item.recipeRequirements.length > 0) {
      // 1. Separate rice requirement to standalone rice section
      const riceReq = item.recipeRequirements.find(r => isRiceRequirement(r.name));
      if (riceReq) {
        setStandaloneIncludeRice(true);
        if (Number(riceReq.amount) > 0) {
          setStandaloneRicePortionGrams(Number(riceReq.amount));
        }
        setStandaloneSelectedRiceIngredient(riceReq.name);
      } else {
        setStandaloneIncludeRice(false);
        setStandaloneSelectedRiceIngredient('');
      }

      // 2. Separate garnishes & sides requirements to standalone garnishes section (Per Serving)
      const garnishReqs = item.recipeRequirements.filter(r => isGarnishRequirement(r.name));
      if (garnishReqs.length > 0) {
        setStandaloneIncludeGarnishes(true);
        const mappedGarnishes = garnishReqs.map(g => {
          const invMatch = (ingredientsInventory || []).find(inv => inv.name.toLowerCase() === g.name.toLowerCase());
          const pCost = getGarnishPieceCost(g.name, undefined, invMatch);
          const gramsPerPc = getGarnishGramsPerPiece(g.name, invMatch);
          const isGramUnit = invMatch?.unit === 'g' || invMatch?.unit === 'kg';
          const amt = isGramUnit && Number(g.amount) > 1 && !g.name.toLowerCase().includes('/pc')
            ? Math.max(1, Math.round(Number(g.amount) / gramsPerPc))
            : (Number(g.amount) || 1);

          return {
            name: g.name,
            amount: amt,
            costPerUnit: pCost,
            unit: 'pcs',
            selected: true
          };
        });
        setStandaloneSelectedGarnishes(mappedGarnishes);
      } else {
        setStandaloneIncludeGarnishes(false);
      }

      // 3. Separate packaging requirements to standalone packaging section
      const pkgReqs = item.recipeRequirements.filter(r => isPackagingRequirement(r.name));
      if (pkgReqs.length > 0) {
        setStandaloneIncludePackaging(true);
        const mappedPkgs = pkgReqs.map(p => {
          const invMatch = ingredientsInventory.find(inv => inv.name.toLowerCase() === p.name.toLowerCase());
          return {
            name: p.name,
            amount: Number(p.amount) || 1,
            costPerUnit: Number(invMatch?.costPerUnit) || (p.name.toLowerCase().includes('bowl') ? 2.50 : 1.50),
            unit: invMatch?.unit || 'pcs',
            selected: true
          };
        });
        setStandaloneSelectedPackaging(mappedPkgs);
      } else {
        setStandaloneIncludePackaging(false);
      }

      // 4. Extract only viand raw materials for the batch
      const converted = item.recipeRequirements
        .filter(r => isViandRequirement(r.name))
        .map(r => {
          const inv = ingredientsInventory.find(i => i.name.toLowerCase() === r.name.toLowerCase());
          const unit = inv?.unit || 'g';
          const isCountable = unit === 'pcs' || unit === 'cans' || unit === 'pc' || unit === 'pack';
          const batchAmount = isCountable 
            ? Math.max(1, Math.round(Number(r.amount) * multiplier))
            : Number((Number(r.amount) * multiplier).toFixed(1));
          const cost = computeInventoryIngredientCost(r.name, batchAmount, unit);
          return {
            name: r.name,
            batchAmount,
            unit,
            cost
          };
        });

      if (converted.length > 0) {
        setStandaloneIngredients(converted);
        const totalCost = converted.reduce((sum, ing) => sum + (Number(ing.cost) || 0), 0);
        setStandaloneTotalBatchCost(totalCost);
      } else {
        setStandaloneIngredients([]);
        setStandaloneTotalBatchCost(0);
      }
    } else if (item.ingredients && item.ingredients.length > 0) {
      const converted = item.ingredients
        .filter(name => isViandRequirement(name))
        .map(name => {
          const inv = ingredientsInventory.find(i => i.name.toLowerCase() === name.toLowerCase());
          const unit = inv?.unit || 'g';
          const defaultBatchAmt = unit === 'kg' ? 1.5 : unit === 'pcs' ? 15 : 200;
          const cost = computeInventoryIngredientCost(name, defaultBatchAmt, unit);
          return {
            name,
            batchAmount: defaultBatchAmt,
            unit,
            cost
          };
        });
      if (converted.length > 0) {
        setStandaloneIngredients(converted);
        const totalCost = converted.reduce((sum, ing) => sum + (Number(ing.cost) || 0), 0);
        setStandaloneTotalBatchCost(totalCost);
      } else {
        setStandaloneIngredients([]);
        setStandaloneTotalBatchCost(0);
      }
    } else {
      setStandaloneIngredients([]);
      setStandaloneTotalBatchCost(0);
    }

    setIsBatchCalcModalOpen(true);
  };
  const handleQuickLoadSisigInRecipeForm = () => {
    const sisigReqs = [
      { name: 'Crispy Pork Belly / Mask', amount: 70 },
      { name: 'Minced Chicken Liver', amount: 10 },
      { name: 'White & Red Onions', amount: 8 },
      { name: 'Green & Red Chili (Siling Haba)', amount: 3 },
      { name: 'Calamansi Juice Seasoning', amount: 3 },
      { name: 'Soy Sauce & Liquid Seasoning', amount: 3 },
      { name: 'Japanese Mayonnaise', amount: 3 }
    ];

    setFormRecipeRequirements(sisigReqs);
    if (!formName || formName === 'New Dish Recipe') {
      setFormName('Sizzling Pork Sisig Plate');
    }
    setFormServingSizeGrams(90);
    setFormBatchYieldGrams(2000);
    setFormIncludeRice(true);
    setFormRicePortionGrams(150);
    setFormRiceCostPerGram(0.04);
    setFormTargetMargin(55);
    setFormCategory('silog');
    setFormDescription('Authentic Pampanga-style crispy pork belly & jowl tossed with chicken liver, white onions, siling haba, and calamansi seasoning. Served with hot steamed rice.');
    setFormIngredients(sisigReqs.map(r => r.name).concat('Steamed Rice').join(', '));
  };

  const handleSendRecipeFormToBatchCalc = () => {
    const dishName = formName || 'Custom Recipe';
    setStandaloneRecipeName(dishName);
    const unit = formBatchYieldUnit || 'g';
    setStandaloneBatchUnit(unit);
    const servingG = Number(formServingSizeGrams) || (unit === 'pcs' ? 4 : 90);
    const batchG = Number(formBatchYieldGrams) || (unit === 'pcs' ? 100 : 2000);
    setStandaloneServingGrams(servingG);
    setStandaloneBatchWeight(batchG);
    setStandaloneTargetMargin(Number(formTargetMargin) || 50);
    setStandaloneIncludeRice(formIncludeRice);
    setStandaloneRicePortionGrams(Number(formRicePortionGrams) || 150);
    setStandaloneRiceCostPerGram(Number(formRiceCostPerGram) || 0.04);
    setStandaloneSelectedRiceIngredient(formSelectedRiceIngredient);

    // 0. If the recipe form already has saved batch ingredients, load them directly!
    if (formBatchIngredients && formBatchIngredients.length > 0) {
      setStandaloneIngredients(formBatchIngredients);
      const totalCost = Number(formBatchTotalCost) || formBatchIngredients.reduce((sum, ing) => sum + (Number(ing.cost) || 0), 0);
      setStandaloneTotalBatchCost(totalCost);

      if (formGarnishes && formGarnishes.length > 0) {
        setStandaloneIncludeGarnishes(true);
        setStandaloneSelectedGarnishes(formGarnishes);
      }
      if (formPackaging && formPackaging.length > 0) {
        setStandaloneIncludePackaging(true);
        setStandaloneSelectedPackaging(formPackaging);
      }
      setIsBatchCalcModalOpen(true);
      return;
    }

    const multiplier = batchG / Math.max(1, servingG);
    if (formRecipeRequirements.length > 0) {
      // 1. Deduplicate & normalize requirements
      const normalizedReqs = deduplicateAndNormalizeRequirements(formRecipeRequirements);
      setFormRecipeRequirements(normalizedReqs);

      // 2. Separate rice requirement to standalone rice section
      const riceReq = normalizedReqs.find(r => isRiceRequirement(r.name));
      if (riceReq) {
        setStandaloneIncludeRice(true);
        if (Number(riceReq.amount) > 0) setStandaloneRicePortionGrams(Number(riceReq.amount));
        setStandaloneSelectedRiceIngredient(riceReq.name);
      }

      // 3. Separate garnishes & sides requirements to standalone garnishes section (Per Serving)
      const garnishReqs = normalizedReqs.filter(r => isGarnishRequirement(r.name));
      if (garnishReqs.length > 0) {
        setStandaloneIncludeGarnishes(true);
        const mappedGarnishes = garnishReqs.map(g => {
          const invMatch = (ingredientsInventory || []).find(inv => inv.name.toLowerCase() === g.name.toLowerCase());
          const pCost = getGarnishPieceCost(g.name, undefined, invMatch);
          const gramsPerPc = getGarnishGramsPerPiece(g.name, invMatch);
          const isGramUnit = invMatch?.unit === 'g' || invMatch?.unit === 'kg';
          const amt = isGramUnit && Number(g.amount) > 1 && !g.name.toLowerCase().includes('/pc')
            ? Math.max(1, Math.round(Number(g.amount) / gramsPerPc))
            : (Number(g.amount) || 1);

          return {
            name: g.name,
            amount: amt,
            costPerUnit: pCost,
            unit: 'pcs',
            selected: true
          };
        });
        setStandaloneSelectedGarnishes(mappedGarnishes);
      } else {
        setStandaloneIncludeGarnishes(false);
      }

      // 4. Separate packaging requirements to standalone packaging section
      const pkgReqs = normalizedReqs.filter(r => isPackagingRequirement(r.name));
      if (pkgReqs.length > 0) {
        setStandaloneIncludePackaging(true);
        const mappedPkgs = pkgReqs.map(p => {
          const invMatch = ingredientsInventory.find(inv => inv.name.toLowerCase() === p.name.toLowerCase());
          return {
            name: p.name,
            amount: Number(p.amount) || 1,
            costPerUnit: Number(invMatch?.costPerUnit) || (p.name.toLowerCase().includes('bowl') ? 2.50 : 1.50),
            unit: invMatch?.unit || 'pcs',
            selected: true
          };
        });
        setStandaloneSelectedPackaging(mappedPkgs);
      } else {
        setStandaloneIncludePackaging(false);
      }
      // 4. Extract only viand raw materials for the batch
      const converted = normalizedReqs
        .filter(r => isViandRequirement(r.name))
        .map(r => {
          const inv = ingredientsInventory.find(i => i.name.toLowerCase() === r.name.toLowerCase());
          const unit = inv?.unit || 'g';
          const isCountable = unit === 'pcs' || unit === 'cans' || unit === 'pc' || unit === 'pack';
          const batchAmount = isCountable 
            ? Math.max(1, Math.round(Number(r.amount) * multiplier))
            : Number((Number(r.amount) * multiplier).toFixed(1));
          const cost = computeInventoryIngredientCost(r.name, batchAmount, unit);
          return {
            name: r.name,
            batchAmount,
            unit,
            cost
          };
        });

      if (converted.length > 0) {
        setStandaloneIngredients(converted);
        const totalCost = converted.reduce((sum, ing) => sum + (Number(ing.cost) || 0), 0);
        setStandaloneTotalBatchCost(totalCost);
      }
    }
    setIsBatchCalcModalOpen(true);
  };

  // Image Zoom, Pan & Crop Editor state
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState('');
  const [cropZoom, setCropZoom] = useState(1.0);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [cropRotation, setCropRotation] = useState(0);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [cropperViewTab, setCropperViewTab] = useState<'crop' | 'preview'>('crop');

  const handleOpenCropper = (srcUrl: string) => {
    if (!srcUrl) return;
    setCropperSrc(srcUrl);
    setCropZoom(1.0);
    setCropOffsetX(0);
    setCropOffsetY(0);
    setCropRotation(0);
    setCropperViewTab('crop');
    setIsCropperOpen(true);
  };

  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingCrop(true);
    setDragStartPos({ x: e.clientX - cropOffsetX, y: e.clientY - cropOffsetY });
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCrop) return;
    e.preventDefault();
    setCropOffsetX(e.clientX - dragStartPos.x);
    setCropOffsetY(e.clientY - dragStartPos.y);
  };

  const handleCropMouseUp = () => {
    setIsDraggingCrop(false);
  };

  const handleCropTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDraggingCrop(true);
      setDragStartPos({ x: touch.clientX - cropOffsetX, y: touch.clientY - cropOffsetY });
    }
  };

  const handleCropTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingCrop || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setCropOffsetX(touch.clientX - dragStartPos.x);
    setCropOffsetY(touch.clientY - dragStartPos.y);
  };

  const handleCropTouchEnd = () => {
    setIsDraggingCrop(false);
  };

  const handleApplyCrop = () => {
    if (!cropperSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = cropperSrc;
    img.onload = () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0D0D0C';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate((cropRotation * Math.PI) / 180);

      const scaleX = canvasWidth / img.width;
      const scaleY = canvasHeight / img.height;
      const baseScale = Math.max(scaleX, scaleY);
      const totalScale = baseScale * cropZoom;

      const drawWidth = img.width * totalScale;
      const drawHeight = img.height * totalScale;

      const previewRatio = canvasWidth / 400;
      const finalOffsetX = cropOffsetX * previewRatio;
      const finalOffsetY = cropOffsetY * previewRatio;

      ctx.drawImage(
        img,
        -drawWidth / 2 + finalOffsetX,
        -drawHeight / 2 + finalOffsetY,
        drawWidth,
        drawHeight
      );

      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setFormImage(dataUrl);
      setIsCropperOpen(false);
    };
    img.onerror = () => {
      alert("Failed to load image for cropping. Please check image URL or file.");
    };
  };

  // New inline ingredient form states (for adding from menu item form)
  const [showInlineNewIngredient, setShowInlineNewIngredient] = useState(false);
  const [inlineIngName, setInlineIngName] = useState('');
  const [inlineIngQty, setInlineIngQty] = useState<number | ''>(1000);
  const [inlineIngUnit, setInlineIngUnit] = useState('g');
  const [inlineIngLowStock, setInlineIngLowStock] = useState<number | ''>(200);
  const [inlineIngCost, setInlineIngCost] = useState<number | ''>(0.05);

  const handleInlineUnitChange = (unit: string) => {
    setInlineIngUnit(unit);
    if (unit === 'pcs') {
      setInlineIngQty(10);
      setInlineIngLowStock(2);
      setInlineIngCost(15.00);
    } else if (unit === 'cans') {
      setInlineIngQty(10);
      setInlineIngLowStock(2);
      setInlineIngCost(45.00);
    } else if (unit === 'kg') {
      setInlineIngQty(5);
      setInlineIngLowStock(1);
      setInlineIngCost(150.00);
    } else if (unit === 'ml') {
      setInlineIngQty(1000);
      setInlineIngLowStock(200);
      setInlineIngCost(0.08);
    } else { // 'g'
      setInlineIngQty(1000);
      setInlineIngLowStock(200);
      setInlineIngCost(0.05);
    }
  };

  const handleCreateInlineIngredient = () => {
    if (!inlineIngName.trim()) {
      alert("Please enter a valid ingredient name!");
      return;
    }
    const exists = ingredientsInventory.some(
      (i) => i.name.toLowerCase() === inlineIngName.trim().toLowerCase()
    );
    if (exists) {
      alert("An ingredient with this name already exists in the inventory!");
      return;
    }

    // Call the prop callback to add it to inventory
    onAddIngredient(
      inlineIngName.trim(),
      Number(inlineIngQty) || 0,
      inlineIngUnit,
      Number(inlineIngLowStock) || 0,
      Number(inlineIngCost) || 0
    );

    // Link it to this recipe automatically
    const defaultAmt = (inlineIngUnit === 'pcs' || inlineIngUnit === 'cans') ? 1 : 100;
    setFormRecipeRequirements([
      ...formRecipeRequirements,
      { name: inlineIngName.trim(), amount: defaultAmt }
    ]);

    // Append to ingredients tags text if not already present
    const tags = formIngredients.split(',').map(t => t.trim()).filter(Boolean);
    if (!tags.some(t => t.toLowerCase() === inlineIngName.trim().toLowerCase())) {
      tags.push(inlineIngName.trim());
      setFormIngredients(tags.join(', '));
    }

    // Reset and close
    setInlineIngName('');
    setInlineIngQty(1000);
    setInlineIngUnit('g');
    setInlineIngLowStock(200);
    setInlineIngCost(0.05);
    setShowInlineNewIngredient(false);
  };


  // Calculate Metrics
  const stats = (() => {
    const isToday = (timestampStr?: string) => {
      if (!timestampStr) return true;
      const d = new Date(timestampStr);
      if (isNaN(d.getTime())) return true;
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    };

    const totalSales = orders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const todaySales = orders
      .filter((o) => o.status === 'delivered' && isToday(o.timestamp))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const todayOrdersCount = orders.filter((o) => isToday(o.timestamp)).length;

    const activeCount = orders.filter(
      (o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'dispatched'
    ).length;

    const completedCount = orders.filter((o) => o.status === 'delivered').length;
    const todayCompletedCount = orders.filter((o) => o.status === 'delivered' && isToday(o.timestamp)).length;

    const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;
    const todayCancelledCount = orders.filter((o) => o.status === 'cancelled' && isToday(o.timestamp)).length;

    return { 
      totalSales, 
      todaySales, 
      todayOrdersCount,
      activeCount, 
      completedCount, 
      todayCompletedCount,
      cancelledCount,
      todayCancelledCount
    };
  })();

  const getUnitPrice = (unit: string, ingId?: string) => {
    if (ingId) {
      const ing = ingredientsInventory.find(i => i.id === ingId);
      if (ing && ing.costPerUnit !== undefined && ing.costPerUnit !== null) {
        return ing.costPerUnit;
      }
    }
    switch (unit.toLowerCase()) {
      case 'g': return 0.05;
      case 'kg': return 150.00;
      case 'pcs': return 15.00;
      case 'ml': return 0.08;
      case 'cans': return 45.00;
      default: return 5.00;
    }
  };

  const calculatePeriodFinancials = (daysCount: number, selectedMonth: string = selectedFinancialMonth) => {
    let startDate: Date;
    let endDate: Date;
    let periodTitle = '';
    let effectiveDaysCount = daysCount;

    const formatShortDate = (d: Date, withWeekday = false) => {
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      };
      if (withWeekday) options.weekday = 'short';
      return d.toLocaleDateString('en-US', options);
    };

    if (selectedMonth && selectedMonth !== 'all') {
      const [targetYear, targetMonth] = selectedMonth.split('-').map(Number);
      const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();
      const now = new Date();
      const isCurrentMonth = now.getFullYear() === targetYear && (now.getMonth() + 1) === targetMonth;
      const endDay = isCurrentMonth ? now.getDate() : totalDaysInMonth;

      if (daysCount === 1) {
        endDate = new Date(targetYear, targetMonth - 1, endDay, 23, 59, 59, 999);
        startDate = new Date(targetYear, targetMonth - 1, endDay, 0, 0, 0, 0);
        effectiveDaysCount = 1;
        periodTitle = 'Daily (1d)';
      } else if (daysCount === 7) {
        const startDay = Math.max(1, endDay - 6);
        endDate = new Date(targetYear, targetMonth - 1, endDay, 23, 59, 59, 999);
        startDate = new Date(targetYear, targetMonth - 1, startDay, 0, 0, 0, 0);
        effectiveDaysCount = endDay - startDay + 1;
        periodTitle = 'Weekly (7d)';
      } else if (daysCount === 30) {
        startDate = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
        endDate = new Date(targetYear, targetMonth - 1, totalDaysInMonth, 23, 59, 59, 999);
        effectiveDaysCount = totalDaysInMonth;
        periodTitle = `Monthly (${totalDaysInMonth}d)`;
      } else {
        endDate = new Date(targetYear, targetMonth - 1, totalDaysInMonth, 23, 59, 59, 999);
        startDate = new Date(targetYear - 1, targetMonth - 1, 1, 0, 0, 0, 0);
        effectiveDaysCount = 365;
        periodTitle = 'Yearly (365d)';
      }
    } else {
      const now = new Date();
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      if (daysCount === 1) {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        effectiveDaysCount = 1;
        periodTitle = 'Today (Daily)';
      } else if (daysCount === 7) {
        startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        effectiveDaysCount = 7;
        periodTitle = 'Weekly (7d)';
      } else if (daysCount === 30) {
        startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        effectiveDaysCount = 30;
        periodTitle = 'Monthly (30d)';
      } else {
        startDate = new Date(now.getTime() - 364 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        effectiveDaysCount = 365;
        periodTitle = 'Yearly (365d)';
      }
    }

    const dateRangeText = (daysCount === 1)
      ? formatShortDate(startDate, true)
      : `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;

    const periodOrders = orders.filter((o) => {
      if (!o.timestamp) return false;
      const orderDate = new Date(o.timestamp);
      return orderDate.getTime() >= startDate.getTime() && orderDate.getTime() <= endDate.getTime();
    });

    let deliveredOrders = periodOrders.filter(o => o.status === 'delivered');
    if (deliveredOrders.length === 0) {
      deliveredOrders = periodOrders.filter(o => o.status !== 'cancelled');
    }

    const totalSales = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    let ingredientsCost = 0;
    let totalDishes = 0;

    deliveredOrders.forEach(order => {
      order.items.forEach(cartItem => {
        totalDishes += cartItem.quantity;
        const item = cartItem.menuItem;
        const qty = cartItem.quantity;

        if (item.recipeRequirements && item.recipeRequirements.length > 0) {
          item.recipeRequirements.forEach(req => {
            const ing = ingredientsInventory.find(i => i.name.toLowerCase() === req.name.toLowerCase());
            const unitPrice = getUnitPrice(ing ? ing.unit : 'g', ing?.id);
            const amountFactor = (ing && ing.unit === 'kg') ? req.amount / 1000 : req.amount;
            ingredientsCost += amountFactor * unitPrice * qty;
          });
        } else if (item.ingredients && item.ingredients.length > 0) {
          item.ingredients.forEach(ingName => {
            const ing = ingredientsInventory.find(i => i.name.toLowerCase() === ingName.toLowerCase());
            const unit = ing ? ing.unit : 'g';
            const reqPerServing = (unit === 'pcs' || unit === 'cans') ? 1 : unit === 'kg' ? 0.1 : 100;
            ingredientsCost += reqPerServing * getUnitPrice(unit, ing?.id) * qty;
          });
        } else {
          ingredientsCost += (item.price * 0.35) * qty;
        }
      });
    });

    const rateFactor = effectiveDaysCount;

    const electricityBaseComponent = electricityBaseRate * rateFactor;
    const electricityVariableComponent = totalDishes * electricityVariableRate;
    const electricityCost = electricityBaseComponent + electricityVariableComponent;

    const waterCost = waterBaseRate * rateFactor;
    const rentCost = rentBaseRate * rateFactor;
    const laborCost = laborBaseRate * rateFactor;
    const gasCost = gasBaseRate * rateFactor;
    const otherCost = otherBaseRate * rateFactor;

    const operationalOverhead = electricityCost + waterCost + rentCost + laborCost + gasCost + otherCost;
    const totalExpenses = ingredientsCost + operationalOverhead;
    const netIncome = totalSales - totalExpenses;
    const netMarginPercent = totalSales > 0 ? (netIncome / totalSales) * 100 : 0;

    return {
      label: periodTitle,
      dateRangeText,
      daysCount: effectiveDaysCount,
      ordersCount: deliveredOrders.length,
      dishesCount: totalDishes,
      totalSales,
      ingredientsCost,
      electricityCost,
      waterCost,
      rentCost,
      laborCost,
      gasCost,
      otherCost,
      operationalOverhead,
      totalExpenses,
      netIncome,
      netMarginPercent
    };
  };

  // Compute Restock forecasts & ingredient metrics
  const forecastData = (() => {
    // 1. Compute historical usage
    const historicalUsage: Record<string, number> = {};
    ingredientsInventory.forEach((i) => {
      historicalUsage[i.id] = 0;
    });

    let completedOrders = orders.filter((o) => o.status === 'delivered');
    if (completedOrders.length === 0) {
      completedOrders = orders.filter((o) => o.status !== 'cancelled');
    }

    let daysSpan = 1;
    if (completedOrders.length > 1) {
      const times = completedOrders.map((o) => new Date(o.timestamp).getTime());
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const diffDays = (maxTime - minTime) / (1000 * 60 * 60 * 24);
      daysSpan = Math.max(1, Math.ceil(diffDays));
    }

    completedOrders.forEach((order) => {
      order.items.forEach((cartItem) => {
        const item = cartItem.menuItem;
        const qty = cartItem.quantity;

        if (item.recipeRequirements && item.recipeRequirements.length > 0) {
          item.recipeRequirements.forEach((req) => {
            const ing = ingredientsInventory.find(
              (i) => i.name.toLowerCase() === req.name.toLowerCase()
            );
            if (ing) {
              const reqAmt = ing.unit === 'kg' ? req.amount / 1000 : req.amount;
              historicalUsage[ing.id] += reqAmt * qty;
            }
          });
        } else if (item.ingredients && item.ingredients.length > 0) {
          item.ingredients.forEach((ingName) => {
            const ing = ingredientsInventory.find(
              (i) => i.name.toLowerCase() === ingName.toLowerCase()
            );
            if (ing) {
              const amt = (ing.unit === 'pcs' || ing.unit === 'cans') ? 1 : ing.unit === 'kg' ? 0.1 : 100;
              historicalUsage[ing.id] += amt * qty;
            }
          });
        }
      });
    });

    // 2. Compute simulated projections
    const simulatedUsage: Record<string, number> = {};
    ingredientsInventory.forEach((i) => {
      simulatedUsage[i.id] = 0;
    });

    if (menuItems.length > 0) {
      const totalWeight = menuItems.reduce((sum, item) => sum + (item.popular ? 2 : 1), 0);
      menuItems.forEach((item) => {
        const weight = item.popular ? 2 : 1;
        const expectedOrdersPerDay = (salesPace * weight) / totalWeight;

        if (item.recipeRequirements && item.recipeRequirements.length > 0) {
          item.recipeRequirements.forEach((req) => {
            const ing = ingredientsInventory.find(
              (i) => i.name.toLowerCase() === req.name.toLowerCase()
            );
            if (ing) {
              const reqAmt = ing.unit === 'kg' ? req.amount / 1000 : req.amount;
              simulatedUsage[ing.id] += reqAmt * expectedOrdersPerDay;
            }
          });
        } else if (item.ingredients && item.ingredients.length > 0) {
          item.ingredients.forEach((ingName) => {
            const ing = ingredientsInventory.find(
              (i) => i.name.toLowerCase() === ingName.toLowerCase()
            );
            if (ing) {
              const amt = (ing.unit === 'pcs' || ing.unit === 'cans') ? 1 : ing.unit === 'kg' ? 0.1 : 100;
              simulatedUsage[ing.id] += amt * expectedOrdersPerDay;
            }
          });
        }
      });
    }

    // Now compute the daily consumption rate per ingredient based on active mode
    return ingredientsInventory.map((ing) => {
      const realDailyRate = historicalUsage[ing.id] / daysSpan;
      const simulatedDailyRate = simulatedUsage[ing.id];
      const dailyRate = forecastMode === 'real' ? realDailyRate : simulatedDailyRate;

      // target quantity for safety buffer based on period selected
      const neededQty = dailyRate * forecastPeriodDays;
      // We flag low stock if current is below alert level, or if remaining stock is less than needed period
      const isUrgent = ing.quantity <= ing.lowStockAlert || ing.quantity < neededQty || ing.quantity === 0;
      
      // Calculate a recommended target quantity that brings inventory back to a healthy state
      // Safety targets: 1.5x of the projected need, or at least 1.5x of their low-stock-alert level
      const safetyPeriodDays = Math.max(forecastPeriodDays, 3); // minimum 3 days safe buffer
      const targetQuantity = Math.max(
        dailyRate * safetyPeriodDays,
        ing.lowStockAlert * 2,
        ing.unit === 'pcs' || ing.unit === 'cans' ? 15 : ing.unit === 'kg' ? 1.5 : 1500
      );
      const recommendedRestock = Math.max(0, Math.ceil(targetQuantity - ing.quantity));

      return {
        ...ing,
        realDailyRate,
        simulatedDailyRate,
        dailyRate,
        neededQty,
        isUrgent,
        recommendedRestock,
        daysOfStockLeft: dailyRate > 0 ? ing.quantity / dailyRate : (ing.quantity > 0 ? Infinity : 0),
      };
    });
  })();

  // Compute shopping list requirements based on user's selected prep counts
  const shoppingListData = (() => {
    const requiredAmounts: Record<string, { amount: number; unit: string; ingredientId: string }> = {};

    Object.entries(prepQuantities).forEach(([itemId, servings]) => {
      const servingsVal = typeof servings === 'number' ? servings : Number(servings) || 0;
      if (servingsVal <= 0) return;
      const item = menuItems.find((i) => i.id === itemId);
      if (!item) return;

      if (item.recipeRequirements && item.recipeRequirements.length > 0) {
        item.recipeRequirements.forEach((req) => {
          const ing = ingredientsInventory.find(
            (i) => i.name.toLowerCase() === req.name.toLowerCase()
          );
          if (ing) {
            const key = ing.name;
            if (!requiredAmounts[key]) {
              requiredAmounts[key] = { amount: 0, unit: ing.unit, ingredientId: ing.id };
            }
            const factor = ing.unit === 'kg' ? req.amount / 1000 : req.amount;
            requiredAmounts[key].amount += factor * servingsVal;
          }
        });
      } else if (item.ingredients && item.ingredients.length > 0) {
        item.ingredients.forEach((ingName) => {
          const ing = ingredientsInventory.find(
            (i) => i.name.toLowerCase() === ingName.toLowerCase()
          );
          if (ing) {
            const key = ing.name;
            if (!requiredAmounts[key]) {
              requiredAmounts[key] = { amount: 0, unit: ing.unit, ingredientId: ing.id };
            }
            const amt = (ing.unit === 'pcs' || ing.unit === 'cans') ? 1 : ing.unit === 'kg' ? 0.1 : 100;
            requiredAmounts[key].amount += amt * servingsVal;
          }
        });
      }
    });

    return Object.entries(requiredAmounts).map(([name, req]) => {
      const ing = ingredientsInventory.find((i) => i.id === req.ingredientId);
      const currentQty = ing ? ing.quantity : 0;
      const neededToBuy = Math.max(0, req.amount - currentQty);

      return {
        name,
        ingredientId: req.ingredientId,
        requiredAmount: req.amount,
        currentQty,
        unit: req.unit,
        neededToBuy,
      };
    });
  })();

  // Combine recipe prep calculations with custom restocks added to buy list
  const combinedShoppingListData = (() => {
    const list: Array<{
      ingredientId: string;
      name: string;
      neededToBuy: number;
      originalDeficit: number;
      requiredAmount: number;
      currentQty: number;
      unit: string;
      source: 'prep' | 'forecast' | 'both';
      hasOverride: boolean;
    }> = [];

    // 1. Add all from shoppingListData (which came from recipe prep targets)
    shoppingListData.forEach((item) => {
      const hasOverride = restockBuyList[item.ingredientId] !== undefined;
      const finalNeeded = hasOverride ? restockBuyList[item.ingredientId] : item.neededToBuy;
      
      // If we don't need to purchase anything AND there is no required amount from prep, skip it.
      if (finalNeeded <= 0 && item.requiredAmount <= 0) return;

      list.push({
        ingredientId: item.ingredientId,
        name: item.name,
        neededToBuy: Math.max(0, finalNeeded),
        originalDeficit: item.neededToBuy,
        requiredAmount: item.requiredAmount,
        currentQty: item.currentQty,
        unit: item.unit,
        source: hasOverride ? 'both' : 'prep',
        hasOverride,
      });
    });

    // 2. Add any from restockBuyList (which came from low-stock forecast alerts) that are not already in list
    Object.entries(restockBuyList).forEach(([ingId, qty]) => {
      const numQty = typeof qty === 'number' ? qty : Number(qty) || 0;
      if (numQty <= 0) return;
      const alreadyInList = list.find((item) => item.ingredientId === ingId);
      if (alreadyInList) return;

      const ing = ingredientsInventory.find((i) => i.id === ingId);
      if (ing) {
        const fItem = forecastData.find(f => f.id === ingId);
        const origDeficit = fItem ? fItem.recommendedRestock : numQty;
        
        list.push({
          ingredientId: ingId,
          name: ing.name,
          neededToBuy: numQty,
          originalDeficit: origDeficit,
          requiredAmount: ing.quantity + origDeficit,
          currentQty: ing.quantity,
          unit: ing.unit,
          source: 'forecast',
          hasOverride: numQty !== origDeficit,
        });
      }
    });

    return list;
  })();

  // Helper to check if an order timestamp is today
  const isTodayOrder = (timestamp?: string) => {
    if (!timestamp) return false;
    const d = new Date(timestamp);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  };

  const isSameDay = (dateStr1?: string, date2?: Date) => {
    if (!dateStr1) return false;
    const d1 = new Date(dateStr1);
    const d2 = date2 || new Date();
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  // Active Kitchen Queue: Show all active orders + Today's completed/cancelled orders
  const todayOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'pending' || o.status === 'preparing' || o.status === 'dispatched') {
        return true;
      }
      return isTodayOrder(o.timestamp);
    });
  }, [orders]);

  // Filtered Orders for the Queue
  const filteredOrders = todayOrders.filter((o) => {
    if (filterStatus === 'active') {
      return o.status === 'pending' || o.status === 'preparing' || o.status === 'dispatched';
    }
    if (filterStatus === 'completed') {
      return o.status === 'delivered' || o.status === 'cancelled';
    }
    return true; // all today's orders
  });

  // Open Form Modal for Creating dynamic item
  const handleOpenAddForm = () => {
    setEditingItem(null);
    setFormName('');
    setFormDescription('');
    setFormPrice(130);
    setFormCategory('bento');
    setFormImage(IMAGE_PRESETS[2].url); // select Bento preset as default
    setFormOriginalImage(IMAGE_PRESETS[2].url);
    setFormSpicy(false);
    setFormPopular(false);
    setFormIngredients('');
    setFormRecipeRequirements([]);
    setFormBatchIngredients([]);
    setFormGarnishes([]);
    setFormPackaging([]);
    setFormTargetMargin(50);
    setBatchServingsTarget(20);
    setFormElecOverhead(3.00);
    setFormGasOverhead(2.50);
    setFormWaterOverhead(1.00);
    setFormPkgOverhead(0.00);
    setFormBatchYieldGrams(2000);
    setFormServingSizeGrams(90);
    setFormBatchTotalCost(3000);
    setBatchYieldInputMode('quick');
    setFormIncludeRice(true);
    setFormRicePortionGrams(150);
    setFormRiceCostMode('simple');
    setFormRiceCostPerGram(0.04);
    setFormRawRiceKg(2);
    setFormRawRiceCostKg(50);
    setFormRiceExpansionRatio(2.3);
    setFormRiceOverhead(10);
    setFormCustomOptions([
      {
        id: 'opt-' + Math.random().toString(36).substr(2, 4),
        title: 'Rice (Included with Meal)',
        choices: [
          { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: 'Garlic Rice', price: 0 },
          { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: 'Plain Rice', price: 0 },
          { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: 'Java Rice', price: 20 },
        ]
      },
      {
        id: 'opt-' + Math.random().toString(36).substr(2, 4),
        title: 'Extra Rice (Add-on)',
        choices: [
          { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: 'No Extra Rice', price: 0 },
          { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: '+1 Extra Plain Rice', price: 15 },
          { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: '+1 Extra Garlic Rice', price: 20 },
          { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: '+1 Extra Java Rice', price: 25 },
        ]
      }
    ]);
    setIsFormOpen(true);
  };

  // Open Form Modal for Editing dynamic item
  const handleOpenEditForm = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description);
    setFormPrice(item.price);
    setFormCategory(item.category);
    setFormImage(item.image);
    setFormOriginalImage(item.image);
    setFormSpicy(item.spicy || false);
    setFormPopular(item.popular || false);
    const normalizedReqs = deduplicateAndNormalizeRequirements(item.recipeRequirements || []);
    setFormIngredients(item.ingredients ? item.ingredients.join(', ') : normalizedReqs.map(r => r.name).join(', '));
    setFormRecipeRequirements(normalizedReqs);
    setFormBatchIngredients(item.batchIngredients || []);
    setFormGarnishes(item.garnishes || []);
    setFormPackaging(item.packaging || []);
    setFormTargetMargin(item.targetMarginPercent !== undefined ? item.targetMarginPercent : 50);
    setBatchServingsTarget(20);
    setFormElecOverhead(item.utilityOverhead?.electricity !== undefined ? item.utilityOverhead.electricity : 3.00);
    setFormGasOverhead(item.utilityOverhead?.gas !== undefined ? item.utilityOverhead.gas : 2.50);
    setFormWaterOverhead(item.utilityOverhead?.water !== undefined ? item.utilityOverhead.water : 1.00);
    setFormPkgOverhead(item.utilityOverhead?.packaging !== undefined ? item.utilityOverhead.packaging : 0.00);
    setFormBatchYieldUnit(item.batchYieldUnit || 'g');
    setFormServingSizeUnit(item.servingSizeUnit || 'g');
    setFormBatchYieldGrams(item.batchYieldGrams !== undefined ? item.batchYieldGrams : (item.batchYieldUnit === 'pcs' ? 100 : 2000));
    setFormServingSizeGrams(item.servingSizeGrams !== undefined ? item.servingSizeGrams : (item.servingSizeUnit === 'pcs' ? 4 : 90));
    setFormBatchTotalCost(item.totalBatchCost !== undefined ? item.totalBatchCost : 3000);
    setBatchYieldInputMode('quick');

    const riceReq = normalizedReqs.find(r => isRiceRequirement(r.name));
    setFormIncludeRice(item.includeRice !== undefined ? item.includeRice : (item.category !== 'drinks' && (riceReq !== undefined || item.category === 'bento' || item.category === 'silog' || item.category === 'rice-bowl')));
    setFormRicePortionGrams(item.ricePortionGrams || (riceReq ? riceReq.amount : 150));
    setFormRiceCostPerGram(item.riceCostPerGram || 0.04);
    setFormSelectedRiceIngredient(riceReq ? riceReq.name : '');
    setFormRiceCostMode('simple');
    setFormRawRiceKg(2);
    setFormRawRiceCostKg(50);
    setFormRiceExpansionRatio(2.3);
    setFormRiceOverhead(10);
    setFormCustomOptions(item.customizableOptions && item.customizableOptions.length > 0 ? item.customizableOptions.map(co => ({
      id: 'opt-' + Math.random().toString(36).substr(2, 4),
      title: co.title,
      choices: co.choices.map(c => {
        const isRiceGroup = co.title.toLowerCase().includes('rice');
        const isPlain = isRiceGroup && c.name.toLowerCase().includes('plain');
        const isGarlic = isRiceGroup && c.name.toLowerCase().includes('garlic') && !c.name.toLowerCase().includes('double');
        return {
          id: c.id || 'ch-' + Math.random().toString(36).substr(2, 4),
          name: isPlain ? 'Plain Rice' : isGarlic ? 'Garlic Rice' : c.name,
          price: (isPlain || isGarlic) && c.price < 0 ? 0 : c.price
        };
      })
    })) : (
      item.includeRice !== false && item.category !== 'drinks'
        ? [
            {
              id: 'opt-' + Math.random().toString(36).substr(2, 4),
              title: 'Rice (Included with Meal)',
              choices: [
                { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: 'Garlic Rice', price: 0 },
                { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: 'Plain Rice', price: 0 },
                { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: 'Java Rice', price: 20 },
              ]
            },
            {
              id: 'opt-' + Math.random().toString(36).substr(2, 4),
              title: 'Extra Rice (Add-on)',
              choices: [
                { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: 'No Extra Rice', price: 0 },
                { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: '+1 Extra Plain Rice', price: 15 },
                { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: '+1 Extra Garlic Rice', price: 20 },
                { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: '+1 Extra Java Rice', price: 25 },
              ]
            }
          ]
        : []
    ));

    // Synchronize Batch Calculator state with this recipe
    const unit = item.batchYieldUnit || 'g';
    setStandaloneBatchUnit(unit);
    const batchG = item.batchYieldGrams !== undefined ? item.batchYieldGrams : (unit === 'pcs' ? 100 : 2000);
    const servingG = item.servingSizeGrams !== undefined ? item.servingSizeGrams : (unit === 'pcs' ? 4 : 90);
    const multiplier = batchG / Math.max(1, servingG);

    setStandaloneRecipeName(item.name);
    setStandaloneBatchWeight(batchG);
    setStandaloneServingGrams(servingG);
    setStandaloneTargetMargin(item.targetMarginPercent !== undefined ? item.targetMarginPercent : 50);
    setStandaloneIncludeRice(item.includeRice !== undefined ? item.includeRice : true);
    if (riceReq) {
      setStandaloneIncludeRice(true);
      setStandaloneRicePortionGrams(Number(riceReq.amount) || 150);
      setStandaloneSelectedRiceIngredient(riceReq.name);
    } else {
      setStandaloneIncludeRice(false);
      setStandaloneSelectedRiceIngredient('');
    }

    const garnishReqs = normalizedReqs.filter(r => isGarnishRequirement(r.name));
    if (garnishReqs.length > 0) {
      setStandaloneIncludeGarnishes(true);
      const mappedGarnishes = garnishReqs.map(g => {
        const invMatch = (ingredientsInventory || []).find(inv => inv.name.toLowerCase() === g.name.toLowerCase());
        const pCost = getGarnishPieceCost(g.name, undefined, invMatch);
        const gramsPerPc = getGarnishGramsPerPiece(g.name, invMatch);
        const isGramUnit = invMatch?.unit === 'g' || invMatch?.unit === 'kg';
        const amt = isGramUnit && Number(g.amount) > 1 && !g.name.toLowerCase().includes('/pc')
          ? Math.max(1, Math.round(Number(g.amount) / gramsPerPc))
          : (Number(g.amount) || 1);

        return {
          name: g.name,
          amount: amt,
          costPerUnit: pCost,
          unit: 'pcs',
          selected: true
        };
      });
      setStandaloneSelectedGarnishes(mappedGarnishes);
    } else {
      setStandaloneIncludeGarnishes(false);
    }

    const pkgReqs = normalizedReqs.filter(r => isPackagingRequirement(r.name));
    if (pkgReqs.length > 0) {
      setStandaloneIncludePackaging(true);
      const mappedPkgs = pkgReqs.map(p => {
        const invMatch = (ingredientsInventory || []).find(inv => inv.name.toLowerCase() === p.name.toLowerCase());
        return {
          name: p.name,
          amount: Number(p.amount) || 1,
          costPerUnit: Number(invMatch?.costPerUnit) || (p.name.toLowerCase().includes('bowl') ? 2.50 : 1.50),
          unit: invMatch?.unit || 'pcs',
          selected: true
        };
      });
      setStandaloneSelectedPackaging(mappedPkgs);
    } else {
      setStandaloneIncludePackaging(false);
    }

    if (normalizedReqs.length > 0) {
      const converted = normalizedReqs
        .filter(r => isViandRequirement(r.name))
        .map(r => {
          const inv = ingredientsInventory.find(i => i.name.toLowerCase() === r.name.toLowerCase());
          const unit = inv?.unit || 'g';
          const isCountable = unit === 'pcs' || unit === 'cans' || unit === 'pc' || unit === 'pack';
          const batchAmount = isCountable 
            ? Math.max(1, Math.round(Number(r.amount) * multiplier))
            : Number((Number(r.amount) * multiplier).toFixed(1));
          const cost = computeInventoryIngredientCost(r.name, batchAmount, unit);
          return {
            name: r.name,
            batchAmount,
            unit,
            cost
          };
        });

      if (converted.length > 0) {
        setStandaloneIngredients(converted);
        const totalCost = converted.reduce((sum, ing) => sum + (Number(ing.cost) || 0), 0);
        setStandaloneTotalBatchCost(totalCost);
      }
    }

    setIsFormOpen(true);
  };

  // Handle Dynamic Menu Item Submission (Add/Edit)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDescription.trim() || !formImage.trim()) {
      alert("Please fill in all mandatory fields correctly!");
      return;
    }

    // Assign default custom options based on Category to make the new items interactive
    let customizableOptions: any[] = [];
    if (formCategory === 'silog') {
      customizableOptions = [
        {
          title: 'Rice (Included with Meal)',
          choices: [
            { id: 'rice-garlic', name: 'Garlic Rice', price: 0 },
            { id: 'rice-plain', name: 'Plain Rice', price: 0 },
            { id: 'rice-java', name: 'Java Rice', price: 20 }
          ]
        },
        {
          title: 'Extra Rice (Add-on)',
          choices: [
            { id: 'extra-rice-none', name: 'No Extra Rice', price: 0 },
            { id: 'extra-rice-plain', name: '+1 Extra Plain Rice', price: 15 },
            { id: 'extra-rice-garlic', name: '+1 Extra Garlic Rice', price: 20 },
            { id: 'extra-rice-java', name: '+1 Extra Java Rice', price: 25 }
          ]
        },
        {
          title: 'Egg Style (Included)',
          choices: [
            { id: 'egg-sunny', name: 'Sunny-side-up', price: 0 },
            { id: 'egg-scrambled', name: 'Scrambled', price: 0 },
            { id: 'egg-well', name: 'Well Done', price: 0 }
          ]
        },
        {
          title: 'Extra Egg (Add-on)',
          choices: [
            { id: 'extra-egg-none', name: 'No Extra Egg', price: 0 },
            { id: 'extra-egg-add', name: '+1 Add Extra Egg', price: 15 }
          ]
        }
      ];
    } else if (formCategory === 'bento') {
      customizableOptions = [
        {
          title: 'Rice (Included with Meal)',
          choices: [
            { id: 'bento-rice-plain', name: 'Steamed White Rice', price: 0 },
            { id: 'bento-rice-garlic', name: 'Garlic Rice', price: 15 },
            { id: 'bento-rice-java', name: 'Java Rice', price: 20 }
          ]
        },
        {
          title: 'Extra Rice (Add-on)',
          choices: [
            { id: 'bento-extra-rice-none', name: 'No Extra Rice', price: 0 },
            { id: 'bento-extra-rice-plain', name: '+1 Extra Steamed Rice', price: 15 },
            { id: 'bento-extra-rice-garlic', name: '+1 Extra Garlic Rice', price: 20 },
            { id: 'bento-extra-rice-java', name: '+1 Extra Java Rice', price: 25 }
          ]
        },
        {
          title: 'Sauce Option',
          choices: [
            { id: 'sauce-katsu', name: 'Katsu Sauce & Mayo', price: 0 },
            { id: 'sauce-gravy', name: 'Curvada Signature Gravy', price: 10 }
          ]
        },
        {
          title: 'Bento Sides Upgrade',
          choices: [
            { id: 'side-none', name: 'Standard Sides', price: 0 },
            { id: 'side-gyoza', name: '+2 Extra Gyoza Dumplings', price: 35 }
          ]
        }
      ];
    } else if (formCategory === 'rice-bowl') {
      customizableOptions = [
        {
          title: 'Rice (Included with Meal)',
          choices: [
            { id: 'rice-garlic', name: 'Garlic Rice', price: 0 },
            { id: 'rice-plain', name: 'Plain Rice', price: 0 },
            { id: 'rice-java', name: 'Java Rice', price: 20 }
          ]
        },
        {
          title: 'Extra Rice (Add-on)',
          choices: [
            { id: 'extra-rice-none', name: 'No Extra Rice', price: 0 },
            { id: 'extra-rice-plain', name: '+1 Extra Plain Rice', price: 15 },
            { id: 'extra-rice-garlic', name: '+1 Extra Garlic Rice', price: 20 },
            { id: 'extra-rice-java', name: '+1 Extra Java Rice', price: 25 }
          ]
        },
        {
          title: 'Spice Customizer',
          choices: [
            { id: 'spice-mild', name: 'Mild Regular', price: 0 },
            { id: 'spice-super', name: 'Super Hot Lava', price: 10 }
          ]
        },
        {
          title: 'Toppings Extra',
          choices: [
            { id: 'top-none', name: 'None', price: 0 },
            { id: 'top-egg', name: 'Add Runny Sunny Egg', price: 15 }
          ]
        }
      ];
    } else if (formCategory === 'drinks') {
      customizableOptions = [
        {
          title: 'Serving Size',
          choices: [
            { id: 'size-medium', name: 'Medium (16oz)', price: 0 },
            { id: 'size-large', name: 'Large C-Cup (22oz)', price: 20 }
          ]
        }
      ];
    }

    const parsedIngredients = formIngredients
      .split(',')
      .map((ing) => ing.trim())
      .filter((ing) => ing.length > 0);

    const cleanCustomOptions = formCustomOptions
      .map((co) => ({
        title: co.title.trim(),
        choices: co.choices
          .map((c) => ({
            id: c.id || `choice-${Math.random().toString(36).substr(2, 4)}`,
            name: c.name.trim(),
            price: Number(c.price) || 0
          }))
          .filter((c) => c.name.length > 0)
      }))
      .filter((co) => co.title.length > 0 && co.choices.length > 0);

    const finalCustomOptions = cleanCustomOptions.length > 0
      ? cleanCustomOptions
      : (editingItem ? undefined : (customizableOptions.length > 0 ? customizableOptions : undefined));

    const utilityOverheadData = {
      electricity: formElecOverhead,
      gas: formGasOverhead,
      water: formWaterOverhead,
      packaging: formPkgOverhead
    };

    if (editingItem) {
      // Edit existing
      const updated: MenuItem = {
        ...editingItem,
        name: formName.trim(),
        description: formDescription.trim(),
        price: Number(formPrice) || 0,
        category: formCategory,
        image: formImage.trim(),
        spicy: formSpicy,
        popular: formPopular,
        targetMarginPercent: Number(formTargetMargin) || 50,
        utilityOverhead: utilityOverheadData,
        batchYieldGrams: Number(formBatchYieldGrams) || (formBatchYieldUnit === 'pcs' ? 100 : 2000),
        batchYieldUnit: formBatchYieldUnit,
        servingSizeGrams: Number(formServingSizeGrams) || (formServingSizeUnit === 'pcs' ? 4 : 90),
        servingSizeUnit: formServingSizeUnit,
        totalBatchCost: Number(formBatchTotalCost) || 0,
        includeRice: formIncludeRice,
        ricePortionGrams: formIncludeRice ? (Number(formRicePortionGrams) || 150) : undefined,
        riceCostPerGram: formIncludeRice ? (Number(formRiceCostPerGram) || 0.04) : undefined,
        ingredients: parsedIngredients.length > 0 ? parsedIngredients : undefined,
        recipeRequirements: formRecipeRequirements.length > 0 ? formRecipeRequirements.map(r => ({ name: r.name, amount: Number(r.amount) || 0 })) : undefined,
        batchIngredients: formBatchIngredients.length > 0 ? formBatchIngredients : undefined,
        garnishes: formGarnishes.length > 0 ? formGarnishes : undefined,
        packaging: formPackaging.length > 0 ? formPackaging : undefined,
        customizableOptions: finalCustomOptions
      };
      onEditMenuItem(updated);
    } else {
      // Add new
      const generatedId = `${formCategory}-${Math.random().toString(36).substr(2, 6)}`;
      const newItem: MenuItem = {
        id: generatedId,
        name: formName.trim(),
        description: formDescription.trim(),
        price: Number(formPrice) || 0,
        category: formCategory,
        image: formImage.trim(),
        spicy: formSpicy,
        popular: formPopular,
        isAvailable: true,
        targetMarginPercent: Number(formTargetMargin) || 50,
        utilityOverhead: utilityOverheadData,
        batchYieldGrams: Number(formBatchYieldGrams) || (formBatchYieldUnit === 'pcs' ? 100 : 2000),
        batchYieldUnit: formBatchYieldUnit,
        servingSizeGrams: Number(formServingSizeGrams) || (formServingSizeUnit === 'pcs' ? 4 : 90),
        servingSizeUnit: formServingSizeUnit,
        totalBatchCost: Number(formBatchTotalCost) || 0,
        includeRice: formIncludeRice,
        ricePortionGrams: formIncludeRice ? (Number(formRicePortionGrams) || 150) : undefined,
        riceCostPerGram: formIncludeRice ? (Number(formRiceCostPerGram) || 0.04) : undefined,
        ingredients: parsedIngredients.length > 0 ? parsedIngredients : undefined,
        recipeRequirements: formRecipeRequirements.length > 0 ? formRecipeRequirements.map(r => ({ name: r.name, amount: Number(r.amount) || 0 })) : undefined,
        batchIngredients: formBatchIngredients.length > 0 ? formBatchIngredients : undefined,
        garnishes: formGarnishes.length > 0 ? formGarnishes : undefined,
        packaging: formPackaging.length > 0 ? formPackaging : undefined,
        customizableOptions: finalCustomOptions
      };
      onAddMenuItem(newItem);
    }

    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string, itemName: string) => {
    if (confirm(`Are you absolutely sure you want to remove "${itemName}" from the kitchen catalog? This cannot be undone.`)) {
      if (editingItem && editingItem.id === itemId) {
        setEditingItem(null);
        setIsFormOpen(false);
      }
      if (stockIngredientRecipeFilter === itemId) {
        setStockIngredientRecipeFilter('all');
      }
      if (selectedRecipeToLoad === `dish:${itemId}`) {
        setSelectedRecipeToLoad('');
      }
      onDeleteMenuItem(itemId);
    }
  };

  // Filter menu items for Stock view
  const filteredStockItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(stockSearchQuery.toLowerCase());
    const matchesCategory = stockCategoryFilter === 'all' || item.category === stockCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filter ingredients for Stock view
  const filteredIngredients = ingredientsInventory.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(stockSearchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (stockIngredientRecipeFilter !== 'all') {
      const selectedItem = menuItems.find(item => item.id === stockIngredientRecipeFilter);
      if (selectedItem) {
        const hasInReqs = selectedItem.recipeRequirements?.some(req => req.name.toLowerCase() === ing.name.toLowerCase());
        const hasInTags = selectedItem.ingredients?.some(name => name.toLowerCase() === ing.name.toLowerCase());
        return !!(hasInReqs || hasInTags);
      }
    }
    return true;
  });

  const handleAddNewIngredientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngredientName.trim()) {
      alert("Please enter a valid ingredient name!");
      return;
    }
    const packCountVal = Number(newIngredientPacksCount) > 0 ? Number(newIngredientPacksCount) : undefined;
    const packSizeVal = Number(newIngredientPackSize) > 0 ? Number(newIngredientPackSize) : undefined;
    const packCostVal = Number(newIngredientPackCost) > 0 ? Number(Number(newIngredientPackCost).toFixed(2)) : undefined;
    const costPerUnitVal = newIngredientCostPerUnit !== '' ? Number(Number(newIngredientCostPerUnit).toFixed(2)) : undefined;

    onAddIngredient(
      newIngredientName.trim(),
      Number(newIngredientQuantity) || 0,
      newIngredientUnit,
      Number(newIngredientLowStock) || 0,
      costPerUnitVal,
      packCountVal,
      packSizeVal,
      packCostVal
    );
    // Reset states
    setNewIngredientName('');
    setNewIngredientQuantity(100);
    setNewIngredientUnit('g');
    setNewIngredientLowStock(20);
    setNewIngredientCostPerUnit(0.05);
    setNewIngredientPacksCount('1');
    setNewIngredientPackSize('');
    setNewIngredientPackCost('');
    setIsAddIngredientOpen(false);
  };

  const handleEditIngredientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIngredientId) return;
    if (!editIngredientName.trim()) {
      alert("Please enter a valid ingredient name!");
      return;
    }
    const packCountVal = Number(editIngredientPacksCount) > 0 ? Number(editIngredientPacksCount) : undefined;
    const packSizeVal = Number(editIngredientPackSize) > 0 ? Number(editIngredientPackSize) : undefined;
    const packCostVal = Number(editIngredientPackCost) > 0 ? Number(Number(editIngredientPackCost).toFixed(2)) : undefined;
    const costPerUnitVal = editIngredientCostPerUnit !== '' ? Number(Number(editIngredientCostPerUnit).toFixed(2)) : undefined;

    onEditIngredient(
      editingIngredientId,
      editIngredientName.trim(),
      Number(editIngredientQuantity) || 0,
      editIngredientUnit,
      Number(editIngredientLowStock) || 0,
      costPerUnitVal,
      packCountVal,
      packSizeVal,
      packCostVal
    );
    setEditingIngredientId(null);
  };

  // Filter menu items for Menu Builder view
  const filteredBuilderItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(builderSearchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(builderSearchQuery.toLowerCase());
    const matchesCategory = builderCategoryFilter === 'all' || item.category === builderCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Stock Summary Counts
  const stockStats = (() => {
    if (stockViewMode === 'recipes') {
      const totalCount = menuItems.length;
      const outOfStockCount = menuItems.filter(item => (stockLevels[item.id] ?? 0) <= 0 || unavailableItemIds.includes(item.id)).length;
      const lowStockCount = menuItems.filter(item => {
        const qty = stockLevels[item.id] ?? 0;
        const isUnavailable = unavailableItemIds.includes(item.id);
        return !isUnavailable && qty > 0 && qty < 10;
      }).length;
      return { totalCount, outOfStockCount, lowStockCount, titleLabel: 'Dishes' };
    } else {
      const totalCount = ingredientsInventory.length;
      const outOfStockCount = ingredientsInventory.filter(ing => ing.quantity <= 0).length;
      const lowStockCount = ingredientsInventory.filter(ing => ing.quantity > 0 && ing.quantity <= ing.lowStockAlert).length;
      return { totalCount, outOfStockCount, lowStockCount, titleLabel: 'Ingredients' };
    }
  })();

  if (loginRole === null || path === '/portal/login') {
    return renderLogin();
  }

  return (
    <div className="bg-[#0D0D0C] min-h-screen text-white flex relative overflow-hidden font-sans w-full">
      {renderSidebar()}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {renderHeader()}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {loginRole === 'admin' && renderMetrics()}
          
          {/* --- RENDERING CORRESPONDING TAB PANELS --- */}
          {chefTab === 'orders' && renderOrders()}
          {chefTab === 'history' && renderHistoryScreen()}
          {chefTab === 'stock' && (
        <div className="space-y-6">
          
          {/* Sub Tab Selection Between Raw Ingredients vs Recipes Availability */}
          <div className="flex border-b-2 border-white/5 pb-2 gap-6">
            <button
              onClick={() => {
                setStockViewMode('ingredients');
                setStockSearchQuery('');
              }}
              className={`pb-2.5 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-4 ${
                stockViewMode === 'ingredients'
                  ? 'border-brand-red text-white'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              🌾 Raw Ingredients ({ingredientsInventory.length})
            </button>
            <button
              onClick={() => {
                setStockViewMode('recipes');
                setStockSearchQuery('');
              }}
              className={`pb-2.5 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-4 ${
                stockViewMode === 'recipes'
                  ? 'border-brand-red text-white'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              🍽️ Dish Recipes Availability ({menuItems.length})
            </button>
          </div>

          {/* Inventory Secondary Stats Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Total {stockStats.titleLabel} Cataloged</span>
                <h4 className="text-white font-display font-black text-xl mt-1">{stockStats.totalCount} {stockStats.titleLabel}</h4>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg">💡</div>
            </div>

            <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Low Stock Warning</span>
                <h4 className="text-brand-gold font-display font-black text-xl mt-1">{stockStats.lowStockCount} Items</h4>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center text-lg">⚠️</div>
            </div>

            <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Sold Out / Off-line</span>
                <h4 className="text-brand-red font-display font-black text-xl mt-1">{stockStats.outOfStockCount} Items</h4>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-red/10 text-brand-red flex items-center justify-center text-lg">🚨</div>
            </div>
          </div>

          {/* Inner Raw Ingredients Sub-Tabs */}
          {stockViewMode === 'ingredients' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-1.5 bg-[#0D0D0C] rounded-[1.5rem] border border-white/5">
              <button
                type="button"
                onClick={() => setIngredientsSubTab('control-board')}
                className={`px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  ingredientsSubTab === 'control-board'
                    ? 'bg-[#181818] text-white border border-white/10 shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                🌾 Control Board
              </button>
              <button
                type="button"
                onClick={() => setIngredientsSubTab('low-stock')}
                className={`px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  ingredientsSubTab === 'low-stock'
                    ? 'bg-[#181818] text-brand-gold border border-brand-gold/20 shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                📉 Low Stock ({stockStats.lowStockCount})
              </button>
              <button
                type="button"
                onClick={() => setIngredientsSubTab('multi-recipe')}
                className={`px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  ingredientsSubTab === 'multi-recipe'
                    ? 'bg-[#181818] text-brand-red border border-brand-red/20 shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                🍳 Multi-Recipe
              </button>
              <button
                type="button"
                onClick={() => setIngredientsSubTab('reports')}
                className={`px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  ingredientsSubTab === 'reports'
                    ? 'bg-[#181818] text-blue-400 border border-blue-500/20 shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                📊 Reports (Wk/Mo)
              </button>
            </div>
          )}

          {/* AI-Powered Predictive Restock Planner */}
          {stockViewMode === 'ingredients' && ingredientsSubTab === 'low-stock' && (
            <div className="bg-[#121211] border border-brand-gold/20 rounded-[2rem] p-6 shadow-xl space-y-6 text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Sparkles className="w-40 h-40 text-brand-gold" />
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-brand-gold/10 text-brand-gold font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-pulse" /> Predictive Forecast Engine
                    </span>
                    <span className="text-xs text-gray-400 font-bold">Smart Restock & Demand Forecasting</span>
                  </div>
                  <h3 className="font-display font-black text-white text-lg md:text-xl mt-1.5 flex items-center gap-2">
                    🔮 Auto-Compute Low Stock & Restocking Planner
                  </h3>
                  <p className="text-gray-400 text-xs mt-1 max-w-2xl font-medium leading-relaxed">
                    Automatically computes daily consumption rates and safe stocking levels. It tells you exactly how much raw material to purchase or restock to meet your weekly demand securely!
                  </p>
                </div>

                {/* Configuration Toggles */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {/* Mode toggle */}
                  <div className="flex bg-[#0D0D0C] p-1 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setForecastMode('real')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        forecastMode === 'real'
                          ? 'bg-brand-red text-white shadow-md'
                          : 'text-gray-500 hover:text-white'
                      }`}
                      title="Analyze actual delivered sales order histories to compute average usage."
                    >
                      📈 Real Sales History
                    </button>
                    <button
                      type="button"
                      onClick={() => setForecastMode('projection')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        forecastMode === 'projection'
                          ? 'bg-brand-red text-white shadow-md'
                          : 'text-gray-500 hover:text-white'
                      }`}
                      title="Simulate future customer demands based on a targeted daily sales volume pace."
                    >
                      🔮 Sales Projections
                    </button>
                  </div>

                  {/* Period toggle */}
                  <div className="flex bg-[#0D0D0C] p-1 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setForecastPeriodDays(1)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        forecastPeriodDays === 1
                          ? 'bg-brand-gold text-black shadow-md'
                          : 'text-gray-500 hover:text-white'
                      }`}
                    >
                      🗓️ Daily View
                    </button>
                    <button
                      type="button"
                      onClick={() => setForecastPeriodDays(7)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        forecastPeriodDays === 7
                          ? 'bg-brand-gold text-black shadow-md'
                          : 'text-gray-500 hover:text-white'
                      }`}
                    >
                      🗓️ Weekly View
                    </button>
                  </div>
                </div>
              </div>

              {/* Slider for Projection Pace - only visible when Projection mode is selected */}
              {forecastMode === 'projection' && (
                <div className="bg-[#0D0D0C]/50 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-brand-gold uppercase tracking-wider font-black block">⚙️ Adjust Expected Daily Order Sales Volume</span>
                    <span className="text-[11px] text-gray-400 font-medium block">
                      Change this slider to simulate how raw ingredients will deplete with higher/lower sales.
                    </span>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-96">
                    <input
                      type="range"
                      min="5"
                      max="150"
                      step="5"
                      value={salesPace}
                      onChange={(e) => setSalesPace(Number(e.target.value))}
                      className="w-full accent-brand-red cursor-pointer bg-[#181818]"
                    />
                    <span className="bg-brand-red/15 border border-brand-red/30 text-brand-red text-xs font-mono font-bold px-3 py-1 rounded-lg shrink-0">
                      {salesPace} orders/day
                    </span>
                  </div>
                </div>
              )}

              {/* Restock Recommendations List */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-black">
                      📋 Stock depletion & recommended purchase checklist ({forecastPeriodDays === 7 ? 'This Week' : 'Today'})
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {forecastMode === 'real' ? 'Calculated from completed local sales logs' : 'Simulated on popular dishes weight'}
                    </span>
                  </div>
                  {forecastData.some(item => item.recommendedRestock > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...restockBuyList };
                        let count = 0;
                        forecastData.forEach(item => {
                          if (item.recommendedRestock > 0) {
                            updated[item.id] = item.recommendedRestock;
                            count++;
                          }
                        });
                        saveRestockBuyList(updated);
                        alert(`🛒 Successfully added all ${count} recommended restock items to your Buy List!`);
                      }}
                      className="px-3 py-1.5 bg-brand-gold hover:bg-brand-gold/90 text-black rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all self-start sm:self-center cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Add All Recommended ({forecastData.filter(item => item.recommendedRestock > 0).length}) to Buy List
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {forecastData.map((item) => {
                    // Check if low or urgent or has restock recommend
                    const needsRestock = item.recommendedRestock > 0;
                    
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                          item.quantity === 0
                            ? 'bg-brand-red/5 border-brand-red/20'
                            : item.isUrgent
                            ? 'bg-brand-gold/5 border-brand-gold/15'
                            : 'bg-[#181818] border-white/5'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-white text-xs font-black block leading-snug">{item.name}</span>
                              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mt-0.5">
                                Current Stock: <strong className="text-gray-300">{item.quantity}{item.unit}</strong>
                              </span>
                            </div>

                            {/* Stock depletion rate */}
                            <div className="text-right">
                              <span className="text-[9px] text-gray-400 font-mono font-bold block leading-none">
                                ~{item.dailyRate.toFixed(1)}{item.unit}/day
                              </span>
                              <span className="text-[8px] text-gray-500 uppercase font-black block mt-1 leading-none">
                                Est. consumption
                              </span>
                            </div>
                          </div>

                          {/* Dynamic status line */}
                          <div className="flex flex-wrap items-center gap-1 text-[9px] font-bold">
                            {item.quantity === 0 ? (
                              <span className="text-brand-red uppercase font-black">🚨 SOLD OUT DISHES AFFECTED!</span>
                            ) : item.quantity <= item.lowStockAlert ? (
                              <span className="text-brand-gold uppercase font-black flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-brand-gold animate-pulse" /> Low Stock Alert ({item.quantity}{item.unit} &le; {item.lowStockAlert}{item.unit})
                              </span>
                            ) : item.daysOfStockLeft <= 0 ? (
                              <span className="text-brand-red uppercase font-black">🚨 Depleted on next order!</span>
                            ) : item.daysOfStockLeft <= forecastPeriodDays ? (
                              <span className="text-brand-gold uppercase font-black flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-brand-gold" /> Depleted in {(item.daysOfStockLeft).toFixed(1)} days!
                              </span>
                            ) : (
                              <span className="text-green-400 uppercase font-bold">
                                {item.daysOfStockLeft === Infinity ? '✓ Safe (No active demand)' : `✓ Safe for ${item.daysOfStockLeft.toFixed(1)} days`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Recommendation action panel */}
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                          <div className="text-left">
                            <span className="text-[8px] text-gray-500 uppercase tracking-wider block font-bold">Required to stock ({forecastPeriodDays === 7 ? 'Week' : 'Day'})</span>
                            <span className="text-[11px] text-white font-mono font-black mt-0.5 block">
                              {needsRestock ? (
                                <span className="text-brand-gold font-bold">
                                  +{item.recommendedRestock} {item.unit} Recommended
                                </span>
                              ) : (
                                <span className="text-green-400 font-bold">✓ Fully stocked</span>
                              )}
                            </span>
                          </div>

                          {needsRestock && (() => {
                            const isInBuyList = (restockBuyList[item.id] || 0) > 0;
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isInBuyList) {
                                    const updated = { ...restockBuyList };
                                    delete updated[item.id];
                                    saveRestockBuyList(updated);
                                  } else {
                                    saveRestockBuyList({
                                      ...restockBuyList,
                                      [item.id]: item.recommendedRestock
                                    });
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all focus:outline-none border cursor-pointer ${
                                  isInBuyList
                                    ? 'bg-green-500/10 border-green-500/40 text-green-400 hover:bg-green-500 hover:text-black'
                                    : 'bg-[#0D0D0C] border-brand-gold/30 hover:bg-brand-gold hover:text-black text-brand-gold'
                                }`}
                                title={isInBuyList ? "Click to remove from Buy List" : "Add recommended restock amount to your Buy List"}
                              >
                                {isInBuyList ? (
                                  <>
                                    <span className="font-sans text-xs">✓</span> In Buy List
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart className="w-3 h-3" /> Add to Buy List
                                  </>
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recipe Prep Shopping List & Easy Stock Update Tool */}
          {stockViewMode === 'ingredients' && ingredientsSubTab === 'multi-recipe' && (
            <div className="bg-[#121211] border border-brand-red/20 rounded-[2rem] p-6 shadow-xl space-y-6 text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <ShoppingCart className="w-40 h-40 text-brand-red" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm bg-brand-red/10 text-brand-red font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" /> Recipe Shopping Planner
                  </span>
                  <span className="text-xs text-gray-400 font-bold">Calculate stock needed for planned menu item servings</span>
                </div>
                <h3 className="font-display font-black text-white text-lg md:text-xl mt-1.5 flex items-center gap-2">
                  🛒 Multi-Recipe Prep Servings & Buy List Generator
                </h3>
                <p className="text-gray-400 text-xs mt-1 max-w-2xl font-medium leading-relaxed">
                  Enter target prep servings for any dishes below. We'll automatically compute the combined ingredients needed, compare them with your current inventory, and output the precise purchase list.
                </p>
              </div>

              {/* Recipe Selector grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-black">
                    🍽️ 1. Set Target Servings to Prep for this Period
                  </span>
                  {Object.values(prepQuantities).some(q => (q as number) > 0) && (
                    <button
                      type="button"
                      onClick={() => setPrepQuantities({})}
                      className="text-brand-red hover:underline text-[9px] font-black uppercase tracking-wider"
                    >
                      Clear All Servings ✕
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {menuItems
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((item) => {
                      const currentPrep = prepQuantities[item.id] || 0;
                      const hasRequirements = item.recipeRequirements && item.recipeRequirements.length > 0;
                      const hasIngredients = item.ingredients && item.ingredients.length > 0;
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`p-3 rounded-xl border transition-all ${
                            currentPrep > 0 
                              ? 'bg-brand-red/5 border-brand-red/30' 
                              : 'bg-[#0D0D0C] border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <div className="truncate">
                              <span className="text-white text-[11px] font-bold block truncate" title={item.name}>
                                {item.name}
                              </span>
                              <span className="text-[8px] text-gray-500 uppercase font-bold block mt-0.5">
                                {item.category} • {hasRequirements ? `${item.recipeRequirements?.length} ingredients` : (hasIngredients ? `${item.ingredients?.length} generic` : 'No ingredients')}
                              </span>
                            </div>
                            {item.popular && (
                              <span className="bg-brand-gold text-black text-[7px] font-black uppercase px-1 rounded shrink-0">Pop</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-white/5">
                            <span className="text-[9px] text-gray-400 font-bold uppercase">Target:</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPrepQuantities(prev => ({
                                    ...prev,
                                    [item.id]: Math.max(0, (prev[item.id] || 0) - 5)
                                  }));
                                }}
                                className="w-5 h-5 bg-[#181818] text-gray-400 hover:text-white hover:bg-white/5 rounded flex items-center justify-center text-[10px] font-black focus:outline-none border border-white/5"
                              >
                                -5
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={currentPrep || ''}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value) || 0);
                                  setPrepQuantities(prev => ({
                                    ...prev,
                                    [item.id]: val
                                  }));
                                }}
                                placeholder="0"
                                className="w-10 bg-[#181818] border border-white/10 text-white text-[11px] font-black font-mono text-center rounded py-0.5 focus:outline-none focus:border-brand-red"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setPrepQuantities(prev => ({
                                    ...prev,
                                    [item.id]: (prev[item.id] || 0) + 5
                                  }));
                                }}
                                className="w-5 h-5 bg-[#181818] text-gray-400 hover:text-white hover:bg-white/5 rounded flex items-center justify-center text-[10px] font-black focus:outline-none border border-white/5"
                              >
                                +5
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Shopping checklist Results */}
              <div className="pt-2 border-t border-white/5">
                {(() => {
                  const itemsToBuy = combinedShoppingListData.filter(item => item.neededToBuy > 0);
                  const satisfiedItems = combinedShoppingListData.filter(item => item.neededToBuy <= 0);

                  if (itemsToBuy.length === 0 && satisfiedItems.length === 0) {
                    return (
                      <div className="bg-[#0D0D0C]/50 border border-dashed border-white/5 rounded-2xl py-8 text-center text-xs text-gray-500 font-medium">
                        🛒 Your Buy List is empty! Set prep targets above or click "Add to Buy List" on low-stock forecasts to plan your shopping.
                      </div>
                    );
                  }

                  const allChecked = itemsToBuy.length > 0 && itemsToBuy.every(item => checkedBuyItems[item.ingredientId]);

                  return (
                    <div className="space-y-4">
                      {/* Fully Stocked Banner if itemsToBuy is empty but we have satisfiedItems */}
                      {itemsToBuy.length === 0 && satisfiedItems.length > 0 && (
                        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl text-left flex items-start gap-2.5 animate-fade-in">
                          <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5 stroke-[3]" />
                          <div>
                            <span className="text-green-400 font-black text-xs uppercase tracking-wider block">
                              All Ingredients Fully Stocked!
                            </span>
                            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed font-medium">
                              You already have sufficient physical kitchen stock for all your planned prep servings. No additional purchases are required!
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Header and Controls Row */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0D0D0C] p-4 rounded-2xl border border-white/5 text-left">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-brand-gold uppercase tracking-wider font-black block">📋 Real-Time Shopping Checklist & Verification Tool</span>
                            {itemsToBuy.length > 0 && (
                              <span className="bg-brand-gold/10 text-brand-gold text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                {itemsToBuy.filter(item => checkedBuyItems[item.ingredientId]).length} / {itemsToBuy.length} Checked
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 font-medium mt-0.5 leading-relaxed">
                            {itemsToBuy.length > 0 
                              ? 'Tick off ingredients as you verify or buy them. Once done, click "Commit Checked Purchases" to instantly restock them into physical inventory!'
                              : 'All ingredients needed for your target prep are fully stocked in your kitchen. See details below.'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {/* Copy to clipboard button */}
                          <button
                            type="button"
                            onClick={() => {
                              const activePreps = Object.entries(prepQuantities)
                                .filter(([_, q]) => (q as number) > 0)
                                .map(([id, q]) => `• ${menuItems.find(i => i.id === id)?.name}: ${q} servings`)
                                .join('\n');

                              const buyLines = combinedShoppingListData
                                .map(item => {
                                  const isChecked = checkedBuyItems[item.ingredientId];
                                  const isSatisfied = item.neededToBuy <= 0;
                                  const action = isSatisfied 
                                    ? `[✓] FULLY STOCKED` 
                                    : isChecked 
                                    ? `[✓] BOUGHT` 
                                    : `[ ] BUY ${item.neededToBuy}${item.unit}`;
                                  return `${action} - ${item.name} (Source: ${item.source} | Current Stock: ${item.currentQty}${item.unit})`;
                                })
                                .join('\n');

                              const text = `📝 RAMEN SHOP - INTERACTIVE INVENTORY BUY LIST\n` +
                                `=========================================\n` +
                                `Target Servings to Prepare:\n${activePreps || 'None selected'}\n\n` +
                                `Required Ingredients & Purchase Checklist:\n${buyLines}\n` +
                                `=========================================\n` +
                                `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
                              
                              navigator.clipboard.writeText(text);
                              alert('📋 Interactive buy list copied to clipboard!');
                            }}
                            className="px-3 py-2 bg-[#181818] hover:bg-white/5 border border-white/10 rounded-xl text-xs text-white font-bold flex items-center gap-1.5 transition-all focus:outline-none cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-400" /> Copy List
                          </button>

                          {itemsToBuy.length > 0 && (
                            <>
                              {/* Reset checklist */}
                              <button
                                type="button"
                                onClick={() => {
                                  saveCheckedBuyItems({});
                                  alert('🔄 Checked state reset successfully!');
                                }}
                                className="px-3 py-2 bg-[#181818] hover:bg-white/5 border border-white/10 rounded-xl text-xs text-gray-400 hover:text-white font-bold flex items-center gap-1 transition-all focus:outline-none cursor-pointer"
                                title="Reset checked items"
                              >
                                Reset Checks
                              </button>

                              {/* Select All / Deselect All */}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...checkedBuyItems };
                                  itemsToBuy.forEach(item => {
                                    if (!allChecked) {
                                      updated[item.ingredientId] = true;
                                    } else {
                                      delete updated[item.ingredientId];
                                    }
                                  });
                                  saveCheckedBuyItems(updated);
                                }}
                                className="px-3 py-2 bg-[#181818] hover:bg-white/5 border border-white/10 rounded-xl text-xs text-gray-400 hover:text-white font-bold flex items-center gap-1 transition-all focus:outline-none cursor-pointer"
                              >
                                {allChecked ? 'Deselect All' : 'Select All'}
                              </button>

                              {/* Commit checked purchases */}
                              <button
                                type="button"
                                onClick={() => {
                                  const checkedItems = itemsToBuy.filter(item => checkedBuyItems[item.ingredientId]);
                                  if (checkedItems.length === 0) {
                                    alert('💡 Please check off the ingredients you have bought first!');
                                    return;
                                  }

                                  const newRestockBuyList = { ...restockBuyList };
                                  const newCheckedBuyItems = { ...checkedBuyItems };

                                  if (onUpdateMultipleIngredientsStock) {
                                    const updates: Record<string, number> = {};
                                    checkedItems.forEach((item) => {
                                      updates[item.ingredientId] = item.currentQty + item.neededToBuy;
                                      // Clear from our manual/forecast buy list
                                      delete newRestockBuyList[item.ingredientId];
                                      delete newCheckedBuyItems[item.ingredientId];
                                    });
                                    onUpdateMultipleIngredientsStock(updates);
                                  } else {
                                    // Fallback if not supported
                                    checkedItems.forEach((item) => {
                                      onUpdateIngredientStock(item.ingredientId, item.currentQty + item.neededToBuy);
                                      // Clear from our manual/forecast buy list
                                      delete newRestockBuyList[item.ingredientId];
                                      delete newCheckedBuyItems[item.ingredientId];
                                    });
                                  }

                                  saveRestockBuyList(newRestockBuyList);
                                  saveCheckedBuyItems(newCheckedBuyItems);

                                  alert(`⚡ Successfully received and stocked ${checkedItems.length} ingredients! Physical kitchen levels are updated.`);
                                }}
                                className="px-3.5 py-2 bg-brand-gold text-black hover:opacity-95 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all focus:outline-none shadow-md cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> Commit Checked Purchases
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Needs Purchase checklist table */}
                      {itemsToBuy.length > 0 && (
                        <div className="overflow-x-auto rounded-2xl border border-white/5">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-[#0D0D0C] text-[9px] text-gray-400 uppercase font-black tracking-wider border-b border-white/5">
                                <th className="p-4 w-12 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span>Buy?</span>
                                    <input
                                      type="checkbox"
                                      checked={itemsToBuy.length > 0 && itemsToBuy.every(item => checkedBuyItems[item.ingredientId])}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        const updated = { ...checkedBuyItems };
                                        itemsToBuy.forEach(item => {
                                          if (checked) {
                                            updated[item.ingredientId] = true;
                                          } else {
                                            delete updated[item.ingredientId];
                                          }
                                        });
                                        saveCheckedBuyItems(updated);
                                      }}
                                      className="w-3.5 h-3.5 rounded border-white/10 bg-[#181818] text-brand-gold focus:ring-brand-gold accent-brand-gold cursor-pointer"
                                      title={itemsToBuy.every(item => checkedBuyItems[item.ingredientId]) ? "Deselect All" : "Select All"}
                                    />
                                  </div>
                                </th>
                                <th className="p-4">Ingredient Name</th>
                                <th className="p-4 text-center">Source Reason</th>
                                <th className="p-4 text-center">Current Stock</th>
                                <th className="p-4 text-center">Required Target</th>
                                <th className="p-4 text-center w-40">Purchase Amount</th>
                                <th className="p-4 text-right">Verification Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                              {itemsToBuy.map((item) => {
                                const isChecked = checkedBuyItems[item.ingredientId] || false;
                                
                                return (
                                  <tr 
                                    key={item.ingredientId} 
                                    className={`transition-colors ${
                                      isChecked 
                                        ? 'bg-green-500/5 hover:bg-green-500/10 opacity-70' 
                                        : 'bg-brand-red/5 hover:bg-brand-red/10'
                                    }`}
                                  >
                                    {/* Checkbox column */}
                                    <td className="p-4 text-center">
                                      <input
                                        type="checkbox"
                                        id={`checkbox-${item.ingredientId}`}
                                        checked={isChecked}
                                        onChange={() => {
                                          saveCheckedBuyItems({
                                            ...checkedBuyItems,
                                            [item.ingredientId]: !isChecked
                                          });
                                        }}
                                        className="w-4 h-4 rounded border-white/10 bg-[#181818] text-brand-gold focus:ring-brand-gold accent-brand-gold cursor-pointer"
                                      />
                                    </td>

                                    {/* Name column with line-through on check */}
                                    <td className="p-4">
                                      <label 
                                        htmlFor={`checkbox-${item.ingredientId}`}
                                        className={`font-black cursor-pointer transition-all ${
                                          isChecked ? 'line-through text-gray-500' : 'text-white'
                                        }`}
                                      >
                                        {item.name}
                                      </label>
                                    </td>

                                    {/* Source Reason Badges */}
                                    <td className="p-4 text-center">
                                      {item.source === 'prep' && (
                                        <span className="text-[8px] bg-brand-red/10 border border-brand-red/20 text-brand-red font-black px-2 py-0.5 rounded uppercase">
                                          🍳 Prep Deficit
                                        </span>
                                      )}
                                      {item.source === 'forecast' && (
                                        <span className="text-[8px] bg-brand-gold/15 border border-brand-gold/25 text-brand-gold font-black px-2 py-0.5 rounded uppercase">
                                          🔮 Low Stock restock
                                        </span>
                                      )}
                                      {item.source === 'both' && (
                                        <span className="text-[8px] bg-purple-500/15 border border-purple-500/25 text-purple-400 font-black px-2 py-0.5 rounded uppercase">
                                          ✨ Prep & Forecast
                                        </span>
                                      )}
                                    </td>

                                    {/* Current Inventory */}
                                    <td className="p-4 text-center font-mono text-gray-400">
                                      {item.currentQty} {item.unit}
                                    </td>

                                    {/* Required Target */}
                                    <td className="p-4 text-center font-mono text-gray-400">
                                      {item.requiredAmount} {item.unit}
                                    </td>

                                    {/* Purchase Quantity input */}
                                    <td className="p-4 text-center">
                                      {(() => {
                                        const targetDeficit = Math.max(0, item.requiredAmount - item.currentQty);
                                        const difference = item.neededToBuy - targetDeficit;
                                        return (
                                          <div className="flex flex-col items-center gap-1.5">
                                            <div className={`flex items-center gap-1 bg-[#181818] border rounded-lg px-2 py-1 max-w-[125px] mx-auto transition-all ${
                                              isChecked
                                                ? 'border-white/5 opacity-50'
                                                : difference < 0
                                                ? 'border-brand-red/50 bg-brand-red/5'
                                                : difference > 0
                                                ? 'border-blue-500/50 bg-blue-500/5'
                                                : 'border-white/10'
                                            }`}>
                                              <input
                                                type="number"
                                                min="0"
                                                value={item.neededToBuy}
                                                onChange={(e) => {
                                                  const val = Math.max(0, Number(e.target.value) || 0);
                                                  saveRestockBuyList({
                                                    ...restockBuyList,
                                                    [item.ingredientId]: val
                                                  });
                                                }}
                                                className="w-full bg-transparent text-center font-bold text-xs text-white focus:outline-none font-mono"
                                                disabled={isChecked}
                                              />
                                              <span className="text-[10px] text-gray-500 font-bold uppercase">{item.unit}</span>
                                            </div>
                                            
                                            {/* Target indicator & quick reset button */}
                                            <div className="flex items-center gap-1 text-[9px] font-medium">
                                              <span className="text-gray-500">Target: +{targetDeficit}{item.unit}</span>
                                              {item.hasOverride && !isChecked && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const updated = { ...restockBuyList };
                                                    delete updated[item.ingredientId];
                                                    saveRestockBuyList(updated);
                                                  }}
                                                  className="text-brand-gold hover:underline font-bold uppercase text-[8px] ml-1 bg-brand-gold/10 px-1 py-0.5 rounded cursor-pointer transition-all"
                                                  title="Reset to calculated target deficit"
                                                >
                                                  Reset
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </td>

                                    {/* Verification Status Badges & delete button */}
                                    <td className="p-4 text-right">
                                      {(() => {
                                        const targetDeficit = Math.max(0, item.requiredAmount - item.currentQty);
                                        const difference = item.neededToBuy - targetDeficit;
                                        return (
                                          <div className="flex items-center justify-end gap-3">
                                            <div className="flex flex-col items-end gap-0.5">
                                              {isChecked ? (
                                                <>
                                                  <span className="text-green-400 font-bold uppercase text-[9px] bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20 flex items-center gap-1">
                                                    ✓ Purchased / Checked
                                                  </span>
                                                  <span className="text-[8px] text-gray-500 font-mono">
                                                    New Level: {item.currentQty + item.neededToBuy}{item.unit} 
                                                    {item.currentQty + item.neededToBuy < item.requiredAmount 
                                                      ? ` (Short by ${item.requiredAmount - (item.currentQty + item.neededToBuy)}${item.unit})` 
                                                      : ' (Satisfied)'}
                                                  </span>
                                                </>
                                              ) : (
                                                <>
                                                  {difference < 0 ? (
                                                    <>
                                                      <span className="text-brand-red font-black uppercase text-[9px] bg-brand-red/10 px-2 py-0.5 rounded border border-brand-red/20 flex items-center gap-1 animate-pulse">
                                                        ⚠️ Short by {Math.abs(difference)} {item.unit}
                                                      </span>
                                                      <span className="text-[8px] text-gray-400 font-medium">
                                                        Doesn't satisfy target requirements
                                                      </span>
                                                    </>
                                                  ) : difference > 0 ? (
                                                    <>
                                                      <span className="text-blue-400 font-black uppercase text-[9px] bg-blue-400/10 px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
                                                        ✨ Surplus +{difference} {item.unit}
                                                      </span>
                                                      <span className="text-[8px] text-gray-400 font-medium">
                                                        Adding healthy safety buffer
                                                      </span>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <span className="text-green-400 font-bold uppercase text-[9px] bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20 flex items-center gap-1">
                                                        ✓ Perfect Match
                                                      </span>
                                                      <span className="text-[8px] text-gray-400 font-medium">
                                                        Meets requirements precisely
                                                      </span>
                                                    </>
                                                  )}
                                                </>
                                              )}
                                            </div>

                                            {/* Remove/Reset button */}
                                            {(item.source === 'forecast' || item.source === 'both') && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const updated = { ...restockBuyList };
                                                  delete updated[item.ingredientId];
                                                  saveRestockBuyList(updated);

                                                  const updatedChecked = { ...checkedBuyItems };
                                                  delete updatedChecked[item.ingredientId];
                                                  saveCheckedBuyItems(updatedChecked);
                                                }}
                                                className="p-1 text-gray-500 hover:text-brand-red hover:bg-brand-red/10 rounded transition-all cursor-pointer"
                                                title="Remove from manual restocks"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Fully Stocked / Satisfied Ingredients grid */}
                      {satisfiedItems.length > 0 && (
                        <div className="bg-[#0D0D0C] p-4 rounded-2xl border border-white/5 text-left">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-green-400 uppercase tracking-wider font-black flex items-center gap-1">
                              ✓ {satisfiedItems.length} Ingredients Fully Stocked for Planned Prep
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                            {satisfiedItems.map(item => (
                              <div key={item.ingredientId} className="bg-white/[0.01] border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between text-[11px]">
                                <span className="text-white font-semibold">{item.name}</span>
                                <div className="text-right">
                                  <span className="text-green-400 font-bold block">Stock: {item.currentQty}{item.unit}</span>
                                  <span className="text-gray-500 text-[9px] block">Required: {item.requiredAmount}{item.unit}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* BRAND NEW: Stock & Performance Reports Dashboard */}
          {stockViewMode === 'ingredients' && ingredientsSubTab === 'reports' && (
            <div className="bg-[#121211] border border-blue-500/20 rounded-[2rem] p-6 shadow-xl space-y-6 text-left relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                <TrendingUp className="w-48 h-48 text-blue-400" />
              </div>

              {/* Header and Period Toggle */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm bg-blue-500/10 text-blue-400 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Management Report
                    </span>
                    <span className="text-xs text-gray-400 font-bold">Auto-calculated Weekly & Monthly Metrics</span>
                  </div>
                  <h3 className="font-display font-black text-white text-lg md:text-xl mt-1.5 flex items-center gap-2">
                    📊 Stock & Inventory Performance Audit
                  </h3>
                  <p className="text-gray-400 text-xs mt-1 max-w-2xl font-medium leading-relaxed">
                    Review simulated depletion velocities, expected order volumes, and automated purchase checklists to maintain ideal safety stock levels without over-purchasing.
                  </p>
                </div>

                {/* Period Selector Toggle */}
                <div className="flex bg-[#0D0D0C] p-1.5 rounded-xl border border-white/5 shrink-0 self-start lg:self-center">
                  <button
                    type="button"
                    onClick={() => setReportsPeriodDays(7)}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      reportsPeriodDays === 7
                        ? 'bg-blue-500 text-black shadow-md font-extrabold'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" /> Weekly Report (7d)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportsPeriodDays(30)}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      reportsPeriodDays === 30
                        ? 'bg-blue-500 text-black shadow-md font-extrabold'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" /> Monthly Report (30d)
                  </button>
                </div>
              </div>

              {/* Calculations Block */}
              {(() => {
                const periodDays = reportsPeriodDays;
                
                // Estimate unit prices in PHP (₱) for standard items
                const getUnitPrice = (unit: string, ingId?: string) => {
                  if (ingId) {
                    const ing = ingredientsInventory.find(i => i.id === ingId);
                    if (ing && ing.costPerUnit !== undefined && ing.costPerUnit !== null) {
                      return ing.costPerUnit;
                    }
                  }
                  switch (unit.toLowerCase()) {
                    case 'g': return 0.05;      // ₱0.05 per gram (₱50 per kg)
                    case 'kg': return 150.00;   // ₱150.00 per kg
                    case 'pcs': return 15.00;   // ₱15.00 per piece
                    case 'ml': return 0.08;     // ₱0.08 per ml
                    case 'cans': return 45.00;  // ₱45.00 per can
                    default: return 5.00;
                  }
                };

                let totalConsumedWeight = 0;
                let totalConsumedPcs = 0;
                let totalConsumedCans = 0;
                let totalRestockItemsCount = 0;
                let estimatedRestockCost = 0;
                let criticalRiskCount = 0;

                const reportsData = forecastData.map((item) => {
                  const projectedConsumption = item.dailyRate * periodDays;
                  const endingStock = Math.max(0, item.quantity - projectedConsumption);
                  const isDepleted = endingStock <= 0 || item.quantity <= item.lowStockAlert;
                  
                  // Recommended target quantity for the selected period (Expected consumption + 3 days buffer)
                  const targetPeriodStock = projectedConsumption + (item.dailyRate * 3);
                  const suggestedPurchase = Math.max(0, Math.ceil(targetPeriodStock - item.quantity));
                  const estimatedCost = suggestedPurchase * getUnitPrice(item.unit, item.id);

                  if (projectedConsumption > 0) {
                    if (item.unit === 'g') {
                      totalConsumedWeight += projectedConsumption;
                    } else if (item.unit === 'kg') {
                      totalConsumedWeight += projectedConsumption * 1000;
                    } else if (item.unit === 'pcs') {
                      totalConsumedPcs += projectedConsumption;
                    } else if (item.unit === 'cans') {
                      totalConsumedCans += projectedConsumption;
                    }
                  }
                  if (suggestedPurchase > 0) {
                    totalRestockItemsCount++;
                    estimatedRestockCost += estimatedCost;
                  }
                  
                  // Critical risk if we run out within the selected period days
                  if (item.daysOfStockLeft <= periodDays) {
                    criticalRiskCount++;
                  }

                  const depletionPercentage = item.quantity > 0 
                    ? Math.min(100, Math.round((projectedConsumption / item.quantity) * 100))
                    : 100;

                  return {
                    ...item,
                    projectedConsumption,
                    endingStock,
                    isDepleted,
                    suggestedPurchase,
                    estimatedCost,
                    depletionPercentage
                  };
                });

                const healthyPercentage = Math.round(
                  ((forecastData.length - criticalRiskCount) / (forecastData.length || 1)) * 100
                );

                const handleAddAllRestocksToBuyList = () => {
                  const updatedList = { ...restockBuyList };
                  reportsData.forEach((item) => {
                    if (item.suggestedPurchase > 0) {
                      updatedList[item.id] = item.suggestedPurchase;
                    }
                  });
                  saveRestockBuyList(updatedList);
                };

                return (
                  <div className="space-y-6">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Metric 1 */}
                      <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block">Estimated Demand</span>
                          <h4 className="text-white font-display font-black text-lg mt-1">
                            {totalConsumedWeight > 0 ? `${(totalConsumedWeight / 1000).toFixed(1)}kg raw` : ''}
                            {totalConsumedPcs > 0 ? ` + ${Math.ceil(totalConsumedPcs)} pcs` : ''}
                            {totalConsumedCans > 0 ? ` + ${Math.ceil(totalConsumedCans)} cans` : ''}
                            {totalConsumedWeight === 0 && totalConsumedPcs === 0 && totalConsumedCans === 0 ? '0 materials' : ''}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-2">
                          <TrendingUp className="w-3 h-3 text-blue-400" />
                          <span>Paced usage for next {periodDays} days</span>
                        </div>
                      </div>

                      {/* Metric 2 */}
                      <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block">Deficit / Restock Items</span>
                          <h4 className="text-white font-display font-black text-lg mt-1">
                            <span className={totalRestockItemsCount > 0 ? 'text-brand-gold' : 'text-green-400'}>
                              {totalRestockItemsCount} Materials
                            </span>
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-2">
                          <AlertTriangle className="w-3 h-3 text-brand-gold" />
                          <span>Need purchase orders</span>
                        </div>
                      </div>

                      {/* Metric 3 */}
                      <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block">Estimated Budget Index</span>
                          <h4 className="text-white font-display font-black text-lg mt-1">
                            <span className="text-blue-400">₱{estimatedRestockCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-2">
                          <ShoppingCart className="w-3 h-3 text-blue-400" />
                          <span>Estimated stock cost index</span>
                        </div>
                      </div>

                      {/* Metric 4 */}
                      <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block">Coverage Safety Index</span>
                          <h4 className="text-white font-display font-black text-lg mt-1">
                            <span className={healthyPercentage > 70 ? 'text-green-400' : healthyPercentage > 40 ? 'text-brand-gold' : 'text-brand-red'}>
                              {healthyPercentage}% Stable
                            </span>
                          </h4>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-2">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          <span>{criticalRiskCount} materials at depletion risk</span>
                        </div>
                      </div>
                    </div>

                    {/* Critical Alerts Block (If any are critical) */}
                    {criticalRiskCount > 0 && (
                      <div className="bg-brand-red/10 border border-brand-red/20 p-4 rounded-2xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-brand-red shrink-0 mt-0.5 animate-pulse" />
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-brand-red uppercase block">Urgent depletion alerts for {periodDays === 7 ? 'this week' : 'this month'}:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {reportsData
                              .filter(item => item.daysOfStockLeft <= periodDays)
                              .map(item => (
                                <span key={item.id} className="bg-[#0D0D0C] text-white font-mono text-[9px] font-black border border-brand-red/30 rounded-lg px-2.5 py-1">
                                  ⚠️ {item.name}: Out in {item.daysOfStockLeft <= 0 ? '0' : item.daysOfStockLeft.toFixed(1)} days! (Short {Math.ceil(item.projectedConsumption - item.quantity)}{item.unit})
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Horizontal Depletion Heatmap */}
                    <div className="bg-[#181818] border border-white/5 rounded-[1.5rem] p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-black">
                          🔥 Material Depletion Velocity Heatmap ({periodDays === 7 ? 'Next 7 Days' : 'Next 30 Days'})
                        </span>
                        <span className="text-[9px] text-gray-500 font-bold uppercase">
                          % of Current Stock Consumed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {reportsData.map((item) => {
                          const percent = item.depletionPercentage;
                          const barColorClass = percent >= 100 
                            ? 'bg-brand-red' 
                            : percent >= 75 
                            ? 'bg-brand-gold' 
                            : 'bg-blue-500';

                          return (
                            <div key={item.id} className="space-y-1 text-xs">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-white font-black">{item.name}</span>
                                <span className="font-mono text-gray-400">
                                  {item.projectedConsumption.toFixed(0)}{item.unit} / <strong className="text-white">{item.quantity}{item.unit}</strong> ({percent}%)
                                </span>
                              </div>
                              <div className="w-full bg-[#0D0D0C] h-2 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className={`h-full ${barColorClass} transition-all duration-500`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Report Table & Purchase Suggestions */}
                    <div className="bg-[#181818] border border-white/5 rounded-[1.5rem] p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-black block">
                            📋 Recommended Purchase Order Checklist
                          </span>
                          <span className="text-[11px] text-gray-500 font-medium block">
                            Auto-computed required quantities to cover demand + 3 days safety buffer.
                          </span>
                        </div>

                        {totalRestockItemsCount > 0 && (
                          <button
                            type="button"
                            onClick={handleAddAllRestocksToBuyList}
                            className="px-3.5 py-2 bg-blue-500 text-black hover:opacity-90 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all self-start sm:self-center cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> Add All Restocks to Buy List
                          </button>
                        )}
                      </div>

                      {/* Desktop Table View */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[9px] text-gray-500 font-black uppercase tracking-wider">
                              <th className="pb-3">Material</th>
                              <th className="pb-3 text-center">Daily Burn</th>
                              <th className="pb-3 text-center">Current Stock</th>
                              <th className="pb-3 text-center">Period Consumption</th>
                              <th className="pb-3 text-center">Ending Stock Est.</th>
                              <th className="pb-3 text-center">Suggested Buy</th>
                              <th className="pb-3 text-right">Est. Budget</th>
                              <th className="pb-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportsData.map((item) => {
                              const isInBuyList = (restockBuyList[item.id] || 0) > 0;
                              return (
                                <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                                  <td className="py-3 font-bold text-white text-[11px]">{item.name}</td>
                                  <td className="py-3 text-center font-mono text-gray-400">~{item.dailyRate.toFixed(1)}{item.unit}</td>
                                  <td className="py-3 text-center font-mono text-gray-300 font-semibold">{item.quantity}{item.unit}</td>
                                  <td className="py-3 text-center font-mono text-gray-400">{item.projectedConsumption.toFixed(0)}{item.unit}</td>
                                  <td className={`py-3 text-center font-mono font-bold ${item.endingStock <= 0 ? 'text-brand-red bg-brand-red/5' : 'text-green-400'}`}>
                                    {item.endingStock.toFixed(0)}{item.unit}
                                    {item.endingStock <= 0 && ' (EMPTY)'}
                                  </td>
                                  <td className={`py-3 text-center font-mono font-black ${item.suggestedPurchase > 0 ? 'text-brand-gold' : 'text-gray-500'}`}>
                                    {item.suggestedPurchase > 0 ? `+${item.suggestedPurchase} ${item.unit}` : '0'}
                                  </td>
                                  <td className="py-3 text-right font-mono font-semibold text-gray-300">
                                    {item.suggestedPurchase > 0 ? `₱${item.estimatedCost.toFixed(2)}` : '—'}
                                  </td>
                                  <td className="py-3 text-right">
                                    {item.suggestedPurchase > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isInBuyList) {
                                            const updated = { ...restockBuyList };
                                            delete updated[item.id];
                                            saveRestockBuyList(updated);
                                          } else {
                                            saveRestockBuyList({
                                              ...restockBuyList,
                                              [item.id]: item.suggestedPurchase
                                            });
                                          }
                                        }}
                                        className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                          isInBuyList
                                            ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                                            : 'bg-[#0D0D0C] text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-black'
                                        }`}
                                      >
                                        {isInBuyList ? '✓ In Buy List' : 'Add to Buy'}
                                      </button>
                                    ) : (
                                      <span className="text-[8px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded font-bold uppercase">stocked</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Actionable Optimization Insights Panel */}
                    <div className="bg-[#0D0D0C]/50 border border-white/5 rounded-[1.5rem] p-5 space-y-3">
                      <span className="text-[10px] text-brand-gold uppercase tracking-wider font-black block flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-gold animate-pulse" /> Smart Inventory Optimizer Insights
                      </span>
                      
                      <div className="space-y-2 text-xs text-gray-400">
                        {/* Dynamic Alert 1: Crucial ingredient depletion */}
                        {reportsData.some(item => item.endingStock <= 0) ? (
                          <div className="flex items-start gap-2">
                            <span className="text-brand-red font-bold shrink-0">CRITICAL:</span>
                            <span>
                              Our calculations show that <strong>{reportsData.filter(item => item.endingStock <= 0).map(i => i.name).join(', ')}</strong> will deplete fully during this {periodDays}-day period. Placing restock purchase orders now is highly recommended to avoid culinary menu blackouts.
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <span className="text-green-400 font-bold shrink-0">STABLE:</span>
                            <span>
                              All raw ingredients have sufficient volume to survive this {periodDays}-day run period under current sales paces! No immediate emergency restocks needed.
                            </span>
                          </div>
                        )}

                        {/* Dynamic Alert 2: Safe surplus suggestion */}
                        {reportsData.some(item => item.quantity > item.projectedConsumption * 2.5 && item.quantity > 500) && (
                          <div className="flex items-start gap-2 pt-1">
                            <span className="text-blue-400 font-bold shrink-0">SURPLUS:</span>
                            <span>
                              <strong>{reportsData.find(item => item.quantity > item.projectedConsumption * 2.5 && item.quantity > 500)?.name}</strong> has a healthy surplus covering over {periodDays * 2} days. Consider offering customized promos (e.g. spring onion or chili garlic side garnishments) to stimulate creative kitchen utility and prevent long-term storage shelf rot.
                            </span>
                          </div>
                        )}

                        {/* Standard Advice */}
                        <div className="flex items-start gap-2 pt-1 border-t border-white/5 mt-2">
                          <span className="text-gray-500 font-bold shrink-0">STRATEGY:</span>
                          <span>
                            Keeping a 3-day safety cushion prevents service interruption from volatile peak weekend sales spikes. Double-check your daily customer order trends if hosting local holiday celebrations!
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>
          )}

          {/* Add Ingredient Form Card (Slide-down inline form) */}
          {stockViewMode === 'ingredients' && ingredientsSubTab === 'control-board' && isAddIngredientOpen && (
            <div className="bg-[#181818] border-2 border-brand-red/30 rounded-[2rem] p-6 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌾</span>
                  <div>
                    <h3 className="font-display font-bold text-white text-base">Add New Material / Ingredient</h3>
                    <p className="text-gray-400 text-xs">Define a raw material to track inventory. Recipes linked to this material are auto-hidden if stock is zero.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddIngredientOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddNewIngredientSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-1.5">Material Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Premium Beef Tapa"
                    value={newIngredientName}
                    onChange={(e) => setNewIngredientName(e.target.value)}
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-1.5">Initial Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="3000"
                    value={newIngredientQuantity}
                    onChange={(e) => setNewIngredientQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-1.5">Measurement Unit *</label>
                  <select
                    value={newIngredientUnit}
                    onChange={(e) => {
                      const u = e.target.value;
                      setNewIngredientUnit(u);
                      if (u === 'g') setNewIngredientCostPerUnit(0.05);
                      else if (u === 'kg') setNewIngredientCostPerUnit(150.00);
                      else if (u === 'pcs') setNewIngredientCostPerUnit(15.00);
                      else if (u === 'ml') setNewIngredientCostPerUnit(0.08);
                      else if (u === 'cans') setNewIngredientCostPerUnit(45.00);
                    }}
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilos (kg)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="cans">Cans</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-1.5">Low Stock Threshold *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="500"
                    value={newIngredientLowStock}
                    onChange={(e) => setNewIngredientLowStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">Unit Purchase Cost (₱) *</label>
                    {newIngredientCostPerUnit !== '' && Number(newIngredientCostPerUnit) > 0 && (
                      <span className="text-[8.5px] font-mono text-brand-gold font-extrabold bg-brand-gold/10 px-1.5 py-0.2 rounded border border-brand-gold/20">
                        ₱{Number(newIngredientCostPerUnit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{newIngredientUnit}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.05"
                    value={newIngredientCostPerUnit}
                    onChange={(e) => setNewIngredientCostPerUnit(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                  />
                </div>

                <div className="md:col-span-2 space-y-2.5 border border-brand-gold/30 bg-[#121211] p-3.5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-brand-gold uppercase tracking-wider font-black flex items-center gap-1">
                      💡 Smart Bulk Pack & Multipack Calculator (Optional)
                    </span>
                    {Number(newIngredientPackSize) > 0 && (
                      <span className="text-brand-gold font-mono text-[9px] font-extrabold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20">
                        {(() => {
                          const count = Number(newIngredientPacksCount) || (Number(newIngredientQuantity) > 0 ? Number(newIngredientQuantity) : 1);
                          const size = Number(newIngredientPackSize);
                          return `${count} packs × ${size}${newIngredientUnit} = ${(count * size).toLocaleString()}${newIngredientUnit}`;
                        })()}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[9px] text-gray-400 uppercase tracking-wider font-bold block mb-1">
                        Packs / Cans Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 4"
                        value={newIngredientPacksCount}
                        onChange={(e) => setNewIngredientPacksCount(e.target.value)}
                        className="w-full bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-gray-400 uppercase tracking-wider font-bold block mb-1">
                        Pack Size ({newIngredientUnit})
                      </label>
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        placeholder="e.g. 85"
                        value={newIngredientPackSize}
                        onChange={(e) => handleNewPackSizeChange(e.target.value)}
                        className="w-full bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-gray-400 uppercase tracking-wider font-bold block mb-1">
                        Pack Cost (₱)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        placeholder="e.g. 27.50"
                        value={newIngredientPackCost}
                        onChange={(e) => handleNewPackCostChange(e.target.value)}
                        className="w-full bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                      />
                    </div>
                  </div>

                  {Number(newIngredientPackSize) > 0 && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 flex-wrap">
                      <div className="text-[9px] text-gray-400 font-mono">
                        Calculated Stock: <strong className="text-white font-bold">{((Number(newIngredientPacksCount) || 1) * Number(newIngredientPackSize)).toLocaleString()}{newIngredientUnit}</strong>
                        {Number(newIngredientPackCost) > 0 && (
                          <span> • Unit Cost: <strong className="text-brand-gold">₱{(Number(newIngredientPackCost) / Number(newIngredientPackSize)).toFixed(2)}/{newIngredientUnit}</strong></span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyNewBulkPackCalculation}
                        className="px-3 py-1.5 bg-brand-gold text-black rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-brand-gold-hover transition-all cursor-pointer shadow-sm flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>⚡ Apply to Stock Qty ({((Number(newIngredientPacksCount) || 1) * Number(newIngredientPackSize)).toLocaleString()}{newIngredientUnit})</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2 md:col-span-5 flex justify-end gap-2 mt-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsAddIngredientOpen(false)}
                    className="px-4 py-2 border border-white/10 text-white hover:bg-white/5 rounded-xl text-xs font-bold uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-red text-white hover:opacity-90 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Save & Add Material
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search, Filter & Stock Grid container */}
          {(stockViewMode === 'recipes' || (stockViewMode === 'ingredients' && ingredientsSubTab === 'control-board')) && (
            <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
              <div>
                <h3 className="font-display font-bold text-white text-base">
                  {stockViewMode === 'ingredients' 
                    ? '📊 Ingredient Inventory Control Board' 
                    : '📊 Dish Recipes Availability Checklist'}
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  {stockViewMode === 'ingredients'
                    ? 'Manage raw ingredients levels. If any ingredient is 0, all meals containing it are automatically marked SOLD OUT.'
                    : 'Manually override dish status or view remaining servings based on recipe level capacity.'}
                </p>
              </div>

              {/* Filters and Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={stockSearchQuery}
                    onChange={(e) => setStockSearchQuery(e.target.value)}
                    placeholder={stockViewMode === 'ingredients' ? "Search ingredients..." : "Search dishes..."}
                    className="pl-9 pr-4 py-1.5 w-48 sm:w-60 bg-[#0D0D0C] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-red"
                  />
                </div>

                {stockViewMode === 'recipes' && (
                  <select
                    value={stockCategoryFilter}
                    onChange={(e) => setStockCategoryFilter(e.target.value as Category | 'all')}
                    className="bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red"
                  >
                    <option value="all">All Categories</option>
                    <option value="bento">Bento Meals</option>
                    <option value="silog">Silog Classics</option>
                    <option value="rice-bowl">Rice Bowls</option>
                    <option value="drinks">Drinks</option>
                  </select>
                )}

                {stockViewMode === 'ingredients' && (
                  <>
                    <select
                      value={stockIngredientRecipeFilter}
                      onChange={(e) => setStockIngredientRecipeFilter(e.target.value)}
                      className="bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold max-w-[180px] sm:max-w-[240px] truncate"
                    >
                      <option value="all">🔍 All Recipes (No Filter)</option>
                      {menuItems
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            🍽️ {item.name} ({item.category.toUpperCase()})
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsAddIngredientOpen(true)}
                      className="px-3.5 py-1.5 bg-brand-red text-white hover:opacity-90 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all focus:outline-none"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Material
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Main Inventory Sheet Grid: INGREDIENTS VIEW */}
            {stockViewMode === 'ingredients' && stockIngredientRecipeFilter !== 'all' && (
              <div className="flex items-center justify-between bg-brand-gold/10 border border-brand-gold/20 p-3 rounded-2xl text-xs text-brand-gold animate-fade-in text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold">🎯 Showing raw materials required for:</span>
                  <span className="bg-brand-gold text-black font-black px-2 py-0.5 rounded text-[10px] uppercase">
                    {menuItems.find(i => i.id === stockIngredientRecipeFilter)?.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStockIngredientRecipeFilter('all')}
                  className="text-white hover:text-brand-gold transition-colors font-bold uppercase text-[10px] ml-4 shrink-0"
                >
                  Clear Filter ✕
                </button>
              </div>
            )}

            {stockViewMode === 'ingredients' && (
              filteredIngredients.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-xs font-medium">
                  💤 No raw ingredients matching search parameters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredIngredients.map((ing) => {
                    const isOutOfStock = ing.quantity <= 0;
                    const isLow = ing.quantity > 0 && ing.quantity <= ing.lowStockAlert;
                    const fItem = forecastData.find(f => f.id === ing.id);
                    
                    // Count how many recipes are affected by this ingredient
                    const affectedDishesCount = menuItems.filter(item => 
                      item.ingredients?.some(name => name.toLowerCase() === ing.name.toLowerCase())
                    ).length;

                    if (editingIngredientId === ing.id) {
                      return (
                        <form
                          key={ing.id}
                          onSubmit={handleEditIngredientSubmit}
                          className="p-4 rounded-2xl border-2 border-brand-red bg-[#121211] flex flex-col justify-between gap-3 animate-fade-in text-left"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-brand-red font-black uppercase tracking-wider">✏️ Edit Material</span>
                              <button
                                type="button"
                                onClick={() => setEditingIngredientId(null)}
                                className="p-1 text-gray-500 hover:text-white rounded transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div>
                              <label className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block mb-1">Material Name</label>
                              <input
                                type="text"
                                required
                                value={editIngredientName}
                                onChange={(e) => setEditIngredientName(e.target.value)}
                                className="w-full bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block mb-1">Stock Qty</label>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  value={editIngredientQuantity}
                                  onChange={(e) => setEditIngredientQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block mb-1">Unit</label>
                                <select
                                  value={editIngredientUnit}
                                  onChange={(e) => setEditIngredientUnit(e.target.value)}
                                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                                >
                                  <option value="g">Grams (g)</option>
                                  <option value="kg">Kilos (kg)</option>
                                  <option value="pcs">Pieces (pcs)</option>
                                  <option value="ml">Milliliters (ml)</option>
                                  <option value="cans">Cans</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block mb-1">Low Stock Alert</label>
                                <input
                                  type="number"
                                  required
                                  min="0"
                                  value={editIngredientLowStock}
                                  onChange={(e) => setEditIngredientLowStock(Number(e.target.value))}
                                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block">
                                    Unit Purchase Cost (₱)
                                  </label>
                                  {editIngredientCostPerUnit !== '' && Number(editIngredientCostPerUnit) > 0 && (
                                    <span className="text-[8.5px] font-mono text-brand-gold font-extrabold bg-brand-gold/10 px-1.5 py-0.2 rounded border border-brand-gold/20">
                                      ₱{Number(editIngredientCostPerUnit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{editIngredientUnit}
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  required
                                  step="0.01"
                                  min="0"
                                  value={editIngredientCostPerUnit}
                                  onChange={(e) => setEditIngredientCostPerUnit(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                                />
                              </div>
                            </div>

                            <div className="space-y-2.5 border border-brand-gold/30 bg-[#121211] p-3 rounded-xl">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-brand-gold uppercase tracking-wider font-black flex items-center gap-1">
                                  💡 Smart Bulk Pack & Multipack Calculator (Optional)
                                </span>
                                {Number(editIngredientPackSize) > 0 && (
                                  <span className="text-brand-gold font-mono text-[9px] font-extrabold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20">
                                    {(() => {
                                      const count = Number(editIngredientPacksCount) || (Number(editIngredientQuantity) > 0 ? Number(editIngredientQuantity) : 1);
                                      const size = Number(editIngredientPackSize);
                                      return `${count} packs × ${size}${editIngredientUnit} = ${(count * size).toLocaleString()}${editIngredientUnit}`;
                                    })()}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <label className="text-[9px] text-gray-400 uppercase tracking-wider font-bold block mb-1">
                                    Packs / Cans Count
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="e.g. 4"
                                    value={editIngredientPacksCount}
                                    onChange={(e) => setEditIngredientPacksCount(e.target.value)}
                                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                                  />
                                </div>

                                <div>
                                  <label className="text-[9px] text-gray-400 uppercase tracking-wider font-bold block mb-1">
                                    Pack Size ({editIngredientUnit})
                                  </label>
                                  <input
                                    type="number"
                                    min="0.001"
                                    step="any"
                                    placeholder="e.g. 85"
                                    value={editIngredientPackSize}
                                    onChange={(e) => handleEditPackSizeChange(e.target.value)}
                                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                                  />
                                </div>

                                <div>
                                  <label className="text-[9px] text-gray-400 uppercase tracking-wider font-bold block mb-1">
                                    Pack Cost (₱)
                                  </label>
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    placeholder="e.g. 27.50"
                                    value={editIngredientPackCost}
                                    onChange={(e) => handleEditPackCostChange(e.target.value)}
                                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                                  />
                                </div>
                              </div>

                              {Number(editIngredientPackSize) > 0 && (
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 flex-wrap">
                                  <div className="text-[9px] text-gray-400 font-mono">
                                    Calculated Stock: <strong className="text-white font-bold">{((Number(editIngredientPacksCount) || 1) * Number(editIngredientPackSize)).toLocaleString()}{editIngredientUnit}</strong>
                                    {Number(editIngredientPackCost) > 0 && (
                                      <span> • Unit Cost: <strong className="text-brand-gold">₱{(Number(editIngredientPackCost) / Number(editIngredientPackSize)).toFixed(2)}/{editIngredientUnit}</strong></span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleApplyEditBulkPackCalculation}
                                    className="px-3 py-1 bg-brand-gold text-black rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-brand-gold-hover transition-all cursor-pointer shadow-sm flex items-center gap-1"
                                  >
                                    <Zap className="w-3 h-3" />
                                    <span>⚡ Apply to Stock Qty ({((Number(editIngredientPacksCount) || 1) * Number(editIngredientPackSize)).toLocaleString()}{editIngredientUnit})</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => setEditingIngredientId(null)}
                              className="px-3 py-1 border border-white/10 text-white hover:bg-white/5 rounded-lg text-[10px] font-bold uppercase transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3.5 py-1 bg-brand-red text-white hover:opacity-90 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                              Save Changes
                            </button>
                          </div>
                        </form>
                      );
                    }

                    return (
                      <div
                        key={ing.id}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                          isOutOfStock
                            ? 'bg-[#0D0D0C] border-brand-red/25 opacity-80'
                            : isLow
                            ? 'bg-[#1e1a11] border-brand-gold/30'
                            : 'bg-[#0D0D0C] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="font-display font-bold text-white text-sm block leading-tight">{ing.name}</span>
                              <div className="flex items-center justify-between mt-1.5">
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">
                                  🥣 Used in {affectedDishesCount} recipe{affectedDishesCount === 1 ? '' : 's'}
                                </span>
                                <span className="text-[10px] font-mono text-brand-gold font-extrabold bg-brand-gold/10 px-2 py-0.5 rounded-lg border border-brand-gold/10" title="Unit Cost">
                                  ₱{(ing.costPerUnit !== undefined ? ing.costPerUnit : (ing.unit === 'pcs' ? 15.00 : ing.unit === 'cans' ? 45.00 : ing.unit === 'ml' ? 0.08 : ing.unit === 'kg' ? 150.00 : 0.05)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{ing.unit}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingIngredientId(ing.id);
                                  setEditIngredientName(ing.name);
                                  setEditIngredientQuantity(ing.quantity);
                                  setEditIngredientUnit(ing.unit);
                                  setEditIngredientLowStock(ing.lowStockAlert);
                                  const rawCost = ing.costPerUnit !== undefined ? ing.costPerUnit : (ing.unit === 'pcs' ? 15.00 : ing.unit === 'cans' ? 45.00 : ing.unit === 'ml' ? 0.08 : ing.unit === 'kg' ? 150.00 : 0.05);
                                  setEditIngredientCostPerUnit(Number(rawCost.toFixed(2)));
                                  setEditIngredientPacksCount(
                                    ing.packCount !== undefined && ing.packCount > 0 
                                      ? String(ing.packCount) 
                                      : (ing.quantity > 0 && ing.quantity <= 100 ? String(ing.quantity) : '1')
                                  );
                                  setEditIngredientPackSize(ing.packSize !== undefined && ing.packSize > 0 ? String(ing.packSize) : '');
                                  setEditIngredientPackCost(ing.packCost !== undefined && ing.packCost > 0 ? String(Number(ing.packCost).toFixed(2)) : '');
                                }}
                                className="p-1.5 text-gray-500 hover:text-brand-gold hover:bg-brand-gold/5 rounded-lg transition-all"
                                title="Edit Material Details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Actions (Delete Raw Material) */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remove ingredient "${ing.name}" from inventory tracking?`)) {
                                    onDeleteIngredient(ing.id);
                                  }
                                }}
                                className="p-1.5 text-gray-500 hover:text-brand-red hover:bg-brand-red/5 rounded-lg transition-all"
                                title="Delete Material"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Stat indicators */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {isOutOfStock ? (
                              <span className="text-[8px] bg-brand-red/10 border border-brand-red/20 text-brand-red font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                🚨 Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="text-[8px] bg-brand-gold/15 border border-brand-gold/25 text-brand-gold font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                ⚠️ Low Stock Alert (&lt;{ing.lowStockAlert}{ing.unit})
                              </span>
                            ) : (
                              <span className="text-[8px] bg-green-500/10 border border-green-500/20 text-green-400 font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                ✓ Healthy Stock
                              </span>
                            )}
                          </div>

                           {/* Mini Forecast Info on Individual Card */}
                           {fItem && (
                             <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-col gap-1 text-[10px]">
                               <div className="flex justify-between text-gray-400 font-medium">
                                 <span>Est. Usage:</span>
                                 <span className="font-mono text-white font-bold">
                                   {fItem.dailyRate > 0 ? `~${fItem.dailyRate.toFixed(1)}${ing.unit}/day` : `~0 ${ing.unit}/day`}
                                 </span>
                               </div>
                               <div className="flex justify-between text-gray-400 font-medium">
                                 <span>Stock Lifespan:</span>
                                 {fItem.quantity <= fItem.lowStockAlert ? (
                                   <span className="text-brand-gold font-bold text-right flex items-center gap-1">
                                     ⚠️ Low Stock Alert (&le; {fItem.lowStockAlert}{ing.unit})
                                   </span>
                                 ) : fItem.daysOfStockLeft <= 0 ? (
                                   <span className="text-brand-red font-black uppercase">Depleted 🚨</span>
                                 ) : fItem.daysOfStockLeft <= forecastPeriodDays ? (
                                   <span className="text-brand-gold font-bold text-right">⚠️ {fItem.daysOfStockLeft.toFixed(1)} days left</span>
                                 ) : (
                                   <span className="text-green-400 font-bold text-right">
                                     {fItem.daysOfStockLeft === Infinity ? '✓ Safe (No demand)' : `✓ ${fItem.daysOfStockLeft.toFixed(1)} days`}
                                   </span>
                                 )}
                               </div>
                               {fItem.recommendedRestock > 0 && (() => {
                                 const isInBuyList = (restockBuyList[ing.id] || 0) > 0;
                                 return (
                                   <div className="mt-2 flex flex-col gap-1 bg-brand-gold/5 border border-brand-gold/15 p-1.5 rounded-xl text-[9px] text-brand-gold font-bold">
                                     <div className="flex items-center justify-between">
                                       <span>Suggested Restock:</span>
                                       <span className="font-mono font-black text-[10px]">+{fItem.recommendedRestock}{ing.unit}</span>
                                     </div>
                                     <button
                                       type="button"
                                       onClick={() => {
                                         if (isInBuyList) {
                                           const updated = { ...restockBuyList };
                                           delete updated[ing.id];
                                           saveRestockBuyList(updated);
                                         } else {
                                           saveRestockBuyList({
                                             ...restockBuyList,
                                             [ing.id]: fItem.recommendedRestock
                                           });
                                         }
                                       }}
                                       className={`mt-1 w-full py-1 rounded font-black uppercase text-[8px] tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                                         isInBuyList
                                           ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500 hover:text-black'
                                           : 'bg-[#121211] border-brand-gold/20 text-brand-gold hover:bg-brand-gold hover:text-black'
                                       }`}
                                     >
                                       {isInBuyList ? '✓ Added to Buy List' : '🛒 Add to Buy List'}
                                     </button>
                                   </div>
                                 );
                               })()}
                             </div>
                           )}
                        </div>

                        {/* Stock level display (edit via Edit form) */}
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500 font-medium">Stock:</span>
                            <span className="font-mono font-bold text-xs text-white bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                              {ing.quantity} <span className="text-[9px] text-gray-500 font-bold uppercase">{ing.unit}</span>
                            </span>
                          </div>

                          <span className="text-[10px] text-gray-500 font-medium">
                            Alert: {ing.lowStockAlert} {ing.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Main Inventory Sheet Grid: RECIPES DISHES VIEW */}
            {stockViewMode === 'recipes' && (
              filteredStockItems.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-xs font-medium">
                  💤 No dishes matching search / category requirements.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStockItems.map((item) => {
                    const qty = stockLevels[item.id] ?? 0;
                    const isUnavailable = unavailableItemIds.includes(item.id) || qty <= 0;
                    const isLow = qty > 0 && qty < 10;
                    const financials = calculateDishRecipeCost(item, ingredientsInventory);

                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                          qty <= 0 
                            ? 'bg-[#0D0D0C] border-brand-red/25 opacity-75' 
                            : isLow 
                            ? 'bg-[#1e1a11] border-brand-gold/30' 
                            : 'bg-[#0D0D0C] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div>
                          <div className="flex gap-3 items-start">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded-xl flex-shrink-0 border border-white/10"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <span className="font-display font-bold text-white text-sm block truncate">{item.name}</span>
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider capitalize">{item.category} • ₱{item.price}</span>
                              
                              {/* Stock Badges */}
                              <div className="flex gap-1.5 mt-1">
                                {qty <= 0 ? (
                                  <span className="text-[8px] bg-brand-red/10 border border-brand-red/20 text-brand-red font-black px-1.5 py-0.5 rounded uppercase">Out of Stock</span>
                                ) : isLow ? (
                                  <span className="text-[8px] bg-brand-gold/15 border border-brand-gold/25 text-brand-gold font-black px-1.5 py-0.5 rounded uppercase">Low Stock Alert</span>
                                ) : (
                                  <span className="text-[8px] bg-green-500/10 border border-green-500/20 text-green-400 font-black px-1.5 py-0.5 rounded uppercase">Healthy Stock</span>
                                )}
                                
                                {unavailableItemIds.includes(item.id) && (
                                  <span className="text-[8px] bg-gray-500/15 border border-white/15 text-gray-400 font-black px-1.5 py-0.5 rounded uppercase">Manually Hidden</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ingredient Capacity Details & Syncing */}
                          {item.ingredients && item.ingredients.length > 0 ? (
                            <div className="mt-3.5 bg-black/45 p-3 rounded-xl border border-white/5 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">🌾 Recipe Capacity</span>
                                <span className="text-[11px] font-mono font-black text-brand-gold">
                                  {(() => {
                                    const servings = getServingsForDish(item, ingredientsInventory);
                                    return servings === null ? 'N/A' : `${servings} Servings`;
                                  })()}
                                </span>
                              </div>
                              
                              <div className="space-y-1.5">
                                {item.recipeRequirements && item.recipeRequirements.length > 0 ? (
                                  item.recipeRequirements.map((reqItem) => {
                                    const ing = ingredientsInventory.find(
                                      (i) => i.name.toLowerCase() === reqItem.name.toLowerCase()
                                    );
                                    const reqQty = ing ? (ing.unit === 'kg' ? reqItem.amount / 1000 : reqItem.amount) : reqItem.amount;
                                    const available = ing ? Math.floor(ing.quantity / reqQty) : 0;
                                    const isLowIng = ing ? (ing.quantity <= ing.lowStockAlert) : true;
                                    const reqDisplay = ing ? (ing.unit === 'kg' ? `${reqItem.amount}g` : `${reqItem.amount}${ing.unit}`) : `${reqItem.amount} units`;

                                    const match = financials.breakDown.find(b => b.name.toLowerCase() === reqItem.name.toLowerCase());
                                     const costDisplay = match ? ' • ₱' + match.cost.toFixed(2) : '';
                                     return (
                                       <div key={reqItem.name} className="flex justify-between items-center text-[10px] text-gray-400">
                                         <span className="truncate max-w-[170px]" title={reqItem.name}>
                                           • {reqItem.name} <span className="text-[9px] text-gray-500">({reqDisplay}/svg{costDisplay})</span>
                                         </span>
                                        <span className={`font-mono font-bold ${available === 0 ? 'text-brand-red' : isLowIng ? 'text-brand-gold' : 'text-gray-300'}`}>
                                          {ing ? `${ing.quantity}${ing.unit} (${available} svgs)` : '0 (Missing)'}
                                        </span>
                                      </div>
                                    );
                                  })
                                ) : item.ingredients && item.ingredients.length > 0 ? (
                                  item.ingredients.map((ingName) => {
                                    const ing = ingredientsInventory.find(
                                      (i) => i.name.toLowerCase() === ingName.toLowerCase()
                                    );
                                    const req = (!ing || ing.unit === 'pcs' || ing.unit === 'cans') ? 1 : ing.unit === 'kg' ? 0.1 : 100;
                                    const available = ing ? Math.floor(ing.quantity / req) : 0;
                                    const isLowIng = ing ? (ing.quantity <= ing.lowStockAlert) : true;
                                    const reqDisplay = ing ? (ing.unit === 'pcs' || ing.unit === 'cans' ? `1 ${ing.unit}` : ing.unit === 'kg' ? `0.1kg` : `100g`) : '100g';
                                    
                                    return (
                                      <div key={ingName} className="flex justify-between items-center text-[10px] text-gray-400">
                                        <span className="truncate max-w-[150px]" title={ingName}>
                                          • {ingName} <span className="text-[9px] text-gray-500">({reqDisplay}/svg)</span>
                                        </span>
                                        <span className={`font-mono font-bold ${available === 0 ? 'text-brand-red' : isLowIng ? 'text-brand-gold' : 'text-gray-300'}`}>
                                          {ing ? `${ing.quantity}${ing.unit} (${available} svgs)` : '0 (Missing)'}
                                        </span>
                                      </div>
                                    );
                                  })
                                ) : null}
                              </div>

                              {(() => {
                                const servings = getServingsForDish(item, ingredientsInventory);
                                if (servings !== null && servings !== qty) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => onUpdateStockLevel(item.id, servings, true)}
                                      className="w-full mt-1.5 py-1 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 hover:border-brand-gold/50 text-brand-gold hover:text-white text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-1 transition-all"
                                    >
                                      🔄 Sync Stock level to {servings}
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          ) : (
                            <div className="mt-3.5 bg-black/45 p-2.5 text-center rounded-xl border border-white/5 text-[9px] text-gray-500 italic">
                              No ingredients linked to recipe. Manually managed.
                            </div>
                          )}

                          {/* Recipe Profitability / Cost Breakdown */}
                          <div className="mt-2.5 bg-brand-gold/5 p-3 rounded-xl border border-brand-gold/15 space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-gray-400 font-bold uppercase tracking-wider text-[8px]">💰 Est. Ingredient Cost:</span>
                              <span className="font-mono font-bold text-gray-200">₱{financials.totalCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-gray-400 font-bold uppercase tracking-wider text-[8px]">💵 Est. Profit (Margin):</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-green-400">₱{financials.profit.toFixed(2)}</span>
                                <span className="text-[9px] font-black text-brand-gold bg-brand-gold/10 px-1.5 py-0.2 rounded border border-brand-gold/15">{financials.marginPercent.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Inventory Adjusters */}
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onUpdateStockLevel(item.id, qty - 1)}
                              className="p-1 rounded bg-[#181818] border border-white/10 hover:border-brand-red text-gray-400 hover:text-white transition-all focus:outline-none"
                              title="Decrease Stock"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              max="500"
                              value={qty}
                              onChange={(e) => onUpdateStockLevel(item.id, Number(e.target.value) || 0)}
                              className="w-14 text-center bg-[#181818] border border-white/10 rounded-lg text-xs font-bold text-white py-1 focus:outline-none focus:border-brand-red"
                            />

                            <button
                              type="button"
                              onClick={() => onUpdateStockLevel(item.id, qty + 1)}
                              className="p-1 rounded bg-[#181818] border border-white/10 hover:border-brand-red text-gray-400 hover:text-white transition-all focus:outline-none"
                              title="Increase Stock"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Toggle switches for Availability sync */}
                          <button
                            onClick={() => onToggleItemAvailability(item.id)}
                            className="focus:outline-none p-1 transition-all"
                            title={isUnavailable ? 'Toggle to Available' : 'Toggle to Sold Out'}
                          >
                            {isUnavailable ? (
                              <span className="text-[9px] font-black uppercase text-brand-red bg-brand-red/10 border border-brand-red/25 px-2 py-1 rounded">Hidden</span>
                            ) : (
                              <span className="text-[9px] font-black uppercase text-green-400 bg-green-500/10 border border-green-500/25 px-2 py-1 rounded">Visible</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

          </div>
          )}

        </div>
      )}

      {/* --- TAB PANEL: CULINARY MENU BUILDER --- */}
      {chefTab === 'builder' && (
        <div className="space-y-6">
          
          <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-6">
            
            {/* Header controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
              <div>
                <h3 className="font-display font-bold text-white text-base">🍳 Dynamic Recipe Catalog / Menu Builder</h3>
                <p className="text-gray-400 text-xs mt-0.5">Invent new Filipino-Inspired meals, edit prices, descriptions, and publish changes in real-time.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={builderSearchQuery}
                    onChange={(e) => setBuilderSearchQuery(e.target.value)}
                    placeholder="Search recipes..."
                    className="pl-9 pr-4 py-1.5 w-44 sm:w-52 bg-[#0D0D0C] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-red"
                  />
                </div>

                <select
                  value={builderCategoryFilter}
                  onChange={(e) => setBuilderCategoryFilter(e.target.value as Category | 'all')}
                  className="bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red"
                >
                  <option value="all">All Categories</option>
                  <option value="bento">Bento Meals</option>
                  <option value="silog">Silog Classics</option>
                  <option value="rice-bowl">Rice Bowls</option>
                  <option value="drinks">Drinks</option>
                </select>

                {/* Bottleneck Alert Threshold Selector */}
                <div className="flex items-center gap-1.5 bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-1.5 text-xs">
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">⚠️ Alert:</span>
                  <select
                    value={bottleneckThreshold}
                    onChange={(e) => setBottleneckThreshold(Number(e.target.value))}
                    className="bg-transparent text-brand-gold font-mono font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    <option value={5} className="bg-[#0D0D0C] text-white">≤ 5 svgs (Critical)</option>
                    <option value={10} className="bg-[#0D0D0C] text-white">≤ 10 svgs (Low)</option>
                    <option value={15} className="bg-[#0D0D0C] text-white">≤ 15 svgs (Standard)</option>
                    <option value={25} className="bg-[#0D0D0C] text-white">≤ 25 svgs (Early)</option>
                    <option value={9999} className="bg-[#0D0D0C] text-white">Always Show (All)</option>
                    <option value={0} className="bg-[#0D0D0C] text-white">Disabled / Off</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBatchCalcModalOpen(true)}
                  className="px-3.5 py-1.5 bg-[#0D0D0C] hover:bg-brand-gold/15 text-brand-gold border border-brand-gold/30 hover:border-brand-gold text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  title="Batch Yield (1kg / 2kg) & Grams Portion Costing Calculator"
                >
                  <Scale className="w-4 h-4 text-brand-gold" />
                  <span>Batch Calculator</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProfitMenuItemId(menuItems[0]?.id || '');
                    setIsProfitCalcModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#0D0D0C] hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  title="Smart Daily/Weekly/Monthly/Yearly Profit & Overhead Horizon Calculator"
                >
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <span>Profit Calculator</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className="px-4 py-1.5 bg-brand-red hover:bg-brand-red-hover text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-brand-red/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add New Recipe
                </button>
              </div>
            </div>

            {/* Category Visibility Control Row */}
            <div className="bg-[#0D0D0C] border-2 border-white/5 rounded-2xl p-5 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span className="text-brand-red">🚫</span> Toggle Category Option Visibility
                  </h4>
                  <p className="text-gray-400 text-[10px] mt-0.5">
                    Hide specific categories (and all their recipes) from the customer menu dynamically.
                  </p>
                </div>
                {hiddenCategories.length > 0 && (
                  <span className="text-[9px] font-bold bg-brand-red/10 border border-brand-red/25 px-2 py-0.5 rounded text-brand-red uppercase">
                    {hiddenCategories.length} Hidden Category
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: 'silog', label: 'Silog Classics', icon: '🍳' },
                  { value: 'bento', label: 'Bento Meals', icon: '🍱' },
                  { value: 'rice-bowl', label: 'Rice Bowls', icon: '🥣' },
                  { value: 'drinks', label: 'Drinks', icon: '🥤' }
                ].map((cat) => {
                  const isHidden = hiddenCategories.includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => onToggleCategoryHidden(cat.value)}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${
                        isHidden
                          ? 'bg-brand-red/10 border-brand-red text-brand-red font-black shadow-lg shadow-brand-red/5'
                          : 'bg-[#181818] border-white/5 text-gray-400 hover:border-white/10 font-bold'
                      }`}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider leading-none text-center">{cat.label}</span>
                      <span className={`text-[8px] px-2 py-0.5 font-bold rounded-full uppercase mt-1 ${
                        isHidden ? 'bg-brand-red text-white' : 'bg-green-500/10 text-green-400'
                      }`}>
                        {isHidden ? '🚫 Hidden' : '✓ Active'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List grid */}
            {filteredBuilderItems.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-xs font-medium">
                🫙 No recipes found. Create your very first dish by clicking "+ Add New Recipe"!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBuilderItems.map((item) => {
                  const financials = calculateDishRecipeCost(item, ingredientsInventory);
                  const detailedServings = getDetailedServingsForDish(item, ingredientsInventory);
                  return (
                    <div 
                      key={item.id} 
                      className="bg-[#0D0D0C] border-2 border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all flex flex-col justify-between group shadow-lg"
                    >
                      {/* Item Image & Badges */}
                      <div className="relative h-44 bg-[#181818] overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        
                        {/* Top category label */}
                        <div className="absolute top-3 left-3 flex gap-1">
                          <span className="text-[9px] font-black uppercase tracking-wider bg-black/70 border border-white/15 px-2.5 py-1 rounded-md text-brand-gold">
                            {item.category}
                          </span>
                          {item.spicy && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-brand-red text-white px-2.5 py-1 rounded-md">
                              🌶️ Spicy
                            </span>
                          )}
                          {item.popular && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white px-2.5 py-1 rounded-md flex items-center gap-0.5">
                              ⭐ Popular
                            </span>
                          )}
                        </div>

                        {/* Available Servings & Storefront Status Badge */}
                        {(() => {
                          const isSoldOutOnStorefront = unavailableItemIds.includes(item.id);
                          const servings = detailedServings.servings;
                          const dishStockLevel = stockLevels[item.id] ?? 0;
                          return (
                            <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                              {isSoldOutOnStorefront ? (
                                <span className="bg-brand-red text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-lg border border-brand-red/30 flex items-center gap-1 animate-pulse">
                                  🚨 SOLD OUT ON STOREFRONT
                                </span>
                              ) : (servings !== null && servings < 10) || dishStockLevel < 10 ? (
                                <span className="bg-brand-gold text-black font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-lg border border-brand-gold/30 flex items-center gap-1">
                                  ⚠️ LOW STOCK ({servings ?? dishStockLevel} svgs)
                                </span>
                              ) : (
                                <span className="bg-green-600 text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-lg border border-green-500/30 flex items-center gap-1">
                                  ✓ IN STOCK ({servings ?? dishStockLevel} svgs)
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Display Base Price */}
                        <div className="absolute bottom-3 right-3 bg-brand-gold/15 backdrop-blur-md border border-brand-gold/30 px-3 py-1 rounded-xl">
                          <span className="font-mono text-brand-gold font-black text-sm">₱{item.price.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Metadata body */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-2.5 text-left">
                          <div className="space-y-1">
                            <h4 className="font-display font-black text-white text-base leading-snug">{item.name}</h4>
                            <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed font-normal">{item.description}</p>
                          </div>

                          {/* STOREFRONT OUT OF STOCK WARNING BOX */}
                          {(() => {
                            const isSoldOutOnStorefront = unavailableItemIds.includes(item.id);
                            const servings = detailedServings.servings;
                            const dishStockLevel = stockLevels[item.id] ?? 0;
                            const missingList = detailedServings.missingIngredients || [];

                            if (!isSoldOutOnStorefront && dishStockLevel > 0) return null;

                            return (
                              <div className={`p-3 rounded-xl border space-y-2 text-left text-[10px] font-mono transition-all ${
                                isSoldOutOnStorefront 
                                  ? 'bg-[#1e0f0f] border-brand-red/40 text-red-300' 
                                  : 'bg-[#1e190d] border-brand-gold/30 text-brand-gold'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="font-black uppercase tracking-wider text-[9px] flex items-center gap-1">
                                    {isSoldOutOnStorefront ? '🚨 Storefront Status: SOLD OUT' : '⚠️ Stock Warning'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onToggleItemAvailability(item.id)}
                                    className="text-[8px] bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded font-black uppercase transition-all cursor-pointer"
                                  >
                                    Toggle Availability
                                  </button>
                                </div>

                                <div className="space-y-1 text-[9.5px]">
                                  {missingList.length > 0 && (
                                    <div className="text-red-400 font-bold">
                                      • Missing Material: Recipe uses <strong>"{missingList.join(', ')}"</strong> which is not in inventory!
                                    </div>
                                  )}

                                  {detailedServings.bottleneck && detailedServings.bottleneck.possibleServings === 0 && missingList.length === 0 && (
                                    <div className="text-amber-400 font-bold">
                                      • Depleted Material: <strong>"{detailedServings.bottleneck.name}"</strong> has 0 quantity in kitchen!
                                    </div>
                                  )}

                                  {dishStockLevel <= 0 && servings !== null && servings > 0 && (
                                    <div className="text-brand-gold font-bold">
                                      • Dish Unit Stock Level is 0 (even though <strong>{servings} raw servings</strong> exist in inventory).
                                    </div>
                                  )}
                                </div>

                                {servings !== null && servings > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateStockLevel(item.id, servings, true)}
                                    className="w-full py-1.5 bg-brand-gold hover:bg-brand-gold-hover text-black font-black uppercase tracking-wider rounded-lg text-[9px] transition-all flex items-center justify-center gap-1 shadow-md cursor-pointer"
                                  >
                                    ⚡ Quick Sync Stock Level to {servings} Servings
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          {/* Linked stock requirements list */}
                          {item.recipeRequirements && item.recipeRequirements.length > 0 ? (
                            <div className="bg-[#121211] p-2.5 rounded-xl border border-white/5 space-y-1.5 text-left">
                              <span className="text-[8px] text-gray-500 uppercase tracking-wider font-black block">🌾 Stock per serving:</span>
                              <div className="flex flex-wrap gap-1">
                                  {item.recipeRequirements.map((req, index) => {
                                    const invItem = findMatchingIngredientInInventory(req.name, ingredientsInventory);
                                    const unit = invItem?.unit || 'g';
                                    const isMissing = !invItem;
                                    const match = financials.breakDown.find(b => b.name.toLowerCase() === req.name.toLowerCase());
                                    const costDisplay = match ? `(₱${match.cost.toFixed(2)})` : '';
                                    return (
                                      <span key={index} className={`text-[8.5px] border font-mono px-1.5 py-0.5 rounded-md flex items-center gap-1.5 ${
                                        isMissing 
                                          ? 'bg-red-500/20 border-red-500/40 text-red-400 font-black' 
                                          : 'bg-[#0D0D0C] border-white/10 text-gray-300'
                                      }`}>
                                        <span>{req.name}: <strong className={isMissing ? 'text-red-400' : 'text-brand-gold'}>{isMissing ? '⚠️ MISSING IN INVENTORY' : (unit === 'kg' ? `${req.amount}g` : `${req.amount}${unit}`)}</strong></span>
                                        {costDisplay && <span className="text-[8px] text-gray-400/90 font-bold border-l border-white/10 pl-1.5">{costDisplay}</span>}
                                      </span>
                                    );
                                  })}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[8.5px] text-gray-600 italic bg-[#121211]/50 p-2 rounded-xl text-center border border-dashed border-white/5">
                              No stock materials linked (Manually managed)
                            </div>
                          )}

                          {/* Batch Yield & Portion Sizing Info */}
                          {item.servingSizeGrams && (
                            <div className="bg-[#121211] p-2 rounded-xl border border-brand-gold/15 flex items-center justify-between text-[9px] font-mono text-left">
                              <div className="flex items-center gap-1.5 text-gray-300">
                                <Scale className="w-3 h-3 text-brand-gold" />
                                <span className="text-gray-400">Portion:</span>
                                <strong className="text-brand-gold">
                                  {item.servingSizeGrams}{item.servingSizeUnit === 'pcs' ? ' pcs' : 'g'} / plate
                                </strong>
                              </div>
                              {item.batchYieldGrams && (
                                <span className="text-gray-400 text-[8.5px]">
                                  Yield: <strong className="text-white">
                                    {item.batchYieldUnit === 'pcs'
                                      ? `${item.batchYieldGrams} pcs`
                                      : `${(item.batchYieldGrams / 1000).toFixed(1)}kg`}
                                  </strong> ({((item.batchYieldGrams) / (item.servingSizeGrams || 1)).toFixed(1)} svgs)
                                </span>
                              )}
                            </div>
                          )}

                          {/* Bottleneck Indicator (Only displayed when stock <= bottleneckThreshold) */}
                          {detailedServings.bottleneck && bottleneckThreshold > 0 && detailedServings.bottleneck.possibleServings <= bottleneckThreshold && (
                            <div className={`text-[8.5px] px-2.5 py-1 rounded-xl flex items-center justify-between font-mono border ${
                              detailedServings.bottleneck.possibleServings <= 15
                                ? 'bg-[#16140D] border-brand-gold/30 text-brand-gold'
                                : 'bg-[#121211] border-white/10 text-gray-400'
                            }`}>
                              <span className="truncate max-w-[65%]">
                                {detailedServings.bottleneck.possibleServings <= 15 ? '⚠️ Low Stock Bottleneck:' : 'ℹ️ Limiting Ingredient:'}{' '}
                                <strong className="text-white">{detailedServings.bottleneck.name}</strong>
                              </span>
                              <span className="font-bold">{detailedServings.bottleneck.quantity}{detailedServings.bottleneck.unit} ({detailedServings.bottleneck.possibleServings} svgs)</span>
                            </div>
                          )}

                          {/* Financials Summary */}
                          <div className="bg-brand-gold/5 border border-brand-gold/15 p-2.5 rounded-xl text-[10px] space-y-2 text-left">
                            <div className="grid grid-cols-4 gap-1 border-b border-white/5 pb-1.5">
                              <div>
                                <span className="text-gray-500 uppercase tracking-wider text-[7px] block font-bold">Base Price</span>
                                <span className="font-mono text-brand-gold font-black">₱{item.price.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 uppercase tracking-wider text-[7px] block font-bold">Recipe COGS</span>
                                <span className="font-mono text-gray-200 font-bold">₱{financials.totalCost.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 uppercase tracking-wider text-[7px] block font-bold">Est. Profit</span>
                                <span className="font-mono text-green-400 font-bold">₱{financials.profit.toFixed(2)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-500 uppercase tracking-wider text-[7px] block font-bold">Margin</span>
                                <span className="text-brand-gold font-extrabold">{financials.marginPercent.toFixed(1)}%</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[9.5px]">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-400 text-[8.5px] font-bold">Target Margin:</span>
                                <span className="text-brand-gold font-mono font-black text-[9px] bg-brand-gold/10 px-1.5 py-0.5 rounded border border-brand-gold/30">
                                  {financials.targetMarginPercent}%
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 text-[8.5px]">Rec. Price: <strong className="text-white font-mono">₱{financials.recommendedPrice.toFixed(2)}</strong></span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-gray-500 font-bold border-t border-white/5 pt-3 flex items-center justify-between">
                          <span>ID: <code className="font-mono text-gray-400">{item.id}</code></span>
                          
                          {/* Action controllers */}
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenBatchCalculatorForRecipe(item)}
                              className="p-1.5 rounded-lg bg-brand-gold/10 border border-brand-gold/30 text-brand-gold hover:bg-brand-gold hover:text-black transition-all flex items-center gap-1 cursor-pointer"
                              title="Open Batch Yield & Costing Calculator for this Recipe"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-bold uppercase pr-0.5">Batch</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProfitMenuItemId(item.id);
                                setIsProfitCalcModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all flex items-center gap-1 cursor-pointer"
                              title="Simulate Daily/Weekly/Monthly/Yearly Profit & Overheads for this Recipe"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-bold uppercase pr-0.5">Profit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(item)}
                              className="p-1.5 rounded-lg bg-[#181818] border border-white/5 text-gray-400 hover:text-white transition-all flex items-center gap-1 hover:border-brand-gold cursor-pointer"
                              title="Edit Recipe Details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-bold uppercase pr-0.5">Edit</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="p-1.5 rounded-lg bg-[#181818] border border-white/5 text-gray-400 hover:text-brand-red transition-all flex items-center gap-1 hover:border-brand-red"
                              title="Delete Recipe"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-bold uppercase pr-0.5">Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB PANEL: FINANCIAL TRACKER DASHBOARD --- */}
      {chefTab === 'finances' && (() => {
        const finCurrent = calculatePeriodFinancials(reportsPeriodDays, selectedFinancialMonth);
        const finDay = calculatePeriodFinancials(1, selectedFinancialMonth);
        const finWeek = calculatePeriodFinancials(7, selectedFinancialMonth);
        const finMonth = calculatePeriodFinancials(30, selectedFinancialMonth);
        const finYear = calculatePeriodFinancials(365, selectedFinancialMonth);

        const cogsRatio = finCurrent.totalSales > 0 ? (finCurrent.ingredientsCost / finCurrent.totalSales) * 100 : 0;
        const overheadRatio = finCurrent.totalSales > 0 ? (finCurrent.operationalOverhead / finCurrent.totalSales) * 100 : 0;
        const avgDishRevenue = finCurrent.dishesCount > 0 ? finCurrent.totalSales / finCurrent.dishesCount : 0;

        return (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* --- FINANCIAL HUB SUB-TAB NAVIGATION BAR --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 p-1.5 bg-[#0D0D0C] rounded-[1.5rem] border border-white/10 shadow-lg">
              <button
                type="button"
                onClick={() => setFinanceSubTab('overview')}
                className={`px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  financeSubTab === 'overview'
                    ? 'bg-[#181818] text-brand-gold border border-brand-gold/30 shadow-md shadow-brand-gold/5 font-extrabold'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                📊 Overall Dashboard
              </button>
              <button
                type="button"
                onClick={() => setFinanceSubTab('overheads')}
                className={`px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  financeSubTab === 'overheads'
                    ? 'bg-[#181818] text-blue-400 border border-blue-500/30 shadow-md shadow-blue-500/5 font-extrabold'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                ⚡ Operating Overheads
              </button>
              <button
                type="button"
                onClick={() => setFinanceSubTab('timeline')}
                className={`px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  financeSubTab === 'timeline'
                    ? 'bg-[#181818] text-purple-400 border border-purple-500/30 shadow-md shadow-purple-500/5 font-extrabold'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                📊 Timeline Horizons
              </button>
              <button
                type="button"
                onClick={() => setFinanceSubTab('daily-ledger')}
                className={`px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  financeSubTab === 'daily-ledger'
                    ? 'bg-[#181818] text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/5 font-extrabold'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                📋 Daily Ledger Table
              </button>
            </div>

            {/* ========================================================================= */}
            {/* SUB-TAB 1: OVERALL FINANCIAL DASHBOARD */}
            {/* ========================================================================= */}
            {financeSubTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                {/* Header & Filter Bar */}
                <div className="bg-[#121211] border border-brand-gold/20 rounded-[2rem] p-6 shadow-xl space-y-6 relative overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm bg-brand-gold/10 text-brand-gold font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Financial Audit Hub
                        </span>
                        <span className="text-xs text-gray-400 font-bold">Executive Financial Overview & Health Metrics</span>
                      </div>
                      <h3 className="font-display font-black text-white text-xl mt-1.5 flex items-center gap-2">
                        💰 Profitability & Executive Dashboard
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 max-w-2xl font-medium leading-relaxed">
                        Audit real-time sales against actual recipe ingredient costs and all 6 operating overheads (Electricity, Water, Rent, Labor, LPG Gas, & Packaging).
                      </p>
                    </div>

                    {/* Month & Period Filter Controls */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
                      <div className="flex items-center gap-1.5 bg-[#0D0D0C] p-1.5 rounded-xl border border-white/10">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-1 flex items-center gap-1">
                          📅 Month Audit:
                        </span>
                        <select
                          value={selectedFinancialMonth}
                          onChange={(e) => {
                            setSelectedFinancialMonth(e.target.value);
                            if (e.target.value !== 'all') {
                              setFinancesPeriod('month');
                              setReportsPeriodDays(30);
                            }
                          }}
                          className="bg-[#181818] text-brand-gold font-bold text-xs rounded-lg px-2.5 py-1 focus:outline-none border border-white/10 cursor-pointer"
                        >
                          <option value="all">All Months (Rolling Timeline)</option>
                          {availableMonthsOptions.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex bg-[#0D0D0C] p-1.5 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setReportsPeriodDays(1);
                            setSelectedFinancialMonth('all');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            reportsPeriodDays === 1 && selectedFinancialMonth === 'all' ? 'bg-brand-gold text-black shadow-md' : 'text-gray-500 hover:text-white'
                          }`}
                        >
                          Daily (24h)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReportsPeriodDays(7);
                            setSelectedFinancialMonth('all');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            reportsPeriodDays === 7 && selectedFinancialMonth === 'all' ? 'bg-brand-gold text-black shadow-md' : 'text-gray-500 hover:text-white'
                          }`}
                        >
                          Weekly (7d)
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportsPeriodDays(30)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            reportsPeriodDays === 30 || selectedFinancialMonth !== 'all' ? 'bg-brand-gold text-black shadow-md' : 'text-gray-500 hover:text-white'
                          }`}
                        >
                          Monthly
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Financial Overview Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Delivered Revenue</span>
                      <span className="text-green-400 font-display font-extrabold text-2xl">
                        ₱{finCurrent.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-gray-500 block font-mono">From {finCurrent.ordersCount} completed orders</span>
                    </div>
                    <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Ingredients COGS</span>
                      <span className="text-brand-gold font-display font-extrabold text-2xl">
                        ₱{finCurrent.ingredientsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-gray-500 block">Actual recipe cost ({finCurrent.dishesCount} dishes)</span>
                    </div>
                    <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Operational Overhead</span>
                      <span className="text-blue-400 font-display font-extrabold text-2xl">
                        ₱{finCurrent.operationalOverhead.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-gray-500 block">6 Utility & Kitchen Operating Costs</span>
                    </div>
                    <div className="bg-[#181818] border border-brand-gold/30 rounded-2xl p-5 space-y-1 bg-gradient-to-b from-brand-gold/10 to-transparent">
                      <span className="text-[10px] text-brand-gold font-bold uppercase tracking-wider block">Estimated Net Profit</span>
                      <span className={`font-display font-extrabold text-2xl ${finCurrent.netIncome >= 0 ? 'text-emerald-400' : 'text-brand-red'}`}>
                        ₱{Math.max(0, finCurrent.netIncome).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-emerald-400/80 block font-bold">Net Margin: {finCurrent.netMarginPercent.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Financial Ratios & Efficiency Indicators Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                    <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">COGS Ratio</span>
                        <h4 className="text-brand-gold font-mono font-black text-lg mt-0.5">{cogsRatio.toFixed(1)}% of Revenue</h4>
                        <p className="text-[9px] text-gray-500 mt-0.5 font-medium">Target: &lt; 35% COGS</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center text-lg font-black">
                        🥗
                      </div>
                    </div>

                    <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Overhead Efficiency Ratio</span>
                        <h4 className="text-blue-400 font-mono font-black text-lg mt-0.5">{overheadRatio.toFixed(1)}% of Revenue</h4>
                        <p className="text-[9px] text-gray-500 mt-0.5 font-medium">Target: &lt; 25% Overhead</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg font-black">
                        ⚡
                      </div>
                    </div>

                    <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Avg Dish Yield</span>
                        <h4 className="text-emerald-400 font-mono font-black text-lg mt-0.5">₱{avgDishRevenue.toFixed(2)} / dish</h4>
                        <p className="text-[9px] text-gray-500 mt-0.5 font-medium">{finCurrent.dishesCount} dishes total</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg font-black">
                        🍽️
                      </div>
                    </div>
                  </div>
                </div>

                {/* Health Banner & Quick Navigation Bar */}
                <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-4 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-2xl text-2xl ${finCurrent.netIncome >= 0 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-brand-red/10 text-brand-red border border-brand-red/20'}`}>
                        {finCurrent.netIncome >= 0 ? '🟢' : '🔴'}
                      </div>
                      <div>
                        <h4 className="font-display font-black text-white text-base">
                          {finCurrent.netIncome >= 0 ? 'Store Financial Health: HIGHLY PROFITABLE' : 'Store Financial Health: OPERATING AT DEFICIT'}
                        </h4>
                        <p className="text-gray-400 text-xs mt-0.5 leading-relaxed font-normal">
                          {finCurrent.netIncome >= 0
                            ? `Generating ₱${finCurrent.netIncome.toFixed(2)} net profit after recipe COGS and 6 kitchen overheads for this period.`
                            : `Expenses exceed sales by ₱${Math.abs(finCurrent.netIncome).toFixed(2)}. Inspect overhead baselines or increase order volume.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFinanceSubTab('overheads')}
                        className="px-3.5 py-2 bg-[#181818] hover:bg-white/5 border border-white/10 text-blue-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        ⚡ Manage Overheads
                      </button>
                      <button
                        type="button"
                        onClick={() => setFinanceSubTab('daily-ledger')}
                        className="px-3.5 py-2 bg-brand-gold hover:opacity-90 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        📋 Open Daily Ledger Table
                      </button>
                    </div>
                  </div>
                </div>

                {/* Top Dish Margins & Profitability Audit */}
                <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-4 text-left">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                      <h4 className="font-display font-black text-white text-base flex items-center gap-2">
                        🍳 Recipe Margin & Profitability Catalog
                      </h4>
                      <p className="text-gray-400 text-xs mt-0.5">Itemized recipe COGS, profit margin, and target price recommendations.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChefTab('builder')}
                      className="text-xs text-brand-gold hover:underline font-bold"
                    >
                      Open Menu Builder →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menuItems.slice(0, 6).map((item) => {
                      const financials = calculateDishRecipeCost(item, ingredientsInventory);
                      return (
                        <div key={item.id} className="bg-[#181818] border border-white/5 rounded-2xl p-4 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-bold text-white text-sm leading-tight">{item.name}</h5>
                              <span className="text-[9px] text-gray-500 uppercase font-mono font-bold block mt-0.5">{item.category}</span>
                            </div>
                            <span className="font-mono text-brand-gold font-black text-sm">₱{item.price.toFixed(2)}</span>
                          </div>

                          <div className="bg-[#0D0D0C] p-2.5 rounded-xl border border-white/5 space-y-1 font-mono text-[10px]">
                            <div className="flex justify-between text-gray-400">
                              <span>Recipe COGS:</span>
                              <span className="text-white font-bold">₱{financials.totalCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                              <span>Est. Profit:</span>
                              <span className="text-green-400 font-bold">₱{financials.profit.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400 border-t border-white/5 pt-1 mt-1">
                              <span>Profit Margin:</span>
                              <span className="text-brand-gold font-extrabold">{financials.marginPercent.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-TAB 2: OPERATING OVERHEADS BREAKOUT (6 UTILITIES) */}
            {/* ========================================================================= */}
            {financeSubTab === 'overheads' && (
              <div className="space-y-6 animate-fade-in">
                {/* Executive Overhead Header */}
                <div className="bg-[#121211] border border-blue-500/20 rounded-[2rem] p-6 shadow-xl space-y-4 relative overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm bg-blue-500/10 text-blue-400 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] flex items-center gap-1">
                          ⚡ Utility & Facilities Cost Center
                        </span>
                        <span className="text-xs text-gray-400 font-bold">Itemized Operating Expenses ({finCurrent.label})</span>
                      </div>
                      <h3 className="font-display font-black text-white text-xl mt-1.5 flex items-center gap-2">
                        ⚡ Operational Overhead Breakout (6 Operating Costs)
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 max-w-2xl font-medium leading-relaxed">
                        Track kitchen utilities, rent, shift labor wages, LPG fuel, and packaging supplies. Adjust baseline rate drivers below to recalculate store overheads in real time.
                      </p>
                    </div>

                    <div className="bg-[#181818] border border-blue-500/30 p-4 rounded-2xl text-right shrink-0">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">Total Overhead ({finCurrent.label})</span>
                      <span className="text-blue-400 font-display font-black text-2xl mt-0.5 block">
                        ₱{finCurrent.operationalOverhead.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-gray-500 block font-mono">Daily Overhead Rate: ₱{(finCurrent.operationalOverhead / finCurrent.daysCount).toFixed(2)}/day</span>
                    </div>
                  </div>

                  {/* 6-Utility Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Utility 1 */}
                    <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          ⚡ Electricity
                        </span>
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-bold">
                          Base + Variable
                        </span>
                      </div>
                      <div className="text-2xl font-mono font-black text-white">
                        ₱{finCurrent.electricityCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-gray-400 space-y-0.5 border-t border-white/5 pt-2">
                        <div className="flex justify-between"><span>Base Rate:</span><span className="font-mono text-white">₱{electricityBaseRate}/day</span></div>
                        <div className="flex justify-between"><span>Pace Rate:</span><span className="font-mono text-white">₱{electricityVariableRate}/dish</span></div>
                        <div className="flex justify-between text-gray-500"><span>Cooked Volume:</span><span className="font-mono text-gray-300">{finCurrent.dishesCount} dishes</span></div>
                      </div>
                    </div>

                    {/* Utility 2 */}
                    <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          💧 Water Bill
                        </span>
                        <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono font-bold">
                          Baseline
                        </span>
                      </div>
                      <div className="text-2xl font-mono font-black text-white">
                        ₱{finCurrent.waterCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-gray-400 space-y-0.5 border-t border-white/5 pt-2">
                        <div className="flex justify-between"><span>Daily Baseline:</span><span className="font-mono text-white">₱{waterBaseRate}/day</span></div>
                        <div className="flex justify-between text-gray-500"><span>Monthly Equiv:</span><span className="font-mono text-gray-300">₱{(waterBaseRate * 30).toFixed(2)}</span></div>
                      </div>
                    </div>

                    {/* Utility 3 */}
                    <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          🏠 Rent / Facility
                        </span>
                        <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-mono font-bold">
                          Fixed Lease
                        </span>
                      </div>
                      <div className="text-2xl font-mono font-black text-white">
                        ₱{finCurrent.rentCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-gray-400 space-y-0.5 border-t border-white/5 pt-2">
                        <div className="flex justify-between"><span>Daily Baseline:</span><span className="font-mono text-white">₱{rentBaseRate}/day</span></div>
                        <div className="flex justify-between text-gray-500"><span>Monthly Lease:</span><span className="font-mono text-gray-300">₱{(rentBaseRate * 30).toFixed(2)}</span></div>
                      </div>
                    </div>

                    {/* Utility 4 */}
                    <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          👨‍🍳 Kitchen Labor
                        </span>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                          Staff Wages
                        </span>
                      </div>
                      <div className="text-2xl font-mono font-black text-white">
                        ₱{finCurrent.laborCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-gray-400 space-y-0.5 border-t border-white/5 pt-2">
                        <div className="flex justify-between"><span>Daily Baseline:</span><span className="font-mono text-white">₱{laborBaseRate}/day</span></div>
                        <div className="flex justify-between text-gray-500"><span>Shift Logged:</span><span className="font-mono text-gray-300">{completedShifts.length} shifts</span></div>
                      </div>
                    </div>

                    {/* Utility 5 */}
                    <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          🔥 LPG Gas Fuel
                        </span>
                        <span className="text-[9px] bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-2 py-0.5 rounded font-mono font-bold">
                          Burners
                        </span>
                      </div>
                      <div className="text-2xl font-mono font-black text-white">
                        ₱{finCurrent.gasCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-gray-400 space-y-0.5 border-t border-white/5 pt-2">
                        <div className="flex justify-between"><span>Daily Baseline:</span><span className="font-mono text-white">₱{gasBaseRate}/day</span></div>
                        <div className="flex justify-between text-gray-500"><span>Monthly Tanks:</span><span className="font-mono text-gray-300">₱{(gasBaseRate * 30).toFixed(2)}</span></div>
                      </div>
                    </div>

                    {/* Utility 6 */}
                    <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          📦 Packaging & Miscl
                        </span>
                        <span className="text-[9px] bg-white/10 text-gray-300 border border-white/20 px-2 py-0.5 rounded font-mono font-bold">
                          Supplies
                        </span>
                      </div>
                      <div className="text-2xl font-mono font-black text-white">
                        ₱{finCurrent.otherCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-gray-400 space-y-0.5 border-t border-white/5 pt-2">
                        <div className="flex justify-between"><span>Daily Baseline:</span><span className="font-mono text-white">₱{otherBaseRate}/day</span></div>
                        <div className="flex justify-between text-gray-500"><span>Monthly Miscl:</span><span className="font-mono text-gray-300">₱{(otherBaseRate * 30).toFixed(2)}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-TAB 3: TIMELINE HORIZONS COMPARISON (1d / 7d / 30d / 365d) */}
            {/* ========================================================================= */}
            {financeSubTab === 'timeline' && (
              <div className="space-y-6 animate-fade-in">
                {/* Multi-Period Timeline Audit Cards Grid (1d, 7d, 30d, 365d) */}
                <div className="bg-[#121211] border border-purple-500/20 rounded-[2rem] p-6 shadow-xl space-y-4">
                  <div className="border-b border-white/5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs bg-purple-500/10 text-purple-400 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] inline-block mb-1">
                        📊 Comparative Timeline Audit
                      </span>
                      <h4 className="font-display font-black text-white text-lg md:text-xl flex items-center gap-2">
                        📊 Timeline Horizon Profitability Comparison
                      </h4>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Side-by-side audit of Sales, Ingredient COGS, Operational Overhead, and Net Income across standard periods.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[finDay, finWeek, finMonth, finYear].map((fin, idx) => {
                      const isPositive = fin.netIncome >= 0;
                      return (
                        <div
                          key={idx}
                          className={`bg-[#181818] rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-3 ${
                            fin.daysCount === reportsPeriodDays
                              ? 'border-brand-gold shadow-[0_0_15px_rgba(212,163,89,0.1)] bg-gradient-to-b from-brand-gold/10 to-transparent'
                              : 'border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="space-y-1 border-b border-white/5 pb-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-white uppercase tracking-wider">{fin.label}</span>
                                <span className="text-[9px] text-gray-400 font-mono bg-white/5 px-2 py-0.5 rounded-lg font-bold">
                                  {fin.ordersCount} {fin.ordersCount === 1 ? 'order' : 'orders'}
                                </span>
                              </div>
                              {fin.dateRangeText && (
                                <div className="text-[10px] text-brand-gold font-mono font-bold flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-brand-gold shrink-0" />
                                  <span>{fin.dateRangeText}</span>
                                </div>
                              )}
                            </div>

                            {/* Delivered Sales */}
                            <div>
                              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block">Delivered Sales</span>
                              <div className="text-green-400 font-display font-black text-base mt-0.5">
                                ₱{fin.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>

                            {/* Expenses Breakout */}
                            <div className="space-y-1.5 bg-[#0D0D0C] p-3 rounded-xl border border-white/5">
                              <span className="text-[8px] text-gray-400 uppercase tracking-wider font-extrabold block mb-1">Cost Breakout</span>

                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-400">🥬 Ingredient COGS</span>
                                <span className="text-gray-200 font-mono font-semibold">
                                  ₱{fin.ingredientsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-400">⚡ Operational Overhead</span>
                                <span className="text-blue-400 font-mono font-semibold">
                                  ₱{fin.operationalOverhead.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                              <div className="border-t border-white/5 pt-1.5 mt-1 flex items-center justify-between text-[10px] font-bold">
                                <span className="text-gray-300">Total Expenses</span>
                                <span className="text-brand-red font-mono">
                                  -₱{fin.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Net Income footer */}
                          <div className="pt-3 border-t border-white/5">
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold block">Net Income</span>
                            <div className={`font-display font-black text-lg mt-0.5 flex items-baseline justify-between ${
                              isPositive ? 'text-emerald-400' : 'text-brand-red'
                            }`}>
                              <span>
                                {isPositive ? '₱' : '-₱'}
                                {Math.abs(fin.netIncome).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded text-gray-300">
                                {fin.netMarginPercent.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-TAB 4: DAILY FINANCIAL LEDGER & AUDIT TABLE SCREEN */}
            {/* ========================================================================= */}
            {financeSubTab === 'daily-ledger' && (
              <div className="space-y-6 animate-fade-in">
                {(() => {
                  // Compute Daily Financial Audit Rows for Table View
                  const computeDailyRows = () => {
                    const dateMap: Record<string, Order[]> = {};
                    
                    orders.forEach((o) => {
                      if (!o.timestamp) return;
                      const dateStr = o.timestamp.split('T')[0];
                      if (!dateMap[dateStr]) dateMap[dateStr] = [];
                      dateMap[dateStr].push(o);
                    });

                    const todayStr = new Date().toISOString().split('T')[0];
                    if (!dateMap[todayStr]) dateMap[todayStr] = [];

                    // Ensure past 7 days are represented in map
                    for (let i = 0; i < 7; i++) {
                      const d = new Date(Date.now() - i * 86400000);
                      const dStr = d.toISOString().split('T')[0];
                      if (!dateMap[dStr]) dateMap[dStr] = [];
                    }

                    const allDates = Object.keys(dateMap);

                    const rows = allDates.map((dateStr) => {
                      const dateObj = new Date(dateStr + 'T00:00:00');
                      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const dayOrders = dateMap[dateStr];

                      let deliveredOrders = dayOrders.filter(o => o.status === 'delivered');
                      if (deliveredOrders.length === 0) {
                        deliveredOrders = dayOrders.filter(o => o.status !== 'cancelled');
                      }
                      const cancelledOrdersCount = dayOrders.filter(o => o.status === 'cancelled').length;
                      const totalSales = deliveredOrders.reduce((s, o) => s + o.totalAmount, 0);

                      let ingredientsCost = 0;
                      let totalDishes = 0;

                      deliveredOrders.forEach((order) => {
                        order.items.forEach((cartItem) => {
                          totalDishes += cartItem.quantity;
                          const item = cartItem.menuItem;
                          const qty = cartItem.quantity;

                          if (item.recipeRequirements && item.recipeRequirements.length > 0) {
                            item.recipeRequirements.forEach((req) => {
                              const ing = findMatchingIngredientInInventory(req.name, ingredientsInventory);
                              const unitPrice = getUnitPrice(ing ? ing.unit : 'g', ing?.id);
                              const amountFactor = (ing && ing.unit === 'kg') ? req.amount / 1000 : req.amount;
                              ingredientsCost += amountFactor * unitPrice * qty;
                            });
                          } else if (item.ingredients && item.ingredients.length > 0) {
                            item.ingredients.forEach((ingName) => {
                              const ing = findMatchingIngredientInInventory(ingName, ingredientsInventory);
                              const unit = ing ? ing.unit : 'g';
                              const reqPerServing = (unit === 'pcs' || unit === 'cans') ? 1 : unit === 'kg' ? 0.1 : 100;
                              ingredientsCost += reqPerServing * getUnitPrice(unit, ing?.id) * qty;
                            });
                          } else {
                            ingredientsCost += (item.price * 0.35) * qty;
                          }
                        });
                      });

                      // Pro-rated 1-day overhead allocation
                      const electricityCost = electricityBaseRate + (totalDishes * electricityVariableRate);
                      const waterCost = waterBaseRate;
                      const rentCost = rentBaseRate;
                      const laborCost = laborBaseRate;
                      const gasCost = gasBaseRate;
                      const otherCost = otherBaseRate;

                      const operationalOverhead = electricityCost + waterCost + rentCost + laborCost + gasCost + otherCost;
                      const totalExpenses = ingredientsCost + operationalOverhead;
                      const netIncome = totalSales - totalExpenses;
                      const netMarginPercent = totalSales > 0 ? (netIncome / totalSales) * 100 : 0;

                      return {
                        dateStr,
                        dayOfWeek,
                        formattedDate,
                        ordersCount: deliveredOrders.length,
                        cancelledOrdersCount,
                        totalDishes,
                        totalSales,
                        ingredientsCost,
                        electricityCost,
                        waterCost,
                        rentCost,
                        laborCost,
                        gasCost,
                        otherCost,
                        operationalOverhead,
                        totalExpenses,
                        netIncome,
                        netMarginPercent,
                        isToday: dateStr === todayStr
                      };
                    });

                    return rows;
                  };

                  const rawDailyRows = computeDailyRows();

                  // Apply search, period filter, status filter, and sorting
                  const filteredDailyRows = rawDailyRows
                    .filter((row) => {
                      if (dailySearchQuery.trim()) {
                        const q = dailySearchQuery.toLowerCase().trim();
                        const matchesDate = row.dateStr.toLowerCase().includes(q) || 
                                            row.formattedDate.toLowerCase().includes(q) || 
                                            row.dayOfWeek.toLowerCase().includes(q);
                        if (!matchesDate) return false;
                      }

                      if (dailyPeriodFilter === '7d') {
                        const rowTime = new Date(row.dateStr + 'T00:00:00').getTime();
                        const limitTime = Date.now() - 7 * 86400000;
                        if (rowTime < limitTime) return false;
                      } else if (dailyPeriodFilter === '30d') {
                        const rowTime = new Date(row.dateStr + 'T00:00:00').getTime();
                        const limitTime = Date.now() - 30 * 86400000;
                        if (rowTime < limitTime) return false;
                      }

                      if (dailyStatusFilter === 'profitable' && row.netIncome <= 0) return false;
                      if (dailyStatusFilter === 'loss' && row.netIncome > 0) return false;
                      if (dailyStatusFilter === 'sales' && row.ordersCount <= 0) return false;

                      return true;
                    })
                    .sort((a, b) => {
                      if (dailySortBy === 'date-desc') return b.dateStr.localeCompare(a.dateStr);
                      if (dailySortBy === 'date-asc') return a.dateStr.localeCompare(b.dateStr);
                      if (dailySortBy === 'revenue-desc') return b.totalSales - a.totalSales;
                      if (dailySortBy === 'profit-desc') return b.netIncome - a.netIncome;
                      if (dailySortBy === 'orders-desc') return b.ordersCount - a.ordersCount;
                      return 0;
                    });

                  const handleExportDailyTableCSV = (dataRows: typeof rawDailyRows) => {
                    const headers = ['Date', 'Day of Week', 'Delivered Orders', 'Voided Orders', 'Delivered Sales (PHP)', 'Ingredients COGS (PHP)', 'Electricity (PHP)', 'Water (PHP)', 'Rent (PHP)', 'Labor (PHP)', 'LPG Gas (PHP)', 'Packaging (PHP)', 'Total Overhead (PHP)', 'Total Expenses (PHP)', 'Net Profit (PHP)', 'Net Margin (%)'];
                    
                    const csvLines = dataRows.map(r => [
                      `"${r.formattedDate}"`,
                      `"${r.dayOfWeek}"`,
                      r.ordersCount,
                      r.cancelledOrdersCount,
                      r.totalSales.toFixed(2),
                      r.ingredientsCost.toFixed(2),
                      r.electricityCost.toFixed(2),
                      r.waterCost.toFixed(2),
                      r.rentCost.toFixed(2),
                      r.laborCost.toFixed(2),
                      r.gasCost.toFixed(2),
                      r.otherCost.toFixed(2),
                      r.operationalOverhead.toFixed(2),
                      r.totalExpenses.toFixed(2),
                      r.netIncome.toFixed(2),
                      `${r.netMarginPercent.toFixed(1)}%`
                    ].join(','));

                    const csvText = [headers.join(','), ...csvLines].join('\n');
                    navigator.clipboard.writeText(csvText);
                    alert(`📋 Copied ${dataRows.length} daily financial audit record(s) to clipboard as CSV!`);
                  };

                  return (
                    <div className="bg-[#121211] border border-emerald-500/20 rounded-[2rem] p-6 shadow-xl space-y-6">
                      
                      {/* Header & Interactive Filter Bar */}
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-emerald-400" /> Daily Financial Table Screen
                            </span>
                            <span className="text-xs text-gray-400 font-bold">Itemized Day-by-Day Financial Ledger & Auditing</span>
                          </div>
                          <h4 className="font-display font-black text-white text-lg md:text-xl mt-1.5 flex items-center gap-2">
                            📋 Daily Financial Breakdown & Audit Table
                          </h4>
                          <p className="text-gray-400 text-xs mt-1 max-w-2xl font-medium leading-relaxed">
                            Audit daily revenue, ingredient costs, and 6 operational overheads per day. Use search, range filters, and profitability toggles to analyze your bottom line.
                          </p>
                        </div>

                        {/* Filter & Search Bar */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {/* Search */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={dailySearchQuery}
                              onChange={(e) => setDailySearchQuery(e.target.value)}
                              placeholder="Search date (e.g. Sat, Sep 12)..."
                              className="pl-8 pr-3 py-1.5 w-44 sm:w-52 bg-[#0D0D0C] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 font-medium"
                            />
                          </div>

                          {/* Date Range Horizon Filter */}
                          <select
                            value={dailyPeriodFilter}
                            onChange={(e) => setDailyPeriodFilter(e.target.value as any)}
                            className="bg-[#0D0D0C] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-bold cursor-pointer"
                          >
                            <option value="all">📅 All Days</option>
                            <option value="7d">⚡ Last 7 Days (7d)</option>
                            <option value="30d">🗓️ Last 30 Days (30d)</option>
                          </select>

                          {/* Profitability Status Filter */}
                          <select
                            value={dailyStatusFilter}
                            onChange={(e) => setDailyStatusFilter(e.target.value as any)}
                            className="bg-[#0D0D0C] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-bold cursor-pointer"
                          >
                            <option value="all">📊 All Statuses</option>
                            <option value="profitable">🟢 Profitable Days</option>
                            <option value="loss">🔴 Deficit Days</option>
                            <option value="sales">🛍️ Days with Sales</option>
                          </select>

                          {/* Sort Controls */}
                          <select
                            value={dailySortBy}
                            onChange={(e) => setDailySortBy(e.target.value as any)}
                            className="bg-[#0D0D0C] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-bold cursor-pointer"
                          >
                            <option value="date-desc">⬇️ Date (Newest First)</option>
                            <option value="date-asc">⬆️ Date (Oldest First)</option>
                            <option value="revenue-desc">💰 Sales (Highest First)</option>
                            <option value="profit-desc">💵 Net Profit (Highest First)</option>
                            <option value="orders-desc">🛍️ Orders (Most First)</option>
                          </select>

                          {/* CSV Export Button */}
                          <button
                            type="button"
                            onClick={() => handleExportDailyTableCSV(filteredDailyRows)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                            title="Copy Daily Audit Table as CSV"
                          >
                            <Copy className="w-3.5 h-3.5" /> Export CSV
                          </button>
                        </div>
                      </div>

                      {/* Summary Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0D0D0C] p-3 rounded-xl border border-white/5 text-xs font-mono">
                        <span className="text-gray-400 font-bold">
                          Showing <strong className="text-white">{filteredDailyRows.length}</strong> of {rawDailyRows.length} daily ledger records
                        </span>
                        
                        <div className="flex items-center gap-4 text-[11px]">
                          <span className="text-gray-400">
                            Total Sales: <strong className="text-green-400">₱{filteredDailyRows.reduce((s, r) => s + r.totalSales, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </span>
                          <span className="text-gray-400">
                            Total Profit: <strong className="text-emerald-400">₱{filteredDailyRows.reduce((s, r) => s + r.netIncome, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Daily Financial Breakdown Table */}
                      <div className="overflow-x-auto border border-white/5 rounded-2xl bg-[#0D0D0C]">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-white/10 bg-[#181818] text-gray-400 uppercase text-[9px] font-black tracking-wider">
                              <th className="p-3.5">Date & Day</th>
                              <th className="p-3.5">Orders</th>
                              <th className="p-3.5">Delivered Sales</th>
                              <th className="p-3.5">Ingredients COGS</th>
                              <th className="p-3.5">Daily Overhead</th>
                              <th className="p-3.5">Total Expenses</th>
                              <th className="p-3.5">Net Profit / Loss</th>
                              <th className="p-3.5">Net Margin</th>
                              <th className="p-3.5 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {filteredDailyRows.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="p-8 text-center text-gray-500 font-sans italic text-xs">
                                  🔍 No matching daily financial records found for the selected filters.
                                </td>
                              </tr>
                            ) : (
                              filteredDailyRows.map((row) => {
                                const isPos = row.netIncome >= 0;
                                return (
                                  <tr key={row.dateStr} className="hover:bg-white/[0.02] transition-colors">
                                    {/* Date */}
                                    <td className="p-3.5 font-bold text-white">
                                      <div className="flex items-center gap-2">
                                        <span>{row.formattedDate}</span>
                                        {row.isToday && (
                                          <span className="text-[8px] bg-brand-gold/15 text-brand-gold border border-brand-gold/30 px-1.5 py-0.2 rounded font-black uppercase">
                                            TODAY
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[9px] text-gray-500 font-normal block">{row.dayOfWeek}</span>
                                    </td>

                                    {/* Orders */}
                                    <td className="p-3.5 text-gray-300">
                                      <span className="font-bold text-white">{row.ordersCount}</span> {row.ordersCount === 1 ? 'order' : 'orders'}
                                      {row.cancelledOrdersCount > 0 && (
                                        <span className="text-[9px] text-brand-red block font-normal">({row.cancelledOrdersCount} voided)</span>
                                      )}
                                    </td>

                                    {/* Delivered Sales */}
                                    <td className="p-3.5 font-bold text-green-400">
                                      ₱{row.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>

                                    {/* Ingredients COGS */}
                                    <td className="p-3.5 text-gray-300">
                                      ₱{row.ingredientsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>

                                    {/* Daily Overhead */}
                                    <td className="p-3.5 text-blue-400 font-medium" title={`Overhead: Elec ₱${row.electricityCost.toFixed(2)}, Water ₱${row.waterCost.toFixed(2)}, Rent ₱${row.rentCost.toFixed(2)}, Labor ₱${row.laborCost.toFixed(2)}, Gas ₱${row.gasCost.toFixed(2)}, Packaging ₱${row.otherCost.toFixed(2)}`}>
                                      ₱{row.operationalOverhead.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>

                                    {/* Total Expenses */}
                                    <td className="p-3.5 text-brand-red font-bold">
                                      -₱{row.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>

                                    {/* Net Income */}
                                    <td className={`p-3.5 font-black ${isPos ? 'text-emerald-400' : 'text-brand-red'}`}>
                                      {isPos ? '₱' : '-₱'}
                                      {Math.abs(row.netIncome).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>

                                    {/* Net Margin */}
                                    <td className="p-3.5">
                                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold ${
                                        row.netMarginPercent >= 20 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        row.netMarginPercent > 0 ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20' :
                                        'bg-brand-red/10 text-brand-red border border-brand-red/20'
                                      }`}>
                                        {row.netMarginPercent.toFixed(1)}%
                                      </span>
                                    </td>

                                    {/* Status */}
                                    <td className="p-3.5 text-right font-sans">
                                      {row.ordersCount === 0 ? (
                                        <span className="text-[9px] font-black uppercase bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded">
                                          ⚪ No Sales
                                        </span>
                                      ) : isPos ? (
                                        <span className="text-[9px] font-black uppercase bg-green-500/10 border border-green-500/25 text-green-400 px-2 py-0.5 rounded">
                                          🟢 Profitable
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-black uppercase bg-brand-red/10 border border-brand-red/25 text-brand-red px-2 py-0.5 rounded">
                                          🔴 Deficit
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        );
      })()}

      {/* --- TAB PANEL: TABLE QR CODE GENERATOR & DINE-IN MANAGEMENT --- */}
      {chefTab === 'qr' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <span className="text-xs bg-brand-gold/10 text-brand-gold font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] inline-block mb-1">
                  📱 Customer Dine-In Ordering
                </span>
                <h3 className="font-display font-black text-white text-xl flex items-center gap-2">
                  📱 Table QR Code Generator & Floor Standees
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  Generate high-res QR standees for tables (1-20). Customers scan the QR code to open the menu with pre-filled table details.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-brand-gold hover:opacity-90 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  🖨️ Batch Print Standees
                </button>
              </div>
            </div>

            {/* Table Selector Row */}
            <div className="space-y-3">
              <label className="text-xs text-gray-400 font-bold uppercase block">Select Table Standee to View / Test</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((tNum) => (
                  <button
                    key={tNum}
                    type="button"
                    onClick={() => setSelectedQRTable(tNum)}
                    className={`w-12 h-12 rounded-xl font-black text-xs transition-all cursor-pointer ${
                      selectedQRTable === tNum
                        ? 'bg-brand-red text-white scale-105 shadow-lg border-2 border-white'
                        : 'bg-[#181818] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    T{tNum}
                  </button>
                ))}
              </div>
            </div>

            {/* Standee Preview Card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 bg-white text-black p-6 rounded-3xl space-y-4 text-center shadow-2xl mx-auto w-full max-w-xs border-4 border-black">
                <div className="border-b-2 border-black pb-2">
                  <span className="font-display font-black text-lg uppercase tracking-tighter block">CURVADA'S KITCHEN</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">DINE-IN CONTACTLESS MENU</span>
                </div>

                <div className="bg-gray-100 p-3 rounded-2xl border-2 border-gray-300 inline-block shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(window.location.origin + '?table=' + selectedQRTable)}`}
                    alt={`Table ${selectedQRTable} QR`}
                    className="w-48 h-48 mx-auto object-contain"
                  />
                </div>

                <div className="space-y-1">
                  <span className="font-display font-black text-2xl text-brand-red uppercase block">TABLE #{selectedQRTable}</span>
                  <p className="text-[10px] text-gray-600 font-bold leading-tight">
                    Scan using your phone's camera to instantly view our menu & place your order!
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-200 text-[8px] font-mono text-gray-500">
                  Powered by Curvada KDS Engine
                </div>
              </div>

              <div className="md:col-span-7 space-y-4">
                <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-3">
                  <h4 className="text-white font-bold text-sm uppercase flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-gold" /> Direct Access URL
                  </h4>
                  <div className="bg-[#0D0D0C] p-3 rounded-xl border border-white/10 font-mono text-xs text-brand-gold break-all flex items-center justify-between gap-2">
                    <span>{window.location.origin}/?table={selectedQRTable}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/?table=${selectedQRTable}`);
                        alert('Copied Table URL to clipboard!');
                      }}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] uppercase font-bold shrink-0 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-3">
                  <h4 className="text-white font-bold text-sm uppercase">💡 How it Automates Dine-In:</h4>
                  <ul className="text-xs text-gray-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-brand-gold font-bold">1.</span> Customers sit down at Table #{selectedQRTable} and scan the QR code standee.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-gold font-bold">2.</span> The customer menu auto-selects Table #{selectedQRTable} at checkout without needing staff assistance.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-gold font-bold">3.</span> Kitchen staff see "Dine-In Table #{selectedQRTable}" on the Kitchen Kanban Display immediately!
                    </li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB PANEL: PROMO VOUCHERS & DISCOUNTS --- */}
      {chefTab === 'vouchers' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          {/* Header & Metrics */}
          <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <span className="text-xs bg-brand-gold/10 text-brand-gold font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] inline-block mb-1">
                  🎟️ Marketing & Loyalty
                </span>
                <h3 className="font-display font-black text-white text-xl flex items-center gap-2">
                  🎟️ Promo Vouchers & Customer Loyalty Discounts
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  Create discount codes for customer store checkouts, monitor redemption stats, and set spend thresholds.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-brand-gold/10 text-brand-gold rounded-xl">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Active Vouchers</span>
                  <span className="text-white font-extrabold text-lg">{vouchersList.filter(v => v.active).length} Active</span>
                </div>
              </div>

              <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-green-500/10 text-green-400 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Total Redemptions</span>
                  <span className="text-white font-extrabold text-lg">{vouchersList.reduce((s, v) => s + v.timesUsed, 0)} Orders</span>
                </div>
              </div>

              <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Savings Granted</span>
                  <span className="text-white font-extrabold text-lg">₱3,450.00</span>
                </div>
              </div>
            </div>

            {/* Create Voucher Form & Table Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Form */}
              <div className="lg:col-span-5 bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-white text-sm uppercase flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-brand-gold" /> Create New Promo Voucher
                </h4>
                
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newVoucherCode.trim()) return alert('Enter voucher code!');
                    const codeUpper = newVoucherCode.trim().toUpperCase();
                    const newV = {
                      id: `v-${Date.now()}`,
                      code: codeUpper,
                      discountType: newVoucherType,
                      discountValue: Number(newVoucherValue),
                      minSpend: Number(newVoucherMinSpend),
                      active: true,
                      timesUsed: 0
                    };
                    setVouchersList([newV, ...vouchersList]);
                    setNewVoucherCode('');
                    alert(`Created voucher code: ${codeUpper}!`);
                  }}
                  className="space-y-3.5 text-xs"
                >
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase block text-[10px]">Voucher Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SUMMER20"
                      value={newVoucherCode}
                      onChange={(e) => setNewVoucherCode(e.target.value)}
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-2.5 text-white font-mono font-bold uppercase focus:outline-none focus:border-brand-gold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold uppercase block text-[10px]">Type</label>
                      <select
                        value={newVoucherType}
                        onChange={(e) => setNewVoucherType(e.target.value as any)}
                        className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-2.5 text-white font-bold focus:outline-none"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₱)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold uppercase block text-[10px]">Discount Value</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newVoucherValue}
                        onChange={(e) => setNewVoucherValue(Number(e.target.value))}
                        className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase block text-[10px]">Min. Order Spend Requirement (₱)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={newVoucherMinSpend}
                      onChange={(e) => setNewVoucherMinSpend(Number(e.target.value))}
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-gold hover:opacity-90 text-black font-black uppercase text-xs rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    Publish Promo Code
                  </button>
                </form>
              </div>

              {/* Right Table */}
              <div className="lg:col-span-7 space-y-3">
                <h4 className="font-bold text-white text-sm uppercase">Active Voucher Catalog ({vouchersList.length})</h4>
                <div className="overflow-x-auto border border-white/5 rounded-2xl bg-[#0D0D0C]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 uppercase text-[9px] font-black">
                        <th className="p-3">Code</th>
                        <th className="p-3">Discount</th>
                        <th className="p-3">Min Spend</th>
                        <th className="p-3">Redemptions</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {vouchersList.map((v) => (
                        <tr key={v.id} className="hover:bg-white/[0.02]">
                          <td className="p-3 font-mono font-bold text-brand-gold">{v.code}</td>
                          <td className="p-3 font-bold text-white">
                            {v.discountType === 'percentage' ? `${v.discountValue}% OFF` : `₱${v.discountValue} OFF`}
                          </td>
                          <td className="p-3 text-gray-400 font-mono">₱{v.minSpend}</td>
                          <td className="p-3 text-gray-300 font-mono">{v.timesUsed} times</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setVouchersList(vouchersList.map(item => item.id === v.id ? { ...item, active: !item.active } : item));
                              }}
                              className={`px-2.5 py-1 rounded text-[9px] font-black uppercase cursor-pointer ${
                                v.active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-gray-500 border border-white/10'
                              }`}
                            >
                              {v.active ? '✓ Active' : 'Disabled'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* --- TAB PANEL: LOW-STOCK SUPPLIER PO WORKSPACE --- */}
      {chefTab === 'po' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <span className="text-xs bg-brand-gold/10 text-brand-gold font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] inline-block mb-1">
                  📦 Supply Chain Automation
                </span>
                <h3 className="font-display font-black text-white text-xl flex items-center gap-2">
                  📦 Low-Stock Supplier Purchase Order (PO) Workspace
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  Review raw ingredients at or below reorder levels, auto-calculate purchase quantities, and copy structured POs.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const items = ingredientsInventory.filter(ing => ing.quantity <= ing.lowStockAlert);
                    const text = items.map(i => `${i.name}: ${Math.max(1, i.lowStockAlert * 3 - i.quantity)} ${i.unit}`).join('\n');
                    navigator.clipboard.writeText(`PURCHASE ORDER - CURVADA'S KITCHEN\nDate: ${new Date().toLocaleDateString()}\n\n` + text);
                    alert('Copied Purchase Order list to clipboard!');
                  }}
                  className="px-4 py-2 bg-brand-gold hover:opacity-90 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  📋 Copy PO Clipboard
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-white/5 rounded-2xl bg-[#0D0D0C]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 uppercase text-[9px] font-black">
                    <th className="p-3">Ingredient</th>
                    <th className="p-3 text-right">Current Stock</th>
                    <th className="p-3 text-right">Low Stock Alert</th>
                    <th className="p-3 text-right">Reorder Needed</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Est Line Cost</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {ingredientsInventory.filter(ing => ing.quantity <= ing.lowStockAlert).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-emerald-400 font-sans text-xs">
                        🎉 All inventory stock levels are currently healthy! No purchase orders needed.
                      </td>
                    </tr>
                  ) : (
                    ingredientsInventory.filter(ing => ing.quantity <= ing.lowStockAlert).map((ing) => {
                      const reorderQty = Math.max(1, ing.lowStockAlert * 3 - ing.quantity);
                      const estCost = reorderQty * (ing.costPerUnit || 15);
                      return (
                        <tr key={ing.id} className="hover:bg-white/[0.02]">
                          <td className="p-3 font-sans font-bold text-white">{ing.name}</td>
                          <td className="p-3 text-right text-brand-red font-bold">{ing.quantity} {ing.unit}</td>
                          <td className="p-3 text-right text-gray-400">{ing.lowStockAlert} {ing.unit}</td>
                          <td className="p-3 text-right text-brand-gold font-bold">{reorderQty} {ing.unit}</td>
                          <td className="p-3 text-right text-gray-300">₱{(ing.costPerUnit || 15).toFixed(2)}</td>
                          <td className="p-3 text-right text-white font-bold">₱{estCost.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateIngredientStock(ing.id, ing.quantity + reorderQty);
                                alert(`Restocked +${reorderQty} ${ing.unit} of ${ing.name}!`);
                              }}
                              className="px-2.5 py-1 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-black border border-green-500/20 text-[9px] font-black uppercase rounded cursor-pointer transition-all"
                            >
                              Restock Now
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB PANEL: INGREDIENT SPOILAGE & WASTAGE LOGGER --- */}
      {chefTab === 'spoilage' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <span className="text-xs bg-red-500/10 text-brand-red font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] inline-block mb-1">
                  🗑️ Inventory Loss Prevention
                </span>
                <h3 className="font-display font-black text-white text-xl flex items-center gap-2">
                  🗑️ Ingredient Spoilage & Wastage Intelligence Logger
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  Record discarded raw materials due to expiration, preparation spills, or defects to maintain accurate inventory records.
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-red-500/10 text-brand-red rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Total Discard Loss Value</span>
                  <span className="text-white font-extrabold text-lg">₱{spoilageLogs.reduce((s, log) => s + log.estLossCost, 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-brand-gold/10 text-brand-gold rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Logged Waste Incidents</span>
                  <span className="text-white font-extrabold text-lg">{spoilageLogs.length} Records</span>
                </div>
              </div>

              <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Primary Reason</span>
                  <span className="text-white font-extrabold text-lg">Expired / Prep Loss</span>
                </div>
              </div>
            </div>

            {/* Log Form & Log Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Log Form */}
              <div className="lg:col-span-5 bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-white text-sm uppercase flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-brand-red" /> Log Waste Incident
                </h4>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!spoilageIngId) return alert('Choose ingredient!');
                    const ing = ingredientsInventory.find(i => i.id === spoilageIngId);
                    if (!ing) return;

                    const cost = Number(spoilageAmount) * (ing.costPerUnit || 5);
                    const newLog = {
                      id: `sp-${Date.now()}`,
                      ingredientId: ing.id,
                      ingredientName: ing.name,
                      amount: Number(spoilageAmount),
                      unit: ing.unit,
                      reason: spoilageReason,
                      loggedBy: loginRole === 'admin' ? 'Manager' : 'Kitchen Chef',
                      timestamp: new Date().toISOString(),
                      estLossCost: cost
                    };

                    setSpoilageLogs([newLog, ...spoilageLogs]);
                    onUpdateIngredientStock(ing.id, Math.max(0, ing.quantity - Number(spoilageAmount)));
                    setSpoilageIngId('');
                    alert(`Logged ${spoilageAmount}${ing.unit} waste for ${ing.name}!`);
                  }}
                  className="space-y-3.5 text-xs"
                >
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase block text-[10px]">Ingredient *</label>
                    <select
                      value={spoilageIngId}
                      onChange={(e) => setSpoilageIngId(e.target.value)}
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-2.5 text-white font-bold focus:outline-none"
                      required
                    >
                      <option value="">-- Select Ingredient --</option>
                      {ingredientsInventory.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name} (Stock: {ing.quantity} {ing.unit})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase block text-[10px]">Discard Amount *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={spoilageAmount}
                      onChange={(e) => setSpoilageAmount(Number(e.target.value))}
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase block text-[10px]">Discard Reason</label>
                    <select
                      value={spoilageReason}
                      onChange={(e) => setSpoilageReason(e.target.value as any)}
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-2.5 text-white font-bold focus:outline-none"
                    >
                      <option value="expired">Expired / Past Shelf Life</option>
                      <option value="spilled">Spilled / Preparation Loss</option>
                      <option value="damaged">Damaged Packaging / Contaminated</option>
                      <option value="quality_defect">Supplier Quality Defect</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-red hover:opacity-90 text-white font-black uppercase text-xs rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    Submit Waste Log & Deduct Stock
                  </button>
                </form>
              </div>

              {/* Log Table */}
              <div className="lg:col-span-7 space-y-3">
                <h4 className="font-bold text-white text-sm uppercase">Recent Wastage Logs ({spoilageLogs.length})</h4>
                <div className="overflow-x-auto border border-white/5 rounded-2xl bg-[#0D0D0C]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 uppercase text-[9px] font-black">
                        <th className="p-3">Date/Time</th>
                        <th className="p-3">Ingredient</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Reason</th>
                        <th className="p-3 text-right">Est Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {spoilageLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02]">
                          <td className="p-3 text-gray-500 font-sans text-[10px]">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="p-3 font-sans font-bold text-white">{log.ingredientName}</td>
                          <td className="p-3 text-brand-red font-bold">{log.amount} {log.unit}</td>
                          <td className="p-3 font-sans">
                            <span className="bg-white/5 text-gray-300 text-[9px] px-2 py-0.5 rounded font-bold uppercase">
                              {log.reason}
                            </span>
                          </td>
                          <td className="p-3 text-right text-brand-gold font-bold">₱{log.estLossCost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* --- TAB PANEL: STAFF SHIFT ATTENDANCE & TIMECARD --- */}
      {chefTab === 'shifts' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <span className="text-xs bg-brand-gold/10 text-brand-gold font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] inline-block mb-1">
                  ⏱️ Workplace Operations
                </span>
                <h3 className="font-display font-black text-white text-xl flex items-center gap-2">
                  ⏱️ Staff Shift Attendance & Live Payroll Timecard
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  Clock in/out staff shifts, monitor live working hours, and review daily labor costs.
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-brand-gold/10 text-brand-gold rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Currently Clocked In</span>
                  <span className="text-white font-extrabold text-lg">{activeShifts.length} Staff On Duty</span>
                </div>
              </div>

              <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Completed Shift Hours</span>
                  <span className="text-white font-extrabold text-lg">{completedShifts.reduce((s, sh) => s + sh.totalHours, 0)} Hours</span>
                </div>
              </div>

              <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-3 bg-green-500/10 text-green-400 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Est. Labor Expense</span>
                  <span className="text-white font-extrabold text-lg">₱{completedShifts.reduce((s, sh) => s + sh.totalEarned, 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Clock-In Form & Active Staff */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-5 bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-white text-sm uppercase flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-brand-gold" /> Clock In Staff Member
                </h4>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!staffClockName.trim()) return;
                    const newShift = {
                      id: `sft-${Date.now()}`,
                      staffName: staffClockName.trim(),
                      clockIn: new Date().toISOString(),
                      hourlyRate: staffClockHourly
                    };
                    setActiveShifts([newShift, ...activeShifts]);
                    setStaffClockName('');
                    alert(`Clocked in ${newShift.staffName}!`);
                  }}
                  className="space-y-3.5 text-xs"
                >
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase block text-[10px]">Staff Member Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chef Ronald"
                      value={staffClockName}
                      onChange={(e) => setStaffClockName(e.target.value)}
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-2.5 text-white font-bold focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase block text-[10px]">Hourly Wage Rate (₱/hr)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={staffClockHourly}
                      onChange={(e) => setStaffClockHourly(Number(e.target.value))}
                      className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-gold hover:opacity-90 text-black font-black uppercase text-xs rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    ▶️ Clock In Staff Shift
                  </button>
                </form>
              </div>

              {/* Active & Completed Shifts */}
              <div className="lg:col-span-7 space-y-4">
                <h4 className="font-bold text-white text-sm uppercase">Active Duty Staff ({activeShifts.length})</h4>
                
                <div className="space-y-2">
                  {activeShifts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 italic bg-[#0D0D0C] border border-white/5 rounded-2xl text-xs">
                      No staff members currently clocked in.
                    </div>
                  ) : (
                    activeShifts.map((s) => (
                      <div key={s.id} className="p-4 bg-[#0D0D0C] border border-white/5 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white text-sm">{s.staffName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">Clock In: {new Date(s.clockIn).toLocaleTimeString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const clockOutTime = new Date().toISOString();
                            const hrs = Math.max(1, Math.round((Date.now() - new Date(s.clockIn).getTime()) / (1000 * 3600)));
                            const newCompleted = {
                              id: s.id,
                              staffName: s.staffName,
                              clockIn: s.clockIn,
                              clockOut: clockOutTime,
                              totalHours: hrs,
                              hourlyRate: s.hourlyRate,
                              totalEarned: hrs * s.hourlyRate
                            };
                            setCompletedShifts([newCompleted, ...completedShifts]);
                            setActiveShifts(activeShifts.filter(item => item.id !== s.id));
                            alert(`Clocked out ${s.staffName}!`);
                          }}
                          className="px-3.5 py-1.5 bg-brand-red text-white font-black text-xs uppercase rounded-xl shadow-md cursor-pointer hover:bg-red-600 transition-all"
                        >
                          Clock Out Shift
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <h4 className="font-bold text-white text-sm uppercase pt-2">Completed Shift Logs</h4>
                <div className="overflow-x-auto border border-white/5 rounded-2xl bg-[#0D0D0C]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 uppercase text-[9px] font-black">
                        <th className="p-3">Staff Name</th>
                        <th className="p-3">Hours Worked</th>
                        <th className="p-3 text-right">Rate</th>
                        <th className="p-3 text-right">Total Earned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {completedShifts.map((sh) => (
                        <tr key={sh.id} className="hover:bg-white/[0.02]">
                          <td className="p-3 font-sans font-bold text-white">{sh.staffName}</td>
                          <td className="p-3 text-gray-300">{sh.totalHours} hrs</td>
                          <td className="p-3 text-right text-gray-400">₱{sh.hourlyRate}/hr</td>
                          <td className="p-3 text-right text-green-400 font-bold">₱{sh.totalEarned.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* --- TAB PANEL: END OF DAY Z-READ AUDIT --- */}
      {chefTab === 'zread' && (() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(o => o.timestamp.startsWith(todayStr) && o.status !== 'cancelled');
        const cashSales = todayOrders.filter(o => o.paymentMethod === 'cod').reduce((sum, o) => sum + o.totalAmount, 0);
        const ewalletSales = todayOrders.filter(o => o.paymentMethod === 'ewallet').reduce((sum, o) => sum + o.totalAmount, 0);
        const cardSales = todayOrders.filter(o => o.paymentMethod === 'card').reduce((sum, o) => sum + o.totalAmount, 0);
        const grossSales = cashSales + ewalletSales + cardSales;
        const discrepancy = zReadCashCount - cashSales;

        return (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-[#121211] border border-white/5 rounded-[2rem] p-6 shadow-xl space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <span className="text-xs bg-brand-gold/10 text-brand-gold font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[9px] inline-block mb-1">
                    📋 EOD Closing Audit
                  </span>
                  <h3 className="font-display font-black text-white text-xl flex items-center gap-2">
                    📋 End-of-Day (EOD) Z-Read Cash Audit & Reconciliation
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Count physical drawer cash, balance against expected sales, and archive daily closing reports.
                  </p>
                </div>
              </div>

              {/* Today's Sales Breakout Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
                <div className="bg-[#181818] border border-white/5 rounded-2xl p-4">
                  <span className="text-[10px] text-gray-500 font-sans font-bold uppercase block">Cash Sales</span>
                  <span className="text-white font-extrabold text-lg">₱{cashSales.toFixed(2)}</span>
                </div>
                <div className="bg-[#181818] border border-white/5 rounded-2xl p-4">
                  <span className="text-[10px] text-gray-500 font-sans font-bold uppercase block">E-Wallet (GCash/Maya)</span>
                  <span className="text-white font-extrabold text-lg">₱{ewalletSales.toFixed(2)}</span>
                </div>
                <div className="bg-[#181818] border border-white/5 rounded-2xl p-4">
                  <span className="text-[10px] text-gray-500 font-sans font-bold uppercase block">Card Sales</span>
                  <span className="text-white font-extrabold text-lg">₱{cardSales.toFixed(2)}</span>
                </div>
                <div className="bg-[#181818] border border-brand-gold/20 rounded-2xl p-4 bg-brand-gold/5">
                  <span className="text-[10px] text-brand-gold font-sans font-bold uppercase block">Gross Total</span>
                  <span className="text-brand-gold font-extrabold text-lg">₱{grossSales.toFixed(2)}</span>
                </div>
              </div>

              {/* Form & Past Audits */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <div className="lg:col-span-5 bg-[#181818] border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="font-bold text-white text-sm uppercase">Reconcile Cash Drawer Count</h4>

                  <div className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-gray-400 font-bold uppercase block text-[10px]">Physical Cash Counted (Bills & Coins)</label>
                      <input
                        type="number"
                        min="0"
                        value={zReadCashCount}
                        onChange={(e) => setZReadCashCount(Number(e.target.value))}
                        className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-3 text-white font-mono font-bold text-base focus:outline-none focus:border-brand-gold"
                        placeholder="0.00"
                      />
                    </div>

                    <div className={`p-3 rounded-xl border text-xs font-bold flex justify-between items-center ${
                      discrepancy === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      discrepancy > 0 ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                      'bg-red-500/10 border-red-500/20 text-red-500'
                    }`}>
                      <span>Drawer Variance:</span>
                      <span className="font-mono font-black">
                        {discrepancy === 0 ? '✓ Balanced' : discrepancy > 0 ? `+₱${discrepancy.toFixed(2)} (Over)` : `-₱${Math.abs(discrepancy).toFixed(2)} (Short)`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newReport = {
                          id: `zr-${Date.now()}`,
                          date: todayStr,
                          grossSales,
                          cashSales,
                          ewalletSales,
                          cardSales,
                          countedCash: zReadCashCount,
                          variance: discrepancy,
                          closedBy: loginRole === 'admin' ? 'Manager' : 'Kitchen Staff'
                        };
                        setZReadReports([newReport, ...zReadReports]);
                        alert('Archived EOD Z-Read Reconciliation Audit Report!');
                      }}
                      className="w-full py-3 bg-brand-gold hover:opacity-90 text-black font-black uppercase text-xs rounded-xl shadow-md cursor-pointer transition-all"
                    >
                      Save & Close Day (Z-Read Audit)
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-3">
                  <h4 className="font-bold text-white text-sm uppercase">Historical Z-Read Audit Reports</h4>
                  <div className="overflow-x-auto border border-white/5 rounded-2xl bg-[#0D0D0C]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-gray-500 uppercase text-[9px] font-black">
                          <th className="p-3">Date</th>
                          <th className="p-3">Gross Revenue</th>
                          <th className="p-3">Expected Cash</th>
                          <th className="p-3">Counted</th>
                          <th className="p-3 text-right">Variance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {zReadReports.map((zr) => (
                          <tr key={zr.id} className="hover:bg-white/[0.02]">
                            <td className="p-3 font-sans font-bold text-white">{zr.date}</td>
                            <td className="p-3 text-brand-gold font-bold">₱{zr.grossSales.toFixed(2)}</td>
                            <td className="p-3 text-gray-300">₱{zr.cashSales.toFixed(2)}</td>
                            <td className="p-3 text-white">₱{zr.countedCash.toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                zr.variance === 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'
                              }`}>
                                {zr.variance === 0 ? '✓ Balanced' : `₱${zr.variance.toFixed(2)}`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* --- ADD / EDIT MENU ITEM FORM DIALOG OVERLAY --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#181818] border-2 border-white/10 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl w-full max-w-4xl lg:max-w-5xl flex flex-col max-h-[92vh] animate-slide-in-up">
            
            {/* Header */}
            <div className="p-5 border-b-2 border-white/5 bg-[#0D0D0C] flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-gold">
                <Sparkles className="w-5 h-5" />
                <h4 className="font-display font-black text-white text-base uppercase tracking-tight">
                  {editingItem ? `Modify Catalog Recipe` : 'Publish New Recipe'}
                </h4>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-lg hover:bg-[#222222] text-gray-500 hover:text-white transition-all focus:outline-none border border-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
              
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">Culinary Category *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['bento', 'silog', 'rice-bowl', 'drinks'] as Category[]).map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => {
                        setFormCategory(cat);
                        // Auto-assign matching preset image if current is standard preset to save efforts
                        const matchingPreset = IMAGE_PRESETS.find(p => p.name.toLowerCase().includes(cat));
                        if (matchingPreset) {
                          setFormImage(matchingPreset.url);
                        }
                      }}
                      className={`py-2 px-1 text-center rounded-xl font-bold uppercase text-[9px] tracking-wider border-2 transition-all ${
                        formCategory === cat
                          ? 'bg-brand-red/10 text-brand-red border-brand-red'
                          : 'bg-[#0D0D0C] text-gray-400 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {cat.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">Dish Recipe Title *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Garlic Lechon Kawali Bento"
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">Recipe Description *</label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe ingredients, cooking techniques, and accompaniments like garlic rice and fried eggs..."
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red resize-none"
                />
              </div>

              {/* Ingredients */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">Recipe Ingredients (Comma-separated)</label>
                <textarea
                  rows={2}
                  value={formIngredients}
                  onChange={(e) => setFormIngredients(e.target.value)}
                  placeholder="e.g. Garlic Fried Rice, Sunny Side Egg, Marinated Beef Tapa, Atchara"
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red resize-none"
                />
                <span className="text-[9px] text-gray-500 font-medium block">Provide ingredients separated by commas to display them as beautiful tags on the customer menu.</span>
              </div>

              {/* Linked Ingredients & Packaging from Bulk Calculator */}
              <div className="bg-[#0D0D0C]/60 p-4 rounded-2xl border border-white/10 space-y-3.5 text-left shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-gray-200 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                        <span>🍱 Ingredients & Packaging from Bulk Calculator</span>
                        <span className="px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold text-[9px] font-black border border-brand-gold/30">
                          {formRecipeRequirements.length} Linked Items
                        </span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[9px] text-gray-400 font-medium flex-wrap">
                      <span className="text-gray-500 font-bold uppercase text-[8px] tracking-wider">Batch Setup:</span>
                      <span className="text-amber-400 font-bold">
                        🥩 {formBatchYieldUnit === 'pcs'
                          ? `${formBatchYieldGrams} pcs Batch (${formServingSizeGrams} pcs/plate)`
                          : `${(Number(formBatchYieldGrams) / 1000).toFixed(1)}kg Batch (${formServingSizeGrams}g/plate)`}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-emerald-400 font-bold">
                        🍚 {formIncludeRice ? `${formRicePortionGrams}g Rice` : 'No Rice'}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-blue-400 font-bold">
                        📦 {formPkgReqs.length > 0 ? `${formPkgReqs.length} Packaging Items` : 'Plated / Dine-In'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendRecipeFormToBatchCalc}
                    className="px-3.5 py-2 bg-brand-gold hover:bg-brand-gold-hover text-black text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-105"
                    title="Open the Commercial Bulk Calculator to modify raw ingredients, batch yield, rice portions, or packaging containers"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>🧮 Configure in Bulk Calculator →</span>
                  </button>
                </div>

                {formRecipeRequirements.length === 0 ? (
                  <div className="text-center py-6 px-4 bg-[#121211] rounded-xl border border-white/5 space-y-2">
                    <PackageCheck className="w-8 h-8 text-gray-600 mx-auto" />
                    <p className="text-xs text-gray-300 font-semibold">No ingredients or packaging linked yet.</p>
                    <p className="text-[10px] text-gray-500 max-w-md mx-auto">
                      Click the button above to launch the Bulk Calculator and configure raw materials, batch cooked yield, rice portions, and takeout packaging.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Helper shared computation */}
                    {(() => {
                      const batchServings = Math.max(1, (Number(formBatchYieldGrams) || 1) / Math.max(1, Number(formServingSizeGrams) || 1));
                      const garnishNameSet = new Set((formGarnishes || []).map(g => (g.name || '').toLowerCase()));

                      // Cost helpers
                      const getInvCostPerUnit = (name: string, fallbackUnit = 'g') => {
                        const inv = ingredientsInventory.find(i => (i?.name || '').toLowerCase() === name.toLowerCase());
                        const u = inv?.unit || fallbackUnit;
                        const cpu = inv?.costPerUnit ?? (u === 'g' ? 0.05 : u === 'kg' ? 150 : u === 'pcs' ? 15 : u === 'ml' ? 0.08 : 5);
                        return { inv, u, cpu };
                      };

                      const getGarnishEffectiveRate = (g: { name: string; unit?: string; costPerUnit?: number; amount: number }) => {
                        const inv = ingredientsInventory.find(i => (i?.name || '').toLowerCase() === (g.name || '').toLowerCase());
                        const gUnit = (g.unit || 'pcs').toLowerCase();
                        const isVol = gUnit === 'g' || gUnit === 'ml';
                        const rawRate = inv ? (Number(inv.costPerUnit) || 0) : (g.costPerUnit || 0);
                        if (isVol && rawRate > 0) {
                          const iu = (inv?.unit || '').toLowerCase();
                          if (iu === 'g' || iu === 'ml') return { rate: rawRate, inv };
                          if (iu === 'kg' || iu === 'l') return { rate: rawRate / 1000, inv };
                        }
                        return { rate: g.costPerUnit || rawRate || 0, inv };
                      };

                      // Split requirements by category (EXCLUDE garnishes — they live in formGarnishes)
                      const viandItems = formRecipeRequirements.filter(r => !isPackagingRequirement(r.name) && !isRiceRequirement(r.name) && !garnishNameSet.has((r.name || '').toLowerCase()));
                      const riceItems  = formRecipeRequirements.filter(r => isRiceRequirement(r.name));
                      const pkgItems   = formRecipeRequirements.filter(r => isPackagingRequirement(r.name));
                      const garnishItems = (formGarnishes || []).filter(g => g.selected);

                      // Costs per section (requirements are already per-serving portions)
                      const viandCost = viandItems.reduce((acc, req) => {
                        const { inv, u, cpu } = getInvCostPerUnit(req.name || '');
                        const portion = Number(req.amount) || 0;
                        return acc + (u === 'kg' ? portion / 1000 : portion) * cpu;
                      }, 0);
                      const riceCost = riceItems.reduce((acc, req) => {
                        const { inv, u, cpu } = getInvCostPerUnit(req.name || '');
                        const amt = Number(req.amount) || 0;
                        return acc + (u === 'kg' ? amt / 1000 : amt) * cpu;
                      }, 0);
                      const garnishCost = garnishItems.reduce((acc, g) => {
                        const { rate } = getGarnishEffectiveRate(g);
                        return acc + rate * (Number(g.amount) || 1);
                      }, 0);
                      const pkgCost = pkgItems.reduce((acc, req) => {
                        const { inv, cpu } = getInvCostPerUnit(req.name || '', 'pcs');
                        return acc + (Number(req.amount) || 1) * cpu;
                      }, 0);
                      const totalCogs = viandCost + riceCost + garnishCost + pkgCost;

                      // Shared row renderer for viand/rice/pkg
                      const renderReqRow = (req: { name: string; amount: number }, idx: number, isRiceRow = false, isPkgRow = false) => {
                        const reqName = req.name || '';
                        const { inv, u, cpu } = getInvCostPerUnit(reqName);
                        const portion = Number(req.amount) || 0;
                        const factor = u === 'kg' ? portion / 1000 : portion;
                        const cost = factor > 0 ? factor * cpu : 0;
                        return (
                          <div key={idx} className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-white text-[9.5px] font-semibold truncate">{reqName}</span>
                              {!inv && <span className="text-[7.5px] text-brand-red/80 italic shrink-0">Unlinked</span>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-[8.5px] font-mono">
                              <span className="text-gray-500 w-16 text-right">{u === 'kg' ? `${portion}g` : `${portion} ${u}`}</span>
                              <span className="text-gray-400 w-20 text-right">
                                ₱{cpu >= 1 ? cpu.toFixed(2) : cpu.toFixed(3)}/{u}
                              </span>
                              <span className="text-brand-gold font-bold w-14 text-right">₱{cost.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <>
                          {/* Row header labels */}
                          <div className="flex items-center justify-end gap-3 px-1 pb-0.5">
                            <span className="text-[7.5px] text-gray-600 font-bold uppercase tracking-wider w-16 text-right">Portion</span>
                            <span className="text-[7.5px] text-gray-600 font-bold uppercase tracking-wider w-20 text-right">Unit Cost</span>
                            <span className="text-[7.5px] text-gray-600 font-bold uppercase tracking-wider w-14 text-right">Cost/Serving</span>
                          </div>

                          {/* ── Viand Card ── */}
                          {viandItems.length > 0 && (
                            <div className="bg-[#121211] rounded-xl border border-amber-500/20 overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 bg-amber-500/5 border-b border-amber-500/15">
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">🥩 Viand</span>
                                  <span className="text-[8.5px] text-gray-400 font-mono">
                                    {viandItems.length} ingredient{viandItems.length !== 1 ? 's' : ''} (per-serving plate portion)
                                  </span>
                                </div>
                                <span className="text-amber-400 font-mono font-black text-[9px]">₱{viandCost.toFixed(2)}</span>
                              </div>
                              <div className="px-3 py-1.5">
                                {viandItems.map((req, idx) => renderReqRow(req, idx))}
                              </div>
                            </div>
                          )}

                          {/* ── Rice Card ── */}
                          {riceItems.length > 0 && (
                            <div className="bg-[#121211] rounded-xl border border-emerald-500/20 overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/5 border-b border-emerald-500/15">
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">🍚 Rice</span>
                                  <span className="text-[8.5px] text-gray-400 font-mono">per-serving portion</span>
                                </div>
                                <span className="text-emerald-400 font-mono font-black text-[9px]">₱{riceCost.toFixed(2)}</span>
                              </div>
                              <div className="px-3 py-1.5">
                                {riceItems.map((req, idx) => renderReqRow(req, idx, true))}
                              </div>
                            </div>
                          )}

                          {/* ── Garnish Card (from formGarnishes — always accurate) ── */}
                          {garnishItems.length > 0 && (
                            <div className="bg-[#121211] rounded-xl border border-purple-500/20 overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 bg-purple-500/5 border-b border-purple-500/15">
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded">🍽️ Garnishes & Sides</span>
                                  <span className="text-[8px] text-purple-400/60 font-medium">added directly per plate</span>
                                </div>
                                <span className="text-purple-300 font-mono font-black text-[9px]">₱{garnishCost.toFixed(2)}</span>
                              </div>
                              <div className="px-3 py-1.5">
                                {garnishItems.map((g, gIdx) => {
                                  const { rate, inv } = getGarnishEffectiveRate(g);
                                  const plateCost = rate * (Number(g.amount) || 1);
                                  const dispUnit = g.unit || inv?.unit || 'pcs';
                                  return (
                                    <div key={gIdx} className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-white text-[9.5px] font-semibold truncate">{g.name}</span>
                                        {!inv && <span className="text-[7.5px] text-purple-400/60 italic shrink-0">Std. rate</span>}
                                      </div>
                                      <div className="flex items-center gap-3 shrink-0 text-[8.5px] font-mono">
                                        <span className="text-gray-500 w-16 text-right">{Number(g.amount) || 1} {g.unit || 'pcs'}</span>
                                        <span className="text-gray-400 w-20 text-right">
                                          ₱{rate >= 1 ? rate.toFixed(2) : rate.toFixed(3)}/{dispUnit}
                                        </span>
                                        <span className="text-purple-300 font-bold w-14 text-right">₱{plateCost.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* ── Packaging Card ── */}
                          {pkgItems.length > 0 && (
                            <div className="bg-[#121211] rounded-xl border border-blue-500/20 overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 bg-blue-500/5 border-b border-blue-500/15">
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded">📦 Packaging</span>
                                  <span className="text-[8.5px] text-gray-400 font-mono">per-plate items</span>
                                </div>
                                <span className="text-blue-400 font-mono font-black text-[9px]">₱{pkgCost.toFixed(2)}</span>
                              </div>
                              <div className="px-3 py-1.5">
                                {pkgItems.map((req, idx) => renderReqRow(req, idx, false, true))}
                              </div>
                            </div>
                          )}

                          {/* ── Total COGS Footer ── */}
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-brand-gold/5 border border-brand-gold/20 text-[9px]">
                            <div className="flex items-center gap-3 text-gray-400 font-mono flex-wrap text-[8.5px]">
                              {viandCost > 0 && <span>🥩 <b className="text-amber-300">₱{viandCost.toFixed(2)}</b></span>}
                              {riceCost > 0 && <span>🍚 <b className="text-emerald-300">₱{riceCost.toFixed(2)}</b></span>}
                              {garnishCost > 0 && <span>🍽️ <b className="text-purple-300">₱{garnishCost.toFixed(2)}</b></span>}
                              {pkgCost > 0 && <span>📦 <b className="text-blue-300">₱{pkgCost.toFixed(2)}</b></span>}
                            </div>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-gray-400 uppercase text-[8px] tracking-wider">Total COGS / Serving:</span>
                              <span className="text-brand-gold text-xs font-mono font-black">₱{totalCogs.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-gray-400 px-1 font-medium">
                            <span>💡 Viand portions are auto-divided by batch servings. Garnishes are always per-plate.</span>
                            <button
                              type="button"
                              onClick={handleSendRecipeFormToBatchCalc}
                              className="text-brand-gold hover:underline font-bold cursor-pointer"
                            >
                              Open Bulk Calculator →
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                 )}
              </div>


              {/* Target Margin & Profit Calculator Card */}
              <div className="bg-[#0D0D0C]/60 p-4 rounded-2xl border border-brand-gold/20 space-y-3 text-left">
                {(() => {
                  let modalCogs = 0;
                  if (formRecipeRequirements.length > 0) {
                    formRecipeRequirements.forEach((req) => {
                      const rName = req?.name || '';
                      const invItem = ingredientsInventory.find(i => (i?.name || '').toLowerCase() === rName.toLowerCase());
                      const u = invItem?.unit || 'g';
                      const costPerUnit = invItem?.costPerUnit ?? (u === 'g' ? 0.05 : u === 'kg' ? 150 : u === 'pcs' ? 15 : u === 'ml' ? 0.08 : 5);
                      const reqAmt = Number(req?.amount) || 0;
                      const factor = u === 'kg' ? reqAmt / 1000 : reqAmt;
                      modalCogs += factor * costPerUnit;
                    });
                  } else {
                    modalCogs = (Number(formPrice) || 0) * 0.35;
                  }

                  const targetMarginNum = Number(formTargetMargin) || 0;
                  const recPrice = targetMarginNum < 100 && targetMarginNum > 0
                    ? modalCogs / (1 - targetMarginNum / 100)
                    : modalCogs * 2;
                  const actualPrice = Number(formPrice) || 0;
                  const targetProfit = recPrice - modalCogs;
                  const actualProfit = actualPrice - modalCogs;
                  const actualMargin = actualPrice > 0 ? (actualProfit / actualPrice) * 100 : 0;

                  const handleMarginChange = (newMargin: number | '') => {
                    if (newMargin === '') {
                      setFormTargetMargin('');
                      return;
                    }
                    const validMargin = Math.min(95, Math.max(5, newMargin));
                    setFormTargetMargin(validMargin);
                    if (modalCogs > 0 && validMargin > 0 && validMargin < 100) {
                      const computedPrice = Math.ceil(modalCogs / (1 - validMargin / 100));
                      setFormPrice(computedPrice);
                    }
                  };

                  const handlePriceChange = (newPrice: number | '') => {
                    if (newPrice === '') {
                      setFormPrice('');
                      return;
                    }
                    setFormPrice(newPrice);
                    if (modalCogs > 0 && newPrice > modalCogs) {
                      const computedMargin = Math.min(95, Math.max(5, Math.round(((newPrice - modalCogs) / newPrice) * 100)));
                      setFormTargetMargin(computedMargin);
                    }
                  };

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-[10px] text-brand-gold uppercase tracking-wider font-extrabold flex items-center gap-1">
                            <span>📈 Profit Margin & Selling Strategy</span>
                          </label>
                          <span className="text-[9px] text-gray-400 block">Set your base price or target margin % to auto-compute all profit and recommended pricing metrics.</span>
                        </div>
                        <span className="font-mono text-xs font-black text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-lg border border-brand-gold/30">
                          Target: {Number(formTargetMargin) || 0}%
                        </span>
                      </div>

                      {/* Slider & Presets */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="10"
                            max="90"
                            step="1"
                            value={formTargetMargin === '' ? 50 : formTargetMargin}
                            onChange={(e) => handleMarginChange(Number(e.target.value))}
                            className="flex-1 accent-brand-gold cursor-pointer"
                          />
                          <div className="relative w-20 shrink-0">
                            <input
                              type="number"
                              min="5"
                              max="95"
                              value={formTargetMargin}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleMarginChange(v === '' ? '' : Number(v));
                              }}
                              onBlur={() => {
                                if (formTargetMargin === '') setFormTargetMargin(50);
                              }}
                              className="w-full bg-[#121211] border border-white/10 rounded-lg pr-5 pl-2 py-1 text-xs text-white text-right font-mono font-bold"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-gray-400 font-bold">%</span>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider">Presets:</span>
                          {[35, 45, 50, 60, 70, 75].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleMarginChange(preset)}
                              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                formTargetMargin === preset
                                  ? 'bg-brand-gold text-black font-black'
                                  : 'bg-[#181818] text-gray-400 border border-white/5 hover:text-white'
                              }`}
                            >
                              {preset}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Real-time Calculation Readout & Selling Price Input */}
                      <div className="bg-[#121211] p-3.5 rounded-xl border border-white/10 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[10px] text-left items-center">
                          <div>
                            <span className="text-gray-500 text-[8px] uppercase font-bold block">Recipe COGS</span>
                            <span className="font-mono text-gray-200 font-bold text-xs">₱{modalCogs.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-[8px] uppercase font-bold block">Est. Profit</span>
                            <span className="font-mono text-green-400 font-bold text-xs">₱{actualProfit.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-[8px] uppercase font-bold block">Rec. Price</span>
                            <span className="font-mono text-brand-gold font-bold text-xs">₱{recPrice.toFixed(2)}</span>
                          </div>
                          <div className="space-y-1 bg-brand-gold/5 p-2 rounded-lg border border-brand-gold/20">
                            <label className="text-brand-gold text-[8px] uppercase font-black block">Base Price (₱) *</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-xs text-brand-gold font-bold">₱</span>
                              <input
                                type="number"
                                required
                                min="5"
                                max="9999"
                                step="any"
                                value={formPrice}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  handlePriceChange(v === '' ? '' : Number(v));
                                }}
                                onBlur={() => {
                                  if (formPrice === '') setFormPrice(0);
                                }}
                                placeholder="149"
                                className="w-full bg-[#0D0D0C] border border-brand-gold/40 rounded-lg pl-6 pr-2 py-1 text-xs text-white focus:outline-none focus:border-brand-gold font-mono font-bold text-right"
                              />
                            </div>
                            <span className="text-[7.5px] text-gray-400 font-bold block text-right truncate">
                              Margin: <strong className="text-brand-gold">{actualMargin.toFixed(1)}%</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-[9px] text-gray-400">
                            Target <strong className="text-brand-gold">{Number(formTargetMargin) || 0}% Margin</strong> Rec. Price: <span className="font-mono text-white font-bold">₱{recPrice.toFixed(2)}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMarginChange(Number(formTargetMargin) || 50)}
                            className="px-3 py-1 bg-brand-gold hover:bg-brand-gold/80 text-black text-[9px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md hover:scale-105"
                          >
                            Apply Rec. Price (₱{Math.ceil(recPrice)})
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Quick Launch Profit Simulator for this dish */}
              <div className="bg-[#0D0D0C]/80 p-3.5 rounded-2xl border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 uppercase font-black tracking-wider block">
                      Smart Profit & Overhead Simulator
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">
                      Forecast daily, weekly, monthly, yearly, and custom day profit less raw COGS & kitchen overheads.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (editingItem) {
                      setSelectedProfitMenuItemId(editingItem.id);
                    }
                    setIsProfitCalcModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Launch Simulator</span>
                </button>
              </div>

              {/* Customizable Option Groups & Choice Variations Editor */}
              <div className="space-y-4 bg-[#0D0D0C]/40 p-4 rounded-2xl border border-white/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">Custom Options & Choices</label>
                    <span className="text-[9px] text-gray-500 font-medium block">Default rice is Plain Rice & Garlic Rice with ₱0 cost, with optional extra rice choices.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Filter out any previous rice groups and add separate Included Rice and Extra Rice groups
                        const nonRice = formCustomOptions.filter(opt => !opt.title.toLowerCase().includes('rice'));
                        setFormCustomOptions([
                          ...nonRice,
                          {
                            id: 'opt-' + Math.random().toString(36).substr(2, 4),
                            title: 'Rice (Included with Meal)',
                            choices: [
                              { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: 'Garlic Rice', price: 0 },
                              { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: 'Plain Rice', price: 0 },
                              { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: 'Java Rice', price: 20 },
                            ]
                          },
                          {
                            id: 'opt-' + Math.random().toString(36).substr(2, 4),
                            title: 'Extra Rice (Add-on)',
                            choices: [
                              { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: 'No Extra Rice', price: 0 },
                              { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: '+1 Extra Plain Rice', price: 15 },
                              { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: '+1 Extra Garlic Rice', price: 20 },
                              { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: '+1 Extra Java Rice', price: 25 },
                            ]
                          }
                        ]);
                      }}
                      className="px-2.5 py-1 bg-brand-gold/10 hover:bg-brand-gold hover:text-black border border-brand-gold/40 text-brand-gold text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all focus:outline-none shadow-sm cursor-pointer"
                      title="Set standard Rice options: Included Rice (Plain, Garlic, Java Upgrade) and Extra Rice Add-ons"
                    >
                      <span>🍚</span> Default Rice (Included & Extra Add-on)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormCustomOptions([
                          ...formCustomOptions,
                          {
                            id: 'opt-' + Math.random().toString(36).substr(2, 4),
                            title: '',
                            choices: [
                              { id: 'ch-' + Math.random().toString(36).substr(2, 4), name: '', price: 0 }
                            ]
                          }
                        ]);
                      }}
                      className="px-2.5 py-1 bg-[#181818] border border-white/10 hover:border-brand-gold text-white text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 transition-all focus:outline-none cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-brand-gold" /> Add Option Group
                    </button>
                  </div>
                </div>

                {formCustomOptions.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-600 italic">
                    No custom option groups configured. (Customer will buy the item standard with no choice dialog popups)
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formCustomOptions.map((optGroup, optIdx) => (
                      <div key={optGroup.id || optIdx} className="bg-[#121211] p-3 rounded-xl border border-white/5 space-y-3 relative">
                        {/* Remove entire option group */}
                        <button
                          type="button"
                          onClick={() => {
                            setFormCustomOptions(formCustomOptions.filter((_, i) => i !== optIdx));
                          }}
                          className="absolute top-3 right-3 text-gray-500 hover:text-brand-red p-1 rounded-md hover:bg-brand-red/5 transition-all"
                          title="Delete Option Group"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        {/* Option Group Title */}
                        <div className="space-y-1 w-[85%]">
                          <label className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">Option Group Title *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Rice, Egg Style, Sauce Choice"
                            value={optGroup.title}
                            onChange={(e) => {
                              const newOpts = [...formCustomOptions];
                              newOpts[optIdx].title = e.target.value;
                              setFormCustomOptions(newOpts);
                            }}
                            className="w-full bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-red font-bold"
                          />
                        </div>

                        {/* Choice items inside the group */}
                        <div className="space-y-2 pl-2 border-l-2 border-white/5">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wide">Choices & Variations</span>
                              {optGroup.title.toLowerCase().includes('rice') && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newOpts = [...formCustomOptions];
                                      if (!newOpts[optIdx].choices.some(c => c.name.toLowerCase().includes('java'))) {
                                        newOpts[optIdx].choices.push({
                                          id: 'ch-' + Math.random().toString(36).substr(2, 4),
                                          name: 'Java Rice',
                                          price: 20
                                        });
                                        setFormCustomOptions(newOpts);
                                      }
                                    }}
                                    className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold text-gray-400 font-bold transition-all cursor-pointer"
                                  >
                                    + Java Rice (+₱20)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newOpts = [...formCustomOptions];
                                      if (!newOpts[optIdx].choices.some(c => c.name.toLowerCase().includes('extra'))) {
                                        newOpts[optIdx].choices.push({
                                          id: 'ch-' + Math.random().toString(36).substr(2, 4),
                                          name: 'Extra Rice',
                                          price: 15
                                        });
                                        setFormCustomOptions(newOpts);
                                      }
                                    }}
                                    className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold text-gray-400 font-bold transition-all cursor-pointer"
                                  >
                                    + Extra Rice (+₱15)
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newOpts = [...formCustomOptions];
                                newOpts[optIdx].choices.push({
                                  id: 'ch-' + Math.random().toString(36).substr(2, 4),
                                  name: '',
                                  price: 0
                                });
                                setFormCustomOptions(newOpts);
                              }}
                              className="text-[8px] text-brand-gold hover:underline font-black uppercase tracking-wider cursor-pointer"
                            >
                              + Add Choice
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            {optGroup.choices.map((choice, choiceIdx) => (
                              <div key={choice.id || choiceIdx} className="flex items-center gap-2">
                                {/* Choice Name */}
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Garlic Fried Rice, Large Size"
                                    value={choice.name}
                                    onChange={(e) => {
                                      const newOpts = [...formCustomOptions];
                                      newOpts[optIdx].choices[choiceIdx].name = e.target.value;
                                      setFormCustomOptions(newOpts);
                                    }}
                                    className="w-full bg-[#0D0D0C] border border-white/5 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-brand-red font-semibold"
                                  />
                                </div>

                                {/* Price Adjustment */}
                                <div className="w-24">
                                  <div className="relative">
                                    <span className="absolute left-2 top-1 text-[9px] text-gray-500 font-bold">₱</span>
                                    <input
                                      type="number"
                                      required
                                      placeholder="0"
                                      value={choice.price}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        const newOpts = [...formCustomOptions];
                                        newOpts[optIdx].choices[choiceIdx].price = v === '' ? ('' as any) : Number(v);
                                        setFormCustomOptions(newOpts);
                                      }}
                                      onBlur={() => {
                                        if ((choice.price as any) === '') {
                                          const newOpts = [...formCustomOptions];
                                          newOpts[optIdx].choices[choiceIdx].price = 0;
                                          setFormCustomOptions(newOpts);
                                        }
                                      }}
                                      className="w-full bg-[#0D0D0C] border border-white/5 rounded-lg pl-5 pr-2 py-1 text-[11px] text-white focus:outline-none focus:border-brand-red font-mono font-bold"
                                    />
                                  </div>
                                </div>

                                {/* Delete Choice */}
                                <button
                                  type="button"
                                  disabled={optGroup.choices.length <= 1}
                                  onClick={() => {
                                    const newOpts = [...formCustomOptions];
                                    newOpts[optIdx].choices = newOpts[optIdx].choices.filter((_, i) => i !== choiceIdx);
                                    setFormCustomOptions(newOpts);
                                  }}
                                  className="p-1 text-gray-500 hover:text-brand-red disabled:opacity-30 disabled:hover:text-gray-500"
                                  title="Delete Choice"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>



              {/* Image Section: Upload File, Presets & Direct URL */}
              <div className="space-y-3 bg-[#0D0D0C]/40 p-4 rounded-2xl border border-white/5 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">
                    📸 Mouthwatering Dish Photo *
                  </label>
                  {formImage && (
                    <span className="text-[9px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {formImage.startsWith('data:') ? '📁 Local Uploaded Image File' : '🌐 Image URL / Preset'}
                    </span>
                  )}
                </div>

                {/* Image Upload Button & Live Thumbnail Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* Upload Trigger Dropzone / Button */}
                  <label className="flex flex-col items-center justify-center p-4 bg-[#0D0D0C] border-2 border-dashed border-brand-gold/40 hover:border-brand-gold hover:bg-brand-gold/5 rounded-2xl cursor-pointer text-center group transition-all">
                    <Upload className="w-5 h-5 text-brand-gold mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">Upload Custom Photo</span>
                    <span className="text-[9px] text-gray-500 font-medium mt-0.5">Click to choose PNG, JPG, or WebP file from device</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const compressedDataUrl = await new Promise<string>((resolve) => {
                              const reader = new FileReader();
                              reader.readAsDataURL(file);
                              reader.onload = (event) => {
                                const img = new Image();
                                img.src = event.target?.result as string;
                                img.onload = () => {
                                  let width = img.width;
                                  let height = img.height;
                                  const maxDim = 800;
                                  if (width > height) {
                                    if (width > maxDim) {
                                      height = Math.round((height * maxDim) / width);
                                      width = maxDim;
                                    }
                                  } else {
                                    if (height > maxDim) {
                                      width = Math.round((width * maxDim) / height);
                                      height = maxDim;
                                    }
                                  }
                                  const canvas = document.createElement('canvas');
                                  canvas.width = width;
                                  canvas.height = height;
                                  const ctx = canvas.getContext('2d');
                                  if (!ctx) {
                                    resolve(event.target?.result as string);
                                    return;
                                  }
                                  ctx.drawImage(img, 0, 0, width, height);
                                  resolve(canvas.toDataURL('image/jpeg', 0.82));
                                };
                                img.onerror = () => resolve(event.target?.result as string);
                              };
                              reader.onerror = () => resolve('');
                            });
                            if (compressedDataUrl) {
                              setFormOriginalImage(compressedDataUrl);
                              setFormImage(compressedDataUrl);
                              handleOpenCropper(compressedDataUrl);
                            }
                          } catch (err) {
                            console.error("Failed to compress image", err);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {/* Live Image Preview Card */}
                  {formImage ? (
                    <div className="relative h-28 rounded-2xl overflow-hidden border-2 border-white/10 bg-[#121211] group">
                      <img
                        src={formImage}
                        alt="Dish Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenCropper(formImage)}
                          className="px-2.5 py-1 bg-brand-gold hover:bg-brand-gold/80 text-black text-[9px] font-black uppercase rounded-lg shadow-md transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Crop className="w-3 h-3" /> Edit Crop & Zoom
                        </button>
                        {formOriginalImage && formImage !== formOriginalImage && (
                          <button
                            type="button"
                            onClick={() => setFormImage(formOriginalImage)}
                            className="px-2.5 py-1 bg-[#181818] border border-brand-gold/40 hover:border-brand-gold text-brand-gold hover:text-white text-[9px] font-black uppercase rounded-lg shadow-md transition-all flex items-center gap-1 cursor-pointer"
                            title="Revert to original uncropped image"
                          >
                            <RotateCcw className="w-3 h-3 text-brand-gold" /> Revert Original
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setFormImage('');
                            setFormOriginalImage('');
                          }}
                          className="px-2.5 py-1 bg-brand-red hover:bg-brand-red/80 text-white text-[9px] font-black uppercase rounded-lg shadow-md transition-all cursor-pointer"
                        >
                          Clear Photo
                        </button>
                      </div>
                      <span className="absolute bottom-1.5 left-2 text-[8px] bg-black/70 text-gray-300 font-mono px-2 py-0.5 rounded backdrop-blur-md">
                        Live Preview
                      </span>
                    </div>
                  ) : (
                    <div className="h-28 rounded-2xl border border-dashed border-white/10 bg-[#0D0D0C] flex flex-col items-center justify-center text-gray-600 space-y-1">
                      <ImageIcon className="w-6 h-6 text-gray-600" />
                      <span className="text-[10px] font-medium">No photo selected yet</span>
                    </div>
                  )}
                </div>

                {/* Preset Visual Mockups */}
                <div className="space-y-1 pt-1">
                  <span className="text-[8px] text-gray-500 font-bold block uppercase tracking-wide">Or choose a preset visual mockup:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {IMAGE_PRESETS.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => {
                          setFormImage(preset.url);
                          setFormOriginalImage(preset.url);
                        }}
                        className={`p-1.5 rounded-lg bg-[#0D0D0C] border text-left flex items-center gap-2 truncate hover:border-brand-gold transition-all ${
                          formImage === preset.url ? 'border-brand-gold text-brand-gold' : 'border-white/5 text-gray-400'
                        }`}
                      >
                        <img src={preset.url} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                        <span className="text-[8px] font-black uppercase truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direct Image URL fallback input */}
                <div className="space-y-1 pt-1">
                  <label className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block">Or paste web image URL:</label>
                  <input
                    type="text"
                    required
                    value={formImage}
                    onChange={(e) => {
                      setFormImage(e.target.value);
                      setFormOriginalImage(e.target.value);
                    }}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
                  />
                </div>
              </div>

              {/* Checkbox triggers */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setFormSpicy(!formSpicy)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    formSpicy ? 'bg-brand-red/10 border-brand-red text-white' : 'bg-[#0D0D0C] border-white/5 text-gray-400'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">🌶️ Spicy Flavor</span>
                  <span className="text-xs font-black">{formSpicy ? 'YES' : 'NO'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormPopular(!formPopular)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    formPopular ? 'bg-blue-600/10 border-blue-600 text-white' : 'bg-[#0D0D0C] border-white/5 text-gray-400'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">⭐ Highlight Popular</span>
                  <span className="text-xs font-black">{formPopular ? 'YES' : 'NO'}</span>
                </button>
              </div>

              {/* Submit panel */}
              <div className="pt-4 border-t border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-3 bg-[#0D0D0C] border border-white/10 hover:bg-[#222222] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand-red hover:bg-brand-red-hover text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-brand-red/20"
                >
                  {editingItem ? 'Publish Updates' : 'Add Recipe'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* --- STANDALONE BATCH YIELD & GRAMS PORTION CALCULATOR MODAL --- */}
      {isBatchCalcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#181818] border-2 border-brand-gold/30 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl w-full max-w-4xl lg:max-w-5xl flex flex-col max-h-[92vh] animate-slide-in-up">
            
            {/* Header */}
            <div className="p-5 border-b-2 border-white/5 bg-[#0D0D0C] flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-brand-gold">
                <div className="p-2 rounded-xl bg-brand-gold/15 border border-brand-gold/30">
                  <Scale className="w-5 h-5 text-brand-gold" />
                </div>
                <div>
                  <h4 className="font-display font-black text-white text-base uppercase tracking-tight flex items-center gap-2">
                    Commercial Viand Batch & Steamed Rice Plate Costing Calculator
                  </h4>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Produce bulk cooked viand/meat batches (1kg or 2kg), portion in grams (80g, 90g), cost steamed rice separately, and calculate complete meal plate profitability.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchCalcModalOpen(false)}
                className="p-2 rounded-lg hover:bg-[#222222] text-gray-500 hover:text-white transition-all focus:outline-none border border-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              
              {/* Recipe & Ingredients Loader / Template Manager */}
              <div className="bg-[#121211] border border-brand-gold/30 p-4 rounded-2xl space-y-3 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-brand-gold uppercase font-black tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-brand-gold" />
                      <span>Saved Recipe & Menu Dish Vault</span>
                    </span>
                    <span className="text-[9.5px] text-gray-400 block">
                      Select any recipe to instantly display its ingredients, portions, and batch costs:
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleOpenFreshBatchCalculator}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      title="Clear all fields and start a fresh, blank batch calculation"
                    >
                      <Plus className="w-3 h-3 text-brand-gold" />
                      <span>✨ Start Fresh</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleUpdateSelectedRecipe}
                      className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/40 font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      title="Update the currently loaded recipe or template with new amounts and ingredients"
                    >
                      <RefreshCw className="w-3 h-3 text-blue-400" />
                      <span>🔄 Update This Saved Recipe</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsSavingTemplatePrompt(!isSavingTemplatePrompt)}
                      className="px-3 py-1.5 rounded-xl bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold border border-brand-gold/40 font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      title="Save current batch ingredients and proportions as a reusable recipe template"
                    >
                      <Save className="w-3.5 h-3.5 text-brand-gold" />
                      <span>💾 Save Batch as Template</span>
                    </button>
                  </div>
                </div>

                {/* Inline Save Template Prompt */}
                {isSavingTemplatePrompt && (
                  <div className="bg-[#181818] p-3 rounded-xl border border-brand-gold/40 flex flex-col sm:flex-row items-center gap-2 animate-fade-in">
                    <div className="flex-1 w-full">
                      <label className="text-[8.5px] text-gray-400 uppercase font-black tracking-wider block mb-1">
                        Recipe Template Name
                      </label>
                      <input
                        type="text"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder={`e.g. ${standaloneRecipeName || 'Custom Dish'} (Batch Template)`}
                        className="w-full bg-[#121211] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-4 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveCurrentBatchAsTemplate(newTemplateName)}
                        className="px-3 py-1.5 rounded-lg bg-brand-gold text-black font-black text-[9px] uppercase tracking-wider hover:bg-brand-gold-hover transition-all cursor-pointer"
                      >
                        Confirm Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSavingTemplatePrompt(false);
                          setNewTemplateName('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#222222] text-gray-400 font-bold text-[9px] uppercase hover:text-white transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Instant-Load Selector */}
                <div>
                  <select
                    value={selectedRecipeToLoad}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedRecipeToLoad(val);
                      handleLoadRecipeIntoBatch(val);
                    }}
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="">-- Choose a Saved Recipe or Menu Dish to Display --</option>
                    <option value="__fresh__">✨ Start Fresh / Blank Recipe</option>
                    {savedRecipeTemplates.length > 0 && (
                      <optgroup label="📋 Saved Recipe Templates">
                        {savedRecipeTemplates.map((tmpl) => (
                          <option key={tmpl.id} value={`template:${tmpl.id}`}>
                            {tmpl.name} ({tmpl.batchYieldGrams}g batch / {tmpl.servingSizeGrams}g portion)
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {menuItems.length > 0 && (
                      <optgroup label="🍱 Active Menu Dishes">
                        {menuItems.map((dish) => (
                          <option key={dish.id} value={`dish:${dish.id}`}>
                            {dish.name} (₱{dish.price})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>
              {/* Recipe Title, Unit Switcher & Batch Parameters */}
              <div className="space-y-3">
                {/* Unit Mode Selector Tab */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#121211] p-3 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-300 uppercase font-black tracking-wider flex items-center gap-1.5">
                      <span className="text-brand-gold text-sm">⚙️</span>
                      <span>Batch Calculation Unit Mode:</span>
                    </span>
                    <span className="text-[9px] text-gray-500">
                      {standaloneBatchUnit === 'pcs' ? '(Piece-counted items like Lumpiang Shanghai, Siomai, Wings)' : '(Weight-based meats like Sisig, Tapa, Teriyaki)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-[#0D0D0C] p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setStandaloneBatchUnit('g');
                        if (standaloneBatchWeight === 100 || standaloneBatchWeight === 60 || standaloneBatchWeight === 50 || standaloneBatchWeight === 120) {
                          setStandaloneBatchWeight(2000);
                        }
                        if (standaloneServingGrams === 4 || standaloneServingGrams === 5 || standaloneServingGrams === 6 || standaloneServingGrams === 3) {
                          setStandaloneServingGrams(90);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                        standaloneBatchUnit === 'g'
                          ? 'bg-brand-gold text-black shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>⚖️ Weight (Grams / kg)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStandaloneBatchUnit('pcs');
                        if (standaloneBatchWeight === 2000 || standaloneBatchWeight === 1000 || standaloneBatchWeight === 3000 || standaloneBatchWeight === 5000) {
                          setStandaloneBatchWeight(100);
                        }
                        if (standaloneServingGrams === 90 || standaloneServingGrams === 80 || standaloneServingGrams === 70 || standaloneServingGrams === 100) {
                          setStandaloneServingGrams(4);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                        standaloneBatchUnit === 'pcs'
                          ? 'bg-brand-gold text-black shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>🔢 Pieces (pcs / Count)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Recipe Name */}
                  <div className="space-y-1.5 bg-[#0D0D0C] p-3.5 rounded-2xl border border-white/5">
                    <label className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">
                      Viand / Dish Title
                    </label>
                    <input
                      type="text"
                      value={standaloneRecipeName}
                      onChange={(e) => setStandaloneRecipeName(e.target.value)}
                      placeholder={standaloneBatchUnit === 'pcs' ? "e.g. Crispy Lumpiang Shanghai" : "e.g. Garlic Pork Tapa Bento"}
                      className="w-full bg-[#121211] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-brand-gold"
                    />
                    <span className="text-[8.5px] text-gray-500 block">Name of the menu item you are producing.</span>
                  </div>

                  {/* Batch Yield (Weight or Pieces) */}
                  <div className="space-y-2 bg-[#0D0D0C] p-3.5 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">
                        {standaloneBatchUnit === 'pcs' ? '1. Viand Batch Yield (Total Pieces)' : '1. Viand Batch Yield (Meat Only)'}
                      </label>
                      <span className="text-xs font-mono font-black text-brand-gold">
                        {standaloneBatchUnit === 'pcs'
                          ? `${Number(standaloneBatchWeight) || 0} pcs`
                          : `${((Number(standaloneBatchWeight) || 0) / 1000).toFixed(2)} kg`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        step={standaloneBatchUnit === 'pcs' ? "1" : "50"}
                        value={standaloneBatchWeight}
                        onChange={(e) => {
                          const v = e.target.value;
                          setStandaloneBatchWeight(v === '' ? '' : Number(v));
                        }}
                        onBlur={() => {
                          if (standaloneBatchWeight === '' || Number(standaloneBatchWeight) < 1) {
                            setStandaloneBatchWeight(standaloneBatchUnit === 'pcs' ? 100 : 2000);
                          }
                        }}
                        className="flex-1 bg-[#121211] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold text-right focus:outline-none focus:border-brand-gold"
                      />
                      <span className="text-[10px] text-gray-500 font-bold uppercase">
                        {standaloneBatchUnit === 'pcs' ? 'pieces (pcs)' : 'grams (g)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      {standaloneBatchUnit === 'pcs' ? (
                        [
                          { label: '30 pcs', val: 30 },
                          { label: '50 pcs', val: 50 },
                          { label: '60 pcs', val: 60 },
                          { label: '100 pcs (Shanghai)', val: 100 },
                          { label: '120 pcs', val: 120 },
                          { label: '200 pcs', val: 200 }
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setStandaloneBatchWeight(item.val)}
                            className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all ${
                              standaloneBatchWeight === item.val
                                ? 'bg-brand-gold text-black font-black'
                                : 'bg-[#181818] text-gray-400 border border-white/5 hover:text-white'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))
                      ) : (
                        [
                          { label: '1 Kilo (1,000g)', val: 1000 },
                          { label: '2 Kilo (2,000g)', val: 2000 },
                          { label: '3 Kilo (3,000g)', val: 3000 },
                          { label: '5 Kilo (5,000g)', val: 5000 }
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setStandaloneBatchWeight(item.val)}
                            className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all ${
                              standaloneBatchWeight === item.val
                                ? 'bg-brand-gold text-black font-black'
                                : 'bg-[#181818] text-gray-400 border border-white/5 hover:text-white'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Serving Portion in Grams or Pieces */}
                  <div className="space-y-2 bg-[#0D0D0C] p-3.5 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] text-gray-400 uppercase font-black tracking-wider block">
                        {standaloneBatchUnit === 'pcs' ? '2. Viand Portion per Plate (Pieces Count)' : '2. Viand Portion per Plate (Meat Only)'}
                      </label>
                      <span className="text-xs font-mono font-black text-brand-gold">
                        {Number(standaloneServingGrams) || 0} {standaloneBatchUnit === 'pcs' ? 'pcs' : 'grams'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        step={standaloneBatchUnit === 'pcs' ? "1" : "5"}
                        value={standaloneServingGrams}
                        onChange={(e) => {
                          const v = e.target.value;
                          setStandaloneServingGrams(v === '' ? '' : Number(v));
                        }}
                        onBlur={() => {
                          if (standaloneServingGrams === '' || Number(standaloneServingGrams) < 1) {
                            setStandaloneServingGrams(standaloneBatchUnit === 'pcs' ? 4 : 90);
                          }
                        }}
                        className="flex-1 bg-[#121211] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold text-right focus:outline-none focus:border-brand-gold"
                      />
                      <span className="text-[10px] text-gray-500 font-bold uppercase">
                        {standaloneBatchUnit === 'pcs' ? 'pcs / plate' : 'grams / plate'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 pt-1 flex-wrap">
                      {standaloneBatchUnit === 'pcs' ? (
                        [
                          { label: '3 pcs', val: 3 },
                          { label: '4 pcs (Standard)', val: 4 },
                          { label: '5 pcs', val: 5 },
                          { label: '6 pcs (Bento)', val: 6 },
                          { label: '8 pcs', val: 8 },
                          { label: '10 pcs', val: 10 }
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setStandaloneServingGrams(item.val)}
                            className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all ${
                              standaloneServingGrams === item.val
                                ? 'bg-brand-gold text-black font-black'
                                : 'bg-[#181818] text-gray-400 border border-white/5 hover:text-white'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))
                      ) : (
                        [
                          { label: '70g', val: 70 },
                          { label: '80g (Sample 1)', val: 80 },
                          { label: '90g (Sample 2)', val: 90 },
                          { label: '100g', val: 100 },
                          { label: '120g', val: 120 },
                          { label: '150g', val: 150 }
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setStandaloneServingGrams(item.val)}
                            className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all ${
                              standaloneServingGrams === item.val
                                ? 'bg-brand-gold text-black font-black'
                                : 'bg-[#181818] text-gray-400 border border-white/5 hover:text-white'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Materials Ingredients Table for the Batch */}
              <div className="bg-[#0D0D0C] p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="font-display font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <span className="text-brand-gold">🥩</span>
                      <span>Viand Raw Materials for the {standaloneBatchUnit === 'pcs' ? `${standaloneBatchWeight} pcs` : `${((Number(standaloneBatchWeight) || 0) / 1000).toFixed(1)}kg`} Batch ({standaloneIngredients.length} Ingredients)</span>
                    </h5>
                    <div className="flex items-center gap-2 text-[9px] text-gray-400 font-medium mt-0.5 flex-wrap">
                      <span className="text-gray-500">Plate Recipe Breakdown:</span>
                      <span className="text-amber-400 font-bold">🥩 {standaloneIngredients.length} Viand Ingredients</span>
                      <span className="text-gray-600">+</span>
                      <span className="text-emerald-400 font-bold">🍚 {standaloneIncludeRice ? '1 Steamed Rice' : 'No Rice'}</span>
                      <span className="text-gray-600">+</span>
                      <span className="text-amber-300 font-bold">🍳 {standaloneIncludeGarnishes ? `${standaloneSelectedGarnishes.filter(g => g.selected).length} Garnishes/Toppings` : 'No Garnishes'}</span>
                      <span className="text-gray-600">+</span>
                      <span className="text-blue-400 font-bold">📦 {standaloneIncludePackaging ? `${standaloneSelectedPackaging.filter(p => p.selected).length} Packaging Items` : 'No Packaging'}</span>
                      <span className="text-gray-600">=</span>
                      <span className="text-brand-gold font-bold">
                        {standaloneIngredients.length + (standaloneIncludeRice ? 1 : 0) + (standaloneIncludeGarnishes ? standaloneSelectedGarnishes.filter(g => g.selected).length : 0) + (standaloneIncludePackaging ? standaloneSelectedPackaging.filter(p => p.selected).length : 0)} Total Plate Items
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsQuickConverterExpanded(!isQuickConverterExpanded)}
                      className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        isQuickConverterExpanded
                          ? 'bg-amber-400 text-black font-black shadow-md'
                          : 'bg-[#181818] border border-white/10 hover:border-amber-400 text-gray-300 hover:text-white'
                      }`}
                      title="Quick Spoon, Cup, ml & gram conversion calculator"
                    >
                      <Scale className="w-3 h-3" />
                      <span>{isQuickConverterExpanded ? 'Hide Converter' : '🥄 Spoon & Unit Converter'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipeAllowDecimals(!recipeAllowDecimals)}
                      className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                        recipeAllowDecimals
                          ? 'bg-blue-500/15 border border-blue-500/40 text-blue-400 font-black'
                          : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-black'
                      }`}
                      title={recipeAllowDecimals ? "Decimals are ENABLED. Click to switch to clean Whole Numbers" : "Whole numbers mode active. Click to allow optional decimals"}
                    >
                      {recipeAllowDecimals ? '🔢 Decimals: ON (.0)' : '🔢 Decimals: OFF (Whole)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const totalFromList = standaloneIngredients.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
                        setStandaloneTotalBatchCost(totalFromList);
                      }}
                      className="px-2.5 py-1 bg-[#181818] border border-white/10 hover:border-brand-gold text-gray-300 hover:text-white text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                      title="Sync Total Cost from ingredients table sum"
                    >
                      Sync Sum to Batch Cost
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAllBatchCostingChanges({ sectionLabel: 'Viand Raw Materials' })}
                      className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      title="Save Viand Raw Materials changes to dish & recipe"
                    >
                      <Save className="w-3 h-3 text-emerald-400" /> Save Viand
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const firstInv = ingredientsInventory[0];
                        const defaultName = firstInv ? firstInv.name : 'Ingredient';
                        const defaultUnit = firstInv ? firstInv.unit : 'g';
                        const defaultAmt = defaultUnit === 'kg' ? 1 : defaultUnit === 'pcs' ? 1 : 200;
                        const defaultCost = firstInv ? computeInventoryIngredientCost(defaultName, defaultAmt, defaultUnit) : 50;
                        setStandaloneIngredients([
                          ...standaloneIngredients,
                          { name: defaultName, batchAmount: defaultAmt, unit: defaultUnit, cost: defaultCost }
                        ]);
                      }}
                      className="px-2.5 py-1 bg-brand-gold/15 border border-brand-gold/30 hover:bg-brand-gold/25 text-brand-gold text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-brand-gold" /> Add from Inventory
                    </button>
                  </div>
                </div>

                {/* Interactive Quick Culinary Measurement & Spoon Converter */}
                {isQuickConverterExpanded && (
                  <div className="bg-[#141413] border border-amber-500/30 rounded-xl p-3.5 space-y-2.5 animate-fade-in text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-bold text-xs">🥄 Kitchen Measurement Quick Converter</span>
                        <span className="text-[8px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                          Commercial Standard
                        </span>
                      </div>
                      <span className="text-[8.5px] text-gray-400">
                        Convert spoons, cups, ounces & metric units instantly.
                      </span>
                    </div>

                    {/* Interactive Input & Live Equivalencies */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className="flex items-center gap-1.5 bg-[#0D0D0C] p-1.5 rounded-lg border border-white/10">
                        <span className="text-[9px] text-gray-400 uppercase font-bold pl-1">Amount:</span>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={quickConverterAmount}
                          onChange={(e) => setQuickConverterAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-16 bg-[#181818] border border-white/10 rounded px-2 py-1 text-xs text-white font-mono font-bold text-center"
                        />
                        <select
                          value={quickConverterFromUnit}
                          onChange={(e) => setQuickConverterFromUnit(e.target.value)}
                          className="bg-[#181818] border border-white/10 rounded px-2 py-1 text-xs text-amber-300 font-bold"
                        >
                          <option value="tbsp">tbsp (Tablespoon)</option>
                          <option value="tsp">tsp (Teaspoon)</option>
                          <option value="cup">cup (Cup)</option>
                          <option value="oz">oz / fl oz (Ounce)</option>
                          <option value="pinch">pinch</option>
                          <option value="g">g (Grams)</option>
                          <option value="kg">kg (Kilograms)</option>
                          <option value="ml">ml (Milliliters)</option>
                          <option value="L">L (Liters)</option>
                        </select>
                      </div>

                      {/* Real-time equivalents */}
                      {(() => {
                        const amt = Number(quickConverterAmount) || 0;
                        const baseGramsOrMl = getBaseEquivalentUnits(amt, quickConverterFromUnit);
                        const inTsp = (baseGramsOrMl / 5).toFixed(1);
                        const inTbsp = (baseGramsOrMl / 15).toFixed(2);
                        const inCups = (baseGramsOrMl / 240).toFixed(2);
                        const inMlOrG = baseGramsOrMl >= 1000 ? `${(baseGramsOrMl / 1000).toFixed(2)} kg / L (${baseGramsOrMl.toFixed(0)}g)` : `${baseGramsOrMl.toFixed(1)} g / ml`;
                        const inOz = (baseGramsOrMl / 30).toFixed(2);

                        return (
                          <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono flex-1">
                            <span className="text-gray-400">=</span>
                            <span className="bg-[#0D0D0C] border border-amber-500/20 px-2.5 py-1 rounded-lg text-white font-bold">
                              ⚖️ <strong className="text-amber-400">{inMlOrG}</strong>
                            </span>
                            <span className="bg-[#0D0D0C] border border-white/10 px-2.5 py-1 rounded-lg text-gray-300">
                              🥄 <strong>{inTbsp} tbsp</strong>
                            </span>
                            <span className="bg-[#0D0D0C] border border-white/10 px-2.5 py-1 rounded-lg text-gray-300">
                              🥄 <strong>{inTsp} tsp</strong>
                            </span>
                            <span className="bg-[#0D0D0C] border border-white/10 px-2.5 py-1 rounded-lg text-gray-300">
                              ☕ <strong>{inCups} cup</strong>
                            </span>
                            <span className="bg-[#0D0D0C] border border-white/10 px-2.5 py-1 rounded-lg text-gray-300">
                              🥛 <strong>{inOz} fl oz</strong>
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Fast Quick-Click Equivalency Reference Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[8.5px] border-t border-white/5 font-mono">
                      <span className="text-gray-500 uppercase font-sans font-bold">Quick References:</span>
                      {[
                        { label: '1 tbsp = 15g / 15ml (3 tsp)', amt: 1, u: 'tbsp' },
                        { label: '1 tsp = 5g / 5ml', amt: 1, u: 'tsp' },
                        { label: '1 cup = 240g / 240ml (16 tbsp)', amt: 1, u: 'cup' },
                        { label: '½ cup = 120g (8 tbsp)', amt: 0.5, u: 'cup' },
                        { label: '¼ cup = 60g (4 tbsp)', amt: 0.25, u: 'cup' },
                        { label: '1 fl oz = 30ml (2 tbsp)', amt: 1, u: 'oz' },
                        { label: '1 pinch = 0.5g', amt: 1, u: 'pinch' },
                        { label: '1 kg = 1,000g', amt: 1, u: 'kg' },
                        { label: '1 L = 1,000ml', amt: 1, u: 'L' }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setQuickConverterAmount(item.amt);
                            setQuickConverterFromUnit(item.u);
                          }}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/30 text-gray-300 hover:text-amber-300 transition-all cursor-pointer"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-left text-[9.5px]">
                    <thead className="bg-white/5 text-gray-400 font-bold uppercase text-[8px]">
                      <tr>
                        <th className="p-2.5 min-w-[200px]">Select Raw Material (Inventory)</th>
                        <th className="p-2.5">Unit Purchase Cost</th>
                        <th className="p-2.5">Batch Qty</th>
                        <th className="p-2.5">Batch Cost (₱)</th>
                        <th className="p-2.5 text-blue-400">Grams / Amount per Plate</th>
                        <th className="p-2.5 text-brand-gold">Cost per Plate (₱)</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {standaloneIngredients.map((ing, i) => {
                        const batchWeightG = Math.max(1, Number(standaloneBatchWeight) || 1);
                        const servingG = Math.max(1, Number(standaloneServingGrams) || 1);
                        const ingAmt = Number(ing.batchAmount) || 0;
                        const ingCost = Number(ing.cost) || 0;
                        const isCountable = ing.unit === 'pcs' || ing.unit === 'cans' || ing.unit === 'pc' || ing.unit === 'pack';
                        const scaledRaw = (ingAmt / batchWeightG) * servingG;
                        const servingAmount = isCountable
                          ? (ingAmt <= 1 ? 1 : Math.max(1, Math.round(scaledRaw)))
                          : (ingAmt <= 0 ? 0 : (recipeAllowDecimals ? Math.max(0.1, Number(scaledRaw.toFixed(1))) : Math.max(1, Math.round(scaledRaw))));
                        const servingCost = (ingCost / batchWeightG) * servingG;
                        const isExistingInv = ingredientsInventory.some(inv => inv.name.toLowerCase() === ing.name.toLowerCase());

                        return (
                          <tr key={i} className="hover:bg-white/[0.02]">
                            <td className="p-2.5 font-sans min-w-[200px]">
                              <div className="space-y-1">
                                <select
                                  value={isExistingInv ? ing.name : '__custom__'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updated = [...standaloneIngredients];
                                    if (val === '__custom__') {
                                      updated[i].name = '';
                                    } else {
                                      const invMatch = ingredientsInventory.find(inv => inv.name === val);
                                      if (invMatch) {
                                        updated[i].name = invMatch.name;
                                        updated[i].unit = invMatch.unit;
                                        updated[i].cost = computeInventoryIngredientCost(invMatch.name, updated[i].batchAmount, invMatch.unit);
                                      }
                                    }
                                    setStandaloneIngredients(updated);
                                  }}
                                  className="w-full bg-[#121211] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-none focus:border-brand-gold cursor-pointer"
                                >
                                  <option value="" disabled>Select from Inventory...</option>
                                  <optgroup label="📦 Kitchen Inventory Materials">
                                    {ingredientsInventory.map((item) => (
                                      <option key={item.id} value={item.name}>
                                        {item.name} ({item.quantity}{item.unit} stock{item.costPerUnit ? ` • ₱${item.costPerUnit}/${item.unit}` : ''})
                                      </option>
                                    ))}
                                  </optgroup>
                                  <option value="__custom__">✏️ Custom / Manual Name...</option>
                                </select>

                                {(!isExistingInv || ing.name === '') && (
                                  <input
                                    type="text"
                                    placeholder="Type custom ingredient name..."
                                    value={ing.name}
                                    onChange={(e) => {
                                      const updated = [...standaloneIngredients];
                                      updated[i].name = e.target.value;
                                      setStandaloneIngredients(updated);
                                    }}
                                    className="w-full bg-[#121211] border border-brand-gold/40 rounded-lg px-2.5 py-1 text-xs text-brand-gold font-sans placeholder-gray-500 focus:outline-none"
                                  />
                                )}
                              </div>
                            </td>
                            <td className="p-2.5">
                              {(() => {
                                const invMatch = ingredientsInventory.find(inv => inv.name.toLowerCase() === ing.name.toLowerCase());
                                const unitCost = (invMatch?.costPerUnit && invMatch.costPerUnit > 0)
                                  ? invMatch.costPerUnit
                                  : (ing.unit === 'g' ? 0.05 : ing.unit === 'kg' ? 150 : ing.unit === 'pcs' ? 15 : ing.unit === 'ml' ? 0.08 : ing.unit === 'cans' ? 45 : 0.05);
                                return (
                                  <span className="text-brand-gold font-mono font-bold bg-brand-gold/10 px-2 py-0.5 rounded text-[8.5px] border border-brand-gold/20 whitespace-nowrap">
                                    ₱{unitCost >= 1 ? unitCost.toFixed(2) : unitCost.toFixed(3)}/{ing.unit}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  step={(isCountable || !recipeAllowDecimals) ? "1" : "any"}
                                  value={ing.batchAmount}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const newAmt = v === '' ? '' : Number(v);
                                    const updated = [...standaloneIngredients];
                                    updated[i].batchAmount = newAmt;
                                    const invMatch = ingredientsInventory.find(inv => inv.name.toLowerCase() === ing.name.toLowerCase());
                                    if (invMatch) {
                                      updated[i].cost = computeInventoryIngredientCost(invMatch.name, newAmt, updated[i].unit);
                                    }
                                    setStandaloneIngredients(updated);
                                  }}
                                  onBlur={() => {
                                    if (ing.batchAmount === '') {
                                      const updated = [...standaloneIngredients];
                                      updated[i].batchAmount = 0;
                                      setStandaloneIngredients(updated);
                                    }
                                  }}
                                  className="w-20 bg-[#121211] border border-white/10 rounded-lg px-2 py-1 text-xs text-white text-right font-bold"
                                />
                                <select
                                  value={ing.unit}
                                  onChange={(e) => {
                                    const newUnit = e.target.value;
                                    const updated = [...standaloneIngredients];
                                    updated[i].unit = newUnit;
                                    const invMatch = ingredientsInventory.find(inv => inv.name.toLowerCase() === ing.name.toLowerCase());
                                    if (invMatch) {
                                      updated[i].cost = computeInventoryIngredientCost(invMatch.name, updated[i].batchAmount, newUnit);
                                    }
                                    setStandaloneIngredients(updated);
                                  }}
                                  className="bg-[#121211] border border-white/10 rounded-lg px-1.5 py-1 text-xs text-gray-300 font-bold cursor-pointer"
                                >
                                  <optgroup label="⚖️ Metric Weight">
                                    <option value="g">g (Grams)</option>
                                    <option value="kg">kg (Kilograms)</option>
                                  </optgroup>
                                  <optgroup label="🧪 Liquid Volume">
                                    <option value="ml">ml (Milliliters)</option>
                                    <option value="L">L (Liters)</option>
                                    <option value="oz">fl oz (Ounces)</option>
                                  </optgroup>
                                  <optgroup label="🥄 Spoons & Cups">
                                    <option value="tbsp">tbsp (Tablespoon)</option>
                                    <option value="tsp">tsp (Teaspoon)</option>
                                    <option value="cup">cup (Cup)</option>
                                    <option value="pinch">pinch (Pinch)</option>
                                  </optgroup>
                                  <optgroup label="🔢 Discrete Count">
                                    <option value="pcs">pcs (Pieces)</option>
                                    <option value="cans">cans (Cans)</option>
                                    <option value="pack">pack (Packs)</option>
                                  </optgroup>
                                </select>
                              </div>
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-400">₱</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={ing.cost}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const updated = [...standaloneIngredients];
                                    updated[i].cost = v === '' ? '' : Number(v);
                                    setStandaloneIngredients(updated);
                                  }}
                                  onBlur={() => {
                                    if (ing.cost === '') {
                                      const updated = [...standaloneIngredients];
                                      updated[i].cost = 0;
                                      setStandaloneIngredients(updated);
                                    }
                                  }}
                                  className="w-20 bg-[#121211] border border-white/10 rounded-lg px-2 py-1 text-xs text-white text-right font-bold text-brand-gold"
                                />
                              </div>
                            </td>
                            <td className="p-2.5 text-blue-300 font-bold">
                              {isCountable ? servingAmount : (recipeAllowDecimals ? Number(servingAmount).toFixed(1) : Math.round(Number(servingAmount)))}{ing.unit}
                            </td>
                            <td className="p-2.5 text-brand-gold font-bold">
                              ₱{servingCost.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setStandaloneIngredients(standaloneIngredients.filter((_, idx) => idx !== i));
                                }}
                                className="p-1 text-gray-500 hover:text-brand-red transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Summary Footer */}
                {(() => {
                  const ingredientsSumCost = standaloneIngredients.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
                  const ingredientsSumWeight = standaloneIngredients.reduce((sum, item) => sum + (item.unit === 'g' || item.unit === 'ml' ? (Number(item.batchAmount) || 0) : 0), 0);
                  const weightDiff = ingredientsSumWeight - (Number(standaloneBatchWeight) || 0);
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-[10px] font-mono">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">
                          Sum of Ingredient Weights:{' '}
                          <strong className="text-white">
                            {(ingredientsSumWeight / 1000).toFixed(2)}kg ({ingredientsSumWeight}g)
                          </strong>
                        </span>
                        {Math.abs(weightDiff) > 10 && (
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold ${
                            weightDiff > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          }`}>
                            {weightDiff > 0 ? `+${weightDiff}g above target yield` : `${weightDiff}g below target yield`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Sum of Ingredient Costs:</span>
                        <strong className="text-brand-gold text-xs">₱{ingredientsSumCost.toFixed(2)}</strong>
                        {ingredientsSumCost !== standaloneTotalBatchCost && (
                          <button
                            type="button"
                            onClick={() => setStandaloneTotalBatchCost(ingredientsSumCost)}
                            className="px-2 py-0.5 rounded bg-brand-gold/15 text-brand-gold text-[8.5px] font-bold border border-brand-gold/30 hover:bg-brand-gold/25"
                          >
                            Update Batch Cost to ₱{ingredientsSumCost.toFixed(0)}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* --- STEAMED RICE COSTING SECTION (COOKED SEPARATELY IN BULK) --- */}
              <div className="bg-[#0D0D0C] p-4 rounded-2xl border-2 border-amber-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30">
                      <span className="text-base">🍚</span>
                    </div>
                    <div>
                      <h5 className="font-display font-black text-white text-xs uppercase tracking-wider flex items-center gap-2">
                        Steamed Rice Costing (Cooked Separately in Bulk)
                      </h5>
                      <p className="text-gray-400 text-[9px] mt-0.5">
                        Commercial kitchen standard: Rice is prepared separately in rice cookers. Calculate per-cup costing and combine with your viand batch.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Include Rice & Save Button */}
                  <div className="flex items-center gap-2 self-start sm:self-auto bg-[#121211] p-1.5 rounded-xl border border-white/10">
                    <span className="text-[9.5px] font-bold text-gray-300 pl-1">Include Steamed Rice:</span>
                    <button
                      type="button"
                      onClick={() => setStandaloneIncludeRice(!standaloneIncludeRice)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                        standaloneIncludeRice
                          ? 'bg-amber-500 text-black shadow-md'
                          : 'bg-[#181818] text-gray-400 border border-white/10'
                      }`}
                    >
                      {standaloneIncludeRice ? '✓ Included (Meal Plate)' : '✕ Excluded (Viand Only)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAllBatchCostingChanges({ sectionLabel: 'Steamed Rice Costing' })}
                      className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      title="Save Steamed Rice changes to dish & recipe"
                    >
                      <Save className="w-3 h-3 text-emerald-400" /> Save Rice
                    </button>
                  </div>
                </div>

                {standaloneIncludeRice ? (
                  <div className="space-y-4">
                    {/* Select Rice from Inventory */}
                    <div className="bg-[#121211] p-3.5 rounded-xl border border-amber-500/25 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9.5px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>🌾 Select Rice Ingredient from Inventory:</span>
                          </span>
                          {(() => {
                            const selected = (ingredientsInventory || []).find(i => i.name.toLowerCase() === (standaloneSelectedRiceIngredient || '').toLowerCase());
                            if (!selected) return null;
                            return (
                              <span className="text-[8.5px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                                Stock: {selected.quantity} {selected.unit} @ ₱{(selected.costPerUnit || 0).toFixed(2)}/{selected.unit}
                              </span>
                            );
                          })()}
                        </div>

                        {riceInventoryItems.length === 0 && (
                          <button
                            type="button"
                            onClick={() => handleCreateQuickRiceIngredient('Sinandomeng Rice (Raw)', 45)}
                            className="text-[8.5px] text-amber-400 hover:text-white underline font-bold cursor-pointer"
                          >
                            + Quick Add Sinandomeng Rice (₱45/kg)
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={standaloneSelectedRiceIngredient}
                          onChange={(e) => applyRiceIngredientCost(e.target.value, true)}
                          className="flex-1 bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
                        >
                          <option value="">-- Choose Rice from Inventory or Use Custom Rate --</option>
                          {riceInventoryItems.length > 0 && (
                            <optgroup label="🌾 Rice Materials in Inventory">
                              {riceInventoryItems.map((item) => (
                                <option key={item.id} value={item.name}>
                                  {item.name} (₱{Number(item.costPerUnit || 0).toFixed(2)}/{item.unit}) — Stock: {item.quantity} {item.unit}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="📦 All Other Inventory Raw Materials">
                            {nonRiceInventoryItems.map((item) => (
                              <option key={item.id} value={item.name}>
                                {item.name} (₱{Number(item.costPerUnit || 0).toFixed(2)}/{item.unit})
                              </option>
                            ))}
                          </optgroup>
                        </select>

                        {standaloneSelectedRiceIngredient && (
                          <button
                            type="button"
                            onClick={() => applyRiceIngredientCost(standaloneSelectedRiceIngredient, true)}
                            className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 text-[9px] font-bold uppercase transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                            title="Re-sync price from selected inventory item"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Sync Rate</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mode Tabs: Simple Cup Presets vs Rice Cooker Bulk Yield */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider">
                        Rice Costing Method:
                      </span>
                      <div className="flex items-center gap-1 bg-[#121211] p-1 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => setStandaloneRiceCostMode('simple')}
                          className={`px-2.5 py-1 rounded-lg text-[8.5px] font-bold uppercase transition-all ${
                            standaloneRiceCostMode === 'simple'
                              ? 'bg-brand-gold text-black font-black'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          🍚 Simple Cup Presets (₱/Cup)
                        </button>
                        <button
                          type="button"
                          onClick={() => setStandaloneRiceCostMode('cooker')}
                          className={`px-2.5 py-1 rounded-lg text-[8.5px] font-bold uppercase transition-all ${
                            standaloneRiceCostMode === 'cooker'
                              ? 'bg-brand-gold text-black font-black'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          ⚡ Rice Cooker Bulk Yield Calculator
                        </button>
                      </div>
                    </div>

                    {standaloneRiceCostMode === 'simple' ? (
                      /* Simple Cup Presets Mode */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Cup Portion in Grams */}
                        <div className="bg-[#121211] p-3 rounded-xl border border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider">
                              Steamed Rice Portion per Plate
                            </span>
                            <span className="text-xs font-mono font-black text-amber-400">
                              {Number(standaloneRicePortionGrams) || 0}g / cup
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="50"
                              step="10"
                              value={standaloneRicePortionGrams}
                              onChange={(e) => {
                                const v = e.target.value;
                                setStandaloneRicePortionGrams(v === '' ? '' : Number(v));
                              }}
                              onBlur={() => {
                                if (standaloneRicePortionGrams === '' || Number(standaloneRicePortionGrams) < 10) setStandaloneRicePortionGrams(150);
                              }}
                              className="flex-1 bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold text-right focus:outline-none focus:border-amber-400"
                            />
                            <span className="text-[10px] text-gray-500 font-bold uppercase">grams / plate</span>
                          </div>
                          <div className="flex items-center gap-1 pt-1 flex-wrap">
                            <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider">Cup Sizes:</span>
                            {[
                              { label: '150g (Standard Cup)', val: 150 },
                              { label: '180g (Regular Bento)', val: 180 },
                              { label: '200g (Big Silog)', val: 200 },
                              { label: '250g (Extra Rice)', val: 250 }
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => setStandaloneRicePortionGrams(preset.val)}
                                className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all ${
                                  standaloneRicePortionGrams === preset.val
                                    ? 'bg-amber-400 text-black font-black'
                                    : 'bg-[#181818] text-gray-400 border border-white/5 hover:text-white'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Cost per Gram & Cost per Cup Readout */}
                        <div className="bg-[#121211] p-3 rounded-xl border border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider">
                              Cooked Steamed Rice Cost Rate
                            </span>
                            <span className="text-xs font-mono font-black text-green-400">
                              ₱{((Number(standaloneRicePortionGrams) || 0) * (Number(standaloneRiceCostPerGram) || 0)).toFixed(2)} / cup
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 font-mono text-xs">₱</span>
                            <input
                              type="number"
                              min="0.005"
                              step="0.005"
                              value={standaloneRiceCostPerGram}
                              onChange={(e) => {
                                const v = e.target.value;
                                setStandaloneRiceCostPerGram(v === '' ? '' : Number(v));
                              }}
                              onBlur={() => {
                                if (standaloneRiceCostPerGram === '' || Number(standaloneRiceCostPerGram) <= 0) setStandaloneRiceCostPerGram(0.04);
                              }}
                              className="flex-1 bg-[#0D0D0C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold text-right focus:outline-none focus:border-amber-400"
                            />
                            <span className="text-[10px] text-gray-500 font-bold uppercase">per gram (₱/g)</span>
                          </div>
                          <div className="flex items-center gap-1 pt-1 flex-wrap">
                            <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider">Standard Rates:</span>
                            {[
                              { label: '₱0.035/g (₱35/kg)', val: 0.035 },
                              { label: '₱0.040/g (Inv Rate ₱40/kg)', val: 0.04 },
                              { label: '₱0.045/g (₱45/kg)', val: 0.045 },
                              { label: '₱0.050/g (₱50/kg)', val: 0.05 }
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => setStandaloneRiceCostPerGram(preset.val)}
                                className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all ${
                                  standaloneRiceCostPerGram === preset.val
                                    ? 'bg-amber-400 text-black font-black'
                                    : 'bg-[#181818] text-gray-400 border border-white/5 hover:text-white'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Rice Cooker Bulk Yield Calculator Mode */
                      <div className="space-y-3 bg-[#121211] p-3.5 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <span>🍚 Rice Cooker Bulk Batch Production Formula</span>
                          </span>
                          <span className="text-[8.5px] text-gray-400">
                            1kg raw rice absorbs water & yields ~2.1x – 2.5x cooked rice.
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {/* 1. Raw Rice Weight */}
                          <div className="space-y-1 bg-[#0D0D0C] p-2.5 rounded-lg border border-white/5">
                            <label className="text-[8px] text-gray-400 uppercase font-bold block">1. Raw Rice Batch (kg)</label>
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={standaloneRawRiceKg}
                              onChange={(e) => {
                                const v = e.target.value;
                                setStandaloneRawRiceKg(v === '' ? '' : Number(v));
                              }}
                              onBlur={() => {
                                if (standaloneRawRiceKg === '' || Number(standaloneRawRiceKg) <= 0) setStandaloneRawRiceKg(2);
                              }}
                              className="w-full bg-[#181818] border border-white/10 rounded px-2 py-1 text-xs text-white font-mono font-bold text-right"
                            />
                            <div className="flex gap-1 pt-0.5 flex-wrap">
                              {[1, 2, 3, 5].map((k) => (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() => setStandaloneRawRiceKg(k)}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono ${standaloneRawRiceKg === k ? 'bg-amber-500 text-black font-black' : 'bg-white/5 text-gray-400'}`}
                                >
                                  {k}kg
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 2. Raw Rice Cost per kg */}
                          <div className="space-y-1 bg-[#0D0D0C] p-2.5 rounded-lg border border-white/5">
                            <label className="text-[8px] text-gray-400 uppercase font-bold block">2. Raw Rice Cost / kg (₱)</label>
                            <input
                              type="number"
                              min="20"
                              step="1"
                              value={standaloneRawRiceCostKg}
                              onChange={(e) => {
                                const v = e.target.value;
                                setStandaloneRawRiceCostKg(v === '' ? '' : Number(v));
                              }}
                              onBlur={() => {
                                if (standaloneRawRiceCostKg === '' || Number(standaloneRawRiceCostKg) <= 0) setStandaloneRawRiceCostKg(50);
                              }}
                              className="w-full bg-[#181818] border border-white/10 rounded px-2 py-1 text-xs text-white font-mono font-bold text-right text-amber-400"
                            />
                            <div className="flex gap-1 pt-0.5 flex-wrap">
                              {[45, 50, 55, 60].map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setStandaloneRawRiceCostKg(c)}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono ${standaloneRawRiceCostKg === c ? 'bg-amber-500 text-black font-black' : 'bg-white/5 text-gray-400'}`}
                                >
                                  ₱{c}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 3. Cooked Expansion Factor */}
                          <div className="space-y-1 bg-[#0D0D0C] p-2.5 rounded-lg border border-white/5">
                            <label className="text-[8px] text-gray-400 uppercase font-bold block">3. Cooked Yield Factor</label>
                            <input
                              type="number"
                              min="1.5"
                              max="3.0"
                              step="0.1"
                              value={standaloneRiceExpansionRatio}
                              onChange={(e) => {
                                const v = e.target.value;
                                setStandaloneRiceExpansionRatio(v === '' ? '' : Number(v));
                              }}
                              onBlur={() => {
                                if (standaloneRiceExpansionRatio === '' || Number(standaloneRiceExpansionRatio) <= 0) setStandaloneRiceExpansionRatio(2.3);
                              }}
                              className="w-full bg-[#181818] border border-white/10 rounded px-2 py-1 text-xs text-white font-mono font-bold text-right"
                            />
                            <div className="flex gap-1 pt-0.5 flex-wrap">
                              {[2.1, 2.3, 2.5].map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => setStandaloneRiceExpansionRatio(r)}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono ${standaloneRiceExpansionRatio === r ? 'bg-amber-500 text-black font-black' : 'bg-white/5 text-gray-400'}`}
                                >
                                  {r}x
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 4. Cooking Gas/Water Overhead */}
                          <div className="space-y-1 bg-[#0D0D0C] p-2.5 rounded-lg border border-white/5">
                            <label className="text-[8px] text-gray-400 uppercase font-bold block">4. Water & Power / Batch (₱)</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={standaloneRiceOverhead}
                              onChange={(e) => {
                                const v = e.target.value;
                                setStandaloneRiceOverhead(v === '' ? '' : Number(v));
                              }}
                              onBlur={() => {
                                if (standaloneRiceOverhead === '') setStandaloneRiceOverhead(10);
                              }}
                              className="w-full bg-[#181818] border border-white/10 rounded px-2 py-1 text-xs text-white font-mono font-bold text-right"
                            />
                            <div className="flex gap-1 pt-0.5 flex-wrap">
                              {[5, 10, 15, 20].map((o) => (
                                <button
                                  key={o}
                                  type="button"
                                  onClick={() => setStandaloneRiceOverhead(o)}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono ${standaloneRiceOverhead === o ? 'bg-amber-500 text-black font-black' : 'bg-white/5 text-gray-400'}`}
                                >
                                  ₱{o}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Real-time Bulk Rice Calculations */}
                        {(() => {
                          const rawKg = Number(standaloneRawRiceKg) || 0;
                          const expRatio = Number(standaloneRiceExpansionRatio) || 1;
                          const rawCost = Number(standaloneRawRiceCostKg) || 0;
                          const overhead = Number(standaloneRiceOverhead) || 0;
                          const cookedKg = rawKg * expRatio;
                          const cookedGrams = cookedKg * 1000;
                          const totalCookerCost = (rawKg * rawCost) + overhead;
                          const computedCostPerCookedGram = totalCookerCost / Math.max(1, cookedGrams);
                          const portionGrams = Number(standaloneRicePortionGrams) || 0;
                          const totalCupsYielded = cookedGrams / Math.max(1, portionGrams);
                          const costPerCup = computedCostPerCookedGram * portionGrams;

                          return (
                            <div className="bg-[#0D0D0C] p-3 rounded-lg border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] font-mono">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                                <div>
                                  <span className="text-gray-500 text-[8px] uppercase font-bold block">Cooked Yield</span>
                                  <strong className="text-white text-xs">{cookedKg.toFixed(2)}kg</strong>
                                  <span className="text-[8px] text-gray-500 block">({cookedGrams.toFixed(0)}g)</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-[8px] uppercase font-bold block">Rice Cups Produced</span>
                                  <strong className="text-amber-400 text-xs">{totalCupsYielded.toFixed(1)} cups</strong>
                                  <span className="text-[8px] text-gray-500 block">(@ {portionGrams}g/cup)</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-[8px] uppercase font-bold block">Total Cooker Cost</span>
                                  <strong className="text-brand-gold text-xs">₱{totalCookerCost.toFixed(2)}</strong>
                                  <span className="text-[8px] text-gray-500 block">(Raw + Utils)</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-[8px] uppercase font-bold block">Cooked Cost / Cup</span>
                                  <strong className="text-green-400 text-xs">₱{costPerCup.toFixed(2)}</strong>
                                  <span className="text-[8px] text-gray-500 block">(₱{computedCostPerCookedGram.toFixed(4)}/g)</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setStandaloneRiceCostPerGram(Number(computedCostPerCookedGram.toFixed(4)));
                                  alert(`Applied cooker rate of ₱${computedCostPerCookedGram.toFixed(4)}/gram (₱${costPerCup.toFixed(2)} per ${standaloneRicePortionGrams}g cup) to plate costing!`);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-[9px] uppercase tracking-wider transition-all shadow-md self-start sm:self-auto cursor-pointer"
                              >
                                Apply ₱{computedCostPerCookedGram.toFixed(3)}/g Rate →
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#121211] p-3 rounded-xl border border-white/5 text-[9px] text-gray-400 flex items-center justify-between">
                    <span>💡 Steamed Rice is turned off. Costing reflects the <strong>Viand / Meat Only</strong> (Ala Carte or Pulutan portion).</span>
                    <button
                      type="button"
                      onClick={() => setStandaloneIncludeRice(true)}
                      className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 text-[8.5px] font-bold uppercase transition-all"
                    >
                      Turn On Rice Costing
                    </button>
                  </div>
                )}
              </div>

              {/* Plate Garnishes, Toppings & Direct Sides Section (Per Serving) */}
              <div className="bg-[#0D0D0C] p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-sm">🍳</span>
                    <div>
                      <h5 className="font-display font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span>Plate Toppings, Garnishes & Sides (Per Serving)</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono">1 plate = 1 serving</span>
                      </h5>
                      <p className="text-gray-400 text-[9px] mt-0.5">
                        Direct single-serving accompaniments (e.g., 1 Fried Egg @ ₱8, 1 Calamansi @ ₱0.50, 1 Chili @ ₱0.80, Atchara @ ₱3) added per plate, NOT diluted across the bulk viand batch.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStandaloneIncludeGarnishes(!standaloneIncludeGarnishes)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                        standaloneIncludeGarnishes
                          ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400 font-black'
                          : 'bg-[#181818] border border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {standaloneIncludeGarnishes ? `✓ Garnishes Active (₱${standaloneGarnishesCost.toFixed(2)})` : '+ Include Garnishes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAllBatchCostingChanges({ sectionLabel: 'Plate Garnishes & Sides' })}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-[9px] font-black uppercase rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      title="Save Garnishes & Sides changes to dish & recipe"
                    >
                      <Save className="w-3 h-3 text-emerald-400" /> Save Garnishes
                    </button>
                  </div>
                </div>

                {standaloneIncludeGarnishes ? (
                  <div className="space-y-3">
                    {/* Quick Presets for Common Philippine Plate Accompaniments */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[8px] text-gray-500 uppercase font-black">Quick Add Accompaniments:</span>
                      {[
                        { name: 'Egg', label: '🍳 1 Fried Egg (₱8.00)', defaultCost: 8.00 },
                        { name: 'Kalamansi /pc', label: '🍋 1 Calamansi (₱0.50)', defaultCost: 0.50 },
                        { name: 'Red Chili', label: '🌶️ 1 Red Chili (₱0.80)', defaultCost: 0.80 },
                        { name: 'Green Chili', label: '🌶️ 1 Green Chili (₱1.50)', defaultCost: 1.50 },
                        { name: 'Atchara Pickles Garnish', label: '🥣 Atchara Pickles (₱3.00)', defaultCost: 3.00 },
                        { name: 'House Soup (Sabaw)', label: '🍲 Soup Cup (₱2.00)', defaultCost: 2.00 },
                        { name: 'Toasted Garlic & Spring Onion', label: '🌿 Spring Onions (₱1.00)', defaultCost: 1.00 }
                      ].map(preset => {
                        const isAlreadyAdded = standaloneSelectedGarnishes.some(g => g.name.toLowerCase() === preset.name.toLowerCase() && g.selected);
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              const existingIdx = standaloneSelectedGarnishes.findIndex(g => g.name.toLowerCase() === preset.name.toLowerCase());
                              if (existingIdx !== -1) {
                                const updated = [...standaloneSelectedGarnishes];
                                updated[existingIdx].selected = !updated[existingIdx].selected;
                                setStandaloneSelectedGarnishes(updated);
                              } else {
                                const invMatch = (ingredientsInventory || []).find(i => i.name.toLowerCase() === preset.name.toLowerCase());
                                const pCost = getGarnishPieceCost(preset.name, preset.defaultCost, invMatch);
                                setStandaloneSelectedGarnishes(prev => [
                                  ...prev,
                                  {
                                    name: preset.name,
                                    amount: 1,
                                    costPerUnit: pCost,
                                    unit: 'pcs',
                                    selected: true
                                  }
                                ]);
                              }
                            }}
                            className={`px-2 py-1 rounded-lg text-[8.5px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                              isAlreadyAdded
                                ? 'bg-amber-400 text-black font-black shadow-sm'
                                : 'bg-[#181818] text-gray-300 border border-white/5 hover:border-amber-500/30 hover:text-white'
                            }`}
                          >
                            <span>{preset.label}</span>
                            {isAlreadyAdded && <span className="text-[7.5px] bg-black/20 px-1 py-0.2 rounded font-black">ACTIVE</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* List of active garnishes & toppings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {standaloneSelectedGarnishes.map((garnish, gIdx) => {
                        const invMatch = (ingredientsInventory || []).find(i => i.name.toLowerCase() === garnish.name.toLowerCase());
                        const stockQty = invMatch ? invMatch.quantity : 0;
                        const stockUnit = invMatch?.unit || 'pcs';
                        const garnishUnit = (garnish.unit || 'pcs').toLowerCase();
                        const isVolumeUnit = garnishUnit === 'ml' || garnishUnit === 'g';
                        // For volume units (ml/g), costPerUnit is cost per ml/g from inventory
                        // For pcs, costPerUnit is cost per piece
                        const rawCostPerUnit = invMatch ? (Number(invMatch.costPerUnit) || 0) : (garnish.costPerUnit || 0);
                        const pieceCost = (() => {
                          if (isVolumeUnit && rawCostPerUnit > 0) {
                            // costPerUnit from inventory is per base unit (per ml or per g)
                            const invUnit = (invMatch?.unit || '').toLowerCase();
                            if (invUnit === 'ml' || invUnit === 'g') return rawCostPerUnit;
                            if (invUnit === 'kg') return rawCostPerUnit / 1000; // per g
                            if (invUnit === 'l') return rawCostPerUnit / 1000; // per ml
                          }
                          return (garnish.costPerUnit !== undefined && garnish.costPerUnit > 0)
                            ? garnish.costPerUnit
                            : getGarnishPieceCost(garnish.name, undefined, invMatch);
                        })();
                        const isLowStock = invMatch ? stockQty <= (invMatch.lowStockAlert || 20) : false;
                        const itemPlateCost = pieceCost * (Number(garnish.amount) || 1);
                        const gramsPerPc = getGarnishGramsPerPiece(garnish.name, invMatch);
                        const isWeightStock = stockUnit === 'kg' || stockUnit === 'g';

                        return (
                          <div
                            key={gIdx}
                            className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                              garnish.selected
                                ? 'bg-[#141413] border-amber-500/40 shadow-sm'
                                : 'bg-[#101010]/60 border-white/5 opacity-60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={garnish.selected}
                                  onChange={() => {
                                    const updated = [...standaloneSelectedGarnishes];
                                    updated[gIdx].selected = !updated[gIdx].selected;
                                    setStandaloneSelectedGarnishes(updated);
                                  }}
                                  className="w-3.5 h-3.5 rounded text-amber-500 bg-[#181818] border-white/20 focus:ring-0 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-white truncate" title={garnish.name}>
                                  {garnish.name}
                                </span>
                              </label>

                              <button
                                type="button"
                                onClick={() => {
                                  setStandaloneSelectedGarnishes(standaloneSelectedGarnishes.filter((_, idx) => idx !== gIdx));
                                }}
                                className="text-gray-500 hover:text-brand-red p-0.5 rounded transition-colors"
                                title="Remove garnish item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Quantity Per Plate & Unit Cost */}
                            <div className="flex items-center justify-between gap-2 bg-[#0D0D0C] p-1.5 rounded-lg border border-white/5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] text-gray-400 uppercase font-bold">Qty / Plate:</span>
                                <input
                                  type="number"
                                  min="0.1"
                                  step={(() => {
                                    const u = (garnish.unit || 'pcs').toLowerCase();
                                    return u === 'ml' || u === 'g' ? '0.5' : '1';
                                  })()}
                                  value={garnish.amount}
                                  onChange={(e) => {
                                    const updated = [...standaloneSelectedGarnishes];
                                    updated[gIdx].amount = Number(e.target.value) || 1;
                                    setStandaloneSelectedGarnishes(updated);
                                  }}
                                  className="w-14 bg-[#181818] border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono font-bold text-center"
                                />
                                <select
                                  value={garnish.unit || 'pcs'}
                                  onChange={(e) => {
                                    const updated = [...standaloneSelectedGarnishes];
                                    updated[gIdx] = { ...updated[gIdx], unit: e.target.value };
                                    setStandaloneSelectedGarnishes(updated);
                                  }}
                                  className="bg-[#181818] border border-white/10 rounded px-1 py-0.5 text-[9px] text-amber-300 font-bold cursor-pointer focus:outline-none focus:border-amber-400"
                                  title="Change unit of measurement"
                                >
                                  <option value="pcs">pcs</option>
                                  <option value="ml">ml</option>
                                  <option value="g">g</option>
                                  <option value="tbsp">tbsp</option>
                                  <option value="tsp">tsp</option>
                                </select>
                              </div>

                              <div className="text-right">
                                <span className="text-amber-400 font-mono font-bold text-xs">
                                  ₱{itemPlateCost.toFixed(2)}
                                </span>
                                <span className="text-[7.5px] text-gray-500 block">(@ ₱{pieceCost.toFixed(2)}/{garnish.unit || 'pc'})</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[9px] pt-1 border-t border-white/5 font-mono">
                              <span className={invMatch ? (isLowStock ? 'text-amber-400 font-bold' : 'text-gray-400') : 'text-amber-500/80 italic'}>
                                {invMatch ? (
                                  isWeightStock ? (
                                    `${stockQty} ${stockUnit} in stock (~${Number(garnish.amount) || 1}${garnish.unit || stockUnit}/plate)`
                                  ) : (
                                    `${stockQty} ${stockUnit} in stock`
                                  )
                                ) : 'Standard default rate'}
                              </span>
                              <span className="text-gray-400 text-[8.5px]">
                                Added per serving
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Garnish from Stocks Dropdown & Total Cost Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-[9.5px]">
                      <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const invMatch = (ingredientsInventory || []).find(i => i.name === val);
                            if (invMatch) {
                              const invUnit = (invMatch.unit || 'pcs').toLowerCase();
                              const isVolumeInvUnit = invUnit === 'g' || invUnit === 'ml' || invUnit === 'kg' || invUnit === 'l';
                              // For weight/volume inventory items, store the raw per-unit rate (per g or per ml)
                              // so that the card display (costPerUnit × amount) stays accurate.
                              // getGarnishPieceCost() pre-multiplies by a default gram estimate (e.g. 15g),
                              // which would make costPerUnit wrong for actual gram-amount inputs.
                              const storedCostPerUnit = (() => {
                                const raw = Number(invMatch.costPerUnit) || 0;
                                if (raw <= 0) return getGarnishPieceCost(invMatch.name, invMatch.costPerUnit, invMatch);
                                if (invUnit === 'g' || invUnit === 'ml') return raw;         // already per g / per ml
                                if (invUnit === 'kg') return raw / 1000;                     // convert to per g
                                if (invUnit === 'l') return raw / 1000;                      // convert to per ml
                                return getGarnishPieceCost(invMatch.name, invMatch.costPerUnit, invMatch); // pcs fallback
                              })();
                              const alreadyAdded = standaloneSelectedGarnishes.some(g => g.name.toLowerCase() === invMatch.name.toLowerCase());
                              if (alreadyAdded) {
                                setStandaloneSelectedGarnishes(prev => prev.map(g => g.name.toLowerCase() === invMatch.name.toLowerCase() ? { ...g, selected: true, costPerUnit: storedCostPerUnit } : g));
                              } else {
                                // Determine smart default amount & unit based on inventory unit
                                const defaultAmount = (() => {
                                  const n = invMatch.name.toLowerCase();
                                  if (invUnit === 'ml') {
                                    if (n.includes('mayo') || n.includes('dressing') || n.includes('vinegar') || n.includes('sauce')) return 15;
                                    if (n.includes('oil') || n.includes('soy') || n.includes('fish sauce') || n.includes('patis')) return 5;
                                    return 15;
                                  }
                                  if (invUnit === 'g') {
                                    if (n.includes('atchara') || n.includes('pickle')) return 20;
                                    if (n.includes('salt') || n.includes('pepper') || n.includes('sugar')) return 2;
                                    if (n.includes('onion') || n.includes('sibuyas') || n.includes('tomato') || n.includes('kamatis')) return 15;
                                    return 15;
                                  }
                                  if (invUnit === 'kg') return 15; // display in grams
                                  return 1;
                                })();
                                // For kg inventory items, display unit should be 'g' for human-friendly input
                                const displayUnit = (invUnit === 'kg' || invUnit === 'l') ? (invUnit === 'kg' ? 'g' : 'ml') : (invMatch.unit || 'pcs');
                                setStandaloneSelectedGarnishes(prev => [
                                  ...prev,
                                  {
                                    name: invMatch.name,
                                    amount: defaultAmount,
                                    costPerUnit: storedCostPerUnit,
                                    unit: displayUnit,
                                    selected: true
                                  }
                                ]);
                              }
                            }
                          }}
                          className="w-full sm:w-80 bg-[#121211] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="">+ Select Garnish / Topping from Inventory Stock...</option>
                          <optgroup label="🍳 Garnishes, Eggs & Direct Sides in Inventory">
                            {(ingredientsInventory || [])
                              .filter(i => isGarnishRequirement(i.name))
                              .map(i => {
                                const pCost = getGarnishPieceCost(i.name, i.costPerUnit, i);
                                const isPerPc = i.unit === 'pcs' || i.unit === 'pc';
                                return (
                                  <option key={i.id} value={i.name}>
                                    {i.name} ({i.quantity} {i.unit} stock • ₱{pCost.toFixed(2)}/pc{isPerPc ? '' : ` from ₱${(i.costPerUnit || 0).toFixed(2)}/${i.unit}`})
                                  </option>
                                );
                              })}
                          </optgroup>
                          <optgroup label="📦 All Other Inventory Items">
                            {(ingredientsInventory || [])
                              .filter(i => !isGarnishRequirement(i.name))
                              .map(i => {
                                const pCost = getGarnishPieceCost(i.name, i.costPerUnit, i);
                                const isPerPc = i.unit === 'pcs' || i.unit === 'pc';
                                return (
                                  <option key={i.id} value={i.name}>
                                    {i.name} ({i.quantity} {i.unit} stock • ₱{pCost.toFixed(2)}/pc{isPerPc ? '' : ` from ₱${(i.costPerUnit || 0).toFixed(2)}/${i.unit}`})
                                  </option>
                                );
                              })}
                          </optgroup>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-gray-400 font-medium">Total Garnishes Cost:</span>
                        <span className="text-sm font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                          ₱{standaloneGarnishesCost.toFixed(2)} / plate
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#121211] p-2.5 rounded-xl border border-white/5 text-[9px] text-gray-400 flex items-center justify-between">
                    <span>💡 Garnishes & Toppings are turned off. Costing reflects viand & rice only without direct plate sides.</span>
                    <button
                      type="button"
                      onClick={() => setStandaloneIncludeGarnishes(true)}
                      className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 text-[8.5px] font-bold uppercase transition-all cursor-pointer"
                    >
                      Turn On Garnishes Cost
                    </button>
                  </div>
                )}
              </div>

              {/* Packaging & Disposables Section (Per Serving) */}
              <div className="bg-[#0D0D0C] p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-brand-gold text-sm">📦</span>
                    <div>
                      <h5 className="font-display font-bold text-white text-xs uppercase tracking-wider">
                        Takeout Packaging & Disposables from Stock (Per Serving)
                      </h5>
                      <p className="text-gray-400 text-[9px] mt-0.5">
                        Select packaging materials and containers from kitchen inventory stock to include in per-plate costing.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStandaloneIncludePackaging(!standaloneIncludePackaging)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                        standaloneIncludePackaging
                          ? 'bg-blue-500/15 border border-blue-500/40 text-blue-400 font-black'
                          : 'bg-[#181818] border border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {standaloneIncludePackaging ? `✓ Packaging Active (₱${standalonePackagingCost.toFixed(2)})` : '+ Include Packaging'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAllBatchCostingChanges({ sectionLabel: 'Takeout Packaging' })}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 text-[9px] font-black uppercase rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      title="Save Takeout Packaging changes to dish & recipe"
                    >
                      <Save className="w-3 h-3 text-emerald-400" /> Save Packaging
                    </button>
                  </div>
                </div>

                {standaloneIncludePackaging ? (
                  <div className="space-y-3">
                    {/* List of active packaging items from stock */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {standaloneSelectedPackaging.map((pkg, pIdx) => {
                        const invMatch = (ingredientsInventory || []).find(i => i.name.toLowerCase() === pkg.name.toLowerCase());
                        const stockQty = invMatch ? invMatch.quantity : 0;
                        const stockUnit = invMatch?.unit || pkg.unit || 'pcs';
                        const unitCost = (invMatch?.costPerUnit && invMatch.costPerUnit > 0) ? invMatch.costPerUnit : pkg.costPerUnit;
                        const isLowStock = invMatch ? stockQty <= (invMatch.lowStockAlert || 20) : false;

                        return (
                          <div
                            key={pIdx}
                            className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                              pkg.selected
                                ? 'bg-[#141413] border-blue-500/40 shadow-sm'
                                : 'bg-[#101010]/60 border-white/5 opacity-60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={pkg.selected}
                                  onChange={() => {
                                    const updated = [...standaloneSelectedPackaging];
                                    updated[pIdx].selected = !updated[pIdx].selected;
                                    setStandaloneSelectedPackaging(updated);
                                  }}
                                  className="w-3.5 h-3.5 rounded text-blue-500 bg-[#181818] border-white/20 focus:ring-0 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-white truncate" title={pkg.name}>
                                  {pkg.name}
                                </span>
                              </label>

                              <button
                                type="button"
                                onClick={() => {
                                  setStandaloneSelectedPackaging(standaloneSelectedPackaging.filter((_, idx) => idx !== pIdx));
                                }}
                                className="text-gray-500 hover:text-brand-red p-0.5 rounded transition-colors"
                                title="Remove packaging item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-[9px] pt-1 border-t border-white/5 font-mono">
                              <span className={invMatch ? (isLowStock ? 'text-amber-400 font-bold' : 'text-gray-400') : 'text-brand-red'}>
                                {invMatch ? `${stockQty} ${stockUnit} in stock` : 'Not in inventory'}
                              </span>
                              <span className="text-blue-400 font-bold">
                                ₱{unitCost.toFixed(2)} / {stockUnit}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Packaging from Stocks Dropdown & Total Cost Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-[9.5px]">
                      <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const invMatch = (ingredientsInventory || []).find(i => i.name === val);
                            if (invMatch) {
                              const alreadyAdded = standaloneSelectedPackaging.some(p => p.name.toLowerCase() === invMatch.name.toLowerCase());
                              if (alreadyAdded) {
                                setStandaloneSelectedPackaging(prev => prev.map(p => p.name.toLowerCase() === invMatch.name.toLowerCase() ? { ...p, selected: true } : p));
                              } else {
                                setStandaloneSelectedPackaging(prev => [
                                  ...prev,
                                  {
                                    name: invMatch.name,
                                    amount: 1,
                                    costPerUnit: invMatch.costPerUnit || 2.50,
                                    unit: invMatch.unit || 'pcs',
                                    selected: true
                                  }
                                ]);
                              }
                            }
                          }}
                          className="w-full sm:w-80 bg-[#121211] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400 cursor-pointer"
                        >
                          <option value="">+ Select Packaging Material from Inventory Stock...</option>
                          <optgroup label="📦 Available Packaging in Inventory">
                            {(ingredientsInventory || [])
                              .filter(i => isPackagingRequirement(i.name) || i.unit === 'pcs' || i.unit === 'pack')
                              .map(i => (
                                <option key={i.id} value={i.name}>
                                  {i.name} ({i.quantity} {i.unit} stock • ₱{(i.costPerUnit || 0).toFixed(2)})
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="📦 All Other Inventory Items">
                            {(ingredientsInventory || [])
                              .filter(i => !isPackagingRequirement(i.name) && i.unit !== 'pcs' && i.unit !== 'pack')
                              .map(i => (
                                <option key={i.id} value={i.name}>
                                  {i.name} ({i.quantity} {i.unit} stock • ₱{(i.costPerUnit || 0).toFixed(2)})
                                </option>
                              ))}
                          </optgroup>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-gray-400 font-medium">Total Packaging Cost:</span>
                        <span className="text-sm font-mono font-black text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">
                          ₱{standalonePackagingCost.toFixed(2)} / plate
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#121211] p-2.5 rounded-xl border border-white/5 text-[9px] text-gray-400 flex items-center justify-between">
                    <span>💡 Packaging is turned off. Costing reflects Dine-in or Plated food only without packaging materials.</span>
                    <button
                      type="button"
                      onClick={() => setStandaloneIncludePackaging(true)}
                      className="px-2.5 py-1 rounded bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 text-[8.5px] font-bold uppercase transition-all cursor-pointer"
                    >
                      Turn On Packaging Cost
                    </button>
                  </div>
                )}
              </div>
              {/* Target Margin Slider & Standalone Combined Calculation Results */}
              {(() => {
                const batchWeightG = Math.max(1, Number(standaloneBatchWeight) || 1);
                const servingG = Math.max(1, Number(standaloneServingGrams) || 1);
                const servingsProduced = batchWeightG / servingG;
                const batchCost = Number(standaloneTotalBatchCost) || 0;
                const costPerGram = batchCost / batchWeightG;
                const viandCostPerServing = costPerGram * servingG;
                const riceCostPerServing = standaloneIncludeRice ? ((Number(standaloneRicePortionGrams) || 0) * (Number(standaloneRiceCostPerGram) || 0)) : 0;
                const garnishesCostPerServing = standaloneIncludeGarnishes ? (Number(standaloneGarnishesCost) || 0) : 0;
                const packagingCostPerServing = standaloneIncludePackaging ? (Number(standalonePackagingCost) || 0) : 0;
                const totalPlateCogs = viandCostPerServing + riceCostPerServing + garnishesCostPerServing + packagingCostPerServing;
                const targetMarginVal = Number(standaloneTargetMargin) || 0;
                const recSellingPrice = targetMarginVal > 0 && targetMarginVal < 100
                  ? Math.ceil(totalPlateCogs / (1 - targetMarginVal / 100))
                  : Math.ceil(totalPlateCogs * 2);
                const profitPerPlate = recSellingPrice - totalPlateCogs;
                const totalGrossRevenue = servingsProduced * recSellingPrice;
                const totalRiceBatchCostForViand = servingsProduced * riceCostPerServing;
                const totalGarnishesBatchCostForViand = servingsProduced * garnishesCostPerServing;
                const totalPackagingBatchCost = servingsProduced * packagingCostPerServing;
                const totalNetProfit = totalGrossRevenue - batchCost - (standaloneIncludeRice ? totalRiceBatchCostForViand : 0) - (standaloneIncludeGarnishes ? totalGarnishesBatchCostForViand : 0) - (standaloneIncludePackaging ? totalPackagingBatchCost : 0);

                return (
                  <div className="bg-[#0D0D0C] p-4 rounded-2xl border-2 border-brand-gold/30 space-y-4">
                    {/* Overall Batch Cost Input & Target Margin Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-3">
                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">
                          Viand Batch Cost (Meat Only ₱):
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs text-brand-gold font-bold">₱</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={standaloneTotalBatchCost}
                            onChange={(e) => {
                              const v = e.target.value;
                              setStandaloneTotalBatchCost(v === '' ? '' : Number(v));
                            }}
                            onBlur={() => {
                              if (standaloneTotalBatchCost === '') setStandaloneTotalBatchCost(0);
                            }}
                            className="w-32 bg-[#121211] border border-brand-gold/40 rounded-xl pl-6 pr-2.5 py-1.5 text-xs text-white font-mono font-bold text-right focus:outline-none focus:border-brand-gold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Target Margin:</span>
                        <span className="font-mono text-xs font-black text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-lg border border-brand-gold/30">
                          {Number(standaloneTargetMargin) || 0}%
                        </span>
                      </div>
                    </div>

                    {/* Margin Presets & Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="10"
                          max="90"
                          step="1"
                          value={standaloneTargetMargin === '' ? 50 : standaloneTargetMargin}
                          onChange={(e) => setStandaloneTargetMargin(Number(e.target.value))}
                          className="flex-1 accent-brand-gold cursor-pointer"
                        />
                        <div className="relative w-16 shrink-0">
                          <input
                            type="number"
                            min="5"
                            max="95"
                            value={standaloneTargetMargin}
                            onChange={(e) => {
                              const v = e.target.value;
                              setStandaloneTargetMargin(v === '' ? '' : Number(v));
                            }}
                            onBlur={() => {
                              if (standaloneTargetMargin === '') setStandaloneTargetMargin(50);
                            }}
                            className="w-full bg-[#121211] border border-white/10 rounded-lg pr-4 pl-2 py-1 text-xs text-white text-right font-mono font-bold"
                          />
                          <span className="absolute right-1.5 top-1 text-[10px] text-gray-400 font-bold">%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[8px] text-gray-500 uppercase font-black">Margin Presets:</span>
                        {[35, 40, 45, 50, 60, 70].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setStandaloneTargetMargin(preset)}
                            className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all ${
                              standaloneTargetMargin === preset
                                ? 'bg-brand-gold text-black font-black'
                                : 'bg-[#181818] text-gray-400 border border-white/5 hover:text-white'
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Plate Cost Breakdown Strip */}
                    <div className="p-3 bg-[#121211] rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-mono">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-400 text-[9px] uppercase font-bold">Plate Breakdown:</span>
                        <span className="px-2 py-0.5 rounded bg-brand-gold/10 border border-brand-gold/30 text-brand-gold font-bold">
                          🥩 Viand ({servingG}{standaloneBatchUnit === 'pcs' ? ' pcs' : 'g'}): ₱{viandCostPerServing.toFixed(2)} ({((viandCostPerServing / Math.max(0.01, totalPlateCogs)) * 100).toFixed(0)}%)
                        </span>
                        <span className="text-gray-500">+</span>
                        <span className={`px-2 py-0.5 rounded border font-bold ${
                          standaloneIncludeRice
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-white/5 border-white/10 text-gray-500'
                        }`}>
                          🍚 Rice ({standaloneIncludeRice ? `${Number(standaloneRicePortionGrams) || 0}g` : '0g'}): ₱{riceCostPerServing.toFixed(2)} ({standaloneIncludeRice ? ((riceCostPerServing / Math.max(0.01, totalPlateCogs)) * 100).toFixed(0) : 0}%)
                        </span>
                        <span className="text-gray-500">+</span>
                        <span className={`px-2 py-0.5 rounded border font-bold ${
                          standaloneIncludeGarnishes
                            ? 'bg-amber-400/10 border-amber-400/30 text-amber-300'
                            : 'bg-white/5 border-white/10 text-gray-500'
                        }`}>
                          🍳 Toppings/Garnishes: ₱{garnishesCostPerServing.toFixed(2)} ({standaloneIncludeGarnishes ? ((garnishesCostPerServing / Math.max(0.01, totalPlateCogs)) * 100).toFixed(0) : 0}%)
                        </span>
                        <span className="text-gray-500">+</span>
                        <span className={`px-2 py-0.5 rounded border font-bold ${
                          standaloneIncludePackaging
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            : 'bg-white/5 border-white/10 text-gray-500'
                        }`}>
                          📦 Packaging: ₱{packagingCostPerServing.toFixed(2)} ({standaloneIncludePackaging ? ((packagingCostPerServing / Math.max(0.01, totalPlateCogs)) * 100).toFixed(0) : 0}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 text-[9px] uppercase font-bold">Total Plate COGS:</span>
                        <strong className="text-white text-sm">₱{totalPlateCogs.toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* High-Impact Result Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-mono">
                      <div className="bg-[#121211] p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-gray-500 uppercase text-[8px] font-bold block">1. Total Servings Yield</span>
                        <span className="text-base font-black text-blue-400 block">
                          {servingsProduced.toFixed(1)} <span className="text-[10px] text-gray-400">plates</span>
                        </span>
                        <span className="text-[8px] text-gray-400 block truncate">({batchWeightG}{standaloneBatchUnit === 'pcs' ? ' pcs' : 'g'} ÷ {servingG}{standaloneBatchUnit === 'pcs' ? ' pcs' : 'g'})</span>
                      </div>

                      <div className="bg-[#121211] p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-gray-500 uppercase text-[8px] font-bold block">2. Total Plate COGS</span>
                        <span className="text-base font-black text-brand-gold block">
                          ₱{totalPlateCogs.toFixed(2)}
                        </span>
                        <span className="text-[8px] text-gray-400 block truncate">
                          (Viand: ₱{viandCostPerServing.toFixed(1)}{standaloneIncludeRice ? ` + Rice: ₱${riceCostPerServing.toFixed(1)}` : ''}{standaloneIncludeGarnishes ? ` + Sides: ₱${garnishesCostPerServing.toFixed(1)}` : ''})
                        </span>
                      </div>

                      <div className="bg-[#121211] p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-gray-500 uppercase text-[8px] font-bold block">3. Recommended Price</span>
                        <span className="text-base font-black text-green-400 block">
                          ₱{recSellingPrice.toFixed(2)}
                        </span>
                        <span className="text-[8px] text-green-400 block truncate">+₱{profitPerPlate.toFixed(2)} profit / plate</span>
                      </div>

                      <div className="bg-[#121211] p-3 rounded-xl border border-white/5 space-y-1">
                        <span className="text-gray-500 uppercase text-[8px] font-bold block">4. Total Batch Net Profit</span>
                        <span className="text-base font-black text-emerald-400 block">
                          ₱{totalNetProfit.toFixed(2)}
                        </span>
                        <span className="text-[8px] text-gray-400 block truncate">Gross Rev: ₱{totalGrossRevenue.toFixed(0)}</span>
                      </div>
                    </div>

                    {/* Mathematical Proof & Summary Box */}
                    <div className="p-3 bg-[#121211]/80 rounded-xl border border-white/5 text-[9.5px] text-gray-300 leading-relaxed font-sans space-y-1">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        <span>Commercial Production Summary:</span>
                      </div>
                      <p>
                        A bulk viand batch of <strong className="text-brand-gold">{standaloneBatchUnit === 'pcs' ? `${batchWeightG} pcs` : `${(batchWeightG / 1000).toFixed(2)} kg (${batchWeightG}g)`}</strong> raw materials costing <strong className="text-brand-gold">₱{batchCost.toLocaleString()}</strong> produces exactly <strong className="text-blue-400">{servingsProduced.toFixed(1)} full portions</strong> at <strong className="text-white">{servingG} {standaloneBatchUnit === 'pcs' ? 'pcs' : 'grams of meat'} per plate</strong>.
                      </p>
                      {standaloneIncludeRice ? (
                        <p className="text-amber-300">
                          🍚 <strong>Steamed Rice Requirement:</strong> Serving all {servingsProduced.toFixed(1)} plates with {Number(standaloneRicePortionGrams) || 0}g of rice per plate requires <strong className="text-white">{((servingsProduced * (Number(standaloneRicePortionGrams) || 0)) / 1000).toFixed(2)} kg of cooked rice</strong>, costing <strong className="text-white">₱{totalRiceBatchCostForViand.toFixed(2)}</strong> (₱{riceCostPerServing.toFixed(2)} / plate).
                        </p>
                      ) : (
                        <p className="text-gray-400 italic">
                          💡 Steamed rice is not included in this plate. Costing reflects viand/meat only.
                        </p>
                      )}
                      {standaloneIncludeGarnishes && standaloneSelectedGarnishes.filter(g => g.selected).length > 0 && (
                        <p className="text-amber-200">
                          🍳 <strong>Plate Sides & Garnishes:</strong> Includes {standaloneSelectedGarnishes.filter(g => g.selected).map(g => `${g.amount}x ${g.name}`).join(', ')} at <strong className="text-white">₱{garnishesCostPerServing.toFixed(2)} / plate</strong> (₱{totalGarnishesBatchCostForViand.toFixed(2)} total batch cost).
                        </p>
                      )}
                      <p className="font-mono text-gray-400 text-[8.5px]">
                        Viand COGS: ₱{viandCostPerServing.toFixed(2)} • Rice COGS: ₱{riceCostPerServing.toFixed(2)} • Garnishes: ₱{garnishesCostPerServing.toFixed(2)} • Total Plate COGS: ₱{totalPlateCogs.toFixed(2)} • At {Number(standaloneTargetMargin) || 0}% margin, selling price is ₱{recSellingPrice} leaving ₱{profitPerPlate.toFixed(2)} profit per plate (₱{totalNetProfit.toFixed(2)} total profit per batch).
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          const sheetText = `CURVADA'S KITCHEN - BATCH PRODUCTION & PORTION SHEET
Recipe Title: ${standaloneRecipeName}
Viand Batch Yield: ${standaloneBatchUnit === 'pcs' ? `${batchWeightG} pcs` : `${(batchWeightG / 1000).toFixed(2)} kg (${batchWeightG} grams cooked meat)`}
Viand Portion Size: ${servingG} ${standaloneBatchUnit === 'pcs' ? 'pcs' : 'grams'} / plate
Total Servings Produced: ${servingsProduced.toFixed(1)} plates
Overall Viand Batch Cost: ₱${batchCost.toFixed(2)}
Viand COGS per Serving: ₱${viandCostPerServing.toFixed(2)}

STEAMED RICE COSTING:
Included in Meal: ${standaloneIncludeRice ? 'YES' : 'NO (Viand Only)'}
${standaloneIncludeRice ? `Rice Portion per Plate: ${standaloneRicePortionGrams} grams
Rice Cost Rate: ₱${Number(standaloneRiceCostPerGram).toFixed(4)} / gram (₱${((Number(standaloneRicePortionGrams) || 0) * (Number(standaloneRiceCostPerGram) || 0)).toFixed(2)} per plate)
Total Cooked Rice Needed for Batch: ${((servingsProduced * (Number(standaloneRicePortionGrams) || 0)) / 1000).toFixed(2)} kg
Total Rice Cost for this Viand Batch: ₱${totalRiceBatchCostForViand.toFixed(2)}` : 'Steamed Rice Cost: ₱0.00'}

PLATE TOPPINGS, GARNISHES & SIDES (PER SERVING):
Included: ${standaloneIncludeGarnishes ? 'YES' : 'NO'}
${standaloneIncludeGarnishes ? standaloneSelectedGarnishes.filter(g => g.selected).map(g => `- ${g.amount}x ${g.name} (@ ₱${(Number(g.costPerUnit) || 0).toFixed(2)}/pc) = ₱${((Number(g.amount) || 1) * (Number(g.costPerUnit) || 0)).toFixed(2)} / plate`).join('\n') : 'Sides Cost: ₱0.00'}
Total Garnishes Cost per Plate: ₱${garnishesCostPerServing.toFixed(2)}
Total Garnishes Batch Cost: ₱${totalGarnishesBatchCostForViand.toFixed(2)}

COMBINED PLATE METRICS:
Total Plate COGS (Viand + Rice + Sides + Pkg): ₱${totalPlateCogs.toFixed(2)}
Target Margin: ${standaloneTargetMargin}%
Recommended Selling Price: ₱${recSellingPrice.toFixed(2)}
Net Profit per Plate: ₱${profitPerPlate.toFixed(2)}
Total Projected Batch Revenue: ₱${totalGrossRevenue.toFixed(2)}
Total Projected Batch Net Profit: ₱${totalNetProfit.toFixed(2)}

VIAND RAW MATERIALS BREAKDOWN:
${standaloneIngredients.map((item, idx) => {
  const invMatch = ingredientsInventory.find(inv => inv.name.toLowerCase() === item.name.toLowerCase());
  const u = (item.unit || invMatch?.unit || 'g').toLowerCase();
  const isCountable = u === 'pcs' || u === 'cans' || u === 'pc' || u === 'pack';
  const rawAmt = Number(item.batchAmount) || 0;
  const scaled = (rawAmt / batchWeightG) * servingG;
  const servingAmt = isCountable 
    ? (rawAmt <= 1 ? 1 : Math.max(1, Math.round(scaled))) 
    : (rawAmt <= 0 ? 0 : (recipeAllowDecimals ? Math.max(0.1, Number(scaled.toFixed(1))) : Math.max(1, Math.round(scaled))));
  const sCost = (((Number(item.cost) || 0) / batchWeightG) * servingG).toFixed(2);
  return `${idx + 1}. ${item.name}: Batch ${item.batchAmount}${item.unit} (₱${item.cost}) -> Portion ${servingAmt}${item.unit} (₱${sCost})`;
}).join('\n')}
`;
                          navigator.clipboard.writeText(sheetText);
                          setBatchCalcCopied(true);
                          setTimeout(() => setBatchCalcCopied(false), 2500);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-[#121211] hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        {batchCalcCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        <span>{batchCalcCopied ? 'Batch Sheet Copied!' : 'Copy Batch Recipe Sheet'}</span>
                      </button>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setIsBatchCalcModalOpen(false)}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-[#181818] border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Close
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveAllBatchCostingChanges({ closeModal: true, openMenuForm: true })}
                          className="flex-1 sm:flex-initial px-5 py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-black rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Save className="w-4 h-4 text-black" />
                          <span>🍱 Apply & Save All Costing to Dish (Set Price ₱{recSellingPrice.toFixed(2)}) →</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* --- TAB PANEL: FINANCIALS PERFORMANCE & OPERATIONS REPORT --- */}
      {chefTab === 'finances' && (() => {
        // Dynamic financial calculations with month-by-month filtering
        const calculatePeriodFinancials = (daysCount: number) => {
          let effectiveDaysCount = daysCount;
          let periodOrders: Order[] = [];

          if (selectedFinancialMonth !== 'all') {
            const [targetYear, targetMonth] = selectedFinancialMonth.split('-').map(Number);
            // Effective days count for selected calendar month
            effectiveDaysCount = new Date(targetYear, targetMonth, 0).getDate();

            periodOrders = orders.filter((o) => {
              if (!o.timestamp) return false;
              const orderDate = new Date(o.timestamp);
              return (
                orderDate.getFullYear() === targetYear &&
                (orderDate.getMonth() + 1) === targetMonth
              );
            });
          } else {
            const startTime = Date.now() - daysCount * 24 * 60 * 60 * 1000;
            periodOrders = orders.filter((o) => {
              const orderDate = new Date(o.timestamp);
              return orderDate.getTime() >= startTime;
            });
          }

          let deliveredOrders = periodOrders.filter(o => o.status === 'delivered');
          if (deliveredOrders.length === 0) {
            deliveredOrders = periodOrders.filter(o => o.status !== 'cancelled');
          }

          const totalSales = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

          const getUnitPrice = (unit: string, ingId?: string) => {
            if (ingId) {
              const ing = ingredientsInventory.find(i => i.id === ingId);
              if (ing && ing.costPerUnit !== undefined && ing.costPerUnit !== null) {
                return ing.costPerUnit;
              }
            }
            switch (unit.toLowerCase()) {
              case 'g': return 0.05;      // ₱0.05 per gram (₱50 per kg)
              case 'kg': return 150.00;   // ₱150.00 per kg
              case 'pcs': return 15.00;   // ₱15.00 per piece
              case 'ml': return 0.08;     // ₱0.08 per ml
              case 'cans': return 45.00;  // ₱45.00 per can
              default: return 5.00;
            }
          };

          let ingredientsCost = 0;
          let totalDishes = 0;

          deliveredOrders.forEach(order => {
            order.items.forEach(cartItem => {
              totalDishes += cartItem.quantity;
              const item = cartItem.menuItem;
              const qty = cartItem.quantity;

              if (item.recipeRequirements && item.recipeRequirements.length > 0) {
                item.recipeRequirements.forEach(req => {
                  const ing = ingredientsInventory.find(i => i.name.toLowerCase() === req.name.toLowerCase());
                  const unitPrice = getUnitPrice(ing ? ing.unit : 'g', ing?.id);
                  const amountFactor = (ing && ing.unit === 'kg') ? req.amount / 1000 : req.amount;
                  ingredientsCost += amountFactor * unitPrice * qty;
                });
              } else if (item.ingredients && item.ingredients.length > 0) {
                item.ingredients.forEach(ingName => {
                  const ing = ingredientsInventory.find(i => i.name.toLowerCase() === ingName.toLowerCase());
                  const unit = ing ? ing.unit : 'g';
                  const reqPerServing = (unit === 'pcs' || unit === 'cans') ? 1 : unit === 'kg' ? 0.1 : 100;
                  ingredientsCost += reqPerServing * getUnitPrice(unit, ing?.id) * qty;
                });
              } else {
                ingredientsCost += (item.price * 0.35) * qty;
              }
            });
          });

          const electricityCost = (electricityBaseRate * effectiveDaysCount) + (totalDishes * electricityVariableRate);
          const waterCost = waterBaseRate * effectiveDaysCount;
          const rentCost = rentBaseRate * effectiveDaysCount;
          const laborCost = laborBaseRate * effectiveDaysCount;
          const gasCost = gasBaseRate * effectiveDaysCount;
          const otherCost = otherBaseRate * effectiveDaysCount;

          const totalExpenses = ingredientsCost + electricityCost + waterCost + rentCost + laborCost + gasCost + otherCost;
          const netProfit = totalSales - totalExpenses;
          const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

          return {
            daysCount: effectiveDaysCount,
            ordersCount: deliveredOrders.length,
            dishesCount: totalDishes,
            totalSales,
            ingredientsCost,
            electricityCost,
            waterCost,
            rentCost,
            laborCost,
            gasCost,
            otherCost,
            totalExpenses,
            netProfit,
            profitMargin
          };
        };

        const finDay = calculatePeriodFinancials(1);
        const finWeek = calculatePeriodFinancials(7);
        const finMonth = calculatePeriodFinancials(30);
        const finYear = calculatePeriodFinancials(365);

        // Map to active period context
        const activeFin = 
          financesPeriod === 'day' ? finDay :
          financesPeriod === 'week' ? finWeek :
          financesPeriod === 'month' ? finMonth : finYear;

        const activeTargetSales = 
          financesPeriod === 'day' ? targetSalesDay :
          financesPeriod === 'week' ? targetSalesWeek :
          financesPeriod === 'month' ? targetSalesMonth : targetSalesYear;

        const setActiveTargetSales = (val: number) => {
          if (financesPeriod === 'day') setTargetSalesDay(val);
          else if (financesPeriod === 'week') setTargetSalesWeek(val);
          else if (financesPeriod === 'month') setTargetSalesMonth(val);
          else setTargetSalesYear(val);
        };

        const activeTargetProfit = 
          financesPeriod === 'day' ? targetProfitDay :
          financesPeriod === 'week' ? targetProfitWeek :
          financesPeriod === 'month' ? targetProfitMonth : targetProfitYear;

        const setActiveTargetProfit = (val: number) => {
          if (financesPeriod === 'day') setTargetProfitDay(val);
          else if (financesPeriod === 'week') setTargetProfitWeek(val);
          else if (financesPeriod === 'month') setTargetProfitMonth(val);
          else setTargetProfitYear(val);
        };

        const salesPercent = activeTargetSales > 0 ? Math.min(100, (activeFin.totalSales / activeTargetSales) * 100) : 0;
        const profitPercent = activeTargetProfit > 0 ? Math.min(100, (activeFin.netProfit / activeTargetProfit) * 100) : 0;

        return (
          <div className="space-y-6">
            
            {/* Top Period Selector & Title Card */}
            <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-black text-white text-base flex items-center gap-2">
                    💰 Culinary Financial Performance & Target Tracker
                  </h3>
                  {selectedFinancialMonth !== 'all' && (
                    <span className="text-[10px] bg-brand-gold/10 text-brand-gold font-bold px-2.5 py-0.5 rounded-full border border-brand-gold/30 flex items-center gap-1">
                      🗓️ Auditing Month: {availableMonthsOptions.find(m => m.value === selectedFinancialMonth)?.label} ({activeFin.daysCount} Days)
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs mt-0.5">
                  Track actual sales, operational expenses, net profit, and set milestones across different business timelines.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Month Dropdown Selector */}
                <div className="flex items-center gap-2 bg-[#0D0D0C] p-1.5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-2 flex items-center gap-1">
                    📅 Audit Month:
                  </span>
                  <select
                    value={selectedFinancialMonth}
                    onChange={(e) => {
                      setSelectedFinancialMonth(e.target.value);
                      if (e.target.value !== 'all') {
                        setFinancesPeriod('month');
                      }
                    }}
                    className="bg-[#181818] text-brand-gold font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none border border-brand-gold/30 cursor-pointer"
                  >
                    <option value="all">All Months (Rolling Window)</option>
                    {availableMonthsOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Time Horizon Toggles */}
                <div className="flex bg-[#0D0D0C] p-1.5 rounded-2xl border border-white/5 gap-1 flex-1 md:flex-none">
                  {(['day', 'week', 'month', 'year'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setFinancesPeriod(p);
                        if (p !== 'month') {
                          setSelectedFinancialMonth('all');
                        }
                      }}
                      className={`flex-1 md:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                        financesPeriod === p && selectedFinancialMonth === 'all'
                          ? 'bg-brand-red text-white shadow-md'
                          : financesPeriod === p && selectedFinancialMonth !== 'all'
                          ? 'bg-brand-gold text-black shadow-md font-extrabold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {p === 'day' ? 'Daily' : p === 'week' ? 'Weekly' : p === 'month' ? (selectedFinancialMonth !== 'all' ? 'Month Selected' : 'Monthly') : 'Yearly'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main KPIs Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* TOTAL SALES KPI */}
              <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">📈 Gross Revenue</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase ${
                    activeFin.totalSales >= activeTargetSales 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                  }`}>
                    {activeFin.totalSales >= activeTargetSales ? 'Target Achieved' : 'In Progress'}
                  </span>
                </div>

                <div>
                  <h4 className="text-3xl font-display font-black text-white">
                    ₱{activeFin.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                  <div className="flex items-center justify-between mt-2.5 text-xs text-gray-400 font-medium">
                    <span>Target Sales:</span>
                    <div className="flex items-center gap-1 bg-[#0D0D0C] px-2.5 py-1 rounded-xl border border-white/10">
                      <span className="text-[10px] text-gray-500 font-bold">₱</span>
                      <input
                        type="number"
                        min="1"
                        value={activeTargetSales}
                        onChange={(e) => setActiveTargetSales(Number(e.target.value) || 0)}
                        className="w-20 bg-transparent text-right font-mono font-bold text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400">
                    <span>Goal Progress</span>
                    <span className="text-brand-gold font-mono">{salesPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#0D0D0C] rounded-full h-2 overflow-hidden border border-white/5">
                    <div 
                      className="bg-brand-red h-full rounded-full transition-all duration-500 shadow-lg shadow-brand-red/30"
                      style={{ width: `${salesPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* TOTAL EXPENSES KPI */}
              <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">💸 Total Operating Cost</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                    Cash Outflow
                  </span>
                </div>

                <div>
                  <h4 className="text-3xl font-display font-black text-red-500">
                    ₱{activeFin.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                  <p className="text-xs text-gray-400 mt-2.5">
                    Constitutes <strong className="text-white font-mono">{activeFin.totalSales > 0 ? ((activeFin.totalExpenses / activeFin.totalSales) * 100).toFixed(1) : '0.0'}%</strong> of gross revenues earned during this period.
                  </p>
                </div>

                {/* mini cost items breakdown */}
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#0D0D0C]/80 p-2.5 rounded-xl border border-white/5">
                  <div className="text-gray-400 flex justify-between">
                    <span>Ingredients:</span>
                    <strong className="text-white font-mono">₱{activeFin.ingredientsCost.toFixed(0)}</strong>
                  </div>
                  <div className="text-gray-400 flex justify-between">
                    <span>Electricity:</span>
                    <strong className="text-white font-mono">₱{activeFin.electricityCost.toFixed(0)}</strong>
                  </div>
                  <div className="text-gray-400 flex justify-between">
                    <span>Rent:</span>
                    <strong className="text-white font-mono">₱{activeFin.rentCost.toFixed(0)}</strong>
                  </div>
                  <div className="text-gray-400 flex justify-between">
                    <span>Labor:</span>
                    <strong className="text-white font-mono">₱{activeFin.laborCost.toFixed(0)}</strong>
                  </div>
                </div>
              </div>

              {/* NET PROFITS KPI */}
              <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">💎 Net Takeaway (Profit)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase ${
                    activeFin.netProfit >= 0 
                      ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20' 
                      : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {activeFin.netProfit >= 0 ? 'Profitable' : 'Deficit'}
                  </span>
                </div>

                <div>
                  <h4 className={`text-3xl font-display font-black ${activeFin.netProfit >= 0 ? 'text-brand-gold' : 'text-red-500'}`}>
                    ₱{activeFin.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                  <div className="flex items-center justify-between mt-2.5 text-xs text-gray-400 font-medium">
                    <span>Target Profit:</span>
                    <div className="flex items-center gap-1 bg-[#0D0D0C] px-2.5 py-1 rounded-xl border border-white/10">
                      <span className="text-[10px] text-gray-500 font-bold">₱</span>
                      <input
                        type="number"
                        min="1"
                        value={activeTargetProfit}
                        onChange={(e) => setActiveTargetProfit(Number(e.target.value) || 0)}
                        className="w-20 bg-transparent text-right font-mono font-bold text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400">
                    <span>Margin: <strong className="text-white font-mono">{activeFin.profitMargin.toFixed(1)}%</strong></span>
                    <span className="font-mono text-white">{activeFin.netProfit >= activeTargetProfit ? '🎯 Target Reached' : 'On Track'}</span>
                  </div>
                  <div className="w-full h-2 bg-[#0D0D0C] rounded-full overflow-hidden border border-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        activeFin.netProfit >= activeTargetProfit ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-brand-red to-brand-gold'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, (activeFin.netProfit / Math.max(1, activeTargetProfit)) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Interactive Sliders for Operating Costs */}
            <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-white font-display font-bold text-sm">
                      ⚙️ Configure Operating Rates & Base Expenses ({expenseInputMode === 'monthly' ? 'Monthly Baselines' : 'Per-Day Baselines'})
                    </h4>
                    {monthlyRatesMap[selectedFinancialMonth === 'all' ? 'default' : selectedFinancialMonth] ? (
                      <span className="text-[9px] bg-green-500/10 text-green-400 font-bold px-2 py-0.5 rounded border border-green-500/20">
                        ✓ Saved Custom Month Baselines
                      </span>
                    ) : (
                      <span className="text-[9px] bg-white/5 text-gray-400 font-bold px-2 py-0.5 rounded border border-white/10">
                        Global Standard Baselines
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {selectedFinancialMonth !== 'all' 
                      ? `Adjust baseline operating expenses for ${availableMonthsOptions.find(m => m.value === selectedFinancialMonth)?.label || selectedFinancialMonth}. Rates scale for ${activeFin.daysCount} days.`
                      : `Adjust standard operational expenses here. Rates scale across period context (${activeFin.daysCount} days).`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Lock / Unlock Edit Controls */}
                  {!isEditingRates ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingRates(true)}
                      className="px-4 py-2 bg-brand-gold hover:opacity-90 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      ✏️ Edit Operating Rates
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveMonthlyRates}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer animate-pulse"
                      >
                        💾 Save {selectedFinancialMonth !== 'all' ? 'Month Rates' : 'Default Rates'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingRates(false);
                          const targetKey = selectedFinancialMonth === 'all' ? 'default' : selectedFinancialMonth;
                          const saved = monthlyRatesMap[targetKey];
                          if (saved) {
                            setElectricityBaseRate(saved.electricityBaseRate);
                            setElectricityVariableRate(saved.electricityVariableRate);
                            setWaterBaseRate(saved.waterBaseRate);
                            setRentBaseRate(saved.rentBaseRate);
                            setLaborBaseRate(saved.laborBaseRate);
                            setGasBaseRate(saved.gasBaseRate);
                            setOtherBaseRate(saved.otherBaseRate);
                          }
                        }}
                        className="px-3 py-2 bg-[#0D0D0C] border border-white/10 hover:bg-[#222222] text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                      >
                        ✖️ Cancel
                      </button>
                    </div>
                  )}

                  {/* Input Mode Toggle (Monthly vs Daily) */}
                  <div className="flex items-center gap-1 bg-[#0D0D0C] p-1 rounded-2xl border border-white/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpenseInputMode('monthly')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        expenseInputMode === 'monthly'
                          ? 'bg-brand-red text-white shadow-md shadow-brand-red/20'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      📅 Monthly (/mo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseInputMode('daily')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        expenseInputMode === 'daily'
                          ? 'bg-brand-gold text-black shadow-md shadow-brand-gold/20'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      ☀️ Per-Day (/day)
                    </button>
                  </div>
                </div>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all ${!isEditingRates ? 'opacity-75' : ''}`}>
                
                {/* Electricity Card */}
                <div className="bg-[#0D0D0C]/80 border border-white/5 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      ⚡ Electricity Rate
                    </span>
                    <span className="text-[10px] font-mono text-brand-gold font-bold">
                      ₱{(activeFin.electricityCost).toFixed(2)} total
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>{expenseInputMode === 'monthly' ? 'Monthly Base Rate:' : 'Daily Base Rate:'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-white">₱</span>
                        <input
                          type="number"
                          disabled={!isEditingRates}
                          min="0"
                          max={expenseInputMode === 'monthly' ? 30000 : 1000}
                          step="any"
                          value={expenseInputMode === 'monthly' ? Number((electricityBaseRate * 30).toFixed(2)) : electricityBaseRate}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setElectricityBaseRate(expenseInputMode === 'monthly' ? val / 30 : val);
                          }}
                          className={`w-20 bg-[#0D0D0C] border rounded px-1.5 py-0.5 text-[10px] text-white font-mono font-bold focus:outline-none focus:border-brand-red text-right ${
                            !isEditingRates ? 'border-white/5 text-gray-500 cursor-not-allowed' : 'border-white/10'
                          }`}
                        />
                        <span className="text-[9px] text-gray-400">{expenseInputMode === 'monthly' ? '/mo' : '/day'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      disabled={!isEditingRates}
                      min="0"
                      max={expenseInputMode === 'monthly' ? 30000 : 1000}
                      step={expenseInputMode === 'monthly' ? 250 : 25}
                      value={expenseInputMode === 'monthly' ? Math.round(electricityBaseRate * 30) : electricityBaseRate}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setElectricityBaseRate(expenseInputMode === 'monthly' ? val / 30 : val);
                      }}
                      className={`w-full h-1 bg-white/15 rounded-lg appearance-none accent-brand-red ${
                        !isEditingRates ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>Variable Rate per Dish:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-white">₱</span>
                        <input
                          type="number"
                          disabled={!isEditingRates}
                          min="0"
                          max="100"
                          step="any"
                          value={electricityVariableRate}
                          onChange={(e) => setElectricityVariableRate(Number(e.target.value) || 0)}
                          className={`w-16 bg-[#0D0D0C] border rounded px-1.5 py-0.5 text-[10px] text-white font-mono font-bold focus:outline-none focus:border-brand-red text-right ${
                            !isEditingRates ? 'border-white/5 text-gray-500 cursor-not-allowed' : 'border-white/10'
                          }`}
                        />
                        <span className="text-[9px] text-gray-400">/plate</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      disabled={!isEditingRates}
                      min="0"
                      max="100"
                      step="1"
                      value={electricityVariableRate}
                      onChange={(e) => setElectricityVariableRate(Number(e.target.value))}
                      className={`w-full h-1 bg-white/15 rounded-lg appearance-none accent-brand-red ${
                        !isEditingRates ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                    />
                  </div>
                </div>

                {/* Water Utility Card */}
                <div className="bg-[#0D0D0C]/80 border border-white/5 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      💧 Water Utilities
                    </span>
                    <span className="text-[10px] font-mono text-brand-gold font-bold">
                      ₱{activeFin.waterCost.toFixed(2)} total
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>{expenseInputMode === 'monthly' ? 'Monthly Water Baseline:' : 'Daily Water Baseline:'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-white">₱</span>
                        <input
                          type="number"
                          disabled={!isEditingRates}
                          min="0"
                          max={expenseInputMode === 'monthly' ? 15000 : 500}
                          step="any"
                          value={expenseInputMode === 'monthly' ? Number((waterBaseRate * 30).toFixed(2)) : waterBaseRate}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setWaterBaseRate(expenseInputMode === 'monthly' ? val / 30 : val);
                          }}
                          className={`w-20 bg-[#0D0D0C] border rounded px-1.5 py-0.5 text-[10px] text-white font-mono font-bold focus:outline-none focus:border-brand-red text-right ${
                            !isEditingRates ? 'border-white/5 text-gray-500 cursor-not-allowed' : 'border-white/10'
                          }`}
                        />
                        <span className="text-[9px] text-gray-400">{expenseInputMode === 'monthly' ? '/mo' : '/day'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      disabled={!isEditingRates}
                      min="0"
                      max={expenseInputMode === 'monthly' ? 15000 : 500}
                      step={expenseInputMode === 'monthly' ? 100 : 10}
                      value={expenseInputMode === 'monthly' ? Math.round(waterBaseRate * 30) : waterBaseRate}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setWaterBaseRate(expenseInputMode === 'monthly' ? val / 30 : val);
                      }}
                      className={`w-full h-1 bg-white/15 rounded-lg appearance-none accent-brand-red ${
                        !isEditingRates ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 leading-tight">
                    Simulates ongoing washing of culinary utensils, pans, and sanitation water.
                  </p>
                </div>

                {/* Store Rent Card */}
                <div className="bg-[#0D0D0C]/80 border border-white/5 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      🏠 Rent / Facility Lease
                    </span>
                    <span className="text-[10px] font-mono text-brand-gold font-bold">
                      ₱{activeFin.rentCost.toFixed(2)} total
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>{expenseInputMode === 'monthly' ? 'Monthly Store Lease:' : 'Daily Store Lease:'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-white">₱</span>
                        <input
                          type="number"
                          disabled={!isEditingRates}
                          min="0"
                          max={expenseInputMode === 'monthly' ? 60000 : 2000}
                          step="any"
                          value={expenseInputMode === 'monthly' ? Number((rentBaseRate * 30).toFixed(2)) : rentBaseRate}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setRentBaseRate(expenseInputMode === 'monthly' ? val / 30 : val);
                          }}
                          className={`w-20 bg-[#0D0D0C] border rounded px-1.5 py-0.5 text-[10px] text-white font-mono font-bold focus:outline-none focus:border-brand-red text-right ${
                            !isEditingRates ? 'border-white/5 text-gray-500 cursor-not-allowed' : 'border-white/10'
                          }`}
                        />
                        <span className="text-[9px] text-gray-400">{expenseInputMode === 'monthly' ? '/mo' : '/day'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      disabled={!isEditingRates}
                      min="0"
                      max={expenseInputMode === 'monthly' ? 60000 : 2000}
                      step={expenseInputMode === 'monthly' ? 500 : 50}
                      value={expenseInputMode === 'monthly' ? Math.round(rentBaseRate * 30) : rentBaseRate}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRentBaseRate(expenseInputMode === 'monthly' ? val / 30 : val);
                      }}
                      className={`w-full h-1 bg-white/15 rounded-lg appearance-none accent-brand-red ${
                        !isEditingRates ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 leading-tight">
                    Cost share of the physical kitchen space lease.
                  </p>
                </div>

                {/* Labor Payroll Card */}
                <div className="bg-[#0D0D0C]/80 border border-white/5 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      👥 Kitchen Crew & Staff Wages
                    </span>
                    <span className="text-[10px] font-mono text-brand-gold font-bold">
                      ₱{activeFin.laborCost.toFixed(2)} total
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>{expenseInputMode === 'monthly' ? 'Monthly Wages Baseline:' : 'Daily Wages Baseline:'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-white">₱</span>
                        <input
                          type="number"
                          disabled={!isEditingRates}
                          min="0"
                          max={expenseInputMode === 'monthly' ? 150000 : 5000}
                          step="any"
                          value={expenseInputMode === 'monthly' ? Number((laborBaseRate * 30).toFixed(2)) : laborBaseRate}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setLaborBaseRate(expenseInputMode === 'monthly' ? val / 30 : val);
                          }}
                          className={`w-20 bg-[#0D0D0C] border rounded px-1.5 py-0.5 text-[10px] text-white font-mono font-bold focus:outline-none focus:border-brand-red text-right ${
                            !isEditingRates ? 'border-white/5 text-gray-500 cursor-not-allowed' : 'border-white/10'
                          }`}
                        />
                        <span className="text-[9px] text-gray-400">{expenseInputMode === 'monthly' ? '/mo' : '/day'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      disabled={!isEditingRates}
                      min="0"
                      max={expenseInputMode === 'monthly' ? 150000 : 5000}
                      step={expenseInputMode === 'monthly' ? 1000 : 100}
                      value={expenseInputMode === 'monthly' ? Math.round(laborBaseRate * 30) : laborBaseRate}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLaborBaseRate(expenseInputMode === 'monthly' ? val / 30 : val);
                      }}
                      className={`w-full h-1 bg-white/15 rounded-lg appearance-none accent-brand-red ${
                        !isEditingRates ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 leading-tight">
                    Payroll compensation allocated for the kitchen crew.
                  </p>
                </div>

                {/* LPG / Cooking Gas Card */}
                <div className="bg-[#0D0D0C]/80 border border-white/5 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      🔥 Cooking Gas (LPG)
                    </span>
                    <span className="text-[10px] font-mono text-brand-gold font-bold">
                      ₱{activeFin.gasCost.toFixed(2)} total
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>{expenseInputMode === 'monthly' ? 'Monthly LPG Usage:' : 'Daily LPG Usage:'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-white">₱</span>
                        <input
                          type="number"
                          disabled={!isEditingRates}
                          min="0"
                          max={expenseInputMode === 'monthly' ? 15000 : 500}
                          step="any"
                          value={expenseInputMode === 'monthly' ? Number((gasBaseRate * 30).toFixed(2)) : gasBaseRate}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setGasBaseRate(expenseInputMode === 'monthly' ? val / 30 : val);
                          }}
                          className={`w-20 bg-[#0D0D0C] border rounded px-1.5 py-0.5 text-[10px] text-white font-mono font-bold focus:outline-none focus:border-brand-red text-right ${
                            !isEditingRates ? 'border-white/5 text-gray-500 cursor-not-allowed' : 'border-white/10'
                          }`}
                        />
                        <span className="text-[9px] text-gray-400">{expenseInputMode === 'monthly' ? '/mo' : '/day'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      disabled={!isEditingRates}
                      min="0"
                      max={expenseInputMode === 'monthly' ? 15000 : 500}
                      step={expenseInputMode === 'monthly' ? 100 : 10}
                      value={expenseInputMode === 'monthly' ? Math.round(gasBaseRate * 30) : gasBaseRate}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setGasBaseRate(expenseInputMode === 'monthly' ? val / 30 : val);
                      }}
                      className={`w-full h-1 bg-white/15 rounded-lg appearance-none accent-brand-red ${
                        !isEditingRates ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 leading-tight">
                    Estimated consumption of cylinder fuel for stove operations.
                  </p>
                </div>

                {/* Other Marketing / Ops Card */}
                <div className="bg-[#0D0D0C]/80 border border-white/5 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      📦 Packaging & Marketing
                    </span>
                    <span className="text-[10px] font-mono text-brand-gold font-bold">
                      ₱{activeFin.otherCost.toFixed(2)} total
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>{expenseInputMode === 'monthly' ? 'Monthly Packaging Rate:' : 'Daily Packaging Rate:'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-white">₱</span>
                        <input
                          type="number"
                          disabled={!isEditingRates}
                          min="0"
                          max={expenseInputMode === 'monthly' ? 15000 : 500}
                          step="any"
                          value={expenseInputMode === 'monthly' ? Number((otherBaseRate * 30).toFixed(2)) : otherBaseRate}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setOtherBaseRate(expenseInputMode === 'monthly' ? val / 30 : val);
                          }}
                          className={`w-20 bg-[#0D0D0C] border rounded px-1.5 py-0.5 text-[10px] text-white font-mono font-bold focus:outline-none focus:border-brand-red text-right ${
                            !isEditingRates ? 'border-white/5 text-gray-500 cursor-not-allowed' : 'border-white/10'
                          }`}
                        />
                        <span className="text-[9px] text-gray-400">{expenseInputMode === 'monthly' ? '/mo' : '/day'}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      disabled={!isEditingRates}
                      min="0"
                      max={expenseInputMode === 'monthly' ? 15000 : 500}
                      step={expenseInputMode === 'monthly' ? 100 : 10}
                      value={expenseInputMode === 'monthly' ? Math.round(otherBaseRate * 30) : otherBaseRate}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setOtherBaseRate(expenseInputMode === 'monthly' ? val / 30 : val);
                      }}
                      className={`w-full h-1 bg-white/15 rounded-lg appearance-none accent-brand-red ${
                        !isEditingRates ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 leading-tight">
                    Covers paper bags, bento boxes, stickers, condiments, and social ads.
                  </p>
                </div>
              </div>
            </div>

            {/* Comprehensive Comparative Matrix */}
            <div className="bg-[#181818] border-2 border-white/5 rounded-[2rem] p-6 shadow-2xl space-y-4">
              <div>
                <h4 className="text-white font-display font-bold text-sm">📅 Cross-Period Financial Comparison Matrix</h4>
                <p className="text-gray-400 text-xs mt-0.5">
                  Analyze actual performance side-by-side across all time horizons to identify target trends.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-white/5 text-gray-500 uppercase tracking-wider text-[10px] font-black">
                      <th className="pb-3 pl-3">Timeline</th>
                      <th className="pb-3 text-right">Orders / Plates</th>
                      <th className="pb-3 text-right">Actual Sales / Target</th>
                      <th className="pb-3 text-right">Ingredient COGS</th>
                      <th className="pb-3 text-right">Operational Costs</th>
                      <th className="pb-3 text-right">Net Profit / Goal</th>
                      <th className="pb-3 pr-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {[
                      { label: 'Daily (1d)', fin: finDay, tgtSales: targetSalesDay, tgtProfit: targetProfitDay },
                      { label: 'Weekly (7d)', fin: finWeek, tgtSales: targetSalesWeek, tgtProfit: targetProfitWeek },
                      { label: 'Monthly (30d)', fin: finMonth, tgtSales: targetSalesMonth, tgtProfit: targetProfitMonth },
                      { label: 'Yearly (365d)', fin: finYear, tgtSales: targetSalesYear, tgtProfit: targetProfitYear },
                    ].map((row, idx) => {
                      const isSalesMet = row.fin.totalSales >= row.tgtSales;
                      const isProfitMet = row.fin.netProfit >= row.tgtProfit;
                      const operationalSum = row.fin.totalExpenses - row.fin.ingredientsCost;
                      return (
                        <tr key={idx} className="hover:bg-white/[0.01] transition-all">
                          <td className="py-3.5 pl-3 font-sans font-bold text-white text-xs">{row.label}</td>
                          <td className="py-3.5 text-right text-gray-300">
                            {row.fin.ordersCount} orders <span className="text-[10px] text-gray-500 font-sans">({row.fin.dishesCount} plates)</span>
                          </td>
                          <td className="py-3.5 text-right font-bold text-white">
                            ₱{row.fin.totalSales.toFixed(0)} <span className="text-[10px] text-gray-500 font-sans font-medium">/ ₱{row.tgtSales}</span>
                          </td>
                          <td className="py-3.5 text-right text-gray-400">₱{row.fin.ingredientsCost.toFixed(0)}</td>
                          <td className="py-3.5 text-right text-gray-400">₱{operationalSum.toFixed(0)}</td>
                          <td className={`py-3.5 text-right font-bold ${row.fin.netProfit >= 0 ? 'text-brand-gold' : 'text-red-500'}`}>
                            ₱{row.fin.netProfit.toFixed(0)} <span className="text-[10px] text-gray-500 font-sans font-medium">/ ₱{row.tgtProfit}</span>
                          </td>
                          <td className="py-3.5 pr-3 text-center">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-sans font-black uppercase tracking-wider ${
                              isSalesMet && isProfitMet 
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                : isSalesMet 
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {isSalesMet && isProfitMet ? '🥇 Optimal' : isSalesMet ? '📈 Revenue Met' : '⚠️ Shortfall'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}
        </div>

      {/* VIEW ACTIVE ORDER DETAILS OVERLAY */}
      {viewingOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#181818] border-2 border-white/10 rounded-[2rem] overflow-hidden shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            
            <div className="p-5 border-b-2 border-white/5 bg-[#0D0D0C] flex items-center justify-between">
              <h4 className="font-display font-black text-white text-base uppercase tracking-tight">
                Inspect Order #{viewingOrderDetails.id.slice(0, 8)}
              </h4>
              <button
                onClick={() => setViewingOrderDetails(null)}
                className="p-1.5 rounded-lg hover:bg-[#222222] text-gray-500 hover:text-white transition-all focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Customer summary */}
              <div className="bg-[#0D0D0C] border-2 border-white/5 p-4 rounded-2xl space-y-1.5 text-xs">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">Delivery Details</span>
                <p className="text-gray-300"><strong>Name:</strong> {viewingOrderDetails.customer.name}</p>
                <p className="text-gray-300"><strong>Phone:</strong> {viewingOrderDetails.customer.phone}</p>
                <p className="text-gray-300"><strong>Fulfillment Type:</strong> <span className="capitalize">{viewingOrderDetails.customer.orderType}</span></p>
                <p className="text-gray-300"><strong>Address:</strong> {viewingOrderDetails.customer.address}</p>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">Dishes list</span>
                
                <div className="space-y-2">
                  {viewingOrderDetails.items.map((item) => {
                    const isVerified = viewingOrderDetails.confirmedItemIds?.includes(item.id);
                    return (
                      <div key={item.id} className={`p-3 rounded-xl border-2 flex items-start gap-2 text-xs transition-all ${
                        isVerified ? 'bg-green-500/[0.03] border-green-500/20' : 'bg-[#0D0D0C] border-white/5'
                      }`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-bold">{item.quantity}x {item.menuItem.name}</p>
                            {isVerified ? (
                              <span className="text-[9px] bg-green-500/10 border border-green-500/20 text-green-400 font-extrabold px-1.5 py-0.5 rounded uppercase">✓ Verified received</span>
                            ) : (
                              <span className="text-[9px] bg-[#181818] border border-white/5 text-gray-500 font-bold px-1.5 py-0.5 rounded uppercase">Awaiting verification</span>
                            )}
                          </div>
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.selectedOptions.map((opt, optIdx) => (
                                <span
                                  key={optIdx}
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold border leading-none ${
                                    opt.choice.price > 0
                                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                      : 'bg-white/5 border-white/10 text-gray-300'
                                  }`}
                                >
                                  + {opt.choice.name} {opt.choice.price > 0 ? `(+₱${opt.choice.price.toFixed(2)})` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                            <p className="text-[10px] text-brand-gold font-bold mt-1">
                              Add-ons: {item.selectedAddOns.map(ao => `+${ao.name}`).join(', ')}
                            </p>
                          )}
                          {item.specialInstructions && (
                            <p className="text-[10px] text-gray-500 italic mt-1">
                              " {item.specialInstructions} "
                            </p>
                          )}
                        </div>
                        <span className="font-mono text-brand-gold font-bold">₱{(item.totalUnitPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total amount */}
              <div className="flex justify-between items-center pt-3 border-t-2 border-white/5 font-bold">
                <span className="text-white text-xs font-bold uppercase">Grand Total</span>
                <span className="text-brand-gold font-display font-extrabold text-base">₱{viewingOrderDetails.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 bg-[#0D0D0C] border-t-2 border-white/5 text-right">
              <button
                onClick={() => setViewingOrderDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-brand-red/25"
              >
                Dismiss
              </button>
            </div>

          </div>
        </div>
      )}



      {/* Custom Confirmation Modal for Data Reset */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-fade-in">
          <div className="bg-[#0F0F0E] border-2 border-brand-red/30 rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl relative space-y-6 text-center">
            
            {/* Red alert icon wrapper */}
            <div className="mx-auto w-16 h-16 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-3xl">
              🚨
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-black text-white text-xl tracking-tight uppercase">
                Reset Sales & Inventory?
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                You are about to wipe all transactions, order histories, and sales metrics. This is required if you want to start tracking total sales, revenue, and net profit from scratch (₱0.00).
              </p>
            </div>

            {/* Impact Details Panel */}
            <div className="bg-black/50 border border-white/5 rounded-2xl p-4 text-left space-y-2.5">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">What will happen:</span>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 text-gray-300">
                  <span className="text-brand-red mt-0.5">▪</span>
                  <p>All completed, active, and cancelled <strong>order histories</strong> will be permanently deleted.</p>
                </div>
                <div className="flex items-start gap-2 text-gray-300">
                  <span className="text-brand-red mt-0.5">▪</span>
                  <p>Real-Time Sales, Profit, and Expense metrics will be reset to <strong>₱0.00</strong>.</p>
                </div>
                <div className="flex items-start gap-2 text-gray-300">
                  <span className="text-brand-red mt-0.5">▪</span>
                  <p>Material inventory stocks and ready plate levels will be reset to standard healthy baseline levels.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-3 px-4 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-xs font-black uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllData) {
                    onClearAllData();
                  }
                  setShowClearConfirm(false);
                }}
                className="py-3 px-4 rounded-xl bg-brand-red text-white hover:bg-red-600 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-brand-red/25"
              >
                Yes, Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MANUAL POS ORDER TERMINAL (Walk-In / Messenger Order)
          ======================================================== */}
      {showManualOrderModal && (() => {
        const categories: { id: string; label: string }[] = [
          { id: 'all', label: 'All Dishes' },
          { id: 'bento', label: 'Bento' },
          { id: 'silog', label: 'Silog' },
          { id: 'rice-bowl', label: 'Rice Bowls' },
          { id: 'drinks', label: 'Drinks' },
        ];

        const filteredMenuItems = menuItems.filter((item) => {
          if (!item.isAvailable) return false;
          if (unavailableItemIds.includes(item.id)) return false;
          if (posSelectedCategory !== 'all' && item.category !== posSelectedCategory) return false;
          if (posSearchQuery.trim()) {
            const q = posSearchQuery.toLowerCase();
            return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
          }
          return true;
        });

        const posCartTotal = posCart.reduce((sum, item) => sum + item.totalUnitPrice * item.quantity, 0);
        const cashGiven = typeof posAmountTendered === 'number' ? posAmountTendered : 0;
        const changeDue = Math.max(0, cashGiven - posCartTotal);

        const availableDrinksList = menuItems.filter(
          (m) => m.category === 'drinks' && m.isAvailable && !unavailableItemIds.includes(m.id)
        );

        // Normalize options for selected item (split rice / extra rice / add drinks)
        const activeNormalizedOptionGroups = (() => {
          if (!posSelectedItem) return [];
          const groups: { title: string; choices: MenuOption[] }[] = [];

          if (posSelectedItem.customizableOptions) {
            posSelectedItem.customizableOptions.forEach((optGroup) => {
              const isRice = optGroup.title.toLowerCase().includes('rice');
              const hasExtraRice = optGroup.choices.some((c) => c.name.toLowerCase().includes('extra'));

              if (isRice && hasExtraRice && !optGroup.title.toLowerCase().includes('extra')) {
                // Included rice group
                const includedChoices = optGroup.choices
                  .filter((c) => !c.name.toLowerCase().includes('extra'))
                  .map((c) => ({
                    ...c,
                    name: c.name.replace(/\s*\(Upgrade\)/gi, '').trim(),
                  }));

                groups.push({
                  title: 'Rice (Included)',
                  choices:
                    includedChoices.length > 0
                      ? includedChoices
                      : [
                          { id: 'rice-garlic', name: 'Garlic Fried Rice', price: 0 },
                          { id: 'rice-plain', name: 'Plain Steamed Rice', price: 0 },
                          { id: 'rice-java', name: 'Java Rice', price: 20 },
                        ],
                });

                // Extra rice group
                const extraChoices = optGroup.choices.filter((c) => c.name.toLowerCase().includes('extra'));
                groups.push({
                  title: 'Extra Rice (Add-on)',
                  choices: [
                    { id: 'extra-rice-none', name: 'No Extra Rice', price: 0 },
                    ...(extraChoices.length > 0
                      ? extraChoices.map((c) => ({
                          ...c,
                          name: c.name.startsWith('+') ? c.name : `+1 ${c.name}`,
                        }))
                      : [
                          { id: 'extra-rice-plain', name: '+1 Extra Plain Rice', price: 15 },
                          { id: 'extra-rice-garlic', name: '+1 Extra Garlic Rice', price: 20 },
                          { id: 'extra-rice-java', name: '+1 Extra Java Rice', price: 25 },
                        ]),
                  ],
                });
              } else {
                groups.push(optGroup);
              }
            });
          }

          // Optional Drink add-on
          if (posSelectedItem.category !== 'drinks' && availableDrinksList.length > 0) {
            groups.unshift({
              title: 'Add a Drink (Optional)',
              choices: [
                { id: 'drink-none', name: 'No Drink', price: 0 },
                ...availableDrinksList.map((d) => ({
                  id: `addon-drink-${d.id}`,
                  name: d.name,
                  price: d.price,
                })),
              ],
            });
          }

          return groups;
        })();

        // Click a dish in the catalog
        const handleSelectDish = (item: MenuItem) => {
          setPosSelectedItem(item);
          setPosItemQuantity(1);
          setPosSpecialInstructions('');

          // Auto-select defaults
          const groups: { title: string; choices: MenuOption[] }[] = [];
          if (item.customizableOptions) {
            item.customizableOptions.forEach((optGroup) => {
              const isRice = optGroup.title.toLowerCase().includes('rice');
              const hasExtraRice = optGroup.choices.some((c) => c.name.toLowerCase().includes('extra'));

              if (isRice && hasExtraRice && !optGroup.title.toLowerCase().includes('extra')) {
                const included = optGroup.choices.filter((c) => !c.name.toLowerCase().includes('extra'));
                groups.push({
                  title: 'Rice (Included)',
                  choices: included.length > 0 ? included : [{ id: 'rice-garlic', name: 'Garlic Rice', price: 0 }]
                });
                const extras = optGroup.choices.filter((c) => c.name.toLowerCase().includes('extra'));
                groups.push({
                  title: 'Extra Rice (Add-on)',
                  choices: [{ id: 'extra-none', name: 'No Extra Rice', price: 0 }, ...extras]
                });
              } else {
                groups.push(optGroup);
              }
            });
          }

          if (item.category !== 'drinks' && availableDrinksList.length > 0) {
            groups.unshift({
              title: 'Add a Drink (Optional)',
              choices: [{ id: 'drink-none', name: 'No Drink', price: 0 }, ...availableDrinksList]
            });
          }

          const initialSelections: SelectedOption[] = groups.map((g) => ({
            optionTitle: g.title,
            choice: g.choices[0]
          }));

          setPosSelectedOptions(initialSelections);
        };

        const handleOptionToggle = (groupTitle: string, choice: MenuOption) => {
          setPosSelectedOptions((prev) => {
            const filtered = prev.filter((o) => o.optionTitle !== groupTitle);
            return [...filtered, { optionTitle: groupTitle, choice }];
          });
        };

        // Add configured dish from center column to POS cart
        const handleAddConfiguredDishToCart = () => {
          if (!posSelectedItem) return;

          const optionsExtraPrice = posSelectedOptions.reduce((sum, opt) => sum + (opt.choice?.price || 0), 0);
          const totalUnitPrice = posSelectedItem.price + optionsExtraPrice;

          setPosCart((prev) => [
            ...prev,
            {
              id: `pos-${posSelectedItem.id}-${Date.now()}`,
              menuItem: posSelectedItem,
              selectedOptions: [...posSelectedOptions],
              quantity: posItemQuantity,
              specialInstructions: posSpecialInstructions,
              totalUnitPrice
            }
          ]);

          // Keep selected item active or ready for next
          setPosItemQuantity(1);
          setPosSpecialInstructions('');
        };

        const handleUpdatePosItemQty = (cartId: string, delta: number) => {
          setPosCart((prev) => {
            return prev
              .map((ci) => {
                if (ci.id === cartId) {
                  const newQty = ci.quantity + delta;
                  return newQty > 0 ? { ...ci, quantity: newQty } : null;
                }
                return ci;
              })
              .filter(Boolean) as any[];
          });
        };

        const handleRemovePosItem = (cartId: string) => {
          setPosCart((prev) => prev.filter((ci) => ci.id !== cartId));
        };

        const handleSubmitPosOrder = () => {
          if (posCart.length === 0) {
            alert('Please add at least 1 menu item to the order.');
            return;
          }

          const customerName = posCustomerName.trim() || (posOrderSource === 'walkin' ? 'Walk-In Customer' : 'Messenger Customer');
          const customerPhone = posCustomerPhone.trim() || 'N/A';

          if (posOrderType === 'delivery' && !posDeliveryAddress.trim()) {
            alert('Please enter a delivery address for delivery orders.');
            return;
          }

          if (posPaymentMethod === 'cod' && typeof posAmountTendered === 'number' && posAmountTendered < posCartTotal) {
            alert(`Amount given (₱${posAmountTendered.toFixed(2)}) is less than total due (₱${posCartTotal.toFixed(2)}).`);
            return;
          }

          const todayOrdersCount = orders.filter(o => new Date(o.timestamp).toDateString() === new Date().toDateString()).length;
          const nextQueueNum = todayOrdersCount + 1;

          const scheduledPosPickup = posScheduleType === 'scheduled' ? formatPosPickupDateTimeDisplay(posPickupTime, false) : 'ASAP (~15-20 mins)';
          const scheduledPosDelivery = posScheduleType === 'scheduled' ? formatPosPickupDateTimeDisplay(posDeliveryTime, true) : 'ASAP (~20-30 mins)';

          const newOrderId = `ord-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          const newOrder: Order = {
            id: newOrderId,
            queueNumber: nextQueueNum,
            items: posCart,
            totalAmount: posCartTotal,
            customer: {
              name: customerName,
              phone: customerPhone,
              email: `${customerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@curvada.local`,
              orderType: posOrderType,
              tableNumber: posOrderType === 'pickup' && posTableNumber.trim() ? posTableNumber.trim() : undefined,
              pickupTime: posOrderType === 'pickup' ? scheduledPosPickup : undefined,
              deliveryTime: posOrderType === 'delivery' ? scheduledPosDelivery : undefined,
              scheduleType: posScheduleType,
              address: posOrderType === 'delivery' ? posDeliveryAddress.trim() : undefined
            },
            paymentMethod: posPaymentMethod,
            orderSource: posOrderSource,
            amountTendered: posPaymentMethod === 'cod' && typeof posAmountTendered === 'number' ? posAmountTendered : undefined,
            changeAmount: posPaymentMethod === 'cod' && typeof posAmountTendered === 'number' ? changeDue : undefined,
            status: 'pending',
            timestamp: new Date().toISOString(),
            logs: [
              {
                status: 'pending',
                timestamp: new Date().toISOString(),
                note: `Order manually registered at Counter POS (${posOrderSource === 'walkin' ? 'Walk-In' : 'Facebook Messenger'}).`
              }
            ]
          };

          if (onManualPlaceOrder) {
            onManualPlaceOrder(newOrder);
          }

          // Open receipt print preview immediately so cashier can print receipt or KOT
          setPrintingOrderType('customer');
          setPrintingOrder(newOrder);

          setShowManualOrderModal(false);
          setPosCart([]);
          setPosSelectedItem(null);
          setPosPickupTime(getPosDefaultPickupDateTime(15));
          setPosDeliveryTime(getPosDefaultPickupDateTime(30));
          setPosScheduleType('asap');
        };

        const currentConfiguredUnitPrice = posSelectedItem
          ? posSelectedItem.price + posSelectedOptions.reduce((sum, opt) => sum + (opt.choice?.price || 0), 0)
          : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-5 bg-black/85 backdrop-blur-md animate-fade-in text-left">
            <div className="bg-[#141413] border-2 border-brand-gold/30 rounded-[2rem] max-w-7xl w-full h-[94vh] max-h-[900px] shadow-2xl flex flex-col overflow-hidden">
              
              {/* Modal Top Header */}
              <div className="px-4 md:px-5 py-2.5 md:py-3 border-b border-white/10 flex items-center justify-between bg-[#181818]/70 flex-shrink-0">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-xl border border-brand-gold/20 flex-shrink-0">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-white text-sm md:text-base uppercase tracking-tight flex items-center gap-1.5 md:gap-2">
                      Point of Sale (POS) Order Terminal
                      <span className="text-[8px] md:text-[9px] bg-brand-gold text-black font-black uppercase px-2 py-0.5 rounded-full">
                        Counter Mode
                      </span>
                    </h3>
                    <p className="text-gray-400 text-[10px] md:text-[11px] hidden sm:block">
                      Select dish → Click upgrades/options inline → Add to ticket & print receipt
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowManualOrderModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile View Navigation Bar (Shown only on < lg screens) */}
              <div className="lg:hidden flex items-center justify-between border-b border-white/10 bg-[#161615] px-3 py-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 p-1 bg-[#0D0D0C] rounded-xl border border-white/10 flex-1 max-w-xs">
                  <button
                    type="button"
                    onClick={() => setPosMobileTab('catalog')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      posMobileTab === 'catalog'
                        ? 'bg-brand-gold text-black shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>🍱</span> Menu Catalog
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosMobileTab('ticket')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 relative ${
                      posMobileTab === 'ticket'
                        ? 'bg-brand-gold text-black shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>🧾</span> Ticket
                    {posCart.length > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] font-black ${
                        posMobileTab === 'ticket' ? 'bg-black text-brand-gold' : 'bg-brand-gold text-black'
                      }`}>
                        {posCart.reduce((sum, ci) => sum + ci.quantity, 0)}
                      </span>
                    )}
                  </button>
                </div>

                <div className="text-right pl-2">
                  <span className="text-[9px] text-gray-500 font-bold uppercase block leading-none">Total</span>
                  <span className="text-sm font-mono font-black text-brand-gold">₱{posCartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Modal Body: 3-Column POS Workspace Layout */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative">
                
                {/* COLUMN 1 (5 cols): Menu Dishes Catalog */}
                <div className={`${
                  posMobileTab === 'catalog' ? 'flex' : 'hidden'
                } lg:flex lg:col-span-5 flex-col border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden bg-[#10100F]`}>
                  
                  {/* Category Filter & Search Bar */}
                  <div className="p-3 border-b border-white/5 space-y-2 flex-shrink-0 bg-[#141413]">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search menu..."
                        value={posSearchQuery}
                        onChange={(e) => setPosSearchQuery(e.target.value)}
                        className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
                      />
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setPosSelectedCategory(c.id)}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                            posSelectedCategory === c.id
                              ? 'bg-brand-gold text-black shadow-sm'
                              : 'bg-[#181818] border border-white/5 text-gray-400 hover:text-white'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Menu Dishes Grid with Compact Fixed-Height Cards */}
                  <div className="p-3 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 pb-20 lg:pb-3">
                    {filteredMenuItems.map((item) => {
                      const isSelected = posSelectedItem?.id === item.id;
                      const inCartCount = posCart
                        .filter((ci) => ci.menuItem.id === item.id)
                        .reduce((sum, ci) => sum + ci.quantity, 0);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectDish(item)}
                          className={`border rounded-2xl p-2 text-left transition-all flex flex-col justify-between group relative shadow-md active:scale-95 cursor-pointer h-44 ${
                            isSelected
                              ? 'bg-[#221c10] border-brand-gold ring-1 ring-brand-gold shadow-brand-gold/10'
                              : 'bg-[#181818] hover:bg-[#202020] border-white/5 hover:border-brand-gold/40'
                          }`}
                        >
                          {inCartCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 bg-brand-gold text-black font-mono font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shadow-lg z-10">
                              {inCartCount}
                            </span>
                          )}

                          {/* Fixed Aspect Image Viewport */}
                          <div className="h-24 w-full rounded-xl overflow-hidden bg-black/40 relative flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <span className="absolute bottom-1 left-2 font-mono font-black text-xs text-white">
                              ₱{item.price.toFixed(2)}
                            </span>
                          </div>

                          {/* Dish Information */}
                          <div className="pt-1.5 flex-1 flex flex-col justify-between min-w-0">
                            <h4 className={`font-bold text-xs truncate leading-tight ${
                              isSelected ? 'text-brand-gold' : 'text-white'
                            }`}>
                              {item.name}
                            </h4>
                            <div className="flex items-center justify-between text-[9px] text-gray-500 pt-0.5">
                              <span className="capitalize">{item.category}</span>
                              <span className="text-brand-gold font-bold">
                                {item.customizableOptions?.length ? '⚙️ Options' : '⚡ Quick'}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Floating Bottom Bar on Mobile when items are in cart to easily jump to ticket */}
                  {posCart.length > 0 && (
                    <div className="lg:hidden absolute bottom-3 left-3 right-3 z-30 animate-slide-up">
                      <button
                        type="button"
                        onClick={() => setPosMobileTab('ticket')}
                        className="w-full py-3 px-4 bg-brand-gold text-black rounded-2xl font-black uppercase text-xs tracking-wider flex items-center justify-between shadow-2xl border border-brand-gold/40 active:scale-98 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="bg-black text-brand-gold text-[10px] font-mono px-2 py-0.5 rounded-full font-black">
                            {posCart.reduce((sum, ci) => sum + ci.quantity, 0)} Items
                          </span>
                          <span>View Ticket & Checkout</span>
                        </div>
                        <span className="font-mono font-black text-sm">
                          ₱{posCartTotal.toFixed(2)} →
                        </span>
                      </button>
                    </div>
                  )}

                </div>

                {/* COLUMN 2 (3 cols): INLINE CUSTOMIZATION & UPGRADES PANEL (Desktop Only) */}
                <div className="hidden lg:flex lg:col-span-3 flex-col border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden bg-[#121211]">
                  <div className="px-3.5 py-3 border-b border-white/10 bg-[#181818]/60 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">⚙️</span>
                      <h4 className="font-display font-black text-xs uppercase tracking-wider text-white">
                        Dish Upgrades & Add-ons
                      </h4>
                    </div>
                    {posSelectedItem && (
                      <span className="text-[9px] bg-brand-gold/10 text-brand-gold font-bold px-2 py-0.5 rounded-full border border-brand-gold/20">
                        Selected
                      </span>
                    )}
                  </div>

                  {!posSelectedItem ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500 space-y-2">
                      <span className="text-3xl">👈</span>
                      <p className="text-xs font-bold text-gray-400">No Dish Selected</p>
                      <p className="text-[10px] text-gray-500 max-w-[200px]">
                        Click any dish on the left catalog to configure rice upgrades, extra egg, and drinks here.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      
                      {/* Active Item Title Header */}
                      <div className="p-3 bg-[#181818] border-b border-white/5 flex items-center justify-between gap-2 flex-shrink-0">
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-xs truncate">
                            {posSelectedItem.name}
                          </h4>
                          <span className="text-[10px] font-mono text-brand-gold font-bold">
                            Base: ₱{posSelectedItem.price.toFixed(2)}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          ₱{currentConfiguredUnitPrice.toFixed(2)}
                        </span>
                      </div>

                      {/* Options & Choices List */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {activeNormalizedOptionGroups.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 text-xs">
                            ✨ Standard recipe dish (no options required). Ready to add!
                          </div>
                        ) : (
                          activeNormalizedOptionGroups.map((group, gIdx) => {
                            const currentChoice = posSelectedOptions.find((o) => o.optionTitle === group.title)?.choice;

                            return (
                              <div key={gIdx} className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                                  {group.title}
                                </label>
                                <div className="space-y-1">
                                  {group.choices.map((choice) => {
                                    const isChoiceSelected = currentChoice?.id === choice.id;
                                    const cleanName = choice.name.replace(/\s*\(Upgrade\)/gi, '').trim();

                                    return (
                                      <button
                                        key={choice.id}
                                        type="button"
                                        onClick={() => handleOptionToggle(group.title, choice)}
                                        className={`w-full py-1.5 px-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between cursor-pointer border ${
                                          isChoiceSelected
                                            ? 'bg-brand-gold/15 border-brand-gold text-white font-bold'
                                            : 'bg-[#0D0D0C] hover:bg-[#181818] border-white/5 text-gray-400'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 truncate">
                                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                            isChoiceSelected ? 'border-brand-gold bg-brand-gold text-black' : 'border-gray-600'
                                          }`}>
                                            {isChoiceSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                          </div>
                                          <span className="truncate text-[11px]">{cleanName}</span>
                                        </div>
                                        <span className={`text-[10px] font-mono font-bold flex-shrink-0 ${
                                          choice.price > 0 ? 'text-brand-gold' : 'text-gray-500'
                                        }`}>
                                          {choice.price > 0 ? `+₱${choice.price}` : 'Free'}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        )}

                        {/* Special Note Input */}
                        <div className="pt-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                            Chef Cooking Note (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Well done egg, less sauce..."
                            value={posSpecialInstructions}
                            onChange={(e) => setPosSpecialInstructions(e.target.value)}
                            className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
                          />
                        </div>
                      </div>

                      {/* Quantity & Add to Cart Footer */}
                      <div className="p-3 border-t border-white/10 bg-[#181818] space-y-2 flex-shrink-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 font-bold">Portions:</span>
                          <div className="flex items-center gap-1.5 bg-[#0D0D0C] rounded-xl p-1 border border-white/10">
                            <button
                              type="button"
                              onClick={() => setPosItemQuantity((q) => Math.max(1, q - 1))}
                              className="w-6 h-6 rounded-lg bg-[#181818] flex items-center justify-center text-gray-300 hover:text-white cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-bold text-white px-2 text-xs">
                              {posItemQuantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPosItemQuantity((q) => q + 1)}
                              className="w-6 h-6 rounded-lg bg-[#181818] flex items-center justify-center text-gray-300 hover:text-white cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddConfiguredDishToCart()}
                          className="w-full py-2.5 rounded-xl bg-brand-gold hover:opacity-95 text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                        >
                          <Plus className="w-4 h-4" /> Add to Ticket • ₱{(currentConfiguredUnitPrice * posItemQuantity).toFixed(2)}
                        </button>
                      </div>

                    </div>
                  )}
                </div>

                {/* COLUMN 3 (4 cols): Order Ticket, Channel, Customer & Cash Tender */}
                <div className={`${
                  posMobileTab === 'ticket' ? 'flex' : 'hidden'
                } lg:flex lg:col-span-4 flex-col bg-[#141413] overflow-hidden`}>
                  
                  {/* Channel & Order Type Selectors */}
                  <div className="p-3 border-b border-white/10 space-y-2.5 flex-shrink-0 bg-[#181818]/40">
                    
                    {/* Order Source / Channel (Walk-In vs Messenger) */}
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                        Order Channel / Origin
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPosOrderSource('walkin')}
                          className={`py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                            posOrderSource === 'walkin'
                              ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                              : 'bg-[#0D0D0C] border-white/5 text-gray-400 hover:text-white'
                          }`}
                        >
                          🚶 Walk-In Counter
                        </button>
                        <button
                          type="button"
                          onClick={() => setPosOrderSource('messenger')}
                          className={`py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                            posOrderSource === 'messenger'
                              ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                              : 'bg-[#0D0D0C] border-white/5 text-gray-400 hover:text-white'
                          }`}
                        >
                          💬 Messenger
                        </button>
                      </div>
                    </div>

                    {/* Fulfillment Type: Pickup vs Delivery */}
                    <div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPosOrderType('pickup')}
                          className={`py-1 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                            posOrderType === 'pickup'
                              ? 'bg-brand-gold border-brand-gold text-black shadow-sm'
                              : 'bg-[#0D0D0C] border-white/5 text-gray-400 hover:text-white'
                          }`}
                        >
                          🛍️ Pickup / Dine
                        </button>
                        <button
                          type="button"
                          onClick={() => setPosOrderType('delivery')}
                          className={`py-1 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                            posOrderType === 'delivery'
                              ? 'bg-brand-red border-red-500 text-white shadow-sm'
                              : 'bg-[#0D0D0C] border-white/5 text-gray-400 hover:text-white'
                          }`}
                        >
                          🛵 Delivery
                        </button>
                      </div>
                    </div>

                    {/* Customer Inputs */}
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div>
                        <input
                          type="text"
                          placeholder="Customer Name..."
                          value={posCustomerName}
                          onChange={(e) => setPosCustomerName(e.target.value)}
                          className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Contact #..."
                          value={posCustomerPhone}
                          onChange={(e) => setPosCustomerPhone(e.target.value)}
                          className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
                        />
                      </div>
                    </div>

                    {posOrderType === 'pickup' ? (
                      <div className="space-y-1.5 bg-[#10100F] p-2.5 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-bold text-gray-400">
                            ⏰ Pickup Schedule:
                          </span>
                          <span className="text-[9px] font-mono font-bold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20">
                            {posScheduleType === 'asap' ? '⚡ ASAP (~15 mins)' : formatPosPickupDateTimeDisplay(posPickupTime, false)}
                          </span>
                        </div>

                        {/* Timing Mode Toggles (ASAP vs Scheduled) */}
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => setPosScheduleType('asap')}
                            className={`py-1 px-2 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                              posScheduleType === 'asap'
                                ? 'bg-brand-red border-red-500 text-white shadow-sm'
                                : 'bg-[#181818] border-white/5 text-gray-400 hover:text-white'
                            }`}
                          >
                            ⚡ ASAP
                          </button>
                          <button
                            type="button"
                            onClick={() => setPosScheduleType('scheduled')}
                            className={`py-1 px-2 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                              posScheduleType === 'scheduled'
                                ? 'bg-brand-gold border-brand-gold text-black shadow-sm'
                                : 'bg-[#181818] border-white/5 text-gray-400 hover:text-white'
                            }`}
                          >
                            📅 Schedule
                          </button>
                        </div>

                        {posScheduleType === 'scheduled' && (
                          <div className="space-y-1 pt-1 border-t border-white/5 animate-fade-in">
                            {/* Quick Presets */}
                            <div className="flex gap-1 flex-wrap">
                              {[
                                { label: '+15m', mins: 15 },
                                { label: '+30m', mins: 30 },
                                { label: '+45m', mins: 45 },
                                { label: '+1h', mins: 60 },
                              ].map((p) => (
                                <button
                                  key={p.mins}
                                  type="button"
                                  onClick={() => setPosPickupTime(getPosDefaultPickupDateTime(p.mins))}
                                  className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-[#181818] border border-white/5 hover:border-brand-gold/40 text-gray-400 hover:text-white cursor-pointer"
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>

                            <input
                              type="datetime-local"
                              value={posPickupTime}
                              onChange={(e) => setPosPickupTime(e.target.value)}
                              className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-2 py-1 text-[10.5px] text-white font-mono font-bold focus:outline-none focus:border-brand-gold cursor-pointer"
                            />
                          </div>
                        )}

                        <div>
                          <input
                            type="text"
                            placeholder="Table # (Optional)..."
                            value={posTableNumber}
                            onChange={(e) => setPosTableNumber(e.target.value)}
                            className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 bg-[#10100F] p-2.5 rounded-xl border border-white/5">
                        <input
                          type="text"
                          placeholder="Delivery Address (Barangay, Landmark)..."
                          value={posDeliveryAddress}
                          onChange={(e) => setPosDeliveryAddress(e.target.value)}
                          className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
                        />

                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-bold text-gray-400">
                            🛵 Delivery Timing:
                          </span>
                          <span className="text-[9px] font-mono font-bold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded border border-brand-gold/20">
                            {posScheduleType === 'asap' ? '⚡ ASAP (~20-30 mins)' : formatPosPickupDateTimeDisplay(posDeliveryTime, true)}
                          </span>
                        </div>

                        {/* Timing Mode Toggles (ASAP vs Scheduled) */}
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => setPosScheduleType('asap')}
                            className={`py-1 px-2 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                              posScheduleType === 'asap'
                                ? 'bg-brand-red border-red-500 text-white shadow-sm'
                                : 'bg-[#181818] border-white/5 text-gray-400 hover:text-white'
                            }`}
                          >
                            ⚡ Deliver ASAP
                          </button>
                          <button
                            type="button"
                            onClick={() => setPosScheduleType('scheduled')}
                            className={`py-1 px-2 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                              posScheduleType === 'scheduled'
                                ? 'bg-brand-gold border-brand-gold text-black shadow-sm'
                                : 'bg-[#181818] border-white/5 text-gray-400 hover:text-white'
                            }`}
                          >
                            📅 Schedule Delivery
                          </button>
                        </div>

                        {posScheduleType === 'scheduled' && (
                          <div className="space-y-1 pt-1 border-t border-white/5 animate-fade-in">
                            {/* Quick Presets */}
                            <div className="flex gap-1 flex-wrap">
                              {[
                                { label: '+30m', mins: 30 },
                                { label: '+45m', mins: 45 },
                                { label: '+1h', mins: 60 },
                                { label: '+2h', mins: 120 },
                              ].map((p) => (
                                <button
                                  key={p.mins}
                                  type="button"
                                  onClick={() => setPosDeliveryTime(getPosDefaultPickupDateTime(p.mins))}
                                  className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-[#181818] border border-white/5 hover:border-brand-gold/40 text-gray-400 hover:text-white cursor-pointer"
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>

                            <input
                              type="datetime-local"
                              value={posDeliveryTime}
                              onChange={(e) => setPosDeliveryTime(e.target.value)}
                              className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-2 py-1 text-[10.5px] text-white font-mono font-bold focus:outline-none focus:border-brand-gold cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Cart Item List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-gray-400 pb-1 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPosMobileTab('catalog')}
                          className="lg:hidden text-brand-gold hover:underline font-bold text-[9px] flex items-center gap-0.5 cursor-pointer"
                        >
                          ← Add More Dishes
                        </button>
                        <span className="hidden lg:inline">Order Items ({posCart.reduce((s, i) => s + i.quantity, 0)})</span>
                        <span className="lg:hidden font-mono">({posCart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                      </div>
                      {posCart.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setPosCart([])}
                          className="text-red-400 hover:text-red-300 font-bold lowercase hover:underline cursor-pointer"
                        >
                          clear
                        </button>
                      )}
                    </div>

                    {posCart.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 text-xs">
                        🛒 Ticket is empty. Configure dishes to add.
                      </div>
                    ) : (
                      posCart.map((ci) => (
                        <div
                          key={ci.id}
                          className="bg-[#0D0D0C] border border-white/5 rounded-xl p-2 flex items-center justify-between gap-1.5 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-white truncate text-[11px]">{ci.menuItem.name}</p>
                            {ci.selectedOptions && ci.selectedOptions.length > 0 && (
                              <p className="text-[9px] text-brand-gold truncate">
                                + {ci.selectedOptions.map((o: any) => o.choice?.name?.replace(/\s*\(Upgrade\)/gi, '')).join(', ')}
                              </p>
                            )}
                            <p className="text-[9px] text-gray-400 font-mono">
                              ₱{ci.totalUnitPrice.toFixed(2)} each
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-0.5 bg-[#181818] rounded-lg p-0.5 border border-white/10">
                              <button
                                type="button"
                                onClick={() => handleUpdatePosItemQty(ci.id, -1)}
                                className="w-4 h-4 rounded flex items-center justify-center text-gray-400 hover:text-white"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="font-mono font-bold text-white px-1 text-[11px]">
                                {ci.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdatePosItemQty(ci.id, 1)}
                                className="w-4 h-4 rounded flex items-center justify-center text-gray-400 hover:text-white"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            <span className="font-mono font-bold text-white text-xs w-12 text-right">
                              ₱{(ci.totalUnitPrice * ci.quantity).toFixed(0)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleRemovePosItem(ci.id)}
                              className="text-gray-500 hover:text-red-400 p-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Payment Method, Cash Tendered & POS Change Due */}
                  <div className="p-3 border-t border-white/10 space-y-2.5 bg-[#181818]/60 flex-shrink-0">
                    
                    {/* Payment Mode Selector */}
                    <div>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'cod', label: '💵 Cash (COD)' },
                          { id: 'ewallet', label: '📱 GCash' },
                          { id: 'card', label: '💳 Card' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPosPaymentMethod(m.id as any)}
                            className={`py-1 px-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                              posPaymentMethod === m.id
                                ? 'bg-brand-gold text-black border-brand-gold shadow-sm'
                                : 'bg-[#0D0D0C] border-white/5 text-gray-400 hover:text-white'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cash Tendered & Change Computation (when COD is chosen) */}
                    {posPaymentMethod === 'cod' && (
                      <div className="bg-[#0D0D0C] border border-white/10 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                            Cash Given:
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 font-mono font-bold text-xs">₱</span>
                            <input
                              type="number"
                              min={posCartTotal}
                              step="1"
                              placeholder={posCartTotal.toFixed(0)}
                              value={posAmountTendered}
                              onChange={(e) => setPosAmountTendered(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-24 bg-[#181818] border border-white/10 rounded-lg px-2 py-0.5 text-white font-mono font-black text-xs text-right focus:outline-none focus:border-brand-gold"
                            />
                          </div>
                        </div>

                        {/* Quick Cash Presets */}
                        <div className="flex items-center gap-1 justify-end flex-wrap">
                          <button
                            type="button"
                            onClick={() => setPosAmountTendered(posCartTotal)}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-[8px] font-mono font-bold"
                          >
                            Exact
                          </button>
                          {[100, 200, 500, 1000].filter((amt) => amt >= posCartTotal).map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setPosAmountTendered(preset)}
                              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-brand-gold text-[8px] font-mono font-bold"
                            >
                              ₱{preset}
                            </button>
                          ))}
                        </div>

                        {/* Live Change Calculation Box */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className="text-[10px] font-bold text-gray-300">Change Due:</span>
                          <span className={`font-mono font-black text-sm ${
                            changeDue > 0 ? 'text-emerald-400' : 'text-gray-400'
                          }`}>
                            ₱{changeDue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Total Due & Confirm Button */}
                    <div className="pt-0.5 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">
                          Total Due
                        </span>
                        <span className="font-display font-black text-brand-gold text-lg md:text-xl">
                          ₱{posCartTotal.toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleSubmitPosOrder}
                        disabled={posCart.length === 0}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 shadow-xl transition-all cursor-pointer ${
                          posCart.length === 0
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : 'bg-brand-red hover:bg-red-600 text-white shadow-brand-red/30 active:scale-95'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" /> Place & Print Order
                      </button>
                    </div>

                  </div>

                </div>

              </div>

              {/* MOBILE DISH CUSTOMIZATION MODAL / DIALOG (Shown on < lg screens when a dish is selected) */}
              {posSelectedItem && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm lg:hidden animate-fade-in text-left">
                  <div className="bg-[#141413] border-2 border-brand-gold/40 rounded-[2rem] max-w-lg w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-scale-up">
                    
                    {/* Dialog Header */}
                    <div className="px-4 py-3 border-b border-white/10 bg-[#181818]/90 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">⚙️</span>
                        <div className="min-w-0">
                          <h4 className="font-display font-black text-sm uppercase tracking-wider text-white truncate">
                            {posSelectedItem.name}
                          </h4>
                          <span className="text-[10px] font-mono text-brand-gold font-bold">
                            Base: ₱{posSelectedItem.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPosSelectedItem(null)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer flex-shrink-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Dialog Body (Options & Upgrades List) */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {activeNormalizedOptionGroups.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-xs bg-[#181818]/50 rounded-2xl border border-white/5 p-4">
                          ✨ Standard recipe dish with no customizable options required. Adjust portions below and add to ticket!
                        </div>
                      ) : (
                        activeNormalizedOptionGroups.map((group, gIdx) => {
                          const currentChoice = posSelectedOptions.find((o) => o.optionTitle === group.title)?.choice;

                          return (
                            <div key={gIdx} className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                                {group.title}
                              </label>
                              <div className="space-y-1.5">
                                {group.choices.map((choice) => {
                                  const isChoiceSelected = currentChoice?.id === choice.id;
                                  const cleanName = choice.name.replace(/\s*\(Upgrade\)/gi, '').trim();

                                  return (
                                    <button
                                      key={choice.id}
                                      type="button"
                                      onClick={() => handleOptionToggle(group.title, choice)}
                                      className={`w-full py-2 px-3 rounded-xl text-left text-xs transition-all flex items-center justify-between cursor-pointer border ${
                                        isChoiceSelected
                                          ? 'bg-brand-gold/15 border-brand-gold text-white font-bold'
                                          : 'bg-[#0D0D0C] hover:bg-[#181818] border-white/5 text-gray-400'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 truncate">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                          isChoiceSelected ? 'border-brand-gold bg-brand-gold text-black' : 'border-gray-600'
                                        }`}>
                                          {isChoiceSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                        </div>
                                        <span className="truncate text-xs">{cleanName}</span>
                                      </div>
                                      <span className={`text-[11px] font-mono font-bold flex-shrink-0 ${
                                        choice.price > 0 ? 'text-brand-gold' : 'text-gray-500'
                                      }`}>
                                        {choice.price > 0 ? `+₱${choice.price}` : 'Free'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Special Note Input */}
                      <div className="pt-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                          Chef Cooking Note (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Well done egg, less sauce..."
                          value={posSpecialInstructions}
                          onChange={(e) => setPosSpecialInstructions(e.target.value)}
                          className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
                        />
                      </div>
                    </div>

                    {/* Dialog Footer (Quantity & Add to Ticket) */}
                    <div className="p-4 border-t border-white/10 bg-[#181818] space-y-3 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold">Portions:</span>
                        <div className="flex items-center gap-2 bg-[#0D0D0C] rounded-xl p-1 border border-white/10">
                          <button
                            type="button"
                            onClick={() => setPosItemQuantity((q) => Math.max(1, q - 1))}
                            className="w-7 h-7 rounded-lg bg-[#181818] flex items-center justify-center text-gray-300 hover:text-white cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono font-bold text-white px-3 text-xs">
                            {posItemQuantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPosItemQuantity((q) => q + 1)}
                            className="w-7 h-7 rounded-lg bg-[#181818] flex items-center justify-center text-gray-300 hover:text-white cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPosSelectedItem(null)}
                          className="py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-black uppercase tracking-wider text-xs flex items-center justify-center cursor-pointer transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleAddConfiguredDishToCart();
                            setPosSelectedItem(null);
                          }}
                          className="py-2.5 rounded-xl bg-brand-gold hover:opacity-95 text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                        >
                          <Plus className="w-4 h-4" /> Add • ₱{(currentConfiguredUnitPrice * posItemQuantity).toFixed(2)}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>
        );
      })()}

      {/* THERMAL RECEIPT & KITCHEN TICKET (KOT) MODAL */}
      {printingOrder && (
        <ReceiptModal
          order={printingOrder}
          initialType={printingOrderType}
          onClose={() => setPrintingOrder(null)}
        />
      )}

      {/* BLUETOOTH PRINTER SETUP & DIAGNOSTIC MODAL */}
      <BluetoothPrinterModal
        isOpen={isBluetoothModalOpen}
        onClose={() => setIsBluetoothModalOpen(false)}
      />


      {/* SMART PROFIT & OVERHEAD HORIZON SIMULATOR MODAL */}
      <SmartProfitModal
        isOpen={isProfitCalcModalOpen}
        onClose={() => setIsProfitCalcModalOpen(false)}
        menuItems={menuItems}
        ingredientsInventory={ingredientsInventory}
        initialMenuItemId={selectedProfitMenuItemId}
      />

      {/* DINE-IN TABLE QR CODE GENERATOR OVERLAY */}
      {tableQRModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#181818] border-2 border-white/10 rounded-[2rem] p-6 max-w-md w-full shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="font-display font-black text-white text-base uppercase tracking-tight flex items-center gap-2">
                📱 Table QR Code Generator
              </h4>
              <button onClick={() => setTableQRModalOpen(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs text-gray-400 font-bold uppercase block">Select Restaurant Table Number</label>
              <div className="flex justify-center gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((tNum) => (
                  <button
                    key={tNum}
                    type="button"
                    onClick={() => setSelectedQRTable(tNum)}
                    className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                      selectedQRTable === tNum ? 'bg-brand-red text-white scale-110 shadow-lg' : 'bg-[#0D0D0C] border border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    T{tNum}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl text-black space-y-3 shadow-inner inline-block w-full max-w-[280px]">
              <span className="font-black text-sm uppercase tracking-wider block">Curvada's Kitchen</span>
              <div className="bg-gray-100 p-2 rounded-xl border border-gray-200 inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.origin + '?table=' + selectedQRTable)}`}
                  alt={`Table ${selectedQRTable} QR Code`}
                  className="w-48 h-48 mx-auto object-contain"
                />
              </div>
              <div>
                <span className="font-black text-lg text-brand-red uppercase block">TABLE #{selectedQRTable}</span>
                <span className="text-[9px] text-gray-600 font-bold block">Scan with Phone Camera to Order</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-brand-gold text-black font-black uppercase text-xs rounded-xl shadow-lg"
              >
                🖨️ Print Table Standee
              </button>
              <button
                type="button"
                onClick={() => setTableQRModalOpen(false)}
                className="px-4 py-3 bg-[#0D0D0C] border border-white/10 text-white font-bold uppercase text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOW STOCK SUPPLIER PO EXPORTER OVERLAY */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#181818] border-2 border-white/10 rounded-[2rem] p-6 max-w-2xl w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="font-display font-black text-white text-base uppercase tracking-tight flex items-center gap-2">
                📦 Low-Stock Supplier Purchase Order (PO)
              </h4>
              <button onClick={() => setShowPOModal(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                The following raw ingredients are currently at or below their safety reorder threshold (`lowStockAlert`).
              </p>

              <div className="overflow-x-auto max-h-[350px] border border-white/5 rounded-2xl bg-[#0D0D0C]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500 uppercase tracking-wider text-[10px] font-black">
                      <th className="p-3">Ingredient</th>
                      <th className="p-3 text-right">Current Stock</th>
                      <th className="p-3 text-right">Reorder Threshold</th>
                      <th className="p-3 text-right">Suggested Order Qty</th>
                      <th className="p-3 text-right">Est Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {ingredientsInventory.filter(ing => ing.quantity <= ing.lowStockAlert).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-emerald-400 font-sans text-xs">
                          🎉 All ingredient stock levels are currently healthy! No reorder needed.
                        </td>
                      </tr>
                    ) : (
                      ingredientsInventory.filter(ing => ing.quantity <= ing.lowStockAlert).map((ing) => {
                        const reorderQty = Math.max(1, ing.lowStockAlert * 3 - ing.quantity);
                        const estCost = reorderQty * (ing.costPerUnit || 0);
                        return (
                          <tr key={ing.id} className="hover:bg-white/[0.02]">
                            <td className="p-3 font-sans font-bold text-white">{ing.name}</td>
                            <td className="p-3 text-right text-brand-red font-bold">{ing.quantity} {ing.unit}</td>
                            <td className="p-3 text-right text-gray-400">{ing.lowStockAlert} {ing.unit}</td>
                            <td className="p-3 text-right text-brand-gold font-bold">{reorderQty} {ing.unit}</td>
                            <td className="p-3 text-right text-white">₱{estCost.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const items = ingredientsInventory.filter(ing => ing.quantity <= ing.lowStockAlert);
                  const text = items.map(i => `${i.name}: ${Math.max(1, i.lowStockAlert * 3 - i.quantity)} ${i.unit}`).join('\n');
                  navigator.clipboard.writeText(`PURCHASE ORDER - CURVADA'S KITCHEN\nDate: ${new Date().toLocaleDateString()}\n\n` + text);
                  alert('Copied Purchase Order list to clipboard!');
                }}
                className="flex-1 py-3 bg-brand-gold text-black font-black uppercase text-xs rounded-xl shadow-md"
              >
                📋 Copy Order List
              </button>
              <button
                type="button"
                onClick={() => setShowPOModal(false)}
                className="px-4 py-3 bg-[#0D0D0C] border border-white/10 text-white font-bold uppercase text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INGREDIENT SPOILAGE & WASTAGE LOGGER OVERLAY */}
      {showSpoilageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#181818] border-2 border-white/10 rounded-[2rem] p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="font-display font-black text-white text-base uppercase tracking-tight flex items-center gap-2">
                🗑️ Log Ingredient Spoilage / Wastage
              </h4>
              <button onClick={() => setShowSpoilageModal(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!spoilageIngId) return alert('Select an ingredient!');
                try {
                  await fetch('/api/spoilage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ingredientId: spoilageIngId,
                      amount: Number(spoilageAmount),
                      reason: spoilageReason,
                      loggedBy: loginRole === 'admin' ? 'Manager' : 'Kitchen Staff'
                    })
                  });
                  const ing = ingredientsInventory.find(i => i.id === spoilageIngId);
                  if (ing) {
                    onUpdateIngredientStock(spoilageIngId, Math.max(0, ing.quantity - Number(spoilageAmount)));
                  }
                  alert('Spoilage logged and inventory updated!');
                  setShowSpoilageModal(false);
                } catch (err) {
                  const ing = ingredientsInventory.find(i => i.id === spoilageIngId);
                  if (ing) {
                    onUpdateIngredientStock(spoilageIngId, Math.max(0, ing.quantity - Number(spoilageAmount)));
                  }
                  alert('Logged spoilage locally and updated stock!');
                  setShowSpoilageModal(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1.5">
                <label className="text-gray-400 font-bold uppercase block">Select Ingredient</label>
                <select
                  value={spoilageIngId}
                  onChange={(e) => setSpoilageIngId(e.target.value)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-brand-red"
                  required
                >
                  <option value="">-- Choose Ingredient --</option>
                  {ingredientsInventory.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} (In Stock: {ing.quantity} {ing.unit})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-bold uppercase block">Discarded Quantity Amount</label>
                <input
                  type="number"
                  min="1"
                  value={spoilageAmount}
                  onChange={(e) => setSpoilageAmount(Number(e.target.value))}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-3 text-white font-bold font-mono focus:outline-none focus:border-brand-red"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-bold uppercase block">Reason for Discarding</label>
                <select
                  value={spoilageReason}
                  onChange={(e) => setSpoilageReason(e.target.value as any)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-brand-red"
                >
                  <option value="expired">Expired / Past Shelf Life</option>
                  <option value="spilled">Spilled / Preparation Loss</option>
                  <option value="damaged">Damaged Packaging / Contaminated</option>
                  <option value="quality_defect">Supplier Quality Defect</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand-red text-white font-black uppercase text-xs rounded-xl shadow-md"
                >
                  Record Spoilage
                </button>
                <button
                  type="button"
                  onClick={() => setShowSpoilageModal(false)}
                  className="px-4 py-3 bg-[#0D0D0C] border border-white/10 text-white font-bold uppercase text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF SHIFT TIMECARD OVERLAY */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#181818] border-2 border-white/10 rounded-[2rem] p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h4 className="font-display font-black text-white text-base uppercase tracking-tight flex items-center gap-2">
                ⏱️ Staff Shift Attendance & Timecard
              </h4>
              <button onClick={() => setShowShiftModal(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!staffClockName.trim()) return;
                  try {
                    const res = await fetch('/api/shifts/clock-in', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ staffName: staffClockName.trim(), hourlyRate: staffClockHourly })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      setActiveShifts([data.shift, ...activeShifts]);
                      setStaffClockName('');
                      alert(`Clocked in ${data.shift.staffName}!`);
                    } else {
                      alert(data.error || 'Shift clock error');
                    }
                  } catch (err) {
                    const localShift = { id: `sft-${Date.now()}`, staffName: staffClockName.trim(), clockIn: new Date().toISOString(), hourlyRate: staffClockHourly };
                    setActiveShifts([localShift, ...activeShifts]);
                    setStaffClockName('');
                    alert(`Clocked in ${localShift.staffName} (Local)!`);
                  }
                }}
                className="bg-[#0D0D0C] p-4 border border-white/5 rounded-2xl space-y-3"
              >
                <span className="font-bold text-white uppercase text-[10px] block">Clock In New Shift</span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Staff Member Name"
                    value={staffClockName}
                    onChange={(e) => setStaffClockName(e.target.value)}
                    className="bg-[#181818] border border-white/10 rounded-xl p-2.5 text-white font-bold focus:outline-none"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Hourly Wage Rate (₱/hr)"
                    value={staffClockHourly}
                    onChange={(e) => setStaffClockHourly(Number(e.target.value))}
                    className="bg-[#181818] border border-white/10 rounded-xl p-2.5 text-white font-bold font-mono focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-gold text-black font-black uppercase rounded-xl text-xs shadow-md"
                >
                  ▶️ Clock In Staff Shift
                </button>
              </form>

              <div className="space-y-2">
                <span className="font-bold text-gray-400 uppercase text-[10px] block">Active & Recent Shift Logs</span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeShifts.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 italic">No shift clock logs recorded today.</div>
                  ) : (
                    activeShifts.map((s) => (
                      <div key={s.id} className="p-3 bg-[#0D0D0C] border border-white/5 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">{s.staffName}</p>
                          <p className="text-[10px] text-gray-500 font-mono">In: {new Date(s.clockIn).toLocaleTimeString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await fetch('/api/shifts/clock-out', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ shiftId: s.id })
                              });
                            } catch (e) {}
                            setActiveShifts(activeShifts.filter(item => item.id !== s.id));
                            alert(`Clocked out ${s.staffName}!`);
                          }}
                          className="px-3 py-1 bg-brand-red text-white font-black text-[10px] uppercase rounded-lg"
                        >
                          Clock Out
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* END OF DAY (EOD) Z-READ AUDIT OVERLAY */}
      {showZReadModal && (() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(o => o.timestamp.startsWith(todayStr) && o.status !== 'cancelled');
        const cashSales = todayOrders.filter(o => o.paymentMethod === 'cod').reduce((sum, o) => sum + o.totalAmount, 0);
        const ewalletSales = todayOrders.filter(o => o.paymentMethod === 'ewallet').reduce((sum, o) => sum + o.totalAmount, 0);
        const cardSales = todayOrders.filter(o => o.paymentMethod === 'card').reduce((sum, o) => sum + o.totalAmount, 0);
        const grossSales = cashSales + ewalletSales + cardSales;
        const expectedCash = cashSales;
        const discrepancy = zReadCashCount - expectedCash;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#181818] border-2 border-white/10 rounded-[2rem] p-6 max-w-md w-full shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="font-display font-black text-white text-base uppercase tracking-tight flex items-center gap-2">
                  📋 End-of-Day Z-Read Cash Audit
                </h4>
                <button onClick={() => setShowZReadModal(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="bg-[#0D0D0C] border border-white/5 p-4 rounded-2xl space-y-2 font-mono">
                  <div className="flex justify-between text-gray-400">
                    <span>Total Orders Delivered:</span>
                    <span className="text-white font-bold">{todayOrders.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>💵 Cash Sales Total:</span>
                    <span className="text-white font-bold">₱{cashSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>📱 GCash / Maya Total:</span>
                    <span className="text-white font-bold">₱{ewalletSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>💳 Card Sales Total:</span>
                    <span className="text-white font-bold">₱{cardSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-brand-gold font-bold text-sm pt-2 border-t border-white/5">
                    <span>GROSS SALES TOTAL:</span>
                    <span>₱{grossSales.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-400 font-bold uppercase block">Physical Cash Counted in Drawer</label>
                  <input
                    type="number"
                    min="0"
                    value={zReadCashCount}
                    onChange={(e) => setZReadCashCount(Number(e.target.value))}
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl p-3 text-white font-bold font-mono text-base focus:outline-none focus:border-brand-gold"
                    placeholder="Enter total physical bills/coins counted..."
                  />
                </div>

                <div className={`p-3 rounded-xl border text-xs font-bold flex justify-between items-center ${
                  discrepancy === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  discrepancy > 0 ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                  'bg-red-500/10 border-red-500/20 text-red-500'
                }`}>
                  <span>Cash Drawer Variance:</span>
                  <span className="font-mono text-sm">
                    {discrepancy === 0 ? '✓ Balanced (₱0.00)' : discrepancy > 0 ? `+₱${discrepancy.toFixed(2)} (Over)` : `-₱${Math.abs(discrepancy).toFixed(2)} (Short)`}
                  </span>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch('/api/zread', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ actualCashCount: zReadCashCount, closedBy: 'Manager' })
                        });
                      } catch (e) {}
                      alert('Saved EOD Z-Read Reconciliation Audit Record!');
                      setShowZReadModal(false);
                    }}
                    className="flex-1 py-3 bg-brand-gold text-black font-black uppercase text-xs rounded-xl shadow-md"
                  >
                    Save & Close Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowZReadModal(false)}
                    className="px-4 py-3 bg-[#0D0D0C] border border-white/10 text-white font-bold uppercase text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- IMAGE ZOOM, PAN & CROP ADJUSTMENT MODAL --- */}
      {isCropperOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-left select-none">
          <div className="bg-[#181818] border-2 border-brand-gold/30 rounded-[2.5rem] p-6 max-w-xl w-full shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-xl">
                  <Crop className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-black text-white text-base uppercase tracking-tight">
                    📸 Adjust Image Zoom & Framing
                  </h4>
                  <p className="text-gray-400 text-[10px]">
                    Drag to pan dish photo • Scale zoom slider • Preview customer view
                  </p>
                </div>
              </div>

              {/* View Tab Switcher: Crop Editor vs Customer View Preview */}
              <div className="flex items-center bg-[#0D0D0C] p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setCropperViewTab('crop')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                    cropperViewTab === 'crop'
                      ? 'bg-brand-gold text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  📐 Crop Editor
                </button>
                <button
                  type="button"
                  onClick={() => setCropperViewTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                    cropperViewTab === 'preview'
                      ? 'bg-brand-red text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Customer View
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsCropperOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB 1: Bounding Box / Viewport Preview */}
            {cropperViewTab === 'crop' && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <div
                    className="relative w-[400px] h-[300px] mx-auto rounded-2xl overflow-hidden border-2 border-dashed border-brand-gold bg-[#0D0D0C] shadow-2xl cursor-grab active:cursor-grabbing touch-none flex items-center justify-center"
                    onMouseDown={handleCropMouseDown}
                    onMouseMove={handleCropMouseMove}
                    onMouseUp={handleCropMouseUp}
                    onMouseLeave={handleCropMouseUp}
                    onTouchStart={handleCropTouchStart}
                    onTouchMove={handleCropTouchMove}
                    onTouchEnd={handleCropTouchEnd}
                  >
                    {/* Crop Grid Lines Overlay */}
                    <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 border border-white/20 opacity-40">
                      <div className="border-r border-b border-white/20"></div>
                      <div className="border-r border-b border-white/20"></div>
                      <div className="border-b border-white/20"></div>
                      <div className="border-r border-b border-white/20"></div>
                      <div className="border-r border-b border-white/20"></div>
                      <div className="border-b border-white/20"></div>
                      <div className="border-r border-white/20"></div>
                      <div className="border-r border-white/20"></div>
                      <div></div>
                    </div>

                    {/* Center Target Indicator */}
                    <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-30">
                      <div className="w-6 h-6 border border-brand-gold rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-brand-gold rounded-full"></div>
                      </div>
                    </div>

                    {/* Scaled & Panned Image */}
                    <img
                      src={cropperSrc}
                      alt="Crop Target"
                      draggable={false}
                      style={{
                        transform: `translate(${cropOffsetX}px, ${cropOffsetY}px) scale(${cropZoom}) rotate(${cropRotation}deg)`,
                        transition: isDraggingCrop ? 'none' : 'transform 0.1s ease-out',
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain'
                      }}
                      className="pointer-events-none select-none"
                    />

                    <span className="absolute bottom-2 left-2 z-20 text-[8px] bg-black/80 text-brand-gold font-mono font-bold px-2 py-0.5 rounded backdrop-blur-md border border-brand-gold/30">
                      🖐️ Drag to Pan Center
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono px-4">
                    <span>Output Canvas: <strong className="text-white">800 × 600 px (4:3)</strong></span>
                    <span>Zoom Level: <strong className="text-brand-gold">{Math.round(cropZoom * 100)}%</strong></span>
                  </div>
                </div>

                {/* Controls Toolbar */}
                <div className="bg-[#0D0D0C] border border-white/5 p-4 rounded-2xl space-y-3">
                  {/* Zoom Slider */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCropZoom(prev => Math.max(1.0, prev - 0.15))}
                      className="p-2 bg-[#181818] hover:bg-[#222222] border border-white/10 text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase">
                        <span>Magnification (Zoom)</span>
                        <span className="text-brand-gold">{Math.round(cropZoom * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="3.0"
                        step="0.05"
                        value={cropZoom}
                        onChange={(e) => setCropZoom(Number(e.target.value))}
                        className="w-full accent-brand-gold cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCropZoom(prev => Math.min(3.0, prev + 0.15))}
                      className="p-2 bg-[#181818] hover:bg-[#222222] border border-white/10 text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Action Toolbar Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCropRotation(prev => (prev + 90) % 360)}
                        className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] border border-white/10 text-gray-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-brand-gold" /> Rotate 90°
                      </button>

                      {formOriginalImage && cropperSrc !== formOriginalImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setCropperSrc(formOriginalImage);
                            setCropZoom(1.0);
                            setCropOffsetX(0);
                            setCropOffsetY(0);
                            setCropRotation(0);
                          }}
                          className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] border border-brand-gold/40 text-brand-gold hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Revert back to uncropped original source"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-brand-gold" /> Revert Original
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setCropZoom(1.0);
                          setCropOffsetX(0);
                          setCropOffsetY(0);
                          setCropRotation(0);
                        }}
                        className="px-3 py-1.5 bg-[#181818] hover:bg-[#222222] border border-white/10 text-gray-400 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Reset Position
                      </button>
                    </div>

                    <span className="text-[9px] text-gray-500 italic hidden sm:inline-block">
                      Output optimized for dish cards
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Customer Storefront View Live Preview */}
            {cropperViewTab === 'preview' && (
              <div className="space-y-4 py-2 animate-fade-in text-left">
                <div className="bg-[#0D0D0C] p-3 rounded-2xl border border-white/5 text-center">
                  <span className="text-[10px] text-brand-gold uppercase font-bold tracking-wider block">
                    🛒 Live Customer Storefront Card Preview
                  </span>
                  <span className="text-[9px] text-gray-400 block">
                    This is how online customers will see your dish photo on web and mobile devices.
                  </span>
                </div>

                <div className="bg-[#181818] rounded-[2rem] overflow-hidden border-2 border-brand-gold/40 max-w-sm mx-auto shadow-2xl space-y-0 text-left group">
                  {/* Card Top Image Viewport with Live Scale/Pan Simulation */}
                  <div className="relative h-48 w-full bg-[#0D0D0C] overflow-hidden flex items-center justify-center">
                    <img
                      src={cropperSrc}
                      alt="Customer Card Live Preview"
                      style={{
                        transform: `translate(${cropOffsetX * 0.45}px, ${cropOffsetY * 0.45}px) scale(${cropZoom}) rotate(${cropRotation}deg)`,
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain'
                      }}
                      className="select-none"
                    />
                    
                    {/* Badges Overlay */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
                      {formPopular && (
                        <span className="bg-brand-gold text-black text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md flex items-center gap-1">
                          <Award className="w-3 h-3 fill-black" />
                          Best Seller
                        </span>
                      )}
                      {formSpicy && (
                        <span className="bg-brand-red text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md flex items-center gap-1">
                          <Flame className="w-3 h-3 fill-white" />
                          Spicy
                        </span>
                      )}
                    </div>

                    <span className="absolute bottom-2 right-2 text-[8px] bg-black/80 text-brand-gold font-mono font-bold px-2 py-0.5 rounded backdrop-blur-md border border-brand-gold/30">
                      👀 Customer Store Card
                    </span>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-display font-black text-white text-base truncate">
                        {formName || 'Garlic Lechon Kawali Bento'}
                      </h5>
                      <span className="font-mono font-black text-brand-gold text-base shrink-0">
                        ₱{formPrice || 149}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                      {formDescription || 'Crispy pork belly fried to perfection, served with signature garlic fried rice, sunny egg, and pickled atchara.'}
                    </p>
                    <div className="pt-2.5 flex items-center justify-between border-t border-white/5">
                      <span className="text-[10px] text-gray-500 font-mono">Curvada Store Menu</span>
                      <button type="button" className="px-3.5 py-1.5 bg-brand-red text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-1 shadow-md">
                        <Plus className="w-3 h-3" /> Add to Order
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCropperOpen(false)}
                className="px-5 py-3 bg-[#0D0D0C] border border-white/10 hover:bg-[#222222] text-white font-bold uppercase text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="flex-1 py-3 bg-brand-gold hover:opacity-90 text-black font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Apply Crop & Save Photo
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

export default React.memo(AdminPanel);