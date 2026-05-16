'use client';

import { useState } from 'react';

import { useCartContext } from '@/context/CartContext';
import CartItemRow from './CartItemRow';

import CheckIcon from '@/components/uielements/CheckIcon';
import XIcon from '@/components/uielements/XIcon';

const EmptyState = () => (
  <div className='flex flex-col items-center justify-center px-8 py-16 text-center'>
    <div className='mb-5 grid h-14 w-14 place-items-center rounded-full bg-cream-deep text-ink-soft'>
      <svg
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={1.6}
        aria-hidden='true'
        className='h-6 w-6'
      >
        <circle cx='9' cy='21' r='1' />
        <circle cx='20' cy='21' r='1' />
        <path d='M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6' />
      </svg>
    </div>
    <h3 className='mb-1.5 font-display text-2xl font-medium tracking-tight'>
      Your cart is empty
    </h3>
    <p className='mb-6 max-w-[34ch] text-sm text-ink-soft'>
      Browse the counter and add a few cuts — we&apos;ll have them ready when
      you&apos;re ready to pick up.
    </p>
    <a
      href='/products'
      className='inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 text-[13px] font-medium tracking-[0.04em] text-cream transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-oxblood motion-reduce:transition-none motion-reduce:hover:translate-y-0'
    >
      Shop the counter
    </a>
  </div>
);

const CartItemsPanel = () => {
  const { cartItems, clearCart } = useCartContext();
  const count = cartItems.length;

  const [confirmingClear, setConfirmingClear] = useState(false);

  const startClearConfirm = () => setConfirmingClear(true);
  const cancelClearConfirm = () => setConfirmingClear(false);
  const confirmClear = () => {
    setConfirmingClear(false);
    void clearCart({ silent: true });
  };

  return (
    <section className='overflow-hidden rounded-sm border border-line-soft bg-paper'>
      <header className='flex items-center justify-between gap-3 border-b border-line-soft px-6 py-5 sm:px-8 sm:py-6'>
        <h2 className='font-display text-[20px] font-medium tracking-tight sm:text-[22px]'>
          {count} {count === 1 ? 'cut' : 'cuts'}{' '}
          <em className='ml-1 text-base font-normal not-italic text-muted'>
            in your cart
          </em>
        </h2>
        {count > 0 &&
          (confirmingClear ? (
            <span
              role='group'
              aria-label='Confirm clear cart'
              className='inline-flex items-center gap-2 text-[13px]'
            >
              <span className='text-muted'>Clear cart?</span>
              <button
                type='button'
                onClick={confirmClear}
                aria-label='Confirm clear cart'
                className='grid h-6 w-6 place-items-center rounded-full bg-oxblood text-cream transition-colors duration-300 hover:bg-ink motion-reduce:transition-none'
              >
                <CheckIcon className='h-3 w-3' />
              </button>
              <button
                type='button'
                onClick={cancelClearConfirm}
                aria-label='Cancel'
                className='grid h-6 w-6 place-items-center rounded-full border border-line text-ink-soft transition-colors duration-300 hover:border-ink hover:text-ink motion-reduce:transition-none'
              >
                <XIcon className='h-3 w-3' />
              </button>
            </span>
          ) : (
            <button
              type='button'
              onClick={startClearConfirm}
              className='text-[13px] text-muted transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none'
            >
              Clear cart
            </button>
          ))}
      </header>

      {count === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {cartItems.map((line) => (
            <CartItemRow key={line.product._id} line={line} />
          ))}
        </div>
      )}
    </section>
  );
};

export default CartItemsPanel;
