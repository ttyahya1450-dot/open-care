'use client';

import { useEffect, useState } from 'react';
import {
  getGeofenceStore, runGeofenceCheck,
  KNOWN_ADDRESSES, KnownAddress, GeofenceCheck,
  GEOFENCE_THRESHOLD_METERS,
} from '../lib/geofenceStore';
import { MaskedText } from './DataMaskProvider';

interface GeofenceMonitorProps { viewOnly?: boolean; }

type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString('en-AU', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function GeofenceMonitor({ viewOnly = false }: GeofenceMonitorProps) {
  const [checks,         setChecks]         = useState<GeofenceCheck[]>([]);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [currentCoords,  setCurrentCoords]  = useState<{ lat: number; lng: number } | null>(null);
  const [selectedId,     setSelectedId]     = useState<string>('p1');
  const [latestCheck,    setLatestCheck]    = useState<GeofenceCheck | null>(null);
  const [checking,       setChecking]       = useState(false);

  useEffect(() => {
    setChecks(getGeofenceStore().checks);
  }, []);

  const selectedAddress: KnownAddress =
    KNOWN_ADDRESSES.find((a) => a.participantId === selectedId) ?? KNOWN_ADDRESSES[0];

  const doCheck = (lat: number, lng: number, method: 'browser' | 'simulated') => {
    setChecking(true);
    try {
      const result = runGeofenceCheck(lat, lng, selectedId, method);
      setLatestCheck(result);
      setChecks(getGeofenceStore().checks);
    } finally {
      setChecking(false);
    }
  };

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('error');
      return;
    }
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCurrentCoords({ lat, lng });
        setLocationStatus('granted');
        doCheck(lat, lng, 'browser');
      },
      () => { setLocationStatus('denied'); },
      { timeout: 10_000 },
    );
  };

  const simulateAtAddress = () => {
    const { lat, lng } = selectedAddress;
    setCurrentCoords({ lat, lng });
    setLocationStatus('granted');
    doCheck(lat, lng, 'simulated');
  };

  const recentChecks = checks.slice(0, 10);

  return (
    <div className="card-lg">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
          <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">
            Google Maps Geofence Monitor
          </h2>
          {viewOnly && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600">
              Coordinator View
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
            200m Threshold
          </span>
        </div>
        <p className="text-sm text-muted-light dark:text-slate-400 m-0">
          {viewOnly
            ? 'Audit trail of worker clock-in geofence verifications against participant addresses.'
            : 'Verify your GPS location against the participant address before clocking in.'}
        </p>
      </div>

      {/* Participant selector */}
      <div className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {KNOWN_ADDRESSES.map((a) => (
          <button
            key={a.participantId}
            onClick={() => !viewOnly && setSelectedId(a.participantId)}
            disabled={viewOnly}
            className={`text-left p-3.5 rounded-[16px] border-2 transition-all font-sans ${
              viewOnly ? 'cursor-default' : 'cursor-pointer'
            } ${
              a.participantId === selectedId
                ? 'border-brand bg-blue-50 dark:bg-blue-900/20 dark:border-brand'
                : 'border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-surface-input dark:hover:border-slate-600'
            }`}
          >
            <div className="font-bold text-[13px] text-navy dark:text-white mb-0.5">
              {a.participantName}
            </div>
            <div className="text-[11px] text-muted-light dark:text-slate-400">{a.address}</div>
            <div className="text-[10px] font-mono text-muted-lighter dark:text-slate-500 mt-1">
              {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
            </div>
          </button>
        ))}
      </div>

      {/* Action buttons (hidden in viewOnly) */}
      {!viewOnly && (
        <div className="grid gap-3 sm:grid-cols-2 mb-5">
          <button
            onClick={requestLocation}
            disabled={checking || locationStatus === 'requesting'}
            className={`flex items-center justify-center gap-2 py-3 rounded-[14px] border-none font-bold text-[13px] cursor-pointer transition-all ${
              locationStatus === 'requesting' || checking
                ? 'bg-surface-muted text-muted-lighter cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                : 'bg-navy text-white hover:opacity-90 shadow-sm'
            }`}
          >
            {locationStatus === 'requesting' ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Requesting GPS…
              </>
            ) : (
              '📍 Request Location'
            )}
          </button>

          <button
            onClick={simulateAtAddress}
            disabled={checking}
            className={`flex items-center justify-center gap-2 py-3 rounded-[14px] border-none font-bold text-[13px] cursor-pointer transition-all ${
              checking
                ? 'bg-surface-muted text-muted-lighter cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
            }`}
          >
            ✓ Simulate At Address
          </button>
        </div>
      )}

      {/* Location denied warning */}
      {locationStatus === 'denied' && (
        <div className="rounded-[14px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4 mb-5 flex items-start gap-3">
          <span className="text-[18px] mt-0.5">⚠</span>
          <div>
            <div className="font-bold text-amber-800 dark:text-amber-300 text-[13px] mb-0.5">
              Location access denied
            </div>
            <div className="text-[12px] text-amber-700 dark:text-amber-400">
              Browser GPS access was denied. Use &quot;Simulate At Address&quot; to proceed.
            </div>
          </div>
        </div>
      )}

      {locationStatus === 'error' && (
        <div className="rounded-[14px] bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 p-4 mb-5">
          <div className="font-bold text-rose-800 dark:text-rose-300 text-[13px]">
            Geolocation not supported
          </div>
          <div className="text-[12px] text-rose-700 dark:text-rose-400 mt-0.5">
            This browser does not support GPS. Use Simulate At Address.
          </div>
        </div>
      )}

      {/* Latest check result */}
      {latestCheck && (
        <div className={`rounded-[16px] border-2 p-4 mb-5 transition-all ${
          latestCheck.passed
            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
            : 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="font-bold text-[16px] text-navy dark:text-white">
              {latestCheck.passed ? '✅ Within Geofence' : '❌ Outside Geofence — Audit Flag Raised'}
            </div>
            <span className={`badge ${latestCheck.passed ? 'badge-green' : 'badge-red'}`}>
              {latestCheck.passed ? 'Pass' : 'Fail'}
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="bg-white/60 dark:bg-white/5 rounded-[12px] p-3 text-center">
              <div className={`text-[24px] font-extrabold tracking-tight ${
                latestCheck.passed ? 'text-green-700 dark:text-green-400' : 'text-rose-700 dark:text-rose-400'
              }`}>
                {latestCheck.distanceMeters.toFixed(1)}m
              </div>
              <div className="text-[10px] text-muted-light dark:text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                Distance
              </div>
            </div>
            <div className="bg-white/60 dark:bg-white/5 rounded-[12px] p-3 text-center">
              <div className="text-[24px] font-extrabold tracking-tight text-navy dark:text-white">
                {GEOFENCE_THRESHOLD_METERS}m
              </div>
              <div className="text-[10px] text-muted-light dark:text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                Threshold
              </div>
            </div>
            <div className="bg-white/60 dark:bg-white/5 rounded-[12px] p-3 text-center">
              <div className="text-[13px] font-bold text-muted-dark dark:text-slate-300">
                {latestCheck.method === 'simulated' ? '🔵 Simulated' : '📍 Browser GPS'}
              </div>
              <div className="text-[10px] text-muted-light dark:text-slate-400 font-semibold uppercase tracking-wider mt-1">
                Method
              </div>
            </div>
          </div>

          {currentCoords && (
            <div className="mt-3 text-[12px] text-muted-dark dark:text-slate-300">
              <span className="font-semibold">Worker coords: </span>
              <span className="font-mono">
                <MaskedText
                  value={`${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`}
                  type="gps"
                />
              </span>
            </div>
          )}
        </div>
      )}

      {/* Audit history */}
      {recentChecks.length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold text-navy dark:text-white mb-3 uppercase tracking-wider">
            Audit History (last {recentChecks.length})
          </h3>

          <div className="grid gap-2">
            <div
              className="hidden sm:grid text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-lighter dark:text-slate-500 px-3"
              style={{ gridTemplateColumns: '140px 1fr 1fr 90px 70px 60px' }}
            >
              <div>Timestamp</div>
              <div>Worker Coords</div>
              <div>Participant</div>
              <div className="text-right">Distance</div>
              <div className="text-right">Method</div>
              <div className="text-right">Result</div>
            </div>

            {recentChecks.map((c) => {
              const addr = KNOWN_ADDRESSES.find((a) => a.participantId === c.targetParticipantId);
              return (
                <div
                  key={c.id}
                  className="rounded-[12px] border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                >
                  <div className="sm:hidden flex justify-between mb-1.5">
                    <span className="text-[11px] text-muted-dark dark:text-slate-300">{fmtTs(c.checkedAt)}</span>
                    <span className={`badge text-[10px] ${c.passed ? 'badge-green' : 'badge-red'}`}>
                      {c.passed ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                  <div className="sm:hidden text-[11px] text-muted-light dark:text-slate-400">
                    {addr?.participantName ?? c.targetParticipantId} · {c.distanceMeters.toFixed(1)}m away
                  </div>

                  <div
                    className="hidden sm:grid items-center gap-3"
                    style={{ gridTemplateColumns: '140px 1fr 1fr 90px 70px 60px' }}
                  >
                    <div className="text-[11px] text-muted-dark dark:text-slate-300">{fmtTs(c.checkedAt)}</div>
                    <div className="font-mono text-[10px] text-muted-light dark:text-slate-400 truncate">
                      <MaskedText
                        value={`${c.workerLat.toFixed(6)}, ${c.workerLng.toFixed(6)}`}
                        type="gps"
                      />
                    </div>
                    <div className="text-[12px] text-muted-dark dark:text-slate-300">
                      {addr?.participantName ?? c.targetParticipantId}
                    </div>
                    <div className="text-right">
                      <span className={`font-bold text-[12px] ${
                        c.passed ? 'text-green-700 dark:text-green-400' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {c.distanceMeters.toFixed(1)}m
                      </span>
                    </div>
                    <div className="text-right text-[11px] text-muted-light dark:text-slate-400">
                      {c.method === 'simulated' ? 'Sim' : 'GPS'}
                    </div>
                    <div className="flex justify-end">
                      <span className={`badge text-[10px] ${c.passed ? 'badge-green' : 'badge-red'}`}>
                        {c.passed ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recentChecks.length === 0 && viewOnly && (
        <div className="text-center py-6 text-muted-light dark:text-slate-400 text-sm bg-surface dark:bg-slate-800 rounded-[14px] border border-surface-border dark:border-slate-700">
          No geofence checks recorded yet. Workers must check in via the Worker Portal.
        </div>
      )}
    </div>
  );
}
