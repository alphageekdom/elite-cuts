// Client-safe constants for the product pricing model. No Mongoose imports —
// safe to import from server components, server actions, API routes, and
// client components. The Zod schema at `./schema.ts` and the admin form both
// pull from this file so the enums stay in one place.

// What counts as a customer-visible cut: it has at least one image and hasn't
// been soft-deleted. Every surface that lists or counts the catalog starts
// from this so a headline count can't advertise more than the shop page shows.
// Spread it to narrow further: `{ ...VISIBLE_PRODUCT_FILTER, stockCount: { $gt: 0 } }`.
export const VISIBLE_PRODUCT_FILTER = {
  'images.0': { $exists: true },
  isActive: { $ne: false },
};

export const PRICING_TYPES = [
  'fixed_package',
  'per_lb',
  'whole_item_by_weight',
  'each',
  'bundle',
] as const;
export type PricingType = (typeof PRICING_TYPES)[number];

// Customer-facing label for each pricing type — used by the admin form's
// pricing-type select and any explainer copy. Keep terse.
export const PRICING_TYPE_LABEL: Record<PricingType, string> = {
  fixed_package: 'Fixed package',
  per_lb: 'Priced by the pound',
  whole_item_by_weight: 'Whole item, by weight',
  each: 'Each',
  bundle: 'Bundle',
};

export const MEAT_QUALITY_TIERS = [
  'standard',
  'premium',
  'organic',
  'local',
  'grass_fed',
  'prime',
  'dry_aged',
  'prepared',
] as const;
export type MeatQualityTier = (typeof MEAT_QUALITY_TIERS)[number];

export const QUALITY_TIER_LABEL: Record<MeatQualityTier, string> = {
  standard: 'Standard',
  premium: 'Premium',
  organic: 'Organic',
  local: 'Local',
  grass_fed: 'Grass-fed',
  prime: 'Prime',
  dry_aged: 'Dry-aged',
  prepared: 'Prepared',
};

// Whether a pricing type produces an exact total at checkout or an estimate
// that depends on the actual cut weight. Drives the "Estimated Total" copy
// in the cart and the receipt's "approx." badge once Phase 2 ships.
export const PRICING_TYPE_IS_ESTIMATED: Record<PricingType, boolean> = {
  fixed_package: false,
  per_lb: true,
  whole_item_by_weight: true,
  each: false,
  bundle: false,
};
