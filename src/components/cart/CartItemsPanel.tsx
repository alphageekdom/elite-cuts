'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { useCartContext } from '@/context/CartContext';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';
import { countCartCuts, countCartItems } from '@/lib/cart/counts';
import { FOCUS_RING } from '@/lib/styles';
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
    <Link
      href='/products'
      className='inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3 text-[13px] font-medium tracking-[0.04em] text-cream transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-oxblood motion-reduce:transition-none motion-reduce:hover:translate-y-0'
    >
      Shop the counter
    </Link>
  </div>
);

const CartItemsPanel = () => {
  const { cartItems, clearCart } = useCartContext();
  const count = countCartItems(cartItems);
  const cuts = countCartCuts(cartItems);

  const [confirmingClear, setConfirmingClear] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const cancelClearRef = useRef<HTMLButtonElement>(null);
  const wasConfirmingRef = useRef(false);
  const returnFocusToHeadingRef = useRef(false);

  useDismissOnEscape(confirmingClear, () => setConfirmingClear(false));

  // Same swap-follows-focus rule the rows use. The clear path never reaches
  // the restore branch — emptying the cart unmounts the Clear cart button
  // along with the confirm pair, so that side is handled below.
  useEffect(() => {
    if (confirmingClear) cancelClearRef.current?.focus();
    else if (wasConfirmingRef.current) clearRef.current?.focus();
    wasConfirmingRef.current = confirmingClear;
  }, [confirmingClear]);

  // Both destructive paths take the focused button down with them: a removed
  // row unmounts, and clearing unmounts the Clear cart button too. The heading
  // is the one thing that survives every cart state, so it takes focus — and
  // it's deliberately deferred to a count change rather than fired from the
  // click handler, so what gets announced is the count *after* the removal
  // rather than the one still on screen when the button was pressed.
  useEffect(() => {
    if (!returnFocusToHeadingRef.current) return;
    returnFocusToHeadingRef.current = false;
    headingRef.current?.focus();
  }, [count]);

  const handleRowRemoved = () => {
    returnFocusToHeadingRef.current = true;
  };

  const startClearConfirm = () => setConfirmingClear(true);
  const cancelClearConfirm = () => setConfirmingClear(false);
  const confirmClear = () => {
    setConfirmingClear(false);
    returnFocusToHeadingRef.current = true;
    void clearCart({ silent: true });
  };

  return (
    <section className='overflow-hidden rounded-sm border border-line-soft bg-paper'>
      <header className='flex items-center justify-between gap-3 border-b border-line-soft px-6 py-5 sm:px-8 sm:py-6'>
        {/* "items" is distinct lines, "cuts" counts bundle contents and
            quantities — see src/lib/cart/counts.ts. The cuts line is dropped
            when it would only restate the item count. */}
        {/* Focusable only to script: the destructive paths below hand focus
            here once their own button has unmounted. It does match
            :focus-visible when they do, so it carries the shared ring —
            otherwise the browser draws its own blue default here. */}
        <h2
          ref={headingRef}
          tabIndex={-1}
          className={`font-display text-[20px] font-medium tracking-tight sm:text-[22px] ${FOCUS_RING}`}
        >
          {count} {count === 1 ? 'item' : 'items'}{' '}
          {cuts !== count && (
            // The separator is a real character rather than spacing: two
            // inline elements with only a margin between them have no
            // whitespace in the text, so this announced as
            // "2 items6 cuts in total".
            <em className='ml-2 text-base font-normal not-italic text-muted'>
              · {cuts} cuts in total
            </em>
          )}
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
                className={`grid h-8 w-8 place-items-center rounded-full bg-oxblood text-cream transition-colors duration-300 hover:bg-ink motion-reduce:transition-none ${FOCUS_RING}`}
              >
                <CheckIcon className='h-3 w-3' />
              </button>
              <button
                ref={cancelClearRef}
                type='button'
                onClick={cancelClearConfirm}
                aria-label='Cancel'
                className={`grid h-8 w-8 place-items-center rounded-full border border-line text-ink-soft transition-colors duration-300 hover:border-ink hover:text-ink motion-reduce:transition-none ${FOCUS_RING}`}
              >
                <XIcon className='h-3 w-3' />
              </button>
            </span>
          ) : (
            <button
              ref={clearRef}
              type='button'
              onClick={startClearConfirm}
              className={`-my-1 rounded-sm py-1 text-[13px] text-muted underline decoration-line underline-offset-3 transition-colors duration-300 hover:decoration-current hover:text-oxblood motion-reduce:transition-none ${FOCUS_RING}`}
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
            <CartItemRow
              key={line.product._id}
              line={line}
              onRemoved={handleRowRemoved}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default CartItemsPanel;
