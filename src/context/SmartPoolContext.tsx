import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createInitialDatabase } from '../data/karachiData';
import {
  authenticateCitizen,
  bookPoolSeatBackend,
  canUserAccessPoolChat,
  confirmPublisherCashBackend,
  createPassengerFarePaymentBackend,
  createReviewBackend,
  decidePublisherRequestBackend,
  loadDatabase,
  loadSessionUserId,
  publishPoolBackend,
  queryEligiblePoolsForPassenger,
  queryIncomingRequestsForPublisher,
  queryPoolsOwnedByPublisher,
  registerVerifiedCitizenBackend,
  releaseEscrowBackend,
  removeOccupantFromPublisherPoolBackend,
  saveDatabase,
  saveSessionUserId,
  togglePublisherPoolStatusBackend,
  updateAdminDisputeBackend,
  updateAdminVerificationBackend,
  verifyAdminCredential,
} from '../services/smartpoolBackend';
import type { PublishPoolPayload } from '../services/smartpoolBackend';
import type {
  AdminDisputeItem,
  AdminVerificationItem,
  AppRole,
  ApprovalRequest,
  CarbonVoucher,
  ChatMessage,
  MeetingPointInfo,
  OnboardingStep,
  PassengerSeatId,
  PassengerTab,
  PaymentMethod,
  PeerReview,
  PoolRide,
  PublisherTab,
  SmartPoolDatabase,
  ToastNotice,
  UserAccount,
  WalletTransaction,
} from '../types/smartpool';
import { generateMockTxHash } from '../utils/nlpAndGeo';

interface SmartPoolContextValue {
  // Auth & Current Verified Citizen
  currentUser: UserAccount | null;
  allDemoAccounts: Pick<UserAccount, 'id' | 'fullName' | 'phone' | 'cnic' | 'gender'>[];
  onboardingStep: OnboardingStep;
  setOnboardingStep: (step: OnboardingStep) => void;
  loginCitizen: (identifier: string, passcode: string) => { ok: boolean; error?: string };
  quickSignInAccount: (userId: string) => void;
  registerVerifiedCitizen: (params: {
    fullName: string;
    phone: string;
    cnic: string;
    dob: string;
    passcode: string;
    ocrConfidence: number;
    biometricMatch: number;
  }) => { ok: boolean; error?: string };
  logoutCitizen: () => void;
  resetDemoData: () => void;

  // Password-Protected Admin Authentication (Password: 123456)
  isAdminAuthenticated: boolean;
  adminAuthModalOpen: boolean;
  openAdminAuthModal: () => void;
  closeAdminAuthModal: () => void;
  unlockAdminPanel: (password: string) => boolean;
  lockAdminPanel: () => void;
  desktopWideMode: boolean;
  setDesktopWideMode: (wide: boolean) => void;

  // Proper Role-Scoped Navigation
  role: AppRole;
  switchUserMode: (mode: 'passenger' | 'publisher') => void;
  passengerTab: PassengerTab;
  setPassengerTab: (tab: PassengerTab) => void;
  publisherTab: PublisherTab;
  setPublisherTab: (tab: PublisherTab) => void;
  exploreMode: 'list' | 'meeting-point';
  setExploreMode: (m: 'list' | 'meeting-point') => void;
  walletSubView: 'wallet' | 'impact';
  setWalletSubView: (v: 'wallet' | 'impact') => void;

  // Strict Backend Gender-Filtered Passenger Pools
  passengerEligiblePools: PoolRide[];
  selectedPool: PoolRide | null;
  selectPool: (poolId: string) => void;
  activeBookedPool: PoolRide | null;
  bookPoolSeat: (
    poolId: string,
    customMeeting?: MeetingPointInfo,
    preferredSeat?: PassengerSeatId
  ) => { ok: boolean; seatLabel?: string; message?: string; error?: string };

  // Publisher-Only Pools & Incoming Gender-Matched Approval Queue
  publisherPools: PoolRide[];
  activePublisherPool: PoolRide | null;
  selectPublisherPool: (poolId: string) => void;
  publishNewPool: (payload: PublishPoolPayload) => { ok: boolean; error?: string };
  togglePublisherPoolStatus: (poolId: string) => void;
  publisherRequests: ApprovalRequest[];
  decidePublisherRequest: (reqId: string, decision: 'accepted' | 'rejected') => void;
  vacatePublisherSeat: (poolId: string, seatId: PassengerSeatId) => void;

  // Anti-Spoofing & Live Telemetry
  proximityMismatch: boolean;
  setProximityMismatch: (v: boolean) => void;
  roadSnappingEnabled: boolean;
  setRoadSnappingEnabled: (v: boolean) => void;
  rideProgress: number;
  setRideProgress: React.Dispatch<React.SetStateAction<number>>;
  isRideSimPlaying: boolean;
  setIsRideSimPlaying: React.Dispatch<React.SetStateAction<boolean>>;

  // Authorized Peer Chat
  chatPool: PoolRide | null;
  openChatForPool: (poolId: string) => void;
  closeChat: () => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (poolId: string, text: string) => void;

  // Emergency SOS
  sosOpen: boolean;
  setSosOpen: (open: boolean) => void;
  reportSosIncident: (incidentType: string, notes?: string, broadcasted?: boolean) => void;

  // Role-Scoped Payments, Escrow, Earnings & Immutable Receipts
  paymentModalOpen: boolean;
  setPaymentModalOpen: (open: boolean) => void;
  receiptModalTx: WalletTransaction | null;
  setReceiptModalTx: (tx: WalletTransaction | null) => void;
  passengerTransactions: WalletTransaction[];
  publisherTransactions: WalletTransaction[];
  executeFarePayment: (params: {
    method: PaymentMethod;
    distanceKm: number;
    fuelEconomyKmL: number;
    fuelPricePerL: number;
    maintenancePkr: number;
    baseFeePkr: number;
    totalTripCostPkr: number;
    occupants: number;
    passengerSharePkr: number;
  }) => WalletTransaction | null;
  releaseEscrowByReceipt: (receiptNo: string) => void;
  confirmPublisherCash: (txId: string) => void;
  topUpPassengerWallet: (amountPkr: number, method: 'easypaisa' | 'jazzcash') => void;
  withdrawPublisherEarnings: (
    amountPkr: number,
    method: 'easypaisa' | 'jazzcash'
  ) => boolean;

  // CO2 Vouchers & Role-Scoped Bidirectional NLP Reviews
  vouchers: CarbonVoucher[];
  redeemVoucher: (voucherId: string) => string | null;
  reviews: PeerReview[];
  submitPeerReview: (
    review: Omit<PeerReview, 'id' | 'date' | 'reviewerUserId'>
  ) => void;

  // Admin-Only State (Exposed ONLY when isAdminAuthenticated === true)
  adminAllPools: PoolRide[];
  adminAllUsersCount: number;
  adminAllTransactions: WalletTransaction[];
  adminVerifications: AdminVerificationItem[];
  updateAdminVerification: (
    id: string,
    status: AdminVerificationItem['status']
  ) => void;
  adminDisputes: AdminDisputeItem[];
  updateAdminDispute: (id: string, status: AdminDisputeItem['status']) => void;

  // Toast Notifications
  toasts: ToastNotice[];
  pushToast: (title: string, message?: string, tone?: ToastNotice['tone']) => void;
  dismissToast: (id: string) => void;
}

const SmartPoolContext = createContext<SmartPoolContextValue | null>(null);

export const SmartPoolProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [db, setDb] = useState<SmartPoolDatabase>(() => loadDatabase());
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const saved = loadSessionUserId();
    return saved;
  });

  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('splash');
  const [role, setRole] = useState<AppRole>('passenger');
  const [passengerTab, setPassengerTab] = useState<PassengerTab>('explore');
  const [publisherTab, setPublisherTab] = useState<PublisherTab>('publish');
  const [exploreMode, setExploreMode] = useState<'list' | 'meeting-point'>('list');
  const [walletSubView, setWalletSubView] = useState<'wallet' | 'impact'>('wallet');

  // Password-locked Admin state (NEVER unlocked by default)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminAuthModalOpen, setAdminAuthModalOpen] = useState<boolean>(false);
  const [desktopWideMode, setDesktopWideMode] = useState<boolean>(false);

  // Pool selection states
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [selectedPublisherPoolId, setSelectedPublisherPoolId] = useState<string | null>(
    null
  );

  // Live Tracking & Anti-Spoofing
  const [proximityMismatch, setProximityMismatch] = useState<boolean>(false);
  const [roadSnappingEnabled, setRoadSnappingEnabled] = useState<boolean>(true);
  const [rideProgress, setRideProgress] = useState<number>(0.48);
  const [isRideSimPlaying, setIsRideSimPlaying] = useState<boolean>(true);

  // Modals & Drawers
  const [chatPoolId, setChatPoolId] = useState<string | null>(null);
  const [sosOpen, setSosOpen] = useState<boolean>(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [receiptModalTx, setReceiptModalTx] = useState<WalletTransaction | null>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const commitDb = useCallback((nextDb: SmartPoolDatabase) => {
    setDb(nextDb);
    saveDatabase(nextDb);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (title: string, message?: string, tone: ToastNotice['tone'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, title, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const currentUser = useMemo(
    () => (currentUserId ? db.users.find((u) => u.id === currentUserId) ?? null : null),
    [db.users, currentUserId]
  );

  const allDemoAccounts = useMemo(
    () =>
      db.users.slice(0, 4).map((u) => ({
        id: u.id,
        fullName: u.fullName,
        phone: u.phone,
        cnic: u.cnic,
        gender: u.gender,
      })),
    [db.users]
  );

  // === Auth Actions ===
  const loginCitizen = useCallback(
    (identifier: string, passcode: string) => {
      const res = authenticateCitizen(db, identifier, passcode);
      if (!res.ok) return { ok: false, error: res.error };

      setCurrentUserId(res.user.id);
      saveSessionUserId(res.user.id);
      setRole('passenger');
      setPassengerTab('explore');
      setExploreMode('list');
      setSelectedPoolId(null);
      setSelectedPublisherPoolId(null);
      setDesktopWideMode(false);
      pushToast(
        `Welcome, ${res.user.fullName}`,
        `KYC Verified (${res.user.gender}) · Showing ${res.user.gender}-Only pools.`,
        'success'
      );
      return { ok: true };
    },
    [db, pushToast]
  );

  const quickSignInAccount = useCallback(
    (userId: string) => {
      const u = db.users.find((x) => x.id === userId);
      if (!u) return;
      setCurrentUserId(u.id);
      saveSessionUserId(u.id);
      setRole('passenger');
      setPassengerTab('explore');
      setExploreMode('list');
      setSelectedPoolId(null);
      setSelectedPublisherPoolId(null);
      setDesktopWideMode(false);
      pushToast(
        `Signed in as ${u.fullName}`,
        `${u.kyc.kycId} · Strictly matched to KYC ${u.gender}-Only pools.`,
        'success'
      );
    },
    [db.users, pushToast]
  );

  const registerVerifiedCitizen = useCallback(
    (params: {
      fullName: string;
      phone: string;
      cnic: string;
      dob: string;
      passcode: string;
      ocrConfidence: number;
      biometricMatch: number;
    }) => {
      const res = registerVerifiedCitizenBackend(db, params);
      if (!res.ok) return { ok: false, error: res.error };

      commitDb(res.db);
      setCurrentUserId(res.user.id);
      saveSessionUserId(res.user.id);
      setRole('passenger');
      setPassengerTab('explore');
      setExploreMode('list');
      pushToast(
        `KYC Approved — ${res.user.gender} Citizen Verified`,
        `${res.user.kyc.kycId} locked to CNIC digit ${res.user.kyc.cnicLastDigit}. Only ${res.user.gender} pools visible.`,
        'success'
      );
      return { ok: true };
    },
    [db, commitDb, pushToast]
  );

  const logoutCitizen = useCallback(() => {
    setCurrentUserId(null);
    saveSessionUserId(null);
    setChatPoolId(null);
    setPaymentModalOpen(false);
    setSosOpen(false);
    setReceiptModalTx(null);
    setExploreMode('list');
    setRole('passenger');
    setOnboardingStep('splash');
    setDesktopWideMode(false);
    pushToast('Signed Out Safely', 'Switch accounts or register a new citizen via KYC.', 'info');
  }, [pushToast]);

  const resetDemoData = useCallback(() => {
    const fresh = createInitialDatabase();
    commitDb(fresh);
    setCurrentUserId(null);
    saveSessionUserId(null);
    setIsAdminAuthenticated(false);
    setRole('passenger');
    setOnboardingStep('splash');
    pushToast('Database Reset', 'All default Karachi pools & KYC accounts restored.', 'info');
  }, [commitDb, pushToast]);

  // === Password-Protected Admin Gate ===
  const openAdminAuthModal = useCallback(() => {
    if (isAdminAuthenticated) {
      setRole('admin');
      setDesktopWideMode(true);
      return;
    }
    setAdminAuthModalOpen(true);
  }, [isAdminAuthenticated]);

  const closeAdminAuthModal = useCallback(() => {
    setAdminAuthModalOpen(false);
  }, []);

  const unlockAdminPanel = useCallback(
    (password: string): boolean => {
      if (!verifyAdminCredential(password)) {
        return false;
      }
      setIsAdminAuthenticated(true);
      setAdminAuthModalOpen(false);
      setRole('admin');
      setDesktopWideMode(true);
      pushToast(
        'Admin Control Unit Unlocked',
        'Authenticated session active. Remember to lock when finished.',
        'success'
      );
      return true;
    },
    [pushToast]
  );

  const lockAdminPanel = useCallback(() => {
    setIsAdminAuthenticated(false);
    setRole('passenger');
    setDesktopWideMode(false);
    pushToast('Admin Panel Locked', 'Administrator session terminated securely.', 'info');
  }, [pushToast]);

  // === Proper Role Mode Switch (Passenger <-> Publisher) ===
  const switchUserMode = useCallback(
    (mode: 'passenger' | 'publisher') => {
      if (!currentUser || currentUser.kyc.status !== 'VERIFIED') {
        pushToast('KYC Required', 'Complete CNIC & Biometric KYC first.', 'warning');
        return;
      }
      setChatPoolId(null);
      setPaymentModalOpen(false);
      setDesktopWideMode(false);
      setRole(mode);
      if (mode === 'passenger') {
        setExploreMode('list');
      }
    },
    [currentUser, pushToast]
  );

  // === STRICT BACKEND GENDER-FILTERED PASSENGER POOLS ===
  const passengerEligiblePools = useMemo(() => {
    if (!currentUser) return [];
    return queryEligiblePoolsForPassenger(db, currentUser.id).pools;
  }, [db, currentUser]);

  const selectedPool = useMemo(() => {
    if (passengerEligiblePools.length === 0) return null;
    return (
      passengerEligiblePools.find((p) => p.id === selectedPoolId) ??
      passengerEligiblePools[0]
    );
  }, [passengerEligiblePools, selectedPoolId]);

  const activeBookedPool = useMemo(() => {
    if (!currentUser?.activeBookedPoolId) return null;
    const found = db.pools.find((p) => p.id === currentUser.activeBookedPoolId);
    // Double-enforce backend gender isolation even on active booking lookup
    if (!found || found.allowedGender !== currentUser.gender) return null;
    return found;
  }, [db.pools, currentUser]);

  const selectPool = useCallback((poolId: string) => {
    setSelectedPoolId(poolId);
  }, []);

  const bookPoolSeat = useCallback(
    (
      poolId: string,
      customMeeting?: MeetingPointInfo,
      preferredSeat?: PassengerSeatId
    ) => {
      if (!currentUser) return { ok: false, error: 'Please sign in first.' };
      const res = bookPoolSeatBackend(
        db,
        currentUser.id,
        poolId,
        customMeeting,
        preferredSeat
      );
      if (!res.ok) {
        pushToast('Seat Reservation Blocked', res.error, 'danger');
        return { ok: false, error: res.error };
      }
      commitDb(res.db);
      setRideProgress(0.46);
      setIsRideSimPlaying(true);
      return { ok: true, seatLabel: res.seatLabel, message: res.message };
    },
    [currentUser, db, commitDb, pushToast]
  );

  // === PUBLISHER-ONLY DATA & ACTIONS ===
  const publisherPools = useMemo(() => {
    if (!currentUser) return [];
    return queryPoolsOwnedByPublisher(db, currentUser.id);
  }, [db, currentUser]);

  const activePublisherPool = useMemo(() => {
    if (publisherPools.length === 0) return null;
    return (
      publisherPools.find((p) => p.id === selectedPublisherPoolId) ?? publisherPools[0]
    );
  }, [publisherPools, selectedPublisherPoolId]);

  const selectPublisherPool = useCallback((poolId: string) => {
    setSelectedPublisherPoolId(poolId);
  }, []);

  const publishNewPool = useCallback(
    (payload: PublishPoolPayload) => {
      if (!currentUser) return { ok: false, error: 'Not authenticated.' };
      const res = publishPoolBackend(db, currentUser.id, payload);
      if (!res.ok) {
        pushToast('Cannot Publish Pool', res.error, 'danger');
        return { ok: false, error: res.error };
      }
      commitDb(res.db);
      setSelectedPublisherPoolId(res.pool.id);
      setPublisherTab('requests');
      pushToast(
        `${res.pool.allowedGender}-Only Pool Published!`,
        `${res.pool.origin} → ${res.pool.destination} (${res.pool.departureTime}) · Visible exclusively to KYC-verified ${res.pool.allowedGender} commuters.`,
        'success'
      );
      return { ok: true };
    },
    [currentUser, db, commitDb, pushToast]
  );

  const togglePublisherPoolStatus = useCallback(
    (poolId: string) => {
      if (!currentUser) return;
      const nextDb = togglePublisherPoolStatusBackend(db, currentUser.id, poolId);
      commitDb(nextDb);
      const target = nextDb.pools.find((p) => p.id === poolId);
      if (target) {
        pushToast(
          target.status === 'active' ? 'Pool Resumed (Live)' : 'Pool Paused',
          target.status === 'active'
            ? `Visible again to KYC-verified ${target.allowedGender} riders.`
            : 'Hidden from commuter search until you resume it.',
          'info'
        );
      }
    },
    [currentUser, db, commitDb, pushToast]
  );

  const publisherRequests = useMemo(() => {
    if (!currentUser) return [];
    return queryIncomingRequestsForPublisher(db, currentUser.id);
  }, [db, currentUser]);

  const decidePublisherRequest = useCallback(
    (reqId: string, decision: 'accepted' | 'rejected') => {
      if (!currentUser) return;
      const res = decidePublisherRequestBackend(db, currentUser.id, reqId, decision);
      if (!res.ok) {
        pushToast('Action Blocked', res.error, 'danger');
        return;
      }
      commitDb(res.db);
      pushToast(
        decision === 'accepted' ? 'Passenger Approved & Seated' : 'Request Declined',
        res.message,
        decision === 'accepted' ? 'success' : 'info'
      );
    },
    [currentUser, db, commitDb, pushToast]
  );

  const vacatePublisherSeat = useCallback(
    (poolId: string, seatId: PassengerSeatId) => {
      if (!currentUser) return;
      const nextDb = removeOccupantFromPublisherPoolBackend(
        db,
        currentUser.id,
        poolId,
        seatId
      );
      commitDb(nextDb);
      pushToast('Seat Vacated', 'Seat reopened for verified same-gender commuters.', 'info');
    },
    [currentUser, db, commitDb, pushToast]
  );

  // === AUTHORIZED PEER CHAT ===
  const chatPool = useMemo(() => {
    if (!chatPoolId || !currentUser) return null;
    const pool = db.pools.find((p) => p.id === chatPoolId) ?? null;
    return canUserAccessPoolChat(currentUser, pool) ? pool : null;
  }, [chatPoolId, currentUser, db.pools]);

  const openChatForPool = useCallback(
    (poolId: string) => {
      const pool = db.pools.find((p) => p.id === poolId) ?? null;
      if (!canUserAccessPoolChat(currentUser, pool)) {
        pushToast(
          'Chat Restricted',
          'Encrypted chat is only available between verified same-gender pool peers.',
          'warning'
        );
        return;
      }
      setChatPoolId(poolId);
    },
    [db.pools, currentUser, pushToast]
  );

  const closeChat = useCallback(() => setChatPoolId(null), []);

  const chatMessages = useMemo(() => {
    if (!chatPool) return [];
    return db.chatMessages.filter((m) => m.poolId === chatPool.id);
  }, [db.chatMessages, chatPool]);

  const sendChatMessage = useCallback(
    (poolId: string, text: string) => {
      const clean = text.trim();
      const pool = db.pools.find((p) => p.id === poolId) ?? null;
      if (!clean || !currentUser || !pool || !canUserAccessPoolChat(currentUser, pool)) {
        return;
      }
      const now = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const myMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        poolId,
        senderUserId: currentUser.id,
        senderName: currentUser.fullName,
        text: clean,
        timestamp: now,
      };
      const nextDb: SmartPoolDatabase = {
        ...db,
        chatMessages: [...db.chatMessages, myMsg],
      };
      commitDb(nextDb);

      // Simulate responsive reply from the verified counterpart (only for non-user demo peers)
      const isPublisherSender = pool.publisherId === currentUser.id;
      const firstRider = Object.values(pool.cabin.seats).find(Boolean);
      const replyPeerName = isPublisherSender
        ? firstRider?.name
        : pool.driverName;
      const replyPeerId = isPublisherSender ? firstRider?.userId : pool.publisherId;
      const isRealRegisteredPeer = db.users.some((u) => u.id === replyPeerId);

      if (replyPeerName && replyPeerId && !isRealRegisteredPeer) {
        window.setTimeout(() => {
          setDb((latest) => {
            const reply: ChatMessage = {
              id: `msg-rep-${Date.now()}`,
              poolId,
              senderUserId: replyPeerId,
              senderName: replyPeerName,
              text: isPublisherSender
                ? `JazakAllah! Standing right at the ${pool.meetingPoint.label} pin now.`
                : `Noted! Approaching ${pool.meetingPoint.label} in ${pool.vehicleModel} (${pool.plateNumber}).`,
              timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            };
            const withReply = {
              ...latest,
              chatMessages: [...latest.chatMessages, reply],
            };
            saveDatabase(withReply);
            return withReply;
          });
        }, 850);
      }
    },
    [db, currentUser, commitDb]
  );

  // === SOS INCIDENT REPORTING ===
  const reportSosIncident = useCallback(
    (incidentType: string, notes?: string, broadcasted = true) => {
      if (!currentUser) return;
      const refPool =
        role === 'publisher' ? activePublisherPool : activeBookedPool ?? selectedPool;

      const newCase: AdminDisputeItem = {
        id: `dsp-sos-${Date.now()}`,
        caseCode: `SOS-KHI-${Math.floor(910 + Math.random() * 88)}`,
        type: 'SOS Emergency',
        severity: 'critical',
        corridor: refPool?.corridorName ?? 'Shahrah-e-Faisal, Karachi',
        driverName: refPool?.driverName ?? currentUser.fullName,
        passengerName: currentUser.fullName,
        passengerUserId: role === 'passenger' ? currentUser.id : undefined,
        publisherUserId: refPool?.publisherId,
        escrowAmountPkr: refPool?.estimatedShare ?? 150,
        description: `${
          broadcasted ? '[LIVE GPS BROADCAST] ' : '[SAFETY REPORT] '
        }${incidentType}${notes ? ` — "${notes}"` : ''}. Plate: ${
          refPool?.plateNumber ?? 'N/A'
        } (${currentUser.kyc.kycId}). Escrow frozen.`,
        gpsCoords: '24.8655° N, 67.0710° E (Shahrah-e-Faisal)',
        reportedAt: 'Just now',
        status: 'open',
      };

      commitDb({
        ...db,
        adminDisputes: [newCase, ...db.adminDisputes],
      });
      pushToast(
        'Emergency Alert Dispatched',
        `Case ${newCase.caseCode} logged to SmartPool System Control Unit.`,
        'danger'
      );
    },
    [currentUser, role, activePublisherPool, activeBookedPool, selectedPool, db, commitDb, pushToast]
  );

  // === ROLE-SCOPED PAYMENTS, ESCROW & PUBLISHER EARNINGS ===
  const passengerTransactions = useMemo(() => {
    if (!currentUser) return [];
    return db.transactions.filter(
      (t) => t.ownerUserId === currentUser.id && t.roleScope === 'passenger'
    );
  }, [db.transactions, currentUser]);

  const publisherTransactions = useMemo(() => {
    if (!currentUser) return [];
    return db.transactions.filter(
      (t) => t.ownerUserId === currentUser.id && t.roleScope === 'publisher'
    );
  }, [db.transactions, currentUser]);

  const executeFarePayment = useCallback(
    (params: {
      method: PaymentMethod;
      distanceKm: number;
      fuelEconomyKmL: number;
      fuelPricePerL: number;
      maintenancePkr: number;
      baseFeePkr: number;
      totalTripCostPkr: number;
      occupants: number;
      passengerSharePkr: number;
    }): WalletTransaction | null => {
      const targetPool = activeBookedPool ?? selectedPool;
      if (!currentUser || !targetPool) {
        pushToast('No Active Ride', 'Reserve a verified pool seat before paying.', 'warning');
        return null;
      }
      const res = createPassengerFarePaymentBackend(
        db,
        currentUser.id,
        targetPool.id,
        params
      );
      if (!res.ok) {
        pushToast('Payment Declined', res.error, 'danger');
        return null;
      }
      commitDb(res.db);
      pushToast(
        params.method === 'cash'
          ? `PKR ${params.passengerSharePkr} Recorded as On-Cash`
          : `PKR ${params.passengerSharePkr} Locked in Escrow`,
        params.method === 'cash'
          ? 'Pay your publisher at drop-off; publisher will confirm receipt on their app.'
          : 'Held safely in escrow and auto-released upon verified GPS drop-off.',
        'success'
      );
      return res.tx;
    },
    [activeBookedPool, selectedPool, currentUser, db, commitDb, pushToast]
  );

  const releaseEscrowByReceipt = useCallback(
    (receiptNo: string) => {
      const { db: nextDb, updatedTx } = releaseEscrowBackend(db, receiptNo);
      if (!updatedTx) return;
      commitDb(nextDb);
      setReceiptModalTx((curr) =>
        curr && curr.receiptNo === receiptNo ? updatedTx : curr
      );
      pushToast(
        'Verified Drop-Off — Escrow Released!',
        `PKR ${updatedTx.amountPkr} settled to publisher + Carbon Credits awarded.`,
        'success'
      );
    },
    [db, commitDb, pushToast]
  );

  const confirmPublisherCash = useCallback(
    (txId: string) => {
      if (!currentUser || role !== 'publisher') {
        pushToast(
          'Publisher Permission Required',
          'Only the ride publisher can confirm receipt of On-Cash fares.',
          'warning'
        );
        return;
      }
      const res = confirmPublisherCashBackend(db, currentUser.id, txId);
      if (!res.ok) {
        pushToast('Cannot Confirm Cash', res.error, 'danger');
        return;
      }
      commitDb(res.db);
      pushToast(
        'Cash Receipt Confirmed & Sealed',
        `PKR ${res.updatedTx.amountPkr} locked in read-only audit ledger.`,
        'success'
      );
    },
    [currentUser, role, db, commitDb, pushToast]
  );

  const topUpPassengerWallet = useCallback(
    (amountPkr: number, method: 'easypaisa' | 'jazzcash') => {
      if (!currentUser || amountPkr <= 0) return;
      const label = method === 'easypaisa' ? 'Easypaisa' : 'JazzCash';
      const tx: WalletTransaction = {
        id: `tx-top-${Date.now()}`,
        ownerUserId: currentUser.id,
        roleScope: 'passenger',
        receiptNo: `SP-TOP-20261118-${Math.floor(1000 + Math.random() * 8999)}`,
        txHash: generateMockTxHash(),
        title: `Wallet Top-Up (${label})`,
        subtitle: `Zero-Fee Commuter Load · ${currentUser.phone}`,
        amountPkr,
        direction: 'credit',
        method,
        status: 'topup',
        timestamp: `18 Nov 2026, ${new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })} PKT`,
        passengerName: currentUser.fullName,
        pgConstraintVerified: true,
      };
      commitDb({
        ...db,
        users: db.users.map((u) =>
          u.id === currentUser.id
            ? { ...u, walletBalancePkr: u.walletBalancePkr + amountPkr }
            : u
        ),
        transactions: [tx, ...db.transactions],
      });
      pushToast(`+PKR ${amountPkr.toLocaleString()} Added`, `Loaded via ${label}.`, 'success');
    },
    [currentUser, db, commitDb, pushToast]
  );

  const withdrawPublisherEarnings = useCallback(
    (amountPkr: number, method: 'easypaisa' | 'jazzcash'): boolean => {
      if (!currentUser || role !== 'publisher') return false;
      if (amountPkr <= 0 || amountPkr > currentUser.publisherEarningsPkr) {
        pushToast(
          'Insufficient Publisher Earnings',
          `Available for withdrawal: PKR ${currentUser.publisherEarningsPkr.toLocaleString()}.`,
          'warning'
        );
        return false;
      }
      const label = method === 'easypaisa' ? 'Easypaisa' : 'JazzCash';
      const tx: WalletTransaction = {
        id: `tx-wd-${Date.now()}`,
        ownerUserId: currentUser.id,
        roleScope: 'publisher',
        receiptNo: `SP-WDR-20261118-${Math.floor(1000 + Math.random() * 8999)}`,
        txHash: generateMockTxHash(),
        title: `Cost-Recovery Payout to ${label}`,
        subtitle: `Publisher Transfer · ${currentUser.phone}`,
        amountPkr,
        direction: 'debit',
        method,
        status: 'withdrawal',
        timestamp: `18 Nov 2026, ${new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })} PKT`,
        driverName: currentUser.fullName,
        pgConstraintVerified: true,
      };
      commitDb({
        ...db,
        users: db.users.map((u) =>
          u.id === currentUser.id
            ? { ...u, publisherEarningsPkr: u.publisherEarningsPkr - amountPkr }
            : u
        ),
        transactions: [tx, ...db.transactions],
      });
      pushToast(
        `PKR ${amountPkr.toLocaleString()} Withdrawn`,
        `Transferred to your verified ${label} account.`,
        'success'
      );
      return true;
    },
    [currentUser, role, db, commitDb, pushToast]
  );

  // === CARBON CREDIT MARKETPLACE ===
  const redeemVoucher = useCallback(
    (voucherId: string): string | null => {
      if (!currentUser) return null;
      const v = db.vouchers.find((x) => x.id === voucherId);
      if (!v) return null;
      if (v.redeemedByUserIds[currentUser.id]) {
        return v.redeemedByUserIds[currentUser.id];
      }
      if (currentUser.carbonCredits < v.costCredits) {
        pushToast(
          'Not Enough Green Credits',
          `Need ${v.costCredits - currentUser.carbonCredits} more credits.`,
          'warning'
        );
        return null;
      }
      const code = `SP-ECO-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      commitDb({
        ...db,
        users: db.users.map((u) =>
          u.id === currentUser.id
            ? { ...u, carbonCredits: u.carbonCredits - v.costCredits }
            : u
        ),
        vouchers: db.vouchers.map((item) =>
          item.id === voucherId
            ? {
                ...item,
                redeemedByUserIds: {
                  ...item.redeemedByUserIds,
                  [currentUser.id]: code,
                },
              }
            : item
        ),
      });
      pushToast(`Voucher Redeemed: ${code}`, v.title, 'success');
      return code;
    },
    [currentUser, db, commitDb, pushToast]
  );

  // === ROLE-SCOPED PEER NLP REVIEWS ===
  const visibleReviews = useMemo(() => {
    if (!currentUser) return [];
    // Show only reviews belonging to this user or their same-gender peer community
    return db.reviews.filter(
      (r) =>
        r.reviewerUserId === currentUser.id ||
        r.targetName === currentUser.fullName ||
        r.targetGender === currentUser.gender
    );
  }, [db.reviews, currentUser]);

  const submitPeerReview = useCallback(
    (review: Omit<PeerReview, 'id' | 'date' | 'reviewerUserId'>) => {
      if (!currentUser) return;
      const nextDb = createReviewBackend(db, {
        ...review,
        reviewerUserId: currentUser.id,
      });
      commitDb(nextDb);
      pushToast(
        `Review Recorded (${review.sentimentScore >= 0 ? '+' : ''}${review.sentimentScore}% ${review.sentimentLabel})`,
        'Behavioral Trust Score updated via NLP sentiment engine.',
        'success'
      );
    },
    [currentUser, db, commitDb, pushToast]
  );

  // === ADMIN-ONLY ACTIONS (Guarded by isAdminAuthenticated) ===
  const updateAdminVerification = useCallback(
    (id: string, status: AdminVerificationItem['status']) => {
      if (!isAdminAuthenticated) return;
      commitDb(updateAdminVerificationBackend(db, id, status));
      pushToast(
        `KYC ${status.replace('_', ' ').toUpperCase()}`,
        'Updated in SmartPool verification ledger.',
        'info'
      );
    },
    [isAdminAuthenticated, db, commitDb, pushToast]
  );

  const updateAdminDispute = useCallback(
    (id: string, status: AdminDisputeItem['status']) => {
      if (!isAdminAuthenticated) return;
      commitDb(updateAdminDisputeBackend(db, id, status));
      pushToast(
        'Case Updated',
        `Marked as ${status.replace('_', ' ').toUpperCase()}.`,
        'success'
      );
    },
    [isAdminAuthenticated, db, commitDb, pushToast]
  );

  const value: SmartPoolContextValue = {
    currentUser,
    allDemoAccounts,
    onboardingStep,
    setOnboardingStep,
    loginCitizen,
    quickSignInAccount,
    registerVerifiedCitizen,
    logoutCitizen,
    resetDemoData,
    isAdminAuthenticated,
    adminAuthModalOpen,
    openAdminAuthModal,
    closeAdminAuthModal,
    unlockAdminPanel,
    lockAdminPanel,
    desktopWideMode,
    setDesktopWideMode,
    role,
    switchUserMode,
    passengerTab,
    setPassengerTab,
    publisherTab,
    setPublisherTab,
    exploreMode,
    setExploreMode,
    walletSubView,
    setWalletSubView,
    passengerEligiblePools,
    selectedPool,
    selectPool,
    activeBookedPool,
    bookPoolSeat,
    publisherPools,
    activePublisherPool,
    selectPublisherPool,
    publishNewPool,
    togglePublisherPoolStatus,
    publisherRequests,
    decidePublisherRequest,
    vacatePublisherSeat,
    proximityMismatch,
    setProximityMismatch,
    roadSnappingEnabled,
    setRoadSnappingEnabled,
    rideProgress,
    setRideProgress,
    isRideSimPlaying,
    setIsRideSimPlaying,
    chatPool,
    openChatForPool,
    closeChat,
    chatMessages,
    sendChatMessage,
    sosOpen,
    setSosOpen,
    reportSosIncident,
    paymentModalOpen,
    setPaymentModalOpen,
    receiptModalTx,
    setReceiptModalTx,
    passengerTransactions,
    publisherTransactions,
    executeFarePayment,
    releaseEscrowByReceipt,
    confirmPublisherCash,
    topUpPassengerWallet,
    withdrawPublisherEarnings,
    vouchers: db.vouchers,
    redeemVoucher,
    reviews: visibleReviews,
    submitPeerReview,
    adminAllPools: isAdminAuthenticated ? db.pools : [],
    adminAllUsersCount: isAdminAuthenticated ? 12477 + db.users.length : 0,
    adminAllTransactions: isAdminAuthenticated ? db.transactions : [],
    adminVerifications: isAdminAuthenticated ? db.adminVerifications : [],
    updateAdminVerification,
    adminDisputes: isAdminAuthenticated ? db.adminDisputes : [],
    updateAdminDispute,
    toasts,
    pushToast,
    dismissToast,
  };

  return (
    <SmartPoolContext.Provider value={value}>{children}</SmartPoolContext.Provider>
  );
};

export function useSmartPool(): SmartPoolContextValue {
  const ctx = useContext(SmartPoolContext);
  if (!ctx) {
    throw new Error('useSmartPool must be used inside SmartPoolProvider');
  }
  return ctx;
}
