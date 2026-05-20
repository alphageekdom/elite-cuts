import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';

import {
  estimatedLineTotal,
  estimatedSubtotal,
  hasRealizedWeight,
  isVariableWeightLine,
  orderHasRealizedDifference,
  realizedLineTotal,
  realizedOrderTotal,
  realizedSubtotal,
} from './order-line';
import { buildLine, type OrderProductLean } from './orderBuilder';
import { refundSummary } from './order-refunds';

// Sample lines per pricingType. Each is the shape after `buildLine` ran
// at checkout, with `realizedWeightLb` left undefined until an admin
// enters it.
const fixedPackageLine = {
  qty: 2,
  price: 8.99,
  pricingType: 'fixed_package' as const,
} as const;

const perLbLine = {
  qty: 1,
  // unitPrice — $24.99/lb × 1 lb estimated
  price: 24.99,
  pricingType: 'per_lb' as const,
  pricePerLb: 24.99,
  estimatedWeightLb: 1,
} as const;

const wholeItemLine = {
  qty: 1,
  // unitPrice — $2.99/lb × 3.75 lb avg
  price: 11.2125,
  pricingType: 'whole_item_by_weight' as const,
  pricePerLb: 2.99,
  estimatedWeightLb: 3.75,
} as const;

const eachLine = {
  qty: 3,
  price: 9.99,
  pricingType: 'each' as const,
} as const;

const bundleLine = {
  qty: 2,
  price: 89.99,
  pricingType: 'bundle' as const,
} as const;

const legacyLine = {
  qty: 2,
  price: 12.5,
  // Pre-Phase-3 order — no pricingType snapshotted. Explicit undefined
  // so TS sees the field on the literal type.
  pricingType: undefined,
} as const;

describe('isVariableWeightLine', () => {
  it.each([
    ['per_lb', perLbLine, true],
    ['whole_item_by_weight', wholeItemLine, true],
    ['fixed_package', fixedPackageLine, false],
    ['each', eachLine, false],
    ['bundle', bundleLine, false],
    ['legacy (no pricingType)', legacyLine, false],
  ] as const)('%s → %s', (_, line, expected) => {
    expect(isVariableWeightLine(line)).toBe(expected);
  });
});

describe('estimatedLineTotal', () => {
  it('always returns qty × price regardless of pricingType', () => {
    expect(estimatedLineTotal(fixedPackageLine)).toBeCloseTo(17.98, 5);
    expect(estimatedLineTotal(perLbLine)).toBeCloseTo(24.99, 5);
    expect(estimatedLineTotal(wholeItemLine)).toBeCloseTo(11.21, 2);
    expect(estimatedLineTotal(eachLine)).toBeCloseTo(29.97, 5);
    expect(estimatedLineTotal(bundleLine)).toBeCloseTo(179.98, 5);
    expect(estimatedLineTotal(legacyLine)).toBeCloseTo(25, 5);
  });
});

describe('hasRealizedWeight', () => {
  it('is true only when pricingType is variable AND both pricePerLb and realizedWeightLb are set', () => {
    expect(hasRealizedWeight(perLbLine)).toBe(false);
    expect(hasRealizedWeight({ ...perLbLine, realizedWeightLb: 1.2 })).toBe(true);
    expect(hasRealizedWeight({ ...wholeItemLine, realizedWeightLb: 3.5 })).toBe(true);
    // A fixed_package line with a realized weight is still false — the
    // line wasn't priced by weight in the first place.
    expect(hasRealizedWeight({ ...fixedPackageLine, realizedWeightLb: 5 })).toBe(false);
    // Zero or negative realized weight is treated as unset.
    expect(hasRealizedWeight({ ...perLbLine, realizedWeightLb: 0 })).toBe(false);
  });

  it('is false when pricePerLb is missing on a variable line', () => {
    expect(
      hasRealizedWeight({
        qty: 1,
        price: 24.99,
        pricingType: 'per_lb',
        realizedWeightLb: 1.2,
      }),
    ).toBe(false);
  });
});

describe('realizedLineTotal', () => {
  it('returns the realized total (pricePerLb × realizedWeightLb) when set', () => {
    expect(
      realizedLineTotal({ ...perLbLine, realizedWeightLb: 1.2 }),
    ).toBeCloseTo(29.99, 2);
  });

  it('ignores qty in the realized math — one combined weight per line', () => {
    // qty 2 ribeyes weighed together at 2.6 lb totals pricePerLb × 2.6,
    // not pricePerLb × 2.6 × qty.
    expect(
      realizedLineTotal({ ...perLbLine, qty: 2, realizedWeightLb: 2.6 }),
    ).toBeCloseTo(64.97, 2);
  });

  it('falls back to qty × price when no realized weight is set', () => {
    expect(realizedLineTotal(perLbLine)).toBeCloseTo(24.99, 5);
    expect(realizedLineTotal(fixedPackageLine)).toBeCloseTo(17.98, 5);
    expect(realizedLineTotal(legacyLine)).toBeCloseTo(25, 5);
  });

  it('falls back to qty × price when realized weight is set on a fixed line', () => {
    expect(
      realizedLineTotal({ ...fixedPackageLine, realizedWeightLb: 5 } as never),
    ).toBeCloseTo(17.98, 5);
  });
});

describe('realizedSubtotal + estimatedSubtotal', () => {
  it('aggregate across a mixed order', () => {
    const lines = [
      { ...perLbLine, realizedWeightLb: 1.25 }, // realized 31.24
      { ...fixedPackageLine }, // 17.98
      { ...wholeItemLine }, // estimate 11.21
    ];
    expect(realizedSubtotal(lines)).toBeCloseTo(31.24 + 17.98 + 11.21, 1);
    expect(estimatedSubtotal(lines)).toBeCloseTo(24.99 + 17.98 + 11.21, 1);
  });
});

describe('orderHasRealizedDifference', () => {
  it('is true when at least one variable line was weighed and the realized differs', () => {
    expect(
      orderHasRealizedDifference([
        fixedPackageLine,
        { ...perLbLine, realizedWeightLb: 1.2 },
      ]),
    ).toBe(true);
  });

  it('is false when every realized weight equals its estimate', () => {
    expect(
      orderHasRealizedDifference([
        { ...perLbLine, realizedWeightLb: 1 }, // same as estimate
      ]),
    ).toBe(false);
  });

  it('is false when no realized weights are on file', () => {
    expect(orderHasRealizedDifference([fixedPackageLine, perLbLine])).toBe(false);
  });
});

// ---- snapshot builder (orderBuilder.buildLine) ----

function product(overrides: Partial<OrderProductLean> = {}): OrderProductLean {
  return {
    _id: new Types.ObjectId(),
    name: 'Ribeye Steak',
    price: 24.99,
    images: ['ribeye.jpg'],
    category: 'Beef',
    stockCount: 10,
    ...overrides,
  };
}

describe('buildLine snapshot', () => {
  it('stamps pricingType + pricePerLb + estimatedWeightLb for per_lb cuts', () => {
    const line = buildLine(
      product({
        pricingType: 'per_lb',
        pricePerLb: 24.99,
        estimatedWeightLb: 1,
        minWeightLb: 0.75,
        maxWeightLb: 1.25,
        displayPriceLabel: '$24.99/lb',
        displayWeightLabel: 'Approx. 0.75–1.25 lb cut',
      }),
      2,
    );
    expect(line.pricingType).toBe('per_lb');
    expect(line.pricePerLb).toBe(24.99);
    expect(line.estimatedWeightLb).toBe(1);
    expect(line.minWeightLb).toBe(0.75);
    expect(line.maxWeightLb).toBe(1.25);
    expect(line.displayPriceLabel).toBe('$24.99/lb');
    expect(line.displayWeightLabel).toBe('Approx. 0.75–1.25 lb cut');
  });

  it('maps whole_item_by_weight averageWeightLb → snapshotted estimatedWeightLb', () => {
    const line = buildLine(
      product({
        pricingType: 'whole_item_by_weight',
        pricePerLb: 2.99,
        averageWeightLb: 3.75,
        minWeightLb: 3,
        maxWeightLb: 4.5,
      }),
      1,
    );
    expect(line.pricingType).toBe('whole_item_by_weight');
    expect(line.pricePerLb).toBe(2.99);
    expect(line.estimatedWeightLb).toBe(3.75);
  });

  it('uses unitPrice for the line price on per_lb (closes the pre-Phase-3 over-charge)', () => {
    // A $39.99/lb filet at 0.5 lb estimated. Before Phase 3 buildLine
    // copied product.price ($39.99/lb) verbatim; now it stores the
    // per-unit estimated cost so `price × qty` lines up with what
    // Stripe should charge.
    const line = buildLine(
      product({
        price: 39.99,
        pricingType: 'per_lb',
        pricePerLb: 39.99,
        estimatedWeightLb: 0.5,
      }),
      1,
    );
    expect(line.price).toBeCloseTo(19.995, 3);
  });

  it('snapshots flat product.price for fixed_package + each + bundle', () => {
    const fixed = buildLine(
      product({ price: 8.99, pricingType: 'fixed_package', packagePrice: 8.99 }),
      1,
    );
    expect(fixed.price).toBe(8.99);
    expect(fixed.pricingType).toBe('fixed_package');
    expect(fixed.pricePerLb).toBeUndefined();
    expect(fixed.estimatedWeightLb).toBeUndefined();

    const each = buildLine(
      product({ price: 9.99, pricingType: 'each', unitPrice: 9.99 }),
      3,
    );
    expect(each.price).toBe(9.99);
    expect(each.pricingType).toBe('each');
    expect(each.pricePerLb).toBeUndefined();

    const bundle = buildLine(
      product({ price: 89.99, pricingType: 'bundle', bundlePrice: 89.99 }),
      1,
    );
    expect(bundle.price).toBe(89.99);
    expect(bundle.pricingType).toBe('bundle');
  });

  it('falls back to legacy product.price for products with no pricingType', () => {
    const line = buildLine(product({ price: 12.5 }), 2);
    expect(line.price).toBe(12.5);
    expect(line.pricingType).toBeUndefined();
    expect(line.pricePerLb).toBeUndefined();
  });
});

// ---- refund math (uses realizedLineTotal) ----

describe('realizedOrderTotal', () => {
  it('matches the original total when no realized weights are set', () => {
    // Single per_lb line at $24.99 estimated, no discounts, 10% tax.
    const total = realizedOrderTotal({
      lines: [perLbLine],
      subtotal: 24.99,
      tax: 2.5,
    });
    expect(total).toBeCloseTo(24.99 + 2.5, 2);
  });

  it('scales tax against the realized subtotal via the original ratio', () => {
    // Order subtotal $24.99 + tax $2.50 → effective tax rate 10.004%.
    // Realized at 1.5 lb → realized subtotal 37.485.
    // Expected tax: 37.485 × (2.5 / 24.99) ≈ 3.75
    // Expected total: 37.485 + 3.75 ≈ 41.24
    const total = realizedOrderTotal({
      lines: [{ ...perLbLine, realizedWeightLb: 1.5 }],
      subtotal: 24.99,
      tax: 2.5,
    });
    expect(total).toBeCloseTo(41.24, 1);
  });

  it('subtracts the discount stack before tax', () => {
    // Subtotal 50, member 2.50, promo 5, points 100¢ ($1).
    // Realized matches estimate so subtotal stays 50.
    // After discounts: 50 - 2.5 - 5 - 1 = 41.5
    // Tax ratio 10% → tax 4.15 → total 45.65
    const total = realizedOrderTotal({
      lines: [{ qty: 2, price: 25 } as never],
      subtotal: 50,
      tax: 5,
      memberDiscount: 2.5,
      promoDiscount: 5,
      pointsRedemptionValueCents: 100,
    });
    expect(total).toBeCloseTo(45.65, 1);
  });

  it('adds the delivery fee outside the discount + tax stack', () => {
    const withFee = realizedOrderTotal({
      lines: [fixedPackageLine], // 17.98 estimate, no realized math
      subtotal: 17.98,
      tax: 1.5,
      deliveryFee: 8,
    });
    const withoutFee = realizedOrderTotal({
      lines: [fixedPackageLine],
      subtotal: 17.98,
      tax: 1.5,
    });
    expect(withFee - withoutFee).toBeCloseTo(8, 2);
  });

  it('floors at zero when discounts exceed the realized subtotal', () => {
    const total = realizedOrderTotal({
      lines: [fixedPackageLine], // 17.98
      subtotal: 17.98,
      tax: 1.5,
      memberDiscount: 100, // wipes out the order
    });
    // Discounts floor to 0 → tax becomes 0 too.
    expect(total).toBe(0);
  });
});

describe('refundSummary respects realized weight', () => {
  it('refunds the realized total for a weighed variable-weight line', () => {
    const items = [
      // Variable-weight line: estimated $24.99, weighed at 1.3 lb → $32.49
      { ...perLbLine, refunded: true, realizedWeightLb: 1.3 },
    ];
    const summary = refundSummary(items, { subtotal: 32.49, tax: 0 });
    expect(summary.refundedSubtotal).toBeCloseTo(32.49, 2);
  });

  it('refunds the estimate when no realized weight is on file', () => {
    const items = [
      { ...perLbLine, refunded: true },
    ];
    const summary = refundSummary(items, { subtotal: 24.99, tax: 0 });
    expect(summary.refundedSubtotal).toBeCloseTo(24.99, 2);
  });

  it('mixes realized and unfulfilled lines in the same order', () => {
    const items = [
      { ...perLbLine, refunded: true, realizedWeightLb: 1.5 }, // realized $37.485
      { ...fixedPackageLine, refunded: true }, // $17.98
      { ...eachLine, refunded: false }, // not refunded — excluded
    ];
    const summary = refundSummary(items, { subtotal: 100, tax: 0 });
    expect(summary.refundedSubtotal).toBeCloseTo(37.49 + 17.98, 1);
    expect(summary.refundedCount).toBe(2);
  });
});
