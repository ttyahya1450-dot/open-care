'use client';

import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';

export type UserRole = 'PARTICIPANT' | 'WORKER' | 'COORDINATOR';

// ── Profile shape (stored on every user, pre-filled at signup) ─────────────

export interface UserProfile {
  bio: string;
  suburb: string;
  hourlyRate?: number;
  strengths?: string[];
  organisation?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
}

// ── Role-specific profile defaults ─────────────────────────────────────────

const ROLE_DEFAULTS: Record<UserRole, (name: string) => UserProfile> = {
  PARTICIPANT: () => ({
    bio: 'NDIS participant seeking reliable, experienced support workers for daily activities and community access.',
    suburb: 'Sydney, NSW',
  }),
  WORKER: (name) => ({
    bio: `${name} is a dedicated support worker passionate about person-centred care and helping NDIS participants build independence in their everyday lives.`,
    suburb: 'Sydney, NSW',
    hourlyRate: 92,
    strengths: ['Highly Punctual', 'Person-Centred Approach', 'NDIS Approved', 'Calm in High-Stress Situations'],
  }),
  COORDINATOR: (name) => ({
    bio: `${name} manages NDIS support plans and coordinates care teams across multiple participants.`,
    suburb: 'Sydney, NSW',
    organisation: 'NDIS Support Services',
  }),
};

// ── Three ready-to-use demo accounts ───────────────────────────────────────

export const DEMO_ACCOUNTS: Record<UserRole, AuthUser> = {
  PARTICIPANT: {
    id: 'demo-participant-001',
    name: 'Alex Morgan',
    email: 'alex@demo.opencare',
    role: 'PARTICIPANT',
    profile: {
      bio: 'NDIS participant seeking reliable support workers for daily activities, community access, and building independence with confidence.',
      suburb: 'Northbridge, NSW',
    },
  },
  WORKER: {
    id: 'demo-worker-001',
    name: 'Maya Chen',
    email: 'maya@demo.opencare',
    role: 'WORKER',
    profile: {
      bio: 'Support worker with a calm, dependable approach and strong experience helping participants build confidence in daily routines.',
      suburb: 'Northbridge, NSW',
      hourlyRate: 92,
      strengths: [
        'Highly Punctual', 'Consistently Present',
        'Great with Non-Verbal Communication', 'Active Listener',
        'Calm in High-Stress Situations', 'Person-Centred Approach',
        'Pet Friendly', 'Dual Language Speaker',
        'NDIS Approved', 'Manual Handling Certified', 'Positive Behaviour Support Trained',
      ],
    },
  },
  COORDINATOR: {
    id: 'demo-coordinator-001',
    name: 'Jordan Brooks',
    email: 'jordan@demo.opencare',
    role: 'COORDINATOR',
    profile: {
      bio: 'Support coordinator overseeing NDIS plan funding, care team rostering, and compliance reporting for multiple participants.',
      suburb: 'Sydney, NSW',
      organisation: 'OpenCare Support Services',
    },
  },
};

// ── State & actions ────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  isNewUser: boolean;
  tourStep: number;
  tourCompleted: boolean;
  loading: boolean;
}

type AuthAction =
  | { type: 'SIGN_IN';        user: AuthUser }
  | { type: 'SIGN_UP';        user: AuthUser }
  | { type: 'DEMO_LOGIN';     user: AuthUser }
  | { type: 'SIGN_OUT' }
  | { type: 'SET_TOUR_STEP';  step: number }
  | { type: 'COMPLETE_TOUR' }
  | { type: 'HYDRATE';        state: Partial<AuthState> };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SIGN_IN':
      return { ...state, user: action.user, isNewUser: false, loading: false };
    case 'SIGN_UP':
      return { ...state, user: action.user, isNewUser: true, tourStep: 0, tourCompleted: false, loading: false };
    case 'DEMO_LOGIN':
      // Demo accounts skip the tour — jump straight to the portal
      return { ...state, user: action.user, isNewUser: false, tourCompleted: true, loading: false };
    case 'SIGN_OUT':
      return { user: null, isNewUser: false, tourStep: 0, tourCompleted: false, loading: false };
    case 'SET_TOUR_STEP':
      return { ...state, tourStep: action.step };
    case 'COMPLETE_TOUR':
      return { ...state, tourCompleted: true, isNewUser: false };
    case 'HYDRATE':
      return { ...state, ...action.state, loading: false };
    default:
      return state;
  }
}

const initialState: AuthState = {
  user: null, isNewUser: false, tourStep: 0, tourCompleted: false, loading: true,
};

// ── Context value shape ────────────────────────────────────────────────────

export interface AuthContextValue {
  user: AuthUser | null;
  isNewUser: boolean;
  tourStep: number;
  tourCompleted: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (name: string, email: string, password: string, role: UserRole) => Promise<AuthUser>;
  loginAsDemo: (role: UserRole) => AuthUser;
  signOut: () => void;
  setTourStep: (step: number) => void;
  completeTour: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'opencare_auth_v1';

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Hydrate from localStorage on mount — restores preferences only, never user session.
  // Every page load starts unauthenticated; users must sign in explicitly.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: Partial<AuthState> = raw ? (JSON.parse(raw) as Partial<AuthState>) : {};
      dispatch({ type: 'HYDRATE', state: {
        isNewUser:     parsed.isNewUser     ?? false,
        tourStep:      parsed.tourStep      ?? 0,
        tourCompleted: parsed.tourCompleted ?? false,
      } });
    } catch {
      dispatch({ type: 'HYDRATE', state: {} });
    }
  }, []);

  // Persist on each meaningful state change — skipped while unauthenticated so a
  // post-HYDRATE write of {user:null} never clobbers the stored profile that
  // signIn() uses for role recovery on the next manual login.
  useEffect(() => {
    if (state.loading || !state.user) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user:          state.user,
        isNewUser:     state.isNewUser,
        tourStep:      state.tourStep,
        tourCompleted: state.tourCompleted,
      }));
    } catch { /* quota / private-mode */ }
  }, [state]);

  // Restores stored profile + role if email matches; otherwise creates with defaults
  const signIn = useCallback(async (email: string, _password: string): Promise<AuthUser> => {
    let name    = email.split('@')[0].replace(/[._-]/g, ' ');
    let role: UserRole = 'PARTICIPANT';
    let profile: UserProfile = ROLE_DEFAULTS.PARTICIPANT(name);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<AuthState>;
        if (saved.user?.email === email) {
          role    = saved.user.role;
          name    = saved.user.name;
          profile = saved.user.profile ?? ROLE_DEFAULTS[role](name);
        }
      }
    } catch { /* ignore */ }

    const user: AuthUser = { id: `uid-${Date.now()}`, name, email, role, profile };
    dispatch({ type: 'SIGN_IN', user });
    return user;
  }, []);

  // Creates user with role-appropriate pre-filled profile
  const signUp = useCallback(async (
    name: string, email: string, _password: string, role: UserRole,
  ): Promise<AuthUser> => {
    const profile = ROLE_DEFAULTS[role](name);
    const user: AuthUser = { id: `uid-${Date.now()}`, name, email, role, profile };
    dispatch({ type: 'SIGN_UP', user });
    return user;
  }, []);

  // Instantly activates a pre-configured demo user — no credentials needed.
  // Wipes any previous session first so roles never bleed across accounts.
  const loginAsDemo = useCallback((role: UserRole): AuthUser => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* private mode */ }
    const user = DEMO_ACCOUNTS[role];
    dispatch({ type: 'DEMO_LOGIN', user });
    return user;
  }, []);

  // Full session teardown: clears storage before state so the persistence
  // effect never writes a partial SIGN_OUT state back over the cleared key.
  const signOut = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* private mode */ }
    dispatch({ type: 'SIGN_OUT' });
  }, []);
  const setTourStep = useCallback((step: number) => dispatch({ type: 'SET_TOUR_STEP', step }), []);
  const completeTour= useCallback(() => dispatch({ type: 'COMPLETE_TOUR' }), []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, loginAsDemo, signOut, setTourStep, completeTour }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
