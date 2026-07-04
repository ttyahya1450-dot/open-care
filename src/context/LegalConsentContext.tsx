'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { type LegalConsent, getConsentStore, hasValidConsent, saveConsent, LEGAL_TERMS_VERSION } from '../lib/legalStore';
import { useAuth } from './AuthContext';

interface LegalConsentContextValue {
  hasConsented: boolean;
  consent: LegalConsent | null;
  recordConsent: (consent: LegalConsent) => void;
}

const LegalConsentContext = createContext<LegalConsentContextValue | null>(null);

export function LegalConsentProvider({ children }: { children: React.ReactNode }) {
  const { user, loading, isNewUser } = useAuth();
  const [hasConsented, setHasConsented] = useState(true); // default true — avoids flash before check
  const [consent, setConsent] = useState<LegalConsent | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Not logged in — no modal needed
      setHasConsented(true);
      setConsent(null);
      return;
    }

    // Returning user — consent is only collected during initial registration
    if (!isNewUser) {
      setHasConsented(true);
      setConsent(null);
      return;
    }

    const store = getConsentStore();
    const existing = store[user.email] ?? null;
    const valid = hasValidConsent(user.email);
    setConsent(existing);
    setHasConsented(valid);
  }, [user, loading, isNewUser]);

  const recordConsent = useCallback((c: LegalConsent) => {
    saveConsent(c);
    setConsent(c);
    setHasConsented(true);
  }, []);

  return (
    <LegalConsentContext.Provider value={{ hasConsented, consent, recordConsent }}>
      {children}
    </LegalConsentContext.Provider>
  );
}

export function useLegalConsent(): LegalConsentContextValue {
  const ctx = useContext(LegalConsentContext);
  if (!ctx) throw new Error('useLegalConsent must be used within LegalConsentProvider');
  return ctx;
}

export { LEGAL_TERMS_VERSION };
