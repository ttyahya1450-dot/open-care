import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, TransferFailureError, isRetryableTransferCode } from '@/lib/stripeClient';

// GET /api/payments/transfers?stripeAccountId=acct_xxx&limit=N
//
// Lists destination-charge transfers made to a worker's connected account,
// grouped by paid vs. reversed (failed/refunded). Used by the coordinator
// ledger to surface transfer status without hitting the Stripe Dashboard.
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
    const list = await stripe.transfers.list({ destination: stripeAccountId, limit });

    const paid     = list.data.filter((t) => !t.reversed);
    const reversed = list.data.filter((t) => t.reversed);

    return NextResponse.json({
      stripeAccountId,
      totalCount: list.data.length,
      hasMore:    list.has_more,
      grouped: {
        paid:     paid.map(serializeTransfer),
        reversed: reversed.map(serializeTransfer),
      },
    });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: err.code ?? 'TRANSFER_LIST_FAILED', message: err.message, retryable: false },
        { status: err.statusCode ?? 500 },
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'INTERNAL_ERROR', message, retryable: false }, { status: 500 });
  }
}

function serializeTransfer(t: Stripe.Transfer) {
  return {
    id:             t.id,
    amountAUD:      (t.amount         / 100).toFixed(2),
    reversedAUD:    (t.amount_reversed / 100).toFixed(2),
    reversed:       t.reversed,
    description:    t.description,
    createdAt:      new Date(t.created * 1000).toISOString(),
    metadata:       t.metadata,
  };
}

// POST /api/payments/transfers
//
// Creates a corrective transfer to a worker's connected account. Use this to
// recover from a failed destination charge or to issue a manual adjustment
// once the root cause (e.g. account_closed, invalid_account_number) is resolved.
//
// Body: {
//   workerId:              string
//   workerStripeAccountId: string  — acct_xxx
//   amountAUD:             number  — exact AUD amount to transfer
//   bookingId:             string  — for audit trail
//   reason:               string  — human-readable reason for this correction
//   retryOfTransferId?:   string  — original failed transfer ID for audit linkage
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
    workerId?:              string;
    workerStripeAccountId?: string;
    amountAUD?:             number;
    bookingId?:             string;
    reason?:                string;
    retryOfTransferId?:     string;
  };
  try { body = await req.json() as typeof body; }
  catch {
    return NextResponse.json(
      { error: 'INVALID_BODY', message: 'Request body must be valid JSON', retryable: false },
      { status: 400 },
    );
  }

  const { workerId, workerStripeAccountId, amountAUD, bookingId, reason, retryOfTransferId } = body;

  if (!workerId || !workerStripeAccountId || !amountAUD || !bookingId || !reason) {
    return NextResponse.json({
      error:     'MISSING_FIELDS',
      message:   'Required: workerId, workerStripeAccountId, amountAUD, bookingId, reason',
      retryable: false,
    }, { status: 400 });
  }

  const amountCents = Math.round(amountAUD * 100);

  try {
    const transfer = await stripe.transfers.create({
      amount:      amountCents,
      currency:    'aud',
      destination: workerStripeAccountId,
      description: reason,
      metadata: {
        workerId,
        bookingId,
        retryOfTransferId: retryOfTransferId ?? '',
        reason,
        initiatedAt:       new Date().toISOString(),
      },
    });

    return NextResponse.json({
      transferId:  transfer.id,
      amountAUD:   (transfer.amount / 100).toFixed(2),
      destination: String(transfer.destination),
      createdAt:   new Date(transfer.created * 1000).toISOString(),
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      const code      = err.code ?? 'unknown';
      const retryable = isRetryableTransferCode(code);
      const failure   = new TransferFailureError(
        err.message, '', workerId, code, retryable,
      );
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
