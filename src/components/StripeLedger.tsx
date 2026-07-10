'use client';

import { useEffect, useState } from 'react';
import {
  getStripeStore, settleAllPending,
  StripeStore, StripeTransaction, StripeSettlementStatus,
} from '../lib/stripeStore';
import { MaskedText } from './DataMaskProvider';

type FilterTab = 'all' | 'paid' | 'in_transit' | 'pending';

const STATUS_LABEL: Record<StripeSettlementStatus, string> = {
  paid:       'Paid',
  in_transit: 'In Transit',
  pending:    'Pending',
  failed:     'Failed',
};

const STATUS_STYLE: Record<StripeSettlementStatus, string> = {
  paid:       'bg-green-100 text-green-700 border border-green-200',
  in_transit: 'bg-amber-100 text-amber-700 border border-amber-200',
  pending:    'bg-slate-100 text-slate-600 border border-slate-200',
  failed:     'bg-rose-100 text-rose-700 border border-rose-200',
};

const FILTER_LABELS: Record<FilterTab, string> = {
  all: 'All', paid: 'Paid', in_transit: 'In Transit', pending: 'Pending',
};

function fmt(n: number) { return n.toFixed(2); }

export default function StripeLedger() {
  const [store,    setStore]    = useState<StripeStore | null>(null);
  const [filter,   setFilter]   = useState<FilterTab>('all');
  const [settling, setSettling] = useState(false);

  useEffect(() => { setStore(getStripeStore()); }, []);

  if (!store) return null;

  const all       = store.transactions;
  const visible   = filter === 'all' ? all : all.filter((t) => t.settlementStatus === filter);
  const paidCount = all.filter((t) => t.settlementStatus === 'paid').length;
  const itCount   = all.filter((t) => t.settlementStatus === 'in_transit').length;
  const pendCount = all.filter((t) => t.settlementStatus === 'pending').length;

  const handleSettle = async () => {
    setSettling(true);
    await new Promise((r) => setTimeout(r, 1200));
    setStore(settleAllPending());
    setSettling(false);
  };

  return (
    <div id="stripe-ledger" className="card-lg">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h2 className="text-[20px] font-bold text-navy dark:text-white m-0">
              Booking Payments
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">
              APP 11 Protected
            </span>
          </div>
          <p className="text-sm text-muted-light dark:text-slate-400 m-0">
            A clear breakdown of every booking payment — your care worker&apos;s share and the OpenCare service fee.
          </p>
        </div>

        <button
          onClick={handleSettle}
          disabled={settling || pendCount + itCount === 0}
          className={`px-4 py-2.5 min-h-[44px] rounded-2xl border-none font-bold text-[13px] cursor-pointer transition-all whitespace-nowrap ${
            settling || pendCount + itCount === 0
              ? 'bg-surface-muted text-muted-lighter cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
              : 'bg-gradient-to-br from-navy to-navy-light text-white shadow-md hover:opacity-90'
          }`}
        >
          {settling ? 'Updating…' : '⚡ Mark All Pending as Settled'}
        </button>
      </div>

      {/* Balance card */}
      <div className="rounded-[20px] p-5 mb-6 text-white"
        style={{ background: 'linear-gradient(135deg,#162033 0%,#1e3a5f 100%)' }}
      >
        <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-300 mb-1.5">
          Platform Earnings
        </div>
        <div className="text-[36px] font-extrabold tracking-tight mb-1">
          ${fmt(store.platformRunningBalance)}
        </div>
        <div className="text-[12px] text-blue-200">
          Total service fees collected from all settled bookings
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Total',      val: all.length.toString(),    color: 'text-white' },
            { label: 'Paid ✓',    val: paidCount.toString(),     color: 'text-green-300' },
            { label: 'In Transit', val: itCount.toString(),       color: 'text-amber-300' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white/10 rounded-[12px] p-2.5 text-center">
              <div className={`text-[20px] font-extrabold ${color}`}>{val}</div>
              <div className="text-[10px] text-blue-200 font-semibold mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface-muted dark:bg-slate-800 rounded-[12px] p-1 border border-surface-border dark:border-slate-700 mb-4">
        {(Object.keys(FILTER_LABELS) as FilterTab[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 min-h-[44px] rounded-[9px] border-none font-bold text-[11px] cursor-pointer transition-all ${
              filter === f
                ? 'bg-white dark:bg-slate-700 text-navy dark:text-white shadow-sm'
                : 'bg-transparent text-muted-light dark:text-slate-400 hover:text-navy dark:hover:text-white'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Transaction table */}
      <div className="grid gap-2">
        {/* Desktop header */}
        <div
          className="hidden md:grid text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-lighter dark:text-slate-500 px-3"
          style={{ gridTemplateColumns: '90px 1fr 1fr 90px 90px 80px 100px' }}
        >
          <div>Date</div>
          <div>Participant</div>
          <div>Worker</div>
          <div className="text-right">Gross</div>
          <div className="text-right">Provider 87.5%</div>
          <div className="text-right">OpenCare 12.5%</div>
          <div className="text-right">Status</div>
        </div>

        {visible.length === 0 && (
          <div className="text-center py-8 text-muted-light dark:text-slate-400 text-sm">
            No transactions in this filter.
          </div>
        )}

        {visible.map((tx: StripeTransaction) => (
          <div
            key={tx.id}
            className="rounded-[14px] border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5"
          >
            {/* Mobile */}
            <div className="md:hidden">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-[13px] text-navy dark:text-white">
                    <MaskedText value={tx.participantName} />
                  </div>
                  <div className="text-[11px] text-muted-light dark:text-slate-400">
                    → <MaskedText value={tx.workerName} /> · {tx.serviceType}
                  </div>
                </div>
                <span className={`badge text-[10px] whitespace-nowrap ${STATUS_STYLE[tx.settlementStatus]}`}>
                  {tx.settlementStatus === 'pending' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 inline-block animate-pulse" />
                  )}
                  {STATUS_LABEL[tx.settlementStatus]}
                </span>
              </div>
              <div className="flex gap-4 text-[11px]">
                <span className="text-muted-light dark:text-slate-400">{tx.date}</span>
                <span className="font-bold text-navy dark:text-white">Gross ${fmt(tx.grossAmount)}</span>
                <span className="text-green-700 dark:text-green-400 font-semibold">Provider ${fmt(tx.workerSplit)}</span>
                <span className="text-purple-700 dark:text-purple-300 font-semibold">Fee ${fmt(tx.platformSplit)}</span>
              </div>
            </div>

            {/* Desktop */}
            <div
              className="hidden md:grid items-center gap-3"
              style={{ gridTemplateColumns: '90px 1fr 1fr 90px 90px 80px 100px' }}
            >
              <div className="text-[12px] text-muted-dark dark:text-slate-300 font-mono">{tx.date}</div>
              <div className="text-[13px] font-semibold text-navy dark:text-white">
                <MaskedText value={tx.participantName} />
              </div>
              <div className="text-[13px] text-muted-dark dark:text-slate-300">
                <MaskedText value={tx.workerName} />
                <div className="text-[10px] text-muted-lighter dark:text-slate-500 mt-0.5">{tx.serviceType}</div>
              </div>
              <div className="text-right font-bold text-[13px] text-navy dark:text-white">
                ${fmt(tx.grossAmount)}
              </div>
              <div className="text-right">
                <div className="text-[13px] font-bold text-green-700 dark:text-green-400">${fmt(tx.workerSplit)}</div>
                <div className="text-[10px] text-muted-lighter dark:text-slate-500">87.5% payout</div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-bold text-purple-700 dark:text-purple-300">${fmt(tx.platformSplit)}</div>
                <div className="text-[10px] text-muted-lighter dark:text-slate-500">12.5% fee</div>
              </div>
              <div className="flex justify-end">
                <span className={`badge text-[11px] whitespace-nowrap ${STATUS_STYLE[tx.settlementStatus]}`}>
                  {tx.settlementStatus === 'pending' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 inline-block animate-pulse" />
                  )}
                  {STATUS_LABEL[tx.settlementStatus]}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-muted-lighter dark:text-slate-500 mt-4 text-center m-0">
        Payment records are shown for illustration only — no real money is transferred ·
        Personal details are protected under Australian Privacy Principle 11
      </p>
    </div>
  );
}
