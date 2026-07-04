'use client';

import { useEffect, useState } from 'react';
import { useDataStore } from '../context/DataStoreContext';
import type { DSWorker } from '../lib/dataStore';

const ALL_STRENGTHS = [
  { label: 'Highly Punctual',                     category: 'reliability'   },
  { label: 'Consistently Present',                category: 'reliability'   },
  { label: 'Great with Non-Verbal Communication', category: 'communication' },
  { label: 'Active Listener',                     category: 'communication' },
  { label: 'Calm in High-Stress Situations',      category: 'care'          },
  { label: 'Person-Centred Approach',             category: 'care'          },
  { label: 'Pet Friendly',                        category: 'skills'        },
  { label: 'Dual Language Speaker',               category: 'skills'        },
  { label: 'NDIS Approved',                       category: 'certification' },
  { label: 'Manual Handling Certified',           category: 'certification' },
  { label: 'Positive Behaviour Support Trained',  category: 'certification' },
  { label: 'First Aid Certified',                 category: 'certification' },
];

const CAT_STYLE: Record<string, string> = {
  reliability:   'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  communication: 'bg-purple-50 dark:bg-purple-900/25 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  care:          'bg-green-50 dark:bg-green-900/25 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  skills:        'bg-orange-50 dark:bg-orange-900/25 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  certification: 'bg-teal-50 dark:bg-teal-900/25 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
};

const DAYS_SHORT  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOT_LABELS = ['Morning\n7–12', 'Afternoon\n12–17', 'Evening\n17–22'];

interface Props {
  workerId: string;
}

export default function WorkerProfileEditor({ workerId }: Props) {
  const { store, updateWorkerProfile } = useDataStore();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const worker = store.workers.find((w) => w.id === workerId);

  const [bio,       setBio]       = useState(worker?.bio       ?? '');
  const [suburb,    setSuburb]    = useState(worker?.suburb    ?? '');
  const [hourlyRate, setHourlyRate] = useState(worker?.hourlyRate ?? 92);
  const [strengths, setStrengths] = useState<string[]>(worker?.strengths ?? []);
  const [avail,     setAvail]     = useState<boolean[][]>(
    worker?.availability ?? Array.from({ length: 7 }, () => [false, false, false]),
  );

  // Sync if worker loads after initial render
  useEffect(() => {
    if (!worker) return;
    setBio(worker.bio);
    setSuburb(worker.suburb);
    setHourlyRate(worker.hourlyRate);
    setStrengths(worker.strengths);
    setAvail(worker.availability.map((d) => [...d]));
  }, [worker]);

  if (!worker) return null;

  const toggleStrength = (label: string) =>
    setStrengths((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    );

  const toggleSlot = (day: number, slot: number) =>
    setAvail((prev) => {
      const next = prev.map((d) => [...d]);
      next[day][slot] = !next[day][slot];
      return next;
    });

  const handleSave = () => {
    updateWorkerProfile(workerId, { bio, suburb, hourlyRate, strengths, availability: avail });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const availableSlotCount = avail.reduce((sum, day) => sum + day.filter(Boolean).length, 0);

  return (
    <div className="card-lg">
      {/* Header row */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">Edit Your Profile</h2>
          <p className="text-muted-light dark:text-slate-400 text-sm mt-1">
            Update your strength profile and roster availability grid.
          </p>
        </div>
        <button
          onClick={() => setOpen((p) => !p)}
          className="px-4 py-2 rounded-[12px] border border-surface-divider dark:border-slate-600 bg-white dark:bg-slate-700 text-muted-dark dark:text-slate-300 font-bold text-[13px] cursor-pointer hover:bg-surface-muted dark:hover:bg-slate-600 transition-colors"
        >
          {open ? '▲ Collapse' : '▼ Expand editor'}
        </button>
      </div>

      {/* Summary chips (always visible) */}
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="badge badge-brand">${worker.hourlyRate}/hr</span>
        <span className="badge badge-green">{worker.strengths.length} strengths</span>
        <span className="badge badge-amber">{availableSlotCount} time slots open</span>
        {worker.backgroundCheckVerified
          ? <span className="badge badge-green">✓ Background checked</span>
          : <span className="badge badge-red">⚠ Check pending</span>}
      </div>

      {open && (
        <div className="mt-5 grid gap-5 animate-slide-up">
          {/* Bio */}
          <label className="flex flex-col gap-2 font-semibold text-sm text-navy dark:text-slate-200">
            Professional bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="form-input resize-none font-normal"
              placeholder="Describe your experience, approach, and what makes you great…"
            />
          </label>

          {/* Rate + Suburb */}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label className="flex flex-col gap-2 font-semibold text-sm text-navy dark:text-slate-200">
              Suburb
              <input
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                className="form-input font-normal"
                placeholder="e.g. Northbridge"
              />
            </label>
            <label className="flex flex-col gap-2 font-semibold text-sm text-navy dark:text-slate-200">
              Hourly rate (AUD)
              <div className="flex items-center gap-3">
                <input
                  type="range" min="60" max="250" step="2"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="accent-brand flex-1"
                />
                <span className="font-extrabold text-brand min-w-[56px] text-right">${hourlyRate}</span>
              </div>
              <div className="text-[11px] text-muted-lighter dark:text-slate-500">
                Participant pays ${(hourlyRate * 1.05).toFixed(2)}/hr · You receive ${(hourlyRate * 0.925).toFixed(2)}/hr
              </div>
            </label>
          </div>

          {/* Strength badges */}
          <div>
            <div className="font-semibold text-sm text-navy dark:text-slate-200 mb-3">
              Strength profile <span className="text-muted-lighter dark:text-slate-500 font-normal">— tap to toggle</span>
            </div>
            <div className="grid gap-3">
              {Object.keys(CAT_STYLE).map((cat) => {
                const catBadges = ALL_STRENGTHS.filter((s) => s.category === cat);
                return (
                  <div key={cat}>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-lighter dark:text-slate-500 mb-2 capitalize">{cat}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {catBadges.map((s) => {
                        const active = strengths.includes(s.label);
                        return (
                          <button
                            key={s.label}
                            onClick={() => toggleStrength(s.label)}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer transition-all ${
                              active
                                ? CAT_STYLE[cat]
                                : 'bg-white dark:bg-slate-700 text-muted-light dark:text-slate-400 border-surface-border dark:border-slate-600 opacity-50 hover:opacity-80'
                            }`}
                          >
                            {active ? '✓ ' : ''}{s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Availability grid */}
          <div>
            <div className="font-semibold text-sm text-navy dark:text-slate-200 mb-3">
              Roster availability <span className="text-muted-lighter dark:text-slate-500 font-normal">— tap cells to toggle</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '420px' }}>
                <thead>
                  <tr>
                    <th className="w-[70px]" />
                    {DAYS_SHORT.map((d) => (
                      <th key={d} className="text-center text-[11px] font-bold text-muted-lighter dark:text-slate-500 pb-2 uppercase tracking-wider">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOT_LABELS.map((slotLabel, si) => (
                    <tr key={si}>
                      <td className="pr-2 py-1">
                        <div className="text-[10px] text-muted-lighter dark:text-slate-500 font-semibold whitespace-pre leading-tight">
                          {slotLabel}
                        </div>
                      </td>
                      {DAYS_SHORT.map((_, di) => {
                        const on = avail[di]?.[si] ?? false;
                        return (
                          <td key={di} className="p-1 text-center">
                            <button
                              onClick={() => toggleSlot(di, si)}
                              aria-pressed={on}
                              className={`w-full h-[32px] rounded-[8px] border cursor-pointer transition-all text-[11px] font-bold ${
                                on
                                  ? 'bg-brand-gradient text-white border-transparent shadow-brand-sm'
                                  : 'bg-surface-muted dark:bg-slate-700 text-muted-lighter dark:text-slate-500 border-surface-border dark:border-slate-600 hover:border-brand/30'
                              }`}
                            >
                              {on ? '✓' : '–'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className={`w-full py-3.5 rounded-[14px] border-none font-extrabold text-[15px] cursor-pointer transition-all ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-brand-gradient text-white shadow-brand hover:opacity-95'
            }`}
          >
            {saved ? '✓ Profile saved!' : 'Save profile'}
          </button>
        </div>
      )}
    </div>
  );
}
