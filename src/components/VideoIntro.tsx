'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoIntroProps {
  workerName: string;
  initials: string;
  accentColor?: string;
  durationSeconds?: number;
}

const NUM_BARS = 14;

export default function VideoIntro({
  workerName,
  initials,
  accentColor = '#3f6df6',
  durationSeconds = 30,
}: VideoIntroProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const [bars,      setBars]      = useState(() => Array.from({ length: NUM_BARS }, () => 0.3));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e >= durationSeconds) { setIsPlaying(false); return durationSeconds; }
          return e + 0.1;
        });
        setBars(Array.from({ length: NUM_BARS }, () => 0.25 + Math.random() * 0.75));
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setBars(Array.from({ length: NUM_BARS }, () => 0.3));
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, durationSeconds]);

  const pct = (elapsed / durationSeconds) * 100;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setElapsed(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * durationSeconds);
  };

  const handlePlay = () => {
    if (elapsed >= durationSeconds) setElapsed(0);
    setIsPlaying((p) => !p);
  };

  return (
    <div
      className="rounded-[20px] overflow-hidden border border-surface-border dark:border-slate-700 shadow-card"
      style={{ background: `linear-gradient(150deg, ${accentColor}22 0%, ${accentColor}08 100%)` }}
    >
      {/* Visualiser / poster */}
      <div className="relative h-[200px] flex flex-col items-center justify-center gap-3">
        {/* Avatar */}
        <div
          className="w-[68px] h-[68px] rounded-full flex items-center justify-center text-white font-extrabold text-[22px] shadow-[0_4px_16px_rgba(0,0,0,0.18)] z-10"
          style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}bb 100%)` }}
        >
          {initials}
        </div>

        <div className="text-center z-10">
          <div className="font-bold text-[14px] text-navy dark:text-white">{workerName}</div>
          <div className="text-[12px] text-muted-light dark:text-slate-400 mt-0.5">Video introduction</div>
        </div>

        {/* Animated waveform when playing */}
        {isPlaying && (
          <div className="absolute bottom-5 left-0 right-0 flex items-end justify-center gap-[3px] h-8 px-8">
            {bars.map((h, i) => (
              <div
                key={i}
                className="rounded-full flex-1 max-w-[6px]"
                style={{ height: `${h * 100}%`, background: accentColor, opacity: 0.7 }}
              />
            ))}
          </div>
        )}

        {/* Big play button when idle at start */}
        {!isPlaying && elapsed === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer group"
            onClick={handlePlay}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_18px_rgba(0,0,0,0.25)] transition-transform group-hover:scale-110"
              style={{ background: accentColor }}
            >
              <span className="text-white text-[20px] ml-1">▶</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 pb-4 pt-2">
        <div className="h-1.5 bg-black/10 rounded-full mb-3 cursor-pointer" onClick={handleScrub}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accentColor }} />
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={handlePlay}
            className="w-8 h-8 rounded-full border-none flex items-center justify-center cursor-pointer text-white text-[13px] hover:opacity-80 transition-opacity"
            style={{ background: accentColor }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <span className="text-[12px] font-mono font-semibold text-muted-light">
            {fmt(elapsed)} / {fmt(durationSeconds)}
          </span>
          <span className="text-[11px] font-bold text-muted-lighter uppercase tracking-wide">
            {elapsed >= durationSeconds ? 'Ended' : isPlaying ? 'Playing' : 'Paused'}
          </span>
        </div>
      </div>
    </div>
  );
}
