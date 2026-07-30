'use client';

import Image from 'next/image';
import Link from 'next/link';

import useHandleAddToCart from '@/hooks/useHandleAddToCart';
import { useCartContext } from '@/context/CartContext';
import { productImageSrc } from '@/lib/format';
import { productPath } from '@/lib/products/paths';
import { fmtPrice } from '@/lib/pricing';
import PlusIcon from '@/components/ui/icons/PlusIcon';
import type { SerializedProduct } from '@/models/Product';

type SuggestProps = {
  product: SerializedProduct;
};

const SuggestionCard = ({ product }: SuggestProps) => {
  // Silent on the cart page — the item appearing in the items panel beside
  // this strip is feedback enough, no toast needed.
  const { isAddingToCart, handleAddToCart } = useHandleAddToCart(product, {
    silent: true,
  });

  return (
    <div className='flex items-center gap-3 rounded-sm border border-transparent bg-cream p-3 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-line motion-reduce:transition-none motion-reduce:hover:translate-y-0'>
      <Link
        href={productPath(product)}
        aria-label={`View ${product.name}`}
        className='relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-cream-deep'
      >
        <Image
          src={productImageSrc(product.images?.[0]) ?? ''}
          alt=''
          fill
          sizes='48px'
          className='object-cover'
        />
      </Link>

      <div className='min-w-0 flex-1'>
        <Link
          href={productPath(product)}
          className='block truncate font-display text-sm font-medium tracking-tight transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none'
        >
          {product.name}
        </Link>
        <div className='font-mono text-[11px] text-muted'>
          {product.displayPriceLabel ?? `$${fmtPrice(product.price)}/lb`}
        </div>
      </div>

      <button
        type='button'
        onClick={() => void handleAddToCart()}
        disabled={isAddingToCart}
        aria-label={`Add ${product.name} to cart`}
        className='grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-cream transition-[background-color,transform] duration-300 hover:scale-[1.08] hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:scale-100'
      >
        <PlusIcon className='h-2.5 w-2.5' />
      </button>
    </div>
  );
};

type Props = {
  products: SerializedProduct[];
};

const CartSuggestions = ({ products }: Props) => {
  const { cartItems } = useCartContext();
  const inCart = new Set(cartItems.map((line) => line.product._id));

  // Server gives us up to 6 candidates; render the first 3 not already in
  // the cart so the strip stays useful even after a guest adds a few items.
  const suggestions = products.filter((p) => !inCart.has(p._id)).slice(0, 3);

  if (suggestions.length === 0) return null;

  return (
    <section className='mt-6 rounded-sm border border-line-soft bg-paper px-6 py-5 sm:px-7 sm:py-6'>
      <header className='mb-4 flex items-center justify-between'>
        <h3 className='font-display text-lg font-normal italic tracking-tight'>
          Pair with these →
        </h3>
      </header>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        {suggestions.map((product) => (
          <SuggestionCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default CartSuggestions;
