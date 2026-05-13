import 'server-only';
import type { Types } from 'mongoose';

import User from '@/models/User';
import Product from '@/models/Product';
import Notification from '@/models/Notification';
import { getShopSettings } from '@/lib/shopSettings';

// Side-effects to run whenever an order first transitions into Completed:
// award reward points to the customer, then fire low_stock alerts to admins
// for any products that have dipped at/below par as a result of fulfilment.
// Used by both the order PATCH route (status transitions) and the order POST
// admin-create flow when an offline-paid pickup is recorded directly as
// Completed. Both surfaces must funnel through here so points and alerts stay
// consistent regardless of which path created the completion event.
export async function awardOrderCompletion(opts: {
  customerUserId: Types.ObjectId | string;
  totalCost: number;
  productIds: Types.ObjectId[];
}): Promise<void> {
  const pointsEarned = Math.floor(opts.totalCost);
  await User.findByIdAndUpdate(opts.customerUserId, { $inc: { rewardPoints: pointsEarned } });

  // Low-stock notifications are fire-and-forget — gated on
  // settings.notifLowStock; getShopSettings fails open so a settings outage
  // doesn't silence the alert.
  (async () => {
    const settings = await getShopSettings();
    if (!settings.notifLowStock) return;
    const [products, admins] = await Promise.all([
      Product.find(
        { _id: { $in: opts.productIds }, parLevel: { $gt: 0 } },
        'name stockCount parLevel',
      ).lean(),
      User.find({ isAdmin: true }, '_id').lean(),
    ]);
    const lowStock = products.filter((p) => p.stockCount <= (p.parLevel ?? 0));
    if (!lowStock.length || !admins.length) return;
    const docs = lowStock.flatMap((p) =>
      admins.map((a) => ({
        type: 'low_stock' as const,
        title: 'Low stock alert',
        body: `${p.name} is down to ${p.stockCount} remaining (par: ${p.parLevel ?? 0})`,
        userId: a._id,
        readAt: null,
      })),
    );
    await Notification.insertMany(docs);
  })().catch((err) => console.error('[awardOrderCompletion] low_stock notification error', err));
}
