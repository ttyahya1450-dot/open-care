'use client';

import { Suspense, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import SecurityRedirectError from '../../components/SecurityRedirectError';

const ROLE_HOME: Record<string, string> = {
  PARTICIPANT:  '/',
  WORKER:       '/workers',
  COORDINATOR:  '/coordinator',
};

function UnauthorizedContent() {
  const router       = useRouter();
  const { user }     = useAuth();
  const params       = useSearchParams();

  const attemptedUrl  = params.get('attempted') ?? '/unknown';
  const requiredRole  = params.get('required')  ?? 'authorized role';
  const userRole      = user?.role ?? (params.get('role') ?? 'UNKNOWN');
  const dest          = ROLE_HOME[userRole] ?? '/auth';

  const handleRedirect = useCallback(() => {
    router.replace(dest);
  }, [router, dest]);

  // Safety fallback — if no user after 500 ms, go to auth
  useEffect(() => {
    if (!user) {
      const id = setTimeout(() => router.replace('/auth'), 500);
      return () => clearTimeout(id);
    }
  }, [user, router]);

  return (
    <SecurityRedirectError
      userRole={userRole}
      attemptedUrl={attemptedUrl}
      requiredRole={requiredRole}
      userName={user?.name}
      onRedirect={handleRedirect}
      countdownSecs={5}
    />
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={null}>
      <UnauthorizedContent />
    </Suspense>
  );
}
