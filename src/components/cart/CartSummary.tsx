'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useCartContext } from '@/context/CartContext';
import { computeTotals } from '@/lib/pricing';

type Fulfillment = 'pickup' | 'delivery';

const ArrowIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className='h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/cta:translate-x-0'
  >
    <path d='M5 12h14M13 5l7 7-7 7' />
  </svg>
);

const CartSummary = () => {
  const { cartItems } = useCartContext();
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);

  const [promo, setPromo] = useState('');
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup');

  const itemCount = cartItems.reduce(
    (acc, line) => acc + line.quantity,
    0,
  );
  const lineCount = cartItems.length;

  const totals = useMemo(
    () => computeTotals(cartItems, { isLoggedIn }),
    [cartItems, isLoggedIn],
  );

  const onApplyPromo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!promo.trim()) return;
    toast.info("We're not running promotions this week");
    setPromo('');
  };

  const onSelectDelivery = () => {
    toast.info('Delivery is coming soon — pickup only for now');
    setFulfillment('pickup');
  };

  const isEmpty = lineCount === 0;

  return (
    <div>
      <div className='rounded-sm border border-line-soft bg-paper px-7 py-7 sm:px-8 sm:py-8'>
        <div className='mb-5 text-[11px] font-medium tracking-[0.22em] uppercase text-muted'>
          → Order summary
        </div>

        <dl className='space-y-2.5'>
          <div className='flex items-baseline justify-between text-sm'>
            <dt className='text-ink-soft'>
              Subtotal{itemCount > 0 ? ` (${itemCount} item${itemCount === 1 ? '' : 's'})` : ''}
            </dt>
            <dd className='font-mono text-[13px]'>${totals.subtotal.toFixed(2)}</dd>
          </div>
          <div className='flex items-baseline justify-between text-sm'>
            <dt className='text-ink-soft'>Pickup</dt>
            <dd className='font-mono text-[13px]'>Free</dd>
          </div>
          {isLoggedIn && (
            <div className='flex items-baseline justify-between text-sm'>
              <dt className='text-ink-soft'>Member discount (5%)</dt>
              <dd className='font-mono text-[13px] text-green'>
                −${totals.memberDiscount.toFixed(2)}
              </dd>
            </div>
          )}
          <div className='flex items-baseline justify-between text-sm'>
            <dt className='text-ink-soft'>Estimated tax</dt>
            <dd className='font-mono text-[13px]'>${totals.tax.toFixed(2)}</dd>
          </div>
        </dl>

        <div className='mt-4 flex items-baseline justify-between border-t border-line pt-4'>
          <span className='font-display text-xl font-medium tracking-tight'>
            Total
          </span>
          <span className='font-display text-3xl font-medium tracking-tight'>
            ${totals.total.toFixed(2)}
            <em className='ml-1.5 text-sm font-normal not-italic text-muted'>
              USD
            </em>
          </span>
        </div>

        <form onSubmit={onApplyPromo} className='mt-5 flex gap-2'>
          <input
            type='text'
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            placeholder='Promo code'
            aria-label='Promo code'
            className='flex-1 rounded-full border border-line bg-cream px-4 py-2.5 text-[13px] text-ink outline-none placeholder:text-muted focus:border-ink'
          />
          <button
            type='submit'
            className='rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-cream transition-colors duration-300 hover:bg-oxblood motion-reduce:transition-none'
          >
            Apply
          </button>
        </form>

        <div className='mt-5 border-t border-line-soft pt-5'>
          <div className='mb-3 text-[11px] font-medium tracking-[0.22em] uppercase text-muted'>
            Fulfillment
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <button
              type='button'
              onClick={() => setFulfillment('pickup')}
              aria-pressed={fulfillment === 'pickup'}
              className={`rounded-sm border px-4 py-3.5 text-left transition-[background-color,border-color,color] duration-300 motion-reduce:transition-none ${
                fulfillment === 'pickup'
                  ? 'border-ink bg-ink text-cream'
                  : 'border-line bg-cream text-ink hover:border-ink'
              }`}
            >
              <div className='font-display text-[15px] font-medium tracking-tight'>
                Pickup
              </div>
              <div
                className={`font-mono text-[11px] tracking-[0.04em] ${
                  fulfillment === 'pickup' ? 'text-cream/70' : 'text-muted'
                }`}
              >
                ~1 hr · Free
              </div>
            </button>
            <button
              type='button'
              onClick={onSelectDelivery}
              aria-pressed={false}
              className='rounded-sm border border-line bg-cream px-4 py-3.5 text-left text-ink transition-[border-color] duration-300 hover:border-ink motion-reduce:transition-none'
            >
              <div className='font-display text-[15px] font-medium tracking-tight'>
                Delivery
              </div>
              <div className='font-mono text-[11px] tracking-[0.04em] text-muted'>
                Coming soon
              </div>
            </button>
          </div>
        </div>

        <Link
          href='/checkout'
          aria-disabled={isEmpty}
          tabIndex={isEmpty ? -1 : undefined}
          onClick={(e) => {
            if (isEmpty) e.preventDefault();
          }}
          className={`group/cta mt-6 flex items-center justify-center gap-3 rounded-full bg-ink px-7 py-4 text-[15px] font-medium tracking-[0.02em] text-cream transition-[background-color,transform] duration-300 motion-reduce:transition-none ${
            isEmpty
              ? 'pointer-events-none opacity-50'
              : 'hover:-translate-y-px hover:bg-oxblood motion-reduce:hover:translate-y-0'
          }`}
        >
          Continue to checkout
          <ArrowIcon />
        </Link>
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
          ~1 hr pickup
        </li>
      </ul>
    </div>
  );
};

export default CartSummary;
