import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Car,
  CheckCircle2,
  Clock,
  FileText,
  Gift,
  Leaf,
  Lock,
  Plus,
  Unlock,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';

export const WalletImpactScreen: React.FC = () => {
  const {
    currentUser,
    passengerTransactions,
    vouchers,
    topUpPassengerWallet,
    releaseEscrowByReceipt,
    redeemVoucher,
    setReceiptModalTx,
  } = useSmartPool();

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(1000);
  const [topUpProvider, setTopUpProvider] = useState<'easypaisa' | 'jazzcash'>(
    'easypaisa'
  );

  // Interactive Non-Profit Fare Transparency Calculator
  const [calcKm, setCalcKm] = useState(16.8);
  const [calcKmL, setCalcKmL] = useState(14);
  const [calcRiders, setCalcRiders] = useState(3);

  if (!currentUser) return null;

  const fuelPrice = 265;
  const calcFuelCost = Math.round((calcKm / Math.max(5, calcKmL)) * fuelPrice);
  const calcWearCost = Math.round(calcKm * 6);
  const calcBase = 30;
  const calcTotal = calcFuelCost + calcWearCost + calcBase;
  const calcPerOccupant = Math.round(calcTotal / Math.max(2, calcRiders + 1));

  // Green Carbon Visual Comparison: 4 solo cars vs 1 pooled car
  const soloTripCo2Kg = Number((calcKm * 0.192).toFixed(2));
  const fourCarsCo2Kg = Number((soloTripCo2Kg * 4).toFixed(2));
  const perPersonPoolCo2Kg = Number((soloTripCo2Kg / 4).toFixed(2));

  const handleTopUp = () => {
    topUpPassengerWallet(topUpAmount, topUpProvider);
    setTopUpOpen(false);
  };

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Commuter Digital Wallet Balance Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0A192F] via-[#0F172A] to-[#064E3B] text-white p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-emerald-300">
              SmartPool Commuter Wallet
            </p>
            <h1 className="text-3xl font-extrabold font-mono-num mt-1">
              PKR {currentUser.walletBalancePkr.toLocaleString()}.00
            </h1>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-emerald-200">
            Non-Profit Cost-Share
          </span>
        </div>

        {currentUser.escrowHeldPkr > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[11px] font-bold font-mono-num">
            <Lock className="w-3 h-3" />
            In Trip Escrow: PKR {currentUser.escrowHeldPkr}.00
          </div>
        )}

        <button
          type="button"
          onClick={() => setTopUpOpen((o) => !o)}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0A192F] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Add Funds via Easypaisa / JazzCash
        </button>
      </div>

      {/* Add Funds Drawer */}
      {topUpOpen && (
        <div className="bg-white rounded-3xl border-2 border-emerald-400 p-4 shadow-xs space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Instant Mobile Wallet Top-Up
            </h2>
            <button
              type="button"
              onClick={() => setTopUpOpen(false)}
              className="text-[11px] font-bold text-slate-400 cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['easypaisa', 'jazzcash'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTopUpProvider(p)}
                className={`py-2.5 rounded-xl border-2 text-xs font-extrabold cursor-pointer ${
                  topUpProvider === p
                    ? p === 'easypaisa'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-red-50 border-red-500 text-red-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {p === 'easypaisa' ? 'Easypaisa' : 'JazzCash'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[500, 1000, 2500].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setTopUpAmount(amt)}
                className={`py-2 rounded-xl border text-xs font-extrabold font-mono-num cursor-pointer ${
                  topUpAmount === amt
                    ? 'bg-[#0A192F] text-emerald-300 border-[#0A192F]'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Rs. {amt}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleTopUp}
            className="w-full py-3 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-white font-extrabold text-xs cursor-pointer"
          >
            Confirm Top-Up (PKR {topUpAmount.toLocaleString()})
          </button>
        </div>
      )}

      {/* Non-Profit Cost-Recovery Transparency Calculator */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-emerald-600" />
            Non-Profit Cost-Split Calculator
          </h2>
          <span className="text-[10px] font-mono-num font-bold text-emerald-700">
            0% Surge · 0% Profit
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-600">
              <span>Snapped Corridor Distance</span>
              <span className="font-mono-num text-slate-900">{calcKm} km</span>
            </div>
            <input
              type="range"
              min="5"
              max="35"
              step="0.5"
              value={calcKm}
              onChange={(e) => setCalcKm(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Car Economy (km/L)
              </label>
              <select
                value={calcKmL}
                onChange={(e) => setCalcKmL(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold font-mono-num text-slate-900"
              >
                <option value={12}>12 km/L (1500cc)</option>
                <option value={14}>14 km/L (1300cc)</option>
                <option value={18}>18 km/L (660cc)</option>
                <option value={22}>22 km/L (Hybrid)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Co-Riders Sharing
              </label>
              <select
                value={calcRiders}
                onChange={(e) => setCalcRiders(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold font-mono-num text-slate-900"
              >
                <option value={1}>1 Rider (+ Driver)</option>
                <option value={2}>2 Riders (+ Driver)</option>
                <option value={3}>3 Riders (+ Driver)</option>
                <option value={4}>4 Riders (+ Driver)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
          <div className="text-[10.5px] text-slate-600 font-mono-num">
            <p>
              Fuel Rs.{calcFuelCost} + Wear Rs.{calcWearCost} + Base Rs.{calcBase}
            </p>
            <p className="font-bold text-slate-800">
              Total Rs.{calcTotal} ÷ {calcRiders + 1} occupants
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-extrabold font-mono-num text-emerald-700">
              Rs. {calcPerOccupant}
            </p>
            <p className="text-[9.5px] text-slate-500">your fair share</p>
          </div>
        </div>
      </div>

      {/* Green Carbon Savings & 4-Cars vs 1-Pool Visual Comparison */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Leaf className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-xs font-extrabold text-slate-900">
                Karachi Smog Reduction Impact
              </h2>
              <p className="text-[10.5px] text-slate-500">
                {currentUser.co2SavedKg} kg CO2 saved · Rs.{' '}
                {currentUser.fuelSavedPkr.toLocaleString()} saved
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-extrabold font-mono-num">
            {currentUser.carbonCredits} Credits
          </span>
        </div>

        {/* 4 Solo Cars vs 1 SmartPool Comparison */}
        <div className="space-y-2 pt-1">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10.5px] font-bold">
              <span className="text-red-700 flex items-center gap-1">
                <Car className="w-3 h-3" /> 4 Solo Cars ({calcKm} km)
              </span>
              <span className="font-mono-num text-red-700">{fourCarsCo2Kg} kg CO2</span>
            </div>
            <div className="h-2.5 rounded-full bg-red-100 overflow-hidden">
              <div className="h-full w-full bg-red-500 rounded-full" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10.5px] font-bold">
              <span className="text-emerald-800 flex items-center gap-1">
                <Leaf className="w-3 h-3" /> 1 SmartPool (75% Smog Cut)
              </span>
              <span className="font-mono-num text-emerald-700">
                {soloTripCo2Kg} kg total ({perPersonPoolCo2Kg} kg/rider)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-emerald-100 overflow-hidden">
              <div className="h-full w-1/4 bg-emerald-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Carbon Credit Reward Marketplace (Per-User Redeemed Code Isolation) */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1">
            <Gift className="w-3.5 h-3.5 text-emerald-600" />
            Green Carbon Credit Marketplace
          </p>
          {vouchers.map((v) => {
            const redeemedCode = v.redeemedByUserIds[currentUser.id];
            const canAfford = currentUser.carbonCredits >= v.costCredits;
            return (
              <div
                key={v.id}
                className="rounded-2xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-extrabold text-slate-900">
                      {v.partner}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9.5px] font-extrabold font-mono-num">
                      {v.costCredits} Cr · {v.valueTag}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 truncate">
                    {v.title}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{v.description}</p>
                </div>

                {redeemedCode ? (
                  <span className="shrink-0 px-2.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-extrabold font-mono-num inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {redeemedCode}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => redeemVoucher(v.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-[10.5px] font-extrabold cursor-pointer ${
                      canAfford
                        ? 'bg-[#0A192F] hover:bg-slate-800 text-emerald-300'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Redeem
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Passenger Read-Only Audit Receipts (Zero Publisher Cash Controls Exposed) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Immutable Commuter Receipts
          </h3>
          <span className="text-[10px] font-bold text-slate-400">PostgreSQL Audit</span>
        </div>

        {passengerTransactions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            No passenger wallet transactions yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {passengerTransactions.map((tx) => {
              const isCredit = tx.direction === 'credit';
              return (
                <div
                  key={tx.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2"
                >
                  <div
                    onClick={() => setReceiptModalTx(tx)}
                    className="flex items-start justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.status === 'cash_pending' || tx.status === 'escrow_locked'
                            ? 'bg-amber-100 text-amber-800'
                            : isCredit
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 truncate">
                          {tx.title}
                        </p>
                        <p className="text-[10.5px] text-slate-500 truncate">
                          {tx.subtitle}
                        </p>
                        <p className="text-[9.5px] font-mono-num text-slate-400 mt-0.5 flex items-center gap-1">
                          <FileText className="w-2.5 h-2.5" />
                          {tx.receiptNo} · Tap for audit receipt
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-extrabold font-mono-num shrink-0 ${
                        isCredit ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isCredit ? '+' : '-'}Rs.{tx.amountPkr}
                    </span>
                  </div>

                  {tx.status === 'cash_pending' && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1.5 flex items-center gap-1.5 text-[10.5px] font-bold text-amber-900">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      Awaiting publisher confirmation of cash handover
                    </div>
                  )}

                  {tx.status === 'escrow_locked' && (
                    <button
                      type="button"
                      onClick={() => releaseEscrowByReceipt(tx.receiptNo)}
                      className="w-full py-2 rounded-xl bg-[#0A192F] text-emerald-300 text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Confirm Safe Arrival &amp; Release Escrow
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
