import { formatMoney } from '@/lib/format';
import { PRICING_TYPE_IS_ESTIMATED, type PricingType } from '@/lib/products/constants';

// Per-product pricing helpers. Cart-level totals (subtotal, tax, member
// discount) live in `src/lib/pricing.ts` — different scope, kept separate.
//
// `PricingView` is the subset of a product these helpers care about. Both
// the Product model and the admin form's draft state shape into this view
// before calling any helper. Per-type field requirements are enforced by
// the Zod schema at `./schema.ts`; this utility assumes a valid input and
// falls back to 0 / empty string for any missing field.
export type PricingView = {
  pricingType: PricingType;
  packagePrice?: number;
  packageWeightLb?: number;
  pricePerLb?: number;
  estimatedWeightLb?: number;
  averageWeightLb?: number;
  minWeightLb?: number;
  maxWeightLb?: number;
  unitPrice?: number;
  bundlePrice?: number;
  includedItems?: string[];
};

// Weight range label used by per_lb and whole_item_by_weight. Falls back to
// the single fallback weight when min/max aren't both present.
function formatWeightRange(
  min: number | undefined,
  max: number | undefined,
  fallback: number | undefined,
): string {
  if (typeof min === 'number' && typeof max === 'number') {
    return min === max ? `${min} lb` : `${min}–${max} lb`;
  }
  if (typeof fallback === 'number') return `${fallback} lb`;
  return '';
}

// "$8.99", "$24.99/lb", "$9.99 each", etc. Stored on the product (stamped
// by the pre-save hook) so the catalog and cart render without re-deriving.
export function getDisplayPrice(p: PricingView): string {
  switch (p.pricingType) {
    case 'fixed_package':
      return formatMoney(p.packagePrice ?? 0);
    case 'per_lb':
    case 'whole_item_by_weight':
      return `${formatMoney(p.pricePerLb ?? 0)}/lb`;
    case 'each':
      return `${formatMoney(p.unitPrice ?? 0)} each`;
    case 'bundle':
      return formatMoney(p.bundlePrice ?? 0);
  }
}

// "1.5 lb package", "Approx. 0.75–1.25 lb cut", "Avg. 3–4.5 lb each",
// "Includes …" — empty string for `each` (price label already implies one).
export function getDisplayWeight(p: PricingView): string {
  switch (p.pricingType) {
    case 'fixed_package':
      return typeof p.packageWeightLb === 'number'
        ? `${p.packageWeightLb} lb package`
        : '';
    case 'per_lb': {
      const range = formatWeightRange(p.minWeightLb, p.maxWeightLb, p.estimatedWeightLb);
      return range ? `Approx. ${range} cut` : '';
    }
    case 'whole_item_by_weight': {
      const range = formatWeightRange(p.minWeightLb, p.maxWeightLb, p.averageWeightLb);
      return range ? `Avg. ${range} each` : '';
    }
    case 'each':
      return '';
    case 'bundle':
      return p.includedItems?.length ? `Includes ${p.includedItems.join(', ')}` : '';
  }
}

// Whether the final checkout total is exact or best-effort (depends on the
// actual cut weight). Cart's "Estimated Total" copy in Phase 2 keys off this.
export function isEstimatedPrice(p: PricingView): boolean {
  return PRICING_TYPE_IS_ESTIMATED[p.pricingType];
}

// Single-line best-guess total. For variable-weight cuts the returned
// number is estimated/average weight × per-lb price × qty; the per-line
// range comes from calculateProductEstimateRange.
export function calculateProductEstimate(p: PricingView, quantity: number): number {
  switch (p.pricingType) {
    case 'fixed_package':
      return quantity * (p.packagePrice ?? 0);
    case 'per_lb':
      return quantity * (p.estimatedWeightLb ?? 0) * (p.pricePerLb ?? 0);
    case 'whole_item_by_weight':
      return quantity * (p.averageWeightLb ?? 0) * (p.pricePerLb ?? 0);
    case 'each':
      return quantity * (p.unitPrice ?? 0);
    case 'bundle':
      return quantity * (p.bundlePrice ?? 0);
  }
}

// Min/max line total for variable-weight cuts. Returns null for fixed
// pricing types — the caller knows the single value is exact.
export function calculateProductEstimateRange(
  p: PricingView,
  quantity: number,
): { min: number; max: number } | null {
  if (p.pricingType !== 'per_lb' && p.pricingType !== 'whole_item_by_weight') {
    return null;
  }
  if (typeof p.minWeightLb !== 'number' || typeof p.maxWeightLb !== 'number' || typeof p.pricePerLb !== 'number') {
    return null;
  }
  return {
    min: quantity * p.minWeightLb * p.pricePerLb,
    max: quantity * p.maxWeightLb * p.pricePerLb,
  };
}

// Backcompat: collapse the canonical per-type fields into the single
// `price: number` the existing customer UI still reads. Per-lb cuts return
// the per-lb rate — Phase 2 lands proper display labels on catalog + cart
// and these will stop being read.
export function backcompatPrice(p: PricingView): number {
  switch (p.pricingType) {
    case 'fixed_package':
      return p.packagePrice ?? 0;
    case 'per_lb':
    case 'whole_item_by_weight':
      return p.pricePerLb ?? 0;
    case 'each':
      return p.unitPrice ?? 0;
    case 'bundle':
      return p.bundlePrice ?? 0;
  }
}

// Backcompat: implied unit token for the existing `unit` field. Phase 2
// drops `unit` once the customer UI stops reading it.
export function backcompatUnit(p: PricingView): 'lb' | 'each' {
  return p.pricingType === 'each' || p.pricingType === 'bundle' ? 'each' : 'lb';
}
