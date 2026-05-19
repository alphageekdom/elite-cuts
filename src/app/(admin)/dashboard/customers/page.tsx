import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/getSessionUser';
import connectDB from '@/config/database';
import UserModel from '@/models/User';
import OrderModel from '@/models/Order';
import type { Types } from 'mongoose';

import { serializeCustomerRow, type OrderStats } from '@/lib/serializers';
import { countByStat } from '@/lib/customer-status';
import CustomersClient, {
  type CustomerTableRow,
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

  // Stat-strip counts share the same matcher the client uses to filter the
  // table, so the chip counts can't drift from what the chips actually show.
  const counts = countByStat(customers);

  // `new this week` is a header-only metric (not one of the stat filters),
  // so it stays inline.
  const now = Date.now();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  let newThisWeek = 0;
  for (const c of customers) {
    if (now - new Date(c.createdAt).getTime() < ONE_WEEK_MS) newThisWeek++;
  }

  return (
    <CustomersClient
      customers={customers}
      counts={counts}
      total={customers.length}
      newThisWeek={newThisWeek}
    />
  );
}
