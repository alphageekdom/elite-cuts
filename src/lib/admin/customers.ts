// Pure filter / sort / count helpers for the admin customers dashboard.
// Sits next to customer-tier.ts and customer-status.ts so the same in-memory
// rules can be reused by the CSV export route or any future consumer without
// reaching into the components/ tree.

import { getTier, type Tier } from './customer-tier';
import type { CustomerCounts } from '@/types/admin';
import type { StatFilter } from './customer-status';

export type CustomerSortMode =
  | 'top-spenders'
  | 'newest'
  | 'most-orders'
  | 'recently-active'
  | 'name-asc';

export type CustomerAdvancedFilters = {
  createdFrom: string;        // 'YYYY-MM-DD' or ''
  createdTo: string;          // 'YYYY-MM-DD' or ''
  hasOrders: 'any' | 'yes' | 'no';
  hasSavedCuts: 'any' | 'yes' | 'no';
  tiers: Tier[];
  noteSearch: string;
};

type FilterableRow = {
  name: string;
  email: string;
  createdAt: string;
  orderCount: number;
  savedCutsCount: number;
  adminNote?: string;
};

export function matchesAdvancedFilters<T extends FilterableRow>(
  row: T,
  f: CustomerAdvancedFilters,
): boolean {
  if (f.createdFrom) {
    const start = new Date(`${f.createdFrom}T00:00:00`).getTime();
    if (!Number.isNaN(start) && new Date(row.createdAt).getTime() < start) return false;
  }
  if (f.createdTo) {
    const end = new Date(`${f.createdTo}T23:59:59.999`).getTime();
    if (!Number.isNaN(end) && new Date(row.createdAt).getTime() > end) return false;
  }
  if (f.hasOrders === 'yes' && row.orderCount === 0) return false;
  if (f.hasOrders === 'no' && row.orderCount > 0) return false;
  if (f.hasSavedCuts === 'yes' && row.savedCutsCount === 0) return false;
  if (f.hasSavedCuts === 'no' && row.savedCutsCount > 0) return false;
  if (f.tiers.length > 0 && !f.tiers.includes(getTier(row.orderCount))) return false;
  const note = f.noteSearch.trim().toLowerCase();
  if (note && !(row.adminNote ?? '').toLowerCase().includes(note)) return false;
  return true;
}

export function matchesSearch<T extends Pick<FilterableRow, 'name' | 'email'>>(
  row: T,
  rawQuery: string,
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  return row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q);
}

type SortableRow = {
  name: string;
  createdAt: string;
  orderCount: number;
  totalSpend: number;
  lastOrderAt?: string;
};

export function sortCustomers<T extends SortableRow>(
  rows: readonly T[],
  mode: CustomerSortMode,
): T[] {
  const sorted = [...rows];
  if (mode === 'top-spenders') {
    sorted.sort((a, b) => b.totalSpend - a.totalSpend);
  } else if (mode === 'newest') {
    sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } else if (mode === 'most-orders') {
    sorted.sort((a, b) => b.orderCount - a.orderCount);
  } else if (mode === 'recently-active') {
    sorted.sort((a, b) => {
      const av = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
      const bv = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
      return bv - av;
    });
  } else if (mode === 'name-asc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
}

export function countForStat(key: StatFilter, counts: CustomerCounts): number {
  if (key === 'all') return counts.all;
  if (key === 'new') return counts.new;
  if (key === 'active') return counts.active;
  if (key === 'dormant') return counts.dormant ?? 0;
  return counts.connoisseurPlus;
}
