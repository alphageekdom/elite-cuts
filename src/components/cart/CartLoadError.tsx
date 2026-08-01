'use client';

import { useCartContext } from '@/context/CartContext';
import { FOCUS_RING } from '@/lib/styles';

// Shown instead of the empty state when the cart fetch failed.
//
// "Your cart is empty" is a lie when the truth is that we couldn't reach the
// server, and it's the expensive kind: a customer who believes it goes and
// rebuilds a cart that already exists. The drawer got this treatment in the
// 2026-07-27 pass and the cart page didn't, so the two surfaces disagreed
// about the same failure — hence one component rather than a second copy.
export default function CartLoadError({ className = '' }: { className?: string }) {
  const { retryLoadCart } = useCartContext();

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className='mb-5 grid h-14 w-14 place-items-center rounded-full bg-cream-deep text-oxblood'>
        <svg
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth={1.6}
          aria-hidden='true'
          className='h-6 w-6'
        >
          <circle cx='12' cy='12' r='9' />
          <path d='M12 8v5' />
          <path d='M12 16h.01' />
        </svg>
      </div>
      <h3 className='mb-1.5 font-display text-xl font-medium tracking-tight'>
        We couldn&rsquo;t load your cart
      </h3>
      <p className='mb-5 max-w-[30ch] text-sm text-ink-soft'>
        Your items are safe — this was a problem reaching the shop, not a
        problem with your cart.
      </p>
      <button
        type='button'
        onClick={retryLoadCart}
        className={`inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium tracking-[0.04em] text-cream transition-colors duration-300 hover:bg-oxblood motion-reduce:transition-none ${FOCUS_RING}`}
      >
        Try again
      </button>
    </div>
  );
}
