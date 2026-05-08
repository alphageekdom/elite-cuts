'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useCartContext } from '@/context/CartContext';
import { useCheckoutContext } from '@/context/CheckoutContext';
import { computeTotals } from '@/lib/pricing';
import { EMAIL_RE } from '@/lib/validation';

const SpinnerIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className='h-3.5 w-3.5 animate-spin'
  >
    <circle cx='12' cy='12' r='10' strokeOpacity={0.25} />
    <path d='M12 2a10 10 0 0 1 10 10' />
  </svg>
);

const ArrowIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className='h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0'
  >
    <path d='M5 12h14M13 5l7 7-7 7' />
  </svg>
);

const PlaceOrderButton = () => {
  const router = useRouter();
  const { cartItems } = useCartContext();
  const { data: session } = useSession();
  const {
    isPaymentReady,
    promoDiscount,
    fulfillment,
    contactName,
    contactEmail,
    contactPhone,
    pickupSlot,
    deliveryAddress,
    orderNotes,
  } = useCheckoutContext();

  const [isLoading, setIsLoading] = useState(false);
  const isLoggedIn = Boolean(session?.user);

  const total = useMemo(
    () => computeTotals(cartItems, { isLoggedIn, promoDiscount }).total,
    [cartItems, isLoggedIn, promoDiscount],
  );

  const isContactReady =
    contactName.trim().length >= 5 &&
    EMAIL_RE.test(contactEmail.trim()) &&
    contactPhone.replace(/\D/g, '').length >= 10;

  const canSubmit = isPaymentReady && isContactReady && !isLoading;

  const handlePlaceOrder = async () => {
    if (!canSubmit) return;
    setIsLoading(true);

    const pickupLocation =
      fulfillment === 'pickup'
        ? `${pickupSlot ? `${pickupSlot} — ` : ''}3045 30th St, North Park, SD`
        : [
            deliveryAddress.address1,
            deliveryAddress.address2,
            deliveryAddress.city,
            deliveryAddress.state,
            deliveryAddress.zip,
          ]
            .filter(Boolean)
            .join(', ');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'Demo',
          pickupLocation,
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone,
          fulfillmentType: fulfillment,
          ...(fulfillment === 'pickup' && pickupSlot ? { pickupSlot } : {}),
          ...(fulfillment === 'delivery' ? { deliveryAddress } : {}),
          ...(orderNotes.trim() ? { orderNotes: orderNotes.trim() } : {}),
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        toast.error(data.message ?? 'Something went wrong. Please try again.');
        return;
      }

      const order = (await res.json()) as { _id: string };
      router.push(`/checkout/confirmation?orderId=${order._id}`);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type='button'
      onClick={handlePlaceOrder}
      disabled={!canSubmit}
      aria-disabled={!canSubmit}
      className={`group mt-2 inline-flex w-full items-center justify-center gap-3 rounded-full px-7 py-4 text-[15px] font-medium tracking-[0.02em] transition-[background-color,transform,opacity] duration-300 motion-reduce:transition-none ${
        canSubmit
          ? 'cursor-pointer bg-ink text-cream hover:-translate-y-px hover:bg-oxblood motion-reduce:hover:translate-y-0'
          : 'cursor-not-allowed bg-ink/30 text-cream/60'
      }`}
    >
      {isLoading ? 'Placing order…' : 'Place demo order'}
      {total > 0 && !isLoading && (
        <span className='rounded-full bg-cream/15 px-3 py-1 font-display text-[14px] font-medium'>
          ${total.toFixed(2)}
        </span>
      )}
      {isLoading ? <SpinnerIcon /> : canSubmit ? <ArrowIcon /> : null}
    </button>
  );
};

export default PlaceOrderButton;
