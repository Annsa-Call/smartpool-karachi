import React from 'react';
import {
  AlertOctagon,
  BadgeCheck,
  Car,
  Lock,
  MessageSquare,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';

export const AppHeader: React.FC = () => {
  const {
    currentUser,
    role,
    switchUserMode,
    activeBookedPool,
    activePublisherPool,
    openChatForPool,
    setSosOpen,
  } = useSmartPool();

  if (!currentUser) return null;

  const isPublisher = role === 'publisher';
  const relevantChatPool = isPublisher ? activePublisherPool : activeBookedPool;
  const hasActiveTrip = Boolean(relevantChatPool);
  const isFemale = currentUser.gender === 'Female';

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-[#0A192F] via-[#0F172A] to-[#0A2538] text-white px-4 pt-3 pb-2.5 shadow-md border-b border-white/10">
      {/* Top Row: Brand + Verified User | Chat + SOS (when on a ride) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
            <Car className="w-5 h-5 text-[#0A192F] stroke-[2.4]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[15px] tracking-tight text-white">
                Smart<span className="text-emerald-400">Pool</span>
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full border ${
                  isFemale
                    ? 'bg-pink-500/20 text-pink-200 border-pink-400/40'
                    : 'bg-sky-500/20 text-sky-200 border-sky-400/40'
                }`}
                title="Gender locked by verified NADRA CNIC KYC"
              >
                <Lock className="w-2.5 h-2.5" />
                {currentUser.gender} KYC
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-300 truncate">
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{currentUser.fullName}</span>
            </div>
          </div>
        </div>

        {/* Right Contextual Actions: Only show Chat & SOS when user has an active ride/pool */}
        <div className="flex items-center gap-1.5 shrink-0">
          {relevantChatPool && (
            <button
              type="button"
              onClick={() => openChatForPool(relevantChatPool.id)}
              aria-label="Open Active Pool Chat"
              title="Encrypted Pool Chat"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-300" />
            </button>
          )}

          {hasActiveTrip && (
            <button
              type="button"
              onClick={() => setSosOpen(true)}
              title="Emergency Assistance & Live GPS SOS"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-red-600/30 border border-red-400/50 transition-transform active:scale-95 cursor-pointer"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              SOS
            </button>
          )}
        </div>
      </div>

      {/* Clean Role Switcher: Commuter (Passenger) vs Ride Publisher */}
      <div className="mt-2.5 grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-white/8 border border-white/10">
        <button
          type="button"
          onClick={() => switchUserMode('passenger')}
          className={`py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
            !isPublisher
              ? 'bg-emerald-500 text-[#0A192F] shadow-xs'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          Passenger Mode
        </button>
        <button
          type="button"
          onClick={() => switchUserMode('publisher')}
          className={`py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
            isPublisher
              ? 'bg-emerald-500 text-[#0A192F] shadow-xs'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          Publisher Mode
        </button>
      </div>
    </header>
  );
};
