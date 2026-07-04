'use client';

import { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import {
  type DataStore, type DSWorker, type DSNotification, type DSBooking,
  getStore, updateWorker, markNotificationRead, markAllRead, addBooking, addNotification,
} from '../lib/dataStore';
import { useAuth } from './AuthContext';

interface DataStoreContextValue {
  store: DataStore;
  updateWorkerProfile: (id: string, patch: Partial<DSWorker>) => void;
  markRead:    (id: string)  => void;
  markAllReadForRole: ()     => void;
  createBooking: (b: DSBooking) => void;
  pushNotification: (n: DSNotification) => void;
  unreadCount: number;
}

const DataStoreContext = createContext<DataStoreContextValue | null>(null);

type Action =
  | { type: 'LOAD';          payload: DataStore }
  | { type: 'UPDATE_WORKER'; payload: DataStore }
  | { type: 'MARK_READ';     payload: DataStore }
  | { type: 'MARK_ALL';      payload: DataStore }
  | { type: 'ADD_BOOKING';   payload: DataStore }
  | { type: 'ADD_NOTIF';     payload: DataStore };

function reducer(_: DataStore, action: Action): DataStore {
  return action.payload;
}

export function DataStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [store, dispatch] = useReducer(reducer, null as unknown as DataStore);

  useEffect(() => {
    dispatch({ type: 'LOAD', payload: getStore() });
  }, []);

  const updateWorkerProfile = useCallback((id: string, patch: Partial<DSWorker>) => {
    dispatch({ type: 'UPDATE_WORKER', payload: updateWorker(getStore(), id, patch) });
  }, []);

  const markRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_READ', payload: markNotificationRead(getStore(), id) });
  }, []);

  const markAllReadForRole = useCallback(() => {
    if (!user) return;
    dispatch({ type: 'MARK_ALL', payload: markAllRead(getStore(), user.role) });
  }, [user]);

  const createBooking = useCallback((b: DSBooking) => {
    dispatch({ type: 'ADD_BOOKING', payload: addBooking(getStore(), b) });
  }, []);

  const pushNotification = useCallback((n: DSNotification) => {
    dispatch({ type: 'ADD_NOTIF', payload: addNotification(getStore(), n) });
  }, []);

  const unreadCount = store
    ? store.notifications.filter(
        (n) => !n.read && (!user || n.targetRoles.includes(user.role)),
      ).length
    : 0;

  if (!store) return null;

  return (
    <DataStoreContext.Provider
      value={{ store, updateWorkerProfile, markRead, markAllReadForRole, createBooking, pushNotification, unreadCount }}
    >
      {children}
    </DataStoreContext.Provider>
  );
}

export function useDataStore(): DataStoreContextValue {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error('useDataStore must be used within DataStoreProvider');
  return ctx;
}
