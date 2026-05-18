'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

// Fires a one-shot toast when the customer is bounced back to /checkout from
// the payment-redirect flow, then strips the triggering param so a browser
// refresh doesn't re-toast.
//
//   ?cancelled=1                          — customer hit Cancel on Stripe.
//   ?paymentFailed=out_of_stock           — paid, but a line went out of stock
//                                           during payment. Refunded by the
//                                           webhook; cart needs a refresh.
//   ?paymentFailed=promo_exhausted        — paid, but the promo code ran out
//                                           during payment. Refunded; retry
//                                           without the code.
//
// In all cases the customer's cart is untouched and the pending Order has
// either been cancelled (real Stripe webhook on session.expired) or refunded
// and cancelled (stock / promo race during checkout.session.completed).
const PAYMENT_FAILED_MESSAGES: Record<string, string> = {
  out_of_stock:
    'One of your items sold out during payment. Your card was refunded — please refresh your cart and try again.',
  promo_exhausted:
    'The promo code ran out during payment. Your card was refunded — please remove the code and try again.',
};

const CheckoutCancelToast = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const cancelled = searchParams.get('cancelled') === '1';
    const paymentFailedReason = searchParams.get('paymentFailed');
    if (!cancelled && !paymentFailedReason) return;

    handled.current = true;

    if (paymentFailedReason) {
      const message =
        PAYMENT_FAILED_MESSAGES[paymentFailedReason] ??
        'Payment could not complete. Your card was refunded — please try again.';
      toast.error(message);
    } else {
      toast('Payment cancelled. Your cart is saved.');
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete('cancelled');
    next.delete('paymentFailed');
    const qs = next.toString();
    router.replace(qs ? `/checkout?${qs}` : '/checkout');
  }, [router, searchParams]);

  return null;
};

export default CheckoutCancelToast;
