import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import connectDB from '@/config/database';
import OrderModel from '@/models/Order';
import Product, { type SerializedProduct } from '@/models/Product';
import { PUBLIC_PRODUCT_PROJECTION } from '@/lib/products/public-projection';
import { convertToSerializableObject } from '@/lib/convertToObject';
import { getSessionUser } from '@/lib/auth/session';
import { DELIVERY_FEE } from '@/lib/pricing';
import { formatOrderCount } from '@/lib/cart/counts';
import { computeAward } from '@/lib/rewards/calculator';
import {
  formatPhoneHref,
  formatShopAddress,
  getShopSettings,
} from '@/lib/shop-settings/queries';
import { getShopHours } from '@/lib/shop-settings/hours-queries';
import { formatShopHoursCondensed } from '@/lib/shop-settings/hours-format';
import { formatInShopZone } from '@/lib/shop-settings/pickup-format';
import { formatPickupWindowParts } from '@/lib/shop-settings/pickup-slots';
import { VISIBLE_PRODUCT_FILTER } from '@/lib/products/constants';
import {
  orderHasRealizedDifference,
  realizedOrderTotal,
} from '@/lib/orders/line';
import { orderRefBare } from '@/lib/orders/reference';
import { FOCUS_RING } from '@/lib/styles';
import CheckoutStepRail from '@/components/checkout/CheckoutStepRail';
import ConfirmationCartReset from '@/components/checkout/ConfirmationCartReset';
import {
  CARD_CLASS,
  EYEBROW_CLASS,
  EYEBROW_ON_TINT,
} from './confirmationStyles';
import ConfirmationHero from './ConfirmationHero';
import ConfirmationReceipt from './ConfirmationReceipt';
import ConfirmationSuggestions from './ConfirmationSuggestions';
import ConfirmationTimeline, {
  type TimelineStep,
} from './ConfirmationTimeline';

export const metadata: Metadata = {
  title: 'Order Confirmed',
};

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function ConfirmationPage({ searchParams }: Props) {
  const { orderId } = await searchParams;
  if (!orderId) redirect('/cart');

  const sessionUser = await getSessionUser();

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

  // Suggestions strip: the shop's current featured cuts, minus anything in
  // this order so the page doesn't invite a repeat purchase of what was just
  // bought. Excluded in the query rather than after it, so `limit` is exact —
  // the previous over-fetch-and-slice could still come up short for a customer
  // who ordered several featured cuts. VISIBLE_PRODUCT_FILTER keeps a
  // soft-deleted cut from being recommended.
  const orderedIds = order.orderItems.map((line) => line.product);

  const [shopSettings, hoursDays, featuredDocs] = await Promise.all([
    getShopSettings(),
    getShopHours(),
    Product.find(
      {
        ...VISIBLE_PRODUCT_FILTER,
        isFeatured: true,
        stockCount: { $gt: 0 },
        _id: { $nin: orderedIds },
      },
      PUBLIC_PRODUCT_PROJECTION,
    )
      .limit(3)
      .lean(),
  ]);
  const shopAddress = formatShopAddress(shopSettings);
  const suggestions = featuredDocs.map(
    convertToSerializableObject,
  ) as SerializedProduct[];

  const isGuestOrder = !order.user;
  // `??` only falls back on null/undefined, and an admin-created order can
  // carry an empty string — which would render as a blank value beside its
  // label rather than the placeholder. Normalise once so the placeholder, the
  // contact block and the first-name check all read the same resolved value.
  const contactName = (
    order.contactName ??
    order.guestContact?.name ??
    ''
  ).trim();
  const contactEmail = (
    order.contactEmail ??
    order.guestContact?.email ??
    ''
  ).trim();
  const displayName = contactName || '—';
  const displayEmail = contactEmail || '—';
  const displayPhone =
    (order.contactPhone ?? order.guestContact?.phone)?.trim() || null;
  const firstName = contactName.split(/\s+/)[0] ?? '';
  const hasName = firstName.length > 0;

  // The hero supplies the leading '#', so this is the bare form. Was the
  // last eight characters with no 'EC-' prefix, which made this page the one
  // surface printing a different reference for the order than the receipt,
  // the profile list and the counter's own admin row.
  const shortId = orderRefBare(String(order._id));
  const isPickup = order.fulfillmentType !== 'delivery';
  const isPaid = order.paymentResult?.status === 'Completed';

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
  const realizedLabel =
    order.paymentResult?.settlementStatus === 'settled'
      ? 'Settled at pickup (after weighing)'
      : order.paymentResult?.settlementStatus === 'failed'
        ? 'Final at pickup (settle in-store)'
        : 'Final at pickup (after weighing)';

  const pickupWindow = order.pickupSlot
    ? formatPickupWindowParts(order.pickupSlot)
    : null;

  // Points are awarded when the order is handed over, not when it is placed —
  // `awardOrderCompletion` runs on the transition to Completed. So this is
  // what the customer *will* earn, phrased the way the receipt page already
  // phrases it. Guests earn nothing, so they see no card at all.
  //
  // Estimated at multiplier 1 for the reason the cart drawer documents: the
  // weekend multiplier keys off the award date, which may not be today, so a
  // floor is the only number the shop can always honour. Passing the view
  // date instead would promise 2x on a Sunday order collected on Tuesday —
  // and would change the number on every reload.
  const pendingPoints = isGuestOrder
    ? 0
    : computeAward(order.subtotal, { ...shopSettings, weekendMultiplier: 1 });

  const timeline: TimelineStep[] = [
    {
      time: formatInShopZone(order.createdAt, shopSettings.timezone, {
        hour: 'numeric',
        minute: '2-digit',
      }),
      title: 'Order received',
      body: "It's on the board in the cutting room.",
      done: true,
    },
    {
      title: 'Cut and wrapped',
      body: order.orderNotes
        ? 'Portioned to your note, then wrapped in paper.'
        : 'Portioned by hand, then wrapped in paper.',
      done: false,
    },
    isPickup
      ? {
          time: pickupWindow?.time,
          title: 'Ready at the counter',
          body: 'Give your name or the reference above.',
          done: false,
        }
      : {
          title: 'Out for delivery',
          body: 'Someone should be in to take it — it needs refrigerating.',
          done: false,
        },
  ];

  return (
    <div className='bg-cream'>
      <ConfirmationCartReset />
      <CheckoutStepRail currentStep={3} />

      <ConfirmationHero
        eyebrow={isPaid ? 'Order confirmed · paid' : 'Order received'}
        headline={hasName ? "We're on it," : "We're"}
        headlineAccent={hasName ? `${firstName}.` : 'on it.'}
        sub={
          isPickup
            ? "Your order is with the cutting room. Come to the counter, give your name or the reference, and it'll be wrapped and waiting."
            : // A plain string prop, not JSX text — an HTML entity would render
              // literally here.
              'Your order is with the cutting room. We’ll bring it out to the address below once it’s cut and wrapped.'
        }
        reference={shortId}
        facts={[
          {
            label: 'Placed',
            // Shop zone, not the server's — see formatInShopZone. Without it
            // this line contradicts the pickup window a few inches below.
            value: formatInShopZone(order.createdAt, shopSettings.timezone, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
          },
          { label: 'Payment', value: order.paymentMethod },
          {
            label: 'Under the name',
            value: displayName,
          },
        ]}
      />

      <div className='mx-auto grid max-w-300 grid-cols-1 items-start gap-6 px-6 pt-10 pb-24 sm:px-8 lg:grid-cols-[1fr_380px] lg:gap-8'>
        {/* Left column */}
        <div className='flex flex-col gap-5'>
          {/* When + where */}
          <section className='overflow-hidden rounded-sm border border-line-soft bg-paper'>
            <div className='grid grid-cols-1 sm:grid-cols-2'>
              <div className='border-b border-line-soft px-6 py-6 sm:border-r sm:border-b-0'>
                <h2 className={EYEBROW_CLASS}>
                  {isPickup ? 'Ready for pickup' : 'Delivery'}
                </h2>
                {isPickup ? (
                  <>
                    {pickupWindow?.day && (
                      <p className='mt-3 font-display text-[32px] leading-none tracking-tight sm:text-[36px]'>
                        {pickupWindow.day}
                      </p>
                    )}
                    <p className='mt-1.5 font-display text-[32px] leading-none tracking-tight text-oxblood sm:text-[36px]'>
                      {pickupWindow?.time ?? 'Any time'}
                    </p>
                    {/* Without a slot there is no window to arrive inside, so
                        the copy falls back to the shop's opening hours rather
                        than naming a day the order never recorded. */}
                    <p className='mt-3.5 text-[13.5px] leading-relaxed text-ink-soft'>
                      {pickupWindow
                        ? "Arrive any time in the window — we'll have it cut and wrapped before it starts."
                        : "Come by whenever we're open — we'll have it cut and wrapped."}
                    </p>
                  </>
                ) : (
                  <>
                    {/* Nothing schedules a delivery day: the order carries an
                        address and no time, and delivery isn't gated by shop
                        hours. So the headline answers "where", and the body
                        carries the only "when" the shop can stand behind. */}
                    <p className='mt-3 font-display text-[32px] leading-none tracking-tight text-oxblood sm:text-[36px]'>
                      To your door
                    </p>
                    <p className='mt-3.5 text-[13.5px] leading-relaxed text-ink-soft'>
                      We&apos;ll bring it out once it&apos;s cut and wrapped.
                    </p>
                  </>
                )}
              </div>

              <div className='px-6 py-6'>
                <h2 className={EYEBROW_CLASS}>
                  {isPickup ? 'Collect from' : 'Delivering to'}
                </h2>
                {isPickup ? (
                  <>
                    <p className='mt-3 text-[16px] leading-snug text-ink'>
                      {shopSettings.shopName}
                    </p>
                    <p className='mt-1 text-[14px] leading-relaxed text-ink-soft'>
                      {shopAddress}
                    </p>
                    {/* The shop's lead time belongs on checkout, where it's
                        read before a window is chosen. Here it sits beside a
                        committed window and contradicts it whenever the picker
                        has rolled forward to tomorrow. */}
                    <p className='mt-3 font-mono text-[11.5px] tracking-[0.06em] text-green'>
                      FREE PICKUP
                    </p>
                  </>
                ) : (
                  <>
                    {/* Almost always a customer who deleted their account —
                        the deletion cascade removes the address, and it is
                        reachable here because anonymising sets `user` to null
                        and a user-less order is readable by anyone holding its
                        id. The copy stays neutral because the checkout route
                        doesn't require an address for delivery, so a malformed
                        order lands here too. */}
                    {order.deliveryAddress ? (
                      <>
                        <p className='mt-3 text-[16px] leading-snug text-ink'>
                          {order.deliveryAddress.address1}
                          {order.deliveryAddress.address2
                            ? `, ${order.deliveryAddress.address2}`
                            : ''}
                        </p>
                        <p className='mt-1 text-[14px] leading-relaxed text-ink-soft'>
                          {/* "San Diego, CA 92102" — the zip follows the state on a
                              space, not another comma, which is what the previous
                              blanket join produced. */}
                          {[
                            order.deliveryAddress.city,
                            [order.deliveryAddress.state, order.deliveryAddress.zip]
                              .filter(Boolean)
                              .join(' '),
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </>
                    ) : (
                      <p className='mt-3 text-[14px] leading-relaxed text-muted'>
                        No delivery address on file
                      </p>
                    )}
                    <p className='mt-3 font-mono text-[11.5px] tracking-[0.06em] text-muted'>
                      ${DELIVERY_FEE} · SAME DAY
                    </p>
                  </>
                )}

                <div className='mt-5 border-t border-line-soft pt-5'>
                  <h3 className={EYEBROW_CLASS}>Contact</h3>
                  {/* An email has no spaces to wrap on, and the section clips
                      its overflow, so a long address loses its tail silently
                      on a narrow phone unless it may break mid-word. */}
                  <p className='mt-2.5 text-[15px] wrap-break-word text-ink'>
                    {displayEmail}
                  </p>
                  {displayPhone && (
                    <p className='mt-1 text-[13.5px] wrap-break-word text-ink-soft'>
                      {displayPhone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <ConfirmationTimeline steps={timeline} />

          {order.orderNotes && (
            <section className='rounded-sm border border-line-soft bg-cream-deep px-6 py-6'>
              <h2 className={EYEBROW_ON_TINT}>Your note to the butcher</h2>
              <blockquote className='mt-3 font-display text-[19px] leading-relaxed text-ink-soft italic'>
                “{order.orderNotes}”
              </blockquote>
              <p className='mt-3 text-[12.5px] text-muted-deep'>
                The counter has this with your order.
              </p>
            </section>
          )}

          <ConfirmationSuggestions products={suggestions} />
        </div>

        {/* Right column */}
        <div className='flex flex-col gap-4'>
          <ConfirmationReceipt
            lines={order.orderItems}
            countLabel={formatOrderCount(order.orderItems)}
            subtotal={order.subtotal}
            tax={order.tax}
            total={order.totalCost}
            deliveryFee={isPickup ? null : DELIVERY_FEE}
            memberDiscount={order.memberDiscount ?? 0}
            promoDiscount={order.promoDiscount ?? 0}
            promoCode={order.promoCode}
            pointsRedeemed={order.pointsRedeemed ?? 0}
            pointsRedemptionValueCents={order.pointsRedemptionValueCents ?? 0}
            realized={
              showRealizedAtPickup
                ? { label: realizedLabel, total: realizedTotalAtPickup }
                : null
            }
            totalLabel={isPaid ? 'Paid' : 'Total'}
            payNote={
              isPaid
                ? `Paid in full when you placed the order.${
                    order.paymentResult?.paymentIntentId
                      ? ` Reference ${order.paymentResult.paymentIntentId.slice(0, 14)}…`
                      : ''
                  }`
                : 'Payment is still processing. Your reference above stays the same.'
            }
          />

          {pendingPoints > 0 && (
            <section className='rounded-sm border border-line-soft bg-cream-deep px-6 py-5'>
              <h2 className={EYEBROW_ON_TINT}>Rewards</h2>
              <p className='mt-3 flex items-baseline gap-2'>
                <span className='font-display text-[32px] leading-none tracking-tight text-oxblood'>
                  {pendingPoints.toLocaleString('en-US')}
                </span>
                <span className='text-[13.5px] text-ink-soft'>
                  points from this order
                </span>
              </p>
              {/* Deliberately future tense. Points land when the order is
                  handed over, not now — the balance has not moved yet. */}
              <p className='mt-3 text-[13px] leading-relaxed text-ink-soft'>
                You&apos;ll earn these once we hand the order over.{' '}
                <Link
                  href='/rewards'
                  className={`border-b border-current pb-px text-oxblood transition-colors duration-300 hover:text-ink motion-reduce:transition-none ${FOCUS_RING} focus-visible:ring-offset-cream-deep`}
                >
                  How rewards work
                </Link>
              </p>
            </section>
          )}

          <section className={CARD_CLASS}>
            <h2 className={EYEBROW_CLASS}>Something wrong?</h2>
            {/* The hours print directly below this line, closing days
                included, so it can't claim all-day coverage. */}
            <p className='mt-3 text-[13.5px] leading-relaxed text-ink-soft'>
              Call the counter and quote your reference — someone is on the
              floor whenever we&apos;re open.
            </p>
            <p className='mt-3.5 font-display text-[22px] tracking-tight'>
              <a
                href={formatPhoneHref(shopSettings.phone)}
                className={`transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none ${FOCUS_RING} focus-visible:ring-offset-paper`}
              >
                {shopSettings.phone}
              </a>
            </p>
            <div className='mt-2.5 space-y-0.5'>
              {formatShopHoursCondensed(hoursDays).map((row) => (
                <p key={row.label} className='text-[12.5px] text-muted'>
                  {row.label} {row.value}
                </p>
              ))}
            </div>
          </section>

          {isGuestOrder && (
            <section className={CARD_CLASS}>
              <h2 className={EYEBROW_CLASS}>Keep this order</h2>
              <p className='mt-3 text-[13.5px] leading-relaxed text-ink-soft'>
                Create an account with this email and this order will show up in
                your history. No points are awarded retroactively.
              </p>
              <Link
                // Invariant: isGuestOrder is `!order.user`, and the Order
                // schema's pre-save validator requires guestContact.email
                // whenever user is absent. So the field is always populated
                // by the time this branch renders.
                href={`/register?email=${encodeURIComponent(order.guestContact!.email)}`}
                className={`mt-3.5 inline-flex items-center border-b border-current pb-px text-[13.5px] text-oxblood transition-colors duration-300 hover:text-ink motion-reduce:transition-none ${FOCUS_RING} focus-visible:ring-offset-paper`}
              >
                Create an account
              </Link>
            </section>
          )}

          <div className='flex flex-col gap-3'>
            <Link
              href='/products'
              className={`rounded-sm bg-ink px-7 py-4 text-center text-[15px] font-medium text-cream transition-colors duration-300 hover:bg-oxblood motion-reduce:transition-none ${FOCUS_RING} focus-visible:ring-offset-cream`}
            >
              Back to the shop
            </Link>
            {!isGuestOrder && (
              <Link
                href='/profile?tab=orders'
                className={`rounded-sm border border-line px-7 py-4 text-center text-[15px] font-medium text-ink transition-colors duration-300 hover:border-ink motion-reduce:transition-none ${FOCUS_RING} focus-visible:ring-offset-cream`}
              >
                View my orders
              </Link>
            )}
          </div>

          {/* Only the demo customer's data is cleared overnight; a registered
              customer's order stays put, so the nightly clause is scoped to
              the session it actually applies to. */}
          <p className='rounded-sm border border-dashed border-line px-5 py-4 text-[12.5px] leading-relaxed text-muted'>
            This is a portfolio demo — no card was charged and no order reached
            a real shop.
            {sessionUser?.user?.isDemo && ' Demo data clears nightly.'}
          </p>
        </div>
      </div>
    </div>
  );
}
