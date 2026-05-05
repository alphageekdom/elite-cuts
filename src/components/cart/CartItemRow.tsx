'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useCartContext, type CartLine } from '@/context/CartContext';

const MinusIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2.5}
    aria-hidden='true'
    className='h-2.5 w-2.5'
  >
    <line x1='5' y1='12' x2='19' y2='12' />
  </svg>
);

const PlusIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2.5}
    aria-hidden='true'
    className='h-2.5 w-2.5'
  >
    <line x1='12' y1='5' x2='12' y2='19' />
    <line x1='5' y1='12' x2='19' y2='12' />
  </svg>
);

type Props = {
  line: CartLine;
};

const CartItemRow = ({ line }: Props) => {
  const { setItemQuantity, removeItemFromCart } = useCartContext();
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);

  // Mirror state for the typeable input — users can clear it temporarily
  // while editing, so we only commit on blur and enforce ≥1.
  const [qtyInput, setQtyInput] = useState(line.quantity.toString());
  const [savingForLater, setSavingForLater] = useState(false);

  const productId = line.product._id;
  const lineTotal = (line.price * line.quantity).toFixed(2);

  const decrement = () => void setItemQuantity(productId, line.quantity - 1);
  const increment = () => void setItemQuantity(productId, line.quantity + 1);

  const commitInput = () => {
    const parsed = Math.trunc(Number(qtyInput));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // Reject empty / 0 / negative — restore current quantity.
      setQtyInput(line.quantity.toString());
      return;
    }
    if (parsed !== line.quantity) {
      void setItemQuantity(productId, parsed);
    }
    setQtyInput(parsed.toString());
  };

  const handleRemove = () => {
    const ok = window.confirm('Remove this item from your cart?');
    if (!ok) return;
    void removeItemFromCart(productId);
  };

  const handleSaveForLater = async () => {
    if (!isLoggedIn) {
      toast.info('Sign in to save items for later');
      return;
    }
    if (savingForLater) return;
    setSavingForLater(true);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error('bookmark failed');
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
          src={`/images/products/${line.product.images?.[0] ?? ''}`}
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

        <p className='mb-3.5 text-[13px] text-ink-soft'>Hand-cut to order</p>

        <div className='flex flex-wrap items-center gap-3 sm:gap-4'>
          <div className='inline-flex items-center overflow-hidden rounded-full border border-line bg-cream'>
            <button
              type='button'
              onClick={decrement}
              disabled={line.quantity <= 1}
              aria-label='Decrease quantity'
              className='grid h-8 w-8 place-items-center transition-colors duration-300 hover:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none'
            >
              <MinusIcon />
            </button>
            <input
              type='number'
              min={1}
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={commitInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              aria-label='Quantity'
              className='w-9 appearance-none border-0 bg-transparent text-center font-display text-sm font-medium text-ink outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none'
            />
            <span className='pr-3 text-[12px] text-muted'>lb</span>
            <button
              type='button'
              onClick={increment}
              aria-label='Increase quantity'
              className='grid h-8 w-8 place-items-center transition-colors duration-300 hover:bg-cream-deep motion-reduce:transition-none'
            >
              <PlusIcon />
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

          <button
            type='button'
            onClick={handleRemove}
            className='border-b border-line pb-px text-[13px] text-ink-soft transition-colors duration-300 hover:border-current hover:text-oxblood motion-reduce:transition-none'
          >
            Remove
          </button>
        </div>
      </div>

      <div className='col-span-2 flex items-baseline gap-3 sm:col-span-1 sm:block sm:min-w-30 sm:text-right'>
        <div className='text-[12px] text-muted'>${line.price.toFixed(2)} / lb</div>
        <div className='font-display text-xl font-medium tracking-tight sm:mt-1.5 sm:text-2xl'>
          ${lineTotal}
        </div>
      </div>
    </article>
  );
};

export default CartItemRow;
