import type { Promo } from '@/models/Promo';

// Short customer-facing summary of what a promo does. Used by the admin
// list row and the public chip strip on checkout so the two surfaces stay
// in sync when the format ever needs to change (longer copy, i18n, etc.).
// Fixed promos always render two decimals — matches the money convention
// the rest of the app uses (subtotals, totals, refund summaries).
export function formatPromoLabel(promo: Pick<Promo, 'type' | 'value'>): string {
  if (promo.type === 'percent') return `${promo.value}% off`;
  return `$${(promo.value / 100).toFixed(2)} off`;
}
