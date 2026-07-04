'use client';

import { useEffect, useState } from 'react';
import { getAllConsents, formatConsentTimestamp, type LegalConsent } from '../lib/legalStore';
import { useDataStore } from '../context/DataStoreContext';

type FilterMode = 'all' | 'signed' | 'pending';

// Known users to display — merged from DataStore + any live consent records
const KNOWN_USERS = [
  { email: 'alex@demo.opencare',   name: 'Alex Morgan',    role: 'PARTICIPANT' as const },
  { email: 'riley@demo.opencare',  name: 'Riley Nguyen',   role: 'PARTICIPANT' as const },
  { email: 'jordan@demo.opencare', name: 'Jordan Lee',     role: 'PARTICIPANT' as const },
  { email: 'maya@demo.opencare',   name: 'Maya Chen',      role: 'WORKER'      as const },
  { email: 'daniel@demo.opencare', name: 'Daniel Brooks',  role: 'WORKER'      as const },
  { email: 'aisha@demo.opencare',  name: 'Aisha Rahman',   role: 'WORKER'      as const },
  { email: 'jordan@demo.opencare', name: 'Jordan Brooks',  role: 'COORDINATOR' as const },
];

interface DisplayRow {
  email: string;
  name: string;
  role: string;
  consent: LegalConsent | null;
}

export default function LegalCompliancePanel() {
  const { store } = useDataStore();
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  void store;

  useEffect(() => {
    const consentMap: Record<string, LegalConsent> = {};
    getAllConsents().forEach((c) => { consentMap[c.userEmail] = c; });

    // Also pick up any user not in KNOWN_USERS but who has a consent record
    const extraEmails = Object.keys(consentMap).filter(
      (e) => !KNOWN_USERS.some((u) => u.email === e),
    );

    const built: DisplayRow[] = [
      ...KNOWN_USERS.map((u) => ({ ...u, consent: consentMap[u.email] ?? null })),
      ...extraEmails.map((e) => ({
        email: e, name: consentMap[e].userName,
        role: consentMap[e].userRole, consent: consentMap[e],
      })),
    ];

    setRows(built);
  }, []);

  const filtered = rows.filter((r) => {
    if (filter === 'signed')  return !!r.consent;
    if (filter === 'pending') return !r.consent;
    return true;
  });

  const signedCount  = rows.filter((r) => !!r.consent).length;
  const pendingCount = rows.filter((r) => !r.consent).length;

  const ROLE_BADGE: Record<string, string> = {
    PARTICIPANT:  'bg-brand-xlight text-brand-mid dark:bg-brand/20',
    WORKER:       'bg-pink-50 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
    COORDINATOR:  'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  };

  return (
    <div className="card-lg">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-5">
        <div>
          <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">Legal Compliance Verification</h2>
          <p className="text-muted-light dark:text-slate-400 text-sm mt-1.5">
            Verify which participants, workers, and coordinators have signed the OpenCare Service Agreement. All consents are timestamped and audit-ready.
          </p>
        </div>
        <div className="flex gap-2.5">
          <div className="bg-green-50 dark:bg-green-900/25 rounded-xl px-3.5 py-2.5 text-center border border-green-200 dark:border-green-800">
            <div className="text-[18px] font-extrabold text-green-700 dark:text-green-400">{signedCount}</div>
            <div className="text-[10px] text-green-600 dark:text-green-500 font-bold uppercase tracking-wider">Signed</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/25 rounded-xl px-3.5 py-2.5 text-center border border-amber-200 dark:border-amber-800">
            <div className="text-[18px] font-extrabold text-amber-700 dark:text-amber-400">{pendingCount}</div>
            <div className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-wider">Pending</div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 bg-surface-muted dark:bg-slate-700/50 rounded-[12px] p-1 border border-surface-border dark:border-slate-700 w-fit mb-4">
        {(['all', 'signed', 'pending'] as FilterMode[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-[9px] border-none font-bold text-[12px] cursor-pointer transition-all capitalize ${
              filter === f
                ? 'bg-white dark:bg-slate-800 text-navy dark:text-white shadow-[0_1px_4px_rgba(0,0,0,0.1)]'
                : 'bg-transparent text-muted-light dark:text-slate-400 hover:text-navy dark:hover:text-slate-200'
            }`}
          >
            {f === 'all' ? `All (${rows.length})` : f === 'signed' ? `✓ Signed (${signedCount})` : `⚠ Pending (${pendingCount})`}
          </button>
        ))}
      </div>

      {/* Compliance table */}
      <div className="grid gap-2">
        {/* Column header — desktop */}
        <div className="hidden md:grid text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-lighter dark:text-slate-500 px-4"
          style={{ gridTemplateColumns: '1fr 100px 110px 1fr 120px' }}>
          <div>Name</div>
          <div>Role</div>
          <div>Status</div>
          <div>Signed at</div>
          <div>Terms version</div>
        </div>

        {filtered.map((row) => {
          const signed   = !!row.consent;
          const isOpen   = expanded === row.email;

          return (
            <div key={row.email + row.role}>
              <button
                onClick={() => setExpanded(isOpen ? null : row.email)}
                className={`w-full text-left rounded-[14px] border px-4 py-3.5 transition-all cursor-pointer font-sans ${
                  signed
                    ? 'bg-white dark:bg-slate-800 border-surface-border dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700'
                    : 'bg-amber-50/60 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800/60 hover:border-amber-400 dark:hover:border-amber-700'
                }`}
              >
                {/* Mobile layout */}
                <div className="flex justify-between items-start gap-3 md:hidden flex-wrap">
                  <div>
                    <div className="font-bold text-[14px] text-navy dark:text-white">{row.name}</div>
                    <div className="text-[12px] text-muted-light dark:text-slate-400 mt-0.5">{row.email}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`badge text-[11px] ${ROLE_BADGE[row.role] ?? 'bg-surface text-muted-dark'}`}>{row.role}</span>
                    {signed
                      ? <span className="badge badge-green text-[11px]">✓ Signed</span>
                      : <span className="badge badge-amber text-[11px]">⚠ Pending</span>}
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:grid items-center gap-3" style={{ gridTemplateColumns: '1fr 100px 110px 1fr 120px' }}>
                  <div>
                    <div className="font-bold text-[13px] text-navy dark:text-white">{row.name}</div>
                    <div className="text-[11px] text-muted-lighter dark:text-slate-500 mt-0.5 font-mono">{row.email}</div>
                  </div>
                  <span className={`badge text-[11px] w-fit ${ROLE_BADGE[row.role] ?? 'bg-surface text-muted-dark'}`}>{row.role}</span>
                  {signed
                    ? <span className="badge badge-green text-[11px] w-fit">✓ Signed</span>
                    : <span className="badge badge-amber text-[11px] w-fit">⚠ Pending</span>}
                  <div className="text-[12px] text-muted-dark dark:text-slate-300">
                    {row.consent ? formatConsentTimestamp(row.consent.timestamp) : <span className="text-amber-600 dark:text-amber-400">Not yet signed</span>}
                  </div>
                  <div className="text-[11px] font-mono text-muted-lighter dark:text-slate-500">
                    {row.consent ? `v${row.consent.termsVersion}` : '—'}
                  </div>
                </div>
              </button>

              {/* Expanded consent detail */}
              {isOpen && row.consent && (
                <div className="mt-1 mb-2 rounded-[14px] bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-5 py-4 animate-slide-up">
                  <div className="grid gap-2 text-[12px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    {[
                      { label: 'Signature name',   value: row.consent.signatureName },
                      { label: 'Timestamp (UTC)',  value: row.consent.timestamp },
                      { label: 'Session ID',       value: row.consent.sessionId },
                      { label: 'Simulated IP',     value: row.consent.simulatedIp },
                      { label: 'Terms version',    value: `v${row.consent.termsVersion}` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-500 mb-0.5">{label}</div>
                        <div className="font-mono text-navy dark:text-green-200 text-[11px] break-all">{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-1.5">
                    {[
                      { key: 'agreedToIntermediaryWaiver',  label: 'Intermediary Liability Waiver (§1)' },
                      { key: 'agreedToAntiCircumvention',   label: 'Anti-Circumvention Clause (§2)'    },
                      { key: 'agreedToCancellationPolicy',  label: '24-Hour Cancellation Policy (§3)'  },
                      { key: 'agreedToMasterTerms',         label: 'Master Terms of Service'           },
                    ].map(({ key, label }) => {
                      const agreed = row.consent![key as keyof LegalConsent] as boolean;
                      return (
                        <div key={key} className="flex items-center gap-2 text-[11px]">
                          <span className={agreed ? 'text-green-600 dark:text-green-400 font-bold' : 'text-rose-500 font-bold'}>
                            {agreed ? '✓' : '✗'}
                          </span>
                          <span className={agreed ? 'text-green-700 dark:text-green-300' : 'text-rose-600 dark:text-rose-400'}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isOpen && !row.consent && (
                <div className="mt-1 mb-2 rounded-[14px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-5 py-4 animate-slide-up">
                  <p className="text-[12px] text-amber-700 dark:text-amber-400 font-semibold">
                    ⚠ {row.name} has not yet completed the OpenCare Service Agreement. They will be prompted to sign upon their next login.
                    <br />
                    <span className="font-normal mt-1 block">Action required: Ensure this user logs in and completes the consent flow before scheduling billable services.</span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="mt-5 pt-4 border-t border-surface-border dark:border-slate-700 flex items-start gap-2.5 text-[11px] text-muted-light dark:text-slate-400">
        <span className="text-[14px] shrink-0 mt-0.5">🔒</span>
        <span>
          All consent records are stored in the user&apos;s local device profile with a cryptographic session identifier and timestamped IP address. These records constitute legally admissible electronic signatures under the <em>Electronic Transactions Act 1999 (Cth)</em>.
        </span>
      </div>
    </div>
  );
}
