import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';

import connectDB from '@/config/database';
import Order from '@/models/Order';
import { getStripe, isStubMode } from '@/lib/payments/stripe';
import {
  completeSessionForOrder,
  stripeMethodToPaymentMethod,
} from '@/lib/payments/completeSession';

export const dynamic = 'force-dynamic';

// Stripe signs every webhook with the `Stripe-Signature` header; verifying it
// against STRIPE_WEBHOOK_SECRET is the only thing standing between this route
// and a forged event. Signature verification needs the RAW request body —
// `await request.text()`, never `.json()`, because JSON.parse + re-stringify
// would munge byte-equivalent payloads and break the HMAC.
export const POST = async (request: NextRequest) => {
  // Short-circuit in stub mode so a stray test POST returns a self-documenting
  // 503 instead of triggering the opaque `getStripe()` throw further down.
  if (isStubMode()) {
    return NextResponse.json(
      {
        message:
          'Stripe webhook is unavailable in stub mode. Configure STRIPE_SECRET_KEY to enable.',
      },
      { status: 503 },
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');

  if (!secret || !signature) {
    return NextResponse.json(
      { message: 'Missing webhook signature or secret' },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('[stripe webhook] signature verification failed', err);
    return NextResponse.json(
      { message: 'Invalid webhook signature' },
      { status: 400 },
    );
  }

  await connectDB();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleSessionCompleted(event.data.object, stripe);
        break;
      case 'checkout.session.expired':
        await handleSessionExpired(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;
      default:
        // Unhandled event types are acknowledged silently — Stripe sends a
        // wide range of events and only the ones above are load-bearing here.
        break;
    }
  } catch (err) {
    console.error('[stripe webhook] handler error', err);
    // 500 prompts Stripe to retry — that's correct for transient failures.
    return NextResponse.json(
      { message: 'Webhook handler failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
};

const handleSessionCompleted = async (
  session: Stripe.Checkout.Session,
  stripe: Stripe,
): Promise<void> => {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.error('[stripe webhook] session.completed without metadata.orderId', {
      sessionId: session.id,
    });
    return;
  }

  // Fetch the payment intent to read the real payment method type. Stripe
  // could embed it on the session.payment_intent when expanded, but the safer
  // path is to fetch it explicitly.
  let paymentMethod: ReturnType<typeof stripeMethodToPaymentMethod> = 'Card or wallet';
  let paymentIntentId: string | undefined;

  if (typeof session.payment_intent === 'string') {
    paymentIntentId = session.payment_intent;
    try {
      const pi = await stripe.paymentIntents.retrieve(session.payment_intent, {
        expand: ['payment_method'],
      });
      const pm = pi.payment_method;
      const stripeType =
        pm && typeof pm !== 'string' ? pm.type : undefined;
      paymentMethod = stripeMethodToPaymentMethod(stripeType);
    } catch (err) {
      console.error(
        '[stripe webhook] failed to resolve payment method, falling back to Card or wallet',
        err,
      );
    }
  }

  await completeSessionForOrder({
    orderId,
    paymentIntentId,
    paymentMethod,
    issueRefund: async (amountCents, reason) => {
      if (!paymentIntentId) return;
      await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amountCents,
        reason: 'requested_by_customer',
        metadata: { reason },
      });
    },
  });
};

const handleSessionExpired = async (
  session: Stripe.Checkout.Session,
): Promise<void> => {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  await cancelPendingOrder(orderId);
};

const handlePaymentFailed = async (
  intent: Stripe.PaymentIntent,
): Promise<void> => {
  const orderId = intent.metadata?.orderId;
  if (!orderId) return;
  await cancelPendingOrder(orderId);
};

// Handles refunds initiated outside the EliteCuts admin (e.g. inside the
// Stripe Dashboard). Idempotent for admin-initiated refunds — the order
// drawer route flips paymentResult.status before this event fires, so the
// early-return below absorbs the duplicate notification.
//
// External refunds don't carry line-item context (Stripe doesn't know about
// our line items), so we flip the order's paymentResult.status based on the
// charge's amount_refunded vs the order total. Specific items are NOT marked
// refunded — that audit gap is acceptable for the portfolio scope; admins
// who refund inside Stripe should also flag items inside EliteCuts if they
// want item-level granularity.
const handleChargeRefunded = async (charge: Stripe.Charge): Promise<void> => {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const order = await Order.findOne({
    'paymentResult.paymentIntentId': paymentIntentId,
  });
  if (!order) return;

  // Idempotency — admin-initiated refunds already advanced the status. This
  // event is informational confirmation.
  if (
    order.paymentResult.status === 'Refunded' ||
    order.paymentResult.status === 'Partially Refunded'
  ) {
    return;
  }

  const amountRefundedDollars = (charge.amount_refunded ?? 0) / 100;
  const fullRefund = amountRefundedDollars + 0.005 >= order.totalCost;

  order.paymentResult.status = fullRefund ? 'Refunded' : 'Partially Refunded';
  order.paymentResult.paymentDate = new Date();
  order.paymentResult.amountPaid = Math.max(
    0,
    Math.round((order.totalCost - amountRefundedDollars) * 100) / 100,
  );
  order.paymentResult.refundedExternally = true;
  await order.save();
};

const cancelPendingOrder = async (orderId: string): Promise<void> => {
  // Only cancel Pending orders. Stripe sometimes sends session.expired after
  // a successful payment has already moved the order to Completed (rare race
  // around long-running sessions) — we must not undo that.
  await Order.findOneAndUpdate(
    { _id: orderId, 'paymentResult.status': 'Pending' },
    {
      $set: {
        orderStatus: 'Cancelled',
        cancellationReason: 'Other',
        cancelledAt: new Date(),
        'paymentResult.status': 'Failed',
      },
    },
  );
};
