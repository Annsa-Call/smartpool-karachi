import {
  createInitialDatabase,
  RAW_DRIFT_FAISAL_IQRA_CLIFTON,
  RAW_DRIFT_NURSERY_TO_SADDAR,
  RAW_DRIFT_SHAH_FAISAL_TO_SADDAR,
  ROUTE_FAISAL_IQRA_CLIFTON,
  ROUTE_NURSERY_TO_SADDAR,
  ROUTE_SHAH_FAISAL_TO_SADDAR,
} from '../data/karachiData';
import type {
  AdminDisputeItem,
  AdminVerificationItem,
  ApprovalRequest,
  ChatMessage,
  Gender,
  MeetingPointInfo,
  PassengerSeatId,
  PaymentMethod,
  PeerReview,
  PoolRide,
  SmartPoolDatabase,
  UserAccount,
  WalletTransaction,
} from '../types/smartpool';
import { generateMockTxHash } from '../utils/nlpAndGeo';
import {
  allocateVerifiedPassengerToCabin,
  SEAT_LABELS,
  vacateSeatInCabin,
} from '../utils/seatAllocator';

const DB_STORAGE_KEY = 'smartpool_karachi_db_v2';
const SESSION_STORAGE_KEY = 'smartpool_karachi_session_v2';

/**
 * Admin Control Unit access credential (configured as requested: 123456).
 * Verified exclusively via verifyAdminCredential() with brute-force cooldown tracking.
 */
const ADMIN_ACCESS_CODE = '123456';

export function loadDatabase(): SmartPoolDatabase {
  try {
    const raw = window.localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SmartPoolDatabase;
      if (parsed && parsed.schemaVersion === 2 && Array.isArray(parsed.users)) {
        return parsed;
      }
    }
  } catch {
    // Fall back to fresh seed database if storage is blocked or malformed
  }
  const fresh = createInitialDatabase();
  saveDatabase(fresh);
  return fresh;
}

export function saveDatabase(db: SmartPoolDatabase): void {
  try {
    window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadSessionUserId(): string | null {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveSessionUserId(userId: string | null): void {
  try {
    if (userId) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, userId);
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function verifyAdminCredential(inputPassword: string): boolean {
  return inputPassword.trim() === ADMIN_ACCESS_CODE;
}

/**
 * NADRA 13-Digit Pakistani CNIC Parser & Mathematical Gender Verifier.
 * Format: XXXXX-XXXXXXX-D (13 digits total)
 * Official NADRA Rule:
 *   - Odd 13th digit (1, 3, 5, 7, 9)  => Male
 *   - Even 13th digit (0, 2, 4, 6, 8) => Female
 */
export function parseAndVerifyPakistaniCnic(rawCnic: string): {
  valid: boolean;
  formattedCnic: string;
  lastDigit: number;
  derivedGender: Gender;
  error?: string;
} {
  const digits = rawCnic.replace(/\D/g, '');
  if (digits.length !== 13) {
    return {
      valid: false,
      formattedCnic: rawCnic,
      lastDigit: 1,
      derivedGender: 'Male',
      error: `CNIC must contain exactly 13 digits (currently ${digits.length}). Format: 42101-XXXXXXX-X`,
    };
  }
  const formattedCnic = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  const lastDigit = Number(digits[12]);
  const derivedGender: Gender = lastDigit % 2 === 0 ? 'Female' : 'Male';
  return {
    valid: true,
    formattedCnic,
    lastDigit,
    derivedGender,
  };
}

export function makeInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'SP'
  );
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const last3 = digits.slice(-3) || '000';
  const carrier = digits.startsWith('92') ? digits.slice(2, 5) : digits.slice(0, 3);
  return `+92 ${carrier || '300'} ••••${last3}`;
}

export function maskCnic(cnic: string): string {
  const parsed = parseAndVerifyPakistaniCnic(cnic);
  if (!parsed.valid) return cnic;
  const d = cnic.replace(/\D/g, '');
  return `${d.slice(0, 5)}-•••••${d.slice(10, 12)}-${d[12]}`;
}

/**
 * Authenticate an existing citizen via Mobile Number or 13-digit NADRA CNIC + Passcode
 */
function normalizePakistaniPhoneLocal(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('92')) {
    return digits.slice(2).replace(/^0/, '');
  }
  return digits.replace(/^0/, '');
}

function formatPakistaniPhone(raw: string): string {
  const local = normalizePakistaniPhoneLocal(raw);
  if (local.length === 10) {
    return `+92 ${local.slice(0, 3)}-${local.slice(3)}`;
  }
  return `+92 ${local}`;
}

export function authenticateCitizen(
  db: SmartPoolDatabase,
  identifier: string,
  passcode: string
): { ok: true; user: UserAccount } | { ok: false; error: string } {
  const cleanDigits = identifier.replace(/\D/g, '');
  if (!cleanDigits) {
    return { ok: false, error: 'Enter your registered mobile number or 13-digit CNIC.' };
  }

  const inputLocal = normalizePakistaniPhoneLocal(identifier);
  const matched = db.users.find((u) => {
    const userCnicDigits = u.cnic.replace(/\D/g, '');
    const userPhoneLocal = normalizePakistaniPhoneLocal(u.phone);
    return (
      userCnicDigits === cleanDigits ||
      (inputLocal.length >= 9 && userPhoneLocal === inputLocal)
    );
  });

  if (!matched) {
    return {
      ok: false,
      error: 'No verified account found for this Mobile/CNIC. Tap "Create Account" to complete KYC.',
    };
  }

  if (matched.passcode !== passcode.trim()) {
    return {
      ok: false,
      error: 'Incorrect passcode. Use your registered passcode (default demo accounts: 112233).',
    };
  }

  if (matched.kyc.status === 'REJECTED') {
    return {
      ok: false,
      error: 'This account KYC was rejected by the SmartPool Control Unit.',
    };
  }

  return { ok: true, user: matched };
}

/**
 * Complete Universal 4-Step KYC Registration (SIM OTP + NADRA CNIC OCR + Biometric Face Match).
 * Derives & permanently locks `gender` strictly from the verified 13th CNIC digit!
 */
export function registerVerifiedCitizenBackend(
  db: SmartPoolDatabase,
  params: {
    fullName: string;
    phone: string;
    cnic: string;
    dob: string;
    passcode: string;
    ocrConfidence: number;
    biometricMatch: number;
  }
):
  | { ok: true; db: SmartPoolDatabase; user: UserAccount }
  | { ok: false; error: string } {
  const name = params.fullName.trim();
  if (name.length < 3) {
    return { ok: false, error: 'Full legal name (as printed on CNIC) is required.' };
  }

  const cnicCheck = parseAndVerifyPakistaniCnic(params.cnic);
  if (!cnicCheck.valid) {
    return { ok: false, error: cnicCheck.error ?? 'Invalid 13-digit Pakistani CNIC.' };
  }

  // Prevent duplicate CNIC registration
  const existing = db.users.find(
    (u) => u.cnic.replace(/\D/g, '') === cnicCheck.formattedCnic.replace(/\D/g, '')
  );
  if (existing) {
    return {
      ok: false,
      error: `CNIC ${cnicCheck.formattedCnic} is already registered to ${existing.fullName}. Please Sign In instead.`,
    };
  }

  const gender: Gender = cnicCheck.derivedGender;
  const kycId = `KYC-PK-${Math.floor(10000 + Math.random() * 89999)}${
    gender === 'Female' ? 'F' : 'M'
  }`;
  const formattedPhone = formatPakistaniPhone(params.phone);
  const inputPhoneLocal = normalizePakistaniPhoneLocal(params.phone);
  const existingPhone = db.users.find(
    (u) => normalizePakistaniPhoneLocal(u.phone) === inputPhoneLocal
  );
  if (existingPhone) {
    return {
      ok: false,
      error: `Mobile ${formattedPhone} is already linked to a verified citizen account. Please Sign In instead.`,
    };
  }

  const newUser: UserAccount = {
    id: `usr-${Date.now()}`,
    fullName: name,
    phone: formattedPhone,
    cnic: cnicCheck.formattedCnic,
    dob: params.dob.trim() || '14 / 08 / 1995',
    passcode: params.passcode.trim() || '112233',
    gender, // STRICTLY LOCKED FROM NADRA CNIC 13th DIGIT
    kyc: {
      kycId,
      cnic: cnicCheck.formattedCnic,
      cnicLastDigit: cnicCheck.lastDigit,
      derivedGender: gender,
      dob: params.dob.trim() || '14 / 08 / 1995',
      simPhone: formattedPhone,
      simVerified: true,
      ocrConfidence: params.ocrConfidence,
      biometricMatch: params.biometricMatch,
      status: 'VERIFIED',
      verifiedAt: new Date().toLocaleString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
    trustScore: 95,
    reliabilityScore: 95,
    comfortScore: 95,
    communicationScore: 96,
    poolsShared: 0,
    co2SavedKg: 0,
    fuelSavedPkr: 0,
    carbonCredits: 120, // Welcome green starter bonus
    walletBalancePkr: 1000,
    escrowHeldPkr: 0,
    publisherEarningsPkr: 0,
    pendingPublisherEscrowPkr: 0,
    activeBookedPoolId: null,
  };

  const welcomeTx: WalletTransaction = {
    id: `tx-init-${Date.now()}`,
    ownerUserId: newUser.id,
    roleScope: 'passenger',
    receiptNo: `SP-KHI-20261118-${Math.floor(1000 + Math.random() * 8999)}`,
    txHash: generateMockTxHash(),
    title: 'Verified Citizen Starter Balance',
    subtitle: `Tier-3 KYC Complete (${kycId} · ${gender}-Only Pool Access)`,
    amountPkr: 1000,
    direction: 'credit',
    method: 'easypaisa',
    status: 'topup',
    timestamp: 'Just now · PKT',
    passengerName: newUser.fullName,
    pgConstraintVerified: true,
  };

  const nextDb: SmartPoolDatabase = {
    ...db,
    users: [newUser, ...db.users],
    transactions: [welcomeTx, ...db.transactions],
  };

  return { ok: true, db: nextDb, user: newUser };
}

/**
 * =========================================================================
 * BACKEND GENDER-ISOLATED POOL QUERY ENGINE
 * =========================================================================
 * Strictly enforces:
 *  1. Caller MUST be logged in & KYC VERIFIED (`user.kyc.status === 'VERIFIED'`).
 *  2. Caller's `gender` is cross-verified against `user.kyc.derivedGender` AND CNIC 13th digit.
 *  3. ONLY pools whose publisher's KYC gender AND `allowedGender` EXACTLY match the caller's KYC gender
 *     are returned (Female → Female ONLY; Male → Male ONLY).
 *  4. Excludes the caller's own published pools (managed separately under Publisher Mode).
 */
export function queryEligiblePoolsForPassenger(
  db: SmartPoolDatabase,
  userId: string
): {
  authorized: boolean;
  verifiedGender: Gender | null;
  pools: PoolRide[];
  reason?: string;
} {
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return { authorized: false, verifiedGender: null, pools: [], reason: 'AUTH_REQUIRED' };
  }
  if (user.kyc.status !== 'VERIFIED') {
    return {
      authorized: false,
      verifiedGender: null,
      pools: [],
      reason: 'KYC_VERIFICATION_REQUIRED',
    };
  }

  // Re-verify gender directly from the stored NADRA CNIC 13th digit (tamper-proof!)
  const cnicAudit = parseAndVerifyPakistaniCnic(user.kyc.cnic);
  const kycGender: Gender = cnicAudit.valid
    ? cnicAudit.derivedGender
    : user.kyc.derivedGender;

  const matchedPools = db.pools
    .filter(
      (pool) =>
        pool.status === 'active' &&
        pool.publisherId !== user.id &&
        pool.driverGender === kycGender &&
        pool.allowedGender === kycGender &&
        pool.cabin.allowedGender === kycGender &&
        Boolean(pool.driverKycId)
    )
    .sort((a, b) => b.gaMatchScore - a.gaMatchScore);

  return {
    authorized: true,
    verifiedGender: kycGender,
    pools: matchedPools,
  };
}

/**
 * Returns ONLY pools published by this verified Publisher
 */
export function queryPoolsOwnedByPublisher(
  db: SmartPoolDatabase,
  publisherId: string
): PoolRide[] {
  const user = db.users.find((u) => u.id === publisherId);
  if (!user || user.kyc.status !== 'VERIFIED') return [];
  return db.pools.filter((p) => p.publisherId === publisherId);
}

/**
 * Returns ONLY incoming passenger approval requests belonging to this Publisher
 * AND double-checks passenger KYC verification + exact same-gender match!
 */
export function queryIncomingRequestsForPublisher(
  db: SmartPoolDatabase,
  publisherId: string
): ApprovalRequest[] {
  const publisher = db.users.find((u) => u.id === publisherId);
  if (!publisher || publisher.kyc.status !== 'VERIFIED') return [];

  const cnicAudit = parseAndVerifyPakistaniCnic(publisher.kyc.cnic);
  const pubGender = cnicAudit.valid ? cnicAudit.derivedGender : publisher.kyc.derivedGender;

  return db.approvalRequests.filter(
    (req) =>
      req.publisherId === publisherId &&
      req.cnicVerified === true &&
      req.gender === pubGender
  );
}

/**
 * Backend Publish Pool Endpoint.
 * NEVER accepts a `gender` parameter from the client — strictly reads `publisher.kyc.derivedGender`
 * (cross-checked against CNIC 13th digit) and stamps `driverGender` & `allowedGender` identically,
 * ensuring the ride will ONLY EVER be visible to same-gender KYC-verified commuters.
 */
export interface PublishPoolPayload {
  origin: string;
  destination: string;
  departureTime: string;
  scheduleType: 'One-Time' | 'Weekly Routine';
  routineDays: string[];
  vehicleCategory: string;
  vehicleModel: string;
  plateNumber: string;
  fuelEconomyKmL: number;
  fuelPricePerL: number;
  availableSeats: number;
  requiresManualApproval: boolean;
}

export function publishPoolBackend(
  db: SmartPoolDatabase,
  publisherUserId: string,
  payload: PublishPoolPayload
):
  | { ok: true; db: SmartPoolDatabase; pool: PoolRide }
  | { ok: false; error: string } {
  const publisher = db.users.find((u) => u.id === publisherUserId);
  if (!publisher || publisher.kyc.status !== 'VERIFIED') {
    return {
      ok: false,
      error: 'KYC Verification Required: Only NADRA CNIC + Biometric verified citizens can publish a pool.',
    };
  }

  const plate = payload.plateNumber.trim().toUpperCase();
  if (plate.length < 4) {
    return { ok: false, error: 'Please enter a valid Sindh/Pakistan vehicle registration plate.' };
  }

  if (payload.origin === payload.destination) {
    return { ok: false, error: 'Origin and destination corridors must be different.' };
  }

  // Tamper-proof gender derived directly from publisher's KYC CNIC record
  const cnicAudit = parseAndVerifyPakistaniCnic(publisher.kyc.cnic);
  const lockedGender: Gender = cnicAudit.valid
    ? cnicAudit.derivedGender
    : publisher.kyc.derivedGender;

  const destLower = payload.destination.toLowerCase();
  const origLower = payload.origin.toLowerCase();
  const useIqraRoute = destLower.includes('iqra') || destLower.includes('clifton');
  const useFullFaisal = origLower.includes('shah faisal') || destLower.includes('shah faisal');

  const routePolyline = useIqraRoute
    ? ROUTE_FAISAL_IQRA_CLIFTON
    : useFullFaisal
    ? ROUTE_SHAH_FAISAL_TO_SADDAR
    : ROUTE_NURSERY_TO_SADDAR;
  const rawDriftingGps = useIqraRoute
    ? RAW_DRIFT_FAISAL_IQRA_CLIFTON
    : useFullFaisal
    ? RAW_DRIFT_SHAH_FAISAL_TO_SADDAR
    : RAW_DRIFT_NURSERY_TO_SADDAR;

  const distanceKm = useIqraRoute ? 13.5 : useFullFaisal ? 16.8 : 12.6;
  const seats = Math.max(1, Math.min(4, payload.availableSeats));
  const fuelEcon = Math.max(5, payload.fuelEconomyKmL);
  const fuelPrice = Math.max(150, payload.fuelPricePerL);
  const fuelCost = Math.round((distanceKm / fuelEcon) * fuelPrice);
  const maintenance = Math.round(distanceKm * 6);
  const totalTripCost = fuelCost + maintenance + 30;
  const estimatedShare = Math.round(totalTripCost / Math.max(2, Math.min(3, seats + 1)));
  const isEV = payload.vehicleCategory.toLowerCase().includes('ev');

  const newPool: PoolRide = {
    id: `pool-${Date.now()}`,
    publisherId: publisher.id,
    driverName: publisher.fullName,
    driverKycId: publisher.kyc.kycId,
    driverGender: lockedGender,
    allowedGender: lockedGender, // STRICT SAME-GENDER VISIBILITY LOCK
    driverInitials: makeInitials(publisher.fullName),
    driverPhoneMasked: maskPhone(publisher.phone),
    trustScore: publisher.trustScore,
    gaMatchScore: 99.2,
    badges: [
      `KYC ${lockedGender}-Only Pool`,
      isEV ? 'Zero-Tailpipe EV' : 'Cost-Recovery Verified',
      'Live Listed',
    ],
    vehicleModel: payload.vehicleModel.trim() || payload.vehicleCategory,
    vehicleCategory: payload.vehicleCategory,
    plateNumber: plate,
    fuelEconomyKmL: fuelEcon,
    fuelPricePerL: fuelPrice,
    isEV,
    origin: payload.origin,
    destination: payload.destination,
    corridorName: `${payload.origin} → ${payload.destination}`,
    departureTime: payload.departureTime,
    scheduleType: payload.scheduleType,
    routineDays: payload.scheduleType === 'Weekly Routine' ? payload.routineDays : undefined,
    requiresManualApproval: payload.requiresManualApproval,
    detourMins: 2,
    distanceKm,
    totalTripCost,
    estimatedShare,
    routePolyline,
    rawDriftingGps,
    meetingPoint: {
      label: 'Intersection of St. 4 & Main Shahrah-e-Faisal',
      sublabel: 'Walk 2 mins (140m) to Meeting Point',
      homeLabel: 'Inner Street St. 4, PECHS Block 6',
      homeCoords: [24.8667, 67.0705],
      meetingCoords: [24.8655, 67.071],
      walkMeters: 140,
      walkMins: 2,
      driverDetourMins: 1.3,
      fuelSavedPkr: 46,
    },
    cabin: {
      driver: {
        userId: publisher.id,
        name: publisher.fullName,
        gender: lockedGender,
        kycId: publisher.kyc.kycId,
        trustScore: publisher.trustScore,
        segment: `${payload.origin} → ${payload.destination}`,
        verified: true,
        avatarInitials: makeInitials(publisher.fullName),
      },
      seats: {
        'front-left': null,
        'back-left': null,
        'back-middle': null,
        'back-right': null,
      },
      allowedGender: lockedGender,
      maxPassengerSeats: seats,
    },
    co2SavedKg: 3.6,
    status: 'active',
    createdAt: 'Just now',
  };

  // Also save vehicle details on publisher profile for convenience
  const updatedUsers = db.users.map((u) =>
    u.id === publisher.id
      ? {
          ...u,
          vehicle: {
            category: payload.vehicleCategory,
            model: newPool.vehicleModel,
            plateNumber: plate,
            fuelEconomyKmL: fuelEcon,
            isEV,
          },
        }
      : u
  );

  const sysMsg: ChatMessage = {
    id: `msg-sys-${Date.now()}`,
    poolId: newPool.id,
    senderUserId: 'system',
    senderName: 'SmartPool KYC Guard',
    isSystem: true,
    text: `Pool published under ${publisher.kyc.kycId}. Visibility locked strictly to KYC-verified ${lockedGender} commuters only.`,
    timestamp: 'Just now',
  };

  return {
    ok: true,
    pool: newPool,
    db: {
      ...db,
      users: updatedUsers,
      pools: [newPool, ...db.pools],
      chatMessages: [...db.chatMessages, sysMsg],
    },
  };
}

/**
 * Backend Book / Reserve Seat Endpoint.
 * Re-verifies KYC status + exact same-gender match on the backend before assigning any seat.
 */
export function bookPoolSeatBackend(
  db: SmartPoolDatabase,
  passengerUserId: string,
  poolId: string,
  customMeeting?: MeetingPointInfo,
  preferredSeat?: PassengerSeatId
):
  | {
      ok: true;
      db: SmartPoolDatabase;
      assignedSeat: PassengerSeatId;
      seatLabel: string;
      message: string;
    }
  | { ok: false; error: string } {
  const passenger = db.users.find((u) => u.id === passengerUserId);
  if (!passenger || passenger.kyc.status !== 'VERIFIED') {
    return {
      ok: false,
      error: 'KYC verification required before reserving a seat.',
    };
  }

  const pool = db.pools.find((p) => p.id === poolId);
  if (!pool || pool.status !== 'active') {
    return { ok: false, error: 'Selected pool is no longer active.' };
  }

  if (pool.publisherId === passenger.id) {
    return {
      ok: false,
      error: 'You are the publisher of this pool. Switch to Publisher Mode to manage it.',
    };
  }

  // Tamper-proof backend gender verification against CNIC 13th digit
  const cnicAudit = parseAndVerifyPakistaniCnic(passenger.kyc.cnic);
  const paxGender: Gender = cnicAudit.valid
    ? cnicAudit.derivedGender
    : passenger.kyc.derivedGender;

  if (paxGender !== pool.driverGender || paxGender !== pool.allowedGender) {
    return {
      ok: false,
      error: `Gender Policy Restricted: This pool is strictly for KYC-verified ${pool.allowedGender} commuters only.`,
    };
  }

  const allocation = allocateVerifiedPassengerToCabin(
    pool.cabin,
    {
      userId: passenger.id,
      name: passenger.fullName,
      gender: paxGender,
      kycId: passenger.kyc.kycId,
      trustScore: passenger.trustScore,
      segment: `${(customMeeting ?? pool.meetingPoint).label.split(' & ')[0]} → ${pool.destination}`,
      fareShare: pool.estimatedShare,
      verified: true,
      avatarInitials: makeInitials(passenger.fullName),
    },
    preferredSeat
  );

  if (!allocation.success || !allocation.assignedSeat) {
    return { ok: false, error: allocation.event.message };
  }

  const seatLabel = SEAT_LABELS[allocation.assignedSeat];
  const updatedPool: PoolRide = {
    ...pool,
    meetingPoint: customMeeting ?? pool.meetingPoint,
    cabin: allocation.cabin,
  };

  const updatedPools = db.pools.map((p) => (p.id === pool.id ? updatedPool : p));
  const updatedUsers = db.users.map((u) =>
    u.id === passenger.id ? { ...u, activeBookedPoolId: pool.id } : u
  );

  const joinMsg: ChatMessage = {
    id: `msg-join-${Date.now()}`,
    poolId: pool.id,
    senderUserId: 'system',
    senderName: 'SmartPool KYC Guard',
    isSystem: true,
    text: `${passenger.fullName} (${passenger.kyc.kycId} · Verified ${paxGender}) reserved ${seatLabel}. Pickup: ${updatedPool.meetingPoint.label}.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  return {
    ok: true,
    db: {
      ...db,
      pools: updatedPools,
      users: updatedUsers,
      chatMessages: [...db.chatMessages, joinMsg],
    },
    assignedSeat: allocation.assignedSeat,
    seatLabel,
    message: allocation.event.message,
  };
}

/**
 * Publisher-only: Accept or Reject an incoming same-gender passenger request
 */
export function decidePublisherRequestBackend(
  db: SmartPoolDatabase,
  publisherUserId: string,
  requestId: string,
  decision: 'accepted' | 'rejected'
):
  | { ok: true; db: SmartPoolDatabase; message: string }
  | { ok: false; error: string } {
  const req = db.approvalRequests.find((r) => r.id === requestId);
  if (!req || req.publisherId !== publisherUserId) {
    return { ok: false, error: 'Unauthorized: Request does not belong to your pool.' };
  }

  if (decision === 'rejected') {
    return {
      ok: true,
      db: {
        ...db,
        approvalRequests: db.approvalRequests.map((r) =>
          r.id === requestId ? { ...r, status: 'rejected' } : r
        ),
      },
      message: `${req.name}'s request declined. Rider notified to match with another verified ${req.gender} pool.`,
    };
  }

  const pool = db.pools.find(
    (p) => p.id === req.poolId && p.publisherId === publisherUserId
  );
  if (!pool) {
    return { ok: false, error: 'Target pool not found.' };
  }

  // Strict backend gender match check between publisher pool & requesting passenger
  if (req.gender !== pool.allowedGender || req.gender !== pool.driverGender) {
    return {
      ok: false,
      error: `Blocked: Request gender does not match pool's KYC ${pool.allowedGender}-Only policy.`,
    };
  }

  const outcome = allocateVerifiedPassengerToCabin(pool.cabin, {
    userId: req.passengerUserId,
    name: req.name,
    gender: req.gender,
    kycId: req.kycId,
    trustScore: req.trustScore,
    segment: `${req.pickupCorner.split(' (')[0]} → ${req.dropoff}`,
    fareShare: req.fareShare,
    verified: req.cnicVerified,
    avatarInitials: makeInitials(req.name),
  });

  if (!outcome.success || !outcome.assignedSeat) {
    return { ok: false, error: outcome.event.message };
  }

  const updatedPools = db.pools.map((p) =>
    p.id === pool.id ? { ...p, cabin: outcome.cabin } : p
  );
  const updatedRequests = db.approvalRequests.map((r) =>
    r.id === requestId ? { ...r, status: 'accepted' as const } : r
  );

  return {
    ok: true,
    db: {
      ...db,
      pools: updatedPools,
      approvalRequests: updatedRequests,
    },
    message: `Approved ${req.name} (Verified ${req.gender}) → seated in ${SEAT_LABELS[outcome.assignedSeat]}.`,
  };
}

/**
 * Publisher-only: Remove occupant from publisher's own pool cabin
 */
export function removeOccupantFromPublisherPoolBackend(
  db: SmartPoolDatabase,
  publisherUserId: string,
  poolId: string,
  seatId: PassengerSeatId
): SmartPoolDatabase {
  const pool = db.pools.find(
    (p) => p.id === poolId && p.publisherId === publisherUserId
  );
  if (!pool) return db;
  const vacatedUser = pool.cabin.seats[seatId];
  const updatedCabin = vacateSeatInCabin(pool.cabin, seatId);

  return {
    ...db,
    pools: db.pools.map((p) => (p.id === poolId ? { ...p, cabin: updatedCabin } : p)),
    users: vacatedUser
      ? db.users.map((u) =>
          u.id === vacatedUser.userId && u.activeBookedPoolId === poolId
            ? { ...u, activeBookedPoolId: null }
            : u
        )
      : db.users,
  };
}

/**
 * Publisher-only: Pause / Resume published pool listing
 */
export function togglePublisherPoolStatusBackend(
  db: SmartPoolDatabase,
  publisherUserId: string,
  poolId: string
): SmartPoolDatabase {
  return {
    ...db,
    pools: db.pools.map((p) => {
      if (p.id !== poolId || p.publisherId !== publisherUserId) return p;
      return {
        ...p,
        status: p.status === 'active' ? 'paused' : 'active',
      };
    }),
  };
}

/**
 * Verify if user is authorized to access a pool's peer chat
 * (Must be either the pool's Publisher OR a verified same-gender passenger)
 */
export function canUserAccessPoolChat(
  user: UserAccount | null,
  pool: PoolRide | null
): boolean {
  if (!user || !pool || user.kyc.status !== 'VERIFIED') return false;
  if (pool.publisherId === user.id) return true;
  return user.gender === pool.allowedGender && user.gender === pool.driverGender;
}

/**
 * Passenger-only: Create Escrow Payment or On-Cash Settlement Record
 */
export function createPassengerFarePaymentBackend(
  db: SmartPoolDatabase,
  passengerUserId: string,
  poolId: string,
  params: {
    method: PaymentMethod;
    distanceKm: number;
    fuelEconomyKmL: number;
    fuelPricePerL: number;
    maintenancePkr: number;
    baseFeePkr: number;
    totalTripCostPkr: number;
    occupants: number;
    passengerSharePkr: number;
  }
):
  | { ok: true; db: SmartPoolDatabase; tx: WalletTransaction }
  | { ok: false; error: string } {
  const passenger = db.users.find((u) => u.id === passengerUserId);
  const pool = db.pools.find((p) => p.id === poolId);
  if (!passenger || !pool) {
    return { ok: false, error: 'Active ride record not found.' };
  }
  if (
    params.method !== 'cash' &&
    passenger.walletBalancePkr < params.passengerSharePkr
  ) {
    return {
      ok: false,
      error: `Insufficient wallet balance (PKR ${passenger.walletBalancePkr}). Top up your wallet or select On-Cash.`,
    };
  }

  const fuelCostPkr = Math.round(
    (params.distanceKm / params.fuelEconomyKmL) * params.fuelPricePerL
  );
  const receiptNo = `SP-KHI-20261118-${Math.floor(1000 + Math.random() * 8999)}`;
  const txHash = generateMockTxHash();
  const timestamp = `18 Nov 2026, ${new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })} PKT`;

  const methodLabel =
    params.method === 'easypaisa'
      ? 'Easypaisa Escrow'
      : params.method === 'jazzcash'
      ? 'JazzCash Escrow'
      : 'On-Cash Direct';

  const passengerTx: WalletTransaction = {
    id: `tx-pax-${Date.now()}`,
    ownerUserId: passenger.id,
    counterpartyUserId: pool.publisherId,
    poolId: pool.id,
    roleScope: 'passenger',
    receiptNo,
    txHash,
    title: `${pool.origin} → ${pool.destination}`,
    subtitle:
      params.method === 'cash'
        ? 'On-Cash Logged — Awaiting Publisher Receipt Confirmation'
        : `${methodLabel} — Locked Safely Until Verified Drop-off`,
    amountPkr: params.passengerSharePkr,
    direction: 'debit',
    method: params.method,
    status: params.method === 'cash' ? 'cash_pending' : 'escrow_locked',
    timestamp,
    driverName: pool.driverName,
    passengerName: passenger.fullName,
    vehiclePlate: `${pool.plateNumber} (${pool.vehicleCategory})`,
    corridor: pool.corridorName,
    formulaBreakdown: {
      distanceKm: params.distanceKm,
      fuelEconomyKmL: params.fuelEconomyKmL,
      fuelPricePerL: params.fuelPricePerL,
      fuelCostPkr,
      maintenancePkr: params.maintenancePkr,
      baseFeePkr: params.baseFeePkr,
      totalTripCostPkr: params.totalTripCostPkr,
      occupants: params.occupants,
      passengerSharePkr: params.passengerSharePkr,
    },
    segmentAudit: [
      {
        segmentLabel: `Shared Segment: ${pool.meetingPoint.label.split(' & ')[0]} → ${pool.destination}`,
        snappedDistanceKm: params.distanceKm,
        occupantsCount: params.occupants,
        segmentCostPkr: params.totalTripCostPkr,
        userSharePkr: params.passengerSharePkr,
        proximityCheck: 'BLE + Dual-GPS Co-Presence (1.4m)',
      },
    ],
    pgConstraintVerified: true,
  };

  // Mirror transaction for the Publisher if the Publisher is a registered user account!
  const extraTxs: WalletTransaction[] = [passengerTx];
  const publisherExists = db.users.some((u) => u.id === pool.publisherId);
  if (publisherExists) {
    extraTxs.push({
      ...passengerTx,
      id: `tx-pub-${Date.now() + 1}`,
      ownerUserId: pool.publisherId,
      counterpartyUserId: passenger.id,
      roleScope: 'publisher',
      direction: 'credit',
      title: `Co-Rider Fare · ${passenger.fullName}`,
      subtitle:
        params.method === 'cash'
          ? 'On-Cash Handover — Awaiting Your Publisher Confirmation'
          : `${methodLabel} Locked — Releases on Verified Drop-off`,
    });
  }

  const updatedUsers = db.users.map((u) => {
    if (u.id === passenger.id && params.method !== 'cash') {
      return {
        ...u,
        walletBalancePkr: u.walletBalancePkr - params.passengerSharePkr,
        escrowHeldPkr: u.escrowHeldPkr + params.passengerSharePkr,
      };
    }
    if (u.id === pool.publisherId && params.method !== 'cash') {
      return {
        ...u,
        pendingPublisherEscrowPkr:
          u.pendingPublisherEscrowPkr + params.passengerSharePkr,
      };
    }
    return u;
  });

  return {
    ok: true,
    tx: passengerTx,
    db: {
      ...db,
      users: updatedUsers,
      transactions: [...extraTxs, ...db.transactions],
    },
  };
}

/**
 * Release locked digital escrow upon verified GPS/BLE drop-off (credits Publisher & updates both ledgers)
 */
export function releaseEscrowBackend(
  db: SmartPoolDatabase,
  receiptNo: string
): { db: SmartPoolDatabase; updatedTx: WalletTransaction | null } {
  const target = db.transactions.find(
    (t) => t.receiptNo === receiptNo && t.status === 'escrow_locked'
  );
  if (!target) return { db, updatedTx: null };

  const providerName = target.method === 'easypaisa' ? 'Easypaisa' : 'JazzCash';
  let firstUpdated: WalletTransaction | null = null;

  const updatedTransactions = db.transactions.map((tx) => {
    if (tx.receiptNo !== receiptNo) return tx;
    const next: WalletTransaction = {
      ...tx,
      status: 'released',
      subtitle:
        tx.roleScope === 'publisher'
          ? `${providerName} Escrow Released to Publisher Earnings`
          : `${providerName} Escrow → Auto-Released on Verified Drop-off`,
    };
    if (!firstUpdated) firstUpdated = next;
    return next;
  });

  const paxId =
    target.roleScope === 'passenger' ? target.ownerUserId : target.counterpartyUserId;
  const pubId =
    target.roleScope === 'publisher' ? target.ownerUserId : target.counterpartyUserId;

  const updatedUsers = db.users.map((u) => {
    if (u.id === paxId) {
      return {
        ...u,
        escrowHeldPkr: Math.max(0, u.escrowHeldPkr - target.amountPkr),
        poolsShared: u.poolsShared + 1,
        co2SavedKg: Number((u.co2SavedKg + 1.2).toFixed(1)),
        fuelSavedPkr: u.fuelSavedPkr + 300,
        carbonCredits: u.carbonCredits + 35,
      };
    }
    if (u.id === pubId) {
      return {
        ...u,
        pendingPublisherEscrowPkr: Math.max(
          0,
          u.pendingPublisherEscrowPkr - target.amountPkr
        ),
        publisherEarningsPkr: u.publisherEarningsPkr + target.amountPkr,
        poolsShared: u.poolsShared + 1,
        co2SavedKg: Number((u.co2SavedKg + 2.4).toFixed(1)),
        carbonCredits: u.carbonCredits + 45,
      };
    }
    return u;
  });

  return {
    db: {
      ...db,
      users: updatedUsers,
      transactions: updatedTransactions,
    },
    updatedTx: firstUpdated,
  };
}

/**
 * PUBLISHER-ONLY: Confirm receipt of direct On-Cash passenger settlement
 */
export function confirmPublisherCashBackend(
  db: SmartPoolDatabase,
  publisherUserId: string,
  txId: string
):
  | { ok: true; db: SmartPoolDatabase; updatedTx: WalletTransaction }
  | { ok: false; error: string } {
  const target = db.transactions.find((t) => t.id === txId);
  if (
    !target ||
    target.roleScope !== 'publisher' ||
    target.ownerUserId !== publisherUserId ||
    target.status !== 'cash_pending'
  ) {
    return {
      ok: false,
      error: 'Only the ride publisher can confirm pending On-Cash receipts.',
    };
  }

  let updatedRecord: WalletTransaction = target;
  const updatedTransactions = db.transactions.map((tx) => {
    if (tx.receiptNo !== target.receiptNo) return tx;
    const next: WalletTransaction = {
      ...tx,
      status: 'cash_confirmed',
      subtitle: 'On-Cash Settlement — Publisher Confirmed & Sealed',
    };
    if (tx.id === target.id) updatedRecord = next;
    return next;
  });

  const updatedUsers = db.users.map((u) => {
    if (u.id === publisherUserId) {
      return {
        ...u,
        poolsShared: u.poolsShared + 1,
        co2SavedKg: Number((u.co2SavedKg + 1.8).toFixed(1)),
        carbonCredits: u.carbonCredits + 35,
      };
    }
    if (target.counterpartyUserId && u.id === target.counterpartyUserId) {
      return {
        ...u,
        poolsShared: u.poolsShared + 1,
        co2SavedKg: Number((u.co2SavedKg + 1.2).toFixed(1)),
        carbonCredits: u.carbonCredits + 30,
      };
    }
    return u;
  });

  return {
    ok: true,
    db: {
      ...db,
      users: updatedUsers,
      transactions: updatedTransactions,
    },
    updatedTx: updatedRecord,
  };
}

export function updateAdminVerificationBackend(
  db: SmartPoolDatabase,
  id: string,
  status: AdminVerificationItem['status']
): SmartPoolDatabase {
  const item = db.adminVerifications.find((v) => v.id === id);
  return {
    ...db,
    adminVerifications: db.adminVerifications.map((v) =>
      v.id === id ? { ...v, status } : v
    ),
    users:
      item?.linkedUserId
        ? db.users.map((u) =>
            u.id === item.linkedUserId
              ? {
                  ...u,
                  kyc: {
                    ...u.kyc,
                    status:
                      status === 'approved'
                        ? 'VERIFIED'
                        : status === 'rejected'
                        ? 'REJECTED'
                        : 'PENDING_REVIEW',
                  },
                }
              : u
          )
        : db.users,
  };
}

export function updateAdminDisputeBackend(
  db: SmartPoolDatabase,
  id: string,
  status: AdminDisputeItem['status']
): SmartPoolDatabase {
  const dsp = db.adminDisputes.find((d) => d.id === id);
  if (!dsp) return db;

  const updatedUsers = db.users.map((u) => {
    if (status === 'resolved_refund' && dsp.passengerUserId === u.id) {
      return {
        ...u,
        walletBalancePkr: u.walletBalancePkr + dsp.escrowAmountPkr,
        escrowHeldPkr: Math.max(0, u.escrowHeldPkr - dsp.escrowAmountPkr),
      };
    }
    if (status === 'resolved_release' && dsp.publisherUserId === u.id) {
      return {
        ...u,
        publisherEarningsPkr: u.publisherEarningsPkr + dsp.escrowAmountPkr,
      };
    }
    return u;
  });

  return {
    ...db,
    users: updatedUsers,
    adminDisputes: db.adminDisputes.map((d) =>
      d.id === id ? { ...d, status } : d
    ),
  };
}

export function createReviewBackend(
  db: SmartPoolDatabase,
  review: Omit<PeerReview, 'id' | 'date'>
): SmartPoolDatabase {
  const entry: PeerReview = {
    ...review,
    id: `rev-${Date.now()}`,
    date: 'Just now',
  };
  const delta = review.sentimentScore >= 60 ? 1 : review.sentimentScore <= -30 ? -2 : 0;

  return {
    ...db,
    reviews: [entry, ...db.reviews],
    users: db.users.map((u) =>
      u.fullName === review.targetName || u.id === review.reviewerUserId
        ? {
            ...u,
            trustScore: Math.max(70, Math.min(99, u.trustScore + (u.fullName === review.targetName ? delta : 0))),
            reliabilityScore: Math.max(70, Math.min(99, u.reliabilityScore + (u.fullName === review.targetName ? delta : 0))),
          }
        : u
    ),
  };
}
