import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import OrderModel from '@/models/Order';
import type { Types } from 'mongoose';

import { serializeOrderRow } from '@/lib/serializers';
import OrdersClient, { type OrderTableRow, type StatusCounts } from '@/components/admin/orders/OrdersClient';

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Orders · EliteCuts Admin',
};

export default async function AdminOrdersPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [statusAgg, monthOrdersCount, rawOrders] = await Promise.all([
    OrderModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]),
    OrderModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
    OrderModel.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .populate<{ user: PopulatedUser }>('user', 'name email')
      .lean()
      .exec(),
  ]);

  const countMap: Record<string, number> = {};
  let totalAll = 0;
  for (const { _id, count } of statusAgg) {
    countMap[_id] = count;
    totalAll += count;
  }

  const counts: StatusCounts = {
    all: totalAll,
    orderPlaced: countMap['Order Placed'] ?? 0,
    preparing: countMap['Preparing'] ?? 0,
    readyForPickup: countMap['Ready for Pickup'] ?? 0,
    outForDelivery: countMap['Out for Delivery'] ?? 0,
    completed: countMap['Completed'] ?? 0,
    cancelled: countMap['Cancelled'] ?? 0,
  };

  const orders: OrderTableRow[] = rawOrders.map((order) =>
    serializeOrderRow({ ...order, user: order.user as PopulatedUser | null }),
  );

  return (
    <OrdersClient
      orders={orders}
      counts={counts}
      monthOrdersCount={monthOrdersCount}
    />
  );
}
