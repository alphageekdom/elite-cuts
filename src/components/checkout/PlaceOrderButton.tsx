'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useCartContext } from '@/context/CartContext';
import { useCheckoutContext } from '@/context/CheckoutContext';
import { useShopSettings } from '@/context/ShopSettingsContext';
import { computeTotals, fmtPrice, DELIVERY_FEE } from '@/lib/pricing';
import { isContactComplete } from '@/lib/checkoutValidation';
import { formatShopAddress } from '@/lib/shopSettingsFormat';

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
  const { cartItems } = useCartContext();
  const { data: session } = useSession();
  const { state } = useCheckoutContext();
  const {
    isPaymentReady,
    paymentMethod,
    promoCode,
    promoDiscount,
    promoExcludesMember,
    pointsDiscount,
    pointsToRedeem,
    fulfillment,
    contactName,
    contactEmail,
    contactPhone,
    pickupSlot,
    deliveryAddress,
    orderNotes,
    saveCard,
    cardDetails,
    selectedSavedCardId,
  } = state;

  const [isLoading, setIsLoading] = useState(false);
  const isLoggedIn = Boolean(session?.user);
  const shopSettings = useShopSettings();
  const shopAddress = formatShopAddress(shopSettings);

  const total = useMemo(
    () =>
      computeTotals(cartItems, {
        isLoggedIn,
        excludesMember: promoExcludesMember,
        promoDiscount,
        pointsDiscount,
        deliveryFee: fulfillment === 'delivery' ? DELIVERY_FEE : 0,
      }).total,
    [cartItems, isLoggedIn, promoExcludesMember, promoDiscount, pointsDiscount, fulfillment],
  );

  const canSubmit = isPaymentReady && isContactComplete(state) && !isLoading;

  const handlePlaceOrder = async () => {
    if (!canSubmit) return;
    setIsLoading(true);

    const pickupLocation =
      fulfillment === 'pickup'
        ? `${pickupSlot ? `${pickupSlot} — ` : ''}${shopAddress}`
        : [
            deliveryAddress.address1,
            deliveryAddress.address2,
            deliveryAddress.city,
            deliveryAddress.state,
            deliveryAddress.zip,
          ]
            .filter(Boolean)
            .join(', ');

    // Guests have no server-side Cart record — their items live in localStorage
    // via CartContext. Pass them along so the route can build the order from
    // body items instead of a Cart lookup.
    const guestItems = isLoggedIn
      ? undefined
      : cartItems.map((line) => ({
          productId: line.product._id,
          qty: line.quantity,
        }));

    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          pickupLocation,
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone,
          fulfillmentType: fulfillment,
          ...(fulfillment === 'pickup' && pickupSlot ? { pickupSlot } : {}),
          ...(fulfillment === 'delivery' ? { deliveryAddress } : {}),
          ...(orderNotes.trim() ? { orderNotes: orderNotes.trim() } : {}),
          ...(promoCode ? { promoCode } : {}),
          ...(pointsToRedeem > 0 ? { pointsToRedeem } : {}),
          ...(guestItems ? { guestItems } : {}),
          // When the shopper picked a card from the saved-cards strip, send
          // only the id — the server validates ownership and uses it. Skip
          // the typed-card save fields entirely so a stale form-state doesn't
          // accidentally write a duplicate row.
          ...(selectedSavedCardId
            ? { savedCardId: selectedSavedCardId }
            : {
                ...(saveCard && isLoggedIn && paymentMethod === 'stripe'
                  ? { saveCard: true }
                  : {}),
                ...(saveCard && isLoggedIn && paymentMethod === 'card' && cardDetails
                  ? { saveCard: true, cardDetails }
                  : {}),
              }),
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        toast.error(data.message ?? 'Something went wrong. Please try again.');
        return;
      }

      const data = (await res.json()) as { url?: unknown };
      if (typeof data.url !== 'string' || !data.url) {
        toast.error('Could not start payment. Please try again.');
        return;
      }
      // Hand off to Stripe's hosted Checkout (or the local stub when no
      // STRIPE_SECRET_KEY is set). Cart reset happens after the customer
      // returns to the confirmation page via ConfirmationCartReset.
      window.location.assign(data.url);
    } catch (err) {
      console.error('[PlaceOrderButton] checkout session failed', err);
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
      {isLoading
        ? paymentMethod === 'card'
          ? 'Placing order…'
          : 'Redirecting to Stripe…'
        : 'Continue to payment'}
      {total > 0 && !isLoading && (
        <span className='rounded-full bg-cream/15 px-3 py-1 font-display text-[14px] font-medium'>
          ${fmtPrice(total)}
        </span>
      )}
      {isLoading ? <SpinnerIcon /> : canSubmit ? <ArrowIcon /> : null}
    </button>
  );
};

export default PlaceOrderButton;
