'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDataStore } from '../context/DataStoreContext';
import type { DSNotification } from '../lib/dataStore';

const TYPE_ICON: Record<DSNotification['type'], string> = {
  shift_start:       '🕐',
  booking_confirmed: '✅',
  shift_complete:    '✓',
  budget_alert:      '🔴',
  swap_request:      '⇄',
  worker_arrival:    '📍',
  plan_review:       '📋',
};

const TYPE_COLOR: Record<DSNotification['type'], string> = {
  shift_start:       'text-brand',
  booking_confirmed: 'text-green-600 dark:text-green-400',
  shift_complete:    'text-green-700 dark:text-green-400',
  budget_alert:      'text-rose-600 dark:text-rose-400',
  swap_request:      'text-amber-600 dark:text-amber-400',
  worker_arrival:    'text-purple-600 dark:text-purple-400',
  plan_review:       'text-muted-dark dark:text-slate-300',
};

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { store, markRead, markAllReadForRole, unreadCount } = useDataStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const myNotifs = store.notifications
    .filter((n) => n.targetRoles.includes(user.role))
    .slice(0, 10);

  const handleOpen = () => setOpen((p) => !p);

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative w-[36px] h-[36px] flex items-center justify-center rounded-[10px] bg-surface-muted dark:bg-slate-800 border border-surface-border dark:border-slate-700 cursor-pointer hover:bg-surface-border dark:hover:bg-slate-700 transition-colors"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-dark dark:text-slate-300">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[340px] bg-white dark:bg-slate-800 rounded-[18px] shadow-card-lg dark:shadow-[0_14px_40px_rgba(0,0,0,0.4)] border border-surface-border dark:border-slate-700 z-[200] animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3.5 border-b border-surface-border dark:border-slate-700">
            <span className="font-extrabold text-[14px] text-navy dark:text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllReadForRole}
                className="text-[11px] font-bold text-brand cursor-pointer bg-transparent border-none hover:opacity-70 transition-opacity"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {myNotifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-light dark:text-slate-400 text-sm">
                No notifications yet
              </div>
            ) : (
              myNotifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3.5 border-b border-surface-border dark:border-slate-700/60 last:border-b-0 cursor-pointer transition-colors font-sans hover:bg-surface-muted dark:hover:bg-slate-700/50 ${
                    !n.read ? 'bg-brand-xlight/40 dark:bg-brand/8' : ''
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <span className={`text-[16px] shrink-0 mt-0.5 ${TYPE_COLOR[n.type]}`}>
                      {TYPE_ICON[n.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`font-bold text-[12px] ${!n.read ? 'text-navy dark:text-white' : 'text-muted-dark dark:text-slate-300'}`}>
                          {n.title}
                        </span>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1" />}
                      </div>
                      <p className="text-[11px] text-muted-light dark:text-slate-400 mt-0.5 leading-snug m-0">{n.body}</p>
                      <span className="text-[10px] text-muted-lighter dark:text-slate-500 mt-1 block">{relativeTime(n.timestamp)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
