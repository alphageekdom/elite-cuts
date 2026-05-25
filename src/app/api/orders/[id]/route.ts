import { NextResponse, type NextRequest } from 'next/server';
import { type Types } from 'mongoose';

import connectDB from '@/config/database';
import Order, { ORDER_STATUSES, type OrderItem } from '@/models/Order';
import { getSessionUser } from '@/lib/auth/session';
import {
  parseObjectId,
  withAdminNonDemo,
  type RouteContext,
} from '@/lib/api-handler';
import { isIn } from '@/lib/validation';
import { awardOrderCompletion } from '@/lib/orders/completion';
import { runOrderSettlement } from '@/lib/payments/orderSettlement';
import { notifyAdminsOfSettlementFailure } from '@/lib/orders/notifications';
import {
  applyRealizedWeights,
  applyRefund,
  applyStatusTransition,
  applyUnrefund,
  collectRefundIndices,
  reverseRewards,
  type RealizedWeightEntry,
} from '@/lib/orders/admin-patch';

type Ctx = RouteContext<{ id: string }>;

type OrderPopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  email: string;
};

// GET /api/orders/:id — self or admin only
export const GET = async (_request: NextRequest, { params }: Ctx) => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const { id } = await params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;
    const order = await Order.findById(id)
      .populate<{ user: OrderPopulatedUser | null }>('user', 'name email');

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const orderUserId = order.user ? String(order.user._id) : null;
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
export const DELETE = withAdminNonDemo<{ id: string }>(async (_request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

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

// PATCH /api/orders/:id — admin updates order status, refunds line items,
// and/or stamps realized weights. The handler orchestrates four branch
// helpers under `src/lib/orders/admin-patch/`; the heavy logic for each
// branch (Stripe refund, stock restock, validation) lives there.
export const PATCH = withAdminNonDemo<{ id: string }>(async (request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

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
      realizedWeights?: RealizedWeightEntry[];
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

    // Fetch before update so the branches can read previous status / timestamps.
    const existing = await Order.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const updateFields: Record<string, unknown> = {};
    const now = new Date();

    // 1. Status transition + cancellation reason + transition timestamps.
    if (orderStatus) {
      const result = applyStatusTransition({
        orderStatus,
        cancellationReason,
        existing,
        now,
      });
      if (!result.ok) return result.response;
      Object.assign(updateFields, result.updateFields);
    }

    // 2. Refund / unrefund index validation + cancellation auto-refund.
    const transitioningToCancelled =
      orderStatus === 'Cancelled' && existing.orderStatus !== 'Cancelled';
    const indicesResult = collectRefundIndices({
      refundItemIndices,
      unrefundItemIndices,
      transitioningToCancelled,
      existing,
    });
    if (!indicesResult.ok) return indicesResult.response;
    const { indicesToRefund, indicesToUnrefund } = indicesResult;

    // 3. Refund branch — hits Stripe + restocks.
    if (indicesToRefund.size > 0) {
      const result = await applyRefund({
        orderId: id,
        existing,
        indicesToRefund,
        explicitOrderStatus: orderStatus,
        refundedAt: now,
      });
      if (!result.ok) return result.response;
      Object.assign(updateFields, result.updateFields);
    }

    // 4. Realized-weight branch — pure validation against the working draft.
    if (Array.isArray(realizedWeights) && realizedWeights.length > 0) {
      const baseItems =
        (updateFields.orderItems as OrderItem[] | undefined) ?? existing.orderItems;
      const result = applyRealizedWeights({
        entries: realizedWeights,
        existing,
        baseItems,
      });
      if (!result.ok) return result.response;
      Object.assign(updateFields, result.updateFields);
    }

    // 5. Unrefund branch — atomic stock de-decrement.
    if (indicesToUnrefund.size > 0) {
      const baseItems =
        (updateFields.orderItems as OrderItem[] | undefined) ?? existing.orderItems;
      const result = await applyUnrefund({
        existing,
        indicesToUnrefund,
        baseItems,
      });
      if (!result.ok) return result.response;
      Object.assign(updateFields, result.updateFields);
    }

    if (Object.keys(updateFields).length === 0) {
      // Nothing changed — idempotent no-op.
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

    // Reverse points + promo seats on refund/cancellation. The branch helper
    // owns the proportional partial-refund math and the full-cancel cascade.
    const finalStatus =
      (updateFields.orderStatus as string | undefined) ?? existing.orderStatus;
    await reverseRewards({
      orderId: id,
      existing,
      finalStatus,
      indicesToRefund,
      transitioningToCancelled,
    });

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error('[orders/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
