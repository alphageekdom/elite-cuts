'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export type DeliveryRow = {
  _id: string;
  deliveryDate: string;
  supplier: string;
  supplierSuffix: string;
  detail: string;
  status: 'confirmed' | 'pending' | 'scheduled' | 'received';
  productId: string | null;
  currentStock: number | null;
  parLevel: number | null;
};

const DELIVERY_PILL_STYLE: Record<DeliveryRow['status'], string> = {
  confirmed: 'bg-green-soft text-green',
  pending:   'bg-amber-soft text-amber',
  scheduled: 'bg-[rgba(28,24,20,0.06)] text-muted',
  received:  'bg-[rgba(28,24,20,0.06)] text-muted',
};

const DELIVERY_PILL_LABEL: Record<DeliveryRow['status'], string> = {
  confirmed: 'Confirmed',
  pending:   'Pending',
  scheduled: 'Scheduled',
  received:  'Received',
};

const LEGEND = [
  { status: 'scheduled', label: 'Scheduled', desc: 'Booked with supplier, not yet confirmed' },
  { status: 'pending',   label: 'Pending',   desc: 'Supplier acknowledged, awaiting dispatch' },
  { status: 'confirmed', label: 'Confirmed', desc: 'Date locked in — delivery is coming' },
  { status: 'received',  label: 'Received',  desc: 'Arrived — stock has been updated' },
] as const;

const LEGEND_DOT: Record<typeof LEGEND[number]['status'], string> = {
  scheduled: 'bg-muted',
  pending:   'bg-amber',
  confirmed: 'bg-green',
  received:  'bg-muted',
};

type StockLevel = 'out' | 'critical' | 'low' | 'healthy' | 'over';

function getStockLevel(count: number, par: number): StockLevel {
  if (count === 0) return 'out';
  const ratio = count / par;
  if (ratio > 1)   return 'over';
  if (ratio >= 0.7) return 'healthy';
  if (ratio >= 0.3) return 'low';
  return 'critical';
}

const STOCK_CHIP: Record<StockLevel, { label: string; cls: string }> = {
  out:      { label: 'Out of stock',  cls: 'bg-[rgba(28,24,20,0.06)] text-muted' },
  critical: { label: 'Still critical', cls: 'bg-red-soft text-oxblood' },
  low:      { label: 'Low stock',      cls: 'bg-amber-soft text-amber' },
  healthy:  { label: 'In stock ✓',     cls: 'bg-green-soft text-green' },
  over:     { label: 'Overstocked',    cls: 'bg-green-soft text-green' },
};

export type ReceivedDeliveryRow = {
  _id: string;
  receivedAt: string;
  supplier: string;
  productName: string | null;
  receivedQty: number | null;
};

type Props = {
  deliveries: DeliveryRow[];
  receivedDeliveries: ReceivedDeliveryRow[];
};

export default function InventoryUpcomingDeliveries({ deliveries, receivedDeliveries }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'received'>('upcoming');
  const [expanding, setExpanding] = useState<string | null>(null);
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  function openExpand(d: DeliveryRow) {
    setExpanding(d._id);
    setPendingConfirm(null);
    setStockInputs((prev) => ({ ...prev, [d._id]: '' }));
  }

  function cancelExpand(id: string) {
    setExpanding(null);
    setPendingConfirm(null);
    setStockInputs((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  function handleReview(d: DeliveryRow) {
    if (!d.productId) {
      setPendingConfirm(d._id);
      return;
    }
    const received = parseInt(stockInputs[d._id] ?? '', 10);
    if (isNaN(received) || received < 1) {
      toast.error('Enter the number of units received (must be at least 1)');
      return;
    }
    setPendingConfirm(d._id);
  }

  async function handleConfirm(d: DeliveryRow) {
    setSaving(d._id);
    try {
      // Step 1 — mark delivery received (include receivedQty for history tracking)
      const receivedQty = d.productId ? parseInt(stockInputs[d._id] ?? '', 10) : NaN;
      const deliveryRes = await fetch(`/api/deliveries/${d._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'received',
          ...(!isNaN(receivedQty) ? { receivedQty } : {}),
        }),
      });
      if (!deliveryRes.ok) {
        const { message } = await deliveryRes.json().catch(() => ({}));
        toast.error(message ?? 'Failed to mark delivery received');
        return;
      }

      // Step 2 — add received units to current stock if a product is linked
      if (d.productId) {
        const received = parseInt(stockInputs[d._id] ?? '', 10);
        const newTotal = (d.currentStock ?? 0) + received;
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
      setExpanding(null);
      setPendingConfirm(null);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="bg-paper border border-line-soft rounded p-7">
      {/* Header + tab toggle */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="font-display text-[22px] font-medium tracking-tight leading-snug">
            Upcoming <em className="italic text-oxblood font-normal">deliveries</em>
          </div>
          <div className="text-[12px] text-muted mt-1">Next 14 days from active suppliers</div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 bg-[rgba(28,24,20,0.05)] rounded p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono tracking-[0.04em] transition-colors ${
              activeTab === 'upcoming' ? 'bg-paper text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Upcoming {deliveries.length > 0 ? `(${deliveries.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono tracking-[0.04em] transition-colors ${
              activeTab === 'received' ? 'bg-paper text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            Received {receivedDeliveries.length > 0 ? `(${receivedDeliveries.length})` : ''}
          </button>
        </div>
      </div>

      {activeTab === 'upcoming' && <>
      {/* Status legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-6 p-3.5 rounded bg-[rgba(28,24,20,0.03)] border border-line-soft">
        {LEGEND.map(({ status, label, desc }) => (
          <div key={status} className="flex items-start gap-2">
            <span className={`mt-0.75 w-1.5 h-1.5 rounded-full shrink-0 ${LEGEND_DOT[status]}`} />
            <div className="min-w-0">
              <span className="font-mono text-[10px] tracking-widest uppercase text-ink font-medium">{label}</span>
              <span className="text-[10px] text-muted ml-1.5 leading-snug">{desc}</span>
            </div>
          </div>
        ))}
      </div>

      {deliveries.length === 0 ? (
        <p className="text-muted text-[13px] py-8 text-center">No upcoming deliveries scheduled.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line-soft">
          {deliveries.map((d, idx) => {
            const parts = new Intl.DateTimeFormat('en-US', {
              day: '2-digit', month: 'short', weekday: 'short',
              timeZone: 'America/Los_Angeles',
            }).formatToParts(new Date(d.deliveryDate));
            const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
            const day = get('day'), month = get('month'), dow = get('weekday');
            const isExpanded = expanding === d._id;
            const isSaving = saving === d._id;

            return (
              <div key={d._id} className={`flex flex-col gap-2.5 py-4 ${idx === 0 ? 'pt-0' : ''}`}>
                {/* Status pill + Mark received button */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current ${DELIVERY_PILL_STYLE[d.status]}`}>
                    {DELIVERY_PILL_LABEL[d.status]}
                  </span>
                  {!isExpanded && (
                    <button
                      type="button"
                      onClick={() => openExpand(d)}
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
                    <div className="text-[11px] text-muted mt-0.5">{dow}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-[15px] font-medium tracking-tight mb-0.5 leading-snug">
                      {d.supplier}{d.supplierSuffix ? <em className="italic text-oxblood font-normal"> {d.supplierSuffix}</em> : null}
                    </div>
                    <div className="font-mono text-[11px] text-muted tracking-[0.04em] leading-relaxed">{d.detail}</div>
                  </div>
                </div>

                {/* Inline expand — two-step receive flow */}
                {isExpanded && (() => {
                  const isPending = pendingConfirm === d._id;
                  const received = parseInt(stockInputs[d._id] ?? '', 10);
                  const newTotal = d.productId && d.currentStock !== null && !isNaN(received) && received >= 1
                    ? d.currentStock + received
                    : null;
                  const level = newTotal !== null && d.parLevel ? getStockLevel(newTotal, d.parLevel) : null;
                  const chip = level ? STOCK_CHIP[level] : null;

                  return (
                    <div className="ml-18 mt-1 flex flex-col gap-3 p-3.5 rounded bg-[rgba(28,24,20,0.03)] border border-line-soft">
                      {!isPending ? (
                        /* ── Step 1: input ── */
                        <>
                          {d.productId ? (
                            <>
                              <div className="text-[12px] text-muted leading-snug">
                                How many units arrived?{d.currentStock !== null
                                  ? <span className="font-mono text-ink"> {d.currentStock} on hand.</span>
                                  : null}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <label className="font-mono text-[10px] tracking-widest uppercase text-muted shrink-0">
                                  Units received
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={stockInputs[d._id] ?? ''}
                                  onChange={(e) =>
                                    setStockInputs((prev) => ({ ...prev, [d._id]: e.target.value }))
                                  }
                                  className="w-20 px-2 py-1 text-[13px] font-mono bg-paper border border-line-soft rounded focus:outline-none focus:border-ink text-ink"
                                  autoFocus
                                />
                                {d.parLevel !== null && d.currentStock !== null && d.currentStock < d.parLevel && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStockInputs((prev) => ({
                                        ...prev,
                                        [d._id]: String(d.parLevel! - d.currentStock!),
                                      }))
                                    }
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
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-[0.04em] ${chip.cls}`}>
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
                              onClick={() => handleReview(d)}
                              className="px-3 py-1.5 text-[11px] font-medium font-mono tracking-[0.04em] bg-ink text-cream rounded hover:bg-ink/90 transition-colors"
                            >
                              Review →
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelExpand(d._id)}
                              className="px-3 py-1.5 text-[11px] font-mono tracking-[0.04em] text-muted hover:text-ink transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        /* ── Step 2: confirm summary ── */
                        <>
                          <div className="text-[12px] text-ink font-medium leading-snug">
                            Confirm this receipt?
                          </div>
                          {d.productId && newTotal !== null ? (
                            <div className="flex flex-col gap-1.5 text-[12px] text-muted font-mono">
                              <div>+ <span className="text-ink">{received}</span> units received</div>
                              <div className="flex items-center gap-2">
                                <span>New stock: <span className="text-ink font-medium">{newTotal}</span></span>
                                {chip && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-[0.04em] ${chip.cls}`}>
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
                              disabled={isSaving}
                              onClick={() => handleConfirm(d)}
                              className="px-3 py-1.5 text-[11px] font-medium font-mono tracking-[0.04em] bg-ink text-cream rounded hover:bg-ink/90 transition-colors disabled:opacity-50"
                            >
                              {isSaving ? 'Saving…' : 'Confirm received'}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => setPendingConfirm(null)}
                              className="px-3 py-1.5 text-[11px] font-mono tracking-[0.04em] text-muted hover:text-ink transition-colors disabled:opacity-50"
                            >
                              ← Edit
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
      </>}

      {/* Received history tab */}
      {activeTab === 'received' && (
        receivedDeliveries.length === 0 ? (
          <p className="text-muted text-[13px] py-8 text-center">No received deliveries recorded yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-line-soft">
            {receivedDeliveries.map((d, idx) => {
              const parts = new Intl.DateTimeFormat('en-US', {
                day: '2-digit', month: 'short', weekday: 'short',
                timeZone: 'America/Los_Angeles',
              }).formatToParts(new Date(d.receivedAt));
              const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
              return (
                <div key={d._id} className={`grid grid-cols-[56px_1fr] items-start gap-4 py-4 ${idx === 0 ? 'pt-0' : ''}`}>
                  <div className="text-center">
                    <div className="font-display text-[22px] font-normal leading-none tracking-tight text-ink">{get('day')}</div>
                    <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted mt-0.5">{get('month')}</div>
                    <div className="text-[11px] text-muted mt-0.5">{get('weekday')}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-[15px] font-medium tracking-tight leading-snug mb-0.5">
                      {d.supplier}
                    </div>
                    {d.productName && (
                      <div className="font-mono text-[11px] text-muted tracking-[0.04em]">{d.productName}</div>
                    )}
                    <div className="font-mono text-[11px] text-green mt-1">
                      {d.receivedQty !== null ? `+${d.receivedQty} units received` : 'Received'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
