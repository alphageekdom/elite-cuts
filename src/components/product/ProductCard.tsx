'use client';

import { useEffect, type MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import MinusIcon from '@/components/uielements/MinusIcon';
import PlusIcon from '@/components/uielements/PlusIcon';
import SpinnerIcon from '@/components/uielements/SpinnerIcon';
import StarIcon from '@/components/uielements/StarIcon';
import { useCartContext } from '@/context/CartContext';
import useHandleAddToCart from '@/hooks/useHandleAddToCart';
import useHandleBookmark from '@/hooks/useHandleBookmark';
import { productImageSrc, formatMoney } from '@/lib/format';
import { productPath } from '@/lib/products/paths';
import { MAX_PER_LINE } from '@/lib/shop-settings/config';

import { type SerializedProduct } from '@/models/Product';

type TagVariant = 'featured' | 'aged' | 'new';

type ProductCardProps = {
  product: SerializedProduct;
  /**
   * `sizes` for the card image. Defaults to the catalog grid
   * (`sm:grid-cols-2 lg:grid-cols-3`). Grids that step columns at different
   * breakpoints pass their own — the homepage Featured grid goes 4-up at lg,
   * the related-cuts strip goes 3-up at md.
   */
  sizes?: string;
};

// Past 1280px the grids stop growing (max-w-7xl caps content at 1216px), so a
// `vw` clause keeps over-declaring as the viewport widens — ~570px claimed for
// a 389px card at 1728px, which costs a whole width step on 2x displays. The
// fixed-px clause pins the real rendered width above that breakpoint.
const DEFAULT_SIZES =
  '(min-width: 1280px) 389px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';

const TAG_CLASS: Record<TagVariant, string> = {
  featured: 'bg-ink text-camel-soft',
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

const ProductCard = ({ product, sizes = DEFAULT_SIZES }: ProductCardProps) => {
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
  const productHref = productPath(product);

  // The inline chip beside the name is a *weight* chip — short, glanceable.
  // A bundle's stamped label is an includes-list sentence, which crowds the
  // name and reads badly in a pill, so it stays as a full-width line under
  // the price where it has room. Either way the real stamped field renders.
  const weightLabel = product.displayWeightLabel;
  const showWeightAsPill = Boolean(
    weightLabel && product.pricingType !== 'bundle',
  );

  // Stock derivation: > 5 → in stock (green), 1-5 → low (camel), 0 → out (camel + disabled).
  const outOfStock = product.stockCount <= 0;
  const lowStock = product.stockCount > 0 && product.stockCount <= 5;
  const stockLabel = outOfStock
    ? 'Sold out'
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
    <article className='group border-line bg-paper relative flex h-full flex-col overflow-hidden rounded-2xl border transition-shadow duration-300 hover:shadow-[0_18px_40px_-24px_rgba(28,24,20,0.35)] motion-reduce:transition-none'>
      <div className='bg-cream-deep relative aspect-4/5 overflow-hidden'>
        <Link
          href={productHref}
          aria-label={`View ${product.name}`}
          className='absolute inset-0 z-1'
        >
          <Image
            src={productImageSrc(product.images[0]) ?? ''}
            alt=''
            fill
            sizes={sizes}
            className='object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100'
          />
        </Link>

        {tag && (
          <span
            className={`absolute top-4 left-4 z-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium tracking-[0.18em] uppercase ${TAG_CLASS[tag]}`}
          >
            {TAG_LABEL[tag]}
          </span>
        )}

        {/* Cream in both states: camel-soft only reached 2.6:1 against the
            translucent backdrop over a light photo, under the 3:1 floor. The
            filled-vs-outline heart carries the saved state instead, so it
            survives without relying on colour at all. */}
        <button
          type='button'
          onClick={onSaveClick}
          aria-label={isBookmarked ? 'Remove from saved' : 'Save'}
          aria-pressed={isBookmarked}
          disabled={loading}
          className='bg-ink/65 text-cream hover:bg-ink/80 focus-visible:bg-ink/80 focus-visible:ring-cream absolute top-4 right-4 z-2 grid h-11 w-11 place-items-center rounded-full backdrop-blur-md transition-[background-color,transform] duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:scale-100'
        >
          <HeartIcon filled={isBookmarked} />
        </button>
      </div>

      <div className='flex flex-1 flex-col p-5'>
        <div className='text-muted mb-2.5 flex items-center gap-2.5 text-[11px] tracking-[0.16em] uppercase'>
          <span>{product.category}</span>
          <span
            aria-hidden='true'
            className='h-0.75 w-0.75 rounded-full bg-current opacity-40'
          />
          <span className='text-camel-deep inline-flex items-center gap-1.5 tracking-normal'>
            <StarIcon className='h-2.5 w-2.5' />
            {product.rating != null && <span className='sr-only'>Rated</span>}
            {product.rating?.toFixed(1) ?? '—'}
            {product.rating != null && (
              <span className='sr-only'>out of 5 stars</span>
            )}
          </span>
        </div>

        {/* Name + weight chip share a wrapping baseline row so a long cut
            name pushes the chip to its own line instead of being squeezed. */}
        <div className='mb-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-2'>
          <h3 className='font-display group-hover:text-oxblood line-clamp-2 text-[22px] leading-[1.15] font-medium tracking-[-0.02em] transition-colors duration-300 motion-reduce:transition-none md:text-[24px]'>
            <Link href={productHref}>{product.name}</Link>
          </h3>
          {showWeightAsPill && (
            <span className='border-line text-muted shrink-0 rounded-full border px-2.5 py-1 text-[11px] leading-none whitespace-nowrap'>
              {weightLabel}
            </span>
          )}
        </div>

        <p className='text-ink-soft mb-5 line-clamp-3 text-sm leading-[1.65]'>
          {product.description}
        </p>

        <div className='border-line-soft mt-auto flex items-baseline justify-between gap-3 border-t pt-4.5'>
          <div>
            <div className='font-display text-ink text-xl font-medium tracking-[-0.01em] md:text-2xl'>
              {product.displayPriceLabel ? (
                product.displayPriceLabel
              ) : (
                <>
                  {formatMoney(product.price)}
                  <em className='text-muted ml-1 text-[13px] font-normal not-italic'>
                    {product.unit === 'each' ? 'each' : `/${product.unit}`}
                  </em>
                </>
              )}
            </div>
            {!showWeightAsPill && weightLabel && (
              <div className='text-muted mt-1 line-clamp-2 text-[11px] leading-snug'>
                {weightLabel}
              </div>
            )}
          </div>
          <span className='text-muted inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] tracking-[0.04em] whitespace-nowrap'>
            <span
              aria-hidden='true'
              className={`h-1.5 w-1.5 rounded-full ${
                outOfStock || lowStock ? 'bg-camel' : 'bg-green'
              }`}
            />
            {stockLabel}
          </span>
        </div>

        {inCart ? (
          <div
            role='group'
            aria-label={`${product.name} quantity`}
            className='bg-ink text-cream mt-4 flex w-full items-center justify-between rounded-lg px-1.5 py-1.5'
          >
            <button
              type='button'
              onClick={onDecrement}
              aria-label={`Decrease ${product.name} quantity`}
              className='hover:bg-oxblood grid h-10 w-10 place-items-center rounded-full transition-colors duration-300 motion-reduce:transition-none'
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
              className='hover:bg-oxblood grid h-10 w-10 place-items-center rounded-full transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none'
            >
              <PlusIcon className='h-3 w-3' />
            </button>
          </div>
        ) : (
          <button
            type='button'
            onClick={onAddClick}
            disabled={isAddingToCart || outOfStock}
            className='bg-ink text-cream hover:bg-oxblood mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-medium tracking-[0.04em] transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'
          >
            {isAddingToCart ? (
              <SpinnerIcon className='h-3.5 w-3.5' />
            ) : (
              <CartIcon />
            )}
            {isAddingToCart
              ? 'Adding…'
              : outOfStock
                ? 'Sold out'
                : 'Add to cart'}
          </button>
        )}
      </div>
    </article>
  );
};

export default ProductCard;
