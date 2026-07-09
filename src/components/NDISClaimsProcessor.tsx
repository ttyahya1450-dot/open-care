'use client';

import { useEffect, useState } from 'react';
import { getStore, DSShiftLog } from '../lib/dataStore';

// PRODA/PACE schema — standard NDIS registration number
const REGISTRATION_NUMBER = '4050000001';

const SUPPORT_ITEM_MAP: Record<string, string> = {
  'Personal Care':       '01_013_0107_1_1',
  'Community Access':    '04_049_0127_6_1',
  'Domestic Assistance': '04_049_0125_6_1',
  'Cleaning':            '01_019_0120_1_1',
  'Gardening':           '01_019_0120_1_1',
  'OT Assessment':       '15_056_0128_1_3',
  'Meal Prep':           '01_011_0107_1_1',
  'Transport':           '02_051_0108_1_1',
  'Exercise Support':    '01_013_0107_1_1',
};

const SUPPORT_PURPOSE_MAP: Record<string, string> = {
  'Personal Care':       'DAILY_ACTIVITIES',
  'Community Access':    'SOCIAL_CIVIC',
  'Domestic Assistance': 'DAILY_ACTIVITIES',
  'Cleaning':            'DAILY_ACTIVITIES',
  'Gardening':           'DAILY_ACTIVITIES',
  'OT Assessment':       'CAPACITY_BUILDING',
  'Meal Prep':           'DAILY_ACTIVITIES',
  'Transport':           'DAILY_ACTIVITIES',
  'Exercise Support':    'DAILY_ACTIVITIES',
};

const NDIS_NUMBERS: Record<string, string> = {
  p1: '430123456',
  p2: '431234567',
  p3: '432345678',
};

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function parseShiftDateToPRODA(date: string): string {
  const parts = date.split(' ');
  if (parts.length !== 3) return date;
  const [day, mon, year] = parts;
  return `${day.padStart(2, '0')}/${MONTHS[mon] ?? '01'}/${year}`;
}

function parseShiftDateRef(date: string): string {
  return date.replace(/\s/g, '');
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function isValidShift(l: DSShiftLog): boolean {
  return l.status === 'completed' && l.clockOut !== null && (l.durationHrs ?? 0) > 0;
}

function skippedReason(l: DSShiftLog): string {
  if (l.status !== 'completed') return `Status: ${l.status} (only completed shifts are claimable)`;
  if (!l.clockOut)              return 'No clock-out recorded';
  if ((l.durationHrs ?? 0) <= 0) return 'Zero duration';
  return 'Unknown';
}

type DownloadState = 'idle' | 'generating' | 'ready';

export default function NDISClaimsProcessor() {
  const [shiftLogs,     setShiftLogs]     = useState<DSShiftLog[]>([]);
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');

  useEffect(() => {
    setShiftLogs(getStore().shiftLogs);
  }, []);

  const validShifts   = shiftLogs.filter(isValidShift);
  const skippedShifts = shiftLogs.filter((l) => !isValidShift(l));
  const totalAmount   = validShifts.reduce((sum, l) => sum + (l.durationHrs ?? 0) * l.hourlyRate * 1.05, 0);

  const buildCSV = (): string => {
    const header = [
      'RegistrationNumber', 'NDISNumber', 'SupportItemNumber', 'ClaimReference',
      'DateOfSupport', 'Units', 'Hours', 'SupportPurposeType',
      'ABSRemunerationCode', 'ABSDivisionCode', 'CancellationReason',
    ].map(csvEscape).join(',');

    const rows = validShifts.map((l) => {
      const ndisNum     = NDIS_NUMBERS[l.participantId] ?? '000000000';
      const itemNum     = SUPPORT_ITEM_MAP[l.serviceType] ?? '01_013_0107_1_1';
      const claimRef    = `OC-${l.id}-${parseShiftDateRef(l.date)}`;
      const dateStr     = parseShiftDateToPRODA(l.date);
      const hrs         = (l.durationHrs ?? 0).toFixed(2);
      const purpose     = SUPPORT_PURPOSE_MAP[l.serviceType] ?? 'DAILY_ACTIVITIES';

      return [
        REGISTRATION_NUMBER,
        ndisNum,
        itemNum,
        claimRef,
        dateStr,
        hrs,
        hrs,
        purpose,
        'W1',
        'Q',
        '',
      ].map(csvEscape).join(',');
    });

    return [header, ...rows].join('\r\n');
  };

  const handleDownload = async () => {
    if (typeof window === 'undefined') return;
    setDownloadState('generating');
    await new Promise((r) => setTimeout(r, 800));
    const csv  = buildCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `OpenCare_NDIS_Claims_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadState('ready');
    setTimeout(() => setDownloadState('idle'), 2000);
  };

  return (
    <div className="card-lg">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">
              NDIS Claims Processor
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
              PRODA / PACE
            </span>
          </div>
          <p className="text-sm text-muted-light dark:text-slate-400 m-0">
            Bulk-validated claim export formatted to the current NDIS government upload schema.
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloadState !== 'idle' || validShifts.length === 0}
          className={`flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-2xl border-none font-bold text-[13px] cursor-pointer transition-all whitespace-nowrap ${
            downloadState === 'generating'
              ? 'bg-surface-muted text-muted-lighter cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'
              : downloadState === 'ready'
              ? 'bg-green-600 text-white'
              : validShifts.length === 0
              ? 'bg-surface-muted text-muted-lighter cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'
              : 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-md hover:opacity-90'
          }`}
        >
          {downloadState === 'generating' ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Generating…
            </>
          ) : downloadState === 'ready' ? (
            '✓ Downloaded!'
          ) : (
            '⬇ Download PRODA/PACE CSV'
          )}
        </button>
      </div>

      {/* Validation summary tiles */}
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-[16px] p-4 text-center">
          <div className="text-[30px] font-extrabold text-green-700 dark:text-green-400 tracking-tight">
            {validShifts.length}
          </div>
          <div className="text-[11px] font-bold text-green-600 dark:text-green-500 uppercase tracking-wider mt-0.5">
            Valid Claims
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-[16px] p-4 text-center">
          <div className="text-[30px] font-extrabold text-amber-700 dark:text-amber-400 tracking-tight">
            {skippedShifts.length}
          </div>
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mt-0.5">
            Skipped
          </div>
        </div>
        <div className="bg-surface dark:bg-slate-800 border border-surface-border dark:border-slate-700 rounded-[16px] p-4 text-center">
          <div className="text-[24px] font-extrabold text-navy dark:text-white tracking-tight">
            ${totalAmount.toFixed(2)}
          </div>
          <div className="text-[11px] font-bold text-muted-light dark:text-slate-400 uppercase tracking-wider mt-0.5">
            Total Claim Value
          </div>
        </div>
      </div>

      {/* Empty state */}
      {validShifts.length === 0 && skippedShifts.length === 0 && (
        <div className="rounded-[16px] border border-surface-border dark:border-slate-700 bg-surface dark:bg-slate-800 p-8 text-center mb-4">
          <div className="text-[28px] mb-2">📋</div>
          <div className="font-bold text-navy dark:text-slate-100 mb-1">No shift records yet</div>
          <div className="text-sm text-muted-light dark:text-slate-400">
            Completed and verified shifts will appear here, ready for PRODA/PACE export.
          </div>
        </div>
      )}

      {/* Valid shifts table */}
      {validShifts.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[12px] font-extrabold text-muted-light dark:text-slate-400 uppercase tracking-[0.1em] mb-3">
            Valid Claims ({validShifts.length})
          </h3>

          <div className="grid gap-2">
            <div
              className="hidden lg:grid text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-lighter dark:text-slate-500 px-3"
              style={{ gridTemplateColumns: '90px 1fr 1fr 1fr 1fr 55px 70px' }}
            >
              <div>Date</div>
              <div>Worker</div>
              <div>Participant</div>
              <div>Service</div>
              <div>Item #</div>
              <div className="text-right">Hrs</div>
              <div className="text-right">Status</div>
            </div>

            {validShifts.map((l) => {
              const itemNum  = SUPPORT_ITEM_MAP[l.serviceType];
              const inferred = !itemNum;
              const item     = itemNum ?? '01_013_0107_1_1';

              return (
                <div
                  key={l.id}
                  className="rounded-[14px] border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5"
                >
                  {/* Mobile */}
                  <div className="lg:hidden">
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <div className="font-bold text-[13px] text-navy dark:text-white">{l.workerName}</div>
                        <div className="text-[11px] text-muted-light dark:text-slate-400">
                          → {l.participantName} · {l.serviceType} · {l.durationHrs}h
                        </div>
                      </div>
                      <span className="badge badge-green text-[10px]">Valid</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-muted-lighter dark:text-slate-500">{item}</span>
                      {inferred && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          Inferred
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Desktop */}
                  <div
                    className="hidden lg:grid items-center gap-3"
                    style={{ gridTemplateColumns: '90px 1fr 1fr 1fr 1fr 55px 70px' }}
                  >
                    <div className="text-[12px] text-muted-dark dark:text-slate-300">
                      {parseShiftDateToPRODA(l.date)}
                    </div>
                    <div className="text-[13px] font-semibold text-navy dark:text-white">{l.workerName}</div>
                    <div className="text-[12px] text-muted-dark dark:text-slate-300">{l.participantName}</div>
                    <div className="text-[12px] text-muted-dark dark:text-slate-300">{l.serviceType}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-muted-lighter dark:text-slate-500">{item}</span>
                      {inferred && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          Inferred
                        </span>
                      )}
                    </div>
                    <div className="text-right font-bold text-[13px] text-navy dark:text-white">
                      {l.durationHrs}
                    </div>
                    <div className="flex justify-end">
                      <span className="badge badge-green text-[10px]">Valid</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Skipped shifts */}
      {skippedShifts.length > 0 && (
        <div className="rounded-[16px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[16px]">⚠</span>
            <h3 className="text-[13px] font-bold text-amber-800 dark:text-amber-300 m-0 uppercase tracking-wider">
              Skipped Shifts ({skippedShifts.length})
            </h3>
          </div>
          <div className="grid gap-2">
            {skippedShifts.map((l) => (
              <div key={l.id} className="bg-white/60 dark:bg-white/5 rounded-[12px] p-3 flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <div className="font-bold text-[12px] text-amber-900 dark:text-amber-200">
                    {l.workerName} → {l.participantName}
                  </div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    {l.date} · {l.serviceType}
                  </div>
                </div>
                <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold text-right">
                  {skippedReason(l)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schema note */}
      <p className="text-[11px] text-muted-lighter dark:text-slate-500 mt-4 text-center m-0">
        CSV formatted to NDIS PRODA/PACE bulk claims schema (2025) ·
        ABSDivisionCode Q (Healthcare &amp; Social Assistance) ·
        All data remains local — no NDIA network calls
      </p>
    </div>
  );
}
