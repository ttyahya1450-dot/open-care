// Stripe Connect ledger — simulated marketplace transaction splits
// All data stored locally in opencare_stripe_v1 (no real Stripe API calls)
// APP 11 compliance: participant/worker PII only accessed via DataMaskProvider in UI layer

import { getStore } from './dataStore';

const STRIPE_KEY = 'opencare_stripe_v1';

export type StripeSettlementStatus = 'pending' | 'in_transit' | 'paid' | 'failed';

export interface StripeTransaction {
  id:               string;
  bookingId:        string;
  participantId:    string;
  participantName:  string;   // APP 11 — masked in UI via MaskedText
  workerId:         string;
  workerName:       string;   // APP 11 — masked in UI via MaskedText
  serviceType:      string;
  date:             string;
  grossAmount:      number;   // DSBooking.participantTotal  (hourlyRate × 1.05)
  workerSplit:      number;   // DSBooking.workerPayout      (hourlyRate × 0.925, ~87.5%)
  platformSplit:    number;   // DSBooking.platformFee       (12.5% of hourlyRate)
  settlementStatus: StripeSettlementStatus;
  stripeTransferId: string;   // 'tr_' + 20 hex
  stripeChargeId:   string;   // 'ch_' + 20 hex
  createdAt:        string;   // ISO
  settledAt:        string | null;
}

export interface StripeStore {
  transactions:           StripeTransaction[];
  platformRunningBalance: number;
  lastSeededAt:           string;
}

// ── ID generation ──────────────────────────────────────────────────────────
export function generateStripeId(prefix: 'stx' | 'tr' | 'ch'): string {
  const hex = Array.from(
    { length: 20 },
    () => Math.floor(Math.random() * 16).toString(16),
  ).join('');
  return `${prefix}_${hex}`;
}

// ── Persistence ────────────────────────────────────────────────────────────
function readRaw(): StripeStore | null {
  try {
    const raw = localStorage.getItem(STRIPE_KEY);
    return raw ? (JSON.parse(raw) as StripeStore) : null;
  } catch { return null; }
}

export function saveStripeStore(store: StripeStore): void {
  try { localStorage.setItem(STRIPE_KEY, JSON.stringify(store)); } catch { /* quota */ }
}

// ── Platform balance helper ────────────────────────────────────────────────
function computePlatformBalance(txns: StripeTransaction[]): number {
  return txns
    .filter((t) => t.settlementStatus === 'paid')
    .reduce((sum, t) => sum + t.platformSplit, 0);
}

// ── Seed from DataStore bookings ───────────────────────────────────────────
const STATUS_MAP: Record<string, StripeSettlementStatus> = {
  completed: 'paid',
  confirmed: 'in_transit',
  pending:   'pending',
  cancelled: 'failed',
};

export function seedStripeFromBookings(): StripeStore {
  const ds = getStore();

  const transactions: StripeTransaction[] = ds.bookings.map((b) => {
    const participant = ds.participants.find((p) => p.id === b.participantId);
    const worker      = ds.workers.find((w) => w.id === b.workerId);
    const status      = STATUS_MAP[b.status] ?? 'pending';
    const isPaid      = status === 'paid';

    return {
      id:               generateStripeId('stx'),
      bookingId:        b.id,
      participantId:    b.participantId,
      participantName:  participant?.name ?? 'Unknown Participant',
      workerId:         b.workerId,
      workerName:       worker?.name ?? 'Unknown Worker',
      serviceType:      b.serviceType,
      date:             b.date,
      grossAmount:      b.participantTotal,
      workerSplit:      b.workerPayout,
      platformSplit:    b.platformFee,
      settlementStatus: status,
      stripeTransferId: generateStripeId('tr'),
      stripeChargeId:   generateStripeId('ch'),
      createdAt:        new Date().toISOString(),
      settledAt:        isPaid ? b.date + 'T06:00:00.000Z' : null,
    };
  });

  const store: StripeStore = {
    transactions,
    platformRunningBalance: computePlatformBalance(transactions),
    lastSeededAt:           new Date().toISOString(),
  };
  saveStripeStore(store);
  return store;
}

// ── Public read ────────────────────────────────────────────────────────────
export function getStripeStore(): StripeStore {
  return readRaw() ?? seedStripeFromBookings();
}

// ── Mutations ──────────────────────────────────────────────────────────────
export function settleTransaction(id: string): StripeStore {
  const store = getStripeStore();
  const txns  = store.transactions.map((t) =>
    t.id === id
      ? { ...t, settlementStatus: 'paid' as const, settledAt: new Date().toISOString() }
      : t,
  );
  const updated: StripeStore = {
    ...store,
    transactions:           txns,
    platformRunningBalance: computePlatformBalance(txns),
  };
  saveStripeStore(updated);
  return updated;
}

export function settleAllPending(): StripeStore {
  const store = getStripeStore();
  const now   = new Date().toISOString();
  const txns  = store.transactions.map((t) =>
    t.settlementStatus !== 'paid' && t.settlementStatus !== 'failed'
      ? { ...t, settlementStatus: 'paid' as const, settledAt: now }
      : t,
  );
  const updated: StripeStore = {
    ...store,
    transactions:           txns,
    platformRunningBalance: computePlatformBalance(txns),
  };
  saveStripeStore(updated);
  return updated;
}
