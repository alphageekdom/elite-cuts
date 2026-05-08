import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import User from '@/models/User';
import Order from '@/models/Order';
import type { Types } from 'mongoose';

import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import DashboardStatGrid from '@/components/dashboard/DashboardStatGrid';
import DashboardRevenueChart from '@/components/dashboard/DashboardRevenueChart';
import DashboardTopCuts from '@/components/dashboard/DashboardTopCuts';
import DashboardQuickActions from '@/components/dashboard/DashboardQuickActions';
import DashboardRecentOrders from '@/components/dashboard/DashboardRecentOrders';
import type { OrderRow } from '@/components/dashboard/DashboardRecentOrders';

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

  const [usersCount, ordersCount, revenueResult, rawOrders] = await Promise.all([
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
  ]);

  const revenue = revenueResult[0]?.total ?? 0;
  const avgOrder = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;

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
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 mb-4">
        <DashboardRevenueChart />
        <DashboardTopCuts />
      </div>
      <DashboardQuickActions />
      <DashboardRecentOrders orders={orders} />
    </>
  );
}
