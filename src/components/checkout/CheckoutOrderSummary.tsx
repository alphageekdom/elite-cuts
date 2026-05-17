'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

import { useCartContext } from '@/context/CartContext';
import { useCheckoutContext } from '@/context/CheckoutContext';
import { computeTotals, DELIVERY_FEE, fmtPrice } from '@/lib/pricing';
import CheckoutTrustStrip from '@/components/checkout/CheckoutTrustStrip';
import CheckoutRewardsRedeem from '@/components/checkout/CheckoutRewardsRedeem';
import { productImageSrc } from '@/lib/format';
import type { PromoFailureReason } from '@/models/Promo';

type PromoStatus = 'idle' | 'valid' | 'invalid';

const PROMO_FAILURE_MESSAGES: Record<PromoFailureReason, string> = {
  not_found: "We don't recognize that code",
  disabled: 'This code is no longer available',
  not_started: 'This code is not active yet',
  expired: 'This code has expired',
  exhausted: 'This code has reached its usage limit',
  customer_limit: "You've already used this code",
  min_subtotal: "Your order doesn't meet the minimum for this code",
  first_order_only: 'This code is for first orders only',
};

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
  const isLoggedIn = Boolean(session?.user);
  const [promo, setPromo] = useState('');
  const [promoStatus, setPromoStatus] = useState<PromoStatus>(
    promoDiscount > 0 ? 'valid' : 'idle',
  );
  const [promoError, setPromoError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const itemCount = cartItems.reduce((acc, line) => acc + line.quantity, 0);
  const isDelivery = fulfillment === 'delivery';
  const pointsApplied = pointsDiscount > 0;

  const totals = useMemo(
    () => computeTotals(cartItems, {
      isLoggedIn,
      excludesMember: promoExcludesMember,
      promoDiscount,
      pointsDiscount,
      deliveryFee: isDelivery ? DELIVERY_FEE : 0,
    }),
    [cartItems, isLoggedIn, promoExcludesMember, isDelivery, promoDiscount, pointsDiscount],
  );

  const onApplyPromo = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const code = promo.trim().toUpperCase();
    if (!code) return;
    const subtotalCents = Math.round(
      cartItems.reduce((acc, l) => acc + l.price * l.quantity, 0) * 100,
    );

    try {
      const res = await fetch('/api/promos/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotalCents }),
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
            {itemCount} cut{itemCount !== 1 ? 's' : ''}{' '}
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
          {cartItems.map((line) => {
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
                      {line.quantity} × ${fmtPrice(line.price)}
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
                      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2.5} className='h-2.5 w-2.5' aria-hidden='true'>
                        <line x1='5' y1='12' x2='19' y2='12' />
                      </svg>
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
                      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2.5} className='h-2.5 w-2.5' aria-hidden='true'>
                        <line x1='12' y1='5' x2='12' y2='19' />
                        <line x1='5' y1='12' x2='19' y2='12' />
                      </svg>
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

        <form onSubmit={onApplyPromo} className='mt-5'>
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
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2.5} aria-hidden='true' className='h-3 w-3 shrink-0'>
                <polyline points='20 6 9 17 4 12' />
              </svg>
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
              <dt className='text-ink-soft'>Member discount (5%)</dt>
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
            Total
          </span>
          <span className='font-display text-[28px] font-medium tracking-tight'>
            ${fmtPrice(totals.total)}
            <em className='ml-1 text-[12px] font-normal not-italic text-muted'>
              USD
            </em>
          </span>
        </div>
      </div>

      <CheckoutTrustStrip />
    </div>
  );
};

export default CheckoutOrderSummary;
