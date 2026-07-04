'use client';

export interface ParticipantProfileData {
  name: string;
  initials: string;
  suburb: string;
  age?: number;
  primaryDiagnosis?: string;
  careRequirements: string[];
  supportGoals: string[];
  preferences: string[];
  weeklyHours?: number;
  coordinatorName?: string;
}

interface Props {
  profile: ParticipantProfileData;
  compact?: boolean;
}

const REQ_COLOR  = 'bg-rose-50 dark:bg-rose-900/25 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
const GOAL_COLOR = 'bg-brand-xlight dark:bg-brand/15 text-brand-mid border border-brand-border dark:border-brand/30';
const PREF_COLOR = 'bg-purple-50 dark:bg-purple-900/25 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800';

export default function ParticipantProfile({ profile, compact = false }: Props) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-[20px] border border-surface-border dark:border-slate-700 ${compact ? 'p-4' : 'p-6'} flex flex-col gap-4 transition-colors duration-200`}>
      {/* Avatar + identity */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-[17px] shrink-0 shadow-[0_4px_14px_rgba(139,92,246,0.35)]">
          {profile.initials}
        </div>
        <div>
          <div className="font-extrabold text-[16px] text-navy dark:text-white leading-tight">{profile.name}</div>
          <div className="text-[13px] text-muted-light dark:text-slate-400 mt-0.5">{profile.suburb}</div>
          {profile.primaryDiagnosis && (
            <div className="text-[11px] text-muted-lighter dark:text-slate-500 mt-0.5 font-medium">{profile.primaryDiagnosis}</div>
          )}
        </div>
        {profile.weeklyHours && (
          <div className="ml-auto text-right shrink-0">
            <div className="text-[20px] font-extrabold text-navy dark:text-white tracking-tight">{profile.weeklyHours}</div>
            <div className="text-[10px] text-muted-lighter dark:text-slate-500 font-semibold uppercase tracking-wider">hrs/week</div>
          </div>
        )}
      </div>

      {/* Care Requirements */}
      <div>
        <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-rose-400 mb-2">
          Care Requirements
        </div>
        <div className="flex flex-wrap gap-1.5">
          {profile.careRequirements.map((r) => (
            <span key={r} className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${REQ_COLOR}`}>{r}</span>
          ))}
        </div>
      </div>

      {/* Support Goals */}
      <div>
        <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-brand mb-2">
          Support Goals
        </div>
        <div className="flex flex-wrap gap-1.5">
          {profile.supportGoals.map((g) => (
            <span key={g} className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${GOAL_COLOR}`}>{g}</span>
          ))}
        </div>
      </div>

      {/* Core Preferences */}
      <div>
        <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-purple-500 mb-2">
          Core Preferences
        </div>
        <div className="flex flex-wrap gap-1.5">
          {profile.preferences.map((p) => (
            <span key={p} className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${PREF_COLOR}`}>{p}</span>
          ))}
        </div>
      </div>

      {/* Coordinator note */}
      {profile.coordinatorName && (
        <div className="flex items-center gap-2 bg-surface-muted dark:bg-slate-700 rounded-xl px-3.5 py-2.5 border border-surface-border dark:border-slate-600">
          <span className="text-[14px]">📋</span>
          <span className="text-[12px] text-muted-dark dark:text-slate-300 font-semibold">
            Plan managed by <span className="text-navy dark:text-white">{profile.coordinatorName}</span>
          </span>
        </div>
      )}
    </div>
  );
}
