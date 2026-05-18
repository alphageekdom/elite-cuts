import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import UserModel from '@/models/User';
import OrderModel from '@/models/Order';
import type { Types } from 'mongoose';

import { serializeCustomerRow, type OrderStats } from '@/lib/serializers';
import CustomersClient, {
  type CustomerTableRow,
  type CustomerCounts,
} from '@/components/admin/customers/CustomersClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Customers · EliteCuts Admin',
};

type OrderAggResult = {
  _id: Types.ObjectId | null;
  count: number;
  totalSpend: number;
  lastOrderAt: Date;
};

export default async function AdminCustomersPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const [rawUsers, orderAgg] = await Promise.all([
    UserModel.find({ isAdmin: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec(),
    OrderModel.aggregate<OrderAggResult>([
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 },
          totalSpend: { $sum: '$totalCost' },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
    ]),
  ]);

  const orderMap = new Map<string, OrderStats>();
  for (const entry of orderAgg) {
    // Guest orders have `user: null` and group into a null bucket — skip them
    // so the orderMap only covers signed-in customers.
    if (entry._id == null) continue;
    orderMap.set(entry._id.toString(), {
      count: entry.count,
      totalSpend: entry.totalSpend,
      lastOrderAt: entry.lastOrderAt.toISOString(),
    });
  }

  // Pure serialization — no side effects
  const customers: CustomerTableRow[] = rawUsers.map((u) => serializeCustomerRow(u, orderMap));

  // Aggregation — separate pass over the already-serialized rows
  const now = Date.now();
  const ONE_WEEK_MS    =  7 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

  let newThisWeek = 0, newThisMonth = 0, activeCount = 0, connoisseurPlusCount = 0, dormantCount = 0;
  for (const c of customers) {
    const accountAge = now - new Date(c.createdAt).getTime();
    if (accountAge < ONE_WEEK_MS) newThisWeek++;
    if (accountAge < THIRTY_DAYS_MS) newThisMonth++;
    if (c.lastOrderAt && now - new Date(c.lastOrderAt).getTime() <= NINETY_DAYS_MS) activeCount++;
    if (c.orderCount >= 10) connoisseurPlusCount++;
    if (c.dormancyWarnedAt && !c.deletedAt) dormantCount++;
  }

  const counts: CustomerCounts = {
    all: customers.length,
    new: newThisMonth,
    active: activeCount,
    connoisseurPlus: connoisseurPlusCount,
    dormant: dormantCount,
  };

  return (
    <CustomersClient
      customers={customers}
      counts={counts}
      total={customers.length}
      newThisWeek={newThisWeek}
    />
  );
}
