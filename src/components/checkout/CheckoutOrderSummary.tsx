'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

import { useCartContext } from '@/context/CartContext';
import { useCheckoutContext } from '@/context/CheckoutContext';
import { validatePromoCode } from '@/actions/checkout';

import { computeTotals, DELIVERY_FEE } from '@/lib/pricing';

const PROMO_SUGGESTIONS = ['ELITECUTS10', 'FIRSTORDER', 'NORTHPARK'];

type PromoStatus = 'idle' | 'valid' | 'invalid';

const CheckoutOrderSummary = () => {
  const { cartItems, setItemQuantity } = useCartContext();
  const { data: session } = useSession();
  const { fulfillment, promoDiscount, setPromoDiscount } = useCheckoutContext();
  const isLoggedIn = Boolean(session?.user);
  const [promo, setPromo] = useState('');
  const [promoStatus, setPromoStatus] = useState<PromoStatus>('idle');
  const [appliedLabel, setAppliedLabel] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const itemCount = cartItems.reduce((acc, line) => acc + line.quantity, 0);
  const isDelivery = fulfillment === 'delivery';

  const totals = useMemo(
    () => computeTotals(cartItems, {
      isLoggedIn,
      promoDiscount,
      deliveryFee: isDelivery ? DELIVERY_FEE : 0,
    }),
    [cartItems, isLoggedIn, isDelivery, promoDiscount],
  );

  const onApplyPromo = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const code = promo.trim().toUpperCase();
    if (!code) return;
    const subtotal = cartItems.reduce((acc, l) => acc + l.price * l.quantity, 0);
    const result = await validatePromoCode(code, subtotal);
    if (!result.valid) {
      setPromoStatus('invalid');
      setPromoDiscount(0);
      setAppliedLabel('');
      return;
    }
    setPromoDiscount(result.amount);
    setAppliedLabel(result.label);
    setPromoStatus('valid');
  };

  const onRemovePromo = () => {
    setPromoDiscount(0);
    setAppliedLabel('');
    setPromoStatus('idle');
    setPromo('');
  };

  return (
    <div>
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
            const lineTotal = (line.price * line.quantity).toFixed(2);
            return (
              <div
                key={line.product._id}
                className='grid grid-cols-[56px_1fr_auto] items-center gap-3.5 border-b border-line-soft py-3.5'
              >
                <div className='relative h-17.5 w-14 overflow-hidden rounded-sm bg-cream-deep'>
                  <Image
                    src={`/images/products/${line.product.images?.[0] ?? ''}`}
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
                      {line.quantity} × ${line.price.toFixed(2)}
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

        {promoStatus !== 'valid' && (
          <div className='mt-5 mb-3 flex flex-wrap gap-2'>
            {PROMO_SUGGESTIONS.map((code) => (
              <button
                key={code}
                type='button'
                onClick={() => { setPromo(code); setPromoStatus('idle'); }}
                className='inline-flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 font-mono text-[11px] tracking-[0.04em] text-ink-soft transition-colors duration-200 hover:border-ink hover:text-ink'
              >
                <span className='text-camel'>+</span>
                {code}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onApplyPromo} className={promoStatus === 'valid' ? 'mt-5' : ''}>
          <div className='flex gap-2'>
            <input
              type='text'
              value={promo}
              onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoStatus('idle'); }}
              placeholder='Promo code'
              aria-label='Promo code'
              disabled={promoStatus === 'valid'}
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
                className='rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-cream transition-colors duration-300 hover:bg-oxblood motion-reduce:transition-none'
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
              {appliedLabel} applied
            </p>
          )}
          {promoStatus === 'invalid' && (
            <p className='mt-2 flex items-center gap-1.5 text-[12px] text-oxblood'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-3 w-3 shrink-0'>
                <circle cx='12' cy='12' r='10' /><line x1='4.93' y1='4.93' x2='19.07' y2='19.07' />
              </svg>
              Invalid code — check your promo and try again
            </p>
          )}
        </form>

        <dl className='mt-5 space-y-2 border-t border-line-soft pt-5'>
          <div className='flex items-baseline justify-between text-[14px]'>
            <dt className='text-ink-soft'>Subtotal</dt>
            <dd className='font-mono text-[13px]'>${totals.subtotal.toFixed(2)}</dd>
          </div>
          <div className='flex items-baseline justify-between text-[14px]'>
            <dt className='text-ink-soft'>{isDelivery ? 'Delivery' : 'Pickup'}</dt>
            <dd className='font-mono text-[13px]'>
              {isDelivery ? `$${DELIVERY_FEE.toFixed(2)}` : 'Free'}
            </dd>
          </div>
          {isLoggedIn && (
            <div className='flex items-baseline justify-between text-[14px]'>
              <dt className='text-ink-soft'>Member discount (5%)</dt>
              <dd className='font-mono text-[13px] text-green'>
                −${totals.memberDiscount.toFixed(2)}
              </dd>
            </div>
          )}
          {promoDiscount > 0 && (
            <div className='flex items-baseline justify-between text-[14px]'>
              <dt className='text-ink-soft'>Promo — {appliedLabel}</dt>
              <dd className='font-mono text-[13px] text-green'>
                −${promoDiscount.toFixed(2)}
              </dd>
            </div>
          )}
          <div className='flex items-baseline justify-between text-[14px]'>
            <dt className='text-ink-soft'>Estimated tax</dt>
            <dd className='font-mono text-[13px]'>${totals.tax.toFixed(2)}</dd>
          </div>
        </dl>

        <div className='mt-3 flex items-baseline justify-between border-t border-line pt-3.5'>
          <span className='font-display text-[18px] font-medium tracking-tight'>
            Total
          </span>
          <span className='font-display text-[28px] font-medium tracking-tight'>
            ${totals.total.toFixed(2)}
            <em className='ml-1 text-[12px] font-normal not-italic text-muted'>
              USD
            </em>
          </span>
        </div>
      </div>

      <div className='rounded-sm border border-line-soft bg-paper px-6 py-4'>
        <div className='flex items-center gap-3 border-b border-line-soft py-2 text-[13px] text-ink-soft'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-3.5 w-3.5 shrink-0 text-green'>
            <rect x='3' y='11' width='18' height='11' rx='2' />
            <path d='M7 11V7a5 5 0 0110 0v4' />
          </svg>
          <span><strong className='font-medium text-ink'>Secure</strong> · 256-bit SSL encryption</span>
        </div>
        <div className='flex items-center gap-3 border-b border-line-soft py-2 text-[13px] text-ink-soft'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-3.5 w-3.5 shrink-0 text-green'>
            <polyline points='20 6 9 17 4 12' />
          </svg>
          <span><strong className='font-medium text-ink'>Hand-cut</strong> after you order — never sitting</span>
        </div>
        <div className='flex items-center gap-3 py-2 text-[13px] text-ink-soft'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-3.5 w-3.5 shrink-0 text-green'>
            <circle cx='12' cy='12' r='9' />
            <polyline points='12 6 12 12 16 14' />
          </svg>
          <span><strong className='font-medium text-ink'>~1 hour</strong> · pickup-ready notification</span>
        </div>
      </div>
    </div>
  );
};

export default CheckoutOrderSummary;
