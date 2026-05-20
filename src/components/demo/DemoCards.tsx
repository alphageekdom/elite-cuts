'use client';

import { useState } from 'react';

import { FOCUS_RING } from '@/lib/styles';
import { startDemoSession, type DemoType } from '@/lib/auth/demo-signin';

const DemoCards = () => {
  const [pending, setPending] = useState<DemoType | null>(null);

  const handleDemo = async (demoType: DemoType) => {
    if (pending) return;
    setPending(demoType);
    const ok = await startDemoSession(demoType);
    if (!ok) setPending(null);
    // On success the helper hard-navigates, so pending stays set until the
    // new page replaces this one — no need to reset it here.
  };

  return (
    <div className='grid items-stretch gap-6 md:grid-cols-2'>
      <article className='flex h-full flex-col rounded-sm border border-line-soft bg-paper px-7 py-8 sm:px-8 sm:py-10'>
        <span className='font-display italic text-sm text-camel mb-3 tracking-[0.02em]'>
          ↗ Shop the catalog
        </span>
        <h2 className='font-display text-[clamp(28px,3vw,36px)] font-normal leading-tight tracking-tight mb-4'>
          Customer <em className='italic text-oxblood'>experience</em>
        </h2>
        <p className='text-ink-soft text-[15px] leading-relaxed mb-8'>
          Browse the full catalog, build a cart, save favorites, and walk
          through checkout without entering a card. Your activity clears
          nightly.
        </p>
        <button
          type='button'
          onClick={() => handleDemo('customer')}
          disabled={pending !== null}
          className={`mt-auto inline-flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-ink px-4 py-4 text-sm font-medium tracking-[0.04em] text-cream transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-ink motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:px-6 lg:gap-3 lg:px-7 ${FOCUS_RING}`}
        >
          {pending === 'customer'
            ? 'Starting demo…'
            : 'Continue as Demo Customer'}
          {pending !== 'customer' && (
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth={2}
              aria-hidden='true'
            >
              <path d='M5 12h14M13 5l7 7-7 7' />
            </svg>
          )}
        </button>
      </article>

      <article className='flex h-full flex-col rounded-sm border border-line-soft bg-paper px-7 py-8 sm:px-8 sm:py-10'>
        <span className='font-display italic text-sm text-camel mb-3 tracking-[0.02em]'>
          ↗ Run the shop
        </span>
        <h2 className='font-display text-[clamp(28px,3vw,36px)] font-normal leading-tight tracking-tight mb-4'>
          Admin dashboard <em className='italic text-oxblood'>preview</em>
        </h2>
        <p className='text-ink-soft text-[15px] leading-relaxed mb-8'>
          Manage products, orders, promos, staff, and analytics with real admin
          permissions on a shared demo dataset. Catalog and settings reset
          every night.
        </p>
        <button
          type='button'
          onClick={() => handleDemo('admin')}
          disabled={pending !== null}
          className={`mt-auto inline-flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-full border border-ink px-4 py-4 text-sm font-medium tracking-[0.04em] text-ink transition-[background-color,color,transform] duration-300 hover:-translate-y-px hover:bg-ink hover:text-cream disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-transparent disabled:hover:text-ink motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:px-6 lg:gap-3 lg:px-7 ${FOCUS_RING}`}
        >
          {pending === 'admin'
            ? 'Starting demo…'
            : 'Preview Admin Dashboard'}
          {pending !== 'admin' && (
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth={2}
              aria-hidden='true'
            >
              <path d='M5 12h14M13 5l7 7-7 7' />
            </svg>
          )}
        </button>
      </article>
    </div>
  );
};

export default DemoCards;
