import React, { useState, useEffect } from 'react';
import { 
  Users, 
  QrCode, 
  Link, 
  Copy, 
  Check, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  AlertCircle, 
  Sparkles, 
  ShoppingBag, 
  ArrowRight, 
  UserPlus, 
  LogOut, 
  Ban,
  ClipboardList
} from 'lucide-react';
import { GroupOrderSession, MenuItem, GroupCartItem, GroupMember } from '../types';

interface GroupOrderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  session: GroupOrderSession | null;
  currentUserNickname: string;
  currentUserId: string;
  onStartSession: (nickname: string) => void;
  onJoinSession: (sessionId: string, nickname: string) => void;
  onLeaveSession: () => void;
  onCancelSession: () => void;
  onToggleReady: () => void;
  onUpdateItemQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
}

export default function GroupOrderPanel({
  isOpen,
  onClose,
  session,
  currentUserNickname,
  currentUserId,
  onStartSession,
  onJoinSession,
  onLeaveSession,
  onCancelSession,
  onToggleReady,
  onUpdateItemQuantity,
  onRemoveItem,
  onCheckout,
}: GroupOrderPanelProps) {
  const [nicknameInput, setNicknameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [joinError, setJoinError] = useState('');

  if (!isOpen) return null;

  // Generate join link
  const joinUrl = session 
    ? `${window.location.origin}${window.location.pathname}?group=${session.id}`
    : '';

  const handleCopyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameInput.trim()) return;
    onStartSession(nicknameInput.trim());
    setNicknameInput('');
  };

  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!joinCodeInput.trim() || !nicknameInput.trim()) {
      setJoinError('Please fill in both the Group Code and your Nickname.');
      return;
    }

    // Check if session exists in storage
    const cached = localStorage.getItem('curvada_group_sessions');
    let sessions: GroupOrderSession[] = [];
    if (cached) {
      try { sessions = JSON.parse(cached); } catch (err) {}
    }

    const code = joinCodeInput.trim().toUpperCase();
    const found = sessions.find(s => s.id === code && s.status === 'active');
    
    if (!found) {
      setJoinError(`Active group session "${code}" not found. Ask the host to verify the code!`);
      return;
    }

    onJoinSession(code, nicknameInput.trim());
    setNicknameInput('');
    setJoinCodeInput('');
  };

  // Calculations for total and participant breakdown
  const grandTotal = session
    ? session.items.reduce((sum, item) => sum + item.totalUnitPrice * item.quantity, 0)
    : 0;

  // Group items by member
  const itemsByMember = session
    ? session.members.reduce((acc, member) => {
        const memberItems = session.items.filter(i => i.memberId === member.id);
        const memberTotal = memberItems.reduce((sum, i) => sum + i.totalUnitPrice * i.quantity, 0);
        acc[member.id] = {
          member,
          items: memberItems,
          total: memberTotal
        };
        return acc;
      }, {} as Record<string, { member: GroupMember; items: GroupCartItem[]; total: number }>)
    : {};

  const isCurrentUserHost = session && session.hostId === currentUserId;
  const isCurrentUserReady = session && session.members.find(m => m.id === currentUserId)?.isReady;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-[3px] transition-opacity animate-fade-in"
      />

      {/* Panel Body */}
      <div className="relative w-full max-w-lg h-full bg-[#181818] border-l-2 border-white/10 shadow-2xl flex flex-col z-10 animate-slide-in-right">
        
        {/* Header */}
        <div className="p-5 border-b-2 border-white/5 bg-[#0D0D0C] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-red animate-pulse" />
            <h3 className="font-display font-black text-white text-lg uppercase tracking-tight">
              {session ? `Group Order Session` : '👥 Group Ordering'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#222222] text-gray-500 hover:text-white border border-white/5 transition-all focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {!session ? (
            /* --- STATE 1: NO ACTIVE GROUP SESSION --- */
            <div className="space-y-6">
              
              <div className="bg-[#0D0D0C] p-6 rounded-3xl border-2 border-white/5 text-center space-y-4 shadow-inner">
                <div className="mx-auto w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center text-2xl border-2 border-brand-red/10 animate-pulse-slow">
                  🍲
                </div>
                <div className="space-y-1">
                  <h4 className="font-display font-black text-white text-lg uppercase tracking-tight">
                    Order Together, Share the Love!
                  </h4>
                  <p className="text-gray-400 text-xs leading-relaxed max-w-sm mx-auto">
                    Hungry with friends or family? Start a Group Order! Generate a live QR code and shareable link. Everyone selects their customized dishes from their own tabs/devices, and you checkout altogether!
                  </p>
                </div>
              </div>

              {joinError && (
                <div className="bg-brand-red/15 border-2 border-brand-red/30 text-brand-red text-xs p-4 rounded-2xl flex items-start gap-2.5 font-bold">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-red" />
                  <span>{joinError}</span>
                </div>
              )}

              {/* Tabs for Action (Create vs Join) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Panel A: Start a Group Order */}
                <div className="bg-[#0D0D0C] p-5 rounded-3xl border-2 border-white/5 space-y-4 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-2 text-brand-gold">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-black tracking-widest">Host a New Group</span>
                  </div>
                  
                  <form onSubmit={handleCreateGroup} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">Your Host Nickname</label>
                      <input
                        type="text"
                        required
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        placeholder="e.g., Papa Chef"
                        className="w-full bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      Create Group Order
                    </button>
                  </form>
                </div>

                {/* Panel B: Join an Existing Group */}
                <div className="bg-[#0D0D0C] p-5 rounded-3xl border-2 border-white/5 space-y-4 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-2 text-blue-400">
                    <UserPlus className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-black tracking-widest">Join Existing Group</span>
                  </div>

                  <form onSubmit={handleJoinGroup} className="space-y-3">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">Group Code (e.g. GR-58F9)</label>
                        <input
                          type="text"
                          required
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                          placeholder="e.g., GR-ABCD"
                          className="w-full bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-mono font-bold tracking-widest text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">Your Nickname</label>
                        <input
                          type="text"
                          required
                          value={nicknameInput}
                          onChange={(e) => setNicknameInput(e.target.value)}
                          placeholder="e.g., Juan"
                          className="w-full bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-red font-semibold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      Join Session
                    </button>
                  </form>
                </div>

              </div>

              {/* Demo Hint */}
              <div className="p-4 bg-[#181818] rounded-2xl border border-white/5 text-[10px] text-gray-500 text-center leading-relaxed font-medium">
                💡 <strong>Local Sandbox Feature:</strong> You can open the copied link in a new incognito window or secondary browser tab to simulate another user in real-time, side-by-side!
              </div>

            </div>
          ) : (
            /* --- STATE 2: ACTIVE GROUP SESSION --- */
            <div className="space-y-6 animate-fade-in">
              
              {/* Session Core Stats & Status */}
              <div className="bg-[#0D0D0C] p-5 rounded-3xl border-2 border-white/5 space-y-4 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 bg-brand-gold/10 rounded-bl-3xl border-l border-b border-white/5 text-[10px] font-mono text-brand-gold font-bold">
                  CODE: {session.id}
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] bg-brand-red/10 text-brand-red font-black uppercase tracking-widest px-2 py-0.5 rounded">
                    {isCurrentUserHost ? '👑 Host Mode' : '👥 Member Mode'}
                  </span>
                  <h4 className="font-display font-black text-white text-lg tracking-tight mt-1.5 uppercase">
                    {session.hostName}'s Food Feast
                  </h4>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                    {session.members.length} members joined • {session.items.length} items in shared cart
                  </p>
                </div>

                {/* Invitation Elements (Link + QR Code) */}
                <div className="bg-[#181818] p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center gap-3">
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Scan or click to invite</span>
                  
                  {/* High Quality Real QR Code */}
                  <div className="w-44 h-44 bg-white p-2.5 rounded-2xl border border-white/10 shadow-lg relative flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`}
                      alt="Join QR Code"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="w-full space-y-2">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={joinUrl}
                        className="flex-1 bg-[#0D0D0C] border border-white/10 text-[10px] rounded-xl px-3 py-2 text-gray-400 truncate focus:outline-none font-semibold"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="p-2 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white transition-colors flex items-center justify-center"
                        title="Copy Join Link"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-gray-500 text-[9px] font-bold uppercase tracking-wider">
                      Share the QR/link with colleagues or scan on your device!
                    </p>
                  </div>
                </div>

                {/* Interaction Actions */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={onToggleReady}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 flex items-center justify-center gap-1.5 ${
                      isCurrentUserReady
                        ? 'bg-green-600/10 border-green-500/30 text-green-400 font-bold'
                        : 'bg-[#181818] border-white/10 text-gray-300 hover:border-brand-red hover:text-white'
                    }`}
                  >
                    {isCurrentUserReady ? '✓ I am Ready' : '🛎️ Mark as Ready'}
                  </button>

                  {!isCurrentUserHost ? (
                    <button
                      onClick={onLeaveSession}
                      className="px-3 py-2.5 rounded-xl bg-red-600/15 text-red-500 hover:bg-red-600 hover:text-white text-xs font-bold uppercase transition-all border border-red-500/20 flex items-center gap-1"
                      title="Leave Group Order"
                    >
                      <LogOut className="w-4 h-4" />
                      Leave
                    </button>
                  ) : (
                    <button
                      onClick={onCancelSession}
                      className="px-3 py-2.5 rounded-xl bg-red-600/15 text-red-500 hover:bg-red-600 hover:text-white text-xs font-bold uppercase transition-all border border-red-500/20 flex items-center gap-1"
                      title="End Group Order"
                    >
                      <Ban className="w-4 h-4" />
                      End Session
                    </button>
                  )}
                </div>

              </div>

              {/* Members Status Tracker */}
              <div className="space-y-2">
                <h5 className="text-[10px] text-gray-500 uppercase tracking-widest font-black flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-brand-gold" /> Member Activity ({session.members.length})
                </h5>

                <div className="grid grid-cols-2 gap-2">
                  {session.members.map(member => {
                    const isMe = member.id === currentUserId;
                    return (
                      <div 
                        key={member.id} 
                        className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-2 text-xs ${
                          member.isReady 
                            ? 'bg-green-500/5 border-green-500/20' 
                            : 'bg-[#0D0D0C] border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-base flex-shrink-0">{member.isHost ? '👑' : '🍽️'}</span>
                          <span className={`truncate font-bold text-white ${isMe ? 'text-brand-gold' : ''}`}>
                            {member.name} {isMe && '(You)'}
                          </span>
                        </div>

                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          member.isReady
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-[#181818] text-gray-500'
                        }`}>
                          {member.isReady ? 'Ready' : 'Choosing'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shared Cart Items grouped by Participant */}
              <div className="space-y-3">
                <h5 className="text-[10px] text-gray-500 uppercase tracking-widest font-black flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5 text-brand-red" /> Consolidated Bag breakdown
                </h5>

                {session.items.length === 0 ? (
                  <div className="text-center py-10 rounded-2xl border-2 border-dashed border-white/5 bg-[#0D0D0C] text-gray-500 text-xs font-medium">
                    🛒 The shared group bag is currently empty.<br />
                    Select dishes from the menu to fill your order!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.values(itemsByMember).map(({ member, items, total }) => {
                      if (items.length === 0) return null;
                      const isMe = member.id === currentUserId;
                      
                      return (
                        <div key={member.id} className="bg-[#0D0D0C] border-2 border-white/5 rounded-3xl p-4 space-y-3">
                          {/* Member header */}
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
                              <span className="text-xs font-black text-white">{member.name}'s Choice</span>
                            </div>
                            <span className="text-brand-gold font-mono font-bold text-xs">₱{total.toFixed(2)}</span>
                          </div>

                          {/* Member items */}
                          <div className="space-y-2.5">
                            {items.map(item => (
                              <div key={item.id} className="flex gap-2.5 text-xs items-start justify-between">
                                <div className="flex gap-2 min-w-0">
                                  <img 
                                    src={item.menuItem.image}
                                    alt={item.menuItem.name}
                                    className="w-10 h-10 object-cover rounded-xl border border-white/5 flex-shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="min-w-0">
                                    <h6 className="font-bold text-white leading-tight truncate">
                                      {item.menuItem.name}
                                    </h6>
                                    
                                    {item.selectedOptions.length > 0 && (
                                      <p className="text-[9px] text-brand-red font-medium mt-0.5">
                                        {item.selectedOptions.map(o => o.choice.name).join(', ')}
                                      </p>
                                    )}

                                    {item.specialInstructions && (
                                      <p className="text-[9px] text-brand-gold font-medium italic truncate max-w-[200px] mt-0.5">
                                        "{item.specialInstructions}"
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <span className="font-semibold text-white">₱{(item.totalUnitPrice * item.quantity).toFixed(2)}</span>
                                  
                                  {/* Item controls - allow if item is owned by current user */}
                                  {isMe ? (
                                    <div className="flex items-center bg-[#181818] rounded-md p-0.5 border border-white/10">
                                      <button
                                        onClick={() => onUpdateItemQuantity(item.id, -1)}
                                        className="p-0.5 rounded text-gray-400 hover:text-white transition-colors"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="w-5 text-center text-[10px] font-bold text-white">{item.quantity}</span>
                                      <button
                                        onClick={() => onUpdateItemQuantity(item.id, 1)}
                                        className="p-0.5 rounded text-gray-400 hover:text-white transition-colors"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => onRemoveItem(item.id)}
                                        className="p-0.5 rounded text-gray-500 hover:text-brand-red transition-colors ml-1.5"
                                        title="Remove Item"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Qty: {item.quantity}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer with checkout action for group orders */}
        {session && session.items.length > 0 && (
          <div className="p-5 bg-[#0D0D0C] border-t-2 border-white/5 space-y-4 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">Consolidated total</span>
                <span className="text-brand-gold font-display font-black text-xl leading-none">
                  ₱{grandTotal.toFixed(2)}
                </span>
              </div>

              {!isCurrentUserHost ? (
                <div className="text-right text-[10px] text-gray-400 leading-tight max-w-[200px] font-medium">
                  Waiting for Host <strong className="text-white">{session.hostName}</strong> to checkout the group order.
                </div>
              ) : (
                <button
                  onClick={onCheckout}
                  className="px-5 py-3 rounded-xl bg-brand-red hover:bg-brand-red-hover text-white font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 shadow-md hover:shadow-brand-red/20 transition-all"
                >
                  Checkout Together
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
