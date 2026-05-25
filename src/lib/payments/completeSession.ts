import 'server-only';

import mongoose, { type Types } from 'mongoose';

import connectDB from '@/config/database';
import Order, { type OrderDocument } from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import Cart from '@/models/Cart';
import { reservePromoSeat } from '@/lib/promos/apply';
import { recordCustomerActivity } from '@/lib/auth/account-deletion';
import { notifyAdminsOfNewOrder } from '@/lib/orders/notifications';
import { dollarsToCents } from '@/lib/payments/stripe';

export type CompleteSessionInput = {
  orderId: string;
  // Stripe PaymentIntent id from the webhook event. Undefined in stub mode.
  paymentIntentId?: string;
  // Called when the order can't proceed after payment captured (stock race,
  // promo seat exhausted). Real webhook: stripe.refunds.create. Stub mode:
  // no-op (no real money moved).
  issueRefund: (amountCents: number, reason: string) => Promise<void>;
};

export type CompleteSessionResult =
  | { ok: true; status: 'paid'; orderId: string }
  | { ok: false; status: 'not_found' }
  | { ok: false; status: 'already_advanced'; orderId: string }
  | {
      ok: false;
      status: 'cancelled_out_of_stock' | 'cancelled_promo_exhausted';
      orderId: string;
    };

const decrementStockOrFail = async (
  items: { product: Types.ObjectId; qty: number }[],
): Promise<{ ok: true; decremented: { productId: Types.ObjectId; qty: number }[] } | { ok: false }> => {
  const decremented: { productId: Types.ObjectId; qty: number }[] = [];
  for (const item of items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.product, stockCount: { $gte: item.qty } },
      { $inc: { stockCount: -item.qty } },
    );
    if (!updated) {
      if (decremented.length) {
        await Product.bulkWrite(
          decremented.map((d) => ({
            updateOne: {
              filter: { _id: d.productId },
              update: { $inc: { stockCount: d.qty } },
            },
          })),
        );
      }
      return { ok: false };
    }
    decremented.push({ productId: item.product, qty: item.qty });
  }
  return { ok: true, decremented };
};

const restoreStock = async (
  decremented: { productId: Types.ObjectId; qty: number }[],
): Promise<void> => {
  if (!decremented.length) return;
  await Product.bulkWrite(
    decremented.map((d) => ({
      updateOne: {
        filter: { _id: d.productId },
        update: { $inc: { stockCount: d.qty } },
      },
    })),
  );
};

// Promotes a pending Stripe-session order to paid. Source of truth for what
// "paid" means in this codebase: real Stripe webhook on session.completed and
// the stub-mode mock-complete route both call into this helper.
export const completeSessionForOrder = async (
  input: CompleteSessionInput,
): Promise<CompleteSessionResult> => {
  await connectDB();

  if (!mongoose.isValidObjectId(input.orderId)) {
    return { ok: false, status: 'not_found' };
  }

  // Atomic claim — flip Pending → Authorized in one Mongo op. Only the
  // winning handler runs the stock/promo/points/save sequence below;
  // concurrent webhook retries (and the retry-after-crash window of a single
  // handler) bail at `already_advanced` and never reapply side effects. The
  // happy-path save below flips Authorized → Completed; the cancellation
  // branches flip Authorized → Refunded.
  const order: OrderDocument | null = await Order.findOneAndUpdate(
    { _id: input.orderId, 'paymentResult.status': 'Pending' },
    { $set: { 'paymentResult.status': 'Authorized' } },
    { new: true },
  );

  if (!order) {
    // Either the order doesn't exist or another handler already claimed it.
    // One disambiguating exists-check so the caller can distinguish a
    // missing order from a duplicate webhook delivery.
    const exists = await Order.exists({ _id: input.orderId });
    return exists
      ? { ok: false, status: 'already_advanced', orderId: input.orderId }
      : { ok: false, status: 'not_found' };
  }

  // ── Stock decrement ─────────────────────────────────────────────────
  const stockResult = await decrementStockOrFail(
    order.orderItems.map((it) => ({ product: it.product, qty: it.qty })),
  );

  if (!stockResult.ok) {
    // Customer already paid — refund them and mark cancelled.
    await input.issueRefund(
      dollarsToCents(order.totalCost),
      'Out of stock during payment',
    );
    order.orderStatus = 'Cancelled';
    order.cancellationReason = 'Out of Stock';
    order.cancelledAt = new Date();
    order.paymentResult.status = 'Refunded';
    if (input.paymentIntentId) {
      order.paymentResult.paymentIntentId = input.paymentIntentId;
    }
    await order.save();
    return {
      ok: false,
      status: 'cancelled_out_of_stock',
      orderId: input.orderId,
    };
  }

  // ── Promo seat reservation ──────────────────────────────────────────
  if (order.promoId) {
    const reserved = await reservePromoSeat(order.promoId);
    if (!reserved) {
      await restoreStock(stockResult.decremented);
      await input.issueRefund(
        dollarsToCents(order.totalCost),
        'Promo code exhausted during payment',
      );
      order.orderStatus = 'Cancelled';
      order.cancellationReason = 'Other';
      order.cancelledAt = new Date();
      order.paymentResult.status = 'Refunded';
      if (input.paymentIntentId) {
        order.paymentResult.paymentIntentId = input.paymentIntentId;
      }
      await order.save();
      return {
        ok: false,
        status: 'cancelled_promo_exhausted',
        orderId: input.orderId,
      };
    }
  }

  // ── Points deduction ────────────────────────────────────────────────
  if (order.user && order.pointsRedeemed > 0) {
    await User.findByIdAndUpdate(order.user, {
      $inc: { rewardPoints: -order.pointsRedeemed },
      $push: {
        pointsHistory: {
          delta: -order.pointsRedeemed,
          reason: 'redemption',
          orderId: order._id,
          expiresAt: null,
          createdAt: new Date(),
        },
      },
    });
  }

  // ── Flip to paid ────────────────────────────────────────────────────
  // paymentMethod was stamped at order creation ('Stripe' for the Stripe-
  // redirect path, 'Credit Card' for the demo card-form path). The Stripe
  // webhook just records the real PaymentIntent id and flips status.
  const paidAt = new Date();
  order.isPaid = true;
  order.paidAt = paidAt;
  order.paymentResult.status = 'Completed';
  order.paymentResult.amountPaid = order.totalCost;
  order.paymentResult.paymentDate = paidAt;
  if (input.paymentIntentId) {
    order.paymentResult.paymentIntentId = input.paymentIntentId;
  }
  await order.save();

  // ── Server-side cart wipe for signed-in customers ───────────────────
  if (order.user) {
    await Cart.findOneAndUpdate({ user: order.user }, { items: [] });
  }

  // ── Activity tracking ──────────────────────────────────────────────
  if (order.user) {
    await recordCustomerActivity({ userId: String(order.user), at: paidAt });
  }

  // ── Admin notification — fire-and-forget ───────────────────────────
  notifyAdminsOfNewOrder(String(order._id), order.totalCost).catch((err) =>
    console.error('[completeSession] admin notification error', err),
  );

  return { ok: true, status: 'paid', orderId: input.orderId };
};
