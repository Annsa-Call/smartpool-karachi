import React, { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Lock, MapPin, Send, ShieldCheck, X } from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';

const PASSENGER_QUICK_REPLIES = [
  'Walking to the street-corner meeting pin now.',
  'Standing at the Virtual Meeting Point corner.',
  'Settling my exact cost-share via Easypaisa escrow.',
];

const PUBLISHER_QUICK_REPLIES = [
  'Approaching the street-corner pickup pin in 3 mins.',
  'Hazard lights on at the service-lane corner.',
  'Please keep Bluetooth on for cabin verification.',
];

export const ChatDrawer: React.FC = () => {
  const {
    currentUser,
    role,
    chatPool,
    closeChat,
    chatMessages,
    sendChatMessage,
  } = useSmartPool();

  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatPool) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatPool, chatMessages.length]);

  if (!chatPool || !currentUser) return null;

  const isFemale = chatPool.allowedGender === 'Female';
  const isPublisher =
    role === 'publisher' && chatPool.publisherId === currentUser.id;
  const quickReplies = isPublisher
    ? PUBLISHER_QUICK_REPLIES
    : PASSENGER_QUICK_REPLIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendChatMessage(chatPool.id, draft);
    setDraft('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[86vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-[#0A192F] text-white px-4 py-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold truncate">
                {isPublisher
                  ? `Pool Co-Riders (${chatPool.plateNumber})`
                  : chatPool.driverName}
              </span>
              <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                  isFemale
                    ? 'bg-pink-500/30 text-pink-200'
                    : 'bg-sky-500/30 text-sky-200'
                }`}
              >
                <Lock className="w-2.5 h-2.5" />
                {chatPool.allowedGender}-Only
              </span>
            </div>
            <p className="text-[10.5px] text-slate-300 truncate mt-0.5">
              {chatPool.origin} → {chatPool.destination} · Phone Masked (
              {chatPool.driverPhoneMasked})
            </p>
          </div>
          <button
            type="button"
            onClick={closeChat}
            aria-label="Close chat"
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meeting Point Strip */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between gap-2 text-[10.5px]">
          <span className="font-bold text-emerald-950 flex items-center gap-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            {chatPool.meetingPoint.label}
          </span>
          <span className="text-emerald-700 font-extrabold shrink-0 inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> E2E
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50">
          {chatMessages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="text-center text-[10px] font-bold text-slate-500 bg-slate-200/70 rounded-xl px-3 py-1.5 mx-auto max-w-xs"
                >
                  {msg.text}
                </div>
              );
            }
            const isMine = msg.senderUserId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[9.5px] font-bold text-slate-400 px-1 mb-0.5">
                  {isMine ? 'You' : msg.senderName} · {msg.timestamp}
                </span>
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                    isMine
                      ? 'bg-[#0A192F] text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Role-Scoped Quick Replies */}
        <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {quickReplies.map((qr) => (
            <button
              key={qr}
              type="button"
              onClick={() => sendChatMessage(chatPool.id, qr)}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer"
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Coordinate pickup corner or timing..."
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send message"
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer ${
              draft.trim()
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
