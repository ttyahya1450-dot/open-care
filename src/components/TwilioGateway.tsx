'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getTwilioStore, queueMessage, updateMessageStatus,
  TwilioMessage, TwilioDeliveryStatus,
} from '../lib/twilioStore';
import { generateOTP, storeOTP } from '../lib/securityStore';

type FireState = 'idle' | 'queuing' | 'sending' | 'delivered';

const TYPE_STYLE: Record<string, string> = {
  otp:                   'bg-purple-100 text-purple-700 border border-purple-200',
  arrival_alert:         'bg-green-100 text-green-700 border border-green-200',
  booking_confirmation:  'bg-blue-100 text-blue-700 border border-blue-200',
};

const TYPE_LABEL: Record<string, string> = {
  otp:                  '2FA Code',
  arrival_alert:        'Arrival Alert',
  booking_confirmation: 'Booking',
};

const DELIVERY_STYLE: Record<TwilioDeliveryStatus, string> = {
  queued:    'bg-slate-100 text-slate-600 border border-slate-200',
  sending:   'bg-amber-100 text-amber-700 border border-amber-200',
  delivered: 'bg-green-100 text-green-700 border border-green-200',
  failed:    'bg-rose-100 text-rose-700 border border-rose-200',
};

const DELIVERY_LABEL: Record<TwilioDeliveryStatus, string> = {
  queued:    'Preparing',
  sending:   'Sending',
  delivered: 'Delivered',
  failed:    'Failed',
};

function fmtTs(iso: string) {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function TwilioGateway() {
  const [messages,      setMessages]      = useState<TwilioMessage[]>([]);
  const [otpFireState,  setOtpFireState]  = useState<FireState>('idle');
  const [smsFireState,  setSmsFireState]  = useState<FireState>('idle');
  const [inlineOTP,     setInlineOTP]     = useState<string | null>(null);
  const [inlineArrival, setInlineArrival] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setMessages(getTwilioStore().messages);
    const t = timers.current;
    return () => { t.forEach(clearTimeout); };
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  const refreshMessages = useCallback(() => {
    setMessages(getTwilioStore().messages);
  }, []);

  const fireOTP = useCallback(() => {
    if (otpFireState !== 'idle') return;
    const otp     = generateOTP();
    storeOTP('04●● ●●● 042', otp);
    const msg = queueMessage({
      type:     'otp',
      toNumber: '04●● ●●● 042',
      body:     `[OpenCare] Your security code is ${otp}. Valid for 5 minutes. Do not share this code.`,
      status:   'queued',
      otpCode:  otp,
    });
    setInlineOTP(otp);
    setOtpFireState('queuing');
    refreshMessages();

    schedule(() => {
      updateMessageStatus(msg.id, 'sending');
      setOtpFireState('sending');
      refreshMessages();
    }, 800);

    schedule(() => {
      updateMessageStatus(msg.id, 'delivered', new Date().toISOString());
      setOtpFireState('delivered');
      refreshMessages();
    }, 2000);

    schedule(() => {
      setOtpFireState('idle');
      setInlineOTP(null);
      refreshMessages();
    }, 3200);
  }, [otpFireState, refreshMessages, schedule]);

  const fireArrival = useCallback(() => {
    if (smsFireState !== 'idle') return;
    try { sessionStorage.removeItem('opencare_sms_shown'); } catch { /* private mode */ }

    const msg = queueMessage({
      type:     'arrival_alert',
      toNumber: '04●● ●●● 001',
      body:     'Your support worker Maya Chen is approximately 10 minutes away. Please ensure access is ready.',
      status:   'queued',
    });
    setInlineArrival(true);
    setSmsFireState('queuing');
    refreshMessages();

    schedule(() => {
      updateMessageStatus(msg.id, 'sending');
      setSmsFireState('sending');
      refreshMessages();
    }, 800);

    schedule(() => {
      updateMessageStatus(msg.id, 'delivered', new Date().toISOString());
      setSmsFireState('delivered');
      refreshMessages();
    }, 2000);

    schedule(() => {
      setSmsFireState('idle');
      setInlineArrival(false);
      refreshMessages();
    }, 3200);
  }, [smsFireState, refreshMessages, schedule]);

  const pipelineLabel = (s: FireState) => {
    if (s === 'idle')      return '';
    if (s === 'queuing')   return 'Preparing…';
    if (s === 'sending')   return 'Sending…';
    return 'Delivered ✓';
  };

  return (
    <div className="card-lg">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
          <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">System Notifications Test</h2>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700">
            Simulated
          </span>
        </div>
        <p className="text-sm text-muted-light dark:text-slate-400 m-0">
          Test how automated text alerts and security codes look on a mobile phone.
        </p>
      </div>

      {/* Action buttons */}
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        {/* 2FA Code */}
        <div className="rounded-[18px] border-2 border-surface-border dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[18px]">🔑</span>
            <div>
              <div className="font-bold text-[14px] text-navy dark:text-white">Test Login Code</div>
              <div className="text-[11px] text-muted-light dark:text-slate-400">See how a login security code appears on a phone</div>
            </div>
          </div>

          {inlineOTP && (
            <div className="rounded-[14px] bg-slate-900 border border-slate-700 p-3.5 mb-3 text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                <span>iMessage</span>
                <span className="text-slate-500">now</span>
              </div>
              <div className="bg-blue-600 rounded-[10px] rounded-tl-sm px-3 py-2.5 inline-block max-w-[90%]">
                <div className="text-white text-[12px] leading-relaxed font-medium">
                  [OpenCare] Your security code is{' '}
                  <span className="font-mono font-extrabold text-amber-300 tracking-[0.3em]">
                    {inlineOTP}
                  </span>. Valid for 5 minutes.
                </div>
              </div>
              <div className="mt-1.5 text-[10px] text-slate-500">
                Sent securely to device
              </div>
            </div>
          )}

          <button
            onClick={fireOTP}
            disabled={otpFireState !== 'idle'}
            className={`w-full py-3 min-h-[44px] rounded-[12px] border-none font-bold text-[13px] cursor-pointer transition-all ${
              otpFireState !== 'idle'
                ? 'bg-purple-100 text-purple-600 cursor-not-allowed dark:bg-purple-900/30 dark:text-purple-400'
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
            }`}
          >
            {otpFireState === 'idle' ? 'Send Test Login Code' : pipelineLabel(otpFireState)}
          </button>

          {otpFireState !== 'idle' && (
            <PipelineTrack state={otpFireState} />
          )}
        </div>

        {/* Arrival Alert */}
        <div className="rounded-[18px] border-2 border-surface-border dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[18px]">📍</span>
            <div>
              <div className="font-bold text-[14px] text-navy dark:text-white">Test Arrival Notice</div>
              <div className="text-[11px] text-muted-light dark:text-slate-400">See how a worker arrival alert looks on a phone</div>
            </div>
          </div>

          {inlineArrival && (
            <div className="rounded-[14px] bg-slate-900 border border-slate-700 p-3.5 mb-3 text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                <span>iMessage</span>
                <span className="text-slate-500">now</span>
              </div>
              <div className="bg-green-600 rounded-[10px] rounded-tl-sm px-3 py-2.5 inline-block max-w-[90%]">
                <div className="text-white text-[12px] leading-relaxed font-medium">
                  Your support worker <strong>Maya Chen</strong> is approximately 10 minutes away.
                  Please ensure access is ready.
                </div>
              </div>
              <div className="mt-2 text-[10px] text-green-400 bg-green-900/30 rounded-lg px-2 py-1">
                Alert will appear again on next login
              </div>
            </div>
          )}

          <button
            onClick={fireArrival}
            disabled={smsFireState !== 'idle'}
            className={`w-full py-3 min-h-[44px] rounded-[12px] border-none font-bold text-[13px] cursor-pointer transition-all ${
              smsFireState !== 'idle'
                ? 'bg-green-100 text-green-600 cursor-not-allowed dark:bg-green-900/30 dark:text-green-400'
                : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
            }`}
          >
            {smsFireState === 'idle' ? 'Send Test Arrival Notice' : pipelineLabel(smsFireState)}
          </button>

          {smsFireState !== 'idle' && (
            <PipelineTrack state={smsFireState} />
          )}
        </div>
      </div>

      {/* Message outbox */}
      <div>
        <h3 className="text-[14px] font-bold text-navy dark:text-white mb-3">
          Sent Messages ({messages.length})
        </h3>

        {messages.length === 0 ? (
          <div className="text-center py-6 text-muted-light dark:text-slate-400 text-sm bg-surface dark:bg-slate-800 rounded-[14px] border border-surface-border dark:border-slate-700">
            No messages sent yet — test an alert above.
          </div>
        ) : (
          <div className="grid gap-2">
            {/* Desktop header */}
            <div
              className="hidden sm:grid text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-lighter dark:text-slate-500 px-3"
              style={{ gridTemplateColumns: '160px 100px 90px 80px 80px' }}
            >
              <div>Reference</div>
              <div>Type</div>
              <div>Status</div>
              <div>Created</div>
              <div>Delivered</div>
            </div>

            {messages.slice(0, 10).map((m) => (
              <div
                key={m.id}
                className="rounded-[12px] border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
              >
                <div className="sm:hidden mb-1.5 flex justify-between">
                  <span className={`badge text-[10px] ${TYPE_STYLE[m.type] ?? 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {TYPE_LABEL[m.type] ?? m.type}
                  </span>
                  <span className={`badge text-[10px] ${DELIVERY_STYLE[m.status]}`}>{DELIVERY_LABEL[m.status]}</span>
                </div>

                <div
                  className="hidden sm:grid items-center gap-3"
                  style={{ gridTemplateColumns: '160px 100px 90px 80px 80px' }}
                >
                  <div className="text-[10px] text-muted-dark dark:text-slate-300 truncate">
                    Sent securely to device
                  </div>
                  <span className={`badge text-[10px] w-fit ${TYPE_STYLE[m.type] ?? 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {TYPE_LABEL[m.type] ?? m.type}
                  </span>
                  <span className={`badge text-[10px] w-fit ${DELIVERY_STYLE[m.status]}`}>
                    {DELIVERY_LABEL[m.status]}
                  </span>
                  <div className="text-[11px] text-muted-light dark:text-slate-400">
                    {fmtTs(m.createdAt)}
                  </div>
                  <div className="text-[11px] text-muted-light dark:text-slate-400">
                    {m.deliveredAt ? fmtTs(m.deliveredAt) : '—'}
                  </div>
                </div>

                <div className="sm:hidden text-[11px] text-muted-light dark:text-slate-400 truncate">
                  Sent securely to device
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Delivery pipeline progress indicator ───────────────────────────────────
function PipelineTrack({ state }: { state: FireState }) {
  const stages: FireState[] = ['queuing', 'sending', 'delivered'];
  const idx = stages.indexOf(state);

  return (
    <div className="flex items-center gap-1 mt-2.5">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${
            i <= idx ? 'bg-brand' : 'bg-surface-border dark:bg-slate-700'
          }`} />
          {i < stages.length - 1 && (
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              i < idx ? 'bg-brand' : 'bg-surface-border dark:bg-slate-700'
            }`} />
          )}
        </div>
      ))}
      <span className="text-[10px] font-bold text-brand ml-1 whitespace-nowrap">
        {state === 'queuing' ? 'Preparing' : state === 'sending' ? 'Sending' : 'Delivered ✓'}
      </span>
    </div>
  );
}
