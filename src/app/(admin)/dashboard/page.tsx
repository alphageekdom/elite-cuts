import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import connectDB from '@/config/database';
import User from '@/models/User';
import Order from '@/models/Order';
import type { Types } from 'mongoose';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import DashboardStatGrid from '@/components/admin/dashboard/DashboardStatGrid';
import DashboardTopCuts from '@/components/admin/dashboard/DashboardTopCuts';
import DashboardRecentOrders from '@/components/admin/dashboard/DashboardRecentOrders';
import type { OrderRow } from '@/components/admin/dashboard/DashboardRecentOrders';
import RevenueCard from '@/components/admin/analytics/RevenueCard';
import { excludeDemoOrders } from '@/lib/demo/exclude';
import {
  DAY_MS,
  RANGE_DAYS,
  RANGE_BUCKETS,
  parseRange,
  buildRangeBuckets,
} from '@/lib/admin/range-buckets';

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard · Admin',
};

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: Props) {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);
  const rangeDays = RANGE_DAYS[range];
  const bucketCfg = RANGE_BUCKETS[range];

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * DAY_MS);
  const chartWindowStart = new Date(now.getTime() - rangeDays * DAY_MS);
  const chartPrevWindowStart = new Date(now.getTime() - 2 * rangeDays * DAY_MS);

  // Phase D — exclude demo activity from every admin aggregate so it
  // doesn't move the real metrics. `excludeDemo` filters out the demo
  // customer's orders (the demo admin places none) and resolves to `{}`
  // when no demo customer exists. The user filter is a flat
  // `{ isDemo: { $ne: true } }` so both demo accounts drop out of user
  // counts.
  const excludeDemo = await excludeDemoOrders();
  const excludeDemoUser = { isDemo: { $ne: true } };

  const [
    rawOrders, topCutsRaw,
    chartOrders, chartPrevOrders,
    currentPeriodAgg, prevPeriodAgg, currentCustomers, prevCustomers,
  ] = await Promise.all([
      Order.find(excludeDemo)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate<{ user: PopulatedUser }>('user', 'name email')
        .lean()
        .exec(),
      // Top 5 cuts by revenue in last 30 days
      Order.aggregate<{ _id: string; revenue: number; sold: number }>([
        { $match: { ...excludeDemo, createdAt: { $gte: thirtyDaysAgo } } },
        { $unwind: '$orderItems' },
        {
          $group: {
            _id: '$orderItems.name',
            revenue: { $sum: { $multiply: ['$orderItems.price', '$orderItems.qty'] } },
            sold: { $sum: '$orderItems.qty' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      // Orders inside the active chart range — bucketed in JS so bucket size
      // (daily / weekly / biweekly / monthly) varies with the selected range.
      Order.find(
        { ...excludeDemo, createdAt: { $gte: chartWindowStart } },
        'createdAt totalCost',
      ).lean().exec(),
      // Same shape, previous comparable period.
      Order.find(
        { ...excludeDemo, createdAt: { $gte: chartPrevWindowStart, $lt: chartWindowStart } },
        'createdAt totalCost',
      ).lean().exec(),
      // Current 30-day period: revenue + order count
      Order.aggregate<{ total: number; count: number }>([
        { $match: { ...excludeDemo, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$totalCost' }, count: { $sum: 1 } } },
      ]),
      // Prior 30-day period: revenue + order count
      Order.aggregate<{ total: number; count: number }>([
        { $match: { ...excludeDemo, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$totalCost' }, count: { $sum: 1 } } },
      ]),
      // New customers: current 30 days
      User.countDocuments({ ...excludeDemoUser, createdAt: { $gte: thirtyDaysAgo } }),
      // New customers: prior 30 days
      User.countDocuments({
        ...excludeDemoUser,
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      }),
    ]);

  // Headline stat values use the active 30-day window so the value and its
  // change pill compare the same period — see context history 2026-05-13.
  const currentMonthRevenue = currentPeriodAgg[0]?.total ?? 0;
  const currentMonthOrders  = currentPeriodAgg[0]?.count ?? 0;
  const prevMonthRevenue    = prevPeriodAgg[0]?.total ?? 0;
  const prevMonthOrders     = prevPeriodAgg[0]?.count ?? 0;

  // Top cuts — normalize bar widths relative to the highest earner
  const maxRevenue = topCutsRaw[0]?.revenue ?? 1;
  const topCuts = topCutsRaw.map((c) => ({
    name: c._id,
    revenue: c.revenue,
    sold: c.sold,
    widthPct: Math.round((c.revenue / maxRevenue) * 100),
  }));

  const chartBuckets = buildRangeBuckets(range, now, chartOrders, chartPrevOrders);
  const chartTotal = chartOrders.reduce((s, o) => s + o.totalCost, 0);
  const chartPrevTotal = chartPrevOrders.reduce((s, o) => s + o.totalCost, 0);

  const orders: OrderRow[] = rawOrders.map((order) => {
    const idStr = order._id.toString();
    const user = order.user as PopulatedUser | null;
    const firstItem = order.orderItems[0];

    return {
      id: idStr,
      orderRef: `#EC-${idStr.slice(-4).toUpperCase()}`,
      customerName: user?.name ?? 'Unknown',
      customerEmail: user?.email ?? '',
      cut: firstItem ? `${firstItem.name} · ${firstItem.qty}${firstItem.qty > 1 ? 'x' : ''}` : 'Unknown',
      status: order.orderStatus,
      total: order.totalCost,
    };
  });

  const name = sessionUser.user.name ?? 'Admin';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <AdminPageHeader
        eyebrow={`Welcome back, ${name}`}
        breadcrumb="Overview"
        title="This month's"
        titleAccent="counter."
        subtitle={
          <>
            {today}
            <span className="mx-2">·</span>
            Here&apos;s how the shop is running.
          </>
        }
      />
      <DashboardStatGrid
        currentRevenue={currentMonthRevenue}
        prevRevenue={prevMonthRevenue}
        currentOrders={currentMonthOrders}
        prevOrders={prevMonthOrders}
        currentNewCustomers={currentCustomers}
        prevNewCustomers={prevCustomers}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 mb-4">
        <RevenueCard
          range={range}
          buckets={chartBuckets}
          bucketUnit={bucketCfg.unit}
          revenueTotal={chartTotal}
          revenuePrevTotal={chartPrevTotal}
          basePath="/dashboard"
        />
        <DashboardTopCuts cuts={topCuts} />
      </div>
      <DashboardRecentOrders orders={orders} />
    </>
  );
}
