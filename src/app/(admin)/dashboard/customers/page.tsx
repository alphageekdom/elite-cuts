import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import UserModel from '@/models/User';
import OrderModel from '@/models/Order';
import type { Types } from 'mongoose';

import CustomersPageHeader from '@/components/admin/customers/CustomersPageHeader';
import CustomersClient, {
  type CustomerTableRow,
  type CustomerCounts,
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

  const [rawUsers, orderAgg] = await Promise.all([
    UserModel.find({ role: 'customer' })
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

  const orderMap = new Map<string, { count: number; totalSpend: number; lastOrderAt: string }>();
  for (const entry of orderAgg) {
    orderMap.set(entry._id.toString(), {
      count: entry.count,
      totalSpend: entry.totalSpend,
      lastOrderAt: entry.lastOrderAt.toISOString(),
    });
  }

  const now = Date.now();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

  let newThisWeek = 0;
  let newThisMonth = 0;
  let activeCount = 0;
  let connoisseurPlusCount = 0;
  let atRiskCount = 0;

  const customers: CustomerTableRow[] = rawUsers.map((u) => {
    const id = u._id.toString();
    const stats = orderMap.get(id);
    const createdAt = u.createdAt.toISOString();
    const orderCount = stats?.count ?? 0;
    const totalSpend = stats?.totalSpend ?? 0;
    const lastOrderAt = stats?.lastOrderAt;
    const accountAge = now - new Date(createdAt).getTime();

    if (accountAge < ONE_WEEK_MS) newThisWeek++;
    if (accountAge < THIRTY_DAYS_MS) newThisMonth++;
    if (lastOrderAt && now - new Date(lastOrderAt).getTime() <= NINETY_DAYS_MS) activeCount++;
    if (orderCount >= 10) connoisseurPlusCount++;
    if (lastOrderAt && now - new Date(lastOrderAt).getTime() > NINETY_DAYS_MS) atRiskCount++;
    else if (!lastOrderAt && accountAge > NINETY_DAYS_MS) atRiskCount++;

    const defaultAddress = (u.addresses ?? []).find((a) => a.isDefault);

    return {
      id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      createdAt,
      orderCount,
      totalSpend,
      lastOrderAt,
      defaultCity: defaultAddress
        ? `${defaultAddress.city}, ${defaultAddress.state}`
        : undefined,
      savedCutsCount: (u.savedCuts ?? []).length,
    };
  });

  const counts: CustomerCounts = {
    all: customers.length,
    new: newThisMonth,
    active: activeCount,
    connoisseurPlus: connoisseurPlusCount,
    atRisk: atRiskCount,
  };

  return (
    <>
      <CustomersPageHeader
        total={customers.length}
        newThisWeek={newThisWeek}
        atRisk={atRiskCount}
      />
      <CustomersClient customers={customers} counts={counts} />
    </>
  );
}
