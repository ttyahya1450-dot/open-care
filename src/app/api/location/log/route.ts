import { NextResponse } from 'next/server';
import {
  type ShiftCoordinateLog,
  type TravelMode,
  type GMapsDistanceMatrixResponse,
  makeCoordinateLogId,
  parseDistanceMatrixResponse,
} from '@/lib/coordinateLog';

// POST /api/location/log
//
// Accepts a background coordinate ping from an active shift and optionally
// enriches it with a Google Maps Distance Matrix result when the destination
// coordinates are supplied (e.g. at clock-in attempt events).
//
// Body: {
//   workerId:       string
//   shiftId:        string
//   participantId:  string
//   lat:            number
//   lng:            number
//   accuracyMeters: number
//   batteryLevel?:  number           0–100
//   timestamp:      string           ISO — device capture time
//   eventType:      ShiftEventType   'periodic' | 'clock_in_attempt' | 'clock_out' | 'sos'
//   destLat?:       number           participant site — triggers Distance Matrix query
//   destLng?:       number
//   travelMode?:    TravelMode       default: 'driving'
// }
export async function POST(req: Request) {
  let body: {
    workerId?:      string;
    shiftId?:       string;
    participantId?: string;
    lat?:           number;
    lng?:           number;
    accuracyMeters?: number;
    batteryLevel?:  number;
    timestamp?:     string;
    eventType?:     string;
    destLat?:       number;
    destLng?:       number;
    travelMode?:    TravelMode;
  };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const {
    workerId, shiftId, participantId,
    lat, lng, accuracyMeters, batteryLevel,
    timestamp, eventType,
    destLat, destLng, travelMode,
  } = body;

  if (!workerId || !shiftId || !participantId || lat == null || lng == null || !timestamp || !eventType) {
    return NextResponse.json({
      error: 'Missing required fields: workerId, shiftId, participantId, lat, lng, timestamp, eventType',
    }, { status: 400 });
  }

  const log: ShiftCoordinateLog = {
    id:             makeCoordinateLogId(),
    workerId,
    shiftId,
    participantId,
    lat,
    lng,
    accuracyMeters: accuracyMeters ?? 0,
    batteryLevel,
    timestamp,
    loggedAt:       new Date().toISOString(),
    eventType:      eventType as ShiftCoordinateLog['eventType'],
  };

  // Enrich with Distance Matrix when destination supplied and API key is present
  if (destLat != null && destLng != null && process.env.GOOGLE_MAPS_API_KEY) {
    const mode = travelMode ?? 'driving';
    const url  = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins',      `${lat},${lng}`);
    url.searchParams.set('destinations', `${destLat},${destLng}`);
    url.searchParams.set('mode',         mode);
    url.searchParams.set('units',        'metric');
    url.searchParams.set('key',          process.env.GOOGLE_MAPS_API_KEY);

    try {
      const gmResp = await fetch(url.toString());
      if (gmResp.ok) {
        const gmData = await gmResp.json() as GMapsDistanceMatrixResponse;
        log.distanceToSite = parseDistanceMatrixResponse(gmData, lat, lng, destLat, destLng, mode);
      }
    } catch {
      // Distance Matrix unavailable — persist log without enrichment
    }
  }

  // TODO: persist `log` to database — INSERT INTO shift_coordinate_logs
  return NextResponse.json(log, { status: 201 });
}
