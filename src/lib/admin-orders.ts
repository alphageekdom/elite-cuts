// Pure filter / sort / stat-count helpers for the admin orders dashboard.
// Sits in lib/ so a future export route, analytics widget, or test file can
// reuse the same in-memory rules without depending on the components/ tree.

import type { OrderTableRow, StatusCounts } from '@/types/admin';

export type OrderSortMode =
  | 'newest'
  | 'oldest'
  | 'total-desc'
  | 'total-asc'
  | 'customer-asc';

export type PaymentFilter = 'any' | 'Completed' | 'Pending' | 'Refunded' | 'Partially Refunded';
export type FulfillmentFilter = 'any' | 'pickup' | 'delivery';

// Status keys mirror the order-status enum plus an 'all' sentinel for the
// stat-strip "show everything" cell.
export const ORDER_STAT_KEYS = [
  'all',
  'Order Placed',
  'Preparing',
  'Ready for Pickup',
  'Out for Delivery',
  'Completed',
  'Cancelled',
] as const;

export type OrderStatKey = (typeof ORDER_STAT_KEYS)[number];

type FilterableOrder = {
  status: string;
  orderRef: string;
  customerName: string;
  customerEmail: string;
  paymentStatus: string;
  fulfillmentType?: 'pickup' | 'delivery';
};

export function matchesStatus<T extends Pick<FilterableOrder, 'status'>>(
  row: T,
  status: OrderStatKey | string,
): boolean {
  return status === 'all' || row.status === status;
}

export function matchesOrderSearch<T extends Pick<FilterableOrder, 'orderRef' | 'customerName' | 'customerEmail'>>(
  row: T,
  rawQuery: string,
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  return (
    row.orderRef.toLowerCase().includes(q) ||
    row.customerName.toLowerCase().includes(q) ||
    row.customerEmail.toLowerCase().includes(q)
  );
}

export function matchesPayment<T extends Pick<FilterableOrder, 'paymentStatus'>>(
  row: T,
  filter: PaymentFilter,
): boolean {
  return filter === 'any' || row.paymentStatus === filter;
}

export function matchesFulfillment<T extends Pick<FilterableOrder, 'fulfillmentType'>>(
  row: T,
  filter: FulfillmentFilter,
): boolean {
  if (filter === 'any') return true;
  return (row.fulfillmentType ?? 'pickup') === filter;
}

type SortableOrder = {
  createdAt: string;
  total: number;
  customerName: string;
};

export function sortOrders<T extends SortableOrder>(
  rows: readonly T[],
  mode: OrderSortMode,
): T[] {
  const sorted = [...rows];
  if (mode === 'newest') {
    sorted.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } else if (mode === 'oldest') {
    sorted.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  } else if (mode === 'total-desc') {
    sorted.sort((a, b) => b.total - a.total);
  } else if (mode === 'total-asc') {
    sorted.sort((a, b) => a.total - b.total);
  } else if (mode === 'customer-asc') {
    sorted.sort((a, b) => a.customerName.localeCompare(b.customerName));
  }
  return sorted;
}

export function countForOrderStat(key: OrderStatKey, counts: StatusCounts): number {
  if (key === 'all')               return counts.all;
  if (key === 'Order Placed')      return counts.orderPlaced;
  if (key === 'Preparing')         return counts.preparing;
  if (key === 'Ready for Pickup')  return counts.readyForPickup;
  if (key === 'Out for Delivery')  return counts.outForDelivery;
  if (key === 'Completed')         return counts.completed;
  if (key === 'Cancelled')         return counts.cancelled;
  return 0;
}

// Convenience wrapper: applies status / search / payment / fulfillment in one
// pass and returns the sorted rows. Consumers can still call the individual
// helpers if they want a partial pipeline.
type OrderFilterOpts = {
  status: OrderStatKey | string;
  search: string;
  payment: PaymentFilter;
  fulfillment: FulfillmentFilter;
};

export function applyOrdersFilter<T extends FilterableOrder & SortableOrder>(
  rows: readonly T[],
  opts: OrderFilterOpts,
  sortMode: OrderSortMode,
): T[] {
  const filtered = rows.filter(
    (r) =>
      matchesStatus(r, opts.status) &&
      matchesOrderSearch(r, opts.search) &&
      matchesPayment(r, opts.payment) &&
      matchesFulfillment(r, opts.fulfillment),
  );
  return sortOrders(filtered, sortMode);
}

// Re-export OrderTableRow for tests/consumers that want to reference the
// concrete row shape without pulling from @/types/admin.
export type { OrderTableRow };
