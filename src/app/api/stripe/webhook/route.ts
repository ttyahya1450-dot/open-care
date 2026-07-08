import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function initStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
  });
}

// POST /api/stripe/webhook
//
// Receives and verifies signed Stripe webhook events.
// Register this URL in the Stripe Dashboard → Webhooks.
// Required events:
//   payment_intent.succeeded
//   payment_intent.payment_failed
//   account.updated          (worker onboarding completion)
//   transfer.created         (worker payout confirmation)
//
// Next.js App Router exposes the raw body via req.text(), which Stripe's
// constructEvent() requires for HMAC signature verification.
export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  let stripe: Stripe;
  try { stripe = initStripe(); }
  catch { return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 }); }

  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      // TODO: mark booking status = 'confirmed' in DB, emit payout notification to worker
      console.log(`[stripe/webhook] payment_intent.succeeded bookingId=${pi.metadata.bookingId} workerPayout=AUD${pi.metadata.workerPayoutAUD}`);
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      // TODO: mark booking status = 'payment_failed', notify participant
      console.log(`[stripe/webhook] payment_intent.payment_failed bookingId=${pi.metadata.bookingId} reason=${pi.last_payment_error?.message ?? 'unknown'}`);
      break;
    }

    case 'account.updated': {
      const account           = event.data.object as Stripe.Account;
      const onboardingComplete = account.charges_enabled && account.payouts_enabled;
      // TODO: update worker record: stripeOnboardingComplete = onboardingComplete
      console.log(`[stripe/webhook] account.updated acct=${account.id} onboardingComplete=${onboardingComplete}`);
      break;
    }

    case 'transfer.created': {
      const transfer = event.data.object as Stripe.Transfer;
      // TODO: log payout record, notify worker of incoming transfer
      console.log(`[stripe/webhook] transfer.created id=${transfer.id} destination=${String(transfer.destination)} amount=AUD${(transfer.amount / 100).toFixed(2)}`);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
