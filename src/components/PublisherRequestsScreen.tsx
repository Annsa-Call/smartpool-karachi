import React from 'react';
import {
  BadgeCheck,
  Check,
  Lock,
  PlusCircle,
  Users,
  X,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';
import { CarCabinVisualizer } from './CarCabinVisualizer';

export const PublisherRequestsScreen: React.FC = () => {
  const {
    currentUser,
    publisherPools,
    activePublisherPool,
    selectPublisherPool,
    publisherRequests,
    decidePublisherRequest,
    vacatePublisherSeat,
    setPublisherTab,
  } = useSmartPool();

  if (!currentUser) return null;

  if (!activePublisherPool) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
          <Users className="w-7 h-7 text-slate-400" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            No Active Pool Published Yet
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Publish a scheduled Karachi route to manage your 2D cabin seats and approve
            verified {currentUser.gender} commuters.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPublisherTab('publish')}
          className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs inline-flex items-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Publish a {currentUser.gender}-Only Pool
        </button>
      </div>
    );
  }

  const isFemale = currentUser.gender === 'Female';
  const poolRequests = publisherRequests.filter(
    (r) => r.poolId === activePublisherPool.id
  );
  const pendingCount = poolRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Pool Selector if Publisher has multiple listings */}
      {publisherPools.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {publisherPools.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPublisherPool(p.id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer ${
                activePublisherPool.id === p.id
                  ? 'bg-[#0A192F] text-emerald-300 border-[#0A192F]'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {p.origin} → {p.destination} ({p.departureTime})
            </button>
          ))}
        </div>
      )}

      {/* Incoming KYC-Verified Same-Gender Rider Queue */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border ${
                isFemale
                  ? 'bg-pink-100 border-pink-300 text-pink-800'
                  : 'bg-sky-100 border-sky-300 text-sky-800'
              }`}
            >
              <Lock className="w-2.5 h-2.5" />
              Verified {currentUser.gender} Requests Only
            </span>
            <h2 className="text-sm font-extrabold text-slate-900 mt-1">
              Incoming Seat Requests ({pendingCount} Pending)
            </h2>
          </div>
        </div>

        {poolRequests.length === 0 ? (
          <p className="text-xs text-slate-500 bg-slate-50 rounded-2xl p-3.5 text-center border border-slate-200/70">
            No pending manual requests for this listing yet. Verified{' '}
            <strong>{currentUser.gender}</strong> commuters on your corridor can discover
            and book open seats below.
          </p>
        ) : (
          <div className="space-y-2.5">
            {poolRequests.map((req) => (
              <div
                key={req.id}
                className={`rounded-2xl border p-3 transition-all ${
                  req.status === 'pending'
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-white border-slate-100 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-900">
                        {req.name}
                      </span>
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold ${
                          isFemale
                            ? 'bg-pink-100 text-pink-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        KYC {req.gender}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 font-mono-num">
                        Trust {req.trustScore}%
                      </span>
                    </div>
                    <p className="text-[10px] font-mono-num text-slate-500 mt-0.5">
                      CNIC {req.cnicMasked} · {req.requestedAt}
                    </p>
                    <p className="text-[11px] text-slate-700 mt-1 font-medium">
                      Pin: {req.pickupCorner}
                    </p>
                    <p className="text-[10.5px] text-slate-500">
                      Drop: {req.dropoff} · +{req.detourMins}m · Share Rs.{' '}
                      {req.fareShare}
                    </p>
                  </div>

                  {req.status === 'pending' ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => decidePublisherRequest(req.id, 'rejected')}
                        aria-label={`Decline ${req.name}`}
                        className="w-8 h-8 rounded-xl bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => decidePublisherRequest(req.id, 'accepted')}
                        className="px-2.5 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase ${
                        req.status === 'accepted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {req.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publisher Live 2D Car Cabin Management */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            Live 2D Cabin Seat Allocation
          </h3>
          <p className="text-[11px] text-slate-500">
            {activePublisherPool.origin} → {activePublisherPool.destination} ·{' '}
            {activePublisherPool.plateNumber}. Tap × on a seat to release it.
          </p>
        </div>

        <CarCabinVisualizer
          cabin={activePublisherPool.cabin}
          onPublisherVacateSeat={(seatId) =>
            vacatePublisherSeat(activePublisherPool.id, seatId)
          }
        />
      </div>
    </div>
  );
};
