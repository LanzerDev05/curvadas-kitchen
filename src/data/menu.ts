import { MenuItem } from '../types';

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'silog-tapsilog',
    name: 'Tapsilog',
    description: 'Our signature premium beef tapa (cured beef) marinated in traditional Filipino garlic-soy spices, seared to tender perfection. Served with fragrant garlic fried rice (sinangag) and a fresh sunny-side-up egg.',
    price: 149,
    category: 'silog',
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
        title: 'Rice Upgrade',
        choices: [
          { id: 'rice-garlic', name: 'Garlic Fried Rice', price: 0 },
          { id: 'rice-double-garlic', name: 'Double Garlic Rice', price: 20 },
          { id: 'rice-plain', name: 'Plain Steamed Rice', price: -5 }
        ]
      },
      {
        title: 'Egg Style',
        choices: [
          { id: 'egg-sunny', name: 'Sunny-side-up', price: 0 },
          { id: 'egg-scrambled', name: 'Scrambled', price: 0 },
          { id: 'egg-well', name: 'Well Done', price: 0 },
          { id: 'egg-extra', name: 'Add Extra Egg', price: 15 }
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
  }
];
