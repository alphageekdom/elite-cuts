// The four pure transforms behind every cart mutation.
//
// They lived inside CartProvider until the 2026-07-31 context audit: pure
// array functions with no React in them, encoding the price-snapshot rule the
// pricing phases fixed, and untested because nothing could import them.
//
// Generic over the product type rather than importing the context's
// `CartLineProduct`: the context owns that shape, and duplicating it here
// would be a second copy to keep in sync. `counts.ts` answered the same
// question the same way, with structural types instead of a context import.

import { unitPrice, type PricingView } from '@/lib/products/pricing';

// What a line's product must carry for these transforms: an id to key on, and
// enough pricing shape for `unitPrice` to snapshot a new line. `PricingView`'s
// fields are all optional except `pricingType`, so `Partial<>` of it is exactly
// the "may or may not have canonical pricing" shape `unitPrice` accepts —
// legacy guest carts persisted before the pricing phases carry none of it.
export type LineProduct = { _id: string; price?: number } & Partial<PricingView>;

export type CartLineOf<P extends LineProduct> = {
  product: P;
  quantity: number;
  price: number;
};

// Quantities and prices arrive from two places that can lie: a hand-edited or
// half-written localStorage cart, and legacy server docs. `Number(undefined)`
// is NaN, and NaN fails every comparison — including `quantity <= 0`, so an
// unguarded NaN doesn't get filtered as a zero line, it renders as "NaN" and
// poisons every total downstream. Both normalisers answer "unusable" with 0 so
// the callers' existing `<= 0` checks catch it.
function normalizeQuantity(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function normalizePrice(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// Fold duplicate product lines into one, summing quantities, and drop lines
// that can't render — no product id, or a quantity that isn't a usable count.
//
// Both cart ingress points run this: the guest cart read out of localStorage
// and the server GET's response. Duplicates come from legacy server docs that
// pre-date dedup-on-add; unusable quantities come from corrupted storage. The
// result is the invariant every consumer relies on — one line per product,
// each with a real count — so React's per-product key stays unique and no
// total can go NaN.
export function dedupeLines<L extends { product: { _id: string }; quantity: number; price: number }>(
  lines: L[],
): L[] {
  const byProduct = new Map<string, L>();
  for (const line of lines) {
    if (!line.product?._id) continue;
    const quantity = normalizeQuantity(line.quantity);
    if (quantity === 0) continue;
    const price = normalizePrice(line.price);

    const id = String(line.product._id);
    const existing = byProduct.get(id);
    byProduct.set(
      id,
      existing
        ? { ...existing, quantity: existing.quantity + quantity }
        : { ...line, quantity, price },
    );
  }
  return [...byProduct.values()];
}

// Apply an incremental "add N of this product".
//
// The price snapshot is the load-bearing part. A NEW line stores
// `unitPrice(product)` — the per-unit estimate — so a per-lb cut carries
// (rate × typical weight) rather than the bare per-lb rate, which is the bug
// the pricing phases fixed (a half-pound filet charged the full per-lb rate).
// An EXISTING line only increments its quantity and deliberately does not
// re-snapshot, so a catalog price change mid-session can't silently move the
// price of something already in the basket.
export function applyAddToLines<P extends LineProduct>(
  lines: CartLineOf<P>[],
  product: P,
  addBy: number,
): CartLineOf<P>[] {
  const quantity = normalizeQuantity(addBy);
  if (quantity === 0) return lines;

  const idx = lines.findIndex((l) => l.product._id === product._id);
  if (idx === -1) {
    return [
      ...lines,
      { product, quantity, price: unitPrice(product, product.price) },
    ];
  }
  const next = [...lines];
  next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
  return next;
}

// Set an absolute quantity. A quantity that isn't a usable count — zero,
// negative, or NaN from an unbounded caller — removes the line, which is what
// every stepper's minus button relies on at 1.
export function setQuantityOnLines<L extends { product: { _id: string }; quantity: number }>(
  lines: L[],
  productId: string,
  quantity: number,
): L[] {
  const next = normalizeQuantity(quantity);
  if (next === 0) return removeFromLines(lines, productId);
  return lines.map((l) => (l.product._id === productId ? { ...l, quantity: next } : l));
}

export function removeFromLines<L extends { product: { _id: string } }>(
  lines: L[],
  productId: string,
): L[] {
  return lines.filter((l) => l.product._id !== productId);
}
