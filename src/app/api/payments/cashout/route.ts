import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, CashoutError, isRetryableCashoutCode } from '@/lib/stripeClient';

// POST /api/payments/cashout
//
// Moves funds from a worker's Stripe Express balance to their registered
// bank account. Workers accumulate balance via destination charges from
// completed bookings; this triggers the actual bank transfer.
//
// Compliance gate: account must have payouts_enabled = true before payout
// is attempted. If not, returns 403 with the blocking requirements.
//
// Body: {
//   workerId:              string
//   workerStripeAccountId: string   — acct_xxx
//   amountAUD?:            number   — omit to pay out full available AUD balance
//   description?:          string
// }
//
// Response (201): { payoutId, amountAUD, status, arrivalDate, method }
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
    workerId?:              string;
    workerStripeAccountId?: string;
    amountAUD?:             number;
    description?:           string;
  };
  try { body = await req.json() as typeof body; }
  catch {
    return NextResponse.json(
      { error: 'INVALID_BODY', message: 'Request body must be valid JSON', retryable: false },
      { status: 400 },
    );
  }

  const { workerId, workerStripeAccountId, amountAUD, description } = body;

  if (!workerId || !workerStripeAccountId) {
    return NextResponse.json({
      error:     'MISSING_FIELDS',
      message:   'Required: workerId, workerStripeAccountId',
      retryable: false,
    }, { status: 400 });
  }

  // ── Payout compliance gate ─────────────────────────────────────────────────
  let account: Stripe.Account;
  try {
    account = await stripe.accounts.retrieve(workerStripeAccountId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Account lookup failed';
    return NextResponse.json({ error: 'ACCOUNT_LOOKUP_FAILED', message, retryable: true }, { status: 502 });
  }

  if (!account.payouts_enabled) {
    return NextResponse.json({
      error:     'COMPLIANCE_BLOCKED',
      message:   'Worker account is not yet enabled for payouts',
      retryable: false,
      requirements: {
        currentlyDue:   account.requirements?.currently_due   ?? [],
        disabledReason: account.requirements?.disabled_reason ?? null,
      },
    }, { status: 403 });
  }

  // ── Resolve payout amount ──────────────────────────────────────────────────
  let amountCents: number;

  if (amountAUD != null) {
    amountCents = Math.round(amountAUD * 100);
  } else {
    // Auto-resolve: pay out the full available AUD balance
    let balance: Stripe.Balance;
    try {
      balance = await stripe.balance.retrieve({ stripeAccount: workerStripeAccountId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Balance lookup failed';
      return NextResponse.json({ error: 'BALANCE_LOOKUP_FAILED', message, retryable: true }, { status: 502 });
    }

    const audEntry = balance.available.find((b) => b.currency === 'aud');
    amountCents    = audEntry?.amount ?? 0;

    if (amountCents === 0) {
      return NextResponse.json({
        error:     'ZERO_BALANCE',
        message:   'No available AUD balance to pay out',
        retryable: false,
      }, { status: 422 });
    }
  }

  // ── Create payout ──────────────────────────────────────────────────────────
  try {
    const payout = await stripe.payouts.create(
      {
        amount:      amountCents,
        currency:    'aud',
        description: description ?? `OpenCare marketplace payout — ${workerId}`,
        metadata:    { workerId, initiatedAt: new Date().toISOString() },
      },
      { stripeAccount: workerStripeAccountId },
    );

    return NextResponse.json({
      payoutId:    payout.id,
      amountAUD:   (payout.amount / 100).toFixed(2),
      status:      payout.status,
      arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
      method:      payout.method,
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      const code      = err.code ?? 'unknown';
      const retryable = isRetryableCashoutCode(code);
      const failure   = new CashoutError(err.message, code, retryable);
      return NextResponse.json({
        error:       failure.code,
        message:     failure.message,
        retryable:   failure.retryable,
        failureCode: code,
      }, { status: failure.httpStatus });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'INTERNAL_ERROR', message, retryable: false }, { status: 500 });
  }
}

// GET /api/payments/cashout?stripeAccountId=acct_xxx&limit=N
//
// Lists recent payouts for a worker's connected account with arrival dates,
// statuses, and failure details. Drives the payout history view on both the
// worker dashboard and coordinator oversight panel.
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
  const stripeAccountId  = searchParams.get('stripeAccountId');
  const limit            = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

  if (!stripeAccountId) {
    return NextResponse.json(
      { error: 'MISSING_PARAM', message: 'stripeAccountId query param is required', retryable: false },
      { status: 400 },
    );
  }

  try {
    const list = await stripe.payouts.list(
      { limit },
      { stripeAccount: stripeAccountId },
    );

    return NextResponse.json({
      stripeAccountId,
      hasMore: list.has_more,
      payouts: list.data.map((p) => ({
        payoutId:       p.id,
        amountAUD:      (p.amount / 100).toFixed(2),
        status:         p.status,
        arrivalDate:    new Date(p.arrival_date * 1000).toISOString(),
        method:         p.method,
        failureCode:    p.failure_code    ?? null,
        failureMessage: p.failure_message ?? null,
        createdAt:      new Date(p.created * 1000).toISOString(),
      })),
    });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: err.code ?? 'PAYOUT_LIST_FAILED', message: err.message, retryable: false },
        { status: err.statusCode ?? 500 },
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'INTERNAL_ERROR', message, retryable: false }, { status: 500 });
  }
}
