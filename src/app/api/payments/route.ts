import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  getStripe,
  computeSplit,
  ComplianceBlockError,
} from '@/lib/stripeClient';

// POST /api/payments
//
// Central multi-party PaymentIntent controller. Runs a compliance pre-flight
// against the worker's Stripe Express account before any charge is created.
// If the account is not charges-enabled, returns 403 with the full requirements
// payload so the caller can redirect the worker to re-onboarding.
//
// Body: {
//   bookingId:             string
//   participantId:         string
//   workerId:              string
//   workerStripeAccountId: string  — Stripe Express account ID (acct_xxx)
//   hourlyRate:            number  — AUD, base rate before participant markup
//   durationHours:         number
//   serviceType?:          string
//   idempotencyKey?:       string  — caller-supplied; defaults to "booking-{bookingId}"
// }
//
// Response: {
//   paymentIntentId, clientSecret, status,
//   split: { participantChargeAUD, workerPayoutAUD, platformFeeAUD },
//   compliance: { chargesEnabled, payoutsEnabled, onboardingComplete }
// }
export async function POST(req: Request) {
  let stripe: Stripe;
  try { stripe = getStripe(); }
  catch (e) {
    return NextResponse.json(
      { error: 'STRIPE_NOT_CONFIGURED', message: (e as Error).message, retryable: false },
      { status: 503 },
    );
  }

  let body: {
    bookingId?:             string;
    participantId?:         string;
    workerId?:              string;
    workerStripeAccountId?: string;
    hourlyRate?:            number;
    durationHours?:         number;
    serviceType?:           string;
    idempotencyKey?:        string;
  };
  try { body = await req.json() as typeof body; }
  catch {
    return NextResponse.json(
      { error: 'INVALID_BODY', message: 'Request body must be valid JSON', retryable: false },
      { status: 400 },
    );
  }

  const {
    bookingId, participantId, workerId,
    workerStripeAccountId, hourlyRate, durationHours,
    serviceType, idempotencyKey,
  } = body;

  if (!bookingId || !participantId || !workerId || !workerStripeAccountId || !hourlyRate || !durationHours) {
    return NextResponse.json({
      error:     'MISSING_FIELDS',
      message:   'Required: bookingId, participantId, workerId, workerStripeAccountId, hourlyRate, durationHours',
      retryable: false,
    }, { status: 400 });
  }

  // ── Compliance pre-flight ──────────────────────────────────────────────────
  let account: Stripe.Account;
  try {
    account = await stripe.accounts.retrieve(workerStripeAccountId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not retrieve worker account';
    return NextResponse.json(
      { error: 'ACCOUNT_LOOKUP_FAILED', message, retryable: true },
      { status: 502 },
    );
  }

  if (!account.charges_enabled) {
    const e = new ComplianceBlockError(
      'Worker Stripe account is not yet enabled for charges',
      workerStripeAccountId,
      account.requirements?.currently_due ?? [],
      account.requirements?.disabled_reason ?? null,
    );
    return NextResponse.json({
      error:           e.code,
      message:         e.message,
      retryable:       e.retryable,
      stripeAccountId: workerStripeAccountId,
      requirements: {
        currentlyDue:   account.requirements?.currently_due   ?? [],
        pastDue:        account.requirements?.past_due        ?? [],
        disabledReason: account.requirements?.disabled_reason ?? null,
      },
    }, { status: e.httpStatus });
  }

  // ── Fee split ──────────────────────────────────────────────────────────────
  const split   = computeSplit(hourlyRate, durationHours);
  const idemKey = idempotencyKey ?? `booking-${bookingId}`;

  // ── Create PaymentIntent ───────────────────────────────────────────────────
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.create(
      {
        amount:                 split.participantChargeCents,
        currency:               'aud',
        application_fee_amount: split.platformFeeCents,
        transfer_data:          { destination: workerStripeAccountId },
        metadata: {
          bookingId,
          participantId,
          workerId,
          workerStripeAccountId,
          serviceType:      serviceType ?? '',
          hourlyRateAUD:    String(hourlyRate),
          durationHours:    String(durationHours),
          workerPayoutAUD:  split.workerPayoutAUD,
          platformFeeAUD:   split.platformFeeAUD,
        },
        description: `OpenCare — ${serviceType ?? 'Support Session'} (${durationHours}h @ $${hourlyRate}/hr)`,
      },
      { idempotencyKey: idemKey },
    );
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json({
        error:     err.code      ?? 'PAYMENT_INTENT_FAILED',
        message:   err.message,
        retryable: err instanceof Stripe.errors.StripeConnectionError,
      }, { status: err.statusCode ?? 500 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'INTERNAL_ERROR', message, retryable: false }, { status: 500 });
  }

  return NextResponse.json({
    paymentIntentId: pi.id,
    clientSecret:    pi.client_secret,
    status:          pi.status,
    split: {
      participantChargeAUD: split.participantChargeAUD,
      workerPayoutAUD:      split.workerPayoutAUD,
      platformFeeAUD:       split.platformFeeAUD,
    },
    compliance: {
      chargesEnabled:     account.charges_enabled,
      payoutsEnabled:     account.payouts_enabled,
      onboardingComplete: account.charges_enabled && account.payouts_enabled,
    },
  });
}

// GET /api/payments?paymentIntentId=pi_xxx
//
// Retrieve the current status of a PaymentIntent. Used to poll after 3DS
// authentication or when webhook delivery is delayed.
export async function GET(req: Request) {
  let stripe: Stripe;
  try { stripe = getStripe(); }
  catch (e) {
    return NextResponse.json(
      { error: 'STRIPE_NOT_CONFIGURED', message: (e as Error).message, retryable: false },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const paymentIntentId  = searchParams.get('paymentIntentId');

  if (!paymentIntentId) {
    return NextResponse.json(
      { error: 'MISSING_PARAM', message: 'paymentIntentId query param is required', retryable: false },
      { status: 400 },
    );
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    return NextResponse.json({
      paymentIntentId:  pi.id,
      status:           pi.status,
      amountCents:      pi.amount,
      currency:         pi.currency,
      metadata:         pi.metadata,
      lastPaymentError: pi.last_payment_error
        ? { code: pi.last_payment_error.code, message: pi.last_payment_error.message }
        : null,
    });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: err.code ?? 'LOOKUP_FAILED', message: err.message, retryable: false },
        { status: err.statusCode ?? 500 },
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'INTERNAL_ERROR', message, retryable: false }, { status: 500 });
  }
}
