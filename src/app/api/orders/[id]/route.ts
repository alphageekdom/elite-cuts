import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import connectDB from '@/config/database';
import Order, { ORDER_STATUSES, CANCELLATION_REASONS } from '@/models/Order';
import User from '@/models/User';
import Product from '@/models/Product';
import Notification from '@/models/Notification';
import { getSessionUser } from '@/utils/getSessionUser';
import { withAdmin } from '@/lib/api-handler';
import { isIn } from '@/lib/validation';
import { refundSummary, paymentStatusFor } from '@/lib/order-refunds';

type RouteContext = { params: Promise<{ id: string }> };

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

    const isOwner = String(order.user._id ?? order.user) === sessionUser.userId;
    if (!isOwner && !sessionUser.user?.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('[orders/:id GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// DELETE /api/orders/:id — admin only
export const DELETE = withAdmin(async (_request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const deleted = await Order.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('[orders/:id DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

// PATCH /api/orders/:id — admin updates order status and/or refunds line items
export const PATCH = withAdmin(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const { orderStatus, cancellationReason, refundItemIndices, unrefundItemIndices } = (await request.json()) as {
      orderStatus?: string;
      cancellationReason?: string;
      refundItemIndices?: number[];
      unrefundItemIndices?: number[];
    };

    if (!orderStatus && !refundItemIndices && !unrefundItemIndices) {
      return NextResponse.json(
        { message: 'Provide orderStatus, refundItemIndices, or unrefundItemIndices' },
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

      // Atomic restock — mirror the order-creation bulkWrite pattern in reverse
      await Product.bulkWrite(
        Array.from(indicesToRefund).map((idx) => ({
          updateOne: {
            filter: { _id: existing.orderItems[idx].product },
            update: { $inc: { stockCount: existing.orderItems[idx].qty } },
          },
        })),
      );

      const nextOrderItems = existing.orderItems.map((item, idx) =>
        indicesToRefund.has(idx) ? { ...item, refunded: true, refundedAt } : item,
      );
      updateFields.orderItems = nextOrderItems;

      const summary = refundSummary(nextOrderItems, {
        subtotal: existing.subtotal,
        tax: existing.tax,
      });
      const nextPaymentStatus = paymentStatusFor(existing.paymentResult.status, summary);

      updateFields['paymentResult.status'] = nextPaymentStatus;
      updateFields['paymentResult.paymentDate'] = refundedAt;
      updateFields['paymentResult.amountPaid'] =
        nextPaymentStatus === 'Refunded'
          ? 0
          : Math.max(0, Math.round((existing.totalCost - summary.refundedAmount) * 100) / 100);

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
      }
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
      return NextResponse.json(existing);
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true },
    );

    // Award 1 point per dollar when transitioning into Completed for the first time
    if (orderStatus === 'Completed' && existing.orderStatus !== 'Completed') {
      const pointsEarned = Math.floor(existing.totalCost);
      await User.findByIdAndUpdate(existing.user, { $inc: { rewardPoints: pointsEarned } });

      // Fire low_stock notifications — non-blocking
      const productIds = existing.orderItems.map((i) => i.product);
      Promise.all([
        Product.find({ _id: { $in: productIds }, parLevel: { $gt: 0 } }, 'name stockCount parLevel').lean(),
        User.find({ isAdmin: true }, '_id').lean(),
      ]).then(([products, admins]) => {
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
        return Notification.insertMany(docs);
      }).catch((err) => console.error('[orders/:id PATCH] low_stock notification error', err));
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('[orders/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
