'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

import { FOCUS_RING, CTA_ARROW } from '@/lib/styles';
import ArrowIcon from '@/components/ui/icons/ArrowIcon';

type Step = {
  num: string;
  time: string;
  title: string;
  body: string;
  cta: string;
  href: string;
};

type Props = { pointsOnAccount: number };

const TAB_LABELS = ['For shoppers', 'For owners'] as const;

// Three steps per door, each one a flow that completes today. The owner set
// deliberately avoids the order queue — it is read-only in the demo, and a
// tour step that dead-ends in a 403 is worse than no tour step.
function buildTours(pointsOnAccount: number): Step[][] {
  return [
    [
      {
        num: '01',
        time: '~2 min',
        title: 'Order a dry-aged ribeye.',
        body: 'Filter to Beef, open a ribeye, read the cut notes, and take it through pickup scheduling to the confirmation screen.',
        cta: 'Start in the catalog',
        href: '/products?category=Beef',
      },
      {
        num: '02',
        time: '~1 min',
        title: 'Spend your points.',
        // Not "the tier bar on your profile": the bar measures *qualifying*
        // points, and redemption deliberately doesn't touch those — spending
        // points must never cost a customer their tier. Redeeming moves the
        // spendable balance and the order total, and nothing else. The bar
        // sits in the account sidebar on every tab now, so a visitor who
        // followed this step would have watched it not move.
        // The live balance rather than a fixed figure: the account is shared,
        // so a visitor who redeems at checkout leaves less on it for the next.
        body: pointsOnAccount > 0
          ? `The demo account is carrying ${pointsOnAccount} points right now. Apply them at checkout and watch the order total — and your balance on the account page — move.`
          : 'Points land on the account as past orders are fulfilled. Apply them at checkout and watch the order total — and your balance on the account page — move.',
        cta: 'See how rewards work',
        href: '/rewards',
      },
      {
        num: '03',
        time: '~2 min',
        title: 'Leave a review.',
        body: 'Rate any cut and write a line about it. It shows up on the product page like anyone else’s, and clears with the overnight reset.',
        cta: 'Browse the case',
        href: '/products',
      },
    ],
    [
      {
        num: '01',
        time: '~2 min',
        title: 'Reprice a cut.',
        body: 'Open Products, change the price on the tomahawk, then load the storefront in another tab — the change is already there.',
        cta: 'Open products',
        href: '/dashboard/products',
      },
      {
        num: '02',
        time: '~2 min',
        title: 'Publish a promo code.',
        // "within a minute" is not padding: the public chip endpoint caches
        // for 60s, so a visitor who follows this step and checks the checkout
        // page immediately will see nothing and assume it's broken.
        body: 'Write a code and set it public. Within a minute it shows up as a one-tap chip on the checkout page for every shopper — including the customer door.',
        cta: 'Open promos',
        href: '/dashboard/promos',
      },
      {
        num: '03',
        time: '~3 min',
        title: 'Move the week around.',
        body: 'Drop a shift onto an empty hour, recolour it, reassign it. The schedule and the staff roster both write for real.',
        cta: 'Open the schedule',
        href: '/dashboard/schedule',
      },
    ],
  ];
}

export default function DemoTour({ pointsOnAccount }: Props) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tours = buildTours(pointsOnAccount);

  // Roving tabindex per the WAI tabs pattern — matches OurStoryTimeline.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = TAB_LABELS.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = active === last ? 0 : active + 1;
    else if (event.key === 'ArrowLeft') next = active === 0 ? last : active - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className='bg-cream-deep px-4 py-20 sm:px-8 sm:py-24 lg:px-16'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-11 flex flex-col gap-7 md:flex-row md:items-end md:justify-between md:gap-12'>
          <div>
            {/* camel-deeper, not camel-deep: this eyebrow sits on cream-deep
                rather than the lighter cream the sibling eyebrows use, and
                camel-deep only reaches 4.25:1 there. The page's other
                eyebrows are on plain cream (4.8:1) and stay as they are. */}
            <div className='text-camel-deeper mb-5 inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase'>
              <span aria-hidden className='bg-camel h-px w-7' />
              Not sure where to start
            </div>
            <h2 className='font-display max-w-[18ch] text-[clamp(34px,4.6vw,52px)] leading-[1.02] font-normal tracking-tight'>
              Three things worth{' '}
              <em className='text-oxblood italic'>trying first.</em>
            </h2>
          </div>

          <div
            role='tablist'
            aria-label='Guided tour audience'
            onKeyDown={onKeyDown}
            className='flex gap-2.5 md:mb-2'
          >
            {TAB_LABELS.map((label, i) => {
              const selected = i === active;
              return (
                <button
                  key={label}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type='button'
                  role='tab'
                  id={`tour-tab-${i}`}
                  aria-selected={selected}
                  aria-controls='tour-panel'
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(i)}
                  className={`cursor-pointer rounded-full border px-5 py-2.5 text-[13.5px] font-medium transition-colors duration-150 motion-reduce:transition-none ${
                    selected
                      ? 'bg-ink text-cream border-ink'
                      : 'border-line text-ink-soft hover:border-ink/40'
                  } ${FOCUS_RING}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          role='tabpanel'
          id='tour-panel'
          aria-labelledby={`tour-tab-${active}`}
          className='grid gap-5 md:grid-cols-2 lg:grid-cols-3'
        >
          {tours[active].map((step) => (
            <article
              key={step.num}
              className='border-line-soft bg-paper flex flex-col rounded-2xl border p-7'
            >
              <div className='mb-3.5 flex items-center justify-between'>
                <span className='font-display text-camel-deep text-[15px]'>
                  {step.num}
                </span>
                <span className='text-muted text-[11px] tracking-[0.12em] uppercase'>
                  {step.time}
                </span>
              </div>
              <h3 className='font-display mb-3 text-[25px] leading-[1.15] font-normal tracking-tight'>
                {step.title}
              </h3>
              <p className='text-ink-soft mb-5 flex-1 text-[14.5px] leading-[1.65]'>
                {step.body}
              </p>
              <Link
                href={step.href}
                className={`group/cta text-oxblood inline-flex items-center gap-2 self-start rounded-sm text-[14px] font-semibold hover:text-oxblood-deep transition-colors ${FOCUS_RING}`}
              >
                {step.cta}
                <ArrowIcon className={CTA_ARROW} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
