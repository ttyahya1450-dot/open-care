'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import AppTour from '../../components/AppTour';
import { useRouteGuard } from '../../hooks/useRouteGuard';

const HOURLY_RATE = 92;
const WORKER_NAME = 'Maya Chen';

export default function CheckoutPage() {
  const [hours, setHours] = useState(4);
  const [booked, setBooked] = useState(false);

  const { isAllowed } = useRouteGuard({ allowedRoles: ['PARTICIPANT'] });

  const fees = useMemo(() => {
    const bookingTotal             = HOURLY_RATE * hours;
    const participantCheckoutTotal = bookingTotal * 1.05;
    const workerPayoutAmount       = bookingTotal * 0.925;
    const platformFeeAmount        = participantCheckoutTotal - workerPayoutAmount;
    const participantSurcharge     = bookingTotal * 0.05;
    const workerDeduction          = bookingTotal * 0.075;
    const agencyPayout             = bookingTotal * 0.6;
    const extraVsAgency            = workerPayoutAmount - agencyPayout;
    const extraPercent             = ((extraVsAgency / agencyPayout) * 100).toFixed(1);
    return { bookingTotal, participantCheckoutTotal, workerPayoutAmount, platformFeeAmount, participantSurcharge, workerDeduction, agencyPayout, extraVsAgency, extraPercent };
  }, [hours]);

  if (!isAllowed) return null;

  if (booked) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-surface dark:bg-slate-900 px-5 overflow-x-hidden transition-colors duration-200">
        <div className="bg-white dark:bg-slate-800 rounded-[24px] p-11 text-center max-w-[480px] w-full shadow-card-lg dark:shadow-none border border-surface-border dark:border-slate-700 animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-5 text-[26px]">✓</div>
          <h1 className="text-[24px] font-extrabold text-navy dark:text-white mb-2">Booking confirmed!</h1>
          <p className="text-muted dark:text-slate-400 text-[15px] mb-1.5">{hours} hr{hours > 1 ? 's' : ''} with {WORKER_NAME}</p>
          <p className="font-extrabold text-[24px] text-brand mb-7 tracking-tight">${fees.participantCheckoutTotal.toFixed(2)} charged</p>
          <div className="bg-surface dark:bg-slate-700 rounded-2xl p-4 mb-7 text-left grid gap-2.5 border border-surface-border dark:border-slate-600">
            <div className="flex justify-between text-sm">
              <span className="text-muted-light dark:text-slate-400 font-semibold">Worker receives</span>
              <span className="font-bold text-green-700 dark:text-green-400">${fees.workerPayoutAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-light dark:text-slate-400 font-semibold">Platform fee</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">${fees.platformFeeAmount.toFixed(2)}</span>
            </div>
          </div>
          <Link href="/" className="btn-primary text-[15px] px-8 py-3.5">
            Back to marketplace
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-checkout-page dark:bg-none dark:bg-slate-950 text-navy dark:text-slate-100 overflow-x-hidden transition-colors duration-200">
      <Navbar />

      <section className="w-full max-w-md sm:max-w-[1120px] mx-auto overflow-x-hidden px-4 sm:px-5 py-6 sm:py-9 grid gap-5 sm:gap-7">
        <div>
          <p className="section-label mb-2">OpenCare Checkout</p>
          <h1 className="page-title text-slate-900 dark:text-white">Transparent, fair booking pricing</h1>
          <p className="page-sub mt-3 max-w-[700px]">
            See exactly what you pay, what {WORKER_NAME} receives, and how OpenCare&apos;s 12.5% blended fee compares to a traditional agency.
          </p>
        </div>

        {/* Hours slider */}
        <div className="card">
          <label className="flex flex-col gap-2.5 font-bold text-sm text-navy dark:text-slate-200">
            Session duration
            <div className="flex items-center gap-5">
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="accent-brand flex-1"
              />
              <span className="font-extrabold text-brand text-[18px] min-w-[60px] tracking-tight">
                {hours} hr{hours > 1 ? 's' : ''}
              </span>
            </div>
          </label>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* Fee breakdown */}
          <div id="fee-breakdown" className="card-lg">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-[21px] font-bold text-navy dark:text-white m-0">Booking summary</h2>
                <p className="text-muted-light dark:text-slate-400 text-sm mt-1.5">{hours} hr{hours > 1 ? 's' : ''} with {WORKER_NAME}</p>
              </div>
              <div className="text-right">
                <div className="text-[26px] font-extrabold tracking-tight text-navy dark:text-white">${fees.bookingTotal.toFixed(2)}</div>
                <div className="text-brand font-semibold text-xs">Base total</div>
              </div>
            </div>

            <div className="grid gap-2.5 mb-5">
              {/* Base */}
              <div className="bg-surface dark:bg-slate-700 rounded-2xl p-4 flex justify-between items-center border border-surface-border dark:border-slate-600">
                <div>
                  <div className="font-semibold text-sm text-navy dark:text-slate-200">Base booking total</div>
                  <div className="text-xs text-muted-light dark:text-slate-400 mt-0.5">${HOURLY_RATE}/hr × {hours} hr{hours > 1 ? 's' : ''}</div>
                </div>
                <span className="font-bold text-base text-navy dark:text-slate-100">${fees.bookingTotal.toFixed(2)}</span>
              </div>

              {/* You pay */}
              <div className="bg-brand-xlight dark:bg-brand/10 rounded-2xl p-4 flex justify-between items-center border border-brand-border dark:border-brand/30">
                <div>
                  <div className="font-semibold text-sm text-navy dark:text-slate-200">You pay (+5% participant fee)</div>
                  <div className="text-xs text-brand-mid mt-0.5">Your share of the platform fee</div>
                </div>
                <span className="font-extrabold text-[18px] text-brand-mid">${fees.participantCheckoutTotal.toFixed(2)}</span>
              </div>

              {/* Worker receives */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 flex justify-between items-center border border-green-200 dark:border-green-800">
                <div>
                  <div className="font-semibold text-sm text-navy dark:text-slate-200">Worker receives (−7.5%)</div>
                  <div className="text-xs text-green-700 dark:text-green-400 mt-0.5">Worker&apos;s share of platform fee</div>
                </div>
                <span className="font-extrabold text-[18px] text-green-800 dark:text-green-400">${fees.workerPayoutAmount.toFixed(2)}</span>
              </div>

              {/* Platform fee with exact split */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800">
                <div className="flex justify-between items-center mb-2.5">
                  <div className="font-semibold text-sm text-navy dark:text-slate-200">OpenCare platform fee</div>
                  <span className="font-extrabold text-[18px] text-amber-800 dark:text-amber-400">${fees.platformFeeAmount.toFixed(2)}</span>
                </div>
                <div className="grid gap-1.5 border-t border-amber-200 dark:border-amber-800/60 pt-2.5">
                  <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
                    <span>Participant side (+5% on base)</span>
                    <span className="font-semibold">+${fees.participantSurcharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
                    <span>Worker side (−7.5% of base)</span>
                    <span className="font-semibold">−${fees.workerDeduction.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-wide pt-0.5 border-t border-amber-200/60 dark:border-amber-800/40 mt-0.5">
                    <span>Total blended take-rate</span>
                    <span>12.5%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Safe Cancellation */}
            <div
              id="cancellation-policy"
              className="flex gap-3 items-start bg-surface dark:bg-slate-700 border border-surface-divider dark:border-slate-600 rounded-2xl p-4 mb-4"
            >
              <span className="text-[20px] shrink-0">🛡️</span>
              <div>
                <div className="font-bold text-[13px] text-navy dark:text-slate-200 mb-1">Safe Cancellation — 24-hour protection</div>
                <div className="text-xs text-muted-light dark:text-slate-400 leading-relaxed">
                  If you cancel less than 24 hours before the shift, the worker receives a guaranteed baseline fee of{' '}
                  <strong className="text-navy dark:text-slate-200">1 hour at their agreed rate</strong> ($92). This protects their income and keeps the marketplace fair.
                </div>
              </div>
            </div>

            <button
              onTouchStart={(e) => { e.preventDefault(); setBooked(true); }}
              onClick={() => setBooked(true)}
              className="w-full py-4 rounded-2xl bg-brand-gradient text-white font-extrabold text-[15px] cursor-pointer border-none shadow-brand hover:opacity-95 active:scale-[0.98] transition-all tracking-wide"
            >
              Confirm booking — ${fees.participantCheckoutTotal.toFixed(2)}
            </button>
          </div>

          {/* Why OpenCare — dark card; always dark regardless of theme */}
          <div className="bg-navy-card rounded-[24px] p-[26px] text-white shadow-dark-card">
            <h2 className="text-[21px] font-bold mb-3">Why OpenCare feels better</h2>
            <p className="leading-relaxed text-white/80 text-[14px] mb-5">
              A traditional agency keeps 40% of the booking. OpenCare&apos;s 7.5% worker-side fee leaves significantly more in {WORKER_NAME}&apos;s pocket.
            </p>

            <div className="grid gap-2.5">
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-widest opacity-60 mb-1.5 font-semibold">OpenCare worker payout</div>
                <div className="text-[30px] font-extrabold tracking-tight">${fees.workerPayoutAmount.toFixed(2)}</div>
              </div>
              <div className="bg-white/7 rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-widest opacity-60 mb-1.5 font-semibold">Agency would have paid</div>
                <div className="text-[22px] font-bold opacity-65">${fees.agencyPayout.toFixed(2)}</div>
              </div>
              <div className="bg-green-400/15 rounded-2xl p-4 border border-green-400/20">
                <div className="text-[11px] uppercase tracking-widest opacity-85 mb-1.5 font-semibold">Extra vs agency model</div>
                <div className="text-[30px] font-extrabold text-green-300 tracking-tight">${fees.extraVsAgency.toFixed(2)} more</div>
                <div className="text-green-300 font-semibold text-[13px] mt-1.5">{fees.extraPercent}% more for the worker</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AppTour />
    </main>
  );
}
