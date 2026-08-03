'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useCartContext } from '@/context/CartContext';
import { useCheckoutContext } from '@/context/CheckoutContext';
import { useShopSettings } from '@/context/ShopSettingsContext';
import { computeTotals, fmtPrice, DELIVERY_FEE } from '@/lib/pricing';
import { repriceLines } from '@/lib/cart/reprice';
import {
  isContactComplete,
  isDeliveryAddressComplete,
  isEmailValid,
  isFulfillmentReady,
  isNameValid,
  isPhoneValid,
} from '@/lib/checkout/validation';
import { DELIVERY_RADIUS_MILES } from '@/lib/shop-settings/config';
import { formatShopAddress } from '@/lib/shop-settings/format';
import { PICKUP_LOCATION_SEPARATOR } from '@/lib/shop-settings/pickup-slots';
import ArrowIcon from '@/components/ui/icons/ArrowIcon';
import SpinnerIcon from '@/components/ui/icons/SpinnerIcon';

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
    deliveryCheck,
    orderNotes,
    saveCard,
    cardDetails,
    selectedSavedCardId,
    autoSettleAtPickup,
  } = state;

  const [isLoading, setIsLoading] = useState(false);
  // `isLoading` drives the button's appearance, but it can't gate the handler:
  // state read inside a click handler is whatever the last render captured, so
  // clicks landing in the same tick all see `false` and each fires its own
  // Stripe session. This flips synchronously.
  const isSubmittingRef = useRef(false);
  const releaseSubmitGuard = () => {
    isSubmittingRef.current = false;
    setIsLoading(false);
  };

  // The guard is deliberately held across the hand-off to Stripe (see the
  // comment at `window.location.assign` below), so nothing released it when
  // the browser restored this page from its back/forward cache: pressing Back
  // from Stripe brought the checkout page back with the guard still set and
  // the spinner still running, and only a manual reload recovered. Stripe's
  // own cancel link is a fresh load and was never affected.
  //
  // `persisted` is true only for a bfcache restore, so a normal load — which
  // already starts with the guard clear — doesn't touch it.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) releaseSubmitGuard();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);
  const isLoggedIn = Boolean(session?.user);
  const shopSettings = useShopSettings();
  const shopAddress = formatShopAddress(shopSettings);

  // Repriced for the same reason the summary is: the order builder charges the
  // current product price, not the cart's snapshot. The figure printed on the
  // button is the last number a customer reads before paying, so it above all
  // must be the one they are charged.
  const total = useMemo(
    () =>
      computeTotals(repriceLines(cartItems), {
        isLoggedIn,
        excludesMember: promoExcludesMember,
        promoDiscount,
        pointsDiscount,
        deliveryFee: fulfillment === 'delivery' ? DELIVERY_FEE : 0,
      }).total,
    [cartItems, isLoggedIn, promoExcludesMember, promoDiscount, pointsDiscount, fulfillment],
  );

  const canSubmit =
    isPaymentReady && isContactComplete(state) && isFulfillmentReady(state) && !isLoading;

  // The button used to sit greyed out with nothing saying why. Cascades in the
  // same order `canSubmit` evaluates, so the hint always names the next thing
  // actually blocking the order.
  //
  // Deliberately not the design's wording for the middle two: it promised a
  // receipt by email and a text when the order is ready, and the shop can send
  // neither. These say what the fields are really for.
  const blockingHint = !contactName.trim()
    ? 'Add your name to continue'
    : !isNameValid(contactName)
      ? // "Add your name" reads as an insult when a name is already typed —
        // someone entering "Al B" is told to do what they just did. Name the
        // real rule instead.
        'Enter your full name so the counter can find your order'
      : !isEmailValid(contactEmail)
        ? 'Add a valid email address — your order history is keyed to it'
        : !isPhoneValid(contactPhone)
          ? 'Add a phone number the shop can reach you on'
          : !isPaymentReady
            ? 'Add your payment details to continue'
            : // Delivery-only, and last because the address sits below payment
              // in the form. Each state gets its own line: a customer whose
              // address is outside the radius needs to hear something
              // different from one whose address is still being checked.
              fulfillment === 'delivery' && !isDeliveryAddressComplete(deliveryAddress)
              ? 'Add your full delivery address to continue'
              : fulfillment === 'delivery' && deliveryCheck === 'checking'
                ? 'Checking whether we deliver to that address…'
                : fulfillment === 'delivery' && deliveryCheck === 'invalid'
                  ? `That address is outside our ${DELIVERY_RADIUS_MILES}-mile delivery area — switch to pickup to continue`
                  : fulfillment === 'delivery' && deliveryCheck === 'idle'
                    ? 'Checking whether we deliver to that address…'
                    : // The pickup counterpart. Sits last for the same reason
                      // the delivery lines do — the slot picker renders below
                      // payment — and is the visible half of closing the
                      // slotless-pickup hole; the server refuses it too.
                      fulfillment === 'pickup' && !pickupSlot.trim()
                      ? 'Choose a pickup time to continue'
                      : '';

  const handlePlaceOrder = async () => {
    if (!canSubmit || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);

    // The slot rides on the location string because the admin order drawer
    // reads that field and has no other view of it. Separator is shared with
    // the reader so the two can't drift.
    const pickupLocation =
      fulfillment === 'pickup'
        ? `${pickupSlot ? `${pickupSlot}${PICKUP_LOCATION_SEPARATOR}` : ''}${shopAddress}`
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
          // Phase 4 — only send the opt-in flag when the saved-card path is
          // also engaged. The server re-validates eligibility (variable-
          // weight line on the cart, Stripe path, signed-in user) before
          // honoring it, but the UI shouldn't send a request that's
          // obviously going to be ignored.
          ...(autoSettleAtPickup &&
          isLoggedIn &&
          paymentMethod === 'stripe' &&
          (saveCard || selectedSavedCardId)
            ? { autoSettleAtPickup: true }
            : {}),
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        toast.error(data.message ?? 'Something went wrong. Please try again.');
        releaseSubmitGuard();
        return;
      }

      const data = (await res.json()) as { url?: unknown };
      if (typeof data.url !== 'string' || !data.url) {
        toast.error('Could not start payment. Please try again.');
        releaseSubmitGuard();
        return;
      }
      // Hand off to Stripe's hosted Checkout (or the local stub when no
      // STRIPE_SECRET_KEY is set). Cart reset happens after the customer
      // returns to the confirmation page via ConfirmationCartReset.
      //
      // The guard stays engaged on purpose. Navigation is in flight but the
      // page is still interactive for a moment, and releasing here hands a
      // late click a second session against an order already going to pay.
      window.location.assign(data.url);
    } catch (err) {
      console.error('[PlaceOrderButton] checkout session failed', err);
      toast.error('Something went wrong. Please try again.');
      releaseSubmitGuard();
    }
  };

  return (
    <div className='mt-2'>
      <button
        type='button'
        onClick={handlePlaceOrder}
        disabled={!canSubmit}
        aria-disabled={!canSubmit}
        className={`group inline-flex w-full items-center justify-center gap-3 rounded-full px-7 py-4 text-[15px] font-medium tracking-[0.02em] transition-[background-color,transform,opacity] duration-300 motion-reduce:transition-none ${
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
        {isLoading ? (
          <SpinnerIcon className='h-3.5 w-3.5' />
        ) : canSubmit ? (
          <ArrowIcon className='h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0' />
        ) : null}
      </button>
      {/* Announced so a screen-reader user tracks the same progress a sighted
          one reads off the greyed button.

          Reserves one line, not the two the longest hint wraps to below
          375px. Reserving two would hold 40px of empty space under the CTA
          on every checkout where nothing is missing — which is most of them —
          to spare the Terms line beneath a one-off nudge on narrow phones. */}
      <p
        aria-live='polite'
        className='mt-3 min-h-5 text-center text-[13px] text-oxblood'
      >
        {blockingHint}
      </p>
    </div>
  );
};

export default PlaceOrderButton;
