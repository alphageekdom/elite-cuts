import { describe, expect, it } from 'vitest';

import {
  applyAddToLines,
  dedupeLines,
  removeFromLines,
  setQuantityOnLines,
  type CartLineOf,
  type LineProduct,
} from './lines';

// A fixed-price product: `unitPrice` is the literal package price.
const bacon = {
  _id: 'bacon',
  price: 9.99,
  pricingType: 'fixed_package',
  packagePrice: 9.99,
  packageWeightLb: 0.75,
} satisfies LineProduct;

// A per-lb cut. The snapshot must be rate × typical weight (0.5 × 39.99),
// NOT the bare per-lb rate — charging the rate for a half-pound cut is the
// bug the pricing phases fixed.
const filet = {
  _id: 'filet',
  price: 39.99,
  pricingType: 'per_lb',
  pricePerLb: 39.99,
  estimatedWeightLb: 0.5,
} satisfies LineProduct;

// Pre-pricing-phase shape: no pricingType, so `unitPrice` falls back to the
// legacy `price` field. Old guest carts in localStorage still look like this.
const legacy = { _id: 'legacy', price: 12.5 } satisfies LineProduct;

function line<P extends LineProduct>(
  product: P,
  quantity: number,
  price: number,
): CartLineOf<P> {
  return { product, quantity, price };
}

describe('dedupeLines', () => {
  it('folds duplicate product lines, summing quantities', () => {
    const result = dedupeLines([
      line(bacon, 2, 9.99),
      line(filet, 1, 19.995),
      line(bacon, 3, 9.99),
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].quantity).toBe(5);
    expect(result[1].product._id).toBe('filet');
  });

  it('keeps the first line’s price when folding', () => {
    // The fold must not re-price. A duplicate carrying a different snapshot
    // (a legacy doc, or a line added before a catalog change) can't move what
    // the customer was already quoted.
    const result = dedupeLines([line(bacon, 1, 8.5), line(bacon, 1, 9.99)]);

    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(8.5);
    expect(result[0].quantity).toBe(2);
  });

  it('drops lines with no product id', () => {
    const orphan = { product: { _id: '' }, quantity: 1, price: 5 };
    expect(dedupeLines([orphan, line(bacon, 1, 9.99)])).toHaveLength(1);
  });

  it('drops lines whose quantity is not a usable count', () => {
    // NaN is the one that matters: it fails every comparison, so an unguarded
    // NaN survives a `quantity <= 0` filter and renders as "NaN".
    const corrupt = [
      { product: bacon, quantity: Number.NaN, price: 9.99 },
      { product: filet, quantity: 0, price: 19.995 },
      { product: legacy, quantity: -3, price: 12.5 },
    ];

    expect(dedupeLines(corrupt)).toEqual([]);
  });

  it('truncates a fractional quantity rather than dropping the line', () => {
    const result = dedupeLines([{ product: bacon, quantity: 2.7, price: 9.99 }]);
    expect(result[0].quantity).toBe(2);
  });

  it('reads an unusable price as zero instead of poisoning the total', () => {
    const result = dedupeLines([
      { product: bacon, quantity: 1, price: Number.NaN },
    ]);
    expect(result[0].price).toBe(0);
  });
});

describe('applyAddToLines', () => {
  it('snapshots the per-unit estimate on a new line', () => {
    const [added] = applyAddToLines([], filet, 1);

    // 0.5 lb × $39.99/lb — not the $39.99 rate.
    expect(added.price).toBeCloseTo(19.995, 5);
    expect(added.quantity).toBe(1);
  });

  it('falls back to the legacy price when the product has no pricing type', () => {
    const [added] = applyAddToLines([], legacy, 1);
    expect(added.price).toBe(12.5);
  });

  it('increments an existing line without re-snapshotting its price', () => {
    // The customer was quoted 19.995. Even if the catalog moved underneath
    // them, adding a second one must not silently reprice the first.
    const existing = [line(filet, 1, 19.995)];
    const result = applyAddToLines(existing, { ...filet, pricePerLb: 44.99 }, 2);

    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
    expect(result[0].price).toBeCloseTo(19.995, 5);
  });

  it('does not mutate the input array', () => {
    const existing = [line(bacon, 1, 9.99)];
    applyAddToLines(existing, bacon, 1);
    expect(existing[0].quantity).toBe(1);
  });

  it('ignores an unusable add quantity', () => {
    const existing = [line(bacon, 2, 9.99)];
    expect(applyAddToLines(existing, bacon, Number.NaN)).toEqual(existing);
    expect(applyAddToLines(existing, bacon, 0)).toEqual(existing);
    expect(applyAddToLines(existing, bacon, -1)).toEqual(existing);
  });
});

describe('setQuantityOnLines', () => {
  it('sets an absolute quantity on the matching line only', () => {
    const lines = [line(bacon, 1, 9.99), line(filet, 2, 19.995)];
    const result = setQuantityOnLines(lines, 'bacon', 4);

    expect(result[0].quantity).toBe(4);
    expect(result[1].quantity).toBe(2);
  });

  it('removes the line at zero or below — what every stepper relies on at 1', () => {
    const lines = [line(bacon, 1, 9.99), line(filet, 2, 19.995)];

    expect(setQuantityOnLines(lines, 'bacon', 0)).toHaveLength(1);
    expect(setQuantityOnLines(lines, 'bacon', -2)).toHaveLength(1);
  });

  it('removes the line for a NaN quantity rather than storing NaN', () => {
    const lines = [line(bacon, 1, 9.99)];
    expect(setQuantityOnLines(lines, 'bacon', Number.NaN)).toEqual([]);
  });

  it('leaves the cart untouched when the product is not in it', () => {
    const lines = [line(bacon, 1, 9.99)];
    expect(setQuantityOnLines(lines, 'ribeye', 3)).toEqual(lines);
  });
});

describe('removeFromLines', () => {
  it('removes only the matching product', () => {
    const lines = [line(bacon, 1, 9.99), line(filet, 2, 19.995)];
    const result = removeFromLines(lines, 'bacon');

    expect(result).toHaveLength(1);
    expect(result[0].product._id).toBe('filet');
  });

  it('is a no-op for a product that is not in the cart', () => {
    const lines = [line(bacon, 1, 9.99)];
    expect(removeFromLines(lines, 'ribeye')).toEqual(lines);
  });
});
