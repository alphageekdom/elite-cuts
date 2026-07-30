'use client';

import { useState } from 'react';
import Link from 'next/link';

import CheckIcon from '@/components/ui/icons/CheckIcon';
import ArrowIcon from '@/components/ui/icons/ArrowIcon';
import Reveal from '@/components/ui/Reveal';
import { FOCUS_RING_DARK } from '@/lib/styles';
import { getTier } from '@/lib/rewards/calculator';
import type { RewardsPublicSettings } from '@/lib/rewards/calculator';

// Real standing for a signed-in member, or null for a guest. Computed on the
// server from the tested rewards helpers so this component stays presentational.
// `qualifying` is the tier-determining number (points earned in the current
// window, or lifetime points when the window is off) — NOT the spendable
// balance, since redeeming points never moves a customer's tier.
export type MemberStanding = {
  balance: number;
  qualifying: number;
  tierLabel: string;
  pointsToNext: number;
  nextTierLabel: string | null;
};

type Props = {
  settings: RewardsPublicSettings;
  member: MemberStanding | null;
};

const fmt = (n: number) => n.toLocaleString('en-US');

export default function RewardsStanding({ settings, member }: Props) {
  const conn = Math.max(0, Math.floor(settings.connoisseurThreshold));
  const master = Math.max(conn + 1, Math.floor(settings.masterCutThreshold));

  const tierMarks = [
    { at: 0, label: getTier(0, settings).label },
    { at: conn, label: getTier(conn, settings).label },
    { at: master, label: getTier(master, settings).label },
  ];

  // Preview slider — starts at the member's real earned points when signed in
  // (clamped into range), or a mid-journey sample for guests so the mechanic is
  // visible at a glance. The slider is always hypothetical; the real standing
  // lives in the left column. Seeding from earned points (not balance) keeps
  // the previewed tier consistent with the tier shown on the left.
  const sliderMax = Math.round(master * 1.2);
  const [preview, setPreview] = useState(
    member ? Math.min(member.qualifying, sliderMax) : conn,
  );

  const previewTier = getTier(preview, settings);
  const previewNextAt = previewTier.nextThreshold; // null at top tier
  const previewPct = Math.round(previewTier.progress * 100);
  const previewNextLabel =
    previewNextAt === null ? null : getTier(previewNextAt, settings).label;
  const sliderValueText =
    previewNextAt === null
      ? `${fmt(preview)} points — ${previewTier.label}, our top tier`
      : `${fmt(preview)} points — ${previewTier.label}, ${fmt(
          previewNextAt - preview,
        )} points to ${previewNextLabel}`;

  return (
    <section className='bg-ink text-cream py-20 md:py-28'>
      <div className='mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:px-8 lg:grid-cols-[1fr_1.15fr] lg:gap-16'>
        {/* Left — real standing (signed in) or an invite (guest) */}
        <Reveal>
          <div className='text-camel mb-6 inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase'>
            <span aria-hidden className='bg-camel/60 h-px w-7' />
            Your standing
          </div>

          {member ? (
            <>
              <h2 className='font-display mb-5 max-w-[16ch] text-[clamp(32px,4.4vw,48px)] leading-[1.05] font-normal tracking-tight'>
                {member.nextTierLabel ? (
                  <>
                    You&rsquo;re{' '}
                    <em className='text-camel-soft italic'>
                      {fmt(member.pointsToNext)} point
                      {member.pointsToNext === 1 ? '' : 's'}
                    </em>{' '}
                    from {member.nextTierLabel}.
                  </>
                ) : (
                  <>
                    You&rsquo;ve reached{' '}
                    <em className='text-camel-soft italic'>
                      {member.tierLabel}
                    </em>{' '}
                    — our top tier.
                  </>
                )}
              </h2>
              <p className='text-cream/70 mb-8 max-w-[42ch] text-[15px] leading-relaxed'>
                Keep ordering the cuts you already love. Every dollar nudges the
                bar — no codes, no hoops.
              </p>
              <div className='flex gap-10'>
                <div>
                  <div className='font-display text-[40px] leading-none font-normal'>
                    {fmt(member.balance)}
                  </div>
                  <div className='text-cream/60 mt-2 text-[11px] tracking-[0.15em] uppercase'>
                    Points balance
                  </div>
                </div>
                <div>
                  <div className='font-display text-camel-soft text-[40px] leading-none font-normal'>
                    {member.tierLabel}
                  </div>
                  <div className='text-cream/60 mt-2 text-[11px] tracking-[0.15em] uppercase'>
                    Current tier
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className='font-display mb-5 max-w-[16ch] text-[clamp(32px,4.4vw,48px)] leading-[1.05] font-normal tracking-tight'>
                See how far each{' '}
                <em className='text-camel-soft italic'>tier</em> is.
              </h2>
              <p className='text-cream/70 mb-8 max-w-[42ch] text-[15px] leading-relaxed'>
                Drag the slider to preview the journey, then sign in to start
                earning toward it. Your real balance and tier show up here once
                you&rsquo;re a member.
              </p>
              <Link
                href='/register'
                className={`bg-cream text-ink hover:bg-camel-soft inline-flex items-center gap-2.5 rounded-full px-7 py-4 text-sm font-medium tracking-[0.02em] transition-[background-color,transform] duration-300 hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${FOCUS_RING_DARK}`}
              >
                Join — it&rsquo;s free
                <ArrowIcon className='h-3.5 w-3.5' />
              </Link>
            </>
          )}
        </Reveal>

        {/* Right — the interactive preview track (always hypothetical) */}
        <Reveal delayMs={120}>
          <div className='border-cream/12 bg-cream/5 rounded-2xl border p-8 md:p-9'>
            <div className='mb-4 flex items-center justify-between gap-4'>
              <span className='text-cream/70 text-[12px] tracking-[0.15em] uppercase'>
                Preview the journey
              </span>
              <span className='text-cream/80 text-[13px]'>
                {previewNextAt === null
                  ? 'Top tier reached'
                  : `${fmt(preview)} / ${fmt(previewNextAt)} pts`}
              </span>
            </div>

            <div
              aria-hidden
              className='bg-cream/12 relative mb-7 h-3 overflow-hidden rounded-full'
            >
              <div
                className='from-camel to-camel-soft h-full rounded-full bg-linear-to-r transition-[width] duration-200 motion-reduce:transition-none'
                style={{ width: `${previewPct}%` }}
              />
            </div>

            <div className='flex items-start justify-between'>
              {tierMarks.map((t, i) => {
                const reached = preview >= t.at;
                return (
                  <div
                    key={i}
                    className='flex w-1/3 flex-col items-center gap-2 text-center'
                  >
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold ${
                        reached
                          ? 'bg-camel-soft text-ink'
                          : 'border-cream/20 bg-cream/6 text-cream/70 border'
                      }`}
                    >
                      {reached ? (
                        <CheckIcon className='h-4 w-4' strokeWidth={3} />
                      ) : (
                        i + 1
                      )}
                      <span className='sr-only'>
                        {reached ? ' reached' : ' not reached'}
                      </span>
                    </span>
                    <span
                      className={`text-[13px] font-medium ${reached ? 'text-cream' : 'text-cream/60'}`}
                    >
                      {t.label}
                    </span>
                    <span className='text-cream/60 text-[11px]'>
                      {t.at === 0 ? '0 pts' : `${fmt(t.at)} pts`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className='border-cream/12 mt-7 border-t pt-5'>
              <label
                htmlFor='standing-preview'
                className='text-cream/70 block text-[13px] leading-relaxed'
              >
                {member
                  ? `Starts at what you've earned this period (${fmt(member.qualifying)}). Drag to see where any points total lands.`
                  : 'Drag to see where any points total lands.'}
              </label>
              <input
                id='standing-preview'
                type='range'
                min={0}
                max={sliderMax}
                step={10}
                value={preview}
                onChange={(e) => setPreview(Number(e.target.value))}
                aria-valuetext={sliderValueText}
                className={`accent-camel mt-3.5 w-full ${FOCUS_RING_DARK}`}
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
