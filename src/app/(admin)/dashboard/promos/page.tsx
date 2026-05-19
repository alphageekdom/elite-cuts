import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Types } from 'mongoose';

import connectDB from '@/config/database';
import OrderModel from '@/models/Order';
import PromoModel from '@/models/Promo';
import { getSessionUser } from '@/lib/getSessionUser';
import PromosClient from '@/components/admin/promos/PromosClient';
import type { PromoFormRow } from '@/components/admin/promos/PromoFormDrawer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Promos · EliteCuts Admin',
};

type SavingsRow = { _id: Types.ObjectId | null; totalSavings: number };

export default async function AdminPromosPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const [rawPromos, savingsRows] = await Promise.all([
    PromoModel.find({}).sort({ createdAt: -1 }).lean().exec(),
    // Sum promoDiscount per promoId. Cancelled orders still count as
    // "savings to date" because the customer's discount was honored on the
    // surviving line items; the saving was real even if the order later
    // refunded.
    OrderModel.aggregate<SavingsRow>([
      { $match: { promoId: { $ne: null }, promoDiscount: { $gt: 0 } } },
      { $group: { _id: '$promoId', totalSavings: { $sum: '$promoDiscount' } } },
    ]),
  ]);

  const savingsByPromoId: Record<string, number> = {};
  for (const row of savingsRows) {
    if (row._id) savingsByPromoId[String(row._id)] = row.totalSavings;
  }

  const promos: PromoFormRow[] = rawPromos.map((p) => ({
    id: String(p._id),
    code: p.code,
    description: p.description,
    type: p.type,
    value: p.value,
    minSubtotalCents: p.minSubtotal ?? null,
    maxDiscountCents: p.maxDiscount ?? null,
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    usageLimit: p.usageLimit ?? null,
    usageCount: p.usageCount ?? 0,
    perCustomerLimit: p.perCustomerLimit ?? 1,
    firstOrderOnly: p.firstOrderOnly ?? false,
    excludesPoints: p.excludesPoints ?? true,
    excludesMember: p.excludesMember ?? false,
    isActive: p.isActive ?? true,
    isPublic: p.isPublic ?? false,
  }));

  return <PromosClient promos={promos} savingsByPromoId={savingsByPromoId} />;
}
