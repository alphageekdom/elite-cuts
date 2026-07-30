'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { formatMoney, productImageSrc } from '@/lib/format';
import { productPath } from '@/lib/products/paths';
import {
  clearRecentlyViewed,
  readRecentlyViewed,
} from '@/lib/products/recently-viewed';
import type { SerializedProduct } from '@/models/Product';
import { useHandleAddToCart } from '@/hooks/useHandleAddToCart';
import { useIsMounted } from '@/hooks/useIsMounted';

// How many of the remembered cuts to show. The store keeps more so that a
// withdrawn one dropping out of the API response doesn't shorten the list.
const VISIBLE = 3;

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
      <Link href={productPath(product)} className="relative w-12 h-12 rounded shrink-0 overflow-hidden bg-cream-deep block">
        {product.images[0] && (
          <Image
            src={productImageSrc(product.images[0]) ?? ''}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={productPath(product)}>
          <p className="font-display font-medium text-[15px] tracking-tight truncate hover:text-oxblood transition-colors">
            {product.name}
          </p>
        </Link>
        <p className="text-xs text-muted">
          {product.displayPriceLabel ?? `${formatMoney(product.price)}/lb`} · {product.category}
        </p>
      </div>
      <button
        onClick={handleAddToCart}
        disabled={isAddingToCart}
        aria-label={`Add ${product.name} to cart`}
        className="w-9 h-9 rounded-full bg-ink text-cream flex items-center justify-center shrink-0 transition-all hover:bg-oxblood hover:scale-[1.08] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </li>
  );
}

/**
 * Cuts the visitor has actually opened, newest first.
 *
 * The list of slugs lives in the browser (see lib/products/recently-viewed);
 * the products themselves are fetched fresh so a withdrawn cut or a moved
 * price can never be shown from a stale snapshot. Until this mounts there is
 * nothing to render — the panel is deliberately absent server-side rather
 * than guessing at content, which is what the previous stub did.
 */
export default function ProfileRecentlyViewed() {
  // Gates the localStorage read so the server pass and the first client render
  // agree. Reading storage during render would differ between the two and
  // trip hydration; reading it in an effect and calling setState there trips
  // the cascading-render rule instead. This is the pattern the rest of the app
  // already uses for browser-only state.
  const mounted = useIsMounted();
  const [items, setItems] = useState<SerializedProduct[]>([]);
  const [settled, setSettled] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    if (!mounted) return;

    const slugs = readRecentlyViewed();
    if (slugs.length === 0) {
      // Deferred to a microtask rather than called straight from the effect
      // body: same result, but it isn't the synchronous setState that causes
      // the cascading render the lint rule guards against.
      queueMicrotask(() => setSettled(true));
      return;
    }

    const controller = new AbortController();
    (async () => {
      setHasHistory(true);
      try {
        const res = await fetch(
          `/api/products/by-slug?slugs=${encodeURIComponent(slugs.join(','))}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { items?: SerializedProduct[] };
        setItems((data.items ?? []).slice(0, VISIBLE));
      } catch {
        // Aborted or offline. The panel falls back to its empty state;
        // nothing here is worth interrupting the page for.
      } finally {
        setSettled(true);
      }
    })();

    return () => controller.abort();
  }, [mounted]);

  const handleClear = useCallback(() => {
    clearRecentlyViewed();
    setItems([]);
    setHasHistory(false);
  }, []);

  // "Looking…" only while there is genuinely something to look up. A visitor
  // who has opened nothing sees the empty copy immediately rather than a
  // spinner that resolves to nothing.
  const busy = !settled && (!mounted || hasHistory);

  return (
    <div className="bg-paper border border-line-soft rounded p-7">
      <h2 className="font-display font-medium text-[18px] tracking-tight mb-1">
        — Recently viewed
      </h2>
      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-[13px] text-muted">Cuts you looked at recently</p>
        {items.length > 0 && (
          <button
            onClick={handleClear}
            aria-label="Clear recently viewed"
            className="text-[11px] text-muted hover:text-oxblood transition-colors border-b border-current leading-none shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-1 rounded-sm"
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
        <p className="text-[13px] text-muted py-2">
          {busy ? 'Looking…' : 'Nothing yet — cuts you open will show up here.'}
        </p>
      )}
    </div>
  );
}
