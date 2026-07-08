import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function initStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
  });
}

// POST /api/stripe/checkout
//
// Creates a PaymentIntent for a booking using Stripe Connect destination charges.
// Fee split per CLAUDE.md marketplace rules:
//   participantCharge = hourlyRate × 1.05   × durationHours  (participant pays)
//   workerPayout      = hourlyRate × 0.925  × durationHours  (worker receives)
//   platformFee       = participantCharge − workerPayout      (12.5% of hourlyRate)
//
// Body: {
//   bookingId:             string
//   participantId:         string
//   workerId:              string
//   workerStripeAccountId: string  — worker's Stripe Express account ID (acct_xxx)
//   hourlyRate:            number  — AUD, exclusive of participant markup
//   durationHours:         number
//   serviceType?:          string
// }
export async function POST(req: Request) {
  let stripe: Stripe;
  try { stripe = initStripe(); }
  catch { return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 }); }

  let body: {
    bookingId?:             string;
    participantId?:         string;
    workerId?:              string;
    workerStripeAccountId?: string;
    hourlyRate?:            number;
    durationHours?:         number;
    serviceType?:           string;
  };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const {
    bookingId, participantId, workerId,
    workerStripeAccountId, hourlyRate, durationHours, serviceType,
  } = body;

  if (!bookingId || !participantId || !workerId || !workerStripeAccountId || !hourlyRate || !durationHours) {
    return NextResponse.json({
      error: 'Missing required fields: bookingId, participantId, workerId, workerStripeAccountId, hourlyRate, durationHours',
    }, { status: 400 });
  }

  // All amounts in AUD cents (Stripe requires integer cents)
  const participantChargeCents = Math.round(hourlyRate * 1.05  * durationHours * 100);
  const workerPayoutCents      = Math.round(hourlyRate * 0.925 * durationHours * 100);
  const platformFeeCents       = participantChargeCents - workerPayoutCents;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:                 participantChargeCents,
      currency:               'aud',
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: workerStripeAccountId,
      },
      metadata: {
        bookingId,
        participantId,
        workerId,
        serviceType:        serviceType ?? '',
        hourlyRateAUD:      String(hourlyRate),
        durationHours:      String(durationHours),
        workerPayoutAUD:    (workerPayoutCents  / 100).toFixed(2),
        platformFeeAUD:     (platformFeeCents   / 100).toFixed(2),
      },
      description: `OpenCare — ${serviceType ?? 'Support Session'} (${durationHours}h @ $${hourlyRate}/hr)`,
    });

    return NextResponse.json({
      clientSecret:         paymentIntent.client_secret,
      paymentIntentId:      paymentIntent.id,
      participantChargeAUD: (participantChargeCents / 100).toFixed(2),
      workerPayoutAUD:      (workerPayoutCents      / 100).toFixed(2),
      platformFeeAUD:       (platformFeeCents       / 100).toFixed(2),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
