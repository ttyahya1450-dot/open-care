// Production data schemas for marketplace listings, active bookings, and calendar events.
//
// TypeScript interfaces mirror SQL columns 1-to-1 for Drizzle / Prisma / Supabase.
// BOOKING_SCHEMA_DDL is a full PostgreSQL migration — run once before enabling
// the /api/bookings/* and /api/calendar/* routes.
//
// Availability encoding:
//   Worker.availability is boolean[7][3]  (0=Mon … 6=Sun, 0=morning 1=afternoon 2=evening)
//   SLOT_TIMES maps slotIndex → wall-clock start/end times (used by the calendar layer)

// ── Slot time map ──────────────────────────────────────────────────────────────

export const SLOT_TIMES = [
  { label: 'Morning',   start: '08:00', end: '12:00' },
  { label: 'Afternoon', start: '12:00', end: '17:00' },
  { label: 'Evening',   start: '17:00', end: '21:00' },
] as const;

export type SlotIndex = 0 | 1 | 2;

// Convert a JS Date day number (0=Sun) to our availability day index (0=Mon).
export function jsDayToAvailIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

// ── Booking status ─────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

// ── marketplace_listings ───────────────────────────────────────────────────────
// Derived from the workers table. Represents the public-facing listing a
// participant or coordinator sees when browsing the marketplace.
// Production: materialise as a view or dedicated table for full-text search.

export interface MarketplaceListing {
  id: string;              // ml_{workerId}  (deterministic for idempotent upserts)
  workerId: string;
  workerName: string;
  workerInitials: string;
  category: string;        // 'support' | 'cleaner' | 'gardener' | 'ot'
  suburb: string;
  bio: string;
  hourlyRate: number;      // AUD base rate (exclusive of participant markup)
  serviceTypes: string[];  // ['Personal Care', 'Community Access', ...]
  availability: boolean[][];  // [7][3] — mirrors DSWorker.availability
  strengths: string[];
  rating: number;
  shiftsCompleted: number;
  yearsExp: number;
  backgroundCheckVerified: boolean;
  active: boolean;
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
}

// ── active_bookings ────────────────────────────────────────────────────────────
// One row per booking. Extends DSBooking with scheduling and payment metadata.
// Pending bookings lock the worker's calendar slot; cancelled bookings release it.

export interface ActiveBooking {
  id: string;                    // bk_{epoch}_{random4}
  participantId: string;
  workerId: string;
  coordinatorId: string | null;  // set when a coordinator initiates the booking
  date: string;                  // 'YYYY-MM-DD'
  startTime: string;             // 'HH:MM'
  endTime: string;               // 'HH:MM'  (derived: startTime + hours)
  hours: number;
  slotIndex: SlotIndex;          // 0=morning 1=afternoon 2=evening
  hourlyRate: number;
  serviceType: string;
  status: BookingStatus;
  participantTotal: number;      // hourlyRate × 1.05 × hours
  workerPayout: number;          // hourlyRate × 0.925 × hours
  platformFee: number;           // participantTotal − workerPayout
  paymentIntentId: string | null;
  notes: string | null;
  createdAt: string;             // ISO
  updatedAt: string;             // ISO
}

// ── calendar_events ────────────────────────────────────────────────────────────
// Derived from active_bookings — one event per booking.
// Production: either materialise as a table (for full calendar query efficiency)
// or compute on-the-fly from bookings (current MVP approach).

export interface CalendarEvent {
  id: string;              // ce_{bookingId}
  bookingId: string;
  workerId: string;
  workerName: string;
  participantId: string;
  participantName: string;
  coordinatorId: string | null;
  date: string;            // 'YYYY-MM-DD'
  dayOfWeek: number;       // 0=Mon … 6=Sun
  slotIndex: SlotIndex;
  startTime: string;       // 'HH:MM'
  endTime: string;         // 'HH:MM'
  hours: number;
  serviceType: string;
  status: BookingStatus;
  hourlyRate: number;
  participantTotal: number;
  workerPayout: number;
  platformFee: number;
  gpsVerified: boolean;    // populated once the shift_log is written
}

// ── ID generators ──────────────────────────────────────────────────────────────

export function makeBookingId(): string {
  return `bk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makeListingId(workerId: string): string {
  return `ml_${workerId}`;
}

export function makeCalendarEventId(bookingId: string): string {
  return `ce_${bookingId}`;
}

// ── Fee calculation (mirrors CLAUDE.md rules) ─────────────────────────────────

export interface BookingFees {
  participantTotal: number;  // AUD
  workerPayout: number;      // AUD
  platformFee: number;       // AUD
}

export function computeBookingFees(hourlyRate: number, hours: number): BookingFees {
  const participantTotal = Math.round(hourlyRate * 1.05  * hours * 100) / 100;
  const workerPayout     = Math.round(hourlyRate * 0.925 * hours * 100) / 100;
  const platformFee      = Math.round((participantTotal - workerPayout) * 100) / 100;
  return { participantTotal, workerPayout, platformFee };
}

// ── Request / query shapes ─────────────────────────────────────────────────────

export interface BookingCreateRequest {
  participantId: string;
  workerId: string;
  date: string;            // 'YYYY-MM-DD'
  slotIndex: SlotIndex;    // 0=morning 1=afternoon 2=evening
  hours: number;           // > 0
  serviceType: string;
  notes?: string;
  coordinatorId?: string;
}

export interface ListingQueryParams {
  category?: string;
  suburb?: string;
  maxRate?: number;
  serviceType?: string;
  date?: string;           // filter to workers available on this day-of-week
}

// ── SQL DDL migration ──────────────────────────────────────────────────────────
// PostgreSQL / Supabase compatible. Run once as a migration before go-live.

export const BOOKING_SCHEMA_DDL = `
-- ── marketplace_listings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id                       TEXT         PRIMARY KEY,
  worker_id                TEXT         NOT NULL UNIQUE,
  worker_name              TEXT         NOT NULL,
  worker_initials          TEXT         NOT NULL,
  category                 TEXT         NOT NULL
                             CHECK (category IN ('support', 'cleaner', 'gardener', 'ot')),
  suburb                   TEXT         NOT NULL,
  bio                      TEXT,
  hourly_rate              NUMERIC(8,2) NOT NULL CHECK (hourly_rate > 0),
  service_types            TEXT[]       NOT NULL DEFAULT '{}',
  availability             BOOLEAN[][]  NOT NULL,
  strengths                TEXT[]       NOT NULL DEFAULT '{}',
  rating                   NUMERIC(3,1) CHECK (rating BETWEEN 0 AND 5),
  shifts_completed         INTEGER      NOT NULL DEFAULT 0,
  years_exp                INTEGER      NOT NULL DEFAULT 0,
  background_check_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  active                   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_category ON marketplace_listings (category);
CREATE INDEX IF NOT EXISTS idx_listings_suburb   ON marketplace_listings (suburb);
CREATE INDEX IF NOT EXISTS idx_listings_rate     ON marketplace_listings (hourly_rate);
CREATE INDEX IF NOT EXISTS idx_listings_active   ON marketplace_listings (active) WHERE active = TRUE;

-- ── active_bookings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS active_bookings (
  id                  TEXT         PRIMARY KEY,
  participant_id      TEXT         NOT NULL,
  worker_id           TEXT         NOT NULL,
  coordinator_id      TEXT,
  date                DATE         NOT NULL,
  start_time          TIME         NOT NULL,
  end_time            TIME         NOT NULL,
  hours               NUMERIC(4,2) NOT NULL CHECK (hours > 0),
  slot_index          SMALLINT     NOT NULL CHECK (slot_index IN (0, 1, 2)),
  hourly_rate         NUMERIC(8,2) NOT NULL,
  service_type        TEXT         NOT NULL,
  status              TEXT         NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  participant_total   NUMERIC(10,2) NOT NULL,
  worker_payout       NUMERIC(10,2) NOT NULL,
  platform_fee        NUMERIC(10,2) NOT NULL,
  payment_intent_id   TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Prevent double-booking: one active booking per worker per date per slot
  CONSTRAINT uq_worker_slot UNIQUE (worker_id, date, slot_index)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_bookings_participant   ON active_bookings (participant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker        ON active_bookings (worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_coordinator   ON active_bookings (coordinator_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date          ON active_bookings (date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status        ON active_bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_worker_date   ON active_bookings (worker_id, date);

-- ── calendar_events view ────────────────────────────────────────────────────────
-- Derived from active_bookings joined to workers and participants tables.
-- Replace the two sub-selects with your actual table references in production.
CREATE OR REPLACE VIEW calendar_events AS
SELECT
  'ce_' || b.id                       AS id,
  b.id                                AS booking_id,
  b.worker_id,
  b.participant_id,
  b.coordinator_id,
  b.date,
  EXTRACT(DOW FROM b.date)::INT       AS js_day_of_week,
  ((EXTRACT(DOW FROM b.date)::INT + 6) % 7)::INT AS day_of_week,
  b.slot_index,
  b.start_time,
  b.end_time,
  b.hours,
  b.service_type,
  b.status,
  b.hourly_rate,
  b.participant_total,
  b.worker_payout,
  b.platform_fee
FROM active_bookings b
WHERE b.status NOT IN ('cancelled');

-- ── Triggers: keep updated_at current ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON active_bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`;
