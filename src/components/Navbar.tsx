import React from 'react';
import Logo from './Logo';
import { ShoppingBag, ClipboardList, Utensils, History, MapPin, Users, User, LogOut } from 'lucide-react';
import { CustomerInfo } from '../types';

interface NavbarProps {
  activeTab: 'home' | 'menu' | 'tracker' | 'history' | 'chef';
  setActiveTab: (tab: 'home' | 'menu' | 'tracker' | 'history' | 'chef') => void;
  cartCount: number;
  onCartClick: () => void;
  hasActiveOrder: boolean;
  onGroupOrderClick: () => void;
  isGroupActive: boolean;
  onLoginClick: () => void;
  loggedInCustomer: CustomerInfo | null;
  onLogout: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  cartCount,
  onCartClick,
  hasActiveOrder,
  onGroupOrderClick,
  isGroupActive,
  onLoginClick,
  loggedInCustomer,
  onLogout,
}: NavbarProps) {
  return (
    <nav className="sticky top-0 z-40 bg-[#0D0D0C]/90 backdrop-blur-md border-b-2 border-white/5 py-4 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo - Clicking resets to Home */}
        <button 
          onClick={() => setActiveTab('home')} 
          className="flex items-center gap-1 hover:opacity-90 transition-opacity focus:outline-none"
          id="navbar-logo-btn"
        >
          <Logo size="sm" showText={true} />
        </button>

        {/* Navigation Items - Center (Desktop) */}
        <div className="hidden md:flex items-center gap-1 bg-[#181818] p-1 rounded-full border-2 border-white/5 shadow-2xl">
          <button
            id="nav-home"
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'home'
                ? 'bg-brand-red text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Home
          </button>
          
          <button
            id="nav-menu"
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'menu'
                ? 'bg-brand-red text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Menu
          </button>

          <button
            id="nav-tracker"
            onClick={() => setActiveTab('tracker')}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all relative ${
              activeTab === 'tracker'
                ? 'bg-brand-red text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Order Tracker
            {hasActiveOrder && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-gold"></span>
              </span>
            )}
          </button>

          <button
            id="nav-history"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'history'
                ? 'bg-brand-red text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            My Orders
          </button>
        </div>

        {/* Right Controls - Action, Staff Portal, and Chef Hat */}
        <div className="flex items-center gap-3">
          


          {/* Customer Login / Register Button */}
          {loggedInCustomer ? (
            <div className="flex items-center gap-2 bg-[#181818] border border-white/5 pl-3 pr-2 py-1.5 rounded-xl text-xs font-bold text-gray-300">
              <User className="w-3.5 h-3.5 text-brand-red" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate">{loggedInCustomer.name}</span>
              {loggedInCustomer.loyaltyPoints !== undefined && loggedInCustomer.loyaltyPoints > 0 && (
                <span className="bg-brand-gold/10 text-brand-gold text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border border-brand-gold/20">
                  💎 {loggedInCustomer.loyaltyPoints}
                </span>
              )}
              <button
                onClick={onLogout}
                title="Logout Customer"
                className="p-1 hover:bg-white/5 rounded-lg text-gray-500 hover:text-brand-red transition-all ml-1 focus:outline-none cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="navbar-login-btn"
              onClick={onLoginClick}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#181818] text-white border border-white/5 hover:border-brand-red hover:bg-[#222222] transition-all focus:outline-none cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}

          {/* Group Order Button */}
          <button
            id="navbar-group-btn"
            onClick={onGroupOrderClick}
            title="Group Order Session"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all cursor-pointer ${
              isGroupActive
                ? 'bg-brand-red text-white border-brand-red font-black shadow-lg shadow-brand-red/10 animate-pulse-slow'
                : 'bg-[#181818] text-gray-300 border-white/5 hover:border-brand-red hover:bg-[#222222]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isGroupActive ? 'Group Active' : 'Group Order'}
            </span>
          </button>

          {/* Cart Trigger Button */}
          <button
            id="navbar-cart-btn"
            onClick={onCartClick}
            className="relative p-2.5 rounded-full bg-[#181818] border-2 border-white/5 hover:border-brand-red text-white hover:bg-white/5 transition-all focus:outline-none cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5 text-bento-charcoal" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-brand-red text-white font-bold text-xs px-2 py-0.5 rounded-full border-2 border-white shadow-lg animate-bounce-short">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation bar at bottom or scrollable (Visible on small screens) */}
      <div className="md:hidden mt-3 flex items-center justify-around border-t-2 border-bento-charcoal/5 pt-2 text-xs">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'home' ? 'text-brand-red font-semibold' : 'text-bento-charcoal/60'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'menu' ? 'text-brand-red font-semibold' : 'text-bento-charcoal/60'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Menu</span>
        </button>
        <button
          onClick={() => setActiveTab('tracker')}
          className={`flex flex-col items-center gap-0.5 relative ${
            activeTab === 'tracker' ? 'text-brand-red font-semibold' : 'text-bento-charcoal/60'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Track</span>
          {hasActiveOrder && (
            <span className="absolute top-0 right-1 h-1.5 w-1.5 rounded-full bg-brand-gold"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-0.5 ${
            activeTab === 'history' ? 'text-brand-red font-semibold' : 'text-bento-charcoal/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
        </button>

      </div>

    </nav>
  );
}

