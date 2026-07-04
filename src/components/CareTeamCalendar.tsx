'use client';

import { useState } from 'react';

interface CalendarShift {
  id: string; participantId: string; participantName: string;
  workerId: string; workerName: string; workerColor: string; workerInitials: string;
  dayIndex: number; startHour: number; endHour: number;
  isSwapRequested?: boolean; isLastMinute?: boolean;
}

const DAYS = ['Mon 29', 'Tue 30', 'Wed 1', 'Thu 2', 'Fri 3', 'Sat 4', 'Sun 5'];

const PARTICIPANTS = [
  { id: 'p1', name: 'Alex Morgan',  color: '#3f6df6' },
  { id: 'p2', name: 'Jordan Lee',   color: '#8b5cf6' },
  { id: 'p3', name: 'Riley Nguyen', color: '#f59e0b' },
];

const SHIFTS: CalendarShift[] = [
  { id: 's1', participantId: 'p1', participantName: 'Alex Morgan',  workerId: 'w1', workerName: 'Maya Chen',     workerColor: '#3f6df6', workerInitials: 'MC', dayIndex: 0, startHour: 9,  endHour: 12 },
  { id: 's2', participantId: 'p1', participantName: 'Alex Morgan',  workerId: 'w1', workerName: 'Maya Chen',     workerColor: '#3f6df6', workerInitials: 'MC', dayIndex: 2, startHour: 14, endHour: 17 },
  { id: 's3', participantId: 'p1', participantName: 'Alex Morgan',  workerId: 'w3', workerName: 'Aisha Rahman',  workerColor: '#10b981', workerInitials: 'AR', dayIndex: 4, startHour: 9,  endHour: 12, isSwapRequested: true },
  { id: 's4', participantId: 'p2', participantName: 'Jordan Lee',   workerId: 'w2', workerName: 'Daniel Brooks', workerColor: '#f59e0b', workerInitials: 'DB', dayIndex: 1, startHour: 10, endHour: 14 },
  { id: 's5', participantId: 'p2', participantName: 'Jordan Lee',   workerId: 'w2', workerName: 'Daniel Brooks', workerColor: '#f59e0b', workerInitials: 'DB', dayIndex: 3, startHour: 9,  endHour: 13 },
  { id: 's6', participantId: 'p2', participantName: 'Jordan Lee',   workerId: 'w1', workerName: 'Maya Chen',     workerColor: '#3f6df6', workerInitials: 'MC', dayIndex: 5, startHour: 10, endHour: 13, isLastMinute: true },
  { id: 's7', participantId: 'p3', participantName: 'Riley Nguyen', workerId: 'w3', workerName: 'Aisha Rahman',  workerColor: '#10b981', workerInitials: 'AR', dayIndex: 0, startHour: 13, endHour: 17 },
  { id: 's8', participantId: 'p3', participantName: 'Riley Nguyen', workerId: 'w3', workerName: 'Aisha Rahman',  workerColor: '#10b981', workerInitials: 'AR', dayIndex: 2, startHour: 9,  endHour: 12, isSwapRequested: true },
  { id: 's9', participantId: 'p3', participantName: 'Riley Nguyen', workerId: 'w2', workerName: 'Daniel Brooks', workerColor: '#f59e0b', workerInitials: 'DB', dayIndex: 4, startHour: 13, endHour: 16 },
];

function ShiftPill({ shift, selected, onSelect }: { shift: CalendarShift; selected: boolean; onSelect: (s: CalendarShift) => void }) {
  return (
    <button
      onClick={() => onSelect(shift)}
      className="w-full text-left rounded-[10px] px-2 py-1.5 mb-1.5 cursor-pointer transition-colors font-sans"
      style={{
        border: shift.isSwapRequested ? `2px dashed ${shift.workerColor}` : `2px solid ${shift.workerColor}33`,
        background: selected ? `${shift.workerColor}22` : `${shift.workerColor}11`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <div
          className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-white font-extrabold shrink-0"
          style={{ fontSize: '8px', background: shift.workerColor }}
        >
          {shift.workerInitials}
        </div>
        <span className="text-[11px] font-bold text-navy dark:text-white leading-none">{shift.workerName.split(' ')[0]}</span>
        {shift.isSwapRequested && (
          <span className="ml-auto text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold shrink-0">⇄ Swap</span>
        )}
        {shift.isLastMinute && (
          <span className="ml-auto text-[10px] bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-400 px-1.5 py-0.5 rounded-full font-bold shrink-0">⚡ Now</span>
        )}
      </div>
      <span className="text-[11px] text-muted-light dark:text-slate-400 font-semibold">
        {shift.startHour}:00–{shift.endHour}:00 · {shift.endHour - shift.startHour}h
      </span>
    </button>
  );
}

export default function CareTeamCalendar() {
  const [selectedShift, setSelectedShift] = useState<CalendarShift | null>(null);

  const getShifts = (pid: string, day: number) =>
    SHIFTS.filter((s) => s.participantId === pid && s.dayIndex === day);

  const swapCount = SHIFTS.filter((s) => s.isSwapRequested).length;

  return (
    <div id="care-calendar" className="card-lg">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">Care Team Shared Calendar</h2>
          <p className="text-[13px] text-muted-light dark:text-slate-400 mt-1.5">Week of 29 Jun – 5 Jul 2026 · All participants &amp; workers</p>
        </div>
        <div className="flex gap-2.5">
          <div className="bg-surface dark:bg-slate-700 rounded-xl px-3.5 py-2.5 text-center border border-surface-border dark:border-slate-600">
            <div className="text-[18px] font-extrabold text-navy dark:text-white">{SHIFTS.length}</div>
            <div className="text-[11px] text-muted-light dark:text-slate-400 font-semibold">Shifts</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/25 rounded-xl px-3.5 py-2.5 text-center border border-amber-200 dark:border-amber-800">
            <div className="text-[18px] font-extrabold text-amber-800 dark:text-amber-400">{swapCount}</div>
            <div className="text-[11px] text-amber-700 dark:text-amber-500 font-semibold">Swap requests</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap mb-4">
        {[
          { label: 'Maya Chen',     color: '#3f6df6', initials: 'MC' },
          { label: 'Daniel Brooks', color: '#f59e0b', initials: 'DB' },
          { label: 'Aisha Rahman',  color: '#10b981', initials: 'AR' },
        ].map((w) => (
          <div key={w.label} className="flex items-center gap-1.5">
            <div
              className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white font-extrabold"
              style={{ fontSize: '9px', background: w.color }}
            >
              {w.initials}
            </div>
            <span className="text-xs font-semibold text-muted-dark dark:text-slate-300">{w.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-[22px] h-[10px] border-2 border-dashed border-amber-400 rounded-[4px]" />
          <span className="text-xs font-semibold text-muted-dark dark:text-slate-300">Swap requested</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400 font-bold px-2 py-0.5 rounded-full">⚡ Now</span>
          <span className="text-xs font-semibold text-muted-dark dark:text-slate-300">Last-minute</span>
        </div>
      </div>

      {/* Mobile: one card per participant, days stacked vertically */}
      <div className="md:hidden flex flex-col gap-3">
        {PARTICIPANTS.map((p) => (
          <div key={p.id} className="rounded-2xl border border-surface-border dark:border-slate-700 overflow-hidden">
            <div className="bg-surface dark:bg-slate-800 px-3.5 py-2.5 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="font-bold text-sm text-navy dark:text-white">{p.name}</span>
            </div>
            <div className="flex flex-col divide-y divide-surface-border dark:divide-slate-700">
              {DAYS.map((d, di) => {
                const dayShifts = getShifts(p.id, di);
                return (
                  <div key={di} className="px-3.5 py-2.5 flex items-start gap-3 bg-white dark:bg-slate-900">
                    <span className="text-[11px] font-bold text-muted-light dark:text-slate-400 w-[56px] shrink-0 mt-0.5">{d}</span>
                    {dayShifts.length === 0 ? (
                      <span className="text-[10px] text-muted-lighter dark:text-slate-500 mt-1">—</span>
                    ) : (
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        {dayShifts.map((s) => (
                          <ShiftPill
                            key={s.id}
                            shift={s}
                            selected={selectedShift?.id === s.id}
                            onSelect={(sh) => setSelectedShift(selectedShift?.id === sh.id ? null : sh)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: grid table — no min-width so columns compress to fit viewport */}
      <div className="hidden md:block rounded-2xl border border-surface-border dark:border-slate-700 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface dark:bg-slate-800">
              <th className="px-3.5 py-3 text-left text-xs font-bold text-muted-light dark:text-slate-400 border-b border-surface-border dark:border-slate-700 w-[110px]">
                Participant
              </th>
              {DAYS.map((d) => (
                <th key={d} className="px-2.5 py-3 text-center text-xs font-bold text-navy dark:text-white border-b border-surface-border dark:border-slate-700">
                  {d.split(' ')[0]}<br />
                  <span className="text-[11px] font-semibold text-muted-light dark:text-slate-400">
                    {parseInt(d.split(' ')[1]) <= 30 ? `Jun ${d.split(' ')[1]}` : `Jul ${d.split(' ')[1]}`}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PARTICIPANTS.map((p, pi) => (
              <tr key={p.id} className={pi % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-[#fafbfd] dark:bg-slate-800/50'}>
                <td className="px-3.5 py-2.5 border-b border-surface-border dark:border-slate-700 align-top">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-xs font-bold text-navy dark:text-white leading-snug">{p.name}</span>
                  </div>
                </td>
                {DAYS.map((_, di) => {
                  const dayShifts = getShifts(p.id, di);
                  return (
                    <td key={di} className="p-2 border-b border-surface-border dark:border-slate-700 align-top">
                      {dayShifts.length === 0 ? (
                        <div className="h-7 rounded-[8px] bg-surface-muted dark:bg-slate-700 flex items-center justify-center">
                          <span className="text-[10px] text-muted-lighter dark:text-slate-500">—</span>
                        </div>
                      ) : (
                        dayShifts.map((s) => (
                          <ShiftPill
                            key={s.id}
                            shift={s}
                            selected={selectedShift?.id === s.id}
                            onSelect={(sh) => setSelectedShift(selectedShift?.id === sh.id ? null : sh)}
                          />
                        ))
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected shift detail */}
      {selectedShift && (
        <div
          className="mt-4 rounded-2xl px-4 py-3.5 flex justify-between items-center flex-wrap gap-3 border"
          style={{
            background:   `${selectedShift.workerColor}0d`,
            borderColor:  `${selectedShift.workerColor}33`,
          }}
        >
          <div>
            <div className="font-bold text-sm text-navy dark:text-white mb-1">
              {selectedShift.workerName} → {selectedShift.participantName}
            </div>
            <div className="text-[13px] text-muted-light dark:text-slate-400">
              {DAYS[selectedShift.dayIndex]} · {selectedShift.startHour}:00–{selectedShift.endHour}:00 · {selectedShift.endHour - selectedShift.startHour}h shift
              {selectedShift.isSwapRequested && <span className="ml-2 text-amber-700 dark:text-amber-400 font-bold">⇄ Swap requested</span>}
              {selectedShift.isLastMinute    && <span className="ml-2 text-pink-700 dark:text-pink-400 font-bold">⚡ Last-minute</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {selectedShift.isSwapRequested && (
              <button className="px-3.5 py-2 rounded-[10px] bg-brand text-white border-none font-bold text-xs cursor-pointer hover:opacity-90">
                Approve swap
              </button>
            )}
            <button
              onClick={() => setSelectedShift(null)}
              className="px-3.5 py-2 rounded-[10px] border border-surface-divider dark:border-slate-600 bg-white dark:bg-slate-800 text-muted-light dark:text-slate-400 font-semibold text-xs cursor-pointer hover:bg-surface-muted dark:hover:bg-slate-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
