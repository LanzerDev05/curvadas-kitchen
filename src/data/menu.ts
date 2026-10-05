import { MenuItem } from '../types';

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'silog-tapsilog',
    name: 'Tapsilog',
    description: 'Our signature premium beef tapa (cured beef) marinated in traditional Filipino garlic-soy spices, seared to tender perfection. Served with fragrant garlic fried rice (sinangag) and a fresh sunny-side-up egg.',
    price: 149,
    category: 'silog',
    estimatedPrepTime: 10,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600',
    popular: true,
    isAvailable: true,
    ingredients: ['Premium Beef Tapa', 'Sunny-Side-Up Egg', 'Garlic Fried Rice', 'Atchara Pickles', 'Garlic Soy Marinade'],
    recipeRequirements: [
      { name: 'Premium Beef Tapa', amount: 150 },
      { name: 'Sunny-Side-Up Egg', amount: 1 },
      { name: 'Garlic Fried Rice', amount: 200 },
      { name: 'Atchara Pickles', amount: 30 }
    ],
    customizableOptions: [
      {
        title: 'Rice (Included with Meal)',
        choices: [
          { id: 'rice-garlic', name: 'Garlic Fried Rice', price: 0 },
          { id: 'rice-plain', name: 'Plain Steamed Rice', price: 0 },
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
    ]
  },
  {
    id: 'bento-chicken-katsu',
    name: 'Chicken Katsu Bento',
    description: 'Golden, extra-crispy chicken katsu fillet drizzled with a rich bulldog sauce and Japanese mayo. Packaged in a bento box with steamed white rice, shredded cabbage salad, seasoned gyoza, and a perfect fried egg.',
    price: 189,
    category: 'bento',
    estimatedPrepTime: 15,
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=600',
    popular: true,
    isAvailable: true,
    ingredients: ['Crispy Chicken Fillet', 'Panko Breadcrumbs', 'Japanese Mayo', 'Shredded Cabbage', 'Steamed Rice', 'Fried Egg'],
    recipeRequirements: [
      { name: 'Crispy Chicken Fillet', amount: 120 },
      { name: 'Panko Breadcrumbs', amount: 50 },
      { name: 'Japanese Mayo', amount: 20 },
      { name: 'Shredded Cabbage', amount: 40 },
      { name: 'Steamed Rice', amount: 150 },
      { name: 'Fried Egg', amount: 1 }
    ],
    customizableOptions: [
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
          { id: 'sauce-gravy', name: 'Curvada Signature Gravy', price: 10 },
          { id: 'sauce-none', name: 'Sauce on the Side', price: 0 }
        ]
      }
    ]
  },
  {
    id: 'drink-red-tea',
    name: "Curvada's Red Iced Tea",
    description: "Our legendary signature house-brewed red tea, infused with sweet berry and floral notes, served chilled over crushed ice. The perfect pair to our rich, savory meals!",
    price: 49,
    category: 'drinks',
    estimatedPrepTime: 3,
    image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&q=80&w=600',
    popular: true,
    isAvailable: true,
    ingredients: ['Black Tea Leaves', 'Sugar Cane Syrup', 'Purified Filtered Water', 'Crushed Ice'],
    recipeRequirements: [
      { name: 'Black Tea Leaves', amount: 10 },
      { name: 'Sugar Cane Syrup', amount: 30 },
      { name: 'Purified Filtered Water', amount: 250 },
      { name: 'Crushed Ice', amount: 100 }
    ],
    customizableOptions: [
      {
        title: 'Serving Size',
        choices: [
          { id: 'size-reg', name: 'Regular C-Cup (16oz)', price: 0 },
          { id: 'size-large', name: 'Large C-Cup (22oz) (+20)', price: 20 }
        ]
      },
      {
        title: 'Ice Level',
        choices: [
          { id: 'ice-normal', name: 'Normal Ice', price: 0 },
          { id: 'ice-less', name: 'Less Ice', price: 0 }
        ]
      }
    ]
  },
  {
    id: 'silog-lumpiang-shanghai',
    name: 'Crispy Lumpiang Shanghai (3 pcs)',
    description: 'Golden crispy pork spring rolls prepared with fresh ground pork, carrots, and savory aromatics, paired with sweet chili sauce and steamed rice. Choose between Classic Regular or Spicy Dynamite (Cheese & Green Chili).',
    price: 89,
    category: 'silog',
    estimatedPrepTime: 10,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600',
    popular: true,
    isAvailable: true,
    batchYieldUnit: 'pcs',
    batchYieldGrams: 94,
    servingSizeUnit: 'pcs',
    servingSizeGrams: 3,
    totalBatchCost: 479,
    targetMarginPercent: 55,
    includeRice: true,
    ricePortionGrams: 150,
    riceCostPerGram: 0.04,
    ingredients: ['Ground Pork', 'Lumpia Wrappers', 'Finely Minced Carrots', 'White Onions', 'Garlic', 'Chicken Powder', 'Egg', 'Cooking Oil'],
    recipeRequirements: [
      { name: 'Ground Pork Meat', amount: 32 },
      { name: 'Lumpia Wrappers', amount: 3 },
      { name: 'Minced Carrots', amount: 5 },
      { name: 'Steamed Rice', amount: 150 }
    ],
    batchIngredients: [
      { name: 'Ground Pork (1kg stock • ₱340)', batchAmount: 1, unit: 'kg', cost: 340 },
      { name: 'Lumpia Wrappers (100 pcs pack)', batchAmount: 1, unit: 'pcs', cost: 50 },
      { name: 'Carrots (2pcs stock • ₱30/pcs)', batchAmount: 2, unit: 'pcs', cost: 60 },
      { name: 'Chicken Powder (100g stock)', batchAmount: 15, unit: 'g', cost: 9 },
      { name: 'Cooking Oil (Deep Fry)', batchAmount: 200, unit: 'ml', cost: 20 }
    ],
    customizableOptions: [
      {
        title: 'Flavor Selection',
        choices: [
          { id: 'flavor-regular', name: 'Regular (Original Pork)', price: 0 },
          { id: 'flavor-dynamite', name: 'Dynamite (Cheese & Green Chili)', price: 15 }
        ]
      },
      {
        title: 'Rice (Included with Meal)',
        choices: [
          { id: 'shanghai-rice-plain', name: 'Plain Steamed Rice', price: 0 },
          { id: 'shanghai-rice-garlic', name: 'Garlic Fried Rice', price: 15 },
          { id: 'shanghai-rice-java', name: 'Java Rice', price: 20 }
        ]
      },
      {
        title: 'Extra Rice (Add-on)',
        choices: [
          { id: 'shanghai-extra-rice-none', name: 'No Extra Rice', price: 0 },
          { id: 'shanghai-extra-rice-plain', name: '+1 Extra Plain Rice', price: 15 },
          { id: 'shanghai-extra-rice-garlic', name: '+1 Extra Garlic Rice', price: 20 }
        ]
      },
      {
        title: 'Extra Shanghai Rolls',
        choices: [
          { id: 'extra-rolls-none', name: 'No Extra Rolls', price: 0 },
          { id: 'extra-rolls-2-reg', name: '+2 pcs Regular Shanghai', price: 35 },
          { id: 'extra-rolls-2-dyn', name: '+2 pcs Dynamite Shanghai', price: 45 }
        ]
      }
    ]
  }
];
