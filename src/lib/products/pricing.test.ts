import { describe, expect, it } from 'vitest';

import {
  backcompatPrice,
  backcompatUnit,
  calculateProductEstimate,
  getDisplayPrice,
  getDisplayWeight,
  isEstimatedPrice,
  stampPricingDerivedFields,
  unitPrice,
  type PricingView,
} from './pricing';

// Sample view per pricing type — enough fields filled in to exercise every
// branch the helpers care about. Tests perturb these or read them directly.
const fixedPackage: PricingView = {
  pricingType: 'fixed_package',
  packagePrice: 8.99,
  packageWeightLb: 1.5,
};

const perLb: PricingView = {
  pricingType: 'per_lb',
  pricePerLb: 24.99,
  estimatedWeightLb: 1,
  minWeightLb: 0.75,
  maxWeightLb: 1.25,
};

const wholeItem: PricingView = {
  pricingType: 'whole_item_by_weight',
  pricePerLb: 2.99,
  averageWeightLb: 3.75,
  minWeightLb: 3,
  maxWeightLb: 4.5,
};

const each: PricingView = {
  pricingType: 'each',
  unitPrice: 9.99,
};

const bundle: PricingView = {
  pricingType: 'bundle',
  bundlePrice: 89.99,
  includedItems: ['2.5 lb chicken thigh pack', '1 lb ground beef pack'],
};

describe('getDisplayPrice', () => {
  it('formats fixed_package as a flat dollar amount', () => {
    expect(getDisplayPrice(fixedPackage)).toBe('$8.99');
  });

  it('suffixes per_lb / whole_item_by_weight with /lb', () => {
    expect(getDisplayPrice(perLb)).toBe('$24.99/lb');
    expect(getDisplayPrice(wholeItem)).toBe('$2.99/lb');
  });

  it('suffixes each with the word "each"', () => {
    expect(getDisplayPrice(each)).toBe('$9.99 each');
  });

  it('formats bundle as a flat dollar amount', () => {
    expect(getDisplayPrice(bundle)).toBe('$89.99');
  });

  it('falls back to $0.00 when the canonical field is missing', () => {
    expect(getDisplayPrice({ pricingType: 'fixed_package' })).toBe('$0.00');
  });
});

describe('getDisplayWeight', () => {
  it('renders "{n} lb package" for fixed_package', () => {
    expect(getDisplayWeight(fixedPackage)).toBe('1.5 lb package');
  });

  it('renders "Approx. min–max lb cut" for per_lb with both bounds', () => {
    expect(getDisplayWeight(perLb)).toBe('Approx. 0.75–1.25 lb cut');
  });

  it('renders "Avg. min–max lb each" for whole_item_by_weight with both bounds', () => {
    expect(getDisplayWeight(wholeItem)).toBe('Avg. 3–4.5 lb each');
  });

  it('falls back to estimatedWeightLb when per_lb min/max are missing', () => {
    expect(
      getDisplayWeight({ pricingType: 'per_lb', pricePerLb: 19.99, estimatedWeightLb: 1 }),
    ).toBe('Approx. 1 lb cut');
  });

  it('falls back to averageWeightLb when whole_item min/max are missing', () => {
    expect(
      getDisplayWeight({ pricingType: 'whole_item_by_weight', pricePerLb: 4.99, averageWeightLb: 7 }),
    ).toBe('Avg. 7 lb each');
  });

  it('collapses min === max to a single weight in the range slot', () => {
    expect(
      getDisplayWeight({ ...perLb, minWeightLb: 1, maxWeightLb: 1 }),
    ).toBe('Approx. 1 lb cut');
  });

  it('returns empty string for each (price label already implies a unit)', () => {
    expect(getDisplayWeight(each)).toBe('');
  });

  it('joins includedItems for bundles', () => {
    expect(getDisplayWeight(bundle)).toBe(
      'Includes 2.5 lb chicken thigh pack, 1 lb ground beef pack',
    );
  });

  it('returns empty string for bundles without includedItems', () => {
    expect(
      getDisplayWeight({ pricingType: 'bundle', bundlePrice: 49.99 }),
    ).toBe('');
  });

  it('returns empty string when fixed_package has no packageWeightLb', () => {
    expect(
      getDisplayWeight({ pricingType: 'fixed_package', packagePrice: 8.99 }),
    ).toBe('');
  });
});

describe('isEstimatedPrice', () => {
  it.each([
    ['fixed_package', fixedPackage, false],
    ['per_lb', perLb, true],
    ['whole_item_by_weight', wholeItem, true],
    ['each', each, false],
    ['bundle', bundle, false],
  ] as const)('%s → %s', (_label, view, expected) => {
    expect(isEstimatedPrice(view)).toBe(expected);
  });
});

describe('calculateProductEstimate', () => {
  it('multiplies packagePrice by qty for fixed_package', () => {
    expect(calculateProductEstimate(fixedPackage, 2)).toBeCloseTo(17.98, 5);
  });

  it('multiplies pricePerLb × estimatedWeightLb × qty for per_lb', () => {
    // 2 × 1 × 24.99 = 49.98
    expect(calculateProductEstimate(perLb, 2)).toBeCloseTo(49.98, 5);
  });

  it('multiplies pricePerLb × averageWeightLb × qty for whole_item_by_weight', () => {
    // 1 × 3.75 × 2.99 = 11.2125
    expect(calculateProductEstimate(wholeItem, 1)).toBeCloseTo(11.2125, 5);
  });

  it('multiplies unitPrice by qty for each', () => {
    expect(calculateProductEstimate(each, 3)).toBeCloseTo(29.97, 5);
  });

  it('multiplies bundlePrice by qty for bundle', () => {
    expect(calculateProductEstimate(bundle, 2)).toBeCloseTo(179.98, 5);
  });

  it('returns 0 when the canonical field is missing', () => {
    expect(calculateProductEstimate({ pricingType: 'fixed_package' }, 5)).toBe(0);
  });
});


describe('unitPrice', () => {
  it('returns packagePrice for fixed_package', () => {
    expect(unitPrice(fixedPackage)).toBe(8.99);
  });

  it('returns pricePerLb × estimatedWeightLb for per_lb', () => {
    // 24.99 × 1 = 24.99
    expect(unitPrice(perLb)).toBeCloseTo(24.99, 5);
  });

  it('returns pricePerLb × averageWeightLb for whole_item_by_weight', () => {
    // 2.99 × 3.75 = 11.2125
    expect(unitPrice(wholeItem)).toBeCloseTo(11.2125, 5);
  });

  it('returns unitPrice for each', () => {
    expect(unitPrice(each)).toBe(9.99);
  });

  it('returns bundlePrice for bundle', () => {
    expect(unitPrice(bundle)).toBe(89.99);
  });

  it('falls back to legacyPrice when pricingType is missing', () => {
    expect(unitPrice({ pricingType: undefined as never }, 42)).toBe(42);
  });

  it('falls back to 0 when pricingType is missing and no legacyPrice given', () => {
    expect(unitPrice({ pricingType: undefined as never })).toBe(0);
  });

  it('does NOT use legacyPrice when pricingType is set', () => {
    // Even with a legacyPrice argument, a set pricingType wins.
    expect(unitPrice(perLb, 99999)).toBeCloseTo(24.99, 5);
  });
});

describe('backcompatPrice / backcompatUnit', () => {
  it('picks the right price field per type', () => {
    expect(backcompatPrice(fixedPackage)).toBe(8.99);
    expect(backcompatPrice(perLb)).toBe(24.99);
    expect(backcompatPrice(wholeItem)).toBe(2.99);
    expect(backcompatPrice(each)).toBe(9.99);
    expect(backcompatPrice(bundle)).toBe(89.99);
  });

  it('returns 0 when the canonical field is missing', () => {
    expect(backcompatPrice({ pricingType: 'per_lb' })).toBe(0);
  });

  it('maps each + bundle to "each", everything else to "lb"', () => {
    expect(backcompatUnit(fixedPackage)).toBe('lb');
    expect(backcompatUnit(perLb)).toBe('lb');
    expect(backcompatUnit(wholeItem)).toBe('lb');
    expect(backcompatUnit(each)).toBe('each');
    expect(backcompatUnit(bundle)).toBe('each');
  });
});

describe('stampPricingDerivedFields', () => {
  // The Product model's pre-validate hook and the CSV importer both call
  // this helper, so the stamped bag must equal the per-helper results.
  it('produces the same fields as the individual getters', () => {
    for (const view of [fixedPackage, perLb, wholeItem, each, bundle]) {
      const stamped = stampPricingDerivedFields(view);
      expect(stamped.price).toBe(backcompatPrice(view));
      expect(stamped.unit).toBe(backcompatUnit(view));
      expect(stamped.displayPriceLabel).toBe(getDisplayPrice(view));
      expect(stamped.displayWeightLabel).toBe(getDisplayWeight(view));
      expect(stamped.isEstimatedPrice).toBe(isEstimatedPrice(view));
    }
  });

  it('stamps the canonical fields for a per_lb cut', () => {
    expect(stampPricingDerivedFields(perLb)).toEqual({
      price: 24.99,
      unit: 'lb',
      displayPriceLabel: '$24.99/lb',
      displayWeightLabel: 'Approx. 0.75–1.25 lb cut',
      isEstimatedPrice: true,
    });
  });

  it('stamps the canonical fields for a fixed_package cut', () => {
    expect(stampPricingDerivedFields(fixedPackage)).toEqual({
      price: 8.99,
      unit: 'lb',
      displayPriceLabel: '$8.99',
      displayWeightLabel: '1.5 lb package',
      isEstimatedPrice: false,
    });
  });

  it('stamps the canonical fields for a bundle', () => {
    expect(stampPricingDerivedFields(bundle)).toEqual({
      price: 89.99,
      unit: 'each',
      displayPriceLabel: '$89.99',
      displayWeightLabel: 'Includes 2.5 lb chicken thigh pack, 1 lb ground beef pack',
      isEstimatedPrice: false,
    });
  });
});
