import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import connectDB from '@/config/database';
import Order, { ORDER_STATUSES, CANCELLATION_REASONS } from '@/models/Order';
import Product from '@/models/Product';
import { getSessionUser } from '@/lib/getSessionUser';
import { withAdminNonDemo } from '@/lib/api-handler';
import { isIn } from '@/lib/validation';
import { refundSummary, paymentStatusFor } from '@/lib/order-refunds';
import { awardOrderCompletion, reverseOrderAward, reverseOrderRedemption } from '@/lib/order-completion';
import { releasePromoSeat } from '@/lib/promos/apply';
import { getStripe, isStubMode, dollarsToCents } from '@/lib/payments/stripe';
import { runOrderSettlement } from '@/lib/payments/orderSettlement';
import { notifyAdminsOfSettlementFailure } from '@/lib/order-notifications';

type RouteContext = { params: Promise<{ id: string }> };

// Sized to a clear retail ceiling — a whole hindquarter trends under 200 lb.
// Without it the downstream receipt and refund math in dollars would accept
// a 1e10 typo as-is.
const REALIZED_WEIGHT_MAX_LB = 500;

// GET /api/orders/:id — self or admin only
export const GET = async (_request: NextRequest, { params }: RouteContext) => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const order = await Order.findById(id).populate('user', 'name email');

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const orderUserId = order.user
      ? String(
          (order.user as unknown as { _id?: unknown })._id ?? order.user,
        )
      : null;
    const isOwner = orderUserId !== null && orderUserId === sessionUser.userId;
    if (!isOwner && !sessionUser.user?.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Strip Stripe-side identifiers from the customer-self branch. They're
    // not rendered by the customer-facing receipt or profile pages and a
    // raw checkoutSessionId / paymentIntentId is enough to make abuse easier
    // (support-channel impersonation, brute-force probing). Admins still
    // see the full payment envelope for refund triage.
    if (!sessionUser.user?.isAdmin) {
      const serialized = order.toObject();
      if (serialized.paymentResult) {
        delete serialized.paymentResult.checkoutSessionId;
        delete serialized.paymentResult.paymentIntentId;
        delete serialized.paymentResult.settlementPaymentIntents;
        delete serialized.paymentResult.settlementError;
      }
      return NextResponse.json(serialized);
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('[orders/:id GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// DELETE /api/orders/:id — admin only
export const DELETE = withAdminNonDemo(async (_request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const deleted = await Order.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ data: { id }, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('[orders/:id DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

// PATCH /api/orders/:id — admin updates order status and/or refunds line items
export const PATCH = withAdminNonDemo(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const {
      orderStatus,
      cancellationReason,
      refundItemIndices,
      unrefundItemIndices,
      realizedWeights,
    } = (await request.json()) as {
      orderStatus?: string;
      cancellationReason?: string;
      refundItemIndices?: number[];
      unrefundItemIndices?: number[];
      // Per-line weighed-at-pickup values. `weightLb: null` clears a prior
      // entry (e.g. admin scaled the wrong cut and needs to redo).
      realizedWeights?: Array<{ index: number; weightLb: number | null }>;
    };

    if (!orderStatus && !refundItemIndices && !unrefundItemIndices && !realizedWeights) {
      return NextResponse.json(
        { message: 'Provide orderStatus, refundItemIndices, unrefundItemIndices, or realizedWeights' },
        { status: 400 },
      );
    }

    if (orderStatus && !isIn(ORDER_STATUSES, orderStatus)) {
      return NextResponse.json(
        { message: `orderStatus must be one of: ${ORDER_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    // Fetch before update so we know the previous status
    const existing = await Order.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const updateFields: Record<string, unknown> = {};

    if (orderStatus) {
      updateFields.orderStatus = orderStatus;
      if (orderStatus === 'Cancelled') {
        if (cancellationReason && !isIn(CANCELLATION_REASONS, cancellationReason)) {
          return NextResponse.json(
            { message: `cancellationReason must be one of: ${CANCELLATION_REASONS.join(', ')}` },
            { status: 400 },
          );
        }
        updateFields.cancellationReason = cancellationReason ?? null;
      } else {
        updateFields.cancellationReason = null;
      }

      // Stamp the transition timestamp the first time we enter the target
      // state. Re-transitioning (e.g. Cancelled → Preparing → Cancelled again)
      // preserves the original stamp. `pickedUpAt` rides on the Completed
      // transition since that's when a pickup order is actually picked up.
      const now = new Date();
      if (orderStatus === 'Ready for Pickup' && !existing.readyAt) {
        updateFields.readyAt = now;
      }
      if (orderStatus === 'Completed' && !existing.pickedUpAt) {
        updateFields.pickedUpAt = now;
      }
      if (orderStatus === 'Cancelled' && !existing.cancelledAt) {
        updateFields.cancelledAt = now;
      }
    }

    // Determine which item indices should be newly refunded.
    // Cancellation transitions auto-refund every still-unrefunded item.
    const indicesToRefund = new Set<number>();
    const indicesToUnrefund = new Set<number>();

    if (Array.isArray(refundItemIndices)) {
      for (const idx of refundItemIndices) {
        if (!Number.isInteger(idx) || idx < 0 || idx >= existing.orderItems.length) {
          return NextResponse.json(
            { message: 'Invalid refundItemIndices' },
            { status: 400 },
          );
        }
        if (!existing.orderItems[idx].refunded) indicesToRefund.add(idx);
      }
    }

    if (Array.isArray(unrefundItemIndices)) {
      for (const idx of unrefundItemIndices) {
        if (!Number.isInteger(idx) || idx < 0 || idx >= existing.orderItems.length) {
          return NextResponse.json(
            { message: 'Invalid unrefundItemIndices' },
            { status: 400 },
          );
        }
        if (existing.orderItems[idx].refunded) indicesToUnrefund.add(idx);
      }
    }

    if (indicesToRefund.size > 0 && indicesToUnrefund.size > 0) {
      return NextResponse.json(
        { message: 'Cannot refund and unrefund items in the same request' },
        { status: 400 },
      );
    }

    const transitioningToCancelled =
      orderStatus === 'Cancelled' && existing.orderStatus !== 'Cancelled';
    if (transitioningToCancelled) {
      existing.orderItems.forEach((item, idx) => {
        if (!item.refunded) indicesToRefund.add(idx);
      });
    }

    if (indicesToRefund.size > 0) {
      const refundedAt = new Date();

      // ── Stripe refund (Phase 1E) ──────────────────────────────────────
      // Hit Stripe's refund API BEFORE any schema or stock changes so a
      // failed Stripe call leaves the schema clean — the admin sees an
      // error and can retry. The delta is the amount being refunded in
      // THIS request (cumulative-after minus cumulative-before), not the
      // grand total — Stripe receives a separate Refund object per call,
      // additive against the same PaymentIntent.
      const projectedItems = existing.orderItems.map((item, idx) =>
        indicesToRefund.has(idx) ? { ...item, refunded: true, refundedAt } : item,
      );
      const refundContext = {
        subtotal: existing.subtotal,
        tax: existing.tax,
        totalCost: existing.totalCost,
      };
      const previousSummary = refundSummary(existing.orderItems, refundContext);
      const projectedSummary = refundSummary(projectedItems, refundContext);
      const refundDeltaDollars = Math.max(
        0,
        projectedSummary.refundedAmount - previousSummary.refundedAmount,
      );

      const provider = existing.paymentResult.provider;

      if (
        refundDeltaDollars > 0 &&
        provider === 'stripe' &&
        existing.paymentResult.paymentIntentId &&
        !isStubMode()
      ) {
        try {
          const stripe = getStripe();
          await stripe.refunds.create({
            payment_intent: existing.paymentResult.paymentIntentId,
            amount: dollarsToCents(refundDeltaDollars),
            reason: 'requested_by_customer',
            metadata: {
              orderId: id,
              refundedLineIndices: Array.from(indicesToRefund).join(','),
            },
          });
        } catch (err) {
          // Don't echo Stripe's raw error message to the client — it can
          // reveal masked PAN tails, declined-reason hints, and account
          // names that have no business on an admin toast. The server log
          // keeps the full error for triage.
          console.error('[orders PATCH] stripe.refunds.create failed', err);
          return NextResponse.json(
            { message: 'Refund could not be processed — please try again or contact support.' },
            { status: 502 },
          );
        }
      }

      // Atomic restock — mirror the order-creation bulkWrite pattern in reverse
      await Product.bulkWrite(
        Array.from(indicesToRefund).map((idx) => ({
          updateOne: {
            filter: { _id: existing.orderItems[idx].product },
            update: { $inc: { stockCount: existing.orderItems[idx].qty } },
          },
        })),
      );

      // `projectedItems` and `projectedSummary` were computed above for the
      // Stripe-refund delta calc; reuse them here as the canonical next-state.
      updateFields.orderItems = projectedItems;

      const nextPaymentStatus = paymentStatusFor(existing.paymentResult.status, projectedSummary);

      updateFields['paymentResult.status'] = nextPaymentStatus;
      updateFields['paymentResult.paymentDate'] = refundedAt;
      updateFields['paymentResult.amountPaid'] =
        nextPaymentStatus === 'Refunded'
          ? 0
          : Math.max(0, Math.round((existing.totalCost - projectedSummary.refundedAmount) * 100) / 100);

      // If individual refunds have drained the order to fully refunded and the
      // admin didn't explicitly pick an orderStatus this request, mirror what
      // a direct cancellation would do so the two paths converge.
      if (
        nextPaymentStatus === 'Refunded' &&
        !orderStatus &&
        existing.orderStatus !== 'Cancelled'
      ) {
        updateFields.orderStatus = 'Cancelled';
        updateFields.cancellationReason = null;
        if (!existing.cancelledAt) {
          updateFields.cancelledAt = refundedAt;
        }
      }
    }

    // Realized-weight updates. Independent of refund/unrefund — admin
    // weighs the cuts at pickup, types the values in, and the order's
    // effective line totals (used by the refund math and the customer-
    // facing receipt) flip from estimate to realized. Order must be at
    // or past fulfillment, lines must be variable-weight, and a line
    // that's already refunded refuses the change so a late weight edit
    // can't desync the refund already issued against it.
    if (Array.isArray(realizedWeights) && realizedWeights.length > 0) {
      if (
        existing.orderStatus !== 'Ready for Pickup' &&
        existing.orderStatus !== 'Completed'
      ) {
        return NextResponse.json(
          {
            message:
              'Realized weight can only be entered once the order is ready for pickup or completed',
          },
          { status: 400 },
        );
      }

      const baseItemsForWeights =
        (updateFields.orderItems as typeof existing.orderItems | undefined) ?? existing.orderItems;
      const nextItems = baseItemsForWeights.map((item) => ({ ...item }));

      for (const entry of realizedWeights) {
        const idx = entry.index;
        if (!Number.isInteger(idx) || idx < 0 || idx >= nextItems.length) {
          return NextResponse.json(
            { message: 'Invalid realizedWeights index' },
            { status: 400 },
          );
        }
        const line = nextItems[idx];
        if (line.pricingType !== 'per_lb' && line.pricingType !== 'whole_item_by_weight') {
          return NextResponse.json(
            { message: 'Realized weight only applies to variable-weight cuts' },
            { status: 400 },
          );
        }
        if (line.refunded) {
          return NextResponse.json(
            { message: 'Cannot change realized weight on a refunded line' },
            { status: 400 },
          );
        }
        if (entry.weightLb === null) {
          delete (line as Partial<typeof line>).realizedWeightLb;
          continue;
        }
        if (
          typeof entry.weightLb !== 'number' ||
          !Number.isFinite(entry.weightLb) ||
          entry.weightLb <= 0
        ) {
          return NextResponse.json(
            { message: 'Realized weight must be a positive number' },
            { status: 400 },
          );
        }
        if (entry.weightLb > REALIZED_WEIGHT_MAX_LB) {
          return NextResponse.json(
            { message: `Realized weight must be ${REALIZED_WEIGHT_MAX_LB} lb or fewer` },
            { status: 400 },
          );
        }
        line.realizedWeightLb = Math.round(entry.weightLb * 100) / 100;
      }

      updateFields.orderItems = nextItems;
    }

    if (indicesToUnrefund.size > 0) {
      // Atomic stock de-decrement guarded by available stock.
      // If any product can't spare the qty (sold to someone else since), bail.
      const unrefundOps = Array.from(indicesToUnrefund).map((idx) => ({
        updateOne: {
          filter: {
            _id: existing.orderItems[idx].product,
            stockCount: { $gte: existing.orderItems[idx].qty },
          },
          update: { $inc: { stockCount: -existing.orderItems[idx].qty } },
        },
      }));
      const stockResult = await Product.bulkWrite(unrefundOps);
      if (stockResult.modifiedCount !== indicesToUnrefund.size) {
        return NextResponse.json(
          { message: 'Cannot undo refund — insufficient current stock for one or more items' },
          { status: 409 },
        );
      }

      const baseItems =
        (updateFields.orderItems as typeof existing.orderItems | undefined) ?? existing.orderItems;
      const nextOrderItems = baseItems.map((item, idx) =>
        indicesToUnrefund.has(idx) ? { ...item, refunded: false, refundedAt: undefined } : item,
      );
      updateFields.orderItems = nextOrderItems;

      const summary = refundSummary(nextOrderItems, {
        subtotal: existing.subtotal,
        tax: existing.tax,
        totalCost: existing.totalCost,
      });
      const nextPaymentStatus =
        summary.refundedCount === 0 ? 'Completed' : paymentStatusFor(existing.paymentResult.status, summary);

      updateFields['paymentResult.status'] = nextPaymentStatus;
      updateFields['paymentResult.paymentDate'] = new Date();
      updateFields['paymentResult.amountPaid'] =
        nextPaymentStatus === 'Refunded'
          ? 0
          : Math.max(0, Math.round((existing.totalCost - summary.refundedAmount) * 100) / 100);
    }

    if (Object.keys(updateFields).length === 0) {
      // Nothing changed — idempotent no-op
      return NextResponse.json({ data: existing });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true },
    );

    // First-time transition into Completed — award points + fire low-stock alerts.
    // Guest orders skip the awards step entirely (no rewards account to credit).
    if (orderStatus === 'Completed' && existing.orderStatus !== 'Completed') {
      if (existing.user) {
        await awardOrderCompletion({
          orderId: id,
          customerUserId: existing.user,
          subtotal: existing.subtotal,
          productIds: existing.orderItems.map((i) => i.product),
        });
      }

      // Phase 4 — auto-settle at pickup. Fires after points so a Stripe
      // failure here doesn't block the customer earning their points.
      // Skipped silently when the order didn't opt in or doesn't qualify;
      // failures land in the admin's notification feed but never block
      // fulfillment.
      const settlement = await runOrderSettlement(id);
      if (settlement.status === 'failed') {
        await notifyAdminsOfSettlementFailure({
          orderId: id,
          error: settlement.error,
        });
      }
    }

    // Reverse points side-effects when an order leaves a paying state via
    // cancellation (either explicit or auto-cancel from a refund drain).
    // - reverseOrderAward fires only if the order was Completed (points had
    //   been awarded). Partial refunds that leave the order Completed don't
    //   trigger it.
    // - reverseOrderRedemption fires whenever the order had a redemption
    //   stamped at checkout, regardless of whether it ever reached Completed
    //   — the customer's points came out of their balance at checkout time,
    //   so they must come back when the order is cancelled.
    const finalStatus = (updateFields.orderStatus as string | undefined) ?? existing.orderStatus;
    const cancelledNow =
      finalStatus === 'Cancelled' && existing.orderStatus !== 'Cancelled';

    // Partial refund (NOT cascading to cancel) on an order with redemption:
    // proportionally return the redeemed points based on the just-refunded
    // subtotal vs the original subtotal. The full-cancel branch below
    // handles any remaining un-returned points if/when the order later
    // cancels entirely.
    if (
      indicesToRefund.size > 0 &&
      !cancelledNow &&
      (existing.pointsRedeemed ?? 0) > 0 &&
      existing.subtotal > 0
    ) {
      const newlyRefundedSubtotal = Array.from(indicesToRefund).reduce(
        (sum, idx) => sum + existing.orderItems[idx].price * existing.orderItems[idx].qty,
        0,
      );
      const proportion = newlyRefundedSubtotal / existing.subtotal;
      const pointsToReturn = Math.floor((existing.pointsRedeemed ?? 0) * proportion);
      if (pointsToReturn > 0) {
        await reverseOrderRedemption({
          orderId: id,
          reason: 'refund_reverse',
          pointsToReturn,
        });
      }
    }

    if (cancelledNow) {
      const reverseReason =
        indicesToRefund.size > 0 && !transitioningToCancelled
          ? 'refund_reverse'
          : 'cancel_reverse';
      if (existing.orderStatus === 'Completed' && (existing.pointsAwarded ?? 0) > 0) {
        await reverseOrderAward({ orderId: id, reason: reverseReason });
      }
      if ((existing.pointsRedeemed ?? 0) > 0) {
        await reverseOrderRedemption({ orderId: id, reason: reverseReason });
      }
      // Promo seat returns to the pool only on full cancellation — partial
      // refunds leave the seat consumed since the customer still benefited
      // from the code on the surviving line items.
      if (existing.promoId) {
        await releasePromoSeat(existing.promoId);
      }
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error('[orders/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
