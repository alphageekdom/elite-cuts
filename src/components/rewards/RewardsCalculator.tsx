'use client';

import { useState } from 'react';

import SectionHead from '@/components/ui/SectionHead';
import Reveal from '@/components/uielements/Reveal';
import { FOCUS_RING } from '@/lib/styles';
import { projectRewards, formatRedemptionRate } from '@/lib/rewards/calculator';
import type { RewardsPublicSettings } from '@/lib/rewards/calculator';

type Props = { settings: RewardsPublicSettings };

const fmt = (n: number) => n.toLocaleString('en-US');

// "a, b, and c" from a list; "a and b" for two. Keeps the disclaimer grammatical
// as exclusions come and go (points expiry only applies when it's turned on).
function listSentence(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export default function RewardsCalculator({ settings }: Props) {
  const [spend, setSpend] = useState(120);
  const projection = projectRewards(spend, settings);
  const { reach } = projection;

  const ppd =
    settings.pointsPerDollar === 1
      ? '1 point'
      : `${settings.pointsPerDollar} points`;

  const monthsLabel =
    reach.kind === 'reached'
      ? reach.months === 1
        ? '1 month'
        : `${reach.months} months`
      : '';

  const excludes = listSentence([
    'the weekend bonus',
    'the per-order redemption cap',
    ...(settings.pointsExpiryMonths > 0 ? ['points expiry'] : []),
  ]);

  return (
    <section className='bg-cream-deep py-20 md:py-28'>
      <div className='mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:px-8 lg:grid-cols-2 lg:gap-16'>
        {/* Left — the slider */}
        <Reveal>
          <SectionHead label='Do the math' />
          <h2 className='font-display mb-5 max-w-[14ch] text-[clamp(32px,4.4vw,48px)] leading-[1.05] font-normal tracking-tight'>
            See what a month{' '}
            <em className='text-oxblood italic'>gives back.</em>
          </h2>
          <p className='text-ink-soft mb-8 max-w-[44ch] text-[16px] leading-relaxed'>
            Every dollar is {ppd}, and {formatRedemptionRate(settings)}. Slide
            to your usual monthly spend.
          </p>

          <div className='mb-2 flex items-baseline gap-2'>
            <label htmlFor='spend' className='text-ink-soft text-[13px]'>
              Monthly spend
            </label>
            <span className='font-display ml-auto text-[32px] font-medium'>
              ${fmt(spend)}
            </span>
          </div>
          <input
            id='spend'
            type='range'
            min={20}
            max={500}
            step={5}
            value={spend}
            onChange={(e) => setSpend(Number(e.target.value))}
            aria-valuetext={`$${fmt(spend)} per month — about ${fmt(
              projection.monthlyPoints,
            )} points`}
            className={`accent-oxblood w-full ${FOCUS_RING}`}
          />
        </Reveal>

        {/* Right — the payoff card */}
        <Reveal delayMs={120}>
          <div className='border-line-soft bg-paper rounded-2xl border p-8 shadow-[0_24px_50px_rgba(28,24,20,0.08)] md:p-10'>
            <div className='grid grid-cols-2 gap-x-5 gap-y-7'>
              <div>
                <div className='font-display text-[44px] leading-none font-medium'>
                  {fmt(projection.monthlyPoints)}
                </div>
                <div className='text-muted mt-2 text-[12px] tracking-widest uppercase'>
                  Points / month
                </div>
              </div>
              <div>
                <div className='font-display text-oxblood text-[44px] leading-none font-medium'>
                  ${fmt(projection.yearlyDollarsBack)}
                </div>
                <div className='text-muted mt-2 text-[12px] tracking-widest uppercase'>
                  Back per year
                </div>
              </div>
            </div>

            <div className='bg-line-soft my-8 h-px' />

            <p className='text-ink-soft text-[14.5px] leading-relaxed'>
              {reach.kind === 'reached' && (
                <>
                  At this pace you&rsquo;d reach{' '}
                  <span className='text-ink font-semibold'>
                    {reach.tierLabel}
                  </span>{' '}
                  in about{' '}
                  <span className='text-ink font-semibold'>{monthsLabel}</span>.
                </>
              )}
              {reach.kind === 'slow' && (
                <>
                  At this pace you&rsquo;d reach{' '}
                  <span className='text-ink font-semibold'>
                    {reach.tierLabel}
                  </span>{' '}
                  in a little over a year.
                </>
              )}
              {reach.kind === 'stuck' && (
                <>
                  At this pace you&rsquo;d stay{' '}
                  <span className='text-ink font-semibold'>
                    {reach.stayLabel}
                  </span>
                  . A bit more each month brings{' '}
                  <span className='text-ink font-semibold'>
                    {reach.tierLabel}
                  </span>{' '}
                  into reach.
                </>
              )}
              {reach.kind === 'none' && (
                <>Slide up to a monthly spend to see where the points take you.</>
              )}
            </p>
            <p className='text-muted mt-3 text-[12px] leading-relaxed'>
              Estimate — excludes {excludes}.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
