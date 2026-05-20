import type { CustomerCounts } from '@/types/admin';

// Shared status-filter logic for the customers dashboard. The stat-strip
// chips, the in-memory table filter, and the CSV export endpoint all derive
// their bucketing from these helpers so they can't drift from each other.

export const STAT_FILTERS = ['all', 'new', 'active', 'connoisseurPlus', 'dormant'] as const;
export type StatFilter = (typeof STAT_FILTERS)[number];

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
export const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export type CustomerStatusInput = {
  createdAt: string | Date;
  lastOrderAt?: string | Date | null;
  orderCount: number;
  dormancyWarnedAt?: string | Date | null;
  deletedAt?: string | Date | null;
  // Phase B — `countByStat` skips demo accounts so they don't inflate the
  // stat-chip counts; the row still renders in the table with a "Demo" pill.
  isDemo?: boolean;
};

function toMs(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function matchesStatFilter(
  row: CustomerStatusInput,
  filter: StatFilter,
  now: number = Date.now(),
): boolean {
  if (filter === 'all') return true;
  const created = toMs(row.createdAt);
  if (filter === 'new') {
    return created !== null && now - created < THIRTY_DAYS_MS;
  }
  if (filter === 'active') {
    const last = toMs(row.lastOrderAt);
    return last !== null && now - last <= NINETY_DAYS_MS;
  }
  if (filter === 'connoisseurPlus') {
    return row.orderCount >= 10;
  }
  if (filter === 'dormant') {
    return toMs(row.dormancyWarnedAt) !== null && toMs(row.deletedAt) === null;
  }
  return true;
}

export function countByStat<T extends CustomerStatusInput>(
  customers: readonly T[],
  now: number = Date.now(),
): CustomerCounts {
  // Demo accounts are excluded from every count — they're visible in the
  // table but shouldn't inflate the chips since they're seeded fixtures, not
  // real customers. Phase D will broaden this same exclusion across other
  // analytics surfaces; for now it only applies here.
  const real = customers.filter((c) => !c.isDemo);
  const counts: CustomerCounts = {
    all: real.length,
    new: 0,
    active: 0,
    connoisseurPlus: 0,
    dormant: 0,
  };
  for (const c of real) {
    if (matchesStatFilter(c, 'new', now)) counts.new++;
    if (matchesStatFilter(c, 'active', now)) counts.active++;
    if (matchesStatFilter(c, 'connoisseurPlus', now)) counts.connoisseurPlus++;
    if (matchesStatFilter(c, 'dormant', now)) counts.dormant!++;
  }
  return counts;
}
