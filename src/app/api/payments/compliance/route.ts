import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, buildComplianceReport } from '@/lib/stripeClient';

// GET /api/payments/compliance?stripeAccountId=acct_xxx&workerId=xxx
//
// Returns a full ComplianceReport for a support worker covering:
//
//   stripe — Stripe Express account capability status (live, from Stripe API)
//     chargesEnabled, payoutsEnabled, detailsSubmitted, onboardingComplete
//     currentlyDue / pastDue requirements, disabledReason, payoutSchedule
//
//   ndis — NDIS Worker Screening status (schema-ready)
//     screeningStatus: 'cleared' | 'pending' | 'barred' | 'unknown'
//     clearanceExpiry, ndisApproved, checkMethod
//     → Populate by passing ndisOverrides once you integrate the NDIS
//       Worker Screening Database API (via a service layer, not this route).
//
//   overallStatus — 'cleared' | 'blocked' | 'pending_review'
//     Single field the payment controller and coordinator UI can gate on.
//
//   blockingReasons — human-readable list of what is preventing clearance.
//
// This is the pre-authorisation gate. Call it before creating a PaymentIntent
// when you need the full report (the POST /api/payments route performs a
// lighter inline check sufficient for single-charge authorisation).
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
  const workerId         = searchParams.get('workerId');

  if (!stripeAccountId || !workerId) {
    return NextResponse.json({
      error:     'MISSING_PARAMS',
      message:   'Both stripeAccountId and workerId are required query params',
      retryable: false,
    }, { status: 400 });
  }

  try {
    const report = await buildComplianceReport(stripe, stripeAccountId);
    return NextResponse.json({ workerId, ...report });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json({
        error:     err.code      ?? 'COMPLIANCE_CHECK_FAILED',
        message:   err.message,
        retryable: err instanceof Stripe.errors.StripeConnectionError,
      }, { status: err.statusCode ?? 502 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'INTERNAL_ERROR', message, retryable: true }, { status: 502 });
  }
}
