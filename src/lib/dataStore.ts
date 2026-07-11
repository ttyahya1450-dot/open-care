// localStorage-backed data engine — initialized once from seed data
const STORE_KEY = 'opencare_data_v1';

// ── Types ─────────────────────────────────────────────────────────────────
export type WorkerCategory = 'support' | 'cleaner' | 'gardener' | 'ot';

export type NdiswcStatus = 'VERIFIED' | 'PENDING' | 'NOT_SUBMITTED';

export interface DSWorker {
  id: string;
  name: string;
  initials: string;
  category: WorkerCategory;
  suburb: string;
  bio: string;
  hourlyRate: number;
  backgroundCheckVerified: boolean;
  ndiswcStatus: NdiswcStatus;
  strengths: string[];
  // 7 days × 3 slots: [morning, afternoon, evening]
  availability: boolean[][];
  rating: number;
  shiftsCompleted: number;
  yearsExp: number;
}

export interface DSParticipant {
  id: string;
  name: string;
  initials: string;
  suburb: string;
  ndisBudget: number;
  ndisRemaining: number;
  planEndDate: string;
  weeklyHours: number;
  primaryDiagnosis: string;
  coordinatorId: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface DSBooking {
  id: string;
  participantId: string;
  workerId: string;
  date: string;
  hours: number;
  hourlyRate: number;
  serviceType: string;
  status: BookingStatus;
  participantTotal: number;
  workerPayout: number;
  platformFee: number;
}

export interface DSShiftLog {
  id: string;
  bookingId: string;
  workerId: string;
  workerName: string;
  workerInitials: string;
  participantId: string;
  participantName: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  durationHrs: number | null;
  gpsLat: number;
  gpsLng: number;
  gpsAddress: string;
  gpsVerified: boolean;
  status: 'active' | 'completed' | 'no-show';
  serviceType: string;
  hourlyRate: number;
}

export type NotifType =
  | 'shift_start' | 'booking_confirmed' | 'shift_complete'
  | 'budget_alert' | 'swap_request' | 'worker_arrival' | 'plan_review';

export interface DSNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  targetRoles: Array<'PARTICIPANT' | 'WORKER' | 'COORDINATOR'>;
}

export interface DataStore {
  workers: DSWorker[];
  participants: DSParticipant[];
  bookings: DSBooking[];
  shiftLogs: DSShiftLog[];
  notifications: DSNotification[];
}

// ── Seed data ─────────────────────────────────────────────────────────────
const weekdays: boolean[][] = Array.from({ length: 7 }, (_, i) =>
  i < 5 ? [true, true, false] : [false, false, false],
);
const flexDays: boolean[][] = Array.from({ length: 7 }, (_, i) =>
  i < 6 ? [true, true, true] : [false, false, false],
);
const offDays: boolean[][] = Array.from({ length: 7 }, () => [false, false, false]);
void offDays;

const SEED: DataStore = {
  workers: [
    {
      id: 'w1', name: 'Maya Chen', initials: 'MC', category: 'support',
      suburb: 'Northbridge', hourlyRate: 92, backgroundCheckVerified: true, ndiswcStatus: 'VERIFIED' as NdiswcStatus,
      bio: 'Support worker with a calm, dependable approach and strong experience helping participants build confidence in daily routines.',
      strengths: ['Highly Punctual', 'Calm in High-Stress Situations', 'NDIS Approved', 'Active Listener'],
      availability: weekdays.map((d) => [...d]),
      rating: 4.9, shiftsCompleted: 142, yearsExp: 3,
    },
    {
      id: 'w2', name: 'Daniel Brooks', initials: 'DB', category: 'support',
      suburb: 'Surry Hills', hourlyRate: 110, backgroundCheckVerified: true, ndiswcStatus: 'VERIFIED' as NdiswcStatus,
      bio: 'Known for thoughtful planning and a steady presence during busy community outings and appointments.',
      strengths: ['Great with Non-Verbal Communication', 'Active Listener', 'Manual Handling Certified'],
      availability: weekdays.map((d) => [...d]),
      rating: 4.8, shiftsCompleted: 89, yearsExp: 5,
    },
    {
      id: 'w3', name: 'Aisha Rahman', initials: 'AR', category: 'support',
      suburb: 'Parramatta', hourlyRate: 84, backgroundCheckVerified: false, ndiswcStatus: 'PENDING' as NdiswcStatus,
      bio: 'Friendly and organised support worker focused on building routines that support independence and wellbeing.',
      strengths: ['Pet Friendly', 'Dual Language Speaker', 'Person-Centred Approach'],
      availability: flexDays.map((d) => [...d]),
      rating: 4.7, shiftsCompleted: 34, yearsExp: 1,
    },
    {
      id: 'w4', name: 'Sam Okafor', initials: 'SO', category: 'cleaner',
      suburb: 'Chatswood', hourlyRate: 65, backgroundCheckVerified: true, ndiswcStatus: 'VERIFIED' as NdiswcStatus,
      bio: 'Experienced domestic assistant with specialist knowledge in NDIS-funded cleaning.',
      strengths: ['Detail-Oriented', 'NDIS Familiar', 'Highly Reliable'],
      availability: weekdays.map((d) => [...d]),
      rating: 4.9, shiftsCompleted: 210, yearsExp: 4,
    },
    {
      id: 'w5', name: 'Leo Fernandez', initials: 'LF', category: 'gardener',
      suburb: 'Penrith', hourlyRate: 70, backgroundCheckVerified: true, ndiswcStatus: 'VERIFIED' as NdiswcStatus,
      bio: 'Accessible garden specialist who designs and maintains safe, therapeutic outdoor spaces.',
      strengths: ['Accessible Design', 'NDIS Trained', 'First Aid Certified'],
      availability: weekdays.map((d) => [...d]),
      rating: 4.8, shiftsCompleted: 67, yearsExp: 2,
    },
    {
      id: 'w6', name: 'Dr. Rachel Tran', initials: 'RT', category: 'ot',
      suburb: 'North Sydney', hourlyRate: 195, backgroundCheckVerified: true, ndiswcStatus: 'VERIFIED' as NdiswcStatus,
      bio: 'AHPRA-registered OT with 10 years of experience in home modification assessments and assistive technology.',
      strengths: ['AHPRA Registered', 'NDIS Specialist', 'Home Modifications'],
      availability: Array.from({ length: 7 }, (_, i) => i < 5 ? [false, true, false] : [false, false, false]),
      rating: 5.0, shiftsCompleted: 312, yearsExp: 10,
    },
  ],
  participants: [
    { id: 'p1', name: 'Alex Morgan',  initials: 'AM', suburb: 'Northbridge', ndisBudget: 18000, ndisRemaining: 7200,  planEndDate: '2026-10-30', weeklyHours: 18, primaryDiagnosis: 'Cerebral Palsy (mild)',           coordinatorId: 'c1' },
    { id: 'p2', name: 'Jordan Lee',   initials: 'JL', suburb: 'Surry Hills',  ndisBudget: 24000, ndisRemaining: 19200, planEndDate: '2027-01-15', weeklyHours: 12, primaryDiagnosis: 'Multiple Sclerosis',              coordinatorId: 'c1' },
    { id: 'p3', name: 'Riley Nguyen', initials: 'RN', suburb: 'Parramatta',   ndisBudget: 12000, ndisRemaining: 1400,  planEndDate: '2026-08-01', weeklyHours: 20, primaryDiagnosis: 'Autism Spectrum Disorder (L2)', coordinatorId: 'c1' },
  ],
  bookings: [
    { id: 'b1', participantId: 'p1', workerId: 'w1', date: '2026-06-29', hours: 3, hourlyRate: 92, serviceType: 'Personal Care',    status: 'completed', participantTotal: 289.80, workerPayout: 255.30, platformFee:  34.50 },
    { id: 'b2', participantId: 'p2', workerId: 'w2', date: '2026-06-29', hours: 4, hourlyRate: 110, serviceType: 'Community Access', status: 'confirmed', participantTotal: 462.00, workerPayout: 407.00, platformFee: 55.00 },
    { id: 'b3', participantId: 'p3', workerId: 'w3', date: '2026-06-29', hours: 4.25, hourlyRate: 84, serviceType: 'Domestic Assistance', status: 'completed', participantTotal: 374.85, workerPayout: 330.45, platformFee: 44.40 },
    { id: 'b4', participantId: 'p1', workerId: 'w4', date: '2026-06-28', hours: 2, hourlyRate: 65, serviceType: 'Cleaning',         status: 'completed', participantTotal: 136.50, workerPayout: 120.25, platformFee: 16.25 },
    { id: 'b5', participantId: 'p1', workerId: 'w5', date: '2026-06-27', hours: 3, hourlyRate: 70, serviceType: 'Gardening',        status: 'completed', participantTotal: 220.50, workerPayout: 194.25, platformFee: 26.25 },
    { id: 'b6', participantId: 'p2', workerId: 'w6', date: '2026-06-25', hours: 1, hourlyRate: 195, serviceType: 'OT Assessment',   status: 'completed', participantTotal: 204.75, workerPayout: 180.38, platformFee: 24.37 },
  ],
  shiftLogs: [
    { id: 'sl1', bookingId: 'b1', workerId: 'w1', workerName: 'Maya Chen',     workerInitials: 'MC', participantId: 'p1', participantName: 'Alex Morgan',  date: '29 Jun 2026', clockIn: '09:02 AM', clockOut: '12:05 PM', durationHrs: 3.05, gpsLat: -33.8199, gpsLng: 151.2106, gpsAddress: '14 Harbour St, Northbridge NSW 2063', gpsVerified: true,  status: 'completed', serviceType: 'Personal Care',       hourlyRate: 92  },
    { id: 'sl2', bookingId: 'b2', workerId: 'w2', workerName: 'Daniel Brooks', workerInitials: 'DB', participantId: 'p2', participantName: 'Jordan Lee',   date: '29 Jun 2026', clockIn: '01:15 PM', clockOut: null,       durationHrs: null, gpsLat: -33.8875, gpsLng: 151.2094, gpsAddress: '8 Crown St, Surry Hills NSW 2010',    gpsVerified: true,  status: 'active',    serviceType: 'Community Access',    hourlyRate: 110 },
    { id: 'sl3', bookingId: 'b3', workerId: 'w3', workerName: 'Aisha Rahman',  workerInitials: 'AR', participantId: 'p3', participantName: 'Riley Nguyen', date: '29 Jun 2026', clockIn: '08:45 AM', clockOut: '01:00 PM', durationHrs: 4.25, gpsLat: -33.8136, gpsLng: 150.9993, gpsAddress: '22 Macquarie St, Parramatta NSW 2150', gpsVerified: true,  status: 'completed', serviceType: 'Domestic Assistance', hourlyRate: 84  },
    { id: 'sl4', bookingId: 'b4', workerId: 'w4', workerName: 'Sam Okafor',    workerInitials: 'SO', participantId: 'p1', participantName: 'Alex Morgan',  date: '28 Jun 2026', clockIn: '10:00 AM', clockOut: '12:00 PM', durationHrs: 2.0,  gpsLat: -33.8199, gpsLng: 151.2106, gpsAddress: '14 Harbour St, Northbridge NSW 2063', gpsVerified: true,  status: 'completed', serviceType: 'Cleaning',            hourlyRate: 65  },
    { id: 'sl5', bookingId: 'b5', workerId: 'w5', workerName: 'Leo Fernandez', workerInitials: 'LF', participantId: 'p1', participantName: 'Alex Morgan',  date: '27 Jun 2026', clockIn: '09:30 AM', clockOut: '12:30 PM', durationHrs: 3.0,  gpsLat: -33.8199, gpsLng: 151.2106, gpsAddress: '14 Harbour St, Northbridge NSW 2063', gpsVerified: false, status: 'completed', serviceType: 'Gardening',           hourlyRate: 70  },
    { id: 'sl6', bookingId: 'b6', workerId: 'w6', workerName: 'Dr. Rachel Tran', workerInitials: 'RT', participantId: 'p2', participantName: 'Jordan Lee', date: '25 Jun 2026', clockIn: '02:00 PM', clockOut: '03:00 PM', durationHrs: 1.0, gpsLat: -33.8194, gpsLng: 151.1990, gpsAddress: '100 Pacific Hwy, North Sydney NSW 2060', gpsVerified: true, status: 'completed', serviceType: 'OT Assessment', hourlyRate: 195 },
  ],
  notifications: [
    { id: 'n1', type: 'worker_arrival',    title: 'Maya Chen is on her way',     body: 'Maya Chen is arriving in approximately 10 minutes for your 9:00 AM personal care session.',          timestamp: '2026-06-30T08:50:00', read: false, targetRoles: ['PARTICIPANT'] },
    { id: 'n2', type: 'shift_start',       title: 'Shift starting soon',         body: 'Your session with Alex Morgan starts in 15 minutes. Clock in via the app when you arrive.',           timestamp: '2026-06-30T08:45:00', read: false, targetRoles: ['WORKER'] },
    { id: 'n3', type: 'budget_alert',      title: 'Riley Nguyen — budget critical', body: "Riley's NDIS plan has less than $1,400 remaining. Plan end is 1 Aug 2026. Review immediately.",   timestamp: '2026-06-30T08:00:00', read: false, targetRoles: ['COORDINATOR'] },
    { id: 'n4', type: 'booking_confirmed', title: 'Booking confirmed',            body: 'Your booking with Maya Chen on 2 Jul 2026 (3 hours, Personal Care) is confirmed.',                   timestamp: '2026-06-29T16:30:00', read: true,  targetRoles: ['PARTICIPANT'] },
    { id: 'n5', type: 'shift_complete',    title: 'Shift completed',              body: 'Shift with Alex Morgan completed. 3.05 hrs logged. $255.30 queued for payout.',                       timestamp: '2026-06-29T12:10:00', read: true,  targetRoles: ['WORKER'] },
    { id: 'n6', type: 'swap_request',      title: 'Swap request received',        body: 'Aisha Rahman has requested a shift swap for the Fri 3 Jul 9:00 AM session with Alex Morgan.',        timestamp: '2026-06-29T10:00:00', read: false, targetRoles: ['COORDINATOR'] },
    { id: 'n7', type: 'plan_review',       title: 'Plan review recommended',      body: 'Riley Nguyen\'s support coordinator has flagged a plan review. Respond within 48 hours.',            timestamp: '2026-06-28T14:00:00', read: true,  targetRoles: ['PARTICIPANT', 'COORDINATOR'] },
    { id: 'n8', type: 'shift_start',       title: 'Gardening confirmed for Alex', body: 'Leo Fernandez is scheduled to visit 14 Harbour St on Thu 2 Jul at 9:30 AM for garden maintenance.', timestamp: '2026-06-27T09:00:00', read: true,  targetRoles: ['PARTICIPANT'] },
  ],
};

// ── Store access ───────────────────────────────────────────────────────────
export function getStore(): DataStore {
  if (typeof window === 'undefined') return SEED;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as DataStore;
  } catch { /* ignore */ }
  return structuredClone(SEED);
}

export function saveStore(data: DataStore): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export function resetStore(): DataStore {
  const fresh = structuredClone(SEED);
  saveStore(fresh);
  return fresh;
}

export function updateWorker(store: DataStore, id: string, patch: Partial<DSWorker>): DataStore {
  const next = { ...store, workers: store.workers.map((w) => w.id === id ? { ...w, ...patch } : w) };
  saveStore(next);
  return next;
}

export function markNotificationRead(store: DataStore, id: string): DataStore {
  const next = { ...store, notifications: store.notifications.map((n) => n.id === id ? { ...n, read: true } : n) };
  saveStore(next);
  return next;
}

export function markAllRead(store: DataStore, role: 'PARTICIPANT' | 'WORKER' | 'COORDINATOR'): DataStore {
  const next = {
    ...store,
    notifications: store.notifications.map((n) =>
      n.targetRoles.includes(role) ? { ...n, read: true } : n,
    ),
  };
  saveStore(next);
  return next;
}

export function addBooking(store: DataStore, booking: DSBooking): DataStore {
  const next = { ...store, bookings: [booking, ...store.bookings] };
  saveStore(next);
  return next;
}

export function addNotification(store: DataStore, notif: DSNotification): DataStore {
  const next = { ...store, notifications: [notif, ...store.notifications] };
  saveStore(next);
  return next;
}
