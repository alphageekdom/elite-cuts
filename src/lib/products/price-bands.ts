import type { ProductCategory } from '@/lib/admin/constants';
import type { PricingType } from '@/lib/products/constants';

// Realistic per-category, per-pricingType price ranges drawn from the
// spec's price-bands tables (sections "Chicken / Beef / Pork / Lamb /
// Prepared / Bundles Price Bands"). Bands are deliberately wide enough
// to cover every cut within a category — the admin form uses these as
// soft guardrails, not hard validation: a genuinely low promo price
// still saves, the admin just sees a warning chip.
//
// `min` and `max` are inclusive; either can be omitted to skip that side
// of the check (Bundles has no upper cap; the Sausage category doesn't
// have a per-lb path at all).
type Band = { min?: number; max?: number };

const BANDS: Partial<Record<ProductCategory, Partial<Record<PricingType, Band>>>> = {
  Chicken: {
    fixed_package: { min: 5.99, max: 15.99 },
    per_lb:        { min: 1.99, max: 7.99 },
    whole_item_by_weight: { min: 2.49, max: 6.99 },
    each:          { min: 7.99, max: 12.99 },
  },
  Beef: {
    fixed_package: { min: 6.99, max: 14.99 },
    per_lb:        { min: 7.99, max: 49.99 },
    whole_item_by_weight: { min: 6.99, max: 11.99 },
  },
  Pork: {
    fixed_package: { min: 5.99, max: 12.99 },
    per_lb:        { min: 4.99, max: 11.99 },
    whole_item_by_weight: { min: 3.99, max: 6.99 },
  },
  Lamb: {
    fixed_package: { min: 9.99, max: 14.99 },
    per_lb:        { min: 8.99, max: 29.99 },
    whole_item_by_weight: { min: 9.99, max: 34.99 },
  },
  Sausage: {
    fixed_package: { min: 6.99, max: 13.99 },
  },
  Prepared: {
    fixed_package: { min: 8.99, max: 19.99 },
    each:          { min: 7.99, max: 12.99 },
  },
  Bundles: {
    bundle: { min: 59.99, max: 399.99 },
  },
};

// Which canonical pricing field gets compared to the band. The admin form
// renders one numeric input per pricingType; this maps that input back to
// a single check.
export const PRICE_BAND_FIELD: Record<PricingType, 'packagePrice' | 'pricePerLb' | 'unitPrice' | 'bundlePrice'> = {
  fixed_package: 'packagePrice',
  per_lb: 'pricePerLb',
  whole_item_by_weight: 'pricePerLb',
  each: 'unitPrice',
  bundle: 'bundlePrice',
};

// Human-readable price-suffix, so "$24.99/lb" reads right for per-lb cuts
// and "$8.99" reads right for packages. Also surfaces in the admin products
// table-row price cell for the same reason — a bundle was previously showing
// as "$89.99/lb".
export const UNIT_SUFFIX: Record<PricingType, string> = {
  fixed_package: 'per pack',
  per_lb: '/lb',
  whole_item_by_weight: '/lb',
  each: 'each',
  bundle: '',
};

// Stock unit displayed alongside the integer stockCount in the products
// table-row stock cell. Bundles and `each` items count units, not pounds.
export const STOCK_UNIT: Record<PricingType, string> = {
  fixed_package: 'packs',
  per_lb: 'lb',
  whole_item_by_weight: 'lb',
  each: 'units',
  bundle: 'bundles',
};

const fmt = (n: number) => `$${n.toFixed(2)}`;

// Returns a soft warning string when the typed price falls outside the
// realistic band for the chosen category + pricingType. Returns null when:
//   - inputs are incomplete (no value yet, no pricingType, etc.),
//   - no band is defined for the combination, or
//   - the value sits inside the band.
//
// Non-blocking by design — the admin saves through any warning.
export function checkPriceBand(opts: {
  category: ProductCategory | string;
  pricingType: PricingType | string | undefined;
  value: number | undefined;
}): string | null {
  if (!opts.pricingType || typeof opts.value !== 'number' || !Number.isFinite(opts.value) || opts.value <= 0) {
    return null;
  }
  const categoryBands = BANDS[opts.category as ProductCategory];
  if (!categoryBands) return null;
  const band = categoryBands[opts.pricingType as PricingType];
  if (!band) return null;

  const unit = UNIT_SUFFIX[opts.pricingType as PricingType];
  const suffix = unit ? ` ${unit}` : '';
  const rangeStr = (() => {
    const hasMin = typeof band.min === 'number';
    const hasMax = typeof band.max === 'number';
    if (hasMin && hasMax) return `${fmt(band.min!)}–${fmt(band.max!)}`;
    if (hasMin) return `at least ${fmt(band.min!)}`;
    if (hasMax) return `up to ${fmt(band.max!)}`;
    return '';
  })();

  if (typeof band.min === 'number' && opts.value < band.min) {
    return `Looks low for ${opts.category}${suffix} — typical range is ${rangeStr}${suffix}.`;
  }
  if (typeof band.max === 'number' && opts.value > band.max) {
    return `Looks high for ${opts.category}${suffix} — typical range is ${rangeStr}${suffix}.`;
  }
  return null;
}
