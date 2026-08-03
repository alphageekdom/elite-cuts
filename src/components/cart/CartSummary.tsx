'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { useCartContext } from '@/context/CartContext';
import { useShopSettings } from '@/context/ShopSettingsContext';
import { computeTotals, fmtPrice, MEMBER_DISCOUNT_RATE } from '@/lib/checkout/totals';
import { countCartCuts } from '@/lib/cart/counts';
import { formatReadyIn } from '@/lib/shop-settings/pickup-format';
import { formatDaysUntil } from '@/lib/announcements/holidays';
import StoreInfoModal from '@/components/ui/StoreInfoModal';
import ArrowIcon from '@/components/ui/icons/ArrowIcon';
import { CTA_ARROW, FOCUS_RING } from '@/lib/styles';

type Props = {
  activeHoliday?: { name: string; daysUntil: number } | null;
};

const CartSummary = ({ activeHoliday }: Props) => {
  const { cartItems } = useCartContext();
  const { data: session } = useSession();
  const { leadTime } = useShopSettings();
  const isLoggedIn = Boolean(session?.user);

  // Cuts, not lines and not sum-of-quantities — the same number the items
  // panel prints, so the two can't disagree about what's in the cart.
  const cutCount = countCartCuts(cartItems);
  const lineCount = cartItems.length;

  const totals = useMemo(
    () => computeTotals(cartItems, { isLoggedIn }),
    [cartItems, isLoggedIn],
  );

  const isEmpty = lineCount === 0;
  // Any variable-weight line (per_lb / whole_item_by_weight) makes the
  // total a best-guess until the cut is actually weighed at pickup. The
  // disclaimer copy matches the spec's wording (section "UI Display Rules").
  const anyEstimated = cartItems.some((l) => l.product.isEstimatedPrice);

  return (
    <div>
      <div className='rounded-sm border border-line-soft bg-paper px-7 py-7 sm:px-8 sm:py-8'>
        <div className='mb-5 text-[11px] font-medium tracking-[0.22em] uppercase text-muted'>
          → Order summary
        </div>

        <dl className='space-y-2.5'>
          <div className='flex items-baseline justify-between text-sm'>
            <dt className='text-ink-soft'>
              Subtotal{cutCount > 0 ? ` (${cutCount} cut${cutCount === 1 ? '' : 's'})` : ''}
            </dt>
            <dd className='font-mono text-[13px]'>${fmtPrice(totals.subtotal)}</dd>
          </div>
          <div className='flex items-baseline justify-between text-sm'>
            <dt className='text-ink-soft'>Pickup</dt>
            <dd className='font-mono text-[13px]'>Free</dd>
          </div>
          {isLoggedIn && (
            <div className='flex items-baseline justify-between text-sm'>
              <dt className='text-ink-soft'>
                Member discount ({MEMBER_DISCOUNT_RATE * 100}%)
              </dt>
              <dd className='font-mono text-[13px] text-green'>
                −${fmtPrice(totals.memberDiscount)}
              </dd>
            </div>
          )}
          <div className='flex items-baseline justify-between text-sm'>
            <dt className='text-ink-soft'>Estimated tax</dt>
            <dd className='font-mono text-[13px]'>${fmtPrice(totals.tax)}</dd>
          </div>
        </dl>

        <div className='mt-4 flex items-baseline justify-between border-t border-line pt-4'>
          <span className='font-display text-xl font-medium tracking-tight'>
            {anyEstimated ? 'Estimated total' : 'Total'}
          </span>
          <span className='font-display text-3xl font-medium tracking-tight'>
            ${fmtPrice(totals.total)}
            <em className='ml-1.5 text-sm font-normal not-italic text-muted'>
              USD
            </em>
          </span>
        </div>
        {anyEstimated && (
          <p className='mt-2 text-[12px] leading-relaxed text-muted'>
            Some cuts are priced by weight — the final price may vary slightly
            once they&rsquo;re weighed.
          </p>
        )}

        {isEmpty ? (
          <>
            <button
              type='button'
              disabled
              aria-describedby='checkout-empty-hint'
              className='mt-6 flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-full bg-ink px-7 py-4 text-[15px] font-medium tracking-[0.02em] text-cream opacity-50'
            >
              Continue to checkout
              <ArrowIcon className={CTA_ARROW} />
            </button>
            <p
              id='checkout-empty-hint'
              className='mt-2.5 text-center text-[12px] text-muted'
            >
              Add a cut to continue.
            </p>
          </>
        ) : (
          <>
            <Link
              href='/checkout'
              className='group/cta mt-6 flex items-center justify-center gap-3 rounded-full bg-ink px-7 py-4 text-[15px] font-medium tracking-[0.02em] text-cream transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-oxblood motion-reduce:transition-none motion-reduce:hover:translate-y-0'
            >
              Continue to checkout
              <ArrowIcon className={CTA_ARROW} />
            </Link>
            {/* "Keep shopping" is the one phrasing — the drawer and the
                confirmation page both use it. */}
            <Link
              href='/products'
              className={`mt-3 block rounded-sm py-1 text-center text-[13px] text-muted transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none ${FOCUS_RING}`}
            >
              Keep shopping
            </Link>
          </>
        )}
      </div>

      <ul className='mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-line-soft bg-paper px-5 py-4 text-[12px] text-muted'>
        <li className='inline-flex items-center gap-2'>
          <svg
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
            aria-hidden='true'
            className='h-3.5 w-3.5 text-green'
          >
            <rect x='3' y='11' width='18' height='11' rx='2' />
            <path d='M7 11V7a5 5 0 0110 0v4' />
          </svg>
          Secure checkout
        </li>
        <li className='inline-flex items-center gap-2'>
          <svg
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
            aria-hidden='true'
            className='h-3.5 w-3.5 text-green'
          >
            <polyline points='20 6 9 17 4 12' />
          </svg>
          Hand-cut fresh
        </li>
        <li className='inline-flex items-center gap-2'>
          <svg
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
            aria-hidden='true'
            className='h-3.5 w-3.5 text-green'
          >
            <circle cx='12' cy='12' r='9' />
            <polyline points='12 6 12 12 16 14' />
          </svg>
          Ready in {formatReadyIn(leadTime)}
        </li>
      </ul>

      {activeHoliday ? (
        <p className='mt-3 px-1 text-center text-[12px] leading-relaxed text-muted'>
          <em className='italic text-oxblood'>{activeHoliday.name}</em> is{' '}
          {formatDaysUntil(activeHoliday.daysUntil).toLowerCase()} —{' '}
          <StoreInfoModal label='visit us in‑store' /> to pre-order 1–2 weeks ahead.
        </p>
      ) : (
        <p className='mt-3 px-1 text-center text-[12px] leading-relaxed text-muted'>
          Placing a large or advance order?{' '}
          <StoreInfoModal label='Come in‑store' />{' '}
          — we&rsquo;ll take full payment up front.
        </p>
      )}
    </div>
  );
};

export default CartSummary;
