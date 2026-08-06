'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

import { useCartContext } from '@/context/CartContext';
import { useCheckoutContext } from '@/context/CheckoutContext';
import { computeTotals, DELIVERY_FEE, fmtPrice, MEMBER_DISCOUNT_RATE } from '@/lib/checkout/totals';
import { findPriceChanges, repriceLines } from '@/lib/cart/reprice';
import { formatCartCount } from '@/lib/cart/counts';
import CheckoutTrustStrip from '@/components/checkout/CheckoutTrustStrip';
import CheckoutRewardsRedeem from '@/components/checkout/CheckoutRewardsRedeem';
import CheckoutPublicPromos from '@/components/checkout/CheckoutPublicPromos';
import { productImageSrc } from '@/lib/format';
import type { PromoFailureReason } from '@/models/Promo';
import { PROMO_FAILURE_MESSAGES } from '@/lib/promos/constants';
import CheckIcon from '@/components/ui/icons/CheckIcon';
import MinusIcon from '@/components/ui/icons/MinusIcon';
import PlusIcon from '@/components/ui/icons/PlusIcon';

type PromoStatus = 'idle' | 'valid' | 'invalid';

const CheckoutOrderSummary = () => {
  const { cartItems, setItemQuantity } = useCartContext();
  const { data: session } = useSession();
  const { state, dispatch } = useCheckoutContext();
  const {
    fulfillment,
    promoCode,
    promoDiscount,
    promoExcludesMember,
    pointsDiscount,
  } = state;

  // `applyCode` captures state when it is created, so by the time its request
  // resolves the closure still says "no points applied" even if the customer
  // applied some while it was in flight — which is the exact window the
  // exclusion has to cover. This ref carries the live value into the callback.
  const pointsDiscountRef = useRef(pointsDiscount);
  useEffect(() => {
    pointsDiscountRef.current = pointsDiscount;
  }, [pointsDiscount]);

  // The subtotal the applied promo was last validated against — see the
  // revalidation effect below.
  const promoSubtotalRef = useRef<number | null>(null);

  const isLoggedIn = Boolean(session?.user);
  const [promo, setPromo] = useState('');
  const [promoStatus, setPromoStatus] = useState<PromoStatus>(
    promoDiscount > 0 ? 'valid' : 'idle',
  );
  const [promoError, setPromoError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const isDelivery = fulfillment === 'delivery';
  const pointsApplied = pointsDiscount > 0;

  // Cart lines carry the price snapshotted when they were added; the order
  // builder re-reads the current product and calls that authoritative. If an
  // admin repriced a cut in between, those two disagree — and until now the
  // customer was shown the snapshot and charged the other one, with nothing
  // reconciling them. The server stays authoritative; this makes the summary
  // agree with it, and `priceChanges` says so out loud below.
  //
  // Returns the same array when nothing moved, so the memo below doesn't churn
  // on every render of an ordinary cart.
  const pricedItems = useMemo(() => repriceLines(cartItems), [cartItems]);
  const priceChanges = useMemo(() => findPriceChanges(cartItems), [cartItems]);

  const totals = useMemo(
    () => computeTotals(pricedItems, {
      isLoggedIn,
      excludesMember: promoExcludesMember,
      promoDiscount,
      pointsDiscount,
      deliveryFee: isDelivery ? DELIVERY_FEE : 0,
    }),
    [pricedItems, isLoggedIn, promoExcludesMember, isDelivery, promoDiscount, pointsDiscount],
  );

  // Pre-discount, so applying a promo can't feed back into the effect that
  // watches this and re-trigger itself.
  const subtotalCents = Math.round(totals.subtotal * 100);

  // Any variable-weight line (per_lb / whole_item_by_weight) flips the
  // total to "Estimated total" with the matching disclaimer below.
  const anyEstimated = cartItems.some((l) => l.product.isEstimatedPrice);

  // Shared apply path. Both the form submit and a chip tap route through
  // here so a chip-applied code goes through the exact same validate +
  // dispatch + UI states as a manually-typed one.
  const applyCode = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    setPromo(code);
    const subtotalCents = Math.round(
      pricedItems.reduce((acc, l) => acc + l.price * l.quantity, 0) * 100,
    );
    // Remember what this answer was computed against, so the effect below can
    // tell "already correct for this cart" from "needs recomputing".
    promoSubtotalRef.current = subtotalCents;

    try {
      const res = await fetch('/api/promos/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotalCents, contactEmail: state.contactEmail }),
      });
      const data = (await res.json()) as
        | { valid: true; code: string; discountCents: number; promoId: string; excludesPoints: boolean; excludesMember: boolean }
        | { valid: false; reason: PromoFailureReason }
        | { message: string };

      if (!res.ok || !('valid' in data)) {
        setPromoStatus('invalid');
        setPromoError("Couldn't apply that code — try again");
        dispatch({ type: 'SET_PROMO', payload: { code: '', amount: 0 } });
        return;
      }
      if (!data.valid) {
        setPromoStatus('invalid');
        setPromoError(PROMO_FAILURE_MESSAGES[data.reason] ?? "Couldn't apply that code");
        dispatch({ type: 'SET_PROMO', payload: { code: '', amount: 0 } });
        return;
      }
      // The two exclusions are enforced by disabling each input while the
      // other is applied, which is a render-time rule and so has a hole: the
      // points apply is synchronous, so applying points while this request is
      // still in flight lands both. Re-check against live state at the moment
      // the answer arrives. Points win because applying them was the more
      // recent deliberate action; the server refuses the pair either way.
      if (data.excludesPoints && pointsDiscountRef.current > 0) {
        setPromoStatus('invalid');
        setPromoError(
          "That code can't be combined with reward points — remove your points to use it",
        );
        dispatch({ type: 'SET_PROMO', payload: { code: '', amount: 0 } });
        return;
      }

      dispatch({
        type: 'SET_PROMO',
        payload: {
          code: data.code,
          amount: data.discountCents / 100,
          promoId: data.promoId,
          excludesPoints: data.excludesPoints,
          excludesMember: data.excludesMember,
        },
      });
      setPromoError('');
      setPromoStatus('valid');
    } catch {
      setPromoStatus('invalid');
      setPromoError("Couldn't reach the server — try again");
      dispatch({ type: 'SET_PROMO', payload: { code: '', amount: 0 } });
    }
  };

  // A promo's dollar value is computed against the subtotal at the moment it
  // is applied — and the Edit control right above this summary can change that
  // subtotal afterwards. Nothing re-ran the calculation, so a 10% code applied
  // at $100 kept reading "−$10.00" after a $40 line came out, while the server
  // recomputed −$6 at place-order: the customer was charged more than the
  // button in front of them said.
  //
  // Re-validated rather than recomputed locally, because whether the code is
  // still eligible at the new subtotal (minimum-spend rules) is the server's
  // answer to give.
  const revalidatePromo = useEffectEvent(() => void applyCode(promoCode));
  useEffect(() => {
    if (!promoCode || promoStatus !== 'valid') return;
    if (promoSubtotalRef.current === subtotalCents) return;
    // Debounced so a run of stepper clicks settles into one request.
    const id = setTimeout(() => revalidatePromo(), 400);
    return () => clearTimeout(id);
  }, [subtotalCents, promoCode, promoStatus]);

  const onApplyPromo = (e: { preventDefault(): void }) => {
    e.preventDefault();
    void applyCode(promo);
  };

  const onRemovePromo = () => {
    dispatch({ type: 'SET_PROMO', payload: { code: '', amount: 0 } });
    setPromoStatus('idle');
    setPromoError('');
    setPromo('');
  };

  // Cap that matches the server's: subtotal minus the other discounts (the
  // points-redemption itself isn't subtracted from this — it's the budget the
  // redemption gets to spend against).
  const discountable = Math.max(0, totals.subtotal - totals.memberDiscount - promoDiscount);

  return (
    <div>
      <CheckoutRewardsRedeem subtotal={totals.subtotal} maxDiscountable={discountable} />
      <div className='mb-3.5 rounded-sm border border-line-soft bg-paper px-8 py-7'>
        <p className='mb-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted'>
          → Order summary
        </p>

        <div className='mb-4 flex items-baseline justify-between gap-2'>
          <span className='font-display text-[22px] font-medium tracking-tight'>
            {formatCartCount(cartItems)}{' '}
            <em className='text-[14px] font-normal text-muted'>· in your cart</em>
          </span>
          <button
            type='button'
            onClick={() => setIsEditing((v) => !v)}
            className='border-b border-line pb-px text-[12px] font-medium tracking-[0.04em] text-ink-soft transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none'
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        </div>

        {/* Fulfillment badge */}
        <div className='mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1.5'>
          <svg
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
            aria-hidden='true'
            className='h-3 w-3 shrink-0 text-muted'
          >
            {isDelivery ? (
              <path d='M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z' />
            ) : (
              <>
                <path d='M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' />
                <polyline points='9 22 9 12 15 12 15 22' />
              </>
            )}
          </svg>
          <span className='font-mono text-[11px] tracking-[0.04em] text-ink-soft'>
            {isDelivery ? 'LOCAL DELIVERY · $8' : 'PICKUP · FREE'}
          </span>
        </div>

        <div className='border-t border-line-soft'>
          {pricedItems.map((line) => {
            const lineTotal = fmtPrice(line.price * line.quantity);
            return (
              <div
                key={line.product._id}
                className='grid grid-cols-[56px_1fr_auto] items-center gap-3.5 border-b border-line-soft py-3.5'
              >
                <div className='relative h-17.5 w-14 overflow-hidden rounded-sm bg-cream-deep'>
                  <Image
                    src={productImageSrc((line.product.images as string[] | undefined)?.[0] ?? '') ?? ''}
                    alt=''
                    fill
                    sizes='56px'
                    className='object-cover'
                  />
                </div>
                <div className='min-w-0'>
                  <p className={`font-display text-[14px] font-medium leading-tight tracking-tight ${isEditing ? 'mb-2' : 'mb-1'}`}>
                    {line.product.name}
                  </p>
                  {!isEditing && (
                    <p className='font-mono text-[11px] tracking-[0.02em] text-muted'>
                      {line.quantity} × {line.product.displayPriceLabel ?? `$${fmtPrice(line.price)}`}
                    </p>
                  )}
                  {isEditing && (
                  <div className='inline-flex items-center overflow-hidden rounded-full border border-line bg-cream'>
                    <button
                      type='button'
                      onClick={() => void setItemQuantity(line.product._id, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                      aria-label='Decrease quantity'
                      className='grid h-6 w-6 place-items-center text-muted transition-colors duration-200 hover:bg-cream-deep disabled:cursor-not-allowed disabled:opacity-30'
                    >
                      <MinusIcon className='h-2.5 w-2.5' />
                    </button>
                    <span className='min-w-6 text-center font-mono text-[12px] text-ink'>
                      {line.quantity}
                    </span>
                    <button
                      type='button'
                      onClick={() => void setItemQuantity(line.product._id, line.quantity + 1)}
                      aria-label='Increase quantity'
                      className='grid h-6 w-6 place-items-center text-muted transition-colors duration-200 hover:bg-cream-deep'
                    >
                      <PlusIcon className='h-2.5 w-2.5' />
                    </button>
                  </div>
                  )}
                </div>
                <div className='font-display text-[14px] font-medium'>
                  ${lineTotal}
                </div>
              </div>
            );
          })}

          {cartItems.length === 0 && (
            <div className='py-8 text-center text-[13px] text-muted'>
              Your cart is empty.
            </div>
          )}
        </div>

        {promoStatus !== 'valid' && !pointsApplied && (
          <div className='mt-5'>
            <CheckoutPublicPromos onApply={applyCode} />
          </div>
        )}

        <form onSubmit={onApplyPromo} className={promoStatus !== 'valid' && !pointsApplied ? '' : 'mt-5'}>
          <div className='flex gap-2'>
            <input
              type='text'
              value={promo}
              onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoStatus('idle'); setPromoError(''); }}
              placeholder='Promo code'
              aria-label='Promo code'
              disabled={promoStatus === 'valid' || pointsApplied}
              className={`flex-1 rounded-full border px-4 py-2.5 text-[13px] text-ink outline-none placeholder:text-muted transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                promoStatus === 'valid'
                  ? 'border-green bg-green/5'
                  : promoStatus === 'invalid'
                    ? 'border-oxblood bg-cream focus:border-oxblood'
                    : 'border-line bg-cream focus:border-ink'
              }`}
            />
            {promoStatus === 'valid' ? (
              <button
                type='button'
                onClick={onRemovePromo}
                className='rounded-full border border-line bg-cream px-5 py-2.5 text-[13px] font-medium text-ink-soft transition-colors duration-300 hover:border-oxblood hover:text-oxblood motion-reduce:transition-none'
              >
                Remove
              </button>
            ) : (
              <button
                type='submit'
                disabled={pointsApplied}
                className='rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-cream transition-colors duration-300 hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none'
              >
                Apply
              </button>
            )}
          </div>

          {promoStatus === 'valid' && (
            <p className='mt-2 flex items-center gap-1.5 text-[12px] text-green'>
              <CheckIcon className='h-3 w-3 shrink-0' />
              {promoCode} applied · −${fmtPrice(promoDiscount)}
            </p>
          )}
          {promoStatus === 'invalid' && (
            <p className='mt-2 flex items-center gap-1.5 text-[12px] text-oxblood'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-3 w-3 shrink-0'>
                <circle cx='12' cy='12' r='10' /><line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
              </svg>
              {promoError || "Couldn't apply that code"}
            </p>
          )}
          {pointsApplied && promoStatus !== 'valid' && (
            <p className='mt-2 text-[12px] text-muted'>
              Remove points to apply a promo code instead.
            </p>
          )}
        </form>

        {/* Shown only when the shop's price for a line moved after it was added
            to the cart. The totals below are already the new ones — the server
            was always going to charge these — so this explains a number that
            would otherwise have silently changed under the customer between the
            cart page and here.
            `role="status"` rather than `alert`: it is informational and the
            customer is not blocked, but it must still reach a screen reader,
            because the whole point is that the figure moved without their
            input. */}
        {priceChanges.length > 0 && (
          <div
            role='status'
            className='mt-5 rounded-sm border border-camel/40 bg-camel/8 px-4 py-3'
          >
            <p className='text-[13px] font-medium text-ink'>
              {priceChanges.length === 1
                ? 'A price changed since you added it'
                : `${priceChanges.length} prices changed since you added them`}
            </p>
            <ul className='mt-1.5 space-y-1'>
              {priceChanges.map((change) => (
                <li key={change.productId} className='text-[12px] leading-relaxed text-ink-soft'>
                  {change.name} — was{' '}
                  <span className='font-mono line-through'>${fmtPrice(change.was)}</span>, now{' '}
                  <span className='font-mono'>${fmtPrice(change.now)}</span>
                </li>
              ))}
            </ul>
            <p className='mt-1.5 text-[12px] leading-relaxed text-muted'>
              Your total below reflects the new price.
            </p>
          </div>
        )}

        <dl className='mt-5 space-y-2 border-t border-line-soft pt-5'>
          <div className='flex items-baseline justify-between text-[14px]'>
            <dt className='text-ink-soft'>Subtotal</dt>
            <dd className='font-mono text-[13px]'>${fmtPrice(totals.subtotal)}</dd>
          </div>
          <div className='flex items-baseline justify-between text-[14px]'>
            <dt className='text-ink-soft'>{isDelivery ? 'Delivery' : 'Pickup'}</dt>
            <dd className='font-mono text-[13px]'>
              {isDelivery ? `$${fmtPrice(DELIVERY_FEE)}` : 'Free'}
            </dd>
          </div>
          {isLoggedIn && totals.memberDiscount > 0 && (
            <div className='flex items-baseline justify-between text-[14px]'>
              {/* Derived, not hardcoded — the cart page and drawer both read
                  the constant, and this was the last surface where changing
                  MEMBER_DISCOUNT_RATE would have left a stale "5%" on screen
                  beside a different number. */}
              <dt className='text-ink-soft'>
                Member discount ({MEMBER_DISCOUNT_RATE * 100}%)
              </dt>
              <dd className='font-mono text-[13px] text-green'>
                −${fmtPrice(totals.memberDiscount)}
              </dd>
            </div>
          )}
          {isLoggedIn && promoExcludesMember && (
            <div className='flex items-baseline justify-between text-[12px] text-muted'>
              <dt>Member discount not combinable with this promo</dt>
              <dd />
            </div>
          )}
          {promoDiscount > 0 && (
            <div className='flex items-baseline justify-between text-[14px]'>
              <dt className='text-ink-soft'>Promo · {promoCode}</dt>
              <dd className='font-mono text-[13px] text-green'>
                −${fmtPrice(promoDiscount)}
              </dd>
            </div>
          )}
          {pointsDiscount > 0 && (
            <div className='flex items-baseline justify-between text-[14px]'>
              <dt className='text-ink-soft'>Points redeemed</dt>
              <dd className='font-mono text-[13px] text-green'>
                −${fmtPrice(pointsDiscount)}
              </dd>
            </div>
          )}
          <div className='flex items-baseline justify-between text-[14px]'>
            <dt className='text-ink-soft'>Estimated tax</dt>
            <dd className='font-mono text-[13px]'>${fmtPrice(totals.tax)}</dd>
          </div>
        </dl>

        <div className='mt-3 flex items-baseline justify-between border-t border-line pt-3.5'>
          <span className='font-display text-[18px] font-medium tracking-tight'>
            {anyEstimated ? 'Estimated total' : 'Total'}
          </span>
          <span className='font-display text-[28px] font-medium tracking-tight'>
            ${fmtPrice(totals.total)}
            <em className='ml-1 text-[12px] font-normal not-italic text-muted'>
              USD
            </em>
          </span>
        </div>
        {/* Matches the cart page and the cart drawer word for word. This was
            the last site still saying "items"/"actual weight" after both cart
            surfaces moved to "cuts"/"once they're weighed" — a shopper reads
            all three within a minute of each other. */}
        {anyEstimated && (
          <p className='mt-2 text-[12px] leading-relaxed text-muted'>
            Some cuts are priced by weight — the final price may vary slightly
            once they&apos;re weighed.
          </p>
        )}
      </div>

      <CheckoutTrustStrip />
    </div>
  );
};

export default CheckoutOrderSummary;
