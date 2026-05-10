import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import connectDB from '@/config/database';
import Order, { ORDER_STATUSES, CANCELLATION_REASONS } from '@/models/Order';
import User from '@/models/User';
import Product from '@/models/Product';
import Notification from '@/models/Notification';
import { getSessionUser } from '@/utils/getSessionUser';
import { requireAdmin } from '@/utils/requireAdmin';
import { isIn } from '@/lib/validation';

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
export const DELETE = async (_request: NextRequest, { params }: RouteContext) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    await connectDB();
    const { id } = await params;
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
};

// PATCH /api/orders/:id — admin updates order status
export const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    await connectDB();

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const { orderStatus, cancellationReason } = (await request.json()) as {
      orderStatus?: string;
      cancellationReason?: string;
    };

    if (!orderStatus || !isIn(ORDER_STATUSES, orderStatus)) {
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

    const updateFields: Record<string, unknown> = { orderStatus };
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
};
