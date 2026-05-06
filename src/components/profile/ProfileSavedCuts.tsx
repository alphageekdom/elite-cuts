'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import type { SerializedProduct } from '@/models/Product';
import useHandleAddToCart from '@/hooks/useHandleAddToCart';

type Props = {
  savedCuts: SerializedProduct[];
  showAll?: boolean;
};

function BookmarkCard({
  bookmark,
  onRemove,
}: {
  bookmark: SerializedProduct;
  onRemove: (id: string) => void;
}) {
  const { isAddingToCart, handleAddToCart } = useHandleAddToCart({
    _id: bookmark._id,
    name: bookmark.name,
    price: bookmark.price,
    images: bookmark.images,
    category: bookmark.category,
  });

  const handleRemove = async () => {
    try {
      const res = await fetch('/api/saved-cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: bookmark._id }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Removed from saved cuts');
      onRemove(bookmark._id);
    } catch {
      toast.error('Could not remove saved cut');
    }
  };

  return (
    <div className="bg-paper border border-line-soft rounded overflow-hidden transition-transform duration-400 hover:-translate-y-0.75">
      <Link href={`/products/${bookmark._id}`} aria-label={`View ${bookmark.name}`} className="block">
        <div className="relative h-40 overflow-hidden">
          <Image
            src={`/images/products/${bookmark.images[0]}`}
            alt={bookmark.name}
            fill
            sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 hover:scale-105"
          />
        </div>
      </Link>
      <div className="p-4 pb-5">
        <p className="font-display font-medium text-[17px] tracking-tight mb-0.5 truncate">
          {bookmark.name}
        </p>
        <p className="text-xs text-muted mb-3 capitalize">{bookmark.category}</p>
        <div className="flex items-center justify-between">
          <p className="font-display font-medium text-[18px]">
            ${bookmark.price.toFixed(2)}
            <em className="not-italic text-muted text-xs font-normal ml-0.5">/lb</em>
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRemove}
              aria-label={`Remove ${bookmark.name} from saved cuts`}
              className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-muted transition-colors hover:border-oxblood hover:text-oxblood focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-1"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6M9 6V4h6v2" />
              </svg>
            </button>
            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              aria-label={`Add ${bookmark.name} to cart`}
              className="w-9 h-9 rounded-full bg-ink text-cream flex items-center justify-center transition-all hover:bg-oxblood hover:scale-[1.08] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSavedCuts({ savedCuts: initial, showAll = false }: Props) {
  const [savedCuts, setSavedCuts] = useState(initial);
  const displayed = showAll ? savedCuts : savedCuts.slice(0, 3);

  const handleRemove = (id: string) => {
    setSavedCuts((prev: SerializedProduct[]) => prev.filter((b: SerializedProduct) => b._id !== id));
  };

  if (savedCuts.length === 0) {
    return (
      <div className="bg-paper border border-dashed border-line rounded p-14 text-center">
        <div className="w-14 h-14 rounded-full bg-cream-deep text-ink-soft flex items-center justify-center mx-auto mb-5" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </div>
        <h3 className="font-display font-medium text-[22px] tracking-tight mb-2">No saved cuts yet</h3>
        <p className="text-muted text-sm mb-6 max-w-[32ch] mx-auto">
          Browse the cuts and save anything worth coming back for.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 bg-ink text-cream text-[13px] font-medium tracking-[0.04em] px-5 py-3 rounded-full hover:bg-oxblood transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          Browse cuts
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {displayed.map((b: SerializedProduct) => (
        <BookmarkCard key={b._id} bookmark={b} onRemove={handleRemove} />
      ))}
    </div>
  );
}
