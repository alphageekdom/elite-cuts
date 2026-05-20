// Client-safe constants for the promos domain. Lives outside the Mongoose
// model file so the Zod schema (and any client component that needs the
// type union) can import these without pulling mongoose into the browser
// bundle.

export const PROMO_TYPES = ['percent', 'fixed'] as const;
export type PromoType = (typeof PROMO_TYPES)[number];

export const PROMO_FAILURE_REASONS = [
  'not_found',
  'disabled',
  'not_started',
  'expired',
  'exhausted',
  'customer_limit',
  'min_subtotal',
  'first_order_only',
] as const;
export type PromoFailureReason = (typeof PROMO_FAILURE_REASONS)[number];
