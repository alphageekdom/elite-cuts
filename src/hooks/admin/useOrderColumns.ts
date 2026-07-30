'use client';
import { useEffect, useLayoutEffect, useState } from 'react';

// Persisted column-visibility state for the orders table. Lives in its own
// hook so OrdersClient.tsx can render-only and not own the localStorage
// hydration dance.

export type OrderColumnKey = 'customer' | 'status' | 'items' | 'total' | 'pickup' | 'created';

export type OrderColumnVisibility = Record<OrderColumnKey, boolean>;

export const ORDER_COLUMN_OPTIONS: { key: OrderColumnKey; label: string }[] = [
  { key: 'customer', label: 'Customer' },
  { key: 'status',   label: 'Status' },
  { key: 'items',    label: 'Items' },
  { key: 'total',    label: 'Total' },
  { key: 'pickup',   label: 'Pickup' },
  { key: 'created',  label: 'Created' },
];

const DEFAULT_COLUMNS: OrderColumnVisibility = {
  customer: true,
  status: true,
  items: true,
  total: true,
  pickup: true,
  created: true,
};

const STORAGE_KEY = 'admin.orders.columns';

// useLayoutEffect runs synchronously after DOM mutation but before paint, which
// lets us apply the persisted column preference without a visible flash.
// Fall back to useEffect on the server so React doesn't emit a no-op warning.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useOrderColumns() {
  const [columns, setColumns] = useState<OrderColumnVisibility>(DEFAULT_COLUMNS);

  // Hydrate from localStorage before first paint. Unknown / stale keys are
  // ignored so a schema change can't lock a column off invisibly.
  useIsomorphicLayoutEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<OrderColumnVisibility>;
      const next: OrderColumnVisibility = { ...DEFAULT_COLUMNS };
      for (const { key } of ORDER_COLUMN_OPTIONS) {
        if (typeof parsed[key] === 'boolean') next[key] = parsed[key]!;
      }
      setColumns(next);
    } catch {
      // Bad JSON — fall back to defaults silently.
    }
  }, []);

  function toggle(key: OrderColumnKey) {
    setColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Never let the admin hide every toggleable column — would leave an empty grid.
      const anyVisible = ORDER_COLUMN_OPTIONS.some((c) => next[c.key]);
      if (!anyVisible) return prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore quota/privacy-mode failures — visibility still applies in memory.
      }
      return next;
    });
  }

  return { columns, toggle };
}
