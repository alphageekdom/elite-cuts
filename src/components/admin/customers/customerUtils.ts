import type { CustomerTableRow } from '@/types/admin';

export type Tier = 'master' | 'connoisseur' | 'regular';
export type ActivityStatus = 'active' | 'dormant' | 'at-risk' | 'new';

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

export function getTier(orderCount: number): Tier {
  if (orderCount >= 20) return 'master';
  if (orderCount >= 10) return 'connoisseur';
  return 'regular';
}

export function getActivity(row: CustomerTableRow): ActivityStatus {
  const now = Date.now();
  const THIRTY_DAYS = 30 * 86400000;
  const accountAge = now - new Date(row.createdAt).getTime();
  if (accountAge < THIRTY_DAYS) return 'new';
  if (!row.lastOrderAt) return 'at-risk';
  const lastOrderAge = now - new Date(row.lastOrderAt).getTime();
  if (lastOrderAge <= THIRTY_DAYS) return 'active';
  if (lastOrderAge <= 90 * 86400000) return 'dormant';
  return 'at-risk';
}

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
