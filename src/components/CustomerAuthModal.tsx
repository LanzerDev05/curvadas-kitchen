import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, MapPin, Shield, Navigation, Loader2, CheckCircle2, Map as MapIcon } from 'lucide-react';
import { CustomerInfo } from '../types';
import MapPickerModal from './MapPickerModal';

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

  // Geolocation for Registration
  const [registerLat, setRegisterLat] = useState<number | undefined>();
  const [registerLng, setRegisterLng] = useState<number | undefined>();
  const [registerAccuracy, setRegisterAccuracy] = useState<number | undefined>();
  const [isLocating, setIsLocating] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!signInEmail.trim() || !signInPassword.trim()) {
      setError('Please fill in all fields!');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail.trim(), password: signInPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.user);
        onClose();
        setSignInEmail('');
        setSignInPassword('');
        return;
      } else if (data.error) {
        setError(data.error);
        return;
      }
    } catch (e) {
      console.warn("Backend auth offline, using local fallback", e);
    }

    // Local fallback check if server API is unavailable
    const registeredUsersStr = localStorage.getItem('curvada_registered_users');
    let users = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];
    if (users.length === 0) {
      users.push({
        email: 'lanzer@gmail.com',
        password: 'password123',
        name: 'Lanzer Villarlibo',
        phone: '0917-882-9382',
        address: 'Colo, Dinalupihan, Bataan',
      });
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
      setError('Invalid email or password! (Try: lanzer@gmail.com / password123)');
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your device.');
      return;
    }
    setIsLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsLocating(false);
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const acc = Math.round(position.coords.accuracy);

        setRegisterLat(lat);
        setRegisterLng(lng);
        setRegisterAccuracy(acc);

        // Reverse geocode to auto-fill address input
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              const addr = data.address || {};
              const road = addr.road || addr.pedestrian || addr.suburb || '';
              const village = addr.village || addr.neighbourhood || addr.quarter || '';
              const city = addr.city || addr.town || addr.municipality || '';
              const state = addr.state || addr.province || '';
              
              const parts = [road, village, city, state].filter(Boolean);
              const resolvedAddress = parts.length > 0 ? parts.join(', ') : data.display_name;
              
              if (resolvedAddress) {
                setRegisterAddress(resolvedAddress);
              }
            }
          }
        } catch (e) {
          console.warn('Reverse geocoding error:', e);
        }
      },
      (err) => {
        setIsLocating(false);
        setError('Could not get GPS coordinates. You can still type your address or use "Pin on Map".');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirmRegistrationMap = (loc: { latitude: number; longitude: number; addressText: string }) => {
    setRegisterLat(loc.latitude);
    setRegisterLng(loc.longitude);
    setRegisterAccuracy(5);
    if (loc.addressText && loc.addressText.trim()) {
      setRegisterAddress(loc.addressText.trim());
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!registerName.trim() || !registerEmail.trim() || !registerPhone.trim() || !registerAddress.trim() || !registerPassword.trim()) {
      setError('Please fill in all fields!');
      return;
    }

    const cleanPhone = registerPhone.replace(/[\s-]/g, '');
    if (!/^09\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail.trim(),
          phone: cleanPhone,
          address: registerAddress.trim(),
          password: registerPassword,
          latitude: registerLat,
          longitude: registerLng,
          locationAccuracy: registerAccuracy,
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess({
          ...data.user,
          latitude: registerLat,
          longitude: registerLng,
          locationAccuracy: registerAccuracy,
          isLocationVerified: Boolean(registerLat && registerLng),
        });
        onClose();
        setRegisterName('');
        setRegisterEmail('');
        setRegisterPhone('');
        setRegisterAddress('');
        setRegisterPassword('');
        return;
      } else if (data.error) {
        setError(data.error);
        return;
      }
    } catch (e) {
      console.warn("Backend auth register offline, using local fallback", e);
    }

    // Local fallback check
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
      phone: cleanPhone,
      address: registerAddress.trim(),
      password: registerPassword,
      latitude: registerLat,
      longitude: registerLng,
      locationAccuracy: registerAccuracy,
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
      latitude: registerLat,
      longitude: registerLng,
      locationAccuracy: registerAccuracy,
      isLocationVerified: Boolean(registerLat && registerLng),
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

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-2 bg-[#0D0D0C] p-1 rounded-2xl border border-white/5">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError('');
            }}
            className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${tab === 'signin'
                ? 'bg-brand-red text-white shadow-md'
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
            className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${tab === 'register'
                ? 'bg-brand-red text-white shadow-md'
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
                  placeholder="e.g. lanzer@gmail.com"
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
              className="w-full py-3 bg-brand-red hover:opacity-90 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-brand-red/10 focus:outline-none cursor-pointer"
            >
              Sign In
            </button>

            <div className="bg-black/30 border border-white/5 rounded-2xl p-2.5 text-center text-[10px] text-gray-400">
              Database seed credentials: <span className="font-mono text-white font-bold">lanzer@gmail.com</span> / <span className="font-mono text-white font-bold">password123</span>
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
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-gray-400 uppercase tracking-widest font-black block">Delivery Address *</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(true)}
                    className="flex items-center gap-1 text-[9px] text-brand-gold hover:text-white font-bold cursor-pointer bg-brand-gold/10 hover:bg-brand-gold/20 px-2 py-0.5 rounded border border-brand-gold/20 transition-all"
                  >
                    <MapIcon className="w-2.5 h-2.5" />
                    <span>{registerLat ? '📍 Adjust Pin' : '📍 Pin on Map'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-white font-bold cursor-pointer px-1.5 py-0.5 rounded transition-all"
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        <span>GPS...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-2.5 h-2.5" />
                        <span>Quick GPS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 pt-2.5 flex items-start pointer-events-none text-gray-500">
                  <MapPin className="w-4 h-4" />
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder="Colo, Dinalupihan, Bataan"
                  value={registerAddress}
                  onChange={(e) => setRegisterAddress(e.target.value)}
                  className="w-full bg-[#0D0D0C] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-semibold resize-none"
                />
              </div>
              {registerLat && registerLng && (
                <div className="flex items-center justify-between text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                    <span>📍 Exact Pin Attached</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(true)}
                    className="text-[9px] text-brand-gold underline font-bold cursor-pointer"
                  >
                    Adjust
                  </button>
                </div>
              )}
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

      {/* Map Picker Modal */}
      <MapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialLat={registerLat}
        initialLng={registerLng}
        onConfirmLocation={handleConfirmRegistrationMap}
      />
    </div>
  );
}
