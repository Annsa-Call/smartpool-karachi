import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Leaf,
  Lock,
  Unlock,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';

export const PublisherEarningsScreen: React.FC = () => {
  const {
    currentUser,
    publisherTransactions,
    withdrawPublisherEarnings,
    confirmPublisherCash,
    releaseEscrowByReceipt,
    setReceiptModalTx,
  } = useSmartPool();

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(500);
  const [provider, setProvider] = useState<'easypaisa' | 'jazzcash'>('easypaisa');

  if (!currentUser) return null;

  const handleWithdraw = () => {
    const ok = withdrawPublisherEarnings(withdrawAmount, provider);
    if (ok) setWithdrawOpen(false);
  };

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Publisher Cost-Recovery Earnings Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0A192F] via-[#0F172A] to-[#064E3B] text-white p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-emerald-300">
              Publisher Cost-Recovery Balance
            </p>
            <h1 className="text-3xl font-extrabold font-mono-num mt-1">
              PKR {currentUser.publisherEarningsPkr.toLocaleString()}.00
            </h1>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-emerald-200">
            Zero Commission
          </span>
        </div>

        {currentUser.pendingPublisherEscrowPkr > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[11px] font-bold font-mono-num">
            <Lock className="w-3 h-3" />
            Escrow Pending Drop-Off: PKR {currentUser.pendingPublisherEscrowPkr}.00
          </div>
        )}

        <button
          type="button"
          onClick={() => setWithdrawOpen((o) => !o)}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0A192F] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
        >
          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          Withdraw Payout to Easypaisa / JazzCash
        </button>
      </div>

      {/* Withdraw Drawer */}
      {withdrawOpen && (
        <div className="bg-white rounded-3xl border-2 border-emerald-400 p-4 shadow-xs space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
              Transfer Publisher Earnings
            </h2>
            <button
              type="button"
              onClick={() => setWithdrawOpen(false)}
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
                onClick={() => setProvider(p)}
                className={`py-2 rounded-xl border-2 text-xs font-extrabold cursor-pointer ${
                  provider === p
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
            {[500, 1000, 1500].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setWithdrawAmount(amt)}
                className={`py-2 rounded-xl border text-xs font-extrabold font-mono-num cursor-pointer ${
                  withdrawAmount === amt
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
            onClick={handleWithdraw}
            className="w-full py-3 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-white font-extrabold text-xs cursor-pointer"
          >
            Confirm Transfer (PKR {withdrawAmount})
          </button>
        </div>
      )}

      {/* Publisher Eco-Driver CO2 Summary */}
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Leaf className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-emerald-950">
              Eco-Publisher Carbon Impact
            </p>
            <p className="text-[10.5px] text-emerald-800">
              {currentUser.co2SavedKg} kg CO2 prevented · {currentUser.poolsShared}{' '}
              shared trips
            </p>
          </div>
        </div>
        <span className="text-xs font-extrabold font-mono-num text-emerald-800">
          {currentUser.carbonCredits} Cr
        </span>
      </div>

      {/* Publisher Settlement & Cash Confirmation Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Co-Rider Settlements &amp; Payouts
          </h3>
          <span className="text-[10px] font-bold text-slate-400">Read-Only Audit</span>
        </div>

        {publisherTransactions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            No publisher settlements yet. Co-rider escrow releases &amp; cash confirmations
            appear here.
          </p>
        ) : (
          <div className="space-y-2.5">
            {publisherTransactions.map((tx) => {
              const isIn = tx.direction === 'credit';
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
                          tx.status === 'cash_pending'
                            ? 'bg-amber-100 text-amber-800'
                            : isIn
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isIn ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 truncate">
                          {tx.title}
                        </p>
                        <p className="text-[10.5px] text-slate-500">{tx.subtitle}</p>
                        <p className="text-[9.5px] font-mono-num text-slate-400 mt-0.5 flex items-center gap-1">
                          <FileText className="w-2.5 h-2.5" />
                          {tx.receiptNo}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-extrabold font-mono-num shrink-0 ${
                        isIn ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isIn ? '+' : '-'}Rs.{tx.amountPkr}
                    </span>
                  </div>

                  {tx.status === 'cash_pending' && (
                    <button
                      type="button"
                      onClick={() => confirmPublisherCash(tx.id)}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirm Cash Received (PKR {tx.amountPkr})
                    </button>
                  )}

                  {tx.status === 'escrow_locked' && (
                    <button
                      type="button"
                      onClick={() => releaseEscrowByReceipt(tx.receiptNo)}
                      className="w-full py-2 rounded-xl bg-[#0A192F] text-emerald-300 text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Confirm Drop-Off &amp; Claim Escrow
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
