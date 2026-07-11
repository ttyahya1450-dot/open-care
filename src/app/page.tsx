'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import AppTour from '../components/AppTour';
import { useRouteGuard } from '../hooks/useRouteGuard';

type ServiceCategory = 'Support Workers' | 'Cleaners' | 'Gardeners' | 'Occupational Therapists';

const CATEGORIES: Array<{ id: ServiceCategory; icon: string; tagline: string }> = [
  { id: 'Support Workers',         icon: '🤝', tagline: 'Personal care, community access & daily living support'    },
  { id: 'Cleaners',               icon: '🧹', tagline: 'Domestic assistance and home environment maintenance'       },
  { id: 'Gardeners',              icon: '🌿', tagline: 'Outdoor maintenance, accessible garden design & upkeep'     },
  { id: 'Occupational Therapists', icon: '🏥', tagline: 'Functional assessments, equipment prescription & therapy' },
];

type NdiswcStatus = 'VERIFIED' | 'PENDING' | 'NOT_SUBMITTED';

interface ServiceProvider {
  id: string; category: ServiceCategory;
  name: string; bio: string; suburb: string;
  hourlyRate: number; badges: string[]; specialties: string[];
  availability: string; isVerified: boolean;
  ndiswcStatus: NdiswcStatus;
}

// ── Seed API types & helpers ──────────────────────────────────────────────
interface SeedWorker {
  id: string; name: string; bio: string; suburb: string;
  hourlyRate: number; category: 'support' | 'cleaner' | 'gardener' | 'ot';
  backgroundCheckVerified: boolean; ndiswcStatus: NdiswcStatus;
  strengths: string[]; availability: boolean[][];
}

const CATEGORY_MAP: Record<SeedWorker['category'], ServiceCategory> = {
  support:  'Support Workers',
  cleaner:  'Cleaners',
  gardener: 'Gardeners',
  ot:       'Occupational Therapists',
};

const CATEGORY_SPECIALTIES: Record<SeedWorker['category'], string[]> = {
  support:  ['Personal care', 'Daily living support', 'Community access'],
  cleaner:  ['Domestic assistance', 'Home hygiene', 'Laundry & ironing'],
  gardener: ['Lawn mowing', 'Accessible garden design', 'Seasonal maintenance'],
  ot:       ['Home modification reports', 'AT prescription', 'NDIS goal planning'],
};

function availabilityLabel(av: boolean[][]): string {
  const weekday = av.slice(0, 5).some((d) => d[0] || d[1]);
  const weekend = av.slice(5).some((d) => d.some(Boolean));
  if (weekday && weekend) return 'Available this week';
  if (weekday)            return 'Available Mon–Fri';
  if (weekend)            return 'Available weekends';
  return 'Limited availability';
}

const BADGE_COLORS = [
  'bg-brand-xlight text-brand-mid dark:bg-brand/20',
  'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
];

const PROVIDERS: ServiceProvider[] = [
  { id: 'sw1', category: 'Support Workers', name: 'Maya Chen', hourlyRate: 92, suburb: 'Northbridge', isVerified: true, ndiswcStatus: 'VERIFIED', availability: 'Available this week',
    bio: 'Support worker with a calm, dependable approach and strong experience helping participants build confidence in daily routines.',
    badges: ['Highly Punctual', 'Calm in High-Stress Situations', 'NDIS Approved'],
    specialties: ['Personal care', 'Meal prep', 'Community access'] },
  { id: 'sw2', category: 'Support Workers', name: 'Daniel Brooks', hourlyRate: 110, suburb: 'Surry Hills', isVerified: true, ndiswcStatus: 'VERIFIED', availability: 'Next 48 hours',
    bio: 'Known for thoughtful planning and a steady presence during busy community outings and appointments.',
    badges: ['Great with Non-Verbal Communication', 'Active Listener', 'Manual Handling Certified'],
    specialties: ['Behaviour support', 'Social engagement', 'Transport'] },
  { id: 'sw3', category: 'Support Workers', name: 'Aisha Rahman', hourlyRate: 84, suburb: 'Parramatta', isVerified: false, ndiswcStatus: 'PENDING', availability: 'Open for weekend bookings',
    bio: 'Friendly and organised support worker focused on building routines that support independence and wellbeing.',
    badges: ['Pet Friendly', 'Dual Language Speaker', 'Person-Centred Approach'],
    specialties: ['Domestic assistance', 'Wellbeing check-ins', 'Exercise support'] },

  { id: 'cl1', category: 'Cleaners', name: 'Sam Okafor', hourlyRate: 65, suburb: 'Chatswood', isVerified: true, ndiswcStatus: 'VERIFIED', availability: 'Available Mon–Fri',
    bio: 'Experienced domestic assistant with specialist knowledge in NDIS-funded cleaning and safe home environment setup for participants.',
    badges: ['Detail-Oriented', 'NDIS Familiar', 'Highly Reliable'],
    specialties: ['Deep cleaning', 'Laundry & ironing', 'Kitchen hygiene'] },
  { id: 'cl2', category: 'Cleaners', name: 'Priya Nair', hourlyRate: 58, suburb: 'Blacktown', isVerified: true, ndiswcStatus: 'VERIFIED', availability: 'Flexible scheduling',
    bio: 'Compassionate cleaner who understands the importance of dignity and familiarity inside a participant\'s home environment.',
    badges: ['Quiet & Respectful', 'Eco Products', 'Participant Trained'],
    specialties: ['Accessible bathroom care', 'Bedroom maintenance', 'Sanitisation'] },
  { id: 'cl3', category: 'Cleaners', name: 'Tom Walsh', hourlyRate: 72, suburb: 'Liverpool', isVerified: false, ndiswcStatus: 'PENDING', availability: 'Weekends available',
    bio: 'Thorough and efficient cleaner specialising in larger homes and multi-room maintenance for NDIS households.',
    badges: ['Equipment Experienced', 'Heavy-Duty Cleaning', 'Insured'],
    specialties: ['Window cleaning', 'Carpet care', 'Hoarding recovery support'] },

  { id: 'ga1', category: 'Gardeners', name: 'Leo Fernandez', hourlyRate: 70, suburb: 'Penrith', isVerified: true, ndiswcStatus: 'VERIFIED', availability: 'Available this week',
    bio: 'Accessible garden specialist who designs and maintains safe, therapeutic outdoor spaces for NDIS participants at home.',
    badges: ['Accessible Design', 'NDIS Trained', 'First Aid Certified'],
    specialties: ['Lawn mowing', 'Raised-bed gardens', 'Accessible path clearing'] },
  { id: 'ga2', category: 'Gardeners', name: 'Nikita Green', hourlyRate: 55, suburb: 'Castle Hill', isVerified: true, ndiswcStatus: 'VERIFIED', availability: 'Next 48 hours',
    bio: 'Creates calming, sensory-friendly outdoor environments for participants with complex needs — patient and knowledgeable.',
    badges: ['Sensory Garden Design', 'Calm & Patient', 'Horticulture Trained'],
    specialties: ['Weeding & pruning', 'Planting therapy', 'Seasonal maintenance'] },
  { id: 'ga3', category: 'Gardeners', name: 'Karl Jensen', hourlyRate: 80, suburb: 'Hornsby', isVerified: false, ndiswcStatus: 'PENDING', availability: 'Open for weekends',
    bio: 'Practical and reliable gardener with experience in large outdoor maintenance projects for residential NDIS clients.',
    badges: ['Heavy Equipment', 'Tree Trimming', 'Insured & Certified'],
    specialties: ['Hedge trimming', 'Tree lopping', 'Outdoor rubbish removal'] },

  { id: 'ot1', category: 'Occupational Therapists', name: 'Dr. Rachel Tran', hourlyRate: 195, suburb: 'North Sydney', isVerified: true, ndiswcStatus: 'VERIFIED', availability: 'Bookings this month',
    bio: 'AHPRA-registered OT with 10 years of experience in home modification assessments, assistive technology, and NDIS goal reporting.',
    badges: ['AHPRA Registered', 'NDIS Specialist', 'Home Modifications'],
    specialties: ['Home modification reports', 'AT prescription', 'NDIS goal planning'] },
  { id: 'ot2', category: 'Occupational Therapists', name: 'James Obi', hourlyRate: 175, suburb: 'Macquarie Park', isVerified: true, ndiswcStatus: 'VERIFIED', availability: 'Next 48 hours',
    bio: 'Paediatric and adult OT specialising in sensory processing, fine motor development, and community participation planning.',
    badges: ['Paediatric Specialist', 'Sensory Processing', 'Autism Experienced'],
    specialties: ['Sensory assessments', 'Fine motor therapy', 'Community access planning'] },
  { id: 'ot3', category: 'Occupational Therapists', name: 'Sandra Hopkirk', hourlyRate: 160, suburb: 'Bondi Junction', isVerified: false, ndiswcStatus: 'PENDING', availability: 'Weekdays available',
    bio: 'Dedicated OT focusing on capacity building and functional independence for adults with physical and psychosocial disabilities.',
    badges: ['Capacity Building', 'Psychosocial Support', 'Report Writing'],
    specialties: ['Functional capacity evaluations', 'Psychosocial reports', 'NDIS plan review support'] },
];

export default function MarketplacePage() {
  const [category,     setCategory]     = useState<ServiceCategory>('Support Workers');
  const [suburbQuery,  setSuburbQuery]  = useState('');
  const [maxRate,      setMaxRate]      = useState(220);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [providers,    setProviders]    = useState<ServiceProvider[]>(PROVIDERS);

  const { isAllowed } = useRouteGuard({ allowedRoles: ['PARTICIPANT'] });

  useEffect(() => {
    fetch('/api/debug/seed')
      .then((r) => r.json())
      .then(({ data }) => {
        const mapped: ServiceProvider[] = (data.workers as SeedWorker[]).map((w) => ({
          id:           w.id,
          category:     CATEGORY_MAP[w.category],
          name:         w.name,
          bio:          w.bio,
          suburb:       w.suburb,
          hourlyRate:   w.hourlyRate,
          badges:       w.strengths,
          specialties:  CATEGORY_SPECIALTIES[w.category],
          availability: availabilityLabel(w.availability),
          isVerified:   w.backgroundCheckVerified,
          ndiswcStatus: w.ndiswcStatus,
        }));
        setProviders(mapped);
      })
      .catch(() => { /* keep PROVIDERS fallback */ });
  }, []);

  const filtered = useMemo(() =>
    providers.filter(
      (p) =>
        p.ndiswcStatus === 'VERIFIED' &&
        p.category   === category &&
        p.suburb.toLowerCase().includes(suburbQuery.trim().toLowerCase()) &&
        p.hourlyRate <= maxRate &&
        (!verifiedOnly || p.isVerified),
    ),
  [category, suburbQuery, maxRate, verifiedOnly, providers]);

  const catMeta = CATEGORIES.find((c) => c.id === category)!;

  if (!isAllowed) return null;

  return (
    <main className="page-shell">
      <Navbar />

      <section className="w-full max-w-md sm:max-w-[1120px] mx-auto overflow-x-hidden px-4 sm:px-5 py-6 sm:py-9 grid gap-5 sm:gap-7">
        {/* Header */}
        <div>
          <p className="section-label mb-2">OpenCare Marketplace</p>
          <h1 className="page-title">Find the right support for your care needs</h1>
          <p className="page-sub mt-3 max-w-[680px]">{catMeta.tagline}</p>
        </div>

        {/* Category tabs — flex-wrap ensures they stack into 2 rows on mobile */}
        <div className="flex flex-wrap gap-2" role="tablist">
          {CATEGORIES.map(({ id, icon }) => {
            const active = id === category;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                onTouchStart={(e) => { e.preventDefault(); setCategory(id); setSuburbQuery(''); }}
                onClick={() => { setCategory(id); setSuburbQuery(''); }}
                className={`flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-[14px] border-2 font-bold text-[13px] cursor-pointer transition-all active:scale-[0.97] ${
                  active
                    ? 'bg-brand-gradient text-white border-transparent shadow-brand-sm'
                    : 'bg-white dark:bg-slate-800 text-muted-dark dark:text-slate-300 border-surface-border dark:border-slate-700 hover:border-brand/40 hover:text-navy dark:hover:text-white'
                }`}
              >
                <span className="text-[16px] leading-none">{icon}</span>
                <span className="hidden sm:inline">{id}</span>
                <span className="sm:hidden">{id.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div
          id="marketplace-filters"
          className="grid gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-card dark:shadow-none border border-surface-border dark:border-slate-700"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
        >
          <label className="flex flex-col gap-2 font-semibold text-sm text-navy dark:text-slate-200">
            Suburb
            <input
              value={suburbQuery}
              onChange={(e) => setSuburbQuery(e.target.value)}
              placeholder="e.g. Northbridge"
              className="form-input font-normal"
            />
          </label>
          <label className="flex flex-col gap-2 font-semibold text-sm text-navy dark:text-slate-200">
            Max hourly rate
            <div className="flex flex-col gap-1">
              <input
                type="range" min="50" max="220" step="5"
                value={maxRate}
                onChange={(e) => setMaxRate(Number(e.target.value))}
                className="accent-brand"
              />
              <span className="text-brand font-extrabold">${maxRate}/hr</span>
            </div>
          </label>
          <div className="flex flex-col justify-end gap-2">
            {/* Verification filter */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-[40px] h-[22px] rounded-full transition-colors duration-200 ${verifiedOnly ? 'bg-brand' : 'bg-surface-input dark:bg-slate-600'}`}>
                  <div className={`absolute top-[3px] w-[16px] h-[16px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all duration-200 ${verifiedOnly ? 'left-[21px]' : 'left-[3px]'}`} />
                </div>
              </div>
              <span className="text-[13px] font-semibold text-navy dark:text-slate-200">
                Verified background check only
              </span>
            </label>
            <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-muted-lighter dark:text-slate-500">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
            <div className="text-[13px] text-muted-light dark:text-slate-400 leading-snug">
              Transparent pricing · No hidden fees · NDIS accepted
            </div>
          </div>
        </div>

        {/* Provider cards — single column on mobile, multi-column on sm+ */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-[22px] shadow-card dark:shadow-none border border-surface-border dark:border-slate-700 flex flex-col hover:shadow-card-lg dark:hover:border-slate-600 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-[19px] font-bold text-navy dark:text-white m-0">{p.name}</h2>
                  <p className="text-[13px] text-muted-light dark:text-slate-400 mt-1">{p.suburb}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-[19px] text-navy dark:text-white tracking-tight">
                    ${p.hourlyRate}<span className="text-[13px] font-semibold text-muted-light dark:text-slate-400">/hr</span>
                  </div>
                  {p.isVerified
                    ? <span className="text-green-700 dark:text-green-400 text-[11px] font-bold">✓ Verified</span>
                    : <span className="text-amber-600 dark:text-amber-400 text-[11px] font-bold">⏳ Pending review</span>}
                </div>
              </div>

              <p className="text-[14px] text-muted-dark dark:text-slate-300 leading-relaxed flex-1 mb-3.5">{p.bio}</p>

              <div className="mb-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-lighter dark:text-slate-500 mb-1.5">Strengths</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.badges.map((b, i) => (
                    <span key={b} className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${BADGE_COLORS[i % BADGE_COLORS.length]}`}>
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-lighter dark:text-slate-500 mb-1.5">Specialties</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.specialties.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-full text-[12px] bg-surface-muted dark:bg-slate-700 text-muted-dark dark:text-slate-300">{s}</span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-[13px] text-muted-light dark:text-slate-400">
                <span>{p.availability}</span>
                <Link
                  href="/checkout"
                  className="bg-brand-gradient text-white px-4 py-2 rounded-[10px] font-bold text-[13px] no-underline shadow-brand-sm hover:opacity-90 transition-opacity"
                >
                  Book now
                </Link>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-[18px] p-10 text-center border border-surface-border dark:border-slate-700">
            <div className="text-[32px] mb-3">{catMeta.icon}</div>
            <div className="font-bold text-navy dark:text-white mb-2">No {category.toLowerCase()} match those filters</div>
            <div className="text-muted-light dark:text-slate-400 text-sm">Try widening your suburb search or increasing the rate slider.</div>
          </div>
        )}
      </section>

      <AppTour />
    </main>
  );
}
