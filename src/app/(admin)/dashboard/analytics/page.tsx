import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import OrderModel from '@/models/Order';
import User from '@/models/User';

import type { Metadata } from 'next';
import AnalyticsClient, { type AnalyticsData } from '@/components/admin/analytics/AnalyticsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Analytics · EliteCuts Admin',
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// CSS variable values used as inline chart colors — intentionally separate from
// the Tailwind-class-based CATEGORY_COLORS in admin-constants (those are for pills).
const CATEGORY_COLORS: Record<string, string> = {
  Beef: 'var(--color-oxblood)',
  Pork: 'var(--color-camel)',
  Poultry: 'var(--color-green)',
  Lamb: 'var(--color-ink)',
  Charcuterie: 'var(--color-camel-soft)',
  Other: 'var(--color-camel-soft)',
};

export default async function AdminAnalyticsPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [currentOrders, previousOrders, newCustomers, prevNewCustomers] = await Promise.all([
    OrderModel.find({ createdAt: { $gte: thirtyDaysAgo } }).lean().exec(),
    OrderModel.find({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }).lean().exec(),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, role: 'customer' }),
    User.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, role: 'customer' }),
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

  // Repeat purchase rate
  const customerOrderMap = new Map<string, number>();
  for (const o of currentOrders) {
    const uid = o.user.toString();
    customerOrderMap.set(uid, (customerOrderMap.get(uid) ?? 0) + 1);
  }
  const totalUnique = customerOrderMap.size;
  const repeating = [...customerOrderMap.values()].filter((c) => c >= 2).length;
  const repeatRate = totalUnique > 0 ? (repeating / totalUnique) * 100 : 0;

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
      const cat = item.productType in CATEGORY_COLORS ? item.productType : 'Other';
      catRevenue[cat] = (catRevenue[cat] ?? 0) + item.price * item.qty;
      catOrders[cat] = (catOrders[cat] ?? 0) + 1;
    }
  }
  const totalCatRevenue = Object.values(catRevenue).reduce((s, v) => s + v, 0);
  const maxCatRevenue = Math.max(1, ...Object.values(catRevenue));

  const categories: AnalyticsData['categories'] = Object.keys(CATEGORY_COLORS)
    .filter((name) => (catRevenue[name] ?? 0) > 0)
    .map((name) => ({
      name,
      revenue: catRevenue[name] ?? 0,
      pct: totalCatRevenue > 0 ? Math.round(((catRevenue[name] ?? 0) / totalCatRevenue) * 100) : 0,
      orders: catOrders[name] ?? 0,
      color: CATEGORY_COLORS[name],
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

  // Weekly revenue chart (5 weeks, newest last)
  const weeklyRevenue: number[] = [];
  const weeklyRevenuePrev: number[] = [];
  for (let w = 4; w >= 0; w--) {
    const wEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const wStart = new Date(wEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    weeklyRevenue.push(
      currentOrders
        .filter((o) => o.createdAt >= wStart && o.createdAt < wEnd)
        .reduce((s, o) => s + o.totalCost, 0),
    );
    weeklyRevenuePrev.push(
      previousOrders
        .filter((o) => o.createdAt >= wStart && o.createdAt < wEnd)
        .reduce((s, o) => s + o.totalCost, 0),
    );
  }

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

  // Period label
  const periodLabel = `${MONTHS[thirtyDaysAgo.getMonth()]} ${thirtyDaysAgo.getDate()} – ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} · Compared to previous 30 days`;

  const data: AnalyticsData = {
    periodLabel,
    revenue,
    revenueChange,
    orderCount: currentOrders.length,
    aov,
    aovChange,
    pickupPct,
    repeatRate,
    newCustomers,
    newCustomersChange,
    cancelRate,
    cancelRateChange,
    categories,
    bestSellers,
    weeklyRevenue,
    weeklyRevenuePrev,
    weeklyRevenueTotal: revenue,
    weeklyRevenuePrevTotal: prevRevenue,
    heatmap,
    heatmapRevenue,
  };

  return <AnalyticsClient data={data} />;
}
