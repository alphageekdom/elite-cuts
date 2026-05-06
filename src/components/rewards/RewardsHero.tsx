import Link from 'next/link';

import ArrowIcon from '@/components/uielements/ArrowIcon';
import Reveal from '@/components/uielements/Reveal';

const STATS = [
  { num: '1', suffix: 'pt', label: 'For every $1 spent in the shop' },
  { num: '3', suffix: '×', label: 'Weekend multiplier — up to 3× at top tier' },
  { num: '$0', suffix: '', label: 'No fees, no subscription, ever' },
  { num: '12', suffix: 'mo', label: 'Points stay valid from your last order' },
] as const;

export default function RewardsHero() {
  return (
    <section className='mx-auto max-w-7xl px-6 py-20 md:px-8'>
      <div className='grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20'>

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
              coming back.
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

        <Reveal delayMs={160}>
          <div className='relative overflow-hidden rounded-md bg-ink p-9 text-cream shadow-[0_30px_80px_rgba(28,24,20,0.18)] md:aspect-[1/1.15]'>
            <div
              aria-hidden
              className='pointer-events-none absolute -top-37.5 -right-37.5 size-100 rounded-full'
              style={{ background: 'radial-gradient(circle, rgba(184,137,90,0.25) 0%, transparent 60%)' }}
            />
            <div
              aria-hidden
              className='pointer-events-none absolute -bottom-25 -left-25 size-75 rounded-full'
              style={{ background: 'radial-gradient(circle, rgba(107,31,31,0.4) 0%, transparent 60%)' }}
            />

            <div className='relative z-10 flex h-full flex-col justify-between'>
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
                  <svg viewBox='0 0 24 24' fill='currentColor' className='h-6 w-6' aria-hidden>
                    <path d='M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z' />
                  </svg>
                </div>
              </div>

              <div className='my-8'>
                <div className='mb-2.5 text-[10px] tracking-[0.22em] uppercase text-cream/55'>
                  Connoisseur · Tier 02
                </div>
                <div className='mb-4 font-display text-[clamp(36px,4vw,52px)] font-normal leading-none tracking-tight'>
                  Earn{' '}
                  <em className='italic text-camel-soft'>2×</em> on weekends
                </div>
                <ul className='flex flex-col gap-1.5'>
                  {['Free pickup, always', 'Early access to weekly specials', 'Birthday cut on us'].map((perk) => (
                    <li key={perk} className='flex items-center gap-2 text-xs text-cream/85'>
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

              <div className='flex items-end justify-between border-t border-cream/12 pt-5 font-mono text-[10px] tracking-[0.06em] uppercase text-cream/55'>
                <span>EC · 2026</span>
                <span>· Member ·</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

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
  );
}
