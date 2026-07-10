'use client';

import { useState, useEffect, useRef } from 'react';
import { useDataStore } from '../context/DataStoreContext';
import type { DSShiftLog } from '../lib/dataStore';

interface Props {
  participantId?: string;
}

function PrintableReport({ logs }: { logs: DSShiftLog[] }) {
  const generatedAt = new Date().toLocaleString('en-AU', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const totalHrs = logs.reduce((s, l) => s + (l.durationHrs ?? 0), 0);
  const totalBilled = logs.reduce((s, l) => s + (l.durationHrs ?? 0) * l.hourlyRate * 1.05, 0);
  const gpsVerifiedCount = logs.filter((l) => l.gpsVerified).length;

  return (
    <div className="audit-print-root font-sans text-[#162033] bg-white p-8 max-w-[780px] mx-auto">
      {/* Report header */}
      <div className="flex justify-between items-start border-b-2 border-[#3f6df6] pb-5 mb-7">
        <div>
          <div className="text-[26px] font-extrabold text-[#3f6df6] tracking-tight mb-1">OpenCare</div>
          <div className="text-[14px] font-bold text-[#162033]">Verified Shift Audit Report</div>
          <div className="text-[12px] text-[#6b7280] mt-1">NDIS Provider Audit — Confidential</div>
        </div>
        <div className="text-right text-[12px] text-[#6b7280]">
          <div className="font-bold text-[#162033] mb-1">Generated</div>
          <div>{generatedAt}</div>
          <div className="mt-1 text-[10px] font-mono bg-[#f4f6fb] px-2 py-1 rounded">
            REF: OC-{Date.now().toString(36).toUpperCase().slice(-8)}
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total shifts',   value: logs.length.toString() },
          { label: 'Total hours',    value: `${totalHrs.toFixed(2)}h` },
          { label: 'Total billed',   value: `$${totalBilled.toFixed(2)}` },
          { label: 'GPS verified',   value: `${gpsVerifiedCount}/${logs.length}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#f4f6fb] rounded-xl p-3.5 border border-[#eef2f8]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1">{label}</div>
            <div className="text-[20px] font-extrabold text-[#162033] tracking-tight">{value}</div>
          </div>
        ))}
      </div>

      {/* Shift log table */}
      <table className="w-full border-collapse text-[12px] mb-7">
        <thead>
          <tr className="bg-[#f4f6fb]">
            {['Date', 'Worker', 'Participant', 'Service', 'Clock-In', 'Clock-Out', 'Hrs', 'GPS Coordinates', 'Verified', 'Billed'].map((h) => (
              <th key={h} className="px-3 py-2.5 text-left font-bold text-[#162033] border-b-2 border-[#eef2f8] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => {
            const billed = (log.durationHrs ?? 0) * log.hourlyRate * 1.05;
            return (
              <tr key={log.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#fafbfd]'}>
                <td className="px-3 py-2 border-b border-[#eef2f8] whitespace-nowrap">{log.date}</td>
                <td className="px-3 py-2 border-b border-[#eef2f8] font-semibold">{log.workerName}</td>
                <td className="px-3 py-2 border-b border-[#eef2f8]">{log.participantName}</td>
                <td className="px-3 py-2 border-b border-[#eef2f8] text-[#6b7280]">{log.serviceType}</td>
                <td className="px-3 py-2 border-b border-[#eef2f8] font-mono text-[11px] text-[#22c55e]">{log.clockIn}</td>
                <td className="px-3 py-2 border-b border-[#eef2f8] font-mono text-[11px]">{log.clockOut ?? '—'}</td>
                <td className="px-3 py-2 border-b border-[#eef2f8] font-bold">{log.durationHrs?.toFixed(2) ?? '—'}</td>
                <td className="px-3 py-2 border-b border-[#eef2f8] text-[10px] font-mono text-[#6b7280]">
                  {log.gpsLat.toFixed(4)}, {log.gpsLng.toFixed(4)}
                </td>
                <td className="px-3 py-2 border-b border-[#eef2f8] text-center">
                  {log.gpsVerified
                    ? <span className="text-[#22c55e] font-bold">✓ Yes</span>
                    : <span className="text-[#f59e0b] font-bold">⚠ No</span>}
                </td>
                <td className="px-3 py-2 border-b border-[#eef2f8] font-bold">
                  {log.durationHrs ? `$${billed.toFixed(2)}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-[#eef2f8]">
            <td colSpan={6} className="px-3 py-2.5 font-extrabold text-right">Totals:</td>
            <td className="px-3 py-2.5 font-extrabold">{totalHrs.toFixed(2)}h</td>
            <td />
            <td className="px-3 py-2.5 font-extrabold text-center text-[#22c55e]">{gpsVerifiedCount}/{logs.length}</td>
            <td className="px-3 py-2.5 font-extrabold">${totalBilled.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {/* GPS address log */}
      <div className="mb-7">
        <div className="font-bold text-[13px] text-[#162033] mb-3 border-b border-[#eef2f8] pb-2">GPS Address Verification Log</div>
        {logs.filter((l) => l.gpsVerified).map((log) => (
          <div key={log.id} className="flex items-start gap-3 py-2 border-b border-[#eef2f8] last:border-b-0">
            <span className="text-[#22c55e] font-bold text-[11px] shrink-0 mt-0.5">📍 VERIFIED</span>
            <div className="text-[11px] text-[#6b7280]">
              <strong className="text-[#162033]">{log.workerName}</strong> clocked in at{' '}
              <strong className="text-[#162033]">{log.clockIn}</strong> on <strong className="text-[#162033]">{log.date}</strong> at{' '}
              {log.gpsAddress} · Coords: ({log.gpsLat.toFixed(6)}, {log.gpsLng.toFixed(6)})
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-[#eef2f8] pt-4 text-[10px] text-[#9ca3af] flex justify-between">
        <span>OpenCare Marketplace Pty Ltd · ABN 00 000 000 000 · NDIS Registered Provider</span>
        <span>This document is system-generated and audit-compliant under NDIS Practice Standards 2018</span>
      </div>
    </div>
  );
}

export default function AuditPrintView({ participantId }: Props) {
  const { store } = useDataStore();
  const [showPreview, setShowPreview] = useState(false);
  const [printState, setPrintState] = useState<'idle' | 'generating'>('idle');

  const previewRef    = useRef<HTMLDivElement>(null);
  const contentRef    = useRef<HTMLDivElement>(null);
  const [previewScale,  setPreviewScale]  = useState(1);
  const [contentHeight, setContentHeight] = useState(500);

  useEffect(() => {
    if (!showPreview) return;
    const update = () => {
      if (!previewRef.current || !contentRef.current) return;
      const s = Math.min(1, previewRef.current.clientWidth / 812);
      setPreviewScale(s);
      setContentHeight(contentRef.current.scrollHeight);
    };
    const t = setTimeout(update, 0);
    const ro = new ResizeObserver(update);
    if (previewRef.current) ro.observe(previewRef.current);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [showPreview]);

  const logs = participantId
    ? store.shiftLogs.filter((l) => l.participantId === participantId)
    : store.shiftLogs;

  const handlePrint = () => {
    setPrintState('generating');
    setTimeout(() => {
      setPrintState('idle');
      window.print();
    }, 600);
  };

  return (
    <>
      {/* Print trigger button */}
      <div className="card-lg">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">Audit-Ready PDF Report</h2>
            <p className="text-muted-light dark:text-slate-400 text-sm mt-1.5 max-w-[540px]">
              Compiles all verified shift logs with exact GPS coordinates, clock-in/out timestamps, and billing totals into a professional NDIS audit-compliant layout. Opens the native print dialog.
            </p>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <button
              onClick={() => setShowPreview((p) => !p)}
              className="btn-secondary text-[13px]"
            >
              {showPreview ? '▲ Hide preview' : '▼ Preview report'}
            </button>
            <button
              onClick={handlePrint}
              disabled={printState === 'generating'}
              className={`px-5 py-2.5 rounded-xl border-none font-bold text-[13px] text-white cursor-pointer transition-all whitespace-nowrap ${
                printState === 'generating'
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-brand-gradient shadow-brand-btn hover:opacity-90'
              }`}
            >
              {printState === 'generating' ? '⏳ Preparing…' : '🖨 Download PDF'}
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-surface-border dark:border-slate-700">
          {[
            { label: 'Shifts in report',  value: logs.length.toString() },
            { label: 'Total hours',       value: `${logs.reduce((s, l) => s + (l.durationHrs ?? 0), 0).toFixed(2)}h` },
            { label: 'GPS verified',      value: `${logs.filter((l) => l.gpsVerified).length}/${logs.length}` },
            { label: 'Total billed',      value: `$${logs.reduce((s, l) => s + (l.durationHrs ?? 0) * l.hourlyRate * 1.05, 0).toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-muted-light dark:text-slate-400 text-[13px] font-medium">{label}:</span>
              <span className="font-extrabold text-navy dark:text-white text-[13px]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview panel */}
      {showPreview && (
        <div className="rounded-[20px] border border-surface-border dark:border-slate-700 overflow-hidden bg-[#f4f6fb] dark:bg-slate-900 animate-slide-up">
          <div className="px-5 py-3 bg-white dark:bg-slate-800 border-b border-surface-border dark:border-slate-700 flex items-center justify-between">
            <span className="font-bold text-sm text-muted-dark dark:text-slate-300">Report preview (screen render)</span>
            <button
              onClick={handlePrint}
              className="btn-primary text-[12px] py-2"
            >
              🖨 Print / Save PDF
            </button>
          </div>
          <div
            ref={previewRef}
            className="w-full overflow-hidden"
            style={{ height: `${Math.max(300, contentHeight * previewScale + 32)}px` }}
          >
            <div
              ref={contentRef}
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
                width: '812px',
                padding: '16px',
              }}
            >
              <PrintableReport logs={logs} />
            </div>
          </div>
        </div>
      )}

      {/* Hidden print-only node — shown by @media print CSS */}
      <div className="hidden print:block">
        <PrintableReport logs={logs} />
      </div>
    </>
  );
}
