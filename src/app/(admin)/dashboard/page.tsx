import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import User from '@/models/User';
import Order from '@/models/Order';
import type { Types } from 'mongoose';

import DashboardPageHeader from '@/components/admin/dashboard/DashboardPageHeader';
import DashboardStatGrid from '@/components/admin/dashboard/DashboardStatGrid';
import DashboardRevenueChart from '@/components/admin/dashboard/DashboardRevenueChart';
import DashboardTopCuts from '@/components/admin/dashboard/DashboardTopCuts';
import DashboardQuickActions from '@/components/admin/dashboard/DashboardQuickActions';
import DashboardRecentOrders from '@/components/admin/dashboard/DashboardRecentOrders';
import type { OrderRow } from '@/components/admin/dashboard/DashboardRecentOrders';

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard · EliteCuts Admin',
};

export default async function AdminDashboardPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

  const [
    usersCount, ordersCount, revenueResult, rawOrders, topCutsRaw, weeklyRaw, weeklyPrevRaw,
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
      // Weekly revenue buckets — current 30 days split into 5 weeks
      Order.aggregate<{ _id: number; revenue: number }>([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $floor: {
                $divide: [{ $subtract: ['$createdAt', thirtyDaysAgo] }, 7 * 86400000],
              },
            },
            revenue: { $sum: '$totalCost' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Weekly revenue buckets — prior 30 days
      Order.aggregate<{ _id: number; revenue: number }>([
        { $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $floor: {
                $divide: [{ $subtract: ['$createdAt', sixtyDaysAgo] }, 7 * 86400000],
              },
            },
            revenue: { $sum: '$totalCost' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
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

  // Weekly revenue — fill 5 buckets (weeks 0–4) with 0 for missing weeks
  const toWeekBuckets = (raw: { _id: number; revenue: number }[]) => {
    const buckets = [0, 0, 0, 0, 0];
    for (const { _id, revenue: r } of raw) {
      if (_id >= 0 && _id < 5) buckets[_id] = r;
    }
    return buckets;
  };
  const weeklyRevenue = {
    current: toWeekBuckets(weeklyRaw),
    prev: toWeekBuckets(weeklyPrevRaw),
  };

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
        <DashboardRevenueChart weeklyRevenue={weeklyRevenue} />
        <DashboardTopCuts cuts={topCuts} />
      </div>
      <DashboardQuickActions />
      <DashboardRecentOrders orders={orders} />
    </>
  );
}
