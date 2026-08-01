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

// Customer-facing text for each reason. Shared rather than living in the
// checkout summary component, because the place-order route needs the same
// wording: a code can stop being valid between "Apply" and "Place order", and
// that has to be reported in the same words the apply step would have used.
export const PROMO_FAILURE_MESSAGES: Record<PromoFailureReason, string> = {
  not_found: "We don't recognize that code",
  disabled: 'This code is no longer available',
  not_started: 'This code is not active yet',
  expired: 'This code has expired',
  exhausted: 'This code has reached its usage limit',
  customer_limit: "You've already used this code",
  min_subtotal: "Your order doesn't meet the minimum for this code",
  first_order_only: 'This code is for first orders only',
};
