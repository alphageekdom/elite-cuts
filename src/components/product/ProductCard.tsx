'use client';

import { useEffect, type MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import ArrowIcon from '@/components/uielements/ArrowIcon';
import MinusIcon from '@/components/uielements/MinusIcon';
import PlusIcon from '@/components/uielements/PlusIcon';
import SpinnerIcon from '@/components/uielements/SpinnerIcon';
import { useCartContext } from '@/context/CartContext';
import useHandleAddToCart from '@/hooks/useHandleAddToCart';
import useHandleBookmark from '@/hooks/useHandleBookmark';
import { productImageSrc, formatMoney } from '@/lib/format';
import { MAX_PER_LINE } from '@/lib/shopConfig';

import { type SerializedProduct } from '@/models/Product';

type TagVariant = 'featured' | 'aged' | 'new';

type ProductCardProps = {
  product: SerializedProduct;
};

const TAG_CLASS: Record<TagVariant, string> = {
  featured: 'bg-ink text-cream',
  aged: 'bg-oxblood text-cream',
  new: 'bg-camel text-ink',
};

const TAG_LABEL: Record<TagVariant, string> = {
  featured: 'Featured',
  aged: 'Dry-Aged',
  new: 'New',
};

// Featured wins over aged wins over new — only one chip renders per card.
const resolveTag = (product: SerializedProduct): TagVariant | null => {
  if (product.isFeatured) return 'featured';
  if (product.isAged) return 'aged';
  if (product.isNewArrival) return 'new';
  return null;
};

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    viewBox='0 0 24 24'
    fill={filled ? 'currentColor' : 'none'}
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className='h-4 w-4 transition-[fill] duration-300 motion-reduce:transition-none'
  >
    <path d='M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z' />
  </svg>
);

const CartIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className='h-3.5 w-3.5'
  >
    <circle cx='9' cy='21' r='1' />
    <circle cx='20' cy='21' r='1' />
    <path d='M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6' />
  </svg>
);

const StarIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='currentColor'
    aria-hidden='true'
    className='h-2.5 w-2.5'
  >
    <polygon points='12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26' />
  </svg>
);

const ProductCard = ({ product }: ProductCardProps) => {
  const { data: session } = useSession();
  const userId = session?.user?.userId;

  const { isBookmarked, loading, handleBookmarkClick, checkBookmarkStatus } =
    useHandleBookmark(userId, product._id);
  // Silent add — the stepper appearing in place of the Add button is the
  // visible feedback. A toast on top would be duplicate noise.
  const { isAddingToCart, handleAddToCart } = useHandleAddToCart(product, {
    silent: true,
  });
  const { cartItems, setItemQuantity } = useCartContext();

  // Hook does not auto-check on mount — caller responsibility.
  useEffect(() => {
    void checkBookmarkStatus();
  }, [checkBookmarkStatus]);

  const tag = resolveTag(product);
  const productHref = `/products/${product._id}`;

  // Stock derivation: > 5 → in stock (green), 1-5 → low (camel), 0 → out (camel + disabled).
  const outOfStock = product.stockCount <= 0;
  const lowStock = product.stockCount > 0 && product.stockCount <= 5;
  const stockLabel = outOfStock
    ? 'Out of stock'
    : lowStock
      ? `${product.stockCount} left`
      : 'In stock';

  const currentLine = cartItems.find(
    (line) => line.product._id === product._id,
  );
  const currentQty = currentLine?.quantity ?? 0;
  const inCart = currentQty > 0;
  // Whichever cap kicks in first — the catalog stock or the per-line cap.
  const maxQty = Math.min(product.stockCount, MAX_PER_LINE);

  const onAddClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    void handleAddToCart();
  };

  const onDecrement = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // setItemQuantity(_, 0) drops the line, so the stepper collapses back to
    // the Add to cart button automatically.
    void setItemQuantity(product._id, currentQty - 1);
  };

  const onIncrement = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentQty >= maxQty) return;
    void setItemQuantity(product._id, currentQty + 1);
  };

  const onSaveClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void handleBookmarkClick(e);
  };

  return (
    <article className='group relative flex h-full flex-col'>
      <div className='relative mb-6 aspect-4/5 overflow-hidden rounded-sm bg-cream-deep'>
        <Link
          href={productHref}
          aria-label={`View ${product.name}`}
          className='absolute inset-0 z-1'
        >
          <Image
            src={productImageSrc(product.images[0]) ?? ''}
            alt=''
            fill
            sizes='(min-width: 1024px) 50vw, 100vw'
            className='object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105 motion-reduce:group-hover:scale-100 motion-reduce:transition-none'
          />
        </Link>

        {tag && (
          <span
            className={`absolute top-4 left-4 z-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium tracking-[0.18em] uppercase ${TAG_CLASS[tag]}`}
          >
            {TAG_LABEL[tag]}
          </span>
        )}

        <button
          type='button'
          onClick={onSaveClick}
          aria-label={isBookmarked ? 'Remove from saved' : 'Save'}
          aria-pressed={isBookmarked}
          disabled={loading}
          className={`absolute top-4 right-4 z-2 grid h-10 w-10 place-items-center rounded-full bg-cream/95 backdrop-blur-md transition-[background-color,transform] duration-300 hover:scale-105 hover:bg-cream motion-reduce:transition-none motion-reduce:hover:scale-100 ${
            isBookmarked ? 'text-oxblood' : 'text-ink'
          }`}
        >
          <HeartIcon filled={isBookmarked} />
        </button>

        <div className='absolute right-4 bottom-4 left-4 z-2 translate-y-[120%] opacity-0 transition-[transform,opacity] duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] max-md:translate-y-0 max-md:opacity-100 md:group-hover:translate-y-0 md:group-hover:opacity-100 motion-reduce:transition-none motion-reduce:max-md:translate-y-0 motion-reduce:max-md:opacity-100'>
          {inCart ? (
            <div
              role='group'
              aria-label={`${product.name} quantity`}
              className='flex w-full items-center justify-between rounded-full bg-ink px-1.5 py-1.5 text-cream'
            >
              <button
                type='button'
                onClick={onDecrement}
                aria-label={`Decrease ${product.name} quantity`}
                className='grid h-9 w-9 place-items-center rounded-full transition-colors duration-300 hover:bg-oxblood motion-reduce:transition-none'
              >
                <MinusIcon className='h-3 w-3' />
              </button>
              <span
                aria-live='polite'
                className='font-display text-[15px] font-medium tracking-tight'
              >
                {currentQty}
              </span>
              <button
                type='button'
                onClick={onIncrement}
                disabled={currentQty >= maxQty}
                aria-label={`Increase ${product.name} quantity`}
                className='grid h-9 w-9 place-items-center rounded-full transition-colors duration-300 hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none'
              >
                <PlusIcon className='h-3 w-3' />
              </button>
            </div>
          ) : (
            <button
              type='button'
              onClick={onAddClick}
              disabled={isAddingToCart || outOfStock}
              className='flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-[13px] font-medium tracking-[0.04em] text-cream transition-colors duration-300 hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'
            >
              {isAddingToCart ? (
                <SpinnerIcon className='h-3.5 w-3.5' />
              ) : (
                <CartIcon />
              )}
              {isAddingToCart ? 'Adding…' : outOfStock ? 'Sold out' : 'Add to cart'}
            </button>
          )}
        </div>
      </div>

      <div className='flex flex-1 flex-col px-1'>
        <div className='mb-2.5 flex items-center gap-2.5 text-[11px] tracking-[0.16em] uppercase text-muted'>
          <span>{product.category}</span>
          <span
            aria-hidden='true'
            className='h-0.75 w-0.75 rounded-full bg-current opacity-40'
          />
          <span className='inline-flex items-center gap-1.5 tracking-normal text-camel'>
            <StarIcon />
            {product.rating?.toFixed(1) ?? '—'}
          </span>
        </div>

        <h3 className='mb-2.5 line-clamp-2 font-display text-[22px] font-medium leading-[1.15] tracking-[-0.02em] transition-colors duration-300 group-hover:text-oxblood motion-reduce:transition-none md:text-[26px]'>
          <Link href={productHref}>{product.name}</Link>
        </h3>

        <p className='mb-5 line-clamp-3 text-sm leading-[1.65] text-ink-soft'>
          {product.description}
        </p>

        <div className='mt-auto flex items-baseline justify-between gap-3 border-t border-line-soft pt-4.5'>
          <div className='font-display text-xl font-medium tracking-[-0.01em] text-ink md:text-2xl'>
            {product.displayPriceLabel ? (
              product.displayPriceLabel
            ) : (
              <>
                {formatMoney(product.price)}
                <em className='ml-1 text-[13px] font-normal not-italic text-muted'>
                  /lb
                </em>
              </>
            )}
          </div>
          <span className='inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.04em] text-muted'>
            <span
              aria-hidden='true'
              className={`h-1.5 w-1.5 rounded-full ${
                outOfStock || lowStock ? 'bg-camel' : 'bg-green'
              }`}
            />
            {stockLabel}
          </span>
        </div>
        <Link
          href={productHref}
          className='group/view mt-3.5 inline-flex items-center gap-1.5 self-start border-b border-oxblood/30 pb-0.5 text-[13px] font-medium tracking-[0.04em] text-oxblood transition-[gap,border-color] duration-300 hover:gap-2.5 hover:border-oxblood motion-reduce:transition-none'
        >
          View cut
          <ArrowIcon className='transition-transform duration-300 group-hover/view:translate-x-0.5 motion-reduce:transition-none' />
        </Link>
      </div>
    </article>
  );
};

export default ProductCard;
