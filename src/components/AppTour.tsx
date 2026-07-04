'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type UserRole } from '../context/AuthContext';

interface TourStep {
  icon: string; title: string; description: string;
  targetId: string; hint: string; nextRoute: string | null;
}

const STEPS_BY_ROLE: Record<UserRole, TourStep[]> = {
  PARTICIPANT: [
    {
      icon: '🔍', title: 'Smart marketplace filters',
      description: 'Use suburb search and the hourly-rate slider to find support workers that match your location and budget. Results update live as you adjust.',
      targetId: 'marketplace-filters', hint: 'Look at the filter panel highlighted above', nextRoute: '/workers',
    },
    {
      icon: '💪', title: 'Strengths-based worker profiles',
      description: "Every worker's profile shows verified strength badges — Highly Punctual, Great with Non-Verbal Communication, Calm in High-Stress Situations — instead of generic star ratings.",
      targetId: 'worker-strengths', hint: 'Scroll through the strengths profile section', nextRoute: '/checkout',
    },
    {
      icon: '💳', title: 'Transparent 12.5% fee breakdown',
      description: "OpenCare's blended fee is split openly across both sides — you see what you pay (+5%), what the worker receives (−7.5%), and exactly where the platform fee goes. No hidden costs.",
      targetId: 'fee-breakdown', hint: 'See the four-row breakdown highlighted below', nextRoute: '/checkout',
    },
    {
      icon: '🛡️', title: 'Safe Cancellation protection',
      description: 'If you cancel within 24 hours of a shift, the worker receives a guaranteed baseline fee of 1 hour at their agreed rate. This protects their income and keeps the marketplace fair for everyone.',
      targetId: 'cancellation-policy', hint: 'See the Safe Cancellation notice above the booking button', nextRoute: null,
    },
  ],
  WORKER: [
    {
      icon: '⚡', title: 'Standby shift availability',
      description: "Flip on 'Standby Shift Availability' to signal you're available for same-day shifts. Your profile gets a live availability badge visible to participants searching in your area right now.",
      targetId: 'lastminute-toggle', hint: 'See the standby toggle highlighted on your dashboard', nextRoute: null,
    },
    {
      icon: '💸', title: 'Instant invoice payouts',
      description: 'Cash out 80% of your confirmed shift earnings instantly — no waiting for end-of-week payroll. The remaining 20% clears after the coordinator confirms delivery.',
      targetId: 'instant-payout', hint: 'See the payout widget highlighted below', nextRoute: null,
    },
  ],
  COORDINATOR: [
    {
      icon: '🛡️', title: '1-click budget safeguard',
      description: 'When a participant is tracking to exhaust their NDIS plan funds early, a single button pauses non-essential new bookings and notifies families — protecting the care plan without manual escalation.',
      targetId: 'budget-safeguard', hint: 'See the Budget Safeguard panel highlighted above', nextRoute: null,
    },
    {
      icon: '📊', title: 'NDIS budget burn-rate alert',
      description: 'Colour-coded alerts — green, amber, red — show live budget health per participant. The alert fires before funding runs out, giving coordinators time to act.',
      targetId: 'burnrate-alert', hint: 'Check the alert panel highlighted on the right', nextRoute: null,
    },
    {
      icon: '📅', title: 'Care team shared calendar',
      description: 'See the full week across all participants and workers in one view. Shift-swap requests surface with a ⇄ badge. Last-minute fills appear with ⚡. Click any shift to review or approve.',
      targetId: 'care-calendar', hint: 'Scroll to the calendar highlighted below', nextRoute: null,
    },
    {
      icon: '📋', title: 'Shift notes & audit-ready PDF',
      description: 'Workers log post-shift updates with a mood indicator. One click generates a compliant PDF export covering all notes for NDIS audit readiness — no manual formatting required.',
      targetId: 'shift-notes-export', hint: 'See the Shift Notes panel at the bottom', nextRoute: null,
    },
  ],
};

const PAD = 14;

interface SpotRect { top: number; left: number; width: number; height: number; }
interface CardPos  { top?: number; bottom?: number; }

export default function AppTour() {
  const { user, isNewUser, tourCompleted, tourStep, setTourStep, completeTour } = useAuth();
  const router = useRouter();

  const [spotRect, setSpotRect] = useState<SpotRect | null>(null);
  const [cardPos,  setCardPos]  = useState<CardPos>({ bottom: 32 });
  const [ready,    setReady]    = useState(false);

  const role  = user?.role ?? 'PARTICIPANT';
  const steps = STEPS_BY_ROLE[role];
  const step  = steps[Math.min(tourStep, steps.length - 1)];

  useEffect(() => {
    if (!isNewUser || tourCompleted || !step) { setReady(false); return; }

    const run = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          const r = el.getBoundingClientRect();
          setSpotRect({ top: r.top, left: r.left, width: r.width, height: r.height });
          const mid = r.top + r.height / 2;
          if (mid < window.innerHeight * 0.52) {
            setCardPos({ top: Math.min(r.top + r.height + PAD + 16, window.innerHeight - 320) });
          } else {
            setCardPos({ bottom: Math.max(window.innerHeight - r.top + PAD + 16, 24) });
          }
          setReady(true);
        }, 380);
      } else {
        setSpotRect(null);
        setCardPos({ bottom: 32 });
        setReady(true);
      }
    };

    const t = setTimeout(run, 420);
    return () => clearTimeout(t);
  }, [isNewUser, tourCompleted, tourStep, step]);

  if (!isNewUser || tourCompleted || !ready || !step) return null;

  const advance = () => {
    if (tourStep < steps.length - 1) {
      setTourStep(tourStep + 1);
      setReady(false);
      if (step.nextRoute) router.push(step.nextRoute);
    } else {
      completeTour();
    }
  };

  const ROLE_LABEL: Record<string, string> = {
    PARTICIPANT: '🙋 Participant',
    WORKER:      '🤝 Support Worker',
    COORDINATOR: '📋 Coordinator',
  };

  return (
    <>
      {/* Spotlight overlay */}
      {spotRect ? (
        <svg
          aria-hidden="true"
          className="fixed inset-0 w-screen h-screen z-[1000] pointer-events-none"
        >
          <defs>
            <mask id="oc-tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={spotRect.left - PAD} y={spotRect.top - PAD}
                width={spotRect.width + PAD * 2} height={spotRect.height + PAD * 2}
                rx="14" fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(8,12,30,0.78)" mask="url(#oc-tour-mask)" />
          <rect
            x={spotRect.left - PAD} y={spotRect.top - PAD}
            width={spotRect.width + PAD * 2} height={spotRect.height + PAD * 2}
            rx="14" fill="none" stroke="#3f6df6" strokeWidth="2" strokeDasharray="7 4" opacity="0.9"
          />
          <rect
            x={spotRect.left - PAD - 4} y={spotRect.top - PAD - 4}
            width={spotRect.width + (PAD + 4) * 2} height={spotRect.height + (PAD + 4) * 2}
            rx="18" fill="none" stroke="#3f6df6" strokeWidth="6" opacity="0.12"
          />
        </svg>
      ) : (
        <div aria-hidden className="fixed inset-0 bg-[rgba(8,12,30,0.78)] z-[1000] pointer-events-none" />
      )}

      {/* Tour card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Tour step ${tourStep + 1} of ${steps.length}: ${step.title}`}
        className="fixed z-[1001] left-1/2 -translate-x-1/2 rounded-[24px] overflow-hidden shadow-dialog animate-slide-up"
        style={{ width: 'min(460px, calc(100vw - 32px))', ...cardPos }}
      >
        {/* Header */}
        <div className="bg-tour-header px-5 pt-5 pb-4 text-white">
          <div className="flex justify-between items-start">
            <div className="flex gap-3 items-center">
              <span className="text-[26px] leading-none bg-white/12 rounded-xl w-11 h-11 flex items-center justify-center shrink-0">
                {step.icon}
              </span>
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] opacity-55 mb-1 font-semibold">
                  {role} tour · Step {tourStep + 1} of {steps.length}
                </div>
                <h3 className="m-0 text-[16px] font-bold leading-tight">{step.title}</h3>
              </div>
            </div>
            <button
              onClick={() => completeTour()}
              aria-label="Skip tour"
              className="bg-white/10 border-none text-white/70 w-7 h-7 rounded-full cursor-pointer text-[13px] shrink-0 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex mt-3">
            <span className="text-[10px] bg-white/12 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
              {ROLE_LABEL[role]}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5 mt-3.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className="h-[3px] flex-1 rounded-full transition-colors duration-300"
                style={{ background: i <= tourStep ? '#3f6df6' : 'rgba(255,255,255,0.18)' }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="bg-white px-5 pt-4.5 pb-5">
          <p className="text-sm text-muted-darker leading-relaxed mb-3.5">{step.description}</p>
          {step.hint && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-[10px] px-3 py-2.5 mb-4">
              <span className="text-sm">👆</span>
              <span className="text-[13px] text-blue-700 font-semibold">{step.hint}</span>
            </div>
          )}
          <div className="flex gap-2 justify-end items-center">
            <button
              onClick={() => completeTour()}
              className="btn-secondary text-[13px] px-4 py-2.5"
            >
              Skip tour
            </button>
            <button
              onClick={advance}
              className="btn-primary text-[13px] px-5 py-2.5"
            >
              {tourStep < steps.length - 1 ? 'Next →' : 'Finish tour ✓'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
