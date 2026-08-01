import { NextResponse, type NextRequest } from 'next/server';
import { type Types } from 'mongoose';

export const dynamic = 'force-dynamic';

import connectDB from '@/config/database';
import Order, { PAYMENT_METHODS, type PaymentMethod } from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import { getSessionUser } from '@/lib/auth/session';
import {
  unauthorized,
  parsePagination,
  withAdminNonDemo,
  zodBadRequest,
} from '@/lib/api-handler';
import { isIn } from '@/lib/validation';
import { awardOrderCompletion } from '@/lib/orders/completion';
import { walkInPaymentResult } from '@/lib/orders/walk-in';
import { recordCustomerActivity } from '@/lib/auth/account-deletion';
import { notifyAdminsOfNewOrder } from '@/lib/orders/notifications';
import { redactOrdersForCustomer } from '@/lib/orders/redact';
import {
  buildLine,
  computeSubtotal,
  computeOrderTotals,
  ORDER_PRODUCT_PROJECTION,
  type OrderProductLean,
} from '@/lib/orders/builder';
import {
  adminCreateOrderSchema,
  type AdminInitialStatus,
} from '@/lib/orders/admin-create-schema';

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

    const isAdmin = Boolean(sessionUser.user?.isAdmin);
    const [total, items] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .populate('user', 'name email')
        .lean(),
    ]);

    // Same strip the single-order GET applies to a customer reading their own
    // order — without it the list was a way around it.
    return NextResponse.json({
      items: isAdmin ? items : redactOrdersForCustomer(items),
      total,
    });
  } catch (error) {
    console.error('[orders GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

// POST /api/orders — admin-only.
// Admin passes `userId` and `items[]` to record an order on behalf of a
// customer (in-store pickup recording). Customer and guest order placement
// runs through /api/checkout/session → Stripe webhook instead.
export const POST = withAdminNonDemo(async (request: NextRequest, _ctx, adminUserId) => {
  try {
    const parsed = adminCreateOrderSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return zodBadRequest(parsed.error, 'Invalid order input');
    const body = parsed.data;

    const [customer, products] = await Promise.all([
      User.findById(body.userId, '_id name email deletedAt').lean<{
        _id: Types.ObjectId;
        name: string;
        email: string;
        deletedAt?: Date | null;
      } | null>(),
      Product.find(
        { _id: { $in: body.items.map((it) => it.productId) } },
        ORDER_PRODUCT_PROJECTION,
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

    // Same `buildLine` the customer and guest paths use. Hand-rolling the line
    // here used to snapshot the raw `product.price`, which for a weighed cut is
    // the per-pound *rate*, not the per-unit estimate the Order schema's
    // `price` field is contractually defined as — so a walk-in order for a
    // half-pound filet recorded the full per-pound rate and inflated the total,
    // the tax and the points awarded. This is the same bug Phase 3 fixed on the
    // customer path; the admin path never got it. `buildLine` also carries the
    // pricing snapshot fields, so an admin-recorded order reads on the receipt
    // exactly like a customer-placed one.
    const orderItems = body.items.map((it) => {
      const product = productMap.get(it.productId);
      if (!product) throw new Error('PRODUCT_MISSING');
      return buildLine(product, it.qty);
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
        // Built by a shared helper, not inline: this order decrements stock
        // below regardless of payment state, and `hasSettledPayment` reads the
        // envelope's `provider` to tell it apart from a checkout order sitting
        // unpaid. Inline, that coupling was untestable.
        paymentResult: walkInPaymentResult({ isCompletedNow, totalCost, now }),
        pickupLocation: body.pickupLocation,
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

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    console.error('[orders POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
