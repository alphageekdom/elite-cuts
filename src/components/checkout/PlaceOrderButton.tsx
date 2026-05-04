'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';

import { useGlobalContext } from '@/context/CartContext';
import { useCheckoutContext } from '@/context/CheckoutContext';

const TAX_RATE = 0.1;
const MEMBER_DISCOUNT_RATE = 0.05;

const PlaceOrderButton = () => {
  const { cartItems } = useGlobalContext();
  const { data: session } = useSession();
  const { isPaymentReady, promoDiscount } = useCheckoutContext();
  const isLoggedIn = Boolean(session?.user);

  const total = useMemo(() => {
    const subtotal = cartItems.reduce(
      (acc, line) => acc + line.price * line.quantity,
      0,
    );
    const memberDiscount = isLoggedIn ? subtotal * MEMBER_DISCOUNT_RATE : 0;
    const afterDiscount = Math.max(0, subtotal - memberDiscount - promoDiscount);
    return afterDiscount + afterDiscount * TAX_RATE;
  }, [cartItems, isLoggedIn, promoDiscount]);

  const handlePlaceOrder = () => {
    toast.info('Payment processing coming soon');
  };

  return (
    <button
      type='button'
      onClick={handlePlaceOrder}
      disabled={!isPaymentReady}
      aria-disabled={!isPaymentReady}
      className={`group mt-2 inline-flex w-full items-center justify-center gap-3 rounded-full px-7 py-4 text-[15px] font-medium tracking-[0.02em] transition-[background-color,transform,opacity] duration-300 motion-reduce:transition-none ${
        isPaymentReady
          ? 'cursor-pointer bg-ink text-cream hover:-translate-y-px hover:bg-oxblood motion-reduce:hover:translate-y-0'
          : 'cursor-not-allowed bg-ink/30 text-cream/60'
      }`}
    >
      Place order
      {total > 0 && (
        <span className='rounded-full bg-cream/15 px-3 py-1 font-display text-[14px] font-medium'>
          ${total.toFixed(2)}
        </span>
      )}
      {isPaymentReady ? (
        <svg
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth={2}
          aria-hidden='true'
          className='h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0'
        >
          <path d='M5 12h14M13 5l7 7-7 7' />
        </svg>
      ) : (
        <svg
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth={2}
          aria-hidden='true'
          className='h-3.5 w-3.5'
        >
          <circle cx='12' cy='12' r='10' />
          <line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
        </svg>
      )}
    </button>
  );
};

export default PlaceOrderButton;
