import React, { useState, useEffect } from 'react';
import { MenuItem, SelectedOption, MenuOption } from '../types';
import { X, Plus, Minus, Check, AlertCircle } from 'lucide-react';

interface CustomizeModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    selectedOptions: SelectedOption[],
    quantity: number,
    instructions: string
  ) => void;
  maxAvailable: number;
}

export default function CustomizeModal({
  item,
  onClose,
  onAddToCart,
  maxAvailable,
}: CustomizeModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Auto-select first choice of each option category on load
  useEffect(() => {
    if (item && item.customizableOptions) {
      const defaults: SelectedOption[] = item.customizableOptions.map((opt) => ({
        optionTitle: opt.title,
        choice: opt.choices[0], // first option is default
      }));
      setSelectedOptions(defaults);
    } else {
      setSelectedOptions([]);
    }
    setQuantity(1);
    setSpecialInstructions('');
  }, [item]);

  if (!item) return null;

  // Handler for option change
  const handleOptionSelect = (optionTitle: string, choice: MenuOption) => {
    setSelectedOptions((prev) =>
      prev.map((opt) =>
        opt.optionTitle === optionTitle ? { ...opt, choice } : opt
      )
    );
  };

  // Calculate Unit Price based on selected options
  const unitPrice = (() => {
    let price = item.price;
    selectedOptions.forEach((opt) => {
      price += opt.choice.price;
    });
    return price;
  })();

  const totalPrice = unitPrice * quantity;

  const handleAddClick = () => {
    onAddToCart(item, selectedOptions, quantity, specialInstructions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      
      {/* Container */}
      <div className="relative w-full max-w-lg bg-[#181818] rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header (Food details & Close button) */}
        <div className="relative h-44 md:h-48 w-full bg-[#0D0D0C] flex-shrink-0">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-black/20 to-black/40" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-brand-red text-white transition-colors border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Titles */}
          <div className="absolute bottom-4 left-6 right-6">
            <span className="px-2.5 py-0.5 rounded bg-brand-red text-white text-[10px] font-black uppercase tracking-wider">
              Customize Order
            </span>
            <h3 className="font-display font-black text-white text-2xl mt-1.5 drop-shadow-sm">
              {item.name}
            </h3>
            <p className="text-brand-gold text-xs drop-shadow-sm mt-0.5 font-bold">
              Base Price: ₱{item.price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Customizable Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Food description */}
          <p className="text-gray-400 text-xs leading-relaxed italic border-l-2 border-brand-red font-semibold pl-3">
            "{item.description}"
          </p>

          {/* Food Ingredients */}
          {item.ingredients && item.ingredients.length > 0 && (
            <div className="p-3.5 bg-[#0D0D0C] border border-white/5 rounded-2xl space-y-1.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold block">Ingredients & Dish Contents:</span>
              <div className="flex flex-wrap gap-1.5">
                {item.ingredients.map((ing, i) => (
                  <span key={i} className="text-[9px] bg-[#181818] border border-white/5 text-gray-300 font-bold px-2 py-1 rounded-lg">
                    🌱 {ing}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Custom Option Groups */}
          {item.customizableOptions && item.customizableOptions.map((optGroup) => {
            const activeChoice = selectedOptions.find(
              (opt) => opt.optionTitle === optGroup.title
            )?.choice;

            return (
              <div key={optGroup.title} className="space-y-2.5">
                <h4 className="text-white font-display font-black text-sm uppercase tracking-tight flex items-center justify-between">
                  <span>{optGroup.title}</span>
                  <span className="text-[10px] bg-brand-red/20 text-brand-red font-bold px-2 py-0.5 rounded lowercase italic">
                    Required select one
                  </span>
                </h4>
                
                <div className="grid grid-cols-1 gap-2">
                  {optGroup.choices.map((choice) => {
                    const isSelected = activeChoice?.id === choice.id;
                    const priceDiff = choice.price;

                    return (
                      <button
                        key={choice.id}
                        onClick={() => handleOptionSelect(optGroup.title, choice)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left text-sm transition-all ${
                          isSelected
                            ? 'bg-[#222222] border-brand-gold text-brand-gold font-black shadow-lg shadow-brand-gold/5'
                            : 'bg-[#0D0D0C] border-white/5 text-gray-400 hover:bg-[#222222] hover:border-white/10 transition-all font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                            isSelected ? 'border-brand-gold bg-brand-gold' : 'border-white/20'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-[#0d0d0c] stroke-[4]" />}
                          </div>
                          <span className={isSelected ? 'text-white font-bold' : 'font-bold'}>{choice.name}</span>
                        </div>
                        
                        {priceDiff !== 0 && (
                          <span className={`text-xs font-black font-mono ${isSelected ? 'text-brand-gold' : 'text-gray-500'}`}>
                            {priceDiff > 0 ? `+₱${priceDiff.toFixed(2)}` : `-₱${Math.abs(priceDiff).toFixed(2)}`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Special Cooking Instructions */}
          <div className="space-y-2">
            <label className="text-white font-display font-black text-xs tracking-wider uppercase block">
              Special Instructions
            </label>
            <textarea
              rows={2}
              placeholder="E.g., No onions, extra calamansi, egg scrambled, separate sauce, etc."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full bg-[#0D0D0C] text-white text-xs rounded-xl p-3 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold shadow-inner"
            />
          </div>

        </div>

        {/* Footer (Quantity & Add button) */}
        <div className="p-6 bg-[#141414] border-t-2 border-white/5 flex-shrink-0 space-y-4">
          
          {/* Quantity selector and Total unit preview */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">Total Price</span>
              <span className="text-brand-gold font-display font-black text-2xl leading-none">
                ₱{totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Quantity +/- Buttons */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center bg-[#0D0D0C] border-2 border-white/5 p-1 rounded-xl shadow-inner">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 rounded-lg hover:bg-[#222222] text-gray-400 hover:text-white transition-all focus:outline-none"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-display font-bold text-white text-sm">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(maxAvailable, quantity + 1))}
                  disabled={quantity >= maxAvailable}
                  className={`p-2 rounded-lg hover:bg-[#222222] text-gray-400 hover:text-white transition-all focus:outline-none ${
                    quantity >= maxAvailable ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                  title={quantity >= maxAvailable ? "Maximum stock limit reached" : "Increase quantity"}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {maxAvailable <= 5 && (
                <span className="text-[10px] font-bold text-brand-red animate-pulse">
                  {maxAvailable} serving{maxAvailable === 1 ? '' : 's'} available
                </span>
              )}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleAddClick}
            className="w-full py-4 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-black uppercase tracking-wider transition-all shadow-md hover:shadow-brand-red/20 text-xs flex items-center justify-center gap-2"
          >
            Add to Cart (₱{totalPrice.toFixed(2)})
          </button>

        </div>

      </div>
    </div>
  );
}
