import { MONTH_ABBR } from '@/lib/format';
import type { RangeKey } from '@/lib/admin/range-buckets';

// Pure analytics-page derivations. The dashboard's analytics page reads these
// instead of inlining the pass-the-orders-twice maps directly so the page
// stays close to its query + assembly job.

type OrderItemLike = {
  name: string;
  price: number;
  qty: number;
  productType: string;
};

type OrderLike = {
  user?: unknown;
  totalCost: number;
  createdAt: Date;
  orderItems: OrderItemLike[];
};

export function computeRepeatRate(orders: readonly OrderLike[]): number {
  const customerOrderMap = new Map<string, number>();
  for (const o of orders) {
    if (!o.user) continue; // guest orders have no user identity to repeat-count
    const uid = String(o.user);
    customerOrderMap.set(uid, (customerOrderMap.get(uid) ?? 0) + 1);
  }
  const totalUnique = customerOrderMap.size;
  if (totalUnique === 0) return 0;
  const repeating = [...customerOrderMap.values()].filter((c) => c >= 2).length;
  return (repeating / totalUnique) * 100;
}

export type CategoryBreakdown = {
  name: string;
  revenue: number;
  pct: number;
  orders: number;
  color: string;
  barW: number;
};

export function computeCategoryBreakdown(
  orders: readonly OrderLike[],
  colors: Record<string, string>,
): CategoryBreakdown[] {
  const catRevenue: Record<string, number> = {};
  const catOrders: Record<string, number> = {};
  for (const order of orders) {
    for (const item of order.orderItems) {
      const cat = item.productType in colors ? item.productType : 'Other';
      catRevenue[cat] = (catRevenue[cat] ?? 0) + item.price * item.qty;
      catOrders[cat] = (catOrders[cat] ?? 0) + 1;
    }
  }
  const totalCatRevenue = Object.values(catRevenue).reduce((s, v) => s + v, 0);
  const maxCatRevenue = Math.max(1, ...Object.values(catRevenue));

  return Object.keys(colors)
    .filter((name) => (catRevenue[name] ?? 0) > 0)
    .map((name) => ({
      name,
      revenue: catRevenue[name] ?? 0,
      pct: totalCatRevenue > 0 ? Math.round(((catRevenue[name] ?? 0) / totalCatRevenue) * 100) : 0,
      orders: catOrders[name] ?? 0,
      color: colors[name],
      barW: (catRevenue[name] ?? 0) / maxCatRevenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// One pass to find the highest-revenue product's name. Returns null when no
// orders exist for the window — the insights card branches on that.
export function findTopSellerName(orders: readonly OrderLike[]): string | null {
  const productRevenue = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.orderItems) {
      productRevenue.set(item.name, (productRevenue.get(item.name) ?? 0) + item.price * item.qty);
    }
  }
  let topName: string | null = null;
  let topRevenue = 0;
  for (const [name, rev] of productRevenue) {
    if (rev > topRevenue) {
      topRevenue = rev;
      topName = name;
    }
  }
  return topName;
}

// 7 rows (Mon–Sun) × 12 cols (9A–8P), normalized 0–5 for both volume and revenue.
// `getHours()` and `getDay()` read in the server's timezone; the shop-local
// timezone wiring is deferred (see the analytics audit notes).
export type HeatmapPair = { volume: number[][]; revenue: number[][] };

export function computeHeatmap(orders: readonly OrderLike[]): HeatmapPair {
  const raw: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));
  const revRaw: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));
  for (const order of orders) {
    const d = order.createdAt;
    const hour = d.getHours();
    const day = d.getDay();
    if (hour >= 9 && hour < 21) {
      const hourIdx = hour - 9;
      const dayIdx = day === 0 ? 6 : day - 1;
      raw[dayIdx][hourIdx]++;
      revRaw[dayIdx][hourIdx] += order.totalCost;
    }
  }
  const max = Math.max(1, ...raw.flat());
  const revMax = Math.max(1, ...revRaw.flat());
  return {
    volume: raw.map((row) => row.map((v) => Math.min(5, Math.round((v / max) * 5)))),
    revenue: revRaw.map((row) => row.map((v) => Math.min(5, Math.round((v / revMax) * 5)))),
  };
}

// Page subtitle. When the window crosses a year boundary (true for 1Y) the
// start year prints alongside the end year so the range stays unambiguous.
export function formatPeriodLabel(windowStart: Date, windowEnd: Date, days: number): string {
  const startStr =
    windowStart.getFullYear() === windowEnd.getFullYear()
      ? `${MONTH_ABBR[windowStart.getMonth()]} ${windowStart.getDate()}`
      : `${MONTH_ABBR[windowStart.getMonth()]} ${windowStart.getDate()}, ${windowStart.getFullYear()}`;
  const endStr = `${MONTH_ABBR[windowEnd.getMonth()]} ${windowEnd.getDate()}, ${windowEnd.getFullYear()}`;
  return `${startStr} – ${endStr} · Compared to previous ${days} days`;
}

export const HERO_PERIOD_LABEL: Record<RangeKey, string> = {
  '7D': 'Last 7 days',
  '30D': 'Last 30 days',
  '90D': 'Last 90 days',
  '1Y': 'Last year',
};
