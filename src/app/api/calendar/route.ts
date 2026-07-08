import { NextResponse } from 'next/server';
import { getStore }     from '@/lib/dataStore';
import type { DSBooking, DSShiftLog } from '@/lib/dataStore';
import {
  type CalendarEvent,
  type BookingStatus,
  type SlotIndex,
  makeCalendarEventId,
  jsDayToAvailIndex,
  SLOT_TIMES,
} from '@/lib/bookingSchema';

// Slot index resolution:
//   Given a clockIn time string ('09:00 AM', '09:00', etc.) derive the slotIndex.
//   Falls back to the booking's recorded slotIndex when not derivable.
function slotIndexFromTime(timeStr: string): SlotIndex {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;

  let hour = parseInt(match[1], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  if (hour < 12) return 0;  // morning
  if (hour < 17) return 1;  // afternoon
  return 2;                  // evening
}

// Build a CalendarEvent from a DSBooking record.
function eventFromBooking(
  b: DSBooking,
  workerName: string,
  participantName: string,
  coordinatorId: string | null,
  slotIndex: SlotIndex,
): CalendarEvent {
  const slot      = SLOT_TIMES[slotIndex];
  const parsedDate = new Date(b.date);
  return {
    id:              makeCalendarEventId(b.id),
    bookingId:       b.id,
    workerId:        b.workerId,
    workerName,
    participantId:   b.participantId,
    participantName,
    coordinatorId,
    date:            b.date,
    dayOfWeek:       jsDayToAvailIndex(parsedDate.getDay()),
    slotIndex,
    startTime:       slot.start,
    endTime:         slot.end,
    hours:           b.hours,
    serviceType:     b.serviceType,
    status:          b.status as BookingStatus,
    hourlyRate:      b.hourlyRate,
    participantTotal: b.participantTotal,
    workerPayout:    b.workerPayout,
    platformFee:     b.platformFee,
    gpsVerified:     false,  // enriched below from shiftLogs
  };
}

// Build a CalendarEvent from a DSShiftLog record (already-completed shift).
function eventFromShiftLog(
  s: DSShiftLog,
  coordinatorId: string | null,
): CalendarEvent {
  const slotIndex  = slotIndexFromTime(s.clockIn);
  const slot       = SLOT_TIMES[slotIndex];
  const parsedDate = new Date(s.date);
  return {
    id:              makeCalendarEventId(s.id),
    bookingId:       s.bookingId,
    workerId:        s.workerId,
    workerName:      s.workerName,
    participantId:   s.participantId,
    participantName: s.participantName,
    coordinatorId,
    date:            s.date,
    dayOfWeek:       jsDayToAvailIndex(parsedDate.getDay()),
    slotIndex,
    startTime:       slot.start,
    endTime:         slot.end,
    hours:           s.durationHrs ?? 0,
    serviceType:     s.serviceType,
    status:          s.status === 'completed' ? 'completed'
                   : s.status === 'active'    ? 'in_progress'
                   : 'pending',
    hourlyRate:      s.hourlyRate,
    participantTotal: Math.round(s.hourlyRate * 1.05  * (s.durationHrs ?? 0) * 100) / 100,
    workerPayout:    Math.round(s.hourlyRate * 0.925 * (s.durationHrs ?? 0) * 100) / 100,
    platformFee:     Math.round(
      (s.hourlyRate * 1.05 - s.hourlyRate * 0.925) * (s.durationHrs ?? 0) * 100,
    ) / 100,
    gpsVerified:     s.gpsVerified,
  };
}

// ── GET /api/calendar ──────────────────────────────────────────────────────────
//
// Returns a merged, deduplicated list of CalendarEvents derived from:
//   1. active_bookings (DSBooking) — scheduled/pending/confirmed future shifts
//   2. shift_logs     (DSShiftLog) — in-progress / completed historical shifts
//
// Shift logs take precedence over bookings (a shift log means the booking was
// executed — the log's GPS/status data is authoritative).
//
// Query params (all optional — omit to return everything):
//   ?workerId=w1           — events for a specific worker
//   ?participantId=p1      — events for a specific participant
//   ?coordinatorId=c1      — all events across participants managed by this coordinator
//   ?from=2026-07-01       — start of date range (inclusive)
//   ?to=2026-07-31         — end of date range (inclusive)
//   ?status=confirmed      — filter by booking status
//   ?view=worker           — convenience: returns events keyed by workerId
//   ?view=participant      — convenience: returns events keyed by participantId
//
// Response (default):
//   { events: CalendarEvent[], total: number, from?: string, to?: string }
//
// Response (?view=worker or ?view=participant):
//   { grouped: Record<string, CalendarEvent[]>, total: number }
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);

  const workerIdFilter      = searchParams.get('workerId');
  const participantIdFilter = searchParams.get('participantId');
  const coordinatorIdFilter = searchParams.get('coordinatorId');
  const statusFilter        = searchParams.get('status');
  const fromDate            = searchParams.get('from');
  const toDate              = searchParams.get('to');
  const view                = searchParams.get('view');

  const store = getStore();

  // Build lookup maps for enrichment
  const workerMap      = new Map(store.workers.map((w) => [w.id, w]));
  const participantMap = new Map(store.participants.map((p) => [p.id, p]));

  // coordinatorId → set of managed participantIds
  let managedParticipantIds: Set<string> | null = null;
  if (coordinatorIdFilter) {
    managedParticipantIds = new Set(
      store.participants
        .filter((p) => p.coordinatorId === coordinatorIdFilter)
        .map((p) => p.id),
    );
  }

  // ── 1. Events from shift logs (authoritative for executed shifts) ────────────
  const shiftLogEventMap = new Map<string, CalendarEvent>(); // keyed by bookingId

  for (const s of store.shiftLogs) {
    if (workerIdFilter      && s.workerId      !== workerIdFilter)      continue;
    if (participantIdFilter && s.participantId !== participantIdFilter) continue;
    if (managedParticipantIds && !managedParticipantIds.has(s.participantId)) continue;
    if (fromDate && s.date < fromDate) continue;
    if (toDate   && s.date > toDate)   continue;

    const participant  = participantMap.get(s.participantId);
    const coordinatorId = participant?.coordinatorId ?? null;
    const event        = eventFromShiftLog(s, coordinatorId);

    if (statusFilter && event.status !== statusFilter) continue;

    shiftLogEventMap.set(s.bookingId, event);
  }

  // ── 2. Events from bookings (scheduled / not yet executed) ────────────────────
  const bookingEvents: CalendarEvent[] = [];

  for (const b of store.bookings) {
    // If a shift log already covers this booking, skip (shift log is authoritative)
    if (shiftLogEventMap.has(b.id)) continue;

    if (workerIdFilter      && b.workerId      !== workerIdFilter)      continue;
    if (participantIdFilter && b.participantId !== participantIdFilter) continue;
    if (statusFilter        && b.status        !== statusFilter)        continue;
    if (fromDate && b.date < fromDate) continue;
    if (toDate   && b.date > toDate)   continue;

    const worker        = workerMap.get(b.workerId);
    const participant   = participantMap.get(b.participantId);
    if (managedParticipantIds && !managedParticipantIds.has(b.participantId)) continue;

    const coordinatorId = participant?.coordinatorId ?? null;

    // Derive slotIndex from booking date: default to morning (0) for historic bookings
    // without an explicit slot. Production bookings carry slotIndex from the POST request.
    const slotIndex: SlotIndex = 0;

    const event = eventFromBooking(
      b,
      worker?.name      ?? b.workerId,
      participant?.name ?? b.participantId,
      coordinatorId,
      slotIndex,
    );
    bookingEvents.push(event);
  }

  // ── 3. Merge + sort ───────────────────────────────────────────────────────────
  const allEvents: CalendarEvent[] = [
    ...Array.from(shiftLogEventMap.values()),
    ...bookingEvents,
  ].sort((a, b) => a.date.localeCompare(b.date) || a.slotIndex - b.slotIndex);

  // ── 4. Apply view grouping ────────────────────────────────────────────────────
  if (view === 'worker') {
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const e of allEvents) {
      (grouped[e.workerId] ??= []).push(e);
    }
    return NextResponse.json({ grouped, total: allEvents.length });
  }

  if (view === 'participant') {
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const e of allEvents) {
      (grouped[e.participantId] ??= []).push(e);
    }
    return NextResponse.json({ grouped, total: allEvents.length });
  }

  return NextResponse.json({
    events: allEvents,
    total:  allEvents.length,
    ...(fromDate ? { from: fromDate } : {}),
    ...(toDate   ? { to:   toDate   } : {}),
  });
}
