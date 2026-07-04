// Legal consent storage — keyed by user.email for cross-session stability
export const LEGAL_TERMS_VERSION = '1.0.0';
const STORE_KEY = 'opencare_legal_v1';

export interface LegalConsent {
  userEmail: string;
  userName: string;
  userRole: string;
  // Individual clause acknowledgements
  agreedToIntermediaryWaiver: boolean;
  agreedToAntiCircumvention: boolean;
  agreedToCancellationPolicy: boolean;
  agreedToMasterTerms: boolean;
  // Electronic signature
  signatureName: string;
  // Provenance
  timestamp: string;           // ISO 8601
  termsVersion: string;
  simulatedIp: string;
  sessionId: string;
}

export type ConsentStore = Record<string, LegalConsent>;

// ── Pre-seeded consents for known demo users (coordinator can verify these) ─
const SEED_CONSENTS: ConsentStore = {
  'alex@demo.opencare': {
    userEmail: 'alex@demo.opencare', userName: 'Alex Morgan', userRole: 'PARTICIPANT',
    agreedToIntermediaryWaiver: true, agreedToAntiCircumvention: true,
    agreedToCancellationPolicy: true, agreedToMasterTerms: true,
    signatureName: 'Alex Morgan',
    timestamp: '2026-06-15T09:14:22.000Z', termsVersion: '1.0.0',
    simulatedIp: '101.182.14.77', sessionId: 'sess_ax9KL2mN',
  },
  'maya@demo.opencare': {
    userEmail: 'maya@demo.opencare', userName: 'Maya Chen', userRole: 'WORKER',
    agreedToIntermediaryWaiver: true, agreedToAntiCircumvention: true,
    agreedToCancellationPolicy: true, agreedToMasterTerms: true,
    signatureName: 'Maya Chen',
    timestamp: '2026-06-12T14:33:07.000Z', termsVersion: '1.0.0',
    simulatedIp: '121.44.207.88', sessionId: 'sess_mc7RT4bQ',
  },
  // Jordan Lee (Participant 2) and Riley Nguyen intentionally left unsigned
  // to demonstrate the "Pending" state in the coordinator compliance panel.
};

// ── Store access ───────────────────────────────────────────────────────────
export function getConsentStore(): ConsentStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as ConsentStore;
  } catch { /* ignore */ }
  // First load — seed known demo consents
  localStorage.setItem(STORE_KEY, JSON.stringify(SEED_CONSENTS));
  return { ...SEED_CONSENTS };
}

export function saveConsent(consent: LegalConsent): void {
  if (typeof window === 'undefined') return;
  try {
    const store = getConsentStore();
    store[consent.userEmail] = consent;
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch { /* quota / private mode */ }
}

export function getUserConsent(email: string): LegalConsent | null {
  return getConsentStore()[email] ?? null;
}

export function hasValidConsent(email: string): boolean {
  const c = getUserConsent(email);
  return (
    !!c &&
    c.termsVersion === LEGAL_TERMS_VERSION &&
    c.agreedToMasterTerms &&
    c.agreedToIntermediaryWaiver &&
    c.agreedToAntiCircumvention &&
    c.agreedToCancellationPolicy
  );
}

// ── Helpers for the compliance panel ──────────────────────────────────────
export function getAllConsents(): LegalConsent[] {
  return Object.values(getConsentStore());
}

export function formatConsentTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-AU', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return iso;
  }
}
