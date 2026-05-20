import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/getSessionUser';
import connectDB from '@/config/database';
import OrderModel from '@/models/Order';
import type { Types } from 'mongoose';

import UserModel from '@/models/User';
import ProductModel from '@/models/Product';

import { getShopSettings } from '@/lib/shopSettings';
import { serializeOrderRow } from '@/lib/serializers';
import OrdersClient, {
  type OrderTableRow,
  type StatusCounts,
  type AdminOrderCustomer,
  type AdminOrderProduct,
} from '@/components/admin/orders/OrdersClient';
import type { RangeKey } from '@/components/admin/analytics/RangeToggle';

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Orders · EliteCuts Admin',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_RANGES = ['7D', '30D', '90D', '1Y'] as const satisfies readonly RangeKey[];
const RANGE_DAYS: Record<RangeKey, number> = { '7D': 7, '30D': 30, '90D': 90, '1Y': 360 };

const parseRange = (raw: string | undefined): RangeKey => {
  const upper = raw?.toUpperCase();
  return (ALLOWED_RANGES as readonly string[]).includes(upper ?? '')
    ? (upper as RangeKey)
    : '30D';
};

type Props = {
  searchParams: Promise<{ range?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);
  // Server component — renders once per request, Date.now() is safe here.
  // eslint-disable-next-line react-hooks/purity
  const windowStart = new Date(Date.now() - RANGE_DAYS[range] * DAY_MS);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [statusAgg, monthOrdersCount, rawOrders, rawCustomers, rawProducts, shopSettings] = await Promise.all([
    OrderModel.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: windowStart } } },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]),
    OrderModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
    OrderModel.find({ createdAt: { $gte: windowStart } })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate<{ user: PopulatedUser }>('user', 'name email')
      .lean()
      .exec(),
    UserModel.find({ isAdmin: { $ne: true } }, 'name email')
      .sort({ name: 1 })
      .limit(500)
      .lean()
      .exec(),
    ProductModel.find(
      { isActive: { $ne: false }, stockCount: { $gt: 0 } },
      'name price stockCount images category',
    )
      .sort({ category: 1, name: 1 })
      .limit(500)
      .lean()
      .exec(),
    getShopSettings(),
  ]);

  const customers: AdminOrderCustomer[] = rawCustomers.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
  }));

  const products: AdminOrderProduct[] = rawProducts.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    price: p.price,
    stockCount: p.stockCount,
    image: p.images?.[0] ?? '',
    category: p.category,
  }));

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
      range={range}
      customers={customers}
      products={products}
      defaultPickupLocation={`${shopSettings.shopName} — In Store`}
    />
  );
}
