import { NextResponse, type NextRequest } from 'next/server';
import mongoose, { type Types } from 'mongoose';

export const dynamic = 'force-dynamic';

import connectDB from '@/config/database';
import Order, { PAYMENT_METHODS, type PaymentMethod, type DeliveryAddressData } from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';
import { unauthorized, parsePagination, withAdmin } from '@/lib/api-handler';
import { isIn } from '@/lib/validation';
import { MAX_PER_LINE } from '@/lib/shopConfig';
import { awardOrderCompletion } from '@/lib/order-completion';
import { recordCustomerActivity } from '@/lib/accountDeletion';
import { notifyAdminsOfNewOrder } from '@/lib/order-notifications';
import {
  computeSubtotal,
  computeOrderTotals,
  type OrderProductLean,
} from '@/lib/orderBuilder';

// Status values an admin is allowed to set when creating an order on behalf of
// a customer. Order Placed is the default flow; Completed records an
// offline-paid pickup that's already been handed over the counter.
const ADMIN_INITIAL_STATUSES = ['Order Placed', 'Completed'] as const;
type AdminInitialStatus = (typeof ADMIN_INITIAL_STATUSES)[number];

// Atomic per-item decrement with TOCTOU guard. Returns the list of decremented
// products on success; throws a structured error on insufficient stock so the
// caller can compensate. Sequenced (not bulkWrite) so a partial failure has a
// precise rollback set.
async function decrementStockOrThrow(
  items: { product: Types.ObjectId; qty: number }[],
): Promise<{ productId: Types.ObjectId; qty: number }[]> {
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
      throw new Error('OUT_OF_STOCK');
    }
    decremented.push({ productId: item.product, qty: item.qty });
  }
  return decremented;
}

async function restoreStock(decremented: { productId: Types.ObjectId; qty: number }[]) {
  if (!decremented.length) return;
  await Product.bulkWrite(
    decremented.map((d) => ({
      updateOne: {
        filter: { _id: d.productId },
        update: { $inc: { stockCount: d.qty } },
      },
    })),
  );
}

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

// POST /api/orders — admin-only.
// Admin passes `userId` and `items[]` to record an order on behalf of a
// customer (in-store pickup recording). Customer and guest order placement
// runs through /api/checkout/session → Stripe webhook instead.
export const POST = withAdmin(async (request: NextRequest, _ctx, adminUserId) => {
  try {
    const body = (await request.json()) as {
      userId?: string;
      items?: Array<{ productId: string; qty: number }>;
      orderStatus?: AdminInitialStatus;
      paymentMethod?: string;
      pickupLocation?: string;
      contactPhone?: string;
      fulfillmentType?: 'pickup' | 'delivery';
      pickupSlot?: string;
      deliveryAddress?: DeliveryAddressData;
      orderNotes?: string;
    };

    if (!body.userId || !mongoose.isValidObjectId(body.userId)) {
      return NextResponse.json({ message: 'Valid userId is required' }, { status: 400 });
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ message: 'items must be a non-empty array' }, { status: 400 });
    }
    if (!body.pickupLocation?.trim()) {
      return NextResponse.json({ message: 'Pickup location is required' }, { status: 400 });
    }
    if (body.orderStatus && !isIn(ADMIN_INITIAL_STATUSES, body.orderStatus)) {
      return NextResponse.json(
        { message: `orderStatus must be one of: ${ADMIN_INITIAL_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate item shapes + per-line cap before any DB work.
    for (const it of body.items) {
      if (!mongoose.isValidObjectId(it.productId)) {
        return NextResponse.json({ message: 'Invalid productId in items' }, { status: 400 });
      }
      if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > MAX_PER_LINE) {
        return NextResponse.json(
          { message: `Quantity must be between 1 and ${MAX_PER_LINE}` },
          { status: 400 },
        );
      }
    }

    const [customer, products] = await Promise.all([
      User.findById(body.userId, '_id name email deletedAt').lean<{
        _id: Types.ObjectId;
        name: string;
        email: string;
        deletedAt?: Date | null;
      } | null>(),
      Product.find(
        { _id: { $in: body.items.map((it) => it.productId) } },
        'name price images category stockCount',
      ).lean<OrderProductLean[]>(),
    ]);

    if (!customer) {
      return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
    }
    if (customer.deletedAt) {
      // Refuse before any stock decrement / order write — a soft-deleted
      // customer can't sign in to claim the order, can't earn points, and
      // stamping `lastActiveAt` on them later in this handler would only
      // muddy the dormancy + deletion audit trail.
      return NextResponse.json(
        { message: 'Customer is scheduled for deletion. Restore the account before placing orders for them.' },
        { status: 409 },
      );
    }

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const orderItems = body.items.map((it) => {
      const product = productMap.get(it.productId);
      if (!product) throw new Error('PRODUCT_MISSING');
      return {
        product: product._id,
        name: product.name,
        qty: it.qty,
        image: product.images?.[0] ?? '',
        price: product.price,
        productType: product.category ?? '',
      };
    });

    // Stock check up front for a clean 409 before we touch anything.
    const stockErrors = body.items
      .map((it) => {
        const p = productMap.get(it.productId);
        if (!p) return `${it.productId}: not found`;
        return p.stockCount < it.qty
          ? `${p.name}: only ${p.stockCount} in stock (${it.qty} requested)`
          : null;
      })
      .filter(Boolean);
    if (stockErrors.length) {
      return NextResponse.json(
        { message: `Insufficient stock — ${stockErrors.join('; ')}` },
        { status: 409 },
      );
    }

    // No member discount or promo on admin-create — base-price only.
    const subtotal = computeSubtotal(orderItems);
    const { tax, totalCost } = computeOrderTotals({
      subtotal,
      memberDiscount: 0,
      fulfillmentType: body.fulfillmentType,
    });

    let decremented: { productId: Types.ObjectId; qty: number }[] = [];
    try {
      decremented = await decrementStockOrThrow(orderItems);
    } catch (err) {
      if (err instanceof Error && err.message === 'OUT_OF_STOCK') {
        return NextResponse.json(
          { message: 'One or more items sold out between view and submit — please refresh and retry' },
          { status: 409 },
        );
      }
      throw err;
    }

    // If the admin is recording an already-completed pickup, flip the
    // payment + pickup state at creation so the order looks identical to a
    // customer order that was placed and then walked through Ready → Completed.
    const initialStatus: AdminInitialStatus = body.orderStatus ?? 'Order Placed';
    const isCompletedNow = initialStatus === 'Completed';
    const now = new Date();

    let order;
    try {
      order = await Order.create({
        user: body.userId,
        orderItems,
        subtotal,
        tax,
        totalCost,
        isPaid: isCompletedNow,
        ...(isCompletedNow && { paidAt: now, pickedUpAt: now }),
        orderStatus: initialStatus,
        paymentMethod: (body.paymentMethod && isIn(PAYMENT_METHODS, body.paymentMethod)
          ? body.paymentMethod
          : 'Credit Card') as PaymentMethod,
        paymentResult: {
          status: isCompletedNow ? 'Completed' : 'Pending',
          amountPaid: isCompletedNow ? totalCost : 0,
          currency: 'USD',
          paymentDate: now,
        },
        pickupLocation: body.pickupLocation.trim(),
        pickedUp: isCompletedNow,
        contactName: customer.name,
        contactEmail: customer.email,
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

    if (isCompletedNow) {
      await awardOrderCompletion({
        orderId: order._id,
        customerUserId: body.userId,
        subtotal,
        productIds: orderItems.map((it) => it.product),
        awardedOn: now,
      });
    }

    // Activity tracking — the customer the order is FOR counts as having
    // activity, even when an admin built the order on their behalf. The
    // admin's own lastActiveAt is bumped by their sign-in, not by orders
    // they place for others. performedBy on the audit row credits the
    // admin so an audit-log review can see who rescued the warned
    // customer.
    await recordCustomerActivity({
      userId: body.userId,
      at: now,
      performedBy: adminUserId,
    });

    notifyAdminsOfNewOrder(String(order._id), totalCost, adminUserId).catch((err) =>
      console.error('[orders POST admin-create] notification error', err),
    );

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('[orders POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
