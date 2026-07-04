// Twilio communication gateway — simulated SMS delivery pipeline
// Stores message log locally; no real Twilio API calls
// SID format mirrors real Twilio: 'SM' + 32 lowercase hex chars

const TWILIO_KEY = 'opencare_twilio_v1';

export type TwilioMessageType    = 'otp' | 'arrival_alert' | 'booking_confirmation';
export type TwilioDeliveryStatus = 'queued' | 'sending' | 'delivered' | 'failed';

export interface TwilioMessage {
  id:          string;   // 'tw_' + Date.now()
  sid:         string;   // 'SM' + 32 lowercase hex chars
  type:        TwilioMessageType;
  toNumber:    string;   // always stored pre-masked: '04●● ●●● XXX'
  body:        string;
  status:      TwilioDeliveryStatus;
  createdAt:   string;   // ISO
  deliveredAt: string | null;
  otpCode?:    string;   // present only for type === 'otp'
}

export interface TwilioStore {
  messages: TwilioMessage[];
}

// ── ID generation ──────────────────────────────────────────────────────────
export function generateTwilioSID(): string {
  const hex = Array.from(
    { length: 32 },
    () => Math.floor(Math.random() * 16).toString(16),
  ).join('');
  return `SM${hex}`;
}

// ── Persistence ────────────────────────────────────────────────────────────
export function getTwilioStore(): TwilioStore {
  try {
    const raw = localStorage.getItem(TWILIO_KEY);
    return raw ? (JSON.parse(raw) as TwilioStore) : { messages: [] };
  } catch { return { messages: [] }; }
}

export function saveTwilioStore(store: TwilioStore): void {
  try { localStorage.setItem(TWILIO_KEY, JSON.stringify(store)); } catch { /* quota */ }
}

// ── Mutations ──────────────────────────────────────────────────────────────
export function queueMessage(
  msg: Omit<TwilioMessage, 'id' | 'sid' | 'createdAt' | 'deliveredAt'>,
): TwilioMessage {
  const full: TwilioMessage = {
    ...msg,
    id:          `tw_${Date.now()}`,
    sid:         generateTwilioSID(),
    createdAt:   new Date().toISOString(),
    deliveredAt: null,
  };
  const store = getTwilioStore();
  store.messages.unshift(full);        // newest first
  // Cap at 100 messages to keep localStorage tidy
  if (store.messages.length > 100) store.messages = store.messages.slice(0, 100);
  saveTwilioStore(store);
  return full;
}

export function updateMessageStatus(
  id: string,
  status: TwilioDeliveryStatus,
  deliveredAt?: string,
): void {
  const store = getTwilioStore();
  const idx   = store.messages.findIndex((m) => m.id === id);
  if (idx === -1) return;
  store.messages[idx] = {
    ...store.messages[idx],
    status,
    deliveredAt: deliveredAt ?? store.messages[idx].deliveredAt,
  };
  saveTwilioStore(store);
}
