import { NextResponse, type NextRequest } from 'next/server';
import mongoose, { type Types } from 'mongoose';

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
import { MAX_PER_LINE } from '@/lib/shopConfig';
import { getShopSettings } from '@/lib/shopSettings';
import { awardOrderCompletion } from '@/lib/order-completion';
import { applyRedemption } from '@/lib/rewards';
import { recordCustomerActivity } from '@/lib/accountDeletion';
import {
  buildOrderItemsFromCart,
  buildOrderItemsFromGuestItems,
  computeSubtotal,
  computeMemberDiscount,
  computeOrderTotals,
  type OrderProductLean,
} from '@/lib/orderBuilder';

// Status values an admin is allowed to set when creating an order on behalf of
// a customer. Order Placed is the default flow; Completed records an
// offline-paid pickup that's already been handed over the counter.
const ADMIN_INITIAL_STATUSES = ['Order Placed', 'Completed'] as const;
type AdminInitialStatus = (typeof ADMIN_INITIAL_STATUSES)[number];

// Atomic per-item decrement with TOCTOU guard, shared between the customer
// (cart-based) POST flow and the admin-create branch. Returns the list of
// decremented products on success; throws a structured error on insufficient
// stock so the caller can compensate. Sequenced (not bulkWrite) so a partial
// failure has a precise rollback set.
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
      // Roll back what we already decremented before signalling the failure.
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

async function notifyAdminsOfNewOrder(
  orderId: string,
  totalCost: number,
  excludeUserId?: string,
) {
  // Fire and forget — gated on settings.notifNewOrder; getShopSettings fails
  // open so a settings outage doesn't silence the alert. `excludeUserId`
  // suppresses the self-notification when an admin is the one placing the order.
  const settings = await getShopSettings();
  if (!settings.notifNewOrder) return;
  const adminFilter: Record<string, unknown> = { isAdmin: true };
  if (excludeUserId) adminFilter._id = { $ne: excludeUserId };
  const admins = await User.find(adminFilter, '_id').lean();
  if (!admins.length) return;
  const orderRef = `#EC-${orderId.slice(-4).toUpperCase()}`;
  const docs = admins.map((a) => ({
    type: 'new_order' as const,
    title: 'New order placed',
    body: `${orderRef} — ${formatMoney(totalCost)}`,
    userId: a._id,
    readAt: null,
  }));
  await Notification.insertMany(docs);
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

// POST /api/orders — three modes:
// • Customer flow (signed-in): builds an order from the caller's server Cart.
// • Guest flow: builds an order from `guestItems[]` in the body since guests
//   have no server Cart; records the typed contact as `guestContact`.
// • Admin-create flow: admin passes `source: 'admin'`, `userId`, and `items[]`
//   to record an order on behalf of a customer (in-store pickup recording).
export const POST = async (request: NextRequest) => {
  const sessionUser = await getSessionUser();

  try {
    await connectDB();

    const body = (await request.json()) as {
      source?: 'admin';
      userId?: string;
      items?: Array<{ productId: string; qty: number }>;
      orderStatus?: AdminInitialStatus;
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
      pointsToRedeem?: number;
      guestItems?: Array<{ productId: string; qty: number }>;
    };

    // ── Admin-create branch ───────────────────────────────────────────────
    if (body.source === 'admin') {
      if (!sessionUser?.userId || !sessionUser.user?.isAdmin) {
        return unauthorized();
      }

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
            : 'Demo') as PaymentMethod,
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
        performedBy: sessionUser.userId,
      });

      notifyAdminsOfNewOrder(String(order._id), totalCost, sessionUser.userId).catch((err) =>
        console.error('[orders POST admin-create] notification error', err),
      );

      return NextResponse.json(order, { status: 201 });
    }
    // ── End admin-create branch ────────────────────────────────────────────


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

    // `userId` is the single source of truth for "is this a guest order?".
    // Using it as the narrowing predicate (rather than a derived `isGuest`
    // boolean) lets TypeScript narrow every downstream `if (userId)` branch
    // to `string` without non-null assertions.
    const userId = sessionUser?.userId;

    // Guests need contact + items in the request — there is no server Cart and
    // no User record we can pull the contact off of.
    if (!userId) {
      if (!body.contactName?.trim()) {
        return NextResponse.json({ message: 'Name is required' }, { status: 400 });
      }
      if (!body.contactEmail?.trim() || !EMAIL_RE.test(body.contactEmail)) {
        return NextResponse.json(
          { message: 'A valid email is required to place a guest order' },
          { status: 400 },
        );
      }
      if (!Array.isArray(body.guestItems) || body.guestItems.length === 0) {
        return NextResponse.json({ message: 'Cart is empty' }, { status: 400 });
      }
      for (const it of body.guestItems) {
        if (!mongoose.isValidObjectId(it.productId)) {
          return NextResponse.json(
            { message: 'Invalid productId in guestItems' },
            { status: 400 },
          );
        }
        if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > MAX_PER_LINE) {
          return NextResponse.json(
            { message: `Quantity must be between 1 and ${MAX_PER_LINE}` },
            { status: 400 },
          );
        }
      }
    }

    // Build orderItems from the right source. Both paths produce identical
    // OrderLine shapes — only the lookup differs (Cart populate vs Product.find
    // by id list) — and the helper handles the status-code mapping for the
    // "cart empty / over-cap / one or more items unavailable" failures.
    const buildResult = userId
      ? await buildOrderItemsFromCart(userId)
      : await buildOrderItemsFromGuestItems(body.guestItems!);

    if (!buildResult.ok) {
      return NextResponse.json(
        { message: buildResult.message },
        { status: buildResult.status },
      );
    }

    const { orderItems, stockErrors } = buildResult;

    if (stockErrors.length > 0) {
      return NextResponse.json(
        { message: `Insufficient stock — ${stockErrors.join('; ')}` },
        { status: 409 },
      );
    }

    const subtotal = computeSubtotal(orderItems);
    const memberDiscount = computeMemberDiscount(subtotal, Boolean(userId));

    let promoDiscount = 0;
    if (body.promoCode) {
      const promoResult = await validatePromoCode(body.promoCode.trim().toUpperCase(), subtotal);
      if (promoResult.valid) promoDiscount = promoResult.amount;
    }

    // Redemption — server-authoritative. Reads the user's live balance and
    // runs applyRedemption against current settings; the client's preview is
    // never trusted. Guests have no rewards balance and so cannot redeem.
    let pointsRedeemed = 0;
    let pointsRedemptionValueCents = 0;
    let pointsDiscount = 0;
    if (
      userId &&
      typeof body.pointsToRedeem === 'number' &&
      body.pointsToRedeem > 0
    ) {
      const [settings, userDoc] = await Promise.all([
        getShopSettings(),
        User.findById(userId).select('rewardPoints').lean(),
      ]);
      const result = applyRedemption({
        pointsToRedeem: Math.floor(body.pointsToRedeem),
        currentBalance: userDoc?.rewardPoints ?? 0,
        settings,
        orderSubtotalDollars: subtotal,
      });
      if (!result.valid) {
        return NextResponse.json({ message: result.error }, { status: 400 });
      }
      // Reject (don't silently truncate) if the redemption is worth more than
      // the order's discountable subtotal — silent truncation would deduct
      // points the customer never got value for. The client UI computes the
      // same cap so legitimate requests never hit this branch.
      const discountable = Math.max(0, subtotal - memberDiscount - promoDiscount);
      const valueDollars = result.valueCents / 100;
      if (valueDollars > discountable + 0.005) {
        return NextResponse.json(
          {
            message: `Redemption ($${valueDollars.toFixed(2)}) exceeds the order's discountable subtotal ($${discountable.toFixed(2)})`,
          },
          { status: 400 },
        );
      }
      if (valueDollars <= 0) {
        return NextResponse.json(
          { message: 'Redemption would not reduce the order total' },
          { status: 400 },
        );
      }
      pointsRedeemed = result.pointsUsed;
      pointsRedemptionValueCents = result.valueCents;
      pointsDiscount = valueDollars;
    }

    const { tax, totalCost } = computeOrderTotals({
      subtotal,
      memberDiscount,
      promoDiscount,
      pointsDiscount,
      fulfillmentType: body.fulfillmentType,
    });

    let decremented: { productId: Types.ObjectId; qty: number }[] = [];
    try {
      decremented = await decrementStockOrThrow(orderItems);
    } catch (err) {
      if (err instanceof Error && err.message === 'OUT_OF_STOCK') {
        return NextResponse.json(
          { message: 'One or more items sold out — please refresh your cart' },
          { status: 409 },
        );
      }
      throw err;
    }

    const paidAt = new Date();

    let order;
    try {
      order = await Order.create({
        ...(userId
          ? { user: userId }
          : {
              guestContact: {
                name: body.contactName!.trim(),
                email: body.contactEmail!.trim().toLowerCase(),
                ...(body.contactPhone && { phone: body.contactPhone }),
              },
            }),
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
        ...(pointsRedeemed > 0 && { pointsRedeemed, pointsRedemptionValueCents }),
        ...(memberDiscount > 0 && { memberDiscount }),
        ...(promoDiscount > 0 && { promoDiscount, promoCode: body.promoCode?.trim().toUpperCase() }),
      });
    } catch (err) {
      await restoreStock(decremented);
      throw err;
    }

    // Deduct redeemed points + write ledger entry. Runs after Order.create
    // succeeds so a failed order doesn't pull points off the user. Guest
    // orders never reach this branch — redemption is gated on `userId` above.
    if (userId && pointsRedeemed > 0) {
      await User.findByIdAndUpdate(userId, {
        $inc: { rewardPoints: -pointsRedeemed },
        $push: {
          pointsHistory: {
            delta: -pointsRedeemed,
            reason: 'redemption',
            orderId: order._id,
            expiresAt: null,
            createdAt: new Date(),
          },
        },
      });
    }

    // Wipe the server-side Cart for signed-in users. Guests have no server
    // Cart — their localStorage cart is cleared client-side by
    // ConfirmationCartReset after the redirect.
    if (userId) {
      await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    }

    // Activity tracking — signed-in customers count as active when they
    // place an order. Guest orders have no user to update. The helper
    // writes a `self_dormancy_cleared` audit row when the order rescued a
    // warned account, matching the sign-in path's audit behavior.
    if (userId) {
      await recordCustomerActivity({ userId, at: paidAt });
    }

    notifyAdminsOfNewOrder(String(order._id), totalCost).catch((err) =>
      console.error('[orders POST] notification error', err),
    );

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('[orders POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
