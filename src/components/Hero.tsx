import React from 'react';
import { Play, ArrowRight, Star, Clock, Heart, ShoppingCart } from 'lucide-react';
import { MenuItem } from '../types';

interface HeroProps {
  onOrderNowClick: () => void;
  onViewMenuClick: () => void;
  featuredItems: MenuItem[];
  onQuickAdd: (item: MenuItem) => void;
}

export default function Hero({
  onOrderNowClick,
  onViewMenuClick,
  featuredItems,
  onQuickAdd,
}: HeroProps) {
  return (
    <section className="relative bg-[#0D0D0C] min-h-[85vh] flex items-center pt-8 pb-16 px-4 md:px-8 overflow-hidden">
      
      {/* Dynamic Background Crimson Paint Sprays (Simulated with absolute radial gradients) */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full bg-brand-red/12 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-[350px] h-[350px] rounded-full bg-brand-red/6 blur-[100px] pointer-events-none" />
      
      {/* Grid Pattern overlay for tech-food premium vibe */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Column: Core Taglines (Matching the Website Mockup) */}
        <div className="lg:col-span-6 flex flex-col items-start text-left space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs font-bold uppercase tracking-wider animate-pulse-slow">
            <Star className="w-3.5 h-3.5 fill-brand-red" />
            Voted Best Filipino-Fusion Takeout
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-black text-5xl md:text-7xl text-white tracking-tighter uppercase leading-[0.95]">
              Made with
              <br />
              <span className="font-marker text-brand-red text-6xl md:text-8xl block transform rotate-[-1.5deg] my-2 origin-left tracking-wide drop-shadow-[0_4px_12px_rgba(211,31,36,0.3)] lowercase">
                flavor
              </span>
            </h1>
            <p className="font-display font-black text-2xl md:text-3.5xl text-brand-red uppercase tracking-widest mt-1">
              MADE TO GO.
            </p>
          </div>

          <p className="text-gray-400 text-base md:text-lg max-w-lg leading-relaxed font-normal">
            Delicious meals inspired by your cravings, made fresh with authentic Filipino-inspired marinades, and served blisteringly fast in elegant bento formats.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            <button
              id="hero-order-now-btn"
              onClick={onOrderNowClick}
              className="px-8 py-4 rounded-2xl bg-brand-red hover:bg-brand-red-hover text-white font-bold tracking-wide uppercase transition-all shadow-lg hover:shadow-brand-red/30 hover:translate-y-[-2px] flex items-center justify-center gap-2 group"
            >
              Order Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              id="hero-view-menu-btn"
              onClick={onViewMenuClick}
              className="px-8 py-4 rounded-2xl bg-[#141414] hover:bg-[#1f1f1f] border-2 border-white/5 hover:border-brand-red text-white font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-2"
            >
              View Menu
            </button>
          </div>

          {/* Key Trust Badges */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-white/5 w-full max-w-md">
            <div className="flex flex-col">
              <span className="text-brand-gold font-display font-extrabold text-xl md:text-2xl">20 Mins</span>
              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">Avg Delivery</span>
            </div>
            <div className="flex flex-col">
              <span className="text-brand-gold font-display font-extrabold text-xl md:text-2xl">4.9 ★</span>
              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">User Rating</span>
            </div>
            <div className="flex flex-col">
              <span className="text-brand-gold font-display font-extrabold text-xl md:text-2xl">100%</span>
              <span className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">Fresh Cooked</span>
            </div>
          </div>

        </div>

        {/* Right Column: Hero Food Presentation mockup (Matching image layout) */}
        <div className="lg:col-span-6 relative flex justify-center items-center">
          
          {/* Main Giant Glowing Shield Background */}
          <div className="absolute w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] rounded-full bg-brand-red/10 border-4 border-dashed border-brand-red/20 flex items-center justify-center animate-spin-slow pointer-events-none" />

          {/* Collage of Curvada's Dishes (Simulating the stunning composition in the banner) */}
          <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
            
            {/* Bento Display Card (Top Center-Right) */}
            <div className="absolute top-[5%] right-[5%] z-20 bg-[#181818] border-2 border-white/5 rounded-[2rem] p-4 shadow-2xl max-w-[210px] transform hover:scale-105 transition-all duration-300 group">
              <div className="relative overflow-hidden rounded-2xl h-28 w-full bg-[#0D0D0C]">
                <img 
                  src="https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=400" 
                  alt="Katsu Bento" 
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-2 left-2 bg-brand-red text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Bento
                </span>
              </div>
              <div className="mt-2.5">
                <h3 className="font-display font-bold text-white text-sm">Katsu Bento</h3>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-brand-red text-sm font-extrabold">₱189.00</span>
                  <button 
                    onClick={() => {
                      const item = featuredItems.find(i => i.id === 'bento-chicken-katsu');
                      if (item) onQuickAdd(item);
                    }}
                    className="p-1 rounded bg-brand-red hover:bg-brand-red-hover text-white transition-colors animate-pulse-slow"
                    title="Quick Add"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Rice Bowl Display Card (Bottom Center-Left) */}
            <div className="absolute bottom-[5%] left-[5%] z-20 bg-[#181818] border-2 border-white/5 rounded-[2rem] p-4 shadow-2xl max-w-[210px] transform hover:scale-105 transition-all duration-300 group">
              <div className="relative overflow-hidden rounded-2xl h-28 w-full bg-[#0D0D0C]">
                <img 
                  src="https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&q=80&w=400" 
                  alt="Sisig Overload" 
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-2 left-2 bg-brand-red text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Rice Bowl
                </span>
              </div>
              <div className="mt-2.5">
                <h3 className="font-display font-bold text-white text-sm">Sisig Overload</h3>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-brand-red text-sm font-extrabold">₱159.00</span>
                  <button 
                    onClick={() => {
                      const item = featuredItems.find(i => i.id === 'bowl-sisig-overload');
                      if (item) onQuickAdd(item);
                    }}
                    className="p-1 rounded bg-brand-red hover:bg-brand-red-hover text-white transition-colors"
                    title="Quick Add"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Centerpieces / Background graphic circles */}
            <div className="absolute top-[20%] left-[10%] w-16 h-16 rounded-full bg-brand-red/10 border border-brand-red/20 animate-bounce-slow pointer-events-none" />
            <div className="absolute bottom-[20%] right-[10%] w-12 h-12 rounded-full bg-brand-gold/10 border border-brand-gold/20 animate-pulse-slow pointer-events-none" />

            {/* Branded C-Cup floating on the right - Forest Green Bento Card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transform hover:scale-110 hover:rotate-3 transition-transform duration-300 bg-[#181818] border-2 border-white/5 rounded-[2rem] p-4 shadow-xl flex flex-col items-center w-40 text-white">
              <div className="relative w-20 h-28 flex items-center justify-center">
                {/* Visual Cup drawing using pure Tailwind */}
                <div className="w-14 h-24 bg-gradient-to-b from-brand-red to-brand-red-hover rounded-b-xl relative shadow-inner overflow-hidden border border-black/50">
                  {/* Top Rim */}
                  <div className="absolute top-0 left-0 right-0 h-2.5 bg-white/90 rounded-b-sm" />
                  {/* White "C" Badge */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0D0D0C] flex items-center justify-center border border-white/40">
                    <span className="text-white font-sans font-black text-xs">C</span>
                  </div>
                  {/* Liquid shine */}
                  <div className="absolute top-2 right-1 bottom-0 w-2.5 bg-white/20 blur-[1px]" />
                </div>
                {/* Straw */}
                <div className="absolute top-[-10px] right-[25px] w-1.5 h-10 bg-[#FFFFFF] rotate-[25deg] rounded-full shadow" />
              </div>
              <h4 className="font-display font-bold text-white text-xs mt-3 uppercase tracking-wider text-center">
                C-Cup Red Tea
              </h4>
              <p className="text-brand-gold font-bold text-xs mt-0.5">₱49.00</p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
