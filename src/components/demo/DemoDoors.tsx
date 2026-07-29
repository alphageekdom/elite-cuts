'use client';

import Image from 'next/image';

import { FOCUS_RING, FOCUS_RING_DARK, CTA_ARROW } from '@/lib/styles';
import { useDemoStart } from '@/hooks/useDemoStart';
import ArrowIcon from '@/components/uielements/ArrowIcon';
import CheckIcon from '@/components/uielements/CheckIcon';

type Feature = { text: string; tag: string };

type Props = { cutCount: number; pointsOnAccount: number };

// Every bullet below is a flow that completes in the demo today. The owner
// list stops at what a demo admin can actually write: the order queue is
// read-only, because fulfilling an order awards points to the customer who
// placed it and that reaches outside the demo's own data. The FAQ says so
// plainly rather than leaving it to be discovered as a 403.
const ownerFeatures: Feature[] = [
  { text: 'Add, edit, and reprice catalog items', tag: 'Products' },
  { text: 'Write promo codes and watch them go live', tag: 'Promos' },
  { text: 'Build the week on the staff schedule', tag: 'Schedule' },
  { text: 'Tune rewards rates, tiers, and shop details', tag: 'Settings' },
  { text: 'Read every dashboard and export to CSV', tag: 'Analytics' },
];

export default function DemoDoors({ cutCount, pointsOnAccount }: Props) {
  const { pending, start } = useDemoStart();

  const shopperFeatures: Feature[] = [
    { text: `Browse ${cutCount} cuts with live search and filters`, tag: 'Catalog' },
    { text: 'Build a cart and pick a pickup slot', tag: 'Checkout' },
    { text: 'Save cuts to your list', tag: 'Account' },
    // The live balance, so the bullet drops rather than promising nothing —
    // the account is shared, and a visitor can redeem it down at checkout.
    ...(pointsOnAccount > 0
      ? [
          {
            text: `Spend the ${pointsOnAccount} points already on the account`,
            tag: 'Rewards',
          },
        ]
      : []),
    { text: 'Leave a review on any cut', tag: 'Reviews' },
  ];

  return (
    <div className='grid items-stretch gap-6 md:grid-cols-2'>
      {/* Door 01 — storefront */}
      <article className='border-line-soft bg-paper flex h-full flex-col overflow-hidden rounded-lg border'>
        <div className='bg-cream-deep relative h-64 sm:h-75'>
          <Image
            src='/images/our-story/shop-cover.jpg'
            alt=''
            fill
            sizes='(min-width: 768px) 50vw, 100vw'
            className='object-cover'
          />
          <div
            aria-hidden
            className='absolute inset-0 bg-linear-to-b from-ink/45 to-transparent to-45%'
          />
          <span className='bg-paper/95 text-ink absolute top-4.5 left-5 rounded-full px-3 py-1.5 text-[10.5px] font-semibold tracking-[0.18em] uppercase'>
            Door 01 · Storefront
          </span>
        </div>

        <div className='flex flex-1 flex-col px-7 py-8 sm:px-9 sm:py-9'>
          <span className='text-camel-deep mb-3.5 text-[10.5px] font-medium tracking-[0.2em] uppercase'>
            Shop the catalog
          </span>
          <h2 className='font-display mb-3.5 text-[clamp(28px,3.4vw,38px)] leading-[1.05] font-normal tracking-tight'>
            At the <em className='text-oxblood italic'>counter</em>
          </h2>
          <p className='text-ink-soft mb-7 text-[15.5px] leading-relaxed'>
            See what a regular sees. The whole case, working search and filters,
            a real cart, and pickup scheduling all the way to the confirmation
            screen.
          </p>

          <ul className='mb-7 flex flex-col'>
            {shopperFeatures.map((f) => (
              <li
                key={f.tag}
                className='border-line-soft flex items-center gap-3.5 border-t py-3'
              >
                <CheckIcon className='text-oxblood h-3.5 w-3.5 shrink-0' />
                <span className='text-ink-soft flex-1 text-[14.5px]'>{f.text}</span>
                <span className='text-muted shrink-0 text-[11px] tracking-[0.12em] uppercase'>
                  {f.tag}
                </span>
              </li>
            ))}
          </ul>

          <div className='mt-auto flex flex-col gap-3'>
            <button
              type='button'
              onClick={() => start('customer')}
              disabled={pending !== null}
              className={`group/cta bg-ink text-cream inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl text-[15.5px] font-semibold transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-ink motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${FOCUS_RING}`}
            >
              {pending === 'customer' ? 'Starting demo…' : 'Shop as a customer'}
              {pending !== 'customer' && <ArrowIcon className={CTA_ARROW} />}
            </button>
            <span className='text-muted text-center text-[12.5px]'>
              Opens the catalog · no login step
            </span>
          </div>
        </div>
      </article>

      {/* Door 02 — back of house */}
      <article className='bg-ink text-cream flex h-full flex-col overflow-hidden rounded-lg shadow-2xl'>
        <div className='relative h-64 bg-ink-soft sm:h-75'>
          <Image
            src='/images/our-story/visit-counter.jpg'
            alt=''
            fill
            sizes='(min-width: 768px) 50vw, 100vw'
            className='object-cover opacity-75'
          />
          <div
            aria-hidden
            className='absolute inset-0 bg-linear-to-b from-ink/55 via-transparent to-ink/70'
          />
          <span className='bg-camel-soft text-ink absolute top-4.5 left-5 rounded-full px-3 py-1.5 text-[10.5px] font-semibold tracking-[0.18em] uppercase'>
            Door 02 · Back of house
          </span>
        </div>

        <div className='flex flex-1 flex-col px-7 py-8 sm:px-9 sm:py-9'>
          <span className='text-camel-soft mb-3.5 text-[10.5px] font-medium tracking-[0.2em] uppercase'>
            Run the shop
          </span>
          <h2 className='font-display mb-3.5 text-[clamp(28px,3.4vw,38px)] leading-[1.05] font-normal tracking-tight'>
            Behind the <em className='text-camel-soft italic'>counter</em>
          </h2>
          <p className='text-cream/75 mb-7 text-[15.5px] leading-relaxed'>
            Owner access to a seeded shop — a live catalog, a staffed week, and
            the dashboards that come with them. What you change here really
            changes, right up until the overnight reset puts it back.
          </p>

          <ul className='mb-7 flex flex-col'>
            {ownerFeatures.map((f) => (
              <li
                key={f.tag}
                className='border-cream/14 flex items-center gap-3.5 border-t py-3'
              >
                <CheckIcon className='text-camel-soft h-3.5 w-3.5 shrink-0' />
                <span className='text-cream/80 flex-1 text-[14.5px]'>{f.text}</span>
                <span className='text-cream/50 shrink-0 text-[11px] tracking-[0.12em] uppercase'>
                  {f.tag}
                </span>
              </li>
            ))}
          </ul>

          <div className='mt-auto flex flex-col gap-3'>
            <button
              type='button'
              onClick={() => start('admin')}
              disabled={pending !== null}
              className={`group/cta bg-oxblood text-cream inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl text-[15.5px] font-semibold transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-oxblood-deep disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-oxblood motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${FOCUS_RING_DARK}`}
            >
              {pending === 'admin' ? 'Starting demo…' : 'Open the dashboard'}
              {pending !== 'admin' && <ArrowIcon className={CTA_ARROW} />}
            </button>
            <span className='text-cream/50 text-center text-[12.5px]'>
              Signs you straight in · no password
            </span>
          </div>
        </div>
      </article>

      {/* Picking a door swaps that button's own label to "Starting demo…",
          which a screen reader has no reason to re-read. This says it once,
          out loud, in the window before the hard navigation. Mirrors the
          same announcement on the sign-in page's pair of doors. */}
      <p className='sr-only' role='status' aria-live='polite'>
        {pending ? 'Starting demo session, please wait…' : ''}
      </p>
    </div>
  );
}
