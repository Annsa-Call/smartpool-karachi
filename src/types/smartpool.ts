export type Gender = 'Male' | 'Female';

export type KycStatus = 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';

/**
 * Active user role inside the application.
 * - passenger: Commuter searching, booking, tracking, paying & rating drivers
 * - publisher: Verified vehicle owner publishing pools, managing requests/cabin, driving & withdrawing cost-recovery
 * - admin: Password-protected SmartPool System Control Unit (requires admin credentials)
 */
export type AppRole = 'passenger' | 'publisher' | 'admin';

export type PassengerTab = 'explore' | 'ride' | 'wallet' | 'profile';

export type PublisherTab = 'publish' | 'requests' | 'drive' | 'earnings' | 'profile';

export type OnboardingStep = 'splash' | 'otp' | 'cnic' | 'biometric' | 'verified';

export type SeatId =
  | 'driver'
  | 'front-left'
  | 'back-left'
  | 'back-middle'
  | 'back-right';

export type PassengerSeatId = Exclude<SeatId, 'driver'>;

export interface KycRecord {
  kycId: string;
  cnic: string;
  cnicLastDigit: number;
  derivedGender: Gender; // Immutable: derived from NADRA CNIC 13th digit (odd = Male, even = Female)
  dob: string;
  simPhone: string;
  simVerified: boolean;
  ocrConfidence: number;
  biometricMatch: number;
  status: KycStatus;
  verifiedAt: string;
}

export interface PublisherVehicle {
  category: string;
  model: string;
  plateNumber: string;
  fuelEconomyKmL: number;
  isEV?: boolean;
}

export interface UserAccount {
  id: string;
  fullName: string;
  phone: string;
  cnic: string;
  dob: string;
  passcode: string;
  /** Strictly derived from verified NADRA CNIC KYC record — read-only in UI */
  gender: Gender;
  kyc: KycRecord;
  trustScore: number;
  reliabilityScore: number;
  comfortScore: number;
  communicationScore: number;
  poolsShared: number;
  co2SavedKg: number;
  fuelSavedPkr: number;
  carbonCredits: number;
  walletBalancePkr: number;
  escrowHeldPkr: number;
  publisherEarningsPkr: number;
  pendingPublisherEscrowPkr: number;
  activeBookedPoolId: string | null;
  vehicle?: PublisherVehicle;
}

export interface SeatOccupant {
  userId: string;
  name: string;
  gender: Gender;
  kycId: string;
  trustScore: number;
  segment?: string;
  fareShare?: number;
  verified: boolean;
  avatarInitials: string;
}

export interface CabinSeatState {
  driver: SeatOccupant;
  seats: Record<PassengerSeatId, SeatOccupant | null>;
  /** Strictly stamped from Publisher's verified KYC gender */
  allowedGender: Gender;
  maxPassengerSeats: number; // 1 to 4
}

export interface SeatRuleEvent {
  id: string;
  timestamp: string;
  ruleCode: 'KYC_MATCH' | 'GENDER_BLOCKED' | 'KYC_BLOCKED' | 'CAPACITY_FULL';
  title: string;
  message: string;
  severity: 'safety' | 'blocked' | 'info';
}

export interface ApprovalRequest {
  id: string;
  poolId: string;
  publisherId: string;
  passengerUserId: string;
  name: string;
  gender: Gender;
  kycId: string;
  cnicMasked: string;
  trustScore: number;
  pickupCorner: string;
  dropoff: string;
  detourMins: number;
  fareShare: number;
  cnicVerified: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: string;
}

export type LatLngTuple = [number, number];

export interface KarachiLandmark {
  id: string;
  name: string;
  shortName: string;
  area: string;
  coords: LatLngTuple;
}

export interface MeetingPointInfo {
  label: string;
  sublabel: string;
  homeLabel: string;
  homeCoords: LatLngTuple;
  meetingCoords: LatLngTuple;
  walkMeters: number;
  walkMins: number;
  driverDetourMins: number;
  fuelSavedPkr: number;
}

export interface PoolRide {
  id: string;
  publisherId: string;
  driverName: string;
  driverKycId: string;
  /** Immutable: copied from Publisher's verified KYC record */
  driverGender: Gender;
  /** Backend visibility filter: only KYC-verified users with user.gender === allowedGender can view or book */
  allowedGender: Gender;
  driverInitials: string;
  driverPhoneMasked: string;
  trustScore: number;
  gaMatchScore: number;
  badges: string[];
  vehicleModel: string;
  vehicleCategory: string;
  plateNumber: string;
  fuelEconomyKmL: number;
  fuelPricePerL: number;
  isEV?: boolean;
  origin: string;
  destination: string;
  corridorName: string;
  departureTime: string;
  scheduleType: 'One-Time' | 'Weekly Routine';
  routineDays?: string[];
  requiresManualApproval: boolean;
  detourMins: number;
  distanceKm: number;
  totalTripCost: number;
  estimatedShare: number;
  routePolyline: LatLngTuple[];
  rawDriftingGps: LatLngTuple[];
  meetingPoint: MeetingPointInfo;
  cabin: CabinSeatState;
  co2SavedKg: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  poolId: string;
  senderUserId: string;
  senderName: string;
  isSystem?: boolean;
  text: string;
  timestamp: string;
  locationPin?: string;
}

export type PaymentMethod = 'easypaisa' | 'jazzcash' | 'cash';

export type EscrowStatus =
  | 'escrow_locked'
  | 'released'
  | 'cash_pending'
  | 'cash_confirmed'
  | 'topup'
  | 'withdrawal';

export interface SegmentAuditEntry {
  segmentLabel: string;
  snappedDistanceKm: number;
  occupantsCount: number;
  segmentCostPkr: number;
  userSharePkr: number;
  proximityCheck: string;
}

export interface WalletTransaction {
  id: string;
  ownerUserId: string;
  counterpartyUserId?: string;
  poolId?: string;
  roleScope: 'passenger' | 'publisher';
  receiptNo: string;
  txHash: string;
  title: string;
  subtitle: string;
  amountPkr: number;
  direction: 'debit' | 'credit';
  method: PaymentMethod;
  status: EscrowStatus;
  timestamp: string;
  driverName?: string;
  passengerName?: string;
  vehiclePlate?: string;
  corridor?: string;
  formulaBreakdown?: {
    distanceKm: number;
    fuelEconomyKmL: number;
    fuelPricePerL: number;
    fuelCostPkr: number;
    maintenancePkr: number;
    baseFeePkr: number;
    totalTripCostPkr: number;
    occupants: number;
    passengerSharePkr: number;
  };
  segmentAudit?: SegmentAuditEntry[];
  pgConstraintVerified: boolean;
}

export interface CarbonVoucher {
  id: string;
  partner: string;
  title: string;
  description: string;
  costCredits: number;
  category: 'fuel' | 'cafe' | 'ride' | 'tree';
  valueTag: string;
  redeemedByUserIds: Record<string, string>; // userId -> voucherCode
}

export interface PeerReview {
  id: string;
  reviewerUserId: string;
  reviewerName: string;
  targetName: string;
  targetGender: Gender;
  roleDirection: 'passenger_to_driver' | 'driver_to_passenger';
  stars: number;
  comment: string;
  sentimentScore: number;
  sentimentLabel: 'Positive' | 'Neutral' | 'Negative';
  tags: string[];
  corridor: string;
  date: string;
}

export interface AdminVerificationItem {
  id: string;
  linkedUserId?: string;
  applicantName: string;
  gender: Gender;
  cnic: string;
  phone: string;
  submittedAt: string;
  ocrConfidence: number;
  faceMatchScore: number;
  flagReason: string;
  status: 'pending' | 'approved' | 'rescan_requested' | 'rejected';
}

export interface AdminDisputeItem {
  id: string;
  caseCode: string;
  type: 'SOS Emergency' | 'Escrow Hold' | 'Route Deviation' | 'Cash Settlement';
  severity: 'critical' | 'high' | 'medium';
  corridor: string;
  driverName: string;
  passengerName: string;
  passengerUserId?: string;
  publisherUserId?: string;
  escrowAmountPkr: number;
  description: string;
  gpsCoords: string;
  reportedAt: string;
  status: 'open' | 'resolved_refund' | 'resolved_release' | 'escalated';
}

export interface SmartPoolDatabase {
  schemaVersion: number;
  users: UserAccount[];
  pools: PoolRide[];
  approvalRequests: ApprovalRequest[];
  chatMessages: ChatMessage[];
  transactions: WalletTransaction[];
  vouchers: CarbonVoucher[];
  reviews: PeerReview[];
  adminVerifications: AdminVerificationItem[];
  adminDisputes: AdminDisputeItem[];
}

export interface ToastNotice {
  id: string;
  title: string;
  message?: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
}
