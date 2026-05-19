import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/getSessionUser';
import connectDB from '@/config/database';
import User from '@/models/User';
import Order from '@/models/Order';
import type { Types } from 'mongoose';

import DashboardPageHeader from '@/components/admin/dashboard/DashboardPageHeader';
import DashboardStatGrid from '@/components/admin/dashboard/DashboardStatGrid';
import DashboardTopCuts from '@/components/admin/dashboard/DashboardTopCuts';
import DashboardRecentOrders from '@/components/admin/dashboard/DashboardRecentOrders';
import type { OrderRow } from '@/components/admin/dashboard/DashboardRecentOrders';
import RevenueCard, { type RevenueBucket } from '@/components/admin/analytics/RevenueCard';
import type { RangeKey } from '@/components/admin/analytics/RangeToggle';
import { MONTH_ABBR } from '@/lib/format';

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard · EliteCuts Admin',
};

const DAY_MS = 86400000;
const WEEKDAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const ALLOWED_RANGES: RangeKey[] = ['7D', '30D', '90D', '1Y'];
const RANGE_DAYS: Record<RangeKey, number> = { '7D': 7, '30D': 30, '90D': 90, '1Y': 360 };
const RANGE_BUCKETS: Record<
  RangeKey,
  { count: number; sizeDays: number; unit: 'Day' | 'Week' | 'Biweekly' | 'Monthly' }
> = {
  '7D': { count: 7, sizeDays: 1, unit: 'Day' },
  '30D': { count: 5, sizeDays: 6, unit: 'Week' },
  '90D': { count: 6, sizeDays: 15, unit: 'Biweekly' },
  '1Y': { count: 12, sizeDays: 30, unit: 'Monthly' },
};

const parseRange = (raw: string | undefined): RangeKey => {
  const upper = raw?.toUpperCase();
  return ALLOWED_RANGES.includes(upper as RangeKey) ? (upper as RangeKey) : '30D';
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

  const [
    usersCount, ordersCount, revenueResult, rawOrders, topCutsRaw,
    chartOrders, chartPrevOrders,
    currentPeriodAgg, prevPeriodAgg, currentCustomers, prevCustomers,
  ] = await Promise.all([
      User.countDocuments({}),
      Order.countDocuments({}),
      Order.aggregate<{ total: number }>([
        { $group: { _id: null, total: { $sum: '$totalCost' } } },
      ]),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate<{ user: PopulatedUser }>('user', 'name email')
        .lean()
        .exec(),
      // Top 5 cuts by revenue in last 30 days
      Order.aggregate<{ _id: string; revenue: number; sold: number }>([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
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
      Order.find({ createdAt: { $gte: chartWindowStart } }, 'createdAt totalCost').lean().exec(),
      // Same shape, previous comparable period.
      Order.find(
        { createdAt: { $gte: chartPrevWindowStart, $lt: chartWindowStart } },
        'createdAt totalCost',
      ).lean().exec(),
      // Current 30-day period: revenue + order count
      Order.aggregate<{ total: number; count: number }>([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$totalCost' }, count: { $sum: 1 } } },
      ]),
      // Prior 30-day period: revenue + order count
      Order.aggregate<{ total: number; count: number }>([
        { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$totalCost' }, count: { $sum: 1 } } },
      ]),
      // New customers: current 30 days
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      // New customers: prior 30 days
      User.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
    ]);

  const revenue = revenueResult[0]?.total ?? 0;
  const avgOrder = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;

  // Period-over-period stats for change pills
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

  // Bucket chart orders into range-sized windows — daily for 7D, weekly for
  // 30D, biweekly for 90D, monthly for 1Y. Same shape RevenueCard expects.
  const chartBuckets: RevenueBucket[] = [];
  for (let i = bucketCfg.count - 1; i >= 0; i--) {
    const bEnd = new Date(now.getTime() - i * bucketCfg.sizeDays * DAY_MS);
    const bStart = new Date(bEnd.getTime() - bucketCfg.sizeDays * DAY_MS);
    const prevEnd = new Date(bEnd.getTime() - rangeDays * DAY_MS);
    const prevStart = new Date(bStart.getTime() - rangeDays * DAY_MS);

    let label: string;
    if (bucketCfg.unit === 'Day') {
      label = WEEKDAY_ABBR[bEnd.getDay()];
    } else if (bucketCfg.unit === 'Week') {
      label = `WK ${bucketCfg.count - i}`;
    } else if (bucketCfg.unit === 'Monthly') {
      label = MONTH_ABBR[bStart.getMonth()];
    } else {
      label = `${MONTH_ABBR[bStart.getMonth()]} ${bStart.getDate()}`;
    }

    chartBuckets.push({
      label,
      value: chartOrders
        .filter((o) => o.createdAt >= bStart && o.createdAt < bEnd)
        .reduce((s, o) => s + o.totalCost, 0),
      prevValue: chartPrevOrders
        .filter((o) => o.createdAt >= prevStart && o.createdAt < prevEnd)
        .reduce((s, o) => s + o.totalCost, 0),
    });
  }
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

  return (
    <>
      <DashboardPageHeader name={name} />
      <DashboardStatGrid
        revenue={revenue}
        orders={ordersCount}
        customers={usersCount}
        avgOrder={avgOrder}
        currentMonthRevenue={currentMonthRevenue}
        prevMonthRevenue={prevMonthRevenue}
        currentMonthOrders={currentMonthOrders}
        prevMonthOrders={prevMonthOrders}
        currentMonthCustomers={currentCustomers}
        prevMonthCustomers={prevCustomers}
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
