export type UserRole = 'participant' | 'support_worker' | 'support_coordinator';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface BaseUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantProfile {
  userId: string;
  ndisNumber?: string;
  location?: string;
  preferredSupportTypes: string[];
  planBudget?: number;
  planRemainingBudget?: number;
}

export interface SupportWorkerProfile {
  userId: string;
  hourlyRate: number;
  specialties: string[];
  traitBadges: string[];
  location?: string;
  availability?: string;
  isVerified: boolean;
}

export interface SupportCoordinatorProfile {
  userId: string;
  organisationName?: string;
  managedParticipantIds: string[];
  region?: string;
}

export interface Booking {
  id: string;
  participantId: string;
  workerId: string;
  coordinatorId?: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  participantCheckoutTotal: number;
  workerPayoutAmount: number;
  platformFeeAmount: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NDISPlanBudget {
  id: string;
  participantId: string;
  totalBudget: number;
  spentAmount: number;
  remainingAmount: number;
  updatedAt: string;
}

export interface MarketplaceFeeBreakdown {
  hourlyRate: number;
  participantCheckoutTotal: number;
  workerPayoutAmount: number;
  platformFeeAmount: number;
}

export function calculateMarketplaceFees(hourlyRate: number): MarketplaceFeeBreakdown {
  const participantCheckoutTotal = hourlyRate * 1.05;
  const workerPayoutAmount = hourlyRate * 0.925;
  const platformFeeAmount = participantCheckoutTotal - workerPayoutAmount;

  return {
    hourlyRate,
    participantCheckoutTotal,
    workerPayoutAmount,
    platformFeeAmount,
  };
}

/**
 * Suggested database tables:
 * - users
 * - participant_profiles
 * - support_worker_profiles
 * - support_coordinator_profiles
 * - bookings
 * - ndis_plan_budgets
 */
