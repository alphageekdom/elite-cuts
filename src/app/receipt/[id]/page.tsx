import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import Order from '@/models/Order';
import { formatMoney } from '@/lib/format';
import { refundSummary } from '@/lib/order-refunds';
import {
  formatPhoneHref,
  formatShopCityStateZip,
  formatWebsiteDisplay,
  getShopSettings,
} from '@/lib/shopSettings';
import ReceiptToolbar from './ReceiptToolbar';
import ReceiptHeader from './ReceiptHeader';
import ReceiptItemsTable from './ReceiptItemsTable';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { shopName } = await getShopSettings();
  const ref = `#EC-${id.slice(-4).toUpperCase()}`;
  return { title: `Receipt ${ref} · ${shopName}` };
}

// ── helpers ─────────────────────────────────────────────────────────────────

function getTierLabel(pts: number) {
  if (pts >= 1000) return 'Master Cut';
  if (pts >= 250) return 'Connoisseur';
  return 'Regular';
}

const STATUS_STYLE: Record<string, string> = {
  'Order Placed':     'bg-camel/18 text-camel',
  'Preparing':        'bg-camel/18 text-camel',
  'Ready for Pickup': 'bg-camel/18 text-camel',
  'Out for Delivery': 'bg-ink/10 text-ink',
  'Completed':        'bg-green-soft text-green',
  'Cancelled':        'bg-red-soft text-oxblood',
};

// ── page ────────────────────────────────────────────────────────────────────

export default async function ReceiptPage({ params }: Props) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) redirect('/login');

  await connectDB();
  const { id } = await params;
  const settings = await getShopSettings();
  const shopCityStateZip = formatShopCityStateZip(settings);
  const shopAddressLine = `${settings.street} · ${shopCityStateZip}`;

  const rawOrder = await Order.findById(id)
    .populate<{ user: { _id: string; name: string; email: string; rewardPoints: number } }>(
      'user', 'name email rewardPoints',
    )
    .lean()
    .exec();

  if (!rawOrder) notFound();

  const order = rawOrder!;
  const orderRef = `#EC-${id.slice(-4).toUpperCase()}`;
  const user = order.user as { _id: string; name: string; email: string; rewardPoints: number };
  const rewardPoints = user?.rewardPoints ?? 0;
  const tier = getTierLabel(rewardPoints);
  // Prefer the order's stamped pointsAwarded; fall back to the legacy
  // floor(totalCost) for orders created before Phase B introduced the field.
  const pointsEarned = order.pointsAwarded ?? Math.floor(order.totalCost);
  const pointsRedemptionDollars =
    (order.pointsRedemptionValueCents ?? 0) > 0
      ? (order.pointsRedemptionValueCents ?? 0) / 100
      : 0;
  // On cancelled orders the redemption snapshot stays on the doc for
  // historical accuracy; the points themselves were already returned to
  // the customer via reverseOrderRedemption. UI marks the line accordingly.
  const isCancelled = order.orderStatus === 'Cancelled';

  const refund = refundSummary(order.orderItems, {
    subtotal: order.subtotal,
    tax: order.tax,
    totalCost: order.totalCost,
  });
  const isPartiallyRefunded =
    refund.refundedCount > 0 && refund.refundedCount < order.orderItems.length;
  const netPaid = Math.max(0, Math.round((order.totalCost - refund.refundedAmount) * 100) / 100);

  const displayName  = order.contactName  || user?.name  || 'Customer';
  const displayEmail = order.contactEmail || user?.email || '';
  const displayPhone = order.contactPhone ?? null;

  const pickupWindow = order.pickupSlot
    ? (() => {
        const d = new Date(order.pickupSlot!);
        const next = new Date(d.getTime() + 3600000);
        return `${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${next.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      })()
    : null;

  const pillCls = STATUS_STYLE[order.orderStatus] ?? 'bg-line-soft text-muted';

  return (
    <>
      {/* Print styles injected inline so they work outside globals.css */}
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          .receipt-card { box-shadow: none !important; border: none !important; border-radius: 0 !important; max-width: 100% !important; }
          body { background: white !important; padding: 0 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-cream flex flex-col items-center py-10 px-4 sm:px-6">

        {/* Toolbar */}
        <ReceiptToolbar
          backHref="/dashboard/orders"
          email={displayEmail}
          orderRef={orderRef}
          orderId={id}
          shop={{
            shopName: settings.shopName,
            phone: settings.phone,
            email: settings.email,
            addressLine: shopAddressLine,
          }}
          rewards={{
            pointsRedeemed: order.pointsRedeemed ?? 0,
            pointsRedemptionDollars,
            // Only forward an "earn" amount if the order actually has the
            // Phase-B-or-later stamped field. The legacy floor(totalCost)
            // fallback is fine for the on-page badge but would mislead the
            // email body about a future award that won't fire for orders
            // created before the new fulfilment-time path landed.
            pointsAwarded: order.pointsAwarded ?? 0,
          }}
        />

        {/* Receipt card */}
        <div className="receipt-card w-full max-w-150 bg-paper border border-line-soft rounded shadow-[0_8px_40px_rgba(28,24,20,0.06)] overflow-hidden">

          {/* Decorative edge */}
          <div className="h-1 bg-linear-to-r from-oxblood via-camel to-oxblood" />

          {/* ── Header ── */}
          <ReceiptHeader
            orderRef={orderRef}
            orderStatus={order.orderStatus}
            pillCls={pillCls}
            createdAt={new Date(order.createdAt)}
            pickedUp={order.pickedUp}
            shopName={settings.shopName}
            addressLine={shopAddressLine}
          />

          {/* ── Customer + Fulfillment ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-line-soft">
            {/* Customer */}
            <div className="px-8 sm:px-12 py-6 sm:border-r border-b sm:border-b-0 border-line-soft">
              <div className="font-mono text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-3">Customer</div>
              <div className="font-display text-[18px] font-medium tracking-tight mb-1">{displayName}</div>
              {displayEmail && (
                <a href={`mailto:${displayEmail}`} className="text-[13px] text-oxblood border-b border-current pb-px block mb-1 truncate">
                  {displayEmail}
                </a>
              )}
              {displayPhone && (
                <div className="font-mono text-[12px] text-muted tracking-[0.04em]">{displayPhone}</div>
              )}
              <div className="font-mono text-[11px] text-muted tracking-[0.04em] mt-2 uppercase">{tier} Tier</div>
            </div>

            {/* Fulfillment */}
            <div className="px-8 sm:px-12 py-6">
              <div className="font-mono text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-3">Fulfillment</div>
              <div className="font-display text-[18px] font-medium tracking-tight mb-1">
                {order.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup at shop'}
              </div>
              {order.fulfillmentType === 'delivery' && order.deliveryAddress ? (
                <div className="text-[13px] text-ink-soft leading-relaxed">
                  {order.deliveryAddress.address1}
                  {order.deliveryAddress.address2 && <>, {order.deliveryAddress.address2}</>}
                  <br />{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zip}
                </div>
              ) : (
                <div className="text-[13px] text-ink-soft leading-relaxed">
                  {settings.street}<br />{shopCityStateZip}
                </div>
              )}
              {pickupWindow && (
                <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-cream border border-line-soft text-[11px] font-medium text-ink-soft">
                  <svg className="w-3 h-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  Window: {pickupWindow}
                </div>
              )}
              {order.fulfillmentType === 'delivery' && (
                <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-cream border border-line-soft text-[11px] font-medium text-muted">
                  Demo delivery — no dispatch
                </div>
              )}
            </div>
          </div>

          {/* ── Out for Delivery banner ── */}
          {order.orderStatus === 'Out for Delivery' && (
            <div className="mx-8 sm:mx-12 mt-5 px-5 py-4 rounded border border-ink/15 bg-ink/5 flex items-start gap-3.5">
              <span className="w-7 h-7 rounded-full grid place-items-center shrink-0 mt-0.5 bg-ink/10">
                <svg className="w-3.5 h-3.5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </span>
              <div className="font-display text-[15px] font-medium tracking-tight text-ink leading-snug">
                Your order is on its way.
              </div>
            </div>
          )}

          {/* ── Ready for Pickup banner ── */}
          {order.orderStatus === 'Ready for Pickup' && (
            <div className="mx-8 sm:mx-12 mt-5 px-5 py-4 rounded border border-camel/25 bg-camel/8 flex items-start gap-3.5">
              <span className="w-7 h-7 rounded-full bg-camel/20 text-camel grid place-items-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <div className="font-display text-[15px] font-medium tracking-tight text-ink leading-snug">
                  Your order is ready — come pick it up.
                </div>
                {pickupWindow && (
                  <div className="font-mono text-[11px] text-muted tracking-[0.04em] mt-1">
                    Pickup window: {pickupWindow}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Items ── */}
          <ReceiptItemsTable orderItems={order.orderItems} />

          {/* ── Totals ── */}
          <div className="px-8 sm:px-12 pb-6">
            <div className="border-t border-line pt-5 space-y-2">
              <div className="flex justify-between items-baseline text-[14px]">
                <span className="text-ink-soft">Subtotal ({order.orderItems.length} {order.orderItems.length === 1 ? 'item' : 'items'})</span>
                <span className="font-mono text-[13px]">{formatMoney(order.subtotal)}</span>
              </div>
              <div className="flex justify-between items-baseline text-[14px]">
                <span className="text-ink-soft">Pickup</span>
                <span className="font-mono text-[13px]">Free</span>
              </div>
              {(order.memberDiscount ?? 0) > 0 && (
                <div className="flex justify-between items-baseline text-[14px]">
                  <span className="text-ink-soft">Member discount</span>
                  <span className="font-mono text-[13px] text-green">−{formatMoney(order.memberDiscount ?? 0)}</span>
                </div>
              )}
              {(order.promoDiscount ?? 0) > 0 && (
                <div className="flex justify-between items-baseline text-[14px]">
                  <span className="text-ink-soft">Promo{order.promoCode ? ` — ${order.promoCode}` : ''}</span>
                  <span className="font-mono text-[13px] text-green">−{formatMoney(order.promoDiscount ?? 0)}</span>
                </div>
              )}
              {pointsRedemptionDollars > 0 && (
                <div className="flex justify-between items-baseline text-[14px]">
                  <span className="text-ink-soft">
                    Points redeemed ({(order.pointsRedeemed ?? 0).toLocaleString('en-US')} pts)
                    {isCancelled && (
                      <em className="not-italic ml-2 text-[11px] tracking-[0.04em] uppercase text-camel">returned</em>
                    )}
                  </span>
                  <span className={`font-mono text-[13px] ${isCancelled ? 'text-muted line-through' : 'text-green'}`}>
                    −{formatMoney(pointsRedemptionDollars)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline text-[14px]">
                <span className="text-ink-soft">Tax</span>
                <span className="font-mono text-[13px]">{formatMoney(order.tax)}</span>
              </div>
            </div>
            <div className="flex justify-between items-baseline mt-4 pt-4 border-t-2 border-ink">
              <span className="font-display text-[20px] font-medium tracking-tight">Total</span>
              <span className="font-display text-[36px] font-medium tracking-tight leading-none">
                {formatMoney(order.totalCost)}
                <em className="not-italic font-sans text-[14px] text-muted font-normal ml-1">USD</em>
              </span>
            </div>
            {refund.refundedAmount > 0 && (
              <div className="mt-3 pt-3 border-t border-line-soft space-y-2">
                <div className="flex justify-between items-baseline text-[14px] text-oxblood">
                  <span>Refunded ({refund.refundedCount} {refund.refundedCount === 1 ? 'item' : 'items'})</span>
                  <span className="font-mono text-[13px]">−{formatMoney(refund.refundedAmount)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-display text-[16px] font-medium tracking-tight">Net paid</span>
                  <span className="font-display text-[20px] font-medium tracking-tight">{formatMoney(netPaid)}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Payment ── */}
          <div className="mx-8 sm:mx-12 mb-5 px-5 py-4 bg-cream border border-line-soft rounded flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-7 rounded bg-ink text-cream grid place-items-center font-display text-[10px] font-semibold tracking-wider shrink-0">
                {order.paymentMethod === 'Demo' ? 'DEMO' : order.paymentMethod.slice(0, 4).toUpperCase()}
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted mb-0.5">Payment</div>
                <div className="font-mono text-[13px] text-ink">
                  {order.paymentMethod === 'Demo' ? 'Demo — no real charge' : order.paymentMethod}
                </div>
              </div>
            </div>
            {order.paymentResult?.transactionId && (
              <div className="text-right">
                <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted mb-0.5">Transaction</div>
                <div className="font-mono text-[13px] text-ink">{order.paymentResult.transactionId.slice(0, 12)}…</div>
              </div>
            )}
          </div>

          {/* ── Butcher notes ── */}
          {order.orderNotes && (
            <div className="mx-8 sm:mx-12 mb-5 px-5 py-4 rounded border border-camel/20 bg-camel/8">
              <div className="font-mono text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-2">Notes for the butcher</div>
              <p className="font-display italic text-[14px] text-ink-soft leading-relaxed">{order.orderNotes}</p>
            </div>
          )}

          {/* ── Refund notice (partial only — fully refunded falls under cancelled below) ── */}
          {isPartiallyRefunded && order.orderStatus !== 'Cancelled' && (
            <div className="mx-8 sm:mx-12 mb-5 px-5 py-4 rounded border border-oxblood/20 bg-oxblood/5 flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-oxblood/15 text-oxblood grid place-items-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 14l-4-4 4-4" /><path d="M5 10h11a4 4 0 014 4v2" />
                </svg>
              </span>
              <div>
                <div className="font-display text-[14px] font-medium tracking-tight text-ink leading-snug mb-0.5">
                  Partial refund applied
                </div>
                <div className="font-mono text-[11px] text-muted tracking-[0.04em]">
                  {refund.refundedCount} of {order.orderItems.length} items refunded — {formatMoney(refund.refundedAmount)} back to you. The remaining items are still being honored.
                </div>
              </div>
            </div>
          )}

          {/* ── Points earned / Cancelled note ── */}
          {order.orderStatus === 'Cancelled' ? (
            <div className="mx-8 sm:mx-12 mb-6 px-5 py-3 flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span className="font-mono text-[12px] text-muted tracking-[0.04em]">
                This order was cancelled{order.cancellationReason ? ` — ${order.cancellationReason.toLowerCase()}` : ''}.
              </span>
            </div>
          ) : (
            <div className="mx-8 sm:mx-12 mb-6 px-5 py-4 bg-ink rounded flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-cream text-[13px]">
                <span className="w-7 h-7 rounded-full bg-camel/25 grid place-items-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-camel-soft" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" />
                  </svg>
                </span>
                <span>
                  {order.orderStatus === 'Completed' ? 'You earned points on this order' : 'Points you\'ll earn on completion'}
                </span>
              </div>
              <div className="font-display text-[20px] font-medium tracking-tight leading-none shrink-0 text-camel-soft">
                +{pointsEarned.toLocaleString('en-US')}
                <em className="italic font-sans text-[12px] font-normal ml-1 opacity-60">pts</em>
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="px-8 sm:px-12 py-8 text-center border-t border-line-soft">
            <div className="font-display italic text-[20px] text-oxblood mb-4 tracking-tight">
              Thank you for choosing us.
            </div>
            <div className="text-[12px] text-muted leading-relaxed mb-3">
              {settings.shopName} · {settings.street}, {shopCityStateZip}<br />
              <a href={formatPhoneHref(settings.phone)} className="hover:text-ink transition-colors">{settings.phone}</a>
              {' · '}
              <a href={`mailto:${settings.email}`} className="hover:text-ink transition-colors">{settings.email}</a>
              {' · '}
              <a href={settings.website} className="hover:text-ink transition-colors">{formatWebsiteDisplay(settings.website)}</a>
            </div>
            <div className="font-mono text-[10px] tracking-widest text-muted/60 uppercase">
              Portfolio project · Not a real shop · No orders are processed
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
