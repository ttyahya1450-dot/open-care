import { NextResponse }     from 'next/server';
import { getStore }          from '@/lib/dataStore';
import {
  type ActiveBooking,
  type BookingCreateRequest,
  type MarketplaceListing,
  type ListingQueryParams,
  type SlotIndex,
  makeBookingId,
  makeListingId,
  computeBookingFees,
  jsDayToAvailIndex,
  SLOT_TIMES,
  BOOKING_SCHEMA_DDL,
} from '@/lib/bookingSchema';

// ── GET /api/bookings ──────────────────────────────────────────────────────────
//
// Multipurpose read endpoint that serves two query modes:
//
// Mode A — Booking list (default)
//   ?participantId=p1   filter by participant
//   ?workerId=w1        filter by worker
//   ?coordinatorId=c1   filter by coordinator (returns all participants they manage)
//   ?status=pending     filter by status
//   ?date=2026-07-10    filter to bookings on this exact date
//
// Mode B — Marketplace listings
//   ?listings=true      returns MarketplaceListing[] derived from workers
//   ?category=support   filter by worker category
//   ?suburb=Northbridge filter by suburb
//   ?maxRate=50         filter by max hourly rate
//   ?serviceType=...    filter by service type supported
//   ?date=2026-07-10    filter to workers available on this day-of-week
//
// Mode C — DDL schema
//   ?ddl=true           returns the PostgreSQL DDL migration for ops/admin
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);

  // ── Mode C: DDL export ───────────────────────────────────────────────────────
  if (searchParams.get('ddl') === 'true') {
    return NextResponse.json({ ddl: BOOKING_SCHEMA_DDL });
  }

  const store = getStore();

  // ── Mode B: Marketplace listings ─────────────────────────────────────────────
  if (searchParams.get('listings') === 'true') {
    const params: ListingQueryParams = {
      category:    searchParams.get('category')    ?? undefined,
      suburb:      searchParams.get('suburb')       ?? undefined,
      maxRate:     searchParams.get('maxRate')      ? Number(searchParams.get('maxRate')) : undefined,
      serviceType: searchParams.get('serviceType')  ?? undefined,
      date:        searchParams.get('date')         ?? undefined,
    };

    const SERVICE_TYPES_BY_CATEGORY: Record<string, string[]> = {
      support:  ['Personal Care', 'Community Access', 'Domestic Assistance'],
      cleaner:  ['Cleaning', 'Domestic Assistance'],
      gardener: ['Gardening'],
      ot:       ['OT Assessment'],
    };

    let listings: MarketplaceListing[] = store.workers.map((w) => ({
      id:                      makeListingId(w.id),
      workerId:                w.id,
      workerName:              w.name,
      workerInitials:          w.initials,
      category:                w.category,
      suburb:                  w.suburb,
      bio:                     w.bio,
      hourlyRate:              w.hourlyRate,
      serviceTypes:            SERVICE_TYPES_BY_CATEGORY[w.category] ?? [],
      availability:            w.availability,
      strengths:               w.strengths,
      rating:                  w.rating,
      shiftsCompleted:         w.shiftsCompleted,
      yearsExp:                w.yearsExp,
      backgroundCheckVerified: w.backgroundCheckVerified,
      active:                  true,
      createdAt:               new Date().toISOString(),
      updatedAt:               new Date().toISOString(),
    }));

    if (params.category) {
      listings = listings.filter((l) => l.category === params.category);
    }
    if (params.suburb) {
      listings = listings.filter((l) =>
        l.suburb.toLowerCase().includes(params.suburb!.toLowerCase()),
      );
    }
    if (params.maxRate != null) {
      listings = listings.filter((l) => l.hourlyRate <= params.maxRate!);
    }
    if (params.serviceType) {
      listings = listings.filter((l) => l.serviceTypes.includes(params.serviceType!));
    }
    if (params.date) {
      const dayIdx = jsDayToAvailIndex(new Date(params.date).getDay());
      listings = listings.filter((l) =>
        l.availability[dayIdx]?.some(Boolean),
      );
    }

    return NextResponse.json({ listings, total: listings.length });
  }

  // ── Mode A: Booking list ──────────────────────────────────────────────────────
  const participantId  = searchParams.get('participantId');
  const workerId       = searchParams.get('workerId');
  const coordinatorId  = searchParams.get('coordinatorId');
  const statusFilter   = searchParams.get('status');
  const dateFilter     = searchParams.get('date');

  // Derive coordinatorId → participantIds mapping
  let managedParticipantIds: string[] | null = null;
  if (coordinatorId) {
    managedParticipantIds = store.participants
      .filter((p) => p.coordinatorId === coordinatorId)
      .map((p) => p.id);
  }

  const bookings = store.bookings.filter((b) => {
    if (participantId  && b.participantId !== participantId) return false;
    if (workerId       && b.workerId      !== workerId)      return false;
    if (statusFilter   && b.status        !== statusFilter)  return false;
    if (dateFilter     && b.date          !== dateFilter)    return false;
    if (managedParticipantIds && !managedParticipantIds.includes(b.participantId)) return false;
    return true;
  });

  // Enrich with worker + participant names for convenience
  const enriched = bookings.map((b) => {
    const worker      = store.workers.find((w) => w.id === b.workerId);
    const participant = store.participants.find((p) => p.id === b.participantId);
    return {
      ...b,
      workerName:      worker?.name      ?? b.workerId,
      participantName: participant?.name ?? b.participantId,
    };
  });

  return NextResponse.json({ bookings: enriched, total: enriched.length });
}

// ── POST /api/bookings ─────────────────────────────────────────────────────────
//
// Instantiates a pending booking and locks the worker's calendar slot.
//
// Business rules enforced:
//  1. Worker must exist and have their background check verified.
//  2. The requested date+slot must be open in the worker's availability matrix.
//  3. No existing pending/confirmed/in_progress booking for this worker on this slot+date.
//  4. Participant must not already have a booking on this date.
//  5. Fee split follows NDIS marketplace rules: participant pays +5%, worker receives -7.5%.
//
// Body: BookingCreateRequest — see bookingSchema.ts
//
// Response (201): ActiveBooking (full record)
// Errors:
//   400 MISSING_FIELDS / INVALID_SLOT / INVALID_DATE
//   404 WORKER_NOT_FOUND / PARTICIPANT_NOT_FOUND
//   409 SLOT_CONFLICT / PARTICIPANT_DOUBLE_BOOKED
//   422 WORKER_UNAVAILABLE / BACKGROUND_CHECK_REQUIRED
export async function POST(req: Request): Promise<Response> {
  let body: Partial<BookingCreateRequest>;
  try { body = await req.json() as Partial<BookingCreateRequest>; }
  catch {
    return NextResponse.json(
      { error: 'INVALID_BODY', message: 'Request body must be valid JSON', retryable: false },
      { status: 400 },
    );
  }

  const { participantId, workerId, date, slotIndex, hours, serviceType, notes, coordinatorId } = body;

  // ── 1. Field validation ───────────────────────────────────────────────────────
  if (!participantId || !workerId || !date || slotIndex == null || !hours || !serviceType) {
    return NextResponse.json({
      error:     'MISSING_FIELDS',
      message:   'Required: participantId, workerId, date, slotIndex (0|1|2), hours, serviceType',
      retryable: false,
    }, { status: 400 });
  }

  if (![0, 1, 2].includes(slotIndex)) {
    return NextResponse.json({
      error:     'INVALID_SLOT',
      message:   'slotIndex must be 0 (morning), 1 (afternoon), or 2 (evening)',
      retryable: false,
    }, { status: 400 });
  }

  if (hours <= 0 || hours > 12) {
    return NextResponse.json({
      error:     'INVALID_HOURS',
      message:   'hours must be between 0 and 12',
      retryable: false,
    }, { status: 400 });
  }

  // Validate date format
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({
      error:     'INVALID_DATE',
      message:   "date must be a valid ISO date string, e.g. '2026-07-10'",
      retryable: false,
    }, { status: 400 });
  }

  const store = getStore();

  // ── 2. Lookup worker + participant ────────────────────────────────────────────
  const worker = store.workers.find((w) => w.id === workerId);
  if (!worker) {
    return NextResponse.json({
      error: 'WORKER_NOT_FOUND', message: `No worker found with id '${workerId}'`, retryable: false,
    }, { status: 404 });
  }

  const participant = store.participants.find((p) => p.id === participantId);
  if (!participant) {
    return NextResponse.json({
      error: 'PARTICIPANT_NOT_FOUND', message: `No participant found with id '${participantId}'`, retryable: false,
    }, { status: 404 });
  }

  // ── 3. Background check gate ──────────────────────────────────────────────────
  if (!worker.backgroundCheckVerified) {
    return NextResponse.json({
      error:     'BACKGROUND_CHECK_REQUIRED',
      message:   `Worker '${worker.name}' has not completed background check verification`,
      retryable: false,
      workerId,
    }, { status: 422 });
  }

  // ── 4. Availability check (day-of-week matrix) ────────────────────────────────
  const dayIdx = jsDayToAvailIndex(parsedDate.getDay());

  if (!worker.availability[dayIdx]?.[slotIndex as SlotIndex]) {
    const slotLabel = SLOT_TIMES[slotIndex as SlotIndex]?.label ?? `slot ${slotIndex}`;
    const dayNames  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    return NextResponse.json({
      error:     'WORKER_UNAVAILABLE',
      message:   `${worker.name} is not available on ${dayNames[dayIdx]} ${slotLabel.toLowerCase()}`,
      retryable: false,
      workerId,
      dayOfWeek: dayIdx,
      slotIndex,
    }, { status: 422 });
  }

  // ── 5. Conflict check (existing bookings on this date+slot) ───────────────────
  const workerConflict = store.bookings.find(
    (b) =>
      b.workerId === workerId &&
      b.date === date &&
      ['pending', 'confirmed', 'in_progress'].includes(b.status),
  );
  if (workerConflict) {
    return NextResponse.json({
      error:           'SLOT_CONFLICT',
      message:         `${worker.name} already has a booking on ${date}`,
      retryable:       false,
      conflictingId:   workerConflict.id,
    }, { status: 409 });
  }

  const participantConflict = store.bookings.find(
    (b) =>
      b.participantId === participantId &&
      b.date === date &&
      ['pending', 'confirmed', 'in_progress'].includes(b.status),
  );
  if (participantConflict) {
    return NextResponse.json({
      error:         'PARTICIPANT_DOUBLE_BOOKED',
      message:       `Participant '${participant.name}' already has a booking on ${date}`,
      retryable:     false,
      conflictingId: participantConflict.id,
    }, { status: 409 });
  }

  // ── 6. Fee calculation ────────────────────────────────────────────────────────
  const fees = computeBookingFees(worker.hourlyRate, hours);

  // ── 7. Build + stub-persist booking record ────────────────────────────────────
  const slot      = SLOT_TIMES[slotIndex as SlotIndex];
  const bookingId = makeBookingId();
  const now       = new Date().toISOString();

  const booking: ActiveBooking = {
    id:               bookingId,
    participantId,
    workerId,
    coordinatorId:    coordinatorId ?? null,
    date,
    startTime:        slot.start,
    endTime:          slot.end,
    hours,
    slotIndex:        slotIndex as SlotIndex,
    hourlyRate:       worker.hourlyRate,
    serviceType,
    status:           'pending',
    participantTotal: fees.participantTotal,
    workerPayout:     fees.workerPayout,
    platformFee:      fees.platformFee,
    paymentIntentId:  null,
    notes:            notes ?? null,
    createdAt:        now,
    updatedAt:        now,
  };

  // TODO: INSERT INTO active_bookings — replace stub with your DB client
  // e.g. await db.insert(activeBookings).values(booking);
  void booking;

  return NextResponse.json({
    booking,
    workerName:      worker.name,
    participantName: participant.name,
    feeBreakdown: {
      hourlyRate:       `$${worker.hourlyRate.toFixed(2)}`,
      durationHours:    hours,
      participantTotal: `$${fees.participantTotal.toFixed(2)}`,
      workerPayout:     `$${fees.workerPayout.toFixed(2)}`,
      platformFee:      `$${fees.platformFee.toFixed(2)}`,
    },
  }, { status: 201 });
}
