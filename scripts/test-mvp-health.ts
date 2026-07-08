#!/usr/bin/env tsx
/**
 * OpenCare MVP — API Health-Check Smoke-Test Suite
 *
 * Validates primary endpoints against a running local dev server.
 *
 *   npm run test:mvp
 *
 * Requires the dev server to be running first:
 *   npm run dev        (starts http://localhost:3000)
 *
 * Override the base URL:
 *   TEST_BASE_URL=https://staging.opencare.com.au npm run test:mvp
 */

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const bold   = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const cyan   = (s: string) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const dim    = (s: string) => `\x1b[2m${s}\x1b[0m`;

// ── Result tracking ───────────────────────────────────────────────────────────
interface Result { name: string; passed: boolean; note: string }
const results: Result[] = [];

function pass(name: string, note = ''): void {
  results.push({ name, passed: true, note });
  console.log(`  ${green('✓')} ${name}${note ? dim(` — ${note}`) : ''}`);
}

function fail(name: string, note = ''): void {
  results.push({ name, passed: false, note });
  console.log(`  ${red('✗')} ${name}${note ? `  ${red(note)}` : ''}`);
}

// Each test fn returns a note string on success, throws on failure.
async function test(name: string, fn: () => Promise<string | void>): Promise<void> {
  try {
    const note = await fn();
    pass(name, note ?? '');
  } catch (err) {
    fail(name, err instanceof Error ? err.message : String(err));
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
type JsonBody = Record<string, unknown>;

async function GET(path: string): Promise<{ status: number; body: JsonBody }> {
  const res  = await fetch(`${BASE}${path}`);
  const body = (await res.json().catch(() => ({}))) as JsonBody;
  return { status: res.status, body };
}

async function POST(path: string, data: unknown): Promise<{ status: number; body: JsonBody }> {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const body = (await res.json().catch(() => ({}))) as JsonBody;
  return { status: res.status, body };
}

// ── Compute a safe future weekday for the POST /api/bookings happy-path test.
// Picks 14 days from now; advances past the weekend so it always lands Mon–Fri.
function futureWeekday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// ── Test suite ────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`\n${bold('OpenCare MVP — API Health Check')}`);
  console.log(dim(`Target: ${BASE}`));
  console.log('');

  // Pre-flight: verify the server is reachable before running any tests.
  try {
    await fetch(`${BASE}/api/debug/seed`, { signal: AbortSignal.timeout(4000) });
  } catch {
    console.error(`${red('✗')} Cannot reach ${cyan(BASE)}`);
    console.error(`  Start the dev server first: ${cyan('npm run dev')}\n`);
    process.exit(1);
  }

  // ── GROUP 1: Seed / hydration ─────────────────────────────────────────────
  console.log(yellow('▸ Seed endpoint'));

  await test('GET /api/debug/seed  →  200 + full DataStore', async () => {
    const { status, body } = await GET('/api/debug/seed');
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const data = body.data as JsonBody | undefined;
    if (!Array.isArray(data?.workers)) throw new Error('data.workers not an array');
    const workers = data.workers as unknown[];
    if (workers.length === 0) throw new Error('no workers in seed');
    const meta = body.meta as JsonBody | undefined;
    return `${(meta?.counts as JsonBody)?.workers} workers, ${(meta?.counts as JsonBody)?.bookings} bookings`;
  });

  // ── GROUP 2: Bookings ─────────────────────────────────────────────────────
  console.log(yellow('\n▸ /api/bookings'));

  await test('GET /api/bookings  →  200 + booking list', async () => {
    const { status, body } = await GET('/api/bookings?coordinatorId=c1');
    if (status !== 200) throw new Error(`HTTP ${status}`);
    if (!Array.isArray(body.bookings)) throw new Error('bookings not an array');
    return `total=${body.total}`;
  });

  await test('GET /api/bookings?listings=true  →  200 + marketplace listings', async () => {
    const { status, body } = await GET('/api/bookings?listings=true');
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const listings = body.listings as JsonBody[] | undefined;
    if (!Array.isArray(listings) || listings.length === 0) throw new Error('listings empty or missing');
    const first = listings[0];
    if (!first.workerId || !first.hourlyRate) throw new Error('listing missing required fields');
    return `${body.total} listings · first: ${first.workerName} $${first.hourlyRate}/hr`;
  });

  await test('POST /api/bookings  →  201 + booking record with fee breakdown', async () => {
    const date = futureWeekday();
    const { status, body } = await POST('/api/bookings', {
      participantId: 'p1',
      workerId:      'w1',   // Maya Chen — background check verified, weekdays available
      date,
      slotIndex:     0,      // morning (08:00–12:00)
      hours:         3,
      serviceType:   'Personal Care',
    });
    if (status !== 201) throw new Error(`HTTP ${status} — ${body.error as string ?? body.message}`);
    const booking     = body.booking     as JsonBody | undefined;
    const feeBreakdown = body.feeBreakdown as JsonBody | undefined;
    if (!booking?.id)          throw new Error('booking.id missing');
    if (!feeBreakdown?.participantTotal) throw new Error('feeBreakdown.participantTotal missing');
    return `id=${booking.id}  participant pays ${feeBreakdown.participantTotal}  worker gets ${feeBreakdown.workerPayout}`;
  });

  await test('POST /api/bookings (missing fields)  →  400 MISSING_FIELDS', async () => {
    const { status, body } = await POST('/api/bookings', {});
    if (status !== 400)  throw new Error(`expected 400, got ${status}`);
    if (body.error !== 'MISSING_FIELDS') throw new Error(`expected MISSING_FIELDS, got ${body.error}`);
    return 'MISSING_FIELDS';
  });

  // ── GROUP 3: Invoices ─────────────────────────────────────────────────────
  console.log(yellow('\n▸ /api/invoices/generate'));

  await test('GET /api/invoices/generate?shift_id=sl1  →  200 + PDF data URI', async () => {
    const { status, body } = await GET('/api/invoices/generate?shift_id=sl1');
    if (status !== 200) throw new Error(`HTTP ${status}`);
    if (typeof body.pdfDataUri !== 'string') throw new Error('pdfDataUri missing');
    if (!body.pdfDataUri.startsWith('data:application/pdf;base64,'))
      throw new Error('pdfDataUri prefix invalid');
    return `invoice=${body.invoiceNumber}  file=${body.filename}`;
  });

  await test('GET /api/invoices/generate (no shift_id)  →  400 MISSING_PARAM', async () => {
    const { status, body } = await GET('/api/invoices/generate');
    if (status !== 400)  throw new Error(`expected 400, got ${status}`);
    if (body.error !== 'MISSING_PARAM') throw new Error(`expected MISSING_PARAM, got ${body.error}`);
    return 'MISSING_PARAM';
  });

  await test('GET /api/invoices/generate?shift_id=UNKNOWN  →  404 SHIFT_NOT_FOUND', async () => {
    const { status, body } = await GET('/api/invoices/generate?shift_id=UNKNOWN');
    if (status !== 404)  throw new Error(`expected 404, got ${status}`);
    if (body.error !== 'SHIFT_NOT_FOUND') throw new Error(`expected SHIFT_NOT_FOUND, got ${body.error}`);
    return 'SHIFT_NOT_FOUND';
  });

  // ── GROUP 4: Shift check-in ───────────────────────────────────────────────
  console.log(yellow('\n▸ /api/shifts/check-in'));

  await test('POST /api/shifts/check-in (on-site)  →  200 verified_clock_in', async () => {
    // Worker coordinates match participant p1's registered address exactly.
    // Haversine distance = 0 m → within GEOFENCE_THRESHOLD_METERS (200 m).
    const { status, body } = await POST('/api/shifts/check-in', {
      shiftId:        'smoke-test-shift-001',
      workerId:       'w1',
      participantId:  'p1',
      lat:            -33.8199,   // 14 Harbour St, Northbridge NSW 2063
      lng:             151.2106,
      accuracyMeters: 5,
      timestamp:      new Date().toISOString(),
    });
    if (status !== 200) throw new Error(`HTTP ${status} — ${body.error as string ?? body.message}`);
    if (body.status !== 'verified_clock_in') throw new Error(`status=${body.status}`);
    return `${body.distanceText} from address  id=${body.shiftLogId}`;
  });

  await test('POST /api/shifts/check-in (off-site)  →  422 LOCATION_TOO_FAR', async () => {
    // Worker ~5.4 km south of participant p1's Northbridge address.
    const { status, body } = await POST('/api/shifts/check-in', {
      shiftId:        'smoke-test-shift-002',
      workerId:       'w1',
      participantId:  'p1',
      lat:            -33.8680,   // ~5.4 km south of Northbridge
      lng:             151.2090,
      accuracyMeters: 10,
      timestamp:      new Date().toISOString(),
    });
    if (status !== 422) throw new Error(`expected 422, got ${status}`);
    if (body.error !== 'LOCATION_TOO_FAR') throw new Error(`expected LOCATION_TOO_FAR, got ${body.error}`);
    return `${body.distanceText} — correctly rejected`;
  });

  await test('POST /api/shifts/check-in (empty body)  →  400 MISSING_FIELDS', async () => {
    const { status, body } = await POST('/api/shifts/check-in', {});
    if (status !== 400)  throw new Error(`expected 400, got ${status}`);
    if (body.error !== 'MISSING_FIELDS') throw new Error(`expected MISSING_FIELDS, got ${body.error}`);
    return 'MISSING_FIELDS';
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const allOk  = failed === 0;

  console.log('\n' + dim('─'.repeat(56)));
  if (allOk) {
    console.log(green(bold(`  ✓  All ${passed} checks passed`)));
  } else {
    console.log(red(bold(`  ✗  ${failed} of ${results.length} checks failed`)));
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`     ${red('•')} ${r.name}  ${dim(r.note)}`);
    });
  }
  console.log(dim(`  Target: ${BASE}`));
  console.log('');

  process.exit(allOk ? 0 : 1);
}

main();
