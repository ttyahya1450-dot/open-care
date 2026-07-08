import { NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';

export async function GET(): Promise<Response> {
  const store = getStore();
  return NextResponse.json({
    meta: {
      counts: {
        workers:       store.workers.length,
        participants:  store.participants.length,
        bookings:      store.bookings.length,
        shiftLogs:     store.shiftLogs.length,
        notifications: store.notifications.length,
      },
      storageKey:  'opencare_data_v1',
      generatedAt: new Date().toISOString(),
    },
    data: store,
  });
}

// Returns the same pristine snapshot; client uses this body to re-hydrate localStorage.
export async function POST(): Promise<Response> {
  const store = getStore();
  return NextResponse.json({ hydrated: true, data: store });
}
