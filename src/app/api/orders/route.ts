import { NextResponse, type NextRequest } from 'next/server';
import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import Order, { PAYMENT_METHODS, type PaymentMethod } from '@/models/Order';
import Cart from '@/models/Cart';
import { getSessionUser } from '@/utils/getSessionUser';
import { isIn } from '@/lib/validation';

// GET /api/orders
// Admin: all orders (paginated). Customer: own orders only.
export const GET = async (request: NextRequest) => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
    const pageSize = Math.max(1, Number.parseInt(params.get('pageSize') ?? '10', 10) || 10);
    const skip = (page - 1) * pageSize;

    const filter = sessionUser.user?.isAdmin
      ? {}
      : { user: sessionUser.userId };

    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('user', 'name email'),
    ]);

    return NextResponse.json({ total, orders });
  } catch (error) {
    console.error('[orders GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// POST /api/orders — create an order from the caller's current cart
export const POST = async (request: NextRequest) => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const body = (await request.json()) as {
      paymentMethod?: string;
      pickupLocation?: string;
    };

    if (!body.paymentMethod || !isIn(PAYMENT_METHODS, body.paymentMethod)) {
      return NextResponse.json({ message: 'Valid payment method is required' }, { status: 400 });
    }

    if (!body.pickupLocation?.trim()) {
      return NextResponse.json({ message: 'Pickup location is required' }, { status: 400 });
    }

    const cart = await Cart.findOne({ user: sessionUser.userId }).populate(
      'items.product',
    );

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ message: 'Cart is empty' }, { status: 400 });
    }

    type PopulatedProduct = {
      _id: Types.ObjectId;
      name: string;
      images?: { url: string }[];
      category?: string;
    };

    const TAX_RATE = 0.0775;

    const orderItems = cart.items.map((line) => {
      const product = line.product as unknown as PopulatedProduct;
      return {
        product: product._id,
        name: product.name,
        qty: line.quantity,
        image: product.images?.[0]?.url ?? '',
        price: line.price,
        productType: product.category ?? '',
      };
    });

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const totalCost = Math.round((subtotal + tax) * 100) / 100;

    const order = await Order.create({
      user: sessionUser.userId,
      orderItems,
      subtotal,
      tax,
      totalCost,
      isPaid: false,
      orderStatus: 'Pending',
      paymentMethod: body.paymentMethod as PaymentMethod,
      paymentResult: {
        status: 'Pending',
        amountPaid: 0,
        currency: 'USD',
        paymentDate: new Date(),
      },
      pickupLocation: body.pickupLocation.trim(),
      pickedUp: false,
    });

    await Cart.findOneAndUpdate({ user: sessionUser.userId }, { items: [] });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('[orders POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
