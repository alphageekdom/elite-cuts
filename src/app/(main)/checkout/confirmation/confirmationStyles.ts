// Shared chrome for the confirmation surface, mirroring
// `src/components/checkout/checkoutStyles.ts`. The page and its colocated
// components both render cards and eyebrow labels, and an audit caught the
// two drifting apart (the receipt's label rendered 0.5px larger than its
// three column siblings) within days of the surface being written.

export const CARD_CLASS =
  'rounded-sm border border-line-soft bg-paper px-6 py-6';

// 0.22em is the house section-label tracking — CheckoutOrderSummary and
// CartSummary both set their "Order summary" eyebrow this way. Colorless so
// the dark hero can supply its own tone.
export const EYEBROW_BASE =
  'text-[11px] font-medium uppercase tracking-[0.22em]';

export const EYEBROW_CLASS = `${EYEBROW_BASE} text-muted`;

// `muted` erodes to 4.25:1 on the cream-deep tint, so the two tinted cards
// (rewards, butcher's note) take the deeper tone. See the token's note in
// globals.css.
export const EYEBROW_ON_TINT = `${EYEBROW_BASE} text-muted-deep`;
