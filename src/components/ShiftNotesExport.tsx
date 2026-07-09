'use client';

import { useState } from 'react';

type Mood = 'positive' | 'neutral' | 'concern';

interface ShiftNote {
  id: string; date: string; worker: string; participant: string; mood: Mood; note: string;
}

const MOOD_META: Record<Mood, { icon: string; label: string; cardBg: string; cardBorder: string; text: string; pill: string }> = {
  positive: { icon: '😊', label: 'Positive', cardBg: 'bg-green-50 dark:bg-green-900/25',  cardBorder: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-400', pill: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'  },
  neutral:  { icon: '😐', label: 'Neutral',  cardBg: 'bg-amber-50 dark:bg-amber-900/25',  cardBorder: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', pill: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'  },
  concern:  { icon: '😟', label: 'Concern',  cardBg: 'bg-rose-50 dark:bg-rose-900/25',    cardBorder: 'border-rose-200 dark:border-rose-800',   text: 'text-rose-700 dark:text-rose-400',   pill: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400'   },
};

const SEED_NOTES: ShiftNote[] = [
  { id: 'n1', date: '2026-06-28', worker: 'Maya Chen',     participant: 'Alex Morgan',  mood: 'positive', note: 'Great session — Alex completed morning routine independently and communicated needs clearly.' },
  { id: 'n2', date: '2026-06-27', worker: 'Daniel Brooks', participant: 'Jordan Lee',   mood: 'neutral',  note: "Jordan was quieter than usual today. Completed tasks but didn't engage much in conversation." },
  { id: 'n3', date: '2026-06-26', worker: 'Aisha Rahman',  participant: 'Riley Nguyen', mood: 'concern',  note: 'Riley showed signs of distress during the afternoon. Coordinator notified. Plan review recommended.' },
];

const PARTICIPANTS = ['Alex Morgan', 'Jordan Lee', 'Riley Nguyen'];

export default function ShiftNotesExport() {
  const [notes,       setNotes]       = useState<ShiftNote[]>(SEED_NOTES);
  const [selectedPpt, setSelectedPpt] = useState('Alex Morgan');
  const [mood,        setMood]        = useState<Mood>('positive');
  const [noteText,    setNoteText]    = useState('');
  const [exportState, setExportState] = useState<'idle' | 'generating' | 'done'>('idle');

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes((prev) => [{
      id: `n${Date.now()}`, date: '2026-06-29', worker: 'You',
      participant: selectedPpt, mood, note: noteText.trim(),
    }, ...prev]);
    setNoteText('');
  };

  const handleExport = () => {
    setExportState('generating');
    setTimeout(() => setExportState('done'), 1800);
    setTimeout(() => setExportState('idle'), 4200);
  };

  return (
    <div id="shift-notes-export" className="card-lg">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">Shift Notes &amp; Handover</h2>
          <p className="text-sm text-muted-light dark:text-slate-400 mt-1.5">Post-shift updates from support workers, ready for NDIS audit export.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exportState === 'generating'}
          className={`px-5 py-2.5 min-h-[44px] rounded-xl border-none font-bold text-sm cursor-pointer transition-all whitespace-nowrap ${
            exportState === 'done'
              ? 'bg-green-500 text-white cursor-default shadow-green-glow'
              : exportState === 'generating'
              ? 'bg-surface-muted dark:bg-slate-700 text-muted-lighter dark:text-slate-500 cursor-not-allowed'
              : 'bg-brand-gradient text-white shadow-brand-btn hover:opacity-90'
          }`}
        >
          {exportState === 'generating' ? '⏳ Generating PDF…'
           : exportState === 'done'      ? '✓ PDF Ready ↓'
           :                              '📄 Export Audit-Ready PDF'}
        </button>
      </div>

      {/* Note composer */}
      <div className="bg-surface dark:bg-slate-700 rounded-2xl p-5 mb-5 border border-surface-border dark:border-slate-600">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select
            value={selectedPpt}
            onChange={(e) => setSelectedPpt(e.target.value)}
            className="form-input flex-1 cursor-pointer"
          >
            {PARTICIPANTS.map((p) => <option key={p}>{p}</option>)}
          </select>

          <div className="flex gap-2">
            {(['positive', 'neutral', 'concern'] as Mood[]).map((m) => {
              const meta = MOOD_META[m];
              const sel  = mood === m;
              return (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`px-3.5 py-2 min-h-[44px] rounded-xl border font-semibold text-[13px] cursor-pointer transition-all ${
                    sel
                      ? `${meta.cardBg} ${meta.text} ${meta.cardBorder} shadow-sm`
                      : 'bg-white dark:bg-slate-800 border-surface-divider dark:border-slate-600 text-muted-light dark:text-slate-400 hover:border-surface-input dark:hover:border-slate-500'
                  }`}
                >
                  {meta.icon} {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Enter post-shift update…"
          rows={3}
          className="form-input resize-none mb-3"
        />

        <button
          onClick={addNote}
          disabled={!noteText.trim()}
          className={`w-full py-2.5 min-h-[44px] rounded-xl border-none font-bold text-sm cursor-pointer transition-all ${
            noteText.trim()
              ? 'bg-brand-gradient text-white shadow-brand-btn hover:opacity-90'
              : 'bg-surface-muted dark:bg-slate-800 text-muted-lighter dark:text-slate-600 cursor-not-allowed'
          }`}
        >
          Add shift note
        </button>
      </div>

      {/* Notes list */}
      <div className="grid gap-3">
        {notes.map((n) => {
          const meta = MOOD_META[n.mood];
          return (
            <div key={n.id} className={`rounded-2xl p-4 border ${meta.cardBg} ${meta.cardBorder}`}>
              <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">{meta.icon}</span>
                  <span className="font-bold text-[13px] text-navy dark:text-white">{n.participant}</span>
                  <span className="text-muted-lighter dark:text-slate-500 text-[12px]">·</span>
                  <span className="text-muted-light dark:text-slate-400 text-[12px]">{n.worker}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${meta.pill} text-[11px]`}>{meta.label}</span>
                  <span className="text-muted-lighter dark:text-slate-500 text-[12px] font-mono">{n.date}</span>
                </div>
              </div>
              <p className={`text-[13px] leading-relaxed m-0 ${meta.text}`}>{n.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
