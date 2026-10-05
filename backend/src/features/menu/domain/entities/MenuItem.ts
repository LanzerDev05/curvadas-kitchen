export type Category = 'bento' | 'silog' | 'rice-bowl' | 'drinks';

export interface MenuOption {
  id: string;
  name: string;
  price: number;
  isDefault?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  spicy?: boolean;
  popular?: boolean;
  isAvailable: boolean;
  ingredients?: string[];
  recipeRequirements?: { ingredientId?: string; name: string; amount: number }[];
  batchIngredients?: { name: string; batchAmount: number; unit: string; cost?: number }[];
  garnishes?: Array<{ name: string; amount: number; unit?: string; costPerUnit?: number; selected: boolean }>;
  packaging?: Array<{ name: string; amount: number; unit?: string; costPerUnit?: number; selected: boolean }>;
  customizableOptions?: {
    title: string;
    choices: MenuOption[];
  }[];
  estimatedPrepTime?: number;
  targetMarginPercent?: number;
  batchYieldGrams?: number;
  batchYieldUnit?: 'g' | 'pcs';
  servingSizeGrams?: number;
  servingSizeUnit?: 'g' | 'pcs';
  totalBatchCost?: number;
  includeRice?: boolean;
  ricePortionGrams?: number;
  riceCostPerGram?: number;
}
