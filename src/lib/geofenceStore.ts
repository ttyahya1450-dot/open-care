// GPS geofencing engine — Haversine distance calculation + audit trail
// Uses browser's navigator.geolocation API for real coordinates
// Stores check history locally in opencare_geofence_v1

const GEOFENCE_KEY = 'opencare_geofence_v1';
export const GEOFENCE_THRESHOLD_METERS = 200;

// ── Known participant address coordinates ──────────────────────────────────
// Mirrors GPS seed data already present in DSShiftLog entries
export interface KnownAddress {
  participantId:   string;
  participantName: string;
  address:         string;
  lat:             number;
  lng:             number;
}

export const KNOWN_ADDRESSES: KnownAddress[] = [
  {
    participantId:   'p1',
    participantName: 'Alex Morgan',
    address:         '14 Harbour St, Northbridge NSW 2063',
    lat:             -33.8199,
    lng:             151.2106,
  },
  {
    participantId:   'p2',
    participantName: 'Jordan Lee',
    address:         '8 Crown St, Surry Hills NSW 2010',
    lat:             -33.8875,
    lng:             151.2094,
  },
  {
    participantId:   'p3',
    participantName: 'Riley Nguyen',
    address:         '22 Macquarie St, Parramatta NSW 2150',
    lat:             -33.8136,
    lng:             150.9993,
  },
];

// ── Types ──────────────────────────────────────────────────────────────────
export interface GeofenceCheck {
  id:                  string;         // 'gf_' + Date.now()
  checkedAt:           string;         // ISO
  workerLat:           number;
  workerLng:           number;
  targetParticipantId: string;
  targetLat:           number;
  targetLng:           number;
  distanceMeters:      number;         // Haversine result, 1 decimal precision
  thresholdMeters:     200;            // literal — always 200m per NDIS clock-in policy
  passed:              boolean;
  method:              'browser' | 'simulated';
}

export interface GeofenceStore {
  checks: GeofenceCheck[];  // newest first, capped at 50
}

// ── Haversine distance (metres) ────────────────────────────────────────────
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R     = 6_371_000; // Earth radius in metres
  const toRad = (d: number) => d * (Math.PI / 180);
  const φ1    = toRad(lat1);
  const φ2    = toRad(lat2);
  const Δφ    = toRad(lat2 - lat1);
  const Δλ    = toRad(lng2 - lng1);
  const a     =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // 1 decimal metre precision
}

// ── Persistence ────────────────────────────────────────────────────────────
export function getGeofenceStore(): GeofenceStore {
  try {
    const raw = localStorage.getItem(GEOFENCE_KEY);
    return raw ? (JSON.parse(raw) as GeofenceStore) : { checks: [] };
  } catch { return { checks: [] }; }
}

export function saveGeofenceStore(store: GeofenceStore): void {
  try { localStorage.setItem(GEOFENCE_KEY, JSON.stringify(store)); } catch { /* quota */ }
}

// ── Run a geofence check ───────────────────────────────────────────────────
export function runGeofenceCheck(
  workerLat:     number,
  workerLng:     number,
  participantId: string,
  method:        'browser' | 'simulated',
): GeofenceCheck {
  const target = KNOWN_ADDRESSES.find((a) => a.participantId === participantId);
  if (!target) throw new Error(`Unknown participantId: ${participantId}`);

  const distanceMeters = haversineDistance(
    workerLat, workerLng,
    target.lat, target.lng,
  );

  const check: GeofenceCheck = {
    id:                  `gf_${Date.now()}`,
    checkedAt:           new Date().toISOString(),
    workerLat,
    workerLng,
    targetParticipantId: participantId,
    targetLat:           target.lat,
    targetLng:           target.lng,
    distanceMeters,
    thresholdMeters:     200,
    passed:              distanceMeters <= GEOFENCE_THRESHOLD_METERS,
    method,
  };

  const store = getGeofenceStore();
  store.checks.unshift(check);
  if (store.checks.length > 50) store.checks = store.checks.slice(0, 50);
  saveGeofenceStore(store);

  return check;
}
