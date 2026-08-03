import { describe, it, expect } from 'vitest';

import type { CartLine } from '@/context/CartContext';
import { unitPrice } from '@/lib/products/pricing';
import { currentUnitPrice, findPriceChanges, repriceLines } from './reprice';

// Only the fields `unitPrice` reads matter; the rest of CartLineProduct is
// display chrome. Cast once here rather than stubbing twenty unused keys.
const line = (over: Record<string, unknown> = {}, snapshot?: number): CartLine => {
  const product = {
    _id: 'p1',
    name: 'Ribeye',
    price: 24.99,
    pricingType: 'fixed_package',
    packagePrice: 24.99,
    ...over,
  };
  const asLine = { product, quantity: 1, price: 0 } as unknown as CartLine;
  return {
    ...asLine,
    price: snapshot ?? unitPrice(asLine.product, asLine.product.price),
  };
};

describe('currentUnitPrice', () => {
  // The invariant the whole module rests on: this must be the same expression
  // `buildLine` uses, or the client would "correct" itself to a number the
  // server still disagrees with.
  it('matches unitPrice on the populated product', () => {
    const l = line();
    expect(currentUnitPrice(l)).toBe(unitPrice(l.product, l.product.price));
  });

  // A per-lb cut is charged pricePerLb × estimatedWeightLb, not the raw rate —
  // the bug fixed in Phase 3 that had a half-pound filet ringing up at the
  // full per-pound price.
  it('estimates a per-lb cut rather than returning the raw rate', () => {
    const l = line({
      pricingType: 'per_lb',
      pricePerLb: 39.99,
      estimatedWeightLb: 0.5,
      price: 39.99,
    });
    expect(currentUnitPrice(l)).toBeCloseTo(19.995, 3);
  });
});

describe('findPriceChanges', () => {
  it('is empty when nothing moved', () => {
    expect(findPriceChanges([line(), line({ _id: 'p2' })])).toEqual([]);
  });

  it('reports a line whose product was repriced after it was added', () => {
    // Snapshot taken at $24.99; the admin has since raised it to $29.99.
    const stale = line({ price: 29.99, packagePrice: 29.99 }, 24.99);
    expect(findPriceChanges([stale])).toEqual([
      { productId: 'p1', name: 'Ribeye', was: 24.99, now: 29.99 },
    ]);
  });

  it('reports a price cut as well as a rise', () => {
    const cheaper = line({ price: 19.99, packagePrice: 19.99 }, 24.99);
    expect(findPriceChanges([cheaper])[0]).toMatchObject({ was: 24.99, now: 19.99 });
  });

  // Float noise is not a price change. `pricePerLb × estimatedWeightLb` lands
  // on values like 19.995000000000003, and a raw `!==` would tell the customer
  // their order changed by $0.00.
  it('ignores a difference smaller than a cent', () => {
    const noisy = line({}, 24.99 + 0.0000001);
    expect(findPriceChanges([noisy])).toEqual([]);
  });

  it('reports only the lines that moved', () => {
    const same = line();
    const moved = line({ _id: 'p2', name: 'Brisket', price: 30, packagePrice: 30 }, 20);
    expect(findPriceChanges([same, moved]).map((c) => c.productId)).toEqual(['p2']);
  });
});

describe('repriceLines', () => {
  it('returns the same array reference when nothing moved', () => {
    const lines = [line(), line({ _id: 'p2' })];
    expect(repriceLines(lines)).toBe(lines);
  });

  it('replaces the snapshot with what the shop will charge', () => {
    const stale = line({ price: 29.99, packagePrice: 29.99 }, 24.99);
    const [out] = repriceLines([stale]);
    expect(out.price).toBe(29.99);
  });

  it('leaves quantity and product untouched', () => {
    const stale = { ...line({ price: 29.99, packagePrice: 29.99 }, 24.99), quantity: 3 };
    const [out] = repriceLines([stale]);
    expect(out.quantity).toBe(3);
    expect(out.product).toBe(stale.product);
  });

  it('repriced lines report no further changes', () => {
    const stale = line({ price: 29.99, packagePrice: 29.99 }, 24.99);
    expect(findPriceChanges(repriceLines([stale]))).toEqual([]);
  });
});
