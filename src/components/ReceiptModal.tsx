import React, { useState } from 'react';
import { Check, Copy, Database, Lock, ShieldCheck, X } from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';

export const ReceiptModal: React.FC = () => {
  const { receiptModalTx, setReceiptModalTx } = useSmartPool();
  const [copied, setCopied] = useState(false);

  if (!receiptModalTx) return null;

  const isSettled =
    receiptModalTx.status === 'released' ||
    receiptModalTx.status === 'cash_confirmed' ||
    receiptModalTx.status === 'topup' ||
    receiptModalTx.status === 'withdrawal';

  const fb = receiptModalTx.formulaBreakdown;

  const handleCopy = () => {
    navigator.clipboard?.writeText(
      `${receiptModalTx.receiptNo} | SHA256:${receiptModalTx.txHash}`
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#0A192F] text-white px-5 py-4 flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-300">
              <Database className="w-3 h-3" />
              Immutable PostgreSQL Receipt
            </span>
            <h2 className="text-sm font-extrabold font-mono-num mt-0.5">
              {receiptModalTx.receiptNo}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setReceiptModalTx(null)}
            aria-label="Close receipt"
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="p-5 space-y-3.5 text-xs">
          <div className="text-center pb-3 border-b border-dashed border-slate-200">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              {receiptModalTx.direction === 'credit'
                ? 'Verified Ledger Credit'
                : 'Verified Cost-Recovery Share'}
            </p>
            <p className="text-2xl font-extrabold font-mono-num text-slate-900 mt-0.5">
              PKR {receiptModalTx.amountPkr.toLocaleString()}.00
            </p>
            <span
              className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                isSettled
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              {receiptModalTx.status.replace('_', ' ')}
            </span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Description</span>
              <span className="font-bold text-slate-900 text-right">
                {receiptModalTx.title}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Gateway</span>
              <span className="font-bold uppercase text-slate-900 font-mono-num">
                {receiptModalTx.method}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Timestamp</span>
              <span className="font-mono-num font-semibold text-slate-800">
                {receiptModalTx.timestamp}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Role Scope</span>
              <span className="font-bold capitalize text-slate-800">
                {receiptModalTx.roleScope}
              </span>
            </div>
            {receiptModalTx.vehiclePlate && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Vehicle Plate</span>
                <span className="font-mono-num font-bold text-slate-900">
                  {receiptModalTx.vehiclePlate}
                </span>
              </div>
            )}
          </div>

          {/* Read-Only Formula & SHA-256 Audit Seal */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600" />
              Append-Only Audit Seal (UPDATE/DELETE Blocked)
            </p>
            {fb && (
              <p className="text-[10.5px] text-slate-600 font-mono-num">
                ({fb.distanceKm}km ÷ {fb.fuelEconomyKmL}km/L × Rs.{fb.fuelPricePerL})
                + Rs.{fb.maintenancePkr + fb.baseFeePkr} = Rs.{fb.totalTripCostPkr} ÷{' '}
                {fb.occupants} = Rs.{fb.passengerSharePkr}
              </p>
            )}
            <p className="text-[9.5px] font-mono-num text-slate-500 break-all pt-1 border-t border-slate-200">
              DIGEST: {receiptModalTx.txHash}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Receipt Digest Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Audit Receipt &amp; Digest
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
