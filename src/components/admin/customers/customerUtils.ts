import type { CustomerTableRow } from '@/types/admin';
import { getTier, getActivity, type Tier, type ActivityStatus } from '@/lib/customer-tier';

// Re-export the pure helpers + types so existing client imports keep working
// without changing every file. New server-side code should import directly
// from `@/lib/customer-tier`.
export { getTier, getActivity };
export type { Tier, ActivityStatus };

export const TIER_CONFIG: Record<Tier, { label: string; pillClass: string; showStar: boolean }> = {
  master: { label: 'Master Cut', pillClass: 'bg-ink text-camel-soft', showStar: true },
  connoisseur: { label: 'Connoisseur', pillClass: 'bg-camel/20 text-camel', showStar: true },
  regular: { label: 'Regular', pillClass: 'bg-ink/6 text-muted', showStar: false },
};

export const ACTIVITY_CONFIG: Record<ActivityStatus, { label: string; pillClass: string }> = {
  active: { label: 'Active', pillClass: 'bg-green-soft text-green' },
  dormant: { label: 'Dormant', pillClass: 'bg-camel/20 text-camel' },
  'at-risk': { label: 'At risk', pillClass: 'bg-red-soft text-oxblood' },
  new: { label: 'New', pillClass: 'bg-ink text-cream' },
};

export function deriveTags(row: CustomerTableRow): Array<{ label: string; cls: string }> {
  const tier = getTier(row.orderCount);
  const activity = getActivity(row);
  const tags: Array<{ label: string; cls: string }> = [];
  if (tier === 'master') tags.push({ label: 'VIP', cls: 'bg-red-soft text-oxblood' });
  if (row.orderCount >= 15) tags.push({ label: 'BULK BUYER', cls: 'bg-green-soft text-green' });
  if (activity === 'new') tags.push({ label: 'FIRST 30 DAYS', cls: 'bg-cream-deep text-ink-soft' });
  if (activity === 'at-risk') tags.push({ label: 'DORMANT', cls: 'bg-cream-deep text-ink-soft' });
  if (row.savedCutsCount > 0) tags.push({ label: 'SAVED CUTS', cls: 'bg-camel/20 text-camel' });
  if (tags.length === 0) tags.push({ label: 'REGULAR', cls: 'bg-cream-deep text-ink-soft' });
  return tags;
}
