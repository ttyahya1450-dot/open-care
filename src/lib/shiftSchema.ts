// Production database schema for shift lifecycle tracking and GPS verification.
//
// TypeScript interfaces mirror the SQL columns 1-to-1 — use these as your
// Drizzle / Prisma / Supabase model types.
//
// SHIFT_SCHEMA_DDL is the full PostgreSQL migration. Run it once against your
// database before enabling the /api/shifts/* routes.

// ── Enumerated column values ───────────────────────────────────────────────

export type ClockInStatus  = 'pending' | 'verified_clock_in'  | 'manual_override' | 'disputed';
export type ClockOutStatus = 'pending' | 'verified_clock_out' | 'manual_override' | 'disputed';
export type GeoEventType   = 'periodic' | 'clock_in_attempt'  | 'clock_out'       | 'sos';
export type DistanceSource = 'distance_matrix' | 'haversine';

// ── shift_logs ─────────────────────────────────────────────────────────────
// One row per shift. Updated as the shift moves from scheduled → clocked-in → clocked-out.
// clock_in_geo_id / clock_out_geo_id are FK pointers into geo_tracking for the
// specific coordinate events that triggered the status change.

export interface ShiftLog {
  id:              string;        // sl_{epoch}_{random}
  shiftId:         string;        // booking / scheduling system reference
  workerId:        string;
  participantId:   string;
  bookingId:       string | null;
  scheduledStart:  string;        // ISO
  scheduledEnd:    string;        // ISO
  clockInAt:       string | null; // ISO — set on verified_clock_in
  clockOutAt:      string | null; // ISO — set on verified_clock_out
  clockInStatus:   ClockInStatus;
  clockOutStatus:  ClockOutStatus;
  clockInGeoId:    string | null; // FK → geo_tracking.id
  clockOutGeoId:   string | null; // FK → geo_tracking.id
  notes:           string | null;
  createdAt:       string;        // ISO
  updatedAt:       string;        // ISO
}

// ── geo_tracking ───────────────────────────────────────────────────────────
// One row per coordinate event. A shift accumulates many rows:
// periodic pings during the shift + the specific clock_in_attempt / clock_out events.
// distanceMatrixRaw stores the full API response JSONB for audit and replay.

export interface GeoTracking {
  id:                 string;             // gt_{epoch}_{random}
  shiftId:            string;             // FK → shift_logs.shift_id
  workerId:           string;
  participantId:      string;
  lat:                number;
  lng:                number;
  accuracyMeters:     number;
  batteryLevel:       number | null;      // 0–100
  deviceId:           string | null;
  eventType:          GeoEventType;
  deviceTimestamp:    string;             // ISO — when captured on device
  serverTimestamp:    string;             // ISO — when received by server
  destLat:            number | null;      // participant site coords at time of event
  destLng:            number | null;
  distanceMeters:     number | null;      // result of proximity validation
  distanceSource:     DistanceSource | null;
  distanceMatrixRaw:  unknown | null;     // full Distance Matrix API response (JSONB)
  withinThreshold:    boolean | null;     // distanceMeters <= GEOFENCE_THRESHOLD_METERS
  createdAt:          string;             // ISO
}

// ── ID generators ──────────────────────────────────────────────────────────

export function makeShiftLogId(): string {
  return `sl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function makeGeoTrackingId(): string {
  return `gt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── SQL DDL migration ──────────────────────────────────────────────────────
// PostgreSQL / Supabase compatible. Run once as a migration before go-live.
// geo_tracking is created first because shift_logs.clock_in_geo_id references it.

export const SHIFT_SCHEMA_DDL = `
-- ── geo_tracking ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS geo_tracking (
  id                  TEXT         PRIMARY KEY,
  shift_id            TEXT         NOT NULL,
  worker_id           TEXT         NOT NULL,
  participant_id      TEXT         NOT NULL,
  lat                 FLOAT8       NOT NULL,
  lng                 FLOAT8       NOT NULL,
  accuracy_meters     FLOAT8,
  battery_level       SMALLINT     CHECK (battery_level BETWEEN 0 AND 100),
  device_id           TEXT,
  event_type          TEXT         NOT NULL
                        CHECK (event_type IN (
                          'periodic', 'clock_in_attempt', 'clock_out', 'sos'
                        )),
  device_timestamp    TIMESTAMPTZ  NOT NULL,
  server_timestamp    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  dest_lat            FLOAT8,
  dest_lng            FLOAT8,
  distance_meters     FLOAT8,
  distance_source     TEXT
                        CHECK (distance_source IN ('distance_matrix', 'haversine')),
  distance_matrix_raw JSONB,
  within_threshold    BOOLEAN,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_tracking_shift_id   ON geo_tracking (shift_id);
CREATE INDEX IF NOT EXISTS idx_geo_tracking_worker_id  ON geo_tracking (worker_id);
CREATE INDEX IF NOT EXISTS idx_geo_tracking_event_type ON geo_tracking (event_type);
CREATE INDEX IF NOT EXISTS idx_geo_tracking_device_ts  ON geo_tracking (device_timestamp DESC);

-- ── shift_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_logs (
  id                TEXT         PRIMARY KEY,
  shift_id          TEXT         NOT NULL UNIQUE,
  worker_id         TEXT         NOT NULL,
  participant_id    TEXT         NOT NULL,
  booking_id        TEXT,
  scheduled_start   TIMESTAMPTZ  NOT NULL,
  scheduled_end     TIMESTAMPTZ  NOT NULL,
  clock_in_at       TIMESTAMPTZ,
  clock_out_at      TIMESTAMPTZ,
  clock_in_status   TEXT         NOT NULL DEFAULT 'pending'
                      CHECK (clock_in_status IN (
                        'pending', 'verified_clock_in', 'manual_override', 'disputed'
                      )),
  clock_out_status  TEXT         NOT NULL DEFAULT 'pending'
                      CHECK (clock_out_status IN (
                        'pending', 'verified_clock_out', 'manual_override', 'disputed'
                      )),
  clock_in_geo_id   TEXT         REFERENCES geo_tracking (id),
  clock_out_geo_id  TEXT         REFERENCES geo_tracking (id),
  notes             TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_logs_worker_id       ON shift_logs (worker_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_participant_id   ON shift_logs (participant_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_clock_in_status  ON shift_logs (clock_in_status);
CREATE INDEX IF NOT EXISTS idx_shift_logs_scheduled_start  ON shift_logs (scheduled_start DESC);

-- Trigger: keep shift_logs.updated_at current on every row update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_shift_logs_updated_at
  BEFORE UPDATE ON shift_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`;
