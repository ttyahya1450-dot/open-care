'use client';

import { useState } from 'react';

interface WorkerShift {
  id: string;
  dayIdx: number;
  participant: string;
  initials: string;
  timeStart: string;
  timeEnd: string;
  serviceType: string;
  status: 'confirmed' | 'pending' | 'completed';
  location: string;
  rate: number;
}

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DATES = ['30 Jun', '1 Jul', '2 Jul', '3 Jul', '4 Jul', '5 Jul', '6 Jul'];
const TODAY_IDX = 0;

const MOCK_SHIFTS: WorkerShift[] = [
  { id: 's1', dayIdx: 0, participant: 'Alex Morgan',  initials: 'AM', timeStart: '09:00', timeEnd: '12:00', serviceType: 'Personal Care',    status: 'completed', location: 'Northbridge, NSW',  rate: 92  },
  { id: 's2', dayIdx: 1, participant: 'Jordan Lee',   initials: 'JL', timeStart: '13:00', timeEnd: '17:00', serviceType: 'Community Access', status: 'confirmed', location: 'Surry Hills, NSW',  rate: 110 },
  { id: 's3', dayIdx: 2, participant: 'Alex Morgan',  initials: 'AM', timeStart: '10:00', timeEnd: '13:00', serviceType: 'Meal Prep',        status: 'confirmed', location: 'Northbridge, NSW',  rate: 92  },
  { id: 's4', dayIdx: 3, participant: 'Riley Nguyen', initials: 'RN', timeStart: '08:30', timeEnd: '12:30', serviceType: 'Exercise Support', status: 'pending',   location: 'Parramatta, NSW',   rate: 84  },
  { id: 's5', dayIdx: 4, participant: 'Alex Morgan',  initials: 'AM', timeStart: '14:00', timeEnd: '16:00', serviceType: 'Wellbeing Check',  status: 'confirmed', location: 'Northbridge, NSW',  rate: 92  },
  { id: 's6', dayIdx: 5, participant: 'Jordan Lee',   initials: 'JL', timeStart: '10:00', timeEnd: '12:00', serviceType: 'Social Support',   status: 'pending',   location: 'Surry Hills, NSW',  rate: 110 },
];

const STATUS_PILL = {
  confirmed:  'bg-brand-xlight dark:bg-brand/20 border-brand/30 text-brand-mid',
  pending:    'bg-amber-50 dark:bg-amber-900/25 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
  completed:  'bg-green-50 dark:bg-green-900/25 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
};

const STATUS_DOT = {
  confirmed:  'bg-brand',
  pending:    'bg-amber-400',
  completed:  'bg-green-500',
};

const STATUS_LABEL = {
  confirmed:  'Confirmed',
  pending:    'Pending',
  completed:  'Completed',
};

export default function WorkerCalendar() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const weekGross = MOCK_SHIFTS.reduce((sum, s) => {
    const [sh, sm] = s.timeStart.split(':').map(Number);
    const [eh, em] = s.timeEnd.split(':').map(Number);
    const hrs = (eh + em / 60) - (sh + sm / 60);
    return sum + hrs * s.rate * 0.925;
  }, 0);

  const totalHrs = MOCK_SHIFTS.reduce((sum, s) => {
    const [sh, sm] = s.timeStart.split(':').map(Number);
    const [eh, em] = s.timeEnd.split(':').map(Number);
    return sum + ((eh + em / 60) - (sh + sm / 60));
  }, 0);

  return (
    <div id="worker-calendar" className="card-lg">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">My Roster — Week of 30 Jun</h2>
          <p className="text-muted-light dark:text-slate-400 text-sm mt-1.5">
            Tap any shift to see details. Times shown in your local timezone.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-surface dark:bg-slate-700 rounded-xl px-4 py-2.5 border border-surface-border dark:border-slate-600 text-center">
            <div className="text-[17px] font-extrabold text-navy dark:text-white tracking-tight">{totalHrs.toFixed(1)}h</div>
            <div className="text-[10px] text-muted-lighter dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">This week</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/25 rounded-xl px-4 py-2.5 border border-green-200 dark:border-green-800 text-center">
            <div className="text-[17px] font-extrabold text-green-700 dark:text-green-400 tracking-tight">${weekGross.toFixed(0)}</div>
            <div className="text-[10px] text-green-600 dark:text-green-500 font-bold uppercase tracking-wider mt-0.5">Est. payout</div>
          </div>
        </div>
      </div>

      {/* Mobile: vertical day list */}
      <div className="md:hidden flex flex-col divide-y divide-surface-border dark:divide-slate-700 rounded-2xl border border-surface-border dark:border-slate-700 overflow-hidden">
        {DAYS.map((day, i) => {
          const dayShifts = MOCK_SHIFTS.filter((s) => s.dayIdx === i);
          return (
            <div key={day} className={`px-3.5 py-3 ${i === TODAY_IDX ? 'bg-brand-xlight/30 dark:bg-brand/5' : 'bg-white dark:bg-slate-900'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-extrabold uppercase tracking-[0.07em] ${i === TODAY_IDX ? 'text-brand' : 'text-muted-lighter dark:text-slate-500'}`}>{day}</span>
                  <span className={`text-[12px] font-bold ${i === TODAY_IDX ? 'text-brand-mid' : 'text-muted-dark dark:text-slate-300'}`}>{DATES[i]}</span>
                </div>
                {i === TODAY_IDX && (
                  <span className="text-[9px] font-bold text-brand uppercase tracking-wider bg-brand-xlight dark:bg-brand/20 px-1.5 py-0.5 rounded-full">Today</span>
                )}
              </div>
              {dayShifts.length === 0 ? (
                <span className="text-[11px] text-muted-lighter dark:text-slate-600">Free</span>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {dayShifts.map((shift) => (
                    <button
                      key={shift.id}
                      onClick={() => toggle(shift.id)}
                      className={`w-full text-left px-3 py-2 rounded-[10px] border cursor-pointer transition-all text-[11px] font-semibold leading-snug ${STATUS_PILL[shift.status]} ${expandedId === shift.id ? 'ring-2 ring-brand/30' : ''}`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[shift.status]}`} />
                        <span className="truncate">{shift.participant}</span>
                      </div>
                      <div className="text-[10px] opacity-70 font-medium">{shift.timeStart}–{shift.timeEnd}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: 7-column grid — columns use minmax(0,1fr) so they compress instead of overflowing */}
      <div
        className="hidden md:grid rounded-2xl border border-surface-border dark:border-slate-700 overflow-hidden"
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
      >
        {/* Day headers */}
        {DAYS.map((day, i) => (
          <div
            key={day}
            className={`text-center py-2.5 border-b border-surface-border dark:border-slate-700 ${
              i === TODAY_IDX ? 'bg-brand-xlight dark:bg-brand/15' : 'bg-surface-muted dark:bg-slate-800'
            }`}
          >
            <div className={`text-[11px] font-extrabold uppercase tracking-[0.07em] ${i === TODAY_IDX ? 'text-brand' : 'text-muted-lighter dark:text-slate-500'}`}>
              {day}
            </div>
            <div className={`text-[13px] font-bold mt-0.5 ${i === TODAY_IDX ? 'text-brand-mid' : 'text-muted-dark dark:text-slate-300'}`}>
              {DATES[i]}
            </div>
            {i === TODAY_IDX && (
              <div className="text-[9px] font-bold text-brand uppercase tracking-wider mt-0.5">Today</div>
            )}
          </div>
        ))}

        {/* Shift cells */}
        {DAYS.map((_, dayI) => {
          const dayShifts = MOCK_SHIFTS.filter((s) => s.dayIdx === dayI);
          return (
            <div
              key={dayI}
              className={`min-h-[120px] p-1.5 border-r border-surface-border dark:border-slate-700 last:border-r-0 flex flex-col gap-1.5 ${
                dayI === TODAY_IDX ? 'bg-brand-xlight/30 dark:bg-brand/5' : 'bg-white dark:bg-slate-900'
              }`}
            >
              {dayShifts.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-[10px] text-muted-lighter dark:text-slate-600 font-medium">Free</span>
                </div>
              ) : (
                dayShifts.map((shift) => (
                  <button
                    key={shift.id}
                    onClick={() => toggle(shift.id)}
                    className={`w-full text-left p-2 rounded-[10px] border cursor-pointer transition-all text-[11px] font-semibold leading-snug ${STATUS_PILL[shift.status]} ${expandedId === shift.id ? 'ring-2 ring-brand/30' : ''}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[shift.status]}`} />
                      <span className="truncate">{shift.participant}</span>
                    </div>
                    <div className="text-[10px] opacity-70 font-medium">{shift.timeStart}–{shift.timeEnd}</div>
                  </button>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded shift detail */}
      {expandedId && (() => {
        const s = MOCK_SHIFTS.find((x) => x.id === expandedId)!;
        const [sh, sm] = s.timeStart.split(':').map(Number);
        const [eh, em] = s.timeEnd.split(':').map(Number);
        const hrs    = (eh + em / 60) - (sh + sm / 60);
        const payout = (hrs * s.rate * 0.925).toFixed(2);
        return (
          <div className="mt-4 bg-surface dark:bg-slate-700 rounded-[18px] p-4 border border-surface-border dark:border-slate-600 animate-slide-up">
            <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
              <div>
                <div className="font-bold text-[15px] text-navy dark:text-white">{s.serviceType} · {s.participant}</div>
                <div className="text-[13px] text-muted-light dark:text-slate-400 mt-0.5">{DAYS[s.dayIdx]} {DATES[s.dayIdx]} · {s.timeStart}–{s.timeEnd} · {hrs}h</div>
                <div className="text-[12px] text-muted-lighter dark:text-slate-500 mt-0.5">📍 {s.location}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_PILL[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                </span>
                <div className="text-[13px] font-bold text-green-700 dark:text-green-400">Est. payout: ${payout}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Hourly rate',    value: `$${s.rate}` },
                { label: 'Duration',       value: `${hrs}h` },
                { label: 'Payout (92.5%)', value: `$${payout}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-surface-border dark:border-slate-600">
                  <div className="text-[10px] text-muted-lighter dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5">{label}</div>
                  <div className="text-[14px] font-extrabold text-navy dark:text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Status legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-surface-border dark:border-slate-700">
        {(Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[s]}`} />
            <span className="text-[12px] text-muted-dark dark:text-slate-300 font-semibold">{STATUS_LABEL[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
