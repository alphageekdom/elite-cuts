import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import OrderModel from '@/models/Order';
import type { Types } from 'mongoose';

import OrdersPageHeader from '@/components/admin/orders/OrdersPageHeader';
import OrdersClient, { type OrderTableRow, type StatusCounts } from '@/components/admin/orders/OrdersClient';

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
};

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Orders · EliteCuts Admin',
};

export default async function AdminOrdersPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const [statusAgg, rawOrders] = await Promise.all([
    OrderModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]),
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
    pending: countMap['Pending'] ?? 0,
    readyForPickup: countMap['Ready for Pickup'] ?? 0,
    completed: countMap['Completed'] ?? 0,
    cancelled: countMap['Cancelled'] ?? 0,
  };

  const orders: OrderTableRow[] = rawOrders.map((order) => {
    const idStr = order._id.toString();
    const user = order.user as PopulatedUser | null;

    return {
      id: idStr,
      orderRef: `#EC-${idStr.slice(-4).toUpperCase()}`,
      customerName: user?.name ?? 'Unknown',
      customerEmail: user?.email ?? '',
      items: order.orderItems.map((item) => ({
        name: item.name,
        image: item.image,
        qty: item.qty,
        price: item.price,
        productType: item.productType,
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.totalCost,
      status: order.orderStatus,
      isPaid: order.isPaid,
      paidAt: order.paidAt?.toISOString(),
      paymentMethod: order.paymentMethod,
      pickupLocation: order.pickupLocation,
      pickedUp: order.pickedUp,
      createdAt: order.createdAt.toISOString(),
    };
  });

  return (
    <>
      <OrdersPageHeader
        totalThisMonth={counts.all}
        pendingCount={counts.pending}
      />
      <OrdersClient orders={orders} counts={counts} />
    </>
  );
}
