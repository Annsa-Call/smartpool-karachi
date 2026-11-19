import React, { useState } from 'react';
import {
  Calendar,
  Car,
  Clock,
  Fuel,
  Lock,
  MapPin,
  PauseCircle,
  PlayCircle,
  Users,
} from 'lucide-react';
import { KARACHI_LANDMARKS } from '../data/karachiData';
import { useSmartPool } from '../context/SmartPoolContext';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const VEHICLE_OPTIONS = [
  { category: '1300cc Sedan', model: 'Honda City 1.3 i-VTEC', defaultKmL: 14 },
  { category: '1500cc Hybrid', model: 'Toyota Aqua 1.5 Hybrid', defaultKmL: 21 },
  { category: '1000cc Hatchback', model: 'Suzuki Cultus VXL', defaultKmL: 16.5 },
  { category: '660cc Hatchback', model: 'Suzuki Alto VXL AGS', defaultKmL: 19 },
  { category: 'Mini EV Hatchback', model: 'Mini EV Hatchback (660e)', defaultKmL: 24 },
];

export const PublishRideScreen: React.FC = () => {
  const {
    currentUser,
    publisherPools,
    publishNewPool,
    togglePublisherPoolStatus,
    selectPublisherPool,
    setPublisherTab,
  } = useSmartPool();

  const [origin, setOrigin] = useState('Shahrah-e-Faisal');
  const [destination, setDestination] = useState('Saddar');
  const [departureTime, setDepartureTime] = useState('08:30 AM');
  const [scheduleType, setScheduleType] = useState<'One-Time' | 'Weekly Routine'>(
    'Weekly Routine'
  );
  const [routineDays, setRoutineDays] = useState<string[]>([
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
  ]);
  const [vehicleCategory, setVehicleCategory] = useState(
    currentUser?.vehicle?.category ?? '1300cc Sedan'
  );
  const [vehicleModel, setVehicleModel] = useState(
    currentUser?.vehicle?.model ?? 'Honda City 1.3 i-VTEC'
  );
  const [plateNumber, setPlateNumber] = useState(
    currentUser?.vehicle?.plateNumber ?? 'BKA-921'
  );
  const [fuelEconomy, setFuelEconomy] = useState<number>(
    currentUser?.vehicle?.fuelEconomyKmL ?? 14
  );
  const [fuelPrice, setFuelPrice] = useState<number>(265);
  const [availableSeats, setAvailableSeats] = useState<number>(3);
  const [requiresManualApproval, setRequiresManualApproval] = useState<boolean>(true);

  if (!currentUser) return null;

  const isFemale = currentUser.gender === 'Female';
  const estDist =
    destination.toLowerCase().includes('iqra') ||
    destination.toLowerCase().includes('clifton')
      ? 13.5
      : 16.8;
  const estFuelCost = Math.round((estDist / Math.max(5, fuelEconomy)) * fuelPrice);
  const estTotalCost = estFuelCost + Math.round(estDist * 6) + 30;
  const estPerRider = Math.round(
    estTotalCost / Math.max(2, Math.min(3, availableSeats + 1))
  );

  const toggleDay = (day: string) => {
    setRoutineDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    publishNewPool({
      origin,
      destination,
      departureTime,
      scheduleType,
      routineDays,
      vehicleCategory,
      vehicleModel,
      plateNumber,
      fuelEconomyKmL: fuelEconomy,
      fuelPricePerL: fuelPrice,
      availableSeats,
      requiresManualApproval,
    });
  };

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Automatic KYC Gender Visibility Enforcement Notice */}
      <div
        className={`rounded-2xl border-2 p-3.5 flex items-start gap-2.5 ${
          isFemale
            ? 'bg-pink-50 border-pink-300 text-pink-950'
            : 'bg-sky-50 border-sky-300 text-sky-950'
        }`}
      >
        <Lock
          className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${
            isFemale ? 'text-pink-600' : 'text-sky-700'
          }`}
        />
        <div>
          <p className="text-xs font-extrabold">
            KYC-Locked {currentUser.gender}-Only Listing ({currentUser.kyc.kycId})
          </p>
          <p className="text-[11px] opacity-90 mt-0.5 leading-snug">
            Verified via your NADRA CNIC ({currentUser.cnic}). Every pool you publish is
            automatically visible &amp; bookable <strong>exclusively</strong> by
            KYC-verified <strong>{currentUser.gender}</strong> commuters.
          </p>
        </div>
      </div>

      {/* Publish New Scheduled Pool Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3.5"
      >
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Publisher Console
          </span>
          <h1 className="text-base font-extrabold text-slate-900 mt-1">
            Offer a Scheduled Karachi Pool
          </h1>
        </div>

        {/* Route */}
        <div className="space-y-2.5">
          <div>
            <label className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              <MapPin className="w-3 h-3 text-slate-700" />
              Origin
            </label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
            >
              {KARACHI_LANDMARKS.map((lm) => (
                <option key={lm.id} value={lm.shortName}>
                  {lm.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              <MapPin className="w-3 h-3 text-emerald-600" />
              Destination
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
            >
              {KARACHI_LANDMARKS.map((lm) => (
                <option key={lm.id} value={lm.shortName}>
                  {lm.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Time & Schedule */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              <Clock className="w-3 h-3 text-emerald-600" />
              Departure Time
            </label>
            <select
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold font-mono-num text-slate-900"
            >
              <option value="07:45 AM">07:45 AM</option>
              <option value="08:00 AM">08:00 AM</option>
              <option value="08:30 AM">08:30 AM</option>
              <option value="09:00 AM">09:00 AM</option>
              <option value="05:30 PM">05:30 PM</option>
              <option value="06:15 PM">06:15 PM</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              <Calendar className="w-3 h-3 text-emerald-600" />
              Schedule
            </label>
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-slate-100 border border-slate-200">
              {(['One-Time', 'Weekly Routine'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setScheduleType(st)}
                  className={`py-2 px-1 rounded-lg text-[10px] font-extrabold cursor-pointer ${
                    scheduleType === st ? 'bg-[#0A192F] text-white' : 'text-slate-600'
                  }`}
                >
                  {st === 'Weekly Routine' ? 'Weekly' : 'One-Time'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {scheduleType === 'Weekly Routine' && (
          <div className="flex items-center gap-1.5">
            {WEEK_DAYS.map((day) => {
              const on = routineDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`flex-1 py-1.5 rounded-lg text-[10.5px] font-extrabold border cursor-pointer ${
                    on
                      ? 'bg-emerald-500 border-emerald-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        )}

        {/* Vehicle & Fuel Details */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                <Car className="w-3 h-3 text-slate-700" />
                Vehicle
              </label>
              <select
                value={vehicleCategory}
                onChange={(e) => {
                  const pick = VEHICLE_OPTIONS.find((v) => v.category === e.target.value);
                  setVehicleCategory(e.target.value);
                  if (pick) {
                    setVehicleModel(pick.model);
                    setFuelEconomy(pick.defaultKmL);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900"
              >
                {VEHICLE_OPTIONS.map((v) => (
                  <option key={v.category} value={v.category}>
                    {v.category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Plate No.
              </label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold font-mono-num text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                <Fuel className="w-3 h-3 text-emerald-600" />
                Economy (km/L)
              </label>
              <input
                type="number"
                step="0.5"
                min="6"
                max="35"
                value={fuelEconomy}
                onChange={(e) => setFuelEconomy(Number(e.target.value) || 14)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-extrabold font-mono-num text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Petrol (Rs./L)
              </label>
              <input
                type="number"
                min="180"
                max="400"
                value={fuelPrice}
                onChange={(e) => setFuelPrice(Number(e.target.value) || 265)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-extrabold font-mono-num text-slate-900"
              />
            </div>
          </div>

          {/* Available Seats 1–4 */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Offered {currentUser.gender}-Only Seats
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAvailableSeats(n)}
                  className={`py-2 rounded-xl border-2 text-xs font-extrabold font-mono-num cursor-pointer ${
                    availableSeats === n
                      ? 'bg-[#0A192F] border-[#0A192F] text-emerald-300'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {n} {n === 1 ? 'Seat' : 'Seats'}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Approval Gate Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
            <div>
              <p className="text-xs font-bold text-slate-800">
                Require Manual Request Approval
              </p>
              <p className="text-[10px] text-slate-500">
                Review each verified {currentUser.gender} commuter before locking seat
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRequiresManualApproval((v) => !v)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                requiresManualApproval ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  requiresManualApproval ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Cost Recovery Estimate */}
        <div className="rounded-2xl bg-[#0A192F] text-white p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Non-Profit Cost Recovery
            </p>
            <p className="text-[11px] text-slate-300 font-mono-num mt-0.5">
              Trip Cost PKR {estTotalCost} · {currentUser.gender}-Only Locked
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-emerald-400 font-mono-num">
              Rs. {estPerRider}
            </p>
            <p className="text-[9.5px] text-slate-300">per co-rider</p>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 cursor-pointer"
        >
          Publish {currentUser.gender}-Only Pool
        </button>
      </form>

      {/* Publisher's Existing Listings Management */}
      {publisherPools.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2.5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Your Published Listings ({publisherPools.length})
          </h2>
          {publisherPools.map((pool) => {
            const bookedCount = Object.values(pool.cabin.seats).filter(Boolean).length;
            return (
              <div
                key={pool.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">
                      {pool.origin} → {pool.destination}
                    </p>
                    <p className="text-[10.5px] text-slate-500 font-mono-num">
                      {pool.departureTime} · {pool.plateNumber} · Rs.{' '}
                      {pool.estimatedShare}/seat
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase ${
                      pool.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pool.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => {
                      selectPublisherPool(pool.id);
                      setPublisherTab('requests');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Cabin ({bookedCount}/{pool.cabin.maxPassengerSeats} Seated)
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePublisherPoolStatus(pool.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10.5px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    {pool.status === 'active' ? (
                      <>
                        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                        Pause
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Resume
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
