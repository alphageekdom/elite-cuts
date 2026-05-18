import { NextResponse, type NextRequest } from 'next/server';
import mongoose, { type Types } from 'mongoose';

export const dynamic = 'force-dynamic';

import connectDB from '@/config/database';
import Order, { type DeliveryAddressData } from '@/models/Order';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';
import { EMAIL_RE } from '@/lib/validation';
import { validatePromo } from '@/lib/promos/validate';
import { MAX_PER_LINE } from '@/lib/shopConfig';
import { getShopSettings } from '@/lib/shopSettings';
import { applyRedemption } from '@/lib/rewards';
import {
  buildOrderItemsFromCart,
  buildOrderItemsFromGuestItems,
  computeSubtotal,
  computeMemberDiscount,
  computeOrderTotals,
} from '@/lib/orderBuilder';
import { getStripe, dollarsToCents, isStubMode } from '@/lib/payments/stripe';
import { completeSessionForOrder } from '@/lib/payments/completeSession';
import { getOrCreateStripeCustomer } from '@/lib/payments/savedCards';

// POST /api/checkout/session — customer-facing checkout entry point.
// Creates a pending Order (no stock decrement, no points deduction, no
// promo seat reservation — all of those happen in the Phase 1C webhook on
// checkout.session.completed) plus a Stripe Checkout Session that redirects
// the customer to Stripe's hosted payment page. Returns { url } so the
// client can `window.location` to it.
export const POST = async (request: NextRequest) => {
  const sessionUser = await getSessionUser();

  try {
    await connectDB();

    const body = (await request.json()) as {
      paymentMethod?: 'card' | 'stripe';
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
      saveCard?: boolean;
    };

    // Only honor the Save card intent when the shopper is logged-in and going
    // through Stripe — the demo card path never touches Stripe, and guests
    // have no user record for a card to attach to.
    const saveCardIntent =
      Boolean(body.saveCard) &&
      Boolean(sessionUser?.userId) &&
      body.paymentMethod !== 'card';

    // 'card' is the demo card-form path — order is created paid directly
    // with paymentMethod 'Credit Card', no Stripe round trip. 'stripe' (the
    // default) goes through Stripe Checkout and stamps 'Stripe'.
    const isCardDemo = body.paymentMethod === 'card';

    if (!body.pickupLocation?.trim()) {
      return NextResponse.json({ message: 'Pickup location is required' }, { status: 400 });
    }
    if (body.fulfillmentType && !['pickup', 'delivery'].includes(body.fulfillmentType)) {
      return NextResponse.json({ message: 'Invalid fulfillmentType' }, { status: 400 });
    }
    if (body.contactEmail && !EMAIL_RE.test(body.contactEmail)) {
      return NextResponse.json({ message: 'Invalid contactEmail format' }, { status: 400 });
    }
    if (body.contactName && body.contactName.length > 120) {
      return NextResponse.json({ message: 'contactName too long' }, { status: 400 });
    }
    if (body.contactPhone && body.contactPhone.length > 20) {
      return NextResponse.json({ message: 'contactPhone too long' }, { status: 400 });
    }
    if (body.pickupLocation.length > 200) {
      return NextResponse.json({ message: 'pickupLocation too long' }, { status: 400 });
    }
    if (body.orderNotes && body.orderNotes.length > 1000) {
      return NextResponse.json({ message: 'orderNotes too long' }, { status: 400 });
    }

    const userId = sessionUser?.userId;

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
          return NextResponse.json({ message: 'Invalid productId in guestItems' }, { status: 400 });
        }
        if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > MAX_PER_LINE) {
          return NextResponse.json(
            { message: `Quantity must be between 1 and ${MAX_PER_LINE}` },
            { status: 400 },
          );
        }
      }
    }

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

    // Promo validation is read-only here. Seat reservation moves to the
    // webhook on checkout.session.completed so abandoned sessions don't
    // hold a seat for the entire 24h Stripe expiry window.
    let promoDiscount = 0;
    let promoExcludesMember = false;
    let promoIdForOrder: Types.ObjectId | null = null;
    if (body.promoCode) {
      const promoResult = await validatePromo({
        code: body.promoCode,
        userId: userId ?? null,
        subtotalCents: Math.round(subtotal * 100),
        isMember: Boolean(userId),
      });
      if (promoResult.valid) {
        promoDiscount = promoResult.discountCents / 100;
        promoExcludesMember = promoResult.promo.excludesMember;
        promoIdForOrder = promoResult.promo._id;
      }
    }
    const memberDiscount = promoExcludesMember
      ? 0
      : computeMemberDiscount(subtotal, Boolean(userId));

    // Points validation is read-only too. Actual deduction from User.rewardPoints
    // moves to the webhook so an abandoned session doesn't lock points up.
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

    // Refuse a free order — Stripe won't accept a $0 Checkout Session.
    if (totalCost <= 0) {
      return NextResponse.json(
        { message: 'Order total must be greater than $0 to pay online' },
        { status: 400 },
      );
    }

    // Create the order in pending state. Snapshots of discounts and the
    // points-to-redeem amount are stored so the webhook can re-validate and
    // apply them atomically when payment completes.
    const order = await Order.create({
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
      isPaid: false,
      orderStatus: 'Order Placed',
      paymentMethod: isCardDemo ? 'Credit Card' : 'Stripe',
      paymentResult: {
        status: 'Pending',
        provider: isCardDemo ? 'demo' : 'stripe',
        amountPaid: 0,
        currency: 'USD',
        paymentDate: new Date(),
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
      ...(promoDiscount > 0 && {
        promoDiscount,
        promoCode: body.promoCode?.trim().toUpperCase(),
        ...(promoIdForOrder && { promoId: promoIdForOrder }),
      }),
      ...(saveCardIntent && { saveCardIntent: true }),
    });

    const orderRef = `EC-${String(order._id).slice(-4).toUpperCase()}`;
    const origin = request.nextUrl.origin;

    // Card-form demo path — flip the order to paid via the shared completion
    // helper (same stock decrement + promo seat + points deduction logic the
    // Stripe webhook runs) and return the confirmation URL. No real money
    // moves, so `issueRefund` is a no-op if a stock/promo race forces cancel.
    if (isCardDemo) {
      const result = await completeSessionForOrder({
        orderId: String(order._id),
        issueRefund: async () => {},
      });
      if (result.status === 'cancelled_out_of_stock') {
        return NextResponse.json(
          { url: `${origin}/checkout?paymentFailed=out_of_stock` },
        );
      }
      if (result.status === 'cancelled_promo_exhausted') {
        return NextResponse.json(
          { url: `${origin}/checkout?paymentFailed=promo_exhausted` },
        );
      }
      return NextResponse.json({
        url: `${origin}/checkout/confirmation?orderId=${String(order._id)}`,
      });
    }

    // Create the Stripe Checkout Session. A single summary line item keeps
    // Stripe's page simple — the detailed breakdown lives on EliteCuts's
    // confirmation page. Tax is rolled into the summary because EliteCuts
    // computes its own tax via computeOrderTotals; Stripe Tax stays off.
    const settings = await getShopSettings();
    const itemCount = orderItems.reduce((acc, it) => acc + it.qty, 0);

    // Stub-mode short-circuit: when no STRIPE_SECRET_KEY is set, skip the real
    // Stripe API call entirely and hand the customer to a local mock that
    // mirrors the redirect/cancel pattern. Lets the project run end-to-end
    // without sandbox credentials. The "session id" is a deterministic stub
    // so the webhook handler in Phase 1C can no-op cleanly when it sees one.
    if (isStubMode()) {
      const stubSessionId = `cs_test_stub_${String(order._id)}`;
      await Order.updateOne(
        { _id: order._id },
        { $set: { 'paymentResult.checkoutSessionId': stubSessionId } },
      );
      const mockUrl = `${origin}/checkout/stripe-mock?orderId=${String(order._id)}&ref=${encodeURIComponent(orderRef)}`;
      return NextResponse.json({ url: mockUrl });
    }

    try {
      const stripe = getStripe();
      // Logged-in shoppers get tied to their Stripe Customer so the hosted
      // Checkout page pre-lists any cards they've saved on prior orders. Guests
      // fall back to customer_email — Stripe disallows passing both at once.
      const stripeCustomerId = userId
        ? await getOrCreateStripeCustomer(userId)
        : null;
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: dollarsToCents(totalCost),
              product_data: {
                name: `${settings.shopName} order ${orderRef}`,
                description: `${itemCount} item${itemCount === 1 ? '' : 's'} — includes tax`,
              },
            },
          },
        ],
        metadata: { orderId: String(order._id) },
        success_url: `${origin}/checkout/confirmation?orderId=${String(order._id)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?cancelled=1`,
        ...(stripeCustomerId
          ? { customer: stripeCustomerId }
          : {
              customer_email: userId
                ? sessionUser?.email ?? undefined
                : body.contactEmail!.trim().toLowerCase(),
            }),
        // setup_future_usage: 'on_session' tells Stripe to attach the card to
        // the customer at the end of payment so it pre-lists on the next
        // checkout. 'on_session' is correct here because the customer is
        // present and authorizing — 'off_session' would mean recurring
        // unattended charges, which the shop doesn't do.
        ...(saveCardIntent && stripeCustomerId
          ? { payment_intent_data: { setup_future_usage: 'on_session' as const } }
          : {}),
      });

      // Stripe's typed response promises a string url on success but allows null
      // for `ui_mode: 'embedded'`. The hosted flow always returns a url.
      if (!session.url) {
        await Order.deleteOne({ _id: order._id });
        return NextResponse.json(
          { message: 'Stripe returned a session without a redirect URL' },
          { status: 502 },
        );
      }

      // Save the session id back to the order so the webhook can correlate
      // even if the metadata.orderId path ever drifts.
      await Order.updateOne(
        { _id: order._id },
        { $set: { 'paymentResult.checkoutSessionId': session.id } },
      );

      return NextResponse.json({ url: session.url });
    } catch (err) {
      // Stripe failed — undo the pending order so it doesn't sit as a tombstone.
      await Order.deleteOne({ _id: order._id });
      console.error('[checkout/session POST] Stripe error', err);
      return NextResponse.json(
        { message: 'Could not start payment. Please try again.' },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error('[checkout/session POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};
