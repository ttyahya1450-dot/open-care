// Shared Stripe singleton, fee computation, typed error hierarchy, and
// compliance report builder consumed by all /api/payments/* route handlers.

import Stripe from 'stripe';

// ── Singleton client ───────────────────────────────────────────────────────
// Reused across requests within the same serverless instance.

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new StripeConfigError('STRIPE_SECRET_KEY is not set');
  }
  _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
  });
  return _stripe;
}

// ── Fee split calculation ──────────────────────────────────────────────────
// Single source of truth for the 12.5 / 87.5 split defined in CLAUDE.md.

export interface SplitCalculation {
  hourlyRate:             number;
  durationHours:          number;
  participantChargeCents: number;  // hourlyRate × 1.05  × hours (cents)
  workerPayoutCents:      number;  // hourlyRate × 0.925 × hours (cents)
  platformFeeCents:       number;  // 12.5% of gross hourlyRate × hours (cents)
  participantChargeAUD:   string;
  workerPayoutAUD:        string;
  platformFeeAUD:         string;
}

export function computeSplit(hourlyRate: number, durationHours: number): SplitCalculation {
  const participantChargeCents = Math.round(hourlyRate * 1.05  * durationHours * 100);
  const workerPayoutCents      = Math.round(hourlyRate * 0.925 * durationHours * 100);
  const platformFeeCents       = participantChargeCents - workerPayoutCents;

  return {
    hourlyRate,
    durationHours,
    participantChargeCents,
    workerPayoutCents,
    platformFeeCents,
    participantChargeAUD: (participantChargeCents / 100).toFixed(2),
    workerPayoutAUD:      (workerPayoutCents      / 100).toFixed(2),
    platformFeeAUD:       (platformFeeCents       / 100).toFixed(2),
  };
}

// ── Error hierarchy ────────────────────────────────────────────────────────

export class StripeConfigError extends Error {
  readonly retryable = false;
  readonly httpStatus = 503;
  readonly code = 'STRIPE_NOT_CONFIGURED';
  constructor(message: string) {
    super(message);
    this.name = 'StripeConfigError';
  }
}

export class TransferFailureError extends Error {
  readonly retryable: boolean;
  readonly httpStatus = 422;
  readonly code:      string;
  constructor(
    message:             string,
    readonly transferId: string,
    readonly workerId:   string,
    readonly failureCode: string,
    retryable:           boolean,
  ) {
    super(message);
    this.name      = 'TransferFailureError';
    this.code      = `TRANSFER_FAILED_${failureCode.toUpperCase()}`;
    this.retryable = retryable;
  }
}

export class ComplianceBlockError extends Error {
  readonly retryable   = false;
  readonly httpStatus  = 403;
  readonly code        = 'COMPLIANCE_BLOCKED';
  constructor(
    message:                  string,
    readonly stripeAccountId: string,
    readonly requirements:    string[],
    readonly disabledReason:  string | null,
  ) {
    super(message);
    this.name = 'ComplianceBlockError';
  }
}

export class CashoutError extends Error {
  readonly retryable:  boolean;
  readonly httpStatus  = 422;
  readonly code:       string;
  constructor(
    message:              string,
    readonly failureCode: string,
    retryable:            boolean,
    readonly payoutId?:   string,
  ) {
    super(message);
    this.name      = 'CashoutError';
    this.code      = `CASHOUT_FAILED_${failureCode.toUpperCase()}`;
    this.retryable = retryable;
  }
}

// ── Retryability classification ────────────────────────────────────────────
// Transient failures a caller can retry once the root cause is resolved.

const RETRYABLE_TRANSFER_CODES = new Set([
  'insufficient_funds',    // balance will accrue from future bookings
  'service_unavailable',   // temporary Stripe outage
]);

const RETRYABLE_CASHOUT_CODES = new Set([
  'no_bank_account',       // worker can link account and retry
  'insufficient_funds',    // balance drained; will replenish
]);

export function isRetryableTransferCode(code: string): boolean {
  return RETRYABLE_TRANSFER_CODES.has(code);
}

export function isRetryableCashoutCode(code: string): boolean {
  return RETRYABLE_CASHOUT_CODES.has(code);
}

// ── Compliance report ──────────────────────────────────────────────────────

export interface ComplianceReport {
  stripeAccountId: string;
  checkedAt:       string;
  stripe: {
    chargesEnabled:     boolean;
    payoutsEnabled:     boolean;
    detailsSubmitted:   boolean;
    onboardingComplete: boolean;
    currentlyDue:       string[];
    pastDue:            string[];
    disabledReason:     string | null;
    payoutSchedule:     string;
  };
  // Schema-ready for NDIS Worker Screening Database API integration.
  // Populate ndisOverrides from your screening provider response.
  ndis: {
    screeningStatus: 'cleared' | 'pending' | 'barred' | 'unknown';
    clearanceExpiry: string | null;  // ISO — when screening expires
    ndisApproved:    boolean;
    checkMethod:     'api_verified' | 'self_declared';
  };
  overallStatus:   'cleared' | 'blocked' | 'pending_review';
  blockingReasons: string[];
}

export async function buildComplianceReport(
  stripe:           Stripe,
  stripeAccountId:  string,
  ndisOverrides?: Partial<ComplianceReport['ndis']>,
): Promise<ComplianceReport> {
  const account = await stripe.accounts.retrieve(stripeAccountId);

  const stripeSection: ComplianceReport['stripe'] = {
    chargesEnabled:     account.charges_enabled   ?? false,
    payoutsEnabled:     account.payouts_enabled   ?? false,
    detailsSubmitted:   account.details_submitted ?? false,
    onboardingComplete: (account.charges_enabled  && account.payouts_enabled) ?? false,
    currentlyDue:       account.requirements?.currently_due   ?? [],
    pastDue:            account.requirements?.past_due        ?? [],
    disabledReason:     account.requirements?.disabled_reason ?? null,
    payoutSchedule:     account.settings?.payouts?.schedule?.interval ?? 'manual',
  };

  const ndisSection: ComplianceReport['ndis'] = {
    screeningStatus: 'unknown',
    clearanceExpiry: null,
    ndisApproved:    false,
    checkMethod:     'self_declared',
    ...ndisOverrides,
  };

  const blockingReasons: string[] = [];
  if (!stripeSection.chargesEnabled)
    blockingReasons.push('Stripe account charges not enabled');
  if (!stripeSection.payoutsEnabled)
    blockingReasons.push('Stripe account payouts not enabled');
  if (stripeSection.pastDue.length)
    blockingReasons.push(`Stripe past-due requirements: ${stripeSection.pastDue.join(', ')}`);
  if (ndisSection.screeningStatus === 'barred')
    blockingReasons.push('NDIS Worker Screening: barred');

  const overallStatus: ComplianceReport['overallStatus'] =
    blockingReasons.length > 0                                          ? 'blocked'
    : (!stripeSection.onboardingComplete || ndisSection.screeningStatus === 'pending') ? 'pending_review'
    : 'cleared';

  return {
    stripeAccountId,
    checkedAt: new Date().toISOString(),
    stripe:    stripeSection,
    ndis:      ndisSection,
    overallStatus,
    blockingReasons,
  };
}
