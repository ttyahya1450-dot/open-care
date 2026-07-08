import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function initStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
  });
}

// GET /api/stripe/connect/status?stripeAccountId=acct_xxx
//
// Returns onboarding state and capability status for a worker's connected account.
// Poll this after the worker returns from the Stripe onboarding URL.
export async function GET(req: Request) {
  let stripe: Stripe;
  try { stripe = initStripe(); }
  catch { return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 }); }

  const { searchParams } = new URL(req.url);
  const stripeAccountId  = searchParams.get('stripeAccountId');

  if (!stripeAccountId) {
    return NextResponse.json({ error: 'Missing stripeAccountId query param' }, { status: 400 });
  }

  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);

    return NextResponse.json({
      stripeAccountId:    account.id,
      chargesEnabled:     account.charges_enabled,
      payoutsEnabled:     account.payouts_enabled,
      detailsSubmitted:   account.details_submitted,
      defaultCurrency:    account.default_currency,
      onboardingComplete: account.charges_enabled && account.payouts_enabled,
      requirements: {
        currentlyDue:   account.requirements?.currently_due   ?? [],
        pastDue:        account.requirements?.past_due        ?? [],
        eventuallyDue:  account.requirements?.eventually_due  ?? [],
        disabledReason: account.requirements?.disabled_reason ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
