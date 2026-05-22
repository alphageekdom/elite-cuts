import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/getSessionUser';
import connectDB from '@/config/database';
import OrderModel from '@/models/Order';
import User from '@/models/User';

import type { Metadata } from 'next';
import AnalyticsClient, { type AnalyticsData } from '@/components/admin/analytics/AnalyticsClient';
import { MONTH_ABBR } from '@/lib/format';
import { excludeDemoOrders } from '@/lib/demo/exclude';
import {
  DAY_MS,
  RANGE_DAYS,
  RANGE_BUCKETS,
  parseRange,
  buildRangeBuckets,
  type RangeKey,
} from '@/lib/admin/range-buckets';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Analytics · EliteCuts Admin',
};

// CSS variable values used as inline chart colors — intentionally separate from
// the Tailwind-class-based CATEGORY_COLORS in admin-constants (those are for pills).
// Categories not listed fall back to a neutral camel-soft.
const CHART_CATEGORY_COLORS: Record<string, string> = {
  Beef: 'var(--color-oxblood)',
  Pork: 'var(--color-camel)',
  Chicken: 'var(--color-green)',
  Lamb: 'var(--color-ink)',
  Charcuterie: 'var(--color-camel-soft)',
  Other: 'var(--color-camel-soft)',
};

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);
  const days = RANGE_DAYS[range];
  const bucketCfg = RANGE_BUCKETS[range];

  const now = new Date();
  const windowStart = new Date(now.getTime() - days * DAY_MS);
  const prevWindowStart = new Date(now.getTime() - 2 * days * DAY_MS);

  // Phase D — exclude the demo customer's orders + both demo accounts
  // from every analytics aggregate so the recruiter's clicks don't
  // skew real metrics.
  const excludeDemo = await excludeDemoOrders();

  const [currentOrders, previousOrders, newCustomers, prevNewCustomers] = await Promise.all([
    OrderModel.find({ ...excludeDemo, createdAt: { $gte: windowStart } }).lean().exec(),
    OrderModel.find({
      ...excludeDemo,
      createdAt: { $gte: prevWindowStart, $lt: windowStart },
    }).lean().exec(),
    User.countDocuments({
      createdAt: { $gte: windowStart },
      isAdmin: { $ne: true },
      isDemo: { $ne: true },
    }),
    User.countDocuments({
      createdAt: { $gte: prevWindowStart, $lt: windowStart },
      isAdmin: { $ne: true },
      isDemo: { $ne: true },
    }),
  ]);

  // Revenue
  const revenue = currentOrders.reduce((s, o) => s + o.totalCost, 0);
  const prevRevenue = previousOrders.reduce((s, o) => s + o.totalCost, 0);
  const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

  // AOV
  const aov = currentOrders.length > 0 ? revenue / currentOrders.length : 0;
  const prevAov = previousOrders.length > 0 ? prevRevenue / previousOrders.length : 0;
  const aovChange = prevAov > 0 ? ((aov - prevAov) / prevAov) * 100 : 0;

  // Cancellation rate
  const cancelled = currentOrders.filter((o) => o.orderStatus === 'Cancelled').length;
  const prevCancelled = previousOrders.filter((o) => o.orderStatus === 'Cancelled').length;
  const cancelRate = currentOrders.length > 0 ? (cancelled / currentOrders.length) * 100 : 0;
  const prevCancelRate =
    previousOrders.length > 0 ? (prevCancelled / previousOrders.length) * 100 : 0;
  const cancelRateChange = prevCancelRate - cancelRate; // positive = rate improved (went down)

  // Repeat purchase rate — current and prior window. Delta is reported in
  // percentage points (not relative %) since repeat rate is itself a percentage.
  const repeatRateFor = (orders: typeof currentOrders): number => {
    const customerOrderMap = new Map<string, number>();
    for (const o of orders) {
      if (!o.user) continue; // guest orders have no user identity to repeat-count
      const uid = o.user.toString();
      customerOrderMap.set(uid, (customerOrderMap.get(uid) ?? 0) + 1);
    }
    const totalUnique = customerOrderMap.size;
    if (totalUnique === 0) return 0;
    const repeating = [...customerOrderMap.values()].filter((c) => c >= 2).length;
    return (repeating / totalUnique) * 100;
  };
  const repeatRate = repeatRateFor(currentOrders);
  const prevRepeatRate = repeatRateFor(previousOrders);
  const repeatRateChange = repeatRate - prevRepeatRate;

  // Pickup %
  const pickupCount = currentOrders.filter((o) => o.pickedUp).length;
  const pickupPct =
    currentOrders.length > 0 ? Math.round((pickupCount / currentOrders.length) * 100) : 0;

  // New customers change
  const newCustomersChange =
    prevNewCustomers > 0 ? ((newCustomers - prevNewCustomers) / prevNewCustomers) * 100 : 0;

  // Category breakdown
  const catRevenue: Record<string, number> = {};
  const catOrders: Record<string, number> = {};
  for (const order of currentOrders) {
    for (const item of order.orderItems) {
      const cat = item.productType in CHART_CATEGORY_COLORS ? item.productType : 'Other';
      catRevenue[cat] = (catRevenue[cat] ?? 0) + item.price * item.qty;
      catOrders[cat] = (catOrders[cat] ?? 0) + 1;
    }
  }
  const totalCatRevenue = Object.values(catRevenue).reduce((s, v) => s + v, 0);
  const maxCatRevenue = Math.max(1, ...Object.values(catRevenue));

  const categories: AnalyticsData['categories'] = Object.keys(CHART_CATEGORY_COLORS)
    .filter((name) => (catRevenue[name] ?? 0) > 0)
    .map((name) => ({
      name,
      revenue: catRevenue[name] ?? 0,
      pct: totalCatRevenue > 0 ? Math.round(((catRevenue[name] ?? 0) / totalCatRevenue) * 100) : 0,
      orders: catOrders[name] ?? 0,
      color: CHART_CATEGORY_COLORS[name],
      barW: (catRevenue[name] ?? 0) / maxCatRevenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Best sellers
  const productMap: Record<
    string,
    { revenue: number; sold: number; image: string; category: string }
  > = {};
  const prevProductRevenue: Record<string, number> = {};

  for (const order of currentOrders) {
    for (const item of order.orderItems) {
      if (!productMap[item.name]) {
        productMap[item.name] = {
          revenue: 0,
          sold: 0,
          image: item.image,
          category: item.productType,
        };
      }
      productMap[item.name].revenue += item.price * item.qty;
      productMap[item.name].sold += item.qty;
    }
  }
  for (const order of previousOrders) {
    for (const item of order.orderItems) {
      prevProductRevenue[item.name] =
        (prevProductRevenue[item.name] ?? 0) + item.price * item.qty;
    }
  }

  const bestSellers: AnalyticsData['bestSellers'] = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([name, d], i) => {
      const prev = prevProductRevenue[name] ?? 0;
      const changePct = prev > 0 ? ((d.revenue - prev) / prev) * 100 : 0;
      return {
        rank: i + 1,
        name,
        image: d.image,
        category: d.category,
        sold: d.sold,
        revenue: d.revenue,
        changePct: Math.abs(changePct),
        changeDir: changePct >= 0 ? 'up' : ('down' as const),
      };
    });

  const buckets = buildRangeBuckets(range, now, currentOrders, previousOrders);

  // Heatmap: 7 rows (Mon–Sun) × 12 cols (9A–8P), normalized 0–5 for both volume and revenue
  const heatmapRaw: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));
  const heatmapRevRaw: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));
  for (const order of currentOrders) {
    const d = order.createdAt;
    const hour = d.getHours();
    const day = d.getDay();
    if (hour >= 9 && hour < 21) {
      const hourIdx = hour - 9;
      const dayIdx = day === 0 ? 6 : day - 1;
      heatmapRaw[dayIdx][hourIdx]++;
      heatmapRevRaw[dayIdx][hourIdx] += order.totalCost;
    }
  }
  const heatmapMax = Math.max(1, ...heatmapRaw.flat());
  const heatmapRevMax = Math.max(1, ...heatmapRevRaw.flat());
  const heatmap = heatmapRaw.map((row) =>
    row.map((v) => Math.min(5, Math.round((v / heatmapMax) * 5))),
  );
  const heatmapRevenue = heatmapRevRaw.map((row) =>
    row.map((v) => Math.min(5, Math.round((v / heatmapRevMax) * 5))),
  );

  // Period label (page subtitle, full date range)
  const periodLabel = `${MONTH_ABBR[windowStart.getMonth()]} ${windowStart.getDate()} – ${MONTH_ABBR[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} · Compared to previous ${days} days`;

  // Hero label sits next to the big net-revenue number and has to read tight.
  const heroPeriodLabel: Record<RangeKey, string> = {
    '7D': 'Last 7 days',
    '30D': 'Last 30 days',
    '90D': 'Last 90 days',
    '1Y':  'Last year',
  };

  const data: AnalyticsData = {
    range,
    periodLabel,
    heroPeriodLabel: heroPeriodLabel[range],
    revenue,
    revenueChange,
    orderCount: currentOrders.length,
    aov,
    aovChange,
    pickupPct,
    repeatRate,
    repeatRateChange,
    newCustomers,
    newCustomersChange,
    cancelRate,
    cancelRateChange,
    categories,
    bestSellers,
    buckets,
    bucketUnit: bucketCfg.unit,
    revenueTotal: revenue,
    revenuePrevTotal: prevRevenue,
    heatmap,
    heatmapRevenue,
  };

  return <AnalyticsClient data={data} />;
}
