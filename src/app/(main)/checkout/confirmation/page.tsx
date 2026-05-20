import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import connectDB from '@/config/database';
import OrderModel from '@/models/Order';
import { getSessionUser } from '@/lib/getSessionUser';
import { formatMoney, productImageSrc } from '@/lib/format';
import { DELIVERY_FEE } from '@/lib/pricing';
import { getShopSettings, formatShopAddress } from '@/lib/shopSettings';
import {
  orderHasRealizedDifference,
  realizedOrderTotal,
} from '@/lib/order-line';
import CheckoutStepRail from '@/components/checkout/CheckoutStepRail';
import ConfirmationCartReset from '@/components/checkout/ConfirmationCartReset';

export const metadata: Metadata = {
  title: 'Order Confirmed · EliteCuts',
};

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function ConfirmationPage({ searchParams }: Props) {
  const { orderId } = await searchParams;
  if (!orderId) redirect('/cart');

  const sessionUser = await getSessionUser();
  const shopAddress = formatShopAddress(await getShopSettings());

  await connectDB();

  // Guest orders have no `user`, so we can't gate the lookup by session.
  // The 24-char ObjectId is the access token — passed by router.push right
  // after order creation. For orders that *do* have a user, enforce ownership
  // by treating someone else's order as "not found" rather than bouncing the
  // caller to login (they may already be signed in as a different user).
  const order = await OrderModel.findById(orderId).lean();

  if (!order) redirect('/cart');
  if (order.user && order.user.toString() !== sessionUser?.userId) {
    redirect('/cart');
  }

  const isGuestOrder = !order.user;
  const displayName = order.contactName ?? order.guestContact?.name ?? '—';
  const displayEmail = order.contactEmail ?? order.guestContact?.email ?? '—';
  const displayPhone = order.contactPhone ?? order.guestContact?.phone;

  const shortId = String(order._id).slice(-8).toUpperCase();
  const isPickup = order.fulfillmentType !== 'delivery';

  // "Final at pickup" copy — only renders once an admin has weighed at
  // least one variable-weight line and its realized total differs from
  // the estimate. Fresh orders read identically to pre-Phase-3.
  const showRealizedAtPickup = orderHasRealizedDifference(order.orderItems);
  const realizedTotalAtPickup = realizedOrderTotal({
    lines: order.orderItems,
    subtotal: order.subtotal,
    tax: order.tax,
    memberDiscount: order.memberDiscount,
    promoDiscount: order.promoDiscount,
    pointsRedemptionValueCents: order.pointsRedemptionValueCents,
    deliveryFee: isPickup ? 0 : DELIVERY_FEE,
  });

  return (
    <div className='min-h-screen bg-cream'>
      <ConfirmationCartReset />
      <CheckoutStepRail currentStep={3} />

      <div className='mx-auto max-w-300 px-6 pb-24 sm:px-8'>
        {/* Hero */}
        <div className='mb-12 pt-12 text-center'>
          <div className='mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-green/15 text-green'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-7 w-7'>
              <polyline points='20 6 9 17 4 12' />
            </svg>
          </div>
          <p className='mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted'>
            Order placed
          </p>
          <h1 className='font-display text-[clamp(36px,5vw,60px)] font-normal leading-none tracking-tight'>
            You&apos;re all <em className='text-oxblood'>set.</em>
          </h1>
          <p className='mx-auto mt-3.5 max-w-[42ch] text-[15px] text-ink-soft'>
            We&apos;ve sent a confirmation to your email. You&apos;ll get a pickup-ready notification when your order is hand-cut and waiting for you.
          </p>
        </div>

        <div className='mx-auto max-w-170 space-y-5'>
          {/* Order ref */}
          <div className='flex items-center justify-between rounded-sm border border-line-soft bg-paper px-6 py-5'>
            <div>
              <p className='mb-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted'>
                Order reference
              </p>
              <p className='font-mono text-[20px] font-medium tracking-widest text-ink'>
                #{shortId}
              </p>
            </div>
            <span className='rounded-full bg-green/10 px-3.5 py-1.5 text-[12px] font-medium text-green'>
              Confirmed
            </span>
          </div>

          {/* Contact + fulfillment */}
          <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
            {/* Contact */}
            <div className='rounded-sm border border-line-soft bg-paper px-6 py-5'>
              <p className='mb-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted'>
                Contact
              </p>
              <p className='text-[15px] font-medium text-ink'>{displayName}</p>
              <p className='mt-1 text-[13px] text-ink-soft'>{displayEmail}</p>
              {displayPhone && (
                <p className='mt-0.5 text-[13px] text-ink-soft'>{displayPhone}</p>
              )}
            </div>

            {/* Fulfillment */}
            <div className='rounded-sm border border-line-soft bg-paper px-6 py-5'>
              <p className='mb-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted'>
                {isPickup ? 'Pickup details' : 'Delivery address'}
              </p>
              {isPickup ? (
                <>
                  <p className='text-[15px] font-medium text-ink'>
                    {order.pickupSlot ? `Slot: ${order.pickupSlot}` : 'Today'}
                  </p>
                  <p className='mt-1 text-[13px] text-ink-soft'>{shopAddress}</p>
                  <p className='mt-1 font-mono text-[11px] tracking-[0.06em] text-green'>
                    FREE · ~1 HOUR
                  </p>
                </>
              ) : (
                <>
                  <p className='text-[15px] font-medium text-ink'>
                    {order.deliveryAddress?.address1}
                  </p>
                  {order.deliveryAddress?.address2 && (
                    <p className='text-[13px] text-ink-soft'>{order.deliveryAddress.address2}</p>
                  )}
                  <p className='text-[13px] text-ink-soft'>
                    {[
                      order.deliveryAddress?.city,
                      order.deliveryAddress?.state,
                      order.deliveryAddress?.zip,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p className='mt-1 font-mono text-[11px] tracking-[0.06em] text-muted'>
                    $8 · SAME DAY
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className='rounded-sm border border-line-soft bg-paper px-6 py-5'>
            <p className='mb-3.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted'>
              Payment
            </p>
            <div className='flex items-baseline justify-between gap-4'>
              <p className='text-[15px] font-medium text-ink'>
                {order.paymentMethod}
              </p>
              <p
                className={`font-mono text-[11px] tracking-[0.06em] ${
                  order.paymentResult?.status === 'Completed'
                    ? 'text-green'
                    : 'text-muted'
                }`}
              >
                {(order.paymentResult?.status ?? 'PENDING').toUpperCase()}
              </p>
            </div>
            {order.paymentResult?.paymentIntentId && (
              <p className='mt-1.5 font-mono text-[12px] text-ink-soft'>
                {order.paymentResult.paymentIntentId.slice(0, 14)}…
              </p>
            )}
          </div>

          {/* Order items */}
          <div className='rounded-sm border border-line-soft bg-paper px-6 py-5'>
            <p className='mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted'>
              Items ({order.orderItems.reduce((s, i) => s + i.qty, 0)})
            </p>
            <ul className='divide-y divide-line-soft'>
              {order.orderItems.map((item, i) => {
                const imgSrc = productImageSrc(item.image);
                return (
                <li key={i} className='flex items-center gap-4 py-3.5 first:pt-0 last:pb-0'>
                  {imgSrc && (
                    <div className='relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-cream-deep'>
                      <Image
                        src={imgSrc}
                        alt={item.name}
                        fill
                        className='object-cover'
                        sizes='56px'
                      />
                    </div>
                  )}
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-[14px] font-medium text-ink'>{item.name}</p>
                    <p className='text-[12px] text-muted'>
                      {item.productType} · qty {item.qty}
                    </p>
                  </div>
                  <p className='shrink-0 font-mono text-[14px] text-ink'>
                    {formatMoney(item.price * item.qty)}
                  </p>
                </li>
                );
              })}
            </ul>

            {/* Totals */}
            <div className='mt-5 space-y-2 border-t border-line-soft pt-5'>
              <div className='flex justify-between text-[13px] text-ink-soft'>
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotal)}</span>
              </div>
              {!isPickup && (
                <div className='flex justify-between text-[13px] text-ink-soft'>
                  <span>Delivery</span>
                  <span>{formatMoney(DELIVERY_FEE)}</span>
                </div>
              )}
              {(order.memberDiscount ?? 0) > 0 && (
                <div className='flex justify-between text-[13px] text-green'>
                  <span>Member discount</span>
                  <span>−{formatMoney(order.memberDiscount ?? 0)}</span>
                </div>
              )}
              {(order.promoDiscount ?? 0) > 0 && (
                <div className='flex justify-between text-[13px] text-green'>
                  <span>Promo{order.promoCode ? ` — ${order.promoCode}` : ''}</span>
                  <span>−{formatMoney(order.promoDiscount ?? 0)}</span>
                </div>
              )}
              {(order.pointsRedemptionValueCents ?? 0) > 0 && (
                <div className='flex justify-between text-[13px] text-green'>
                  <span>Points redeemed ({(order.pointsRedeemed ?? 0).toLocaleString('en-US')} pts)</span>
                  <span>−{formatMoney((order.pointsRedemptionValueCents ?? 0) / 100)}</span>
                </div>
              )}
              <div className='flex justify-between text-[13px] text-ink-soft'>
                <span>Tax</span>
                <span>{formatMoney(order.tax)}</span>
              </div>
              <div className='flex justify-between border-t border-line-soft pt-3 text-[15px] font-semibold text-ink'>
                <span>Total</span>
                <span>{formatMoney(order.totalCost)}</span>
              </div>
              {showRealizedAtPickup && (
                <div className='flex justify-between text-[12px] text-camel'>
                  <span className='italic'>
                    {order.paymentResult?.settlementStatus === 'settled'
                      ? 'Settled at pickup (after weighing)'
                      : order.paymentResult?.settlementStatus === 'failed'
                      ? 'Final at pickup (settle in-store)'
                      : 'Final at pickup (after weighing)'}
                  </span>
                  <span className='font-mono'>{formatMoney(realizedTotalAtPickup)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.orderNotes && (
            <div className='rounded-sm border border-line-soft bg-paper px-6 py-5'>
              <p className='mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted'>
                Notes for the butcher
              </p>
              <p className='text-[14px] leading-relaxed text-ink-soft'>{order.orderNotes}</p>
            </div>
          )}

          {isGuestOrder && (
            <div className='rounded-sm border border-line-soft bg-paper px-6 py-5 text-[13px] leading-relaxed text-ink-soft'>
              <p className='mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted'>
                Heads up
              </p>
              <p className='mb-3'>
                Create an account with this email and this order will show up
                in your history. (No points are awarded retroactively.)
              </p>
              <Link
                // Invariant: isGuestOrder is `!order.user`, and the Order
                // schema's pre-save validator requires guestContact.email
                // whenever user is absent. So the field is always populated
                // by the time this branch renders.
                href={`/register?email=${encodeURIComponent(order.guestContact!.email)}`}
                className='inline-flex items-center gap-2 border-b border-current pb-px text-oxblood transition-colors duration-300 hover:text-ink motion-reduce:transition-none'
              >
                Create an account
                <svg
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth={2}
                  aria-hidden='true'
                  className='h-3 w-3'
                >
                  <path d='M5 12h14M13 5l7 7-7 7' />
                </svg>
              </Link>
            </div>
          )}

          {/* CTAs */}
          <div className='flex flex-col gap-3 sm:flex-row'>
            <Link
              href='/products'
              className='flex-1 rounded-full bg-ink px-7 py-4 text-center text-[15px] font-medium text-cream transition-colors duration-300 hover:bg-oxblood'
            >
              Continue shopping
            </Link>
            {!isGuestOrder && (
              <Link
                href='/profile?tab=orders'
                className='flex-1 rounded-full border border-line-soft px-7 py-4 text-center text-[15px] font-medium text-ink transition-colors duration-300 hover:border-ink'
              >
                View my orders
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
