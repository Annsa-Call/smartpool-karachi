import React, { useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';
import type { PaymentMethod } from '../types/smartpool';

export const FarePaymentModal: React.FC = () => {
  const {
    currentUser,
    paymentModalOpen,
    setPaymentModalOpen,
    activeBookedPool,
    selectedPool,
    executeFarePayment,
    setReceiptModalTx,
  } = useSmartPool();

  const [method, setMethod] = useState<PaymentMethod>('easypaisa');
  const [mpin, setMpin] = useState('4821');
  const [processing, setProcessing] = useState(false);

  const pool = activeBookedPool ?? selectedPool;
  if (!paymentModalOpen || !pool || !currentUser) return null;

  const occupants = Math.max(
    2,
    Object.values(pool.cabin.seats).filter(Boolean).length + 1
  );
  const fuelCostPkr = Math.round(
    (pool.distanceKm / pool.fuelEconomyKmL) * pool.fuelPricePerL
  );
  const maintenancePkr = Math.round(pool.distanceKm * 6);
  const baseFeePkr = 30;
  const totalTripCostPkr = fuelCostPkr + maintenancePkr + baseFeePkr;
  const passengerSharePkr = Math.round(totalTripCostPkr / occupants);

  const requiresPin = method === 'easypaisa' || method === 'jazzcash';

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    window.setTimeout(() => {
      const tx = executeFarePayment({
        method,
        distanceKm: pool.distanceKm,
        fuelEconomyKmL: pool.fuelEconomyKmL,
        fuelPricePerL: pool.fuelPricePerL,
        maintenancePkr,
        baseFeePkr,
        totalTripCostPkr,
        occupants,
        passengerSharePkr,
      });
      setProcessing(false);
      if (tx) {
        setPaymentModalOpen(false);
        setReceiptModalTx(tx);
      }
    }, 320);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <form
        onSubmit={handlePay}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-[#0A192F] text-white px-5 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
              Non-Profit Cost-Recovery Checkout
            </span>
            <h2 className="text-base font-extrabold mt-0.5">
              {pool.origin} → {pool.destination}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setPaymentModalOpen(false)}
            aria-label="Close payment modal"
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Transparent Cost-Recovery Formula Breakdown */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>
                Fuel ({pool.distanceKm}km ÷ {pool.fuelEconomyKmL}km/L × Rs.
                {pool.fuelPricePerL})
              </span>
              <span className="font-mono-num font-bold text-slate-900">
                Rs. {fuelCostPkr}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tyre &amp; Maintenance + Corridor Base</span>
              <span className="font-mono-num font-bold text-slate-900">
                Rs. {maintenancePkr + baseFeePkr}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Trip Cost ÷ {occupants} Occupants (0% Surge)</span>
              <span className="font-mono-num font-bold text-slate-700">
                Rs. {totalTripCostPkr}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="font-extrabold text-slate-900">
                Your Verified Cost-Share
              </span>
              <span className="text-lg font-extrabold font-mono-num text-emerald-700">
                PKR {passengerSharePkr}.00
              </span>
            </div>
          </div>

          {/* Pakistani Payment Gateway Selector */}
          <div className="space-y-2">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
              Select Payment Method (Wallet Bal: PKR{' '}
              {currentUser.walletBalancePkr.toLocaleString()})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    id: 'easypaisa',
                    label: 'Easypaisa',
                    sub: 'Escrow Hold',
                    icon: Smartphone,
                  },
                  {
                    id: 'jazzcash',
                    label: 'JazzCash',
                    sub: 'Escrow Hold',
                    icon: Smartphone,
                  },
                  {
                    id: 'cash',
                    label: 'On-Cash',
                    sub: 'Handover',
                    icon: Banknote,
                  },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = method === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMethod(opt.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-4 h-4 text-emerald-600" />
                      {active && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs font-extrabold mt-1.5">{opt.label}</p>
                    <p className="text-[10px] text-slate-500">{opt.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Wallet MPIN */}
          {requiresPin && (
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                {method === 'easypaisa' ? 'Easypaisa' : 'JazzCash'} 4-Digit MPIN (
                {currentUser.phone})
              </label>
              <input
                type="password"
                maxLength={4}
                value={mpin}
                onChange={(e) =>
                  setMpin(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-mono-num font-bold tracking-[0.3em] text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Escrow / Cash Explanation */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 flex items-start gap-2 text-[10.5px] text-slate-600">
            {method === 'cash' ? (
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <span>
              {method === 'cash'
                ? `Logs an immutable On-Cash receipt. Hand PKR ${passengerSharePkr} to ${pool.driverName} at drop-off; the publisher confirms receipt on their app.`
                : `Funds are locked in digital escrow and auto-released to ${pool.driverName} upon verified GPS drop-off. Immutable PostgreSQL audit receipt generated.`}
            </span>
          </div>

          <button
            type="submit"
            disabled={processing || (requiresPin && mpin.length < 4)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
          >
            {processing
              ? 'Sealing PostgreSQL Receipt...'
              : method === 'cash'
              ? `Log On-Cash Handover (PKR ${passengerSharePkr})`
              : `Authorize Escrow (PKR ${passengerSharePkr})`}
          </button>
        </div>
      </form>
    </div>
  );
};
