import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  MapPin,
  PhoneCall,
  Radio,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';

const EmergencySOSDialog: React.FC = () => {
  const {
    currentUser,
    role,
    activeBookedPool,
    selectedPool,
    activePublisherPool,
    setSosOpen,
    reportSosIncident,
  } = useSmartPool();

  const [countdown, setCountdown] = useState(3);
  const [dispatched, setDispatched] = useState(false);

  const activePool =
    role === 'publisher'
      ? activePublisherPool
      : activeBookedPool ?? selectedPool;

  useEffect(() => {
    if (dispatched) return;
    const timer = window.setTimeout(() => {
      if (countdown <= 1) {
        reportSosIncident('Live In-Cabin SOS Triggered', undefined, true);
        setDispatched(true);
        setCountdown(0);
      } else {
        setCountdown((c) => c - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, dispatched, reportSosIncident]);

  if (!currentUser) return null;

  const handleDispatchNow = () => {
    if (dispatched) return;
    reportSosIncident('Immediate SOS Button Pressed', undefined, true);
    setDispatched(true);
    setCountdown(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-red-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border-2 border-red-500 overflow-hidden animate-slide-up">
        <div className="bg-red-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider">
              Emergency SOS Protocol
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSosOpen(false)}
            aria-label="Close SOS modal"
            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!dispatched ? (
            <>
              <div className="text-center space-y-2">
                <div className="w-20 h-20 mx-auto rounded-full bg-red-100 border-4 border-red-500 flex items-center justify-center text-3xl font-extrabold font-mono-num text-red-700">
                  {countdown}
                </div>
                <p className="text-sm font-extrabold text-slate-900">
                  Broadcasting Live SOS in {countdown}s...
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Transmitting live GPS coordinates, vehicle plate{' '}
                  <strong className="font-mono-num">
                    {activePool?.plateNumber ?? 'ON-FILE'}
                  </strong>
                  , and NADRA KYC identity to Sindh Police Madadgar 15, Family WhatsApp,
                  and SmartPool System Control Unit.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSosOpen(false)}
                  className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs cursor-pointer"
                >
                  Cancel (Safe)
                </button>
                <button
                  type="button"
                  onClick={handleDispatchNow}
                  className="py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow cursor-pointer"
                >
                  Send Immediately
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-red-800 font-extrabold text-xs">
                  <Radio className="w-4 h-4 animate-pulse" />
                  Live SOS Packet Broadcasted &amp; Escrow Frozen
                </div>
                <p className="text-[11px] text-slate-700 flex items-center gap-1.5 font-mono-num">
                  <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  24.8655° N, 67.0710° E (Shahrah-e-Faisal)
                </p>
                <p className="text-[11px] text-slate-700">
                  Caller: <strong>{currentUser.fullName}</strong> (
                  {currentUser.kyc.kycId}) · Plate{' '}
                  <strong className="font-mono-num">
                    {activePool?.plateNumber ?? 'REGISTERED'}
                  </strong>
                </p>
              </div>

              <div className="space-y-1.5 text-xs">
                {[
                  'Sindh Police Madadgar 15 Live Packet Transmitted',
                  'Emergency Family WhatsApp Live Pin Shared',
                  'SmartPool System Control Unit Alerted (Priority 1)',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-emerald-800 font-bold text-[11px]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="tel:15"
                  className="py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Dial Police 15
                </a>
                <button
                  type="button"
                  onClick={() => setSosOpen(false)}
                  className="py-3 rounded-xl bg-slate-900 text-white font-extrabold text-xs cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const EmergencySOSModal: React.FC = () => {
  const { sosOpen, currentUser } = useSmartPool();
  if (!sosOpen || !currentUser) return null;
  return <EmergencySOSDialog />;
};
