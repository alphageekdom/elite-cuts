'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useCartContext, type CartLine } from '@/context/CartContext';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';
import { productImageSrc } from '@/lib/format';
import { fmtPrice } from '@/lib/pricing';
import { LOW_STOCK_THRESHOLD, MAX_PER_LINE } from '@/lib/shop-settings/config';
import { FOCUS_RING } from '@/lib/styles';

import CheckIcon from '@/components/ui/icons/CheckIcon';
import MinusIcon from '@/components/ui/icons/MinusIcon';
import PlusIcon from '@/components/ui/icons/PlusIcon';
import XIcon from '@/components/ui/icons/XIcon';

type Props = {
  line: CartLine;
  // Fired the moment the line is dropped. Removal is optimistic, so the row
  // unmounts in the same commit and takes the focused button with it — the
  // panel has to move focus somewhere that outlives the row.
  onRemoved: () => void;
};

const CartItemRow = ({ line, onRemoved }: Props) => {
  const router = useRouter();
  const { setItemQuantity, removeItemFromCart } = useCartContext();
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);

  // Mirror state for the typeable input — users can clear it temporarily
  // while editing, so we only commit on blur and enforce ≥1.
  const [qtyInput, setQtyInput] = useState(line.quantity.toString());
  const [savingForLater, setSavingForLater] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const contentsId = useId();

  const minusRef = useRef<HTMLButtonElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const wasConfirmingRef = useRef(false);

  // The mirror only ever tracked its own edits, so a quantity changed from
  // anywhere else left it showing a stale number beside a line total that had
  // already moved — two presses of + on a line of 2 rendered "2" next to
  // $131.96. Adjust-during-render rather than an effect, per the project's
  // React 19 prop-sync pattern.
  const [lastQuantity, setLastQuantity] = useState(line.quantity);
  if (lastQuantity !== line.quantity) {
    setLastQuantity(line.quantity);
    setQtyInput(line.quantity.toString());
  }

  // Same dismissal stack the drawer's confirm uses, so Escape reaches the
  // innermost open thing rather than whichever listener registered first.
  useDismissOnEscape(confirmingRemove, () => setConfirmingRemove(false));

  // Focus follows the confirm swap in both directions — the button under focus
  // unmounts on each transition, which otherwise drops focus to <body>. Cancel
  // gets it rather than the confirm, so a stray Enter can't drop the line. The
  // confirm path never reaches the restore branch: the row is already gone by
  // the time effects run, so the panel handles that side.
  useEffect(() => {
    if (confirmingRemove) cancelRef.current?.focus();
    else if (wasConfirmingRef.current) removeRef.current?.focus();
    wasConfirmingRef.current = confirmingRemove;
  }, [confirmingRemove]);

  const productId = line.product._id;
  const lineTotal = fmtPrice(line.price * line.quantity);
  const contents = line.product.includedItems ?? [];
  const hasContents = contents.length > 0;

  // Stock is the tighter of the two ceilings. It's optional on the line —
  // guest carts persisted before the field existed don't carry it — so a
  // missing value means "unknown" and falls back to the per-line cap.
  const maxForLine = Math.min(
    line.product.stockCount ?? MAX_PER_LINE,
    MAX_PER_LINE,
  );
  const atCap = line.quantity >= maxForLine;
  const capMessage =
    maxForLine < MAX_PER_LINE
      ? `Only ${maxForLine} in stock`
      : `Limit ${MAX_PER_LINE} per item`;

  // The stock line shows at the catalog card's own threshold, so the cart
  // never hides a number the customer already saw on the card and the detail
  // page — plus at any stock-imposed cap, where it explains the dead + button
  // for stock between the threshold and the per-line cap. Unknown stock
  // (legacy guest lines) shows nothing.
  const stockLow =
    (line.product.stockCount ?? Infinity) <= LOW_STOCK_THRESHOLD;
  const showStockLine = stockLow || (atCap && maxForLine < MAX_PER_LINE);

  // Which stepper was last pressed, so focus can be handed on once the new
  // quantity has actually rendered. Doing it inside the click handler doesn't
  // work: the button is still enabled at that instant, and once it disables it
  // silently refuses focus, dropping the caret to <body>.
  const pendingStepperRef = useRef<'minus' | 'plus' | null>(null);

  useEffect(() => {
    const pressed = pendingStepperRef.current;
    if (!pressed) return;
    pendingStepperRef.current = null;

    const minusDisabled = line.quantity <= 1;
    // The pressed button is still enabled, so it kept focus on its own.
    if (pressed === 'minus' && !minusDisabled) return;
    if (pressed === 'plus' && !atCap) return;

    if (pressed === 'minus' && !atCap) plusRef.current?.focus();
    else if (pressed === 'plus' && !minusDisabled) minusRef.current?.focus();
    // Both ends disabled (a line of 2 against a stock of 1): no sibling to
    // hand off to, so fall back to the row's own action.
    else removeRef.current?.focus();
  }, [line.quantity, atCap]);

  const decrement = () => {
    pendingStepperRef.current = 'minus';
    void setItemQuantity(productId, line.quantity - 1);
  };
  const increment = () => {
    if (atCap) {
      toast.error(capMessage);
      return;
    }
    pendingStepperRef.current = 'plus';
    void setItemQuantity(productId, line.quantity + 1);
  };

  const commitInput = () => {
    const parsed = Math.trunc(Number(qtyInput));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // Reject empty / 0 / negative — restore current quantity.
      setQtyInput(line.quantity.toString());
      return;
    }
    const clamped = Math.min(parsed, maxForLine);
    if (clamped !== parsed) {
      toast.error(capMessage);
    }
    if (clamped !== line.quantity) {
      void setItemQuantity(productId, clamped);
    }
    setQtyInput(clamped.toString());
  };

  const startRemoveConfirm = () => setConfirmingRemove(true);
  const cancelRemoveConfirm = () => setConfirmingRemove(false);
  const confirmRemove = () => {
    setConfirmingRemove(false);
    onRemoved();
    void removeItemFromCart(productId, { silent: true });
  };

  const handleSaveForLater = async () => {
    if (!isLoggedIn) {
      // Guest path: just route to sign-in and bring them back to the cart with
      // their merged items intact. No auto-save — the user clicks Save for
      // later again from a real cart row if they actually want to save something.
      router.push(`/login?callbackUrl=${encodeURIComponent('/cart')}`);
      return;
    }
    if (savingForLater) return;
    setSavingForLater(true);
    try {
      const res = await fetch('/api/saved-cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error('save for later failed');
      // This drops the line too, so it takes the same hand-off as Remove —
      // without it the button under focus unmounts and focus lands on <body>.
      // Armed only after the save succeeds: on a failure the row stays put and
      // the button keeps focus on its own.
      onRemoved();
      await removeItemFromCart(productId);
      toast.success('Saved for later');
    } catch (error) {
      console.error('Save for later failed:', error);
      toast.error('Could not save item');
    } finally {
      setSavingForLater(false);
    }
  };

  // Below sm the contents grid, the steppers and the price each get their own
  // full-width row rather than sharing the ~110px column beside the photo — at
  // 320px that column left the bundle's cut list 79px wide and wrapped every
  // line three ways. From sm the photo spans all three rows, which puts those
  // blocks back in the text column tight under the name.
  return (
    <article className='grid grid-cols-[80px_1fr] items-start gap-x-4 gap-y-0 border-b border-line-soft px-6 py-5 transition-colors duration-300 last:border-0 hover:bg-camel/4 sm:grid-cols-[96px_1fr_auto] sm:gap-x-6 sm:px-8 sm:py-6'>
      <div className='relative aspect-4/5 h-30 w-20 overflow-hidden rounded-sm bg-cream-deep sm:col-start-1 sm:row-span-3 sm:row-start-1 sm:h-30 sm:w-24'>
        <Image
          src={productImageSrc(line.product.images?.[0]) ?? ''}
          alt=''
          fill
          sizes='96px'
          className='object-cover'
        />
      </div>

      <div className='min-w-0 sm:col-start-2 sm:row-start-1'>
        {line.product.category && (
          <div className='mb-1.5 flex flex-wrap items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-muted'>
            <span>{line.product.category}</span>
          </div>
        )}

        <h3 className='mb-1 font-display text-[20px] font-medium leading-tight tracking-tight sm:text-[22px]'>
          {line.product.name}
        </h3>

        {/* Bundles get a cut count rather than a weight: there is no bundle
            total-weight field, and deriving one means parsing free text. */}
        <p className='flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-soft'>
          <span>
            {hasContents ? `${contents.length} cuts` : 'Hand-cut to order'}
          </span>
          {!hasContents && line.product.displayWeightLabel && (
            <>
              <span aria-hidden='true' className='text-line'>
                ·
              </span>
              <span className='text-muted'>
                {line.product.displayWeightLabel}
              </span>
            </>
          )}
          {showStockLine && (
            <>
              <span aria-hidden='true' className='text-line'>
                ·
              </span>
              {/* Stock can hit 0 after the add, and "Only 0 left" is not a
                  sentence — the catalog card says "Sold out" for the same
                  state. */}
              <span className='text-oxblood'>
                {maxForLine > 0 ? `Only ${maxForLine} left` : 'Sold out'}
              </span>
            </>
          )}
        </p>
      </div>

      {hasContents && (
        <div className='col-span-2 mt-3 rounded-sm bg-cream-deep px-4 py-3 sm:col-span-1 sm:col-start-2 sm:row-start-2'>
          <h4
            id={contentsId}
            className='mb-2 text-[11px] tracking-[0.14em] uppercase text-ink-soft'
          >
            In the box
          </h4>
          <ul
            aria-labelledby={contentsId}
            className='grid gap-x-6 gap-y-1.5 sm:grid-cols-2'
          >
            {contents.map((item) => (
              <li
                key={item}
                className='flex items-baseline gap-2 text-[13px] text-ink-soft'
              >
                <span aria-hidden='true' className='shrink-0 text-camel-deep'>
                  ·
                </span>
                <span className='min-w-0'>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className='col-span-2 mt-3.5 flex flex-wrap items-center gap-3 sm:col-span-1 sm:col-start-2 sm:row-start-3 sm:gap-4'>
        <div className='inline-flex h-10 items-center overflow-hidden rounded-full border border-line bg-cream'>
          <button
            ref={minusRef}
            type='button'
            onClick={decrement}
            disabled={line.quantity <= 1}
            aria-label={`Decrease ${line.product.name} quantity`}
            className={`grid h-full w-10 place-items-center transition-colors duration-300 hover:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none ${FOCUS_RING}`}
          >
            <MinusIcon className='h-2.5 w-2.5' />
          </button>
          <input
            type='number'
            min={1}
            max={maxForLine}
            value={qtyInput}
            onChange={(e) => setQtyInput(e.target.value)}
            onBlur={commitInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            aria-label={`${line.product.name} quantity`}
            className='w-9 appearance-none border-0 bg-transparent text-center font-display text-sm font-medium text-ink outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none'
          />
          <button
            ref={plusRef}
            type='button'
            onClick={increment}
            disabled={atCap}
            aria-label={`Increase ${line.product.name} quantity`}
            className={`grid h-full w-10 place-items-center transition-colors duration-300 hover:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none ${FOCUS_RING}`}
          >
            <PlusIcon className='h-2.5 w-2.5' />
          </button>
        </div>

        <button
          type='button'
          onClick={() => void handleSaveForLater()}
          disabled={savingForLater}
          className={`-my-1 rounded-sm py-1 text-[13px] text-ink-soft underline decoration-line underline-offset-3 transition-colors duration-300 hover:decoration-current hover:text-oxblood disabled:opacity-50 motion-reduce:transition-none ${FOCUS_RING}`}
        >
          {savingForLater ? 'Saving…' : 'Save for later'}
        </button>

        {confirmingRemove ? (
          <span
            role='group'
            aria-label='Confirm remove'
            className='inline-flex items-center gap-2 text-[13px]'
          >
            <span className='text-muted'>Remove?</span>
            <button
              type='button'
              onClick={confirmRemove}
              aria-label={`Confirm remove ${line.product.name}`}
              className={`grid h-8 w-8 place-items-center rounded-full bg-oxblood text-cream transition-colors duration-300 hover:bg-ink motion-reduce:transition-none ${FOCUS_RING}`}
            >
              <CheckIcon className='h-3 w-3' />
            </button>
            <button
              ref={cancelRef}
              type='button'
              onClick={cancelRemoveConfirm}
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
            onClick={startRemoveConfirm}
            aria-label={`Remove ${line.product.name}`}
            className={`-my-1 rounded-sm py-1 text-[13px] text-ink-soft underline decoration-line underline-offset-3 transition-colors duration-300 hover:decoration-current hover:text-oxblood motion-reduce:transition-none ${FOCUS_RING}`}
          >
            Remove
          </button>
        )}
      </div>

      <div className='col-span-2 mt-4 flex items-baseline justify-between gap-3 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:block sm:min-w-30 sm:text-right'>
        <div className='text-[12px] text-muted'>
          {line.product.displayPriceLabel ?? `$${fmtPrice(line.price)}/lb`}
        </div>
        <div className='font-display text-xl font-medium tracking-tight sm:mt-1.5 sm:text-2xl'>
          ${lineTotal}
        </div>
      </div>
    </article>
  );
};

export default CartItemRow;
