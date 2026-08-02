import type { CustomerTableRow } from '@/types/admin';
import { getTier, getActivity, type Tier, type ActivityStatus } from '@/lib/admin/customer-tier';

// Re-export the pure helpers + types so existing client imports keep working
// without changing every file. New server-side code should import directly
// from `@/lib/customer-tier`.
export { getTier, getActivity };
export type { Tier, ActivityStatus };

// `camel-deeper`, not `camel-deep`, wherever the fill is `bg-camel/20`: that
// tint lands at #f1e5d4 on paper, where camel-deep measures 4.35 and fails.
// camel-deeper holds 5.66 there and 5.26 on the cream row-hover.
export const TIER_CONFIG: Record<Tier, { label: string; pillClass: string; showStar: boolean }> = {
  master: { label: 'Master Cut', pillClass: 'bg-ink text-camel-soft', showStar: true },
  connoisseur: { label: 'Connoisseur', pillClass: 'bg-camel/20 text-camel-deeper', showStar: true },
  // `ink-soft`, matching the REGULAR / FIRST 30 DAYS tag pills in `deriveTags`
  // below — this was the one tier pill still on plain `muted`, which measured
  // 4.16:1 once the row was hovered. 11.34:1 worst case now.
  regular: { label: 'Regular', pillClass: 'bg-ink/6 text-ink-soft', showStar: false },
};

// Every activity pill renders on the drawer's `bg-ink` hero — `CustomerDetailHero`
// is this map's only consumer — so the whole map is dark-surface. A previous
// comment here claimed the non-`active` states sat on lighter backgrounds, which
// is why three of them were never checked: `camel-deep` measured 2.29:1 on ink,
// `oxblood` on red-soft 2.39:1, and `bg-ink` fills rendered as invisible pills
// against the identically-coloured hero.
export const ACTIVITY_CONFIG: Record<ActivityStatus, { label: string; pillClass: string }> = {
  active: { label: 'Active', pillClass: 'bg-green/25 text-green-bright' },
  dormant: { label: 'Dormant', pillClass: 'bg-camel/20 text-camel-soft' },
  'at-risk': { label: 'At risk', pillClass: 'bg-oxblood/30 text-cream/80' },
  new: { label: 'New', pillClass: 'bg-cream/10 text-cream' },
};

// Dark-surface variant of TIER_CONFIG, for the same hero. Mirrors the
// light/dark split `CUTLIST_ORDER_STATUS_PILL` uses in lib/orders/status.ts:
// no single camel value can serve both, because the light tint (#f1e5d4) and
// the ink hero are 25.6:1 apart — anything passing on one fails the other.
// `master` and `connoisseur` share values; the star and the label already
// distinguish them.
export const TIER_CONFIG_DARK: Record<Tier, { label: string; pillClass: string; showStar: boolean }> = {
  master: { label: 'Master Cut', pillClass: 'bg-camel/20 text-camel-soft', showStar: true },
  connoisseur: { label: 'Connoisseur', pillClass: 'bg-camel/20 text-camel-soft', showStar: true },
  regular: { label: 'Regular', pillClass: 'bg-cream/10 text-cream/75', showStar: false },
};

export function deriveTags(row: CustomerTableRow): Array<{ label: string; cls: string }> {
  const tier = getTier(row.orderCount);
  const activity = getActivity(row);
  const tags: Array<{ label: string; cls: string }> = [];
  if (tier === 'master') tags.push({ label: 'VIP', cls: 'bg-red-soft text-oxblood' });
  if (row.orderCount >= 15) tags.push({ label: 'BULK BUYER', cls: 'bg-green-soft text-green-deep' });
  if (activity === 'new') tags.push({ label: 'FIRST 30 DAYS', cls: 'bg-cream-deep text-ink-soft' });
  if (activity === 'at-risk') tags.push({ label: 'DORMANT', cls: 'bg-cream-deep text-ink-soft' });
  if (row.savedCutsCount > 0) tags.push({ label: 'SAVED CUTS', cls: 'bg-camel/20 text-camel-deeper' });
  if (tags.length === 0) tags.push({ label: 'REGULAR', cls: 'bg-cream-deep text-ink-soft' });
  return tags;
}
