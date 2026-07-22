'use client';

import { useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';

import { useSession } from 'next-auth/react';

import { useCartContext, type CartLine } from '@/context/CartContext';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import { productImageSrc } from '@/lib/format';
import { computeTotals, fmtPrice } from '@/lib/pricing';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';
import ArrowIcon from '@/components/uielements/ArrowIcon';
import XIcon from '@/components/uielements/XIcon';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const DrawerLine = ({ line }: { line: CartLine }) => {
  const { setItemQuantity, removeItemFromCart } = useCartContext();
  const productId = line.product._id;

  return (
    <article className='grid grid-cols-[64px_1fr_auto] items-center gap-3.5 border-b border-line-soft py-4 last:border-0'>
      <div className='relative h-20 w-16 overflow-hidden rounded-sm bg-cream-deep'>
        <Image
          src={productImageSrc(line.product.images?.[0]) ?? ''}
          alt=''
          fill
          sizes='64px'
          className='object-cover'
        />
      </div>

      <div className='min-w-0'>
        <div className='line-clamp-2 font-display text-[15px] font-medium leading-snug tracking-tight'>
          {line.product.name}
        </div>
        {line.product.category && (
          <div className='mt-1 text-[11px] tracking-[0.04em] uppercase text-muted'>
            {line.product.category}
          </div>
        )}
        {line.product.displayWeightLabel && (
          <div className='mt-1 line-clamp-2 text-[11px] text-ink-soft'>
            {line.product.displayWeightLabel}
          </div>
        )}
        <div className='mt-2 flex items-center gap-2.5'>
          <div className='inline-flex h-9 items-center overflow-hidden rounded-full border border-line bg-paper'>
            <button
              type='button'
              onClick={() =>
                void setItemQuantity(productId, line.quantity - 1)
              }
              aria-label='Decrease quantity'
              className='grid h-full w-8 place-items-center text-[11px] transition-colors duration-300 hover:bg-cream-deep motion-reduce:transition-none'
            >
              −
            </button>
            <span className='min-w-5 px-1.5 text-center font-display text-[13px] font-medium'>
              {line.quantity}
            </span>
            <button
              type='button'
              onClick={() =>
                void setItemQuantity(productId, line.quantity + 1)
              }
              aria-label='Increase quantity'
              className='grid h-full w-8 place-items-center text-[11px] transition-colors duration-300 hover:bg-cream-deep motion-reduce:transition-none'
            >
              +
            </button>
          </div>
          <button
            type='button'
            onClick={() => void removeItemFromCart(productId)}
            className='-m-2 p-2 text-[11px] text-muted transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none'
          >
            Remove
          </button>
        </div>
      </div>

      <div className='self-start text-right'>
        <div className='font-display text-base font-medium tracking-tight'>
          ${fmtPrice(line.price * line.quantity)}
        </div>
        <div className='font-mono text-[11px] text-muted'>
          × {line.quantity}
        </div>
      </div>
    </article>
  );
};

const CartDrawer = ({ isOpen, onClose }: Props) => {
  const { cartItems } = useCartContext();
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);
  const count = cartItems.length;
  const mounted = useIsMounted();
  const asideRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const totals = useMemo(
    () => computeTotals(cartItems, { isLoggedIn }),
    [cartItems, isLoggedIn],
  );

  // Focus lands on the close button rather than the first focusable, which
  // would be whatever link happens to sit at the top of the drawer body.
  useFocusTrap(isOpen, asideRef, { initialFocusRef: closeBtnRef });
  useScrollLock(isOpen);
  useDismissOnEscape(isOpen, onClose);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        aria-hidden={!isOpen}
        onClick={onClose}
        className={`fixed inset-0 z-100 bg-ink/40 backdrop-blur-xs transition-opacity duration-400 motion-reduce:transition-none ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        ref={asideRef}
        role='dialog'
        aria-label='Cart'
        aria-modal={isOpen || undefined}
        inert={!isOpen}
        className={`fixed inset-y-0 right-0 z-101 flex w-full max-w-115 translate-x-full flex-col bg-cream shadow-[-20px_0_60px_rgba(0,0,0,0.15)] transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${
          isOpen ? 'translate-x-0!' : ''
        }`}
      >
        <header className='flex shrink-0 items-center justify-between border-b border-line-soft px-7 py-6'>
          <h2 className='inline-flex items-baseline gap-2.5 font-display text-2xl font-medium tracking-tight'>
            Cart
            <em className='text-sm font-normal not-italic text-muted'>
              {count} {count === 1 ? 'cut' : 'cuts'}
            </em>
          </h2>
          <button
            ref={closeBtnRef}
            type='button'
            onClick={onClose}
            aria-label='Close cart'
            className='grid h-9 w-9 place-items-center rounded-full border border-line bg-paper text-ink transition-[background-color,border-color] duration-300 hover:border-ink hover:bg-cream-deep motion-reduce:transition-none'
          >
            <XIcon className='h-3.5 w-3.5' />
          </button>
        </header>

        {count === 0 ? (
          <div className='flex flex-1 flex-col items-center justify-center px-10 text-center'>
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
            <h3 className='mb-1.5 font-display text-xl font-medium tracking-tight'>
              Your cart is empty
            </h3>
            <p className='mb-5 max-w-[28ch] text-sm text-ink-soft'>
              Browse the counter to add a few cuts.
            </p>
            <Link
              href='/products'
              onClick={onClose}
              className='inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium tracking-[0.04em] text-cream transition-colors duration-300 hover:bg-oxblood motion-reduce:transition-none'
            >
              Shop the counter
            </Link>
          </div>
        ) : (
          <div className='flex-1 overflow-y-auto px-7 pt-4 pb-6'>
            {cartItems.filter((line) => line.product != null).map((line) => (
              <DrawerLine key={line.product._id} line={line} />
            ))}
          </div>
        )}

        {count > 0 && (
          <footer className='shrink-0 border-t border-line-soft bg-paper px-7 py-6'>
            <dl className='mb-4'>
              <div className='flex items-baseline justify-between py-1.5 text-[13px] text-ink-soft'>
                <dt>Subtotal</dt>
                <dd className='font-mono text-[12px]'>
                  ${fmtPrice(totals.subtotal)}
                </dd>
              </div>
              <div className='flex items-baseline justify-between py-1.5 text-[13px] text-ink-soft'>
                <dt>Estimated tax</dt>
                <dd className='font-mono text-[12px]'>
                  ${fmtPrice(totals.tax)}
                </dd>
              </div>
              <div className='mt-1.5 flex items-baseline justify-between border-t border-line pt-3'>
                <dt className='font-display text-base font-medium text-ink'>
                  Total
                </dt>
                <dd className='font-display text-[22px] font-medium tracking-tight text-ink'>
                  ${fmtPrice(totals.total)}
                </dd>
              </div>
            </dl>

            <div className='grid grid-cols-2 gap-2'>
              <Link
                href='/cart'
                onClick={onClose}
                className='inline-flex items-center justify-center rounded-full border border-line bg-transparent px-4 py-3.5 text-[13px] font-medium tracking-[0.02em] text-ink-soft transition-[background-color,border-color,color] duration-300 hover:border-ink hover:bg-cream hover:text-ink motion-reduce:transition-none'
              >
                View cart
              </Link>
              <Link
                href='/checkout'
                onClick={onClose}
                className='inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-3.5 text-[13px] font-medium tracking-[0.02em] text-cream transition-colors duration-300 hover:bg-oxblood motion-reduce:transition-none'
              >
                Checkout
                <ArrowIcon className='h-3 w-3' />
              </Link>
            </div>

            <p className='mt-3 text-center font-mono text-[11px] tracking-[0.04em] text-muted'>
              <strong className='font-medium text-ink'>Free pickup</strong> ·
              ready in ~1 hour
            </p>
          </footer>
        )}
      </aside>
    </>,
    document.body,
  );
};

export default CartDrawer;
