import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/getSessionUser';
import connectDB from '@/config/database';
import OrderModel from '@/models/Order';
import User from '@/models/User';

import type { Metadata } from 'next';
import AnalyticsClient, { type AnalyticsData } from '@/components/admin/analytics/AnalyticsClient';
import { excludeDemoOrders } from '@/lib/demo/exclude';
import {
  DAY_MS,
  RANGE_DAYS,
  RANGE_BUCKETS,
  parseRange,
  buildRangeBuckets,
} from '@/lib/admin/range-buckets';
import {
  computeRepeatRate,
  computeCategoryBreakdown,
  computeHeatmap,
  findTopSellerName,
  formatPeriodLabel,
  HERO_PERIOD_LABEL,
} from '@/lib/admin/analytics';

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

  // Repeat rate — reported in percentage points (not relative %) since repeat
  // rate is itself a percentage.
  const repeatRate = computeRepeatRate(currentOrders);
  const prevRepeatRate = computeRepeatRate(previousOrders);
  const repeatRateChange = repeatRate - prevRepeatRate;

  // Pickup %
  const pickupCount = currentOrders.filter((o) => o.pickedUp).length;
  const pickupPct =
    currentOrders.length > 0 ? Math.round((pickupCount / currentOrders.length) * 100) : 0;

  // New customers change
  const newCustomersChange =
    prevNewCustomers > 0 ? ((newCustomers - prevNewCustomers) / prevNewCustomers) * 100 : 0;

  const categories = computeCategoryBreakdown(currentOrders, CHART_CATEGORY_COLORS);
  const topSellerName = findTopSellerName(currentOrders);
  const buckets = buildRangeBuckets(range, now, currentOrders, previousOrders);
  const { volume: heatmap, revenue: heatmapRevenue } = computeHeatmap(currentOrders);

  const data: AnalyticsData = {
    range,
    periodLabel: formatPeriodLabel(windowStart, now, days),
    heroPeriodLabel: HERO_PERIOD_LABEL[range],
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
    topSellerName,
    buckets,
    bucketUnit: bucketCfg.unit,
    revenueTotal: revenue,
    revenuePrevTotal: prevRevenue,
    heatmap,
    heatmapRevenue,
  };

  return <AnalyticsClient data={data} />;
}
