import type { Metadata } from 'next';
import Link from 'next/link';

import ArrowIcon from '@/components/uielements/ArrowIcon';
import Reveal from '@/components/uielements/Reveal';
import RewardsFaq from '@/components/rewards/RewardsFaq';

export const metadata: Metadata = {
  title: 'Rewards — EliteCuts',
  description:
    'Earn points on every order, unlock perks, and climb the tiers. Free to join, no subscription.',
};

const STATS = [
  { num: '1', suffix: 'pt', label: 'For every $1 spent in the shop' },
  { num: '3', suffix: '×', label: 'Points on weekend orders' },
  { num: '$0', suffix: '', label: 'No fees, no subscription, ever' },
  { num: '12', suffix: 'mo', label: 'Points stay valid from your last order' },
] as const;

const HOW_STEPS = [
  {
    n: '01',
    heading: (
      <>
        Order like you{' '}
        <em className='italic text-oxblood'>normally</em> would.
      </>
    ),
    body: 'Pick up your usual cuts in-store or online. Every dollar earns one point automatically — no codes, no fuss.',
    meta: '$1 = 1 PT',
  },
  {
    n: '02',
    heading: (
      <>
        Climb the <em className='italic text-oxblood'>tiers.</em>
      </>
    ),
    body: 'Connoisseur at 250 points, Master Cut at 1,000. Each tier unlocks better perks — discounts, early access, and a birthday cut on us.',
    meta: '3 TIERS · 1,000 PT TOP',
  },
  {
    n: '03',
    heading: (
      <>
        Redeem at <em className='italic text-oxblood'>checkout.</em>
      </>
    ),
    body: 'Apply points to your next order, save them for a special cut, or just enjoy the perks that come with your tier. Your call.',
    meta: '100 PT = $5 OFF',
  },
] as const;

const CheckIcon = ({ camel = false }: { camel?: boolean }) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2.5}
    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${camel ? 'text-camel-soft' : 'text-green'}`}
    aria-hidden
  >
    <polyline points='20 6 9 17 4 12' />
  </svg>
);

const SectionHead = ({ label }: { label: string }) => (
  <div className='flex items-baseline gap-6 mb-14'>
    <span className='text-[11px] font-medium tracking-[0.22em] uppercase text-muted'>
      {label}
    </span>
    <span aria-hidden className='flex-1 h-px bg-line' />
  </div>
);

export default function RewardsPage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className='mx-auto max-w-7xl px-6 py-20 md:px-8'>
        <div className='grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20'>

          {/* Left: copy */}
          <div>
            <Reveal>
              <div className='mb-7 inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase text-muted'>
                <span aria-hidden className='h-px w-7 bg-current opacity-50' />
                EliteCuts Rewards
              </div>
            </Reveal>

            <Reveal delayMs={80}>
              <h1 className='mb-7 max-w-[14ch] font-display text-[clamp(48px,8vw,120px)] font-normal leading-[0.9] tracking-tight'>
                Earn while you{' '}
                <em className='italic text-oxblood'>cook.</em>
              </h1>
            </Reveal>

            <Reveal delayMs={140}>
              <p className='mb-9 max-w-[44ch] text-[17px] leading-relaxed text-ink-soft'>
                Every cut you order earns points. Hit a tier, unlock perks. No
                subscription, no fine print — just our way of saying thanks for
                choosing us over the supermarket.
              </p>
            </Reveal>

            <Reveal delayMs={200}>
              <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap'>
                <Link
                  href='/register'
                  className='inline-flex items-center gap-2.5 rounded-full bg-ink px-7 py-4 text-sm font-medium tracking-[0.02em] text-cream transition-[background-color,transform] duration-300 hover:bg-oxblood hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0'
                >
                  Join — it&#39;s free
                  <ArrowIcon />
                </Link>
                <a
                  href='#how'
                  className='inline-flex items-center gap-2.5 rounded-full border border-line bg-transparent px-7 py-4 text-sm font-medium tracking-[0.02em] text-ink-soft transition-[border-color,background-color,color] duration-300 hover:border-ink hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2 motion-reduce:transition-none'
                >
                  See how it works
                </a>
              </div>
            </Reveal>
          </div>

          {/* Right: tier card visual */}
          <Reveal delayMs={160}>
            <div
              className='relative overflow-hidden rounded-md bg-ink p-9 text-cream shadow-[0_30px_80px_rgba(28,24,20,0.18)] md:aspect-[1/1.15]'
            >
              <div
                aria-hidden
                className='pointer-events-none absolute -top-37.5 -right-37.5 size-100 rounded-full'
                style={{
                  background:
                    'radial-gradient(circle, rgba(184,137,90,0.25) 0%, transparent 60%)',
                }}
              />
              <div
                aria-hidden
                className='pointer-events-none absolute -bottom-25 -left-25 size-75 rounded-full'
                style={{
                  background:
                    'radial-gradient(circle, rgba(107,31,31,0.4) 0%, transparent 60%)',
                }}
              />

              <div className='relative z-10 flex h-full flex-col justify-between'>
                {/* Top row */}
                <div className='flex items-start justify-between'>
                  <div>
                    <div className='mb-2.5 text-[10px] tracking-[0.22em] uppercase text-camel'>
                      Member Card
                    </div>
                    <div className='font-display text-[28px] font-semibold tracking-tight'>
                      Elite
                      <em className='font-normal italic text-camel'>Cuts</em>
                    </div>
                  </div>
                  <div className='grid h-14 w-14 place-items-center rounded-full border border-cream/30 text-camel'>
                    <svg
                      viewBox='0 0 24 24'
                      fill='currentColor'
                      className='h-6 w-6'
                      aria-hidden
                    >
                      <path d='M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z' />
                    </svg>
                  </div>
                </div>

                {/* Mid */}
                <div className='my-8'>
                  <div className='mb-2.5 text-[10px] tracking-[0.22em] uppercase text-cream/55'>
                    Connoisseur · Tier 02
                  </div>
                  <div className='mb-4 font-display text-[clamp(36px,4vw,52px)] font-normal leading-none tracking-tight'>
                    Earn{' '}
                    <em className='italic text-camel-soft'>3×</em> on weekends
                  </div>
                  <ul className='flex flex-col gap-1.5'>
                    {[
                      'Free pickup, always',
                      'Early access to dry-aged cuts',
                      'Birthday cut on us',
                    ].map((perk) => (
                      <li
                        key={perk}
                        className='flex items-center gap-2 text-xs text-cream/85'
                      >
                        <svg
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth={2.5}
                          className='h-2.75 w-2.75 shrink-0 text-camel-soft'
                          aria-hidden
                        >
                          <polyline points='20 6 9 17 4 12' />
                        </svg>
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer */}
                <div className='flex items-end justify-between border-t border-cream/12 pt-5 font-mono text-[10px] tracking-[0.06em] uppercase text-cream/55'>
                  <span>EC · 2026</span>
                  <span>· Member ·</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ── STAT STRIP ── */}
        <div className='mt-10 border-t border-line-soft'>
          <div className='grid grid-cols-2 lg:grid-cols-4'>
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={[
                  'py-6 px-6 lg:px-8',
                  i === 0 ? 'lg:pl-0' : '',
                  i === 3 ? 'lg:pr-0' : '',
                  i === 1 ? 'border-l border-line-soft' : '',
                  i === 2 ? 'border-t border-line-soft lg:border-t-0 lg:border-l lg:border-line-soft' : '',
                  i === 3 ? 'border-t border-line-soft border-l lg:border-t-0' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className='mb-2 font-display text-[clamp(32px,4vw,48px)] font-normal leading-none tracking-tight'>
                  {stat.num}
                  {stat.suffix && (
                    <em className='ml-0.5 text-[0.6em] font-normal italic text-oxblood'>
                      {stat.suffix}
                    </em>
                  )}
                </div>
                <div className='max-w-[22ch] text-xs leading-snug text-muted'>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section id='how' className='bg-cream-deep py-20'>
        <div className='mx-auto max-w-7xl px-6 md:px-8'>
          <Reveal>
            <SectionHead label='How it works' />
          </Reveal>

          <Reveal delayMs={60}>
            <h2 className='mb-14 max-w-[18ch] font-display text-[clamp(40px,5vw,64px)] font-normal leading-[1.05] tracking-tight'>
              Three steps.{' '}
              <em className='italic text-oxblood'>That&apos;s it.</em>
            </h2>
          </Reveal>

          <div className='grid grid-cols-1 gap-12 md:grid-cols-3'>
            {HOW_STEPS.map((step, i) => (
              <Reveal key={step.n} delayMs={i * 80}>
                <div className='relative pt-16 md:pt-12'>
                  <div
                    aria-hidden
                    className='absolute top-0 left-0 font-display text-[64px] md:text-[80px] font-normal italic leading-none tracking-tight text-camel opacity-50'
                  >
                    {step.n}
                  </div>
                  <h3 className='relative mb-4 font-display text-[28px] font-medium leading-[1.1] tracking-tight'>
                    {step.heading}
                  </h3>
                  <p className='max-w-[36ch] text-[15px] leading-[1.65] text-ink-soft'>
                    {step.body}
                  </p>
                  <span className='mt-5 inline-block rounded-full border border-line-soft bg-paper px-3 py-1.5 font-mono text-[11px] tracking-[0.04em] text-ink'>
                    {step.meta}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIERS ────────────────────────────────────────── */}
      <section className='py-25'>
        <div className='mx-auto max-w-7xl px-6 md:px-8'>
          <Reveal>
            <SectionHead label='The Tiers' />
          </Reveal>

          <Reveal delayMs={60}>
            <h2 className='mb-14 max-w-[18ch] font-display text-[clamp(40px,5vw,64px)] font-normal leading-[1.05] tracking-tight'>
              Three levels of{' '}
              <em className='italic text-oxblood'>thank you.</em>
            </h2>
          </Reveal>

          <div className='grid grid-cols-1 items-start gap-4 md:grid-cols-3'>
            {/* Regular */}
            <Reveal>
              <article className='rounded-sm border border-line-soft bg-paper p-9 transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none'>
                <div className='mb-7 grid h-12 w-12 place-items-center rounded-full bg-cream-deep text-ink'>
                  <svg
                    viewBox='0 0 24 24'
                    fill='currentColor'
                    className='h-4.5 w-4.5'
                    aria-hidden
                  >
                    <circle cx='12' cy='12' r='6' />
                  </svg>
                </div>
                <h3 className='mb-2 font-display text-[30px] font-medium leading-[1.1] tracking-tight'>
                  Regular
                </h3>
                <p className='mb-7 font-mono text-xs tracking-[0.06em] text-muted'>
                  0–249 PTS · STARTING TIER
                </p>
                <ul className='flex flex-col gap-3.5 border-t border-line-soft pt-6'>
                  {[
                    'Earn 1 point per $1 spent',
                    'Save your favorite cuts',
                    'Order history & quick reorder',
                    'Free pickup on orders over $50',
                  ].map((perk) => (
                    <li
                      key={perk}
                      className='flex items-start gap-2.5 text-sm leading-snug text-ink-soft'
                    >
                      <CheckIcon />
                      {perk}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>

            {/* Connoisseur — featured */}
            <Reveal delayMs={80}>
              <article className='relative md:-translate-y-3 rounded-sm border border-ink bg-ink p-9 text-cream shadow-[0_30px_80px_rgba(28,24,20,0.2)] transition-transform duration-300 hover:-translate-y-1 md:hover:-translate-y-4 motion-reduce:transition-none motion-reduce:md:hover:-translate-y-3'>
                <span className='absolute top-6 right-6 rounded-full bg-camel px-3 py-1 text-[10px] font-medium tracking-[0.18em] uppercase text-ink'>
                  Most popular
                </span>
                <div className='mb-7 grid h-12 w-12 place-items-center rounded-full bg-camel/20 text-camel'>
                  <svg
                    viewBox='0 0 24 24'
                    fill='currentColor'
                    className='h-4.5 w-4.5'
                    aria-hidden
                  >
                    <path d='M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z' />
                  </svg>
                </div>
                <h3 className='mb-2 font-display text-[30px] font-medium leading-[1.1] tracking-tight'>
                  Connois<em className='italic text-camel-soft'>seur</em>
                </h3>
                <p className='mb-7 font-mono text-xs tracking-[0.06em] text-cream/55'>
                  250–999 PTS · MID TIER
                </p>
                <ul className='flex flex-col gap-3.5 border-t border-cream/12 pt-6'>
                  {[
                    'Earn 2× on weekends',
                    'Free pickup, always (no minimum)',
                    'Early access to weekly specials',
                    'Free birthday cut (up to $50)',
                    'All Regular tier perks',
                  ].map((perk) => (
                    <li
                      key={perk}
                      className='flex items-start gap-2.5 text-sm leading-snug text-cream/90'
                    >
                      <CheckIcon camel />
                      {perk}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>

            {/* Master Cut */}
            <Reveal delayMs={160}>
              <article className='rounded-sm border border-line-soft bg-paper p-9 transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none'>
                <div className='mb-7 grid h-12 w-12 place-items-center rounded-full bg-cream-deep text-ink'>
                  <svg
                    viewBox='0 0 24 24'
                    className='h-4.5 w-4.5'
                    aria-hidden
                  >
                    <path
                      d='M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z'
                      stroke='currentColor'
                      strokeWidth={2}
                      fill='none'
                    />
                    <path
                      d='M12 7l1.5 4.5H18l-3.5 2.6L16 18.5 12 16l-4 2.5 1.5-4.4L6 11.5h4.5z'
                      fill='currentColor'
                    />
                  </svg>
                </div>
                <h3 className='mb-2 font-display text-[30px] font-medium leading-[1.1] tracking-tight'>
                  Master <em className='italic text-oxblood'>Cut</em>
                </h3>
                <p className='mb-7 font-mono text-xs tracking-[0.06em] text-muted'>
                  1,000+ PTS · TOP TIER
                </p>
                <ul className='flex flex-col gap-3.5 border-t border-line-soft pt-6'>
                  {[
                    'Earn 3× on weekends',
                    '15% off all dry-aged cuts',
                    'First dibs on Wagyu allocations',
                    "Quarterly butcher's box (free)",
                    'Direct line to our head butcher',
                    'All Connoisseur tier perks',
                  ].map((perk) => (
                    <li
                      key={perk}
                      className='flex items-start gap-2.5 text-sm leading-snug text-ink-soft'
                    >
                      <CheckIcon />
                      {perk}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className='bg-paper py-25'>
        <div className='mx-auto max-w-7xl px-6 md:px-8'>
          <div className='grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_1.4fr] md:gap-20'>

            {/* Left: intro */}
            <Reveal>
              <span className='mb-3 block text-[11px] font-medium tracking-[0.22em] uppercase text-muted'>
                FAQ
              </span>
              <h2 className='mb-5 max-w-[18ch] font-display text-[clamp(40px,5vw,64px)] font-normal leading-[1.05] tracking-tight'>
                Common{' '}
                <em className='italic text-oxblood'>questions.</em>
              </h2>
              <p className='mb-7 max-w-[40ch] text-base leading-[1.65] text-ink-soft'>
                Quick answers to the things people usually want to know. Anything
                we missed? Just ask us at the counter or drop a note via the
                contact form.
              </p>
              <Link
                href='/contact'
                className='inline-flex items-center gap-2 rounded-full border border-line bg-transparent px-7 py-4 text-sm font-medium tracking-[0.02em] text-ink-soft transition-[border-color,background-color,color] duration-300 hover:border-ink hover:bg-cream-deep hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2 motion-reduce:transition-none'
              >
                Contact support
              </Link>
            </Reveal>

            {/* Right: accordion */}
            <Reveal delayMs={80}>
              <RewardsFaq />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ────────────────────────────────────── */}
      <section className='relative overflow-hidden bg-oxblood py-25 text-cream'>
        <div
          aria-hidden
          className='pointer-events-none absolute -top-50 -right-50 size-150 rounded-full'
          style={{
            background:
              'radial-gradient(circle, rgba(184,137,90,0.2) 0%, transparent 60%)',
          }}
        />
        <div className='relative z-10 mx-auto max-w-7xl px-6 text-center md:px-8'>
          <Reveal>
            <h2 className='mx-auto mb-7 max-w-180 font-display text-[clamp(40px,6vw,76px)] font-normal leading-none tracking-tight'>
              Worth joining for the{' '}
              <em className='italic text-camel-soft'>birthday cut</em> alone.
            </h2>
          </Reveal>

          <Reveal delayMs={80}>
            <p className='mx-auto mb-9 max-w-[50ch] text-[17px] leading-snug opacity-85'>
              Free to sign up, points start counting on your first order. The
              shop tastes better when it remembers you.
            </p>
          </Reveal>

          <Reveal delayMs={140}>
            <div className='flex flex-col items-center gap-3 sm:flex-row sm:justify-center'>
              <Link
                href='/register'
                className='inline-flex items-center gap-2.5 rounded-full bg-cream px-7 py-4 text-sm font-medium tracking-[0.02em] text-ink transition-[background-color,transform] duration-300 hover:bg-paper hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-oxblood motion-reduce:transition-none motion-reduce:hover:translate-y-0'
              >
                Join Rewards
                <ArrowIcon />
              </Link>
              <Link
                href='/products'
                className='inline-flex items-center gap-2.5 rounded-full border border-cream/40 bg-transparent px-7 py-4 text-sm font-medium tracking-[0.02em] text-cream transition-[border-color,background-color] duration-300 hover:border-cream hover:bg-cream/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-oxblood motion-reduce:transition-none'
              >
                Browse the shop
              </Link>
            </div>
            <p className='mt-6 text-xs tracking-[0.04em] opacity-60'>
              No credit card required · Cancel any time, but why would you
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
