import 'server-only';

import { type Types } from 'mongoose';

import connectDB from '@/config/database';
import Promo from '@/models/Promo';

// Atomically reserve a seat against the promo's usageLimit. Returns true if
// the increment landed, false if a concurrent placement just exhausted the
// limit. The $expr filter handles both unlimited promos (usageLimit null or
// missing) and capped promos (usageCount < usageLimit) in one round-trip.
export async function reservePromoSeat(
  promoId: string | Types.ObjectId,
): Promise<boolean> {
  await connectDB();
  const updated = await Promo.findOneAndUpdate(
    {
      _id: promoId,
      $expr: {
        $or: [
          { $eq: ['$usageLimit', null] },
          { $lt: ['$usageCount', '$usageLimit'] },
        ],
      },
    },
    { $inc: { usageCount: 1 } },
  );
  return updated != null;
}

// Returns the customer's seat to the pool. Used on full order cancellation
// and as the rollback hook when a step after reservePromoSeat fails. Guards
// on `usageCount > 0` so a double-release on a freshly-reset promo can't go
// negative.
export async function releasePromoSeat(
  promoId: string | Types.ObjectId,
): Promise<void> {
  await connectDB();
  await Promo.findOneAndUpdate(
    { _id: promoId, usageCount: { $gt: 0 } },
    { $inc: { usageCount: -1 } },
  );
}
