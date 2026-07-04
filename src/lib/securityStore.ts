// Security engine: rate limiting, OTP, PIN, session audit
// All writes are localStorage/sessionStorage — no network required

// ── Rate limiter ───────────────────────────────────────────────────────────
const RATE_KEY = 'opencare_ratelimit_v1';

export interface RateLimitEntry {
  failedAttempts: number;
  lastAttemptAt:  string;        // ISO
  lockedUntil:    string | null; // ISO, null = not locked
  lockLevel:      number;        // escalation index (0-3)
}

// Escalating lock durations (minutes) per level
const LOCK_MINS = [30, 60, 240, 1440];
export const MAX_ATTEMPTS = 5;

function readRateStore(): Record<string, RateLimitEntry> {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, RateLimitEntry>) : {};
  } catch { return {}; }
}

function writeRateStore(store: Record<string, RateLimitEntry>): void {
  try { localStorage.setItem(RATE_KEY, JSON.stringify(store)); } catch { /* quota */ }
}

export function getRateLimitEntry(email: string): RateLimitEntry {
  return readRateStore()[email.toLowerCase()] ?? {
    failedAttempts: 0, lastAttemptAt: '', lockedUntil: null, lockLevel: 0,
  };
}

export function isAccountLocked(email: string): boolean {
  const { lockedUntil } = getRateLimitEntry(email.toLowerCase());
  return !!lockedUntil && new Date(lockedUntil) > new Date();
}

// Returns remaining lock seconds (0 if not locked)
export function lockSecondsRemaining(email: string): number {
  const { lockedUntil } = getRateLimitEntry(email.toLowerCase());
  if (!lockedUntil) return 0;
  return Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000));
}

export function recordFailedAttempt(email: string): RateLimitEntry {
  const key   = email.toLowerCase();
  const store = readRateStore();
  const prev  = store[key] ?? { failedAttempts: 0, lastAttemptAt: '', lockedUntil: null, lockLevel: 0 };

  const newCount = prev.failedAttempts + 1;
  let lockedUntil = prev.lockedUntil;
  let lockLevel   = prev.lockLevel;

  if (newCount >= MAX_ATTEMPTS) {
    const mins = LOCK_MINS[Math.min(lockLevel, LOCK_MINS.length - 1)];
    lockedUntil = new Date(Date.now() + mins * 60_000).toISOString();
    lockLevel   = Math.min(lockLevel + 1, LOCK_MINS.length - 1);
  }

  const updated: RateLimitEntry = {
    failedAttempts: newCount >= MAX_ATTEMPTS ? 0 : newCount,
    lastAttemptAt:  new Date().toISOString(),
    lockedUntil,
    lockLevel,
  };
  store[key] = updated;
  writeRateStore(store);
  return updated;
}

export function recordSuccessfulLogin(email: string): void {
  const key   = email.toLowerCase();
  const store = readRateStore();
  const prev  = store[key] ?? {};
  store[key]  = { ...prev, failedAttempts: 0, lockedUntil: null };
  writeRateStore(store);
}

export function unlockAccount(email: string): void {
  const key   = email.toLowerCase();
  const store = readRateStore();
  store[key]  = { failedAttempts: 0, lastAttemptAt: '', lockedUntil: null, lockLevel: 0 };
  writeRateStore(store);
}

// ── OTP engine ─────────────────────────────────────────────────────────────
const OTP_KEY = 'opencare_otp_v1';

export interface OTPSession {
  code:      string;
  contact:   string;
  expiresAt: string; // ISO
  attempts:  number;
}

export function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function storeOTP(contact: string, code: string): void {
  const session: OTPSession = {
    code, contact, attempts: 0,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
  try { sessionStorage.setItem(OTP_KEY, JSON.stringify(session)); } catch { /* private mode */ }
}

export type OTPResult = 'valid' | 'invalid' | 'expired' | 'max-attempts';

export function validateOTP(input: string): OTPResult {
  try {
    const raw = sessionStorage.getItem(OTP_KEY);
    if (!raw) return 'invalid';
    const s: OTPSession = JSON.parse(raw);
    if (new Date(s.expiresAt) < new Date()) return 'expired';
    if (s.attempts >= 3) return 'max-attempts';
    if (s.code !== input.trim()) {
      s.attempts++;
      sessionStorage.setItem(OTP_KEY, JSON.stringify(s));
      return 'invalid';
    }
    sessionStorage.removeItem(OTP_KEY);
    return 'valid';
  } catch { return 'invalid'; }
}

export function clearOTP(): void {
  try { sessionStorage.removeItem(OTP_KEY); } catch { /* ignore */ }
}

// ── Security audit log ─────────────────────────────────────────────────────
const AUDIT_KEY = 'opencare_security_audit_v1';

export interface AuditEntry {
  ts:       string;  // ISO
  event:    string;
  email:    string;
  role?:    string;
  meta?:    string;
}

export function logSecurityEvent(entry: Omit<AuditEntry, 'ts'>): void {
  try {
    const raw  = localStorage.getItem(AUDIT_KEY);
    const log: AuditEntry[] = raw ? JSON.parse(raw) : [];
    log.unshift({ ...entry, ts: new Date().toISOString() });
    localStorage.setItem(AUDIT_KEY, JSON.stringify(log.slice(0, 50))); // keep last 50
  } catch { /* quota */ }
}

export function getAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Data masking utilities ──────────────────────────────────────────────────
export type MaskType = 'name' | 'email' | 'suburb' | 'currency' | 'phone' | 'id' | 'gps';

export function maskValue(value: string, type: MaskType): string {
  if (!value) return '';
  switch (type) {
    case 'name': {
      const parts = value.trim().split(' ');
      return parts
        .map((p, i) => i === 0 ? p.slice(0, 1) + '●'.repeat(Math.max(1, p.length - 1)) : p.slice(0, 1) + '●●●')
        .join(' ');
    }
    case 'email': {
      const [u, domain] = value.split('@');
      if (!domain) return '●●●●@●●●●';
      return u.slice(0, 2) + '●●●●@' + domain.split('.')[0].slice(0, 1) + '●●●.' + domain.split('.').slice(-1)[0];
    }
    case 'suburb': {
      const parts = value.split(',');
      const area  = parts[0].trim();
      return area.slice(0, 2) + '●●●●' + (parts[1] ? ', ' + parts[1].trim() : '');
    }
    case 'currency': {
      const num = value.replace(/[^0-9]/g, '');
      if (num.length <= 3) return '$●●●';
      return '$' + '●'.repeat(num.length - 3) + ',' + '●●●';
    }
    case 'phone': {
      return '04●● ●●● ' + value.slice(-3);
    }
    case 'id': {
      return value.slice(0, 4) + '-●●●●-●●●●';
    }
    case 'gps': {
      // mask last 4 digits of each coordinate
      return value.replace(/-?\d+\.\d+/g, (m) => m.slice(0, -4) + '●●●●');
    }
    default:
      return '●'.repeat(Math.min(value.length, 10));
  }
}
