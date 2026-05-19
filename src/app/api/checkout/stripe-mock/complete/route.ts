import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import connectDB from '@/config/database';
import Order from '@/models/Order';
import { isStubMode } from '@/lib/payments/stripe';
import { completeSessionForOrder } from '@/lib/payments/completeSession';
import { recordStubSavedCard } from '@/lib/payments/savedCards';
import { getSessionUser } from '@/lib/getSessionUser';

export const dynamic = 'force-dynamic';

// Stub-mode stand-in for `checkout.session.completed`. The mock Stripe page's
// Complete button posts here; this route reuses the same helper the real
// webhook uses so completion semantics live in one place. Refuses when a real
// STRIPE_SECRET_KEY is set so a misconfigured client can't bypass real Stripe.
export const POST = async (request: NextRequest) => {
  if (!isStubMode()) {
    return NextResponse.json(
      { message: 'Stub-mode completion is not available when Stripe is configured' },
      { status: 404 },
    );
  }

  let orderId: string | undefined;

  // Mock page submits a real <form> (works without JS); body arrives as
  // urlencoded. Also accept JSON for completeness.
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = (await request.json()) as { orderId?: string };
    orderId = body.orderId;
  } else {
    const form = await request.formData();
    const value = form.get('orderId');
    orderId = typeof value === 'string' ? value : undefined;
  }

  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    return NextResponse.json({ message: 'Valid orderId is required' }, { status: 400 });
  }

  // Ownership gate — without this anyone with a pending orderId could
  // complete the order in stub mode (no money moves, but the DB flips and
  // stock/promo/points settle). User orders must match the session user;
  // guest orders rely on the orderId-as-token model and only the order's
  // pending status to gate replay.
  await connectDB();
  const order = await Order.findById(orderId).select('user paymentResult.status saveCardIntent').lean();
  if (!order) {
    return NextResponse.json({ message: 'Order not found' }, { status: 404 });
  }
  if (order.paymentResult?.status !== 'Pending') {
    return NextResponse.json({ message: 'Order is no longer pending' }, { status: 409 });
  }
  if (order.user) {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId || sessionUser.userId !== String(order.user)) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }
  }
  // Snapshot now so we can call recordStubSavedCard after a successful paid
  // result. Trusting the server-stamped saveCardIntent (not the form `saveCard`
  // field) avoids letting a tampered POST add a card row for an order the
  // customer never ticked Save on.
  const savedCardUserId =
    order.user && order.saveCardIntent ? String(order.user) : null;

  const result = await completeSessionForOrder({
    orderId,
    // No real PaymentIntent in stub mode; helper leaves paymentIntentId unset
    // and the order keeps 'Stripe' as the paymentMethod from creation.
    issueRefund: async () => {
      // Stub mode never moved real money, so a "refund" is a no-op. The
      // helper still marks the order Refunded when stock/promo fails so the
      // schema reflects the same state as real Stripe would.
    },
  });

  if (result.status === 'not_found') {
    return NextResponse.json({ message: 'Order not found' }, { status: 404 });
  }

  // Cancellation outcomes (stock race, promo exhaustion) shouldn't land the
  // customer on a "You're all set" confirmation page. Bounce them back to
  // /checkout with a specific reason so the toast can explain what happened.
  if (
    result.status === 'cancelled_out_of_stock' ||
    result.status === 'cancelled_promo_exhausted'
  ) {
    const reason =
      result.status === 'cancelled_out_of_stock' ? 'out_of_stock' : 'promo_exhausted';
    const url = new URL(
      `/checkout?paymentFailed=${reason}`,
      request.nextUrl.origin,
    );
    return NextResponse.redirect(url, 303);
  }

  // Mirror the save to the stub-mode SavedCard collection only on a fresh
  // 'paid' transition — not on 'already_advanced', which means the order had
  // already been completed by a prior request and re-saving would create a
  // duplicate card on a replay.
  if (result.status === 'paid' && savedCardUserId) {
    try {
      await recordStubSavedCard(savedCardUserId);
    } catch (err) {
      // Don't fail the checkout because the stub card mirror failed; the
      // order is already paid and the customer is mid-redirect.
      console.error('[stripe-mock/complete] recordStubSavedCard failed', err);
    }
  }

  // paid / already_advanced both land on the confirmation page.
  const sessionId = `cs_test_stub_${orderId}`;
  const url = new URL(
    `/checkout/confirmation?orderId=${orderId}&session_id=${sessionId}`,
    request.nextUrl.origin,
  );
  return NextResponse.redirect(url, 303);
};
