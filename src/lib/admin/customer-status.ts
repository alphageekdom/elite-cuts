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
  // 2026-07-31 — these counts now INCLUDE demo accounts, reversing the Phase B
  // decision to strip them. The chips are filters over this table, and
  // `matchesStatFilter` (which the table runs) never excluded demo rows, so a
  // stripped count sat above a row it did not count: "All 5" over six rows.
  // A filter's number has to equal the rows it yields.
  //
  // The reason demo accounts were stripped — keeping seeded fixtures out of
  // real metrics — is still served, by the dashboard's own user aggregates,
  // which filter `isDemo` at the query. Nothing here is a metric.
  const counts: CustomerCounts = {
    all: customers.length,
    new: 0,
    active: 0,
    connoisseurPlus: 0,
    dormant: 0,
  };
  for (const c of customers) {
    if (matchesStatFilter(c, 'new', now)) counts.new++;
    if (matchesStatFilter(c, 'active', now)) counts.active++;
    if (matchesStatFilter(c, 'connoisseurPlus', now)) counts.connoisseurPlus++;
    if (matchesStatFilter(c, 'dormant', now)) counts.dormant!++;
  }
  return counts;
}
