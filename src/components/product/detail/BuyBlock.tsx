'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import useHandleAddToCart from '@/hooks/useHandleAddToCart';
import useHandleBookmark from '@/hooks/useHandleBookmark';
import { formatMoney } from '@/lib/format';
import { unitPrice } from '@/lib/products/pricing';
import { MAX_PER_LINE } from '@/lib/shop-settings/config';
import type { SerializedProduct } from '@/models/Product';
import CartIcon from '@/components/ui/icons/CartIcon';
import HeartIcon from '@/components/ui/icons/HeartIcon';

type Props = {
  product: Pick<
    SerializedProduct,
    | '_id'
    | 'price'
    | 'stockCount'
    | 'name'
    | 'images'
    | 'category'
    | 'pricingType'
    | 'displayPriceLabel'
    | 'displayWeightLabel'
    | 'isEstimatedPrice'
    | 'packagePrice'
    | 'packageWeightLb'
    | 'pricePerLb'
    | 'estimatedWeightLb'
    | 'averageWeightLb'
    | 'minWeightLb'
    | 'maxWeightLb'
    | 'unitPrice'
    | 'bundlePrice'
    | 'includedItems'
  >;
};

const ShareIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden
    className='h-3.5 w-3.5'
  >
    <circle cx='18' cy='5' r='3' />
    <circle cx='6' cy='12' r='3' />
    <circle cx='18' cy='19' r='3' />
    <line x1='8.59' y1='13.51' x2='15.42' y2='17.49' />
    <line x1='15.41' y1='6.51' x2='8.59' y2='10.49' />
  </svg>
);

export default function BuyBlock({ product }: Props) {
  const { data: session } = useSession();
  const userId = session?.user?.userId;
  const outOfStock = product.stockCount <= 0;
  const [qty, setQty] = useState(1);

  // Per-unit estimate × qty — handles per-lb / whole-item cuts correctly
  // (line estimate = pricePerLb × estimatedWeightLb × qty). Falls back to
  // `qty * product.price` for any pre-Phase-1 product without pricingType.
  const total = formatMoney(qty * unitPrice(product, product.price));

  const {
    isBookmarked,
    loading: bookmarkLoading,
    handleBookmarkClick,
    checkBookmarkStatus,
  } = useHandleBookmark(userId, product._id);

  const cartProduct = { ...product, quantity: qty };
  const { isAddingToCart, handleAddToCart } = useHandleAddToCart(cartProduct);

  useEffect(() => {
    void checkBookmarkStatus();
  }, [checkBookmarkStatus]);

  const qtyMax = Math.min(product.stockCount, MAX_PER_LINE);
  const decrement = () => setQty((v) => Math.max(1, v - 1));
  const increment = () => setQty((v) => Math.min(qtyMax, v + 1));

  const onAddClick = () => {
    if (outOfStock || isAddingToCart) return;
    void handleAddToCart();
  };

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // share cancelled or clipboard failed — no-op
    }
  };

  return (
    <div className='rounded-sm border border-line-soft bg-paper p-6 md:p-7'>
      {/* Price + stock */}
      <div className='mb-6 flex items-baseline justify-between gap-4 border-b border-line-soft pb-6'>
        <div>
          <div className='font-display text-[40px] font-medium leading-none tracking-[-0.02em]'>
            {product.displayPriceLabel ? (
              product.displayPriceLabel
            ) : (
              <>
                {formatMoney(product.price)}
                <em className='ml-1.5 text-base font-normal not-italic text-muted'>
                  /lb
                </em>
              </>
            )}
          </div>
          {product.displayWeightLabel && (
            <div className='mt-1 text-[13px] text-muted'>
              {product.displayWeightLabel}
            </div>
          )}
        </div>

        {outOfStock ? (
          <span className='inline-flex items-center gap-1.5 rounded-full bg-line-soft px-2.5 py-1 font-mono text-[11px] tracking-[0.04em] text-muted'>
            <span className='h-1.5 w-1.5 rounded-full bg-muted' aria-hidden />
            Out of stock
          </span>
        ) : (
          <span className='inline-flex items-center gap-1.5 rounded-full bg-green/10 px-2.5 py-1 font-mono text-[11px] tracking-[0.04em] text-green'>
            <span className='h-1.5 w-1.5 rounded-full bg-green' aria-hidden />
            {product.stockCount} in stock
          </span>
        )}
      </div>

      {/* Qty selector + add to cart */}
      <div className='mb-4 flex gap-3'>
        <div className='flex shrink-0 items-center overflow-hidden rounded-full border border-line bg-cream'>
          <button
            type='button'
            onClick={decrement}
            disabled={qty <= 1}
            aria-label='Decrease quantity'
            className='grid h-11 w-11 place-items-center transition-colors duration-300 hover:bg-cream-deep disabled:opacity-40 motion-reduce:transition-none'
          >
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden className='h-3 w-3'>
              <line x1='5' y1='12' x2='19' y2='12' />
            </svg>
          </button>
          <span className='w-10 text-center font-display text-base font-medium'>
            {qty}
          </span>
          <button
            type='button'
            onClick={increment}
            disabled={qty >= qtyMax}
            aria-label='Increase quantity'
            className='grid h-11 w-11 place-items-center transition-colors duration-300 hover:bg-cream-deep disabled:opacity-40 motion-reduce:transition-none'
          >
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden className='h-3 w-3'>
              <line x1='12' y1='5' x2='12' y2='19' />
              <line x1='5' y1='12' x2='19' y2='12' />
            </svg>
          </button>
        </div>

        <button
          type='button'
          onClick={onAddClick}
          disabled={outOfStock || isAddingToCart}
          className='flex flex-1 items-center justify-center gap-2.5 rounded-full bg-ink px-5 py-3.5 text-[14px] font-medium tracking-[0.04em] text-cream transition-[background-color,transform] duration-300 hover:-translate-y-px hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0'
        >
          <CartIcon className='h-3.5 w-3.5' />
          {isAddingToCart
            ? 'Adding…'
            : outOfStock
              ? 'Sold out'
              : `Add · ${total}`}
        </button>
      </div>

      {/* Save + Share */}
      <div className='flex gap-2'>
        <button
          type='button'
          onClick={(e) => void handleBookmarkClick(e)}
          disabled={bookmarkLoading}
          aria-label={isBookmarked ? 'Remove from saved' : 'Save'}
          aria-pressed={isBookmarked}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-3 text-[13px] font-medium transition-[border-color,color,background-color] duration-300 motion-reduce:transition-none ${
            isBookmarked
              ? 'border-oxblood text-oxblood'
              : 'border-line text-ink-soft hover:border-ink hover:bg-paper hover:text-ink'
          }`}
        >
          <HeartIcon className='h-3.5 w-3.5' filled={isBookmarked} />
          Save
        </button>

        <button
          type='button'
          onClick={() => void onShare()}
          className='flex flex-1 items-center justify-center gap-2 rounded-full border border-line px-4 py-3 text-[13px] font-medium text-ink-soft transition-[border-color,color,background-color] duration-300 hover:border-ink hover:bg-paper hover:text-ink motion-reduce:transition-none'
        >
          <ShareIcon />
          Share
        </button>
      </div>
    </div>
  );
}
