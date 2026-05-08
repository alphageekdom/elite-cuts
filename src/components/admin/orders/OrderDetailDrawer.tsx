'use client';
import { useState } from 'react';
import { formatMoney, getInitials, formatDateTime } from '@/lib/admin-utils';
import { printReceipt } from '@/lib/print-receipt';
import { CANCELLATION_REASONS } from '@/lib/order-constants';
import type { OrderTableRow } from '@/types/admin';

type TimelineStep = {
  label: string;
  time: string;
  done: boolean;
  current: boolean;
};

const PICKUP_STEPS = ['Order Placed', 'Preparing', 'Ready for Pickup', 'Completed'];
const DELIVERY_STEPS = ['Order Placed', 'Preparing', 'Out for Delivery', 'Completed'];

function buildTimeline(order: OrderTableRow): TimelineStep[] {
  const d = formatDateTime(order.createdAt);
  const isDelivery = order.fulfillmentType === 'delivery';
  const track = isDelivery ? DELIVERY_STEPS : PICKUP_STEPS;
  const statusIdx = track.indexOf(order.status);

  const labels = isDelivery
    ? ['Order placed', 'Preparing your cuts', 'Out for delivery', 'Delivered']
    : ['Order placed', 'Preparing your cuts', 'Ready for pickup', 'Picked up'];

  const times = [
    d.day + ' · ' + d.time,
    statusIdx >= 1 ? 'In progress' : '—',
    statusIdx >= 2 ? (isDelivery ? 'En route' : 'Ready') : '—',
    order.status === 'Completed' ? 'Completed' : 'Awaiting',
  ];

  const steps = labels.map((label, i) => ({
    label,
    time: times[i],
    done: order.status === 'Cancelled' ? false : statusIdx >= i,
  }));

  const currentIdx = steps.findLastIndex((s) => s.done);
  return steps.map((s, i) => ({ ...s, current: i === currentIdx && i < steps.length - 1 }));
}

type Props = {
  order: OrderTableRow;
  statusUpdate: string;
  setStatusUpdate: (s: string) => void;
  onClose: () => void;
  onUpdate: (newStatus: string, cancellationReason?: string) => Promise<void>;
};

export default function OrderDetailDrawer({ order, statusUpdate, setStatusUpdate, onClose, onUpdate }: Props) {
  const [updating, setUpdating] = useState(false);
  const [cancellationReason, setCancellationReason] = useState(order.cancellationReason ?? '');
  const initials = getInitials(order.customerName);
  const timeline = buildTimeline(order);

  async function handleUpdate() {
    setUpdating(true);
    await onUpdate(
      statusUpdate,
      statusUpdate === 'Cancelled' ? cancellationReason || undefined : undefined,
    );
    setUpdating(false);
  }

  const handlePrint = () => printReceipt(order);

  return (
    <>
      {/* Head */}
      <div className="flex items-center justify-between gap-4 px-8 py-6 border-b border-line-soft bg-paper shrink-0">
        <div>
          <div className="font-display italic text-[13px] text-camel mb-1">✦ Order detail</div>
          <div className="font-mono text-[18px] font-medium tracking-[0.02em] text-ink">{order.orderRef}</div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-cream border border-line text-ink grid place-items-center hover:border-ink transition-colors shrink-0"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-7">

        {/* Status timeline */}
        <div className="pb-6 mb-6 border-b border-line-soft">
          <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-4">Status timeline</div>
          <div className="pl-1">
            {timeline.map((step, i) => (
              <div key={i} className="relative grid grid-cols-[22px_1fr] gap-3.5 py-2">
                {i < timeline.length - 1 && (
                  <span
                    className="absolute left-2.5 top-6.5 -bottom-2 w-px"
                    style={{ background: step.done ? 'rgba(74,107,58,0.5)' : 'var(--color-line)' }}
                  />
                )}
                <div
                  className={`w-5.5 h-5.5 rounded-full border-2 grid place-items-center z-10 ${
                    step.done
                      ? 'bg-green border-green text-cream'
                      : step.current
                      ? 'bg-ink border-ink text-cream shadow-[0_0_0_4px_rgba(28,24,20,0.08)]'
                      : 'bg-paper border-line text-muted'
                  }`}
                >
                  {(step.done || step.current) && (
                    <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="pt-px">
                  <div className={`font-display text-[15px] font-medium mb-0.5 ${step.done || step.current ? 'text-ink' : 'text-ink-soft'}`}>
                    {step.label}
                  </div>
                  <div className="font-mono text-[11px] text-muted tracking-[0.04em]">{step.time}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-line-soft">
            <div className="flex gap-2">
              <select
                value={statusUpdate}
                onChange={(e) => { setStatusUpdate(e.target.value); if (e.target.value !== 'Cancelled') setCancellationReason(''); }}
                className="flex-1 appearance-none bg-paper border border-line rounded-full px-4 py-2.5 text-[13px] text-ink font-sans outline-none focus:border-ink cursor-pointer"
              >
                <option value="Order Placed">Order Placed</option>
                <option value="Preparing">Preparing</option>
                {order.fulfillmentType !== 'delivery' && <option value="Ready for Pickup">Ready for Pickup</option>}
                {order.fulfillmentType === 'delivery' && <option value="Out for Delivery">Out for Delivery</option>}
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <button
                onClick={handleUpdate}
                disabled={updating || (statusUpdate === order.status && cancellationReason === (order.cancellationReason ?? ''))}
                className="px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Saving…' : 'Update'}
              </button>
            </div>
            {statusUpdate === 'Cancelled' && (
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="appearance-none bg-paper border border-line rounded-full px-4 py-2.5 text-[13px] text-ink font-sans outline-none focus:border-ink cursor-pointer"
              >
                <option value="">Select reason…</option>
                {CANCELLATION_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="pb-6 mb-6 border-b border-line-soft">
          <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-4">Customer</div>
          <div className="grid grid-cols-[44px_1fr_auto] gap-3.5 items-center">
            <div className="w-11 h-11 rounded-full bg-camel text-cream grid place-items-center font-display font-semibold text-sm">
              {initials}
            </div>
            <div>
              <div className="font-display text-[17px] font-medium tracking-[-0.01em] mb-0.5">{order.customerName}</div>
              <div className="font-mono text-[12px] text-muted tracking-[0.04em] uppercase">{order.customerEmail}</div>
            </div>
            <a
              href="#"
              className="inline-flex items-center gap-1 bg-paper border border-line rounded-full px-3.5 py-1.5 text-[12px] text-ink-soft hover:border-ink hover:text-ink transition-colors"
            >
              View
              <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Items */}
        <div className="pb-6 mb-6 border-b border-line-soft">
          <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-4">
            Items ({order.items.length})
          </div>
          <div className="flex flex-col">
            {order.items.map((item, i) => (
              <div
                key={i}
                className={`grid grid-cols-[56px_1fr_auto] gap-3.5 items-center py-3 ${
                  i < order.items.length - 1 ? 'border-b border-line-soft' : ''
                } ${i === 0 ? 'pt-0' : ''}`}
              >
                <div className="w-14 h-16 rounded bg-cream-deep overflow-hidden shrink-0">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <div className="font-display text-[15px] font-medium tracking-[-0.005em] leading-snug mb-1">{item.name}</div>
                  <div className="font-mono text-[11px] text-muted tracking-[0.04em] uppercase">
                    {item.qty}x · {formatMoney(item.price)}/ea · {item.productType}
                  </div>
                </div>
                <div className="font-display text-[15px] font-medium text-right">
                  {formatMoney(item.price * item.qty)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="pb-6 mb-6 border-b border-line-soft">
          <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-4">Totals</div>
          <div className="flex flex-col gap-2">
            {[
              { l: 'Subtotal', v: formatMoney(order.subtotal) },
              { l: 'Pickup', v: 'Free' },
              { l: 'Tax', v: formatMoney(order.tax) },
            ].map(({ l, v }) => (
              <div key={l} className="flex justify-between items-baseline text-[13px] text-ink-soft">
                <span>{l}</span>
                <span className="font-mono text-[12px]">{v}</span>
              </div>
            ))}
            <div className="flex justify-between items-baseline mt-2 pt-3 border-t border-line">
              <span className="font-display text-[17px] font-medium text-ink">Total</span>
              <span className="font-display text-[22px] font-medium tracking-[-0.01em] text-ink">{formatMoney(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Fulfillment */}
        <div>
          <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-4">Fulfillment</div>
          <div className="flex flex-col gap-2">
            {[
              { l: 'Method', v: order.fulfillmentType === 'delivery' ? 'DELIVERY' : 'PICKUP' },
              { l: 'Location', v: order.pickupLocation || 'San Diego, CA' },
              { l: 'Paid', v: order.isPaid ? 'Yes' : 'No' },
              { l: 'Picked up', v: order.pickedUp ? 'Yes' : 'Awaiting' },
            ].map(({ l, v }) => (
              <div key={l} className="flex justify-between items-baseline text-[13px] text-ink-soft">
                <span>{l}</span>
                <span className="font-mono text-[12px]">{v}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="flex gap-2 px-8 py-4.5 bg-paper border-t border-line-soft shrink-0">
        <button
          onClick={handlePrint}
          className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium hover:border-ink hover:text-ink transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
          </svg>
          Print receipt
        </button>
        <button className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
          </svg>
          Email customer
        </button>
      </div>
    </>
  );
}
