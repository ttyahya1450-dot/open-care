'use client';

import { useCallback, useEffect, useState } from 'react';

type Mode    = 'faceid' | 'touchid';
type Phase   = 'scanning' | 'success';

interface Props {
  userName?: string;
  onComplete: () => void;
}

export default function BiometricCheckpoint({ userName, onComplete }: Props) {
  const [mode,      setMode]      = useState<Mode>('faceid');
  const [phase,     setPhase]     = useState<Phase>('scanning');
  const [pin,       setPin]       = useState('');
  const [pinError,  setPinError]  = useState('');
  const [showPin,   setShowPin]   = useState(false);
  const [pinDone,   setPinDone]   = useState(false);
  // Attempt real hardware biometric via WebAuthn; fall back to timed simulation.
  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const fallback = () => {
      timerId = setTimeout(() => { if (!cancelled) setPhase('success'); }, 2500);
    };

    async function attemptWebAuthn() {
      // ── Native Capacitor path (@capgo/capacitor-native-biometric) ─────────
      const { detectNativeRuntime, BIOMETRIC_CONFIG } = await import('../lib/biometricConfig');
      if (await detectNativeRuntime()) {
        try {
          const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
          const availability = await NativeBiometric.isAvailable();
          if (availability.isAvailable) {
            await NativeBiometric.verifyIdentity({
              reason:             BIOMETRIC_CONFIG.reason,
              title:              BIOMETRIC_CONFIG.title,
              subtitle:           BIOMETRIC_CONFIG.subtitle,
              negativeButtonText: BIOMETRIC_CONFIG.negativeButtonText,
              maxAttempts:        BIOMETRIC_CONFIG.maxAttempts,
            });
            if (!cancelled) setPhase('success');
            return;
          }
        } catch {
          // User cancelled or sensor locked → simulation fallback
          if (!cancelled) fallback();
          return;
        }
      }
      // ─────────────────────────────────────────────────────────────────────
      if (
        typeof window === 'undefined' ||
        !window.PublicKeyCredential ||
        !(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
      ) {
        fallback();
        return;
      }
      try {
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge:        crypto.getRandomValues(new Uint8Array(32)),
            allowCredentials: [],
            userVerification: 'required',
            timeout:          30_000,
            rpId:             window.location.hostname,
          },
        });
        if (!cancelled && credential) setPhase('success');
        else if (!cancelled) fallback();
      } catch {
        // NotAllowedError (cancelled), NotSupportedError, SecurityError → simulation
        if (!cancelled) fallback();
      }
    }

    void attemptWebAuthn();
    return () => { cancelled = true; if (timerId) clearTimeout(timerId); };
  }, [mode]);

  // Reset when mode changes (allow re-scan)
  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setPhase('scanning');
  };

  const handlePinSubmit = useCallback(() => {
    if (pin.length < 4) { setPinError('PIN must be 4–6 digits.'); return; }
    // Accept any valid-length PIN (it's a simulator)
    setPinError('');
    setPinDone(true);
    setTimeout(() => onComplete(), 600);
  }, [pin, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl w-full max-w-[400px] mx-4 overflow-hidden">

        {/* Header */}
        <div className="text-center px-8 pt-8 pb-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand mb-1.5">
            2-Step Verification
          </p>
          <h2 className="text-[20px] font-extrabold text-navy dark:text-white leading-tight m-0">
            Identity Checkpoint
          </h2>
          <p className="text-[13px] text-muted-light dark:text-slate-400 mt-1.5">
            {phase === 'scanning'
              ? (mode === 'faceid' ? 'Position your face in the frame…' : 'Place your finger on the sensor…')
              : '✓ Biometric verified'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 mx-6 mb-6 bg-surface-muted dark:bg-slate-800 rounded-[12px] p-1 border border-surface-border dark:border-slate-700">
          {(['faceid', 'touchid'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-[9px] border-none font-bold text-[12px] cursor-pointer transition-all ${
                mode === m
                  ? 'bg-white dark:bg-slate-700 text-navy dark:text-white shadow-sm'
                  : 'bg-transparent text-muted-light dark:text-slate-400 hover:text-navy dark:hover:text-white'
              }`}
            >
              {m === 'faceid' ? '⬛ Face ID' : '◉ Touch ID'}
            </button>
          ))}
        </div>

        {/* Biometric graphic */}
        <div className="flex justify-center mb-6">
          {mode === 'faceid' ? (
            <FaceIDScanner phase={phase} />
          ) : (
            <TouchIDScanner phase={phase} />
          )}
        </div>

        {/* Status label */}
        <div className="text-center mb-5 px-6">
          {phase === 'scanning' ? (
            <div className="flex items-center justify-center gap-2 text-[13px] text-muted-dark dark:text-slate-300">
              <div className="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              Scanning…
            </div>
          ) : (
            <div className="text-[13px] font-bold text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
              <span className="text-[16px]">✓</span>
              {userName ? `Welcome, ${userName.split(' ')[0]}` : 'Identity confirmed'}
            </div>
          )}
        </div>

        {/* PIN section (optional) */}
        {phase === 'success' && !pinDone && (
          <div className="px-6 pb-6 border-t border-surface-border dark:border-slate-700 pt-5">
            {!showPin ? (
              <div className="flex flex-col gap-2.5">
                <button onClick={handleSkip} className="btn-primary w-full text-[14px] py-3">
                  Continue to Portal →
                </button>
                <button
                  onClick={() => setShowPin(true)}
                  className="text-center text-[12px] text-muted-light dark:text-slate-400 hover:text-brand dark:hover:text-brand cursor-pointer py-1 bg-transparent border-none"
                >
                  Set up optional secondary PIN
                </button>
              </div>
            ) : (
              <div>
                <p className="text-[12px] text-muted-dark dark:text-slate-300 mb-3 font-semibold">
                  Secondary PIN (optional, 4–6 digits)
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                    placeholder="• • • •"
                    className="input text-center font-mono text-[18px] tracking-[0.4em] flex-1"
                    autoFocus
                  />
                  <button onClick={handlePinSubmit} className="btn-primary px-4 whitespace-nowrap">
                    Confirm PIN
                  </button>
                </div>
                {pinError && <p className="text-rose-500 text-[11px] font-semibold">{pinError}</p>}
                <button
                  onClick={handleSkip}
                  className="text-[12px] text-muted-light dark:text-slate-400 hover:text-brand dark:hover:text-brand cursor-pointer bg-transparent border-none mt-2"
                >
                  Skip — continue without PIN
                </button>
              </div>
            )}
          </div>
        )}

        {pinDone && (
          <div className="px-6 pb-6 text-center">
            <div className="text-[13px] font-bold text-green-600 dark:text-green-400">
              ✓ PIN set — entering portal…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Face ID animated graphic ───────────────────────────────────────────────
function FaceIDScanner({ phase }: { phase: Phase }) {
  return (
    <div className="relative" style={{ width: 180, height: 180 }}>
      {/* Outer pulse ring */}
      <div className={`absolute inset-0 rounded-full border-2 transition-all duration-700 ${
        phase === 'success'
          ? 'border-green-400 dark:border-green-500 scale-110 opacity-40'
          : 'border-brand opacity-30 animate-ping'
      }`} />

      {/* Middle ring */}
      <div className={`absolute inset-3 rounded-full border-2 transition-colors duration-700 ${
        phase === 'success' ? 'border-green-400 dark:border-green-400' : 'border-brand/60'
      }`} />

      {/* Spinning arc */}
      {phase === 'scanning' && (
        <div
          className="absolute inset-3 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: 'var(--color-brand)', borderRightColor: 'var(--color-brand)' }}
        />
      )}

      {/* Face frame corners (4 corner brackets) */}
      <div className="absolute inset-8">
        {/* TL */}
        <div className={`absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 transition-colors duration-700 ${phase === 'success' ? 'border-green-400' : 'border-brand'}`} />
        {/* TR */}
        <div className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 transition-colors duration-700 ${phase === 'success' ? 'border-green-400' : 'border-brand'}`} />
        {/* BL */}
        <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 transition-colors duration-700 ${phase === 'success' ? 'border-green-400' : 'border-brand'}`} />
        {/* BR */}
        <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 transition-colors duration-700 ${phase === 'success' ? 'border-green-400' : 'border-brand'}`} />

        {/* Scan line (only while scanning) */}
        {phase === 'scanning' && (
          <div
            className="absolute left-0 right-0 h-px opacity-80"
            style={{
              background: 'linear-gradient(90deg, transparent, var(--color-brand), transparent)',
              animation: 'scan-line 1.4s ease-in-out infinite',
            }}
          />
        )}

        {/* Success checkmark */}
        {phase === 'success' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="w-10 h-10">
              <circle cx="20" cy="20" r="18" fill="none" stroke="#22c55e" strokeWidth="2" />
              <path d="M12 20 l6 6 l10 -12" fill="none" stroke="#22c55e" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 30, strokeDashoffset: 0, animation: 'draw-check 0.4s ease 0.1s both' }}
              />
            </svg>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan-line {
          0%   { top: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes draw-check {
          from { stroke-dashoffset: 30; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Touch ID animated graphic ──────────────────────────────────────────────
function TouchIDScanner({ phase }: { phase: Phase }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      {/* Glow ring */}
      <div className={`absolute inset-6 rounded-full transition-all duration-700 ${
        phase === 'success'
          ? 'shadow-[0_0_40px_rgba(34,197,94,0.5)] bg-green-50 dark:bg-green-900/20'
          : 'shadow-[0_0_20px_rgba(79,70,229,0.3)] animate-pulse'
      }`} />

      {/* Fingerprint SVG */}
      <svg
        viewBox="0 0 100 100"
        className={`relative w-28 h-28 transition-all duration-700 ${phase === 'success' ? 'text-green-400' : 'text-brand/70'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        {/* Concentric arc ridges representing fingerprint */}
        <path d="M50 85 Q20 70 20 50 Q20 25 50 20 Q80 25 80 50 Q80 70 50 85" />
        <path d="M50 78 Q27 65 27 50 Q27 30 50 27 Q73 30 73 50 Q73 65 50 78" />
        <path d="M50 71 Q34 60 34 50 Q34 35 50 34 Q66 35 66 50 Q66 60 50 71" />
        <path d="M50 64 Q41 56 41 50 Q41 40 50 40 Q59 40 59 50 Q59 56 50 64" />
        <path d="M50 57 Q47 53 47 50 Q47 46 50 46 Q53 46 53 50 Q53 53 50 57" />
        {/* Center dot */}
        <circle cx="50" cy="50" r="2" fill="currentColor" stroke="none" />

        {phase === 'success' && (
          <path d="M30 52 l12 12 l28 -28" stroke="#22c55e" strokeWidth="3"
            style={{ strokeDasharray: 60, strokeDashoffset: 0, animation: 'draw-check 0.5s ease both' }}
          />
        )}
      </svg>

      <style>{`@keyframes draw-check { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }`}</style>
    </div>
  );
}
