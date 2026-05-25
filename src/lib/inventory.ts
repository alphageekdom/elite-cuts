import type { ProductCategory } from '@/lib/admin/constants';

// The shape of one row in the admin inventory table. Built server-side in
// the inventory page and consumed by InventoryClient, useInventoryTable, the
// drawer components, and the table row.
export type InventoryRow = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  images: string[];
  stockCount: number;
  isAged: boolean;
  supplier: string;
  createdAt: string;
  deliveryStatus: string | null;
};

export const DEFAULT_PAR = 15;

// Par level thresholds per category (MVP stub — no par field in Product model yet).
// Used in the inventory page, InventoryClient, and AdminSidebar to compute stock health.
// Any category not listed here falls back to DEFAULT_PAR.
export const CATEGORY_PAR: Record<string, number> = {
  Beef: 30,
  Pork: 25,
  Chicken: 20,
  Lamb: 20,
  Charcuterie: 15,
  Sausage: 20,
  Prepared: 25,
  Bundles: 8,
  Other: 15,
};

// Single source of truth for the stock-health classification the inventory
// table row, the deliveries panel, the InventoryClient stat strip, and the
// CSV export route all branched on with their own thresholds.
export type StockState = 'healthy' | 'low' | 'critical' | 'out' | 'over';

export function getStockState(stockCount: number, par: number): StockState {
  if (stockCount === 0) return 'out';
  const ratio = stockCount / par;
  if (ratio > 1) return 'over';
  if (ratio >= 0.7) return 'healthy';
  if (ratio >= 0.3) return 'low';
  return 'critical';
}

// Day / month / weekday triple the upcoming + received delivery lists both
// render. Timezone hardcoded to America/Los_Angeles — see analytics audit
// notes for the per-shop timezone wiring that's still deferred.
export type DeliveryDateParts = { day: string; month: string; weekday: string };

export function formatDeliveryDateParts(iso: string): DeliveryDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
    timeZone: 'America/Los_Angeles',
  }).formatToParts(new Date(iso));
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? '';
  return { day: get('day'), month: get('month'), weekday: get('weekday') };
}
