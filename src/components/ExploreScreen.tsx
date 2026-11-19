import React, { useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup } from 'react-leaflet';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Footprints,
  Leaf,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Navigation,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';
import type { LatLngTuple, MeetingPointInfo, PassengerSeatId } from '../types/smartpool';
import { computeVirtualMeetingPoint } from '../utils/nlpAndGeo';
import { getActiveSeatIds, SEAT_LABELS } from '../utils/seatAllocator';
import { CarCabinVisualizer, MiniCabinPreview } from './CarCabinVisualizer';
import {
  createEndpointIcon,
  createHomeGaliIcon,
  createMeetingPointIcon,
  KarachiTileLayer,
  MapAutoResize,
  MapClickCatcher,
  MapFocusController,
} from './LeafletMapHelpers';

export const ExploreScreen: React.FC = () => {
  const {
    currentUser,
    passengerEligiblePools,
    selectedPool,
    selectPool,
    activeBookedPool,
    exploreMode,
    setExploreMode,
    bookPoolSeat,
    openChatForPool,
    setPassengerTab,
    pushToast,
  } = useSmartPool();

  const [pickupQuery, setPickupQuery] = useState('Shahrah-e-Faisal (St. 4)');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'routine'>('all');

  // Street-Corner Virtual Meeting Point & Preferred Seat selection
  const [customMeeting, setCustomMeeting] = useState<MeetingPointInfo | null>(null);
  const [tapToMovePin, setTapToMovePin] = useState(false);
  const [preferredSeat, setPreferredSeat] = useState<PassengerSeatId | null>(null);

  // 3-step live handshake
  const [handshakeStep, setHandshakeStep] = useState<0 | 1 | 2 | 3>(0);
  const [bookedSeatLabel, setBookedSeatLabel] = useState<string>('');

  const meetingIcon = useMemo(() => createMeetingPointIcon(), []);
  const homeIcon = useMemo(() => createHomeGaliIcon(), []);
  const originIcon = useMemo(() => createEndpointIcon('origin', 'A'), []);
  const destIcon = useMemo(() => createEndpointIcon('destination', 'B'), []);

  // Passenger ONLY ever receives same-gender KYC-verified pools from backend!
  const filteredPools = useMemo(() => {
    return passengerEligiblePools.filter((p) => {
      if (dropoffQuery.trim()) {
        const q = dropoffQuery.toLowerCase();
        const hit =
          p.destination.toLowerCase().includes(q) ||
          p.origin.toLowerCase().includes(q) ||
          p.corridorName.toLowerCase().includes(q) ||
          p.driverName.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (timeFilter === 'morning') return p.departureTime.includes('AM');
      if (timeFilter === 'routine') return p.scheduleType === 'Weekly Routine';
      return true;
    });
  }, [passengerEligiblePools, dropoffQuery, timeFilter]);

  if (!currentUser) return null;
  const isFemaleUser = currentUser.gender === 'Female';

  const openMeetingDiscovery = (poolId: string) => {
    selectPool(poolId);
    setCustomMeeting(null);
    setTapToMovePin(false);
    setPreferredSeat(null);
    setHandshakeStep(0);
    setBookedSeatLabel('');
    setExploreMode('meeting-point');
  };

  // =========================================================================
  // VIRTUAL MEETING POINT ("GALI KE KONE PE ROAD") & SEAT RESERVATION
  // =========================================================================
  if (exploreMode === 'meeting-point' && selectedPool) {
    const activeMeeting = customMeeting ?? selectedPool.meetingPoint;
    const startCoord = selectedPool.routePolyline[0];
    const endCoord =
      selectedPool.routePolyline[selectedPool.routePolyline.length - 1];
    const activeSeatIds = getActiveSeatIds(selectedPool.cabin.maxPassengerSeats);
    const alreadyInThisPool = activeSeatIds.some(
      (id) => selectedPool.cabin.seats[id]?.userId === currentUser.id
    );
    const openSeatsCount = activeSeatIds.filter(
      (id) => selectedPool.cabin.seats[id] === null
    ).length;

    const handleMapPinRelocate = (coords: LatLngTuple) => {
      const next = computeVirtualMeetingPoint(coords, selectedPool.routePolyline);
      setCustomMeeting(next);
      setTapToMovePin(false);
      pushToast('Corner Pin Updated', `${next.label} — ${next.sublabel}`, 'info');
    };

    const handleReserve = () => {
      setHandshakeStep(1);
      window.setTimeout(() => setHandshakeStep(2), 550);
      window.setTimeout(() => {
        const res = bookPoolSeat(
          selectedPool.id,
          activeMeeting,
          preferredSeat ?? undefined
        );
        if (res.ok && res.seatLabel) {
          setBookedSeatLabel(res.seatLabel);
          setHandshakeStep(3);
          pushToast(
            'Seat Reserved & Chat Unlocked!',
            `${res.seatLabel} confirmed with ${selectedPool.driverName}.`,
            'success'
          );
        } else {
          setHandshakeStep(0);
        }
      }, 1250);
    };

    return (
      <div className="p-4 space-y-3.5 pb-8 animate-slide-up">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setExploreMode('list')}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-700 hover:text-slate-950 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {currentUser.gender}-Only Pools
          </button>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
              isFemaleUser
                ? 'bg-pink-50 border-pink-300 text-pink-800'
                : 'bg-sky-50 border-sky-300 text-sky-800'
            }`}
          >
            <Lock className="w-2.5 h-2.5" />
            KYC {selectedPool.allowedGender}-Only
          </span>
        </div>

        {/* Interactive Leaflet Map (100% Free, Zero API Key) */}
        <div className="relative rounded-3xl overflow-hidden border-2 border-slate-200 shadow-md bg-slate-100">
          <div className="h-[265px] w-full">
            <MapContainer
              center={activeMeeting.meetingCoords}
              zoom={15}
              scrollWheelZoom={false}
              className="h-full w-full"
            >
              <KarachiTileLayer />
              <MapAutoResize triggerKey={`${selectedPool.id}-${exploreMode}`} />
              <MapFocusController
                center={activeMeeting.meetingCoords}
                zoom={15}
                focusKey={`${selectedPool.id}-${activeMeeting.meetingCoords[0].toFixed(4)}`}
              />
              <MapClickCatcher enabled={tapToMovePin} onPick={handleMapPinRelocate} />

              <Polyline
                positions={selectedPool.routePolyline}
                pathOptions={{ color: '#0A192F', weight: 6, opacity: 0.85 }}
              />
              <Polyline
                positions={selectedPool.routePolyline}
                pathOptions={{
                  color: isFemaleUser ? '#EC4899' : '#10B981',
                  weight: 3.5,
                  opacity: 0.95,
                }}
              />
              <Polyline
                positions={[activeMeeting.homeCoords, activeMeeting.meetingCoords]}
                pathOptions={{ color: '#0284C7', weight: 4, dashArray: '6 7' }}
              />

              <Marker position={startCoord} icon={originIcon}>
                <Popup>
                  <strong>Origin:</strong> {selectedPool.origin}
                </Popup>
              </Marker>
              <Marker position={endCoord} icon={destIcon}>
                <Popup>
                  <strong>Destination:</strong> {selectedPool.destination}
                </Popup>
              </Marker>
              <Marker position={activeMeeting.homeCoords} icon={homeIcon}>
                <Popup>
                  <strong>Your Gali Pin:</strong> {activeMeeting.homeLabel}
                </Popup>
              </Marker>
              <Marker position={activeMeeting.meetingCoords} icon={meetingIcon}>
                <Popup>
                  <strong>AI Corner Meeting Point:</strong>
                  <br />
                  {activeMeeting.label} ({activeMeeting.sublabel})
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Relocate Gali Pin Control */}
          <div className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTapToMovePin((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-extrabold shadow-md border cursor-pointer transition-all ${
                tapToMovePin
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-white'
              }`}
            >
              {tapToMovePin ? 'Tap Your Street on Map...' : 'Change My Gali Pin'}
            </button>
            {customMeeting && (
              <button
                type="button"
                onClick={() => setCustomMeeting(null)}
                title="Reset default pin"
                className="p-1.5 rounded-xl bg-white/95 text-slate-700 border border-slate-200 shadow-md cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="bg-[#0A192F] text-white px-3.5 py-2 flex items-center justify-between text-[10px]">
            <span>Home Gali → Main Road Corner</span>
            <span className="text-emerald-300 font-bold font-mono-num">
              Detour {activeMeeting.driverDetourMins} min (&lt;2m)
            </span>
          </div>
        </div>

        {/* Street Corner Meeting Point Summary */}
        <div className="bg-white rounded-3xl border-2 border-emerald-400/70 p-4 shadow-xs space-y-2.5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0">
              <Footprints className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                AI Virtual Meeting Point
              </span>
              <h3 className="text-sm font-extrabold text-slate-900 leading-snug mt-0.5">
                {activeMeeting.label} – {activeMeeting.sublabel}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2 text-center">
              <p className="text-xs font-extrabold text-emerald-800 font-mono-num">
                {activeMeeting.walkMins}m ({activeMeeting.walkMeters}m)
              </p>
              <p className="text-[9.5px] font-semibold text-emerald-700">Walk</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-center">
              <p className="text-xs font-extrabold text-slate-900 font-mono-num">
                {selectedPool.departureTime}
              </p>
              <p className="text-[9.5px] font-semibold text-slate-500">Pickup</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-2 text-center">
              <p className="text-xs font-extrabold text-slate-900 font-mono-num">
                Rs. {selectedPool.estimatedShare}
              </p>
              <p className="text-[9.5px] font-semibold text-slate-500">Fair Share</p>
            </div>
          </div>
        </div>

        {/* Select Your Seat on the Verified Same-Gender 2D Cabin */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">
                {alreadyInThisPool
                  ? 'Your Reserved Seat in This Cabin'
                  : 'Choose Your Seat (Tap Any Open Seat)'}
              </h4>
              <p className="text-[10.5px] text-slate-500">
                {selectedPool.driverName} · {selectedPool.vehicleModel} (
                {selectedPool.plateNumber})
              </p>
            </div>
            <span className="text-[10.5px] font-extrabold text-emerald-700 font-mono-num">
              {openSeatsCount} Open
            </span>
          </div>

          <CarCabinVisualizer
            cabin={selectedPool.cabin}
            currentUserId={currentUser.id}
            compact
            selectedOpenSeat={alreadyInThisPool ? null : preferredSeat}
            onSelectOpenSeat={
              alreadyInThisPool
                ? undefined
                : (seatId) =>
                    setPreferredSeat((prev) => (prev === seatId ? null : seatId))
            }
          />
        </div>

        {/* Reserve & 3-Step Handshake */}
        {handshakeStep === 0 ? (
          alreadyInThisPool ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => openChatForPool(selectedPool.id)}
                className="py-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                Chat Publisher
              </button>
              <button
                type="button"
                onClick={() => setPassengerTab('ride')}
                className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                Track My Ride
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={openSeatsCount === 0}
              onClick={handleReserve}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4.5 h-4.5" />
              {preferredSeat
                ? `Reserve ${SEAT_LABELS[preferredSeat].split(' (')[0]} · Rs. ${selectedPool.estimatedShare}`
                : `Reserve Verified Seat · Rs. ${selectedPool.estimatedShare}`}
            </button>
          )
        ) : (
          <div className="rounded-3xl bg-[#0A192F] text-white p-4 shadow-xl space-y-2.5 animate-slide-up border border-emerald-400/40">
            <div className="flex items-center justify-between text-xs font-extrabold text-emerald-300">
              <span>KYC SAFETY HANDSHAKE</span>
              <span className="font-mono-num">{handshakeStep}/3</span>
            </div>
            {[
              {
                s: 1,
                t: `KYC & ${currentUser.gender}-to-${selectedPool.driverGender} gender match verified`,
                sub: `${currentUser.kyc.kycId} ↔ ${selectedPool.driverKycId}`,
              },
              {
                s: 2,
                t: 'Virtual street-corner pin & cabin seat locked',
                sub: `${bookedSeatLabel || 'Assigning seat...'} · St. 4 Corner`,
              },
              {
                s: 3,
                t: 'Booking confirmed & encrypted peer chat unlocked',
                sub: `${selectedPool.driverName} (${selectedPool.plateNumber})`,
              },
            ].map((item) => {
              const done = handshakeStep >= item.s;
              const running = handshakeStep === item.s - 1;
              return (
                <div
                  key={item.s}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
                    done
                      ? 'bg-emerald-500/15 border-emerald-400/40'
                      : 'bg-white/5 border-white/10 opacity-60'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : running ? (
                    <Loader2 className="w-4 h-4 text-amber-300 animate-spin shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold">{item.t}</p>
                    <p className="text-[10px] text-slate-300 truncate">{item.sub}</p>
                  </div>
                </div>
              );
            })}

            {handshakeStep === 3 && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openChatForPool(selectedPool.id)}
                  className="py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                  Chat Publisher
                </button>
                <button
                  type="button"
                  onClick={() => setPassengerTab('ride')}
                  className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0A192F] font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Open My Ride
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // PASSENGER POOL DISCOVERY — STRICT SAME-GENDER BACKEND FEED
  // =========================================================================
  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Backend KYC Gender-Matching Status Banner */}
      <div
        className={`rounded-2xl border px-3.5 py-2.5 flex items-center justify-between gap-2 ${
          isFemaleUser
            ? 'bg-pink-50 border-pink-300 text-pink-950'
            : 'bg-sky-50 border-sky-300 text-sky-950'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Lock
            className={`w-4 h-4 shrink-0 ${
              isFemaleUser ? 'text-pink-600' : 'text-sky-700'
            }`}
          />
          <p className="text-[11px] font-bold leading-snug">
            <strong>{currentUser.gender}-to-{currentUser.gender} KYC Protection:</strong>{' '}
            Showing only pools published by verified {currentUser.gender} citizens.
          </p>
        </div>
      </div>

      {/* Corridor Search Card */}
      <div className="bg-gradient-to-br from-[#0A192F] via-[#0F172A] to-[#0D2740] rounded-3xl p-4 text-white shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-extrabold tracking-tight">
              Find a {currentUser.gender}-Only Pool
            </h1>
            <p className="text-[11px] text-slate-300">
              Karachi corridors · Street-corner virtual pickup pins
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-[10px] font-extrabold text-emerald-300">
            <Sparkles className="w-3 h-3" />
            AI Matched
          </span>
        </div>

        <div className="bg-white/10 rounded-2xl p-2.5 border border-white/15 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <input
              type="text"
              value={pickupQuery}
              onChange={(e) => setPickupQuery(e.target.value)}
              placeholder="Pickup corridor..."
              className="w-full bg-transparent text-xs font-semibold text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="border-t border-white/10" />
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <input
              type="text"
              value={dropoffQuery}
              onChange={(e) => setDropoffQuery(e.target.value)}
              placeholder="Search destination (Saddar, Iqra University, Clifton)..."
              className="w-full bg-transparent text-xs font-semibold text-white placeholder:text-slate-400 focus:outline-none"
            />
            {dropoffQuery && (
              <button
                type="button"
                onClick={() => setDropoffQuery('')}
                className="text-[10px] text-emerald-300 font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all' as const, label: 'Best Match' },
            { id: 'morning' as const, label: 'Morning Commute' },
            { id: 'routine' as const, label: 'Weekly Routine' },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setTimeFilter(chip.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-[10.5px] font-bold border transition-all cursor-pointer ${
                timeFilter === chip.id
                  ? 'bg-emerald-500 border-emerald-400 text-[#0A192F]'
                  : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Karachi Map Preview (Strictly rendering only same-gender eligible routes) */}
      <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-xs">
        <div className="h-[175px] w-full relative">
          <MapContainer
            center={[24.862, 67.071]}
            zoom={12}
            scrollWheelZoom={false}
            zoomControl={false}
            className="h-full w-full"
          >
            <KarachiTileLayer showStyleToggle />
            <MapAutoResize triggerKey={`${currentUser.id}-${exploreMode}`} />
            {filteredPools.map((pool, idx) => (
              <Polyline
                key={pool.id}
                positions={pool.routePolyline}
                pathOptions={{
                  color: isFemaleUser
                    ? idx === 0
                      ? '#DB2777'
                      : '#F472B6'
                    : idx === 0
                    ? '#059669'
                    : '#0284C7',
                  weight: idx === 0 ? 4.5 : 3,
                  opacity: 0.88,
                }}
              />
            ))}
            <Marker position={[24.8655, 67.071]} icon={meetingIcon}>
              <Popup>
                <strong>AI Corner Pin:</strong> St. 4 &amp; Main Shahrah-e-Faisal (2m walk)
              </Popup>
            </Marker>
          </MapContainer>

          {selectedPool && (
            <button
              type="button"
              onClick={() => openMeetingDiscovery(selectedPool.id)}
              className="absolute top-2.5 right-2.5 z-[400] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A192F]/95 hover:bg-[#0A192F] text-white text-[10.5px] font-extrabold shadow-lg border border-emerald-400/40 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Corner Pin Map
            </button>
          )}
        </div>
      </div>

      {/* Verified Same-Gender Pools List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Verified {currentUser.gender} Publishers ({filteredPools.length})
          </h2>
          <span className="text-[10.5px] font-semibold text-emerald-700">
            Non-Profit Cost Split
          </span>
        </div>

        {filteredPools.map((pool) => {
          const seatIds = getActiveSeatIds(pool.cabin.maxPassengerSeats);
          const openSeats = seatIds.filter((id) => pool.cabin.seats[id] === null).length;
          const isMyBooked = activeBookedPool?.id === pool.id;

          return (
            <article
              key={pool.id}
              className={`bg-white rounded-3xl border-2 p-4 shadow-xs hover:shadow-md transition-all ${
                isMyBooked
                  ? 'border-emerald-500'
                  : isFemaleUser
                  ? 'border-pink-200 hover:border-pink-400'
                  : 'border-slate-200 hover:border-emerald-400/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-sm text-white shrink-0 shadow-xs ${
                      isFemaleUser
                        ? 'bg-gradient-to-br from-pink-500 to-rose-600'
                        : 'bg-gradient-to-br from-[#0A192F] to-slate-700'
                    }`}
                  >
                    {pool.driverInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <h3 className="text-sm font-extrabold text-slate-900 truncate">
                        {pool.driverName}
                      </h3>
                      <BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold mt-0.5 flex-wrap">
                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 font-mono-num">
                        Trust {pool.trustScore}%
                      </span>
                      <span className="text-slate-600">{pool.vehicleCategory}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-extrabold text-[#0A192F] font-mono-num">
                    Rs. {pool.estimatedShare}
                  </div>
                  <div className="text-[9.5px] font-bold text-emerald-700 uppercase">
                    Est. Share
                  </div>
                </div>
              </div>

              {/* Verified KYC Gender & Eco Badges */}
              <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    isFemaleUser
                      ? 'bg-pink-100 text-pink-800 border-pink-300'
                      : 'bg-sky-100 text-sky-800 border-sky-300'
                  }`}
                >
                  <Lock className="w-2.5 h-2.5" />
                  {pool.allowedGender}-Only KYC
                </span>
                {pool.isEV ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                    <Zap className="w-2.5 h-2.5" />
                    EV Pool
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                    <Leaf className="w-2.5 h-2.5" />
                    Eco Split
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold font-mono-num">
                  {pool.detourMins} min detour
                </span>
                {isMyBooked && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">
                    Booked
                  </span>
                )}
              </div>

              {/* Corridor + 2D Seat Map */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                    <span className="truncate">{pool.origin}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 pl-0.5">
                    <Footprints className="w-3 h-3 shrink-0" />
                    <span className="truncate">St. 4 Corner (2m walk)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">{pool.destination}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10.5px] text-slate-500 pt-0.5 font-mono-num">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {pool.departureTime}
                    </span>
                    <span>· {openSeats} open</span>
                  </div>
                </div>

                <MiniCabinPreview cabin={pool.cabin} currentUserId={currentUser.id} />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openMeetingDiscovery(pool.id)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {isMyBooked ? 'View Pickup Pin & Seat' : 'View Corner Pin & Book'}
                </button>
                {isMyBooked && (
                  <button
                    type="button"
                    onClick={() => openChatForPool(pool.id)}
                    aria-label="Open chat with publisher"
                    className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {filteredPools.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center space-y-2">
            <p className="text-sm font-extrabold text-slate-800">
              No matching {currentUser.gender}-Only pools on that filter
            </p>
            <button
              type="button"
              onClick={() => {
                setDropoffQuery('');
                setTimeFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-[#0A192F] text-white text-xs font-bold cursor-pointer"
            >
              Show All Verified {currentUser.gender} Pools
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
