import React from 'react';
import {
  Banknote,
  Compass,
  Navigation,
  PlusCircle,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';
import type { PassengerTab, PublisherTab } from '../types/smartpool';

export const BottomNav: React.FC = () => {
  const {
    role,
    passengerTab,
    setPassengerTab,
    publisherTab,
    setPublisherTab,
    activeBookedPool,
    publisherRequests,
    publisherTransactions,
    proximityMismatch,
  } = useSmartPool();

  // =========================================================================
  // PUBLISHER MODE NAVIGATION — Only Publisher-relevant features
  // =========================================================================
  if (role === 'publisher') {
    const pendingReqCount = publisherRequests.filter(
      (r) => r.status === 'pending'
    ).length;
    const pendingCashCount = publisherTransactions.filter(
      (t) => t.status === 'cash_pending'
    ).length;

    const pubTabs: {
      id: PublisherTab;
      label: string;
      icon: React.FC<{ className?: string }>;
      badge?: number;
    }[] = [
      { id: 'publish', label: 'Publish', icon: PlusCircle },
      { id: 'requests', label: 'Requests', icon: Users, badge: pendingReqCount },
      { id: 'drive', label: 'Drive Live', icon: Navigation },
      { id: 'earnings', label: 'Earnings', icon: Banknote, badge: pendingCashCount },
      { id: 'profile', label: 'Profile', icon: UserCheck },
    ];

    return (
      <nav
        aria-label="Publisher Navigation"
        className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1.5 pt-1.5 pb-safe shadow-[0_-8px_24px_-8px_rgba(10,25,47,0.12)]"
      >
        <div className="grid grid-cols-5 gap-0.5">
          {pubTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = publisherTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPublisherTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0A192F] text-emerald-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-[18px] h-[18px] ${
                      isActive ? 'stroke-[2.4]' : 'stroke-[1.9]'
                    }`}
                  />
                  {tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-emerald-500 text-[#0A192F] text-[9px] font-extrabold flex items-center justify-center tabular-nums">
                      {tab.badge}
                    </span>
                  ) : null}
                </div>
                <span
                  className={`mt-0.5 text-[10px] leading-tight truncate max-w-full ${
                    isActive ? 'font-bold text-white' : 'font-medium'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // =========================================================================
  // PASSENGER MODE NAVIGATION — Only Commuter/Passenger features
  // =========================================================================
  const paxTabs: {
    id: PassengerTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    dot?: 'emerald' | 'red';
  }[] = [
    { id: 'explore', label: 'Find Pool', icon: Compass },
    {
      id: 'ride',
      label: 'My Ride',
      icon: Navigation,
      dot: activeBookedPool
        ? proximityMismatch
          ? 'red'
          : 'emerald'
        : undefined,
    },
    { id: 'wallet', label: 'Wallet & CO2', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: UserCheck },
  ];

  return (
    <nav
      aria-label="Passenger Navigation"
      className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-1.5 pb-safe shadow-[0_-8px_24px_-8px_rgba(10,25,47,0.12)]"
    >
      <div className="grid grid-cols-4 gap-1">
        {paxTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = passengerTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPassengerTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0A192F] text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-[19px] h-[19px] ${
                    isActive ? 'stroke-[2.4]' : 'stroke-[1.9]'
                  }`}
                />
                {tab.dot && (
                  <span
                    className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full border border-white ${
                      tab.dot === 'red' ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                  />
                )}
              </div>
              <span
                className={`mt-0.5 text-[10px] leading-tight truncate max-w-full ${
                  isActive ? 'font-bold text-white' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
