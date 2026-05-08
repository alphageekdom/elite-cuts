import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import Order from '@/models/Order';
import ReceiptToolbar from './ReceiptToolbar';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ref = `#EC-${id.slice(-4).toUpperCase()}`;
  return { title: `Receipt ${ref} · EliteCuts` };
}

// ── helpers ─────────────────────────────────────────────────────────────────

const MONTH = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function fmtDate(d: Date) {
  return `${MONTH[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getTierLabel(pts: number) {
  if (pts >= 1000) return 'Master Cut';
  if (pts >= 250) return 'Connoisseur';
  return 'Regular';
}

const STATUS_STYLE: Record<string, string> = {
  Pending:          'bg-[rgba(184,137,90,0.18)] text-camel',
  'Ready for Pickup': 'bg-[rgba(184,137,90,0.18)] text-camel',
  Completed:        'bg-green-soft text-green',
  Cancelled:        'bg-red-soft text-oxblood',
};

// ── page ────────────────────────────────────────────────────────────────────

export default async function ReceiptPage({ params }: Props) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) redirect('/login');

  await connectDB();
  const { id } = await params;

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
  const pointsEarned = Math.floor(order.totalCost);

  const displayName  = order.contactName  || user?.name  || 'Customer';
  const displayEmail = order.contactEmail || user?.email || '';
  const displayPhone = order.contactPhone ?? null;

  const pickupWindow = order.pickupSlot
    ? (() => {
        const d = new Date(order.pickupSlot as string);
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
        />

        {/* Receipt card */}
        <div className="receipt-card w-full max-w-150 bg-paper border border-line-soft rounded shadow-[0_8px_40px_rgba(28,24,20,0.06)] overflow-hidden">

          {/* Decorative edge */}
          <div className="h-1 bg-gradient-to-r from-oxblood via-camel to-oxblood" />

          {/* ── Header ── */}
          <div className="px-10 sm:px-12 py-10 text-center border-b border-line-soft">
            {/* Brand */}
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="w-10 h-10 rounded-full bg-oxblood text-cream grid place-items-center font-display font-bold text-[13px] tracking-wide shrink-0">
                EC
              </span>
              <span className="font-display text-[26px] font-semibold tracking-tight leading-none">
                Elite<em className="italic text-oxblood font-normal">Cuts</em>
              </span>
            </div>
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted mb-7">
              3045 30th St · North Park, San Diego, CA 92104
            </div>

            {/* Order ref */}
            <div className="font-display text-[42px] sm:text-[52px] font-normal tracking-tight leading-none mb-4">
              {orderRef.slice(0, 3)}<em className="italic text-oxblood font-normal">{orderRef.slice(3)}</em>
            </div>

            {/* Status pill */}
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-medium tracking-[0.08em] uppercase mb-5 ${pillCls}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {order.orderStatus}
            </span>

            {/* Date row */}
            <div className="flex items-center justify-center gap-4 font-mono text-[11px] text-muted tracking-[0.04em] flex-wrap">
              <span>{fmtDate(new Date(order.createdAt))}</span>
              {order.pickedUp && (
                <>
                  <span className="text-line">|</span>
                  <span>Picked up</span>
                </>
              )}
            </div>
          </div>

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
                  3045 30th St, North Park<br />San Diego, CA 92104
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
            </div>
          </div>

          {/* ── Items ── */}
          <div className="px-8 sm:px-12">
            {/* Column headers */}
            <div className="grid items-center py-4 border-b border-line-soft font-mono text-[10px] font-medium tracking-[0.22em] uppercase text-muted"
              style={{ gridTemplateColumns: '1fr 56px 88px' }}
            >
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Total</span>
            </div>

            {order.orderItems.map((item, i) => (
              <div
                key={i}
                className="grid items-center py-5 border-b border-line-soft last:border-b-0"
                style={{ gridTemplateColumns: '1fr 56px 88px' }}
              >
                <div className="min-w-0 pr-4">
                  <div className="font-display text-[17px] font-medium tracking-tight leading-snug mb-1">{item.name}</div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-muted tracking-[0.04em] flex-wrap">
                    <span>{fmtMoney(item.price)}/ea</span>
                    {item.productType && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-muted/40 inline-block" />
                        <span className="uppercase">{item.productType}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="font-mono text-[13px] text-ink-soft text-center">× {item.qty}</div>
                <div className="font-display text-[17px] font-medium tracking-tight text-right">
                  {fmtMoney(item.price * item.qty)}
                </div>
              </div>
            ))}
          </div>

          {/* ── Totals ── */}
          <div className="px-8 sm:px-12 pb-6">
            <div className="border-t border-line pt-5 space-y-2">
              <div className="flex justify-between items-baseline text-[14px]">
                <span className="text-ink-soft">Subtotal ({order.orderItems.length} {order.orderItems.length === 1 ? 'item' : 'items'})</span>
                <span className="font-mono text-[13px]">{fmtMoney(order.subtotal)}</span>
              </div>
              <div className="flex justify-between items-baseline text-[14px]">
                <span className="text-ink-soft">Pickup</span>
                <span className="font-mono text-[13px]">Free</span>
              </div>
              <div className="flex justify-between items-baseline text-[14px]">
                <span className="text-ink-soft">Tax</span>
                <span className="font-mono text-[13px]">{fmtMoney(order.tax)}</span>
              </div>
            </div>
            <div className="flex justify-between items-baseline mt-4 pt-4 border-t-2 border-ink">
              <span className="font-display text-[20px] font-medium tracking-tight">Total</span>
              <span className="font-display text-[36px] font-medium tracking-tight leading-none">
                {fmtMoney(order.totalCost)}
                <em className="not-italic font-sans text-[14px] text-muted font-normal ml-1">USD</em>
              </span>
            </div>
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
            <div className="mx-8 sm:mx-12 mb-5 px-5 py-4 rounded border border-camel/20" style={{ background: 'rgba(184,137,90,0.08)' }}>
              <div className="font-mono text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-2">Notes for the butcher</div>
              <p className="font-display italic text-[14px] text-ink-soft leading-relaxed">{order.orderNotes}</p>
            </div>
          )}

          {/* ── Points earned ── */}
          <div className="mx-8 sm:mx-12 mb-6 px-5 py-4 bg-ink rounded flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-cream text-[13px]">
              <span className="w-7 h-7 rounded-full grid place-items-center shrink-0" style={{ background: 'rgba(184,137,90,0.25)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="rgba(212,179,145,1)">
                  <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" />
                </svg>
              </span>
              <span>
                {order.orderStatus === 'Completed' ? 'You earned points on this order' : 'Points you\'ll earn on completion'}
              </span>
            </div>
            <div className="font-display text-[20px] font-medium tracking-tight leading-none shrink-0" style={{ color: 'rgba(212,179,145,1)' }}>
              +{pointsEarned.toLocaleString('en-US')}
              <em className="italic font-sans text-[12px] font-normal ml-1 opacity-60">pts</em>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-8 sm:px-12 py-8 text-center border-t border-line-soft">
            <div className="font-display italic text-[20px] text-oxblood mb-4 tracking-tight">
              Thank you for choosing us.
            </div>
            <div className="text-[12px] text-muted leading-relaxed mb-3">
              EliteCuts · 3045 30th St, North Park, San Diego, CA 92104<br />
              <a href="tel:6195550142" className="hover:text-ink transition-colors">(619) 555-0142</a>
              {' · '}
              <a href="mailto:hello@elitecuts.com" className="hover:text-ink transition-colors">hello@elitecuts.com</a>
              {' · '}
              <a href="https://elitecuts.com" className="hover:text-ink transition-colors">elitecuts.com</a>
            </div>
            <div className="font-mono text-[10px] tracking-[0.1em] text-muted/60 uppercase">
              Portfolio project · Not a real shop · No orders are processed
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
