import React from 'react';
import { Check, Lock, ShieldCheck, User, X } from 'lucide-react';
import type { CabinSeatState, PassengerSeatId } from '../types/smartpool';
import { getActiveSeatIds } from '../utils/seatAllocator';

interface CarCabinVisualizerProps {
  cabin: CabinSeatState;
  currentUserId?: string;
  /** Publisher-only action to vacate a seat on their own listing */
  onPublisherVacateSeat?: (seatId: PassengerSeatId) => void;
  /** Passenger-only action to choose a preferred open seat before booking */
  selectedOpenSeat?: PassengerSeatId | null;
  onSelectOpenSeat?: (seatId: PassengerSeatId) => void;
  compact?: boolean;
}

/**
 * Compact 2D Seat Map Preview for Passenger Pool Listing Cards
 */
export const MiniCabinPreview: React.FC<{
  cabin: CabinSeatState;
  currentUserId?: string;
}> = ({ cabin, currentUserId }) => {
  const activeSeats = getActiveSeatIds(cabin.maxPassengerSeats);
  const isFemalePool = cabin.allowedGender === 'Female';

  const renderMiniSeat = (seatId: PassengerSeatId, shortPos: string) => {
    const enabled = activeSeats.includes(seatId);
    const occ = cabin.seats[seatId];

    if (!enabled) {
      return (
        <div
          key={seatId}
          className="h-7 rounded-md bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center text-[8px] text-slate-300 font-semibold"
        >
          —
        </div>
      );
    }

    if (occ) {
      const isYou = currentUserId && occ.userId === currentUserId;
      return (
        <div
          key={seatId}
          title={`${shortPos}: ${occ.name} (KYC ${occ.gender})`}
          className={`h-7 rounded-md border flex items-center justify-center text-[8.5px] font-extrabold ${
            isYou
              ? 'bg-emerald-600 border-emerald-700 text-white'
              : isFemalePool
              ? 'bg-pink-100 border-pink-300 text-pink-800'
              : 'bg-sky-100 border-sky-300 text-sky-900'
          }`}
        >
          {isYou ? 'YOU' : occ.avatarInitials}
        </div>
      );
    }

    return (
      <div
        key={seatId}
        title={`${shortPos}: Open (${cabin.allowedGender}-Only KYC Seat)`}
        className={`h-7 rounded-md border border-dashed flex items-center justify-center text-[8.5px] font-bold ${
          isFemalePool
            ? 'bg-pink-50 border-pink-300 text-pink-700'
            : 'bg-emerald-50 border-emerald-300 text-emerald-700'
        }`}
      >
        Open
      </div>
    );
  };

  return (
    <div className="w-[114px] shrink-0 rounded-2xl bg-slate-50 border-2 border-slate-200 p-2 shadow-inner">
      <div className="text-[8px] uppercase tracking-wider text-center font-bold text-slate-400 mb-1">
        {isFemalePool ? 'Female Cabin' : 'Male Cabin'}
      </div>
      {/* Front Row: Front-Left (Passenger) | Front-Right (Driver RHD) */}
      <div className="grid grid-cols-2 gap-1 mb-1">
        {renderMiniSeat('front-left', 'Front-Left')}
        <div
          title={`Driver (Front-Right): ${cabin.driver.name} (KYC ${cabin.driver.gender})`}
          className={`h-7 rounded-md border flex items-center justify-center text-[8.5px] font-extrabold ${
            isFemalePool
              ? 'bg-gradient-to-br from-pink-600 to-rose-600 border-pink-500 text-white'
              : 'bg-[#0A192F] border-slate-700 text-emerald-300'
          }`}
        >
          DRV·{isFemalePool ? 'F' : 'M'}
        </div>
      </div>
      {/* Back Row */}
      <div className="grid grid-cols-3 gap-1">
        {renderMiniSeat('back-left', 'Back-Left')}
        {renderMiniSeat('back-middle', 'Back-Middle')}
        {renderMiniSeat('back-right', 'Back-Right')}
      </div>
    </div>
  );
};

/**
 * Full 2D Top-Down Right-Hand-Drive Car Cabin Visualizer (Strict KYC Same-Gender Verified)
 */
export const CarCabinVisualizer: React.FC<CarCabinVisualizerProps> = ({
  cabin,
  currentUserId,
  onPublisherVacateSeat,
  selectedOpenSeat,
  onSelectOpenSeat,
  compact = false,
}) => {
  const activeSeatIds = getActiveSeatIds(cabin.maxPassengerSeats);
  const isFemalePool = cabin.allowedGender === 'Female';

  const renderPassengerSeat = (seatId: PassengerSeatId, shortSub: string) => {
    const isEnabled = activeSeatIds.includes(seatId);
    const occupant = cabin.seats[seatId];

    if (!isEnabled) {
      return (
        <div
          key={seatId}
          className="rounded-2xl border border-dashed border-slate-300 bg-slate-100/70 p-2.5 flex flex-col items-center justify-center text-center min-h-[92px] opacity-60"
        >
          <span className="text-[9.5px] font-bold text-slate-400">{shortSub}</span>
          <span className="text-[8.5px] text-slate-400 mt-0.5">Not Offered</span>
        </div>
      );
    }

    if (occupant) {
      const isYou = Boolean(currentUserId && occupant.userId === currentUserId);
      return (
        <div
          key={seatId}
          className={`relative rounded-2xl border-2 p-2.5 flex flex-col items-center justify-between text-center transition-all ${
            compact ? 'min-h-[92px]' : 'min-h-[106px]'
          } ${
            isYou
              ? 'bg-gradient-to-b from-emerald-50 to-teal-50 border-emerald-500 ring-2 ring-emerald-400/40'
              : isFemalePool
              ? 'bg-gradient-to-b from-pink-50 to-rose-50 border-pink-400'
              : 'bg-gradient-to-b from-sky-50 to-blue-50 border-sky-400'
          }`}
        >
          {onPublisherVacateSeat && (
            <button
              type="button"
              onClick={() => onPublisherVacateSeat(seatId)}
              title={`Remove ${occupant.name} from seat`}
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 flex items-center justify-center cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            {shortSub}
          </span>

          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white shadow-xs my-0.5 ${
              isYou
                ? 'bg-emerald-600'
                : isFemalePool
                ? 'bg-gradient-to-br from-pink-500 to-rose-600'
                : 'bg-gradient-to-br from-sky-600 to-blue-700'
            }`}
          >
            {occupant.avatarInitials}
          </div>

          <div className="w-full">
            <p className="text-[10.5px] font-bold text-slate-900 truncate leading-tight">
              {isYou ? `${occupant.name.split(' ')[0]} (You)` : occupant.name.split(' ')[0]}
            </p>
            <span
              className={`inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold ${
                isYou
                  ? 'bg-emerald-600 text-white'
                  : isFemalePool
                  ? 'bg-pink-200/80 text-pink-900'
                  : 'bg-sky-200/80 text-sky-900'
              }`}
            >
              KYC {occupant.gender}
            </span>
          </div>
        </div>
      );
    }

    // Empty Seat — Strictly KYC Same-Gender Locked
    const isChosen = selectedOpenSeat === seatId;
    const clickable = Boolean(onSelectOpenSeat);

    return (
      <button
        key={seatId}
        type="button"
        disabled={!clickable}
        onClick={() => onSelectOpenSeat?.(seatId)}
        className={`relative rounded-2xl border-2 p-2 flex flex-col items-center justify-between text-center transition-all ${
          compact ? 'min-h-[92px]' : 'min-h-[106px]'
        } ${
          isChosen
            ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-400/40'
            : isFemalePool
            ? 'border-dashed border-pink-400 bg-pink-50/70 hover:bg-pink-50'
            : 'border-dashed border-sky-400 bg-sky-50/60 hover:bg-sky-50'
        } ${clickable ? 'cursor-pointer active:scale-98' : 'cursor-default'}`}
      >
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
          {shortSub}
        </span>
        <div
          className={`w-8 h-8 rounded-full border flex items-center justify-center ${
            isChosen
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : isFemalePool
              ? 'bg-white border-pink-300 text-pink-600'
              : 'bg-white border-sky-300 text-sky-600'
          }`}
        >
          {isChosen ? <Check className="w-4 h-4" /> : <User className="w-4 h-4" />}
        </div>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[8px] font-extrabold leading-tight ${
            isChosen
              ? 'bg-emerald-600 text-white'
              : isFemalePool
              ? 'bg-pink-600 text-white'
              : 'bg-sky-700 text-white'
          }`}
        >
          {isChosen ? 'Selected' : `${cabin.allowedGender}-Only`}
        </span>
      </button>
    );
  };

  return (
    <div className="relative mx-auto w-full max-w-[336px]">
      {/* Side Mirrors */}
      <div className="absolute top-[74px] -left-2 w-2.5 h-7 rounded-l-lg bg-[#0A192F] shadow" />
      <div className="absolute top-[74px] -right-2 w-2.5 h-7 rounded-r-lg bg-[#0A192F] shadow" />

      {/* 2D Car Shell */}
      <div className="rounded-[2.3rem] bg-gradient-to-b from-slate-200 via-white to-slate-200 p-3 border-[3px] border-[#0A192F] shadow-lg">
        {/* Front Windshield */}
        <div className="rounded-t-[1.7rem] rounded-b-xl bg-gradient-to-b from-[#0A192F] to-slate-800 px-3 py-2 mb-2.5 flex items-center justify-between text-white">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300">
            Front Cabin · RHD
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
              isFemalePool
                ? 'bg-pink-500 text-white'
                : 'bg-sky-500/30 text-sky-200 border border-sky-400/40'
            }`}
          >
            <Lock className="w-2.5 h-2.5" />
            KYC {cabin.allowedGender}-Only
          </span>
        </div>

        {/* Front Row: Front-Left Passenger | Front-Right Publisher */}
        <div className="grid grid-cols-2 gap-3 mb-2.5">
          {renderPassengerSeat('front-left', 'Front-Left')}

          <div
            className={`rounded-2xl border-2 p-2.5 flex flex-col items-center justify-between text-center ${
              compact ? 'min-h-[92px]' : 'min-h-[106px]'
            } ${
              isFemalePool
                ? 'bg-gradient-to-b from-[#2A0E2A] to-[#4A1238] border-pink-400 text-white'
                : 'bg-gradient-to-b from-[#0A192F] to-slate-800 border-emerald-400/70 text-white'
            }`}
          >
            <div className="flex items-center justify-between w-full px-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300">
                Front-Right
              </span>
              <svg
                className="w-4 h-4 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="2" />
                <path d="M3.5 10h17M12 14v7" />
              </svg>
            </div>

            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shadow ${
                isFemalePool
                  ? 'bg-pink-500 text-white'
                  : 'bg-emerald-500 text-[#0A192F]'
              }`}
            >
              {cabin.driver.avatarInitials}
            </div>

            <div className="w-full">
              <p className="text-[10.5px] font-bold truncate leading-tight">
                {cabin.driver.name.split(' ').slice(0, 2).join(' ')}
              </p>
              <span
                className={`inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold ${
                  isFemalePool
                    ? 'bg-pink-400/25 text-pink-200'
                    : 'bg-emerald-400/20 text-emerald-300'
                }`}
              >
                <ShieldCheck className="w-2.5 h-2.5" />
                Publisher ({cabin.driver.gender})
              </span>
            </div>
          </div>
        </div>

        {/* Rear Row Divider */}
        <div className="flex items-center gap-2 my-1.5 px-1">
          <div className="h-px flex-1 bg-slate-200" />
          <span
            className={`text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isFemalePool
                ? 'bg-pink-100 text-pink-800 border border-pink-300'
                : 'bg-sky-100 text-sky-800 border border-sky-300'
            }`}
          >
            Verified {cabin.allowedGender}-Only Rear Row
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Back Row */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {renderPassengerSeat('back-left', 'Back-Left')}
          {renderPassengerSeat('back-middle', 'Back-Mid')}
          {renderPassengerSeat('back-right', 'Back-Right')}
        </div>

        {/* Rear Tail Bar */}
        <div className="mt-2.5 rounded-b-[1.4rem] rounded-t-lg bg-slate-800 px-3 py-1.5 flex items-center justify-between">
          <span className="w-3.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-[8.5px] font-semibold uppercase tracking-widest text-slate-300">
            NADRA KYC Gender-Locked Cabin
          </span>
          <span className="w-3.5 h-1.5 rounded-full bg-red-500" />
        </div>
      </div>
    </div>
  );
};
