'use client';

import Image from 'next/image';
import Link from 'next/link';

import { formatMoney, productImageSrc } from '@/lib/format';
import { productPath } from '@/lib/products/paths';
import { FOCUS_RING } from '@/lib/styles';
import type { SerializedProduct } from '@/models/Product';
import { useHandleAddToCart } from '@/hooks/useHandleAddToCart';

export type RepeatCut = {
  product: SerializedProduct;
  /** Orders containing this cut, within the lookback window. */
  times: number;
};

function RepeatCard({ product, times }: RepeatCut) {
  const { isAddingToCart, handleAddToCart } = useHandleAddToCart({
    _id: product._id,
    name: product.name,
    price: product.price,
    images: product.images,
    category: product.category,
  });

  const soldOut = (product.stockCount ?? 0) <= 0;

  return (
    <li className="flex flex-col rounded-sm border border-line-soft bg-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[10.5px] tracking-[0.14em] uppercase text-camel-deep">
          {product.category}
        </span>
        {times > 1 && (
          <span className="shrink-0 font-mono text-[10.5px] text-muted">
            {times}×<span className="sr-only"> in {times} recent orders</span>
          </span>
        )}
      </div>

      <Link
        href={productPath(product)}
        className={`mt-2.5 flex items-start gap-3 rounded-sm ${FOCUS_RING} focus-visible:ring-offset-paper`}
      >
        <span className="relative size-11 shrink-0 overflow-hidden rounded-sm bg-cream-deep">
          {product.images[0] && (
            <Image
              src={productImageSrc(product.images[0]) ?? ''}
              alt=""
              fill
              sizes="44px"
              className="object-cover"
            />
          )}
        </span>
        <span className="min-w-0 flex-1 font-display text-[17px] leading-tight tracking-tight transition-colors hover:text-oxblood">
          {product.name}
        </span>
      </Link>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <span className="font-display text-[17px]">
          {product.displayPriceLabel ?? formatMoney(product.price)}
        </span>
        {soldOut ? (
          // The confirmation page shipped the mirror of this bug — suggesting
          // a cut the shop had already withdrawn. A repeat prompt is worse:
          // it is aimed at something the customer is known to want.
          <span className="inline-flex min-h-11 items-center rounded-full border border-line px-3 py-1.5 text-[12px] text-muted">
            Sold out
          </span>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isAddingToCart}
            className={`inline-flex min-h-11 items-center rounded-full border border-line px-3.5 py-1.5 text-[12px] font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-50 ${FOCUS_RING} focus-visible:ring-offset-paper`}
          >
            {isAddingToCart ? 'Adding…' : 'Add'}
            <span className="sr-only"> {product.name} to cart</span>
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Cuts from the customer's recent orders, offered back.
 *
 * An addition to the page, not a replacement for Saved cuts — the two answer
 * different questions ("what did I mean to come back to" vs "what do I keep
 * buying"), and the save-heart on product cards writes to the other one.
 */
export default function BuyItAgain({ cuts }: { cuts: RepeatCut[] }) {
  if (cuts.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-[26px] tracking-tight">
          Buy it <em className="italic text-oxblood">again</em>
        </h2>
        <p className="text-[13px] text-muted">From your recent orders</p>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cuts.map((cut) => (
          <RepeatCard key={cut.product._id} {...cut} />
        ))}
      </ul>
    </section>
  );
}
