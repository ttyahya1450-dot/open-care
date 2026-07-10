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
      icon: '🔍', title: 'Find the right worker for you',
      description: 'Use the suburb search and hourly-rate slider to find support workers near you that fit your budget. Results update live as you adjust — no page reloads needed.',
      targetId: 'marketplace-filters', hint: 'Try adjusting the filters highlighted above', nextRoute: '/workers',
    },
    {
      icon: '💪', title: 'Real strengths, not star ratings',
      description: "Every worker shows verified badges like Highly Punctual, Calm in High-Stress Situations, and First Aid Certified. These come from real coordinator assessments — not anonymous reviews.",
      targetId: 'worker-strengths', hint: 'Browse the strengths section highlighted above', nextRoute: '/checkout',
    },
    {
      icon: '💳', title: 'No hidden fees — ever',
      description: "OpenCare's service fee is shared openly: you pay 5% on top of the worker's rate, the worker contributes 7.5%. Every dollar is shown upfront before you confirm a booking.",
      targetId: 'fee-breakdown', hint: 'See the full fee breakdown highlighted below', nextRoute: '/checkout',
    },
    {
      icon: '💰', title: 'Check your NDIS funds anytime',
      description: 'Your coordinator keeps a live view of your NDIS plan balance, spending rate, and remaining hours. You can see exactly how much funding is left and how quickly it is being used.',
      targetId: 'plan-snapshot', hint: 'Your plan snapshot shows your current balance and recent activity', nextRoute: null,
    },
    {
      icon: '🛡️', title: 'Your bookings are always protected',
      description: 'Cancel up to 24 hours before a shift at no charge. Cancel within 24 hours and the worker receives a guaranteed 1-hour fee — keeping things fair without a financial penalty to you.',
      targetId: 'cancellation-policy', hint: 'See the Safe Cancellation notice highlighted above the booking button', nextRoute: null,
    },
  ],
  WORKER: [
    {
      icon: '📝', title: 'Your profile is your introduction',
      description: "Your profile shows your hourly rate, suburb, strength badges, and roster availability. Participants search by suburb and rate — a complete profile with verified strengths gets you more bookings.",
      targetId: 'worker-strengths', hint: 'Browse your strengths section — tap "Expand editor" to update anything', nextRoute: null,
    },
    {
      icon: '⚡', title: 'Signal you\'re available right now',
      description: "Flip on Standby Shift Availability to show participants and coordinators you're free today. Your profile badge updates live and you become visible in same-day searches in your area.",
      targetId: 'lastminute-toggle', hint: 'Try the standby toggle highlighted on your dashboard', nextRoute: null,
    },
    {
      icon: '🔔', title: 'Review shift requests before accepting',
      description: "When a coordinator sends you a shift, it appears in Incoming Shift Requests. Tap the card to read the participant's full care profile, then accept or decline with one tap — no pressure.",
      targetId: 'instant-payout', hint: 'Check the shift requests section below the calendar', nextRoute: null,
    },
    {
      icon: '💸', title: 'Get paid quickly after every shift',
      description: "Once you clock out and the shift is verified, you can cash out 80% of your earnings straight away. The remaining 20% clears after your coordinator confirms the session — usually within 24 hours.",
      targetId: 'instant-payout', hint: 'See your available balance and cash-out button highlighted below', nextRoute: null,
    },
  ],
  COORDINATOR: [
    {
      icon: '🛡️', title: 'Protect a participant\'s plan with one tap',
      description: "When funding is running low, hit the Budget Safeguard button to pause non-essential bookings and notify the participant's family automatically — no phone calls or emails needed.",
      targetId: 'budget-safeguard', hint: 'See the Budget Safeguard panel highlighted above', nextRoute: null,
    },
    {
      icon: '📊', title: 'Spot funding issues before they happen',
      description: 'Green, amber, and red indicators show each participant\'s budget health in real time. Alerts fire early — before funds run out — giving you time to adjust the plan and avoid disruption.',
      targetId: 'burnrate-alert', hint: 'Check the burn-rate alert highlighted on the right', nextRoute: null,
    },
    {
      icon: '📅', title: 'Your whole care team in one view',
      description: 'See every participant and worker across the full week at a glance. Shift-swap requests surface with a ⇄ badge. Last-minute fills show ⚡. Tap any shift to review, approve, or reassign.',
      targetId: 'care-calendar', hint: 'Scroll to the shared calendar highlighted below', nextRoute: null,
    },
    {
      icon: '📋', title: 'Audit records ready in one click',
      description: 'Workers log a brief post-shift note after every session. When you need to submit NDIS records, one click generates a complete, professionally formatted PDF — no manual work required.',
      targetId: 'shift-notes-export', hint: 'See the Shift Notes panel at the bottom of the page', nextRoute: null,
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
