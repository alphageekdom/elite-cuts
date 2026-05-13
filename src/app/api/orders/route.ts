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
import { MEMBER_DISCOUNT_RATE, DELIVERY_FEE, TAX_RATE } from '@/lib/pricing';
import { MAX_PER_LINE } from '@/lib/shopConfig';
import { getShopSettings } from '@/lib/shopSettings';
import { awardOrderCompletion } from '@/lib/order-completion';

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

// POST /api/orders — two modes:
// • Customer flow (default): builds an order from the caller's cart.
// • Admin-create flow: admin passes `source: 'admin'`, `userId`, and `items[]`
//   to record an order on behalf of a customer (in-store pickup recording).
export const POST = async (request: NextRequest) => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return unauthorized();
  }

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
    };

    // ── Admin-create branch ───────────────────────────────────────────────
    if (body.source === 'admin') {
      if (!sessionUser.user?.isAdmin) {
        return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
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
        User.findById(body.userId, '_id name email').lean(),
        Product.find(
          { _id: { $in: body.items.map((it) => it.productId) } },
          'name price images category stockCount',
        ).lean(),
      ]);

      if (!customer) {
        return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
      }

      type ProductLean = {
        _id: Types.ObjectId;
        name: string;
        price: number;
        images?: string[];
        category?: string;
        stockCount: number;
      };
      const productMap = new Map<string, ProductLean>(
        (products as unknown as ProductLean[]).map((p) => [p._id.toString(), p]),
      );

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
      const subtotal = Math.round(
        orderItems.reduce((sum, item) => sum + item.price * item.qty, 0) * 100,
      ) / 100;
      const deliveryFee = body.fulfillmentType === 'delivery' ? DELIVERY_FEE : 0;
      const tax = Math.round((subtotal + deliveryFee) * TAX_RATE * 100) / 100;
      const totalCost = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

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
          customerUserId: body.userId,
          totalCost,
          productIds: orderItems.map((it) => it.product),
        });
      }

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

    notifyAdminsOfNewOrder(String(order._id), totalCost).catch((err) =>
      console.error('[orders POST] notification error', err),
    );

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('[orders POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
