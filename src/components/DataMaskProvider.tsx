'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { maskValue, type MaskType } from '../lib/securityStore';

interface DataMaskContextValue {
  masked:      boolean;
  toggleMask:  () => void;
  forceReveal: boolean; // temporary reveal
  reveal:      () => void;
}

const DataMaskContext = createContext<DataMaskContextValue>({
  masked: true, toggleMask: () => {}, forceReveal: false, reveal: () => {},
});

export function DataMaskProvider({ children }: { children: React.ReactNode }) {
  const [masked,      setMasked]      = useState(true);
  const [forceReveal, setForceReveal] = useState(false);

  const toggleMask = useCallback(() => setMasked((p) => !p), []);

  // Momentary reveal: show plain for 4 seconds then re-mask
  const reveal = useCallback(() => {
    setForceReveal(true);
    setTimeout(() => setForceReveal(false), 4000);
  }, []);

  return (
    <DataMaskContext.Provider value={{ masked, toggleMask, forceReveal, reveal }}>
      {children}
    </DataMaskContext.Provider>
  );
}

export function useDataMask(): DataMaskContextValue {
  return useContext(DataMaskContext);
}

// ── MaskedText component ───────────────────────────────────────────────────
interface MaskedTextProps {
  value: string;
  type?:  MaskType;
  className?: string;
}

export function MaskedText({ value, type = 'name', className = '' }: MaskedTextProps) {
  const { masked, forceReveal } = useDataMask();
  const show = !masked || forceReveal;

  return show ? (
    <span className={className}>{value}</span>
  ) : (
    <span className={`font-mono tracking-wider select-none text-muted-lighter dark:text-slate-600 ${className}`}>
      {maskValue(value, type)}
    </span>
  );
}

// ── DataMaskToggle button ──────────────────────────────────────────────────
export function DataMaskToggle() {
  const { masked, toggleMask, reveal, forceReveal } = useDataMask();

  return (
    <div className="flex items-center gap-2">
      {masked && (
        <button
          onClick={reveal}
          disabled={forceReveal}
          className={`px-3 py-1.5 rounded-[10px] border border-surface-divider dark:border-slate-600 text-[12px] font-bold cursor-pointer transition-colors ${
            forceReveal
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              : 'bg-white dark:bg-slate-800 text-muted-dark dark:text-slate-300 hover:bg-surface-muted dark:hover:bg-slate-700'
          }`}
        >
          {forceReveal ? '👁 Revealing (4s)…' : '👁 Peek'}
        </button>
      )}
      <button
        onClick={toggleMask}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] border font-bold text-[12px] cursor-pointer transition-all ${
          masked
            ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/30'
            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
        }`}
      >
        {masked ? (
          <><span>🔒</span> PII Masked</>
        ) : (
          <><span>🔓</span> Data Visible</>
        )}
      </button>
    </div>
  );
}
