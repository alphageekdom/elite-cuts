import { NextResponse, type NextRequest } from 'next/server';
import type { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

import connectDB from '@/config/database';
import Order, { PAYMENT_METHODS, type PaymentMethod, type DeliveryAddressData } from '@/models/Order';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { getSessionUser } from '@/utils/getSessionUser';
import { unauthorized, parsePagination } from '@/lib/api-handler';
import { formatMoney } from '@/lib/format';
import { isIn, EMAIL_RE } from '@/lib/validation';
import { validatePromoCode } from '@/actions/checkout';
import { MEMBER_DISCOUNT_RATE, DELIVERY_FEE, TAX_RATE } from '@/lib/pricing';
import { MAX_PER_LINE } from '@/lib/shopConfig';

// GET /api/orders
// Admin: all orders (paginated). Customer: own orders only.
export const GET = async (request: NextRequest) => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return unauthorized();
  }

  try {
    await connectDB();

    const { skip, pageSize } = parsePagination(request.nextUrl.searchParams, { pageSize: 10 });

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
    return unauthorized();
  }

  try {
    await connectDB();

    const body = (await request.json()) as {
      paymentMethod?: string;
      pickupLocation?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      fulfillmentType?: 'pickup' | 'delivery';
      pickupSlot?: string;
      deliveryAddress?: DeliveryAddressData;
      orderNotes?: string;
      promoCode?: string;
    };

    if (!body.paymentMethod || !isIn(PAYMENT_METHODS, body.paymentMethod)) {
      return NextResponse.json({ message: 'Valid payment method is required' }, { status: 400 });
    }

    if (!body.pickupLocation?.trim()) {
      return NextResponse.json({ message: 'Pickup location is required' }, { status: 400 });
    }

    // Allowlist fulfillmentType
    if (body.fulfillmentType && !['pickup', 'delivery'].includes(body.fulfillmentType)) {
      return NextResponse.json({ message: 'Invalid fulfillmentType' }, { status: 400 });
    }

    // Validate contactEmail format
    if (body.contactEmail && !EMAIL_RE.test(body.contactEmail)) {
      return NextResponse.json({ message: 'Invalid contactEmail format' }, { status: 400 });
    }

    // Length guards on free-text fields
    if (body.contactName && body.contactName.length > 120) {
      return NextResponse.json({ message: 'contactName too long' }, { status: 400 });
    }
    if (body.contactPhone && body.contactPhone.length > 20) {
      return NextResponse.json({ message: 'contactPhone too long' }, { status: 400 });
    }
    if (body.pickupLocation && body.pickupLocation.length > 200) {
      return NextResponse.json({ message: 'pickupLocation too long' }, { status: 400 });
    }
    if (body.orderNotes && body.orderNotes.length > 1000) {
      return NextResponse.json({ message: 'orderNotes too long' }, { status: 400 });
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
      stockCount: number;
      price: number;
    };

    const orderItems = cart.items.map((line) => {
      const product = line.product as unknown as PopulatedProduct;
      return {
        product: product._id,
        name: product.name,
        qty: line.quantity,
        image: product.images?.[0]?.url ?? '',
        price: product.price,   // authoritative: always read from Product, never from cart snapshot
        productType: product.category ?? '',
      };
    });

    // Verify every item has sufficient stock before committing anything
    const stockErrors = cart.items
      .map((line) => {
        const product = line.product as unknown as PopulatedProduct;
        return product.stockCount < line.quantity
          ? `${product.name}: only ${product.stockCount} in stock (${line.quantity} requested)`
          : null;
      })
      .filter(Boolean);

    if (stockErrors.length > 0) {
      return NextResponse.json(
        { message: `Insufficient stock — ${stockErrors.join('; ')}` },
        { status: 409 },
      );
    }

    // Per-line cap — backstop in case a stale client snuck a tampered cart past
    // the cart endpoint's caps. The cart API enforces the same limit on add/edit.
    const overCap = cart.items.find((line) => line.quantity > MAX_PER_LINE);
    if (overCap) {
      return NextResponse.json(
        { message: `Limit ${MAX_PER_LINE} per item` },
        { status: 400 },
      );
    }

    // Compute totals server-side — mirrors computeTotals() in lib/pricing.ts
    const subtotal = Math.round(
      orderItems.reduce((sum, item) => sum + item.price * item.qty, 0) * 100,
    ) / 100;

    const memberDiscount = Math.round(subtotal * MEMBER_DISCOUNT_RATE * 100) / 100;

    let promoDiscount = 0;
    if (body.promoCode) {
      const promoResult = await validatePromoCode(body.promoCode.trim().toUpperCase(), subtotal);
      if (promoResult.valid) promoDiscount = promoResult.amount;
    }

    const deliveryFee = body.fulfillmentType === 'delivery' ? DELIVERY_FEE : 0;
    const afterDiscounts = Math.max(0, subtotal - memberDiscount - promoDiscount);
    const tax = Math.round((afterDiscounts + deliveryFee) * TAX_RATE * 100) / 100;
    const totalCost = Math.round((afterDiscounts + deliveryFee + tax) * 100) / 100;

    // Atomic per-item decrement with TOCTOU guard (`$gte` filter). Done before
    // order creation so a partial failure compensates exactly the items that
    // succeeded — bulkWrite gives us only a total `modifiedCount`, not per-op
    // outcomes, so we sequence the writes to track them individually.
    const restoreStock = async (
      decremented: { productId: Types.ObjectId; qty: number }[],
    ) => {
      if (decremented.length === 0) return;
      await Product.bulkWrite(
        decremented.map((d) => ({
          updateOne: {
            filter: { _id: d.productId },
            update: { $inc: { stockCount: d.qty } },
          },
        })),
      );
    };

    const decremented: { productId: Types.ObjectId; qty: number }[] = [];
    for (const item of orderItems) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, stockCount: { $gte: item.qty } },
        { $inc: { stockCount: -item.qty } },
      );
      if (!updated) {
        await restoreStock(decremented);
        return NextResponse.json(
          { message: 'One or more items sold out — please refresh your cart' },
          { status: 409 },
        );
      }
      decremented.push({ productId: item.product, qty: item.qty });
    }

    const paidAt = new Date();

    let order;
    try {
      order = await Order.create({
        user: sessionUser.userId,
        orderItems,
        subtotal,
        tax,
        totalCost,
        isPaid: true,
        paidAt,
        orderStatus: 'Order Placed',
        paymentMethod: body.paymentMethod as PaymentMethod,
        paymentResult: {
          status: 'Completed',
          amountPaid: totalCost,
          currency: 'USD',
          paymentDate: paidAt,
        },
        pickupLocation: body.pickupLocation.trim(),
        pickedUp: false,
        ...(body.contactName && { contactName: body.contactName }),
        ...(body.contactEmail && { contactEmail: body.contactEmail }),
        ...(body.contactPhone && { contactPhone: body.contactPhone }),
        ...(body.fulfillmentType && { fulfillmentType: body.fulfillmentType }),
        ...(body.pickupSlot && { pickupSlot: body.pickupSlot }),
        ...(body.deliveryAddress && { deliveryAddress: body.deliveryAddress }),
        ...(body.orderNotes && { orderNotes: body.orderNotes }),
      });
    } catch (err) {
      await restoreStock(decremented);
      throw err;
    }

    await Cart.findOneAndUpdate({ user: sessionUser.userId }, { items: [] });

    // Notify all admins — fire and forget (does not block the response)
    User.find({ isAdmin: true }, '_id').lean().then((admins) => {
      if (!admins.length) return;
      const orderRef = `#EC-${String(order._id).slice(-4).toUpperCase()}`;
      const docs = admins.map((a) => ({
        type: 'new_order' as const,
        title: 'New order placed',
        body: `${orderRef} — ${formatMoney(totalCost)}`,
        userId: a._id,
        readAt: null,
      }));
      return Notification.insertMany(docs);
    }).catch((err) => console.error('[orders POST] notification error', err));

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('[orders POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
