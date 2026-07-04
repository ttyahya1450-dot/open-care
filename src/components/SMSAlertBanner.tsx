'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SESSION_KEY = 'opencare_sms_shown';

interface SMSAlert {
  workerName: string;
  minsAway: number;
  serviceType: string;
}

const DEMO_ALERT: SMSAlert = {
  workerName: 'Maya Chen',
  minsAway: 10,
  serviceType: 'Personal Care',
};

export default function SMSAlertBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show once per session, only for PARTICIPANT
    if (!user || user.role !== 'PARTICIPANT') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(SESSION_KEY, '1');

      // Auto-dismiss after 9 seconds
      setTimeout(() => setVisible(false), 9000);
    }, 3500);

    return () => clearTimeout(timer);
  }, [user]);

  if (!visible) return null;

  const { workerName, minsAway, serviceType } = DEMO_ALERT;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] w-[min(440px,calc(100vw-2rem))] animate-slide-up"
      role="alert"
      aria-live="polite"
    >
      <div className="bg-white dark:bg-slate-800 rounded-[18px] shadow-dialog dark:shadow-[0_32px_80px_rgba(0,0,0,0.6)] border border-surface-border dark:border-slate-700 overflow-hidden">
        {/* SMS indicator strip */}
        <div className="bg-green-500 px-4 py-2 flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          <span className="text-white text-[11px] font-bold uppercase tracking-wider">SMS Alert · OpenCare</span>
          <span className="ml-auto text-white/70 text-[10px] font-mono">Now</span>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white font-extrabold text-[14px] shrink-0">
            MC
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-navy dark:text-white leading-snug mb-1">
              {workerName} is arriving in ~{minsAway} minutes
            </p>
            <p className="text-[12px] text-muted-light dark:text-slate-400 leading-snug m-0">
              Your {serviceType} session is about to begin. Make sure you&apos;re ready at the front door.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-4">
          <button className="flex-1 py-2.5 rounded-[12px] bg-brand-gradient text-white font-bold text-[13px] border-none cursor-pointer hover:opacity-90 transition-opacity">
            Track arrival
          </button>
          <button
            onClick={() => setVisible(false)}
            className="px-4 py-2.5 rounded-[12px] border border-surface-divider dark:border-slate-600 bg-surface-muted dark:bg-slate-700 text-muted-dark dark:text-slate-300 font-bold text-[13px] cursor-pointer hover:bg-surface-border dark:hover:bg-slate-600 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
