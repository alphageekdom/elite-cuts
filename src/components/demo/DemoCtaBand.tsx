'use client';

import Link from 'next/link';

import { FOCUS_RING_DARK, CTA_ARROW } from '@/lib/styles';
import { useDemoStart } from '@/hooks/useDemoStart';
import ArrowIcon from '@/components/uielements/ArrowIcon';

// Closing repeat of the two doors, for anyone who read the whole page rather
// than picking at the top. Shares `useDemoStart` with DemoDoors so a click here
// behaves identically, including the in-flight lockout.
export default function DemoCtaBand() {
  const { pending, start } = useDemoStart();

  return (
    <section className='bg-oxblood-deep text-cream relative overflow-hidden px-4 py-24 text-center sm:px-8 lg:px-16'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(224,168,107,0.18),transparent_60%)]'
      />
      <div className='relative mx-auto max-w-3xl'>
        <h2 className='font-display mx-auto mb-5 max-w-[16ch] text-[clamp(36px,5.2vw,62px)] leading-[1.02] font-normal tracking-tight'>
          Pick a door. Nothing{' '}
          <em className='text-camel-soft italic'>breaks.</em>
        </h2>
        {/* The "no account, no card, no signup" triple is already in the hero
            and the fact strip; a third printing adds nothing this far down the
            page. Say the reset a different way instead. */}
        <p className='text-cream/75 mx-auto mb-9 max-w-[46ch] text-[17px] leading-relaxed'>
          Both doors are one click from here, and whatever you change is back to
          normal by morning.
        </p>

        <div className='flex flex-col items-center justify-center gap-4 sm:flex-row'>
          <button
            type='button'
            onClick={() => start('customer')}
            disabled={pending !== null}
            className={`group/cta bg-cream text-oxblood-deep inline-flex cursor-pointer items-center gap-2.5 rounded-full px-8 py-4 text-[15.5px] font-semibold transition-[transform,opacity] duration-300 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${FOCUS_RING_DARK} focus-visible:ring-offset-oxblood-deep`}
          >
            {pending === 'customer' ? 'Starting demo…' : 'Shop as a customer'}
            {pending !== 'customer' && <ArrowIcon className={CTA_ARROW} />}
          </button>
          <button
            type='button'
            onClick={() => start('admin')}
            disabled={pending !== null}
            className={`border-cream/40 text-cream hover:bg-cream/10 inline-flex cursor-pointer items-center gap-2.5 rounded-full border px-8 py-4 text-[15.5px] font-medium transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${FOCUS_RING_DARK} focus-visible:ring-offset-oxblood-deep`}
          >
            {pending === 'admin' ? 'Starting demo…' : 'Open the dashboard'}
          </button>
        </div>

        {/* cream/70, not /60: at 60% over oxblood-deep this composites to
            4.32:1, under AA's 4.5 for 12.5px text. /70 lands at ~5.4:1. */}
        <p className='text-cream/70 mt-8 text-[12.5px] tracking-[0.14em] uppercase'>
          Already have an account?{' '}
          <Link
            href='/login'
            className={`text-cream underline underline-offset-4 ${FOCUS_RING_DARK} focus-visible:ring-offset-oxblood-deep`}
          >
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
