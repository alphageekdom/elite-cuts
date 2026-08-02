'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDeliveryDateParts, getStockState, type StockState } from '@/lib/inventory';
import { deliveryPatchSchema } from '@/lib/deliveries/schema';
import type { DeliveryRow } from './InventoryUpcomingDeliveries';

const DELIVERY_PILL_STYLE: Record<DeliveryRow['status'], string> = {
  confirmed: 'bg-green-soft text-green-deep',
  pending: 'bg-amber-soft text-amber-deep',
  scheduled: 'bg-ink/6 text-muted-deep',
  received: 'bg-ink/6 text-muted-deep',
};

const DELIVERY_PILL_LABEL: Record<DeliveryRow['status'], string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  scheduled: 'Scheduled',
  received: 'Received',
};

const STOCK_CHIP: Record<StockState, { label: string; cls: string }> = {
  out: { label: 'Out of stock', cls: 'bg-ink/6 text-muted-deep' },
  critical: { label: 'Still critical', cls: 'bg-red-soft text-oxblood' },
  low: { label: 'Low stock', cls: 'bg-amber-soft text-amber-deep' },
  healthy: { label: 'In stock ✓', cls: 'bg-green-soft text-green-deep' },
  over: { label: 'Overstocked', cls: 'bg-green-soft text-green-deep' },
};

type Props = {
  delivery: DeliveryRow;
  isFirst: boolean;
};

// One row in the upcoming-deliveries list, with the two-step inline receive
// flow. State lives per-card so the parent doesn't need to key dictionaries
// by `_id`.
export default function DeliveryReceiveCard({ delivery: d, isFirst }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [stockInput, setStockInput] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { day, month, weekday } = formatDeliveryDateParts(d.deliveryDate);

  function openExpand() {
    setExpanded(true);
    setPendingConfirm(false);
    setStockInput('');
  }

  function cancelExpand() {
    setExpanded(false);
    setPendingConfirm(false);
    setStockInput('');
  }

  function handleReview() {
    if (!d.productId) {
      setPendingConfirm(true);
      return;
    }
    const received = parseInt(stockInput, 10);
    if (isNaN(received) || received < 1) {
      toast.error('Enter the number of units received (must be at least 1)');
      return;
    }
    setPendingConfirm(true);
  }

  async function handleConfirm() {
    const receivedQty = d.productId ? parseInt(stockInput, 10) : NaN;
    const patchPayload = {
      status: 'received' as const,
      ...(!isNaN(receivedQty) ? { receivedQty } : {}),
    };

    // Pre-submit `safeParse` mirrors the server-side parse in
    // `/api/deliveries/[id]` PATCH so the admin sees a field-level error
    // (qty cap, status enum) before the round trip.
    const parsed = deliveryPatchSchema.safeParse(patchPayload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid delivery input');
      return;
    }

    setSaving(true);
    try {
      // Step 1 — mark delivery received (include receivedQty for history tracking)
      const deliveryRes = await fetch(`/api/deliveries/${d._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      });
      if (!deliveryRes.ok) {
        const { message } = await deliveryRes.json().catch(() => ({}));
        toast.error(message ?? 'Failed to mark delivery received');
        return;
      }

      // Step 2 — add received units to current stock if a product is linked
      if (d.productId) {
        const newTotal = (d.currentStock ?? 0) + receivedQty;
        const stockRes = await fetch(`/api/products/${d.productId}/stock`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stockCount: newTotal }),
        });
        if (!stockRes.ok) {
          toast.warning('Delivery marked received — stock update failed. Adjust stock manually.');
          router.refresh();
          return;
        }
      }

      toast.success('Delivery received and stock updated');
      setExpanded(false);
      setPendingConfirm(false);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const received = d.productId ? parseInt(stockInput, 10) : NaN;
  const newTotal =
    d.productId && d.currentStock !== null && !isNaN(received) && received >= 1
      ? d.currentStock + received
      : null;
  const level = newTotal !== null && d.parLevel ? getStockState(newTotal, d.parLevel) : null;
  const chip = level ? STOCK_CHIP[level] : null;

  return (
    <div className={`flex flex-col gap-2.5 py-4 ${isFirst ? 'pt-0' : ''}`}>
      {/* Status pill + Mark received button */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current ${DELIVERY_PILL_STYLE[d.status]}`}
        >
          {DELIVERY_PILL_LABEL[d.status]}
        </span>
        {!expanded && (
          <button
            type="button"
            onClick={openExpand}
            className="text-[11px] text-muted hover:text-ink font-mono tracking-[0.04em] transition-colors shrink-0"
          >
            Mark received
          </button>
        )}
      </div>

      {/* Date + supplier */}
      <div className="grid grid-cols-[56px_1fr] items-start gap-4">
        <div className="text-center">
          <div className="font-display text-[22px] font-normal leading-none tracking-tight text-ink">{day}</div>
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted mt-0.5">{month}</div>
          <div className="text-[11px] text-muted mt-0.5">{weekday}</div>
        </div>
        <div className="min-w-0">
          <div className="font-display text-[15px] font-medium tracking-tight mb-0.5 leading-snug">
            {d.supplier}
            {d.supplierSuffix ? <em className="italic text-oxblood font-normal"> {d.supplierSuffix}</em> : null}
          </div>
          <div className="font-mono text-[11px] text-muted tracking-[0.04em] leading-relaxed">{d.detail}</div>
        </div>
      </div>

      {/* Inline expand — two-step receive flow */}
      {expanded && (
        <div className="ml-18 mt-1 flex flex-col gap-3 p-3.5 rounded bg-ink/3 border border-line-soft">
          {!pendingConfirm ? (
            /* ── Step 1: input ── */
            <>
              {d.productId ? (
                <>
                  <div className="text-[12px] text-muted leading-snug">
                    How many units arrived?
                    {d.currentStock !== null ? (
                      <span className="font-mono text-ink"> {d.currentStock} on hand.</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label
                      htmlFor={`units-${d._id}`}
                      className="font-mono text-[10px] tracking-widest uppercase text-muted shrink-0"
                    >
                      Units received
                    </label>
                    <input
                      id={`units-${d._id}`}
                      type="number"
                      min="1"
                      value={stockInput}
                      onChange={(e) => setStockInput(e.target.value)}
                      className="w-20 px-2 py-1 text-[13px] font-mono bg-paper border border-line-soft rounded focus:outline-none focus:border-ink text-ink"
                      autoFocus
                    />
                    {d.parLevel !== null && d.currentStock !== null && d.currentStock < d.parLevel && (
                      <button
                        type="button"
                        onClick={() => setStockInput(String(d.parLevel! - d.currentStock!))}
                        className="text-[10px] font-mono tracking-widest uppercase text-muted hover:text-ink border border-line-soft rounded px-2 py-1 transition-colors"
                      >
                        Fill to par
                      </button>
                    )}
                  </div>
                  {newTotal !== null && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted">
                        New total: <span className="text-ink font-medium">{newTotal}</span>
                      </span>
                      {chip && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-[0.04em] ${chip.cls}`}
                        >
                          {chip.label}
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[12px] text-muted leading-snug">
                  No product linked — delivery will be marked received only.
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReview}
                  className="px-3 py-1.5 text-[11px] font-medium font-mono tracking-[0.04em] bg-ink text-cream rounded hover:bg-ink/90 transition-colors"
                >
                  Review →
                </button>
                <button
                  type="button"
                  onClick={cancelExpand}
                  className="px-3 py-1.5 text-[11px] font-mono tracking-[0.04em] text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            /* ── Step 2: confirm summary ── */
            <>
              <div className="text-[12px] text-ink font-medium leading-snug">Confirm this receipt?</div>
              {d.productId && newTotal !== null ? (
                <div className="flex flex-col gap-1.5 text-[12px] text-muted font-mono">
                  <div>
                    + <span className="text-ink">{received}</span> units received
                  </div>
                  <div className="flex items-center gap-2">
                    <span>
                      New stock: <span className="text-ink font-medium">{newTotal}</span>
                    </span>
                    {chip && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-[0.04em] ${chip.cls}`}
                      >
                        {chip.label}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-muted">
                  Delivery will be marked received. No stock update.
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleConfirm}
                  className="px-3 py-1.5 text-[11px] font-medium font-mono tracking-[0.04em] bg-ink text-cream rounded hover:bg-ink/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Confirm received'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setPendingConfirm(false)}
                  className="px-3 py-1.5 text-[11px] font-mono tracking-[0.04em] text-muted hover:text-ink transition-colors disabled:opacity-50"
                >
                  ← Edit
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
