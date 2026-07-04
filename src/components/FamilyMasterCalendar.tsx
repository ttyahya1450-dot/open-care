'use client';

import { useState } from 'react';
import { useDataStore } from '../context/DataStoreContext';

type ServiceFilter = 'all' | 'support' | 'cleaner' | 'gardener' | 'ot';

const SERVICE_META: Record<string, { label: string; color: string; bg: string; darkBg: string; icon: string }> = {
  support:  { label: 'Support Worker', color: '#3f6df6', bg: 'bg-brand-xlight border-brand/20',         darkBg: 'dark:bg-brand/15 dark:border-brand/30',        icon: '🤝' },
  cleaner:  { label: 'Cleaning',       color: '#10b981', bg: 'bg-green-50 border-green-200',            darkBg: 'dark:bg-green-900/25 dark:border-green-800',   icon: '🧹' },
  gardener: { label: 'Gardening',      color: '#f59e0b', bg: 'bg-amber-50 border-amber-200',            darkBg: 'dark:bg-amber-900/25 dark:border-amber-800',   icon: '🌿' },
  ot:       { label: 'Occupational Therapy', color: '#8b5cf6', bg: 'bg-purple-50 border-purple-200',   darkBg: 'dark:bg-purple-900/25 dark:border-purple-800', icon: '🏥' },
};

const DAYS   = ['Mon 30', 'Tue 1', 'Wed 2', 'Thu 3', 'Fri 4', 'Sat 5', 'Sun 6'];
const MONTHS: Record<string, string> = { '30': 'Jun', '1': 'Jul', '2': 'Jul', '3': 'Jul', '4': 'Jul', '5': 'Jul', '6': 'Jul' };

interface CalEvent {
  id: string;
  dayIdx: number;
  workerName: string;
  workerInitials: string;
  category: string;
  serviceType: string;
  timeStart: string;
  timeEnd: string;
  participantId: string;
}

const CALENDAR_EVENTS: CalEvent[] = [
  { id: 'e1', dayIdx: 0, workerName: 'Maya Chen',     workerInitials: 'MC', category: 'support',  serviceType: 'Personal Care',    timeStart: '09:00', timeEnd: '12:00', participantId: 'p1' },
  { id: 'e2', dayIdx: 0, workerName: 'Sam Okafor',    workerInitials: 'SO', category: 'cleaner',  serviceType: 'Deep Clean',       timeStart: '13:00', timeEnd: '15:00', participantId: 'p1' },
  { id: 'e3', dayIdx: 1, workerName: 'Daniel Brooks', workerInitials: 'DB', category: 'support',  serviceType: 'Community Access', timeStart: '10:00', timeEnd: '14:00', participantId: 'p1' },
  { id: 'e4', dayIdx: 2, workerName: 'Maya Chen',     workerInitials: 'MC', category: 'support',  serviceType: 'Meal Prep',        timeStart: '10:00', timeEnd: '13:00', participantId: 'p1' },
  { id: 'e5', dayIdx: 2, workerName: 'Leo Fernandez', workerInitials: 'LF', category: 'gardener', serviceType: 'Lawn Mowing',      timeStart: '09:30', timeEnd: '11:30', participantId: 'p1' },
  { id: 'e6', dayIdx: 3, workerName: 'Dr. Rachel Tran', workerInitials: 'RT', category: 'ot',    serviceType: 'OT Assessment',    timeStart: '14:00', timeEnd: '15:00', participantId: 'p1' },
  { id: 'e7', dayIdx: 4, workerName: 'Maya Chen',     workerInitials: 'MC', category: 'support',  serviceType: 'Wellbeing Check',  timeStart: '14:00', timeEnd: '16:00', participantId: 'p1' },
  { id: 'e8', dayIdx: 4, workerName: 'Sam Okafor',    workerInitials: 'SO', category: 'cleaner',  serviceType: 'Laundry & Ironing', timeStart: '09:00', timeEnd: '10:30', participantId: 'p1' },
];

export default function FamilyMasterCalendar() {
  const { store } = useDataStore();
  const [filter, setFilter] = useState<ServiceFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  void store;

  const visible = filter === 'all'
    ? CALENDAR_EVENTS
    : CALENDAR_EVENTS.filter((e) => e.category === filter);

  const getEvents = (dayIdx: number) => visible.filter((e) => e.dayIdx === dayIdx);

  const selected = CALENDAR_EVENTS.find((e) => e.id === selectedId);

  const weeklyHours = CALENDAR_EVENTS.reduce((sum, e) => {
    const [sh, sm] = e.timeStart.split(':').map(Number);
    const [eh, em] = e.timeEnd.split(':').map(Number);
    return sum + (eh + em / 60) - (sh + sm / 60);
  }, 0);

  return (
    <div className="card-lg">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-5">
        <div>
          <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">Family Master Calendar</h2>
          <p className="text-[13px] text-muted-light dark:text-slate-400 mt-1.5">
            All ecosystem services for Alex Morgan · Week of 30 Jun – 6 Jul 2026
          </p>
        </div>
        <div className="flex gap-2.5">
          <div className="bg-surface dark:bg-slate-700 rounded-xl px-3.5 py-2 text-center border border-surface-border dark:border-slate-600">
            <div className="text-[16px] font-extrabold text-navy dark:text-white">{CALENDAR_EVENTS.length}</div>
            <div className="text-[10px] text-muted-lighter dark:text-slate-500 font-semibold">Services</div>
          </div>
          <div className="bg-brand-xlight dark:bg-brand/15 rounded-xl px-3.5 py-2 text-center border border-brand-border dark:border-brand/30">
            <div className="text-[16px] font-extrabold text-brand">{weeklyHours.toFixed(1)}h</div>
            <div className="text-[10px] text-brand font-semibold">This week</div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(['all', 'support', 'cleaner', 'gardener', 'ot'] as ServiceFilter[]).map((f) => {
          const meta = f === 'all' ? null : SERVICE_META[f];
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] border font-bold text-[12px] cursor-pointer transition-all capitalize ${
                active
                  ? 'bg-brand-gradient text-white border-transparent shadow-brand-sm'
                  : 'bg-white dark:bg-slate-800 text-muted-dark dark:text-slate-300 border-surface-border dark:border-slate-700 hover:border-brand/30'
              }`}
            >
              {meta ? <span>{meta.icon}</span> : <span>🗓</span>}
              {meta ? meta.label : 'All services'}
            </button>
          );
        })}
      </div>

      {/* Mobile: vertical day list */}
      <div className="md:hidden flex flex-col divide-y divide-surface-border dark:divide-slate-700 rounded-2xl border border-surface-border dark:border-slate-700 overflow-hidden">
        {DAYS.map((d, dayIdx) => {
          const [day, date] = d.split(' ');
          const events = getEvents(dayIdx);
          return (
            <div key={d} className="px-3.5 py-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-muted-lighter dark:text-slate-500">{day}</span>
                <span className="text-[12px] font-bold text-navy dark:text-slate-200">{MONTHS[date]} {date}</span>
              </div>
              {events.length === 0 ? (
                <span className="text-[10px] text-muted-lighter dark:text-slate-600">Free</span>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {events.map((ev) => {
                    const meta = SERVICE_META[ev.category];
                    const isSel = selectedId === ev.id;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedId(isSel ? null : ev.id)}
                        className={`w-full text-left px-3 py-2 rounded-[9px] border cursor-pointer transition-all ${meta.bg} ${meta.darkBg} ${isSel ? 'ring-2 ring-offset-1 ring-brand/40' : ''}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[11px]">{meta.icon}</span>
                          <span className="text-[10px] font-extrabold" style={{ color: meta.color }}>{ev.workerInitials}</span>
                          <span className="text-[10px] font-bold text-navy dark:text-white truncate">{ev.serviceType}</span>
                        </div>
                        <div className="text-[9px] text-muted-light dark:text-slate-400">{ev.timeStart}–{ev.timeEnd}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: 7-column grid — minmax(0,1fr) prevents column overflow */}
      <div className="hidden md:block rounded-2xl border border-surface-border dark:border-slate-700 overflow-hidden">
        <div
          className="grid border-b border-surface-border dark:border-slate-700 bg-surface dark:bg-slate-800"
          style={{ gridTemplateColumns: `repeat(${DAYS.length}, minmax(0, 1fr))` }}
        >
          {DAYS.map((d, i) => {
            const [day, date] = d.split(' ');
            return (
              <div key={d} className={`px-2.5 py-2.5 text-center ${i < DAYS.length - 1 ? 'border-r border-surface-border dark:border-slate-700' : ''}`}>
                <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-muted-lighter dark:text-slate-500">{day}</div>
                <div className="text-[13px] font-bold text-navy dark:text-slate-200 mt-0.5">{MONTHS[date]} {date}</div>
              </div>
            );
          })}
        </div>
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${DAYS.length}, minmax(0, 1fr))` }}
        >
          {DAYS.map((_, dayIdx) => {
            const events = getEvents(dayIdx);
            return (
              <div
                key={dayIdx}
                className={`min-h-[140px] p-1.5 flex flex-col gap-1.5 ${dayIdx < DAYS.length - 1 ? 'border-r border-surface-border dark:border-slate-700' : ''} bg-white dark:bg-slate-900`}
              >
                {events.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[10px] text-muted-lighter dark:text-slate-600">Free</span>
                  </div>
                ) : (
                  events.map((ev) => {
                    const meta = SERVICE_META[ev.category];
                    const isSel = selectedId === ev.id;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedId(isSel ? null : ev.id)}
                        className={`w-full text-left p-2 rounded-[9px] border cursor-pointer transition-all ${meta.bg} ${meta.darkBg} ${isSel ? 'ring-2 ring-offset-1 ring-brand/40' : ''}`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[11px]">{meta.icon}</span>
                          <span className="text-[10px] font-extrabold truncate" style={{ color: meta.color }}>
                            {ev.workerInitials}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-navy dark:text-white leading-tight truncate">{ev.serviceType}</div>
                        <div className="text-[9px] text-muted-light dark:text-slate-400 mt-0.5">{ev.timeStart}–{ev.timeEnd}</div>
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected event detail */}
      {selected && (() => {
        const meta = SERVICE_META[selected.category];
        const [sh, sm] = selected.timeStart.split(':').map(Number);
        const [eh, em] = selected.timeEnd.split(':').map(Number);
        const hrs = (eh + em / 60) - (sh + sm / 60);
        return (
          <div
            className={`mt-4 rounded-[18px] p-4 border flex justify-between items-center flex-wrap gap-3 animate-slide-up ${meta.bg} ${meta.darkBg}`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[16px]">{meta.icon}</span>
                <span className="font-bold text-[14px] text-navy dark:text-white">
                  {selected.workerName} · {selected.serviceType}
                </span>
                <span className="badge text-[11px] font-bold px-2.5 py-1 rounded-full border" style={{ color: meta.color, borderColor: `${meta.color}40`, background: `${meta.color}18` }}>
                  {meta.label}
                </span>
              </div>
              <div className="text-[13px] text-muted-light dark:text-slate-400">
                {DAYS[selected.dayIdx]} · {selected.timeStart}–{selected.timeEnd} · {hrs}h
              </div>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="px-3.5 py-2 rounded-[10px] border border-surface-divider dark:border-slate-600 bg-white dark:bg-slate-800 text-muted-light dark:text-slate-400 font-semibold text-xs cursor-pointer hover:bg-surface-muted dark:hover:bg-slate-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        );
      })()}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-surface-border dark:border-slate-700">
        {Object.entries(SERVICE_META).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="text-[13px]">{meta.icon}</span>
            <span className="text-[11px] font-semibold text-muted-dark dark:text-slate-300">{meta.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
