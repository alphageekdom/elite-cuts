import 'server-only';
import type { Types } from 'mongoose';

import User from '@/models/User';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Notification from '@/models/Notification';
import { getShopSettings } from '@/lib/shop-settings/queries';
import { computeAward, getQualifyingPoints, getTier, tierRank } from '@/lib/rewards/calculator';

// Side-effects to run whenever an order first transitions into Completed:
// award reward points to the customer, then fire low_stock alerts to admins
// for any products that have dipped at/below par as a result of fulfilment.
// Used by both the order PATCH route (status transitions) and the order POST
// admin-create flow when an offline-paid pickup is recorded directly as
// Completed. Both surfaces must funnel through here so points and alerts stay
// consistent regardless of which path created the completion event.
export async function awardOrderCompletion(opts: {
  orderId: Types.ObjectId | string;
  customerUserId: Types.ObjectId | string;
  subtotal: number;
  productIds: Types.ObjectId[];
  awardedOn?: Date;
}): Promise<void> {
  const settings = await getShopSettings();
  const awardedOn = opts.awardedOn ?? new Date();
  const pointsEarned = computeAward(opts.subtotal, settings, awardedOn);

  if (pointsEarned > 0) {
    // Stamp the points on the order so the audit trail survives even if the
    // user doc is later mutated. Order is the historical record of truth.
    await Order.findByIdAndUpdate(opts.orderId, { $set: { pointsAwarded: pointsEarned } });

    const expiresAt =
      settings.pointsExpiryMonths > 0
        ? new Date(awardedOn.getTime() + settings.pointsExpiryMonths * 30 * 24 * 60 * 60 * 1000)
        : null;

    await User.findByIdAndUpdate(opts.customerUserId, {
      $inc: { rewardPoints: pointsEarned, lifetimePoints: pointsEarned },
      $push: {
        pointsHistory: {
          delta: pointsEarned,
          reason: 'order_fulfilled',
          orderId: opts.orderId,
          expiresAt,
          createdAt: awardedOn,
        },
      },
    });

    // Mid-period tier-up: if the just-added points push the customer's
    // current-period qualifying total past the next tier threshold, lock
    // the new tier on the user doc. Anniversary clock does NOT reset —
    // they still need to re-qualify next year to keep the new tier.
    if (settings.tierWindowMonths > 0) {
      const refreshed = await User.findById(opts.customerUserId)
        .select('createdAt tierAnniversaryAt currentTier pointsHistory')
        .lean();
      if (refreshed) {
        const periodStart = refreshed.tierAnniversaryAt
          ? new Date(refreshed.tierAnniversaryAt)
          : (refreshed.createdAt ?? awardedOn);
        const qualifying = getQualifyingPoints(
          refreshed.pointsHistory ?? [],
          periodStart,
          awardedOn,
        );
        const earnedTier = getTier(qualifying, settings).tier;
        const cachedTier = refreshed.currentTier ?? 'regular';
        if (tierRank(earnedTier) > tierRank(cachedTier)) {
          await User.findByIdAndUpdate(opts.customerUserId, {
            $set: { currentTier: earnedTier },
          });
        }
      }
    }
  }

  // Low-stock notifications are fire-and-forget — gated on
  // settings.notifLowStock; getShopSettings fails open so a settings outage
  // doesn't silence the alert.
  (async () => {
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

// Reverse the points award when an order transitions out of Completed via
// cancellation or full refund. Balance and lifetime drop by the snapshot
// stored on the order, both floored at 0 so reversal never produces a
// negative ledger. The order's pointsAwarded snapshot stays put so the
// order remains a complete historical record — re-completion (rare but
// legal) overwrites it via awardOrderCompletion, so persistence here
// doesn't double-credit on the next transition.
export async function reverseOrderAward(opts: {
  orderId: Types.ObjectId | string;
  reason: 'cancel_reverse' | 'refund_reverse';
}): Promise<void> {
  const order = await Order.findById(opts.orderId).select('user pointsAwarded').lean();
  if (!order || !order.pointsAwarded || order.pointsAwarded <= 0) return;

  const points = order.pointsAwarded;
  const user = await User.findById(order.user).select('rewardPoints lifetimePoints').lean();
  if (!user) return;

  const nextBalance = Math.max(0, (user.rewardPoints ?? 0) - points);
  const nextLifetime = Math.max(0, (user.lifetimePoints ?? 0) - points);

  await User.findByIdAndUpdate(order.user, {
    $set: { rewardPoints: nextBalance, lifetimePoints: nextLifetime },
    $push: {
      pointsHistory: {
        delta: -points,
        reason: opts.reason,
        orderId: opts.orderId,
        expiresAt: null,
        createdAt: new Date(),
      },
    },
  });
}

// Reverse a checkout-time redemption when an order is cancelled or
// partially refunded. The redeemed points return to the customer's
// balance and a matching reverse entry lands in the ledger. Lifetime
// points aren't touched — redemption never earned lifetime in the first
// place.
//
// pointsToReturn:
//   - omitted → returns the un-returned remainder (pointsRedeemed minus
//     pointsRedemptionReturned). Used by the full-cancel path so the
//     customer ends up whole regardless of any prior partial returns.
//   - provided → returns exactly that many, still capped at the remainder
//     so multiple partial refunds can never return more than was redeemed.
//
// The order's pointsRedeemed snapshot stays put for historical accuracy;
// pointsRedemptionReturned tracks how much of it has been returned so far.
export async function reverseOrderRedemption(opts: {
  orderId: Types.ObjectId | string;
  reason: 'cancel_reverse' | 'refund_reverse';
  pointsToReturn?: number;
}): Promise<void> {
  const order = await Order.findById(opts.orderId)
    .select('user pointsRedeemed pointsRedemptionReturned')
    .lean();
  if (!order || !order.pointsRedeemed || order.pointsRedeemed <= 0) return;

  const alreadyReturned = Math.max(0, order.pointsRedemptionReturned ?? 0);
  const remainder = Math.max(0, order.pointsRedeemed - alreadyReturned);
  if (remainder <= 0) return;

  const requested =
    typeof opts.pointsToReturn === 'number'
      ? Math.max(0, Math.floor(opts.pointsToReturn))
      : remainder;
  const points = Math.min(requested, remainder);
  if (points <= 0) return;

  await User.findByIdAndUpdate(order.user, {
    $inc: { rewardPoints: points },
    $push: {
      pointsHistory: {
        delta: points,
        reason: opts.reason,
        orderId: opts.orderId,
        expiresAt: null,
        createdAt: new Date(),
      },
    },
  });

  await Order.findByIdAndUpdate(opts.orderId, {
    $inc: { pointsRedemptionReturned: points },
  });
}
