'use client';
import { useState } from 'react';
import { formatMoney, getInitials, formatDateTime } from '@/lib/format';
import { printReceipt } from '@/lib/orders/print-receipt';
import { CANCELLATION_REASONS } from '@/lib/orders/constants';
import {
  estimatedLineTotal,
  hasRealizedWeight,
  isVariableWeightLine,
  orderHasRealizedDifference,
  realizedLineTotal,
  realizedOrderTotal,
} from '@/lib/orders/line';
import { DELIVERY_FEE } from '@/lib/checkout/totals';
import { formatPickupLocation } from '@/lib/shop-settings/pickup-slots';
import AdminEyebrow from '@/components/admin/AdminEyebrow';
import SortPopover, { type SortOption } from '@/components/ui/SortPopover';
import type { OrderTableRow } from '@/types/admin';
import ArrowIcon from '@/components/ui/icons/ArrowIcon';
import CheckIcon from '@/components/ui/icons/CheckIcon';
import XIcon from '@/components/ui/icons/XIcon';

// Cancellation reasons never vary by order — build once at module scope
// so each render reuses the same array reference. The status options
// have to be derived per-order (fulfillment type toggles the middle
// entry between "Ready for Pickup" and "Out for Delivery") and stay
// inside the component body.
const CANCELLATION_REASON_OPTIONS: readonly SortOption<string>[] =
  CANCELLATION_REASONS.map((r) => ({ value: r, label: r }));

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
    order.status === 'Completed' ? 'Completed' : order.status === 'Cancelled' ? '—' : 'Awaiting',
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
  onRefundItem: (itemIndex: number) => Promise<void>;
  onUnrefundItem: (itemIndex: number) => Promise<void>;
  onSetRealizedWeight: (itemIndex: number, weightLb: number | null) => Promise<void>;
  onRetrySettlement: () => Promise<void>;
};

export default function OrderDetailDrawer({ order, statusUpdate, setStatusUpdate, onClose, onUpdate, onRefundItem, onUnrefundItem, onSetRealizedWeight, onRetrySettlement }: Props) {
  const [updating, setUpdating] = useState(false);
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<'refund' | 'unrefund' | 'realized' | null>(null);
  const [cancellationReason, setCancellationReason] = useState(order.cancellationReason ?? '');
  const [retryingSettlement, setRetryingSettlement] = useState(false);

  // Status options swap the middle entry between "Ready for Pickup" and
  // "Out for Delivery" based on this order's fulfillment type — pickup
  // orders never go "Out for Delivery", delivery orders never go "Ready
  // for Pickup". Derived per-render off `order.fulfillmentType` so a
  // future drawer that opens a delivery order sees the right options.
  const statusOptions: SortOption<string>[] = [
    { value: 'Order Placed',     label: 'Order Placed' },
    { value: 'Preparing',        label: 'Preparing' },
    order.fulfillmentType === 'delivery'
      ? { value: 'Out for Delivery', label: 'Out for Delivery' }
      : { value: 'Ready for Pickup', label: 'Ready for Pickup' },
    { value: 'Completed',        label: 'Completed' },
    { value: 'Cancelled',        label: 'Cancelled' },
  ];
  // Per-line draft of the realized-weight input. Indexed by line, holds the
  // raw typed string so empty / non-numeric input doesn't crash the math
  // before the admin tabs out of the field.
  const [realizedDraft, setRealizedDraft] = useState<Record<number, string>>({});
  // Realized weights are editable only at or past fulfillment. Pre-pickup,
  // the cuts haven't been weighed yet — the input renders disabled.
  const canEditRealizedWeight =
    order.status === 'Ready for Pickup' || order.status === 'Completed';
  const initials = getInitials(order.customerName);
  const timeline = buildTimeline(order);

  async function handleRefund(itemIndex: number) {
    if (pendingItemIndex !== null) return;
    setPendingItemIndex(itemIndex);
    setPendingAction('refund');
    try {
      await onRefundItem(itemIndex);
    } finally {
      setPendingItemIndex(null);
      setPendingAction(null);
    }
  }

  async function handleUnrefund(itemIndex: number) {
    if (pendingItemIndex !== null) return;
    setPendingItemIndex(itemIndex);
    setPendingAction('unrefund');
    try {
      await onUnrefundItem(itemIndex);
    } finally {
      setPendingItemIndex(null);
      setPendingAction(null);
    }
  }

  async function handleRealizedWeightSubmit(itemIndex: number, raw: string) {
    if (pendingItemIndex !== null) return;
    const trimmed = raw.trim();
    const next = trimmed === '' ? null : Number(trimmed);
    if (next !== null && (!Number.isFinite(next) || next <= 0)) return;
    setPendingItemIndex(itemIndex);
    setPendingAction('realized');
    try {
      await onSetRealizedWeight(itemIndex, next);
      setRealizedDraft((prev) => {
        const copy = { ...prev };
        delete copy[itemIndex];
        return copy;
      });
    } finally {
      setPendingItemIndex(null);
      setPendingAction(null);
    }
  }

  const refundedAmount = order.refundedAmount ?? 0;
  const netPaid = Math.max(0, Math.round((order.total - refundedAmount) * 100) / 100);

  // "Final at pickup" total — what the customer actually owes once
  // every variable-weight line has been weighed. Stripe charge stays
  // the original estimate; this is informational copy.
  const orderHasRealized = orderHasRealizedDifference(order.items);
  const realizedTotalAtPickup = realizedOrderTotal({
    lines: order.items,
    subtotal: order.subtotal,
    tax: order.tax,
    memberDiscount: order.memberDiscount,
    promoDiscount: order.promoDiscount,
    pointsRedemptionValueCents: order.pointsRedemptionValueCents,
    deliveryFee: order.fulfillmentType === 'delivery' ? DELIVERY_FEE : 0,
  });

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
          <AdminEyebrow size="drawer" className="mb-1">Order detail</AdminEyebrow>
          <div id="order-detail-title" className="font-mono text-[18px] font-medium tracking-[0.02em] text-ink">{order.orderRef}</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close order detail"
          className="w-9 h-9 rounded-full bg-cream border border-line text-ink grid place-items-center hover:border-ink transition-colors shrink-0"
        >
          <XIcon className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-7">

        {order.isDemo && (
          <div className="mb-6 -mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] leading-snug text-amber-900">
            <span className="mt-0.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" aria-hidden="true" />
            <span>This order belongs to the demo customer and will be cleared by the next nightly reset.</span>
          </div>
        )}

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
                    <CheckIcon className="w-2.75 h-2.75" strokeWidth={3} />
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
            <div className="flex items-center justify-between gap-2">
              <SortPopover<string>
                value={statusUpdate}
                options={statusOptions}
                onChange={(next) => {
                  setStatusUpdate(next);
                  if (next !== 'Cancelled') setCancellationReason('');
                }}
                prefix="Status:"
                panelLabel="Status"
                align="left"
              />
              <button
                onClick={handleUpdate}
                disabled={updating || (statusUpdate === order.status && cancellationReason === (order.cancellationReason ?? ''))}
                className="px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Saving…' : 'Update'}
              </button>
            </div>
            {statusUpdate === 'Cancelled' && (
              <SortPopover<string>
                value={cancellationReason}
                options={CANCELLATION_REASON_OPTIONS}
                onChange={setCancellationReason}
                prefix="Reason:"
                panelLabel="Reason"
                align="left"
                placeholderLabel="Select reason…"
              />
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
              href="/dashboard/customers"
              className="inline-flex items-center gap-1 bg-paper border border-line rounded-full px-3.5 py-1.5 text-[12px] text-ink-soft hover:border-ink hover:text-ink transition-colors"
            >
              View
              <ArrowIcon className="w-2.75 h-2.75" />
            </a>
          </div>
        </div>

        {/* Items */}
        <div className="pb-6 mb-6 border-b border-line-soft">
          <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-4">
            Items ({order.items.length})
          </div>
          <div className="flex flex-col">
            {order.items.map((item, i) => {
              const isRefunded = item.refunded;
              const isPending = pendingItemIndex === i;
              const variableWeight = isVariableWeightLine(item);
              const realized = hasRealizedWeight(item);
              const estimated = estimatedLineTotal(item);
              const effective = realizedLineTotal(item);
              // A refunded line is marked by the strikethrough and the
              // Refunded pill, not by dimming the row. The `opacity-60` that
              // used to sit on this div multiplied into every child on the
              // drawer's cream panel — the meta line fell to 2.30:1 and the
              // pill to 2.61:1.
              return (
                <div
                  key={i}
                  className={`grid grid-cols-[1fr_auto] gap-3.5 items-start py-3 ${
                    i < order.items.length - 1 ? 'border-b border-line-soft' : ''
                  } ${i === 0 ? 'pt-0' : ''}`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`font-display text-[15px] font-medium tracking-[-0.005em] leading-snug ${isRefunded ? 'line-through' : ''}`}>
                        {item.name}
                      </div>
                      {isRefunded && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-oxblood/10 text-oxblood text-[10px] font-medium tracking-[0.04em] uppercase">
                          Refunded
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-muted tracking-[0.04em] uppercase">
                      {item.qty}x · {formatMoney(item.price)}/ea · {item.productType}
                    </div>
                    {variableWeight && !isRefunded && (
                      <div className="mt-2 flex items-center gap-2">
                        {/* One of these per line, so the id carries the index
                            and the accessible name carries the cut — a dozen
                            boxes all called "Weighed" say nothing about which
                            is which. */}
                        <label
                          htmlFor={`realized-weight-${i}`}
                          className="text-[10px] font-medium tracking-[0.14em] uppercase text-muted"
                        >
                          Weighed
                        </label>
                        <input
                          id={`realized-weight-${i}`}
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          placeholder={item.estimatedWeightLb ? String(item.estimatedWeightLb) : '0.00'}
                          value={
                            realizedDraft[i] ??
                            (typeof item.realizedWeightLb === 'number' ? String(item.realizedWeightLb) : '')
                          }
                          onChange={(e) =>
                            setRealizedDraft((prev) => ({ ...prev, [i]: e.target.value }))
                          }
                          onBlur={(e) => {
                            if (!canEditRealizedWeight) return;
                            const draft = realizedDraft[i];
                            if (draft === undefined) return;
                            const current =
                              typeof item.realizedWeightLb === 'number'
                                ? String(item.realizedWeightLb)
                                : '';
                            if (draft.trim() === current.trim()) {
                              setRealizedDraft((prev) => {
                                const copy = { ...prev };
                                delete copy[i];
                                return copy;
                              });
                              return;
                            }
                            handleRealizedWeightSubmit(i, e.target.value);
                          }}
                          disabled={!canEditRealizedWeight || pendingItemIndex !== null}
                          // Starts with the visible label so speech-input users
                          // can say what they can see, then names the cut to
                          // tell a dozen identical boxes apart.
                          aria-label={`Weighed weight for ${item.name}`}
                          className="w-16 font-mono text-[12px] bg-paper border border-line rounded px-2 py-1 outline-none focus:border-ink disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="font-mono text-[11px] text-muted tracking-[0.04em] uppercase">lb</span>
                        {!canEditRealizedWeight && (
                          <span className="text-[10px] text-muted italic">
                            Mark ready for pickup to enter
                          </span>
                        )}
                        {isPending && pendingAction === 'realized' && (
                          <span className="text-[10px] text-muted italic">Saving…</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className={`font-display text-[15px] font-medium text-right ${isRefunded ? 'line-through' : ''}`}>
                      {formatMoney(effective)}
                    </div>
                    {realized && effective !== estimated && (
                      <div className="font-mono text-[10px] text-muted tracking-[0.04em]">
                        est. {formatMoney(estimated)}
                      </div>
                    )}
                    {!isRefunded && (
                      <button
                        type="button"
                        onClick={() => handleRefund(i)}
                        disabled={pendingItemIndex !== null}
                        className="text-[11px] text-muted hover:text-ink border border-line hover:border-ink/30 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPending && pendingAction === 'refund' ? 'Refunding…' : 'Refund'}
                      </button>
                    )}
                    {isRefunded && (
                      <button
                        type="button"
                        onClick={() => handleUnrefund(i)}
                        disabled={pendingItemIndex !== null}
                        className="text-[11px] text-muted hover:text-ink border border-line hover:border-ink/30 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPending && pendingAction === 'unrefund' ? 'Restoring…' : 'Undo refund'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="pb-6 mb-6 border-b border-line-soft">
          <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-4">Totals</div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline text-[13px] text-ink-soft">
              <span>Subtotal</span>
              <span className="font-mono text-[12px]">{formatMoney(order.subtotal)}</span>
            </div>
            <div className="flex justify-between items-baseline text-[13px] text-ink-soft">
              <span>Pickup</span>
              <span className="font-mono text-[12px]">Free</span>
            </div>
            {order.memberDiscount > 0 && (
              <div className="flex justify-between items-baseline text-[13px] text-green">
                <span>Member discount</span>
                <span className="font-mono text-[12px]">−{formatMoney(order.memberDiscount)}</span>
              </div>
            )}
            {order.promoDiscount > 0 && (
              <div className="flex justify-between items-baseline text-[13px] text-green">
                <span>Promo{order.promoCode ? ` — ${order.promoCode}` : ''}</span>
                <span className="font-mono text-[12px]">−{formatMoney(order.promoDiscount)}</span>
              </div>
            )}
            {order.pointsRedemptionValueCents > 0 && (
              <div className={`flex justify-between items-baseline text-[13px] ${order.status === 'Cancelled' ? 'text-muted' : 'text-green'}`}>
                <span>
                  Points redeemed ({order.pointsRedeemed.toLocaleString('en-US')} pts)
                  {order.status === 'Cancelled' && (
                    <em className="not-italic ml-2 text-[10px] tracking-[0.06em] uppercase text-camel-deep">returned</em>
                  )}
                  {/* Non-zero only when the balance had moved between the
                      quote at checkout and the deduction at completion, so
                      the shop honoured a discount it could not fully fund. */}
                  {order.pointsRedemptionShortfall > 0 && (
                    <em className="not-italic ml-2 text-[10px] tracking-[0.06em] uppercase text-oxblood">
                      {order.pointsRedemptionShortfall.toLocaleString('en-US')} pts unfunded
                    </em>
                  )}
                </span>
                <span className={`font-mono text-[12px] ${order.status === 'Cancelled' ? 'line-through' : ''}`}>
                  −{formatMoney(order.pointsRedemptionValueCents / 100)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-baseline text-[13px] text-ink-soft">
              <span>Tax</span>
              <span className="font-mono text-[12px]">{formatMoney(order.tax)}</span>
            </div>
            <div className="flex justify-between items-baseline mt-2 pt-3 border-t border-line">
              <span className="font-display text-[17px] font-medium text-ink">Total</span>
              <span className="font-display text-[22px] font-medium tracking-[-0.01em] text-ink">{formatMoney(order.total)}</span>
            </div>
            {orderHasRealized && (
              <div className="flex justify-between items-baseline text-[12px] text-camel-deep">
                <span>↻ Final at pickup (after weighing)</span>
                <span className="font-mono text-[11px]">{formatMoney(realizedTotalAtPickup)}</span>
              </div>
            )}
            {order.autoSettleAtPickup && order.settlementStatus && (
              <div className="mt-2 pt-2 border-t border-line-soft flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline text-[12px]">
                  <span className="text-ink-soft">Auto-settle</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] tracking-[0.04em] uppercase ${
                      order.settlementStatus === 'settled'
                        ? 'bg-green/10 text-green'
                        : order.settlementStatus === 'failed'
                        ? 'bg-oxblood/10 text-oxblood'
                        : 'bg-camel/15 text-camel-deeper'
                    }`}
                  >
                    {order.settlementStatus}
                  </span>
                </div>
                {(order.settlementPaymentIntents ?? []).map((tx) => (
                  <div key={tx.id} className="flex justify-between items-baseline text-[12px] text-camel-deep">
                    <span>
                      {tx.kind === 'capture' ? '+' : '−'}
                      {formatMoney(tx.amount)}{' '}
                      {tx.kind === 'capture' ? 'charged' : 'refunded'} at pickup
                    </span>
                    <span className="font-mono text-[10px] text-muted">
                      {tx.id.slice(0, 14)}…
                    </span>
                  </div>
                ))}
                {order.settlementStatus === 'failed' && (
                  <>
                    {order.settlementError && (
                      <p className="text-[11px] text-oxblood italic">
                        {order.settlementError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (retryingSettlement) return;
                        setRetryingSettlement(true);
                        try {
                          await onRetrySettlement();
                        } finally {
                          setRetryingSettlement(false);
                        }
                      }}
                      disabled={retryingSettlement}
                      className="self-start text-[11px] text-muted hover:text-ink border border-line hover:border-ink/30 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {retryingSettlement ? 'Retrying…' : 'Retry settlement'}
                    </button>
                  </>
                )}
              </div>
            )}
            {order.pointsAwarded > 0 && (
              <div className="flex justify-between items-baseline text-[12px] text-muted mt-1">
                <span>
                  Points awarded on fulfilment
                  {order.status === 'Cancelled' && (
                    <em className="not-italic ml-2 text-[10px] tracking-[0.06em] uppercase text-camel-deep">reversed</em>
                  )}
                </span>
                <span className={`font-mono text-[11px] ${order.status === 'Cancelled' ? 'line-through' : ''}`}>
                  +{order.pointsAwarded.toLocaleString('en-US')} pts
                </span>
              </div>
            )}
            {order.pointsRedemptionReturned > 0 && order.status !== 'Cancelled' && (
              <div className="flex justify-between items-baseline text-[12px] text-camel-deep">
                <span>↻ Returned from refunds</span>
                <span className="font-mono text-[11px]">+{order.pointsRedemptionReturned.toLocaleString('en-US')} pts to balance</span>
              </div>
            )}
            {refundedAmount > 0 && (
              <>
                <div className="flex justify-between items-baseline text-[13px] text-oxblood mt-1">
                  <span>Refunded</span>
                  <span className="font-mono text-[12px]">−{formatMoney(refundedAmount)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-line-soft">
                  <span className="font-display text-[14px] font-medium text-ink">Net paid</span>
                  <span className="font-display text-[16px] font-medium tracking-[-0.01em] text-ink">{formatMoney(netPaid)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Fulfillment */}
        <div>
          <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-4">Fulfillment</div>
          <div className="flex flex-col gap-2">
            {[
              { l: 'Method', v: order.fulfillmentType === 'delivery' ? 'DELIVERY' : 'PICKUP' },
              { l: 'Location', v: formatPickupLocation(order.pickupLocation || 'San Diego, CA') },
              { l: 'Paid with', v: order.paymentMethod || '—' },
              { l: 'Payment', v: (order.paymentStatus ?? (order.isPaid ? 'Completed' : 'Pending')).toUpperCase() },
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
        <a
          href={`mailto:${order.customerEmail}?subject=Your%20EliteCuts%20order%20${encodeURIComponent(order.orderRef)}`}
          className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
          </svg>
          Email customer
        </a>
      </div>
    </>
  );
}
