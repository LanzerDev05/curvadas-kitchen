import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { MenuItem, MenuOption, CartItem, Order, CustomerInfo, OrderStatus, OrderLog, GroupMember, GroupCartItem, GroupOrderSession, IngredientStock } from './types';
import { MENU_ITEMS } from './data/menu';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MenuSection from './components/MenuSection';
import CustomizeModal from './components/CustomizeModal';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import OrderTracker from './components/OrderTracker';
import AdminPanel from './components/AdminPanel';
import OrderHistory from './components/OrderHistory';
import GroupOrderPanel from './components/GroupOrderPanel';
import CustomerAuthModal from './components/CustomerAuthModal';
import { ShoppingBag, ArrowRight, Utensils, ChefHat, Heart, Users } from 'lucide-react';
import { realtimeOrderService } from './api/websocket';

// --- MOCK SEED DATA FOR KITCHEN ENGAGEMENT ---
const SEED_ORDERS: Order[] = [
  {
    id: 'ord-seed01',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    items: [
      {
        id: 'silog-tapsilog-default',
        menuItem: MENU_ITEMS[0], // Tapsilog
        selectedOptions: [
          { optionTitle: 'Rice Upgrade', choice: { id: 'rice-garlic', name: 'Garlic Fried Rice', price: 0 } },
          { optionTitle: 'Egg Style', choice: { id: 'egg-sunny', name: 'Sunny-side-up', price: 0 } }
        ],
        quantity: 2,
        totalUnitPrice: 149,
      },
      {
        id: 'drink-red-tea-default',
        menuItem: MENU_ITEMS[2], // Red Tea
        selectedOptions: [
          { optionTitle: 'Serving Size', choice: { id: 'size-large', name: 'Large C-Cup (22oz) (+20)', price: 20 } }
        ],
        quantity: 2,
        totalUnitPrice: 69,
      }
    ],
    totalAmount: 436,
    customer: {
      name: 'Lanzer Villarlibo',
      phone: '0917-882-9382',
      email: 'lanzer@gmail.com',
      address: 'Block 3 Lot 15, Springville Homes, Bacoor, Cavite',
      orderType: 'delivery',
    },
    paymentMethod: 'ewallet',
    status: 'delivered',
    logs: [
      { status: 'pending', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { status: 'preparing', timestamp: new Date(Date.now() - 1.8 * 60 * 60 * 1000).toISOString() },
      { status: 'dispatched', timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString() },
      { status: 'delivered', timestamp: new Date(Date.now() - 1.2 * 60 * 60 * 1000).toISOString() }
    ]
  },
  {
    id: 'ord-seed02',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
    items: [
      {
        id: 'bento-chicken-katsu-default',
        menuItem: MENU_ITEMS[1], // Chicken Katsu Bento
        selectedOptions: [
          { optionTitle: 'Sauce Option', choice: { id: 'sauce-katsu', name: 'Katsu Sauce & Mayo', price: 0 } }
        ],
        quantity: 1,
        totalUnitPrice: 189,
      }
    ],
    totalAmount: 189,
    customer: {
      name: 'Sarah Geronimo',
      phone: '0922-383-7377',
      email: 'sarahg@gmail.com',
      address: 'Zone 4, Curvada National Highway (Eat-in)',
      orderType: 'pickup',
      tableNumber: '7',
    },
    paymentMethod: 'cod',
    status: 'pending',
    logs: [
      { status: 'pending', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() }
    ]
  }
];

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // Compute activeTab from URL path
  const activeTab = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/portal')) return 'chef';
    if (path === '/menu') return 'menu';
    if (path === '/tracker') return 'tracker';
    if (path === '/history') return 'history';
    return 'home';
  }, [location.pathname]);

  // Dynamic Browser Tab Title Sync
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/portal/admin')) {
      document.title = "Curvada's Kitchen | Admin Workplace Console";
    } else if (path.startsWith('/portal/kitchen')) {
      document.title = "Curvada's Kitchen | Kitchen Display System (KDS)";
    } else if (path.startsWith('/portal')) {
      document.title = "Curvada's Kitchen | Workplace Portal";
    } else if (path === '/menu') {
      document.title = "Curvada's Kitchen | Menu Catalog";
    } else if (path === '/tracker') {
      document.title = "Curvada's Kitchen | Order Tracker";
    } else if (path === '/history') {
      document.title = "Curvada's Kitchen | Order History";
    } else {
      document.title = "Curvada's Kitchen | Authentic Filipino-Fusion Bento & KDS";
    }
  }, [location.pathname]);

  const setActiveTab = (tab: 'home' | 'menu' | 'tracker' | 'history' | 'chef') => {
    if (tab === 'chef') {
      navigate('/portal/login');
    } else if (tab === 'home') {
      navigate('/');
    } else {
      navigate(`/${tab}`);
    }
  };

  // --- STATE HOOKS ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Storefront customer auth states
  const [loggedInCustomer, setLoggedInCustomer] = useState<CustomerInfo | null>(() => {
    try {
      const cached = localStorage.getItem('curvada_logged_customer');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [unavailableItemIds, setUnavailableItemIds] = useState<string[]>([]);

  // --- INGREDIENTS INVENTORY STATE & METHODS ---
  const [ingredientsInventory, setIngredientsInventory] = useState<IngredientStock[]>(() => {
    const cached = localStorage.getItem('curvada_ingredients_inventory');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Ingredients inventory hydration failed", e);
      }
    }
    
    // Generate realistic default stock from static menu items
    const uniqueIngredients = new Set<string>();
    MENU_ITEMS.forEach(item => {
      if (item.ingredients) {
        item.ingredients.forEach(ing => uniqueIngredients.add(ing));
      }
    });

    // Fallbacks and standard packaging items
    ['Paper Bowl', 'Utensils (Spoon & Fork)'].forEach(ing => uniqueIngredients.add(ing));
    if (uniqueIngredients.size <= 2) {
      ['Premium Beef Tapa', 'Sunny-Side-Up Egg', 'Garlic Fried Rice', 'Atchara Pickles', 'Sweet Cured Pork', 'Traditional Vinegar Dip', 'Steamed Rice', 'Pork Gyoza (2pcs)', 'Crispy Chicken Fillet', 'Bulldog Tonkatsu Sauce', 'Japanese Mayo', 'Garlic', 'Egg', 'Pork Belly'].forEach(ing => uniqueIngredients.add(ing));
    }

    return Array.from(uniqueIngredients).map((name, index) => {
      const lower = name.toLowerCase();
      const isPcsItem = lower.includes('egg') || lower.includes('gyoza') || lower.includes('paper bowl') || lower.includes('utensil');
      const unit: string = isPcsItem ? 'pcs' : 'g';
      let costPerUnit = 0.05;

      if (lower.includes('paper bowl')) costPerUnit = 3.50;
      else if (lower.includes('utensil')) costPerUnit = 1.50;
      else if (lower.includes('egg')) costPerUnit = 8.00;
      else if (lower.includes('gyoza')) costPerUnit = 12.00;
      else if (lower.includes('rice')) costPerUnit = 0.03;
      else if (lower.includes('beef') || lower.includes('pork') || lower.includes('chicken')) costPerUnit = 0.25;
      else if (unit === 'pcs') costPerUnit = 15.00;
      else if (unit === 'cans') costPerUnit = 45.00;

      return {
        id: `ing-${index}-${Math.random().toString(36).substr(2, 4)}`,
        name,
        quantity: isPcsItem ? 200 : 3000,
        unit,
        lowStockAlert: isPcsItem ? 20 : 500,
        costPerUnit
      };
    });
  });

  const saveIngredientsInventory = async (newInv: IngredientStock[]) => {
    setIngredientsInventory(newInv);
    localStorage.setItem('curvada_ingredients_inventory', JSON.stringify(newInv));
    try {
      await fetch('/api/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientsInventory: newInv })
      });
    } catch (e) {
      console.error("Failed to sync inventory to server", e);
    }
  };

  const handleAddIngredient = (name: string, quantity: number, unit: string, lowStockAlert: number, costPerUnit?: number) => {
    const newIng: IngredientStock = {
      id: `ing-new-${Math.random().toString(36).substr(2, 4)}`,
      name,
      quantity,
      unit,
      lowStockAlert,
      costPerUnit: costPerUnit !== undefined ? costPerUnit : (unit === 'pcs' ? 15.00 : unit === 'cans' ? 45.00 : unit === 'ml' ? 0.08 : unit === 'L' ? 80.00 : unit === 'kg' ? 150.00 : 0.05)
    };
    saveIngredientsInventory([...ingredientsInventory, newIng]);
  };

  const handleUpdateIngredientStock = (id: string, newQty: number) => {
    const updated = ingredientsInventory.map(ing => {
      if (ing.id === id) {
        return { ...ing, quantity: Math.max(0, newQty) };
      }
      return ing;
    });
    saveIngredientsInventory(updated);
  };

  const handleUpdateMultipleIngredientsStock = (updates: Record<string, number>) => {
    const updated = ingredientsInventory.map(ing => {
      if (updates[ing.id] !== undefined) {
        return { ...ing, quantity: Math.max(0, updates[ing.id]) };
      }
      return ing;
    });
    saveIngredientsInventory(updated);
  };

  const handleEditIngredient = (id: string, name: string, quantity: number, unit: string, lowStockAlert: number, costPerUnit?: number) => {
    const updated = ingredientsInventory.map(ing => {
      if (ing.id === id) {
        return { ...ing, name, quantity: Math.max(0, quantity), unit, lowStockAlert, costPerUnit };
      }
      return ing;
    });
    saveIngredientsInventory(updated);
  };

  const handleDeleteIngredient = (id: string) => {
    const updated = ingredientsInventory.filter(ing => ing.id !== id);
    saveIngredientsInventory(updated);
  };

  // --- GROUP ORDER STATE & METHODS ---
  const [isGroupPanelOpen, setIsGroupPanelOpen] = useState(false);
  const [groupSession, setGroupSession] = useState<GroupOrderSession | null>(null);
  const [nickname, setNickname] = useState(() => localStorage.getItem('curvada_nickname') || '');
  const [userId, setUserId] = useState(() => {
    let uId = localStorage.getItem('curvada_user_id');
    if (!uId) {
      uId = `usr-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('curvada_user_id', uId);
    }
    return uId;
  });
  const [isCheckoutForGroup, setIsCheckoutForGroup] = useState(false);

  const [groupSessions, setGroupSessions] = useState<GroupOrderSession[]>([]);

  // Sync session state with plural groupSessions state or custom parameter
  const syncGroupSession = (sessionsList?: GroupOrderSession[]) => {
    const activeGroupId = localStorage.getItem('curvada_active_group_id');
    if (!activeGroupId) {
      setGroupSession(null);
      return;
    }

    const sessions = sessionsList || groupSessions;
    const found = sessions.find(s => s.id === activeGroupId);
    if (found) {
      if (found.status === 'active') {
        setGroupSession(found);
      } else if (found.status === 'completed') {
        // Group order was completed/checked out by host!
        // Automatically switch current member to tracker for the final order
        const finalId = (found as any).finalOrderId;
        if (finalId) {
          setActiveOrderId(finalId);
          localStorage.setItem('curvada_active_id', finalId);
          setActiveTab('tracker');
          // Clear active group so they can order again
          localStorage.removeItem('curvada_active_group_id');
          setGroupSession(null);
          alert(`🎉 The group Host has successfully placed the order! Redirecting you to the Live Kitchen tracker.`);
        } else {
          localStorage.removeItem('curvada_active_group_id');
          setGroupSession(null);
        }
      } else {
        localStorage.removeItem('curvada_active_group_id');
        setGroupSession(null);
      }
    } else {
      setGroupSession(null);
    }
  };

  // Run initial hydration and listen for storage updates (cross-tab real-time sync)
  useEffect(() => {
    syncGroupSession();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'curvada_group_sessions' || e.key === 'curvada_active_group_id' || e.key === 'curvada_orders') {
        syncGroupSession();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [groupSessions]);

  // Check for URL ?group=GR-XXXX query parameter to join automatically
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const groupParam = params.get('group');
    if (groupParam) {
      const code = groupParam.toUpperCase();
      localStorage.setItem('curvada_active_group_id', code);
      syncGroupSession();
      setIsGroupPanelOpen(true);
      // Clean query parameter from URL so page reloads don't force open it
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [groupSessions]);

  // Periodic polling for active group session updates across devices (multi-browser / mobile sync)
  useEffect(() => {
    if (!groupSession) return;
    const interval = setInterval(() => {
      fetchDb();
    }, 2500);
    return () => clearInterval(interval);
  }, [groupSession?.id]);

  // Host starting a session
  const handleStartGroupSession = async (hostNickname: string) => {
    const code = `GR-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const newSession: GroupOrderSession = {
      id: code,
      hostId: userId,
      hostName: hostNickname,
      status: 'active',
      members: [{ id: userId, name: hostNickname, isHost: true, isReady: false }],
      items: [],
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('curvada_nickname', hostNickname);
    setNickname(hostNickname);

    const updated = [...groupSessions, newSession];
    setGroupSessions(updated);
    localStorage.setItem('curvada_group_sessions', JSON.stringify(updated));
    localStorage.setItem('curvada_active_group_id', code);
    
    try {
      const res = await fetch('/api/group/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupSessions: updated })
      });
      const data = await res.json();
      setGroupSessions(data.db.groupSessions);
      syncGroupSession(data.db.groupSessions);
    } catch (e) {
      console.error(e);
    }
  };

  // Participant joining a session
  const handleJoinGroupSession = async (code: string, memberNickname: string) => {
    localStorage.setItem('curvada_nickname', memberNickname);
    setNickname(memberNickname);

    const updated = groupSessions.map(s => {
      if (s.id === code) {
        const alreadyMember = s.members.some(m => m.id === userId);
        const members = alreadyMember 
          ? s.members 
          : [...s.members, { id: userId, name: memberNickname, isHost: false, isReady: false }];
        return { ...s, members };
      }
      return s;
    });

    setGroupSessions(updated);
    localStorage.setItem('curvada_group_sessions', JSON.stringify(updated));
    localStorage.setItem('curvada_active_group_id', code);
    
    try {
      const res = await fetch('/api/group/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupSessions: updated })
      });
      const data = await res.json();
      setGroupSessions(data.db.groupSessions);
      syncGroupSession(data.db.groupSessions);
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle ready status
  const handleToggleReady = async () => {
    if (!groupSession) return;
    const updated = groupSessions.map(s => {
      if (s.id === groupSession.id) {
        const members = s.members.map(m => {
          if (m.id === userId) {
            return { ...m, isReady: !m.isReady };
          }
          return m;
        });
        return { ...s, members };
      }
      return s;
    });

    setGroupSessions(updated);
    localStorage.setItem('curvada_group_sessions', JSON.stringify(updated));
    
    try {
      const res = await fetch('/api/group/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupSessions: updated })
      });
      const data = await res.json();
      setGroupSessions(data.db.groupSessions);
      syncGroupSession(data.db.groupSessions);
    } catch (e) {
      console.error(e);
    }
  };

  // Leave active session
  const handleLeaveGroupSession = async () => {
    if (!groupSession) return;
    const updated = groupSessions.map(s => {
      if (s.id === groupSession.id) {
        const members = s.members.filter(m => m.id !== userId);
        const items = s.items.filter(i => i.memberId !== userId);
        return { ...s, members, items };
      }
      return s;
    });

    setGroupSessions(updated);
    localStorage.setItem('curvada_group_sessions', JSON.stringify(updated));
    localStorage.removeItem('curvada_active_group_id');
    
    try {
      const res = await fetch('/api/group/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupSessions: updated })
      });
      const data = await res.json();
      setGroupSessions(data.db.groupSessions);
      syncGroupSession(data.db.groupSessions);
    } catch (e) {
      console.error(e);
    }
  };

  // Cancel/End active session (Host only)
  const handleCancelGroupSession = async () => {
    if (!groupSession) return;
    const updated = groupSessions.map(s => {
      if (s.id === groupSession.id) {
        return { ...s, status: 'cancelled' as const };
      }
      return s;
    });

    setGroupSessions(updated);
    localStorage.setItem('curvada_group_sessions', JSON.stringify(updated));
    localStorage.removeItem('curvada_active_group_id');
    
    try {
      const res = await fetch('/api/group/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupSessions: updated })
      });
      const data = await res.json();
      setGroupSessions(data.db.groupSessions);
      syncGroupSession(data.db.groupSessions);
    } catch (e) {
      console.error(e);
    }
  };

  // Update item quantity in group cart
  const handleUpdateGroupItemQuantity = async (itemId: string, delta: number) => {
    if (!groupSession) return;
    const updated = groupSessions.map(s => {
      if (s.id === groupSession.id) {
        const items = s.items.map(item => {
          if (item.id === itemId) {
            return { ...item, quantity: item.quantity + delta };
          }
          return item;
        }).filter(item => item.quantity > 0);
        return { ...s, items };
      }
      return s;
    });

    setGroupSessions(updated);
    localStorage.setItem('curvada_group_sessions', JSON.stringify(updated));
    
    try {
      const res = await fetch('/api/group/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupSessions: updated })
      });
      const data = await res.json();
      setGroupSessions(data.db.groupSessions);
      syncGroupSession(data.db.groupSessions);
    } catch (e) {
      console.error(e);
    }
  };

  // Remove item from group cart
  const handleRemoveGroupItem = async (itemId: string) => {
    if (!groupSession) return;
    const updated = groupSessions.map(s => {
      if (s.id === groupSession.id) {
        const items = s.items.filter(item => item.id !== itemId);
        return { ...s, items };
      }
      return s;
    });

    setGroupSessions(updated);
    localStorage.setItem('curvada_group_sessions', JSON.stringify(updated));
    
    try {
      const res = await fetch('/api/group/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupSessions: updated })
      });
      const data = await res.json();
      setGroupSessions(data.db.groupSessions);
      syncGroupSession(data.db.groupSessions);
    } catch (e) {
      console.error(e);
    }
  };

  // Mapped standard CartItems for the CheckoutModal when processing a consolidated checkout
  const mappedGroupCartItems = useMemo(() => {
    if (!groupSession) return [];
    return groupSession.items.map(item => ({
      id: item.id,
      menuItem: item.menuItem,
      selectedOptions: item.selectedOptions,
      quantity: item.quantity,
      specialInstructions: item.specialInstructions 
        ? `${item.specialInstructions} (Added by ${item.memberName})`
        : `Added by ${item.memberName}`,
      totalUnitPrice: item.totalUnitPrice
    }));
  }, [groupSession]);

  // Dynamic menu items initialized from static default or localStorage
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const cached = localStorage.getItem('curvada_menu_items');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Menu items hydration failed", e);
      }
    }
    return MENU_ITEMS;
  });

  // Dynamic stock levels mapped by item ID
  const [stockLevels, setStockLevels] = useState<Record<string, number>>(() => {
    const cached = localStorage.getItem('curvada_stock_levels');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Stock levels hydration failed", e);
      }
    }
    // Set realistic defaults for base items
    const defaults: Record<string, number> = {};
    MENU_ITEMS.forEach(item => {
      defaults[item.id] = item.category === 'drinks' ? 45 : 18;
    });
    return defaults;
  });

  // Keep track of which items have had their stock level manually overridden by the chef
  const [manualStockOverrides, setManualStockOverrides] = useState<string[]>(() => {
    const cached = localStorage.getItem('curvada_manual_stock_overrides');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Manual stock overrides hydration failed", e);
      }
    }
    return [];
  });

  const saveManualStockOverrides = async (updated: string[]) => {
    setManualStockOverrides(updated);
    localStorage.setItem('curvada_manual_stock_overrides', JSON.stringify(updated));
    try {
      await fetch('/api/stock/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockLevels, manualStockOverrides: updated })
      });
    } catch (e) {
      console.error("Failed to sync stock overrides to server", e);
    }
  };

  // Dynamic category hiding
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => {
    const cached = localStorage.getItem('curvada_hidden_categories');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Hidden categories hydration failed", e);
      }
    }
    return [];
  });

  const handleToggleCategoryHidden = (category: string) => {
    const updated = hiddenCategories.includes(category)
      ? hiddenCategories.filter(cat => cat !== category)
      : [...hiddenCategories, category];
    setHiddenCategories(updated);
    localStorage.setItem('curvada_hidden_categories', JSON.stringify(updated));
  };

  // Helper function to find matching ingredient by name (supports case, trimmed & alphanumeric fuzzy matching)
  const findMatchingIngredient = (reqName: string, inventory: IngredientStock[]): IngredientStock | undefined => {
    if (!reqName || !inventory) return undefined;
    const cleanReq = reqName.toLowerCase().trim();
    
    // 1. Exact match
    let match = inventory.find(i => i.name.toLowerCase().trim() === cleanReq);
    if (match) return match;

    // 2. Alphanumeric match (ignores spaces/symbols/numbers e.g. "Cheese Sauce100" vs "Cheese Sauce")
    const alphaReq = cleanReq.replace(/[^a-z]/g, '');
    if (alphaReq.length > 0) {
      match = inventory.find(i => i.name.toLowerCase().replace(/[^a-z]/g, '') === alphaReq);
      if (match) return match;
    }

    // 3. Substring match
    match = inventory.find(i => {
      const cleanInv = i.name.toLowerCase().trim();
      return cleanReq.startsWith(cleanInv) || cleanInv.startsWith(cleanReq);
    });
    
    return match;
  };

  // Determine dynamic stock capacity of a dish (minimum of manual stock level and active recipe ingredients limit)
  const getDishStockCapacity = (item: MenuItem): number => {
    const manualQty = stockLevels[item.id] ?? 0;
    const isManualOverridden = manualStockOverrides.includes(item.id);

    // If manual override is active, use manualQty directly
    if (isManualOverridden) {
      return manualQty;
    }

    let recipeCapacity: number | null = null;

    // 1. Check custom recipe requirements
    if (item.recipeRequirements && item.recipeRequirements.length > 0) {
      let minServings = Infinity;
      let hasMatchingIngredient = false;
      item.recipeRequirements.forEach((req) => {
        const ing = findMatchingIngredient(req.name, ingredientsInventory);
        if (ing) {
          hasMatchingIngredient = true;
          const reqQty = ing.unit === 'kg' ? req.amount / 1000 : req.amount;
          const possibleServings = reqQty > 0 ? Math.floor(ing.quantity / reqQty) : 0;
          if (possibleServings < minServings) {
            minServings = possibleServings;
          }
        } else {
          minServings = 0;
        }
      });
      recipeCapacity = hasMatchingIngredient ? minServings : 0;
    } 
    // 2. Check general ingredients list
    else if (item.ingredients && item.ingredients.length > 0) {
      let minServings = Infinity;
      let hasMatchingIngredient = false;
      item.ingredients.forEach((ingName) => {
        const ing = findMatchingIngredient(ingName, ingredientsInventory);
        if (ing) {
          hasMatchingIngredient = true;
          const reqPerServing = (ing.unit === 'pcs' || ing.unit === 'cans') ? 1 : ing.unit === 'kg' ? 0.1 : 100;
          const possibleServings = reqPerServing > 0 ? Math.floor(ing.quantity / reqPerServing) : 0;
          if (possibleServings < minServings) {
            minServings = possibleServings;
          }
        } else {
          minServings = 0;
        }
      });
      recipeCapacity = hasMatchingIngredient ? minServings : 0;
    }

    if (recipeCapacity !== null) {
      // If stockLevels[item.id] is 0 or missing, but recipeCapacity > 0 and NOT manually overridden, fallback to recipeCapacity
      if (manualQty <= 0 && recipeCapacity > 0) {
        return recipeCapacity;
      }
      return Math.min(manualQty, recipeCapacity);
    }

    return manualQty;
  };

  // Merge manual toggles, 0-stock level items, and items with out-of-stock ingredients for customer menu visibility
  const finalUnavailableItemIds = useMemo(() => {
    const outOfStockIds: string[] = [];

    menuItems.forEach((item) => {
      // 1. Manually toggled off in unavailableItemIds
      if (unavailableItemIds.includes(item.id)) {
        outOfStockIds.push(item.id);
        return;
      }

      // 2. Dynamic dish capacity check
      const capacity = getDishStockCapacity(item);
      if (capacity <= 0) {
        outOfStockIds.push(item.id);
      }
    });

    return Array.from(new Set(outOfStockIds));
  }, [unavailableItemIds, stockLevels, menuItems, ingredientsInventory, manualStockOverrides]);

  // --- DATABASE PERSISTENCE & SYNCING ---
  const fetchDb = async () => {
    try {
      const res = await fetch('/api/db');
      if (!res.ok) throw new Error('API fetch failed');
      const data = await res.json();
      
      if (data.menuItems) setMenuItems(prev => JSON.stringify(prev) !== JSON.stringify(data.menuItems) ? data.menuItems : prev);
      if (data.ingredientsInventory) setIngredientsInventory(prev => JSON.stringify(prev) !== JSON.stringify(data.ingredientsInventory) ? data.ingredientsInventory : prev);
      if (data.stockLevels) setStockLevels(prev => JSON.stringify(prev) !== JSON.stringify(data.stockLevels) ? data.stockLevels : prev);
      if (data.manualStockOverrides) setManualStockOverrides(prev => JSON.stringify(prev) !== JSON.stringify(data.manualStockOverrides) ? data.manualStockOverrides : prev);
      if (data.hiddenCategories) setHiddenCategories(prev => JSON.stringify(prev) !== JSON.stringify(data.hiddenCategories) ? data.hiddenCategories : prev);
      if (data.orders) setOrders(prev => JSON.stringify(prev) !== JSON.stringify(data.orders) ? data.orders : prev);
      if (data.groupSessions) setGroupSessions(prev => JSON.stringify(prev) !== JSON.stringify(data.groupSessions) ? data.groupSessions : prev);
      
      // Update active groupSession if we are in one
      const activeGroupId = localStorage.getItem('curvada_active_group_id');
      if (activeGroupId && data.groupSessions) {
        const found = data.groupSessions.find((s: any) => s.id === activeGroupId);
        if (found) {
          if (found.status === 'active') {
            setGroupSession(found);
          } else if (found.status === 'completed') {
            const finalId = (found as any).finalOrderId;
            if (finalId) {
              setActiveOrderId(finalId);
              localStorage.setItem('curvada_active_id', finalId);
              setActiveTab('tracker');
              localStorage.removeItem('curvada_active_group_id');
              setGroupSession(null);
            } else {
              localStorage.removeItem('curvada_active_group_id');
              setGroupSession(null);
            }
          } else {
            localStorage.removeItem('curvada_active_group_id');
            setGroupSession(null);
          }
        } else {
          setGroupSession(null);
        }
      } else {
        setGroupSession(null);
      }
    } catch (err) {
      console.error("API hydration failed", err);
    }
  };

  useEffect(() => {
    // 1. Load cart locally
    const cachedCart = localStorage.getItem('curvada_cart');
    if (cachedCart) {
      try {
        setCart(JSON.parse(cachedCart));
      } catch (e) {
        console.error("Cart hydration failed");
      }
    }

    // 2. Load active order ID
    const cachedActiveId = localStorage.getItem('curvada_active_id');
    if (cachedActiveId) {
      setActiveOrderId(cachedActiveId);
    }

    // 3. Initial state load from server
    fetchDb();

    // 4. Real-time WebSocket event subscription (Zero page reloads or aggressive polling!)
    const unsubscribe = realtimeOrderService.subscribe((event) => {
      if (event.type === 'STATUS_CHANGED') {
        setOrders((prevOrders) => {
          return prevOrders.map((o) => {
            if (o.id === event.orderId) {
              const existingLogs = o.logs || [];
              const newLogs = existingLogs.some(l => l.status === event.status)
                ? existingLogs
                : [...existingLogs, { status: event.status, timestamp: event.timestamp || new Date().toISOString() }];
              return { ...o, status: event.status, logs: newLogs };
            }
            return o;
          });
        });
      } else if (event.type === 'NEW_ORDER') {
        setOrders((prevOrders) => {
          if (prevOrders.some(o => o.id === event.order.id)) return prevOrders;
          return [event.order, ...prevOrders];
        });
      } else if (event.type === 'ORDER_UPDATED') {
        setOrders((prevOrders) => {
          return prevOrders.map(o => o.id === event.order.id ? event.order : o);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Save changes to cart locally
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('curvada_cart', JSON.stringify(newCart));
  };

  // Helper to save menu items state
  const saveMenuItems = async (newItems: MenuItem[]) => {
    setMenuItems(newItems);
    localStorage.setItem('curvada_menu_items', JSON.stringify(newItems));
  };

  // Helper to save stock levels state
  const saveStockLevels = async (newLevels: Record<string, number>) => {
    setStockLevels(newLevels);
    localStorage.setItem('curvada_stock_levels', JSON.stringify(newLevels));
    try {
      await fetch('/api/stock/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockLevels: newLevels, manualStockOverrides })
      });
    } catch (e) {
      console.error("Failed to sync stock levels to server", e);
    }
  };


  const handleResetToDemo = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      
      setMenuItems(data.db.menuItems);
      setIngredientsInventory(data.db.ingredientsInventory);
      setStockLevels(data.db.stockLevels);
      setManualStockOverrides(data.db.manualStockOverrides);
      setHiddenCategories(data.db.hiddenCategories);
      setOrders(data.db.orders);
      setGroupSessions(data.db.groupSessions);
      setGroupSession(null);
      
      // Reset local states
      setCart([]);
      localStorage.removeItem('curvada_cart');
      localStorage.removeItem('curvada_hidden_categories');
      setHiddenCategories([]);
      setActiveOrderId(null);
      localStorage.removeItem('curvada_active_id');
    } catch (e) {
      console.error("Failed to reset to demo", e);
    }
  };

  const handleClearAllData = async () => {
    try {
      const res = await fetch('/api/clear', { method: 'POST' });
      const data = await res.json();
      
      setOrders(data.db.orders);
      setGroupSessions(data.db.groupSessions);
      setGroupSession(null);
      setActiveOrderId(null);
      localStorage.removeItem('curvada_active_id');
      localStorage.removeItem('curvada_active_group_id');
    } catch (e) {
      console.error("Failed to clear data", e);
    }
  };

  // --- ACTIONS ---

  // Triggered when clicking "Customize & Add to Cart"
  const handleAddToCart = (
    menuItem: MenuItem,
    selectedOptions: { optionTitle: string; choice: any }[],
    quantity: number,
    specialInstructions: string
  ) => {
    // Determine total unit price (base + selected option diffs)
    let totalUnitPrice = menuItem.price;
    selectedOptions.forEach((opt) => {
      totalUnitPrice += opt.choice.price;
    });

    const maxCap = getDishStockCapacity(menuItem);
    const existingQty = (groupSession ? groupSession.items : cart)
      .filter((cItem) => cItem.menuItem.id === menuItem.id)
      .reduce((sum, cItem) => sum + cItem.quantity, 0);
    const allowedQty = Math.max(0, maxCap - existingQty);
    if (allowedQty <= 0) {
      return;
    }
    const finalQty = Math.min(quantity, allowedQty);

    if (groupSession) {
      // Add to group session items in localStorage
      const groupItemId = `grp-item-${Math.random().toString(36).substr(2, 9)}`;
      const groupCartItem: GroupCartItem = {
        id: groupItemId,
        memberId: userId,
        memberName: nickname || 'Member',
        menuItem,
        selectedOptions,
        quantity: finalQty,
        specialInstructions: specialInstructions.trim() || undefined,
        totalUnitPrice,
      };

      const cached = localStorage.getItem('curvada_group_sessions');
      let sessions: GroupOrderSession[] = [];
      if (cached) {
        try { sessions = JSON.parse(cached); } catch (e) {}
      }

      const updated = sessions.map(s => {
        if (s.id === groupSession.id) {
          return {
            ...s,
            items: [...s.items, groupCartItem]
          };
        }
        return s;
      });

      localStorage.setItem('curvada_group_sessions', JSON.stringify(updated));
      syncGroupSession();
      setIsGroupPanelOpen(true);
    } else {
      // Create unique cart ID based on options selected so same items with different configurations reside as individual items
      const optionHash = selectedOptions.map((opt) => `${opt.optionTitle}-${opt.choice.id}`).join('|');
      const cartItemId = `${menuItem.id}-${optionHash}-${specialInstructions ? btoa(specialInstructions).slice(0, 8) : ''}`;

      const existingIndex = cart.findIndex((item) => item.id === cartItemId);

      if (existingIndex > -1) {
        // increase quantity
        const updated = [...cart];
        updated[existingIndex].quantity = Math.min(maxCap, updated[existingIndex].quantity + finalQty);
        saveCart(updated);
      } else {
        // add fresh item
        const newItem: CartItem = {
          id: cartItemId,
          menuItem,
          selectedOptions,
          quantity: finalQty,
          specialInstructions: specialInstructions.trim() || undefined,
          totalUnitPrice,
        };
        saveCart([...cart, newItem]);
      }

      // feedback details: open cart drawer immediately to see progress
      setIsCartOpen(true);
    }
  };

  // Cart quantity adjustment
  const handleUpdateCartQuantity = (id: string, delta: number) => {
    const updated = cart
      .map((item) => {
        if (item.id === id) {
          const maxCap = getDishStockCapacity(item.menuItem);
          const qty = Math.min(maxCap, Math.max(0, item.quantity + delta));
          return { ...item, quantity: qty };
        }
        return item;
      })
      .filter((item) => item.quantity > 0);
    saveCart(updated);
  };

  // Cart item deletion
  const handleRemoveCartItem = (id: string) => {
    const updated = cart.filter((item) => item.id !== id);
    saveCart(updated);
  };

  // Order Again action (Reorder history item)
  const handleOrderAgain = (itemsToCopy: CartItem[]) => {
    const freshCart = [...cart];
    itemsToCopy.forEach((copied) => {
      // create unique option key for fresh addition
      const optionHash = copied.selectedOptions.map((opt) => `${opt.optionTitle}-${opt.choice.id}`).join('|');
      const cartItemId = `${copied.menuItem.id}-${optionHash}-${copied.specialInstructions ? btoa(copied.specialInstructions).slice(0, 8) : ''}`;

      const existingIndex = freshCart.findIndex((item) => item.id === cartItemId);
      if (existingIndex > -1) {
        freshCart[existingIndex].quantity += copied.quantity;
      } else {
        freshCart.push({
          ...copied,
          id: cartItemId,
        });
      }
    });

    saveCart(freshCart);
    setActiveTab('menu');
    setIsCartOpen(true);
  };

  // Helper to deduct ingredient levels when order is placed
  const deductIngredients = (items: any[]) => {
    const updatedIngredients = [...ingredientsInventory];
    items.forEach((item) => {
      const menuItem = item.menuItem;
      const orderQty = item.quantity || 1;

      if (menuItem.recipeRequirements && menuItem.recipeRequirements.length > 0) {
        menuItem.recipeRequirements.forEach((req: any) => {
          const ing = updatedIngredients.find(
            (i) => i.name.toLowerCase() === req.name.toLowerCase()
          );
          if (ing) {
            const amountPerServing = ing.unit === 'kg' ? req.amount / 1000 : req.amount;
            const amountToDeduct = amountPerServing * orderQty;
            ing.quantity = Math.max(0, Number((ing.quantity - amountToDeduct).toFixed(4)));
          }
        });
      } else if (menuItem.ingredients) {
        menuItem.ingredients.forEach((ingName: string) => {
          const ing = updatedIngredients.find(
            (i) => i.name.toLowerCase() === ingName.toLowerCase()
          );
          if (ing) {
            let amountPerServing = 100; // fallback in grams
            if (ing.unit === 'pcs' || ing.unit === 'cans') {
              amountPerServing = 1;
            } else if (ing.unit === 'kg') {
              amountPerServing = 0.1; // 100g as 0.1kg
            }
            const amountToDeduct = amountPerServing * orderQty;
            ing.quantity = Math.max(0, Number((ing.quantity - amountToDeduct).toFixed(4)));
          }
        });
      }
    });
    saveIngredientsInventory(updatedIngredients);
  };

  // Helper to restore ingredient and stock levels when an order is cancelled
  const restoreOrderStock = (
    orderItems: any[],
    currentStockLevels: Record<string, number>,
    currentIngredientsInventory: IngredientStock[]
  ) => {
    const updatedStock = { ...currentStockLevels };
    const updatedIngredients = currentIngredientsInventory.map(i => ({ ...i }));

    orderItems.forEach((item) => {
      const menuItem = item.menuItem;
      const orderQty = item.quantity || 1;

      // 1. Restore item stock level
      if (menuItem && menuItem.id) {
        const id = menuItem.id;
        if (updatedStock[id] !== undefined) {
          updatedStock[id] += orderQty;
        }
      }

      // 2. Restore ingredient stock levels
      if (menuItem) {
        if (menuItem.recipeRequirements && menuItem.recipeRequirements.length > 0) {
          menuItem.recipeRequirements.forEach((req: any) => {
            const ing = updatedIngredients.find(
              (i) => i.name.toLowerCase() === req.name.toLowerCase()
            );
            if (ing) {
              const amountPerServing = ing.unit === 'kg' ? req.amount / 1000 : req.amount;
              const amountToRestore = amountPerServing * orderQty;
              ing.quantity = Number((ing.quantity + amountToRestore).toFixed(4));
            }
          });
        } else if (menuItem.ingredients) {
          menuItem.ingredients.forEach((ingName: string) => {
            const ing = updatedIngredients.find(
              (i) => i.name.toLowerCase() === ingName.toLowerCase()
            );
            if (ing) {
              let amountPerServing = 100;
              if (ing.unit === 'pcs' || ing.unit === 'cans') {
                amountPerServing = 1;
              } else if (ing.unit === 'kg') {
                amountPerServing = 0.1;
              }
              const amountToRestore = amountPerServing * orderQty;
              ing.quantity = Number((ing.quantity + amountToRestore).toFixed(4));
            }
          });
        }
      }
    });

    return { updatedStock, updatedIngredients };
  };

  // Checkout order submission
  const handlePlaceOrder = async (customer: CustomerInfo, paymentMethod: 'cod' | 'ewallet' | 'card') => {
    let finalOrder: Order;
    let updatedStock = { ...stockLevels };
    let updatedIngredients = [...ingredientsInventory];

    if (isCheckoutForGroup && groupSession) {
      if (groupSession.hostId !== userId) {
        alert("Only the session Host can place the final group order.");
        return;
      }
      const unready = groupSession.members.filter(m => !m.isReady);
      if (unready.length > 0) {
        alert(`⚠️ Cannot place order yet!\n\nThe following member(s) are not ready:\n• ${unready.map(m => m.name).join('\n• ')}\n\nPlease wait for all members to click 'Mark as Ready'.`);
        return;
      }

      // Create order with group tags
      const newOrderId = `ord-group-${groupSession.id}-${Math.random().toString(36).substr(2, 5)}`;
      const totalAmount = mappedGroupCartItems.reduce((sum, item) => sum + item.totalUnitPrice * item.quantity, 0);

      finalOrder = {
        id: newOrderId,
        items: mappedGroupCartItems as any[],
        totalAmount,
        customer,
        paymentMethod,
        status: 'pending',
        timestamp: new Date().toISOString(),
        logs: [
          {
            status: 'pending',
            timestamp: new Date().toISOString(),
            note: `Group Order session ${groupSession.id} successfully checked out by Host ${groupSession.hostName}.`,
          },
        ],
        isGroupOrder: true,
        groupSessionId: groupSession.id,
      };

      // Deduct stock levels
      mappedGroupCartItems.forEach((item) => {
        const id = item.menuItem.id;
        if (updatedStock[id] !== undefined) {
          updatedStock[id] = Math.max(0, updatedStock[id] - item.quantity);
        }
      });

      // Deduct ingredient stock levels
      mappedGroupCartItems.forEach((item) => {
        const menuItem = item.menuItem;
        const orderQty = item.quantity || 1;

        if (menuItem.recipeRequirements && menuItem.recipeRequirements.length > 0) {
          menuItem.recipeRequirements.forEach((req: any) => {
            const ing = updatedIngredients.find(
              (i) => i.name.toLowerCase() === req.name.toLowerCase()
            );
            if (ing) {
              const amountPerServing = ing.unit === 'kg' ? req.amount / 1000 : req.amount;
              const amountToDeduct = amountPerServing * orderQty;
              ing.quantity = Math.max(0, Number((ing.quantity - amountToDeduct).toFixed(4)));
            }
          });
        } else if (menuItem.ingredients) {
          menuItem.ingredients.forEach((ingName: string) => {
            const ing = updatedIngredients.find(
              (i) => i.name.toLowerCase() === ingName.toLowerCase()
            );
            if (ing) {
              let amountPerServing = 100;
              if (ing.unit === 'pcs' || ing.unit === 'cans') {
                amountPerServing = 1;
              } else if (ing.unit === 'kg') {
                amountPerServing = 0.1;
              }
              const amountToDeduct = amountPerServing * orderQty;
              ing.quantity = Math.max(0, Number((ing.quantity - amountToDeduct).toFixed(4)));
            }
          });
        }
      });

      // Update group sessions status to completed
      const updatedSessions = groupSessions.map(s => {
        if (s.id === groupSession.id) {
          return {
            ...s,
            status: 'completed' as const,
            finalOrderId: newOrderId
          };
        }
        return s;
      });
      setGroupSessions(updatedSessions);
      localStorage.setItem('curvada_group_sessions', JSON.stringify(updatedSessions));
      localStorage.removeItem('curvada_active_group_id');
      setGroupSession(null);

      // Set active order & reset Checkout
      setActiveOrderId(newOrderId);
      localStorage.setItem('curvada_active_id', newOrderId);
      setIsCheckoutForGroup(false);
      setActiveTab('tracker');
    } else {
      const newOrderId = `ord-${Math.random().toString(36).substr(2, 9)}`;
      const totalAmount = cart.reduce((sum, item) => sum + item.totalUnitPrice * item.quantity, 0);

      finalOrder = {
        id: newOrderId,
        items: cart,
        totalAmount,
        customer,
        paymentMethod,
        status: 'pending',
        timestamp: new Date().toISOString(),
        logs: [
          {
            status: 'pending',
            timestamp: new Date().toISOString(),
            note: 'Your order was successfully placed and transmitted to Curvada Kitchen.',
          },
        ],
      };

      // Deduct stock levels for purchased items
      cart.forEach((item) => {
        const id = item.menuItem.id;
        if (updatedStock[id] !== undefined) {
          updatedStock[id] = Math.max(0, updatedStock[id] - item.quantity);
        }
      });

      // Deduct ingredient stock levels
      cart.forEach((item) => {
        const menuItem = item.menuItem;
        const orderQty = item.quantity || 1;

        if (menuItem.recipeRequirements && menuItem.recipeRequirements.length > 0) {
          menuItem.recipeRequirements.forEach((req: any) => {
            const ing = updatedIngredients.find(
              (i) => i.name.toLowerCase() === req.name.toLowerCase()
            );
            if (ing) {
              const amountPerServing = ing.unit === 'kg' ? req.amount / 1000 : req.amount;
              const amountToDeduct = amountPerServing * orderQty;
              ing.quantity = Math.max(0, Number((ing.quantity - amountToDeduct).toFixed(4)));
            }
          });
        } else if (menuItem.ingredients) {
          menuItem.ingredients.forEach((ingName: string) => {
            const ing = updatedIngredients.find(
              (i) => i.name.toLowerCase() === ingName.toLowerCase()
            );
            if (ing) {
              let amountPerServing = 100;
              if (ing.unit === 'pcs' || ing.unit === 'cans') {
                amountPerServing = 1;
              } else if (ing.unit === 'kg') {
                amountPerServing = 0.1;
              }
              const amountToDeduct = amountPerServing * orderQty;
              ing.quantity = Math.max(0, Number((ing.quantity - amountToDeduct).toFixed(4)));
            }
          });
        }
      });

      // Set as active order
      setActiveOrderId(newOrderId);
      localStorage.setItem('curvada_active_id', newOrderId);

      // Empty cart
      saveCart([]);

      // Go to Tracker tab
      setActiveTab('tracker');
    }

    // Broadcast live WebSocket event instantly
    realtimeOrderService.broadcast({ type: 'NEW_ORDER', order: finalOrder });

    // Submit to server
    try {
      const res = await fetch('/api/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: finalOrder,
          stockLevels: updatedStock,
          ingredientsInventory: updatedIngredients
        })
      });
      const data = await res.json();
      setOrders(data.db.orders);
      setStockLevels(data.db.stockLevels);
      setIngredientsInventory(data.db.ingredientsInventory);
      if (isCheckoutForGroup && groupSession) {
        await fetch('/api/group/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupSessions: groupSessions.map(s => s.id === groupSession.id ? { ...s, status: 'completed' as const, finalOrderId: finalOrder.id } : s) })
        });
      }
    } catch (e) {
      console.error("Failed to place order on server", e);
      setOrders([finalOrder, ...orders]);
      setStockLevels(updatedStock);
      setIngredientsInventory(updatedIngredients);
    }
  };

  // Cancel pending order
  const handleCancelOrder = async (orderId: string) => {
    const o = orders.find(ord => ord.id === orderId);
    if (!o) return;
    if (o.status === 'cancelled') return;

    const newLogs = [
      ...o.logs,
      { status: 'cancelled' as const, timestamp: new Date().toISOString(), note: 'Cancelled by customer' }
    ];

    // Restore stock in local state immediately
    const { updatedStock, updatedIngredients } = restoreOrderStock(o.items, stockLevels, ingredientsInventory);
    setStockLevels(updatedStock);
    setIngredientsInventory(updatedIngredients);
    localStorage.setItem('curvada_stock_levels', JSON.stringify(updatedStock));

    try {
      const res = await fetch('/api/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'cancelled', logs: newLogs })
      });
      const data = await res.json();
      if (data.db) {
        if (data.db.orders) setOrders(data.db.orders);
        if (data.db.stockLevels) setStockLevels(data.db.stockLevels);
        if (data.db.ingredientsInventory) setIngredientsInventory(data.db.ingredientsInventory);
      }
    } catch (e) {
      console.error(e);
      const updated = orders.map((ord) => {
        if (ord.id === orderId) {
          return { ...ord, status: 'cancelled' as OrderStatus, logs: newLogs };
        }
        return ord;
      });
      setOrders(updated);
    }
  };

  // Customer updates checked/confirmed items
  const handleUpdateConfirmedItems = async (orderId: string, confirmedItemIds: string[]) => {
    try {
      const res = await fetch('/api/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, confirmedItemIds })
      });
      const data = await res.json();
      setOrders(data.db.orders);
    } catch (e) {
      console.error(e);
      const updated = orders.map((o) => {
        if (o.id === orderId) {
          return { ...o, confirmedItemIds };
        }
        return o;
      });
      setOrders(updated);
    }
  };

  // Kitchen Chef Updates (Status Progression) - Memoized to prevent parent re-renders
  const handleUpdateOrderStatus = React.useCallback(async (
    orderId: string, 
    newStatus: OrderStatus, 
    cookingStartTime?: string, 
    estimatedPrepTime?: number
  ) => {
    // Broadcast live WebSocket status update instantly
    realtimeOrderService.broadcast({
      type: 'STATUS_CHANGED',
      orderId,
      status: newStatus,
      timestamp: new Date().toISOString()
    });

    setOrders((prevOrders) => {
      const o = prevOrders.find(ord => ord.id === orderId);
      if (!o) return prevOrders;

      // If cancelling an active order, restore item stock & raw ingredients in local state
      if (newStatus === 'cancelled' && o.status !== 'cancelled') {
        const { updatedStock, updatedIngredients } = restoreOrderStock(o.items, stockLevels, ingredientsInventory);
        setStockLevels(updatedStock);
        setIngredientsInventory(updatedIngredients);
        localStorage.setItem('curvada_stock_levels', JSON.stringify(updatedStock));
      }

      const logs = [
        ...o.logs,
        {
          status: newStatus,
          timestamp: new Date().toISOString(),
          note: `Status updated by Chef Kitchen Panel to ${newStatus}.`,
        },
      ];

      fetch('/api/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          status: newStatus, 
          logs,
          cookingStartTime,
          estimatedPrepTime
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.db) {
          if (data.db.stockLevels) setStockLevels(data.db.stockLevels);
          if (data.db.ingredientsInventory) setIngredientsInventory(data.db.ingredientsInventory);
        }
      })
      .catch((e) => console.error("Failed to sync order status to server", e));

      return prevOrders.map((item) => {
        if (item.id === orderId) {
          const updatedO = { ...item, status: newStatus, logs };
          if (cookingStartTime !== undefined) updatedO.cookingStartTime = cookingStartTime;
          if (estimatedPrepTime !== undefined) updatedO.estimatedPrepTime = estimatedPrepTime;
          return updatedO;
        }
        return item;
      });
    });
  }, [orders, stockLevels, ingredientsInventory]);

  const handleToggleItemCooked = async (orderId: string, itemId: string) => {
    const o = orders.find(ord => ord.id === orderId);
    if (!o) return;
    const cooked = o.cookedItemIds || [];
    const updatedCooked = cooked.includes(itemId)
      ? cooked.filter(id => id !== itemId)
      : [...cooked, itemId];

    const started = o.startedItemIds || [];
    const updatedStarted = started.includes(itemId) ? started : [...started, itemId];

    // Calculate remaining prep time for undone items
    const undoneItems = o.items.filter(item => !updatedCooked.includes(item.id));
    
    let newPrepTime = o.estimatedPrepTime;
    let newStartTime = o.cookingStartTime;
    
    if (!newStartTime && undoneItems.length > 0) {
      newStartTime = new Date().toISOString();
      const itemTimes = undoneItems.map(item => {
        const match = menuItems.find(m => m.id === item.menuItem.id);
        return match?.estimatedPrepTime || item.menuItem.estimatedPrepTime || 10;
      });
      const maxTime = Math.max(...itemTimes);
      const totalQty = undoneItems.reduce((sum, item) => sum + item.quantity, 0);
      newPrepTime = maxTime + (totalQty - 1) * 2;
    } else if (newStartTime && undoneItems.length > 0) {
      // Auto-compute remaining time based on remaining menu items
      const itemTimes = undoneItems.map(item => {
        const match = menuItems.find(m => m.id === item.menuItem.id);
        return match?.estimatedPrepTime || item.menuItem.estimatedPrepTime || 10;
      });
      const maxTime = Math.max(...itemTimes);
      const totalQty = undoneItems.reduce((sum, item) => sum + item.quantity, 0);
      const remainingPrepTime = maxTime + (totalQty - 1) * 2;

      // Calculate elapsed minutes since cooking started
      const elapsedMs = Date.now() - new Date(newStartTime).getTime();
      const elapsedMins = elapsedMs / (60 * 1000);
      newPrepTime = Math.max(1, Math.round(elapsedMins + remainingPrepTime));
    } else if (undoneItems.length === 0) {
      // All items completed
      if (!newStartTime) newStartTime = new Date().toISOString();
      const elapsedMs = Date.now() - new Date(newStartTime).getTime();
      const elapsedMins = elapsedMs / (60 * 1000);
      newPrepTime = Math.max(1, Math.round(elapsedMins));
    }

    // Optimistic UI update
    setOrders((prevOrders) => prevOrders.map((ord) => {
      if (ord.id === orderId) {
        return { 
          ...ord, 
          cookedItemIds: updatedCooked, 
          startedItemIds: updatedStarted,
          estimatedPrepTime: newPrepTime, 
          cookingStartTime: newStartTime || undefined 
        };
      }
      return ord;
    }));

    try {
      const res = await fetch('/api/orders/cook-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          cookedItemIds: updatedCooked, 
          startedItemIds: updatedStarted,
          estimatedPrepTime: newPrepTime,
          cookingStartTime: newStartTime
        })
      });
      const data = await res.json();
      if (data?.db?.orders) setOrders(data.db.orders);
    } catch (e) {
      console.error("Failed to sync cook-item to server", e);
    }
  };

  const handleStartItemCooking = async (orderId: string, itemId: string) => {
    const o = orders.find(ord => ord.id === orderId);
    if (!o) return;
    const started = o.startedItemIds || [];
    const updatedStarted = started.includes(itemId) ? started : [...started, itemId];

    // If order timer is not started yet, start it now!
    let newPrepTime = o.estimatedPrepTime;
    let newStartTime = o.cookingStartTime;
    if (!newStartTime) {
      newStartTime = new Date().toISOString();
      const itemTimes = o.items.map(item => {
        const match = menuItems.find(m => m.id === item.menuItem.id);
        return match?.estimatedPrepTime || item.menuItem.estimatedPrepTime || 10;
      });
      const maxTime = itemTimes.length > 0 ? Math.max(...itemTimes) : 10;
      const totalQty = o.items.reduce((sum, item) => sum + item.quantity, 0);
      newPrepTime = maxTime + (totalQty - 1) * 2;
    }

    // Optimistic UI update
    setOrders((prevOrders) => prevOrders.map((ord) => {
      if (ord.id === orderId) {
        return { 
          ...ord, 
          startedItemIds: updatedStarted, 
          cookingStartTime: newStartTime || undefined, 
          estimatedPrepTime: newPrepTime 
        };
      }
      return ord;
    }));

    try {
      const res = await fetch('/api/orders/cook-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          startedItemIds: updatedStarted,
          cookingStartTime: newStartTime,
          estimatedPrepTime: newPrepTime
        })
      });
      const data = await res.json();
      if (data?.db?.orders) setOrders(data.db.orders);
    } catch (e) {
      console.error("Failed to sync start item cooking to server", e);
    }
  };

  const handleSetCookedBy = async (orderId: string, staffName: string) => {
    // Optimistic UI update
    setOrders((prevOrders) => prevOrders.map((ord) => {
      if (ord.id === orderId) {
        return { ...ord, cookedBy: staffName };
      }
      return ord;
    }));

    try {
      const res = await fetch('/api/orders/cook-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, cookedBy: staffName })
      });
      const data = await res.json();
      if (data?.db?.orders) setOrders(data.db.orders);
    } catch (e) {
      console.error("Failed to sync cookedBy staff to server", e);
    }
  };

  const handleGenerateRandomOrder = async () => {
    const customers = [
      { name: 'Juan Dela Cruz', phone: '09171234567', email: 'juan@gmail.com', orderType: 'pickup', tableNumber: '4' },
      { name: 'Maria Clara', phone: '09187654321', email: 'maria@gmail.com', orderType: 'delivery', address: '456 Rizal Ave, Pasay City' },
      { name: 'Jose Rizal', phone: '09199998888', email: 'jose@gmail.com', orderType: 'pickup', tableNumber: '7' },
      { name: 'Andres Bonifacio', phone: '09205554444', email: 'andres@gmail.com', orderType: 'delivery', address: '789 Mabini St, Manila' },
      { name: 'Gabriela Silang', phone: '09214443333', email: 'gabriela@gmail.com', orderType: 'delivery', address: '12 Pioneer St, Mandaluyong' },
      { name: 'Melchora Aquino', phone: '09223332222', email: 'melchora@gmail.com', orderType: 'pickup', tableNumber: '2' },
      { name: 'Arnel Cruz', phone: '09234567890', email: 'arnel@gmail.com', orderType: 'delivery', address: 'Block 5 Lot 12, Metro Manila' }
    ];

    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const orderType = randomCustomer.orderType as 'pickup' | 'delivery';

    // Pick 1 to 3 random menu items
    const numberOfItems = Math.floor(Math.random() * 3) + 1;
    const selectedItems = [];
    let totalAmount = 0;

    const shuffledMenu = [...menuItems].sort(() => 0.5 - Math.random());
    const itemsToPick = shuffledMenu.slice(0, numberOfItems);

    for (const menuItem of itemsToPick) {
      const quantity = Math.floor(Math.random() * 3) + 1;
      const selectedOptions: Record<string, string> = {};
      let itemPrice = menuItem.price;

      if (menuItem.customizableOptions) {
        menuItem.customizableOptions.forEach(opt => {
          const choice = opt.choices[Math.floor(Math.random() * opt.choices.length)];
          selectedOptions[opt.title] = choice.name;
          itemPrice += choice.price;
        });
      }

      selectedItems.push({
        id: `item-${Math.random().toString(36).substr(2, 9)}`,
        menuItem,
        quantity,
        selectedOptions,
        price: itemPrice
      });

      totalAmount += itemPrice * quantity;
    }

    const randomOrderId = `ord-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const newOrder: Order = {
      id: randomOrderId,
      items: selectedItems,
      totalAmount,
      customer: {
        name: randomCustomer.name,
        phone: randomCustomer.phone,
        email: randomCustomer.email,
        orderType,
        tableNumber: orderType === 'pickup' ? randomCustomer.tableNumber : undefined,
        address: orderType === 'delivery' ? randomCustomer.address : undefined
      },
      paymentMethod: ['cod', 'ewallet', 'card'][Math.floor(Math.random() * 3)] as 'cod' | 'ewallet' | 'card',
      status: 'pending',
      timestamp: new Date().toISOString(),
      logs: [
        {
          status: 'pending',
          timestamp: new Date().toISOString(),
          note: 'Sample order generated by system simulator.'
        }
      ]
    };

    try {
      const res = await fetch('/api/orders/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder })
      });
      const data = await res.json();
      setOrders(data.db.orders);
    } catch (e) {
      console.error(e);
      setOrders([newOrder, ...orders]);
    }
  };

  // Toggle item availability
  const handleToggleItemAvailability = async (itemId: string) => {
    let newUnavailable: string[];
    const isCurrentlyUnavailable = unavailableItemIds.includes(itemId);
    if (isCurrentlyUnavailable) {
      newUnavailable = unavailableItemIds.filter((id) => id !== itemId);
      if (stockLevels[itemId] <= 0) {
        await saveStockLevels({ ...stockLevels, [itemId]: 18 });
      }
    } else {
      newUnavailable = [...unavailableItemIds, itemId];
    }
    setUnavailableItemIds(newUnavailable);
  };

  // Update dynamic stock level from Chef Stock View
  const handleUpdateStockLevel = async (itemId: string, newQty: number, isSync: boolean = false) => {
    const qty = Math.max(0, newQty);
    let newOverrides = [...manualStockOverrides];
    if (isSync) {
      newOverrides = manualStockOverrides.filter(id => id !== itemId);
    } else {
      if (!manualStockOverrides.includes(itemId)) {
        newOverrides = [...manualStockOverrides, itemId];
      }
    }

    setStockLevels({ ...stockLevels, [itemId]: qty });
    setManualStockOverrides(newOverrides);

    try {
      await fetch('/api/stock/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockLevels: { ...stockLevels, [itemId]: qty },
          manualStockOverrides: newOverrides
        })
      });
    } catch (e) {
      console.error(e);
    }

    if (qty > 0) {
      setUnavailableItemIds(unavailableItemIds.filter((id) => id !== itemId));
    }
  };

  // Menu Builder: Add dynamic item
  const handleAddMenuItem = async (newItem: MenuItem) => {
    const updated = [...menuItems, newItem];
    const newStockLevels = { ...stockLevels, [newItem.id]: newItem.category === 'drinks' ? 45 : 18 };
    
    // Optimistic Update
    setMenuItems(updated);
    setStockLevels(newStockLevels);
    localStorage.setItem('curvada_menu_items', JSON.stringify(updated));
    localStorage.setItem('curvada_stock_levels', JSON.stringify(newStockLevels));

    try {
      const res = await fetch('/api/menu/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuItem: newItem, stockLevels: newStockLevels })
      });
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.db.menuItems);
        setStockLevels(data.db.stockLevels);
      }
    } catch (e) {
      console.error("Failed to sync new menu item to server", e);
    }
  };

  // Menu Builder: Edit dynamic item
  const handleEditMenuItem = async (updatedItem: MenuItem) => {
    const updated = menuItems.map((item) => item.id === updatedItem.id ? updatedItem : item);
    
    // Optimistic Update
    setMenuItems(updated);
    localStorage.setItem('curvada_menu_items', JSON.stringify(updated));

    try {
      const res = await fetch('/api/menu/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuItem: updatedItem })
      });
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.db.menuItems);
      }
    } catch (e) {
      console.error("Failed to sync edited menu item to server", e);
    }
  };

  // Menu Builder: Delete dynamic item
  const handleDeleteMenuItem = async (itemId: string) => {
    const updated = menuItems.filter((item) => item.id !== itemId);
    const newStockLevels = { ...stockLevels };
    delete newStockLevels[itemId];
    
    // Optimistic Update
    setMenuItems(updated);
    setStockLevels(newStockLevels);
    setUnavailableItemIds(unavailableItemIds.filter((id) => id !== itemId));
    localStorage.setItem('curvada_menu_items', JSON.stringify(updated));
    localStorage.setItem('curvada_stock_levels', JSON.stringify(newStockLevels));

    try {
      const res = await fetch('/api/menu/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, stockLevels: newStockLevels })
      });
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.db.menuItems);
        setStockLevels(data.db.stockLevels);
      }
    } catch (e) {
      console.error("Failed to delete menu item from server", e);
    }
  };

  // Quick addition from Hero
  const handleQuickAdd = (item: MenuItem) => {
    // If has customizable options, open customizer modal instead of direct adding
    if (item.customizableOptions && item.customizableOptions.length > 0) {
      setCustomizingItem(item);
    } else {
      // direct adding with default options if any
      handleAddToCart(item, [], 1, '');
    }
  };

  // Calculate cart items total count
  const cartItemsCount = useMemo(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  // Get active order object
  const activeOrder = useMemo(() => {
    if (!activeOrderId) return null;
    return orders.find((o) => o.id === activeOrderId) || null;
  }, [orders, activeOrderId]);

  return (
    <div className="bg-[#0D0D0C] min-h-screen text-white font-sans selection:bg-brand-red selection:text-white flex flex-col justify-between">
      
      {/* Navbar Header */}
      {activeTab !== 'chef' && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          cartCount={cartItemsCount}
          onCartClick={() => setIsCartOpen(true)}
          hasActiveOrder={!!activeOrder && (activeOrder.status === 'pending' || activeOrder.status === 'preparing' || activeOrder.status === 'dispatched')}
          onGroupOrderClick={() => setIsGroupPanelOpen(true)}
          isGroupActive={!!groupSession}
          onLoginClick={() => setIsAuthModalOpen(true)}
          loggedInCustomer={loggedInCustomer}
          onLogout={() => {
            setLoggedInCustomer(null);
            localStorage.removeItem('curvada_logged_customer');
          }}
        />
      )}

      {/* Group Order Active Alert Banner */}
      {groupSession && (
        <div className="bg-brand-red border-b border-white/10 text-white py-2.5 px-4 md:px-8 text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-lg">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="leading-none">
              👥 Ordering in <strong className="font-extrabold uppercase">{groupSession.hostName}'s Group</strong> (Code: <span className="font-mono bg-black/25 px-1.5 py-0.5 rounded text-brand-gold font-bold">{groupSession.id}</span>) 
              • {groupSession.items.length} dishes in shared bag 
              • {groupSession.members.filter(m => m.isReady).length}/{groupSession.members.length} members ready
            </span>
          </div>
          <button
            onClick={() => setIsGroupPanelOpen(true)}
            className="px-3.5 py-1.5 bg-white text-brand-red hover:bg-[#F2F2F2] rounded-lg font-black text-[10px] uppercase tracking-wider transition-all shadow-md"
          >
            Open Group Dashboard
          </button>
        </div>
      )}

      {/* Main Panel Content Routing */}
      <main className="flex-1">
         {activeTab === 'home' && (
          <div className="animate-fade-in space-y-16">
            <Hero
              onOrderNowClick={() => setActiveTab('menu')}
              onViewMenuClick={() => setActiveTab('menu')}
              featuredItems={menuItems}
              onQuickAdd={handleQuickAdd}
            />
            {/* Short inline About Curvada Banner */}
            <div className="py-12 bg-[#181818] border-y-2 border-white/5 px-4 md:px-8">
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
                <div className="w-24 h-24 rounded-2xl bg-brand-red/10 border-2 border-brand-red/20 flex items-center justify-center text-4xl shadow-sm flex-shrink-0">
                  🇵🇭
                </div>
                <div className="space-y-2.5 text-center md:text-left">
                  <h3 className="font-display font-black text-white text-xl uppercase tracking-wide">
                    Filipino-Inspired Craft Kitchen
                  </h3>
                  <p className="text-gray-400 text-xs md:text-sm leading-relaxed font-normal">
                    Curvada's Kitchen serves culinary nostalgia. Our chefs blend savory bento plating formats with beloved Filipino classics like sweet caramelized pork tocino, slow-braised adobo reduction glazes, and crispy golden pan-fried meat-lovers' sisig. Cooked to-go, seasoned to impress.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="animate-fade-in">
            <MenuSection
              items={menuItems}
              onItemClick={(item) => setCustomizingItem(item)}
              unavailableItemIds={finalUnavailableItemIds}
              hiddenCategories={hiddenCategories}
              getDishStockCapacity={getDishStockCapacity}
            />
          </div>
        )}

        {activeTab === 'tracker' && (
          <div className="animate-fade-in">
            <OrderTracker
              activeOrder={activeOrder}
              onCancelOrder={handleCancelOrder}
              onNewOrderClick={() => setActiveTab('menu')}
              onUpdateConfirmedItems={handleUpdateConfirmedItems}
              onUpdateOrderStatus={handleUpdateOrderStatus}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-fade-in">
            <OrderHistory
              orders={orders}
              onOrderAgain={handleOrderAgain}
              onTrackOrder={(order) => {
                setActiveOrderId(order.id);
                localStorage.setItem('curvada_active_id', order.id);
                setActiveTab('tracker');
              }}
              onBrowseMenu={() => setActiveTab('menu')}
            />
          </div>
        )}

        {activeTab === 'chef' && (
          <div className="animate-fade-in">
            <AdminPanel
              orders={orders}
              menuItems={menuItems}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              unavailableItemIds={finalUnavailableItemIds}
              onToggleItemAvailability={handleToggleItemAvailability}
              stockLevels={stockLevels}
              onUpdateStockLevel={handleUpdateStockLevel}
              onAddMenuItem={handleAddMenuItem}
              onEditMenuItem={handleEditMenuItem}
              onDeleteMenuItem={handleDeleteMenuItem}
              hiddenCategories={hiddenCategories}
              onToggleCategoryHidden={handleToggleCategoryHidden}
              ingredientsInventory={ingredientsInventory}
              onAddIngredient={handleAddIngredient}
              onUpdateIngredientStock={handleUpdateIngredientStock}
              onUpdateMultipleIngredientsStock={handleUpdateMultipleIngredientsStock}
              onEditIngredient={handleEditIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              onResetToDemo={handleResetToDemo}
              onClearAllData={handleClearAllData}
              onReturnToStore={() => setActiveTab('home')}
              onToggleItemCooked={handleToggleItemCooked}
              onSetCookedBy={handleSetCookedBy}
              onGenerateRandomOrder={handleGenerateRandomOrder}
              onStartItemCooking={handleStartItemCooking}
            />
          </div>
        )}
      </main>

      {/* --- FLOATING UTILITY DRAWER MODALS --- */}

      {/* Item Customization Overlay */}
      <CustomizeModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
        onAddToCart={handleAddToCart}
        maxAvailable={customizingItem ? getDishStockCapacity(customizingItem) : 0}
      />

      {/* Sidebar Shopping Bag Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckoutClick={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        getDishStockCapacity={getDishStockCapacity}
      />

      {/* Checkout details Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setIsCheckoutForGroup(false);
        }}
        cartItems={isCheckoutForGroup ? mappedGroupCartItems as any[] : cart}
        onSubmitOrder={handlePlaceOrder}
        loggedInCustomer={loggedInCustomer}
      />

      {/* Customer Login / Register Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(customer) => {
          setLoggedInCustomer(customer);
          localStorage.setItem('curvada_logged_customer', JSON.stringify(customer));
        }}
        onStaffPortalClick={() => {
          setIsAuthModalOpen(false);
          setActiveTab('chef');
        }}
      />

      {/* Group Order Panel Drawer */}
      <GroupOrderPanel
        isOpen={isGroupPanelOpen}
        onClose={() => setIsGroupPanelOpen(false)}
        session={groupSession}
        currentUserNickname={nickname}
        currentUserId={userId}
        onStartSession={handleStartGroupSession}
        onJoinSession={handleJoinGroupSession}
        onLeaveSession={handleLeaveGroupSession}
        onCancelSession={handleCancelGroupSession}
        onToggleReady={handleToggleReady}
        onUpdateItemQuantity={handleUpdateGroupItemQuantity}
        onRemoveItem={handleRemoveGroupItem}
        onCheckout={() => {
          if (!groupSession) return;
          if (groupSession.hostId !== userId) {
            alert('Only the group session creator (Host) can checkout the order.');
            return;
          }
          const unready = groupSession.members.filter(m => !m.isReady);
          if (unready.length > 0) {
            alert(`⚠️ Cannot proceed to checkout yet!\n\nThe following member(s) are still choosing dishes:\n• ${unready.map(m => m.name).join('\n• ')}\n\nPlease wait for all group members to click 'Mark as Ready'.`);
            return;
          }
          setIsGroupPanelOpen(false);
          setIsCheckoutForGroup(true);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Static Footer */}
      {activeTab !== 'chef' && (
        <footer className="bg-[#0D0D0C] border-t-2 border-white/5 text-center py-8 text-xs text-gray-500 px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-white">
              <span>© 2026 Curvada's Kitchen</span>
              <span>•</span>
              <span className="text-brand-red">MADE WITH FLAVOR, MADE TO GO</span>
            </div>
            <div className="text-gray-500 text-[10px] leading-relaxed max-w-sm sm:text-right font-medium">
              Enjoy our delicious silog, bento and rich rice bowls cooked with pride. Delivery Hotline: <strong>0922-383-7377</strong>. Cavite HQ.
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
