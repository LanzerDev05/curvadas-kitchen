import { IngredientStock, MenuItem, CartItem, StockBatch, FIFODishCostResult, FIFOConsumptionLayer, StockLossReport, SpoilageRecord } from '../types';

/**
 * Normalizes an ingredient name for flexible matching (case/space-insensitive).
 */
export const normalizeIngName = (name: string): string => {
  return (name || '').toLowerCase().trim();
};

/**
 * Finds matching ingredient in inventory by name or partial match.
 */
export const findMatchingIngredient = (reqName: string, inventory: IngredientStock[]): IngredientStock | undefined => {
  if (!reqName || !inventory) return undefined;
  const cleanReq = normalizeIngName(reqName);
  
  let match = inventory.find(i => normalizeIngName(i.name) === cleanReq);
  if (match) return match;

  const alphaReq = cleanReq.replace(/[^a-z0-9]/g, '');
  if (alphaReq.length > 0) {
    match = inventory.find(i => normalizeIngName(i.name).replace(/[^a-z0-9]/g, '') === alphaReq);
    if (match) return match;
  }

  match = inventory.find(i => {
    const cleanInv = normalizeIngName(i.name);
    return cleanReq.startsWith(cleanInv) || cleanInv.startsWith(cleanReq);
  });
  
  return match;
};

/**
 * Gets active FIFO batches for a specific ingredient, sorted by receivedDate ascending (oldest first).
 */
export const getFIFOBatchesForIngredient = (
  ingredientId: string,
  ingredientName: string,
  batches: StockBatch[]
): StockBatch[] => {
  if (!batches || batches.length === 0) return [];
  
  const cleanName = normalizeIngName(ingredientName);

  return batches
    .filter((b) => {
      const matchId = b.ingredientId === ingredientId;
      const matchName = normalizeIngName(b.ingredientName) === cleanName;
      const isAvailable = (b.status === 'active' || !b.status) && b.remainingQuantity > 0;
      return (matchId || matchName) && isAvailable;
    })
    .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());
};

/**
 * Smart FIFO Dish Recipe Cost Calculator.
 * Calculates exact COGS by consuming available FIFO batch lots first-in, first-out.
 */
export const calculateFIFODishCost = (
  menuItem: MenuItem,
  ingredientsInventory: IngredientStock[],
  stockBatches: StockBatch[]
): FIFODishCostResult => {
  let totalCost = 0;
  let baseCost = 0;
  const layers: FIFODishCostResult['layers'] = [];

  const getBaseCostPerUnit = (unit: string, ing?: IngredientStock) => {
    if (ing && ing.costPerUnit !== undefined && ing.costPerUnit !== null && ing.costPerUnit > 0) {
      return ing.costPerUnit;
    }
    switch ((unit || 'g').toLowerCase()) {
      case 'g': return 0.05;
      case 'kg': return 150.00;
      case 'pcs': return 15.00;
      case 'ml': return 0.08;
      case 'cans': return 45.00;
      case 'l': case 'liter': return 80.00;
      default: return 5.00;
    }
  };

  // 1. Process Recipe Requirements
  if (menuItem.recipeRequirements && menuItem.recipeRequirements.length > 0) {
    menuItem.recipeRequirements.forEach((req) => {
      const ing = findMatchingIngredient(req.name, ingredientsInventory);
      const unit = ing ? ing.unit : 'g';
      const reqAmount = (unit === 'kg' || unit === 'l' || unit === 'liter') ? req.amount / 1000 : req.amount;
      const baseUnitCost = getBaseCostPerUnit(unit, ing);
      baseCost += reqAmount * baseUnitCost;

      // Check active FIFO batches
      const activeBatches = ing ? getFIFOBatchesForIngredient(ing.id, ing.name, stockBatches) : [];
      let remainingNeeded = reqAmount;
      let ingCost = 0;
      const usedLayers: FIFOConsumptionLayer[] = [];

      for (const batch of activeBatches) {
        if (remainingNeeded <= 0) break;
        const availableInBatch = batch.remainingQuantity;
        const take = Math.min(remainingNeeded, availableInBatch);
        const batchUnitCost = batch.costPerUnit > 0 ? batch.costPerUnit : baseUnitCost;
        const costForTake = take * batchUnitCost;

        ingCost += costForTake;
        remainingNeeded -= take;

        usedLayers.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          receivedDate: batch.receivedDate,
          costPerUnit: batchUnitCost,
          quantityUsed: Number(take.toFixed(4)),
          layerCost: Number(costForTake.toFixed(2))
        });
      }

      // If requirements exceed available batches, fall back to base inventory cost for remainder
      if (remainingNeeded > 0) {
        const costForRemainder = remainingNeeded * baseUnitCost;
        ingCost += costForRemainder;
        usedLayers.push({
          batchId: 'base-inventory',
          batchNumber: 'BASE-RATE',
          receivedDate: new Date().toISOString().split('T')[0],
          costPerUnit: baseUnitCost,
          quantityUsed: Number(remainingNeeded.toFixed(4)),
          layerCost: Number(costForRemainder.toFixed(2))
        });
      }

      totalCost += ingCost;
      layers.push({
        ingredientName: req.name,
        amountRequired: req.amount,
        unit,
        totalIngredientCost: Number(ingCost.toFixed(2)),
        effectiveUnitCost: reqAmount > 0 ? Number((ingCost / reqAmount).toFixed(4)) : baseUnitCost,
        batchesUsed: usedLayers
      });
    });
  } else if (menuItem.ingredients && menuItem.ingredients.length > 0) {
    // Process simple ingredients array
    menuItem.ingredients.forEach((ingName) => {
      const ing = findMatchingIngredient(ingName, ingredientsInventory);
      const unit = ing ? ing.unit : 'g';
      const reqAmount = (unit === 'pcs' || unit === 'cans') ? 1 : (unit === 'kg' || unit === 'l') ? 0.1 : 100;
      const baseUnitCost = getBaseCostPerUnit(unit, ing);
      baseCost += reqAmount * baseUnitCost;

      const activeBatches = ing ? getFIFOBatchesForIngredient(ing.id, ing.name, stockBatches) : [];
      let remainingNeeded = reqAmount;
      let ingCost = 0;
      const usedLayers: FIFOConsumptionLayer[] = [];

      for (const batch of activeBatches) {
        if (remainingNeeded <= 0) break;
        const availableInBatch = batch.remainingQuantity;
        const take = Math.min(remainingNeeded, availableInBatch);
        const batchUnitCost = batch.costPerUnit > 0 ? batch.costPerUnit : baseUnitCost;
        const costForTake = take * batchUnitCost;

        ingCost += costForTake;
        remainingNeeded -= take;

        usedLayers.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          receivedDate: batch.receivedDate,
          costPerUnit: batchUnitCost,
          quantityUsed: Number(take.toFixed(4)),
          layerCost: Number(costForTake.toFixed(2))
        });
      }

      if (remainingNeeded > 0) {
        const costForRemainder = remainingNeeded * baseUnitCost;
        ingCost += costForRemainder;
        usedLayers.push({
          batchId: 'base-inventory',
          batchNumber: 'BASE-RATE',
          receivedDate: new Date().toISOString().split('T')[0],
          costPerUnit: baseUnitCost,
          quantityUsed: Number(remainingNeeded.toFixed(4)),
          layerCost: Number(costForRemainder.toFixed(2))
        });
      }

      totalCost += ingCost;
      layers.push({
        ingredientName: ingName,
        amountRequired: reqAmount,
        unit,
        totalIngredientCost: Number(ingCost.toFixed(2)),
        effectiveUnitCost: reqAmount > 0 ? Number((ingCost / reqAmount).toFixed(4)) : baseUnitCost,
        batchesUsed: usedLayers
      });
    });
  } else {
    // Fallback COGS estimate
    totalCost = menuItem.price * 0.35;
    baseCost = menuItem.price * 0.35;
  }

  const profit = menuItem.price - totalCost;
  const marginPercent = menuItem.price > 0 ? (profit / menuItem.price) * 100 : 0;
  const costVariancePercent = baseCost > 0 ? ((totalCost - baseCost) / baseCost) * 100 : 0;
  const targetMargin = menuItem.targetMarginPercent !== undefined ? menuItem.targetMarginPercent : 50;
  const isMarginSqueezed = marginPercent < targetMargin || costVariancePercent > 5;

  return {
    totalCost: Number(totalCost.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    marginPercent: Number(marginPercent.toFixed(1)),
    baseCost: Number(baseCost.toFixed(2)),
    costVariancePercent: Number(costVariancePercent.toFixed(1)),
    isMarginSqueezed,
    layers
  };
};

/**
 * Deducts recipe ingredients using First-In, First-Out (FIFO) batch lot allocation.
 */
export const deductFIFOOrderStock = (
  items: CartItem[],
  currentStockLevels: Record<string, number>,
  currentIngredientsInventory: IngredientStock[],
  currentStockBatches: StockBatch[]
): {
  updatedStockLevels: Record<string, number>;
  updatedIngredients: IngredientStock[];
  updatedBatches: StockBatch[];
  totalActualCOGS: number;
} => {
  const updatedStockLevels = { ...currentStockLevels };
  const updatedIngredients = currentIngredientsInventory.map(i => ({ ...i }));
  const updatedBatches = currentStockBatches.map(b => ({ ...b }));
  let totalActualCOGS = 0;

  items.forEach((item) => {
    const menuItem = item.menuItem;
    const orderQty = item.quantity || 1;

    // 1. Deduct overall menu item stock counter if tracked
    if (menuItem && menuItem.id && updatedStockLevels[menuItem.id] !== undefined) {
      updatedStockLevels[menuItem.id] = Math.max(0, updatedStockLevels[menuItem.id] - orderQty);
    }

    if (!menuItem) return;

    // 2. Determine recipe requirements to deduct
    const requirements: { name: string; amount: number }[] = [];
    if (menuItem.recipeRequirements && menuItem.recipeRequirements.length > 0) {
      menuItem.recipeRequirements.forEach(req => requirements.push({ name: req.name, amount: req.amount * orderQty }));
    } else if (menuItem.ingredients && menuItem.ingredients.length > 0) {
      menuItem.ingredients.forEach(ingName => {
        const ing = findMatchingIngredient(ingName, updatedIngredients);
        const unit = ing ? ing.unit : 'g';
        const perServing = (unit === 'pcs' || unit === 'cans') ? 1 : (unit === 'kg' || unit === 'l') ? 0.1 : 100;
        requirements.push({ name: ingName, amount: perServing * orderQty });
      });
    }

    // 3. Apply FIFO deduction for each ingredient
    requirements.forEach((req) => {
      const ing = findMatchingIngredient(req.name, updatedIngredients);
      if (!ing) return;

      const unit = ing.unit;
      const totalAmountToDeduct = (unit === 'kg' || unit === 'l' || unit === 'liter') ? req.amount / 1000 : req.amount;

      // Update total quantity on ingredient record
      ing.quantity = Math.max(0, Number((ing.quantity - totalAmountToDeduct).toFixed(4)));

      // Deduct from FIFO batches (oldest active first)
      const activeBatches = updatedBatches
        .filter(b => (b.ingredientId === ing.id || normalizeIngName(b.ingredientName) === normalizeIngName(ing.name)) && b.remainingQuantity > 0 && b.status === 'active')
        .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());

      let remainingToDeduct = totalAmountToDeduct;

      for (const batch of activeBatches) {
        if (remainingToDeduct <= 0) break;
        const deductFromBatch = Math.min(remainingToDeduct, batch.remainingQuantity);
        batch.remainingQuantity = Math.max(0, Number((batch.remainingQuantity - deductFromBatch).toFixed(4)));
        remainingToDeduct -= deductFromBatch;

        const unitCost = batch.costPerUnit > 0 ? batch.costPerUnit : (ing.costPerUnit || 0);
        totalActualCOGS += deductFromBatch * unitCost;

        if (batch.remainingQuantity <= 0) {
          batch.status = 'depleted';
        }
      }

      // If requirements exceeded batch quantities, apply fallback unit cost
      if (remainingToDeduct > 0) {
        const fallbackCost = ing.costPerUnit || 0.05;
        totalActualCOGS += remainingToDeduct * fallbackCost;
      }
    });
  });

  return {
    updatedStockLevels,
    updatedIngredients,
    updatedBatches,
    totalActualCOGS: Number(totalActualCOGS.toFixed(2))
  };
};

/**
 * Restores ingredient and batch stocks when an order is cancelled or edited.
 */
export const restoreFIFOOrderStock = (
  items: CartItem[],
  currentStockLevels: Record<string, number>,
  currentIngredientsInventory: IngredientStock[],
  currentStockBatches: StockBatch[]
): {
  updatedStockLevels: Record<string, number>;
  updatedIngredients: IngredientStock[];
  updatedBatches: StockBatch[];
} => {
  const updatedStockLevels = { ...currentStockLevels };
  const updatedIngredients = currentIngredientsInventory.map(i => ({ ...i }));
  const updatedBatches = currentStockBatches.map(b => ({ ...b }));

  items.forEach((item) => {
    const menuItem = item.menuItem;
    const orderQty = item.quantity || 1;

    if (menuItem && menuItem.id && updatedStockLevels[menuItem.id] !== undefined) {
      updatedStockLevels[menuItem.id] += orderQty;
    }

    if (!menuItem) return;

    const requirements: { name: string; amount: number }[] = [];
    if (menuItem.recipeRequirements && menuItem.recipeRequirements.length > 0) {
      menuItem.recipeRequirements.forEach(req => requirements.push({ name: req.name, amount: req.amount * orderQty }));
    } else if (menuItem.ingredients && menuItem.ingredients.length > 0) {
      menuItem.ingredients.forEach(ingName => {
        const ing = findMatchingIngredient(ingName, updatedIngredients);
        const unit = ing ? ing.unit : 'g';
        const perServing = (unit === 'pcs' || unit === 'cans') ? 1 : (unit === 'kg' || unit === 'l') ? 0.1 : 100;
        requirements.push({ name: ingName, amount: perServing * orderQty });
      });
    }

    requirements.forEach((req) => {
      const ing = findMatchingIngredient(req.name, updatedIngredients);
      if (!ing) return;

      const unit = ing.unit;
      const amountToRestore = (unit === 'kg' || unit === 'l' || unit === 'liter') ? req.amount / 1000 : req.amount;

      ing.quantity = Number((ing.quantity + amountToRestore).toFixed(4));

      // Restore to most recently depleted or active batch
      const ingBatches = updatedBatches
        .filter(b => b.ingredientId === ing.id || normalizeIngName(b.ingredientName) === normalizeIngName(ing.name))
        .sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());

      let remainingToRestore = amountToRestore;

      for (const batch of ingBatches) {
        if (remainingToRestore <= 0) break;
        const capacity = batch.initialQuantity - batch.remainingQuantity;
        if (capacity > 0) {
          const restoreToThis = Math.min(remainingToRestore, capacity);
          batch.remainingQuantity = Number((batch.remainingQuantity + restoreToThis).toFixed(4));
          remainingToRestore -= restoreToThis;
          if (batch.status === 'depleted' && batch.remainingQuantity > 0) {
            batch.status = 'active';
          }
        }
      }

      // If no batch has capacity, add to the newest batch
      if (remainingToRestore > 0 && ingBatches.length > 0) {
        const newest = ingBatches[0];
        newest.remainingQuantity = Number((newest.remainingQuantity + remainingToRestore).toFixed(4));
        if (newest.status === 'depleted') newest.status = 'active';
      }
    });
  });

  return {
    updatedStockLevels,
    updatedIngredients,
    updatedBatches
  };
};

/**
 * Calculates stock loss report across expired batches, spoilage records, and physical count discrepancies.
 */
export const calculateStockLossReport = (
  stockBatches: StockBatch[],
  spoilageRecords: SpoilageRecord[] = [],
  physicalCounts?: Record<string, number>, // ingredientId -> physical counted quantity
  ingredientsInventory?: IngredientStock[]
): StockLossReport => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const next7DaysStr = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let totalExpiredLossCost = 0;
  let expiredBatchesCount = 0;
  let expiringSoonBatchesCount = 0;
  let activeBatchesCount = 0;
  let depletedBatchesCount = 0;

  stockBatches.forEach((batch) => {
    if (batch.status === 'depleted') {
      depletedBatchesCount++;
      return;
    }

    if (batch.status === 'active' || !batch.status) {
      activeBatchesCount++;
    }

    // Check expiry
    if (batch.expiryDate && batch.remainingQuantity > 0) {
      if (batch.expiryDate < todayStr || batch.status === 'expired') {
        expiredBatchesCount++;
        totalExpiredLossCost += batch.remainingQuantity * (batch.costPerUnit || 0);
      } else if (batch.expiryDate <= next7DaysStr) {
        expiringSoonBatchesCount++;
      }
    }
  });

  // Total from logged kitchen spoilage
  const totalSpoilageLossCost = spoilageRecords.reduce((sum, r) => sum + (r.cost || 0), 0);

  // Total from physical inventory variance
  let totalVarianceLossCost = 0;
  if (physicalCounts && ingredientsInventory) {
    ingredientsInventory.forEach((ing) => {
      if (physicalCounts[ing.id] !== undefined) {
        const physical = physicalCounts[ing.id];
        const theoretical = ing.quantity;
        if (physical < theoretical) {
          const missingQty = theoretical - physical;
          const cost = missingQty * (ing.costPerUnit || 0.05);
          totalVarianceLossCost += cost;
        }
      }
    });
  }

  const totalCombinedLossCost = totalExpiredLossCost + totalSpoilageLossCost + totalVarianceLossCost;

  return {
    totalExpiredLossCost: Number(totalExpiredLossCost.toFixed(2)),
    totalSpoilageLossCost: Number(totalSpoilageLossCost.toFixed(2)),
    totalVarianceLossCost: Number(totalVarianceLossCost.toFixed(2)),
    totalCombinedLossCost: Number(totalCombinedLossCost.toFixed(2)),
    expiredBatchesCount,
    expiringSoonBatchesCount,
    activeBatchesCount,
    depletedBatchesCount
  };
};

/**
 * Generates realistic initial FIFO batch lots for existing ingredients so FIFO is immediately active.
 */
export const generateInitialStockBatches = (ingredients: IngredientStock[]): StockBatch[] => {
  const batches: StockBatch[] = [];
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  ingredients.forEach((ing, idx) => {
    const totalQty = ing.quantity || 1000;
    const baseUnitCost = ing.costPerUnit || (ing.unit === 'pcs' ? 15 : ing.unit === 'kg' ? 150 : 0.05);

    // Batch 1: Older batch received 7 days ago (Lower/Baseline price)
    const d1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const date1Str = `${d1.getFullYear()}-${pad(d1.getMonth() + 1)}-${pad(d1.getDate())}`;
    const exp1 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    const exp1Str = `${exp1.getFullYear()}-${pad(exp1.getMonth() + 1)}-${pad(exp1.getDate())}`;

    // Batch 2: Newer batch received 2 days ago (5-10% price variance to demonstrate FIFO effect)
    const d2 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const date2Str = `${d2.getFullYear()}-${pad(d2.getMonth() + 1)}-${pad(d2.getDate())}`;
    const exp2 = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);
    const exp2Str = `${exp2.getFullYear()}-${pad(exp2.getMonth() + 1)}-${pad(exp2.getDate())}`;

    const batch1Initial = Math.round(totalQty * 0.4);
    const batch1Remaining = Math.round(totalQty * 0.3);
    const batch2Initial = Math.round(totalQty * 0.7);
    const batch2Remaining = Math.max(0, totalQty - batch1Remaining);

    // Price variation for batch 2 (+6% price shift)
    const priceVarianceFactor = 1 + (0.04 + ((idx % 4) * 0.02));
    const batch2Cost = Number((baseUnitCost * priceVarianceFactor).toFixed(4));

    batches.push({
      id: `batch-${ing.id}-01`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      batchNumber: `LOT-${date1Str.replace(/-/g, '')}-${pad(idx + 1)}A`,
      receivedDate: date1Str,
      expiryDate: exp1Str,
      initialQuantity: batch1Initial,
      remainingQuantity: batch1Remaining,
      unit: ing.unit,
      costPerUnit: baseUnitCost,
      packCost: ing.packCost,
      supplierName: ing.supplier?.name || 'Curvada Prime Supplies',
      status: 'active',
      notes: 'Initial opening inventory lot (FIFO Layer 1)'
    });

    batches.push({
      id: `batch-${ing.id}-02`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      batchNumber: `LOT-${date2Str.replace(/-/g, '')}-${pad(idx + 1)}B`,
      receivedDate: date2Str,
      expiryDate: exp2Str,
      initialQuantity: batch2Initial,
      remainingQuantity: batch2Remaining,
      unit: ing.unit,
      costPerUnit: batch2Cost,
      packCost: ing.packCost ? Number((ing.packCost * priceVarianceFactor).toFixed(2)) : undefined,
      supplierName: ing.supplier?.name || 'Curvada Prime Supplies',
      status: 'active',
      notes: 'Restock lot with updated supplier invoice pricing (FIFO Layer 2)'
    });
  });

  return batches;
};
