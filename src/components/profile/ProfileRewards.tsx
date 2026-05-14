'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FOCUS_RING } from '@/lib/styles';
import type { TierInfo } from '@/lib/rewards';
import type { PointsHistoryReason } from '@/models/User';

const UNLOCKED_PERKS: { bold: string; body: string }[] = [
  { bold: 'Free pickup, always.', body: 'No minimum order required.' },
  { bold: '2× points', body: 'on weekend orders.' },
  { bold: 'Early access', body: 'to weekly specials.' },
  { bold: 'Free birthday cut', body: 'up to $50.' },
];

const LOCKED_PERKS = ['15% off dry-aged cuts', "Quarterly butcher's box"];

type Filter = 'all' | 'earned' | 'redeemed';

const FILTERS: Filter[] = ['all', 'earned', 'redeemed'];

export type SerializedPointsEntry = {
  delta: number;
  reason: PointsHistoryReason;
  orderId?: string;
  createdAt: string;
};

type Props = {
  points?: number;             // spendable balance
  lifetimePoints: number;
  expiredPoints: number;
  tier: TierInfo;
  qualifyingPoints?: number;   // pts earned this period (drives the progress bar)
  periodEndsAt?: string | null; // ISO. null when shop has no anniversary window
  recentHistory: SerializedPointsEntry[];
  redemptionPoints: number;
  redemptionDollars: number;
  pointsExpiryMonths: number;
};

const fmt = (n: number) => n.toLocaleString('en-US');

function reasonLabel(reason: PointsHistoryReason): { title: string; kind: 'earned' | 'redeemed' | 'bonus' } {
  switch (reason) {
    case 'order_fulfilled':
      return { title: 'Order fulfilled', kind: 'earned' };
    case 'redemption':
      return { title: 'Redeemed at checkout', kind: 'redeemed' };
    case 'cancel_reverse':
      return { title: 'Order cancelled — points reversed', kind: 'redeemed' };
    case 'refund_reverse':
      return { title: 'Order refunded — points reversed', kind: 'redeemed' };
    case 'admin_adjustment':
      return { title: 'Admin adjustment', kind: 'bonus' };
    case 'expired':
      return { title: 'Points expired', kind: 'redeemed' };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProfileRewards({
  points = 0,
  lifetimePoints,
  expiredPoints,
  tier,
  qualifyingPoints,
  periodEndsAt,
  recentHistory,
  redemptionPoints,
  redemptionDollars,
  pointsExpiryMonths,
}: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const atMax = tier.nextTier === null;
  const target = tier.nextThreshold ?? tier.threshold;
  const progressPct = atMax ? 100 : Math.round(tier.progress * 100);
  const dollarValue = Math.floor((points / Math.max(1, redemptionPoints)) * redemptionDollars);
  const nextTierLabel = tier.nextTier === 'masterCut' ? 'Master Cut' : 'Connoisseur';
  const tierLevel = tier.tier === 'masterCut' ? '03' : tier.tier === 'connoisseur' ? '02' : '01';
  // Progress bar reflects qualifying points this period. Falls back to
  // balance if the window is disabled (qualifyingPoints undefined).
  const progressPoints = typeof qualifyingPoints === 'number' ? qualifyingPoints : points;
  const periodEndLabel = periodEndsAt
    ? new Date(periodEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const visible = recentHistory.filter((row) => {
    if (filter === 'all') return true;
    const k = reasonLabel(row.reason).kind;
    if (filter === 'earned') return k === 'earned' || k === 'bonus';
    return k === 'redeemed';
  });

  return (
    <div>
      <div className='flex flex-wrap items-end justify-between gap-4 mb-7'>
        <h2 className='font-display text-[28px] font-normal tracking-tight leading-tight'>
          Your <em className='italic text-oxblood'>rewards</em>
        </h2>
        <Link
          href='/rewards'
          className='text-[13px] font-medium text-ink-soft inline-flex items-center gap-1.5 border-b border-current pb-px hover:text-oxblood hover:gap-2.5 transition-all focus-visible:outline-none focus-visible:text-oxblood'
        >
          How rewards work
          <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden>
            <path d='M5 12h14M13 5l7 7-7 7' />
          </svg>
        </Link>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 mb-4'>

        {/* Status card — dark */}
        <div className='relative overflow-hidden rounded bg-ink text-cream p-6 sm:p-8'>
          <div aria-hidden className='pointer-events-none absolute -top-30 -right-30 size-70 rounded-full' style={{ background: 'radial-gradient(circle, rgba(184,137,90,0.18) 0%, transparent 60%)' }} />
          <div aria-hidden className='pointer-events-none absolute -bottom-20 -left-20 size-55 rounded-full' style={{ background: 'radial-gradient(circle, rgba(107,31,31,0.3) 0%, transparent 60%)' }} />

          <div className='relative z-10'>
            <div className='flex flex-wrap items-start justify-between gap-3 mb-7'>
              <div className='inline-flex items-center gap-2 rounded-full border border-camel/30 bg-camel/15 px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase text-camel-soft'>
                <svg viewBox='0 0 24 24' fill='currentColor' className='h-2.75 w-2.75' aria-hidden>
                  <path d='M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z' />
                </svg>
                {tier.label} · Tier {tierLevel}
              </div>
            </div>

            <div className='mb-8'>
              <p className='mb-2.5 text-[11px] tracking-[0.22em] uppercase text-cream/55'>Your balance</p>
              <div className='flex flex-wrap items-baseline gap-3 mb-2'>
                <span className='font-display text-[56px] font-normal leading-none tracking-tight'>
                  {fmt(points)}
                  <em className='ml-1 font-normal italic text-camel text-2xl'>pts</em>
                </span>
              </div>
              <p className='text-[13px] text-cream/65'>
                That&apos;s{' '}
                <strong className='font-medium text-cream'>${dollarValue} off</strong>{' '}
                your next order.
              </p>
              <p className='mt-2 text-[12px] text-cream/45'>
                Lifetime earned: <strong className='text-cream/70 font-medium'>{fmt(lifetimePoints)}</strong>
                {expiredPoints > 0 && (
                  <> · Expired: <strong className='text-cream/70 font-medium'>{fmt(expiredPoints)}</strong></>
                )}
              </p>
            </div>

            <div className='border-t border-cream/12 pt-6'>
              {!atMax ? (
                <>
                  <div className='flex items-baseline justify-between mb-3'>
                    <span className='font-display text-base font-normal'>
                      {fmt(tier.pointsToNext)} points to{' '}
                      <em className='italic text-camel-soft'>{nextTierLabel}</em>
                    </span>
                    <span className='font-mono text-[11px] tracking-[0.04em] text-cream/55'>
                      {fmt(progressPoints)} / {fmt(target)}
                    </span>
                  </div>
                  <div
                    className='h-1.5 overflow-hidden rounded-full bg-cream/10'
                    role='progressbar'
                    aria-valuenow={progressPoints}
                    aria-valuemin={0}
                    aria-valuemax={target}
                    aria-label={`${fmt(progressPoints)} of ${fmt(target)} qualifying points to ${nextTierLabel}`}
                  >
                    <div className='h-full rounded-full bg-linear-to-r from-oxblood to-camel' style={{ width: `${progressPct}%` }} />
                  </div>
                  <p className='mt-3.5 text-[13px] leading-relaxed text-cream/70'>
                    Reach{' '}
                    <strong className='font-medium text-cream'>{nextTierLabel}</strong>{' '}
                    to unlock 15% off dry-aged orders, first dibs on Wagyu, and a quarterly butcher&apos;s box.
                  </p>
                </>
              ) : (
                <p className='text-[13px] leading-relaxed text-cream/70'>
                  You&apos;ve reached the top tier. All perks are unlocked — enjoy 15% off dry-aged orders, first dibs on Wagyu, and a quarterly butcher&apos;s box.
                </p>
              )}
              {periodEndLabel && (
                <p className='mt-3 font-mono text-[10px] tracking-[0.08em] uppercase text-cream/45'>
                  Qualifying period ends {periodEndLabel}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Perks card — light */}
        <div className='rounded border border-line-soft bg-paper p-6 sm:p-8'>
          <div className='mb-6'>
            <h3 className='font-display text-xl font-medium tracking-tight leading-tight mb-1'>
              Your <em className='font-normal italic text-oxblood'>perks</em>
            </h3>
            <p className='text-[13px] text-muted'>
              {pointsExpiryMonths > 0
                ? `Unlocked. Points expire after ${pointsExpiryMonths} months.`
                : 'Unlocked. Your points never expire.'}
            </p>
          </div>

          <ul className='flex flex-col'>
            {UNLOCKED_PERKS.map((perk) => (
              <li key={perk.bold} className='flex items-start gap-3 border-b border-line-soft py-3 text-sm leading-snug text-ink-soft'>
                <span className='mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green text-cream'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={3} strokeLinecap='round' strokeLinejoin='round' className='h-2.75 w-2.75' aria-hidden>
                    <polyline points='20 6 9 17 4 12' />
                  </svg>
                </span>
                <span>
                  <strong className='font-medium text-ink'>{perk.bold}</strong>{' '}{perk.body}
                </span>
              </li>
            ))}
            {LOCKED_PERKS.map((perk) => (
              <li key={perk} className='flex items-start gap-3 py-3 text-sm leading-snug text-ink-soft/50 last:pb-0'>
                <span className='mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cream-deep text-muted'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round' className='h-2.5 w-2.5' aria-hidden>
                    <rect x='3' y='11' width='18' height='11' rx='2' />
                    <path d='M7 11V7a5 5 0 0110 0v4' />
                  </svg>
                </span>
                <span className='flex flex-wrap items-center gap-2'>
                  <strong className='font-medium'>{perk}</strong>
                  <span className='rounded bg-cream-deep px-1.5 py-0.5 font-mono text-[10px] tracking-[0.04em] text-muted'>MASTER CUT</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Activity */}
      <div className='overflow-hidden rounded border border-line-soft bg-paper'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4 sm:px-8 sm:py-5'>
          <h3 className='font-display text-lg font-medium tracking-tight'>
            Points <em className='font-normal italic text-oxblood'>activity</em>
          </h3>
          <div className='inline-flex rounded-full bg-cream-deep p-0.5'>
            {FILTERS.map((f) => (
              <button
                key={f}
                type='button'
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors duration-200 motion-reduce:transition-none ${FOCUS_RING} ${
                  filter === f ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className='px-5 py-1 sm:px-8 sm:py-2'>
          {recentHistory.length === 0 ? (
            <p className='py-10 text-center text-sm text-muted'>Nothing yet — your first completed order starts your history.</p>
          ) : visible.length === 0 ? (
            <p className='py-10 text-center text-sm text-muted'>No {filter} activity to show.</p>
          ) : (
            visible.map((row, i) => {
              const { title, kind } = reasonLabel(row.reason);
              const meta = row.orderId ? `Order ${row.orderId.slice(-6).toUpperCase()}` : 'Adjustment';
              return (
                <div
                  key={`${row.createdAt}-${i}`}
                  className={`grid grid-cols-[36px_1fr_auto] items-center gap-4 py-3.5 sm:grid-cols-[36px_1fr_auto_80px] ${i < visible.length - 1 ? 'border-b border-line-soft' : ''}`}
                >
                  <div className={`grid h-9 w-9 place-items-center rounded-full ${kind === 'earned' ? 'bg-green/10 text-green' : kind === 'redeemed' ? 'bg-oxblood/10 text-oxblood' : 'bg-camel/15 text-camel'}`}>
                    {kind === 'earned' && (
                      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} className='h-3.5 w-3.5' aria-hidden>
                        <circle cx='12' cy='12' r='9' /><line x1='12' y1='7' x2='12' y2='13' /><line x1='9' y1='10' x2='15' y2='10' />
                      </svg>
                    )}
                    {kind === 'redeemed' && (
                      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} className='h-3.5 w-3.5' aria-hidden>
                        <polyline points='20 12 12 12 12 4' /><circle cx='12' cy='12' r='9' />
                      </svg>
                    )}
                    {kind === 'bonus' && (
                      <svg viewBox='0 0 24 24' fill='currentColor' className='h-3.5 w-3.5' aria-hidden>
                        <path d='M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z' />
                      </svg>
                    )}
                  </div>
                  <div className='min-w-0'>
                    <p className='truncate font-display text-[15px] font-medium tracking-tight leading-tight'>{title}</p>
                    <p className='mt-0.5 font-mono text-[11px] tracking-[0.04em] text-muted'>{meta}</p>
                  </div>
                  <div className={`font-display text-lg font-medium tracking-tight ${row.delta > 0 ? 'text-green' : 'text-oxblood'}`}>
                    {row.delta > 0 ? '+' : ''}{row.delta}
                    <em className='ml-0.5 font-mono not-italic text-[11px] font-normal text-muted'>pts</em>
                  </div>
                  <div className='hidden text-right font-mono text-[11px] tracking-[0.04em] text-muted sm:block'>{formatDate(row.createdAt)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
