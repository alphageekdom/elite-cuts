'use client';

import { useEffect, type MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import useHandleAddToCart from '@/hooks/useHandleAddToCart';
import useHandleBookmark from '@/hooks/useHandleBookmark';

export type FeaturedProduct = {
  _id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  rating: number;
  images: string[];
  stockCount: number;
  isFeatured?: boolean;
};

type TagVariant = 'featured' | 'aged' | 'new';

type FeaturedProductCardProps = {
  product: FeaturedProduct;
};

const TAG_CLASS: Record<TagVariant, string> = {
  featured: 'bg-ink text-cream',
  aged: 'bg-oxblood text-cream',
  new: 'bg-camel text-ink',
};

const TAG_LABEL: Record<TagVariant, string> = {
  featured: 'Featured',
  aged: '28-Day Aged',
  new: 'New',
};

// Derive the chip variant from existing model fields. Today only `featured`
// fires because the Product schema lacks `aged`/`new` flags — typed up front
// so future model fields plug in without a card-level refactor.
const resolveTag = (product: FeaturedProduct): TagVariant | null => {
  if (product.isFeatured) return 'featured';
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

const FeaturedProductCard = ({ product }: FeaturedProductCardProps) => {
  const { data: session } = useSession();
  const userId = session?.user?.userId;

  const { isBookmarked, loading, handleBookmarkClick, checkBookmarkStatus } =
    useHandleBookmark(userId, product._id);
  const { isAddingToCart, handleAddToCart } = useHandleAddToCart(product);

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
      ? `Only ${product.stockCount} left`
      : 'In stock';

  const onAddClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    void handleAddToCart();
  };

  const onSaveClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void handleBookmarkClick(e);
  };

  return (
    <article className='group relative'>
      <div className='relative mb-6 aspect-4/5 overflow-hidden rounded-sm bg-cream-deep'>
        <Link
          href={productHref}
          aria-label={`View ${product.name}`}
          className='absolute inset-0 z-1'
        >
          <Image
            src={`/images/products/${product.images[0]}`}
            alt={product.name}
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

        <div className='absolute right-4 bottom-4 left-4 z-2 flex translate-y-[120%] gap-2 opacity-0 transition-[transform,opacity] duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] max-md:translate-y-0 max-md:opacity-100 md:group-hover:translate-y-0 md:group-hover:opacity-100 motion-reduce:transition-none motion-reduce:max-md:translate-y-0 motion-reduce:max-md:opacity-100'>
          <button
            type='button'
            onClick={onAddClick}
            disabled={isAddingToCart || outOfStock}
            className='flex flex-1 items-center justify-center gap-2.5 rounded-full bg-ink px-5 py-3.5 text-[13px] font-medium tracking-[0.04em] text-cream transition-colors duration-300 hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'
          >
            <CartIcon />
            {isAddingToCart ? 'Adding…' : outOfStock ? 'Sold out' : 'Add to cart'}
          </button>
          <Link
            href={productHref}
            className='rounded-full bg-cream/95 px-5 py-3.5 text-[13px] font-medium tracking-[0.04em] text-ink backdrop-blur-md transition-colors duration-300 hover:bg-cream motion-reduce:transition-none'
          >
            View
          </Link>
        </div>
      </div>

      <div className='px-1'>
        <div className='mb-2.5 flex items-center gap-2.5 text-[11px] tracking-[0.22em] uppercase text-muted'>
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

        <h3 className='mb-2.5 font-display text-[28px] font-medium leading-[1.1] tracking-[-0.02em] transition-colors duration-300 group-hover:text-oxblood motion-reduce:transition-none md:text-[32px]'>
          <Link href={productHref}>{product.name}</Link>
        </h3>

        <p className='mb-5 max-w-[38ch] text-sm leading-[1.55] text-ink-soft'>
          {product.description}
        </p>

        <div className='flex items-baseline justify-between gap-4 border-t border-line-soft pt-4.5'>
          <div className='font-display text-2xl font-medium tracking-[-0.01em] text-ink md:text-[28px]'>
            ${product.price.toFixed(2)}
            <em className='ml-1 text-sm font-normal not-italic text-muted'>
              /lb
            </em>
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
      </div>
    </article>
  );
};

export default FeaturedProductCard;
