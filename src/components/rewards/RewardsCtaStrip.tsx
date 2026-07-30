import Link from 'next/link';

import ArrowIcon from '@/components/ui/icons/ArrowIcon';
import Reveal from '@/components/ui/Reveal';

export default function RewardsCtaStrip() {
  return (
    <section className='relative overflow-hidden bg-oxblood py-25 text-cream'>
      <div
        aria-hidden
        className='pointer-events-none absolute -top-50 -right-50 size-150 rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.2)_0%,transparent_60%)]'
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
              <ArrowIcon className='h-3.5 w-3.5' />
            </Link>
            <Link
              href='/products'
              className='inline-flex items-center gap-2.5 rounded-full border border-cream/40 bg-transparent px-7 py-4 text-sm font-medium tracking-[0.02em] text-cream transition-[border-color,background-color] duration-300 hover:border-cream hover:bg-cream/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-oxblood motion-reduce:transition-none'
            >
              Browse the shop
            </Link>
          </div>
          <p className='mt-6 text-xs tracking-[0.04em] opacity-60'>
            No credit card required · Free forever, no strings attached
          </p>
        </Reveal>
      </div>
    </section>
  );
}
