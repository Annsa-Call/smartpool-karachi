import React, { useEffect, useMemo } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
} from 'react-leaflet';
import {
  Bluetooth,
  CheckCircle2,
  GitCommitHorizontal,
  MessageSquare,
  Navigation,
  Pause,
  Play,
  PlusCircle,
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

export const PublisherDriveScreen: React.FC = () => {
  const {
    currentUser,
    activePublisherPool,
    proximityMismatch,
    setProximityMismatch,
    roadSnappingEnabled,
    setRoadSnappingEnabled,
    rideProgress,
    setRideProgress,
    isRideSimPlaying,
    setIsRideSimPlaying,
    openChatForPool,
    setSosOpen,
    publisherTransactions,
    releaseEscrowByReceipt,
    confirmPublisherCash,
    setPublisherTab,
  } = useSmartPool();

  useEffect(() => {
    if (!isRideSimPlaying || !activePublisherPool) return;
    const t = window.setInterval(() => {
      setRideProgress((prev) => (prev + 0.008 >= 0.98 ? 0.35 : prev + 0.008));
    }, 900);
    return () => window.clearInterval(t);
  }, [isRideSimPlaying, activePublisherPool, setRideProgress]);

  const vehicleIcon = useMemo(
    () => createLiveVehicleIcon(currentUser?.gender === 'Female'),
    [currentUser?.gender]
  );
  const meetingIcon = useMemo(() => createMeetingPointIcon(), []);
  const originIcon = useMemo(() => createEndpointIcon('origin', 'A'), []);
  const destIcon = useMemo(() => createEndpointIcon('destination', 'B'), []);

  if (!currentUser) return null;

  if (!activePublisherPool) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
          <Navigation className="w-7 h-7 text-slate-400" />
        </div>
        <h2 className="text-base font-extrabold text-slate-900">
          No Active Scheduled Drive
        </h2>
        <p className="text-xs text-slate-500">
          Publish your Karachi commute route first to start live corridor navigation.
        </p>
        <button
          type="button"
          onClick={() => setPublisherTab('publish')}
          className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-extrabold text-xs inline-flex items-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Offer a Pool
        </button>
      </div>
    );
  }

  const carPos = interpolatePolyline(
    roadSnappingEnabled
      ? activePublisherPool.routePolyline
      : activePublisherPool.rawDriftingGps,
    rideProgress
  );
  const remFactor = Math.max(0.05, (1 - rideProgress) / 0.52);
  const etaMins = Math.max(1, Math.round(12 * remFactor));
  const remKm = Number((4.2 * remFactor).toFixed(1));

  const seatedPassengers = (
    ['front-left', 'back-left', 'back-middle', 'back-right'] as PassengerSeatId[]
  )
    .map((seatId) => {
      const occ = activePublisherPool.cabin.seats[seatId];
      return occ ? { seatId, occ } : null;
    })
    .filter(Boolean) as {
    seatId: PassengerSeatId;
    occ: NonNullable<typeof activePublisherPool.cabin.seats['front-left']>;
  }[];

  const unsettledPoolTxs = publisherTransactions.filter(
    (t) => t.status === 'cash_pending' || t.status === 'escrow_locked'
  );

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Publisher Live Navigation Header */}
      <div className="bg-gradient-to-r from-[#0A192F] to-[#0D2A42] rounded-3xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
              Publisher Drive Console · {activePublisherPool.plateNumber}
            </span>
            <h2 className="text-xl font-extrabold font-mono-num mt-0.5">
              {etaMins} Mins <span className="text-slate-500">|</span>{' '}
              <span className="text-emerald-400">{remKm} km</span>
            </h2>
            <p className="text-[11px] text-slate-300">
              {activePublisherPool.origin} → {activePublisherPool.destination}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsRideSimPlaying((v) => !v)}
            aria-label={isRideSimPlaying ? 'Pause route' : 'Resume route'}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center cursor-pointer"
          >
            {isRideSimPlaying ? (
              <Pause className="w-4 h-4 text-emerald-300" />
            ) : (
              <Play className="w-4 h-4 text-emerald-300" />
            )}
          </button>
        </div>
      </div>

      {/* Zero-API-Key Live Corridor Map */}
      <div className="rounded-3xl overflow-hidden border-2 border-slate-200 shadow-md bg-white">
        <div className="h-[230px] w-full">
          <MapContainer
            center={[24.862, 67.065]}
            zoom={13}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <KarachiTileLayer />
            <MapAutoResize
              triggerKey={`pub-${activePublisherPool.id}-${roadSnappingEnabled}`}
            />

            <Polyline
              positions={activePublisherPool.routePolyline}
              pathOptions={{
                color: roadSnappingEnabled ? '#059669' : '#94A3B8',
                weight: roadSnappingEnabled ? 5 : 3,
              }}
            />

            {!roadSnappingEnabled &&
              activePublisherPool.rawDriftingGps.map((pt, idx) => (
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

            <Marker position={activePublisherPool.routePolyline[0]} icon={originIcon}>
              <Popup>Start: {activePublisherPool.origin}</Popup>
            </Marker>
            <Marker
              position={
                activePublisherPool.routePolyline[
                  activePublisherPool.routePolyline.length - 1
                ]
              }
              icon={destIcon}
            >
              <Popup>End: {activePublisherPool.destination}</Popup>
            </Marker>
            <Marker
              position={activePublisherPool.meetingPoint.meetingCoords}
              icon={meetingIcon}
            >
              <Popup>Pickup Pin: {activePublisherPool.meetingPoint.label}</Popup>
            </Marker>
            <Marker position={carPos} icon={vehicleIcon}>
              <Popup>Your Vehicle ({activePublisherPool.plateNumber})</Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>

      {/* Publisher Telemetry Status */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Trip Telemetry &amp; Mileage Protection
          </span>
        </div>

        <div
          className={`rounded-xl border p-2.5 flex items-center justify-between gap-2 ${
            !proximityMismatch
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-300'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Bluetooth
              className={`w-4 h-4 shrink-0 ${
                !proximityMismatch ? 'text-emerald-600' : 'text-red-600'
              }`}
            />
            <p
              className={`text-[11px] font-bold truncate ${
                !proximityMismatch ? 'text-emerald-950' : 'text-red-900'
              }`}
            >
              {!proximityMismatch
                ? 'Co-Rider BLE Proximity Verified (1.4m)'
                : 'BLE Proximity Lost — Mileage Audit Paused'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setProximityMismatch(!proximityMismatch)}
            aria-label="Toggle publisher BLE check"
            className={`w-11 h-6 rounded-full p-0.5 shrink-0 cursor-pointer transition-colors ${
              !proximityMismatch ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                !proximityMismatch ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <GitCommitHorizontal className="w-4 h-4 text-slate-700 shrink-0" />
            <span className="text-[11px] font-bold text-slate-800 truncate">
              GPS Road-Map Snapping ({roadSnappingEnabled ? 'Active' : 'Raw GPS'})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRoadSnappingEnabled(!roadSnappingEnabled)}
            className={`w-11 h-6 rounded-full p-0.5 cursor-pointer transition-colors ${
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

      {/* Boarded Co-Riders Manifest */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            Boarded {currentUser.gender} Co-Riders ({seatedPassengers.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openChatForPool(activePublisherPool.id)}
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Rider Chat
            </button>
            <button
              type="button"
              onClick={() => setSosOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-extrabold cursor-pointer"
            >
              <ShieldAlert className="w-3 h-3" />
              SOS
            </button>
          </div>
        </div>

        {seatedPassengers.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">
            No riders boarded yet. Approve incoming requests in the Requests tab.
          </p>
        ) : (
          seatedPassengers.map(({ seatId, occ }) => (
            <div
              key={seatId}
              className="rounded-2xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-900">
                  {occ.name}{' '}
                  <span className="text-[10px] font-semibold text-emerald-700">
                    · {SEAT_LABELS[seatId].split(' (')[0]}
                  </span>
                </p>
                <p className="text-[10.5px] text-slate-500 truncate">{occ.segment}</p>
              </div>
              <span className="text-xs font-extrabold font-mono-num text-slate-900">
                Rs. {occ.fareShare ?? activePublisherPool.estimatedShare}
              </span>
            </div>
          ))
        )}

        {/* Publisher-Only Drop-Off & On-Cash Settlement Confirmations */}
        {unsettledPoolTxs.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
              Pending Drop-Off Settlements
            </p>
            {unsettledPoolTxs.map((tx) => (
              <div
                key={tx.id}
                className="rounded-xl bg-amber-50 border border-amber-300 p-2.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 truncate">
                    {tx.title} (PKR {tx.amountPkr})
                  </p>
                  <p className="text-[10px] text-amber-900">
                    {tx.status === 'cash_pending'
                      ? 'Confirm direct cash received from co-rider'
                      : 'Verify drop-off to claim escrow release'}
                  </p>
                </div>
                {tx.status === 'cash_pending' ? (
                  <button
                    type="button"
                    onClick={() => confirmPublisherCash(tx.id)}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Confirm Cash
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => releaseEscrowByReceipt(tx.receiptNo)}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-[#0A192F] text-emerald-300 text-[10.5px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Unlock className="w-3 h-3" />
                    Drop-Off Done
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
