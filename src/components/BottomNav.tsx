'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, type UserRole } from '../context/AuthContext';

// ── Minimal SVG icons ──────────────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 0 1 0-4h14v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0z" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function PriceIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

// ── Nav configuration ──────────────────────────────────────────────────────
interface NavItem {
  href:  string;
  label: string;
  icon:  React.ReactNode;
}

const ROLE_NAV: Record<UserRole, NavItem[]> = {
  PARTICIPANT: [
    { href: '/',         label: 'Find',  icon: <SearchIcon /> },
    { href: '/workers',  label: 'Team',  icon: <TeamIcon /> },
    { href: '/checkout', label: 'Book',  icon: <CalendarIcon /> },
  ],
  WORKER: [
    { href: '/workers', label: 'Dashboard', icon: <GridIcon /> },
  ],
  COORDINATOR: [
    { href: '/coordinator',                      label: 'Budgets',  icon: <WalletIcon /> },
    { href: '/coordinator#care-calendar',        label: 'Calendar', icon: <CalendarIcon /> },
    { href: '/coordinator#shift-notes-export',   label: 'Notes',    icon: <NotesIcon /> },
  ],
};

const GUEST_NAV: NavItem[] = [
  { href: '/',         label: 'Browse',  icon: <SearchIcon /> },
  { href: '/checkout', label: 'Pricing', icon: <PriceIcon /> },
  { href: '/auth',     label: 'Sign In', icon: <LoginIcon /> },
];

// ── Component ──────────────────────────────────────────────────────────────
export default function BottomNav() {
  const { user } = useAuth();
  const pathname  = usePathname();

  const navItems = user ? ROLE_NAV[user.role] : GUEST_NAV;

  const isActive = (href: string) => pathname === href.split('#')[0];

  return (
    // md:hidden — only renders on mobile; desktop uses the top Navbar
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[200] bg-white dark:bg-slate-900 border-t border-surface-border dark:border-slate-700 shadow-[0_-2px_16px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-stretch h-16">
        {navItems.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[48px] no-underline transition-all duration-150 ${
                active
                  ? 'text-brand'
                  : 'text-muted-light dark:text-slate-500 hover:text-navy dark:hover:text-slate-300 active:scale-95'
              }`}
            >
              {/* Icon with active indicator dot */}
              <div className="relative">
                {icon}
                {active && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand" />
                )}
              </div>
              <span className={`text-[10px] font-bold tracking-[0.03em] leading-none ${
                active ? 'text-brand' : 'text-muted-lighter dark:text-slate-500'
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
