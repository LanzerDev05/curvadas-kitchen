import React, { useState } from 'react';
import { CartItem, CustomerInfo } from '../types';
import { X, Truck, Store, MapPin, CreditCard, ShieldCheck, Loader2 } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onSubmitOrder: (customer: CustomerInfo, paymentMethod: 'cod' | 'ewallet' | 'card') => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  onSubmitOrder,
}: CheckoutModalProps) {
  const [name, setName] = useState(() => localStorage.getItem('curvada_cust_name') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('curvada_cust_phone') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('curvada_cust_email') || '');
  const [address, setAddress] = useState(() => localStorage.getItem('curvada_cust_address') || '');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>(() => (localStorage.getItem('curvada_cust_ordertype') as 'delivery' | 'pickup') || 'delivery');
  const [tableNumber, setTableNumber] = useState(() => localStorage.getItem('curvada_cust_tablenumber') || '');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'ewallet' | 'card'>(() => (localStorage.getItem('curvada_cust_paymentmethod') as 'cod' | 'ewallet' | 'card') || 'cod');
  
  // Payment Simulation States
  const [ewalletProvider, setEwalletProvider] = useState<'gcash' | 'maya'>('gcash');
  const [ewalletPhone, setEwalletPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.totalUnitPrice * item.quantity,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!name.trim()) return setErrorMsg('Full Name is required.');
    if (!phone.trim()) return setErrorMsg('Phone Number is required.');
    if (orderType === 'delivery' && !address.trim()) {
      return setErrorMsg('Delivery Address is required.');
    }

    if (paymentMethod === 'ewallet' && !ewalletPhone.trim()) {
      return setErrorMsg('GCash/Maya mobile number is required.');
    }
    if (paymentMethod === 'card' && (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim())) {
      return setErrorMsg('Please fill in complete Card details.');
    }

    // Simulate Processing payment
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      
      const customer: CustomerInfo = {
        name,
        phone,
        email,
        address: orderType === 'delivery' ? address : 'Curvada Kitchen Main HQ (Store Pickup)',
        orderType,
        tableNumber: orderType === 'pickup' && tableNumber ? tableNumber : undefined,
      };

      localStorage.setItem('curvada_cust_name', name);
      localStorage.setItem('curvada_cust_phone', phone);
      localStorage.setItem('curvada_cust_email', email);
      if (orderType === 'delivery') {
        localStorage.setItem('curvada_cust_address', address);
      }
      localStorage.setItem('curvada_cust_ordertype', orderType);
      localStorage.setItem('curvada_cust_tablenumber', tableNumber || '');
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
                const optionNames = item.selectedOptions.map(o => o.choice.name).join(', ');
                return (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex flex-col max-w-[70%]">
                      <span>{item.quantity}x {item.menuItem.name}</span>
                      {optionNames && (
                        <span className="text-gray-500 text-[10px] font-normal leading-tight mt-0.5">
                          {optionNames}
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
                <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Phone Number <span className="text-brand-red">*</span></label>
                <input
                  type="tel"
                  placeholder="E.g., 0912 345 6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0D0D0C] text-white rounded-xl p-3 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold text-sm shadow-inner"
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
              <div className="space-y-1.5">
                <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">House No. / Street / Barangay / City <span className="text-brand-red">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 w-4 h-4 text-brand-red" />
                  <textarea
                    rows={2}
                    placeholder="Provide full address directions so our riders can find you quickly..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#0D0D0C] text-white rounded-xl py-3 pl-11 pr-4 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold text-sm shadow-inner"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#0D0D0C] border-2 border-white/5 rounded-2xl space-y-3 shadow-inner">
                <div className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                  <Store className="w-4 h-4 text-brand-red mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Curvada Kitchen Main HQ Pickup:</span>
                    Pick up at counter: <strong className="text-white font-bold">Zone 4, Curvada Highway, National Road.</strong> 
                    We will have your order freshly packed and hot by the time you arrive!
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t-2 border-white/5">
                  <label className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Dine-In Table Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="E.g. Table 5"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-48 bg-[#181818] text-white rounded-xl p-3 border-2 border-white/5 focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-600 font-semibold text-sm"
                  />
                </div>
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
            <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">Total amount</span>
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
    </div>
  );
}
