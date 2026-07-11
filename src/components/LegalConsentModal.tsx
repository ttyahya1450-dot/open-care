'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLegalConsent, LEGAL_TERMS_VERSION } from '../context/LegalConsentContext';

// ── Simulated IP (deterministic from email hash for demo) ──────────────────
function simulateIp(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const n = Math.abs(h);
  return `${(n % 223) + 1}.${(n >> 4) % 255}.${(n >> 8) % 255}.${(n >> 12) % 254 + 1}`;
}

function sessionId(): string {
  return 'sess_' + Math.random().toString(36).slice(2, 10);
}

// ── Role-contextual opening summary ───────────────────────────────────────
const ROLE_INTRO: Record<string, { title: string; subtitle: string; icon: string }> = {
  PARTICIPANT: {
    icon:     '🧑‍🦽',
    title:    'Service Agreement — NDIS Participant',
    subtitle: 'Before accessing the OpenCare marketplace, please review and accept your Service Agreement covering your rights, responsibilities, and NDIS plan protections.',
  },
  WORKER: {
    icon:     '🤝',
    title:    'Service Agreement — Independent Support Worker',
    subtitle: 'Before accessing your worker dashboard, please review and accept your contractor agreement covering your payout terms, platform obligations, and client protections.',
  },
  COORDINATOR: {
    icon:     '📋',
    title:    'Service Agreement — Support Coordinator',
    subtitle: 'Before accessing the support coordinator dashboard, please review and accept the platform compliance agreement covering your oversight responsibilities and NDIS obligations.',
  },
};

export default function LegalConsentModal() {
  const { user, completeTour } = useAuth();
  const { hasConsented, recordConsent } = useLegalConsent();

  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [checks, setChecks] = useState({
    intermediary: false,
    antiCircumvention: false,
    cancellation: false,
    master: false,
  });
  const [sigName, setSigName]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Prevent background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setScrolledToBottom(true);
  };

  const allChecked = checks.intermediary && checks.antiCircumvention && checks.cancellation && checks.master;
  const sigValid   = sigName.trim().length >= 3;
  const canSubmit  = allChecked && sigValid && !submitting;

  const handleSubmit = () => {
    if (!user || !canSubmit) return;
    setSubmitting(true);
    setTimeout(() => {
      recordConsent({
        userEmail: user.email,
        userName:  user.name,
        userRole:  user.role,
        agreedToIntermediaryWaiver:  checks.intermediary,
        agreedToAntiCircumvention:   checks.antiCircumvention,
        agreedToCancellationPolicy:  checks.cancellation,
        agreedToMasterTerms:         checks.master,
        signatureName: sigName.trim(),
        timestamp:     new Date().toISOString(),
        termsVersion:  LEGAL_TERMS_VERSION,
        simulatedIp:   simulateIp(user.email),
        sessionId:     sessionId(),
      });
      // Persist isNewUser: false to localStorage immediately so that future page
      // loads (including the next daily login) see isNewUser: false and skip this modal.
      completeTour();
      setSubmitted(true);
    }, 900);
  };

  if (!user || hasConsented) return null;

  const intro = ROLE_INTRO[user.role] ?? ROLE_INTRO.PARTICIPANT;

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-[24px] p-10 text-center max-w-[440px] w-full mx-4 shadow-dialog animate-slide-up">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4 text-[28px]">✓</div>
          <h2 className="text-[20px] font-extrabold text-navy dark:text-white mb-2">Agreement signed</h2>
          <p className="text-muted dark:text-slate-400 text-sm leading-relaxed">
            Your electronic signature has been recorded. You may now access the OpenCare platform.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-[720px] sm:mx-4 sm:rounded-[24px] rounded-t-[24px] shadow-dialog flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-navy-card px-6 py-5 shrink-0">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-[22px]">{intro.icon}</span>
            <div>
              <div className="text-white font-extrabold text-[15px] leading-tight">{intro.title}</div>
              <div className="text-white/55 text-[11px] font-mono mt-0.5">
                OpenCare Terms v{LEGAL_TERMS_VERSION} · NDIS Compliant · {new Date().toLocaleDateString('en-AU')}
              </div>
            </div>
          </div>
          <p className="text-white/75 text-[13px] leading-relaxed">{intro.subtitle}</p>
        </div>

        {/* ── Scrollable legal body ───────────────────────────────────────── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-auto flex-1 px-6 py-5 space-y-6 text-[13px] text-navy dark:text-slate-200 leading-relaxed"
        >
          {/* Scroll prompt */}
          {!scrolledToBottom && (
            <div className="sticky top-0 -mx-6 px-6 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 text-[11px] font-bold flex items-center gap-2">
              <span>↓</span> Please scroll through the full agreement before signing
            </div>
          )}

          {/* ── Section 1: Digital Intermediary Terms ── */}
          <section>
            <h3 className="text-[14px] font-extrabold text-navy dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">1</span>
              Digital Intermediary Terms of Service
            </h3>
            <div className="bg-surface dark:bg-slate-800 rounded-[14px] p-4 border border-surface-border dark:border-slate-700 space-y-3">
              <p className="font-bold text-navy dark:text-white">OpenCare Marketplace Pty Ltd (ABN 00 000 000 000)</p>
              <p>
                <strong className="text-brand">1.1 Platform Status.</strong> OpenCare operates exclusively as a <strong>digital intermediary technology platform</strong>. It is not, and shall not be construed as, an employer, labour-hire agency, registered NDIS provider (with respect to services delivered by Independent Support Workers), staffing agency, or employment broker of any kind.
              </p>
              <p>
                <strong className="text-brand">1.2 Employer Liability Waiver.</strong> All support workers, cleaners, gardeners, occupational therapists, and other service providers listed on the platform are independent contractors who operate their own businesses, set their own hourly rates, and maintain their own insurance and accreditations. <strong className="text-navy dark:text-white">OpenCare bears no vicarious or direct liability</strong> for the delivery, quality, punctuality, safety, clinical adequacy, or continuity of any support service provided by an independent worker engaged through the platform.
              </p>
              <p>
                <strong className="text-brand">1.3 Participant Responsibility.</strong> Participants, their legal guardians, nominees, and support coordinators accept full and sole responsibility for selecting appropriate support workers, conducting their own due diligence on worker suitability, and assessing fitness for their specific care needs. OpenCare provides verification indicators (background check status, GPS clock-in records) as information only — these do not constitute a guarantee of worker suitability.
              </p>
              <p>
                <strong className="text-brand">1.4 Platform Fee Disclosure.</strong> The platform fee of 12.5% blended (5% participant-side / 7.5% worker-side) represents a technology intermediary access fee for use of the OpenCare marketplace platform, booking engine, GPS verification system, and payout infrastructure. It is not an agency commission, employment overhead, or superannuation contribution.
              </p>
              <p>
                <strong className="text-brand">1.5 Regulatory Compliance.</strong> Independent workers are solely responsible for their own NDIS worker screening checks, Working with Children Check (where required), Tax File Number registration, GST obligations, and professional indemnity insurance. OpenCare may verify and display these credentials as a courtesy but does not warrant their ongoing validity.
              </p>
            </div>
          </section>

          {/* ── Section 2: Anti-Circumvention ── */}
          <section>
            <h3 className="text-[14px] font-extrabold text-navy dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-500 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">2</span>
              Anti-Circumvention &amp; Off-Platform Booking Prohibition
            </h3>
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-[14px] p-4 border border-rose-200 dark:border-rose-800 space-y-3">
              <p>
                <strong className="text-rose-700 dark:text-rose-400">2.1 Prohibition Period.</strong> For a period of <strong className="text-navy dark:text-white">twenty-four (24) calendar months</strong> from the date of first introduction between a Participant and a Support Worker through the OpenCare platform, both parties are strictly and irrevocably prohibited from arranging, conducting, processing, or facilitating any bookings, service agreements, invoices, cash payments, or any other consideration for care services outside of the OpenCare platform.
              </p>
              <p>
                <strong className="text-rose-700 dark:text-rose-400">2.2 Liquidated Damages.</strong> Any breach of clause 2.1 constitutes a material breach of this Agreement. The non-breaching party and OpenCare reserve the right to pursue a liquidated damages claim equivalent to the greater of: (a) three (3) months of the average historical monthly booking value between the parties on the platform; or (b) AUD $2,500 — whichever is greater. This clause represents a genuine pre-estimate of loss, not a penalty.
              </p>
              <p>
                <strong className="text-rose-700 dark:text-rose-400">2.3 Reporting Obligation.</strong> Users are required to report to OpenCare within 48 hours any solicitation by the other party to conduct transactions outside the platform. Reports must be submitted to <span className="font-mono text-rose-700 dark:text-rose-400">compliance@opencare.com.au</span>. Failure to report constitutes knowing participation in the breach.
              </p>
              <p>
                <strong className="text-rose-700 dark:text-rose-400">2.4 Survival.</strong> This anti-circumvention clause survives the termination, suspension, or deletion of the user&apos;s OpenCare account and remains enforceable for the full 24-month period from date of introduction.
              </p>
            </div>
          </section>

          {/* ── Section 3: Cancellation Policy ── */}
          <section>
            <h3 className="text-[14px] font-extrabold text-navy dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">3</span>
              NDIS 24-Hour Short Notice Cancellation Policy
            </h3>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-[14px] p-4 border border-amber-200 dark:border-amber-800 space-y-3">
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                In accordance with NDIS Pricing Arrangements and Price Limits — Support Item 04_049_0125_6_1
              </p>
              <p>
                <strong className="text-amber-700 dark:text-amber-400">3.1 Short Notice Cancellation Defined.</strong> A cancellation is considered &quot;short notice&quot; if the Participant (or their authorised representative, nominee, or support coordinator) notifies the Support Worker or OpenCare of cancellation with <strong className="text-navy dark:text-white">less than twenty-four (24) hours</strong> before the confirmed shift start time, regardless of the reason for cancellation.
              </p>
              <p>
                <strong className="text-amber-700 dark:text-amber-400">3.2 Participant Liability.</strong> In the event of a short notice cancellation, the Participant&apos;s NDIS plan (whether NDIA-managed, plan-managed, or self-managed) will be charged the <strong className="text-navy dark:text-white">full agreed service fee</strong> for the cancelled shift, calculated as: Hourly Rate × Confirmed Shift Duration × 1.05 (including the 5% participant platform fee).
              </p>
              <p>
                <strong className="text-amber-700 dark:text-amber-400">3.3 Worker Income Protection.</strong> The Support Worker will receive a guaranteed minimum Short Notice Cancellation payment of <strong className="text-navy dark:text-white">one (1) hour at their agreed hourly rate</strong>, regardless of the stated reason for cancellation. This represents the worker&apos;s protected baseline income for shift preparation, travel to the participant&apos;s location, and opportunity cost.
              </p>
              <p>
                <strong className="text-amber-700 dark:text-amber-400">3.4 Force Majeure Exemptions.</strong> Cancellations arising from acute medical emergency (supported by hospital documentation), natural disaster declaration, or critical incident as defined under the NDIS Code of Conduct may be considered for fee waiver at OpenCare&apos;s sole discretion, subject to receipt of supporting documentation within 48 hours of the scheduled shift start time.
              </p>
              <p>
                <strong className="text-amber-700 dark:text-amber-400">3.5 Repeat Cancellation Review.</strong> Three (3) or more short notice cancellations within any rolling 60-day period will trigger an automatic account review. OpenCare reserves the right to restrict future booking privileges, require advance payment, or suspend the account pending review.
              </p>
            </div>
          </section>

          {/* ── Section 4: Privacy & Data ── */}
          <section>
            <h3 className="text-[14px] font-extrabold text-navy dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">4</span>
              Data, Privacy &amp; GPS Consent
            </h3>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-[14px] p-4 border border-purple-200 dark:border-purple-800 space-y-2 text-[12px]">
              <p>
                <strong className="text-purple-700 dark:text-purple-300">4.1</strong> GPS clock-in/clock-out data is collected from Support Workers for shift verification, NDIS audit compliance, and participant safety purposes only. Workers consent to location capture during active shifts.
              </p>
              <p>
                <strong className="text-purple-700 dark:text-purple-300">4.2</strong> Your electronic signature, timestamp, IP address, and consent record are stored in your user profile and may be produced as legally admissible evidence of your agreement in any dispute resolution or NDIS audit proceeding.
              </p>
              <p>
                <strong className="text-purple-700 dark:text-purple-300">4.3</strong> OpenCare handles personal information in accordance with the <em>Privacy Act 1988 (Cth)</em>, the Australian Privacy Principles, and the NDIS Act 2013. Your data will not be sold or disclosed to third parties except as required by law or NDIS audit requirements.
              </p>
            </div>
          </section>
        </div>

        {/* ── Agreement checklist + signature ────────────────────────────── */}
        <div className="px-6 py-5 border-t border-surface-border dark:border-slate-700 bg-surface dark:bg-slate-800/60 space-y-3 shrink-0">

          {/* Required checkboxes */}
          <div className="space-y-2.5">
            {[
              { key: 'intermediary' as const, label: 'I acknowledge the Intermediary Liability Waiver (Section 1) and understand that OpenCare is not my employer, agency, or NDIS provider.' },
              { key: 'antiCircumvention' as const, label: 'I agree to the Anti-Circumvention clause (Section 2) and commit not to arrange off-platform bookings with any worker or participant introduced through OpenCare.' },
              { key: 'cancellation' as const, label: 'I understand and accept the NDIS 24-Hour Short Notice Cancellation Policy (Section 3), including the fee obligations and worker protection clause.' },
              { key: 'master' as const, label: 'I have read the full OpenCare Digital Intermediary Terms of Service and agree to be legally bound by all clauses above.' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={checks[key]}
                  onChange={(e) => setChecks((p) => ({ ...p, [key]: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded accent-brand cursor-pointer shrink-0"
                />
                <span className={`text-[12px] leading-snug transition-colors ${checks[key] ? 'text-navy dark:text-slate-100' : 'text-muted-dark dark:text-slate-400'}`}>
                  {label}
                </span>
              </label>
            ))}
          </div>

          {/* Electronic signature */}
          <div className="pt-1">
            <label className="block font-bold text-[12px] text-navy dark:text-slate-200 mb-1.5">
              Electronic signature — type your full legal name exactly as it appears on your account
            </label>
            <input
              type="text"
              value={sigName}
              onChange={(e) => setSigName(e.target.value)}
              placeholder={`e.g. ${user?.name ?? 'Your Full Name'}`}
              className="form-input text-[13px]"
              style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
            />
            {sigName.trim().length > 0 && sigName.trim() !== user?.name && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 font-semibold">
                ⚠ Name doesn&apos;t match your account name &quot;{user?.name}&quot; — please check your spelling.
              </p>
            )}
          </div>

          {/* Timestamp disclosure */}
          <div className="text-[10px] text-muted-lighter dark:text-slate-500 font-mono bg-surface-muted dark:bg-slate-700/50 rounded-lg px-3 py-2 border border-surface-border dark:border-slate-700">
            Your IP address and a timestamp will be recorded alongside your signature at the moment of submission as evidence of electronic consent. Terms version: {LEGAL_TERMS_VERSION}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-3.5 rounded-[14px] border-none font-extrabold text-[14px] transition-all cursor-pointer ${
              canSubmit
                ? 'bg-brand-gradient text-white shadow-brand hover:opacity-95'
                : 'bg-surface-muted dark:bg-slate-700 text-muted-lighter dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            {submitting
              ? '⏳ Recording your signature…'
              : !allChecked
              ? 'Please accept all clauses above'
              : !sigValid
              ? 'Enter your full name to sign'
              : '✍ I Agree & Electronically Sign'}
          </button>
        </div>
      </div>
    </div>
  );
}
