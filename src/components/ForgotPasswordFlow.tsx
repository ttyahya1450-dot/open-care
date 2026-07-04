'use client';

import { useEffect, useRef, useState } from 'react';
import { clearOTP, generateOTP, storeOTP, validateOTP } from '../lib/securityStore';

type Step = 'input' | 'sending' | 'otp' | 'validating' | 'success';

interface Props {
  onClose: () => void;
}

export default function ForgotPasswordFlow({ onClose }: Props) {
  const [step,      setStep]      = useState<Step>('input');
  const [contact,   setContact]   = useState('');
  const [otp,       setOtp]       = useState('');
  const [otpCode,   setOtpCode]   = useState('');
  const [error,     setError]     = useState('');
  const [showBanner, setShowBanner] = useState(false);
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus OTP input once step changes to 'otp'
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [step]);

  // Cleanup on close
  const handleClose = () => {
    clearOTP();
    onClose();
  };

  const handleSendOTP = () => {
    const trimmed = contact.trim();
    if (!trimmed) { setError('Enter your email or phone number.'); return; }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRx = /^[\d\s\+\-()]{7,15}$/;
    if (!emailRx.test(trimmed) && !phoneRx.test(trimmed)) {
      setError('Enter a valid email address or phone number.');
      return;
    }

    setError('');
    setStep('sending');

    const code = generateOTP();
    storeOTP(trimmed, code);
    setOtpCode(code);

    // Simulate network delay then show banner
    setTimeout(() => {
      setStep('otp');
      setTimeout(() => {
        setShowBanner(true);
        setTimeout(() => setShowBanner(false), 7000);
      }, 600);
    }, 1800);
  };

  const handleValidateOTP = () => {
    if (otp.length !== 6) { setError('Enter the 6-digit code.'); return; }
    setError('');
    setStep('validating');

    setTimeout(() => {
      const result = validateOTP(otp);
      if (result === 'valid') {
        setStep('success');
      } else if (result === 'expired') {
        setError('This code has expired. Request a new one.');
        setStep('otp');
      } else if (result === 'max-attempts') {
        setError('Too many incorrect attempts. Request a new code.');
        setStep('otp');
      } else {
        setError('Incorrect code. Check the notification and try again.');
        setStep('otp');
      }
    }, 1200);
  };

  const handleResetPassword = () => {
    if (!newPw || newPw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
    setError('');
    // In a real app, this would call an API. For MVP, simulate success.
    setTimeout(() => handleClose(), 400);
  };

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());

  return (
    <>
      {/* OTP notification banner — mimics an iOS push notification */}
      {showBanner && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] w-full max-w-[360px] mx-4"
          style={{ animation: 'slide-down-in 0.4s ease' }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-2xl border border-surface-border dark:border-slate-600 overflow-hidden">
            {/* Notification chrome */}
            <div className="bg-slate-700 dark:bg-slate-900 px-4 py-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-[6px] bg-brand flex items-center justify-center shrink-0">
                <span className="text-white text-[9px] font-extrabold">OC</span>
              </div>
              <span className="text-[11px] font-bold text-white tracking-wide flex-1">OPENCARE SECURITY</span>
              <span className="text-[10px] text-slate-400">now</span>
            </div>

            <div className="px-4 py-3.5">
              <div className="font-bold text-[13px] text-navy dark:text-white mb-1">
                Your verification code has arrived
              </div>
              <div className="text-[12px] text-muted-dark dark:text-slate-300 mb-3">
                {isEmail
                  ? `Sent to ${contact.slice(0, 3)}●●●●@${contact.split('@')[1] ?? ''}`
                  : `Sent to ●●●● ●●● ${contact.slice(-3)}`
                }
              </div>
              {/* The actual OTP displayed prominently */}
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-[12px] py-2.5 px-4 flex items-center gap-3">
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Code</span>
                <span className="font-mono text-[22px] font-extrabold text-amber-700 dark:text-amber-300 tracking-[0.2em]">
                  {otpCode}
                </span>
                <span className="text-[10px] text-amber-500 dark:text-amber-500 ml-auto">Expires 5 min</span>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes slide-down-in {
              from { transform: translateX(-50%) translateY(-80px); opacity: 0; }
              to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Modal */}
      <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl w-full max-w-[420px] overflow-hidden">

          {/* Header */}
          <div className="px-7 pt-6 pb-5 border-b border-surface-border dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-extrabold text-navy dark:text-white m-0 leading-tight">
                  {step === 'success' ? 'Set New Password' : 'Account Recovery'}
                </h2>
                <p className="text-[12px] text-muted-light dark:text-slate-400 mt-1">
                  {step === 'input' && 'Enter the contact linked to your account'}
                  {step === 'sending' && 'Sending verification code…'}
                  {step === 'otp' && 'Enter the 6-digit code from the notification'}
                  {step === 'validating' && 'Verifying code…'}
                  {step === 'success' && 'Code verified — set a new password below'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-surface-muted dark:bg-slate-800 border border-surface-border dark:border-slate-700 text-muted-light dark:text-slate-400 hover:text-navy dark:hover:text-white cursor-pointer flex items-center justify-center font-bold text-[14px] transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="px-7 py-6">
            {/* Step 1 — Contact input */}
            {(step === 'input' || step === 'sending') && (
              <div>
                <label className="form-label">Email or phone number</label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => { setContact(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                  placeholder="you@example.com or 04xx xxx xxx"
                  disabled={step === 'sending'}
                  className="input mb-4"
                  autoFocus
                />

                {error && <p className="text-rose-500 text-[12px] font-semibold mb-3">{error}</p>}

                {step === 'sending' ? (
                  <div className="flex items-center justify-center gap-3 py-3">
                    <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    <span className="text-[13px] text-muted-dark dark:text-slate-300">Sending secure OTP…</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSendOTP}
                    className="btn-primary w-full"
                  >
                    Send Verification Code
                  </button>
                )}
              </div>
            )}

            {/* Step 2 — OTP entry */}
            {(step === 'otp' || step === 'validating') && (
              <div>
                <div className="bg-brand/5 dark:bg-brand/10 border border-brand/20 dark:border-brand/30 rounded-[14px] px-4 py-3 mb-5">
                  <p className="text-[12px] text-brand-dark dark:text-brand font-semibold">
                    ✉ Check the notification banner — your 6-digit code was displayed there.
                  </p>
                  <p className="text-[11px] text-muted-dark dark:text-slate-300 mt-1">
                    Contact: <span className="font-mono">{contact}</span> · Expires in 5 minutes
                  </p>
                </div>

                <label className="form-label">6-Digit verification code</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidateOTP()}
                  placeholder="000000"
                  disabled={step === 'validating'}
                  className="input text-center font-mono text-[22px] tracking-[0.4em] mb-4"
                />

                {error && <p className="text-rose-500 text-[12px] font-semibold mb-3">{error}</p>}

                {step === 'validating' ? (
                  <div className="flex items-center justify-center gap-3 py-3">
                    <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    <span className="text-[13px] text-muted-dark dark:text-slate-300">Validating code…</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <button onClick={handleValidateOTP} className="btn-primary">Verify Code</button>
                    <button
                      onClick={() => { setStep('input'); setOtp(''); setError(''); clearOTP(); }}
                      className="text-[12px] text-muted-light dark:text-slate-400 hover:text-brand dark:hover:text-brand cursor-pointer py-1 bg-transparent border-none"
                    >
                      ← Try a different contact
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — New password */}
            {step === 'success' && (
              <div>
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-[12px] px-4 py-3 mb-5">
                  <span className="text-green-500 font-bold">✓</span>
                  <span className="text-[12px] text-green-700 dark:text-green-300 font-semibold">Identity verified successfully</span>
                </div>

                <label className="form-label">New password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => { setNewPw(e.target.value); setError(''); }}
                  placeholder="Minimum 8 characters"
                  className="input mb-3"
                  autoFocus
                />

                <label className="form-label">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => { setConfirmPw(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                  placeholder="Repeat password"
                  className="input mb-4"
                />

                {error && <p className="text-rose-500 text-[12px] font-semibold mb-3">{error}</p>}

                <button onClick={handleResetPassword} className="btn-primary w-full">
                  Set New Password
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
