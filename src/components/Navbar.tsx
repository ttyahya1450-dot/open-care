'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, type UserRole } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';
import SMSAlertBanner from './SMSAlertBanner';
import BottomNav from './BottomNav';

// ── Sun + Moon SVGs ────────────────────────────────────────────────────────
function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#93c5fd"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

// ── Role meta (badge + ring colour for mobile avatar) ─────────────────────
const ROLE_META: Record<UserRole, { label: string; badge: string; ring: string }> = {
  PARTICIPANT: {
    label: 'Participant',
    badge: 'bg-brand-xlight text-brand-mid',
    ring:  'ring-2 ring-brand/60 ring-offset-1 ring-offset-white dark:ring-offset-slate-800',
  },
  WORKER: {
    label: 'Support Worker',
    badge: 'bg-pink-50 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
    ring:  'ring-2 ring-pink-400/80 ring-offset-1 ring-offset-white dark:ring-offset-slate-800',
  },
  COORDINATOR: {
    label: 'Support Coordinator',
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    ring:  'ring-2 ring-purple-400/80 ring-offset-1 ring-offset-white dark:ring-offset-slate-800',
  },
};

// ── Role-filtered navigation (desktop only) ────────────────────────────────
const ROLE_NAV: Record<UserRole, Array<{ href: string; label: string }>> = {
  PARTICIPANT: [
    { href: '/',         label: 'Find Workers' },
    { href: '/workers',  label: 'My Care Team' },
    { href: '/checkout', label: 'Book a Shift' },
  ],
  WORKER: [
    { href: '/workers', label: 'My Dashboard' },
  ],
  COORDINATOR: [
    { href: '/coordinator',                      label: 'Client Budgets' },
    { href: '/coordinator#care-calendar',        label: 'Care Calendar' },
    { href: '/coordinator#shift-notes-export',   label: 'Shift Notes' },
  ],
};

const GUEST_NAV = [
  { href: '/',         label: 'Browse Workers' },
  { href: '/checkout', label: 'Pricing' },
];

// ── Theme toggle pill ──────────────────────────────────────────────────────
// onTouchStart fires immediately without the 300 ms classification delay.
// e.preventDefault() suppresses the ghost click that would fire afterwards.
function ThemeToggle({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); onToggle(); }}
      onClick={onToggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="inline-flex items-center justify-center w-[52px] min-h-[44px] shrink-0
                 cursor-pointer border-none outline-none bg-transparent
                 focus-visible:ring-2 focus-visible:ring-brand/50 rounded-full"
    >
      <span className="relative w-[52px] h-[28px] rounded-full block
                       transition-colors duration-300 bg-slate-200 dark:bg-slate-600">
        <span
          className="absolute top-[4px] w-[20px] h-[20px] rounded-full bg-white dark:bg-slate-900
                     shadow-[0_1px_4px_rgba(0,0,0,0.25)] transition-all duration-300
                     flex items-center justify-center"
          style={{ left: theme === 'dark' ? '29px' : '3px' }}
        >
          {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
        </span>
      </span>
    </button>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router   = useRouter();

  const handleSignOut = () => {
    signOut();
    router.replace('/auth');
  };

  const navLinks = user ? ROLE_NAV[user.role] : GUEST_NAV;
  const roleMeta = user ? ROLE_META[user.role] : null;
  const isActive = (href: string) => pathname === href.split('#')[0];
  const initials  = user
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '';

  return (
    <>
      <nav className="nav-root">
        {/* overflow-hidden prevents any child element from creating horizontal bleed */}
        <div className="max-w-[1120px] mx-auto px-4 sm:px-5 flex items-center justify-between h-[60px] overflow-hidden">

          {/* Logo — shrink-0 keeps it from collapsing; min-w-0 lets it truncate if needed */}
          <Link
            href={user ? (ROLE_NAV[user.role]?.[0]?.href ?? '/') : '/'}
            className="font-extrabold text-[18px] text-brand tracking-tight no-underline flex items-center gap-2 shrink-0 min-w-0"
          >
            <span className="w-[30px] h-[30px] bg-avatar-gradient rounded-[8px] flex items-center justify-center text-white text-[14px] shrink-0">🩺</span>
            <span className="truncate">OpenCare</span>
          </Link>

          {/* ── Desktop nav (hidden on mobile — bottom nav handles it) ── */}
          <div className="hidden md:flex gap-1.5 items-center">
            {navLinks.map(({ href, label }) => (
              <Link
                key={`${href}-${label}`}
                href={href}
                className={`nav-link ${
                  isActive(href)
                    ? 'bg-brand-xlight dark:bg-brand/20 text-brand border border-brand-border dark:border-brand/30'
                    : ''
                }`}
              >
                {label}
              </Link>
            ))}

            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {user && <NotificationBell />}

            {user ? (
              <div className="flex gap-2 items-center ml-1 pl-2 border-l border-surface-border dark:border-slate-700">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-muted dark:bg-slate-800 rounded-[10px] border border-surface-border dark:border-slate-700">
                  <div className="w-[26px] h-[26px] bg-avatar-gradient rounded-full flex items-center justify-center text-white font-extrabold text-[11px] shrink-0">
                    {initials}
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="font-bold text-[12px] text-navy dark:text-slate-100 max-w-[80px] truncate">
                      {user.name}
                    </span>
                    {roleMeta && (
                      <span className={`text-[9px] font-extrabold uppercase tracking-[0.05em] mt-0.5 ${roleMeta.badge} px-1 py-0.5 rounded`}>
                        {roleMeta.label}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onTouchStart={(e) => { e.preventDefault(); handleSignOut(); }}
                  onClick={handleSignOut}
                  className="px-3 py-1.5 min-h-[44px] rounded-[10px] border border-surface-divider dark:border-slate-600
                             bg-white dark:bg-slate-800 text-muted-light dark:text-slate-400
                             font-bold text-[12px] cursor-pointer hover:bg-surface-muted dark:hover:bg-slate-700 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="ml-2 px-4 py-2 min-h-[44px] inline-flex items-center rounded-[10px] bg-brand-gradient text-white font-bold text-[13px] no-underline shadow-brand-sm hover:opacity-90 transition-opacity"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* ── Mobile top-right: theme · bell · role-ring avatar ─────────────── */}
          {/* Sign out is in BottomNav — keeps the header row uncluttered.         */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            {user && <NotificationBell />}

            {/* Role-ring avatar — the coloured ring encodes the user's role at a glance */}
            {user && (
              <div
                className={`w-[32px] h-[32px] bg-avatar-gradient rounded-full flex items-center justify-center
                             text-white font-extrabold text-[11px] shrink-0 ${roleMeta?.ring ?? ''}`}
                role="img"
                aria-label={`Signed in as ${user.name} — ${roleMeta?.label ?? 'User'}`}
              >
                {initials}
              </div>
            )}

            {!user && (
              <Link
                href="/auth"
                className="px-3 py-1.5 min-h-[44px] rounded-[10px] bg-brand-gradient text-white font-bold text-[12px] no-underline shadow-brand-sm hover:opacity-90 transition-opacity flex items-center"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* SMS arrival banner */}
      <SMSAlertBanner />

      {/* Floating bottom navigation — mobile only */}
      <BottomNav />
    </>
  );
}
