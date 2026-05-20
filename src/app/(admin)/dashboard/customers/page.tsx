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
  _id: Types.ObjectId;
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

  const rawUsers = await UserModel.find({ isAdmin: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()
    .exec();

  // Scope the per-customer stats aggregation to the 200 users actually being
  // rendered. The previous shape grouped every order in the database on every
  // page load — a full-collection scan that grows linearly with orders, not
  // with customers, even though the table only shows 200 rows.
  const userIds = rawUsers.map((u) => u._id);
  const orderAgg = await OrderModel.aggregate<OrderAggResult>([
    { $match: { user: { $in: userIds } } },
    {
      $group: {
        _id: '$user',
        count: { $sum: 1 },
        totalSpend: { $sum: '$totalCost' },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
  ]);

  const orderMap = new Map<string, OrderStats>();
  for (const entry of orderAgg) {
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
  // Server component — renders once per request, so Date.now() can't trigger the
  // cascading-render scenario react-hooks/purity guards against.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  let newThisWeek = 0;
  // Demo accounts are excluded here too so the header subtitle stays consistent
  // with the stat-chip counts (which skip demo accounts via `countByStat`).
  for (const c of customers) {
    if (c.isDemo) continue;
    if (now - new Date(c.createdAt).getTime() < ONE_WEEK_MS) newThisWeek++;
  }

  return (
    <CustomersClient
      customers={customers}
      counts={counts}
      total={customers.filter((c) => !c.isDemo).length}
      newThisWeek={newThisWeek}
    />
  );
}
