'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useCartContext, type CartLine } from '@/context/CartContext';
import { productImageSrc } from '@/lib/format';
import { fmtPrice } from '@/lib/pricing';
import { MAX_PER_LINE } from '@/lib/shop-settings/config';

import CheckIcon from '@/components/uielements/CheckIcon';
import MinusIcon from '@/components/uielements/MinusIcon';
import PlusIcon from '@/components/uielements/PlusIcon';
import XIcon from '@/components/uielements/XIcon';

type Props = {
  line: CartLine;
};

const CartItemRow = ({ line }: Props) => {
  const router = useRouter();
  const { setItemQuantity, removeItemFromCart } = useCartContext();
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);

  // Mirror state for the typeable input — users can clear it temporarily
  // while editing, so we only commit on blur and enforce ≥1.
  const [qtyInput, setQtyInput] = useState(line.quantity.toString());
  const [savingForLater, setSavingForLater] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const productId = line.product._id;
  const lineTotal = fmtPrice(line.price * line.quantity);

  const decrement = () => void setItemQuantity(productId, line.quantity - 1);
  const increment = () => {
    if (line.quantity >= MAX_PER_LINE) {
      toast.error(`Limit ${MAX_PER_LINE} per item`);
      return;
    }
    void setItemQuantity(productId, line.quantity + 1);
  };

  const commitInput = () => {
    const parsed = Math.trunc(Number(qtyInput));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // Reject empty / 0 / negative — restore current quantity.
      setQtyInput(line.quantity.toString());
      return;
    }
    const clamped = Math.min(parsed, MAX_PER_LINE);
    if (clamped !== parsed) {
      toast.error(`Limit ${MAX_PER_LINE} per item`);
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
      await removeItemFromCart(productId);
      toast.success('Saved for later');
    } catch (error) {
      console.error('Save for later failed:', error);
      toast.error('Could not save item');
    } finally {
      setSavingForLater(false);
    }
  };

  return (
    <article className='grid grid-cols-[80px_1fr] items-start gap-4 border-b border-line-soft px-6 py-5 transition-colors duration-300 last:border-0 hover:bg-camel/4 sm:grid-cols-[96px_1fr_auto] sm:gap-6 sm:px-8 sm:py-6'>
      <div className='relative aspect-4/5 h-30 w-20 overflow-hidden rounded-sm bg-cream-deep sm:h-30 sm:w-24'>
        <Image
          src={productImageSrc(line.product.images?.[0]) ?? ''}
          alt=''
          fill
          sizes='96px'
          className='object-cover'
        />
      </div>

      <div className='min-w-0'>
        {line.product.category && (
          <div className='mb-1.5 flex flex-wrap items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-muted'>
            <span>{line.product.category}</span>
          </div>
        )}

        <h3 className='mb-1 font-display text-[20px] font-medium leading-tight tracking-tight sm:text-[22px]'>
          {line.product.name}
        </h3>

        <p className='text-[13px] text-ink-soft'>Hand-cut to order</p>

        {line.product.displayWeightLabel && (
          <p className='mt-1 text-[12px] text-muted'>
            {line.product.displayWeightLabel}
          </p>
        )}

        <div className='mt-3.5 flex flex-wrap items-center gap-3 sm:gap-4'>
          <div className='inline-flex items-center overflow-hidden rounded-full border border-line bg-cream'>
            <button
              type='button'
              onClick={decrement}
              disabled={line.quantity <= 1}
              aria-label='Decrease quantity'
              className='grid h-8 w-8 place-items-center transition-colors duration-300 hover:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none'
            >
              <MinusIcon className='h-2.5 w-2.5' />
            </button>
            <input
              type='number'
              min={1}
              max={MAX_PER_LINE}
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={commitInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              aria-label='Quantity'
              className='w-9 appearance-none border-0 bg-transparent text-center font-display text-sm font-medium text-ink outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none'
            />
            <button
              type='button'
              onClick={increment}
              disabled={line.quantity >= MAX_PER_LINE}
              aria-label='Increase quantity'
              className='grid h-8 w-8 place-items-center transition-colors duration-300 hover:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none'
            >
              <PlusIcon className='h-2.5 w-2.5' />
            </button>
          </div>

          <button
            type='button'
            onClick={() => void handleSaveForLater()}
            disabled={savingForLater}
            className='border-b border-line pb-px text-[13px] text-ink-soft transition-colors duration-300 hover:border-current hover:text-oxblood disabled:opacity-50 motion-reduce:transition-none'
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
                aria-label='Confirm remove'
                className='grid h-6 w-6 place-items-center rounded-full bg-oxblood text-cream transition-colors duration-300 hover:bg-ink motion-reduce:transition-none'
              >
                <CheckIcon className='h-3 w-3' />
              </button>
              <button
                type='button'
                onClick={cancelRemoveConfirm}
                aria-label='Cancel'
                className='grid h-6 w-6 place-items-center rounded-full border border-line text-ink-soft transition-colors duration-300 hover:border-ink hover:text-ink motion-reduce:transition-none'
              >
                <XIcon className='h-3 w-3' />
              </button>
            </span>
          ) : (
            <button
              type='button'
              onClick={startRemoveConfirm}
              className='border-b border-line pb-px text-[13px] text-ink-soft transition-colors duration-300 hover:border-current hover:text-oxblood motion-reduce:transition-none'
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className='col-span-2 flex items-baseline justify-between gap-3 sm:col-span-1 sm:block sm:min-w-30 sm:text-right'>
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
