import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, MapPin, Shield } from 'lucide-react';
import { CustomerInfo } from '../types';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (customer: CustomerInfo) => void;
  onStaffPortalClick: () => void;
}

export default function CustomerAuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  onStaffPortalClick,
}: CustomerAuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  
  // Fields for Sign In
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Fields for Register
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerAddress, setRegisterAddress] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!signInEmail.trim() || !signInPassword.trim()) {
      setError('Please fill in all fields!');
      return;
    }

    // Load registered users from localStorage to check
    const registeredUsersStr = localStorage.getItem('curvada_registered_users');
    let users = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];
    
    // Default fallback demo user
    if (users.length === 0) {
      users.push({
        email: 'arnel@gmail.com',
        password: 'password123',
        name: 'Arnel Cruz',
        phone: '0917-882-9382',
        address: 'Block 3 Lot 15, Springville Homes, Bacoor, Cavite',
      });
      localStorage.setItem('curvada_registered_users', JSON.stringify(users));
    }

    const foundUser = users.find(
      (u: any) => u.email.toLowerCase() === signInEmail.trim().toLowerCase() && u.password === signInPassword
    );

    if (foundUser) {
      onLoginSuccess({
        name: foundUser.name,
        phone: foundUser.phone,
        email: foundUser.email,
        address: foundUser.address,
        orderType: 'delivery',
      });
      onClose();
      // Reset inputs
      setSignInEmail('');
      setSignInPassword('');
    } else {
      setError('Invalid email or password! (Try: arnel@gmail.com / password123)');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!registerName.trim() || !registerEmail.trim() || !registerPhone.trim() || !registerAddress.trim() || !registerPassword.trim()) {
      setError('Please fill in all fields!');
      return;
    }

    const registeredUsersStr = localStorage.getItem('curvada_registered_users');
    let users = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];

    const emailExists = users.some((u: any) => u.email.toLowerCase() === registerEmail.trim().toLowerCase());
    if (emailExists) {
      setError('An account with this email already exists!');
      return;
    }

    const newUser = {
      name: registerName.trim(),
      email: registerEmail.trim(),
      phone: registerPhone.trim(),
      address: registerAddress.trim(),
      password: registerPassword,
    };

    users.push(newUser);
    localStorage.setItem('curvada_registered_users', JSON.stringify(users));

    // Auto-login after registration
    onLoginSuccess({
      name: newUser.name,
      phone: newUser.phone,
      email: newUser.email,
      address: newUser.address,
      orderType: 'delivery',
    });
    
    onClose();

    // Reset inputs
    setRegisterName('');
    setRegisterEmail('');
    setRegisterPhone('');
    setRegisterAddress('');
    setRegisterPassword('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[99] animate-fade-in">
      <div className="bg-[#121211] border-2 border-white/5 rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl relative space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-all focus:outline-none"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <h2 className="font-display font-black text-2xl uppercase tracking-tighter text-white">
            {tab === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
            {tab === 'signin' ? 'Sign in to place orders faster' : 'Register your delivery details'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-2 bg-[#0D0D0C] p-1 rounded-2xl border border-white/5">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError('');
            }}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              tab === 'signin'
                ? 'bg-brand-red text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError('');
            }}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              tab === 'register'
                ? 'bg-brand-red text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Sign In Form */}
        {tab === 'signin' && (
          <form onSubmit={handleSignInSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] text-gray-400 uppercase tracking-widest font-black block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="e.g. arnel@gmail.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-gray-400 uppercase tracking-widest font-black block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                />
              </div>
            </div>

            {error && (
              <p className="text-brand-red text-[11px] font-bold text-center animate-shake mt-1">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-brand-red hover:opacity-90 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-brand-red/10 focus:outline-none"
            >
              Sign In
            </button>

            <div className="bg-black/30 border border-white/5 rounded-2xl p-2.5 text-center text-[10px] text-gray-400">
              Demo credentials: <span className="font-mono text-white font-bold">arnel@gmail.com</span> / <span className="font-mono text-white font-bold">password123</span>
            </div>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
            <div className="space-y-1">
              <label className="text-[9px] text-gray-400 uppercase tracking-widest font-black block">Full Name *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arnel Cruz"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] text-gray-400 uppercase tracking-widest font-black block">Email Address *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="arnel@gmail.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-gray-400 uppercase tracking-widest font-black block">Phone Number *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="0917-882-9382"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-gray-400 uppercase tracking-widest font-black block">Delivery Address *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 pt-2.5 flex items-start pointer-events-none text-gray-500">
                  <MapPin className="w-4 h-4" />
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder="Block 3 Lot 15, Springville Homes, Bacoor, Cavite"
                  value={registerAddress}
                  onChange={(e) => setRegisterAddress(e.target.value)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-semibold resize-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-gray-400 uppercase tracking-widest font-black block">Password *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                />
              </div>
            </div>

            {error && (
              <p className="text-brand-red text-[11px] font-bold text-center animate-shake mt-1">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-brand-red hover:opacity-90 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-brand-red/10 focus:outline-none"
            >
              Register & Sign In
            </button>
          </form>
        )}

        {/* Staff Portal Link footer */}
        <div className="pt-4 border-t border-white/5 text-center">
          <button
            type="button"
            onClick={onStaffPortalClick}
            className="inline-flex items-center gap-1 text-[11px] text-brand-gold hover:underline transition-all font-semibold uppercase tracking-wider"
          >
            <Shield className="w-3.5 h-3.5" /> Staff Portal Sign In
          </button>
        </div>

      </div>
    </div>
  );
}
