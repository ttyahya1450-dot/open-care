import { NextResponse } from 'next/server';
import { haversineDistance, KNOWN_ADDRESSES, GEOFENCE_THRESHOLD_METERS } from '@/lib/geofenceStore';
import { parseDistanceMatrixResponse, type GMapsDistanceMatrixResponse } from '@/lib/coordinateLog';
import {
  makeGeoTrackingId,
  makeShiftLogId,
  type GeoTracking,
  type ShiftLog,
  type DistanceSource,
} from '@/lib/shiftSchema';

// ── Distance validation ────────────────────────────────────────────────────
//
// Priority:
//   1. Google Maps Distance Matrix API (walking mode) — when GOOGLE_MAPS_API_KEY is set
//   2. Haversine straight-line calculation             — structural fallback
//
// The Distance Matrix result uses walking-mode road distance, which is the
// closest proxy to "physically near the address" for NDIS clock-in compliance.
// Haversine gives straight-line metres, used when the API key is absent.

interface DistanceResult {
  distanceMeters: number;
  distanceText:   string;
  source:         DistanceSource;
  matrixRaw:      GMapsDistanceMatrixResponse | null;
}

async function resolveDistance(
  workerLat: number,
  workerLng: number,
  destLat:   number,
  destLng:   number,
): Promise<DistanceResult> {
  // ── Path A: Google Maps Distance Matrix ────────────────────────────────
  if (process.env.GOOGLE_MAPS_API_KEY) {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins',      `${workerLat},${workerLng}`);
    url.searchParams.set('destinations', `${destLat},${destLng}`);
    url.searchParams.set('mode',         'walking');
    url.searchParams.set('units',        'metric');
    url.searchParams.set('key',          process.env.GOOGLE_MAPS_API_KEY);

    try {
      const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        const raw    = await resp.json() as GMapsDistanceMatrixResponse;
        const parsed = parseDistanceMatrixResponse(raw, workerLat, workerLng, destLat, destLng, 'walking');

        if (parsed.status === 'OK') {
          return {
            distanceMeters: parsed.distanceMeters,
            distanceText:   parsed.distanceText,
            source:         'distance_matrix',
            matrixRaw:      raw,
          };
        }
      }
    } catch {
      // Distance Matrix timed out or network failed — fall through to Haversine
    }
  }

  // ── Path B: Haversine fallback ─────────────────────────────────────────
  const metres     = haversineDistance(workerLat, workerLng, destLat, destLng);
  const distText   = metres < 1000
    ? `${metres.toFixed(0)} m`
    : `${(metres / 1000).toFixed(2)} km`;

  return {
    distanceMeters: metres,
    distanceText:   distText,
    source:         'haversine',
    matrixRaw:      null,
  };
}

// ── POST /api/shifts/check-in ──────────────────────────────────────────────
//
// Accepts a clock-in attempt from a support worker's mobile device.
// Resolves the participant's registered service address, validates proximity,
// and returns either a verified_clock_in confirmation or a LOCATION_TOO_FAR error.
//
// Both outcomes write a geo_tracking record so every attempt is auditable.
//
// Body: {
//   shiftId:        string   — shift reference from the booking system
//   workerId:       string
//   participantId:  string   — used to look up the registered service address
//   lat:            number   — worker's current latitude
//   lng:            number   — worker's current longitude
//   accuracyMeters: number   — GPS accuracy reported by device
//   timestamp:      string   — ISO, when the coordinate was captured on-device
//   batteryLevel?:  number   — 0–100
//   deviceId?:      string   — for multi-device de-duplication
// }
//
// Responses:
//   200 verified_clock_in  — worker is within 200 m
//   422 LOCATION_TOO_FAR   — worker is outside 200 m threshold
//   400 validation errors
//   404 participant address not found
export async function POST(req: Request) {
  // ── 1. Parse and validate ────────────────────────────────────────────────
  let body: {
    shiftId?:        string;
    workerId?:       string;
    participantId?:  string;
    lat?:            number;
    lng?:            number;
    accuracyMeters?: number;
    timestamp?:      string;
    batteryLevel?:   number;
    deviceId?:       string;
  };

  try { body = await req.json() as typeof body; }
  catch {
    return NextResponse.json(
      { error: 'INVALID_BODY', message: 'Request body must be valid JSON', retryable: false },
      { status: 400 },
    );
  }

  const { shiftId, workerId, participantId, lat, lng, accuracyMeters, timestamp, batteryLevel, deviceId } = body;

  if (!shiftId || !workerId || !participantId || lat == null || lng == null || !timestamp) {
    return NextResponse.json({
      error:     'MISSING_FIELDS',
      message:   'Required: shiftId, workerId, participantId, lat, lng, timestamp',
      retryable: false,
    }, { status: 400 });
  }

  // ── 2. Resolve participant service address ───────────────────────────────
  // MVP: look up from KNOWN_ADDRESSES seed data.
  // Production: replace with a database query:
  //   SELECT address, lat, lng FROM participant_addresses WHERE participant_id = $1
  const address = KNOWN_ADDRESSES.find((a) => a.participantId === participantId);

  if (!address) {
    return NextResponse.json({
      error:     'ADDRESS_NOT_FOUND',
      message:   `No registered service address found for participant ${participantId}`,
      retryable: false,
    }, { status: 404 });
  }

  const now = new Date().toISOString();

  // ── 3. Validate proximity ────────────────────────────────────────────────
  const distance = await resolveDistance(lat, lng, address.lat, address.lng);
  const passed   = distance.distanceMeters <= GEOFENCE_THRESHOLD_METERS;

  // ── 4. Build geo_tracking record (persisted regardless of outcome) ────────
  const geoId: string = makeGeoTrackingId();

  const geoRecord: GeoTracking = {
    id:                 geoId,
    shiftId,
    workerId,
    participantId,
    lat,
    lng,
    accuracyMeters:     accuracyMeters ?? 0,
    batteryLevel:       batteryLevel   ?? null,
    deviceId:           deviceId       ?? null,
    eventType:          'clock_in_attempt',
    deviceTimestamp:    timestamp,
    serverTimestamp:    now,
    destLat:            address.lat,
    destLng:            address.lng,
    distanceMeters:     distance.distanceMeters,
    distanceSource:     distance.source,
    distanceMatrixRaw:  distance.matrixRaw,
    withinThreshold:    passed,
    createdAt:          now,
  };

  // TODO: INSERT INTO geo_tracking — replace stub below with your DB client call
  // e.g. await db.insert(geoTracking).values(geoRecord);
  void geoRecord;

  // ── 5a. Location validation failed ───────────────────────────────────────
  if (!passed) {
    return NextResponse.json({
      error:          'LOCATION_TOO_FAR',
      message:        `Worker is ${distance.distanceText} from the participant's registered address. Must be within ${GEOFENCE_THRESHOLD_METERS} m to clock in.`,
      retryable:      true,
      distanceMeters: distance.distanceMeters,
      distanceText:   distance.distanceText,
      thresholdMeters: GEOFENCE_THRESHOLD_METERS,
      verificationMethod: distance.source,
      participantAddress: address.address,
      geoTrackingId:  geoId,
    }, { status: 422 });
  }

  // ── 5b. Location validated — write shift_log ─────────────────────────────
  const shiftLogId: string = makeShiftLogId();

  const shiftLog: ShiftLog = {
    id:             shiftLogId,
    shiftId,
    workerId,
    participantId,
    bookingId:      null,    // populate from booking system in production
    scheduledStart: now,     // placeholder — replace with actual scheduled time from DB
    scheduledEnd:   now,     // placeholder — replace with actual scheduled time from DB
    clockInAt:      now,
    clockOutAt:     null,
    clockInStatus:  'verified_clock_in',
    clockOutStatus: 'pending',
    clockInGeoId:   geoId,
    clockOutGeoId:  null,
    notes:          null,
    createdAt:      now,
    updatedAt:      now,
  };

  // TODO: UPSERT INTO shift_logs — replace stub below with your DB client call
  // On conflict (shift_id): update clock_in_at, clock_in_status, clock_in_geo_id, updated_at
  // e.g. await db.insert(shiftLogs).values(shiftLog).onConflictDoUpdate({ target: shiftLogs.shiftId, set: { ... } });
  void shiftLog;

  return NextResponse.json({
    status:             'verified_clock_in',
    shiftLogId,
    geoTrackingId:      geoId,
    clockedInAt:        now,
    distanceMeters:     distance.distanceMeters,
    distanceText:       distance.distanceText,
    thresholdMeters:    GEOFENCE_THRESHOLD_METERS,
    verificationMethod: distance.source,
    participantAddress: address.address,
  });
}
