import React, { useState, useEffect } from 'react';
import { CartItem, CustomerInfo } from '../types';
import { 
  X, 
  Truck, 
  Store, 
  MapPin, 
  CreditCard, 
  ShieldCheck, 
  Loader2, 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert,
  PhoneCall,
  Map as MapIcon,
  Clock,
  Calendar
} from 'lucide-react';
import MapPickerModal from './MapPickerModal';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onSubmitOrder: (customer: CustomerInfo, paymentMethod: 'cod' | 'ewallet' | 'card') => void;
  loggedInCustomer: CustomerInfo | null;
}

const getDefaultFulfillmentDateTime = (offsetMinutes = 20) => {
  const d = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatFulfillmentDateTimeDisplay = (isoStr: string, isDelivery = false) => {
  if (!isoStr) return isDelivery ? 'ASAP (~20-30 mins)' : 'ASAP (~15-20 mins)';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const isToday = d.toDateString() === new Date().toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  if (isToday) {
    return `Today, ${timeStr}`;
  }
  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${dateStr}, ${timeStr}`;
};

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  onSubmitOrder,
  loggedInCustomer,
}: CheckoutModalProps) {
  const [name, setName] = useState(() => localStorage.getItem('curvada_cust_name') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('curvada_cust_phone') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('curvada_cust_email') || '');
  const [address, setAddress] = useState(() => localStorage.getItem('curvada_cust_address') || '');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>(() => (localStorage.getItem('curvada_cust_ordertype') as 'delivery' | 'pickup') || 'delivery');
  const [tableNumber, setTableNumber] = useState(() => localStorage.getItem('curvada_cust_tablenumber') || '');
  const [scheduleType, setScheduleType] = useState<'asap' | 'scheduled'>(() => (localStorage.getItem('curvada_cust_scheduletype') as 'asap' | 'scheduled') || 'asap');
  const [pickupDateTime, setPickupDateTime] = useState(() => localStorage.getItem('curvada_cust_pickuptime_iso') || getDefaultFulfillmentDateTime(15));
  const [deliveryDateTime, setDeliveryDateTime] = useState(() => localStorage.getItem('curvada_cust_deliverytime_iso') || getDefaultFulfillmentDateTime(30));
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'ewallet' | 'card'>(() => (localStorage.getItem('curvada_cust_paymentmethod') as 'cod' | 'ewallet' | 'card') || 'cod');

  // GPS & Map Geolocation state
  const [latitude, setLatitude] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('curvada_cust_lat');
    return saved ? parseFloat(saved) : undefined;
  });
  const [longitude, setLongitude] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('curvada_cust_lng');
    return saved ? parseFloat(saved) : undefined;
  });
  const [locationAccuracy, setLocationAccuracy] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('curvada_cust_accuracy');
    return saved ? parseFloat(saved) : undefined;
  });
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  // Promo Voucher state
  const [promoCode, setPromoCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherMsg, setVoucherMsg] = useState('');
  const [appliedVoucherCode, setAppliedVoucherCode] = useState('');

  // Loyalty Points state
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);

  // Synchronize inputs when modal opens or loggedInCustomer changes
  useEffect(() => {
    if (isOpen) {
      const params = new URLSearchParams(window.location.search);
      const urlTable = params.get('table');
      if (urlTable) {
        setOrderType('pickup');
        setTableNumber(urlTable);
      }

      if (loggedInCustomer) {
        setName(loggedInCustomer.name);
        setPhone(loggedInCustomer.phone);
        setEmail(loggedInCustomer.email);
        setAddress(loggedInCustomer.address);
        if (loggedInCustomer.latitude && loggedInCustomer.longitude) {
          setLatitude(loggedInCustomer.latitude);
          setLongitude(loggedInCustomer.longitude);
          setLocationAccuracy(loggedInCustomer.locationAccuracy);
        }
      } else {
        setName(localStorage.getItem('curvada_cust_name') || '');
        setPhone(localStorage.getItem('curvada_cust_phone') || '');
        setEmail(localStorage.getItem('curvada_cust_email') || '');
        setAddress(localStorage.getItem('curvada_cust_address') || '');
        const savedLat = localStorage.getItem('curvada_cust_lat');
        const savedLng = localStorage.getItem('curvada_cust_lng');
        const savedAcc = localStorage.getItem('curvada_cust_accuracy');
        if (savedLat && savedLng) {
          setLatitude(parseFloat(savedLat));
          setLongitude(parseFloat(savedLng));
          setLocationAccuracy(savedAcc ? parseFloat(savedAcc) : undefined);
        }
      }
    }
  }, [isOpen, loggedInCustomer]);
  
  // Payment Simulation States
  const [ewalletProvider, setEwalletProvider] = useState<'gcash' | 'maya'>('gcash');
  const [ewalletPhone, setEwalletPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const rawTotal = cartItems.reduce(
    (sum, item) => sum + item.totalUnitPrice * item.quantity,
    0
  );

  const userLoyaltyPoints = loggedInCustomer?.loyaltyPoints || 0;
  const maxLoyaltyRedeemable = Math.floor(userLoyaltyPoints / 10) * 50; // 10 pts = ₱50
  const loyaltyDiscount = useLoyaltyPoints ? Math.min(rawTotal, maxLoyaltyRedeemable) : 0;
  const totalAmount = Math.max(0, rawTotal - voucherDiscount - loyaltyDiscount);

  const handleApplyVoucher = async () => {
    setVoucherMsg('');
    if (!promoCode.trim()) return;
    try {
      const res = await fetch('/api/vouchers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, cartTotal: rawTotal })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVoucherDiscount(data.discountAmount);
        setAppliedVoucherCode(data.voucher.code);
        setVoucherMsg(`✅ Applied ${data.voucher.code}! Saved ₱${data.discountAmount.toFixed(2)}`);
      } else {
        const clean = promoCode.trim().toUpperCase();
        if (clean === 'WELCOME10') {
          const disc = (rawTotal * 10) / 100;
          setVoucherDiscount(disc);
          setAppliedVoucherCode('WELCOME10');
          setVoucherMsg(`✅ Applied WELCOME10! Saved ₱${disc.toFixed(2)}`);
        } else if (clean === 'CURVADA50') {
          const disc = Math.min(rawTotal, 50);
          setVoucherDiscount(disc);
          setAppliedVoucherCode('CURVADA50');
          setVoucherMsg(`✅ Applied CURVADA50! Saved ₱${disc.toFixed(2)}`);
        } else {
          setVoucherMsg(`❌ ${data.error || 'Invalid promo code'}`);
        }
      }
    } catch (e) {
      const clean = promoCode.trim().toUpperCase();
      if (clean === 'WELCOME10') {
        const disc = (rawTotal * 10) / 100;
        setVoucherDiscount(disc);
        setAppliedVoucherCode('WELCOME10');
        setVoucherMsg(`✅ Applied WELCOME10! Saved ₱${disc.toFixed(2)}`);
      } else if (clean === 'CURVADA50') {
        const disc = Math.min(rawTotal, 50);
        setVoucherDiscount(disc);
        setAppliedVoucherCode('CURVADA50');
        setVoucherMsg(`✅ Applied CURVADA50! Saved ₱${disc.toFixed(2)}`);
      } else {
        setVoucherMsg('❌ Invalid promo code');
      }
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your device or browser.');
      return;
    }
    setIsLocating(true);
    setErrorMsg('');
    setLocationSuccessMsg('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsLocating(false);
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const acc = Math.round(position.coords.accuracy);

        setLatitude(lat);
        setLongitude(lng);
        setLocationAccuracy(acc);
        setLocationSuccessMsg('GPS Location successfully pinned!');

        localStorage.setItem('curvada_cust_lat', lat.toString());
        localStorage.setItem('curvada_cust_lng', lng.toString());
        localStorage.setItem('curvada_cust_accuracy', acc.toString());

        // Reverse-geocode to auto-populate address name in the text box
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
                setAddress(resolvedAddress);
                localStorage.setItem('curvada_cust_address', resolvedAddress);
              }
            }
          }
        } catch (e) {
          console.warn('Reverse geocoding not available, keeping typed address.', e);
        }
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Unable to fetch current GPS coordinates. Please check device location permissions.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You may manually write your detailed landmarks & street address below.';
        }
        setErrorMsg(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleClearLocation = () => {
    setLatitude(undefined);
    setLongitude(undefined);
    setLocationAccuracy(undefined);
    setLocationSuccessMsg('');
    localStorage.removeItem('curvada_cust_lat');
    localStorage.removeItem('curvada_cust_lng');
    localStorage.removeItem('curvada_cust_accuracy');
  };

  const handleConfirmMapLocation = (loc: { latitude: number; longitude: number; addressText: string }) => {
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    setLocationAccuracy(5);
    setLocationSuccessMsg('Exact map pin location saved!');
    localStorage.setItem('curvada_cust_lat', loc.latitude.toString());
    localStorage.setItem('curvada_cust_lng', loc.longitude.toString());
    localStorage.setItem('curvada_cust_accuracy', '5');

    if (loc.addressText && loc.addressText.trim()) {
      setAddress(loc.addressText.trim());
      localStorage.setItem('curvada_cust_address', loc.addressText.trim());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!name.trim()) return setErrorMsg('Full Name is required.');
    
    // Clean and validate Philippine phone number (11 digits starting with 09)
    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!cleanPhone) {
      return setErrorMsg('Phone Number is required for order & rider dispatch contact.');
    }
    if (!/^09\d{9}$/.test(cleanPhone)) {
      return setErrorMsg('Please enter a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).');
    }

    if (orderType === 'delivery' && !address.trim()) {
      return setErrorMsg('Delivery Address is required so our rider can reach you.');
    }

    if (paymentMethod === 'ewallet' && !ewalletPhone.trim()) {
      return setErrorMsg('GCash/Maya registered mobile number is required.');
    }
    if (paymentMethod === 'card' && (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim())) {
      return setErrorMsg('Please fill in complete Card details.');
    }

    // Simulate Processing payment
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      
      const scheduledPickupStr = scheduleType === 'scheduled' ? formatFulfillmentDateTimeDisplay(pickupDateTime, false) : 'ASAP (~15-20 mins)';
      const scheduledDeliveryStr = scheduleType === 'scheduled' ? formatFulfillmentDateTimeDisplay(deliveryDateTime, true) : 'ASAP (~20-30 mins)';

      const customer: CustomerInfo = {
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim(),
        address: orderType === 'delivery' ? address.trim() : 'Curvada Kitchen Main HQ (Store Pickup)',
        orderType,
        tableNumber: orderType === 'pickup' && tableNumber ? tableNumber : undefined,
        pickupTime: orderType === 'pickup' ? scheduledPickupStr : undefined,
        deliveryTime: orderType === 'delivery' ? scheduledDeliveryStr : undefined,
        scheduleType,
        latitude,
        longitude,
        locationAccuracy,
        isLocationVerified: Boolean(latitude && longitude),
      };

      localStorage.setItem('curvada_cust_name', name);
      localStorage.setItem('curvada_cust_phone', cleanPhone);
      localStorage.setItem('curvada_cust_email', email);
      if (orderType === 'delivery') {
        localStorage.setItem('curvada_cust_address', address);
      }
      localStorage.setItem('curvada_cust_ordertype', orderType);
      localStorage.setItem('curvada_cust_scheduletype', scheduleType);
      localStorage.setItem('curvada_cust_tablenumber', tableNumber || '');
      localStorage.setItem('curvada_cust_pickuptime_iso', pickupDateTime || '');
      localStorage.setItem('curvada_cust_deliverytime_iso', deliveryDateTime || '');
      localStorage.setItem('curvada_cust_paymentmethod', paymentMethod);

      onSubmitOrder(customer, paymentMethod);
      onClose();
    }, 1800); // 1.8s cool simulator load
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      
      {/* Container */}
      <div className="relative w-full max-w-2xl bg-[#181818] rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-2xl flex flex-col my-8 max-h-[95vh]">
        
        {/* Header */}
        <div className="p-5 border-b-2 border-white/5 bg-[#0D0D0C] flex items-center justify-between flex-shrink-0">
          <div className="flex flex-col">
            <h3 className="font-display font-black text-white text-xl uppercase tracking-tight">Fulfillment & Payment</h3>
            <p className="text-gray-400 text-xs font-normal">Complete details to place your Curvada's Kitchen order</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#222222] border border-white/5 text-gray-500 hover:text-white transition-all focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {errorMsg && (
            <div className="bg-brand-red/15 border-2 border-brand-red/30 text-brand-red text-xs p-3.5 rounded-xl flex items-center gap-2 font-bold">
              <span className="font-black">Error:</span> {errorMsg}
            </div>
          )}

          {/* Checkout Items Summary */}
          <div className="bg-[#0D0D0C] border-2 border-white/5 rounded-[1.5rem] p-4 shadow-inner">
            <h4 className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-2">Order Summary</h4>
            <div className="space-y-2.5 max-h-32 overflow-y-auto text-xs text-white font-semibold pr-1">
              {cartItems.map((item) => {
                return (
                  <div key={item.id} className="flex justify-between items-start border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                    <div className="flex flex-col max-w-[70%]">
                      <span className="font-bold">{item.quantity}x {item.menuItem.name}</span>
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <div className="text-gray-400 text-[10px] font-normal leading-tight mt-1 space-y-0.5 pl-1.5 border-l-2 border-brand-red/40">
                          {item.selectedOptions.map((opt, idx) => {
                            const optTitle = opt.optionTitle || '';
                            const choiceName = typeof opt.choice === 'string' ? opt.choice : (opt.choice?.name || 'Option');
                            const choicePrice = opt.choice && typeof opt.choice.price === 'number' ? opt.choice.price : 0;

                            if (choicePrice === 0 && (choiceName.toLowerCase().startsWith('no ') || choiceName.toLowerCase() === 'none')) {
                              return null;
                            }

                            const isExtra = optTitle.toLowerCase().includes('extra') || choiceName.toLowerCase().includes('extra');
                            const isRice = optTitle.toLowerCase().includes('rice');
                            const isRiceUpgrade = isRice && !isExtra && choicePrice > 0;

                            const isDrink = optTitle.toLowerCase().includes('drink');

                            let label = choiceName;
                            if (isRiceUpgrade) {
                              label = `Rice Upgrade: ${choiceName}`;
                            } else if (isExtra) {
                              label = `Extra: ${choiceName}`;
                            } else if (isDrink) {
                              label = `Drink: ${choiceName}`;
                            }

                            return (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span>+ {label}</span>
                                {choicePrice > 0 && (
                                  <span className="text-brand-gold font-mono text-[9px] font-bold">
                                    (+₱{(choicePrice * item.quantity).toFixed(2)})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {item.specialInstructions && (
                        <span className="text-gray-500 text-[9px] italic mt-0.5">
                          * "{item.specialInstructions}"
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-brand-gold font-bold">₱{(item.totalUnitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-sm font-black text-white border-t-2 border-white/5 mt-3 pt-2 uppercase tracking-tight">
              <span>Total Amount</span>
              <span className="text-brand-gold font-mono font-black">₱{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* 1. Fulfillment Type selection (Delivery vs Pickup) */}
          <div className="space-y-2.5">
            <label className="text-white font-display font-black text-xs tracking-wider uppercase block">Fulfillment Method</label>
            <div className="grid grid-cols-2 gap-3">
              
              <button
                type="button"
                onClick={() => setOrderType('delivery')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  orderType === 'delivery'
                    ? 'bg-[#222222] border-brand-gold text-brand-gold font-black shadow-lg shadow-brand-gold/5'
                    : 'bg-[#0D0D0C] border-white/5 text-gray-400 hover:bg-[#222222] hover:border-white/10'
                }`}
              >
                <Truck className="w-5 h-5 text-brand-red" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Home Delivery</span>
                <span className="text-[10px] text-gray-500 font-semibold">Arrives in 15-30 mins</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderType('pickup')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  orderType === 'pickup'
                    ? 'bg-[#222222] border-brand-gold text-brand-gold font-black shadow-lg shadow-brand-gold/5'
                    : 'bg-[#0D0D0C] border-white/5 text-gray-400 hover:bg-[#222222] hover:border-white/10'
                }`}
              >
                <Store className="w-5 h-5 text-brand-red" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Store Pickup</span>
                <span className="text-[10px] text-gray-500 font-semibold">Ready in 10-15 mins</span>
              </button>

            </div>
          </div>

          {/* 2. Customer Contact Info */}
          <div className="space-y-4">
            <h4 className="text-white font-display font-black text-sm tracking-wide uppercase border-b-2 border-white/5 pb-1">
              Contact Information
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Full Name <span className="text-brand-red">*</span></label>
                <input
                  type="text"
                  placeholder="E.g., Maria Santos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0D0D0C] text-white rounded-xl p-3 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold text-sm shadow-inner"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Mobile Number <span className="text-brand-red">*</span></label>
                  <span className="text-[9px] text-gray-500 font-mono font-medium">09XXXXXXXXX</span>
                </div>
                <input
                  type="tel"
                  placeholder="0917 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={13}
                  className="w-full bg-[#0D0D0C] text-white rounded-xl p-3 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold text-sm shadow-inner font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Email Address (Optional)</label>
              <input
                type="email"
                placeholder="E.g., maria@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0D0D0C] text-white rounded-xl p-3 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold text-sm shadow-inner"
              />
            </div>
          </div>

          {/* 3. Address details or Table selection */}
          <div className="space-y-4">
            <h4 className="text-white font-display font-black text-sm tracking-wide uppercase border-b-2 border-white/5 pb-1">
              {orderType === 'delivery' ? 'Delivery Destination' : 'Pickup Instructions'}
            </h4>

            {orderType === 'delivery' ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">House No. / Street / Barangay / City <span className="text-brand-red">*</span></label>
                  
                  {/* Manual Pin & GPS Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsMapPickerOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold border border-brand-gold/40 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                      title="Open interactive map to drag and place exact pin"
                    >
                      <MapIcon className="w-3 h-3 text-brand-gold" />
                      <span>{latitude && longitude ? '📍 Adjust Pin on Map' : '📍 Pin on Map'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={isLocating}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#222222] hover:bg-white/10 text-gray-300 border border-white/10 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                      title="Quick GPS auto-detect"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-brand-gold" />
                          <span>GPS...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3 h-3 text-brand-gold" />
                          <span>Quick GPS</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <MapPin className="absolute left-4 top-4 w-4 h-4 text-brand-red" />
                  <textarea
                    rows={2}
                    placeholder="Provide full address & landmark directions so our riders can find you quickly..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#0D0D0C] text-white rounded-xl py-3 pl-11 pr-4 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold text-sm shadow-inner"
                    required
                  />
                </div>

                {/* GPS / Map Verified Status Badge */}
                {latitude && longitude && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-between text-emerald-400 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <span className="font-bold block text-white text-[11px]">📍 Exact Delivery Pin Attached</span>
                        <span className="text-[10px] text-emerald-300/90 font-medium">
                          Rider GPS location saved in background
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsMapPickerOpen(true)}
                        className="text-[10px] text-brand-gold bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 px-2 py-0.5 rounded font-bold cursor-pointer transition-all"
                      >
                        Adjust Pin 📍
                      </button>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-gray-300 underline font-bold hover:text-white"
                      >
                        Preview
                      </a>
                      <button
                        type="button"
                        onClick={handleClearLocation}
                        className="text-[10px] text-gray-400 hover:text-red-400 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 cursor-pointer"
                        title="Remove attached GPS pin"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
                {locationSuccessMsg && !latitude && (
                  <p className="text-[10px] text-emerald-400 font-semibold">{locationSuccessMsg}</p>
                )}
                {/* Delivery Scheduling / Timing Preference (ASAP vs Scheduled) */}
                <div className="p-3.5 bg-[#141413] border border-white/5 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-red" />
                      Delivery Timing Preference
                    </span>
                    <span className="text-[10px] font-black text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20 font-mono">
                      {scheduleType === 'asap' ? '⚡ ASAP (20-30 mins)' : formatFulfillmentDateTimeDisplay(deliveryDateTime, true)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScheduleType('asap')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        scheduleType === 'asap'
                          ? 'bg-brand-red border-red-500 text-white shadow-md'
                          : 'bg-[#1e1e1d] border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>⚡ Deliver ASAP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleType('scheduled')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        scheduleType === 'scheduled'
                          ? 'bg-brand-gold border-brand-gold text-black shadow-md'
                          : 'bg-[#1e1e1d] border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>📅 Schedule Delivery</span>
                    </button>
                  </div>

                  {scheduleType === 'scheduled' && (
                    <div className="space-y-2 pt-2 border-t border-white/5 animate-fade-in">
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { label: '+30 mins', mins: 30 },
                          { label: '+45 mins', mins: 45 },
                          { label: '+1 hour', mins: 60 },
                          { label: '+2 hours', mins: 120 },
                          { label: '+3 hours', mins: 180 },
                        ].map((preset) => (
                          <button
                            key={preset.mins}
                            type="button"
                            onClick={() => setDeliveryDateTime(getDefaultFulfillmentDateTime(preset.mins))}
                            className="px-2 py-1 rounded-lg text-[9.5px] font-bold uppercase transition-all bg-[#181818] border border-white/5 hover:border-brand-gold/40 text-gray-400 hover:text-white cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="relative">
                        <input
                          type="datetime-local"
                          value={deliveryDateTime}
                          onChange={(e) => setDeliveryDateTime(e.target.value)}
                          className="w-full bg-[#181818] text-white rounded-xl p-2.5 border-2 border-white/5 focus:border-brand-gold focus:outline-none transition-all font-mono font-bold text-xs cursor-pointer"
                        />
                      </div>
                      <p className="text-[9px] text-gray-500">
                        🛵 Our kitchen and rider will prepare and dispatch your food to arrive precisely by this time.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#0D0D0C] border-2 border-white/5 rounded-2xl space-y-3.5 shadow-inner">
                <div className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                  <Store className="w-4 h-4 text-brand-red mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Curvada Kitchen Main HQ Pickup:</span>
                    Pick up at counter: <strong className="text-white font-bold">Zone 4, Curvada Highway, National Road.</strong> 
                    We will have your order freshly packed and hot by the time you arrive!
                  </div>
                </div>

                {/* Pickup Timing Preference (ASAP vs Scheduled) */}
                <div className="p-3 bg-[#141413] border border-white/5 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-red" />
                      Pickup Timing Preference
                    </span>
                    <span className="text-[10px] font-black text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20 font-mono">
                      {scheduleType === 'asap' ? '⚡ Ready in 10-15 mins' : formatFulfillmentDateTimeDisplay(pickupDateTime, false)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScheduleType('asap')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        scheduleType === 'asap'
                          ? 'bg-brand-red border-red-500 text-white shadow-md'
                          : 'bg-[#1e1e1d] border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span>⚡ ASAP (~15 mins)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleType('scheduled')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        scheduleType === 'scheduled'
                          ? 'bg-brand-gold border-brand-gold text-black shadow-md'
                          : 'bg-[#1e1e1d] border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>📅 Schedule Pickup</span>
                    </button>
                  </div>

                  {scheduleType === 'scheduled' && (
                    <div className="space-y-2 pt-2 border-t border-white/5 animate-fade-in">
                      {/* Quick offset buttons */}
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { label: '+15m (ASAP)', mins: 15 },
                          { label: '+30m', mins: 30 },
                          { label: '+45m', mins: 45 },
                          { label: '+1 hr', mins: 60 },
                          { label: '+2 hrs', mins: 120 },
                        ].map((preset) => (
                          <button
                            key={preset.mins}
                            type="button"
                            onClick={() => setPickupDateTime(getDefaultFulfillmentDateTime(preset.mins))}
                            className="px-2 py-1 rounded-lg text-[9.5px] font-bold uppercase transition-all bg-[#181818] border border-white/5 hover:border-brand-gold/40 text-gray-400 hover:text-white cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Native DateTime-local picker */}
                      <div className="relative">
                        <input
                          type="datetime-local"
                          value={pickupDateTime}
                          onChange={(e) => setPickupDateTime(e.target.value)}
                          className="w-full bg-[#181818] text-white rounded-xl p-2.5 border-2 border-white/5 focus:border-brand-gold focus:outline-none transition-all font-mono font-bold text-xs cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Dine-In Table Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="E.g. Table 5"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full bg-[#181818] text-white rounded-xl p-3 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold text-sm"
                  />
                  <p className="text-[9px] text-gray-500">
                    💡 Leave blank if picking up to-go at counter.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3.5 Promo Voucher & Loyalty Rewards */}
          <div className="bg-[#0D0D0C] border-2 border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                🏷️ Promo Voucher & Rewards
              </span>
              {loggedInCustomer && userLoyaltyPoints > 0 && (
                <span className="text-[10px] text-brand-gold font-mono font-bold">
                  💎 {userLoyaltyPoints} Loyalty Pts
                </span>
              )}
            </div>

            {/* Voucher Input */}
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Promo Code (e.g. WELCOME10)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-[#181818] text-white rounded-xl px-3 py-2 border border-white/10 text-xs font-mono font-bold focus:outline-none focus:border-brand-red uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  className="px-4 py-2 bg-brand-red hover:bg-brand-red-hover text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Apply
                </button>
              </div>
              {voucherMsg && (
                <p className={`text-[10px] font-bold ${voucherMsg.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {voucherMsg}
                </p>
              )}
            </div>

            {/* Loyalty Points Redemption Toggle */}
            {loggedInCustomer && userLoyaltyPoints >= 10 && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Redeem Loyalty Points</span>
                  <span className="text-[10px] text-gray-400 font-medium">Redeem points for ₱{maxLoyaltyRedeemable} off</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUseLoyaltyPoints(!useLoyaltyPoints)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                    useLoyaltyPoints ? 'bg-brand-gold text-black shadow-md' : 'bg-[#181818] border border-white/10 text-gray-400'
                  }`}
                >
                  {useLoyaltyPoints ? 'Applied 💎' : 'Redeem'}
                </button>
              </div>
            )}
          </div>

          {/* 4. Payment Selection */}
          <div className="space-y-4">
            <h4 className="text-white font-display font-black text-sm tracking-wide uppercase border-b-2 border-white/5 pb-1">
              Select Payment Method
            </h4>

            <div className="grid grid-cols-3 gap-2">
              
              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all text-center ${
                  paymentMethod === 'cod'
                    ? 'bg-[#222222] border-brand-gold text-brand-gold font-black shadow-lg shadow-brand-gold/5'
                    : 'bg-[#0D0D0C] border-white/5 text-gray-400 hover:bg-[#222222] hover:border-white/10'
                }`}
              >
                <div className="text-lg">💵</div>
                <span className="text-[10px] uppercase tracking-wide font-black text-white">
                  {orderType === 'delivery' ? 'Cash on Del' : 'Pay at Counter'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ewallet')}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all text-center ${
                  paymentMethod === 'ewallet'
                    ? 'bg-[#222222] border-brand-gold text-brand-gold font-black shadow-lg shadow-brand-gold/5'
                    : 'bg-[#0D0D0C] border-white/5 text-gray-400 hover:bg-[#222222] hover:border-white/10'
                }`}
              >
                <div className="text-lg">📱</div>
                <span className="text-[10px] uppercase tracking-wide font-black text-white">GCash / Maya</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all text-center ${
                  paymentMethod === 'card'
                    ? 'bg-[#222222] border-brand-gold text-brand-gold font-black shadow-lg shadow-brand-gold/5'
                    : 'bg-[#0D0D0C] border-white/5 text-gray-400 hover:bg-[#222222] hover:border-white/10'
                }`}
              >
                <CreditCard className="w-4 h-4 text-brand-red mt-1" />
                <span className="text-[10px] uppercase tracking-wide font-black text-white">Visa / Master</span>
              </button>

            </div>

            {/* COD Anti-Bogus Security Notice */}
            {paymentMethod === 'cod' && (
              <div className="bg-amber-500/10 border-2 border-amber-500/25 rounded-2xl p-4 space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Anti-Bogus Order & COD Safety Policy</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed font-normal">
                  To protect our small kitchen & rider partners against fake bookings, our dispatch staff may place a quick verification call to <strong className="text-white font-mono">{phone || 'your phone number'}</strong> before cooking starts. Please ensure your line is reachable.
                </p>
                {totalAmount > 1500 && (
                  <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-red-200">
                    <AlertTriangle className="w-4 h-4 text-brand-red flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-bold">High-Value COD Order (₱{totalAmount.toFixed(2)}):</strong>
                      Orders above ₱1,500 require verbal phone confirmation before cooking, or you may pay via GCash/Maya for instant express cooking.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Simulated Payment details portal based on choice */}
            {paymentMethod === 'ewallet' && (
              <div className="bg-[#0D0D0C] p-4 rounded-2xl border-2 border-white/5 space-y-3 animate-fade-in shadow-inner">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEwalletProvider('gcash')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                      ewalletProvider === 'gcash'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-[#181818] border border-white/5 text-gray-400 hover:bg-[#222222]'
                    }`}
                  >
                    GCash
                  </button>
                  <button
                    type="button"
                    onClick={() => setEwalletProvider('maya')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                      ewalletProvider === 'maya'
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-[#181818] border border-white/5 text-gray-400 hover:bg-[#222222]'
                    }`}
                  >
                    Maya
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">
                    Registered Mobile Number <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 09171234567"
                    value={ewalletPhone}
                    onChange={(e) => setEwalletPhone(e.target.value)}
                    className="w-full bg-[#181818] text-white rounded-xl p-3 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold text-xs font-mono"
                    required
                  />
                </div>
                <span className="text-[10px] text-gray-500 flex items-center gap-1 font-semibold italic">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-red" />
                  Your connection is mock-encrypted and highly secure.
                </span>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="bg-[#0D0D0C] p-4 rounded-2xl border-2 border-white/5 space-y-3 animate-fade-in shadow-inner">
                <div className="space-y-1.5">
                  <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">
                    Card Number <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-[#181818] text-white rounded-xl p-3 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold text-xs font-mono"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-[#181818] text-white rounded-xl p-3 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold text-xs font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">CVV</label>
                    <input
                      type="password"
                      placeholder="***"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full bg-[#181818] text-white rounded-xl p-3 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold text-xs font-mono"
                      maxLength={3}
                      required
                    />
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 flex items-center gap-1 font-semibold italic">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-red" />
                  Visa/Mastercard mock payment simulation will be run.
                </span>
              </div>
            )}

          </div>

        </form>

        {/* Footer (Submission Action) */}
        <div className="p-5 bg-[#0D0D0C] border-t-2 border-white/5 flex-shrink-0 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">Total Payable</span>
              {(voucherDiscount > 0 || loyaltyDiscount > 0) && (
                <span className="text-gray-500 text-[10px] line-through font-mono">
                  ₱{rawTotal.toFixed(2)}
                </span>
              )}
            </div>
            <span className="text-brand-gold font-display font-black text-xl leading-none">
              ₱{totalAmount.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSubmit}
            className="px-6 py-3.5 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-brand-red/20 min-w-[170px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Processing...
              </>
            ) : (
              'Place Order Now'
            )}
          </button>
        </div>

      </div>

      {/* Interactive Map Pinning Modal */}
      <MapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialLat={latitude}
        initialLng={longitude}
        onConfirmLocation={handleConfirmMapLocation}
      />
    </div>
  );
}
