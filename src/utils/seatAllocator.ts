import type {
  CabinSeatState,
  PassengerSeatId,
  SeatOccupant,
  SeatRuleEvent,
} from '../types/smartpool';

export const ALL_PASSENGER_SEATS: PassengerSeatId[] = [
  'front-left',
  'back-left',
  'back-middle',
  'back-right',
];

export const SEAT_LABELS: Record<PassengerSeatId | 'driver', string> = {
  driver: 'Driver (Front-Right)',
  'front-left': 'Front Passenger (Front-Left)',
  'back-left': 'Back-Left Seat',
  'back-middle': 'Back-Middle Seat',
  'back-right': 'Back-Right Seat',
};

function nowTimeLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getActiveSeatIds(maxPassengerSeats: number): PassengerSeatId[] {
  const clamped = Math.max(1, Math.min(4, maxPassengerSeats));
  return ALL_PASSENGER_SEATS.slice(0, clamped);
}

export interface AllocationOutcome {
  cabin: CabinSeatState;
  event: SeatRuleEvent;
  assignedSeat: PassengerSeatId | null;
  success: boolean;
}

/**
 * Backend KYC-Enforced Same-Gender Cabin Seat Allocator.
 * Strictly validates:
 *  1. Passenger holds a verified NADRA CNIC KYC record (`verified === true && kycId`).
 *  2. Passenger's KYC-derived gender matches BOTH the Publisher's KYC gender AND the pool's `allowedGender`
 *     (Female-to-Female ONLY for female-listed pools; Male-to-Male ONLY for male-listed pools).
 *  3. Assigns seats in comfort order (Front-Left → Back-Left → Back-Middle → Back-Right) without overflowing published capacity.
 */
export function allocateVerifiedPassengerToCabin(
  current: CabinSeatState,
  passenger: SeatOccupant,
  preferredSeat?: PassengerSeatId
): AllocationOutcome {
  // 1. Strict KYC Check
  if (!passenger.verified || !passenger.kycId) {
    return {
      cabin: current,
      assignedSeat: null,
      success: false,
      event: {
        id: `evt-${Date.now()}`,
        timestamp: nowTimeLabel(),
        ruleCode: 'KYC_BLOCKED',
        title: 'KYC Verification Required',
        message:
          'Seat booking blocked: Complete NADRA CNIC + Biometric KYC verification before joining any pool.',
        severity: 'blocked',
      },
    };
  }

  // 2. Strict KYC Gender Isolation Check (Publisher Gender === Allowed Gender === Passenger Gender)
  if (
    passenger.gender !== current.driver.gender ||
    passenger.gender !== current.allowedGender
  ) {
    return {
      cabin: current,
      assignedSeat: null,
      success: false,
      event: {
        id: `evt-${Date.now()}`,
        timestamp: nowTimeLabel(),
        ruleCode: 'GENDER_BLOCKED',
        title: `${current.allowedGender}-Only KYC Lock Enforced`,
        message: `Access denied: This pool was published by a KYC-verified ${current.driver.gender} publisher and accepts verified ${current.allowedGender} commuters exclusively.`,
        severity: 'blocked',
      },
    };
  }

  const activeSeatIds = getActiveSeatIds(current.maxPassengerSeats);
  const nextSeats: Record<PassengerSeatId, SeatOccupant | null> = { ...current.seats };

  // If user is already seated in this cabin, return their existing seat idempotently
  const existingSeat = activeSeatIds.find(
    (id) => nextSeats[id]?.userId === passenger.userId
  );
  if (existingSeat) {
    return {
      cabin: current,
      assignedSeat: existingSeat,
      success: true,
      event: {
        id: `evt-${Date.now()}`,
        timestamp: nowTimeLabel(),
        ruleCode: 'KYC_MATCH',
        title: `Already Seated in ${SEAT_LABELS[existingSeat]}`,
        message: `Your verified ${passenger.gender}-Only seat (${SEAT_LABELS[existingSeat]}) is confirmed and locked.`,
        severity: 'safety',
      },
    };
  }

  // Pick preferred open seat or first available active seat
  const targetSeat =
    preferredSeat &&
    activeSeatIds.includes(preferredSeat) &&
    nextSeats[preferredSeat] === null
      ? preferredSeat
      : activeSeatIds.find((id) => nextSeats[id] === null) ?? null;

  if (!targetSeat) {
    return {
      cabin: current,
      assignedSeat: null,
      success: false,
      event: {
        id: `evt-${Date.now()}`,
        timestamp: nowTimeLabel(),
        ruleCode: 'CAPACITY_FULL',
        title: 'All Published Seats Filled',
        message: `All ${activeSeatIds.length} verified ${current.allowedGender}-Only seats in this pool are occupied.`,
        severity: 'info',
      },
    };
  }

  nextSeats[targetSeat] = passenger;

  return {
    cabin: {
      ...current,
      seats: nextSeats,
    },
    assignedSeat: targetSeat,
    success: true,
    event: {
      id: `evt-${Date.now()}`,
      timestamp: nowTimeLabel(),
      ruleCode: 'KYC_MATCH',
      title: `KYC ${current.allowedGender}-Only Seat Assigned`,
      message: `Verified ${passenger.gender} KYC (${passenger.kycId}) matched with ${current.driver.name}. Assigned to ${SEAT_LABELS[targetSeat]} — all cabin seats locked exclusively for ${current.allowedGender} commuters.`,
      severity: 'safety',
    },
  };
}

export function vacateSeatInCabin(
  cabin: CabinSeatState,
  seatId: PassengerSeatId
): CabinSeatState {
  return {
    ...cabin,
    seats: {
      ...cabin.seats,
      [seatId]: null,
    },
  };
}
