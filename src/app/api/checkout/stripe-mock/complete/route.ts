import { NextResponse, type NextRequest } from 'next/server';

import { isStubMode } from '@/lib/payments/stripe';
import { completeSessionForOrder } from '@/lib/payments/completeSession';

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

  if (!orderId) {
    return NextResponse.json({ message: 'orderId is required' }, { status: 400 });
  }

  const result = await completeSessionForOrder({
    orderId,
    // No real PaymentIntent in stub mode; helper falls back to 'Card or wallet'
    // on paymentMethod and leaves paymentIntentId unset.
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

  // paid / already_advanced both land on the confirmation page.
  const sessionId = `cs_test_stub_${orderId}`;
  const url = new URL(
    `/checkout/confirmation?orderId=${orderId}&session_id=${sessionId}`,
    request.nextUrl.origin,
  );
  return NextResponse.redirect(url, 303);
};
