import React, { useState, useMemo } from 'react';
import { MenuItem, Category } from '../types';
import { Search, Flame, Award, Plus, Frown } from 'lucide-react';

interface MenuSectionProps {
  items: MenuItem[];
  onItemClick: (item: MenuItem) => void;
  unavailableItemIds: string[];
  hiddenCategories?: string[];
  getDishStockCapacity: (item: MenuItem) => number;
}

export default function MenuSection({
  items,
  onItemClick,
  unavailableItemIds,
  hiddenCategories = [],
  getDishStockCapacity,
}: MenuSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPopularOnly, setFilterPopularOnly] = useState(false);
  const [filterSpicyOnly, setFilterSpicyOnly] = useState(false);

  // Categories list, excluding those selected as hidden by admin
  const categories = useMemo(() => {
    const list: { value: Category | 'all'; label: string; icon: string }[] = [
      { value: 'all', label: 'All Meals', icon: '🍽️' },
      { value: 'silog', label: 'Silog Meals', icon: '🍳' },
      { value: 'bento', label: 'Bento Meals', icon: '🍱' },
      { value: 'rice-bowl', label: 'Rice Bowls', icon: '🥣' },
      { value: 'drinks', label: 'Drinks', icon: '🥤' },
    ];
    return list.filter(cat => cat.value === 'all' || !hiddenCategories.includes(cat.value));
  }, [hiddenCategories]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 0. Hidden Category Filter
      if (hiddenCategories.includes(item.category)) {
        return false;
      }
      // 1. Category Filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // 2. Search Query Filter
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.description.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // 3. Popular Filter
      if (filterPopularOnly && !item.popular) {
        return false;
      }
      // 4. Spicy Filter
      if (filterSpicyOnly && !item.spicy) {
        return false;
      }
      return true;
    });
  }, [items, selectedCategory, searchQuery, filterPopularOnly, filterSpicyOnly]);

  return (
    <section id="menu-section-container" className="py-12 px-4 md:px-8 max-w-7xl mx-auto w-full">
      
      {/* Title */}
      <div className="text-center mb-10">
        <h2 className="font-display font-black text-3xl md:text-5xl text-white tracking-tighter uppercase">
          Curvada's <span className="text-brand-red">Fresh Menu</span>
        </h2>
        <div className="h-1 w-20 bg-brand-red mx-auto mt-3 rounded-full" />
        <p className="text-gray-400 mt-2 text-sm md:text-base max-w-md mx-auto font-normal">
          Every dish is crafted in-house with premium local ingredients and served sizzling hot.
        </p>
      </div>

      {/* Filters bar: Search & Categorization */}
      <div className="flex flex-col gap-6 mb-10">
        
        {/* Search & Badges Filter Line */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search dishes (e.g. Tapsilog, Bento, Red Tea)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181818] text-white rounded-xl py-3 pl-12 pr-4 text-sm border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-500"
            />
          </div>

          {/* Quick Toggle Tags (Spicy / Popular) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterPopularOnly(!filterPopularOnly)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                filterPopularOnly
                  ? 'bg-brand-gold text-[#0D0D0C] border-brand-gold'
                  : 'bg-[#181818] text-gray-400 border-white/5 hover:border-brand-gold/30'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Best Sellers
            </button>
            <button
              onClick={() => setFilterSpicyOnly(!filterSpicyOnly)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                filterSpicyOnly
                  ? 'bg-brand-red text-white border-brand-red'
                  : 'bg-[#181818] text-gray-400 border-white/5 hover:border-brand-red/30'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Spicy Only
            </button>
            {(searchQuery || filterPopularOnly || filterSpicyOnly || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterPopularOnly(false);
                  setFilterSpicyOnly(false);
                  setSelectedCategory('all');
                }}
                className="text-brand-red hover:underline text-xs font-bold px-2 uppercase tracking-wider"
              >
                Clear All
              </button>
            )}
          </div>

        </div>

        {/* Categories Tab selector (Visual matching the highlights/pills) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border-2 ${
                selectedCategory === cat.value
                  ? 'bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/10'
                  : 'bg-[#181818] text-gray-300 border-white/5 hover:bg-[#222222] hover:border-brand-red/30'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

      </div>

      {/* Menu Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-[#181818] rounded-[2rem] border-2 border-white/5 max-w-md mx-auto px-6">
          <Frown className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h3 className="font-display font-bold text-white text-lg">No Items Found</h3>
          <p className="text-gray-500 text-xs mt-1">
            We couldn't find any dishes matching your current filter settings. Try clearing some filters!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const isUnavailable = unavailableItemIds.includes(item.id);

            return (
              <div
                key={item.id}
                onClick={() => !isUnavailable && onItemClick(item)}
                className={`bg-[#181818] rounded-[2rem] overflow-hidden border-2 border-white/5 transition-all duration-300 flex flex-col group relative ${
                  isUnavailable 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:border-brand-red/25 hover:shadow-2xl hover:-translate-y-1 cursor-pointer'
                }`}
              >
                
                {/* Image Section */}
                <div className="relative h-44 w-full bg-[#0D0D0C] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Badges Overlay */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
                    {item.popular && (
                      <span className="bg-brand-gold text-black text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md flex items-center gap-1">
                        <Award className="w-3 h-3 fill-black" />
                        Best Seller
                      </span>
                    )}
                    {item.spicy && (
                      <span className="bg-brand-red text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-white" />
                        Spicy
                      </span>
                    )}
                    {(() => {
                      if (isUnavailable) return null;
                      const stockCap = getDishStockCapacity(item);
                      if (stockCap <= 0) return null;
                      if (stockCap <= 5) {
                        return (
                          <span className="bg-[#b45309] border border-[#f59e0b] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">
                            ⚠️ Only {stockCap} Left
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Availability Overlay */}
                  {isUnavailable && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px] flex items-center justify-center p-4">
                      <span className="bg-brand-red/25 border-2 border-brand-red/60 text-brand-red font-display font-black tracking-widest text-sm uppercase px-4 py-2 rounded-xl text-center shadow-lg">
                        SOLD OUT
                      </span>
                    </div>
                  )}

                  {/* Category Pill */}
                  <span className="absolute bottom-3 right-3 bg-[#181818]/95 text-white/90 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border-2 border-white/10 backdrop-blur-sm pointer-events-none">
                    {item.category === 'silog' ? 'Silog Meal' : item.category === 'bento' ? 'Bento Meal' : item.category === 'rice-bowl' ? 'Rice Bowl' : 'Drink'}
                  </span>
                </div>

                {/* Content Section */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-display font-bold text-white text-base group-hover:text-brand-red transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-gray-400 text-xs mt-1.5 leading-relaxed line-clamp-2 font-normal">
                      {item.description}
                    </p>

                    {/* Ingredients list display */}
                    {item.ingredients && item.ingredients.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Ingredients:</span>
                        <div className="flex flex-wrap gap-1">
                          {item.ingredients.map((ing, i) => (
                            <span 
                              key={i} 
                              className="text-[8px] bg-white/5 border border-white/5 text-gray-300 font-medium px-2 py-0.5 rounded-md"
                            >
                              {ing}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Price & Action button */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-white/5">
                    <span className="text-brand-gold font-display font-extrabold text-lg">
                      ₱{item.price.toFixed(2)}
                    </span>
                    
                    {!isUnavailable ? (
                      <button
                        className="px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-xs font-bold uppercase tracking-wider transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          onItemClick(item);
                        }}
                      >
                        <Plus className="w-3.5 h-3.5 inline mr-1" />
                        Order
                      </button>
                    ) : (
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                        Unavailable
                      </span>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
