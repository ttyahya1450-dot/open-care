import { NextResponse } from 'next/server';
import {
  type TravelMode,
  type GMapsDistanceMatrixResponse,
  parseDistanceMatrixResponse,
} from '@/lib/coordinateLog';

// GET /api/location/distance
//
// Direct Distance Matrix query between two coordinate pairs.
// Useful for clock-in proximity checks and travel-time estimates
// displayed to coordinators on the dashboard.
//
// Query params:
//   originLat  number   required
//   originLng  number   required
//   destLat    number   required
//   destLng    number   required
//   mode       string   optional — 'driving' | 'walking' | 'transit'  (default: driving)
export async function GET(req: Request) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json({ error: 'Google Maps API not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const originLat = parseFloat(searchParams.get('originLat') ?? '');
  const originLng = parseFloat(searchParams.get('originLng') ?? '');
  const destLat   = parseFloat(searchParams.get('destLat')   ?? '');
  const destLng   = parseFloat(searchParams.get('destLng')   ?? '');
  const mode      = (searchParams.get('mode') ?? 'driving') as TravelMode;

  if ([originLat, originLng, destLat, destLng].some(isNaN)) {
    return NextResponse.json({
      error: 'Missing or invalid params: originLat, originLng, destLat, destLng must be numbers',
    }, { status: 400 });
  }

  const validModes: TravelMode[] = ['driving', 'walking', 'transit'];
  if (!validModes.includes(mode)) {
    return NextResponse.json({
      error: `mode must be one of: ${validModes.join(', ')}`,
    }, { status: 400 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins',      `${originLat},${originLng}`);
  url.searchParams.set('destinations', `${destLat},${destLng}`);
  url.searchParams.set('mode',         mode);
  url.searchParams.set('units',        'metric');
  url.searchParams.set('key',          process.env.GOOGLE_MAPS_API_KEY);

  let gmData: GMapsDistanceMatrixResponse;
  try {
    const gmResp = await fetch(url.toString());
    if (!gmResp.ok) throw new Error(`HTTP ${gmResp.status}`);
    gmData = await gmResp.json() as GMapsDistanceMatrixResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return NextResponse.json({ error: `Distance Matrix request failed: ${message}` }, { status: 502 });
  }

  const result = parseDistanceMatrixResponse(gmData, originLat, originLng, destLat, destLng, mode);
  return NextResponse.json(result);
}
