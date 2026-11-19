import React, { useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup } from 'react-leaflet';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Database,
  FileText,
  Leaf,
  Lock,
  RotateCcw,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useSmartPool } from '../context/SmartPoolContext';
import { interpolatePolyline } from '../utils/nlpAndGeo';
import {
  createLiveVehicleIcon,
  KarachiTileLayer,
  MapAutoResize,
} from './LeafletMapHelpers';

type AdminSection = 'overview' | 'kyc' | 'disputes' | 'ledger';

export const AdminDashboard: React.FC = () => {
  const {
    isAdminAuthenticated,
    lockAdminPanel,
    adminAllPools,
    adminAllUsersCount,
    adminAllTransactions,
    adminVerifications,
    updateAdminVerification,
    adminDisputes,
    updateAdminDispute,
    setReceiptModalTx,
  } = useSmartPool();

  const [section, setSection] = useState<AdminSection>('overview');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Female' | 'Male'>(
    'all'
  );

  const femaleCarIcon = useMemo(() => createLiveVehicleIcon(true), []);
  const maleCarIcon = useMemo(() => createLiveVehicleIcon(false), []);

  // Hard security guard — NEVER renders unless verified via backend Admin password
  if (!isAdminAuthenticated) return null;

  const activePools = adminAllPools.filter((p) => p.status === 'active');
  const femalePoolsCount = activePools.filter(
    (p) => p.allowedGender === 'Female'
  ).length;
  const malePoolsCount = activePools.filter(
    (p) => p.allowedGender === 'Male'
  ).length;
  const filteredPools =
    genderFilter === 'all'
      ? activePools
      : activePools.filter((p) => p.allowedGender === genderFilter);

  const pendingKycCount = adminVerifications.filter(
    (k) => k.status === 'pending'
  ).length;
  const openDisputesCount = adminDisputes.filter(
    (d) => d.status === 'open'
  ).length;
  const totalCorridorCo2 = Number(
    adminAllPools.reduce((sum, p) => sum + p.co2SavedKg, 0).toFixed(1)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Sticky Authenticated Admin Header */}
      <header className="sticky top-0 z-40 bg-[#0A192F]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-white truncate">
                  SmartPool System Control Unit
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[9.5px] font-extrabold text-emerald-300">
                  AUTHENTICATED · KARACHI OPS
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 truncate">
                NADRA KYC Oversight · Same-Gender Pool Isolation · SOS &amp; Escrow Resolution
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={lockAdminPanel}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-400/40 text-red-200 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            Lock &amp; Exit
          </button>
        </div>

        {/* Admin Section Tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'overview', label: 'Live Fleet & Gender Audit' },
              { id: 'kyc', label: `KYC Queue (${pendingKycCount})` },
              { id: 'disputes', label: `SOS & Disputes (${openDisputesCount})` },
              { id: 'ledger', label: `Ledger Audit (${adminAllTransactions.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                section === tab.id
                  ? 'bg-emerald-500 text-[#0A192F]'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4 pb-12">
        {/* City-Wide KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Karachi Pools
            </p>
            <p className="text-2xl font-extrabold font-mono-num text-white mt-1">
              {activePools.length}
            </p>
            <p className="text-[10.5px] text-slate-400 mt-1">
              <span className="text-pink-300 font-bold">
                {femalePoolsCount} Female-Only
              </span>{' '}
              ·{' '}
              <span className="text-sky-300 font-bold">
                {malePoolsCount} Male-Only
              </span>
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              KYC Verified Citizens
            </p>
            <p className="text-2xl font-extrabold font-mono-num text-emerald-400 mt-1">
              {adminAllUsersCount.toLocaleString()}
            </p>
            <p className="text-[10.5px] text-emerald-300/80 mt-1">
              100% Same-Gender Backend Lock
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pending KYC / Open SOS
            </p>
            <p className="text-2xl font-extrabold font-mono-num text-amber-300 mt-1">
              {pendingKycCount} / {openDisputesCount}
            </p>
            <p className="text-[10.5px] text-slate-400 mt-1">
              CNIC OCR + Escrow Dispute Queue
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Leaf className="w-3 h-3 text-emerald-400" /> Daily CO2 Cut
            </p>
            <p className="text-2xl font-extrabold font-mono-num text-emerald-400 mt-1">
              1,420 kg
            </p>
            <p className="text-[10.5px] text-slate-400 mt-1">
              +{totalCorridorCo2} kg on active routes
            </p>
          </div>
        </div>

        {/* SECTION 1: LIVE KARACHI FLEET & GENDER-ISOLATED POOL AUDIT */}
        {section === 'overview' && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
                <div>
                  <h2 className="text-sm font-extrabold text-white">
                    Live Karachi Corridor Telemetry (Zero-API-Key Map)
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Pink markers = KYC Female-Only pools · Blue markers = KYC Male-Only
                    pools
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {(['all', 'Female', 'Male'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenderFilter(g)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                        genderFilter === g
                          ? 'bg-emerald-500 text-[#0A192F]'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {g === 'all' ? 'All Corridors' : `${g}-Only`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[300px] w-full">
                <MapContainer
                  center={[24.872, 67.075]}
                  zoom={12}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <KarachiTileLayer />
                  <MapAutoResize triggerKey={`admin-map-${genderFilter}`} />

                  {filteredPools.map((pool, idx) => {
                    const isF = pool.allowedGender === 'Female';
                    const pos = interpolatePolyline(
                      pool.routePolyline,
                      0.35 + ((idx * 0.17) % 0.45)
                    );
                    return (
                      <React.Fragment key={pool.id}>
                        <Polyline
                          positions={pool.routePolyline}
                          pathOptions={{
                            color: isF ? '#DB2777' : '#0284C7',
                            weight: 4,
                            opacity: 0.85,
                          }}
                        />
                        <Marker
                          position={pos}
                          icon={isF ? femaleCarIcon : maleCarIcon}
                        >
                          <Popup>
                            <strong>
                              {pool.driverName} ({pool.plateNumber})
                            </strong>
                            <br />
                            {pool.allowedGender}-Only KYC Pool
                            <br />
                            {pool.origin} → {pool.destination}
                          </Popup>
                        </Marker>
                      </React.Fragment>
                    );
                  })}
                </MapContainer>
              </div>
            </div>

            {/* Pool Isolation Compliance Table */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                Backend KYC Gender Isolation Audit ({adminAllPools.length} Pools)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {adminAllPools.map((pool) => {
                  const isF = pool.allowedGender === 'Female';
                  const occupants = Object.values(pool.cabin.seats).filter(
                    Boolean
                  );
                  const allMatch =
                    pool.driverGender === pool.allowedGender &&
                    occupants.every((o) => o?.gender === pool.allowedGender);
                  return (
                    <div
                      key={pool.id}
                      className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-white truncate">
                          {pool.origin} → {pool.destination}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold ${
                            isF
                              ? 'bg-pink-500/20 text-pink-200 border border-pink-400/40'
                              : 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                          }`}
                        >
                          {pool.allowedGender}-Only
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Host: <strong className="text-slate-200">{pool.driverName}</strong>{' '}
                        ({pool.driverKycId}) · {pool.plateNumber}
                      </p>
                      <div className="flex items-center justify-between text-[10.5px] pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400 font-mono-num">
                          Seated: {occupants.length}/{pool.cabin.maxPassengerSeats} · Rs.
                          {pool.estimatedShare}/seat · {pool.status}
                        </span>
                        <span className="text-emerald-400 font-extrabold inline-flex items-center gap-1">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          {allMatch ? '100% KYC Match' : 'Flagged'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: NADRA CNIC & BIOMETRIC KYC VERIFICATION QUEUE */}
        {section === 'kyc' && (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <h2 className="text-sm font-extrabold text-white">
              NADRA CNIC OCR &amp; Biometric Liveness Verification Queue
            </h2>
            <div className="space-y-2.5">
              {adminVerifications.map((item) => {
                const isF = item.gender === 'Female';
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-white">
                          {item.applicantName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold ${
                            isF
                              ? 'bg-pink-500/20 text-pink-200'
                              : 'bg-sky-500/20 text-sky-200'
                          }`}
                        >
                          CNIC Gender: {item.gender}
                        </span>
                        <span className="text-[10.5px] font-mono-num text-emerald-400 font-bold">
                          OCR {item.ocrConfidence}% · Face {item.faceMatchScore}%
                        </span>
                      </div>
                      <p className="text-[11px] font-mono-num text-slate-400">
                        CNIC: {item.cnic} · SIM: {item.phone} · {item.submittedAt}
                      </p>
                      <p className="text-[11px] text-slate-300">{item.flagReason}</p>
                    </div>

                    {item.status === 'pending' ? (
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            updateAdminVerification(item.id, 'rescan_requested')
                          }
                          className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Re-Scan
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAdminVerification(item.id, 'rejected')}
                          className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-400/40 text-red-200 text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAdminVerification(item.id, 'approved')}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0A192F] text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve KYC
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                          item.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : item.status === 'rescan_requested'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 3: SOS INCIDENTS & ESCROW DISPUTE RESOLUTION */}
        {section === 'disputes' && (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Live SOS Emergency &amp; Escrow Dispute Queue
            </h2>
            <div className="space-y-2.5">
              {adminDisputes.map((dsp) => (
                <div
                  key={dsp.id}
                  className={`rounded-2xl bg-slate-950/80 border p-4 space-y-2.5 ${
                    dsp.severity === 'critical' && dsp.status === 'open'
                      ? 'border-red-500'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold font-mono-num text-white">
                          {dsp.caseCode}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase ${
                            dsp.severity === 'critical'
                              ? 'bg-red-500/25 text-red-200'
                              : 'bg-amber-500/25 text-amber-200'
                          }`}
                        >
                          {dsp.type} · {dsp.severity}
                        </span>
                        <span className="text-[11px] font-mono-num text-emerald-400 font-bold">
                          Escrow PKR {dsp.escrowAmountPkr}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Host: <strong>{dsp.driverName}</strong> · Rider:{' '}
                        <strong>{dsp.passengerName}</strong> ({dsp.corridor})
                      </p>
                      <p className="text-xs text-slate-400">{dsp.description}</p>
                      <p className="text-[10.5px] font-mono-num text-slate-500">
                        GPS: {dsp.gpsCoords} · {dsp.reportedAt}
                      </p>
                    </div>
                    {dsp.status !== 'open' && (
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-emerald-300 text-[10px] font-extrabold uppercase shrink-0">
                        {dsp.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {dsp.status === 'open' && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => updateAdminDispute(dsp.id, 'resolved_refund')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[11px] font-extrabold cursor-pointer"
                      >
                        Refund Rider Escrow
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAdminDispute(dsp.id, 'resolved_release')}
                        className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 text-[11px] font-extrabold cursor-pointer"
                      >
                        Release to Publisher
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAdminDispute(dsp.id, 'escalated')}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[11px] font-extrabold cursor-pointer"
                      >
                        Escalate to Police 15
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 4: READ-ONLY POSTGRESQL LEDGER AUDIT */}
        {section === 'ledger' && (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Append-Only Non-Profit PostgreSQL Ledger ({adminAllTransactions.length}{' '}
              Records)
            </h2>
            <div className="space-y-2">
              {adminAllTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setReceiptModalTx(tx)}
                  className="rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 p-3.5 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-white truncate">
                      {tx.title}{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        ({tx.roleScope})
                      </span>
                    </p>
                    <p className="text-[10.5px] font-mono-num text-slate-400 flex items-center gap-1 mt-0.5">
                      <FileText className="w-3 h-3 text-emerald-400" />
                      {tx.receiptNo} · {tx.method.toUpperCase()} ·{' '}
                      {tx.status.replace('_', ' ')}
                    </p>
                  </div>
                  <span className="text-xs font-extrabold font-mono-num text-emerald-400 shrink-0">
                    PKR {tx.amountPkr}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
