import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function initStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
  });
}

// POST /api/stripe/connect/onboard
//
// Creates a Stripe Express connected account for a support worker and returns
// an account-link URL to complete KYC onboarding.
//
// Body: {
//   workerId:       string   — internal OpenCare worker ID
//   email:          string   — worker's email (pre-fills Stripe form)
//   returnUrl:      string   — redirect after successful onboarding
//   refreshUrl:     string   — redirect if link expires (re-entry point)
//   stripeAccountId?: string — pass to regenerate a link for an existing account
// }
export async function POST(req: Request) {
  let stripe: Stripe;
  try { stripe = initStripe(); }
  catch { return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 }); }

  let body: {
    workerId?:       string;
    email?:          string;
    returnUrl?:      string;
    refreshUrl?:     string;
    stripeAccountId?: string;
  };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { workerId, email, returnUrl, refreshUrl, stripeAccountId } = body;

  if (!workerId || !email || !returnUrl || !refreshUrl) {
    return NextResponse.json({
      error: 'Missing required fields: workerId, email, returnUrl, refreshUrl',
    }, { status: 400 });
  }

  try {
    let accountId = stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type:          'express',
        country:       'AU',
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        business_type: 'individual',
        metadata:      { opencare_worker_id: workerId },
      });
      accountId = account.id;
    }

    const accountLink = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: refreshUrl,
      return_url:  returnUrl,
      type:        'account_onboarding',
    });

    return NextResponse.json({
      stripeAccountId: accountId,
      onboardingUrl:   accountLink.url,
      expiresAt:       new Date(accountLink.expires_at * 1000).toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
