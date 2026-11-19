import React, { useEffect, useMemo } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
} from 'react-leaflet';
import {
  AlertTriangle,
  BadgeCheck,
  Bluetooth,
  Compass,
  CreditCard,
  GitCommitHorizontal,
  Lock,
  MessageSquare,
  Navigation,
  Pause,
  Play,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Users,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';
import type { PassengerSeatId } from '../types/smartpool';
import { interpolatePolyline } from '../utils/nlpAndGeo';
import { SEAT_LABELS } from '../utils/seatAllocator';
import {
  createEndpointIcon,
  createLiveVehicleIcon,
  createMeetingPointIcon,
  KarachiTileLayer,
  MapAutoResize,
} from './LeafletMapHelpers';

export const ActiveRideScreen: React.FC = () => {
  const {
    currentUser,
    activeBookedPool,
    passengerTransactions,
    proximityMismatch,
    setProximityMismatch,
    roadSnappingEnabled,
    setRoadSnappingEnabled,
    rideProgress,
    setRideProgress,
    isRideSimPlaying,
    setIsRideSimPlaying,
    openChatForPool,
    setPaymentModalOpen,
    releaseEscrowByReceipt,
    setSosOpen,
    setPassengerTab,
  } = useSmartPool();

  useEffect(() => {
    if (!isRideSimPlaying || !activeBookedPool) return;
    const timer = window.setInterval(() => {
      setRideProgress((prev) => (prev + 0.008 >= 0.98 ? 0.32 : prev + 0.008));
    }, 900);
    return () => window.clearInterval(timer);
  }, [isRideSimPlaying, activeBookedPool, setRideProgress]);

  const isFemalePool = activeBookedPool?.allowedGender === 'Female';
  const vehicleIcon = useMemo(
    () => createLiveVehicleIcon(Boolean(isFemalePool)),
    [isFemalePool]
  );
  const meetingIcon = useMemo(() => createMeetingPointIcon(), []);
  const originIcon = useMemo(() => createEndpointIcon('origin', 'A'), []);
  const destIcon = useMemo(() => createEndpointIcon('destination', 'B'), []);

  if (!currentUser) return null;

  if (!activeBookedPool) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
          <Navigation className="w-7 h-7 text-slate-400" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            No Active Pool Booked Yet
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
            Explore verified <strong>{currentUser.gender}-Only</strong> Karachi commuter
            pools to lock a seat, inspect street-corner pickups, and start live trip
            tracking.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPassengerTab('explore')}
          className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs inline-flex items-center gap-2 shadow cursor-pointer"
        >
          <Compass className="w-4 h-4" />
          Browse {currentUser.gender}-Only Pools
        </button>
      </div>
    );
  }

  const bleVerified = !proximityMismatch;
  const activePolyline = roadSnappingEnabled
    ? activeBookedPool.routePolyline
    : activeBookedPool.rawDriftingGps;
  const carPos = interpolatePolyline(activePolyline, rideProgress);
  const remainingFactor = Math.max(0.05, (1 - rideProgress) / 0.52);
  const etaMins = Math.max(1, Math.round(12 * remainingFactor));
  const remKm = Number((4.2 * remainingFactor).toFixed(1));

  const seatedRiders = (
    ['front-left', 'back-left', 'back-middle', 'back-right'] as PassengerSeatId[]
  )
    .map((seatId) => {
      const occ = activeBookedPool.cabin.seats[seatId];
      return occ ? { seatId, occ } : null;
    })
    .filter(Boolean) as {
    seatId: PassengerSeatId;
    occ: NonNullable<typeof activeBookedPool.cabin.seats['front-left']>;
  }[];

  const mySeatEntry = seatedRiders.find((r) => r.occ.userId === currentUser.id);
  const mySeatLabel = mySeatEntry
    ? SEAT_LABELS[mySeatEntry.seatId]
    : 'Passenger Co-Rider';
  const fareDue = mySeatEntry?.occ.fareShare ?? activeBookedPool.estimatedShare;

  const activePoolTx = passengerTransactions.find(
    (t) =>
      t.poolId === activeBookedPool.id &&
      (t.status === 'escrow_locked' ||
        t.status === 'cash_pending' ||
        t.status === 'released' ||
        t.status === 'cash_confirmed')
  );

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Top ETA & Live Trip Status Banner */}
      <div className="bg-gradient-to-r from-[#0A192F] via-[#0F172A] to-[#064E3B] rounded-3xl p-4 text-white shadow-lg space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9.5px] font-extrabold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live En Route
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border ${
                  isFemalePool
                    ? 'bg-pink-500/20 border-pink-300/40 text-pink-200'
                    : 'bg-sky-500/20 border-sky-300/40 text-sky-200'
                }`}
              >
                <Lock className="w-2.5 h-2.5" />
                {activeBookedPool.allowedGender}-Only Pool
              </span>
            </div>
            <h1 className="text-xl font-extrabold font-mono-num mt-1.5">
              {etaMins} Mins <span className="text-slate-500">|</span>{' '}
              <span className="text-emerald-400">{remKm} km</span>
            </h1>
            <p className="text-[11px] text-slate-300 mt-0.5">
              {activeBookedPool.origin} → {activeBookedPool.destination}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsRideSimPlaying((v) => !v)}
            aria-label={isRideSimPlaying ? 'Pause GPS simulation' : 'Play GPS simulation'}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center shrink-0 cursor-pointer"
          >
            {isRideSimPlaying ? (
              <Pause className="w-4 h-4 text-emerald-300" />
            ) : (
              <Play className="w-4 h-4 text-emerald-300" />
            )}
          </button>
        </div>

        {/* Driver & Vehicle Summary */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                isFemalePool
                  ? 'bg-pink-500/30 text-pink-100 border border-pink-300/40'
                  : 'bg-sky-500/30 text-sky-100 border border-sky-300/40'
              }`}
            >
              {activeBookedPool.driverInitials}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white flex items-center gap-1 truncate">
                {activeBookedPool.driverName}
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </p>
              <p className="text-[10px] text-slate-300 truncate">
                {activeBookedPool.vehicleModel} ·{' '}
                <span className="font-mono-num font-bold text-emerald-300">
                  {activeBookedPool.plateNumber}
                </span>
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] font-extrabold font-mono-num text-emerald-300">
              Trust {activeBookedPool.trustScore}%
            </span>
            <p className="text-[9.5px] text-slate-300">{mySeatLabel.split(' (')[0]}</p>
          </div>
        </div>
      </div>

      {/* Zero-API-Key Live Corridor Map */}
      <div className="rounded-3xl overflow-hidden border-2 border-slate-200 shadow-md bg-white">
        <div className="h-[235px] w-full">
          <MapContainer
            center={carPos}
            zoom={13}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <KarachiTileLayer />
            <MapAutoResize
              triggerKey={`ride-${activeBookedPool.id}-${roadSnappingEnabled}`}
            />

            <Polyline
              positions={activeBookedPool.routePolyline}
              pathOptions={{
                color: roadSnappingEnabled ? '#059669' : '#94A3B8',
                weight: roadSnappingEnabled ? 5 : 3,
              }}
            />

            {!roadSnappingEnabled && (
              <>
                <Polyline
                  positions={activeBookedPool.rawDriftingGps}
                  pathOptions={{
                    color: '#DC2626',
                    weight: 2.5,
                    dashArray: '5 5',
                  }}
                />
                {activeBookedPool.rawDriftingGps.map((pt, idx) => (
                  <CircleMarker
                    key={idx}
                    center={pt}
                    radius={4}
                    pathOptions={{
                      color: '#991B1B',
                      fillColor: '#F59E0B',
                      fillOpacity: 0.9,
                    }}
                  />
                ))}
              </>
            )}

            <Marker position={activeBookedPool.routePolyline[0]} icon={originIcon}>
              <Popup>Origin: {activeBookedPool.origin}</Popup>
            </Marker>
            <Marker
              position={
                activeBookedPool.routePolyline[
                  activeBookedPool.routePolyline.length - 1
                ]
              }
              icon={destIcon}
            >
              <Popup>Destination: {activeBookedPool.destination}</Popup>
            </Marker>
            <Marker
              position={activeBookedPool.meetingPoint.meetingCoords}
              icon={meetingIcon}
            >
              <Popup>
                Virtual Meeting Point: {activeBookedPool.meetingPoint.label} (
                {activeBookedPool.meetingPoint.walkMeters}m walk)
              </Popup>
            </Marker>
            <Marker position={carPos} icon={vehicleIcon}>
              <Popup>
                {activeBookedPool.driverName} · {activeBookedPool.plateNumber}
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 text-[11px]">
          <span className="font-bold text-slate-700 truncate">
            Pickup Corner: {activeBookedPool.meetingPoint.label}
          </span>
          <span className="font-mono-num font-extrabold text-emerald-700 shrink-0">
            {activeBookedPool.meetingPoint.walkMeters}m walk
          </span>
        </div>
      </div>

      {/* Anti-GPS-Spoofing Dual-Device BLE + OSRM Road-Map Snapping */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-900 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Anti-Spoofing Trip Verification
          </span>
          <span className="text-[10px] font-bold text-slate-400">Dual-Telemetry</span>
        </div>

        {/* BLE Proximity Handshake Toggle */}
        <div
          className={`rounded-2xl border p-3 flex items-center justify-between gap-2 ${
            bleVerified
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {bleVerified ? (
              <Bluetooth className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <div className="min-w-0">
              <p
                className={`text-xs font-extrabold ${
                  bleVerified ? 'text-emerald-950' : 'text-red-900'
                }`}
              >
                {bleVerified
                  ? 'BLE Cabin Handshake Verified (1.4m)'
                  : 'BLE Proximity Mismatch — Carbon & Fare Paused'}
              </p>
              <p className="text-[10px] text-slate-600 truncate">
                {bleVerified
                  ? 'Phone paired inside vehicle cabin (blocks fake GPS apps)'
                  : 'Devices >25m apart — re-enable Bluetooth proximity'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProximityMismatch(!proximityMismatch)}
            aria-label="Toggle BLE proximity verification"
            className={`w-11 h-6 rounded-full p-0.5 shrink-0 cursor-pointer transition-colors ${
              bleVerified ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                bleVerified ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Road-Map Snapping Toggle */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <GitCommitHorizontal className="w-4 h-4 text-slate-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-slate-900">
                Road-Map Snapping ({roadSnappingEnabled ? 'Clean Corridor' : 'Raw Jitter'})
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                Eliminates GPS signal drift so you never overpay for false mileage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRoadSnappingEnabled(!roadSnappingEnabled)}
            aria-label="Toggle road snapping"
            className={`w-11 h-6 rounded-full p-0.5 shrink-0 cursor-pointer transition-colors ${
              roadSnappingEnabled ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                roadSnappingEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Passenger Action Controls: Pay / Escrow Release, Peer Chat, SOS */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        {activePoolTx?.status === 'escrow_locked' ? (
          <div className="rounded-2xl bg-amber-50 border border-amber-300 p-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold text-amber-950">
                Escrow Locked: PKR {activePoolTx.amountPkr}
              </p>
              <p className="text-[10px] text-amber-800">
                Tap on safe arrival to release cost-share to publisher
              </p>
            </div>
            <button
              type="button"
              onClick={() => releaseEscrowByReceipt(activePoolTx.receiptNo)}
              className="shrink-0 px-3 py-2 rounded-xl bg-[#0A192F] text-emerald-300 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              Confirm Arrival
            </button>
          </div>
        ) : activePoolTx?.status === 'cash_pending' ? (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs font-extrabold text-amber-950">
              On-Cash Logged: PKR {activePoolTx.amountPkr} (Awaiting Publisher Handover)
            </p>
            <p className="text-[10.5px] text-amber-800 mt-0.5">
              Pay exact cash at drop-off. Only{' '}
              <strong>{activeBookedPool.driverName}</strong> can mark cash as received.
            </p>
          </div>
        ) : activePoolTx?.status === 'released' ||
          activePoolTx?.status === 'cash_confirmed' ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-emerald-950">
                Trip Cost-Share Settled (PKR {activePoolTx.amountPkr})
              </p>
              <p className="text-[10px] font-mono-num text-emerald-700">
                Receipt {activePoolTx.receiptNo}
              </p>
            </div>
            <BadgeCheck className="w-5 h-5 text-emerald-600" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPaymentModalOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            Settle Non-Profit Share (PKR {fareDue})
          </button>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => openChatForPool(activeBookedPool.id)}
            className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Chat Publisher
          </button>
          <button
            type="button"
            onClick={() => setSosOpen(true)}
            className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            Emergency SOS
          </button>
        </div>
      </div>

      {/* Verified Same-Gender Co-Riders Manifest */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-emerald-600" />
          Verified {activeBookedPool.allowedGender} Cabin Roster (
          {seatedRiders.length}/{activeBookedPool.cabin.maxPassengerSeats})
        </h3>
        {seatedRiders.map(({ seatId, occ }) => {
          const isMe = occ.userId === currentUser.id;
          return (
            <div
              key={seatId}
              className={`rounded-2xl border p-3 flex items-center justify-between gap-2 ${
                isMe
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                  {occ.name}
                  {isMe && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold">
                      YOU
                    </span>
                  )}
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </p>
                <p className="text-[10.5px] text-slate-500 truncate">
                  {SEAT_LABELS[seatId].split(' (')[0]}
                  {occ.segment ? ` · ${occ.segment}` : ''}
                </p>
              </div>
              <span className="text-[10.5px] font-extrabold font-mono-num text-emerald-800 shrink-0">
                KYC {occ.gender}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
