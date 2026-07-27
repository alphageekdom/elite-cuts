'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';

import { useSession } from 'next-auth/react';

import { useCartContext, type CartLine } from '@/context/CartContext';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useShopSettings } from '@/context/ShopSettingsContext';
import { formatReadyIn } from '@/lib/shop-settings/pickup-format';
import { MAX_PER_LINE } from '@/lib/shop-settings/config';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';
import {
  useCartExpiryClock,
  formatSecondsClock,
  CART_TTL_MINUTES,
} from '@/hooks/useCartExpiry';
import { productImageSrc } from '@/lib/format';
import {
  computeTotals,
  fmtPrice,
  MEMBER_DISCOUNT_RATE,
} from '@/lib/pricing';
import { formatCartCount } from '@/lib/cart/counts';
import { computeAward } from '@/lib/rewards/calculator';
import { FOCUS_RING } from '@/lib/styles';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';
import ArrowIcon from '@/components/uielements/ArrowIcon';
import CartIcon from '@/components/uielements/CartIcon';
import CheckIcon from '@/components/uielements/CheckIcon';
import MinusIcon from '@/components/uielements/MinusIcon';
import PlusIcon from '@/components/uielements/PlusIcon';
import XIcon from '@/components/uielements/XIcon';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type DrawerLineProps = {
  line: CartLine;
  isOpen: boolean;
  onAnnounce: (message: string) => void;
  onRemoved: (name: string) => void;
};

const DrawerLine = ({ line, isOpen, onAnnounce, onRemoved }: DrawerLineProps) => {
  const { setItemQuantity, removeItemFromCart } = useCartContext();
  const [expanded, setExpanded] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = productImageSrc(line.product.images?.[0]);

  const minusRef = useRef<HTMLButtonElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const wasConfirmingRef = useRef(false);

  const productId = line.product._id;
  const name = line.product.name;
  const contents = line.product.includedItems ?? [];
  const hasContents = contents.length > 0;
  const contentsId = `cart-contents-${productId}`;

  // Stock can bite before the per-line cap does — a cut with 6 in stock left
  // the + button enabled all the way to 10, so each press past 6 round-tripped
  // to a rejection and the quantity visibly bounced 6→7→6 on the way back.
  const maxForLine = Math.min(
    line.product.stockCount ?? MAX_PER_LINE,
    MAX_PER_LINE,
  );

  // Transient row state is per-line and the drawer stays mounted when closed,
  // so without this an armed delete confirm would still be armed on reopen.
  // Adjust-during-render rather than an effect, per the project's React 19
  // prop-sync pattern.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setConfirmingRemove(false);
      setExpanded(false);
    }
  }

  // Escape collapses the confirm before the drawer: the shared stack dispatches
  // innermost-first, so the drawer's own registration still handles the
  // unarmed case.
  useDismissOnEscape(confirmingRemove, () => setConfirmingRemove(false));

  // Focus follows the confirm swap in both directions — the button under focus
  // unmounts on each transition, which otherwise drops focus to <body>.
  useEffect(() => {
    if (confirmingRemove) cancelRef.current?.focus();
    else if (wasConfirmingRef.current) removeRef.current?.focus();
    wasConfirmingRef.current = confirmingRemove;
  }, [confirmingRemove]);

  // Which stepper was last pressed, so focus can be handed to its sibling once
  // the new quantity has actually rendered. Doing it inside the click handler
  // doesn't work: the sibling may still be disabled at that instant — a line
  // capped at 2 goes straight from "minus disabled" to "plus disabled" — and a
  // disabled element silently refuses focus, dropping it to <body>.
  const pendingStepperRef = useRef<'minus' | 'plus' | null>(null);

  useEffect(() => {
    const pressed = pendingStepperRef.current;
    if (!pressed) return;
    pendingStepperRef.current = null;

    const minusDisabled = line.quantity <= 1;
    const plusDisabled = line.quantity >= maxForLine;
    if (pressed === 'minus' && !minusDisabled) return;
    if (pressed === 'plus' && !plusDisabled) return;

    if (pressed === 'minus' && !plusDisabled) plusRef.current?.focus();
    else if (pressed === 'plus' && !minusDisabled) minusRef.current?.focus();
    // Both ends disabled (stock dropped to 1 under a line already holding 2):
    // there is no sibling to hand off to, so fall back to the row's own action.
    else removeRef.current?.focus();
  }, [line.quantity, maxForLine]);

  const decrement = () => {
    pendingStepperRef.current = 'minus';
    void setItemQuantity(productId, line.quantity - 1);
  };

  const increment = () => {
    const next = line.quantity + 1;
    pendingStepperRef.current = 'plus';
    if (next >= maxForLine) {
      onAnnounce(
        maxForLine < MAX_PER_LINE
          ? `Only ${maxForLine} of ${name} in stock.`
          : `Maximum ${MAX_PER_LINE} per item.`,
      );
    }
    void setItemQuantity(productId, next);
  };

  return (
    <article className='flex gap-4 border-b border-line-soft py-5 last:border-0'>
      {/* A missing path used to hand Image an empty src and a dead one showed
          the browser's broken-image glyph; the bare cream chip reads as
          deliberate next to a price. */}
      <div className='relative h-24 w-20 shrink-0 overflow-hidden rounded-sm bg-cream-deep'>
        {imageSrc && !imageFailed && (
          <Image
            src={imageSrc}
            alt=''
            fill
            sizes='80px'
            className='object-cover'
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-baseline justify-between gap-3'>
          <h3 className='min-w-0 font-display text-[17px] font-medium leading-snug tracking-tight'>
            {line.product.name}
          </h3>
          <span className='shrink-0 font-display text-[17px] font-medium tracking-tight'>
            ${fmtPrice(line.price * line.quantity)}
          </span>
        </div>

        <p className='mt-1.5 text-[11px] tracking-[0.14em] uppercase text-muted'>
          {line.product.category}
          {!hasContents && line.product.displayWeightLabel && (
            <> · {line.product.displayWeightLabel}</>
          )}
          {hasContents && <> · {contents.length} cuts</>}
        </p>

        {hasContents && (
          <>
            <button
              type='button'
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              // Only while the list is actually in the DOM — the contents are
              // conditionally rendered, and an aria-controls pointing at a
              // missing id is a dangling reference.
              aria-controls={expanded ? contentsId : undefined}
              className={`mt-2 -my-1 py-1 text-xs text-oxblood underline decoration-oxblood/30 underline-offset-3 transition-colors duration-300 hover:decoration-oxblood motion-reduce:transition-none ${FOCUS_RING}`}
            >
              {expanded ? "Hide what's inside" : "See what's inside"}
            </button>
            {expanded && (
              <ul
                id={contentsId}
                className='mt-2 flex flex-col gap-1 border-l-2 border-line pl-3'
              >
                {contents.map((item) => (
                  <li key={item} className='text-xs leading-relaxed text-ink-soft'>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-2'>
          <div className='inline-flex h-10 items-center overflow-hidden rounded-full border border-line bg-paper'>
            <button
              ref={minusRef}
              type='button'
              onClick={decrement}
              disabled={line.quantity <= 1}
              aria-label={`Decrease ${name} quantity`}
              className={`grid h-full w-10 place-items-center transition-colors duration-300 hover:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none ${FOCUS_RING}`}
            >
              <MinusIcon className='h-2.5 w-2.5' />
            </button>
            <span className='min-w-6 px-1 text-center font-display text-[13px] font-medium tabular-nums'>
              {line.quantity}
            </span>
            <button
              ref={plusRef}
              type='button'
              onClick={increment}
              disabled={line.quantity >= maxForLine}
              aria-label={`Increase ${name} quantity`}
              className={`grid h-full w-10 place-items-center transition-colors duration-300 hover:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none ${FOCUS_RING}`}
            >
              <PlusIcon className='h-2.5 w-2.5' />
            </button>
          </div>

          {confirmingRemove ? (
            <span
              role='group'
              aria-label={`Remove ${name}?`}
              className='inline-flex items-center gap-2 text-xs'
            >
              <span className='text-muted'>Remove?</span>
              <button
                type='button'
                onClick={() => {
                  setConfirmingRemove(false);
                  onRemoved(name);
                  void removeItemFromCart(productId, { silent: true });
                }}
                aria-label='Confirm'
                className={`grid h-8 w-8 place-items-center rounded-full bg-oxblood text-cream transition-colors duration-300 hover:bg-ink motion-reduce:transition-none ${FOCUS_RING}`}
              >
                <CheckIcon className='h-3 w-3' />
              </button>
              <button
                ref={cancelRef}
                type='button'
                onClick={() => setConfirmingRemove(false)}
                aria-label='Cancel'
                className={`grid h-8 w-8 place-items-center rounded-full border border-line text-ink-soft transition-colors duration-300 hover:border-ink hover:text-ink motion-reduce:transition-none ${FOCUS_RING}`}
              >
                <XIcon className='h-3 w-3' />
              </button>
            </span>
          ) : (
            <button
              ref={removeRef}
              type='button'
              onClick={() => setConfirmingRemove(true)}
              aria-label={`Remove ${name}`}
              className={`-my-2 py-2 text-xs text-muted underline decoration-line underline-offset-3 transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none ${FOCUS_RING}`}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

// Owns the per-second clock subscription on its own so the tick re-renders
// this one chip instead of the entire drawer. The drawer is mounted on every
// page whether open or not, so subscribing at the top would have re-rendered
// its whole subtree once a second for the life of every reservation.
//
// Hidden on short viewports: the countdown is a nicety, and its ~60px is the
// difference between the checkout button being on screen and off it in
// landscape.
//
// Deliberately not a live region — it ticks every second, and wrapping it in
// one would re-announce the whole sentence each time. The dialog points
// aria-describedby here instead, so it's spoken once on entry.
const CartHoldNote = () => {
  const { secondsLeft } = useCartExpiryClock();

  return (
    <p
      id='cart-hold-note'
      className='mt-4 flex items-start gap-2.5 rounded-sm border border-line-soft bg-cream-deep px-3 py-2.5 text-xs leading-relaxed text-ink-soft short:hidden'
    >
      <span
        aria-hidden='true'
        className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green'
      />
      {/* One inline child, not sibling text nodes: raw text beside the dot
          became its own flex item and fragmented the sentence into
          side-by-side wrapped columns on phones. */}
      <span className='min-w-0'>
        {secondsLeft === null ? (
          <>
            We&rsquo;ll keep your cart for up to {CART_TTL_MINUTES} minutes
            while you decide.
          </>
        ) : (
          <>
            Cart&rsquo;s good for{' '}
            <span className='font-mono font-medium tabular-nums text-ink'>
              {formatSecondsClock(secondsLeft)}
            </span>{' '}
            — after that it clears.
          </>
        )}
      </span>
    </p>
  );
};

const CartDrawer = ({ isOpen, onClose }: Props) => {
  const { cartItems, loading, loadError, retryLoadCart } = useCartContext();
  const { data: session } = useSession();
  const settings = useShopSettings();
  const isLoggedIn = Boolean(session?.user);
  const mounted = useIsMounted();
  const asideRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);


  const lines = useMemo(
    () => cartItems.filter((line) => line.product != null),
    [cartItems],
  );
  const count = lines.length;

  const totals = useMemo(
    () => computeTotals(lines, { isLoggedIn }),
    [lines, isLoggedIn],
  );

  // Points land when the order is fulfilled, not at checkout, and the weekend
  // multiplier keys off the award date — which may not be today. Estimating at
  // multiplier 1 makes this a floor the shop can always honour: a weekend
  // pickup can only beat it, so the number never overpromises.
  const pointsEstimate = isLoggedIn
    ? computeAward(totals.subtotal, { ...settings, weekendMultiplier: 1 })
    : 0;
  const anyEstimated = lines.some((line) => line.product.isEstimatedPrice);

  // Mutations are otherwise entirely silent: removal is deliberately toast-free
  // (the row vanishing is the sighted feedback) and quantity edits only move
  // numbers. Routine quantity changes are left unannounced on purpose — a
  // message per keypress would queue up faster than it could be read.
  const [announcement, setAnnouncement] = useState('');

  const handleLineRemoved = useCallback(
    (name: string) => {
      setAnnouncement(
        count === 1
          ? `${name} removed. Your cart is empty.`
          : `${name} removed.`,
      );
      // The row under focus is about to unmount; the close button is the one
      // control guaranteed to survive every cart state.
      closeBtnRef.current?.focus();
    },
    [count],
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
        // Speaks the reservation window once on entry rather than on every
        // tick. Omitted when the hold line isn't rendered.
        aria-describedby={count > 0 ? 'cart-hold-note' : undefined}
        aria-modal={isOpen || undefined}
        inert={!isOpen}
        className={`fixed inset-y-0 right-0 z-101 flex w-full max-w-121 flex-col bg-cream shadow-[-20px_0_60px_rgba(28,24,20,0.15)] transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Inside the dialog so it isn't filtered out while the modal holds
            focus — the sonner toaster sits outside and is unreliable here. */}
        <p role='status' aria-live='polite' className='sr-only'>
          {announcement}
        </p>

        <header className='shrink-0 border-b border-line-soft px-7 pt-6 pb-5 short:pt-4 short:pb-3'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h2 className='font-display text-[28px] font-medium leading-none tracking-tight short:text-[22px]'>
                Your cart
              </h2>
              {/* Only with contents: an "Empty" line directly above the empty
                  state's own heading said it twice, and it would have claimed
                  emptiness while the cart was still loading or had failed. */}
              {count > 0 && (
                <p className='mt-2 text-[13px] text-muted short:mt-1'>
                  {formatCartCount(lines)}
                </p>
              )}
            </div>
            <button
              ref={closeBtnRef}
              type='button'
              onClick={onClose}
              aria-label='Close cart'
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-paper text-ink transition-colors duration-300 hover:border-ink hover:bg-cream-deep motion-reduce:transition-none ${FOCUS_RING}`}
            >
              <XIcon className='h-3.5 w-3.5' />
            </button>
          </div>

          {count > 0 && <CartHoldNote />}
        </header>

        {count === 0 && loading ? (
          <div className='flex-1 px-7 pt-4' aria-busy='true'>
            <span className='sr-only'>Loading your cart</span>
            {[0, 1].map((row) => (
              <div
                key={row}
                aria-hidden='true'
                className='flex animate-pulse gap-4 border-b border-line-soft py-5'
              >
                <div className='h-24 w-20 shrink-0 rounded-sm bg-cream-deep' />
                <div className='flex-1 space-y-2.5 pt-1'>
                  <div className='h-4 w-3/4 rounded-sm bg-cream-deep' />
                  <div className='h-3 w-1/2 rounded-sm bg-cream-deep' />
                  <div className='h-9 w-28 rounded-full bg-cream-deep' />
                </div>
              </div>
            ))}
          </div>
        ) : count === 0 && loadError ? (
          // Never the empty state on a failed load — that told customers with
          // items waiting on the server that their cart was empty.
          <div className='flex flex-1 flex-col items-center justify-center px-10 text-center'>
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
        ) : count === 0 ? (
          <div className='flex flex-1 flex-col items-center justify-center px-10 text-center'>
            <div className='mb-5 grid h-14 w-14 place-items-center rounded-full bg-cream-deep text-ink-soft'>
              <CartIcon className='h-6 w-6' />
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
              className={`inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium tracking-[0.04em] text-cream transition-colors duration-300 hover:bg-oxblood motion-reduce:transition-none ${FOCUS_RING}`}
            >
              Shop the counter
            </Link>
          </div>
        ) : (
          <div className='flex-1 overflow-y-auto overscroll-contain px-7 pt-2 pb-6'>
            {lines.map((line) => (
              <DrawerLine
                key={line.product._id}
                line={line}
                isOpen={isOpen}
                onAnnounce={setAnnouncement}
                onRemoved={handleLineRemoved}
              />
            ))}

            {pointsEstimate > 0 && (
              <div className='mt-5 flex items-center gap-3.5 rounded-sm border border-line-soft bg-cream-deep px-4 py-3.5'>
                <span className='shrink-0 font-display text-[22px] leading-none font-medium text-oxblood'>
                  {pointsEstimate}
                </span>
                <p className='text-xs leading-relaxed text-ink-soft'>
                  points when you pick this order up.
                </p>
              </div>
            )}
          </div>
        )}

        {count > 0 && (
          <footer className='shrink-0 border-t border-line-soft bg-paper px-7 py-6 pb-[calc(--spacing(6)+env(safe-area-inset-bottom))] short:py-4 short:pb-[calc(--spacing(4)+env(safe-area-inset-bottom))]'>
            {/* The per-line breakdown is the first thing to go when height is
                scarce — phones and short viewports get the total alone, with
                the full math one tap away on the cart page. Showing a partial
                breakdown would be worse than none: subtotal and tax without
                the discount row is exactly the arithmetic that didn't
                reconcile before this feature. */}
            <dl>
              <div className='flex items-baseline justify-between py-1 text-[13px] text-ink-soft max-sm:hidden short:hidden'>
                <dt>Subtotal</dt>
                <dd className='font-mono text-xs'>
                  ${fmtPrice(totals.subtotal)}
                </dd>
              </div>
              <div className='flex items-baseline justify-between py-1 text-[13px] text-ink-soft max-sm:hidden short:hidden'>
                <dt>Pickup</dt>
                <dd className='font-mono text-xs'>Free</dd>
              </div>
              {isLoggedIn && (
                <div className='flex items-baseline justify-between py-1 text-[13px] text-ink-soft max-sm:hidden short:hidden'>
                  <dt>Member discount ({MEMBER_DISCOUNT_RATE * 100}%)</dt>
                  <dd className='font-mono text-xs text-green'>
                    −${fmtPrice(totals.memberDiscount)}
                  </dd>
                </div>
              )}
              <div className='flex items-baseline justify-between py-1 text-[13px] text-ink-soft max-sm:hidden short:hidden'>
                <dt>Estimated tax</dt>
                <dd className='font-mono text-xs'>${fmtPrice(totals.tax)}</dd>
              </div>
              {/* Loses its rule and top spacing wherever the rows above it are
                  hidden, so it doesn't double up on the footer's own border. */}
              <div className='mt-2 flex items-baseline justify-between border-t border-line pt-3 max-sm:mt-0 max-sm:border-0 max-sm:pt-0 short:mt-0 short:border-0 short:pt-0'>
                <dt className='font-display text-base font-medium text-ink'>
                  {anyEstimated ? 'Estimated total' : 'Total'}
                </dt>
                <dd className='font-display text-[22px] font-medium tracking-tight text-ink'>
                  ${fmtPrice(totals.total)}
                </dd>
              </div>
            </dl>

            {anyEstimated && (
              <p className='mt-2 text-[11px] leading-relaxed text-muted'>
                Some cuts are priced by weight — the final price may vary
                slightly once they&rsquo;re weighed.
              </p>
            )}

            <Link
              href='/checkout'
              onClick={onClose}
              className={`mt-4 flex items-center justify-center gap-2.5 rounded-sm bg-ink px-4 py-4 text-sm font-medium tracking-[0.02em] text-cream transition-colors duration-300 hover:bg-oxblood motion-reduce:transition-none ${FOCUS_RING}`}
            >
              Continue to checkout
              <ArrowIcon className='h-3 w-3' />
            </Link>

            <div className='mt-3.5 flex items-center justify-center gap-4 short:hidden'>
              <Link
                href='/cart'
                onClick={onClose}
                className={`-my-2 py-2 text-xs text-muted underline decoration-line underline-offset-3 transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none ${FOCUS_RING}`}
              >
                View full cart
              </Link>
              <span aria-hidden='true' className='h-3 w-px bg-line' />
              <button
                type='button'
                onClick={onClose}
                className={`-my-2 py-2 text-xs text-muted underline decoration-line underline-offset-3 transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none ${FOCUS_RING}`}
              >
                Keep shopping
              </button>
            </div>

            <p className='mt-3.5 text-center font-mono text-[11px] tracking-[0.04em] text-muted short:hidden'>
              Ready in {formatReadyIn(settings.leadTime)} at the counter
            </p>
          </footer>
        )}
      </aside>
    </>,
    document.body,
  );
};

export default CartDrawer;
