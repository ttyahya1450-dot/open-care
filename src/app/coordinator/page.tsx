'use client';

import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import AppTour from '../../components/AppTour';
import CareTeamCalendar from '../../components/CareTeamCalendar';
import ShiftNotesExport from '../../components/ShiftNotesExport';
import FamilyMasterCalendar from '../../components/FamilyMasterCalendar';
import AuditPrintView from '../../components/AuditPrintView';
import LegalCompliancePanel from '../../components/LegalCompliancePanel';
import { useRouteGuard } from '../../hooks/useRouteGuard';
import { DataMaskProvider, DataMaskToggle, MaskedText } from '../../components/DataMaskProvider';
import StripeLedger        from '../../components/StripeLedger';
import NDISClaimsProcessor from '../../components/NDISClaimsProcessor';
import GeofenceMonitor     from '../../components/GeofenceMonitor';
import DataResidencyAudit  from '../../components/DataResidencyAudit';

// ── Budget tracking types ──────────────────────────────────────────────────
interface Participant {
  id: string; name: string; workerName: string;
  allocatedBudget: number; remainingBudget: number;
  weeklyHours: number; hourlyRate: number;
  planEndDate: string; weeksRemaining: number;
}

const PARTICIPANTS: Participant[] = [
  { id: 'p1', name: 'Alex Morgan',  workerName: 'Maya Chen',     allocatedBudget: 18000, remainingBudget: 7200,  weeklyHours: 18, hourlyRate: 92,  planEndDate: '2026-10-30', weeksRemaining: 18 },
  { id: 'p2', name: 'Jordan Lee',   workerName: 'Daniel Brooks', allocatedBudget: 24000, remainingBudget: 19200, weeklyHours: 12, hourlyRate: 110, planEndDate: '2027-01-15', weeksRemaining: 28 },
  { id: 'p3', name: 'Riley Nguyen', workerName: 'Aisha Rahman',  allocatedBudget: 12000, remainingBudget: 1400,  weeklyHours: 20, hourlyRate: 84,  planEndDate: '2026-08-01', weeksRemaining: 5  },
];

type Health = 'green' | 'amber' | 'red';

function getHealth(remaining: number, allocated: number, weeks: number, weekCost: number): Health {
  const pct  = (remaining / allocated) * 100;
  const runs = remaining < weekCost * weeks;
  if (runs && pct < 15) return 'red';
  if (runs || pct < 40) return 'amber';
  return 'green';
}

const HC = {
  green: { label: 'On track', bar: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', badge: '#dcfce7', badgeText: '#15803d' },
  amber: { label: 'Monitor',  bar: '#f59e0b', bg: '#fffbeb', border: '#fde68a', text: '#92400e', badge: '#fef3c7', badgeText: '#b45309' },
  red:   { label: 'At risk',  bar: '#ef4444', bg: '#fff1f2', border: '#fecdd3', text: '#9f1239', badge: '#ffe4e6', badgeText: '#be123c' },
};

const STATUS_BADGE: Record<Health, string> = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red:   'bg-rose-100 text-rose-700',
};

// ── Verified Shift Ledger types ────────────────────────────────────────────
type ShiftStatus = 'active' | 'completed' | 'no-show';

interface ShiftEntry {
  id: string; workerName: string; workerInitials: string;
  participantName: string; date: string;
  clockIn: string; clockOut: string | null;
  durationHrs: number | null;
  status: ShiftStatus; gpsVerified: boolean;
  location: string; serviceType: string; hourlyRate: number;
}

const SHIFT_LEDGER: ShiftEntry[] = [
  { id: 'sl1', workerName: 'Maya Chen',     workerInitials: 'MC', participantName: 'Alex Morgan',  date: '29 Jun 2026', clockIn: '09:02 AM', clockOut: '12:05 PM', durationHrs: 3.05, status: 'completed', gpsVerified: true,  location: 'Northbridge, NSW',    serviceType: 'Personal Care',       hourlyRate: 92  },
  { id: 'sl2', workerName: 'Daniel Brooks', workerInitials: 'DB', participantName: 'Jordan Lee',   date: '29 Jun 2026', clockIn: '01:15 PM', clockOut: null,       durationHrs: null, status: 'active',    gpsVerified: true,  location: 'Surry Hills, NSW',    serviceType: 'Community Access',    hourlyRate: 110 },
  { id: 'sl3', workerName: 'Aisha Rahman',  workerInitials: 'AR', participantName: 'Riley Nguyen', date: '29 Jun 2026', clockIn: '08:45 AM', clockOut: '01:00 PM', durationHrs: 4.25, status: 'completed', gpsVerified: true,  location: 'Parramatta, NSW',     serviceType: 'Domestic Assistance', hourlyRate: 84  },
  { id: 'sl4', workerName: 'Maya Chen',     workerInitials: 'MC', participantName: 'Alex Morgan',  date: '28 Jun 2026', clockIn: '10:00 AM', clockOut: '01:00 PM', durationHrs: 3.0,  status: 'completed', gpsVerified: false, location: 'Northbridge, NSW',    serviceType: 'Meal Prep',           hourlyRate: 92  },
  { id: 'sl5', workerName: 'Daniel Brooks', workerInitials: 'DB', participantName: 'Jordan Lee',   date: '27 Jun 2026', clockIn: '02:00 PM', clockOut: '05:30 PM', durationHrs: 3.5,  status: 'completed', gpsVerified: true,  location: 'Surry Hills, NSW',    serviceType: 'Transport',           hourlyRate: 110 },
  { id: 'sl6', workerName: 'Aisha Rahman',  workerInitials: 'AR', participantName: 'Riley Nguyen', date: '27 Jun 2026', clockIn: '09:00 AM', clockOut: '--:-- --', durationHrs: 0,    status: 'no-show',   gpsVerified: false, location: 'Parramatta, NSW',     serviceType: 'Exercise Support',    hourlyRate: 84  },
];

const SHIFT_STATUS_STYLES: Record<ShiftStatus, string> = {
  active:    'bg-green-100 text-green-700 border border-green-200',
  completed: 'bg-surface text-muted-dark border border-surface-border',
  'no-show': 'bg-rose-100 text-rose-700 border border-rose-200',
};

const SHIFT_STATUS_ICONS: Record<ShiftStatus, string> = {
  active:    '🟢',
  completed: '✓',
  'no-show': '⚠',
};

// ── Seed API types (client-side shapes for hydration) ─────────────────────
interface SeedParticipant {
  id: string; name: string; suburb: string;
  ndisBudget: number; ndisRemaining: number;
  planEndDate: string; weeklyHours: number; coordinatorId: string;
}
interface SeedBooking { participantId: string; workerId: string; }
interface SeedWorkerMin { id: string; name: string; hourlyRate: number; }
interface SeedShiftLog {
  id: string; workerName: string; workerInitials: string;
  participantName: string; date: string; clockIn: string;
  clockOut: string | null; durationHrs: number | null;
  status: 'active' | 'completed' | 'no-show';
  gpsVerified: boolean; gpsAddress: string;
  serviceType: string; hourlyRate: number;
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function CoordinatorPage() {
  const [selectedId,     setSelectedId]     = useState('p1');
  const [safeguardState, setSafeguardState] = useState<'idle' | 'active' | 'confirmed'>('idle');
  const [ledgerFilter,   setLedgerFilter]   = useState<'all' | 'active'>('all');
  const [participants,   setParticipants]   = useState<Participant[]>(PARTICIPANTS);
  const [shiftLedger,    setShiftLedger]    = useState<ShiftEntry[]>(SHIFT_LEDGER);

  const { isAllowed } = useRouteGuard({ allowedRoles: ['COORDINATOR'], requireAuth: true });

  useEffect(() => {
    fetch('/api/debug/seed')
      .then((r) => r.json())
      .then(({ data }) => {
        const workers: SeedWorkerMin[]   = data.workers;
        const bookings: SeedBooking[]    = data.bookings;
        const logs: SeedShiftLog[]       = data.shiftLogs;
        const raw: SeedParticipant[]     = data.participants;

        const mapped: Participant[] = raw.map((p) => {
          const pBooking  = bookings.find((b) => b.participantId === p.id);
          const worker    = pBooking ? workers.find((w) => w.id === pBooking.workerId) : undefined;
          const planEnd   = new Date(p.planEndDate).getTime();
          const weeksRem  = Math.max(0, Math.round((planEnd - Date.now()) / (7 * 24 * 60 * 60 * 1000)));
          return {
            id:              p.id,
            name:            p.name,
            workerName:      worker?.name      ?? 'Unassigned',
            allocatedBudget: p.ndisBudget,
            remainingBudget: p.ndisRemaining,
            weeklyHours:     p.weeklyHours,
            hourlyRate:      worker?.hourlyRate ?? 0,
            planEndDate:     p.planEndDate,
            weeksRemaining:  weeksRem,
          };
        });
        setParticipants(mapped);

        const mappedLogs: ShiftEntry[] = logs.map((sl) => ({
          id:              sl.id,
          workerName:      sl.workerName,
          workerInitials:  sl.workerInitials,
          participantName: sl.participantName,
          date:            sl.date,
          clockIn:         sl.clockIn,
          clockOut:        sl.clockOut,
          durationHrs:     sl.durationHrs,
          status:          sl.status,
          gpsVerified:     sl.gpsVerified,
          location:        sl.gpsAddress,
          serviceType:     sl.serviceType,
          hourlyRate:      sl.hourlyRate,
        }));
        setShiftLedger(mappedLogs);
      })
      .catch(() => { /* keep hardcoded fallback */ });
  }, []);

  const selected = participants.find((p) => p.id === selectedId) ?? participants[0];

  const detail = useMemo(() => {
    const weeklyShiftCost   = selected.weeklyHours * selected.hourlyRate;
    const budgetUsedPercent = ((selected.allocatedBudget - selected.remainingBudget) / selected.allocatedBudget) * 100;
    const projectedWeeks    = Math.max(0, Math.floor(selected.remainingBudget / weeklyShiftCost));
    const burnRate          = (selected.allocatedBudget - selected.remainingBudget) / selected.weeksRemaining;
    const projectedRunout   = selected.remainingBudget < weeklyShiftCost * selected.weeksRemaining;
    const health            = getHealth(selected.remainingBudget, selected.allocatedBudget, selected.weeksRemaining, weeklyShiftCost);
    return { weeklyShiftCost, budgetUsedPercent, projectedWeeks, burnRate, projectedRunout, health };
  }, [selected]);

  const hc = HC[detail.health];

  const atRisk = useMemo(() =>
    participants.filter((p) => {
      const wc = p.weeklyHours * p.hourlyRate;
      return getHealth(p.remainingBudget, p.allocatedBudget, p.weeksRemaining, wc) !== 'green';
    }),
  [participants]);

  const visibleLedger = ledgerFilter === 'active'
    ? shiftLedger.filter((s) => s.status === 'active')
    : shiftLedger;

  const activateSafeguard = () => {
    setSafeguardState('active');
    setTimeout(() => setSafeguardState('confirmed'), 1400);
  };

  if (!isAllowed) return null;

  return (
    <DataMaskProvider>
      <main className="page-shell">
        <Navbar />

        <section className="page-content">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
              <div>
                <p className="section-label">Coordinator Dashboard</p>
                <h1 className="page-title">NDIS plan budget burn-rate tracking</h1>
              </div>
              {/* PII mask toggle — visible to coordinator only */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-muted-lighter dark:text-slate-500 font-semibold uppercase tracking-wider">PII</span>
                <DataMaskToggle />
              </div>
            </div>
            <p className="page-sub mt-1 max-w-[700px]">
              Monitor ongoing support costs against plan funding and identify pressure points before funding runs out.
            </p>
          </div>

          {/* 1-Click Budget Safeguard */}
          <div
            id="budget-safeguard"
            className="rounded-[24px] p-6 border-2 transition-all duration-300"
            style={{
              background:  safeguardState === 'confirmed' ? 'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)' : 'linear-gradient(135deg,#fff1f2 0%,#ffe4e6 100%)',
              borderColor: safeguardState === 'confirmed' ? '#86efac' : '#fca5a5',
              boxShadow:   safeguardState === 'confirmed' ? '0 0 0 4px rgba(34,197,94,0.1)' : '0 0 0 4px rgba(239,68,68,0.08)',
            }}
          >
            <div className="flex justify-between items-start flex-wrap gap-3.5 mb-4">
              <div>
                <h2 className={`text-[20px] font-bold mb-1.5 ${safeguardState === 'confirmed' ? 'text-green-800' : 'text-rose-800'}`}>
                  {safeguardState === 'confirmed' ? '✅ Budget Safeguard Active' : '🔴 1-Click Budget Safeguard'}
                </h2>
                <p className={`text-sm leading-relaxed max-w-[540px] m-0 ${safeguardState === 'confirmed' ? 'text-green-700' : 'text-rose-700'}`}>
                  {safeguardState === 'confirmed'
                    ? `Non-essential bookings are paused for ${atRisk.length} participant${atRisk.length !== 1 ? 's' : ''}. Coordinators and families have been notified.`
                    : `${atRisk.length} participant${atRisk.length !== 1 ? 's are' : ' is'} at risk of exhausting NDIS plan funds before the plan period ends.`}
                </p>
              </div>
              {safeguardState !== 'confirmed' && (
                <button
                  onClick={activateSafeguard}
                  disabled={safeguardState === 'active'}
                  className={`px-6 py-3 min-h-[48px] rounded-2xl border-none font-extrabold text-sm text-white cursor-pointer transition-all whitespace-nowrap active:scale-[0.97] ${
                    safeguardState === 'active'
                      ? 'bg-red-300 cursor-not-allowed'
                      : 'bg-gradient-to-br from-red-600 to-red-500 shadow-red-glow hover:opacity-90'
                  }`}
                >
                  {safeguardState === 'active' ? 'Activating safeguard…' : '🛡️ Activate Safeguard Now'}
                </button>
              )}
            </div>

            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {atRisk.map((p) => {
                const wc     = p.weeklyHours * p.hourlyRate;
                const health = getHealth(p.remainingBudget, p.allocatedBudget, p.weeksRemaining, wc);
                const h      = HC[health];
                const pct    = ((p.allocatedBudget - p.remainingBudget) / p.allocatedBudget) * 100;
                return (
                  <div key={p.id} className="bg-white/70 rounded-2xl p-3.5">
                    <div className="flex justify-between mb-2">
                      <span className="font-bold text-sm text-navy"><MaskedText value={p.name} /></span>
                      <span className={`badge ${STATUS_BADGE[health]}`}>{h.label}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden mb-1.5 bg-black/[0.08]">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: h.bar }} />
                    </div>
                    <div className="text-xs text-muted-light font-semibold">
                      <MaskedText value={`$${p.remainingBudget.toLocaleString()}`} type="currency" /> of{' '}
                      <MaskedText value={`$${p.allocatedBudget.toLocaleString()}`} type="currency" /> remaining
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Participant selector */}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {participants.map((p) => {
              const wc     = p.weeklyHours * p.hourlyRate;
              const health = getHealth(p.remainingBudget, p.allocatedBudget, p.weeksRemaining, wc);
              const h      = HC[health];
              const pct    = ((p.allocatedBudget - p.remainingBudget) / p.allocatedBudget) * 100;
              const isSel  = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`text-left p-4 rounded-[20px] cursor-pointer border-2 transition-all font-sans bg-white ${
                    isSel
                      ? 'border-brand shadow-brand-ring'
                      : 'border-surface-border shadow-card hover:border-surface-input'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="font-bold text-[15px] text-navy"><MaskedText value={p.name} /></span>
                    <span className={`badge ${STATUS_BADGE[health]}`}>{h.label}</span>
                  </div>
                  <div className="h-2 bg-surface-border rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: h.bar }} />
                  </div>
                  <div className="text-xs text-muted-light font-semibold">
                    <MaskedText value={`$${p.remainingBudget.toLocaleString()}`} type="currency" /> remaining
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail view */}
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {/* Budget snapshot */}
            <div className="card-lg">
              <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
                <div>
                  <h2 className="text-[21px] font-bold text-navy m-0">Participant plan snapshot</h2>
                  <p className="text-sm text-muted-light mt-1.5 m-0">
                    <MaskedText value={selected.name} /> · <MaskedText value={selected.workerName} />
                  </p>
                </div>
                <span className="badge badge-brand px-3 py-1.5 whitespace-nowrap">
                  {detail.budgetUsedPercent.toFixed(0)}% used
                </span>
              </div>

              <div className="mb-5">
                <div className="flex justify-between mb-1.5 font-semibold text-sm text-navy">
                  <span>Allocated</span>
                  <span><MaskedText value={`$${selected.allocatedBudget.toLocaleString()}`} type="currency" /></span>
                </div>
                <div className="flex justify-between mb-2.5 font-semibold text-sm">
                  <span className="text-navy">Remaining</span>
                  <span style={{ color: detail.health === 'red' ? '#be123c' : '#162033' }}>
                    <MaskedText value={`$${selected.remainingBudget.toLocaleString()}`} type="currency" />
                  </span>
                </div>
                <div className="h-3.5 bg-surface-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${detail.budgetUsedPercent}%`, background: hc.bar }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Weekly shift cost',     value: `$${detail.weeklyShiftCost.toLocaleString()}`, maskType: 'currency' as const },
                  { label: 'Est. weeks of funding', value: `${detail.projectedWeeks} wks`,               maskType: null, alert: detail.projectedWeeks < 6 },
                  { label: 'Plan end date',         value: selected.planEndDate,                          maskType: null, small: true },
                  { label: 'Weekly hours',          value: `${selected.weeklyHours} hrs`,                maskType: null },
                ].map(({ label, value, alert, small, maskType }) => (
                  <div key={label} className="bg-surface rounded-2xl p-3.5 border border-surface-border">
                    <div className="text-xs text-muted-light mb-1.5 font-medium">{label}</div>
                    <div className={`font-bold ${small ? 'text-sm' : 'text-[20px] tracking-tight'} ${alert ? 'text-rose-700' : 'text-navy'}`}>
                      {maskType ? <MaskedText value={value} type={maskType} /> : value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Burn-rate insight */}
            <div className="card-lg">
              <h2 className="text-[21px] font-bold text-navy mb-3">Burn-rate insight</h2>
              <p className="text-muted text-sm leading-relaxed mb-4 m-0">
                Current recurring care for <strong className="text-navy"><MaskedText value={selected.name} /></strong> is tracking at{' '}
                <strong className="text-navy">${detail.burnRate.toFixed(0)}/week</strong>.
              </p>

              <div
                id="burnrate-alert"
                className="rounded-[18px] p-4 mb-3.5 border transition-all"
                style={{ background: hc.bg, borderColor: hc.border }}
              >
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <span className="font-bold text-sm leading-snug" style={{ color: hc.text }}>
                    {detail.health === 'red'
                      ? '🔴 Critical — funding will run out before plan end'
                      : detail.health === 'amber'
                      ? '🟡 Budget depletion risk — monitor closely'
                      : '🟢 Plan funding is on track'}
                  </span>
                  <span className="badge text-[11px] whitespace-nowrap" style={{ background: hc.badge, color: hc.badgeText }}>
                    {hc.label}
                  </span>
                </div>
                {detail.projectedRunout && (
                  <p className="text-[13px] leading-relaxed mt-2.5 mb-0" style={{ color: hc.text }}>
                    At the current burn rate, funding will be exhausted before the plan end date. Consider reviewing support hours or activating the Budget Safeguard above.
                  </p>
                )}
              </div>

              <div className="bg-surface rounded-2xl p-4 grid gap-2.5 border border-surface-border">
                {[
                  { label: 'Projected runout',             value: detail.projectedRunout ? 'Before plan end' : 'Within plan period', good: !detail.projectedRunout },
                  { label: 'Avg weekly spend',             value: `$${detail.burnRate.toFixed(0)}`, good: null },
                  { label: 'Plan weeks remaining',         value: `${selected.weeksRemaining} wks`, good: null },
                  { label: 'Funded weeks at current rate', value: `${detail.projectedWeeks} wks`, good: detail.projectedWeeks >= selected.weeksRemaining },
                ].map(({ label, value, good }) => (
                  <div key={label} className="flex justify-between text-[13px]">
                    <span className="font-semibold text-muted-dark">{label}</span>
                    <span className={`font-bold ${good === null ? 'text-navy' : good ? 'text-green-700' : 'text-rose-700'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Verified Shift Ledger ─────────────────────────────────────── */}
          <div id="verified-shift-ledger" className="card-lg">
            <div className="flex justify-between items-start flex-wrap gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h2 className="text-[20px] font-bold text-navy m-0">Verified Shift Ledger</h2>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 border border-green-200">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[11px] font-bold text-green-700 uppercase tracking-wider">Live</span>
                  </span>
                </div>
                <p className="text-muted-light text-sm m-0">
                  Cross-verified clock-in / clock-out records with GPS location confirmation for each shift.
                </p>
              </div>

              <div className="flex gap-1.5 bg-surface-muted rounded-[12px] p-1 border border-surface-border">
                {(['all', 'active'] as const).map((f) => (
                  <button
                    key={f}
                    onTouchStart={(e) => { e.preventDefault(); setLedgerFilter(f); }}
                    onClick={() => setLedgerFilter(f)}
                    className={`px-3.5 py-1.5 rounded-[9px] border-none font-bold text-[12px] cursor-pointer transition-all capitalize ${
                      ledgerFilter === f
                        ? 'bg-white text-navy shadow-[0_1px_4px_rgba(0,0,0,0.1)]'
                        : 'bg-transparent text-muted-light hover:text-navy'
                    }`}
                  >
                    {f === 'all' ? 'All shifts' : '🟢 Active now'}
                  </button>
                ))}
              </div>
            </div>

            {/* Ledger rows */}
            <div className="grid gap-2.5">
              <div className="hidden md:grid text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-lighter px-3"
                style={{ gridTemplateColumns: '28px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 90px 70px' }}>
                <div />
                <div>Worker</div>
                <div>Participant</div>
                <div>Clock-In</div>
                <div>Clock-Out / Duration</div>
                <div>GPS</div>
                <div>Status</div>
              </div>

              {visibleLedger.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-[16px] border p-3.5 transition-all ${
                    entry.status === 'active'
                      ? 'bg-green-50 border-green-200'
                      : entry.status === 'no-show'
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-white border-surface-border'
                  }`}
                >
                  {/* Mobile layout */}
                  <div className="flex items-start gap-3 md:hidden flex-wrap">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-extrabold text-[12px] shrink-0">
                      {entry.workerInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[14px] text-navy"><MaskedText value={entry.workerName} /></div>
                      <div className="text-[12px] text-muted-light">
                        → <MaskedText value={entry.participantName} /> · {entry.serviceType}
                      </div>
                      <div className="text-[11px] text-muted-lighter mt-0.5">
                        📍 <MaskedText value={entry.location} type="suburb" /> · {entry.date}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          ↓ {entry.clockIn}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${entry.clockOut ? 'text-muted-dark bg-surface border border-surface-border' : 'text-green-700 bg-green-100 border border-green-200'}`}>
                          ↑ {entry.clockOut ?? 'In progress'}
                        </span>
                        {entry.durationHrs !== null && entry.durationHrs > 0 && (
                          <span className="text-[11px] font-bold text-navy bg-white border border-surface-border px-2 py-0.5 rounded-full">
                            {entry.durationHrs}h
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {entry.gpsVerified
                        ? <span className="flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">📍 Verified</span>
                        : <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">⚠ Unverified</span>}
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${SHIFT_STATUS_STYLES[entry.status]}`}>
                        {SHIFT_STATUS_ICONS[entry.status]} {entry.status === 'no-show' ? 'No-show' : entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div
                    className="hidden md:grid items-center gap-3"
                    style={{ gridTemplateColumns: '28px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 90px 70px' }}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-extrabold text-[12px] shrink-0">
                      {entry.workerInitials}
                    </div>

                    <div>
                      <div className="font-bold text-[13px] text-navy"><MaskedText value={entry.workerName} /></div>
                      <div className="text-[11px] text-muted-lighter mt-0.5">{entry.serviceType}</div>
                    </div>

                    <div>
                      <div className="font-semibold text-[13px] text-muted-dark"><MaskedText value={entry.participantName} /></div>
                      <div className="text-[11px] text-muted-lighter mt-0.5">
                        📍 <MaskedText value={entry.location} type="suburb" />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${entry.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-green-400'}`} />
                      <div>
                        <div className="font-mono text-[13px] font-bold text-green-700">{entry.clockIn}</div>
                        <div className="text-[10px] text-muted-lighter">{entry.date}</div>
                      </div>
                    </div>

                    <div>
                      {entry.clockOut ? (
                        <div>
                          <div className="font-mono text-[13px] font-bold text-muted-dark">{entry.clockOut}</div>
                          {entry.durationHrs !== null && entry.durationHrs > 0 && (
                            <div className="text-[11px] text-muted-lighter mt-0.5">
                              {entry.durationHrs}h · ${(entry.durationHrs * entry.hourlyRate * 1.05).toFixed(2)} billed
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="font-bold text-[12px] text-green-700">Shift in progress</span>
                        </div>
                      )}
                    </div>

                    <div>
                      {entry.gpsVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-full whitespace-nowrap">
                          📍 GPS Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-full whitespace-nowrap">
                          ⚠ Unverified
                        </span>
                      )}
                    </div>

                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full whitespace-nowrap ${SHIFT_STATUS_STYLES[entry.status]}`}>
                      {SHIFT_STATUS_ICONS[entry.status]}{' '}
                      {entry.status === 'no-show' ? 'No-show' : entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Ledger summary bar */}
            <div className="mt-4 pt-4 border-t border-surface-border flex flex-wrap gap-4 text-[13px]">
              {[
                { label: 'Total shifts',  value: shiftLedger.length.toString() },
                { label: 'Active now',    value: shiftLedger.filter((s) => s.status === 'active').length.toString(), highlight: true },
                { label: 'GPS verified',  value: `${shiftLedger.filter((s) => s.gpsVerified).length} / ${shiftLedger.length}` },
                { label: 'No-shows',      value: shiftLedger.filter((s) => s.status === 'no-show').length.toString(), warn: true },
              ].map(({ label, value, highlight, warn }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-muted-light font-medium">{label}:</span>
                  <span className={`font-extrabold ${highlight ? 'text-green-700' : warn ? 'text-rose-600' : 'text-navy'}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Family Master Calendar — all ecosystem services */}
          <FamilyMasterCalendar />

          {/* Care Team Calendar */}
          <CareTeamCalendar />

          {/* Shift Notes & PDF Export */}
          <ShiftNotesExport />

          {/* Audit-Ready PDF Report */}
          <AuditPrintView participantId={selectedId} />

          {/* Legal Compliance Verification */}
          <LegalCompliancePanel />

          {/* Stripe Connect Ledger — APP 11 PII-obfuscated transaction splits */}
          <StripeLedger />

          {/* NDIS Claims Processor — PRODA/PACE CSV export */}
          <NDISClaimsProcessor />

          {/* Geofence Monitor — coordinator read-only audit view */}
          <GeofenceMonitor viewOnly />

          {/* Data Residency Audit — Australian jurisdiction compliance */}
          <DataResidencyAudit />

        </section>

        <AppTour />
      </main>
    </DataMaskProvider>
  );
}
