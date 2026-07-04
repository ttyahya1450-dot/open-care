'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  userRole:     string;
  attemptedUrl: string;
  requiredRole: string;
  userName?:    string;
  onRedirect:   () => void;
  countdownSecs?: number;
}

export default function SecurityRedirectError({
  userRole,
  attemptedUrl,
  requiredRole,
  userName,
  onRedirect,
  countdownSecs = 5,
}: Props) {
  const [remaining, setRemaining] = useState(countdownSecs);
  const [logId]                   = useState(() => Math.random().toString(36).slice(2, 10).toUpperCase());
  const [timestamp]               = useState(() => new Date().toISOString());
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [onRedirect]);

  const pct = ((countdownSecs - remaining) / countdownSecs) * 100;

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-[520px] mx-4">

        {/* Main card */}
        <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl overflow-hidden border-2 border-rose-500/60">

          {/* Red top bar */}
          <div className="bg-rose-600 px-6 py-3 flex items-center gap-2.5">
            <span className="text-white text-[16px]">🛡</span>
            <span className="text-white text-[12px] font-extrabold uppercase tracking-[0.14em]">
              OpenCare Security
            </span>
            <span className="ml-auto text-rose-200 text-[11px] font-mono">{logId}</span>
          </div>

          <div className="px-7 py-7">
            {/* Animated shield icon */}
            <div className="flex justify-center mb-5">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-rose-100 dark:bg-rose-900/30 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 text-rose-600 dark:text-rose-400" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 13H9V8h2v6zm0-8H9V4h2v2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-center text-[22px] font-extrabold text-rose-600 dark:text-rose-400 m-0 leading-tight mb-2">
              SECURITY VIOLATION
            </h1>
            <p className="text-center text-[13px] text-muted-dark dark:text-slate-300 mb-6">
              Unauthorized access attempt detected and blocked
            </p>

            {/* Violation details */}
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-[16px] p-4 mb-5 text-[12px] space-y-2">
              <ViolationRow label="User"           value={userName ?? 'Unknown'} />
              <ViolationRow label="Your role"      value={userRole} highlight />
              <ViolationRow label="Attempted URL"  value={attemptedUrl} mono />
              <ViolationRow label="Required role"  value={requiredRole} highlight />
              <ViolationRow label="Timestamp"      value={timestamp} mono />
              <ViolationRow label="Incident ID"    value={logId} mono />
            </div>

            <p className="text-center text-[12px] text-muted-light dark:text-slate-400 mb-5">
              This access attempt has been logged to your security audit trail. You will be automatically redirected to your authorized portal.
            </p>

            {/* Countdown + progress bar */}
            <div className="bg-surface-muted dark:bg-slate-800 rounded-[12px] p-4 border border-surface-border dark:border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] text-muted-dark dark:text-slate-300 font-semibold">
                  Redirecting to {userRole} portal
                </span>
                <span className="text-[16px] font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                  {remaining}s
                </span>
              </div>
              <div className="h-2 bg-surface-border dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 dark:bg-rose-600 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 mt-4">
          OpenCare Enterprise Security Engine · Zero-trust role boundary enforcement
        </p>
      </div>
    </div>
  );
}

function ViolationRow({ label, value, mono, highlight }: {
  label:     string;
  value:     string;
  mono?:     boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="text-muted-lighter dark:text-slate-500 font-bold uppercase tracking-wider w-28 shrink-0">{label}</span>
      <span className={`break-all font-semibold ${
        mono      ? 'font-mono text-rose-700 dark:text-rose-300'
        : highlight ? 'text-navy dark:text-white uppercase tracking-wider'
        : 'text-muted-dark dark:text-slate-300'
      }`}>
        {value}
      </span>
    </div>
  );
}
