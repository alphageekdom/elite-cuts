import { NextResponse, type NextRequest } from 'next/server';

import connectDB from '@/config/database';
import Order, { ORDER_STATUSES } from '@/models/Order';
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

// PATCH /api/orders/:id — admin updates order status
export const PATCH = async (request: NextRequest, { params }: RouteContext) => {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  try {
    await connectDB();

    const { id } = await params;
    const { orderStatus } = (await request.json()) as { orderStatus?: string };

    if (!orderStatus || !isIn(ORDER_STATUSES, orderStatus)) {
      return NextResponse.json(
        { message: `orderStatus must be one of: ${ORDER_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { orderStatus },
      { new: true, runValidators: true },
    );

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('[orders/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
