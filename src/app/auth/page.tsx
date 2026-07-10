'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, type UserRole } from '../../context/AuthContext';
import {
  isAccountLocked, lockSecondsRemaining,
  logSecurityEvent, MAX_ATTEMPTS,
  recordFailedAttempt, recordSuccessfulLogin,
} from '../../lib/securityStore';
import BiometricCheckpoint from '../../components/BiometricCheckpoint';
import ForgotPasswordFlow from '../../components/ForgotPasswordFlow';

type Mode = 'signin' | 'signup';

const ROLES = [
  {
    role: 'PARTICIPANT' as UserRole,
    icon: '🙋', label: 'Participant', tagline: 'I need support',
    description: 'Browse verified workers, compare transparent pricing, and manage your NDIS bookings.',
    selectedBorder: 'border-brand',       selectedBg: 'bg-brand-xlight',
    selectedText:   'text-brand',         selectedSub: 'text-brand-mid',
    checkBg:        'bg-brand',
  },
  {
    role: 'WORKER' as UserRole,
    icon: '🤝', label: 'Support Worker', tagline: 'I provide support',
    description: 'Set your rate, manage your profile, and receive transparent payouts after every shift.',
    selectedBorder: 'border-pink-400',    selectedBg: 'bg-pink-50',
    selectedText:   'text-pink-700',      selectedSub: 'text-pink-600',
    checkBg:        'bg-pink-500',
  },
  {
    role: 'COORDINATOR' as UserRole,
    icon: '📋', label: 'Coordinator', tagline: 'I manage plans',
    description: 'Oversee multiple participants, track NDIS budget burn-rate, and monitor support delivery.',
    selectedBorder: 'border-purple-400',  selectedBg: 'bg-purple-50',
    selectedText:   'text-purple-700',    selectedSub: 'text-purple-600',
    checkBg:        'bg-purple-500',
  },
];

const DEST: Record<UserRole, string> = {
  PARTICIPANT:  '/',
  WORKER:       '/workers',
  COORDINATOR:  '/coordinator',
};

const DEMO_NAMES: Record<UserRole, string> = {
  PARTICIPANT:  'Alex Morgan',
  WORKER:       'Maya Chen',
  COORDINATOR:  'Jordan Brooks',
};

const DEMO_CONFIG: Array<{
  role: UserRole; icon: string; name: string; subtitle: string;
  highlightClass: string; borderClass: string;
}> = [
  {
    role: 'PARTICIPANT',
    icon: '🙋',
    name: 'Test Participant',
    subtitle: 'Alex Morgan · Family / Client view',
    highlightClass: 'from-brand-xlight to-blue-50 hover:from-blue-50 hover:to-brand-xlight',
    borderClass: 'border-brand/30 hover:border-brand',
  },
  {
    role: 'WORKER',
    icon: '🤝',
    name: 'Test Support Worker',
    subtitle: 'Maya Chen · $92/hr provider workspace',
    highlightClass: 'from-pink-50 to-fuchsia-50 hover:from-pink-100 hover:to-pink-50',
    borderClass: 'border-pink-200 hover:border-pink-400',
  },
  {
    role: 'COORDINATOR',
    icon: '📋',
    name: 'Test Coordinator',
    subtitle: 'Jordan Brooks · Budget safeguard board',
    highlightClass: 'from-purple-50 to-violet-50 hover:from-purple-100 hover:to-purple-50',
    borderClass: 'border-purple-200 hover:border-purple-400',
  },
];

export default function AuthPage() {
  const { signIn, signUp, loginAsDemo } = useAuth();
  const router = useRouter();

  const [mode,         setMode]         = useState<Mode>('signin');
  const [name,         setName]         = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('PARTICIPANT');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [demoLoading,  setDemoLoading]  = useState<UserRole | null>(null);

  // ── Phase 3 state ──────────────────────────────────────────────────────────
  const [showBiometric, setShowBiometric]   = useState(false);
  const [pendingDest,   setPendingDest]     = useState<string | null>(null);
  const [pendingName,   setPendingName]     = useState('');
  const [showForgot,    setShowForgot]      = useState(false);
  const [lockSeconds,   setLockSeconds]     = useState(0);
  const [attemptCount,  setAttemptCount]    = useState(0);
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live lock countdown
  useEffect(() => {
    if (lockSeconds <= 0) return;
    lockTimerRef.current = setInterval(() => {
      setLockSeconds((prev) => {
        if (prev <= 1) { clearInterval(lockTimerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (lockTimerRef.current) clearInterval(lockTimerRef.current); };
  }, [lockSeconds]);

  // Check lock on email field change
  const handleEmailChange = (v: string) => {
    setEmail(v);
    setError('');
    setAttemptCount(0);
    if (isAccountLocked(v.trim())) {
      setLockSeconds(lockSecondsRemaining(v.trim()));
    } else {
      setLockSeconds(0);
    }
  };

  const switchMode = (next: Mode) => { setMode(next); setError(''); setLockSeconds(0); setAttemptCount(0); };

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password) { setError('Please fill in your email and password.'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Please enter your full name.'); return; }

    // Rate limiter gate
    if (isAccountLocked(email.trim())) {
      setLockSeconds(lockSecondsRemaining(email.trim()));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const user = await signIn(email.trim(), password);
        recordSuccessfulLogin(email.trim());
        logSecurityEvent({ event: 'LOGIN_SUCCESS', email: email.trim(), role: user.role });
        setPendingName(user.name);
        setPendingDest(DEST[user.role]);
        setShowBiometric(true);
      } else {
        const user = await signUp(name.trim(), email.trim(), password, selectedRole);
        setPendingName(user.name ?? name.trim());
        setPendingDest(DEST[selectedRole]);
        setShowBiometric(true);
      }
    } catch {
      const updated = recordFailedAttempt(email.trim());
      logSecurityEvent({ event: 'LOGIN_FAILURE', email: email.trim(), meta: `attempt_${updated.failedAttempts}` });

      if (isAccountLocked(email.trim())) {
        setLockSeconds(lockSecondsRemaining(email.trim()));
        setAttemptCount(0);
        setError('');
      } else {
        const remaining = MAX_ATTEMPTS - updated.failedAttempts;
        setAttemptCount(updated.failedAttempts);
        setError(
          remaining > 0
            ? `Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before lock.`
            : 'Invalid email or password.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Demo login ─────────────────────────────────────────────────────────────
  const handleDemoLogin = (role: UserRole) => {
    setDemoLoading(role);
    setTimeout(() => {
      loginAsDemo(role);
      setPendingName(DEMO_NAMES[role]);
      setPendingDest(DEST[role]);
      setDemoLoading(null);
      setShowBiometric(true);
    }, 320);
  };

  // ── Biometric completion ───────────────────────────────────────────────────
  const handleBiometricComplete = () => {
    setShowBiometric(false);
    if (pendingDest) router.push(pendingDest);
  };

  const selectedMeta = ROLES.find((r) => r.role === selectedRole)!;
  const locked       = lockSeconds > 0;
  const mm           = Math.floor(lockSeconds / 60).toString().padStart(2, '0');
  const ss           = (lockSeconds % 60).toString().padStart(2, '0');

  return (
    <>
      {/* ── Biometric 2SV checkpoint (shown after successful credential validation) ── */}
      {showBiometric && (
        <BiometricCheckpoint userName={pendingName} onComplete={handleBiometricComplete} />
      )}

      {/* ── Forgot Password overlay ─── */}
      {showForgot && (
        <ForgotPasswordFlow onClose={() => setShowForgot(false)} />
      )}

      <main className="min-h-screen bg-auth-page flex items-center justify-center px-4 py-7 relative overflow-hidden">
        {/* Decorative orbs */}
        <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[15%] -right-[8%] w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(63,109,246,0.22)_0%,transparent_65%)]" />
          <div className="absolute -bottom-[10%] -left-[6%] w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(30,61,138,0.45)_0%,transparent_70%)]" />
          <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(90,140,248,0.08)_0%,transparent_70%)]" />
        </div>

        <div
          className="w-full relative animate-fade-in"
          style={{ maxWidth: mode === 'signup' ? '720px' : '480px', transition: 'max-width 0.35s cubic-bezier(0.4,0,0.2,1)' }}
        >
          {/* Logo */}
          <div className="text-center mb-7">
            <Link href="/" className="inline-flex items-center gap-2.5 no-underline">
              <div className="w-[42px] h-[42px] bg-avatar-gradient rounded-[13px] flex items-center justify-center text-[20px] shadow-[0_8px_20px_rgba(63,109,246,0.4)]">🩺</div>
              <span className="text-[22px] font-extrabold text-white tracking-tight">OpenCare</span>
            </Link>
            <p className="text-white/40 mt-2 text-[13px] tracking-wide">NDIS support worker marketplace</p>
          </div>

          {/* ── Account lock screen ───────────────────────────────────────── */}
          {locked ? (
            <div className="bg-white rounded-[28px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.45)] border-2 border-rose-400">
              <div className="bg-rose-600 px-6 py-3 flex items-center gap-2.5">
                <span className="text-white font-extrabold text-[12px] uppercase tracking-wider">OpenCare Security</span>
                <span className="ml-auto text-rose-200 text-[11px] font-mono">ACCOUNT SECURITY</span>
              </div>
              <div className="px-7 py-8 text-center">
                <div className="text-[52px] mb-4">🔒</div>
                <h2 className="text-[22px] font-extrabold text-rose-700 mb-2.5 m-0">Account Temporarily Locked</h2>
                <p className="text-[14px] text-muted-dark mb-6 leading-relaxed max-w-xs mx-auto">
                  Too many failed sign-in attempts. Your account has been locked to prevent unauthorized access.
                </p>

                {/* Countdown timer */}
                <div className="inline-block bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-700 rounded-[20px] px-8 py-5 mb-5">
                  <div className="text-[44px] font-extrabold font-mono text-rose-600 leading-none tracking-wider tabular-nums">
                    {mm}:{ss}
                  </div>
                  <div className="text-[11px] text-rose-400 font-semibold uppercase tracking-wider mt-1.5">Remaining before unlock</div>
                </div>

                {/* Progress bar (fills as time passes) */}
                <div className="h-2 bg-rose-100 rounded-full overflow-hidden mb-5 mx-4">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${100 - (lockSeconds / (lockSeconds + 60)) * 100}%` }}
                  />
                </div>

                <p className="text-[12px] text-muted-light">
                  This lock was triggered after {MAX_ATTEMPTS} failed login attempts.<br />
                  The account will unlock automatically at the end of the countdown.
                </p>
              </div>
            </div>
          ) : (
            /* ── Normal auth card ─────────────────────────────────────────── */
            <div className="bg-white rounded-[28px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)]">

              {/* Tabs */}
              <div className="grid grid-cols-2 bg-surface-muted border-b border-surface-border">
                {(['signin', 'signup'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`py-4 border-none font-bold text-sm cursor-pointer transition-all ${
                      mode === m
                        ? 'bg-white text-navy border-b-[2.5px] border-brand'
                        : 'bg-transparent text-muted-tab border-b-[2.5px] border-transparent hover:text-navy'
                    }`}
                  >
                    {m === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              <div className="px-8 pt-7 pb-8">
                <h2 className="text-[21px] font-bold text-navy mb-1.5">
                  {mode === 'signin' ? 'Welcome back' : 'Join OpenCare'}
                </h2>
                <p className="text-muted-light text-sm leading-relaxed mb-6">
                  {mode === 'signin'
                    ? 'Sign in to access your personalised dashboard, bookings, and plan tracking.'
                    : 'Choose your role and fill in your details to get started with a pre-filled profile.'}
                </p>

                {/* Role selector — sign up only */}
                {mode === 'signup' && (
                  <div className="mb-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-muted-darker mb-2.5">I am a…</p>
                    <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-3">
                      {ROLES.map((r) => {
                        const sel = selectedRole === r.role;
                        return (
                          <button
                            key={r.role}
                            type="button"
                            onClick={() => setSelectedRole(r.role)}
                            className={`p-4 rounded-[18px] border-2 text-left cursor-pointer transition-all font-sans ${
                              sel
                                ? `${r.selectedBorder} ${r.selectedBg} shadow-brand-ring`
                                : 'border-surface-divider bg-white hover:border-surface-input'
                            }`}
                          >
                            <div className={`text-[22px] mb-2.5 w-10 h-10 rounded-xl flex items-center justify-center ${sel ? r.selectedBg : 'bg-surface-muted'}`}>
                              {r.icon}
                            </div>
                            <div className={`font-bold text-[14px] mb-0.5 ${sel ? r.selectedText : 'text-navy'}`}>{r.label}</div>
                            <div className={`text-xs font-semibold mb-2 ${sel ? r.selectedSub : 'text-muted-lighter'}`}>{r.tagline}</div>
                            <div className={`text-xs leading-relaxed ${sel ? r.selectedSub : 'text-muted-lighter'}`}>{r.description}</div>
                            {sel && (
                              <div className="mt-2.5 flex items-center gap-1">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${r.checkBg}`}>
                                  <span className="text-white text-[9px] font-extrabold">✓</span>
                                </div>
                                <span className={`text-[11px] font-bold ${r.selectedText}`}>Selected</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex items-center gap-2 bg-brand-xlight dark:bg-brand/10 border border-brand-border dark:border-brand/30 rounded-xl px-3.5 py-2.5">
                      <span className="text-sm">✨</span>
                      <span className="text-[12px] text-brand-mid font-semibold">
                        Your profile will be pre-filled with realistic defaults for {selectedMeta.label}s — edit anytime.
                      </span>
                    </div>
                  </div>
                )}

                {/* Form fields */}
                <div className="grid gap-3.5">
                  {mode === 'signup' && (
                    <label className="flex flex-col gap-1.5">
                      <span className="font-semibold text-[13px] text-muted-darker">Full name</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="Alex Morgan"
                        autoComplete="name"
                        className="form-input"
                      />
                    </label>
                  )}
                  <label className="flex flex-col gap-1.5">
                    <span className="font-semibold text-[13px] text-muted-darker">Email address</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="form-input"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[13px] text-muted-darker">Password</span>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => setShowForgot(true)}
                          className="text-[12px] text-brand hover:text-brand-dark font-semibold cursor-pointer bg-transparent border-none p-0"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="••••••••"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      className="form-input"
                    />
                  </label>
                </div>

                {/* Attempt counter warning */}
                {attemptCount > 0 && attemptCount < MAX_ATTEMPTS && !error.includes('Invalid') && (
                  <div className="mt-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                    <div className="flex gap-1.5">
                      {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-1.5 rounded-full ${i < attemptCount ? 'bg-rose-500' : 'bg-amber-200'}`}
                        />
                      ))}
                    </div>
                    <p className="text-amber-700 dark:text-amber-300 text-[11px] font-semibold mt-1.5">
                      {attemptCount} of {MAX_ATTEMPTS} failed attempts · Account locks at {MAX_ATTEMPTS}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mt-3.5 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-xl text-rose-700 dark:text-rose-300 text-[13px] font-semibold">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`mt-5 w-full py-3.5 rounded-2xl border-none font-bold text-[15px] text-white cursor-pointer transition-all tracking-[0.01em] ${
                    loading ? 'bg-brand-muted cursor-not-allowed' : 'bg-brand-full shadow-brand hover:opacity-95'
                  }`}
                >
                  {loading ? 'Signing you in…' : mode === 'signin' ? 'Sign In →' : `Create ${selectedMeta.label} Account →`}
                </button>

                {mode === 'signup' && (
                  <p className="mt-4 text-[12px] text-muted-lighter text-center leading-relaxed">
                    By creating an account you agree to OpenCare&apos;s terms of service and privacy policy.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Demo Quick-Login Panel ──────────────────────────────────────── */}
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/15" />
              <span className="text-white/45 text-[11px] font-semibold uppercase tracking-[0.1em] whitespace-nowrap">
                Or try a demo account
              </span>
              <div className="flex-1 h-px bg-white/15" />
            </div>

            <div className="grid gap-2.5 grid-cols-3">
              {DEMO_CONFIG.map(({ role, icon, name: demoName, subtitle, highlightClass, borderClass }) => {
                const isLoading = demoLoading === role;
                return (
                  <button
                    key={role}
                    onClick={() => !demoLoading && handleDemoLogin(role)}
                    disabled={!!demoLoading}
                    className={`
                      relative flex flex-col items-center gap-1.5 px-3 py-4 rounded-[18px] border-2
                      cursor-pointer transition-all duration-200 text-center font-sans
                      bg-gradient-to-b ${highlightClass} ${borderClass}
                      ${isLoading ? 'scale-95 opacity-80' : 'hover:scale-[1.02] hover:shadow-[0_4px_20px_rgba(0,0,0,0.18)]'}
                      ${demoLoading && !isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isLoading && (
                      <div className="absolute inset-0 rounded-[16px] border-2 border-brand animate-pulse-soft" />
                    )}
                    <span className="text-[26px] leading-none">{icon}</span>
                    <div className="font-bold text-[13px] text-navy leading-tight">
                      {isLoading ? 'Logging in…' : demoName}
                    </div>
                    <div className="text-[11px] text-muted leading-snug">{subtitle}</div>
                    <div className="mt-1 px-2.5 py-0.5 rounded-full bg-white/70 border border-black/8 text-[10px] font-bold text-muted-dark uppercase tracking-[0.06em]">
                      {isLoading ? '⏳' : 'Quick demo'}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-center mt-3 text-white/30 text-[11px]">
              Demo accounts are pre-configured — no email or password required
            </p>
          </div>

          {/* 2SV notice */}
          <div className="mt-4 flex items-center justify-center gap-2 text-white/35 text-[11px]">
            <span>🔐</span>
            <span>Protected by 2-step verification · Auto-lock after too many failed attempts</span>
          </div>

          {/* Guest link */}
          <p className="text-center mt-3 text-[13px] text-white/40">
            <Link href="/" className="text-white/65 no-underline font-semibold border-b border-white/20 pb-px hover:text-white/90 transition-colors">
              ← Continue browsing without an account
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
