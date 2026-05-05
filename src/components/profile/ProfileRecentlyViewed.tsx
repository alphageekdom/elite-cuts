'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { SerializedProduct } from '@/models/Product';
import useHandleAddToCart from '@/hooks/useHandleAddToCart';

type Props = {
  products: SerializedProduct[];
};

function RecentItem({ product }: { product: SerializedProduct }) {
  const { isAddingToCart, handleAddToCart } = useHandleAddToCart({
    _id: product._id,
    name: product.name,
    price: product.price,
    images: product.images,
    category: product.category,
  });

  return (
    <li className="flex items-center gap-3.5 py-3 border-b border-line-soft last:border-0 last:pb-0 first:pt-0">
      <Link href={`/products/${product._id}`} className="relative w-12 h-12 rounded shrink-0 overflow-hidden bg-cream-deep block">
        {product.images[0] && (
          <Image
            src={`/images/products/${product.images[0]}`}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/products/${product._id}`}>
          <p className="font-display font-medium text-[15px] tracking-tight truncate hover:text-oxblood transition-colors">
            {product.name}
          </p>
        </Link>
        <p className="text-xs text-muted">
          ${product.price.toFixed(2)}/lb · {product.category}
        </p>
      </div>
      <button
        onClick={handleAddToCart}
        disabled={isAddingToCart}
        aria-label={`Add ${product.name} to cart`}
        className="w-8 h-8 rounded-full bg-ink text-cream flex items-center justify-center shrink-0 transition-all hover:bg-oxblood hover:scale-[1.08] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </li>
  );
}

export default function ProfileRecentlyViewed({ products }: Props) {
  const [items, setItems] = useState<SerializedProduct[]>(products);

  return (
    <div className="bg-paper border border-line-soft rounded p-7">
      <h3 className="font-display font-medium text-[18px] tracking-tight mb-1">
        — Recently viewed
      </h3>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[13px] text-muted">From your last visit</p>
        {items.length > 0 && (
          <button
            onClick={() => setItems([])}
            aria-label="Clear recently viewed"
            className="text-[11px] text-muted hover:text-oxblood transition-colors border-b border-current leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-1 rounded-sm"
          >
            Clear
          </button>
        )}
      </div>
      {items.length > 0 ? (
        <ul>
          {items.map((p) => (
            <RecentItem key={p._id} product={p} />
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted py-2">Nothing from your last visit yet.</p>
      )}
    </div>
  );
}
