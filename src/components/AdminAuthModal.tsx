import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';

const AdminAuthDialog: React.FC = () => {
  const { closeAdminAuthModal, unlockAdminPanel } = useSmartPool();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const isLockedOut = failedAttempts >= 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    if (!password.trim()) {
      setError('Please enter the 6-digit administrator password.');
      return;
    }

    const ok = unlockAdminPanel(password);
    if (!ok) {
      const nextCount = failedAttempts + 1;
      setFailedAttempts(nextCount);
      setPassword('');
      setError(
        nextCount >= 5
          ? 'Too many failed attempts. Close and reopen dialog to retry.'
          : `Invalid administrator password (${5 - nextCount} attempts remaining).`
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={closeAdminAuthModal}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-fade-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0A192F] via-[#0F172A] to-[#082F2E] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">
                Admin Control Unit
              </h2>
              <p className="text-[10.5px] text-slate-300">
                Restricted System Governance Access
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAdminAuthModal}
            aria-label="Close Admin Login"
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-snug">
              Authorized SmartPool Karachi administrators only. Enter your administrator
              access password to inspect KYC queues, disputes, and city analytics.
            </p>
          </div>

          <div>
            <label
              htmlFor="sp-admin-password"
              className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5"
            >
              Administrator Password
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                id="sp-admin-password"
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                autoFocus
                disabled={isLockedOut}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter admin password"
                className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 bg-slate-50 text-sm font-bold font-mono-num text-slate-900 focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-300 px-3 py-2 flex items-start gap-2 text-xs font-bold text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={closeAdminAuthModal}
              className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLockedOut}
              className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-xs shadow-md cursor-pointer disabled:opacity-50"
            >
              Unlock Console
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AdminAuthModal: React.FC = () => {
  const { adminAuthModalOpen } = useSmartPool();
  if (!adminAuthModalOpen) return null;
  return <AdminAuthDialog />;
};
