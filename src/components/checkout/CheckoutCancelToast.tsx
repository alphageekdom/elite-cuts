'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

// Fires a one-shot "payment cancelled" toast when the customer is bounced back
// from Stripe's hosted page via the ?cancelled=1 query param, then strips the
// param so a browser refresh doesn't re-toast. The pending Order created
// before redirect stays in the DB until Stripe's session.expired webhook
// (Phase 1C) cancels it; the customer's cart is untouched.
const CheckoutCancelToast = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (searchParams.get('cancelled') !== '1') return;
    handled.current = true;

    toast('Payment cancelled. Your cart is saved.');

    const next = new URLSearchParams(searchParams.toString());
    next.delete('cancelled');
    const qs = next.toString();
    router.replace(qs ? `/checkout?${qs}` : '/checkout');
  }, [router, searchParams]);

  return null;
};

export default CheckoutCancelToast;
