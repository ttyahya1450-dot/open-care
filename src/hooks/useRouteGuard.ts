'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, type UserRole } from '../context/AuthContext';

const ROLE_HOME: Record<UserRole, string> = {
  PARTICIPANT:  '/',
  WORKER:       '/workers',
  COORDINATOR:  '/coordinator',
};

interface GuardConfig {
  /** Roles that may view this page. Omit to allow any authenticated user. */
  allowedRoles?: UserRole[];
  /** Redirect unauthenticated visitors to /auth. Default false. */
  requireAuth?: boolean;
}

/**
 * Client-side route guard with security violation redirect.
 *
 * Unauthorized cross-role access → /unauthorized?... (shows SecurityRedirectError screen)
 * Unauthenticated access on requireAuth pages → /auth
 *
 * Example:
 *   const { isAllowed } = useRouteGuard({ allowedRoles: ['COORDINATOR'], requireAuth: true });
 *   if (!isAllowed) return null;
 */
export function useRouteGuard({ allowedRoles, requireAuth = true }: GuardConfig = {}) {
  const { user, loading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  // Serialize allowedRoles to a stable string so it can safely go in deps
  const allowedKey = allowedRoles?.join(',') ?? '';

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (requireAuth) router.replace('/auth');
      return;
    }

    // Logged-in user attempting to access a page their role isn't permitted for
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      const params = new URLSearchParams({
        attempted: pathname ?? '/unknown',
        required:  allowedRoles.join(' or '),
        role:      user.role,
      });
      // Show the security violation screen instead of silently bouncing
      router.replace(`/unauthorized?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router, requireAuth, allowedKey, pathname]);

  const isAllowed =
    !loading &&
    (user
      ? !allowedRoles || allowedRoles.includes(user.role)
      : !requireAuth);

  return { user, loading, isAllowed };
}
