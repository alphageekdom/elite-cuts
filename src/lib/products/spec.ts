import {
  QUALITY_TIER_LABEL,
  type MeatQualityTier,
  type PricingType,
} from '@/lib/products/constants';

// Spec-strip cells for the product detail buy panel.
//
// These replaced a Category / Condition / Status / Arrival strip where two
// cells duplicated signal already on the page (the category sits in the meta
// row above the title, the stock state sits in the buy block) and `Arrival`
// rendered a bare em-dash for every product that wasn't flagged new. The
// three cells here all come from fields the catalog actually populates:
// `cutType` and `qualityTier` are set on 39/39 seeded products, and the
// weight cell derives from the same per-pricingType fields the price label
// already reads.
//
// Kept separate from `./pricing.ts` because the strings differ: the pricing
// helpers produce prose for the buy block ("Approx. 0.75–1.25 lb cut") while
// a spec cell wants the bare value ("0.75–1.25 lb").

export type SpecView = {
  pricingType?: PricingType;
  packageWeightLb?: number;
  estimatedWeightLb?: number;
  averageWeightLb?: number;
  minWeightLb?: number;
  maxWeightLb?: number;
  cutType?: string;
  qualityTier?: MeatQualityTier;
};

export type SpecCell = { label: string; value: string };

const EMPTY = '—';

// "0.75–1.25 lb" when both bounds are present, "1.5 lb" when they're equal
// or only a single fallback weight exists.
function weightRange(
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

// The weight cell. Weighed cuts (per_lb / whole_item_by_weight) show their
// range; packages show their fixed weight; `each` and `bundle` aren't sold by
// weight at all, so they get a label describing how they ARE sold rather than
// an empty cell — 24 of the 39 seeded products fall into that group.
export function getSpecWeight(p: SpecView): string {
  switch (p.pricingType) {
    case 'fixed_package':
      return typeof p.packageWeightLb === 'number' ? `${p.packageWeightLb} lb` : EMPTY;
    case 'per_lb':
      return weightRange(p.minWeightLb, p.maxWeightLb, p.estimatedWeightLb) || EMPTY;
    case 'whole_item_by_weight':
      return weightRange(p.minWeightLb, p.maxWeightLb, p.averageWeightLb) || EMPTY;
    case 'each':
      return 'Sold each';
    case 'bundle':
      return 'Bundle';
    // Pre-Phase-1 products carry no pricingType. Rather than guess a unit,
    // fall back to whatever weight bounds happen to be set.
    default:
      return weightRange(p.minWeightLb, p.maxWeightLb, p.estimatedWeightLb) || EMPTY;
  }
}

export function getSpecCut(p: SpecView): string {
  return p.cutType?.trim() || EMPTY;
}

export function getSpecGrade(p: SpecView): string {
  return p.qualityTier ? (QUALITY_TIER_LABEL[p.qualityTier] ?? EMPTY) : EMPTY;
}

export function getSpecCells(p: SpecView): SpecCell[] {
  return [
    { label: 'Weight', value: getSpecWeight(p) },
    { label: 'Cut', value: getSpecCut(p) },
    { label: 'Grade', value: getSpecGrade(p) },
  ];
}
