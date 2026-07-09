'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import VideoIntro from '../../components/VideoIntro';
import AppTour from '../../components/AppTour';
import WorkerCalendar from '../../components/WorkerCalendar';
import ParticipantProfile, { type ParticipantProfileData } from '../../components/ParticipantProfile';
import WorkerProfileEditor from '../../components/WorkerProfileEditor';
import { useAuth } from '../../context/AuthContext';
import { useRouteGuard } from '../../hooks/useRouteGuard';
import { useDataStore } from '../../context/DataStoreContext';
import GeofenceMonitor from '../../components/GeofenceMonitor';
import TwilioGateway   from '../../components/TwilioGateway';
import { DataMaskProvider } from '../../components/DataMaskProvider';

// ── Strengths catalogue ────────────────────────────────────────────────────
interface StrengthBadge {
  label: string;
  category: 'reliability' | 'communication' | 'care' | 'skills' | 'certification';
}

const ALL_STRENGTHS: StrengthBadge[] = [
  { label: 'Highly Punctual',                     category: 'reliability' },
  { label: 'Consistently Present',                category: 'reliability' },
  { label: 'Great with Non-Verbal Communication', category: 'communication' },
  { label: 'Active Listener',                     category: 'communication' },
  { label: 'Calm in High-Stress Situations',      category: 'care' },
  { label: 'Person-Centred Approach',             category: 'care' },
  { label: 'Pet Friendly',                        category: 'skills' },
  { label: 'Dual Language Speaker',               category: 'skills' },
  { label: 'NDIS Approved',                       category: 'certification' },
  { label: 'Manual Handling Certified',           category: 'certification' },
  { label: 'Positive Behaviour Support Trained',  category: 'certification' },
];

const CAT_STYLES = {
  reliability:   'bg-blue-50 text-blue-700 border border-blue-200',
  communication: 'bg-purple-50 text-purple-700 border border-purple-200',
  care:          'bg-green-50 text-green-700 border border-green-200',
  skills:        'bg-orange-50 text-orange-700 border border-orange-200',
  certification: 'bg-teal-50 text-teal-700 border border-teal-200',
};

const CAT_LABELS = {
  reliability:   'Reliability',
  communication: 'Communication',
  care:          'Care Quality',
  skills:        'Special Skills',
  certification: 'Certifications',
};

// ── Payout mock data ───────────────────────────────────────────────────────
interface PayoutRecord {
  id: string; date: string; participant: string;
  hours: number; gross: number; paidOut: number;
  status: 'instant' | 'pending' | 'standard';
}

const PAYOUT_RECORDS: PayoutRecord[] = [
  { id: 'pr1', date: '28 Jun', participant: 'Alex Morgan',  hours: 3, gross: 254.10, paidOut: 203.28, status: 'instant'  },
  { id: 'pr2', date: '26 Jun', participant: 'Jordan Lee',   hours: 4, gross: 338.80, paidOut: 271.04, status: 'standard' },
  { id: 'pr3', date: '24 Jun', participant: 'Alex Morgan',  hours: 3, gross: 254.10, paidOut: 0,      status: 'pending'  },
];

// ── Incoming shift requests with embedded participant profiles ─────────────
type RequestUrgency = 'standard' | 'urgent' | 'lastminute';
type RequestStatus  = 'pending' | 'accepted' | 'declined';

interface ShiftRequest {
  id: string; participant: string; suburb: string;
  date: string; timeStart: string; duration: number;
  hourlyRate: number; serviceType: string;
  urgency: RequestUrgency; status: RequestStatus;
  profile: ParticipantProfileData;
}

const SHIFT_REQUESTS: ShiftRequest[] = [
  {
    id: 'req1', participant: 'Alex Morgan', suburb: 'Northbridge, NSW',
    date: '2 Jul 2026', timeStart: '10:00 AM', duration: 3,
    hourlyRate: 92, serviceType: 'Personal Care', urgency: 'standard', status: 'pending',
    profile: {
      name: 'Alex Morgan', initials: 'AM', suburb: 'Northbridge, NSW',
      age: 34, primaryDiagnosis: 'Cerebral Palsy (mild)',
      careRequirements: ['Mobility assistance', 'Meal preparation', 'Personal hygiene support'],
      supportGoals: ['Build independence in morning routine', 'Community participation 3×/week', 'Improve confidence in social settings'],
      preferences: ['Female worker preferred', 'Calm structured environment', 'Dog-friendly household'],
      weeklyHours: 18, coordinatorName: 'Jordan Brooks',
    },
  },
  {
    id: 'req2', participant: 'Riley Nguyen', suburb: 'Parramatta, NSW',
    date: '3 Jul 2026', timeStart: '08:30 AM', duration: 4,
    hourlyRate: 84, serviceType: 'Exercise Support', urgency: 'urgent', status: 'pending',
    profile: {
      name: 'Riley Nguyen', initials: 'RN', suburb: 'Parramatta, NSW',
      age: 22, primaryDiagnosis: 'Autism Spectrum Disorder (Level 2)',
      careRequirements: ['Exercise & fitness support', 'Sensory regulation', 'Routine consistency'],
      supportGoals: ['Complete 3 outdoor walks per week', 'Develop independent transit skills', 'Increase community confidence'],
      preferences: ['Predictable routine', 'Minimal unexpected changes', 'Quiet travel routes preferred'],
      weeklyHours: 20, coordinatorName: 'Jordan Brooks',
    },
  },
  {
    id: 'req3', participant: 'Sam Torres', suburb: 'Chatswood, NSW',
    date: '1 Jul 2026', timeStart: '02:00 PM', duration: 2,
    hourlyRate: 98, serviceType: 'Community Access', urgency: 'lastminute', status: 'pending',
    profile: {
      name: 'Sam Torres', initials: 'ST', suburb: 'Chatswood, NSW',
      age: 41, primaryDiagnosis: 'Acquired Brain Injury',
      careRequirements: ['Communication support', 'Navigation assistance', 'Medication reminders'],
      supportGoals: ['Attend GP appointments independently', 'Build social connections', 'Participate in local hobby group'],
      preferences: ['Patient and unhurried pace', 'Written communication support', 'Familiar routes only'],
      weeklyHours: 10,
    },
  },
];

const URGENCY_STYLE: Record<RequestUrgency, string> = {
  standard:   'bg-surface text-muted-dark border-surface-border',
  urgent:     'bg-amber-50 text-amber-700 border-amber-200',
  lastminute: 'bg-rose-50 text-rose-700 border-rose-200',
};

const URGENCY_LABEL: Record<RequestUrgency, string> = {
  standard:   'Standard',
  urgent:     '⚡ Urgent',
  lastminute: '🔴 Last-minute',
};

// ── Fallback profile for non-worker visitors ───────────────────────────────
const SHOWCASE_WORKER = {
  name:     'Maya Chen',
  bio:      'Support worker with a calm, dependable approach and strong experience helping participants build confidence in daily routines.',
  suburb:   'Northbridge, NSW',
  rate:     92,
  initials: 'MC',
  verified: true,
};

// ── Page ──────────────────────────────────────────────────────────────────
export default function WorkersPage() {
  const { isAllowed } = useRouteGuard({ allowedRoles: ['WORKER', 'PARTICIPANT'], requireAuth: true });
  const { user } = useAuth();
  const { store } = useDataStore();
  const isWorkerView = user?.role === 'WORKER';

  // Find this worker's DataStore record to get the live workerId for the editor
  const dsWorker = isWorkerView ? store.workers.find((w) => w.name === user?.name) : null;

  // Resolve profile data from context or fall back to showcase
  const profile = isWorkerView && user ? {
    name:     user.name,
    bio:      user.profile.bio    || SHOWCASE_WORKER.bio,
    suburb:   user.profile.suburb || SHOWCASE_WORKER.suburb,
    rate:     user.profile.hourlyRate ?? SHOWCASE_WORKER.rate,
    initials: user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
    verified: true,
  } : SHOWCASE_WORKER;

  const profileStrengthLabels = isWorkerView ? (user?.profile.strengths ?? []) : [];
  const displayStrengths = profileStrengthLabels.length > 0
    ? ALL_STRENGTHS.filter((s) => profileStrengthLabels.includes(s.label))
    : ALL_STRENGTHS;

  const availableBalance = profile.rate * 2.76;
  const instantAmount    = availableBalance * 0.8;

  const [lastMinute,    setLastMinute]    = useState(false);
  const [payoutState,   setPayoutState]   = useState<'idle' | 'processing' | 'done'>('idle');
  const [payoutRecords, setPayoutRecords] = useState(PAYOUT_RECORDS);
  const [requests,      setRequests]      = useState<ShiftRequest[]>(SHIFT_REQUESTS);
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);

  if (!isAllowed) return null;

  const handleCashOut = () => {
    setPayoutState('processing');
    setTimeout(() => {
      setPayoutState('done');
      setPayoutRecords((prev) =>
        prev.map((r) => r.id === 'pr3' ? { ...r, status: 'instant' as const, paidOut: r.gross * 0.8 } : r),
      );
    }, 1600);
  };

  const respondToRequest = (id: string, response: 'accepted' | 'declined') => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: response } : r));
    setExpandedReqId(null);
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const resolvedRequests = requests.filter((r) => r.status !== 'pending');

  return (
    <main className="page-shell">
      <Navbar />

      <section className="page-content">
        {/* Page header */}
        <div>
          <p className="section-label mb-2">
            {isWorkerView ? 'My Worker Dashboard' : 'Support Worker Profile'}
          </p>
          <h1 className="page-title">{profile.name}</h1>
          <p className="page-sub mt-2.5 max-w-[640px]">{profile.bio}</p>
        </div>

        {/* Hero: video + stats */}
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-muted-darker">30-second video introduction</span>
              <span className="badge badge-brand">Meet &amp; Greet</span>
            </div>
            <VideoIntro
              workerName={profile.name}
              initials={profile.initials}
              accentColor="#3f6df6"
              durationSeconds={30}
            />
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-[30px] font-extrabold tracking-tight text-navy dark:text-white">
                    ${profile.rate}
                    <span className="text-[14px] font-semibold text-muted-light">/hr</span>
                  </div>
                  <div className="text-[13px] text-muted-light mt-0.5">{profile.suburb}</div>
                </div>
                {profile.verified && (
                  <span className="px-3.5 py-1.5 rounded-full font-bold text-[13px] bg-green-50 text-green-700 border border-green-200">
                    ✓ Verified
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { value: '142', label: 'Shifts' },
                  { value: '4.9', label: 'Rating' },
                  { value: '3 yrs', label: 'Experience' },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-surface rounded-xl p-3 text-center border border-surface-border">
                    <div className="text-[18px] font-extrabold tracking-tight text-navy dark:text-white">{value}</div>
                    <div className="text-[11px] text-muted-light font-semibold">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {isWorkerView && (
              <div
                id="lastminute-toggle"
                className={`rounded-[20px] p-5 border-2 transition-all duration-200 ${
                  lastMinute
                    ? 'bg-pink-standby border-pink-400 shadow-pink-ring'
                    : 'bg-white dark:bg-slate-800 border-surface-border dark:border-slate-700 shadow-card'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-[15px] text-navy dark:text-slate-100 mb-1">⚡ Standby shift availability</div>
                    <div className={`text-[13px] leading-snug ${lastMinute ? 'text-pink-700' : 'text-muted-light'}`}>
                      {lastMinute
                        ? 'You are visible for last-minute shifts today'
                        : 'Toggle on to accept same-day bookings instantly'}
                    </div>
                  </div>
                  <button
                    onClick={() => setLastMinute((p) => !p)}
                    aria-pressed={lastMinute}
                    className={`w-[52px] h-[28px] rounded-full border-none cursor-pointer relative shrink-0 transition-colors duration-200 ${lastMinute ? 'bg-pink-500' : 'bg-gray-300'}`}
                  >
                    <div
                      className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-all duration-200"
                      style={{ left: lastMinute ? '27px' : '3px' }}
                    />
                  </button>
                </div>
                {lastMinute && (
                  <div className="mt-3 bg-pink-100/60 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <span className="text-[13px]">📍</span>
                    <span className="text-[13px] text-pink-800 font-semibold">
                      Participants near {profile.suburb} will see your availability badge today
                    </span>
                  </div>
                )}
              </div>
            )}

            {!isWorkerView && (
              <div className="card flex flex-col gap-3">
                <div className="flex items-start gap-3 p-3.5 bg-green-50 rounded-xl border border-green-200">
                  <span className="text-[20px]">✓</span>
                  <div>
                    <div className="font-bold text-[13px] text-green-800 mb-0.5">Available this week</div>
                    <div className="text-xs text-green-700">Responds within 2 hours · Background checked</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 bg-brand-xlight rounded-xl border border-brand-border">
                  <span className="text-[20px]">🛡️</span>
                  <div>
                    <div className="font-bold text-[13px] text-brand-mid mb-0.5">Safe Cancellation included</div>
                    <div className="text-xs text-brand-mid">Cancel up to 24 hrs before — no charge</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Strengths-Based Badging */}
        <div id="worker-strengths" className="card-lg">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">Strengths profile</h2>
              <p className="text-muted-light text-sm mt-1.5">
                Verified by participant feedback and coordinator assessments — not star ratings.
              </p>
            </div>
            <span className="badge badge-green text-[11px]">{displayStrengths.length} verified traits</span>
          </div>

          {(['reliability', 'communication', 'care', 'skills', 'certification'] as const).map((cat) => {
            const badges = displayStrengths.filter((b) => b.category === cat);
            if (badges.length === 0) return null;
            return (
              <div key={cat} className="mb-3.5">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-lighter mb-2">
                  {CAT_LABELS[cat]}
                </div>
                <div className="flex flex-wrap gap-2">
                  {badges.map((b) => (
                    <span key={b.label} className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold ${CAT_STYLES[b.category]}`}>
                      {b.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Worker-only sections ──────────────────────────────────────── */}
        {isWorkerView && (
          <>
            {/* Profile editor */}
            {dsWorker && <WorkerProfileEditor workerId={dsWorker.id} />}

            {/* Worker Calendar */}
            <WorkerCalendar />

            {/* Geofence Monitor — worker clock-in GPS verification */}
            <DataMaskProvider>
              <GeofenceMonitor />
            </DataMaskProvider>

            {/* Twilio Communication Gateway — 2FA + arrival SMS simulation */}
            <TwilioGateway />

            {/* Incoming Shift Requests */}
            <div className="card-lg">
              <div className="flex justify-between items-start flex-wrap gap-3 mb-5">
                <div>
                  <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">Incoming Shift Requests</h2>
                  <p className="text-muted-light text-sm mt-1.5">
                    Review participant profiles before accepting — tap any request to see full care details.
                  </p>
                </div>
                {pendingRequests.length > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[12px] font-bold text-amber-700">{pendingRequests.length} awaiting response</span>
                  </span>
                )}
              </div>

              {/* Pending requests */}
              {pendingRequests.length === 0 && (
                <div className="bg-surface rounded-[18px] p-8 text-center border border-surface-border mb-4">
                  <div className="text-[28px] mb-2">📭</div>
                  <div className="font-bold text-navy dark:text-slate-100 mb-1">No pending requests</div>
                  <div className="text-muted-light text-sm">New shift requests will appear here when coordinators send them.</div>
                </div>
              )}

              <div className="grid gap-3">
                {pendingRequests.map((req) => {
                  const payout   = (req.duration * req.hourlyRate * 0.925).toFixed(2);
                  const isOpen   = expandedReqId === req.id;

                  return (
                    <div key={req.id} className="rounded-[18px] border-2 border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden transition-all">
                      {/* Request header */}
                      <button
                        onClick={() => setExpandedReqId(isOpen ? null : req.id)}
                        className="w-full text-left p-4 cursor-pointer bg-transparent border-none font-sans hover:bg-surface-muted/50 transition-colors"
                      >
                        <div className="flex justify-between items-start flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-[13px] shrink-0">
                              {req.profile.initials}
                            </div>
                            <div>
                              <div className="font-bold text-[15px] text-navy dark:text-slate-100">{req.participant}</div>
                              <div className="text-[12px] text-muted-light mt-0.5">
                                {req.serviceType} · {req.date} · {req.timeStart} · {req.duration}h
                              </div>
                              <div className="text-[11px] text-muted-lighter mt-0.5">📍 {req.suburb}</div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className={`badge border text-[11px] ${URGENCY_STYLE[req.urgency]}`}>
                              {URGENCY_LABEL[req.urgency]}
                            </span>
                            <div className="font-extrabold text-[14px] text-green-700">
                              ${payout} <span className="text-[11px] font-normal text-muted-light">est. payout</span>
                            </div>
                            <div className="text-[11px] text-brand font-semibold">
                              {isOpen ? '▲ Hide profile' : '▼ View participant profile'}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded participant profile + actions */}
                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-surface-border animate-slide-up">
                          <div className="pt-4 mb-4">
                            <ParticipantProfile profile={req.profile} compact />
                          </div>

                          {/* Shift summary row */}
                          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                            {[
                              { label: 'Rate',     value: `$${req.hourlyRate}/hr` },
                              { label: 'Duration', value: `${req.duration}h` },
                              { label: 'Payout',   value: `$${payout}` },
                            ].map(({ label, value }) => (
                              <div key={label} className="bg-surface dark:bg-slate-700 rounded-xl p-2.5 border border-surface-border dark:border-slate-600">
                                <div className="text-[10px] text-muted-lighter dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">{label}</div>
                                <div className="font-extrabold text-[14px] text-navy dark:text-white">{value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Accept / Decline */}
                          <div className="flex gap-2.5">
                            <button
                              onClick={() => respondToRequest(req.id, 'accepted')}
                              className="flex-1 min-h-[48px] py-3 rounded-[14px] border-none font-extrabold text-[14px] text-white cursor-pointer bg-gradient-to-br from-green-500 to-green-600 shadow-green-glow hover:opacity-90 active:scale-[0.97] transition-all"
                            >
                              ✓ Accept Shift
                            </button>
                            <button
                              onClick={() => respondToRequest(req.id, 'declined')}
                              className="px-5 min-h-[48px] py-3 rounded-[14px] border border-surface-divider dark:border-slate-600 bg-white dark:bg-slate-700 text-muted-dark dark:text-slate-300 font-bold text-[14px] cursor-pointer hover:bg-surface-muted dark:hover:bg-slate-600 active:scale-[0.97] transition-all"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Resolved requests */}
              {resolvedRequests.length > 0 && (
                <div className="mt-5 pt-4 border-t border-surface-border">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-lighter mb-3">Previously resolved</div>
                  <div className="grid gap-2">
                    {resolvedRequests.map((req) => (
                      <div key={req.id} className="flex justify-between items-center px-4 py-3 bg-surface dark:bg-slate-700 rounded-[14px] border border-surface-border dark:border-slate-600">
                        <div>
                          <span className="font-semibold text-[13px] text-muted-dark dark:text-slate-300">{req.participant}</span>
                          <span className="text-[12px] text-muted-lighter ml-2">{req.serviceType} · {req.date}</span>
                        </div>
                        <span className={`badge border text-[11px] ${
                          req.status === 'accepted'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {req.status === 'accepted' ? '✓ Accepted' : '✕ Declined'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Instant Invoice Payouts */}
            <div id="instant-payout" className="bg-dark-payout rounded-[24px] p-[26px] text-white shadow-dark-card">
              <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
                <div>
                  <h2 className="text-[20px] font-bold m-0">⚡ Instant Invoice Payouts</h2>
                  <p className="text-white/65 text-sm mt-1.5 max-w-[420px] leading-relaxed">
                    Cash out 80% of confirmed earnings instantly after a verified clock-out. The remaining 20% clears after coordinator sign-off.
                  </p>
                </div>
                <div className="bg-white/10 rounded-2xl px-5 py-3.5 text-right backdrop-blur-sm shrink-0">
                  <div className="text-[11px] uppercase tracking-[0.1em] opacity-60 mb-1 font-semibold">Available now</div>
                  <div className="text-[28px] font-extrabold tracking-tight">${availableBalance.toFixed(2)}</div>
                </div>
              </div>

              <div className="bg-white/8 rounded-[18px] p-4 mb-4 border border-white/10">
                <div className="flex justify-between items-center flex-wrap gap-3.5">
                  <div>
                    <div className="font-bold text-[15px] mb-1">Pending · Alex Morgan · 28 Jun · 3h</div>
                    <div className="text-white/60 text-[13px]">
                      Full gross: ${availableBalance.toFixed(2)} · Instant 80%:{' '}
                      <strong className="text-green-300">${instantAmount.toFixed(2)}</strong>
                    </div>
                  </div>
                  <button
                    onClick={handleCashOut}
                    disabled={payoutState !== 'idle'}
                    className={`px-6 py-3 rounded-xl border-none font-extrabold text-sm text-white cursor-pointer transition-all whitespace-nowrap ${
                      payoutState === 'done'
                        ? 'bg-green-500 cursor-default'
                        : payoutState === 'processing'
                        ? 'bg-white/20 cursor-not-allowed'
                        : 'bg-gradient-to-br from-green-500 to-green-600 shadow-green-glow hover:opacity-90'
                    }`}
                  >
                    {payoutState === 'processing' ? 'Processing…'
                     : payoutState === 'done'       ? `✓ $${instantAmount.toFixed(2)} sent!`
                     :                               `Cash out $${instantAmount.toFixed(2)} now`}
                  </button>
                </div>
              </div>

              <div className="bg-white/6 rounded-2xl px-4 py-3 mb-4 flex items-start gap-2.5 border border-white/8">
                <span className="text-[16px] shrink-0 mt-0.5">🛡️</span>
                <div className="text-[12px] text-white/70 leading-relaxed">
                  <strong className="text-white/90">Safe Cancellation protection:</strong> If a client cancels within 24 hours of a shift, you receive a guaranteed baseline fee of 1 hour at your agreed rate (${profile.rate}). Your income is protected.
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-[11px] uppercase tracking-[0.1em] opacity-50 font-bold mb-0.5">Recent payouts</div>
                {payoutRecords.map((r) => (
                  <div key={r.id} className="flex justify-between items-center bg-white/6 rounded-xl px-3.5 py-3">
                    <div>
                      <div className="font-semibold text-[13px]">{r.participant} · {r.date} · {r.hours}h</div>
                      <div className="text-[12px] opacity-60 mt-0.5">Gross: ${r.gross.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-[14px] ${r.status === 'pending' ? 'text-yellow-300' : 'text-green-300'}`}>
                        {r.status === 'pending' ? 'Pending' : `$${r.paidOut.toFixed(2)}`}
                      </div>
                      <div className="text-[11px] opacity-55 mt-0.5 uppercase tracking-wider">
                        {r.status === 'instant' ? '⚡ Instant' : r.status === 'pending' ? 'Awaiting shift' : 'Standard'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Booking CTA for participants */}
        {!isWorkerView && (
          <div className="card-lg flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="font-bold text-[17px] text-navy dark:text-white mb-1">Ready to book {profile.name}?</div>
              <div className="text-muted-light text-sm">Available this week · ${profile.rate}/hr · {profile.suburb}</div>
            </div>
            <Link href="/checkout" className="btn-primary text-[15px] px-7 py-3.5">
              Book now →
            </Link>
          </div>
        )}
      </section>

      <AppTour />
    </main>
  );
}
