'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FOCUS_RING } from '@/lib/styles';

const POINTS = 680;
const NEXT_TIER = 1000;
const PROGRESS = Math.round((POINTS / NEXT_TIER) * 100);
const DOLLAR_VALUE = Math.floor((POINTS / 100) * 5);

const UNLOCKED_PERKS: { bold: string; body: string }[] = [
  { bold: 'Free pickup, always.', body: 'No minimum order required.' },
  { bold: '2× points', body: 'on weekend orders.' },
  { bold: 'Early access', body: 'to weekly specials.' },
  { bold: 'Free birthday cut', body: 'up to $50.' },
];

const LOCKED_PERKS = ['15% off dry-aged cuts', "Quarterly butcher's box"];

type ActivityType = 'earned' | 'redeemed' | 'bonus';
type Filter = 'all' | 'earned' | 'redeemed';

const ACTIVITY: { type: ActivityType; title: string; meta: string; points: number; date: string }[] = [
  { type: 'earned',   title: 'Order #EC-7842 · Dry-Aged Ribeye', meta: '2lb · $85.98 · WEEKEND BONUS 2×',    points: 172,  date: 'Apr 24' },
  { type: 'redeemed', title: 'Redeemed at checkout',              meta: '100 PTS = $5 OFF · ORDER #EC-7715',  points: -100, date: 'Apr 12' },
  { type: 'bonus',    title: 'Tier upgrade bonus · Connoisseur',  meta: 'TIER UPGRADED TO CONNOISSEUR',        points: 50,   date: 'Apr 08' },
  { type: 'earned',   title: 'Order #EC-7689 · Whole Brisket',    meta: '12lb · $215.40 · STANDARD 1×',      points: 215,  date: 'Mar 28' },
];

const FILTERS: Filter[] = ['all', 'earned', 'redeemed'];

export default function ProfileRewards() {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = ACTIVITY.filter((row) => {
    if (filter === 'all') return true;
    if (filter === 'earned') return row.type === 'earned' || row.type === 'bonus';
    return row.type === 'redeemed';
  });

  return (
    <div>
      {/* Section header */}
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

      {/* Status + Perks grid */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 mb-4'>

        {/* Status card — dark */}
        <div className='relative overflow-hidden rounded bg-ink text-cream p-8'>
          <div
            aria-hidden
            className='pointer-events-none absolute -top-30 -right-30 size-70 rounded-full'
            style={{ background: 'radial-gradient(circle, rgba(184,137,90,0.18) 0%, transparent 60%)' }}
          />
          <div
            aria-hidden
            className='pointer-events-none absolute -bottom-20 -left-20 size-55 rounded-full'
            style={{ background: 'radial-gradient(circle, rgba(107,31,31,0.3) 0%, transparent 60%)' }}
          />

          <div className='relative z-10'>
            {/* Tier badge + member since */}
            <div className='flex flex-wrap items-start justify-between gap-3 mb-7'>
              <div className='inline-flex items-center gap-2 rounded-full border border-camel/30 bg-camel/15 px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase text-camel-soft'>
                <svg viewBox='0 0 24 24' fill='currentColor' className='h-2.75 w-2.75' aria-hidden>
                  <path d='M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z' />
                </svg>
                Connoisseur · Tier 02
              </div>
              <span className='font-mono text-[11px] tracking-[0.04em] text-cream/55'>SINCE MAR 2024</span>
            </div>

            {/* Points */}
            <div className='mb-8'>
              <p className='mb-2.5 text-[11px] tracking-[0.22em] uppercase text-cream/55'>Your balance</p>
              <div className='flex flex-wrap items-baseline gap-3 mb-2'>
                <span className='font-display text-[56px] font-normal leading-none tracking-tight'>
                  {POINTS}
                  <em className='ml-1 font-normal italic text-camel text-2xl'>pts</em>
                </span>
                <span className='inline-flex items-center gap-1 rounded-full bg-green/20 px-2.5 py-1 text-[11px] font-medium tracking-[0.04em] text-[#B8DBA8]'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={3} className='h-2.5 w-2.5' aria-hidden>
                    <polyline points='18 15 12 9 6 15' />
                  </svg>
                  +42 this month
                </span>
              </div>
              <p className='text-[13px] text-cream/65'>
                That&apos;s{' '}
                <strong className='font-medium text-cream'>${DOLLAR_VALUE} off</strong>{' '}
                your next order.
              </p>
            </div>

            {/* Progress to next tier */}
            <div className='border-t border-cream/12 pt-6'>
              <div className='flex items-baseline justify-between mb-3'>
                <span className='font-display text-base font-normal'>
                  {NEXT_TIER - POINTS} points to{' '}
                  <em className='italic text-camel-soft'>Master Cut</em>
                </span>
                <span className='font-mono text-[11px] tracking-[0.04em] text-cream/55'>
                  {POINTS} / {NEXT_TIER}
                </span>
              </div>
              <div
                className='h-1.5 overflow-hidden rounded-full bg-cream/10'
                role='progressbar'
                aria-valuenow={POINTS}
                aria-valuemin={0}
                aria-valuemax={NEXT_TIER}
                aria-label={`${POINTS} of ${NEXT_TIER} points to Master Cut tier`}
              >
                <div
                  className='h-full rounded-full bg-linear-to-r from-oxblood to-camel'
                  style={{ width: `${PROGRESS}%` }}
                />
              </div>
              <p className='mt-3.5 text-[13px] leading-relaxed text-cream/70'>
                Reach{' '}
                <strong className='font-medium text-cream'>Master Cut</strong>{' '}
                to unlock 15% off dry-aged orders, first dibs on Wagyu, and a quarterly butcher&apos;s box.
              </p>
            </div>
          </div>
        </div>

        {/* Perks card — light */}
        <div className='rounded border border-line-soft bg-paper p-8'>
          <div className='mb-6'>
            <h3 className='font-display text-xl font-medium tracking-tight leading-tight mb-1'>
              Your <em className='font-normal italic text-oxblood'>perks</em>
            </h3>
            <p className='text-[13px] text-muted'>
              Unlocked. More on the way.
            </p>
          </div>

          <ul className='flex flex-col'>
            {UNLOCKED_PERKS.map((perk) => (
              <li
                key={perk.bold}
                className='flex items-start gap-3 border-b border-line-soft py-3 text-sm leading-snug text-ink-soft'
              >
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
              <li
                key={perk}
                className='flex items-start gap-3 py-3 text-sm leading-snug text-ink-soft/50 last:pb-0'
              >
                <span className='mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cream-deep text-muted'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' strokeLinejoin='round' className='h-2.5 w-2.5' aria-hidden>
                    <rect x='3' y='11' width='18' height='11' rx='2' />
                    <path d='M7 11V7a5 5 0 0110 0v4' />
                  </svg>
                </span>
                <span className='flex flex-wrap items-center gap-2'>
                  <strong className='font-medium'>{perk}</strong>
                  <span className='rounded bg-cream-deep px-1.5 py-0.5 font-mono text-[10px] tracking-[0.04em] text-muted'>
                    MASTER CUT
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Activity card — full width */}
      <div className='overflow-hidden rounded border border-line-soft bg-paper'>
        {/* Header */}
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-8 py-5'>
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

        {/* Rows */}
        <div className='px-8 py-2'>
          {visible.length === 0 ? (
            <p className='py-10 text-center text-sm text-muted'>Nothing yet — your first order starts your history.</p>
          ) : (
            visible.map((row, i) => (
              <div
                key={`${row.title}-${i}`}
                className={`grid grid-cols-[36px_1fr_auto] items-center gap-4 py-3.5 sm:grid-cols-[36px_1fr_auto_80px] ${
                  i < visible.length - 1 ? 'border-b border-line-soft' : ''
                }`}
              >
                {/* Type icon */}
                <div
                  className={`grid h-9 w-9 place-items-center rounded-full ${
                    row.type === 'earned'
                      ? 'bg-green/10 text-green'
                      : row.type === 'redeemed'
                      ? 'bg-oxblood/10 text-oxblood'
                      : 'bg-camel/15 text-camel'
                  }`}
                >
                  {row.type === 'earned' && (
                    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} className='h-3.5 w-3.5' aria-hidden>
                      <circle cx='12' cy='12' r='9' />
                      <line x1='12' y1='7' x2='12' y2='13' />
                      <line x1='9' y1='10' x2='15' y2='10' />
                    </svg>
                  )}
                  {row.type === 'redeemed' && (
                    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} className='h-3.5 w-3.5' aria-hidden>
                      <polyline points='20 12 12 12 12 4' />
                      <circle cx='12' cy='12' r='9' />
                    </svg>
                  )}
                  {row.type === 'bonus' && (
                    <svg viewBox='0 0 24 24' fill='currentColor' className='h-3.5 w-3.5' aria-hidden>
                      <path d='M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z' />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className='min-w-0'>
                  <p className='truncate font-display text-[15px] font-medium tracking-tight leading-tight'>
                    {row.title}
                  </p>
                  <p className='mt-0.5 font-mono text-[11px] tracking-[0.04em] text-muted'>
                    {row.meta}
                  </p>
                </div>

                {/* Points */}
                <div
                  className={`font-display text-lg font-medium tracking-tight ${
                    row.points > 0 ? 'text-green' : 'text-oxblood'
                  }`}
                >
                  {row.points > 0 ? '+' : ''}
                  {row.points}
                  <em className='ml-0.5 font-mono not-italic text-[11px] font-normal text-muted'>pts</em>
                </div>

                {/* Date */}
                <div className='hidden text-right font-mono text-[11px] tracking-[0.04em] text-muted sm:block'>
                  {row.date}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
