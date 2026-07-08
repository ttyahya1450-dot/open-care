// Schema and helpers for live background coordinate logging during active shifts.
// Designed to match Google Maps Distance Matrix API request/response shapes.

export type ShiftEventType = 'periodic' | 'clock_in_attempt' | 'clock_out' | 'sos';
export type TravelMode     = 'driving' | 'walking' | 'transit';

export type DistanceMatrixStatus =
  | 'OK'
  | 'NOT_FOUND'
  | 'ZERO_RESULTS'
  | 'MAX_WAYPOINTS_EXCEEDED'
  | 'INVALID_REQUEST'
  | 'REQUEST_DENIED'
  | 'UNKNOWN_ERROR';

export interface DistanceMatrixResult {
  originLat:       number;
  originLng:       number;
  destLat:         number;
  destLng:         number;
  distanceMeters:  number;
  distanceText:    string;   // e.g. "2.3 km"
  durationSeconds: number;
  durationText:    string;   // e.g. "8 mins"
  travelMode:      TravelMode;
  status:          DistanceMatrixStatus;
  queriedAt:       string;   // ISO
}

export interface ShiftCoordinateLog {
  id:             string;          // cl_{epoch}_{random}
  workerId:       string;
  shiftId:        string;
  participantId:  string;
  lat:            number;
  lng:            number;
  accuracyMeters: number;
  batteryLevel?:  number;          // 0–100, device-reported
  timestamp:      string;          // ISO — when captured on device
  loggedAt:       string;          // ISO — when received by server
  eventType:      ShiftEventType;
  distanceToSite?: DistanceMatrixResult; // enriched when destLat/destLng provided
}

// ── Google Maps Distance Matrix raw API response shapes ────────────────────

export interface GMapsDistanceMatrixElement {
  status:   string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
}

export interface GMapsDistanceMatrixResponse {
  status:                string;
  origin_addresses:      string[];
  destination_addresses: string[];
  rows: Array<{ elements: GMapsDistanceMatrixElement[] }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function makeCoordinateLogId(): string {
  return `cl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function parseDistanceMatrixResponse(
  raw:        GMapsDistanceMatrixResponse,
  originLat:  number,
  originLng:  number,
  destLat:    number,
  destLng:    number,
  travelMode: TravelMode,
): DistanceMatrixResult {
  const element = raw.rows[0]?.elements[0];
  const ok      = raw.status === 'OK' && element?.status === 'OK';

  return {
    originLat,
    originLng,
    destLat,
    destLng,
    distanceMeters:  ok ? element!.distance.value : 0,
    distanceText:    ok ? element!.distance.text  : '—',
    durationSeconds: ok ? element!.duration.value : 0,
    durationText:    ok ? element!.duration.text  : '—',
    travelMode,
    status:          (ok ? 'OK' : (element?.status ?? raw.status)) as DistanceMatrixStatus,
    queriedAt:       new Date().toISOString(),
  };
}
